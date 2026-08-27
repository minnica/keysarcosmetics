# Demo frontend de Nómina

Estado vigente desde el 25 de agosto de 2026. Esta fase es exclusivamente frontend y no modifica backend, Prisma, migraciones ni bases de datos.

## Fuente de datos

- `src/components/payroll/payroll-demo-context.tsx` contiene empleados, sucursales, ventas, esquemas, movimientos, préstamos, roles, corridas y conformidades mock.
- Los cambios se comparten entre todos los módulos y se guardan únicamente en `localStorage` con la clave `keysar-payroll-demo-v10`.
- **Restaurar demostración** borra el estado local de la demo y recupera los datos iniciales.
- El código anterior conectado a `/api/payroll/*` se conserva, pero ninguna ruta visible lo monta durante esta fase.

## Rutas de la demo

| Ruta | Función |
| --- | --- |
| `/` | Consolidado quincenal, autorización y pago mock |
| `/nomina-salario-fijo` | Gerencia y call center con salario fijo |
| `/nomina-especialistas` | Especialistas con salario fijo |
| `/nomina-comisiones` | Vendedores con escalas y componente variable |
| `/calculo-comisiones` | Corrida auditable, exportaciones y excepciones de IVA por vendedor |
| `/nomina-honorarios` | Vendedores por honorarios con subtotal facturado, IVA y retenciones |
| `/configuracion` | Periodos/cortes por módulo, costos y resumen de gasto por puesto |
| `/esquemas` | Submenú independiente con tipos de esquema, rangos y vendedores asignados |
| `/bonos-multas` | Configuración, dashboard, vista diaria e historial de bonos y multas |
| `/viaticos` | Catálogo master, autorización, comprobantes, historial y costo por sucursal |
| `/movimientos` | Ajustes externos a comisión con edición, cancelación y flujo de aprobación |
| `/prestamos-adelantos` | Solicitudes, autorización, adeudo, actividad diaria e historial mensual filtrable |
| `/accesos` | Roles, permisos y asignación de acceso por empleado |
| `/mi-nomina` | Portal aislado del empleado, ventas, bonos y conformidad |
| `/reportes/desglose-sucursal` | Métricas, dashboard y exportación PDF/Excel por sucursal |
| `/recibos` | Recibo compacto con ventas, bonos, multas y préstamos |
| `/nomina-comision-kiosco` | Comisión mensual por meta de sucursal e historial anual por gerente |
| `/recibos-kiosco` | Recibo gerencial separado, restringido a la sucursal de la sesión activa |
| `/login` | Acceso visual de demostración, sin autenticación real |

Las rutas históricas `/bonos` y `/multas` montan el nuevo módulo independiente; `/gastos` conserva la configuración mock. `/esquemas` y `/viaticos` montan sus propios módulos.

## Reglas simuladas

- Cada módulo tiene un único periodo visible y corte editable exclusivamente desde Configuración: semanal de lunes a domingo, quincenal 1–15/16–fin de mes o especial.
- Salario fijo, especialistas, comisiones y honorarios permiten visualizar y calcular por quincena o por mes, con selector de periodos históricos mock.
- La base `CON IVA` / `SIN IVA` se administra desde Comisiones y se sincroniza con consolidado, honorarios, portal personal, recibos, reportes y resúmenes de gasto.
- Cálculo de comisiones permite sobrescribir la base global para un vendedor; esa excepción actualiza su escala, porcentaje, comisión, pago, recibo y participación en reportes sin afectar a los demás empleados.
- Si un vendedor no tiene esquema vigente para el periodo elegido, Cálculo de comisiones muestra una alerta y el detalle de los empleados pendientes.
- La vista mensual consolida ventas, movimientos y viáticos de ambas quincenas y usa el salario mensual exacto configurado.
- Cambiar un periodo afecta solo ese módulo; las corridas históricas de otros periodos y nóminas no se reescriben.
- El portal personal muestra importes únicamente si el módulo del empleado tiene un periodo activo y una corrida coincidente.
- Vendedores calculan comisión con la escala asignada y pueden usar venta con IVA o venta dividida entre `1.16`.
- Honorarios calcula subtotal de servicio, IVA 16%, retención ISR 10%, retención IVA 10.6667% y neto a pagar con datos mock.
- Especialistas, gerencia y call center usan sueldo mensual dividido entre dos.
- Todas las nóminas muestran nómina, costo social, ISR y costo total; las tasas se configuran por empleado.
- Cada submenu de nómina termina con métricas, gráfica de dispersión y detalle automático de costo por sucursal.
- Bonos aprobados suman; multas y cuotas de préstamos aprobados descuentan.
- Los movimientos externos admiten ajuste de más, ajuste de menos, multa, bono, préstamo, pago de préstamo y sueldo base; pasan de borrador a solicitud y aprobación.
- Cada movimiento externo elige tipo de nómina, corrida/periodo destino, sucursal responsable y los reportes que afectará.
- Las multas compartidas dividen el importe entre todos los participantes seleccionados y conservan la sucursal donde se originaron.
- Editar devuelve el movimiento a borrador; cancelar un movimiento aprobado retira su efecto de todos los cálculos en tiempo real.
- Un préstamo autorizado arrastra su cuota a cada periodo hasta completar sus pagos.
- El adeudo aparece en el perfil personal y el módulo de préstamos permite consultar actividad por día, mes y empleado.
- Autorizar o editar movimientos y préstamos actualiza consolidado, portal, recibos y distribución por sucursal.
- Las metas, ventas históricas y recibos de comisión de kiosco son mocks locales; cada gerente solo puede consultar el recibo mensual de su punto de venta.
- El portal personal aparece separado de Operación, inmediatamente arriba del pie del menú, y solo si el rol del usuario activo incluye `portal.view`.
- La identidad del portal se elige desde Roles y accesos; dentro del portal no existe un selector para consultar información de otro empleado.
- Esquemas de comisión mantiene un catálogo de tipos/rangos y un registro de vendedores y prestadores por honorarios asignados.
- Cada asignación de esquema registra `vigente desde`; cambiar un vendedor crea una nueva vigencia y el cálculo recupera el esquema correspondiente a cada periodo sin reescribir nóminas anteriores.
- El módulo de esquemas incluye dashboard de distribución vigente e historial completo de asignaciones; solo las vigencias del periodo activo o futuras pueden editarse.
- Bonos y multas tiene historial completo, filtro exclusivo del día y acciones de aceptar, cancelar, modificar y aprobar; las modificaciones se habilitan únicamente en la sesión `USUARIO MASTER`.
- El usuario master configura conceptos de viáticos, habilita a cada vendedor desde la asignación de esquema y autoriza cada comprobante eligiendo la nómina destino.
- El empleado habilitado captura únicamente conceptos permitidos desde su portal; el botón se oculta cuando el switch de viáticos está desactivado.
- Los viáticos aprobados suman o restan según su concepto y se reflejan en nómina, recibo e historial vigente; la sucursal seleccionada recibe el costo en reportes.

## Validación

```bash
pnpm --filter @cosmetics/payroll type-check
pnpm --filter @cosmetics/payroll build
```

La interfaz fue revisada a ancho de escritorio y a `375px`; el documento no genera desbordamiento horizontal y las tablas conservan scroll interno cuando es necesario.
