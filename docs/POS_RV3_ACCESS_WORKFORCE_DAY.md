# RV3 — Acceso, personal y jornada POS

> Fecha de implementación: 2026-09-09  
> Estado de partida: `d2eceb9e21271d1eaab0280b738b60b6c78caeef`  
> Referencia visual: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`  
> Estado: implementación y validación técnica completas; cierre formal pendiente por B01.

## Resultado

RV3 conecta los controles aprobados de acceso, Employees y jornada al backend
canónico. No añade alias a los diálogos que visualmente piden sólo código, no
descarga PIN, hashes o huellas al renderer y no oculta altas, puestos,
asignaciones ni delegaciones en modo API.

La única condición externa pendiente es B01. Close Day conserva literalmente el
texto “mock/simulación” de la referencia porque cambiarlo sin texto aprobado
rompería el baseline. La operación persiste en servidor; Producto debe autorizar
la redacción veraz antes de declarar RV3 formalmente cerrada.

## Operaciones conectadas

- Login, revalidación de sesión al recuperar foco/red y cada 15 segundos,
  bloqueo de credencial, terminal activa y cambio de sucursal con reingreso.
- Autorización master por código único con token opaco, corto, ligado a sesión,
  terminal, propósito y entidad, y consumible una sola vez.
- Alta/edición/estado de `Position`; edición de permisos y alcance por sucursal.
- Alta/edición/baja de `Empleado` con `positionId` y una única `PosCredential`.
  La baja transfiere cartera vigente a `PosCommercialCompany` dentro de la misma
  transacción y conserva los históricos.
- Asignación/revocación de código master compartido mediante entidad auditable y
  asignaciones nominales. El empleado de la sesión es siempre el actor efectivo.
- Cambio de alias/PIN propio desde My Account, verificando el PIN vigente y
  forzando reingreso.
- Identificación Clock In/Out por PIN en servidor, una asistencia abierta por
  empleado/sucursal/fecha y Clock Out idempotente.
- Apertura, omisión autorizada de conteo, conteo de cierre y Close Day mediante
  los diálogos existentes; sin `window.prompt` en los recorridos RV3.
- Salida sin Close Day que revoca sólo la sesión y sus autorizaciones, sin tocar
  jornada, asistencia ni outbox.

## Contratos HTTP añadidos

| Método y ruta | Propósito |
| --- | --- |
| `POST /api/pos/access/positions` | Crear un puesto canónico sin grants implícitos. |
| `PUT /api/pos/access/positions/:id` | Editar nombre, descripción y estado del puesto. |
| `POST /api/pos/access/employees` | Crear `Empleado` y credencial POS en una transacción. |
| `PUT /api/pos/access/employees/:id` | Editar identidad, puesto, estado y opcionalmente PIN. |
| `PUT /api/pos/access/master-delegations` | Asignar o revocar un código compartido a empleados nominales. |
| `PUT /api/pos/access/me/credential` | Rotar alias/PIN de la identidad autenticada. |
| `POST /api/pos/attendance/identify` | Resolver al empleado y su asistencia abierta sin exponer credenciales. |

`POST /api/pos/authorizations` conserva compatibilidad con alias cuando el
formulario aprobado lo incluye, pero el alias es opcional. Los formularios RV3
que visualmente piden sólo código envían únicamente `pin`; la búsqueda usa HMAC
con dominio separado y la confirmación usa bcrypt. Un código personal nunca
puede coincidir con un código delegado y viceversa.

## Persistencia y migración

La migración aditiva
`backend/api/prisma/migrations/20260909000000_add_pos_rv3_workforce_access`
añade:

- `Position.posDescription` para la descripción ya visible en Employees;
- `PosDelegatedMasterCode`, con bcrypt, huella HMAC, estado y versión;
- `PosDelegatedMasterAssignment`, con empleado y actores de alta/revocación;
- `PosMasterCredential.managedByDelegation`, para que revocar una delegación no
  desactive un perfil master nativo.

No se eliminan tablas, identidades ni datos históricos. Los dos schemas Prisma
permanecen idénticos. La cadena completa de 44 migraciones fue aplicada desde una
base vacía con `prisma migrate deploy`; no se usó `db push` ni `migrate reset`.

## Revocación e integridad

Los cambios de PIN/alias, puesto, estado, permisos, alcance de puesto/credencial,
delegación, estado de terminal o sucursal de terminal incrementan la versión de
credencial cuando corresponde y revocan las sesiones afectadas. También revocan
autorizaciones personales pendientes y consumen autorizaciones master pendientes
de esas sesiones. El renderer borra el grant local y vuelve al login al detectar
la revocación.

Close Day registra `closedByCredentialId`, cierre de asistencias y auditoría con
la credencial que emitió la autorización master. No atribuye automáticamente la
acción al operador que mantenía abierta la sesión.

## Validación ejecutada

- `@cosmetics/types`, `@cosmetics/api-client`, `@cosmetics/api` y
  `@cosmetics/pos`: type-check correcto.
- API: lint correcto; build correcto; 25 archivos y 135 pruebas unitarias.
- POS: build Vite del renderer, main y preload correcto.
- Prisma: schemas sincronizados y `prisma validate` correcto.
- PostgreSQL 16 Alpine desechable: 44/44 migraciones desde cero y suite HTTP con
  17/17 pruebas habilitadas; una prueba de carga Scheduler permanece omitida por
  su gate propio. El contenedor se destruyó al terminar.
- Regresión visual Chromium: 208/208 escenarios `PASS` contra RV0; 205 exactos y
  tres diferencias de antialiasing de 34, 26 y 11 píxeles bajo el umbral
  `0.000027`. No se regeneró ni modificó el baseline.

La suite HTTP cubre negativos 400/401/403, autorización ligada y de un solo uso,
cambio de permisos y alcance con revocación inmediata, límites por sucursal,
CRUD canónico, delegación y revocación, autoservicio de credencial, Clock Out
doble, salida sin cierre, cambio de sucursal y terminal revocada.

## Pendiente para el cierre formal

B01 requiere una decisión de Producto sobre el texto exacto de Close Day. Hasta
recibirla, la clasificación correcta es «RV3 implementada, cierre formal
pendiente», no «RV3 cerrada». La decisión no bloquea comenzar RV4 y no autoriza
alterar el visual ni representar una persistencia real como simulación en una
salida destinada a operación.
