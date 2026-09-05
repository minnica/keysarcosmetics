# Análisis de actualización a Vercel Pro

**Fecha del análisis:** 4 de septiembre de 2026  
**Repositorio:** [`minnica/keysarcosmetics`](https://github.com/minnica/keysarcosmetics)

## Recomendación ejecutiva

Si la cuenta se encuentra actualmente en Hobby, se recomienda pasar Keysar Cosmetics a Vercel Pro.

La razón principal no es el tamaño del repositorio, sino que:

- Es una plataforma comercial para una empresa, mientras que Hobby está destinado a proyectos personales y no comerciales.
- La actividad reciente de despliegue ya roza o supera los límites operativos de Hobby.
- Existen cinco aplicaciones Vercel de producción conectadas al mismo monorepo.
- El sistema maneja procesos sensibles de nómina, ventas, clientes, agenda y Recursos Humanos, por lo que se beneficia de mejores capacidades de diagnóstico y menores colas de compilación.

Antes o al mismo tiempo que se haga la actualización, debe corregirse el exceso de despliegues automáticos. De lo contrario, parte de ese trabajo innecesario podría convertirse en consumo facturable dentro de Pro.

## Estado verificado de GitHub

El MCP de GitHub respondió correctamente y está autenticado como `minnica`, con permisos administrativos sobre el repositorio.

- Repositorio público, principalmente TypeScript.
- Rama predeterminada: `develop`, protegida.
- `master` también está protegida.
- Rama local durante el análisis: `feature/pos-frontend-clean`.
- Working tree limpio y sincronizado con su rama remota.
- HEAD de la rama analizada: `66781a5`.
- El [último CI de la rama](https://github.com/minnica/keysarcosmetics/actions/runs/33902438762) terminó correctamente.
- `develop` se encontraba en `6846ced` y su [CI también terminó correctamente](https://github.com/minnica/keysarcosmetics/actions/runs/33903008424).
- El [último smoke test de producción consultado](https://github.com/minnica/keysarcosmetics/actions/runs/33448145195) terminó correctamente sobre `master`.
- La rama local aparecía 22 commits por delante y uno por detrás de `develop`, consistente con su integración mediante squash en la PR #84.
- GitHub reportaba seis elementos abiertos, cifra que puede incluir issues y pull requests.

## Estado verificado de Vercel

El plugin oficial de Vercel versión `0.21.4` estaba cargado y el MCP de Vercel respondió correctamente a consultas autenticadas de proyectos, despliegues y protección.

Se identificaron cinco proyectos vinculados a este repositorio:

- `keysarcosmetics-envelope`
- `keysarcosmetics-payroll`
- `keysarcosmetics-finance`
- `keysarcosmetics-scheduler`
- `keysarcosmetics-hr`

Los cinco dominios de producción apuntaban a despliegues con estado `READY` durante la consulta. Las previews tenían Vercel Authentication habilitado, mientras que los dominios productivos estaban excluidos de esa protección.

Web Analytics no estaba habilitado en ninguno de los cinco proyectos. Por ese motivo, no fue posible medir mediante el MCP las visitas, transferencia o tráfico real. Las herramientas disponibles tampoco expusieron directamente el plan de facturación ni el panel agregado de Usage de la cuenta.

## Análisis del tamaño

Aunque el workspace local ocupaba aproximadamente **2.7 GB**, esa cifra no representa lo que se envía desde GitHub a Vercel:

- `node_modules`: aproximadamente **1.7 GB**.
- Builds `.next` y otros artefactos ignorados: cerca de **1 GB**.
- Archivos realmente versionados: aproximadamente **23 MB**.
- Tamaño reportado por GitHub: aproximadamente **15.5 MB**.

Tamaño aproximado del código versionado por aplicación desplegada en Vercel:

| Aplicación | Tamaño aproximado |
| --- | ---: |
| Scheduler | 1.8 MB |
| Envelope | 1.1 MB |
| Payroll | 964 KB |
| Finance | 168 KB |
| HR | 148 KB |

El POS ocupa aproximadamente 13 MB dentro de los archivos versionados, pero es una aplicación Electron + React + Vite y no se despliega en Vercel. El backend compartido está desplegado en Fly.io y PostgreSQL vive en Supabase.

Por tamaño, Hobby sería suficiente. Los archivos relevantes están muy por debajo del límite de 100 MB para subidas estáticas mediante CLI del plan Hobby. Este límite no debe confundirse con el tamaño completo del workspace local.

Fuente: [límites oficiales de Vercel](https://vercel.com/docs/limits).

## Problema principal: exceso de despliegues

El MCP devolvió los últimos 20 despliegues de cada uno de los cinco proyectos y todavía existían páginas adicionales:

- Al menos **100 despliegues** dentro de una ventana aproximada de ocho horas.
- 77 terminaron en `READY`.
- 10 terminaron en `ERROR`.
- 13 terminaron en `CANCELED`.

Se observaron cambios de `feature/scheduler` que generaron despliegues de Payroll, Envelope, Finance y HR. Cambios del POS y ramas de Dependabot también dispararon varios proyectos no relacionados directamente.

Según los límites oficiales consultados:

| Límite | Hobby | Pro |
| --- | ---: | ---: |
| Despliegues creados por día | 100 | 6,000 |
| Builds concurrentes | 1 | 12 |
| Tiempo máximo por build | 45 minutos | 45 minutos |

Hobby también limita la cuenta a 32 builds por hora. Con la actividad observada, el repositorio puede consumir el límite diario de Hobby en pocas horas.

Fuente: [límites oficiales de Vercel](https://vercel.com/docs/limits).

## Optimización necesaria del monorepo

Vercel puede omitir automáticamente proyectos no afectados dentro de un monorepo pnpm/Turborepo. Este mecanismo es preferible a depender solamente de `Ignored Build Step`, porque los builds cancelados mediante el paso ignorado pueden seguir contando contra los límites de despliegue y concurrencia.

Acciones recomendadas:

1. Verificar el `Root Directory` de cada proyecto: `apps/envelope`, `apps/payroll`, `apps/finance`, `apps/scheduler` y `apps/hr`.
2. Activar **Skip deployments for unaffected projects** en cada proyecto.
3. Confirmar que todas las dependencias hacia `packages/*` estén declaradas explícitamente en los `package.json` correspondientes.
4. Revisar cuáles ramas realmente necesitan previews para cada aplicación.
5. Evitar que cambios exclusivos del POS o de una app generen despliegues de los otros cuatro proyectos.
6. Revisar el comportamiento de las ramas automáticas de Dependabot.

Fuente: [documentación oficial de monorepos de Vercel](https://vercel.com/docs/monorepos).

## Coste y beneficios de Pro

El plan Pro tenía un precio base de **USD 20 al mes** al momento del análisis e incluía:

- Un asiento con capacidad de despliegue.
- USD 20 de crédito mensual para infraestructura.
- 10 millones de Edge Requests incluidos.
- 1 TB de Fast Data Transfer incluido.
- Builds más rápidos y con menos colas.
- Controles avanzados de gasto.
- Un día de retención de runtime logs, frente a una hora en Hobby.
- Asientos Viewer gratuitos.

Cada miembro adicional con capacidad de administrar o desplegar tiene un coste de USD 20 al mes. Los créditos no utilizados expiran al final del ciclo y, una vez agotados, el consumo puede pasar a facturación bajo demanda.

Fuentes:

- [Precios oficiales de Vercel](https://vercel.com/pricing)
- [Documentación del plan Pro](https://vercel.com/docs/plans/pro-plan)
- [Administración y optimización de uso](https://vercel.com/docs/pricing/manage-and-optimize-usage)

## Razones para actualizar

1. **Uso comercial:** Keysar Cosmetics es una plataforma empresarial y no encaja con el propósito personal y no comercial de Hobby.
2. **Volumen de despliegues:** la actividad observada alcanza el límite diario de Hobby.
3. **Concurrencia:** cinco proyectos conectados al mismo repositorio generan colas y cancelaciones con un solo build concurrente.
4. **Operación sensible:** Payroll, Envelope, Scheduler, Finance y HR requieren mejor retención de logs y capacidad de diagnóstico.
5. **Crecimiento:** el monorepo todavía contempla aplicaciones y backends en preparación, por lo que la carga operativa probablemente aumentará.

## Razones por las que Pro todavía no puede justificarse por consumo

- El código desplegable es pequeño.
- El backend y la base de datos no consumen infraestructura de Vercel.
- Web Analytics está deshabilitado.
- No se obtuvo el Usage real de transferencia, Edge Requests, funciones o build minutes.
- Gran parte de los despliegues observados es evitable mediante configuración correcta del monorepo.

Por tanto, tráfico, almacenamiento y cómputo no son actualmente los argumentos principales para contratar Pro.

## Riesgos y hallazgos adicionales

- Los proyectos Vercel reportaron Node.js `24.x`, mientras que el repositorio documenta Node.js `22.23.2` para su cadena reproducible. Debe revisarse si los frontends deben fijarse también en Node.js 22 para evitar diferencias entre CI y Vercel.
- Actualizar a Pro no corrige automáticamente la configuración de builds ni el fan-out del monorepo.
- Debe configurarse un límite de gasto y alertas antes de permitir consumo bajo demanda.
- Conviene habilitar Web Analytics o revisar manualmente el panel Usage durante al menos 30 días para obtener una proyección real.

## Decisión final

Se recomienda actualizar a Pro, idealmente iniciando con la prueba disponible y midiendo el consumo durante ese periodo.

La secuencia recomendada es:

1. Corregir el despliegue selectivo del monorepo.
2. Alinear la versión de Node.js entre repositorio, CI y Vercel.
3. Activar la prueba de Pro o actualizar la cuenta.
4. Configurar alertas y un límite de gasto.
5. Medir durante 14–30 días el Usage real por proyecto.
6. Mantener Pro para la operación comercial, ajustando builds y asientos según los datos obtenidos.

