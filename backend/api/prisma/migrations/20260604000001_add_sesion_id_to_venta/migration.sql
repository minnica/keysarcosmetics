-- AlterTable: añade sesionId nullable a Venta para agrupar ventas del mismo voucher multi-vendedor
ALTER TABLE "Venta" ADD COLUMN "sesionId" TEXT;
