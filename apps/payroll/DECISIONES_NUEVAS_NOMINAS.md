# Decisiones de producto para las nuevas nóminas

Este documento registra las preguntas realizadas y las decisiones tomadas durante la planeación de las pantallas:

- Nómina salario fijo.
- Nómina especialistas.
- Nómina comisiones.
- Comisiones gerencia.

## Objetivo acordado

Las tres pantallas funcionan como consultas o reportes. No crean corridas, snapshots, reservas, recibos, auditorías ni registros congelados.

La pantalla actual **Resumen** se conserva mientras continúa la revisión con el cliente. Más adelante, **Nómina comisiones** podría reemplazarla.

## Preguntas y decisiones

### 1. ¿Cómo debe decidir el sistema qué empleados aparecen en cada nómina?

**Opciones presentadas:**

1. Configurar una clasificación administrable por puesto.
2. Usar las reglas actuales de sueldo, nombre del puesto y esquema.
3. Mantener listas de puestos directamente en código.

**Decisión:** usar las reglas actuales.

Reglas derivadas:

- Salario fijo parte de los empleados con sueldo capturado.
- Especialistas se identifican por el nombre de su puesto.
- Comisiones parte de los empleados con esquema de comisión vigente.
- Comisiones gerencia separa a quienes tienen esquema vigente y un puesto cuyo nombre contiene `GERENTE`.
- No se agrega una clasificación nueva a `Position` ni una migración de base de datos.

### 2. ¿Qué debe sumar la columna Nómina en Nómina especialistas?

**Opciones presentadas:**

1. Sueldo del empleado.
2. Movimientos especiales sin sueldo base.
3. Dejar la regla pendiente.

**Decisión:** usar el sueldo del empleado.

Fórmulas:

```text
Vista quincenal = sueldo mensual ÷ 2
Vista mensual   = sueldo mensual completo
```

### 3. ¿Qué debe representar la columna Nómina en Nómina comisiones?

**Opciones presentadas:**

1. Neto sin sueldo.
2. Únicamente la comisión.
3. Comisión más extras, sin deducciones.

**Decisión:** mostrar el neto sin sueldo.

Fórmula:

```text
Nómina comisiones =
  comisión
  + bono
  + ajuste positivo
  + viáticos
  + insumos
  - multa
  - ajuste negativo
  - préstamo
```

El sueldo base no participa en esta pantalla.

Las multas registradas en **Movimientos** guardan una nómina destino obligatoria:
salario fijo, especialistas, comisiones o comisiones gerencia. Cada consulta
resta únicamente las multas aprobadas dirigidas a ella y cuya fecha pertenece al
periodo consultado. Las multas históricas anteriores a esta clasificación se
conservan en comisiones.

### 4. ¿Un empleado puede aparecer en más de una nómina?

Inicialmente se eligieron categorías excluyentes, con prioridad para especialistas, después comisiones y finalmente salario fijo.

Durante la revisión se detectó que esta regla ocultaría el sueldo de empleados que también reciben comisiones. Por ejemplo, un empleado con sueldo quincenal y esquema aparecería únicamente en comisiones, pero esa pantalla deliberadamente no incluye sueldo.

La decisión final se refinó por componente de pago:

- Una persona no especialista con sueldo aparece en **Nómina salario fijo**, aunque también tenga esquema de comisión.
- Si tiene esquema, también aparece en **Nómina comisiones**, pero ahí solo se muestra su componente variable neto.
- El mismo concepto económico nunca debe duplicarse entre pantallas.

### 5. ¿Dónde aparece el sueldo de una persona que también cobra comisiones?

**Opciones presentadas:**

1. En salario fijo y dejar su variable en comisiones.
2. No mostrar el sueldo.
3. Volver a sumar el sueldo en comisiones.

**Decisión:** el sueldo aparece en **Nómina salario fijo** y la parte variable aparece en **Nómina comisiones**.

### 6. Si una especialista también tiene esquema de comisión, ¿cómo se reparten sus importes?

**Opciones presentadas:**

1. Mostrarla en ambas pantallas por componente.
2. Mostrarla únicamente en especialistas.
3. Mostrarla únicamente en comisiones.

**Decisión:** mostrarla en ambas por componente.

- Su sueldo aparece en **Nómina especialistas**.
- Su comisión y movimientos netos aparecen en **Nómina comisiones**.
- El sueldo no se vuelve a sumar dentro de comisiones.

### 7. ¿Qué debe suceder con periodos históricos si no existe historial de sueldos?

**Opciones presentadas:**

1. Usar el sueldo capturado actualmente.
2. Permitir únicamente el periodo actual.
3. Crear un historial salarial con vigencias.

**Decisión:** usar el sueldo actual.

Las pantallas salariales deben informar que una consulta histórica utiliza el sueldo vigente capturado actualmente. No se agrega historial salarial en esta fase.

### 8. ¿Cómo se selecciona la base para las comisiones?

**Opciones presentadas:**

1. Conservar un selector Con IVA/Sin IVA.
2. Calcular siempre con IVA.
3. Calcular siempre sin IVA.

**Decisión:** conservar el selector **Con IVA/Sin IVA**.

- Con IVA usa la venta bruta.
- Sin IVA usa `venta bruta ÷ 1.16`.
- La misma base sirve para seleccionar el rango y multiplicar por la tasa.

### 9. ¿Qué empleados se incluyen respecto a su estatus?

**Opciones presentadas:**

1. Solo empleados activos.
2. Activos más inactivos con actividad en el periodo.
3. Todos los empleados que cumplan la categoría.

**Decisión:** incluir únicamente empleados activos.

### 10. Si un movimiento o cuota ya quedó asociado a una corrida, ¿debe aparecer en la consulta?

**Opciones presentadas:**

1. Sí, incluirlo por el periodo al que pertenece.
2. Mostrar únicamente conceptos no reservados.
3. Ignorar movimientos y préstamos.

**Decisión:** incluir todos los conceptos aplicables al periodo.

La consulta no depende de que un movimiento o cuota haya quedado asociado a un snapshot. Para préstamos se consideran cuotas programadas, reservadas o pagadas; las canceladas quedan fuera.

### 11. ¿Las nuevas nóminas deben incluir exportaciones?

**Opciones presentadas:**

1. PDF y Excel.
2. Solo Excel.
3. Sin exportación.

**Decisión:** incluir PDF y Excel.

Ambos formatos deben incluir:

- Las cinco columnas de la tabla.
- El total final.
- El desglose de totales por puesto.

## Reglas visuales acordadas

Cada pantalla contiene:

- Vista quincenal y mensual.
- Selector de periodos estándar de los últimos 12 meses.
- Columnas: nombre completo, puesto, banco, cuenta y nómina.
- Footer con el total visible únicamente en la última columna.
- Card inferior con el total de cada puesto y el total general.
- Exportaciones PDF y Excel.
- Compatibilidad con tema claro, tema oscuro y pantallas móviles.

## Identificación de especialistas

En esta fase un empleado se considera especialista cuando el nombre normalizado de su puesto contiene alguno de estos textos:

```text
FACIALISTA
ESPECIALISTA
```

Esta regla depende del nombre actual del puesto y no agrega una categoría persistida en base de datos.

## Cálculo mensual

- Salario fijo y especialistas usan el sueldo mensual completo.
- Comisiones se calculan por separado para las quincenas 1–15 y 16–fin.
- Después se suman los resultados de ambas quincenas.
- Los rangos de comisión nunca se recalculan sobre las ventas combinadas de todo el mes.

## Fuera de alcance

- Eliminar o reemplazar definitivamente la pantalla Resumen.
- Crear historial salarial.
- Agregar una clasificación de nómina al catálogo de puestos.
- Crear snapshots, corridas o registros de pago desde las nuevas pantallas.
- Incluir gastos generales dentro del pago individual.
