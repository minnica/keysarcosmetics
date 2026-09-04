import { createHash } from "node:crypto";
import { Prisma, type PosMembershipStatus } from "@prisma/client";
import type {
  PosClientMembershipDto,
  PosMembershipSalesClosureDto,
} from "@cosmetics/types";
import { hashOpaqueToken } from "./pos-security";
import { money } from "./pos-inventory";
import { resolveRequestedBranchIds } from "./pos-scope";

type Transaction = Prisma.TransactionClient;

export const POS_MEMBERSHIP_AUTHORIZATION_PURPOSE = "MEMBERSHIPS_ACCESS";

export class PosMembershipError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export interface PosMembershipContext {
  credentialId: string;
  terminalId: string;
  sessionId: string;
  employeeId: string | null;
  isMaster: boolean;
  authorizedBranchIds: string[];
}

export async function requireMembershipAuthorization(
  tx: Transaction,
  token: string,
  context: PosMembershipContext,
) {
  const authorization = await tx.posPersonalAuthorization.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: {
      id: true,
      purpose: true,
      credentialId: true,
      terminalId: true,
      sessionId: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });
  if (
    !authorization ||
    authorization.purpose !== POS_MEMBERSHIP_AUTHORIZATION_PURPOSE ||
    authorization.credentialId !== context.credentialId ||
    authorization.terminalId !== context.terminalId ||
    authorization.sessionId !== context.sessionId ||
    authorization.usedAt !== null ||
    authorization.revokedAt !== null ||
    authorization.expiresAt <= new Date()
  ) {
    throw new PosMembershipError(
      "Autorización personal de membresías vencida o inválida",
      403,
    );
  }
  return authorization;
}

export const membershipInclude = {
  ticket: { select: { folio: true } },
  purchaseBranch: { select: { nombre: true } },
  attendance: {
    include: {
      branch: { select: { nombre: true } },
      recordedByCredential: {
        include: {
          employee: { select: { nombreCompleto: true } },
          user: { select: { nombre: true } },
        },
      },
    },
    orderBy: { sessionNumber: "asc" as const },
  },
  sellerChanges: { orderBy: { cambiadoEn: "asc" as const } },
  statusChanges: { orderBy: { cambiadoEn: "asc" as const } },
} satisfies Prisma.PosClientMembershipInclude;

type MembershipPayload = Prisma.PosClientMembershipGetPayload<{
  include: typeof membershipInclude;
}>;

const credentialName = (credential: {
  alias: string;
  employee: { nombreCompleto: string } | null;
  user: { nombre: string } | null;
}) =>
  credential.employee?.nombreCompleto ??
  credential.user?.nombre ??
  credential.alias;

export function membershipDto(
  membership: MembershipPayload,
): PosClientMembershipDto {
  return {
    id: membership.id,
    folio: membership.folio,
    ticketId: membership.ticketId,
    ticketFolio: membership.ticket.folio,
    ticketLineId: membership.ticketLineId,
    unitOrdinal: membership.unitOrdinal,
    customerId: membership.customerId,
    customerName: membership.customerNameSnapshot,
    customerPhone: membership.customerPhoneSnapshot,
    membershipItemId: membership.membershipItemId,
    membershipName: membership.membershipNameSnapshot,
    membershipSku: membership.membershipSkuSnapshot,
    termsId: membership.termsId,
    termsVersion: membership.termsVersionSnapshot,
    totalSessions: membership.totalSessions,
    usedSessions: membership.usedSessions,
    remainingSessions: membership.totalSessions - membership.usedSessions,
    renewalThreshold: membership.renewalThreshold,
    purchaseAmount: money(membership.purchaseAmount)!,
    purchaseBranchId: membership.purchaseBranchId,
    purchaseBranchName: membership.purchaseBranchNameSnapshot,
    originalSellerId: membership.originalSellerId,
    originalSellerName: membership.originalSellerNameSnapshot,
    currentSellerId: membership.currentSellerId,
    currentSellerName: membership.currentSellerNameSnapshot,
    profile: membership.profile,
    status: membership.status,
    activatedAt: membership.activatedAt?.toISOString() ?? null,
    exhaustedAt: membership.exhaustedAt?.toISOString() ?? null,
    canceledAt: membership.canceledAt?.toISOString() ?? null,
    purchasedAt: membership.purchasedAt.toISOString(),
    attendance: membership.attendance.map((attendance) => ({
      id: attendance.id,
      appointmentId: attendance.appointmentId,
      sessionNumber: attendance.sessionNumber,
      attendedAt: attendance.attendedAt.toISOString(),
      branchId: attendance.branchId,
      branchName: attendance.branch.nombre,
      recordedByName: attendance.recordedByCredential
        ? credentialName(attendance.recordedByCredential)
        : "Agenda CRM",
      signatureStatus: attendance.signatureStatus,
    })),
    sellerChanges: membership.sellerChanges.map((change) => ({
      id: change.id,
      fromSellerId: change.fromSellerId,
      fromSellerName: change.fromSellerNameSnapshot,
      toSellerId: change.toSellerId,
      toSellerName: change.toSellerNameSnapshot,
      reason: change.reason,
      changedAt: change.cambiadoEn.toISOString(),
    })),
    statusChanges: membership.statusChanges.map((change) => ({
      id: change.id,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      reason: change.reason,
      changedAt: change.cambiadoEn.toISOString(),
    })),
  };
}

export function membershipScopeWhere(
  context: PosMembershipContext,
  requestedBranchIds?: readonly string[],
): Prisma.PosClientMembershipWhereInput {
  if (context.isMaster && !requestedBranchIds?.length) {
    throw new PosMembershipError(
      "El usuario master debe indicar explícitamente las sucursales de la consulta",
    );
  }
  const branchIds = resolveRequestedBranchIds({
    authorizedBranchIds: context.authorizedBranchIds,
    requestedBranchIds,
  });
  return {
    purchaseBranchId: { in: branchIds },
    ...(!context.isMaster
      ? context.employeeId
        ? { currentSellerId: context.employeeId }
        : { id: "__NO_MEMBERSHIP_PORTFOLIO__" }
      : {}),
  };
}

export async function findScopedMembership(
  tx: Transaction,
  id: string,
  context: PosMembershipContext,
) {
  return tx.posClientMembership.findFirst({
    where: {
      id,
      ...membershipScopeWhere(context, context.authorizedBranchIds),
    },
    include: membershipInclude,
  });
}

async function nextMembershipFolio(tx: Transaction, branchCode: string) {
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>(
    Prisma.sql`SELECT nextval('"PosMembershipFolioSeq"') AS value`,
  );
  return `MEM-${branchCode.toLocaleUpperCase("es-MX")}-${rows[0]!.value
    .toString()
    .padStart(6, "0")}`;
}

export function allocateMembershipUnitCents(
  totalCents: number,
  quantity: number,
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0)
    throw new PosMembershipError("El total de la membresía es inválido");
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new PosMembershipError(
      "Las membresías sólo se venden en unidades enteras mayores a cero",
    );
  const baseCents = Math.floor(totalCents / quantity);
  const remainder = totalCents - baseCents * quantity;
  return Array.from(
    { length: quantity },
    (_, index) => baseCents + (index < remainder ? 1 : 0),
  );
}

export async function createMembershipsForTicket(
  tx: Transaction,
  input: {
    ticketId: string;
    credentialId: string;
    activate: boolean;
  },
) {
  const ticket = await tx.posTicket.findUnique({
    where: { id: input.ticketId },
    include: {
      branch: { include: { posProfile: { select: { code: true } } } },
      customer: true,
      sellers: { orderBy: { creadoEn: "asc" } },
      lines: {
        where: { kind: "SALE", item: { kind: "MEMBERSHIP" } },
        include: {
          item: {
            include: {
              membershipTerms: {
                orderBy: { version: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { creadoEn: "asc" },
      },
    },
  });
  if (!ticket || ticket.lines.length === 0) return [];
  if (!ticket.customer)
    throw new PosMembershipError(
      "Una venta de membresía requiere una clienta identificada",
      409,
    );
  const seller = ticket.sellers[0] ?? null;
  const now = new Date();
  const createdIds: string[] = [];
  for (const line of ticket.lines) {
    const quantity = Number(line.quantity);
    const terms = line.item?.membershipTerms[0];
    if (!line.item || !terms) {
      throw new PosMembershipError(
        `La membresía ${line.itemNameSnapshot} no tiene condiciones vigentes`,
        409,
      );
    }
    const totalCents = Math.round(Number(line.total) * 100);
    const unitAmounts = allocateMembershipUnitCents(totalCents, quantity);
    for (let unitOrdinal = 1; unitOrdinal <= quantity; unitOrdinal += 1) {
      const unitCents = unitAmounts[unitOrdinal - 1]!;
      const membership = await tx.posClientMembership.create({
        data: {
          folio: await nextMembershipFolio(
            tx,
            ticket.branch.posProfile?.code ?? ticket.branch.nombre.slice(0, 3),
          ),
          ticketId: ticket.id,
          ticketLineId: line.id,
          unitOrdinal,
          customerId: ticket.customer.id,
          customerNameSnapshot:
            ticket.customerNameSnapshot ?? ticket.customer.displayName,
          customerPhoneSnapshot: ticket.customerPhoneSnapshot,
          membershipItemId: line.item.id,
          membershipNameSnapshot: line.itemNameSnapshot,
          membershipSkuSnapshot: line.skuSnapshot,
          termsId: terms.id,
          termsVersionSnapshot: terms.version,
          totalSessions: terms.totalSessions,
          renewalThreshold: terms.renewalThreshold,
          purchaseAmount: new Prisma.Decimal((unitCents / 100).toFixed(2)),
          purchaseBranchId: ticket.branchId,
          purchaseBranchNameSnapshot: ticket.branch.nombre,
          originalSellerId: seller?.employeeId ?? null,
          originalSellerNameSnapshot:
            seller?.sellerNameSnapshot ?? "KEYSAR COSMETICS",
          currentSellerId: seller?.employeeId ?? null,
          currentSellerNameSnapshot:
            seller?.sellerNameSnapshot ?? "KEYSAR COSMETICS",
          status: input.activate ? "ACTIVE" : "PENDING",
          activatedAt: input.activate ? now : null,
        },
      });
      createdIds.push(membership.id);
      if (input.activate) {
        await tx.posMembershipStatusChange.create({
          data: {
            membershipId: membership.id,
            fromStatus: "PENDING",
            toStatus: "ACTIVE",
            reason: "Ticket liquidado al momento de la compra",
            actorCredentialId: input.credentialId,
            sourceType: "PosTicket",
            sourceId: ticket.id,
          },
        });
      }
    }
  }
  return createdIds;
}

export async function activateMembershipsForTicket(
  tx: Transaction,
  ticketId: string,
  credentialId: string,
  sourceId: string,
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "ticketId" = ${ticketId}::uuid FOR UPDATE`,
  );
  const pending = await tx.posClientMembership.findMany({
    where: { ticketId, status: "PENDING" },
    select: { id: true },
  });
  const activatedAt = new Date();
  for (const membership of pending) {
    await tx.posMembershipStatusChange.create({
      data: {
        membershipId: membership.id,
        fromStatus: "PENDING",
        toStatus: "ACTIVE",
        reason: "Apartado liquidado",
        actorCredentialId: credentialId,
        sourceType: "PosPaymentOperation",
        sourceId,
      },
    });
    await tx.posClientMembership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE", activatedAt },
    });
  }
}

export async function cancelMembershipsForTicket(
  tx: Transaction,
  input: {
    ticketId: string;
    credentialId: string;
    sourceId: string;
    reason: string;
    ticketLineIds?: string[];
  },
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "ticketId" = ${input.ticketId}::uuid FOR UPDATE`,
  );
  const memberships = await tx.posClientMembership.findMany({
    where: {
      ticketId: input.ticketId,
      status: { not: "CANCELED" },
      ...(input.ticketLineIds?.length
        ? { ticketLineId: { in: input.ticketLineIds } }
        : {}),
    },
    select: { id: true, status: true },
  });
  const canceledAt = new Date();
  for (const membership of memberships) {
    await tx.posMembershipStatusChange.create({
      data: {
        membershipId: membership.id,
        fromStatus: membership.status,
        toStatus: "CANCELED",
        reason: input.reason,
        actorCredentialId: input.credentialId,
        sourceType: "PosTicketEvent",
        sourceId: input.sourceId,
      },
    });
    await tx.posClientMembership.update({
      where: { id: membership.id },
      data: { status: "CANCELED", canceledAt },
    });
  }
}

export async function consumeMembershipAttendance(
  tx: Transaction,
  input: {
    membershipId: string;
    appointmentId: string;
    event: "ATTENDED" | "CANCELED" | "NO_SHOW" | "RESCHEDULED";
    branchId: string;
    signatureStatus: "PENDING" | "SIGNED" | "NOT_REQUIRED";
  },
  context: PosMembershipContext,
) {
  const scoped = await findScopedMembership(tx, input.membershipId, context);
  if (!scoped) throw new PosMembershipError("Membresía no encontrada", 404);
  if (input.event !== "ATTENDED") return scoped;
  if (input.signatureStatus === "SIGNED") {
    throw new PosMembershipError(
      "La firma no puede marcarse como completada sin evidencia cifrada y consentimiento",
    );
  }
  if (!context.authorizedBranchIds.includes(input.branchId)) {
    throw new PosMembershipError("Sucursal no autorizada", 403);
  }
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "id" = ${input.membershipId}::uuid FOR UPDATE`,
  );
  const membership = await tx.posClientMembership.findUnique({
    where: { id: input.membershipId },
  });
  if (!membership) throw new PosMembershipError("Membresía no encontrada", 404);
  const existing = await tx.posMembershipAttendance.findUnique({
    where: { appointmentId: input.appointmentId },
  });
  if (existing) {
    if (existing.membershipId !== membership.id)
      throw new PosMembershipError(
        "La cita ya consumió una sesión de otra membresía",
        409,
      );
    return tx.posClientMembership.findUniqueOrThrow({
      where: { id: membership.id },
      include: membershipInclude,
    });
  }
  if (membership.status !== "ACTIVE")
    throw new PosMembershipError(
      "La membresía no está activa para consumir sesiones",
      409,
    );
  if (membership.usedSessions >= membership.totalSessions)
    throw new PosMembershipError(
      "La membresía no tiene sesiones disponibles",
      409,
    );
  const appointment = await tx.posAppointment.findFirst({
    where: {
      id: input.appointmentId,
      customerId: membership.customerId,
      branchId: input.branchId,
      status: { in: ["SCHEDULED", "COMPLETED"] },
    },
  });
  if (!appointment)
    throw new PosMembershipError(
      "La cita atendida no pertenece a la clienta, sucursal o estado esperado",
      409,
    );
  const sessionNumber = membership.usedSessions + 1;
  const exhausted = sessionNumber === membership.totalSessions;
  const attendedAt = new Date();
  await tx.posMembershipAttendance.create({
    data: {
      membershipId: membership.id,
      appointmentId: appointment.id,
      sessionNumber,
      attendedAt,
      branchId: input.branchId,
      recordedByCredentialId: context.credentialId,
      signatureStatus: input.signatureStatus,
    },
  });
  if (appointment.status !== "COMPLETED") {
    await tx.posAppointment.update({
      where: { id: appointment.id },
      data: { status: "COMPLETED" },
    });
  }
  if (exhausted) {
    await tx.posMembershipStatusChange.create({
      data: {
        membershipId: membership.id,
        fromStatus: "ACTIVE",
        toStatus: "EXHAUSTED",
        reason: "Se consumió la última sesión",
        actorCredentialId: context.credentialId,
        sourceType: "PosAppointment",
        sourceId: appointment.id,
      },
    });
  }
  await tx.posClientMembership.update({
    where: { id: membership.id },
    data: {
      usedSessions: sessionNumber,
      status: exhausted ? "EXHAUSTED" : "ACTIVE",
      exhaustedAt: exhausted ? attendedAt : null,
    },
  });
  return tx.posClientMembership.findUniqueOrThrow({
    where: { id: membership.id },
    include: membershipInclude,
  });
}

export async function updateMembershipProfile(
  tx: Transaction,
  membershipId: string,
  profile: "POTENTIAL" | "LOYAL" | "VIP" | "RECOVERY",
  context: PosMembershipContext,
) {
  const membership = await findScopedMembership(tx, membershipId, context);
  if (!membership) throw new PosMembershipError("Membresía no encontrada", 404);
  await tx.posClientMembership.update({
    where: { id: membership.id },
    data: { profile },
  });
  return tx.posClientMembership.findUniqueOrThrow({
    where: { id: membership.id },
    include: membershipInclude,
  });
}

export async function changeMembershipSeller(
  tx: Transaction,
  input: { membershipId: string; sellerId: string; reason: string },
  context: PosMembershipContext,
) {
  const membership = await findScopedMembership(
    tx,
    input.membershipId,
    context,
  );
  if (!membership) throw new PosMembershipError("Membresía no encontrada", 404);
  const seller = await tx.empleado.findFirst({
    where: { id: input.sellerId, activo: true },
    select: { id: true, nombreCompleto: true },
  });
  if (!seller) throw new PosMembershipError("Vendedor no encontrado", 404);
  if (membership.currentSellerId === seller.id) return membership;
  await tx.posMembershipSellerChange.create({
    data: {
      membershipId: membership.id,
      fromSellerId: membership.currentSellerId,
      fromSellerNameSnapshot: membership.currentSellerNameSnapshot,
      toSellerId: seller.id,
      toSellerNameSnapshot: seller.nombreCompleto,
      reason: input.reason,
      actorCredentialId: context.credentialId,
    },
  });
  await tx.posClientMembership.update({
    where: { id: membership.id },
    data: {
      currentSellerId: seller.id,
      currentSellerNameSnapshot: seller.nombreCompleto,
    },
  });
  return tx.posClientMembership.findUniqueOrThrow({
    where: { id: membership.id },
    include: membershipInclude,
  });
}

export async function changeMembershipStatus(
  tx: Transaction,
  input: {
    membershipId: string;
    status: "ACTIVE" | "CANCELED";
    reason: string;
  },
  context: PosMembershipContext,
) {
  const membership = await findScopedMembership(
    tx,
    input.membershipId,
    context,
  );
  if (!membership) throw new PosMembershipError("Membresía no encontrada", 404);
  if (membership.status === input.status) return membership;
  if (
    input.status === "ACTIVE" &&
    membership.usedSessions >= membership.totalSessions
  )
    throw new PosMembershipError(
      "Una membresía agotada no puede reactivarse",
      409,
    );
  const changedAt = new Date();
  await tx.posMembershipStatusChange.create({
    data: {
      membershipId: membership.id,
      fromStatus: membership.status,
      toStatus: input.status,
      reason: input.reason,
      actorCredentialId: context.credentialId,
      sourceType: "MANUAL",
    },
  });
  await tx.posClientMembership.update({
    where: { id: membership.id },
    data: {
      status: input.status,
      activatedAt:
        input.status === "ACTIVE"
          ? (membership.activatedAt ?? changedAt)
          : membership.activatedAt,
      canceledAt: input.status === "CANCELED" ? changedAt : null,
      exhaustedAt: null,
    },
  });
  return tx.posClientMembership.findUniqueOrThrow({
    where: { id: membership.id },
    include: membershipInclude,
  });
}

const monthRange = (month: string) => {
  const from = new Date(`${month}-01T00:00:00.000Z`);
  const to = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1),
  );
  return { from, to };
};

const dayAfter = (businessDate: string) => {
  const value = new Date(`${businessDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
};

const closureInclude = {
  createdByCredential: {
    include: {
      employee: { select: { nombreCompleto: true } },
      user: { select: { nombre: true } },
    },
  },
  rankings: { orderBy: { rank: "asc" as const } },
} satisfies Prisma.PosMembershipSalesClosureInclude;

type ClosurePayload = Prisma.PosMembershipSalesClosureGetPayload<{
  include: typeof closureInclude;
}>;

export function membershipClosureDto(
  closure: ClosurePayload,
): PosMembershipSalesClosureDto {
  return {
    id: closure.id,
    month: closure.month.toISOString().slice(0, 7),
    version: closure.version,
    branchIds: closure.branchIds as string[],
    membershipCount: closure.membershipCount,
    totalAmount: money(closure.totalAmount)!,
    createdAt: closure.creadoEn.toISOString(),
    createdByName: credentialName(closure.createdByCredential),
    rankings: closure.rankings.map((ranking) => ({
      rank: ranking.rank,
      sellerId: ranking.originalSellerId,
      sellerName: ranking.sellerNameSnapshot,
      quantity: ranking.quantity,
      amount: money(ranking.amount)!,
    })),
  };
}

export async function createMembershipClosure(
  tx: Transaction,
  input: { month: string; branchIds: string[] },
  context: PosMembershipContext,
) {
  if (!context.isMaster)
    throw new PosMembershipError(
      "Los cierres comerciales requieren una credencial master",
      403,
    );
  const branchIds = resolveRequestedBranchIds({
    authorizedBranchIds: context.authorizedBranchIds,
    requestedBranchIds: input.branchIds,
  }).sort();
  const scopeHash = createHash("sha256")
    .update(branchIds.join("\n"))
    .digest("hex");
  const { from, to } = monthRange(input.month);
  await tx.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`pos-membership-closure:${input.month}:${scopeHash}`}))`,
  );
  const latest = await tx.posMembershipSalesClosure.findFirst({
    where: { month: from, scopeHash },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const memberships = await tx.posClientMembership.findMany({
    where: {
      purchaseBranchId: { in: branchIds },
      purchasedAt: { gte: from, lt: to },
      status: { not: "CANCELED" },
    },
    select: {
      originalSellerId: true,
      originalSellerNameSnapshot: true,
      purchaseAmount: true,
    },
  });
  const grouped = new Map<
    string,
    {
      sellerId: string | null;
      sellerName: string;
      quantity: number;
      amount: Prisma.Decimal;
    }
  >();
  for (const membership of memberships) {
    const key =
      membership.originalSellerId ??
      `name:${membership.originalSellerNameSnapshot}`;
    const current = grouped.get(key) ?? {
      sellerId: membership.originalSellerId,
      sellerName: membership.originalSellerNameSnapshot,
      quantity: 0,
      amount: new Prisma.Decimal(0),
    };
    current.quantity += 1;
    current.amount = current.amount.plus(membership.purchaseAmount);
    grouped.set(key, current);
  }
  const rankings = [...grouped.values()].sort(
    (left, right) =>
      right.quantity - left.quantity ||
      right.amount.comparedTo(left.amount) ||
      left.sellerName.localeCompare(right.sellerName, "es-MX"),
  );
  const closure = await tx.posMembershipSalesClosure.create({
    data: {
      month: from,
      scopeHash,
      branchIds,
      version: (latest?.version ?? 0) + 1,
      membershipCount: memberships.length,
      totalAmount: memberships.reduce(
        (sum, membership) => sum.plus(membership.purchaseAmount),
        new Prisma.Decimal(0),
      ),
      createdByCredentialId: context.credentialId,
      rankings: {
        create: rankings.map((ranking, index) => ({
          rank: index + 1,
          originalSellerId: ranking.sellerId,
          sellerNameSnapshot: ranking.sellerName,
          quantity: ranking.quantity,
          amount: ranking.amount,
        })),
      },
    },
    include: closureInclude,
  });
  return closure;
}

export function membershipListWhere(input: {
  context: PosMembershipContext;
  branchIds?: string[];
  query?: string;
  status?: PosMembershipStatus;
  profile?: "POTENTIAL" | "LOYAL" | "VIP" | "RECOVERY";
  followUpOnly?: boolean;
  purchasedFrom?: string;
  purchasedTo?: string;
}): Prisma.PosClientMembershipWhereInput {
  return {
    ...membershipScopeWhere(input.context, input.branchIds),
    ...(input.status ? { status: input.status } : {}),
    ...(input.profile ? { profile: input.profile } : {}),
    ...(input.followUpOnly
      ? {
          status: "ACTIVE",
        }
      : {}),
    ...(input.purchasedFrom || input.purchasedTo
      ? {
          purchasedAt: {
            ...(input.purchasedFrom
              ? { gte: new Date(`${input.purchasedFrom}T00:00:00.000Z`) }
              : {}),
            ...(input.purchasedTo ? { lt: dayAfter(input.purchasedTo) } : {}),
          },
        }
      : {}),
    ...(input.query
      ? {
          OR: [
            { folio: { contains: input.query, mode: "insensitive" } },
            {
              customerNameSnapshot: {
                contains: input.query,
                mode: "insensitive",
              },
            },
            { customerPhoneSnapshot: { contains: input.query } },
            {
              membershipNameSnapshot: {
                contains: input.query,
                mode: "insensitive",
              },
            },
            {
              membershipSkuSnapshot: {
                contains: input.query,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}
