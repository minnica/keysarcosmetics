-- Distingue una asignación explícita a todas las sucursales de un empleado sin sucursal asignada.
ALTER TABLE "Empleado"
ADD COLUMN "todasSucursales" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Empleado"
ADD CONSTRAINT "Empleado_sucursal_laboral_check"
CHECK (NOT ("todasSucursales" AND "sucursalId" IS NOT NULL));
