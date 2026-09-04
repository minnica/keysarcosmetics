# Cosmetics Platform — CLAUDE.md

> Fuente principal de contexto del proyecto. Leer antes de hacer cambios.

---

## Descripción del proyecto

Ecosistema de apps web internas + landing page para empresa de cosméticos.
Monorepo con Turborepo + pnpm workspaces.
Todas las apps son internas (detrás de login), excepto `landing` que es pública con SEO.

---

## Identidad de marca

```text
Introducciónn
Keysar Cosmetics nace con el propósito de redefinir la bel-
leza desde una visión sofisticada, minimalista y consciente.
Este manual de marca es la guía fundamental que asegura
la coherencia visual y conceptual de nuestra identidad en
todos los puntos de contacto de la marca.
Aquí encontrarás los lineamientos esenciales para el uso
correcto del logotipo, la paleta cromática, las tipografías y
demás elementos visuales. Cada decisión estética ha sido
cuidadosamente diseñada para transmitir elegancia, con-
fianza y feminidad moderna: los pilares que definen la
esencia de Keysar.
Nuestro objetivo es mantener una presencia visual fuerte,
reconocible y alineada con los valores que nos inspiran: cali-
dad, autenticidad y sofisticación. Este manual es una herra-
mienta viva que garantiza que todos los esfuerzos de co-
municación y diseño reflejen fielmente nuestra identidad,
sin importar el medio o el contexto.El logo de Keysar Cosmetics está construido a partir de un
monograma tipográfico que fusiona las letras “L” y “K”, cre-
ando una forma única, sofisticada y memorable. Esta com-
binación representa más que iniciales: simboliza el balance
entre lo clásico y lo moderno, entre estructura y dinamismo.
La “L” aporta verticalidad y sobriedad, mientras que la “K”
introduce un gesto visual distintivo y fluido. Juntas forman
un símbolo elegante que funciona como sello visual para la
marca, fácilmente aplicable en distintos formatos y escalas.
El nombre de la marca está compuesto en una tipografía
serif en mayúsculas, con un alto espaciado entre letras. Esta
decisión estilística refuerza la percepción de lujo, sofisticaci-
ón y atemporalidad, manteniendo una lectura clara, serena
y profesional. La tipografía actúa como contraparte sobria
del isotipo, logrando un equilibrio visual refinado.
Dorado/beige suave: transmite lujo sutil, estabilidad y con-
fianza.
Rosado nude o palo de rosa: sugiere feminidad contempo-
ránea y sensibilidad sin caer en clichés.
Gris antracita y blanco marfil: aportan contraste, equilibrio
visual y aplicabilidad en diversos fondos.
Esta combinación posiciona la marca en el segmento pre-
mium, con un enfoque minimalista y estético.
Paleta Complementaria
La marca se enriquece con una paleta secundaria que in-
cluye tonos azules y verdes suaves:
Paleta PrincipalAzules claros: inspiran frescura, limpieza y serenidad.
La identidad visual se sostiene en una paleta cromática
neutra y elegante, donde predominan:Verdes oliva y salvia: evocan naturalidad, sostenibilidad y
salud.Estos tonos complementarios permiten extender la identi-
dad visual hacia líneas específicas de productos (dermocos-
mética, natural, hidratación), reforzando el concepto de bel-
leza consciente y bienestar integral.
Posicionamiento y Valores
El conjunto de elementos construye una marca que se co-
munica desde el detalle y la intención. El diseño visual ex-
presa valores como calidad, confianza, exclusividad, sensibi-
lidad estética y consciencia. Es una identidad pensada para
un público femenino sofisticado, exigente y conectado con
el diseño y el autocuidado.
```

### Resumen ejecutivo

- Marca con enfoque sofisticado, minimalista y consciente.
- La identidad busca transmitir elegancia, confianza y feminidad moderna.
- El isotipo se basa en un monograma tipográfico que fusiona `L` y `K`.
- La tipografía principal es serif, en mayúsculas y con alto espaciado entre letras.
- La paleta principal privilegia dorados/beige suaves, rosados nude, gris antracita y blanco marfil.
- La paleta complementaria incluye azules y verdes suaves para líneas como dermocosmética, natural e hidratación.
- Los valores centrales son calidad, autenticidad, sofisticación, sensibilidad estética y consciencia.

---

## Apps del monorepo

| App           | Tipo                    | Puerto dev | Descripción                                             |
| ------------- | ----------------------- | ---------- | ------------------------------------------------------- |
| `landing`     | Next.js                 | 3000       | Página pública con SEO                                  |
| `envelope`    | Next.js                 | 3001       | Control de ventas por sucursal (reemplaza sobre físico) |
| `payroll`     | Next.js                 | 3002       | Administración de nómina                                |
| `crm`         | Next.js                 | 3003       | Gestión de mensajes: WhatsApp, Messenger, Instagram     |
| `scheduler`   | Next.js                 | 3004       | Agenda de citas con notificaciones y recordatorios      |
| `pos`         | Electron + React + Vite | 3005       | Punto de venta offline con hardware                     |
| `finance`     | Next.js                 | 3006       | Control financiero, rentas, deuda y socios              |
| `hr`          | Next.js                 | 3007       | Recursos Humanos, turnos, vacaciones y expedientes      |
| `backend/api` | Express                 | 4000       | API REST compartida                                     |

## Estado actual de `apps/pos`

- La Fase 6 de `PLAN_BACKEND_POS.md` quedó completada en repositorio el 2026-09-03 mediante la migración aditiva `20260903050000_add_pos_offline_sync`. `PosSyncCursor` y `PosSyncOperation` conservan en PostgreSQL el UUID, `Idempotency-Key`, hash de payload y secuencia de cada terminal; sus campos de identidad son inmutables y las filas no se eliminan. `POST /api/pos/sync/push` revalida al conciliar la credencial habilitada, identidad, terminal, sucursal, permisos, esquemas, catálogo, precios mínimos e inventario, y mantiene los rechazos como `CONFLICT` auditables.
- Electron guarda la caché y el outbox en SQLite dentro del proceso principal, con WAL, `synchronous=FULL` y asignación de secuencia bajo `BEGIN IMMEDIATE`. Bootstrap y operaciones se cifran con AES-256-GCM; una clave aleatoria de 256 bits queda envuelta por `safeStorage` y sólo main puede abrirla. El secreto de terminal y los grants no cruzan al renderer. El preload expone únicamente login, encolado, estado, sync y logout; `nodeIntegration` sigue desactivado, con `contextIsolation` y sandbox activos. Electron 35 es el mínimo del proyecto porque el repositorio usa `node:sqlite` del Node.js incorporado.
- El navegador usa IndexedDB y Web Crypto: la clave AES-GCM es no exportable, el PIN se verifica con PBKDF2 y los payloads sólo se descifran para conciliarlos. `GET /api/pos/sync/bootstrap` cachea catálogo publicado y mínimos, paquetes, pagos, vouchers, fuentes, configuración de ticket, vendedores, ubicaciones/saldos, jornada, tickets, permisos, sucursal y terminal junto con un grant firmado. Sólo credenciales con `offlineEnabled` reciben la caché; el grant dura 72 horas por defecto y se configura con `POS_OFFLINE_GRANT_EXPIRES_IN`.
- En modo API, la operación offline se limita a login cacheado, apertura/conteos no omitidos, venta —con citas y cortesías dentro del ticket—, abonos de apartado, vouchers y cierre local autorizado por una credencial master offline vigente. Cada confirmación se escribe cifrada antes de cambiar la UI y conserva `PENDING/SYNCING/SYNCED/ERROR/CONFLICT`; también guarda el grant del actor que la originó, de modo que otra sesión no hereda su autoría. Recuperar red reenvía el mismo UUID, secuencia e idempotencia, reproduce resultados ya confirmados, devuelve a `PENDING` las operaciones de un lote que el servidor todavía no procesó y nunca borra conflictos. Catálogo, clientes administrativos, permisos, configuración, bodega, ajustes, costos y omisiones de conteo permanecen online.
- El cierre local de la Fase 6 verificó ambos schemas Prisma sincronizados y válidos, lockfile offline reproducible, type-check de types/API client/API/POS, lint y build del API, build Vite de renderer/main/preload y 42 pruebas unitarias. La migración no se aplicó a development o producción; el ensayo de interrupción real con binario instalado y PostgreSQL desechable corresponde al piloto de la Fase 8.
- La Fase 5 de `PLAN_BACKEND_POS.md` quedó completada en repositorio el 2026-09-03 con la migración aditiva `20260903040000_add_pos_business_day_cash`. `PosBusinessDay` es única por sucursal/fecha operativa, guarda apertura, conteo final, corte y snapshot de conciliación. La combinación de clave única y advisory lock evita que dos terminales abran o cierren jornadas duplicadas; una jornada `CLOSED` no se reabre ni se edita. La migración no inserta datos mock ni se aplicó a development o producción durante la implementación.
- `/api/pos/business-days/*`, `/attendance`, `/expense-types`, `/expenses`, `/dashboard` y `/reports/x-report` implementan jornada, asistencia, caja y consulta ejecutiva. Las mutaciones de jornada, asistencia y gastos mantienen `Idempotency-Key`; omitir conteo, cerrar día, corregir o anular gasto consumen una autorización master opaca, vinculada a terminal y entidad. La apertura/cierre conserva el filtrado de conteo ciego: sin `INVENTORY_AUDIT` sólo revela coincidencia, y costos sólo con master o `REPORTS_COSTS`.
- Cada gasto genera `PosCashExpense` y un `PosCashMovement` append-only. Una corrección o anulación posterior no altera la jornada cerrada: crea una compensación en la fecha actual y mantiene el folio/documento original para auditoría. Al cerrar jornada se termina en el mismo commit toda asistencia abierta con motivo `CLOSE_DAY`; ventas, abonos, entregas, revisiones y cancelaciones requieren una jornada abierta para la fecha actual.
- En modo API, el renderer resuelve la jornada al restaurar sesión, abre/cierra contra servidor, envía conteos, usa Clock In/Out real, hidrata Cash Manager y tipos de gasto, y consulta los totales confirmados en Dashboard/X-Report. El empaquetado de Electron no se completó sólo porque el sandbox no permite crear la caché global de Electron; type-check y las compilaciones Vite de renderer, main y preload sí terminaron.
- La Fase 4 de `PLAN_BACKEND_POS.md` quedó completada en repositorio el 2026-09-03 mediante la migración aditiva `20260903030000_add_pos_tickets_checkout_projection`. `PosTicket` es la fuente canónica de la venta y conserva líneas/snapshots, vendedores, pagos, apartados, adeudos, entregas, citas, cortesías, eventos y vouchers. La migración agrega folios mediante secuencias, protege el historial financiero y las ventas legacy proyectadas con triggers append-only, no inserta datos mock y no se aplicó a development o producción durante la implementación.
- `backend/api/src/services/pos-tickets.ts` calcula importes en centavos: mínimo combinado, SPARE, descuento limitado al SPARE, IVA incluido y paquetes completos al precio/vigencia publicados. Checkout solicita primero `/api/pos/tickets/quote` y muestra ese total; si el precio capturado queda bajo el piso combinado, un operador no master debe obtener una autorización `SALE_BELOW_MINIMUM` de un solo uso. Crear el ticket vuelve a cotizar y valida identidad, sucursal, catálogo, vendedores, formas de pago y autorización dentro de la transacción `Serializable` idempotente.
- Crear una venta confirma en un solo commit cliente/cartera, ticket y snapshots, reparto de vendedores, citas/cortesías, cobro, apartado, ledger de inventario, adeudos y proyección compatible. Cada operación efectivamente cobrada genera `Venta/VentaDetalle` y `PosLegacySaleProjection`, repartidas por mayor residuo para que vendedores, métodos y total coincidan al centavo. Los abonos proyectan sólo el importe recibido; reembolsos y cancelaciones generan filas negativas compensatorias y nunca reescriben el cobro original.
- Los productos entregados sin existencia descuentan el total, permiten saldo negativo y generan un adeudo marcado como ya comprometido. Un producto de apartado todavía no entregado crea un adeudo no comprometido y descuenta inventario exactamente una vez al registrar la entrega. Revisiones, cancelaciones y devoluciones requieren autorización master ligada al ticket y agregan eventos/snapshots append-only; la devolución física crea un movimiento `RETURN` y las decisiones de regalo/cortesía quedan dentro del evento.
- `/api/pos` publica vendedores de venta, tickets/cotización, apartados/abonos, adeudos/entregas y vouchers/impresiones. En modo API, `apps/pos` carga catálogo, paquetes publicados, vendedores, formas de pago, tickets, citas, apartados, adeudos, clientes y vouchers; la búsqueda de cliente en Checkout consulta el directorio paginado. Sale guarda en backend, Receipts imprime el DTO confirmado y registra impresiones de voucher, y Mis ventas/expedientes se derivan de los tickets reales permitidos por sucursal y rol.
- El cierre local de la Fase 4 verificó schemas Prisma sincronizados y válidos, type-check de `@cosmetics/types`, API client, API y POS, lint del API, 39 pruebas unitarias, build del API y build Vite/Electron. No se ejecutaron migración ni pruebas HTTP contra PostgreSQL porque el workspace no dispone de una base desechable/development autorizada; esa comprobación sigue siendo obligatoria en la Fase 8.
- La Fase 3 de `PLAN_BACKEND_POS.md` quedó completada en repositorio el 2026-09-03 mediante la migración aditiva `20260903020000_add_pos_inventory_warehouse`. Incorpora ubicaciones por sucursal y bodega matriz, saldos versionados, ledger append-only, lotes de ajuste, conteos, pedidos de bodega, eventos, notificaciones con lectura individual e idempotencia durable. La migración deriva ubicaciones de las sucursales existentes, pero no inserta productos o movimientos mock, no toca `Venta`/`VentaDetalle` y no se aplicó a development o producción durante la implementación.
- Las mutaciones de inventario y bodega se ejecutan con aislamiento `Serializable`; una misma llave UUID conserva y reproduce su respuesta sin duplicar efectos. Saldos, versiones, ledger, transición, evento y notificación cambian en el mismo commit. Las líneas del ledger, los conteos y los eventos de pedidos tienen protección append-only en PostgreSQL; cancelar un lote aplicado o regresar un envío crea una reversa compensatoria.
- `/api/pos/inventory/*` ofrece ubicaciones, saldos, movimientos paginados, lotes y conteos. Los conteos sin `INVENTORY_AUDIT` sólo devuelven cantidad capturada y coincidencia; esperado, diferencia y notas permanecen en respuestas auditadas, y los costos exigen además master o `REPORTS_COSTS`. Las rutas validan el alcance de la sucursal fija en servidor.
- `/api/pos/warehouse/requests` implementa solicitudes `PRODUCT`, `TESTER` y `SUPPLY`, además de resurtidos por proveedor. La primera y segunda aprobación deben pertenecer a credenciales distintas. La segunda aprobación envía y descuenta matriz atómicamente; recibir productos suma inventario vendible, mientras testers e insumos sólo registran consumo. Retorno y cancelación conservan folio y trazabilidad.
- Las notificaciones de bodega se crean dentro de cada transacción, se filtran por sucursal/permiso y guardan lecturas por credencial. `createPosApiClient` expone inventario, conteos, bodega y notificaciones; en modo API el renderer sustituye los estados de estos cuatro módulos por DTOs reales y envía sus operaciones al backend. La edición de una solicitud real ya emitida se resuelve cancelándola y creando un snapshot nuevo, no reescribiendo sus partidas.
- La Fase 2 de `PLAN_BACKEND_POS.md` quedó completada en repositorio el 2026-09-03 con la migración aditiva `20260903010000_add_pos_catalog_customers_assets`. Incorpora catálogo/taxonomías/beneficios, visibilidad por sucursal, historial inmutable de precios, activos, clientes/fuentes/cartera, políticas POS de pago, configuración de ticket, campos de cliente, cortesías, vouchers, proveedores, listas versionadas, paquetes y competencias. No inserta datos mock ni modifica las ventas legacy; no se aplicó a development o producción durante la implementación.
- Las rutas de esta fase viven en `/api/pos` y exigen sesión POS y el grant de su módulo: catálogo, clientes, proveedores, pagos, configuración, vouchers, listas, paquetes y competencias. `CatalogItemPrice` registra cada cambio de precios/costos/IVA en vez de reescribirlo, los objetos con efectos históricos usan soft delete y los costos se eliminan de las respuestas salvo para master o `REPORTS_COSTS`. La búsqueda de clientes rechaza términos vacíos y pagina el resultado.
- Los activos de catálogo se guardan mediante Supabase Storage en `POS_ASSET_BUCKET` (por defecto `pos-assets`) y conservan sus metadatos en `CatalogAsset`; sólo se aceptan JPEG, PNG, WebP o GIF de hasta 5 MB. Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; una imagen inexistente usa el fallback relativo del POS.
- `createPosApiClient` expone las lecturas tipadas de catálogo, clientes, fuentes, proveedores, vouchers y ticket. En modo API, el renderer hidrata catálogo, proveedores, vouchers y configuración de impresión al abrir sesión, respetando los permisos efectivos; las mutaciones visuales restantes se sustituyen gradualmente en las fases posteriores y los datos mock no se migran.
- La Fase 1 de `PLAN_BACKEND_POS.md` quedó completada en repositorio el 2026-09-03 mediante la migración aditiva `20260902010000_add_pos_security_and_terminals`. Los modelos nuevos son `PosCredential`, `PosMasterCredential`, `PosBranchProfile`, `PosTerminal`, `PosPermissionNode`, `PositionPosPermission`, `MasterAuthorization` y `AuditLog`. La migración sólo siembra los nodos técnicos del árbol: no crea credenciales, terminales, perfiles de sucursal ni grants para empleados o puestos existentes. No se aplicó sobre development ni producción durante la implementación; esa ejecución requiere el flujo protegido y una BD autorizada.
- El login real vive en `/api/pos/auth/login` y usa alias normalizado, PIN bcrypt, huella HMAC con `POS_PIN_PEPPER`, bloqueo temporal tras cinco intentos, un JWT POS firmado con `POS_JWT_SECRET` y una terminal activa con secreto propio. El middleware vuelve a resolver en servidor credencial, identidad activa, versión, terminal, sucursal y permisos vigentes en cada petición; cambiar permisos tiene efecto inmediato y una ruta sin grant devuelve 403. Las autorizaciones master son tokens opacos de cinco minutos ligados a terminal, propósito y entidad; se guarda sólo su SHA-256 y cada acción los consume una vez. PIN, secreto, hash y token master no se serializan ni se escriben en logs.
- El bootstrap inicial se hace sin seeds operativos: un `SUPER_ADMIN` autenticado con el JWT compartido puede crear o actualizar un perfil POS de sucursal, provisionar exactamente una credencial para `Empleado` o `Usuario`, registrar una terminal, activarla o revocarla y rotar su secreto mediante las rutas `/api/pos/provision/*` y `/api/pos/terminals`. Toda terminal nueva queda `PENDING` hasta su activación explícita; el secreto sólo aparece en la respuesta de alta/rotación. Configurar el backend con `POS_PIN_PEPPER`, `POS_JWT_SECRET` y opcionalmente `POS_JWT_EXPIRES_IN`; configurar el proceso principal de Electron con `POS_API_URL`, `POS_TERMINAL_CODE` y `POS_TERMINAL_SECRET`.
- `packages/api-client` expone `createPosApiClient`. Con `VITE_POS_DATA_MODE=api` —valor recomendado y default cuando no se fuerza `mock`— el login de Electron se ejecuta por IPC en el proceso principal para que `POS_TERMINAL_SECRET` no entre al bundle del renderer. El renderer guarda únicamente `pos_access_token` en `sessionStorage`, restaura la sesión con `/auth/me`, usa la sucursal fija devuelta por la terminal, filtra la navegación por grants y carga `Employees` desde `/api/pos/access/bootstrap`. Los puestos y empleados se siguen administrando en sus catálogos canónicos; desde POS se editan credenciales y permisos existentes con una autorización master de un solo uso.
- La Fase 0 de `PLAN_BACKEND_POS.md` quedó completada el 2026-09-02 sin crear rutas POS, migraciones, seeds ni mutaciones de datos. El contrato público vive en `packages/types/src/pos.ts` y los validadores de frontera previos a las rutas viven en `backend/api/src/contracts/pos.contracts.ts`. Todos los importes POS se representan como strings decimales de dos posiciones, fechas como ISO UTC y la fecha operativa como `YYYY-MM-DD`; los DTOs con costo son tipos explícitos y sólo se podrán serializar con permiso de costos en fases posteriores.
- El inventario previo al despliegue POS se ejecuta con `pnpm --filter @cosmetics/api pos:diagnose`. El script `backend/api/scripts/diagnose-pos-data.ts` usa exclusivamente consultas `SELECT`/`COUNT` y reporta sucursales, empleados, puestos, usuarios, métodos de pago, ventas, asignaciones pendientes, referencias huérfanas y ventas legacy sin detalle. Se ejecutará primero sobre development y sólo sobre producción con autorización explícita; no sustituye las migraciones ni corrige datos.
- La arquitectura POS aprobada conserva PostgreSQL/Supabase como fuente central, SQLite únicamente dentro del proceso principal de Electron e IndexedDB/Web Crypto en navegador. POS será dueño de sus entidades `Pos*`, catálogo operacional, inventario, bodega, tickets, jornada y outbox; reutiliza `Sucursal`, `Empleado`, `Position`, `Usuario` y `MetodoPago`. `Venta`/`VentaDetalle` permanecen una proyección compatible de cada cobro POS para Envelope/Payroll y nunca la fuente de verdad del ticket.
- La autorización POS se resolverá del lado servidor por identidad, terminal asignada, sucursal y permisos POS independientes. Los conteos ciegos no exponen esperado/diferencia y los costos sólo pueden aparecer en DTOs autorizados por `REPORTS_COSTS`; `INVENTORY_AUDIT` habilitará los comparativos de inventario. Una jornada se cierra de forma inmutable y todo ajuste posterior se registra como compensación de la fecha actual.

### Referencia funcional de los módulos mock pendientes

Las reglas visuales y operativas siguientes conservan la referencia necesaria para las Fases 2–7. Cuando mencionen el acceso master estático o credenciales demostrativas describen el comportamiento anterior a la Fase 1: esos valores ya se retiraron del código ejecutable y no deben reintroducirse. En modo API prevalecen siempre la identidad, terminal, sucursal, grants y autorizaciones resueltas por el backend.

- `Inventory` separa ahora `Almacén matriz` y `Pedido sucursales` como dos ventanas y permisos de módulo independientes. Ambas reutilizan `WarehouseView` con alcance `MATRIX` o `BRANCHES` y comparten exactamente `warehouseMovements`, existencias, callbacks de aprobación y folios: una solicitud creada desde sucursal aparece inmediatamente en matriz y continúa por creación, envío, recepción, cancelación o reversión sin duplicar datos. Matriz muestra sólo stock central, compras a proveedores, entradas, solicitudes recibidas, envíos, listas de precios y reporte; sucursales abre directamente el pedido de productos, testers o insumos elegido desde el menú desplegable `Generar pedido` de Inventario, conservando sus métricas e historiales. La cabecera de matriz tiene una campana con el total en vivo de solicitudes `REQUESTED` y abre directamente su bandeja. Roles y `Employees` pueden otorgar acceso a `branch-inventory` de forma explícita.

- En modo API ya consumen backend login, sesión, sucursales, permisos, `Employees`, catálogo/clientes/activos, inventario/bodega, tickets/checkout/apartados/adeudos/citas/vouchers, jornada, asistencia y caja. Reportes/exportaciones, preferencias y las mutaciones administrativas restantes se completan en la Fase 7. `VITE_POS_DATA_MODE=mock` conserva la demo para comparación y su antigua cola `localStorage` queda aislada exclusivamente a ese modo; ningún dato demostrativo se migra a una BD operativa.
- El POS detecta los eventos `online`/`offline`, cambia a la caché autorizada sin perder la sesión operativa y sincroniza automáticamente al recuperar red. El encabezado y `Data update` muestran el estado real y el total durable pendiente; un ticket sólo cambia a sincronizado cuando el servidor devuelve `SYNCED`, mientras `ERROR` se reintenta y `CONFLICT` permanece visible y local para resolución.
- La navegación replica el menú operativo de referencia en un sidebar izquierdo ocultable con módulos tipo tarjeta e iconos grandes. `Sale` funciona como grupo desplegable y unifica cinco ventanas independientes sin perder funciones: `Venta`, `Mis ventas`, `Receipts`, `Customers` y `Close day`; el contador del carrito permanece en el encabezado del grupo. Al seleccionar la ventana `Venta`, el sidebar general se oculta por completo y la pantalla entra en modo enfocado con un catálogo lateral propio, lujoso y formal. Ese catálogo lista familias, categorías y marcas con su cantidad disponible; las selecciones pueden combinarse y actualizan inmediatamente las tarjetas con imagen. `Menú general` restaura el sidebar para cambiar de módulo, y volver a elegir `Venta` reactiva el modo enfocado. `Inventory` funciona como otro grupo desplegable con `Inventario` (lista administrativa, existencias y pedidos), `Catálogo` (consulta compacta), `Movimientos` (entradas, bajas, transferencias y aprobaciones), `Almacén bodega` (matriz, abastecimiento y surtido) y `Deal` (paquetes comerciales). Los grupos se comportan como acordeón: abrir o seleccionar una ventana de `Sale` contrae `Inventory`, y abrir o seleccionar una ventana de `Inventory` contrae `Sale`. La zona superior desplazable conserva `Citas`, `X-Report`, `Reports`, `Cash manager`, `Employees`, `Competition` y `Websites`; una zona de sistema independiente mantiene, en este orden, `Data update`, `Settings` y `Clock In`. La altura del sidebar termina naturalmente después de `Sistema` y la ubicación cuando hay pocos módulos; crece conforme se agregan opciones hasta el alto disponible y sólo entonces activa desplazamiento interno en la zona operativa. Los rieles de scroll permanecen transparentes y el indicador cambia automáticamente según la cantidad de módulos o contenido. El sidebar se ajusta fluidamente en escritorio, se contrae automáticamente a iconos al entrar en tablet o móvil (`<= 920 px`) y se abre como panel superpuesto cuando el operador lo solicita, sin quitar espacio al contenido; en móvil estrecho (`<= 640 px`) compacta nuevamente controles, encabezados y márgenes. `My Account` se retiró del sidebar y permanece como botón ejecutivo en la esquina superior derecha, inmediatamente debajo de `Terminal 01`. Las vistas operativas son mocks funcionales; los módulos todavía pendientes conservan estados de demostración explícitos.
- Los recursos públicos del POS (`logo.svg` e imágenes de `products`) usan rutas relativas `./...` en todos los datos mock y formularios. Esta convención es obligatoria para que la misma compilación funcione desde `http://localhost` y desde el protocolo `file://` de Electron sin imágenes quebradas.
- El encabezado del sidebar funciona como lockup principal de marca: reutiliza el monograma vectorial de alta resolución dentro de un sello marfil/dorado, presenta `KEYSAR` con la tipografía editorial Emofera y un descriptor compacto `COSMETICS · RETAIL`. Gradientes cálidos, línea dorada, volumen sutil y espaciado amplio refuerzan su apariencia premium sin perder legibilidad. Al contraer el menú, el monograma permanece visible sobre el control de apertura para conservar la identidad de Keysar en cualquier tamaño de pantalla.
- El POS inicia ahora en una pantalla neutral de acceso a software con reloj en tiempo real, empresa, alias y código. `Master Keysar / 2468` puede elegir cualquier sucursal activa; los usuarios comunes ingresan con su alias corto y sólo operan la ubicación fijada en la terminal. `Employees` permite al usuario master registrar y editar por separado el `Nombre para ticket`, que permanece visible en tickets, ventas y reportes, y un `Alias de acceso` único que sustituye al nombre completo como usuario de inicio de sesión; los registros históricos conservan el nombre embebido en cada ticket. El primer acceso de un vendedor crea su registro de `Clock In`; un usuario con acceso master nunca genera entrada ni salida de asistencia al iniciar o cerrar sesión. Antes de mostrar módulos obliga a capturar el conteo físico de apertura con foto y captura manual por producto: los campos no usan flechas ni selector incremental y aceptan exclusivamente números enteros. Para vendedores es un conteo ciego: oculta la existencia esperada y la diferencia numérica, pero valida cada captura con borde/número verde y paloma cuando coincide o rojo con el mensaje `Revisa tu inventario o vuelve a contar tu producto` cuando no coincide. Master o un rol con permiso `INVENTORY_AUDIT` ve el comparativo numérico completo. El recuadro de progreso de los conteos de apertura y cierre muestra dos barras en tiempo real contra el total de productos: porcentaje verde de conteo correcto y porcentaje rojo de error; ambas avanzan sólo con productos capturados y al finalizar suman 100%. El primer guardado de apertura o cierre abre una confirmación `¿Estás seguro de enviar estos datos?` antes de registrar la auditoría. Los conteos incluyen un recuadro de comentarios de hasta 500 caracteres. El encabezado de apertura/cierre incorpora padding interno, ajuste de línea y tipografía fluida; título, sucursal, usuario, instrucciones y progreso permanecen dentro de la tarjeta en escritorio, tablet y móvil. `Skip count` aparece exclusivamente para master tanto en apertura como en cierre. Al completar o saltar se crea una sesión `OPEN DAY` mock y se habilita el POS.
- `Dashboard` es una pantalla ejecutiva protegida por acceso master o por el permiso de módulo asignado al rol. Resume ventas, cobros, descuentos, gastos, vendedores y movimientos posteriores a la apertura. Master inicia con el alcance `General · todas las sucursales` y puede cambiar a una ubicación específica; cualquier usuario no master queda bloqueado a la sucursal fija de su sesión y no recibe ese selector. Cada alcance recalcula venta y porcentaje distribuido por vendedor, servicios vendidos, importe de servicios, cortesías, citas/próximas sesiones/clientas sin cita y total por método de pago. La trazabilidad separa `Entradas`, `Ventas`, `Demos`, `Bajas`, `Lost`, `Damage`, `Gift` y `Transferencias` en tiempo real. Un rol sin el permiso configurable `Conteo real de inventario` recibe únicamente la vista operativa por producto: confirma si el conteo fue registrado y muestra esos movimientos, pero nunca existencia física, esperado, diferencias, notas, errores ni costos. Master o un rol con `INVENTORY_AUDIT` accede al comparativo completo, productos discrepantes y colores rojos. Cuando existen diferencias aparecen descargas `Excel errores` y `PDF errores` preparadas como solicitud de reconteo de la sucursal; sólo incluyen productos con error. Las columnas monetarias y el impacto de la diferencia se agregan únicamente a master o usuarios con permiso de costos (`REPORTS_COSTS`/`canViewCosts`). El acceso a `Close day` exige primero un segundo conteo físico o un `Skip count` master. Después abre una vista enfocada y centrada sin sidebar ni encabezado operativo, manteniendo el resumen y el ticket térmico. `Cerrar día` abre una segunda autenticación por alias y código personal; sólo una combinación válida registra el nombre completo del responsable y la hora del corte, termina las asistencias abiertas y devuelve al login. El ticket muestra `AUDITORÍA DE INVENTARIO` únicamente a usuarios autorizados y sólo con productos discrepantes.
- El sidebar permanece abierto al seleccionar cualquier módulo y reinicia un temporizador de inactividad. Si no se selecciona otro menú durante 60 segundos se contrae automáticamente; el control de pin cancela esa contracción hasta que el operador lo desfija. Pulsar una opción desde el estado contraído vuelve a abrirlo. La visibilidad de `Dashboard` y del resto de módulos se calcula con los permisos del usuario de la sesión.
- `Sale` muestra productos y servicios mediante foto, nombre, SKU interno, familia, categoría, precio de lista y existencia/agenda. Las tarjetas conservan únicamente el SKU interno. Al seleccionar un producto o servicio, la ventana de captura sustituye ese SKU por la clave operativa café generada como `{familia}-{categoría}-{precio mínimo redondeado}` mediante `getSellerSku`; por ejemplo, `KSR-SER-001` con mínimo `$690` se presenta como `KSR-SER-690`, sin etiqueta de precio, símbolo de moneda ni texto que revele su significado. Esa ventana usa la presentación `Executive ledger`: panel lateral oscuro con marca, imagen compacta, producto, clave operativa, familia/categoría, precio de lista y existencia; el formulario claro mantiene precio, cantidad, comentarios, total y acciones sin modificar la navegación ni la paleta global. El editor está centrado y limitado a `840px`/`82dvh` en escritorio, con altura y espacios compactos; en tablet y móvil se convierte en una tarjeta vertical de hasta `560px`, resume el panel del producto y habilita desplazamiento interno sin salir del viewport. El campo `Precio de venta` conserva el vacío cuando se borra su contenido para permitir captura manual; mientras esté vacío muestra un guion en el total de línea y no permite añadir o guardar el producto. La búsqueda admite nombre, SKU interno y esa clave operativa codificada, y los filtros permiten elegir familia o categoría. Las imágenes representativas generadas para el catálogo viven en `apps/pos/public/products/`.
- `Inventory → Inventario` conserva el alta y edición administrativa de productos y servicios. El formulario incorpora `Descripción para catálogo`, beneficios separados por línea y el switch `Mostrar en catálogo`; si el artículo se publica exige descripción y al menos un beneficio. El switch sólo controla la vitrina para clientes y no modifica Sale, existencias ni tickets históricos. `Inventory → Catálogo` dejó de ser una tabla interna y funciona como libro digital de sólo visualización: agrupa artículos activos y publicados por familia, presenta fotografía, precio de venta, descripción, beneficios y numeración de páginas, no incluye descarga ni impresión, permite navegar por teclado/controles/índice y ofrece cuatro apariencias seleccionables (`Editorial Marfil`, `Noir Couture`, `Galería Mineral` y `Maison Rosé`) con adaptación completa a escritorio, tablet y móvil. `Presentar y bloquear` convierte la vista en una capa fija de pantalla completa que oculta toda navegación del POS, conserva el índice por familias y evita que el cliente salga del catálogo. La presentación inicia directamente con índice y libro, sin franja de marca ni texto de estado; un candado discreto integrado al extremo del índice abre la autenticación y sólo vuelve al sistema con alias y código de cualquier usuario activo o con el acceso master mock. En este modo el contenido se compacta por ancho y alto disponible, oculta por completo los rieles de desplazamiento internos y cambia página con una animación 3D direccional: la hoja avanza desde la derecha y regresa desde la izquierda.
- El POS completo usa temporalmente la capa visual reversible `Executive ledger`, activada mediante la clase `executive-ledger-theme` del `body` en `App.tsx`. La capa vive al final de `index.css` y transforma login, conteos, navegación, encabezados, Sale, dashboards, tarjetas, tablas, reportes, formularios y ventanas con carbón, marfil y bronce sin cambiar estructura, lógica ni datos. La iconografía de navegación conserva los símbolos Lucide existentes, pero usa superficies premium concéntricas, trazos uniformes, acentos de color por módulo y estados activos de alto contraste; los submenús cuentan con su propio contenedor compacto. Las acciones recurrentes de editar, borrar, eliminar, quitar, activar o inactivar se representan únicamente con iconos Lucide en botones cuadrados compactos; cada control conserva `aria-label` y tooltip, y el texto sólo permanece en confirmaciones o acciones principales cuando se necesita contexto adicional. La misma capa incorpora contención adaptable para encabezados, menús, formularios, tablas desplazables y diálogos entre `320px` y escritorio, evitando textos o controles fuera del viewport. Los diálogos vuelven a respetar el ancho específico de cada componente en vez de expandirse al ancho completo del viewport; las alertas de autorización de bodega usan una tarjeta de `520px` con resumen, confirmación, código y acciones compactas, y se apilan sin desbordamiento en móvil. Los nombres de producto usan `Emofera Regular` con jerarquía editorial en Sale, carrito, modal, catálogo, inventario y bodega. Para regresar al diseño anterior se debe retirar únicamente ese efecto/clase y el bloque CSS identificado como `Executive ledger theme`; el layout ejecutivo propio de `ProductDialog` puede revertirse por separado.
- El POS opera nuevamente con sus nombres y textos originales en español. Se retiró el selector `ES`/`EN` y la traducción automática para evitar términos mixtos o traducciones imprecisas en módulos y reportes; al iniciar también se elimina la preferencia legacy `keysar-pos-language`. Acceso, conteos, navegación, campos, dashboards, tickets y descargas ejecutivas permanecen en español. La interfaz continúa siempre en el tema claro `Executive ledger`; al iniciar se elimina además cualquier preferencia legacy `keysar-pos-color-mode` y la clase `executive-dark-mode`.
- Seleccionar un artículo abre un `Dialog` con cantidad, precio unitario, comentario y total de línea. El precio mínimo permanece oculto para el vendedor durante la captura; el precio de lista se puede incrementar sin límite. La autorización se evalúa contra el ticket completo: una línea puede bajar incluso a `$0` sin código cuando el subtotal de las demás cubre la suma de precios mínimos de todas las piezas. Sólo cuando el total propuesto queda debajo de ese piso combinado se exige el código administrativo mock `2468`. Cuando la reducción sí queda cubierta puede aparecer la leyenda verde `Reducción cubierta por el SPARE total del ticket`; `Settings → Impresión de ticket` incorpora un switch para mostrarla u ocultarla sin cambiar ninguna regla de precio o autorización. Quitar productos o cambiar cantidades tampoco puede eliminar la cobertura global sin una autorización ya registrada. Las líneas del ticket conservan edición de cantidad, precio o comentario y opción de baja.
- El carrito conserva por línea el `SPARE`, nombre operativo de la diferencia entre precio máximo y mínimo (`$1,000 - $500 = $500 de SPARE`). Al finalizar, el flujo permite buscar un cliente existente por nombre/teléfono o registrar uno nuevo con nombre, apellido, cumpleaños, género, teléfono, WhatsApp, procedencia (`Abordaje`, `Lead`, `Recomendado` o `Redes sociales`), empresa asignada y vendedor fijo obligatorio. `Settings → Cortesías de bienvenida` decide si el alta nueva exige agendar un paquete de cortesía; si el switch está apagado, Checkout omite por completo la pregunta, validación y mensaje y continúa el flujo normal. Cuando está activo admite `Facial`, `Corporal`, `Doble facial`, `Doble corporal` o `Mixto`, permite elegir las opciones publicadas y una predeterminada. Los paquetes simples generan un registro `COURTESY` y los dobles/mixtos generan exactamente dos; nunca se permiten más de dos cortesías. Cada servicio se agrega al ticket como línea `REGALO` de `$0`. Los leads y clientes de redes sociales conservan su cartera empresarial; los demás clientes nuevos guardan ese vendedor y lo precargan en compras futuras. Los clientes sin propietario activo permanecen en la cartera de `Keysar Cosmetics`. `Settings` determina cuáles campos son obligatorios durante la sesión.
- Antes del cierre se puede abrir un control compacto con icono para aplicar un descuento promocional por porcentaje o importe fijo. El descuento queda limitado automáticamente al SPARE global disponible: no puede reducir un ticket cubierto por debajo de la suma de mínimos ni profundizar un ticket bajo piso previamente autorizado; ticket, checkout, Receipts y X-Report conservan el importe final en pesos.
- El cierre de ticket funciona como un flujo bloqueado y compacto de cuatro pasos (`Cliente → Vendedores → Citas → Cobro`): el diálogo queda centrado, con ancho máximo controlado, altura natural para pasos breves y desplazamiento interno sólo cuando el contenido supera la pantalla; no permite avanzar mientras el paso vigente esté incompleto. Exige uno o más vendedores, precarga al vendedor ligado al cliente y ofrece `Añadir más vendedores a la venta`; la división puede capturarse por importe o porcentaje. Una clienta con vendedor activo conserva su propietaria sin opción de cambio para el operador común; la reasignación requiere autorización master mock `2468`. Si no tiene propietaria, el segundo paso obliga a elegir una y la agrega automáticamente a la división. Para una clienta existente, el paso `Citas` obliga a responder si ya cuenta con próxima sesión: si responde sí captura servicio, calendario, sucursal y horario y crea un registro `NEXT_SESSION`, y si responde no crea el histórico `NO_APPOINTMENT`. Para una clienta nueva cuya cortesía ya se agendó en el alta, el paso muestra la confirmación y permite continuar sin repetir la pregunta; conserva normalmente uno o dos registros `COURTESY` en ticket, expediente, dashboard y reportes, sin crear una próxima sesión duplicada ni una alerta negativa. El cobro admite múltiples métodos en el mismo ticket y permite registrar pago completo, apartado con abono o ticket pendiente de cobro. Cada pago no efectivo exige seleccionar tipo de tarjeta o banco y capturar exactamente cuatro dígitos de autorización; el botón final permanece bloqueado mientras falte cualquiera de los dos datos y el ticket conserva ambos como trazabilidad mock. Al crear un apartado se generan dos referencias irrepetibles: el folio `KSR-*` identifica la venta y un folio independiente `APT-*` identifica exclusivamente el cobro inicial, aunque ambos ocurran el mismo día. El comprobante desglosa una línea por forma de pago y muestra juntos folio de cobro, método, nombre de tarjeta/banco, autorización cuando existe e importe cobrado. `Settings` incluye una configuración protegida para usuario master (`2468`) que permite agregar métodos de pago durante la sesión.
- `Customers` conserva acceso protegido: permite localizar un registro por nombre, teléfono, vendedor, rango de compra o una/varias sucursales, ingresar la clave mock de un vendedor para limitar la consulta a clientes en cuyas ventas participó (`1101`, `2202` y `3303`), o usar la cuenta `Master Keysar` (`2468`) para abrir el directorio completo durante pruebas. El usuario común sólo ve `Visualizar`, `Imprimir` y `Mis clientes con adeudo`; este último filtra únicamente su propia cartera autorizada. El acceso master añade `Editar`, `Borrar` y el botón general `Clientes con adeudo`. Las acciones universales del directorio (`Visualizar`, `Imprimir`, `Editar`, `Borrar`) se presentan sólo como iconos con nombre accesible y tooltip nativo al apuntarlos. Ambos filtros de adeudo se combinan con vendedor y una, varias o todas las sucursales según el alcance permitido. Todo registro con saldo muestra una alerta roja e importe en la lista; al abrir el expediente se indica total por cobrar y número de tickets pendientes. Editar propaga nombre/teléfono a tickets, citas, apartados y entregas vigentes; borrar requiere doble validación con folio exacto y código master, retira únicamente el directorio activo y conserva los históricos. Los resultados muestran folio `CLI-*`, datos principales y compra acumulada sin duplicar los tickets `APT-*`; el expediente conserva procedencia, propietaria, tickets, productos, sucursal, citas/cortesías, apartados e historial cronológico de pagos. `Agregar pago` abre nuevamente el formulario completo de cobro, acepta uno o varios métodos, exige banco/tarjeta y autorización cuando aplica, recalcula saldo y abre automáticamente el comprobante imprimible. Al liquidarse, desaparece el botón y el apartado queda `LIQUIDADO` en verde.
- La cabecera de `Customers` exporta a Excel únicamente los registros autorizados por la búsqueda/rol y ofrece una carga masiva protegida por código master. El flujo descarga `public/templates/clientes-carga-masiva.xlsx`, valida nombre, apellido, teléfono, duplicados, cumpleaños, género, procedencia, empresa, vendedor y sucursal, muestra filas válidas/observaciones e inserta los registros aceptados sólo en la sesión mock. En la parte inferior, un dashboard protegido separa cumpleaños del día y del mes. Cada clienta puede abrir un estudio de felicitación con cuatro diseños (`Todo el año`, `Primavera`, `Verano`, `Invierno`), logo configurado, nombre, mensajes seleccionables/editables/nuevos/borrables, descarga PNG y envío mediante Web Share o fallback de WhatsApp; los mensajes se conservan en `sessionStorage` durante la sesión.
- `Settings` incluye un catálogo mock de procedencias para crear, renombrar, dar de baja lógica o restaurar opciones durante la sesión. El selector del alta de cliente usa únicamente opciones activas y guarda una copia del nombre vigente en el expediente; editar o borrar una procedencia afecta las altas posteriores sin reescribir clientes históricos. `Lead` y `Redes sociales` mantienen su regla de cartera empresarial. La configuración master de métodos de pago muestra una `X` en cada método activo: al borrar realiza baja lógica para retirarlo de nuevos cobros sin perder su etiqueta en tickets históricos, exige acceso master y nunca permite eliminar el último método disponible; capturar nuevamente el mismo nombre lo reactiva. El catálogo de motivos de inventario también incorpora una `X`: elimina la opción de nuevas capturas sin alterar el texto guardado en movimientos históricos y bloquea la eliminación del último motivo activo.
- `Settings` incluye además un administrador de inventario con pestañas `Familias`, `Categorías` y `Productos`. Cada registro permite editar nombre, activar o inactivar. Renombrar familia/categoría actualiza los productos y filtros operativos; renombrar producto propaga el nombre a carrito, tickets, apartados, movimientos, entregas, devoluciones y citas relacionadas. Inactivar familia o categoría oculta temporalmente sus productos de `Sale`, `Inventory` y nuevos movimientos sin cambiar el estado individual del producto; al reactivar reaparecen sólo los productos que continúan activos. Inactivar un producto sigue siendo baja lógica y nunca elimina tickets ni bitácora histórica.
- `Deal`, dentro del grupo `Inventory`, es un configurador mock protegido por el código master `2468`. Permite combinar al menos dos productos o servicios, asignar SKU, descripción, precio propio, vigencia y una o varias sucursales sin modificar precio mínimo, precio máximo ni costo de los artículos del catálogo. Guardar o editar siempre deja el paquete en `BORRADOR`; publicarlo requiere una segunda captura del código master. La publicación acepta un precio por debajo del mínimo conjunto, pero se bloquea cuando el precio no cubre el costo MXN registrado. Inactivar retira el paquete de `Sale` y conserva tickets, movimientos, costos y conteos históricos.
- `Reports` es un centro analítico mock independiente, sin las categorías `Online Reports` ni `Valor y cartera`. Su catálogo funciona como acordeón y mantiene abierta una sola familia a la vez: `Sales Reports` (detalle de ventas, productos vendidos, ventas por empleados y movimientos de efectivo), `Merchandise Reports` (resumen, movimientos, rentabilidad y demanda), `Employee Reports` (desempeño, días y productividad) o `Customer Reports` (comportamiento de clientes). `Movimientos de efectivo` cruza los cobros registrados en tickets con los gastos de Cash Manager y recalcula ingresos cobrados, gastos vigentes, flujo neto, gasto promedio, saldo pendiente y anulaciones; permite filtrar tipo de gasto, usuario, sucursal, forma de pago y periodo, conserva los folios anulados con impacto `$0.00` para auditoría y exporta el mismo detalle a Excel/PDF. Cada selección recalcula dashboard, gráficas CSS y tabla ejecutiva con filtros por rango de fechas, una/varias/todas las sucursales, vendedor, forma de pago, tipo de artículo y búsqueda contextual. `Detalle de ventas`, X-Report y sus descargas usan `SPARE` para la diferencia entre máximo y mínimo, sin confundirlo con el margen financiero de utilidad. Los nombres de clientes se distinguen como enlaces; al pulsarlos o usar el icono final de dashboard se abre un expediente integral con compras, fechas, productos, pagos, saldos, citas y alerta de tickets no liquidados. Las descargas aplican formato `$` sólo a columnas monetarias explícitas; tickets, días, unidades, visitas, clientes, citas y otros conteos permanecen numéricos. Todo se deriva de tickets, catálogo, clientes, citas, gastos y movimientos vigentes de la sesión, sin backend ni persistencia.
- Todas las listas operativas que representan reportes o históricos comparten un paginador inferior reutilizable: permite visualizar `20`, `40` o `60` registros por página, muestra el rango actual (`inicio–fin de total`), número de página y botones `Anterior`/`Siguiente`. Está integrado en Reports, Receipts, Customer Reports y expedientes, directorio de Customers, historial de movimientos, citas, Mis ventas/cartera, X-Report, facturación de My Account y bitácora de Clock In. Cambiar filtros, fechas, vendedor, sucursal, cliente, tipo de reporte u orden reinicia la lista en la primera página; Excel/PDF siguen exportando todo el conjunto filtrado y no solamente la página visible.
- En el carrito de `Sale`, el botón `Deal` aparece junto al control compacto de descuento. Abre únicamente paquetes publicados, vigentes y disponibles para la sucursal actual, muestra sus artículos, ahorro y cantidad de paquetes. Al agregarlo, el carrito lo presenta como grupo no editable por línea; el precio se distribuye internamente entre sus componentes sólo para cuadrar el ticket, sin escribir esos importes en el catálogo. Un descuento promocional adicional nunca puede reducir el paquete por debajo de su precio autorizado. El ticket guarda simultáneamente el resumen del Deal y todas sus líneas; los productos físicos descuentan inventario de forma normal, pueden generar existencia negativa y deuda de entrega, y cada movimiento conserva costo USD/MXN. Los servicios no afectan existencia. Cancelar el ticket revierte los mismos movimientos y excluye el paquete de los conteos activos.
- El dashboard de `Deal` contabiliza paquetes e ingreso del mes desde `Ticket.deals` y muestra ventas acumuladas por definición. Cada mes recalcula recomendaciones desde pares de artículos comprados en los mismos tickets; el precio sugerido usa el mínimo conjunto y un margen sobre costo, nunca se ofrece por debajo del costo registrado, y puede convertirse directamente en un nuevo borrador para autorización.
- `Competition` funciona como un tablero comercial calculado desde los tickets vigentes de la sesión: muestra líder, podio, clasificación completa, venta, tickets y progreso de meta. `Settings` incorpora un configurador protegido con el código master mock `2468` para crear, editar, activar, inactivar o retirar reglas por monto, producto, paquete completo o periodo, con fechas y alcance por sucursal. Las competencias por producto cuentan unidades del artículo elegido; las de paquete cuentan únicamente tickets que incluyan todos los artículos seleccionados; monto y periodo usan la división monetaria real de cada vendedor. El tablero cambia de competencia desde su selector y se recalcula automáticamente al crear o editar tickets.
- `Citas` funciona como dashboard y bitácora completa: inicia con registros mock y conserva los creados desde checkout; presenta métricas de registros, citas confirmadas, clientas sin facial y clientas únicas, distribución por sucursal, alertas agrupadas por vendedor y filtros para `Cortesías`, `Próximas sesiones` o `Sin cita`. Responder `No por ahora` en el paso de próxima sesión crea un registro `NO_APPOINTMENT` ligado al ticket y a todos los vendedores de la venta para conservar también el historial negativo.
- `Mis ventas` exige la clave personal de un vendedor activo y filtra estrictamente los tickets donde participa. Permite definir un periodo con calendarios desde/hasta, consultar folio, productos, cliente, teléfono, monto asignado, pagos, apartados, saldo y vista imprimible del ticket. La pestaña `Mis clientes e historial` sólo expone clientes cuyo `ownerId` corresponde al vendedor autenticado, ofrece alternar entre toda su cartera o quienes compraron en el periodo y muestra información de contacto, total histórico, cobrado, pendiente/apartado y acceso a cada ticket. El perfil de cliente lista sus apartados, artículos entregados, historial de abonos y saldo; permite registrar múltiples pagos en fechas distintas y dividir cada abono entre varios métodos configurados, genera para cada operación un folio exclusivo `APT-{timestamp}-{uuid}` y abre su ticket imprimible. Cada `APT-*` conserva su propia fecha de ingreso, suma al cobro y a los métodos de pago de dashboards/reportes, nunca crea una segunda salida de producto y reduce el saldo del `KSR-*` relacionado. El ticket térmico del abono incluye el historial completo en orden cronológico con folio, fecha, métodos, banco/tarjeta, autorización, monto y saldo posterior. Cuando el importe captura la liquidación, vuelve a preguntar por cada producto pendiente si la clienta lo recibe ese día: lo marcado se entrega y lo no marcado conserva alerta/deuda. Una alerta identifica apartados activos con más de cuatro meses y otra muestra las clientas propias que terminaron su ticket sin próxima facial para seguimiento del vendedor.
- Cada compra genera un folio dinámico de alta entropía (`KSR-{timestamp}-{uuid}`) y abre un ticket final imprimible de 80 mm, monocromático, con logo, empresa, sucursal, dirección, productos, pagos, saldos, políticas y mensaje final. `Settings` permite adjuntar un logo PNG/JPG/WEBP/SVG de hasta 2 MB, conservar una URL opcional y ajustar su ancho entre 40 y 140 px; tickets, expedientes imprimibles, X-Report y cortes lo limitan automáticamente al formato permitido. También permite editar textos y decidir por separado si se imprimen nombre/teléfono del cliente y nombre del vendedor. El alta/edición de producto incluye un switch de IVA 16% incluido: el importe capturado permanece como precio final y se guarda su base e impuesto (por ejemplo, `$1,500.00 = $1,293.10 + $206.90`). Cada venta conserva esos importes fiscales aun con descuento; X-Report, cierre, Excel y PDF muestran precio completo, precio sin IVA e IVA. Otro switch de impresión decide entre mostrar el desglose fiscal o la leyenda `Todos nuestros precios ya incluyen IVA`. `Close day` muestra antes de cerrar y en su ticket térmico las clientas sin próxima facial, agrupadas bajo cada vendedor participante en la venta.
- Todo acceso abierto con el código master mock se bloquea automáticamente después de 3 minutos sin interacción de puntero, teclado, toque o desplazamiento. El bloqueo cubre directorio master, historial de Receipts, X-Report, My Account, costos y configuración protegida de métodos de pago, competiciones y Deal, y limpia filtros sensibles cuando corresponde.
- `Receipts` abre por defecto en modo operativo y sólo muestra los tickets cuya fecha de negocio corresponde al día vigente en `America/Mexico_City`; el usuario común puede consultar, buscar e imprimir, pero no ve calendario, selector de sucursal, exportación, edición ni cancelación. El código de `Master Keysar` (`2468`) habilita durante la sesión el historial completo, calendario de búsqueda por fecha, selector de una sucursal o `Todas las sucursales`, exportación y acciones administrativas de editar/cancelar. Fecha, sucursal y texto se combinan sobre el mismo conjunto; al bloquear el historial vuelve al día vigente y limpia todos los filtros. El dashboard de venta, métodos de pago y cobranza siempre se calcula sobre el conjunto visible y no revela SPARE ni precio mínimo. La edición integral permite cambiar cliente, vendedores, productos/servicios, cantidades, precios, descuento, estado de cobro (`Pagado`, `Apartado` o `Pendiente`), monto cobrado y método de pago. Al guardar recalcula de forma transaccional subtotal, total, saldo, división, inventario entregado, faltantes, apartado, abonos relacionados, citas y expedientes; también reactualiza automáticamente `Receipts`, `Customers`, `Mis ventas`, `X-Report`, `Close day` y sus dashboards sin duplicar ingresos de los abonos. Convertir una venta en apartado crea o actualiza el expediente de apartado, liquidarla lo cierra y dejarla pendiente retira el apartado operativo sin borrar el ticket histórico. Profundizar un ticket por debajo del mínimo combinado exige el código master. El SPARE sólo aparece en reportes administrativos después de ingresar el código master. `Close day` genera un ticket de 80 mm imprimible con productos vendidos, entradas y bajas de inventario, venta por vendedor, corte por método de pago, descuentos, cobro y saldos.
- `X-Report` requiere el código master `2468` y funciona como dashboard diario en tiempo real para todas las sucursales registradas en el inventario. Usa la fecha operativa de `America/Mexico_City` y recalcula con cada ticket, pago o movimiento de la sesión. Resume venta, ingresos cobrados, tiendas activas, vendedores con venta, unidades vendidas, bajas y SPARE; detalla por sucursal venta, cobro, tickets, unidades, vendedores, bajas y existencia; además muestra rankings de vendedores y productos/servicios, entradas, transferencias, bajas y el corte por método de pago. Conserva debajo el SPARE administrativo por ticket. En la misma pantalla, `Reporte general de operaciones` permite elegir con dos calendarios un periodo inclusivo desde/hasta y seleccionar una sucursal o todas. Los botones `Excel` y `PDF` descargan un único reporte ejecutivo con resumen, operación por sucursal, tickets activos/cancelados, vendedores, productos/servicios, métodos de pago y movimientos de inventario; ambos formatos respetan exactamente los mismos filtros. Los mocks principales de tickets y movimientos se fechan dinámicamente en la jornada vigente para permitir probar el tablero sin backend.
- `Cash Manager` registra gastos operativos mock mediante un campo libre donde el vendedor escribe su nombre de usuario y después captura su código personal (`1101`, `2202` o `3303`); no expone una lista de empleados en el acceso. La identificación acepta el nombre completo, el primer nombre sin distinguir mayúsculas ni acentos o el identificador interno. `Master` o `Master Keysar` con `2468` abre directamente la vista administrativa, y un código master delegado conserva el mismo acceso cuando se usa con el nombre del empleado autorizado. Al pulsar `Registrar gasto` abre primero una advertencia explícita: todos los movimientos deben estar autorizados por Administración; identifica automáticamente al usuario y la sucursal fija, y exige nuevamente el código del empleado o uno master antes de abrir la captura. Sólo después habilita tipo de gasto, monto, fecha, sucursal, concepto y comentario. Cada alta recibe folio irrepetible `GTO-*` y alimenta un dashboard de monto vigente, número de movimientos, promedio, mayor gasto y distribución por tipo. El empleado común consulta únicamente los movimientos de la fecha operativa correspondientes a la sucursal fija de la terminal, no puede cambiar esa sucursal al capturar y sólo puede abrir el reporte individual; el código master `2468` o uno delegado habilita durante tres minutos todas las sucursales, el histórico, calendario, filtros avanzados por tipo, usuario, sucursal, importe y texto, además de Excel, PDF, impresión, edición y anulación. Anular conserva el folio auditado pero retira el importe de totales y corte. `Settings` incorpora un catálogo master de tipos de gasto con alta, edición, activación, inactivación y borrado seguro; un tipo ya usado se inactiva para no reescribir históricos. `Close day` conserva su formato normal cuando no hay gastos vigentes en la sucursal fija; cuando sí existen muestra subtotal de venta, resta sólo los gastos de esa sucursal, detalla cada folio por vendedor y presenta el total después de gastos tanto en pantalla como en el ticket térmico.
- El encabezado del POS incluye una campana de actividad protegida y un panel responsive que se eleva por encima de carrito, diálogos y cualquier otro módulo. Registra en tiempo real ventas finalizadas, altas/ediciones/anulaciones de caja, altas de producto o servicio, entradas, bajas y transferencias de inventario aprobadas, Close day y la hora de Clock In; cada alerta conserva módulo, sucursal/ruta, actor, referencia, destinatarios y hora. La campana exige código al abrirse: un código master consulta toda la actividad del día y un vendedor sólo puede entrar si fue seleccionado como destinatario en `Settings`, viendo exclusivamente las categorías que le corresponden. El panel muestra el contador no leído, filtra por módulo y por `Todas`/`Sólo no leídas`, marca una alerta al pulsarla o todo lo pendiente mediante `Marcar leídas`, y permite bloquear manualmente la sesión. `Settings` abre con código master una matriz donde cada categoría se activa/inactiva y admite uno o varios destinatarios entre Master Keysar y vendedores activos; seleccionar un vendedor también le concede permiso de acceso con su código personal. Cambiar esta matriz sólo afecta alertas futuras, nunca reescribe las ya generadas y ambos accesos se vuelven a bloquear automáticamente después de tres minutos. Todo conserva únicamente estado mock durante la sesión.
- `Clock In` es un módulo exclusivo de asistencia y nunca autentica al vendedor en Sale, Customers, Receipts ni módulos protegidos. Cada vendedor activo registra su entrada con su código personal mock y la sucursal; mientras la sesión siga abierta aparece en `Personal en sucursal` con tarjeta, iniciales, hora, tiempo transcurrido y estatus verde `ONLINE`. `Marcar salida` lo retira inmediatamente del panel activo y conserva en la bitácora del día su entrada, salida, duración y cierre `Manual`. Los usuarios master están excluidos de esta bitácora aunque su acceso abra el POS. `Close day` convierte simultáneamente todas las sesiones de vendedores abiertas a `OFFLINE`, registra la misma hora de salida con motivo `Close Day` y deja el panel activo vacío sin borrar el histórico de asistencia de la sesión mock.
- `Employees` está protegido inicialmente por `Master Keysar` (`2468`) y participa en el bloqueo automático de tres minutos. Tras autorizar, muestra un administrador de puestos y roles con altas personalizadas, edición de nombre/descripción, activación/inactivación y un árbol jerárquico agrupado por operación de venta, clientes, inventario/almacén, administración y sistema. Cada nodo tiene casillas independientes de `Visibilidad`, `Edición` e `Imprimir ticket` cuando corresponde; quitar visibilidad retira también edición e impresión, y el portal sólo muestra los nodos seleccionados. Guardar cualquier matriz exige nuevamente un código Master de cuatro dígitos. Los operadores sin master ven en el encabezado de cada módulo la etiqueta `Edición permitida` o `Solo consulta` según su rol. Los vendedores y roles nuevos se registran sin permisos automáticos: el vendedor puede quedar temporalmente sin rol, la sesión sin rol no recibe el acceso fallback a Sale y Employees resalta en rojo cada empleado activo sin módulos o configuraciones asignados. Incluye además `Códigos master delegados`: permite seleccionar uno, varios o todos los empleados activos, asignarles un mismo código numérico de cuatro dígitos, sustituirlo o revocarlo. El código queda oculto, no puede coincidir con `2468` ni con una clave personal de asistencia, y habilita las mismas validaciones master en Employees, la administración de My Account, Customers, Receipts, X-Report, Settings, precios, pedidos, Deals, competiciones y cambio de sucursal; dar de baja al empleado invalida inmediatamente su código. `Employees` y los datos empresariales, métodos de pago, ubicaciones y facturación de `My Account` permanecen exclusivos de master; el perfil personal de acceso de `My Account` está disponible para cualquier vendedor autenticado. La configuración permite asignar a cada vendedor activo un rol vigente; el rol determina sus módulos autorizados, módulos editables, impresión de tickets y permisos granulares. Los costos MXN/USD, costo socio, utilidad, listas internas y exportaciones permanecen ocultos incluso para un rol habilitado hasta introducir un código Master vigente; master los ve directamente. Los roles iniciales mock son `Master`, `Gerente de sucursal`, `Vendedor retail` y `Encargado de inventario`; los cambios permanecen sólo durante la sesión.
- Cancelar un ticket abre una confirmación con `Sí, regresar todo`, `No regresar` o `Elegir regalo o cortesía`. En la tercera opción cada producto entregado se clasifica como devolución a stock, regalo o cortesía; sólo las devoluciones generan una suma auditada `RETURN`, mientras regalos/cortesías permanecen documentados en el ticket cancelado. También permite capturar el monto a cancelar hasta lo efectivamente cobrado. La venta y sus cobros dejan de sumar en `Receipts`, `X-Report`, `Close day`, `Mis ventas` y clientes; las citas y compromisos ligados al folio se retiran, los apartados/abonos relacionados se revierten. El ticket cancelado permanece visible como histórico `REFUNDED`.
- La ventana `Inventory → Inventario` usa una tabla en modo listado con filtros `Todos`, `Activos` e `Inactivos`; sus encabezados permiten ordenar ascendente o descendentemente por producto, clasificación, precios, existencia seleccionada, sucursales visibles y estado. Cada producto muestra explícitamente precio mínimo/lista y existencias por una o varias sucursales, mientras que los costos siguen protegidos. Los números de cada sucursal usan semáforo: rojo bajo el stock mínimo, verde entre mínimo y máximo y naranja al superar el máximo; el total seleccionado compara límites proporcionales al número de sucursales visibles. Activar/desactivar conserva históricos. Excel/PDF respetan sucursales, búsqueda, estado y orden vigente. `Agregar` separa producto/servicio, familia, categoría y grupo; el alta captura foto, precios, existencia y límites, sucursales y costos protegidos, además de SKU automático o interno. `Generar pedido` crea una propuesta total o por sucursales para completar exclusivamente `stock máximo - existencia actual`; excluye artículos ya completos. En el segundo paso se puede editar cantidades, borrar partidas o añadir producto/sucursal manualmente, lo que queda marcado como `MANUAL`; aprobar requiere un código master. La emisión crea un folio independiente `ALM-PRO-*` por cada sucursal incluida —también cuando el alcance es `Todas`— y registra inmediatamente cada uno como `Solicitado` en `Inventory → Almacén bodega → Pedidos de sucursales`, con su lista de precios y costos históricos. Desde ahí conserva las dos aprobaciones, envío, recepción y reversión ya establecidas; no modifica existencias al generar la solicitud. El resumen ofrece PDF e impresión con el folio real de cada sucursal.
- La ventana `Inventory → Catálogo` conserva la consulta compacta de productos/servicios, SKU, familia, grupo, precio de lista y existencia/límites; cada una de sus columnas permite alternar el orden ascendente/descendente. La ventana `Inventory → Movimientos` conserva existencias independientes para `Polanco`, `Satélite` y `Roma Norte`, y prepara varias sumas, bajas o transferencias antes de aplicarlas como un lote único. Cada renglón identifica explícitamente sucursal/ruta y sólo modifica esa sucursal; una transferencia resta exactamente en origen y suma en destino, incluso cuando el origen queda negativo. Antes de aplicar, el lote muestra cuántos movimientos y productos distintos contiene, permite agregar combinaciones diferentes con botón `+`, editar o quitar cualquier renglón, limpiar únicamente el formulario, limpiar el lote completo y finalmente `Solicitar aprobación`. Cada solicitud se compacta bajo un folio `LOT-*`; al pulsarlo se despliegan todos sus productos y, mientras siga pendiente, permite editar sucursal, destino y cantidad o borrar renglones. Un lote pendiente no cambia stock ni genera bitácora y cancelarlo no tiene impacto. `Aprobar y aplicar` genera los movimientos vinculados al folio; cancelar una aprobación ya aplicada crea movimientos de reversa auditables que suman o restan según el movimiento original, restaura existencias por sucursal y revierte también entregas/deudas, deducciones de tickets, apartados y costos derivados. Una venta o liquidación sin existencia registra la salida completa, deja el stock negativo en la sucursal y crea una deuda histórica ligada a cliente, teléfono, vendedores y ticket. En cada entrada o transferencia hacia la sucursal, el operador puede elegir a qué clienta se entrega el producto; la reposición compensa el negativo y la asignación registra cantidad/fecha sin volver a descontar inventario. Si no elige clienta, el stock sí se actualiza pero la alerta permanece en `Movimientos`, `Mis ventas` y el expediente de `Customers`; la bitácora conserva entregas parciales, liquidación final y cancelaciones. En un apartado, checkout pregunta qué artículos físicos ya se entregaron y descuenta los marcados inmediatamente en la sucursal guardada dentro del ticket. Los restantes vuelven a preguntarse al liquidar: los entregados se descuentan/registran en esa misma sucursal y los no entregados quedan comprometidos con alerta de producto por entregar. `Settings` permite activar, desactivar y agregar motivos de baja; inicia con `Tester`, `Damage`, `Lost` y `Gift`. El cierre mensual protegido usa los mismos permisos de costo y valoriza cada venta, baja, demo/tester, ajuste, transferencia, devolución, entrega o reversa con el costo histórico embebido en el movimiento; resume por sucursal y tipo, incluye dashboard, estrategia y exportación.
- La bitácora de `Inventory → Movimientos` abre siempre con la fecha operativa vigente de `America/Mexico_City` seleccionada y muestra exclusivamente sus movimientos. El calendario permite sustituirla por cualquier otra fecha histórica; limpiar su valor vuelve automáticamente al día vigente y nunca expone todo el historial mezclado. Consolida bajo un solo folio `LOT-*` las partidas pertenecientes a la misma aprobación y muestra la suma de sus cantidades. Todas sus columnas de datos se pueden ordenar en ambos sentidos sin perder los filtros vigentes. Cada folio incluye una acción con icono de ojo que abre el detalle exclusivo de sus productos, tipos, rutas, existencias, motivos, comentarios y costos autorizados, además de un resumen de unidades totales, sumas, bajas y transferencias.
- El formulario de `Inventory → Movimientos` adapta su cuadrícula al tipo elegido. En `Baja` mantiene producto, movimiento, sucursal, motivo y cantidad dentro de la tarjeta en una sola fila cuando hay espacio; los selectores pueden reducirse y truncar texto sin desbordarse. En resoluciones intermedias se compacta automáticamente a dos columnas y en móvil a una.
- `Inventory → Almacén bodega` funciona como centro de distribución matriz mock con visibilidad por módulo y permiso granular independiente `Movimientos de almacén`. Su reporte en vivo engloba productos e insumos; cada producto identifica familia y categoría y muestra stock general, ingresos, salidas, costo unitario USD/MXN, costo socio, precio mínimo, retail, utilidad potencial, costo total y valor del almacén. El ingreso de mercancía acepta varias partidas, plantilla/carga masiva Excel y cálculo del costo socio por porcentaje o importe sobre costo. La sección de existencias incluye un catálogo precargado de insumos (`Algodón`, `Guantes`, `Bandas`, `Sábanas`, `Espátulas`) con switch administrativo de visibilidad: sólo los activos aparecen en nuevas solicitudes de las sucursales. `Catálogo` incorpora en cada producto físico el switch `Autorizar pedido como tester`; los productos sin autorización permanecen ocultos en la lista de testers. `Listas de precios` permite al master crear, editar, activar, inactivar o retirar listas con un importe por artículo en MXN y USD, asignarlas a una o varias sucursales y opcionalmente a clientes determinados; las listas sin clientes son generales. Todo pedido de sucursal exige elegir cliente/general y una lista vigente compatible. El folio conserva un snapshot del nombre de la lista, cliente e importes aun cuando la configuración se edite o inactive después, y los dashboards, tablas, detalle, PDF y Excel valorizan el pedido con esos precios por sucursal. Las solicitudes se separan en tres módulos independientes con folios `ALM-PRO-*`, `ALM-TST-*` y `ALM-INS-*`: productos vendibles, testers e insumos. Cada módulo conserva su propio dashboard, filtros por texto/estatus/sucursal/periodo, edición previa, cancelación, dos aprobaciones, recepción, detalle, PDF por folio y exportación Excel/PDF/impresión. Al recibir un pedido de productos se incrementa el inventario vendible de la sucursal; testers e insumos descuentan bodega y generan historial, costo y métricas, pero nunca suman existencia comercial en tienda. Cancelar restaura bodega y sólo revierte inventario de sucursal cuando el pedido era de producto vendible. `Envíos` mantiene además conceptos configurables (`Producto`, `Tester`, `Insumos`, `Mobiliario`), y el reporte general cruza todos los movimientos con búsqueda avanzada, orden por columnas, rotación y gráfica de entradas/salidas. `Settings` permite crear, editar, activar, inactivar o retirar conceptos sin reescribir históricos.
- `Data update` sincroniza automáticamente la sesión mock cada 60 segundos aunque el operador esté trabajando en otra pantalla. El encabezado global muestra en tiempo real la hora exacta de la última actualización, el estado en curso y la cuenta regresiva `mm:ss` para el siguiente ciclo. La pantalla detalla por módulo la versión local/disponible y los estados `Actualizado` o `Actualizando`, conserva un botón `Sincronizar ahora` y actualiza los cinco módulos como un solo ciclo; todo ocurre en memoria y no consume servidor.
- `My Account` adapta su contenido a la sesión. Para `Master Keysar` (`2468`) mantiene el módulo empresarial de facturación: conserva durante la sesión datos de la persona, nombre de empresa y múltiples correos para recordatorios; guardar la empresa actualiza el encabezado del POS y los tickets futuros. Permite registrar varias tarjetas mock, elegir una principal y sólo conserva marca, terminación y vencimiento: el número y código de autorización completos se descartan. Muestra costos mensuales en USD por ubicación, inicio y próximo periodo, alertas a siete días del cobro, activación de ubicaciones pendientes mediante una tarjeta configurada e historial de facturas/pagos. Para un vendedor sin acceso master nunca expone esos datos: muestra únicamente su nombre protegido y un formulario para cambiar alias o clave personal de cuatro dígitos. Guardar exige la clave vigente y, si se captura una nueva, su confirmación; valida alias y códigos únicos y actualiza inmediatamente el estado central de vendedores, por lo que el nuevo acceso aplica en login, Cash Manager, Close Day, Clock In y cualquier pantalla que consulte su clave. `Agregar sucursal` muestra una celebración de crecimiento y crea inmediatamente existencias en cero y visibilidad de catálogo para que la ubicación aparezca en Sale, checkout/citas, Inventory, movimientos, Customers, Reports, Deal, Clock In y los demás selectores derivados del catálogo activo. `Inactivar sucursal` exige una confirmación nostálgica, la retira de nuevas operaciones, cierra sus asistencias abiertas y conserva intactos tickets, clientes, citas, movimientos y facturación históricos; la tarjeta permanece disponible para reactivarla. Siempre debe quedar por lo menos una sucursal operativa. El indicador inferior del sidebar muestra la ubicación fija de `Terminal 01` y ofrece un botón de flechas invertidas para cambiarla; cada cambio exige nuevamente el código master `2468` y guarda sólo el nombre activo en `localStorage`, de modo que se conserva al reabrir el POS en esa computadora. La sucursal fijada se convierte en fuente de verdad para encabezados, Sale, existencia visible, Deals, citas y nuevas transacciones. Cada ticket guarda sucursal y dirección; al imprimir un histórico se usa la información de la sucursal del propio ticket y no la ubicación vigente de la terminal. No realiza cargos reales ni persiste información empresarial fuera de la sesión.
- Existe un usuario master mock explícito para pruebas: `Master Keysar`, código estático `2468`. La cuenta aparece en `Employees` y el mismo código centralizado autoriza precios bajo el mínimo combinado, cambios de cartera, configuración de métodos de pago, costos y reportes administrativos.
- La edición administrativa de un ticket admite ahora varios métodos de pago: cada partida permite cambiar método y monto, `+ Agregar método` divide automáticamente un cobro ya cubierto para facilitar la redistribución y `−` elimina partidas. Los vendedores participantes usan los mismos controles visuales `+`/`−`; al guardar se reconstruyen cobros, saldo, productos, descuento, reparto de vendedores, apartado y registros dependientes. El dashboard de `Receipts` agrega conteo del periodo, promedio por ticket y variación contra el mes anterior. La celebración mensual de tickets sólo se emite al superar el máximo histórico previo; en el último corte del mes, la celebración de ventas por sucursal también exige superar el récord histórico más alto y no sólo el mes inmediatamente anterior.
- `Settings` funciona como directorio acordeón: muestra una lista compacta de Notificaciones, Inventario, Gastos, Competiciones, Clientes, Precios, Ticket, Métodos de pago y Vouchers; sólo la categoría seleccionada permanece desplegada. `Notificaciones por usuario` presenta sus segmentos en dos columnas adaptables; cada segmento permite elegir al vendedor desde una lista, asignar `Visualiza` o `Edición` y retirar el permiso sin botones individuales por cada persona. Los vendedores activos sin ningún permiso efectivo aparecen juntos en una alerta roja y el segmento activo sin destinatarios también queda marcado. `Vouchers promocionales` es mock y protegido por master: permite crear, editar, borrar, activar/inactivar y publicar al vendedor descuentos de próxima compra, facial para acompañante o descuento de membresía. Al visualizar un ticket terminado, el vendedor puede elegir un voucher publicado, generar su folio consecutivo `VCH-{SUCURSAL}-{SECUENCIA}` e imprimirlo; Ajustes conserva durante la sesión el registro y permite marcar el canje. `Mis ventas` incorpora accesos de un clic a clientes propios con adeudo y sin próxima cita. Los cumpleaños no exigen una segunda autorización, pero un vendedor sólo ve los clientes de su cartera. Al iniciar `Close day`, el conteo final incluye un botón lateral `Regresar al menú`; la pantalla final aislada conserva el mismo regreso antes de confirmar el corte.
- El POS reutiliza `@cosmetics/ui`, iconos de `lucide-react`, fuentes Emofera/Gilroy y los tokens visuales de Keysar. La validación mínima es `pnpm --filter @cosmetics/pos type-check` y `pnpm --filter @cosmetics/pos exec vite build`; el script `build` completo también ejecuta `electron-builder` para empaquetado.
- La ampliación de `Inventory → Almacén bodega` agrega proveedor, unidad de medida, presentación, piezas por caja, stock mínimo/máximo, costo MXN/USD, precio socio y retail a cada artículo. `Agregar producto` crea o edita insumos con existencia inicial cero y los incorpora a listas de precios, solicitudes y reportes. Excel/PDF/impresión exportan el inventario vigente. `Generar pedido / resurtido` agrupa por proveedor únicamente lo que está debajo del máximo, propone `stock máximo - existencia`, permite editar cantidades y crea un folio `ALM-RES-*` con doble aprobación; al recibirlo con otra clave autorizada suma las piezas a bodega. `Pedidos de sucursales` concentra automáticamente todas las solicitudes de tienda y permite crear desde el mismo módulo pedidos de productos, testers o insumos para cualquier sucursal. Después de dos validaciones por usuarios con `Movimientos de almacén`, el folio pasa a `Envíos`; la carga final lo conserva allí con estatus `Entregado` y actualiza la sucursal. Un envío todavía no recibido puede regresarse a `Pedidos de sucursales`: restaura la reserva en bodega, conserva folio y trazabilidad, y vuelve a habilitar edición, aprobación o cancelación. Cancelar la ventana de recepción no altera el envío. El reporte general filtra por calendarios, proveedor, sucursal, tipo y estatus, y conserva dashboards de costos, rotación y entradas/salidas.
- `Inventory → Proveedores` es un módulo de costos protegido para master o roles autorizados. Registra folio `PROV-*`, razón social, RFC, régimen fiscal, giro, contacto, teléfono, correo y dirección; admite alta, edición, activación/inactivación, borrado seguro, búsqueda, plantilla/carga masiva y descarga Excel/PDF. Cada expediente despliega sus productos retail e insumos con familia, categoría, presentación, piezas por caja, costos MXN/USD y precio socio. Los cambios actualizan los módulos vigentes; pedidos históricos conservan proveedor y costos como snapshot.

---

## Nuevas apps en preparación

- `apps/finance` (`@cosmetics/finance`) y `apps/hr` (`@cosmetics/hr`) fueron incorporadas originalmente como prototipos heredados. Ambas ya tienen su frontend mock homologado con Next 14 y Tailwind; su backend, persistencia y autenticación compartida siguen deliberadamente pendientes según sus planes independientes.
- Sus `package.json` ya fijan la arquitectura objetivo homologada: Next.js 14.2.4, React 18.3, TypeScript strict, `@cosmetics/ui`, `@cosmetics/types`, `@cosmetics/auth` y `@cosmetics/api-client`.
- Finance será dueño de rentas, servicios financieros, deuda y capital de socios; debe consumir sucursales/ventas de Envelope y costos aprobados de Payroll sin duplicarlos.
- HR será dueño de expedientes, estatus laboral histórico, turnos, descansos, vacaciones, permisos y políticas; debe reutilizar `Empleado`, `Sucursal`, `Position` y `Usuario`, sin conservar D1/Drizzle ni autenticación paralela.
- El análisis de fuentes existentes, límites, riesgos y plan por fases vive en `apps/finance/GUIA_REFACTORIZACION.md` y `apps/hr/GUIA_REFACTORIZACION.md`.
- Las fases pendientes de cada guía determinan qué integraciones todavía no están listas; no asumir backend, persistencia o autenticación terminados por la sola presencia de sus dependencias objetivo.

### Estado de `finance` (frontend mock, 2026-08-23)

- `apps/finance` ya tiene entrada Next.js App Router, TypeScript strict, Tailwind/PostCSS y layout responsivo propio del monorepo.
- El inventario fuente de Finance quedó limpio del repositorio Vite/PWA heredado: no conservar `dist`, `.next`, `*.tsbuildinfo`, lockfiles anidados, service workers, manifests ni iconos/logos sin referencia. `public/geist.woff2` sí forma parte del frontend porque `globals.css` lo carga directamente.
- El frontend fue migrado desde el prototipo Vite a `src/app/page.tsx` + `src/app/globals.css`; usa mocks en memoria y no persiste datos operativos en `localStorage` (solo la preferencia de tema), ni usa service worker, PWA o login local.
- Finance reutiliza los primitivos canónicos de `@cosmetics/ui` para sidebar responsivo, botones, cards, badges, tablas, dialogs, inputs, selects, tabs, progreso y tooltips. Su paleta propia azul marino/índigo-violeta con superficies gris-lavanda y sus estados light/dark se definen exclusivamente en `apps/finance/src/app/globals.css` y `apps/finance/tailwind.config.ts`; no trasladar esos tonos a `packages/ui` ni a otras apps.
- La preferencia visual de Finance se guarda de forma aislada en `keysar-finance-theme`; no comparte ni reemplaza `keysar-theme`, utilizada por Envelope y Payroll.
- La navegación cubre resumen, sucursales, rentas, servicios, pagos, estado financiero, financiamientos, socios, aportaciones, proyecciones, accesos y reportes. Las 12 vistas conservan el inventario y la estructura funcional del prototipo heredado con datos mock: selector y consolidado del resumen; directorio de sucursales; resumen y tabla de rentas; catálogo/asignaciones de servicios; historial de pagos; estado y movimientos financieros; métricas/detalle de financiamientos; distribución y fichas de socios; resumen/detalle de aportaciones; métricas y gráficas de proyección; aviso/perfiles de acceso; y selector/catálogo de reportes. No sustituir estas estructuras por un placeholder genérico durante la integración con backend.
- Los mocks de Finance son funcionales y viven exclusivamente en estado React durante la sesión. Sucursales, rentas, servicios, pagos, movimientos financieros, financiamientos, socios, aportaciones y accesos permiten alta, edición y eliminación con confirmación destructiva; los financiamientos también aceptan pagos, y dashboard/reportes recalculan o exportan desde el mismo estado. No persistir estos datos en `localStorage`, no crear API routes y no conectar Prisma/backend hasta que se soliciten explícitamente las fases posteriores.
- Mantener sin cambios backend, Prisma, BD y autenticación compartida hasta ejecutar las fases 0, 2, 3 y 4 de `apps/finance/GUIA_REFACTORIZACION.md`.
- Validación de cierre de limpieza (2026-08-23): `pnpm --filter @cosmetics/finance type-check`, `lint` y `build` terminaron correctamente. Los outputs generados se retiraron después de validar y deben seguir fuera del inventario fuente.

---

## Estado actual de `payroll`

- `payroll` comparte el sistema visual canónico de `envelope`: `Emofera Regular` para títulos de página y marca, y `Gilroy` (400/500/600/700) para cuerpo/UI.
- La paleta, tokens semánticos, sidebar, logo, favicon, login editorial, radios, sombras, inputs y estados light/dark de `payroll` deben mantenerse alineados con `apps/envelope`.
- Los elementos de interfaz de `payroll` deben reutilizar los mismos primitivos y variantes que `envelope`: `Button`, `Badge`, `Card`, `DataTable`, `Tabs`, `Dialog`, `AlertDialog`, `Select`, `DatePicker`/`DateRangePicker`, `ProgressKeysar`, sidebar shadcn e iconos de `lucide-react`. No crear SVGs manuales ni clases locales que reemplacen estilos de botones, cards o badges. Las acciones CRUD siguen el patrón de `envelope`: editar/borrar como botones `ghost` con iconos `Pencil`/`Trash2`, acciones de alta con icono Lucide y confirmaciones destructivas con `AlertDialogAction` rojo. Las tablas `DataTable` no deben anidarse dentro de otra card decorativa.
- Las cards principales de `payroll` usan el componente `Card` de `@cosmetics/ui`, con sus subcomponentes `CardContent`/`CardHeader` cuando correspondan; no recrear la superficie con `<div>`, no anidar una `DataTable` dentro de otra card decorativa y no reintroducir glass oscuro ni colores de superficie hardcodeados.
- `payroll` soporta tema claro y oscuro con la misma preferencia `keysar-theme` usada por `envelope`; cualquier componente nuevo debe funcionar correctamente en ambos modos.
- La dirección visual de `payroll` debe mantenerse más limpia y minimalista que antes: evitar textos secundarios redundantes, descripciones largas y copy explicativo dentro de cards cuando el dato principal ya comunica el estado.
- La page `/esquemas` cierra con una gráfica de barras horizontal que distribuye a los empleados activos por esquema de comisión vigente en la fecha actual. Debe contar una asignación solo cuando `effectiveFrom <= hoy <= effectiveTo` (o `effectiveTo` es nulo), excluir asignaciones futuras e históricas y conservar los esquemas activos con cero personas cuando exista al menos una asignación vigente para facilitar la comparación.
- La sección `PESO DEL COSTO` de `/reportes/desglose-sucursal` presenta dos gráficas pie responsivas: costo total de nómina y costo de bonos por punto de venta para el periodo seleccionado. Ambas se calculan desde las `branchLines` del preview vigente, comparten un color estable por sucursal y muestran estados vacíos independientes.
- En métricas y bloques resumen, priorizar `label + value`; si hace falta contexto, usarlo solo de forma puntual. La page resumen agrupa periodo, estado, exportaciones y KPIs en una única card, mantiene la configuración de corrida en un solo bloque compacto y muestra las métricas secundarias junto al encabezado de la tabla; no volver a fragmentar estas áreas en múltiples mini-cards.
- La page resumen permite alternar entre vista quincenal y mensual. La configuración quincenal usa un único `Select` con los periodos estándar de los últimos 12 meses, agrupados por mes y con opciones breves de primera/segunda quincena; no duplicar ese control con otro selector de corridas en el encabezado. Al elegir un periodo con corrida no cancelada carga esa corrida; si está vacío permite crearla con día de pago sugerido siete días después del cierre. El selector mensual ofrece el mismo rango de 12 meses. Nunca crear una segunda corrida para el mismo periodo ni permitir fechas libres que rompan las quincenas 1–15/16–fin.
- La vista mensual obtiene su consolidado desde `GET /api/payroll/reports/monthly-summary?month=AAAA-MM`. Suma los snapshots de las corridas no canceladas del 1–15 y 16–fin de mes aunque estén en `DRAFT` o `APPROVED`. Si una quincena ya terminó y nunca tuvo corrida, el backend la calcula en memoria con los datos históricos y la configuración disponible, la devuelve con estado sintético `ESTIMATED` y no crea registros, snapshots, reservas ni auditoría. La UI debe cambiar el encabezado a **nómina mensual aproximada**, identificar cada quincena estimada y recomendar crear la corrida histórica para validar y congelar el resultado. Una quincena vigente sin corrida permanece faltante. No describir ningún importe como pagado. Las comisiones mensuales se calculan por quincena y luego se suman; nunca se recalculan sobre las ventas combinadas del mes.
- Las multas de `/movimientos` requieren una nómina destino: salario fijo, especialistas, comisiones o comisiones gerencia. La fecha determina la quincena y cada consulta resta solo las multas aprobadas dirigidas a ella. Comisiones excluye puestos cuyo nombre contiene `GERENTE`; estos se consultan en `/nomina-comisiones-gerencia`. Las multas históricas sin clasificación explícita se migran a comisiones.
- Los encabezados de todas las pages de `payroll` replican el patrón de `envelope`: nombre de pantalla en un H1 con `.page-title`, subtítulo inmediato con `mt-1 text-sm` y `--text-muted`, y acciones alineadas al extremo derecho en desktop/apiladas en móvil. Título, subtítulo y acciones se muestran directamente sobre el fondo de la página, sin card; las cards funcionales cercanas se colocan debajo del encabezado para no alterar su posición.
- Excepción exclusiva de `payroll`: solo los valores textuales que se capturan/guardarían en BD y los datos dinámicos mostrados en inputs, selects y cuerpos de tabla van en MAYÚSCULAS. Los formularios convierten esos valores mientras se escriben y vuelven a normalizarlos antes de guardarlos en estado; PDF/Excel exportan las celdas de datos en mayúsculas. Navegación, títulos, subtítulos, botones, descripciones y placeholders conservan su capitalización normal. No aplicar esta excepción automáticamente a otras apps.

---

## Stack actual

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + TypeScript strict
- **UI**: shadcn/ui desde `@cosmetics/ui` + Tailwind CSS
- **Motion web**: GSAP + `@gsap/react` para secuencias puntuales con cleanup y `prefers-reduced-motion`; las transiciones simples permanecen en CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Base de datos**: PostgreSQL en Supabase
- **Infra backend**: Fly.io
- **Infra frontend**: Vercel
- **POS**: Electron + React + Vite
- **Auth**: JWT + bcrypt
- **Calidad y release**: GitHub Actions, PostgreSQL efímero para integración y Playwright para smoke tests de ambientes

---

## Paquetes compartidos

| Paquete                 | Propósito                                             |
| ----------------------- | ----------------------------------------------------- |
| `@cosmetics/ui`         | Componentes shadcn/ui compartidos + wrappers custom   |
| `@cosmetics/types`      | Tipos TypeScript compartidos entre frontend y backend |
| `@cosmetics/auth`       | Lógica JWT y roles compartida                         |
| `@cosmetics/api-client` | Cliente axios compartido                              |

### Compilación de paquetes compartidos en backend

- `backend/api` es una sola API REST compartida por `envelope`, `payroll`, `crm`, `scheduler`, `pos` y las aplicaciones internas que se agreguen después; cada producto mantiene sus rutas y servicios por módulo dentro de la misma API.
- El backend nunca debe resolver imports contra `packages/*/src`. Su `tsconfig.json` resuelve `@cosmetics/*` contra `packages/*/dist/index.d.ts`, y Node carga la salida CommonJS de `dist`.
- Todo paquete compartido que la API consuma debe declarar un script `build`, exponer una salida CommonJS en `dist` y figurar como dependencia workspace de `backend/api/package.json`.
- Antes de `dev`, `build` y `type-check`, la API construye automáticamente sus dependencias internas mediante el grafo de pnpm (`@cosmetics/api^...`). No mantener listas manuales de paquetes en Docker.
- Los frontends conservan la condición `import` hacia `src` para que Next.js/Vite puedan trabajar con el código fuente del workspace durante desarrollo.

---

## Roles del sistema

- `SUPER_ADMIN` → acceso total a todas las apps
- `GERENTE` → acceso a su sucursal: ventas, empleados, reportes locales
- `CAPTURISTA` → solo registro de ventas
- `Position.canManageAccess` marca el puesto que administra permisos y credenciales de `envelope`.
- El acceso efectivo a pantallas de `envelope` ya no depende solo del rol: también se resuelve por puesto/permisos por pantalla.
- Payroll mantiene un control independiente por puesto mediante `Position.canManagePayrollAccess` y `PositionPayrollScreenPermission`; no reutiliza ni modifica los permisos de pantallas de Envelope. `SUPER_ADMIN` conserva acceso total a ambas apps.
- La pantalla `/accesos` de `apps/payroll` permite asignar por puesto uno de tres niveles a cada pantalla: **Puede editar**, **Solo lectura** o **Denegada**, con autosave y acciones masivas por sección. `PositionPayrollScreenPermission.allowed` controla la visualización y `canWrite` las mutaciones. El permiso **Administrar accesos de Payroll** concede edición total y permite administrar otros puestos; solo `SUPER_ADMIN` o un puesto con `canManagePayrollAccess` puede abrirla.
- La misma pantalla `/accesos` de `apps/payroll` administra credenciales por empleado: lista empleados y cuentas, crea o actualiza correo/contraseña temporal y permite eliminar exclusivamente la cuenta de login sin borrar al empleado. Las pantallas efectivas siguen heredándose del puesto del empleado; no existe una segunda matriz de permisos por persona. Las cuentas nuevas se crean con rol base `CAPTURISTA`, porque el acceso a Payroll se resuelve mediante `canManagePayrollAccess`/`PositionPayrollScreenPermission`, y la cuenta `SUPER_ADMIN` no puede eliminarse.
- La pantalla `accesos` guarda permisos por clic inmediato en cada pantalla con autosave sin recarga, administra credenciales en un dialog dedicado, también autoriza permisos virtuales de acción como `ventas/generar-sobre` y elimina cuentas desde la tabla de estatus cuando se necesita re-crear el acceso después, excepto la cuenta principal `SUPER_ADMIN`, que queda protegida. El permiso transversal para incluir registros de `KEYSAR HOME` se configura dentro del bloque superior de alcance de datos; no pertenece al conteo ni a las acciones masivas de la sección Reportes y se aplica a la tabla de ventas guardadas y a todos los reportes basados en ventas, incluidos dashboard, totales, métodos de pago, metas y rankings. La identidad se resuelve por `ProtectedEmployeeIdentity`, nunca por el nombre visible del empleado.
- En `accesos`, cualquier puesto sin administración global puede activar `Solo ver datos propios`. El ajuste se persiste en `Position.selfDataOnly` y se aplica en backend según la relación operativa del módulo: en ventas, dashboard y reportes de ventas usa `vendedorId`; en citas y su reporte usa `facialistaId`. También impide crear o mutar registros asignados a otro empleado. Un puesto sin empleado vinculado no recibe datos bajo esta restricción. Los puestos con `canManageAccess` no pueden combinarse con `selfDataOnly`.
- Prisma genera el cliente desde `backend/api/prisma/schema.prisma`; el duplicado histórico `backend/api/src/prisma/schema.prisma` debe mantenerse sincronizado mientras exista. Toda modificación de modelo debe actualizar ambos para evitar que el cliente desplegado quede desfasado.

---

## Estado actual de @cosmetics/ui

`packages/ui` cuenta con contratos de comportamiento en Vitest + React Testing Library para todo el barrel público, incluidos `DatePicker`, `DateRangePicker`, `Calendar`, `Combobox`, `Select`, `Dialog`, `AlertDialog`, `DataTable`, `Sidebar`, Toast, Sheet, Tabs, Popover y Tooltip. El setup común usa jsdom, jest-dom y user-event con timezone fija `America/Mexico_City`. Ejecutar `pnpm test:ui` para la suite rápida y `pnpm test:ui:coverage` para el gate de cobertura: mínimo global de 90% statements/líneas, 80% funciones y 75% branches. Al agregar o modificar un componente compartido, seguir `packages/ui/GUIA_PRUEBAS_COMPONENTES.md` y actualizar el contrato del barrel cuando corresponda.

La regresión visual de los componentes de alto riesgo usa `apps/ui-testbed`, una app interna sin API, BD, secretos ni deploy, con datos/fechas fijos. `pnpm test:ui:visual` construye ese testbed y valida los baselines versionados mediante Playwright/Chromium en escritorio `1440×900` y móvil `390×844`, con `es-MX`, `America/Mexico_City`, fuentes cargadas y animaciones desactivadas. El check obligatorio es **UI regression canaries**. Para aceptar una variación visual intencional, ejecutar `pnpm test:ui:visual:update`, revisar los PNG modificados y volver a ejecutar el comando normal; CI nunca actualiza baselines. Ver `apps/ui-testbed/README.md`. La Fase 3 de `PLAN_PRUEBAS_UI_COMPARTIDA_Y_E2E.md` concluyó el 2026-08-27 con 34 baselines versionados y 22 canaries en verde.

El E2E funcional autenticado de development vive en `apps/e2e/development` y se ejecuta con `pnpm test:e2e:development` o mediante **Authenticated development E2E**. Usa cuentas técnicas distintas y de mínimo privilegio, genera `storageState` temporal bajo `apps/e2e/.auth`, y cubre ocho recorridos de solo lectura por app; ambos incluyen calendarios reales, tablas, selects, navegación móvil y logout. Un fixture falla ante cualquier método distinto de `GET`, `HEAD` u `OPTIONS`. Los proyectos autenticados desactivan traces, screenshots y video para que JWT, bypass secrets y datos operativos no entren en artefactos; solo se conserva siete días el reporte HTML seguro. Antes de los recorridos, los alias Vercel deben exponer el SHA indicado en `meta[name="keysar-release"]` y `/health.release` debe coincidir con el SHA de API indicado. La preparación de cuentas, permisos, variables y diagnóstico está en `apps/e2e/README.md`. La Fase 4 de `PLAN_PRUEBAS_UI_COMPARTIDA_Y_E2E.md` quedó implementada el 2026-08-27.

El smoke autenticado productivo vive en `apps/e2e/production` y solo se ejecuta después de los cinco smokes públicos mediante **Environment smoke tests** sobre el environment protegido `production`. Usa cuentas productivas separadas: Envelope recibe exclusivamente `dashboard` y `reportes/total-general` con `selfDataOnly`; Payroll recibe únicamente `payroll/esquemas` con `canWrite = false`. Cada app tiene tres recorridos y el mismo guard bloquea escrituras. El reporte total general de Envelope acepta como resultados sanos tanto la tabla como el estado vacío autorizado para la cuenta de alcance propio; el logout acepta `/login` con o sin el parámetro `next` que conserva la ruta de retorno. La configuración productiva usa cero retries, desactiva traces/screenshots/video, no publica reporte HTML y elimina sesiones/resultados incluso al fallar. El workflow exige los SHA exactos de frontends/API y registra duración, intento y resultado en el resumen. Las cuentas, los cuatro secrets `PRODUCTION_MONITOR_*` y la observación de cinco promociones son activación administrativa externa; no crear seeds ni credenciales en el repositorio. La implementación de la Fase 5 concluyó en repositorio el 2026-08-27.

Componentes shadcn canónicos en `packages/ui/src/components/ui`:

- Button, Card, Input, Label, Textarea, Badge
- Table, Dialog, Select, Progress, Popover
- Calendar, DateRangePicker, Sheet, Tooltip, Separator, Sidebar
- **AlertDialog** — diálogo de confirmación destructiva (botones de borrar)
- **Sonner** — toasts con variantes semánticas: verde para éxito, amarillo/ámbar para advertencias recuperables y rojo para errores reales. En `payroll`, las validaciones de formulario y bloqueos previos al guardado usan `toast.warning`; los fallos de API, persistencia o exportación usan `toast.error`.
- **Toast (Base UI)** — componente shadcn canónico en `components/ui/toast.tsx`, re-exportado como `BaseToaster`/`baseToast` para convivir con Sonner. Envelope y Payroll montan ambos providers; Envelope lo usa para avisos de empleados sin sucursal.
- **Tabs (Base UI)** — navegación accesible entre vistas relacionadas mediante `Tabs`, `TabsList`, `TabsTrigger` y `TabsContent`; conserva navegación por teclado, foco visible y estados light/dark. Las apps deben consumirla desde `@cosmetics/ui`, no recrear tablists manuales.
- **DataTable** — tabla canónica shadcn sobre `@tanstack/react-table`. Props: `columns: ColumnDef<T>[]`, `data: T[]`, `emptyMessage?: string`, `searchPlaceholder?: string`, `pageSize?: number` (default 20), `labels?: { records?: string; all?: string; results?: (count: number) => string }`. Incluye sorting por clic en header, globalFilter (search input), selector de filas por página (opciones: 10, 20, 50, 100, Todos) y pagination con controles prev/next (ocultos en modo Todos). Re-exporta también `ColumnDef` desde `@cosmetics/ui` — las apps no deben importar `@tanstack/react-table` directamente.

`toast` helper re-exportado desde `@cosmetics/ui` (no importar `sonner` directamente en las apps).

Wrappers custom en `packages/ui/src/components/custom`:

- `ProgressKeysar` — wrapper custom sobre `Progress` oficial
- `Combobox` — select con búsqueda integrada; usa `Popover` + `Input`. Props: `options`, `value`, `onValueChange`, `placeholder`, `searchPlaceholder`, `emptyMessage`, `disabled`, `id`. Exporta también `ComboboxOption` (interface `{ value: string; label: string }`).

**Reglas de UI:**

- Apps consumen UI exclusivamente desde `@cosmetics/ui`.
- No recrear componentes manuales similares a shadcn en las apps.
- No crear duplicados en `apps/envelope/src/components/ui`.
- Si un componente no existe en shadcn, crear wrapper custom en `packages/ui/src/components/custom` usando primitivas oficiales cuando sea posible.
- `toast` siempre desde `@cosmetics/ui`, nunca `import { toast } from 'sonner'` directo.
- Botones de borrar siempre con `AlertDialog` de confirmación antes de ejecutar `remove`.
- **Tablas de datos siempre con `DataTable` + `ColumnDef` desde `@cosmetics/ui`.** No usar `<Table>` + `<TableBody>` manual para listados CRUD — solo para tablas de reporte/estáticas.
- Para alternar vistas relacionadas dentro de una misma tarea, usar `Tabs` de `@cosmetics/ui`; no implementar botones con `role="tab"` manualmente.
- Para fechas de un solo día usa `DatePicker` de `@cosmetics/ui`; para rangos usa `DateRangePicker` con dos selectores separados. No usar `input type="date"` directo en las apps.
- **Reportes exportables**: cuando una pantalla de reporte necesite PDF/Excel, reutilizar `apps/envelope/src/lib/report-export.ts` y `apps/envelope/src/components/reportes/ReportExportButtons.tsx`. Exportar siempre desde el dataset ya agregado, nunca desde captura visual de la tabla. Las dependencias pesadas (`jspdf`, `jspdf-autotable`, `xlsx`) deben cargarse con imports dinámicos al hacer clic en exportar; no importarlas a nivel superior en pages/components para no inflar el First Load JS.
- Los filtros de rango de fechas en reportes y ventas usan dos selectores de calendario separados con `DateRangePicker`, no un calendario de rango único.
- En cualquier tabla, los encabezados y textos estáticos visibles van en MAYÚSCULAS; no transformar valores de datos dinámicos como nombres, fechas o importes.
- Para columnas computadas (valor derivado de múltiples campos), usar `accessorFn` + `id` para que sorting y globalFilter funcionen. Columnas sin accessor (como acciones) no son sortables ni filtrables — marcar explícitamente con `enableSorting: false, enableGlobalFilter: false`.

**Sistema tipográfico (envelope):**

- Fuentes disponibles: `Emofera Regular` (display/decorativa, solo peso Regular) y `Gilroy` (400/500/600/700).
- Tailwind `font-brand` → Emofera. Tailwind `font-sans` → Gilroy (default del body).
- **No usar `font-bold`/`font-semibold` con `font-brand`** — Emofera no tiene esos pesos; el navegador los sintetiza mal.
- Jerarquía con clases CSS utilitarias definidas en `globals.css @layer components`:
  - `.page-title` — H1 de página: Emofera 30px Regular, `letter-spacing: 0.015em`
  - `.section-heading` — H2 dentro de página: Gilroy SemiBold 13px, `letter-spacing: 0.05em`
  - `.label-caps` — etiqueta decorativa (gráficas, grupos): Gilroy SemiBold 11px uppercase gold
  - `.number-display` — montos monetarios: Gilroy Bold tabular-nums
- Todos los H1 de página usan `className="page-title"`.
- `font-brand text-sm tracking-widest uppercase` para el nombre de marca en el sidebar.

---

## Estado actual de apps/envelope

Módulos implementados:

- **ventas** — captura una venta total por `sucursal`+`fecha`+empleado inicial+monto; después permite agregar empleados con reparto equitativo automático y montos editables, y conciliar métodos de pago uno por uno contra el total. El guardado solo se habilita cuando tanto la distribución por empleado como la suma de pagos coinciden con el monto. Además incluye `Generar sobre`, que arma y descarga un PNG de sobre blanco con el detalle real del día y sucursal seleccionados, firma del usuario y permisos de acción virtual, sin vista previa inline. La firma del sobre usa `signature_pad` para trazo suave y fondo transparente. Cada empleado se persiste como un `RegistroVenta`, compartiendo un `sesionId` cuando participa más de uno; `POST /api/envelope/ventas/lote` guarda todo el voucher en una transacción atómica.
  La tabla de ventas guardadas filtra por rango de fechas con dos selectores de calendario separados y arranca por defecto en el día en curso, para mostrar solo las ventas del día presente al abrir la pantalla.
  Cada fila de la tabla de ventas guardadas ofrece edición con el botón neutral `Pencil`. La edición reutiliza el flujo de captura de la parte superior, precarga sucursal, fecha, empleados, montos y métodos de pago, conserva la distribución y los detalles de pago mientras no se modifiquen, muestra un estado explícito de edición y permite cancelarla. Si el registro pertenece a una venta compartida, se cargan y actualizan juntas todas las filas visibles con el mismo `sesionId`; bajo `selfDataOnly` o cuando parte del voucher no es visible, solo se modifica la porción autorizada y se conserva el vínculo existente. `PUT /api/envelope/ventas/lote` persiste la edición dentro de una transacción, conserva los IDs de `Venta` existentes siempre que sea posible, agrega o elimina filas si cambia el número de empleados y vuelve a validar el alcance propio. Una venta histórica ligada a una sucursal ahora inactiva puede conservar esa misma sucursal durante la edición, pero no puede cambiarse hacia otra sucursal inactiva.
  El catálogo de sucursales se lee desde `GET /api/envelope/sucursales`, que está disponible para cualquier sesión autenticada; las mutaciones (`POST`/`PUT`/`DELETE`) siguen protegidas por permiso de pantalla `sucursales`. Si solo hay una sucursal activa disponible, la UI la preselecciona automáticamente. `GET /api/envelope/metodos-pago` también está disponible para quien tenga la pantalla `metodos-pago` o el reporte `reportes/metodo-pago-por-dia`, para que ese reporte pueda cargar su selector sin conceder permisos de administración; sus mutaciones siguen requiriendo `metodos-pago`.
  En `Generar sobre`, el nombre de cada vendedor debe resolverse desde el payload de ventas embebido (`vendedorNombre`) y no depender del catálogo de empleados, para que el resultado sea igual con `SUPER_ADMIN` y `CAPTURISTA`.
  El nombre arriba de la firma debe salir de `GET /api/auth/me` justo al generar el PNG, usando el nombre actual del empleado ligado a la cuenta cuando exista, para no quedarse con el valor histórico guardado en `Usuario.nombre`.
- **citas** — captura citas en `/citas` con fecha, hora, clienta, categoría y servicio de atención, estatus (`ATENDIDA`/`NO_LLEGO`/`CANCELADA`), sucursal, vendedor, facialista, resultado de compra y bonos de salida tarde/comida. Las categorías y subcategorías/servicios se administran en `/servicios`; los valores activos se cargan en cascada en el formulario de citas. El catálogo usa borrado lógico: al desactivar una categoría también se desactivan sus servicios y la pantalla oculta ambos; si después se crea una categoría o servicio con el mismo nombre, el backend reactiva el registro histórico correspondiente en vez de chocar con el índice único, sin reactivar automáticamente los demás servicios de la categoría. La compra se normaliza en `RegistroCita.tipoCompra` (`PAGO_NETO`, `COMPRA_CON_APARTADO`, `PAGO_DE_APARTADO`) + `montoCompra`; en `COMPRA_CON_APARTADO`, `montoCompra` es la compra tentativa y `montoApartado` es el pago recibido, obligatorio y no mayor a la compra. La UI apila ambos conceptos y calcula el pendiente; `total` representa el pago recibido (apartado o pago neto) y no se duplica en BD. `PAGO_DE_APARTADO` se conserva para compatibilidad histórica; los registros nuevos lo capturan como parte de `COMPRA_CON_APARTADO`. Cuando no existe compra, el tipo queda `null` y ambos montos en cero. Una cita atendida sin compra es distinta de una clienta que no llegó o canceló; en estos dos últimos estatus el formulario limpia/oculta compra y bonos, y backend/BD rechazan esos datos si se envían. Cada registro guarda `creadoPorId` hacia `Usuario`, además de `creadoEn`/`actualizadoEn`. La hora es obligatoria para registros nuevos y nullable en BD solo por compatibilidad histórica. El listado conserva filtro por la quincena actual y permite editar mediante `PUT /api/envelope/citas/:id` reutilizando el formulario; la edición conserva el creador original y actualiza `actualizadoEn`. También permite eliminación física mediante `DELETE /api/envelope/citas/:id`, siempre detrás de un `AlertDialog` de confirmación explícita.
  Los usuarios cuyo puesto contiene `FACIALISTA` tienen acceso de solo alta en esta pantalla: pueden guardar citas nuevas, pero la UI no muestra acciones para editar/eliminar y el backend rechaza `PUT`/`DELETE`. Si su puesto tiene `selfDataOnly`, el listado, el reporte y las exportaciones de citas solo incluyen registros con su propio `facialistaId`, el selector queda limitado a su empleado y el backend impide crear una cita para otra facialista.
  El selector de vendedor incluye todos los empleados salvo los puestos `ADMINISTRADOR`, `ADMINISTRADOR GENERAL`, `MANTENIMIENTO`, `RECURSOS HUMANOS` y `EXTERNO`.
- **empleados** — CRUD, usa `bankId`/`positionId` dinámicos desde backend; incluye toggle activo/inactivo con `PATCH /empleados/:id/status`; GET retorna todos los empleados (activos primero), la tabla muestra badge de estatus y botón `PowerOff`/`Power` con AlertDialog de confirmación. Además de `banco`/`puesto` legacy, ya expone `sueldo`, `fechaNacimiento` y `numeroTelefono` en formulario, tabla, backend, Prisma y seed; `fechaNacimiento` se captura completo para que después se derive el cumpleaños y la base de RH para nómina. La asignación laboral distingue una sucursal concreta, `TODAS` (`todasSucursales = true`) y `Sin sucursal asignada`; `TODAS` no es una fila del catálogo `Sucursal`. La page de empleados también tiene filtros de tabla por estatus, puesto y sueldo antes de pasar los datos a `DataTable`.
  El filtro de sueldo usa límites numéricos opcionales `Desde`/`Hasta`, no rangos preestablecidos; si ambos están vacíos no restringe resultados y, al establecer cualquiera, excluye los registros sin sueldo.
  El campo `sueldo` también puede ocultarse por permiso virtual `empleados/sueldo`: por defecto solo lo ve `SUPER_ADMIN`, y desde `accesos` se puede otorgar o denegar para otros puestos. Cuando no hay permiso, no se muestra en la tabla ni en el formulario de alta/edición, y el backend lo redacciona en las respuestas del módulo `empleados`.
- **sucursales** — catálogo con alta/edición de nombre y `metaMensual`, más activación/desactivación confirmada. La administración obtiene activas e inactivas con `GET /api/envelope/sucursales?includeInactive=true`; los formularios operativos consumen el endpoint sin ese parámetro y reciben solo activas. Desactivar persiste `activa = false` y `desactivadaEn`, no elimina ventas, citas, empleados, usuarios ni snapshots. Las altas de ventas/citas validan nuevamente el estatus en backend para bloquear clientes con catálogo obsoleto. Los reportes agregados conservan las relaciones históricas y sus nombres embebidos; cuando construyen columnas dinámicas mezclan el catálogo activo con las sucursales presentes en el dataset histórico. El dashboard deja de proyectar ceros para una sucursal en periodos posteriores a `desactivadaEn`; si el periodo cruza el momento de desactivación todavía la incluye.
- **metodos-pago** — CRUD de métodos de pago
- **bancos** — CRUD propio con catálogo `Bank`
- **puestos** — CRUD propio con catálogo `Position`
- **reportes** — múltiples subvistas: total-general, detalle-metodo-pago, metodo-pago-por-dia, ventas-por-vendedor, ventas-por-vendedor-dia y citas; leen endpoints agregados en backend y exportan PDF/Excel desde esos datos usando `report-export.ts` + `ReportExportButtons` con imports dinámicos para las librerías pesadas. `reportes/citas` abre en la quincena vigente, filtra por rango, facialista y sucursal, y suma citas, faciales sencillos/dobles atendidos, estatus, conceptos de compra y bonos por facialista+sucursal desde `GET /api/envelope/reportes/citas`; PDF y Excel incluyen el mismo desglose agregado. `ventas-por-vendedor` pivota las sucursales en columnas dinámicas, conserva las métricas por empleado, permite buscar vendedores por nombre con el mismo patrón de búsqueda de `DataTable` y aplica las coincidencias también a totales y exportaciones; además muestra/exporta una fila final con los totales visibles de cada sucursal. La vista `ventas-por-vendedor-dia` muestra `Días sin venta` y `Monto día aproximado` al final de la tabla, antes del total, calcula ese monto como `venta total del mes / días con venta` por vendedor, y cuando consulta el mes en curso solo renderiza días transcurridos hasta hoy
- **metas por sucursal** — `reportes/metas-sucursal` consume `GET /api/envelope/reportes/metas-sucursal`, que agrega en backend únicamente el mes vigente según la fecha de negocio de `America/Mexico_City`, mezcla sucursales activas con sucursales históricas presentes en las ventas y completa con cero los días/sucursales sin venta. La pantalla tiene pestañas semanal y mensual, exportación PDF/Excel y una sola matriz comparativa de escritorio: cada sucursal aparece una vez como columna, las ventas ocupan el cuerpo, el total acumulado cierra el período y las métricas de meta continúan debajo como un segundo footer alineado a las mismas columnas, incluidos los inputs de vendedores. En la vista mensual de escritorio, la matriz usa un área vertical acotada y mantiene sticky el encabezado completo durante el desplazamiento para conservar el contexto de cada sucursal. Las exportaciones reproducen tanto el total por sucursal como todas las filas de ese segundo footer y conservan como números los importes, días y vendedores. En móvil sustituye por completo la tabla y el scroll horizontal por una jerarquía de cards: resumen de meta, totales por período y una card por sucursal con avance, cálculos, vendedores y desglose temporal plegable. La vista mensual compara la meta mensual contra el acumulado del footer; la semanal divide la meta mensual entre los lunes que inician dentro del mes, muestra semanas lunes-domingo iniciadas en el mes y calcula el faltante usando solo la semana actual. Los días restantes excluyen hoy; si ya no quedan días y aún falta meta, el monto diario y por vendedor se presentan sin importe para evitar dividir entre cero. Esta pantalla usa el permiso independiente `reportes/metas-sucursal` y respeta `selfDataOnly`.
- **rankings de ventas** — `reportes/ranking-vendedores` y `reportes/ranking-sucursales` abren por defecto desde el día 1 hasta el día actual del mes, permiten cualquier rango válido de hasta 366 días y consumen endpoints SQL agregados propios. Ambas vistas muestran podio, participación, operaciones, promedio y ranking completo, permiten buscar por nombre sin modificar el podio y exportan a PDF/Excel únicamente las filas visibles del filtro usando los componentes canónicos. Ambos rankings respetan `selfDataOnly` y `reportes/ver-datos-keysar-home`. Cada pantalla tiene permiso independiente y usa GSAP únicamente al actualizar el rango, nunca para ocultar el contenido inicial y siempre desactivado con `prefers-reduced-motion`.
  En móvil, `total-general` usa tarjetas por día con todas las sucursales —incluidas las que no tuvieron venta, marcadas con badge de importe cero—, el total diario y una tarjeta final con los totales acumulados por sucursal; desde `md` conserva la tabla completa para comparar días y sucursales.
  Los importes exactamente en cero de los reportes de ventas se presentan como un badge destructivo rojo con el valor formateado, en lugar de un guion o texto atenuado; reutilizar el mismo tratamiento visual al agregar nuevas celdas monetarias de reporte.
- **esquemas** — demo mock en cliente separada en dos capas: catálogo de esquemas por rangos `De / Hasta / Tasa` y asignación de esquema a empleado. No persiste en backend ni BD todavía.

UI:

- Sidebar responsive usando shadcn `Sidebar` + `Sheet` (Sheet para mobile).
- Layout: `AppSidebar` + `LayoutShell` en `src/components/layout/`.
- Sidebar filtrado por permisos efectivos; incluye pantalla de `Control de accesos` para puestos con acceso administrador.
- Las pantallas `citas` y `reportes/citas` tienen permisos independientes y aparecen en `Pantallas permitidas`; el catálogo mínimo de empleados para ambas se obtiene de `GET /api/envelope/citas/catalogos` sin conceder acceso al CRUD de empleados.
- Estados de carga en `envelope`: en primera carga de una pantalla o dataset, usar skeletons estructurales desde `apps/envelope/src/components/layout/DataLoadingSkeleton.tsx` o `PageLoadingSkeleton`; evitar textos planos tipo `Cargando...` como estado principal. Cuando ya hay datos y solo se refrescan, usar `RefreshingDataIndicator` sin desmontar la tabla/formato visible.
- Todos los botones de borrar usan `AlertDialog` de confirmación.
- Las acciones con color semántico de `envelope` reutilizan `apps/envelope/src/lib/action-button-styles.ts`: `neutral` para editar, `warning` para desactivar, `success` para activar y `danger` para eliminar, con variantes sólidas para confirmaciones. Cada estilo define explícitamente fondo, borde, texto, hover y foco tanto en tema claro como oscuro; no volver a fijar combinaciones de color válidas para un solo tema directamente en las pages.
- Todos los formularios disparan `toast.success()` al crear o editar, **excepto** el modal "Agregar/Editar venta" en ventas: dispara `toast.info()` azul pastel (8 s) recordando al usuario que debe dar clic en «Guardar registro» para persistir.
- En `ventas`, el botón final de guardado debe pasar por un `AlertDialog` de confirmación antes de persistir la venta.
- `<Toaster position="bottom-center" />` montado en `src/app/layout.tsx`.
- Favicon configurado via metadata `icons: { icon: '/logo.svg' }` en root layout.
- Header del sidebar muestra logo (32px) + texto "Keysar Cosmetics" cuando expandido; solo logo (28px) cuando colapsado.
- En el sidebar expandido, `Formularios`, `Reportes` y `Rankings` funcionan como grupos desplegables accesibles: solo uno queda abierto a la vez y la sección de la ruta activa se abre automáticamente desde la carga inicial, al refrescar y después de cada navegación. `Rankings` agrupa exclusivamente `ranking-vendedores` y `ranking-sucursales`, conservando sus rutas y permisos independientes. El enlace activo expone `aria-current="page"`. En el modo de solo iconos, todas las opciones permanecen disponibles con sus tooltips.
- Switch dark/light mode y switch visual de idioma `ES/EN` en `SidebarFooter`, encima del botón "Cerrar sesión", ocultos en modo colapsado. Ambos usan filas minimalistas con icono, valor actual y un control `role="switch"` accesible; el thumb apagado mantiene borde dorado y sombra breve para distinguirse en fondos claros. Envelope usa `I18nProvider` + `useI18n()` en `src/lib/i18n.tsx`, persiste en `localStorage` con key `keysar-envelope-language` y solo traduce textos estáticos de UI. No traducir ni transformar datos provenientes de BD/API (nombres de sucursales, empleados, bancos, puestos, métodos de pago, mensajes explícitos de backend, etc.).
- Botón "Cerrar sesión" en `SidebarFooter` — limpia `auth_token`, resetea la sesión en memoria y redirige a `/login`. Usa `SidebarMenuButton` con tooltip para funcionar también en modo colapsado.
- El login de `envelope` ya usa sesión híbrida: credenciales temporales hoy, con soporte de base para invitación futura por enlace. El redirect post-login usa `window.location.assign(...)` para evitar quedarse atrapado en la pantalla de login.

Datos:

- `useSucursales`, `useEmpleados`, `useMetodosPago`, `useBanks` y `usePositions` usan caché liviano compartido por hook (`catalog-cache.ts`) para evitar requests repetidos cuando varios componentes montan los mismos catálogos. Después de mutaciones, el hook afectado invalida mediante `refetch()`.
- Campos legacy `banco`/`puesto` (string) aún existen en `Empleado` durante transición.
- Rendimiento `envelope`: `useVentas` acepta `fechaInicio`/`fechaFin` y las pantallas no deben volver a cargar el histórico completo de ventas para reportes o dashboard. La pantalla `ventas` carga por defecto solo el rango visible; `Generar sobre` consulta únicamente el día seleccionado al abrir el dialog. El backend aplica un rango por defecto seguro cuando faltan fechas, rechaza rangos mayores a 366 días y soporta `limit`/`page` opcionales en `GET /api/envelope/ventas`.
- Los reportes de `envelope` consumen endpoints agregados en `/api/envelope/reportes/*`; no usar `useReportes()` para bajar ventas crudas y agregarlas en cliente. `useReportes` queda como helper legacy/no recomendado. Si se crea un reporte nuevo, preferir agregación en backend/SQL y enviar al frontend solo el dataset ya agregado.
- El dashboard consume `/api/envelope/reportes/dashboard`; ese endpoint agrega en SQL y concentra los totales de sucursal de los periodos principales en una sola consulta, más una consulta separada para vendedores. No reintroducir cálculos del dashboard sobre ventas crudas en React.

---

## Estado actual de apps/scheduler

`apps/scheduler` es la app de agenda y administración de reservas. Sigue en fase local/mock, sin backend real ni Prisma. Parte de la configuración se conserva en `localStorage`, pero todavía no existe persistencia compartida entre usuarios ni validación de servidor. No se modifican backend, Prisma ni variables de entorno en esta etapa. La agenda, la administración, las configuraciones y los reportes viven local/mock; toda la información técnica de esta app está concentrada en esta sección.

### Agenda

- La agenda principal (`/`) modela una agenda operativa estilo AgendaPro con vistas `day` y `week`, filtro por sucursal, selección de profesionales, filtro de estatus, búsqueda rápida por hora, calendario mensual y acciones directas sobre slots vacíos.
- El contexto operativo de la agenda se generalizó a `Comercio → Sucursal → Profesional`. `schedulerCommerces` define los comercios disponibles; cada sucursal pertenece a un comercio y cada profesional puede estar asignado a varios comercios y sucursales mediante `commerceIds`/`branchIds`. Al cambiar de comercio, la UI carga solo las sucursales permitidas de ese comercio y después filtra los profesionales disponibles para la sucursal elegida.
- La fuente efectiva de comercios, sucursales y profesionales combina los catálogos mock con la configuración guardada por Administración. `src/lib/administration-scheduler-config.ts` persiste el conjunto en `scheduler-administration-configuration`, normaliza registros estáticos por nombre y notifica cambios con `scheduler-administration-configuration-change`. Altas, cambios de nombre, asignaciones y activaciones/desactivaciones se reflejan en Agenda sin backend; los elementos inactivos dejan de ofrecerse operativamente.
- El horario operativo pertenece al comercio, no a cada sucursal. `src/lib/commerce-operating-hours.ts` guarda una agenda semanal o modo 24 horas por comercio, calcula el rango visible de las vistas diaria/semanal y marca como bloqueadas las celdas fuera del servicio. Una reserva activa fuera de ese horario o sobre un bloqueo manual abre una confirmación de dos pasos y exige escribir `RESERVAR`; la excepción aplica solo a esa reserva y no modifica el horario general. Las reservas canceladas no disparan conflictos.
- Configuraciones de Agenda permite elegir el tamaño visual del slot entre 15, 20, 30, 45 y 60 minutos. Se persiste en `keysar-scheduler-agenda-settings` y `SchedulerWorkspace` escucha el evento `scheduler-agenda-settings-change` y cambios de storage para recalcular filas, tarjetas y línea de hora actual sin recargar. Este tamaño visual no cambia el cálculo de horarios disponibles del modal, que continúa ofreciendo inicios cada 15 minutos.
- Las reservas y bloqueos nuevos guardan `branchId` para evitar que una agenda compartida entre sucursales muestre el mismo registro en ubicaciones distintas. En el modal de reserva se elige la sucursal y, al cambiarla, se conserva el profesional si pertenece a ella o se asigna el primero disponible para mantener la disponibilidad coherente. Los registros mock anteriores sin `branchId` conservan compatibilidad usando la primera sucursal asignada al profesional.
- El modal de nueva/edición de reserva calcula horarios disponibles en intervalos de 15 minutos según fecha, profesional y duración del servicio. Oculta cualquier inicio que se traslape total o parcialmente con otra reserva del profesional o con un bloqueo; al editar ignora la propia reserva. `BookingStatus` incluye `canceled`: una reserva cancelada libera su franja y no participa en conflictos, mientras `no-show` conserva la ocupación histórica. Si no queda disponibilidad, los selectores se deshabilitan, se muestra un estado explícito y no se permite guardar una reserva activa.
- El registro mock de clientes vive en `src/lib/mock-client-data.ts` y es transversal a comercios/sucursales. Antes de abrir `Nuevo cliente`, el único input `Cliente` funciona como buscador combinado: acepta letras o números y consulta nombre completo, alias o cualquier segmento del teléfono normalizado; seleccionar una coincidencia completa nombre, teléfono y correo y vincula la reserva mediante `clientId`. El campo `Teléfono` solo aparece dentro del formulario `Nuevo cliente`; en clientes existentes se reutiliza el dato vinculado. El teléfono es obligatorio, se compara sin espacios/signos y debe ser único. Si se intenta guardar otro nombre con un teléfono existente, la UI pide confirmar la unificación: conserva el nombre/correo canónicos, guarda variantes como alias/correos alternativos y agrega la visita al mismo historial con `branchId`, fecha y `bookingId`. Esta lógica es local/mock; la futura API deberá repetir la restricción única y la unificación dentro de una transacción.
- La entrada principal es `SchedulerWorkspace`, que compone `SchedulerHeader`, `SchedulerSidebar` y `SchedulerAgendaGrid`, y abre tres diálogos especializados: `SchedulerBookingDialog`, `SchedulerBlockDialog` y `SchedulerDetailDialog`.
- Los datos salen de `src/lib/mock-scheduler-data.ts` y se manipulan con helpers en `src/components/scheduler/scheduler-utils.tsx`.
- El login temporal solo redirige a la agenda principal; no hay flujo auth real para esta app todavía.
- `src/lib/scheduler-access.ts` concentra el perfil de acceso mock actual: pantallas permitidas y alcance por comercio, sucursal y profesional. `SchedulerAppSidebar` oculta pantallas no autorizadas, `SchedulerAccessGuard` impide abrir directamente áreas completas sin permiso y Administración descarta secciones no permitidas. Esta capa sigue siendo demostrativa/local; la autorización real deberá validarse también en backend durante la fase de persistencia.
- La agenda usa colores de estatus configurables por comercio desde Administración. La paleta se guarda en `scheduler-status-colors-by-commerce`, requiere desbloqueo mediante un código mock de perfil autorizado y actualiza puntos, selectores y tarjetas al emitir `scheduler-status-colors-change`.
- El historial de visitas y el historial financiero del cliente son flujos separados. Consultar información sensible exige un código personal mock; los perfiles `master` y `admin` pueden editar o eliminar movimientos de pago, mientras un vendedor solo puede consultar clientes asignados. Las consultas y mutaciones generan auditoría local. Los códigos incluidos en `scheduler-access.ts` son exclusivamente demostrativos: en producción deben validarse en backend y nunca enviarse en el bundle del navegador.

### Administración

La ruta `/administracion` contiene el workspace administrativo completo, local/mock y sin conexión a backend. Incluye Comercios y sus sucursales, Profesionales, Grupos personalizados, Servicios, Clases, Paquetes, Adicionales, Comisiones, Recursos, Encuestas, Consentimientos, WhatsApp, Gift cards y Colores de status. Los listados, formularios, filtros, estados, modales, confirmaciones y feedback están implementados en `AdministrationWorkspace.tsx` y comparten catálogos desde `mock-administration-data.ts`. El comercio es la entidad principal y concentra su estado y horario operativo; cada `LocalRecord` incluye `commerceId` y administra ubicación/contacto, no un horario independiente. `ProfessionalRecord` usa `commerceIds` y `localIds` para asignaciones múltiples, manteniendo `localId` como referencia principal legacy mientras se adaptan los flujos mock que todavía requieren una sola sucursal. Tras hidratar el workspace, los cambios de esos tres catálogos se guardan automáticamente y se sincronizan con Agenda.

El alta y la edición de Profesionales incluyen una pestaña `Comisiones`. Cada profesional define explícitamente si genera comisiones; al activarlas son obligatorios al menos una modalidad, el periodo y todos los valores correspondientes. Las modalidades son combinables: monto fijo por cita, monto fijo independiente solo por cita con estatus Asiste, porcentaje sobre monto de venta y esquema personalizado por venta acumulada de sucursal. La periodicidad compartida puede ser diaria, semanal, quincenal o mensual. El esquema personalizado exige rangos continuos desde cero, porcentajes entre 0 y 100 y un último nivel sin límite. `normalizeProfessionalCommission` migra automáticamente el campo legacy de modalidad única a `modes[]` y el antiguo monto fijo compartido a los dos importes de cita. Esta configuración se conserva dentro de `ProfessionalRecord` y `localStorage`, pero todavía no ejecuta un cálculo real de comisiones ni genera movimientos de pago.

El catálogo de Servicios incluye listados por categoría, búsqueda, estados y edición; servicios individuales y con sesiones; clases con capacidad y horario por día; paquetes con selección de servicios y precio personalizado; adicionales; categorías; servicio destacado; nombres alternativos; sitio web con pago en línea; opciones avanzadas (modalidad, comisión por porcentaje o moneda, recursos y horario especial); y carga/descarga masiva de precios `.xlsx` en modo mock (no procesa archivos reales ni persiste). La carga/descarga masiva y la subida de plantillas son flujos visuales/mock: todavía no procesan archivos reales ni persisten información. La prioridad inmediata de Servicios es terminar la revisión visual e interacción de `Opciones avanzadas`; la conexión con API y Prisma queda para la fase de persistencia.

**Alcance administrativo por módulo:**

| Módulo                 | Alcance funcional                                                                                                                                                                  | Estado de definición                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Comercios y sucursales | Comercio como entidad principal con estado, horario semanal/24 horas y entidades asociadas; sucursales con ubicación y contacto                                                    | Implementado local/mock y sincronizado con Agenda mediante `localStorage`    |
| Profesionales          | Asignación múltiple a comercios/sucursales, datos básicos, servicios, horario, descansos, perfil, grupos personalizados y configuración obligatoria de comisiones cuando se activa | Implementado local/mock                                                      |
| Servicios              | Servicios, clases, paquetes, adicionales, categorías, precios masivos                                                                                                              | Definido por capturas                                                        |
| Comisiones             | Por profesional, servicio/producto y valor por defecto; porcentaje o monto                                                                                                         | Definido por capturas                                                        |
| Recursos               | Recursos generales y recursos con horario, asignación a servicios y locales                                                                                                        | Definido por capturas                                                        |
| Encuestas              | Encuestas, preguntas de apreciación/comentario, asociación a servicios y preview vivo con estrellas                                                                                | Parcial; falta flujo de resultados                                           |
| Consentimientos        | Nombre, carga visual de archivo PDF/DOC/DOCX, tabla con búsqueda, edición y eliminación                                                                                            | Catálogo local/mock; falta firma, flujo operativo y persistencia             |
| WhatsApp               | Catálogo con 13 mensajes operativos precargados, plantillas prediseñadas, variables agrupadas y preview estilo WhatsApp                                                            | Implementado local/mock; falta conexión del canal, envío real y persistencia |
| Gift Cards             | Gift card de servicio o monto, vencimiento, diseño, borrador/activar                                                                                                               | Definido por capturas                                                        |
| Colores de status      | Paleta por comercio para los estados de reserva, restauración de valores originales y desbloqueo por código                                                                        | Implementado local/mock; falta autorización real de servidor                 |
| Planes                 | No se implementa en este proyecto                                                                                                                                                  | Fuera de alcance                                                             |

`Local` y `Profesional` son entidades separadas: las sucursales se administran dentro de Comercios; los profesionales son personas reales y no sustitutos de sucursales.

### Configuraciones

- La ruta `/configuraciones` monta `SettingsWorkspace`; sus secciones se abren desde el grupo desplegable `Configuraciones` de la sidebar global y conservan `?section=` al navegar.
- El workspace ya no renderiza una sidebar propia. Detecta cambios sin guardar y pide confirmación antes de cambiar de sección desde la navegación global. Cada panel implementado guarda su propio documento local y ofrece feedback con `toast`; esto es una maqueta funcional local, no configuración multiusuario.
- Secciones visibles implementadas: `Empresa` (identidad, logo, URL de reservas, LinkPro, redes y datos públicos), `Agenda` (slot visual, reglas de reservas, límites, horario extendido y campos adicionales), `Pagos Keysar` (datos bancarios, link y proveedor externo), `Recordatorios` (email/WhatsApp), `Fichas médicas`, `E-mails`, `Clientes` (categorías, campos, opciones y filtros), `Encuestas` y `Códigos de autorización`.
- `Sitio web`, `Integraciones` y `Notificaciones` aparecen en la navegación con estado pendiente. Existe un panel de configuración de caja en el código, pero actualmente no tiene entrada visible en el sidebar; no tratarlo como un flujo expuesto hasta conectarlo a la navegación.
- Salvo el tamaño visual de slots descrito en Agenda, las opciones guardadas en estos paneles todavía no gobiernan reservas, pagos, mensajes ni sitios reales. Al conectar backend se deberá definir alcance por comercio/sucursal, permisos, validación de secretos y migración de los documentos existentes en `localStorage`.

### Reportes

La ruta `/reportes` contiene la primera fase local/mock de reportes: resumen ejecutivo con selector de periodo, KPIs comparativos y desgloses; `/reportes/reservas` implementa la vista General del reporte de reservas con rango de fechas, filtros, KPIs, ranking de servicios, distribución semanal y demanda por hora, más subvistas de Historial, Métricas, Locales, Servicios, Mensajería móvil y desgloses por local. El reporte de ventas todavía no está implementado. Los desgloses de Servicios por local y Prestadores por local cubren los 53 servicios de OPATRA MEXICO en el orden del reporte operativo.

### Navegación y UI

- La navegación primaria de Scheduler usa el Sidebar canónico de `@cosmetics/ui`: `SchedulerLayoutShell` lo monta una sola vez para todo `(dashboard)` y `SchedulerAppSidebar` organiza Principal y los grupos desplegables Reportes, Administración y Configuraciones. Solo un grupo permanece abierto y el correspondiente a la ruta activa se expande automáticamente. En escritorio es persistente y colapsable a iconos con tooltips; en móvil se presenta como Sheet con cierre explícito. Administración, Configuraciones y los desgloses de Reportes ya no renderizan sidebars propias: todas sus secciones viven en la navegación global y sincronizan su estado mediante ruta y `?section=`. Agenda tampoco mantiene una segunda columna lateral: sus filtros operativos de comercio, sucursal, profesionales, estatus, hora y calendario se abren en un Sheet derecho desde el botón `Filtros de agenda` del toolbar.
- Todo usa componentes de `@cosmetics/ui` y `toast` compartido; las pantallas montan `<Toaster />` en `src/app/layout.tsx`.
- La interfaz es responsive desde el inicio: navegación compacta en móvil, tarjetas apiladas, formularios de pantalla completa y tablas que se convierten en bloques legibles.
- Los modales de Scheduler permiten scroll vertical en el cuerpo, pero nunca scroll horizontal. `DialogContent`, `admin-dialog`, `scheduler-dialog` y sus cuerpos bloquean el eje X; pestañas, horarios, tablas editables y escalas de comisión deben envolver o transformarse en layouts apilados al reducir el viewport, sin depender de `min-width` de escritorio ni ocultar campos fuera del área visible.
- En la vista diaria, el grid limita su altura al viewport y maneja su propio scroll vertical; la esquina, los encabezados de profesionales y la columna de horas permanecen sticky. Las tarjetas y la línea de hora actual se posicionan proporcionalmente al intervalo visual configurado.

### Fases de construcción

- **Fase 0 — Contexto y base visual**: consolidar mapa de navegación y decisiones funcionales; mantener identidad Keysar, componentes de `@cosmetics/ui` y patrones de feedback; validar accesibilidad, estados vacíos, loading, errores y responsive.
- **Fase 1 — Shell administrativo**: navegación visible desde la agenda; pantalla `/administracion` con los módulos definidos; definir rutas, layouts y componentes compartidos sin inventar datos persistentes. Completada en modo local/mock; la prioridad actual es terminar `Opciones avanzadas`, validar todos los modales y cerrar el acabado visual antes de conectar backend.
- **Fase 2 — Catálogos base**: implementar Comercios/sucursales, Profesionales y Servicios con listado, búsqueda/filtros, crear, editar, activar/desactivar y confirmaciones. Implementada en local/mock.
- **Fase 3 — Reglas operativas**: implementar Comisiones, Recursos y Gift Cards; integrar horarios, descansos, recursos, categorías y restricciones de reserva; cubrir flujos alternativos de gift card de servicio y de monto. Implementada en local/mock.
- **Fase 4 — Comunicación y documentos**: conectar WhatsApp real, envío de mensajes y persistencia de plantillas; implementar Consentimientos como catálogo de documentos; definir antes de construir el flujo de resultados de Encuestas y el uso de Consentimientos dentro de una cita. Catálogo y configuración implementados en local/mock; Consentimientos ya incluye nombre, archivo, validación de 5 MB, tabla CRUD y confirmación de eliminación; firma, uso dentro de una cita y persistencia siguen fuera de alcance.
- **Fase 5 — Persistencia y conexión con agenda**: modelar y validar `Cliente`, `Servicio`, `Cita`, `BloqueHorario` y las entidades administrativas necesarias; crear endpoints `/api/scheduler` y conectar el frontend sin romper el mock actual; aplicar permisos por rol y reglas de sucursal. Pendiente: no iniciar hasta cerrar el acabado visual y recibir autorización explícita para modificar backend/Prisma.
- **Fase 6 — Calidad y operación**: pruebas de flujos completos, responsive y accesibilidad; estados de error/reintento y protección contra cambios destructivos; preparar despliegue cuando el comportamiento local esté validado.

**Criterios para cada módulo**: antes de marcar un módulo como terminado deben existir listado, estado vacío, búsqueda o filtro cuando aplique, alta, edición, validaciones, confirmación para eliminar/desactivar, feedback de éxito/error, comportamiento móvil y documentación de las decisiones no visibles en las capturas.

---

## Payroll: implementación actual

`apps/payroll` es una app operativa conectada a `backend/api` y PostgreSQL; ya no usa fixtures ni contextos mock. La referencia funcional original fue `nomina.xlsx`, pero las fórmulas viven en backend y cada corrida conserva snapshots históricos.

### Límites y seguridad

- La UI y todos los endpoints `/api/payroll/*` requieren sesión JWT y permisos efectivos de Payroll. `SUPER_ADMIN` tiene acceso total; los demás usuarios entran únicamente cuando su puesto tiene al menos una pantalla permitida en `PositionPayrollScreenPermission`. `GET`/`HEAD` requieren `allowed`; `POST`/`PUT`/`PATCH`/`DELETE` requieren además `canWrite`. El sidebar y el guard de rutas aplican la visualización, la UI oculta controles de mutación en modo solo lectura y el backend mantiene la validación autoritativa por familia de endpoints.
- Payroll reutiliza `Empleado`, `Bank`, `Position`, `Sucursal`, `Venta` y `VentaDetalle`. La administración permanece en Envelope; Payroll los consume en lectura.
- `Empleado.sucursalId` es nullable y conserva una sucursal laboral concreta; `Empleado.todasSucursales` distingue la selección explícita `TODAS` de `Sin sucursal asignada`. Cuando `todasSucursales = true`, `sucursalId` debe ser `null`. Por decisión operativa vigente, este dato es informativo para Payroll y no interviene en el cálculo ni en el reporte por sucursal.
- Los cambios propios de nómina deben limitarse a `apps/payroll`, rutas/servicios/modelos Payroll en `backend/api` y documentación relacionada. La relación laboral `Empleado.sucursalId` se administra exclusivamente desde `apps/envelope`.
- Las migraciones `20260730000000_add_payroll_models`, `20260731000000_add_employee_branch`, `20260801000000_add_employee_all_branches`, `20260813010000_add_recurring_payroll_expenses`, `20260813020000_add_payroll_expense_categories`, `20260813030000_link_payroll_expense_categories`, `20260822000000_add_payroll_access_control` y `20260823000000_add_payroll_read_only_access` son aditivas. Deben revisarse y ejecutarse manualmente con `prisma migrate deploy`; nunca usar `db push`, `migrate reset` ni seeds demo contra producción.
- Los adjuntos están preparados para un bucket privado de Supabase Storage, pero su habilitación está pospuesta. Cuando se cree el bucket, configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y opcionalmente `PAYROLL_STORAGE_BUCKET`; nunca exponer la service-role key al frontend.

### Fuentes reales reutilizadas

| Dato                                         | Fuente                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Empleado, activo/inactivo, sueldo y teléfono | `Empleado`                                                                                    |
| Banco y cuenta                               | `Empleado.bankId`/`Bank`, con compatibilidad para `Empleado.banco`, y `Empleado.numeroCuenta` |
| Puesto                                       | `Empleado.positionId`/`Position`, con compatibilidad para `Empleado.puesto`                   |
| Sucursal laboral informativa                 | `Empleado.sucursalId`/`Sucursal`; no interviene en el desglose de Payroll                     |
| Ventas por fecha, vendedor y sucursal        | `Venta` + suma de `VentaDetalle.cantidad`                                                     |
| Sucursales                                   | `Sucursal`                                                                                    |

Los catálogos de métodos de pago no participan en el cálculo de comisión. Los empleados inactivos se conservan en históricos y entran en una corrida si tienen actividad dentro del periodo.

### Backend y modelos

- Router: `backend/api/src/routes/payroll.routes.ts`.
- Motor puro: `backend/api/src/services/payroll-calculation.ts`.
- Ciclo de corridas y snapshots: `backend/api/src/services/payroll.service.ts`.
- Storage privado: `backend/api/src/services/payroll-storage.ts`.
- Modelos: `PositionPayrollScreenPermission`, `PayrollCatalogItem`, `CommissionScheme`, `CommissionSchemeVersion`, `CommissionSchemeTier`, `EmployeeCommissionAssignment`, `PayrollRun`, `PayrollRunLine`, `PayrollRunBranchLine`, `PayrollMovement`, `PayrollMovementAllocation`, `PayrollAttachment`, `PayrollExpense`, `PayrollExpenseCategory`, `PayrollExpenseRecurrence`, `PayrollExpenseRecurrenceVersion`, `LoanAdvance`, `LoanAdvanceInstallment`, `PayrollReceipt` y `PayrollAuditEvent`.
- El schema canónico y el duplicado en `backend/api/src/prisma/schema.prisma` deben mantenerse sincronizados. Payroll usa el cliente estándar `@prisma/client`, regenerado durante el build del backend; no importar clientes generados desde rutas relativas porque `dist` no incluye esos artefactos.

La API cubre bootstrap de fuentes compartidas; CRUD de catálogos, esquemas/versiones/asignaciones, movimientos, gastos y préstamos; adjuntos; corridas y transiciones; desglose por sucursal; recibos y seguimiento de WhatsApp.

### Reglas de cálculo y ciclo de vida

- Solo se aceptan quincenas completas: días 1–15 o 16–último día del mes. El sueldo quincenal es `Empleado.sueldo / 2`; sueldo nulo equivale a cero y genera advertencia.
- Resumen ofrece las quincenas estándar de los últimos 12 meses. Seleccionar un periodo existente abre su corrida; seleccionar uno vacío limpia la corrida activa y permite crear el borrador histórico. El periodo de una corrida existente no se muta.
- Cada corrida elige `WITH_VAT` o `WITHOUT_VAT`. Con IVA se usa venta bruta; sin IVA se usa `venta / 1.16`. La misma base selecciona el rango y calcula `base × tasa`.
- Rangos de comisión son continuos, inician en cero y el último no tiene límite superior. Versiones y asignaciones tienen vigencia; cambios existentes solo aplican desde la siguiente quincena.
- El desglose usa la sucursal real de cada `Venta`. Sueldo, comisión y préstamo se distribuyen proporcionalmente entre las sucursales donde el empleado tuvo ventas en la quincena, conservando los centavos exactos; si no tuvo ventas, esos importes se asignan a `CORPORATIVO`. `Empleado.sucursalId` no participa en esta consulta ni en sus snapshots.
- Esta distribución se materializa al crear o recalcular una corrida. Las corridas `APPROVED`/`PAID` conservan sus `PayrollRunBranchLine` históricos y no se reescriben; un borrador anterior debe recalcularse para adoptar la regla vigente.
- Cada asignación de movimiento captura su propia sucursal o `CORPORATIVO`; ese centro se conserva en `PayrollMovementAllocation` y alimenta el desglose. Los gastos mantienen un centro de costo independiente porque no están vinculados a un empleado.
- Los movimientos pendientes que todavía no pertenecen a una corrida pueden editarse o eliminarse desde `/movimientos`. El borrado requiere confirmación, elimina también sus comprobantes privados y conserva un evento de auditoría; movimientos aprobados, rechazados o reservados mantienen sus acciones bloqueadas.
- Una corrida transita `DRAFT → APPROVED → PAID`; puede cancelarse antes de pagar. Aprobar congela líneas y reserva movimientos, gastos y cuotas. Pagar liquida cuotas reservadas y genera recibos. Una corrida pagada no se recalcula ni cancela.
- El consolidado mensual es un reporte derivado, no una corrida nueva ni una entidad persistida. Incluye corridas `DRAFT`, `APPROVED` y `PAID`, excluye `CANCELED`, agrupa las líneas por `employeeId` y suma por separado primera quincena, segunda quincena, sueldo, ventas, comisión, extras, deducciones y total. Para una quincena terminada sin corrida, reutiliza el motor de cálculo sin `runId` y devuelve una referencia sintética `ESTIMATED`; no reserva ni persiste datos. El cierre del periodo se compara contra la fecha de negocio de `America/Mexico_City`. Si existe una corrida real en el mes, la estimación usa su modo; si no existe ninguna usa `WITH_VAT`. La estimación recupera ventas y sus sucursales, esquemas/asignaciones, movimientos, gastos y cuotas aplicables al periodo, pero sueldo, banco, cuenta y teléfono proceden del registro de empleado disponible al consultar, porque no existe snapshot histórico. Por eso siempre se presenta como aproximada hasta crear la corrida histórica. Una quincena actual o futura sin corrida sigue incompleta.
- En el detalle quincenal de comisiones, `TOTAL PAGO` no agrega `salaryBase`: se compone de comisión, bonos, ajustes positivos, viáticos e insumos menos multas, ajustes negativos y préstamos. La tabla y las exportaciones PDF/Excel deben reutilizar `commissionPaymentTotal`; no duplicar la fórmula ni volver a sumar el sueldo mostrado en su columna informativa.
- Bloquea aprobación: ventas sin esquema/rango, pago total negativo o viáticos/insumos sin evidencia. Sueldo faltante es advertencia. Banco o cuenta faltante bloquean pago. Teléfono faltante bloquea solo la preparación de WhatsApp.
- En la vista quincenal de Resumen, el bloque de atención combina las advertencias guardadas en cada línea con una comprobación informativa de la asignación laboral actual. Solo `sucursalId = null` con `todasSucursales = false` incluye el pendiente `SUCURSAL`; una selección explícita `TODAS` se considera configurada. Esta asignación no modifica la corrida ni el desglose por punto de venta. Para evitar paredes de texto, el bloque muestra por defecto únicamente el número de empleados, el total de pendientes y conteos por tipo (`ESQUEMA`, `SUELDO`, `TELÉFONO`, `SUCURSAL`, etc.); `Ver detalle por empleado` despliega una `DataTable` paginada con la cantidad y etiquetas breves de los datos faltantes de cada persona.
- Si una corrida en borrador conserva `MISSING_SCHEME` pero Resumen detecta que el empleado ya tiene una asignación y una versión de esquema aplicables al inicio de esa quincena, la page recalcula esa corrida una sola vez con la configuración vigente. No se recalculan corridas aprobadas o pagadas, porque sus líneas son snapshots históricos.
- Préstamos y adelantos generan cuotas quincenales automáticas; el último pago absorbe el ajuste de centavos. El descuento de una corrida se limita al pago positivo disponible del empleado y las cuotas programadas vencidas se arrastran a la siguiente corrida. Aprobar reserva las cuotas originales sin mutar el calendario, para que cancelar restaure exactamente su estado anterior. Al pagar, si la corrida solo cubre parte de una cuota, la porción aplicada queda pagada y el remanente se programa para la quincena siguiente. Las corridas aprobadas/pagadas conservan sus snapshots y los estados históricos no se eliminan.
- Los gastos con frecuencia `MONTHLY` o `BIWEEKLY` se administran como series recurrentes versionadas. `PayrollExpenseRecurrenceVersion` conserva concepto, categoría, monto, centro de costo, frecuencia, ancla del calendario y vigencia; editar una serie cierra la versión anterior y crea otra desde la siguiente aplicación elegida. El motor materializa una `PayrollExpense` concreta por fecha al consultar gastos o calcular una corrida. Esa ocurrencia conserva `branchId` y puede ligarse a una sola corrida al aprobarla. Las corridas aprobadas no se reescriben; los gastos legacy sin `recurrenceId` continúan como ocurrencias individuales aunque históricamente tengan una frecuencia distinta de `ONE_TIME`. Las estimaciones mensuales calculan recurrencias faltantes en memoria y no crean registros.
- Las categorías de gasto se administran desde la misma page `/gastos` mediante `PayrollExpenseCategory`: se pueden crear, renombrar y desactivar con confirmación. El formulario solo acepta categorías activas del catálogo. `PayrollExpense.category` conserva el nombre como snapshot histórico y `categoryId` enlaza el catálogo para las capturas futuras; renombrar actualiza ocurrencias todavía no congeladas, pero no reescribe gastos incluidos en corridas aprobadas. No se puede desactivar una categoría usada por una recurrencia activa. La migración inicial recupera los nombres ya usados en gastos y recurrencias para no perder opciones existentes.
- La page `/gastos` contiene exactamente dos tablas visibles: **Gastos**, cuya vista principal es **Historial** y deja **Recurrentes activos** como consulta secundaria para no presentar una serie y su ocurrencia como cargos duplicados, y **Categorías de gasto**, con acciones de edición y eliminación lógica. En el selector de vista, **Historial** ocupa la posición izquierda y queda activo al abrir la pantalla. Las métricas cambian con la vista: aplicaciones reales de los últimos 12 meses frente a programación activa.
- En Préstamos y adelantos, el usuario puede seleccionar cualquier día dentro de la primera quincena de cobro. El frontend normaliza la selección al inicio canónico del periodo: días 1–15 al día 1 y días 16–fin al día 16, que es el contrato enviado al motor de amortización.
- Al seleccionar **ADELANTO DE NÓMINA** en `/prestamos-adelantos`, la primera quincena de cobro se propone desde la fecha de solicitud para que `Guardar y recalcular` lo descuente de la corrida correspondiente; en préstamos se conserva la siguiente quincena como propuesta. La fecha sigue siendo editable. Este comportamiento solo aplica a capturas/ediciones futuras: no muta solicitudes guardadas ni recalcula snapshots existentes automáticamente.
- Recibos se generan desde el snapshot pagado, se descargan en PDF con la composición editorial canónica y el logo real de `apps/payroll/public/logo.svg`, y WhatsApp se abre mediante `wa.me`; el archivo se adjunta manualmente. Estados: `GENERATED`, `SENT`, `CONFIRMED`.
- `GET /api/payroll/reports/live-preview?periodStart=AAAA-MM-DD&periodEnd=AAAA-MM-DD&mode=WITH_VAT|WITHOUT_VAT` calcula en memoria una quincena con las fuentes vigentes, incluidos conceptos ya ligados a una corrida de ese periodo. No crea ni recalcula corridas, no materializa recurrencias, no reserva movimientos/gastos/cuotas y no altera préstamos, recibos ni auditoría. Se usa para consultas operativas que deben mostrar el estado actual independientemente del ciclo `DRAFT → APPROVED → PAID`.

### Frontend operativo

Rutas: `/`, `/nomina-salario-fijo`, `/nomina-especialistas`, `/nomina-comisiones`, `/bonos`, `/multas`, `/viaticos`, `/movimientos`, `/gastos`, `/esquemas`, `/prestamos-adelantos`, `/reportes/desglose-sucursal`, `/recibos`, `/accesos` y `/login`. La ruta `/` contiene las vistas quincenal y mensual; no se crea una page separada para el consolidado.

- `apps/payroll/src/lib/session.tsx` gestiona la sesión real, resuelve `canManagePayrollAccess`, `payrollScreenPermissions` y `payrollWritePermissions`, bloquea rutas sin permiso, expone `canWrite(screenKey)` y redirige a la primera pantalla permitida. El login admite cualquier cuenta con al menos una pantalla de Payroll y mantiene el rechazo explícito cuando el puesto no tiene acceso.
- `apps/payroll/src/components/payroll/payroll-data-context.tsx` conecta toda la UI a `/api/payroll/*`.
- El sidebar de Payroll replica el patrón canónico de Envelope: `Nómina`, `Operación`, `Configuración`, `Reportes` y, cuando corresponde, `Administración` son categorías desplegables accesibles. Solo muestra las pantallas permitidas al puesto, solo una categoría permanece abierta y la categoría de la ruta activa se abre automáticamente al cargar y navegar. En modo icon-only se mantienen visibles todas las opciones autorizadas con tooltip y cada enlace activo expone `aria-current="page"`. El footer oculta las preferencias al colapsarse, usa una fila `role="switch"` para alternar tema claro/oscuro con la preferencia compartida `keysar-theme`, conserva `Cerrar sesión` como acción con tooltip y no muestra textos decorativos debajo del botón. Payroll no agrega selector de idioma mientras no tenga un proveedor de i18n propio.
- `apps/payroll/src/lib/access.ts` es el catálogo canónico de rutas/pantallas de Payroll. Los keys usan el prefijo `payroll/`; al agregar una page también debe registrarse allí, en `PAYROLL_SCREEN_KEYS` de `@cosmetics/types` y en la resolución de endpoints de `backend/api/src/routes/payroll.routes.ts`.
- `/accesos` consume `GET /api/payroll/access/bootstrap`, que entrega puestos, empleados y cuentas con una selección explícita de campos públicos; nunca debe exponer `passwordHash`, tokens de configuración ni otros secretos. `PUT /api/payroll/access/users/:employeeId/credentials` crea o actualiza correo y contraseña, mientras `DELETE /api/payroll/access/users/:id` elimina la cuenta de acceso y protege `SUPER_ADMIN`. Todas estas rutas requieren `requirePayrollAccessManager`.
- Exportaciones PDF/Excel se generan desde datasets reales con imports dinámicos.
- Las exportaciones PDF/Excel de Resumen omiten sueldo base, totales quincenales/mensuales y cualquier suma que permita inferir el sueldo; la tabla operativa en pantalla conserva su detalle completo.
- `/recibos` y `/reportes/desglose-sucursal` ya no dependen de la corrida seleccionada en Resumen. Ambas abren en la quincena vigente, permiten elegir cualquier quincena estándar de los últimos 12 meses y el modo con/sin IVA, consultan el cálculo en memoria al abrir, al cambiar filtros, al recuperar foco y cada 60 segundos, y ofrecen actualización manual. Desglose y sus exportaciones siempre usan esa vista actual. Recibos separa **Vista actual** —previsualizaciones provisionales descargables que no acreditan pago— de **Emitidos**, que conserva el snapshot, estatus y acciones de WhatsApp de los recibos creados al pagar; `GET /api/payroll/receipts` acepta también `periodStart` + `periodEnd` para cargar esos históricos sin depender de `selectedRun`.
- Las pages `/movimientos`, `/gastos` y `/prestamos-adelantos` comparten un filtro accesible de periodo con dos calendarios separados (`DateRangePicker`). El rango se inicia abierto para conservar todos los registros disponibles y, al elegir fechas, filtra tabla, contadores y métricas; **Limpiar fechas** restaura la vista completa. PDF y Excel reciben exactamente el mismo dataset filtrado y agregan el periodo al subtítulo y nombre del archivo. En `/gastos`, la exportación y el contador siguen la pestaña activa (`Recurrentes activos` o `Historial`) sin incluir el catálogo de categorías.
- `apps/payroll/src/lib/report-export.ts` debe cargar `jsPDF` y `autoTable` mediante sus exports nombrados al hacer clic. Con las versiones actuales, el `default` de `jspdf` no es el constructor y provoca un error de runtime aunque TypeScript y el build terminen correctamente; no volver a usar `import("jspdf").default`.
- Los catálogos arrancan vacíos: no crear seed de bonos, multas, viáticos, esquemas ni préstamos salvo instrucción explícita.
- Mantener snapshots y datos históricos; las ediciones solo afectan registros en borrador/pendientes que todavía no pertenecen a una corrida aprobada.

#### Captura de esquemas de comisión

La page `apps/payroll/src/app/(dashboard)/esquemas/page.tsx` guía la captura y conserva el contrato decimal del backend sin exponerlo al usuario:

- La UI usa el término **Comisión** y recibe un porcentaje humano entre `0` y `100`; por ejemplo, el usuario escribe `10` para `10%`. Antes de llamar a `/api/payroll/schemes`, el frontend lo convierte a `0.10`.
- El primer nivel siempre inicia en `$0.00` y el campo es de solo lectura.
- El último nivel siempre muestra `Sin límite`; el usuario no captura `toAmount` para ese nivel.
- Al agregar niveles, `Ventas desde` se calcula automáticamente como el límite anterior más `$0.01`. El usuario solo captura los cortes intermedios y el porcentaje de cada nivel.
- Se permiten de 1 a 12 niveles. Los límites deben ser montos válidos y ascendentes; la automatización mantiene continuidad sin huecos ni traslapes.
- El nombre es obligatorio, único y de máximo 80 caracteres. La vigencia debe comenzar el día 1 o 16 del mes.
- Desactivar un esquema no elimina su nombre, versiones ni asignaciones históricas. Si se captura nuevamente el mismo nombre, la UI detecta el registro inactivo y ofrece reactivarlo con su configuración histórica mediante `PATCH /api/payroll/schemes/:id/reactivate`; no debe tratarlo como un duplicado activo ni crear otra identidad para el mismo esquema.
- Los errores se muestran junto al campo, con `role="alert"`/`aria-invalid`, ejemplos y mensajes de recuperación. No volver a sustituirlos por un único toast genérico.
- Editar un esquema programa una nueva versión; no muta versiones usadas por corridas históricas.
- La primera asignación de esquema a un empleado propone la quincena actual. Solo cuando el empleado ya tiene una asignación abierta se propone la siguiente quincena; no volver a usar la siguiente quincena como valor inicial indiscriminado porque deja la corrida actual sin esquema.
- El backend rechaza asignaciones cuya fecha sea anterior a la primera versión vigente del esquema. Una corrida en borrador conserva su snapshot hasta presionar **Recalcular** después de corregir una asignación.
- Crear, actualizar o recalcular una corrida usa en el cliente Payroll un timeout específico de 120 segundos porque el cálculo productivo puede superar los 15 segundos del cliente HTTP compartido. El botón **Recalcular** debe conservar estado de carga con spinner, texto `Recalculando...`, bloqueo de clics duplicados, `aria-busy` y un mensaje persistente `role="status"` que advierta que puede tardar hasta dos minutos; al terminar muestra éxito o error mediante toast. No invocar `runAction("recalculate")` directamente sin manejar la promesa.
- Las reglas equivalentes siguen validadas en backend. No relajarlas: la UI debe automatizarlas y explicarlas.

### Documentación operativa de Payroll

- `apps/payroll/PENDIENTES.md` registra despliegues por ambiente, el bucket pospuesto y las decisiones/preguntas de implementación.
- `apps/payroll/GUIA_PRIMERA_NOMINA.md` explica al usuario qué capturar cuando Payroll está vacío y cómo recorrer una primera corrida.
- El bucket privado de comprobantes está pospuesto. Sin configurarlo funcionan empleados, ventas, catálogos, esquemas, movimientos sin evidencia, gastos, préstamos, corridas, reportes, PDF/Excel, recibos y preparación de WhatsApp. Viáticos e insumos pueden guardarse pendientes, pero no aprobarse sin evidencia.
- Mientras el bucket no exista, no configurar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` de Storage en Fly; hacerlo habilitaría una carga que después fallaría.

### Validación

```bash
pnpm --filter @cosmetics/payroll type-check
pnpm --filter @cosmetics/payroll build
pnpm --filter @cosmetics/api test
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api build
pnpm lint
pnpm type-check
```

El motor tiene pruebas de base con/sin IVA, selección de tasa, distribución exacta por sucursal, advertencias/bloqueos y amortización quincenal. Probar flujos integrados únicamente en una BD de desarrollo con la migración aplicada; no usar producción como ambiente de QA.
La suite de integración `backend/api/src/app.integration.test.ts` requiere `RUN_DATABASE_TESTS=true` y una BD PostgreSQL desechable con todas las migraciones aplicadas; nunca debe apuntar a producción.

---

## Referencia histórica: diseño de Payroll desde `nomina.xlsx`

> Esta sección conserva únicamente el análisis que originó la implementación. **No representa pendientes ni el estado actual.** Si contradice “Payroll: implementación actual”, prevalece siempre la implementación actual.

Archivo de referencia analizado: `nomina.xlsx`.
Cada hoja del Excel describe procesos actuales de nómina que hoy se resuelven con archivos de Excel. No debe copiarse literalmente el formato visual ni las fórmulas rotas/externas (`#REF!`, referencias tipo `[1]!Tabla...`); debe modelarse el proceso en el sistema.

### Decisión arquitectónica recomendada

Implementar nómina en `apps/payroll`, no dentro de `apps/envelope`.

Razones:

- `apps/payroll` ya existía como app interna en puerto `3002`; inicialmente tuvo una demo frontend con mocks. La implementación real y `backend/api/src/routes/payroll.routes.ts` ya están terminados.
- `envelope` ya tiene una responsabilidad clara: captura/control de ventas por sucursal, sobres, empleados, catálogos y reportes de ventas.
- Payroll introduce datos más sensibles y reglas diferentes: préstamos, adelantos, recibos, sueldos, ajustes, aprobaciones, cálculos históricos y pagos.
- Payroll debe reutilizar fuentes de `envelope` (`Empleado`, `Sucursal`, `Venta`, `VentaDetalle`, `Bank`, `Position`), pero no vivir visualmente ni conceptualmente dentro del flujo de sobre.
- Separar apps evita que el sidebar, permisos y reportes de `envelope` crezcan demasiado y mezclen operación diaria de ventas con administración de nómina.

Modelo recomendado:

- Frontend: pantallas implementadas en `apps/payroll`.
- Backend: endpoints `/api/payroll/*` implementados dentro de `backend/api/src/routes/payroll.routes.ts`.
- Base de datos: modelos Prisma de nómina agregados mediante migración aditiva y relacionados con modelos existentes.
- Cálculos de nómina: implementados en backend con snapshots por corrida; no dependen de cálculos en cliente.
- UI: reutilizar `@cosmetics/ui`, `DataTable`, `DatePicker`/`DateRangePicker`, `AlertDialog`, `toast` y reglas visuales existentes.

### Estado anterior de `apps/payroll` como demo frontend

Antes de la implementación real existió un frontend con datos mock locales. Esos mocks ya fueron eliminados.

Archivos principales:

- `apps/payroll/src/lib/mock-data.ts` — fixtures mock de empleados, corridas, movimientos, catálogos de bonos/multas/viáticos, gastos, esquemas, préstamos, desglose por sucursal y recibos.
- `apps/payroll/src/lib/format.ts` — helpers de moneda, porcentaje, fecha y sumatorias.
- `apps/payroll/src/lib/report-export.ts` — exportación cliente PDF/Excel con dependencias pesadas cargadas mediante imports dinámicos.
- `apps/payroll/src/components/payroll/payroll-shell.tsx` — shell/sidebar responsive alineado con `envelope`, con logo real, navegación colapsable y switch light/dark.
- `apps/payroll/src/components/payroll/bonus-catalog-context.tsx` — contexto mock compartido para catálogos y gastos; conserva cambios durante la navegación cliente sin persistirlos.
- `apps/payroll/src/components/payroll/report-export-buttons.tsx` — botones reutilizables de PDF/Excel con estados de carga y feedback por toast.
- `apps/payroll/src/components/payroll/metric-card.tsx` — tarjetas KPI.
- `apps/payroll/src/components/payroll/section-card.tsx` — contenedor estándar de secciones.
- `apps/payroll/src/components/payroll/status-badge.tsx` — badges de estados mock.
- `apps/payroll/src/app/globals.css` — tokens y sistema tipográfico compartidos con `envelope`, más aliases de compatibilidad para los componentes mock existentes.
- `apps/payroll/src/app/layout.tsx` — metadatos, favicon, tipografía y script anti-flash del tema alineados con `envelope`.
- `apps/payroll/public/` — copia local del logo, fondo editorial del login y fuentes Emofera/Gilroy canónicas de `envelope` para que la app sea autónoma en runtime.

Reglas visuales de `payroll`:

- Todos los H1 usan `.page-title` con `Emofera Regular`; no aplicar `font-bold` ni `font-semibold` a `font-brand`.
- El cuerpo y texto de soporte usan `Gilroy` vía `font-sans`; `Inter` queda solo como fallback.
- Reutilizar los tokens `--bg-primary`, `--bg-card`, `--text-primary`, `--text-muted`, `--accent`, `--accent-hover` y `--border-color`; evitar hexadecimales de superficie dentro de pages/components.
- Cards y paneles deben conservar el lenguaje compacto de `envelope`: fondo sólido legible en light/dark, borde nude, shadow sutil y radios de 10px/12px.
- Los botones primarios deben mantener contraste alto y los botones destructivos deben incluir texto además del color; todos los elementos interactivos deben mostrar cursor, hover y foco visibles.
- El login de `payroll` replica la composición editorial de `envelope` y usa autenticación JWT real con guard exclusivo `SUPER_ADMIN`.
- Todo componente nuevo debe validarse a 375px, 768px, 1024px y 1440px, sin scroll horizontal, y respetar `prefers-reduced-motion`.

Pantallas que se prototiparon originalmente con mocks y después se conectaron al backend real:

- `/` — Summary de nómina: resumen tipo `PANTALLA SUMARY`, KPIs, selector de rango, modo con IVA/sin IVA y tabla por empleado con ventas, esquema, comisión, bonos, multas, préstamos, ajustes, viáticos y total. La tabla ya no muestra `sueldo base`; el balance general mock descuenta nómina y gastos de las ventas con IVA.
- `/bonos` — Catálogo mock de bonos predefinidos con alta/edición/borrado.
- `/multas` — Catálogo mock de multas predefinidas con alta/edición/borrado.
- `/viaticos` — Catálogo mock de viáticos predefinidos con alta/edición/borrado.
- `/movimientos` — Ajustes, multas, viáticos e insumos: tabla, formulario mock en modal, división entre personas, confirmación y aviso de adjuntos; bonos, multas y viáticos abren un select secundario conectado a su catálogo. Los movimientos creados se agregan a la tabla durante la sesión.
- `/gastos` — Formulario y tabla mock para gastos fijos/variables; los registros compartidos por contexto se descuentan del balance general de `/`.
- `/esquemas` — Esquemas de comisión: catálogo por rangos `de/hasta/tasa` y asignación por empleado.
- `/prestamos-adelantos` — Amortización: préstamos, adelantos, pagos, saldo y estatus.
- `/reportes/desglose-sucursal` — reporte real de ventas y costo por punto de venta: conserva `Venta.sucursalId`, distribuye proporcionalmente sueldo/comisión/préstamo y usa la sucursal propia de los movimientos; incluye desglose por empleado, resumen, gráfica y exportación PDF/Excel.
- `/recibos` — Recibos por empleado: estatus generado/enviado/confirmado y acción mock de visualización/envío.
- `/login` — En la demo original era un login visual mock; hoy usa autenticación JWT real y guard `SUPER_ADMIN`.

Limitaciones históricas de la demo eliminada (no describen la implementación actual):

- No persiste información.
- No consume API.
- No autentica ni valida permisos reales.
- No sube archivos reales.
- Las exportaciones PDF/Excel se generan realmente en cliente para resumen, movimientos, préstamos/adelantos y desglose por sucursal, pero contienen exclusivamente datasets mock. Los valores de estatus se traducen al español antes de construir el archivo; no exportar los enums internos en inglés.
- No guarda snapshots reales de corridas.
- Los movimientos/formularios disparan `toast` y diálogos de confirmación solo para simular flujo.

### Datos existentes que Payroll debe reutilizar

| Dato                               | Estado actual | Fuente                                                          |
| ---------------------------------- | ------------- | --------------------------------------------------------------- |
| Empleados activos/inactivos        | Existe        | `Empleado.activo`                                               |
| Nombre completo                    | Existe        | `Empleado.nombreCompleto`                                       |
| Banco                              | Existe        | `Empleado.bankId` / `Bank`                                      |
| Cuenta bancaria                    | Existe        | `Empleado.numeroCuenta`                                         |
| Puesto                             | Existe        | `Empleado.positionId` / `Position`                              |
| Sueldo base                        | Existe        | `Empleado.sueldo`                                               |
| Teléfono                           | Existe        | `Empleado.numeroTelefono`                                       |
| Fecha nacimiento                   | Existe        | `Empleado.fechaNacimiento`                                      |
| Meta individual                    | Existe        | `Empleado.metaIndividual`                                       |
| Sucursal laboral                   | Existe        | `Empleado.sucursalId` / `Sucursal` + `Empleado.todasSucursales` |
| Sucursales                         | Existe        | `Sucursal`                                                      |
| Ventas por fecha/sucursal/vendedor | Existe        | `Venta` + `VentaDetalle`                                        |
| Métodos de pago                    | Existe        | `MetodoPago`                                                    |

Nota importante:

- `Empleado.sucursalId` y `Usuario.sucursalId` son relaciones distintas. La primera, junto con `Empleado.todasSucursales`, conserva la asignación laboral como dato informativo y la segunda limita el alcance de una cuenta; ninguna sustituye la sucursal propia de `Venta` en el reporte de Payroll.
- Las migraciones aditivas `20260731000000_add_employee_branch` y `20260801000000_add_employee_all_branches` agregan la FK nullable y el indicador explícito `TODAS`. Los empleados existentes permanecen como `Sin sucursal asignada` hasta que se actualicen en Envelope.

### Datos que faltaban antes de la implementación

| Proceso                 | Datos/modelos faltantes                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Bonos, multas y ajustes | Tipos de movimiento, monto, estatus, aprobaciones, notas, adjuntos, división entre empleados, flag comisionable/no comisionable |
| Esquemas de comisión    | Catálogo de esquemas, rangos `de/hasta/tasa`, asignación por empleado                                                           |
| Corrida de nómina       | Periodo, día de pago, modo con IVA/sin IVA, líneas calculadas, snapshots, estado borrador/aprobado/pagado                       |
| IVA / sin IVA           | Configuración de IVA y modo de cálculo por corrida                                                                              |
| Préstamos / adelantos   | Solicitud, calendario de pagos, saldo, estatus pendiente/pagado/perdido                                                         |
| Recibos                 | Generación, PDF, envío, confirmación del empleado, historial                                                                    |
| Desglose por sucursal   | Reglas de asignación de costo por punto de venta                                                                                |
| Retenciones             | Modelo de deducciones/retenciones si se usarán realmente                                                                        |
| Kiosco                  | Definición de comisión kiosco y porcentaje si sigue vigente                                                                     |

### Análisis por hoja de `nomina.xlsx`

#### `pantalla de bonos`

Convertir en una pantalla de **Movimientos de nómina**, no solo "Bonos".

Debe cubrir:

- Bonos positivos.
- Ajustes positivos.
- Ajustes negativos.
- Multas.
- Viáticos.
- Insumos.
- Bono personal.
- Movimiento compartido entre 2 a 5 personas.
- Evidencia/adjunto para viáticos e insumos.
- Estatus: pendiente, aprobado, rechazado.
- Confirmación antes de guardar.

La administración de bonos ya vive en una page mock separada `bonos`, y el dialog de nuevo movimiento en `movimientos` consume ese catálogo cuando el tipo es bono.

#### `pantalla de esquemas`

Convertir en una pantalla propia de **Esquemas de comisión**.

Debe cubrir:

- Listado de esquemas.
- Rangos `de / hasta / tasa`.
- Flat %.
- Asignación de esquema a empleado.
- Solo empleados activos en selectores.
- Historial: cambiar un esquema no debe recalcular nóminas pasadas.

Punto crítico: el Excel indica que el esquema puede cambiar, incluso de rango, con autorización previa, y que este cambio no debe afectar registros anteriores. Esto exige snapshots en corridas o historial por esquema/asignación.

#### `PANTALLA SUMARY`

Convertir en la pantalla principal de **Corridas de nómina**.

Debe generar resumen por periodo:

- Desde / hasta.
- Día de pago.
- Botón/modo para calcular con IVA o sin IVA.
- Ventas con IVA desde `Venta`.
- Ventas sin IVA calculadas.
- Esquema aplicado.
- Porcentaje individual.
- Comisión individual.
- Bonos.
- Multas.
- Sueldo base.
- Préstamos.
- Pago de préstamo.
- Ajustes.
- Viáticos.
- Total pago.

Esta pantalla no debe ser captura manual libre. Debe calcularse desde fuentes del sistema, con ajustes controlados y auditables.

#### `payroll breakdown`

No modelarlo como CRUD. Usarlo como reporte o pestaña dentro de corrida: **Desglose por punto de venta**.

Debe cubrir:

- Costo de nómina por sucursal.
- Bonos por sucursal.
- Ventas por sucursal.
- Desglose por empleado.
- Ventas por punto de venta.
- Comisión, bonos, multas, préstamos, ajustes y viáticos.
- Distribución de costos.
- Exportación PDF/Excel si se requiere operación recurrente.

Puede ser page separada bajo reportes si el usuario lo consulta con frecuencia.

#### `panatalla prestamos-adelantos`

Convertir en pantalla propia de **Préstamos y adelantos**.

Debe cubrir:

- Fecha de solicitud.
- Naturaleza: préstamo o adelanto de nómina.
- Empleado.
- Monto solicitado.
- Número de pagos.
- Monto por pago.
- Periodos programados.
- Monto pagado.
- Saldo.
- Estatus: pendiente, pagado, perdido.
- Mantener histórico aunque el empleado quede inactivo.

#### `pantalla de recibos`

Puede ser pantalla propia si se enviarán/confirmarán recibos por WhatsApp. Si el MVP es menor, puede iniciar como acción dentro de Corridas de nómina.

Debe cubrir:

- Recibo por empleado.
- Datos provenientes de la corrida.
- Campos editables solo por administrador.
- Exportar PDF.
- Enviar por WhatsApp o preparar mensaje.
- Estatus: generado, enviado, confirmado.

### Pages recomendadas para `apps/payroll`

Recomendación completa actual: 10 pages de operación y reportes.

| Page                  | Ruta sugerida                 | Fuente Excel                               |
| --------------------- | ----------------------------- | ------------------------------------------ |
| Summary               | `/` o `/corridas`             | `PANTALLA SUMARY`                          |
| Bonos                 | `/bonos`                      | catálogo de bonos del flujo de movimientos |
| Multas                | `/multas`                     | catálogo mock de multas                    |
| Viáticos              | `/viaticos`                   | catálogo mock de viáticos                  |
| Movimientos de nómina | `/movimientos`                | `pantalla de bonos`                        |
| Gastos                | `/gastos`                     | series, aplicaciones y categorías de gasto |
| Esquemas de comisión  | `/esquemas`                   | `pantalla de esquemas`                     |
| Préstamos y adelantos | `/prestamos-adelantos`        | `panatalla prestamos-adelantos`            |
| Payroll breakdown     | `/reportes/desglose-sucursal` | `payroll breakdown`                        |
| Recibos               | `/recibos`                    | `pantalla de recibos`                      |

No duplicar en `payroll` estas pantallas ya existentes en `envelope`:

- Empleados.
- Sucursales.
- Bancos.
- Puestos.
- Métodos de pago.

Payroll debe consumir esos datos desde backend compartido o endpoints específicos de lectura para nómina.

### Modelos Prisma propuestos originalmente

Nombres orientativos; validar antes de migrar:

- `PayrollRun` — corrida/periodo de nómina.
- `PayrollRunLine` — snapshot calculado por empleado dentro de una corrida.
- `CommissionScheme` — esquema de comisión.
- `CommissionSchemeTier` — rangos `fromAmount`, `toAmount`, `rate`.
- `EmployeeCommissionAssignment` — asignación de esquema a empleado.
- `PayrollMovement` — bonos, multas, ajustes, viáticos, insumos, etc.
- `PayrollMovementType` — catálogo configurable de tipos de movimiento.
- `LoanAdvance` — préstamo o adelanto.
- `LoanAdvanceInstallment` — calendario y pagos de préstamo/adelanto.
- `PayrollReceipt` — recibo generado/enviado/confirmado.
- `PayrollAttachment` — evidencias para viáticos, insumos u otros movimientos.

Estados sugeridos:

- Corrida: `DRAFT`, `CALCULATED`, `APPROVED`, `PAID`, `CANCELED`.
- Movimiento: `PENDING`, `APPROVED`, `REJECTED`.
- Préstamo/adelanto: `PENDING`, `PAID`, `LOST`, `CANCELED`.
- Recibo: `GENERATED`, `SENT`, `CONFIRMED`.

### Fases originales de implementación (completadas)

1. Base de `payroll`: layout, auth, sidebar, permisos y lectura de empleados/ventas.
2. Bonos predefinidos como catálogo independiente.
3. Esquemas de comisión con historial de cambios.
4. Movimientos de nómina: ajustes, multas, viáticos, insumos y adjuntos.
5. Préstamos y adelantos con calendario de pagos.
6. Corrida de nómina calculada y guardada como snapshot.
7. Recibos, desglose por sucursal y exportaciones PDF/Excel.

### Cobertura histórica de la demo frontend mock

Cubierto parcialmente, solo a nivel UI/mock:

- Fase 1: layout, shell/sidebar, login visual y navegación. Pendiente auth real, permisos y lectura real de empleados/ventas.
- Fase 2: pantalla visual de esquemas y rangos. Pendiente modelo real, asignación real por empleado y reglas históricas.
- Fase 3: catálogos visuales independientes de bonos, multas y viáticos; movimientos con selects dependientes, estatus, división y adjuntos simulados. Pendiente persistencia, aprobaciones reales y subida de archivos.
- Fase 4: pantalla visual de préstamos/adelantos con saldo y amortización mock. Pendiente calendario real y conexión a corridas.
- Fase 5: pantalla visual de corrida y tabla por empleado. Pendiente cálculo backend, snapshots y bloqueo/aprobación real.
- Fase 6: pantalla visual de recibos y desglose por sucursal; exportación PDF/Excel cliente implementada para resumen, movimientos, préstamos y desglose. Pendiente envío por WhatsApp, confirmación real y exportación desde datos backend.
- Fase mock adicional: gastos fijos/variables compartidos en contexto y descontados del balance general. Pendiente reglas contables y persistencia real.

Estado final del checklist histórico:

- [x] Diseñar modelos Prisma y crear la migración aditiva de Payroll.
- [x] Implementar `/api/payroll/*` con guard `SUPER_ADMIN`.
- [x] Integrar lectura real de ventas, empleados, sucursales, bancos y puestos sin duplicarlos.
- [x] Agregar `Empleado.sucursalId` nullable como dato laboral informativo, sin usarlo para el desglose por punto de venta de Payroll.
- [x] Distinguir la asignación explícita `TODAS` de `Sin sucursal asignada` mediante `Empleado.todasSucursales`.
- [x] Implementar cálculo backend de sueldo, comisiones, movimientos, préstamos y totales.
- [x] Implementar snapshots inmutables por corrida y auditoría.
- [x] Implementar servicio/endpoints de comprobantes; solo queda pendiente crear/configurar el bucket por ambiente.
- [x] Conectar exportaciones, recibos y WhatsApp a datasets reales.
- [x] Implementar pruebas del motor para evitar regresiones.

Reglas para futuras sesiones:

- Al extender Payroll, no mezclar rutas/pantallas nuevas dentro de `apps/envelope` salvo instrucción explícita.
- No recalcular corridas históricas cuando cambien esquemas, puestos, sueldos o empleados; guardar snapshot en `PayrollRunLine`.
- Toda migración de nómina debe ser aditiva y explicarse antes de ejecutarse.
- No crear datos sensibles de nómina como mocks realistas si podrían confundirse con datos reales.

---

## Backend / Prisma

- Express + Prisma, PostgreSQL en Supabase.
- Schema canónico: `backend/api/prisma/schema.prisma`.
- PrismaClient compartido: `backend/api/src/prisma/client.ts`.

**Modelos relevantes:**

- `Usuario`, `Sucursal`, `Empleado`, `ProtectedEmployeeIdentity`, `Venta`, `VentaDetalle`, `RegistroCita`, `MetodoPago`, `Bank`, `Position`.
- POS agrega `PosCredential`, `PosMasterCredential`, `PosBranchProfile`, `PosTerminal`, `PosPermissionNode`, `PositionPosPermission`, `MasterAuthorization` y `AuditLog`. Cada `PosCredential` pertenece exactamente a un `Empleado` o `Usuario`; los PIN y secretos sólo se almacenan como bcrypt + huella HMAC y las autorizaciones master como SHA-256 consumible una sola vez.
- Payroll agrega `PayrollCatalogItem`, `CommissionScheme`, `CommissionSchemeVersion`, `CommissionSchemeTier`, `EmployeeCommissionAssignment`, `PayrollRun`, `PayrollRunLine`, `PayrollRunBranchLine`, `PayrollMovement`, `PayrollMovementAllocation`, `PayrollAttachment`, `PayrollExpense`, `PayrollExpenseCategory`, `PayrollExpenseRecurrence`, `PayrollExpenseRecurrenceVersion`, `LoanAdvance`, `LoanAdvanceInstallment`, `PayrollReceipt` y `PayrollAuditEvent`.
- `Usuario` puede vincularse opcionalmente a `Empleado` mediante `empleadoId` y guarda metadatos para el futuro flujo de invitación/alta de contraseña.
- `Position` incluye `canManageAccess` y la relación `PositionScreenPermission`.
- `PositionScreenPermission` guarda permisos por pantalla para cada puesto y también puede almacenar claves de acción virtual como `ventas/generar-sobre`.
- `PositionScreenPermission` también puede almacenar claves de acción virtual como `empleados/sueldo`, que controla la visibilidad del sueldo en `envelope`, y `reportes/ver-datos-keysar-home`, que permite incluir al empleado protegido con la clave `KEYSAR_HOME` en la tabla de ventas guardadas y en todos los reportes y exportaciones basados en ventas. `ProtectedEmployeeIdentity` vincula esa clave única con un `Empleado` mediante FK `ON DELETE RESTRICT`; el nombre puede cambiar sin alterar la protección y `DELETE /empleados/:id` rechaza explícitamente empleados protegidos. La migración `20260831000000_add_protected_employee_identity` enlaza una única variante histórica del nombre en bases pobladas y aborta ante cero o múltiples candidatos; una base completamente vacía puede migrar sin vínculo para permitir bootstrap. En ejecución, si falta la identidad y el solicitante no tiene permiso para verla, las ventas y reportes fallan cerrados y no entregan datos. `GET /ventas` excluye la identidad en backend por defecto; únicamente una solicitud explícita `includeProtectedForEnvelope=true` con permiso `ventas/generar-sobre` puede recuperarla para `Generar sobre`, sin volver a mostrarla en la tabla normal.
- El acceso admin expone `PUT /api/envelope/access/positions/:id/permissions`, `PUT /api/envelope/access/users/:employeeId/credentials` y `DELETE /api/envelope/access/users/:id` para eliminar cuentas de acceso cuando se requiera volver a crearlas.
- `Empleado` tiene `bankId`/`positionId` nullable (FK a catálogos dinámicos).
- `Empleado` tiene `sucursalId` nullable (FK a `Sucursal`, `ON DELETE SET NULL`) y `todasSucursales Boolean @default(false)`. `null + false` se presenta como `Sin sucursal asignada`; `null + true` se presenta como `TODAS`; una sucursal concreta siempre conserva `todasSucursales = false`.
- `Empleado` también tiene campos legacy `banco`/`puesto` (String) — conservar por compatibilidad hasta backfill completo en prod.
- `Empleado` ahora incluye `sueldo Decimal?`, `fechaNacimiento DateTime?` y `numeroTelefono String?` para el crecimiento del módulo RH.
- `Sucursal` incluye `metaMensual Decimal @default(0) @db.Decimal(14, 2)` y `desactivadaEn DateTime?`. `activa` controla catálogos/formularios futuros; `desactivadaEn` define desde cuándo deja de proyectarse en los periodos del dashboard sin alterar las relaciones históricas.
- `Venta` tiene `sesionId String?` — vincula registros del mismo voucher multi-vendedor; null = venta individual.
- `RegistroCita` relaciona sucursal, vendedor, facialista, usuario creador y `SubcategoriaAtencion`; indexa fecha, `estatus+fecha`, `sucursalId+fecha`, `facialistaId+fecha`, `vendedorId+fecha`, `creadoPorId` y servicio. Para compras con apartado guarda el importe tentativo en `montoCompra` y el pago recibido en `montoApartado`. `CategoriaAtencion` y `SubcategoriaAtencion` forman el catálogo administrable para el flujo de citas. La migración `20260721000000_replace_cita_attention_with_service_catalog` reemplaza el enum temporal de tipo de atención; presupone que `RegistroCita` aún está vacío y no toca ventas ni sobres. La migración `20260721000001_add_monto_apartado_to_registro_cita` agrega el importe de apartado sin alterar registros históricos. Aplicarlas con `prisma migrate deploy` antes de habilitar el flujo en un ambiente.
- `Venta` y `VentaDetalle` tienen índices de rendimiento para filtros/reportes: `Venta.fecha`, `Venta.sucursalId+fecha`, `Venta.vendedorId+fecha`, `Venta.sesionId`, `VentaDetalle.ventaId` y `VentaDetalle.metodoPagoId`.
- `GET /api/envelope/ventas` siempre filtra por rango: si el cliente no manda fechas usa un lookback seguro de 31 días, rechaza rangos mayores a 366 días y acepta `limit`/`page` opcionales. No volver a permitir histórico completo sin rango explícito.
- Soft delete: `activo = false` (Usuario, Empleado, Bank, Position, MetodoPago) o `activa = false` (Sucursal). **No hacer borrados físicos salvo instrucción explícita**; la ruta admin de `accesos` elimina físicamente cuentas de login solo cuando se pide explícitamente desde esa tabla para volver a crear el acceso después, excepto la cuenta principal `SUPER_ADMIN`, que no se puede eliminar desde la UI.

**Reglas de BD:**

- No ejecutar `migrate reset` ni `db push` en ambientes compartidos/productivos.
- Usar migraciones Prisma controladas (`prisma migrate deploy`).
- La migración Payroll `20260730000000_add_payroll_models` es aditiva: crea tablas, enums, índices, relaciones y restricciones de nómina; no elimina ni transforma ventas, empleados ni otros registros productivos de Envelope.
- La migración `20260731000000_add_employee_branch` también es aditiva: agrega `Empleado.sucursalId` nullable, su índice y FK sin actualizar filas existentes. La migración `20260801000000_add_employee_all_branches` agrega el indicador `todasSucursales` con default `false` y una restricción que impide combinar `TODAS` con una sucursal concreta.
- La migración `20260813000000_add_branch_monthly_goal_and_deactivation_date` es aditiva: agrega `Sucursal.metaMensual` con default cero, `Sucursal.desactivadaEn` nullable y un índice por `activa`; no elimina ni reescribe históricos.
- La migración `20260813010000_add_recurring_payroll_expenses` es aditiva: agrega series/versiones de gastos recurrentes y referencias opcionales desde `PayrollExpense`; no convierte ni modifica los gastos históricos existentes.
- La migración `20260813020000_add_payroll_expense_categories` es aditiva: crea el catálogo de categorías y hace backfill con los nombres distintos ya guardados en ocurrencias y versiones; no reescribe el texto de los gastos históricos.
- La migración `20260813030000_link_payroll_expense_categories` agrega referencias opcionales `categoryId` y hace backfill por nombre normalizado. El texto histórico permanece en cada ocurrencia; las relaciones permiten que las recurrencias futuras adopten un nombre editado sin modificar corridas aprobadas.
- La migración `20260823000000_add_payroll_read_only_access` agrega `PositionPayrollScreenPermission.canWrite` con default `true`. Es aditiva y conserva edición para todos los permisos existentes; debe aplicarse antes de desplegar la API/UI que distinguen edición de solo lectura.
- Aplicar Payroll por ambiente en este orden: confirmar conexión y respaldo/PITR, ejecutar `prisma migrate status`, aplicar `prisma migrate deploy`, desplegar el backend correspondiente y después desplegar/verificar el frontend.
- `seed.ts` contiene datos demo — usar con cuidado, puede sobreescribir datos.
- `seed-catalogs.ts` es el seed seguro para catálogos `Bank`/`Position`.

---

## Ambientes y deploy

### Producción

```
master → https://keysarcosmetics-payroll.vercel.app → cosmetics-api.fly.dev → Supabase prod
```

El backend Fly.io de producción está configurado para evitar cold start con `auto_stop_machines = 'off'` y `min_machines_running = 1`; esto requiere deploy de backend para reflejarse en Fly.

Configuración requerida para Payroll producción:

```text
# Vercel Production de apps/payroll
NEXT_PUBLIC_API_URL=https://cosmetics-api.fly.dev

# Fly.io, app cosmetics-api
CORS_ORIGINS=https://keysarcosmetics-envelope.vercel.app,https://keysarcosmetics-payroll.vercel.app
```

- Los origins CORS no llevan `/` final, espacios ni comillas. El backend lee `CORS_ORIGINS` en plural; `CORS_ORIGIN` en singular no participa.
- Fly no revela el valor anterior de un Secret al editarlo. Antes de reemplazarlo, recuperar la lista desde la línea `CORS habilitado para:` de los logs de arranque o conservar explícitamente todos los dominios existentes.
- La cuenta que entra a Payroll debe existir en Supabase producción, estar activa y tener rol `SUPER_ADMIN`. Los usuarios de desarrollo no se replican automáticamente a producción.
- Estado verificado al 25 de agosto de 2026: Envelope y Payroll están publicados en Vercel Production y ambos bundles apuntan a `https://cosmetics-api.fly.dev`; CORS admite exactamente sus dos dominios productivos. Las 22 migraciones versionadas hasta `20260823010000_add_movement_payroll_type` permanecen aplicadas en Supabase producción. El API ejecuta Node.js 22 y sirve el SHA `952a675ecf882829e388562a024661300376fefc`, registrado con el tag `prod-2026-08-25.1`; el deploy protegido, `/health` con el SHA exacto, `/ready`, smoke tests `4/4`, login y validación funcional manual en Envelope/Payroll y la observación de logs resultaron correctos. La corrida paralela previa al primer pago oficial y Supabase Storage para comprobantes continúan pendientes. El tag `prod-2026-08-24.1` conserva el release anterior como punto de rollback.

### Desarrollo

```
develop → Vercel Preview → cosmetics-api-dev.fly.dev → Supabase dev
```

Configuración validada para desarrollo local y previews de Envelope/Payroll:

```text
# apps/payroll/.env.local (ignorado por Git)
NEXT_PUBLIC_API_URL=https://cosmetics-api-dev.fly.dev

# Vercel Preview de apps/payroll, limitada a la rama develop
NEXT_PUBLIC_API_URL=https://cosmetics-api-dev.fly.dev

# Fly.io, app cosmetics-api-dev
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,https://keysarcosmetics-envelope-git-develop-minnicas-projects.vercel.app,https://keysarcosmetics-payroll-git-develop-minnicas-projects.vercel.app
```

La migración en Supabase dev, el backend `cosmetics-api-dev`, el login `SUPER_ADMIN` y el flujo de formularios de Payroll fueron probados correctamente. Los dominios únicos de cada deployment Vercel cambian y no se agregan a CORS; para validación manual se usan los alias estables `git-develop`. Si cambia alguno de esos alias, actualizar simultáneamente la variable del environment `development` en GitHub y `CORS_ORIGINS` en Fly.

**Notas importantes:**

- Frontend en Vercel se despliega automáticamente por push a `master`/`develop`.
- Backend en Fly.io se despliega mediante el workflow manual protegido `.github/workflows/deploy-api.yml`; no se despliega automáticamente por push.
- Migraciones de BD se aplican dentro del workflow manual protegido y con revisión previa; nunca por un push automático.
- No subir `.env` ni `.env.local` al repositorio.
- `apps/envelope/.env.local` es solo local y no debe commitearse.
- `apps/payroll/.env.local` también es solo local y no debe commitearse; las variables de Vercel se configuran por proyecto y ambiente.
- Para probar frontend local contra backend dev, conservar simultáneamente los origins de Envelope y Payroll en `CORS_ORIGINS`; no reemplazar uno por otro.
- Un `Network Error` en login normalmente significa que el frontend apunta a `localhost:4000`, el backend no responde o CORS rechazó el origin antes de llegar a `/api/auth/login`. Verificar primero Request URL, `/health` y el preflight `OPTIONS`.

### CI y releases seguros (2026-08-24)

- `.github/workflows/ci.yml` valida PRs y pushes a `develop`/`master` con los checks independientes `Shared UI contracts` y `UI regression canaries`, lint, TypeScript, unit tests, builds productivos, sincronía de schemas Prisma, aplicación completa de migraciones sobre PostgreSQL 16 efímero e integración HTTP real de login/sesión. `Shared UI contracts` ejecuta la suite de `@cosmetics/ui` con sus umbrales obligatorios de cobertura; `UI regression canaries` compara los snapshots del testbed en Chromium.
- Los scripts `type-check`, `test:unit` y `test:integration` de `@cosmetics/api` ejecutan previamente `prisma generate`; esto es obligatorio porque un runner limpio todavía no tiene los tipos y enums generados de `@prisma/client`.
- Envelope conserva temporalmente un presupuesto máximo de 8 warnings ESLint y Payroll de 7; CI bloquea cualquier incremento mientras se reduce esa deuda en cambios separados.
- `.github/workflows/deploy-api.yml` solo se ejecuta manualmente. Fija el SHA de la rama `develop` o `master` antes de la aprobación, usa el environment `development` o `production`, aplica `prisma migrate deploy`, despliega exactamente ese commit y espera `/ready`. Producción exige escribir `PRODUCCION_RESPALDADA`; esta confirmación no sustituye verificar backup/PITR ni la aprobación del environment.
- `.github/workflows/staging-smoke.yml` exige los SHA completos servidos y ejecuta cinco smoke tests Playwright públicos de solo lectura contra API, Envelope y Payroll en el environment elegido. En producción encadena además `Authenticated production smoke`, con tres recorridos por app, cuentas de monitoreo, cero retries y sin artefactos sensibles. Los previews protegidos usan `ENVELOPE_VERCEL_BYPASS_SECRET` y `PAYROLL_VERCEL_BYPASS_SECRET`, generados por separado en cada proyecto Vercel; todas las suites de ambiente desactivan traces, screenshots y video.
- `.github/workflows/development-e2e.yml` ejecuta manualmente 16 recorridos autenticados de solo lectura (8 Envelope + 8 Payroll) únicamente en el environment `development`. Requiere las cuatro credenciales `E2E_*`, los bypass de Vercel y los SHA completos de frontend/API; compara la identidad desplegada antes de probar y elimina los `storageState` antes de adjuntar el reporte seguro.
- El API separa `src/app.ts` (Express importable) de `src/index.ts` (listener y cierre ordenado). `/health` verifica el proceso y `/ready` verifica conectividad PostgreSQL; Fly enruta mediante el segundo.
- Las migraciones Prisma dejaron de estar ignoradas por Git. `scripts/check-migration-safety.mjs` bloquea SQL nuevo potencialmente destructivo salvo revisión explícita documentada con `-- migration-safety: reviewed`.
- `db:push` y el alias directo `db:migrate:prod` fueron retirados de los scripts. Los despliegues usan `db:migrate:deploy` dentro del environment protegido.
- Dependabot revisa dependencias npm y GitHub Actions semanalmente. Los rulesets de `develop`/`master`, required checks y environments protegidos `development`/`production` están configurados en GitHub; conservarlos sincronizados con este runbook. `develop` exige historial lineal, squash y que la rama del PR esté actualizada. `master` acepta únicamente promociones `develop → master` mediante merge commit y no exige `Require branches to be up to date`, porque los merge commits de releases anteriores existen solo en `master`; cualquier hotfix excepcional aplicado a `master` debe incorporarse a `develop` antes del siguiente release. Secret scanning/push protection y la promoción manual de Vercel continúan sujetos a configuración administrativa externa.
- El procedimiento completo, variables, protecciones, secuencia de release y rollback vive en `docs/RELEASE_RUNBOOK.md`.
- La guía paso a paso para el trabajo diario, integración en `develop` y promoción a `master` vive en `FLUJO_TRABAJO_Y_DESPLIEGUE.md`.

---

## Mapa rápido del repositorio

### apps/payroll

```text
apps/payroll/
├── src/app/
│   ├── (auth)/login/                       → login JWT real
│   └── (dashboard)/
│       ├── page.tsx                        → corridas quincenales y consolidado mensual calculado
│       ├── accesos/                        → permisos por puesto y credenciales por empleado
│       ├── bonos|multas|viaticos/          → catálogos dinámicos
│       ├── movimientos/                    → movimientos, asignaciones y evidencias
│       ├── gastos/                         → recurrencias, historial aplicado y categorías
│       ├── esquemas/                       → niveles de comisión y asignaciones
│       ├── prestamos-adelantos/            → préstamos, cuotas y saldos
│       ├── reportes/desglose-sucursal/     → costo de nómina por sucursal
│       └── recibos/                        → PDF y seguimiento de entrega
├── src/components/payroll/
│   ├── payroll-data-context.tsx            → estado real conectado a /api/payroll/*
│   ├── payroll-shell.tsx                   → shell/sidebar y tema
│   └── report-export-buttons.tsx           → exportaciones reales PDF/Excel
├── src/lib/
│   ├── api.ts                              → cliente HTTP; usa NEXT_PUBLIC_API_URL
│   ├── session.tsx                         → sesión y guard SUPER_ADMIN
│   ├── report-export.ts                    → exportación dinámica
│   └── types.ts                            → tipos del frontend Payroll
├── src/hooks/
│   └── use-payroll-access-admin.ts         → puestos, empleados, cuentas y mutaciones de acceso
├── PENDIENTES.md                           → despliegue y Storage pospuesto
└── GUIA_PRIMERA_NOMINA.md                  → recorrido operativo inicial
```

Payroll no contiene `mock-data.ts` ni contextos mock. No reintroducir fixtures como fuente de la UI; para pruebas usar la BD de desarrollo.

### apps/envelope

```text
apps/envelope/
├── src/app/
│   ├── (auth)/login/              → login interno
│   ├── (dashboard)/               → rutas internas detrás de login
│   │   ├── page.tsx               → dashboard principal
│   │   ├── layout.tsx             → layout del dashboard (LayoutShell + sidebar)
│   │   ├── ventas/                → captura y gestión de ventas
│   │   ├── citas/                 → captura de citas atendidas y resultado de compra
│   │   ├── empleados/             → CRUD empleados, usa Bank/Position dinámicos
│   │   ├── sucursales/            → CRUD sucursales
│   │   ├── metodos-pago/          → CRUD métodos de pago
│   │   ├── bancos/                → CRUD catálogo Bank
│   │   ├── puestos/               → CRUD catálogo Position
│   │   ├── accesos/               → administración de permisos por puesto, acciones virtuales, credenciales independientes y borrado de cuentas
│   │   └── reportes/              → subvistas de reportes del módulo envelope, incluido reporte quincenal de citas
│   └── layout.tsx                 → layout raíz de la app
├── src/components/
│   ├── layout/
│   │   ├── AppSidebar.tsx         → sidebar principal con navegación
│   │   └── LayoutShell.tsx        → shell que envuelve contenido con sidebar
│   └── index.ts
├── src/hooks/                     → hooks de datos
│   ├── catalog-cache.ts           → caché liviano para catálogos compartidos
│   ├── useBanks.ts
│   ├── useEmpleados.ts
│   ├── useMetodosPago.ts
│   ├── usePositions.ts
│   ├── useReportes.ts             → legacy/no recomendado para reportes nuevos
│   ├── useSucursales.ts
│   └── useVentas.ts
└── src/lib/
    ├── api.ts                     → cliente HTTP local de envelope
    ├── store.tsx                  → store/contexto global
    ├── mock-data.ts               → datos mock para desarrollo
    └── utils.ts
```

### apps/scheduler

```
apps/scheduler/
├── public/
│   ├── logo.svg                   → logo compartido Keysar
│   └── fonts/                     → Emofera + Gilroy para identidad visual
├── src/app/
│   ├── (auth)/login/              → acceso temporal/mock al scheduler
│   ├── (dashboard)/page.tsx       → agenda principal (día / semana)
│   ├── (dashboard)/administracion/ → workspace administrativo completo
│   ├── (dashboard)/configuraciones/ → configuración visual/local del scheduler
│   ├── (dashboard)/reportes/       → resumen ejecutivo + reporte general de reservas (mock)
│   ├── globals.css                → tokens visuales del scheduler
│   └── layout.tsx                 → metadata + Toaster global
├── src/components/
│   ├── SchedulerAccessGuard.tsx  → guard local/mock por permisos de pantalla
│   ├── layout/
│   │   ├── SchedulerLayoutShell.tsx → shell responsive compartido por las rutas autenticadas
│   │   └── SchedulerAppSidebar.tsx  → navegación primaria global filtrada por permisos
│   ├── SchedulerPrimaryNav.tsx    → tipos y menús legacy conservados durante la migración a sidebar
│   ├── SettingsMenu.tsx           → acceso compartido a Configuraciones y próximos módulos de cuenta
│   ├── SchedulerWorkspace.tsx     → shell principal con estado local, filtros y modales
│   ├── scheduler/                 → header, sidebar, grid agenda, tarjetas y diálogos del scheduler
│   ├── reports/                   → dashboards y contenidos de reportes; navegación en la sidebar global
│   └── settings/                  → workspace y paneles locales; navegación en la sidebar global
├── src/components/administration/ → contenidos y CRUDs mock; navegación en la sidebar global
└── src/lib/
    ├── administration-scheduler-config.ts → sincronización local de comercios, sucursales y profesionales
    ├── commerce-operating-hours.ts → horario operativo y rango visible por comercio
    ├── mock-client-data.ts        → clientes mock, alias, teléfono único e historial por sucursal
    ├── mock-scheduler-data.ts     → datos mock de sucursales, profesionales, citas, bloqueos y leyenda
    ├── scheduler-agenda-settings.ts → intervalo visual de slots persistido localmente
    ├── scheduler-access.ts        → alcance mock por comercio, sucursal, profesional y pantalla
    ├── mock-administration-data.ts → catálogos mock de locales, profesionales, servicios y módulos administrativos
    └── mock-report-data.ts        → periodos, KPIs y series mock del resumen de reportes
```

### backend/api

```
backend/api/
├── prisma/
│   ├── schema.prisma              → modelos Prisma (fuente de verdad de BD)
│   ├── migrations/                → migraciones versionadas (no modificar manualmente)
│   │   ├── 20260730000000_add_payroll_models/ → migración aditiva de Payroll
│   │   ├── 20260731000000_add_employee_branch/ → FK nullable de empleado a sucursal
│   │   ├── 20260801000000_add_employee_all_branches/ → asignación laboral explícita a todas las sucursales
│   │   ├── 20260813000000_add_branch_monthly_goal_and_deactivation_date/ → meta mensual y fecha de desactivación de sucursales
│   │   ├── 20260813010000_add_recurring_payroll_expenses/ → series versionadas y ocurrencias automáticas de gastos
│   │   ├── 20260813020000_add_payroll_expense_categories/ → catálogo y backfill de categorías de gasto
│   │   ├── 20260813030000_link_payroll_expense_categories/ → referencias de catálogo con snapshots históricos
│   │   ├── 20260822000000_add_payroll_access_control/ → acceso independiente de Payroll por puesto y pantalla
│   │   └── 20260823000000_add_payroll_read_only_access/ → nivel de escritura por permiso de pantalla
│   ├── seed.ts                    → seed general/demo, usar con cuidado
│   └── seed-catalogs.ts           → seed seguro para Bank/Position
└── src/
    ├── app.ts                             → aplicación Express importable, health/readiness y manejo HTTP global
    ├── controllers/
    │   └── auth.controller.ts
    ├── middlewares/
    │   ├── auth.middleware.ts     → verificación JWT
    │   └── role.middleware.ts     → autorización por rol
    ├── prisma/
    │   └── client.ts              → PrismaClient compartido
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── access.routes.ts      → bootstrap y guardado de permisos/credenciales de acceso de envelope
    │   ├── envelope.routes.ts     → endpoints del módulo envelope
    │   ├── crm.routes.ts
    │   ├── payroll-access.routes.ts → permisos y credenciales administrativas de Payroll
    │   ├── payroll.routes.ts
    │   ├── pos.routes.ts        → auth POS, terminales, sucursales, permisos, credenciales y auditoría de Fase 1
    │   └── scheduler.routes.ts
    ├── services/
    │   ├── payroll-calculation.ts → motor puro de cálculo
    │   ├── payroll.service.ts     → corridas, reservas y snapshots
    │   └── payroll-storage.ts     → comprobantes en bucket privado
    ├── types/
    │   ├── express.d.ts           → extensión de tipos de Express
    │   └── jwt.ts
    └── index.ts                           → listener HTTP y cierre ordenado de servidor/Prisma
```

### apps/e2e y automatización

```text
apps/e2e/
├── playwright.config.ts                     → proyectos smoke API, Envelope y Payroll
├── playwright.development.config.ts         → E2E autenticado seguro de development
├── development/                             → setup de sesión, guard de escritura y 16 recorridos
├── tests/                                   → smoke tests públicos por ambiente
└── README.md                                → cuentas, permisos, secrets y diagnóstico

.github/workflows/
├── ci.yml                        → gates obligatorios de PR
├── deploy-api.yml                → migración + deploy manual protegido
├── development-e2e.yml           → E2E autenticado por SHA, solo development
└── staging-smoke.yml             → smoke tests manuales development/production
```

### packages/ui

```
packages/ui/
├── vitest.config.mts              → configuración ESM de jsdom y cobertura de contratos
├── src/components/
│   ├── ui/                        → componentes canónicos y contratos de alto riesgo
│   └── custom/
│       ├── progress-keysar.tsx    → wrapper custom sobre Progress
│       └── combobox.test.tsx      → contrato de búsqueda y selección
├── src/test/                      → setup jsdom y helper de render con user-event
├── src/hooks/
│   └── use-mobile.ts              → hook useIsMobile compartido
├── src/lib/
│   └── utils.ts                   → cn() utility
└── src/index.ts                   → barrel export de @cosmetics/ui
```

### packages/types, packages/auth, packages/api-client

- `packages/types/src/index.ts` — tipos TypeScript compartidos entre frontend y backend.
- `packages/auth/src/index.ts` — lógica JWT y roles compartida.
- `packages/api-client/src/index.ts` — cliente HTTP axios compartido.

---

## Puntos de entrada frecuentes

| Tarea                        | Archivo                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| UI compartida (exports)      | `packages/ui/src/index.ts`                                                 |
| Componentes shadcn           | `packages/ui/src/components/ui/`                                           |
| Wrappers custom UI           | `packages/ui/src/components/custom/`                                       |
| Layout envelope              | `apps/envelope/src/components/layout/`                                     |
| Rutas envelope frontend      | `apps/envelope/src/app/(dashboard)/`                                       |
| Hooks envelope               | `apps/envelope/src/hooks/`                                                 |
| API client envelope          | `apps/envelope/src/lib/api.ts`                                             |
| Sesión/permisos envelope     | `apps/envelope/src/lib/session.tsx`                                        |
| Endpoints envelope backend   | `backend/api/src/routes/envelope.routes.ts`                                |
| Rutas payroll frontend       | `apps/payroll/src/app/(dashboard)/`                                        |
| Estado/API payroll           | `apps/payroll/src/components/payroll/payroll-data-context.tsx`             |
| Sesión payroll               | `apps/payroll/src/lib/session.tsx`                                         |
| Endpoints payroll backend    | `backend/api/src/routes/payroll.routes.ts`                                 |
| Motor payroll                | `backend/api/src/services/payroll-calculation.ts`                          |
| Ciclo/snapshots payroll      | `backend/api/src/services/payroll.service.ts`                              |
| Contratos POS                | `packages/types/src/pos.ts` y `backend/api/src/contracts/`                 |
| Diagnóstico POS (lectura)    | `backend/api/scripts/diagnose-pos-data.ts`                                 |
| Guía de despliegue payroll   | `apps/payroll/PENDIENTES.md`                                               |
| Guía operativa payroll       | `apps/payroll/GUIA_PRIMERA_NOMINA.md`                                      |
| Agenda scheduler             | `apps/scheduler/src/app/(dashboard)/page.tsx`                              |
| Admin scheduler              | `apps/scheduler/src/app/(dashboard)/administracion/page.tsx`               |
| Configuraciones scheduler    | `apps/scheduler/src/app/(dashboard)/configuraciones/page.tsx`              |
| Reportes scheduler           | `apps/scheduler/src/app/(dashboard)/reportes/`                             |
| Workspace scheduler          | `apps/scheduler/src/components/SchedulerWorkspace.tsx`                     |
| Admin workspace scheduler    | `apps/scheduler/src/components/administration/AdministrationWorkspace.tsx` |
| Settings workspace scheduler | `apps/scheduler/src/components/settings/SettingsWorkspace.tsx`             |
| Mock data scheduler          | `apps/scheduler/src/lib/mock-scheduler-data.ts`                            |
| Prisma schema                | `backend/api/prisma/schema.prisma`                                         |
| Migraciones                  | `backend/api/prisma/migrations/`                                           |
| Seed seguro catálogos        | `backend/api/prisma/seed-catalogs.ts`                                      |
| Tipos compartidos            | `packages/types/src/index.ts`                                              |

---

## Comandos útiles

### Desarrollo

```bash
pnpm install
pnpm --filter @cosmetics/envelope dev
pnpm --filter @cosmetics/payroll dev
pnpm --filter @cosmetics/finance dev
pnpm --filter @cosmetics/hr dev
pnpm --filter @cosmetics/api dev
```

### Type-check y build

```bash
pnpm --filter @cosmetics/envelope type-check
pnpm --filter @cosmetics/envelope build
pnpm --filter @cosmetics/payroll type-check
pnpm --filter @cosmetics/payroll build
pnpm --filter @cosmetics/finance type-check
pnpm --filter @cosmetics/finance build
pnpm --filter @cosmetics/hr type-check
pnpm --filter @cosmetics/hr build
pnpm --filter @cosmetics/api test
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api build
pnpm lint
pnpm type-check
pnpm test:ui
pnpm test:ui:coverage
pnpm test:ui:visual
pnpm test:unit
pnpm ci:build
```

El scheduler usa `.next-dev` para `next dev` y `.next` para `next build`. Esta separación evita que una validación de producción sobrescriba los chunks que está sirviendo la instancia local en el puerto 3004.

### CI, Prisma y smoke

```bash
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/api pos:diagnose # sólo lectura; requiere DATABASE_URL
pnpm migrations:review -- origin/develop
pnpm test:integration  # requiere RUN_DATABASE_TESTS=true + PostgreSQL desechable
pnpm test:smoke        # requiere URLs de ambiente o servicios locales activos
pnpm test:e2e:development # requiere development desplegado, cuentas E2E y SHA exactos
pnpm test:e2e:production  # diagnóstico administrado; solo cuentas de monitoreo productivas
```

### Deploy backend

Ejecutar manualmente el workflow de GitHub Actions `Deploy API` y elegir el
environment `development` o `production`. Producción requiere aprobación del
environment y escribir `PRODUCCION_RESPALDADA`; no desplegar directamente con
Fly desde una terminal local. Ver `docs/RELEASE_RUNBOOK.md`.

### Prisma (ejecutar desde `backend/api/`)

```bash
npx prisma generate
npx prisma migrate deploy
npx ts-node --project tsconfig.json prisma/seed-catalogs.ts
```

> Comandos Prisma deben ejecutarse desde `backend/api/` o especificando el path/config correcto.

---

## Convenciones de código

- **Idioma del código**: inglés (variables, funciones, carpetas, tipos)
- **Idioma de comentarios/documentación**: español
- **Nomenclatura**: camelCase variables/funciones · PascalCase componentes/tipos · kebab-case carpetas
- TypeScript strict siempre — nunca usar `any` ni `@ts-ignore`
- Formularios con React Hook Form + Zod
- UI exclusivamente desde `@cosmetics/ui`

---

## Reglas para futuras sesiones de Claude Code

1. **Leer CLAUDE.md antes de modificar el proyecto.**
2. Si una tarea cambia arquitectura, módulos, ambientes, comandos, convenciones, componentes compartidos, schema Prisma, endpoints, rutas importantes o flujo de deploy → **actualizar CLAUDE.md en la misma tarea**.
3. No agregar secretos, tokens, passwords ni URLs privadas a CLAUDE.md.
4. No modificar producción sin confirmación explícita del usuario.
5. Para cambios grandes, primero auditar y proponer plan por fases antes de ejecutar.
6. Para cambios de BD: explicar si la migración es destructiva o aditiva antes de ejecutar.
7. Para cambios de BD: no ejecutar `migrate reset` ni `db push` en ambientes compartidos.
8. Para cambios de UI: priorizar `@cosmetics/ui` y shadcn/ui. No crear componentes duplicados en `apps/*/src/components/ui`.
9. Para cambios en envelope: validar `type-check` y `build` antes de reportar tarea completa.
10. Para cambios en Payroll: limitar la UI a `apps/payroll`, conservar las reglas históricas del backend y validar `pnpm --filter @cosmetics/payroll type-check` + `build`.
11. Para backend Payroll: validar `test`, `type-check` y `build` de `@cosmetics/api`.
12. Para cambios de API/Prisma: validar también schemas, migraciones sobre PostgreSQL desechable e integración HTTP; nunca usar una BD productiva en tests.
13. No cambiar backend, Prisma ni variables de entorno salvo que la tarea lo pida explícitamente.
14. Si hay duda sobre borrar datos o archivos → detenerse y pedir confirmación.

---

## Pendientes conocidos

### Estado de `apps/hr` (2026-08-23)

- El frontend de HR usa una shell Tailwind responsive que replica el prototipo oscuro original: sidebar, topbar, hero y superficie de contenido negros, acentos dorados y tablas densas. Conserva el orden y etiquetas heredadas: Nuevo empleado, Todos los empleados, Personal y horarios, Calendario, Solicitudes, Historial de vacaciones, Sucursales, Puestos, Horarios facialistas, Cumpleaños, Políticas y reglamentos, Usuarios y permisos.
- Los controles de HR consumen los componentes canónicos de `@cosmetics/ui` ya usados por `envelope` y `payroll`: Sidebar, Button, Input, Label, Textarea, Select, Badge, Card, Table/DataTable, Dialog, AlertDialog, Tabs, Popover, Tooltip, Skeleton y toast. Su apariencia negro/dorado se define únicamente en `apps/hr/tailwind.config.ts`, `apps/hr/app/globals.css` y los wrappers de `apps/hr/app/hr-ui.tsx`; no modificar `packages/ui` para personalizar visualmente HR.
- Todos los módulos funcionan con mocks persistidos en `localStorage` bajo `keysar-hr-mocks`. Empleados incluye alta, edición, borrado individual/masivo, cambio de estado, búsqueda, importación mock y exportación CSV; solicitudes permite autorizar/rechazar; calendario, sucursales, puestos, horarios facialistas, políticas y perfiles de acceso tienen alta/edición/borrado; cumpleaños se edita desde el expediente. Preferencias permite restaurar los mocks iniciales.
- Se eliminó el login paralelo del runtime frontend; la aplicación ya no lee sesión ni llama `/api/app`.
- Se eliminaron de `apps/hr` D1/Drizzle, Vinext/Vite/Worker, scripts y pruebas de OpenAI Sites, el lockfile npm, componentes/CSS sin imports y documentación standalone. La futura persistencia se implementará exclusivamente en el módulo HR de `backend/api` con Prisma/PostgreSQL.
- `pnpm --filter @cosmetics/hr lint`, `type-check` y `build` son las validaciones requeridas para el paquete; ESLint usa configuración no interactiva de Next.
- La persistencia real, API HR, auth compartida y permisos autoritativos permanecen pendientes y requieren una sesión posterior con alcance backend/BD. El CRUD actual es exclusivamente frontend/mock.

### Runtime Node.js

- CI, smoke tests, despliegues protegidos y la imagen Docker del backend usan Node.js `22.23.2`; `.nvmrc` alinea el entorno local y `package.json` exige Node.js `>=22.12.0`.
- La imagen Docker fija también pnpm `10.0.0`, igual que `packageManager`, para que instalaciones y builds sean reproducibles.
- Todo cambio de runtime debe pasar los cinco checks de CI y validarse primero mediante despliegue y smoke tests en `development` antes de promoverlo a producción.
- Estado validado en `development` el 24 de agosto de 2026: commit `86f7f89f1db152d67d7ed28c1d3c19dc81ea8cc3`, deploy protegido correcto, `/health` y `/ready` sanos, smoke tests `4/4`, ausencia de la advertencia de Node.js 20 y login/navegación autenticada de solo lectura en Envelope y Payroll.
- Estado promovido y validado en `production` el 25 de agosto de 2026: commit `952a675ecf882829e388562a024661300376fefc`, tag `prod-2026-08-25.1`, respaldo manual confirmado, deploy protegido correcto, `/health` reportando el SHA exacto, `/ready` sano, smoke tests `4/4`, validación funcional manual de Envelope/Payroll y logs posteriores sin la advertencia de Node.js 20.

- Activar secret scanning/push protection según el plan de GitHub y desactivar en Vercel la asignación automática del dominio productivo cuando se adopte la promoción manual.
- Crear seeds separados seguros para dev/datos base si se requiere.
- Limpieza futura de campos legacy `banco`/`puesto` en `Empleado` cuando todos los registros en prod tengan `bankId`/`positionId` asignados (Fase 4).
- Payroll producción: ejecutar y validar una corrida paralela antes del primer pago oficial; no reemplazar todavía el proceso vigente sólo porque el despliegue técnico esté sano.
- Payroll Storage: crear más adelante el bucket privado y configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y opcionalmente `PAYROLL_STORAGE_BUCKET` solo después de que exista.
