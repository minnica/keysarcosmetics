# Análisis y guía de refactorización de HR

## Decisión de nombre

La carpeta debe llamarse `apps/hr` y el paquete `@cosmetics/hr`.

El nombre heredado **Roles de Personal** resulta ambiguo porque “rol” ya se usa para autorización. El sistema realmente cubre Recursos Humanos: directorio, expedientes, estatus laboral, turnos, descansos, vacaciones, permisos, cumpleaños, políticas, sucursales y cobertura de facialistas. `hr` es corto, inequívoco y consistente con nombres funcionales como `payroll`, `crm` y `pos`.

Nombre visible sugerido: **Keysar HR** o **Recursos Humanos**.

## Diagnóstico del prototipo recibido

- Next.js 16 + React 19 combinado con Vinext, Vite y Cloudflare Workers.
- Persistencia separada en Cloudflare D1 con Drizzle y archivos en R2.
- API concentrada en `app/api/app/route.ts`, con múltiples acciones discriminadas por strings.
- Modelos `staff`, `branches` y `job_roles` que duplican `Empleado`, `Sucursal` y `Position` de PostgreSQL.
- Sesión propia, códigos de acceso y permisos serializados como JSON, paralelos al JWT y a los permisos por puesto existentes.
- Gran parte de la interfaz está concentrada en `roles-client.tsx` y numerosos CSS globales.
- Incluye lógica útil para turnos, descansos, vacaciones, solicitudes, cobertura, expedientes, importación Excel, políticas y documentos.

El prototipo debe tratarse como especificación funcional. No conviene conectar D1 con la plataforma ni conservar dos fuentes de verdad para personal.

## Arquitectura objetivo

HR debe usar exactamente la plataforma compartida:

- Monorepo: pnpm workspaces + Turborepo desde la raíz.
- Frontend: Next.js 14.2.4, App Router, React 18.3, TypeScript strict.
- Formularios: React Hook Form + Zod.
- UI: Tailwind CSS 3 y componentes exclusivamente desde `@cosmetics/ui`.
- Datos: `@cosmetics/api-client` contra `backend/api`.
- Autenticación: JWT y cuentas existentes mediante `@cosmetics/auth`.
- Backend: módulo `/api/hr/*` en Express.
- Persistencia: Prisma + PostgreSQL en el Supabase existente.
- Archivos privados: Supabase Storage cuando el flujo sea aprobado y el bucket exista; no R2 ni service-role en frontend.
- Importación: `xlsx` en cliente solo para leer/prevalidar; el backend vuelve a validar y persiste de forma transaccional.
- Deploy: Vercel para frontend y Fly.io para la API compartida.

No se recomienda conservar Vinext, Wrangler, D1, Drizzle, R2, rutas de servidor dentro de la app ni autenticación ChatGPT/OpenAI Sites.

## Comandos y puerto reservados

Puerto de desarrollo y `start`: `3007`.

```bash
pnpm --filter @cosmetics/hr dev
pnpm --filter @cosmetics/hr type-check
pnpm --filter @cosmetics/hr lint
pnpm --filter @cosmetics/hr build
pnpm --filter @cosmetics/hr start
```

El `package.json` ya declara estos comandos y el stack objetivo. No se espera que el código heredado compile con el nuevo manifiesto hasta retirar sus integraciones de Cloudflare/Vinext y realizar la refactorización.

## Datos existentes que debe reutilizar

| Necesidad de HR | Fuente existente | Uso recomendado |
| --- | --- | --- |
| Identidad del empleado | `Empleado` | Poblar nombres, apellidos y `nombreCompleto`; será la única identidad laboral. |
| Estado laboral básico | `Empleado.activo` | Poblar activo/inactivo. El historial de altas, bajas y reingresos requerirá modelos nuevos. |
| Cumpleaños | `Empleado.fechaNacimiento` | Poblar calendario de cumpleaños; exponer solo día/mes cuando la pantalla no necesite el año. |
| Teléfono | `Empleado.numeroTelefono` | Poblar contacto del expediente con control de permisos. |
| Puesto | `Empleado.positionId` + `Position` | Sustituir `job_roles`; conservar `puesto` legacy solo como compatibilidad durante backfill. |
| Sucursal laboral | `Empleado.sucursalId`, `Empleado.todasSucursales`, `Sucursal` | Sustituir `staff.branch` y `branches`. Distinguir sucursal concreta, `TODAS` y sin asignación. |
| Usuario de acceso | `Usuario.empleadoId` | Reutilizar correo, credenciales, rol base y estado; no migrar códigos/sesiones propios como otra autenticación. |
| Datos bancarios y sueldo | `Bank`, `Empleado.numeroCuenta`, `Empleado.sueldo` | Pueden poblar una sección restringida del expediente. Nunca deben incluirse en bootstrap general ni exportaciones sin permiso explícito. |
| Metas y actividad comercial | `Empleado.metaIndividual`, `Venta` | Contexto opcional de desempeño; no mezclarlo con expediente disciplinario sin una regla aprobada. |
| Citas de facialistas | `RegistroCita` | Alimentar demanda histórica y cobertura por facialista, sucursal, fecha y servicio. No representa por sí sola asistencia ni turno asignado. |
| Permisos existentes | `PositionScreenPermission`, `PositionPayrollScreenPermission` | Reutilizar el patrón y las cuentas, pero crear una matriz HR independiente para evitar conceder acceso cruzado. |

### Datos que no existen todavía

HR requiere modelos Prisma aditivos para, al menos:

- Perfil/expediente HR complementario uno-a-uno con `Empleado`.
- Historial de estatus laboral y fechas de ingreso, baja y reingreso.
- Plantillas/versiones de turno y asignaciones por vigencia.
- Descansos fijos, temporales y excepciones diarias.
- Asignaciones diarias de sucursal/turno.
- Políticas de vacaciones versionadas, asignación por empleado, periodos de devengo y libro de movimientos de saldo.
- Tipos de permiso/ausencia, solicitudes, flujo de aprobación y adjuntos.
- Documentos y políticas internas con versiones y acuses de lectura.
- Permisos de pantalla HR por puesto y capacidad administrativa HR.
- Auditoría de cambios sensibles e importaciones.

No debe copiarse `staff` a `Empleado` fila por fila sin reconciliación. En desarrollo se necesita una estrategia de matching y reporte de conflictos por nombre/correo/sucursal antes de importar información exclusiva del prototipo.

## Límites funcionales recomendados

- `envelope` conserva el CRUD actual de empleados mientras se decide qué campos pasan a HR; ambos no deben editar el mismo campo sin un dueño explícito.
- `hr` será dueño de expediente, estatus laboral histórico, turnos, descansos, vacaciones, permisos, políticas y cobertura.
- `payroll` seguirá siendo dueño de sueldo operativo, corridas, recibos, préstamos y movimientos de nómina; HR solo lee datos sensibles autorizados.
- `scheduler` gestiona citas; HR puede leer demanda/cobertura, pero no duplicar ni modificar citas desde su calendario laboral.
- `Sucursal`, `Position`, `Empleado` y `Usuario` son catálogos compartidos, no tablas HR paralelas.

## Guía por fases para la siguiente sesión

### Fase 0 — decisiones y reconciliación

1. Definir el dueño de cada campo hoy editable en `envelope` y en el prototipo HR.
2. Definir reglas mexicanas de vacaciones, antigüedad, días naturales/hábiles, solapamientos y saldos; no conservar los modelos demo de 7/14/30 días como reglas reales.
3. Definir flujo y niveles de aprobación de solicitudes.
4. Inventariar D1 solo en un ambiente seguro, generar un reporte de coincidencias/conflictos y no importar credenciales ni hashes.
5. Definir clasificación, retención y permisos de documentos personales.

### Fase 1 — esqueleto homologado

1. Crear layout, login, guard, shell y rutas Next siguiendo `envelope`/`payroll`.
2. Añadir configuración TypeScript/Next/Tailwind del monorepo.
3. Dividir `roles-client.tsx` por rutas y dominios; eliminar el action endpoint monolítico.
4. Sustituir componentes locales por `@cosmetics/ui`, Lucide y estados de carga canónicos.
5. Retirar Vinext, Vite, Wrangler, Drizzle, D1/R2, scripts OpenAI Sites y CSS heredado solo después de preservar la referencia funcional necesaria.

### Fase 2 — identidad compartida y solo lectura

1. Crear catálogo `hr/*` en `@cosmetics/types` y permisos independientes por puesto.
2. Implementar `/api/hr/bootstrap` con selección mínima de campos según permisos.
3. Conectar directorio, cumpleaños, puestos y sucursales desde los modelos existentes.
4. Añadir vista de cobertura que combine turnos futuros con demanda histórica de `RegistroCita`, dejando clara la diferencia entre ambos datos.

### Fase 3 — persistencia HR

1. Diseñar modelos Prisma, índices y migración aditiva; sincronizar ambos schemas.
2. Implementar expediente e historial laboral.
3. Implementar turnos, descansos, excepciones y asignaciones diarias.
4. Implementar políticas/versiones de vacaciones y ledger de saldo; nunca derivar todo de solicitudes borrables.
5. Implementar permisos/ausencias con transacciones, aprobación y auditoría.
6. Implementar políticas/documentos con almacenamiento privado y URLs firmadas cuando exista el bucket.

### Fase 4 — importación y endurecimiento

1. Rediseñar la plantilla Excel con IDs/catálogos estables y validación por fila.
2. Incorporar modo dry-run: altas, actualizaciones, conflictos y rechazos antes de confirmar.
3. Hacer la importación idempotente y transaccional; registrar archivo, actor y resultado.
4. Probar aislamiento de datos sensibles, lectura/escritura, solapamientos de ausencias, concurrencia de aprobaciones y zona horaria.
5. Ejecutar pruebas de API, `type-check`, `lint` y `build` antes del despliegue.

## Riesgos que deben resolverse antes de producción

- Duplicar empleados, sucursales o puestos entre D1 y PostgreSQL.
- Exponer sueldo, cuenta, cumpleaños completo o documentos en respuestas generales.
- Usar el JSON de permisos heredado como autorización autoritativa.
- Calcular vacaciones solo sumando solicitudes sin ledger, vigencias ni reversos.
- Confundir cita programada con asistencia, turno o presencia real.
- Permitir turnos fuera del horario de sucursal sin una excepción auditable.
- Importar hashes, sesiones o códigos de acceso del prototipo.

## Criterios de aceptación de la futura refactorización

- Existe una sola identidad por empleado, puesto, sucursal y usuario.
- No quedan D1, Drizzle, R2, Wrangler, Vinext ni auth paralela en runtime.
- HR aplica permisos independientes en frontend y backend, con redacción de campos sensibles.
- Vacaciones y ausencias tienen vigencias, historial, reversos y auditoría.
- Turnos/descansos validan solapamientos y horario de sucursal.
- Importaciones ofrecen dry-run, son idempotentes y generan reporte.
- La UI consume `@cosmetics/ui` y funciona a 375, 768, 1024 y 1440 px.
- El paquete supera `type-check`, `lint` y `build` en el workspace raíz.

## Alcance de esta sesión

En esta sesión solo se renombró la carpeta, se homologó el `package.json` como contrato de arquitectura futura y se creó esta guía. No se migraron componentes, datos D1, backend, Prisma, archivos, autenticación ni estilos.
