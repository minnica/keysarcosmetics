-- Fase 14 POS: dependencias durables para membresías y Agenda offline.
-- Migración aditiva: no altera ni elimina operaciones, tickets o tarjetones existentes.

ALTER TYPE "PosOfflineOperationKind"
  ADD VALUE IF NOT EXISTS 'AGENDA_MEMBERSHIP_RESERVATION';

ALTER TYPE "PosOfflineOperationKind"
  ADD VALUE IF NOT EXISTS 'MEMBERSHIP_ATTENDANCE';

ALTER TABLE "PosSyncOperation"
  ADD COLUMN "dependencyIds" JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION "prevent_pos_sync_operation_rewrite"()
RETURNS trigger AS $$
BEGIN
  IF OLD."clientOperationId" <> NEW."clientOperationId"
    OR OLD."terminalId" <> NEW."terminalId"
    OR OLD."terminalSequence" <> NEW."terminalSequence"
    OR OLD."credentialId" <> NEW."credentialId"
    OR OLD."kind" <> NEW."kind"
    OR OLD."idempotencyKey" <> NEW."idempotencyKey"
    OR OLD."entityId" IS DISTINCT FROM NEW."entityId"
    OR OLD."dependencyIds" IS DISTINCT FROM NEW."dependencyIds"
    OR OLD."payloadHash" <> NEW."payloadHash"
    OR OLD."clientCreatedAt" <> NEW."clientCreatedAt" THEN
    RAISE EXCEPTION 'PosSyncOperation immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
