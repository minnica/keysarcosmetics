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
La vista comprime los movimientos que comparten `actorId` y día local de
`America/Mexico_City` en una sola fila. Al desplegarla conserva hora, acción,
propósito, registro y metadatos de cada evento. La búsqueda y el filtro de agente
se aplican antes de agrupar.

**Descargar Excel** exporta únicamente los movimientos visibles después de esos
filtros. El archivo contiene `Resumen por agente`, con una fila por agente/día,
y `Detalle`, con un renglón por movimiento. Fechas, horas y cantidades se
escriben como valores tipados de Excel; ninguna hoja incluye el código personal.

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
ajuste permite forzar ancho cómodo o todas las columnas dentro de la ventana.
Sin intervención, Agenda mide el monitor, descuenta el panel lateral y ajusta
automáticamente las columnas cuando conservan un ancho legible; si no caben,
mantiene el desplazamiento horizontal dentro de la cuadrícula. El panel ofrece
los modos **Cabinas**, **Especialistas** y **Ambos**. Las cabinas se distinguen
por un encabezado compacto sin avatar redundante, capacidad y acento café; los
especialistas usan el mismo encabezado compacto sin avatar, su propia etiqueta y
acento azul. Ninguna columna se
reduce por debajo del mínimo operativo: seis o más columnas conservan nombres y
sucursal legibles, con desplazamiento horizontal cuando el monitor no alcanza.
El botón de impresión cambia a día, ajusta columnas y abre la
impresión horizontal del navegador sin menú ni panel lateral.

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
crean vendedores paralelos para sucursales vinculadas: sus representantes se
sincronizan desde POS/CRM. Cuando existe al menos una sucursal **Solo Agenda**,
la misma pantalla habilita el alta de un representante local de Scheduler con
nombre y código personal; queda identificado como origen `SCHEDULER` y puede
seleccionarse por cita sin cambiar al vendedor de cartera. Los códigos tienen de
4 a 12 dígitos, son únicos y
un valor utilizado no se puede reasignar posteriormente durante la sesión. La
pantalla nunca muestra el valor guardado.

Administración muestra un único submenú **Sucursales y cabinas**. La misma
pantalla concentra comercio, contratación, sucursales canónicas, resumen de
cabinas y edición individual de recursos. **Alta de sucursal** obliga a elegir
uno de dos modelos:

- **POS + Agenda**: sólo acepta una sucursal activa que ya exista en el catálogo
  POS. Cada sucursal POS se configura por separado y define su número de cabinas
  y personas por cabina.
- **Solo Agenda**: crea una sucursal independiente y solicita renta mensual de
  sucursal y renta mensual por cabina. La cuota de cabina debe ser positiva y
  menor a la renta base. El importe mostrado es una simulación comercial; no
  cobra ni sustituye el catálogo de facturación definitivo.

La misma operación crea o ajusta las cabinas. Aumentar agrega columnas canónicas;
reducir inactiva las sobrantes sin borrar su historial. Más abajo, en esa misma
pantalla, se conserva la edición individual de cabinas, equipos y estaciones.
La sucursal propietaria, las personas por cabina y la cantidad son explícitas
antes de guardar. Los datos ficticios
incluyen cabina individual, doble y triple en Polanco, y tres cabinas en Mítikah.
La reserva y el selector de columnas sólo ofrecen cabinas activas de la sucursal
elegida; un especialista continúa siendo una persona canónica y nunca sustituye
a una cabina.

Al crear una reserva en modo diseño, seleccionar una cabina abre una
fila por cada lugar disponible. La primera corresponde al cliente principal y
las demás permiten capturar visitantes. Cada persona exige nombre y un
especialista diferente; así, una cabina doble muestra dos clientes/visitantes y
dos especialistas, y una triple muestra tres. Por persona se registra compra
pendiente mientras se agenda. El formulario separa al **representante de esta
cita** del vendedor de cartera: puede variar entre citas y conserva origen
POS/CRM o alta local de Agenda. Al editar, la cabina y su capacidad son de sólo
lectura; el servidor rechaza cambiar el recurso después de la primera
configuración. Al cambiar la cita a **Llegó** o, cuando corresponda,
**Atendida**, el mismo
diálogo exige elegir **No compró**, **Compra liquidada** o **Apartado**. Una
compra exige monto de venta mayor a cero; un apartado exige además un anticipo
mayor a cero que no puede superar la venta. La especialista que atendió queda
relacionada por persona, no sólo por cita.

Cabina y especialistas no crean reservas paralelas. Al guardar la atención, el
mock sincroniza la cabina y todas las especialistas en la primera línea de la
misma cita canónica. Por eso el mismo `appointmentId`, horario, servicio y status
se proyectan simultáneamente en la columna de cabina y en cada columna de
especialista; cambiar entre **Cabinas**, **Especialistas** y **Ambos** no duplica
conteos ni ventas. Antes de guardar se vuelve a validar que ninguna especialista
ni la cabina tengan otra cita activa traslapada. En producción, esta asociación
debe persistirse de forma atómica y versionada junto con la atención.

El cambio a **Atendida** sólo se habilita cuando el instante actual es igual o
posterior a `endsAt`; la UI lo informa y el API de diseño vuelve a validar la
misma regla con `409`, por lo que no depende únicamente del navegador. Al elegir
**Llegó** se abre directamente la captura de representante, especialista, compra
y apartado; las preguntas y notas adicionales se ocultan y no se sobrescriben.
El color y el status no cambian hasta que cada visitante tenga especialista, el
representante esté seleccionado y exista una
decisión explícita de **No compró**, **Compra liquidada** o **Apartado**. Compra y
apartado exigen total válido, y apartado exige además anticipo. El botón queda
bloqueado mientras falte un dato y el endpoint de status rechaza `ARRIVED` o
`ATTENDED` con `409` si no existe una captura final completa, incluso si se invoca fuera de la
pantalla. Primero pide
una autorización `APPOINTMENT_STATUS_CHANGE` y, cuando existe compra o apartado,
una segunda autorización `PURCHASE_CAPTURE`. En la propuesta ambas mutaciones
son secuenciales; el contrato productivo deberá persistir estado, atención,
venta referenciada y auditoría en una única operación transaccional o mediante
una saga idempotente que no deje capturas parciales.

Registrar uno o más montos solicita una segunda autorización de uso único con el
propósito `PURCHASE_CAPTURE`, además del código usado para alta/cambio de cita.
El código debe pertenecer a una identidad Scheduler o a un empleado con rol de
especialista/facialista/cosmetólogo, y esa identidad debe tener habilitado
**Registrar compras** en Códigos personales. Un código válido sin ese permiso —o
de un vendedor— se rechaza. **Cambiar estados** se administra de forma separada.
La bitácora guarda conteo y total, nunca el código personal.

Después de registrar el resultado financiero de todos los visitantes, cualquier
corrección exige una autorización nueva `PURCHASE_CORRECTION`. El endpoint
rechaza incluso una corrección de **No compró** sin ese propósito. Códigos master
y códigos de especialistas/agentes a los que master habilite **Corregir compras
registradas** pueden autorizarla; el token se consume como un movimiento distinto
y queda auditado como `Corrección de compra por visitante`.

Al registrar un **Apartado**, la venta guarda como propietario comercial al
especialista/facialista asignado a ese visitante. El saldo permanece abierto y
el propietario no cambia si otra persona procesa después la liquidación o una
corrección autorizada. Al pasar de apartado a compra liquidada se registra
`settledAt`, pero reportes, ranking, filtros y exportaciones siguen atribuyendo el
total al especialista original; el detalle conserva por separado quién atendió,
quién es propietario de la venta y el estado `OPEN`/`PAID` de la liquidación.

En **Reportes → Compras de agenda o cabinas** el modo diseño muestra un dashboard
independiente de **Ventas y pagos**. Puede seleccionar día, semana, mes o rango
personalizado desde calendario, y combinar sucursal, cabina, status, resultado
de compra, servicio, especialista, vendedor, monto mínimo/máximo y búsqueda.
Todos esos criterios producen una sola población a nivel visitante; esa misma
población alimenta indicadores, consolidado por sucursal, comparación por cabina,
series por día/semana/mes, ranking de especialistas por sucursal, tabla,
impresión, PDF y Excel. Las citas se cuentan por `appointmentId`, mientras los
montos se suman por visitante una sola vez; el consolidado de sucursal es la suma
de sus cabinas y no una segunda contabilización. La analítica
de servicios calcula `asistidas / citas del servicio` y `canceladas / citas del
servicio`, mostrando los índices mayores y menores sin confundirlos con ventas.
El detalle conserva ID de cita, creación,
confirmación cuando existe historial, horario, sucursal, cabina/capacidad,
cliente y visitante, servicios, vendedor, especialista, resultado, venta,
representante de la cita, origen del representante y próxima cita (o la leyenda
**No cuenta con una próxima cita**), anticipo, saldo, especialista que atendió, propietario de la venta, estado/fecha
de liquidación, comentarios, estado, origen y última actualización. Excel crea
`Resumen`, `Por sucursal`, `Por cabina`, `Por día` y `Detalle` con fechas/importes tipados; PDF
incluye resumen, desglose, ranking, servicios y detalle. La impresión, PDF y Excel
usan únicamente el resultado ya filtrado. Las librerías pesadas se cargan sólo al
solicitar una descarga.

En **Reportes → Proyecciones** se selecciona el mes objetivo, una ventana de
3/6/12 meses y una combinación de sucursales. La demo compara promedio histórico,
último mes cerrado, venta real del mes objetivo y una proyección por sucursal.
La estimación aplica al promedio la tendencia entre los dos últimos meses,
limitada a ±30 %, y siempre muestra método y confianza; no se presenta como meta,
venta confirmada ni pronóstico del POS. También permite imprimir o descargar PDF
y Excel.

El monto de la demo es un dato operativo propuesto, no un cobro ni una venta:
POS conserva la autoridad financiera. La implementación real debe resolver el
ticket/venta canónica en POS y guardar sólo su referencia y snapshot autorizado.

Alta/cambio/cancelación/estado de cita y alta/cambio/cancelación de bloqueos
solicitan un código antes de ejecutar. Cada captura genera una autorización de
dos minutos que se consume al registrar un solo movimiento. La bitácora guarda
actor, rol, origen, acción, propósito, tipo/ID de registro y metadatos seguros;
nunca guarda el código. Los clientes registrados sólo se editan después de
abrir el expediente con autorización; master dispone además de edición directa
en el entorno de diseño.

La ficha de cualquier cita muestra **Corregir status**, incluso cuando el
registro ya está finalizado. Permite elegir otro status visible si hubo un error
de captura, pero siempre solicita un código con permiso
`APPOINTMENT_STATUS_CHANGE`. El endpoint de diseño rechaza el cambio directo sin
ese token. La corrección agrega una nueva transición `fromStatus → toStatus`,
incrementa la versión y conserva intacto el historial anterior; el commit de la
autorización registra actor y movimiento sin almacenar el código. Las reglas de
negocio siguen vigentes: llegada/asistencia requieren atención completa y
asistencia no puede registrarse antes de terminar la sesión.

En **Administración → Colores de status** la demo sustituye la paleta fija por
un catálogo versionado. Master puede agregar un status personalizado, editar
nombre/color o marcar cualquier definición como inactiva mediante autorización
`STATUS_COLORS_CHANGE`. La clave técnica y el ID permanecen estables; cada
cambio cierra la revisión anterior y crea una nueva con `effectiveFrom`,
`effectiveTo` y número de versión. No se eliminan ni reescriben citas,
transiciones o revisiones anteriores. La bitácora agrega `Alta de status`,
`Actualización de status` o `Inactivación de status` sin guardar el código.
Cada definición incluye el interruptor **Mostrar en la agenda**. Ocultarlo
retira las reservas de ese estado de las vistas diaria, semanal y lista, y evita
ofrecer esa transición; no elimina la definición ni sus citas, y reportes,
dashboard y revisiones históricas conservan los registros anteriores.

Los ocho estados canónicos sincronizan el color de su versión activa con la
Agenda. Los estados personalizados se muestran y versionan en la propuesta,
pero asignarlos a citas reales requiere ampliar de forma aditiva el enum,
transiciones, permisos, reportes e integración POS del contrato productivo; no
se fuerza un valor personalizado dentro del enum vigente.

### Especialista por cliente, seguimiento y comentarios de cita

La reserva conserva dos decisiones separadas. Cada cita puede elegir una
especialista distinta y la persona que efectivamente atendió siempre se captura
en la atención en cabina. De forma opcional, al crear una cita se puede marcar
**Fijar para futuras citas**: la preferencia queda relacionada al `customerId` y
al `professionalProfileId`, se propone automáticamente en la siguiente reserva
y puede retirarse sin reescribir citas anteriores. La preferencia nunca sustituye
la captura final de quién atendió.

El alta de reserva muestra **Especialista asignada** y no solicita resultado de
venta, montos ni "quién atendió". Esos campos aparecen únicamente al registrar
la llegada/asistencia. Las filas de atención mantienen alturas y columnas
uniformes para alinear cliente, especialista, resultado, venta y apartado.
Cuando una atención tiene compra liquidada o apartado con monto, todas sus
proyecciones en Agenda muestran un distintivo `$` junto al status; una captura
explícita de **No compró** no muestra el distintivo.

### Cartera POS y snapshot por cita

Crear un cliente exige **Representante de cartera**. Las opciones proceden de
agentes vigentes del POS/CRM o del alta local permitida para Agenda, además de
**Cartera de la empresa**. El campo legado "Especialista que atendió" ya no
forma parte del expediente ni del alta: la atención real pertenece a cada cita.

Al inactivar un representante `POS_CRM`, la demo traslada inmediatamente sus
carteras vigentes a **Cartera de la empresa** y lo retira de nuevas altas.
Reactivarlo vuelve a habilitarlo para asignaciones futuras, pero no restaura
clientes anteriores. Cada cita guarda un snapshot del representante de cartera
al momento de su creación; por eso el cambio se refleja en reservas nuevas y
en el expediente vigente, sin reescribir citas ni reportes históricos. En
producción esta operación debe seguir siendo transaccional y auditable en el
POS, tal como `CustomerPortfolioAssignment` y `PosPortfolioTransferEvent`.

Al cambiar una cita a `ARRIVED`, la demo abre la captura obligatoria y mantiene
el status anterior hasta guardar representante, especialistas y resultado de
compra. Al cambiar después a `ATTENDED`, mantiene además el bloqueo hasta que
termina la sesión y exige exactamente tantas filas de atención como lugares tenga la
cabina. Una cabina individual requiere una persona y una especialista; una doble,
dos; una triple, tres, y así sucesivamente. Cada fila obliga a registrar
especialista y resultado de compra. La cita sólo cambia a atendida después de
guardar la atención completa.

En **Configuraciones → Agenda → Seguimiento de la cita** existen interruptores
versionados para mostrar **Comentario** y **Postventa**. Ambos botones aparecen
únicamente en citas atendidas. El comentario del vendedor solicita un código
personal con permiso `APPOINTMENT_COMMENT_CREATE`; postventa solicita
`POST_SALE_COMMENT_CREATE`, comentario y categoría. Las categorías iniciales son
Servicio bueno, regular y malo, pero pueden agregarse, cambiarse o retirarse en
la configuración. Cada registro guarda ID, nombre y versión de categoría como
snapshot, por lo que una modificación posterior no altera reportes históricos.

Cancelar una cita continúa solicitando un motivo obligatorio y ahora exige
además una fecha tentativa o marcar **No cuenta con una próxima cita**; ambos
datos se agregan al historial append-only. Una cita **Atendida** no muestra
reagenda. Una cita **No asistió** sí permite abrir **Reagendar** y exige fecha
tentativa. La acción **Reagendar** solicita código personal,
motivo y fecha tentativa obligatoria; este registro documenta la intención y no
reserva automáticamente un horario. El movimiento efectivo de la cita conserva
su validación independiente de disponibilidad y autorización.

**Reportes → Seguimiento y comentarios** permite filtrar por periodo, sucursal,
tipo y texto; ofrece vista de todos los seguimientos o sólo comentarios. Excel,
PDF e impresión usan exactamente la población filtrada e incluyen cliente,
datos de la cita, sucursal, servicios, status, comentario, categoría, fecha
tentativa, actor, rol y fecha de captura. Los códigos personales nunca se
almacenan ni se exportan.

Contratos propuestos, exclusivos de `apps/scheduler/design`:

| Método         | Ruta                                                                  | Uso propuesto                                                                 |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET/POST/PUT` | `/api/scheduler/design-proposals/authorization-agents[/:id]`          | Consultar identidades externas y asignar un código ficticio único.            |
| `POST`         | `/api/scheduler/design-proposals/operation-authorizations`            | Resolver el agente por código y emitir un token de un solo movimiento.        |
| `POST`         | `/api/scheduler/design-proposals/operation-authorizations/commit`     | Consumir el token y agregar la bitácora redactada.                            |
| `GET`          | `/api/scheduler/design-proposals/movements`                           | Consultar la bitácora por agente.                                             |
| `POST`         | `/api/scheduler/design-proposals/customers/advanced-search`           | Combinar criterios de Agenda, cartera y campos personalizados con paginación. |
| `GET/PUT`      | `/api/scheduler/design-proposals/appointments/:id/answers`            | Leer o guardar respuestas relacionadas con una cita.                          |
| `GET/PUT`      | `/api/scheduler/design-proposals/appointments/:id/cabin-visit`        | Guardar cabina bloqueada, representante, visitantes, especialistas y compra.  |
| `POST`         | `/api/scheduler/design-proposals/appointments/contexts`               | Resolver por lote representante, snapshot de cartera, compra y próxima cita.  |
| `GET/POST`     | `/api/scheduler/design-proposals/appointments/:id/journal`            | Consultar o agregar comentarios, postventa y motivos append-only.             |
| `GET/PUT`      | `/api/scheduler/design-proposals/customers/:id/specialist-preference` | Proponer o retirar la especialista fija de futuras citas.                     |
| `POST`         | `/api/scheduler/design-proposals/reports/cabin-sales`                 | Construir indicadores, desgloses y detalle filtrado de ventas por cabina.     |
| `POST`         | `/api/scheduler/design-proposals/reports/appointment-journal`         | Exportar seguimiento y comentarios desde una población filtrada única.        |
| `POST`         | `/api/scheduler/design-proposals/reports/sales-projections`           | Comparar meses históricos y calcular la proyección demo por sucursal.         |
| `GET/POST/PUT` | `/api/scheduler/design-proposals/status-definitions[/:id]`            | Consultar, crear y versionar status; la baja es sólo inactivación lógica.     |
| `GET/POST`     | `/api/scheduler/design-proposals/branch-commercial-models`            | Vincular sucursal POS o independiente, renta propuesta y cabinas contratadas. |

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
   cuentas, o `1111`/`2222`/`5555` de los especialistas POS/CRM ficticios; debe rechazarse
   sin revelar a quién pertenece.
3. Crea o modifica una cita con un código válido y confirma que el calendario
   cabe en la ventana y que el hover muestra el detalle.
4. Selecciona Todas, Disponibles y una combinación manual de sucursales; comprueba
   el nombre de local en cada columna, alterna el ajuste y abre la impresión diaria.
5. En Clientes combina cancelación, servicio, cumpleaños, vendedor y un campo
   personalizado; después prueba el filtro de 30 días sin citas.
6. Genera dos movimientos el mismo día con el mismo código. Abre Movimientos,
   filtra por agente y confirma que aparece una fila con contador; despliega la
   fila para revisar ambas acciones sin el código personal. Descarga Excel y
   confirma las hojas `Resumen por agente` y `Detalle` con sólo los registros
   visibles.
7. Entra como `limited@example.test`: confirma que sólo aparece su alcance y
   que Administración/Configuraciones son rechazadas. Después entra con ambos
   usuarios de acceso total, usa sus códigos distintos y comprueba en
   Movimientos que cada acción conserva el actor correcto.
8. En Administración selecciona una sucursal, crea dos cabinas con capacidad 2
   y confirma la vista previa, numeración y resumen de esa tienda. En Agenda
   alterna **Cabinas**, **Especialistas** y **Ambos**, y cambia el ancho de la
   ventana para comprobar el ajuste automático. Después crea una reserva en
   cabina doble, elige un representante distinto al vendedor de cartera y, al
   cambiarla a **Llegó**,
   registra dos personas, dos especialistas, una compra liquidada y un apartado.
   Debe pedir autorización de estado y después un código con permiso **Registrar
   compras**; desactiva ese permiso y confirma que el mismo código deja de
   autorizar el monto.
9. Abre Reportes → Compras de agenda o cabinas, combina periodo, sucursal,
   cabina, status, servicio, especialista, vendedor y monto. Confirma que
   tarjetas, series, ranking, analítica y tabla cambian juntas; imprime y descarga
   PDF/Excel, verificando que sólo incluyan el detalle filtrado, representante y
   próxima cita. El indicador **Sin próxima cita** debe usar esa misma población.
10. En Administración → Colores de status agrega uno, edita nombre/color y
    después inactívalo. Despliega su historial: deben existir tres versiones,
    conservar la misma clave y aparecer tres movimientos sin mostrar el código.
    Apaga **Mostrar en la agenda** y confirma que desaparece de Agenda pero no de
    reportes ni del historial de versiones.
11. Intenta marcar una cita como Atendida antes de `endsAt`: debe rechazarse.
    Marca otra como Llegó: el color no debe cambiar hasta capturar representante,
    compra/apartado y especialistas sin ver preguntas
    adicionales; vuelve a editar el monto y confirma que solicita
    **Corregir compras registradas** o el código master. Después usa **Corregir
    status** sobre una cita finalizada, ingresa un código autorizado y confirma
    que el historial conserve el status anterior y agregue la nueva transición.
12. Abre Reportes → Proyecciones, cambia de 3 a 6 meses y combina sucursales.
    Confirma que histórico, comparativa, distribución y exportaciones usan el
    mismo alcance y que la proyección se distingue de la venta real.
13. Configura un color distinto para cada status y vuelve a Agenda. Cada reserva
    debe conservar una franja lateral sólida, un fondo suave y la etiqueta del
    status con ese color en las vistas diaria, semanal y de lista. Al pasar el
    cursor, el detalle emergente debe repetir la misma etiqueta coloreada; en
    pantallas de poca altura la franja debe seguir visible aunque se compacte el
    contenido de la tarjeta.
14. En Administración → Sucursales y cabinas abre **Alta de sucursal**. Comprueba que POS +
    Agenda sólo permita sucursales activas del POS y que cada una conserve sus
    propias cabinas. Después crea una sucursal Solo Agenda: la renta por cabina
    debe ser menor a la renta de sucursal. Confirma que sus cabinas aparecen en
    la tabla inferior de recursos y Agenda; reduce la cantidad y verifica que las sobrantes queden
    inactivas, no eliminadas.
15. En Configuraciones → Agenda activa comentarios y postventa, edita las
    categorías y crea una cita marcando **Fijar para futuras citas**. Comprueba
    que la siguiente reserva propone la misma especialista, pero permite elegir
    otra para esa cita. Después de registrar asistencia abre **Comentario** y
    **Postventa**, captura ambos con código personal y revisa su historial. En
    otra cita **No asistió** usa **Reagendar** con motivo y fecha tentativa, y
    cancela otra con motivo obligatorio más fecha tentativa o **No cuenta con una
    próxima cita**. Confirma que una cita atendida no muestre Reagendar. Finalmente abre Reportes → Seguimiento y comentarios,
    filtra sólo comentarios y descarga Excel/PDF; los nombres históricos de las
    categorías deben conservarse aunque su configuración haya cambiado.
16. Crea un cliente y confirma que **Representante de cartera** sea obligatorio
    y que no aparezca "Especialista que atendió". Crea una reserva y verifica
    que sólo solicite especialista asignada; registra después una compra o
    apartado desde asistencia y confirma el `$` junto al status. Inactiva al
    representante POS: sus clientes deben pasar a **Cartera de la empresa**,
    una cita nueva debe usar esa cartera y las citas anteriores conservar el
    nombre histórico. Revisa también que las tarjetas oscuras de Reportes
    mantengan iconos y texto blancos en escritorio y móvil.

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

Comprobaciones realizadas el 30 de septiembre de 2026: TypeScript, lint, suite
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
