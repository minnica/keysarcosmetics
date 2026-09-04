-- Fase 6 POS: secuencia durable de operaciones offline y reconciliación.
-- Migración aditiva: no modifica tickets, cobros ni movimientos existentes.

CREATE TYPE "PosSyncOperationStatus" AS ENUM (
  'PENDING',
  'SYNCING',
  'SYNCED',
  'ERROR',
  'CONFLICT'
);

CREATE TYPE "PosOfflineOperationKind" AS ENUM (
  'BUSINESS_DAY_OPEN',
  'INVENTORY_COUNT',
  'TICKET_CREATE',
  'LAYAWAY_PAYMENT',
  'VOUCHER_ISSUE',
  'VOUCHER_PRINT',
  'BUSINESS_DAY_CLOSING_COUNT',
  'BUSINESS_DAY_CLOSE'
);

CREATE TABLE "PosSyncCursor" (
  "id" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "lastSequence" BIGINT NOT NULL DEFAULT 0,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosSyncCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosSyncOperation" (
  "id" TEXT NOT NULL,
  "clientOperationId" UUID NOT NULL,
  "terminalId" TEXT NOT NULL,
  "terminalSequence" BIGINT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "kind" "PosOfflineOperationKind" NOT NULL,
  "idempotencyKey" UUID NOT NULL,
  "entityId" TEXT,
  "payloadHash" VARCHAR(64) NOT NULL,
  "status" "PosSyncOperationStatus" NOT NULL,
  "serverEntityId" TEXT,
  "response" JSONB,
  "errorCode" VARCHAR(80),
  "errorMessage" VARCHAR(1000),
  "clientCreatedAt" TIMESTAMP(3) NOT NULL,
  "syncedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosSyncOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosSyncCursor_terminalId_key"
  ON "PosSyncCursor"("terminalId");
CREATE UNIQUE INDEX "PosSyncOperation_clientOperationId_key"
  ON "PosSyncOperation"("clientOperationId");
CREATE UNIQUE INDEX "PosSyncOperation_idempotencyKey_key"
  ON "PosSyncOperation"("idempotencyKey");
CREATE UNIQUE INDEX "PosSyncOperation_terminalId_terminalSequence_key"
  ON "PosSyncOperation"("terminalId", "terminalSequence");
CREATE INDEX "PosSyncOperation_terminalId_status_terminalSequence_idx"
  ON "PosSyncOperation"("terminalId", "status", "terminalSequence");
CREATE INDEX "PosSyncOperation_credentialId_creadoEn_idx"
  ON "PosSyncOperation"("credentialId", "creadoEn");

ALTER TABLE "PosSyncCursor"
  ADD CONSTRAINT "PosSyncCursor_terminalId_fkey"
  FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosSyncOperation"
  ADD CONSTRAINT "PosSyncOperation_terminalId_fkey"
  FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosSyncOperation"
  ADD CONSTRAINT "PosSyncOperation_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_pos_sync_operation_rewrite"()
RETURNS trigger AS $$
BEGIN
  IF OLD."clientOperationId" <> NEW."clientOperationId"
    OR OLD."terminalId" <> NEW."terminalId"
    OR OLD."terminalSequence" <> NEW."terminalSequence"
    OR OLD."credentialId" <> NEW."credentialId"
    OR OLD."kind" <> NEW."kind"
    OR OLD."idempotencyKey" <> NEW."idempotencyKey"
    OR OLD."payloadHash" <> NEW."payloadHash"
    OR OLD."clientCreatedAt" <> NEW."clientCreatedAt" THEN
    RAISE EXCEPTION 'PosSyncOperation immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosSyncOperation_immutable_payload"
BEFORE UPDATE ON "PosSyncOperation"
FOR EACH ROW EXECUTE FUNCTION "prevent_pos_sync_operation_rewrite"();

CREATE OR REPLACE FUNCTION "prevent_pos_sync_operation_delete"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PosSyncOperation rows are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosSyncOperation_no_delete"
BEFORE DELETE ON "PosSyncOperation"
FOR EACH ROW EXECUTE FUNCTION "prevent_pos_sync_operation_delete"();
