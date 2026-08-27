# E2E de ambientes

Este paquete contiene dos suites distintas:

- `pnpm test:smoke`: smoke público, pequeño y válido para development o producción;
- `pnpm test:e2e:development`: recorridos autenticados y exclusivamente de lectura para los alias estables de `develop`.

Los E2E autenticados no deben ejecutarse contra producción.

## Preparación única de development

Crear dos cuentas exclusivas de automatización, con empleados y puestos propios. No reutilizar cuentas personales ni `SUPER_ADMIN`.

### Envelope

El puesto de la cuenta debe tener:

- `canManageAccess = false`;
- `selfDataOnly = true`;
- pantallas `dashboard`, `ventas`, `citas` y `reportes/total-general`;
- ninguna otra pantalla o permiso virtual.

Envelope todavía no distingue lectura/escritura por pantalla. Por eso la suite instala además un guard de red que falla si observa `POST`, `PUT`, `PATCH` o `DELETE`.

### Payroll

El puesto de la cuenta debe tener:

- `canManagePayrollAccess = false`;
- acceso a `payroll/resumen`, `payroll/movimientos`, `payroll/esquemas`, `payroll/recibos` y `payroll/reportes/desglose-sucursal`;
- `canWrite = false` en todas las pantallas;
- ninguna otra pantalla.

Guardar las credenciales en secrets del environment de GitHub `development`:

```text
E2E_ENVELOPE_EMAIL
E2E_ENVELOPE_PASSWORD
E2E_PAYROLL_EMAIL
E2E_PAYROLL_PASSWORD
```

Conservar también las variables `API_BASE_URL`, `ENVELOPE_BASE_URL` y `PAYROLL_BASE_URL`, además de los bypass secrets separados de Vercel que ya usa el smoke del ambiente. Nunca copiar valores reales a `.env.example`, logs, issues o artefactos.

En ambos proyectos Vercel debe estar habilitada la exposición automática de System Environment Variables para que `VERCEL_GIT_COMMIT_SHA` exista durante el build. Si falta, el meta de release será `local` y el workflow se detendrá antes de autenticarse.

## Ejecución

Después de desplegar `develop`, abrir **Authenticated development E2E** en GitHub Actions e indicar:

- `release_sha`: SHA completo servido por ambos alias Vercel;
- `api_sha`: SHA completo expuesto como `release` por `/health` en la API de desarrollo.

GitHub solo permite disparar manualmente un `workflow_dispatch` cuando el archivo ya existe en la rama por defecto (`master`). En la primera incorporación de este workflow, ejecutar `pnpm test:e2e:development` desde el SHA de `develop` contra el ambiente desplegado y conservar el resultado en el PR de release; después de que el archivo llegue a `master`, las promociones siguientes usan GitHub Actions normalmente seleccionando el ref de `develop`.

La suite rechaza alias desfasados antes de ejecutar los recorridos. Envelope y Payroll incluyen `meta[name="keysar-release"]`, generado desde `VERCEL_GIT_COMMIT_SHA`; la API usa `RELEASE_SHA`.

Para una ejecución local, exportar las variables listadas en `.env.example` y ejecutar:

```bash
pnpm test:e2e:development
```

Playwright crea temporalmente `apps/e2e/.auth/envelope.json` y `payroll.json`. Son archivos ignorados que contienen JWT/cookies y nunca deben adjuntarse ni versionarse. El workflow los elimina antes de publicar diagnósticos.

## Cobertura de la primera versión

Cada app tiene ocho recorridos autenticados. Ambos validan login/sesión, pantalla principal, calendarios reales, tablas, selects, navegación de escritorio/móvil y logout. Envelope cubre ventas, citas y total general; Payroll cubre resumen, movimientos, esquemas, recibos y desglose por sucursal.

Todas las páginas se ejecutan con un fixture que registra métodos HTTP y falla ante cualquier request distinta de `GET`, `HEAD` u `OPTIONS`. Los proyectos autenticados tienen máximo un retry en CI.

## Diagnóstico y artefactos seguros

El reporte HTML `authenticated-development-e2e-report` se conserva siete días. Para impedir filtraciones, esta configuración desactiva siempre:

- traces;
- screenshots;
- video;
- adjuntos de `storageState`.

Interpretación de fallas:

- `release-identity`: algún alias o la API no sirve el SHA indicado;
- `*-auth-setup`: credenciales, permisos, CORS o bypass de Vercel incorrectos;
- encabezado/ruta ausente: permiso faltante, guard de sesión o carga integrada rota;
- `solo lectura`: el recorrido intentó un método de escritura y debe corregirse antes de reintentar.

Si hace falta inspección visual, reproducir localmente con `test:development:headed`; no habilitar traces o screenshots en CI con cuentas que puedan leer información operativa.
