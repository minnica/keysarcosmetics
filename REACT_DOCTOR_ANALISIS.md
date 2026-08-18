# Analisis de React Doctor

Fecha: 2026-07-05

Comando ejecutado:

```bash
npx -y react-doctor@latest . --verbose --no-telemetry
```

Resultado general:

- React Doctor v0.7.1.
- 132 archivos escaneados.
- 115 warnings totales.
- Seguridad: 8 warnings.
- Bugs: 29 warnings.
- Performance: 21 warnings.
- Accesibilidad: 1 warning.
- Maintainability: 56 warnings.
- Reporte completo temporal: `/tmp/react-doctor-fae241ce-f342-4e8d-8d96-0a43efc05555`.

## Criterio de priorizacion

Priorizar cambios seguros que no alteren UX ni arquitectura publica. No aplicar fixes amplios sin revisar impacto.

## Bugs reales

- Seguridad: `next@14.2.4` en 7 paquetes. React Doctor lo marca por advisories de React Server Components. Es real, pero subir a Next 15/16 no es cambio pequeno ni sin arquitectura; requiere matriz de build/runtime.
- Seguridad: JWT en `localStorage`: `apps/envelope/src/app/(auth)/login/page.tsx:56`; el interceptor tambien lo lee desde `packages/api-client/src/index.ts`. Es real, pero corregir bien implica cookies `HttpOnly` y contrato backend.
- Botones sin `type`: `packages/ui/src/components/ui/data-table.tsx:143` y boton movil en `apps/envelope/src/components/layout/AppSidebar.tsx:193`. Cambio seguro.
- `key={index}` en formularios/rangos dinamicos de Payroll: `apps/payroll/src/app/(dashboard)/esquemas/page.tsx:481`. Riesgo real si se eliminan o reordenan rangos.

## Performance importante

- `recharts` cargado eagerly en dashboard: `apps/envelope/src/app/(dashboard)/page.tsx:4`. Buen candidato para `next/dynamic`.
- `Intl.NumberFormat` / `Intl.DateTimeFormat` reconstruido en helpers compartidos, especialmente `apps/payroll/src/lib/format.ts` y utils/report export. Seguro hoistear.
- Context provider values inline: `apps/envelope/src/lib/store.tsx:103`, `apps/payroll/src/components/payroll/bonus-catalog-context.tsx:36`. Seguro con `useMemo` / `useCallback`.
- Inicializadores `useState(todayISO())` / `getFullYear()` son micro-performance; seguros, pero baja prioridad.

## Accesibilidad

- Texto de 11px en etiqueta de grafica: `apps/envelope/src/app/(dashboard)/page.tsx:398`. Unico hallazgo a11y. Seguro subir a 12px si no rompe layout.

## Deuda tecnica opinable

- Componentes gigantes: `ventas`, `accesos`, `GenerateEnvelopeDialog`, `esquemas`, etc. Refactor util, pero no prioritario si el objetivo es evitar cambios de UX/arquitectura.
- `prefer-useReducer` en `apps/envelope/src/app/(dashboard)/ventas/page.tsx:149`: opinable, refactor amplio.
- `unused-export`, `unused-file`, `unused-dependency`: limpieza valida, pero hay que confirmar por paquete porque el reporte muestra rutas relativas.
- `only-export-components` en `badge/button`: afecta Fast Refresh, no runtime.
- `renderAmount()` llamado inline: deuda de legibilidad, no bug si no contiene hooks/estado.

## Falsos positivos o baja senal

- `selectedPositionId`, `draftCanManageAccess`, `draftPermissions` en `apps/envelope/src/app/(dashboard)/accesos/page.tsx:155`: parecen estado editable/sincronizado, no simple derivacion.
- `refreshSession` faltante en deps: funcion estable con `useCallback([])`; anadirla seria inocuo pero no bug practico.
- `nextjs-no-native-script` en `apps/envelope/src/app/layout.tsx:29`: el script anti-flash es intencional antes del primer render; `afterInteractive` empeoraria UX.
- `key={i}` en lista estatica de meses: `apps/envelope/src/app/(dashboard)/reportes/metodo-pago-por-dia/page.tsx:203`. Estatica, sin reorder.
- `<img>` para logo SVG en sidebar/layout: bajo impacto; Next Image no aporta mucho para ese caso.

## Orden sugerido de cambios seguros

1. Agregar `type="button"` a botones no submit.
2. Hoistear formatters `Intl`.
3. Convertir lazy state initializers triviales: `useState(() => todayISO())`, `useState(() => new Date().getFullYear())`, etc.
4. Memoizar valores de context providers.
5. Revisar keys dinamicas en Payroll.
6. Evaluar `next/dynamic` para `recharts`.

## Cambios que deben ir separados

- Upgrade de Next por advisory RSC.
- Migracion de auth desde `localStorage` a cookies `HttpOnly`.
- Refactors grandes de componentes o `useReducer`.
