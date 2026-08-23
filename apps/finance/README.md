# Keysar Finance — Control financiero

Frontend Next.js para el control de sucursales, rentas, servicios, pagos, estados financieros, financiamientos, socios, aportaciones, proyecciones, accesos y reportes.

Esta etapa es una demo funcional con datos mock en memoria. No incluye login, backend, API routes, Prisma ni base de datos. Los datos operativos no se persisten; `localStorage` se usa únicamente para recordar la preferencia de tema de Finance. La guía de refactorización documenta las fases pendientes para producción.

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
apps/finance/
├─ public/
│  └─ geist.woff2                    # Fuente local utilizada por el tema
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                  # Metadata y root layout
│  │  ├─ page.tsx                    # Shell y navegación
│  │  └─ globals.css                 # Tokens, tema y layout responsivo
│  └─ components/
│     └─ finance-pages.tsx           # Vistas, mocks y flujos funcionales
├─ next.config.mjs
├─ postcss.config.mjs
├─ tailwind.config.ts
└─ tsconfig.json
```

El directorio no conserva artefactos del prototipo Vite/PWA ni outputs generados. `.next`, `dist` y `*.tsbuildinfo` se regeneran localmente y permanecen ignorados por Git.

Consulta `GUIA_REFACTORIZACION.md` antes de conectar sesión, endpoints o persistencia.
