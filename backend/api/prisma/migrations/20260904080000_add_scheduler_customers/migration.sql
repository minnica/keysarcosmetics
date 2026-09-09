-- Fase 3 Scheduler: clientes compartidos, perfiles y trazabilidad de fusiones.
-- Migración exclusivamente aditiva. No normaliza, fusiona ni elimina datos existentes.
-- El índice único parcial de phoneNormalized se pospone hasta aprobar el diagnóstico real.

CREATE TYPE "SchedulerCustomerAliasKind" AS ENUM ('NAME', 'PHONE');
CREATE TYPE "SchedulerCustomerContactPreference" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL', 'NONE');
CREATE TYPE "SchedulerCustomerFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT');

ALTER TABLE "Customer"
  ADD COLUMN "phoneNormalized" VARCHAR(32),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "SchedulerCustomerProfile" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "preferredName" VARCHAR(240),
  "preferredLocale" VARCHAR(24) NOT NULL DEFAULT 'es-MX',
  "contactPreference" "SchedulerCustomerContactPreference" NOT NULL DEFAULT 'WHATSAPP',
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCustomerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCustomerProfile_version_check" CHECK ("version" > 0)
);

CREATE TABLE "SchedulerCustomerAlias" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "kind" "SchedulerCustomerAliasKind" NOT NULL DEFAULT 'NAME',
  "value" VARCHAR(320) NOT NULL,
  "normalizedValue" VARCHAR(320) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCustomerAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerCustomerEmail" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "normalizedEmail" VARCHAR(320) NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "verifiedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCustomerEmail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerCustomerFieldDefinition" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "key" VARCHAR(80) NOT NULL,
  "normalizedKey" VARCHAR(80) NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "type" "SchedulerCustomerFieldType" NOT NULL,
  "options" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCustomerFieldDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCustomerFieldDefinition_version_check" CHECK ("version" > 0),
  CONSTRAINT "SchedulerCustomerFieldDefinition_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerCustomerFieldValue" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "definitionVersionSnapshot" INTEGER NOT NULL,
  "value" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCustomerFieldValue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCustomerFieldValue_definition_version_check" CHECK (
    "definitionVersionSnapshot" > 0
  )
);

CREATE TABLE "SchedulerCustomerMergeEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceCustomerId" TEXT NOT NULL,
  "targetCustomerId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "targetSnapshot" JSONB NOT NULL,
  "reassignedRelations" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerCustomerMergeEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCustomerMergeEvent_distinct_customers_check" CHECK (
    "sourceCustomerId" <> "targetCustomerId"
  )
);

CREATE INDEX "Customer_phoneNormalized_active_idx"
  ON "Customer"("phoneNormalized", "active");
CREATE UNIQUE INDEX "SchedulerCustomerProfile_customerId_key"
  ON "SchedulerCustomerProfile"("customerId");
CREATE INDEX "SchedulerCustomerProfile_active_idx"
  ON "SchedulerCustomerProfile"("active");
CREATE UNIQUE INDEX "SchedulerCustomerAlias_customerId_kind_normalizedValue_key"
  ON "SchedulerCustomerAlias"("customerId", "kind", "normalizedValue");
CREATE INDEX "SchedulerCustomerAlias_kind_normalizedValue_active_idx"
  ON "SchedulerCustomerAlias"("kind", "normalizedValue", "active");
CREATE UNIQUE INDEX "SchedulerCustomerEmail_customerId_normalizedEmail_key"
  ON "SchedulerCustomerEmail"("customerId", "normalizedEmail");
CREATE INDEX "SchedulerCustomerEmail_normalizedEmail_active_idx"
  ON "SchedulerCustomerEmail"("normalizedEmail", "active");
CREATE UNIQUE INDEX "SchedulerCustomerFieldDefinition_scope_version_key"
  ON "SchedulerCustomerFieldDefinition"("commerceId", "normalizedKey", "version");
CREATE INDEX "SchedulerCustomerFieldDefinition_active_key_idx"
  ON "SchedulerCustomerFieldDefinition"("commerceId", "active", "normalizedKey");
CREATE UNIQUE INDEX "SchedulerCustomerFieldValue_customerId_definitionId_key"
  ON "SchedulerCustomerFieldValue"("customerId", "definitionId");
CREATE INDEX "SchedulerCustomerFieldValue_definitionId_idx"
  ON "SchedulerCustomerFieldValue"("definitionId");
CREATE INDEX "SchedulerCustomerMergeEvent_sourceCustomerId_creadoEn_idx"
  ON "SchedulerCustomerMergeEvent"("sourceCustomerId", "creadoEn");
CREATE INDEX "SchedulerCustomerMergeEvent_targetCustomerId_creadoEn_idx"
  ON "SchedulerCustomerMergeEvent"("targetCustomerId", "creadoEn");
CREATE INDEX "SchedulerCustomerMergeEvent_actorUserId_creadoEn_idx"
  ON "SchedulerCustomerMergeEvent"("actorUserId", "creadoEn");

ALTER TABLE "SchedulerCustomerProfile"
  ADD CONSTRAINT "SchedulerCustomerProfile_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerAlias"
  ADD CONSTRAINT "SchedulerCustomerAlias_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerEmail"
  ADD CONSTRAINT "SchedulerCustomerEmail_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerFieldDefinition"
  ADD CONSTRAINT "SchedulerCustomerFieldDefinition_commerceId_fkey"
  FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerFieldValue"
  ADD CONSTRAINT "SchedulerCustomerFieldValue_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerFieldValue"
  ADD CONSTRAINT "SchedulerCustomerFieldValue_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "SchedulerCustomerFieldDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerMergeEvent"
  ADD CONSTRAINT "SchedulerCustomerMergeEvent_sourceCustomerId_fkey"
  FOREIGN KEY ("sourceCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerMergeEvent"
  ADD CONSTRAINT "SchedulerCustomerMergeEvent_targetCustomerId_fkey"
  FOREIGN KEY ("targetCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerMergeEvent"
  ADD CONSTRAINT "SchedulerCustomerMergeEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
