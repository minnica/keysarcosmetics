-- Fase 7 POS: preferencias y outbox de notificaciones.
-- Migración aditiva: no inserta datos operativos ni demostrativos.

ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'SALE_COMPLETED';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'CASH_EXPENSE';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'INVENTORY_ADD';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'INVENTORY_REMOVE';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'INVENTORY_TRANSFER';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'CLOSE_DAY';
ALTER TYPE "PosNotificationKind" ADD VALUE IF NOT EXISTS 'CLOCK_IN';

CREATE TYPE "PosNotificationAccess" AS ENUM ('VIEW', 'EDIT');

ALTER TABLE "PosNotification"
  ADD COLUMN "sourceType" VARCHAR(80),
  ADD COLUMN "sourceId" VARCHAR(120);

CREATE TABLE "PosNotificationPreference" (
  "id" TEXT NOT NULL,
  "kind" "PosNotificationKind" NOT NULL,
  "credentialId" TEXT NOT NULL,
  "access" "PosNotificationAccess" NOT NULL DEFAULT 'VIEW',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosNotificationOutbox" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "access" "PosNotificationAccess" NOT NULL DEFAULT 'VIEW',
  "deliveredAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosNotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PosNotification_sourceType_sourceId_idx"
  ON "PosNotification"("sourceType", "sourceId");
CREATE UNIQUE INDEX "PosNotification_kind_sourceType_sourceId_key"
  ON "PosNotification"("kind", "sourceType", "sourceId");
CREATE UNIQUE INDEX "PosNotificationPreference_kind_credentialId_key"
  ON "PosNotificationPreference"("kind", "credentialId");
CREATE INDEX "PosNotificationPreference_credentialId_active_idx"
  ON "PosNotificationPreference"("credentialId", "active");
CREATE UNIQUE INDEX "PosNotificationOutbox_notificationId_credentialId_key"
  ON "PosNotificationOutbox"("notificationId", "credentialId");
CREATE INDEX "PosNotificationOutbox_credentialId_deliveredAt_creadoEn_idx"
  ON "PosNotificationOutbox"("credentialId", "deliveredAt", "creadoEn");

ALTER TABLE "PosNotificationPreference"
  ADD CONSTRAINT "PosNotificationPreference_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosNotificationOutbox"
  ADD CONSTRAINT "PosNotificationOutbox_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "PosNotification"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosNotificationOutbox"
  ADD CONSTRAINT "PosNotificationOutbox_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "protect_pos_notification_history"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'POS notification history is append-only';
  END IF;
  IF NEW."kind" IS DISTINCT FROM OLD."kind"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."message" IS DISTINCT FROM OLD."message"
    OR NEW."branchId" IS DISTINCT FROM OLD."branchId"
    OR NEW."audiencePermission" IS DISTINCT FROM OLD."audiencePermission"
    OR NEW."warehouseRequestId" IS DISTINCT FROM OLD."warehouseRequestId"
    OR NEW."createdByCredentialId" IS DISTINCT FROM OLD."createdByCredentialId"
    OR NEW."sourceType" IS DISTINCT FROM OLD."sourceType"
    OR NEW."sourceId" IS DISTINCT FROM OLD."sourceId"
    OR NEW."creadoEn" IS DISTINCT FROM OLD."creadoEn" THEN
    RAISE EXCEPTION 'POS notification content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosNotification_append_only"
BEFORE UPDATE OR DELETE ON "PosNotification"
FOR EACH ROW EXECUTE FUNCTION "protect_pos_notification_history"();

CREATE OR REPLACE FUNCTION "protect_pos_notification_outbox"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'POS notification outbox is append-only';
  END IF;
  IF NEW."notificationId" IS DISTINCT FROM OLD."notificationId"
    OR NEW."credentialId" IS DISTINCT FROM OLD."credentialId"
    OR NEW."access" IS DISTINCT FROM OLD."access"
    OR NEW."creadoEn" IS DISTINCT FROM OLD."creadoEn" THEN
    RAISE EXCEPTION 'POS notification outbox identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosNotificationOutbox_append_only"
BEFORE UPDATE OR DELETE ON "PosNotificationOutbox"
FOR EACH ROW EXECUTE FUNCTION "protect_pos_notification_outbox"();
