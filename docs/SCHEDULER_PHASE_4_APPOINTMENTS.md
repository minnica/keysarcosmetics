# Scheduler — Fase 4: disponibilidad y citas canónicas

Fecha de implementación en repositorio: 4 de septiembre de 2026.

## Estado y alcance

La Fase 4 está implementada en código y permanece pendiente de reconstrucción e integración sobre PostgreSQL 16 desechable, del diagnóstico real de Fase 0 y de aplicación/provisión controlada en development. No se aplicó ninguna migración a development o production durante la implementación.

La migración `20260904090000_add_scheduler_appointments` es exclusivamente aditiva. No importa datos mock, no crea citas, no modifica filas existentes y no convierte automáticamente `RegistroCita`, `PosAppointment` ni las tablas `Agenda*`.

Scheduler pasa a ser el modelo canónico para nuevas citas una vez que esta fase sea activada. La sustitución del proveedor Agenda usado por POS corresponde a la Fase 5; hasta entonces, `PosAppointment.schedulerAppointmentId` sólo ofrece el vínculo opcional y no cambia el proveedor efectivo de POS.

## Modelo persistente

- `SchedulerAppointment`: cabecera canónica, cliente compartido, perfil de sucursal, zona IANA, intervalo UTC, estado, origen y versión optimista.
- `SchedulerAppointmentService`: uno o más servicios con orden, tiempos de atención/ocupación y snapshots de duración, preparación, limpieza, capacidad, nombre y versión.
- `SchedulerAppointmentParticipant`: uno o varios especialistas por servicio; distingue participante principal y de apoyo.
- `SchedulerAppointmentResource`: recursos y unidades reservadas con snapshot de exclusividad.
- `SchedulerAppointmentStateHistory`: historial append-only de estados y actor `Usuario`.
- `SchedulerScheduleBlock`: bloqueo de sucursal completa, profesional o recurso, con cancelación lógica y versión.
- `SchedulerIdempotencyKey`: resultado append-only de altas, ligado al actor, operación y `Idempotency-Key`.
- `SchedulerAppointmentMembershipBenefit`: reserva, consumo o liberación idempotente de una sesión de membresía.

`PosAppointment.schedulerAppointmentId` admite relacionar uno o varios registros POS con una cita interna sin eliminar sus snapshots ni referencias legacy.

## Tiempo y disponibilidad

Los instantes se guardan en UTC y cada cita/bloque conserva la zona IANA del perfil de sucursal. El endpoint transforma la fecha local usando esa zona y publica inicios cada 15 minutos. Detecta horas locales inexistentes durante cambios de horario y no depende de la zona del proceso Node.js.

La evaluación sigue este orden:

1. Sucursal, comercio y `bookingEnabled` vigentes.
2. Horario recurrente de sucursal y excepciones de fecha.
3. Horario/excepciones del profesional y de cada recurso.
4. Bloqueos administrativos activos.
5. Citas en estados que ocupan agenda.
6. Capacidad del servicio y unidades/exclusividad de recursos.

Ocupan agenda `PENDING`, `RESERVED`, `CONFIRMED`, `ARRIVED` y `WAITING`. `ATTENDED`, `NO_SHOW` y `CANCELED` conservan historia pero liberan disponibilidad futura. Los intervalos son semiabiertos: una cita puede comenzar exactamente cuando termina la anterior.

Una excepción de disponibilidad sólo se acepta si la sesión tiene capacidad `EXCEPTION`, consume una autorización secundaria `AVAILABILITY_OVERRIDE` ligada a la sucursal y proporciona un motivo. La operación queda auditada.

## Contrato HTTP

Todos los endpoints viven bajo `/api/scheduler`, requieren JWT compartido, permiso de `scheduler/agenda` y alcance materializado de sucursal.

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/availability` | Slots por sucursal, servicio, fecha y filtros opcionales de profesional/recurso. |
| `GET` | `/appointments` | Agenda paginada por rango, sucursal, profesional, cliente o estado. |
| `GET` | `/appointments/:id` | Detalle con servicios, participantes, recursos, membresía e historial. |
| `POST` | `/appointments` | Alta transaccional; exige `Idempotency-Key`. |
| `PUT` | `/appointments/:id` | Edición completa con `expectedVersion`. |
| `POST` | `/appointments/:id/move` | Movimiento conservando la separación relativa de servicios. |
| `POST` | `/appointments/:id/status` | Transición de estado validada. |
| `POST` | `/appointments/:id/cancel` | Cancelación lógica con versión y motivo. |
| `GET` | `/blocks` | Bloqueos del rango autorizado. |
| `POST` | `/blocks` | Bloqueo de sucursal, profesional o recurso. |
| `PUT` | `/blocks/:id` | Edición optimista de un bloqueo activo. |
| `POST` | `/blocks/:id/cancel` | Cancelación lógica del bloqueo. |

Las respuestas mantienen `{ success, message, data }`. Un conflicto devuelve HTTP `409` y un código estable, por ejemplo `VERSION_CONFLICT`, `PROFESSIONAL_BUSY`, `RESOURCE_BUSY`, `SERVICE_CAPACITY_EXHAUSTED`, `SCHEDULE_BLOCKED`, `BRANCH_CLOSED` o `MEMBERSHIP_NOT_ELIGIBLE`.

Los contratos compartidos están en `packages/types/src/scheduler.ts`; `createSchedulerApiClient` publica los métodos tipados correspondientes.

## Concurrencia e idempotencia

Crear o reprogramar ocurre en una transacción `SERIALIZABLE`. Antes de revalidar se toman advisory locks ordenados por fecha UTC, sucursal, profesionales y recursos involucrados. Esto evita ciclos de lock y fuerza a que dos solicitudes por el último lugar se revaliden en orden. Los conflictos serializables se reintentan hasta tres veces.

El alta toma además un lock por actor/operación/`Idempotency-Key`. Repetir el mismo payload devuelve el resultado almacenado; reutilizar la llave con otro payload devuelve `409 IDEMPOTENCY_CONFLICT`.

La prueba `scheduler-appointments.integration.test.ts` crea dos solicitudes concurrentes para el último espacio de un profesional y exige exactamente un `201` y un `409 PROFESSIONAL_BUSY`. Sólo debe ejecutarse con `RUN_DATABASE_TESTS=true` contra PostgreSQL desechable con todas las migraciones reconstruidas.

## Membresías

Una cita puede reservar una membresía por servicio. El backend bloquea la fila de `PosClientMembership`, exige la misma clienta, estado `ACTIVE`, sesiones disponibles y, cuando existan, condiciones `schedulerServiceProfileIds` o `serviceItemIds`. Varias líneas de la misma solicitud se contabilizan juntas para no sobre-reservar la última sesión.

El ledger de Scheduler considera `RESERVED` y `CONSUMED` al calcular disponibilidad; cancelar libera sólo reservas no consumidas y `ATTENDED` las marca consumidas una vez. En Fase 4 no se modifica `usedSessions` ni se fabrica una asistencia POS: POS conserva la autoridad financiera y la propagación canónica a su historial se implementará junto con el adaptador interno de Fase 5.

## Activación segura

1. Ejecutar y aprobar `scheduler:diagnose` en el ambiente objetivo.
2. Confirmar backup/PITR antes de cualquier migración compartida.
3. Reconstruir desde cero las 40 migraciones en PostgreSQL 16 desechable.
4. Ejecutar `RUN_DATABASE_TESTS=true pnpm --filter @cosmetics/api test:integration` sólo contra esa base.
5. Verificar manualmente `401/403`, alcance profesional propio, horas locales, horarios/excepciones, bloqueos, clases, recursos, membresías, idempotencia y todos los `409`.
6. Aplicar primero en development con `prisma migrate deploy`; nunca usar `db push`, `migrate reset` ni production como QA.
7. Provisionar comercios, perfiles, horarios, servicios y profesionales mediante decisiones explícitas; no usar mocks como seeds.
8. Conectar la UI de Agenda gradualmente en la Fase 9. Mientras no esté conectada, el backend canónico no convierte en persistentes las reservas locales actuales.

## Validación local de implementación

- Ambos schemas Prisma sincronizados y válidos.
- Type-check de `@cosmetics/types`, `@cosmetics/api-client` y API.
- Lint y build del API.
- 109 pruebas unitarias en 21 archivos.
- La suite concurrente PostgreSQL quedó descubierta como integración opt-in, pero no se ejecutó en este workspace porque no existe una base desechable acreditada.
