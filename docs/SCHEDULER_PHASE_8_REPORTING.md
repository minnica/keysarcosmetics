# Scheduler — Fase 8: reportes y exportaciones

## Estado

La Fase 8 está implementada en el repositorio desde el 4 de septiembre de 2026. La migración es exclusivamente aditiva y no se aplicó a development ni
production desde este workspace. La conexión de las pantallas mock corresponde
a la Fase 9.

## Contrato HTTP

- `GET /api/scheduler/reports/:key` entrega una página del dataset.
- `GET /api/scheduler/exports/:key` entrega el mismo dataset completo para que
  el frontend produzca PDF/XLSX y registra `SCHEDULER_REPORT_EXPORT`.
- Los dos endpoints requieren `dateFrom` y `dateTo` (`YYYY-MM-DD`), aceptan un
  máximo de 366 días y usan intervalos `[inicio, fin)`.
- Los filtros compartidos son `branchIds`, `professionalProfileId`,
  `serviceProfileId`, `status`, `channel`, `source`, `search`, `page` y
  `pageSize`. El servidor rechaza filtros que no correspondan al reporte.
- `branchIds` siempre se materializa contra las sucursales de la sesión. Un
  conjunto vacío nunca significa acceso global. El alcance
  `selfProfessionalOnly` se vuelve a aplicar en el backend.

Claves disponibles:

| Clave                                      | Fuente primaria                                      | Pantalla/permiso                 |
| ------------------------------------------ | ---------------------------------------------------- | -------------------------------- |
| `APPOINTMENTS`, `CANCELLATIONS`, `NO_SHOW` | `SchedulerAppointment` o `RegistroCita`, nunca ambos | `scheduler/reports/reservations` |
| `OCCUPANCY`                                | horarios, excepciones, bloqueos y citas de Scheduler | `scheduler/reports/reservations` |
| `CUSTOMERS`, `SERVICES`, `PROFESSIONALS`   | identidades y citas canónicas                        | `scheduler/reports/summary`      |
| `SURVEYS`, `COMMUNICATIONS`                | respuestas y outbox de Scheduler                     | `scheduler/reports/summary`      |
| `COMMISSIONS`                              | políticas de Scheduler + tickets enlazados de POS    | `scheduler/reports/sales`        |
| `SALES`, `PAYMENTS`                        | `PosTicket`, `PosPaymentOperation` y `PosPayment`    | `scheduler/reports/sales`        |

`@cosmetics/types` publica `SCHEDULER_REPORT_KEYS`,
`SchedulerReportRequest` y `SchedulerReportDatasetDto`. El cliente compartido
expone `report()` y `exportReport()`.

## Fuentes y prevención de doble conteo

`CANONICAL` es el valor predeterminado. En reportes de citas puede solicitarse
`source=LEGACY`; esa opción consulta únicamente `RegistroCita`, etiqueta cada
fila como `ENVELOPE_LEGACY` y no intenta enlazar clientes, servicios o citas por
nombre. No existe una opción que sume automáticamente ambas fuentes. Así se
evita duplicar una operación durante la transición mientras el diagnóstico y
el corte histórico no estén aprobados.

Ventas, cobros y saldos provienen exclusivamente de POS. `Venta` y
`VentaDetalle` no participan, porque todavía no existe evidencia aprobada que
permita separar de forma general operaciones manuales de la proyección POS.
Las cifras de una cita sólo incluyen tickets unidos por IDs canónicos mediante
`SchedulerAppointment → PosAppointment → PosTicket`.

Cada dataset declara periodo, fuente, autoridad, sucursales, zonas horarias,
filtros, columnas, resumen y notas de procedencia. Los importes se serializan
como strings decimales.

## Ocupación y tiempo

La ocupación se calcula por sucursal, profesional y día local:

1. resuelve la jornada vigente de la sucursal;
2. la intersecta con la jornada vigente del profesional;
3. aplica descansos y excepciones de ambos niveles;
4. resta cierres y bloqueos generales o del profesional;
5. fusiona intervalos de servicios para no contar dos veces minutos
   traslapados;
6. divide minutos reservados o atendidos entre los minutos realmente
   disponibles.

Al reemplazar horarios o excepciones, el escritor cierra ahora la vigencia de
las filas anteriores con `effectiveTo`; no las deja como intervalos históricos
abiertos. Las filas inactivas antiguas sin límite confiable no se inventan ni se
backfillean: deben clasificarse con el diagnóstico antes de activar históricos.

Los límites se interpretan como `[inicio, fin)`. Cada perfil usa su zona IANA;
`America/Mexico_City` sólo se reporta como referencia para fuentes POS/legado
que ya manejan fecha de negocio sin perfil Scheduler.

## Comisiones, encuestas y comunicaciones

El reporte de comisiones usa las versiones vigentes de las políticas y sus
modalidades (`APPOINTMENT`, `ATTENDED_APPOINTMENT`, `SALES_PERCENTAGE` y
`BRANCH_SALES_TIER`). La venta atribuible requiere el vínculo canónico con POS.
El resultado es informativo: no crea movimientos ni sustituye la liquidación de
Nómina, que conserva la autoridad final.

Encuestas entrega conteos y promedios de preguntas `RATING`; omite comentarios
libres. Comunicaciones nunca expone destinos cifrados, payloads del proveedor o
errores internos; sólo estados y marcas de tiempo operativas.

## Seguridad y auditoría

- Pantalla requiere `READ`; exportación requiere `EXPORT` en la pantalla que
  corresponde a la clave.
- La exportación `CUSTOMERS` exige además una autorización secundaria de un
  solo uso `SENSITIVE_EXPORT`, ligada a `SchedulerReport/CUSTOMERS`. El consumo
  y el audit log se confirman en la misma transacción.
- Toda exportación registra actor, periodo, intervalo, fuente, sucursales,
  zonas, filtros seguros y número de filas. La búsqueda se registra sólo como
  SHA-256, nunca como texto.
- El dataset no incluye campos médicos, documentos privados, destinos de
  contacto, secretos ni datos de tarjeta.

## Migración

`20260904120000_add_scheduler_reporting_indexes` agrega únicamente índices a:

- transiciones de estado por estado/fecha;
- políticas de comisión por comercio/tipo/actividad;
- comunicaciones por sucursal/canal/estado/fecha;
- respuestas de encuesta por fecha.

No crea filas, no hace backfill y no modifica históricos. Los dos schemas
Prisma deben permanecer sincronizados.

## Activación pendiente

1. Cerrar y aprobar el diagnóstico de Fase 0.
2. Reconstruir las 43 migraciones en PostgreSQL 16 desechable.
3. Ejecutar pruebas HTTP de `401`, `403`, sucursal manipulada,
   `selfProfessionalOnly`, autorización sensible y paridad
   pantalla/exportación.
4. Comparar conteos canónicos, legado y POS con una muestra aprobada, sin
   combinarlos.
5. Probar cruces de medianoche, cambios históricos de offset, cierres,
   descansos, bloqueos y operación 24 horas.
6. Medir exportaciones representativas de 30 sucursales antes de fijar límites
   o habilitar la UI de Fase 9.
7. Aplicar la migración por el workflow protegido; nunca usar `db push`.

La ausencia de PostgreSQL desechable y de acceso autorizado a development en
este workspace impide afirmar que esos gates ya están cerrados.

## Verificación local

- Ambos schemas Prisma están sincronizados y validan.
- `@cosmetics/types` y `@cosmetics/api-client` pasan type-check.
- API pasa lint, type-check, build y 133 pruebas unitarias en 25 archivos.
- Scheduler pasa type-check y build; conserva únicamente sus advertencias
  preexistentes de imágenes y dependencias de hooks.
