# Plan por fases: visual aprobado del POS y reutilización del backend

> Fecha: 2026-09-08.
> Refinamiento: 2026-09-16. Inventario ejecutable de pendientes después del recorte a MVP.
> Estado: implementación y evidencia técnica del MVP registradas al 2026-09-09. RV0–RV2 y RV4 cerradas; RV3 pendiente de B01; RV5–RV7 y RV9 cerradas sólo en alcance MVP, con pendientes detallados abajo. RV10 conserva su validación técnica histórica, pero faltan preparación y comprobación del entorno funcional del PO, correcciones y aceptación. RV8 permanece aplazada.
> Referencia visual única: `feature/pos` en `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Objetivo rector: recuperar y conservar íntegramente la presentación e interacción aprobadas por el PO en ese árbol; hacer funcionar sus controles reutilizando al máximo el backend existente y refactorizando sólo lo necesario para adaptarlo. Nunca modificar el visual para acomodarlo al backend.
> Alcance de entrega inmediata: MVP online compartible con el PO. Conserva el visual aprobado y prioriza sus recorridos demostrables; la operación offline, el endurecimiento exhaustivo y los pilotos de producción quedan en backlog explícito.
> Prioridad actual (2026-09-16): avanzar el trabajo técnico independiente sin intervención del PO. Su revisión/aceptación se pospone; la referencia aprobada basta para dirigir la implementación. Ejecución y relevo: sección 6.3 y `EJECUTOR_PLAN_POS.md`.

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

Verificación del 2026-09-16 mediante GitHub MCP (`get_commit` y `list_branches`): `minnica/keysarcosmetics`, rama `feature/pos`, HEAD `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`, mensaje `feat(pos): add new modules`. La rama de integración `feature/pos-frontend-clean` apunta a `4ce2b4981f014661c08fa4bc6b79280393d5d9b1`; contiene el MVP `db58fda0aca502f6a543bde03e9fd477b3723caa` y las guías del PO. Esta comprobación identifica las fuentes; no constituye una nueva ejecución de pruebas ni una aceptación del PO.

## 2. Referencias y hallazgos de partida

| Referencia                                 | Uso                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `12fb8045cc264b565cb6e764d95ad7b2447fbfa1` | Fuente visual y de interacción obligatoria; rama `feature/pos` reconfirmada mediante MCP de GitHub el 2026-09-16.                       |
| `6097a4b9a4d5bce38042fc9a5380a008f4a22478` | Estado de backend/integración analizado en `feature/pos-frontend-clean`; registrar el SHA efectivo nuevamente al comenzar la ejecución. |
| `070e62f252736d50ed8134a4f6908231534f1f63` | Integró las novedades de `feature/pos` hasta `866ff7e`; sirve para rastrear diferencias, no como baseline visual.                       |
| `PLAN_BACKEND_POS.md`                      | Historial de fases 0–14, contratos, entidades y verificaciones pendientes.                                                              |
| `apps/pos/archivo.md` en `12fb804`         | Referencia funcional complementaria; el renderizado del SHA objetivo determina la presentación.                                         |

Hallazgos históricos del análisis previo a RV2 (las diferencias ya corregidas no se reabren por este inventario):

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
- matriz visual completa en Electron, instalable, `file://`, impresoras y hardware; para el MVP se conserva un smoke test dirigido cuando el entorno lo permita;
- carga y composición exhaustiva con 1, 10, 20 y 30 sucursales, históricos extremos, grandes volúmenes y todas las combinaciones de nombres largos/vacíos;
- piloto operativo real de una y múltiples sucursales, pruebas externas completas de Agenda y recuperación/rollback de producción;
- limpieza de código legado que no tenga consumidores activos ni bloquee seguridad, compilación o el recorrido del MVP.

Un pendiente de backlog no puede presentarse como validado. El MVP se declara **online** y la promoción a producción continúa condicionada al endurecimiento correspondiente.

La repetición de toda la matriz visual en cada fase se elimina del procedimiento; no constituye una tarea futura obligatoria. Se mantiene la comprobación dirigida y el criterio de consolidación de la sección 6.2.

### 4.2 Prioridades y límites del refinamiento

1. **Prioridad inmediata — visual aprobado funcionando online, sin esperar al PO:** corregir diferencias de controles/interacción y comprobar la misma interfaz en modo API contra `12fb804`. Preparar localmente un entorno reproducible; posponer el recorrido y aceptación humanos. Una captura en mock no prueba el comportamiento en API.
2. **Completar operaciones aplazadas:** cerrar los pendientes funcionales de RV5–RV7 que correspondan a acciones existentes en la referencia. Cada nueva necesidad sin control aprobado se registra como decisión de Producto y queda fuera de la restauración hasta definir su alcance.
3. **Endurecimiento operativo:** RV8, escala, hardware, migraciones sobre datos existentes, limpieza y piloto. Se conservan como tareas explícitas; este refinamiento no vuelve a exigir validación exhaustiva offline o visual en cada fase del MVP.

Los checks `[x]` registran evidencia del alcance y fecha indicados, no acreditan automáticamente todo el plan original ni un ambiente desplegado. Los checks `[ ]` de las fases y de la sección 6.1 son el inventario ejecutable vigente; reemplazan el anterior conteo agregado de 12 pendientes. Una tarea condicionada se cierra con evidencia o con una decisión documentada de no aplicabilidad, nunca sólo por omitirla.

### 4.3 Reutilización obligatoria antes de implementar o refactorizar

| Superficie aprobada                    | Backend que se debe aprovechar                                                       | Adaptación permitida cuando haga falta                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Acceso, Employees y jornada            | Credenciales POS, permisos, terminales, autorizaciones consumibles y jornadas        | Resolver identidad y permisos desde los campos aprobados; conservar atribución y revocación.                          |
| Venta, Receipts, apartados y entregas  | Cotización/tickets, pagos, ledger, compensaciones, vouchers y proyecciones canónicas | Completar DTOs y revisiones transaccionales; conservar centavos, idempotencia e históricos.                           |
| Catálogo, Customers, Settings y Bodega | Servicios CRUD canónicos, publicación, stock y pedidos versionados                   | Mapear formularios y comandos existentes; preservar folios y confirmar sólo tras persistir.                           |
| Membresías y Citas                     | Tarjetones, consumos, adaptador interno de Scheduler y eventos idempotentes          | Completar estados y operaciones desde las superficies originales; reutilizar disponibilidad y capacidad del servidor. |
| Reportes, caja y exportaciones         | Consultas autorizadas, datasets comunes, auditoría y snapshots                       | Ampliar datos faltantes sin alterar tablas, columnas, filtros ni formatos aprobados.                                  |
| Data update y estados de conexión      | IPC, SQLite/IndexedDB, caché cifrada y outbox existentes                             | Completar conexión, compatibilidad y recuperación durante RV8; conservar estados visuales y operaciones pendientes.   |

Para cada incidencia: identificar escenario/control del SHA objetivo → localizar servicio y consumidores actuales → clasificar según la sección 4 → reutilizar o adaptar → probar resultado y superficie afectada. Un refactor se justifica por una incompatibilidad o defecto concreto, conserva contratos de consumidores o los migra explícitamente y no duplica entidades/reglas ni agrega pantallas. `Venta`, `VentaDetalle` y `PosLegacySaleProjection` siguen sirviendo a Envelope/Payroll y no se retiran por no ser visibles en POS.

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
- [ ] **RV3-B01 · Producto + Desarrollo:** acordar el texto veraz de Close Day y del comprobante de gasto de RV7 (conflicto B01/R17); registrar texto anterior/nuevo, superficies y decisión del PO, aplicarlo sin cambiar geometría y revisar únicamente los estados afectados. Conservar el baseline original y documentar la excepción autorizada de copy; no reemplazarlo globalmente.

**Estado de implementación:** completada. Las 44 migraciones se reconstruyeron desde cero en PostgreSQL 16 desechable y la integración HTTP pasó 17/17 pruebas habilitadas; cubre acceso, permisos, alcance, personal, delegación, apertura, asistencia, doble Clock Out, salida sin cierre, conteo/cierre idempotente, cambio/revocación de terminal y revocación inmediata. La matriz Chromium permanece 208/208 `PASS`, sin ocultar controles. El cierre formal queda pendiente únicamente por B01: la referencia imprime “mock/simulación” en Close Day y se preservó intacta hasta recibir texto autorizado por Producto. Evidencia y decisiones: `docs/POS_RV3_ACCESS_WORKFORCE_DAY.md`.

### RV4 — Catálogo, clientes, inventario, bodega y configuración

- [x] Conectar productos, servicios y membresías, publicación, precios, imágenes, beneficios y catálogo digital con sus cuatro apariencias y bloqueo.
- [x] Conectar búsqueda/edición/registro de clientas, cartera, procedencia, cumpleaños y copia de Teléfono a WhatsApp.
- [x] Conectar proveedores, inventario, movimientos, conteos, pedidos de sucursales, matriz, resurtidos, dobles aprobaciones, recepción, cancelación y reversas.
- [x] Conectar Settings, métodos de pago, bancos/redes/plazos, cortesías, vouchers, paquetes/promociones, competencias y configuración operativa de empresa/ticket.
- [x] Mantener orden, nombres, tablas, campos y acciones de cada formulario objetivo; adaptar operaciones masivas y guardados al flujo existente.
- [x] Reutilizar la lógica transaccional válida y retirar variantes sustituidas después de probar sus nuevos consumidores.
- [ ] **RV4-B02 · Producto:** registrar la disposición de My Account SaaS (suscripción, tarjetas y facturas): exclusión operativa aceptada o iniciativa separada con alcance y responsable. Preservar la presentación aprobada y evitar confirmaciones ficticias de cobro. Cierre: decisión trazable comunicada al PO.
- [ ] **RV4-B03 · Producto:** registrar la disposición de Websites: exclusión operativa aceptada o alcance separado con destinos, permisos y seguridad definidos. Cierre: decisión trazable, presentación conservada y estado veraz; no incorporar una integración externa por inferencia.

**Cierre:** completada. Altas, ediciones, publicación, movimientos y configuraciones usan API/Prisma y sobreviven recarga; las autorizaciones sensibles son de servidor y de un solo uso, costos y sucursales permanecen protegidos. PostgreSQL 16 reconstruyó las 45 migraciones y la integración terminó 18/18 habilitada. La matriz Chromium quedó 208/208 `PASS` (206 exactas y dos variaciones de antialiasing de 34 y 20 píxeles bajo `0.000027`) sin cambiar el baseline. Evidencia: `docs/POS_RV4_CATALOG_CUSTOMERS_INVENTORY_SETTINGS.md`.

### RV5 — Venta, checkout, pagos, tickets y proyección financiera

- [x] Conectar el flujo exacto de Ventas y Checkout de `12fb804`: carrito, precios, SPARE, descuentos, paquetes, clientes, vendedores, presencia Clock In y empresa participante.
- [x] Adaptar cotización y confirmación a los pasos/campos aprobados, con importes exactos. La respuesta autoritativa no añade paneles ni pasos ajenos al diseño.
- [x] Conectar pagos mixtos, crédito/débito, banco/red, autorización y MSI; apartados, abonos, liquidaciones, adeudos y entregas.
- [x] Conectar cancelación, devolución, vouchers, impresión/reimpresión y expediente, conservando los diálogos y formatos del SHA objetivo. La revisión queda registrada como evento inmutable.
- [ ] **RV5-P1 · Desarrollo, post-MVP:** materializar las revisiones del diálogo aprobado sobre tickets, pagos, inventario, membresías, Agenda y reportes mediante los motores y compensaciones existentes. Conservar el original y registrar actor, versión y diferencias; usar transacción o recuperación durable cuando intervengan efectos externos. Cierre: corrección visible tras recarga, importes/existencias/saldos conciliados y reintento/doble envío sin duplicados. Hasta entonces la revisión sólo se anuncia como registrada.
  - **Checkpoint parcial 1, 2026-09-16:** el endpoint de revisión dejó de aceptar snapshots arbitrarios para tickets minoristas sin adeudos, membresías, citas ni participación de empresa. Bajo bloqueo de fila y la idempotencia durable existente, recalcula catálogo/importes, consume la autorización, conserva líneas y cobros originales append-only, agrega compensación `REFUND`, cobro `REVISION`, proyecciones legacy negativas/positivas y un ajuste de inventario por delta; el evento inmutable guarda actor, versión, antes/después, diferencias e IDs de efectos. La lectura de ticket/lista aplica la última proyección y el renderer vuelve a consultarla al guardar, sin cambiar el diálogo de `12fb804`.
  - PostgreSQL 16 desechable reconstruyó 45 migraciones y la integración POS pasó 10/10. El caso nuevo rechazó primero un adeudo con `409` sin consumir el token, reusó ese token en el ticket apto, reenvió la misma llave sin duplicar y recuperó tras recarga total `120.00`, tres unidades a `40.00`, sólo el cobro efectivo `REVISION`, una sola revisión, secuencia financiera `SALE/REFUND/REVISION`, proyección legacy neta `120.00` y existencia final `7.00`. Tipos, schemas, lint, 136 unitarias, builds, manifiesto visual y `git diff --check` pasan.
  - El check permanece abierto: tickets con adeudos/entregas, membresías, citas/Agenda, paquetes/cortesías o participación de empresa se rechazan con `409` antes de consumir la autorización. Falta materializar esos motores y certificar sus saldos/reportes antes de marcar RV5-P1. Informe: `docs/pos-automation/runs/2026-09-16T18-03-18-954Z-RV5-P1.md`.
  - **Checkpoint parcial 2, 2026-09-16:** las revisiones de un adeudo no ambiguo reutilizan `PosOwedProduct` y su historial append-only: nunca reducen por debajo de `deliveredQuantity`, actualizan cantidad/estado, conservan IDs de entregas y calculan el ledger sólo sobre unidades físicamente comprometidas. Ampliar de tres unidades ya entregadas a cuatro creó una pendiente sin descontarla dos veces; el mismo motor de entregas surtió después la cuarta y la recarga recuperó historia `1/2/1`, estado `DELIVERED` y saldo cero. El rechazo previo reutilizó el mismo token, el replay no duplicó el evento y `SALE/REFUND/REVISION` dejó proyección legacy neta `400.00`. PostgreSQL 16 reconstruyó 45 migraciones y pasó 10/10; tipos, schemas, lint, 136 unitarias, builds, formato, manifiesto y diff pasan. El check sigue abierto por membresías, Agenda, paquetes/cortesías, empresa, adeudos duplicados ambiguos y la certificación amplia de segundas revisiones/reportes/exportaciones. Informe: `docs/pos-automation/runs/2026-09-16T18-35-30-033Z-RV5-P1.md`.
  - **Checkpoint parcial 3, 2026-09-16:** los tickets cuya composición de membresías permanece inequívoca ya revisan importe/clienta/vendedor y activación dentro de la transacción existente. `PosMembershipRevisionProjection` conserva el tarjetón original inmutable y agrega por versión una proyección append-only ligada al evento; vendedor y activación reutilizan `PosMembershipSellerChange`/`PosMembershipStatusChange`. Una sesión consumida y su asistencia no se reescriben: volver el ticket a apartado o cambiar altas/bajas/sustituciones de tarjetón responde `409` antes del token; ambos rechazos permitieron reutilizarlo. Dos revisiones dejaron importes efectivos `450.00/425.00`, una sola reasignación, cobros `SALE/REFUND/REVISION/REFUND/REVISION`, recarga, X-Report y exportación en `425.00`, sin duplicados por replay. PostgreSQL 16 reconstruyó 46 migraciones y pasó 10/10; schemas, tipos, lint, 136 unitarias, builds, formato, manifiesto y diff pasan. El check sigue abierto por altas/bajas de membresía sin unidad identificable, Agenda, paquetes/cortesías, empresa, adeudos ambiguos y certificación transversal restante. Informe: `docs/pos-automation/runs/2026-09-16T18-49-58-408Z-RV5-P1.md`.
  - **Checkpoint parcial 4, 2026-09-16:** una revisión ya puede conservar una cita del proveedor Scheduler interno cuando `PosAppointment`, `AgendaReservation` y `SchedulerAppointment` coinciden en clienta canónica, sucursal, servicio, horario, reservación, slot, membresía y estado. La transacción bloquea las filas de cita y autoridad Scheduler antes del token, no reprograma ni crea capacidad, y registra en `PosTicketEvent.snapshot` servicio, intervalo ocupado, unidades de capacidad, profesionales, recursos y beneficio preservados. Una cita no enlazada o inconsistente conserva `409` antes de consumir autorización; reprogramación y proveedor HTTP siguen fuera del subconjunto. PostgreSQL 16 reconstruyó 46 migraciones y pasó 10/10 casos POS más 3/3 POS/Scheduler; schemas, tipos, lint, 136 unitarias, builds, formato, manifiesto y diff pasan. El check permanece abierto por reprogramación/Agenda externa, altas/bajas de membresía, paquetes/cortesías, empresa, adeudos ambiguos y certificación transversal restante. Informe: `docs/pos-automation/runs/2026-09-16T21-13-03-305Z-RV5-P1.md`.
- [x] **RV5-P2 · Desarrollo, post-MVP:** completar el detalle histórico de entregas parciales/finales en Receipts y expediente (R09), no sólo la cantidad inicial reconstruida desde adeudos. Cierre: fechas, cantidades y actores provienen del backend y coinciden con el historial persistido dentro de los controles aprobados.
  - Checkpoint 2026-09-16: `PosTicketDto.owedProducts[].deliveries` proyecta las líneas canónicas `PosOwedProductDeliveryLine` con cantidad, fecha, credencial/actor y movimiento. Lista, detalle y bootstrap offline reutilizan la misma inclusión; el renderer conserva el diálogo de ticket, expediente y tabla de seguimiento aprobados y deja de reconstruir el historial como vacío al recargar. PostgreSQL 16 desechable reconstruyó 45 migraciones y la integración POS pasó 10/10, incluidas entrega parcial/final, replay idempotente y paridad API/BD. Tipos, lint, 135 unitarias, builds y manifiesto visual también pasan. Informe: `docs/pos-automation/runs/2026-09-16T17-12-01-729Z-RV5-P2.md`.
- [x] Probar idempotencia, pago mixto, autorización de Receipts, centavos, identidad completa de clienta y consumo único del token en integración HTTP/BD.

**Cierre MVP online:** completado. Venta, pago mixto, apartados/adeudos, cancelación compensada, vouchers y formatos usan backend real. La corrección compleja permanece explícitamente en backlog y no bloquea la demostración principal. Evidencia consolidada: `docs/POS_MVP_ONLINE_DELIVERY.md`.

### RV6 — Membresías, Agenda y seguimiento

- [x] Conectar acceso personal, filtros, indicadores, ranking, tarjetones, perfiles y alertas de Membresías con datos autorizados.
- [x] Conectar las superficies de membresías ya presentes en Customers, Receipts, Mis ventas y Dashboard sin moverlas ni agregar otras.
- [x] Reutilizar tarjetones por unidad, activación por liquidación, estados pendientes y consumo único, con traducción veraz de estados.
- [x] Conectar Citas, disponibilidad, cabinas, cortesías y próxima sesión desde los controles de la referencia.
- [x] Mantener credenciales y llamadas de Agenda en servidor y conservar control de capacidad/transacciones en el recorrido online.
- [ ] **RV6-P1 · Producto + Desarrollo, post-MVP:** inventariar cambios de vendedor/estado y cierres administrativos contra los controles de `12fb804`; conectar los que ya existen a los servicios de membresías, con historial y permisos. Los que requieren otra pantalla quedan como iniciativa de Producto. Cierre: cada operación tiene recorrido aprobado y comprobado o exclusión explícita, sin cerrar globalmente como implementado lo excluido.
  - **Checkpoint parcial 2026-09-16:** el control aprobado `Perfilamiento comercial` continúa conectado a `POST /memberships/:id/profile`; la integración HTTP/BD añadió replay con la misma llave y recuperó el perfil persistido. La tarjeta existente `CIERRE MENSUAL · TOP 3 VENDEDORES`, cuyo copy promete actualización automática, ahora solicita el snapshot canónico del último mes cerrado para el alcance master seleccionado sin agregar DOM: `createMembershipClosure` conserva el advisory lock, reutiliza exactamente el último snapshot cuando conteo/importe/ranking no cambiaron y crea la siguiente versión sólo cuando cambió su contenido. PostgreSQL 16 reconstruyó 46 migraciones; la integración específica comprobó snapshot único, nueva versión ante otra membresía y `403` no-master, y el recorrido POS pasó 10/10.
  - El check permanece abierto: `12fb804` sólo muestra el vendedor actual y el historial de vendedor/estado; no contiene selector, motivo, confirmación ni acción para llamar manualmente a `/seller` o `/status`. Activación por liquidación, agotamiento por última asistencia y cancelación por el flujo de ticket conservan sus recorridos canónicos existentes, pero la reasignación y el cambio manual de estado quedan bloqueados hasta una decisión visual de Producto. Tampoco se inventó un botón de recierre: la tarjeta automática sólo versiona cuando cambian los datos. Informe: `docs/pos-automation/runs/2026-09-16T19-15-50-093Z-RV6-P1.md`.
  - **Checkpoint bloqueado 2026-09-16:** la reapertura desde `cab1138` volvió a auditar el árbol `12fb804` y el renderer vigente. No apareció una decisión de Producto ni un control aprobado nuevo: `onUpdateProfile` sigue siendo la única mutación administrativa del detalle, mientras `VENDEDOR ACTUAL`, `sellerChanges` y `statusChanges` continúan como lectura/trazabilidad. Conforme al contrato del bloque, no se conectaron `/seller` ni `/status`, no se modificó código y el check permanece `[ ]`. RV6-P2 puede continuar independientemente. Informe: `docs/pos-automation/runs/2026-09-16T19-33-53-941Z-RV6-P1.md`.
- [x] **RV6-P2 · Desarrollo, post-MVP:** completar las pruebas de incidencias del proveedor interno: disponibilidad/último lugar concurrente, clienta nueva/existente, cortesía simple/doble, próxima sesión, cancelación, `ATTENDED`, `NO_SHOW`, reintentos y consumo único. Cierre: capacidad, citas y saldo de membresía concilian usando Scheduler como autoridad, y los estados se representan en la interfaz aprobada.
  - **Cierre 2026-09-16:** una integración HTTP/BD dedicada cubre disponibilidad interna y carrera serializable por el último profesional, clienta nueva/existente, cortesía simple/doble sin reserva parcial, próxima sesión con replay, cancelación, `ATTENDED` y `NO_SHOW`. La próxima sesión ahora conserva el servicio real codificado por el slot en vez del artículo de membresía; la confirmación rechaza slots de otro servicio y `NO_SHOW` libera el beneficio reservado sin incrementar `usedSessions`. Scheduler permanece como autoridad, `AgendaReservation`/`PosAppointment` concilian sus proyecciones y la asistencia consume exactamente una vez. Las fechas vencidas del test Scheduler se sustituyeron por viernes futuros derivados.
  - PostgreSQL 16 local desechable reconstruyó 46/46 migraciones. La matriz dirigida pasó 5/5 y la suite integral 21/21, con el gate de carga omitido por su guarda explícita. También pasan schemas, validación Prisma, lint, 136/136 unitarias, tipos/build de API y POS, manifiesto de 208 capturas, formato y diff. La fuente `12fb804` representa `SCHEDULED`, `ATTENDED`, `NO_SHOW` y `CANCELED` con los controles existentes; no cambió renderer, CSS, baseline ni contratos compartidos. Informe: `docs/pos-automation/runs/2026-09-16T19-37-14-982Z-RV6-P2.md`.
- [ ] **RV6-P3 · Desarrollo + Operación, condicionado:** certificar sandbox, webhooks, reintentos y recuperación de Agenda externa sólo si `AGENDA_PROVIDER=http` se utiliza o se mantiene como rollback operativo. Si no se utiliza, documentar no aplicabilidad y dependencias antes del retiro en RV9. Cierre: pruebas del proveedor habilitado y tratamiento de citas previas, sin crear reservas paralelas.

**Proveedor vigente:** `AGENDA_PROVIDER=internal` reutiliza Prisma/Scheduler; `http` es compatibilidad/rollback. Preparar perfiles, servicios, profesionales, horarios, recursos y actor POS enlazado a `Usuario` según `docs/SCHEDULER_PHASE_5_POS_INTEGRATION.md`. Las credenciales y certificación del proveedor externo no son un requisito de la demo interna.

**Cierre MVP online:** completado para venta → tarjetón → reserva → asistencia → saldo → siguiente sesión. Las integraciones externas no disponibles y la administración avanzada quedan declaradas en backlog.

### RV7 — Reportes, caja, notificaciones y exportaciones

- [x] Conectar Dashboard, Receipts, Mis ventas, Customers, Cash Manager, Reports, X-Report y notificaciones a consultas autorizadas.
- [x] Conservar las tarjetas, gráficas, badges, columnas, filtros y controles de alcance de `12fb804`, incluidos procedencia, membresías, MSI y conciliación bancaria.
- [x] Validar que reportes y exportaciones recorran todo el conjunto filtrado autorizado, no sólo la página visible.
- [x] Conservar formatos PDF, XLSX y tickets sin añadir columnas visibles para acomodar DTOs.
- [x] **RV7-P1 · Desarrollo, inmediato:** cerrar la discrepancia R03 de corrección/anulación de gastos: `App.tsx` todavía invoca `window.prompt` para alias/PIN en esos handlers al 2026-09-16. Reutilizar el diálogo/campo autorizado por `12fb804` y adaptar la autorización de servidor; no añadir un formulario. Cierre: recorrido en modo API sin prompts ajenos y persistencia, permisos e importes comprobados. Vincular el copy de comprobante al check RV3-B01.
  - **Checkpoint parcial 2026-09-16:** se retiraron los dos `window.prompt` y el modo API reutiliza el campo aprobado `Código master`: valida el código contra servidor, mantiene el desbloqueo transitorio de tres minutos sólo en memoria y emite para cada corrección/anulación un token nuevo, consumible y ligado a sesión, terminal, propósito y gasto. La corrección espera la respuesta persistida antes de cerrar el formulario. Pasan type-check/build Vite del POS, Prettier, 135/135 unitarias del API, ausencia dirigida de `window.prompt` y `git diff --check`. El check permanece abierto porque este entorno no ofrece PostgreSQL local desechable (`psql` ausente y Podman bloqueado), por lo que no se ejecutó la integración HTTP/BD que debe comprobar persistencia, permiso `CASH_MANAGE`, importes/compensaciones y rechazo de reutilización. B01 y su copy no cambiaron. Informe: `docs/pos-automation/runs/2026-09-16T08-55-40-652Z-RV7-P1.md`.
  - **Cierre 2026-09-16:** Podman volvió a estar disponible y se levantó PostgreSQL 16 dedicado sobre `127.0.0.1`, con secreto local no documentado. Tres bases nuevas conservaron la ejecución dirigida, la matriz pertinente y el diagnóstico completo; las tres recibieron las 45 migraciones vigentes desde cero. La nueva prueba HTTP/BD de gastos valida 403 sin `CASH_MANAGE`, código incorrecto/correcto, consumo único de `CASH_MANAGER_ACCESS`, alta/corrección/anulación idempotentes, ligadura de tokens, rechazo de reutilización, importes `125.40`/`140.55`, cuatro movimientos compensatorios con neto `0.00` y recuperación por `GET /expenses`. Pasaron 10/10 casos POS y 16/16 pruebas pertinentes (app, POS y memberships), además de tipos/build POS, schemas, tipos/lint/135 unitarias del API, manifiesto y comparación dirigida del copy visible con `12fb804`. La suite completa sobre la tercera BD nueva confirmó 17 casos aprobados y sólo dos fallos Scheduler por citas fijas del 2026-09-11 ya vencidas, ajenas a RV7-P1. B01 permaneció intacto. Informe: `docs/pos-automation/runs/2026-09-16T09-28-04-169Z-RV7-P1.md`.
- [x] **RV7-P2 · Desarrollo, post-MVP:** certificar reportes/exportaciones con 1/10/20/30 sucursales, volumen extremo e históricos de sucursales inactivas (R08). Acordar datos/umbrales antes de medir y registrar latencia/filas. Cierre: pantalla y archivo recorren el mismo conjunto autorizado, concilian, mantienen protección de costos y conservan composición con nombres largos/vacíos; optimizar consultas antes de plantear alteraciones visuales.
  - **Cierre técnico 2026-09-16:** el gate opt-in `pos-report-load.integration.test.ts` fijó antes de la corrida válida umbrales locales de `2,000 ms` por página, `120,000 ms` para recorrer todas las páginas y `30,000 ms` por exportación. Sobre PostgreSQL 16 desechable creó 30 sucursales (tres históricas inactivas), 400 tickets por sucursal, 12,000 tickets/24,000 líneas máximas, 366 días y nombres nulos, vacíos y de longitud límite. El reporte paginado, la hidratación real de tickets que alimenta la pantalla y el archivo de `SALES_DETAIL` conciliaron en 1/10/20/30 sucursales; a 30 fueron 12,000 filas, `7,097.17 ms` del reporte, `6,640.67 ms` de hidratación y `2,401.79 ms` de exportación, con p95 por página de `67.25/60.24 ms`. Los 13 datasets autoritativos conciliaron total y primera página contra el archivo completo; costos quedaron ocultos sin `REPORTS_COSTS`, visibles para master, históricos inactivos conservaron 400 filas cada uno y toda exportación dejó auditoría. No hizo falta optimizar ni alterar renderer/CSS; tipos/build POS y el manifiesto de 208 capturas confirmaron intacta la referencia `12fb804`. Estos umbrales son de ingeniería local, no aceptación operativa ni de producción. Informe: `docs/pos-automation/runs/2026-09-16T20-00-55-973Z-RV7-P2.md`.

**Cierre MVP online:** completado para el conjunto de demostración autorizado; formatos y alcance conservan el objetivo. RV7-P2 cierra la certificación técnica local de escala, sin sustituir piloto, hardware ni SLA/aceptación operativa.

### RV8 — Offline, sincronización y compatibilidad de terminales — BACKLOG POST-MVP

Esta fase se retira del camino crítico del MVP por decisión del usuario del 2026-09-09. Existe infraestructura previa reutilizable; su presencia no acredita el cierre de estas actividades de integración/certificación. Responsable técnico: Desarrollo; hardware y piloto: Operación.

- [ ] **RV8-P1:** conectar Data update, indicadores de red y estados existentes al repositorio SQLite/IndexedDB y al outbox durable.
- [ ] **RV8-P2:** mantener el visual objetivo durante login cacheado, venta, apartados, conteos, vouchers, membresías, reservas pendientes y cierre offline autorizados.
- [ ] **RV8-P3:** verificar dependencias cliente/ticket/membresía/reserva/asistencia y traducción veraz de estados; una reserva offline no se muestra confirmada antes de conciliar capacidad.
- [ ] **RV8-P4:** probar pérdida de red, cierre de proceso, reinicio, recuperación, reenvío duplicado, grant vencido, conflicto y orden de operaciones.
- [ ] **RV8-P5:** si cambian contratos o cachés, definir compatibilidad, transición y recuperación de outboxes pendientes. No invalidar una caché borrando operaciones sin sincronizar.
- [ ] **RV8-P6:** validar con navegador y Electron instalado, incluidos assets `file://`, impresión y hardware configurado para el piloto.

RV8-P6 incluye construir el instalable Windows desde un SHA identificado, instalarlo/iniciarlo/reiniciarlo en el equipo objetivo, verificar assets/fuentes, DPI/resolución, tickets/vouchers, impresión/reimpresión y periféricos configurados. La revisión visual de Electron en modo desarrollo de RV10 no sustituye este cierre. El alcance del navegador se verifica según el acceso soportado: no asumir login online inicial web equivalente al IPC de Electron.

**Cierre:** ninguna operación durable se pierde o duplica y la interfaz mantiene los estados/presentación de referencia. Un build de Vite no sustituye la prueba del instalable.

### RV9 — Limpieza bloqueante y cierre de migraciones para el MVP

- [x] Ejecutar la parte bloqueante de la lista de retiro: se eliminó el diálogo agregado de autorización bajo mínimo y los alias/códigos ficticios que impedían los recorridos API aprobados.
- [x] Confirmar que no quedan residuos incompatibles que bloqueen seguridad, compilación, migración o el recorrido online del MVP; la limpieza no bloqueante queda en backlog.
- [x] Mantener pruebas de negocio y añadir rechazo de reutilización/autorización compatible para RV5.
- [ ] **RV9-P1 · Desarrollo + Operación, post-MVP:** verificar clientes desplegados, workers y proyecciones compartidas antes de retirar contratos. Las operaciones offline y su compatibilidad se revisarán con RV8. Cierre: inventario de consumidores/versiones y reemplazo o compatibilidad demostrados.
- [ ] **RV9-P2 · Desarrollo + Operación, post-MVP:** auditar datos reales y migraciones aplicadas antes de eliminar estructuras persistentes. Retirar mediante migraciones nuevas y preservar históricos. Cierre: diagnóstico y tratamiento de datos documentados; cualquier destrucción sigue requiriendo decisión explícita y no se anuncia como ejecutada por cerrar la auditoría.
- [x] **RV9-P3 · Desarrollo + Operación, post-MVP:** probar la actualización desde un snapshot anterior representativo en una BD aislada, además de la reconstrucción desde cero ya registrada. Cierre: migraciones aplicadas, integridad/consumidores comprobados y procedimiento de recuperación ensayado, con trazabilidad de versión y respaldo.
  - **Cierre 2026-09-16:** el gate opt-in `scripts/verify-pos-migration-recovery.sh` reconstruyó un snapshot sintético de 45 migraciones, hasta `20260909010000_pos_rv4_catalog_inventory_settings`, con ticket, pago, membresía, auditoría y una operación offline `PENDING`. Generó un respaldo lógico custom de `825751` bytes (`SHA-256 5c03cacb3187c5bf7fdeb0de3b3b799e00c1f6802da835af9eb3c664dbc75b93`), lo restauró en dos bases PostgreSQL 16 limpias y aplicó en ambas la migración 46 `20260916010000_add_pos_membership_revision_projections`. Los consumidores `ticketDto` y `membershipDto`, importes `450.00`, pago, tres sesiones restantes, auditoría, outbox, tabla nueva y trigger append-only conciliaron después de cada restauración. Una cuarta base nueva reconstruyó 46/46 y pasó 10/10 pruebas HTTP/BD POS. El script rechaza hosts no-loopback, bases sin `pos_upgrade`, schemas distintos de `public`, destinos no vacíos y ausencia de confirmación `EPHEMERAL_ONLY`; no elimina bases ni ejecuta el seed general. No se copiaron ni escribieron datos compartidos. Informe: `docs/pos-automation/runs/2026-09-16T20-27-47-323Z-RV9-P3.md`.
- [ ] **RV9-P4 · Desarrollo, post-MVP:** revisar cada retiro R01–R17 contra código, consumidores y evidencia actuales; separar resueltos, parciales, condicionados y piezas que deben conservarse. Ejecutar sólo limpieza sin consumidores o con reemplazo probado; actualizar contratos/tipos/docs y comprobar las apps afectadas. Conservar auditoría, proyecciones compartidas, datos y outboxes; no retirar provider/tablas Agenda durante su ventana de rollback.
- [x] Sincronizar ambos schemas Prisma y reconstruir las 45 migraciones desde cero en PostgreSQL 16 desechable. La actualización desde snapshots productivos y rollback operacional quedan en backlog post-MVP.
- [x] Actualizar documentación, cliente HTTP y registro de decisiones para mantener la presentación aprobada.

**Cierre técnico MVP registrado:** se retiraron las incompatibilidades bloqueantes cubiertas por la entrega del 2026-09-09. Esto no certifica toda la matriz R01–R17: el pendiente R03 identificado al refinar se atiende en RV7-P1. RV9-P1 (consumidores) y RV9-P2 (datos) requieren evidencia del ambiente correspondiente.

### RV10 — Verificación final y entrega del MVP al PO

- [x] Ejecutar una vez la matriz visual completa de RV0 contra el candidato final en Chromium, con fixtures y runtime equivalentes.
- [x] Confirmar 208/208 capturas en `PASS`; sólo 34, 11 y 21 píxeles de antialiasing bajo la tolerancia medida `0.000027`, sin geometría/texto/control distinto.
- [x] Comprobar navegación, scroll, responsive, diálogos y formatos de impresión/exportación cubiertos por los 208 escenarios.
- [x] Ejecutar pruebas dirigidas de contratos, permisos, pago mixto, identidad de clienta, autorización consumible e integración HTTP/BD.
- [x] Verificar tipos/build de consumidores compartidos afectados; `packages/ui` no fue modificado.
- [x] Ejecutar un recorrido de demostración reproducible con fixtures sintéticos y preparar la rama para el PO. Piloto, multi-sucursal, hardware y rollback quedan en backlog.
- [x] Entregar manifiesto final de referencia/candidato, comparativa, cobertura, migraciones y pendientes en `docs/POS_MVP_ONLINE_DELIVERY.md`.
- [ ] **RV10-P1 · Desarrollo, inmediato:** fijar el SHA candidato y preparar un API de demostración accesible desde Windows y una BD PostgreSQL aislada, o un entorno development con aislamiento de datos de prueba acordado. Aplicar por el flujo autorizado las migraciones del candidato y verificar `/health.release`, `/ready` y CORS. Las 45 migraciones son la evidencia histórica del MVP; comprobar la cadena vigente al ejecutar. Cierre: URL/configuración accesibles, identidad de versión y conexión verificadas.
- [ ] **RV10-P2 · Desarrollo, depende de P1:** cargar/provisionar explícitamente un conjunto sintético reproducible: sucursal/perfiles, puestos/empleados, usuarios, credenciales master y operador con permisos distintos, catálogo publicado, precios, existencias, clientas, métodos/bancos/redes/MSI, membresías/cortesías y configuración Scheduler para citas. Reutilizar modelos/servicios; no ejecutar el seed demo general contra una BD compartida. Cierre: todos los pasos de P5 tienen datos y actores válidos, identificados como prueba.
- [ ] **RV10-P3 · Desarrollo, depende de P2:** registrar y activar una terminal para el PO; guardar código/secreto fuera del renderer y del repositorio, entregar credenciales por canal privado y comprobar login, sucursal y permisos. Cierre: acceso online master/operador desde Electron y autorización real mediante los campos aprobados, con rechazo de código incorrecto.
- [ ] **RV10-P4 · Desarrollo, depende de P1–P3:** preparar el POS Windows del mismo candidato en `VITE_POS_DATA_MODE=api`, con `VITE_API_URL`/`POS_API_URL` y terminal en main. Revisar inicio y reinicio en Electron y documentar comandos, versiones y parada. El acceso inicial online actual depende de `window.electronAPI.posLogin`; una URL en un navegador limpio no lo reemplaza. Cierre: el PO puede abrir e ingresar a la demo funcional. El instalador y certificación de hardware completos siguen en RV8-P6.
- [ ] **RV10-P5 · Desarrollo + PO, depende de P4:** realizar el recorrido online de aceptación: login/apertura/Clock In; catálogo y clienta; venta/pago mixto/ticket; apartado/abono/liquidación/entrega; consulta/cancelación; inventario/Bodega/Settings; membresía/reserva/asistencia; caja/reportes/exportaciones; salida sin cierre y Close Day al final. Incluir estados vacíos, errores y permisos representativos. Cierre: recarga/reingreso recuperan datos, importes y efectos concilian, y campos/diálogos/navegación coinciden con la referencia. Exponer la limitación de revisiones RV5-P1 y las exclusiones B02/B03 en el acta; los fixtures no cuentan como prueba API.
- [ ] **RV10-P6 · Desarrollo + PO, durante P5:** registrar cada observación con escenario de referencia, pasos, esperado/observado, captura sin secretos, modo de datos, SHA y severidad. Clasificar diferencia visual, interacción, limitación de fixture, defecto API o solicitud nueva. Corregir bloqueantes dentro de RV3–RV7, empezando por RV7-P1; comprobar estados tocados y regresión funcional pertinente. Cierre: cero defectos bloqueantes conocidos para el alcance que el PO acepta, sin rediseño ni éxitos ficticios.
- [ ] **RV10-P7 · Desarrollo, antes de entregar:** actualizar `GUIA_PRUEBA_PO_POS_WINDOWS.md` y `PROMPT_CODEX_PRUEBA_PO_POS_WINDOWS.md` para distinguir revisión visual y funcional, indicar el candidato vigente y su relación con `db58fda`, inicio/parada y acceso sin secretos. Publicar evidencia mínima durable con SHA, ambiente/runtime, comparación y resultados; no depender de `/tmp` del equipo original. Cierre: el PO puede reproducir ambas revisiones desde otro equipo y conoce límites del alcance.
- [ ] **RV10-P8 · PO, depende de P5–P7 y resolución de B01:** obtener y registrar aceptación de fidelidad contra `12fb804` y del recorrido online acordado, con fecha, candidato, observaciones y exclusiones. No solicitar aprobación de un diseño sustituto. Cierre: acta enlazada desde este plan y handoff actualizado; la promoción a producción mantiene su flujo propio.

**Cierre técnico histórico:** la suite HTTP y las 208 capturas acreditan los casos ejecutados en el ambiente de prueba del 2026-09-09. **Cierre de entrega pendiente:** P1–P8 convierten esa implementación en una revisión online reproducible y aceptada por el PO. La entrega se denomina «MVP online para revisión del PO», no «listo para producción».

## 6. Dependencias y controles durante la ejecución

Secuencia histórica del MVP: `RV0 → RV1 → RV2 → RV3 → RV4 → RV5 → RV6 → RV7 → RV9 → RV10 técnica`. No repetir fases cerradas sin una regresión identificada.

Orden vigente para retomar (sustituye la prioridad anterior de pedir primero la revisión del PO):

1. RV7-P1: corregir los prompts de gastos usando el flujo aprobado, sin cambiar el copy B01.
2. RV5-P2/P1 y RV6-P1/P2: entregas, revisiones de tickets, administración representada en la referencia e incidencias del Scheduler interno. Completar lo independiente y registrar bloqueos concretos sin inventar nuevos controles.
3. RV7-P2, RV9-P3/P4: avanzar mediciones sintéticas acotadas, migraciones desde un snapshot sintético y limpieza local demostrable; nunca intervenir datos compartidos ni retirar consumidores cuyo uso no se haya verificado.
4. RV10-P1–P4/P7: preparar y probar localmente entorno API/BD, datos sintéticos, terminal y documentación Windows. Si falta Windows, infraestructura o intervención humana para cumplir el criterio completo, publicar preparación parcial y dejar el check abierto.
5. Diferir RV3-B01, RV4-B02/B03, RV10-P5/P6/P8 hasta retomar al PO; RV6-P3, RV9-P1/P2 y OP01–OP06 hasta disponer de alcance/infraestructura operativos autorizados. RV8 completa continúa en backlog por la exclusión previa del MVP. No pedir nuevas aprobaciones visuales para implementar lo ya definido en `12fb804`.

La retirada de una implementación puede adelantarse cuando reemplazo, consumidores y datos estén verificados. Toda corrección preserva `12fb804`; una excepción autorizada, como el texto B01, se registra por superficie sin cambiar la referencia global.

Los cambios deben quedar en unidades revisables por módulo. No mezclar actualizaciones de dependencias, refactors globales o cambios de otras apps sin relación con la restauración. No borrar trabajo local previo. No reutilizar mocks como datos operativos ni devolver éxitos ficticios para conservar una captura.

### 6.1 Pendientes operativos posteriores a la revisión del PO

Estos checks pertenecen al cierre operativo de RV9/RV10 y al backlog de la sección 4.1; no agregan un rediseño ni convierten el piloto en condición para abrir la demo visual. Responsables: Desarrollo prepara/verifica; Operación y Producto aceptan el alcance; Finanzas y Agenda validan sus efectos.

- [ ] **OP01 · Alcance del piloto:** fijar sucursal, terminal, fecha, operadores, recorridos, métricas y condiciones de suspensión. Determinar si requiere offline; si lo requiere, completar RV8 antes. Un piloto explícitamente online documenta la contingencia ante pérdida de red y no cuenta como certificación offline. Identificar qué pendientes RV5/RV6 son bloqueantes para ese uso y cuáles quedan excluidos.
- [ ] **OP02 · Preparación de development:** ejecutar diagnóstico de datos reales en sólo lectura (`pos:diagnose` y diagnóstico Scheduler cuando aplique), revisar migraciones/consumidores con RV9-P1–P3 y desplegar el candidato por el flujo autorizado. Cierre: SHA del API/POS identificado, salud/readiness, perfiles/actores y datos preparados sin mezclar fixtures con operación real.
- [ ] **OP03 · Respaldo y recuperación:** verificar backup/PITR recuperable antes de intervenir datos operativos y ensayar recuperación en entorno aislado; definir versión compatible de API/POS, responsable, condiciones y pasos de rollback. Preservar citas, históricos y outboxes; usar correcciones de esquema aditivas. Volver a mock no recupera la operación real ni sustituye el rollback. Cierre: ensayo registrado y procedimiento ejecutable.
- [ ] **OP04 · Piloto de una sucursal:** mantener el proceso vigente en paralelo y conciliar tickets, cobros por método, apartados/abonos, cancelaciones/devoluciones, inventario, caja/cierre, reportes, membresías/citas y efectos en Envelope/Payroll. Reutilizar `pos:reconcile` y el runbook. Cierre: reporte con alcance real y aprobación humana; un ensayo online parcial no se reporta como `PASS` del gate completo que exige offline.
- [ ] **OP05 · Expansión y escala:** después del primer piloto conciliado, ampliar gradualmente a varias sucursales y completar RV7-P2 antes de declarar soporte para 10/20/30. Comprobar permisos entre sucursales, históricos y conciliación por fecha/sucursal; completar RV8-P6 para las terminales y hardware que se usarán. Cierre: resultados medidos y aceptación operativa del alcance ampliado.
- [ ] **OP06 · Release y observación:** completar los gates aplicables de `docs/POS_PILOT_RUNBOOK.md` y `docs/RELEASE_RUNBOOK.md`, registrar aceptación de Producto/Operación/Finanzas/Agenda y seguir el flujo autorizado `develop → master`. Verificar respaldo, SHAs y migraciones; distribuir primero a una terminal y revisar smoke, `/health`, `/ready`, errores y latencia durante al menos 15 minutos. Conciliar el primer cierre antes de ampliar. Cierre: manifiesto de release, monitoreo, rollback disponible y aprobación de expansión. No debilitar gates existentes para declarar producción lista; un cambio de alcance se documenta por separado.

### 6.2 Evidencia visual suficiente y dirigida

- Reutilizar las 208 capturas y manifiestos existentes: 25 pantallas, diez secciones de Settings, once reportes y diez vistas de Bodega. No reconstruir RV0 ni repetir toda la matriz en cada fase.
- Por corrección visible, comparar escenario/control y variantes responsive afectadas con datos/permisos equivalentes. Por cambio exclusivamente backend, comprobar el recorrido API y que su adaptador mantenga los estados/formularios aprobados.
- En Windows/Electron comprobar de forma dirigida navegación, fuentes, DPI, scroll, formularios, diálogos e impresión de los recorridos de la demo. La comparación por píxel usa el mismo motor/runtime del baseline; diferencias entre sistemas se investigan antes de atribuirlas al diseño.
- La matriz completa del MVP ya pasó el 2026-09-09. Repetir una única comparación completa al consolidar un nuevo candidato que cambie presentación o componentes compartidos, o ante una regresión amplia sin resolver; no repetirla por cambios documentales ni ajustar tolerancias para ocultar diferencias.
- Conservar manifiesto y resumen de resultados en el repositorio o artefacto durable accesible. Si una evidencia temporal ya no existe, registrarlo y recuperar sólo lo necesario para la entrega, sin afirmar una nueva validación.

### 6.3 Ejecutor secuencial y contexto entre sesiones

- `scripts/run-pos-plan.mjs` abre una sesión nueva de Codex por tarea/checkpoint identificado, no una sesión interminable por todo el plan. Una fase grande puede necesitar varios checkpoints; sólo se cierra el check cuando se satisface su criterio completo.
- `docs/pos-automation/queue.json` contiene los 34 IDs: 13 habilitados para trabajo técnico y 21 diferidos (incluidos los seis de RV8). Los habilitados no prometen cierre automático de requisitos externos; su alcance local está delimitado en la cola.
- Cada sesión lee este plan, `CLAUDE.md`, `docs/POS_MVP_HANDOFF.md`, `docs/pos-automation/state.json` y el informe anterior. Antes de terminar actualiza plan/handoff y escribe un informe durable en `docs/pos-automation/runs/`; actualiza CLAUDE cuando cambia contratos o comandos.
- El ejecutor comprueba documentación, checks, archivos autorizados y pruebas mínimas según cambios; guarda estado y realiza commit/push a `feature/pos-frontend-clean`. Verifica el SHA remoto antes de abrir la siguiente sesión. Las consultas remotas reintentan timeouts transitorios y un `push` que agota la espera local sólo cuenta como exitoso cuando el SHA exacto ya aparece en la rama; una divergencia o fallo real conserva el journal y detiene la ejecución. No hace force-push ni resuelve divergencias automáticamente.
- Una tarea puede crear helpers raíz exclusivamente POS con los prefijos `verify-pos-`, `prepare-pos-`, `provision-pos-`, `audit-pos-`, `check-pos-` o `seed-pos-` y extensión `.sh`, `.mjs` o `.ts`. El propio ejecutor, sus pruebas, los scripts generales, artefactos visuales, dependencias y secretos permanecen fuera de alcance.
- Estados: `completed` cierra sólo el check asignado; `partial` publica trabajo útil probado con pendientes; `blocked` publica sólo documentación del impedimento y permite continuar tareas independientes. Los bloqueos no cuentan como completados. Tres checkpoints por tarea es el límite automático predeterminado; después se requiere revisión/reintento explícito.
- Si falla una prueba pertinente, la sesión, la cuota o la publicación, se detiene sin descartar archivos. Una falla demostrablemente ajena en una suite más amplia puede registrarse como `failed_unrelated` sólo con pruebas dirigidas aprobadas, causa/asignación explícitas y sin omitir un gate del check; así no bloquea un checkpoint válido ni se presenta como suite verde. No promete commit de código incompleto al agotarse los tokens ni mide el porcentaje restante de la cuenta. Instrucciones de arranque, parada y recuperación: `EJECUTOR_PLAN_POS.md`.
- Preparar el ejecutor no ejecuta fases ni constituye evidencia funcional nueva del POS. La aceptación del PO y los gates operativos siguen abiertos; pruebas locales no los sustituyen.

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

- Las pruebas visuales específicas de POS ya se definieron en RV0: `pnpm pos:visual:capture` y `pnpm pos:visual:compare`, con parámetros documentados en `docs/POS_VISUAL_BASELINE.md` y `docs/POS_RV2_PRESENTATION_RESTORATION.md`. `test:ui:visual` cubre el testbed compartido y sólo corresponde cuando se afectan sus componentes; no acredita por sí solo fidelidad del POS.
- `apps/pos` tiene actualmente un script `lint` que sólo imprime que no está configurado; no reportarlo como análisis estático efectivo.
- Ejecutar la suite HTTP con `RUN_DATABASE_TESTS=true` y `test:integration` exclusivamente contra PostgreSQL desechable preparado para los fixtures. Validar migraciones desde cero y desde un snapshot sintético anterior.
- El empaquetado usa `pnpm --filter @cosmetics/pos build`; exige además probar el instalable. Registrar limitaciones reales del entorno por separado de fallos de código.
- Reutilizar `pos:diagnose`, `pos:reconcile`, `POS pilot gate` y los runbooks de piloto, Agenda y offline, adaptándolos a contratos retirados o nuevos sin eliminar controles de conciliación.
- Capturas y fixtures no deben contener datos personales reales ni credenciales. Los usuarios y PIN de prueba no se convierten en accesos productivos.

## 8. Criterios de aceptación del MVP online

Los checks siguientes conservan el cierre técnico del 2026-09-09 para los escenarios probados. No sustituyen RV10-P1–P8 ni certifican recorridos API no ejecutados; RV7-P1 registra una diferencia adicional detectada el 2026-09-16.

- [x] Única referencia visual: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`; ningún retorno parcial a `8fd71f3` ni mezcla de diseños.
- [x] Cobertura del árbol visual objetivo en los recorridos online incluidos, incluidos sus módulos nuevos y versiones responsive representativas.
- [x] Ningún control aprobado del recorrido MVP oculto, sustituido o reubicado por limitaciones del backend.
- [x] Backend reutilizado donde es compatible y adaptado/completado en el camino crítico; retiros no bloqueantes documentados.
- [x] Cero credenciales demostrativas operativas ni persistencia ficticia en modo API. El MVP no promete continuidad offline ni certifica outbox.
- [x] Totales críticos, pagos mixtos, cancelación y exportaciones del recorrido de demostración conciliados; revisión compleja multi-proyección declarada en backlog.
- [x] Cero diferencias visuales no justificadas en la matriz final de Chromium; baseline no regenerado.
- [x] Pruebas reales pendientes, funciones post-MVP y retiros condicionados declarados explícitamente; no se presenta como listo para producción.

Para declarar **restauración visual y funcional aceptada**, deben quedar cerrados RV10-P1–P8 y todos los defectos que bloqueen el recorrido acordado, incluyendo RV7-P1 y la decisión B01. B02/B03 y operaciones post-MVP conservan su estado y exclusión explícita en el acta. Completar el **plan integral** requiere además resolver los pendientes aplicables RV5–RV9 y OP01–OP06; una exclusión de Producto no se presenta como una función implementada. La aceptación siempre se refiere al visual fijo `12fb804` con las excepciones puntuales registradas.

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

### RV-D8 — El MVP online queda listo para revisión del PO

- Fecha técnica: 2026-09-09.
- Alcance completado: RV5 venta/checkout, RV6 recorrido principal Membresías–Agenda, RV7 consultas/exportaciones, RV9 bloqueante y RV10 técnica.
- Decisión visual: las autorizaciones usan los campos de Producto, Receipts, Settings y X-Report ya aprobados; se retiró el diálogo alias+PIN agregado. El baseline `12fb804` no se modificó.
- Validación: PostgreSQL 16 reconstruyó 45 migraciones; integración 18/18 habilitada, unitarias 135/135, tipos/lint/build en `PASS`; matriz final Chromium 208/208 bajo la tolerancia de antialiasing medida `0.000027`.
- Backlog consciente: RV8/offline, revisión compleja multi-proyección, administración avanzada de membresías, Agenda externa exhaustiva, escala, hardware, piloto, rollback y limpieza no bloqueante.
- Estado: técnicamente listo para revisión del PO; no listo para producción. La aceptación del PO y B01 son decisiones externas pendientes.
- Evidencia: `docs/POS_MVP_ONLINE_DELIVERY.md`.

### RV-D9 — Refinamiento centrado en el visual aprobado y cierre trazable de pendientes

- Fecha: 2026-09-16; solicitado por el usuario después del recorte a MVP.
- Referencia reconfirmada mediante GitHub MCP: `feature/pos` en `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`. Se conserva el árbol acumulado completo, no sólo el diff de ese commit.
- Decisión: adaptar/refactorizar el backend existente para servir los controles aprobados; preferir servicios, entidades, autorización, ledger, Scheduler y outbox ya implementados. No iniciar un rediseño ni una reconstrucción general del backend.
- Pendientes explicitados: entorno funcional Windows/API/BD, datos, credenciales/terminal, recorrido y aceptación del PO; B01–B03; revisiones e historial de entregas; membresías e incidencias; escala; RV8 completa; datos/consumidores/migraciones/limpieza; respaldo, rollback, pilotos y release.
- Ajustes basados en inspección: Scheduler interno es el proveedor vigente y la certificación externa es condicionada; `window.prompt` de gastos sigue pendiente en modo API (RV7-P1/R03). Por ello el cierre técnico MVP no se equipara a fidelidad funcional universal ni a disponibilidad de un entorno del PO.
- Validación proporcionada: conservar la evidencia previa, revisar superficies cambiadas y reservar la matriz completa para la consolidación de cambios visuales. No reincorporar pruebas offline exhaustivas al camino inmediato del MVP.
- Alcance de este refinamiento: planificación y sincronización documental. No implementa estos checks, no provisiona accesos, no despliega ni aplica migraciones; cada check se cierra con su evidencia al ejecutarse.

### RV-D10 — Trabajo técnico autónomo y revisión del PO aplazada

- Fecha: 2026-09-16, por solicitud del usuario.
- La dirección visual ya está aprobada en `12fb804`; avanzar implementaciones independientes reutilizando el backend sin pedir al PO repetir esa decisión. Posponer su revisión, feedback, aceptación y decisiones B01–B03, sin declararlas resueltas.
- Preservar la exclusión de RV8/offline del MVP. No reincorporar certificación offline ni comparación visual exhaustiva por cada sesión. Avanzar preparación técnica local posible; no desplegar ni intervenir datos operativos.
- Relevo durable por tarea/checkpoint, actualización documental y commit/push verificado antes de continuar. El estado versionado complementa el plan: no reemplaza sus criterios ni convierte un bloqueo en cierre.
- Entregable de preparación: `EJECUTOR_PLAN_POS.md`, ejecutor, cola, prompt, schema, estado inicial y pruebas aisladas del flujo Git. Ningún check funcional se cierra por crear estas herramientas.
