# Detector de impacto Vercel — Fase 1

> Fecha de cierre: 4 de septiembre de 2026  
> Estado: **completada en modo diagnóstico**  
> Alcance operativo: ningún proyecto, deployment, alias o ambiente de Vercel fue
> modificado.

## 1. Resultado

La Fase 1 de `PLAN_DEPLOYS_SELECTIVOS_VERCEL.md` incorporó un detector local,
versionado y sin acceso a Vercel. El detector compara el SHA del último
deployment exitoso con el SHA objetivo, lee los manifests desde ese commit,
resuelve consumidores transitivos y explica por aplicación qué archivos
provocaron la decisión.

La implementación está compuesta por:

- `scripts/detect-vercel-impact.mjs`: interfaz de línea de comandos;
- `scripts/vercel-impact-detector-lib.mjs`: política única, grafo, análisis del
  lockfile, estado de deployments y salida estructurada;
- `scripts/vercel-impact-detector.test.mjs`: matriz de aceptación automatizada;
- `scripts/run-vercel-impact-history.mjs`: diagnóstico reproducible sobre cinco
  commits históricos.

No se usa `turbo-ignore`, no se invoca Vercel CLI ni API y no se cambió todavía
Turborepo 1.13.4. La actualización de Turborepo permanece aislada en la Fase 2.

## 2. Contrato del comando

Desde la raíz del repositorio:

```bash
pnpm --silent deploy:impact \
  --environment development \
  --branch develop \
  --target-sha HEAD \
  --app all \
  --base-sha <sha-ready>
```

Opciones:

| Opción               | Contrato                                                            |
| -------------------- | ------------------------------------------------------------------- |
| `--environment`      | `development` o `production`                                        |
| `--branch`           | Sólo `develop` publica en development y sólo `master` en production |
| `--target-sha`       | Commit objetivo; debe existir localmente                            |
| `--app`              | Slug individual, lista separada por comas o `all`                   |
| `--base-sha`         | Override diagnóstico del último SHA exitoso                         |
| `--deployment-state` | Archivo de evidencia por app/ambiente; sustituye a `--base-sha`     |
| `--repository`       | Ruta del repositorio; por defecto usa el directorio de trabajo      |

En ramas desplegables es obligatorio proporcionar `--base-sha` o
`--deployment-state`. En esta fase el estado se inyectó deliberadamente desde
un archivo para no consultar Vercel. La Fase 4 ya obtiene esa evidencia remota
en modo de sólo lectura y la entrega al mismo contrato; ver
`docs/VERCEL_PHASE_4_DIAGNOSTIC_WORKFLOW.md`.

### Estado de deployments

El archivo debe ordenar cada historial del deployment más reciente al más
antiguo. Sólo `READY` se considera exitoso:

```json
{
  "environments": {
    "development": {
      "payroll": [
        {
          "sha": "<sha-del-deployment-fallido>",
          "status": "ERROR",
          "createdAt": "2026-09-04T12:00:00Z"
        },
        {
          "sha": "<ultimo-sha-ready>",
          "status": "READY",
          "createdAt": "2026-09-04T11:00:00Z"
        }
      ]
    }
  }
}
```

El detector selecciona `<ultimo-sha-ready>` como base. Así, un cambio pendiente
no desaparece cuando el deployment posterior falla y el siguiente commit sólo
modifica documentación.

## 3. Salidas

`stdout` contiene exclusivamente JSON. `stderr` contiene un resumen humano con
ambiente, rama, SHA objetivo y, para cada app:

- `AFECTADA` u `OMITIDA`;
- SHA base y objetivo;
- motivos tipados;
- archivos que sostienen cada motivo.

Una ejecución correcta usa `status: "ok"`, `mode: "diagnostic"`, listas de apps
afectadas/omitidas y un resultado por app. Un fallo técnico usa exit code `2`,
`status: "error"` y un objeto `error`; deliberadamente no incluye `results` ni
`affectedApplications`, para que ningún consumidor pueda interpretar el error
como una selección vacía válida.

## 4. Política implementada

### Grafo

Los ocho slugs candidatos son explícitos porque constituyen el alcance Vercel:
Landing, Envelope, Payroll, CRM, Scheduler, POS, Finance y HR. Sus relaciones no
están codificadas en una matriz: se reconstruyen desde todos los `package.json`
de `apps/*`, `packages/*` y `backend/*` presentes en el SHA objetivo.

Un cambio bajo un workspace se propaga a todos los candidatos que lo consumen
directa o transitivamente. Dependencias internas ausentes, nombres duplicados o
manifests inválidos bloquean la ejecución.

### Archivos

- `apps/<app>/**` afecta esa app, excepto pruebas aisladas `*.test.*`, `*.spec.*`
  y directorios de tests.
- `packages/**` sigue el grafo. Los tests de `packages/ui` no se excluyen porque
  Tailwind escanea el paquete compartido.
- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `.nvmrc`
  y archivos `.env*` de raíz se tratan conservadoramente como globales.
- `CLAUDE.md`, Markdown de raíz, `docs/**`, `.github/**`, `backend/api/**`,
  `apps/e2e/**`, `apps/ui-testbed/**` y los cuatro scripts del detector no
  despliegan frontends.
- Una ruta sin política explícita produce `AMBIGUOUS_FILE_SCOPE` y bloquea.

### Lockfile

El analizador admite el formato actual `pnpm-lock.yaml` v9.0. Calcula, para cada
importador, el cierre de dependencias de producción, desarrollo y opcionales,
incluidos snapshots transitivos e integridad de paquetes:

- cambio exclusivo: afecta el workspace propietario;
- cambio de un paquete compartido: se propaga a sus consumidores;
- cambio del importador raíz: afecta las ocho apps;
- referencia, versión o cambio no atribuible: bloquea con error.

## 5. Fallos cerrados

Los errores principales son:

| Código                     | Significado                                                        |
| -------------------------- | ------------------------------------------------------------------ |
| `GIT_HISTORY_INSUFFICIENT` | Base/objetivo ausente o base no ancestro; se requiere más historia |
| `INVALID_WORKSPACE_GRAPH`  | Grafo incompleto, duplicado o inconsistente                        |
| `LOCKFILE_AMBIGUOUS`       | El cambio del lockfile no puede atribuirse con certeza             |
| `UNSUPPORTED_LOCKFILE`     | Formato de lockfile distinto de v9.0                               |
| `AMBIGUOUS_FILE_SCOPE`     | Archivo nuevo sin política de impacto                              |
| `MISSING_DEPLOYMENT_BASE`  | No existe evidencia `READY` para una app/ambiente                  |
| `INVALID_DEPLOYMENT_STATE` | Historial incompleto o fuera de orden                              |

El checkout de CI debe conservar historia suficiente; no se admite degradar a
la comparación contra el padre ni asumir cero cambios.

## 6. Validación ejecutada

```bash
pnpm deploy:impact:test
pnpm deploy:impact:history
```

La matriz automatizada terminó con **31 pruebas en verde**. Cubre los ocho
cambios directos, `ui`, `types`, `auth`, `api-client`, lockfile exclusivo y
compartido, importador raíz, documentación, backend, migraciones, configuración
global, frontend + backend, ramas de trabajo, selección productiva, deployment
previo fallido, historia insuficiente, lockfile/ruta/grafo ambiguos y los
contratos JSON/humano.

El diagnóstico histórico produjo:

| Caso                         | Base      | Objetivo  | Resultado esperado y observado |
| ---------------------------- | --------- | --------- | ------------------------------ |
| Markdown de raíz             | `66781a5` | `6097a4b` | Ninguna app                    |
| Backend exclusivo            | `5390076` | `e9c5631` | Ninguna app                    |
| Cambio directo de Envelope   | `e60e651` | `47d1214` | Envelope                       |
| Configuración global de Node | `4a90ff1` | `86f7f89` | Las ocho apps                  |
| UI compartida + Scheduler    | `7c6839e` | `e082d5c` | Las ocho apps                  |

## 7. Estado operativo y siguientes pasos

La Fase 1 no añade workflows ni deployments. La integración Git automática de
los cinco proyectos Vercel sigue sin cambios y producción permanece intacta.

La Fase 2 actualizará Turborepo en un cambio aislado. Después, la misma matriz
debe seguir en verde y sus resultados deben compararse con el grafo moderno.
La Fase 4 ya integra este detector en un workflow exclusivamente diagnóstico;
su comparación sobre varios merges reales permanece pendiente.

Rollback de esta fase: retirar los cuatro scripts y los tres comandos
`deploy:impact*`; no existe rollback remoto porque no hubo mutaciones externas.
