-- Permite restringir a los vendedores autorizados a sus propias ventas.
ALTER TABLE "Position"
ADD COLUMN "selfDataOnly" BOOLEAN NOT NULL DEFAULT false;
