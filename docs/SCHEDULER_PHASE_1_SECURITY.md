# Scheduler — seguridad, permisos y auditoría de la Fase 1

> Implementación en repositorio: 4 de septiembre de 2026  
> Migración: `20260904060000_add_scheduler_security`  
> Estado operativo: no aplicada en development ni production.

## Alcance

La Fase 1 establece la frontera de seguridad de Scheduler antes de conectar catálogos, clientes o citas reales. No crea comercios, profesionales, servicios, clientes, citas, configuraciones ni seeds operativos.

Scheduler usa el login compartido `POST /api/auth/login` y el JWT estándar de la plataforma. Después del login, el frontend consulta `GET /api/scheduler/bootstrap`; ya no existe la redirección local que simulaba una sesión.

## Modelos y migración

La migración es exclusivamente aditiva:

- agrega `Position.canManageSchedulerAccess` y `Position.schedulerSelfProfessionalOnly`, ambos en `false`;
- crea `PositionSchedulerScreenPermission`, con capacidades independientes de lectura, escritura, administración, exportación y excepción;
- crea `PositionSchedulerBranchAssignment`, sin conceder sucursales a ningún puesto existente;
- crea `SchedulerSecondaryCredential`, que guarda únicamente el hash bcrypt del código secundario;
- crea `SchedulerAuthorization`, con token SHA-256, propósito, pantalla, actor, alcance, caducidad y marcas de uso/revocación;
- extiende `AuditLog` con `application` y `actorUserId`; los registros anteriores reciben `application = POS` y las operaciones nuevas de este módulo usan `SCHEDULER`.

Ambas copias de `schema.prisma` contienen la misma estructura. La migración no ejecuta backfill, no modifica datos operativos y no concede permisos implícitos.

## Resolución de acceso

El servidor materializa los permisos y las sucursales en cada bootstrap:

1. `SUPER_ADMIN` recibe todas las capacidades y exactamente las sucursales activas (`ALL_ACTIVE`). Es el único alcance global.
2. Un puesto no global recibe sus asignaciones explícitas (`ASSIGNED`).
3. Si el puesto no tiene asignaciones, se usa únicamente la sucursal de `Usuario` o `Empleado` (`OWN_BRANCH`).
4. Sin una sucursal canónica, el alcance es `NONE`; nunca se interpreta como acceso total.
5. `schedulerSelfProfessionalOnly` liga el alcance profesional al `Empleado` de la cuenta. La relación con el perfil profesional se completará en la Fase 2.

Las pantallas y capacidades se validan en backend mediante `requireSchedulerCapability`. Los futuros endpoints de datos deben validar además cada `branchId` con el alcance materializado; ocultar controles en React no sustituye esa verificación.

## Pantallas y capacidades

El catálogo canónico vive en `@cosmetics/types` bajo `SCHEDULER_SCREEN_KEYS`. Incluye Agenda, Clientes, Servicios, Reportes, cada sección administrativa y cada sección de Configuraciones.

Capacidades:

- `READ`: consultar la pantalla o dataset;
- `WRITE`: crear o modificar operación ordinaria;
- `ADMIN`: administrar configuración sensible;
- `EXPORT`: descargar datasets;
- `EXCEPTION`: sobrescribir disponibilidad u otra regla segura por defecto.

Cualquier grant distinto de lectura exige también `READ`. Crear la migración no concede grants.

## Endpoints

Todos viven bajo `/api/scheduler` y requieren el JWT compartido:

| Método | Ruta                                | Uso                                                                                                                |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/bootstrap`                        | Usuario, permisos efectivos, sucursales explícitas, alcance profesional, estado del código secundario y modo mock. |
| `PUT`  | `/security/secondary-secret`        | Crear o rotar el código propio; exige contraseña actual y revoca autorizaciones pendientes.                        |
| `POST` | `/authorizations`                   | Emitir un token opaco ligado a propósito, pantalla, actor, sucursal/objetivo y dos minutos de vigencia.            |
| `POST` | `/authorizations/consume`           | Consumir el token una sola vez y con el mismo alcance.                                                             |
| `GET`  | `/access`                           | Catálogo administrativo de puestos, grants y sucursales visibles.                                                  |
| `PUT`  | `/access/positions/:id/permissions` | Reemplazar grants de un puesto. Sólo `SUPER_ADMIN` puede delegar `canManageSchedulerAccess`.                       |
| `PUT`  | `/access/positions/:id/branches`    | Actualizar asignaciones; un administrador no global no puede delegar sucursales fuera de su propio alcance.        |

Las respuestas conservan `{ success, message, data }`. `@cosmetics/api-client` expone métodos tipados para todos estos contratos.

## Autorización secundaria

Cada usuario configura un código numérico de 4 a 12 dígitos desde `Configuraciones → Código personal`, confirmando su contraseña compartida. El código nunca se devuelve por API ni se conserva en `localStorage`; el frontend elimina el documento legacy `keysar-scheduler-authorizations-settings` al abrir esta sección.

Después de cinco intentos fallidos, el código queda bloqueado por 15 minutos. Una autorización dura dos minutos, queda ligada al usuario y al propósito, y sólo puede consumirse una vez. Los propósitos admitidos son:

- ficha de cliente;
- historial de visitas;
- historial financiero;
- cambio de colores de estatus;
- excepción de disponibilidad;
- exportación sensible.

Emisión, consumo, denegaciones, rotación del código y cambios de acceso generan `AuditLog` con `application = SCHEDULER` y `Usuario` como actor. Los logs nunca incluyen contraseña, código o token.

## Mocks

Los módulos que aún dependen de fixtures sólo se renderizan cuando el backend confirma ambas condiciones:

```env
NODE_ENV=development
SCHEDULER_ALLOW_MOCKS=true
```

El valor por defecto es `false`. No existe una variable `NEXT_PUBLIC_*` para esta decisión. Desde la Fase 2, las secciones administrativas de sucursales, profesionales, servicios y recursos pueden abrir su catálogo persistente sin mocks; los demás módulos operativos permanecen cerrados hasta que sus fases conecten datos reales.

## Aplicación segura

Antes de aplicar la migración fuera de una PostgreSQL desechable:

1. cerrar y aprobar la evidencia pendiente de la Fase 0;
2. comparar `_prisma_migrations` con el repositorio;
3. confirmar backup y PITR del ambiente objetivo;
4. reconstruir todas las migraciones desde una base vacía;
5. aplicar en development con el workflow protegido;
6. crear grants y asignaciones explícitas; no usar seeds operativos;
7. validar `401`, `403`, manipulación de sucursales, caducidad y consumo único;
8. promover a production sólo con aprobación y `PRODUCCION_RESPALDADA`.

No usar `prisma db push`, `migrate reset` ni una base productiva para QA.

## Evidencia local

- schemas Prisma sincronizados y válidos;
- lint y build del API correctos;
- 93 pruebas unitarias del API en 18 archivos;
- type-check de `@cosmetics/types`, `@cosmetics/api-client`, API y Scheduler;
- lint de Scheduler correcto con advertencias preexistentes no bloqueantes;
- build de producción de Scheduler correcto, con rutas autenticadas dinámicas.

Quedan pendientes la reconstrucción de migraciones y las pruebas HTTP sobre PostgreSQL 16 efímero, porque no hay una base desechable disponible en este workspace. También sigue pendiente ejecutar/aprobar el diagnóstico real de Fase 0.
