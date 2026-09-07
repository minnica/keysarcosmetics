# Plan por fases: restauración visual de Scheduler con backend real

> Creado: 6 de septiembre de 2026.
> Rama inspeccionada: `feature/scheduler`.
> Referencia visual aprobada por el PO, indicada por el usuario: `e9077ddad945325b1a132962ce0c2fcd9ae7f74a`.
> HEAD al redactar el plan: `9784c1b222dc2aa69cb304a5b492eeb1786ac980`.
> Estado: RV0 implementada con validación visual pendiente; RV1–RV8 pendientes.

## 1. Objetivo y acuerdo de alcance

Recuperar la presentación aprobada de todo `apps/scheduler`, conectándola con los contratos y garantías del backend actual. Incluye Agenda, Clientes, Administración, Configuraciones, comunicaciones/documentos/encuestas y Reportes. Conservar calendario, distribución, navegación, tipografía, colores, densidades, tarjetas, tablas y diálogos de la referencia, con datos reales y estados operativos explícitos.

RV0 quedó implementada en repositorio el 6 de septiembre de 2026: inventario, matriz, referencia aislada, runner determinista, diagnóstico de infraestructura y brechas están documentados en `docs/SCHEDULER_VISUAL_RESTORATION_BASELINE.md`. El sandbox no permitió iniciar Chromium ni servidores locales, por lo que faltan las capturas antes de validar la fase. No se aplicaron migraciones, seeds, despliegues ni datos operativos.

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

`SchedulerPageEntries.tsx` selecciona hoy workspaces API para una sesión normal y componentes históricos cuando el servidor habilita mocks de desarrollo. Los archivos `globals.css`, `SchedulerAgendaGrid.tsx`, `SchedulerAgendaList.tsx`, `SchedulerHeader.tsx`, `SchedulerSidebar.tsx` y `SchedulerBookingCard.tsx` no presentan diferencias entre la referencia y el HEAD inspeccionado. Otros archivos históricos sí recibieron cambios de seguridad y deben compararse individualmente.

El backend devuelve citas, profesionales, recursos, horarios, estados y versiones suficientes para reconstruir el calendario. Esto demuestra viabilidad arquitectónica, pero no garantiza que todos los campos y acciones del frontend histórico tengan cobertura: esa comprobación corresponde a RV0.

## 3. Estado y orden de ejecución

| Fase | Entrega                                                 | Dependencia  | Estado                             |
| ---- | ------------------------------------------------------- | ------------ | ---------------------------------- |
| RV0  | Inventario y referencia visual reproducible             | Ninguna      | Implementada; validación pendiente |
| RV1  | Separación de presentación, contratos y datos de prueba | RV0          | Pendiente                          |
| RV2  | Agenda aprobada conectada de punta a punta              | RV1          | Pendiente                          |
| RV3  | Clientes, expediente e históricos                       | RV2 validada | Pendiente                          |
| RV4  | Administración y catálogos                              | RV3          | Pendiente                          |
| RV5  | Formularios de Configuraciones                          | RV4          | Pendiente                          |
| RV6  | Comunicaciones, documentos y encuestas                  | RV5          | Pendiente                          |
| RV7  | Reportes y exportaciones                                | RV6          | Pendiente                          |
| RV8  | Verificación integral, limpieza y entrega               | RV2–RV7      | Pendiente                          |

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

- [ ] Extraer tipos, constantes de presentación y utilidades puras que hoy están mezclados con módulos `mock-*`. Revisar imports transitivos, especialmente utilidades de calendario y datos semanales.
- [ ] Definir modelos de presentación tipados para columnas, citas, servicios, bloqueos, estados y datos opcionales; conservar IDs, versiones y participantes del DTO canónico sin aplanamientos que pierdan información.
- [ ] Adaptar `useSchedulerQuery`/mutaciones existentes o su equivalente para filtros, invalidación, descarte de respuestas obsoletas y separación por sesión/sucursal. Verificar su comportamiento antes de reutilizarlo.
- [ ] Mantener estado visual local legítimo: vista, filtros, panel abierto, densidad y borradores. Limpiar datos sensibles al cerrar sesión o perder autorización.
- [ ] Definir el cambio de entrada por módulo: activar la vista restaurada cuando esté lista, conservando las demás entradas mientras se trabajan. El retorno temporal debe apuntar a una vista API, nunca a mocks operativos.
- [ ] Preparar pruebas visuales que inyecten DTOs ficticios en la misma presentación que usará producción, aisladas del modo normal. No exponer un bypass de sesión o permisos.
- [ ] Probar conversiones con fechas, estados, recursos, citas multi-servicio y campos ausentes. Definir runner de pruebas apropiado si hace falta; hoy Scheduler no declara script `test` propio.

**Criterio de salida:** frontera de datos y presentación verificada; los componentes operativos no dependen de fixtures transitivos, secretos locales ni datos simulados de reserva.

### RV2 — Agenda aprobada con persistencia real

Objetivo: completar el primer recorrido de punta a punta y usarlo como patrón para los siguientes módulos.

- [ ] Recuperar `SchedulerHeader`, panel de recursos, `SchedulerAgendaGrid`, `SchedulerAgendaList`, tarjetas y diálogos. Aplicar el comportamiento sticky/viewport a la Agenda restaurada en modo normal, sin romper el scroll de otras rutas.
- [ ] Conectar comercio/sucursal autorizados, columnas de profesionales/recursos, búsqueda, filtros, calendario mensual y vistas día/semana. Cargar todas las páginas necesarias del rango visible; no limitar silenciosamente a las primeras 100 citas.
- [ ] Dibujar horarios, excepciones, bloqueos, colores de estado, servicios y participantes desde datos canónicos. No fijar el horario operativo a los ejemplos del baseline.
- [ ] Integrar búsqueda/selección de cliente y el alta necesaria para el flujo de nueva cita mediante API. La restauración completa de Clientes se realiza en RV3.
- [ ] Conectar creación, edición, movimiento, cancelación, transiciones y creación/edición/cancelación de bloqueos desde los diálogos aprobados. Sustituir los `window.prompt` de la vista simplificada por formularios consistentes con esos diálogos.
- [ ] Mantener versiones, idempotencia y manejo de respuestas `401`, `403`, `409`, errores de red y reintentos. Recalcular/refrescar disponibilidad tras mutaciones.
- [ ] Integrar consulta autorizada de ficha e históricos desde las tarjetas, reutilizando la capa de Clientes; los pagos siguen siendo de sólo lectura.
- [ ] Comparar visualmente filtros abiertos/cerrados, cuatro columnas y muchas columnas, día/semana/lista, modales, estados vacíos y pantallas pequeñas con la referencia.
- [ ] Verificar contra API y BD de prueba: crear → recargar → editar/mover → cambiar estado → cancelar; bloquear → editar → cancelar; dos sesiones y conflicto de versión/capacidad.

**Criterio de salida:** Agenda recuperada visualmente y recorridos persistentes verificados. La semana no usa `schedulerWeekBookings`. Las brechas de Agenda deben quedar resueltas o aceptadas explícitamente como pendientes antes de declarar validada la fase.

### RV3 — Clientes, expediente e históricos

- [ ] Recuperar listado, búsqueda, filtros, paginación, formularios y diálogos aprobados con sus campos reales.
- [ ] Conectar alta/edición, procedencia, alias, teléfonos/correos, campos personalizados y fusión versionada cuando corresponda al inventario.
- [ ] Conservar autorizaciones independientes de un solo uso para perfil, visitas y finanzas, con emisión/consumo en el endpoint correcto. Cubrir expiración, denegación y reapertura.
- [ ] Compartir la consulta de cliente con Agenda sin mantener dos identidades o historiales locales divergentes. Invalidar ambas vistas después de editar o fusionar.
- [ ] Verificar duplicados y cambios concurrentes, alcance de sucursal, históricos paginados, lectura financiera y recarga de datos.
- [ ] Comparar listado, vacíos y diálogos con la referencia. Las subsecciones de recordatorios/encuestas se completan en RV6/RV7, manteniendo sus rutas.

**Criterio de salida:** experiencia de Clientes e históricos restaurada, con identidad compartida, privacidad y persistencia verificadas.

### RV4 — Administración y catálogos

- [ ] Restaurar paneles y modales de comercios/sucursales, profesionales, servicios, clases, paquetes, complementos, grupos, especialidades, horarios y recursos según inventario.
- [ ] Integrar selección de candidatos existentes y activación de perfiles con los métodos usados por `OperationalCatalogWorkspace`. Distinguir IDs de entidad y perfil, baja lógica y vigencia.
- [ ] Conectar asignaciones, compatibilidades, capacidad, horarios, descansos y excepciones; invalidar catálogos/Agenda cuando cambien.
- [ ] Recuperar comisiones, gift cards y colores de estados desde contratos reales. Conservar versionado, alcance global y autorización secundaria para colores.
- [ ] Verificar cada acción histórica contra el contrato: importación/exportación masiva de precios, identidad/contacto/imagen, saldos y redención de gift cards pueden requerir trabajo adicional. No declarar soportadas esas operaciones sólo porque existía un botón mock.
- [ ] Mantener Nómina como autoridad del pago final de comisiones y POS como autoridad comercial. No duplicar catálogos o cálculos financieros.
- [ ] Validar visual y funcionalmente cada sección, incluidos formularios largos, horarios y tablas en móvil.

**Criterio de salida:** secciones administrativas restauradas con CRUDs reales, permisos y efectos comprobados sobre Agenda. Cada función sin cobertura tiene una decisión registrada, sin reducir silenciosamente el alcance.

### RV5 — Formularios de Configuraciones

- [ ] Recuperar los formularios aprobados de Empresa, Sitio web, Agenda, Pagos Keysar, Recordatorios, Fichas médicas, E-mails, Integraciones, Notificaciones, Clientes y Encuestas.
- [ ] Documentar por campo: clave, tipo, valor predeterminado, alcance, permiso y consumidor real. Persistir una clave JSON no demuestra que tenga efecto sobre el producto.
- [ ] Adaptar lectura/escritura a documentos versionados conservando claves desconocidas y distinguiendo valores heredados de overrides. Verificar la semántica del endpoint antes de enviar cambios de una capa.
- [ ] Evitar que cambiar sección/comercio/sucursal/capa mezcle borradores o guarde datos en otro contexto. Conservar advertencia de cambios sin guardar y recuperación ante `409`.
- [ ] Usar los formularios aprobados como interfaz; no entregar el editor JSON genérico como sustituto de las pantallas anteriores.
- [ ] Mantener el formulario seguro de código personal con contraseña actual. No restaurar listados de códigos visibles de otros usuarios.
- [ ] Conservar local sólo preferencias visuales permitidas; configuraciones operativas usan servidor. Probar herencia, recarga y ausencia de secretos en documentos.

**Criterio de salida:** formularios restaurados y persistentes, con alcance y efectos identificados por campo; ninguna capa recibe accidentalmente los valores efectivos de las demás.

### RV6 — Comunicaciones, documentos y encuestas

- [ ] Recuperar paneles de WhatsApp/comunicaciones, plantillas, consentimientos, documentos, encuestas y las acciones aplicables de recordatorios/expediente médico identificadas en RV0.
- [ ] Integrar plantillas versionadas, outbox, estados/reintentos y preferencias de contacto; diferenciar encolado de entrega confirmada. Mantener idempotencia y consentimiento.
- [ ] Integrar carga/consulta de documentos privados y autorizaciones para datos sensibles. No persistir URLs firmadas como enlaces permanentes ni exponer rutas internas.
- [ ] Conectar definiciones y resultados de encuestas según los contratos disponibles; conservar respuestas inmutables y tokens fuera de la presentación general.
- [ ] Verificar estados con proveedor deshabilitado, error, pendiente y completado mediante entornos de prueba; no activar envíos reales para probar el visual.
- [ ] Comparar paneles, tablas y modales; coordinar las vistas de métricas con RV7.

**Criterio de salida:** interfaces de engagement restauradas con estados reales y controles de privacidad; pruebas externas que requieran storage/proveedor se reportan separadamente si aún faltan.

### RV7 — Reportes y exportaciones

- [ ] Restaurar resumen, reservas, historial, rendimiento, ventas, reportes de encuestas, recordatorios y todos los desgloses del inventario. Mantener URLs y navegación autorizada.
- [ ] Mapear cada tarjeta, KPI, columna y serie histórica a un dataset/agrupación del backend. Documentar explícitamente qué información no proporciona aún la API.
- [ ] Mantener filtros comunes de periodo, sucursal, zona horaria y permisos. No reconstruir indicadores sobre una página parcial de resultados ni inventar series para rellenar gráficos.
- [ ] Alimentar la presentación aprobada con `report`; exportar mediante `exportReport` sobre el conjunto completo, con auditoría y autorizaciones aplicables.
- [ ] Verificar los formatos de descarga realmente soportados; no sustituir un formato requerido por CSV sin registrar la diferencia.
- [ ] Probar paridad pantalla/exportación, ausencia de doble conteo POS/legado, vacíos y permisos de sólo lectura/exportación; comparar visualmente gráficos y tablas con datos equivalentes.

**Criterio de salida:** cada cifra tiene fuente canónica y la presentación recupera la referencia. Las brechas de agregación/formato quedan resueltas o explícitamente pendientes, nunca simuladas.

### RV8 — Verificación integral, limpieza y entrega

- [ ] Revisar toda la matriz RV0 y los enlaces profundos. Confirmar que ninguna ruta visible escapa a la restauración o vuelve a servir datos mock.
- [ ] Ejecutar comparaciones visuales finales y recorridos integrados entre Agenda, Clientes, Administración, Configuraciones y Reportes. Registrar diferencias intencionales y su decisión.
- [ ] Verificar login/logout, sesión vencida, pérdida de permisos, alcance por sucursal/profesional, doble envío, conflictos y ausencia de datos sensibles al cambiar usuario.
- [ ] Retirar componentes/workspaces simplificados sólo después de comprobar que ya no tienen consumidores ni funciones exclusivas pendientes. Conservar helpers y contratos útiles; los fixtures quedan aislados en pruebas/desarrollo.
- [ ] Revisar imports transitivos y chunks de una sesión normal, además de accesos a `localStorage`: no deben cargar ni persistir datos operativos simulados.
- [ ] Ejecutar las comprobaciones técnicas aplicables, actualizar `CLAUDE.md` y enlazar evidencia de cierre desde este plan.
- [ ] Documentar la versión candidata y una reversión de frontend a un commit conocido compatible, sin revertir migraciones ni cambiar el proveedor POS para corregir un problema visual.

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

Registrar en la fase el comando exacto de cualquier nueva suite y sus prerrequisitos; no citar `pnpm --filter @cosmetics/scheduler test` como existente. Conservar `.next-dev` para desarrollo y `.next` para build según la configuración vigente.

Si se autoriza modificar paquetes compartidos o API, añadir sus comprobaciones y pruebas de consumidores afectados. Para API/Prisma seguir además las validaciones de `CLAUDE.md` y el plan backend. Un cambio sólo documental requiere revisión de enlaces, coherencia del plan y `git diff --check`, sin reconstruir la app.

## 8. Brechas y decisiones pendientes

La auditoría identificó estos puntos a verificar, no incompatibilidades visuales insalvables:

| ID  | Punto                                                                                     | Próxima acción                                                                                | Estado                                  |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| B01 | Teléfono, precio, avatar y detalles por tarjeta no están todos en el DTO de cita          | Usar consulta autorizada/agregada; evitar N+1                                                 | Confirmada RV0; resolver RV1/RV2        |
| B02 | Pendientes sin profesional/recurso asignado                                               | El validador exige al menos un profesional por servicio; decidir si se amplía el contrato     | Confirmada RV0; decisión RV2/backend    |
| B03 | Formularios administrativos, archivos masivos y capacidades mock sin contrato equivalente | Inventario por acción disponible en baseline; definir ampliación o limitación explícita       | Clasificada RV0; resolver RV3/RV4/RV6   |
| B04 | Persistencia JSON frente a efectos reales de Configuraciones                              | No se encontraron consumidores operativos de los documentos; mapear cada campo                | Confirmada RV0; resolver RV5            |
| B05 | KPIs, series y formatos históricos frente a los datasets actuales                         | Hay doce datasets y sólo CSV; verificar agrupaciones y formatos                               | Clasificada RV0; resolver RV7           |
| B06 | Ambiente reproducible para referencia y pruebas de escritura                              | Build aislado disponible; Chromium, puertos y PostgreSQL desechable no disponibles en sandbox | Diagnóstico RV0; captura/BD pendientes  |
| B07 | Cobertura real de rutas profundas y redirecciones                                         | Seis rutas redirigen en referencia y HEAD; cinco componentes no están montados                | Confirmada RV0; resolver RV7            |
| B08 | El fixture permite mutar pagos y borrar historial financiero                              | Conservar POS como autoridad y restaurar estas superficies sólo en lectura                    | Decisión semántica RV0; aplicar RV2/RV3 |
| B09 | La referencia redirige login y expone códigos mock                                        | Conservar login JWT, permisos y formulario seguro actual                                      | Decisión de seguridad RV0; transversal  |
| B10 | `/reportes/ventas` no existe en la referencia                                             | Tratarla como ampliación y aplicar lenguaje visual consistente                                | Clasificada RV0; resolver RV7           |

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

> Lee CLAUDE.md y PLAN_RESTAURACION_VISUAL_SCHEDULER.md. Retoma la primera tarea pendiente de la fase RV0, conserva e9077dd como referencia visual y el backend actual como fuente de verdad. Actualiza la matriz, las brechas y la bitácora con la evidencia obtenida.

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
