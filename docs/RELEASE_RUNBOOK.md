# Runbook de integración y release

Este documento define el flujo seguro para promover cambios desde una feature hasta producción. Ningún comando de esta guía debe ejecutarse contra producción fuera del workflow protegido `Deploy API`.

## 1. Configuración inicial en GitHub

Crear los environments `development` y `production`.

Para la selección frontend y la auditoría operativa de las Fases 4–9, configurar como secret de
repositorio `VERCEL_TOKEN_READ_ONLY`. Debe ser una credencial
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
- `FINANCE_VERCEL_BYPASS_SECRET` y `HR_VERCEL_BYPASS_SECRET`: bypass separados
  para comprobar los aliases de las dos aplicaciones mock.

En ambos environments, configurar además `VERCEL_ORG_ID` y un token/project ID
por frontend: `VERCEL_TOKEN_<APP>_DEPLOY` y `VERCEL_PROJECT_ID_<APP>` para
`ENVELOPE`, `FINANCE`, `HR`, `PAYROLL` y `SCHEDULER`. Los tokens no se comparten
entre proyectos cuando el plan de Vercel permita ese alcance, y los valores de
production nunca se comparten con development.

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
- `FINANCE_BASE_URL` y `HR_BASE_URL`: aliases estables de las aplicaciones mock.
- `DEVELOPMENT_API_RELEASE_SHA`: SHA completo servido por `/health.release` en
  development; sólo se usa por el smoke automático selectivo.

Como variables de repositorio, mantener `VERCEL_<APP>_SELECTIVE_ENABLED=false`
para los cinco proyectos hasta migrarlos individualmente. Activar
`VERCEL_DEVELOPMENT_SMOKES_ENABLED` sólo después de que los cinco flags estén
en `true` y ya no exista doble iniciador. Los nombres, contrato remoto y orden
de migración están en `docs/VERCEL_PHASE_6_DEVELOPMENT.md`.

Para Fase 8 crear en `production`, inicialmente en `false`,
`VERCEL_<APP>_PRODUCTION_SELECTIVE_ENABLED` para las cinco aplicaciones. Crear
también `VERCEL_<APP>_PRODUCTION_DOMAIN`. HR se activa primero; no cambiar su
flag hasta completar los ensayos y retirar su iniciador Git productivo.

Ante un diff de API, `VERCEL_PRODUCTION_API_GATE_SHA` debe coincidir con el SHA
servido después de `Deploy API`. Ante Prisma,
`VERCEL_PRODUCTION_DATABASE_GATE_SHA` debe coincidir con el SHA de `master` cuya
migración ya fue aplicada. Envelope, Payroll y Scheduler usan además
`VERCEL_<APP>_PRODUCTION_COMPATIBILITY=<frontend_sha>:<api_sha>`. Estos valores
son autorizaciones por release: retirarlos o sustituirlos después del cierre.
Finance y HR no requieren pareja mientras sean independientes del API.
`Vercel production frontend operations` exige adicionalmente
`VERCEL_PRODUCTION_MANUAL_GATE=<frontend_sha>:<api_sha>` antes de cualquier
publicación o rollback manual. Los dos workflows manuales exigen también una
`change_reference` segura y visible en el resumen para ligar el deployment,
publicación o rollback a su cambio o incidente.

Los builds selectivos inyectan `KEYSAR_RELEASE_SHA`; la integración Git
transitoria conserva `VERCEL_GIT_COMMIT_SHA`. Las cinco apps deben publicar
`meta[name="keysar-release"]` antes de retirar su iniciador anterior.

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
3. Esperar CI; las ramas de trabajo no deben crear Preview Deployments.
4. Para cambios Prisma, confirmar que la migración sea aditiva. SQL destructivo requiere una revisión explícita y el comentario `-- migration-safety: reviewed` dentro de la migración.
5. Hacer squash merge y eliminar la rama.
6. Revisar `Vercel selective frontends and production shadow`: debe haber esperado una CI
   verde, publicar la matriz y desplegar únicamente las apps afectadas cuyos
   flags estén activos. Durante la migración, contrastar cada proyecto con su
   integración Git y conservar los artefactos por 30 días.
7. Ejecutar manualmente `Deploy API` hacia `development` cuando cambien API o Prisma.
8. El smoke automático se ejecuta cuando los cinco proyectos ya están migrados;
   también puede ejecutarse `Environment smoke tests` indicando los cinco SHAs
   frontend y el SHA de `/health`.
9. Cuando la combinación vaya a promoverse, ejecutar `Authenticated development E2E` con la misma matriz multiversión.

Los smokes públicos no autentican usuarios ni escriben datos: comprueban
identidad exacta de Envelope, Finance, HR, Payroll, Scheduler y API, `/health`,
`/ready`, el contrato JSON 404, los tres logins y los shells mock. En previews
protegidos envían bypass independientes mediante headers. Traces, screenshots
y video están desactivados.

El E2E autenticado sí inicia sesiones dedicadas, pero continúa siendo de solo
lectura para Envelope, Payroll y Scheduler. Antes de autenticar, también valida
las identidades de Finance y HR, además del API, y publica el mismo manifiesto
de seis componentes. No publica `apps/e2e/.auth`, traces, screenshots ni video.

## 4. Release a producción

Antes de la primera habilitación productiva del POS, completar el recorrido y
obtener un resultado `PASS` del workflow protegido **POS pilot gate** según
`docs/POS_PILOT_RUNBOOK.md`. Las promociones ordinarias de Envelope/Payroll no
quedan bloqueadas por esta puerta, pero ninguna terminal POS debe cambiar a
`VITE_POS_DATA_MODE=api` sin esa evidencia y aprobación operativa.

1. Abrir PR `develop → master`, confirmar que GitHub indique que no hay conflictos y esperar los cinco checks requeridos del PR. Los fallos opcionales de proveedores externos por cuota, como `Deployment rate limited` de Vercel, no sustituyen ni invalidan esos checks; el frontend debe verificarse por separado antes de promoverlo.
2. Confirmar en Supabase que existe un backup recuperable o PITR vigente.
3. Hacer merge commit hacia `master`.
4. Aprobar y revisar `Rehearse selective production without mutations`. Debe
   declarar cero mutaciones, comparar la selección con el deployment amplio,
   identificar los objetivos `READY` de rollback y producir un manifiesto
   teórico de cinco frontends más API. Si falla, no contar la promoción como
   evidencia de la Fase 7 ni continuar sin resolver la causa.
5. Si el reporte exige API o migraciones, ejecutar `Deploy API` seleccionando
   `production` y escribiendo `PRODUCCION_RESPALDADA`. El workflow fija el SHA
   de `master` y valida schemas, unit tests y build. Después ejecuta
   `prisma migrate deploy`, despliega ese commit en Fly y verifica `/health` y
   `/ready`.
   Después fijar los gates `VERCEL_PRODUCTION_API_GATE_SHA` y, cuando aplique,
   `VERCEL_PRODUCTION_DATABASE_GATE_SHA` con los SHAs exactos verificados.
6. Revisar los gates de compatibilidad del reporte: Envelope/Payroll requieren
   compatibilidad hacia atrás; Scheduler requiere una pareja frontend/API
   explícita cuando aplique; Finance/HR son independientes mientras conserven su
   implementación mock.
7. Para cada app compatible afectada, fijar
   `VERCEL_<APP>_PRODUCTION_COMPATIBILITY` con la pareja exacta del reporte y
   aprobar el job productivo. Finance/HR omiten este gate.
8. `Deploy <app> to Production if activated` reutiliza o construye el artefacto
   con variables Production, lo verifica sin dominio, revalida `master` y sólo
   entonces mueve el dominio. Una app no activada conserva su SHA anterior.
9. `Smoke and observe the production release set` ejecuta automáticamente los
   ocho smokes públicos, los recorridos autenticados de Envelope/Payroll y tres
   muestras adicionales durante 15 minutos. También puede ejecutarse
   `Environment smoke tests` manualmente con los seis SHAs servidos.
10. Confirmar que el resumen muestre cero retries, identidades exactas y que se
    eliminaron `storageState` y `test-results`; producción no publica reporte
    HTML, traces, screenshots ni video.
11. Revisar además logs y métricas de Fly/Vercel durante la ventana de 15
    minutos.
12. Crear un tag inmutable `prod-AAAA-MM-DD.N` sobre el commit desplegado y
    limpiar los gates de SHA de esta release.

Antes de activar Fase 8, conservar al menos tres promociones representativas según
`docs/VERCEL_PHASE_7_PRODUCTION_SHADOW.md`. Durante las primeras cinco
promociones después de activar los smokes completos, registrar duración, intento
y resultado desde `GITHUB_STEP_SUMMARY`. Una falla intermitente o un rerun manual
cuenta como flakiness y debe corregirse antes de declarar estable el gate; no
aumentar retries para ocultarla.

## 5. Rollback

- Frontend: ejecutar `Vercel production frontend operations` con `rollback`, el
  `dpl_*`, SHA del `rollbackDrills` y `ROLLBACK_PRODUCCION`. La sombra nunca
  ejecuta esa reasignación.
- API: desplegar el tag o commit anterior mediante Fly.
- Base de datos: no revertir migraciones destructivamente. Las migraciones deben mantener compatibilidad con el API anterior; ante un problema, hacer rollback del código y preparar una migración correctiva hacia adelante.
- Datos: restaurar backup/PITR solo como respuesta a pérdida o corrupción confirmada y siguiendo el procedimiento de Supabase.

Registrar en el incidente el SHA, migraciones aplicadas, hora, impacto y decisión de recuperación.

### 5.1 Redeploy frontend sin cambio de código

Un cambio de variables no genera diff y no debe fingirse con un commit vacío.
Usar el workflow manual de una sola aplicación con el SHA que ya sirve la ruta
estable:

- development: `deploy_without_alias` crea y verifica otro Preview del mismo
  SHA; después `publish_existing` mueve el alias con `PUBLICAR_DEVELOP`;
- production: `deploy_without_domain` construye de nuevo con variables
  Production y `--skip-domain`; después `publish_existing` exige
  `PUBLICAR_PRODUCCION`, gates de API/compatibilidad y observación normal.

En ambas corridas usar la misma `change_reference`. El workflow manual no
reutiliza deployments anteriores al construir, por lo que obtiene un artefacto
nuevo aun cuando el SHA sea igual. Si falla producción, ejecutar `rollback` con
el `dpl_*` sano, su SHA, `ROLLBACK_PRODUCCION` y la referencia del incidente.
El procedimiento completo está en `docs/VERCEL_PHASE_9_OPERATIONS.md`.

### 5.2 Auditoría operativa

`Vercel operations audit` se ejecuta semanalmente y bajo demanda para ambos
environments. Es de sólo lectura y valida manifests, Root Directories, rutas,
ramas y exactamente un iniciador por proyecto. También mide fan-out evitado,
duplicados, fallos del detector y revisiones confirmadas registradas en
`docs/vercel-detector-reviews.json`.

- `transition` es esperado mientras alguna app conserve integración Git;
- `ready` exige Actions activo e integración Git apagada en las cinco apps;
- `blocked` requiere corregir configuración/evidencia antes del siguiente
  release.

Production conserva la aprobación de su environment aunque la auditoría no
mute nada. Revisar y conservar los artefactos sanitizados por 90 días.

## 6. Comandos locales

```bash
pnpm lint
pnpm type-check
pnpm test:ui
pnpm test:ui:visual
pnpm test:unit
pnpm ci:build
pnpm deploy:production-shadow:test
pnpm deploy:production:test
pnpm deploy:operations:test
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
