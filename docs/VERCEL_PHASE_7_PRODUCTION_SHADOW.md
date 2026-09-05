# Vercel Fase 7 — producción selectiva en sombra

> Fecha de implementación en repositorio: 5 de septiembre de 2026  
> Estado: **implementada en repositorio; observación y aprobación remotas pendientes**  
> Producción: **sin cambios; todas las operaciones de esta fase son de sólo lectura**

## Resultado

`Vercel selective frontends and production shadow` continúa ejecutándose sólo
después de que `CI` termina en verde para el SHA exacto de `develop` o
`master`. Para un push a `master`, el detector de las Fases 1 y 4 conserva su
selección por aplicación y el job `Rehearse selective production without
mutations` agrega una simulación productiva auditable.

La simulación:

- compara cada aplicación contra su último deployment `READY`, anterior y
  ancestro del SHA promovido;
- publica las apps que se desplegarían y las que conservarían su versión;
- contrasta esa decisión con los deployments amplios que la integración Git
  haya observado para el SHA objetivo;
- lee `/health` del API productivo y compara su release con `master` usando
  historia Git completa;
- detecta cambios de API, contratos compartidos, configuración global y Prisma;
- fija el orden teórico de backup/PITR, migraciones, API, frontends, manifiesto,
  smokes, observación y tag;
- genera un manifiesto teórico con Envelope, Finance, HR, Payroll, Scheduler y
  API;
- verifica un deployment `READY` anterior como objetivo de rollback para cada
  frontend afectado y simula el manifiesto que resultaría al regresar sólo esa
  app.

No instala Vercel CLI, no ejecuta `vercel build`, `deploy`, `promote`, `alias` o
`rollback`, y no escribe en Vercel, Fly.io, Supabase, GitHub variables ni
dominios. El reporte declara `mode: read-only`, `mutationsPerformed: false` y
`approvalToActivateSelectiveProduction: false`.

## Flujo

```text
merge commit develop -> master
  -> CI verde del push exacto
  -> GET del historial Production de cinco proyectos
  -> detector contra el último READY por app
  -> environment protegido production (aprobación de lectura)
  -> GET /health del API productivo
  -> diff API servido..master
  -> comparación amplia + orden de release
  -> manifiesto teórico + rollback por app
  -> resumen y JSON sanitizado por 90 días
  -> cero mutaciones productivas
```

Una evidencia inconclusa bloquea el job. La promoción no cuenta para el criterio
de salida si falta el API servido en la historia Git, un deployment anterior no
tiene ID verificable, la evidencia no corresponde a `production/master` o el
detector falla.

## Compatibilidad frontend/API

La política versionada vive en
`scripts/vercel-deployment-state-lib.mjs`. Identidad y compatibilidad son
controles distintos: cada componente debe servir exactamente el SHA declarado
en el manifiesto, pero no se fuerza que un frontend y el API compartan el mismo
SHA.

| App       | Política              | Gate productivo                                                                |
| --------- | --------------------- | ------------------------------------------------------------------------------ |
| Envelope  | `backward-compatible` | Contrato compatible hacia atrás y smoke con los SHA independientes declarados. |
| Finance   | `independent`         | Actualmente usa mocks y no consume el API compartido.                          |
| HR        | `independent`         | Actualmente usa mocks y no consume el API compartido.                          |
| Payroll   | `backward-compatible` | Contrato compatible hacia atrás y smoke con los SHA independientes declarados. |
| Scheduler | `approved-pair`       | Pareja frontend/API explícita y verificada cuando cambia contrato o proveedor. |

Ninguna aplicación exige igualdad exacta con el SHA del API. Scheduler sí exige
exactitud de la **pareja declarada**: `Deploy API` recibe el SHA completo del
frontend, comprueba ambos releases y conserva el manifiesto de compatibilidad;
los dos SHA pueden ser distintos.

Si Finance o HR comienzan a consumir el API, o si un contrato de Envelope o
Payroll deja de ser compatible hacia atrás, se debe cambiar esta política, sus
pruebas y el runbook antes de promover ese cambio.

## Coordinación API, migraciones y orden

La sombra calcula el diff desde el SHA que `/health.release` sirve realmente
hasta el SHA de `master`. Marca `Deploy API` como obligatorio ante cambios en:

- `backend/api/**`;
- `packages/types/**`;
- `.nvmrc`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.json` o `turbo.json`.

El gate de BD se activa ante `backend/api/prisma/schema.prisma` o cualquier
migración versionada. Esta clasificación es deliberadamente conservadora: un
falso positivo exige revisar/desplegar el API; una omisión podría publicar un
frontend contra un contrato incorrecto.

Cuando hay cambios Prisma, el orden teórico obligatorio es:

1. confirmar backup recuperable o PITR y su instante UTC;
2. ejecutar `Deploy API`, que aplica migraciones compatibles hacia adelante;
3. verificar `/health` con el SHA esperado y `/ready`;
4. comprobar las parejas de compatibilidad aplicables;
5. publicar sólo los frontends afectados;
6. verificar el manifiesto productivo de seis componentes;
7. ejecutar smokes públicos y el smoke autenticado permitido;
8. observar al menos 15 minutos y crear el tag.

Sin cambios de API/BD, la simulación empieza en la publicación de frontends y
conserva el SHA actual del API en el manifiesto.

## Comparación contra el fan-out vigente

`broadComparison` registra para cada proyecto si la integración Git observó un
deployment del SHA objetivo, su estado y su ID. Un deployment observado para
una app que el detector omitió se contabiliza como `avoidableBroadDeployment`.

La ausencia temporal de una observación no prueba que Vercel haya omitido el
deployment: el corte puede ocurrir mientras Vercel todavía procesa el webhook.
Para cada promoción se debe revisar nuevamente el historial al cerrar la
ventana de observación y registrar cualquier discrepancia. Un falso negativo
del detector es bloqueante y reinicia el conteo de promociones válidas.

## Manifiesto y rollback en seco

El manifiesto teórico usa:

- el SHA objetivo para cada app afectada;
- el `baseSha` servido anteriormente para cada app omitida;
- el SHA objetivo del API si el diff exige `Deploy API`;
- el SHA actual de `/health.release` si el API no cambia.

Para cada app afectada, `rollbackDrills` exige encontrar en la evidencia el
deployment `READY` cuyo SHA coincide con `baseSha`. Registra el `dpl_*`, el SHA
a restaurar y un manifiesto alternativo donde sólo esa app regresa. Esto ensaya
selección y trazabilidad, pero deliberadamente no reasigna un dominio.

Un ensayo operativo real de alias corresponde a la Fase 8 y sólo puede hacerse
tras aprobación explícita. La base de datos nunca se revierte destructivamente;
las migraciones deben ser compatibles y cualquier corrección avanza con una
nueva migración.

## Evidencia y activación

El workflow conserva por 90 días
`vercel-production-shadow-<sha>-<attempt>/vercel-production-shadow.json`. No
contiene tokens, bypass, URLs privadas, valores de variables, cookies ni datos
operativos. El diagnóstico Vercel fuente conserva su artefacto por 30 días.

Antes de solicitar la Fase 8 se requieren al menos tres promociones
representativas consecutivas:

1. cambio aislado de un frontend;
2. cambio de API/contrato y, si aplica, migración aditiva;
3. documentación o backend exclusivo que demuestre omisiones correctas.

En cada una revisar:

- cero falsos negativos;
- apps seleccionadas y omitidas;
- fan-out amplio evitable;
- objetivo de rollback `READY` por app afectada;
- orden API/BD/frontend correcto;
- manifiesto de seis componentes válido;
- ninguna operación mutante en el job;
- intento, duración y cualquier rerun o flakiness.

La Fase 7 no activa automáticamente la Fase 8. Se requiere aprobación explícita
registrada después de revisar la evidencia completa.

## Validación local

```text
pnpm deploy:production-shadow:test  7/7
pnpm deploy:impact:test             36/36
pnpm deploy:pilot:test              13/13
pnpm deploy:development:test         4/4
pnpm deploy:release-manifest:test    5/5
pnpm lint                           15/15 workspaces
pnpm type-check                     18/18 tareas
pnpm test:unit                     133/133
pnpm turbo:graph:verify              9 apps, 15 builds
KEYSAR_RELEASE_SHA=<sha> pnpm ci:build  API, 7 frontends Next.js y POS web
```

El contrato prueba clasificación API/Prisma, comparación del deployment amplio,
manifiesto de seis componentes, rollback individual, políticas de compatibilidad
y fallos cerrados. También pasaron Prettier y `git diff --check`. Las pruebas
locales no sustituyen la aprobación del environment, el historial remoto ni las
tres promociones observadas.

## Rollback

No existe rollback operativo de esta fase porque no modifica producción. Si la
sombra produce ruido o bloqueos incorrectos:

1. deshabilitar temporalmente sólo el job `production-shadow`;
2. conservar el detector y el flujo productivo amplio existentes;
3. corregir el contrato y repetir sus pruebas;
4. reiniciar el conteo de promociones representativas.
