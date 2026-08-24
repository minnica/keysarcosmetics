-- Add independent Payroll access control by position.
ALTER TABLE "Position"
ADD COLUMN "canManagePayrollAccess" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PositionPayrollScreenPermission" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "screenKey" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionPayrollScreenPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PositionPayrollScreenPermission_positionId_screenKey_key"
ON "PositionPayrollScreenPermission"("positionId", "screenKey");

ALTER TABLE "PositionPayrollScreenPermission"
ADD CONSTRAINT "PositionPayrollScreenPermission_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
