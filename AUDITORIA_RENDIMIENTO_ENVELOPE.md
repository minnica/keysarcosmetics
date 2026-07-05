# Auditoria de rendimiento - apps/envelope

> Actualizacion: 2026-07-05. Esta auditoria reemplaza el diagnostico anterior y registra el estado posterior a las mejoras de rendimiento aplicadas.

## Resumen ejecutivo

Si hubo mejora real frente al estado anterior. Los principales cuellos detectados originalmente ya no estan presentes en el codigo actual:

- `useVentas` ya acepta `fechaInicio`/`fechaFin` y las pantallas principales no descargan el historico completo por defecto.
- La pantalla de ventas inicia en el dia actual y `Generar sobre` consulta solo el dia seleccionado al abrir el dialog.
- Dashboard y reportes ya consumen `/api/envelope/reportes/*` en lugar de bajar ventas crudas para agregarlas en React.
- Los reportes principales agregan en SQL/Postgres con `$queryRaw` parametrizado.
- Prisma ya tiene indices para los patrones principales de `Venta` y `VentaDetalle`.
- `backend/api/fly.toml` ya evita cold start con `auto_stop_machines = 'off'` y `min_machines_running = 1`.

La medicion publica no autenticada contra Fly confirma mejora de latencia base: `https://cosmetics-api.fly.dev/health` respondio `200` en ~0.20-0.28 s. En la auditoria anterior el primer request habia tardado 6.596 s.

## Evidencia verificada

### Frontend

- `apps/envelope/src/hooks/useVentas.ts` envia `fechaInicio`/`fechaFin` como query params.
- `apps/envelope/src/app/(dashboard)/ventas/page.tsx` pasa el rango visible a `useVentas` y arranca en `todayISO()`.
- `apps/envelope/src/components/GenerateEnvelopeDialog.tsx` llama `useVentas` solo con `enabled: open && canGenerateEnvelope` y rango de un dia.
- Las paginas de reportes llaman endpoints agregados: `detalle-metodo-pago`, `metodo-pago-por-dia`, `total-general`, `ventas-por-vendedor` y `ventas-por-vendedor-dia`.
- Build de produccion antes de las mejoras de esta ronda: reportes con First Load JS de ~449-452 kB por carga temprana de librerias de exportacion.
- Build de produccion despues de las mejoras de esta ronda: reportes con First Load JS de ~216-219 kB.

### Backend

- `GET /api/envelope/ventas` ahora valida rango, usa lookback seguro de 31 dias cuando faltan fechas, rechaza rangos mayores a 366 dias y soporta `limit`/`page` opcionales.
- `/api/envelope/reportes/dashboard` redujo los totales por sucursal de multiples consultas repetidas a una consulta agregada por periodos, mas una consulta separada para vendedores.
- Los reportes agregados usan SQL parametrizado con `Prisma.sql`/`$queryRaw`, no interpolacion manual.
- `backend/api/prisma/schema.prisma` y la migracion `20260705000100_add_envelope_performance_indexes` incluyen indices:
  - `Venta.fecha`
  - `Venta.sucursalId + fecha`
  - `Venta.vendedorId + fecha`
  - `Venta.sesionId`
  - `VentaDetalle.ventaId`
  - `VentaDetalle.metodoPagoId`

### Infraestructura

- Produccion Fly: `auto_stop_machines = 'off'`, `min_machines_running = 1`.
- Mediciones publicas realizadas:
  - `cosmetics-api.fly.dev/health`: `200`, ~0.200-0.278 s.
  - `cosmetics-api-dev.fly.dev/health`: `200`, ~0.271 s.
- No se auditaron metricas internas de Vercel, Fly.io ni Supabase porque no hay credenciales/telemetria en el repo.
- No se midieron endpoints autenticados de produccion porque requieren token real.

## Mejoras aplicadas en esta ronda

### Bundle frontend

- `apps/envelope/src/lib/report-export.ts` ya no importa `jspdf`, `jspdf-autotable` ni `xlsx` a nivel superior.
- Las exportaciones PDF/Excel cargan esas dependencias con imports dinamicos solo al hacer clic.
- `ventas-por-vendedor-dia` tambien usa imports dinamicos para su PDF especial.

Impacto esperado: bajar el First Load JS de las rutas de reportes y mover el costo de PDF/Excel al momento real de exportacion.

Resultado medido: las rutas de reportes bajaron aproximadamente 230 kB de First Load JS cada una.

### Cache de catalogos

- Se agrego `apps/envelope/src/hooks/catalog-cache.ts`.
- `useSucursales`, `useEmpleados`, `useMetodosPago`, `useBanks` y `usePositions` comparten cache por hook.
- Varias pantallas/componentes montados al mismo tiempo ya no disparan requests duplicados por el mismo catalogo.
- Las mutaciones siguen haciendo `refetch()` del catalogo afectado para mantener datos frescos.

### API y SQL

- `GET /api/envelope/ventas` quedo protegido contra llamadas sin rango que vuelvan a traer todo el historico.
- El dashboard consolida totales de dia, mes, anio y ultimos 6 meses en una sola consulta SQL por periodos.

## Areas de oportunidad restantes

1. **Medir con datos reales autenticados.** La auditoria local confirma estructura y build, pero faltan tiempos reales de endpoints de reportes con volumen productivo.
2. **Validar Supabase con `EXPLAIN ANALYZE`.** Conviene revisar planes para reportes por fecha/metodo/vendedor y confirmar que los indices se usan en produccion.
3. **Revisar region Supabase vs Fly.** Fly esta en `dfw`; Supabase deberia estar lo mas cerca posible o Fly deberia moverse a la region mas cercana a la BD.
4. **Paginacion UI para ventas historicas.** El backend ya soporta `limit`/`page`; la UI aun carga todo el rango visible. Si crecen mucho las ventas por rango, conviene paginar o virtualizar la tabla.
5. **Cache con stale time formal.** La cache actual es liviana y suficiente para evitar duplicados dentro de la sesion; si los catalogos crecen o se comparten entre apps, considerar React Query/SWR.
6. **Observabilidad.** Agregar logs/metricas de duracion por endpoint y slow queries para no depender de percepcion subjetiva.

## Plan de trabajo recomendado

### Prioridad alta

- Medir build despues de esta ronda y comparar First Load JS de reportes contra la base anterior (~449-452 kB).
- Probar exportacion PDF/Excel en todos los reportes despues del cambio a imports dinamicos.
- Medir endpoints autenticados de dashboard/reportes con datos productivos o staging representativo.
- Ejecutar `EXPLAIN ANALYZE` en Supabase para las consultas SQL de reportes mas usadas.

### Prioridad media

- Conectar la UI de ventas a paginacion opcional cuando el rango seleccionado pueda devolver miles de filas.
- Agregar instrumentacion sencilla en Express para registrar duracion, ruta, status y usuario/rol sin datos sensibles.
- Revisar si catalogos como empleados necesitan endpoint compacto para selects (`id`, `nombreCompleto`, `activo`) separado del CRUD completo.

### Prioridad baja

- Evaluar React Query/SWR si aparecen mas hooks con cache manual.
- Agregar budgets de bundle para evitar reintroducir dependencias pesadas en rutas de reportes.

## Validacion local

Comandos ejecutados durante esta auditoria:

```bash
pnpm --filter @cosmetics/envelope type-check
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/envelope build
pnpm --filter @cosmetics/api build
```

Estado inicial de validacion de esta ronda:

- `pnpm --filter @cosmetics/envelope type-check`: paso.
- `pnpm --filter @cosmetics/api type-check`: paso.
- `pnpm --filter @cosmetics/api build`: paso.
- `pnpm --filter @cosmetics/envelope build`: paso.

Resultado de build Envelope:

- Reportes antes: ~449-452 kB First Load JS.
- Reportes despues: ~216-219 kB First Load JS.
- Reduccion aproximada: ~230 kB por ruta de reporte.
