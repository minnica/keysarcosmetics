# Offline ampliado y segundo piloto del POS

Contrato técnico y operativo de la Fase 14 de `PLAN_BACKEND_POS.md`. La
implementación está disponible en el repositorio; su activación requiere las
pruebas reales y aprobaciones descritas al final de este documento.

## Contrato offline v2

La migración aditiva `20260904050000_extend_pos_offline_pilot` agrega las
operaciones `AGENDA_MEMBERSHIP_RESERVATION` y `MEMBERSHIP_ATTENDANCE`, además de
`PosSyncOperation.dependencyIds` como JSONB con default vacío. No elimina ni
reescribe datos y refuerza el trigger inmutable para impedir cambios posteriores
de entidad o dependencias.

`PosOfflineBootstrapDto.schemaVersion` vale `2`. SQLite e IndexedDB rechazan una
credencial cifrada de otra versión y exigen un nuevo login online; no intentan
interpretar un catálogo incompatible. El bootstrap incluye únicamente:

- catálogo y paquetes publicados visibles en la sucursal;
- métodos, bancos, redes y plazos activos necesarios para cobrar;
- configuración de cortesía válida y la identidad comercial activa;
- membresías limitadas a la sucursal y cartera autorizada;
- slots `AVAILABLE` de Agenda de los siguientes 31 días como snapshot
  informativo;
- jornada, tickets, vouchers, fuentes, vendedores e inventario ya autorizados.

El bootstrap no concede permisos adicionales. Settings, altas/cambios de
catálogos, cartera, empresa, permisos y cierres comerciales siguen siendo sólo
online.

## Grafo de dependencias y verdad de Agenda

Cada envelope conserva `dependsOn`, que sólo admite UUID únicos distintos del
propio ID. Si dos operaciones dependientes viajan en el mismo lote, la
dependencia debe tener una secuencia anterior. El servidor exige que cada
dependencia pertenezca a la misma terminal y haya terminado `SYNCED` antes de
ejecutar el siguiente efecto.

El flujo ampliado es:

```text
cliente/ticket o membresía conciliados
  -> AGENDA_MEMBERSHIP_RESERVATION
    -> MEMBERSHIP_ATTENDANCE
```

Una reserva offline no incrementa capacidad local ni muestra confirmación. La
interfaz conserva la cita en `PENDING_SYNC`; al recuperar red, el backend vuelve
a validar membresía, cartera, sucursal, versión y capacidad con Agenda. Un éxito
reemplaza el ID local por el ID canónico y pasa a `RESERVED`. Un rechazo queda en
`CONFLICT`, con el payload cifrado intacto en el outbox.

La asistencia dependiente sólo se ejecuta después de confirmar la reserva. No
incrementa `usedSessions` en memoria mientras está offline. El servidor resuelve
el ID local de cita mediante la dependencia, consume una vez bajo el gate
transaccional de membresías y devuelve el tarjetón canónico.

Las membresías compradas en un apartado siguen `PENDING`; la liquidación online
u offline usa el mismo servicio de pagos y las activa una sola vez en el commit
canónico. No existe una operación local separada que pueda activar un tarjetón
sin liquidar el ticket.

## Reconciliación del segundo piloto

`pnpm --filter @cosmetics/api pos:reconcile` continúa en una transacción
PostgreSQL `READ ONLY` y ahora también comprueba:

- importe e identidad de participantes `SELLER`/`COMPANY`;
- activación por liquidación, saldo de sesiones y correcciones append-only;
- vínculos canónicos entre ticket, cliente, membresía, cita y Agenda;
- pagos con meses sin intereses;
- dependencias offline anteriores, de la misma terminal y ya sincronizadas;
- cero operaciones excluidas de reportes por seguir pendientes;
- cobertura de membresía, asistencia, cita, MSI y participante empresa.

El workflow `POS pilot gate` conserva la primera sucursal en `branch_id` y acepta
una segunda pasada mediante `additional_branch_ids`. Producción requiere ambos
recorridos verdes y las confirmaciones `PILOTO_CONCILIADO` y
`AGENDA_FINANZAS_OPERACION_PRODUCTO`; escribirlas no sustituye la evidencia
humana fuera del repositorio.

## Verificación previa a activar

1. Reconstruir todas las migraciones desde cero en PostgreSQL 16 desechable y
   ejecutar la integración HTTP con `RUN_DATABASE_TESTS=true`.
2. Ejecutar los contratos de Agenda contra sandbox, incluida capacidad agotada,
   dependencia reserva/asistencia, duplicados y conflicto conservado.
3. Probar en un instalable Electron: cierre/reapertura sin red, foco, navegación
   por teclado, tamaños desktop/móvil y ausencia de desbordamiento en las
   secciones 29, 30, 38 y 46.
4. Recorrer una sucursal completa; resolver cualquier `ERROR` o `CONFLICT` y
   obtener `PASS`.
5. Repetir para cada sucursal adicional y comparar reportes, Envelope, Payroll,
   Finanzas y Agenda.

No usar `prisma db push`, `migrate reset`, seeds demo ni una base compartida para
estas pruebas. Esta implementación no aplica migraciones ni consulta development
o producción por sí sola.

## Cierre local del repositorio

El 2026-09-04 quedaron verdes la sincronía y validación de ambos schemas Prisma,
lint y build del API, type-check del POS, build Vite de renderer/main/preload y
84 pruebas unitarias. La revisión estructural confirma las cuadrículas adaptables
5/3/2/1 de Membresías, 4/2/1 de citas, copia Teléfono → WhatsApp, paginación
por container query, Catálogo bajo Ventas y selectores directos de mes/año.

La prueba interactiva intentó iniciar el renderer local, pero el sandbox rechazó
el puerto `3005` con `listen EPERM`; abrir el build como `file://` no produjo un
renderer interactivo. Podman tampoco pudo crear su runtime por el filesystem de
sólo lectura. Por ello no se declaran ejecutados Electron, PostgreSQL 16,
integración HTTP, sandbox de Agenda ni los pilotos reales.
