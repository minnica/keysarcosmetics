# Runbook del piloto y despliegue del POS

Este runbook cierra la implementación técnica de la Fase 8 de
`PLAN_BACKEND_POS.md`. La activación real sigue siendo una decisión operativa:
ningún merge, workflow o migración autoriza por sí solo sustituir el proceso
vigente de una sucursal.

## 1. Límites y evidencia obligatoria

- El primer piloto se ejecuta únicamente en Supabase/Fly `development` y en una
  sola sucursal.
- PostgreSQL central conserva la verdad; SQLite/IndexedDB sólo conservan caché y
  outbox local.
- No ejecutar `prisma migrate reset`, `prisma db push`, seeds demo ni SQL de
  limpieza.
- No copiar PIN, secreto de terminal, JWT, grant offline ni datos de clientes a
  logs, tickets, screenshots o artefactos.
- La evidencia técnica válida es el resultado verde de `POS pilot gate`, con
  SHA, fecha operativa y reporte `PASS`. La evidencia operativa del segundo
  piloto es la aprobación de Agenda, Finanzas, Operación y Producto fuera del
  repositorio.
- Un reporte verde comprueba consistencia técnica; no reemplaza la revisión
  humana del ticket, caja, Envelope y preview de Payroll.

## 2. Preparación de development

1. Integrar el cambio en `develop` con los checks requeridos en verde.
2. Ejecutar `Deploy API` hacia `development`. Este workflow aplica
   `prisma migrate deploy`, despliega el SHA exacto y espera `/ready`.
3. Confirmar que el campo `release` de `/health` coincide con el commit desplegado.
4. Preparar una instalación del POS construida desde el mismo SHA con
   `VITE_POS_DATA_MODE=api`, `POS_API_URL` apuntando al API de development y el
   código/secreto de la terminal piloto sólo en el proceso principal.

El job `POS migrations and integration on PostgreSQL 16` vuelve a construir una
base vacía desde todas las migraciones y ejecuta la integración HTTP. Debe quedar
verde antes de consultar la base de development.

## 3. Provisionamiento único

Realizar este paso con una sesión `SUPER_ADMIN` y un cliente que no guarde
secretos en historial compartido. No usar seeds.

1. Ejecutar `pnpm --filter @cosmetics/api pos:diagnose` contra development y
   revisar relaciones incompletas.
2. Crear o actualizar el perfil POS de la sucursal mediante
   `PUT /api/pos/provision/branches/:id/profile`.
3. Crear explícitamente la credencial master mediante
   `PUT /api/pos/provision/credentials`.
4. Registrar la terminal con `POST /api/pos/terminals`, guardar el secreto en el
   almacén autorizado y activarla con `PATCH /api/pos/terminals/:id/status`.
5. Asignar los permisos del puesto piloto desde POS usando autorización master
   de un solo uso. No conceder permisos a puestos existentes de forma masiva.
6. Verificar login online, `/api/pos/auth/me`, sucursal fija y bootstrap offline.

El secreto de terminal sólo se entrega al registrar o rotar. Si se pierde, se
rota; nunca se recupera de la base ni se agrega a archivos versionados.

## 4. Recorrido paralelo obligatorio

Conservar el proceso vigente de la sucursal durante todo el piloto. Usar datos
operativos identificables por folio, no datos mock.

1. Abrir la jornada con conteo real, sin omisión master.
2. Registrar entrada de al menos un operador.
3. Crear al menos una venta pagada y verificar ticket, pagos, vendedores,
   inventario, notificación y voucher cuando corresponda.
4. Crear un apartado y registrar por lo menos un abono.
5. Registrar una cancelación o devolución autorizada y confirmar la proyección
   compensatoria.
6. Ejecutar un movimiento o conteo de inventario y revisar el saldo resultante.
7. Probar la recuperación offline:
   - obtener primero un bootstrap vigente;
   - retirar la red;
   - confirmar una operación permitida y comprobar que queda durable en el
     outbox;
   - cerrar y volver a abrir la aplicación;
   - restaurar la red y sincronizar;
   - comprobar una sola operación `SYNCED`, sin ticket/cobro duplicado.
8. Vender una membresía por unidad, comprobar su tarjetón `PENDING` en
   apartado, liquidarla y verificar una sola activación. Sin red, solicitar la
   próxima sesión y su asistencia: reserva y consumo deben mantener la
   dependencia, continuar `PENDING_SYNC` y no descontar saldo hasta que Agenda
   confirme.
9. Registrar al menos un cobro de crédito con MSI vigente y un ticket con
   participante de empresa; confirmar que la proyección humana no duplica la
   participación comercial.
10. Registrar el conteo final y cerrar la jornada con autorización master.
11. Comparar contra el control paralelo de la sucursal:

- venta, cobro por método, apartado, abono y compensación;
- movimientos y saldo de inventario;
- gasto y flujo neto si se capturaron gastos;
- filas proyectadas una sola vez en Envelope;
- venta disponible una sola vez en el preview vigente de Payroll.

No aprobar la fecha piloto con operaciones `PENDING`, `SYNCING`, `ERROR` o
`CONFLICT`. Los conflictos se conservan para auditoría y se resuelven antes de
repetir el gate; nunca se eliminan para obtener un reporte verde. Un conflicto
histórico de otra fecha permanece visible en la base, pero no invalida por sí
solo una nueva jornada conciliada.

## 5. Conciliación automatizada

El comando abre una transacción `READ ONLY` y no corrige datos:

```bash
POS_PILOT_BRANCH_ID='<id-sucursal>' \
POS_PILOT_BUSINESS_DATE='AAAA-MM-DD' \
POS_PILOT_MIN_TICKETS='1' \
POS_PILOT_REQUIRE_CLOSED_DAY='true' \
POS_PILOT_REQUIRE_COVERAGE='true' \
POS_PILOT_REQUIRE_OFFLINE_SYNC='true' \
pnpm --filter @cosmetics/api pos:reconcile
```

Valida:

- sucursal, perfil, ubicación, terminal, credenciales master y grants activos;
- líneas, vendedores, cobros, saldos y estados de cada ticket;
- suma por método entre `PosPayment`, `PosLegacySaleProjection`, `Venta` y
  `VentaDetalle`, incluida la señal negativa de reembolsos;
- aritmética antes/después de cada línea del ledger de inventario;
- notificación transaccional de cada ticket;
- snapshot de cierre contra tickets y movimientos de caja;
- secuencia contigua del outbox de servidor y ausencia de pendientes, errores o
  conflictos, incluidas sus dependencias explícitas;
- tarjetones, activación por liquidación, asistencias y vínculos con Agenda;
- pagos MSI, cartera y participantes de empresa, sin fuentes pendientes
  excluidas de reportes;
- cobertura mínima de tickets, abono, cancelación/devolución, inventario,
  recuperación offline, membresía, asistencia, Agenda, MSI y empresa.

La ejecución normal se hace desde **POS pilot gate** en GitHub Actions. Indicar:

- `release_sha`: SHA completo ya desplegado en API development;
- `branch_id`: ID de la única sucursal piloto;
- `additional_branch_ids`: vacío durante la primera pasada; después, IDs de las
  sucursales adicionales separados por coma para la expansión multi-sucursal;
- `business_date`: fecha operativa cerrada;
- `minimum_tickets`: mínimo acordado con Operación;
- `require_offline_sync`: mantenerlo en `true` para el cierre final;
- `operational_confirmation`: escribir `PILOTO_CONCILIADO` sólo después de la
  comparación y aprobación humanas.
- `cross_team_confirmation`: escribir
  `AGENDA_FINANZAS_OPERACION_PRODUCTO` sólo después de las cuatro aprobaciones.

El workflow comprueba nuevamente migraciones e integración en PostgreSQL 16,
identidad/readiness del API, estado de migraciones en Supabase development,
diagnóstico y conciliación. Publica únicamente conteos y diferencias; los
artefactos no contienen clientes, PIN, tokens ni secretos.

## 6. Promoción gradual

1. Conservar el enlace del workflow verde y la aprobación operativa.
2. Confirmar backup recuperable o PITR de producción en Supabase.
3. Promover `develop → master` siguiendo `docs/RELEASE_RUNBOOK.md`.
4. Ejecutar `Deploy API` hacia `production` y escribir
   `PRODUCCION_RESPALDADA` únicamente después de confirmar el respaldo.
5. Distribuir primero un solo build POS con `VITE_POS_DATA_MODE=api`; no
   habilitar simultáneamente todas las terminales.
6. Ejecutar smoke, revisar `/health`, `/ready`, errores y latencia durante al
   menos 15 minutos. Conciliar el primer cierre productivo antes de ampliar.
7. Habilitar terminales adicionales una sucursal a la vez y repetir la
   conciliación por fecha/sucursal.

## 7. Rollback

`VITE_POS_DATA_MODE` es una bandera de build del renderer:

- `api`: usa backend y repositorio offline autorizado;
- `mock`: vuelve temporalmente a la fixture local para aislar la operación.

Para volver a `mock` se debe distribuir el último build sano construido con esa
bandera o reinstalar el artefacto anterior. No convierte, copia ni elimina datos
mock o reales. Antes de cambiar de modo, sincronizar o conservar para soporte el
outbox local pendiente; no desechar una operación sin decisión operativa.

El rollback del API despliega el tag/commit anterior compatible. No se revierten
migraciones ni se borran tablas POS: cualquier corrección de esquema avanza con
otra migración aditiva. Restaurar backup/PITR sólo ante pérdida o corrupción
confirmada.

Registrar SHA, terminal, sucursal, fecha/hora, última secuencia local, operaciones
no conciliadas, impacto y decisión de recuperación. Rotar de inmediato cualquier
secreto que haya quedado expuesto durante el incidente.
