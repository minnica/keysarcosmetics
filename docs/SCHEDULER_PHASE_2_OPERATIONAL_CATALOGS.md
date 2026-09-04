# Scheduler — catálogos operativos, profesionales y recursos de la Fase 2

> Implementación en repositorio: 4 de septiembre de 2026
> Migración: `20260904070000_add_scheduler_operational_catalogs`
> Estado operativo: no aplicada en development ni production.

## Alcance

La Fase 2 agrega la base maestra con la que la siguiente fase de agenda podrá calcular disponibilidad. No crea citas, clientes, pagos, comisiones ni datos operativos, y no migra los documentos mock o `localStorage` del frontend.

Las identidades existentes continúan siendo canónicas:

- `Sucursal` recibe un `SchedulerBranchProfile` uno-a-uno;
- `Empleado` sólo se vuelve agendable mediante un `SchedulerProfessionalProfile` explícito;
- `CatalogItem` con `kind = SERVICE` recibe un `SchedulerServiceProfile` uno-a-uno;
- una clase es un servicio con `mode = CLASS` y capacidad explícita;
- una cabina, equipo o estación es `SchedulerResource`, nunca un profesional;
- “CITAS PENDIENTES” seguirá siendo una cola/estado de la futura agenda, no una persona ficticia.

## Migración y modelos

La migración es exclusivamente aditiva y no contiene `INSERT`, backfill, `UPDATE`, `DELETE`, renombres ni eliminaciones. Crea:

- `SchedulerCommerce` y `SchedulerBranchProfile`;
- `SchedulerProfessionalProfile` y asignaciones explícitas por sucursal;
- `SchedulerServiceProfile` y oferta explícita por sucursal;
- compatibilidades profesional/servicio por sucursal;
- `SchedulerSpecialty`, `SchedulerProfessionalGroup` y membresías;
- `SchedulerResource` y requisitos de recurso por servicio;
- `SchedulerAvailabilityRule` para trabajo y descansos recurrentes;
- `SchedulerAvailabilityException` para aperturas/cierres por fecha.

Los perfiles, asignaciones, recursos y reglas conservan estado lógico y vigencia. Los perfiles principales y recursos tienen `version` para control optimista. Las restricciones SQL rechazan duraciones/capacidades no positivas, intervalos fuera de `0..1440`, propietarios polimórficos ambiguos y vigencias invertidas.

Ambas copias de `schema.prisma` deben permanecer idénticas.

## Reglas de activación

- Crear las tablas no activa ninguna sucursal, persona o servicio.
- Un profesional activo requiere por lo menos una sucursal configurada y activa.
- Un servicio activo requiere duración positiva y por lo menos una sucursal configurada; `INDIVIDUAL` exige capacidad 1.
- No se puede activar un perfil sobre una `Sucursal`, `Empleado` o `CatalogItem` canónico inactivo.
- Una sucursal sólo puede habilitar `bookingEnabled` después de guardar su perfil y configurar horario general, al menos un profesional y un servicio activos.
- Los descansos deben estar contenidos en un periodo de trabajo y no pueden traslaparse.
- Una excepción puede cubrir todo el día o un intervalo válido, nunca un solo extremo.
- Un recurso no cambia de sucursal y una especialidad/grupo no cambia de comercio. Estos movimientos se representan con baja lógica y una nueva identidad para no reescribir relaciones históricas.
- Un administrador no global no puede modificar un perfil profesional o de servicio compartido con sucursales fuera de su alcance.

## Endpoints

Todos viven bajo `/api/scheduler/operations`, usan el JWT compartido y devuelven `{ success, message, data }`.

| Método     | Ruta                         | Uso                                                                                                                           |
| ---------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET`      | `/candidates`                | Sucursales, empleados y `CatalogItem SERVICE` existentes, con estado de perfil; cada bloque se filtra por pantalla y alcance. |
| `GET`      | `/catalog`                   | Catálogo operativo materializado para las sucursales autorizadas.                                                             |
| `POST/PUT` | `/commerces[/:id]`           | Alta/edición lógica de comercios; reservado a `SUPER_ADMIN`.                                                                  |
| `PUT`      | `/branches/:branchId`        | Crear o actualizar el perfil Scheduler de una sucursal canónica.                                                              |
| `PUT`      | `/professionals/:employeeId` | Activación explícita, sucursales y especialidades de un empleado.                                                             |
| `PUT`      | `/services/:catalogItemId`   | Duración, preparación, limpieza, modalidad, capacidad y sucursales de un servicio.                                            |
| `POST/PUT` | `/resources[/:id]`           | Recursos físicos, capacidad, exclusividad y estado lógico.                                                                    |
| `POST/PUT` | `/specialties[/:id]`         | Catálogo de especialidades por comercio.                                                                                      |
| `POST/PUT` | `/groups[/:id]`              | Grupos por sucursal e integrantes elegibles.                                                                                  |
| `PUT`      | `/professional-services`     | Compatibilidad profesional/servicio dentro de una sucursal común.                                                             |
| `PUT`      | `/resource-requirements`     | Recurso y unidades requeridas por un servicio ofrecido en esa sucursal.                                                       |
| `PUT`      | `/availability/rules`        | Reemplazo versionado lógico del horario recurrente de sucursal, profesional o recurso.                                        |
| `PUT`      | `/availability/exceptions`   | Reemplazo versionado lógico de excepciones por fecha.                                                                         |

`@cosmetics/types` define todos los DTOs y `@cosmetics/api-client` expone métodos tipados. `OperationalCatalogWorkspace` consume candidatos y catálogo reales en las secciones de comercios/sucursales, profesionales, servicios y recursos. Incluye estados de carga, vacío, error, reintento, sólo lectura y conflicto informado por API. En desarrollo con mocks explícitos se conserva el workspace visual anterior; los flujos administrativos avanzados restantes se conectarán por módulos en la Fase 9.

## Seguridad y auditoría

Las lecturas requieren `READ` en al menos una pantalla administrativa y omiten bloques para los que la sesión no tiene lectura. Las mutaciones requieren `ADMIN` en `locals`, `professionals`, `services` o `resources`, según el propietario.

Todas las consultas materializan `authorizedBranchIds`; un arreglo vacío nunca significa acceso global. `schedulerSelfProfessionalOnly` limita candidatos, catálogo y horarios al `Empleado` de la sesión. Los IDs manipulados fuera de alcance reciben `403` o una validación cerrada.

Cada mutación correcta agrega `AuditLog` con `application = SCHEDULER`, `Usuario` como actor, tipo/ID objetivo, sucursal cuando aplica y metadatos agregados sin nombres personales ni payloads sensibles.

## Orden de provisión en development

Después de aprobar Fase 0 y aplicar las migraciones mediante el workflow protegido:

1. crear el comercio;
2. crear perfiles de sucursal con `bookingEnabled = false`;
3. guardar el horario general de cada sucursal;
4. activar profesionales explícitos y asignar especialidades/sucursales;
5. activar servicios con duración/reglas y asignarlos a sucursales;
6. vincular profesionales con servicios por sucursal;
7. crear recursos y requisitos de servicio;
8. guardar horarios/excepciones de profesionales y recursos;
9. habilitar `bookingEnabled` sólo después de revisar el catálogo completo.

No usar seeds para este procedimiento y no copiar los mocks. La provisión debe reflejar decisiones operativas aprobadas.

## Aplicación segura pendiente

Antes de aplicar fuera de PostgreSQL desechable:

1. ejecutar y aprobar `scheduler:diagnose` en development;
2. resolver migraciones pendientes, drift o relaciones incompletas;
3. reconstruir todas las migraciones sobre PostgreSQL 16;
4. ejecutar pruebas HTTP de `401`, `403`, alcance, validación y `409` por versión;
5. confirmar backup/PITR del ambiente objetivo;
6. aplicar primero en development con `prisma migrate deploy` dentro del workflow protegido;
7. provisionar manualmente, verificar el catálogo y observar auditoría;
8. promover a production sólo con aprobación y `PRODUCCION_RESPALDADA`.

No usar `prisma db push`, `migrate reset` ni una base productiva para QA.

## Evidencia local

- schemas Prisma sincronizados y válidos;
- migración revisada como aditiva y sin datos operativos;
- contratos compartidos y cliente API tipado;
- lint, type-check y build del API;
- pruebas unitarias de normalización, zona horaria, vigencias, intervalos, descansos y propietarios;
- type-check de paquetes compartidos y Scheduler.
- pantallas administrativas base conectadas al backend con React Hook Form, Zod y componentes de `@cosmetics/ui`.

La reconstrucción de migraciones y la integración HTTP real permanecen pendientes: Podman no puede iniciar su runtime en este workspace (`/run/user/1000/libpod` es de sólo lectura) y no se usó ninguna base compartida como sustituto.
