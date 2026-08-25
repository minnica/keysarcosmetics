# Demo frontend de Nómina

Estado vigente desde el 25 de agosto de 2026. Esta fase es exclusivamente frontend y no modifica backend, Prisma, migraciones ni bases de datos.

## Fuente de datos

- `src/components/payroll/payroll-demo-context.tsx` contiene empleados, sucursales, ventas, esquemas, movimientos, préstamos, roles, corridas y conformidades mock.
- Los cambios se comparten entre todos los módulos y se guardan únicamente en `localStorage` con la clave `keysar-payroll-demo-v2`.
- **Restaurar demostración** borra el estado local de la demo y recupera los datos iniciales.
- El código anterior conectado a `/api/payroll/*` se conserva, pero ninguna ruta visible lo monta durante esta fase.

## Rutas de la demo

| Ruta | Función |
| --- | --- |
| `/` | Consolidado quincenal, autorización y pago mock |
| `/nomina-salario-fijo` | Gerencia y call center con salario fijo |
| `/nomina-especialistas` | Especialistas con salario fijo |
| `/nomina-comisiones` | Vendedores con escalas y componente variable |
| `/configuracion` | Esquemas, asignaciones, bonos fijos/por escala y multas |
| `/prestamos-adelantos` | Solicitudes, edición, autorización, saldo, cuotas e historial |
| `/accesos` | Roles, permisos y asignación de acceso por empleado |
| `/mi-nomina` | Portal aislado del empleado, ventas, bonos y conformidad |
| `/reportes/desglose-sucursal` | Métricas, dashboard y exportación PDF/Excel por sucursal |
| `/recibos` | Recibo compacto con ventas, bonos, multas y préstamos |
| `/login` | Acceso visual de demostración, sin autenticación real |

Las rutas históricas `/bonos`, `/multas`, `/esquemas`, `/movimientos`, `/gastos` y `/viaticos` redirigen funcionalmente a la configuración mock para evitar llamadas accidentales a la API.

## Reglas simuladas

- Los periodos son quincenas completas: 1–15 y 16–fin de mes.
- Vendedores calculan comisión con la escala asignada y pueden usar venta con IVA o venta dividida entre `1.16`.
- Especialistas, gerencia y call center usan sueldo mensual dividido entre dos.
- Bonos aprobados suman; multas y cuotas de préstamos aprobados descuentan.
- Un préstamo autorizado arrastra su cuota a cada periodo hasta completar sus pagos.
- Autorizar o editar movimientos y préstamos actualiza consolidado, portal, recibos y distribución por sucursal.
- El portal personal incluye un selector de identidad únicamente para demostrar varios usuarios. En una integración real ese selector no debe existir.

## Validación

```bash
pnpm --filter @cosmetics/payroll type-check
pnpm --filter @cosmetics/payroll build
```

La interfaz fue revisada a ancho de escritorio y a `375px`; el documento no genera desbordamiento horizontal y las tablas conservan scroll interno cuando es necesario.
