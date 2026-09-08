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
- Dudas por resolver: política legal de conservación documental fuera del portal anual, acceso a constancias de ejercicios anteriores y momento exacto en que el cierre mensual gerencial queda disponible.

## Autorización de acceso por módulo

- Información que necesita mostrar: catálogo completo de módulos base y personalizados, acceso activo o inactivo por rol y una indicación explícita de acceso total obligatorio para el usuario máster.
- Información que captura o modifica: el usuario máster habilita o retira, para cada rol no máster, el acceso individual a cada módulo y las acciones operativas complementarias.
- Reglas y validaciones observadas: el rol `USUARIO MASTER` accede siempre a todos los módulos sin excepción y sus permisos no pueden desactivarse; los demás roles sólo ven en navegación y pueden abrir por URL los módulos autorizados; todo módulo personalizado genera su propia autorización; las rutas no catalogadas se rechazan por defecto para usuarios no máster.
- Estados posibles: acceso total protegido, módulo autorizado, módulo sin autorización y acceso directo rechazado.
- Acciones y permisos esperados: sólo el usuario máster puede administrar Roles y accesos. Producción deberá validar cada permiso también en servidor, consultas, exportaciones y acciones; ocultar el menú no constituye autorización suficiente.
- Dudas por resolver: definir si se permitirán plantillas de permisos por familia de puestos y si una autorización tendrá vigencia por fecha o sucursal.

## Inclusión fiscal global por periodo

- Información que necesita mostrar: periodo exacto, estado global de costo social e ISR y confirmación de que la regla alcanza nóminas, consolidado, recibos, dispersión y reportes.
- Información que captura o modifica: encendido o apagado independiente de costo social e ISR para una fecha inicial y final específicas.
- Reglas y validaciones observadas: el apagado global prevalece sobre cualquier tasa o monto individual y convierte la carga correspondiente en cero en todos los módulos; las vistas mensuales o de reportes heredan inmediatamente la regla vigente que se cruza con su rango; el encendido recupera la configuración fiscal individual sin modificar periodos no relacionados; una corrida cerrada bloquea el cambio.
- Estados posibles: ambas cargas activas, sólo costo social, sólo ISR o ambas excluidas.
- Acciones y permisos esperados: sólo un usuario máster configura o vuelve a autorizar la inclusión fiscal del periodo. La fuente central del prototipo rechaza cambios de perfiles no máster aunque intenten ejecutarlos desde otro módulo. Producción deberá persistir la regla con vigencia, usuario, fecha y bitácora, y usarla como entrada única de todos los cálculos y exportaciones.
- Dudas por resolver: definir si la reapertura con código máster también habilitará esta configuración y si un periodo mensual debe heredar o consolidar reglas distintas de sus dos quincenas.
