# Especificación funcional y reglas de negocio del POS

> Documento consolidado de las indicaciones proporcionadas durante la sesión, desde el origen hasta el 2 de septiembre de 2026. Su objetivo es servir como fuente de referencia para implementar backend, base de datos, seguridad, sincronización, impresión y frontend sin perder las condiciones operativas o visuales definidas.

## 1. Alcance y criterios generales

- La solución debe funcionar tanto en navegador como en Electron, con el mismo flujo, validaciones y permisos.
- El backend debe ser la autoridad final para permisos, costos, precios mínimos, autorizaciones, existencias, pedidos, tickets y sincronización. Ocultar un dato solamente con CSS o JavaScript no se considera seguridad suficiente.
- Los cambios de configuración deben afectar las operaciones nuevas y las pantallas activas que correspondan, pero nunca deben alterar tickets, impresiones o movimientos históricos ya finalizados.
- Las operaciones sensibles deben quedar auditadas con usuario, rol, sucursal, terminal, fecha, hora, entidad afectada, valores anteriores y nuevos y, cuando aplique, quién autorizó con código master.
- Los textos y nombres de menú deben mantenerse consistentes entre frontend, permisos, rutas, reportes y APIs.
- Las ventanas, filtros, listas desplegables, botones y mensajes deben permanecer dentro de las dimensiones visibles del dispositivo. Cuando el contenido sea mayor, el desplazamiento debe ser interno y las acciones principales deben permanecer visibles.
- Las alertas, confirmaciones y mensajes emergentes deben ser compactos, informativos y legibles.
- Los botones de editar, borrar, eliminar, activar o desactivar deben mostrarse como iconos en todo el sistema y en Ventas, salvo que se solicite expresamente lo contrario. Deben conservar etiqueta accesible y tooltip.
- Las imágenes no deben aparecer quebradas. Las rutas deben funcionar en web y Electron; si el recurso falla, se debe mostrar una imagen sustituta controlada y registrar el error.
- Las acciones que el usuario canceló durante la sesión —por ejemplo, mover o separar ramas de Git— no forman parte de esta especificación funcional.

## 2. Catálogo maestro de productos y servicios

### 2.1 Alta y edición

Todo registro creado desde el alta de producto o servicio debe contemplar, como mínimo:

- Identificador interno inmutable.
- Tipo: producto o servicio. Si posteriormente se habilita el tipo máquina, debe seguir las mismas reglas de publicación definidas aquí.
- Nombre comercial y SKU único.
- Familia, categoría y grupo.
- Descripción comercial para catálogo.
- Lista ordenada de beneficios.
- Imagen válida o referencia a un activo empaquetado.
- Precio mínimo y precio máximo o de lista.
- Tratamiento de IVA.
- Sucursales donde estará disponible.
- Estado activo/inactivo.
- Interruptor `Mostrar en catálogo`.
- Para productos físicos: existencias, mínimo y máximo de inventario, costos y autorización para solicitar tester cuando corresponda.

La descripción y al menos un beneficio son obligatorios cuando `Mostrar en catálogo` está activado. Si la publicación está desactivada, el producto puede continuar existiendo en Ventas e Inventario sin aparecer en el libro digital.

### 2.2 Validaciones de precio

- Precio mínimo y precio máximo/lista deben ser números finitos, mayores a cero y normalizados a dos decimales.
- El precio máximo/lista debe ser igual o mayor que el precio mínimo.
- Al borrar el contenido de cualquier campo de precio o monto, el control debe quedar visualmente vacío; no debe reinsertar automáticamente un cero mientras el usuario edita.
- El valor mostrado en el campo, la vista previa, el total de línea y el valor enviado al backend deben coincidir.
- El precio máximo/lista es el precio inicial sugerido en Ventas.
- Una línea nueva debe recibir inmediatamente los límites vigentes del producto.
- Si se actualiza el catálogo mientras existe una línea en un carrito activo:
  - La referencia del producto y sus límites se sincronizan.
  - Si la línea conservaba exactamente el precio de lista anterior y no era paquete ni tenía autorización especial, adopta el nuevo precio de lista.
  - Si tenía precio manual o provenía de un paquete, conserva el importe, pero se vuelve a validar contra el nuevo mínimo.
  - Los tickets ya finalizados permanecen inmutables.
- El sistema actual permite capturar un precio superior al de lista y lo identifica como precio libre sobre lista. Si esta regla cambia, debe definirse un tope duro independiente.

### 2.3 Piso mínimo y autorización

- Cada producto o servicio tiene un precio mínimo protegido.
- El sistema evalúa el piso combinado del ticket, no solamente cada línea aislada.
- Una reducción bajo el mínimo de una línea puede continuar sin autorización si el excedente o `SPARE` de otras líneas cubre completamente el piso combinado.
- Si el total propuesto queda debajo del mínimo combinado, se requiere código master válido.
- La autorización se registra en la línea y en la auditoría del ticket; el backend debe volver a comprobarla al guardar o cobrar.
- Las ediciones posteriores que aumenten el incumplimiento del mínimo deben solicitar nueva validación master.

### 2.4 Estado e impacto

- Desactivar un producto lo elimina de las pantallas operativas y de carritos activos, pero conserva su historial.
- Los SKU no se pueden duplicar.
- Cambiar nombre, familia o categoría se propaga a vistas vigentes, sin reescribir documentos históricos.
- Los cambios del catálogo se reflejan inmediatamente en Ventas e Inventario.

## 3. Catálogo digital para clientes

- El módulo Catálogo genera un catálogo digital profesional y lujoso, presentado como libro.
- El contenido se organiza por familia y dispone de un índice navegable.
- Cada página muestra su número.
- Cada producto publicado muestra precio de venta, descripción y beneficios.
- El cliente solamente puede visualizar; la interfaz no ofrece descarga, exportación ni edición.
- La visualización ocupa toda la pantalla disponible.
- Existe un modo bloqueado o tipo quiosco para que el cliente permanezca dentro del catálogo y no navegue al resto del POS.
- Para salir o desactivar el candado se identifica y valida a un usuario vigente. Conforme a la indicación recibida, puede hacerlo cualquier usuario válido; no se limita al master mientras no se solicite un cambio.
- En modo cliente sólo aparecen el catálogo y su índice. No se muestran el encabezado corporativo del POS, datos del usuario ni la leyenda visible `Catálogo bloqueado` de versiones anteriores.
- El libro se ajusta a la pantalla sin barras de desplazamiento externas.
- El cambio de página tiene transición visual de hoja/libro, no de lista vertical.
- Paginación e índice deben funcionar con mouse, pantalla táctil y teclado.
- Al cerrar el diseño se presentan cuatro referencias u opciones de catálogos lujosos en línea para elegir la dirección visual definitiva.
- La restricción de descarga implica que no existe acción o endpoint de exportación del libro para el cliente. No debe prometerse protección contra capturas de pantalla del sistema operativo.

## 4. Catálogo de Ventas y carrito

- En pantallas amplias, el catálogo de Ventas muestra cinco productos por fila.
- Las tarjetas son compactas en alto y ancho, manteniendo visibles imagen, tipo, nombre, SKU, precio, disponibilidad y acción para elegir.
- La cuadrícula reduce columnas de forma responsiva sin deformar tarjetas ni provocar desbordamiento horizontal.
- Los paneles laterales de exploración y carrito aprovechan el alto disponible de la ventana.
- El menú de familias/categorías y el carrito se dimensionan según la ventana, sin grandes espacios muertos ni controles fuera de los límites visibles.
- Los productos agregados al ticket se presentan como lista compacta, sin imagen.
- Cada renglón reduce su altura, pero conserva nombre, precio unitario, cantidad, subtotal y acción de edición.
- Los controles de cantidad, edición y el botón `Finalizar ticket` permanecen visibles cuando el flujo permite continuar.

## 5. Finalización de ticket y checkout

### 5.1 Ventana y navegación

- La ventana `Finalizar ticket` es compacta y cabe dentro del tamaño actual de la aplicación.
- El contenido se desplaza dentro de la ventana cuando es necesario; encabezado, pasos y acciones no quedan fuera de pantalla.
- El flujo conserva los segmentos Cliente, Vendedores, Citas y Cobro.
- Los botones para volver o continuar permanecen visibles.

### 5.2 Búsqueda y alta de clientes

- Al abrir la búsqueda no se muestra ningún nombre ni se precarga el listado completo.
- Las coincidencias sólo aparecen después de ingresar datos en nombre o teléfono.
- La consulta acepta coincidencias por ambos campos y limita la respuesta a resultados pertinentes.
- El backend no envía el directorio completo antes de existir un criterio de búsqueda.
- Al registrar un cliente, el calendario de nacimiento o cumpleaños permanece dentro de la ventana de registro; no se desborda ni queda detrás del modal.
- Los campos obligatorios configurados se validan antes de avanzar.

### 5.3 Vendedores

- La elección de vendedores usa una lista desplegable.
- Existe un filtro para localizarlos por nombre o alias.
- No se renderizan listados extensos sin búsqueda.
- La participación de varios vendedores no modifica por sí sola la propiedad de la cartera del cliente.

### 5.4 Cartera asignada a empresa

- Cuando la procedencia sea lead o redes sociales y la cartera esté asignada a la empresa, el cliente permanece ligado a la empresa aunque participen distintos vendedores.
- Esta condición se almacena como regla de propiedad, no sólo como mensaje informativo.
- El historial conserva quién atendió o vendió en cada operación sin transferir automáticamente la cartera.
- En cada ticket de una clienta de cartera empresarial, la empresa figura como participante obligatorio de la división de venta y recibe un importe o porcentaje explícito.
- La empresa utiliza un identificador comercial propio y estable; no se registra como empleado, no hace Clock In y no utiliza credenciales de vendedor.

### 5.5 Descuentos

- El descuento puede capturarse en pesos o porcentaje.
- La captura abre una ventana emergente legible, no un control estrecho dentro del carrito.
- Deben verse el valor ingresado, descuento monetario resultante, subtotal y total actualizado.
- Una acción con icono de paloma confirma, cierra la ventana y regresa al ticket.
- Cancelar no modifica el descuento previamente aplicado.
- El descuento máximo respeta el piso mínimo combinado.
- Los montos aceptan centavos y permiten quedar vacíos sin cero forzado.

### 5.6 Cobro

- Los campos de montos recibidos permiten borrar completamente el valor anterior sin insertar `0`.
- La suma de métodos de pago se valida contra el saldo.
- Los importes visibles coinciden con los enviados y con la impresión.
- La impresión depende del permiso explícito `Imprimir tickets`.

## 6. Cortesías de bienvenida

- Settings incluye configuración para paquetes o productos de cortesía.
- Existe un interruptor que determina si la cortesía es requerida durante checkout.
- Si es requerida, se elige un paquete habilitado y se solicitan fecha, sucursal y horario cuando correspondan; el flujo no continúa si faltan datos obligatorios.
- Si no es requerida, se omiten la pregunta y el mensaje del ticket y la venta continúa normalmente sin crear una cortesía implícita.
- La configuración identifica paquetes habilitados y paquete predeterminado.
- Los reintentos de red o doble envío no crean cortesías duplicadas.

## 7. Vouchers promocionales

- El voucher de regalo se genera después de finalizar o cortar el ticket, nunca antes de confirmar la venta.
- En la impresión sale primero el ticket y enseguida el voucher seleccionado.
- Si la clienta ya recibió la misma promoción, el sistema puede emitir otra sin perder ni sobrescribir la anterior.
- Cada emisión se registra en el historial del cliente para contar vouchers totales y por promoción.
- Cada emisión tiene folio único y relación con cliente, ticket, promoción, sucursal, usuario emisor, fecha, estado y eventos de impresión.
- Reintentar la impresión no crea una nueva emisión salvo confirmación expresa de un voucher adicional.
- El historial muestra emisiones repetidas de una misma promoción y su conteo.

## 8. Operación sin internet y sincronización

- El usuario puede acceder y crear tickets durante una intermitencia real de internet.
- El modo offline sólo se activa sin conexión; no se usa para evadir validaciones del servidor cuando hay conectividad.
- El acceso offline usa una credencial o sesión previamente habilitada y almacenada de forma segura en el dispositivo.
- Al iniciar sesión se muestra un mensaje emergente compacto:
  - Con internet: terminal conectada y sincronización activa.
  - Sin internet: modo offline y tickets pendientes.
- Los tickets offline se guardan localmente en una cola durable.
- Al recuperar internet, se sincronizan automáticamente con el sistema central.
- Cada ticket offline tiene identificador global idempotente para impedir duplicados.
- Estados mínimos: pendiente, sincronizando, sincronizado y error.
- Un error no borra el ticket local; permite reintento y muestra el motivo.
- Se conservan sucursal, terminal, usuario y hora original.
- La sincronización concilia pagos, inventario, citas, cortesías, vouchers y notificaciones asociados.
- La venta offline mantiene reglas locales de mínimos, permisos y datos obligatorios; el servidor revalida al recibirla y resuelve conflictos sin pérdida.

## 9. Inventario, bodega matriz y pedidos de sucursales

### 9.1 Separación funcional

- Inventory contiene áreas independientes para inventario operativo, almacén/bodega matriz y pedidos de sucursales.
- La bodega matriz tiene pedidos, movimientos y bandeja de solicitudes de sucursales propios.
- El inventario de sucursales conserva sus funciones para solicitar a bodega matriz.
- Aunque estén en ventanas distintas, solicitudes, pedidos, envíos, recepciones y movimientos permanecen conectados mediante los mismos identificadores.

### 9.2 Nombres y navegación finales

- `Inventario sucursales` fue sustituido por `Pedido sucursales`.
- Posteriormente se indicó intercambiar los nombres/posiciones visibles `Almacén matriz` y `Pedido sucursales` respecto de la captura proporcionada.
- El intercambio no rompe rutas: cada opción abre una ventana independiente y conserva función, permisos y datos correspondientes.
- `Catálogo` pertenece al menú de `Ventas`, conserva su pantalla independiente y deja de mostrarse dentro de Inventory.
- Orden de Inventory después del ajuste: `Inventario`, `Pedido sucursales`, `Almacén matriz`, `Proveedores`, `Movimientos`, `Paquetes y promociones`.

### 9.3 Generación de pedidos

- Las acciones de solicitud se ubican en `Generar pedido` dentro de Inventory.
- `Generar pedido` es una lista desplegable con las acciones actuales:
  - Solicitar productos.
  - Solicitar testers.
  - Solicitar insumos.
- Cada opción ejecuta su flujo real y genera una solicitud ligada a bodega matriz; no es sólo navegación.
- La solicitud guarda tipo, sucursal, líneas, cantidades, usuario, fecha, comentarios, estado y referencias a movimientos posteriores.
- Los estados son trazables de origen a destino.

### 9.4 Notificaciones

- Almacén matriz muestra una campana ante un nuevo pedido de sucursal.
- La notificación se genera una sola vez por evento, identifica pedido y sucursal y permanece hasta ser leída o atendida.
- La lectura se registra por usuario; no desaparece para todos porque una persona la abrió.

### 9.5 Acciones y presentación

- En inventario, editar, activar y desactivar se muestran sólo como iconos accesibles.
- Los registros son compactos sin perder información crítica.
- Filtros, selectores de sucursal y botones de exportación permanecen dentro del contenedor.

## 10. Usuarios, puestos, roles y permisos

### 10.1 Principios

- Los permisos dependen del puesto o rol, pero ninguna alta de usuario recibe permisos automáticos.
- La asignación efectiva requiere selección explícita y guardado autorizado.
- Un usuario sin permisos se muestra en rojo y genera una notificación visible en administración.
- No seleccionar permisos significa que el usuario no puede entrar a esos módulos; no significa acceso abierto.
- La autorización se aplica en backend y frontend.

### 10.2 Árbol de permisos

- Los menús se representan como árbol: módulo → menú → submenú → acción.
- Cada nodo permite seleccionar, según corresponda, visibilidad/consulta, edición e impresión de tickets.
- Cada segmento indica claramente si el permiso es de visualización o edición.
- Un permiso hijo no es efectivo si su padre no es visible.
- El portal sólo muestra módulos, submenús y acciones con casillas seleccionadas.
- Rutas y APIs no autorizadas se deniegan aunque se intente acceso directo.
- La matriz usa dos columnas cuando el espacio lo permite y se adapta responsivamente.
- La elección de usuario/vendedor usa lista desplegable con búsqueda.

### 10.3 Código master

- Asignar o modificar permisos requiere código master.
- El código nunca se almacena ni compara en texto plano en el frontend.
- El servidor valida secreto cifrado o hash, limita intentos y audita usos exitosos y fallidos.
- Cada autorización registra propósito, usuario afectado, autorizador, fecha y alcance.

## 11. Protección de costos

- Los costos sólo son visibles para usuario master por defecto.
- Puede habilitarse un interruptor para que un usuario o rol vea costos, pero requiere código master.
- Sin autorización, los costos no aparecen en Catálogo, Inventario, Almacén, Proveedores, reportes, paneles, Excel/PDF ni respuestas API.
- Ver costos y editar costos son permisos distintos.
- Cada consulta y exportación respeta el permiso vigente.
- Revocar acceso surte efecto en la siguiente consulta y oculta vistas sensibles activas.

## 12. Notificaciones por usuario

- La sección se muestra en dos columnas en pantallas amplias.
- La selección del vendedor/usuario es una lista desplegable, no una colección extensa de chips.
- Cada evento indica módulo de origen y si el permiso relacionado es de visualización o edición.
- Una notificación no debe abrir contenido para el que el receptor carece de permiso.
- Las preferencias aplican a eventos nuevos; el historial se conserva.
- Alertas y paneles son compactos.

## 13. Reportes

- Cada submenú abre una vista independiente.
- Incluye Detalle de ventas, Productos vendidos, Ventas por empleados, Movimientos de efectivo, Merchandise Reports, Employee Reports y Customer Reports.
- Los filtros avanzados se ajustan al ancho sin salir del contenedor.
- Fechas, vendedor, forma de pago, búsqueda, sucursales y comparación de periodo se reacomodan responsivamente.
- La búsqueda de vendedores usa filtro o selector buscable.
- Las descargas existentes conservan funciones y aplican permisos, sucursal, filtros y protección de costos.
- El catálogo digital para clientes es la excepción: no admite descarga.

## 14. Diseño, accesibilidad y comportamiento responsivo

- Los textos tienen contraste suficiente. En la tarjeta de avance del conteo, etiquetas, valores y porcentajes son negros; verde y rojo se reservan para barras de estado.
- En Ventas se muestran cinco tarjetas por fila en pantalla amplia y menos columnas en pantallas medianas o móviles.
- No existe desbordamiento horizontal causado por botones, filtros, calendarios, tablas o modales.
- Los modales compactos usan desplazamiento interno y conservan acciones visibles.
- Los iconos sin texto incluyen etiqueta accesible y tooltip.
- Los estados no dependen únicamente del color; incluyen texto, icono o etiqueta.
- El foco de teclado queda dentro del modal activo y vuelve al control de origen al cerrar.
- Selectores y calendarios respetan los límites de la ventana.
- La experiencia se prueba con escalado de pantalla y en Electron, no sólo en navegador de desarrollo.

## 15. Modelo de datos mínimo recomendado

La implementación puede adaptar nombres y normalización, pero debe representar estas relaciones sin perder trazabilidad.

### 15.1 Catálogo

- `products`: identidad, tipo, SKU, nombre, descripción, precios, IVA, imagen, publicación digital, estado y timestamps.
- `product_benefits`: producto, texto, orden y estado.
- `families`, `categories`, `groups` y sus relaciones con producto.
- `product_branch_visibility`: producto, sucursal y visibilidad.
- `product_price_history`: mínimos/listas anteriores y nuevos, usuario, autorización y fecha.

### 15.2 Inventario y almacén

- `branches` y `terminals`.
- `branch_inventory`: producto, sucursal, existencia, mínimo, máximo y versión de concurrencia.
- `inventory_movements` y `inventory_movement_lines`.
- `warehouse_requests`: folio, tipo PRODUCT/TESTER/SUPPLY, sucursal, estado, solicitante y fechas.
- `warehouse_request_lines`: artículo y cantidades solicitada, aprobada, enviada y recibida.
- `warehouse_request_events`: historial de estados.

### 15.3 Seguridad

- `users`, `roles` y `user_roles`.
- `permission_nodes`: árbol de módulos, menús, submenús y acciones.
- `role_permissions` y, si se requieren excepciones, `user_permission_overrides`.
- `master_authorizations`: propósito, autorizador, usuario afectado, entidad y fecha; nunca el código capturado.
- `notification_preferences`, `notifications` y `notification_reads`.

### 15.4 Ventas y operación offline

- `tickets`: folio global, sucursal, terminal, usuario, cliente, totales, IVA, descuento, origen online/offline, fecha original y estado de sincronización.
- `ticket_lines`: producto, nombre/SKU histórico, cantidad, precio vendido, mínimo protegido, autorización y paquete.
- `payments`: ticket, método, monto y referencia.
- `offline_operations`: UUID idempotente, tipo, payload cifrado, intentos, estado y último error.
- `sync_events`: recepción, validación, aceptación o conflicto.

### 15.5 Clientes, cortesías y vouchers

- `customers`: identidad, contacto, nacimiento, procedencia y estado.
- `customer_portfolio_assignments`: propietario empresa/vendedor, origen, vigencia e historial.
- `courtesy_settings`, `courtesy_packages` y `courtesy_appointments`.
- `voucher_templates`, `voucher_issues` y `voucher_print_events`.

### 15.6 Auditoría

- `audit_log`: actor, rol, sucursal, terminal, acción, entidad, identificador, valores anteriores/nuevos, autorización y fecha.
- Auditoría y documentos históricos no se borran físicamente al desactivar catálogo o usuario.

## 16. Procesos transaccionales obligatorios

### 16.1 Actualizar precio

1. Validar permiso de edición y, cuando aplique, código master.
2. Validar números, dos decimales, valores mayores a cero y máximo/lista mayor o igual al mínimo.
3. Guardar producto e historial de precio en una transacción.
4. Invalidar cachés de Ventas, Inventario y Catálogo digital.
5. Sincronizar carritos activos según la sección 2.2.
6. No modificar tickets históricos.

### 16.2 Crear ticket offline

1. Confirmar falta real de conexión y sesión offline autorizada.
2. Ejecutar localmente permisos, mínimos, descuentos y campos obligatorios.
3. Generar UUID idempotente y persistir antes de mostrar éxito.
4. Crear movimientos dependientes en la misma unidad local.
5. Marcar pendiente y mostrar estado offline.
6. Al reconectar, enviar, revalidar y confirmar sin duplicar.

### 16.3 Pedido de sucursal

1. Usuario autorizado elige Productos, Testers o Insumos desde `Generar pedido`.
2. Backend crea pedido y líneas con folio único.
3. Se notifica a los usuarios de almacén matriz.
4. Aprobación, envío y recepción agregan eventos y movimientos sin reemplazar historial.
5. Las existencias se actualizan transaccionalmente en el punto correcto del flujo.

### 16.4 Guardar permisos

1. El administrador captura la matriz explícita.
2. El servidor valida código master y coherencia padre/hijo.
3. Guarda permisos y auditoría en una transacción.
4. Invalida sesión o caché de permisos afectada.
5. El portal se reconstruye sólo con módulos y acciones autorizados.

### 16.5 Finalizar ticket con voucher

1. Validar cliente, vendedores, citas/cortesías, descuento y cobro.
2. Confirmar ticket, pagos y movimientos en una transacción.
3. Crear emisión ligada al ticket cuando se elija voucher.
4. Registrar en historial aunque exista la misma promoción.
5. Imprimir ticket y después voucher.
6. Reimpresión reutiliza la emisión y no crea otra automáticamente.

## 17. APIs y seguridad esperadas

- Búsquedas de clientes y vendedores aceptan criterio, paginación y límite; no devuelven el catálogo completo antes de buscar.
- APIs de costos filtran campos antes de serializar.
- APIs de reportes y exportación repiten comprobaciones de permisos.
- Endpoints mutables aceptan clave idempotente para tickets, pedidos, vouchers y operaciones offline.
- Actualizaciones de inventario y precio usan control de concurrencia.
- Secretos master permanecen en servidor con hash seguro, caducidad de autorización y límite de intentos.
- Archivos e imágenes se validan por tipo, tamaño y ubicación; Electron no depende de rutas absolutas de desarrollo.

## 18. Criterios de aceptación

- [ ] Un producto publicado no se guarda sin descripción y beneficios.
- [ ] El precio máximo/lista nunca queda debajo del mínimo.
- [ ] Borrar un monto deja el campo vacío durante la edición.
- [ ] Catálogo, carrito y ventana de venta muestran el mismo precio vigente.
- [ ] Los tickets históricos no cambian al editar catálogo.
- [ ] El catálogo digital abre a pantalla completa, con índice, páginas numeradas, efecto libro y sin descarga.
- [ ] El modo bloqueado impide entrar al POS hasta validar un usuario.
- [ ] Ventas muestra cinco productos por fila en pantalla amplia sin desbordamiento.
- [ ] El carrito muestra líneas compactas sin imágenes.
- [ ] Finalizar ticket cabe en la ventana y mantiene acciones visibles.
- [ ] La búsqueda de cliente inicia vacía y consulta tras ingresar nombre o teléfono.
- [ ] El selector de cumpleaños permanece dentro del modal y permite elegir directamente el mes y el año sin recorrerlos uno por uno.
- [ ] Vendedores se buscan mediante filtro/lista desplegable.
- [ ] El descuento muestra importe y total en modal y sólo se aplica al aceptar.
- [ ] Desactivar cortesía omite la pregunta y permite continuar normalmente.
- [ ] El ticket se imprime antes del voucher.
- [ ] Vouchers repetidos aparecen separados en el historial del cliente.
- [ ] Sin internet se puede iniciar sesión autorizada y vender.
- [ ] Al reconectar se sincronizan pendientes sin duplicados.
- [ ] `Generar pedido` ofrece Productos, Testers e Insumos y notifica a almacén matriz.
- [ ] Cada submenú de Inventario y Reportes abre una vista independiente.
- [ ] Un usuario nuevo no recibe permisos automáticos y aparece en rojo sin permisos.
- [ ] El árbol de permisos controla visibilidad, edición e impresión.
- [ ] Sin autorización master los costos no aparecen en UI, API ni exportaciones.
- [ ] Botones, filtros, calendarios y modales permanecen dentro de pantalla.
- [ ] Editar, borrar, eliminar, activar y desactivar usan iconos accesibles.
- [ ] Las imágenes funcionan en navegador y Electron y tienen sustituto ante error.

## 19. Decisiones para migrar desde el mock

- El estado temporal o `localStorage` de la demo no sustituye persistencia real.
- La cola offline debe migrarse a almacenamiento durable y cifrado con reconciliación de servidor.
- Las comprobaciones de código master del cliente deben sustituirse por autorización segura del backend.
- Las notificaciones son eventos persistentes con lectura por usuario.
- Los permisos determinan tanto lo que se dibuja como lo que la API permite.
- La paridad final se prueba en Electron con el flujo completo, no únicamente mediante compilación web.

## 20. Clock In y registro de salida

- Clock In funciona como control de asistencia independiente de la sesión del operador del POS.
- Cada vendedor se identifica mediante su código personal antes de registrar un movimiento de asistencia.
- Si el vendedor no tiene una entrada activa, se muestra la selección de sucursal y únicamente la acción `Registrar entrada`.
- Si el vendedor ya registró entrada y continúa ONLINE, después de identificarlo se ocultan la selección de sucursal y la acción de entrada; únicamente se muestra `Registrar salida`.
- La lista de personal ONLINE es informativa. No debe permitir que otra persona registre la salida de un vendedor sin identificarse con el código correspondiente.
- Al registrar salida se guardan la hora local e ISO, el vendedor, la sucursal, la entrada relacionada, la duración, el estado OFFLINE y el motivo `MANUAL`.
- Una entrada sólo puede tener una salida. Los reintentos o dobles clics deben ser idempotentes.
- Después de una salida correcta, el código se limpia, el vendedor desaparece del listado ONLINE y la bitácora del día muestra entrada, salida, duración, estado y tipo de cierre.
- Close Day puede cerrar entradas aún activas con motivo `CLOSE_DAY`; ese cierre debe distinguirse de una salida manual.
- La base de datos debe conservar una relación única entre vendedor y asistencia abierta para impedir dos entradas ONLINE simultáneas.
- Criterios de aceptación adicionales:
  - [ ] Un vendedor sin entrada ve `Registrar entrada` y selector de sucursal.
  - [ ] Un vendedor ONLINE, después de capturar su código, sólo ve `Registrar salida`.
  - [ ] Ninguna tarjeta pública del listado ONLINE permite cerrar la asistencia de otra persona.
  - [ ] Registrar salida completa el mismo registro de asistencia y no crea una segunda entrada.

## 21. Membresías, tarjetones y consumo desde Agenda

### 21.1 Configuración del producto

- `Membresía` es un tipo de producto distinto de mercancía y servicio individual.
- Al crear o editar una membresía se debe capturar obligatoriamente un número entero de sesiones mayor a cero.
- La membresía no maneja existencias físicas ni genera salidas de inventario.
- El SKU automático usa prefijo `MEM`; precio mínimo, precio de lista, IVA, visibilidad y sucursales siguen las validaciones del catálogo.
- Modificar las sesiones del producto sólo afecta ventas futuras. Los tarjetones vendidos conservan la cantidad contratada originalmente.

### 21.2 Generación por venta

- Cada unidad de membresía cobrada genera un tarjetón independiente con folio único.
- Si una clienta compra dos membresías, incluso iguales o en el mismo ticket, se crean dos registros separados.
- El tarjetón guarda una fotografía inmutable de cliente, producto, sesiones, importe, ticket, fecha, sucursal, vendedor original y vendedor actual.
- Una venta pendiente o apartado no debe activar sesiones hasta cumplir la regla financiera que defina el backend; la implementación debe registrar explícitamente el momento de activación.
- El alta de ticket y de tarjetones debe ejecutarse en una transacción e incluir una clave idempotente para no duplicar membresías al reintentar una venta offline.

### 21.3 Agenda, asistencia y saldo

- Agendar una cita no descuenta una sesión.
- La sesión se descuenta únicamente al confirmar que la clienta asistió a una cita vinculada.
- La cita, membresía, consumo y usuario que confirma deben quedar relacionados de forma auditable.
- Una cita no puede consumir dos veces la misma sesión y el saldo nunca puede quedar negativo.
- Cuando se consume la última sesión, el estado cambia automáticamente de `ACTIVE` a `EXHAUSTED` y se registra el cambio de estado.
- Cada asistencia conserva fecha/hora, sucursal, vendedor u operador, cita, terminal y estado de firma.
- La firma táctil es una etapa futura; desde ahora el modelo reserva estado `PENDING`, `SIGNED` o `NOT_REQUIRED` y deberá admitir evidencia cifrada, consentimiento y trazabilidad.

### 21.4 Módulo protegido de Membresías

- El módulo sólo aparece en el portal cuando el rol tiene permiso de visibilidad; editar perfilamiento, confirmar asistencias e imprimir exige permiso de edición o impresión según la acción.
- Después de entrar al sistema, un usuario no master debe volver a identificarse en el módulo con su código personal vigente. El código identifica el alcance y nunca permite seleccionar manualmente otra cartera.
- Cada vendedor sólo puede consultar las membresías cuyo `seller_id` actual le pertenece, incluyendo sus clientas, saldos, tarjetones, incidencias, asistencias, tickets y trazabilidad. Los totales, alertas, rankings, filtros y búsquedas se calculan sobre ese mismo alcance; no basta con ocultar filas en la interfaz.
- El usuario master, autenticado con su cuenta y código master, puede consultar todas las membresías, clientas, vendedores, sucursales e historiales sin quedar limitado a una cartera.
- El backend debe aplicar el alcance desde la consulta usando la identidad autenticada. Nunca debe aceptar un `seller_id` enviado por el navegador como autorización suficiente ni devolver registros de otra cartera para filtrarlos en el renderer.
- Al bloquear el acceso, cerrar sesión, cambiar de usuario o perder la autorización, se descartan el código capturado, la selección abierta y los datos sensibles visibles.
- El módulo ofrece descargas en Excel y PDF. Ambas respetan la cartera autorizada y los filtros activos; el nombre del archivo y el encabezado identifican si el alcance es global master o personal.
- Excel incluye una hoja de membresías, otra de asistencias y otra de trazabilidad. PDF entrega un resumen operativo con folio, clienta, membresía, compra, sucursal, vendedor, saldo, incidencias, perfil, estado e importe.
- Cada descarga debe registrar usuario solicitante, fecha, filtros y alcance. Ningún vendedor puede obtener información global o de otro vendedor manipulando parámetros de exportación.
- El dashboard muestra membresías activas, sesiones disponibles, porcentaje utilizado, venta acumulada, alertas próximas a terminar, mejores clientas y membresía con menor venta.
- El Dashboard general incluye un reporte ejecutivo compacto de membresías con venta acumulada, tarjetas activas, sesiones disponibles, alertas de renovación, sucursal líder, vendedor líder y podio del último mes cerrado.
- El reporte del Dashboard general respeta el alcance seleccionado (`todas las sucursales` o una sucursal específica) y sólo aparece si el usuario tiene acceso al módulo de Membresías.
- El análisis comercial permite consultar por mes y por año la sucursal con más ventas de membresías, el vendedor con más membresías y el importe vendido.
- La venta se acredita al vendedor original del ticket. Un cambio posterior de vendedor para seguimiento no modifica el historial ni el ranking comercial.
- El historial mensual muestra ventas, importe y vendedor líder de cada mes; el historial anual muestra los mismos indicadores acumulados por año.
- Al cerrar cada mes se genera automáticamente el podio de los tres mejores vendedores de membresías. El orden usa primero cantidad de membresías y, en caso de empate, mayor importe vendido.
- Las membresías canceladas o anuladas no suman a ventas ni rankings. Cualquier ajuste posterior al cierre debe conservar auditoría y generar una nueva versión del resultado, sin sobrescribir silenciosamente el cierre original.
- Los filtros incluyen cliente/teléfono/folio/ticket, tipo de membresía, rango de fechas y sucursal.
- Los registros se muestran por compra y por fecha; no se fusionan aunque pertenezcan a la misma clienta.
- Al abrir un registro se muestra el tarjetón personalizado, saldo, casillas de asistencia, ticket de compra, sucursal, vendedor, perfilamiento e historiales.
- `Ir al ticket` abre el ticket histórico en el día y sucursal de la venta sin alterar sus datos.
- El perfilamiento comercial es editable y contempla al menos `POTENTIAL`, `LOYAL`, `VIP` y `RECOVERY`.
- Los cambios de vendedor y de estado se guardan como eventos con valor anterior, valor nuevo, motivo, fecha y usuario responsable.
- La alerta de renovación se activa cuando quedan dos sesiones o menos; el umbral debe ser configurable en backend.

### 21.5 Persistencia recomendada

- `membership_products`: producto, versión de condiciones, sesiones configuradas y vigencia.
- `client_memberships`: folio, cliente, ticket, línea de ticket, producto, sesiones contratadas/usadas, importe, sucursal, vendedor original/actual, perfil y estado.
- `membership_attendance`: membresía, número de sesión, cita, fecha, sucursal, operador, terminal y estado/evidencia de firma.
- `membership_seller_changes` y `membership_status_changes`: bitácoras inmutables de transición.
- `membership_sales_closures`: periodo, fecha de cierre, alcance por sucursal/empresa, totales y versión del cálculo.
- `membership_seller_rankings`: cierre, posición, vendedor original, cantidad, importe y reglas de desempate aplicadas.
- Restricciones mínimas: folio único; una membresía por unidad vendida; consumo único por cita; `used_sessions <= total_sessions`; actualización de saldo con bloqueo transaccional.

### 21.6 Criterios de aceptación

- [ ] El alta de una membresía no se guarda sin sesiones enteras mayores a cero.
- [ ] Cada unidad vendida crea su propio tarjetón y conserva las condiciones originales.
- [ ] Varias compras de una clienta aparecen separadas por membresía y fecha.
- [ ] Confirmar asistencia desde una cita reduce exactamente una sesión.
- [ ] Agendar, reprogramar o cancelar una cita sin asistencia no reduce saldo.
- [ ] Con dos sesiones o menos aparece una alerta de renovación.
- [ ] El saldo cero cambia la membresía a agotada y registra el evento.
- [ ] El botón de ticket abre la compra histórica correspondiente.
- [ ] Vendedor original, cambios de vendedor y cambios de estado son visibles y auditables.
- [ ] Un rol sin permiso no ve el módulo ni puede consultar sus APIs.
- [ ] Un vendedor con permiso debe ingresar su propio código personal antes de visualizar información.
- [ ] El código de otro vendedor no abre ni cambia la cartera de la sesión actual.
- [ ] Un vendedor sólo ve y descarga clientas, tarjetones, indicadores e historial asociados a su `seller_id`.
- [ ] El usuario master ve y descarga el consolidado completo de todas las carteras.
- [ ] PDF y Excel respetan los filtros activos y el mismo alcance aplicado en pantalla.
- [ ] El análisis mensual identifica la sucursal y el vendedor con más membresías vendidas en el mes seleccionado.
- [ ] El análisis anual acumula ventas e importes sin perder el detalle mensual.
- [ ] Cambiar al vendedor de seguimiento no altera quién recibió el crédito de la venta histórica.
- [ ] Al terminar el mes se muestran los tres mejores vendedores, ordenados por cantidad y después por importe.
- [ ] Una membresía cancelada no suma a los indicadores ni al podio.
- [ ] El reporte de Membresías del Dashboard general se recalcula al cambiar el alcance de empresa a sucursal.
- [ ] Un usuario sin permiso de Membresías no ve el reporte ejecutivo ni obtiene sus datos desde la API.

## 22. Integración con Agenda, próxima cita y cabinas

### 22.1 Contrato de disponibilidad

- El POS consume la disponibilidad del CRM de Agenda mediante identificadores externos estables de calendario, espacio y horario.
- Cada espacio debe informar como mínimo: sucursal, fecha, inicio, fin, cabina, tipo de cabina (`INDIVIDUAL` o `DOUBLE`), capacidad, lugares ocupados y estado.
- El vendedor sólo puede ver y elegir horarios `AVAILABLE` o `CANCELLED` que todavía tengan capacidad. Los horarios `BOOKED` o `BLOCKED` nunca se muestran como seleccionables.
- Un horario cancelado se considera nuevamente disponible, pero la cancelación original permanece en el historial. La nueva cita crea una reservación distinta y no sobrescribe el evento cancelado.
- La disponibilidad mostrada es informativa. Al confirmar, el backend debe volver a validar el horario y reservarlo de forma atómica para evitar sobreventa por operaciones simultáneas.
- La reservación usa clave idempotente. Un reintento no puede crear dos citas ni consumir dos lugares.
- Si otro usuario ocupa el último lugar antes de confirmar, el POS informa el conflicto, actualiza la disponibilidad y no finaliza silenciosamente con un horario inválido.

### 22.2 Próxima cita de una clienta con membresía

- Confirmar la asistencia descuenta exactamente una sesión y, en ese momento, abre la opción para agendar la próxima sesión.
- La clienta puede elegir cualquier fecha futura, sucursal y horario que el CRM reporte como disponible; no se limita al día, hora o sucursal de la cita atendida.
- La nueva cita se liga al cliente, al tarjetón de membresía y al identificador externo del espacio elegido.
- Agendar la próxima cita no descuenta otra sesión. El siguiente descuento ocurre únicamente al confirmar la asistencia de esa nueva cita.
- Si la clienta no desea agendar en ese momento, el flujo permite cerrar sin cita y conserva el saldo correcto.
- Cuando la membresía quede agotada después de la asistencia, no se debe crear una nueva cita cubierta por esa membresía sin una renovación o autorización expresa.

### 22.3 Cortesía de dos servicios

- Cuando el paquete de cortesía incluye dos servicios, el vendedor debe elegir uno de dos modos:
  - `Misma hora · cabina doble`: crea dos citas en el mismo horario y cabina `DOUBLE`; la cabina debe tener al menos dos lugares libres y la confirmación reserva ambos de forma atómica.
  - `Dos horarios consecutivos`: crea dos citas contiguas en la misma fecha, sucursal y cabina; el fin del primer horario debe coincidir con el inicio del segundo.
- En modo simultáneo no se ofrecen cabinas individuales aunque existan dos cabinas distintas libres. La intención es atender los dos servicios juntos en una cabina doble.
- En modo consecutivo se permiten cabinas individuales o dobles siempre que ambos horarios consecutivos estén disponibles en la misma cabina.
- El ticket y el historial conservan el modo elegido, los dos identificadores de horario, la cabina y la sucursal.
- Si falla cualquiera de las dos reservas, se rechaza toda la operación; nunca debe quedar una cortesía doble reservada parcialmente.

### 22.4 Persistencia e integración recomendada

- `agenda_resources`: identificador externo, sucursal, nombre, tipo de cabina, capacidad y estado.
- `agenda_slots`: identificador externo, recurso, inicio, fin, capacidad, ocupación, estado, versión y fecha de sincronización.
- `agenda_reservations`: cita local, cita externa, cliente, membresía o cortesía, modo de reservación, estado y clave idempotente.
- `agenda_sync_events`: operación, sistema origen, versión, payload normalizado, resultado, conflicto y fecha para conciliación.
- La API de disponibilidad debe permitir filtrar por sucursal y rango de fechas. La API de reserva debe aceptar uno o varios espacios como una sola unidad transaccional.
- El CRM es la fuente operativa de disponibilidad; el POS conserva los identificadores y una fotografía de la selección para auditoría y funcionamiento controlado ante intermitencia.

### 22.5 Criterios de aceptación

- [ ] Después de confirmar una asistencia de membresía aparece la opción de agendar la próxima sesión.
- [ ] La próxima sesión puede elegirse en cualquier fecha, sucursal y horario disponible.
- [ ] Agendar la próxima sesión no consume saldo hasta confirmar su asistencia.
- [ ] Sólo se muestran horarios disponibles o liberados por cancelación con capacidad vigente.
- [ ] Una cancelación conserva su historial y una nueva cita recibe un identificador distinto.
- [ ] La cortesía doble simultánea sólo muestra cabinas dobles con dos lugares libres.
- [ ] La cortesía consecutiva sólo muestra pares contiguos dentro de la misma cabina.
- [ ] Reservar una cortesía doble ocupa dos lugares o dos horarios en una sola operación atómica.
- [ ] Un conflicto de capacidad impide terminar la reservación y solicita elegir otro espacio.

## 23. Dashboard general: conteos de inventario por sucursal

- El alcance superior del `Dashboard de jornada` es la fuente de verdad para todos sus indicadores y reportes, incluido `Conteo y trazabilidad de inventario`.
- Al elegir una sucursal, el reporte usa exclusivamente el conteo de apertura, movimientos, existencia real y conteo final de esa tienda. Nunca sustituye datos faltantes con información de Polanco u otra sucursal.
- Al elegir `General · todas las sucursales`, el reporte conserva los totales generales y habilita un selector interno para revisar una tienda a la vez; las líneas de inventario no se suman entre tiendas porque cada existencia pertenece a una ubicación distinta.
- El selector interno sólo está disponible para usuarios con alcance multi-sucursal autorizado. Un usuario limitado permanece fijado a su sucursal.
- Si una tienda no tiene conteo de apertura o final en la jornada seleccionada, la interfaz lo indica explícitamente y no inventa, copia ni infiere un conteo.
- El resumen general muestra cuántas sucursales registraron apertura, cuántas registraron conteo final y cuántos productos tienen diferencias en todas las tiendas con información disponible.
- `Excel errores` y `PDF errores` descargan los errores de la tienda visible. En alcance general, `Excel general` y `PDF general` generan el consolidado de errores de todas las sucursales.
- Cada renglón exportado incluye sucursal, producto, SKU, conteo y diferencia de apertura, movimientos, existencia esperada, existencia real, conteo final y diferencia final/actual.
- Costos e impacto monetario sólo se agregan a la pantalla y a las descargas cuando la autorización master de costos está vigente; ocultarlos en la interfaz no sustituye el filtrado de la API.
- Los reportes generales sólo incluyen sucursales que el usuario puede consultar. El backend debe volver a validar alcance y permiso al consultar o descargar.
- La descarga no modifica conteos: genera un documento de revisión/reconteo y conserva fecha, alcance, usuario solicitante y filtros para auditoría.

### 23.1 Criterios de aceptación

- [ ] Cambiar el alcance superior a una tienda recalcula la tabla con datos de esa misma tienda.
- [ ] En alcance general aparece el selector interno y permite alternar sucursales sin mezclar existencias.
- [ ] Una sucursal sin apertura muestra estado vacío y nunca enseña las líneas de Polanco.
- [ ] El estado distingue apertura registrada, conteo final registrado y conteo final pendiente.
- [ ] Excel y PDF por tienda contienen sólo errores de la sucursal seleccionada e identifican su nombre.
- [ ] Excel y PDF generales contienen los errores de todas las sucursales autorizadas e identifican la sucursal en cada renglón.
- [ ] Un usuario sin autorización de diferencias o costos no obtiene esos campos mediante UI, API ni descarga.

## 24. Identidad única de cliente y sincronización completa con Agenda

- El cliente es la entidad raíz para cualquier cita, facial de cortesía, membresía, asistencia o próxima sesión. Todas las relaciones usan `client_id`; el nombre o teléfono sólo son datos descriptivos y nunca sustituyen el identificador.
- Al registrar una clienta nueva con horario seleccionado, el POS crea o actualiza primero su ficha en Agenda y recibe `external_client_id`. Después reserva el horario y conserva `external_reservation_id` y `external_appointment_id` antes de confirmar el ticket.
- La cita llega a Agenda con nombre completo, teléfono, sucursal, servicio, recurso/cabina, fecha, horario, ticket, vendedores, origen (`COURTESY`, `NEXT_SESSION` o `MEMBERSHIP`) y clave idempotente.
- Si Agenda rechaza el horario o no puede registrar a la clienta mientras hay conexión, el ticket no se crea y ninguna sesión se descuenta. La interfaz conserva los datos para que el usuario elija otro horario o reintente.
- En modo sin conexión, cliente, cita y membresía se guardan con estado `PENDING_SYNC`. La cola debe sincronizar en orden: cliente, membresía, reservación y movimientos; un reintento reutiliza las mismas claves idempotentes.
- Una membresía comprada conserva `client_id`, `external_client_id`, `external_membership_id`, ticket, sucursal y vendedor. Cada cita de membresía incluye además el identificador del tarjetón.
- Confirmar asistencia informa primero a Agenda cuando existe conexión y sólo después descuenta una sesión. El consumo guarda `external_appointment_id`; si Agenda falla, el saldo permanece intacto.
- Cancelar un ticket cancela las reservaciones relacionadas en Agenda, libera la capacidad y conserva las citas locales como `CANCELLED`; no se eliminan del historial.
- Editar nombre o teléfono de una clienta vinculada actualiza la ficha raíz de Agenda y propaga la presentación local a citas, membresías, apartados y adeudos, sin cambiar sus identificadores históricos.
- Las cortesías dobles conservan una sola reservación transaccional y dos citas externas. Cancelar o confirmar debe tratar todos sus lugares como una unidad para evitar movimientos parciales.
- La integración real reemplazará el adaptador de demostración por un adaptador HTTP autenticado sin cambiar el contrato del dominio del POS.

### 24.1 Eventos y conciliación esperados

- Eventos salientes mínimos: `CLIENT_UPSERTED`, `APPOINTMENT_RESERVED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_ATTENDED`, `MEMBERSHIP_LINKED`, `MEMBERSHIP_SESSION_CONSUMED` y `MEMBERSHIP_STATUS_CHANGED`.
- Cada evento guarda identificador local y externo, clienta, fecha ISO, sucursal, usuario, terminal, versión, intento, resultado y error.
- Webhooks de Agenda deben conciliar reprogramaciones, cancelaciones, asistencia y cambios de cabina sin sobrescribir la bitácora original.
- Si Agenda y POS difieren, el registro entra a una cola visible de conciliación; no se corrige silenciosamente ni se duplica la cita.
- Datos personales y credenciales de Agenda se protegen en backend. El renderer de Electron nunca conserva tokens del CRM.

### 24.2 Criterios de aceptación

- [ ] Crear clienta con cita genera una ficha única en Agenda y deja el horario como reservado con su nombre.
- [ ] La cita local conserva identificadores de clienta, reservación y cita externa.
- [ ] Una cortesía está ligada al cliente, ticket y reservación de Agenda.
- [ ] Cada tarjetón de membresía conserva el vínculo con la ficha de Agenda de la clienta.
- [ ] Una próxima sesión creada desde Membresías aparece reservada en Agenda y ligada al tarjetón correcto.
- [ ] Confirmar asistencia actualiza Agenda y descuenta exactamente una sesión; ante error no descuenta.
- [ ] Cancelar el ticket libera la capacidad, cancela Agenda y conserva el registro histórico como cancelado.
- [ ] Editar nombre o teléfono actualiza la ficha vinculada sin crear otra clienta.
- [ ] Los reintentos online u offline no duplican clientas, citas, cortesías ni membresías.

### 24.3 Resultado de la cita y avance del tarjetón

- Agenda es la fuente del resultado operativo de una cita vinculada y envía `ATTENDED`, `CANCELLED` o `NO_SHOW` con `external_appointment_id`, fecha de actualización y versión.
- Sólo `ATTENDED` consume exactamente una sesión y marca una casilla del tarjetón. El consumo es idempotente: recibir dos veces el mismo resultado no descuenta dos sesiones.
- Una cita de cortesía nunca consume una membresía. Para descontar saldo, la cita debe incluir explícitamente el `membership_id` del tarjetón correspondiente.
- `CANCELLED` y `NO_SHOW` no consumen sesiones, no marcan casillas y no cambian `used_sessions`; se conservan como incidencias en el historial de Agenda.
- Las incidencias se contabilizan por tarjetón. Desde la segunda cancelación o inasistencia, el tarjetón cambia a un tono de advertencia y muestra un contador pequeño para detectar que la clienta no está avanzando.
- El detalle separa el número de cancelaciones y de inasistencias y explica expresamente que no afectaron el saldo.
- Una cancelación libera la capacidad de la agenda. Una inasistencia conserva el resultado histórico del horario y genera seguimiento comercial.
- Un estado `ATTENDED` ya aplicado no puede cambiarse automáticamente a cancelación o inasistencia. Una corrección posterior requiere autorización, motivo y un movimiento compensatorio auditable de la sesión.
- El POS consulta resultados nuevos de Agenda periódicamente. Si la consulta falla, no modifica saldos y vuelve a intentar en la siguiente sincronización.

### 24.4 Criterios de aceptación del resultado

- [ ] Agenda marca `ATTENDED` y el tarjetón descuenta una sola sesión.
- [ ] Repetir el mismo evento `ATTENDED` no vuelve a descontar.
- [ ] Agenda marca `CANCELLED` y el saldo y las casillas permanecen iguales.
- [ ] Agenda marca `NO_SHOW` y el saldo y las casillas permanecen iguales.
- [ ] Una cortesía sin `membership_id` no aparece como sesión consumible del tarjetón.
- [ ] Dos o más incidencias activan tono de advertencia y contador visible.
- [ ] El detalle muestra por separado cancelaciones e inasistencias.
- [ ] Corregir una asistencia ya consumida exige autorización y conserva la bitácora.

## 25. Escalabilidad multi-sucursal: de 1 a 30 ubicaciones

- Todo el POS debe funcionar con una sola sucursal o con 10, 20 y 30 sucursales activas sin cambios de código, listas estáticas ni máximos visuales implícitos.
- La colección de sucursales autorizadas que entrega el backend es la fuente de verdad. Ninguna pantalla puede asumir que siempre existen Polanco, Satélite o Roma Norte.
- Los selectores compactos usan una lista desplegable con desplazamiento vertical. Los grupos visibles de sucursales, tarjetas y métricas crean tantas filas como sean necesarias y hacen crecer la página hacia abajo.
- Ventanas, paneles y reportes conservan desplazamiento vertical hasta el último registro y sus acciones. Ningún botón, filtro, subtotal, pie de reporte o mensaje puede quedar recortado por una altura fija.
- Una tabla ancha puede tener desplazamiento horizontal propio, pero el reporte completo siempre crece verticalmente y permanece dentro del ancho de su contenedor.
- `Todas las sucursales` incluye todas las ubicaciones activas que el usuario tiene autorizadas; no equivale a las primeras tres ni a un subconjunto precargado.
- Un usuario limitado sólo recibe sus sucursales autorizadas desde la API. Ocultar una sucursal en la interfaz no sustituye el filtro y la validación del backend.
- Dashboard, ventas, inventario, conteos, almacén, caja, asistencia, membresías, clientes, citas y reportes deben recalcular sus datos al cambiar de sucursal o elegir el alcance general.
- Las descargas PDF y Excel respetan el mismo alcance visible. En modo general incluyen todas las sucursales autorizadas e identifican la sucursal en cada renglón, hoja o sección.
- La paginación puede aplicarse a los registros de cada reporte, pero nunca debe truncar silenciosamente el conjunto de sucursales. Los totales y agregados se calculan en backend sobre el alcance completo, no sólo sobre la página visible.
- Al agregar o activar una ubicación, ésta aparece en todos los módulos dependientes sin reinstalar el POS. Al desactivarla se conserva el historial y deja de aceptar movimientos nuevos.
- La empresa debe conservar por lo menos una sucursal operativa. Altas, activaciones y desactivaciones guardan usuario, fecha, motivo y autorización para auditoría.
- La demostración local admite `?branchDemo=30` para validar la presentación con 30 sucursales sin alterar los datos normales ni habilitar esa generación en producción.

### 25.1 Criterios de aceptación multi-sucursal

- [ ] Con 1, 10, 20 y 30 sucursales no existen controles, nombres, filtros ni botones cortados o superpuestos.
- [ ] Los grupos de sucursales envuelven a nuevas filas y aumentan la altura de la vista; no obligan a recorrer una tira horizontal.
- [ ] Los desplegables permiten llegar a la última sucursal mediante desplazamiento y teclado.
- [ ] Los paneles y diálogos permiten desplazarse verticalmente hasta su última acción.
- [ ] El dashboard general cuenta exactamente todas las sucursales autorizadas y permite abrir la información de cada una.
- [ ] Los reportes generales incluyen las 30 sucursales cuando las 30 están autorizadas, sin topes ni sustitución por datos de otra ubicación.
- [ ] PDF y Excel conservan filtros, totales e identificación de sucursal para todo el alcance solicitado.
- [ ] Dar de alta la sucursal número 30 la incorpora a catálogo, inventario, pedidos, agenda, clientes, membresías, caja y reportes.

## 26. Matriz obligatoria de alcance por sucursal

### 26.1 Regla transversal

- Todo selector obtiene sus opciones de las sucursales activas y autorizadas que entrega el backend; no se aceptan catálogos de tiendas escritos directamente en el frontend.
- `Todas las sucursales` significa la unión exacta de las ubicaciones autorizadas para el usuario. No debe incluir sucursales inactivas, ajenas, históricas o descubiertas accidentalmente dentro de tickets y movimientos.
- Cambiar el alcance recalcula en una sola operación indicadores, gráficas, tablas, contadores, estados vacíos, paginación y descargas. Una pantalla no puede mostrar el indicador de una tienda y el detalle de otra.
- Si la sucursal seleccionada se desactiva o deja de estar autorizada, el selector vuelve a `Todas` cuando existe alcance multi-sucursal o a la sucursal fija de la sesión; nunca conserva un valor invisible.
- Los registros históricos de una sucursal desactivada se conservan, pero sólo se consultan mediante un permiso histórico explícito. No vuelven a aparecer como opción operativa ni aceptan movimientos nuevos.
- El frontend evita cruces accidentales, pero cada consulta y descarga del backend debe recibir y validar `authorized_branch_ids`, `branch_id` o `all_authorized`; nunca debe confiar únicamente en el valor enviado por el navegador.

### 26.2 Comportamiento por módulo y submenú

| Módulo o submenú | Alcance esperado |
| --- | --- |
| Dashboard de jornada | Master: `Todas` o una sucursal. Usuario operativo: sucursal fija. El alcance gobierna ventas, cobros, gastos, vendedores, servicios, citas, membresías, movimientos y conteos. |
| Sale / catálogo de venta | Usa la sucursal activa de la terminal para disponibilidad, existencias, ticket y descuento de inventario. Cambiar ubicación exige el flujo autorizado de cambio de sucursal. |
| Mis ventas | Muestra únicamente la cartera y ventas del vendedor autenticado; el filtro permite todas sus sucursales autorizadas o una de ellas. |
| Receipts | Usuario operativo: sólo tickets de la sucursal activa. Master autorizado: `Todas` o una sucursal. Comparativos, detalle, cancelaciones e impresión conservan el alcance. |
| Customers | Los filtros de sucursal se generan dinámicamente y se cruzan con la sucursal de registro o de compra. La cartera del vendedor continúa limitada a su identidad. |
| Citas | Master: todas o una sucursal; usuario operativo: sucursal fija. KPIs, estados, servicios y lista usan el mismo conjunto filtrado. |
| Membresías | El filtro de sucursal afecta tarjetas, saldos, alertas, KPIs, análisis mensual/anual, podio y PDF/Excel. Master ve el consolidado; vendedor autorizado sólo sus clientas. |
| Inventory · Catálogo | Permite una, varias o todas las sucursales autorizadas. Existencias, mínimos, máximos, totales y exportaciones se calculan sólo para esa selección. |
| Inventory · Pedido sucursales / almacén | Destinos y filtros provienen de sucursales autorizadas. Una sucursal no puede consultar ni generar pedidos para otra sin permiso. El almacén central se identifica como alcance propio, no como tienda ficticia. |
| Inventory · Catálogo visual | Sólo ofrece productos activos disponibles en la sucursal actual de la terminal. |
| Inventory · Movimientos | `Todas` o una sucursal filtra historial, entradas, salidas, transferencias, análisis mensual, dashboard comercial y PDF/Excel. Una transferencia aparece al filtrar su origen o su destino. |
| Suppliers | Catálogo corporativo global; si posteriormente se asignan proveedores por sucursal, la API deberá declarar ese alcance de forma explícita. |
| Deals | Cada promoción conserva una o varias sucursales dinámicas. Sólo se ofrece y aplica donde coincida la sucursal del ticket. |
| Settings | Configuración corporativa global, salvo apartados que declaren sucursales asignadas como competiciones, ubicaciones, listas de precio o notificaciones. |
| X-Report | Master autorizado selecciona todas o una sucursal. Ventas, movimientos y exportación excluyen cualquier ubicación fuera del alcance autorizado. |
| Reports y sus submenús | Los reportes de ventas, mercancía, empleados y clientes usan una selección dinámica de una, varias o todas las sucursales. Cada ventana independiente conserva el mismo alcance para métricas, filas y descargas. |
| Cash manager | Usuario operativo: caja de su sucursal. Master autorizado: todas o una sucursal. Gastos, saldo, anulaciones, comparativos y exportaciones respetan el filtro. |
| Clock In | El registro se guarda en la sucursal elegida/autorizada. Master consulta todas o una; vendedor consulta la sucursal activa. Un filtro de reporte nunca impide registrar la salida de una entrada vigente. |
| Competition | La competencia se configura para una sucursal o todas las autorizadas. Las ventas de tiendas fuera del alcance no participan aunque exista información histórica. |
| Close day | Siempre corresponde a la sucursal y jornada activa; no mezcla cierres de otras terminales. El consolidado multi-sucursal pertenece al Dashboard o a Reports. |
| Employees, My Account y Data update | Configuración corporativa o personal. Las asignaciones de sucursales y permisos deben seguir el catálogo dinámico y validarse en backend. |

### 26.3 Descargas y consistencia

- PDF, Excel y cualquier impresión de reporte deben incluir periodo, usuario solicitante y etiqueta de alcance (`Todas las sucursales` o nombre de tienda).
- El nombre del archivo debe identificar el periodo y la sucursal cuando la descarga sea individual.
- Una descarga usa el mismo conjunto filtrado que la pantalla, pero el backend genera los totales sobre todos los registros del alcance, no sólo sobre la página visible.
- Las filas consolidadas incluyen `branch_id` y nombre de sucursal para permitir conciliación. Los movimientos entre sucursales conservan origen y destino.
- Un estado vacío debe decir que no existen registros para la sucursal elegida; jamás debe rellenarse con datos de Polanco u otra tienda como sustitución.

### 26.4 Criterios de aceptación de alcance

- [ ] Cada selector contiene exactamente las sucursales activas autorizadas y llega hasta la ubicación número 30.
- [ ] Elegir una sucursal recalcula todos los indicadores, gráficas, filas, totales y descargas de la vista.
- [ ] Elegir `Todas` produce la unión/suma del conjunto autorizado sin duplicar transferencias ni tickets.
- [ ] Desactivar la sucursal seleccionada corrige el selector y no deja datos de un valor oculto.
- [ ] Un usuario operativo no obtiene datos de otra tienda modificando parámetros, almacenamiento local o solicitudes de red.
- [ ] Una transferencia se localiza desde origen y destino, pero no se duplica en el total consolidado.
- [ ] PDF y Excel coinciden con la pantalla y señalan claramente su alcance.
- [ ] Una tienda sin información muestra un estado vacío propio y no datos de otra ubicación.
- [ ] Los submenús independientes de Reports conservan y aplican el filtro actual al abrirse.
- [ ] La prueba con 1, 10, 20 y 30 sucursales termina sin desbordes horizontales globales ni acciones inaccesibles.

## 27. Alcance diario del módulo de Membresías

- Sólo un usuario master puede seleccionar `Todas las sucursales` y consultar el consolidado completo de membresías e historial.
- El usuario master también puede seleccionar una sola sucursal. Al cambiarla, tarjetones, indicadores, alertas, análisis, rankings, tablas y descargas deben recalcularse para esa ubicación.
- Un usuario que no es master no recibe el selector `Todas las sucursales` ni puede elegir otra tienda. Su alcance queda fijado a la sucursal activa de la sesión.
- Cada vendedor debe ingresar su código personal para entrar al módulo. La autorización es secundaria al inicio de sesión y al permiso de módulo; no sustituye ninguna de esas validaciones.
- Sin una búsqueda histórica activa, el usuario de sucursal sólo ve el resumen y las membresías relacionadas con él que fueron compradas en su sucursal durante la fecha operativa actual de México.
- Después de validar el código, una búsqueda de por lo menos dos caracteres por nombre de clienta, teléfono, folio o ticket puede consultar fechas anteriores, pero siempre dentro de la sucursal activa y sólo cuando el vendedor participó en esa membresía.
- Se considera participación cuando el vendedor es el `seller_id` vigente, el `original_seller_id` de la compra o aparece mediante su identificador en el origen o destino de un cambio de vendedor. El nombre es sólo un dato de presentación y una compatibilidad temporal para registros heredados sin identificador; no debe ser la regla de autorización del backend.
- Si una clienta tiene otras membresías en las que el vendedor nunca participó, esas compras y sus movimientos permanecen ocultos aun cuando coincidan el nombre, teléfono o cliente.
- El buscador también acepta nombre de membresía y nombre del vendedor sobre el conjunto ya autorizado. Buscar el nombre del usuario no amplía el alcance ni permite descubrir otra cartera.
- La restricción diaria se aplica antes de calcular indicadores, alertas, análisis, tarjetones y exportaciones. Ocultar registros en la tabla no es suficiente.
- Para el usuario de sucursal se ocultan los filtros libres de sucursal y rango histórico; la pantalla muestra de forma explícita la sucursal y fecha fija consultadas.
- Las descargas PDF y Excel del historial completo quedan reservadas al usuario master. El vendedor consulta su historial autorizado en pantalla sin generar archivos con datos personales de clientas.
- El backend debe resolver la participación con identificadores y validar simultáneamente el usuario autenticado, su código personal vigente, `branch_id` y la relación con `seller_id`, `original_seller_id` o el historial de cambios. Para el resumen diario también valida `business_date`. Modificar el frontend o la solicitud no puede permitir consultar otra cartera u otra sucursal.
- La fecha operativa se calcula con la zona horaria `America/Mexico_City`; no se debe usar directamente la fecha UTC del servidor.

### 27.1 Criterios de aceptación

- [ ] Master puede alternar entre todas las sucursales y una sola sucursal.
- [ ] Al cambiar la selección master, todos los componentes y descargas muestran el mismo alcance.
- [ ] Un usuario de sucursal no ve ni puede solicitar `Todas las sucursales`.
- [ ] En la vista inicial, un usuario de sucursal sólo obtiene el resumen y las membresías relacionadas con él, de su sucursal y del día operativo actual.
- [ ] Sin ingresar el código personal no se muestran clientas, tarjetones, saldos ni historial al vendedor.
- [ ] Con dos o más caracteres, el vendedor localiza compras históricas de su sucursal donde sea responsable actual, vendedor original o participante de un cambio.
- [ ] Una membresía de otra sucursal o en la que el vendedor nunca participó no aparece, aunque pertenezca a una clienta que sí tiene otra membresía autorizada.
- [ ] Una búsqueda de una clienta no revela sus demás compras no relacionadas con el vendedor autenticado.
- [ ] El vendedor no recibe botones de descarga PDF o Excel; el master conserva las exportaciones según su alcance.
- [ ] Escribir el nombre del vendedor autenticado permite localizar sus membresías autorizadas sin mostrar registros de otro vendedor con un nombre parecido.
- [ ] La pantalla del usuario de sucursal identifica claramente la tienda y fecha bloqueadas.

## 28. Indicador de membresías en Customers

- Cada registro de Customers muestra si la clienta tiene membresías, cuántas permanecen activas y cuántas compras de membresía existen en total.
- Una membresía `ACTIVE` cuenta como activa; las membresías agotadas o canceladas se conservan únicamente dentro del total histórico.
- La relación entre clienta y membresía se resuelve mediante `client_id`. No se deben sumar registros sólo por coincidencia de nombre o teléfono.
- El indicador es informativo y no concede acceso al historial protegido del módulo de Membresías. Para abrir tarjetones y movimientos continúan aplicando el permiso del módulo, el código personal y el alcance del vendedor.
- Al colocar el cursor sobre el indicador, enfocarlo con teclado o hacer clic, se muestra un resumen emergente con nombre de cada membresía, estado, sucursal, fecha de compra y sesiones restantes. Al retirar el cursor o perder el foco, el mensaje se oculta.
- El resumen emergente no muestra tickets, cambios de vendedor, asistencias ni otros movimientos protegidos, y nunca debe ampliar el conjunto de clientas autorizado en Customers.
- El expediente impreso y la descarga Excel de clientes incluyen por separado `Membresías activas` y `Membresías compradas`.

### 28.1 Criterios de aceptación

- [ ] Una clienta sin compras muestra `Sin activas` y `0 compradas`.
- [ ] Una clienta con dos membresías activas muestra `2 activas` y el total correcto de compras.
- [ ] Al agotarse o cancelarse una membresía disminuye el número activo sin borrar la compra del total histórico.
- [ ] Dos clientas con el mismo nombre o teléfono no mezclan sus cantidades; el conteo usa `client_id`.
- [ ] La tabla, el expediente expandido, la impresión y Excel muestran las mismas cantidades.
- [ ] El resumen aparece mediante cursor, clic o teclado, y desaparece al retirar el cursor o cambiar el foco.
- [ ] Si existen muchas membresías, el contenido se desplaza dentro del mensaje sin aumentar el ancho de la ventana.

## 29. Distribución adaptable de filtros de Membresías

- El buscador, los selectores de membresía y sucursal y las fechas deben permanecer dentro del panel sin ampliar horizontalmente la aplicación.
- En una ventana amplia se muestran en una sola fila. Cuando el ancho disponible disminuye, los filtros pasan primero a tres columnas, después a dos y finalmente a una columna.
- Todos los controles usan el ancho de su celda, permiten reducir su contenido y conservan una altura uniforme. Ningún texto, calendario o desplegable puede salir del borde del panel.

## 30. Copia de Teléfono a WhatsApp en alta de cliente

- El formulario de nueva clienta incluye un botón con flecha entre los campos `Teléfono` y `WhatsApp`.
- El botón permanece deshabilitado mientras Teléfono esté vacío. Al activarlo copia exactamente el número capturado, incluido su formato visible, al campo WhatsApp.
- Si ambos valores coinciden, el botón cambia a una confirmación visual. La clienta puede editar WhatsApp después sin modificar Teléfono.
- En ventanas pequeñas los campos se presentan verticalmente y la flecha gira para señalar el campo WhatsApp inferior.

## 31. Reporte mensual de procedencia y tipos de cliente

- La ventana `Reports > Reportes de clientes > Comportamiento de clientes` permite elegir un mes completo o conservar un periodo personalizado con fecha inicial y final.
- Elegir un mes ajusta el periodo desde el primer hasta el último día calendario de ese mes usando la zona horaria operativa `America/Mexico_City`.
- El filtro `Procedencia` se genera dinámicamente con las procedencias registradas en clientes; incluye la opción `Todas las procedencias` y no depende de una lista escrita directamente en la interfaz.
- Mes, procedencia, vendedor, sucursal y texto de búsqueda forman un único alcance. Indicadores, tendencia, distribución, estadísticas, tabla, paginación y descargas deben usar exactamente ese mismo conjunto filtrado.
- Por cada procedencia se muestran como mínimo: clientas únicas, porcentaje del total, venta acumulada, ticket promedio, recurrencia, visitas y citas.
- `Clientas únicas` cuenta una sola vez cada `client_id`. `Porcentaje del total` divide las clientas de la procedencia entre todas las clientas del alcance. `Ticket promedio` divide la venta entre tickets completados. `Recurrencia` representa las clientas con más de una visita dentro del periodo.
- Las ventas sólo consideran tickets completados y no incluyen abonos de apartado como una venta nueva. Las citas se cuentan dentro del mismo periodo y sucursales autorizadas.
- Una clienta nueva sin compra puede contar dentro de las altas y la participación de su procedencia, pero aporta cero a venta, ticket promedio y visitas.
- Excel agrega una hoja de estadísticas por procedencia además del resumen y detalle. PDF y Excel identifican periodo, sucursales y procedencia elegida; sus totales no se limitan a la página visible.
- El backend debe agrupar por el identificador estable de procedencia y `client_id`, filtrar antes de agregar y devolver la etiqueta vigente para presentación. Cambiar el texto visible de una procedencia no debe dividir su historial.

### 31.1 Criterios de aceptación

- [ ] Elegir un mes coloca correctamente el primer y último día, incluidos febrero y años bisiestos.
- [ ] Elegir una procedencia recalcula tarjetas, gráficas, estadísticas, tabla y descargas sin conservar cifras de otra procedencia.
- [ ] La suma de clientas de todas las procedencias coincide con `Clientes en periodo` y su participación suma 100% salvo redondeo.
- [ ] Cada tipo muestra venta, ticket promedio, recurrencia, visitas y citas aun cuando alguno de esos valores sea cero.
- [ ] Una combinación sin resultados muestra un estado vacío y no reutiliza datos del periodo anterior.
- [ ] El archivo Excel incluye la hoja `Estadísticas procedencia` con el mismo alcance visible.
- [ ] La selección de sucursal continúa respetando la autorización master y la matriz multi-sucursal descrita en las secciones 25 y 26.

## 32. Membresías compradas dentro de Receipts

- El dashboard de `Receipts` muestra cuántas membresías se compraron, cuántos tickets las incluyen y el total de sesiones adquiridas dentro del alcance vigente.
- Sin autorización master, el alcance corresponde únicamente al día operativo actual y la sucursal activa. Con autorización master, respeta exactamente los filtros de fecha, sucursal y búsqueda del módulo.
- Una membresía se relaciona con su venta mediante `purchase_ticket_id`; no se debe inferir por nombre, teléfono, importe o proximidad de fechas.
- La tabla de tickets incluye una columna `Membresía`. Si un ticket contiene una o varias compras, muestra la cantidad; si no contiene membresías, muestra un guion.
- Debajo del nombre de toda clienta que conserve al menos una membresía activa aparece una corona pequeña con el número de membresías activas. La marca permite reconocerla rápidamente aun cuando la membresía se haya comprado en otro ticket.
- La corona se determina por la identidad de la clienta y el estado vigente de sus membresías; no por los productos del ticket mostrado. No aparece para venta de mostrador ni cuando todas las membresías están agotadas o canceladas.
- Al colocar el cursor, enfocar con teclado o hacer clic sobre el indicador del dashboard o de una fila, aparece un resumen emergente con nombre de membresía, clienta, sucursal, folio del ticket, sesiones adquiridas e importe.
- Al retirar el cursor o perder el foco, el resumen se oculta. El indicador no sustituye ni bloquea la acción normal para visualizar el ticket.
- El dashboard contabiliza sólo tickets `COMPLETED` y excluye abonos de apartado. Un ticket cancelado puede conservar su trazabilidad histórica en la tabla autorizada, pero sus membresías no cuentan como venta vigente y deben quedar canceladas mediante el proceso transaccional correspondiente.
- Cuando el ticket incluya varias membresías, cada compra conserva su propio tarjetón y aparece como un registro independiente dentro del resumen emergente.
- Los resultados se recalculan al cambiar fecha, sucursal o búsqueda y nunca muestran membresías pertenecientes a tickets fuera del alcance autorizado.

### 32.1 Criterios de aceptación

- [ ] Un ticket sin membresía muestra `—` y no abre un resumen vacío.
- [ ] Un ticket con una membresía muestra `1 comprada` y el nombre correcto al pasar el cursor.
- [ ] Un ticket con varias membresías muestra todas individualmente, con sesiones e importe propios.
- [ ] Una clienta con membresía activa muestra la corona debajo de su nombre y la cantidad correcta sin aumentar excesivamente la altura de la fila.
- [ ] Una clienta sin membresías activas no muestra la corona, aunque conserve membresías agotadas en su historial.
- [ ] La suma del dashboard coincide con las membresías ligadas a los tickets completados del alcance visible.
- [ ] Cambiar de sucursal o fecha elimina inmediatamente del resumen las compras fuera del nuevo alcance.
- [ ] Un ticket cancelado no incrementa cantidad, venta ni sesiones del dashboard.
- [ ] El resumen puede abrirse con cursor, clic y teclado, y desaparece al perder interacción.

## 33. Acceso protegido al módulo Settings

- `Settings` sólo puede abrirse cuando la sesión pertenece al usuario master o cuando el rol activo contiene explícitamente el módulo `settings` dentro de `module_access`.
- El permiso debe aplicarse simultáneamente en el menú, la navegación interna y el renderizado de la pantalla. Ocultar el botón no se considera autorización suficiente.
- Los accesos secundarios, como `Competition > Configurar`, sólo se muestran cuando el usuario tiene permiso para Settings y deben utilizar la misma función central de navegación autorizada.
- Si el permiso se retira mientras la persona tiene Settings abierto, el sistema cierra la configuración, cancela cualquier panel secundario y la dirige al primer módulo permitido sin mostrar nuevamente información protegida.
- Asignar o retirar Settings a un rol exige guardar los permisos con código master. Un usuario no puede concederse el módulo a sí mismo desde su sesión operativa.
- Tener acceso a Settings no concede automáticamente edición. La edición continúa dependiendo de `module_edit_access` y cada configuración especializada debe validar su permiso granular cuando corresponda.
- El backend debe validar la sesión master o el permiso `settings` en cada lectura y escritura de configuración. También debe validar permisos granulares y registrar usuario, fecha, cambio anterior y cambio nuevo en la auditoría.

### 33.1 Criterios de aceptación

- [ ] El usuario master ve y abre Settings.
- [ ] Un rol con `settings` asignado ve y abre el módulo.
- [ ] Un rol sin `settings` no ve el botón en el menú ni los botones secundarios que conduzcan a configuración.
- [ ] Intentar abrir Settings mediante navegación interna, estado guardado o manipulación del frontend no renderiza su contenido.
- [ ] Retirar el permiso durante una sesión abierta expulsa al usuario de Settings.
- [ ] Un rol con consulta pero sin edición puede revisar únicamente los datos autorizados y no guardar cambios.
- [ ] La API rechaza lecturas y escrituras cuando la sesión no es master ni tiene el permiso correspondiente.

## 34. Acceso global a módulos, submenús y accesos secundarios

- Todo destino funcional del POS debe existir como permiso independiente en `module_access`, tanto si aparece como módulo principal como si aparece dentro de los submenús de Ventas o Inventario.
- El usuario master tiene acceso a todos los destinos. Un usuario operativo sólo puede abrir los módulos incluidos en su rol activo; `My Account` permanece disponible únicamente para su información personal, mientras que ubicaciones, facturación y configuración corporativa conservan la autorización master.
- El menú principal oculta los módulos no autorizados. Un grupo como Ventas o Inventario se muestra cuando existe al menos un submenú permitido, pero pulsar el encabezado no debe intentar abrir el módulo padre si éste no fue asignado.
- El encabezado principal `Ventas` funciona únicamente como control desplegable: cada clic abre o contrae sus submenús. Para entrar al módulo de venta se utiliza la opción `Ventas` dentro del propio submenú.
- Cada submenú se filtra individualmente. Tener acceso al módulo padre no concede automáticamente acceso a Receipts, Customers, Close day, Pedido sucursales, Almacén matriz, Proveedores, Catálogo, Movimientos o Paquetes y promociones.
- Toda navegación debe pasar por una validación central. La pantalla también valida el permiso antes de renderizar, para impedir el acceso mediante estado guardado, una llamada interna, herramientas de desarrollo o una ruta secundaria.
- Los accesos internos que abren otro módulo deben respetar el permiso del destino. Por ejemplo, `Competition > Configurar` depende de `settings` y las solicitudes a bodega desde Inventory dependen de `branch-inventory`.
- Si se retira un permiso mientras la pantalla está abierta, el sistema cierra ventanas emergentes relacionadas, abandona un conteo de cierre protegido si corresponde y dirige al usuario a Dashboard, Ventas o al primer destino permitido.
- Terminar una venta o consultar el ticket de una membresía puede mostrar el comprobante emergente dentro del módulo de origen cuando el rol no tiene acceso general a Receipts; esto no habilita la lista, filtros ni historial completo de Receipts.
- `module_edit_access` y `module_print_access` son permisos adicionales y nunca implican visibilidad por sí solos. Al retirar visibilidad se eliminan también los permisos de edición e impresión de ese destino.
- Employees y la administración corporativa de My Account conservan su protección master. Guardar cambios de rol requiere código master y el backend debe impedir que un usuario se conceda permisos a sí mismo.
- El backend debe repetir la validación de `module_access`, edición, impresión, sucursal y alcance de datos en cada endpoint. La autorización del frontend es una barrera de interfaz, no la fuente de seguridad definitiva.

### 34.1 Matriz de destinos controlados

| Grupo | Destinos con permiso propio |
| --- | --- |
| Operación de venta | Ventas, Catálogo, Mis ventas, Receipts, Customers, Close day, Cash manager y X-Report. |
| Clientes y servicio | Citas, Membresías, Competition y Websites. |
| Inventario y almacén | Inventory, Pedido sucursales, Almacén matriz, Proveedores, Movimientos y Paquetes y promociones. |
| Administración y análisis | Dashboard, Reports, Employees y My Account. |
| Sistema | Settings, Data update y Clock In. |

### 34.2 Criterios de aceptación

- [ ] Cada destino de la matriz de roles corresponde a una pantalla real y no existe una pantalla navegable sin permiso asociado.
- [ ] Master visualiza y abre todos los módulos y submenús.
- [ ] Un rol sólo visualiza y abre los destinos incluidos en `module_access`.
- [ ] Un rol con un único submenú permitido puede desplegar el grupo sin recibir un error por falta de acceso al módulo padre.
- [ ] Pulsar repetidamente el encabezado `Ventas` alterna entre submenús visibles y contraídos sin cambiar la pantalla activa.
- [ ] Escribir o forzar un identificador de pantalla no autorizado no renderiza datos protegidos.
- [ ] Retirar el permiso del módulo activo cierra sus diálogos y redirige a un destino permitido.
- [ ] Los botones internos hacia otro módulo se ocultan cuando falta el permiso del destino.
- [ ] Un comprobante puntual abierto desde una venta o membresía no permite navegar el historial de Receipts sin su permiso.
- [ ] Edición e impresión se rechazan cuando faltan sus permisos específicos, aunque la consulta esté autorizada.
- [ ] La API devuelve acceso denegado ante la misma solicitud si se omiten o manipulan las restricciones del frontend.

## 35. Salida de sesión sin Close day

- El bloque `Sistema` del menú lateral muestra el botón `Salir · Sin Close day` inmediatamente debajo de `Clock In`, únicamente al usuario master o a un usuario cuyo rol activo incluya el permiso explícito `SESSION_EXIT`. Los controles de este bloque usan una presentación compacta para dejar más espacio disponible a la navegación operativa, sin cambiar permisos ni comportamiento.
- Este permiso se asigna desde Employees mediante código master. Tener acceso a `Close day`, Settings o edición de otro módulo no concede esta salida automáticamente.
- Al pulsar el botón se presenta una confirmación que explica que sólo se cerrará la sesión del usuario.
- Confirmar la salida no cierra la jornada, no crea un corte, no modifica el conteo inicial o final, no cambia ventas, tickets, gastos ni métodos de pago y no registra Clock Out.
- El registro de asistencia del vendedor permanece `ONLINE`; la salida de asistencia se realiza exclusivamente desde Clock In o mediante el cierre normal del día.
- Por seguridad, se cierran todos los diálogos y autorizaciones temporales. Si existe un ticket sin finalizar, la confirmación muestra cuántas piezas contiene y al salir descarta únicamente ese carrito no registrado.
- La jornada abierta permanece en memoria y backend. Cuando otro usuario autorizado ingresa en la misma sucursal, continúa la jornada existente sin solicitar un nuevo conteo inicial ni reemplazar su auditoría de apertura.
- Si no existe una jornada abierta para la sucursal elegida, el ingreso conserva el flujo normal de conteo inicial y Open Day.
- El backend debe registrar una auditoría de cierre de sesión con usuario, sucursal y fecha, diferenciada de Close day y Clock Out, sin alterar las entidades del corte.

### 35.1 Criterios de aceptación

- [ ] Master visualiza el botón y puede cerrar únicamente su sesión.
- [ ] El botón aparece alineado inmediatamente debajo de `Clock In`; al contraer el menú conserva un icono identificable y su descripción accesible.
- [ ] Un rol con `SESSION_EXIT` visualiza el botón y puede utilizarlo.
- [ ] Un rol sin `SESSION_EXIT` no visualiza el botón y el backend rechaza un intento forzado.
- [ ] La confirmación indica claramente que la jornada y los cortes no serán modificados.
- [ ] Después de salir, `day_session.status` continúa `OPEN` y no se genera un nuevo cierre ni auditoría de inventario.
- [ ] La asistencia vigente continúa `ONLINE` hasta que se registre la salida correspondiente.
- [ ] Reingresar en la misma sucursal continúa la jornada existente sin repetir el conteo inicial.
- [ ] Los tickets finalizados, ventas, gastos, conteos y totales permanecen exactamente iguales antes y después de la salida.
- [ ] Un carrito pendiente muestra advertencia y sólo se descarta después de confirmar.
- [ ] Las autorizaciones master temporales no se heredan al siguiente usuario.

## 36. Vendedores disponibles al finalizar un ticket según Clock In

- En el paso `Vendedores` de `Finalizar ticket`, el listado inicial muestra únicamente vendedores activos con un registro de asistencia `ONLINE` en la misma sucursal del ticket. Un Clock In de otra sucursal no cuenta como presencia local.
- Todos los vendedores presentes se muestran, aunque todavía no participen en la división de la venta. El primer vendedor presente puede utilizarse como selección inicial cuando todavía no existe una asignación válida.
- Si no existe ningún vendedor con Clock In en la sucursal, el sistema no asigna uno automáticamente y muestra el estado `Sin vendedores con Clock In`.
- El botón `Añadir más vendedores a la venta` habilita una búsqueda por nombre o alias. Los vendedores activos sin Clock In sólo aparecen después de escribir una consulta coincidente; abrir el buscador vacío no enlista a todo el personal.
- Un vendedor activo que no esté presente puede añadirse normalmente desde los resultados. Debe quedar identificado visualmente como `Sin Clock In`, sin crear, modificar ni simular un registro de asistencia.
- Los vendedores presentes se identifican como `Clock In activo`. Los vendedores ya seleccionados permanecen visibles aunque su estado de asistencia cambie mientras el ticket está abierto, para no alterar silenciosamente una división capturada.
- Si la clienta tiene un vendedor activo asignado, éste se preselecciona siempre en la división aunque no tenga Clock In local. Cuando esté ausente debe mostrarse con la leyenda `Sin Clock In`; la asistencia sirve para priorizar el listado, pero nunca desplaza al propietario vigente.
- Un Clock Out retira al vendedor del listado inicial de tickets posteriores. El cierre de sesión sin Close day no realiza Clock Out, por lo que conserva al vendedor como presente.
- Al registrar la venta, el backend debe guardar por cada participante una instantánea auditable con `seller_id`, sucursal del ticket, participación y si tenía un Clock In vigente en el momento de finalizar. La búsqueda de ausentes no modifica la asistencia.
- El backend debe validar que el registro `ONLINE` no tenga salida, corresponda al vendedor y pertenezca a la sucursal del ticket. La interfaz no sustituye esta validación.

### 36.1 Criterios de aceptación

- [ ] Al abrir Vendedores aparecen todos y sólo los vendedores activos con Clock In vigente en la sucursal del ticket.
- [ ] Un vendedor con Clock In en otra sucursal no aparece como presente.
- [ ] Si no hay vendedores presentes no se realiza una asignación automática.
- [ ] Abrir el buscador sin escribir no enlista vendedores ausentes.
- [ ] Buscar por nombre o alias encuentra a un vendedor activo sin Clock In y permite añadirlo.
- [ ] Un vendedor añadido sin presencia se distingue con la leyenda `Sin Clock In`.
- [ ] Buscar o seleccionar a un ausente no crea ni cambia registros de Clock In/Clock Out.
- [ ] El vendedor activo asignado a la clienta se preselecciona siempre; si no tiene Clock In local se identifica como `Sin Clock In`.
- [ ] Después de Clock Out, el vendedor deja de aparecer como presente en tickets nuevos.
- [ ] El ticket conserva la evidencia de presencia y sucursal de cada vendedor al momento de finalizar.

## 37. Agenda desde el ticket para clientes existentes con membresía

- Cuando se selecciona una clienta existente con una o más membresías `ACTIVE` y sesiones disponibles, el paso `Citas` muestra cada tarjetón elegible con nombre de membresía, folio y sesiones restantes.
- Sólo se consideran elegibles las membresías de la clienta seleccionada cuyo estado sea activo y donde `used_sessions < total_sessions`. Una membresía agotada o cancelada conserva su historial, pero no puede elegirse para una nueva cita.
- Elegir una membresía selecciona el servicio correspondiente y liga la reservación con `membership_id`. La cita puede reservarse en cualquier sucursal con un espacio vacío o liberado por cancelación.
- Reservar una cita no descuenta una sesión. El tarjetón se afecta únicamente cuando Agenda confirma el estado `ATTENDED`; una cancelación o ausencia no consume sesión y mantiene las reglas de seguimiento de inasistencias.
- Para clientas con al menos una membresía elegible se muestra el botón `¿Regalar facial de cortesía?`. Esta opción se utiliza para atender una queja, registra el servicio `Facial de cortesía por queja` en $0 y no se liga ni descuenta de ningún tarjetón.
- La cortesía por queja es opcional y mutuamente excluyente con el uso de una sesión de membresía en esa reservación. Elegir una membresía desactiva la cortesía; elegir la cortesía limpia la membresía seleccionada.
- La cortesía por queja debe persistir con `appointment.kind = COURTESY` y `courtesy_reason = COMPLAINT`, aparecer en el ticket como regalo de $0 y enviarse a Agenda como una cita de cortesía.
- Las cortesías de alta de clientes nuevos continúan identificándose como `courtesy_reason = WELCOME`; no deben confundirse en reportes con las cortesías originadas por quejas.
- Si la clienta tiene historial de membresía pero todas sus membresías están agotadas, canceladas o sin sesiones, desaparece por completo la opción de reservar con membresía. En su lugar sólo puede elegir `Facial de cortesía por queja` o `Corporal de cortesía por queja`; no se muestra el selector normal de sesiones o servicios.
- Si la clienta nunca ha tenido una membresía, conserva el selector normal de servicios y no visualiza las opciones especiales destinadas a clientas con historial de membresía.
- Para avanzar al cobro después de responder que sí desea agendar, se exige servicio o membresía, fecha, sucursal y espacio disponible. Responder `No por ahora` no genera reservación ni cortesía.

### 37.1 Criterios de aceptación

- [ ] Una clienta con dos membresías activas visualiza ambos tarjetones con sus sesiones restantes correctas.
- [ ] Una membresía agotada o cancelada no aparece como servicio disponible para agendar.
- [ ] La cita creada desde un tarjetón conserva el `membership_id` seleccionado.
- [ ] Reservar la cita no modifica `used_sessions`.
- [ ] Marcar la cita como asistida desde Agenda descuenta exactamente una sesión del tarjetón ligado.
- [ ] Cancelar la cita o marcar ausencia no descuenta sesiones.
- [ ] El botón de cortesía por queja sólo aparece cuando la clienta tiene historial de membresía; con sesiones vigentes ofrece facial y con todas las membresías terminadas ofrece facial o corporal.
- [ ] La cortesía por queja aparece en el ticket con valor $0, se agenda y no afecta sesiones.
- [ ] No es posible registrar simultáneamente una sesión de membresía y una cortesía por queja en la misma selección.
- [ ] Una clienta sin ningún historial de membresía conserva el flujo normal de próxima cita.
- [ ] Una clienta con membresía terminada no puede reservar con el tarjetón ni mediante manipulación del frontend.
- [ ] Para una membresía terminada sólo aparecen las cortesías facial y corporal por queja.
- [ ] La cortesía facial o corporal elegida se registra por $0 y no reactiva ni consume la membresía terminada.
- [ ] Una clienta que nunca tuvo membresía continúa usando el catálogo normal de servicios.

## 38. Controles adaptables en tarjetas y paginaciones

- Los botones, selectores y controles de paginación deben responder al ancho real de su tarjeta o panel, no únicamente al ancho total de la ventana.
- En un panel amplio los controles pueden compartir una fila y crecer dentro del espacio disponible. Cuando el panel se reduce, deben contraerse hasta su mínimo legible y después reorganizarse en filas completas antes de provocar un desbordamiento.
- Ningún botón puede quedar recortado por el borde derecho, oculto detrás de otro panel o fuera del área visible. El texto puede ocupar más de una línea cuando sea necesario, sin reducir el área táctil por debajo de un tamaño utilizable.
- En `Mis ventas > Clientes`, el filtro superior ocupa todo el ancho cuando la tarjeta sea estrecha. La paginación coloca `Visualizar` y el rango en una primera fila y conserva `Anterior`, número de página y `Siguiente` completos en una segunda fila.
- En tamaños extremadamente estrechos, el selector, el rango y las acciones pueden ocupar filas independientes. Al ampliar nuevamente la ventana deben regresar automáticamente a la distribución horizontal sin recargar la pantalla ni perder el estado actual.

### 38.1 Criterios de aceptación

- [ ] Reducir la tarjeta de clientes no corta el botón `Sólo con ventas del periodo`.
- [ ] Los botones `Anterior` y `Siguiente` permanecen completos, visibles y utilizables en todos los anchos soportados.
- [ ] El selector de registros no invade el rango ni las acciones de página.
- [ ] Ampliar la ventana recompone los controles en menos filas y utiliza el espacio disponible.
- [ ] Cambiar de tamaño no reinicia filtros, página, cliente seleccionado ni cantidad de registros.
- [ ] No aparece desplazamiento horizontal causado por los controles de esta tarjeta.

## 39. Identificación de membresías en Mis ventas

- En `Mis ventas > Ventas autorizadas`, cada ticket cuyo cliente tenga al menos una membresía activa visible para el vendedor muestra una corona pequeña debajo del nombre, acompañada por la cantidad de membresías activas.
- La corona utiliza las mismas interacciones que los indicadores de Customers y Receipts: abre el resumen al colocar el cursor, recibir foco de teclado o hacer clic; al retirar el cursor o perder el foco se cierra.
- El resumen muestra nombre y folio de cada membresía, sucursal, estado y relación entre sesiones restantes y sesiones totales. Las membresías activas se ordenan antes que las agotadas o canceladas.
- La corona sólo aparece cuando existe al menos una membresía `ACTIVE`. El historial emergente puede incluir membresías agotadas o canceladas que el vendedor esté autorizado a conocer.
- La relación del cliente se resuelve primero por `client_id`; para tickets históricos se permite conciliar por teléfono normalizado y, como último recurso, por nombre completo normalizado.
- La autenticación de `Mis ventas` limita la información: el vendedor sólo puede visualizar membresías donde sea responsable actual, vendedor original o participante documentado en un cambio de vendedor. El filtro de sucursal también limita las membresías mostradas.
- La ausencia de permiso o relación comercial no debe inferirse mediante contadores ocultos, respuestas API ni contenido del mensaje emergente. Master conserva el alcance general desde los módulos autorizados correspondientes.

### 39.1 Criterios de aceptación

- [ ] Un ticket de una clienta con membresía activa muestra la corona debajo de su nombre.
- [ ] El número de la corona coincide con las membresías activas visibles para el vendedor autenticado.
- [ ] Cursor, clic y teclado abren el mismo resumen; retirar la interacción lo cierra.
- [ ] El resumen presenta folio, sucursal, estado y sesiones restantes de cada membresía autorizada.
- [ ] Una clienta que sólo conserva membresías agotadas o canceladas no muestra la corona.
- [ ] Un vendedor no puede consultar desde Mis ventas membresías sin relación actual, original o histórica con su código.
- [ ] Cambiar el filtro de sucursal actualiza inmediatamente el indicador y su resumen.
- [ ] Los tickets históricos sin `client_id` pueden conciliarse por teléfono y no duplican membresías.

## 40. Administración de paquetes y productos de cortesía

- Settings incluye dos catálogos relacionados: `Productos de cortesía` y `Paquetes`. Ambos permiten añadir, editar, activar e inactivar registros cuando el usuario tiene permiso de edición sobre Settings.
- Un producto de cortesía guarda identificador estable, nombre, tipo `FACIAL` o `BODY`, estado y auditoría. Editar el nombre o tipo no cambia su identificador ni rompe paquetes o registros históricos.
- Un paquete guarda identificador estable, nombre, estado y entre uno y dos productos de cortesía. Puede repetir el mismo producto dos veces para representar una cortesía doble o combinar un facial y un corporal.
- Checkout sólo muestra paquetes activos, habilitados y compuestos completamente por productos activos. Nunca se permiten más de dos servicios de regalo por paquete.
- Inactivar un producto inactiva también los paquetes que lo utilizan para evitar ofertas incompletas. Reactivar el producto no reactiva automáticamente esos paquetes; cada paquete debe revisarse y activarse de forma explícita.
- Inactivar un paquete lo elimina inmediatamente de nuevas ventas y del selector predeterminado, pero no lo borra de tickets, citas, reportes ni historiales existentes.
- Si se inactiva el paquete predeterminado, se selecciona el siguiente paquete activo válido. Si ya no existe ninguno, la exigencia de cortesía para clientes nuevos se desactiva hasta que se configure un paquete válido.
- Activar la captura obligatoria de cortesía exige al menos un paquete activo y válido. El sistema rechaza la activación cuando no hay opciones utilizables.
- Añadir o editar valida nombre obligatorio, nombres no duplicados, cantidad de servicios y estado activo de los productos incluidos. Los registros se inactivan en lugar de eliminarse físicamente.
- Toda cita y línea de ticket debe guardar la instantánea del nombre del paquete y de cada servicio usada al momento de la venta, además de sus identificadores, para que una edición posterior no reescriba el histórico.
- El backend debe validar permisos, relaciones, estados y máximo de servicios, y registrar usuario, fecha, valor anterior y valor nuevo en cada alta, edición, activación o inactivación.

### 40.1 Criterios de aceptación

- [ ] Un usuario con edición de Settings puede añadir un producto facial o corporal de cortesía.
- [ ] El producto nuevo puede utilizarse al crear o editar un paquete.
- [ ] Un paquete acepta uno o dos servicios y rechaza cero o más de dos.
- [ ] Es posible configurar dos unidades del mismo servicio dentro de un paquete doble.
- [ ] Editar nombres conserva identificadores y no modifica tickets o citas históricos.
- [ ] Inactivar un producto retira de Checkout los paquetes que dependen de él.
- [ ] Reactivar un producto no activa paquetes relacionados sin revisión explícita.
- [ ] Inactivar un paquete lo retira de Checkout sin borrar su historial.
- [ ] El paquete predeterminado siempre es activo y válido, o queda vacío con la captura obligatoria desactivada.
- [ ] Un usuario de consulta puede revisar la configuración, pero no añadir, editar, activar ni inactivar.
- [ ] La API rechaza cualquier modificación sin permiso y conserva auditoría del cambio.

## 41. Propiedad de cartera y baja o reactivación de vendedores

- Al seleccionar una clienta existente con un vendedor activo asignado, Checkout debe incorporar automáticamente a ese vendedor en la división del ticket. Esta regla prevalece sobre la lista de presencia: si no tiene Clock In, permanece seleccionado y se identifica como `Sin Clock In`.
- Dar de baja a un vendedor transfiere de forma atómica a cartera de empresa todos los clientes cuyo `owner_id` vigente sea el del vendedor. El cliente queda con `owner_id = null`, `company_locked = true` y la empresa configurada como propietaria actual.
- La transferencia debe crear un registro histórico inmutable por cliente con `seller_id`, nombre del vendedor como instantánea, fecha y hora de finalización de la relación, motivo `SELLER_INACTIVATED` y usuario que autorizó la baja. El identificador del vendedor no se elimina aunque su cuenta esté inactiva.
- La baja no modifica tickets anteriores, vendedores participantes, porcentajes, montos, comisiones, membresías, citas ni reportes históricos. Cada ticket conserva la instantánea de su división original; únicamente cambia la propiedad vigente de la ficha del cliente.
- Al consultar el perfil del cliente, se muestra `Empresa` como propietario actual y también el vendedor anterior, incluyendo su estado `Inactivo` y la fecha de transferencia. Esta información permanece disponible en impresión y exportación autorizadas.
- Reactivar al vendedor no devuelve automáticamente los clientes transferidos ni reescribe relaciones históricas. El vendedor podrá recibir clientes nuevos o nuevas asignaciones realizadas después de su reactivación, aplicando los permisos y autorizaciones vigentes.
- Si un vendedor reactivado recibe clientes nuevos y vuelve a darse de baja, sólo se transfieren los clientes que tenga asignados en ese momento. Los clientes transferidos en una baja anterior permanecen en cartera de empresa salvo una reasignación explícita y autorizada.
- El backend debe ejecutar la baja y transferencia dentro de una transacción, bloquear carreras con ventas o reasignaciones concurrentes y conservar auditoría de vendedor, cliente, sucursal, usuario autorizador, fecha, valor anterior y valor nuevo.
- La API de lectura de clientes debe poder resolver vendedores inactivos para el historial; no debe ocultarlos ni sustituir su nombre histórico por el nombre de la empresa.

### 41.1 Criterios de aceptación

- [ ] La clienta con vendedor activo asignado abre el paso de Vendedores con ese vendedor ya incluido en la división, tenga o no Clock In.
- [ ] Un vendedor asignado sin Clock In se muestra seleccionado con la leyenda `Sin Clock In`.
- [ ] Al inactivar un vendedor, todos y sólo sus clientes vigentes pasan a cartera de empresa.
- [ ] La baja registra para cada cliente el identificador, nombre y fecha del vendedor anterior.
- [ ] Ningún ticket anterior cambia vendedor, división, importe ni comisión después de la baja.
- [ ] El perfil del cliente muestra propietario actual `Empresa` y vendedor anterior `Inactivo`.
- [ ] Reactivar al vendedor no le devuelve clientes transferidos anteriormente.
- [ ] Los clientes asignados después de la reactivación sí reconocen al vendedor como propietario en tickets nuevos.
- [ ] Una segunda baja sólo transfiere la cartera vigente de esa nueva etapa.
- [ ] La operación completa se confirma o revierte como una sola transacción y queda auditada.

## 42. Seguimiento desde la alerta de membresías por terminar

- Toda la franja de alerta `Membresías por terminar`, incluido el botón `Ver seguimiento`, es interactiva mediante clic, teclado y foco visible.
- Al activarla, el módulo limpia filtros incompatibles, desplaza la vista al listado de seguimiento y muestra únicamente membresías activas con dos sesiones o menos disponibles.
- El seguimiento conserva cada compra como un tarjetón independiente. Si una clienta tiene varias membresías por terminar, se muestran separadas por membresía y fecha de compra.
- Un vendedor sólo recibe alertas y puede abrir expedientes de clientas con las que tenga relación autorizada como vendedor actual, vendedor original o participante histórico documentado. La alerta no debe revelar nombres, teléfonos, folios ni conteos ajenos.
- Para el vendedor, la alerta puede recuperar el historial autorizado de su sucursal aunque la compra no sea del día actual; el código personal sigue siendo obligatorio para entrar al módulo.
- El usuario master puede visualizar la alerta y abrir todos los historiales dentro del alcance de sucursal seleccionado o de `Todas las sucursales`.
- Al abrir un registro desde el seguimiento se muestra el tarjetón, sesiones restantes, ticket de compra, sucursal, vendedor e historial de asistencia e incidencias, con las mismas restricciones de edición existentes.
- Cambiar manualmente la búsqueda, membresía, sucursal o fechas abandona el filtro rápido de seguimiento y aplica el nuevo filtro solicitado por el usuario.
- El backend debe repetir la autorización por cada consulta y apertura de expediente; no debe confiar en que el registro haya sido ocultado por la interfaz.

### 42.1 Criterios de aceptación

- [ ] Hacer clic en cualquier parte de la alerta abre el listado de seguimiento.
- [ ] El botón `Ver seguimiento` produce exactamente el mismo resultado que la franja completa.
- [ ] El listado contiene sólo membresías activas con una o dos sesiones restantes.
- [ ] Cada registro permite abrir el tarjetón y el historial autorizado del cliente.
- [ ] Un vendedor no visualiza ni abre clientes sin relación documentada con él.
- [ ] Master visualiza todos los historiales de las sucursales incluidas en su filtro.
- [ ] El acceso del vendedor continúa exigiendo su código personal.
- [ ] Usar otro filtro desactiva el seguimiento rápido sin perder permisos ni alcance.

## 43. Tarjetas de crédito, meses sin intereses y conciliación bancaria

- Todo cobro con el método `Tarjeta` debe indicar obligatoriamente si la operación fue con tarjeta de crédito o débito. La red o banco y los cuatro dígitos de autorización conservan su validación obligatoria.
- Cuando la tarjeta sea de crédito, el POS debe preguntar el plazo antes de permitir finalizar el cobro. Los valores iniciales permitidos son una exhibición, 3, 6, 9, 12, 18 o 24 meses; el backend debe utilizar un catálogo configurable para futuras opciones.
- `Una exhibición` se guarda como `installment_months = 1`; una tarjeta de débito o un método que no sea tarjeta guarda el plazo como `null`. No se permite enviar un plazo de MSI en efectivo, transferencia o débito.
- Cada entrada de pago conserva `method_id`, `amount`, `card_or_bank`, `card_type`, `installment_months`, autorización, folio, ticket, sucursal y fecha. Los pagos mixtos registran estos datos de manera independiente por cada método.
- La captura aplica tanto al cobro inicial como a abonos o liquidaciones de apartados y a correcciones autorizadas de tickets. Cambiar de tarjeta a otro método limpia tipo de tarjeta y plazo para no contaminar reportes.
- El ticket impreso, Receipts y el historial del cliente muestran de forma compacta `Crédito · N MSI`, `Crédito · una exhibición` o `Débito`, según corresponda.
- El Dashboard de jornada muestra crédito cobrado y distribución por plazo para el día vigente. Un usuario de sucursal ve únicamente su tienda; Master puede cambiar entre una sucursal y el consolidado general de todas las sucursales.
- Reports incorpora el submenú independiente `Conciliación bancaria` dentro de Reportes de ventas. Debe incluir cobros de venta, abonos y liquidaciones sin duplicar el total comercial del ticket original.
- La conciliación permite filtrar por fecha inicial y final, una o varias sucursales, vendedor, método de pago y búsqueda por ticket, cliente, tarjeta o banco. Cada fila representa un movimiento de pago, no una combinación artificial por ticket.
- El detalle de conciliación incluye día, ticket, sucursal, cliente, vendedor, método, tipo de tarjeta, tarjeta o banco, meses sin intereses, autorización, monto y estado de cobro.
- El tablero analítico del reporte muestra importe conciliable, crédito, débito, importe vendido a MSI, método más utilizado, plazo más utilizado, cobros por día y distribución por método y plazo.
- `Método más utilizado` y `Plazo más utilizado` se determinan primero por cantidad de movimientos y, en empate, por monto cobrado. Los importes siempre se muestran adicionalmente para permitir evaluación financiera.
- Las descargas Excel y PDF respetan exactamente los filtros visibles e incluyen el resumen ejecutivo y todas las filas del periodo, no sólo la página visible.
- El backend debe validar tipos y plazos, conservar las instantáneas históricas y autorizar el reporte y sus descargas conforme al permiso de Reports. Una edición posterior no debe reescribir movimientos bancarios ya conciliados sin auditoría.

### 43.1 Criterios de aceptación

- [ ] Elegir tarjeta exige seleccionar crédito o débito.
- [ ] Elegir crédito exige seleccionar una exhibición o un plazo MSI válido.
- [ ] Débito, efectivo y transferencia no almacenan meses sin intereses.
- [ ] Un pago mixto conserva tipo y plazo únicamente en la entrada de tarjeta correspondiente.
- [ ] El ticket y los historiales del cliente muestran el plazo en texto pequeño.
- [ ] El Dashboard diario cambia sus importes y plazos al cambiar la sucursal; Master puede consultar el consolidado general.
- [ ] Conciliación bancaria aparece como submenú independiente de Reports.
- [ ] Los filtros de fecha, sucursal, vendedor y método afectan métricas, gráficas, tabla y descargas.
- [ ] La tabla genera una fila por movimiento de pago e incluye compras, abonos y liquidaciones.
- [ ] Las gráficas identifican el método y el plazo más utilizados por frecuencia y muestran sus importes.
- [ ] Excel y PDF contienen el periodo completo filtrado y los meses sin intereses.
- [ ] El backend rechaza plazos inválidos o aplicados a métodos no compatibles y registra auditoría de cambios.

## 44. Catálogo general de redes de tarjeta y bancos

- El flujo de un cobro con tarjeta es secuencial: primero se elige `Crédito` o `Débito`, después la red `Visa` o `Mastercard` y finalmente el banco emisor. No se permite finalizar mientras falte cualquiera de estos datos o los cuatro dígitos de autorización.
- La red de pago y el banco son conceptos independientes. Un mismo banco puede estar disponible para crédito y débito y para más de una red; el backend no debe guardar `Visa` o `Mastercard` como si fueran bancos.
- El catálogo base contiene los 54 bancos asociados publicados por la Asociación de Bancos de México y se contrasta con el padrón de instituciones de banca múltiple autorizadas por la CNBV. La fecha de revisión inicial es septiembre de 2026.
- El catálogo de bancos es general para todo el POS. Lo consumen el cobro inicial, pagos mixtos, abonos y liquidaciones de apartados y la edición autorizada de tickets.
- Settings permite a un usuario master autorizado añadir un banco faltante, inactivarlo para nuevos cobros o reactivarlo. Un alta manual queda disponible inicialmente en crédito, débito, Visa y Mastercard.
- Inactivar un banco nunca lo elimina físicamente ni modifica ventas anteriores. Cada movimiento de pago guarda `bank_id` y una instantánea inmutable `bank_name`; de igual manera conserva `card_type` y `card_network` como valores históricos.
- Los selectores sólo muestran bancos activos y se actualizan inmediatamente en todos los flujos de cobro. Si un banco capturado en un ticket anterior está inactivo, continúa visible al consultar o imprimir ese ticket.
- Los pagos por transferencia también utilizan el catálogo general de bancos, pero no guardan tipo ni red de tarjeta.
- Ticket, historial de la clienta, historial de apartados y conciliación bancaria muestran la red y el banco por separado. Excel y PDF de conciliación incluyen columnas independientes `Tipo de tarjeta`, `Red` y `Banco`.
- La API debe validar que el banco exista y esté activo al crear un movimiento nuevo; también debe conservar el nombre capturado para impedir que futuras altas, bajas o cambios de presentación reescriban el historial.
- Toda modificación del catálogo registra usuario, fecha, banco, acción, valor anterior y valor nuevo. El backend debe permitir sincronizar una revisión futura del padrón oficial sin borrar bancos históricos ni duplicar nombres normalizados.

### 44.1 Criterios de aceptación

- [ ] Seleccionar tarjeta muestra primero Crédito/Débito, después Visa/Mastercard y por último el banco.
- [ ] Cambiar Crédito/Débito o Visa/Mastercard limpia un banco incompatible previamente seleccionado.
- [ ] Tarjeta de débito exige red, banco y autorización, pero nunca solicita meses sin intereses.
- [ ] Tarjeta de crédito exige red, banco, autorización y plazo.
- [ ] Añadir un banco desde Settings lo hace visible en todos los nuevos cobros sin recargar la aplicación.
- [ ] Inactivar un banco lo retira de nuevos cobros, pero no cambia tickets, apartados, reportes o impresiones anteriores.
- [ ] Reactivar un banco reutiliza su identificador original y no crea un duplicado.
- [ ] Transferencia permite elegir banco sin mostrar Crédito/Débito ni Visa/Mastercard.
- [ ] Conciliación y descargas separan tipo de tarjeta, red y banco.
- [ ] Un intento forzado de usar un banco inactivo en un cobro nuevo es rechazado por la API.

## 45. Empresa como participante de la división de venta

- Si el cliente pertenece a cartera de empresa, la empresa debe aparecer dentro de `División de venta` como un participante real y no únicamente como una leyenda informativa.
- La participación de empresa es obligatoria mientras el cliente conserve esa propiedad y no puede eliminarse desde checkout ni durante una edición posterior del ticket.
- El importe de la empresa se captura con las mismas modalidades de la división: cantidad en pesos o porcentaje. La suma de empresa y vendedores humanos debe ser exactamente igual al total del ticket o al 100 % antes de cobrar.
- La empresa tiene un identificador comercial configurable, inicialmente `EMPRESA-001`. Este número es único, estable e independiente del identificador, código de acceso o Clock In de cualquier empleado.
- El número de empresa se guarda como instantánea en cada participación del ticket junto con `participant_kind = COMPANY`, nombre comercial e importe. Los vendedores humanos usan `participant_kind = SELLER`.
- La empresa no forma parte del catálogo de empleados, no puede iniciar turno, autenticar módulos, recibir permisos personales ni aparecer como persona disponible en búsquedas de vendedores.
- Los vendedores humanos con Clock In continúan apareciendo primero. Si participan en una venta de cartera empresarial, su importe se registra por separado del importe de la empresa.
- Si no existe un vendedor humano seleccionado, la empresa puede conservar el 100 % de la división únicamente cuando el proceso de alta o autorización aplicable permita continuar; nunca se crea un vendedor ficticio para completar la suma.
- `sale_seller_ids` del cliente conserva sólo vendedores humanos relacionados. El identificador de empresa no se agrega como vendedor histórico del cliente porque la propiedad empresarial ya se representa con `company_locked` y `company_name`.
- Tickets, Receipts, historial, dashboards, rankings y reportes deben distinguir el importe de empresa del de cada vendedor. Los indicadores que midan productividad de empleados no deben atribuir la venta empresarial a una persona.
- Editar productos, cobros o vendedores de un ticket conserva la participación empresarial y su identificador histórico. Cambiar posteriormente el nombre o número comercial no reescribe tickets anteriores.
- El backend debe validar nuevamente la propiedad de la cartera y la suma de la división; no debe confiar sólo en el renglón bloqueado de la interfaz.

### 45.1 Criterios de aceptación

- [ ] Elegir un cliente de cartera empresarial agrega automáticamente a la empresa en la división.
- [ ] Elegir una procedencia que bloquea la cartera a empresa produce el mismo comportamiento para un cliente nuevo.
- [ ] La fila muestra nombre comercial, número de venta y campo editable de importe o porcentaje.
- [ ] La fila de empresa no puede eliminarse mientras la cartera siga siendo empresarial.
- [ ] Empresa y vendedores humanos pueden compartir la venta y la suma debe cerrar exactamente.
- [ ] El ticket guarda tipo, identificador, nombre e importe de cada participante.
- [ ] El número comercial puede configurarse sin convertir a la empresa en empleado.
- [ ] La empresa nunca aparece en Clock In, accesos ni búsqueda general de empleados.
- [ ] Editar un ticket empresarial no elimina ni transforma su participación de empresa.
- [ ] Cambiar la configuración actual de la empresa no modifica el historial anterior.

## 46. Distribución adaptable de selectores de próxima cita

- Los campos `Servicio`, `Día`, `Sucursal` y `Espacio disponible` se adaptan al ancho real del panel de agenda y no únicamente al ancho total de la pantalla.
- En un panel amplio pueden mostrarse cuatro campos por fila. Cuando el espacio útil del modal disminuye, pasan automáticamente a dos columnas y, en una ventana angosta, a una sola columna.
- Cada campo conserva `min-width: 0`, ocupa como máximo el ancho de su columna y recorta con puntos suspensivos únicamente el texto largo; el icono de calendario y la flecha del selector permanecen visibles.
- El selector de fecha nunca se monta sobre el servicio ni sobre la sucursal. La cuadrícula puede aumentar su altura y desplazarse verticalmente dentro del checkout sin generar desplazamiento horizontal.
- La misma regla adaptable aplica a la próxima sesión de membresía y a la cita de cortesía de una clienta nueva.

### 46.1 Criterios de aceptación

- [ ] En el ancho normal del checkout los cuatro campos se muestran como una cuadrícula de dos por dos sin superponerse.
- [ ] Al ampliar suficientemente el panel pueden mostrarse los cuatro campos en una fila.
- [ ] En una ventana angosta cada campo ocupa una fila completa.
- [ ] Un nombre largo de membresía se trunca dentro de su selector y no empuja el campo `Día`.
- [ ] El calendario, los selectores y sus iconos permanecen visibles y utilizables sin desplazamiento horizontal.
