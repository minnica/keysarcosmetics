# Testbed visual de `@cosmetics/ui`

Esta app es un entorno interno de regresión visual. Renderiza únicamente datos y fechas fijas; no consulta API, base de datos, secretos ni autenticación, y no se despliega a Vercel.

Los canaries viven en `apps/e2e/visual/ui-testbed.visual.spec.ts`. Se capturan en Chromium con escritorio (`1440×900`) y móvil (`390×844`), locale `es-MX`, timezone `America/Mexico_City`, tema claro, movimiento reducido y fuentes listas antes de la captura.

## Ejecutar los canaries

```bash
pnpm test:ui:visual
```

El comando construye el testbed y levanta una instancia local solo durante Playwright. En una máquina nueva, instalar el navegador requerido una vez:

```bash
pnpm --filter @cosmetics/e2e exec playwright install chromium
```

## Aceptar un cambio visual intencional

1. Revisar el cambio en el Preview de la aplicación consumidora y confirmar que responde al cambio de producto buscado.
2. Actualizar los baselines explícitamente:

   ```bash
   pnpm test:ui:visual:update
   ```

3. Revisar los PNG modificados dentro de `apps/e2e/visual/*.spec.ts-snapshots/`, incluirlos en el mismo PR y explicar la intención en la revisión.
4. Ejecutar de nuevo `pnpm test:ui:visual` sin actualizar snapshots.

CI nunca actualiza snapshots: una diferencia no aceptada bloquea el check **UI regression canaries** y publica únicamente los artefactos de fallo durante siete días.
