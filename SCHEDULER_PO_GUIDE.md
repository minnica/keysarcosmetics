# Scheduler: entorno funcional para Producto

Rama: `design/scheduler-po`. Base: `feature/scheduler`, commit
`45c9927f7e382ed439e0fe12684b8ed8612b3ba5`.

Este entorno conserva las pantallas actuales y sustituye sus respuestas HTTP
por mocks con MSW. Se pueden proponer cambios visuales y funcionales sin
arrancar Express, conectar PostgreSQL, ejecutar Prisma ni configurar servicios.

## Arranque

Usa Node 22.23.2 y pnpm 10.0.0, como el monorepo.

```bash
pnpm install --frozen-lockfile
pnpm --filter @cosmetics/scheduler dev:design
```

Abre `http://localhost:3008`. No necesitas `.env.local`, cuentas de la empresa
ni credenciales de infraestructura. El comando fuerza el destino ficticio
`https://scheduler-design.invalid`, aunque exista una URL de API heredada.
El puerto puede cambiarse con `SCHEDULER_DESIGN_PORT`.

La primera entrada abre una sesión master ficticia. El botón **Controles de
diseño** permite cambiar de perfil, probar estados y restablecer los datos.
Para trabajar únicamente con esta demo utiliza los comandos `*:design`; el
comando general `pnpm dev` inicia otras aplicaciones del monorepo.

Si quieres probar la pantalla de login, cierra sesión e ingresa con cualquiera
de estas cuentas. La contraseña es `demo` para las tres.

| Perfil       | Cuenta                    | Código personal ficticio |
| ------------ | ------------------------- | ------------------------ |
| Master       | `master@example.test`     | `0000`                   |
| Especialista | `specialist@example.test` | `1111`                   |
| Consulta     | `read-only@example.test`  | `2222`                   |

## Qué puedes modificar

- Distribución, textos, colores, tablas, formularios, diálogos y navegación.
- Campos nuevos, filtros, preguntas de registro y reglas simuladas.
- Nuevas pantallas y acciones como propuestas funcionales.
- Datos sintéticos y respuestas HTTP dentro de `apps/scheduler/design`.

Por ejemplo: mover un dato del empleado a otra pantalla, proponer un formulario
de cumpleaños, configurar preguntas obligatorias o mostrar una nueva alerta.
Usa el mismo ID de empleado/cliente entre pantallas y añade los contratos
propuestos a tipos locales de `design/`, sin cambiar aún Prisma o los contratos
compartidos de producción.

## Funcionamiento de los mocks

Los datos se mantienen en memoria por pestaña. Recargar restablece el conjunto
inicial; cambiar de perfil conserva los cambios de esa sesión. Cambiar escenario
o fecha, o pulsar Restablecer, vuelve a crear el conjunto inicial.

Agenda permite consultar disponibilidad, crear, editar, mover, cancelar y cambiar
estados. Considera horarios, descansos, profesionales, recursos, bloqueos y citas
ocupadas mediante una aproximación para diseño; no replica el motor transaccional
del backend. Conserva idempotencia y conflictos de versión para probar la UX.

Clientes comparte datos con Agenda, permite buscar/crear/editar/fusionar y
rechaza teléfonos normalizados duplicados. Hay campos personalizados de ejemplo
y validación de obligatoriedad, número, sí/no, fecha y selección. Perfil e
históricos usan autorizaciones ficticias de un solo uso. Finanzas muestra un
histórico vacío de ejemplo; no calcula saldos reales.

Administración conserva los catálogos actuales con respuestas editables en
memoria. Configuraciones guarda por sección y capa `COMMERCE → BRANCH → USER`.
Los cambios de configuración son propuestas de datos; no activan automáticamente
consumidores nuevos. Encuestas, plantillas y consentimientos incluyen datos de
ejemplo; archivos y envíos son simulados, sin proveedor ni almacenamiento privado.

Reportes de citas y clientes leen el estado compartido de la demo. Los demás
datasets son fixtures de presentación y no deben usarse para validar cálculos
de negocio. Las descargas conservan los exportadores actuales, con datos
ficticios y autorizaciones simuladas.

Los controles ofrecen datos normales, agenda sin citas, carga lenta, error y
conflicto al guardar. La fecha define dónde se crean las citas iniciales;
navega a esa fecha con el calendario de Agenda. Para propuestas de alertas puedes
usar `designStore.state.controls.date` como referencia temporal.

Los guardados y descargas se agregan a **Movimientos de la demo** con el actor
seleccionado. Este registro local no sustituye la auditoría del servidor.

## Dónde trabajar

| Archivo/directorio                  | Uso                                                        |
| ----------------------------------- | ---------------------------------------------------------- |
| `apps/scheduler/src/components/`    | Componentes y flujos existentes                            |
| `apps/scheduler/src/app/`           | Rutas, estilos y composición                               |
| `apps/scheduler/design/store.ts`    | Estado compartido, datos iniciales, perfiles y fechas      |
| `apps/scheduler/design/api.ts`      | Lecturas, mutaciones y reglas simuladas                    |
| `apps/scheduler/design/browser.ts`  | Intercepción HTTP y bloqueo de APIs sin mock               |
| `apps/scheduler/design/runtime.tsx` | Arranque y controles de la demo                            |
| `apps/scheduler/design/fixtures/`   | Ejemplos de Administración, engagement, ajustes y reportes |

Una ruta HTTP nueva devuelve `501 DESIGN_ENDPOINT_MISSING` hasta que agregues
su respuesta simulada. Si falla el arranque de MSW, la app muestra el error y no
monta la sesión. Las solicitudes `/api/` sin mock se bloquean, sin fallback a
una API operativa. El código de diseño se selecciona por alias al compilar;
el build normal conserva el runtime con API real y sus pruebas de integridad.
`tsconfig.design.json` y el alias de Webpack seleccionan juntos el runtime de
diseño, incluyendo las referencias de componentes de servidor. `build:design`
comprueba que los chunks finales contienen el runtime ficticio.

## Cómo entregar un cambio

Trabaja por pantalla o comportamiento, con commits pequeños. Cada propuesta
debe explicar qué cambia, cómo reproducirlo, qué regla se desea y qué datos,
permisos o endpoints nuevos necesitará la implementación real. Adjunta una
captura o recorrido desde la demo.

El equipo revisa presentación y reglas, conserva el código reutilizable y conecta
los contratos aprobados a backend, permisos y BD. Crear un flujo con mocks no
significa que su persistencia, automatización o integración esté implementada.

## Validación

```bash
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler test
pnpm --filter @cosmetics/scheduler test:design
pnpm --filter @cosmetics/scheduler build:design
```

Para comprobar la separación del runtime normal:

```bash
pnpm --filter @cosmetics/scheduler build
```

Para servir un build de diseño ya compilado:

```bash
pnpm --filter @cosmetics/scheduler start:design
```

Comprobaciones realizadas el 29 de septiembre de 2026: TypeScript, lint, suite
existente y pruebas nuevas, lockfile congelado, build normal y build de diseño.
El cliente Axios real se probó contra MSW: login, disponibilidad, reservas,
cancelación, conflictos, duplicados y autorizaciones. Los chunks del build normal
no contienen el runtime de diseño. Lint conserva cuatro avisos de `<img>` que ya
existían en la rama base.

La revisión interactiva en navegador queda pendiente: este sandbox rechaza
iniciar servidores locales con `listen EPERM`, incluso en `127.0.0.1`. Antes de
entregarlo al PO, ejecuta `dev:design` en un host compatible y recorre Agenda,
Clientes, Administración, Configuraciones y Reportes, con el backend apagado.

No se ha creado ni configurado un proyecto de Vercel. Un Preview posterior debe
usar un proyecto dedicado, el comando `build:design`, el directorio `.next-design`
y ninguna variable o credencial operativa. `VERCEL_ENV=production` bloquea el
modo de diseño.
