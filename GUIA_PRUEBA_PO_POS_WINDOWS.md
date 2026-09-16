# Guía de prueba del MVP POS para el PO en Windows

Lo más práctico es realizar dos pruebas separadas: primero la revisión visual inmediata y después una prueba funcional con un backend preparado. No conviene configurar PostgreSQL, migraciones y terminales en el equipo del PO únicamente para revisar el MVP.

## 1. Revisión visual inmediata en Windows

Se debe utilizar una carpeta nueva para no mezclar estos cambios con la maqueta anterior.

### Requisitos

- Acceso al repositorio de GitHub.
- Git.
- Node.js `22.23.2`.
- Internet para instalar dependencias.
- PowerShell.

### Clonar y verificar la versión

Ejecutar en PowerShell:

```powershell
git clone --branch feature/pos-frontend-clean --single-branch https://github.com/minnica/keysarcosmetics.git keysar-pos-mvp
cd keysar-pos-mvp

git rev-parse HEAD
```

El resultado debe ser:

```text
db58fda0aca502f6a543bde03e9fd477b3723caa
```

### Instalar las dependencias

```powershell
node --version
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm --version
pnpm install --frozen-lockfile
```

### Crear la configuración local

```powershell
@'
VITE_POS_DATA_MODE=mock
VITE_POS_VISUAL_FIXTURE=1
VITE_POS_VISUAL_FIXTURE_MASTER_CODE=2468
VITE_POS_VISUAL_FIXTURE_CUSTOMER_ACCESS_COPY=Usa el alias y codigo personal autorizado.
VITE_POS_VISUAL_FIXTURE_CASH_ACCESS_COPY=Usa una credencial personal autorizada.
'@ | Set-Content -Encoding utf8 apps\pos\.env.local
```

El archivo `.env.local` es local, está ignorado por Git y no debe compartirse ni desplegarse.

### Iniciar el POS

```powershell
pnpm --filter @cosmetics/pos dev
```

La ventana de Electron debería abrirse automáticamente.

### Credenciales para la revisión

- Empresa: `Keysar Cosmetics`
- Alias: `master`
- Código: `2468`
- Sucursal: cualquiera disponible

## 2. Prompt preparado para Codex

El PO puede proporcionar directamente el siguiente prompt a Codex:

```text
Trabaja en una carpeta nueva y no modifiques mi maqueta anterior.

Clona:
https://github.com/minnica/keysarcosmetics.git

Usa la rama:
feature/pos-frontend-clean

Verifica que HEAD sea:
db58fda0aca502f6a543bde03e9fd477b3723caa

No edites código fuente, documentación, baseline visual ni lockfile.

Configura Node 22.23.2 y pnpm 10.0.0, ejecuta:
pnpm install --frozen-lockfile

Crea apps/pos/.env.local con:
VITE_POS_DATA_MODE=mock
VITE_POS_VISUAL_FIXTURE=1
VITE_POS_VISUAL_FIXTURE_MASTER_CODE=2468
VITE_POS_VISUAL_FIXTURE_CUSTOMER_ACCESS_COPY=Usa el alias y codigo personal autorizado.
VITE_POS_VISUAL_FIXTURE_CASH_ACCESS_COPY=Usa una credencial personal autorizada.

Después ejecuta:
pnpm --filter @cosmetics/pos dev

Confirma que Electron abrió el POS. No implementes correcciones; si hay un problema, sólo documenta el error y el comando que falló.
```

## 3. Recorrido sugerido para el PO

Revisar, en este orden:

1. Login, apertura de jornada y navegación.
2. Venta:
   - buscar productos y servicios;
   - agregar líneas;
   - modificar cantidad o precio;
   - probar descuentos y autorización;
   - realizar un pago mixto;
   - generar el ticket.
3. Receipts:
   - búsqueda;
   - impresión;
   - revisión;
   - cancelación.
4. Alta y edición de clientas.
5. Catálogo, inventario y Bodega.
6. Membresías y Citas.
7. Dashboard, caja, X-Report y reportes.
8. Settings y diseño de ticket.
9. Redimensionar la ventana para comprobar tablet y móvil.
10. Confirmar que la interfaz corresponde a la maqueta previamente aprobada.

## 4. Formato para reportar observaciones

```text
Pantalla:
Acción realizada:
Resultado esperado:
Resultado observado:
¿Bloquea la demostración?:
Captura:
```

## 5. Limitación de la revisión visual

El modo anterior sirve para validar el visual, la navegación, los formularios y el recorrido nominal, pero utiliza datos demostrativos. No acredita persistencia, autorizaciones reales ni llamadas al backend.

## 6. Preparación de la prueba funcional online

Para probar el MVP funcional con persistencia real se debe preparar previamente:

1. Una API de development accesible.
2. PostgreSQL con las 45 migraciones.
3. Datos sintéticos de demostración.
4. Una sucursal y su perfil POS.
5. Una credencial master.
6. Una terminal activa y su secreto.
7. El POS de Windows configurado con:
   - `VITE_POS_DATA_MODE=api`;
   - `VITE_API_URL`;
   - `POS_API_URL`;
   - `POS_TERMINAL_CODE`;
   - `POS_TERMINAL_SECRET`.

Después de preparar ese entorno, el PO únicamente debería recibir sus credenciales y abrir la aplicación. No se recomienda que monte manualmente el backend en su computadora.

El instalador formal para Windows y la certificación de hardware continúan dentro del backlog de RV8.
