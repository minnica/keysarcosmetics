# Keysar HR

Frontend interno de Recursos Humanos para Keysar Cosmetics. La aplicación vive en el monorepo como `@cosmetics/hr` y reserva el puerto `3007`.

## Estado actual

- Next.js 14.2.4, React 18, TypeScript strict y Tailwind CSS 3.
- Componentes compartidos desde `@cosmetics/ui` e iconos de Lucide.
- Shell responsive con módulos de empleados, calendario, solicitudes, vacaciones, sucursales, puestos, facialistas, cumpleaños, políticas y accesos.
- CRUD de demostración persistido en `localStorage` bajo `keysar-hr-mocks`.
- Sin API, autenticación autoritativa ni persistencia de base de datos todavía.

El frontend mock permite validar los flujos, pero sus datos no deben considerarse reales ni utilizarse como fuente de verdad.

## Trabajar con Codex en esta entrega

Puedes pedir cambios como «agrega un campo al empleado», «crea un reporte» o
«mejora el calendario» sin repetir que quieres mocks. [AGENTS.md](AGENTS.md)
instruye a Codex para resolverlos exclusivamente en el frontend y guardar los
cambios de la demo en este navegador, sin conectar backend ni base de datos.
El [AGENTS.md de la raíz](../../AGENTS.md) establece el mismo alcance cuando se
abre el monorepo y no se indica una app.

Abre una sesión nueva de Codex después de recibir estos archivos para que cargue
las instrucciones. La integración real queda fuera de esta entrega.

Estos archivos son instrucciones para el asistente, no un bloqueo de permisos.
Para una entrega con aislamiento técnico, el responsable debe preparar un entorno
sin credenciales ni accesos a backend/BD y limitar la escritura fuera de HR.

## Desarrollo

Con las dependencias preparadas por el responsable técnico, ejecuta los comandos
desde la raíz del monorepo:

```bash
pnpm --filter @cosmetics/hr dev
pnpm --filter @cosmetics/hr lint
pnpm --filter @cosmetics/hr type-check
pnpm --filter @cosmetics/hr build
pnpm --filter @cosmetics/hr start
```

La aplicación queda disponible en `http://localhost:3007` durante desarrollo.
Para trabajar en la demo usa el comando filtrado de HR; `pnpm dev` en la raíz
también inicia otros servicios.

## Estructura vigente

```text
apps/hr/
├── AGENTS.md             Instrucciones para mantener la entrega en mocks
├── app/
│   ├── globals.css       Tokens y estilos propios de HR
│   ├── hr-ui.tsx         Wrappers visuales sobre @cosmetics/ui
│   ├── layout.tsx        Layout raíz, metadata y toasts
│   ├── mock-data.ts      Tipos y estado inicial de demostración
│   ├── page.tsx          Entrada de la aplicación
│   └── roles-client.tsx  Shell y flujos frontend actuales
├── public/               Favicon y manifest
└── GUIA_REFACTORIZACION.md
```

## Arquitectura pendiente

La integración futura, fuera del alcance de esta entrega y reservada a un encargo
técnico separado, reemplazaría los mocks por:

- `@cosmetics/api-client` contra endpoints `/api/hr/*` en `backend/api`;
- autenticación JWT y cuentas compartidas mediante `@cosmetics/auth`;
- tipos compartidos en `@cosmetics/types`;
- modelos Prisma aditivos en PostgreSQL/Supabase que reutilicen `Empleado`, `Sucursal`, `Position` y `Usuario`;
- React Hook Form + Zod para formularios e importación Excel con validación cliente y servidor.

No deben reintroducirse D1, Drizzle, R2, Wrangler, Vinext, Vite, Workers, rutas API dentro del frontend ni una autenticación paralela. El alcance funcional y el orden de implementación se documentan en [GUIA_REFACTORIZACION.md](./GUIA_REFACTORIZACION.md).
