# Scheduler RV6 — comunicaciones, documentos y encuestas

## Estado

RV6 quedó implementada en repositorio el 6 de septiembre de 2026. La
validación visual, storage privado, integración HTTP/PostgreSQL y proveedor de
mensajería en sandbox permanecen pendientes por B06 y por los gates de
`docs/SCHEDULER_PHASE_7_ENGAGEMENT.md`. No se aplicaron migraciones, seeds,
variables, despliegues ni datos operativos y no se activó ningún envío real.

Las secciones `Encuestas`, `Consentimientos` y `Comunicaciones` de
`/administracion` dejaron el workspace seguro simplificado y recuperaron el
lenguaje visual de `e9077dd` sobre los contratos canónicos. La ficha de Clientes
incorpora el expediente médico cifrado y sus documentos privados cuando la
sesión tiene permiso en `scheduler/settings/records`.

## Encuestas

- El catálogo muestra estado, título, cantidad de preguntas, servicios y
  versión vigente; permite buscar sin alterar la fuente canónica.
- Alta y edición cubren comercio, nombre, título, introducción, estado,
  preguntas `RATING|COMMENT`, obligatoriedad y perfiles de servicio del mismo
  comercio.
- Editar envía `expectedVersion`; un `409` conserva el diálogo y ofrece recarga.
  Guardar crea un snapshot nuevo mediante `updateSurvey`, no modifica la
  versión histórica.
- La vista previa reproduce el editor aprobado sin emitir tokens ni usar
  respuestas reales.
- La UI no ofrece borrado: el contrato sólo permite versionar y cambiar a
  `INACTIVE`. Tokens y respuestas individuales no aparecen en Administración;
  las respuestas continúan append-only y sus métricas pertenecen a RV7.

## Comunicaciones

- Las plantillas multicanal conservan nombre, canal, asunto de correo, estado,
  cuerpo y versión. Los marcadores `{{variable}}` se normalizan en la lista que
  valida el backend; editar usa `expectedVersion`.
- `Preparar envío` obliga a elegir sucursal, identidad canónica y plantilla del
  mismo comercio. Consulta el canal real, registra `OPTED_IN|OPTED_OUT` con
  fuente y versión, y sólo habilita el outbox si existe destino, consentimiento
  vigente, fecha y todas las variables.
- La clave de idempotencia permanece estable al reintentar la misma intención y
  cambia cuando cambia el payload o después de un éxito.
- El outbox distingue `PENDING`, `PROCESSING`, `RETRY`, `SENT`, `DELIVERED`,
  `READ`, `FAILED` y `CANCELED`. `SENT` significa aceptado por el proveedor;
  sólo `DELIVERED` confirma entrega. El reintento manual se ofrece
  exclusivamente para `FAILED`.
- La pantalla declara que el proveedor se controla en infraestructura. No
  muestra secretos, no publica un interruptor y no cambia
  `SCHEDULER_MESSAGING_PROVIDER=disabled`.

## Consentimientos y documentos

- El catálogo conserva nombre, estado, archivo, tamaño y versión. Alta y
  reemplazo cargan los formatos permitidos hasta 5 MB en el storage privado;
  reemplazar crea una versión y conserva la anterior.
- `Asignaciones` busca una clienta canónica dentro de una sucursal autorizada,
  liga una versión exacta y consulta el historial. La UI permite únicamente las
  transiciones del backend: `PENDING → SIGNED|DECLINED` y
  `SIGNED → REVOKED`.
- Firmar exige referencia de evidencia y archivo; el backend conserva sólo el
  hash de evidencia y el documento privado. No existe eliminación visual de
  firmas ni asignaciones.
- Abrir plantilla o firma solicita `PRIVATE_DOCUMENT_DOWNLOAD`. La URL firmada
  se usa de inmediato en una pestaña nueva, no entra a `localStorage`, no queda
  como `href` y no se conserva en estado después de la acción.

## Expediente médico desde Clientes

- La ficha protegida sólo monta la sección si el bootstrap concede
  `scheduler/settings/records:READ|WRITE`.
- Una apertura emite y consume dos autorizaciones independientes
  `MEDICAL_RECORD_VIEW`: una ligada a `SchedulerMedicalRecord` y otra a
  `SchedulerCustomerDocuments`. Los datos visibles se purgan al expirar el TTL.
- La edición solicita otra autorización `MEDICAL_RECORD_EDIT`, conserva tipos
  JSON válidos, usa `expectedVersion` y no expone ciphertext, IV, auth tag o
  versión de llave.
- Los soportes se cargan por sucursal y tipo. Después de una carga se purga la
  lectura anterior y se exige autorizar de nuevo. Cada descarga consume
  `MEDICAL_DOCUMENT_DOWNLOAD`; su URL de 300 segundos tampoco se persiste.

## Diferencias y límites explícitos

- La API no publica el estado configurado del proveedor. La UI puede mostrar el
  estado real de cada fila y el error `PROVIDER_DISABLED`, pero comprobar el
  adaptador `disabled|http` requiere un ambiente controlado.
- La activación/inactivación de una plantilla de consentimiento no tiene
  mutación pública; RV6 muestra el estado devuelto y no simula el cambio.
- La clasificación agregada de encuestas y recordatorios, filtros, series y
  exportación completa sigue en RV7. Las rutas
  `/clientes/reporte-de-encuestas` y `/clientes/recordatorios` permanecen sobre
  datasets canónicos mientras se restaura su presentación.
- Las definiciones documentales de Recordatorios/Fichas médicas/Encuestas de
  RV5 siguen sin consumidor automático. RV6 opera directamente con plantillas,
  outbox, expedientes y encuestas; no interpreta documentos de settings como
  autorización o regla de negocio.

## Verificación

Pruebas locales ejecutadas:

```bash
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler test
pnpm --filter @cosmetics/scheduler build
pnpm --filter @cosmetics/e2e type-check
pnpm --filter @cosmetics/e2e lint
```

Type-check, 8 suites unitarias y build de 21 páginas terminaron correctamente.
El lint de E2E terminó limpio; el de Scheduler sólo reportó las advertencias
históricas de imágenes y hooks en componentes fuera de RV6. La prueba nueva
cubre extracción/deduplicado de variables, vista previa, snapshots de versión,
semántica de estados del outbox y tamaños de archivo. Playwright descubrió los
dos casos RV6 y sus dos dependencias de sesión, cuatro pruebas en total.

Runner visual de sólo lectura:

```bash
E2E_SCHEDULER_ENGAGEMENT_VISUAL=true \
  pnpm --filter @cosmetics/e2e exec playwright test \
  --config=playwright.development.config.ts \
  scheduler-engagement.visual.spec.ts
```

Prepara adjuntos de Encuestas, Consentimientos y Comunicaciones a `1366×768`,
y Comunicaciones a `390×844`, con fixtures deterministas y guard contra
escrituras. En este sandbox no se generaron PNG porque B06 impide iniciar
servidor/Chromium.

Antes de marcar RV6 como `Validada` todavía se requiere:

1. revisar esos adjuntos contra `e9077dd` en los seis viewports RV0;
2. recorrer alta/versión/conflicto de encuesta y plantilla sobre PostgreSQL 16
   desechable;
3. probar opt-in/out, replay idempotente, `PENDING`, `DELIVERED`, `FAILED` y
   retry con el proveedor deshabilitado y luego con un sandbox aprobado;
4. comprobar carga, firma, revocación, alcance cruzado, expiración y no
   reutilización de URLs contra un bucket privado desechable;
5. probar lectura/edición concurrente del expediente y purga por expiración.
