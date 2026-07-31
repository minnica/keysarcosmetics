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
Introducción
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
| `backend/api` | Express                 | 4000       | API REST compartida                                     |

---

## Estado actual de `payroll`

- `payroll` comparte el sistema visual canónico de `envelope`: `Emofera Regular` para títulos de página y marca, y `Gilroy` (400/500/600/700) para cuerpo/UI.
- La paleta, tokens semánticos, sidebar, logo, favicon, login editorial, radios, sombras, inputs y estados light/dark de `payroll` deben mantenerse alineados con `apps/envelope`.
- Los elementos de interfaz de `payroll` deben reutilizar los mismos primitivos y variantes que `envelope`: `Button`, `Badge`, `Card`, `DataTable`, `Dialog`, `AlertDialog`, `Select`, `DatePicker`/`DateRangePicker`, `ProgressKeysar`, sidebar shadcn e iconos de `lucide-react`. No crear SVGs manuales ni clases locales que reemplacen estilos de botones, cards o badges. Las acciones CRUD siguen el patrón de `envelope`: editar/borrar como botones `ghost` con iconos `Pencil`/`Trash2`, acciones de alta con icono Lucide y confirmaciones destructivas con `AlertDialogAction` rojo. Las tablas `DataTable` no deben anidarse dentro de otra card decorativa.
- Las cards principales de `payroll` usan el componente `Card` de `@cosmetics/ui`, con sus subcomponentes `CardContent`/`CardHeader` cuando correspondan; no recrear la superficie con `<div>`, no anidar una `DataTable` dentro de otra card decorativa y no reintroducir glass oscuro ni colores de superficie hardcodeados.
- `payroll` soporta tema claro y oscuro con la misma preferencia `keysar-theme` usada por `envelope`; cualquier componente nuevo debe funcionar correctamente en ambos modos.
- La dirección visual de `payroll` debe mantenerse más limpia y minimalista que antes: evitar textos secundarios redundantes, descripciones largas y copy explicativo dentro de cards cuando el dato principal ya comunica el estado.
- En métricas y bloques resumen, priorizar `label + value`; si hace falta contexto, usarlo solo de forma puntual. La page resumen agrupa periodo, estado, exportaciones y KPIs en una única card, mantiene la configuración de corrida en un solo bloque compacto y muestra las métricas secundarias junto al encabezado de la tabla; no volver a fragmentar estas áreas en múltiples mini-cards.
- Los encabezados de todas las pages de `payroll` replican el patrón de `envelope`: nombre de pantalla en un H1 con `.page-title`, subtítulo inmediato con `mt-1 text-sm` y `--text-muted`, y acciones alineadas al extremo derecho en desktop/apiladas en móvil. Título, subtítulo y acciones se muestran directamente sobre el fondo de la página, sin card; las cards funcionales cercanas se colocan debajo del encabezado para no alterar su posición.
- Excepción exclusiva de `payroll`: solo los valores textuales que se capturan/guardarían en BD y los datos dinámicos mostrados en inputs, selects y cuerpos de tabla van en MAYÚSCULAS. Los formularios convierten esos valores mientras se escriben y vuelven a normalizarlos antes de guardarlos en estado; PDF/Excel exportan las celdas de datos en mayúsculas. Navegación, títulos, subtítulos, botones, descripciones y placeholders conservan su capitalización normal. No aplicar esta excepción automáticamente a otras apps.

---

## Stack actual

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + TypeScript strict
- **UI**: shadcn/ui desde `@cosmetics/ui` + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Base de datos**: PostgreSQL en Supabase
- **Infra backend**: Fly.io
- **Infra frontend**: Vercel
- **POS**: Electron + React + Vite
- **Auth**: JWT + bcrypt

---

## Paquetes compartidos

| Paquete                 | Propósito                                             |
| ----------------------- | ----------------------------------------------------- |
| `@cosmetics/ui`         | Componentes shadcn/ui compartidos + wrappers custom   |
| `@cosmetics/types`      | Tipos TypeScript compartidos entre frontend y backend |
| `@cosmetics/auth`       | Lógica JWT y roles compartida                         |
| `@cosmetics/api-client` | Cliente axios compartido                              |

---

## Roles del sistema

- `SUPER_ADMIN` → acceso total a todas las apps
- `GERENTE` → acceso a su sucursal: ventas, empleados, reportes locales
- `CAPTURISTA` → solo registro de ventas
- `Position.canManageAccess` marca el puesto que administra permisos y credenciales de `envelope`.
- El acceso efectivo a pantallas de `envelope` ya no depende solo del rol: también se resuelve por puesto/permisos por pantalla.
- La pantalla `accesos` guarda permisos por clic inmediato en cada pantalla con autosave sin recarga, administra credenciales en un dialog dedicado, también autoriza permisos virtuales de acción como `ventas/generar-sobre` y elimina cuentas desde la tabla de estatus cuando se necesita re-crear el acceso después, excepto la cuenta principal `SUPER_ADMIN`, que queda protegida. El permiso transversal para incluir registros de `KEYSAR HOME` se configura dentro del bloque superior de alcance de datos; no pertenece al conteo ni a las acciones masivas de la sección Reportes.
- En `accesos`, cualquier puesto sin administración global puede activar `Solo ver datos propios`. El ajuste se persiste en `Position.selfDataOnly` y se aplica en backend según la relación operativa del módulo: en ventas, dashboard y reportes de ventas usa `vendedorId`; en citas y su reporte usa `facialistaId`. También impide crear o mutar registros asignados a otro empleado. Un puesto sin empleado vinculado no recibe datos bajo esta restricción. Los puestos con `canManageAccess` no pueden combinarse con `selfDataOnly`.
- Prisma genera el cliente desde `backend/api/prisma/schema.prisma`; el duplicado histórico `backend/api/src/prisma/schema.prisma` debe mantenerse sincronizado mientras exista. Toda modificación de modelo debe actualizar ambos para evitar que el cliente desplegado quede desfasado.

---

## Estado actual de @cosmetics/ui

Componentes shadcn canónicos en `packages/ui/src/components/ui`:

- Button, Card, Input, Label, Textarea, Badge
- Table, Dialog, Select, Progress, Popover
- Calendar, DateRangePicker, Sheet, Tooltip, Separator, Sidebar
- **AlertDialog** — diálogo de confirmación destructiva (botones de borrar)
- **Sonner** — toasts con variantes semánticas: verde para éxito, amarillo/ámbar para advertencias recuperables y rojo para errores reales. En `payroll`, las validaciones de formulario y bloqueos previos al guardado usan `toast.warning`; los fallos de API, persistencia o exportación usan `toast.error`.
- **Toast (Base UI)** — componente shadcn canónico en `components/ui/toast.tsx`, re-exportado como `BaseToaster`/`baseToast` para convivir con Sonner. Envelope y Payroll montan ambos providers; los avisos de empleados sin sucursal usan `baseToast.add({ type: "warning", ... })`.
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
  El catálogo de sucursales se lee desde `GET /api/envelope/sucursales`, que está disponible para cualquier sesión autenticada; las mutaciones (`POST`/`PUT`/`DELETE`) siguen protegidas por permiso de pantalla `sucursales`. Si solo hay una sucursal activa disponible, la UI la preselecciona automáticamente. `GET /api/envelope/metodos-pago` también está disponible para quien tenga la pantalla `metodos-pago` o el reporte `reportes/metodo-pago-por-dia`, para que ese reporte pueda cargar su selector sin conceder permisos de administración; sus mutaciones siguen requiriendo `metodos-pago`.
  En `Generar sobre`, el nombre de cada vendedor debe resolverse desde el payload de ventas embebido (`vendedorNombre`) y no depender del catálogo de empleados, para que el resultado sea igual con `SUPER_ADMIN` y `CAPTURISTA`.
  El nombre arriba de la firma debe salir de `GET /api/auth/me` justo al generar el PNG, usando el nombre actual del empleado ligado a la cuenta cuando exista, para no quedarse con el valor histórico guardado en `Usuario.nombre`.
- **citas** — captura citas en `/citas` con fecha, hora, clienta, categoría y servicio de atención, estatus (`ATENDIDA`/`NO_LLEGO`/`CANCELADA`), sucursal, vendedor, facialista, resultado de compra y bonos de salida tarde/comida. Las categorías y subcategorías/servicios se administran en `/servicios`; los valores activos se cargan en cascada en el formulario de citas. El catálogo usa borrado lógico: al desactivar una categoría también se desactivan sus servicios y la pantalla oculta ambos; si después se crea una categoría o servicio con el mismo nombre, el backend reactiva el registro histórico correspondiente en vez de chocar con el índice único, sin reactivar automáticamente los demás servicios de la categoría. La compra se normaliza en `RegistroCita.tipoCompra` (`PAGO_NETO`, `COMPRA_CON_APARTADO`, `PAGO_DE_APARTADO`) + `montoCompra`; en `COMPRA_CON_APARTADO`, `montoCompra` es la compra tentativa y `montoApartado` es el pago recibido, obligatorio y no mayor a la compra. La UI apila ambos conceptos y calcula el pendiente; `total` representa el pago recibido (apartado o pago neto) y no se duplica en BD. `PAGO_DE_APARTADO` se conserva para compatibilidad histórica; los registros nuevos lo capturan como parte de `COMPRA_CON_APARTADO`. Cuando no existe compra, el tipo queda `null` y ambos montos en cero. Una cita atendida sin compra es distinta de una clienta que no llegó o canceló; en estos dos últimos estatus el formulario limpia/oculta compra y bonos, y backend/BD rechazan esos datos si se envían. Cada registro guarda `creadoPorId` hacia `Usuario`, además de `creadoEn`/`actualizadoEn`. La hora es obligatoria para registros nuevos y nullable en BD solo por compatibilidad histórica. El listado conserva filtro por la quincena actual y permite editar mediante `PUT /api/envelope/citas/:id` reutilizando el formulario; la edición conserva el creador original y actualiza `actualizadoEn`. También permite eliminación física mediante `DELETE /api/envelope/citas/:id`, siempre detrás de un `AlertDialog` de confirmación explícita.
  Los usuarios cuyo puesto contiene `FACIALISTA` tienen acceso de solo alta en esta pantalla: pueden guardar citas nuevas, pero la UI no muestra acciones para editar/eliminar y el backend rechaza `PUT`/`DELETE`. Si su puesto tiene `selfDataOnly`, el listado, el reporte y las exportaciones de citas solo incluyen registros con su propio `facialistaId`, el selector queda limitado a su empleado y el backend impide crear una cita para otra facialista.
  El selector de vendedor incluye todos los empleados salvo los puestos `ADMINISTRADOR`, `ADMINISTRADOR GENERAL`, `MANTENIMIENTO`, `RECURSOS HUMANOS` y `EXTERNO`.
- **empleados** — CRUD, usa `bankId`/`positionId` dinámicos desde backend; incluye toggle activo/inactivo con `PATCH /empleados/:id/status`; GET retorna todos los empleados (activos primero), la tabla muestra badge de estatus y botón `PowerOff`/`Power` con AlertDialog de confirmación. Además de `banco`/`puesto` legacy, ya expone `sueldo`, `fechaNacimiento` y `numeroTelefono` en formulario, tabla, backend, Prisma y seed; `fechaNacimiento` se captura completo para que después se derive el cumpleaños y la base de RH para nómina. La page de empleados también tiene filtros de tabla por estatus, puesto y sueldo antes de pasar los datos a `DataTable`.
  El filtro de sueldo usa límites numéricos opcionales `Desde`/`Hasta`, no rangos preestablecidos; si ambos están vacíos no restringe resultados y, al establecer cualquiera, excluye los registros sin sueldo.
  El campo `sueldo` también puede ocultarse por permiso virtual `empleados/sueldo`: por defecto solo lo ve `SUPER_ADMIN`, y desde `accesos` se puede otorgar o denegar para otros puestos. Cuando no hay permiso, no se muestra en la tabla ni en el formulario de alta/edición, y el backend lo redacciona en las respuestas del módulo `empleados`.
- **sucursales** — CRUD de sucursales
- **metodos-pago** — CRUD de métodos de pago
- **bancos** — CRUD propio con catálogo `Bank`
- **puestos** — CRUD propio con catálogo `Position`
- **reportes** — múltiples subvistas: total-general, detalle-metodo-pago, metodo-pago-por-dia, ventas-por-vendedor, ventas-por-vendedor-dia y citas; leen endpoints agregados en backend y exportan PDF/Excel desde esos datos usando `report-export.ts` + `ReportExportButtons` con imports dinámicos para las librerías pesadas. `reportes/citas` abre en la quincena vigente, filtra por rango, facialista y sucursal, y suma citas, faciales sencillos/dobles atendidos, estatus, conceptos de compra y bonos por facialista+sucursal desde `GET /api/envelope/reportes/citas`; PDF y Excel incluyen el mismo desglose agregado. `ventas-por-vendedor` pivota las sucursales en columnas dinámicas, conserva las métricas por empleado y muestra/exporta una fila final con los totales de cada sucursal. La vista `ventas-por-vendedor-dia` muestra `Días sin venta` y `Monto día aproximado` al final de la tabla, antes del total, calcula ese monto como `venta total del mes / días con venta` por vendedor, y cuando consulta el mes en curso solo renderiza días transcurridos hasta hoy
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
- Todos los formularios disparan `toast.success()` al crear o editar, **excepto** el modal "Agregar/Editar venta" en ventas: dispara `toast.info()` azul pastel (8 s) recordando al usuario que debe dar clic en «Guardar registro» para persistir.
- En `ventas`, el botón final de guardado debe pasar por un `AlertDialog` de confirmación antes de persistir la venta.
- `<Toaster position="bottom-center" />` montado en `src/app/layout.tsx`.
- Favicon configurado via metadata `icons: { icon: '/logo.svg' }` en root layout.
- Header del sidebar muestra logo (32px) + texto "Keysar Cosmetics" cuando expandido; solo logo (28px) cuando colapsado.
- Switch dark/light mode y switch visual de idioma `ES/EN` en `SidebarFooter`, encima del botón "Cerrar sesión", ocultos en modo colapsado. Ambos usan el mismo diseño segmentado. Envelope usa `I18nProvider` + `useI18n()` en `src/lib/i18n.tsx`, persiste en `localStorage` con key `keysar-envelope-language` y solo traduce textos estáticos de UI. No traducir ni transformar datos provenientes de BD/API (nombres de sucursales, empleados, bancos, puestos, métodos de pago, mensajes explícitos de backend, etc.).
- Botón "Cerrar sesión" en `SidebarFooter` — limpia `auth_token`, resetea la sesión en memoria y redirige a `/login`. Usa `SidebarMenuButton` con tooltip para funcionar también en modo colapsado.
- El login de `envelope` ya usa sesión híbrida: credenciales temporales hoy, con soporte de base para invitación futura por enlace. El redirect post-login usa `window.location.assign(...)` para evitar quedarse atrapado en la pantalla de login.

Datos:

- `useSucursales`, `useEmpleados`, `useMetodosPago`, `useBanks` y `usePositions` usan caché liviano compartido por hook (`catalog-cache.ts`) para evitar requests repetidos cuando varios componentes montan los mismos catálogos. Después de mutaciones, el hook afectado invalida mediante `refetch()`.
- Campos legacy `banco`/`puesto` (string) aún existen en `Empleado` durante transición.
- Rendimiento `envelope`: `useVentas` acepta `fechaInicio`/`fechaFin` y las pantallas no deben volver a cargar el histórico completo de ventas para reportes o dashboard. La pantalla `ventas` carga por defecto solo el rango visible; `Generar sobre` consulta únicamente el día seleccionado al abrir el dialog. El backend aplica un rango por defecto seguro cuando faltan fechas, rechaza rangos mayores a 366 días y soporta `limit`/`page` opcionales en `GET /api/envelope/ventas`.
- Los reportes de `envelope` consumen endpoints agregados en `/api/envelope/reportes/*`; no usar `useReportes()` para bajar ventas crudas y agregarlas en cliente. `useReportes` queda como helper legacy/no recomendado. Si se crea un reporte nuevo, preferir agregación en backend/SQL y enviar al frontend solo el dataset ya agregado.
- El dashboard consume `/api/envelope/reportes/dashboard`; ese endpoint agrega en SQL y concentra los totales de sucursal de los periodos principales en una sola consulta, más una consulta separada para vendedores. No reintroducir cálculos del dashboard sobre ventas crudas en React.

---

## Payroll: implementación actual

`apps/payroll` es una app operativa conectada a `backend/api` y PostgreSQL; ya no usa fixtures ni contextos mock. La referencia funcional original fue `nomina.xlsx`, pero las fórmulas viven en backend y cada corrida conserva snapshots históricos.

### Límites y seguridad

- La UI y todos los endpoints `/api/payroll/*` requieren sesión JWT y rol `SUPER_ADMIN`.
- Payroll reutiliza `Empleado`, `Bank`, `Position`, `Sucursal`, `Venta` y `VentaDetalle`. La administración permanece en Envelope; Payroll los consume en lectura.
- `Empleado.sucursalId` es nullable y representa la sucursal laboral canónica. Envelope permite asignarla desde el formulario de empleados y muestra `Sin sucursal asignada` cuando es `null`.
- Los cambios propios de nómina deben limitarse a `apps/payroll`, rutas/servicios/modelos Payroll en `backend/api` y documentación relacionada. La relación laboral `Empleado.sucursalId` se administra exclusivamente desde `apps/envelope`.
- Las migraciones `20260730000000_add_payroll_models` y `20260731000000_add_employee_branch` son aditivas. Deben revisarse y ejecutarse manualmente con `prisma migrate deploy`; nunca usar `db push`, `migrate reset` ni seeds demo contra producción.
- Los adjuntos están preparados para un bucket privado de Supabase Storage, pero su habilitación está pospuesta. Cuando se cree el bucket, configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y opcionalmente `PAYROLL_STORAGE_BUCKET`; nunca exponer la service-role key al frontend.

### Fuentes reales reutilizadas

| Dato                                         | Fuente                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Empleado, activo/inactivo, sueldo y teléfono | `Empleado`                                                                                    |
| Banco y cuenta                               | `Empleado.bankId`/`Bank`, con compatibilidad para `Empleado.banco`, y `Empleado.numeroCuenta` |
| Puesto                                       | `Empleado.positionId`/`Position`, con compatibilidad para `Empleado.puesto`                   |
| Sucursal laboral                             | `Empleado.sucursalId`/`Sucursal`; `null` = `SIN SUCURSAL ASIGNADA`                             |
| Ventas por fecha, vendedor y sucursal        | `Venta` + suma de `VentaDetalle.cantidad`                                                     |
| Sucursales                                   | `Sucursal`                                                                                    |

Los catálogos de métodos de pago no participan en el cálculo de comisión. Los empleados inactivos se conservan en históricos y entran en una corrida si tienen actividad dentro del periodo.

### Backend y modelos

- Router: `backend/api/src/routes/payroll.routes.ts`.
- Motor puro: `backend/api/src/services/payroll-calculation.ts`.
- Ciclo de corridas y snapshots: `backend/api/src/services/payroll.service.ts`.
- Storage privado: `backend/api/src/services/payroll-storage.ts`.
- Modelos: `PayrollCatalogItem`, `CommissionScheme`, `CommissionSchemeVersion`, `CommissionSchemeTier`, `EmployeeCommissionAssignment`, `PayrollRun`, `PayrollRunLine`, `PayrollRunBranchLine`, `PayrollMovement`, `PayrollMovementAllocation`, `PayrollAttachment`, `PayrollExpense`, `LoanAdvance`, `LoanAdvanceInstallment`, `PayrollReceipt` y `PayrollAuditEvent`.
- El schema canónico y el duplicado en `backend/api/src/prisma/schema.prisma` deben mantenerse sincronizados. Payroll usa el cliente estándar `@prisma/client`, regenerado durante el build del backend; no importar clientes generados desde rutas relativas porque `dist` no incluye esos artefactos.

La API cubre bootstrap de fuentes compartidas; CRUD de catálogos, esquemas/versiones/asignaciones, movimientos, gastos y préstamos; adjuntos; corridas y transiciones; desglose por sucursal; recibos y seguimiento de WhatsApp.

### Reglas de cálculo y ciclo de vida

- Solo se aceptan quincenas completas: días 1–15 o 16–último día del mes. El sueldo quincenal es `Empleado.sueldo / 2`; sueldo nulo equivale a cero y genera advertencia.
- Cada corrida elige `WITH_VAT` o `WITHOUT_VAT`. Con IVA se usa venta bruta; sin IVA se usa `venta / 1.16`. La misma base selecciona el rango y calcula `base × tasa`.
- Rangos de comisión son continuos, inician en cero y el último no tiene límite superior. Versiones y asignaciones tienen vigencia; cambios existentes solo aplican desde la siguiente quincena.
- Ventas, sueldo, comisión, movimientos y préstamos de cada empleado se agrupan en `Empleado.sucursalId`. Si la relación es `null`, el snapshot usa `SIN SUCURSAL ASIGNADA`. La sucursal de una venta sigue siendo dato operativo de Envelope, pero no define el centro laboral del empleado en Payroll.
- Los movimientos derivan automáticamente su sucursal del participante; el cliente y el backend no aceptan una segunda selección manual. En el formulario, el selector de participante muestra solo el nombre y no repite puesto ni sucursal. Los gastos conservan centro de costo propio porque no están vinculados a un empleado.
- Una corrida transita `DRAFT → APPROVED → PAID`; puede cancelarse antes de pagar. Aprobar congela líneas y reserva movimientos, gastos y cuotas. Pagar liquida cuotas reservadas y genera recibos. Una corrida pagada no se recalcula ni cancela.
- Bloquea aprobación: ventas sin esquema/rango, pago total negativo o viáticos/insumos sin evidencia. Sueldo faltante es advertencia. Banco o cuenta faltante bloquean pago. Teléfono faltante bloquea solo la preparación de WhatsApp.
- Préstamos y adelantos generan cuotas quincenales automáticas; el último pago absorbe el ajuste de centavos. Los estados históricos no se eliminan.
- Recibos se generan desde el snapshot pagado, se descargan en PDF y WhatsApp se abre mediante `wa.me`; el archivo se adjunta manualmente. Estados: `GENERATED`, `SENT`, `CONFIRMED`.

### Frontend operativo

Rutas: `/`, `/bonos`, `/multas`, `/viaticos`, `/movimientos`, `/gastos`, `/esquemas`, `/prestamos-adelantos`, `/reportes/desglose-sucursal`, `/recibos` y `/login`.

- `apps/payroll/src/lib/session.tsx` gestiona sesión real y el guard `SUPER_ADMIN`.
- `apps/payroll/src/components/payroll/payroll-data-context.tsx` conecta toda la UI a `/api/payroll/*`.
- Exportaciones PDF/Excel se generan desde datasets reales con imports dinámicos.
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
```

El motor tiene pruebas de base con/sin IVA, selección de tasa, distribución exacta por sucursal, advertencias/bloqueos y amortización quincenal. Probar flujos integrados únicamente en una BD de desarrollo con la migración aplicada; no usar producción como ambiente de QA.

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
- `/reportes/desglose-sucursal` — reporte real de ventas y costo agrupados por `Empleado.sucursalId`, con desglose por empleado, resumen, gráfica y exportación PDF/Excel.
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

| Dato                               | Estado actual | Fuente                             |
| ---------------------------------- | ------------- | ---------------------------------- |
| Empleados activos/inactivos        | Existe        | `Empleado.activo`                  |
| Nombre completo                    | Existe        | `Empleado.nombreCompleto`          |
| Banco                              | Existe        | `Empleado.bankId` / `Bank`         |
| Cuenta bancaria                    | Existe        | `Empleado.numeroCuenta`            |
| Puesto                             | Existe        | `Empleado.positionId` / `Position` |
| Sueldo base                        | Existe        | `Empleado.sueldo`                  |
| Teléfono                           | Existe        | `Empleado.numeroTelefono`          |
| Fecha nacimiento                   | Existe        | `Empleado.fechaNacimiento`         |
| Meta individual                    | Existe        | `Empleado.metaIndividual`          |
| Sucursal laboral                   | Existe        | `Empleado.sucursalId` / `Sucursal` |
| Sucursales                         | Existe        | `Sucursal`                         |
| Ventas por fecha/sucursal/vendedor | Existe        | `Venta` + `VentaDetalle`           |
| Métodos de pago                    | Existe        | `MetodoPago`                       |

Nota importante:

- `Empleado.sucursalId` y `Usuario.sucursalId` son relaciones distintas. La primera agrupa nómina por la sucursal laboral del empleado; la segunda limita el alcance de una cuenta y no debe usarse como sustituto.
- La migración aditiva `20260731000000_add_employee_branch` agrega la FK nullable, índice y `ON DELETE SET NULL`. Los empleados existentes permanecen sin asignación hasta que se actualicen en Envelope.

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
| Gastos                | `/gastos`                     | captura mock de gastos fijos/variables     |
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
- [x] Agregar `Empleado.sucursalId` nullable y agrupar Payroll por la sucursal laboral o `SIN SUCURSAL ASIGNADA`.
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

- `Usuario`, `Sucursal`, `Empleado`, `Venta`, `VentaDetalle`, `RegistroCita`, `MetodoPago`, `Bank`, `Position`.
- Payroll agrega `PayrollCatalogItem`, `CommissionScheme`, `CommissionSchemeVersion`, `CommissionSchemeTier`, `EmployeeCommissionAssignment`, `PayrollRun`, `PayrollRunLine`, `PayrollRunBranchLine`, `PayrollMovement`, `PayrollMovementAllocation`, `PayrollAttachment`, `PayrollExpense`, `LoanAdvance`, `LoanAdvanceInstallment`, `PayrollReceipt` y `PayrollAuditEvent`.
- `Usuario` puede vincularse opcionalmente a `Empleado` mediante `empleadoId` y guarda metadatos para el futuro flujo de invitación/alta de contraseña.
- `Position` incluye `canManageAccess` y la relación `PositionScreenPermission`.
- `PositionScreenPermission` guarda permisos por pantalla para cada puesto y también puede almacenar claves de acción virtual como `ventas/generar-sobre`.
- `PositionScreenPermission` también puede almacenar claves de acción virtual como `empleados/sueldo`, que controla la visibilidad del sueldo en `envelope`, y `reportes/ver-datos-keysar-home`, que permite incluir al empleado `KEYSAR HOME` en la tabla de ventas guardadas y en los reportes `ventas-por-vendedor` y `ventas-por-vendedor-dia` (incluidos sus totales y exportaciones). La omisión en ventas se aplica solo al dataset visible de la tabla y no altera los datos usados por `Generar sobre`.
- El acceso admin expone `PUT /api/envelope/access/positions/:id/permissions`, `PUT /api/envelope/access/users/:employeeId/credentials` y `DELETE /api/envelope/access/users/:id` para eliminar cuentas de acceso cuando se requiera volver a crearlas.
- `Empleado` tiene `bankId`/`positionId` nullable (FK a catálogos dinámicos).
- `Empleado` tiene `sucursalId` nullable (FK a `Sucursal`, `ON DELETE SET NULL`); `null` se presenta como `Sin sucursal asignada`.
- `Empleado` también tiene campos legacy `banco`/`puesto` (String) — conservar por compatibilidad hasta backfill completo en prod.
- `Empleado` ahora incluye `sueldo Decimal?`, `fechaNacimiento DateTime?` y `numeroTelefono String?` para el crecimiento del módulo RH.
- `Venta` tiene `sesionId String?` — vincula registros del mismo voucher multi-vendedor; null = venta individual.
- `RegistroCita` relaciona sucursal, vendedor, facialista, usuario creador y `SubcategoriaAtencion`; indexa fecha, `estatus+fecha`, `sucursalId+fecha`, `facialistaId+fecha`, `vendedorId+fecha`, `creadoPorId` y servicio. Para compras con apartado guarda el importe tentativo en `montoCompra` y el pago recibido en `montoApartado`. `CategoriaAtencion` y `SubcategoriaAtencion` forman el catálogo administrable para el flujo de citas. La migración `20260721000000_replace_cita_attention_with_service_catalog` reemplaza el enum temporal de tipo de atención; presupone que `RegistroCita` aún está vacío y no toca ventas ni sobres. La migración `20260721000001_add_monto_apartado_to_registro_cita` agrega el importe de apartado sin alterar registros históricos. Aplicarlas con `prisma migrate deploy` antes de habilitar el flujo en un ambiente.
- `Venta` y `VentaDetalle` tienen índices de rendimiento para filtros/reportes: `Venta.fecha`, `Venta.sucursalId+fecha`, `Venta.vendedorId+fecha`, `Venta.sesionId`, `VentaDetalle.ventaId` y `VentaDetalle.metodoPagoId`.
- `GET /api/envelope/ventas` siempre filtra por rango: si el cliente no manda fechas usa un lookback seguro de 31 días, rechaza rangos mayores a 366 días y acepta `limit`/`page` opcionales. No volver a permitir histórico completo sin rango explícito.
- Soft delete: `activo = false` (Usuario, Empleado, Bank, Position, MetodoPago) o `activa = false` (Sucursal). **No hacer borrados físicos salvo instrucción explícita**; la ruta admin de `accesos` elimina físicamente cuentas de login solo cuando se pide explícitamente desde esa tabla para volver a crear el acceso después, excepto la cuenta principal `SUPER_ADMIN`, que no se puede eliminar desde la UI.

**Reglas de BD:**

- No ejecutar `migrate reset` ni `db push` en ambientes compartidos/productivos.
- Usar migraciones Prisma controladas (`prisma migrate deploy`).
- La migración Payroll `20260730000000_add_payroll_models` es aditiva: crea tablas, enums, índices, relaciones y restricciones de nómina; no elimina ni transforma ventas, empleados ni otros registros productivos de Envelope.
- La migración `20260731000000_add_employee_branch` también es aditiva: agrega `Empleado.sucursalId` nullable, su índice y FK sin actualizar filas existentes.
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
- Estado documentado al 31 de julio de 2026: Payroll está publicado en `https://keysarcosmetics-payroll.vercel.app`; todavía debe verificarse su variable `NEXT_PUBLIC_API_URL`, y las migraciones/backend productivos deben desplegarse y validarse explícitamente antes de probar el flujo real. No asumir que una validación exitosa en dev confirma producción.

### Desarrollo

```
develop → Vercel Preview → cosmetics-api-dev.fly.dev → Supabase dev
```

Configuración validada para desarrollo local de Payroll:

```text
# apps/payroll/.env.local (ignorado por Git)
NEXT_PUBLIC_API_URL=https://cosmetics-api-dev.fly.dev

# Fly.io, app cosmetics-api-dev
CORS_ORIGINS=http://localhost:3001,https://keysarcosmetics-envelope-git-develop-minnicas-projects.vercel.app,http://localhost:3002
```

La migración en Supabase dev, el backend `cosmetics-api-dev`, el login `SUPER_ADMIN` y el flujo de formularios de Payroll fueron probados correctamente. Si cambia el dominio Preview de Payroll, agregar también su origin exacto a `CORS_ORIGINS`.

**Notas importantes:**

- Frontend en Vercel se despliega automáticamente por push a `master`/`develop`.
- Backend en Fly.io se despliega **manualmente** por ahora.
- Migraciones de BD se aplican manualmente y con cuidado.
- No subir `.env` ni `.env.local` al repositorio.
- `apps/envelope/.env.local` es solo local y no debe commitearse.
- `apps/payroll/.env.local` también es solo local y no debe commitearse; las variables de Vercel se configuran por proyecto y ambiente.
- Para probar frontend local contra backend dev, conservar simultáneamente los origins de Envelope y Payroll en `CORS_ORIGINS`; no reemplazar uno por otro.
- Un `Network Error` en login normalmente significa que el frontend apunta a `localhost:4000`, el backend no responde o CORS rechazó el origin antes de llegar a `/api/auth/login`. Verificar primero Request URL, `/health` y el preflight `OPTIONS`.

---

## Mapa rápido del repositorio

### apps/payroll

```text
apps/payroll/
├── src/app/
│   ├── (auth)/login/                       → login JWT real
│   └── (dashboard)/
│       ├── page.tsx                        → corridas y resumen calculado
│       ├── bonos|multas|viaticos/          → catálogos dinámicos
│       ├── movimientos/                    → movimientos, asignaciones y evidencias
│       ├── gastos/                         → gastos fijos/variables
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

### backend/api

```
backend/api/
├── prisma/
│   ├── schema.prisma              → modelos Prisma (fuente de verdad de BD)
│   ├── migrations/                → migraciones versionadas (no modificar manualmente)
│   │   ├── 20260730000000_add_payroll_models/ → migración aditiva de Payroll
│   │   └── 20260731000000_add_employee_branch/ → FK nullable de empleado a sucursal
│   ├── seed.ts                    → seed general/demo, usar con cuidado
│   └── seed-catalogs.ts           → seed seguro para Bank/Position
└── src/
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
    │   ├── payroll.routes.ts
    │   ├── pos.routes.ts
    │   └── scheduler.routes.ts
    ├── services/
    │   ├── payroll-calculation.ts → motor puro de cálculo
    │   ├── payroll.service.ts     → corridas, reservas y snapshots
    │   └── payroll-storage.ts     → comprobantes en bucket privado
    ├── types/
    │   ├── express.d.ts           → extensión de tipos de Express
    │   └── jwt.ts
    └── index.ts                   → entrada Express, CORS, middleware global
```

### packages/ui

```
packages/ui/
├── src/components/
│   ├── ui/                        → componentes shadcn oficiales/canónicos
│   └── custom/
│       └── progress-keysar.tsx    → wrapper custom sobre Progress
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

| Tarea                      | Archivo                                                        |
| -------------------------- | -------------------------------------------------------------- |
| UI compartida (exports)    | `packages/ui/src/index.ts`                                     |
| Componentes shadcn         | `packages/ui/src/components/ui/`                               |
| Wrappers custom UI         | `packages/ui/src/components/custom/`                           |
| Layout envelope            | `apps/envelope/src/components/layout/`                         |
| Rutas envelope frontend    | `apps/envelope/src/app/(dashboard)/`                           |
| Hooks envelope             | `apps/envelope/src/hooks/`                                     |
| API client envelope        | `apps/envelope/src/lib/api.ts`                                 |
| Sesión/permisos envelope   | `apps/envelope/src/lib/session.tsx`                            |
| Endpoints envelope backend | `backend/api/src/routes/envelope.routes.ts`                    |
| Rutas payroll frontend     | `apps/payroll/src/app/(dashboard)/`                            |
| Estado/API payroll         | `apps/payroll/src/components/payroll/payroll-data-context.tsx` |
| Sesión payroll             | `apps/payroll/src/lib/session.tsx`                             |
| Endpoints payroll backend  | `backend/api/src/routes/payroll.routes.ts`                     |
| Motor payroll              | `backend/api/src/services/payroll-calculation.ts`              |
| Ciclo/snapshots payroll    | `backend/api/src/services/payroll.service.ts`                  |
| Guía de despliegue payroll | `apps/payroll/PENDIENTES.md`                                   |
| Guía operativa payroll     | `apps/payroll/GUIA_PRIMERA_NOMINA.md`                          |
| Prisma schema              | `backend/api/prisma/schema.prisma`                             |
| Migraciones                | `backend/api/prisma/migrations/`                               |
| Seed seguro catálogos      | `backend/api/prisma/seed-catalogs.ts`                          |
| Tipos compartidos          | `packages/types/src/index.ts`                                  |

---

## Comandos útiles

### Desarrollo

```bash
pnpm install
pnpm --filter @cosmetics/envelope dev
pnpm --filter @cosmetics/payroll dev
pnpm --filter @cosmetics/api dev
```

### Type-check y build

```bash
pnpm --filter @cosmetics/envelope type-check
pnpm --filter @cosmetics/envelope build
pnpm --filter @cosmetics/payroll type-check
pnpm --filter @cosmetics/payroll build
pnpm --filter @cosmetics/api test
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api build
```

### Deploy backend (ejecutar desde raíz del repo)

```bash
# Dev
fly deploy -a cosmetics-api-dev --config backend/api/fly.toml --dockerfile backend/api/Dockerfile

# Prod
fly deploy -a cosmetics-api --config backend/api/fly.toml --dockerfile backend/api/Dockerfile
```

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
12. No cambiar backend, Prisma ni variables de entorno salvo que la tarea lo pida explícitamente.
13. Si hay duda sobre borrar datos o archivos → detenerse y pedir confirmación.

---

## Pendientes conocidos

- Automatizar deploy backend con GitHub Actions si se decide.
- Crear seeds separados seguros para dev/datos base si se requiere.
- Limpieza futura de campos legacy `banco`/`puesto` en `Empleado` cuando todos los registros en prod tengan `bankId`/`positionId` asignados (Fase 4).
- Payroll producción: confirmar respaldo/PITR, aplicar `20260730000000_add_payroll_models` y `20260731000000_add_employee_branch`, desplegar `cosmetics-api`, configurar/verificar `NEXT_PUBLIC_API_URL` y `CORS_ORIGINS`, y ejecutar una corrida paralela antes del primer pago oficial.
- Payroll Storage: crear más adelante el bucket privado y configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y opcionalmente `PAYROLL_STORAGE_BUCKET` solo después de que exista.
