# Auditoría de despliegues Vercel — Fase 0

> Fecha de corte: 4 de septiembre de 2026 en `America/Mexico_City`  
> Captura remota: 5 de septiembre de 2026, 05:14 UTC  
> Rama de trabajo: `chore/vercel-selective-deployments`  
> Commit base: `dd0bb55d678346db5d41da15af96202ce8899826`  
> Estado: **completada**

## 1. Resultado

La Fase 0 de `PLAN_DEPLOYS_SELECTIVOS_VERCEL.md` quedó completada en modo de
sólo lectura. No se modificaron proyectos, deployments, dominios, variables,
integraciones ni protecciones en Vercel o GitHub.

El inventario remoto corrigió dos supuestos del plan:

1. `minnicas-projects` es el scope personal Hobby mostrado como **minnica's
   projects**, no un Team colaborativo. Por eso la API de teams devuelve
   correctamente una lista vacía.
2. Sólo cinco de las ocho aplicaciones candidatas tienen hoy un proyecto Vercel
   conectado a `minnica/keysarcosmetics`: Envelope, Finance, HR, Payroll y
   Scheduler. CRM, POS y `apps/landing` no están desplegadas desde este
   monorepo.

La causa de los deployments innecesarios quedó confirmada con 356 deployments
reales del monorepo: la integración Git automática está habilitada en los cinco
proyectos y no existe una restricción efectiva a `develop`/`master`.

## 2. Fuentes y método

### Repositorio y GitHub

- `CLAUDE.md`, usado como fuente principal de arquitectura y ambientes.
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.nvmrc` y
  `turbo.json`.
- Manifests y configuraciones de las ocho aplicaciones candidatas.
- `.github/workflows/**`, `.github/dependabot.yml`, historia Git y ramas.
- Cuenta GitHub autenticada `minnica` y repositorio
  `minnica/keysarcosmetics`.

### Vercel

El inventario se obtuvo con Vercel CLI autenticada sobre el scope personal
`minnicas-projects`. La exportación fue sanitizada: sólo contiene metadatos,
nombres de variables y configuración; no contiene valores de variables ni
tokens.

Los conectores MCP disponibles no pudieron enumerar este scope porque su ruta
de consulta esperaba Teams. La interfaz de Vercel y la CLI confirmaron que se
trata de un scope personal Hobby y que la cuenta no pertenece a ningún Team.

## 3. Topología remota real

El scope contiene nueve proyectos en total. Sólo estos cinco pertenecen al
monorepo:

| Aplicación | Proyecto Vercel             | Project ID                         | Root Directory   |
| ---------- | --------------------------- | ---------------------------------- | ---------------- |
| Envelope   | `keysarcosmetics-envelope`  | `prj_MW1VnslG2Mggb0nX6N9Z8kBVJg5Q` | `apps/envelope`  |
| Finance    | `keysarcosmetics-finance`   | `prj_XoQfLDHVvsJpm8KI0BjXe63iNLxU` | `apps/finance`   |
| HR         | `keysarcosmetics-hr`        | `prj_xA6FLgKzVeoilLaywaTWwISINQ16` | `apps/hr`        |
| Payroll    | `keysarcosmetics-payroll`   | `prj_fKDCJ7Cw9QZo2MXuJ6oSJIXaJnuO` | `apps/payroll`   |
| Scheduler  | `keysarcosmetics-scheduler` | `prj_lMno72jJXYcPdjurQK0QVD6pTnD3` | `apps/scheduler` |

Aplicaciones candidatas sin proyecto Vercel conectado al monorepo:

| Aplicación     | Estado remoto             |
| -------------- | ------------------------- |
| CRM            | No existe proyecto Vercel |
| POS            | No existe proyecto Vercel |
| `apps/landing` | No existe proyecto Vercel |

El proyecto `keysar-landing` no corresponde a `apps/landing`: usa Astro, no
tiene Root Directory y está conectado al repositorio independiente
`minnica/keysar-landing`. También quedan fuera de alcance `afp`, `garatachia` y
`somosinformaticos`.

## 4. Configuración efectiva de los cinco proyectos

Configuración común:

- repositorio Git conectado: `minnica/keysarcosmetics`;
- Production Branch: `master`;
- framework preset: Next.js;
- acceso a archivos fuera de Root Directory: habilitado;
- creación de deployments por integración Git: habilitada;
- exposición automática de variables de sistema: habilitada;
- asignación automática de dominios: habilitada;
- Git Fork Protection: habilitada;
- Deployment Protection: SSO para todo excepto dominios personalizados;
- Password Protection: deshabilitada;
- Ignored Build Step: no configurado;
- deployment hooks: ninguno;
- runtime Node.js: `24.x`.

La versión remota de Node no coincide con `.nvmrc`, que fija `22.23.2`.

| Proyecto  | Install Command            | Build Command                              | Output     | Skip Unaffected              |
| --------- | -------------------------- | ------------------------------------------ | ---------- | ---------------------------- |
| Envelope  | `cd ../.. && pnpm install` | `cd ../.. && pnpm build --filter=envelope` | Automático | No habilitado explícitamente |
| Finance   | Automático                 | Automático                                 | Automático | Habilitado                   |
| HR        | Automático                 | Automático                                 | Automático | Habilitado                   |
| Payroll   | Automático                 | `turbo build`                              | Automático | Habilitado                   |
| Scheduler | Automático                 | `turbo build`                              | `.next`    | Habilitado                   |

La configuración no está normalizada. Envelope es además el único proyecto sin
`enableAffectedProjectsDeployments` habilitado, lo que explica parte de su
comportamiento distinto ante cambios fuera de su Root Directory.

## 5. Variables y protección

Sólo se registraron nombres y alcance, nunca valores:

| Proyecto  | Variable              | Alcance                                   |
| --------- | --------------------- | ----------------------------------------- |
| Envelope  | `NEXT_PUBLIC_API_URL` | Production y Preview limitado a `develop` |
| Payroll   | `NEXT_PUBLIC_API_URL` | Production y Preview limitado a `develop` |
| Finance   | Ninguna               | —                                         |
| HR        | Ninguna               | —                                         |
| Scheduler | Ninguna               | —                                         |

Scheduler consume `NEXT_PUBLIC_API_URL` en
`apps/scheduler/src/lib/api.ts`, pero no tiene esa variable configurada. En un
deployment remoto cae al valor por defecto `http://localhost:4000`; esto debe
corregirse antes de usar Scheduler como piloto funcional.

La restricción de `NEXT_PUBLIC_API_URL` a Preview de `develop` no restringe la
creación de deployments de otras ramas. Sólo restringe dónde se inyecta la
variable.

## 6. Causa raíz confirmada

1. Los cinco proyectos están conectados al mismo repositorio mediante la
   integración Git automática de Vercel.
2. `createDeployments` está habilitado en todos.
3. No hay una política efectiva que permita únicamente `develop` y `master`.
4. No existe Ignored Build Step ni deployment hook que explique el fan-out.
5. GitHub Actions no llama Vercel CLI, Vercel API ni actions de deployment
   frontend.
6. Turborepo decide y ejecuta tareas dentro de un build ya solicitado, pero no
   es el iniciador de los deployments.

Por tanto, cada push elegible es evaluado por los cinco proyectos. Skip
Unaffected evita parte de los builds cuando Vercel puede demostrar que un
workspace no cambió, pero no impide los previews de feature branches y trata
muchos cambios de raíz o fuera del grafo como globales. Envelope tiene además
esa optimización deshabilitada.

## 7. Línea base de siete días

Ventana solicitada: `2026-08-29T05:14:36Z` a
`2026-09-05T05:14:41Z`. El deployment más antiguo recuperado dentro de la
ventana corresponde al 31 de agosto.

### Totales

| Métrica                  | Valor |
| ------------------------ | ----: |
| Deployments del scope    |   360 |
| Deployments del monorepo |   356 |
| READY                    |   285 |
| ERROR                    |    38 |
| CANCELED                 |    33 |
| Preview                  |   337 |
| Production               |    19 |
| Origen Git               |   350 |
| Redeploy manual          |     6 |
| SHAs únicos              |    75 |

De los 356 deployments del monorepo:

- 42 correspondieron a `develop` o `master`, todos READY;
- 314 correspondieron a otras ramas: **88.2%** del total;
- esos 314 fueron iniciados por Git y terminaron en 243 READY, 38 ERROR y 33
  CANCELED.

### Por proyecto

| Proyecto  | Total | READY | ERROR | CANCELED |
| --------- | ----: | ----: | ----: | -------: |
| Envelope  |    73 |    68 |     5 |        0 |
| Finance   |    71 |    52 |    12 |        7 |
| HR        |    70 |    52 |    11 |        7 |
| Payroll   |    73 |    59 |     5 |        9 |
| Scheduler |    69 |    54 |     5 |       10 |

### Por familia de ramas

| Rama o grupo                 | Deployments | SHAs |
| ---------------------------- | ----------: | ---: |
| `feature/pos-frontend-clean` |         114 |   23 |
| `feature/scheduler`          |          79 |   19 |
| Dependabot                   |          51 |   11 |
| `feature/pos`                |          30 |    6 |
| `chore/*`                    |          20 |    4 |
| `prototype/payroll-ui`       |          10 |    2 |
| `fix/*`                      |          10 |    2 |
| `develop`                    |          23 |    5 |
| `master`                     |          19 |    3 |

El patrón dominante fue cinco proyectos por commit: 65 SHAs generaron
exactamente cinco deployments. Tres SHAs generaron siete por redeploys
adicionales; seis generaron uno y uno generó cuatro.

Para 323 deployments con marcas `buildingAt` y `ready`, el tiempo acumulado fue
aproximadamente 222.7 minutos, con media de 0.69, mediana de 0.73 y máximo de
1.88 minutos. Es una aproximación de tiempo transcurrido, no una medida oficial
de facturación o consumo de Vercel.

## 8. Casos correlacionados

| Rama / SHA                               | Cambio observado           | Resultado Vercel                                                                    |
| ---------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `feature/pos` / `866ff7e`                | Trabajo POS                | Cinco deployments: Envelope READY; Finance y HR ERROR; Payroll y Scheduler CANCELED |
| `feature/pos-frontend-clean` / `070e62f` | Sólo plan Markdown de raíz | Cinco deployments: Envelope READY y cuatro CANCELED                                 |
| `feature/pos-frontend-clean` / `6097a4b` | Sólo documentación         | Cuatro READY: Finance, HR, Payroll y Scheduler                                      |
| `feature/scheduler` / `e9c5631`          | Sólo backend/API           | Envelope READY; los cuatro proyectos con Skip Unaffected fueron omitidos            |
| `develop` / `6846ced`                    | Integración compartida     | Los cinco proyectos READY                                                           |

Los ejemplos prueban que el mecanismo es la integración Git por proyecto y que
Skip Unaffected sólo mitiga una parte del problema. También prueban que el
nombre de la rama no determina el impacto: debe usarse el diff y el grafo de
dependencias.

## 9. Puntos de rollback

Todos los deployments productivos actuales sirven el SHA
`6239a23aa05e3898886adfa6cc5722f53aef4001`.

| Proyecto  | Deployment ID                      | URL inmutable                                                      | Dominio productivo                     |
| --------- | ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Envelope  | `dpl_7b1rB5yR62v4yA2xwsyCRJY4NpzK` | `keysarcosmetics-envelope-4r2v4neol-minnicas-projects.vercel.app`  | `keysarcosmetics-envelope.vercel.app`  |
| Finance   | `dpl_FJrg4aLn6Di7ej6fe71Wy6mv1ps8` | `keysarcosmetics-finance-84c13x060-minnicas-projects.vercel.app`   | `keysarcosmetics-finance.vercel.app`   |
| HR        | `dpl_8DfgaUByuz7wbPrs8cVwwuZf5EK6` | `keysarcosmetics-cl22g9uka-minnicas-projects.vercel.app`           | `keysarcosmetics-hr.vercel.app`        |
| Payroll   | `dpl_F48WMbNqByrvvej3ptKMXZwCkcMZ` | `keysarcosmetics-payroll-axhi99ja9-minnicas-projects.vercel.app`   | `keysarcosmetics-payroll.vercel.app`   |
| Scheduler | `dpl_7cRmAGWQQadDK95ms6xouy24Sqy2` | `keysarcosmetics-scheduler-tr976u7di-minnicas-projects.vercel.app` | `keysarcosmetics-scheduler.vercel.app` |

Último Preview READY observado en `develop`:

| Proyecto  | SHA       | Deployment ID                      | URL inmutable                                                      |
| --------- | --------- | ---------------------------------- | ------------------------------------------------------------------ |
| Envelope  | `6846ced` | `dpl_FiDnGtUK6zMQ9UXisXoL8b1M5DFG` | `keysarcosmetics-envelope-8mtywdp95-minnicas-projects.vercel.app`  |
| Finance   | `6846ced` | `dpl_BBrkZigR8xjzgifLxLRAGGMpXbnC` | `keysarcosmetics-finance-5p57omufy-minnicas-projects.vercel.app`   |
| HR        | `dd0bb55` | `dpl_DR8SJbsZx1CPEMq9oxXxAg1BXu56` | `keysarcosmetics-8byh2y6zp-minnicas-projects.vercel.app`           |
| Payroll   | `6846ced` | `dpl_9Cq44veyGs8meFxWYQc1XfQ6uyWv` | `keysarcosmetics-payroll-kksfp5o72-minnicas-projects.vercel.app`   |
| Scheduler | `6846ced` | `dpl_6EUbYimnybPU4jwtRUJ4UvNQ6eNS` | `keysarcosmetics-scheduler-fn5jjs3oo-minnicas-projects.vercel.app` |

Los aliases estables `git-develop` sólo están documentados hoy para Envelope y
Payroll. Los distintos SHAs de la tabla son esperables en un sistema selectivo:
el ambiente frontend ya es multiversión. Los smoke workflows actuales, que
reciben un único `release_sha`, deberán adaptarse antes de activar deployments
selectivos.

## 10. Sistemas externos

- Ningún GitHub Action inicia deployments frontend en Vercel.
- `Deploy API` es manual y sólo despliega el backend en Fly.io.
- Los smoke tests y E2E son manuales y verifican ambientes ya desplegados.
- No existen deployment hooks en los cinco proyectos Vercel.
- Se observaron seis deployments con origen `redeploy`, sólo en Envelope y
  Payroll y sólo para `develop`/`master`; no explican el fan-out de features.

## 11. Riesgos que pasan a las siguientes fases

1. Deshabilitar la integración Git antes de tener listo el iniciador de GitHub
   Actions dejaría `develop` sin deployments automáticos.
2. El detector debe comparar contra el último SHA exitoso de cada aplicación,
   no contra un único SHA de ambiente.
3. Cambios de lockfile y configuración raíz requieren política conservadora
   para no omitir consumidores.
4. Node remoto `24.x` y `.nvmrc` `22.23.2` deben normalizarse antes del piloto.
5. Scheduler necesita `NEXT_PUBLIC_API_URL` por ambiente antes de usarse como
   piloto funcional.
6. Los workflows de smoke/E2E deben aceptar SHAs por aplicación.
7. CRM, POS y Landing sólo entrarán en la automatización cuando existan sus
   proyectos Vercel y tengan una estrategia de build válida; POS todavía mezcla
   build web con `electron-builder`.

## 12. Criterio de salida

| Criterio                                | Estado   | Evidencia                                                          |
| --------------------------------------- | -------- | ------------------------------------------------------------------ |
| Inventario remoto completo              | Cumplido | Cinco proyectos existentes y tres ausencias verificadas            |
| Causa confirmada con deployments reales | Cumplido | 356 deployments, origen y fan-out correlacionados                  |
| Rollback documentado                    | Cumplido | IDs, URLs inmutables y dominios productivos de los cinco proyectos |

La Fase 0 queda cerrada. La Fase 1 puede comenzar sin alterar todavía
producción.
