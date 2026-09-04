# Scheduler — Fase 6: administración y configuraciones

## Estado

Implementada en repositorio el 4 de septiembre de 2026. La migración es
exclusivamente aditiva y no fue aplicada a development ni production durante
la implementación. La conexión de todos los paneles visuales mock continúa en
la Fase 9.

No activar esta fase en un ambiente hasta aprobar el diagnóstico de Fase 0,
probar la reconstrucción sobre PostgreSQL 16 desechable y provisionar los
permisos/catálogos explícitamente.

## Autoridades y límites

- `CatalogItem`, `PosPackage`, `MetodoPago`, `PosPaymentMethodPolicy`,
  `PosTicketConfiguration` y `PosCourtesyPolicy` siguen siendo propiedad de
  POS. Scheduler sólo expone referencias de lectura y perfiles de agenda.
- Scheduler conserva reglas y versiones de comisión, pero no crea pagos,
  movimientos ni recibos. Nómina sigue siendo la autoridad del pago final.
- Las gift cards de esta fase son plantillas administrativas. Su emisión,
  venta, saldo y redención requieren un flujo financiero posterior coordinado
  con POS; no se simulan como movimientos reales.
- Encuestas, consentimientos, expediente médico, mensajes y secretos de
  proveedores permanecen en Fase 7.
- No se importan documentos de `localStorage`, mocks ni datos demostrativos.

## Migración

`20260904100000_add_scheduler_administration` agrega:

- perfiles Scheduler sobre `PosPackage` y sus sucursales/servicios;
- complementos sobre `CatalogItem` y compatibilidad con servicios;
- horarios versionables de clases por sucursal y profesional;
- políticas de comisión con versiones, modalidades combinables y niveles;
- plantillas de gift card y sus servicios;
- colores de estados por comercio;
- configuraciones versionadas con alcances `COMMERCE`, `BRANCH` y `USER`.

La migración sólo crea tipos, tablas, checks, índices y llaves foráneas. No
inserta, actualiza, fusiona ni elimina filas existentes. Ambos schemas Prisma
deben permanecer idénticos.

## Contrato HTTP

Todos los endpoints viven bajo `/api/scheduler/administration`, usan JWT
compartido y responden con `{ success, message, data }`.

| Método y ruta                              | Uso                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `GET /catalog`                             | Catálogo administrativo materializado según pantallas y sucursales autorizadas.   |
| `PUT /packages/:posPackageId`              | Crea o versiona el perfil Scheduler de un paquete POS.                            |
| `PUT /addons/:catalogItemId`               | Crea o versiona un complemento sobre catálogo POS.                                |
| `PUT /classes/:serviceProfileId/schedules` | Sustituye la vigencia activa de horarios de una clase sin borrar historia.        |
| `PUT /commission-policies`                 | Crea la siguiente versión de una política de comisión.                            |
| `POST /gift-cards`                         | Crea una plantilla de gift card.                                                  |
| `PUT /gift-cards/:id`                      | Actualiza una plantilla con control optimista.                                    |
| `PUT /status-colors/:commerceId`           | Guarda una paleta atómica con autorización secundaria.                            |
| `GET /settings/:section/resolved`          | Resuelve configuración efectiva y declara las capas aplicadas.                    |
| `PUT /settings/:section`                   | Crea una nueva versión en el alcance solicitado.                                  |
| `GET /pos-references`                      | Consulta métodos, tickets, políticas y paquetes canónicos de POS en sólo lectura. |

Los métodos tipados correspondientes están disponibles en
`@cosmetics/api-client`.

## Reglas principales

### Paquetes y complementos

- Un paquete Scheduler siempre apunta a un `PosPackage`; no duplica nombre,
  SKU, precio ni estado comercial.
- Las líneas agendables deben existir en el paquete POS y estar activas en
  todas las sucursales asignadas al perfil.
- Un complemento apunta a un `CatalogItem` existente y sólo puede asociarse a
  servicios del mismo comercio.
- Cambiar un perfil existente exige `expectedVersion`; una versión obsoleta
  responde `409`.

### Clases

- Una clase requiere `SchedulerServiceProfile.mode = CLASS` y un profesional
  habilitado para ese servicio/sucursal.
- Los horarios no pueden traslaparse para el mismo profesional, sucursal y
  día, y su capacidad no puede superar la del servicio.
- El motor de disponibilidad y el commit de cita consultan estos horarios.
  Una clase fuera de su franja devuelve `CLASS_NOT_SCHEDULED`; la capacidad
  efectiva es el menor valor entre perfil y horario.
- Reemplazar horarios cierra lógicamente la vigencia anterior. No se borran
  filas históricas.

### Comisiones

- Los objetivos son `DEFAULT`, `PROFESSIONAL` o `CATALOG_ITEM` y se identifican
  sin relaciones polimórficas ambiguas.
- Una versión puede combinar monto por cita, monto por cita atendida,
  porcentaje de venta y niveles por venta de sucursal.
- Los niveles comienzan en cero, son continuos, no se traslapan y terminan con
  un último rango abierto; los porcentajes permanecen entre 0 y 100.
- Cada cambio crea `SchedulerCommissionPolicyVersion` y conserva reglas/niveles
  anteriores. La auditoría declara `payrollAuthority = PAYROLL`.

### Configuración y secretos

La precedencia efectiva, de menor a mayor, es:

1. `COMMERCE`
2. `BRANCH`
3. `USER` dentro del comercio

Los objetos se mezclan recursivamente; arreglos y valores escalares reemplazan
la capa anterior. La respuesta incluye las capas/versiones aplicadas para que
la UI pueda explicar el resultado.

El backend rechaza propiedades con nombres de secreto, token, contraseña,
credencial, API key, private key o webhook secret en cualquier profundidad.
Esos valores sólo deben existir en variables/secret manager de infraestructura.
El documento está limitado a 64 KiB. La altura visual de filas/slots continúa
local porque no cambia reglas de negocio.

## Seguridad

- `READ`, `WRITE` y `ADMIN` se comprueban en servidor por pantalla.
- Las mutaciones globales requieren alcance administrativo de todas las
  sucursales configuradas del comercio, salvo `SUPER_ADMIN`.
- Un reemplazo de clases o asociaciones no puede eliminar indirectamente datos
  de una sucursal fuera del alcance del actor.
- Colores de estado requieren una autorización secundaria de propósito
  `STATUS_COLORS_CHANGE`, ligada al actor y al `SchedulerCommerce`; se consume
  dentro de la misma transacción.
- Las mutaciones sensibles escriben `AuditLog.application = SCHEDULER` sin
  documentos completos, secretos o tokens.

## Despliegue y provisión

1. Ejecutar `scheduler:diagnose` contra development en modo de sólo lectura.
2. Reconstruir todas las migraciones en PostgreSQL 16 desechable.
3. Ejecutar las pruebas HTTP de `401`, `403`, alcance cruzado y `409`.
4. Aplicar la migración mediante el workflow protegido; nunca con `db push`.
5. Configurar primero paquetes, complementos, clases, comisiones, gift cards y
   paletas de prueba sin copiar mocks.
6. Confirmar que clases sin horario quedan cerradas y que POS references son de
   sólo lectura.
7. Conectar paneles visuales por secciones durante Fase 9.

## Verificación local

La implementación debe cerrar con:

```bash
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/types type-check
pnpm --filter @cosmetics/api-client type-check
pnpm --filter @cosmetics/api lint
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api test:unit
pnpm --filter @cosmetics/api build
```

Las pruebas de reconstrucción, integración HTTP y concurrencia sobre una base
PostgreSQL desechable siguen siendo obligatorias antes del despliegue si el
workspace local no dispone de esa infraestructura.

En el cierre de implementación pasaron 121 pruebas unitarias en 23 archivos,
además de lint/type-check/build del API y lint/type-check/build de Scheduler.
El frontend conserva únicamente sus advertencias preexistentes de imágenes y
dependencias de hooks.
