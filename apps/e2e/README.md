# E2E de ambientes

Este paquete contiene tres suites distintas:

- `pnpm test:smoke`: smoke público, pequeño y válido para development o producción; también comprueba los SHA exactos servidos;
- `pnpm test:e2e:development`: recorridos autenticados y exclusivamente de lectura para los alias estables de `develop`.
- `pnpm test:e2e:production`: tres smokes autenticados de solo lectura por app, reservados para el workflow protegido de producción.

La suite amplia de development nunca se ejecuta contra producción. El smoke productivo usa cuentas distintas, permisos más pequeños y no explora flujos de captura.

## Preparación única de development

Crear tres cuentas exclusivas de automatización, con empleados y puestos propios. No reutilizar cuentas personales ni `SUPER_ADMIN`.

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

### Scheduler

El puesto de la cuenta debe tener:

- `canManageSchedulerAccess = false`;
- `selfProfessionalOnly = false` y una asignación explícita a una sucursal de prueba;
- capacidad `READ` únicamente en `scheduler/agenda`, `scheduler/clients` y `scheduler/reports`;
- ninguna capacidad `WRITE`, `ADMIN`, `EXPORT` o `EXCEPTION`.

El guard de red de Playwright impide además cualquier método HTTP de escritura.

Guardar las credenciales en secrets del environment de GitHub `development`:

```text
E2E_ENVELOPE_EMAIL
E2E_ENVELOPE_PASSWORD
E2E_PAYROLL_EMAIL
E2E_PAYROLL_PASSWORD
E2E_SCHEDULER_EMAIL
E2E_SCHEDULER_PASSWORD
```

Conservar también las variables `API_BASE_URL`, `ENVELOPE_BASE_URL`,
`FINANCE_BASE_URL`, `HR_BASE_URL`, `PAYROLL_BASE_URL` y `SCHEDULER_BASE_URL`,
además de los cinco bypass secrets separados de Vercel que usa el smoke del
ambiente. Nunca copiar valores reales a `.env.example`, logs, issues o
artefactos.

Las cinco apps exponen `keysar-release`. Los builds selectivos inyectan
`KEYSAR_RELEASE_SHA`; mientras una app conserve integración Git, ésta usa
`VERCEL_GIT_COMMIT_SHA`. Si ambos faltan, el meta será `local` y el workflow se
detendrá antes de autenticarse.

## Preparación única de producción

Crear dos cuentas exclusivas de monitoreo en Supabase producción. No reutilizar cuentas personales, de development ni `SUPER_ADMIN`.

### Envelope

El puesto productivo de monitoreo debe tener:

- `canManageAccess = false`;
- `selfDataOnly = true`;
- únicamente `dashboard` y `reportes/total-general`;
- ningún permiso virtual ni otra pantalla;
- un empleado exclusivo sin ventas ni citas operativas asignadas.

Envelope todavía no distingue lectura y escritura por pantalla. Por eso la cuenta no recibe pantallas CRUD y el fixture de Playwright falla si observa cualquier método distinto de `GET`, `HEAD` u `OPTIONS`.

### Payroll

El puesto productivo de monitoreo debe tener:

- `canManagePayrollAccess = false`;
- únicamente `payroll/esquemas`;
- `canWrite = false`;
- ninguna otra pantalla.

Guardar las credenciales exclusivamente como secrets del environment protegido `production`:

```text
PRODUCTION_MONITOR_ENVELOPE_EMAIL
PRODUCTION_MONITOR_ENVELOPE_PASSWORD
PRODUCTION_MONITOR_PAYROLL_EMAIL
PRODUCTION_MONITOR_PAYROLL_PASSWORD
```

La creación de cuentas y secrets es una activación administrativa externa: no se realiza desde scripts, seeds ni migraciones del repositorio. Rotar cada contraseña inmediatamente si aparece en logs, artefactos o soporte, y al menos cada 90 días. Desactivar ambas cuentas al retirar este gate.

## Ejecución

Después de desplegar `develop`, abrir **Authenticated development E2E** en GitHub Actions e indicar:

- `envelope_sha`: SHA completo servido por el alias de Envelope;
- `finance_sha`: SHA completo servido por el alias de Finance;
- `hr_sha`: SHA completo servido por el alias de HR;
- `payroll_sha`: SHA completo servido por el alias de Payroll;
- `scheduler_sha`: SHA completo servido por el alias de Scheduler;
- `api_sha`: SHA completo expuesto como `release` por `/health` en la API de desarrollo.

GitHub solo permite disparar manualmente un `workflow_dispatch` cuando el archivo ya existe en la rama por defecto (`master`). En la primera incorporación de este workflow, ejecutar `pnpm test:e2e:development` desde el SHA de `develop` contra el ambiente desplegado y conservar el resultado en el PR de release; después de que el archivo llegue a `master`, las promociones siguientes usan GitHub Actions normalmente seleccionando el ref de `develop`.

La suite rechaza alias desfasados antes de crear sesiones o ejecutar los
recorridos. Envelope, Finance, HR, Payroll y Scheduler incluyen
`meta[name="keysar-release"]`; la API usa `RELEASE_SHA`. Los seis SHAs pueden
ser distintos.

Cuando las identidades coinciden, el workflow publica por 30 días un artefacto `release-manifest-development-*` con ambiente, fecha, SHA de la suite y la matriz de versiones realmente servida. No contiene URLs, credenciales, cookies ni bypass secrets. Si una identidad no coincide, el archivo no se genera.

Para una ejecución local, exportar las variables listadas en `.env.example` y ejecutar:

```bash
pnpm test:e2e:development
```

Playwright crea temporalmente `apps/e2e/.auth/envelope.json`, `payroll.json` y `scheduler.json`. Son archivos ignorados que contienen JWT/cookies y nunca deben adjuntarse ni versionarse. El workflow los elimina antes de publicar diagnósticos.

Para production, ejecutar únicamente **Environment smoke tests** desde
`master`, seleccionar `production` e indicar `envelope_sha`, `payroll_sha`,
`scheduler_sha` y `api_sha`; `finance_sha` y `hr_sha` permanecen vacíos en esta
fase. El workflow conserva el contrato productivo original; sólo entonces crea
las sesiones temporales de monitoreo para Envelope y Payroll.

## Cobertura de la primera versión

Envelope y Payroll conservan ocho recorridos autenticados cada una. Scheduler agrega tres recorridos de sólo lectura para Agenda, Clientes y Reportes y verifica que una sesión normal no anuncie fixtures. En conjunto validan login/sesión, pantallas principales, calendarios reales, tablas, selects y navegación.

El smoke productivo autenticado limita su cobertura a tres recorridos por app para Envelope y Payroll. Scheduler participa en el smoke público y sus recorridos autenticados se ejecutan en development con permisos `READ`. Los setups de autenticación son casos separados y las sesiones no se comparten entre aplicaciones.

Todas las páginas se ejecutan con un fixture que registra métodos HTTP y falla ante cualquier request distinta de `GET`, `HEAD` u `OPTIONS`. Los proyectos autenticados tienen máximo un retry en CI.

## Diagnóstico y artefactos seguros

El reporte HTML `authenticated-development-e2e-report` de development se conserva siete días. Para impedir filtraciones, las configuraciones autenticadas desactivan siempre:

- traces;
- screenshots;
- video;
- adjuntos de `storageState`.

Producción no publica reporte HTML ni `test-results`: el workflow elimina sesiones y diagnósticos locales incluso si falla. Solo conserva el resumen textual de GitHub con duración, número de intento y resultado; no contiene URLs privadas, credenciales, JWT ni datos de tablas. El smoke productivo tiene cero retries para que una falla no quede oculta.

Interpretación de fallas:

- `release-identity`: algún alias o la API no sirve su SHA declarado en la matriz;
- `*-auth-setup`: credenciales, permisos, CORS o bypass de Vercel incorrectos;
- encabezado/ruta ausente: permiso faltante, guard de sesión o carga integrada rota;
- `solo lectura`: el recorrido intentó un método de escritura y debe corregirse antes de reintentar.

Si hace falta inspección visual, reproducir localmente con `test:development:headed`; no habilitar traces o screenshots en CI con cuentas que puedan leer información operativa.

## Duración y flakiness

Los workflows escriben duración, intento y resultado en `GITHUB_STEP_SUMMARY`. Durante las primeras cinco promociones revisar los cinco resultados consecutivos de **Environment smoke tests** y **Authenticated production smoke**; cualquier retry manual o falla intermitente se registra como incidencia y se corrige antes de considerar estable el gate. Los contratos de UI registran cero retries y los canaries visuales permiten como máximo uno.
