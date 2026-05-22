# Cosmetics Platform — CLAUDE.md

## Descripción del proyecto
Ecosistema de 5 aplicaciones web + 1 landing page para una empresa de cosméticos.
Todas las apps son internas (detrás de login), no requieren SEO excepto landing.

## Apps del monorepo
- `landing` → Next.js, página pública con SEO
- `envelope` → Next.js, control de ventas por sucursal (reemplaza un sobre físico)
- `payroll` → Next.js, administración de nómina
- `crm` → Next.js, gestión de mensajes de redes sociales (WhatsApp, Messenger, Instagram)
- `scheduler` → Next.js, agenda de citas con notificaciones y recordatorios
- `pos` → Electron + React + Vite, punto de venta offline con hardware

## Stack
- Monorepo: Turborepo + pnpm workspaces
- Frontend: Next.js 14 (App Router) + TypeScript strict
- UI: shadcn/ui + Tailwind CSS (paquete compartido @cosmetics/ui)
- Backend: Node.js + Express + TypeScript + Prisma
- Base de datos: PostgreSQL (esquemas separados por módulo)
- Auth: JWT + bcrypt

## Paquetes compartidos
- `@cosmetics/ui` → componentes shadcn/ui compartidos
- `@cosmetics/types` → tipos TypeScript compartidos
- `@cosmetics/auth` → lógica JWT y roles compartida
- `@cosmetics/api-client` → cliente axios compartido

## Roles del sistema
- SUPER_ADMIN → acceso total a todas las apps
- GERENTE → acceso a su sucursal: ventas, empleados, reportes locales
- CAPTURISTA → solo registro de ventas

## Convenciones de código
- Idioma del código: inglés (variables, funciones, carpetas, tipos)
- Idioma de comentarios y documentación: español
- Nomenclatura: camelCase para variables/funciones, PascalCase para componentes y tipos, kebab-case para carpetas
- Siempre TypeScript strict, nunca usar `any`
- Componentes con React Hook Form + Zod para validación

## Puertos en desarrollo
- landing: 3000
- envelope: 3001
- payroll: 3002
- crm: 3003
- scheduler: 3004
- pos: 3005
- backend/api: 4000