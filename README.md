# Keysar Cosmetics

Monorepo de las seis aplicaciones frontend internas/públicas de Keysar Cosmetics y su backend compartido.

## Proyectos

| Proyecto | Tecnología | Puerto |
|---|---|---:|
| `apps/landing` | Next.js | 3000 |
| `apps/envelope` | Next.js | 3001 |
| `apps/payroll` | Next.js | 3002 |
| `apps/crm` | Next.js | 3003 |
| `apps/scheduler` | Next.js | 3004 |
| `apps/pos` | Electron + React + Vite | 3005 |

El backend compartido está en `backend/api` y escucha en el puerto 4000.

## Estado actual

El foco activo es `apps/scheduler`. La agenda y todo el menú `Administración` funcionan en local/mock para cerrar primero el acabado visual y responsive. La persistencia de Scheduler todavía no está conectada.

Administración incluye:

- Locales
- Profesionales y grupos personalizados
- Servicios, clases, paquetes y adicionales
- Comisiones
- Recursos
- Encuestas
- Consentimientos
- WhatsApp
- Gift cards

## Desarrollo

```powershell
pnpm install
pnpm.cmd --filter @cosmetics/scheduler dev
```

El comando raíz `pnpm dev` inicia los seis proyectos frontend a la vez y abre también la ventana Electron de POS. Para revisar Scheduler sin POS, usa el comando filtrado anterior.

## Documentación

- `AGENTS.md`: reglas completas del repositorio.
- `CLAUDE.md`: resumen operativo homologado de los seis proyectos.
- `docs/SCHEDULER_CONTEXT.md`: alcance y fases del scheduler.
