# Relevo de implementación del MVP POS

> Documento vivo. Actualizado al refinar el plan el 2026-09-16; evidencia técnica del 2026-09-09.
> Rama: `feature/pos-frontend-clean`.
> Referencia: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.

## Estado al relevo

- MVP online RV0–RV7 y RV9 bloqueante: implementado.
- RV10 técnica: 208/208 visual, builds, tipos, lint, unitarias e integración PostgreSQL en `PASS`.
- Checkpoint actual: `RV5-P1`, parcial. Las revisiones minoristas sin dependencias complejas ya materializan ticket, cobros, proyección legacy e inventario en una transacción idempotente y reaparecen al recargar; los originales permanecen append-only y el evento conserva actor, versión, antes/después y diferencias.
- Siguiente trabajo: continuar RV5-P1 con compensaciones de adeudos/entregas, membresías, Agenda, paquetes/cortesías y participación de empresa; esas combinaciones hoy fallan explícitamente con `409` antes de consumir autorización. Después seguir RV6-P1/P2 según la sección 6 del plan. La revisión del PO y sus decisiones quedan aplazadas; `12fb804` basta como dirección visual.
- Pendiente visual explícito: RV3-B01 (copy de cierre/gasto). RV7-P1/R03 quedó cerrado sin modificar `REGISTRO MOCK · CASH MANAGER`. No equiparar 208 capturas históricas con cobertura universal del modo API.
- Backlog: cierre multi-proyección de revisiones complejas, administración avanzada de membresías e incidencias Scheduler, RV8/offline, hardware/escala, migraciones/consumidores/limpieza y OP01–OP06 (piloto, respaldo, rollback y release). Agenda externa sólo si se habilita el proveedor HTTP o se conserva como rollback.
- Referencia reconfirmada por GitHub MCP el 2026-09-16: `feature/pos` sigue en `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`. La presentación aprobada gobierna la adaptación del backend; no se rediseña para ajustar contratos.

## Checkpoint RV5-P1 (2026-09-16, ejecución actual)

- `PosTicketRevisionRequestDto` y su schema estricto reemplazan el `Record<string, unknown>` de la ruta de revisión. El servidor valida clienta, vendedores, líneas, descuentos, estado/importe de pago y detalles comerciales; PAN/CVV siguen prohibidos. El renderer traduce Visa/Mastercard a IDs autoritativos y, al guardar, vuelve a leer el DTO persistido para refrescar Receipts.
- `appendTicketRevision` bloquea el ticket, reconstruye la cotización con catálogo vigente, consume el token de Receipts dentro de la transacción y crea efectos append-only. Los cobros efectivos previos se compensan mediante `REFUND`; el estado revisado usa `REVISION`; ambas operaciones alimentan `Venta`/`VentaDetalle` y `PosLegacySaleProjection`. El delta de productos usa el ledger existente como `COUNT_ADJUSTMENT`. `PosTicketEvent.snapshot` conserva versión 1 del esquema, versión aplicada, antes/después, diferencias e IDs de las proyecciones; `PosTicket` mantiene el resumen efectivo y la lectura superpone la última revisión sin reescribir líneas históricas.
- La integración sobre PostgreSQL 16 local desechable aplicó 45/45 migraciones y pasó 10/10 casos. Rechazó un ticket con adeudo mediante `409` y luego usó la misma autorización en el ticket apto, acreditando que el bloqueo ocurre antes del consumo. Una venta de dos unidades por `100.00` fue revisada a tres por `120.00`; replay de la misma `Idempotency-Key` devolvió el mismo evento, la recarga mostró total/cobro `120.00`, el ledger dejó existencia `7.00`, las operaciones quedaron `SALE 100.00`, `REFUND 100.00`, `REVISION 120.00`, y la suma de proyecciones legacy fue `120.00` con una sola revisión persistida.
- Pasaron tipos de `types`, cliente, API y POS; schemas Prisma sincronizados/válidos; lint API; 136/136 unitarias; build API/POS; manifiesto visual 25/10/11/10 y 208 capturas; comparación dirigida de etiquetas/acciones de `TicketEditDialog` contra `12fb804`; y `git diff --check`. No se repitió la matriz completa porque no cambió markup ni CSS.
- El resultado es `partial`. Para no publicar incoherencia, el servidor rechaza con `409`, antes de consumir autorización, tickets con adeudos/entregas, membresías, citas/Agenda, paquetes/cortesías o participación comercial de empresa. Faltan los motores compensatorios y pruebas de saldos/reportes para esos casos; el check del plan permanece abierto. No se inventó B01/B02/B03 ni se atribuyó aprobación al PO.
- Recurso local conservado: `keysar-rv5-p1-pg-20260916-180318`, detenido, enlazado sólo a `127.0.0.1:55439` mientras estuvo activo y con datos sintéticos. El secreto se generó localmente, no se imprimió ni versionó; no se usó `.env`, seed general ni BD compartida. Informe: `docs/pos-automation/runs/2026-09-16T18-03-18-954Z-RV5-P1.md`.

## Checkpoint RV5-P2 (2026-09-16, evidencia histórica anterior)

- Se añadió el contrato compatible `PosOwedProductDto.deliveries`; es opcional únicamente para bootstraps offline anteriores. Cada evento nuevo contiene folio, fecha operativa e instante, cantidad, `actorCredentialId`, nombre canónico del actor e `inventoryMovementId`. No cambiaron Prisma, migraciones, la versión offline ni datos existentes.
- `backend/api/src/services/pos-tickets.ts` reutiliza una sola inclusión de ticket para detalle, lista y bootstrap. El historial se arma desde `PosOwedProductDeliveryLine`, ordenado por fecha/ID, sin consultas por fila ni reconstrucción desde cantidades agregadas. El endpoint de entrega devuelve el mismo evento autoritativo.
- `owedProductsFromDto` dejó de vaciar el historial. El diálogo existente de ticket en Receipts agrega una sección condicional con producto, cantidad, fecha y actor usando la clase ya aprobada de historial; Customers e Inventory amplían sus líneas existentes con el actor. Los fixtures del baseline no contienen entregas y no cambian su DOM visible.
- Verificación de esta ejecución: tipos de `types`, API client, API y POS; build de API y POS; lint y 135/135 unitarias del API; schemas Prisma sincronizados/válidos; manifiesto visual 25/10/11/10 y 208 capturas; `git diff --check`, todos en `PASS`.
- La integración dirigida creó una PostgreSQL 16 desechable nueva, aplicó 45/45 migraciones y pasó 10/10 casos POS. El caso RV5-P2 registró 1.00 y 2.00 piezas, repitió la primera solicitud con la misma llave sin duplicarla, confirmó estado final `DELIVERED`, actores/fechas/movimientos y paridad entre detalle, lista y filas persistidas.
- Dos corridas previas sobre bases nuevas detectaron exclusivamente carencias del fixture añadido (ubicación de inventario ausente y lectura con un actor sin `RECEIPTS_VIEW`); se corrigió el fixture para crear su ubicación sintética y consultar con el master autorizado. La tercera base nueva pasó completa. Los tres contenedores `keysar-rv5-p2-pg-20260916-171201`, `keysar-rv5-p2-pg-20260916-attempt2` y `keysar-rv5-p2-pg-20260916-attempt3` quedaron detenidos y conservan sus datos locales; no se usó `.env`, seed general ni una BD compartida.
- No se solicitó ni atribuyó aprobación al PO. B01–B03 y el resto del backlog permanecieron sin cambios en esa ejecución. Informe: `docs/pos-automation/runs/2026-09-16T17-12-01-729Z-RV5-P2.md`.

## Checkpoint RV7-P1 (2026-09-16, evidencia histórica anterior)

- Se modificaron `App.tsx` y `CashManagerView.tsx`. En modo API, el control visible `Código master` valida primero un token efímero `CASH_MANAGER_ACCESS`; el código queda sólo en memoria durante el desbloqueo de tres minutos y se usa para solicitar tokens nuevos `CASH_EXPENSE_EDIT` o `CASH_EXPENSE_VOID`, ligados al `PosCashExpense` exacto. No se agregó alias, diálogo ni otro DOM.
- La corrección ahora espera la respuesta del API antes de cerrar el formulario. Si autorización o persistencia fallan, conserva el formulario y muestra el error del servidor. Anulación mantiene la confirmación aprobada y actualiza estado sólo desde el DTO persistido.
- Se reutilizaron sin cambios los endpoints `POST /api/pos/authorizations`, `POST /api/pos/auth/verify`, `PUT /api/pos/expenses/:id` y `POST /api/pos/expenses/:id/void`, así como su auditoría, idempotencia, compensaciones y tokens de un solo uso. No cambiaron Prisma, migraciones, API client ni contratos compartidos.
- El checkpoint inicial quedó parcial por falta de PostgreSQL; su evidencia histórica permanece en `docs/pos-automation/runs/2026-09-16T08-55-40-652Z-RV7-P1.md`.
- En la reanudación, Podman volvió a responder. Se creó el contenedor dedicado `keysar-rv7-p1-pg-20260916-092804`, enlazado sólo a `127.0.0.1`, con secreto generado localmente, y se aplicaron las 45 migraciones a tres bases nuevas: `keysar_rv7_p1`, `keysar_rv7_p1_full` y `keysar_rv7_p1_all`. No se usó `.env`, seed general ni servicio compartido.
- `backend/api/src/pos.integration.test.ts` añade un recorrido HTTP/BD que comprueba 403 sin `CASH_MANAGE`, desbloqueo fallido/correcto, consumo único de `CASH_MANAGER_ACCESS`, corrección y anulación ligadas al gasto, idempotencia, rechazo de tokens reutilizados, importes exactos, compensaciones con neto cero y recarga persistente.
- Verificación de esta reanudación: 45/45 migraciones; 10/10 casos POS y 16/16 pruebas pertinentes de app/POS/memberships; schemas válidos/sincronizados; tipos/lint/135 unitarias del API; tipos/build web del POS; manifiesto visual, ausencia de `window.prompt`, comparación dirigida del control/copy con `12fb804`, Prettier y `git diff --check`, todos en `PASS`.
- El comando completo `test:integration` se repitió sobre la tercera BD totalmente nueva: app, POS y memberships pasaron 16/16 y el bootstrap Scheduler 1/1; sólo fallaron dos casos Scheduler porque conservan citas fijas del 2026-09-11, ya vencidas. No se borraron datos ni se cambió Scheduler fuera de alcance. La matriz pertinente sobre la segunda BD nueva pasó 16/16.
- B01 sigue diferido y `REGISTRO MOCK · CASH MANAGER` no fue modificado. Informe de cierre: `docs/pos-automation/runs/2026-09-16T09-28-04-169Z-RV7-P1.md`.

## Preparación del ejecutor (2026-09-16)

- Guía de arranque/parada/recuperación: `EJECUTOR_PLAN_POS.md`. Sesión nueva por tarea/checkpoint con plan, handoff, estado e informe versionados antes de commit/push; siguiente sesión sólo después de confirmar el SHA remoto.
- Cola: 34 IDs, 13 técnicos habilitados y 21 diferidos. RV8 conserva la exclusión anterior. Sin PO, completar lo técnicamente posible y documentar por separado requisitos de Windows/hardware/infraestructura; no marcar aceptación humana como aprobada.
- El estado inicial de `docs/pos-automation/state.json` no tenía tareas ejecutadas; actualmente conserva los checkpoints publicados de RV7-P1 y RV5-P2. Las pruebas del ejecutor simulan sesiones y remotos locales; no ejecutan ni acreditan nuevamente los recorridos funcionales del POS.
- Validación vigente del ejecutor: 21/21 pruebas aprobadas con `node --test scripts/run-pos-plan.test.mjs`; `--dry-run` selecciona RV5-P1.
- Incidente/reparación del primer ciclo autónomo: RV7-P1 pasó 10/10 casos POS y 16/16 pruebas pertinentes, pero el ejecutor detuvo la publicación al recibir dos fallos Scheduler ajenos por fechas fijas vencidas. Se recuperó y publicó el cierre después de repetir 10/10 sobre otra base nueva. El contrato distingue ahora `failed_unrelated` con evidencia estricta; los fallos pertinentes siguen deteniendo el proceso. La revisión actualizada pasa 19/19 pruebas del ejecutor, incluida publicación simulada de este caso. Próxima tarea: RV5-P2.
- Incidente/reparación posterior: RV5-P2 terminó, se confirmó tanto local como remotamente en `69880e3`, pero una operación Git superó el timeout local de 120 segundos después de publicar y cortó el bucle antes de RV5-P1. El journal se recuperó sin repetir la implementación. El ejecutor ahora reintenta consultas remotas y, ante timeout de `push`, continúa únicamente si confirma el SHA exacto; si el remoto no lo contiene tras tres intentos o diverge, conserva el estado y se detiene. Próxima tarea: RV5-P1.
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
