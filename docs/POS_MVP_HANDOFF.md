# Relevo de implementación del MVP POS

> Documento vivo. Actualizado al refinar el plan el 2026-09-16; evidencia técnica del 2026-09-09.
> Rama: `feature/pos-frontend-clean`.
> Referencia: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.

## Estado al relevo

- MVP online RV0–RV7 y RV9 bloqueante: implementado.
- RV10 técnica: 208/208 visual, builds, tipos, lint, unitarias e integración PostgreSQL en `PASS`.
- Siguiente trabajo: RV7-P1, sustituir los prompts de corrección/anulación de gastos por los controles de autorización aprobados. Seguir después el orden técnico de la sección 6 del plan. La revisión del PO y sus decisiones quedan aplazadas; `12fb804` basta como dirección visual.
- Pendientes visuales explícitos: RV3-B01 (copy de cierre/gasto) y RV7-P1/R03 (prompts alias/PIN todavía presentes en corrección/anulación de gastos). No equiparar 208 capturas con cobertura universal del modo API.
- Backlog: revisiones complejas/historial de entregas, administración avanzada de membresías e incidencias Scheduler, RV8/offline, hardware/escala, migraciones/consumidores/limpieza y OP01–OP06 (piloto, respaldo, rollback y release). Agenda externa sólo si se habilita el proveedor HTTP o se conserva como rollback.
- Referencia reconfirmada por GitHub MCP el 2026-09-16: `feature/pos` sigue en `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`. La presentación aprobada gobierna la adaptación del backend; no se rediseña para ajustar contratos.

## Preparación del ejecutor (2026-09-16)

- Guía de arranque/parada/recuperación: `EJECUTOR_PLAN_POS.md`. Sesión nueva por tarea/checkpoint con plan, handoff, estado e informe versionados antes de commit/push; siguiente sesión sólo después de confirmar el SHA remoto.
- Cola: 34 IDs, 13 técnicos habilitados y 21 diferidos. RV8 conserva la exclusión anterior. Sin PO, completar lo técnicamente posible y documentar por separado requisitos de Windows/hardware/infraestructura; no marcar aceptación humana como aprobada.
- Estado inicial: `docs/pos-automation/state.json`, sin tareas ejecutadas. Las pruebas del ejecutor simulan sesiones y remotos locales; no ejecutan ni acreditan nuevamente los recorridos funcionales del POS.
- Validación del ejecutor: 18/18 pruebas aprobadas con `node --test scripts/run-pos-plan.test.mjs`, `git diff --check` sin errores y `--dry-run` selecciona RV7-P1. No se lanzaron sesiones reales de Codex; la primera ejecución real recomendada es un checkpoint para revisar el flujo completo en este entorno.
- Ningún despliegue, provisionamiento, migración o fase funcional se realizó como parte de esta preparación. No confundir los checks históricos siguientes con verificaciones de hoy.

## Evidencia histórica del MVP (2026-09-09)

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
2. Leer `CLAUDE.md`, `PLAN_RESTAURACION_VISUAL_POS.md`, este handoff, `docs/pos-automation/state.json` y el último informe enlazado. Para ejecución automática seguir `EJECUTOR_PLAN_POS.md`.
3. No modificar el baseline ni presentar el MVP como listo para producción.
4. Para revisión visual usar fixtures aislados; para revisión funcional preparar el modo API con datos sintéticos persistidos en el entorno autorizado según RV10-P1–P4. El login online inicial actual utiliza Electron. No depender de los directorios `/tmp` de este equipo.
5. Seguir el orden de la sección 6 del plan y cerrar cada check con evidencia. Conservar las decisiones de Producto como diferidas hasta retomar al PO; avanzar el resto, conservar evidencia histórica y probar sólo el alcance afectado.
