# Keysar Cosmetics

Monorepo de las aplicaciones internas y la landing pública de Keysar Cosmetics.
El proyecto usa Turborepo, pnpm workspaces, Next.js, TypeScript, React y un backend Express compartido.

## Aplicaciones

| Aplicación | Tecnología | Puerto | Propósito |
|---|---|---:|---|
| `apps/landing` | Next.js | 3000 | Sitio público con SEO |
| `apps/envelope` | Next.js | 3001 | Control de ventas por sucursal |
| `apps/payroll` | Next.js | 3002 | Administración de nómina |
| `apps/crm` | Next.js | 3003 | Mensajería y canales sociales |
| `apps/scheduler` | Next.js | 3004 | Agenda y administración de reservas |
| `apps/pos` | Electron + React + Vite | 3005 | Punto de venta offline |
| `backend/api` | Express + Prisma | 4000 | API REST compartida |

Todas las aplicaciones son internas detrás de login, excepto `landing`.

## Paquetes compartidos

- `@cosmetics/ui`: componentes shadcn/ui y wrappers visuales compartidos.
- `@cosmetics/types`: tipos comunes de frontend y backend.
- `@cosmetics/auth`: autenticación JWT y roles.
- `@cosmetics/api-client`: cliente HTTP compartido.

## Estado actual

El foco activo es `apps/scheduler`. La agenda y la ruta `/administracion` funcionan actualmente con datos mock locales para validar primero el diseño y los flujos. Todavía no se conecta persistencia real del Scheduler y no se modifican backend, Prisma ni variables de entorno en esta etapa.

La administración incluye:

- Locales.
- Profesionales y grupos personalizados.
- Servicios, clases, paquetes y adicionales.
- Comisiones.
- Recursos.
- Encuestas.
- Consentimientos.
- WhatsApp.
- Gift cards.

### Servicios implementados en mock

El catálogo de Servicios incluye:

- Listados por categoría, búsqueda, estados y edición.
- Servicios individuales y servicios con sesiones.
- Clases con capacidad y horario por día, profesional, apertura y cierre.
- Paquetes con selección de servicios, precio personalizado por elemento y total calculado.
- Adicionales con flujo independiente de nombre, precio y categoría.
- Categorías creadas desde los modales.
- Servicio destacado mediante estrella y tooltip.
- Nombres alternativos como etiquetas.
- Sitio Web con descripción, visibilidad, duración, pago en línea e imágenes cuando aplica.
- Opciones avanzadas con modalidad, comisión por porcentaje o moneda, recursos y horario especial.
- Carga masiva de precios con edición filtrable y pestaña de carga `.xlsx` en modo mock.
- Menú de descarga de lista completa y plantilla de actualización masiva en modo mock.

El siguiente bloque de trabajo es revisar y completar visualmente las Opciones avanzadas de cada tipo de elemento antes de conectar el catálogo con la API.

## Estructura relevante

```text
apps/scheduler/
├── src/app/
│   ├── (auth)/login/                 # acceso temporal/mock
│   ├── (dashboard)/page.tsx          # agenda principal
│   ├── (dashboard)/administracion/   # administración
│   ├── globals.css                   # tokens y estilos del Scheduler
│   └── layout.tsx
├── src/components/
│   ├── administration/
│   │   └── AdministrationWorkspace.tsx
│   ├── scheduler/                    # agenda, reservas y bloqueos
│   └── SchedulerWorkspace.tsx
└── src/lib/
    ├── mock-administration-data.ts   # catálogos mock administrativos
    └── mock-scheduler-data.ts        # agenda y datos de reservas mock
```

La documentación funcional ampliada está en [`docs/SCHEDULER_CONTEXT.md`](docs/SCHEDULER_CONTEXT.md). Las reglas de trabajo del repositorio están en [`AGENTS.md`](AGENTS.md) y el resumen operativo general en [`CLAUDE.md`](CLAUDE.md).

## Desarrollo local

Requisitos: Node.js 20 o superior y pnpm 10.

```powershell
pnpm install
pnpm.cmd --filter @cosmetics/scheduler dev
```

El comando anterior inicia únicamente Scheduler en `http://localhost:3004`.

Para iniciar todos los proyectos frontend y POS:

```powershell
pnpm dev
```

En Windows, si el workspace necesita reparación:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\repair-scheduler-workspace.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev-scheduler.ps1
```

## Validación

Scheduler:

```powershell
pnpm.cmd --filter @cosmetics/scheduler type-check
pnpm.cmd --filter @cosmetics/scheduler build
```

Validación directa equivalente:

```powershell
cmd /c node_modules\.bin\tsc.cmd -p apps\scheduler\tsconfig.json --noEmit --pretty false
cmd /c apps\scheduler\..\..\node_modules\.bin\next.cmd build
```

Validación del monorepo:

```powershell
pnpm type-check
pnpm build
```

## Reglas importantes

- Mantener los cambios administrativos del Scheduler en mock hasta autorizar la integración con backend.
- No ejecutar `prisma migrate reset` ni `prisma db push` en ambientes compartidos.
- No subir secretos ni archivos `.env`.
- Usar los componentes de `@cosmetics/ui` en lugar de duplicar componentes visuales dentro de las apps.
- Usar `AlertDialog` para eliminaciones o acciones destructivas.
- Mantener la interfaz responsive y validar TypeScript/build antes de cerrar cambios.
