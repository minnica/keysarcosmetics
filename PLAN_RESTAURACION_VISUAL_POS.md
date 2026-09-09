# Plan por fases: visual aprobado del POS y reutilización del backend

> Fecha: 2026-09-08.
> Estado: RV0–RV2 y RV4 completadas; RV3 implementada con cierre formal pendiente por B01; RV5–RV7, RV9 y RV10 pendientes para el MVP; RV8 trasladada al backlog post-MVP.
> Referencia visual única: `feature/pos` en `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Objetivo: reproducir íntegramente esa interfaz, conectar sus operaciones al backend reutilizable y adaptar, sustituir o eliminar las implementaciones incompatibles. Nunca modificar el visual para acomodarlo al backend.
> Alcance de entrega inmediata: MVP online compartible con el PO. Conserva el visual aprobado y prioriza sus recorridos demostrables; la operación offline, el endurecimiento exhaustivo y los pilotos de producción quedan en backlog explícito.

## 1. Decisión vigente y precedencia

El usuario identifica como visual aprobado por el PO el árbol completo del commit [12fb8045cc264b565cb6e764d95ad7b2447fbfa1](https://github.com/minnica/keysarcosmetics/commit/12fb8045cc264b565cb6e764d95ad7b2447fbfa1). Esta decisión sustituye la propuesta anterior de recuperar `8fd71f36ae665c650063207d32e25dc799b6fa92` y añadir selectivamente los módulos posteriores.

- `8fd71f3` queda únicamente como referencia histórica, no como objetivo de restauración.
- Se conserva el conjunto acumulado de pantallas, módulos y cambios visuales presentes en `12fb804`, incluidos Membresías, cortesías, pagos/MSI, reportes, Catálogo dentro de Ventas, salida sin Close day y calendario de cumpleaños.
- La referencia es el SHA fijo, no el nombre móvil de la rama ni sus commits futuros.
- No se autoriza una reinterpretación, modernización, simplificación ni un diseño «parecido». Tampoco trasladar funciones a nuevos diálogos o pantallas si esa distribución no existe en la referencia.
- El backend desarrollado bajo `PLAN_BACKEND_POS.md` es un activo reutilizable, sujeto a compatibilidad con esta interfaz. Sus decisiones de implementación no justifican cambiarla.
- La fidelidad visual no obliga a recuperar los mocks como persistencia, las credenciales demostrativas como accesos reales ni los cálculos inseguros del navegador. Se conserva la presentación y se implementa correctamente la operación detrás de ella.
- Una contradicción que no pueda resolverse internamente se registra como impedimento concreto. No se inventa una interfaz alternativa, no se omite la función silenciosamente y no se declara terminado el módulo.

Este documento gobierna la restauración y prevalece sobre recomendaciones visuales anteriores en `CLAUDE.md`, `PLAN_BACKEND_POS.md` y documentos históricos. Las restricciones de integridad de datos, aislamiento entre aplicaciones y seguridad siguen aplicando.

## 2. Referencias y hallazgos de partida

| Referencia                                 | Uso                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `12fb8045cc264b565cb6e764d95ad7b2447fbfa1` | Fuente visual y de interacción obligatoria; rama `feature/pos` verificada mediante MCP de GitHub el 2026-09-08.                         |
| `6097a4b9a4d5bce38042fc9a5380a008f4a22478` | Estado de backend/integración analizado en `feature/pos-frontend-clean`; registrar el SHA efectivo nuevamente al comenzar la ejecución. |
| `070e62f252736d50ed8134a4f6908231534f1f63` | Integró las novedades de `feature/pos` hasta `866ff7e`; sirve para rastrear diferencias, no como baseline visual.                       |
| `PLAN_BACKEND_POS.md`                      | Historial de fases 0–14, contratos, entidades y verificaciones pendientes.                                                              |
| `apps/pos/archivo.md` en `12fb804`         | Referencia funcional complementaria; el renderizado del SHA objetivo determina la presentación.                                         |

Hallazgos comprobados durante el análisis previo:

- Aunque se titula «add new modules», `12fb804` sólo añade 30 líneas a `packages/ui/src/components/ui/date-picker.tsx`: idioma español y navegación opcional por mes/año. Las novedades de módulos provienen de sus antecesores `f45cd44`, `c526591` y `866ff7e`.
- El CSS del POS de `12fb804` coincide con el incorporado en `070e62f`. La restauración no consiste principalmente en revertir una paleta: hay diferencias de markup, controles, estados y permisos introducidas por la integración.
- La versión objetivo utiliza `quickMonthYearNavigation` en el cumpleaños de Checkout. La integración actualmente analizada no contiene ese uso ni la ampliación correspondiente de `DatePicker`.
- En modo API, `Employees` oculta controles de registro de vendedor/rol y añade campos de autorización que difieren del frontend objetivo. Hay que resolver sus operaciones, no simplemente mostrar botones sin implementación.
- La rama visual y la rama integrada tienen diferencias en `packages/ui`, incluyendo pruebas y componentes compartidos. No copiar el monorepo completo ni reemplazar sus dependencias y paquetes indiscriminadamente.
- Las fases 9–14 ya contienen backend para las principales novedades. Su existencia en código no acredita que todos los recorridos funcionen ni que se hayan ejecutado los pilotos y pruebas externas pendientes.

## 3. Qué significa «visual intacto»

La comparación debe hacerse con los mismos datos, permisos, configuración, fecha/hora, viewport, escala, fuentes y motor de renderizado. En operación real cambian los nombres, importes y existencias; eso no autoriza cambiar el diseño que los presenta.

Se consideran parte del contrato:

- Pantallas, navegación, orden y ubicación de módulos, expansión/contracción, enfoque de Ventas y de cierre, pin y temporizadores del sidebar.
- Tipografías, iconos, imágenes, colores, bordes, sombras, dimensiones, márgenes, densidad y jerarquía de textos.
- Botones, etiquetas, campos, validaciones visibles, tablas, tarjetas, indicadores, filtros y paginación.
- Diálogos, popovers, calendarios, tooltips, menús, scroll, truncamiento y orden de foco.
- Comportamiento responsive, animaciones, transiciones y presentación bloqueada del catálogo.
- Tickets, vouchers, vistas de impresión y formato visible de exportaciones.
- Estados de acceso, error, vacío, confirmación y conexión que ya existan en la referencia.

No se permite retirar u ocultar controles porque aún no exista un endpoint; reemplazar pantallas por tablas genéricas; añadir alias, PIN u otros campos para satisfacer un contrato nuevo; cambiar el orden del flujo; ni añadir avisos técnicos permanentes. Las condiciones legítimas de permisos deben compararse con un usuario de permisos equivalentes, no usar una cuenta restringida para ocultar diferencias.

Si una operación asíncrona necesita comunicar un resultado, se reutilizan los canales visuales presentes en la referencia sin alterar la geometría. Nunca mostrar una confirmación de éxito antes de persistir o encolar durablemente la operación. Si el estado necesario no puede representarse de forma veraz con el contrato visual, se documenta el caso sin introducir un diseño unilateral.

## 4. Estrategia técnica y tratamiento del backend

Trabajar sobre una rama de integración que conserve el backend actual y restaurar desde el SHA objetivo la presentación de POS por unidades verificables. Mantener una copia de referencia aislada y reproducible. No revertir commits completos ni restaurar globalmente el repositorio.

Separar, cuando sea necesario y sin alterar el DOM visible, la carga de datos, comandos y traducción de contratos de los componentes de presentación. Los adaptadores resuelven IDs, importes, fechas, enumeraciones, permisos y relaciones; no se convierten en una segunda fuente de verdad financiera ni duplican las reglas del servidor.

Cada capacidad debe clasificarse con evidencia:

| Clasificación                   | Decisión                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Reutilizable                    | Conservar contrato/servicio y conectarlo al control original.                                                                       |
| Adaptable                       | Cambiar DTO, servicio, endpoint o adaptador para que la operación funcione con los campos y flujo aprobados.                        |
| Faltante                        | Implementar el soporte necesario para una operación existente en la interfaz objetivo.                                              |
| Incompatible y reemplazable     | Implementar el reemplazo, migrar consumidores y retirar la implementación anterior.                                                 |
| Incompatible y sin uso          | Eliminar código, rutas, tipos, permisos técnicos y dependencias exclusivamente sobrantes después de comprobar consumidores y datos. |
| Conflicto sin solución definida | Registrar el impedimento específico; no modificar el visual para ocultarlo ni cerrar la fase.                                       |

No tener representación visual no convierte automáticamente una pieza en incompatible. Auditoría, idempotencia, conciliación, aislamiento de sucursales, protección de costos y proyecciones financieras pueden ser necesarias detrás de una pantalla idéntica.

La eliminación autorizada se refiere a implementaciones incompatibles dentro del alcance POS. No implica borrar ventas, pagos, membresías, auditoría, operaciones offline pendientes ni datos compartidos. Para retirar estructuras persistentes: verificar el estado real de migraciones y consumidores, preservar/exportar o migrar información cuando corresponda y usar migraciones nuevas. No reescribir migraciones aplicadas, usar `migrate reset` ni asumir que una tabla está vacía porque un documento anterior lo diga. Cualquier destrucción de datos operativos requiere una decisión explícita sobre esos datos.

### 4.1 Alcance acelerado del MVP para revisión del PO

El MVP no cambia ni simplifica el diseño de `12fb804`. Reduce la profundidad de certificación previa a la primera revisión y concentra el esfuerzo en que el recorrido online visible sea real, persistente y demostrable.

Son indispensables para compartir el MVP:

- acceso, jornada y permisos ya implementados; catálogo, clientes, inventario y configuración de RV4;
- venta, checkout, cobro, ticket y consulta posterior de la operación;
- membresías y citas en su recorrido principal online, sin certificar todavía todas las incidencias externas;
- Dashboard, caja, recibos, ventas y reportes principales con datos autorizados;
- ausencia de confirmaciones ficticias, protección de costos/sucursales y conciliación de importes del recorrido principal;
- type-check, pruebas dirigidas de lo modificado y una comparación visual final en Chromium contra la referencia aprobada.

Pasan al backlog post-MVP:

- RV8 completa: operación offline, outbox durable, recuperación, compatibilidad de cachés y sincronización tras conflictos;
- pruebas exhaustivas de pérdida de red, cierre/reinicio de proceso, grants vencidos, reenvíos y orden de operaciones;
- matriz visual completa repetida en cada fase; durante RV5–RV7 se capturan sólo pantallas y estados modificados;
- matriz visual completa en Electron, instalable, `file://`, impresoras y hardware; para el MVP se conserva un smoke test dirigido cuando el entorno lo permita;
- carga y composición exhaustiva con 1, 10, 20 y 30 sucursales, históricos extremos, grandes volúmenes y todas las combinaciones de nombres largos/vacíos;
- piloto operativo real de una y múltiples sucursales, pruebas externas completas de Agenda y recuperación/rollback de producción;
- limpieza de código legado que no tenga consumidores activos ni bloquee seguridad, compilación o el recorrido del MVP.

Un pendiente de backlog no puede presentarse como validado. El MVP se declara **online** y la promoción a producción continúa condicionada al endurecimiento correspondiente.

## 5. Fases de ejecución

RV0 y RV1 quedaron completadas el 2026-09-08: RV0 generó 208 capturas canónicas desde la referencia aislada y RV1 documentó la correspondencia interfaz–backend, consumidores y retiros condicionados. RV2 quedó completada el 2026-09-09 sobre el worktree iniciado en `2dabbf24b1347ce0bdbd4ddc1b6fa07ed5696471`; restauró la presentación y comparó 208 escenarios. RV3 quedó implementada el 2026-09-09 sobre `d2eceb9e21271d1eaab0280b738b60b6c78caeef`: sus migraciones, contratos, integración HTTP y matriz visual pasan, pero B01 impide declarar su cierre formal hasta que Producto autorice el texto veraz de Close Day. RV4 quedó completada el 2026-09-09 con persistencia real, 45 migraciones reconstruidas, 18 pruebas HTTP habilitadas y matriz visual 208/208. RV5–RV7, RV9 y RV10 completan el camino crítico del MVP. RV8 queda fuera de esta entrega y pasa al backlog post-MVP. Su numeración `RV` es independiente de las fases históricas 0–14. Cada fase registra SHA inicial/final, archivos, operaciones conectadas, evidencia visual, pruebas ejecutadas, pendientes y partes retiradas. La finalización del MVP exige fidelidad visual y funcionamiento real del alcance online acordado; no acredita los gates post-MVP.

### RV0 — Congelar la referencia y construir evidencia reproducible

- [x] Confirmar mediante MCP de GitHub el SHA objetivo, su árbol y antecedentes; fijar el SHA efectivo del backend de partida.
- [x] Preparar referencia aislada y candidato con versiones registradas de Node, pnpm, navegador/Electron, lockfile, fuentes y assets. Identificar diferencias de runtime que puedan afectar renderizado.
- [x] Inventariar todas las pantallas y variantes de `12fb804`, incluidos accesos protegidos, estados vacíos, formularios, modales y salidas impresas. Asignar un identificador a cada escenario.
- [x] Crear datos sintéticos reproducibles, reloj y configuración fijos. Aislar estos fixtures de cualquier BD operativa y de la compilación productiva.
- [x] Capturar referencias iniciales en escritorio `1440×900`, tablet `920×900`, móvil `390×844` y ancho mínimo `320px`; añadir anchos a ambos lados de breakpoints relevantes y los anchos reales de terminal que se conozcan. Se generaron 208 capturas, incluidas sondas adyacentes a `920`, `720`, `640` y `420` px y a `760` px de alto. Los tamaños físicos de terminal aún no conocidos se añadirán cuando Operación los entregue.
- [x] Registrar recorridos de interacción y tiempos para navegación, animaciones y catálogo. Las capturas estáticas no sustituyen esas comprobaciones.
- [x] Versionar el manifiesto de escenarios y las capturas con el SHA de procedencia; no generarlas desde el candidato restaurado. Los 208 PNG y `capture-index.json` se publicaron atómicamente bajo el SHA completo `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.

**Entregables:** `docs/POS_VISUAL_BASELINE.md`, los manifiestos en `apps/e2e/pos-visual`, el capturador/validador/comparador en `apps/e2e/scripts` y el baseline completo en `docs/artifacts/pos-visual-baseline/12fb8045cc264b565cb6e764d95ad7b2447fbfa1/reference`.

**Cierre:** completada. La referencia compiló sin correcciones y Chromium `148.0.7778.96` produjo 208/208 capturas con Node `22.23.2`; el índice registra SHA, runtime, dimensiones y hash individual, y la verificación posterior confirmó cero hashes inválidos. Cada pantalla objetivo tiene escenario asignado y el arnés falla de forma cerrada si la fuente no corresponde al SHA. La validación Electron y los tamaños físicos de terminal permanecen como gates posteriores de hardware/operación, no como bloqueantes del baseline RV0.

### RV1 — Auditar la correspondencia interfaz–backend y las incompatibilidades

- [x] Mapear cada acción del inventario a componentes de `12fb804`, campos visibles, permisos, endpoint, servicio, entidades, efecto offline e impresión/exportación.
- [x] Clasificar cada capacidad según la sección 4, con evidencia de reutilización o motivo de sustitución/eliminación.
- [x] Auditar especialmente altas de vendedores/roles, autorizaciones por código, cambios de sucursal, edición/cancelación de tickets, pagos y reservas. Identificar dónde el backend actual añadió u ocultó controles.
- [x] Auditar consumidores compartidos: Envelope, Payroll, Scheduler, tipos, cliente HTTP, workers y binarios POS/offline anteriores. Distinguir dependencias operativas de simples imports.
- [x] Comparar dependencias y componentes de `packages/ui` entre ambas referencias. Definir qué comportamiento necesita POS sin revertir correcciones ni borrar pruebas de otras apps.
- [x] Inventariar los controles de My Account y Websites. Conservar su visual; separar operación POS de cobros SaaS o integraciones externas que el plan anterior excluyó. Registrar faltantes explícitos, sin simular cobros reales ni ampliar silenciosamente ese alcance.

**Entregable:** `docs/POS_UI_BACKEND_COMPATIBILITY.md`, con una fila por operación y por retirada propuesta: evidencia, decisión, consumidores, datos afectados, fase y prueba de aceptación.

**Cierre:** todas las operaciones visibles tienen destino técnico definido; las incompatibilidades están descritas sin propuestas de rediseño. Las discrepancias funcionales pendientes no se confunden con soporte ya implementado.

**Resultado:** completada. `docs/POS_UI_BACKEND_COMPATIBILITY.md` registra 101 capacidades visibles, 17 retiros condicionados, los consumidores compartidos y las diferencias de `packages/ui`. Los conflictos de copy operativo, autorización delegada, edición de pedidos de bodega, facturación SaaS y Websites permanecen explícitos y asignados a fases posteriores; RV1 no alteró código ejecutable, datos ni migraciones.

### RV2 — Recuperar la presentación completa y sus componentes compartidos

- [x] Recuperar markup, CSS, textos, assets y composición del renderer de `12fb804`. Conservar el código de integración útil detrás de interfaces de datos y comandos.
- [x] Reproducir todas las vistas incluidas en ese árbol, tanto las preexistentes como Membresías y las ampliaciones de Settings, Checkout, clientes y reportes.
- [x] Conservar Catálogo dentro de Ventas, tamaño compacto de la sección Sistema, salida sin Close day y las reglas responsive del SHA objetivo; no volver a la navegación de `8fd71f3`.
- [x] Incorporar fielmente el calendario con español y navegación mes/año de cumpleaños. Resolver diferencias de los primitivos compartidos mediante variantes delimitadas si hacen falta, sin cambios visibles en POS ni regresiones en otras apps.
- [x] Preservar las rutas relativas de assets para HTTP y `file://`. Mantener el IPC, aislamiento del renderer y repositorio offline seguro del runtime actual.
- [x] Ejecutar toda la matriz visual con fixtures y establecer comparación automatizada contra RV0. Registrar por separado las operaciones todavía no conectadas.

**Cierre:** completada. Chromium `148.0.7778.96` capturó 208/208 escenarios del candidato con las mismas condiciones de RV0. La comparación resultó 205/208 idéntica píxel a píxel y 208/208 aprobada con un umbral explícito de `0.000027`: las tres variaciones medidas fueron de 34, 21 y 11 píxeles antialiasados sobre 1,296,000, sin diferencias de geometría, texto, estilo o controles. El comparador cuenta ahora píxeles binarios reales bajo ImageMagick HDRI. Los fixtures visuales requieren `VITE_POS_DATA_MODE=mock` y `VITE_POS_VISUAL_FIXTURE=1`; el build normal conserva `api` como modo por defecto y no hace fallback a mock. Esta fase acredita presentación, no operación real completa. Evidencia, límites y comandos: `docs/POS_RV2_PRESENTATION_RESTORATION.md`.

### RV3 — Acceso, permisos, empleados, sucursales y jornada

- [x] Conectar login, sesión, terminal, bloqueo/desbloqueo y autorizaciones usando exactamente los formularios aprobados.
- [x] Adaptar la resolución segura de identidad si la referencia solicita sólo código. No recuperar un código master universal en el cliente ni añadir un campo de alias para evitar adaptar el servidor.
- [x] Dar soporte real a los controles de vendedores, roles, credenciales y asignaciones presentes en Employees; reutilizar empleados/puestos canónicos y crear las operaciones faltantes sin duplicar identidades compartidas.
- [x] Conectar Clock In/Out, salida sin Close day, apertura, conteos y cierre. Preservar campos, comparativos por permiso, confirmaciones, regreso al menú y pantalla enfocada de cierre.
- [x] Probar revocación de sesión, cambio de permisos, autorizaciones vencidas, doble envío y límites por sucursal sin alterar las vistas objetivo.

**Estado de implementación:** completada. Las 44 migraciones se reconstruyeron desde cero en PostgreSQL 16 desechable y la integración HTTP pasó 17/17 pruebas habilitadas; cubre acceso, permisos, alcance, personal, delegación, apertura, asistencia, doble Clock Out, salida sin cierre, conteo/cierre idempotente, cambio/revocación de terminal y revocación inmediata. La matriz Chromium permanece 208/208 `PASS`, sin ocultar controles. El cierre formal queda pendiente únicamente por B01: la referencia imprime “mock/simulación” en Close Day y se preservó intacta hasta recibir texto autorizado por Producto. Evidencia y decisiones: `docs/POS_RV3_ACCESS_WORKFORCE_DAY.md`.

### RV4 — Catálogo, clientes, inventario, bodega y configuración

- [x] Conectar productos, servicios y membresías, publicación, precios, imágenes, beneficios y catálogo digital con sus cuatro apariencias y bloqueo.
- [x] Conectar búsqueda/edición/registro de clientas, cartera, procedencia, cumpleaños y copia de Teléfono a WhatsApp.
- [x] Conectar proveedores, inventario, movimientos, conteos, pedidos de sucursales, matriz, resurtidos, dobles aprobaciones, recepción, cancelación y reversas.
- [x] Conectar Settings, métodos de pago, bancos/redes/plazos, cortesías, vouchers, paquetes/promociones, competencias y configuración operativa de empresa/ticket.
- [x] Mantener orden, nombres, tablas, campos y acciones de cada formulario objetivo; adaptar operaciones masivas y guardados al flujo existente.
- [x] Reutilizar la lógica transaccional válida y retirar variantes sustituidas después de probar sus nuevos consumidores.

**Cierre:** completada. Altas, ediciones, publicación, movimientos y configuraciones usan API/Prisma y sobreviven recarga; las autorizaciones sensibles son de servidor y de un solo uso, costos y sucursales permanecen protegidos. PostgreSQL 16 reconstruyó las 45 migraciones y la integración terminó 18/18 habilitada. La matriz Chromium quedó 208/208 `PASS` (206 exactas y dos variaciones de antialiasing de 34 y 20 píxeles bajo `0.000027`) sin cambiar el baseline. Evidencia: `docs/POS_RV4_CATALOG_CUSTOMERS_INVENTORY_SETTINGS.md`.

### RV5 — Venta, checkout, pagos, tickets y proyección financiera

- [ ] Conectar el flujo exacto de Ventas y Checkout de `12fb804`: carrito, precios, SPARE, descuentos, paquetes, clientes, vendedores, presencia Clock In y empresa participante.
- [ ] Adaptar cotización y confirmación a los pasos/campos aprobados, con importes exactos. La respuesta autoritativa no añade paneles ni pasos ajenos al diseño.
- [ ] Conectar pagos mixtos, crédito/débito, banco/red, autorización y MSI; apartados, abonos, liquidaciones, adeudos y entregas.
- [ ] Conectar revisión, cancelación, devolución, vouchers, impresión/reimpresión y expediente, conservando los diálogos y formatos del SHA objetivo.
- [ ] Resolver el efecto contable de ediciones y correcciones mediante historial/compensaciones internas cuando corresponda. No exigir rediseñar el editor para exponer el modelo de eventos.
- [ ] Probar retries, descuentos autorizados, redondeos, empresa/vendedores y proyección única hacia `Venta/VentaDetalle` sin comisiones duplicadas.

**Cierre:** venta normal, pago mixto, apartado/liquidación y corrección concilian al centavo; tickets y vouchers conservan el formato aprobado. Ninguna confirmación representa una operación perdida o duplicada.

### RV6 — Membresías, Agenda y seguimiento

- [ ] Conectar la pantalla de Membresías íntegra: acceso personal, filtros, indicadores, ranking, cierres, tarjetones, perfiles, cambios de estado/vendedor y alertas.
- [ ] Conectar las superficies de membresías ya presentes en Customers, Receipts, Mis ventas y Dashboard sin moverlas ni agregar otras.
- [ ] Reutilizar tarjetones por unidad, activación por liquidación, estados pendientes y consumo único. Traducir estados internos a los estados visuales adecuados sin presentar como activa una membresía pendiente.
- [ ] Conectar Citas, disponibilidad, cabinas, cortesías y próxima sesión desde los controles de la referencia. Conservar su distribución, selección, etiquetas y respuesta de disponibilidad.
- [ ] Mantener credenciales y llamadas externas en servidor; probar webhooks, no-show, cancelaciones, capacidad concurrente y compensación de reservas parciales.
- [ ] Encajar reintentos e incidencias en las superficies aprobadas. Si una incidencia requiere una acción que no existe allí, registrar el conflicto y resolver el contrato operativo sin inventar una nueva pantalla.

**Cierre:** venta → tarjetón → reserva → asistencia → saldo → siguiente sesión funciona sin duplicación y con evidencia visual en cada paso. Las pruebas reales de integración con Agenda que no puedan ejecutarse permanecen pendientes.

### RV7 — Reportes, caja, notificaciones y exportaciones

- [ ] Conectar Dashboard, Receipts, Mis ventas, Customers, Cash Manager, Reports, X-Report y notificaciones a consultas autorizadas.
- [ ] Conservar las tarjetas, gráficas, badges, columnas, filtros y controles de alcance de `12fb804`, incluidos procedencia, membresías, MSI y conciliación bancaria.
- [ ] Validar que totales y exportaciones usen todo el conjunto filtrado autorizado, no sólo la página visible.
- [ ] Conservar el formato de PDF, XLSX y tickets; colocar metadatos técnicos de auditoría en servidor cuando no tengan representación en la referencia. No añadir columnas visibles para acomodar un DTO.
- [ ] Probar 1, 10, 20 y 30 sucursales, históricos de sucursal inactiva, cartera, costos, nombres largos, estados vacíos y volumen, conservando la composición aprobada.

**Cierre:** pantalla y exportaciones coinciden en cifras y alcance, sus formatos corresponden al objetivo y no exponen datos restringidos.

### RV8 — Offline, sincronización y compatibilidad de terminales — BACKLOG POST-MVP

Esta fase se retira del camino crítico del MVP por decisión del usuario del 2026-09-09. Sus tareas se conservan para una iteración posterior y no se consideran implementadas ni validadas:

- [ ] Conectar Data update, indicadores de red y estados existentes al repositorio SQLite/IndexedDB y al outbox durable.
- [ ] Mantener el visual objetivo durante login cacheado, venta, apartados, conteos, vouchers, membresías, reservas pendientes y cierre offline autorizados.
- [ ] Verificar dependencias cliente/ticket/membresía/reserva/asistencia y traducción veraz de estados; una reserva offline no se muestra confirmada antes de conciliar capacidad.
- [ ] Probar pérdida de red, cierre de proceso, reinicio, recuperación, reenvío duplicado, grant vencido, conflicto y orden de operaciones.
- [ ] Si cambian contratos o cachés, definir compatibilidad, transición y recuperación de outboxes pendientes. No invalidar una caché borrando operaciones sin sincronizar.
- [ ] Validar con navegador y Electron instalado, incluidos assets `file://`, impresión y hardware configurado para el piloto.

**Cierre:** ninguna operación durable se pierde o duplica y la interfaz mantiene los estados/presentación de referencia. Un build de Vite no sustituye la prueba del instalable.

### RV9 — Limpieza bloqueante y cierre de migraciones para el MVP

- [ ] Ejecutar la lista de retiro documentada en RV1 y actualizada por las fases posteriores; no conservar indefinidamente rutas alternativas para sostener una interfaz descartada.
- [ ] Eliminar servicios, endpoints, DTOs, validadores, flags, adaptadores, permisos técnicos, dependencias y código visual sobrantes sólo cuando bloqueen el recorrido, la seguridad, la compilación o la migración del MVP. La limpieza no bloqueante queda en backlog.
- [ ] Mantener y actualizar pruebas de negocio válidas; retirar sólo pruebas de contratos eliminados y añadir pruebas de rechazo o compatibilidad donde corresponda.
- [ ] Verificar clientes desplegados, workers y proyecciones compartidas antes de retirar contratos. Las operaciones offline y su compatibilidad se revisarán con RV8 post-MVP.
- [ ] Auditar datos reales y migraciones aplicadas antes de eliminar estructuras persistentes. Retirar mediante migraciones nuevas y preservar históricos; una limpieza destructiva pendiente queda identificada y no se anuncia como ejecutada.
- [ ] Sincronizar ambos schemas Prisma y reconstruir el esquema desde cero en PostgreSQL 16 desechable. Probar también actualización desde la versión anterior con datos representativos y rollback de código compatible.
- [ ] Actualizar documentación, cliente HTTP y registro de decisiones para que no vuelvan a recomendar la presentación descartada.

**Cierre MVP:** toda retirada bloqueante tiene evidencia de ausencia de consumidores o de migración completada; no queda código incompatible que impida el recorrido online, la seguridad o la compilación. La deuda no bloqueante queda enumerada en el backlog y la ausencia de entorno para verificar datos no se sustituye por suposiciones.

### RV10 — Verificación final y entrega del MVP al PO

- [ ] Ejecutar una vez la matriz visual completa de RV0 contra el candidato final en Chromium, con fixtures equivalentes y las mismas condiciones de captura. Electron completo queda en backlog; ejecutar un smoke test dirigido si el entorno está disponible.
- [ ] Exigir cero diferencias visuales no justificadas. Las tolerancias se limitan a variaciones de rasterizado medidas; no pueden encubrir geometría, textos, estilos ni controles distintos. Toda región dinámica enmascarada debe estar identificada y tener verificación propia.
- [ ] Comprobar interacciones principales, foco, teclado, scroll, responsive y formatos de impresión/exportación tocados por el MVP.
- [ ] Ejecutar pruebas dirigidas de contratos, permisos, conciliación financiera e integración HTTP según las superficies modificadas. La certificación offline y las incidencias exhaustivas de Agenda quedan en backlog.
- [ ] Verificar las aplicaciones consumidoras afectadas por cambios compartidos. Si se tocó `packages/ui`, ejecutar contratos y regresión visual compartida.
- [ ] Ejecutar un recorrido de demostración reproducible para el PO con datos de prueba y registrar el SHA. El piloto real de una sucursal, el multi-sucursal, hardware y rollback de producción quedan en backlog.
- [ ] Entregar manifiesto final de referencia/candidato, comparativas, cobertura de acciones, backend conservado/adaptado/nuevo/eliminado, migraciones y pendientes externos.
- [ ] Obtener aceptación de fidelidad contra el visual ya aprobado; no solicitar aprobación de un diseño nuevo como sustitución. La promoción a producción sigue el flujo de release autorizado.

**Cierre MVP:** los recorridos online incluidos funcionan con persistencia real, el visual corresponde a `12fb804`, los importes críticos concilian y los pendientes post-MVP están declarados. La entrega se denomina «MVP online para revisión del PO», no «listo para producción».

## 6. Dependencias y controles durante la ejecución

Secuencia MVP prevista: `RV0 → RV1 → RV2 → RV3 → RV4 → RV5 → RV6 → RV7 → RV9 → RV10`. RV8 se ejecutará después como iniciativa de endurecimiento offline.

La retirada de una implementación puede adelantarse a su fase funcional cuando el reemplazo y todos sus consumidores estén verificados; RV9 confirma la limpieza bloqueante del MVP. Las pruebas visuales de RV5–RV7 se limitan a superficies modificadas y la matriz completa se ejecuta una vez en RV10. No actualizar baselines desde el candidato para hacer pasar una regresión. Cualquier nueva referencia necesita un cambio explícito de la decisión del usuario.

Los cambios deben quedar en unidades revisables por módulo. No mezclar actualizaciones de dependencias, refactors globales o cambios de otras apps sin relación con la restauración. No borrar trabajo local previo. No reutilizar mocks como datos operativos ni devolver éxitos ficticios para conservar una captura.

## 7. Comandos y evidencia de validación

Comandos existentes al redactar el plan; ejecutar según los archivos cambiados, no como evidencia de que ya se corrieron:

```bash
pnpm --filter @cosmetics/types type-check
pnpm --filter @cosmetics/api-client type-check
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos exec vite build
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
pnpm --filter @cosmetics/api lint
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api test:unit
pnpm --filter @cosmetics/api build
pnpm test:ui
pnpm test:ui:visual
```

- Las pruebas visuales/E2E específicas de POS se definirán en RV0; `test:ui:visual` cubre el testbed compartido y no acredita por sí solo fidelidad del POS.
- `apps/pos` tiene actualmente un script `lint` que sólo imprime que no está configurado; no reportarlo como análisis estático efectivo.
- Ejecutar la suite HTTP con `RUN_DATABASE_TESTS=true` y `test:integration` exclusivamente contra PostgreSQL desechable preparado para los fixtures. Validar migraciones desde cero y desde un snapshot sintético anterior.
- El empaquetado usa `pnpm --filter @cosmetics/pos build`; exige además probar el instalable. Registrar limitaciones reales del entorno por separado de fallos de código.
- Reutilizar `pos:diagnose`, `pos:reconcile`, `POS pilot gate` y los runbooks de piloto, Agenda y offline, adaptándolos a contratos retirados o nuevos sin eliminar controles de conciliación.
- Capturas y fixtures no deben contener datos personales reales ni credenciales. Los usuarios y PIN de prueba no se convierten en accesos productivos.

## 8. Criterios de aceptación del MVP online

- [ ] Única referencia visual: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`; ningún retorno parcial a `8fd71f3` ni mezcla de diseños.
- [ ] Cobertura del árbol visual objetivo en los recorridos online incluidos, incluidos sus módulos nuevos y versiones responsive representativas.
- [ ] Ningún control aprobado del recorrido MVP oculto, sustituido o reubicado por limitaciones del backend.
- [ ] Backend reutilizado donde sea compatible, adaptado/completado donde falte y eliminado donde se haya demostrado incompatible y sustituible o sin uso.
- [ ] Cero credenciales demostrativas operativas, persistencia ficticia o regresiones de datos compartidos. El MVP no promete continuidad offline ni certifica outbox.
- [ ] Totales, inventario, membresías, pagos, exportaciones y proyecciones conciliados.
- [ ] Cero diferencias visuales no justificadas en la matriz final de Chromium; baselines no regenerados para aceptar cambios del candidato.
- [ ] Pruebas reales pendientes, funciones post-MVP y retiros condicionados declarados explícitamente; no presentados como completados ni listos para producción.

## 9. Registro de decisiones

### RV-D1 — El visual más reciente aprobado reemplaza la referencia anterior

- Fecha: 2026-09-08.
- Solicitado por: usuario, quien identifica el visual aprobado por el PO.
- Decisión sustituida: restaurar `8fd71f3` y añadir selectivamente las novedades de `feature/pos`.
- Nueva decisión: preservar íntegramente el visual de `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`, con todas sus pantallas y ampliaciones ya incluidas.
- Impacto: adaptar el backend al visual; reutilizar lo compatible, desarrollar lo necesario y retirar lo incompatible. No inventar otro diseño ni forzar formularios para ajustarlos a contratos existentes.
- Alcance de esta entrega: documento de fases y actualización de referencias de proyecto. No implementa la restauración, no elimina backend, no aplica migraciones ni despliega.

### RV-D2 — RV0 usa evidencia atómica y fail-closed

- Fecha: 2026-09-08.
- Backend de partida efectivo: `e57b9ee9d48519cb762ca2d9294496abe93ce81e` en `feature/pos-frontend-clean`.
- Decisión: extraer `12fb804` con `git archive`, compilarlo offline y validar blobs/hashes antes de capturar. El fixture congela reloj, zona, locale, aleatoriedad y red; las credenciales demostrativas históricas se descubren sólo en memoria y se redactan de la evidencia.
- Cobertura: 25 pantallas, 10 secciones de Settings, 11 reportes, 10 vistas de bodega, estados protegidos/impresos y matriz base `1440×900`, `920×900`, `390×844`, `320×844`, más sondas adyacentes a breakpoints críticos.
- Resultado local: type-check y build Vite correctos. Los intentos iniciales en la sesión restringida bloquearon Chromium/Google Chrome antes de abrir una página y no publicaron evidencia parcial; al reiniciar con Full Access, Chromium `148.0.7778.96` completó y publicó atómicamente las 208 capturas.
- Estado: RV0 completada. RV2 ya dispone del conjunto canónico versionado bajo el SHA aprobado para comparar el candidato.

### RV-D3 — RV1 adapta la operación al visual y condiciona todo retiro

- Fecha: 2026-09-08.
- Evidencia: `docs/POS_UI_BACKEND_COMPATIBILITY.md` cruza las 25 pantallas y sus variantes con componentes, campos, permisos, API, entidades, offline, salidas y consumidores compartidos.
- Decisión: conservar los servicios canónicos compatibles; adaptar contratos detrás de los controles aprobados; implementar los faltantes en su fase; no mantener campos visibles añadidos para alias/PIN ni ocultar acciones por carencia de endpoint.
- Retiros: las 17 propuestas son gates, no borrados autorizados de inmediato. Cada una exige reemplazo operativo, migración de consumidores, preservación de datos y prueba de aceptación antes de eliminar código o contratos.
- Alcance separado: My Account conserva la presentación de suscripción/tarjetas/facturas y Websites conserva su pantalla, pero los cobros SaaS y la integración externa continúan fuera del backend POS hasta una iniciativa explícita.
- Estado: RV1 completada. Los cinco conflictos abiertos están documentados y no bloquean iniciar RV2, aunque sí bloquean cerrar la fase funcional que los contiene.

### RV-D4 — RV2 restaura la presentación sin reintroducir el runtime demo

- Fecha de cierre: 2026-09-09.
- Estado de partida: `2dabbf24b1347ce0bdbd4ddc1b6fa07ed5696471`; la evidencia candidata identifica el worktree previo a su commit final como `2dabbf24b1347ce0bdbd4ddc1b6fa07ed5696471-worktree`.
- Decisión: restaurar únicamente markup, controles y comportamiento visual que divergían; conservar CSS, assets, main/preload, IPC, repositorio offline y clientes API actuales. `DatePicker` recupera locale español y navegación rápida como una variante compatible, y Checkout la activa sólo para cumpleaños para no cambiar otras apps.
- Seguridad: las copias históricas de acceso no regresan al build API. El acceso visual automatizado sólo existe cuando se compila explícitamente `mock + VITE_POS_VISUAL_FIXTURE=1`; el código master usado por la captura es efímero y el capturador lo recibe por ambiente.
- Comparación: 208 capturas generadas, 205 exactas con tolerancia cero y tres variaciones de rasterizado aisladas de 34, 21 y 11 píxeles. Con el umbral medido `0.000027`, la matriz termina 208/208 `PASS`; ninguna región de contenido o geometría fue enmascarada.
- Límite funcional: cancelación delegada de ticket, persistencia de identidad comercial desde el formulario aprobado y el resto de recorridos API de RV3–RV8 no quedan acreditados por esta fase. Permanecen registrados para adaptación funcional sin añadir campos al visual.
- Estado: RV2 completada; RV3 se documenta por separado en RV-D5.

### RV-D5 — RV3 resuelve código único, delegación auditable y revocación inmediata

- Fecha de implementación: 2026-09-09.
- Estado de partida: `d2eceb9e21271d1eaab0280b738b60b6c78caeef`.
- Decisión de acceso: los formularios aprobados que visualmente piden sólo código envían sólo ese código. El servidor resuelve una huella HMAC con dominio separado, verifica bcrypt y emite un token opaco de propósito, entidad, sesión y terminal, corto y de un solo uso. Nunca se expone un catálogo de PIN ni se acepta texto arbitrario como acceso master.
- Decisión B04: el código compartido se modela como `PosDelegatedMasterCode` con asignaciones nominales `PosDelegatedMasterAssignment`; el actor efectivo es el empleado de la sesión a quien está asignado. La revocación conserva perfiles master nativos mediante `PosMasterCredential.managedByDelegation` y corta sesiones/autorizaciones de inmediato.
- Identidad compartida: Employees opera sobre `Empleado.positionId`, `Position` y `PosCredential`. La baja conserva históricos y transfiere cartera activa a la empresa canónica dentro de la misma transacción; no crea vendedores paralelos.
- Jornada: Clock In/Out identifica por código sin descargar credenciales, la salida de sesión no modifica jornada/asistencia y la apertura/conteos/cierre usan confirmaciones existentes. El cierre atribuye actor y auditoría a quien emitió la autorización, no automáticamente al operador de la sesión.
- Validación: schemas sincronizados y válidos; type-check de types, cliente, API y POS; lint API; build API y Vite/Electron; 25 archivos/135 pruebas unitarias; reconstrucción de 44 migraciones y 17/17 pruebas de integración habilitadas en PostgreSQL 16 desechable; comparación visual 208/208 `PASS` (205 exactas y tres variaciones de antialiasing bajo `0.000027`).
- Pendiente externo: B01 sigue abierto. No se cambió unilateralmente el texto “mock/simulación”; por ello RV3 está implementada pero no formalmente cerrada. RV4 es la siguiente fase de código, mientras Producto define el texto de Close Day.

### RV-D6 — El primer entregable será un MVP online para revisión del PO

- Fecha: 2026-09-09.
- Solicitado por: usuario, para reducir el tiempo hasta una versión compartible con el PO.
- Decisión: conservar sin reinterpretación el visual aprobado de `12fb804`, conectar primero sus recorridos online demostrables y ejecutar la matriz visual completa una sola vez al final del MVP.
- Camino crítico: terminar RV4 y continuar con RV5, RV6, RV7, la limpieza bloqueante de RV9 y la entrega acotada de RV10.
- Backlog: RV8 completa, certificación offline, Electron/hardware exhaustivo, escala extrema, pilotos operativos, incidencias externas completas y limpieza no bloqueante.
- Límite de la declaración: el resultado puede denominarse «MVP online para revisión del PO». No se denomina «listo para producción» hasta completar los gates post-MVP aplicables.

### RV-D7 — RV4 persiste el catálogo operativo sin abrir costos ni sucursales

- Fecha de cierre: 2026-09-09.
- Estado de partida: `1212b10eff0db1cef32c765183e2eee9c14ef83f` en `feature/pos-frontend-clean`.
- Decisión: extender los modelos canónicos y conectar control por control la presentación aprobada; los guardados esperan al servidor y las revisiones de pedidos son append-only bajo el mismo folio.
- Seguridad: costos se omiten para sesiones sin `REPORTS_COSTS`; asignaciones de sucursal se validan contra el alcance; borrados, aprobaciones, canje y publicación usan autorizaciones de propósito, sesión y terminal, consumibles una sola vez.
- Validación: ambos schemas sincronizados; 45 migraciones desde cero; 18/18 pruebas HTTP habilitadas; 135 unitarias; type-check, lint y build web/Electron; visual Chromium 208/208 `PASS` sin modificar el baseline.
- Evidencia: `docs/POS_RV4_CATALOG_CUSTOMERS_INVENTORY_SETTINGS.md`.
