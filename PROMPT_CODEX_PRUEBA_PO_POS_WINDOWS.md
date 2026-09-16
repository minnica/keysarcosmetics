# Prompt para que el PO pruebe el MVP POS con Codex en Windows

Copiar y pegar íntegramente el siguiente prompt en Codex después de descargar el repositorio, abrir su carpeta y posicionarse en la rama `feature/pos-frontend-clean`.

```text
Quiero revisar el MVP online del POS de Keysar Cosmetics desde este repositorio en Windows. Actúa como asistente técnico de la sesión de evaluación, prepara el entorno local y después acompáñame durante la prueba.

Reglas importantes:

1. Lee completamente CLAUDE.md y GUIA_PRUEBA_PO_POS_WINDOWS.md antes de ejecutar acciones.
2. Confirma que el repositorio está en la rama feature/pos-frontend-clean.
3. Confirma que el commit db58fda0aca502f6a543bde03e9fd477b3723caa forma parte del historial de HEAD. HEAD puede ser posterior si sólo incorpora documentación para la prueba.
4. No cambies de rama, no hagas pull, merge, rebase, reset, commit ni push.
5. No modifiques código fuente, documentación, package.json, pnpm-lock.yaml, migraciones ni el baseline visual.
6. Conserva cualquier cambio local que ya exista. Antes de comenzar, muestra git status --short y no sobrescribas archivos existentes sin explicarlo.
7. Esta primera sesión es una revisión visual local con fixtures. No la presentes como validación de persistencia, backend, offline, hardware o producción.
8. No actualices capturas ni baselines para ocultar diferencias.

Preparación del entorno:

1. Comprueba las versiones de Git, Node y pnpm.
2. El proyecto requiere Node.js 22.23.2 y pnpm 10.0.0. Si no están disponibles, ayúdame a instalarlos o activarlos con una herramienta apropiada para Windows. No cambies las versiones declaradas por el repositorio.
3. Desde la raíz ejecuta:

   corepack enable
   corepack prepare pnpm@10.0.0 --activate
   pnpm install --frozen-lockfile

4. Crea únicamente el archivo local ignorado apps/pos/.env.local con este contenido:

   VITE_POS_DATA_MODE=mock
   VITE_POS_VISUAL_FIXTURE=1
   VITE_POS_VISUAL_FIXTURE_MASTER_CODE=2468
   VITE_POS_VISUAL_FIXTURE_CUSTOMER_ACCESS_COPY=Usa el alias y codigo personal autorizado.
   VITE_POS_VISUAL_FIXTURE_CASH_ACCESS_COPY=Usa una credencial personal autorizada.

5. Antes de continuar, confirma que apps/pos/.env.local está ignorado por Git y que no apareció ningún cambio inesperado en git status --short.
6. Inicia el POS desde la raíz con:

   pnpm --filter @cosmetics/pos dev

7. Espera a que se abra Electron. Si no se abre, diagnostica el error y trata sólo problemas del entorno o dependencias. No alteres la aplicación para forzarla a iniciar. Si una corrección exige cambiar código, detente y explícame el bloqueo.

Acceso para esta revisión local:

- Empresa: Keysar Cosmetics
- Alias: master
- Código: 2468
- Sucursal: cualquiera disponible

Cuando la aplicación esté abierta:

1. Indícame exactamente qué capturar o verificar en cada paso.
2. Guíame de uno en uno por este recorrido:
   a. Login, apertura de jornada y navegación.
   b. Venta: buscar productos o servicios, agregar líneas, cambiar cantidad o precio, descuento/autorización, pago mixto y ticket.
   c. Receipts: buscar, imprimir, revisar y cancelar.
   d. Alta y edición de clientas.
   e. Catálogo, inventario y Bodega.
   f. Membresías y Citas.
   g. Dashboard, caja, X-Report y reportes.
   h. Settings y diseño de ticket.
   i. Redimensionar la ventana para revisar escritorio, tablet y móvil.
3. No avances al siguiente punto hasta que yo confirme el resultado del actual.
4. Si observo un problema, ayúdame a registrarlo con este formato, sin corregirlo:

   Pantalla:
   Acción realizada:
   Resultado esperado:
   Resultado observado:
   ¿Bloquea la demostración?:
   Captura:

5. Clasifica cada observación como una de estas categorías:
   - diferencia visual respecto a la maqueta aprobada;
   - problema de interacción o navegación;
   - comportamiento propio de los fixtures;
   - posible defecto funcional que debe reproducirse después en modo API;
   - petición nueva fuera del alcance aprobado.

Al terminar:

1. Detén el servidor de desarrollo con Ctrl+C.
2. No elimines archivos ni limpies el repositorio sin preguntarme.
3. Muestra git status --short y confirma si el único archivo local creado fue apps/pos/.env.local, que debe permanecer ignorado.
4. Entrégame un resumen con:
   - recorridos aprobados;
   - observaciones encontradas y su categoría;
   - bloqueantes para aceptar el visual;
   - asuntos que necesitan repetirse en el entorno funcional online;
   - solicitudes nuevas que no pertenecen al MVP acordado.

Empieza leyendo los dos archivos indicados y mostrando la rama, el commit actual, la comprobación de que db58fda está en el historial y el estado del repositorio. Luego continúa de forma autónoma con la preparación, salvo que necesites instalar software o encuentres cambios locales que puedan ponerse en riesgo.
```

## Alcance del prompt

Este prompt inicia la revisión visual con datos demostrativos y protege el repositorio contra cambios accidentales. La prueba funcional online requiere un API de development, PostgreSQL migrado, datos sintéticos, sucursal, credencial y terminal previamente provisionados.
