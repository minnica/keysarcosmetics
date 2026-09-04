# POS ↔ Agenda CRM

Contrato operativo de la Fase 11 de `PLAN_BACKEND_POS.md`. Agenda CRM es la autoridad de disponibilidad y estado de las citas; PostgreSQL conserva la identidad interna, snapshots, trazabilidad de la saga y los efectos financieros o de membresía.

## Límites de confianza

- `AGENDA_API_URL`, `AGENDA_API_TOKEN` y `AGENDA_WEBHOOK_SECRET` existen únicamente en `backend/api`. No deben declararse con prefijos `VITE_` o `NEXT_PUBLIC_`.
- El renderer consume sólo `/api/pos/agenda/*` mediante `@cosmetics/api-client`; nunca llama Agenda directamente.
- Una consulta de disponibilidad es una vista previa. La reserva remota vuelve a validar `externalSlotId`, versión y capacidad.
- Sólo `AVAILABLE` es elegible. Un slot `CANCELED`, `BOOKED`, `BLOCKED` u omitido por Agenda al refrescar el mismo rango se bloquea localmente y no puede reutilizarse.
- POS y Agenda no comparten una transacción ACID. La consistencia se obtiene mediante intención durable, idempotencia estable, estados explícitos y compensaciones.
- Los eventos persistidos contienen IDs y payloads normalizados/redactados. Nombres, teléfonos, correos, tokens y firmas HMAC no aparecen en la cola pública.
- Esta fase cubre ventas online. Una terminal offline no promete capacidad ni llama Agenda; la dependencia explícita del outbox y su estado `PENDING_SYNC` pertenecen a la Fase 14. Hasta entonces, una cita offline conserva su payload y entra en `CONFLICT` al conciliar en vez de crear un ticket sin reserva remota.

## Variables del servidor

| Variable                | Uso                                     |
| ----------------------- | --------------------------------------- |
| `AGENDA_API_URL`        | Base HTTPS del ambiente de Agenda.      |
| `AGENDA_API_TOKEN`      | Bearer token servidor a servidor.       |
| `AGENDA_WEBHOOK_SECRET` | Secreto HMAC SHA-256 para webhooks.     |
| `AGENDA_TIMEOUT_MS`     | Timeout del adaptador; default `10000`. |

La sucursal se identifica ante Agenda mediante `PosBranchProfile.code`. Una sucursal sin perfil/código falla cerrada y no puede consultar ni reservar.

## Contrato HTTP saliente esperado

El adaptador `HttpAgendaAdapter` usa este contrato versionado:

- `GET /v1/availability?branch&from&to&seats&serviceItemId?`
- `POST /v1/clients/upsert`
- `PUT /v1/clients/:externalClientId`
- `POST /v1/reservations`
- `POST /v1/reservations/:externalReservationId/cancel`

Las mutaciones incluyen `Idempotency-Key`. Agenda debe devolver IDs externos estables y una versión positiva; respuestas parciales o esquemas inesperados fallan cerrados.

## Flujo de venta con cita

1. `POST /api/pos/tickets` recibe un `Idempotency-Key` UUID. Cada cita real incluye `agendaSlotId`; `NO_APPOINTMENT` no admite referencias de Agenda.
2. El backend crea `AgendaSyncEvent(CLIENT_UPSERT)` antes del alta/actualización remota y una `AgendaReservation(INTENT)` por unidad antes de reservarla; siempre existe intención durable antes del efecto externo correspondiente.
3. El cliente se crea/actualiza en Agenda con una clave derivada de la operación. `Customer.externalClientId` queda estable y único; cuando ya existe no se vuelve a resolver por nombre o teléfono y una respuesta con otro ID se retiene como conflicto.
4. Se valida sucursal, recurso, slot, horario, versión y capacidad local; Agenda vuelve a validar al reservar.
5. Sólo después de obtener IDs externos se abre la transacción serializable del ticket. El ticket, las citas, membresías, cortesías y snapshots de Agenda se confirman juntos localmente.
6. Si Agenda rechaza, el ticket no se crea. Si el commit local falla, la reserva pasa a `CANCEL_PENDING` y se intenta compensar. El worker conserva reintentos seguros hasta cancelarla.

Una reserva doble simultánea exige dos lugares del mismo slot y recurso `DOUBLE`. Una doble consecutiva exige dos slots contiguos de la misma cabina. En el segundo caso se reservan piernas separadas; cada éxito parcial se persiste antes de continuar y, si falla la segunda, se cancela la primera con otra clave idempotente.

## Webhooks y asistencia

Endpoint público firmado: `POST /api/pos/agenda/webhooks`.

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
| `GET /api/pos/agenda/availability`             | `APPOINTMENTS_VIEW`, `APPOINTMENTS_MANAGE` o `SALE_CREATE` | Actualiza recursos/slots desde Agenda y devuelve sólo capacidad elegible dentro del alcance. Rango máximo: 31 días. |
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

El proceso atiende `CLIENT_UPDATE` y `RESERVATION_CANCEL` en `PENDING`/`FAILED` cuyo `nextAttemptAt` venció. Una compensación remota fallida crea o actualiza durablemente su evento `RESERVATION_CANCEL`; una reserva remota sin cita local y un trabajo abandonado en `PROCESSING` vuelven a ser elegibles tras cinco minutos. Sale con código distinto de cero si alguna operación reclamada vuelve a fallar. Debe programarse como job de un solo disparo y puede ejecutarse concurrentemente: cada evento se reclama de forma condicional y cada cancelación usa la clave idempotente estable de la reserva. La cola y las reservas nunca se eliminan.

Antes de activar un ambiente:

1. Aplicar `20260904020000_add_pos_agenda_integration` mediante el workflow protegido.
2. Configurar las cuatro variables sólo en el backend.
3. Registrar en Agenda el webhook del ambiente y verificar una firma de prueba.
4. Ejecutar los contratos contra sandbox: último lugar concurrente, slot cancelado reutilizado, webhook duplicado/fuera de orden, reserva doble parcial, falla local posterior a reserva y corrección autorizada.
5. Confirmar que la cola no tenga `FAILED`/`CONFLICT` sin resolución antes del piloto.

La implementación local no aplicó la migración ni llamó development, sandbox o producción. Las pruebas reales de contrato permanecen como puerta operativa porque este workspace no dispone de URL, token ni PostgreSQL efímero.
