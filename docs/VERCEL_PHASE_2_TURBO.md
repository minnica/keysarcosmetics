# Fase 2 — Actualización controlada de Turborepo

> Fecha de integración: 5 de septiembre de 2026.
> Estado: completada mediante la PR #88, con CI y previews de Vercel en verde.

## Resultado

El monorepo usa Turborepo `2.10.5`, fijado exactamente en `package.json` y
`pnpm-lock.yaml`. La configuración usa el schema vigente de Turborepo y la
clave `tasks`.

La versión elegida ofrece `turbo query affected --base <ref> --head <ref>`.
El detector selectivo de la Fase 1 sigue siendo la autoridad de política;
`query affected` se conserva como una segunda señal de diagnóstico del grafo,
no como sustituto silencioso del detector fail-closed.

Durante la validación de la PR, el proyecto Vercel de Envelope necesitó que su
Build Command usara el nombre exacto del workspace:

```text
cd ../.. && pnpm build --filter=@cosmetics/envelope
```

El comando anterior usaba `--filter=envelope`, que Turbo 2 no resuelve como el
paquete `@cosmetics/envelope`. El comando canónico también se comprobó con
Turbo 1.13.4, por lo que no introduce una dependencia irreversible de Turbo 2.
No se promovió manualmente ningún deployment a producción.

## Configuración y hashing

`turbo.json` conserva las tareas `build`, `dev`, `lint`, `test` y `type-check`
con sus dependencias y outputs anteriores. Los cambios son deliberadamente
pequeños:

- `pipeline` se renombra a `tasks`.
- `$schema` apunta a `https://turborepo.com/schema.json`.
- `globalDependencies` deja de incluir `**/.env.*`, `.env` y `.eslintrc.cjs`.
- Los inputs globales quedan en `.nvmrc`, `pnpm-workspace.yaml` y
  `tsconfig.json`.
- `.eslintrc.cjs` se agrega únicamente a `tasks.lint.inputs`, junto con
  `$TURBO_DEFAULT$`.

Los archivos `.env.example` dentro de una app dejan de invalidar globalmente
todos los workspaces. La política del detector continúa tratándolos dentro de
su app cuando participan en el cambio evaluado. El lockfile, `package.json`
raíz y `turbo.json` ya forman parte de los inputs globales internos de Turbo y
no se duplican en `globalDependencies`.

## Comparación del grafo

La línea base se capturó con `turbo run build --dry=json` en `1.13.4` y se
repitió con `2.10.5`. Ambos grafos contienen los 15 workspaces y las 15 tareas
`build`.

| Consumidor                                               | Turbo 1.13.4                        | Turbo 2.10.5 | Resultado  |
| -------------------------------------------------------- | ----------------------------------- | ------------ | ---------- |
| API                                                      | `types`                             | `types`      | Sin cambio |
| Landing, Envelope, Payroll, CRM, Scheduler, Finance y HR | `api-client`, `auth`, `types`, `ui` | Igual        | Sin cambio |
| POS                                                      | `api-client`, `types`, `ui`         | Igual        | Sin cambio |
| UI testbed                                               | `ui`                                | `ui`         | Sin cambio |
| API client                                               | Sin arista de build                 | `types`      | Corregida  |
| Auth                                                     | Sin arista de build                 | `types`      | Corregida  |
| Types, UI y E2E                                          | Sin dependencias de build           | Igual        | Sin cambio |

`@cosmetics/api-client` y `@cosmetics/auth` importan tipos de
`@cosmetics/types`, pero los declaraban sólo como `peerDependency`. Turbo no
creaba una arista `^build` para esa declaración. Ambos manifests ahora lo
declaran como dependencia directa `workspace:*`, en concordancia con el grafo
que usa el detector de la Fase 1.

El script `scripts/verify-turbo-graph.mjs` evita futuras divergencias. Comprueba:

1. que la versión ejecutada coincide exactamente con `package.json`;
2. que no existan dependencias internas declaradas sólo como peer;
3. que cada arista `build` coincida con los manifests actuales;
4. que estén presentes las ocho aplicaciones candidatas y el backend.

Se ejecuta con:

```bash
pnpm turbo:graph:verify
```

## Builds y CI

El job requerido **Production builds** conserva su nombre y ejecuta, en este
orden:

1. `pnpm turbo:graph:verify`;
2. las pruebas de contrato del detector y de releases;
3. `pnpm ci:build`.

`pnpm ci:build` cubre el API y los siete frontends Next.js. POS agrega
`pnpm --filter @cosmetics/pos build:web`, que ejecuta TypeScript y Vite para
producir `dist`/`dist-electron` sin llamar a `electron-builder`. El script
`build` original de POS se conserva para su pipeline Electron.

Los nombres de los cinco checks requeridos no cambiaron:

- `Shared UI contracts`;
- `UI regression canaries`;
- `Lint, types and unit tests`;
- `Production builds`;
- `Migrations and API integration`.

## Evidencia de cierre

| Validación                       | Resultado                                            |
| -------------------------------- | ---------------------------------------------------- |
| `pnpm turbo:graph:verify`        | 15 workspaces, 15 tareas y 9 aplicaciones requeridas |
| `pnpm deploy:impact:test`        | 31/31 casos                                          |
| `pnpm deploy:impact:history`     | 5/5 casos históricos                                 |
| `pnpm lint`                      | 15/15 workspaces                                     |
| `pnpm type-check`                | 15/15 workspaces                                     |
| `pnpm test:unit`                 | 133/133 pruebas del API                              |
| `pnpm test:ui:coverage`          | 39/39; umbrales globales cumplidos                   |
| `pnpm ci:build`                  | API + ocho frontends correctos                       |
| `pnpm install --frozen-lockfile` | Lockfile coherente en CI y Vercel                    |
| GitHub Actions de la PR #88      | Cinco checks requeridos en verde                     |
| Previews Vercel de la PR #88     | Cinco proyectos en verde                             |

La CI de la PR confirmó Node.js `22.23.2`, Chromium y PostgreSQL 16, cerrando
las limitaciones que existían en el sandbox local.

## Criterio de cierre y rollback

La fase quedó cerrada al fusionarse la PR #88 sobre `develop`. Si aparece una
incompatibilidad de Turbo, deben revertirse juntos `package.json`,
`pnpm-lock.yaml`, `turbo.json`, los dos manifests compartidos, el gate de grafo,
el build web de POS y el ajuste de CI.

El Build Command canónico de Envelope puede conservarse durante un rollback a
Turbo 1.13.4 porque fue validado con ambas versiones. Cualquier cambio remoto
posterior debe quedar registrado en la documentación operativa.
