-- Fase 5 POS: jornada única, asistencia, caja y cierre inmutable.
-- Migración aditiva: no crea jornadas, asistencias, gastos ni tipos operativos.

CREATE TYPE "PosBusinessDayStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PosAttendanceStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PosAttendanceCloseReason" AS ENUM ('MANUAL', 'CLOSE_DAY');
CREATE TYPE "PosCashExpenseStatus" AS ENUM ('ACTIVE', 'VOIDED');
CREATE TYPE "PosCashMovementKind" AS ENUM ('EXPENSE', 'CORRECTION', 'VOID');

CREATE SEQUENCE "PosCashExpenseFolioSeq";

CREATE TABLE "PosBusinessDay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "branchId" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "status" "PosBusinessDayStatus" NOT NULL DEFAULT 'OPEN',
  "openingCountId" TEXT,
  "openingSkipped" BOOLEAN NOT NULL DEFAULT false,
  "openingAuthorizationId" TEXT,
  "openedByCredentialId" TEXT NOT NULL,
  "openedTerminalId" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closingCountId" TEXT,
  "closingSkipped" BOOLEAN NOT NULL DEFAULT false,
  "closingAuthorizationId" TEXT,
  "closeAuthorizationId" TEXT,
  "closedByCredentialId" TEXT,
  "closedTerminalId" TEXT,
  "closedAt" TIMESTAMP(3),
  "closeSummary" JSONB,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosBusinessDay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosBusinessDay_opening_count_check" CHECK (
    ("openingSkipped" = false AND "openingCountId" IS NOT NULL AND "openingAuthorizationId" IS NULL) OR
    ("openingSkipped" = true AND "openingCountId" IS NULL AND "openingAuthorizationId" IS NOT NULL)
  ),
  CONSTRAINT "PosBusinessDay_closing_check" CHECK (
    ("status" = 'OPEN' AND "closingCountId" IS NULL AND "closingSkipped" = false AND
      "closingAuthorizationId" IS NULL AND "closeAuthorizationId" IS NULL AND "closedByCredentialId" IS NULL AND
      "closedTerminalId" IS NULL AND "closedAt" IS NULL AND "closeSummary" IS NULL) OR
    ("status" = 'OPEN' AND (
      ("closingSkipped" = false AND "closingCountId" IS NOT NULL AND "closingAuthorizationId" IS NULL) OR
      ("closingSkipped" = true AND "closingCountId" IS NULL AND "closingAuthorizationId" IS NOT NULL)
    ) AND "closeAuthorizationId" IS NULL AND "closedByCredentialId" IS NULL AND "closedTerminalId" IS NULL AND "closedAt" IS NULL AND "closeSummary" IS NULL) OR
    ("status" = 'CLOSED' AND (
      ("closingSkipped" = false AND "closingCountId" IS NOT NULL) OR
      ("closingSkipped" = true AND "closingAuthorizationId" IS NOT NULL)
    ) AND "closedByCredentialId" IS NOT NULL AND "closedTerminalId" IS NOT NULL AND
      "closedAt" IS NOT NULL AND "closeSummary" IS NOT NULL AND "closeAuthorizationId" IS NOT NULL)
  )
);

CREATE TABLE "PosAttendance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "businessDayId" UUID NOT NULL,
  "employeeId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "credentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "clockInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clockOutAt" TIMESTAMP(3),
  "status" "PosAttendanceStatus" NOT NULL DEFAULT 'OPEN',
  "closeReason" "PosAttendanceCloseReason",
  "closedByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosAttendance_status_check" CHECK (
    ("status" = 'OPEN' AND "clockOutAt" IS NULL AND "closeReason" IS NULL AND "closedByCredentialId" IS NULL) OR
    ("status" = 'CLOSED' AND "clockOutAt" IS NOT NULL AND "closeReason" IS NOT NULL AND "closedByCredentialId" IS NOT NULL)
  ),
  CONSTRAINT "PosAttendance_time_check" CHECK ("clockOutAt" IS NULL OR "clockOutAt" >= "clockInAt")
);

CREATE TABLE "PosExpenseType" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "createdByCredentialId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosExpenseType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosCashExpense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "folio" VARCHAR(80) NOT NULL,
  "businessDayId" UUID NOT NULL,
  "businessDate" DATE NOT NULL,
  "branchId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "employeeId" TEXT,
  "employeeNameSnapshot" VARCHAR(240) NOT NULL,
  "expenseTypeId" TEXT NOT NULL,
  "expenseTypeSnapshot" VARCHAR(160) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "concept" VARCHAR(500) NOT NULL,
  "comment" VARCHAR(1000),
  "status" "PosCashExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "correctsExpenseId" UUID,
  "createdByCredentialId" TEXT NOT NULL,
  "voidedAt" TIMESTAMP(3),
  "voidedByCredentialId" TEXT,
  "voidAuthorizationId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCashExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCashExpense_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PosCashExpense_void_check" CHECK (
    ("status" = 'ACTIVE' AND "voidedAt" IS NULL AND "voidedByCredentialId" IS NULL AND "voidAuthorizationId" IS NULL) OR
    ("status" = 'VOIDED' AND "voidedAt" IS NOT NULL AND "voidedByCredentialId" IS NOT NULL AND "voidAuthorizationId" IS NOT NULL)
  )
);

CREATE TABLE "PosCashMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "expenseId" UUID NOT NULL,
  "kind" "PosCashMovementKind" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "businessDate" DATE NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "authorizationId" TEXT,
  "reason" VARCHAR(1000),
  "snapshot" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCashMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCashMovement_amount_check" CHECK (
    ("kind" = 'EXPENSE' AND "amount" > 0) OR
    ("kind" = 'VOID' AND "amount" < 0) OR
    ("kind" = 'CORRECTION' AND "amount" <> 0)
  )
);

CREATE UNIQUE INDEX "PosBusinessDay_branchId_businessDate_key" ON "PosBusinessDay"("branchId", "businessDate");
CREATE UNIQUE INDEX "PosBusinessDay_openingCountId_key" ON "PosBusinessDay"("openingCountId");
CREATE UNIQUE INDEX "PosBusinessDay_openingAuthorizationId_key" ON "PosBusinessDay"("openingAuthorizationId");
CREATE UNIQUE INDEX "PosBusinessDay_closingCountId_key" ON "PosBusinessDay"("closingCountId");
CREATE UNIQUE INDEX "PosBusinessDay_closingAuthorizationId_key" ON "PosBusinessDay"("closingAuthorizationId");
CREATE UNIQUE INDEX "PosBusinessDay_closeAuthorizationId_key" ON "PosBusinessDay"("closeAuthorizationId");
CREATE INDEX "PosBusinessDay_status_businessDate_idx" ON "PosBusinessDay"("status", "businessDate");
CREATE UNIQUE INDEX "PosAttendance_one_open_employee_key" ON "PosAttendance"("employeeId") WHERE "status" = 'OPEN';
CREATE INDEX "PosAttendance_branchId_businessDate_status_idx" ON "PosAttendance"("branchId", "businessDate", "status");
CREATE INDEX "PosAttendance_employeeId_businessDate_idx" ON "PosAttendance"("employeeId", "businessDate");
CREATE UNIQUE INDEX "PosExpenseType_name_key" ON "PosExpenseType"("name");
CREATE INDEX "PosExpenseType_active_name_idx" ON "PosExpenseType"("active", "name");
CREATE UNIQUE INDEX "PosCashExpense_folio_key" ON "PosCashExpense"("folio");
CREATE INDEX "PosCashExpense_branchId_businessDate_creadoEn_idx" ON "PosCashExpense"("branchId", "businessDate", "creadoEn");
CREATE INDEX "PosCashExpense_employeeId_businessDate_idx" ON "PosCashExpense"("employeeId", "businessDate");
CREATE INDEX "PosCashExpense_status_businessDate_idx" ON "PosCashExpense"("status", "businessDate");
CREATE INDEX "PosCashMovement_businessDate_creadoEn_idx" ON "PosCashMovement"("businessDate", "creadoEn");
CREATE INDEX "PosCashMovement_expenseId_creadoEn_idx" ON "PosCashMovement"("expenseId", "creadoEn");

ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_openingCountId_fkey" FOREIGN KEY ("openingCountId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_openingAuthorizationId_fkey" FOREIGN KEY ("openingAuthorizationId") REFERENCES "MasterAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_openedByCredentialId_fkey" FOREIGN KEY ("openedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_openedTerminalId_fkey" FOREIGN KEY ("openedTerminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_closingCountId_fkey" FOREIGN KEY ("closingCountId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_closingAuthorizationId_fkey" FOREIGN KEY ("closingAuthorizationId") REFERENCES "MasterAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_closeAuthorizationId_fkey" FOREIGN KEY ("closeAuthorizationId") REFERENCES "MasterAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_closedByCredentialId_fkey" FOREIGN KEY ("closedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBusinessDay" ADD CONSTRAINT "PosBusinessDay_closedTerminalId_fkey" FOREIGN KEY ("closedTerminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAttendance" ADD CONSTRAINT "PosAttendance_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "PosBusinessDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAttendance" ADD CONSTRAINT "PosAttendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAttendance" ADD CONSTRAINT "PosAttendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAttendance" ADD CONSTRAINT "PosAttendance_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAttendance" ADD CONSTRAINT "PosAttendance_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAttendance" ADD CONSTRAINT "PosAttendance_closedByCredentialId_fkey" FOREIGN KEY ("closedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosExpenseType" ADD CONSTRAINT "PosExpenseType_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "PosBusinessDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_expenseTypeId_fkey" FOREIGN KEY ("expenseTypeId") REFERENCES "PosExpenseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_correctsExpenseId_fkey" FOREIGN KEY ("correctsExpenseId") REFERENCES "PosCashExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_voidedByCredentialId_fkey" FOREIGN KEY ("voidedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashExpense" ADD CONSTRAINT "PosCashExpense_voidAuthorizationId_fkey" FOREIGN KEY ("voidAuthorizationId") REFERENCES "MasterAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashMovement" ADD CONSTRAINT "PosCashMovement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "PosCashExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashMovement" ADD CONSTRAINT "PosCashMovement_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCashMovement" ADD CONSTRAINT "PosCashMovement_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "MasterAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "protect_pos_business_day"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PosBusinessDay is append-only';
  END IF;
  IF OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'A closed POS business day is immutable';
  END IF;
  IF NEW."branchId" <> OLD."branchId" OR NEW."businessDate" <> OLD."businessDate" OR
     NEW."openingCountId" IS DISTINCT FROM OLD."openingCountId" OR
     NEW."openingSkipped" <> OLD."openingSkipped" OR
     NEW."openingAuthorizationId" IS DISTINCT FROM OLD."openingAuthorizationId" OR
     NEW."openedByCredentialId" <> OLD."openedByCredentialId" OR
     NEW."openedTerminalId" <> OLD."openedTerminalId" OR NEW."openedAt" <> OLD."openedAt" THEN
    RAISE EXCEPTION 'POS business day opening is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "protect_closed_pos_attendance"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'Closed POS attendance is immutable';
  END IF;
  IF NEW."businessDayId" <> OLD."businessDayId" OR NEW."employeeId" <> OLD."employeeId" OR
     NEW."branchId" <> OLD."branchId" OR NEW."businessDate" <> OLD."businessDate" OR
     NEW."credentialId" <> OLD."credentialId" OR NEW."terminalId" <> OLD."terminalId" OR
     NEW."clockInAt" <> OLD."clockInAt" THEN
    RAISE EXCEPTION 'POS attendance opening is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "protect_voided_pos_cash_expense"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" = 'VOIDED' THEN
    RAISE EXCEPTION 'Voided POS cash expense is immutable';
  END IF;
  IF NEW."status" <> 'VOIDED' OR NEW."businessDayId" <> OLD."businessDayId" OR
     NEW."businessDate" <> OLD."businessDate" OR NEW."branchId" <> OLD."branchId" OR
     NEW."amount" <> OLD."amount" OR NEW."concept" <> OLD."concept" THEN
    RAISE EXCEPTION 'POS cash expenses are corrected with compensating records';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosBusinessDay_immutable" BEFORE UPDATE OR DELETE ON "PosBusinessDay" FOR EACH ROW EXECUTE FUNCTION "protect_pos_business_day"();
CREATE TRIGGER "PosAttendance_immutable" BEFORE UPDATE OR DELETE ON "PosAttendance" FOR EACH ROW EXECUTE FUNCTION "protect_closed_pos_attendance"();
CREATE TRIGGER "PosCashExpense_compensations_only" BEFORE UPDATE OR DELETE ON "PosCashExpense" FOR EACH ROW EXECUTE FUNCTION "protect_voided_pos_cash_expense"();
CREATE TRIGGER "PosCashMovement_append_only" BEFORE UPDATE OR DELETE ON "PosCashMovement" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_financial_history_mutation"();
