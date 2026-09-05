# Scheduler — clientes compartidos y deduplicación de la Fase 3

> Implementación en repositorio: 4 de septiembre de 2026  
> Migración: `20260904080000_add_scheduler_customers`  
> Estado operativo: no aplicada en development ni production; normalización e índice único parcial pendientes de evidencia real.

## Alcance

La Fase 3 reutiliza `Customer` como única identidad de cliente para Scheduler y POS. No crea una tabla paralela de personas, no importa clientes mock y no enlaza `RegistroCita` por coincidencia de nombre.

La migración es exclusivamente aditiva: agrega `Customer.phoneNormalized` nullable, `Customer.version`, perfiles y metadatos propios de Scheduler y el historial inmutable de fusiones. No ejecuta `UPDATE`, backfill, fusiones, seeds ni borrados sobre datos existentes. El índice único parcial de teléfono normalizado se añadirá en una migración posterior sólo cuando el diagnóstico real confirme cero duplicados y cero filas pendientes.

## Modelos

- `Customer` conserva nombre, teléfono, correo, procedencia y todas sus relaciones POS. `phoneNormalized` usa por ahora `DIGITS_ONLY_V1` como clave derivada de búsqueda/deduplicación; `phone` continúa siendo el dato canónico visible.
- `SchedulerCustomerProfile` agrega nombre preferido, idioma, preferencia de contacto, notas y versión optimista.
- `SchedulerCustomerAlias` conserva variantes de nombre y teléfonos anteriores. Un alias nunca crea una identidad por sí solo.
- `SchedulerCustomerEmail` admite correo principal, alternos, estado y verificación.
- `SchedulerCustomerFieldDefinition` versiona campos por comercio; `SchedulerCustomerFieldValue` conserva la versión de definición usada al capturar el valor.
- `SchedulerCustomerMergeEvent` conserva origen, destino, actor, motivo, snapshots y conteos de relaciones reasignadas.

`CustomerSource` y `CustomerPortfolioAssignment` se reutilizan directamente. Una alta de Scheduler exige una sucursal configurada y crea una asignación de cartera ligada a ella; no inventa procedencias ni vendedores.

## Normalización progresiva

Todos los escritores actuales de Customer en Scheduler y POS escriben simultáneamente `phone` y `phoneNormalized`. Scheduler normaliza con dígitos únicamente, toma un advisory lock transaccional por teléfono y revisa tanto la columna nueva como el teléfono legacy y los alias telefónicos. La restricción única legacy de `Customer.phone` sigue funcionando como defensa adicional durante la transición.

El diagnóstico general ahora reporta disponibilidad de la columna, filas pendientes, discrepancias, longitudes para revisión y grupos duplicados sin imprimir IDs, teléfonos o correos:

```bash
SCHEDULER_DIAGNOSE_ENVIRONMENT=development \
  pnpm --filter @cosmetics/api scheduler:diagnose
```

La materialización reejecutable inicia siempre en sólo lectura:

```bash
SCHEDULER_DIAGNOSE_ENVIRONMENT=development \
SCHEDULER_CUSTOMER_NORMALIZATION_MODE=DRY_RUN \
  pnpm --filter @cosmetics/api scheduler:customers:normalize
```

Después de revisar el agregado, development puede usar `SCHEDULER_CUSTOMER_NORMALIZATION_MODE=APPLY`. El comando sólo deriva `phoneNormalized`; no reescribe `phone`, no fusiona registros y emite un `AuditLog` agregado. Un `DRY_RUN` de production exige `SCHEDULER_DIAGNOSE_PRODUCTION_CONFIRMATION=PRODUCCION_SOLO_LECTURA`; `APPLY` exige además:

```text
SCHEDULER_CUSTOMER_NORMALIZATION_CONFIRMATION=PRODUCCION_NORMALIZAR_CLIENTES
SCHEDULER_BACKUP_PITR_CONFIRMED_AT=<fecha ISO UTC verificada>
```

No se debe crear el índice único parcial mientras `uniquePartialIndexReady` sea falso. Los grupos duplicados se resuelven uno por uno mediante la API de fusión y revisión humana; nunca por nombre.

## Endpoints

Todos viven bajo `/api/scheduler/clients`, exigen JWT compartido, aplican capacidades de `scheduler/clients` o `scheduler/settings/clients` y mantienen `{ success, message, data }`.

| Método     | Ruta                       | Capacidad                            | Uso                                                                            |
| ---------- | -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `GET`      | `/search`                  | `READ`                               | Búsqueda paginada por nombre, teléfono, correo y alias; mínimo dos caracteres. |
| `GET`      | `/sources`                 | `READ`                               | Procedencias canónicas de `CustomerSource`.                                    |
| `GET`      | `/field-definitions`       | `READ`                               | Definiciones vigentes de los comercios alcanzables.                            |
| `POST/PUT` | `/field-definitions[/:id]` | `ADMIN` en Configuración de clientes | Alta y nueva versión de campos personalizados.                                 |
| `POST`     | `/`                        | `WRITE`                              | Alta transaccional con perfil, alias, correos, procedencia, cartera y campos.  |
| `PUT`      | `/:id`                     | `WRITE`                              | Edición con `expectedVersion` y escritura dual del teléfono.                   |
| `GET`      | `/:id`                     | `READ` + autorización secundaria     | Expediente y metadatos propios de Scheduler.                                   |
| `GET`      | `/:id/visits`              | `READ` + autorización secundaria     | Historial POS enlazado canónicamente; no infiere `RegistroCita`.               |
| `GET`      | `/:id/financial-history`   | `READ` + autorización secundaria     | Tickets y pagos POS en modo estrictamente lectura.                             |
| `POST`     | `/merge`                   | `ADMIN` + autorización secundaria    | Fusión serializable, auditada y con control de versión.                        |

Los tokens para expediente, visitas y finanzas se envían en `x-scheduler-authorization`, ligados a `targetType = Customer` y al ID consultado. La fusión usa el propósito `CLIENT_MERGE`, `targetType = CustomerMerge` y `targetId = sourceId:targetId`; el token se consume una vez.

`@cosmetics/types` publica los DTOs y `@cosmetics/api-client` ofrece métodos para todos los endpoints. La pantalla local/mock de Clientes todavía no consume estos métodos: su sustitución progresiva corresponde a la Fase 9 y no debe habilitarse fuera del modo mock hasta conectar sus estados de carga, error y conflicto.

## Alcance y privacidad

- Las consultas materializan sucursales autorizadas. Una lista vacía no concede acceso global.
- El alcance profesional propio sólo encuentra clientes con una asignación vigente de cartera para ese empleado y una sucursal autorizada.
- Un usuario normal encuentra clientes relacionados con sus sucursales mediante cartera, tickets, citas POS, reservas legacy de Agenda, membresías o solicitudes de almacén.
- Expediente, visitas, finanzas y fusión usan autorizaciones secundarias de dos minutos y uso único.
- Los historiales financieros exponen importes como strings decimales y omiten PAN, CVV, datos de banda y secretos. `authority = POS_READ_ONLY` hace explícita la propiedad del dato.

## Semántica de fusión

La fusión se ejecuta en una transacción `SERIALIZABLE`, exige versiones actuales y rechaza clientes con identidades externas distintas. El destino conserva sus valores cuando ambos lados tienen información; completa valores ausentes desde el origen y guarda nombre/teléfono anteriores como alias.

Se reasignan cartera y transferencias, listas de precio, solicitudes, tickets, citas POS, membresías, reservas/eventos de Agenda y vouchers. Las colisiones de listas de precio, correos, alias y campos personalizados se deduplican de forma determinista; el destino gana ante dos valores para la misma definición. Los conteos y snapshots quedan en `SchedulerCustomerMergeEvent` y `AuditLog`. El origen se desactiva y conserva como identidad histórica; no se borra la fila Customer ni se alteran snapshots financieros.

Scheduler nunca actualiza `PosTicket`, `PosPayment` o proyecciones financieras para corregir importes. Una corrección debe ejecutarse en POS mediante sus operaciones de compensación; Scheduler sólo cambia el `customerId` compartido durante una fusión autorizada.

## Aplicación segura pendiente

1. Aprobar la evidencia de Fase 0 y confirmar backup/PITR.
2. Reconstruir todas las migraciones sobre PostgreSQL 16 desechable.
3. Ejecutar integración HTTP de `401/403`, alcance por sucursal, versiones y autorizaciones de uso único.
4. Probar dos altas concurrentes con el mismo teléfono y fusiones con todas las relaciones POS.
5. Aplicar la migración en development mediante el workflow protegido.
6. Ejecutar diagnóstico y normalización primero en `DRY_RUN`; conservar sólo el reporte agregado.
7. Aplicar la materialización, resolver duplicados revisados y repetir el diagnóstico.
8. Crear en otra migración el índice único parcial únicamente cuando la evidencia sea verde.
9. Promover a production sólo con aprobación protegida y respaldo confirmado.

No usar `prisma db push`, `migrate reset`, seeds operativos ni una base compartida para QA.

## Evidencia local

- schemas Prisma sincronizados y válidos;
- migración aditiva sin backfill ni datos operativos;
- contratos y cliente API tipados;
- lint y type-check de API y paquetes compartidos;
- 103 pruebas unitarias en 20 archivos, incluidas normalización, alcance, campos tipados y conflicto de identidad externa;
- build del API y type-check de Scheduler.

La reconstrucción, las pruebas HTTP/concurrencia y la ejecución de diagnóstico/backfill real siguen pendientes porque el workspace no dispone de PostgreSQL 16 desechable ni conectividad aprobada a los ambientes. La ausencia de esa evidencia impide aplicar el índice único y habilitar la UI real de Clientes.
