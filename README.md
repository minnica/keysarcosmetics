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

## Desarrollo local

Requisitos: Node.js 20 o superior y pnpm 10.

```powershell
pnpm install
```

Para iniciar todos los proyectos frontend y POS:

```powershell
pnpm dev
```

Para iniciar únicamente Scheduler en `http://localhost:3004`:

```powershell
pnpm.cmd --filter @cosmetics/scheduler dev
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

Monorepo completo:

```powershell
pnpm type-check
pnpm build
```

## Reglas importantes

- No ejecutar `prisma migrate reset` ni `prisma db push` en ambientes compartidos.
- No subir secretos ni archivos `.env`.
- Usar los componentes de `@cosmetics/ui` en lugar de duplicar componentes visuales dentro de las apps.
- Usar `AlertDialog` para eliminaciones o acciones destructivas.
- Mantener la interfaz responsive y validar TypeScript/build antes de cerrar cambios.

## Documentación

- Contexto de desarrollo: [`AGENTS.md`](AGENTS.md) y [`CLAUDE.md`](CLAUDE.md).
- Contexto funcional del scheduler: [`docs/SCHEDULER_CONTEXT.md`](docs/SCHEDULER_CONTEXT.md).
