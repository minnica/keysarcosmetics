# Scheduler — Fase 10: calidad, migraciones y despliegue

Estado: implementada en repositorio el 4 de septiembre de 2026. La ejecución contra PostgreSQL 16 en CI y los gates de ambientes reales comienzan cuando este cambio llegue a la rama protegida. No se aplicaron migraciones ni se desplegó desde este workspace.

## Alcance entregado

La fase cierra el camino reproducible de calidad y operación sin crear migraciones, seeds operativos ni datos de negocio:

- CI reconstruye las 43 migraciones sobre PostgreSQL 16 vacío.
- CI crea un schema aislado dentro de la PostgreSQL efímera y aplica exactamente las primeras 39 migraciones, hasta `20260904080000_add_scheduler_customers`. Inserta un fixture técnico representativo de sucursal, comercio, profesional, servicio, recurso y cliente; luego aplica las migraciones 40 a 43 y comprueba que el fixture se preservó y que existen tablas representativas de citas, administración, comunicaciones y reportes.
- La integración HTTP real cubre `401`, bootstrap autenticado, replay idempotente, conflicto de versión `409` y la carrera por el último lugar disponible.
- Un gate de carga separado crea 30 sucursales, dos profesionales y dos recursos por sucursal, horarios de 24 horas y 1,440 citas. Exige que la exportación completa mantenga las 1,440 filas, las 30 sucursales y que disponibilidad/exportación terminen por debajo del umbral de CI de 30 segundos.
- Playwright agrega Scheduler al smoke público y a los recorridos autenticados de development. La cuenta E2E sólo recibe `READ` para Agenda, Clientes y Reportes; un guard falla ante cualquier request de escritura.
- `scheduler:release:audit` agrega observabilidad postdespliegue de sólo lectura sobre estados de citas, outbox, eventos internos de Agenda, auditoría, mensajes agotados, locks vencidos y latencia básica de base.
- El workflow protegido `Deploy API` puede activar `AGENDA_PROVIDER=internal` sólo después de migrar, desplegar/verificar API y confirmar una combinación explícita de SHA de Scheduler y SHA de API. El cambio de proveedor requiere `scheduler_frontend_sha` y la confirmación literal `SCHEDULER_INTERNO_VALIDADO`; ambos SHAs pueden ser distintos.

## Gates locales y de CI

### Base vacía

El job `database-integration` de `.github/workflows/ci.yml` usa `postgres:16-alpine`, ejecuta `prisma migrate deploy` contra una base vacía y después ejecuta toda la integración HTTP con `RUN_DATABASE_TESTS=true`.

### Upgrade desde el snapshot de 39 migraciones

El comando es deliberadamente restrictivo:

```bash
SCHEDULER_UPGRADE_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/cosmetics_ci?schema=scheduler_upgrade_ci' \
SCHEDULER_MIGRATION_FIXTURE_CONFIRMATION=EPHEMERAL_ONLY \
scripts/verify-scheduler-migration-path.sh
```

Sólo acepta hosts loopback, una base o schema cuyo nombre contenga `scheduler_upgrade` y la confirmación `EPHEMERAL_ONLY`. La instancia debe ser desechable y el schema debe estar vacío; si el namespace aislado aún no existe, el script lo crea. Nunca vacía ni elimina bases/schemas y nunca debe apuntarse a development compartido o production.

### Carga

```bash
RUN_SCHEDULER_LOAD_TESTS=true \
SCHEDULER_LOAD_MAX_MS=30000 \
pnpm --filter @cosmetics/api test:scheduler:load
```

La prueba escribe un volumen sintético únicamente en la PostgreSQL efímera de CI. El umbral es una puerta de regresión, no un SLO productivo. Antes del corte real debe repetirse con métricas del proveedor de base y latencia de red del ambiente objetivo.

## Configuración E2E y smoke

El environment de GitHub `development` debe agregar:

```text
SCHEDULER_BASE_URL
SCHEDULER_VERCEL_BYPASS_SECRET
E2E_SCHEDULER_EMAIL
E2E_SCHEDULER_PASSWORD
```

La identidad E2E requiere una sucursal de prueba explícita y sólo las capacidades descritas en `apps/e2e/README.md`. No usar `SUPER_ADMIN`, cuentas personales ni capturas/traces con datos reales. Después del deploy ejecutar, en este orden:

1. `Environment smoke tests` para API y shells públicos, indicando por separado los SHA exactos de Envelope, Payroll, Scheduler y API.
2. `Authenticated development E2E` para Agenda, Clientes y Reportes de Scheduler.
3. Revisar que no hubo retries inesperados y conservar el reporte seguro por siete días.

## Despliegue controlado

### Prerrequisitos

- Fase 0 ejecutada y aprobada en el ambiente objetivo.
- Duplicados y relaciones incompletas resueltos; estrategia de backfill aprobada.
- PostgreSQL 16 efímero, integración HTTP y carga verdes en el SHA exacto.
- Storage privado, llaves, catálogos, grants y cuentas E2E provisionados explícitamente.
- Sandbox de mensajería aprobado antes de cambiar `SCHEDULER_MESSAGING_PROVIDER`; permanece `disabled` por defecto.
- Backup y PITR verificados. Para production se registra el instante ISO UTC exacto y se exige `PRODUCCION_RESPALDADA`.

### Secuencia

1. Disparar `Deploy API` desde la rama del ambiente con el SHA que ya pasó CI.
2. Para el primer corte Scheduler activar `activate_scheduler_internal`, indicar el `scheduler_frontend_sha` compatible y escribir `SCHEDULER_INTERNO_VALIDADO`.
3. El workflow valida schemas y pruebas, aplica migraciones aditivas con `prisma migrate deploy` y despliega la API exacta.
4. Verifica `/ready`, exige que `/health.release` coincida con el SHA de API fijado y espera a que `/login` de Scheduler exponga el `scheduler_frontend_sha` aprobado.
5. Registra la pareja comprobada en `scheduler-compatibility-manifest.json`; sólo entonces configura `AGENDA_PROVIDER=internal` en Fly y vuelve a verificar readiness.
6. Ejecuta `scheduler:diagnose` y `scheduler:release:audit` dentro de transacciones `READ ONLY`; publica únicamente JSON agregado por 30 días.
7. Ejecutar los workflows de smoke y E2E de development. Validar manualmente creación/movimiento/cancelación, asistencia y conciliación POS/Scheduler en la sucursal piloto autorizada.
8. Observar durante la ventana acordada errores 5xx, p95/p99 HTTP, `409`, locks/transacciones, outbox, `AgendaSyncEvent` y uso del proveedor. Los logs no deben contener PII, tokens ni destinos descifrados.

No se habilita mensajería por este corte. Su activación conserva el gate de sandbox de Fase 7.

## Auditoría postdespliegue

Development:

```bash
SCHEDULER_RELEASE_AUDIT_ENVIRONMENT=development \
pnpm --filter @cosmetics/api scheduler:release:audit
```

Production requiere además:

```text
SCHEDULER_RELEASE_AUDIT_PRODUCTION_CONFIRMATION=PRODUCCION_SOLO_LECTURA
```

El reporte es agregado y no incluye clientes, teléfonos, destinos, payloads, URLs o secretos. `WARN` indica mensajes que agotaron ocho intentos, locks de outbox con más de diez minutos o eventos de Agenda vencidos/fallidos. Un `WARN` detiene la expansión a más sucursales hasta conciliar la causa.

## Rollback

Las migraciones 37 a 43 son aditivas y no se revierten eliminando tablas o datos. Ante una incidencia del corte:

1. detener la expansión y la creación de nuevas citas desde el canal afectado;
2. cambiar `AGENDA_PROVIDER=http` sólo si las credenciales del adaptador anterior siguen vigentes y su sandbox/contrato fue validado;
3. mantener las citas Scheduler y las tablas `Agenda*` para conciliación; no borrar ni reescribir historiales;
4. desplegar el SHA anterior de API/frontend si el contrato sigue siendo compatible con las columnas aditivas;
5. ejecutar diagnóstico y auditoría `READ ONLY`, conciliar POS/Scheduler y documentar el incidente antes de reactivar.

El rollback del proveedor no corrige automáticamente eventos, beneficios o citas que ya se hayan confirmado. Esos casos se resuelven con los mecanismos idempotentes y compensatorios existentes, nunca con SQL destructivo.

## Evidencia pendiente fuera del repositorio

- Resultado verde del nuevo job CI con PostgreSQL 16.
- Diagnóstico real de Fase 0 y aprobación del backfill por ambiente.
- Prueba de carga desde la red del ambiente objetivo y definición de SLOs reales.
- Backup/PITR verificado con evidencia externa.
- Recorridos HTTP/E2E autenticados y piloto POS/Scheduler sobre development.
- Ventana de observación y aprobación humana antes de production.

Estas evidencias son condiciones de activación, no trabajo que deba simularse ni marcarse como ejecutado desde un workspace sin conexión.
