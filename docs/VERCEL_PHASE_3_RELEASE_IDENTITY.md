# Vercel Fase 3 — identidad de releases multiversión

> Continuidad: la Fase 6 amplió el contrato original a Envelope, Finance, HR,
> Payroll y Scheduler más API en development; la Fase 7 aplicó la misma matriz
> de seis componentes al smoke y manifiesto de production. Esta guía conserva
> el alcance histórico con el que se cerró la Fase 3.

Estado al 5 de septiembre de 2026: implementada en repositorio. El contrato,
las pruebas unitarias, el type-check de E2E y el build de Scheduler se validaron
localmente. Falta ejecutar los workflows contra aliases reales que sirvan SHAs
distintos para cerrar la evidencia del ambiente; no se modificó configuración
remota ni producción.

## Contrato

Los smokes ya no reciben un SHA común. Cada ejecución declara cuatro SHAs
completos e independientes:

```text
envelope_sha
payroll_sha
scheduler_sha
api_sha
```

Envelope, Payroll y Scheduler exponen su identidad mediante
`meta[name="keysar-release"]`; la API la expone como `release` en `/health`.
Los tres frontends toman el valor de `VERCEL_GIT_COMMIT_SHA` durante el build y
la API toma `RELEASE_SHA` durante su deployment protegido.

`apps/e2e/helpers/release-identity.ts` es la fuente común para validar SHAs,
comparar la matriz declarada contra las versiones servidas y escribir el
manifiesto. Cualquier valor vacío, abreviado, con formato inválido o diferente
al declarado falla antes de iniciar recorridos autenticados.

## Manifiesto de ambiente

Después de verificar las cuatro identidades, Playwright escribe un JSON con
permisos `0600` y este contrato:

```json
{
  "schemaVersion": 1,
  "environment": "development",
  "verifiedAt": "2026-09-05T12:00:00.000Z",
  "suiteSha": "5555555555555555555555555555555555555555",
  "releases": {
    "envelope": "1111111111111111111111111111111111111111",
    "payroll": "2222222222222222222222222222222222222222",
    "scheduler": "3333333333333333333333333333333333333333",
    "api": "4444444444444444444444444444444444444444"
  }
}
```

El archivo se crea únicamente después de comparar las respuestas reales. Los
workflows lo publican por 30 días con un nombre que incluye ambiente, run e
intento. No contiene URLs, bypass secrets, cookies, credenciales ni datos
operativos. Los manifiestos locales están ignorados por Git.

## Workflows

`Environment smoke tests` y `Authenticated development E2E` aceptan los cuatro
inputs. El checkout usa el SHA de la rama elegida al disparar el workflow; ya
no usa arbitrariamente la versión de uno de los frontends como versión de la
suite. El resumen del smoke registra la matriz declarada y el resultado.

En el E2E de development, `release-identity` es dependencia de los tres setups
de autenticación. Por ello ningún login ocurre si un alias o la API sirven una
versión distinta. Los guards de red, traces, screenshots, video, limpieza de
`storageState` y separación de bypass secrets permanecen sin cambios.

## Gate Scheduler/API

`Deploy API` agrega `scheduler_frontend_sha` cuando
`activate_scheduler_internal=true`. La confirmación literal
`SCHEDULER_INTERNO_VALIDADO` aprueba la combinación formada por:

- el SHA de Scheduler declarado y comprobado en su meta;
- el SHA de API fijado desde la rama del ambiente y comprobado en `/health`.

Los SHAs pueden ser distintos. Sólo después de verificar ambos se genera
`scheduler-compatibility-manifest.json` y se activa `AGENDA_PROVIDER=internal`.
El manifiesto se adjunta junto con el diagnóstico y la auditoría agregada de
Scheduler. Readiness por sí solo ya no basta: todo deploy protegido del API
también debe servir el SHA exacto antes de continuar.

## Validación local

Ejecutado el 5 de septiembre de 2026:

```text
pnpm deploy:release-manifest:test        PASS (4 casos)
pnpm --filter @cosmetics/e2e type-check PASS
pnpm --filter @cosmetics/scheduler type-check PASS
VERCEL_GIT_COMMIT_SHA=<sha> pnpm --filter @cosmetics/scheduler build PASS
```

Los casos automatizados aceptan cuatro SHAs diferentes, rechazan un alias
desfasado y rechazan SHAs abreviados. El HTML de `/login` generado por Scheduler
incluyó exactamente el SHA inyectado en `keysar-release`. El sandbox local no
permite abrir un servidor loopback, por lo que no se simuló una corrida
HTTP/Chromium. La evidencia pendiente es una ejecución real de ambos workflows
desde `develop`.

`Production builds` repite el contrato unitario en CI antes de construir los
artefactos.

## Activación y rollback

Antes de cerrar el criterio remoto:

1. desplegar en `development` versiones distintas conocidas de Envelope,
   Payroll, Scheduler y API;
2. ejecutar ambos workflows con la matriz exacta y conservar sus manifiestos;
3. repetir el smoke con un SHA deliberadamente incorrecto y confirmar que no
   se crea un manifiesto verificado;
4. comprobar que ninguna request autenticada se ejecutó en ese caso.

Rollback de repositorio: restaurar los inputs `release_sha`, las variables
`*_EXPECTED_FRONTEND_SHA` y la comparación común anterior mientras los
deployments sigan siendo amplios. No requiere modificar datos, migraciones ni
ambientes. El gate Scheduler anterior sólo debe restaurarse si frontend y API
vuelven temporalmente a publicarse siempre desde un único SHA.
