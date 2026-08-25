# Runbook de integración y release

Este documento define el flujo seguro para promover cambios desde una feature hasta producción. Ningún comando de esta guía debe ejecutarse contra producción fuera del workflow protegido `Deploy API`.

## 1. Configuración inicial en GitHub

Crear los environments `development` y `production`.

En ambos environments configurar estos secretos:

- `DATABASE_URL`: conexión PostgreSQL del ambiente usada por Prisma.
- `DIRECT_URL`: conexión directa de Supabase para migraciones.
- `FLY_API_TOKEN`: deploy token limitado a `cosmetics-api-dev` o `cosmetics-api` según el environment. No usar un token personal de la organización.
- `ENVELOPE_VERCEL_BYPASS_SECRET`: bypass de automatización generado exclusivamente en el proyecto Vercel de Envelope cuando la URL del ambiente esté protegida.
- `PAYROLL_VERCEL_BYPASS_SECRET`: bypass independiente generado en el proyecto Vercel de Payroll cuando la URL del ambiente esté protegida. No reutilizar el secreto de Envelope.

Configurar estas variables:

- `API_BASE_URL`: URL pública del API correspondiente, sin `/` final.
- `ENVELOPE_BASE_URL`: URL del frontend Envelope del ambiente.
- `PAYROLL_BASE_URL`: URL del frontend Payroll del ambiente.

En `production`, habilitar required reviewer, impedir self-review cuando exista otra persona autorizada y deshabilitar bypass de administradores si el plan lo permite.

## 2. Rulesets de ramas

Aplicar estas reglas compartidas a `develop` y `master`:

- Bloquear pushes directos, force-push y eliminación.
- Exigir pull request y resolución de conversaciones.
- Marcar como requeridos los checks `Lint, types and unit tests`, `Production builds` y `Migrations and API integration` del workflow `CI`.

Configurar la estrategia de integración por rama:

- En `develop`, exigir historial lineal, usar squash merge para `feature/* → develop` y activar `Require branches to be up to date before merging`.
- En `master`, usar merge commit para `develop → master`; no hacer squash de releases completas. Mantener desactivado `Require branches to be up to date before merging`: los merge commits de releases anteriores existen solo en `master`, por lo que la rama longeva `develop` aparecería desactualizada aunque los checks del PR y la integración automática sean correctos.
- `master` debe recibir cambios exclusivamente mediante promociones desde `develop`. Si un hotfix excepcional entra directamente a `master`, incorporarlo a `develop` antes de abrir el siguiente release.

Si solo existe una persona desarrolladora, la aprobación de código puede quedar en cero revisores, pero los checks y la protección de producción no deben poder omitirse.

## 3. Flujo de una feature

1. Crear una rama corta desde el `develop` actualizado.
2. Abrir PR hacia `develop`.
3. Esperar CI y revisar el Preview Deployment de Vercel.
4. Para cambios Prisma, confirmar que la migración sea aditiva. SQL destructivo requiere una revisión explícita y el comentario `-- migration-safety: reviewed` dentro de la migración.
5. Hacer squash merge y eliminar la rama.
6. Ejecutar manualmente `Deploy API` hacia `development` cuando cambien API o Prisma.
7. Ejecutar `Environment smoke tests` contra `development`.

Los smoke tests no autentican usuarios ni escriben datos: comprueban `/health`, `/ready`, el contrato JSON 404 y las pantallas de login de Envelope y Payroll. En previews protegidos envían los bypass de automatización mediante headers; las trazas web permanecen desactivadas para que esos secretos no entren en artefactos de Playwright.

## 4. Release a producción

1. Abrir PR `develop → master`, confirmar que GitHub indique que no hay conflictos y esperar los tres checks requeridos del PR. Los fallos opcionales de proveedores externos por cuota, como `Deployment rate limited` de Vercel, no sustituyen ni invalidan esos checks; el frontend debe verificarse por separado antes de promoverlo.
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

## 7. Releases verificadas

| Tag                 | SHA                                        | Ambiente     | Validación                                                                                                                                                            |
| ------------------- | ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prod-2026-08-24.1` | `8e2f8e711d42a552d2799a5e323f4de3d9debed2` | `production` | Backup manual confirmado; 22/22 migraciones aplicadas; `/ready`; smoke `4/4`; login y navegación de solo lectura en Envelope/Payroll; logs observados.                |
| `prod-2026-08-25.1` | `952a675ecf882829e388562a024661300376fefc` | `production` | Node.js 22; backup manual confirmado; deploy protegido; `/health` con SHA exacto; `/ready`; smoke `4/4`; validación funcional manual en Envelope/Payroll; logs sanos. |
