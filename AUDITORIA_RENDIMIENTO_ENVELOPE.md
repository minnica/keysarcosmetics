# Auditoria de rendimiento - apps/envelope

> Actualizacion de implementacion: las fases recomendadas en este reporte ya fueron aplicadas en el codigo local. La auditoria conserva la evidencia del estado previo para trazabilidad.

## Estado de implementacion

- Fase 1 aplicada: `useVentas` acepta rango de fechas, `ventas` carga solo el rango visible, `Generar sobre` consulta solo el dia seleccionado, el dashboard consume `/api/envelope/reportes/dashboard` y `backend/api/fly.toml` queda con una maquina minima viva.
- Fase 2 aplicada: se agregaron indices en Prisma y migracion SQL aditiva `20260705000100_add_envelope_performance_indexes`.
- Fase 3 aplicada: las pantallas de reportes consumen endpoints agregados y los endpoints principales agregan en SQL/Postgres en lugar de mover ventas crudas al navegador.
- Validacion local: `pnpm --filter @cosmetics/api type-check`, `pnpm --filter @cosmetics/envelope type-check`, `pnpm --filter @cosmetics/api build` y `pnpm --filter @cosmetics/envelope build` pasaron correctamente.

## Resumen ejecutivo

El problema no viene de un solo punto. Hay dos cuellos principales:

1. **Cuello principal y progresivo: arquitectura de datos de `apps/envelope`.** La app descarga ventas completas sin paginacion ni filtros efectivos desde el primer render, y despues calcula dashboard, reportes y tablas en el navegador. Esto explica que "cada vez este mas lenta" conforme crece la base de datos.
2. **Cuello secundario de infraestructura: cold start en Fly.io.** El backend esta configurado para apagarse cuando no hay trafico. En una medicion al endpoint publico `/health`, el primer request tardo **6.596 s**; los siguientes requests calientes tardaron **0.190-0.207 s**. Esto explica lentitud al primer uso o despues de inactividad, pero no explica por si solo la degradacion progresiva con mas informacion.

Conclusion: **la causa dominante esta en como esta construida la carga/consulta de datos**, y Fly.io agrega una penalizacion fuerte en el primer request. Supabase puede estar participando si faltan indices o si la region de la BD esta lejos de Fly, pero con el codigo actual la BD no esta recibiendo consultas suficientemente acotadas ni agregadas.

## Alcance y limitaciones

- Se reviso `CLAUDE.md`, `apps/envelope`, `backend/api`, Prisma y `fly.toml`.
- Se hizo una prueba real no autenticada contra `https://cosmetics-api.fly.dev/health`.
- No se revisaron metricas internas de Vercel, Fly.io ni Supabase porque no hay credenciales/telemetria en el repo.
- No se midieron endpoints autenticados de produccion porque requieren token.
- No se ejecutaron cambios de codigo, migraciones ni comandos destructivos.

## Evidencia principal

### 1. `useVentas` descarga todas las ventas sin filtros ni paginacion

Archivo: `apps/envelope/src/hooks/useVentas.ts`

El hook hace `GET /api/envelope/ventas` sin enviar `fechaInicio`, `fechaFin`, `page`, `limit` ni cursor. Luego mapea todo el arreglo en memoria.

Referencia: lineas 60-67.

Impacto:
- La pantalla de ventas, dashboard y reportes cargan el historial completo.
- El payload crece con cada dia de operacion.
- El navegador paga costo de red, parseo JSON, memoria y CPU aunque el usuario solo vea un rango pequeno.

### 2. La pantalla de ventas filtra por fecha en cliente, despues de bajar todo

Archivo: `apps/envelope/src/app/(dashboard)/ventas/page.tsx`

La UI inicia con `saleRange` del dia actual, pero `useVentas()` ya trajo todas las ventas. El filtro por rango ocurre despues en React.

Referencias: lineas 154 y 196-199.

Impacto:
- Abrir ventas del dia actual cuesta lo mismo que traer todo el historico.
- El problema empeora de forma lineal con el volumen de ventas.

### 3. `useReportes` concentra catalogos y todas las ventas para todos los reportes

Archivo: `apps/envelope/src/hooks/useReportes.ts`

El hook carga sucursales, empleados, metodos de pago y `useVentas()`. El comentario confirma que las paginas de reportes hacen la agregacion en cliente.

Referencias: lineas 19-28.

Impacto:
- Cada reporte descarga datos crudos en vez de pedir al backend solo el agregado necesario.
- Se repite trabajo entre pantallas.
- Los endpoints de reportes del backend existen, pero las paginas actuales siguen usando `useReportes` y no esos endpoints agregados.

### 4. El dashboard recalcula muchas veces sobre el mismo arreglo completo

Archivo: `apps/envelope/src/app/(dashboard)/page.tsx`

El dashboard trae `useVentas()` y calcula dia, mes, ano, ultimos meses y progreso por vendedor usando filtros/reducciones repetidas sobre `registros`.

Referencias: lineas 40-43, 55-69, 84-115.

Impacto:
- Complejidad innecesaria en cliente.
- Con muchos vendedores, sucursales y ventas, el render se vuelve caro.
- El dashboard deberia consumir un endpoint agregado como `/api/envelope/reportes/dashboard`, no ventas crudas.

### 5. El backend devuelve ventas completas sin limite

Archivo: `backend/api/src/routes/envelope.routes.ts`

`GET /ventas` permite filtrar por fecha, pero si el frontend no manda fechas trae todo. Ademas incluye detalles, metodo de pago, sucursal y vendedor.

Referencias: lineas 555-570.

Impacto:
- Payload grande.
- Queries mas pesadas por joins/includes.
- Riesgo de timeout del cliente Axios, que esta configurado en 15 s.

### 6. Los reportes del backend tambien leen filas crudas y agregan en Node

Archivo: `backend/api/src/routes/envelope.routes.ts`

Los endpoints de reportes usan `prisma.venta.findMany(...)` con includes y despues agregan con `Map`, `reduce` y loops en Node.

Referencias:
- `detalle-metodo-pago`: lineas 712-733.
- `metodo-pago-por-dia`: lineas 747-761.
- `ventas-por-vendedor`: lineas 771-784.
- `ventas-por-vendedor-dia`: lineas 794-800.
- `total-general`: lineas 810-829.
- `dashboard`: lineas 845-866.

Impacto:
- Aunque se usaran estos endpoints desde el frontend, aun se estaria trayendo demasiada informacion desde Postgres hacia Node.
- Para reportes grandes, conviene agregar en SQL con `groupBy`/consultas agregadas o SQL raw controlado, no con todo el dataset en memoria.

### 7. Faltan indices explicitos para los patrones reales de consulta

Archivo: `backend/api/prisma/schema.prisma`

Los modelos `Venta` y `VentaDetalle` no tienen `@@index` en campos usados para filtros, joins y ordenamientos frecuentes.

Referencias: lineas 123-148.

Migracion inicial: `backend/api/prisma/migrations/20260522163417_add_envelope_models/migration.sql`

La migracion crea tablas y foreign keys, pero no crea indices explicitamente sobre `Venta.fecha`, `Venta.sucursalId`, `Venta.vendedorId`, `Venta.sesionId`, `VentaDetalle.ventaId` ni `VentaDetalle.metodoPagoId`.

Referencias: lineas 34-69.

Impacto:
- Filtros por fecha, vendedor, sucursal y metodo de pago pueden degradarse conforme crecen las tablas.
- En PostgreSQL, las foreign keys no garantizan automaticamente un indice util en la columna hija.

Indices recomendados:

```prisma
model Venta {
  // ...
  @@index([fecha])
  @@index([sucursalId, fecha])
  @@index([vendedorId, fecha])
  @@index([sesionId])
}

model VentaDetalle {
  // ...
  @@index([ventaId])
  @@index([metodoPagoId])
}
```

### 8. Fly.io esta configurado con cold starts

Archivo: `backend/api/fly.toml`

Configuracion actual:
- `auto_stop_machines = 'stop'`
- `auto_start_machines = true`
- `min_machines_running = 0`
- `memory = '512mb'`
- `cpu_kind = 'shared'`
- `cpus = 1`

Referencias: lineas 10-20.

Medicion real:

```text
Primer request a /health:
HTTP 200, time_total=6.596229 s

Requests calientes:
HTTP 200, time_total=0.207466 s
HTTP 200, time_total=0.190634 s
HTTP 200, time_total=0.199032 s
```

Impacto:
- La primera persona que abre la app despues de inactividad puede sentir una espera de varios segundos.
- Despues del arranque, la API base responde bien.
- Esto es un problema de infraestructura/configuracion, pero no es la causa principal de que reportes y ventas empeoren con el crecimiento de datos.

## Diagnostico por capa

### Frontend en Vercel

Probabilidad de cuello: **media-baja**.

Vercel probablemente no es el cuello principal. El problema visible en frontend es mas de implementacion: demasiados datos viajan al navegador y React calcula reportes completos. La app usa componentes cliente, lo cual esta bien para una app interna, pero no debe cargar historicos completos.

### Backend en Fly.io

Probabilidad de cuello: **media**.

Fly si genera latencia inicial por cold start. Una vez caliente, el endpoint `/health` responde cerca de 200 ms. El backend tambien puede volverse cuello porque hace agregaciones en Node y carga muchos registros con Prisma.

### Base de datos en Supabase

Probabilidad de cuello: **media-alta a futuro**.

No hay evidencia directa de saturacion porque no hay metricas de Supabase en el repo, pero el schema no tiene indices para los patrones de lectura mas importantes. Si la tabla de ventas ya crecio, los queries por fecha/vendedor/sucursal/metodo pueden estar haciendo mas trabajo del necesario.

Tambien hay que validar la region de Supabase. El backend Fly esta en `dfw`. Si Supabase esta en otra region lejana, cada query Prisma paga latencia adicional.

## Priorizacion de acciones

### Alta prioridad

1. Cambiar `useVentas` para aceptar filtros de fecha y/o paginacion.
   - En ventas, cargar por defecto solo `todayISO()` a `todayISO()`.
   - En reportes, pedir al backend solo el rango seleccionado.
   - Evitar traer historico completo en cada pantalla.

2. Mover reportes reales al backend y consumir esos endpoints desde el frontend.
   - Las paginas de reportes no deberian usar `useReportes()` + ventas crudas.
   - Cada reporte debe llamar a su endpoint con rango/mes/metodo/vendedor.

3. Agregar indices Prisma/Postgres.
   - `Venta.fecha`
   - `Venta.sucursalId + fecha`
   - `Venta.vendedorId + fecha`
   - `Venta.sesionId`
   - `VentaDetalle.ventaId`
   - `VentaDetalle.metodoPagoId`

4. Cambiar el dashboard para consumir `/api/envelope/reportes/dashboard`.
   - Idealmente optimizar ese endpoint para agregar en BD, no en Node.

### Media prioridad

5. Cambiar reportes backend de `findMany + Map/reduce` a agregaciones SQL.
   - Prisma `groupBy` puede servir para algunos casos.
   - Para reportes cruzados por fecha/sucursal/metodo, considerar SQL raw parametrizado.

6. Evitar refetch completo despues de crear/borrar ventas.
   - Actualmente `add`, `addBatch` y `remove` hacen `await refetch()`.
   - Mejor actualizar cache local del rango actual o invalidar solo la consulta activa.

7. Considerar React Query/SWR para cachear catalogos.
   - Sucursales, empleados, metodos, bancos y puestos se recargan en varias pantallas.
   - No es el cuello principal, pero reducira requests repetidos.

### Infraestructura

8. Para eliminar cold start en produccion:

```toml
[http_service]
  auto_stop_machines = 'off'
  auto_start_machines = true
  min_machines_running = 1
```

Tradeoff: sube costo, pero mejora primer acceso.

9. Validar region de Supabase.
   - Fly esta en `dfw`.
   - Supabase deberia estar lo mas cerca posible de `dfw` o se debe mover Fly a una region mas cercana a Supabase.

10. Revisar plan/limites de Supabase.
   - CPU, conexiones, slow queries, cache hit ratio e indices no usados.
   - Activar o consultar `pg_stat_statements` si esta disponible.

## Plan recomendado de implementacion

### Fase 1 - Quick wins sin cambio profundo

- Hacer que `useVentas` acepte `fechaInicio` y `fechaFin`.
- En `VentasPage`, pasar el rango actual al hook.
- En dashboard, dejar de usar `useVentas` completo y llamar al endpoint dashboard.
- Configurar Fly con `min_machines_running = 1` si la latencia inicial afecta operacion diaria.

Resultado esperado: mejora inmediata en carga inicial de ventas/dashboard y desaparicion del cold start.

### Fase 2 - BD e indices

- Agregar migracion Prisma aditiva con indices.
- Ejecutar `prisma migrate deploy` en ambientes correspondientes.
- Validar con `EXPLAIN ANALYZE` en consultas representativas.

Resultado esperado: rangos de fechas y reportes dejan de degradarse tan rapido con volumen.

### Fase 3 - Reportes escalables

- Reemplazar `useReportes` en reportes por llamadas especificas al backend.
- Cambiar endpoints de reportes para agregar en SQL.
- Retornar datasets ya agregados y pequenos.

Resultado esperado: reportes dejan de depender del tamano total del historico y dependen del rango solicitado.

## Veredicto final

La lentitud progresiva de `apps/envelope` esta causada principalmente por **cargas completas de datos y agregaciones en cliente/Node**, no por Vercel. Fly.io si esta causando una espera inicial por cold start, comprobada con una medicion real de 6.6 s, pero cuando la maquina esta caliente responde cerca de 200 ms.

La intervencion mas rentable es: **filtrar/paginar ventas desde el backend, agregar indices en Supabase y mover reportes/dashboard a consultas agregadas en servidor/BD**. Despues de eso, ajustar Fly para mantener una maquina viva si la operacion necesita respuesta inmediata durante todo el dia.
