# Preparación del POS Windows en modo API

Esta guía cubre el checkpoint técnico RV10-P4: iniciar y reiniciar Electron en
Windows contra el API, dataset y terminal preparados por RV10-P1–P3. No es el
instalador ni la certificación de impresión, periféricos o hardware de RV8-P6,
y tampoco sustituye la aceptación del PO de RV10-P5–P8.

## Precondiciones

- Usar un checkout limpio de `feature/pos-frontend-clean` en el SHA candidato
  publicado para la sesión. El SHA debe ser el mismo que expone
  `GET /health` en `release`.
- Usar Node.js `22.23.2` y pnpm `10.0.0`; instalar dependencias con
  `pnpm install --frozen-lockfile`.
- Obtener por el canal privado autorizado la URL del API, el código/secreto de
  una terminal activa y las credenciales personales master/operador. No copiar
  esos valores a Git, `.env.local`, tickets, capturas ni historial de comandos.
- Confirmar que el API/BD y la terminal pertenecen al entorno de demostración
  aislado. No usar una BD compartida o productiva.

El login online inicial necesita Electron: `window.electronAPI.posLogin` envía
el código y secreto de terminal desde main. Abrir solamente la URL de Vite en
un navegador limpio no reemplaza esta prueba.

## Configuración efímera en PowerShell

Ejecutar desde la raíz. Sustituir únicamente los valores públicos entre
corchetes; capturar los valores privados con `Read-Host` para que no queden en
el historial de PowerShell.

```powershell
$env:VITE_POS_DATA_MODE = 'api'
$env:VITE_API_URL = 'https://[api-demo-autorizada]'
$env:POS_API_URL = $env:VITE_API_URL
$env:POS_WINDOWS_EXPECTED_SHA = (git rev-parse HEAD).Trim()
$env:POS_WINDOWS_RENDERER_ORIGIN = 'http://localhost:3005'

$env:POS_TERMINAL_CODE = Read-Host 'Código de terminal entregado privadamente'
$terminalSecret = Read-Host 'Secreto de terminal entregado privadamente' -AsSecureString
$env:POS_TERMINAL_SECRET = [System.Net.NetworkCredential]::new('', $terminalSecret).Password
Remove-Variable terminalSecret
```

No definir `VITE_POS_VISUAL_FIXTURE`; el verificador rechaza la fixture visual
en este recorrido. Las variables `POS_TERMINAL_*` sólo se heredan al proceso
main de Electron; el renderer no debe recibirlas.

Para un API local autorizado, `VITE_API_URL`/`POS_API_URL` pueden usar
`http://127.0.0.1:<puerto>`. Para otra máquina se debe usar la URL y red
confiable definidas al cerrar RV10-P1; no abrir bindings ni desactivar CORS como
atajo.

## Verificación previa

```powershell
git status --short --branch
node scripts/verify-pos-windows-demo.mjs check
node scripts/verify-pos-windows-demo.mjs probe
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos build:web
```

`check` valida versiones, SHA, modo API, igualdad de URLs y presencia de la
terminal sin imprimir sus valores. `probe` añade `/health`, `/ready`, igualdad
de `health.release` y el preflight CORS del login. Si falla, no iniciar la demo
ni cambiar código/baseline para ocultarlo.

## Inicio, login y reinicio

En la misma ventana de PowerShell, para conservar sólo en memoria las variables
privadas:

```powershell
pnpm --filter @cosmetics/pos dev
```

Comprobar en la ventana Electron, no en un navegador:

1. Ventana inicial de `1280 × 800`, fuentes/assets y login sin errores visibles.
2. Login master y operador con las credenciales personales recibidas.
3. Sucursal fija de la terminal y permisos distintos para ambos actores.
4. Rechazo de un `Código master` incorrecto y aceptación del correcto en uno de
   los campos ya aprobados, sin registrar el valor en la evidencia.

Para probar reinicio, cerrar Electron y detener Vite con `Ctrl+C`; comprobar que
el puerto `3005` quedó libre y ejecutar nuevamente el mismo comando en esa
ventana de PowerShell. Repetir login y confirmar que los datos provienen del API
tras recargar. No borrar la caché/outbox para hacer pasar la prueba.

## Parada y limpieza de variables

Al terminar, cerrar Electron, usar `Ctrl+C` y retirar las variables de la sesión:

```powershell
Remove-Item Env:POS_TERMINAL_SECRET -ErrorAction SilentlyContinue
Remove-Item Env:POS_TERMINAL_CODE -ErrorAction SilentlyContinue
Remove-Item Env:POS_API_URL -ErrorAction SilentlyContinue
Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
Remove-Item Env:VITE_POS_DATA_MODE -ErrorAction SilentlyContinue
Remove-Item Env:POS_WINDOWS_EXPECTED_SHA -ErrorAction SilentlyContinue
Remove-Item Env:POS_WINDOWS_RENDERER_ORIGIN -ErrorAction SilentlyContinue

Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
git status --short
```

Detener el API/BD sólo mediante el procedimiento del entorno autorizado y sin
eliminar sus datos. El reporte debe registrar SHA, versiones, URL redactada a
host/puerto, inicio, reinicio, login y parada; nunca secretos, PIN ni logs
crudos.

## Evidencia que falta fuera de Linux

El cierre de RV10-P4 requiere ejecutar estas instrucciones en el equipo Windows
objetivo y demostrar que el PO puede abrir e ingresar. Una prueba local en Linux
acredita la configuración y el flujo Electron, pero no acredita Windows, entrega
privada de credenciales ni acceso del PO.
