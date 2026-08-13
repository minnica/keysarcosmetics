-- AlterTable
ALTER TABLE "Sucursal"
ADD COLUMN "metaMensual" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "desactivadaEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Sucursal_activa_idx" ON "Sucursal"("activa");
