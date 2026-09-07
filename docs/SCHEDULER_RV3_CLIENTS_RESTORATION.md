# Scheduler RV3: Clientes, expediente e históricos restaurados

Fecha: 6 de septiembre de 2026
Rama: `feature/scheduler`
Base de implementación: `735ca6679aa0e8a2b70a279ab0a6330f93474950`

## Resultado

RV3 reemplaza el workspace simplificado de Clientes por la composición visual aprobada: cabecera Keysar, búsqueda/filtros, tabla, paginación, vacíos y diálogos amplios. Toda la información operativa proviene de `/api/scheduler/clients*`; `ClientsWorkspace`, `ClientsDatabase` y `mock-client-data.ts` no se montan ni actúan como fallback.

La fase queda **Implementada; validación pendiente**. La solicitud explícita permitió completar el trabajo independiente aunque RV2 conserva su validación visual pendiente. TypeScript, pruebas unitarias, lint y builds verifican la integración local; Chromium y PostgreSQL desechable continúan bloqueados por B06, por lo que no se afirma paridad visual aprobada ni persistencia HTTP comprobada.

## Contrato y presentación

| Pieza                                        | Responsabilidad RV3                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ApiClientsWorkspace.tsx`                    | Orquesta búsqueda, filtros, paginación, alta/edición, fusión y tres superficies sensibles sobre la presentación aprobada.  |
| `scheduler-customer-data.ts`                 | Comparte con Agenda el adaptador de identidad, prefijo de invalidación, conversión de campos tipados y retención temporal. |
| `GET /clients/search`                        | Conserva búsqueda mínima de dos caracteres y agrega `sourceId` opcional aplicado antes de paginar.                         |
| `GET /clients/field-definitions`             | Acepta `branchId` y devuelve sólo definiciones vigentes del comercio de una sucursal autorizada.                           |
| `@cosmetics/types` / `@cosmetics/api-client` | Publican los dos filtros nuevos sin cambiar la forma de los DTOs existentes.                                               |

El filtro de procedencia se ejecuta en servidor; no reduce una página parcial. El alcance de sucursal continúa en `schedulerCustomerScopeWhere`, y cambiar sucursal limpia selección de fusión, expediente e históricos. La tabla usa `SchedulerCustomerSummaryDto` y muestra identidad, contacto, procedencia y cartera vigentes sin inferir datos ausentes.

El backend mantiene el mínimo contractual de dos caracteres. Por esa razón la pantalla presenta un vacío guiado antes de buscar, no descarga toda la base ni intenta reconstruir un listado global desde consultas artificiales.

## Escritura e identidad compartida

El formulario real cubre:

- nombre canónico y preferido;
- teléfono y correo principal;
- alias y correos alternos;
- procedencia, locale y preferencia de contacto;
- notas generales y de perfil;
- estado activo;
- campos personalizados `TEXT`, `NUMBER`, `BOOLEAN`, `DATE` y `SELECT` del comercio correcto.

La edición sólo se habilita después de abrir el expediente autorizado. Envía `expectedVersion`, conserva el formulario ante `409` y ofrece recargar. El servidor sigue normalizando teléfono, tomando su advisory lock y rechazando duplicados. Tras alta, edición o fusión se invalida el prefijo compartido `customers`, por lo que se recargan tanto Clientes como cualquier búsqueda de cliente abierta en Agenda.

La fusión sólo aparece con capacidad `ADMIN`, exige exactamente dos identidades, deja elegir el destino, solicita motivo de al menos diez caracteres y crea una autorización `CLIENT_MERGE` ligada a `sourceId:targetId`. El request conserva las dos versiones observadas; una carrera devuelve conflicto en vez de fusionar datos obsoletos.

## Privacidad e históricos

Perfil, visitas y finanzas tienen controles y estados independientes. Cada uno:

1. solicita el código sin persistirlo;
2. crea un token con propósito y cliente exactos;
3. consume ese token en su endpoint correspondiente;
4. limpia el código aunque la llamada falle;
5. purga la respuesta al expirar, cerrar el diálogo, cambiar cliente/sucursal o cambiar sesión.

Editar desde el expediente conserva la fecha de expiración: si vence durante el formulario, la edición se cierra y purga. Visitas y finanzas paginan de diez en diez y cada página nueva exige otra autorización de un solo uso; el código anterior no se guarda. Errores de expiración o denegación aparecen inline y permiten reabrir la sección.

Finanzas muestra tickets, importes y pagos con `authority = POS_READ_ONLY`. No existen botones para crear, editar o borrar pagos. Esta decisión cierra B08 en Clientes y evita restaurar las mutaciones locales del fixture histórico.

## Diferencias intencionales y B03

Se conservaron la jerarquía, densidad, superficies, tabla y diálogos de la referencia, pero sólo se montaron filtros respaldados por el contrato: texto, sucursal y procedencia. Los filtros demográficos, de cumpleaños, servicios o actividad del fixture histórico no se calculan sobre una página parcial ni se inventan a partir de campos ausentes.

Importación masiva, audiencias y reporte de fichas siguen visibles como capacidades pendientes, con explicación B03. No se generan archivos locales que aparenten representar todo el resultado ni se confirma una audiencia sin persistencia. Sus contratos permanecen para RV4/RV6. Recordatorios y encuestas conservan sus rutas y se restauran en RV6/RV7.

## Pruebas ejecutadas

```text
pnpm --filter @cosmetics/scheduler type-check        correcto
pnpm --filter @cosmetics/scheduler test              correcto (5 archivos)
pnpm --filter @cosmetics/scheduler lint              correcto; advertencias históricas fuera de RV3
pnpm --filter @cosmetics/scheduler build             correcto (21 páginas)
pnpm --filter @cosmetics/types type-check            correcto
pnpm --filter @cosmetics/api-client type-check       correcto
pnpm --filter @cosmetics/api type-check              correcto
pnpm --filter @cosmetics/api lint                    correcto
pnpm --filter @cosmetics/api build                   correcto
pnpm --filter @cosmetics/api test:unit               correcto (133 pruebas, 25 archivos)
pnpm --filter @cosmetics/e2e type-check              correcto
pnpm --filter @cosmetics/e2e lint                    correcto
Playwright --list (scheduler-development)             correcto; 7 pruebas descubiertas
git diff --check                                     correcto
```

Prisma necesitó copiar su caché ya instalada a `/tmp/keysar-rv3-prisma-cache` y ejecutar los checks con `XDG_CACHE_HOME` porque el caché original es de sólo lectura. No se descargaron engines ni se modificó el entorno del repositorio.

`scheduler-customer-data.test.cjs` cubre identidad compartida con Agenda, normalización de listas, conversión de campos y expiración. La suite E2E agrega el fixture `scheduler-clients.ts`, intercepta sólo lecturas y prepara el adjunto `scheduler-clients-rv3-list-1366x768`.

Para producir evidencia visual en un host compatible:

```bash
pnpm --filter @cosmetics/e2e test:development \
  --project scheduler-development \
  --grep "listado RV3"
```

Para validar persistencia se necesita API con PostgreSQL 16 desechable y una identidad con permisos `READ/WRITE/ADMIN` y código secundario configurado. Ejecutar sin datos productivos:

1. buscar y paginar con dos sucursales/procedencias;
2. crear y recargar una identidad con alias, correos y cada tipo de campo;
3. editar desde expediente y provocar una carrera de versión;
4. intentar dos altas concurrentes con el mismo teléfono normalizado;
5. fusionar dos identidades con relaciones POS/Scheduler y revisar recarga en Agenda;
6. probar token correcto, denegado, expirado, reutilizado y ligado a otro cliente;
7. paginar visitas y finanzas confirmando un token nuevo por página;
8. verificar que ningún flujo financiero emita mutaciones.

## Pendientes antes de validar RV3

- Comparar búsqueda, tabla, vacío, alta, expediente y fusión con `e9077dd` en los seis viewports de RV0.
- Ejecutar los recorridos HTTP, persistencia, duplicado y concurrencia sobre PostgreSQL desechable.
- Resolver contratos de importación, audiencias y reporte de fichas antes de retirar el aviso B03.
- Completar Recordatorios/Encuestas en RV6/RV7 sin romper sus rutas actuales.

No se modificaron Prisma, migraciones, seeds, variables persistentes, despliegues ni datos operativos.
