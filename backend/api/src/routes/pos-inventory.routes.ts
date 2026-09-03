import { Router, type NextFunction, type Request, type Response, type Router as ExpressRouter } from "express";
import { Prisma, type InventoryMovementType, type WarehouseRequestStatus } from "@prisma/client";
import { z } from "zod";
import {
  posInventoryAdjustmentBatchWriteSchema,
  posInventoryCountRequestSchema,
  posInventoryQuerySchema,
  posMutationHeadersSchema,
  posNotificationQuerySchema,
  posWarehouseActionSchema,
  posWarehouseRequestWriteSchema,
} from "../contracts/pos.contracts";
import { posAuthMiddleware, requirePosPermission } from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import {
  PosInventoryError,
  businessDateValue,
  changeInventoryBalance,
  createInventoryLedgerMovement,
  executePosIdempotent,
  inventoryLocationDto,
  inventoryMovementDto,
  locationInclude,
  money,
  movementInclude,
  nextPosFolio,
  warehouseRequestDto,
  warehouseRequestInclude,
} from "../services/pos-inventory";

const router: ExpressRouter = Router();
const db = prisma;
const decimal = (value: string | Prisma.Decimal) => new Prisma.Decimal(value);
const asyncRoute = (
  handler: (req: Request, res: Response) => Promise<unknown>,
) => (req: Request, res: Response, next: NextFunction) => {
  void handler(req, res).catch(next);
};
const costsAllowed = (req: Request) => Boolean(req.posUser?.isMaster || req.posUser?.permissions.includes("REPORTS_COSTS"));
const auditAllowed = (req: Request) => Boolean(req.posUser?.isMaster || req.posUser?.permissions.includes("INVENTORY_AUDIT"));
const warehouseAllowed = (req: Request) => Boolean(req.posUser?.isMaster || req.posUser?.permissions.includes("WAREHOUSE_MANAGE"));
const requireWarehouseAccess = (req: Request, res: Response, next: NextFunction) => {
  if (req.posUser?.isMaster || req.posUser?.permissions.some((permission) => permission === "WAREHOUSE_MANAGE" || permission === "WAREHOUSE_BRANCH_REQUEST")) return next();
  return res.status(403).json({ success: false, message: "Permiso POS insuficiente", data: null });
};
const requireInventoryAccess = (req: Request, res: Response, next: NextFunction) => {
  if (req.posUser?.isMaster || req.posUser?.permissions.some((permission) => permission === "INVENTORY_VIEW" || permission === "INVENTORY_ADJUST" || permission === "WAREHOUSE_MANAGE")) return next();
  return res.status(403).json({ success: false, message: "Permiso POS insuficiente", data: null });
};
const businessDateNow = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

function idempotencyKey(req: Request, res: Response) {
  const parsed = posMutationHeadersSchema.safeParse({ "idempotency-key": req.headers["idempotency-key"] });
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Idempotency-Key UUID requerido", data: parsed.error.flatten().fieldErrors });
    return null;
  }
  return parsed.data["idempotency-key"];
}

async function respondIdempotent<T>(res: Response, promise: ReturnType<typeof executePosIdempotent<T>>) {
  const result = await promise;
  res.status(result.status).json({ success: true, message: result.message, data: result.data, replayed: result.replayed });
}

async function findLocationForScope(req: Request, locationId: string) {
  const location = await db.inventoryLocation.findFirst({
    where: { id: locationId, active: true }, include: locationInclude,
  });
  if (!location) throw new PosInventoryError("Ubicación no encontrada", 404);
  if (!warehouseAllowed(req) && location.branchId !== req.posUser!.branchId) {
    throw new PosInventoryError("La ubicación está fuera del alcance de la terminal", 403);
  }
  return location;
}

async function validateAdjustmentReferences(req: Request, lines: z.infer<typeof posInventoryAdjustmentBatchWriteSchema>["lines"]) {
  const itemIds = [...new Set(lines.map((line) => line.itemId))];
  if (await db.catalogItem.count({ where: { id: { in: itemIds }, kind: "PRODUCT", active: true, deletedAt: null } }) !== itemIds.length) {
    throw new PosInventoryError("El lote contiene productos inactivos o inexistentes");
  }
  const locationIds = [...new Set(lines.flatMap((line) => [line.fromLocationId, line.toLocationId]).filter((id): id is string => Boolean(id)))];
  const locations = await db.inventoryLocation.findMany({ where: { id: { in: locationIds }, active: true } });
  if (locations.length !== locationIds.length) throw new PosInventoryError("El lote contiene ubicaciones inválidas");
  if (!warehouseAllowed(req) && locations.some((location) => location.branchId !== req.posUser!.branchId)) {
    throw new PosInventoryError("El lote contiene ubicaciones fuera del alcance de la terminal", 403);
  }
}

const adjustmentBatchInclude = { lines: true, movement: { select: { id: true } } } as const;
const adjustmentBatchDto = (batch: Prisma.InventoryAdjustmentBatchGetPayload<{ include: typeof adjustmentBatchInclude }>) => ({
  id: batch.id,
  folio: batch.folio,
  status: batch.status,
  notes: batch.notes,
  createdAt: batch.creadoEn.toISOString(),
  resolvedAt: batch.resolvedAt?.toISOString() ?? null,
  lines: batch.lines.map((line) => ({
    itemId: line.itemId,
    type: line.type as "ADD" | "REMOVE" | "TRANSFER" | "RETURN" | "DEMO" | "WRITE_OFF",
    fromLocationId: line.fromLocationId,
    toLocationId: line.toLocationId,
    quantity: money(line.quantity)!,
    reason: line.reason,
    notes: line.notes,
  })),
  movementId: batch.movement?.id ?? null,
});

async function applyAdjustmentBatch(tx: Prisma.TransactionClient, req: Request, batchId: string) {
  const batch = await tx.inventoryAdjustmentBatch.findUnique({ where: { id: batchId }, include: { lines: true } });
  if (!batch) throw new PosInventoryError("Lote no encontrado", 404);
  if (batch.status !== "PENDING") throw new PosInventoryError("El lote ya no está pendiente", 409);
  const items = await tx.catalogItem.findMany({ where: { id: { in: batch.lines.map((line) => line.itemId) } }, select: { id: true, unitCost: true } });
  const costs = new Map(items.map((item) => [item.id, item.unitCost]));
  const movement = await createInventoryLedgerMovement(tx, {
    type: batch.lines.length === 1 ? batch.lines[0]!.type : "TRANSFER",
    reason: "LOTE_AJUSTE",
    notes: batch.notes,
    businessDate: businessDateNow(),
    actorCredentialId: req.posUser!.credentialId,
    terminalId: req.posUser!.terminalId,
    adjustmentBatchId: batch.id,
    lines: batch.lines.map((line) => ({
      itemId: line.itemId,
      fromLocationId: line.fromLocationId,
      toLocationId: line.toLocationId,
      quantity: line.quantity,
      unitCostSnapshot: costs.get(line.itemId) ?? null,
      metadata: { requestedType: line.type, reason: line.reason, notes: line.notes },
    })),
  });
  return tx.inventoryAdjustmentBatch.update({
    where: { id: batch.id },
    data: { status: "APPLIED", resolvedAt: new Date(), resolvedByCredentialId: req.posUser!.credentialId },
    include: adjustmentBatchInclude,
  }).then((updated) => ({ updated, movement }));
}

async function reverseBatch(tx: Prisma.TransactionClient, req: Request, batchId: string) {
  const batch = await tx.inventoryAdjustmentBatch.findUnique({ where: { id: batchId }, include: { movement: { include: movementInclude } } });
  if (!batch) throw new PosInventoryError("Lote no encontrado", 404);
  if (batch.status === "PENDING") {
    return tx.inventoryAdjustmentBatch.update({ where: { id: batch.id }, data: { status: "CANCELED", resolvedAt: new Date(), resolvedByCredentialId: req.posUser!.credentialId }, include: adjustmentBatchInclude });
  }
  if (batch.status !== "APPLIED" || !batch.movement) throw new PosInventoryError("El lote ya no puede cancelarse", 409);
  await createInventoryLedgerMovement(tx, {
    type: "REVERSAL",
    reason: `REVERSA_${batch.folio}`,
    businessDate: businessDateNow(),
    actorCredentialId: req.posUser!.credentialId,
    terminalId: req.posUser!.terminalId,
    reversalOfId: batch.movement.id,
    lines: batch.movement.lines.map((line) => ({
      itemId: line.itemId,
      fromLocationId: line.toLocationId,
      toLocationId: line.fromLocationId,
      quantity: line.quantity,
      unitCostSnapshot: line.unitCostSnapshot,
      metadata: { reversalOfLineId: line.id },
    })),
  });
  await tx.inventoryMovement.update({ where: { id: batch.movement.id }, data: { status: "REVERSED" } });
  return tx.inventoryAdjustmentBatch.update({ where: { id: batch.id }, data: { status: "REVERSED", resolvedAt: new Date(), resolvedByCredentialId: req.posUser!.credentialId }, include: adjustmentBatchInclude });
}

router.use(posAuthMiddleware);

router.get("/inventory/locations", requireInventoryAccess, asyncRoute(async (req, res) => {
  const locations = await db.inventoryLocation.findMany({
    where: warehouseAllowed(req) ? { active: true } : { active: true, branchId: req.posUser!.branchId },
    include: locationInclude,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  res.json({ success: true, message: "OK", data: locations.map(inventoryLocationDto) });
}));

router.get("/inventory/balances", requireInventoryAccess, asyncRoute(async (req, res) => {
  const parsed = z.object({ locationId: z.string().trim().min(1).optional() }).strict().safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  const locations = await db.inventoryLocation.findMany({
    where: {
      active: true,
      ...(parsed.data.locationId ? { id: parsed.data.locationId } : {}),
      ...(!warehouseAllowed(req) ? { branchId: req.posUser!.branchId } : {}),
    }, include: locationInclude,
  });
  if (parsed.data.locationId && locations.length === 0) return res.status(403).json({ success: false, message: "Ubicación fuera de alcance", data: null });
  const balances = await db.inventoryBalance.findMany({
    where: { locationId: { in: locations.map((location) => location.id) } },
    orderBy: [{ locationId: "asc" }, { itemId: "asc" }],
  });
  res.json({ success: true, message: "OK", data: balances.map((balance) => ({
    itemId: balance.itemId, locationId: balance.locationId,
    availableQuantity: money(balance.availableQuantity), reservedQuantity: money(balance.reservedQuantity),
    version: balance.version, updatedAt: balance.actualizadoEn.toISOString(),
  })) });
}));

router.get("/inventory/movements", requireInventoryAccess, asyncRoute(async (req, res) => {
  const parsed = posInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  if (parsed.data.locationId) await findLocationForScope(req, parsed.data.locationId);
  const locationScope = parsed.data.locationId
    ? [parsed.data.locationId]
    : (await db.inventoryLocation.findMany({ where: warehouseAllowed(req) ? { active: true } : { branchId: req.posUser!.branchId, active: true }, select: { id: true } })).map((location) => location.id);
  const where: Prisma.InventoryMovementWhereInput = {
    ...(parsed.data.businessDate ? { businessDate: businessDateValue(parsed.data.businessDate) } : {}),
    lines: { some: { OR: [{ fromLocationId: { in: locationScope } }, { toLocationId: { in: locationScope } }] } },
  };
  const [items, total] = await Promise.all([
    db.inventoryMovement.findMany({ where, include: movementInclude, orderBy: { creadoEn: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize }),
    db.inventoryMovement.count({ where }),
  ]);
  res.json({ success: true, message: "OK", data: { items: items.map((item) => inventoryMovementDto(item, costsAllowed(req))), page: parsed.data.page, pageSize: parsed.data.pageSize, total } });
}));

router.get("/inventory/adjustment-batches", requirePosPermission("INVENTORY_ADJUST"), asyncRoute(async (req, res) => {
  const parsed = posInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  const batches = await db.inventoryAdjustmentBatch.findMany({ include: adjustmentBatchInclude, orderBy: { creadoEn: "desc" }, take: parsed.data.pageSize, skip: (parsed.data.page - 1) * parsed.data.pageSize });
  res.json({ success: true, message: "OK", data: batches.map(adjustmentBatchDto) });
}));

router.post("/inventory/adjustment-batches", requirePosPermission("INVENTORY_ADJUST"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res); if (!key) return;
  const parsed = posInventoryAdjustmentBatchWriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Lote inválido", data: parsed.error.flatten().fieldErrors });
  await validateAdjustmentReferences(req, parsed.data.lines);
  await respondIdempotent(res, executePosIdempotent({
    key, actorCredentialId: req.posUser!.credentialId, operation: "INVENTORY_BATCH_CREATE", payload: parsed.data,
    execute: async (tx) => {
      const batch = await tx.inventoryAdjustmentBatch.create({
        data: {
          folio: await nextPosFolio(tx, "InventoryAdjustmentFolioSeq", "LOT"), notes: parsed.data.notes,
          createdByCredentialId: req.posUser!.credentialId,
          lines: { create: parsed.data.lines.map((line) => ({ ...line, quantity: decimal(line.quantity) })) },
        }, include: adjustmentBatchInclude,
      });
      return { status: 201, message: "Lote pendiente; el inventario aún no cambió", data: adjustmentBatchDto(batch) };
    },
  }));
}));

router.put("/inventory/adjustment-batches/:id", requirePosPermission("INVENTORY_ADJUST"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res); if (!key) return;
  const parsed = posInventoryAdjustmentBatchWriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Lote inválido", data: parsed.error.flatten().fieldErrors });
  await validateAdjustmentReferences(req, parsed.data.lines);
  await respondIdempotent(res, executePosIdempotent({ key, actorCredentialId: req.posUser!.credentialId, operation: `INVENTORY_BATCH_UPDATE:${req.params["id"]}`, payload: parsed.data, execute: async (tx) => {
    const current = await tx.inventoryAdjustmentBatch.findUnique({ where: { id: req.params["id"]! } });
    if (!current) throw new PosInventoryError("Lote no encontrado", 404);
    if (current.status !== "PENDING") throw new PosInventoryError("El lote ya no admite edición", 409);
    const batch = await tx.inventoryAdjustmentBatch.update({ where: { id: current.id }, data: { notes: parsed.data.notes, lines: { deleteMany: {}, create: parsed.data.lines.map((line) => ({ ...line, quantity: decimal(line.quantity) })) } }, include: adjustmentBatchInclude });
    return { status: 200, message: "Lote actualizado", data: adjustmentBatchDto(batch) };
  } }));
}));

router.post("/inventory/adjustment-batches/:id/approve", requirePosPermission("INVENTORY_ADJUST"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res); if (!key) return;
  await respondIdempotent(res, executePosIdempotent({ key, actorCredentialId: req.posUser!.credentialId, operation: `INVENTORY_BATCH_APPROVE:${req.params["id"]}`, payload: { id: req.params["id"] }, execute: async (tx) => {
    const { updated } = await applyAdjustmentBatch(tx, req, req.params["id"]!);
    return { status: 200, message: "Lote aplicado atómicamente", data: adjustmentBatchDto(updated) };
  } }));
}));

router.post("/inventory/adjustment-batches/:id/cancel", requirePosPermission("INVENTORY_ADJUST"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res); if (!key) return;
  await respondIdempotent(res, executePosIdempotent({ key, actorCredentialId: req.posUser!.credentialId, operation: `INVENTORY_BATCH_CANCEL:${req.params["id"]}`, payload: { id: req.params["id"] }, execute: async (tx) => {
    const batch = await reverseBatch(tx, req, req.params["id"]!);
    return { status: 200, message: batch.status === "CANCELED" ? "Lote cancelado sin impacto" : "Lote revertido mediante movimiento compensatorio", data: adjustmentBatchDto(batch) };
  } }));
}));

router.get("/inventory/counts", requirePosPermission("INVENTORY_VIEW"), asyncRoute(async (req, res) => {
  const parsed = z.object({ locationId: z.string().trim().min(1), businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kind: z.enum(["OPENING", "CLOSING"]).optional() }).strict().safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta de conteos inválida", data: parsed.error.flatten().fieldErrors });
  await findLocationForScope(req, parsed.data.locationId);
  const counts = await db.inventoryCount.findMany({ where: { locationId: parsed.data.locationId, businessDate: businessDateValue(parsed.data.businessDate), ...(parsed.data.kind ? { kind: parsed.data.kind } : {}) }, include: { lines: true }, orderBy: { creadoEn: "desc" } });
  const showAudit = auditAllowed(req);
  res.json({ success: true, message: "OK", data: counts.map((count) => ({
    id: count.id, kind: count.kind, businessDate: count.businessDate.toISOString().slice(0, 10), locationId: count.locationId, createdAt: count.creadoEn.toISOString(),
    ...(showAudit ? { notes: count.notes } : {}),
    lines: count.lines.map((line) => ({ itemId: line.itemId, countedQuantity: money(line.countedQuantity)!, matchesExpected: line.matchesExpected, ...(showAudit ? { expectedQuantity: money(line.expectedQuantity)!, differenceQuantity: money(line.differenceQuantity)!, unitCost: costsAllowed(req) ? money(line.unitCostSnapshot) : null } : {}) })),
  })) });
}));

router.post("/inventory/counts", requirePosPermission("INVENTORY_VIEW"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res); if (!key) return;
  const parsed = posInventoryCountRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Conteo inválido", data: parsed.error.flatten().fieldErrors });
  await findLocationForScope(req, parsed.data.locationId);
  if (new Set(parsed.data.lines.map((line) => line.itemId)).size !== parsed.data.lines.length) return res.status(400).json({ success: false, message: "El conteo contiene productos duplicados", data: null });
  const showAudit = auditAllowed(req);
  await respondIdempotent(res, executePosIdempotent({ key, actorCredentialId: req.posUser!.credentialId, operation: "INVENTORY_COUNT_CREATE", payload: parsed.data, execute: async (tx) => {
    const items = await tx.catalogItem.findMany({ where: { id: { in: parsed.data.lines.map((line) => line.itemId) }, kind: "PRODUCT", active: true, deletedAt: null }, select: { id: true, unitCost: true } });
    if (items.length !== parsed.data.lines.length) throw new PosInventoryError("El conteo contiene productos inválidos");
    const itemCosts = new Map(items.map((item) => [item.id, item.unitCost]));
    const balances = await tx.inventoryBalance.findMany({ where: { locationId: parsed.data.locationId, itemId: { in: parsed.data.lines.map((line) => line.itemId) } } });
    const expected = new Map(balances.map((balance) => [balance.itemId, balance.availableQuantity]));
    const count = await tx.inventoryCount.create({ data: {
      kind: parsed.data.kind, businessDate: businessDateValue(parsed.data.businessDate), locationId: parsed.data.locationId,
      notes: parsed.data.notes ?? null, createdByCredentialId: req.posUser!.credentialId, terminalId: req.posUser!.terminalId,
      lines: { create: parsed.data.lines.map((line) => {
        const expectedQuantity = expected.get(line.itemId) ?? new Prisma.Decimal(0);
        const counted = decimal(line.countedQuantity); const difference = counted.minus(expectedQuantity);
        return { itemId: line.itemId, countedQuantity: counted, expectedQuantity, differenceQuantity: difference, unitCostSnapshot: itemCosts.get(line.itemId) ?? null, matchesExpected: difference.isZero() };
      }) },
    }, include: { lines: true } });
    const differences = count.lines.filter((line) => !line.matchesExpected);
    if (differences.length) await createInventoryLedgerMovement(tx, {
      type: "COUNT_ADJUSTMENT", reason: `${parsed.data.kind}_COUNT`, notes: parsed.data.notes ?? null, businessDate: parsed.data.businessDate,
      actorCredentialId: req.posUser!.credentialId, terminalId: req.posUser!.terminalId, countId: count.id,
      lines: differences.map((line) => ({
        itemId: line.itemId,
        fromLocationId: line.differenceQuantity.isNegative() ? count.locationId : null,
        toLocationId: line.differenceQuantity.isPositive() ? count.locationId : null,
        quantity: line.differenceQuantity.abs(), unitCostSnapshot: line.unitCostSnapshot,
      })),
    });
    const base = { id: count.id, kind: count.kind, businessDate: count.businessDate.toISOString().slice(0, 10), locationId: count.locationId, createdAt: count.creadoEn.toISOString() };
    const lines = count.lines.map((line) => ({ itemId: line.itemId, countedQuantity: money(line.countedQuantity)!, matchesExpected: line.matchesExpected,
      ...(showAudit ? { expectedQuantity: money(line.expectedQuantity)!, differenceQuantity: money(line.differenceQuantity)!, unitCost: costsAllowed(req) ? money(line.unitCostSnapshot) : null } : {}),
    }));
    return { status: 201, message: "Conteo registrado; las diferencias se compensaron en el ledger", data: { ...base, ...(showAudit ? { notes: count.notes } : {}), lines } };
  } }));
}));

async function hydratedWarehouseRequest(id: string, tx: Prisma.TransactionClient | typeof db = db) {
  const request = await tx.warehouseRequest.findUnique({ where: { id }, include: warehouseRequestInclude });
  if (!request) throw new PosInventoryError("Solicitud no encontrada", 404);
  const [branch, supplier] = await Promise.all([
    request.branchId ? tx.sucursal.findUnique({ where: { id: request.branchId }, select: { nombre: true } }) : null,
    request.supplierId ? tx.posSupplier.findUnique({ where: { id: request.supplierId }, select: { businessName: true } }) : null,
  ]);
  return Object.assign(request, { branchName: branch?.nombre ?? null, supplierName: supplier?.businessName ?? null });
}

async function warehouseNotification(tx: Prisma.TransactionClient, input: {
  kind: "WAREHOUSE_REQUESTED" | "WAREHOUSE_CREATION_APPROVED" | "WAREHOUSE_SHIPPED" | "WAREHOUSE_RECEIVED" | "WAREHOUSE_RETURNED" | "WAREHOUSE_CANCELED";
  requestId: string; folio: string; message: string; branchId: string | null; audiencePermission: "WAREHOUSE_MANAGE" | "WAREHOUSE_BRANCH_REQUEST"; actorCredentialId: string;
}) {
  await tx.posNotification.create({ data: {
    kind: input.kind, title: `${input.folio} · ${input.message}`, message: input.message,
    branchId: input.branchId, audiencePermission: input.audiencePermission,
    warehouseRequestId: input.requestId, createdByCredentialId: input.actorCredentialId,
  } });
}

router.get("/warehouse/requests", requireWarehouseAccess, asyncRoute(async (req, res) => {
  const parsed = posInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  const where: Prisma.WarehouseRequestWhereInput = warehouseAllowed(req) ? {} : { branchId: req.posUser!.branchId };
  const [requests, total] = await Promise.all([
    db.warehouseRequest.findMany({ where, include: warehouseRequestInclude, orderBy: { creadoEn: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize }),
    db.warehouseRequest.count({ where }),
  ]);
  const names = await Promise.all(requests.map(async (request) => {
    const [branch, supplier] = await Promise.all([
      request.branchId ? db.sucursal.findUnique({ where: { id: request.branchId }, select: { nombre: true } }) : null,
      request.supplierId ? db.posSupplier.findUnique({ where: { id: request.supplierId }, select: { businessName: true } }) : null,
    ]);
    return warehouseRequestDto(Object.assign(request, { branchName: branch?.nombre ?? null, supplierName: supplier?.businessName ?? null }), costsAllowed(req));
  }));
  res.json({ success: true, message: "OK", data: { items: names, page: parsed.data.page, pageSize: parsed.data.pageSize, total } });
}));

router.post("/warehouse/requests", requireWarehouseAccess, asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res); if (!key) return;
  const parsed = posWarehouseRequestWriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Solicitud inválida", data: parsed.error.flatten().fieldErrors });
  const input = parsed.data;
  if (input.source === "SUPPLIER" && !warehouseAllowed(req)) return res.status(403).json({ success: false, message: "El resurtido requiere administración de bodega", data: null });
  if (input.source === "BRANCH" && !warehouseAllowed(req) && input.branchId !== req.posUser!.branchId) return res.status(403).json({ success: false, message: "Sucursal fuera del alcance de la terminal", data: null });
  await respondIdempotent(res, executePosIdempotent({ key, actorCredentialId: req.posUser!.credentialId, operation: "WAREHOUSE_REQUEST_CREATE", payload: input, execute: async (tx) => {
    const matrix = await tx.inventoryLocation.findFirst({ where: { type: "WAREHOUSE", active: true } });
    const branchLocation = input.branchId ? await tx.inventoryLocation.findFirst({ where: { branchId: input.branchId, active: true } }) : null;
    if (!matrix || (input.source === "BRANCH" && !branchLocation)) throw new PosInventoryError("No están configuradas las ubicaciones requeridas", 409);
    if (input.supplierId && !await tx.posSupplier.findFirst({ where: { id: input.supplierId, active: true, deletedAt: null } })) throw new PosInventoryError("Proveedor inválido");
    const catalogItems = await tx.catalogItem.findMany({ where: { id: { in: input.lines.map((line) => line.itemId) }, active: true, deletedAt: null }, select: { id: true, name: true, sku: true, kind: true, unitCost: true, supplierId: true } });
    const expectedKinds = input.requestType === "SUPPLY" ? ["SUPPLY"] : ["PRODUCT"];
    if (catalogItems.length !== input.lines.length || catalogItems.some((item) => !expectedKinds.includes(item.kind)) || (input.source === "SUPPLIER" && catalogItems.some((item) => item.supplierId !== input.supplierId))) throw new PosInventoryError("La solicitud contiene artículos inválidos para su tipo o proveedor");
    const priceList = input.priceListId ? await tx.posPriceList.findFirst({ where: { id: input.priceListId, status: "ACTIVE", deletedAt: null }, include: { lines: true, branchAssignments: true, customerAssignments: true } }) : null;
    if (input.priceListId && !priceList) throw new PosInventoryError("Lista de precios inválida");
    if (priceList && input.branchId && !priceList.branchAssignments.some((assignment) => assignment.branchId === input.branchId)) throw new PosInventoryError("La lista de precios no aplica a la sucursal");
    if (priceList && priceList.customerAssignments.length > 0 && (!input.customerId || !priceList.customerAssignments.some((assignment) => assignment.customerId === input.customerId))) throw new PosInventoryError("La lista de precios no aplica al cliente");
    const customer = input.customerId ? await tx.customer.findFirst({ where: { id: input.customerId, active: true, deletedAt: null }, select: { displayName: true } }) : null;
    if (input.customerId && !customer) throw new PosInventoryError("Cliente inválido");
    const itemMap = new Map(catalogItems.map((item) => [item.id, item]));
    const request = await tx.warehouseRequest.create({ data: {
      folio: await nextPosFolio(tx, "WarehouseRequestFolioSeq", input.source === "SUPPLIER" ? "ALM-RES" : input.requestType === "PRODUCT" ? "ALM-PRO" : input.requestType === "TESTER" ? "ALM-TST" : "ALM-INS"),
      source: input.source, requestType: input.requestType, branchId: input.branchId, supplierId: input.supplierId,
      priceListId: input.priceListId, customerId: input.customerId, sourceLocationId: input.source === "BRANCH" ? matrix.id : null,
      destinationLocationId: input.source === "BRANCH" ? branchLocation!.id : matrix.id, notes: input.notes,
      createdByCredentialId: req.posUser!.credentialId,
      lines: { create: input.lines.map((line) => {
        const item = itemMap.get(line.itemId)!; const price = priceList?.lines.find((candidate) => candidate.itemId === line.itemId);
        return { itemId: line.itemId, quantity: decimal(line.quantity), itemNameSnapshot: item.name, skuSnapshot: item.sku, unitCostSnapshot: item.unitCost, priceSnapshot: price?.price ?? null, priceListNameSnapshot: priceList?.name ?? null, customerNameSnapshot: customer?.displayName ?? null };
      }) },
      events: { create: { fromStatus: null, toStatus: "REQUESTED", action: "CREATE", actorCredentialId: req.posUser!.credentialId, notes: input.notes } },
    } });
    await warehouseNotification(tx, { kind: "WAREHOUSE_REQUESTED", requestId: request.id, folio: request.folio, message: "Nueva solicitud pendiente", branchId: null, audiencePermission: "WAREHOUSE_MANAGE", actorCredentialId: req.posUser!.credentialId });
    return { status: 201, message: "Solicitud creada; no se modificaron existencias", data: warehouseRequestDto(await hydratedWarehouseRequest(request.id, tx), costsAllowed(req)) };
  } }));
}));

async function warehouseAction(req: Request, res: Response, action: "approve-creation" | "approve-send" | "receive" | "return-to-requested" | "cancel") {
  const key = idempotencyKey(req, res); if (!key) return;
  const parsed = posWarehouseActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Acción inválida", data: parsed.error.flatten().fieldErrors });
  if (["approve-creation", "approve-send"].includes(action) && !warehouseAllowed(req)) return res.status(403).json({ success: false, message: "La acción requiere administración de bodega", data: null });
  await respondIdempotent(res, executePosIdempotent({ key, actorCredentialId: req.posUser!.credentialId, operation: `WAREHOUSE_${action.toUpperCase()}:${req.params["id"]}`, payload: parsed.data, execute: async (tx) => {
    const request = await tx.warehouseRequest.findUnique({ where: { id: req.params["id"]! }, include: warehouseRequestInclude });
    if (!request) throw new PosInventoryError("Solicitud no encontrada", 404);
    if (!warehouseAllowed(req) && request.branchId !== req.posUser!.branchId) throw new PosInventoryError("Solicitud fuera del alcance de la terminal", 403);
    let fromStatus: WarehouseRequestStatus = request.status;
    let toStatus: WarehouseRequestStatus;
    let notificationKind: "WAREHOUSE_CREATION_APPROVED" | "WAREHOUSE_SHIPPED" | "WAREHOUSE_RECEIVED" | "WAREHOUSE_RETURNED" | "WAREHOUSE_CANCELED";
    let notificationMessage: string;
    let update: Prisma.WarehouseRequestUncheckedUpdateInput;
    if (action === "approve-creation") {
      if (request.status !== "REQUESTED") throw new PosInventoryError("La solicitud no espera primera aprobación", 409);
      toStatus = "CREATION_APPROVED"; notificationKind = "WAREHOUSE_CREATION_APPROVED"; notificationMessage = "Primera aprobación registrada";
      update = { status: toStatus, creationApprovedByCredentialId: req.posUser!.credentialId, creationApprovedAt: new Date() };
    } else if (action === "approve-send") {
      if (request.status !== "CREATION_APPROVED") throw new PosInventoryError("La solicitud no espera segunda aprobación", 409);
      if (request.creationApprovedByCredentialId === req.posUser!.credentialId) throw new PosInventoryError("La segunda aprobación debe pertenecer a otro actor", 409);
      if (request.source === "BRANCH") {
        const items = await tx.catalogItem.findMany({ where: { id: { in: request.lines.map((line) => line.itemId) } }, select: { id: true, unitCost: true } });
        const itemCosts = new Map(items.map((item) => [item.id, item.unitCost]));
        await createInventoryLedgerMovement(tx, { type: "WAREHOUSE_SHIPMENT", reason: request.folio, notes: parsed.data.notes, businessDate: businessDateNow(), actorCredentialId: req.posUser!.credentialId, terminalId: req.posUser!.terminalId, warehouseRequestId: request.id,
          lines: request.lines.map((line) => ({ itemId: line.itemId, fromLocationId: request.sourceLocationId, toLocationId: null, quantity: line.quantity, unitCostSnapshot: itemCosts.get(line.itemId) ?? line.unitCostSnapshot, requireSourceStock: true })),
        });
      }
      toStatus = "SHIPPED"; notificationKind = "WAREHOUSE_SHIPPED"; notificationMessage = request.source === "SUPPLIER" ? "Resurtido autorizado y enviado al proveedor" : "Solicitud aprobada y enviada";
      update = { status: toStatus, sendApprovedByCredentialId: req.posUser!.credentialId, sendApprovedAt: new Date(), shippedAt: new Date() };
      await tx.warehouseRequestEvent.create({ data: { requestId: request.id, fromStatus, toStatus: "SEND_APPROVED", action: "APPROVE_SEND", actorCredentialId: req.posUser!.credentialId, notes: parsed.data.notes } });
      fromStatus = "SEND_APPROVED";
    } else if (action === "receive") {
      if (request.status !== "SHIPPED") throw new PosInventoryError("La solicitud no está enviada", 409);
      const addsInventory = request.source === "SUPPLIER" || request.requestType === "PRODUCT";
      if (addsInventory) await createInventoryLedgerMovement(tx, {
        type: request.source === "SUPPLIER" ? "SUPPLIER_RECEIPT" : "WAREHOUSE_RECEIPT", reason: request.folio, notes: parsed.data.notes, businessDate: businessDateNow(), actorCredentialId: req.posUser!.credentialId, terminalId: req.posUser!.terminalId, warehouseRequestId: request.id,
        lines: request.lines.map((line) => ({ itemId: line.itemId, fromLocationId: null, toLocationId: request.destinationLocationId, quantity: line.quantity, unitCostSnapshot: line.unitCostSnapshot })),
      });
      toStatus = "RECEIVED"; notificationKind = "WAREHOUSE_RECEIVED"; notificationMessage = addsInventory ? "Recepción aplicada al inventario" : "Consumo operativo recibido sin sumar inventario vendible";
      update = { status: toStatus, receivedByCredentialId: req.posUser!.credentialId, receivedAt: new Date() };
    } else if (action === "return-to-requested") {
      if (!["SEND_APPROVED", "SHIPPED"].includes(request.status)) throw new PosInventoryError("La solicitud no puede regresar a pedidos", 409);
      if (request.status === "SHIPPED" && request.source === "BRANCH") {
        const original = await tx.inventoryMovement.findFirst({ where: { warehouseRequestId: request.id, type: "WAREHOUSE_SHIPMENT", status: "APPLIED" }, include: movementInclude, orderBy: { creadoEn: "desc" } });
        if (!original) throw new PosInventoryError("No se encontró el envío para revertir", 409);
        await createInventoryLedgerMovement(tx, { type: "REVERSAL", reason: `RETORNO_${request.folio}`, notes: parsed.data.notes, businessDate: businessDateNow(), actorCredentialId: req.posUser!.credentialId, terminalId: req.posUser!.terminalId, warehouseRequestId: request.id, reversalOfId: original.id,
          lines: original.lines.map((line) => ({ itemId: line.itemId, fromLocationId: null, toLocationId: line.fromLocationId, quantity: line.quantity, unitCostSnapshot: line.unitCostSnapshot })),
        });
        await tx.inventoryMovement.update({ where: { id: original.id }, data: { status: "REVERSED" } });
      }
      toStatus = "REQUESTED"; notificationKind = "WAREHOUSE_RETURNED"; notificationMessage = "Envío regresado a pedidos; existencias restauradas";
      update = { status: toStatus, creationApprovedByCredentialId: null, creationApprovedAt: null, sendApprovedByCredentialId: null, sendApprovedAt: null, shippedAt: null };
    } else {
      if (!["REQUESTED", "CREATION_APPROVED"].includes(request.status)) throw new PosInventoryError("La solicitud ya no puede cancelarse; use retorno", 409);
      toStatus = "CANCELED"; notificationKind = "WAREHOUSE_CANCELED"; notificationMessage = "Solicitud cancelada sin impacto pendiente";
      update = { status: toStatus, canceledByCredentialId: req.posUser!.credentialId, canceledAt: new Date() };
    }
    await tx.warehouseRequest.update({ where: { id: request.id }, data: update });
    await tx.warehouseRequestEvent.create({ data: { requestId: request.id, fromStatus, toStatus, action: action.toUpperCase(), actorCredentialId: req.posUser!.credentialId, notes: parsed.data.notes } });
    await warehouseNotification(tx, { kind: notificationKind, requestId: request.id, folio: request.folio, message: notificationMessage, branchId: request.branchId, audiencePermission: request.branchId ? "WAREHOUSE_BRANCH_REQUEST" : "WAREHOUSE_MANAGE", actorCredentialId: req.posUser!.credentialId });
    return { status: 200, message: notificationMessage, data: warehouseRequestDto(await hydratedWarehouseRequest(request.id, tx), costsAllowed(req)) };
  } }));
}

router.post("/warehouse/requests/:id/approve-creation", requirePosPermission("WAREHOUSE_MANAGE"), asyncRoute((req, res) => warehouseAction(req, res, "approve-creation")));
router.post("/warehouse/requests/:id/approve-send", requirePosPermission("WAREHOUSE_MANAGE"), asyncRoute((req, res) => warehouseAction(req, res, "approve-send")));
router.post("/warehouse/requests/:id/receive", requireWarehouseAccess, asyncRoute((req, res) => warehouseAction(req, res, "receive")));
router.post("/warehouse/requests/:id/return-to-requested", requirePosPermission("WAREHOUSE_MANAGE"), asyncRoute((req, res) => warehouseAction(req, res, "return-to-requested")));
router.post("/warehouse/requests/:id/cancel", requireWarehouseAccess, asyncRoute((req, res) => warehouseAction(req, res, "cancel")));

router.get("/notifications", asyncRoute(async (req, res) => {
  const parsed = posNotificationQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  const allowedPermissions = req.posUser!.isMaster ? undefined : req.posUser!.permissions;
  const where: Prisma.PosNotificationWhereInput = {
    AND: [
      { OR: [{ branchId: null }, { branchId: req.posUser!.branchId }] },
      ...(allowedPermissions ? [{ OR: [{ audiencePermission: null }, { audiencePermission: { in: allowedPermissions } }] }] : []),
      ...(parsed.data.unreadOnly === "true" ? [{ reads: { none: { credentialId: req.posUser!.credentialId } } }] : []),
    ],
  };
  const [items, total] = await Promise.all([
    db.posNotification.findMany({ where, include: { reads: { where: { credentialId: req.posUser!.credentialId } } }, orderBy: { creadoEn: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize }),
    db.posNotification.count({ where }),
  ]);
  res.json({ success: true, message: "OK", data: { items: items.map((item) => ({ id: item.id, kind: item.kind, title: item.title, message: item.message, branchId: item.branchId, warehouseRequestId: item.warehouseRequestId, read: item.reads.length > 0, readAt: item.reads[0]?.readAt.toISOString() ?? null, createdAt: item.creadoEn.toISOString() })), page: parsed.data.page, pageSize: parsed.data.pageSize, total } });
}));

router.put("/notifications/:id/read", asyncRoute(async (req, res) => {
  const notification = await db.posNotification.findFirst({ where: {
    id: req.params["id"]!,
    AND: [
      { OR: [{ branchId: null }, { branchId: req.posUser!.branchId }] },
      ...(req.posUser!.isMaster ? [] : [{ OR: [{ audiencePermission: null }, { audiencePermission: { in: req.posUser!.permissions } }] }]),
    ],
  } });
  if (!notification) return res.status(404).json({ success: false, message: "Notificación no encontrada", data: null });
  const read = await db.posNotificationRead.upsert({ where: { notificationId_credentialId: { notificationId: notification.id, credentialId: req.posUser!.credentialId } }, create: { notificationId: notification.id, credentialId: req.posUser!.credentialId }, update: {} });
  res.json({ success: true, message: "Notificación leída", data: { notificationId: notification.id, readAt: read.readAt.toISOString() } });
}));

router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof PosInventoryError) return res.status(error.status).json({ success: false, message: error.message, data: null });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return res.status(409).json({ success: false, message: "La operación ya existe o cambió concurrentemente", data: null });
  next(error);
});

export default router;
