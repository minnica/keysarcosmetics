# Handoff de UI hacia backend

Este documento registra únicamente las necesidades descubiertas durante el prototipo. No autoriza
cambios en API, Prisma, base de datos, autenticación ni infraestructura.

Agrega una sección por flujo siguiendo la plantilla de `PROTOTYPE_BRIEF.md`. Deja explícitas las
dudas: el prototipo puede representar una hipótesis visual sin convertirla todavía en una regla de
negocio definitiva.

## Decisiones transversales

- El prototipo recupera la experiencia funcional aprobada y mantiene toda la información únicamente
  en estado React durante la sesión.
- La persistencia futura necesitará contratos para empleados, periodos, corridas, ventas, esquemas,
  movimientos, préstamos, viáticos, recibos, autorizaciones y costos por sucursal.
- La autenticación y los permisos actuales son sólo representaciones visuales; cualquier integración
  futura deberá preservar el aislamiento de la información personal y los permisos master.
- Ninguna de estas necesidades autoriza cambios en backend o base de datos durante el prototipo.

## Alta y directorio de empleados

- Información que necesita mostrar: nombre, puesto, tipo de nómina, sucursal, salario mensual, banco, cuenta enmascarada, rol inicial, fecha de alta, fecha de baja y estado.
- Información que captura o modifica: los mismos campos del directorio; el prototipo asigna las tasas fiscales mock según el tipo de nómina y permite corregir la vigencia laboral sin borrar históricos.
- Reglas y validaciones observadas: nombre, puesto, sucursal, rol, banco, últimos cuatro dígitos de cuenta y fecha de alta son obligatorios; el salario no puede ser negativo; la baja es inclusiva y no puede ser anterior al alta; un empleado solo aparece cuando su vigencia se cruza con el periodo consultado; el sueldo mensual se paga en dos mitades (1–15 y 16–fin de mes) y se prorratea por días cuando el alta o la baja cae dentro de la quincena.
- Estados posibles: alta programada, activo, baja programada y baja.
- Acciones y permisos esperados: el alta futura debe restringirse al personal autorizado y sincronizarse con Roles y accesos.
- Dudas por resolver: fuente maestra real del empleado, identificadores laborales/fiscales requeridos, flujo de autorización, congelamiento de corridas aprobadas y si el prorrateo productivo usará días naturales o asistencia efectiva.

## Acceso al portal de nómina

- Información que necesita mostrar: identidad corporativa, usuario, clave principal, estado de segunda clave y contexto del portal.
- Información que captura o modifica: credenciales de acceso y una segunda clave numérica de cuatro dígitos administrada desde Roles y accesos.
- Reglas y validaciones observadas: usuario y clave principal son obligatorios; la segunda clave se captura con teclado visual en un campo de solo lectura, separado del autollenado del navegador; no se vuelve a mostrar después de guardarse; sólo el usuario master o un rol con `security.second_key.manage` puede asignarla o cambiarla.
- Caducidad observada en el prototipo: la sesión en memoria vence después de 3 minutos sin actividad de teclado, puntero, toque o desplazamiento; cualquier diálogo abierto se cierra al volver a `/login` y la navegación privada exige iniciar nuevamente los dos pasos.
- Estados posibles: credenciales, verificación secundaria, segunda clave pendiente, clave incorrecta y acceso autorizado.
- Acciones y permisos esperados: el backend futuro deberá almacenar un hash independiente, aplicar límite de intentos, auditoría, expiración y recuperación segura; el permiso del master no puede retirarse desde la interfaz.
- Dudas por resolver: política de rotación, bloqueo por intentos, canal de recuperación, sincronización del tiempo de espera entre pestañas y si la segunda clave será PIN, OTP o factor criptográfico en producción.

## Historial gerencial por esquema de sucursal

- Información que necesita mostrar: esquema, sucursales incluidas, gerente vigente y secuencia histórica por fecha, incluyendo periodos identificados como `SIN GERENTE`.
- Información que captura o modifica: gerente nuevo o retiro de gerente, fecha efectiva, nombre, puesto, área de nómina y rol de acceso del empleado.
- Reglas y validaciones observadas: cada nombre se conserva como fotografía histórica; quitar, renombrar o sustituir a un gerente agrega una vigencia y no reemplaza registros anteriores; el recibo mensual recupera al gerente asignado en la fecha consultada; moverlo a Ventas cierra su asignación gerencial vigente, conserva su historial y actualiza inmediatamente los menús y permisos de su portal.
- Estados posibles: gerente asignado, sin gerente, gerente sustituido y perfil reasignado.
- Acciones y permisos esperados: la configuración de esquemas y la edición del perfil requieren acceso master; el gerente solo consulta su propio recibo de sucursal cuando coincide con la vigencia histórica.
- Dudas por resolver: autorización formal de sustituciones y congelamiento definitivo de recibos aprobados.

## Destino de movimientos, préstamos y adelantos

- Información que necesita mostrar: empleado, sucursal, tipo de nómina, corrida/periodo de primera aplicación, monto, parcialidades, saldo, estatus e historial.
- Información que captura o modifica: cada movimiento, préstamo o adelanto exige seleccionar explícitamente la nómina afectada y la corrida donde se pagará o comenzará el descuento.
- Reglas y validaciones observadas: un préstamo autorizado descuenta únicamente en el módulo elegido desde el periodo seleccionado; el arrastre conserva ese tipo de nómina hasta liquidarse; cambiar el destino en edición no reescribe periodos anteriores en el mock.

## Política configurable de préstamos y adelantos

- Información que necesita mostrar: comisión acumulada al día, monto máximo disponible para adelanto, solicitudes usadas en el mes o trimestre, número de cuotas y motivo de bloqueo.
- Información que captura o modifica: porcentaje máximo del adelanto sobre la comisión, máximo de adelantos mensuales, máximo de cuotas por préstamo y máximo de préstamos trimestrales.
- Reglas y validaciones observadas: por defecto el adelanto no supera 50% de la comisión acumulada ni dos solicitudes activas por mes; el préstamo no supera seis cuotas ni dos solicitudes activas por trimestre calendario. Las solicitudes rechazadas no consumen el límite. Las reglas se validan al solicitar, editar y autorizar.
- Estados posibles: dentro de política, fuera de política, pendiente, aprobado y rechazado.
- Acciones y permisos esperados: el empleado consulta su disponibilidad y solicita; un usuario máster configura límites y autoriza únicamente solicitudes válidas.
- Dudas por resolver: definir si una solicitud cancelada debe consumir el límite y si el conteo trimestral será calendario o móvil al conectar backend.
- Excepción de periodos en movimientos: el periodo destino se mantiene bloqueado por defecto; un código máster válido habilita las demás quincenas disponibles para alta o traslado, valida que la fecha pertenezca al nuevo corte y devuelve cualquier edición a borrador para una nueva aprobación.
- Estados posibles: borrador, pendiente, autorizado, rechazado y liquidado.
- Acciones y permisos esperados: el destino debe conservarse en la autorización, recibos, consolidado y bitácora; una integración futura deberá impedir que una corrida cerrada sea modificada sin reapertura formal.
- Dudas por resolver: tratamiento productivo de empleados con dos nóminas simultáneas y reglas para trasladar un saldo activo a otro módulo.

## Distribución del costo del empleado por sucursal

- Información que necesita mostrar: sucursal principal del empleado, sucursales que absorben su costo, porcentaje equitativo por punto, sueldo, costo social, ISR y costo integral resultante.
- Información que captura o modifica: al crear o editar un empleado y al asignar su rol se elige una, varias o todas las sucursales como centros de costo.
- Reglas y validaciones observadas: siempre debe existir al menos una sucursal; una sola recibe el 100%; dos o más dividen el costo en partes iguales; la distribución no modifica el importe total y alimenta consolidado, dashboard y reportes por sucursal.
- Estados posibles: sucursal única, selección múltiple y todas las sucursales.
- Acciones y permisos esperados: la edición debe limitarse a personal con acceso a Roles y accesos y dejar una bitácora de quién cambió la distribución y desde qué periodo se aplica.
- Dudas por resolver: si producción permitirá porcentajes manuales distintos al reparto equitativo y cómo se congelará la asignación histórica al cerrar cada nómina.

## Reporte analítico acumulado por sucursal

- Información que necesita mostrar: periodo mensual, trimestral o anual; ventas, nómina, costo social, ISR, costo integral, costo/venta, promedio por empleado, tendencia por mes y ranking por sucursal.
- Información que captura o modifica: alcance del reporte y periodo disponible; la exportación usa el mismo acumulado visible.
- Reglas y validaciones observadas: trimestre y año suman resultados calculados mes por mes para no aplicar una escala de comisión sobre ventas mezcladas; el año vigente muestra únicamente los meses disponibles y no proyecta meses futuros.
- Estados posibles: mensual, trimestral y anual acumulado.
- Acciones y permisos esperados: consulta, impresión y exportación PDF/Excel para usuarios con permiso de reportes.
- Dudas por resolver: ventanas históricas definitivas, comparativo contra presupuesto y si el ranking se medirá por costo/venta, margen o utilidad neta.

## Distribución de vendedores entre sucursales

- Entrada previa: al crear una nómina de vendedores aparece una alerta si una persona registró ventas en dos o más sucursales dentro del periodo.
- Opciones: reparto parejo o reparto proporcional al porcentaje de ventas de cada punto.
- Sugerencia automática: si una sucursal concentra al menos 55% de la venta, se preselecciona la participación real como recomendación.
- Efecto: la elección distribuye nómina, costo social e ISR en el consolidado, la analítica del módulo y el reporte por sucursal. El total pagado al empleado no cambia.
- Persistencia actual: estado React en memoria, identificado por periodo y empleado; no utiliza backend, base de datos ni almacenamiento del navegador.

## Dispersión final de nómina

- Información que necesita mostrar: corrida cerrada, tipo de nómina, periodo, fecha de pago, apellido paterno, apellido materno, nombre, puesto, banco, CLABE interbancaria, monto de pago, ISR, costo social y costo total.
- Información que captura o modifica: ninguna; es una vista exclusivamente informativa alimentada por la corrida autorizada o pagada.
- Reglas y validaciones observadas: una corrida en borrador no puede visualizarse ni exportarse; cada tipo de nómina produce un formato independiente; el personal se ordena por apellido paterno, materno y nombre; los totales del formato deben coincidir con la corrida cerrada.
- Comisión de kiosco: solo entran meses terminados; la dispersión consolida en una sola transferencia las comisiones de todas las sucursales asociadas al mismo gerente y conserva el origen de cada costo.
- Estados posibles: sin corrida cerrada, cerrada para pago y pagada.
- Acciones y permisos esperados: consulta, impresión y descarga en PDF/Excel para usuarios autorizados; no inicia transferencias bancarias.
- Dudas por resolver: fuente validada de nombres separados y CLABE, momento exacto de congelamiento del archivo, firma de autorización y mecanismo de versionado ante una reapertura.
- Bloqueo de cierre: producción deberá guardar una fotografía inmutable de cada corrida cerrada. Toda reapertura exigirá permiso maestro, segunda autenticación, motivo obligatorio y bitácora con usuario, fecha y versión anterior.

## Catálogo y sincronización de sucursales con POS

- Información que necesita mostrar: identificador interno estable, identificador externo del POS, nombre oficial, ciudad o estado, origen del registro, fecha de alta, última sincronización, fecha de baja, estado y conteos de relaciones históricas.
- Información que captura o modifica: alta y corrección manual en el portal; alta, cambio de nombre, reactivación o baja recibida desde el POS mediante un evento de integración.
- Reglas y validaciones observadas: el identificador externo del POS es único e idempotente; un evento repetido actualiza y nunca duplica; toda alta activa la sucursal en nóminas, comisiones, empleados, centros de costo y reportes; la baja es lógica, bloquea nuevas asignaciones y conserva ventas, movimientos, recibos, gerentes y costos históricos.
- Estados posibles: activa, baja lógica, pendiente de sincronización y error de integración.
- Acciones y permisos esperados: sólo el usuario máster administra altas manuales o reactivaciones; el POS actúa como fuente automática mediante un webhook autenticado; cada cambio debe guardar origen, actor, fecha, payload/versionado e intento de sincronización.
- Contrato futuro sugerido: evento `branch.upserted` con `externalPosId`, `name`, `city`, `active` y `updatedAt`; la API de nómina deberá hacer `upsert` transaccional, responder de forma idempotente y publicar el cambio a las vistas dependientes sin reescribir fotografías de periodos cerrados.
- Dudas por resolver: cuál sistema será la fuente maestra definitiva, mecanismo de autenticación/firma del webhook, política de reintentos, resolución de cambios simultáneos y si una sucursal manual debe poder vincularse después con una clave POS existente.

## Aprobación masiva de movimientos

- Información que necesita mostrar: movimientos pendientes, selección individual, cantidad seleccionada y alcance de los filtros activos.
- Información que captura o modifica: aprobación simultánea de uno o varios movimientos pendientes desde el listado.
- Reglas y validaciones observadas: sólo los registros en estado pendiente pueden seleccionarse; seleccionar todos abarca los pendientes del filtro actual aunque estén paginados; una sola acción cambia todos los seleccionados a aprobados y actualiza sus destinos de nómina, sucursal, recibos y reportes.
- Estados posibles: sin selección, selección parcial, todos los pendientes filtrados y aprobación terminada.
- Acciones y permisos esperados: requiere permiso de aprobación de nómina; producción deberá ejecutar el lote de forma transaccional, registrar usuario, fecha, ids y resultado individual, y rechazar cualquier movimiento ligado a una corrida cerrada.
- Dudas por resolver: si un error debe revertir el lote completo o permitir aprobación parcial con reporte de excepciones.

## Ventas brutas y ventas sin IVA en nómina

- Información que necesita mostrar: ventas brutas registradas, ventas netas sin IVA y modo de cálculo aplicado por empleado.
- Información que captura o modifica: ninguna; ambos importes se derivan de la misma venta y se incluyen en pantalla, impresión, PDF y Excel.
- Reglas y validaciones observadas: ventas sin IVA equivale a ventas brutas divididas entre 1.16; al calcular con IVA la cifra neta es informativa; al calcular sin IVA la cifra neta se identifica como base aplicada para escala y comisión.
- Estados posibles: base con IVA y base sin IVA.
- Acciones y permisos esperados: consulta dentro de cada nómina y sus exportaciones para usuarios autorizados.
- Dudas por resolver: si el POS entregará ambos importes fiscales o si producción deberá derivar la base neta considerando tasas distintas por producto o concepto.

## Separación de sueldo, comisión y módulos configurables

- Información que necesita mostrar: destino independiente del sueldo y de la comisión por empleado, conceptos habilitados, puestos participantes, empleados asignados, estado del módulo y periodo vigente.
- Información que captura o modifica: al registrar o editar personal se selecciona la nómina que paga su sueldo y, por separado, la nómina que paga su comisión; el usuario máster puede crear módulos personalizados y elegir sueldo, comisión, bonos, multas, ajustes, préstamos, adelantos y viáticos.
- Reglas y validaciones observadas: `Salario fijo` suma exclusivamente el sueldo registrado y su prorrateo; no agrega comisión ni movimientos. `Comisiones` admite cualquier puesto con esquema de comisión y nunca suma sueldo base, incluso para puestos mixtos. Un empleado mixto puede tener dos destinos simultáneos sin duplicar importes. Todo módulo requiere nombre, al menos un concepto y al menos un puesto.
- Cobertura del prototipo: cada módulo nuevo crea su propia configuración quincenal y corrida mock, aparece en el menú de Nómina y reutiliza cálculo, filtros, tabla, impresión, PDF, Excel, recibos, costo social e ISR. Sus conceptos alimentan el consolidado y los reportes generales una sola vez.
- Estados posibles: módulo base, personalizado activo y personalizado inactivo; la desactivación conserva el historial en memoria.
- Acciones y permisos esperados: crear, editar o desactivar módulos debe requerir permiso máster; producción necesita asignaciones efectivas por fecha, fotografías inmutables al cerrar una corrida y trazabilidad de quién cambió cada destino.
- Dudas por resolver: confirmar si un módulo personalizado puede combinar sueldo y comisión en un mismo recibo o si ambos conceptos deberán forzosamente producir recibos separados; definir si los movimientos heredarán el destino de comisión/sueldo o exigirán siempre una asignación explícita; confirmar si asignar un puesto a un módulo debe mover automáticamente a todo el personal actual, como lo hace el prototipo.

## Bandeja de corte e historial anual de recibos

- Información que necesita mostrar: un único recibo personal correspondiente al corte vigente, su estatus, importe y cuenta de pago; historial de recibos personales autorizados del año en curso; un único recibo gerencial correspondiente al último cierre mensual y su historial anual independiente.
- Información que captura o modifica: autorización o aclaración del recibo vigente por parte del empleado; autorización o aclaración del último recibo mensual por parte de la gerencia.
- Reglas y validaciones observadas: el empleado no puede seleccionar ni autorizar otra quincena; al autorizar, el recibo sale de la bandeja pendiente y entra al historial anual. La gerencia solo autoriza el último mes cerrado. Los recibos gerenciales de kiosco nunca sustituyen ni se mezclan con los recibos personales de venta. Al cambiar de año, el portal personal muestra únicamente documentos del nuevo año en curso.
- Estados posibles: pendiente de revisión, aclaración abierta, autorizado y consulta histórica de solo lectura.
- Acciones y permisos esperados: cada empleado consulta, descarga, aclara y autoriza exclusivamente sus propios recibos; el usuario máster conserva la vista general por periodo. Producción deberá validar la autorización contra la corrida de corte vigente y rechazar periodos arbitrarios desde el servidor.
- Control gerencial máster: la vista de `Recibos gerenciales` replica el control ejecutivo de recibos personales con periodo, búsqueda, filtro de estatus, paginación, importe, comprobante completo y alerta de faltantes. La decisión se guarda por `managerId + month` y nunca reutiliza ni modifica la aprobación quincenal personal del gerente.
- Dudas por resolver: política legal de conservación documental fuera del portal anual, acceso a constancias de ejercicios anteriores y momento exacto en que el cierre mensual gerencial queda disponible.

## Autorización de acceso por módulo

- Información que necesita mostrar: catálogo completo de módulos base y personalizados, acceso activo o inactivo por rol y una indicación explícita de acceso total obligatorio para el usuario máster.
- Información que captura o modifica: el usuario máster habilita o retira, para cada rol no máster, el acceso individual a cada módulo y las acciones operativas complementarias.
- Reglas y validaciones observadas: el rol `USUARIO MASTER` accede siempre a todos los módulos sin excepción y sus permisos no pueden desactivarse; los demás roles sólo ven en navegación y pueden abrir por URL los módulos autorizados; todo módulo personalizado genera su propia autorización; las rutas no catalogadas se rechazan por defecto para usuarios no máster.
- Estados posibles: acceso total protegido, módulo autorizado, módulo sin autorización y acceso directo rechazado.
- Acciones y permisos esperados: sólo el usuario máster puede administrar Roles y accesos. Producción deberá validar cada permiso también en servidor, consultas, exportaciones y acciones; ocultar el menú no constituye autorización suficiente.
- Dudas por resolver: definir si se permitirán plantillas de permisos por familia de puestos y si una autorización tendrá vigencia por fecha o sucursal.

## Permisos jerárquicos por menú y submenú

- Información que necesita mostrar: rol seleccionado, menús principales `Personal`, `Nómina`, `Operación`, `Configuración` y `Reportes`, número de permisos habilitados por sección, submenús disponibles y acciones específicas dentro de cada módulo.
- Información que captura o modifica: el usuario máster puede habilitar o retirar un menú completo en un solo control, o combinar submenús y acciones individuales para entregar acceso parcial.
- Reglas y validaciones observadas: el usuario máster conserva todos los accesos sin excepción y sus controles permanecen bloqueados; un menú se muestra como completo, parcial o sin acceso; las rutas no autorizadas se ocultan y deben rechazarse también por URL directa; los módulos personalizados de nómina se agregan automáticamente dentro de la sección `Nómina`.
- Separación funcional: `Bonos y multas` de Operación cuenta con un permiso distinto al catálogo de `Bonos y multas` en Configuración, para permitir registrar movimientos sin autorizar cambios de catálogo.
- Estados posibles: menú completo, acceso parcial, sin acceso y acceso total protegido para máster.
- Acciones y permisos esperados: cambiar el control de menú aplica todos sus submenús y acciones; cambiar una casilla individual afecta únicamente ese acceso. Producción deberá aplicar la misma jerarquía en navegación, endpoints, exportaciones y acciones del servidor.
- Persistencia actual: estado React en memoria. El backend futuro deberá guardar permisos atómicos por rol, resolver herencia por menú y mantener una bitácora de quién modificó cada autorización y cuándo.
- Dudas por resolver: definir si en producción existirán permisos de sólo lectura, edición y aprobación separados dentro de cada submenú, además de las acciones actuales.

## Inclusión fiscal global por periodo

- Información que necesita mostrar: periodo exacto, estado global de costo social e ISR y confirmación de que la regla alcanza nóminas, consolidado, recibos, dispersión y reportes.
- Información que captura o modifica: encendido o apagado independiente de costo social e ISR para una fecha inicial y final específicas.
- Reglas y validaciones observadas: el apagado global prevalece sobre cualquier tasa o monto individual y convierte la carga correspondiente en cero en todos los módulos; las vistas mensuales o de reportes heredan inmediatamente la regla vigente que se cruza con su rango; el encendido recupera la configuración fiscal individual sin modificar periodos no relacionados; una corrida cerrada bloquea el cambio.
- Estados posibles: ambas cargas activas, sólo costo social, sólo ISR o ambas excluidas.
- Acciones y permisos esperados: sólo un usuario máster configura o vuelve a autorizar la inclusión fiscal del periodo. La fuente central del prototipo rechaza cambios de perfiles no máster aunque intenten ejecutarlos desde otro módulo. Producción deberá persistir la regla con vigencia, usuario, fecha y bitácora, y usarla como entrada única de todos los cálculos y exportaciones.
- Dudas por resolver: definir si la reapertura con código máster también habilitará esta configuración y si un periodo mensual debe heredar o consolidar reglas distintas de sus dos quincenas.

## Resolución de préstamos, adelantos y alertas de aclaración

- Información que necesita mostrar: importe originalmente solicitado, importe final autorizado, estatus, fecha, nómina de aplicación, empleado solicitante y bitácora de cambios; para aclaraciones, tipo de recibo, persona, periodo, detalle y fecha de actualización.
- Información que captura o modifica: antes de autorizar, el usuario máster puede reducir o ajustar el monto de una solicitud pendiente; el empleado ve en su portal si fue autorizada o rechazada y, cuando cambió, compara el monto solicitado contra el resuelto. La campana del encabezado muestra únicamente al usuario máster las aclaraciones personales y gerenciales abiertas y enlaza con el registro relacionado.
- Reglas y validaciones observadas: sólo el rol `USUARIO MASTER` puede editar o resolver solicitudes; sólo se edita una solicitud pendiente y ligada a una corrida en borrador; el monto ajustado vuelve a validar los topes de adelantos y préstamos; una autorización usa el importe final y conserva el original; una aclaración deja de aparecer en la campana cuando su decisión cambia de `CLARIFICATION`.
- Estados posibles: solicitud pendiente, autorizada o rechazada; aclaración abierta, recibo autorizado o pendiente de decisión.
- Persistencia actual: todo vive en estado React en memoria. Producción deberá guardar `requestedAmount`, `approvedAmount`, actor, fecha, motivo obligatorio del ajuste, decisión, lectura/notificación del empleado y un evento inmutable de auditoría.
- Notificaciones futuras: el backend deberá generar un evento dirigido al empleado al autorizar o rechazar un préstamo/adelanto y un evento dirigido a usuarios máster al recibir una aclaración. La bandeja necesita estado leído/no leído por usuario, vínculo estable al recibo o movimiento, control de acceso en servidor y entrega idempotente; el contador visual del prototipo representa abiertas, no mensajes persistidos.
- Dudas por resolver: definir si el empleado debe aceptar expresamente un monto menor antes del pago, si un ajuste requiere motivo obligatorio y si las alertas se enviarán también por correo, WhatsApp o notificación móvil.

## Récord personal de venta

- Información que necesita mostrar: venta individual más alta de todo el historial del vendedor o gerente, fecha, sucursal, marca vigente y diferencia contra el récord anterior.
- Información que captura o modifica: ninguna en el perfil; una nueva venta aceptada actualiza automáticamente el récord cuando su importe es estrictamente mayor.
- Reglas y validaciones observadas: el récord es individual y no corresponde al acumulado del periodo; una igualdad no crea una nueva marca; al romperlo se muestra un mensaje motivador y el nuevo importe se convierte inmediatamente en la siguiente cifra que deberá superarse. El recibo y la comisión conservan sus cálculos normales.
- Estados posibles: sin ventas, récord histórico vigente y nuevo récord dentro del periodo actual.
- Acciones y permisos esperados: vendedores y gerentes consultan únicamente su propia marca. Producción deberá calcularla sobre ventas aceptadas e inmutables, conservar el evento de superación y actualizarlo de forma transaccional al recibir ventas del POS.
- Dudas por resolver: definir si una venta cancelada conserva el récord histórico o lo recalcula, y si la motivación también debe enviarse como notificación fuera del portal.

## Desglose diario del recibo gerencial

- Información que necesita mostrar: ventas y número de transacciones por día dentro de cada semana del mes seleccionado.
- Información que captura o modifica: ninguna; el detalle se consulta desde el recibo gerencial mensual.
- Reglas y validaciones observadas: la suma diaria debe coincidir exactamente con el total semanal y la suma de las semanas con el total mensual.
- Estados posibles: semana contraída o desplegada.
- Acciones y permisos esperados: el gerente consulta únicamente su propio recibo; el usuario master puede consultar todos los recibos gerenciales.
- Dudas por resolver: definir si las devoluciones o cancelaciones deben mostrarse como renglones negativos o descontarse directamente de la venta diaria.

## Ruta quincenal de escala de comisión

- Información que necesita mostrar: esquema variable asignado, niveles ordenados, porcentaje de cada nivel, venta acumulada de la quincena, nivel vigente, importe faltante para la siguiente escala, días restantes y meta diaria para alcanzar cada nivel.
- Información que captura o modifica: ninguna; el contador se recalcula automáticamente con las ventas aceptadas del empleado y la vigencia efectiva de su esquema.
- Reglas y validaciones observadas: sólo aparece cuando el esquema tiene dos o más niveles con porcentajes distintos; utiliza exclusivamente el periodo quincenal activo; un nivel se marca como logrado cuando la venta acumulada alcanza su límite inferior; la meta diaria divide el faltante entre los días naturales restantes, incluido el día actual; al alcanzar el último nivel muestra `Nivel máximo alcanzado`.
- Estados posibles: primer nivel activo, avance al siguiente nivel, nivel logrado, escala completa y corte finalizado sin alcanzar la meta.
- Acciones y permisos esperados: cada empleado consulta únicamente su progreso personal; el usuario máster lo visualiza al entrar al perfil autorizado. Producción deberá calcularlo con ventas validadas por POS y resolver cambios de esquema por vigencia sin reescribir periodos cerrados.
- Dudas por resolver: confirmar si la meta diaria debe considerar días naturales o sólo días laborales de la sucursal, y si devoluciones o cancelaciones deben reducir el avance inmediatamente.

## Datos maestros desde RH y felicitación de cumpleaños

- Información de RH preparada: identificador externo, sistema origen, fecha de última sincronización, nombre y apellidos, fecha de nacimiento, código de puesto, código de sucursal, sueldo mensual, banco, cuenta, CLABE de 18 dígitos, fecha de alta, fecha de baja y estado laboral.
- Contrato de integración: `payroll-hr-employee-contract.ts` normaliza texto, cuenta bancaria y CLABE, y rechaza fechas o montos inválidos antes de incorporar información. El vínculo idempotente deberá usar `source + externalId`; los códigos de puesto y sucursal se resolverán contra los catálogos unificados del portal.
- Propiedad de datos: nombre, fecha de nacimiento, sueldo, cuenta bancaria y vigencia laboral serán datos maestros de RH. El alta y la edición manual conservan la fecha de nacimiento como respaldo autorizado hasta conectar la fuente externa.
- Cumpleaños: el perfil personal compara únicamente mes y día de `birthDate` contra la fecha local. Cuando coinciden muestra una tarjeta de felicitación con el primer nombre; la fecha completa no se expone en el mensaje.
- Historial: una sincronización actualiza el perfil vigente y crea una bitácora; nunca recalcula ni modifica recibos, costos o periodos cerrados. Los cambios de sueldo, puesto, sucursal y vigencia deben aplicarse con fecha efectiva a periodos futuros o abiertos.
- Seguridad esperada: la conexión real debe ejecutarse en servidor con autenticación de servicio, transporte cifrado, mínimo privilegio, bitácora de cada alta/cambio/baja y sin enviar CLABE ni fecha de nacimiento al navegador salvo donde sea estrictamente necesario.
- Pendientes para conexión real: definir proveedor de RH, URL/API o mecanismo de archivos, autenticación, frecuencia de sincronización, tabla de equivalencias de puestos y sucursales, política de conflictos y responsable de reintentos.

## Catálogo y operación de bonos y multas

- Información de configuración: tipo de concepto, nombre unificado, regla de monto fijo o meta de venta, importe sugerido, nómina destino, inicio y fin de vigencia y estado activo. Una multa es siempre un descuento de nómina por incidencia o política autorizada y nunca se interpreta como bono/percepción; el catálogo presenta su importe como `monto del descuento`. En bonos de venta se elige una meta con premio único o una escala con varios rangos `desde/hasta` y un importe distinto por nivel; también se define si participa todo el personal vendedor elegible o una selección explícita buscable por nombre y apellido. Bonos permanentes y multas admiten el interruptor `vigencia por tiempo indeterminado`, representado por `validUntil = null`; el bono temporal exige fecha de cierre. El usuario máster puede registrar una nueva multa, un nuevo bono permanente o un bono temporal desde Configuración. Estos botones crean conceptos del catálogo; no asignan el pago a una persona.
- Información operativa: empleado, concepto vigente elegido desde lista, fecha de aplicación, periodo, sucursales de costo, importe y estatus. Cada registro conserva una referencia al concepto que lo originó y la nómina definida en ese catálogo.
- Bonos temporales: requieren inicio, fin, importe del premio, nómina destino y una condición medible. La condición puede ser una meta de venta acumulada —con premio único o escala por niveles— o una cantidad de bonos registrados. El perfil y el recibo muestran avance, siguiente meta, faltante y premio del nivel alcanzado; al cierre, quienes cumplen reciben el premio automático y un mensaje emergente de felicitación.
- Reglas y validaciones observadas: los desplegables dependientes sólo muestran conceptos activos cuya vigencia se cruza con el periodo, tipo, nómina y personal elegible; los conceptos temporales se identifican explícitamente. Los niveles no admiten rangos inválidos o traslapados y cada uno exige un premio mayor a cero. Al corregir un registro vuelve a borrador; un registro aprobado usa el importe del nivel realmente alcanzado y suma el bono o descuenta la multa en su nómina destino, recibo, portal personal, consolidado y reportes por sucursal; desactivar un concepto lo retira de altas nuevas sin borrar el historial.
- Eliminación segura: cada concepto tiene una acción de borrado disponible sólo para el usuario máster. Si nunca fue utilizado, la confirmación lo elimina de forma definitiva. Si ya tiene movimientos, ajustes o premios automáticos, primero se muestra un inventario con origen, empleado, sucursal, nómina, fecha, periodo, importe y estatus; sólo después de reconocer ese inventario se permite retirarlo del catálogo. En este segundo caso la baja es lógica: desaparece de altas y listas nuevas, pero todos los registros permanecen en recibos, nóminas, costos y reportes.
- Historial y análisis: Configuración separa los catálogos de bonos, multas y bonos temporales. Cada catálogo conserva activos, inactivos, programados, finalizados y retirados; permite buscar por nombre/regla/nómina, filtrar por estatus y nómina, navegar en páginas de 20, 40, 60 o todos y usar edición, apagado y eliminación lógica con historial protegido. Impresión, PDF y Excel incluyen únicamente el catálogo y los filtros seleccionados, con nombre, efecto contable, regla, nómina, fecha de registro, vigencia y estatus. La vista operativa conserva la consulta mensual, permite filtrar por empleado, fecha, tipo y texto, muestra importes aprobados y pendientes, grafica el número de aplicaciones por bono e identifica el más aplicado y el menos logrado. Cuando termina un bono temporal, el reporte de bonos conserva la competencia y muestra un Top 5 ordenado por cumplimiento con posición, resultado y premio.
- Exportaciones: PDF y Excel usan exactamente el mes y los filtros visibles; incluyen fecha, tipo, concepto, empleado, nómina, monto y estatus.
- Estados posibles: concepto activo, inactivo o eliminado del catálogo con historial conservado; movimiento en borrador, pendiente, aprobado, rechazado o cancelado.
- Acciones y permisos esperados: Configuración administra el catálogo y sus vigencias; Operación asigna un concepto existente a una persona. El usuario máster puede crear, editar o desactivar conceptos y aprobar, corregir o eliminar movimientos. Los demás perfiles requieren autorización explícita del módulo y no pueden ejecutar acciones master.
- Persistencia actual: estado React en memoria. Producción deberá usar identificadores estables para niveles y participantes, vigencias efectivas, baja lógica del catálogo, motivo y actor obligatorios al eliminar, auditoría inmutable de cambios y una fotografía inmutable del Top 5 al cierre. La API deberá rechazar el borrado físico cuando existan relaciones y resolver la revisión de dependencias dentro de la misma transacción. La generación del premio deberá ser idempotente para no duplicarlo en nómina, costos o reportes al recalcular, y un periodo cerrado deberá conservar la escala y elegibilidad vigentes aunque el catálogo cambie después.
- Dudas por resolver: confirmar si una corrección de monto requerirá motivo y segunda clave; definir si los empates comparten posición; precisar si el conteo de bonos considera sólo aprobados y si el mensaje de felicitación debe registrar fecha de lectura por empleado.

## Reportes operativos de movimientos, préstamos, bonos y multas

- Información que necesita mostrar: periodo inicial y final, empleado, sucursal o empresa completa, estatus, concepto, nómina afectada, importe, costo asignado, totales aprobados, impacto contable, frecuencia por concepto y persona con mayor número de registros.
- Información que captura o modifica: ninguna; son vistas analíticas de solo lectura alimentadas por movimientos, solicitudes de préstamos/adelantos y bonos o multas ya registrados.
- Reglas y validaciones observadas: cada familia tiene un módulo independiente; los filtros afectan simultáneamente indicadores, gráficas, costo por sucursal, detalle y exportaciones; cuando un registro se reparte entre varias sucursales, el costo se divide en partes iguales para evitar duplicar el total; únicamente los registros aprobados generan costo e impacto, aunque los demás estatus permanecen visibles para control operativo.
- Totales y análisis: la opción `EMPRESA COMPLETA` muestra la suma consolidada; al elegir una sucursal sólo se presenta su participación asignada. Cada módulo identifica el concepto de mayor uso, el de menor uso —incluidos conceptos configurados sin aplicación— y la persona con más registros.
- Exportaciones: PDF y Excel descargan exclusivamente el módulo, fechas, empleado, sucursal y estatus seleccionados. El archivo incluye detalle contable y una sección adicional con el impacto por sucursal.
- Estados posibles: borrador, pendiente, aprobado/autorizado, rechazado y cancelado, según la fuente del registro.
- Acciones y permisos esperados: cada uno de los cuatro reportes tiene un permiso independiente asignable por rol; el usuario máster conserva acceso obligatorio a todos. Producción deberá aplicar la misma autorización en consultas y generación de archivos del servidor.
- Persistencia actual: estado React en memoria. Producción necesitará consultas históricas paginadas, fotografías de periodos cerrados, asignaciones de costo efectivas por fecha y una fuente contable única para evitar diferencias entre pantalla, PDF y Excel.
- Dudas por resolver: confirmar si adelantos deben mantenerse dentro del reporte de préstamos o contar con un quinto módulo, y si el análisis de menor uso debe considerar sólo registros creados o también personal elegible que nunca recibió el concepto.

## Impresión y exportación ejecutiva de reportes

- Información que muestra: nombre exacto del reporte, periodo seleccionado, alcance aplicado —empresa completa, sucursal, empleado o vendedor—, indicadores del dashboard, análisis ejecutivo y tabla de resultados.
- Reglas de impresión: el botón `Imprimir` genera un documento aislado del módulo activo; nunca incluye navegación, encabezado de sesión, filtros, controles ni botones de la aplicación. La hoja cambia automáticamente entre A4 y A3, vertical u horizontal, según la cantidad de columnas.
- Reglas de PDF y Excel: ambos archivos usan los mismos filtros y datos visibles del módulo. Incluyen título, periodo, alcance y condición de reporte general cuando no existe una selección individual. Los reportes anchos usan tipografía compacta, celdas con ajuste de línea, encabezados centrados y cifras alineadas para impedir texto o importes encimados.
- Fuente común: impresión, PDF y Excel consumen la misma configuración `ReportExportConfig`, con metadatos, métricas y análisis, para evitar diferencias entre formatos.
- Validación realizada: el consolidado de 19 columnas se verificó en PDF A3 horizontal y en Excel; el contenido cabe en la hoja, conserva sus celdas y muestra título, periodo, resumen y análisis antes del detalle.

## Catálogo y aprobación de notificaciones push

- Información que necesita mostrar: módulo de origen, evento disparador, título, mensaje con variables, perfiles destinatarios, fecha de última edición, responsable y estado de aprobación.
- Información que captura o modifica: usuarios con `notifications.manage` editan el título y mensaje de cada plantilla y aprueban o pausan todas las notificaciones de un módulo en un solo control.
- Reglas y validaciones observadas: ninguna plantilla pendiente se considera habilitada; editar cualquier mensaje retira la aprobación de todo su módulo y exige una nueva revisión; los tokens como `{nombre}`, `{monto}`, `{sucursal}` y `{periodo}` se resuelven con datos del evento y nunca con texto introducido por el destinatario.
- Estados posibles: módulo aprobado con envío habilitado o módulo pendiente con envío detenido. El prototipo conserva plantillas, cambios y aprobaciones únicamente en estado React durante la sesión.
- Acciones y permisos esperados: `module.notifications` permite abrir el submódulo de Configuración y `notifications.manage` permite editar y aprobar. El usuario máster conserva ambos permisos; otros roles requieren autorización explícita.
- Integración futura: producción necesitará eventos idempotentes de ventas, bonos, nómina, recibos y préstamos; almacenamiento de plantillas versionadas; auditoría de cada aprobación; registro y revocación de tokens por dispositivo; Service Worker; proveedor Web Push; expiración y reintentos; estado enviado/entregado/leído y enlaces profundos protegidos hacia el registro correspondiente.
- Seguridad y privacidad: con la aplicación abierta se puede mostrar una alerta interna; con el navegador cerrado se requiere permiso push del dispositivo. La pantalla bloqueada debe usar texto genérico sin importes, datos bancarios ni conceptos confidenciales; el detalle sólo se revela tras autenticar el portal y validar permisos en servidor.
- Dudas por resolver: definir quién puede aprobar además del usuario máster, qué módulos disparan avisos obligatorios, horarios silenciosos, vigencia de tokens y si cada empleado podrá desactivar categorías no críticas.

## Centro de control ejecutivo

- Información que necesita mostrar: ventas, nómina, costo social, ISR, costo integral, costo sobre venta, autorizaciones de recibos, conciliación, cuentas bancarias incompletas, centros de costo inválidos, movimientos pendientes y estado de cada corrida; el alcance se filtra por mes, tipo de nómina y sucursal.
- Alimentación continua: el prototipo recalcula la vista desde la fuente React compartida cada vez que cambia una venta, empleado, corrida, recibo, movimiento, préstamo, impuesto o centro de costo. Producción deberá publicar eventos idempotentes y mantener una proyección analítica actualizada sin duplicar importes.
- Pronóstico trazable: usa un promedio móvil ponderado sobre tres meses históricos completos —20%, 30% y 50%, dando mayor peso al más reciente—. La interfaz conserva y muestra cada periodo fuente, importe, peso, fórmula, alcance y resultado. Producción deberá versionar el método, registrar fecha de cálculo, moneda, filtros y fotografía de los datos usados; los periodos cerrados no se recalculan silenciosamente.
- Preparación de cierre: el indicador se compone de seis controles visibles: recibos autorizados, conciliación sin diferencia, centros de costo completos, CLABE válida, operación pendiente resuelta y corridas fuera de borrador. No es una probabilidad; es la proporción de controles cumplidos.
- Escalabilidad: los agregados deben calcularse en servidor o vistas materializadas; el detalle por sucursal requiere búsqueda y paginación de 20, 40, 60 o todas, con índices por periodo, módulo, sucursal, empleado y estado. Las respuestas deben devolver totales consolidados además de la página visible.
- Seguridad y permisos: `module.control_center` controla el acceso; el usuario máster entra siempre y los demás roles requieren autorización explícita. La API futura debe volver a validar el permiso en cada consulta y exportación, aplicar mínimo privilegio, cifrado, bitácora de acceso, ocultamiento de CLABE y límites de consulta.
- Protección en reunión: el botón global de privacidad, siempre visible en todos los módulos protegidos, activa el difuminado inmediato de la información; es una protección visual de emergencia y no sustituye controles del sistema operativo contra capturas. Tras tres minutos sin actividad se bloquean los datos y sólo el código privado máster puede mostrarlos nuevamente; a los cinco minutos se cierra la sesión completa.
- Estados posibles: actualizado, con excepciones, parcialmente preparado, listo para cierre, visualmente protegido y bloqueado por inactividad.
- Dudas por resolver: aprobar el método de pronóstico antes de usarlo para decisiones financieras, definir umbrales oficiales de costo sobre venta, responsables de cada excepción y si el modo reunión debe ocultar también nombres de sucursales.

## Privacidad global e inactividad de sesión

- Alcance visible: todas las rutas autenticadas del sistema quedan cubiertas por un único control global, incluidos los módulos de nómina, sueldos, comisiones, condiciones, esquemas, recibos, reportes, costos y configuración. El botón flotante `Privacidad` permanece disponible en escritorio y celular sin depender del módulo abierto.
- Regla de tres minutos: al cumplirse tres minutos sin interacción, toda la interfaz autenticada se difumina, deja de aceptar acciones y muestra una pantalla segura. El mismo bloqueo puede activarse manualmente; la pantalla indica si el origen fue manual o por inactividad.
- Desbloqueo: únicamente se acepta el código privado secundario del empleado que tiene el rol `USUARIO MASTER`. El código se captura con teclado numérico seguro, no se autocompleta, no se muestra y un intento incorrecto mantiene la información bloqueada. Desbloquear reinicia los relojes de privacidad y sesión.
- Regla de cinco minutos: si la inactividad alcanza cinco minutos, aun cuando la pantalla esté bloqueada, se elimina la sesión React, se regresa al acceso y se exige usuario, contraseña y segundo código nuevamente. La actividad sobre la pantalla de privacidad no prolonga este plazo.
- Estados posibles: sesión activa, privacidad manual, privacidad por inactividad, código master incorrecto, información desbloqueada y sesión expirada.
- Persistencia actual: el prototipo usa temporizadores del navegador y el código secundario de los datos demo (`2580` para `MASTER DEMO`). Producción deberá verificar el código exclusivamente en servidor, almacenar sólo un hash, aplicar límites y enfriamiento de intentos, revocar la sesión en servidor a los cinco minutos y registrar en una bitácora inmutable cada bloqueo, desbloqueo y expiración.
- Seguridad adicional: el difuminado evita exposición casual en pantalla, pero no puede impedir capturas del sistema operativo. La implementación productiva debe combinarla con permisos de módulo, expiración real del token, reautenticación, cifrado, ocultamiento de datos bancarios y encabezados de seguridad.

## Agrupación y exportación de esquemas de comisión

- Información que necesita mostrar: personal incluido en el periodo agrupado por el esquema vigente al cierre, puesto, tipo de contratación, sucursal y fecha efectiva; personal elegible sin esquema; catálogo completo de esquemas con estatus, fecha de registro, vigencia, escalas y número de asignaciones activas. El historial permite buscar por nombre y filtrar por esquema, incluidos los inactivos.
- Información que captura o modifica: la asignación o cambio conserva la fecha efectiva y crea una nueva vigencia sin reescribir periodos históricos. Los listados y exportaciones son de consulta.
- Reglas y validaciones observadas: un alta entra en el listado si su fecha de ingreso pertenece al periodo consultado. Una baja permanece incluida y prorrateada hasta el cierre del periodo que contiene su fecha de salida; desaparece en periodos posteriores sin alterar la nómina vigente ni los cierres anteriores. Dar de baja un esquema lo desactiva para nuevas asignaciones, pero conserva el catálogo, las asignaciones y sus escalas para las nóminas y reportes históricos. El listado se ordena primero por tipo de esquema y después alfabéticamente por empleado.
- Exportaciones: `Personal agrupado por esquema` y `Esquemas registrados` cuentan con impresión, PDF y Excel independientes. Cada archivo incluye título, periodo, alcance, indicadores, análisis y únicamente la información de su sección; el catálogo respeta la búsqueda aplicada, no la página visual. Tanto el catálogo como el personal se ordenan por tipo de esquema. Ambos formatos usan A4 horizontal, anchos ponderados, ajuste de línea y cifras centradas para evitar contenido encimado.
- Estados posibles: esquema activo, baja al cierre, inactivo histórico, grupo con personal, grupo vacío, personal pendiente y asignación histórica.
- Acciones y permisos esperados: usuarios autorizados para Configuración consultan los grupos y exportaciones; crear, cambiar o eliminar esquemas permanece reservado al permiso correspondiente. Producción deberá resolver la asignación vigente y los totales desde una consulta paginada en servidor, conservando la fotografía de cada periodo cerrado.

## Vigencias salariales y rutas automáticas de esquema

- Información que necesita mostrar: versión del esquema, fecha efectiva, niveles de comisión, si incorpora un modelo de sueldo, importe mensual, nómina exclusiva del sueldo, duración fija o temporal, meses de vigencia, siguiente esquema y cambios futuros programados.
- Información que captura o modifica: al crear una escala se puede activar `Incluye sueldo base`; el sueldo se dirige únicamente a Salario fijo o Especialistas. Puede quedar sin vencimiento o durar de uno a veinticuatro meses. Un modelo temporal puede enlazarse con otra escala, permitiendo rutas como `Principiante mes 1 → mes 2 → mes 3 → escala definitiva`.
- Reglas y validaciones observadas: asignar la primera escala genera todas las transiciones futuras de la cadena, con un límite defensivo de doce etapas y protección contra ciclos. Si el sueldo temporal vence sin escala siguiente, se registra una vigencia en cero y deja de pagarse. El porcentaje del esquema sólo alimenta Comisiones; el sueldo sólo alimenta su módulo salarial. Un empleado mixto conserva ambas líneas sin duplicarlas.
- Protección histórica: cada cambio manual de sueldo crea una vigencia desde el periodo activo y cierra la anterior. Editar una escala crea una versión nueva; las asignaciones previas se trasladan a una copia histórica con sus porcentajes originales y las personas vigentes reciben la nueva versión desde la fecha elegida. Los cálculos quincenales y mensuales resuelven el sueldo correspondiente a cada fecha, incluso si cambia entre la primera y segunda quincena.
- Estados posibles: sueldo fijo, sueldo temporal activo, sueldo vencido, transición programada, esquema vigente, versión histórica e integrante mixto con sueldo y comisión.
- Necesidad futura de backend: persistir tablas versionadas de `scheme_version`, `scheme_assignment` y `salary_assignment` con rangos de vigencia no solapados; ejecutar transiciones en una tarea idempotente; impedir ciclos; guardar la versión utilizada por cada línea de nómina cerrada y no recalcular fotografías históricas cuando cambie el perfil vigente.
- Dudas por resolver: confirmar si el personal dado de baja debe aparecer en un tercer reporte histórico separado y si el listado debe incluir metas o ventas acumuladas por nivel.

## Bajas, liquidaciones y finiquitos

- Información que necesita mostrar: empleado, puesto, fechas de alta y baja, tipo de salida, fecha de pago, conceptos incluidos, importe editable, tratamiento de ISR/costo social, sucursales de costo, notas del acuerdo, recibo preparado, estatus de pago, caso abierto/cerrado y resultado `CASO GANADO` o `LIQUIDADO`.
- Información que captura o modifica: el registro de una fecha de baja mantiene al empleado en su nómina ordinaria únicamente hasta ese día y lo incorpora automáticamente a la bandeja de liquidaciones/finiquitos. El usuario autorizado decide con un switch si aplica, selecciona `FINIQUITO` o `LIQUIDACIÓN`, habilita o excluye cada concepto, ajusta importes, asigna una o varias sucursales y cambia el estatus de borrador a autorizado o pagado.
- Reglas y validaciones observadas: una baja nunca elimina al empleado ni reescribe periodos anteriores; desactiva inmediatamente su acceso al portal, pero conserva perfil, recibos y pagos históricos. Salario fijo y ventas comisionables se limitan al intervalo entre alta, inicio del periodo y baja; las ventas posteriores a la baja no generan comisión. Sueldo pendiente inicia desactivado para no duplicar lo ya pagado por nómina ordinaria. `AUTORIZADO` y `PAGADO` afectan consolidado, nómina y costos en la fecha de pago elegida; `BORRADOR`, `NO APLICA` y los registros archivados no generan filas ni costo. El autorizado representa la obligación aprobada pendiente de liquidar y el pagado confirma su cierre. El switch global del periodo puede excluir ISR y costo social incluso cuando el registro individual los tenga activos.
- Plantilla legal editable: aguinaldo proporcional, vacaciones proporcionales, prima vacacional, percepciones variables pendientes, prima de antigüedad, indemnización constitucional, veinte días por año y otros acuerdos. Los conceptos condicionados nunca se activan automáticamente; el caso debe revisarse según motivo de terminación, contrato y asesoría laboral.
- Recibo previo al pago: cada caso genera un documento individual con conceptos, referencia, importes, datos laborales, sucursal, notas y líneas de firma del empleado y representante. Imprimir o exportar el recibo registra que fue preparado; hasta entonces el estatus `PAGADO` permanece bloqueado.
- Historial y reportes: `Reportes > Liquidaciones` filtra por fecha de baja, nombre/puesto, sucursal y estado exacto —pendiente, aprobado o pagado—, conserva alta/baja/pago/estatus y permite 20, 40, 60 o todos. La operación conserva los casos cerrados sin retirarlos. Impresión, PDF y Excel descargan exclusivamente el filtro visible. El dashboard por sucursal incorpora obligaciones aprobadas y pagos realizados según las sucursales elegidas, y alerta si falta centro de costo.
- Estados posibles: no aplica, borrador, autorizado y pagado; finiquito o liquidación; caso pendiente, cerrado como ganado o cerrado como liquidado. Las filas autorizadas se distinguen en azul y las pagadas en verde dentro de operación y reporte.
- Acciones y permisos esperados: `module.settlements` controla la operación y `module.settlement_reports` el reporte; ambos se asignan desde `Configuración > Roles y accesos` y el usuario máster entra siempre. Aprobar requiere además `payroll.approve` y valida que aplique, exista importe y haya sucursal de costo. Una vez aprobado, el tipo `FINIQUITO` o `LIQUIDACIÓN` queda inmutable aunque cambie el estatus posterior. Editar cualquier dato y eliminar son acciones exclusivas del usuario máster; para otros roles el detalle se abre en modo consulta. Eliminar realiza un archivo lógico: retira la obligación de nómina y reportes sin destruir su trazabilidad. Producción deberá aplicar estas reglas también en servidor y registrar motivo de baja, fundamento, actor, versión de cada cálculo, aprobación con segunda clave, documentos, archivo lógico y evento contable inmutable.
- Dudas por resolver: definir catálogo oficial de motivos de baja, tratamiento fiscal por concepto, reglas de redondeo, topes vigentes, si la persona debe aceptar digitalmente el acuerdo y qué estatus permite reabrir un pago.

## Nómina anual de aguinaldos

- Información que necesita mostrar: personal con sueldo, ejercicio, días otorgados, tiempo laborado, importe calculado y editable, pagos programados, pagos realizados, saldo pendiente, ISR, costo social, sucursales de costo, notas y estatus.
- Información que captura o modifica: días otorgados por empleado —el campo vacío se mantiene visualmente vacío, sin forzar un cero—, exclusión individual mediante switch, importe excepcional, cargas individuales, una/varias/todas las sucursales y pago individual de cada parcialidad.
- Calendario configurable: Configuración define para cada ejercicio uno o varios periodos con nombre, fecha, porcentaje y estado. Los pagos activos deben sumar exactamente 100%; se permite un pago único o dividirlo durante el año. La columna `AGUINALDO` sólo aparece en consolidado, impresión y exportación cuando el periodo consultado contiene una fecha configurada.
- Reglas y validaciones observadas: el cálculo demo usa salario mensual entre treinta, días otorgados y proporción de días laborados en el año. La base inicial es quince días, pero puede aumentarse por política interna. Una persona dada de baja recibe la parte proporcional correspondiente a la terminación dentro del finiquito; el módulo anual lista a quienes tuvieron sueldo y relación laboral dentro del ejercicio. Sólo cada parcialidad marcada `PAGADA` afecta consolidado, nómina y reportes en su fecha configurada. Antes del primer pago el registro se modifica únicamente desde `EDITAR`; después de integrar cualquier parcialidad se bloquean `APLICA`, días, importe, sucursales, notas e impuestos para no reescribir el historial. La regla global activa ISR/costo social para todos los aguinaldos del periodo; si está apagada, el switch individual funciona como una excepción explícita que activa la carga únicamente para ese aguinaldo.
- Distribución y reportes: cada registro dirige el costo a una, varias o todas las sucursales. El dashboard ejecutivo compara por sucursal personal, importe programado, aguinaldo integrado, costo social, ISR, costo total y participación; cuando un registro tiene varias sucursales reparte cada cifra en partes iguales y separa cualquier importe sin asignación. El desglose por sucursal y los reportes generales suman únicamente pagos realizados, cargas y costo integral sin duplicar importes. La vista compacta usa renderizado diferido, páginas de 20, 40, 60 o todos y está preparada para más de 200 empleados. Impresión, PDF y Excel usan el mismo formato ejecutivo del consolidado y muestran programado, pagado y pendiente.
- Estados posibles: aplica/no aplica, borrador, pago parcial/autorizado y pagado por completo.
- Acciones y permisos esperados: `module.christmas_bonus` controla el submenú y se asigna desde `Configuración > Roles y accesos`; el usuario máster entra siempre y otros roles sólo ven Aguinaldos cuando el permiso está activo. Producción deberá obtener salario efectivo, incidencias que afecten proporcionalidad, fecha de alta/baja y política de días desde fuentes versionadas, generar el asiento contable una sola vez y conservar la fotografía del cálculo cerrado.
- Dudas por resolver: definir tratamiento de ausencias, salario variable, exención y retención fiscal vigentes, fecha real de corte, política de redondeo y si el switch de exclusión exige documento o motivo obligatorio.

## Capacidad para más de 200 empleados y concurrencia multidispositivo

- Cobertura del prototipo: los listados principales de empleados, accesos, nóminas, cálculo de comisiones, recibos, dispersión, asignaciones, liquidaciones, aguinaldos, configuración fiscal, reportes operativos y centro de control trabajan con búsqueda y páginas de 20, 40, 60 o todos. Las filas de mayor volumen usan renderizado diferido con `content-visibility`; los cruces repetidos de empleados usan mapas por identificador en las pantallas críticas. El modo `TODOS` se conserva para consulta puntual, pero la operación diaria inicia en veinte registros.
- Alcance verificado: la interfaz y los cálculos del prototipo no contienen un límite funcional de 200 empleados. Esta verificación no equivale a una prueba de carga productiva porque los datos viven en memoria de una sola pestaña y no existe todavía API, base de datos ni almacenamiento compartido.
- Registros que no aplican: la bandeja operativa conserva liquidaciones, finiquitos y aguinaldos excluidos para que un usuario autorizado pueda volver a activarlos. Los reportes, indicadores financieros, impresión, PDF, Excel, consolidado y desglose por sucursal omiten por completo los registros con `applies = false`; no generan filas ni conceptos en cero.
- Campos numéricos: días, importes, tasas y porcentajes de liquidaciones/finiquitos/aguinaldos representan el cero como campo vacío durante la captura. Borrar el contenido deja el control visualmente vacío y permite escribir la nueva cifra sin seleccionar o reemplazar un cero forzado.
- Arquitectura productiva obligatoria: desplegar instancias sin estado detrás de un balanceador; mantener sesiones, permisos y revocaciones en un almacén central; persistir nóminas y auditoría en una base transaccional; y calcular/exportar listados grandes mediante consultas paginadas en servidor. No se deben usar variables de proceso, memoria del navegador ni afinidad de sesión como fuente de verdad.
- Concurrencia y prioridad: reservar capacidad de admisión y conexiones para `USUARIO MASTER` y roles administrativos, con una cola y límites separados de los usuarios personales. La prioridad sólo controla disponibilidad y latencia; nunca debe permitir saltarse validaciones, bloqueos o el orden de confirmación contable. Las operaciones de cierre, pago, autorización y edición deben usar versión del registro, transacciones, idempotencia y conflicto explícito para impedir que dos dispositivos sobrescriban cambios.
- Sincronización entre dispositivos: publicar cambios confirmados mediante eventos y actualizar las vistas con SSE o WebSocket; al reconectar, cada dispositivo vuelve a consultar el estado oficial. Cierre y pago requieren exclusión transaccional breve; las lecturas, búsquedas y reportes permanecen concurrentes. Cada dispositivo mantiene una sesión identificable y revocable, con expiración por inactividad y bitácora de usuario, rol, dispositivo, IP, fecha y acción.
- Índices mínimos sugeridos: empleado por estado/puesto/sucursal; nómina por periodo/módulo/estatus; movimiento por empleado/periodo/tipo/estatus; recibo por empleado/periodo/tipo; liquidación por empleado/fecha de baja/aplica/estatus; aguinaldo por empleado/ejercicio/aplica; y centros de costo por sucursal/periodo.
- Criterio de aceptación previo a producción: ejecutar una prueba con al menos 250 empleados distribuidos en seis o más sucursales y sesiones simultáneas de perfiles master, administrativos y personales. Debe verificarse p95 de lectura y escritura, cero duplicados, cero actualizaciones perdidas, preservación histórica, exportaciones completas y acceso prioritario de master/administración bajo saturación. El número definitivo de usuarios simultáneos y los objetivos de latencia deben acordarse con infraestructura antes de liberar.

## Días festivos o feriados con pago doble

- Alcance: Salario fijo y Especialistas permiten registrar por empleado, fecha y periodo un día laborado con pago doble. El consolidado lo muestra en una columna propia, resalta la fila en color ámbar y conserva fecha y motivo en impresión, PDF y Excel.
- Fórmula aplicada: el sueldo ordinario del periodo ya contiene el primer pago del día. Cada registro agrega exactamente un salario diario adicional, calculado como sueldo mensual entre treinta, para que el total de ese día sea dos veces el salario diario y no tres veces.
- Reglas y validaciones observadas: sólo aparecen empleados cuyo sueldo está asignado al módulo abierto; la fecha debe pertenecer al periodo y a la relación laboral; no se admite más de un registro para la misma persona, módulo y fecha; una corrida cerrada bloquea altas y eliminaciones hasta ser reabierta con la protección existente; crear o eliminar exige el permiso `payroll.create`.
- Integración financiera: el adicional forma parte de la base ordinaria para ISR y costo social cuando las cargas globales e individuales están activas. Se distribuye con la misma regla de centros de costo del empleado. El reporte por sucursal lo expone como columna informativa, pero ya está incluido dentro del importe de Salario fijo o Especialistas y nunca se suma una segunda vez.
- Persistencia actual: los registros viven en estado React durante la sesión. Producción deberá persistirlos con empleado, fecha, motivo, módulo, factor, salario diario efectivo, periodo, actor, fecha de creación, aprobación, versión y centro de costo; los periodos cerrados deben guardar una fotografía inmutable.
- Requisitos productivos: integrar un calendario oficial y versionado de días de descanso obligatorio, políticas internas, turnos realmente laborados, incidencias y salario diario efectivo. El factor y tratamiento fiscal deben ser configurables y revisados por nómina/asesoría laboral, porque la obligación legal puede distinguir entre el salario ordinario del día y la prima adicional. Toda corrección debe registrar motivo, actor y, cuando el periodo esté cerrado, autorización master.

## Cierre consecutivo, préstamos y saldos pendientes

- Apertura del siguiente periodo: Salario fijo y Especialistas trabajan sobre el periodo configurado y ya no presentan el botón `Nueva nómina`. Al usar `Cerrar para pago`, la corrida actual cambia de `BORRADOR` a `APROBADA`, se crea una sola corrida en borrador para el corte inmediato siguiente —sin duplicarla si ya existe— y la pantalla selecciona automáticamente ese nuevo periodo.
- Aplicación inmediata de préstamos y adelantos: al aprobar una solicitud, su cuota se incorpora en el periodo y módulo elegidos sin esperar el cierre; el cambio se refleja en la nómina, el consolidado y el recibo obtenidos desde la fuente compartida. El cierre registra la cuota como aplicada una sola vez mediante la combinación solicitud/periodo e incrementa el número de parcialidades pagadas.
- Saldos negativos: si préstamos, adelantos, multas u otras deducciones superan las percepciones del empleado, el neto pagable del periodo queda en cero y la diferencia se guarda como saldo pendiente. El siguiente periodo del mismo tipo de nómina la presenta como `SALDO ARRASTRADO`, la descuenta antes de calcular el pago y vuelve a trasladar únicamente el remanente. El consolidado y los reportes por sucursal consumen el mismo saldo, sin duplicarlo como un costo adicional.
- Recibos: el recibo del periodo muestra por separado cuota de préstamo, saldo negativo anterior y saldo que continuará al siguiente corte. El historial permite seleccionar el nuevo periodo abierto y conserva la explicación aun cuando la solicitud ya haya completado su última parcialidad.
- IVA general e individual: las nóminas de comisión y los recibos usan la misma resolución de base. Primero se aplica la excepción `CON IVA` o `SIN IVA` del empleado; cuando no existe, hereda la opción global. Cambiar cualquiera de las dos recalcula inmediatamente venta base, comisión, nómina, consolidado y recibo sin capturas duplicadas.
- Permisos y bloqueo: cerrar exige `payroll.approve`; una corrida aprobada permanece bloqueada y sólo la reapertura autorizada por usuario máster permite corregirla. Aprobar solicitudes conserva las reglas de topes, frecuencia y parcialidades configuradas.
- Persistencia actual: el prototipo conserva corridas, cuotas y saldos en estado React durante la sesión. Producción deberá ejecutar cierre, creación del siguiente periodo, asiento de cuota y saldo remanente dentro de una transacción; usar una clave idempotente por solicitud/periodo; conservar fotografías inmutables de base IVA, excepciones y movimientos; aplicar control de versión para cierres simultáneos; y auditar actor, fecha, dispositivo, reaperturas y correcciones. Recalcular o reabrir no debe duplicar cuotas ni perder el saldo anterior.
- Validación realizada: en navegador se autorizó un préstamo de una parcialidad mayor al neto de una especialista, apareció inmediatamente en su recibo, generó saldo pendiente, cerró septiembre de 2026 segunda quincena, abrió octubre de 2026 primera quincena y trasladó el remanente al nuevo recibo. También se verificaron cambios `SIN IVA` por empleado y `SIN IVA`/`CON IVA` globales en los recibos, sin errores de consola.

## Cierre y reapertura de la nómina de comisiones

- Información que necesita mostrar: periodo, estado `BORRADOR` o `CERRADA`, motivo del cierre, número de revisión, fecha de reapertura y avance de recibos confirmados contra el total de vendedores incluidos.
- Cierre manual: `Cálculo de comisiones` permite cerrar la corrida aun con confirmaciones pendientes, después de mostrar cuántas faltan. El cierre cambia la corrida a aprobada y bloquea fecha de pago, base general, excepciones individuales y recálculo.
- Cierre automático: la última confirmación requerida de un vendedor cierra la corrida sin intervención administrativa y registra `ALL_RECEIPTS_AUTHORIZED` como motivo. Sólo participan vendedores con relación laboral vigente en el periodo y comisión asignada a la nómina de Comisiones.
- Reapertura y correcciones: una corrida cerrada sólo se reabre con un código privado perteneciente a un usuario máster activo. La reapertura registra actor, fecha, motivo y revisión. Una corrección general revoca todas las confirmaciones del periodo; una corrección individual revoca únicamente la del vendedor afectado, vuelve a mostrar `Confirmar nómina` en su portal y mantiene la corrida abierta hasta un nuevo cierre manual o hasta reunir otra vez todas las confirmaciones.
- Congelamiento: la corrida cerrada conserva su modo general `CON IVA` o `SIN IVA`, y las excepciones individuales se guardan por periodo para que cambios futuros no reescriban recibos o consolidados históricos.
- Invalidación automática: en el prototipo, aprobar, editar, rechazar o eliminar un movimiento, ajuste, préstamo, adelanto o viático que ya afectaba el pago revoca la confirmación autorizada del empleado en ese periodo. Cambiar la base global o individual de IVA hace lo mismo. El recibo vuelve a PENDIENTE, la corrida continúa abierta y el portal exige una nueva confirmación con el importe recalculado.
- Integración futura: producción debe ejecutar cálculo, invalidación y bitácora dentro de la misma transacción. Debe guardar fotografía inmutable del cálculo, versión optimista, motivo obligatorio, actor, dispositivo, valores antes/después y notificar al empleado que debe confirmar otra vez. La validación del código máster y el bloqueo deberán ejecutarse en servidor, nunca depender sólo de la interfaz.
- Estados posibles: borrador, cerrada manualmente, cerrada por aprobación completa, reabierta para corrección y pagada.

## Actualización automática del sistema

- Todas las altas, ediciones, cambios de estatus y configuraciones del prototipo pasan por el estado compartido de nómina. Cada mutación válida recalcula las líneas derivadas y vuelve a renderizar los módulos, consolidados, reportes, recibos y costos que consumen esos datos, sin requerir recargar la página.
- El encabezado muestra permanentemente la hora exacta y la antigüedad de la última actualización. El control `Actualizar sistema` se adapta a escritorio y celular; al pulsarlo invalida el estado compartido de la sesión y fuerza una nueva evaluación de nóminas, consolidado, recibos, dispersión, dashboards, reportes y costos sin recargar la página ni perder capturas en memoria.
- La actualización manual expone estado accesible de progreso y confirma el alcance al terminar. No modifica datos contables, autorizaciones ni cierres: únicamente vuelve a proyectar todos los consumidores desde la fuente vigente y renueva la marca de tiempo.
- Alcance actual: la sincronización es inmediata dentro de la sesión React del prototipo. La sincronización entre dispositivos y usuarios simultáneos requerirá que el backend publique eventos versionados —por ejemplo con WebSocket o Server-Sent Events— y que el cliente invalide los datos afectados sin perder la auditoría.

## Orden de nóminas y reportes

- El orden se controla directamente desde cada título de la franja negra de la tabla; se retiró el selector global porque ocultaba qué columna gobernaba el resultado. Los títulos de texto alternan A–Z y Z–A, mientras que importes, conteos y porcentajes alternan mayor–menor y menor–mayor.
- La columna activa muestra un indicador visible y expone `aria-sort`. El cambio se aplica antes de paginar y la misma colección ordenada se entrega a impresión, PDF y Excel; por tanto la salida conserva exactamente el orden visible.
- La tabla compartida cubre Consolidado, Salario fijo, Especialistas, Comisiones, Honorarios y módulos de nómina configurables. El mismo patrón se usa en Dispersión, Comisión de kiosco, Desglose por sucursal, Gastos por puesto y reportes operativos.
- El orden vive en estado local de cada tabla. Al cambiar de módulo o cerrar sesión se desmonta la vista y regresa al orden predeterminado sin modificar cálculos, registros contables ni fotografías históricas. Los rankings analíticos independientes conservan su orden de desempeño.

## Prioridad fiscal por periodo y nómina

- Base de comisión: la selección `CON IVA` o `SIN IVA` se conserva por empleado y periodo. La misma línea calculada alimenta Cálculo de comisiones, el portal personal, el recibo anual, el consolidado y los reportes; por tanto el recibo no vuelve a calcular la comisión con una base distinta.
- Regla global: los interruptores de ISR y costo social del Consolidado son la autoridad general del periodo. Cuando están activos, la carga se aplica a todas las nóminas y los interruptores locales quedan bloqueados y etiquetados como `global`.
- Excepción por nómina: con la regla global apagada, cada módulo puede activar ISR o costo social únicamente para su propia nómina. La excepción se guarda con módulo, inicio y fin del periodo; no enciende ni modifica los demás módulos.
- Propagación: las líneas resueltas son la fuente para tablas, totales, recibos, Centro de control, Desglose por sucursal, Gastos por puesto y Dispersión. Ningún consumidor debe volver a apagar una carga ya resuelta por una excepción local.
- Prioridad efectiva: `global activo` → aplica en todas; `global apagado + módulo activo` → aplica sólo en ese módulo; ambos apagados → no aplica. Las asignaciones individuales de tasa o monto continúan determinando el importe una vez que la nómina está habilitada.
- Validación realizada: en navegador se cambió a ANA SOFÍA MARTÍNEZ a `SIN IVA` y su recibo conservó la base y comisión de $4,668.97. Después se apagó el ISR global, se activó únicamente Salario fijo y se comprobó ISR de $2,240.00 para MÓNICA SERRANO, Especialistas permaneció excluido y el Consolidado respetó la diferencia. Al reactivar el ISR global, Especialistas se actualizó sin errores de consola.
- Comisión por kiosco: `KIOSK_COMMISSION` es un módulo fiscal independiente. Sus interruptores están disponibles tanto en la nómina mensual como en `Dispersión > Comisión de kiosco`. Con la regla global apagada, modifican únicamente esta nómina mensual; con la regla global encendida, ambos aparecen activos y bloqueados porque la autoridad general del periodo tiene prioridad. Las tasas se resuelven por gerente y cualquier monto fijo se aplica una sola vez al recibo gerencial, aunque el esquema combine varias sucursales.
- Fuente única de kiosco: cálculo mensual, recibo del gerente, control máster de recibos, dispersión y desglose por sucursal consumen `kioskPayrollForMonth`. Comisión, costo social, ISR y costo total se calculan una vez por gerente y se distribuyen proporcionalmente entre sus sucursales, evitando duplicar una carga fiscal en esquemas combinados.

## Conciliación de comisiones y costo por punto de venta

- Información que necesita mostrar: el mismo conjunto de empleados, ventas, comisiones, bonos, multas, préstamos, ajustes, viáticos y saldos en `Nómina > Comisiones` y `Operación > Cálculo de comisiones`; filtros por nombre, puesto y sucursal; y una matriz por empleado con una columna por sucursal POS.
- Reglas y validaciones observadas: la inclusión no depende del nombre del puesto. Entra cualquier empleado con ventas POS dentro del periodo, un esquema vigente, comisión calculada o un bono aprobado, aunque su puesto no sea Vendedor y aunque su módulo salarial sea Salario fijo, Especialistas u Honorarios. Las ventas sin esquema permanecen visibles con comisión en cero y alerta `SIN ESQUEMA`, para que nunca desaparezcan del control. Los bonos se presentan en Cálculo de comisiones como una vista transversal de actividad, pero el Consolidado los contabiliza una sola vez en la nómina de origen. Los movimientos pendientes no afectan el pago hasta su aprobación.
- Conciliación obligatoria: Cálculo de comisiones compara en cada render ventas, comisión y bonos contra las líneas del Consolidado para el mismo periodo y la misma resolución `CON IVA`/`SIN IVA`. La pantalla y las exportaciones muestran `CUADRADA` sólo cuando las tres diferencias son menores a un centavo; de otro modo muestran el importe exacto por revisar.
- Distribución POS: las ventas se agrupan por `employeeId`, `branchId` y periodo. Comisión y otros movimientos netos se reparten proporcionalmente entre las sucursales donde el empleado generó ventas; si no existen ventas se utiliza su centro de costo asignado. Los bonos respetan primero las sucursales elegidas en el registro del bono y, si son varias, dividen el importe en partes iguales conservando el ajuste de centavos en la última asignación. La suma de las columnas de sucursal debe ser idéntica al total de nómina de los empleados visibles.
- Desglose y conciliación: la sección inferior separa `COMISIÓN + BONOS + OTROS MOVIMIENTOS = TOTAL NÓMINA`. `OTROS MOVIMIENTOS` es el efecto neto restante —ajustes, multas, préstamos, adelantos, viáticos y saldos— para evitar volver a sumar los bonos. El detalle de bonos presenta empleado, puesto, concepto, origen normal/temporal, sucursal, porcentaje de carga e importe; su total debe coincidir con el total de bonos de la selección con tolerancia menor a un centavo.
- Filtros y descargas: búsqueda, puesto y sucursal actualizan tabla, métricas, impresión, PDF y Excel. Al elegir una sucursal, comisión, bonos, movimientos y total muestran únicamente la parte cargada a esa sucursal. La salida incluye título, periodo, alcance, origen POS, conciliación y sólo los registros seleccionados; la orientación es horizontal y las columnas usan anchos compactos para impresión. El desglose de bonos cuenta además con impresión, PDF y Excel independientes.
- Necesidades futuras: el POS deberá entregar un identificador estable de venta, empleado y sucursal, fecha contable, importe con/sin IVA, cancelaciones y corte de sincronización. La importación deberá ser idempotente y conservar trazabilidad hasta el movimiento origen; la conciliación deberá ejecutarse en backend con importes decimales y fotografía inmutable al cerrar la nómina.

## Propagación automática de IVA y movimientos

- Fuente única: payrollLines resuelve ventas, base con o sin IVA, comisión, bonos, multas, préstamos, adelantos, ajustes, viáticos, saldos, ISR y costo social. Consolidado, recibos y reportes consumen esas mismas líneas; no mantienen sumas financieras independientes.
- Prioridad de IVA: cada empleado puede heredar la base global o conservar una excepción por periodo. Las vistas mensuales suman las quincenas y respetan la base y escala de cada una; nunca extienden una excepción a todo el mes. El Centro de control, la conciliación por sucursal y la matriz de costo distribuyen la venta ya resuelta por la participación POS de cada sucursal, por lo que el total siempre coincide con Consolidado.
- Efecto de movimientos: sólo registros APROBADOS entran al cálculo. El alta o cambio de estatus se refleja en la nómina, el consolidado y el recibo dentro del mismo estado compartido; borradores y rechazados no generan importe.
- Multas obligatorias: toda multa aprobada se descuenta en la nómina seleccionada aunque ese módulo se haya configurado sin otros movimientos. La misma línea neta alimenta consolidado, dispersión, dashboards, recibos y reportes; si la multa supera las percepciones y pagos especiales disponibles, únicamente el remanente se arrastra como saldo negativo.
- Protección de confirmaciones: cuando se modifica un concepto que ya cambió el importe, la autorización previa del recibo queda pendiente y debe repetirse. Las corridas cerradas bloquean estas mutaciones hasta una reapertura máster, preservando el cierre histórico.
- Alcance técnico: esta actualización es automática dentro de la sesión del prototipo. Producción debe persistir la fuente única en una transacción, publicar un evento versionado a las demás sesiones y recalcular de forma idempotente antes de confirmar el nuevo estado.

## Dispersión consolidada e historial de periodos

- Inclusión de personal: `Nómina > Dispersión de nómina` consume directamente `payrollLines` y ya no vuelve a excluir empleados por la categoría de su puesto. Cada tipo de nómina conserva a todo el personal asignado por configuración o actividad; la pestaña `TODAS LAS NÓMINAS` presenta una sola fila por empleado incluido en el periodo con su neto final.
- Importe bancario: `NETO A COBRAR` usa el total pagable de la línea de nómina después de percepciones, deducciones, préstamos, adelantos, multas, movimientos y saldos. ISR y costo social se muestran como cargas separadas; `COSTO TOTAL` es el costo patronal y no debe usarse como importe de transferencia.
- Periodo actual: una corrida en borrador se muestra como precálculo vivo y suma sus empleados e importes aunque todavía no esté cerrada ni pagada. Debajo de los tipos de nómina aparece una alerta roja que enumera el nombre y las fechas exactas de cada corrida abierta. Impresión, PDF y Excel permanecen bloqueados hasta el cierre; al cerrar o pagar toman todos los registros del periodo, no sólo la página visible.
- Conciliación: `TODAS LAS NÓMINAS` conserva como fuente principal la línea consolidada —para no duplicar sueldo, comisión, bonos, movimientos o cargas— y en el último corte del mes incorpora una sola vez la comisión mensual de kiosco. Si el gerente ya existe, kiosco se suma sobre su misma fila. La pantalla muestra la igualdad `consolidado vivo + kiosco = total precalculado` y marca cualquier diferencia mayor a un centavo.
- Historial: el selector de periodo permanece visible y controla simultáneamente pantalla, impresión, PDF y Excel. Los periodos anteriores conservan su fecha, estado y folio; la comisión de kiosco muestra también el mes actual como borrador/precálculo y continúa usando cierres mensuales, mientras las demás nóminas usan los cortes configurados.
- Alcance del prototipo: para demostrar navegación histórica, los últimos seis cortes anteriores se recalculan con el estado React disponible. No son fotografías contables inmutables. Producción deberá guardar por cada cierre un identificador estable, estado, fechas, modo de IVA, empleados incluidos, datos bancarios vigentes, neto, cargas, costo total y versión de cálculo; consultar un periodo anterior nunca deberá aplicar cambios posteriores del empleado o de la configuración.

## Analítica del consolidado de ventas

- El Consolidado incorpora tres visualizaciones complementarias: tendencia de ventas contra costo laboral durante los últimos seis meses, composición del costo entre nómina base/costo social/ISR y comparación horizontal de ventas contra costo total por sucursal.
- Las tarjetas ejecutivas identifican la sucursal con mayor venta, la menor relación costo/venta entre sucursales con ventas y el peso global del costo laboral sobre las ventas. No se presenta una relación de eficiencia cuando el denominador es cero.
- La venta por sucursal se distribuye usando la participación real de las ventas POS de cada empleado y conserva la base `CON IVA` o `SIN IVA` ya resuelta en la línea consolidada. El costo por sucursal reutiliza exactamente la misma asignación que alimenta conciliación y reportes.
- El periodo seleccionado controla las gráficas por sucursal y la composición. La tendencia termina en el mes seleccionado y recalcula seis meses comparables con la misma fuente compartida; no es un pronóstico ni inventa datos futuros.
- Las gráficas son SVG responsivas, tienen descripciones accesibles y tooltips monetarios. En producción, los periodos cerrados deberán leer fotografías históricas inmutables del backend para impedir que cambios posteriores modifiquen una serie ya presentada a dirección.

## Recibos de comisiones configurables

- Importe pagable: el recibo personal es exclusivamente de comisiones. Suma comisión, bonos, ajustes positivos y viáticos; resta multas, ajustes negativos, cuotas de préstamos o adelantos y saldos pendientes. El sueldo base, pago doble, aguinaldo y liquidación no forman parte de este neto.
- Sueldo configurable: Configuración > Configuración de recibos incluye una regla binaria. Apagada, oculta por completo el sueldo y lo excluye del neto; encendida, muestra el sueldo del periodo como percepción y lo suma al neto del recibo. También permite editar título, subtítulo y mostrar u ocultar ventas, esquema, progreso de bonos temporales y cuenta bancaria.
- Información obligatoria: comisión, neto pagable y todos los conceptos monetarios que modifican el recibo nunca pueden ocultarse desde configuración. Multas, bonos, ajustes, viáticos y movimientos muestran el motivo o comentario visible para el empleado.
- Elegibilidad por puesto: un bono puede asignarse a cualquier empleado activo, sin depender de que su puesto sea Vendedor o de que ya tenga una nómina de comisión asignada. La nómina seleccionada en el catálogo controla dónde se contabiliza el concepto, mientras la elegibilidad individual controla quién puede obtenerlo.
- Alcance de configuración: el nuevo acceso `module.receipt_settings` está en Configuración y queda disponible automáticamente para el usuario master. Otros roles sólo podrán abrirlo cuando se les conceda ese módulo desde Roles y accesos.
- Persistencia actual: configuración y comentarios viven en el estado React del prototipo. Producción deberá persistir versiones por empresa y periodo, hacer obligatorio el motivo en servidor, conservar el texto histórico mostrado en cada recibo cerrado y auditar actor, fecha, valor anterior y valor nuevo.
- Validación realizada: en navegador se comprobó ocultar y volver a mostrar el sueldo informativo sin cambiar el neto, visualizar el motivo de una multa, seleccionar a una facialista en un bono por venta, navegar la configuración en 390 px sin desbordamiento y ejecutar todo sin errores de consola.
- Convención visual: los importes de préstamos y adelantos usan ámbar; las multas y descuentos usan rojo. Las etiquetas y signos se conservan junto al color para que la interpretación no dependa únicamente de la percepción cromática.
