-- La relación es nullable para conservar empleados existentes sin inventar una sucursal.
ALTER TABLE "Empleado" ADD COLUMN "sucursalId" TEXT;

CREATE INDEX "Empleado_sucursalId_idx" ON "Empleado"("sucursalId");

ALTER TABLE "Empleado"
ADD CONSTRAINT "Empleado_sucursalId_fkey"
FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
