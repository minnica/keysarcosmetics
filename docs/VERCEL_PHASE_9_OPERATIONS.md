# Vercel Fase 9 — cierre y mantenimiento

> Fecha de implementación en repositorio: 5 de septiembre de 2026  
> Estado: **implementada en repositorio; cierre remoto pendiente**  
> Mutaciones remotas realizadas: **ninguna**

## Resultado

La estrategia selectiva cuenta ahora con un cierre operativo verificable:

- auditoría semanal y manual de los cinco proyectos activos;
- comprobación de manifiestos, Root Directories, rutas estables, ramas y
  cantidad de iniciadores;
- métricas de deployments evitados contra el fan-out amplio, duplicados,
  fallos del detector y falsos positivos/negativos confirmados;
- procedimiento de redeploy por aplicación para variables o incidentes;
- registro versionado de revisiones del detector;
- contrato local protegido por `pnpm deploy:operations:test` dentro de
  `Production builds`;
- retiro de outputs exclusivos del antiguo piloto HR y una sola regla de
  exclusión para todo el tooling Vercel del detector.

La implementación no declara terminada la migración administrativa. Las Fases
5–8 todavía requieren credenciales, ensayos, smokes, rollbacks y observación
reales. Hasta que eso ocurra, la auditoría debe devolver `transition`, no
`ready`.

## Auditoría periódica

`Vercel operations audit` se ejecuta cada lunes a las 13:17 UTC y también por
`workflow_dispatch`. Recorre primero `development` y luego `production`; al
usar los environments existentes, production conserva su reviewer aun cuando
el job sólo haga lecturas.

El workflow usa exclusivamente:

- `contents: read` y `actions: read` de GitHub;
- `VERCEL_TOKEN_READ_ONLY`;
- project IDs ya protegidos por environment;
- aliases/domains y flags existentes como variables, nunca sus valores de
  build;
- endpoints `GET` de proyectos, nombres de variables, deployments y rutas.

No instala Vercel CLI y no contiene `deploy`, `promote`, `rollback`, cambios de
alias, dominios, variables o integraciones.

Por cada ambiente verifica:

1. proyecto, framework, Node, comandos, output y Root Directory;
2. repositorio `minnica/keysarcosmetics` y Production Branch `master`;
3. ruta estable resuelta a un deployment `READY` del proyecto, target y rama
   correctos;
4. SHA completo de cada aplicación y manifiesto multiversión resultante;
5. exactamente un iniciador automático por proyecto:
   - flag selectivo `true` + `createDeployments=disabled`; o
   - flag selectivo `false` + `createDeployments=enabled` durante la migración;
6. historial de deployments y corridas CI/detector dentro de la ventana.

Estados posibles:

- `ready`: las cinco apps usan Actions como iniciador único y el contrato
  remoto coincide;
- `transition`: cada app tiene un solo iniciador, pero al menos una conserva la
  integración Git;
- `blocked`: falta evidencia, una ruta/configuración diverge, hay cero o dos
  iniciadores o existe un falso negativo sin resolver.

`phase9Ready` sólo vale `true` cuando además no se observaron deployments de
ramas de trabajo ni fallos del detector en la ventana. Los JSON sanitizados y
manifiestos se conservan 90 días.

## Métricas

La auditoría usa las corridas `push` de CI verdes como conjunto elegible. La
línea base amplia de un ambiente es:

```text
SHAs elegibles × 5 proyectos activos
```

Los deployments evitados son la diferencia entre esa línea base y los pares
únicos aplicación/SHA observados en Vercel. Se reportan también solicitudes
duplicadas, estados de deployment y ramas de trabajo. Es una comparación
operativa contra el fan-out anterior, no una cifra de facturación.

Los fallos del detector se obtienen de corridas CI verdes cuyo job `Select
affected Vercel frontends` no terminó en `success`. Un falso positivo o falso
negativo requiere revisión humana y se registra por PR en
`docs/vercel-detector-reviews.json`:

```json
{
  "id": "VFP-2026-001",
  "detectedAt": "2026-09-05T12:00:00.000Z",
  "environment": "development",
  "application": "payroll",
  "classification": "false-positive",
  "resolution": "Regla corregida y caso de regresión agregado.",
  "resolvedAt": "2026-09-05T15:00:00.000Z"
}
```

No registrar URLs privadas, payloads, variables, tokens ni datos operativos.
Un falso negativo no resuelto bloquea la auditoría.

## Redeploy por variables o incidente

Un cambio de variables no modifica Git, por lo que el detector no puede
seleccionarlo. El redeploy siempre es por una sola aplicación y usa los
workflows manuales existentes. Ambos exigen `change_reference` con un ticket o
incidente de 3–80 caracteres (`A-Z`, `a-z`, números, `.`, `_`, `/` o `-`).

### Development

1. Cambiar la variable Preview del proyecto y alcance `develop` en Vercel.
2. Obtener el SHA completo servido actualmente por el alias estable.
3. Ejecutar `Vercel development frontend operations` con:
   - `operation=deploy_without_alias`;
   - el SHA actual;
   - `change_reference`.
4. Verificar el nuevo deployment inmutable, rutas y assets. Esta operación
   siempre construye un deployment nuevo aunque ya exista otro del mismo SHA.
5. Ejecutar `publish_existing` con su `dpl_*`, el mismo SHA,
   `PUBLICAR_DEVELOP` y la misma referencia.
6. Ejecutar smokes con el manifiesto multiversión y conservar evidencia.

### Production

1. Abrir incidente/cambio, verificar rollback y modificar la variable
   Production del proyecto.
2. Usar el SHA completo que sigue autorizado en `master`.
3. Fijar `VERCEL_PRODUCTION_MANUAL_GATE` y, si aplica, la pareja de
   compatibilidad contra el SHA real del API.
4. Ejecutar `Vercel production frontend operations` con
   `operation=deploy_without_domain`, SHA y `change_reference`.
5. Verificar el nuevo `dpl_*` sin dominio y aprobar `publish_existing` con
   `PUBLICAR_PRODUCCION`.
6. Ejecutar smokes públicos/autenticados, observar 15 minutos y registrar el
   manifiesto.
7. Ante falla, ejecutar `rollback` con el deployment sano anterior,
   `ROLLBACK_PRODUCCION` y la misma referencia de incidente.

Nunca usar un build Preview en producción ni ejecutar un deployment productivo
desde una terminal local.

## Cierre remoto y retiro de transición

Para cada app y ambiente, en orden HR, Finance, Envelope, Payroll y Scheduler:

- [ ] completar ensayos, publicación, smoke y rollback de las Fases 5–8;
- [ ] apagar `createDeployments` sólo cuando el flag selectivo correspondiente
      esté listo;
- [ ] confirmar en la auditoría que hay exactamente un iniciador;
- [ ] observar al menos una release directa y una compartida sin duplicados;
- [ ] conservar cero deployments desde ramas de trabajo durante 30 días.

Cuando ambos ambientes de las cinco apps den `phase9Ready=true`:

1. retirar notas y flags históricos que ya no aparezcan en
   `ACTIVE_VERCEL_PROJECTS`;
2. conservar los flags selectivos actuales como kill switches operativos;
3. conservar los workflows manuales para redeploy y rollback;
4. actualizar el corte remoto de este documento, el plan y `CLAUDE.md` con los
   IDs de runs, fechas y métricas reales.

## Alta de aplicaciones y paquetes

Una aplicación nueva no entra al flujo sólo por añadir su workspace:

1. provisionar proyecto y ruta estable;
2. agregarla a `ACTIVE_VERCEL_PROJECTS` y retirarla de
   `UNPROVISIONED_VERCEL_APPLICATIONS`;
3. declarar Root Directory, settings, variables, credenciales, flags y modo de
   compatibilidad;
4. exponer `keysar-release` y agregar smoke público;
5. ampliar manifiestos, matrices y contratos;
6. ejecutar detector, deploy sin alias/dominio, publicación y rollback;
7. retirar el iniciador Git y exigir una auditoría verde.

Un paquete compartido nuevo debe declarar sus dependencias workspace reales.
No se agrega una lista manual de consumidores: se incorpora un caso de
aceptación y el detector resuelve el cierre transitivo desde los manifests.

## Validación local

```text
pnpm deploy:operations:test   6/6
pnpm deploy:impact:test      35/35
pnpm deploy:development:test  4/4
pnpm deploy:pilot:test       13/13
pnpm deploy:production:test  14/14
```

También pasaron Prettier, el parse de todos los workflows YAML,
`git diff --check`, lint (`15/15`), type-check (`18/18`), unitarios (`133/133`)
y los builds de API, siete frontends Next.js y POS web. Permanecen únicamente
los warnings ya conocidos de Envelope, Payroll, Scheduler y tamaño/CJS de POS.
Estas pruebas no sustituyen la primera corrida remota ni las tareas pendientes
de las Fases 5–8.
