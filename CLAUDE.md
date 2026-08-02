# Keysar Cosmetics — contexto de trabajo

Lee primero `AGENTS.md` antes de modificar el repositorio. Ese archivo contiene las reglas técnicas y el contexto completo del monorepo.

## Proyectos del monorepo

| Proyecto | Tecnología | Puerto | Estado de trabajo |
|---|---|---:|---|
| `apps/landing` | Next.js | 3000 | Landing pública |
| `apps/envelope` | Next.js | 3001 | Ventas por sucursal |
| `apps/payroll` | Next.js | 3002 | Nómina |
| `apps/crm` | Next.js | 3003 | Mensajería y clientes |
| `apps/scheduler` | Next.js | 3004 | Agenda y Administración local/mock |
| `apps/pos` | Electron + React + Vite | 3005 | Punto de venta; actualmente en construcción |

El backend compartido vive en `backend/api` y usa Express, Prisma y PostgreSQL. No se cuenta como uno de los seis proyectos frontend.

## Estado actual del trabajo

- Scheduler y `Administración` funcionan en local/mock.
- Administración incluye Locales, Profesionales, Grupos personalizados, Servicios, Clases, Paquetes, Adicionales, Comisiones, Recursos, Encuestas, Consentimientos, WhatsApp y Gift cards.
- El catálogo de Servicios ya incluye los modales principales de servicios, servicios con sesiones, clases, paquetes y adicionales, además de categorías, profesionales, estados y confirmaciones en mock.
- En Servicios también están representados los flujos de sitio web, pago en línea, nombres alternativos, imágenes, servicio destacado, comisiones por porcentaje o moneda, recursos, horarios especiales y carga masiva de precios.
- La carga de precios, descarga de plantillas y subida de `.xlsx` son todavía flujos visuales/mock; no hay importación real ni persistencia.
- `Encuestas` permite seleccionar servicios y preguntas por categoría, crear preguntas de estrellas o comentario y ver un preview vivo con numeración y cinco estrellas; todavía no incluye resultados ni persistencia.
- `Consentimientos` permite crear y editar documentos con nombre y archivo PDF/DOC/DOCX mediante una zona de carga visual con límite de 5 MB; el listado usa `DataTable` con búsqueda, edición y eliminación confirmada. Sigue siendo local/mock y no incluye firma ni persistencia.
- La siguiente prioridad visual es cerrar y validar `Opciones avanzadas` de los modales de Servicios y después revisar el resto de módulos administrativos antes de conectar backend.
- No tocar backend, Prisma ni variables de entorno hasta recibir petición explícita.

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

Validación del scheduler:

```powershell
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler build
```

Consulta `docs/SCHEDULER_CONTEXT.md` para el detalle de fases y alcance del scheduler.
