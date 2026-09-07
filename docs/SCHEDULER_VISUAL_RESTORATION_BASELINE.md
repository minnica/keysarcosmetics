# Baseline de restauración visual de Scheduler

> Fase: RV0 de `PLAN_RESTAURACION_VISUAL_SCHEDULER.md`.
> Fecha de auditoría: 6 de septiembre de 2026.
> Referencia visual: `e9077ddad945325b1a132962ce0c2fcd9ae7f74a`.
> Estado: inventario y referencia reproducible implementados; capturas pendientes por restricciones del sandbox.

## 1. Estado inspeccionado

| Dato                             | Valor                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Rama                             | `feature/scheduler`                                                                              |
| HEAD                             | `9784c1b222dc2aa69cb304a5b492eeb1786ac980`                                                       |
| Cambios locales iniciales        | `CLAUDE.md` modificado y `PLAN_RESTAURACION_VISUAL_SCHEDULER.md` sin seguimiento; se preservaron |
| Referencia                       | `e9077dd`, verificada con `git show -s --oneline e9077dd`                                        |
| Fecha fija del fixture de Agenda | `2026-06-30T17:00:00.000Z`, equivalente a 11:00 en `America/Mexico_City`                         |
| Fuentes                          | `Emofera-Regular` y Gilroy Regular/Medium/Semibold/Bold desde `apps/scheduler/public/fonts`      |
| Datos                            | Fixtures versionados del commit; ninguna API o base real se consulta desde la referencia         |

Se revisaron `CLAUDE.md`, este plan, `PLAN_BACKEND_SCHEDULER.md`, los contratos en `packages/types/src/scheduler.ts`, el cliente en `packages/api-client/src/index.ts`, las entradas API vigentes y los componentes históricos del commit de referencia.

La comparación `e9077dd..HEAD` muestra que `globals.css`, `SchedulerAgendaGrid`, `SchedulerAgendaList`, `SchedulerHeader`, `SchedulerSidebar` y `SchedulerBookingCard` no cambiaron. Los cambios sobre `SchedulerWorkspace`, `AdministrationWorkspace`, `ClientsDatabase`, `SchedulerFinancialAccessDialog` y `SettingsWorkspace` incorporan sesión/permisos reales y retiran códigos embebidos. Esas correcciones de seguridad se conservan aunque se reutilice su presentación.

## 2. Referencia aislada y procedimiento reproducible

La referencia se extrajo con `git archive`, sin crear un worktree ni modificar el árbol actual:

```bash
reference_dir="$(mktemp -d /tmp/keysar-scheduler-e9077dd-XXXXXX)"
git archive e9077dd | tar -x -C "$reference_dir"
pnpm --dir "$reference_dir" install --offline --frozen-lockfile
pnpm --dir "$reference_dir" --filter @cosmetics/scheduler build
```

El build histórico terminó correctamente y generó 20 páginas. Reportó únicamente warnings ya existentes por `<img>` y dependencias de hooks. La ruta temporal usada durante la auditoría fue `/tmp/keysar-scheduler-e9077dd-4WOtP6`; es efímera y no constituye el artefacto de entrega.

`apps/e2e/scripts/capture-scheduler-reference.mjs` carga los HTML y chunks del build directamente mediante interceptación de Playwright. No abre un servidor, no habilita mocks en la app vigente y no contacta servicios externos. Para generar las capturas en un ambiente que permita Chromium:

```bash
SCHEDULER_REFERENCE_ROOT="$reference_dir" \
SCHEDULER_BASELINE_OUTPUT="$PWD/docs/artifacts/scheduler-visual-baseline/e9077dd" \
pnpm --filter @cosmetics/e2e capture:scheduler:reference
```

El runner fija locale `es-MX`, zona `America/Mexico_City`, escala 1, esquema claro, movimiento reducido y la fecha del fixture. Excluye la pantalla histórica de códigos de autorización porque el commit mostraba códigos mock en texto; esa pantalla se inspeccionó sólo por código y debe restaurarse con el formulario seguro actual.

### Manifiesto de capturas

El destino canónico es `docs/artifacts/scheduler-visual-baseline/e9077dd/`. El runner prepara:

- Agenda día en `1536×864`, `1366×768`, `1280×720`, `1280×600`, `390×844` y `360×800`.
- Agenda semana y lista en `1536×864`, filtros en `390×844` y modal de nueva reserva en `1536×864`.
- Clientes, Reporte de encuestas y Recordatorios en `1536×864`; Clientes también en `390×844` y con modal de alta.
- Las diez secciones de Administración en `1536×864`, Comercios también en `390×844` y modal de nuevo comercio.
- Las once secciones documentales de Configuraciones en `1536×864`, Empresa también en `390×844`.
- Resumen, Reservas General, Historial y Rendimiento en `1536×864`; Resumen y Reservas General también en `390×844`.

Las imágenes no se generaron en este sandbox. `next start` falla con `listen EPERM` tanto en `0.0.0.0` como en `127.0.0.1`; Playwright 1.60 con Chromium empaquetado o Google Chrome termina con `Operation not permitted` en `sandbox_host_linux.cc`/Crashpad y `SIGTRAP`, incluso con `--no-sandbox` y Crashpad deshabilitado. Firefox del sistema termina con `SIGSEGV` al abrirlo mediante Playwright. No hay capturas parciales ni imágenes con datos reales.

## 3. Inventario de rutas y navegación

| Ruta/estado                                              | Referencia `e9077dd`                                                       | HEAD actual                                           | Decisión RV                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/login`                                                 | Redirige a `/`; no existe diseño aprobado de login                         | Login JWT real                                        | Conservar login real y validar por consistencia Keysar, no copiar la redirección |
| `/`                                                      | Agenda día/semana, calendario/lista, panel de filtros, tarjetas y diálogos | `ApiAgendaWorkspace` simplificado                     | Restaurar presentación en RV2 sobre API                                          |
| `/clientes`                                              | Base, filtros, alta, ficha y acciones masivas                              | `ApiClientsWorkspace` simplificado                    | Restaurar en RV3                                                                 |
| `/clientes/reporte-de-encuestas`                         | `SurveyReportWorkspace`                                                    | Dataset `SURVEYS` en tabla genérica                   | Restaurar presentación en RV6/RV7                                                |
| `/clientes/recordatorios`                                | `RemindersWorkspace`                                                       | Dataset `COMMUNICATIONS` en tabla genérica            | Restaurar presentación en RV6/RV7                                                |
| `/administracion?section=locals`                         | Comercios y sucursales                                                     | Catálogo/candidatos reales                            | Implementado RV4; validación pendiente                                           |
| `/administracion?section=professionals`                  | Especialistas y grupos                                                     | Activación de empleados reales                        | Implementado RV4; validación pendiente                                           |
| `/administracion?section=services`                       | Servicios, categorías, clases, paquetes y adicionales                      | Perfiles de servicios + editor avanzado               | Parcial RV4; precio/categoría y alta de adicionales son B03                      |
| `/administracion?section=commissions`                    | Reglas y escalas                                                           | Política real versionada                              | Implementado RV4; validación pendiente                                           |
| `/administracion?section=resources`                      | Recursos, horarios y validación                                            | CRUD, requisitos y disponibilidad reales              | Parcial RV4; validación anticipada de uso es B03                                 |
| `/administracion?section=surveys`                        | Encuestas y preguntas                                                      | Definición/versiones/servicios reales                 | Implementado RV6; resultados agregados pasan a RV7                               |
| `/administracion?section=consents`                       | Plantillas y documentos                                                    | Versiones/asignación/firma/URLs privadas reales       | Implementado RV6; storage y capturas pendientes                                  |
| `/administracion?section=whatsapp`                       | Mensajes y plantillas                                                      | Plantillas/preferencias/outbox reales                 | Implementado RV6; proveedor sandbox y capturas pendientes                        |
| `/administracion?section=gift-cards`                     | Plantillas de servicio/monto y diseño                                      | Plantillas reales versionadas                         | Implementado RV4; emisión/saldo/redención fuera de contrato                      |
| `/administracion?section=status-colors`                  | Paleta editable                                                            | API real + autorización secundaria                    | Implementado RV4; validación pendiente                                           |
| `/configuraciones?section=company`                       | Empresa, sitio público, LinkPro, redes y contacto                          | Formulario versionado RV5                             | Implementado; consumidor operativo no conectado                                  |
| `/configuraciones?section=website`                       | Estado pendiente de diseño                                                 | Formulario versionado RV5                             | Ampliación consistente; consumidor operativo no conectado                        |
| `/configuraciones?section=agenda`                        | Intervalo, solapes, límites, horarios y campos                             | Formulario versionado RV5                             | Implementado; motor canónico prevalece                                           |
| `/configuraciones?section=payments`                      | Banco, pagos online y estado público                                       | Formulario versionado RV5 sin secretos                | POS conserva autoridad; consumidor operativo no conectado                        |
| `/configuraciones?section=reminders`                     | Canales para cambios y recordatorios                                       | Formulario versionado RV5                             | Implementado; outbox/plantillas se resuelven en RV6                              |
| `/configuraciones?section=records`                       | Categorías/campos de ficha médica                                          | Formulario versionado RV5 + endpoints separados       | Implementado sin mezclar documento y expediente                                  |
| `/configuraciones?section=emails`                        | Remitentes, firma y cumpleaños                                             | Formulario versionado RV5                             | Implementado sin credenciales; proveedor pendiente RV6                           |
| `/configuraciones?section=integrations`                  | Estado pendiente de diseño                                                 | Límite seguro RV5 sin campos documentales             | Secretos/proveedor sólo en infraestructura                                       |
| `/configuraciones?section=notifications`                 | Estado pendiente de diseño                                                 | Formulario versionado RV5                             | Ampliación consistente; consumidor operativo no conectado                        |
| `/configuraciones?section=clients`                       | Duplicados, categorías, campos y filtros                                   | Formulario RV5; definiciones reales tienen API propia | Implementado sin alterar identidad canónica                                      |
| `/configuraciones?section=surveys`                       | Activación y demora de envío                                               | Formulario versionado RV5                             | Implementado; tokens/outbox se resuelven en RV6                                  |
| `/configuraciones?section=authorizations`                | Listado inseguro de códigos mock                                           | Formulario seguro de código personal                  | Conservar pantalla segura; no restaurar listado                                  |
| `/reportes`                                              | Resumen con KPIs, gráficas y tarjetas                                      | Dataset genérico                                      | Restaurar en RV7                                                                 |
| `/reportes/ventas`                                       | No existe                                                                  | Dataset real `SALES`                                  | Diseñar por consistencia con la referencia en RV7                                |
| `/reportes/reservas`                                     | General                                                                    | Dataset `APPOINTMENTS` genérico                       | Restaurar en RV7                                                                 |
| `/reportes/reservas/historial`                           | Tabla, búsqueda, filtros y exportación                                     | Dataset `APPOINTMENTS` genérico                       | Restaurar en RV7                                                                 |
| `/reportes/reservas/rendimiento`                         | Tabla de especialistas/locales/servicios                                   | Dataset `PROFESSIONALS` genérico                      | Restaurar en RV7                                                                 |
| `/reportes/reservas/locales`                             | Redirige a General                                                         | Igual                                                 | Decidir si montar `ReservationLocations` o conservar redirect                    |
| `/reportes/reservas/mensajeria-movil`                    | Redirige a General                                                         | Igual                                                 | Existe `ReservationMobileMessaging`; falta entrada real                          |
| `/reportes/reservas/metricas`                            | Redirige a Rendimiento                                                     | Igual                                                 | Existe `ReservationMetrics`; falta entrada real                                  |
| `/reportes/reservas/servicios`                           | Redirige a General                                                         | Igual                                                 | Existe `ReservationServices`; falta entrada real                                 |
| `/reportes/reservas/servicios-por-local/opatra-mexico`   | Redirige a General                                                         | Igual                                                 | Parametrizar slug/ID; nunca fijar Opatra México                                  |
| `/reportes/reservas/prestadores-por-local/opatra-mexico` | Redirige a Rendimiento                                                     | Igual                                                 | Parametrizar slug/ID; nunca fijar Opatra México                                  |

Los parámetros `?section=` de Administración y Configuraciones se sincronizan en cliente. Las rutas inválidas de Clientes producen 404; se debe conservar una salida clara. La sidebar actual filtra navegación por permisos y contiene el nuevo grupo Ventas; esa seguridad y el estado activo por URL se conservan.

## 4. Matriz de presentación, API y validación

Abreviaturas: `R` lectura, `M` mutación, `P` permiso. Todos los endpoints quedan bajo `/api/scheduler` a través de `schedulerApi`.

| Ruta/estado                                     | Referencia/componente                                                                     | R / M API actual                                                                          | P                                                             | Brecha y prueba prevista                                                                                | Estado                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Shell escritorio/móvil, sidebar abierta/cerrada | `SchedulerLayoutShell`, `SchedulerAppSidebar`                                             | `bootstrap` / `logout`                                                                    | Bootstrap + pantalla activa                                   | Probar ruta profunda, grupo activo, pérdida de permiso, scroll y 390/360 px                             | Inventariado                           |
| Agenda día                                      | `SchedulerWorkspace`, `SchedulerAgendaGrid`                                               | `operationalCatalog`, `appointments`, `scheduleBlocks` / estados                          | `agenda:READ/WRITE`                                           | API pide páginas de 100; cargar hasta `total`; columnas canónicas y zona IANA                           | Inventariado                           |
| Agenda semana                                   | `SchedulerAgendaGrid`                                                                     | mismas lecturas por rango / mismas mutaciones                                             | `agenda`                                                      | La vista API no existe; no usar `schedulerWeekBookings`; probar cambio de semana y medianoche           | Inventariado                           |
| Agenda lista                                    | `SchedulerAgendaList`                                                                     | `appointments` / abrir detalle                                                            | `agenda`                                                      | Falta entrada visual en API; probar vacío y muchas filas                                                | Inventariado                           |
| Filtros y calendario mensual                    | `SchedulerSidebar`, Sheet móvil                                                           | catálogo, estados, horarios/bloqueos                                                      | `agenda:READ`                                                 | Separar profesional/recurso; filtros no deben autorizar disponibilidad                                  | Inventariado                           |
| Nueva/editar/mover cita                         | `SchedulerBookingDialog`                                                                  | búsqueda, disponibilidad, detalle / create, update, move                                  | `agenda:WRITE`; `EXCEPTION` para override                     | API actual sólo crea una línea; restaurar multi-servicio, `expectedVersion`, idempotencia estable y 409 | Inventariado                           |
| Estado/cancelación                              | Card y detalle                                                                            | appointment / status, cancel                                                              | `agenda:WRITE`                                                | Distinguir `ARRIVED`, `WAITING`, `ATTENDED`; motivo obligatorio; no eliminar registro                   | Inventariado                           |
| Bloqueo alta/edición/cancelación                | `SchedulerBlockDialog`                                                                    | blocks / create, update, cancel                                                           | `agenda:WRITE`                                                | API UI actual no edita; cubrir propietario branch/profesional/recurso y versión                         | Inventariado                           |
| Ficha/visitas/finanzas desde cita               | `SchedulerDetailDialog`, `SchedulerClientHistoryDialog`, `SchedulerFinancialAccessDialog` | detail, visits, financial-history / ninguna financiera                                    | `clients:READ` + tres autorizaciones de uso único             | Pagos son sólo lectura; retirar alta/edición/borrado histórico del fixture                              | Inventariado                           |
| Horario bloqueado                               | Alert de confirmación histórico                                                           | availability / create/move con override                                                   | `agenda:EXCEPTION` + `AVAILABILITY_OVERRIDE`                  | Sustituir confirmación mock por autorización ligada, razón >= 10 y auditoría                            | Inventariado                           |
| Clientes listado/filtros/paginación             | `ClientsDatabase`                                                                         | `searchCustomers`, sources, field definitions                                             | `clients:READ`                                                | RV3 pagina y filtra procedencia en servidor; comparación visual/HTTP pendiente por B06                  | Implementado RV3; validación pendiente |
| Clientes alta/edición                           | `ClientsWorkspace`                                                                        | sources / create, update                                                                  | `clients:WRITE`                                               | RV3 mapea identidad, perfil, alias, correos, procedencia, campos por sucursal y versión                 | Implementado RV3; validación pendiente |
| Cliente ficha/históricos                        | diálogos de `ClientsWorkspace`                                                            | detail, visits, financial-history                                                         | `clients:READ` + autorizaciones separadas                     | RV3 separa tokens, errores, expiración, reapertura y paginación; recorrido real pendiente por B06       | Implementado RV3; validación pendiente |
| Clientes combinar/exportar/audiencia/fichas     | diálogos de `ClientsDatabase`                                                             | search/report / merge, export                                                             | `clients:ADMIN/EXPORT`; `CLIENT_MERGE`, `SENSITIVE_EXPORT`    | Fusión real en RV3; importación, audiencias y reporte de fichas siguen explícitamente sin contrato      | Parcial RV3; brecha B03                |
| Comercios/sucursales                            | `CommerceDialog`, `LocalDialog`, `SpecialDayDialog`                                       | candidates/catalog / create/update commerce, update branch, availability rules/exceptions | `administration/locals:ADMIN`                                 | RV4 restaura perfiles, horarios, descansos y excepciones; contacto/imagen siguen sin contrato Scheduler | Implementado RV4; validación pendiente |
| Especialistas/grupos                            | `ProfessionalDialog`, `GroupDialog`                                                       | candidates/catalog / profile, specialty, group, service assignments, availability         | `administration/professionals:ADMIN`                          | RV4 activa empleados existentes y conecta grupos, especialidades, asignaciones y horarios               | Implementado RV4; validación pendiente |
| Servicios/categorías/precios                    | `ServiceDialog`, `CategoryDialog`, `BulkPriceDialog`                                      | candidates/catalog/admin catalog / service, package, addon, class schedule, requirements  | `administration/services:ADMIN`                               | RV4 conecta perfiles, clases, paquetes, complementos y requisitos; precio/categoría masivos quedan B03  | Parcial RV4; validación pendiente      |
| Comisiones                                      | `CommissionDialog`                                                                        | admin catalog + POS refs / `updateCommissionPolicy`                                       | `administration/commissions:ADMIN`                            | RV4 restaura objetivos, modalidades y escalas versionadas; Nómina conserva pago final                   | Implementado RV4; validación pendiente |
| Recursos                                        | `ResourceDialog`, `ScheduledResourceDialog`, `ResourceValidationDialog`                   | catalog / resource, requirements, availability                                            | `administration/resources:ADMIN`                              | RV4 conecta CRUD lógico, capacidad, requisitos y disponibilidad; impacto anticipado de uso queda B03    | Parcial RV4; validación pendiente      |
| Encuestas                                       | `SurveyDialog`, `SurveyQuestionDialog`                                                    | surveys / create, update, issue token                                                     | `administration/surveys:ADMIN`                                | RV6 restaura preguntas, estado, servicios y preview sin tokens/respuestas visibles                       | Implementado RV6; validación pendiente |
| Consentimientos                                 | `ConsentDialog`, file dropzone                                                            | consent templates/records / upload, assign, status                                        | `administration/consents:ADMIN` + autorizaciones privadas     | RV6 restaura versiones, asignación, firma/revocación y URLs efímeras; storage real sigue como gate       | Implementado RV6; validación pendiente |
| WhatsApp                                        | `WhatsAppDialog`, `TemplateDialog`                                                        | templates/outbox / create, update, enqueue, retry                                         | `administration/whatsapp:ADMIN`                               | RV6 diferencia encolado/entrega, exige consentimiento e idempotencia y no activa el proveedor            | Implementado RV6; validación pendiente |
| Gift cards                                      | `GiftCardDialog`                                                                          | admin catalog + POS refs / create, update                                                 | `administration/gift-cards:ADMIN`                             | RV4 restaura plantillas monto/servicio; saldo/redención permanecen fuera del contrato Scheduler         | Implementado RV4; validación pendiente |
| Colores                                         | `StatusColorsSection`                                                                     | admin catalog / update colors                                                             | `administration/status-colors:ADMIN` + `STATUS_COLORS_CHANGE` | RV4 conserva versiones y autorización ligada al comercio, sin `localStorage` operativo                  | Implementado RV4; validación pendiente |
| Configuración 11 documentos                     | paneles de `SettingsWorkspace`                                                            | `resolvedSetting` / `updateSetting`                                                       | pantalla de sección `READ/WRITE/ADMIN`                        | RV5 mapea campos/consumidores, aísla capas y preserva claves desconocidas y borradores                  | Implementado RV5; validación pendiente |
| Código personal                                 | formulario seguro actual                                                                  | bootstrap / `updateSecondarySecret`                                                       | sesión; contraseña actual                                     | Diferencia semántica obligatoria respecto a referencia                                                  | Decisión aceptada por seguridad        |
| Resumen                                         | `ReportsWorkspace`                                                                        | report keys de resumen / export                                                           | `reports/summary:READ/EXPORT`                                 | Mapear cada KPI/serie a dataset completo y zona; sin cifras inventadas                                  | Brecha B05                             |
| Reservas General                                | `ReservationReportWorkspace`                                                              | APPOINTMENTS/OCCUPANCY/CANCELLATIONS/NO_SHOW                                              | `reports/reservations`                                        | Mapear hora, origen, estado, evolución, top y comparación                                               | Brecha B05                             |
| Historial                                       | misma workspace, vista history                                                            | APPOINTMENTS / export                                                                     | `reports/reservations:EXPORT`                                 | Filtros búsqueda/estado/pago y paginación; verificar paridad                                            | Brecha B05                             |
| Rendimiento                                     | misma workspace, vista performance                                                        | PROFESSIONALS/SERVICES/OCCUPANCY/COMMISSIONS                                              | permisos de reservas/resumen/ventas según dato                | Unificar fuentes sin duplicar comisiones/ventas POS                                                     | Brecha B05                             |
| Ventas y pagos                                  | sin referencia directa                                                                    | SALES/PAYMENTS/COMMISSIONS / export                                                       | `reports/sales`                                               | Extensión funcional; mantener lenguaje visual sin afirmar aprobación histórica                          | Inventariado                           |
| Encuestas/recordatorios                         | `SurveyReportWorkspace`, `RemindersWorkspace`                                             | SURVEYS/COMMUNICATIONS / export, retry por módulo admin                                   | summary + permisos de engagement                              | Restaurar métricas/estados de proveedor y filtros                                                       | Inventariado                           |
| Desgloses profundos                             | cinco componentes `Reservation*`                                                          | SERVICES/PROFESSIONALS/COMMUNICATIONS/APPOINTMENTS                                        | `reports/reservations` y quizá sales                          | Seis URLs redirigen; definir routing y datasets por local                                               | Brecha B07                             |

## 5. Inventario de diálogos, pestañas y acciones visibles

### Agenda

- Cabecera: Día, Semana, Hoy, anterior/siguiente, leyenda, actualizar, distribuir columnas, filtros, copiar y Nuevo. Distribuir/copiar no tienen efecto operativo en la referencia y deben confirmarse antes de restaurar.
- Panel: calendario/lista, comercio, sucursal, búsqueda y selección de profesionales, estados, hora rápida, calendario mensual y ocultar/mostrar recursos.
- Grid/tarjetas: alta por slot, bloquear slot, abrir detalle, editar, cancelar, cambiar estado, historial de visitas, expediente, historial financiero y decisión de compra/asistencia. El menú de estado histórico no distingue toda la semántica canónica.
- Diálogos: reserva nueva/edición con cliente existente o alta rápida, información adicional, servicio, profesional, fecha/hora, estado y notas; bloqueo nuevo/edición/cancelación; detalle en vistas ficha/pago/asistencia; autorización para ficha/visitas/finanzas; historial de visitas; historial de ventas; confirmación de override bloqueado; confirmación reforzada para borrar pago.
- Decisión: la restauración no permitirá mutar pagos ni borrar citas/pagos. Cancelará con versión/motivo y mantendrá finanzas POS en lectura.

### Clientes

- Alta y ficha de contacto; búsqueda, orden, filtros básicos/inteligentes, selección múltiple y paginación.
- Acciones históricas: importar, crear audiencia, descargar CSV con autorización, reporte de fichas por rango, combinar clientes y ver ficha.
- Diálogos: nuevo cliente, ficha, audiencia, autorización de descarga y reporte de fichas. Merge debe usar su autorización/contrato real; importación, audiencias y reporte de fichas quedan como brechas.

### Administración

- Comercios: alta/edición, estado, horario, sucursales asociadas; sucursales con alta/edición, contacto, imagen, horario, descansos, días especiales y activación.
- Especialistas: filtros por local/estado, alta/edición, perfil, sucursales, servicios, horario, comisiones, grupos y activación.
- Servicios: categorías; alta/edición de servicio, clase, paquete y adicional; precio, IVA, duración, capacidad, profesionales, recursos, horario especial, web; importación/exportación masiva de precios.
- Comisiones: alta/edición/desactivación y escalas por modalidad/periodo/objetivo.
- Recursos: alta/edición/desactivación, horario, servicios/locales y validación de uso.
- Encuestas: alta/edición/desactivación, preguntas, servicios y estado.
- Consentimientos: alta/edición/desactivación, archivo y asociación.
- WhatsApp: configuración y plantillas, variables y estado.
- Gift cards: alta/edición/desactivación, tipo, precio/monto, vigencia, servicios y diseño.
- Colores: comercio, paleta, restablecer y guardar con autorización.
- Diálogos/componentes confirmados: `CommerceDialog`, `LocalDialog`, `SpecialDayDialog`, `ProfessionalDialog`, `GroupDialog`, `ServiceDialog`, `CategoryDialog`, `BulkPriceDialog`, `CommissionDialog`, `ResourceDialog`, `ScheduledResourceDialog`, `ResourceValidationDialog`, `SurveyDialog`, `SurveyQuestionDialog`, `ConsentDialog`, `WhatsAppDialog`, `TemplateDialog`, `GiftCardDialog` y `ConfirmDialog` compartido.

### Configuraciones

- Empresa agrupa personalización/sitio, LinkPro, redes y datos de contacto. Agenda, Pagos, Recordatorios, Fichas médicas, E-mails, Clientes y Encuestas tienen formularios históricos completos.
- Sitio web, Integraciones y Notificaciones muestran “pendiente” en la referencia; no existe un formulario aprobado que copiar.
- Existe un `RegisterSettingsPanel` histórico de caja/facturación, pero no está en la navegación aprobada ni en `SCHEDULER_SETTING_SECTIONS`; POS conserva esa autoridad. Se registra como superficie huérfana, fuera de restauración hasta decisión explícita.
- Diálogos: edición de nombres/categorías/campos/opciones de Clientes y Fichas; confirmaciones de borrado; el diálogo/listado histórico de códigos se descarta por seguridad.

### Reportes

- Resumen: periodo, detalle de reservas, KPIs, estados, ocupación, origen, ventas, tendencia, cumpleaños y accesos a Clientes/Reservas.
- Reservas: pestañas General/Historial/Rendimiento; periodo, comparación, Local, Especialista, Origen, búsqueda, estado/pago, “Ver por”, exportación y guía.
- Desgloses presentes por código: Locales, Métricas, Mensajería móvil, Servicios y Prestadores por local. Sus rutas no los montan en ninguno de los dos commits comparados.

## 6. Brechas y decisiones de contrato

| ID  | Hallazgo RV0                                                                                                                                                                                                                                                                                                                                                                            | Clasificación                  | Fase                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| B01 | `SchedulerAppointmentDto` incluye nombre, servicios, profesionales, recursos, membresía, origen, estado y versiones; no incluye teléfono, correo, avatar ni precio. Estos datos requieren consulta autorizada de cliente y referencias financieras agregadas para evitar N+1.                                                                                                           | Contrato/presentación          | RV1/RV2                                         |
| B02 | `serviceWriteSchema.professionalProfileIds` exige `min(1)`. `PENDING` es un estado de cita asignada y ocupa disponibilidad; no existe cola canónica sin profesional/recurso.                                                                                                                                                                                                            | Regla funcional                | RV2; requiere decisión/backend si se desea cola |
| B03 | RV3 cubre identidad, perfil, fusión y campos; RV4 cubre grupos/especialidades, horarios, requisitos, paquetes, edición de complementos y gift cards de servicio; RV6 cubre engagement, expediente médico y documentos. Quedan sin simular importación/audiencias/reporte de fichas, precio/categoría masivos, identidad visual de sucursal, candidatos de complemento, validación anticipada de uso de recursos y operación financiera de gift cards. | Cobertura API/UI               | Parcial RV3/RV4/RV6; contratos comerciales      |
| B04 | RV5 confirmó que los once documentos no tienen consumidores operativos, lo documenta por campo y lo muestra en los formularios. La respuesta resuelta expone cada documento de capa autorizado para evitar copiar valores efectivos; cualquier consumidor futuro requiere contrato y pruebas propios.                                                                                   | Efecto funcional resuelto      | RV5; consumidores futuros fuera de alcance      |
| B05 | Existen doce datasets canónicos y exportación completa, pero la tabla genérica no prueba la correspondencia de cada KPI, serie, comparación o formato de la referencia. Sólo CSV está implementado.                                                                                                                                                                                     | Agregación/formato             | RV7                                             |
| B06 | Build aislado y Playwright están instalados; el sandbox bloquea servidores y Chromium. No hay `DATABASE_URL`, `.env.dev`, `psql`, `postgres` ni Docker; Podman no puede preparar `/run/user/1000/libpod`.                                                                                                                                                                               | Ambiente                       | Capturas RV0 y pruebas API/BD RV2+              |
| B07 | Seis rutas profundas redirigen en referencia y HEAD, mientras cinco componentes visuales permanecen sin montar. Los slugs `opatra-mexico` no son IDs canónicos ni generalizables.                                                                                                                                                                                                       | Routing/dataset                | RV7                                             |
| B08 | La referencia contiene mutaciones locales de pagos e información financiera. RV2 y RV3 las sustituyen por lectura protegida y paginada; POS permanece como autoridad y no se exponen mutaciones.                                                                                                                                                                                        | Diferencia semántica necesaria | Resuelta RV2/RV3                                |
| B09 | La referencia incluye códigos mock visibles y login redirigido. Deben conservarse el login JWT, bootstrap, permisos, formulario personal seguro y autorizaciones opacas de uso único.                                                                                                                                                                                                   | Seguridad necesaria            | Transversal                                     |
| B10 | `/reportes/ventas` no tiene equivalente en `e9077dd`; es una ampliación funcional posterior que requiere coherencia visual, no una comparación píxel a píxel.                                                                                                                                                                                                                           | Extensión sin referencia       | RV7                                             |

## 7. Infraestructura disponible

| Recurso                           | Resultado                                                               |
| --------------------------------- | ----------------------------------------------------------------------- |
| Node.js                           | `v24.18.0`; cumple `>=22.12.0`                                          |
| pnpm                              | `10.0.0`                                                                |
| Git                               | `2.55.0`                                                                |
| Playwright                        | `1.60.0` desde `@cosmetics/e2e`                                         |
| Chromium/Chrome                   | Binarios presentes; lanzamiento bloqueado por sockets del sandbox       |
| Puertos locales                   | Bloqueados con `listen EPERM`                                           |
| Instalación offline de referencia | Correcta, 976 paquetes reutilizados del store                           |
| Build de referencia               | Correcto, 20 páginas generadas                                          |
| PostgreSQL cliente/servidor       | No instalados                                                           |
| `DATABASE_URL` / `.env.dev`       | No configurados                                                         |
| Docker                            | No instalado                                                            |
| Podman                            | Instalado, pero runtime inutilizable por filesystem de `/run/user/1000` |
| API/BD desechable                 | No disponible en esta sesión                                            |

No se ejecutaron escrituras, migraciones, seeds, envíos ni consultas contra ambientes externos. La prueba visual y las pruebas mutantes API/BD deben ejecutarse en un ambiente desechable con las variables y permisos definidos en las fases correspondientes.

## 8. Criterio de salida de RV0

Quedaron completos el inventario de rutas, estados, pestañas, diálogos y acciones; la matriz de componentes/API/permisos; la comparación de referencia/HEAD; la clasificación de brechas; el procedimiento aislado y el runner determinista. La fase se clasifica como **Implementada; validación pendiente** porque el sandbox impidió producir las capturas requeridas. Para validarla sólo falta ejecutar el runner en un host donde Chromium pueda iniciar, revisar que no aparezcan datos ajenos a los fixtures y enlazar los archivos generados desde este documento.
