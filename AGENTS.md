# Cosmetics Platform — AGENTS.md

> Fuente principal de contexto del proyecto. Leer antes de hacer cambios.

---

## Descripción del proyecto

Ecosistema de apps web internas + landing page para empresa de cosméticos.
Monorepo con Turborepo + pnpm workspaces.
Todas las apps son internas (detrás de login), excepto `landing` que es pública con SEO.

---

## Apps del monorepo

| App | Tipo | Puerto dev | Descripción |
|---|---|---|---|
| `landing` | Next.js | 3000 | Página pública con SEO |
| `envelope` | Next.js | 3001 | Control de ventas por sucursal (reemplaza sobre físico) |
| `payroll` | Next.js | 3002 | Administración de nómina |
| `crm` | Next.js | 3003 | Gestión de mensajes: WhatsApp, Messenger, Instagram |
| `scheduler` | Next.js | 3004 | Agenda de citas con notificaciones y recordatorios |
| `pos` | Electron + React + Vite | 3005 | Punto de venta offline con hardware |
| `backend/api` | Express | 4000 | API REST compartida |

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

| Paquete | Propósito |
|---|---|
| `@cosmetics/ui` | Componentes shadcn/ui compartidos + wrappers custom |
| `@cosmetics/types` | Tipos TypeScript compartidos entre frontend y backend |
| `@cosmetics/auth` | Lógica JWT y roles compartida |
| `@cosmetics/api-client` | Cliente axios compartido |

---

## Roles del sistema

- `SUPER_ADMIN` → acceso total a todas las apps
- `GERENTE` → acceso a su sucursal: ventas, empleados, reportes locales
- `CAPTURISTA` → solo registro de ventas

---

## Estado actual de @cosmetics/ui

Componentes shadcn canónicos en `packages/ui/src/components/ui`:

- Button, Card, Input, Label, Textarea, Badge
- Table, Dialog, Select, Progress, Popover
- Calendar, DateRangePicker, Sheet, Tooltip, Separator, Sidebar
- **AlertDialog** — diálogo de confirmación destructiva (botones de borrar)
- **Sonner** — toasts con colores de marca (`#648672` green-olive, `#8bb09b` green-sage)
- **DataTable** — tabla canónica shadcn sobre `@tanstack/react-table`. Props: `columns: ColumnDef<T>[]`, `data: T[]`, `emptyMessage?: string`, `searchPlaceholder?: string`, `pageSize?: number` (default 20). Incluye sorting por clic en header, globalFilter (search input), selector de filas por página (opciones: 10, 20, 50, 100, Todos) y pagination con controles prev/next (ocultos en modo Todos). Re-exporta también `ColumnDef` desde `@cosmetics/ui` — las apps no deben importar `@tanstack/react-table` directamente.
- **DateRangePicker** — selector compartido de rango ISO `YYYY-MM-DD`; muestra dos meses en escritorio y uno en móvil, con calendario localizado al español.

`toast` helper re-exportado desde `@cosmetics/ui` (no importar `sonner` directamente en las apps).

Wrappers custom en `packages/ui/src/components/custom`:

- `ProgressKeysar` — wrapper custom sobre `Progress` oficial
- `Combobox` — select con búsqueda integrada; usa `Popover` + `Input`. Props: `options`, `value`, `onValueChange`, `placeholder`, `searchPlaceholder`, `emptyMessage`, `disabled`, `id`. Exporta también `ComboboxOption` (interface `{ value: string; label: string }`).
- `MultiCombobox` — select compacto con búsqueda y selección múltiple; usa `Popover` + `Input`. Props: `options`, `value`, `onValueChange`, `placeholder`, `searchPlaceholder`, `emptyMessage`, `disabled`, `id`.

**Reglas de UI:**
- Apps consumen UI exclusivamente desde `@cosmetics/ui`.
- No recrear componentes manuales similares a shadcn en las apps.
- No crear duplicados en `apps/envelope/src/components/ui`.
- Si un componente no existe en shadcn, crear wrapper custom en `packages/ui/src/components/custom` usando primitivas oficiales cuando sea posible.
- `toast` siempre desde `@cosmetics/ui`, nunca `import { toast } from 'sonner'` directo.
- Botones de borrar siempre con `AlertDialog` de confirmación antes de ejecutar `remove`.
- **Tablas de datos siempre con `DataTable` + `ColumnDef` desde `@cosmetics/ui`.** No usar `<Table>` + `<TableBody>` manual para listados CRUD — solo para tablas de reporte/estáticas.
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
- **ventas** — captura una venta total por `sucursal`+`fecha`+empleado inicial+monto; después permite agregar empleados con reparto equitativo automático y montos editables, y conciliar métodos de pago uno por uno contra el total. El guardado solo se habilita cuando tanto la distribución por empleado como la suma de pagos coinciden con el monto. Cada empleado se persiste como un `RegistroVenta`, compartiendo un `sesionId` cuando participa más de uno; `POST /api/envelope/ventas/lote` guarda todo el voucher en una transacción atómica.
- **empleados** — CRUD, usa `bankId`/`positionId` dinámicos desde backend; incluye toggle activo/inactivo con `PATCH /empleados/:id/status`; GET retorna todos los empleados (activos primero), la tabla muestra badge de estatus y botón `PowerOff`/`Power` con AlertDialog de confirmación
- **sucursales** — CRUD de sucursales
- **metodos-pago** — CRUD de métodos de pago
- **bancos** — CRUD propio con catálogo `Bank`
- **puestos** — CRUD propio con catálogo `Position`
- **reportes** — múltiples subvistas: total-general, detalle-metodo-pago, metodo-pago-por-dia, ventas-por-vendedor, ventas-por-vendedor-dia

UI:
- Sidebar responsive usando shadcn `Sidebar` + `Sheet` (Sheet para mobile).
- Layout: `AppSidebar` + `LayoutShell` en `src/components/layout/`.
- Todos los botones de borrar usan `AlertDialog` de confirmación.
- Todos los formularios disparan `toast.success()` al crear o editar, **excepto** el modal "Agregar/Editar venta" en ventas: dispara `toast.info()` azul pastel (8 s) recordando al usuario que debe dar clic en «Guardar registro» para persistir.
- `<Toaster position="bottom-center" />` montado en `src/app/layout.tsx`.
- Favicon configurado via metadata `icons: { icon: '/logo.svg' }` en root layout.
- Header del sidebar muestra logo (32px) + texto "Keysar Cosmetics" cuando expandido; solo logo (28px) cuando colapsado.
- Switch dark/light mode en el header del sidebar (bajo la fila del logo), oculto en modo colapsado.
- Botón "Cerrar sesión" en `SidebarFooter` — elimina `auth_token` de localStorage y redirige a `/login`. Usa `SidebarMenuButton` con tooltip para funcionar también en modo colapsado.

Datos:
- `useBanks` y `usePositions` cargan catálogos dinámicos desde backend.
- Campos legacy `banco`/`puesto` (string) aún existen en `Empleado` durante transición.

---

## Backend / Prisma

- Express + Prisma, PostgreSQL en Supabase.
- Schema canónico: `backend/api/prisma/schema.prisma`.
- PrismaClient compartido: `backend/api/src/prisma/client.ts`.

**Modelos relevantes:**
- `Usuario`, `Sucursal`, `Empleado`, `Venta`, `VentaDetalle`, `MetodoPago`, `Bank`, `Position`.
- `Empleado` tiene `bankId`/`positionId` nullable (FK a catálogos dinámicos).
- `Empleado` también tiene campos legacy `banco`/`puesto` (String) — conservar por compatibilidad hasta backfill completo en prod.
- `Venta` tiene `sesionId String?` — vincula registros del mismo voucher multi-vendedor; null = venta individual.
- Soft delete: `activo = false` (Usuario, Empleado, Bank, Position, MetodoPago) o `activa = false` (Sucursal). **No hacer borrados físicos salvo instrucción explícita.**

**Reglas de BD:**
- No ejecutar `migrate reset` ni `db push` en ambientes compartidos/productivos.
- Usar migraciones Prisma controladas (`prisma migrate deploy`).
- `seed.ts` contiene datos demo — usar con cuidado, puede sobreescribir datos.
- `seed-catalogs.ts` es el seed seguro para catálogos `Bank`/`Position`.

---

## Ambientes y deploy

### Producción
```
master → Vercel Production → cosmetics-api.fly.dev → Supabase prod
```

### Desarrollo
```
develop → Vercel Preview → cosmetics-api-dev.fly.dev → Supabase dev
```

**Notas importantes:**
- Frontend en Vercel se despliega automáticamente por push a `master`/`develop`.
- Backend en Fly.io se despliega **manualmente** por ahora.
- Migraciones de BD se aplican manualmente y con cuidado.
- No subir `.env` ni `.env.local` al repositorio.
- `apps/envelope/.env.local` es solo local y no debe commitearse.
- Para CORS dev: `cosmetics-api-dev` usa `CORS_ORIGINS` con dominio Vercel Preview de `develop`.
- Para probar frontend local contra backend dev: ajustar `CORS_ORIGINS` temporalmente a `http://localhost:3001` o configurar backend para aceptar múltiples origins.

---

## Mapa rápido del repositorio

### apps/envelope

```
apps/envelope/
├── src/app/
│   ├── (auth)/login/              → login interno
│   ├── (dashboard)/               → rutas internas detrás de login
│   │   ├── page.tsx               → dashboard principal
│   │   ├── layout.tsx             → layout del dashboard (LayoutShell + sidebar)
│   │   ├── ventas/                → captura y gestión de ventas
│   │   ├── empleados/             → CRUD empleados, usa Bank/Position dinámicos
│   │   ├── sucursales/            → CRUD sucursales
│   │   ├── metodos-pago/          → CRUD métodos de pago
│   │   ├── bancos/                → CRUD catálogo Bank
│   │   ├── puestos/               → CRUD catálogo Position
│   │   └── reportes/              → subvistas de reportes del módulo envelope
│   └── layout.tsx                 → layout raíz de la app
├── src/components/
│   ├── layout/
│   │   ├── AppSidebar.tsx         → sidebar principal con navegación
│   │   └── LayoutShell.tsx        → shell que envuelve contenido con sidebar
│   └── index.ts
├── src/hooks/                     → hooks de datos
│   ├── useBanks.ts
│   ├── useEmpleados.ts
│   ├── useMetodosPago.ts
│   ├── usePositions.ts
│   ├── useReportes.ts
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
│   ├── (dashboard)/reportes/       → resumen ejecutivo + reporte general de reservas (mock)
│   ├── globals.css                → tokens visuales del scheduler
│   └── layout.tsx                 → metadata + Toaster global
├── src/components/
│   ├── SchedulerPrimaryNav.tsx  → navbar compartido con dropdowns de Reportes y Administración
│   ├── SchedulerWorkspace.tsx     → shell principal con estado local, filtros y modales
│   ├── scheduler/                 → header, sidebar, grid agenda, tarjetas y diálogos del scheduler
│   └── reports/                   → dashboard y navegación del resumen de reportes
├── src/components/administration/ → navegación y CRUDs mock de Administración
└── src/lib/
    ├── mock-scheduler-data.ts     → datos mock de sucursales, profesionales, citas, bloqueos y leyenda
    ├── mock-administration-data.ts → catálogos mock de locales, profesionales, servicios y módulos administrativos
    └── mock-report-data.ts        → periodos, KPIs y series mock del resumen de reportes
```

### backend/api

```
backend/api/
├── prisma/
│   ├── schema.prisma              → modelos Prisma (fuente de verdad de BD)
│   ├── migrations/                → migraciones versionadas (no modificar manualmente)
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
    │   ├── envelope.routes.ts     → endpoints del módulo envelope
    │   ├── crm.routes.ts
    │   ├── payroll.routes.ts
    │   ├── pos.routes.ts
    │   └── scheduler.routes.ts
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

| Tarea | Archivo |
|---|---|
| UI compartida (exports) | `packages/ui/src/index.ts` |
| Componentes shadcn | `packages/ui/src/components/ui/` |
| Wrappers custom UI | `packages/ui/src/components/custom/` |
| Layout envelope | `apps/envelope/src/components/layout/` |
| Rutas envelope frontend | `apps/envelope/src/app/(dashboard)/` |
| Hooks envelope | `apps/envelope/src/hooks/` |
| API client envelope | `apps/envelope/src/lib/api.ts` |
| Endpoints envelope backend | `backend/api/src/routes/envelope.routes.ts` |
| Prisma schema | `backend/api/prisma/schema.prisma` |
| Migraciones | `backend/api/prisma/migrations/` |
| Seed seguro catálogos | `backend/api/prisma/seed-catalogs.ts` |
| Tipos compartidos | `packages/types/src/index.ts` |

---

## Comandos útiles

### Desarrollo

```bash
pnpm install
pnpm dev                         # inicia los seis proyectos frontend; también abre POS (Electron)
pnpm --filter @cosmetics/envelope dev
pnpm --filter @cosmetics/scheduler dev
pnpm --filter @cosmetics/api dev
```

Para trabajar únicamente en Scheduler y evitar abrir POS:

```powershell
pnpm.cmd --filter @cosmetics/scheduler dev
```

Si `pnpm` local no reconstruye bien `node_modules` del workspace en Windows, usar los scripts directos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\repair-scheduler-workspace.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev-scheduler.ps1
```

### Type-check y build

```bash
pnpm --filter @cosmetics/envelope type-check
pnpm --filter @cosmetics/envelope build
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler build
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api build
```

Validacion directa del scheduler sin depender de `pnpm run`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-scheduler.ps1
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

## Reglas para futuras sesiones de Codex

1. **Leer AGENTS.md antes de modificar el proyecto.**
2. Si una tarea cambia arquitectura, módulos, ambientes, comandos, convenciones, componentes compartidos, schema Prisma, endpoints, rutas importantes o flujo de deploy → **actualizar AGENTS.md en la misma tarea**.
3. No agregar secretos, tokens, passwords ni URLs privadas a AGENTS.md.
4. No modificar producción sin confirmación explícita del usuario.
5. Para cambios grandes, primero auditar y proponer plan por fases antes de ejecutar.
6. Para cambios de BD: explicar si la migración es destructiva o aditiva antes de ejecutar.
7. Para cambios de BD: no ejecutar `migrate reset` ni `db push` en ambientes compartidos.
8. Para cambios de UI: priorizar `@cosmetics/ui` y shadcn/ui. No crear componentes duplicados en `apps/*/src/components/ui`.
9. Para cambios en envelope: validar `type-check` y `build` antes de reportar tarea completa.
10. Para backend: validar `type-check`/`build` si existen.
11. No cambiar backend, Prisma ni variables de entorno salvo que la tarea lo pida explícitamente.
12. Si hay duda sobre borrar datos o archivos → detenerse y pedir confirmación.

---

## Pendientes conocidos

- Automatizar deploy backend con GitHub Actions si se decide.
- Crear seeds separados seguros para dev/datos base si se requiere.
- Limpieza futura de campos legacy `banco`/`puesto` en `Empleado` cuando todos los registros en prod tengan `bankId`/`positionId` asignados (Fase 4).
- `apps/scheduler` conserva la agenda principal en modo local/mock. La ruta `/administracion` ahora contiene el workspace completo de Administración, también local/mock y sin conexión a backend.
- La ruta `/reportes` contiene la primera fase local/mock de Reportes: resumen ejecutivo con selector de periodo, KPIs comparativos, detalle por estado, origen de reservas, ocupación, ventas y ticket promedio. También incluye seguimiento mock de cumpleaños, recordatorios por email, pagos en línea y métricas de campañas. `/reportes/reservas` implementa la vista General del reporte de reservas con rango de fechas, filtros por estado, criterio de fecha, KPIs, ranking de servicios, distribución semanal y demanda por hora. El ítem lateral `Reservas` funciona como dropdown con `Historial` y `Métricas`; `/reportes/reservas/historial` implementa Historial con los filtros compartidos, DataTable, búsqueda, sorting, paginación, estados de reserva/pago y descarga visual mock. `/reportes/reservas/metricas` implementa Métricas con proporciones generales, desglose por servicio, evolución diaria y estados vacíos para confirmadas, asistencias, cancelaciones y no asistencias. `/reportes/reservas/locales` implementa el consolidado por sucursal con reservas, recaudación, ocupación, tendencia y comparativa semanal responsive. `/reportes/reservas/servicios` implementa el catálogo de rendimiento con 53 servicios precargados del reporte operativo (40 reservas y $48,959), buscador, participación, recaudación, ticket promedio, dona de distribución y ranking de uso. Los demás desgloses laterales permanecen pendientes. El reporte de ventas todavía no está implementado.
- `/reportes/reservas/mensajeria-movil` implementa el seguimiento mock de WhatsApp con reservas sin confirmar, proporción de envíos, confirmaciones, cuota de conversaciones, descarga visual y tabla de actividad reciente. Comparte los filtros del reporte de reservas y todavía no conecta el proveedor real de mensajería.
- `/reportes/reservas/servicios-por-local/opatra-mexico` implementa el dropdown `Servicios por local` y el desglose de los 53 servicios de OPATRA MEXICO en el orden del reporte operativo, reutilizando sus totales, buscador, tabla compacta y rankings.
- `/reportes/reservas/prestadores-por-local/opatra-mexico` implementa el dropdown `Prestadores por local` y el consolidado mock de OPATRA MEXICO por prestador, con reservas, ingresos estimados, ocupación, tendencia semanal y demanda por hora.
- El navbar del scheduler reutiliza `SchedulerPrimaryNav` en Agenda, Reportes y Administración. `Reportes` expone Resumen y Reservas; `Administración` expone las nueve secciones activas y conserva `?section=` al navegar.
- Administración incluye Locales, Profesionales, Grupos personalizados, Servicios, Clases, Paquetes, Adicionales, Comisiones, Recursos, Encuestas, Consentimientos, WhatsApp y Gift cards. Sus CRUDs, filtros, estados, modales y confirmaciones se mantienen en estado local durante esta fase.
- Servicios ya cuenta en mock con los modales de servicios, sesiones, clases, paquetes y adicionales; categorías, profesionales, servicio destacado, nombres alternativos, sitio web, pago en línea, imágenes y carga/descarga masiva de precios. La siguiente prioridad visual es cerrar `Opciones avanzadas` antes de conectar la API.
- La carga de precios y subida de plantillas `.xlsx` son flujos visuales/mock: todavía no procesan archivos reales ni persisten información.
- `Local` y `Profesional` son entidades separadas; `Planes` en Comisiones muestra por ahora un estado vacío mock, sin persistencia. `Consentimientos` permite crear y editar documentos con nombre y archivo, cargados de forma visual/mock, y los lista en un `DataTable` con búsqueda y eliminación confirmada; todavía no incluye firma, resultados ni persistencia real.
- `Encuestas` funciona en estado local/mock: permite seleccionar servicios y preguntas por categoría, crear preguntas de tipo estrellas o comentario, y visualizar un preview vivo con servicios, numeración y cinco estrellas. Todavía no incluye resultados ni persistencia real.
- `WhatsApp` funciona en estado local/mock: lista 13 mensajes precargados de operación (OPATRA, Mitikah, bienvenida, confirmación, postventa, agradecimiento, recordatorios, reagenda y no asistencia), permite crear/editar plantillas personalizadas, insertar variables agrupadas por reserva, local y compañía, probar plantillas prediseñadas y ver un preview estilo WhatsApp. El envío real, conexión del canal y persistencia quedan fuera de alcance.
- Siguiente etapa de integración: modelar `Cliente`, `Servicio`, `Cita`, `BloqueHorario`, horarios, recursos y relaciones en `/api/scheduler` antes de conectar persistencia real.
