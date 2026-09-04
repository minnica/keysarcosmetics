import { Prisma } from "@prisma/client";
import { hashOpaqueToken } from "./pos-security";
import {
  businessDateValue,
  createInventoryLedgerMovement,
  money,
} from "./pos-inventory";

type Transaction = Prisma.TransactionClient;

export class PosOperationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export const POS_TIMEZONE = "America/Mexico_City";

export function currentBusinessDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: POS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function consumeOperationAuthorization(
  tx: Transaction,
  input: {
    token: string;
    purpose: string;
    terminalId: string;
    entityType?: string;
    entityId?: string;
  },
) {
  const authorization = await tx.masterAuthorization.findUnique({
    where: { tokenHash: hashOpaqueToken(input.token) },
  });
  const valid = Boolean(
    authorization &&
      authorization.purpose === input.purpose &&
      authorization.terminalId === input.terminalId &&
      authorization.usedAt === null &&
      authorization.expiresAt > new Date() &&
      (input.entityType === undefined ||
        (authorization.entityType === input.entityType &&
          authorization.entityId === input.entityId)),
  );
  if (!authorization || !valid) {
    throw new PosOperationError("Autorización master vencida, usada o inválida", 403);
  }
  const consumed = await tx.masterAuthorization.updateMany({
    where: { id: authorization.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new PosOperationError("La autorización master ya fue consumida", 409);
  }
  return authorization;
}

const countInclude = { lines: true } as const;

export function inventoryCountDto(
  count: Prisma.InventoryCountGetPayload<{ include: typeof countInclude }>,
  includeAudit: boolean,
  includeCosts: boolean,
) {
  return {
    id: count.id,
    kind: count.kind,
    businessDate: count.businessDate.toISOString().slice(0, 10),
    locationId: count.locationId,
    createdAt: count.creadoEn.toISOString(),
    ...(includeAudit ? { notes: count.notes } : {}),
    lines: count.lines.map((line) => ({
      itemId: line.itemId,
      countedQuantity: money(line.countedQuantity)!,
      matchesExpected: line.matchesExpected,
      ...(includeAudit
        ? {
            expectedQuantity: money(line.expectedQuantity)!,
            differenceQuantity: money(line.differenceQuantity)!,
            unitCost: includeCosts ? money(line.unitCostSnapshot) : null,
          }
        : {}),
    })),
  };
}

export async function createBusinessDayCount(
  tx: Transaction,
  input: {
    kind: "OPENING" | "CLOSING";
    businessDate: string;
    branchId: string;
    locationId: string;
    notes?: string;
    lines: Array<{ itemId: string; countedQuantity: string }>;
    credentialId: string;
    terminalId: string;
  },
) {
  const location = await tx.inventoryLocation.findFirst({
    where: { id: input.locationId, branchId: input.branchId, active: true },
  });
  if (!location) throw new PosOperationError("La ubicación no pertenece a la sucursal", 403);
  const itemIds = input.lines.map((line) => line.itemId);
  if (new Set(itemIds).size !== itemIds.length) {
    throw new PosOperationError("El conteo contiene productos duplicados");
  }
  const items = await tx.catalogItem.findMany({
    where: { id: { in: itemIds }, kind: "PRODUCT", active: true, deletedAt: null },
    select: { id: true, unitCost: true },
  });
  if (items.length !== itemIds.length) {
    throw new PosOperationError("El conteo contiene productos inválidos");
  }
  const itemCosts = new Map(items.map((item) => [item.id, item.unitCost]));
  const balances = await tx.inventoryBalance.findMany({
    where: { locationId: input.locationId, itemId: { in: itemIds } },
  });
  const expected = new Map(balances.map((balance) => [balance.itemId, balance.availableQuantity]));
  const count = await tx.inventoryCount.create({
    data: {
      kind: input.kind,
      businessDate: businessDateValue(input.businessDate),
      locationId: input.locationId,
      notes: input.notes ?? null,
      createdByCredentialId: input.credentialId,
      terminalId: input.terminalId,
      lines: {
        create: input.lines.map((line) => {
          const expectedQuantity = expected.get(line.itemId) ?? new Prisma.Decimal(0);
          const countedQuantity = new Prisma.Decimal(line.countedQuantity);
          const differenceQuantity = countedQuantity.minus(expectedQuantity);
          return {
            itemId: line.itemId,
            countedQuantity,
            expectedQuantity,
            differenceQuantity,
            unitCostSnapshot: itemCosts.get(line.itemId) ?? null,
            matchesExpected: differenceQuantity.isZero(),
          };
        }),
      },
    },
    include: countInclude,
  });
  const differences = count.lines.filter((line) => !line.matchesExpected);
  if (differences.length) {
    await createInventoryLedgerMovement(tx, {
      type: "COUNT_ADJUSTMENT",
      reason: `${input.kind}_COUNT`,
      notes: input.notes ?? null,
      businessDate: input.businessDate,
      actorCredentialId: input.credentialId,
      terminalId: input.terminalId,
      countId: count.id,
      lines: differences.map((line) => ({
        itemId: line.itemId,
        fromLocationId: line.differenceQuantity.isNegative() ? input.locationId : null,
        toLocationId: line.differenceQuantity.isPositive() ? input.locationId : null,
        quantity: line.differenceQuantity.abs(),
        unitCostSnapshot: line.unitCostSnapshot,
      })),
    });
  }
  return count;
}

export const businessDayInclude = {
  branch: { select: { nombre: true } },
  openedByCredential: {
    include: {
      employee: { select: { nombreCompleto: true } },
      user: { select: { nombre: true } },
    },
  },
  closedByCredential: {
    include: {
      employee: { select: { nombreCompleto: true } },
      user: { select: { nombre: true } },
    },
  },
} as const;

const credentialName = (credential: {
  alias: string;
  employee: { nombreCompleto: string } | null;
  user: { nombre: string } | null;
} | null) => credential?.employee?.nombreCompleto ?? credential?.user?.nombre ?? credential?.alias ?? null;

export function businessDayDto(
  day: Prisma.PosBusinessDayGetPayload<{ include: typeof businessDayInclude }>,
) {
  return {
    id: day.id,
    branchId: day.branchId,
    branchName: day.branch.nombre,
    businessDate: day.businessDate.toISOString().slice(0, 10),
    status: day.status,
    openingCountId: day.openingCountId,
    openingSkipped: day.openingSkipped,
    openedByName: credentialName(day.openedByCredential)!,
    openedAt: day.openedAt.toISOString(),
    closingCountId: day.closingCountId,
    closingSkipped: day.closingSkipped,
    closedByName: credentialName(day.closedByCredential),
    closedAt: day.closedAt?.toISOString() ?? null,
  };
}

export const attendanceInclude = {
  employee: { select: { nombreCompleto: true } },
  branch: { select: { nombre: true } },
} as const;

export function attendanceDto(
  attendance: Prisma.PosAttendanceGetPayload<{ include: typeof attendanceInclude }>,
) {
  return {
    id: attendance.id,
    businessDayId: attendance.businessDayId,
    employeeId: attendance.employeeId,
    employeeName: attendance.employee.nombreCompleto,
    branchId: attendance.branchId,
    branchName: attendance.branch.nombre,
    businessDate: attendance.businessDate.toISOString().slice(0, 10),
    clockInAt: attendance.clockInAt.toISOString(),
    clockOutAt: attendance.clockOutAt?.toISOString() ?? null,
    status: attendance.status,
    closeReason: attendance.closeReason,
  };
}

export async function registerAttendanceIfMissing(
  tx: Transaction,
  input: {
    businessDayId: string;
    businessDate: string;
    branchId: string;
    employeeId: string | null;
    credentialId: string;
    terminalId: string;
  },
) {
  if (!input.employeeId) return null;
  const existing = await tx.posAttendance.findFirst({
    where: { employeeId: input.employeeId, status: "OPEN" },
    include: attendanceInclude,
  });
  if (existing) {
    if (existing.businessDayId === input.businessDayId) return existing;
    throw new PosOperationError("El empleado ya tiene una asistencia abierta en otra jornada", 409);
  }
  return tx.posAttendance.create({
    data: {
      businessDayId: input.businessDayId,
      businessDate: businessDateValue(input.businessDate),
      branchId: input.branchId,
      employeeId: input.employeeId,
      credentialId: input.credentialId,
      terminalId: input.terminalId,
    },
    include: attendanceInclude,
  });
}

export const cashExpenseInclude = {
  branch: { select: { nombre: true } },
} as const;

export function cashExpenseDto(
  expense: Prisma.PosCashExpenseGetPayload<{ include: typeof cashExpenseInclude }>,
) {
  return {
    id: expense.id,
    folio: expense.folio,
    businessDate: expense.businessDate.toISOString().slice(0, 10),
    branchId: expense.branchId,
    branchName: expense.branch.nombre,
    employeeId: expense.employeeId,
    employeeName: expense.employeeNameSnapshot,
    expenseTypeId: expense.expenseTypeId,
    expenseTypeName: expense.expenseTypeSnapshot,
    amount: money(expense.amount)!,
    concept: expense.concept,
    comment: expense.comment,
    status: expense.status,
    correctsExpenseId: expense.correctsExpenseId,
    createdAt: expense.creadoEn.toISOString(),
    voidedAt: expense.voidedAt?.toISOString() ?? null,
  };
}

export async function nextCashExpenseFolio(tx: Transaction): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ value: string }>>(
    Prisma.sql`SELECT nextval('"PosCashExpenseFolioSeq"')::text AS value`,
  );
  return `GTO-${String(rows[0]!.value).padStart(6, "0")}`;
}

export function expenseSnapshot(input: {
  folio: string;
  businessDate: Date;
  branchId: string;
  employeeId: string | null;
  employeeNameSnapshot: string;
  expenseTypeId: string;
  expenseTypeSnapshot: string;
  amount: Prisma.Decimal;
  concept: string;
  comment: string | null;
}): Prisma.InputJsonValue {
  return {
    folio: input.folio,
    businessDate: input.businessDate.toISOString().slice(0, 10),
    branchId: input.branchId,
    employeeId: input.employeeId,
    employeeName: input.employeeNameSnapshot,
    expenseTypeId: input.expenseTypeId,
    expenseTypeName: input.expenseTypeSnapshot,
    amount: input.amount.toFixed(2),
    concept: input.concept,
    comment: input.comment,
  };
}
