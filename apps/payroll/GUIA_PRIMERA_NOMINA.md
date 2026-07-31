# Guía para configurar y revisar la primera nómina

Esta guía explica qué debe capturar un usuario `SUPER_ADMIN` cuando Payroll está vacío y cómo recorrer el flujo completo de una nómina. Está dirigida a operación; no incluye despliegues, migraciones ni configuración técnica.

## Antes de comenzar

Payroll toma empleados y ventas de Envelope. No es necesario volver a capturarlos en Nómina.

Para probar el flujo correctamente se necesita:

- Una cuenta con rol `SUPER_ADMIN`.
- Al menos un empleado con ventas dentro de la quincena que se revisará.
- Sueldo, banco, cuenta bancaria y sucursal laboral capturados para ese empleado.
- Un esquema de comisión y una asignación vigente.

El teléfono solo es necesario para preparar el mensaje de WhatsApp; no afecta el cálculo ni la aprobación.

> Recomendación: hacer el primer recorrido con una quincena cerrada cuyos importes puedan compararse contra Envelope y contra el proceso actual de Excel.

## Orden recomendado de captura

1. Revisar empleados y ventas en Envelope.
2. Crear esquemas de comisión.
3. Asignar esquemas a empleados.
4. Crear catálogos de bonos, multas y viáticos.
5. Registrar y aprobar movimientos del periodo.
6. Registrar gastos del periodo.
7. Registrar préstamos o adelantos, si existen.
8. Crear y revisar la corrida.
9. Corregir advertencias o bloqueos.
10. Aprobar la corrida.
11. Marcarla como pagada.
12. Descargar reportes y recibos.

## 1. Revisar empleados y ventas en Envelope

Antes de entrar a Payroll, revisar en Envelope:

### Empleado

Para cada empleado que participará en la nómina, confirmar:

- Nombre completo correcto.
- Estatus activo, si continúa trabajando.
- Puesto.
- Sucursal laboral.
- Sueldo mensual.
- Banco.
- Número de cuenta.
- Teléfono, si se usará WhatsApp.

Payroll usa esos datos en modo lectura. Las correcciones deben hacerse desde la administración de empleados de Envelope.

### Ventas

Confirmar que las ventas del periodo tengan:

- Fecha correcta.
- Vendedor correcto.
- Sucursal correcta.
- Importe correcto.

La suma de los detalles de venta es la base del cálculo de comisión. Payroll agrupa las ventas y el costo en la sucursal laboral asignada al empleado; la sucursal propia de la venta se conserva como dato operativo de Envelope.

## 2. Crear el primer esquema de comisión

Ir a:

```text
Payroll → Esquemas → Nuevo esquema
```

Capturar:

- **Nombre:** nombre identificable del esquema.
- **Vigente desde:** debe ser día 1 o 16.
- **Rangos:** desde, hasta y tasa decimal.

### Ejemplo ilustrativo para desarrollo

Este ejemplo no representa una regla autorizada y debe reemplazarse por los porcentajes reales de la empresa:

|      Desde |      Hasta | Tasa decimal | Equivale a |
| ---------: | ---------: | -----------: | ---------: |
|      $0.00 | $14,999.99 |       `0.03` |         3% |
| $15,000.00 | $29,999.99 |       `0.05` |         5% |
| $30,000.00 | Sin límite |       `0.07` |         7% |

Reglas importantes:

- El primer rango debe comenzar en `$0.00`.
- Los rangos deben ser continuos y no traslaparse.
- Después de `$14,999.99`, el siguiente rango comienza en `$15,000.00`.
- El último rango debe quedar sin valor en **Hasta**.
- La tasa se captura en decimal: `0.05` significa 5%, no `5`.

## 3. Asignar el esquema a los empleados

En la misma pantalla:

```text
Payroll → Esquemas → Asignar esquema
```

Seleccionar:

- Empleado.
- Esquema.
- Fecha de vigencia, día 1 o 16.

Para revisar una quincena, la asignación debe estar vigente desde el inicio de esa quincena o desde una fecha anterior.

Si un empleado tiene ventas pero no tiene esquema vigente, la corrida mostrará la advertencia y no podrá aprobarse.

Los cambios posteriores de esquema o rangos generan una nueva vigencia; no modifican corridas históricas.

## 4. Crear catálogos de movimientos

Los catálogos son opcionales, pero facilitan una captura consistente.

Rutas:

```text
Payroll → Bonos
Payroll → Multas
Payroll → Viáticos
```

En cada catálogo se captura:

- Nombre del concepto.
- Monto predeterminado.
- Notas o regla interna.

Ejemplos ilustrativos para desarrollo:

- Bono: `BONO DE PUNTUALIDAD`.
- Multa: `DESCUENTO AUTORIZADO`.
- Viático: `TRASLADO ENTRE SUCURSALES`.

El monto predeterminado puede modificarse al distribuir el movimiento. No capturar ejemplos ficticios en producción si no representan conceptos autorizados.

## 5. Registrar movimientos de nómina

Ir a:

```text
Payroll → Movimientos → Nuevo movimiento
```

Tipos disponibles:

- Ajuste positivo.
- Ajuste negativo.
- Multa.
- Bono.
- Viáticos.
- Insumos.

Capturar:

1. Fecha dentro de la quincena que se calculará.
2. Tipo.
3. Concepto o elemento del catálogo.
4. Monto total.
5. Número de participantes, entre 1 y 5.
6. Empleado y parte correspondiente de cada participante. La sucursal se toma automáticamente del empleado.
7. Indicar si la parte es pagable.
8. Notas.

La suma de las partes debe coincidir exactamente con el monto total. Un empleado no puede aparecer dos veces dentro del mismo movimiento.

Después de guardar, el movimiento queda `PENDING`. Debe aprobarse desde la tabla para que entre en una corrida.

### Mientras el bucket de comprobantes esté pendiente

- Evitar viáticos e insumos en la prueba completa.
- Esos movimientos pueden guardarse, pero no aprobarse sin evidencia.
- Bonos, multas y ajustes pueden utilizarse normalmente.

### Ejemplo mínimo

Para probar un bono de `$1,000.00` compartido:

| Participante |   Parte | Sucursal                 | Pagable |
| ------------ | ------: | ------------------------ | ------- |
| Empleado A   | $600.00 | Asignada en Envelope     | Sí      |
| Empleado B   | $400.00 | Asignada en Envelope     | Sí      |

Total distribuido: `$1,000.00`.

## 6. Registrar gastos

Ir a:

```text
Payroll → Gastos → Agregar gasto
```

Capturar:

- Fecha.
- Tipo fijo o variable.
- Frecuencia informativa.
- Concepto.
- Categoría.
- Centro de costo: sucursal o `CORPORATIVO`.
- Monto.
- Notas.

Cada gasto es una ocurrencia individual. Seleccionar frecuencia mensual o quincenal no crea automáticamente gastos futuros.

Un gasto afecta únicamente la corrida cuya quincena contiene su fecha. Se descuenta del balance general, no del pago individual de un empleado.

Para un primer flujo sencillo, este paso puede omitirse.

## 7. Registrar un préstamo o adelanto

Ir a:

```text
Payroll → Préstamos y adelantos → Nueva solicitud
```

Capturar:

- Fecha de solicitud.
- Empleado.
- Préstamo o adelanto de nómina.
- Monto solicitado.
- Número de pagos.
- Primera quincena de cobro, iniciando día 1 o 16.
- Notas.

El sistema genera automáticamente las cuotas quincenales. Si el monto no se divide exactamente, la última cuota absorbe la diferencia de centavos.

Para verificar este flujo, crear en desarrollo un importe fácil de identificar y confirmar que la primera cuota aparezca como descuento en la corrida correcta.

Este paso también puede omitirse en la primera prueba básica.

## 8. Crear la corrida

Ir a:

```text
Payroll → Corridas de nómina
```

Si no existe ninguna corrida, configurar:

- Periodo completo: día 1–15 o día 16–último día del mes.
- Día de pago igual o posterior al final de la quincena.
- Modo de cálculo:
  - **Con IVA:** usa la venta bruta como base.
  - **Sin IVA:** usa `venta bruta / 1.16` como base.

Después presionar **Crear corrida**.

El sistema cargará automáticamente:

- Ventas del periodo.
- Sueldo quincenal.
- Esquema, rango y tasa vigente.
- Comisión.
- Movimientos aprobados.
- Cuotas de préstamos correspondientes.
- Gastos del periodo.
- Distribución por sucursal.

## 9. Revisar el borrador

Antes de aprobar, revisar por empleado:

- Ventas con IVA y sin IVA.
- Esquema y versión.
- Porcentaje aplicado.
- Comisión.
- Sueldo base quincenal.
- Bonos y ajustes positivos.
- Multas y ajustes negativos.
- Pago de préstamo.
- Total a pagar.
- Sucursales asociadas.

También revisar:

- Nómina total.
- Gastos.
- Balance general.
- Advertencias.
- Reporte por sucursal.

Mientras la corrida esté en `DRAFT` se puede corregir la información fuente y presionar **Recalcular**.

### Comparación recomendada

Para un empleado elegido como muestra, calcular manualmente:

```text
Base seleccionada × tasa = comisión
Sueldo mensual ÷ 2 = sueldo quincenal

Total pago =
  sueldo quincenal
  + comisión
  + bonos
  + ajustes positivos
  + viáticos
  + insumos
  - multas
  - ajustes negativos
  - cuota de préstamo
```

El resultado debe coincidir con la línea del empleado.

## 10. Resolver advertencias y bloqueos

| Mensaje o problema               | Acción recomendada                                                               |
| -------------------------------- | -------------------------------------------------------------------------------- |
| Sueldo no capturado              | Completar sueldo en Envelope o aceptar conscientemente que se calculará en `$0`. |
| Empleado con ventas sin esquema  | Crear/asignar esquema con vigencia desde el inicio de la quincena y recalcular.  |
| Ventas fuera de todos los rangos | Corregir rangos para que sean continuos y cubran cualquier importe.              |
| Pago total negativo              | Revisar multas, ajustes y préstamos; no se permite aprobar.                      |
| Viático/insumo sin evidencia     | Dejar pendiente o configurar Storage y adjuntar comprobante.                     |
| Banco faltante                   | Completar banco en Envelope antes de pagar.                                      |
| Cuenta faltante                  | Completar cuenta en Envelope antes de pagar.                                     |
| Teléfono faltante                | Completar teléfono si se requiere WhatsApp; no bloquea el pago.                  |

## 11. Aprobar la corrida

Cuando los importes sean correctos, presionar **Aprobar corrida**.

La aprobación:

- Congela el cálculo y los datos de cada empleado.
- Reserva movimientos aprobados.
- Reserva gastos del periodo.
- Reserva cuotas de préstamos.
- Impide editar o recalcular la corrida.

No aprobar únicamente para “ver qué pasa”. Para seguir probando cálculos se debe permanecer en borrador.

Una corrida aprobada todavía puede cancelarse. Al cancelarla se liberan movimientos, gastos y cuotas reservadas.

## 12. Marcar la corrida como pagada

Después de confirmar que el pago realmente se realizará, presionar **Marcar pagada**.

Este paso:

- Valida banco y cuenta de todos los empleados incluidos.
- Marca las cuotas reservadas como pagadas.
- Actualiza saldos de préstamos.
- Genera un recibo por empleado.
- Hace que la corrida ya no pueda cancelarse.

Para una prueba en desarrollo se puede ejecutar normalmente. En producción, no marcar como pagada antes de contar con autorización operativa.

## 13. Revisar reportes y recibos

### Reporte por sucursal

Ir a:

```text
Payroll → Reporte por sucursal
```

Revisar:

- Ventas por sucursal.
- Costo de nómina por sucursal.
- Distribución de cada empleado.
- Peso porcentual del costo.
- Exportación PDF y Excel.

Los empleados sin relación laboral se muestran en `SIN SUCURSAL ASIGNADA`. Así pueden localizarse y corregirse desde Envelope sin mezclarlos con una sucursal real.

### Recibos

Ir a:

```text
Payroll → Recibos
```

Después de pagar la corrida se puede:

- Descargar el PDF individual.
- Abrir WhatsApp con un mensaje preparado.
- Marcar el recibo como confirmado.

El PDF debe adjuntarse manualmente en WhatsApp. El sistema no envía archivos automáticamente.

## Recorrido mínimo para revisar el flujo

Si se quiere hacer la prueba más corta posible:

1. Elegir un empleado con ventas y datos bancarios completos.
2. Crear un esquema de comisión que cubra todas sus ventas.
3. Asignarlo con vigencia desde el inicio de la quincena.
4. Crear un bono pequeño y aprobarlo.
5. Crear una corrida de esa quincena.
6. Comparar ventas, comisión, sueldo, bono y total.
7. Revisar el reporte por sucursal.
8. Aprobar la corrida.
9. Marcarla pagada en desarrollo.
10. Descargar y revisar el recibo PDF.

No es necesario registrar gastos, préstamos, viáticos o insumos para completar este recorrido mínimo.

## Checklist para el usuario

### Configuración inicial

- [ ] Tengo acceso como `SUPER_ADMIN`.
- [ ] Elegí una quincena con ventas verificables.
- [ ] Los empleados tienen sueldo, banco, cuenta y sucursal laboral.
- [ ] Creé al menos un esquema de comisión.
- [ ] Asigné el esquema a los empleados con ventas.
- [ ] La vigencia inicia día 1 o 16 y cubre el periodo.

### Antes de aprobar

- [ ] Comparé ventas con Envelope.
- [ ] Verifiqué la tasa y la comisión.
- [ ] Revisé sueldo, bonos, deducciones y préstamos.
- [ ] El total de pago de ningún empleado es negativo.
- [ ] Revisé advertencias y el reporte por sucursal.
- [ ] Los movimientos correctos están aprobados.

### Antes de pagar

- [ ] La corrida fue autorizada.
- [ ] Todos los empleados incluidos tienen banco y cuenta.
- [ ] Confirmé la fecha de pago.
- [ ] Sé que una corrida pagada no puede cancelarse ni recalcularse.

### Después de pagar

- [ ] Revisé los saldos de préstamos.
- [ ] Descargué el reporte final.
- [ ] Revisé al menos un recibo PDF.
- [ ] Registré recibos enviados y confirmados, si aplica.
