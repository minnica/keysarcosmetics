-- Fase 1 Scheduler: permisos, alcance, autorización secundaria y auditoría.
-- Migración exclusivamente aditiva. No concede permisos ni crea datos operativos.

ALTER TABLE "Position"
  ADD COLUMN "canManageSchedulerAccess" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "schedulerSelfProfessionalOnly" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AuditLog"
  ADD COLUMN "application" VARCHAR(32) NOT NULL DEFAULT 'POS',
  ADD COLUMN "actorUserId" TEXT;

CREATE TABLE "PositionSchedulerScreenPermission" (
  "id" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "screenKey" VARCHAR(120) NOT NULL,
  "canRead" BOOLEAN NOT NULL DEFAULT false,
  "canWrite" BOOLEAN NOT NULL DEFAULT false,
  "canAdmin" BOOLEAN NOT NULL DEFAULT false,
  "canExport" BOOLEAN NOT NULL DEFAULT false,
  "canOverride" BOOLEAN NOT NULL DEFAULT false,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PositionSchedulerScreenPermission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PositionSchedulerScreenPermission_capability_check" CHECK (
    (NOT "canWrite" AND NOT "canAdmin" AND NOT "canExport" AND NOT "canOverride")
    OR "canRead"
  )
);

CREATE TABLE "PositionSchedulerBranchAssignment" (
  "id" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PositionSchedulerBranchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerSecondaryCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerSecondaryCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerAuthorization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash" VARCHAR(64) NOT NULL,
  "purpose" VARCHAR(80) NOT NULL,
  "screenKey" VARCHAR(120) NOT NULL,
  "scope" JSONB,
  "actorUserId" TEXT NOT NULL,
  "branchId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAuthorization_lifecycle_check" CHECK (
    NOT ("usedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "PositionSchedulerScreenPermission_positionId_screenKey_key"
  ON "PositionSchedulerScreenPermission"("positionId", "screenKey");
CREATE INDEX "PositionSchedulerScreenPermission_screenKey_idx"
  ON "PositionSchedulerScreenPermission"("screenKey");
CREATE UNIQUE INDEX "PositionSchedulerBranchAssignment_positionId_branchId_key"
  ON "PositionSchedulerBranchAssignment"("positionId", "branchId");
CREATE INDEX "PositionSchedulerBranchAssignment_branchId_idx"
  ON "PositionSchedulerBranchAssignment"("branchId");
CREATE UNIQUE INDEX "SchedulerSecondaryCredential_userId_key"
  ON "SchedulerSecondaryCredential"("userId");
CREATE UNIQUE INDEX "SchedulerAuthorization_tokenHash_key"
  ON "SchedulerAuthorization"("tokenHash");
CREATE INDEX "SchedulerAuthorization_actorUserId_purpose_expiresAt_idx"
  ON "SchedulerAuthorization"("actorUserId", "purpose", "expiresAt");
CREATE INDEX "SchedulerAuthorization_branchId_expiresAt_idx"
  ON "SchedulerAuthorization"("branchId", "expiresAt");
CREATE INDEX "AuditLog_application_actorUserId_creadoEn_idx"
  ON "AuditLog"("application", "actorUserId", "creadoEn");

ALTER TABLE "PositionSchedulerScreenPermission"
  ADD CONSTRAINT "PositionSchedulerScreenPermission_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PositionSchedulerBranchAssignment"
  ADD CONSTRAINT "PositionSchedulerBranchAssignment_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PositionSchedulerBranchAssignment"
  ADD CONSTRAINT "PositionSchedulerBranchAssignment_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSecondaryCredential"
  ADD CONSTRAINT "SchedulerSecondaryCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerAuthorization"
  ADD CONSTRAINT "SchedulerAuthorization_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAuthorization"
  ADD CONSTRAINT "SchedulerAuthorization_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
