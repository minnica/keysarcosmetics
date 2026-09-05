# Vercel Fase 5 — piloto selectivo de HR en `develop`

> Fecha de implementación en repositorio: 5 de septiembre de 2026  
> Estado: **implementada en repositorio; activación y evidencia remota pendientes**  
> Producción: sin cambios

## Resultado y elección del piloto

HR es la aplicación piloto. Frente a las otras candidatas, reduce el alcance
operativo porque no consume API ni variables de ambiente y su estado actual se
mantiene en mocks de `localStorage`. Ya existe el proyecto Vercel
`keysarcosmetics-hr`, su Root Directory es `apps/hr` y la Fase 0 conservó un
deployment Preview sano como punto inicial de rollback.

La implementación agrega dos caminos:

1. `Vercel HR pilot operations` permite crear un Preview del SHA exacto sin
   cambiar alias, publicar después un deployment ya verificado o regresar el
   alias al deployment sano anterior.
2. `Vercel frontend impact and HR pilot` conserva el diagnóstico de la Fase 4
   y sólo despliega HR cuando el detector la marca afectada, la CI del mismo SHA
   terminó correctamente, la rama es `develop` y la bandera administrativa está
   activa.

El job automático está cerrado por default. Fusionar estos archivos no crea un
deployment mientras la variable de repositorio
`VERCEL_HR_PILOT_ENABLED` no valga exactamente `true`.

## Contrato del deployment

Los dos workflows fijan Node.js `22.23.2`, pnpm `10.0.0` y Vercel CLI
`59.11.2`. El flujo ejecuta:

```text
checkout del SHA exacto
  → pnpm install --frozen-lockfile
  → project inspect del destino resuelto
  → vercel pull --environment=preview
  → vercel build con KEYSAR_RELEASE_SHA explícito
  → vercel deploy --prebuilt --archive=tgz
  → GET del deployment y validación fail-closed
  → GET HTTP protegido y comparación de keysar-release
  → comprobación de que develop aún apunta al SHA
  → alias set
  → segunda inspección del alias y del SHA servido
```

El deployment recibe metadatos explícitos de GitHub: organización, repositorio,
rama y SHA. `apps/hr/app/layout.tsx` expone el SHA en
`meta[name="keysar-release"]`; `KEYSAR_RELEASE_SHA` tiene precedencia en el
build externo y `VERCEL_GIT_COMMIT_SHA` conserva compatibilidad con la
integración Git actual.

`scripts/inspect-vercel-pilot-deployment.mjs` no confía sólo en que el comando
de deployment termine correctamente. Comprueba mediante la API que el recurso:

- pertenece al project ID y slug esperados;
- es Preview y está `READY`;
- contiene la procedencia `minnica/keysarcosmetics`, rama `develop` y SHA
  completo esperado;
- responde por HTTPS, atravesando Deployment Protection con una credencial
  separada;
- sirve ese mismo SHA en `keysar-release`.

Un error de red, estado, proyecto, metadata, protección o identidad termina el
job con error. Tokens, bypass y variables descargadas no se imprimen ni se
guardan en artefactos. El JSON retenido 30 días sólo contiene app, ambiente,
deployment ID, URL inmutable, hostname verificado, SHA y fecha.

## Idempotencia y concurrencia

El collector de la Fase 4 separa cualquier deployment del SHA objetivo de la
base histórica. Si esa observación ya está `READY`, el piloto reutiliza su
deployment ID en un rerun; no vuelve a solicitar otro build. Un estado no
terminal o fallido nunca se presenta como éxito.

El grupo `vercel-development-hr` cancela una ejecución anterior antes de
publicar. Inmediatamente antes de mover el alias, el job vuelve a consultar
`origin/develop` y exige que siga apuntando al SHA autorizado. Si la rama
avanzó, el deployment inmutable puede existir, pero no se publica como alias
estable.

## Configuración administrativa requerida

Crear en el GitHub Environment protegido `development`:

| Tipo     | Nombre                    | Alcance                                                                                            |
| -------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| Secret   | `VERCEL_TOKEN_HR_DEPLOY`  | Token dedicado con acceso de deployment sólo al proyecto HR cuando el plan de la cuenta lo permita |
| Secret   | `VERCEL_ORG_ID`           | ID del scope personal propietario                                                                  |
| Secret   | `VERCEL_PROJECT_ID_HR`    | ID de `keysarcosmetics-hr`                                                                         |
| Secret   | `HR_VERCEL_BYPASS_SECRET` | Bypass exclusivo para verificar el Preview protegido                                               |
| Variable | `VERCEL_HR_DEVELOP_ALIAS` | Hostname estable de HR en `develop`, sin `https://`                                                |

Crear además como variable de **repositorio**:

```text
VERCEL_HR_PILOT_ENABLED=false
```

Debe ser de repositorio porque GitHub evalúa el `if` del job antes de liberar
los secrets del Environment. Cambiarla a `true` sólo en el paso de activación.
El token de lectura `VERCEL_TOKEN_READ_ONLY` de la Fase 4 permanece separado.
No reutilizar credenciales de producción, Fly.io, Supabase u otras apps.

Antes del primer ensayo también se debe cambiar el runtime del proyecto HR de
Node.js `24.x` a `22.x` y confirmar que Root Directory siga siendo `apps/hr`,
que el acceso al código del monorepo continúe habilitado y que el proyecto no
tenga variables inesperadas. El workflow ejecuta la versión exacta
`22.23.2`; la configuración remota debe dejar de contradecirla antes de comparar
ambos iniciadores.

## Activación segura

1. Mantener `VERCEL_HR_PILOT_ENABLED=false` y la integración Git de HR activa.
2. Crear los secrets/variables anteriores y revisar los permisos del token.
3. Normalizar Node y confirmar proyecto, Root Directory, protección, assets y
   rutas.
4. Ejecutar `Vercel HR pilot operations` con
   `operation=deploy_without_alias` y el SHA completo de `develop`. Conservar el
   artefacto y verificar manualmente las rutas principales; ningún alias cambia.
5. Ejecutar el mismo SHA una segunda vez si se desea confirmar reproducibilidad.
6. Usar `operation=publish_existing`, el `dpl_*` verificado y la confirmación
   `PUBLICAR_HR_DEVELOP`. Confirmar que el alias sirve el SHA registrado.
7. Ejecutar `operation=rollback` con el deployment sano anterior, su SHA
   completo y `ROLLBACK_HR_DEVELOP`; validar el alias. Volver a publicar el
   deployment piloto con `publish_existing`.
8. Cambiar `VERCEL_HR_PILOT_ENABLED=true`.
9. Sólo después de la evidencia anterior, desactivar el iniciador Git automático
   exclusivamente en `keysarcosmetics-hr`. No modificar los otros cuatro
   proyectos.
10. Ejecutar los casos de aceptación siguientes mediante commits/merges reales
    y conservar los resúmenes y artefactos.

El workflow manual sólo estará disponible cuando su definición exista en la
rama por defecto de GitHub. Esta limitación no se sustituye con una simulación
local.

## Casos de aceptación remotos

| Caso                                          | Resultado requerido                                   |
| --------------------------------------------- | ----------------------------------------------------- |
| Cambio directo en `apps/hr/**`                | Un deployment HR y alias con el SHA exacto            |
| Sólo documentación                            | Cero deployments HR                                   |
| Cambio sólo en otra app                       | Cero deployments HR                                   |
| Cambio en paquete compartido consumido por HR | Un deployment HR                                      |
| Deployment HR fallido + commit no relacionado | HR vuelve a seleccionarse desde el último `READY`     |
| Rerun del mismo workflow                      | Reutiliza el deployment `READY`; no duplica build     |
| Push a rama de trabajo                        | Cero deployments HR                                   |
| Rollback                                      | El alias vuelve al deployment anterior y sirve su SHA |

Hasta registrar estos resultados no se debe marcar la Fase 5 como completada ni
extender el job a Finance, Envelope, Payroll o Scheduler.

## Validación local

La implementación añade `pnpm deploy:pilot:test` al job `Production builds`.
La suite cubre referencias seguras, project/target/status/SHA, metadata Git,
extracción del meta HTML, bypass de protección, release distinto e idempotencia
de observaciones. También permanecen obligatorios el detector completo, lint,
type-check, build de HR, formato y validación sintáctica de workflows.

Resultado local del 5 de septiembre de 2026:

```text
pnpm deploy:pilot:test                         PASS (12/12)
pnpm deploy:impact:test                        PASS (36/36)
pnpm deploy:impact:history                     PASS (5/5)
pnpm deploy:release-manifest:test              PASS (4/4)
pnpm turbo:graph:verify                        PASS (9 aplicaciones, 15 builds)
pnpm lint                                      PASS (15/15 workspaces)
pnpm type-check                                PASS (18/18 tareas)
KEYSAR_RELEASE_SHA=<sha> pnpm --filter @cosmetics/hr build
                                                PASS; meta generado con SHA exacto
pnpm ci:build                                  PASS (API, 8 frontends y POS web)
Prettier + parse YAML + git diff --check       PASS
```

La máquina local usa Node.js 24; esto comprueba el código y la identidad de HR,
no sustituye la corrida del workflow fijada en Node.js `22.23.2` ni el build
real de Vercel.

## Rollback

Rollback operativo:

1. ejecutar `Vercel HR pilot operations` con `operation=rollback`;
2. indicar el deployment `READY` anterior y su SHA completo;
3. escribir `ROLLBACK_HR_DEVELOP`;
4. comprobar el artefacto y el alias servido;
5. poner `VERCEL_HR_PILOT_ENABLED=false`;
6. reactivar temporalmente el iniciador Git de HR si la causa pertenece al
   workflow selectivo.

Rollback de repositorio: retirar el job `deploy-hr-pilot`, el workflow manual y
los scripts del piloto. La lógica de diagnóstico de Fase 4 puede permanecer en
modo de sólo lectura. Ninguna base de datos, API ni dato operativo participa en
este rollback.
