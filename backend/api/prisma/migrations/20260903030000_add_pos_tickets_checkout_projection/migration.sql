-- Fase 4 POS: tickets, checkout, apartados, adeudos, vouchers y proyección legacy.
-- Migración aditiva: no transforma ventas existentes ni inserta datos operativos.

CREATE TYPE "PosTicketStatus" AS ENUM ('COMPLETED', 'LAYAWAY', 'CANCELED', 'REFUNDED');
CREATE TYPE "PosSettlementStatus" AS ENUM ('PAID', 'LAYAWAY', 'PENDING');
CREATE TYPE "PosTicketLineKind" AS ENUM ('SALE', 'GIFT');
CREATE TYPE "PosPaymentOperationKind" AS ENUM ('SALE', 'LAYAWAY_PAYMENT', 'REFUND', 'REVISION');
CREATE TYPE "PosTicketEventType" AS ENUM ('REVISION', 'CANCELLATION', 'RETURN');
CREATE TYPE "PosAppointmentKind" AS ENUM ('COURTESY', 'NEXT_SESSION', 'NO_APPOINTMENT');
CREATE TYPE "PosAppointmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'CANCELED', 'COMPLETED');
CREATE TYPE "PosOwedProductStatus" AS ENUM ('PENDING', 'DELIVERED', 'CANCELED');
CREATE TYPE "PosVoucherIssueStatus" AS ENUM ('ISSUED', 'REDEEMED', 'CANCELED');

CREATE SEQUENCE "PosTicketFolioSeq";
CREATE SEQUENCE "PosPaymentFolioSeq";
CREATE SEQUENCE "PosDeliveryFolioSeq";
CREATE SEQUENCE "PosVoucherFolioSeq";

CREATE TABLE "PosTicket" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "folio" VARCHAR(80) NOT NULL,
  "terminalSequence" BIGINT NOT NULL,
  "status" "PosTicketStatus" NOT NULL,
  "settlementStatus" "PosSettlementStatus" NOT NULL,
  "businessDate" DATE NOT NULL,
  "branchId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "createdByCredentialId" TEXT NOT NULL,
  "customerId" TEXT,
  "customerNameSnapshot" VARCHAR(240),
  "customerPhoneSnapshot" VARCHAR(32),
  "subtotal" DECIMAL(14,2) NOT NULL,
  "minimumTotal" DECIMAL(14,2) NOT NULL,
  "spareTotal" DECIMAL(14,2) NOT NULL,
  "discountTotal" DECIMAL(14,2) NOT NULL,
  "taxTotal" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "amountPaid" DECIMAL(14,2) NOT NULL,
  "pendingAmount" DECIMAL(14,2) NOT NULL,
  "authorizationId" TEXT,
  "inventoryMovementId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosTicket_amounts_check" CHECK (
    "subtotal" >= 0 AND "minimumTotal" >= 0 AND "spareTotal" >= 0 AND
    "discountTotal" >= 0 AND "taxTotal" >= 0 AND "total" >= 0 AND
    "amountPaid" >= 0 AND "pendingAmount" >= 0 AND
    "amountPaid" + "pendingAmount" = "total"
  )
);

CREATE TABLE "PosTicketLine" (
  "id" TEXT NOT NULL,
  "ticketId" UUID NOT NULL,
  "kind" "PosTicketLineKind" NOT NULL DEFAULT 'SALE',
  "itemId" TEXT,
  "packageId" TEXT,
  "packageVersionSnapshot" INTEGER,
  "packageNameSnapshot" VARCHAR(160),
  "itemNameSnapshot" VARCHAR(240) NOT NULL,
  "skuSnapshot" VARCHAR(96) NOT NULL,
  "familySnapshot" VARCHAR(160),
  "categorySnapshot" VARCHAR(160),
  "quantity" DECIMAL(14,2) NOT NULL,
  "unitListPrice" DECIMAL(14,2) NOT NULL,
  "unitMinimumPrice" DECIMAL(14,2) NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "unitCostSnapshot" DECIMAL(14,2) NOT NULL,
  "taxRateSnapshot" DECIMAL(8,2) NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "minimumTotal" DECIMAL(14,2) NOT NULL,
  "discountTotal" DECIMAL(14,2) NOT NULL,
  "taxTotal" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "notes" VARCHAR(500),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosTicketLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosTicketLine_values_check" CHECK (
    "quantity" > 0 AND "unitListPrice" >= 0 AND "unitMinimumPrice" >= 0 AND
    "unitPrice" >= 0 AND "unitCostSnapshot" >= 0 AND "taxRateSnapshot" >= 0 AND
    "subtotal" >= 0 AND "minimumTotal" >= 0 AND "discountTotal" >= 0 AND
    "taxTotal" >= 0 AND "total" >= 0
  )
);

CREATE TABLE "PosTicketSeller" (
  "id" TEXT NOT NULL,
  "ticketId" UUID NOT NULL,
  "employeeId" TEXT NOT NULL,
  "sellerNameSnapshot" VARCHAR(240) NOT NULL,
  "shareAmount" DECIMAL(14,2) NOT NULL,
  "sharePercent" DECIMAL(8,4) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosTicketSeller_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosTicketSeller_share_check" CHECK ("shareAmount" >= 0 AND "sharePercent" >= 0 AND "sharePercent" <= 100)
);

CREATE TABLE "PosPaymentOperation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "folio" VARCHAR(80) NOT NULL,
  "kind" "PosPaymentOperationKind" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "businessDate" DATE NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "reversalOfId" UUID,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPaymentOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPaymentOperation_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "PosPayment" (
  "id" TEXT NOT NULL,
  "operationId" UUID NOT NULL,
  "paymentMethodId" TEXT NOT NULL,
  "methodNameSnapshot" VARCHAR(160) NOT NULL,
  "methodTypeSnapshot" "MetodoPagoTipo" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "reference" VARCHAR(160),
  "institution" VARCHAR(160),
  "authorizationLastFour" VARCHAR(4),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPayment_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PosPayment_last_four_check" CHECK ("authorizationLastFour" IS NULL OR "authorizationLastFour" ~ '^[0-9]{4}$')
);

CREATE TABLE "PosLayaway" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "amountPaid" DECIMAL(14,2) NOT NULL,
  "pendingAmount" DECIMAL(14,2) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosLayaway_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosLayaway_amounts_check" CHECK ("amountPaid" >= 0 AND "pendingAmount" >= 0)
);

CREATE TABLE "PosOwedProduct" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "ticketLineId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "deliveredQuantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "inventoryCommitted" BOOLEAN NOT NULL DEFAULT true,
  "status" "PosOwedProductStatus" NOT NULL DEFAULT 'PENDING',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosOwedProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosOwedProduct_quantity_check" CHECK ("quantity" > 0 AND "deliveredQuantity" >= 0 AND "deliveredQuantity" <= "quantity")
);

CREATE TABLE "PosOwedProductDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "folio" VARCHAR(80) NOT NULL,
  "businessDate" DATE NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "inventoryMovementId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosOwedProductDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosOwedProductDeliveryLine" (
  "id" TEXT NOT NULL,
  "deliveryId" UUID NOT NULL,
  "owedProductId" UUID NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "PosOwedProductDeliveryLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosOwedProductDeliveryLine_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "PosAppointment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "customerId" TEXT NOT NULL,
  "kind" "PosAppointmentKind" NOT NULL,
  "status" "PosAppointmentStatus" NOT NULL,
  "serviceItemId" TEXT,
  "serviceNameSnapshot" VARCHAR(240) NOT NULL,
  "branchId" TEXT NOT NULL,
  "sellerId" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "createdByCredentialId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosAppointment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosAppointment_schedule_check" CHECK (
    ("kind" = 'NO_APPOINTMENT' AND "scheduledAt" IS NULL) OR
    ("kind" <> 'NO_APPOINTMENT' AND "scheduledAt" IS NOT NULL)
  )
);

CREATE TABLE "PosCourtesy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "ticketLineId" TEXT NOT NULL,
  "appointmentId" UUID,
  "policyId" TEXT,
  "policyNameSnapshot" VARCHAR(160) NOT NULL,
  "authorizationId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCourtesy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosTicketEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "type" "PosTicketEventType" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "reason" VARCHAR(1000) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "authorizationId" TEXT,
  "inventoryMovementId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosTicketEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosTicketEvent_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "PosLegacySaleProjection" (
  "id" TEXT NOT NULL,
  "operationId" UUID NOT NULL,
  "employeeId" TEXT NOT NULL,
  "ventaId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosLegacySaleProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosVoucherIssue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "folio" VARCHAR(80) NOT NULL,
  "templateId" TEXT NOT NULL,
  "ticketId" UUID NOT NULL,
  "customerId" TEXT,
  "templateNameSnapshot" VARCHAR(160) NOT NULL,
  "kindSnapshot" "PosVoucherKind" NOT NULL,
  "valueSnapshot" DECIMAL(14,2) NOT NULL,
  "messageSnapshot" VARCHAR(1000) NOT NULL,
  "status" "PosVoucherIssueStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedByCredentialId" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosVoucherIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosVoucherPrintEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "issueId" UUID NOT NULL,
  "copyNumber" INTEGER NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosVoucherPrintEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosVoucherPrintEvent_copy_check" CHECK ("copyNumber" > 0)
);

CREATE UNIQUE INDEX "PosTicket_folio_key" ON "PosTicket"("folio");
CREATE UNIQUE INDEX "PosTicket_inventoryMovementId_key" ON "PosTicket"("inventoryMovementId");
CREATE UNIQUE INDEX "PosTicket_terminalId_terminalSequence_key" ON "PosTicket"("terminalId", "terminalSequence");
CREATE INDEX "PosTicket_branchId_businessDate_creadoEn_idx" ON "PosTicket"("branchId", "businessDate", "creadoEn");
CREATE INDEX "PosTicket_customerId_creadoEn_idx" ON "PosTicket"("customerId", "creadoEn");
CREATE INDEX "PosTicket_createdByCredentialId_creadoEn_idx" ON "PosTicket"("createdByCredentialId", "creadoEn");
CREATE INDEX "PosTicketLine_ticketId_idx" ON "PosTicketLine"("ticketId");
CREATE INDEX "PosTicketLine_itemId_idx" ON "PosTicketLine"("itemId");
CREATE INDEX "PosTicketLine_packageId_idx" ON "PosTicketLine"("packageId");
CREATE UNIQUE INDEX "PosTicketSeller_ticketId_employeeId_key" ON "PosTicketSeller"("ticketId", "employeeId");
CREATE INDEX "PosTicketSeller_employeeId_creadoEn_idx" ON "PosTicketSeller"("employeeId", "creadoEn");
CREATE UNIQUE INDEX "PosPaymentOperation_folio_key" ON "PosPaymentOperation"("folio");
CREATE UNIQUE INDEX "PosPaymentOperation_reversalOfId_key" ON "PosPaymentOperation"("reversalOfId");
CREATE INDEX "PosPaymentOperation_ticketId_creadoEn_idx" ON "PosPaymentOperation"("ticketId", "creadoEn");
CREATE INDEX "PosPaymentOperation_businessDate_creadoEn_idx" ON "PosPaymentOperation"("businessDate", "creadoEn");
CREATE INDEX "PosPayment_operationId_idx" ON "PosPayment"("operationId");
CREATE INDEX "PosPayment_paymentMethodId_creadoEn_idx" ON "PosPayment"("paymentMethodId", "creadoEn");
CREATE UNIQUE INDEX "PosLayaway_ticketId_key" ON "PosLayaway"("ticketId");
CREATE INDEX "PosLayaway_pendingAmount_idx" ON "PosLayaway"("pendingAmount");
CREATE INDEX "PosOwedProduct_ticketId_status_idx" ON "PosOwedProduct"("ticketId", "status");
CREATE INDEX "PosOwedProduct_itemId_status_idx" ON "PosOwedProduct"("itemId", "status");
CREATE UNIQUE INDEX "PosOwedProductDelivery_folio_key" ON "PosOwedProductDelivery"("folio");
CREATE UNIQUE INDEX "PosOwedProductDelivery_inventoryMovementId_key" ON "PosOwedProductDelivery"("inventoryMovementId");
CREATE INDEX "PosOwedProductDelivery_businessDate_creadoEn_idx" ON "PosOwedProductDelivery"("businessDate", "creadoEn");
CREATE UNIQUE INDEX "PosOwedProductDeliveryLine_deliveryId_owedProductId_key" ON "PosOwedProductDeliveryLine"("deliveryId", "owedProductId");
CREATE INDEX "PosOwedProductDeliveryLine_owedProductId_idx" ON "PosOwedProductDeliveryLine"("owedProductId");
CREATE INDEX "PosAppointment_customerId_scheduledAt_idx" ON "PosAppointment"("customerId", "scheduledAt");
CREATE INDEX "PosAppointment_branchId_scheduledAt_idx" ON "PosAppointment"("branchId", "scheduledAt");
CREATE UNIQUE INDEX "PosCourtesy_ticketLineId_key" ON "PosCourtesy"("ticketLineId");
CREATE UNIQUE INDEX "PosCourtesy_appointmentId_key" ON "PosCourtesy"("appointmentId");
CREATE INDEX "PosCourtesy_ticketId_idx" ON "PosCourtesy"("ticketId");
CREATE UNIQUE INDEX "PosTicketEvent_inventoryMovementId_key" ON "PosTicketEvent"("inventoryMovementId");
CREATE INDEX "PosTicketEvent_ticketId_creadoEn_idx" ON "PosTicketEvent"("ticketId", "creadoEn");
CREATE UNIQUE INDEX "PosLegacySaleProjection_ventaId_key" ON "PosLegacySaleProjection"("ventaId");
CREATE UNIQUE INDEX "PosLegacySaleProjection_operationId_employeeId_key" ON "PosLegacySaleProjection"("operationId", "employeeId");
CREATE INDEX "PosLegacySaleProjection_operationId_idx" ON "PosLegacySaleProjection"("operationId");
CREATE UNIQUE INDEX "PosVoucherIssue_folio_key" ON "PosVoucherIssue"("folio");
CREATE UNIQUE INDEX "PosVoucherIssue_ticketId_templateId_key" ON "PosVoucherIssue"("ticketId", "templateId");
CREATE INDEX "PosVoucherIssue_customerId_status_idx" ON "PosVoucherIssue"("customerId", "status");
CREATE UNIQUE INDEX "PosVoucherPrintEvent_issueId_copyNumber_key" ON "PosVoucherPrintEvent"("issueId", "copyNumber");
CREATE INDEX "PosVoucherPrintEvent_issueId_creadoEn_idx" ON "PosVoucherPrintEvent"("issueId", "creadoEn");

ALTER TABLE "PosTicket" ADD CONSTRAINT "PosTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicket" ADD CONSTRAINT "PosTicket_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicket" ADD CONSTRAINT "PosTicket_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicket" ADD CONSTRAINT "PosTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicket" ADD CONSTRAINT "PosTicket_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketLine" ADD CONSTRAINT "PosTicketLine_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketLine" ADD CONSTRAINT "PosTicketLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketLine" ADD CONSTRAINT "PosTicketLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PosPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketSeller" ADD CONSTRAINT "PosTicketSeller_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketSeller" ADD CONSTRAINT "PosTicketSeller_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPaymentOperation" ADD CONSTRAINT "PosPaymentOperation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPaymentOperation" ADD CONSTRAINT "PosPaymentOperation_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPaymentOperation" ADD CONSTRAINT "PosPaymentOperation_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPaymentOperation" ADD CONSTRAINT "PosPaymentOperation_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "PosPaymentOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "PosPaymentOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "MetodoPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosLayaway" ADD CONSTRAINT "PosLayaway_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProduct" ADD CONSTRAINT "PosOwedProduct_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProduct" ADD CONSTRAINT "PosOwedProduct_ticketLineId_fkey" FOREIGN KEY ("ticketLineId") REFERENCES "PosTicketLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProduct" ADD CONSTRAINT "PosOwedProduct_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProductDelivery" ADD CONSTRAINT "PosOwedProductDelivery_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProductDelivery" ADD CONSTRAINT "PosOwedProductDelivery_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProductDelivery" ADD CONSTRAINT "PosOwedProductDelivery_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProductDeliveryLine" ADD CONSTRAINT "PosOwedProductDeliveryLine_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "PosOwedProductDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProductDeliveryLine" ADD CONSTRAINT "PosOwedProductDeliveryLine_owedProductId_fkey" FOREIGN KEY ("owedProductId") REFERENCES "PosOwedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosOwedProductDeliveryLine" ADD CONSTRAINT "PosOwedProductDeliveryLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesy" ADD CONSTRAINT "PosCourtesy_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesy" ADD CONSTRAINT "PosCourtesy_ticketLineId_fkey" FOREIGN KEY ("ticketLineId") REFERENCES "PosTicketLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesy" ADD CONSTRAINT "PosCourtesy_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "PosAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketEvent" ADD CONSTRAINT "PosTicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketEvent" ADD CONSTRAINT "PosTicketEvent_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketEvent" ADD CONSTRAINT "PosTicketEvent_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosLegacySaleProjection" ADD CONSTRAINT "PosLegacySaleProjection_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "PosPaymentOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosLegacySaleProjection" ADD CONSTRAINT "PosLegacySaleProjection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosLegacySaleProjection" ADD CONSTRAINT "PosLegacySaleProjection_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherIssue" ADD CONSTRAINT "PosVoucherIssue_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PosVoucherTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherIssue" ADD CONSTRAINT "PosVoucherIssue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherIssue" ADD CONSTRAINT "PosVoucherIssue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherIssue" ADD CONSTRAINT "PosVoucherIssue_issuedByCredentialId_fkey" FOREIGN KEY ("issuedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherPrintEvent" ADD CONSTRAINT "PosVoucherPrintEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "PosVoucherIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherPrintEvent" ADD CONSTRAINT "PosVoucherPrintEvent_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosVoucherPrintEvent" ADD CONSTRAINT "PosVoucherPrintEvent_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_pos_financial_history_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosTicketLine_append_only" BEFORE UPDATE OR DELETE ON "PosTicketLine" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
CREATE TRIGGER "PosTicketSeller_append_only" BEFORE UPDATE OR DELETE ON "PosTicketSeller" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
CREATE TRIGGER "PosPaymentOperation_append_only" BEFORE UPDATE OR DELETE ON "PosPaymentOperation" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
CREATE TRIGGER "PosPayment_append_only" BEFORE UPDATE OR DELETE ON "PosPayment" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
CREATE TRIGGER "PosTicketEvent_append_only" BEFORE UPDATE OR DELETE ON "PosTicketEvent" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
CREATE TRIGGER "PosLegacySaleProjection_append_only" BEFORE UPDATE OR DELETE ON "PosLegacySaleProjection" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
CREATE TRIGGER "PosVoucherPrintEvent_append_only" BEFORE UPDATE OR DELETE ON "PosVoucherPrintEvent" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();

CREATE OR REPLACE FUNCTION "prevent_projected_legacy_sale_mutation"() RETURNS trigger AS $$
DECLARE
  projected_sale_id TEXT;
BEGIN
  projected_sale_id := COALESCE(to_jsonb(OLD)->>'ventaId', to_jsonb(OLD)->>'id');
  IF EXISTS (SELECT 1 FROM "PosLegacySaleProjection" WHERE "ventaId" = projected_sale_id) THEN
    RAISE EXCEPTION 'POS legacy projection % is append-only', projected_sale_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Venta_pos_projection_append_only" BEFORE UPDATE OR DELETE ON "Venta" FOR EACH ROW EXECUTE FUNCTION "prevent_projected_legacy_sale_mutation"();
CREATE TRIGGER "VentaDetalle_pos_projection_append_only" BEFORE UPDATE OR DELETE ON "VentaDetalle" FOR EACH ROW EXECUTE FUNCTION "prevent_projected_legacy_sale_mutation"();
