# Runbook de integración y release

Este documento define el flujo seguro para promover cambios desde una feature hasta producción. Ningún comando de esta guía debe ejecutarse contra producción fuera del workflow protegido `Deploy API`.

## 1. Configuración inicial en GitHub

Crear los environments `development` y `production`.

En ambos environments configurar estos secretos:

- `DATABASE_URL`: conexión PostgreSQL del ambiente usada por Prisma.
- `DIRECT_URL`: conexión directa de Supabase para migraciones.
- `FLY_API_TOKEN`: deploy token limitado a `cosmetics-api-dev` o `cosmetics-api` según el environment. No usar un token personal de la organización.

Configurar estas variables:

- `API_BASE_URL`: URL pública del API correspondiente, sin `/` final.
- `ENVELOPE_BASE_URL`: URL del frontend Envelope del ambiente.
- `PAYROLL_BASE_URL`: URL del frontend Payroll del ambiente.

En `production`, habilitar required reviewer, impedir self-review cuando exista otra persona autorizada y deshabilitar bypass de administradores si el plan lo permite.

## 2. Rulesets de ramas

Aplicar reglas a `develop` y `master`:

- Bloquear pushes directos, force-push y eliminación.
- Exigir pull request y resolución de conversaciones.
- Exigir que la rama esté actualizada antes del merge.
- Marcar como requeridos los checks `Lint, types and unit tests`, `Production builds` y `Migrations and API integration` del workflow `CI`.
- Usar squash merge para `feature/* → develop`.
- Usar merge commit para `develop → master`; no hacer squash de releases completas.

Si solo existe una persona desarrolladora, la aprobación de código puede quedar en cero revisores, pero los checks y la protección de producción no deben poder omitirse.

## 3. Flujo de una feature

1. Crear una rama corta desde el `develop` actualizado.
2. Abrir PR hacia `develop`.
3. Esperar CI y revisar el Preview Deployment de Vercel.
4. Para cambios Prisma, confirmar que la migración sea aditiva. SQL destructivo requiere una revisión explícita y el comentario `-- migration-safety: reviewed` dentro de la migración.
5. Hacer squash merge y eliminar la rama.
6. Ejecutar manualmente `Deploy API` hacia `development` cuando cambien API o Prisma.
7. Ejecutar `Environment smoke tests` contra `development`.

Los smoke tests no autentican ni escriben datos: comprueban `/health`, `/ready`, el contrato JSON 404 y las pantallas de login de Envelope y Payroll.

## 4. Release a producción

1. Abrir PR `develop → master` y volver a ejecutar todos los checks sobre el SHA exacto.
2. Confirmar en Supabase que existe un backup recuperable o PITR vigente.
3. Hacer merge commit hacia `master`.
4. Ejecutar `Deploy API` seleccionando `production` y escribiendo `PRODUCCION_RESPALDADA`.
5. El workflow fija el SHA de `master` antes de solicitar aprobación, valida schemas, unit tests y build; aplica `prisma migrate deploy`; despliega exactamente ese commit en Fly; espera el health check y consulta `/ready`.
6. En Vercel, revisar el build de producción preparado y promover Envelope/Payroll solo después de que el API esté listo. Se recomienda desactivar la asignación automática del dominio productivo.
7. Ejecutar `Environment smoke tests` contra `production`.
8. Observar errores, latencia y acciones críticas durante al menos 15 minutos.
9. Crear un tag inmutable `prod-AAAA-MM-DD.N` sobre el commit desplegado.

## 5. Rollback

- Frontend: reasignar el dominio al último deployment sano de Vercel.
- API: desplegar el tag o commit anterior mediante Fly.
- Base de datos: no revertir migraciones destructivamente. Las migraciones deben mantener compatibilidad con el API anterior; ante un problema, hacer rollback del código y preparar una migración correctiva hacia adelante.
- Datos: restaurar backup/PITR solo como respuesta a pérdida o corrupción confirmada y siguiendo el procedimiento de Supabase.

Registrar en el incidente el SHA, migraciones aplicadas, hora, impacto y decisión de recuperación.

## 6. Comandos locales

```bash
pnpm lint
pnpm type-check
pnpm test:unit
pnpm ci:build
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
```

Para integración se necesita PostgreSQL desechable, nunca producción:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/cosmetics_ci?schema=public \
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/cosmetics_ci?schema=public \
pnpm --filter @cosmetics/api db:migrate:deploy

RUN_DATABASE_TESTS=true \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/cosmetics_ci?schema=public \
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/cosmetics_ci?schema=public \
JWT_SECRET=integration-test-secret-with-adequate-length \
pnpm test:integration
```

`pnpm format:check:all` existe para medir la deuda histórica de formato, pero todavía no es un check requerido: primero debe hacerse una PR mecánica separada que normalice el repositorio completo.
