-- Add access control support
ALTER TABLE "Usuario"
ADD COLUMN "empleadoId" TEXT,
ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN "passwordSetupTokenHash" TEXT,
ADD COLUMN "passwordSetupTokenExpiresAt" TIMESTAMP(3);

ALTER TABLE "Position"
ADD COLUMN "canManageAccess" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PositionScreenPermission" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "screenKey" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionScreenPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_empleadoId_key" ON "Usuario"("empleadoId");
CREATE UNIQUE INDEX "PositionScreenPermission_positionId_screenKey_key" ON "PositionScreenPermission"("positionId", "screenKey");

ALTER TABLE "Usuario"
ADD CONSTRAINT "Usuario_empleadoId_fkey"
FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PositionScreenPermission"
ADD CONSTRAINT "PositionScreenPermission_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
