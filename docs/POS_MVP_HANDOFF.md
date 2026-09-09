# Relevo de implementación del MVP POS

> Documento vivo. Actualizado antes del checkpoint final del 2026-09-09.
> Rama: `feature/pos-frontend-clean`.
> Referencia: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.

## Estado al relevo

- MVP online RV0–RV7 y RV9 bloqueante: implementado.
- RV10 técnica: 208/208 visual, builds, tipos, lint, unitarias e integración PostgreSQL en `PASS`.
- Pendiente externo: aceptación del PO; RV3 conserva B01.
- Backlog: RV8/offline, hardware/piloto/escala, revisión compleja multi-proyección, Agenda externa exhaustiva y limpieza no bloqueante.

## Última evidencia

- PostgreSQL 16, base desechable `keysar_mvp_mvp3`: 45 migraciones y 18/18 pruebas habilitadas.
- API: 25 archivos/135 pruebas unitarias y lint en `PASS`.
- Type-check: types, API client, API y POS en `PASS`.
- Build POS Vite en `PASS`.
- Visual: `/tmp/keysar-pos-mvp-final-candidate-2`; comparación `/tmp/keysar-pos-mvp-final-diff-2/comparison.json`, 208/208 `PASS`, máximo `0.000026235` bajo `0.000027`.

## Qué cambió después de RV4

- Autorizaciones reales sin alterar la UI aprobada en Producto, Receipts, Settings y X-Report.
- Token de Receipts consumible para revisión/cancelación y rechazo de reutilización.
- Identidad completa de clienta creada en Checkout.
- Traducción correcta de Visa/Mastercard entre etiqueta visual e ID del backend.
- Reconstrucción correcta de entrega inicial en apartados desde adeudos.
- Prueba integrada de venta mixta, identidad y cancelación.

## Para continuar desde otra computadora

1. Bajar `feature/pos-frontend-clean` desde `origin`.
2. Leer `CLAUDE.md`, `PLAN_RESTAURACION_VISUAL_POS.md` y `docs/POS_MVP_ONLINE_DELIVERY.md`.
3. No modificar el baseline ni presentar el MVP como listo para producción.
4. Para la revisión del PO usar el build online y fixtures sintéticos; no depender de los directorios `/tmp` de este equipo.
5. Retomar pendientes sólo desde el backlog explícito y con la decisión de Producto correspondiente.
