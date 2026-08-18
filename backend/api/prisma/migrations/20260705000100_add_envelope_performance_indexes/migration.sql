-- Add indexes for envelope sales filters and reports.
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");
CREATE INDEX "Venta_sucursalId_fecha_idx" ON "Venta"("sucursalId", "fecha");
CREATE INDEX "Venta_vendedorId_fecha_idx" ON "Venta"("vendedorId", "fecha");
CREATE INDEX "Venta_sesionId_idx" ON "Venta"("sesionId");
CREATE INDEX "VentaDetalle_ventaId_idx" ON "VentaDetalle"("ventaId");
CREATE INDEX "VentaDetalle_metodoPagoId_idx" ON "VentaDetalle"("metodoPagoId");
