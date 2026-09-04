# Scheduler interno ↔ POS

Runbook técnico y operativo de la Fase 5 de `PLAN_BACKEND_SCHEDULER.md`.
Scheduler es la autoridad de disponibilidad y citas futuras; POS conserva la
autoridad de tickets, pagos, cortesías, membresías y asistencias financieras.

## Selección del proveedor

`AGENDA_PROVIDER` vive únicamente en `backend/api`:

| Valor      | Comportamiento                                                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `internal` | Usa Prisma y el motor Scheduler. Es el valor final y el default cuando la variable no existe. No requiere URL, token, secreto HMAC ni llamadas HTTP externas.                                               |
| `http`     | Conserva temporalmente `HttpAgendaAdapter` y el contrato de Agenda CRM como rollback operativo. Requiere `AGENDA_API_URL`, `AGENDA_API_TOKEN`, `AGENDA_WEBHOOK_SECRET` y opcionalmente `AGENDA_TIMEOUT_MS`. |

Un valor distinto falla cerrado con `AGENDA_INVALID_PROVIDER`. Los webhooks
externos responden `410` cuando el proveedor es interno.

## Flujo interno

1. POS consulta `/api/pos/agenda/availability`. El adaptador interno resuelve
   `PosBranchProfile.code` hacia la sucursal compartida y exige un
   `SchedulerBranchProfile` activo con reservas habilitadas.
2. Los slots se derivan de servicios activos, asignaciones profesionales,
   jornadas, excepciones, bloqueos, recursos, capacidad y citas ocupantes. La
   tabla `AgendaSlot` conserva la proyección entregada a terminales existentes.
3. La preparación de una venta crea intenciones e IDs deterministas en las
   tablas legacy, pero no ocupa capacidad antes del commit local.
4. La transacción serializable del ticket vuelve a resolver servicio,
   profesional, recursos, membresía y disponibilidad, toma advisory locks y
   crea `SchedulerAppointment(origin = POS)`. En el mismo commit crea
   `PosAppointment.schedulerAppointmentId`. Si cualquier validación falla, no
   queda ticket ni cita canónica parcial.
5. Una próxima sesión creada desde Membresías usa exactamente la misma
   validación y enlace.

Una terminal offline continúa sin prometer capacidad. Al conciliar
`TICKET_CREATE` o `AGENDA_MEMBERSHIP_RESERVATION`, el servidor ejecuta esta
misma preparación y confirmación interna; un conflicto queda en el outbox sin
crear una cita o consumir una sesión parcialmente.

Cada credencial POS que cree citas internas debe estar enlazada directa o
indirectamente a un `Usuario` activo. Esta condición conserva el actor exigido
por el historial append-only de Scheduler y falla cerrada con
`SCHEDULER_ACTOR_NOT_LINKED`; no se crea un usuario técnico ni un seed implícito.

## Estados y membresías

Cuando una cita enlazada llega a `ATTENDED`, `CANCELED` o `NO_SHOW`, Scheduler
crea un `AgendaSyncEvent` interno con `providerEventId` único por cita, versión y
registro POS. El evento y sus efectos se confirman en la misma transacción:

- `ATTENDED` actualiza `PosAppointment`, bloquea la membresía y crea como máximo
  una `PosMembershipAttendance`; la última sesión cambia el tarjetón a
  `EXHAUSTED`.
- `CANCELED` libera beneficios `RESERVED`, cancela la cita POS y la intención
  legacy.
- `NO_SHOW` actualiza el estado sin consumir sesiones.

Las tablas `AgendaResource`, `AgendaSlot`, `AgendaReservation` y
`AgendaSyncEvent` se conservan para compatibilidad, rollback y trazabilidad. No
deben consultarse como fuente canónica de disponibilidad en modo interno.

## Corte y rollback

Antes de activar `internal` en un ambiente:

1. Completar y aprobar `scheduler:diagnose`, incluido el inventario de citas
   futuras en `Agenda*`, `PosAppointment` y `RegistroCita`.
2. Reconstruir todas las migraciones sobre PostgreSQL 16 desechable y ejecutar
   la integración concurrente de Fase 4 y los flujos POS con cita.
3. Provisionar explícitamente perfiles de sucursal, servicios, profesionales,
   horarios, recursos y credenciales POS enlazadas a usuario. No usar seeds
   operativos.
4. Probar disponibilidad, venta nueva, clienta nueva/existente, cortesía simple
   y doble, próxima sesión, cancelación, `ATTENDED`, `NO_SHOW`, reintentos y
   último lugar concurrente.
5. Confirmar que los enlaces `schedulerAppointmentId`, asistencias y contadores
   de membresía concilien antes de ampliar sucursales.

El rollback cambia sólo `AGENDA_PROVIDER=http` y reinicia el API con las
credenciales externas válidas. No revierte migraciones ni elimina citas
internas. Las citas ya creadas por Scheduler conservan su autoridad e historial;
el equipo operativo debe decidir cómo atenderlas durante la ventana temporal de
rollback para no aceptar reservas paralelas.

No existe importador automático. Sólo se diseñará uno si el diagnóstico de un
ambiente confirma citas externas futuras vigentes; deberá ser explícito,
idempotente, reejecutable y producir un reporte agregado antes de escribir.

## Verificación local

```bash
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/api lint
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api test
pnpm --filter @cosmetics/api build
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos build
```

La implementación no cambia datos ni llama development, Agenda CRM o
production. Las pruebas reales de migración/HTTP/concurrencia requieren una
PostgreSQL desechable y siguen siendo una puerta previa al corte.
