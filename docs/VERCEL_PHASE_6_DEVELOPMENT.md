# Vercel Fase 6 — despliegues selectivos completos en `develop`

> Fecha de implementación en repositorio: 5 de septiembre de 2026  
> Estado: **implementada en repositorio; activación y evidencia remota pendientes**  
> Producción: sin cambios

## Resultado

El workflow `Vercel selective frontends and production shadow` amplía el piloto de HR a
los cinco proyectos activos: Envelope, Finance, HR, Payroll y Scheduler. La
selección continúa ejecutándose únicamente después de una CI verde del SHA
exacto. En `master` permanece diagnóstica; sólo `develop` puede construir,
crear un Preview y mover un alias.

Cada fila seleccionada usa controles independientes por proyecto:

- flag de activación;
- token de deployment y project ID;
- bypass de Deployment Protection;
- alias estable;
- grupo de concurrencia `vercel-development-<app>`;
- validación remota de Root Directory, framework, Node, comandos, output y
  nombres de variables Preview;
- reutilización de un deployment `READY` del mismo SHA;
- comprobación de `origin/develop` inmediatamente antes del alias;
- verificación del deployment inmutable y del alias mediante
  `meta[name="keysar-release"]`.

La matriz admite como máximo dos builds simultáneos. Un proyecto cuyo flag no
esté activo registra la omisión y no instala, construye, despliega ni modifica
aliases. Los flags permiten migrar una aplicación por vez sin abrir los demás
proyectos.

## Contrato canónico por proyecto

`scripts/vercel-deployment-state-lib.mjs` es la fuente versionada de este
contrato. `scripts/inspect-vercel-development-project.mjs` lo compara por API
antes de cualquier build; consulta las variables con `decrypt=false` y el JSON
sanitizado sólo conserva nombres. Una variable requerida ausente o una variable
Preview no declarada bloquean el deployment para forzar revisión explícita.

| App       | Root             | Install                    | Build                                                 | Output     | Variable Preview requerida |
| --------- | ---------------- | -------------------------- | ----------------------------------------------------- | ---------- | -------------------------- |
| Envelope  | `apps/envelope`  | `cd ../.. && pnpm install` | `cd ../.. && pnpm build --filter=@cosmetics/envelope` | automático | `NEXT_PUBLIC_API_URL`      |
| Finance   | `apps/finance`   | automático                 | automático                                            | automático | ninguna                    |
| HR        | `apps/hr`        | automático                 | automático                                            | automático | ninguna                    |
| Payroll   | `apps/payroll`   | automático                 | `turbo build`                                         | automático | `NEXT_PUBLIC_API_URL`      |
| Scheduler | `apps/scheduler` | automático                 | `turbo build`                                         | `.next`    | `NEXT_PUBLIC_API_URL`      |

Todos deben usar framework `nextjs`, Node `22.x`, Production Branch `master`,
acceso al monorepo fuera del Root Directory y el alias estable de `develop`
inventariado. Scheduler no puede activarse mientras falte
`NEXT_PUBLIC_API_URL` para Preview de `develop`.

## Configuración de GitHub

El secret de lectura `VERCEL_TOKEN_READ_ONLY` permanece a nivel repositorio.
En el environment `development` crear:

| App       | Token                           | Project ID                    | Bypass                           | Alias variable                   |
| --------- | ------------------------------- | ----------------------------- | -------------------------------- | -------------------------------- |
| Envelope  | `VERCEL_TOKEN_ENVELOPE_DEPLOY`  | `VERCEL_PROJECT_ID_ENVELOPE`  | `ENVELOPE_VERCEL_BYPASS_SECRET`  | `VERCEL_ENVELOPE_DEVELOP_ALIAS`  |
| Finance   | `VERCEL_TOKEN_FINANCE_DEPLOY`   | `VERCEL_PROJECT_ID_FINANCE`   | `FINANCE_VERCEL_BYPASS_SECRET`   | `VERCEL_FINANCE_DEVELOP_ALIAS`   |
| HR        | `VERCEL_TOKEN_HR_DEPLOY`        | `VERCEL_PROJECT_ID_HR`        | `HR_VERCEL_BYPASS_SECRET`        | `VERCEL_HR_DEVELOP_ALIAS`        |
| Payroll   | `VERCEL_TOKEN_PAYROLL_DEPLOY`   | `VERCEL_PROJECT_ID_PAYROLL`   | `PAYROLL_VERCEL_BYPASS_SECRET`   | `VERCEL_PAYROLL_DEVELOP_ALIAS`   |
| Scheduler | `VERCEL_TOKEN_SCHEDULER_DEPLOY` | `VERCEL_PROJECT_ID_SCHEDULER` | `SCHEDULER_VERCEL_BYPASS_SECRET` | `VERCEL_SCHEDULER_DEVELOP_ALIAS` |

`VERCEL_ORG_ID` también vive en `development`. Los tokens deben estar
limitados al proyecto indicado cuando el plan de la cuenta lo permita. Nunca
reutilizar tokens productivos, de Fly.io o de Supabase.

Crear como variables de repositorio, inicialmente en `false`:

```text
VERCEL_ENVELOPE_SELECTIVE_ENABLED=false
VERCEL_FINANCE_SELECTIVE_ENABLED=false
VERCEL_HR_SELECTIVE_ENABLED=false
VERCEL_PAYROLL_SELECTIVE_ENABLED=false
VERCEL_SCHEDULER_SELECTIVE_ENABLED=false
VERCEL_DEVELOPMENT_SMOKES_ENABLED=false
```

El environment `development` también requiere `FINANCE_BASE_URL`,
`HR_BASE_URL`, los tres `*_BASE_URL` existentes y
`DEVELOPMENT_API_RELEASE_SHA`. Este último debe ser el SHA completo actualmente
servido por `/health.release`; se actualiza como parte del registro de un deploy
del API de development, nunca se infiere del commit frontend.

## Secuencia de migración remota

El orden recomendado conserva HR como piloto ya preparado y deja Scheduler al
final por su dependencia de configuración:

1. HR;
2. Finance;
3. Envelope;
4. Payroll;
5. Scheduler.

Para cada aplicación:

1. Normalizar Node a `22.x` y confirmar el contrato de la tabla anterior.
2. Crear/validar token, project ID, bypass y alias del environment.
3. Ejecutar `Vercel development frontend operations` con
   `deploy_without_alias` para un SHA completo de `develop` y una
   `change_reference`; conservar los JSON sanitizados y revisar assets/rutas.
4. Ejecutar `publish_existing` con el `dpl_*` verificado,
   `PUBLICAR_DEVELOP` y la misma `change_reference`; comprobar el alias.
5. Ejecutar `rollback` hacia el deployment sano anterior con
   `ROLLBACK_DEVELOP`; volver a publicar el candidato.
6. Cambiar únicamente `VERCEL_<APP>_SELECTIVE_ENABLED=true`.
7. Probar un merge directo y uno compartido. Confirmar un solo deployment, SHA
   exacto, rerun sin build duplicado y duración registrada.
8. Sólo entonces desactivar `createDeployments` de la integración Git para ese
   proyecto. No desconectar el repositorio ni tocar los demás iniciadores.
9. Confirmar en el siguiente merge que no hubo doble deployment.

Si falla cualquier punto, regresar el flag a `false`, reasignar el alias sano y
reactivar temporalmente `createDeployments` sólo para ese proyecto.

## Smokes y manifiesto multiversión

Finance ahora publica `keysar-release`; las cinco apps priorizan
`KEYSAR_RELEASE_SHA` y mantienen `VERCEL_GIT_COMMIT_SHA` como compatibilidad.
Los smokes públicos y el gate de identidad autenticado comprueban cinco SHAs
frontend independientes más el SHA del API.

Cuando los cinco flags estén activos y
`VERCEL_DEVELOPMENT_SMOKES_ENABLED=true`, el workflow ejecuta automáticamente
los smokes de sólo lectura después de la matriz. Para apps afectadas espera el
SHA objetivo; para omitidas conserva su `baseSha`. El artefacto
`release-manifest-development-*` no contiene URLs, cookies, valores de
variables ni bypass secrets.

## Métricas y evidencia pendiente

Cada deployment registra aplicación, deployment ID, URL inmutable, alias, SHA,
reutilización, duración e intento. Los diagnósticos, configuración sanitizada,
resultado del deployment y manifiesto se conservan 30 días.

Antes de declarar la fase operativamente completada, observar al menos cinco
integraciones representativas y registrar:

- deployments solicitados y evitados;
- minutos/duración por app;
- cambios directos, compartidos, documentación y backend exclusivo;
- reintentos y reutilización;
- cualquier falso positivo; falsos negativos obligatoriamente cero;
- ausencia de deployments desde ramas de trabajo;
- un único iniciador por proyecto.

## Alta posterior de CRM, POS web y Landing

Ninguna de estas apps entra en la matriz sólo por existir en el monorepo. Para
darla de alta:

1. crear un proyecto nuevo y confirmar que no sea `keysar-landing` del
   repositorio independiente;
2. fijar Root Directory, Node `22.x`, framework/comandos/output; POS debe usar
   exclusivamente `build:web` y nunca `electron-builder`;
3. agregar `keysar-release` y un smoke público de sólo lectura;
4. registrar el proyecto en `ACTIVE_VERCEL_PROJECTS` y retirarlo de
   `UNPROVISIONED_VERCEL_APPLICATIONS`;
5. agregar token, project ID, bypass, alias y flag separados;
6. ampliar los contratos, manifiesto y CI antes del primer deployment;
7. repetir deploy sin alias, publicación, rollback y aceptación remota;
8. retirar la integración Git automática sólo después de validar el workflow.

## Validación local

La implementación se cierra localmente con:

```text
pnpm deploy:impact:test             36/36
pnpm deploy:pilot:test              13/13
pnpm deploy:development:test         4/4
pnpm deploy:release-manifest:test    5/5
pnpm --filter @cosmetics/e2e type-check
pnpm --filter @cosmetics/{finance,envelope,payroll,scheduler} type-check
pnpm lint                              15/15 workspaces
pnpm type-check                        18/18 tareas
pnpm test:unit                         133/133
KEYSAR_RELEASE_SHA=<sha> pnpm ci:build API, 8 frontends y POS web
```

También pasaron el grafo Turbo, cinco diagnósticos históricos, Prettier,
`git diff --check` y el parse de los cinco workflows YAML modificados. Ninguna
prueba local sustituye credenciales, deployments, alias o smokes remotos.

## Rollback

`Vercel development frontend operations` permite rollback por aplicación y
comparte el grupo de concurrencia del job automático. Indicar app, deployment
`READY`, SHA completo y `ROLLBACK_DEVELOP`; el workflow valida proyecto,
procedencia, release servido y alias final.

Si la causa es el orquestador:

1. poner el flag individual en `false`;
2. restaurar el último alias sano;
3. reactivar temporalmente el iniciador Git sólo en ese proyecto;
4. conservar los otros cuatro proyectos en su estado actual.
