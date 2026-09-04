# Plan por fases: backend y bases de datos de `apps/scheduler`

> Documento de continuidad para retomar el trabajo en sesiones posteriores.
>
> Fecha del análisis: 4 de septiembre de 2026  
> Rama revisada: `feature/scheduler`  
> Alcance acordado: backend, base de datos e integración completa de todos los módulos visibles en Scheduler.

## Estado de ejecución

- **Fase 4 — implementada en repositorio el 4 de septiembre de 2026; migración, integración PostgreSQL y activación pendientes.** La migración exclusivamente aditiva `20260904090000_add_scheduler_appointments` agrega citas canónicas multi-servicio, participantes, recursos, bloqueos, historial append-only, idempotencia, reservas de beneficios y el vínculo opcional desde `PosAppointment`; no importa mocks ni transforma Agenda/POS. `/api/scheduler/availability`, `/appointments*` y `/blocks*` aplican JWT, capacidades, sucursales/profesional propio, horario IANA, control optimista, auditoría, locks ordenados y transacciones serializables. La prueba concurrente crítica quedó como integración opt-in para PostgreSQL desechable. Guía: `docs/SCHEDULER_PHASE_4_APPOINTMENTS.md`.
- **Fase 3 — implementada progresivamente en repositorio el 4 de septiembre de 2026; migración, diagnóstico/materialización e índice parcial pendientes.** La migración aditiva `20260904080000_add_scheduler_customers` agrega normalización nullable/versionada, perfiles, alias, correos, campos personalizados y fusiones auditables sin backfill ni datos operativos. `/api/scheduler/clients*` ofrece búsqueda, alta/edición, expediente, históricos y fusión serializable; las citas canónicas ya participan en la fusión y el historial de visitas. Guía: `docs/SCHEDULER_PHASE_3_CUSTOMERS.md`.
- **Fase 2 — implementada en repositorio el 4 de septiembre de 2026; migración y provisión pendientes.** La migración exclusivamente aditiva `20260904070000_add_scheduler_operational_catalogs` agrega perfiles sobre `Sucursal`, `Empleado` y `CatalogItem SERVICE`, comercios, asignaciones por sucursal, servicios/clases, especialidades, grupos, recursos, compatibilidades, requisitos, horarios recurrentes y excepciones con vigencia/baja lógica. No crea seeds, perfiles ni datos operativos. `/api/scheduler/operations/*` expone candidatos y CRUDs tipados con alcance, auditoría y control optimista. Las secciones administrativas base ya muestran candidatos reales y permiten activar/configurar sucursales, profesionales, servicios y recursos; los flujos avanzados restantes se conectarán progresivamente en Fase 9. Guía: `docs/SCHEDULER_PHASE_2_OPERATIONAL_CATALOGS.md`.
- **Fase 1 — implementada en repositorio el 4 de septiembre de 2026; activación por ambiente pendiente.** La migración aditiva `20260904060000_add_scheduler_security` incorpora permisos/capacidades por puesto, sucursales explícitas, alcance profesional propio, credenciales secundarias con bcrypt, autorizaciones opacas de dos minutos y consumo único, y extiende `AuditLog` con `Usuario` + origen `SCHEDULER`. El frontend ya usa el JWT compartido, bootstrap autoritativo y guards de servidor/UI; los códigos mock fueron retirados del flujo activo y el documento legacy se elimina al abrir la configuración personal.
- `SCHEDULER_ALLOW_MOCKS=true` sólo surte efecto con `NODE_ENV=development`; sin ambas condiciones los módulos operativos mock permanecen cerrados. La migración no concede grants, no crea seeds y no se aplicó a development o production. La evidencia real pendiente de Fase 0, la reconstrucción sobre PostgreSQL 16 y las pruebas HTTP siguen siendo gates obligatorios antes de activar. Guía: `docs/SCHEDULER_PHASE_1_SECURITY.md`.
- **Fase 0 — implementada en repositorio el 4 de septiembre de 2026; inventario real pendiente de conexión y aprobación.** `pnpm --filter @cosmetics/api scheduler:diagnose` compara las migraciones versionadas con `_prisma_migrations`, inventaría de forma agregada las entidades reutilizables, candidatos y relaciones incompletas, y clasifica `RegistroCita`, `PosAppointment` y las tablas `Agenda*`. Toda consulta corre dentro de una transacción PostgreSQL `READ ONLY`; el reporte no contiene registros personales, secretos ni detalles de conexión.
- No se agregaron modelos, migraciones, seeds, endpoints o datos operativos en esta fase. La corrida intentada contra `.env.dev` no alcanzó el pooler desde este workspace, por lo que el criterio de salida de datos continúa pendiente: development y el ambiente objetivo deben ejecutarse y aprobarse antes de definir el backfill o iniciar la Fase 1. Guía operativa: `docs/SCHEDULER_PHASE_0_DIAGNOSIS.md`.

## 1. Objetivo

Construir el backend y la capa de persistencia de `apps/scheduler`, reemplazando los datos mock y el estado operativo guardado en `localStorage` por APIs y modelos persistentes, sin duplicar entidades que ya existen en la plataforma.

Scheduler será la fuente de verdad para las citas futuras. El POS y otros consumidores deberán integrarse con Scheduler mediante contratos internos. Las tablas de Agenda CRM ya existentes se conservarán como historial o bitácora de integración, pero no serán el modelo canónico de la nueva agenda.

El desarrollo debe cubrir la aplicación completa, no solamente un MVP. La ejecución se divide en fases para reducir el riesgo y permitir entregas verificables.

## 2. Estado actual verificado

### 2.1 Repositorio y arquitectura

- El repositorio es un monorepo administrado con pnpm y Turborepo.
- `apps/scheduler` es una aplicación Next.js 14.
- El backend está implementado con Express, Prisma y PostgreSQL/Supabase.
- Scheduler ya depende de paquetes compartidos como `@cosmetics/api-client`, `@cosmetics/auth`, `@cosmetics/types` y `@cosmetics/ui`.
- Existe y fue revisado el archivo raíz `CLAUDE.md`; sus reglas de seguridad, migraciones, producción y arquitectura son obligatorias para la implementación.

### 2.2 Estado de Scheduler

- La interfaz de Scheduler está ampliamente desarrollada, pero actualmente opera con datos mock y estado local.
- Hay aproximadamente 28 mil líneas entre páginas, componentes, espacios de trabajo y utilidades del Scheduler.
- Existen alrededor de 20 rutas compilables en la aplicación.
- La página de acceso actual no autentica contra el backend; redirige localmente.
- Hay códigos de autorización y configuraciones operativas presentes en el bundle del navegador o almacenados en `localStorage`. Esto debe eliminarse antes de producción.
- Los mocks mezclan conceptos que deben separarse en el modelo real: profesionales, cabinas y la columna de “CITAS PENDIENTES”.
- La ruta `backend/api/src/routes/scheduler.routes.ts` está montada en `/api/scheduler`, pero no implementa endpoints todavía.
- La ruta CRM del backend tampoco ofrece hoy una implementación reutilizable para mensajería.

### 2.3 Estado de Prisma y del backend

- El esquema canónico está en `backend/api/prisma/schema.prisma`.
- Existe una copia en `backend/api/src/prisma/schema.prisma`; ambas eran idénticas durante este análisis.
- Prisma validó correctamente.
- El análisis inicial encontró 36 directorios; después de las Fases 1 a 4 y la Fase 6 el repositorio contiene 41 migraciones versionadas. La Fase 5 no requirió migración.
- El type-check y el build del API pasaron.
- Las 84 pruebas unitarias encontradas para el API pasaron.
- El type-check, las pruebas actuales y el build de Scheduler pasaron. El build mostró advertencias no bloqueantes relacionadas con imágenes y dependencias de hooks.

### 2.4 Limitación de la inspección de base de datos

No fue posible abrir una conexión desde este entorno al pooler de Supabase; Prisma devolvió `P1001`. Por ello, este análisis confirma el esquema y las migraciones presentes en el repositorio, pero no confirma:

- qué migraciones están aplicadas realmente en cada ambiente;
- cuántas filas existen en cada tabla;
- la calidad y completitud de los datos reales;
- posibles duplicados o relaciones incompletas en producción.

`CLAUDE.md` indicaba, al momento de su última actualización, que producción tenía aplicadas solamente 22 migraciones hasta `20260823010000` y que migraciones recientes del POS/Agenda todavía no se habían aplicado. Este dato debe tratarse como una referencia histórica y verificarse de nuevo antes de cualquier despliegue.

### 2.5 Regla sobre datos mock

No se migrarán a Supabase los clientes, citas, códigos, métricas ni configuraciones que hoy existen solamente como mocks o en `localStorage`. Podrán conservarse como fixtures de desarrollo y pruebas, pero no como datos operativos ni seeds de producción.

## 3. Inventario de modelos existentes que deben reutilizarse

| Modelo o área existente                                                       | Uso propuesto en Scheduler                                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Usuario`                                                                     | Identidad autenticada, actor de auditoría y sesión compartida.                                       |
| `Position`                                                                    | Base de los permisos por puesto; se extenderá con permisos específicos de Scheduler.                 |
| `PositionScreenPermission` y permisos equivalentes                            | Patrón de referencia para acceso por pantalla y capacidades.                                         |
| `Sucursal`                                                                    | Catálogo canónico de sucursales; no crear una segunda tabla de sucursales.                           |
| `Empleado`                                                                    | Persona canónica que puede convertirse explícitamente en profesional agendable.                      |
| `Customer`                                                                    | Identidad canónica del cliente; será extendida mediante perfiles y datos normalizados.               |
| `CustomerSource`                                                              | Origen o canal de adquisición del cliente.                                                           |
| `CustomerPortfolioAssignment`                                                 | Asignaciones existentes de cartera o seguimiento.                                                    |
| `CatalogItem`                                                                 | Catálogo canónico de servicios y productos; los servicios de Scheduler usarán `kind = SERVICE`.      |
| Taxonomías, precios, recursos visuales y visibilidad por sucursal de catálogo | Clasificación, precios, imágenes y disponibilidad comercial de servicios.                            |
| `PosPackage`                                                                  | Paquetes vendibles; Scheduler agregará sólo metadatos de agenda cuando sean necesarios.              |
| `PosTicket`, `PosPayment` y membresías                                        | Historial financiero, elegibilidad y reportes; el POS conserva la autoridad financiera.              |
| `RegistroCita`                                                                | Historial legado de citas atendidas. No será la agenda canónica futura.                              |
| `AgendaResource`, `AgendaSlot`, `AgendaReservation`, `AgendaSyncEvent`        | Bitácora y compatibilidad con Agenda CRM externa; no reutilizarlas como núcleo interno de Scheduler. |
| `PosAppointment`                                                              | Vínculo del POS con una cita; deberá apuntar a la nueva cita canónica de Scheduler.                  |
| `AuditLog`                                                                    | Registro de cambios sensibles, accesos privilegiados y operaciones administrativas.                  |
| Nómina y bancos                                                               | No usarlos como sustituto de pagos, comisiones o liquidaciones propias de Scheduler.                 |

## 4. Arquitectura de datos objetivo

Los nombres definitivos deben validarse con las convenciones del esquema Prisma, pero la separación conceptual deberá mantenerse.

### 4.1 Comercio, sucursales y acceso

- `SchedulerCommerce`: configuración global del comercio o tenant de Scheduler.
- `SchedulerBranchProfile`: extensión uno-a-uno de `Sucursal` con zona horaria, políticas y datos propios de agenda.
- `PositionSchedulerScreenPermission`: acceso por pantalla o módulo.
- `PositionSchedulerBranchAssignment`: alcance de sucursales por puesto o usuario.
- `PositionSchedulerAccessPolicy`: capacidades como crear, mover, cancelar, desbloquear, sobrescribir disponibilidad o exportar información.
- Campo o relación equivalente a `Position.canManageSchedulerAccess` para administrar permisos.

### 4.2 Profesionales, grupos y horarios

- `SchedulerProfessionalProfile`: activación explícita de un `Empleado` como profesional agendable.
- Asignaciones de profesional a sucursal.
- Grupos, clases o especialidades profesionales.
- Horarios recurrentes normalizados.
- Descansos y excepciones por fecha.
- Vigencia temporal de configuraciones y bajas lógicas.

No se inferirá automáticamente que todo empleado es profesional. La activación debe ser explícita y auditable.

### 4.3 Servicios, paquetes y recursos

- `SchedulerServiceProfile`: extensión de un `CatalogItem` de tipo servicio con duración, preparación, limpieza, capacidad, reglas de reserva y compatibilidad profesional.
- Relaciones de servicios con sucursales, profesionales y recursos.
- Recursos físicos como cabinas, equipos o salas.
- Reglas de capacidad y exclusividad de recursos.
- Extensiones de agenda para `PosPackage` sin duplicar su identidad comercial.

Las cabinas son recursos, no profesionales. “CITAS PENDIENTES” es un estado o una cola, no un profesional ficticio.

### 4.4 Clientes

- Extensión de `Customer` con `phoneNormalized` y reglas de unicidad progresivas.
- Perfil de Scheduler para preferencias, notas y datos operativos.
- Alias de búsqueda y nombres alternativos.
- Correos electrónicos normalizados y verificables.
- Campos personalizados versionados.
- Eventos de fusión de clientes para conservar trazabilidad.

La búsqueda no debe depender de coincidencias exactas ni crear duplicados silenciosamente. La fusión de identidades debe ser transaccional y auditable.

### 4.5 Citas canónicas

- `SchedulerAppointment`: cabecera de cita, cliente, sucursal, estado, origen, zona horaria, versión y metadatos de auditoría.
- Servicios de la cita.
- Profesionales participantes.
- Recursos reservados.
- Bloqueos de agenda.
- Historial de estados.
- Claves de idempotencia para altas y operaciones críticas.
- Relación opcional uno-a-uno o uno-a-muchos con `PosAppointment`, según se confirme el flujo real del POS.

Estados base propuestos:

- `PENDING`
- `RESERVED`
- `CONFIRMED`
- `ARRIVED`
- `WAITING`
- `ATTENDED`
- `NO_SHOW`
- `CANCELED`

Los estados que ocupan disponibilidad deben definirse explícitamente. Cancelar una cita cambia su estado y conserva su historial; no elimina el registro.

### 4.6 Administración y módulos complementarios

- Configuraciones versionadas por comercio, sucursal o usuario.
- Reglas de comisión con vigencia temporal.
- Tarjetas de regalo y sus movimientos.
- Consentimientos y documentos.
- Expediente médico con controles reforzados.
- Plantillas de mensajes y notificaciones.
- Bandeja de salida u outbox idempotente.
- Encuestas, tokens y respuestas inmutables.

### 4.7 Tiempo, dinero y concurrencia

- Guardar instantes en UTC y conservar una referencia o snapshot de zona horaria IANA.
- Usar `America/Mexico_City` como valor inicial cuando no exista una configuración explícita.
- El incremento funcional inicial de disponibilidad será de 15 minutos; la altura visual de filas continuará siendo una preferencia de interfaz.
- Exponer importes decimales como strings para evitar errores de precisión en JSON.
- Usar transacciones con aislamiento apropiado, locks cuando corresponda y una revalidación final antes de confirmar una reserva.
- Exigir `Idempotency-Key` en creación de citas y operaciones externas repetibles.
- Usar control optimista mediante `version` o `If-Match`; una versión obsoleta debe responder `409 Conflict`.
- Solapamientos, sobrecapacidad, extensiones de horario y reservas sobre bloqueos estarán deshabilitados por defecto.
- Una excepción requerirá permiso específico, autenticación secundaria, motivo y registro en `AuditLog`.

Orden mínimo para calcular disponibilidad:

1. Horario general del comercio o sucursal.
2. Excepciones y cierres por fecha.
3. Horario del profesional y del recurso.
4. Bloqueos administrativos.
5. Citas activas existentes.
6. Capacidad simultánea del servicio y los recursos.

## 5. Contratos y APIs objetivo

### 5.1 Paquetes compartidos

- Agregar claves de pantalla y capacidades de Scheduler a `@cosmetics/types`.
- Extender la sesión autenticada con alcance de sucursales y permisos efectivos.
- Definir DTOs compartidos para fechas, importes, paginación, filtros, errores y conflictos de versión.
- Agregar métodos tipados de Scheduler en `@cosmetics/api-client`.
- Mantener la envoltura estándar del backend: `{ success, message, data }`.

### 5.2 Familias de endpoints

Todos los endpoints deberán vivir bajo `/api/scheduler` y validar autenticación, autorización y alcance de sucursal en el servidor.

- Bootstrap de sesión, acceso y capacidades.
- Comercios y perfiles de sucursales.
- Profesionales, asignaciones, grupos y horarios.
- Servicios, paquetes, recursos, comisiones y tarjetas de regalo.
- Clientes: búsqueda, detalle, actualización, fusión, historial de citas e historial financiero.
- Disponibilidad, citas, cambios de estado, cancelaciones y bloqueos.
- Configuraciones por sección y alcance.
- Plantillas, mensajes, encuestas, consentimientos y expediente médico.
- Reportes y exportaciones.

## 6. Plan de implementación por fases

### Fase 0 — Diagnóstico reproducible de ambientes y datos

**Estado de implementación (4 de septiembre de 2026):** herramienta y salvaguardas completadas en repositorio. La ejecución real en development y la aprobación del inventario/backfill siguen pendientes por falta de conectividad PostgreSQL desde el workspace. Esto no autoriza avanzar con migraciones canónicas.

Objetivo: convertir las incógnitas de la base real en un inventario verificable antes de diseñar backfills o restricciones.

Entregables:

- Crear un comando de sólo lectura, por ejemplo `scheduler:diagnose`.
- Reportar migraciones aplicadas y pendientes por ambiente.
- Obtener conteos de las tablas reutilizables.
- Detectar sucursales sin perfil, servicios sin duración, empleados candidatos, teléfonos duplicados y relaciones incompletas.
- Contar y clasificar registros de `RegistroCita`, `PosAppointment` y las tablas `Agenda*`.
- Generar reportes sin imprimir secretos ni datos sensibles innecesarios.
- Ejecutar primero contra desarrollo; producción requiere autorización explícita y una conexión de sólo lectura cuando sea posible.
- Confirmar backup y recuperación a un punto en el tiempo antes de migraciones de producción.

Reglas:

- No inferir relaciones por nombre salvo para producir candidatos de revisión.
- Una sucursal no mapeada puede mostrarse como pendiente de configuración, pero no aceptar nuevas reservas.
- No usar `prisma db push`, resets ni seeds operativos en producción.

Criterio de salida: inventario real aprobado y estrategia de backfill definida sin ambigüedades.

Evidencia disponible:

- `backend/api/scripts/diagnose-scheduler-data.ts` abre una transacción `READ ONLY` y emite JSON agregado.
- `backend/api/src/services/scheduler-data-diagnosis.ts` tolera tablas aún no migradas, clasifica migraciones y evita inferencias automáticas por nombre.
- Production exige la confirmación literal `PRODUCCION_SOLO_LECTURA`; backup/PITR continúa como una verificación externa obligatoria antes de migrar.
- Los errores de ejecución se redactan para no filtrar hosts, URLs, secretos o registros.
- El procedimiento, campos y plantilla de decisión están documentados en `docs/SCHEDULER_PHASE_0_DIAGNOSIS.md`.
- El cierre local pasó lint, type-check y build del API, sincronía/validación de schemas Prisma y 89 pruebas unitarias en 17 archivos.

### Fase 1 — Contratos, autenticación, permisos y auditoría

**Estado de implementación (4 de septiembre de 2026):** completada en repositorio; migración y activación operativa pendientes por los gates de Fase 0 y PostgreSQL desechable.

Objetivo: establecer la frontera de seguridad antes de exponer datos de Scheduler.

Entregables:

- Login real basado en el JWT compartido.
- Bootstrap de Scheduler con usuario, permisos y sucursales autorizadas.
- Permisos separados de lectura, escritura, administración, exportación y excepciones.
- Alcance por sucursal y, cuando aplique, por profesional propio.
- Acceso global reservado al rol administrativo definido por la plataforma.
- Uso de `AuditLog` con `Usuario` como actor y Scheduler como aplicación origen.
- Sustitución de códigos locales por secretos con hash o HMAC en servidor.
- Autorizaciones secundarias de un solo uso y duración limitada.
- Bandera explícita para permitir mocks únicamente en desarrollo.

Criterio de salida: ninguna pantalla protegida obtiene datos fuera del alcance de la sesión y ningún secreto operativo llega al bundle del navegador.

Evidencia disponible:

- `packages/types/src/scheduler.ts` define 28 pantallas, cinco capacidades, bootstrap, administración de accesos y autorizaciones secundarias.
- `backend/api/src/services/scheduler-access.ts` materializa sucursales sin fallbacks globales, resuelve permisos y ofrece middlewares reutilizables para endpoints posteriores.
- `/api/scheduler/bootstrap`, `/security/secondary-secret`, `/authorizations`, `/authorizations/consume` y `/access*` implementan el contrato con JWT compartido y respuestas estándar.
- `SchedulerSecondaryCredential` usa bcrypt; `SchedulerAuthorization` guarda sólo SHA-256 del token, caduca a los dos minutos y se consume de forma atómica una vez.
- `AuditLog.application = SCHEDULER` y `actorUserId` registran emisión/consumo/denegación, rotación de código y cambios de permisos/sucursales sin secretos.
- El login y los guards del frontend consumen el bootstrap real. Configuración permite rotar sólo el código propio confirmando la contraseña actual; no persiste códigos en cliente.
- El cierre local pasó schemas Prisma, lint/type-check/build del API, type-check de paquetes compartidos, 93 pruebas unitarias, y lint/type-check/build de Scheduler. Las advertencias de imágenes/hooks de Scheduler ya existían y siguen siendo no bloqueantes.
- Runbook: `docs/SCHEDULER_PHASE_1_SECURITY.md`.

### Fase 2 — Catálogos operativos, profesionales y recursos

**Estado de implementación (4 de septiembre de 2026):** completada en repositorio; migración y provisión manual en development pendientes por los gates de Fase 0 y PostgreSQL desechable. Las pantallas de candidatos/configuración base ya consumen la API; la sustitución de los flujos administrativos avanzados continúa en Fase 9.

Objetivo: construir la base maestra necesaria para calcular disponibilidad.

Entregables:

- Perfiles de Scheduler sobre `Sucursal`, `Empleado` y `CatalogItem`.
- Pantallas/API de candidatos existentes para activación explícita.
- Duración y reglas de agenda obligatorias para servicios activados.
- Asignaciones de profesionales y servicios por sucursal.
- Horarios recurrentes, descansos y excepciones.
- Recursos físicos, capacidades y compatibilidades.
- Grupos, clases y especialidades.
- Bajas lógicas y vigencia temporal.

Criterio de salida: una sucursal configurada puede expresar quién trabaja, qué servicio ofrece, cuándo está disponible y qué recurso necesita.

Evidencia disponible:

- `20260904070000_add_scheduler_operational_catalogs` crea únicamente tablas, enums, índices, checks y FKs; no inserta ni transforma datos.
- Los perfiles uno-a-uno reutilizan `Sucursal`, `Empleado` y `CatalogItem`; activar un profesional o servicio siempre es una decisión explícita.
- `backend/api/src/routes/scheduler-operations.routes.ts` implementa candidatos, catálogo materializado y mutaciones de comercios, perfiles, asignaciones, servicios/clases, especialidades, grupos, recursos, compatibilidades, horarios y excepciones.
- El servidor aplica capacidades administrativas, sucursales materializadas, alcance profesional propio, auditoría y `expectedVersion`; una sucursal no habilita reservas sin horario general, profesional y servicio activos.
- `packages/types/src/scheduler.ts` y `@cosmetics/api-client` publican el contrato compartido. `OperationalCatalogWorkspace` ofrece carga, vacío, error, sólo lectura y formularios de activación real para sucursales, profesionales, servicios y recursos; los demás paneles mock no se exponen fuera del modo de desarrollo.
- El cierre local valida schemas, lint/type-check/build del API, paquetes compartidos, Scheduler y pruebas unitarias. La reconstrucción/HTTP sobre PostgreSQL 16 continúa pendiente porque Podman no puede iniciar en este workspace.

### Fase 3 — Clientes compartidos y deduplicación

**Estado de implementación (4 de septiembre de 2026):** implementación progresiva completada en repositorio; migración, diagnóstico/materialización real y el índice único parcial permanecen pendientes de los gates de Fase 0 y de una PostgreSQL desechable. La UI de Clientes continúa mock hasta su conexión controlada en Fase 9.

Objetivo: reutilizar `Customer` sin introducir identidades paralelas.

Entregables:

- Agregar `phoneNormalized` de forma progresiva: nullable, escritura dual, diagnóstico, limpieza y finalmente índice único parcial cuando los datos lo permitan.
- Crear perfiles, alias, correos y campos propios de Scheduler.
- Reutilizar `CustomerSource` y `CustomerPortfolioAssignment`.
- Implementar búsqueda paginada por nombre, teléfono y correo con un mínimo razonable de caracteres.
- Implementar fusión transaccional con historial del evento y reasignación segura de relaciones.
- Exponer historial financiero del POS en modo lectura.
- Corregir operaciones financieras exclusivamente mediante compensaciones en POS; Scheduler no modifica tickets o pagos históricos.

No se debe deducir una identidad sólo por el nombre contenido en `RegistroCita`.

Criterio de salida: crear, encontrar y fusionar clientes no genera duplicados silenciosos ni rompe su historial compartido.

Evidencia disponible:

- `20260904080000_add_scheduler_customers` es exclusivamente aditiva: agrega `Customer.phoneNormalized` nullable y `version`, perfiles, alias, correos, definiciones/valores versionados y eventos de fusión; no hace backfill, no fusiona registros y no crea datos operativos.
- Scheduler y los escritores POS mantienen escritura dual. Las altas/ediciones Scheduler normalizan teléfono, toman un advisory lock transaccional, revisan datos legacy/alias y usan control optimista; el diagnóstico reporta pendientes, discrepancias y duplicados sin exponer PII.
- `scheduler:customers:normalize` es reejecutable, inicia en `DRY_RUN`, sólo materializa la clave derivada y exige confirmación más PITR para production. El índice único parcial se hará en otra migración únicamente cuando `uniquePartialIndexReady` sea verdadero.
- `/api/scheduler/clients*` implementa búsqueda paginada y acotada, procedencias, campos versionados, alta/edición, expediente, visitas, finanzas POS de sólo lectura y fusión `SERIALIZABLE` con versiones, autorización secundaria, snapshots y auditoría.
- La fusión reasigna las relaciones compartidas sin alterar snapshots financieros; rechaza identidades externas distintas, conserva el destino ante colisiones y desactiva el origen sin borrar `Customer`. `RegistroCita` no se vincula por nombre.
- `@cosmetics/types` y `@cosmetics/api-client` publican el contrato. El cierre local valida schemas, lint/type-check/build del API, paquetes compartidos, Scheduler y 103 pruebas unitarias en 20 archivos. Reconstrucción e integración/concurrencia real siguen pendientes por falta de PostgreSQL desechable.
- Runbook: `docs/SCHEDULER_PHASE_3_CUSTOMERS.md`.

### Fase 4 — Motor canónico de disponibilidad y citas

**Estado de implementación (4 de septiembre de 2026):** completada en repositorio; migración, reconstrucción/integración PostgreSQL y activación operativa pendientes por los gates de Fase 0 y una base desechable. La UI de Agenda continúa mock hasta su conexión controlada en Fase 9.

Objetivo: convertir Scheduler en la fuente de verdad de citas futuras.

Entregables:

- Modelos de citas, servicios, participantes, recursos, bloqueos, estados e idempotencia.
- Endpoint de disponibilidad con filtros por sucursal, servicio, fecha, profesional y recurso.
- Creación, actualización, movimiento, cancelación y cambio de estado.
- Citas con varios especialistas o servicios dentro de una sola transacción.
- Validación de límites de horario, capacidad, bloqueos y membresías.
- Integración idempotente con beneficios o membresías.
- Relación desde `PosAppointment` hacia `SchedulerAppointment`.
- Control optimista y respuestas `409` útiles para que la interfaz pueda recargar y explicar el conflicto.

Prueba crítica: dos solicitudes concurrentes por el último espacio disponible deben producir exactamente un éxito y un `409`, sin sobreventa.

Criterio de salida: todas las operaciones centrales de agenda funcionan sin mocks y resisten concurrencia real.

Evidencia disponible:

- `20260904090000_add_scheduler_appointments` es exclusivamente aditiva: agrega citas multi-servicio, participantes, recursos, bloqueos cancelables, estados, snapshots, historial append-only, idempotencia y beneficios; no crea datos ni convierte `RegistroCita`, `PosAppointment` o `Agenda*`.
- `PosAppointment.schedulerAppointmentId` relaciona la operación POS sin reemplazar aún al proveedor Agenda; la sustitución del adaptador pertenece a Fase 5.
- `/api/scheduler/availability`, `/appointments*` y `/blocks*` exponen disponibilidad diaria optimizada, listado/detalle, alta, edición, movimiento, transición/cancelación y bloqueos. Todos materializan sucursales y, cuando aplica, profesional propio.
- El cálculo conserva zona IANA, genera intervalos de 15 minutos, aplica jornadas/excepciones/bloqueos/citas/capacidades en orden, y usa intervalos semiabiertos. `PENDING`, `RESERVED`, `CONFIRMED`, `ARRIVED` y `WAITING` ocupan agenda.
- Las mutaciones usan `expectedVersion`; los conflictos entregan códigos `409` estables. Las excepciones requieren capacidad `EXCEPTION`, autorización secundaria `AVAILABILITY_OVERRIDE`, motivo y auditoría.
- Las altas exigen `Idempotency-Key`; un lock propio hace converger reintentos concurrentes al mismo resultado. Las reservas toman advisory locks ordenados por día/sucursal/profesional/recurso dentro de transacciones `SERIALIZABLE` con reintento de `P2034`.
- Los beneficios bloquean la membresía, validan identidad/estado/sesiones/condiciones y contabilizan juntas varias líneas. Scheduler reserva, consume o libera su ledger sin modificar `usedSessions` ni fabricar asistencias POS antes de la integración de Fase 5.
- `scheduler-appointments.integration.test.ts` prueba el último espacio con dos solicitudes simultáneas y exige un `201` y un `409`. La suite está opt-in y no se ejecutó localmente por falta de PostgreSQL desechable; es obligatoria antes de activar.
- El diagnóstico incorpora las nuevas tablas y el historial de Clientes combina citas Scheduler y POS sin enlazar `RegistroCita` por nombre.
- El cierre local valida schemas, lint/type-check/build del API, contratos compartidos y 109 pruebas unitarias en 21 archivos. Runbook: `docs/SCHEDULER_PHASE_4_APPOINTMENTS.md`.

### Fase 5 — Sustitución de Agenda CRM en la integración con POS

**Estado de implementación (4 de septiembre de 2026):** completada en repositorio; activación operativa y prueba integrada sobre PostgreSQL 16 pendientes de los gates de Fase 0 y de provisionar sucursales, servicios, profesionales y credenciales POS enlazadas. `internal` es el proveedor por defecto en código; un ambiente no debe cambiar desde `http` hasta aprobar el checklist de corte.

Objetivo: hacer que POS consulte y confirme contra Scheduler interno sin perder una ruta de rollback operativo.

Entregables:

- Crear una interfaz interna compatible con el adaptador de Agenda requerido por POS.
- Agregar `AGENDA_PROVIDER=internal|http` o una configuración equivalente.
- Hacer `internal` el destino final y conservar temporalmente `http` como rollback.
- Garantizar que el modo interno no use secretos ni llamadas HTTP externas.
- Tratar `AgendaResource`, `AgendaSlot`, `AgendaReservation` y `AgendaSyncEvent` como legado de integración y trazabilidad.
- Diseñar un importador explícito sólo si el diagnóstico confirma datos externos vigentes que deban convertirse en citas internas.
- Emitir eventos internos idempotentes para cambios relevantes.
- Actualizar la documentación del POS, el plan de integración previo y `CLAUDE.md` para reflejar la nueva autoridad.

Criterio de salida: POS puede validar, reservar y relacionar citas internas sin depender de Agenda CRM externa.

Evidencia disponible:

- `InternalAgendaAdapter` conserva el contrato consumido por POS, calcula slots desde perfiles, jornadas, excepciones, bloqueos, profesionales, recursos y citas de Scheduler, y no ejecuta `fetch` ni consulta secretos externos.
- `AGENDA_PROVIDER=internal|http` selecciona el proveedor en servidor. La ausencia de variable resuelve a `internal`; un valor desconocido falla cerrado. `HttpAgendaAdapter` permanece intacto como rollback explícito y es el único modo que usa URL/token/timeout y webhooks HMAC.
- La venta prepara únicamente una intención compatible y crea la cita Scheduler con `origin = POS` dentro de la misma transacción `SERIALIZABLE` que el ticket. Cada `PosAppointment` conserva snapshots legacy y enlaza `schedulerAppointmentId`; un fallo revierte ambos lados locales.
- Próximas sesiones de membresía siguen el mismo camino interno. El ledger de Scheduler reserva el beneficio y un cambio a `ATTENDED` genera un `AgendaSyncEvent` interno idempotente, crea como máximo una asistencia POS y actualiza `usedSessions` bajo bloqueo. `CANCELED` y `NO_SHOW` no consumen.
- La conciliación offline de tickets ya ejecuta la misma preparación antes de `createTicket`; una terminal nunca promete capacidad y un conflicto interno permanece auditable sin dejar una cita/ticket parcial.
- `AgendaResource`, `AgendaSlot`, `AgendaReservation` y `AgendaSyncEvent` permanecen como proyección/bitácora de compatibilidad; no son la autoridad de disponibilidad. Los eventos internos usan IDs deterministas y `providerEventId` único.
- El endpoint de webhooks externos responde `410` en modo interno. Cambiar temporalmente a `http` restaura el contrato anterior sin revertir migraciones ni eliminar citas.
- No se creó importador: el diagnóstico real aún no ha demostrado que existan reservas externas futuras que deban convertirse. Cualquier importación continúa condicionada al inventario aprobado de Fase 0 y deberá ser explícita, reejecutable e idempotente.
- El cierre local valida lint/type-check/build del API, contratos compartidos y 114 pruebas unitarias en 22 archivos. La reconstrucción, integración HTTP y concurrencia real sobre PostgreSQL desechable siguen siendo obligatorias antes del corte. Runbook: `docs/SCHEDULER_PHASE_5_POS_INTEGRATION.md`.

### Fase 6 — Administración completa y configuraciones

**Estado de implementación (4 de septiembre de 2026):** completada en repositorio; migración, provisión y pruebas HTTP/PostgreSQL 16 pendientes de los gates de Fase 0. La conexión de todos los paneles administrativos y de configuración continúa en Fase 9.

Objetivo: persistir los módulos administrativos que hoy están simulados en Scheduler.

Entregables:

- Administración de profesionales, grupos, clases, paquetes y complementos.
- Recursos, comisiones, tarjetas de regalo y colores de estados.
- Versionado de reglas de comisión; nómina conserva la autoridad del pago final.
- Configuraciones por comercio, sucursal y usuario con precedencia explícita.
- Reutilización de métodos de pago, políticas y configuración de tickets cuando ya existan en POS.
- Secretos de proveedores exclusivamente en infraestructura o un gestor de secretos.
- Preferencias puramente visuales, como altura de fila, pueden permanecer locales si no afectan reglas de negocio.

Criterio de salida: la administración completa sobrevive recargas, respeta permisos y no almacena secretos en el cliente.

Evidencia disponible:

- `20260904100000_add_scheduler_administration` es exclusivamente aditiva y agrega perfiles de paquetes POS, complementos, horarios de clases, políticas/versiones/reglas de comisión, plantillas de gift card, colores de estado y configuraciones versionadas. No importa mocks, no crea seeds ni modifica datos operativos; ambos schemas Prisma permanecen sincronizados.
- Paquetes reutilizan `PosPackage`; complementos reutilizan `CatalogItem`. `/api/scheduler/administration/pos-references` expone métodos de pago, políticas y configuración de tickets de POS en sólo lectura, sin duplicar autoridad comercial.
- `/api/scheduler/administration/catalog`, `/packages*`, `/addons*`, `/classes/*/schedules`, `/commission-policies`, `/gift-cards*`, `/status-colors*` y `/settings*` aplican permisos por pantalla, sucursales materializadas, auditoría y control optimista. Las mutaciones globales exigen acceso a todo el comercio para no sobrescribir sucursales ajenas.
- Las clases sólo pueden reservarse en horarios persistidos para el servicio/profesional/sucursal; la capacidad efectiva respeta el límite del horario y una franja no configurada produce `CLASS_NOT_SCHEDULED`.
- Cada cambio de comisión crea una versión con reglas inmutables y niveles continuos; Scheduler no crea pagos ni movimientos y declara a Nómina como autoridad final.
- La configuración efectiva mezcla `COMMERCE → BRANCH → USER` dentro del comercio y devuelve las capas/versiones aplicadas. El backend limita cada documento a 64 KiB y rechaza en cualquier profundidad claves que parezcan secretos, tokens, contraseñas, credenciales o llaves privadas; la altura visual de slots permanece local.
- Los colores requieren autorización secundaria `STATUS_COLORS_CHANGE` ligada al comercio y se consumen dentro de la transacción. Las gift cards son plantillas administrativas: emisión, saldo y redención financiera no se simulan ni adelantan.
- El cierre local valida schemas, contratos compartidos, lint/type-check/build del API, 121 pruebas unitarias en 23 archivos y lint/type-check/build de Scheduler. Las advertencias ya conocidas de imágenes/hooks permanecen no bloqueantes. La reconstrucción, integración HTTP y concurrencia real sobre PostgreSQL desechable continúan como puertas obligatorias antes de desplegar. Runbook: `docs/SCHEDULER_PHASE_6_ADMINISTRATION.md`.

### Fase 7 — Mensajería, documentos, expediente médico y encuestas

Objetivo: habilitar funciones sensibles mediante procesos seguros, auditables e idempotentes.

Entregables:

- Plantillas versionadas de mensajes.
- Outbox idempotente con reintentos, estados y recepción segura de webhooks.
- Invalidación o regeneración de recordatorios si una cita cambia.
- Preferencias de contacto y validación de canales disponibles.
- Consentimientos y documentos en almacenamiento privado mediante URLs firmadas de corta duración.
- Campos médicos cifrados cuando corresponda y auditoría de lecturas y cambios.
- Tokens de encuesta con hash, caducidad y uso controlado.
- Respuestas de encuesta append-only.
- Adaptadores de proveedor probados en sandbox antes de activar producción.

Criterio de salida: los envíos no se duplican, los documentos no son públicos y toda consulta sensible queda trazable.

### Fase 8 — Reportes y exportaciones

Objetivo: sustituir todos los KPIs y reportes mock por consultas consistentes y reproducibles.

Entregables:

- Reportes de citas, ocupación, cancelaciones, no-show, clientes, servicios, profesionales, comisiones, encuestas y comunicaciones.
- Ventas y pagos derivados de `PosTicket` y `PosPayment`.
- Uso de tablas de venta legadas sólo cuando el diagnóstico confirme que no duplican la proyección del POS.
- Etiquetar `RegistroCita` como origen legado y evitar doble conteo con citas nuevas.
- Calcular ocupación sobre minutos realmente disponibles, no sobre horas teóricas.
- Aplicar los mismos filtros y dataset tanto a pantalla como a exportación.
- Auditar exportaciones y descargas sensibles.
- Tratar correctamente zona horaria, intervalos inclusivos/exclusivos y cierres de día.

Criterio de salida: las cifras en pantalla coinciden con los archivos exportados y tienen una fuente identificable.

### Fase 9 — Sustitución progresiva del frontend mock

Objetivo: conectar `apps/scheduler` al backend por secciones, evitando un cambio masivo sin posibilidad de aislamiento.

Orden recomendado:

1. Sesión y permisos.
2. Catálogos administrativos.
3. Clientes.
4. Agenda y citas.
5. Configuraciones.
6. Comunicaciones y documentos.
7. Reportes.

Entregables:

- Métodos tipados en el cliente API.
- Hooks o capa de consulta con carga, actualización e invalidación coherentes.
- Estados de carga, vacío, error, sólo lectura y conflicto `409`.
- Eliminación del consumo operativo de `localStorage`.
- Eliminación de imports de mocks en modo API.
- Conservación de fixtures solamente para pruebas, Storybook o desarrollo explícito.

Criterio de salida: una sesión normal no lee ni escribe datos operativos simulados y todas las páginas visibles usan contratos reales.

### Fase 10 — Calidad, migraciones y despliegue

Objetivo: demostrar que la solución puede desplegarse y operarse con seguridad.

Entregables:

- Probar migraciones desde una base vacía y desde un snapshot representativo de las 39 migraciones existentes.
- Pruebas HTTP y de concurrencia contra PostgreSQL 16 efímero.
- Pruebas de carga con al menos 30 sucursales, múltiples profesionales y recursos, operación de 24 horas y exportaciones grandes.
- Agregar Scheduler a CI, pruebas E2E y smoke tests de desarrollo.
- Ejecutar la secuencia: migración, API, frontend, activación del proveedor interno, validación POS/Scheduler.
- Confirmar backup/PITR antes de producción.
- Ejecutar diagnóstico de sólo lectura y flujos críticos después del despliegue.
- Observar errores, latencia, conflictos, outbox y uso de proveedores.
- El rollback operativo cambia el proveedor; no revierte migraciones destruyendo datos.

Criterio de salida: despliegue repetible, observable y reversible a nivel de aplicación.

## 7. Estrategia de migraciones

- Usar solamente migraciones aditivas durante la transición.
- Separar creación de columnas, backfill, validación y restricciones finales.
- No agregar una restricción única hasta medir y resolver los duplicados reales.
- Mantener sincronizadas las dos copias actuales de `schema.prisma` mientras ambas sigan existiendo; preferiblemente eliminar la duplicación en una tarea independiente y controlada.
- Nunca ejecutar `prisma db push` contra producción.
- Nunca hacer reset de una base compartida o productiva.
- Todo script de diagnóstico o backfill debe ser reejecutable, producir un resumen y fallar de manera segura.
- No ejecutar QA escribiendo datos arbitrarios en producción.

## 8. Pruebas y criterios de aceptación transversales

### Autenticación y autorización

- Usuario sin sesión recibe `401`.
- Usuario sin capacidad recibe `403`.
- Un usuario de una sucursal no puede consultar ni mutar otra mediante IDs manipulados.
- Los permisos se validan en backend, no sólo ocultando controles en la interfaz.
- Los códigos secundarios no aparecen en respuestas, logs ni bundles.

### Clientes

- Dos altas concurrentes con el mismo teléfono normalizado no crean dos clientes.
- La fusión preserva citas, historial, origen y trazabilidad.
- Las búsquedas respetan paginación, alcance y normalización.

### Agenda

- No permite solapamiento de profesional o recurso por defecto.
- No permite exceder capacidad.
- Respeta descansos, excepciones y bloqueos.
- Una cita doble o con varios especialistas confirma todos sus segmentos o ninguno.
- Cancelar libera disponibilidad sin borrar historial.
- Operación 24 horas y cruces de medianoche se comportan correctamente.
- Repetir una solicitud con la misma clave de idempotencia no duplica una cita.
- Una versión obsoleta genera `409`.

### Integración POS

- Una cita interna se relaciona una sola vez con la operación POS.
- Reintentos no duplican consumos de membresía o beneficios.
- En modo interno no se realizan llamadas al proveedor externo.
- Cambiar temporalmente al proveedor HTTP mantiene el contrato esperado.

### Mensajería y datos sensibles

- Reintentos y webhooks duplicados no generan envíos múltiples.
- Un cambio de cita invalida el recordatorio anterior.
- No se intenta enviar por un canal sin datos o consentimiento suficiente.
- URLs firmadas caducan y no vuelven público el almacenamiento.
- Lecturas de expediente médico quedan auditadas.

### Reportes

- Respetan permisos y sucursales autorizadas.
- No duplican datos entre fuentes legadas y nuevas.
- Pantalla y exportación producen los mismos totales.
- Fechas y cierres se calculan en la zona horaria correspondiente.

### Gates técnicos

- Pruebas, lint, type-check y build del API.
- Pruebas, type-check y build de Scheduler.
- `prisma validate` para el esquema canónico y su copia mientras exista.
- Pruebas de migración y concurrencia contra PostgreSQL real.
- Smoke tests de los flujos críticos después del despliegue.

## 9. Riesgos principales y mitigaciones

| Riesgo                                      | Mitigación                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| Estado real de migraciones desconocido      | Fase 0 obligatoria y diagnóstico de sólo lectura por ambiente.                              |
| Datos duplicados en clientes                | Normalización progresiva, reporte previo e índice único sólo después del saneamiento.       |
| Sobreventa por concurrencia                 | Transacciones, locks/revalidación, idempotencia y pruebas concurrentes.                     |
| Duplicar entidades ya existentes            | Extender `Sucursal`, `Empleado`, `Customer`, catálogo y POS mediante perfiles y relaciones. |
| Confundir tablas Agenda con el nuevo núcleo | Mantenerlas como legado de integración y crear un modelo canónico explícito.                |
| Exponer códigos o datos médicos             | Secretos de servidor, hash/HMAC, almacenamiento privado, cifrado y auditoría.               |
| KPIs inconsistentes entre legado y POS      | Definir fuente por métrica, marcar origen y prevenir doble conteo.                          |
| Corte total difícil de revertir             | Migración por módulos y adaptador `internal                                                 | http` para POS. |

## 10. Decisiones y supuestos vigentes

- La base PostgreSQL compartida será la única fuente de verdad operativa.
- Scheduler interno será la autoridad de las citas futuras.
- Se implementará todo el alcance funcional visible en Scheduler, por fases.
- No se migrarán mocks ni `localStorage` a la base real.
- No habrá seeds operativos en producción.
- Sucursales, empleados y servicios existentes se mostrarán como candidatos, pero necesitarán configuración o activación explícita.
- Una sucursal no mapeada no podrá recibir nuevas reservas.
- Las tablas `Agenda*` se conservarán para compatibilidad, importación controlada o trazabilidad; no serán el núcleo canónico.
- `RegistroCita` será una fuente histórica marcada como legado.
- El POS seguirá siendo la autoridad para tickets, pagos, membresías y correcciones financieras.
- Nómina seguirá siendo la autoridad del pago final de comisiones.
- El comportamiento seguro por defecto prohíbe solapamientos y sobrecapacidad.
- Credenciales y activación de proveedores de mensajería, pagos o almacenamiento se configurarán por ambiente cuando existan.
- Este archivo es un documento vivo: cada fase debe actualizar su estado, decisiones, migraciones y evidencia de aceptación.

## 11. Preguntas y respuestas de la sesión

### Pregunta 1 — Fuente de verdad de las citas

**Pregunta:** ¿Scheduler interno debe convertirse en la fuente de verdad o debe seguir dependiendo de Agenda CRM externa?

Opciones consideradas:

- Scheduler interno como fuente de verdad, recomendado para eliminar la dependencia externa y centralizar la operación.
- Agenda CRM externa como fuente de verdad, manteniendo Scheduler como cliente o proyección.

**Respuesta:** Scheduler interno será la fuente de verdad.

**Consecuencia en el plan:** se construirá un modelo canónico de disponibilidad y citas, y el POS cambiará a un servicio interno compatible. Las tablas de Agenda externa quedan como legado o bitácora.

### Pregunta 2 — Alcance de implementación

**Pregunta:** ¿El plan debe cubrir todos los módulos del Scheduler o solamente un MVP de agenda?

Opciones consideradas:

- Todo Scheduler, dividido en fases.
- MVP inicial limitado a clientes, disponibilidad y citas.

**Respuesta:** Todo Scheduler.

**Consecuencia en el plan:** se incluyen administración, permisos, clientes, agenda, POS, comunicaciones, documentos, expediente médico, encuestas, reportes y exportaciones, con entregas progresivas.

### Pregunta 3 — Migración de mocks y `localStorage`

**Pregunta:** ¿Los datos de demostración actuales deben migrarse a la base de datos?

Opciones consideradas:

- No migrarlos; conservarlos únicamente como fixtures de desarrollo y pruebas.
- Crear un importador JSON opcional para trasladarlos.

**Respuesta:** No migrarlos.

**Consecuencia en el plan:** clientes, citas, códigos, configuraciones y métricas simuladas no entrarán a Supabase ni se convertirán en seeds de producción.

## 12. Punto recomendado para retomar

La siguiente sesión operativa debe cerrar la **evidencia de la Fase 0** y activar de forma controlada las Fases 1, 2 y 3 antes de iniciar citas:

1. Confirmar que se dispone de acceso seguro a la base de desarrollo.
2. Comparar migraciones aplicadas contra las 40 existentes en el repositorio.
3. Ejecutar `scheduler:diagnose` y conservar el JSON agregado como evidencia segura.
4. Revisar conteos, duplicados y candidatos de mapeo reales.
5. Reconstruir todas las migraciones, incluidas `20260904060000_add_scheduler_security`, `20260904070000_add_scheduler_operational_catalogs`, `20260904080000_add_scheduler_customers` y `20260904090000_add_scheduler_appointments`, sobre PostgreSQL 16 desechable.
6. Ejecutar pruebas HTTP de `401/403`, alcance, autorización de un solo uso, candidatos, perfiles, clientes, normalización, fusiones, horarios, bloqueos, idempotencia y conflictos `409`; probar además dos altas concurrentes con el mismo teléfono y dos reservas por el último espacio.
7. Aprobar la estrategia de backfill; aplicar las cuatro migraciones en development y provisionar grants/catálogos explícitos sin seeds operativos.
8. Ejecutar `scheduler:customers:normalize` en `DRY_RUN`, materializar sólo después de revisar el agregado y resolver manualmente duplicados antes de diseñar la migración del índice único parcial.
9. Con esa evidencia, conectar gradualmente Administración, Clientes y Agenda según la Fase 9; después activar de forma controlada el proveedor `internal` ya implementado en Fase 5 y validar POS/Scheduler antes de retirar el rollback HTTP.

No debe iniciarse la migración canónica de citas hasta conocer el contenido real de `PosAppointment`, `RegistroCita` y las tablas `Agenda*` en el ambiente objetivo.
