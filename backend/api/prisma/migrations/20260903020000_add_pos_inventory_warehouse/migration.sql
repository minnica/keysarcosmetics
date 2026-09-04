-- Fase 3 POS: inventario, conteos, bodega matriz y notificaciones.
-- Migración aditiva: no elimina ni transforma ventas o datos legacy.

CREATE TYPE "InventoryLocationType" AS ENUM ('BRANCH', 'WAREHOUSE');
CREATE TYPE "InventoryMovementType" AS ENUM ('ADD', 'REMOVE', 'TRANSFER', 'RETURN', 'DEMO', 'WRITE_OFF', 'REVERSAL', 'COUNT_ADJUSTMENT', 'WAREHOUSE_SHIPMENT', 'WAREHOUSE_RECEIPT', 'SUPPLIER_RECEIPT');
CREATE TYPE "InventoryMovementStatus" AS ENUM ('APPLIED', 'REVERSED');
CREATE TYPE "InventoryAdjustmentBatchStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELED', 'REVERSED');
CREATE TYPE "InventoryCountKind" AS ENUM ('OPENING', 'CLOSING');
CREATE TYPE "WarehouseRequestType" AS ENUM ('PRODUCT', 'TESTER', 'SUPPLY');
CREATE TYPE "WarehouseRequestSource" AS ENUM ('BRANCH', 'SUPPLIER');
CREATE TYPE "WarehouseRequestStatus" AS ENUM ('REQUESTED', 'CREATION_APPROVED', 'SEND_APPROVED', 'SHIPPED', 'RECEIVED', 'CANCELED');
CREATE TYPE "PosNotificationKind" AS ENUM ('WAREHOUSE_REQUESTED', 'WAREHOUSE_CREATION_APPROVED', 'WAREHOUSE_SHIPPED', 'WAREHOUSE_RECEIVED', 'WAREHOUSE_RETURNED', 'WAREHOUSE_CANCELED');

CREATE SEQUENCE "InventoryMovementFolioSeq";
CREATE SEQUENCE "InventoryAdjustmentFolioSeq";
CREATE SEQUENCE "WarehouseRequestFolioSeq";

CREATE TABLE "PosIdempotencyRecord" (
  "id" TEXT NOT NULL,
  "key" UUID NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "operation" VARCHAR(120) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "responseStatus" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryLocation" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "type" "InventoryLocationType" NOT NULL,
  "branchId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryLocation_scope_check" CHECK (
    ("type" = 'BRANCH' AND "branchId" IS NOT NULL) OR
    ("type" = 'WAREHOUSE' AND "branchId" IS NULL)
  )
);

CREATE TABLE "InventoryBalance" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "availableQuantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "reservedQuantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryBalance_reserved_check" CHECK ("reservedQuantity" >= 0)
);

CREATE TABLE "InventoryAdjustmentBatch" (
  "id" TEXT NOT NULL,
  "folio" VARCHAR(64) NOT NULL,
  "status" "InventoryAdjustmentBatchStatus" NOT NULL DEFAULT 'PENDING',
  "notes" VARCHAR(1000),
  "createdByCredentialId" TEXT NOT NULL,
  "resolvedByCredentialId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryAdjustmentBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryAdjustmentBatchLine" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "quantity" DECIMAL(14,2) NOT NULL,
  "reason" VARCHAR(240),
  "notes" VARCHAR(1000),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryAdjustmentBatchLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryAdjustmentBatchLine_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "InventoryAdjustmentBatchLine_route_check" CHECK (
    ("type" = 'ADD' AND "fromLocationId" IS NULL AND "toLocationId" IS NOT NULL) OR
    ("type" IN ('REMOVE', 'DEMO', 'WRITE_OFF') AND "fromLocationId" IS NOT NULL AND "toLocationId" IS NULL) OR
    ("type" IN ('TRANSFER', 'RETURN') AND "fromLocationId" IS NOT NULL AND "toLocationId" IS NOT NULL AND "fromLocationId" <> "toLocationId")
  )
);

CREATE TABLE "InventoryCount" (
  "id" TEXT NOT NULL,
  "kind" "InventoryCountKind" NOT NULL,
  "businessDate" DATE NOT NULL,
  "locationId" TEXT NOT NULL,
  "notes" VARCHAR(500),
  "createdByCredentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseRequest" (
  "id" TEXT NOT NULL,
  "folio" VARCHAR(64) NOT NULL,
  "source" "WarehouseRequestSource" NOT NULL,
  "requestType" "WarehouseRequestType" NOT NULL,
  "status" "WarehouseRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "branchId" TEXT,
  "supplierId" TEXT,
  "priceListId" TEXT,
  "customerId" TEXT,
  "sourceLocationId" TEXT,
  "destinationLocationId" TEXT NOT NULL,
  "notes" VARCHAR(1000),
  "createdByCredentialId" TEXT NOT NULL,
  "creationApprovedByCredentialId" TEXT,
  "creationApprovedAt" TIMESTAMP(3),
  "sendApprovedByCredentialId" TEXT,
  "sendApprovedAt" TIMESTAMP(3),
  "shippedAt" TIMESTAMP(3),
  "receivedByCredentialId" TEXT,
  "receivedAt" TIMESTAMP(3),
  "canceledByCredentialId" TEXT,
  "canceledAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseRequest_source_check" CHECK (
    ("source" = 'BRANCH' AND "branchId" IS NOT NULL AND "supplierId" IS NULL AND "sourceLocationId" IS NOT NULL) OR
    ("source" = 'SUPPLIER' AND "branchId" IS NULL AND "supplierId" IS NOT NULL AND "sourceLocationId" IS NULL)
  ),
  CONSTRAINT "WarehouseRequest_distinct_approvers_check" CHECK (
    "sendApprovedByCredentialId" IS NULL OR
    "creationApprovedByCredentialId" IS NULL OR
    "sendApprovedByCredentialId" <> "creationApprovedByCredentialId"
  )
);

CREATE TABLE "WarehouseRequestLine" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "itemNameSnapshot" VARCHAR(240) NOT NULL,
  "skuSnapshot" VARCHAR(96) NOT NULL,
  "unitCostSnapshot" DECIMAL(14,2),
  "priceSnapshot" DECIMAL(14,2),
  "priceListNameSnapshot" VARCHAR(160),
  "customerNameSnapshot" VARCHAR(240),
  CONSTRAINT "WarehouseRequestLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseRequestLine_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "WarehouseRequestEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "fromStatus" "WarehouseRequestStatus",
  "toStatus" "WarehouseRequestStatus" NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "notes" VARCHAR(1000),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "folio" VARCHAR(64) NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "status" "InventoryMovementStatus" NOT NULL DEFAULT 'APPLIED',
  "reason" VARCHAR(240),
  "notes" VARCHAR(1000),
  "businessDate" DATE NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "adjustmentBatchId" TEXT,
  "warehouseRequestId" TEXT,
  "countId" TEXT,
  "reversalOfId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovementLine" (
  "id" TEXT NOT NULL,
  "movementId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "quantity" DECIMAL(14,2) NOT NULL,
  "fromQuantityBefore" DECIMAL(14,2),
  "fromQuantityAfter" DECIMAL(14,2),
  "toQuantityBefore" DECIMAL(14,2),
  "toQuantityAfter" DECIMAL(14,2),
  "unitCostSnapshot" DECIMAL(14,2),
  "metadata" JSONB,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovementLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovementLine_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "InventoryMovementLine_location_check" CHECK ("fromLocationId" IS NOT NULL OR "toLocationId" IS NOT NULL)
);

CREATE TABLE "InventoryCountLine" (
  "id" TEXT NOT NULL,
  "countId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "countedQuantity" DECIMAL(14,2) NOT NULL,
  "expectedQuantity" DECIMAL(14,2) NOT NULL,
  "differenceQuantity" DECIMAL(14,2) NOT NULL,
  "unitCostSnapshot" DECIMAL(14,2),
  "matchesExpected" BOOLEAN NOT NULL,
  CONSTRAINT "InventoryCountLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryCountLine_quantity_check" CHECK ("countedQuantity" >= 0)
);

CREATE TABLE "PosNotification" (
  "id" TEXT NOT NULL,
  "kind" "PosNotificationKind" NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "branchId" TEXT,
  "audiencePermission" VARCHAR(80),
  "warehouseRequestId" TEXT,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosNotificationRead" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosNotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosIdempotencyRecord_key_key" ON "PosIdempotencyRecord"("key");
CREATE INDEX "PosIdempotencyRecord_actorCredentialId_creadoEn_idx" ON "PosIdempotencyRecord"("actorCredentialId", "creadoEn");
CREATE UNIQUE INDEX "InventoryLocation_code_key" ON "InventoryLocation"("code");
CREATE UNIQUE INDEX "InventoryLocation_branchId_key" ON "InventoryLocation"("branchId");
CREATE UNIQUE INDEX "InventoryLocation_single_warehouse_idx" ON "InventoryLocation"("type") WHERE "type" = 'WAREHOUSE';
CREATE INDEX "InventoryLocation_type_active_idx" ON "InventoryLocation"("type", "active");
CREATE UNIQUE INDEX "InventoryBalance_locationId_itemId_key" ON "InventoryBalance"("locationId", "itemId");
CREATE INDEX "InventoryBalance_itemId_idx" ON "InventoryBalance"("itemId");
CREATE UNIQUE INDEX "InventoryAdjustmentBatch_folio_key" ON "InventoryAdjustmentBatch"("folio");
CREATE INDEX "InventoryAdjustmentBatch_status_creadoEn_idx" ON "InventoryAdjustmentBatch"("status", "creadoEn");
CREATE INDEX "InventoryAdjustmentBatchLine_batchId_idx" ON "InventoryAdjustmentBatchLine"("batchId");
CREATE UNIQUE INDEX "InventoryCount_locationId_businessDate_kind_key" ON "InventoryCount"("locationId", "businessDate", "kind");
CREATE INDEX "InventoryCount_businessDate_kind_idx" ON "InventoryCount"("businessDate", "kind");
CREATE UNIQUE INDEX "WarehouseRequest_folio_key" ON "WarehouseRequest"("folio");
CREATE INDEX "WarehouseRequest_status_creadoEn_idx" ON "WarehouseRequest"("status", "creadoEn");
CREATE INDEX "WarehouseRequest_branchId_status_idx" ON "WarehouseRequest"("branchId", "status");
CREATE INDEX "WarehouseRequest_supplierId_status_idx" ON "WarehouseRequest"("supplierId", "status");
CREATE UNIQUE INDEX "WarehouseRequestLine_requestId_itemId_key" ON "WarehouseRequestLine"("requestId", "itemId");
CREATE INDEX "WarehouseRequestEvent_requestId_creadoEn_idx" ON "WarehouseRequestEvent"("requestId", "creadoEn");
CREATE UNIQUE INDEX "InventoryMovement_folio_key" ON "InventoryMovement"("folio");
CREATE UNIQUE INDEX "InventoryMovement_adjustmentBatchId_key" ON "InventoryMovement"("adjustmentBatchId");
CREATE UNIQUE INDEX "InventoryMovement_countId_key" ON "InventoryMovement"("countId");
CREATE UNIQUE INDEX "InventoryMovement_reversalOfId_key" ON "InventoryMovement"("reversalOfId");
CREATE INDEX "InventoryMovement_businessDate_creadoEn_idx" ON "InventoryMovement"("businessDate", "creadoEn");
CREATE INDEX "InventoryMovement_warehouseRequestId_idx" ON "InventoryMovement"("warehouseRequestId");
CREATE INDEX "InventoryMovementLine_itemId_creadoEn_idx" ON "InventoryMovementLine"("itemId", "creadoEn");
CREATE INDEX "InventoryMovementLine_fromLocationId_creadoEn_idx" ON "InventoryMovementLine"("fromLocationId", "creadoEn");
CREATE INDEX "InventoryMovementLine_toLocationId_creadoEn_idx" ON "InventoryMovementLine"("toLocationId", "creadoEn");
CREATE UNIQUE INDEX "InventoryCountLine_countId_itemId_key" ON "InventoryCountLine"("countId", "itemId");
CREATE INDEX "PosNotification_branchId_creadoEn_idx" ON "PosNotification"("branchId", "creadoEn");
CREATE INDEX "PosNotification_audiencePermission_creadoEn_idx" ON "PosNotification"("audiencePermission", "creadoEn");
CREATE UNIQUE INDEX "PosNotificationRead_notificationId_credentialId_key" ON "PosNotificationRead"("notificationId", "credentialId");
CREATE INDEX "PosNotificationRead_credentialId_readAt_idx" ON "PosNotificationRead"("credentialId", "readAt");

ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustmentBatch" ADD CONSTRAINT "InventoryAdjustmentBatch_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustmentBatch" ADD CONSTRAINT "InventoryAdjustmentBatch_resolvedByCredentialId_fkey" FOREIGN KEY ("resolvedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustmentBatchLine" ADD CONSTRAINT "InventoryAdjustmentBatchLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryAdjustmentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustmentBatchLine" ADD CONSTRAINT "InventoryAdjustmentBatchLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustmentBatchLine" ADD CONSTRAINT "InventoryAdjustmentBatchLine_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustmentBatchLine" ADD CONSTRAINT "InventoryAdjustmentBatchLine_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "PosSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PosPriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_creationApprovedByCredentialId_fkey" FOREIGN KEY ("creationApprovedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_sendApprovedByCredentialId_fkey" FOREIGN KEY ("sendApprovedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_receivedByCredentialId_fkey" FOREIGN KEY ("receivedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest" ADD CONSTRAINT "WarehouseRequest_canceledByCredentialId_fkey" FOREIGN KEY ("canceledByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestLine" ADD CONSTRAINT "WarehouseRequestLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestLine" ADD CONSTRAINT "WarehouseRequestLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestEvent" ADD CONSTRAINT "WarehouseRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestEvent" ADD CONSTRAINT "WarehouseRequestEvent_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_adjustmentBatchId_fkey" FOREIGN KEY ("adjustmentBatchId") REFERENCES "InventoryAdjustmentBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseRequestId_fkey" FOREIGN KEY ("warehouseRequestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementLine" ADD CONSTRAINT "InventoryMovementLine_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementLine" ADD CONSTRAINT "InventoryMovementLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementLine" ADD CONSTRAINT "InventoryMovementLine_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementLine" ADD CONSTRAINT "InventoryMovementLine_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosNotification" ADD CONSTRAINT "PosNotification_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosNotification" ADD CONSTRAINT "PosNotification_warehouseRequestId_fkey" FOREIGN KEY ("warehouseRequestId") REFERENCES "WarehouseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosNotification" ADD CONSTRAINT "PosNotification_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosNotificationRead" ADD CONSTRAINT "PosNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "PosNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosNotificationRead" ADD CONSTRAINT "PosNotificationRead_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ubicaciones derivadas, no datos mock: una por sucursal existente y una matriz.
INSERT INTO "InventoryLocation" ("id", "code", "name", "type", "branchId", "active", "actualizadoEn")
SELECT 'pos-loc-branch-' || md5("id"), 'BR-' || upper(substr(md5("id"), 1, 12)), "nombre", 'BRANCH', "id", "activa", CURRENT_TIMESTAMP
FROM "Sucursal"
ON CONFLICT ("branchId") DO NOTHING;

INSERT INTO "InventoryLocation" ("id", "code", "name", "type", "branchId", "active", "actualizadoEn")
VALUES ('pos-loc-matrix', 'MATRIX', 'Bodega matriz', 'WAREHOUSE', NULL, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Las líneas del ledger, conteos y eventos son append-only por diseño.
CREATE FUNCTION "reject_pos_immutable_change"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El historial POS es inmutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryMovementLine_immutable" BEFORE UPDATE OR DELETE ON "InventoryMovementLine" FOR EACH ROW EXECUTE FUNCTION "reject_pos_immutable_change"();
CREATE TRIGGER "InventoryCountLine_immutable" BEFORE UPDATE OR DELETE ON "InventoryCountLine" FOR EACH ROW EXECUTE FUNCTION "reject_pos_immutable_change"();
CREATE TRIGGER "WarehouseRequestEvent_immutable" BEFORE UPDATE OR DELETE ON "WarehouseRequestEvent" FOR EACH ROW EXECUTE FUNCTION "reject_pos_immutable_change"();
