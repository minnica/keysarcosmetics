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
diseño** permite cambiar entre usuarios, probar estados y restablecer los datos.
Para trabajar únicamente con esta demo utiliza los comandos `*:design`; el
comando general `pnpm dev` inicia otras aplicaciones del monorepo.

Si quieres probar la pantalla de login, cierra sesión e ingresa con cualquiera
de estas cuentas. La contraseña es `demo` para las tres; en modo diseño la
pantalla de acceso incluye botones que rellenan cada cuenta.

| Usuario ficticio                 | Cuenta                    | Alcance                                                                 | Código personal |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------- | --------------- |
| PO · Master demo                 | `master@example.test`     | Total: todas las sucursales, pantallas, escrituras y administración     | `0000`          |
| Alejandra Ruiz · Coordinación    | `operations@example.test` | Total: mismas capacidades master, con identidad y sesión independientes | `3333`          |
| Daniela Mora · Recepción Polanco | `limited@example.test`    | Limitado: una sucursal y profesional propio; sin Administración/Ajustes | `4444`          |

Los tokens y autorizaciones secundarias se ligan al usuario, no sólo al tipo de
perfil. Cambiar entre las dos cuentas con acceso total invalida autorizaciones
pendientes; el código de una no funciona para la otra. Todas las identidades,
contraseñas y claves de esta tabla son exclusivamente ficticias.

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

La demo incluye dos identidades con acceso total y una limitada para comparar
el comportamiento de los guards. La cuenta limitada puede trabajar en Agenda y
Clientes dentro de su alcance asignado, pero recibe `403` al intentar acceder a
Administración o Configuraciones. Cada movimiento conserva la identidad concreta
que inició la sesión, incluso cuando dos usuarios comparten capacidades master.

## Propuesta de navegación, captura y auditoría (29 de septiembre de 2026)

El prototipo usa ahora un menú superior persistente. Conserva las rutas de
Agenda, Clientes, Reportes, Administración y Configuraciones, y agrega
`/movimientos` para revisar la actividad por agente. El sidebar histórico ya no
se monta; en pantallas estrechas la navegación superior puede desplazarse de
forma horizontal sin reducir el área del calendario. Los desplegables usan un
fondo antracita y texto claro fijados por estilos propios del Scheduler para
mantener contraste aunque el tema compartido de `Popover` cambie.

Agenda ajusta todas las filas del horario al alto disponible de la ventana. No
requiere desplazamiento vertical interno en la vista diaria o semanal; si se
configuran intervalos muy cortos, las tarjetas reducen su altura y el detalle
completo permanece disponible al colocar el cursor sobre la cita. El tooltip
muestra cliente, horario, servicio, especialista, estado, contacto y notas.

La selección de sucursales de Agenda admite **Todas**, **Disponibles en la
fecha** o una combinación manual. Cada sucursal conserva su consulta, zona
horaria y perfil canónico; las columnas se identifican con el nombre de la
sucursal y sus IDs visuales se encapsulan por `branchId` para que una misma
especialista pueda aparecer en más de un local sin colisiones. La sucursal
operativa de una reserva o bloqueo se toma de la columna elegida. El botón de
ajuste alterna entre ancho cómodo y todas las columnas dentro de la ventana; el
botón de impresión cambia a día, ajusta columnas y abre la impresión horizontal
del navegador sin menú ni panel lateral.

Clientes incorpora en el entorno de diseño una búsqueda avanzada combinable.
Los criterios entre grupos se aplican con `AND`; dentro de estatus, servicios y
vendedores, las selecciones se aplican con `OR`. Permite buscar clientes sin
citas en 30/60/90/180/365 días, cualquier estatus de Agenda, uno o varios
servicios, mes de cumpleaños, vendedor de cartera/POS y valores de campos
personalizados activos. Los resultados muestran última cita y conteos de
asistencias, cancelaciones y no show. La consulta productiva existente no se
amplía en esta rama.

En **Configuraciones → Clientes y preguntas** un usuario master puede dar de
alta preguntas de texto, número, sí/no, fecha o selección, marcarlas como
obligatorias y activarlas o desactivarlas. Se reutiliza la definición canónica
de campo de cliente por `definitionId`: la misma pregunta aparece en la reserva
y en el alta de cliente. Cuando la reserva crea al cliente, la respuesta se
guarda también en su expediente ficticio. Las respuestas propias de la cita se
relacionan por `appointmentId`; no se crea otro catálogo de clientes, empleados
o vendedores.

En **Configuraciones → Códigos personales** master asigna códigos ficticios a
identidades que provienen de Scheduler o del catálogo externo POS/CRM. No se
crean vendedores paralelos. Los códigos tienen de 4 a 12 dígitos, son únicos y
un valor utilizado no se puede reasignar posteriormente durante la sesión. La
pantalla nunca muestra el valor guardado.

Alta/cambio/cancelación/estado de cita y alta/cambio/cancelación de bloqueos
solicitan un código antes de ejecutar. Cada captura genera una autorización de
dos minutos que se consume al registrar un solo movimiento. La bitácora guarda
actor, rol, origen, acción, propósito, tipo/ID de registro y metadatos seguros;
nunca guarda el código. Los clientes registrados sólo se editan después de
abrir el expediente con autorización; master dispone además de edición directa
en el entorno de diseño.

Contratos propuestos, exclusivos de `apps/scheduler/design`:

| Método         | Ruta                                                              | Uso propuesto                                                                 |
| -------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET/POST/PUT` | `/api/scheduler/design-proposals/authorization-agents[/:id]`      | Consultar identidades externas y asignar un código ficticio único.            |
| `POST`         | `/api/scheduler/design-proposals/operation-authorizations`        | Resolver el agente por código y emitir un token de un solo movimiento.        |
| `POST`         | `/api/scheduler/design-proposals/operation-authorizations/commit` | Consumir el token y agregar la bitácora redactada.                            |
| `GET`          | `/api/scheduler/design-proposals/movements`                       | Consultar la bitácora por agente.                                             |
| `POST`         | `/api/scheduler/design-proposals/customers/advanced-search`       | Combinar criterios de Agenda, cartera y campos personalizados con paginación. |
| `GET/PUT`      | `/api/scheduler/design-proposals/appointments/:id/answers`        | Leer o guardar respuestas relacionadas con una cita.                          |

Estos endpoints no existen en el runtime productivo. El alias
`@scheduler/design-proposals` selecciona el cliente MSW sólo con
`SCHEDULER_DESIGN_MODE=1`; el build normal usa un proveedor inactivo. Para la
implementación real se requieren contratos canónicos, hash de códigos,
revocación/rotación, permisos, auditoría append-only, persistencia transaccional
y resolución de vendedores desde el POS/CRM. La búsqueda avanzada real requiere
índices por cliente/fecha/estatus/servicio, filtros JSON tipados para campos
personalizados y un catálogo de vendedores leído desde el POS/CRM; no debe
resolver esos criterios cargando historiales completos en el navegador.

Opciones de dirección visual pendientes de elección del PO:

1. **Editorial Keysar** (recomendada): conserva marfil, antracita y dorado,
   reduce ornamentos, agrupa acciones y usa jerarquía tipográfica elegante.
2. **Agenda ejecutiva**: mayor densidad, encabezados compactos y prioridad a
   métricas/estatus para operación con muchas sucursales.
3. **Spa minimal**: más aire, fondos suaves y controles discretos; favorece una
   experiencia premium sobre la densidad operativa.

La implementación actual permanece en **Editorial Keysar** hasta que Producto
elija una dirección; los nuevos controles respetan esa línea sin introducir un
segundo sistema visual.

Recorrido manual recomendado:

1. En Configuraciones, crea una pregunta y confirma que aparece en una reserva
   y en el alta de cliente.
2. En Códigos personales, intenta repetir `0000`, `3333` o `4444` de las
   cuentas, o `1111`/`2222` de los agentes POS/CRM ficticios; debe rechazarse
   sin revelar a quién pertenece.
3. Crea o modifica una cita con un código válido y confirma que el calendario
   cabe en la ventana y que el hover muestra el detalle.
4. Selecciona Todas, Disponibles y una combinación manual de sucursales; comprueba
   el nombre de local en cada columna, alterna el ajuste y abre la impresión diaria.
5. En Clientes combina cancelación, servicio, cumpleaños, vendedor y un campo
   personalizado; después prueba el filtro de 30 días sin citas.
6. Abre Movimientos, filtra por agente y comprueba que aparece la acción sin el
   código personal.
7. Entra como `limited@example.test`: confirma que sólo aparece su alcance y
   que Administración/Configuraciones son rechazadas. Después entra con ambos
   usuarios de acceso total, usa sus códigos distintos y comprueba en
   Movimientos que cada acción conserva el actor correcto.

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
no contienen el runtime de diseño. Lint conserva tres avisos de `<img>` que ya
existían en la rama base.

En esta sesión `dev:design` inició correctamente y `/` respondió `HTTP 200` con
el backend apagado. La revisión visual automatizada queda pendiente: la CLI
`agent-browser` no está instalada y el navegador integrado no pudo iniciar
porque el sandbox de Windows falló al aplicar sus ACL. Antes de entregar al PO,
abre la demo en un host compatible y recorre Agenda, Clientes, Configuraciones y
Movimientos siguiendo los pasos anteriores.

No se ha creado ni configurado un proyecto de Vercel. Un Preview posterior debe
usar un proyecto dedicado, el comando `build:design`, el directorio `.next-design`
y ninguna variable o credencial operativa. `VERCEL_ENV=production` bloquea el
modo de diseño.
