# Reglas comerciales POS: pagos, cortesías, cartera y participantes

Documento operativo de la Fase 12 de `PLAN_BACKEND_POS.md`, implementada en repositorio el 4 de septiembre de 2026.

## Alcance y despliegue

La migración aditiva `20260904030000_add_pos_commercial_rules` incorpora catálogos de cobro, snapshots de pago, productos y paquetes de cortesía, la identidad comercial de empresa, participantes generales de ticket y eventos de transferencia de cartera. No elimina columnas, no modifica `Bank` de Payroll y no crea clientes, tickets ni otra información operativa.

La migración no fue aplicada a development ni producción durante la implementación. Antes de desplegar debe reconstruirse toda la cadena sobre PostgreSQL 16 desechable y ejecutarse la integración con `RUN_DATABASE_TESTS=true`.

## Procedencia del catálogo inicial

- Bancos: 54 integrantes publicados por la [Asociación de Bancos de México](https://m.abm.org.mx/bancos-integrantes/index.htm), revisión del 2026-09-04. Cada fila conserva `sourceName=ABM` y `sourceReviewedAt=2026-09-04`.
- Contraste regulatorio: también se consultó el [padrón de Banca Múltiple de la CNBV](https://www.cnbv.gob.mx/Entidades-Autorizadas/Paginas/Banca-Multiple.aspx). No se fusionaron ambas listas porque asociación gremial y padrón supervisado tienen alcances y fechas de actualización diferentes.
- Redes: Visa y Mastercard. Fuente de política `KEYSAR POS`, revisada el 2026-09-04.
- Plazos: 1, 3, 6, 9, 12, 18 y 24 meses. Fuente de política `KEYSAR POS`, revisada el 2026-09-04.

`PosBank`, `PosCardNetwork` y `PosInstallmentOption` tienen versión, estado y procedencia. Cada alta, cambio, inactivación o reactivación agrega una fila append-only en su tabla `*Change`; nunca reescribe el snapshot de un pago anterior.

## Matriz de pagos

| Método          | Tipo de tarjeta | Red                | Banco              | Plazo               | Autorización                 |
| --------------- | --------------- | ------------------ | ------------------ | ------------------- | ---------------------------- |
| Tarjeta crédito | Requerido       | Requerida y activa | Requerido y activo | Requerido y vigente | Exactamente 4 dígitos        |
| Tarjeta débito  | Requerido       | Requerida y activa | Requerido y activo | Debe ser `null`     | Exactamente 4 dígitos        |
| Transferencia   | Debe ser `null` | Debe ser `null`    | Permitido          | Debe ser `null`     | Según la política del método |
| Efectivo/otro   | Debe ser `null` | Debe ser `null`    | No permitido       | Debe ser `null`     | Según la política del método |

Las reglas se ejecutan en `validatePayments` tanto para venta/pago mixto como para abono o liquidación. Una devolución crea una compensación que copia tipo, red, banco y plazo desde el movimiento original; no consulta el nombre vigente del catálogo. Las revisiones continúan siendo eventos append-only y no editan pagos confirmados.

El contrato estricto no acepta campos de PAN, CVV o banda. Además, referencia e institución se rechazan si contienen una secuencia de 13 a 19 dígitos que supera Luhn. En tarjeta y transferencia, el nombre de institución persistido se deriva del banco canónico; `authorizationLastFour` admite sólo cuatro dígitos y representa la autorización, nunca la terminación de la tarjeta.

## Cortesías

- `PosCourtesyProduct` admite productos `FACIAL` o `BODY` y conserva una versión append-only por cambio.
- `PosCourtesyPackage` contiene una o dos líneas ordenadas. El mismo producto puede ocupar ambas líneas.
- Cada versión del paquete guarda nombre, estado y snapshot de sus líneas.
- Inactivar un producto inactiva en la misma transacción todos los paquetes activos que lo usan y repara los defaults.
- Reactivar un producto no reactiva paquetes. La republicación del paquete es una acción explícita.
- Cuando un default deja de ser válido se elige el primer paquete activo válido por nombre. Si no existe ninguno, `required` pasa a `false` y el default queda `null`.
- El ticket conserva producto, tipo, paquete, versión y nombres como snapshot.

## Cartera e identidad comercial

`PosCommercialCompany` es independiente de `Empleado` y tiene nombre, número comercial, estado y versión. La migración crea únicamente la identidad técnica inicial `EMPRESA-001 / KEYSAR COSMETICS`.

Una fuente de cliente puede marcar `companyOwnedByDefault`. Al crear un cliente con esa fuente se abre una asignación vigente de empresa. Un ticket de cartera empresarial exige exactamente un participante `COMPANY` que coincida con la asignación vigente; una cartera no empresarial no puede agregarlo.

Al inactivar un vendedor, la API toma bloqueo sobre el empleado y cada cliente afectado dentro de una transacción `SERIALIZABLE`, cierra sólo sus asignaciones vigentes, crea las nuevas asignaciones de empresa y agrega `PosPortfolioTransferEvent` con motivo, actor y snapshots de vendedor/empresa. Reactivar al vendedor no restaura cartera ni reactiva su credencial POS.

`PosTicketParticipant` acepta `SELLER` o `COMPANY`. El servidor exige identidades únicas y que la suma de importes cierre al centavo contra el total autoritativo. Nombres, números, importes y porcentajes quedan append-only. `PosTicketSeller` permanece como proyección compatible sólo para personas: la porción de empresa no crea `Venta`, comisión ni vendedor ficticio.

## API y permisos

| Ruta                                                  | Permiso de escritura                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `GET /api/pos/settings/payment-catalogs`              | Lectura de venta, pagos, Settings o reportes                      |
| `POST/PUT /api/pos/settings/banks/:id?`               | `PAYMENTS_MANAGE`                                                 |
| `POST/PUT /api/pos/settings/card-networks/:id?`       | `PAYMENTS_MANAGE`                                                 |
| `POST/PUT /api/pos/settings/installment-options/:id?` | `PAYMENTS_MANAGE`                                                 |
| `GET/PUT /api/pos/settings/courtesy-configuration`    | `SETTINGS_MANAGE` para escritura                                  |
| `POST/PUT /api/pos/settings/courtesy-products/:id?`   | `SETTINGS_MANAGE`                                                 |
| `POST/PUT /api/pos/settings/courtesy-packages/:id?`   | `SETTINGS_MANAGE`                                                 |
| `GET/PUT /api/pos/settings/commercial-company`        | `SETTINGS_MANAGE` para escritura                                  |
| `PUT /api/pos/access/employees/:id/status`            | `EMPLOYEES_MANAGE` y autorización master `EMPLOYEE_STATUS_UPDATE` |
| `POST/PUT /api/pos/customers/sources/:id?`            | `CUSTOMERS_MANAGE`                                                |

Los contratos públicos están en `packages/types/src/pos.ts`; `packages/api-client` expone todas las operaciones anteriores. La sustitución completa del estado incorporado del renderer y la publicación de estos catálogos en el bootstrap offline pertenecen a la Fase 14. Hasta entonces, Settings y cambios de cartera permanecen exclusivamente online.

## Validación previa a despliegue

```bash
DATABASE_URL='postgresql://...' DIRECT_URL='postgresql://...' \
  pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/api prisma:schemas
pnpm migrations:review -- origin/develop
pnpm --filter @cosmetics/api lint
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api test:unit
pnpm --filter @cosmetics/api build
RUN_DATABASE_TESTS=true DATABASE_URL='postgresql://...' DIRECT_URL='postgresql://...' \
  pnpm --filter @cosmetics/api test:integration
```

No usar `prisma db push`, `migrate reset` ni una base compartida/productiva para estas comprobaciones.

El cierre local del 2026-09-04 terminó con schemas sincronizados y válidos, revisión de seguridad de migraciones, lint y type-check de types/API client/API/POS, 75 pruebas unitarias, build del API y build Vite de renderer/main/preload. El empaquetado instalable llegó hasta `electron-builder`, pero no pudo descargar el binario de Electron por la red restringida. PostgreSQL/HTTP y concurrencia permanecen como gate previo al despliegue.
