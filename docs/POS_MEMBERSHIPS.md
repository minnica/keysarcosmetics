# Membresías POS

La Fase 10 incorpora membresías como un dominio transaccional del POS. PostgreSQL es la fuente de verdad; los datos mock no se migran y la migración `20260904010000_add_pos_memberships` no crea catálogos, tarjetones ni ventas de ejemplo.

## Catálogo y términos

- `CatalogItem.kind = MEMBERSHIP` reutiliza precio de lista, precio mínimo, costo, IVA, beneficios, activos y visibilidad por sucursal.
- El backend ignora el SKU capturado al crear una membresía y asigna `MEM-######` mediante `PosMembershipSkuSeq`. El SKU de una membresía existente no cambia.
- `membershipSessions` debe ser un entero mayor a cero. El umbral de renovación inicia en dos, no puede ser negativo ni superar el total de sesiones.
- Cada cambio de sesiones, umbral o condiciones crea una nueva fila `PosMembershipTerms`; las versiones anteriores son append-only y las compras conservan su versión como snapshot.
- Las membresías no crean `InventoryBalance`, `InventoryMovement`, adeudos ni devoluciones físicas. Una venta compuesta sólo por membresías tampoco requiere ubicación de inventario.

## Tarjetón y ciclo de vida

Cada unidad vendida crea un `PosClientMembership`. Una línea con cantidad dos produce dos folios diferentes y reparte el importe de la línea al centavo entre ambos. La clave única `(ticketLineId, unitOrdinal)` y el registro idempotente del ticket protegen los reintentos online y offline.

El tarjetón conserva cliente, teléfono, artículo/SKU, versión de términos, sesiones, importe, sucursal, vendedor original y vendedor actual. Los snapshots financieros y de identidad no se reescriben.

| Evento                          | Resultado                                              |
| ------------------------------- | ------------------------------------------------------ |
| Ticket `COMPLETED`              | Crea el tarjetón `ACTIVE` dentro del mismo commit.     |
| Ticket `LAYAWAY` con saldo      | Crea el tarjetón `PENDING`.                            |
| Abono que lleva el saldo a cero | Cambia exclusivamente tarjetones `PENDING` a `ACTIVE`. |
| Reintento de liquidación        | No agrega otra activación.                             |
| Última sesión consumida         | Cambia `ACTIVE` a `EXHAUSTED`.                         |
| Cancelación o devolución total  | Agrega transición a `CANCELED`; nunca elimina.         |

Los perfiles comerciales son `POTENTIAL`, `LOYAL`, `VIP` y `RECOVERY`. Los cambios de vendedor y estado agregan filas históricas; el vendedor original permanece como atribución del cierre y el vendedor actual define la cartera vigente.

## Asistencias y firma

`POST /api/pos/memberships/:id/attendance` recibe una cita local y un evento. Sólo `ATTENDED` consume; `CANCELED`, `NO_SHOW` y `RESCHEDULED` devuelven el tarjetón sin cambiar el saldo. El backend verifica cliente, sucursal y estado de la cita, bloquea la membresía con `FOR UPDATE` y aplica unicidad tanto a la cita como al número de sesión.

Los estados de firma son `PENDING`, `SIGNED` y `NOT_REQUIRED`. La API de esta fase rechaza `SIGNED` porque todavía no recibe evidencia cifrada. El modelo ya reserva consentimiento, referencia privada, SHA-256 y metadatos; esos campos no se incluyen en respuestas ni exports. El almacenamiento/captura real de firma debe introducirse con un servicio privado, cifrado y auditable.

## Seguridad y alcance

Todas las rutas requieren sesión POS vigente y uno de estos permisos:

- `MEMBERSHIPS_VIEW`: listado, detalle e historial de cierres.
- `MEMBERSHIPS_MANAGE`: perfil, vendedor, estado, asistencia y creación de cierre.
- `MEMBERSHIPS_PRINT`: dataset de exportación.

Además se solicita un token personal de dos minutos con propósito `MEMBERSHIPS_ACCESS`, ligado a credencial, terminal y sesión. Las lecturas lo envían en `X-POS-Personal-Authorization`; las mutaciones lo incluyen en el body y usan `Idempotency-Key` UUID.

Un operador no master sólo consulta tarjetones cuyo `currentSellerId` coincide con su empleado y cuya sucursal está autorizada. Master no usa un alcance implícito: debe enviar `branchIds` explícitos en listado, exportación y cierre. Filtros, seguimiento y paginación se aplican después del alcance, nunca en sustitución de él.

## Endpoints

| Método y ruta                                | Uso                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /api/pos/catalog/items?kind=MEMBERSHIP` | Catálogo y términos vigentes.                                                |
| `GET /api/pos/memberships`                   | Tarjetones paginados; admite texto, estado, perfil, fechas y `followUpOnly`. |
| `GET /api/pos/memberships/:id`               | Expediente con asistencias y cambios.                                        |
| `POST /api/pos/memberships/:id/profile`      | Perfilamiento comercial.                                                     |
| `POST /api/pos/memberships/:id/seller`       | Cambio de cartera con motivo.                                                |
| `POST /api/pos/memberships/:id/status`       | Activación/cancelación manual auditada.                                      |
| `POST /api/pos/memberships/:id/attendance`   | Conciliación de asistencia.                                                  |
| `POST /api/pos/memberships/export`           | Dataset completo ya autorizado.                                              |
| `POST /api/pos/memberships/closures`         | Nueva versión del cierre mensual.                                            |
| `GET /api/pos/memberships/closures/history`  | Historial inmutable por mes y alcance.                                       |

## Cierres comerciales

El cierre usa el primer día UTC del mes y un hash del conjunto ordenado de sucursales. Un advisory lock evita versiones concurrentes para el mismo mes/alcance. Cada ejecución agrega una versión y rankings por vendedor original: primero cantidad, después importe y finalmente nombre para desempate estable. Los tarjetones `CANCELED` se excluyen; una corrección posterior se refleja al crear otra versión, sin modificar las anteriores.

## Verificación y despliegue

```bash
pnpm --filter @cosmetics/api prisma:schemas
DATABASE_URL='postgresql://...' DIRECT_URL='postgresql://...' pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api lint
pnpm --filter @cosmetics/api test:unit
RUN_DATABASE_TESTS=true DATABASE_URL='postgresql://...' DIRECT_URL='postgresql://...' pnpm --filter @cosmetics/api test:integration
pnpm --filter @cosmetics/pos type-check
```

La integración debe ejecutarse sólo contra PostgreSQL desechable con todas las migraciones. Los triggers append-only impiden limpiar el historial de membresías a propósito. Para desplegar se usa `prisma migrate deploy`; nunca `db push`, `migrate reset` ni una base productiva como ambiente de pruebas.
