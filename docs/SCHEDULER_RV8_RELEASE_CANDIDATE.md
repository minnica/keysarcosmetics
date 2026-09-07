# Scheduler RV8 — verificación integral y candidata de entrega

> Fecha: 6 de septiembre de 2026  
> Rama: `feature/scheduler`  
> Base inspeccionada: `9706a9fd125759d0c2a37b36d76d0738d0d8e1e0`  
> Estado: implementación local completa; validación visual y recorridos API/PostgreSQL pendientes por B06.

## Resultado

RV8 revisó las 19 entradas de App Router inventariadas en RV0. Agenda, Clientes, Administración, Configuraciones, Reportes, Ventas y los desgloses profundos llegan exclusivamente a los adaptadores y presentaciones restaurados; las dos rutas históricas `opatra-mexico` continúan como alias al selector de Locales y una sección de Clientes desconocida termina en 404. Se retiró la rama muerta que todavía mostraba “Pantalla pendiente de diseño”.

`scheduler-rv8-integrity.test.cjs` recorre los imports estáticos y dinámicos desde `src/app`, falla ante rutas faltantes, imports internos sin resolver, workspaces retirados, marcadores mock, persistencia no autorizada o imports ansiosos de los generadores de reportes. Los fixtures deterministas permanecen únicamente en `apps/e2e/development/fixtures`; no forman parte del grafo productivo.

## Sesión, permisos y aislamiento

- La sesión revalida `bootstrap` cada 30 segundos, al recuperar foco, al volver visible la pestaña y cuando otra pestaña cambia `auth_token`.
- Cada solicitud de bootstrap lleva una generación local y el token observado. Una respuesta tardía posterior a logout o cambio de cuenta ya no puede restaurar la identidad anterior.
- Un `401` elimina el token mediante el cliente API, desmonta el workspace y conserva `next` al volver al login. La pérdida de todos los permisos desmonta la pantalla y muestra el estado cerrado de acceso.
- Los queries ya separaban usuario, sucursal y filtros, y descartan respuestas obsoletas. El `Fragment` por `bootstrap.user.id` remonta los workspaces al cambiar de identidad; datos médicos, documentos e históricos sensibles conservan sus expiraciones y limpieza de RV2/RV3/RV6.
- El recorrido E2E de sólo lectura agrega casos para sesión vencida y revocación total de permisos. Playwright los descubre, pero B06 impide ejecutarlos en este sandbox.

El doble envío, replay idempotente, conflictos optimistas, alcance por sucursal/profesional y autorización de un solo uso tienen cobertura unitaria o de integración de las fases backend. Su recorrido conjunto con dos sesiones y escritura real sigue requiriendo una API y PostgreSQL 16 desechables; no se sustituyó por mocks.

## Limpieza y chunks

Se eliminaron 36 archivos sin consumidores: 33 archivos de runtime/estilos/helpers basados en fixtures y tres suites que sólo probaban esos datos demostrativos. Esto incluye los workspaces históricos completos, reportes mock, configuración local de horarios y barrels huérfanos. Los componentes restaurados en uso, adaptadores canónicos, contratos y helpers puros se conservaron. Las funciones históricas sin contrato —importación/audiencias/reporte de fichas, operaciones comerciales y comparación no publicada— siguen registradas en B03/B05 y pueden consultarse en `e9077dd`; no se presentan como funciones operativas.

Los cinco workspaces canónicos ahora se cargan con `next/dynamic` desde la entrada común. El build optimizado cambió así:

| Superficie            | Antes RV8 | Candidata RV8 |
| --------------------- | --------: | ------------: |
| Rutas operativas base |  `359 kB` |     `89.8 kB` |
| Clientes profundo     |  `359 kB` |     `89.8 kB` |
| Login                 |  `234 kB` |      `234 kB` |
| JS compartido         | `87.8 kB` |     `88.1 kB` |

La reducción inicial de las rutas operativas es de aproximadamente 75 %. XLSX, jsPDF y AutoTable continúan como imports dinámicos activados sólo al exportar. La inspección de `.next/static/chunks` y `.next/server/app` no encontró `schedulerWeekBookings`, archivos `mock-*` ni la clave `scheduler-operating-hours-by-commerce`.

## Persistencia en navegador

| Clave/uso                                  | Decisión                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `auth_token`                               | JWT compartido requerido por el cliente API; se elimina en logout y `401`.                          |
| `keysar-scheduler-agenda-settings`         | Sólo `slotMinutes`, preferencia visual de este dispositivo; no autoriza horarios ni disponibilidad. |
| `keysar-scheduler-authorizations-settings` | Únicamente se elimina al abrir Código personal; no se vuelve a escribir.                            |

No quedan `sessionStorage`, IndexedDB, horarios, clientes, citas, reportes, documentos ni autorizaciones operativas persistidos por Scheduler.

## Verificación local ejecutada

```bash
pnpm --filter @cosmetics/scheduler test
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler build
pnpm --filter @cosmetics/e2e type-check
pnpm --filter @cosmetics/e2e lint
pnpm --filter @cosmetics/e2e exec playwright test \
  --config=playwright.development.config.ts \
  --project=scheduler-development --list
```

Resultados: 8 suites de Scheduler correctas; type-check correcto; lint correcto con cuatro advertencias históricas de `<img>`; build correcto con 21 páginas; type-check y lint E2E correctos; Playwright descubre 17 pruebas incluyendo dependencias, los cuatro runners visuales y los dos casos RV8. La búsqueda de marcadores en chunks y `git diff --check` son parte del cierre documental.

## Evidencia y validación externa pendiente

En un host con puertos y Chromium disponibles, ejecutar la referencia RV0 y todos los runners restaurados con fecha, zona, fuentes y viewports documentados:

```bash
pnpm --filter @cosmetics/e2e capture:scheduler:reference

E2E_SCHEDULER_ADMIN_VISUAL=true \
E2E_SCHEDULER_SETTINGS_VISUAL=true \
E2E_SCHEDULER_ENGAGEMENT_VISUAL=true \
E2E_SCHEDULER_REPORTS_VISUAL=true \
pnpm --filter @cosmetics/e2e exec playwright test \
  --config=playwright.development.config.ts \
  --project=scheduler-development
```

Revisar manualmente Agenda día/semana/lista, Clientes, las siete secciones administrativas, Configuraciones, engagement, Reportes y móvil contra `docs/artifacts/scheduler-visual-baseline/e9077dd/`. Después ejecutar sobre PostgreSQL 16 desechable los recorridos de RV2–RV7: login/logout y caducidad; permisos/alcance; create/reload/edit/move/status/cancel; bloqueos; duplicados/merge; CRUD administrativo; herencia; outbox/storage/encuestas; exportación/paridad y carreras de versión/capacidad. No usar development compartido ni producción para completar escrituras.

Hasta que esa evidencia exista, RV0–RV8 conservan el estado **Implementada; validación pendiente** y no constituyen autorización de despliegue.

## Candidata y reversión frontend

La candidata es el commit que se cree a partir de la base `9706a9fd125759d0c2a37b36d76d0738d0d8e1e0` con los cambios RV8 de este documento. Mientras el working tree no tenga commit no existe un SHA de candidata y no debe inventarse; el despliegue debe verificar `meta[name="keysar-release"]` contra el SHA finalmente creado.

Rollback visual compatible: volver a desplegar **sólo `apps/scheduler`** desde `9706a9fd125759d0c2a37b36d76d0738d0d8e1e0`, confirmar el SHA expuesto y ejecutar el smoke autenticado de sólo lectura. RV8 no cambia API, Prisma, migraciones, datos ni variables, por lo que ese commit conserva el mismo contrato backend. No ejecutar `git reset`, no revertir migraciones, no cambiar `AGENDA_PROVIDER`, no borrar outbox/documentos y no alterar el proveedor POS para corregir una regresión frontend.
