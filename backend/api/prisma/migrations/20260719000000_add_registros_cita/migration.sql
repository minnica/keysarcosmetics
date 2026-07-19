CREATE TYPE "TipoCompraCita" AS ENUM ('PAGO_NETO', 'COMPRA_CON_APARTADO', 'PAGO_DE_APARTADO');

CREATE TABLE "RegistroCita" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "facialistaId" TEXT NOT NULL,
    "tipoCompra" "TipoCompraCita",
    "montoCompra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonoSalidaTarde" BOOLEAN NOT NULL DEFAULT false,
    "bonoComida" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroCita_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RegistroCita_compra_consistente_check" CHECK (
      ("tipoCompra" IS NULL AND "montoCompra" = 0)
      OR ("tipoCompra" IS NOT NULL AND "montoCompra" > 0)
    )
);

CREATE INDEX "RegistroCita_fecha_idx" ON "RegistroCita"("fecha");
CREATE INDEX "RegistroCita_sucursalId_fecha_idx" ON "RegistroCita"("sucursalId", "fecha");
CREATE INDEX "RegistroCita_facialistaId_fecha_idx" ON "RegistroCita"("facialistaId", "fecha");
CREATE INDEX "RegistroCita_vendedorId_fecha_idx" ON "RegistroCita"("vendedorId", "fecha");
CREATE INDEX "RegistroCita_creadoPorId_idx" ON "RegistroCita"("creadoPorId");

ALTER TABLE "RegistroCita" ADD CONSTRAINT "RegistroCita_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroCita" ADD CONSTRAINT "RegistroCita_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroCita" ADD CONSTRAINT "RegistroCita_facialistaId_fkey" FOREIGN KEY ("facialistaId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroCita" ADD CONSTRAINT "RegistroCita_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
