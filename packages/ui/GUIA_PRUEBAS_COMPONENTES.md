# Pruebas de componentes compartidos

Cada export público de `@cosmetics/ui` debe conservar al menos un contrato en Vitest + React Testing Library. Los contratos viven junto al componente en `src/components/**` y se ejecutan con `pnpm test:ui`.

## Al agregar o cambiar un componente

1. Expón el componente y sus tipos desde `src/index.ts` solo si forma parte de la API compartida.
2. Agrega o actualiza un `*.test.tsx` junto al componente. Comprueba el comportamiento observable: semántica accesible, interacción, estado vacío/error y props o variantes relevantes. No pruebes clases internas salvo cuando sean el contrato visual mínimo de una variante.
3. Si agregas, renombras o retiras una exportación pública, actualiza `src/public-barrel.test.tsx`. Ese archivo protege el inventario completo del barrel; para tipos, agrega una aserción `expectTypeOf`.
4. Para overlays y navegación, comprueba apertura/cierre, foco y teclado. Para datos y fechas, conserva pruebas de flujos reales y límites de estado.
5. Ejecuta `pnpm test:ui`, `pnpm test:ui:coverage`, `pnpm --filter @cosmetics/ui type-check` y `pnpm --filter @cosmetics/ui lint`.

Los umbrales globales de cobertura están en `vitest.config.mts`; no se reducen para aceptar una modificación. Si un caso no es verificable en jsdom, documenta el motivo en el test y deja el comportamiento cubierto por la capa de regresión visual o E2E de su fase correspondiente.
