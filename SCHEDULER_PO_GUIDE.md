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
muestra cliente, horario, servicio, especialista, estado, contacto y notas. Si
la cita registra compra o apartado, el status muestra junto al signo de pesos el
monto total de la venta; para apartados no sustituye ese total por el anticipo.

Las citas **Pendiente**, **Reservada**, **Confirmada** o **En espera** se pueden
mover con el mouse sólo cuando la sesión tiene `agenda:WRITE`, el mismo permiso
usado para editar una cita, y todavía no tienen compra o apartado. En vista
diaria se arrastran a otra hora, cabina o especialista de la misma sucursal; en
vista semanal también se pueden soltar en otro día sin cambiar su asignación. La
celda destino se resalta antes de soltar y las sesiones de sólo lectura no
muestran tarjetas arrastrables ni aceptan destinos.

Soltar sobre una cabina sustituye únicamente el recurso de tipo `ROOM`, conserva
equipos auxiliares y adopta la capacidad configurada de la cabina destino.
Soltar sobre una especialista la convierte en responsable principal planeada y
conserva especialistas de apoyo distintos. Esa asignación se usa para validar
disponibilidad, pero no proyecta todavía la cita en la vista **Especialistas**;
la columna operativa se completa sólo con quienes queden registrados al marcar
**Llegó** o **Atendida**. Todos los servicios se desplazan por el mismo intervalo
y conservan membresía. El formulario **Editar** sigue siendo la alternativa
accesible y el flujo requerido para cambiar de sucursal.

Soltar una cita solicita un código con permiso `APPOINTMENT_MOVE`. El servidor
vuelve a validar versión, horario de sucursal, descansos, bloqueos, cabina,
especialistas y solapamientos; si existe conflicto, la cita permanece en su
horario original. **Llegó**, **Atendida** y cualquier cita con compra o apartado
son inmutables mediante arrastre; canceladas y no asistidas continúan como
estados históricos finales. El movimiento exitoso agrega la acción **Cambio de
horario por arrastre** o **Cambio de horario y asignación por arrastre** a la
bitácora, con columna anterior/nueva pero sin guardar el código personal. Agenda invalida
también los reportes; la proyección de visita conserva sincronizados cabina,
capacidad y especialista para que dashboard, desglose por cabina y reporte de
especialistas reflejen el destino. No se propone un endpoint nuevo: se reutiliza
`POST /api/scheduler/appointments/:id/move` y el contrato de autorización
existente. La integración productiva debe guardar cita, asignaciones, proyección
de reporte y auditoría en una operación consistente.

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

En **Configuraciones → Empresa** el logotipo se selecciona desde un archivo
PDF, JPG/JPEG, PNG, WEBP o GIF de hasta 5 MB. La vista previa usa contención
proporcional para aprovechar el espacio sin estirar ni recortar el diseño; el
encabezado superior refleja el nombre y el activo efectivo del comercio y
conserva el logo estándar como fallback. En esta demo el archivo se almacena
como `data:` dentro del documento ficticio y nunca se transmite a un proveedor.
Producción deberá sustituirlo por un `assetId` de almacenamiento privado,
validar el contenido por firma real, generar una variante web optimizada y
convertir la primera página de un PDF a imagen antes de publicarla.

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

La misma pantalla incluye **Autorizaciones por puesto**. Cada status canónico
de Agenda —incluidos Llegó, Atendido, No asistió y Cancelado— tiene su propia
lista de puestos autorizados. **Registrar compra o apartado** y **Corregir una
compra registrada** se configuran por separado, por lo que Recepción puede
autorizar una llegada sin poder capturar montos y una Especialista puede
capturar una venta sin autorizar otros status. El puesto concede la capacidad y
el código personal identifica a quien ejecutó el movimiento. Una regla sin
puestos queda reservada al código master; master conserva acceso total. La
política se vuelve a validar al consumir el token: retirar un puesto invalida
autorizaciones pendientes sin modificar citas ni movimientos históricos.

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

En **Horario, descansos y días especiales**, cada día ofrece **Copiar a todos**
para replicar apertura, cierre y descanso en la semana sin cambiar la identidad
de cada día. Antes de guardar se elige el alcance: este calendario, todos los
calendarios de la sucursal o todos los calendarios del módulo actual (sucursales,
especialistas o recursos). La pantalla indica cuántos pares perfil/sucursal se
actualizarán. El guardado reutiliza las reglas canónicas por `ownerType`,
`ownerId` y `branchProfileId`, invalida el catálogo operativo y Agenda recalcula
su primera y última franja visible; por ejemplo, extender de 12:00 a 20:00
agrega inmediatamente las horas restantes. La implementación productiva deberá
ofrecer una mutación masiva transaccional e idempotente para evitar aplicaciones
parciales si uno de varios calendarios falla.

Las reservas nuevas se abren únicamente desde una columna de tipo `ROOM`. En
una columna de especialista el menú conserva **Bloquear horario**, pero no
muestra **Reserva**; el botón global elige la primera cabina activa de la
sucursal y falla de forma explícita si ninguna está configurada. El selector de
columna del alta también queda limitado a cabinas, por lo que una especialista
nunca sustituye el recurso físico de la cita.

Al crear una reserva en modo diseño, seleccionar una cabina abre una
fila por cada lugar disponible. La primera corresponde al cliente principal y
las demás permiten capturar visitantes. Cada persona exige nombre y un
especialista planeada diferente; así, una cabina doble muestra dos
clientes/visitantes y dos asignaciones, y una triple muestra tres. Estas
asignaciones reservan disponibilidad, pero aún no significan “quién atendió” ni
alimentan las columnas de especialistas. Por persona se registra compra
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

Cabina y especialistas no crean reservas paralelas. Antes de registrar llegada,
el mismo `appointmentId` se muestra sólo en su cabina aunque exista una
especialista planeada. Al guardar la atención, el mock expone en el contexto de
la cita `attendingSpecialistProfileIds` y proyecta la misma cita en cada
especialista realmente registrada; cambiar entre **Cabinas**, **Especialistas**
y **Ambos** no duplica conteos ni ventas. Antes de guardar se vuelve a validar
que ninguna especialista ni la cabina tengan otra cita activa traslapada. En
producción, el contexto canónico deberá distinguir asignación planeada de
atención efectiva y persistir esta asociación de forma atómica y versionada
junto con la atención.

Dos citas canónicas distintas que coinciden en la misma cabina y horario se
presentan en carriles horizontales separados, tanto en día como en semana. Cada
tarjeta conserva su propio `appointmentId`, cliente, status, venta,
representante/vendedor y especialista, y abre su propio registro de atención.
Al terminar una cita, la siguiente franja vuelve a ocupar el ancho completo.
Esta regla no divide una reserva grupal: una cita de cabina doble con dos
visitantes sigue siendo una sola reserva canónica y mantiene sus personas en el
registro por visitante documentado arriba.

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
El código debe pertenecer a una identidad activa cuyo puesto esté marcado en
**Registrar compra o apartado**. Un código válido de un puesto no seleccionado
se rechaza; master conserva el override. Los status se administran por separado,
uno por uno. La bitácora guarda actor, puesto y movimiento, nunca el código.

Después de registrar el resultado financiero de todos los visitantes, cualquier
corrección exige una autorización nueva `PURCHASE_CORRECTION`. El endpoint
rechaza incluso una corrección de **No compró** sin ese propósito. Códigos master
y códigos de personas cuyo puesto esté habilitado en **Corregir compra o
apartado registrado** pueden autorizarla; el token se consume como un movimiento distinto
y queda auditado como `Corrección de compra por visitante`.

Al registrar un **Apartado**, la venta guarda como propietario comercial al
especialista/facialista asignado a ese visitante. El saldo permanece abierto y
el propietario no cambia si otra persona procesa después la liquidación o una
corrección autorizada. Al pasar de apartado a compra liquidada se registra
`settledAt`, pero reportes, ranking, filtros y exportaciones siguen atribuyendo el
total al especialista original; el detalle conserva por separado quién atendió,
quién es propietario de la venta y el estado `OPEN`/`PAID` de la liquidación.

En **Reportes → Compras de agenda o cabinas** el modo diseño muestra un dashboard
independiente de **Ventas y pagos**. Al entrar selecciona automáticamente el día
en curso; después puede elegir día, semana, mes o rango personalizado desde
calendario, y combinar sucursal, cabina, status, resultado
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
incluye resumen, desglose, ranking, servicios y detalle. La tabla permite mostrar
20, 40, 60 o todas las filas filtradas y paginar sin cambiar la población del
reporte. La impresión, PDF y Excel usan únicamente el periodo y los filtros
aplicados —nunca sólo la página visible—; si hay cambios pendientes, esas acciones
permanecen bloqueadas hasta pulsar **Aplicar**. Los tres accesos también aparecen
en el encabezado del detalle para permanecer visibles junto a la población que
exportan. Las librerías pesadas se cargan sólo al solicitar una descarga.

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

Al abrir una cita, la sección **Estados configurados** muestra todos los estados
activos con **Mostrar en la agenda**, cada uno como un chip con su nombre y color
vigentes; el estado actual queda identificado explícitamente. Ya no se presentan
círculos anónimos. En una sesión de escritura, elegir cualquier chip solicita el
código personal autorizado para ese status; las correcciones de una cita
finalizada conservan la transición anterior en el historial. En sólo lectura se
mantiene visible la paleta completa, pero ningún chip ejecuta cambios. Tarjetas,
tooltip y vista de lista usan la misma etiqueta configurada y el mismo color.

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
Al autorizar y guardar correctamente un seguimiento postventa, la ficha y el
formulario se cierran y la operadora regresa a la agenda. Un error de
autorización o persistencia conserva abierto el formulario para corregirlo o
reintentarlo sin perder el comentario capturado.

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

| Método         | Ruta                                                                                     | Uso propuesto                                                                 |
| -------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET/POST/PUT` | `/api/scheduler/design-proposals/authorization-agents[/:id]`                             | Consultar identidades externas y asignar un código ficticio único.            |
| `GET/PUT`      | `/api/scheduler/design-proposals/authorization-policy`                                   | Versionar puestos permitidos por status o captura de compra.                  |
| `POST`         | `/api/scheduler/design-proposals/operation-authorizations`                               | Resolver el agente por código y emitir un token de un solo movimiento.        |
| `POST`         | `/api/scheduler/design-proposals/operation-authorizations/commit`                        | Consumir el token y agregar la bitácora redactada.                            |
| `GET`          | `/api/scheduler/design-proposals/movements`                                              | Consultar la bitácora por agente.                                             |
| `POST`         | `/api/scheduler/design-proposals/customers/advanced-search`                              | Combinar criterios de Agenda, cartera y campos personalizados con paginación. |
| `GET/PUT`      | `/api/scheduler/design-proposals/appointments/:id/answers`                               | Leer o guardar respuestas relacionadas con una cita.                          |
| `GET/PUT`      | `/api/scheduler/design-proposals/appointments/:id/cabin-visit`                           | Guardar cabina bloqueada, representante, visitantes, especialistas y compra.  |
| `POST`         | `/api/scheduler/design-proposals/appointments/contexts`                                  | Resolver por lote representante, snapshot de cartera, compra y próxima cita.  |
| `GET/POST`     | `/api/scheduler/design-proposals/appointments/:id/journal`                               | Consultar o agregar comentarios, postventa y motivos append-only.             |
| `GET/PUT`      | `/api/scheduler/design-proposals/customers/:id/specialist-preference`                    | Proponer o retirar la especialista fija de futuras citas.                     |
| `GET/POST`     | `/api/scheduler/design-proposals/customers/:id/layaways[/:sourceAppointmentId/payments]` | Consultar apartados abiertos y registrar abonos o liquidaciones autorizadas.  |
| `POST`         | `/api/scheduler/design-proposals/reports/cabin-sales`                                    | Construir indicadores, desgloses y detalle filtrado de ventas por cabina.     |
| `POST`         | `/api/scheduler/design-proposals/reports/appointment-journal`                            | Exportar seguimiento y comentarios desde una población filtrada única.        |
| `POST`         | `/api/scheduler/design-proposals/reports/sales-projections`                              | Comparar meses históricos y calcular la proyección demo por sucursal.         |
| `GET/POST/PUT` | `/api/scheduler/design-proposals/status-definitions[/:id]`                               | Consultar, crear y versionar status; la baja es sólo inactivación lógica.     |
| `GET/POST`     | `/api/scheduler/design-proposals/branch-commercial-models`                               | Vincular sucursal POS o independiente, renta propuesta y cabinas contratadas. |

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
   cabe en la ventana y que el hover muestra el detalle. Arrastra una cita
   confirmada a otra hora y después a otra cabina de la misma sucursal; autoriza
   ambos cambios y comprueba que conserva duración, servicios y equipos, adopta
   la capacidad nueva y aparece en esa cabina en Agenda y Reportes. Repite hacia
   otra especialista y confirma el nuevo movimiento en la bitácora. En vista
   semanal muévela a otro día; después intenta soltarla sobre un horario ocupado
   y confirma que permanece en el horario anterior. `limited@example.test` sólo
   debe poder arrastrar si conserva `agenda:WRITE`; una sesión de consulta y una
   cita atendida no deben mostrar cursor de arrastre. Confirma que **En espera**
   todavía se pueda mover; registra después una compra o apartado y verifica que
   la misma cita deje de ser arrastrable aunque conserve un status activo.
   **Editar** debe seguir siendo la alternativa por teclado para las citas que
   aún son movibles; las correcciones posteriores conservan sus flujos de
   autorización específicos y no se resuelven por arrastre.
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
   Debe pedir autorización de estado y después un código cuyo puesto pueda
   **Registrar compra o apartado**. Permite a Recepción autorizar sólo **Llegó**
   y a Especialistas registrar compras; confirma que el código de Recepción
   autoriza la llegada pero recibe rechazo para el monto.
9. Abre Reportes → Compras de agenda o cabinas, combina periodo, sucursal,
   cabina, status, servicio, especialista, vendedor y monto. Confirma que
   tarjetas, series, ranking, analítica y tabla cambian juntas; imprime y descarga
   PDF/Excel, verificando que sólo incluyan el periodo y detalle filtrados,
   representante y próxima cita. Cambia la vista entre 20, 40, 60 y todas las
   filas: la página visible debe cambiar, pero las exportaciones deben conservar
   toda la población filtrada. Al abrir el reporte de nuevo, el periodo inicial
   debe ser el día en curso. El indicador **Sin próxima cita** debe usar esa misma
   población.
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
17. En Administración → Sucursales y cabinas cambia el lunes de 08:00–12:00 a
    08:00–20:00, pulsa **Copiar a todos** y guarda primero en este calendario.
    Abre Agenda y confirma que aparecen franjas hasta las 19:30. Repite el cambio
    con **Todos los calendarios de esta sucursal** y después con **Todos los
    calendarios del módulo**; antes de guardar debe mostrarse el total exacto de
    calendarios afectados.
18. Abre Agenda en la vista **Cabinas** y localiza la reserva de las 12:00 en
    la cabina doble de Mítikah. La hora sólo debe aparecer en el eje lateral;
    dentro de la tarjeta deben verse los dos visitantes en mitades horizontales
    del mismo ancho, separados por una línea vertical, y el estado compartido.
    Una cabina triple divide el ancho en tres partes. Esta representación
    conserva una sola reserva canónica con sus personas, especialistas y
    capacidad, por lo que ventas, ocupación y reportes no se duplican
    artificialmente.
19. Abre **Nueva reserva**, escribe un cliente que no exista y pulsa **Nuevo
    cliente**. La primera pantalla debe mostrar únicamente nombre, apellido,
    teléfono, correo, representante de cartera y los campos configurables del
    expediente. **Guardar cliente** crea o vincula el perfil después de revisar
    coincidencias por teléfono y nombre; sólo entonces regresa al paso de la
    reserva con el cliente seleccionado y muestra fecha, servicio, cabina y
    demás datos. **Guardar reserva** nunca debe crear implícitamente un cliente
    que todavía no tenga ID.
20. Abre Agenda en un escritorio de al menos 1280 px. El encabezado debe ocupar
    una sola fila compacta, sin desbordamiento horizontal, y dejar más altura a
    la cuadrícula y al panel de recursos. En el panel izquierdo los modos
    **Calendario** y **Lista** deben mostrar sólo sus iconos; conserva sus nombres
    accesibles, estados `aria-pressed` y ayudas al pasar el cursor. Comprueba que
    Día/Semana, fecha, actualización, filtros, impresión y Nueva reserva sigan
    disponibles.

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

El 4 de octubre de 2026 se repitieron TypeScript, lint, las 82 pruebas y
`build:design` después de incorporar autorizaciones por puesto, copia masiva de
horarios, paginación del detalle de ventas y movimiento de citas por arrastre.
La cobertura separa el permiso para **Llegó** del permiso para registrar una
compra, verifica el rechazo cruzado, conserva el override master, comprueba que
una ampliación de horario extienda las franjas visibles de Agenda, valida las
vistas de 20/40/60/todas las filas y confirma que una cita multiservicio mueve
todas sus líneas por el mismo intervalo. También comprueba que la reasignación
de cabina conserva equipos, cambia capacidad, actualiza el reporte de cabinas y
genera un movimiento autorizado sin almacenar el código personal. La regla de
inmutabilidad comprueba además que **En espera** sigue siendo editable, mientras
**Llegó**, **Atendida**, compra y apartado bloquean otro arrastre tanto en UI
como en el API simulado.

El 4 de octubre de 2026 se añadieron pruebas para resolver etiquetas de status
configuradas con fallback canónico. La suite completa quedó en 84 pruebas y la
suite aislada de diseño en 27; también se validaron TypeScript, lint y
`build:design`. La revisión React confirmó claves estables, estado derivado sin
efectos adicionales, controles accesibles con nombre y foco, y ausencia de
nuevas dependencias o componentes duplicados.

El 4 de octubre de 2026 se simplificó la tarjeta de Agenda: dejó de repetir la
hora que ya muestra el eje y ahora centra visitantes y status. El contexto de
la cita expone los nombres de sus asistentes para que una cabina doble muestre
sus dos personas dentro de la misma reserva; el contrato conserva el fallback
al cliente principal cuando no existe un registro de atención en cabina.

El 5 de octubre de 2026 los ocupantes de una reserva se distribuyeron
horizontalmente dentro de la tarjeta. Una cabina doble divide el ancho en dos y
una triple en tres, con separadores verticales, nombres compactos de una línea y
el nombre completo al pasar el cursor, además de un solo status compartido. El
cambio es únicamente visual y no crea citas,
ocupaciones ni ventas adicionales.

El 10 de octubre de 2026 el detalle emergente también quedó segmentado por la
posición horizontal del puntero. En una cabina doble, la mitad izquierda muestra
exclusivamente el registro de la primera persona y la derecha el de la segunda;
una cabina triple aplica la misma regla por tercios. Cada detalle identifica a la
persona seleccionada, especialista, contacto, status, compra liquidada o
apartado, representante, vendedor de cartera y próxima cita sin sumar los datos
de las demás visitantes. `DesignAppointmentContext.attendees` propone el
snapshot individual por `visitorId` y `customerId`; producción deberá agregar el
mismo arreglo al endpoint de contextos de citas conservando `attendeeNames` como
fallback compatible. La selección del segmento ocurre sólo en presentación y
no modifica la cita, la atención ni el historial financiero.

El 6 de octubre de 2026 el historial protegido de visitas agregó el resultado
de compra correspondiente a la clienta en cada cita: compra liquidada con total,
apartado con total, abono y saldo, o **No compró**. El mock conserva este dato
como snapshot por visitante dentro de la misma cita; producción deberá ampliar
`GET /api/scheduler/clients/:id/visits` con ese snapshot opcional sin consultar
ni recalcular ventas históricas desde el navegador. En cabinas dobles, triples o
de mayor capacidad, el historial incluye la cita cuando la clienta aparece como
visitante y muestra exclusivamente su propia compra mediante `customerId`; no
suma ni replica las ventas de las demás personas de la cabina.

El 6 de octubre de 2026 se agregó el seguimiento de apartados en visitas
posteriores. Cuando una clienta con saldo abierto llega, queda en espera o es
atendida, su tarjeta muestra **Abonar o liquidar**. Un abono debe ser menor al
saldo y una liquidación cubre exactamente el restante; ambas acciones requieren
un código con alcance `PURCHASE_CAPTURE`, consumen una autorización de un solo
uso y generan un movimiento identificable. El saldo continúa ligado a la venta
y a la clienta originales, no crea una venta nueva en la visita actual ni suma
importes de otras visitantes de una cabina múltiple. Cada pago conserva la cita
de origen, la visita donde se recibió, monto, actor y fecha. El historial de la
clienta muestra el total acumulado, saldo, abonos y liquidación; al quedar en
cero, el apartado pasa a `PAID` y deja de ofrecer el botón en visitas futuras.
El encabezado del historial muestra además **Total comprado** y el número de
compras registradas. Suma una sola vez el total de venta de cada compra o
apartado de esa clienta; los abonos posteriores reducen el saldo, pero no
duplican el valor de la venta.
Producción deberá persistir pagos y actualización de saldo en una sola
transacción append-only, además de proyectarlos en reportes y auditoría.
La validación de esta entrega quedó en 86 pruebas totales y 28 pruebas aisladas
de diseño, además de TypeScript, lint y `build:design`. La revisión visual no
pudo automatizarse porque el sandbox de Windows falló antes de abrir el
navegador; el servidor local en `http://localhost:3008/` sí respondió `HTTP 200`.

El 4 de octubre de 2026 el alta de cliente desde Agenda se separó de la reserva
en dos pasos. El primer paso reutiliza el mismo borrador para guardar identidad,
contacto, cartera y respuestas configurables mediante `createCustomer`; la
reserva sólo continúa cuando existe `customerId`. La revisión de duplicados se
mantiene antes del alta y seleccionar un perfil existente también vuelve al
segundo paso sin crear una cita. No se agregó un contrato productivo nuevo.

El 10 de octubre de 2026 el botón café **Nuevo cliente** se alineó con el campo
de búsqueda de Cliente y comparte su altura visual. El texto de confirmación de
un cliente vinculado permanece debajo del campo sin desplazar la acción.

El 10 de octubre de 2026 la barra de búsqueda de **Base de clientes** alineó
desde el borde superior las etiquetas y controles de texto, sucursal y
procedencia. El texto de ayuda permanece debajo de la búsqueda sin desplazar
los selectores; el botón **Buscar** conserva la misma altura y línea base que
los controles.

La acción **Importar clientes** abre un flujo en dos pasos. Primero descarga una
plantilla Excel vinculada a la sucursal elegida, con hojas de instrucciones,
clientes y catálogos; los encabezados respetan el orden vigente de identidad,
contacto, procedencia y campos configurables. Después acepta `.xlsx`, `.xls` o
`.csv`, muestra una vista previa y valida campos obligatorios, correo, teléfono,
fechas, selecciones y teléfonos repetidos dentro del archivo. Sólo habilita la
importación cuando no existen errores; las coincidencias de nombre se presentan
como advertencias. La demo reutiliza `POST /api/scheduler/clients` por registro y
reporta filas rechazadas sin ocultar las ya creadas. Producción requiere un
endpoint de prevalidación y confirmación por lote, idempotente y transaccional,
que devuelva errores por fila y aplique el alcance de sucursal del operador.

**Exportar clientes** descarga Excel desde el dataset canónico `CUSTOMERS` y
respeta la sucursal seleccionada y la búsqueda de texto aplicada. El archivo
incluye identidad, contacto, procedencia, cartera vigente, campos configurables
y métricas de agenda; no se exporta un recorte de la página visible. Un rol con
`scheduler/clients:EXPORT` descarga directamente. Sin ese permiso, la acción
solicita una autorización de propósito `SENSITIVE_EXPORT`, ligada a la pantalla,
sucursal y dataset, y el código se descarta después del intento. Producción debe
registrar una auditoría de exportación con actor, alcance, filtros y número de
filas, sin persistir el código personal.

En **Combinar duplicados**, la acción **Ver repetidos** analiza el alcance de la
sucursal y presenta pares con teléfono, correo o nombre completo normalizado en
común. Teléfono idéntico se marca como coincidencia alta; correo o nombre y
apellidos se presentan para revisión humana. Cada resultado muestra ambos
perfiles y abre el flujo existente de fusión para elegir la identidad principal,
capturar motivo y autorizar con `CLIENT_MERGE`. La fusión conserva el historial,
inactiva el origen y vuelve a calcular candidatos. Producción requiere
`POST /api/scheduler/clients/duplicate-candidates` (alcance por sucursal,
paginación y evidencias sin exponer datos fuera del permiso); la mutación
canónica de merge no cambia.

La validación del 10 de octubre de 2026 quedó en 94 pruebas totales y 30 de
diseño, además de TypeScript, lint y `build:design`. La revisión React confirmó
que los diálogos permanecen fuera del componente principal, los módulos pesados
de Excel se cargan de forma dinámica, los controles conservan nombre accesible y
las consultas se invalidan por el prefijo compartido de Clientes. La cobertura
incluye ahora la selección por mitades o tercios del registro individual bajo el
puntero. Lint conserva los tres avisos previos de `<img>` fuera de este cambio.

Cuando se selecciona o guarda un cliente, **Nuevo cliente** queda deshabilitado
y la acción también se protege dentro del componente. Para registrar otro
perfil primero se debe limpiar o cambiar la búsqueda; así no se reemplaza por
accidente el `customerId` ya vinculado al borrador de la reserva.

Al guardar una reserva, Agenda cierra el formulario, vuelve a la vista de
calendario y recarga citas y contextos antes de continuar. Con la pestaña
visible también realiza una actualización silenciosa cada 30 segundos y al
regresar desde otra pestaña; durante esas recargas conserva la cuadrícula en
pantalla. El encabezado publica con `aria-live` la hora local exacta de la
última respuesta aceptada, y el botón manual actualiza también los contextos de
atención y compra.

El 4 de octubre de 2026 se compactó la composición de Agenda para escritorio.
Desde 1280 px el encabezado distribuye rango, fecha y acciones en una sola fila
de 56 px; la cuadrícula y el panel izquierdo reciben el alto restante. El
selector Calendario/Lista usa controles de 48 px sólo con iconos, sin perder
etiquetas accesibles ni la posibilidad de contraer el panel. En 1280×720 y
1536×864 no hubo desbordamiento horizontal ni errores de consola.

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

El 10 de octubre de 2026, **Clientes → Recuperación** agregó una cartera
operativa separada del expediente general. Identifica casos por tres motivos:
cliente que nunca asistió, membresía terminada y tratamiento terminado. La
herramienta filtra por texto, motivo y status; muestra sucursal, representante,
última cita y asistencias, y permite clasificar el seguimiento como **Por
recuperar**, **Recuperado** o **Cliente perdido**. Cada transición exige un
código con propósito `CUSTOMER_RECOVERY_STATUS_CHANGE` y conserva status
anterior, nuevo status, nota, actor y fecha; nunca reescribe citas, membresías o
tratamientos históricos. La propuesta usa
`POST /api/scheduler/design-proposals/customers/recovery` y
`PUT /api/scheduler/design-proposals/customers/recovery/:id`. Producción deberá
proyectar la elegibilidad desde Agenda y POS mediante IDs canónicos, persistir
el historial append-only y registrar autorización y movimiento dentro de una
sola transacción.

El mismo 10 de octubre de 2026, Recuperación dejó de ser un diálogo de la base
de clientes y se convirtió en el submódulo independiente **Clientes →
Recuperación de clientes** (`/clientes/recuperacion`). Cada sucursal configura
en días cuándo activa las alertas por cliente que nunca asistió, membresía
terminada o tratamiento terminado. Cambiar esos plazos sólo recalcula casos
pendientes; los recuperados y perdidos siguen visibles para conservar el
historial. El tablero cuenta clientes sin recuperar, recuperados y perdidos,
genera una alerta de seguimiento e identifica al vendedor de cartera con más
clientes perdidos. La tabla permite seleccionar registros individualmente o
por el filtro visible; PDF, Excel e impresión incluyen exclusivamente esa
selección. La configuración usa `GET/PUT
/api/scheduler/design-proposals/customers/recovery-settings` y mantiene alcance
por sucursal.

En cada cambio de status de recuperación ahora se elige obligatoriamente el
**agente que realizó la gestión**. Ese responsable puede ser distinto del actor
que introduce el código y autoriza el movimiento: ambos se guardan por separado
como snapshots históricos. El submódulo incluye un **Reporte de recuperaciones
por agente** con número de gestiones, recuperados, perdidos, tasa de
recuperación y última actividad. Las exportaciones seleccionadas también
incluyen el agente asociado a la gestión más reciente.

Recuperación también admite asignación operativa **por grupo de trabajo o por
persona** sin cambiar el vendedor de cartera. La sucursal dispone de grupos
activos y cada caso conserva grupo/persona y fecha de asignación. El dashboard
puede agrupar y exportar PDF o Excel por grupo, vendedor de cartera o agente;
muestra cartera, recuperados, pendientes, perdidos, conversión, venta atribuida
y última actividad.

El estado operativo se deriva de Agenda sin reescribir la clasificación manual:
**Sin próxima cita**, **Cita programada**, **Reagendó**, **Canceló**, **No
asistió**, **Asistió**, **Compró** o **Realizó apartado**. La primera cita
atendida posterior a la asignación alimenta el histórico comercial de clientes
recuperados. Su reporte separa venta, recibido, saldo y ticket promedio, conserva
grupo/persona, vendedor y especialista, y permite descargar PDF o Excel. Los
endpoints de diseño son `POST /customers/recovery-teams`, `PUT
/customers/recovery/:id/assignment` y `POST /customers/recovery-purchases`
bajo el prefijo `/api/scheduler/design-proposals`.
