# Scheduler — Fase 9: conexión progresiva del frontend

Fecha de implementación en repositorio: 4 de septiembre de 2026.

## Resultado

Una sesión normal de `apps/scheduler` monta exclusivamente workspaces conectados a `@cosmetics/api-client`. El guard dejó de cerrar las superficies que ya cuentan con contratos persistentes y el bloqueo especial del viewport se conserva sólo para la agenda fixture de desarrollo.

Los workspaces anteriores siguen disponibles como fixtures aislados mediante `next/dynamic` únicamente cuando el bootstrap del servidor devuelve `mockModeEnabled = true`. Esa respuesta sólo puede ocurrir con `NODE_ENV=development` y `SCHEDULER_ALLOW_MOCKS=true`. No se copian clientes, citas, configuraciones, métricas, códigos ni catálogos de `localStorage` a PostgreSQL.

Esta fase no agrega modelos, migraciones, seeds ni variables de ambiente.

## Mapa de superficies

| Superficie | Contratos consumidos en modo normal |
| --- | --- |
| Sesión y acceso | `bootstrap`, permisos efectivos, sucursales autorizadas y código personal |
| Agenda | catálogo operativo, disponibilidad, citas, estados, movimientos, cancelaciones y bloqueos |
| Clientes | búsqueda, procedencias, alta/edición versionada, expediente, visitas y finanzas POS de sólo lectura |
| Administración base | candidatos, comercios, perfiles de sucursal/profesional/servicio, recursos y asignaciones |
| Administración avanzada | paquetes, complementos, horarios de clase, comisiones, encuestas, consentimientos, plantillas/outbox, gift cards y colores de estado |
| Configuraciones | resolución y escritura versionada por `COMMERCE → BRANCH → USER` |
| Reportes | los doce datasets de Fase 8 y exportación CSV desde el dataset completo devuelto por `/exports` |

`SchedulerPageEntries.tsx` es la frontera entre modo API y fixtures. Los componentes bajo `src/components/api/` no importan módulos `mock-*` ni usan `localStorage` operativo.

## Carga, invalidación y errores

`useSchedulerQuery` ofrece una capa pequeña y común para:

- carga inicial y recarga explícita;
- descarte de respuestas obsoletas cuando cambian filtros;
- estados de carga, error con reintento y vacío;
- invalidación posterior a una mutación;
- conservación del formulario ante un conflicto.

Las mutaciones con control optimista pasan por `runSchedulerMutation`. Un `409 Conflict` se muestra aparte y ofrece recargar la versión canónica; otros errores usan el mensaje estándar de la API. Las acciones se ocultan o deshabilitan según `READ`, `WRITE`, `ADMIN` y `EXPORT`, pero el backend continúa siendo la frontera de autorización.

## Reglas sensibles

- Abrir el expediente de un cliente emite autorizaciones independientes y de un solo uso para perfil, visitas y finanzas. El código no se persiste y los tokens se consumen en sus endpoints objetivo.
- Cambiar colores emite una autorización `STATUS_COLORS_CHANGE` ligada al comercio; `updateStatusColors` la consume dentro de la mutación auditada.
- La exportación de clientes emite `SENSITIVE_EXPORT` ligado al dataset `CUSTOMERS` y pasa el token de un solo uso a `/exports`; nunca degrada el control.
- Configuraciones se editan como un documento JSON versionado. El servidor conserva el límite de 64 KiB y el rechazo recursivo de claves con apariencia de secreto.
- Consentimientos se cargan al almacenamiento privado mediante `multipart/form-data`; el frontend no conoce rutas internas del bucket.

## Alcance de fixtures

Los componentes históricos y archivos `mock-*` no se eliminan todavía porque conservan escenarios visuales útiles para desarrollo. No participan en una sesión normal y sólo se descargan como chunks dinámicos en el modo mock explícito. La altura visual de slots puede seguir siendo una preferencia local del fixture; no gobierna disponibilidad ni reservas canónicas.

## Validación local

Ejecutada desde la raíz del monorepo:

```bash
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler build
git diff --check
```

TypeScript y el build de producción finalizaron correctamente. Lint conserva únicamente advertencias preexistentes en los workspaces fixture sobre `<img>` y dependencias de hooks; los componentes API nuevos no agregan advertencias.

## Gates antes de activar

La compilación no sustituye la evidencia de ambiente. Antes de habilitar Scheduler para operación se debe:

1. cerrar y aprobar el diagnóstico de Fase 0;
2. reconstruir las migraciones de Scheduler sobre PostgreSQL 16 desechable;
3. provisionar comercios, perfiles, horarios, grants, bucket privado y llaves sin seeds operativos;
4. ejecutar pruebas HTTP de alcance, autorizaciones, `409`, idempotencia y concurrencia;
5. ejecutar E2E de cada permiso con datos controlados y confirmar que el modo normal no solicita chunks fixture;
6. verificar paridad de pantalla/exportación y archivos grandes;
7. mantener mensajería deshabilitada hasta aprobar su sandbox;
8. validar el corte POS/Scheduler antes de retirar el adaptador `http` de rollback.

Sin estos gates, la Fase 9 está completa en código pero no habilitada en development ni production.
