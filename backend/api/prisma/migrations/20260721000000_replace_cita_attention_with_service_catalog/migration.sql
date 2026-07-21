-- El flujo de citas aún no tiene capturas: se reemplaza el enum temporal
-- por un catálogo administrable de categorías y subcategorías.
CREATE TABLE "CategoriaAtencion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaAtencion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubcategoriaAtencion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcategoriaAtencion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RegistroCita" DROP COLUMN "tipoAtencion";
ALTER TABLE "RegistroCita" ADD COLUMN "subcategoriaId" TEXT NOT NULL;
DROP TYPE "TipoAtencionCita";

CREATE UNIQUE INDEX "CategoriaAtencion_nombre_key" ON "CategoriaAtencion"("nombre");
CREATE UNIQUE INDEX "SubcategoriaAtencion_categoriaId_nombre_key" ON "SubcategoriaAtencion"("categoriaId", "nombre");
CREATE INDEX "SubcategoriaAtencion_categoriaId_activa_idx" ON "SubcategoriaAtencion"("categoriaId", "activa");
CREATE INDEX "RegistroCita_subcategoriaId_idx" ON "RegistroCita"("subcategoriaId");

ALTER TABLE "SubcategoriaAtencion" ADD CONSTRAINT "SubcategoriaAtencion_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "CategoriaAtencion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroCita" ADD CONSTRAINT "RegistroCita_subcategoriaId_fkey"
  FOREIGN KEY ("subcategoriaId") REFERENCES "SubcategoriaAtencion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
