# Keysar Finance — Control financiero

Frontend Next.js para el control de sucursales, rentas, servicios, pagos, estados financieros, financiamientos, socios, aportaciones, proyecciones, accesos y reportes.

Esta etapa es una demo funcional con datos mock en memoria. No incluye login, backend, API routes, Prisma, base de datos ni `localStorage`. La guía de migración documenta las fases pendientes para producción.

## Desarrollo

Desde la raíz del monorepo:

```bash
pnpm --filter @cosmetics/finance dev
```

La app usa el puerto `3006`.

## Verificación

```bash
pnpm --filter @cosmetics/finance type-check
pnpm --filter @cosmetics/finance lint
pnpm --filter @cosmetics/finance build
```

Estas comprobaciones requieren que las dependencias del workspace estén instaladas. La validación visual se realiza manualmente.

## Estructura actual

```text
src/
├─ app/
│  ├─ layout.tsx       # Metadata y root layout
│  ├─ page.tsx         # Shell, navegación y vistas mock
│  └─ globals.css      # Tokens, tema y responsive layout
├─ next.config.mjs
├─ postcss.config.mjs
├─ tailwind.config.ts
└─ tsconfig.json
```

Consulta `GUIA_REFACTORIZACION.md` antes de conectar sesión, endpoints o persistencia.
