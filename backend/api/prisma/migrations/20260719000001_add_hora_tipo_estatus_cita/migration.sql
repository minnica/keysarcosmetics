CREATE TYPE "TipoAtencionCita" AS ENUM ('FACIAL', 'FACIAL_DOBLE');
CREATE TYPE "EstatusCita" AS ENUM ('ATENDIDA', 'NO_LLEGO', 'CANCELADA');

ALTER TABLE "RegistroCita"
  ADD COLUMN "hora" VARCHAR(5),
  ADD COLUMN "tipoAtencion" "TipoAtencionCita" NOT NULL DEFAULT 'FACIAL',
  ADD COLUMN "estatus" "EstatusCita" NOT NULL DEFAULT 'ATENDIDA';

ALTER TABLE "RegistroCita"
  ADD CONSTRAINT "RegistroCita_hora_formato_check"
  CHECK ("hora" IS NULL OR "hora" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "RegistroCita"
  ADD CONSTRAINT "RegistroCita_estatus_resultado_check"
  CHECK (
    "estatus" = 'ATENDIDA'
    OR (
      "tipoCompra" IS NULL
      AND "montoCompra" = 0
      AND "bonoSalidaTarde" = false
      AND "bonoComida" = false
    )
  );

CREATE INDEX "RegistroCita_estatus_fecha_idx" ON "RegistroCita"("estatus", "fecha");
