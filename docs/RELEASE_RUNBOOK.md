# Runbook de integración y release

Este documento define el flujo seguro para promover cambios desde una feature hasta producción. Ningún comando de esta guía debe ejecutarse contra producción fuera del workflow protegido `Deploy API`.

## 1. Configuración inicial en GitHub

Crear los environments `development` y `production`.

Mientras la selección frontend permanezca en la Fase 4 diagnóstica, configurar
como secret de repositorio `VERCEL_TOKEN_READ_ONLY`. Debe ser una credencial
dedicada al scope de los cinco proyectos activos. El workflow sólo hace
consultas `GET`; no colocar este token en los environments de API ni reutilizar
`FLY_API_TOKEN` o los bypass de automatización.

En ambos environments configurar estos secretos:

- `DATABASE_URL`: conexión PostgreSQL del ambiente usada por Prisma.
- `DIRECT_URL`: conexión directa de Supabase para migraciones.
- `FLY_API_TOKEN`: deploy token limitado a `cosmetics-api-dev` o `cosmetics-api` según el environment. No usar un token personal de la organización.
- `ENVELOPE_VERCEL_BYPASS_SECRET`: bypass de automatización generado exclusivamente en el proyecto Vercel de Envelope cuando la URL del ambiente esté protegida.
- `PAYROLL_VERCEL_BYPASS_SECRET`: bypass independiente generado en el proyecto Vercel de Payroll cuando la URL del ambiente esté protegida. No reutilizar el secreto de Envelope.
- `SCHEDULER_VERCEL_BYPASS_SECRET`: bypass independiente del proyecto Scheduler cuando la URL del ambiente esté protegida.

Solo en `development`, crear además las cuentas técnicas de mínimo privilegio descritas en `apps/e2e/README.md` y configurar:

- `E2E_ENVELOPE_EMAIL` y `E2E_ENVELOPE_PASSWORD`;
- `E2E_PAYROLL_EMAIL` y `E2E_PAYROLL_PASSWORD`.
- `E2E_SCHEDULER_EMAIL` y `E2E_SCHEDULER_PASSWORD`.

Estas credenciales de development nunca se configuran en `production`. Envelope debe limitarse a `dashboard`, `ventas`, `citas` y `reportes/total-general` con alcance propio; Payroll debe tener únicamente las cinco pantallas E2E documentadas y todas en modo solo lectura; Scheduler sólo recibe `READ` para Agenda, Clientes y Reportes en una sucursal explícita.

Solo en `production`, crear dos cuentas distintas de monitoreo y configurar:

- `PRODUCTION_MONITOR_ENVELOPE_EMAIL` y `PRODUCTION_MONITOR_ENVELOPE_PASSWORD`;
- `PRODUCTION_MONITOR_PAYROLL_EMAIL` y `PRODUCTION_MONITOR_PAYROLL_PASSWORD`.

Envelope productivo recibe únicamente `dashboard` y `reportes/total-general`, con `selfDataOnly = true`, sin permisos virtuales y mediante un empleado exclusivo sin actividad. Payroll recibe únicamente `payroll/esquemas` con `canWrite = false`. Ninguna cuenta puede ser personal, `SUPER_ADMIN` ni compartirse con development. La creación y rotación se hace administrativamente; no agregar seeds, SQL ni credenciales al repositorio.

Configurar estas variables:

- `API_BASE_URL`: URL pública del API correspondiente, sin `/` final.
- `ENVELOPE_BASE_URL`: URL del frontend Envelope del ambiente.
- `PAYROLL_BASE_URL`: URL del frontend Payroll del ambiente.
- `SCHEDULER_BASE_URL`: URL del frontend Scheduler del ambiente.

En los proyectos Vercel de Envelope, Payroll y Scheduler, habilitar **Automatically expose System Environment Variables**. El E2E usa `VERCEL_GIT_COMMIT_SHA` durante el build para comprobar la identidad exacta de cada alias estable.

En `production`, habilitar required reviewer, impedir self-review cuando exista otra persona autorizada y deshabilitar bypass de administradores si el plan lo permite.

## 2. Rulesets de ramas

Aplicar estas reglas compartidas a `develop` y `master`:

- Bloquear pushes directos, force-push y eliminación.
- Exigir pull request y resolución de conversaciones.
- Marcar como requeridos los checks `Shared UI contracts`, `UI regression canaries`, `Lint, types and unit tests`, `Production builds` y `Migrations and API integration` del workflow `CI`.

Configurar la estrategia de integración por rama:

- En `develop`, exigir historial lineal, usar squash merge para `feature/* → develop` y activar `Require branches to be up to date before merging`.
- En `master`, usar merge commit para `develop → master`; no hacer squash de releases completas. Mantener desactivado `Require branches to be up to date before merging`: los merge commits de releases anteriores existen solo en `master`, por lo que la rama longeva `develop` aparecería desactualizada aunque los checks del PR y la integración automática sean correctos.
- `master` debe recibir cambios exclusivamente mediante promociones desde `develop`. Si un hotfix excepcional entra directamente a `master`, incorporarlo a `develop` antes de abrir el siguiente release.

Si solo existe una persona desarrolladora, la aprobación de código puede quedar en cero revisores, pero los checks y la protección de producción no deben poder omitirse.

`Authenticated production smoke` pertenece al workflow manual del environment `production`, no al evento de Pull Request; por ello no se agrega como required status check de rama. Su protección se obtiene mediante el reviewer del environment y el orden obligatorio del runbook. Los cinco nombres requeridos de CI permanecen estables. Después de modificar un nombre de job, auditar y sincronizar ambos rulesets antes de fusionar; no dejar checks requeridos apuntando a nombres obsoletos.

## 3. Flujo de una feature

1. Crear una rama corta desde el `develop` actualizado.
2. Abrir PR hacia `develop`.
3. Esperar CI y revisar el Preview Deployment de Vercel.
4. Para cambios Prisma, confirmar que la migración sea aditiva. SQL destructivo requiere una revisión explícita y el comentario `-- migration-safety: reviewed` dentro de la migración.
5. Hacer squash merge y eliminar la rama.
6. Revisar `Vercel frontend impact diagnostic`: debe haber esperado una CI verde,
   publicar la matriz teórica y declarar cero operaciones de deployment. Durante
   la Fase 4, contrastar su resumen con los deployments que todavía crea la
   integración Git automática y conservar el artefacto por 30 días.
7. Ejecutar manualmente `Deploy API` hacia `development` cuando cambien API o Prisma.
8. Ejecutar `Environment smoke tests` contra `development`, indicando por separado los SHA completos servidos por Envelope, Payroll, Scheduler y `/health`.
9. Cuando la combinación vaya a promoverse, ejecutar `Authenticated development E2E` con la misma matriz multiversión.

Los seis smoke tests públicos no autentican usuarios ni escriben datos: comprueban identidad exacta de Envelope, Payroll, Scheduler y API, `/health`, `/ready`, el contrato JSON 404 y las tres pantallas de login. En previews protegidos envían los bypass de automatización mediante headers. Traces, screenshots y video están desactivados para que secretos o datos no entren en artefactos.

El E2E autenticado sí inicia sesiones dedicadas, pero continúa siendo de solo lectura: Envelope y Payroll conservan ocho recorridos cada una, y Scheduler cubre Agenda, Clientes y Reportes. Un guard bloquea cualquier método de escritura. Antes de autenticar, el workflow compara cada SHA declarado contra el `meta[name="keysar-release"]` de su app y `api_sha` contra `/health.release`; un componente desfasado detiene la promoción. Publica un manifiesto JSON seguro de la combinación verificada. No publicar `apps/e2e/.auth`: contiene JWT/cookies. El reporte HTML no incluye traces, screenshots ni video.

## 4. Release a producción

Antes de la primera habilitación productiva del POS, completar el recorrido y
obtener un resultado `PASS` del workflow protegido **POS pilot gate** según
`docs/POS_PILOT_RUNBOOK.md`. Las promociones ordinarias de Envelope/Payroll no
quedan bloqueadas por esta puerta, pero ninguna terminal POS debe cambiar a
`VITE_POS_DATA_MODE=api` sin esa evidencia y aprobación operativa.

1. Abrir PR `develop → master`, confirmar que GitHub indique que no hay conflictos y esperar los cinco checks requeridos del PR. Los fallos opcionales de proveedores externos por cuota, como `Deployment rate limited` de Vercel, no sustituyen ni invalidan esos checks; el frontend debe verificarse por separado antes de promoverlo.
2. Confirmar en Supabase que existe un backup recuperable o PITR vigente.
3. Hacer merge commit hacia `master`.
4. Ejecutar `Deploy API` seleccionando `production` y escribiendo `PRODUCCION_RESPALDADA`.
5. El workflow fija el SHA de `master` antes de solicitar aprobación, valida schemas, unit tests y build; aplica `prisma migrate deploy`; despliega exactamente ese commit en Fly; espera el health check y consulta `/ready`.
6. En Vercel, revisar el build de producción preparado y promover Envelope/Payroll solo después de que el API esté listo. Se recomienda desactivar la asignación automática del dominio productivo.
7. Ejecutar `Environment smoke tests` contra `production` e indicar los SHA completos realmente servidos por Envelope, Payroll, Scheduler y API. El primer job ejecuta los seis smokes públicos y registra el manifiesto multiversión; si quedan verdes, `Authenticated production smoke` ejecuta tres recorridos de solo lectura por app con las cuentas productivas de monitoreo.
8. Confirmar que el resumen de Actions muestre cero retries en el smoke autenticado y que el workflow eliminó los `storageState` y `test-results`; producción no publica reporte HTML, traces, screenshots ni video.
9. Observar errores, latencia y acciones críticas durante al menos 15 minutos.
10. Crear un tag inmutable `prod-AAAA-MM-DD.N` sobre el commit desplegado.

Durante las primeras cinco promociones después de activar este gate, registrar duración, intento y resultado desde `GITHUB_STEP_SUMMARY`. Una falla intermitente o un rerun manual cuenta como flakiness y debe corregirse antes de declarar estable el gate; no aumentar retries para ocultarla.

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
pnpm test:ui
pnpm test:ui:visual
pnpm test:unit
pnpm ci:build
pnpm test:e2e:development # solo contra development, requiere variables y cuentas técnicas
pnpm test:e2e:production  # solo diagnóstico administrado; validar antes los SHA con test:smoke
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/api pos:reconcile # requiere alcance explícito; ver POS_PILOT_RUNBOOK.md
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
