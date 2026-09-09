# Scheduler RV5 — restauración de Configuraciones

## Estado

RV5 quedó implementada en repositorio el 6 de septiembre de 2026. La
validación visual y los recorridos de persistencia sobre API/PostgreSQL
desechables permanecen pendientes por B06. No se aplicaron migraciones,
seeds, variables, despliegues ni datos operativos.

La ruta `/configuraciones` dejó de presentar el editor JSON genérico. Las once
secciones documentales usan formularios estructurados con el lenguaje visual
de la referencia `e9077dd`; `Código personal` conserva el flujo seguro ligado
a la contraseña actual y nunca lista códigos de otras personas.

## Capas y persistencia

- La lectura mantiene la precedencia `COMMERCE → BRANCH → USER`.
- El endpoint resuelto devuelve ahora el documento autorizado de cada capa,
  además de su alcance y versión. No amplía permisos ni expone secretos: los
  documentos ya pasaron el filtro de claves prohibidas y la misma capacidad
  `READ`.
- El formulario muestra, para la capa seleccionada, sólo las capas inferiores
  o iguales. Una edición de Comercio no toma valores de Sucursal o Usuario.
- Al guardar se comparan los campos visibles contra el valor inicial y se
  aplican únicamente los paths modificados al documento propio de la capa.
  Las claves desconocidas y los objetos no editados se conservan.
- `USER` exige `WRITE`; `BRANCH` y `COMMERCE` exigen `ADMIN`, igual que el
  backend. Una versión obsoleta conserva el borrador y ofrece recarga.
- Cambiar sección, comercio, sucursal o capa con cambios pendientes requiere
  confirmación. `beforeunload` cubre recarga/cierre.
- Los formularios usan React Hook Form y validación Zod; URLs, enteros, correos
  y la referencia CLABE se validan antes de llamar al endpoint.
- El único dato local es `slotMinutes`, preferencia visual del dispositivo. El
  formulario explica que no cambia horarios ni disponibilidad y emite el
  evento que ya consume Agenda.

## Matriz de campos

Todos los campos documentales admiten `COMMERCE`, `BRANCH` y `USER`. El permiso
de lectura es `scheduler/settings/{section}:READ`; escritura de usuario usa
`WRITE` y escritura de comercio/sucursal usa `ADMIN`. Los valores indicados son
defaults de presentación cuando ninguna capa define el path: no se persisten
automáticamente.

| Sección        | Path                                                    | Tipo / default                        | Consumidor real al cierre de RV5                        |
| -------------- | ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------- | ------- |
| Empresa        | `companyName`                                           | texto / `""`                          | Ninguno; identidad canónica vive en Administración      |
| Empresa        | `description`                                           | texto largo / `""`                    | Ninguno                                                 |
| Empresa        | `logoUrl`                                               | URL / `""`                            | Ninguno; no existe carga de archivos en settings        |
| Empresa        | `address`                                               | texto largo / `""`                    | Ninguno; no reemplaza sucursales                        |
| Sitio web      | `bookingSlug`                                           | texto / `""`                          | Ninguno; sitio público no conectado                     |
| Sitio web      | `siteColor`                                             | color / `#263941`                     | Ninguno                                                 |
| Sitio web      | `modifyColor`                                           | color / `#c3a583`                     | Ninguno                                                 |
| Sitio web      | `cancelColor`                                           | color / `#b45353`                     | Ninguno                                                 |
| Sitio web      | `linkProSlug`                                           | texto / `""`                          | Ninguno                                                 |
| Sitio web      | `linkProGreeting`                                       | texto / `""`                          | Ninguno                                                 |
| Sitio web      | `instagram`, `facebook`, `website`, `tiktok`, `youtube` | URL / `""`                            | Ninguno                                                 |
| Sitio web      | `whatsapp`                                              | texto / `""`                          | Ninguno                                                 |
| Agenda         | `allowOverlapping`                                      | booleano / `false`                    | Ninguno; motor canónico siempre revalida disponibilidad |
| Agenda         | `allowClientSimultaneous`                               | booleano / `false`                    | Ninguno                                                 |
| Agenda         | `allowResourceOverload`                                 | booleano / `false`                    | Ninguno; capacidad real prevalece                       |
| Agenda         | `requireContact`                                        | booleano / `true`                     | Ninguno                                                 |
| Agenda         | `requireMedicalRecord`                                  | booleano / `false`                    | Ninguno                                                 |
| Agenda         | `limitClientBookings`                                   | booleano / `false`                    | Ninguno                                                 |
| Agenda         | `limitQuantity`                                         | entero / `2`                          | Ninguno                                                 |
| Agenda         | `limitPeriod`                                           | entero / `3`                          | Ninguno                                                 |
| Agenda         | `limitUnit`                                             | `weeks\|months` / `months`            | Ninguno                                                 |
| Agenda         | `allowBlockedTimeBookings`                              | booleano / `false`                    | Ninguno; excepciones exigen autorización real           |
| Agenda         | `allowExtendedHours`                                    | booleano / `false`                    | Ninguno; horarios canónicos prevalecen                  |
| Agenda         | `additionalFields.email.enabled                         | required`                             | booleanos / `true,false`                                | Ninguno |
| Agenda         | `additionalFields.phone.enabled                         | required`                             | booleanos / `true,true`                                 | Ninguno |
| Agenda         | `additionalFields.birthDate.enabled`                    | booleano / `false`                    | Ninguno                                                 |
| Agenda local   | `slotMinutes`                                           | `15\|30\|45\|60` / `60`               | `ApiAgendaWorkspace`; sólo `localStorage` visual        |
| Pagos          | `bankName`, `bankInstitution`, `bankClabe`              | textos / `""`                         | Ninguno; referencias públicas, no credenciales          |
| Pagos          | `onlinePayments`                                        | booleano / `false`                    | Ninguno; no activa proveedor                            |
| Pagos          | `paymentLink`                                           | URL / `""`                            | Ninguno                                                 |
| Pagos          | `allowOnlineStatusEdit`                                 | booleano / `false`                    | Ninguno                                                 |
| Recordatorios  | `emailBookingChanges`, `emailReminder`                  | booleanos / `false`                   | Ninguno; outbox/plantillas viven en Comunicaciones      |
| Recordatorios  | `whatsappBookingCreated`, `whatsappReminder`            | booleanos / `false`                   | Ninguno; consentimiento/proveedor prevalecen            |
| Fichas médicas | `categories`                                            | arreglo de objetos / `[]`             | Ninguno; expedientes reales siguen cifrados             |
| E-mails        | `senders`                                               | arreglo `{id,email,confirmed}` / `[]` | Ninguno; no contiene secretos SMTP                      |
| E-mails        | `signature`                                             | texto largo / `""`                    | Ninguno                                                 |
| E-mails        | `birthdayEnabled`                                       | booleano / `false`                    | Ninguno                                                 |
| E-mails        | `birthdaySubject`, `birthdayBody`                       | texto / `""`                          | Ninguno                                                 |
| E-mails        | `birthdayLink`                                          | URL / `""`                            | Ninguno                                                 |
| Integraciones  | —                                                       | sin documento editable                | Proveedor y secretos sólo en infraestructura            |
| Notificaciones | `bookingCreated`, `bookingChanged`, `bookingCanceled`   | booleanos / `false`                   | Ninguno; centro de avisos pendiente                     |
| Notificaciones | `deliveryFailed`                                        | booleano / `true`                     | Ninguno; el estado real está en el outbox               |
| Clientes       | `automaticClientNumber`                                 | booleano / `false`                    | Ninguno; identidad canónica no cambia                   |
| Clientes       | `validateDuplicateEmail`, `validateDuplicatePhone`      | booleanos / `true`                    | Ninguno; validaciones actuales del backend prevalecen   |
| Clientes       | `categories`, `filters`                                 | arreglos de objetos / `[]`            | Ninguno; definiciones canónicas viven en Clientes       |
| Encuestas      | `enabled`                                               | booleano / `false`                    | Ninguno; no encola mensajes                             |
| Encuestas      | `sendDelayHours`                                        | entero / `0`                          | Ninguno; tokens/respuestas siguen inmutables            |

La ausencia de consumidor es visible dentro de cada formulario. Persistir una
preferencia no se presenta como si ya modificara Agenda, POS, Comunicaciones,
Clientes o Encuestas. Conectar un consumidor futuro exige definir su contrato,
prioridad frente a catálogos canónicos, pruebas y autorización antes de cambiar
esta matriz.

## Seguridad y diferencias respecto de la referencia

- Se retiraron de Pagos los campos históricos `publicKey` y `accessToken`.
  Cualquier key, token, contraseña, credencial o webhook secret continúa
  rechazado por el backend y debe vivir en el secret manager.
- El logo se representa como URL pública; RV5 no inventa un bucket o una carga
  privada.
- Integraciones reemplaza el placeholder histórico por una explicación
  operativa, sin formularios falsos para secretos.
- Sitio web y Notificaciones completan sus estados pendientes con campos
  versionados, pero la UI los identifica como preferencias sin consumidor.
- Fichas médicas y Clientes editan listas estructuradas y preservan las
  propiedades desconocidas de cada objeto; no vuelven al editor JSON.

## Verificación

Pruebas unitarias nuevas:

```bash
pnpm --filter @cosmetics/scheduler test
```

Cubren las once definiciones, la resolución limitada por capa, cambios en
paths anidados y conservación de claves desconocidas.

Runner visual de sólo lectura:

```bash
E2E_SCHEDULER_SETTINGS_VISUAL=true \
  pnpm --filter @cosmetics/e2e exec playwright test \
  --config=playwright.development.config.ts \
  development/scheduler-settings.visual.spec.ts
```

Prepara adjuntos de Empresa, Agenda, Fichas médicas e Integraciones a
`1366×768`, y Clientes a `390×844`. En este sandbox no se generaron PNG porque
B06 impide iniciar servidor/Chromium. El runner intercepta sólo lecturas y el
guard E2E falla ante cualquier escritura.

Antes de validar RV5 todavía se requiere, en un host compatible:

1. comparar los adjuntos con `e9077dd`;
2. recorrer creación/actualización en las tres capas sobre PostgreSQL
   desechable;
3. verificar recarga, `409`, permisos `WRITE/ADMIN`, cambio de contexto y
   conservación de claves desconocidas;
4. inspeccionar que ninguna respuesta o bundle contenga secretos.
