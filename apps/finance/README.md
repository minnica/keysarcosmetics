# Keysar Finance — Control financiero

Frontend Next.js para el control de sucursales, rentas, servicios, pagos, estados financieros, financiamientos, socios, aportaciones, proyecciones, accesos y reportes.

Esta etapa es una demo funcional con datos mock en memoria. No incluye login, backend, API routes, Prisma ni base de datos. Los datos operativos no se persisten; `localStorage` se usa únicamente para recordar la preferencia de tema de Finance. La guía de refactorización documenta las fases pendientes para producción.

## Trabajar con Codex

Las instrucciones de [AGENTS.md](AGENTS.md) establecen que todas las mejoras se
realizan con mocks dentro de Finance, incluso si el prompt no lo especifica.
Puedes pedir pantallas, formularios, cálculos, reportes o flujos en lenguaje
cotidiano. Los datos editados duran hasta recargar la página.

Conserva ese archivo al compartir el proyecto y abre una sesión nueva de Codex
en `apps/finance` para cargar las instrucciones. Si trabajas desde la raíz del
monorepo, su [AGENTS.md](../../AGENTS.md) también indica que debe aplicar estas
reglas a Finance. Esta app depende de los paquetes compartidos del monorepo;
copiar únicamente su carpeta no crea un proyecto independiente.

`AGENTS.md` proporciona instrucciones, no un bloqueo técnico de permisos. Para
una entrega con aislamiento efectivo, prepara un entorno sin credenciales ni
acceso a servicios reales y restringe la escritura a la demo. Estas medidas no
se configuran mediante el archivo de contexto.

El uso y la carga de estos archivos se describen en la
[documentación oficial de OpenAI](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

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
├─ AGENTS.md                        # Instrucciones: trabajar solo con mocks
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

`GUIA_REFACTORIZACION.md` conserva un plan técnico futuro. Sus fases no autorizan
conectar sesión, endpoints ni persistencia durante el trabajo sobre esta demo.
