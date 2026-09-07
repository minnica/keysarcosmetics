# Scheduler RV7 — restauración de Reportes y exportaciones

> Fecha: 6 de septiembre de 2026
> Rama: `feature/scheduler`
> Base inspeccionada: `ecd2f63`
> Estado: implementación local completa; validación visual y recorridos HTTP/PostgreSQL pendientes por B06.

## Resultado

RV7 sustituye la tabla genérica de `ApiReportsWorkspace` por una presentación alineada con la referencia `e9077dd`: cabecera oscura, jerarquía editorial, filtros comunes, tarjetas, series, rankings, pestañas, tablas y navegación a desgloses. La capa operativa continúa usando exclusivamente `schedulerApi.report` y `schedulerApi.exportReport`; los workspaces históricos basados en `mock-report-data`, `mock-reservation-report-data`, `survey-report` y `reminder-report` no se montan en modo normal.

Las páginas de Resumen, Reservas, Historial, Rendimiento, Ventas, Encuestas y Recordatorios ya usan vistas específicas. Locales, Mensajería móvil, Métricas y Servicios dejaron de redirigir. Servicios por local y Prestadores por local disponen ahora de rutas dinámicas con `branchId`; el alias histórico `opatra-mexico` sólo conduce al selector de Locales porque no es un ID canónico.

## Matriz de presentación y fuentes

| Vista                 | Datasets canónicos                                                    | Uso visible                                                                                          |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/reportes`           | `CUSTOMERS`, `SERVICES`, `PROFESSIONALS`, `SURVEYS`, `COMMUNICATIONS` | clientes con citas, servicios, profesionales, encuestas, comunicaciones, tendencia/ranking y detalle |
| `/reportes/ventas`    | `SALES`, `PAYMENTS`, `COMMISSIONS`                                    | tickets, venta vigente, cobrado, pagos netos, detalle POS y comisión estimada                        |
| `/reportes/reservas`  | `APPOINTMENTS`, `OCCUPANCY`, `CANCELLATIONS`, `NO_SHOW`               | reservas, estados, ocupación, tendencia, distribución y accesos a desgloses                          |
| Historial             | `APPOINTMENTS`                                                        | búsqueda y estado aplicados en servidor; tabla completa del periodo                                  |
| Rendimiento           | `PROFESSIONALS`, `SERVICES`, `OCCUPANCY`                              | rendimiento por profesional/servicio y ocupación                                                     |
| Locales               | `APPOINTMENTS`, `OCCUPANCY`                                           | agrupación por `branch_id`/Sucursal y enlaces canónicos por local                                    |
| Mensajería móvil      | `COMMUNICATIONS`                                                      | canal, cola, enviado, entregado, leído y fallido sin equiparar estados                               |
| Métricas              | `APPOINTMENTS`, `OCCUPANCY`                                           | estados observados y ocupación real; no se extrapolan puntos ausentes                                |
| Servicios             | `SERVICES`                                                            | citas, asistencia, cancelaciones, no show y venta vinculada                                          |
| Servicios por local   | `SERVICES` + `branchIds=[branchId]`                                   | mismo contrato acotado por alcance y URL canónica                                                    |
| Prestadores por local | `PROFESSIONALS`, `OCCUPANCY` + `branchIds=[branchId]`                 | profesionales y ocupación acotados por local                                                         |
| Reporte de encuestas  | `SURVEYS`                                                             | respuestas y calificación; comentarios y datos médicos excluidos                                     |
| Recordatorios         | `COMMUNICATIONS`                                                      | consulta de outbox por canal; la pantalla no activa automatizaciones                                 |

Cada request de pantalla recorre todas las páginas de 100 filas hasta `total`. Las tarjetas consumen `summary`, calculado por el backend sobre el resultado completo; series, rankings y tablas consumen la unión de páginas. No se usa la primera página como total ni se llama a `/exports` para conceder lectura a quien no tenga `EXPORT`.

## Periodo, alcance y permisos

- Los filtros comparten `dateFrom`, `dateTo`, `branchIds`, búsqueda y, donde aplica, estado o canal.
- Las fechas conservan el intervalo contractual `[dateFrom, dateTo + 1 day)` y las zonas informadas por sucursal.
- La sucursal de una ruta dinámica debe existir en `bootstrap.authorizedBranches`; de lo contrario se muestra un error cerrado y no se consulta otra sucursal.
- `schedulerReportScreen` sigue siendo la autoridad de permisos: reservas para `APPOINTMENTS/OCCUPANCY/CANCELLATIONS/NO_SHOW`, ventas para `SALES/PAYMENTS/COMMISSIONS` y resumen para el resto. Una vista compuesta muestra sólo datasets con `READ` real; no amplía permisos para completar el diseño.
- Rendimiento y Prestadores combinan fuentes que pertenecen a Resumen y Reservas. Para ver todos sus paneles la sesión necesita ambas lecturas; con una sola capacidad se presenta únicamente el subconjunto autorizado. Esta diferencia es intencional y evita ensanchar el backend desde la UI.

## Exportaciones

El diálogo permite CSV, XLSX y PDF. En los tres casos primero solicita `GET /api/scheduler/exports/:key`; por tanto el servidor reconstruye el conjunto completo, vuelve a validar `EXPORT` y registra `SCHEDULER_REPORT_EXPORT`. XLSX crea hojas Resumen y Detalle; PDF usa tabla horizontal cuando el número de columnas lo requiere; CSV conserva BOM UTF-8.

`CUSTOMERS` solicita el código personal en un campo `password`, emite `SENSITIVE_EXPORT` ligado a `SchedulerReport/CUSTOMERS` y consume el token una sola vez. Se retiró `window.prompt`. Los archivos se renderizan localmente después de recibir el dataset autorizado; no contienen rutas privadas, destinos cifrados ni errores internos del proveedor.

## Diferencias y límites

- La referencia no contenía `/reportes/ventas`; RV7 la trata como extensión y aplica el mismo lenguaje visual sin afirmar paridad histórica.
- El Resumen aprobado mencionaba reservas, ocupación y ventas, pero el permiso/dataset de Resumen actual no los concede. Esos indicadores viven en sus módulos autorizados; no se duplican ni se inventan en `/reportes`.
- Comparación contra periodo anterior, cumpleaños, cuota de mensajería, conversaciones y respuestas por pregunta no existen en los doce datasets. La UI no calcula sustitutos con fixtures.
- `SURVEYS` publica calificación agregada por respuesta, no categorías/preguntas ni comentarios libres. `COMMUNICATIONS` no publica ingresos atribuidos ni motivo interno de fallo. Estos límites permanecen visibles en notas de fuente cuando el backend las entrega.
- Las fuentes canónica y legado no se mezclan. La UI usa `CANONICAL`; `RegistroCita` no participa en totales y POS se vincula sólo por IDs canónicos, evitando doble conteo por nombre o teléfono.

## Archivos principales

- `apps/scheduler/src/components/api/ApiReportsWorkspace.tsx`
- `apps/scheduler/src/components/reports/RestoredReportsWorkspace.tsx`
- `apps/scheduler/src/lib/scheduler-report-presentation.ts`
- `apps/scheduler/src/lib/scheduler-report-export.ts`
- rutas bajo `apps/scheduler/src/app/(dashboard)/reportes/`
- `apps/scheduler/tests/scheduler-report-presentation.test.cjs`
- `apps/e2e/development/scheduler-reports.visual.spec.ts`
- `apps/e2e/development/fixtures/scheduler-reports.ts`

## Validación ejecutada

```bash
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler test
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler build
pnpm --filter @cosmetics/e2e type-check
pnpm --filter @cosmetics/e2e lint
pnpm --filter @cosmetics/e2e exec playwright test \
  --config=playwright.development.config.ts \
  --project=scheduler-development --list
```

Resultados: type-check correcto; 9 suites unitarias correctas; lint correcto con advertencias históricas fuera de RV7; build correcto con 21 páginas; type-check/lint E2E correctos; Playwright descubre los dos casos RV7 y sus dependencias de sesión.

La actualización automática del lockfile no pudo ejecutarse porque el resolvedor offline intenta localizar `turbo@2.10.5`, versión que el registro configurado no ofrece. El importador de Scheduler se actualizó de forma determinista con las versiones ya presentes en `pnpm-lock.yaml` (`xlsx@0.18.5`, `jspdf@4.2.1`, `jspdf-autotable@5.0.8`). No se descargaron paquetes.

## Evidencia pendiente

Ejecutar en un host con servidor y Chromium:

```bash
E2E_SCHEDULER_REPORTS_VISUAL=true \
pnpm --filter @cosmetics/e2e exec playwright test \
  --config=playwright.development.config.ts \
  --project=scheduler-development \
  scheduler-reports.visual.spec.ts
```

El runner adjunta Resumen, Reservas, Ventas, Locales y Servicios a `1366×768`, e Historial a `390×844`. Aún faltan comparación contra `docs/artifacts/scheduler-visual-baseline/e9077dd/`, paridad HTTP pantalla/exportación, autorización sensible, permisos parciales, ausencia de doble conteo y volumen sobre PostgreSQL 16 desechable. No usar development compartido o producción como sustituto.
