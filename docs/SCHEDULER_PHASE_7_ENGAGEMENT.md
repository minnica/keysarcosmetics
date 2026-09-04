# Scheduler — Fase 7: comunicaciones y datos sensibles

## Estado

Implementada en repositorio el 4 de septiembre de 2026. La migración
`20260904110000_add_scheduler_engagement` es exclusivamente aditiva: crea
tipos, tablas, restricciones, índices, llaves foráneas y protecciones
append-only. No importa mocks, no crea mensajes, documentos, expedientes,
encuestas ni respuestas, y no fue aplicada a development o production.

La conexión de los paneles visuales permanece en Fase 9. No activar envíos ni
cargas hasta reconstruir las migraciones sobre PostgreSQL 16 desechable,
provisionar permisos y completar las pruebas del proveedor en sandbox.

## Autoridades y límites

- Scheduler conserva plantillas, preferencias, intenciones de envío y estados
  de entrega. El proveedor externo sólo transporta el mensaje.
- `Customer` continúa como identidad canónica; correo y teléfono no se
  duplican. La preferencia guarda únicamente estado, fechas y hash del destino.
- Los archivos viven en un bucket privado. PostgreSQL conserva metadatos y la
  ruta interna, que nunca forma parte de un DTO público.
- El expediente médico se cifra completo con AES-256-GCM. Las llaves y
  credenciales viven sólo en infraestructura.
- Las respuestas de encuesta son historia operativa append-only. Los reportes
  agregados se implementan en Fase 8.

## Migración

La migración agrega cuatro familias:

1. `SchedulerMessageTemplate*`, `SchedulerCustomerContactChannel`,
   `SchedulerMessageOutbox` y `SchedulerMessageDeliveryEvent`.
2. `SchedulerConsentTemplate*`, `SchedulerConsentRecord` y
   `SchedulerCustomerDocument`.
3. `SchedulerMedicalRecord`.
4. `SchedulerSurvey*`, tokens, respuestas y respuestas por pregunta.

Versiones de plantillas/encuestas, eventos de entrega y respuestas quedan
protegidos contra `UPDATE`/`DELETE` mediante triggers. La identidad, contenido,
destino cifrado y fecha planeada de una fila del outbox también son inmutables;
reprogramar una cita cancela la intención anterior y crea una nueva.

## Comunicaciones

Rutas autenticadas bajo `/api/scheduler`:

| Método y ruta | Uso |
| --- | --- |
| `GET /communications/templates` | Lista la versión vigente dentro del alcance. |
| `POST /communications/templates` | Crea plantilla y versión 1. |
| `PUT /communications/templates/:id` | Agrega versión con control optimista. |
| `GET/PUT /communications/customers/:id/contact-channels` | Consulta o actualiza opt-in/opt-out. |
| `POST /communications/outbox` | Registra un envío; exige `Idempotency-Key`. |
| `GET /communications/outbox` | Muestra estado redactado por sucursal. |
| `POST /communications/outbox/:id/retry` | Reabre únicamente un fallo terminal. |

`pnpm --filter @cosmetics/api scheduler:messages:worker` reclama lotes con
`FOR UPDATE SKIP LOCKED`, recupera locks abandonados, renderiza el snapshot y
aplica backoff exponencial acotado. Ocho intentos producen `FAILED`. El destino
se descifra sólo durante el envío y nunca aparece en listados o logs.

`POST /api/scheduler/communications/webhooks` es público pero exige HMAC
SHA-256 sobre `timestamp.rawBody`, tolera como máximo cinco minutos y deduplica
por `providerEventId`. Los estados no retroceden y un mensaje leído/entregado
no cambia a fallo por un evento tardío.

Mover, editar o cambiar el estado de una cita cancela sus recordatorios
`PENDING/RETRY` dentro de la misma transacción. Una cita todavía vigente genera
nuevas filas ligadas a su nueva versión; `CANCELED`, `ATTENDED` y `NO_SHOW` no
regeneran recordatorios.

## Documentos y consentimientos

- `GET/POST /documents/consent-templates/:id?` lista, crea o versiona archivos
  PDF/DOC/DOCX/JPG/PNG de hasta 5 MB.
- `GET/POST /documents/consent-records` consulta por cliente/sucursal o asigna
  una versión exacta a cliente, cita y sucursal.
- `POST /documents/consent-records/:id/status` permite
  `PENDING → SIGNED|DECLINED` y `SIGNED → REVOKED`; la evidencia de firma se
  guarda como SHA-256 y el documento firmado queda privado.
- `GET/POST /documents/customers/:customerId` lista metadatos con autorización
  secundaria o adjunta soportes del expediente.
- `POST /documents/:kind/:id/signed-url` devuelve una URL de 300 segundos sólo
  después de consumir una autorización secundaria ligada al documento.

Cada lectura privada escribe `AuditLog.application = SCHEDULER`. El bucket no
debe habilitar lectura pública.

## Expediente médico

`GET/PUT /medical-records/:customerId` aplica alcance de comercio, sucursal y
profesional propio. Leer exige `MEDICAL_RECORD_VIEW`; editar exige
`MEDICAL_RECORD_EDIT`. Ambos tokens están ligados al cliente y se consumen una
sola vez. El documento JSON tiene un límite de 64 KiB, usa control optimista y
se almacena únicamente como ciphertext, IV, auth tag y versión de llave.

Rotar la llave requiere conservar la versión anterior hasta ejecutar una
reemisión controlada; esta fase no hace rotaciones silenciosas ni backfill.

## Encuestas

- `GET/POST/PUT /surveys` administra snapshots versionados, preguntas de
  apreciación/comentario y asociaciones a servicios.
- `POST /surveys/:id/tokens` emite 32 bytes aleatorios; sólo persiste SHA-256 y
  la caducidad máxima es 90 días.
- `GET/POST /surveys/respond/:token` es público por posesión del token. El
  submit bloquea el token, valida preguntas/tipos y crea respuesta + answers +
  `usedAt` en una transacción serializable.

Un token acepta una sola respuesta. La API no publica endpoints para editar o
borrar respuestas y PostgreSQL las protege como append-only.

## Variables de infraestructura

| Variable | Uso |
| --- | --- |
| `SCHEDULER_DATA_ENCRYPTION_KEY` | Llave AES-256 codificada en base64. |
| `SCHEDULER_DATA_ENCRYPTION_KEY_VERSION` | Identificador de versión de llave. |
| `SCHEDULER_PRIVATE_STORAGE_BUCKET` | Bucket privado; default `scheduler-private`. |
| `SCHEDULER_MESSAGING_PROVIDER` | `disabled` por defecto o `http`. |
| `SCHEDULER_MESSAGING_PROVIDER_URL` | Endpoint servidor-a-servidor. |
| `SCHEDULER_MESSAGING_PROVIDER_TOKEN` | Credencial exclusiva del backend. |
| `SCHEDULER_MESSAGING_WEBHOOK_SECRET` | Secreto HMAC exclusivo del backend. |
| `SCHEDULER_MESSAGING_SANDBOX_VERIFIED` | Debe ser `true` para usar `http` en production. |

Storage reutiliza `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Ninguna de
estas variables puede usar prefijos `NEXT_PUBLIC_` o `VITE_`.

## Despliegue y gates

1. Aprobar el diagnóstico de Fase 0 y confirmar PITR.
2. Reconstruir todas las migraciones en PostgreSQL 16 desechable.
3. Probar `401/403`, alcance cruzado, `409`, replays de idempotencia, locks del
   worker, webhook duplicado/fuera de orden y doble submit de encuesta.
4. Crear el bucket privado y validar que una URL expira y no puede reutilizarse
   como URL pública.
5. Configurar una llave de 32 bytes y ensayar cifrado/descifrado y rotación en
   development.
6. Ejecutar el adaptador `http` sólo contra sandbox; probar timeout, `429`,
   `5xx`, reintentos y callbacks antes de marcar el gate de sandbox.
7. Aplicar la migración con el workflow protegido, provisionar grants sin
   seeds y mantener `SCHEDULER_MESSAGING_PROVIDER=disabled` hasta la aprobación
   operativa.

Podman no puede crear su runtime en este workspace (`/run/user/1000/libpod` es
de sólo lectura), por lo que la reconstrucción y la integración HTTP/BD siguen
pendientes y son obligatorias antes de desplegar.

## Verificación local

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

El cierre local pasó schemas sincronizados/válidos, contratos compartidos,
lint/type-check/build del API, 127 pruebas unitarias en 24 archivos y
lint/type-check/build de Scheduler. El frontend conserva únicamente sus
advertencias preexistentes de imágenes y dependencias de hooks.
