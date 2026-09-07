# Scheduler RV1: frontera de presentación y datos

Fecha: 6 de septiembre de 2026  
Rama: `feature/scheduler`  
Base de implementación: `b1b4595619f6030c4a81beff486a32da472eccc5`

## Resultado

RV1 separa los contratos visuales de los fixtures y deja una única entrada operativa por módulo. La sesión normal y una sesión cuyo bootstrap todavía informe `mockModeEnabled` usan los workspaces API; el indicador ya no cambia permisos, alcance ni presentación. La activación de la Agenda aprobada queda reservada para RV2, cuando sus operaciones estén conectadas.

El build productivo se revisó buscando identificadores y contenido de `schedulerDayBookings`, `schedulerWeekBookings`, `initialSchedulerClients` y bloques de ejemplo. No se encontraron esos fixtures en los chunks de las rutas operativas.

## Fronteras

| Archivo                                                      | Responsabilidad                                                                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `apps/scheduler/src/lib/scheduler-presentation.ts`           | Tipos y constantes visuales reutilizables por los componentes aprobados; no contiene reservas, clientes ni semanas ficticias. |
| `apps/scheduler/src/lib/scheduler-client-presentation.ts`    | Tipo visual de cliente y utilidades puras de normalización/búsqueda.                                                          |
| `apps/scheduler/src/lib/scheduler-agenda-presentation.ts`    | Modelos tipados y adaptadores de DTO canónico a columnas, citas, servicios, participantes y bloqueos.                         |
| `apps/scheduler/src/lib/scheduler-query-scope.ts`            | Identidad estable de consulta por usuario, sucursal, clave y filtros; decisión pura para aceptar o descartar una respuesta.   |
| `apps/scheduler/src/components/api/ApiState.tsx`             | Carga, estados, invalidación por prefijo y descarte de respuestas pertenecientes a otro alcance.                              |
| `apps/scheduler/src/components/api/SchedulerPageEntries.tsx` | Entradas productivas explícitas. No importa workspaces mock ni ofrece fallback a fixtures.                                    |

`SchedulerAgendaAppointment.canonical` y `SchedulerAgendaBlock.canonical` conservan el DTO completo para mutaciones versionadas. La vista mantiene además IDs canónicos, `version`, zona IANA, instantes originales, servicios ordenados, membresía y participantes diferenciados (`PRIMARY`, `SUPPORT`, `RESOURCE`). Profesionales y recursos usan namespaces de columna distintos.

`ARRIVED` se presenta como “Llegó” y `ATTENDED` como “Atendida”; no se colapsan. Teléfono, correo, avatar y precio son opcionales y quedan en `null` mientras no exista un origen agregado y autorizado. RV1 no sintetiza una cola de pendientes sin profesional porque el contrato vigente todavía exige participantes; esa decisión sigue en B02/RV2.

## Estado local y seguridad

- Vista, filtros, paneles y borradores permanecen locales a cada workspace.
- El alcance de las consultas incluye la identidad del usuario y la sucursal; cambiar filtros o alcance limpia el resultado anterior y descarta respuestas tardías.
- Una mutación puede invalidar familias de consultas (`agenda`, `customers`, etc.). Agenda y Clientes ya usan esa invalidación.
- Cambiar de usuario remonta el contenido protegido. Agenda y Clientes corrigen una sucursal revocada; los borradores y el expediente sensible se limpian al cambiar de usuario.
- Cerrar el diálogo de expediente elimina de memoria código, detalle, visitas, finanzas y error. Perder permiso desmonta el workspace mediante `SchedulerAccessGuard`.
- `mockModeEnabled` ya no concede acceso a sucursales o comercios ni selecciona componentes simulados.

## Pruebas y datos visuales controlados

Scheduler declara ahora el runner:

```bash
pnpm --filter @cosmetics/scheduler test
```

`tests/scheduler-agenda-presentation.test.cjs` cubre zona horaria y cruce de medianoche, distinción `ARRIVED`/`ATTENDED`, cita multi-servicio, profesionales, recurso, membresía, versiones, campos ausentes, bloqueos, columnas y alcance/descarte de consultas.

La prueba `renderiza DTOs controlados sin sustituir sesión ni permisos` de `apps/e2e/development/scheduler.development.spec.ts` intercepta únicamente los GET de citas y bloqueos. Usa la autenticación, bootstrap, sucursales y permisos del ambiente; adjunta una captura `scheduler-agenda-rv1-1366x768`. Sus DTOs están en `apps/e2e/development/fixtures/scheduler-agenda.ts` y no son importados por Scheduler.

Comando de ejecución en un ambiente development autenticado:

```bash
pnpm --filter @cosmetics/e2e test:development --project scheduler-development --grep "DTOs controlados"
```

Requiere las variables de Scheduler descritas en `apps/e2e/development/helpers/environment.ts` y un host capaz de iniciar Chromium. En el sandbox actual sólo se verificó el descubrimiento de la prueba; no se generó ni aprobó una captura.

## Validación ejecutada

```text
pnpm --filter @cosmetics/scheduler type-check        correcto
pnpm --filter @cosmetics/scheduler test              correcto (4 archivos)
pnpm --filter @cosmetics/scheduler lint              correcto; advertencias históricas
pnpm --filter @cosmetics/scheduler build             correcto (21 páginas)
pnpm --filter @cosmetics/e2e type-check              correcto
pnpm --filter @cosmetics/e2e lint                    correcto
pnpm --filter @cosmetics/e2e exec playwright test -c playwright.development.config.ts --list --project scheduler-development
                                                     correcto; 6 pruebas descubiertas
git diff --check                                     correcto
```

La fase queda `Implementada; validación pendiente`: la frontera funcional está cubierta por pruebas y build, pero la captura E2E y la comparación con `e9077dd` requieren el ambiente externo ya registrado en B06.
