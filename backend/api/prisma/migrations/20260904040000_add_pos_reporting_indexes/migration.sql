-- Fase 13: índices aditivos para agregados canónicos y exportaciones POS.
-- No crea datos, no reescribe históricos y no modifica modelos de Envelope/Payroll.

CREATE INDEX "PosPaymentOperation_businessDate_kind_creadoEn_idx"
  ON "PosPaymentOperation"("businessDate", "kind", "creadoEn");

CREATE INDEX "PosAppointment_branchId_status_scheduledAt_idx"
  ON "PosAppointment"("branchId", "status", "scheduledAt");

CREATE INDEX "PosClientMembership_ticketId_idx"
  ON "PosClientMembership"("ticketId");

CREATE INDEX "PosClientMembership_customerId_purchaseBranchId_purchasedAt_idx"
  ON "PosClientMembership"("customerId", "purchaseBranchId", "purchasedAt");
