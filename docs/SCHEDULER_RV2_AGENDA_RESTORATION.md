# Scheduler RV2: Agenda restaurada sobre contratos canónicos

Fecha: 6 de septiembre de 2026  
Rama: `feature/scheduler`  
Base de implementación: `0264e11ead656bbd9138ed5231ad25cd77ca50c2`

## Resultado

RV2 monta la presentación aprobada de Agenda en la ruta operativa `/` y la alimenta exclusivamente con el bootstrap, catálogo, citas, bloqueos, disponibilidad y clientes del backend. `SchedulerHeader`, el panel de recursos, las vistas día/semana/lista, tarjetas y diálogos vuelven a ser la interfaz normal; no se activan fixtures ni `localStorage` operativo cuando una consulta falla.

La fase queda **Implementada; validación pendiente**. TypeScript, pruebas unitarias, lint y build verifican la integración local. La comparación visual en Chromium y los recorridos de escritura contra PostgreSQL desechable siguen pendientes por B06; por ello no se declara `Validada` ni se afirma persistencia comprobada en un ambiente real.

## Arquitectura y datos

| Pieza | Responsabilidad RV2 |
| --- | --- |
| `ApiAgendaWorkspace.tsx` | Orquesta alcance autorizado, consultas, filtros, borradores, mutaciones, conflictos y datos sensibles. |
| `scheduler-agenda-data.ts` | Construye rangos día/semana con guardas UTC, pagina todas las citas y convierte fecha/hora local con zona IANA. |
| `scheduler-agenda-presentation.ts` | Proyecta catálogo, citas, participantes, recursos, bloqueos, excepciones y horarios canónicos a la presentación aprobada. |
| `SchedulerAgendaGrid.tsx` / `SchedulerAgendaList.tsx` | Renderizan día, semana y lista con el mismo estado canónico y sin datasets semanales simulados. |
| `SchedulerCustomerRecordDialog.tsx` | Presenta la ficha autorizada en sólo lectura y purga el detalle al cerrar/cambiar de sesión. |

La carga del rango solicita la primera página de 100 citas y, usando `total`, obtiene en paralelo todas las páginas restantes. Los límites UTC incluyen un día de guarda a cada lado; después la presentación filtra por fecha local de la sucursal para cubrir desfases y cruces de medianoche sin mezclar semanas.

Profesionales y recursos usan IDs de columna con namespace (`professional:*` y `resource:*`). Una cita se proyecta en cada participante/recurso real conservando un único `sourceId`, DTO canónico y `version`; sus servicios múltiples, membresías y roles no se pierden. RV2 no inventa una cola sin asignación: el contrato vigente exige al menos un profesional por servicio (B02).

Los límites visibles provienen de reglas `BRANCH/WORKING` y excepciones activas del catálogo. Los bloqueos persistidos y las excepciones `UNAVAILABLE` se dibujan tanto en día como en semana. El tamaño visual de fila puede seguir siendo una preferencia local, pero nunca autoriza un inicio: el diálogo sólo permite slots devueltos por `/availability`.

Cuando la sesión tiene lectura de `scheduler/administration/status-colors`, Agenda carga la paleta versionada del comercio desde el catálogo administrativo; si no tiene ese permiso usa la paleta visual base. Un fallo de esa consulta no bloquea citas, pero se informa y usa el fallback explícito.

## Flujos operativos

- Búsqueda remota de clientes con debounce, selección de identidad canónica y alta inline sólo con capacidad `clients:WRITE`.
- Creación de cita con una clave de idempotencia estable durante todos los reintentos de la misma intención. Si el flujo crea primero al cliente, su ID se conserva para no duplicarlo al reintentar la cita.
- Edición versionada que conserva todos los servicios, participantes, recursos y membresías de citas multi-servicio. Esas citas no permiten sustituir silenciosamente el servicio desde un control de servicio único.
- Movimiento mediante `/move` cuando sólo cambia horario/asignación; actualización completa cuando cambia cliente, estado inicial, notas o servicio.
- Transiciones de estado con `expectedVersion`; `ARRIVED` y `ATTENDED` permanecen distintos.
- Cancelación de citas con motivo mediante `AlertDialog`; no se borra el registro ni se usa `window.prompt`.
- Alta, edición y cancelación versionada de bloqueos. Las excepciones de disponibilidad se muestran en sólo lectura y remiten a Administración.
- Después de cada mutación se invalida/recarga Agenda, por lo que también se vuelve a consultar disponibilidad. Un `409` conserva el contexto y ofrece recarga; `401`, `403`, errores de red y demás respuestas usan el manejo compartido de API.

## Clientes y finanzas

Ficha, visitas y finanzas se autorizan por separado con tokens opacos de un solo uso ligados al cliente y al propósito. Cada respuesta se conserva en memoria sólo hasta su vencimiento, cierre del diálogo o cambio de usuario. Finanzas es estrictamente de sólo lectura: Scheduler no edita pagos, no borra movimientos y no reemplaza a POS.

El DTO de cita todavía no agrega teléfono, correo, avatar ni precio comercial. La tarjeta muestra su ausencia de forma explícita. La ficha autorizada puede recuperar contacto bajo demanda, sin generar consultas N+1 para cada tarjeta; precio/avatar agregados siguen como brecha B01 para una futura ampliación de contrato.

## Pruebas ejecutadas

```text
pnpm --filter @cosmetics/scheduler type-check   correcto
pnpm --filter @cosmetics/scheduler test         correcto (4 archivos)
pnpm --filter @cosmetics/scheduler lint         correcto; advertencias históricas fuera de RV2
pnpm --filter @cosmetics/scheduler build        correcto (21 páginas)
pnpm --filter @cosmetics/e2e type-check         correcto
pnpm --filter @cosmetics/e2e lint               correcto
Playwright --list (scheduler-development)        correcto; 6 pruebas descubiertas
git diff --check                                correcto
```

`scheduler-agenda-presentation.test.cjs` cubre además columnas profesional/recurso, horarios y cierre canónicos, paginación de 225 citas, rango semanal con guardas y conversión `America/Mexico_City`.

La prueba development `renderiza DTOs controlados sin sustituir sesión ni permisos` agrega columnas y horarios deterministas al catálogo autorizado, intercepta sólo lecturas de catálogo/citas/bloqueos y adjunta `scheduler-agenda-rv2-calendar-1366x768` y `scheduler-agenda-rv2-list-1366x768`. Conserva login, bootstrap, sucursal y permisos reales.

Para producir la evidencia visual en un host compatible:

```bash
pnpm --filter @cosmetics/e2e test:development --project scheduler-development --grep "DTOs controlados"
```

Para validar persistencia se necesita una API conectada a PostgreSQL desechable y una identidad con permisos de escritura. Ejecutar allí, sin datos productivos: crear → recargar → editar/mover → cambiar estado → cancelar; después bloquear → editar → cancelar; repetir con dos sesiones para conflictos de versión/capacidad.

## Pendientes antes de validar RV2

- Comparar con `e9077dd` en los seis viewports de RV0: panel abierto/cerrado, cuatro/muchas columnas, día/semana/lista, modales, vacíos y sólo lectura.
- Ejecutar los recorridos de escritura y concurrencia sobre API/BD desechables.
- Decidir una ampliación agregada para precio/avatar si el PO exige esos datos en cada tarjeta (B01).
- Mantener sin cola visual las citas sin asignación hasta que exista una decisión de producto y contrato backend (B02).

No se modificaron backend, Prisma, variables de entorno, migraciones, seeds, despliegues ni datos operativos.
