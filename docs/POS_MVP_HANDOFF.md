# Relevo de implementación del MVP POS

> Documento vivo. Actualizado al refinar el plan el 2026-09-16; evidencia técnica del 2026-09-09.
> Rama: `feature/pos-frontend-clean`.
> Referencia: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.

## Estado al relevo

- MVP online RV0–RV7 y RV9 bloqueante: implementado.
- RV10 técnica: 208/208 visual, builds, tipos, lint, unitarias e integración PostgreSQL en `PASS`.
- Siguiente trabajo: RV10-P1–P8 del plan, preparar la demo funcional Windows/API/BD, provisionar datos/credenciales/terminal, comprobar el recorrido y obtener aceptación del PO. Las guías actuales sólo arrancan fixtures visuales.
- Pendientes visuales explícitos: RV3-B01 (copy de cierre/gasto) y RV7-P1/R03 (prompts alias/PIN todavía presentes en corrección/anulación de gastos). No equiparar 208 capturas con cobertura universal del modo API.
- Backlog: revisiones complejas/historial de entregas, administración avanzada de membresías e incidencias Scheduler, RV8/offline, hardware/escala, migraciones/consumidores/limpieza y OP01–OP06 (piloto, respaldo, rollback y release). Agenda externa sólo si se habilita el proveedor HTTP o se conserva como rollback.
- Referencia reconfirmada por GitHub MCP el 2026-09-16: `feature/pos` sigue en `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`. La presentación aprobada gobierna la adaptación del backend; no se rediseña para ajustar contratos.

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
4. Para revisión visual usar fixtures aislados; para revisión funcional preparar el modo API con datos sintéticos persistidos en el entorno autorizado según RV10-P1–P4. El login online inicial actual utiliza Electron. No depender de los directorios `/tmp` de este equipo.
5. Seguir el orden de la sección 6 del plan y cerrar cada check con evidencia. Resolver decisiones de Producto donde estén identificadas; conservar evidencia histórica y probar sólo el alcance afectado.
