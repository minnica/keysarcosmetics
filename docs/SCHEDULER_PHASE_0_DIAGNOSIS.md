# Diagnóstico de datos de Scheduler — Fase 0

> Estado: herramienta implementada el 4 de septiembre de 2026. La corrida real
> de development sigue pendiente porque este workspace no puede alcanzar el
> pooler PostgreSQL. No se intentó conectar a production.

## Propósito

`scheduler:diagnose` genera el inventario previo a cualquier modelo, backfill o
restricción de Scheduler. El comando no aplica migraciones, no ejecuta seeds y
no corrige datos. Todas sus consultas se realizan dentro de una transacción
PostgreSQL marcada `READ ONLY`.

El JSON sólo contiene agregados y metadatos técnicos seguros:

- migraciones aplicadas, pendientes, incompletas, revertidas o presentes sólo
  en la base, además de discrepancias de checksum;
- disponibilidad y conteos de las tablas reutilizables;
- sucursales pendientes de perfil, profesionales activados explícitamente y servicios pendientes de perfil/duración;
- empleados candidatos por estado y actividad histórica como facialista, sin
  listar su identidad y sin activarlos automáticamente;
- grupos y filas afectadas por teléfonos duplicados después de una
  normalización diagnóstica que conserva sólo dígitos;
- clasificación de `RegistroCita`, `PosAppointment`, `AgendaResource`,
  `AgendaSlot`, `AgendaReservation` y `AgendaSyncEvent`;
- referencias huérfanas y relaciones que requieren revisión.

No imprime clientes, empleados, nombres, teléfonos, correos, payloads, hashes
de eventos, credenciales, `DATABASE_URL` ni el host de la conexión. Los errores
no reconocidos también se redactan.

## Ejecución en development

La identidad del ambiente es obligatoria. Desde `backend/api`, cargar la
conexión segura de development y guardar la salida fuera del repositorio:

```bash
SCHEDULER_DIAGNOSE_ENVIRONMENT=development \
  pnpm exec dotenv -e .env.dev -- pnpm scheduler:diagnose \
  > /tmp/scheduler-development-diagnosis.json
```

Si la conexión ya se inyectó por el environment protegido:

```bash
SCHEDULER_DIAGNOSE_ENVIRONMENT=development \
  pnpm --filter @cosmetics/api scheduler:diagnose \
  > /tmp/scheduler-development-diagnosis.json
```

No copiar conexiones en la línea de comandos, tickets, documentación o
artefactos. El rol PostgreSQL debería ser de sólo lectura cuando la plataforma
permita provisionarlo; la transacción `READ ONLY` es una defensa adicional.

## Producción

Production requiere autorización explícita del responsable y, de preferencia,
una credencial exclusiva de sólo lectura. El comando además exige esta
confirmación literal:

```bash
SCHEDULER_DIAGNOSE_ENVIRONMENT=production \
SCHEDULER_DIAGNOSE_PRODUCTION_CONFIRMATION=PRODUCCION_SOLO_LECTURA \
  pnpm --filter @cosmetics/api scheduler:diagnose \
  > /tmp/scheduler-production-diagnosis.json
```

Esta confirmación sólo autoriza el diagnóstico. No autoriza migraciones,
backfills, deploys ni cambios de datos.

Antes de cualquier migración de production, un operador debe verificar backup
y recuperación a un punto en el tiempo. Una vez verificados externamente,
puede adjuntar al reporte la hora exacta como evidencia declarativa:

```bash
SCHEDULER_BACKUP_PITR_CONFIRMED_AT=2026-09-04T18:00:00.000Z
```

El script valida el formato, pero no puede comprobar por sí mismo la existencia
ni restaurabilidad del backup. La aprobación operativa continúa siendo humana.

## Interpretación y decisión de backfill

El revisor debe registrar, por ambiente:

| Evidencia | Decisión requerida |
| --- | --- |
| `migrations.pending`, `databaseOnly`, `incomplete`, `checksumMismatches` | Resolver el estado antes de diseñar o aplicar migraciones de Scheduler. |
| `branches.withoutSchedulerProfile` | Definir qué sucursales se activarán. Las no configuradas no aceptarán reservas. |
| `services.withoutDuration` | Después de Fase 2 representa servicios canónicos sin perfil; todo perfil creado ya exige duración positiva. Definir preparación y limpieza antes de activarlo. |
| `professionalCandidates` | Aprobar activaciones explícitas; nunca inferirlas automáticamente por nombre. |
| `customers.duplicateGroups` y `recordsInDuplicateGroups` | Definir saneamiento antes del backfill o de un índice único normalizado. |
| `appointmentInventory` | Separar histórico legado, vínculos POS vigentes y datos externos que sí deban importarse. |
| `incompleteRelations` | Corregir mediante un procedimiento revisado; este comando no muta datos. |

`phoneNormalization = DIGITS_ONLY_V1_DIAGNOSTIC` produce candidatos de
revisión. No prueba que dos registros sean la misma persona y no constituye la
regla final de normalización.

La Fase 0 alcanza su criterio de salida operativo sólo cuando los inventarios
de development y del ambiente objetivo estén revisados y exista una estrategia
de backfill aprobada sin ambigüedades. Hasta entonces no debe iniciarse la
migración canónica de citas.

## Evidencia de implementación local

- Servicio: `backend/api/src/services/scheduler-data-diagnosis.ts`.
- Entrada CLI: `backend/api/scripts/diagnose-scheduler-data.ts`.
- Pruebas: `backend/api/src/services/scheduler-data-diagnosis.test.ts`.
- Comando: `pnpm --filter @cosmetics/api scheduler:diagnose`.
- No se modificaron schemas Prisma, migraciones, seeds, rutas HTTP ni datos.
- El cierre local pasó lint, type-check y build del API, sincronía y validación
  de ambos schemas Prisma, y 89 pruebas unitarias en 17 archivos.
- El 4 de septiembre de 2026 se intentó la corrida con `.env.dev`; la conexión
  fue rechazada por la red del workspace antes de ejecutar el inventario.
