# Keysar Cosmetics — contexto de trabajo

Lee primero `AGENTS.md` antes de modificar el repositorio. Ese archivo contiene las reglas técnicas y el contexto completo del monorepo.

## Proyectos del monorepo

| Proyecto | Tecnología | Puerto | Estado de trabajo |
|---|---|---:|---|
| `apps/landing` | Next.js | 3000 | Landing pública |
| `apps/envelope` | Next.js | 3001 | Ventas por sucursal |
| `apps/payroll` | Next.js | 3002 | Nómina |
| `apps/crm` | Next.js | 3003 | Mensajería y clientes |
| `apps/scheduler` | Next.js | 3004 | Agenda y Administración visual/mock |
| `apps/pos` | Electron + React + Vite | 3005 | Punto de venta; actualmente en construcción |

El backend compartido vive en `backend/api` y usa Express, Prisma y PostgreSQL. No se cuenta como uno de los seis proyectos frontend.

## Estado actual del trabajo

- Scheduler y `Administración` funcionan en local/mock.
- Administración incluye Locales, Profesionales, Grupos personalizados, Servicios, Clases, Paquetes, Adicionales, Comisiones, Recursos, Encuestas, Consentimientos, WhatsApp y Gift cards.
- El objetivo actual es cerrar el acabado visual, responsive y los flujos frontend antes de conectar backend.
- No tocar backend, Prisma ni variables de entorno hasta recibir petición explícita.
- `Encuestas` no incluye resultados y `Consentimientos` no incluye firma; ambos quedan como catálogos/configuración.

## Reglas clave

- Usar la UI compartida desde `@cosmetics/ui`.
- Mantener TypeScript strict y no usar `any` ni `@ts-ignore`.
- Priorizar responsive mobile, accesibilidad, estados vacíos, loading, errores y feedback.
- No inventar comportamiento cuando falte definición; documentarlo como pendiente.
- No ejecutar migraciones ni modificar producción sin autorización explícita.

## Desarrollo

`pnpm dev` inicia los seis proyectos frontend a la vez. Esto incluye `apps/pos`, por lo que abre una ventana Electron POS aunque se esté revisando Scheduler.

Para trabajar solamente en Scheduler:

```powershell
pnpm.cmd --filter @cosmetics/scheduler dev
```

También se puede usar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-scheduler.ps1
```

Consulta `docs/SCHEDULER_CONTEXT.md` para el detalle de fases y alcance del scheduler.
