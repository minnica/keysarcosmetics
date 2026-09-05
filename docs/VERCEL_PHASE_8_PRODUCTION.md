# Vercel Fase 8 — activación gradual en producción

> Fecha de implementación en repositorio: 5 de septiembre de 2026  
> Estado: **implementada en repositorio; activación y evidencia remotas pendientes**  
> Producción: **no modificada durante esta implementación**

## Resultado

El workflow `Vercel selective frontends and production shadow` conserva la
sombra de sólo lectura y, únicamente después de que ésta termina en verde,
puede construir y publicar las aplicaciones productivas afectadas cuyos flags
individuales estén activos.

La implementación agrega:

- plan de activación gradual derivado del reporte de Fase 7;
- cinco flags productivos independientes, apagados por defecto;
- HR como primer candidato por no consumir API ni variables de build;
- build `vercel build --prod` con settings y variables Production;
- deployment `--prebuilt --prod --skip-domain` antes de publicar;
- validación de proyecto, target `production`, estado `READY`, metadata Git y
  `keysar-release` sobre el deployment inmutable;
- gates explícitos de API, Prisma y compatibilidad;
- revalidación de `origin/master` inmediatamente antes de mover el dominio;
- smokes públicos, recorridos autenticados de sólo lectura y observación
  repetida durante 15 minutos;
- manifiesto de cinco frontends más API y métricas sanitizadas por 90 días;
- workflow manual separado para ensayo sin dominio, publicación y rollback.

Ningún flag, secret, domain, iniciador Git o configuración remota fue creado o
modificado durante la implementación. Un flag ausente, vacío o con valor
`false` se interpreta como apagado; un valor distinto de `true`/`false` bloquea
el plan. Hasta completar la Fase 7 y activar un flag en GitHub, el nuevo job
productivo queda omitido.

## Flujo automático

```text
merge commit develop -> master
  -> CI verde del SHA exacto
  -> detector contra último READY productivo por app
  -> sombra productiva + objetivos de rollback
  -> plan gradual según flags de production
  -> environment production + reviewer
  -> gates API/Prisma/compatibilidad
  -> vercel pull --environment=production
  -> vercel build --prod
  -> deploy Production inmutable sin dominio
  -> verificar READY + proyecto + master + keysar-release
  -> revalidar head de master
  -> promover el deployment a los dominios productivos de la app
  -> verificar dominio y SHA
  -> smoke público + autenticado
  -> 15 minutos de observación repetida
  -> manifiesto y evidencia por 90 días
```

La matriz usa máximo un build productivo simultáneo. Los grupos de
concurrencia son por aplicación y `cancel-in-progress: false`: una publicación
productiva iniciada no se cancela a mitad de operación. Un rerun reutiliza el
deployment `READY` observado para la misma app y SHA cuando existe.

## Activación gradual

Crear como variables, inicialmente con valor `false`:

```text
VERCEL_ENVELOPE_PRODUCTION_SELECTIVE_ENABLED
VERCEL_FINANCE_PRODUCTION_SELECTIVE_ENABLED
VERCEL_HR_PRODUCTION_SELECTIVE_ENABLED
VERCEL_PAYROLL_PRODUCTION_SELECTIVE_ENABLED
VERCEL_SCHEDULER_PRODUCTION_SELECTIVE_ENABLED
```

Orden recomendado:

1. HR;
2. Finance;
3. Envelope;
4. Payroll;
5. Scheduler.

Para cada aplicación:

1. completar primero las tres promociones representativas y la aprobación de
   la Fase 7;
2. provisionar credenciales de mínimo alcance en el environment `production`;
3. validar proyecto, Root Directory, Node `22.x`, comandos y variables;
4. ejecutar `deploy_without_domain` dos veces para comprobar build e
   idempotencia sin publicar;
5. ejecutar `publish_existing` y el rollback real al deployment sano anterior;
6. restaurar el deployment candidato si el ensayo fue verde;
7. retirar el iniciador Git automático sólo de esa aplicación;
8. comprobar que no existe doble iniciador;
9. cambiar únicamente su flag a `true`;
10. observar al menos una promoción directa y una compartida antes de avanzar.

Si una promoción afecta aplicaciones activas y no activas, sólo se incluyen en
la matriz las activas. Las diferidas conservan su `baseSha` anterior en el
manifiesto y seguirán apareciendo como afectadas en promociones posteriores
porque el detector compara contra su último deployment exitoso.

## Configuración protegida

En el environment `production` configurar:

```text
# Secrets, separados de development
VERCEL_ORG_ID
VERCEL_TOKEN_<APP>_DEPLOY
VERCEL_PROJECT_ID_<APP>
<APP>_VERCEL_BYPASS_SECRET        # sólo si la protección lo requiere

# Variables por proyecto
VERCEL_<APP>_PRODUCTION_DOMAIN

# Variables de URLs ya usadas por smokes
API_BASE_URL
ENVELOPE_BASE_URL
FINANCE_BASE_URL
HR_BASE_URL
PAYROLL_BASE_URL
SCHEDULER_BASE_URL
```

Los nombres de token y project ID coinciden con development, pero sus valores
pertenecen a environments distintos y no se comparten. Los scripts consultan
los nombres de variables Vercel con `decrypt=false`; nunca descargan o publican
sus valores en la evidencia.

Antes de activar una aplicación confirmar que su dominio
`VERCEL_<APP>_PRODUCTION_DOMAIN` coincide con la URL pública principal del
environment usada para verificar la promoción y por los smokes.

## Gates de API, Prisma y compatibilidad

La sombra clasifica el diff desde `/health.release` hasta `master`. Cuando el
reporte exige API, ejecutar primero `Deploy API` en `production` y, después de
verificar `/health` y `/ready`, fijar temporalmente:

```text
VERCEL_PRODUCTION_API_GATE_SHA=<sha completo servido por API>
```

Cuando existen cambios Prisma, también se requiere:

```text
VERCEL_PRODUCTION_DATABASE_GATE_SHA=<sha completo de master ya migrado>
```

Ese valor representa la evidencia administrativa de que el workflow protegido
confirmó backup/PITR, aplicó `prisma migrate deploy`, desplegó API y verificó
readiness. No sustituye el artefacto ni la revisión de `Deploy API`.

Envelope, Payroll y Scheduler requieren además una aprobación exacta por app:

```text
VERCEL_<APP>_PRODUCTION_COMPATIBILITY=<frontend_sha>:<api_sha>
```

El valor debe coincidir byte por byte con la pareja que el job va a publicar.
Envelope y Payroll declaran compatibilidad hacia atrás; Scheduler exige una
pareja explícita aprobada. Finance y HR son independientes mientras conserven
su implementación mock y no necesitan esta variable. Cambiar esa arquitectura
obliga a actualizar la política antes de desplegar.

Después de cerrar la release, retirar o reemplazar los valores de gate para que
no autoricen accidentalmente otro SHA.

## Ensayo y rollback manual

El workflow `Vercel production frontend operations` admite:

- `deploy_without_domain`: construye con Production, crea un deployment
  productivo inmutable con `--skip-domain` y lo verifica;
- `publish_existing`: exige `PUBLICAR_PRODUCCION`, un `dpl_*`, SHA completo y
  que ese SHA siga siendo el head de `master`;
- `rollback`: exige `ROLLBACK_PRODUCCION`, el `dpl_*` sano anterior y su SHA.

Antes de mover un dominio, publicación y rollback exigen además que
`VERCEL_PRODUCTION_MANUAL_GATE` coincida con
`<frontend_sha>:<api_sha_servido>`. Las apps no independientes vuelven a exigir
su pareja de compatibilidad. Así el workflow manual no permite eludir los gates
del flujo automático.

Publicación usa `vercel promote` y rollback usa `vercel rollback`, siguiendo el
flujo recomendado para un deployment Production creado con `--skip-domain`.
Ambos vuelven a verificar target `production`, proyecto, estado `READY`,
procedencia `master`, SHA servido y dominio después de la operación.
El environment requiere reviewer y la concurrencia por app nunca cancela una
operación en curso.

Rollback de frontend:

1. abrir el artefacto de sombra/activación y localizar el `dpl_*` anterior;
2. ejecutar `rollback` con ese deployment ID y su SHA;
3. aprobar el environment `production`;
4. verificar dominio, smoke público y, si aplica, autenticado;
5. registrar causa, tiempo de recuperación y manifiesto resultante.

Las migraciones nunca se revierten destructivamente. Si el problema es el
detector, poner el flag de la app en `false`, restaurar el deployment sano y
reactivar temporalmente el iniciador productivo amplio sólo para ese proyecto.

## Smokes, observación y evidencia

Después de publicar todas las apps activas afectadas, el workflow:

1. ejecuta los ocho smokes públicos de sólo lectura;
2. registra el manifiesto exacto de Envelope, Finance, HR, Payroll, Scheduler y
   API;
3. instala Chromium y ejecuta los tres recorridos productivos de Envelope y
   tres de Payroll con cuentas de monitoreo;
4. repite el smoke público cada cinco minutos durante 15 minutos;
5. registra duración de cada muestra y falla ante HTTP, readiness o SHA
   incorrectos;
6. elimina sesiones y resultados autenticados;
7. conserva únicamente el manifiesto y métricas sanitizadas durante 90 días.

Además de este gate HTTP, revisar logs y métricas de Fly/Vercel durante la
ventana. El workflow no descarga datos operativos, no publica traces,
screenshots, video, reportes HTML, cookies, tokens ni valores de variables.

## Métricas y criterio de cierre remoto

Conservar por promoción:

- aplicaciones detectadas, activadas, diferidas y omitidas;
- deployment creado o reutilizado, duración e intento;
- SHA frontend/API y modo de compatibilidad;
- resultado y duración de cada muestra de observación;
- rollback, flakiness o incidente;
- deployments selectivos reales frente a los 356 de línea base y los 314
  originados fuera de `develop`/`master`.

La fase sólo puede cerrarse remotamente cuando:

- los cinco proyectos usan un único iniciador;
- sólo las apps afectadas reciben deployments productivos;
- el manifiesto multiversión queda verificado;
- existe al menos un rollback individual real y verde;
- el consumo observado es inferior a la línea base;
- no existen falsos negativos.

## Validación local

```text
pnpm deploy:production:test         14/14
pnpm deploy:production-shadow:test   7/7
pnpm deploy:development:test         4/4
pnpm deploy:pilot:test              13/13
```

También deben pasar detector, manifiesto, grafo, lint, type-check, unit tests y
builds antes de promover. `Production builds` ejecuta automáticamente
`deploy:production:test`. Las pruebas locales no sustituyen reviewers,
credenciales, configuración Vercel, smokes sobre dominios reales, observación o
rollback remoto.
