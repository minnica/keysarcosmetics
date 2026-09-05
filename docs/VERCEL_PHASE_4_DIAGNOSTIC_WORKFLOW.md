# Vercel Fase 4 — workflow frontend en modo diagnóstico

> Continuidad: desde la Fase 6 la matriz puede ser consumida por cualquiera de
> los cinco proyectos en `develop`, siempre bajo su flag individual. Desde la
> Fase 7, `master` agrega una sombra productiva de sólo lectura y continúa sin
> publicar.

> Fecha de implementación: 5 de septiembre de 2026  
> Estado: **implementada en repositorio; pendiente de observación remota**  
> Alcance operativo: ninguna configuración, variable, integración, deployment o
> alias de Vercel fue modificado.

## Resultado

El workflow `.github/workflows/vercel-impact-diagnostic.yml` conectó la CI con
el detector de impacto sin habilitar publicación durante la Fase 4. Conserva
intacto ese job de selección de sólo lectura y, desde la Fase 6, expone su
matriz a los cinco frontends activos de `develop`, cada uno cerrado por su
propia bandera administrativa. Se ejecuta después de `CI`, únicamente para
pushes del mismo repositorio a `develop` o `master`, y continúa sólo cuando esa
corrida terminó en verde. `master` sigue siendo exclusivamente diagnóstico.

La selección cubre los cinco proyectos Vercel activos del monorepo:

| Aplicación | Proyecto Vercel             | Root Directory   |
| ---------- | --------------------------- | ---------------- |
| Envelope   | `keysarcosmetics-envelope`  | `apps/envelope`  |
| Finance    | `keysarcosmetics-finance`   | `apps/finance`   |
| HR         | `keysarcosmetics-hr`        | `apps/hr`        |
| Payroll    | `keysarcosmetics-payroll`   | `apps/payroll`   |
| Scheduler  | `keysarcosmetics-scheduler` | `apps/scheduler` |

Landing, CRM y POS quedan identificadas en el resumen como no provisionadas;
no entran en la matriz ejecutable hasta que tengan un proyecto validado.

## Secuencia y límites

```text
push a develop/master
  → CI completada en verde
  → checkout del head SHA exacto con historia completa
  → GET de historial Vercel por proyecto y ambiente
  → último READY anterior que también sea ancestro del target
  → detector fail-closed de Fase 1
  → matriz JSON + GITHUB_STEP_SUMMARY + artefactos por 30 días
  → job diagnóstico: 0 builds, 0 deployments, 0 promociones, 0 cambios de alias
```

`workflow_run` aporta la espera de CI. El gate comprueba además que el evento
original sea `push`, que el repositorio de origen sea este mismo repositorio y
que rama/SHA tengan el contrato esperado. El checkout usa `fetch-depth: 0` para
que `git merge-base --is-ancestor` y los diffs históricos puedan fallar de forma
explícita si falta evidencia.

Durante la Fase 4 el job `Deployments disabled in Phase 4` fue la frontera
explícita. La Fase 5 lo sustituyó por un consumidor exclusivo de HR y la Fase 6
lo generalizó mediante una matriz a Envelope, Finance, HR, Payroll y Scheduler.
El job de selección no recibe credenciales de escritura; sólo los jobs de la
matriz acceden al secret del proyecto afectado después de superar su flag. Ver
`docs/VERCEL_PHASE_6_DEVELOPMENT.md`.

## Evidencia de deployments

`scripts/collect-vercel-deployment-state.mjs` usa el cliente nativo de Node para
hacer únicamente `GET /v6/deployments`. No instala ni ejecuta Vercel CLI, no
descarga variables de ambiente y no imprime respuestas remotas.

Para cada aplicación:

1. consulta Preview para `develop` o Production para `master`;
2. acepta sólo metadatos Git de `minnica/keysarcosmetics` y la rama evaluada;
3. separa cualquier deployment del SHA objetivo como observación de la
   integración Git todavía activa;
4. descarta como base ese mismo SHA y cualquier commit que no sea ancestro;
5. conserva la secuencia de estados hasta encontrar el último `READY` válido.

El cuarto punto evita una carrera importante: si la integración Git termina el
deployment actual antes que el diagnóstico, ese deployment no puede convertirse
en su propia base y producir falsamente una matriz vacía. Conservar estados
`ERROR` anteriores mantiene también el caso acumulativo: un cambio pendiente
después de un deployment fallido sigue apareciendo aunque el commit siguiente
sólo modifique documentación.

La consulta pagina hasta 20 bloques de 100 deployments. Ausencia de credencial,
respuesta no válida, historia insuficiente, cursor repetido o falta de un
`READY` ancestro terminan con error; nunca generan una selección vacía.

## Credencial requerida

Antes de la primera corrida remota se debe crear el secret de repositorio:

```text
VERCEL_TOKEN_READ_ONLY
```

Debe ser una credencial dedicada, limitada al scope que contiene los cinco
proyectos y rotada según la política operativa. El nombre describe el uso que
hace este workflow: el código sólo emite solicitudes `GET`. Si el tipo de token
disponible en la cuenta no ofrece permisos granulares de sólo lectura, registrar
esa limitación al aprobar la estrategia de credenciales de la Fase 5 y no
reutilizar credenciales productivas de otros servicios.

El secret sólo se inyecta en la validación de presencia y en el paso de consulta.
No se guarda en artefactos, outputs o resúmenes. Los errores HTTP tampoco
incluyen el cuerpo de la respuesta.

## Resumen, matriz y artefactos

`scripts/write-vercel-impact-summary.mjs` valida que ambiente, rama y SHA de la
evidencia coincidan exactamente con el resultado del detector. Después publica:

- aplicaciones afectadas y omitidas;
- SHA base individual y SHA objetivo;
- razones y archivos asociados;
- cantidad teórica de deployments;
- estado del deployment automático observado para el mismo SHA;
- coincidencia, fan-out evitable o evidencia aún pendiente.

El output `matrix` sólo contiene aplicaciones afectadas entre los cinco
proyectos activos. El job diagnóstico también expone la decisión y cualquier
deployment `READY` reutilizable del piloto HR; no decide el feature flag ni
recibe secrets de publicación.

Los archivos `vercel-deployment-evidence.json` y `vercel-impact.json` se guardan
como artefacto por 30 días. Contienen slugs, deployment IDs, estados, fechas y
SHAs; no contienen URLs privadas, variables, headers ni tokens. Una observación
ausente significa “no observado al instante de la captura”, no prueba por sí
sola que Vercel haya omitido definitivamente el deployment.

## Validación local

La suite existente incorpora dos contratos nuevos:

- el SHA objetivo observado nunca sustituye al último `READY` ancestro y un
  fallo intermedio se conserva;
- la matriz sólo incluye apps afectadas y el resumen declara explícitamente que
  no hubo mutaciones.

Resultado local del 5 de septiembre de 2026:

```text
pnpm deploy:impact:test
35 tests, 35 pass, 0 fail
```

También se validan formato, sintaxis JavaScript, sintaxis YAML y el detector
histórico antes de cerrar la implementación local.

## Activación y criterio remoto pendiente

1. Configurar `VERCEL_TOKEN_READ_ONLY` sin cambiar la integración Git actual.
2. Fusionar el workflow en la rama por defecto; GitHub sólo permite que un
   workflow `workflow_run` se dispare cuando su definición existe allí.
3. Observar varios merges representativos en `develop`: app directa,
   documentación, backend y paquete compartido.
4. Revisar el `GITHUB_STEP_SUMMARY` y descargar los dos JSON de cada corrida.
5. Comparar la matriz teórica con los deployments creados por la integración Git
   y registrar cualquier falso positivo o negativo.
6. Repetir la observación en promociones `develop → master` sin modificar
   dominios productivos.

La tarea de observación y los criterios remotos permanecen abiertos en
`PLAN_DEPLOYS_SELECTIVOS_VERCEL.md`; no pueden cerrarse con una simulación local.

## Rollback

Deshabilitar o retirar `.github/workflows/vercel-impact-diagnostic.yml`. Los
scripts nuevos pueden permanecer sin efecto o revertirse junto con el workflow.
No existe rollback en Vercel porque esta fase no crea ni modifica recursos.
