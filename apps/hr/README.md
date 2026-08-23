# Keysar HR

Frontend interno de Recursos Humanos para Keysar Cosmetics. La aplicación vive en el monorepo como `@cosmetics/hr` y reserva el puerto `3007`.

## Estado actual

- Next.js 14.2.4, React 18, TypeScript strict y Tailwind CSS 3.
- Componentes compartidos desde `@cosmetics/ui` e iconos de Lucide.
- Shell responsive con módulos de empleados, calendario, solicitudes, vacaciones, sucursales, puestos, facialistas, cumpleaños, políticas y accesos.
- CRUD de demostración persistido en `localStorage` bajo `keysar-hr-mocks`.
- Sin API, autenticación autoritativa ni persistencia de base de datos todavía.

El frontend mock permite validar los flujos, pero sus datos no deben considerarse reales ni utilizarse como fuente de verdad.

## Desarrollo

Ejecuta los comandos desde la raíz del monorepo:

```bash
pnpm install
pnpm --filter @cosmetics/hr dev
pnpm --filter @cosmetics/hr lint
pnpm --filter @cosmetics/hr type-check
pnpm --filter @cosmetics/hr build
pnpm --filter @cosmetics/hr start
```

La aplicación queda disponible en `http://localhost:3007` durante desarrollo.

## Estructura vigente

```text
apps/hr/
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

La siguiente etapa reemplazará los mocks por:

- `@cosmetics/api-client` contra endpoints `/api/hr/*` en `backend/api`;
- autenticación JWT y cuentas compartidas mediante `@cosmetics/auth`;
- tipos compartidos en `@cosmetics/types`;
- modelos Prisma aditivos en PostgreSQL/Supabase que reutilicen `Empleado`, `Sucursal`, `Position` y `Usuario`;
- React Hook Form + Zod para formularios e importación Excel con validación cliente y servidor.

No deben reintroducirse D1, Drizzle, R2, Wrangler, Vinext, Vite, Workers, rutas API dentro del frontend ni una autenticación paralela. El alcance funcional y el orden de implementación se documentan en [GUIA_REFACTORIZACION.md](./GUIA_REFACTORIZACION.md).
