# Análisis y guía de refactorización de Finance

## Decisión de nombre

La carpeta debe llamarse `apps/finance` y el paquete `@cosmetics/finance`.

El prototipo se presenta como **VAM Control — Rentas y pagos**, pero su alcance real es más amplio: administra sucursales/unidades, rentas, servicios, pagos, ventas y gastos, estados financieros, financiamientos, socios, participaciones, aportaciones, proyecciones, accesos y reportes. `finance` expresa el límite funcional completo y evita reducir el producto a rentas o inmuebles.

Nombre visible sugerido: **Keysar Finance** o **Control financiero**.

## Diagnóstico del prototipo recibido

- React 19 + Vite 7 en JavaScript, sin TypeScript ni validación de contratos.
- Navegación por hash y una sola raíz de estado.
- Persistencia exclusivamente en `localStorage` bajo `vam-control-data-v1`.
- Catálogos, cálculos y permisos simulados en cliente.
- Duplicación de datos que ya existen en la plataforma: sucursales, ventas, usuarios y algunos gastos.
- Componentes y estilos locales que no consumen `@cosmetics/ui`.
- Archivos de workspace, lockfile, artefactos `dist/`, service worker y PWA propios de un repositorio independiente.
- No hay API, autorización autoritativa, auditoría, transacciones, snapshots contables ni pruebas de reglas financieras.

El prototipo sí es útil como inventario funcional y referencia de flujos, pero no debe conservarse como base arquitectónica de producción.

## Arquitectura objetivo

Finance debe homologarse con las aplicaciones web internas existentes:

- Monorepo: pnpm workspaces + Turborepo desde la raíz.
- Frontend: Next.js 14.2.4, App Router, React 18.3, TypeScript strict.
- Formularios: React Hook Form + Zod.
- UI: Tailwind CSS 3 y componentes exclusivamente desde `@cosmetics/ui`.
- Iconos: `lucide-react`; no conservar glifos usados como iconos.
- Datos: `@cosmetics/api-client` contra `backend/api`.
- Autenticación: JWT compartido mediante `@cosmetics/auth`; no crear usuarios locales.
- Backend: un módulo `/api/finance/*` dentro del Express compartido.
- Persistencia: Prisma + PostgreSQL en el Supabase existente.
- Exportaciones: datasets agregados de backend; `jsPDF`, `jspdf-autotable` y `xlsx` con imports dinámicos.
- Gráficas: Recharts sobre agregados entregados por backend.
- Deploy: Vercel para la app y Fly.io para la API compartida.

No se recomienda crear una API de Next.js, otra base, otro proveedor de autenticación ni un segundo catálogo de sucursales.

## Comandos y puerto reservados

Puerto de desarrollo y `start`: `3006`.

```bash
pnpm --filter @cosmetics/finance dev
pnpm --filter @cosmetics/finance type-check
pnpm --filter @cosmetics/finance lint
pnpm --filter @cosmetics/finance build
pnpm --filter @cosmetics/finance start
```

El `package.json` ya declara estos comandos y el stack objetivo. No se espera que el código heredado compile con el nuevo manifiesto hasta realizar la refactorización descrita aquí.

## Datos existentes que debe reutilizar

| Necesidad de Finance | Fuente existente | Uso recomendado |
| --- | --- | --- |
| Sucursales/unidades | `Sucursal` | Poblar selectores, directorio, estatus y relaciones. Usar `id`, `nombre`, `activa`, `desactivadaEn` y `metaMensual`; no crear `units` paralelas. |
| Ventas por fecha y sucursal | `Venta` + `VentaDetalle` | Alimentar ingresos, comparativos, estado por sucursal, histórico mensual y proyecciones. No volver a capturar una “Venta” manual en Finance. |
| Métodos e importes de cobro de ventas | `MetodoPago` + `VentaDetalle` | Reportes de composición del ingreso. No asumir que el catálogo de cobro equivale automáticamente a métodos de pago de obligaciones. |
| Gastos operativos ya registrados | `PayrollExpense`, `PayrollExpenseCategory`, `PayrollExpenseRecurrenceVersion` | Leerlos para consolidación financiera con su sucursal/centro de costo. Evitar duplicar cargos que ya estén materializados. |
| Costo de nómina por sucursal | `PayrollRun`, `PayrollRunBranchLine` | Incorporar únicamente snapshots con el estado contable que se defina (recomendado: `APPROVED` y `PAID`), nunca recalcular desde el cliente. |
| Usuarios y sesión | `Usuario` | Reutilizar credenciales, estado activo y vínculo opcional con empleado. Eliminar el catálogo `accessUsers` local. |
| Puestos y alcance | `Position`, permisos por pantalla existentes como patrón | Crear permisos propios de Finance por puesto; no reutilizar semánticamente los permisos de Envelope o Payroll. |
| Personas internas | `Empleado` | Puede poblar responsables de pago o captura cuando sean trabajadores. No mezclar automáticamente empleados con socios. |
| Bancos | `Bank` | Catálogo de referencia cuando una cuenta de pago/financiamiento requiera banco; las cuentas corporativas necesitan un modelo propio. |

### Datos que no existen todavía

Finance necesita modelos propios y aditivos para, al menos:

- Contratos de arrendamiento y sus versiones/vigencias.
- Cargos de renta por periodo, vencimiento, estatus y sucursal.
- Pagos y aplicaciones parciales a uno o varios cargos.
- Catálogo de servicios y contratos de servicio por sucursal.
- Financiamientos, calendario de amortización y pagos.
- Socios, participación versionada por sucursal y vigencia.
- Aportaciones/distribuciones de socios con trazabilidad.
- Ajustes financieros manuales que no sean venta ni gasto ya registrado.
- Permisos de pantalla propios y eventos de auditoría.

Los nombres definitivos deben seguir el idioma inglés en código. Las migraciones deberán ser aditivas y actualizar ambos schemas Prisma mientras exista el duplicado histórico.

## Límites funcionales recomendados

- `envelope` sigue siendo dueño de ventas, sucursales y sus catálogos operativos.
- `payroll` sigue siendo dueño de corridas, movimientos y gastos de nómina.
- `finance` consume ambos dominios para consolidar resultados y es dueño de rentas, servicios financieros, deuda y capital de socios.
- Los reportes financieros deben agregarse en SQL/backend; el navegador no debe descargar ventas crudas para calcular estados.
- Una proyección debe guardar método, parámetros y fecha de generación si se usará para decisiones; el promedio actual del prototipo solo sirve como referencia visual.

## Guía por fases para la siguiente sesión

### Fase 0 — preservar referencia y cerrar contratos

1. Confirmar con negocio si “aportación” aumenta capital, descuenta utilidad o puede representar ambos movimientos.
2. Definir estatus contables de rentas, financiamientos, pagos y periodos cerrados.
3. Definir si Finance mostrará Payroll en borrador o solo corridas aprobadas/pagadas.
4. Inventariar los datos del prototipo que sean reales antes de retirar `localStorage`; no importar los seeds automáticamente.

### Fase 1 — esqueleto homologado

**Estado de esta sesión: completada para frontend mock.** Finance ya usa el esqueleto Next.js/TypeScript descrito abajo. Se omitió deliberadamente la pantalla de login para que la demo entre directamente al shell; la autenticación compartida queda pendiente de la Fase 2.

1. [x] Crear `src/app`, root layout y shell siguiendo el patrón canónico de las apps homologadas. El acceso inicia directamente en el dashboard mock, sin login.
2. [x] Añadir `tsconfig.json`, `next.config.mjs`, PostCSS y Tailwind equivalentes al monorepo.
3. [x] Migrar fuentes, tokens, tema claro/oscuro, sidebar, responsive layout y estados vacíos.
4. [x] Eliminar `src/components/UI.jsx` y `styles.css` monolítico; los componentes visuales viven en la superficie TypeScript de la app.
5. [x] Retirar `index.html`, Vite, service worker, manifest PWA y workspace anidado. El lockfile heredado se conserva temporalmente como referencia y debe retirarse en la limpieza de workspace.

**Pendiente:** instalar dependencias cuando haya acceso al registry y ejecutar `type-check`, `lint` y `build` desde el workspace raíz.

### Fase 2 — auth, permisos y datos de solo lectura

1. Añadir claves `finance/*` en `@cosmetics/types` y un catálogo de rutas en la app.
2. Implementar guard de frontend y validación autoritativa en `/api/finance/*`.
3. Conectar sucursales, ventas, gastos y costos de nómina existentes.
4. Entregar dashboard, estado financiero y proyecciones primero como vistas de solo lectura.

### Fase 3 — persistencia propia

1. Diseñar modelos Prisma, índices, constraints monetarios y migración aditiva.
2. Implementar rentas/cargos/pagos con transacciones y aplicaciones parciales.
3. Implementar servicios por sucursal sin duplicar gastos existentes.
4. Implementar financiamientos y amortización con snapshots de condiciones.
5. Implementar socios, participaciones versionadas y aportaciones/distribuciones.
6. Registrar auditoría de altas, cambios de estatus, aplicaciones y cierres.

### Fase 4 — reportes y endurecimiento

1. Sustituir cálculos de React por endpoints agregados.
2. Exportar el mismo dataset visible a PDF/Excel mediante imports dinámicos.
3. Validar moneda, zona `America/Mexico_City`, redondeos, periodos cerrados e idempotencia.
4. Probar permisos, concurrencia de pagos, reintentos y consistencia de saldos.
5. Ejecutar `type-check`, `lint`, `build` y pruebas de API antes del despliegue.

## Criterios de aceptación de la futura refactorización

- No queda persistencia operativa en `localStorage`.
- Sucursales, ventas, usuarios y empleados no se duplican.
- Todos los cálculos financieros autoritativos viven en backend y tienen pruebas.
- Pagos y cambios de estado son transaccionales y auditables.
- La app usa sesión/permisos compartidos y `@cosmetics/ui`.
- Funciona sin scroll horizontal a 375, 768, 1024 y 1440 px.
- Los reportes visibles y exportados se construyen desde el mismo agregado.
- El paquete supera `type-check`, `lint` y `build` dentro del workspace raíz.

## Alcance de esta sesión

- [x] Migración del frontend heredado Vite a Next.js App Router + TypeScript strict.
- [x] Shell visual con navegación de las áreas funcionales, responsive, modo claro/oscuro y componentes Lucide.
- [x] Dashboard mock con métricas, gráfica, estado por sucursal, actividad reciente y búsqueda/alta mock de sucursales.
- [x] Eliminación del login local y de toda persistencia operativa en `localStorage`.
- [x] Eliminación de backend/BD, API routes, Prisma y autenticación paralela del alcance de esta sesión.
- [ ] Fase 0: decisiones de negocio y validación de datos reales.
- [ ] Fase 2: sesión JWT, permisos y datos de solo lectura desde API compartida.
- [ ] Fase 3: modelos Prisma y persistencia propia.
- [ ] Fase 4: reportes agregados, exportaciones y endurecimiento.

La guía debe permanecer en el repositorio porque todavía quedan las fases de backend, autenticación, persistencia y validación por ejecutar.
