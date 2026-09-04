# POS — agregados, exportaciones y escala de sucursales

> Contrato técnico y operativo de la Fase 13. Fecha de revisión: 2026-09-04.

## Principios

- La identidad normal de cliente y membresía usa exclusivamente `Customer.id`, `PosClientMembership.customerId` y `PosClientMembership.ticketId` (`purchaseTicketId` en DTO). No se une por nombre o teléfono.
- Cada respuesta declara `identityResolution.strategy = CANONICAL_IDS` y `legacyFallbackMatches = 0`. Una conciliación legacy futura deberá ser un proceso separado, auditable y medible; nunca un fallback silencioso de estos endpoints.
- Fechas de negocio y meses se interpretan con `America/Mexico_City`. Un periodo admite como máximo 366 días.
- Pantalla y exportación llaman al mismo constructor. La pantalla pagina hasta 100 filas; la exportación devuelve todo el conjunto filtrado y conserva el total completo.
- Costos, utilidad, margen y valor de inventario sólo se serializan para master o `REPORTS_COSTS`. La redacción final también inspecciona los nombres de columnas.

## Alcance común

`PosDataScope` contiene:

```text
timeZone
branchIds[]
branches[] -> id, name, active
portfolio -> ALL | OWN, employeeId
```

El middleware mantiene dos conjuntos distintos:

- `authorizedBranchIds`: sucursales activas en las que se permite operar.
- `authorizedHistoricalBranchIds`: las anteriores más sucursales inactivas que continúan asignadas explícitamente al puesto o credencial.

Una baja de sucursal se refleja en la siguiente revalidación de sesión. No se codifican nombres, cantidades máximas ni fallback a Polanco. Master conserva todas las sucursales activas; una sucursal inactiva requiere una asignación histórica explícita. Los selectores se prueban como conjuntos de 1, 10, 20 y 30 IDs.

## Membresías en superficies existentes

- Dashboard agrega `membershipCount` y `membershipSalesTotal` desde la relación del ticket de compra.
- Tickets usados por Receipts y Mis ventas incluyen `memberships[]` con `id`, folio, `customerId`, `purchaseTicketId`, artículo, nombre y estado.
- `GET /api/pos/memberships` acepta `customerId` y `purchaseTicketId` exactos, además de los filtros existentes. Esto permite que Customers y Receipts consulten sin heurísticas.
- Los listados/exportaciones respetan sucursales históricas y la cartera `currentSellerId` para usuario no master. Una operación sobre la membresía continúa limitada al alcance activo.
- `CUSTOMER_OVERVIEW` cuenta membresías por la relación `Customer.posMemberships`, nunca por snapshots de nombre/teléfono.

## Reporte mensual de procedencia

Clave: `CUSTOMER_SOURCE_MONTHLY`.

Puede solicitarse con `month=YYYY-MM` o con `dateFrom`/`dateTo`, nunca ambos. Sólo considera tickets `COMPLETED` con cliente canónico. Agrupa por `CustomerSource.id`; clientes sin fuente permanecen visibles como `source_id = null` y `Sin procedencia`.

- Clientes: clientes únicos de la procedencia.
- Participación: clientes únicos de la procedencia / clientes únicos del periodo.
- Venta completada: suma de tickets completados.
- Ticket promedio: venta completada / visitas.
- Clientes recurrentes: clientes con más de una visita en el periodo.
- Recurrencia: clientes recurrentes / clientes únicos de la procedencia.
- Visitas: tickets completados.
- Citas: citas reales asociadas a esos tickets; excluye `NO_APPOINTMENT`.

## Conciliación bancaria

Clave: `BANK_RECONCILIATION`.

La unidad de fila es `PosPayment`, no `PosTicket`. Admite `paymentMethodId`, `bankId`, `cardType`, `installmentMonths`, `operationKind`, vendedor, búsqueda, periodo y sucursales. Cada fila conserva `payment_id`, folio de ticket, folio de movimiento, banco/red/plazo snapshots, referencia y autorización limitada a cuatro caracteres.

`SALE` se presenta como `VENTA`; `LAYAWAY_PAYMENT` se clasifica como `ABONO` o `LIQUIDACION` según el acumulado canónico; `REFUND` es `COMPENSACION` negativa. Las métricas suman ingresos, compensaciones y neto por movimiento. `Venta comercial` usa tickets distintos y por eso un pago mixto no duplica la venta.

## Conteos por sucursal y consolidado

Clave: `INVENTORY_COUNTS`.

El dataset reúne artículos que aparezcan en conteos, movimientos o existencia dentro del alcance. Cada fila `SUCURSAL` conserva su `branch_id`; después se agregan filas `CONSOLIDADO` por artículo.

- Apertura: primer conteo de apertura disponible del periodo.
- Movimientos: neto de entradas menos salidas de esa ubicación durante el periodo.
- Existencia: saldo disponible vigente de esa ubicación.
- Cierre: último conteo de cierre disponible del periodo.

Una apertura, existencia o cierre ausente se devuelve como `null`; no se sustituye por cero. El movimiento neto sí comienza en cero. Costos y valor de inventario se omiten por completo sin `REPORTS_COSTS`.

## Exportaciones y auditoría

`GET /api/pos/exports/:key` requiere `REPORTS_PRINT`. Cada éxito crea `AuditLog` con acción `POS_REPORT_EXPORT`; la exportación de membresías usa `POS_MEMBERSHIP_EXPORT`. Se guarda actor, terminal, sucursal cuando es única, periodo, zona horaria, IDs de sucursal, cantidad de filas, permiso de costos y filtros.

La búsqueda libre no se guarda: sólo `searchApplied` y un SHA-256 permiten correlacionar ejecuciones sin copiar nombre o teléfono a la auditoría. El dataset entrega `scope`, y el renderer añade `Alcance autorizado` a PDF/XLSX. Las filas por sucursal incluyen `branch_id`; movimientos entre ubicaciones incluyen IDs de origen/destino.

## Migración y despliegue

`20260904040000_add_pos_reporting_indexes` es aditiva. Agrega índices sobre operación/fecha, cita/sucursal/estado, membresía/ticket y membresía/cliente/sucursal/fecha. No crea vistas materializadas, snapshots ni datos operativos.

Antes de desplegar:

1. Reconstruir todas las migraciones desde cero sobre PostgreSQL 16 desechable.
2. Comparar `/reports/:key` con `/exports/:key` usando los mismos filtros y verificar resúmenes iguales.
3. Probar cartera propia, costo redactado, sucursal no autorizada, sucursal inactiva asignada y conjuntos de 1/10/20/30 sucursales.
4. Verificar pagos mixtos, abono, liquidación y reembolso sin duplicar venta comercial.
5. Confirmar que el número de filas auditado coincide con el XLSX/PDF generado.

No ejecutar `db push`, `migrate reset` ni esta migración directamente sobre producción.
