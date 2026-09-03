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
- Orden de referencia observado después del ajuste: `Inventario`, `Pedido sucursales`, `Almacén matriz`, `Proveedores`, `Catálogo`, `Movimientos`, `Paquetes y promociones`.

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
- [ ] El selector de cumpleaños permanece dentro del modal.
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
