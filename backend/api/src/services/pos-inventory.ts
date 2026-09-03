import { createHash } from "node:crypto";
import { Prisma, type InventoryMovementType } from "@prisma/client";

export class PosInventoryError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

type Transaction = Prisma.TransactionClient;
type IdempotentResponse<T> = { status: number; message: string; data: T };

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
};

const requestHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");

export async function executePosIdempotent<T>(input: {
  key: string;
  actorCredentialId: string;
  operation: string;
  payload: unknown;
  execute: (tx: Transaction) => Promise<IdempotentResponse<T>>;
}): Promise<IdempotentResponse<T> & { replayed: boolean }> {
  const hash = requestHash(input.payload);
  const replay = async () => {
    const existing = await import("../prisma/client").then(({ prisma }) =>
      prisma.posIdempotencyRecord.findUnique({ where: { key: input.key } }),
    );
    if (!existing) return null;
    if (
      existing.actorCredentialId !== input.actorCredentialId ||
      existing.operation !== input.operation ||
      existing.requestHash !== hash
    ) {
      throw new PosInventoryError("La llave de idempotencia ya se usó con otra operación", 409);
    }
    const stored = existing.responseBody as unknown as IdempotentResponse<T>;
    return { ...stored, replayed: true };
  };

  const existing = await replay();
  if (existing) return existing;

  const { prisma } = await import("../prisma/client");
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.posIdempotencyRecord.create({
        data: {
          key: input.key,
          actorCredentialId: input.actorCredentialId,
          operation: input.operation,
          requestHash: hash,
          responseStatus: 102,
          responseBody: { status: 102, message: "Procesando", data: null },
        },
      });
      const response = await input.execute(tx);
      await tx.posIdempotencyRecord.update({
        where: { key: input.key },
        data: {
          responseStatus: response.status,
          responseBody: response as unknown as Prisma.InputJsonValue,
        },
      });
      return { ...response, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentReplay = await replay();
      if (concurrentReplay) return concurrentReplay;
    }
    throw error;
  }
}

export const money = (value: Prisma.Decimal | string | number | null | undefined) =>
  value === null || value === undefined ? null : new Prisma.Decimal(value).toFixed(2);

export const businessDateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);

export async function nextPosFolio(
  tx: Transaction,
  sequence: "InventoryMovementFolioSeq" | "InventoryAdjustmentFolioSeq" | "WarehouseRequestFolioSeq",
  prefix: string,
) {
  const rows = await tx.$queryRaw<Array<{ value: string }>>(
    Prisma.sql`SELECT nextval(${Prisma.raw(`'"${sequence}"'`)})::text AS value`,
  );
  return `${prefix}-${String(rows[0]!.value).padStart(6, "0")}`;
}

interface BalanceSnapshot {
  before: Prisma.Decimal;
  after: Prisma.Decimal;
  reservedBefore: Prisma.Decimal;
  reservedAfter: Prisma.Decimal;
  version: number;
}

export async function changeInventoryBalance(
  tx: Transaction,
  input: {
    locationId: string;
    itemId: string;
    availableDelta?: Prisma.Decimal;
    reservedDelta?: Prisma.Decimal;
    requireUnreserved?: boolean;
  },
): Promise<BalanceSnapshot> {
  const availableDelta = input.availableDelta ?? new Prisma.Decimal(0);
  const reservedDelta = input.reservedDelta ?? new Prisma.Decimal(0);
  await tx.inventoryBalance.upsert({
    where: { locationId_itemId: { locationId: input.locationId, itemId: input.itemId } },
    create: { locationId: input.locationId, itemId: input.itemId },
    update: {},
  });
  const rows = await tx.$queryRaw<Array<{
    before: Prisma.Decimal;
    after: Prisma.Decimal;
    reservedBefore: Prisma.Decimal;
    reservedAfter: Prisma.Decimal;
    version: number;
  }>>(Prisma.sql`
    UPDATE "InventoryBalance"
    SET
      "availableQuantity" = "availableQuantity" + ${availableDelta},
      "reservedQuantity" = "reservedQuantity" + ${reservedDelta},
      "version" = "version" + 1,
      "actualizadoEn" = CURRENT_TIMESTAMP
    WHERE "locationId" = ${input.locationId}
      AND "itemId" = ${input.itemId}
      AND "reservedQuantity" + ${reservedDelta} >= 0
      AND (
        ${input.requireUnreserved ?? false} = false OR
        "availableQuantity" + ${availableDelta} >= "reservedQuantity" + ${reservedDelta}
      )
    RETURNING
      "availableQuantity" - ${availableDelta} AS before,
      "availableQuantity" AS after,
      "reservedQuantity" - ${reservedDelta} AS "reservedBefore",
      "reservedQuantity" AS "reservedAfter",
      "version"
  `);
  if (!rows[0]) throw new PosInventoryError("Existencia disponible insuficiente o reserva concurrente", 409);
  return rows[0];
}

export interface LedgerLineInput {
  itemId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: Prisma.Decimal;
  unitCostSnapshot: Prisma.Decimal | null;
  metadata?: Prisma.InputJsonValue;
  requireSourceStock?: boolean;
}

export async function createInventoryLedgerMovement(
  tx: Transaction,
  input: {
    type: InventoryMovementType;
    reason?: string | null;
    notes?: string | null;
    businessDate: string;
    actorCredentialId: string;
    terminalId: string;
    adjustmentBatchId?: string;
    warehouseRequestId?: string;
    countId?: string;
    reversalOfId?: string;
    lines: LedgerLineInput[];
  },
) {
  const lineData: Array<{
    itemId: string;
    fromLocationId: string | null;
    toLocationId: string | null;
    quantity: Prisma.Decimal;
    fromQuantityBefore: Prisma.Decimal | null;
    fromQuantityAfter: Prisma.Decimal | null;
    toQuantityBefore: Prisma.Decimal | null;
    toQuantityAfter: Prisma.Decimal | null;
    unitCostSnapshot: Prisma.Decimal | null;
    metadata?: Prisma.InputJsonValue;
  }> = [];

  for (const line of input.lines) {
    let source: BalanceSnapshot | null = null;
    let destination: BalanceSnapshot | null = null;
    if (line.fromLocationId) {
      source = await changeInventoryBalance(tx, {
        locationId: line.fromLocationId,
        itemId: line.itemId,
        availableDelta: line.quantity.negated(),
        requireUnreserved: line.requireSourceStock,
      });
    }
    if (line.toLocationId) {
      destination = await changeInventoryBalance(tx, {
        locationId: line.toLocationId,
        itemId: line.itemId,
        availableDelta: line.quantity,
      });
    }
    lineData.push({
      itemId: line.itemId,
      fromLocationId: line.fromLocationId,
      toLocationId: line.toLocationId,
      quantity: line.quantity,
      fromQuantityBefore: source?.before ?? null,
      fromQuantityAfter: source?.after ?? null,
      toQuantityBefore: destination?.before ?? null,
      toQuantityAfter: destination?.after ?? null,
      unitCostSnapshot: line.unitCostSnapshot,
      ...(line.metadata ? { metadata: line.metadata } : {}),
    });
  }

  return tx.inventoryMovement.create({
    data: {
      folio: await nextPosFolio(tx, "InventoryMovementFolioSeq", "MOV"),
      type: input.type,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      businessDate: businessDateValue(input.businessDate),
      actorCredentialId: input.actorCredentialId,
      terminalId: input.terminalId,
      adjustmentBatchId: input.adjustmentBatchId,
      warehouseRequestId: input.warehouseRequestId,
      countId: input.countId,
      reversalOfId: input.reversalOfId,
      lines: { create: lineData },
    },
    include: movementInclude,
  });
}

export const locationInclude = { branch: { select: { nombre: true } } } as const;
export const movementInclude = {
  lines: {
    include: {
      item: { select: { name: true, sku: true } },
      fromLocation: { include: locationInclude },
      toLocation: { include: locationInclude },
    },
  },
} as const;

export const warehouseRequestInclude = {
  lines: true,
  events: { orderBy: { creadoEn: "asc" as const } },
  destinationLocation: { include: locationInclude },
  sourceLocation: { include: locationInclude },
} as const;

export function inventoryLocationDto(location: {
  id: string;
  code: string;
  name: string;
  type: "BRANCH" | "WAREHOUSE";
  branchId: string | null;
  active: boolean;
  branch: { nombre: string } | null;
}) {
  return {
    id: location.id,
    code: location.code,
    name: location.name,
    type: location.type,
    branchId: location.branchId,
    branchName: location.branch?.nombre ?? null,
    active: location.active,
  };
}

export function inventoryMovementDto(
  movement: Prisma.InventoryMovementGetPayload<{ include: typeof movementInclude }>,
  includeCosts: boolean,
) {
  return {
    id: movement.id,
    folio: movement.folio,
    type: movement.type,
    status: movement.status,
    reason: movement.reason,
    notes: movement.notes,
    businessDate: movement.businessDate.toISOString().slice(0, 10),
    adjustmentBatchId: movement.adjustmentBatchId,
    warehouseRequestId: movement.warehouseRequestId,
    reversalOfId: movement.reversalOfId,
    createdAt: movement.creadoEn.toISOString(),
    lines: movement.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      sku: line.item.sku,
      fromLocation: line.fromLocation ? inventoryLocationDto(line.fromLocation) : null,
      toLocation: line.toLocation ? inventoryLocationDto(line.toLocation) : null,
      quantity: money(line.quantity)!,
      fromQuantityBefore: money(line.fromQuantityBefore),
      fromQuantityAfter: money(line.fromQuantityAfter),
      toQuantityBefore: money(line.toQuantityBefore),
      toQuantityAfter: money(line.toQuantityAfter),
      ...(includeCosts ? { unitCostSnapshot: money(line.unitCostSnapshot) } : {}),
    })),
  };
}

export function warehouseRequestDto(
  request: Prisma.WarehouseRequestGetPayload<{ include: typeof warehouseRequestInclude }> & {
    branchName?: string | null;
    supplierName?: string | null;
  },
  includeCosts: boolean,
) {
  return {
    id: request.id,
    folio: request.folio,
    source: request.source,
    requestType: request.requestType,
    status: request.status,
    branchId: request.branchId,
    branchName: request.branchName ?? request.destinationLocation.branch?.nombre ?? null,
    supplierId: request.supplierId,
    supplierName: request.supplierName ?? null,
    priceListId: request.priceListId,
    customerId: request.customerId,
    sourceLocationId: request.sourceLocationId,
    destinationLocationId: request.destinationLocationId,
    notes: request.notes,
    createdAt: request.creadoEn.toISOString(),
    creationApprovedAt: request.creationApprovedAt?.toISOString() ?? null,
    sendApprovedAt: request.sendApprovedAt?.toISOString() ?? null,
    shippedAt: request.shippedAt?.toISOString() ?? null,
    receivedAt: request.receivedAt?.toISOString() ?? null,
    canceledAt: request.canceledAt?.toISOString() ?? null,
    lines: request.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.itemNameSnapshot,
      sku: line.skuSnapshot,
      quantity: money(line.quantity)!,
      priceSnapshot: money(line.priceSnapshot),
      priceListNameSnapshot: line.priceListNameSnapshot,
      customerNameSnapshot: line.customerNameSnapshot,
      ...(includeCosts ? { unitCostSnapshot: money(line.unitCostSnapshot) } : {}),
    })),
    events: request.events.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      action: event.action,
      actorCredentialId: event.actorCredentialId,
      notes: event.notes,
      createdAt: event.creadoEn.toISOString(),
    })),
  };
}
