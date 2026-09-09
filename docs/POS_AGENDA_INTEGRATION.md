# POS ↔ Scheduler interno / Agenda CRM

Contrato original de la Fase 11 de `PLAN_BACKEND_POS.md`, actualizado por la Fase 5 de `PLAN_BACKEND_SCHEDULER.md`. Scheduler interno es ahora la autoridad final de disponibilidad y citas futuras. El adaptador HTTP de Agenda CRM se conserva temporalmente como rollback explícito; PostgreSQL mantiene los enlaces, snapshots, trazabilidad y efectos de membresía.

La operación y el checklist vigentes están en `docs/SCHEDULER_PHASE_5_POS_INTEGRATION.md`. Las secciones HTTP de este documento describen exclusivamente el modo de rollback.

## Límites de confianza

- `AGENDA_PROVIDER=internal|http` existe únicamente en `backend/api`; `internal` es el default y el destino final.
- `AGENDA_API_URL`, `AGENDA_API_TOKEN` y `AGENDA_WEBHOOK_SECRET` se usan sólo con `AGENDA_PROVIDER=http`. No deben declararse con prefijos `VITE_` o `NEXT_PUBLIC_`.
- El renderer consume sólo `/api/pos/agenda/*` mediante `@cosmetics/api-client`; nunca llama Agenda directamente.
- Una consulta de disponibilidad es una vista previa. La confirmación vuelve a validar `externalSlotId`, versión y capacidad en el proveedor seleccionado y, en modo interno, revalida además todas las reglas canónicas dentro del commit.
- Sólo `AVAILABLE` es elegible. Un slot `CANCELED`, `BOOKED`, `BLOCKED` u omitido por el proveedor al refrescar el mismo rango se bloquea localmente y no puede reutilizarse.
- En modo interno, el ticket, la cita Scheduler y el enlace POS se confirman dentro de la misma transacción serializable. En rollback HTTP, POS y Agenda CRM no comparten una transacción ACID y conservan la saga compensatoria.
- Los eventos persistidos contienen IDs y payloads normalizados/redactados. Nombres, teléfonos, correos, tokens y firmas HMAC no aparecen en la cola pública.
- Una terminal offline no promete capacidad ni llama Agenda. Desde la Fase 14, las próximas sesiones se guardan como `AGENDA_MEMBERSHIP_RESERVATION` y la asistencia puede depender explícitamente de ellas. Permanecen `PENDING_SYNC` hasta la validación remota y un rechazo queda `CONFLICT` sin perder el payload cifrado. Véase `docs/POS_OFFLINE_SECOND_PILOT.md`.

## Variables del servidor

| Variable                | Uso                                                         |
| ----------------------- | ----------------------------------------------------------- |
| `AGENDA_PROVIDER`       | `internal` por defecto; `http` sólo como rollback temporal. |
| `AGENDA_API_URL`        | Base HTTPS del ambiente de Agenda.                          |
| `AGENDA_API_TOKEN`      | Bearer token servidor a servidor.                           |
| `AGENDA_WEBHOOK_SECRET` | Secreto HMAC SHA-256 para webhooks.                         |
| `AGENDA_TIMEOUT_MS`     | Timeout del adaptador; default `10000`.                     |

La sucursal se identifica mediante `PosBranchProfile.code`. En modo interno también debe tener `SchedulerBranchProfile` activo y habilitado; una sucursal incompleta falla cerrada.

## Contrato HTTP saliente de rollback

El adaptador `HttpAgendaAdapter` usa este contrato versionado:

- `GET /v1/availability?branch&from&to&seats&serviceItemId?`
- `POST /v1/clients/upsert`
- `PUT /v1/clients/:externalClientId`
- `POST /v1/reservations`
- `POST /v1/reservations/:externalReservationId/cancel`

Las mutaciones incluyen `Idempotency-Key`. Agenda debe devolver IDs externos estables y una versión positiva; respuestas parciales o esquemas inesperados fallan cerrados.

## Flujo de venta con cita en rollback HTTP

1. `POST /api/pos/tickets` recibe un `Idempotency-Key` UUID. Cada cita real incluye `agendaSlotId`; `NO_APPOINTMENT` no admite referencias de Agenda.
2. El backend crea `AgendaSyncEvent(CLIENT_UPSERT)` antes del alta/actualización remota y una `AgendaReservation(INTENT)` por unidad antes de reservarla; siempre existe intención durable antes del efecto externo correspondiente.
3. El cliente se crea/actualiza en Agenda con una clave derivada de la operación. `Customer.externalClientId` queda estable y único; cuando ya existe no se vuelve a resolver por nombre o teléfono y una respuesta con otro ID se retiene como conflicto.
4. Se valida sucursal, recurso, slot, horario, versión y capacidad local; Agenda vuelve a validar al reservar.
5. Sólo después de obtener IDs externos se abre la transacción serializable del ticket. El ticket, las citas, membresías, cortesías y snapshots de Agenda se confirman juntos localmente.
6. Si Agenda rechaza, el ticket no se crea. Si el commit local falla, la reserva pasa a `CANCEL_PENDING` y se intenta compensar. El worker conserva reintentos seguros hasta cancelarla.

Una reserva doble simultánea exige dos lugares del mismo slot y recurso `DOUBLE`. Una doble consecutiva exige dos slots contiguos de la misma cabina. En el segundo caso se reservan piernas separadas; cada éxito parcial se persiste antes de continuar y, si falla la segunda, se cancela la primera con otra clave idempotente.

## Webhooks y asistencia en rollback HTTP

Endpoint público firmado: `POST /api/pos/agenda/webhooks`. En modo interno responde `410`; los estados se propagan mediante eventos transaccionales internos e idempotentes.

Headers obligatorios:

- `X-Agenda-Timestamp`: epoch en segundos.
- `X-Agenda-Signature`: `sha256=<hex>`, calculado sobre `<timestamp>.<raw-body>`.

Se rechazan firmas inválidas y timestamps con más de cinco minutos. El `eventId` es único y `version` ordena eventos por cita:

- Un duplicado no repite efectos.
- Una versión igual o anterior queda `IGNORED`.
- `ATTENDED` marca la cita y, si está ligada a una membresía, consume exactamente una sesión bajo bloqueo de fila.
- `CANCELED` y `NO_SHOW` no consumen.
- Un cambio posterior que contradiga una asistencia o cancelación queda `CONFLICT`. Resolverlo requiere una autorización master de propósito `AGENDA_ATTENDANCE_CORRECTION`, ligada a `AgendaSyncEvent`. La asistencia original permanece append-only y cada cambio agrega `PosMembershipAttendanceCorrection` con delta `-1` o `+1`; incluso correcciones sucesivas compensan el saldo efectivo sin borrar historial.

## Endpoints POS

| Método y ruta                                  | Permiso                                                    | Descripción                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET /api/pos/agenda/availability`             | `APPOINTMENTS_VIEW`, `APPOINTMENTS_MANAGE` o `SALE_CREATE` | Actualiza la proyección de recursos/slots desde el proveedor y devuelve capacidad elegible. Rango máximo: 31 días. |
| `POST /api/pos/agenda/membership-reservations` | `MEMBERSHIPS_MANAGE` + autorización personal               | Reserva la próxima sesión de una membresía vigente en cualquier sucursal autorizada.                                |
| `GET /api/pos/agenda/conflicts`                | `APPOINTMENTS_MANAGE`                                      | Cola paginada y redactada. Los no master sólo ven sucursales autorizadas.                                           |
| `POST /api/pos/agenda/conflicts/retry`         | `APPOINTMENTS_MANAGE`; bulk sólo master                    | Reintenta un evento dentro del alcance o hasta 50 eventos elegibles para master.                                    |
| `POST /api/pos/agenda/attendance-corrections`  | `APPOINTMENTS_MANAGE` + autorización master                | Aplica una compensación auditada.                                                                                   |

`apps/pos` carga disponibilidad mediante la API, envía el slot local en checkout, crea próximas sesiones reales desde Membresías y muestra conflictos/reintentos dentro de Citas. En modo mock conserva el gateway demostrativo aislado.

## Worker y operación

Ejecutar desde `backend/api`:

```bash
pnpm pos:agenda:worker
```

El proceso atiende `CLIENT_UPDATE` y `RESERVATION_CANCEL` en `PENDING`/`FAILED` cuyo `nextAttemptAt` venció. En modo interno actualiza el registro compartido o cancela la cita Scheduler; en modo HTTP ejecuta la compensación remota. Una compensación fallida crea o actualiza durablemente su evento y un trabajo abandonado en `PROCESSING` vuelve a ser elegible tras cinco minutos. Sale con código distinto de cero si alguna operación reclamada vuelve a fallar. Debe programarse como job de un solo disparo y puede ejecutarse concurrentemente: cada evento se reclama de forma condicional y cada cancelación usa la clave idempotente estable de la reserva. La cola y las reservas nunca se eliminan.

Antes de validar el rollback HTTP en un ambiente:

1. Aplicar `20260904020000_add_pos_agenda_integration` mediante el workflow protegido.
2. Configurar `AGENDA_PROVIDER=http` y las cuatro variables HTTP sólo en el backend; para el corte interno no se requieren secretos externos.
3. Registrar en Agenda el webhook del ambiente y verificar una firma de prueba.
4. Ejecutar los contratos contra sandbox: último lugar concurrente, slot cancelado reutilizado, webhook duplicado/fuera de orden, reserva doble parcial, falla local posterior a reserva y corrección autorizada.
5. Confirmar que la cola no tenga `FAILED`/`CONFLICT` sin resolución antes del piloto.

La implementación local no aplicó la migración ni llamó development, sandbox o producción. Las pruebas reales de contrato permanecen como puerta operativa porque este workspace no dispone de URL, token ni PostgreSQL efímero.
