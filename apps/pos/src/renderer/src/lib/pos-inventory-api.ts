import type {
  PosInventoryAdjustmentBatchDto,
  PosInventoryLocationDto,
  PosInventoryMovementDto,
  PosWarehouseRequestDto,
} from "@cosmetics/types";
import type {
  InventoryAdjustmentBatch,
  InventoryMovement,
  InventoryMovementCategory,
  InventoryMovementDirection,
  WarehouseMovement,
  WarehouseMovementLine,
  WarehouseMovementStatus,
} from "../types";

const dateTime = (iso: string) => new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City",
}).format(new Date(iso));

const directionFor = (line: PosInventoryMovementDto["lines"][number]): InventoryMovementDirection =>
  line.fromLocation && line.toLocation ? "TRANSFER" : line.fromLocation ? "REMOVE" : "ADD";

const categoryFor = (type: PosInventoryMovementDto["type"]): InventoryMovementCategory => {
  if (type === "RETURN") return "RETURN";
  if (type === "DEMO") return "DEMO";
  if (type === "WRITE_OFF") return "WRITE_OFF";
  if (["TRANSFER", "WAREHOUSE_SHIPMENT", "WAREHOUSE_RECEIPT", "SUPPLIER_RECEIPT"].includes(type)) return "TRANSFER";
  return "ADJUSTMENT";
};

export const inventoryMovementsFromDto = (items: PosInventoryMovementDto[]): InventoryMovement[] =>
  items.flatMap((movement) => movement.lines.map((line) => {
    const unitCost = Number("unitCostSnapshot" in line ? line.unitCostSnapshot ?? "0.00" : "0.00");
    return {
      id: `${movement.id}:${line.id}`,
      folio: movement.folio,
      createdAt: dateTime(movement.createdAt),
      createdAtIso: movement.createdAt,
      productId: line.itemId,
      productName: line.itemName,
      direction: directionFor(line),
      reason: movement.reason ?? movement.type,
      quantity: Number(line.quantity),
      previousStock: Number(line.fromQuantityBefore ?? line.toQuantityBefore ?? "0.00"),
      newStock: Number(line.fromQuantityAfter ?? line.toQuantityAfter ?? "0.00"),
      sourceBranch: line.fromLocation?.branchName ?? line.fromLocation?.name ?? "Entrada externa",
      destinationBranch: line.toLocation?.branchName ?? line.toLocation?.name ?? null,
      destinationPreviousStock: line.toQuantityBefore === null ? null : Number(line.toQuantityBefore),
      destinationNewStock: line.toQuantityAfter === null ? null : Number(line.toQuantityAfter),
      comment: movement.notes ?? "",
      category: categoryFor(movement.type),
      unitCostUsd: 0,
      unitCostMxn: unitCost,
      totalCostUsd: 0,
      totalCostMxn: unitCost * Number(line.quantity),
      approvalBatchId: movement.adjustmentBatchId,
      reversalOfMovementId: movement.reversalOfId,
    };
  }));

export const adjustmentBatchFromDto = (
  batch: PosInventoryAdjustmentBatchDto,
  locations: PosInventoryLocationDto[],
): InventoryAdjustmentBatch => {
  const names = new Map(locations.map((location) => [location.id, location.branchName ?? location.name]));
  return {
    id: batch.id,
    folio: batch.folio,
    createdAt: dateTime(batch.createdAt),
    createdAtIso: batch.createdAt,
    status: batch.status === "APPLIED" ? "APPROVED" : batch.status === "CANCELED" ? "CANCELLED" : batch.status,
    resolvedAt: batch.resolvedAt ? dateTime(batch.resolvedAt) : null,
    adjustments: batch.lines.map((line) => ({
      productId: line.itemId,
      direction: line.type === "ADD" ? "ADD" : ["TRANSFER", "RETURN"].includes(line.type) ? "TRANSFER" : "REMOVE",
      reason: line.reason ?? line.type,
      quantity: Number(line.quantity),
      sourceBranch: line.fromLocationId ? names.get(line.fromLocationId) ?? "" : "",
      destinationBranch: line.toLocationId ? names.get(line.toLocationId) ?? null : null,
      comment: line.notes ?? "",
      settlementOwedProductId: null,
    })),
  };
};

const warehouseStatus = (status: PosWarehouseRequestDto["status"]): WarehouseMovementStatus => {
  if (status === "SHIPPED" || status === "SEND_APPROVED") return "SENT";
  if (status === "CANCELED") return "CANCELLED";
  return status;
};

export const warehouseMovementFromDto = (request: PosWarehouseRequestDto): WarehouseMovement => {
  const first = request.lines[0];
  const lines: WarehouseMovementLine[] = request.lines.map((line) => ({
    productId: line.itemId,
    productName: line.itemName,
    sku: line.sku,
    itemType: request.requestType === "SUPPLY" ? "SUPPLY" : "PRODUCT",
    quantity: Number(line.quantity),
    unitCostUsd: 0,
    unitCostMxn: Number("unitCostSnapshot" in line ? line.unitCostSnapshot ?? "0.00" : "0.00"),
    partnerCost: Number(line.priceSnapshot ?? "0.00"),
    retailPrice: Number(line.priceSnapshot ?? "0.00"),
  }));
  const creation = request.events.find((event) => event.action === "APPROVE-CREATION" || event.action === "APPROVE_CREATION");
  const send = request.events.find((event) => event.action === "APPROVE-SEND" || event.action === "APPROVE_SEND");
  const receive = request.events.find((event) => event.action === "RECEIVE");
  const cancel = request.events.find((event) => event.action === "CANCEL");
  const returned = request.events.find((event) => event.action === "RETURN-TO-REQUESTED" || event.action === "RETURN_TO_REQUESTED");
  return {
    id: request.id,
    folio: request.folio,
    kind: request.source === "SUPPLIER" ? "PURCHASE_ORDER" : "BRANCH_REQUEST",
    requestType: request.requestType,
    priceListId: request.priceListId,
    priceListName: first?.priceListNameSnapshot ?? null,
    customerId: request.customerId,
    customerName: first?.customerNameSnapshot ?? null,
    supplierId: request.supplierId,
    supplierName: request.supplierName,
    categoryId: request.requestType === "PRODUCT" ? "warehouse-products" : request.requestType === "TESTER" ? "warehouse-testers" : "warehouse-supplies",
    categoryLabel: request.requestType === "PRODUCT" ? "Envíos de producto" : request.requestType === "TESTER" ? "Envíos de tester" : "Envíos de insumos",
    destinationBranch: request.branchName,
    status: warehouseStatus(request.status),
    lines,
    comment: request.notes ?? "",
    createdAtIso: request.createdAt,
    createdByName: request.events[0]?.actorCredentialId ?? "POS",
    creationApprovedAtIso: request.creationApprovedAt,
    creationApprovedByName: creation?.actorCredentialId ?? null,
    sentAtIso: request.shippedAt,
    sentByName: send?.actorCredentialId ?? null,
    receivedAtIso: request.receivedAt,
    receivedByName: receive?.actorCredentialId ?? null,
    cancelledAtIso: request.canceledAt,
    cancelledByName: cancel?.actorCredentialId ?? null,
    returnedToOrdersAtIso: returned?.createdAt ?? null,
    returnedToOrdersByName: returned?.actorCredentialId ?? null,
  };
};
