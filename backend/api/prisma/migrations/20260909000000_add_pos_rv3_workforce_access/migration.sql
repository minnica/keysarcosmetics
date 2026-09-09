ALTER TABLE "Position" ADD COLUMN "posDescription" TEXT;
ALTER TABLE "PosMasterCredential" ADD COLUMN "managedByDelegation" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PosDelegatedMasterCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeFingerprint" VARCHAR(64) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosDelegatedMasterCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosDelegatedMasterAssignment" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "grantedByCredentialId" TEXT NOT NULL,
    "revokedByCredentialId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosDelegatedMasterAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosDelegatedMasterCode_codeFingerprint_key" ON "PosDelegatedMasterCode"("codeFingerprint");
CREATE INDEX "PosDelegatedMasterAssignment_employeeId_active_idx" ON "PosDelegatedMasterAssignment"("employeeId", "active");
CREATE INDEX "PosDelegatedMasterAssignment_codeId_active_idx" ON "PosDelegatedMasterAssignment"("codeId", "active");
CREATE INDEX "PosDelegatedMasterAssignment_grantedByCredentialId_idx" ON "PosDelegatedMasterAssignment"("grantedByCredentialId");
CREATE INDEX "PosDelegatedMasterAssignment_revokedByCredentialId_idx" ON "PosDelegatedMasterAssignment"("revokedByCredentialId");

ALTER TABLE "PosDelegatedMasterAssignment" ADD CONSTRAINT "PosDelegatedMasterAssignment_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "PosDelegatedMasterCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosDelegatedMasterAssignment" ADD CONSTRAINT "PosDelegatedMasterAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosDelegatedMasterAssignment" ADD CONSTRAINT "PosDelegatedMasterAssignment_grantedByCredentialId_fkey" FOREIGN KEY ("grantedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosDelegatedMasterAssignment" ADD CONSTRAINT "PosDelegatedMasterAssignment_revokedByCredentialId_fkey" FOREIGN KEY ("revokedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
