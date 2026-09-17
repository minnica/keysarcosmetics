# Prompt para acompañar la revisión del MVP POS en Windows

Copiar el bloque completo en Codex después de descargar el repositorio y abrir
su carpeta. El prompt distingue la revisión visual disponible de la revisión
funcional, que continúa condicionada al entorno autorizado.

```text
Quiero revisar el MVP POS de Keysar Cosmetics en Windows. Actúa como asistente técnico de la sesión, protege el repositorio y separa estrictamente evidencia visual de evidencia funcional.

Fuentes y estado:

- Lee completos CLAUDE.md, PLAN_RESTAURACION_VISUAL_POS.md, GUIA_PRUEBA_PO_POS_WINDOWS.md, docs/POS_WINDOWS_API_DEMO.md y docs/pos-automation/runs/2026-09-17T20-13-12-758Z-RV10-P7.md antes de actuar.
- La referencia visual inmutable es 12fb8045cc264b565cb6e764d95ad7b2447fbfa1.
- El MVP histórico db58fda0aca502f6a543bde03e9fd477b3723caa debe ser ancestro.
- El candidato ejecutable documentado es 06f9f6f7741b733bda7770e3b67b714daa59a40b. HEAD puede ser un descendiente que sólo agregue documentación/estado de RV10-P7; no aceptes cambios posteriores en apps/pos, backend/api, packages/types, packages/api-client, package.json o pnpm-lock.yaml sin un nuevo SHA documentado por Desarrollo.
- La comparación 208/208 es evidencia histórica de db58fda. No la atribuyas automáticamente al candidato actual. La evidencia cruda candidate/diff estaba en /tmp y no está disponible desde este equipo.

Reglas:

1. No cambies de rama y no hagas pull, merge, rebase, reset, checkout, commit, push ni limpieza.
2. No edites código, documentación, dependencias, lockfile, migraciones, fixtures, manifiestos, baseline, capturador o comparador.
3. Conserva cambios locales. Muestra git status --short --branch antes de crear archivos y no sobrescribas apps/pos/.env.local si ya existe.
4. No instales software sin pedirme confirmación. Sí puedes usar las dependencias declaradas del repositorio.
5. Nunca imprimas, pegues en archivos, captures ni incluyas en el resumen secretos de terminal, códigos personales, tokens o credenciales API.
6. No presentes fixtures como persistencia ni una prueba Linux/histórica como prueba Windows o aceptación del PO.
7. No implementes correcciones. Registra cada incidencia; si exige código, detente en ese punto sin alterar la aplicación.

Comprobación inicial:

1. Confirma feature/pos-frontend-clean, el HEAD y git status --short --branch.
2. Ejecuta y exige código 0:

   git merge-base --is-ancestor db58fda0aca502f6a543bde03e9fd477b3723caa HEAD
   git merge-base --is-ancestor 06f9f6f7741b733bda7770e3b67b714daa59a40b HEAD
   git diff --quiet 06f9f6f7741b733bda7770e3b67b714daa59a40b HEAD -- apps/pos backend/api packages/types packages/api-client package.json pnpm-lock.yaml

3. Comprueba Node 22.23.2 y pnpm 10.0.0. Si faltan, explícame el bloqueo antes de instalar o cambiar nada.
4. Si node_modules no está preparado, ejecuta pnpm install --frozen-lockfile.

Selección segura del modo:

- Por defecto ejecuta únicamente REVISION VISUAL.
- REVISION FUNCIONAL sólo está autorizada si yo confirmo que Desarrollo entregó el SHA exacto, una API/BD sintética aislada accesible desde Windows, una terminal activa y credenciales master/operador mediante un canal privado. Si falta cualquiera, registra "funcional bloqueada" y continúa sólo con visual.

REVISION VISUAL:

1. Explica que este modo prueba presentación/navegación con fixtures y no prueba API, persistencia, autorizaciones reales, offline, hardware ni producción.
2. Si apps/pos/.env.local no existe, crea únicamente ese archivo ignorado con:

   VITE_POS_DATA_MODE=mock
   VITE_POS_VISUAL_FIXTURE=1
   VITE_POS_VISUAL_FIXTURE_MASTER_CODE=2468
   VITE_POS_VISUAL_FIXTURE_CUSTOMER_ACCESS_COPY=Usa el alias y codigo personal autorizado.
   VITE_POS_VISUAL_FIXTURE_CASH_ACCESS_COPY=Usa una credencial personal autorizada.

3. Confirma con git check-ignore apps/pos/.env.local y git status --short que no apareció un cambio versionado inesperado.
4. Ejecuta pnpm --filter @cosmetics/pos type-check y después pnpm --filter @cosmetics/pos dev.
5. Espera a Electron. El acceso del fixture es empresa Keysar Cosmetics, alias master, código visual 2468 y una sucursal disponible. Aclara que 2468 no es una credencial operativa.
6. Guíame de uno en uno, sin afirmar persistencia, por login/apertura/navegación; Ventas/Checkout/ticket; Receipts/Customers; Catálogo/inventario/Bodega; Membresías/Citas; Dashboard/caja/X-Report/reportes; Settings/diseño de ticket; estados vacíos/errores; y tamaños escritorio/tablet/móvil.
7. Compara con la referencia 12fb804 usando las capturas versionadas bajo docs/artifacts/pos-visual-baseline/. No regeneres ni modifiques la referencia.

REVISION FUNCIONAL CONDICIONAL:

1. Antes de recibir secretos, lee y sigue íntegramente docs/POS_WINDOWS_API_DEMO.md.
2. Pídeme que capture los valores privados localmente con Read-Host; no me pidas pegarlos en el chat ni los muestres después.
3. Ejecuta node scripts/verify-pos-windows-demo.mjs check y probe. Detente si no coinciden SHA/health.release, URLs, CORS, modo API o terminal.
4. Ejecuta tipos/build indicados en la guía y abre Electron, no un navegador limpio.
5. Guíame por login master/operador, sucursal/permisos, apertura/Clock In, catálogo/clienta, venta/pago mixto/ticket, apartado/abono/liquidación/entrega, consulta/cancelación, inventario/Bodega/Settings, membresía/reserva/asistencia, caja/reportes/exportaciones, salida sin cierre y Close Day al final.
6. Cierra/reinicia Electron y confirma reingreso/persistencia. No borres caché/outbox para hacer pasar la prueba.
7. No fuerces las operaciones bloqueadas por RV5-P1. Mantén visibles B01, B02/B03 y la exclusión de offline/instalador/hardware de RV8.

Para cada observación registra:

Modo: visual fixture | funcional API
SHA de HEAD:
SHA de /health (sólo API):
Runtime: Windows / Node / pnpm / Electron
Escenario o pantalla 12fb804:
Pasos:
Esperado:
Observado:
Categoría: visual | interacción | fixture | API | solicitud nueva
Severidad:
¿Bloquea?:
Captura sin secretos:

Al terminar:

1. Cierra Electron y usa Ctrl+C. En modo API elimina de la sesión las variables privadas según docs/POS_WINDOWS_API_DEMO.md.
2. Comprueba que el puerto 3005 quedó libre.
3. Muestra git status --short; no borres archivos ni limpies el repositorio.
4. Resume por separado resultados visuales, resultados API realmente ejecutados, bloqueos, observaciones y solicitudes nuevas.
5. No uses "aprobado por el PO" salvo que yo lo declare explícitamente y exista el acta de RV10-P8. No llames al resultado "listo para producción".

Empieza con la lectura y las comprobaciones iniciales. Si no recibiste el entorno funcional autorizado, dilo de forma explícita y prepara sólo la revisión visual.
```

## Alcance

Este prompt no provisiona ni despliega el backend. La revisión funcional sigue
bloqueada hasta completar la evidencia externa de RV10-P1, RV10-P3 y RV10-P4.
La revisión visual tampoco equivale a aceptación: RV10-P5/P6/P8 requieren la
participación posterior del PO.
