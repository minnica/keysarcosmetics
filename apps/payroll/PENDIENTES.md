# Payroll — pendientes de habilitación y decisiones acordadas

Última actualización: 22 de agosto de 2026.

Este documento registra lo que falta para habilitar Payroll por ambiente y consolida las preguntas y respuestas acordadas durante la planeación. No contiene contraseñas, tokens, URLs privadas ni valores de producción.

## Estado actual

La implementación de aplicación, API, modelos y migración está terminada. Los mocks de `apps/payroll` fueron eliminados. También están implementados:

- Autenticación real y acceso por pantalla/puesto; `SUPER_ADMIN` conserva acceso total.
- Control de accesos independiente de Envelope desde `/accesos`, con protección equivalente en frontend y backend.
- Lectura de empleados, bancos, puestos, sucursales y ventas existentes.
- Catálogos, esquemas versionados y asignaciones con vigencia.
- Reactivación de esquemas desactivados al volver a capturar el mismo nombre, conservando sus versiones y asignaciones históricas.
- Movimientos, gastos, préstamos y cuotas quincenales.
- Gastos recurrentes mensuales/quincenales con versiones por vigencia y ocurrencias automáticas por periodo.
- Normalización de cualquier fecha elegida para la primera quincena de cobro al inicio canónico del periodo, día 1 o 16.
- Corridas `DRAFT → APPROVED → PAID`, cancelación previa al pago y snapshots.
- Resumen mensual calculado que consolida las dos corridas quincenales sin exigir que estén pagadas.
- Reporte por sucursal basado en la sucursal real de cada venta, exportaciones, recibos PDF y seguimiento de WhatsApp.
- Backend `/api/payroll/*`, pruebas del motor y migración Prisma aditiva.

Las migraciones están preparadas, pero no se han aplicado a ninguna base productiva desde esta implementación.

## Pendientes obligatorios

### 1. Aplicar la migración primero en desarrollo

Archivos, en orden:

```text
backend/api/prisma/migrations/20260730000000_add_payroll_models/migration.sql
backend/api/prisma/migrations/20260731000000_add_employee_branch/migration.sql
backend/api/prisma/migrations/20260801000000_add_employee_all_branches/migration.sql
backend/api/prisma/migrations/20260813010000_add_recurring_payroll_expenses/migration.sql
backend/api/prisma/migrations/20260813020000_add_payroll_expense_categories/migration.sql
backend/api/prisma/migrations/20260813030000_link_payroll_expense_categories/migration.sql
backend/api/prisma/migrations/20260822000000_add_payroll_access_control/migration.sql
```

Antes de ejecutar:

1. Confirmar que `DATABASE_URL` y `DIRECT_URL` corresponden a Supabase de desarrollo.
2. Consultar el estado con `prisma migrate status`.
3. Revisar que no haya otra migración pendiente ajena a Payroll.
4. Ejecutar `prisma migrate deploy` desde `backend/api`.
5. No usar `prisma db push`, `prisma migrate reset` ni el seed general.

Qué solventa:

- Crea las tablas, enums, índices, relaciones y restricciones de Payroll.
- Agrega la relación nullable `Empleado.sucursalId` sin modificar los empleados existentes.
- Agrega `Empleado.todasSucursales` para distinguir `TODAS` de `Sin sucursal asignada`; los registros existentes conservan `false`.
- Agrega series y versiones de gastos recurrentes sin convertir los gastos históricos existentes.
- Crea el catálogo de categorías de gasto y recupera automáticamente las categorías históricas ya capturadas.
- Vincula ocurrencias y versiones al catálogo manteniendo el nombre histórico dentro de cada gasto.
- Agrega `Position.canManagePayrollAccess` y permisos de pantallas de Payroll por puesto sin modificar los permisos de Envelope.
- Permite que `/api/payroll/*` persista catálogos, movimientos, corridas, préstamos y recibos.
- Sin este paso, el frontend puede cargar, pero las llamadas de Payroll fallarán porque las tablas todavía no existen.

### 2. Desplegar el backend de desarrollo

Aplicación Fly.io:

```text
cosmetics-api-dev
```

Debe desplegarse después de las migraciones para publicar las rutas y el cliente Prisma nuevos.

Qué solventa:

- Expone `/api/payroll/*` al frontend Preview.
- Activa el motor de cálculo, permisos, snapshots y transiciones de corrida.
- Mantiene la lectura de Envelope desde el mismo backend sin modificar `apps/envelope`.

### 3. Confirmar la conexión del frontend de desarrollo

En Vercel Preview, `apps/payroll` debe tener:

```text
NEXT_PUBLIC_API_URL=https://cosmetics-api-dev.fly.dev
```

Esta variable es pública y solo señala la URL de la API. No debe contener claves de Supabase.

Qué solventa:

- Evita que el frontend desplegado intente conectarse a `localhost:4000`.
- Asegura que las pruebas de Payroll utilicen el backend y la BD de desarrollo.

### 4. Capturar la configuración inicial de negocio

Los catálogos empiezan vacíos deliberadamente. Un `SUPER_ADMIN` o un puesto con las pantallas correspondientes deberá capturar desde la UI:

1. Bonos, multas y viáticos autorizados.
2. Esquemas de comisión y rangos.
3. Asignaciones de esquema por empleado.
4. Gastos, préstamos o movimientos vigentes, si aplican.

Qué solventa:

- Evita insertar datos de prueba o asumir reglas económicas no autorizadas.
- Permite que los empleados con ventas tengan un esquema válido antes de aprobar una corrida.

### 5. Completar datos operativos de empleados

Antes del primer pago real debe revisarse en Envelope la información de los empleados que participarán en nómina:

- Sueldo mensual.
- Banco.
- Número de cuenta.
- Teléfono para WhatsApp.
- Sucursal laboral, como dato informativo y de seguimiento; no interviene en el cálculo del desglose.
- Puesto y estatus activo/inactivo.

Efectos de datos faltantes:

| Dato faltante            | Comportamiento                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Sueldo                   | Se calcula como `$0` y se muestra una advertencia.                                            |
| Esquema/rango con ventas | Bloquea la aprobación.                                                                        |
| Banco                    | Bloquea marcar la corrida como pagada.                                                        |
| Cuenta bancaria          | Bloquea marcar la corrida como pagada.                                                        |
| Teléfono                 | Solo bloquea preparar el envío por WhatsApp.                                                  |
| Sucursal laboral         | Resumen muestra una advertencia informativa; no cambia el cálculo ni el reporte por sucursal. |

La revisión agregada realizada el 30 de julio de 2026 encontró 54 empleados activos: 31 sin sueldo, 51 sin teléfono, 2 sin banco y 9 con cuenta vacía. Son cifras de referencia y pueden cambiar; deben verificarse nuevamente antes del primer ciclo productivo. De los empleados activos con ventas recientes, 28 no tenían sueldo capturado.

### 6. Ejecutar pruebas de aceptación en desarrollo

Flujo mínimo recomendado:

1. Iniciar sesión como `SUPER_ADMIN`.
2. Desde `/accesos`, asignar un subconjunto de pantallas a un puesto con una cuenta activa y comprobar sidebar, redirección y respuestas `403` en pantallas denegadas.
3. Crear un esquema y asignarlo a un empleado con ventas.
4. Crear y aprobar un bono o ajuste.
5. Crear un préstamo de prueba y verificar sus quincenas.
6. Crear una corrida de una quincena completa.
7. Comparar ventas contra Envelope.
8. Revisar cálculo con IVA y sin IVA.
9. Confirmar reparto por sucursal y centavos.
10. Aprobar la corrida y confirmar que queda congelada.
11. Verificar bloqueos por banco/cuenta antes de pagar.
12. Marcar pagada y generar recibos.
13. Descargar PDF/Excel y revisar el desglose por sucursal.
14. Cancelar una corrida distinta antes de pagar y confirmar que libera reservas.

Qué solventa:

- Valida la integración completa con datos representativos sin arriesgar producción.
- Permite comparar resultados contra la operación actual antes de autorizar pagos.

### 7. Aplicar y desplegar en producción

Solo después de aprobar desarrollo:

1. Confirmar respaldo/PITR de Supabase producción.
2. Verificar explícitamente las URLs de conexión productivas.
3. Ejecutar `prisma migrate status`.
4. Aplicar `prisma migrate deploy`.
5. Desplegar `cosmetics-api`.
6. Desplegar `apps/payroll` en Vercel Production.
7. Ejecutar una corrida paralela de verificación antes de reemplazar el proceso actual.

Qué solventa:

- Habilita las tablas y API de Payroll en producción sin alterar registros existentes de ventas o empleados.
- La migración es aditiva: no elimina ni transforma datos actuales de Envelope.

## Pendiente pospuesto: comprobantes en Supabase Storage

Este paso puede posponerse. Mientras no se configure:

- Funcionan empleados, ventas, catálogos, esquemas, movimientos sin evidencia, gastos, préstamos, corridas, reportes, PDF, Excel, recibos y WhatsApp.
- Viáticos e insumos pueden guardarse como pendientes, pero no pueden aprobarse sin comprobante.
- Conviene no registrar todavía `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY` en Fly.io. Si se registran sin que exista el bucket, la interfaz habilitará archivos, pero las cargas fallarán.

### Cómo habilitarlo después

En cada proyecto Supabase —primero desarrollo y después producción— crear un bucket:

```text
Nombre: payroll-attachments
Público: no
Tamaño máximo: 10 MB
MIME: image/jpeg, image/png, application/pdf
```

Después agregar al backend correspondiente de Fly.io:

| Secret                      | Valor esperado                                            |
| --------------------------- | --------------------------------------------------------- |
| `SUPABASE_URL`              | URL HTTPS del proyecto: `https://PROJECT-REF.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key de backend con formato `sb_secret_...`         |
| `PAYROLL_STORAGE_BUCKET`    | `payroll-attachments`                                     |

No confundir:

- `SUPABASE_URL` no es `DATABASE_URL` ni `DIRECT_URL`.
- `SUPABASE_URL` no es una clave `sb_publishable_...`.
- La Secret key nunca debe colocarse en Vercel, en `NEXT_PUBLIC_*` ni en el repositorio.

Qué solventa:

- Guarda comprobantes JPG, PNG y PDF en un contenedor privado.
- Permite aprobar viáticos e insumos con evidencia.
- El backend entrega enlaces firmados temporales; no hace públicos los archivos.

## Preguntas y respuestas acordadas en el modo plan

### Alcance y arquitectura

**¿Dónde debe vivir Payroll?**  
En `apps/payroll`, usando `/api/payroll/*` y modelos Prisma dentro del backend compartido.

**¿Se debe modificar `apps/envelope`?**  
No. Payroll consume sus fuentes existentes, pero la UI y los cambios funcionales son exclusivos de Payroll.

**¿Se debe crear una BD separada?**  
No. Se agregan tablas Payroll a PostgreSQL mediante una migración aditiva y relaciones con los modelos existentes.

**¿Se puede ejecutar la migración directamente en producción?**  
No durante la implementación. Se prepara y versiona; debe probarse primero en desarrollo y ejecutarse manualmente con respaldo y revisión.

### Autenticación y permisos

**¿Quién puede entrar a Payroll?**  
Únicamente usuarios con rol `SUPER_ADMIN`, tanto en frontend como en backend.

**¿Payroll tendrá permisos por pantalla como Envelope?**  
No en esta primera implementación. Se acordó un guard global de `SUPER_ADMIN` por la sensibilidad de la nómina.

### Datos compartidos con Envelope

**¿Qué datos se reutilizan?**  
`Empleado`, `Bank`, `Position`, `Sucursal`, `Venta` y `VentaDetalle`.

**¿Payroll puede cambiar esos registros?**  
No. Los consume en lectura; la administración de empleados, bancos, puestos, sucursales y ventas permanece en Envelope.

**¿Cuál es la sucursal laboral del empleado?**

`Empleado.sucursalId` y `Empleado.todasSucursales`, administrados desde el formulario de empleados de Envelope. Permiten distinguir una sucursal concreta, la selección explícita `TODAS` y `Sin sucursal asignada`. Se mantienen como datos informativos: no definen la sucursal de las ventas ni intervienen en el desglose de Payroll.

**¿Qué ocurre con empleados inactivos?**  
Se conservan en históricos y pueden entrar en una corrida si tuvieron actividad dentro del periodo. No aparecen para nuevas asignaciones operativas.

### Periodos, sueldo y ventas

**¿Qué periodos son válidos?**  
Solo quincenas completas: del 1 al 15 o del 16 al último día del mismo mes.

**¿Puedo calcular una quincena anterior?**
Sí. En **Resumen → Quincenal**, el selector **Quincena** ofrece los últimos 12 meses, agrupados por mes para distinguir con rapidez la primera y segunda quincena. Si el periodo ya tiene una corrida, la abre y muestra su estado; si está vacío, permite crear un borrador histórico. Una corrida existente no cambia de periodo y no se duplica. La vista mensual usa el mismo límite de 12 meses.

**¿El consolidado mensual crea una corrida adicional?**
No. Es un reporte derivado que suma los snapshots de las corridas no canceladas del 1–15 y 16–fin de mes. Cuando una quincena pasada no tiene corrida, calcula una estimación temporal sin guardar snapshots, reservar conceptos ni generar auditoría. Las corridas siguen siendo exclusivamente quincenales.

**¿La nómina mensual solo aparece cuando ambas corridas están pagadas?**
No. La vista mensual usa cualquier corrida `DRAFT`, `APPROVED` o `PAID` disponible; las corridas `CANCELED` no participan. Si una quincena ya terminó y no tuvo corrida, muestra la **nómina mensual aproximada** e identifica el periodo como `ESTIMADA`. La cifra usa los datos históricos y la configuración disponible, pero no sustituye una corrida: para validar y congelar el resultado debe crearse la corrida histórica. Una quincena vigente sin corrida todavía se muestra como faltante. Si incluye un borrador, también avisa que el monto puede cambiar al recalcular.

**¿Se recalcula la comisión usando todas las ventas del mes?**
No. La comisión conserva su cálculo quincenal y el resumen mensual suma los importes congelados o calculados de cada quincena. Así se respetan rangos, esquemas y vigencias distintos dentro del mismo mes.

**¿Cómo se calcula el sueldo quincenal?**  
`sueldo mensual / 2` en ambas quincenas.

**¿Qué pasa si el sueldo está vacío?**  
Se usa `$0` y se genera una advertencia, pero por sí solo no bloquea la aprobación.

**¿De dónde salen las ventas?**  
De la suma de `VentaDetalle.cantidad`, filtrada por fecha, vendedor y sucursal de `Venta`.

### IVA y comisión

**¿Qué significa calcular con IVA?**  
La base de comisión es la venta bruta registrada.

**¿Qué significa calcular sin IVA?**  
La base es `venta bruta / 1.16`.

**¿El rango se selecciona con una base y la comisión se calcula con otra?**  
No. La misma base seleccionada —con IVA o sin IVA— sirve para encontrar el rango y para multiplicar por la tasa.

**¿Cómo funcionan los rangos?**  
Inician en cero, son continuos, no se traslapan y el último queda sin límite superior. Los límites intermedios avanzan por centavos.

**¿Qué ocurre si un empleado tiene ventas pero no esquema o rango válido?**  
La corrida puede calcularse como borrador, pero no puede aprobarse.

**¿Cuándo aplica un cambio de esquema?**  
Para un empleado o esquema ya vigente, desde la siguiente quincena. Las versiones anteriores se conservan.

### Distribución por sucursal

**¿Cómo se agrupan sueldo, comisión, préstamo y ventas cuando un empleado vende en varias sucursales?**
Las ventas permanecen en la sucursal donde fueron registradas. Sueldo, comisión y préstamo se reparten proporcionalmente según las ventas del empleado en cada sucursal durante la quincena.

**¿Cómo se manejan los centavos residuales?**  
El motor redondea cada asignación a centavos y coloca la diferencia residual en la última sucursal para que la suma coincida exactamente con el total del empleado.

**¿Cuándo se refleja esta distribución en una corrida existente?**
Al presionar **Recalcular** si la corrida sigue en `DRAFT`. Las corridas `APPROVED` o `PAID` conservan su snapshot histórico y no se modifican automáticamente.

**¿Qué pasa si el empleado no tiene sucursal laboral asignada?**
Resumen muestra un pendiente informativo para corregir el catálogo en Envelope, pero la corrida y el reporte siguen usando las sucursales reales de sus ventas. Si no tuvo ventas, sueldo, comisión y préstamo se asignan a `CORPORATIVO`.

Si el empleado tiene seleccionada la opción `TODAS`, se considera que su asignación laboral está configurada y no aparece ese pendiente. Esta opción tampoco cambia la distribución del cálculo por las sucursales reales de las ventas.

**¿Cómo se asigna la sucursal de los movimientos?**
Cada reparto captura empleado, sucursal o `CORPORATIVO`, monto y si es pagable. Esa selección propia del movimiento alimenta el desglose y no se deriva de `Empleado.sucursalId`.

### Catálogos y movimientos

**¿Se deben insertar catálogos o esquemas de ejemplo?**  
No. Bonos, multas, viáticos y esquemas comienzan vacíos para evitar confundir mocks con reglas autorizadas.

**¿Un movimiento puede compartirse?**  
Sí, entre una y cinco personas, con montos editables. La suma debe coincidir exactamente con el total y no puede repetirse un empleado.

**¿Qué estados tiene un movimiento?**  
`PENDING`, `APPROVED` y `REJECTED`. Solo los aprobados entran en una corrida.

**¿Cuándo se exige comprobante?**  
Antes de aprobar viáticos e insumos.

### Gastos

**¿Los gastos mensuales o quincenales se generan automáticamente?**  
No. Cada registro es una ocurrencia con fecha; la frecuencia es informativa.

**¿Cómo afectan la nómina?**  
Se descuentan del balance general de la corrida cuya quincena contiene la fecha del gasto.

**¿Pueden editarse después de aprobar una corrida?**  
No. Al aprobarse quedan ligados a la corrida y congelados.

### Préstamos y adelantos

**¿Qué pasa si selecciono un día intermedio o el último día de la primera quincena de cobro?**
La interfaz identifica la quincena que contiene la fecha y guarda su inicio canónico. Del día 1 al 15 usa el día 1; del día 16 al cierre del mes usa el día 16. Así se genera siempre una secuencia de periodos completos.

**¿Cómo se crean las cuotas?**  
Automáticamente en quincenas consecutivas a partir de una fecha inicial día 1 o 16.

**¿Qué ocurre si el monto no divide exactamente?**  
El último pago absorbe el ajuste de centavos.

**¿Cuándo se descuenta y liquida una cuota?**  
Se reserva al aprobar la corrida y se marca pagada al pagarla.

**¿Se puede borrar el historial?**  
No. Los préstamos se liquidan, cancelan o marcan perdidos conservando sus registros.

### Ciclo de corridas

**¿Cuál es el ciclo de vida?**  
`DRAFT → APPROVED → PAID`. Una corrida puede cancelarse antes de quedar pagada.

**¿Qué hace aprobar?**  
Valida bloqueos, congela los snapshots y reserva movimientos, gastos y cuotas.

**¿Qué hace pagar?**  
Valida banco/cuenta, aplica las cuotas, actualiza saldos y genera recibos.

**¿Una corrida pagada puede recalcularse o cancelarse?**  
No.

**¿Qué pasa si el pago total de un empleado es negativo?**  
Bloquea la aprobación para que las deducciones se revisen manualmente.

### Recibos y WhatsApp

**¿De dónde salen los recibos?**  
Del snapshot de una corrida marcada como pagada.

**¿WhatsApp adjunta automáticamente el PDF?**  
No. Se descarga el PDF, se abre `wa.me` con el mensaje preparado y el archivo se adjunta manualmente.

**¿Qué estados se registran?**  
`GENERATED`, `SENT` y `CONFIRMED`.

**¿El teléfono faltante bloquea pagar?**  
No. Solo impide preparar WhatsApp para ese empleado.

## Checklist resumido

- [ ] Aplicar migración en Supabase desarrollo.
- [ ] Desplegar `cosmetics-api-dev`.
- [ ] Verificar `NEXT_PUBLIC_API_URL` del Preview de Payroll.
- [ ] Capturar catálogos, esquemas y asignaciones iniciales.
- [ ] Revisar datos faltantes de empleados; la sucursal laboral pendiente es informativa y no bloquea el cálculo ni el pago.
- [ ] Ejecutar pruebas de aceptación completas en desarrollo.
- [ ] Aprobar resultados contra el proceso actual.
- [ ] Aplicar migración y desplegar backend/frontend en producción.
- [ ] Ejecutar una corrida paralela antes del primer pago oficial.
- [ ] Más adelante: crear bucket privado y configurar secretos de Storage.
