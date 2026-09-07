# Scheduler — RV4: restauración de Administración y catálogos

> Fecha: 6 de septiembre de 2026.
> Referencia visual: `e9077ddad945325b1a132962ce0c2fcd9ae7f74a`.
> Estado: implementada en repositorio; validación visual y funcional con API/BD pendiente por B06.

## Resultado

La entrada normal de `/administracion` recupera el encabezado oscuro, superficies marfil, jerarquía tipográfica, tarjetas, tablas y diálogos de la referencia para las siete secciones de RV4. Los formularios usan exclusivamente candidatos, perfiles y catálogos canónicos; `AdministrationWorkspace` y `mock-administration-data` siguen aislados como fixture histórico y no son fallback operativo.

Las secciones `Encuestas`, `Consentimientos` y `WhatsApp` conservan temporalmente la integración segura de Fase 9. Su restauración corresponde a RV6 y no se declaró terminada durante RV4.

## Cobertura implementada

| Sección              | Lecturas y mutaciones reales                                                                                        | Tratamiento de la presentación                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comercios            | `createCommerce`, `updateCommerce`, candidatos de sucursal y `updateBranchProfile`                                  | Tarjetas de comercio, tabla de sucursales y diálogos de alta/edición/activación. Se muestran por separado el ID canónico y la existencia del perfil Scheduler.         |
| Horarios de sucursal | catálogo operativo y `replaceAvailabilityRules`/`replaceAvailabilityExceptions`                                     | Editor semanal con apertura, cierre, descanso y días especiales. La baja de una excepción reemplaza la vigencia activa sin borrar historia.                            |
| Especialistas        | candidatos de empleado, `updateProfessionalProfile`, especialidades y grupos                                        | Tabla aprobada, diálogo de perfil, sucursales, disponibilidad online, especialidades, grupos, horario y días especiales. Sólo se activa un empleado existente.         |
| Servicios            | candidatos `CatalogItem SERVICE`, `updateServiceProfile`, `updateProfessionalService` y `updateResourceRequirement` | Tabla y diálogo de duración, preparación, limpieza, modalidad, capacidad y sucursales; panel de asignaciones por sucursal y recursos requeridos.                       |
| Clases               | `replaceClassSchedules`                                                                                             | Alta y retiro mediante reemplazo versionado del conjunto activo, con día, hora, profesional, sucursal y capacidad.                                                     |
| Paquetes             | referencias POS de sólo lectura y `updatePackageProfile`                                                            | Alta/edición del perfil Scheduler sobre un `PosPackage`; conserva cantidades, override de precio y orden de líneas existentes al editar.                               |
| Complementos         | catálogo administrativo y `updateAddonProfile`                                                                      | Edición de duración, estado y servicios compatibles para perfiles ya materializados.                                                                                   |
| Recursos             | `createResource`, `updateResource`, requisitos y disponibilidad                                                     | Tabla, diálogo de alta/edición/baja lógica, capacidad, exclusividad, agenda online, horario, descansos y días especiales.                                              |
| Comisiones           | `updateCommissionPolicy`                                                                                            | Diálogo versionado para objetivo general/profesional/catálogo, periodo y modalidades por cita, asistencia, porcentaje o niveles. Nómina conserva la liquidación final. |
| Gift cards           | `createGiftCard`/`updateGiftCard`                                                                                   | Tarjetas y diálogo completo de tipo monto/servicio, precio, vigencia, descripción, diseño, servicios y estado. Sólo son plantillas.                                    |
| Colores              | `createAuthorization` + `updateStatusColors`                                                                        | Paleta por comercio, restablecimiento visual y confirmación con token de un solo uso ligado a `STATUS_COLORS_CHANGE`.                                                  |

Después de toda mutación se invalidan `operational-catalog`, `administration-catalog` y `agenda`. Los formularios conservan `expectedVersion` cuando el contrato lo publica y presentan conflictos sin sustituir la versión local de forma silenciosa.

## Adaptadores y pruebas

`scheduler-administration-presentation.ts` concentra la conversión minutos ↔ hora, la proyección de reglas canónicas al editor semanal, la validación de descansos y los prefijos de invalidación. La suite `scheduler-administration-presentation.test.cjs` cubre:

- separación de horarios del mismo profesional por sucursal;
- conversión de trabajo/descanso entre DTO y borrador de siete días;
- validación de rangos y descansos fuera de jornada;
- límites `00:00`/`24:00` y relaciones inmutables.

El fixture `apps/e2e/development/fixtures/scheduler-administration.ts` sólo contiene DTOs ficticios. `scheduler-administration.visual.spec.ts` conserva login, bootstrap y permisos reales, intercepta únicamente lecturas administrativas y adjunta las siete secciones RV4 a `1366×768`, además de Servicios a `390×844`.

Ejecución en un host compatible:

```bash
E2E_SCHEDULER_ADMIN_VISUAL=true \
pnpm --filter @cosmetics/e2e exec playwright test \
  --config playwright.development.config.ts \
  --project=scheduler-development \
  scheduler-administration.visual.spec.ts
```

La cuenta debe tener `READ` en las siete pantallas administrativas. El guard de E2E continúa bloqueando escrituras; esta suite es evidencia visual, no una prueba de persistencia.

## Diferencias necesarias y brechas registradas

| Superficie histórica                                   | Contrato comprobado                                                                                            | Decisión RV4                                                                                               | Seguimiento                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Contacto, domicilio e imagen de sucursal               | El perfil Scheduler sólo publica comercio, zona, estado y reservas                                             | Mostrar la ausencia contractual; no guardar esos datos en el perfil de agenda                              | Coordinar con la autoridad canónica de sucursales si el producto requiere edición desde Scheduler |
| Categorías e importación/exportación masiva de precios | Precio/categoría pertenecen al catálogo comercial/POS                                                          | No montar un botón sin efecto ni copiar precios a Scheduler                                                | Brecha B03; requiere contrato comercial explícito                                                 |
| Activación inicial de complementos                     | El catálogo administrativo sólo devuelve perfiles ya materializados; no publica candidatos `CatalogItem` aptos | Permitir edición real de perfiles existentes y explicar la limitación                                      | Brecha B03; ampliar el DTO de referencias antes de habilitar alta                                 |
| Validación administrativa de uso de un recurso         | No existe endpoint que proyecte citas afectadas o confirme si una baja/reasignación puede aplicarse            | Mantener requisitos y disponibilidad reales; no reconstruir `ResourceValidationDialog` con datos inferidos | Brecha B03; definir una consulta autoritativa si Administración debe anticipar el impacto         |
| Emisión, saldo y redención de gift cards               | Fase 6 sólo implementa plantillas                                                                              | Presentarlas como plantillas, nunca como saldo o movimiento                                                | Flujo futuro coordinado con POS                                                                   |
| Pago final de comisión                                 | Scheduler versiona reglas; Nómina liquida                                                                      | No crear movimientos ni recibos desde Administración                                                       | Decisión de autoridad, sin trabajo RV4 pendiente                                                  |

No se modificaron backend, Prisma, migraciones, seeds, variables, despliegues ni datos operativos.

## Verificación local

Ejecutado correctamente:

```bash
pnpm --filter @cosmetics/scheduler type-check
pnpm --filter @cosmetics/scheduler test
pnpm --filter @cosmetics/scheduler lint
pnpm --filter @cosmetics/scheduler build
pnpm --filter @cosmetics/e2e type-check
pnpm --filter @cosmetics/e2e lint
pnpm --filter @cosmetics/e2e exec playwright test \
  --config playwright.development.config.ts \
  --list --project=scheduler-development
git diff --check
```

La suite Scheduler pasa seis archivos. El lint/build conserva únicamente advertencias históricas de `<img>` y dependencias de hooks fuera de los componentes RV4. El descubrimiento Playwright incluye las dos pruebas RV4.

## Validación pendiente

B06 continúa vigente: este workspace no permite iniciar servidor/Chromium y no dispone de PostgreSQL desechable. Para marcar RV4 `Validada` faltan:

1. comparar las capturas RV4 con `e9077dd` en los viewports documentados;
2. recorrer cada alta/edición/baja lógica, recargar y comprobar persistencia sobre API/PostgreSQL de prueba;
3. provocar `401`, `403`, alcance cruzado y `409` en perfiles, reglas, paquetes, comisiones, gift cards y colores;
4. confirmar en Agenda que los cambios de horarios, asignaciones, recursos, clases y paleta se reflejan después de invalidar.
