# Plan por fases: restauración visual de Scheduler con backend real

> Creado: 6 de septiembre de 2026.
> Rama inspeccionada: `feature/scheduler`.
> Referencia visual aprobada por el PO, indicada por el usuario: `e9077ddad945325b1a132962ce0c2fcd9ae7f74a`.
> HEAD al redactar el plan: `9784c1b222dc2aa69cb304a5b492eeb1786ac980`.
> Estado: RV0–RV8 implementadas con validación visual/funcional pendiente.

## 1. Objetivo y acuerdo de alcance

Recuperar la presentación aprobada de todo `apps/scheduler`, conectándola con los contratos y garantías del backend actual. Incluye Agenda, Clientes, Administración, Configuraciones, comunicaciones/documentos/encuestas y Reportes. Conservar calendario, distribución, navegación, tipografía, colores, densidades, tarjetas, tablas y diálogos de la referencia, con datos reales y estados operativos explícitos.

RV0 quedó implementada en repositorio el 6 de septiembre de 2026: inventario, matriz, referencia aislada, runner determinista, diagnóstico de infraestructura y brechas están documentados en `docs/SCHEDULER_VISUAL_RESTORATION_BASELINE.md`. El sandbox no permitió iniciar Chromium ni servidores locales, por lo que faltan las capturas antes de validar la fase. No se aplicaron migraciones, seeds, despliegues ni datos operativos.

RV1 quedó implementada el 6 de septiembre de 2026: modelos y adaptadores de presentación, consultas separadas por sesión/sucursal, invalidación, descarte de respuestas obsoletas, limpieza de datos sensibles, entradas sin fallback mock, runner unitario y fixture E2E aislado. Evidencia y comandos: `docs/SCHEDULER_RV1_PRESENTATION_BOUNDARY.md`. La captura E2E permanece pendiente por B06.

RV2 quedó implementada el 6 de septiembre de 2026: la Agenda aprobada vuelve a ser la interfaz operativa y consume catálogo, paginación completa de citas, horarios/excepciones/bloqueos, disponibilidad, clientes y mutaciones canónicas. Integra día/semana/lista, versiones, idempotencia, conflictos y consultas sensibles separadas; finanzas permanece en sólo lectura. Evidencia: `docs/SCHEDULER_RV2_AGENDA_RESTORATION.md`. La comparación visual y los recorridos con API/BD desechable permanecen pendientes por B06.

RV3 quedó implementada el 6 de septiembre de 2026: Clientes recupera cabecera, filtros, tabla, vacíos, paginación y diálogos aprobados sobre la identidad compartida. Alta/edición cubre perfil, procedencia, alias, correos y campos por comercio/sucursal; la fusión usa versiones y autorización ligada. Expediente, visitas y finanzas se desbloquean por separado, expiran y se purgan; POS sigue siendo la autoridad financiera. Agenda y Clientes comparten adaptador e invalidación. Evidencia: `docs/SCHEDULER_RV3_CLIENTS_RESTORATION.md`. Capturas y recorridos HTTP/concurrentes permanecen pendientes por B06.

RV4 quedó implementada el 6 de septiembre de 2026: Administración recupera la presentación aprobada para comercios/sucursales, especialistas, servicios, comisiones, recursos, gift cards y colores sobre candidatos y perfiles canónicos. Integra horarios, descansos, excepciones, grupos, especialidades, asignaciones, requisitos, clases, paquetes, complementos, reglas versionadas y autorización reforzada; Agenda se invalida tras cambios. Precio/categoría masivos, identidad de sucursal, alta inicial de complementos, validación anticipada de uso de recursos y operación financiera de gift cards permanecen como brechas explícitas, no simulaciones. Evidencia: `docs/SCHEDULER_RV4_ADMINISTRATION_RESTORATION.md`. Capturas y recorridos HTTP/PostgreSQL permanecen pendientes por B06.

RV5 quedó implementada el 6 de septiembre de 2026: Configuraciones sustituye el editor JSON por formularios estructurados para las once secciones documentales, conserva la presentación aprobada, el código personal seguro, precedencia y permisos. La respuesta resuelta incluye el documento autorizado de cada capa para editar sólo el alcance seleccionado; el frontend aplica únicamente paths modificados y preserva claves desconocidas. Cada campo declara su efecto real y ninguno se presenta como consumidor operativo cuando no existe; secretos permanecen fuera del documento. La densidad visual de Agenda sigue local. Evidencia: `docs/SCHEDULER_RV5_SETTINGS_RESTORATION.md`. Capturas y persistencia HTTP/PostgreSQL permanecen pendientes por B06.

RV6 quedó implementada el 6 de septiembre de 2026: Encuestas, Consentimientos y Comunicaciones recuperan sus paneles aprobados sobre snapshots versionados, servicios canónicos, storage privado, preferencias de contacto y outbox real. Encolado, aceptación del proveedor, entrega y lectura son estados distintos; sólo `FAILED` admite reintento manual y ningún control activa el proveedor. Consentimientos cubre versiones, asignación, firma/revocación y URLs efímeras con autorización; Clientes integra expediente médico cifrado y soportes con autorizaciones independientes y purga temporal. Tokens/respuestas permanecen fuera de Administración y sus métricas continúan en RV7. Evidencia: `docs/SCHEDULER_RV6_ENGAGEMENT_RESTORATION.md`. Capturas, storage, proveedor sandbox y recorridos HTTP/PostgreSQL permanecen pendientes por B06.

RV7 quedó implementada el 6 de septiembre de 2026: Reportes recupera la jerarquía, filtros, tarjetas, series, rankings, tablas y navegación aprobadas sobre los doce datasets canónicos. Pantalla pagina hasta `total`; exportación vuelve a construir el conjunto completo mediante `/exports` y produce CSV/XLSX/PDF después de autorizar y auditar. Locales, Mensajería móvil, Métricas y Servicios dejan de redirigir; los desgloses por local usan `branchId` canónico y alcance de bootstrap. Resumen, Ventas, Encuestas y Recordatorios declaran sus límites sin inventar comparación, cuota, ingresos atribuidos o respuestas por pregunta. Evidencia: `docs/SCHEDULER_RV7_REPORTS_RESTORATION.md`. Capturas y paridad HTTP/PostgreSQL permanecen pendientes por B06.

RV8 quedó implementada el 6 de septiembre de 2026: las 19 entradas de App Router tienen un guard automatizado contra rutas faltantes, imports rotos, mocks alcanzables y persistencia operativa local. Se retiraron 36 archivos históricos sin consumidores, se eliminó la última clave local de horarios, se agregó revalidación de sesión/permisos y se impide que un bootstrap tardío restaure otra identidad. Los workspaces se dividen por módulo, reduciendo el JS inicial operativo de 359 kB a 89.7–89.8 kB; los generadores de exportación siguen diferidos. Se documentó la candidata y el rollback exclusivamente frontend. Evidencia: `docs/SCHEDULER_RV8_RELEASE_CANDIDATE.md`. Los recorridos Playwright, comparación integral y escritura/concurrencia sobre API/PostgreSQL permanecen pendientes por B06; la fase no está validada ni autoriza despliegue.

Este plan complementa `PLAN_BACKEND_SCHEDULER.md`: sus contratos, seguridad y reglas de negocio siguen vigentes. Corrige la presentación introducida durante su integración frontend. Las fases de este documento usan el prefijo **RV** para diferenciarlas de las fases del plan backend.

### Reglas de ejecución

- `e9077dd` es la referencia visual obligatoria; no introducir un rediseño aprovechando la conexión de datos.
- Reutilizar los componentes aprobados y extraer su lógica de datos. Un componente histórico no se vuelve apto para operación sólo por volver a montarlo.
- Conservar autenticación real, bootstrap, permisos, alcance, autorizaciones secundarias, auditoría, versiones e idempotencia.
- No restaurar íntegramente el commit antiguo, revertir fases completas ni copiar ciegamente archivos históricos sobre las integraciones actuales.
- No activar `mockModeEnabled` para recuperar el visual operativo ni usar mocks como fallback cuando falle la API.
- Cambios previstos: frontend Scheduler, adaptadores/hooks, pruebas y documentación. Reutilizar `@cosmetics/ui`; no personalizar componentes compartidos de forma que altere otras apps.
- Si aparece una brecha que exige backend, Prisma, variables de entorno, nuevos proveedores o cambiar reglas de negocio, documentar el contrato faltante y su propuesta antes de ampliar el alcance. Una brecha de un módulo no impide avanzar en trabajo independiente.
- Los cambios de semántica ya exigidos por el backend se adaptarán con el lenguaje visual aprobado. Toda diferencia visual material adicional se documentará para decisión del usuario/PO; no se considerará aprobada por pasar un build.
- No quitar una función visible ni sustituirla silenciosamente por una función más limitada. Las funciones históricas sin soporte real deben figurar como brechas; no se pueden declarar operativas mediante simulación.

## 2. Diagnóstico de partida y evidencia

La auditoría previa contrastó el historial local con GitHub MCP. La rama remota y el HEAD local coincidían al inspeccionarlos. No se verificó en esa auditoría el funcionamiento del backend desplegado ni la paridad visual mediante capturas.

| Commit                                                                                                | Cambio comprobado                                        | Consecuencia                                                         |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| [e9077dd](https://github.com/minnica/keysarcosmetics/commit/e9077ddad945325b1a132962ce0c2fcd9ae7f74a) | Ajustes del calendario y sticky                          | Referencia visual aprobada                                           |
| [07c3b27](https://github.com/minnica/keysarcosmetics/commit/07c3b27c3e253a2e383292c0dbf7e0be48ea1979) | Creación del plan backend                                | Solicitó integración frontend; no especificó rediseñar las pantallas |
| [502f8d5](https://github.com/minnica/keysarcosmetics/commit/502f8d5d0ff0444227fd4715d6d7054324f40fb6) | Fase 1: login, permisos y códigos seguros                | Primeros cambios visibles posteriores a la aprobación                |
| [1759028](https://github.com/minnica/keysarcosmetics/commit/1759028fc13df679669b5cab84e75797b40b14f6) | Fase 2: `OperationalCatalogWorkspace`                    | Sustitución de secciones administrativas                             |
| [c950f7f](https://github.com/minnica/keysarcosmetics/commit/c950f7fb6319ae527b7e624af1a477f2f42bb5f5) | Fase 9: entradas y workspaces API nuevos                 | Sustitución general de la experiencia en modo normal                 |
| [9784c1b](https://github.com/minnica/keysarcosmetics/commit/9784c1b222dc2aa69cb304a5b492eeb1786ac980) | Merge posterior; metadata de release en layout Scheduler | No originó la sustitución del calendario                             |

Desde RV1, `SchedulerPageEntries.tsx` selecciona exclusivamente workspaces API hasta que cada presentación restaurada esté conectada; `mockModeEnabled` no activa componentes, permisos ni alcance simulados. Los archivos `globals.css`, `SchedulerAgendaGrid.tsx`, `SchedulerAgendaList.tsx`, `SchedulerHeader.tsx`, `SchedulerSidebar.tsx` y `SchedulerBookingCard.tsx` no presentaban diferencias visuales entre la referencia y el HEAD auditado. Otros archivos históricos sí recibieron cambios de seguridad y deben compararse individualmente.

El backend devuelve citas, profesionales, recursos, horarios, estados y versiones suficientes para reconstruir el calendario. Esto demuestra viabilidad arquitectónica, pero no garantiza que todos los campos y acciones del frontend histórico tengan cobertura: esa comprobación corresponde a RV0.

## 3. Estado y orden de ejecución

| Fase | Entrega                                                 | Dependencia  | Estado                             |
| ---- | ------------------------------------------------------- | ------------ | ---------------------------------- |
| RV0  | Inventario y referencia visual reproducible             | Ninguna      | Implementada; validación pendiente |
| RV1  | Separación de presentación, contratos y datos de prueba | RV0          | Implementada; validación pendiente |
| RV2  | Agenda aprobada conectada de punta a punta              | RV1          | Implementada; validación pendiente |
| RV3  | Clientes, expediente e históricos                       | RV2 validada | Implementada; validación pendiente |
| RV4  | Administración y catálogos                              | RV3          | Implementada; validación pendiente |
| RV5  | Formularios de Configuraciones                          | RV4          | Implementada; validación pendiente |
| RV6  | Comunicaciones, documentos y encuestas                  | RV5          | Implementada; validación pendiente |
| RV7  | Reportes y exportaciones                                | RV6          | Implementada; validación pendiente |
| RV8  | Verificación integral, limpieza y entrega               | RV2–RV7      | Implementada; validación pendiente |

Estados permitidos: `Pendiente`, `En curso`, `Implementada; validación pendiente`, `Validada`, `Bloqueada`. Registrar el motivo exacto de un bloqueo y el trabajo independiente que puede continuar. Los estados de módulos pueden ser diferentes dentro de una fase.

No marcar una fase `Validada` sólo porque compila. Exige evidencia visual y funcional apropiada. Si falta un ambiente, declarar lo que sí se verificó y conservar pendiente la validación que depende de él.

## 4. Matriz inicial de superficies

En esta tabla, `components/` y `lib/` son relativos a `apps/scheduler/src/`; los nombres de archivo sin directorio comparten el de su componente asociado. Esta matriz es un punto de partida y debe ampliarse en RV0 con cada ruta, pestaña, modal y acción visible.

| Superficie                          | Presentación existente para reutilizar                                                             | Integración actual para conservar/adaptar                                           | Brecha a comprobar                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Shell y navegación                  | `components/layout/SchedulerLayoutShell.tsx`, `SchedulerAppSidebar.tsx`                            | `lib/session.tsx`, `SchedulerAccessGuard.tsx`                                       | Scroll, sticky, `?section=`, permisos y retorno por URL                                          |
| Agenda                              | `components/SchedulerWorkspace.tsx`, `components/scheduler/*`                                      | `components/api/ApiAgendaWorkspace.tsx`; citas, disponibilidad, bloqueos, catálogos | Semana sin fixtures, recursos, estados, paginación, teléfono/precio/avatar y múltiples servicios |
| Clientes                            | `components/clients/ClientsWorkspace.tsx`, `ClientsDatabase.tsx`; diálogos de historial            | `components/api/ApiClientsWorkspace.tsx`; búsqueda, escritura, fusión e históricos  | Campos canónicos, permisos, paginación y consultas sensibles                                     |
| Administración base                 | `components/administration/AdministrationWorkspace.tsx`                                            | `OperationalCatalogWorkspace.tsx`; candidatos y catálogo operativo                  | Diferenciar entidad existente y activación de perfil; asignaciones y horarios                    |
| Administración avanzada             | Paneles históricos de Servicios, Comisiones, Recursos, Gift Cards y Colores                        | `components/api/ApiAdministrationWorkspace.tsx`; contratos administrativos          | Cobertura de cada acción, archivos masivos, configuración de colores y datos comerciales         |
| Configuraciones                     | `components/settings/SettingsWorkspace.tsx`                                                        | `components/api/ApiSettingsWorkspace.tsx`; `resolvedSetting` y `updateSetting`      | Formularios frente al editor JSON, capas y efectos reales de cada preferencia                    |
| Comunicaciones/documentos/encuestas | Paneles administrativos y `components/clients/RemindersWorkspace.tsx`, `SurveyReportWorkspace.tsx` | Contratos de engagement y reportes                                                  | Edición frente a consulta, cargas privadas, tokens y proveedor deshabilitado                     |
| Reportes                            | `components/reports/ReportsWorkspace.tsx`, `ReservationReportWorkspace.tsx` y desgloses            | `components/api/ApiReportsWorkspace.tsx`; `report` y `exportReport`                 | Correspondencia KPI/serie, navegación profunda, agrupaciones y exportación completa              |

Archivos de integración comunes: `apps/scheduler/src/lib/api.ts`, `apps/scheduler/src/components/api/ApiState.tsx`, `packages/types/src/scheduler.ts` y `packages/api-client/src/index.ts`.

## 5. Reglas funcionales que condicionan la restauración

| Tema                     | Tratamiento requerido                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datos e identificadores  | Usar IDs canónicos. No inferir relaciones por nombres ni generar clientes/profesionales ficticios para satisfacer el layout.                                                                                                                   |
| Columnas de calendario   | Representar profesional, recurso y cola como conceptos distintos en el modelo de presentación. Una columna con nombre de cabina debe mapear un recurso real.                                                                                   |
| Citas pendientes         | Puede mantenerse una representación visual de pendientes, pero `PENDING` actualmente ocupa disponibilidad. Comprobar si el flujo requiere citas sin asignación y si existe contrato; no asumir que una cola sin profesional ya está soportada. |
| Asistencia               | Distinguir `ARRIVED` de `ATTENDED`; no mapear ambos al antiguo `arrived`. Revisar etiquetas, colores, filtros y transiciones.                                                                                                                  |
| Fecha y hora             | Convertir UTC usando la zona IANA de la sucursal. Separar posición/altura visual de disponibilidad real de 15 minutos. Cubrir medianoche y operación de 24 horas.                                                                              |
| Disponibilidad           | Consultar y revalidar en servidor. El cálculo visual local no autoriza una reserva; conservar límites, capacidades y excepciones con autorización.                                                                                             |
| Cancelaciones            | Cancelar citas/bloqueos con motivo y versión; conservar historial. Ajustar la acción histórica de eliminar a esa semántica.                                                                                                                    |
| Mutaciones               | `expectedVersion` cuando corresponda; claves de idempotencia estables para reintentar la misma intención de alta. Evitar doble envío y conservar el formulario ante `409`.                                                                     |
| Finanzas                 | POS conserva pagos, membresías y correcciones. Históricos financieros de Scheduler son de sólo lectura y protegidos; no reintroducir edición/borrado local de pagos.                                                                           |
| Seguridad                | Conservar JWT, validación de alcance, capacidades y autorizaciones de un solo uso ligadas al objetivo. No restaurar códigos embebidos ni listar secretos de otros usuarios.                                                                    |
| Configuración            | Respetar `COMMERCE → BRANCH → USER`. No copiar todo el documento efectivo a una capa, sobrescribir claves ajenas ni recuperar configuraciones mock como datos operativos.                                                                      |
| Datos visuales faltantes | Documentar origen o ausencia de avatar, precio, contacto, leyendas y métricas. Mostrar ausencia honesta; cualquier ampliación de DTO debe mantener autorización y evitar consultas individuales masivas.                                       |

## 6. Fases de implementación

### RV0 — Inventario y referencia visual reproducible

Objetivo: fijar qué debe recuperarse y qué diferencias funcionales son necesarias antes de editar la app.

- [x] Leer `CLAUDE.md`, este plan y los apartados aplicables del plan backend. Registrar rama, HEAD y cambios locales existentes.
- [x] Comparar referencia y HEAD vigente; confirmar el inventario de rutas incluyendo enlaces profundos, redirects, pestañas y diálogos. Revisar también desgloses de reservas: servicios, locales, métricas, mensajería móvil, servicios por local y prestadores por local.
- [x] Ampliar la matriz con: ruta/estado, captura o referencia, componente, lectura API, mutación API, permiso, brecha, prueba y estado.
- [x] Preparar la referencia en un checkout/directorio aislado, sin reemplazar el árbol de trabajo actual ni operar contra datos reales desde el código antiguo.
- [ ] Capturar baseline con datos ficticios deterministas, misma fecha, fuentes y viewport. Cubrir `1536×864`, `1366×768`, `1280×720`, `1280×600` y móvil `390×844`; añadir `360×800` para revisar desbordamientos.
- [x] Verificar infraestructura disponible para tests locales, API y PostgreSQL desechable. Registrar qué está disponible realmente; los estados históricos de despliegue no son evidencia actual.
- [x] Registrar diferencias semánticas necesarias y brechas de contrato. Separar carencias ya existentes de regresiones introducidas al restaurar.

Estado RV0 (6 de septiembre de 2026): `apps/e2e/scripts/capture-scheduler-reference.mjs` deja reproducible el baseline sin levantar el código antiguo como servicio ni consultar API/BD. La copia aislada de `e9077dd` instaló 976 paquetes desde el store offline y su build produjo 20 páginas. La captura permanece pendiente: el sandbox rechaza `listen` con `EPERM` y los binarios Chromium terminan con `Operation not permitted`/`SIGTRAP` al inicializar su sandbox interno o Crashpad. Evidencia, manifiesto y comando de repetición: `docs/SCHEDULER_VISUAL_RESTORATION_BASELINE.md`.

**Criterio de salida:** inventario completo, referencia reproducible y brechas clasificadas. Evidencia sugerida: `docs/SCHEDULER_VISUAL_RESTORATION_BASELINE.md`, creado durante esta fase, con rutas de capturas/artefactos y matriz ampliada. Las capturas nunca deben contener PII ni secretos.

### RV1 — Capa de presentación y acceso a datos

Objetivo: alimentar los componentes aprobados mediante la API y permitir probar su apariencia con datos controlados.

- [x] Extraer tipos, constantes de presentación y utilidades puras que hoy están mezclados con módulos `mock-*`. Revisar imports transitivos, especialmente utilidades de calendario y datos semanales.
- [x] Definir modelos de presentación tipados para columnas, citas, servicios, bloqueos, estados y datos opcionales; conservar IDs, versiones y participantes del DTO canónico sin aplanamientos que pierdan información.
- [x] Adaptar `useSchedulerQuery`/mutaciones existentes o su equivalente para filtros, invalidación, descarte de respuestas obsoletas y separación por sesión/sucursal. Verificar su comportamiento antes de reutilizarlo.
- [x] Mantener estado visual local legítimo: vista, filtros, panel abierto, densidad y borradores. Limpiar datos sensibles al cerrar sesión o perder autorización.
- [x] Definir el cambio de entrada por módulo: activar la vista restaurada cuando esté lista, conservando las demás entradas mientras se trabajan. El retorno temporal debe apuntar a una vista API, nunca a mocks operativos.
- [x] Preparar pruebas visuales que inyecten DTOs ficticios en la misma presentación que usará producción, aisladas del modo normal. No exponer un bypass de sesión o permisos.
- [x] Probar conversiones con fechas, estados, recursos, citas multi-servicio y campos ausentes. Definir runner de pruebas apropiado si hace falta; hoy Scheduler no declara script `test` propio.

Estado RV1 (6 de septiembre de 2026): la frontera y su runner están implementados. Los chunks productivos no contienen identificadores de los fixtures revisados. La prueba visual controlada conserva sesión y permisos reales, pero no se ejecutó porque B06 impide iniciar app/Chromium en este sandbox; por ello la fase no se marca `Validada`. Evidencia: `docs/SCHEDULER_RV1_PRESENTATION_BOUNDARY.md`.

**Criterio de salida:** frontera de datos y presentación verificada; los componentes operativos no dependen de fixtures transitivos, secretos locales ni datos simulados de reserva.

### RV2 — Agenda aprobada con persistencia real

Objetivo: completar el primer recorrido de punta a punta y usarlo como patrón para los siguientes módulos.

- [x] Recuperar `SchedulerHeader`, panel de recursos, `SchedulerAgendaGrid`, `SchedulerAgendaList`, tarjetas y diálogos. Aplicar el comportamiento sticky/viewport a la Agenda restaurada en modo normal, sin romper el scroll de otras rutas.
- [x] Conectar comercio/sucursal autorizados, columnas de profesionales/recursos, búsqueda, filtros, calendario mensual y vistas día/semana. Cargar todas las páginas necesarias del rango visible; no limitar silenciosamente a las primeras 100 citas.
- [x] Dibujar horarios, excepciones, bloqueos, colores de estado, servicios y participantes desde datos canónicos. No fijar el horario operativo a los ejemplos del baseline.
- [x] Integrar búsqueda/selección de cliente y el alta necesaria para el flujo de nueva cita mediante API. La restauración completa de Clientes se realiza en RV3.
- [x] Conectar creación, edición, movimiento, cancelación, transiciones y creación/edición/cancelación de bloqueos desde los diálogos aprobados. Sustituir los `window.prompt` de la vista simplificada por formularios consistentes con esos diálogos.
- [x] Mantener versiones, idempotencia y manejo de respuestas `401`, `403`, `409`, errores de red y reintentos. Recalcular/refrescar disponibilidad tras mutaciones.
- [x] Integrar consulta autorizada de ficha e históricos desde las tarjetas, reutilizando la capa de Clientes; los pagos siguen siendo de sólo lectura.
- [ ] Comparar visualmente filtros abiertos/cerrados, cuatro columnas y muchas columnas, día/semana/lista, modales, estados vacíos y pantallas pequeñas con la referencia.
- [ ] Verificar contra API y BD de prueba: crear → recargar → editar/mover → cambiar estado → cancelar; bloquear → editar → cancelar; dos sesiones y conflicto de versión/capacidad.

Estado RV2 (6 de septiembre de 2026): implementación local completa y checks técnicos correctos. Las dos tareas de evidencia permanecen abiertas porque el sandbox no permite iniciar servidor/Chromium ni ofrece PostgreSQL desechable. Ver `docs/SCHEDULER_RV2_AGENDA_RESTORATION.md`; no marcar `Validada` hasta ejecutar y revisar ambos recorridos en un host compatible.

**Criterio de salida:** Agenda recuperada visualmente y recorridos persistentes verificados. La semana no usa `schedulerWeekBookings`. Las brechas de Agenda deben quedar resueltas o aceptadas explícitamente como pendientes antes de declarar validada la fase.

### RV3 — Clientes, expediente e históricos

- [x] Recuperar listado, búsqueda, filtros, paginación, formularios y diálogos aprobados con sus campos reales.
- [x] Conectar alta/edición, procedencia, alias, teléfonos/correos, campos personalizados y fusión versionada cuando corresponda al inventario.
- [x] Conservar autorizaciones independientes de un solo uso para perfil, visitas y finanzas, con emisión/consumo en el endpoint correcto. Cubrir expiración, denegación y reapertura.
- [x] Compartir la consulta de cliente con Agenda sin mantener dos identidades o historiales locales divergentes. Invalidar ambas vistas después de editar o fusionar.
- [ ] Verificar duplicados y cambios concurrentes, alcance de sucursal, históricos paginados, lectura financiera y recarga de datos. La lógica y los estados quedaron conectados; falta el recorrido HTTP/PostgreSQL desechable por B06.
- [ ] Comparar listado, vacíos y diálogos con la referencia. Las subsecciones de recordatorios/encuestas se completan en RV6/RV7, manteniendo sus rutas.

Estado RV3 (6 de septiembre de 2026): implementación local completa y checks técnicos correctos. La dependencia visual de RV2 y las dos últimas tareas permanecen abiertas por B06; la solicitud explícita de esta sesión autorizó avanzar en el trabajo independiente de RV3 sin declarar validada ninguna de las dos fases. Ver `docs/SCHEDULER_RV3_CLIENTS_RESTORATION.md`.

**Criterio de salida:** experiencia de Clientes e históricos restaurada, con identidad compartida, privacidad y persistencia verificadas.

### RV4 — Administración y catálogos

- [x] Restaurar paneles y modales de comercios/sucursales, profesionales, servicios, clases, paquetes, complementos, grupos, especialidades, horarios y recursos según inventario.
- [x] Integrar selección de candidatos existentes y activación de perfiles con los métodos usados por `OperationalCatalogWorkspace`. Distinguir IDs de entidad y perfil, baja lógica y vigencia.
- [x] Conectar asignaciones, compatibilidades, capacidad, horarios, descansos y excepciones; invalidar catálogos/Agenda cuando cambien.
- [x] Recuperar comisiones, gift cards y colores de estados desde contratos reales. Conservar versionado, alcance global y autorización secundaria para colores.
- [x] Verificar cada acción histórica contra el contrato: importación/exportación masiva de precios, identidad/contacto/imagen, saldos y redención de gift cards pueden requerir trabajo adicional. No declarar soportadas esas operaciones sólo porque existía un botón mock.
- [x] Mantener Nómina como autoridad del pago final de comisiones y POS como autoridad comercial. No duplicar catálogos o cálculos financieros.
- [ ] Validar visual y funcionalmente cada sección, incluidos formularios largos, horarios y tablas en móvil.

Estado RV4 (6 de septiembre de 2026): implementación local completa y checks técnicos correctos. La presentación operativa no importa fixtures; el runner visual cubre siete secciones en escritorio y Servicios móvil, pero no se ejecutó porque B06 impide iniciar servidor/Chromium. Las mutaciones y efectos sobre Agenda requieren API/PostgreSQL desechable. Ver `docs/SCHEDULER_RV4_ADMINISTRATION_RESTORATION.md`; no marcar `Validada` hasta revisar ambas evidencias.

**Criterio de salida:** secciones administrativas restauradas con CRUDs reales, permisos y efectos comprobados sobre Agenda. Cada función sin cobertura tiene una decisión registrada, sin reducir silenciosamente el alcance.

### RV5 — Formularios de Configuraciones

- [x] Recuperar los formularios aprobados de Empresa, Sitio web, Agenda, Pagos Keysar, Recordatorios, Fichas médicas, E-mails, Integraciones, Notificaciones, Clientes y Encuestas.
- [x] Documentar por campo: clave, tipo, valor predeterminado, alcance, permiso y consumidor real. Persistir una clave JSON no demuestra que tenga efecto sobre el producto.
- [x] Adaptar lectura/escritura a documentos versionados conservando claves desconocidas y distinguiendo valores heredados de overrides. Verificar la semántica del endpoint antes de enviar cambios de una capa.
- [x] Evitar que cambiar sección/comercio/sucursal/capa mezcle borradores o guarde datos en otro contexto. Conservar advertencia de cambios sin guardar y recuperación ante `409`.
- [x] Usar los formularios aprobados como interfaz; no entregar el editor JSON genérico como sustituto de las pantallas anteriores.
- [x] Mantener el formulario seguro de código personal con contraseña actual. No restaurar listados de códigos visibles de otros usuarios.
- [ ] Conservar local sólo preferencias visuales permitidas; configuraciones operativas usan servidor. Probar herencia, recarga y ausencia de secretos en documentos. La separación local/servidor, la herencia pura y la omisión de campos de secretos tienen cobertura local; falta el recorrido HTTP/recarga y la inspección de ambiente por B06.

Estado RV5 (6 de septiembre de 2026): implementación local completa y checks técnicos correctos. El runner visual cubre cuatro secciones en escritorio y Clientes móvil; la persistencia conserva el documento propio de la capa y sólo aplica paths modificados. No se ejecutaron capturas ni recorridos con API/PostgreSQL desechables porque B06 continúa vigente. Ver `docs/SCHEDULER_RV5_SETTINGS_RESTORATION.md`; no marcar `Validada` hasta revisar esas evidencias.

**Criterio de salida:** formularios restaurados y persistentes, con alcance y efectos identificados por campo; ninguna capa recibe accidentalmente los valores efectivos de las demás.

### RV6 — Comunicaciones, documentos y encuestas

- [x] Recuperar paneles de WhatsApp/comunicaciones, plantillas, consentimientos, documentos, encuestas y las acciones aplicables de recordatorios/expediente médico identificadas en RV0.
- [x] Integrar plantillas versionadas, outbox, estados/reintentos y preferencias de contacto; diferenciar encolado de entrega confirmada. Mantener idempotencia y consentimiento.
- [x] Integrar carga/consulta de documentos privados y autorizaciones para datos sensibles. No persistir URLs firmadas como enlaces permanentes ni exponer rutas internas.
- [x] Conectar definiciones de encuestas según los contratos disponibles; conservar respuestas inmutables y tokens fuera de la presentación general. Los resultados agregados permanecen en RV7.
- [ ] Verificar estados con proveedor deshabilitado, error, pendiente y completado mediante entornos de prueba; no activar envíos reales para probar el visual. Los estados, retry y mensajes explicativos tienen cobertura local; falta el recorrido HTTP con proveedor disabled/sandbox por B06.
- [ ] Comparar paneles, tablas y modales; coordinar las vistas de métricas con RV7. El runner determinista cubre tres paneles en escritorio y Comunicaciones móvil; falta ejecutar y revisar capturas por B06.

Estado RV6 (6 de septiembre de 2026): implementación local completa y checks técnicos correctos. Encuestas y plantillas conservan versiones/conflictos; las intenciones son idempotentes; consentimientos, expediente y documentos usan storage/autorizaciones sin persistir URLs; proveedor, tokens y respuestas permanecen fuera de la UI general. No se ejecutaron capturas, bucket privado ni recorridos con API/PostgreSQL/proveedor porque B06 continúa vigente. Ver `docs/SCHEDULER_RV6_ENGAGEMENT_RESTORATION.md`; no marcar `Validada` hasta revisar esas evidencias.

**Criterio de salida:** interfaces de engagement restauradas con estados reales y controles de privacidad; pruebas externas que requieran storage/proveedor se reportan separadamente si aún faltan.

### RV7 — Reportes y exportaciones

- [x] Restaurar resumen, reservas, historial, rendimiento, ventas, reportes de encuestas, recordatorios y todos los desgloses del inventario. Mantener URLs y navegación autorizada.
- [x] Mapear cada tarjeta, KPI, columna y serie histórica a un dataset/agrupación del backend. Documentar explícitamente qué información no proporciona aún la API.
- [x] Mantener filtros comunes de periodo, sucursal, zona horaria y permisos. No reconstruir indicadores sobre una página parcial de resultados ni inventar series para rellenar gráficos.
- [x] Alimentar la presentación aprobada con `report`; exportar mediante `exportReport` sobre el conjunto completo, con auditoría y autorizaciones aplicables.
- [x] Verificar los formatos de descarga realmente soportados; RV7 genera CSV, XLSX y PDF desde el dataset autorizado completo.
- [ ] Probar paridad pantalla/exportación, ausencia de doble conteo POS/legado, vacíos y permisos de sólo lectura/exportación; comparar visualmente gráficos y tablas con datos equivalentes. La paginación/mapeo tiene cobertura unitaria y el runner determinista cubre seis pantallas; faltan capturas y recorridos HTTP/PostgreSQL por B06.

Estado RV7 (6 de septiembre de 2026): implementación local completa y checks técnicos correctos. Los workspaces operativos ya no usan datasets mock; los desgloses profundos están montados y los formatos CSV/XLSX/PDF consumen `/exports`. Comparación visual, permisos parciales y paridad con exportación real permanecen pendientes en ambiente desechable. Ver `docs/SCHEDULER_RV7_REPORTS_RESTORATION.md`; no marcar `Validada` hasta revisar esa evidencia.

**Criterio de salida:** cada cifra tiene fuente canónica y la presentación recupera la referencia. Las brechas de agregación/formato quedan resueltas o explícitamente pendientes, nunca simuladas.

### RV8 — Verificación integral, limpieza y entrega

- [x] Revisar toda la matriz RV0 y los enlaces profundos. Confirmar que ninguna ruta visible escapa a la restauración o vuelve a servir datos mock.
- [ ] Ejecutar comparaciones visuales finales y recorridos integrados entre Agenda, Clientes, Administración, Configuraciones y Reportes. Registrar diferencias intencionales y su decisión.
- [ ] Verificar login/logout, sesión vencida, pérdida de permisos, alcance por sucursal/profesional, doble envío, conflictos y ausencia de datos sensibles al cambiar usuario.
- [x] Retirar componentes/workspaces simplificados sólo después de comprobar que ya no tienen consumidores ni funciones exclusivas pendientes. Conservar helpers y contratos útiles; los fixtures quedan aislados en pruebas/desarrollo.
- [x] Revisar imports transitivos y chunks de una sesión normal, además de accesos a `localStorage`: no deben cargar ni persistir datos operativos simulados.
- [x] Ejecutar las comprobaciones técnicas aplicables, actualizar `CLAUDE.md` y enlazar evidencia de cierre desde este plan.
- [x] Documentar la versión candidata y una reversión de frontend a un commit conocido compatible, sin revertir migraciones ni cambiar el proveedor POS para corregir un problema visual.

Estado RV8 (6 de septiembre de 2026): implementación local completa. El guard RV8 cubre las 19 páginas, el grafo fuente, almacenamiento y carga diferida; sesión vencida y revocación de permisos tienen recorridos E2E descubiertos. Las dos tareas integrales permanecen abiertas porque B06 impide ejecutar Chromium/servidores y no ofrece PostgreSQL desechable. Ver `docs/SCHEDULER_RV8_RELEASE_CANDIDATE.md`; no marcar `Validada` ni desplegar hasta revisar esa evidencia.

**Criterio de salida:** presentación aprobada recuperada en todo el alcance acordado, backend integrado, evidencia visual/funcional disponible y sin brechas ocultas. El despliegue por ambiente es un paso operativo separado sujeto al runbook y a su autorización vigente.

## 7. Estrategia de validación

### Evidencia visual

Comparar referencia y restauración usando el mismo conjunto determinista de datos, fecha, zona horaria, navegador, fuentes y viewport. Incluir vistas normales y estados de vacío, carga, error, conflicto y sólo lectura. Evitar que datos diferentes oculten una regresión de estructura, densidad, color o controles.

La referencia debe provenir de `e9077dd`, no de los API workspaces simplificados. No actualizar snapshots automáticamente para hacer pasar una diferencia. Registrar y revisar cada diferencia material; controlar por separado variaciones esperadas del navegador, antialiasing y contenido dinámico. Las ampliaciones funcionales sin equivalente histórico se revisan por consistencia con el diseño aprobado.

### Evidencia funcional

Las pruebas de adaptadores y las capturas con DTOs de prueba no sustituyen pruebas API/BD. Probar escrituras únicamente en una base/ambiente desechable con datos técnicos, comprobando persistencia después de recargar y concurrencia entre sesiones.

`apps/e2e/development/scheduler.development.spec.ts` actualmente hace comprobaciones básicas de apertura de Agenda, Clientes y Reportes mediante un helper de sólo lectura. No basta para validar mutaciones ni fidelidad visual. Conservar su guard de escritura y preparar suites separadas para los recorridos mutantes sobre entorno desechable. Revisar `apps/e2e/playwright.visual.config.ts` antes de extenderlo: la existencia de pruebas visuales compartidas no significa que ya cubran Scheduler.

Si faltan PostgreSQL, storage o proveedor de prueba, continuar trabajo local independiente y registrar el caso pendiente, ambiente requerido y comando/pasos para repetirlo. No usar una base productiva como sustituto.

### Comandos existentes

Desde la raíz, para fases que modifiquen Scheduler:

```bash
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler build
git diff --check
```

Para cambios en E2E:

```bash
pnpm --filter @cosmetics/e2e type-check
pnpm --filter @cosmetics/e2e lint
```

Registrar en la fase el comando exacto de cualquier nueva suite y sus prerrequisitos. Desde RV1 existe `pnpm --filter @cosmetics/scheduler test`; conservar `.next-dev` para desarrollo y `.next` para build según la configuración vigente.

Si se autoriza modificar paquetes compartidos o API, añadir sus comprobaciones y pruebas de consumidores afectados. Para API/Prisma seguir además las validaciones de `CLAUDE.md` y el plan backend. Un cambio sólo documental requiere revisión de enlaces, coherencia del plan y `git diff --check`, sin reconstruir la app.

## 8. Brechas y decisiones pendientes

La auditoría identificó estos puntos a verificar, no incompatibilidades visuales insalvables:

| ID  | Punto                                                                                     | Próxima acción                                                                                                                                                                                                                                                                                                                         | Estado                                               |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| B01 | Teléfono, precio, avatar y detalles por tarjeta no están todos en el DTO de cita          | Ficha autorizada bajo demanda; definir contrato agregado para precio/avatar sin N+1                                                                                                                                                                                                                                                    | Parcial RV2; precio/avatar agregados pendientes      |
| B02 | Pendientes sin profesional/recurso asignado                                               | El validador exige al menos un profesional por servicio; decidir si se amplía el contrato                                                                                                                                                                                                                                              | RV2 no inventa cola; decisión backend pendiente      |
| B03 | Formularios administrativos, archivos masivos y capacidades mock sin contrato equivalente | RV4 restaura CRUDs canónicos y registra sin simular identidad de sucursal, precios/categorías masivos, candidatos de complementos, validación anticipada de uso de recursos y operación financiera de gift cards; Clientes mantiene importación/audiencias/reporte de fichas y RV6 resuelve engagement, expediente médico y documentos | Parcial RV3/RV4/RV6; resolver contratos comerciales  |
| B04 | Persistencia JSON frente a efectos reales de Configuraciones                              | RV5 documenta cada campo, identifica la ausencia de consumidores y la muestra en UI; conectar efectos futuros exige contrato y pruebas propias                                                                                                                                                                                         | Resuelta RV5; consumidores futuros fuera de alcance  |
| B05 | KPIs, series y formatos históricos frente a los datasets actuales                         | RV7 mapea los doce datasets, pagina pantalla hasta `total` y genera CSV/XLSX/PDF desde `/exports`; comparación/paridad real pendiente por B06                                                                                                                                                                                          | Resuelta en código RV7; validación externa pendiente |
| B06 | Ambiente reproducible para referencia y pruebas de escritura                              | RV8 confirma build, grafo y chunks; Chromium, puertos y PostgreSQL desechable siguen no disponibles en sandbox                                                                                                                                                                                                                         | RV0/RV8; captura, E2E y BD pendientes                |
| B07 | Cobertura real de rutas profundas y redirecciones                                         | RV7 monta Locales, Mensajería, Métricas y Servicios; agrega rutas dinámicas por `branchId` y conserva `opatra-mexico` sólo como alias al selector                                                                                                                                                                                      | Resuelta RV7                                         |
| B08 | El fixture permite mutar pagos y borrar historial financiero                              | Conservar POS como autoridad y restaurar estas superficies sólo en lectura                                                                                                                                                                                                                                                             | Resuelta en Agenda RV2 y Clientes RV3                |
| B09 | La referencia redirige login y expone códigos mock                                        | Conservar login JWT, permisos y formulario seguro actual                                                                                                                                                                                                                                                                               | Decisión de seguridad RV0; transversal               |
| B10 | `/reportes/ventas` no existe en la referencia                                             | RV7 la implementa como ampliación sobre `SALES/PAYMENTS/COMMISSIONS` con lenguaje visual consistente y sin afirmar comparación píxel a píxel                                                                                                                                                                                           | Resuelta RV7                                         |

Para cada brecha nueva registrar: pantalla/acción, evidencia, contrato actual, contrato requerido, impacto visual, solución propuesta, decisión y fase responsable. Una aceptación parcial debe indicar exactamente qué sigue pendiente; no equivale al cierre de todo el plan.

## 9. Protocolo para retomar y cerrar sesiones

Al iniciar una sesión:

1. Leer `CLAUDE.md`, este plan y la última entrada de bitácora.
2. Verificar rama, HEAD y estado de trabajo; preservar cambios ajenos. No asumir que el HEAD de redacción continúa vigente.
3. Ubicar la primera tarea pendiente de la fase solicitada; revisar sus dependencias y evidencia ya existente.
4. Consultar la matriz y las brechas de ese módulo. No rehacer una auditoría/captura válida salvo que cambie su base.
5. Implementar y verificar dentro del alcance vigente. Actualizar estado y evidencia antes de terminar la sesión.

Al cerrar, registrar fecha, fase, tareas terminadas, archivos, pruebas efectivamente ejecutadas y resultado, artefactos visuales, diferencias intencionales, brechas/bloqueos, cambios sin commit y siguiente tarea concreta. No inventar un SHA para cambios sin commit ni afirmar aprobación del PO sin haberla recibido.

Plantilla de bitácora:

```text
Fecha y fase:
Rama y HEAD:
Estado:
Tareas completadas:
Archivos modificados:
Pruebas ejecutadas y resultado:
Evidencia visual (rutas/artefactos):
Diferencias funcionales/visuales y decisiones:
Brechas o validaciones pendientes:
Estado Git al cerrar:
Siguiente tarea concreta:
```

### Bitácora inicial — 6 de septiembre de 2026

- Se documentó este plan a partir de la auditoría histórica y la inspección del estado actual; se añadió su referencia en `CLAUDE.md`.
- Estado RV0–RV8: pendiente. No se han capturado baselines ni implementado restauraciones.
- Los tests/builds reportados por las fases backend son evidencia histórica, no pruebas ejecutadas para esta restauración.
- Validación documental: SHAs históricos contrastados con Git, rutas y scripts inspeccionados, tabla de fases y criterios revisados, `git diff --check` sin errores. Para el archivo nuevo se comprueba también `git diff --no-index --check /dev/null PLAN_RESTAURACION_VISUAL_SCHEDULER.md`.
- Cambios de esta sesión: archivo nuevo del plan y referencia en `CLAUDE.md`, sin commit. No se ejecutaron builds ni pruebas de aplicación porque sólo cambió documentación.
- **Siguiente tarea concreta:** iniciar RV0 ampliando la matriz de rutas, pestañas, diálogos y acciones, y preparar la referencia aislada de `e9077dd` para capturas reproducibles.

Solicitud sugerida para otra sesión:

> Lee CLAUDE.md y PLAN_RESTAURACION_VISUAL_SCHEDULER.md. Ejecuta la evidencia visual y funcional pendiente de RV2 en un host compatible, conserva e9077dd como referencia visual y el backend actual como fuente de verdad. Si RV2 queda validada, inicia RV3. Actualiza la matriz, las brechas y la bitácora con la evidencia obtenida.

### Bitácora RV0 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV0.
- **Rama y HEAD:** `feature/scheduler`, `9784c1b222dc2aa69cb304a5b492eeb1786ac980`.
- **Estado:** Implementada; validación visual pendiente por restricciones del sandbox.
- **Tareas completadas:** lectura de contexto y plan backend; comparación `e9077dd..HEAD`; inventario de rutas, redirects, pestañas, diálogos y acciones; matriz de referencia/componentes/API/permisos/pruebas; referencia aislada con `git archive`; runner determinista; diagnóstico local; clasificación B01–B10.
- **Archivos modificados:** `CLAUDE.md`, `PLAN_RESTAURACION_VISUAL_SCHEDULER.md`, `docs/SCHEDULER_VISUAL_RESTORATION_BASELINE.md`, `apps/e2e/package.json` y `apps/e2e/scripts/capture-scheduler-reference.mjs`.
- **Pruebas ejecutadas y resultado:** instalación offline de la referencia con 976 paquetes y build histórico de 20 páginas, correctos; `node --check` del runner, correcto; `pnpm --filter @cosmetics/e2e type-check`, correcto; `pnpm --filter @cosmetics/e2e lint`, correcto; `pnpm --filter @cosmetics/scheduler type-check`, correcto; `pnpm --filter @cosmetics/scheduler lint`, correcto con warnings históricos; `pnpm --filter @cosmetics/scheduler build`, correcto con 21 páginas y los mismos warnings; Prettier y `git diff --check`, correctos al cierre.
- **Evidencia visual:** manifiesto y destino `docs/artifacts/scheduler-visual-baseline/e9077dd/`; ninguna imagen generada. El comando `pnpm --filter @cosmetics/e2e capture:scheduler:reference` alcanza el lanzamiento del navegador, pero Chromium termina con `sandbox_host_linux.cc: Operation not permitted`/`SIGTRAP`. `next start` también falla con `listen EPERM`; Firefox del sistema termina con `SIGSEGV` bajo Playwright.
- **Diferencias funcionales/visuales y decisiones:** conservar login JWT, permisos, autorizaciones opacas y formulario seguro; no restaurar códigos visibles, mutaciones financieras ni borrado de citas; `/reportes/ventas` se trata como ampliación sin referencia; Configuraciones y rutas profundas requieren contratos/decisiones registrados.
- **Brechas o validaciones pendientes:** producir y revisar las capturas en los seis viewports; API/BD de prueba no están disponibles (`DATABASE_URL` ausente, sin PostgreSQL/Docker y Podman inutilizable). Las brechas de producto B01–B10 se asignaron a RV1–RV7.
- **Estado Git al cerrar:** cambios sin commit en los cinco archivos anteriores; se preservaron los cambios locales iniciales de `CLAUDE.md` y del plan.
- **Siguiente tarea concreta:** ejecutar el runner en un host donde Chromium pueda iniciar, revisar que sólo contenga fixtures y enlazar las PNG; después marcar RV0 `Validada` e iniciar RV1 con la separación presentación/datos.

### Bitácora RV1 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV1.
- **Rama y HEAD:** `feature/scheduler`, base `b1b4595619f6030c4a81beff486a32da472eccc5`.
- **Estado:** Implementada; validación visual pendiente por B06.
- **Tareas completadas:** extracción de tipos/constantes/utilidades puras; modelos y adaptadores canónicos de Agenda; distinción de columnas profesional/recurso/cola, `ARRIVED`/`ATTENDED` y campos opcionales; consultas con alcance de usuario/sucursal/filtros, invalidación y descarte obsoleto; limpieza de expediente y borradores al cerrar/cambiar sesión; entradas productivas sin fallback mock; fixture E2E de sólo lectura y runner unitario.
- **Archivos modificados:** fronteras nuevas en `apps/scheduler/src/lib/scheduler-*-presentation.ts` y `scheduler-query-scope.ts`; componentes Agenda/API/guard/entradas; fixture y spec E2E; `apps/scheduler/package.json`; `CLAUDE.md`, este plan y `docs/SCHEDULER_RV1_PRESENTATION_BOUNDARY.md`.
- **Pruebas ejecutadas y resultado:** `pnpm --filter @cosmetics/scheduler type-check`, correcto; `pnpm --filter @cosmetics/scheduler test`, correcto (4 archivos); `pnpm --filter @cosmetics/scheduler lint`, correcto con advertencias históricas; `pnpm --filter @cosmetics/scheduler build`, correcto (21 páginas); `pnpm --filter @cosmetics/e2e type-check` y `lint`, correctos; descubrimiento Playwright del proyecto Scheduler, correcto (6 pruebas); búsqueda de identificadores de fixtures/mock en chunks operativos, sin coincidencias; `git diff --check`, correcto.
- **Evidencia visual (rutas/artefactos):** prueba preparada en `apps/e2e/development/scheduler.development.spec.ts`, DTOs en `apps/e2e/development/fixtures/scheduler-agenda.ts` y nombre del adjunto `scheduler-agenda-rv1-1366x768`; no se generó imagen en este sandbox.
- **Diferencias funcionales/visuales y decisiones:** RV1 conserva temporalmente los workspaces API mientras prepara la presentación; la Agenda aprobada se monta en RV2. No se sintetiza una cola pendiente sin contrato. Contacto/avatar/precio faltantes se representan como `null`, nunca como ejemplos. La prueba visual no reemplaza bootstrap, permisos ni sucursales.
- **Brechas o validaciones pendientes:** ejecutar captura RV0 y prueba visual RV1 en host con Chromium/servidor; resolver en RV2 la fuente agregada B01, decisión B02 y recorrido completo de Agenda.
- **Estado Git al cerrar:** cambios de RV1 y documentación sin commit; no se aplicaron migraciones, seeds, despliegues ni datos operativos.
- **Siguiente tarea concreta:** iniciar RV2 montando `SchedulerHeader`, panel de recursos y `SchedulerAgendaGrid/List` sobre `SchedulerAgendaPresentation`, con paginación completa del rango visible y horarios canónicos.

### Bitácora RV2 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV2.
- **Rama y HEAD:** `feature/scheduler`, base `0264e11ead656bbd9138ed5231ad25cd77ca50c2`.
- **Estado:** Implementada; validación visual y funcional pendiente por B06.
- **Tareas completadas:** montaje operativo de la presentación aprobada; comercio/sucursal autorizados; columnas profesional/recurso; búsqueda, filtros, calendario y día/semana/lista; paginación completa; zona IANA; horarios, excepciones y bloqueos canónicos; búsqueda/alta de cliente; disponibilidad de servidor; crear/editar/mover/cancelar/transicionar citas; crear/editar/cancelar bloqueos; conflictos, versiones e idempotencia; ficha, visitas y finanzas con autorizaciones independientes y purga en memoria.
- **Archivos modificados:** `ApiAgendaWorkspace.tsx`, componentes de `components/scheduler/`, adaptadores/utilidades en `src/lib/`, pruebas unitarias y E2E, `CLAUDE.md`, este plan y `docs/SCHEDULER_RV2_AGENDA_RESTORATION.md`.
- **Pruebas ejecutadas y resultado:** `pnpm --filter @cosmetics/scheduler type-check`, correcto; `test`, correcto (4 archivos); `lint`, correcto con advertencias históricas fuera de RV2; `build`, correcto (21 páginas); `pnpm --filter @cosmetics/e2e type-check` y `lint`, correctos; descubrimiento Playwright correcto (6 pruebas); `git diff --check`, correcto.
- **Evidencia visual:** fixture E2E actualizado para catálogo/citas/bloqueos controlados y adjuntos `scheduler-agenda-rv2-calendar-1366x768`/`scheduler-agenda-rv2-list-1366x768`; no se generó imagen porque B06 impide iniciar Chromium/servidor en el sandbox.
- **Diferencias funcionales/visuales y decisiones:** las acciones históricas de borrar se presentan como cancelaciones con motivo; excepciones se leen y administran desde Administración; la tarjeta no inventa precio/contacto/avatar; citas multi-servicio conservan sus servicios y bloquean su sustitución desde el selector único; finanzas es sólo lectura; no se sintetiza cola sin asignación.
- **Brechas o validaciones pendientes:** ejecutar comparación en seis viewports; recorrer escrituras, recarga y conflictos con API/PostgreSQL desechable; B01 mantiene precio/avatar agregados pendientes y B02 requiere decisión backend si se desea cola sin profesional.
- **Estado Git al cerrar:** cambios de RV2 y documentación sin commit; no se modificaron backend, Prisma, migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar la evidencia RV2 en un host compatible y, tras revisar las diferencias, marcarla `Validada`; RV3 depende de esa validación.

### Bitácora RV3 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV3.
- **Rama y HEAD:** `feature/scheduler`, base `735ca6679aa0e8a2b70a279ab0a6330f93474950`.
- **Estado:** Implementada; validación visual y funcional pendiente por B06.
- **Tareas completadas:** presentación aprobada de Clientes sobre datos reales; búsqueda paginada y filtro de procedencia en servidor; definiciones de campos acotadas por sucursal/comercio; alta/edición de identidad, perfil, alias, correos, procedencia y campos tipados; fusión versionada con autorización ligada; expediente, visitas y finanzas independientes, paginados, temporales y purgados; adaptador/invalidador compartido con Agenda; estados de carga, vacío, error, sólo lectura y conflicto.
- **Archivos modificados:** contratos en `packages/types` y `packages/api-client`; ruta de clientes del API; `ApiClientsWorkspace.tsx`, adaptador de clientes y consumo desde Agenda; pruebas unitarias/E2E; `CLAUDE.md`, este plan, guía de Fase 3 backend y `docs/SCHEDULER_RV3_CLIENTS_RESTORATION.md`.
- **Pruebas ejecutadas y resultado:** type-check de Scheduler, types, API client, API y E2E, correctos; Scheduler tests, correctos (5 archivos); API unit tests, correctos (133 pruebas/25 archivos); lint de Scheduler correcto con advertencias históricas fuera de RV3; lint del API y E2E, correctos; builds de Scheduler (21 páginas) y API, correctos; descubrimiento Playwright correcto (7 pruebas); `git diff --check`, correcto al cierre.
- **Evidencia visual:** fixture `apps/e2e/development/fixtures/scheduler-clients.ts`, prueba de sólo lectura y adjunto previsto `scheduler-clients-rv3-list-1366x768`; no se generó PNG porque B06 impide iniciar servidor/Chromium en el sandbox.
- **Diferencias funcionales/visuales y decisiones:** la búsqueda conserva el mínimo contractual de dos caracteres; sólo se ofrecen filtros respaldados por servidor; no se simulan filtros demográficos, importación, audiencias ni reporte de fichas; no se descarga una página parcial como si fuera el listado completo; el expediente exige autorización antes de editar metadatos sensibles y expira también durante edición; cada página de históricos requiere un nuevo token; finanzas no ofrece mutaciones.
- **Brechas o validaciones pendientes:** ejecutar comparación en seis viewports y recorridos create/edit/merge/reload/concurrencia/duplicado/autorización con API y PostgreSQL desechables; B03 continúa para importación, audiencias y reporte de fichas; recordatorios/encuestas continúan en RV6/RV7.
- **Estado Git al cerrar:** cambios de RV3 y documentación sin commit; no se modificaron Prisma, migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar evidencia conjunta RV2/RV3 en un host compatible; después iniciar RV4 restaurando Administración y catálogos sobre contratos canónicos.

### Bitácora RV4 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV4.
- **Rama y HEAD:** `feature/scheduler`, base `4ee4412845264d62577ac2ea2eedd1cf052b6baf`.
- **Estado:** Implementada; validación visual y funcional pendiente por B06.
- **Tareas completadas:** recuperación del encabezado, superficies, tablas y diálogos aprobados; comercios y perfiles de sucursal; activación de empleados/servicios; especialidades, grupos, asignaciones, recursos y requisitos; horarios, descansos y excepciones por sucursal/profesional/recurso; clases; perfiles de paquetes y complementos; comisiones versionadas; plantillas de gift card; colores por comercio con autorización de un solo uso; invalidación de Agenda y clasificación de funciones históricas sin contrato.
- **Archivos modificados:** entrada y catálogo operativo de Administración; nuevos componentes `RestoredAdministrationFrame`, `AdministrationRelationsPanel` y `RestoredAdministrationSections`; adaptador/pruebas `scheduler-administration-presentation`; fixture/spec visual RV4 y configuración Playwright; `CLAUDE.md`, este plan, baseline y `docs/SCHEDULER_RV4_ADMINISTRATION_RESTORATION.md`.
- **Pruebas ejecutadas y resultado:** `pnpm --filter @cosmetics/scheduler type-check`, correcto; `test`, correcto (6 archivos); `lint`, correcto con advertencias históricas fuera de RV4; `build`, correcto (21 páginas); type-check/lint E2E, correctos; descubrimiento Playwright del proyecto Scheduler, correcto e incluye las dos pruebas RV4; búsqueda de fixtures en chunks y `git diff --check`, correctos.
- **Evidencia visual:** fixture `apps/e2e/development/fixtures/scheduler-administration.ts`; adjuntos previstos para las siete secciones a `1366×768` y Servicios a `390×844`. No se generaron PNG porque B06 impide iniciar servidor/Chromium en el sandbox.
- **Diferencias funcionales/visuales y decisiones:** el perfil Scheduler no edita contacto/imagen de sucursal; POS conserva precio, categorías y operación financiera; el alta de complemento espera un DTO de candidatos y sólo se editan perfiles existentes; no existe consulta administrativa para anticipar citas afectadas por cambios de recursos; gift cards son plantillas; Nómina conserva pagos de comisión. Ninguna función se presenta como operativa mediante estado local o mocks.
- **Brechas o validaciones pendientes:** ejecutar comparación en los viewports RV0; recorrer CRUD, recarga, alcance, conflictos y efectos sobre Agenda con API/PostgreSQL desechables; B03 conserva contratos comerciales, validación anticipada de recursos y trabajo de Clientes/engagement; B06 conserva la infraestructura de evidencia.
- **Estado Git al cerrar:** cambios RV4 y documentación sin commit; no se modificaron backend, Prisma, migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar la evidencia visual/funcional acumulada RV2–RV4 en un host compatible; después iniciar RV5 mapeando cada campo y consumidor real antes de sustituir el editor JSON de Configuraciones.

### Bitácora RV5 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV5.
- **Rama y HEAD:** `feature/scheduler`, base `c35131786a7306502c31e34588c9a52514a5889f`.
- **Estado:** Implementada; validación visual y funcional pendiente por B06.
- **Tareas completadas:** sustitución del editor JSON por formularios estructurados de las once secciones; matriz de campos/defaults/permisos/consumidores; lectura por capa; aplicación exclusiva de paths modificados; conservación de claves desconocidas; permisos `WRITE`/`ADMIN`; confirmación de borradores al cambiar contexto; recuperación ante `409`; densidad visual local; código personal seguro; omisión de secretos; estados sólo lectura, carga y error.
- **Archivos modificados:** `ApiSettingsWorkspace.tsx`; nuevo catálogo/adaptador y prueba `scheduler-settings-presentation`; contrato `SchedulerResolvedSettingDto` y respuesta del endpoint; fixture/spec visual RV5; `CLAUDE.md`, este plan y `docs/SCHEDULER_RV5_SETTINGS_RESTORATION.md`.
- **Pruebas ejecutadas y resultado:** type-check de Scheduler, types, API client, API y E2E, correctos; Scheduler tests, correctos (7 archivos); API unit tests, correctos (133 pruebas/25 archivos); lint de Scheduler correcto con advertencias históricas fuera de RV5; lint del API y E2E, correctos; builds de Scheduler (21 páginas) y API, correctos; descubrimiento Playwright correcto (29 pruebas) e incluye los dos recorridos RV5; Prettier y `git diff --check`, correctos al cierre.
- **Evidencia visual:** runner `apps/e2e/development/scheduler-settings.visual.spec.ts`; adjuntos previstos de Empresa, Agenda, Fichas médicas e Integraciones a `1366×768`, y Clientes a `390×844`. No se generaron PNG porque B06 impide iniciar servidor/Chromium.
- **Diferencias funcionales/visuales y decisiones:** Sitio web y Notificaciones completan los estados pendientes de la referencia con formularios versionados; Integraciones no inventa campos para secretos; Pagos omite `publicKey`/`accessToken`; listas clínicas/de clientes conservan propiedades no editadas; todos los documentos declaran que aún no tienen consumidor operativo. La identidad/sucursales, disponibilidad, POS, engagement, clientes canónicos y encuestas prevalecen.
- **Brechas o validaciones pendientes:** comparar en viewports RV0; recorrer creación/actualización/recarga y conflicto en las tres capas sobre API/PostgreSQL desechables; inspeccionar respuestas/chunks sin secretos. B06 conserva la infraestructura de evidencia.
- **Estado Git al cerrar:** cambios RV5 y documentación sin commit; no se aplicaron migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar la evidencia visual/funcional acumulada RV2–RV5 en un host compatible; después iniciar RV6 conectando Comunicaciones, documentos y encuestas sin activar proveedores reales.

### Bitácora RV6 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV6.
- **Rama y HEAD:** `feature/scheduler`, base `21229ccd55eef5cafe58ba30d9829c54d274cc66`.
- **Estado:** Implementada; validación visual, storage, proveedor y recorridos HTTP/PostgreSQL pendientes por B06.
- **Tareas completadas:** paneles restaurados de Encuestas, Consentimientos y Comunicaciones; alta/versión/conflicto de encuestas y plantillas; preguntas/servicios/vista previa; preferencias con fuente y versión; intención idempotente; semántica completa del outbox y retry terminal; carga/versionado/asignación/firma/revocación de consentimientos; URLs efímeras con autorización; expediente médico y soportes privados dentro de Clientes con autorizaciones independientes y purga temporal.
- **Archivos modificados:** entrada y frame de Administración; nuevos componentes `RestoredSurveysSection`, `RestoredConsentsSection`, `RestoredCommunicationsSection` y `CustomerEngagementPanel`; adaptador/prueba `scheduler-engagement-presentation`; fixture/spec visual RV6 y registro en Playwright; `CLAUDE.md`, este plan, baseline y `docs/SCHEDULER_RV6_ENGAGEMENT_RESTORATION.md`.
- **Pruebas ejecutadas y resultado:** type-check, lint, 8 suites unitarias y build de Scheduler (21 páginas), correctos; type-check y lint E2E correctos; el lint de Scheduler conserva advertencias históricas fuera de RV6. Playwright descubrió los dos casos RV6 y sus dos dependencias de sesión (4 pruebas); `git diff --check` se ejecuta al cierre.
- **Evidencia visual:** runner `apps/e2e/development/scheduler-engagement.visual.spec.ts`; adjuntos previstos de tres paneles a `1366×768` y Comunicaciones a `390×844`. No se generaron PNG porque B06 impide iniciar servidor/Chromium.
- **Diferencias funcionales/visuales y decisiones:** no hay borrado contractual de encuestas/plantillas/respuestas; inactivación/versionado prevalece. La plantilla de consentimiento no publica mutación de activo. `SENT` no se etiqueta como entregado. Proveedor/secretos sólo viven en infraestructura. Las métricas agregadas continúan en RV7 y ninguna preferencia documental RV5 se presenta como consumidor automático.
- **Brechas o validaciones pendientes:** ejecutar comparación en seis viewports; recorrer `409`, replay, opt-in/out, estados/retry, firmas, expiración de URLs y alcance cruzado sobre API/PostgreSQL/storage desechables; probar `disabled` y sandbox sin envíos reales. B06 conserva la infraestructura de evidencia.
- **Estado Git al cerrar:** cambios RV6 y documentación sin commit; no se modificaron backend, Prisma, migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar la evidencia visual/funcional acumulada RV2–RV6 en un host compatible; después iniciar RV7 restaurando reportes y exportaciones desde datasets completos.

### Bitácora RV7 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV7.
- **Rama y HEAD:** `feature/scheduler`, base `ecd2f63`.
- **Estado:** Implementada; validación visual y recorridos HTTP/PostgreSQL pendientes por B06.
- **Tareas completadas:** presentación restaurada de Resumen, Reservas, Historial, Rendimiento, Ventas, Encuestas y Recordatorios; carga paginada hasta `total`; tarjetas/series/rankings/tablas desde datasets canónicos; filtros de periodo/sucursal/búsqueda/estado/canal; montaje de Locales, Mensajería, Métricas y Servicios; rutas por local con `branchId`; exportación auditada CSV/XLSX/PDF; autorización sensible sin `window.prompt`; límites de agregación documentados.
- **Archivos modificados:** entrada API y página de reportes; nuevo `RestoredReportsWorkspace`; adaptador y exportador `scheduler-report-*`; rutas profundas; prueba unitaria; fixture/spec E2E; dependencias/lockfile; `CLAUDE.md`, este plan, baseline y `docs/SCHEDULER_RV7_REPORTS_RESTORATION.md`.
- **Pruebas ejecutadas y resultado:** `pnpm --filter @cosmetics/scheduler type-check`, correcto; `test`, correcto (9 suites); `lint`, correcto con advertencias históricas fuera de RV7; `build`, correcto (21 páginas); type-check/lint E2E correctos; descubrimiento Playwright correcto (15 pruebas del proyecto, incluidas 2 de RV7 y dependencias). El intento `pnpm install --lockfile-only --offline --filter @cosmetics/scheduler...` no pudo resolver el `turbo@2.10.5` raíz; el importador se actualizó con versiones ya fijadas en el lockfile.
- **Evidencia visual:** runner `apps/e2e/development/scheduler-reports.visual.spec.ts`; adjuntos previstos de Resumen, Reservas, Ventas, Locales y Servicios a `1366×768`, e Historial a `390×844`. No se generaron PNG porque B06 impide iniciar servidor/Chromium.
- **Diferencias funcionales/visuales y decisiones:** Ventas es ampliación sin referencia directa; Resumen no invade permisos de Reservas/Ventas; comparación histórica, cumpleaños, cuota/conversaciones, ingresos atribuidos y respuestas por pregunta no existen en API y no se simulan; legado y canónico permanecen separados; formatos se renderizan sólo después de `/exports`.
- **Brechas o validaciones pendientes:** comparar seis vistas contra la referencia; recorrer paginación/paridad export, CSV/XLSX/PDF, autorización de un uso, permisos parciales, alcance por local, vacíos y doble conteo sobre API/PostgreSQL desechables. B06 conserva la infraestructura pendiente.
- **Estado Git al cerrar:** cambios RV7 y documentación sin commit; no se modificaron backend, Prisma, migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar evidencia visual/funcional acumulada RV2–RV7 en un host compatible; después iniciar RV8 con la matriz completa, rutas profundas, chunks y limpieza final.

### Bitácora RV8 — 6 de septiembre de 2026

- **Fecha y fase:** 6 de septiembre de 2026, RV8.
- **Rama y HEAD:** `feature/scheduler`, base `9706a9fd125759d0c2a37b36d76d0738d0d8e1e0`.
- **Estado:** Implementada; validación visual y recorridos integrados HTTP/PostgreSQL pendientes por B06.
- **Tareas completadas:** revisión de las 19 entradas RV0 y rutas profundas; guard automatizado del grafo productivo; eliminación de rama placeholder; retiro de 36 archivos históricos sin consumidores; fixtures confinados a E2E; horarios visuales derivados sólo del catálogo canónico; revalidación de sesión/permisos cada 30 segundos y al recuperar foco/visibilidad/cambiar token; descarte de bootstrap tardío; casos E2E para `401` y revocación; separación dinámica de cinco workspaces; auditoría de chunks y almacenamiento; candidata y rollback frontend documentados.
- **Archivos modificados:** sesión y adaptador/grid de Agenda; entradas/página profunda de Scheduler; spec E2E; dos suites RV8; eliminación de workspaces/helpers/mocks huérfanos; `CLAUDE.md`, este plan, baseline y `docs/SCHEDULER_RV8_RELEASE_CANDIDATE.md`.
- **Pruebas ejecutadas y resultado:** `pnpm --filter @cosmetics/scheduler test`, correcto (8 suites); `type-check`, correcto; `lint`, correcto con cuatro advertencias históricas de `<img>`; `build`, correcto (21 páginas); JS inicial operativo reducido de 359 kB a 89.7–89.8 kB; type-check/lint E2E correctos; descubrimiento Playwright correcto (17 pruebas con dependencias); búsqueda de mocks/clave de horarios en chunks, sin coincidencias; Prettier y `git diff --check`, correctos al cierre.
- **Evidencia visual:** runners RV0 y RV2–RV7 inventariados en el runbook RV8; no se generaron PNG porque B06 impide iniciar servidor/Chromium.
- **Diferencias funcionales/visuales y decisiones:** la carga diferida muestra skeletons y no cambia la presentación final; las funciones históricas sin contrato permanecen como B03/B05 y recuperables desde `e9077dd`, no como código operativo muerto; `auth_token` y `slotMinutes` son las únicas persistencias autorizadas. El cierre de implementación RV8 quedó fijado después en `a1e68b44957431c716c39d183843aba56085c12a`; la candidata de la PR será el `HEAD` que incorpore el cierre documental.
- **Brechas o validaciones pendientes:** ejecutar comparación integral en viewports RV0, los dos recorridos E2E RV8 y los flujos de escritura, concurrencia, permisos, storage, proveedor y exportación sobre infraestructura desechable. No desplegar ni marcar RV0–RV8 validadas hasta revisar la evidencia.
- **Estado Git al cerrar:** cambios RV8 y documentación sin commit; no se modificaron API, Prisma, migraciones, seeds, variables, despliegues ni datos operativos.
- **Siguiente tarea concreta:** ejecutar en un host compatible la referencia y los runners RV2–RV8; revisar diferencias con el PO y recorrer API/PostgreSQL 16 desechable. Si todo pasa, registrar artefactos y SHA real, marcar las fases `Validada` y tramitar el despliegue por el runbook operativo separado.

### Cierre documental posterior a RV8 — 6 de septiembre de 2026

- **Implementación RV8:** `a1e68b44957431c716c39d183843aba56085c12a`.
- **Candidata de PR:** el `HEAD` que incorpore este cierre documental; CI, Preview y cualquier despliegue deben identificarlo por su SHA completo real.
- **Higiene previa a PR:** referencias retiradas del mapa vigente de Scheduler y whitespace del rango contra `develop` corregidos. La evidencia visual, los recorridos integrados y las decisiones B01–B03 continúan pendientes; este cierre no cambia RV0–RV8 a `Validada`.
- **Revalidación local:** instalación alineada a Turbo `2.10.5`; lint 15/15, type-check 18/18, API 133/133, UI 39/39 con cobertura, grafo, contratos de deployment, builds productivos, schemas y revisión de migraciones correctos. La referencia histórica volvió a construir 20 páginas, pero Chromium falló con `Operation not permitted`/`SIGTRAP`; el testbed visual no pudo abrir `127.0.0.1:3010` por `EPERM` y Podman sigue bloqueado. Evidencia detallada en `docs/SCHEDULER_RV8_RELEASE_CANDIDATE.md`.
