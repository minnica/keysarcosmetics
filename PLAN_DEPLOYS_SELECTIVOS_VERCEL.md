# Plan de despliegues selectivos en Vercel

> Estado: implementación aprobada. Fases 0 y 1 completadas el 4 de septiembre
> de 2026. La Fase 2 se integró en `develop` mediante la PR #88 con CI y
> previews en verde. Las Fases 3 y 4 quedaron implementadas en repositorio el
> 5 de septiembre de 2026. La Fase 5 también quedó implementada ese día con HR
> como piloto, pero espera credenciales, activación y sus casos de aceptación
> remotos. Las Fases 3–5 aún requieren corridas completas de CI/ambiente para
> cumplir sus criterios de salida. La Fase 6 quedó
> implementada en repositorio el 5 de septiembre y espera una migración remota
> proyecto por proyecto. Durante la validación de la Fase 2 se corrigió en
> Vercel el Build Command de Envelope a `--filter=@cosmetics/envelope`; no se
> aplicaron otros cambios operativos.

## 1. Objetivo

Reducir al mínimo los deployments y builds consumidos en Vercel, manteniendo un
flujo seguro para development/staging y producción.

El resultado esperado es:

- Las ramas `feature/*`, `fix/*`, `prototype/*` y Dependabot no generan
  deployments de Vercel.
- Un merge a `develop` despliega únicamente las aplicaciones afectadas.
- Los cambios en paquetes compartidos despliegan sus consumidores transitivos.
- Los cambios exclusivos del backend no despliegan frontends.
- Los cambios de documentación no despliegan aplicaciones.
- `master` adopta deployments selectivos sólo después de validar la estrategia en
  `develop`.
- La lógica de selección vive en un único lugar y produce evidencia auditable.

## 2. Alcance

Aplicaciones candidatas a deployment en Vercel:

| Aplicación | Paquete                | Root Directory   | Estado remoto actual |
| ---------- | ---------------------- | ---------------- | -------------------- |
| Landing    | `@cosmetics/landing`   | `apps/landing`   | Sin proyecto Vercel  |
| Envelope   | `@cosmetics/envelope`  | `apps/envelope`  | Proyecto activo      |
| Payroll    | `@cosmetics/payroll`   | `apps/payroll`   | Proyecto activo      |
| CRM        | `@cosmetics/crm`       | `apps/crm`       | Sin proyecto Vercel  |
| Scheduler  | `@cosmetics/scheduler` | `apps/scheduler` | Proyecto activo      |
| POS web    | `@cosmetics/pos`       | `apps/pos`       | Sin proyecto Vercel  |
| Finance    | `@cosmetics/finance`   | `apps/finance`   | Proyecto activo      |
| HR         | `@cosmetics/hr`        | `apps/hr`        | Proyecto activo      |

La primera implementación sólo puede migrar los cinco proyectos activos. CRM,
POS y Landing entrarán al flujo cuando sus proyectos Vercel sean provisionados
y validados. El proyecto remoto `keysar-landing` pertenece al repositorio
independiente `minnica/keysar-landing`; no representa `apps/landing`.

Fuera del alcance de Vercel:

- `backend/api`: se despliega en Fly.io mediante el workflow manual protegido
  `Deploy API`.
- `apps/e2e`: sólo participa en CI, smoke tests y E2E.
- `apps/ui-testbed`: sólo participa en regresión visual.
- Migraciones y bases de datos: conservan su flujo protegido actual.

## 3. Principios de diseño

1. No solicitar un deployment si una aplicación no está afectada.
2. Calcular impacto desde el grafo real de dependencias del monorepo.
3. Comparar cada aplicación contra su último deployment exitoso del ambiente.
4. Tratar errores o evidencia incompleta de forma conservadora: el detector debe
   fallar y bloquear el flujo, no declarar la aplicación como no afectada.
5. Separar selección, build, publicación y promoción para poder auditar cada
   decisión.
6. Mantener los deployments del backend y las migraciones fuera del flujo
   automático de frontends.
7. No duplicar reglas de impacto entre scripts, workflows y configuraciones de
   cada proyecto Vercel.
8. Mantener rollback independiente por aplicación.

## 4. Arquitectura objetivo

### 4.1 Ramas de trabajo

`feature/*`, `fix/*`, `prototype/*`, ramas de Dependabot y cualquier otra rama
distinta de `develop` y `master`:

- Ejecutan CI cuando exista un PR hacia `develop` o `master`.
- No generan Preview Deployments.
- No actualizan alias de staging ni dominios productivos.

Si más adelante un PR necesita un preview excepcional, se podrá ofrecer un
workflow manual que reciba una aplicación concreta y un SHA. No forma parte de
la primera implementación.

### 4.2 Rama `develop`

Después de integrar un PR:

1. CI valida el commit.
2. El detector calcula las aplicaciones afectadas.
3. Sólo esas aplicaciones se construyen y despliegan como Preview.
4. Cada deployment exitoso actualiza el alias estable de `develop` de su
   aplicación.
5. Las aplicaciones no afectadas conservan su deployment y alias actuales.
6. El workflow registra el SHA desplegado de cada aplicación.

### 4.3 Rama `master`

La primera implementación mantiene el comportamiento productivo actual.

Cuando la selección haya sido validada durante varias promociones en
`develop`, `master` reutilizará el mismo detector y añadirá sus controles:

- environment protegido `production`;
- variables de producción;
- coordinación explícita con API y migraciones cuando sean necesarias;
- publicación de dominios productivos sólo después de completar los gates;
- smoke tests contra las versiones efectivamente servidas;
- rollback independiente por aplicación.

No se debe promover a producción un artefacto construido con variables Preview,
porque puede contener la URL del backend development.

## 5. Reglas de impacto

### 5.1 Cambios directos

Un cambio dentro de `apps/<app>/**` afecta únicamente a esa aplicación, salvo
que el mismo commit contenga otros cambios compartidos o globales.

### 5.2 Paquetes compartidos

El impacto debe derivarse del grafo de dependencias declarado en los
`package.json`, no de una lista duplicada dentro del workflow.

Con el grafo actual, la política esperada es:

| Cambio                   | Aplicaciones afectadas                                             |
| ------------------------ | ------------------------------------------------------------------ |
| `packages/ui/**`         | Todas las aplicaciones Vercel                                      |
| `packages/types/**`      | Todas las aplicaciones Vercel y el API para su flujo independiente |
| `packages/auth/**`       | Landing, Envelope, Payroll, CRM, Scheduler, Finance y HR           |
| `packages/api-client/**` | Todas las aplicaciones Vercel y sus dependencias transitivas       |

Notas:

- La resolución final siempre usará los manifests del SHA evaluado. La tabla no
  debe convertirse en una segunda fuente de verdad.
- POS no depende actualmente de `@cosmetics/auth`.
- Finance y HR declaran dependencias de su arquitectura objetivo aunque parte de
  su implementación actual todavía no las importe. Mientras permanezcan
  declaradas, se consideran dependencias reales.
- `@cosmetics/api-client` y `@cosmetics/auth` dependen de
  `@cosmetics/types`; un cambio de tipos propaga impacto transitivamente.

### 5.3 Lockfile

Un cambio en `pnpm-lock.yaml` debe analizarse por dependencia:

- Si modifica una dependencia exclusiva de una aplicación, desplegar esa
  aplicación.
- Si modifica una dependencia de un paquete compartido, desplegar los
  consumidores transitivos.
- Si no se puede determinar el alcance con confianza, marcar el detector como
  inconcluso y bloquear el deployment automático hasta revisar el caso.

### 5.4 Configuración global de build

Los siguientes archivos se consideran globales y despliegan todas las
aplicaciones Vercel:

- `package.json` raíz cuando cambie runtime, package manager, scripts usados por
  los builds o dependencias de tooling;
- `pnpm-workspace.yaml`;
- `turbo.json` cuando cambie la tarea `build`, sus inputs, outputs o
  dependencias;
- `tsconfig.json` raíz;
- `.nvmrc`;
- archivos de configuración global que se demuestre que participan en el build.

El detector puede evolucionar para identificar cambios inocuos dentro de estos
archivos, pero la primera versión debe ser conservadora.

### 5.5 Configuración por aplicación

Los siguientes cambios afectan sólo a su aplicación:

- `apps/<app>/package.json`;
- `apps/<app>/next.config.*`;
- `apps/<app>/vite.config.*`;
- `apps/<app>/tailwind.config.*`;
- `apps/<app>/postcss.config.*`;
- `apps/<app>/tsconfig.json`;
- assets, código y archivos de environment de ejemplo dentro de esa app cuando
  participen en el build.

### 5.6 Cambios que no despliegan frontends

Por defecto, no afectan aplicaciones Vercel:

- `CLAUDE.md`;
- `docs/**`;
- planes y guías `*.md` de la raíz;
- `.github/**`, excepto el propio flujo que se esté probando;
- `apps/e2e/**`;
- `apps/ui-testbed/**`;
- archivos exclusivamente de pruebas que no alimenten generación de estilos ni
  el bundle;
- `backend/api/**` y migraciones Prisma, cuando no cambien también contratos o
  paquetes compartidos.

Las exclusiones de pruebas deben ser pequeñas. `packages/ui` se escanea desde
las configuraciones Tailwind de las aplicaciones, por lo que no se excluirán de
forma general sus archivos `*.test.tsx` hasta demostrar que no alteran el CSS
generado.

## 6. Matriz objetivo

| Cambio                        | Rama de trabajo | `develop`              | `master` tras adopción |
| ----------------------------- | --------------- | ---------------------- | ---------------------- |
| `apps/envelope/**`            | Ninguno         | Envelope               | Envelope               |
| `apps/payroll/**`             | Ninguno         | Payroll                | Payroll                |
| `apps/scheduler/**`           | Ninguno         | Scheduler              | Scheduler              |
| `apps/pos/**`                 | Ninguno         | POS web                | POS web                |
| `apps/crm/**`                 | Ninguno         | CRM                    | CRM                    |
| `apps/finance/**`             | Ninguno         | Finance                | Finance                |
| `apps/hr/**`                  | Ninguno         | HR                     | HR                     |
| `apps/landing/**`             | Ninguno         | Landing                | Landing                |
| `packages/ui/**`              | Ninguno         | Todas                  | Todas                  |
| `packages/types/**`           | Ninguno         | Todas                  | Todas                  |
| `packages/auth/**`            | Ninguno         | Todas excepto POS      | Todas excepto POS      |
| `packages/api-client/**`      | Ninguno         | Todas                  | Todas                  |
| Lockfile                      | Ninguno         | Consumidores afectados | Consumidores afectados |
| Configuración global de build | Ninguno         | Todas                  | Todas                  |
| Sólo documentación            | Ninguno         | Ninguno                | Ninguno                |
| Sólo backend/API              | Ninguno         | Backend manual         | Backend protegido      |
| Sólo migraciones              | Ninguno         | BD/API protegidos      | BD/API protegidos      |

## 7. Estrategia técnica elegida

### 7.1 Iniciador único

GitHub Actions será el único iniciador automático de deployments frontend.

Cuando todos los proyectos hayan migrado, la integración Git automática de
Vercel se retirará de esos proyectos. Esto evita que Vercel cree deployments
antes de que el detector decida qué aplicaciones están afectadas.

La opción nativa **Skip deployments when there are no changes to the root
directory and its dependencies** podrá usarse durante la transición, pero no es
la solución final porque los cambios fuera de los workspaces se consideran
globales.

El **Ignored Build Step** no será el mecanismo principal. Cancela el build
después de crear el deployment y los deployments cancelados consumen límites.

### 7.2 Detector de impacto

Se implementará un script versionado y testeable que:

1. Reciba ambiente, SHA objetivo y aplicación.
2. Obtenga el último SHA desplegado exitosamente para esa aplicación y ambiente.
3. Compare ese SHA con el objetivo.
4. Consulte el grafo del monorepo para resolver cambios directos y dependencias
   transitivas.
5. Aplique la política única de archivos globales y excluidos.
6. Devuelva un resultado estructurado con:
   - aplicación;
   - `affected: true|false`;
   - SHA base;
   - SHA objetivo;
   - motivos;
   - archivos que provocaron cada motivo.
7. Termine con error ante historia insuficiente, SHA base inexistente, grafo
   inválido o salida ambigua.

La comparación con el último deployment exitoso evita este fallo:

```text
Commit A afecta Payroll → deployment falla
Commit B sólo cambia documentación
```

Si B se comparara únicamente con su padre, Payroll quedaría omitido. Comparando
contra el último deployment exitoso, A sigue pendiente y Payroll vuelve a
seleccionarse.

### 7.3 Turborepo

El repositorio usa Turborepo `1.13.4`. Antes de depender de funcionalidades
modernas de análisis se hará una actualización aislada y validada:

- migrar `pipeline` a `tasks`;
- validar compatibilidad con pnpm 10 y Node.js 22.23.2;
- conservar los mismos comandos funcionales;
- verificar el grafo y los builds de todas las apps;
- usar `turbo query affected` o el mecanismo estable equivalente de la versión
  elegida;
- no usar `turbo-ignore` como base permanente.

También se revisará `globalDependencies`. El patrón actual `**/.env.*` invalida
globalmente ejemplos de environment dentro de cualquier workspace y debe
sustituirse por inputs deliberados que reflejen el build real.

### 7.4 Build y publicación

Cada job seleccionado debe:

1. Hacer checkout del SHA exacto con historia suficiente.
2. Instalar pnpm y Node en sus versiones fijadas.
3. Instalar con `pnpm install --frozen-lockfile`.
4. Obtener la configuración Vercel de la aplicación y ambiente correctos.
5. Construir únicamente la aplicación y sus dependencias.
6. Inyectar explícitamente el SHA de release usado por
   `meta[name="keysar-release"]`.
7. Desplegar el artefacto.
8. Verificar que el deployment esté listo y sirva el SHA esperado.
9. Actualizar el alias estable correspondiente.
10. Guardar URL, deployment ID, SHA y resultado en el resumen del workflow.

POS requiere un comando web separado que produzca `dist` sin ejecutar
`electron-builder`. El empaquetado Electron conserva su propio pipeline y no
debe ejecutarse en Vercel.

## 8. Plan por fases

### Fase 0 — Inventario remoto y línea base

Objetivo: conocer la configuración efectiva antes de cambiarla.

Estado al 4 de septiembre de 2026: **completada**. La auditoría local, GitHub y
Vercel está documentada en `docs/VERCEL_PHASE_0_AUDIT.md`. El scope
`minnicas-projects` es la cuenta personal Hobby, no un Team. Se verificaron
cinco proyectos conectados al monorepo y la ausencia de proyectos para CRM,
POS y Landing. La línea base registró 356 deployments del monorepo; 314
(88.2%) fueron provocados por ramas distintas de `develop` y `master`.

Tareas:

- [x] Obtener acceso de lectura al scope personal correcto mediante Vercel CLI;
      los conectores MCP disponibles no enumeran el scope personal Hobby.
- [x] Auditar el repositorio, el grafo local, las ramas y los workflows de
      GitHub sin modificar configuración.
- [x] Verificar las ocho aplicaciones candidatas, inventariar los cinco
      proyectos existentes y documentar las tres ausencias; registrar:
  - project ID y slug;
  - repositorio conectado;
  - Root Directory;
  - Production Branch;
  - Framework Preset;
  - Install, Build y Output commands;
  - permiso para acceder fuera del Root Directory;
  - estado de Skip Unaffected Projects;
  - Ignored Build Step;
  - deployment hooks;
  - dominios y alias de `develop`/producción;
  - variables por ambiente;
  - exposición de System Environment Variables.
- [x] Inspeccionar una muestra de deployments causados por `feature/*` y registrar
      origen, rama, SHA, proyecto, motivo de build y estado.
- [x] Confirmar que no existe otro sistema externo disparando hooks.
- [x] Registrar el consumo de deployments/builds durante una semana típica.
- [x] Verificar Root Directory y comandos tanto en el repositorio como en la
      configuración remota efectiva.

Criterio de salida:

- Cumplido: cinco proyectos existentes y tres ausencias verificadas.
- Cumplido: causa de inicio confirmada con deployments reales.
- Cumplido: IDs, URLs inmutables y dominios de rollback documentados.

Rollback: no aplica; fase de sólo lectura.

### Fase 1 — Casos de aceptación y detector en seco

Objetivo: demostrar la selección antes de desplegar.

Estado al 4 de septiembre de 2026: **completada**. El detector versionado vive
en `scripts/detect-vercel-impact.mjs` y
`scripts/vercel-impact-detector-lib.mjs`; su contrato, política, errores y
resultados están documentados en `docs/VERCEL_PHASE_1_DETECTOR.md`. La matriz
automatizada pasó 31 pruebas y cinco diagnósticos históricos representativos.
No se invocó Vercel ni se modificaron ambientes o workflows.

Tareas:

- [x] Definir casos automatizados para cada fila de la matriz.
- [x] Añadir casos para:
  - un cambio directo por app;
  - `ui`, `types`, `auth` y `api-client`;
  - lockfile exclusivo y compartido;
  - sólo documentación;
  - sólo backend;
  - configuración global;
  - combinación frontend + backend;
  - deployment previo fallido;
  - historia Git insuficiente.
- [x] Crear el script de detección con salida JSON y resumen humano.
- [x] Ejecutarlo en modo diagnóstico sobre commits históricos representativos.
- [x] No invocar Vercel en esta fase.

Criterio de salida:

- Cumplido: todos los casos esperados pasan.
- Cumplido: cada resultado explica por qué una aplicación está o no afectada.
- Cumplido: un error técnico jamás produce silenciosamente una lista vacía.

Rollback: retirar el check diagnóstico; no modifica ambientes.

### Fase 2 — Actualización controlada de Turborepo

Objetivo: disponer de un grafo moderno y confiable.

Tareas:

- Actualizar Turbo en un PR independiente.
- Migrar la configuración al schema correspondiente.
- Revisar y reducir invalidaciones globales.
- Ejecutar lint, type-check, unit tests, contratos UI, regresión visual, builds e
  integración de BD existentes.
- Comparar el grafo anterior y el nuevo para todas las aplicaciones.
- Mantener los nombres actuales de los checks requeridos.

Criterio de salida:

- CI completa en verde.
- Builds reproducibles para las ocho aplicaciones locales y el backend, aunque
  sólo cinco frontends tengan actualmente proyecto Vercel.
- Detector de Fase 1 produce el mismo resultado esperado con el grafo nuevo.

Rollback: revertir este PR completo; no cambiar aún Vercel.

### Fase 3 — Identidad de releases y smokes multiversión

Objetivo: permitir que aplicaciones sin cambios conserven un SHA anterior.

Estado al 5 de septiembre de 2026: **implementada en repositorio; pendiente de
validación remota**. Scheduler ya expone `keysar-release`; los smokes reciben un
SHA independiente por frontend y API, verifican la matriz antes de autenticar y
publican un manifiesto JSON sin secretos. `Deploy API` aprueba y registra una
pareja Scheduler/API compatible aunque sus SHAs sean distintos. El contrato,
pruebas y evidencia local viven en
`docs/VERCEL_PHASE_3_RELEASE_IDENTITY.md`.

Tareas:

- [x] Añadir `keysar-release` a Scheduler; verificar las demás apps desplegadas
      que deban participar en los smokes.
- [x] Cambiar los workflows de smoke/E2E para aceptar un SHA esperado por
      aplicación, en lugar de un único SHA compartido.
- [x] Registrar un manifiesto de ambiente con las versiones servidas por app y
      API.
- [x] Adaptar el gate de activación Scheduler para comprobar una combinación
      compatible aprobada de frontend/API.
- [x] Mantener pruebas de sólo lectura y protección de secretos.

Criterio de salida:

- Pendiente remoto: los smokes pasan cuando Envelope, Payroll y Scheduler sirven
  SHAs distintos y correctos.
- Cumplido por contrato y prueba local; pendiente de evidencia remota: los
  smokes fallan si cualquier alias sirve un SHA diferente al declarado.

Rollback: restaurar el contrato de SHA único mientras los deployments continúen
siendo amplios.

### Fase 4 — Workflow frontend en modo diagnóstico

Objetivo: validar la orquestación sin crear deployments.

Estado al 5 de septiembre de 2026: **implementada en repositorio; pendiente de
observación remota**. `Vercel frontend impact diagnostic` se inicia sólo cuando
el workflow `CI` termina correctamente para un push del mismo repositorio a
`develop` o `master`. Consulta por API el historial de los cinco proyectos
activos, descarta el deployment del SHA objetivo, conserva como base el último
`READY` anterior que sea ancestro y entrega esa evidencia al detector de la
Fase 1. La matriz, comparación contra la integración Git y artefactos
sanitizados quedan registrados sin ejecutar builds, deployments o aliases. El
contrato y la puesta en marcha están en
`docs/VERCEL_PHASE_4_DIAGNOSTIC_WORKFLOW.md`.

Tareas:

- [x] Crear el workflow para pushes a `develop` y `master`.
- [x] Esperar o comprobar el resultado de CI antes de continuar.
- [x] Ejecutar el detector y producir una matriz dinámica.
- [x] Publicar en `GITHUB_STEP_SUMMARY`:
  - apps afectadas;
  - apps omitidas;
  - SHA base/objetivo;
  - razones;
  - impacto esperado en Vercel.
- [x] Conservar todos los jobs de deployment deshabilitados.
- [ ] Comparar durante varios merges el resultado teórico con los deployments que
      genera todavía la integración Git automática.

Criterio de salida:

- Cumplido localmente: la selección conserva la matriz de aceptación y usa el
  grafo real del SHA objetivo.
- Pendiente remoto: confirmar durante varios merges que no existen falsos
  negativos y conservar sus artefactos de evidencia.

Rollback: deshabilitar el workflow diagnóstico.

### Fase 5 — Piloto selectivo en un proyecto de `develop`

Objetivo: validar el flujo completo con el menor alcance posible.

Proyecto recomendado para iniciar: una aplicación interna no crítica y sin
coordinación inmediata de BD. La selección final se hará con el inventario de la
Fase 0; Finance o HR son candidatas si sus proyectos y alias están operativos.

Estado al 5 de septiembre de 2026: **implementada en repositorio; pendiente de
activación y evidencia remota**. Se eligió HR porque no consume API ni variables
de ambiente y opera con mocks locales. La Fase 6 sustituyó el flag original por
`VERCEL_HR_SELECTIVE_ENABLED`; el workflow manual general permite desplegar sin alias,
publicar un deployment ya verificado y ensayar rollback. Ambos verifican
proyecto, Preview `READY`, procedencia Git, SHA servido y Deployment Protection.
Contrato y secuencia: `docs/VERCEL_PHASE_5_HR_PILOT.md`.

Tareas:

- [ ] Crear credenciales de deployment limitadas y secrets por environment.
  - [x] Definir nombres, separación read/deploy, feature flag y alcance mínimo.
  - [ ] Crear y validar las credenciales reales en GitHub/Vercel.
- [x] Preparar build, publicación, alias y verificación para HR.
  - [x] Fijar Node.js 22.23.2, pnpm 10.0.0 y Vercel CLI 59.11.2.
  - [x] Inyectar y comprobar `keysar-release` en HR.
  - [x] Validar proyecto, Preview `READY`, metadata Git, protección y SHA HTTP.
  - [x] Bloquear publicación obsoleta y reutilizar un deployment `READY` en rerun.
- [ ] Ejecutar primero deployments manuales del mismo SHA sin cambiar alias.
  - [x] Implementar la operación protegida `deploy_without_alias`.
  - [ ] Ejecutarla y conservar evidencia remota de al menos dos corridas.
- [ ] Verificar variables, assets, rutas, SHA y protección sobre el deployment real.
- [ ] Activar el job selectivo para el piloto.
  - [x] Implementar el job consumidor de la selección, cerrado por feature flag.
  - [ ] Configurar `VERCEL_HR_SELECTIVE_ENABLED=true` después del ensayo manual.
- [ ] Sólo después de demostrarlo, retirar su iniciador Git automático.
- [ ] Probar en merges reales:
  - [ ] cambio directo en la app;
  - [ ] sólo documentación;
  - [ ] otra app;
  - [ ] paquete compartido;
  - [ ] deployment fallido y siguiente commit no relacionado;
  - [ ] reintento del workflow.
- [x] Preparar rollback protegido por deployment ID y SHA completos.
- [ ] Ejecutar y documentar el rollback remoto al deployment anterior.
- [x] Validar localmente 12 contratos del piloto, 36 del detector, cinco casos
      históricos, lint/type-check completos y los builds de API, ocho frontends
      y POS web.

Criterio de salida:

- Pendiente remoto: sólo el cambio directo y el compartido crean deployments del
  piloto.
- Cumplido por trigger; pendiente de evidencia remota: ninguna rama de trabajo
  genera deployment del piloto.
- Cumplido por contrato y prueba local; pendiente remoto: el alias estable sirve
  exactamente el SHA registrado.
- Preparado en repositorio; pendiente remoto: rollback probado al deployment
  anterior.

Rollback:

- Reasignar el alias al último deployment sano.
- Reactivar temporalmente la integración Git del proyecto piloto.
- Deshabilitar su job selectivo.

### Fase 6 — Migración completa de `develop`

Objetivo: aplicar selección a los cinco proyectos Vercel activos de staging y
dejar definido el alta posterior de CRM, POS y Landing.

Estado al 5 de septiembre de 2026: **implementada en repositorio; activación y
evidencia remota pendientes**. El job selectivo usa la matriz de los cinco
proyectos, flags/credenciales/aliases por app, concurrencia máxima de dos y un
grupo por app. Valida configuración remota antes del build, reutiliza un
deployment `READY`, bloquea alias obsoletos y ejecuta smokes de cinco frontends
más API cuando toda la migración está activa. La operación manual permite
ensayo, publicación y rollback por proyecto. Contrato y secuencia:
`docs/VERCEL_PHASE_6_DEVELOPMENT.md`.

Tareas:

- [ ] Migrar remotamente una aplicación por vez: HR, Finance, Envelope,
      Payroll y Scheduler.
  - [x] Implementar flags, secrets, aliases y operación manual independientes.
  - [ ] Crear credenciales, activar flags y conservar evidencia por proyecto.
- [ ] Confirmar Root Directory, build, output, variables y alias de cada una.
  - [x] Versionar el contrato y validarlo automáticamente antes de mutar.
  - [ ] Normalizar Node `22.x`, provisionar la variable faltante de Scheduler y
        validar la configuración remota real.
- [ ] Retirar la integración Git automática sólo después de validar su workflow.
  - [x] Documentar la secuencia y rollback aislado.
  - [ ] Desactivar el iniciador Git uno por uno y comprobar ausencia de dobles.
- [x] Activar concurrencia controlada por app y ambiente: grupos individuales,
      cancelación de obsoletos en development y máximo dos builds simultáneos.
- [x] Impedir que un job antiguo actualice el alias después de uno más nuevo
      mediante concurrencia y una consulta de `origin/develop` inmediatamente
      antes de publicar.
- [ ] Ejecutar smoke tests con el manifiesto multiversión.
  - [x] Ampliar identidad, smokes y manifiesto a los cinco frontends más API.
  - [x] Encadenar el smoke automático sólo cuando los cinco proyectos estén
        migrados y el gate administrativo esté activo.
  - [ ] Conservar una corrida remota verde con SHAs distintos.
- [ ] Observar consumo de Vercel y duración durante varias integraciones.
  - [x] Registrar por app deployment, reutilización, duración e intento.
  - [ ] Revisar al menos cinco integraciones representativas.
- [x] Definir el alta posterior, validación y rollback de CRM, POS web y Landing.
- [x] Validar localmente 36 contratos del detector, 13 del deployment, cuatro
      de configuración, cinco del manifiesto, cinco casos históricos, grafo
      Turbo, lint/type-check completos, 133 pruebas unitarias y los builds de
      API, ocho frontends y POS web.

Criterio de salida:

- Pendiente remoto: `feature/*` y equivalentes crean cero deployments.
- Preparado por contrato; pendiente remoto: un cambio aislado en `develop` crea
  exactamente un deployment.
- Preparado por contrato; pendiente remoto: un cambio compartido despliega
  exactamente los consumidores esperados.
- Cumplido por detector; pendiente de evidencia remota: documentación y backend
  exclusivos crean cero deployments frontend.
- Pendiente remoto: no existen dos iniciadores activos para el mismo proyecto.

Rollback: por proyecto, volver temporalmente al iniciador Git y al último alias
sano sin afectar las demás aplicaciones.

### Fase 7 — Producción selectiva en sombra

Objetivo: validar qué habría ocurrido en `master` sin alterar producción.

Tareas:

- Ejecutar el detector sobre cada promoción `develop → master`.
- Publicar la selección productiva teórica.
- Comparar con el deployment productivo amplio vigente.
- Confirmar coordinación con `Deploy API`, migraciones y orden de publicación.
- Ensayar rollback individual y manifiesto multiversión.
- Definir qué apps exigen compatibilidad exacta con un SHA de API y cuáles
  aceptan compatibilidad hacia atrás.

Criterio de salida:

- Varias promociones consecutivas sin falsos negativos.
- Runbook de producción, aprobación y rollback actualizado y ensayado.
- Aprobación explícita para activar producción selectiva.

Rollback: no aplica; producción sigue usando su flujo vigente.

### Fase 8 — Activación gradual en `master`

Objetivo: reducir deployments productivos sin disminuir las protecciones.

Tareas:

- Migrar primero una aplicación con bajo riesgo operativo.
- Exigir environment `production` y sus reviewers.
- Construir con variables Production.
- Cuando haya cambios API/Prisma, completar primero los gates definidos por el
  runbook y confirmar compatibilidad antes de publicar el frontend.
- Actualizar dominios sólo después del build y verificación.
- Ejecutar smokes públicos y autenticados aplicables.
- Observar errores y latencia; registrar el conjunto de versiones liberado.
- Extender gradualmente a las demás aplicaciones.

Criterio de salida:

- Sólo las apps afectadas reciben deployments productivos.
- La combinación app/API queda registrada y verificada.
- Rollback individual probado.
- Consumo de deployments inferior a la línea base de la Fase 0.

Rollback:

- Reasignar el dominio de la app afectada al deployment sano anterior.
- Mantener migraciones compatibles hacia atrás; no revertirlas destructivamente.
- Volver temporalmente al deployment productivo amplio si la causa es el
  detector y no la aplicación.

### Fase 9 — Cierre y mantenimiento

Objetivo: dejar la estrategia como flujo operativo estable.

Tareas:

- Eliminar configuraciones temporales de transición.
- Confirmar que ningún proyecto conserve dos iniciadores.
- Actualizar `CLAUDE.md`, `docs/RELEASE_RUNBOOK.md`,
  `FLUJO_TRABAJO_Y_DESPLIEGUE.md` y las guías E2E.
- Documentar cómo forzar un redeploy por aplicación ante cambios de variables o
  incidentes.
- Añadir una auditoría periódica de manifests, Root Directories, alias y ramas.
- Medir deployments evitados, fallos del detector y falsos positivos.

Criterio de salida:

- La documentación coincide con la configuración efectiva.
- No hay lógica duplicada de impacto.
- Existe un procedimiento claro para alta de nuevas aplicaciones y paquetes.

## 9. Seguridad y secretos

- No almacenar tokens, project IDs sensibles ni variables de ambiente en el
  repositorio si deben ser secrets.
- Usar un token de Vercel con el menor alcance disponible para CI.
- Separar secrets de `development` y `production`.
- Mantener producción en un GitHub Environment protegido.
- No imprimir variables descargadas por `vercel pull` ni contenido de `.vercel`.
- Fijar versiones de Vercel CLI y de las actions utilizadas.
- Evitar deployments locales de producción; todo cambio productivo debe pasar
  por el workflow protegido.

## 10. Concurrencia, reintentos e idempotencia

- Definir un grupo de concurrencia por aplicación y ambiente.
- En `develop`, cancelar jobs obsoletos antes de publicar el alias.
- En `production`, no cancelar una publicación en curso de forma que deje el
  release en un estado ambiguo.
- Antes de actualizar un alias, comprobar que el SHA objetivo sigue siendo el
  último autorizado para la rama.
- Si ya existe un deployment listo de la misma app, ambiente y SHA, reutilizarlo
  en vez de crear otro.
- Un rerun debe recuperar evidencia previa y evitar duplicados.

## 11. Coordinación frontend, API y base de datos

La selección de frontends no reemplaza el flujo protegido del backend.

| Tipo de cambio                 | Acción esperada                                                  |
| ------------------------------ | ---------------------------------------------------------------- |
| Sólo frontend                  | Deployment selectivo de las apps afectadas                       |
| Sólo backend compatible        | `Deploy API`; ningún frontend automático                         |
| Contrato compartido compatible | Apps consumidoras + `Deploy API` cuando cambie API               |
| Migración aditiva              | Migración/API mediante workflow protegido; frontends según grafo |
| Cambio incompatible            | Release coordinado explícito y orden definido por el runbook     |

Las aplicaciones no deben asumir que compartir la misma rama implica servir el
mismo SHA. La compatibilidad debe expresarse y probarse en los contratos.

## 12. Riesgos y mitigaciones

| Riesgo                                                  | Mitigación                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Se omite un cambio pendiente tras un deployment fallido | Comparar contra el último deployment exitoso por app/ambiente |
| Dependencia interna ausente del manifest                | Validar imports y grafo en CI                                 |
| Lockfile ambiguo                                        | Bloquear y requerir revisión; no omitir                       |
| Exclusión demasiado amplia                              | Allowlist pequeña de documentación y pruebas específicas      |
| Cambio de variable sin commit                           | Workflow manual de redeploy por app                           |
| Alias actualizado por un job obsoleto                   | Concurrencia y verificación del SHA autorizado                |
| Artefacto Preview publicado en producción               | Build independiente con variables Production                  |
| Frontend nuevo contra API antigua                       | Gates de compatibilidad y orden de release                    |
| POS ejecuta `electron-builder` en Vercel                | Script de build web separado                                  |
| Smokes rechazan SHAs distintos válidos                  | Manifiesto con SHA independiente por app                      |
| Doble deployment por Git y Actions                      | Migración uno a uno y auditoría de iniciadores                |
| Error del detector produce cero apps                    | Fallar cerrado con salida no exitosa                          |

## 13. Métricas de éxito

Durante y después de la migración se medirán:

- deployments de Vercel por merge a `develop`;
- deployments generados desde ramas de trabajo;
- builds omitidos antes de solicitar Vercel;
- minutos de build;
- deployments duplicados por reintentos;
- falsos positivos del detector;
- falsos negativos, con objetivo obligatorio de cero;
- tiempo desde merge hasta alias estable;
- rollbacks y causas.

Metas iniciales:

- Cero deployments desde ramas de trabajo.
- Un deployment para un cambio aislado de una app.
- Cero deployments frontend para documentación o backend exclusivos.
- Cero builds duplicados por doble iniciador.
- Cero alias publicados con un SHA distinto al registrado.

## 14. Checklist de revisión antes de implementar

- [x] Acceso de lectura al scope personal Hobby mediante Vercel CLI.
- [x] Lista definitiva: cinco proyectos existentes y tres ausencias.
- [x] Deployments inmutables de `develop` y dominios productivos documentados.
- [x] Línea base de consumo registrada.
- [x] Aplicación piloto elegida: HR.
- [x] Política de archivos globales y excluidos formalizada y validada por la
      Fase 1; cualquier ruta no contemplada bloquea el detector.
- [ ] Actualización de Turborepo aprobada como PR independiente.
- [x] Contrato de identidad multiversión aprobado e implementado por la Fase 3;
      falta conservar evidencia de los smokes sobre aliases reales.
- [x] Estrategia de credenciales y environments definida con token HR separado,
      secrets de `development` y feature flag de repositorio; falta crearla y
      validarla remotamente.
- [x] Rollback del piloto preparado antes de retirar su integración Git; falta
      ejecutar el ensayo remoto.
- [x] Producción permanece sin cambios durante las Fases 0–5.

## 15. Decisiones pendientes

La Fase 5 resolvió para el piloto que la aplicación será HR, que el alias se
mueve sólo después de verificar el deployment inmutable, que la procedencia Git
se enviará como metadata explícita y que el build externo usará Node.js
`22.23.2`. La configuración remota de HR todavía debe normalizarse de `24.x` a
`22.x` antes del primer ensayo. Quedan estas decisiones para las siguientes
fases:

1. Cómo provisionar `NEXT_PUBLIC_API_URL` para Scheduler; los smokes ya usan el
   modelo multiversión desde la Fase 3.
2. Qué aplicaciones de producción necesitan un gate de API exacto y cuáles sólo
   compatibilidad contractual.
3. Durante cuántas promociones exitosas debe ejecutarse producción en sombra
   antes de activar selección; recomendación inicial: al menos tres releases
   representativos.

## 16. Resultado final esperado

```text
feature/*, fix/*, prototype/*, dependabot/*
  -> CI de PR
  -> 0 deployments Vercel

develop
  -> CI
  -> detector contra último deployment exitoso por app
  -> build/deploy sólo de apps afectadas
  -> verificación de SHA
  -> alias estables de staging

master
  -> CI + environment protegido
  -> detector validado
  -> coordinación API/BD cuando aplique
  -> build Production sólo de apps afectadas
  -> publicación controlada
  -> smoke multiversión y observación
```
