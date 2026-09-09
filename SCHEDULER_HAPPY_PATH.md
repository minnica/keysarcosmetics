# Happy path de información para Scheduler

## Resumen

Para completar la primera cita en Scheduler, los datos maestros necesarios salen de **Envelope** y **POS**. **Payroll no aporta ningún campo obligatorio** para disponibilidad, clientes o citas.

El conjunto mínimo de datos externos es:

```text
Envelope:
- 1 banco
- 1 sucursal activa
- 1 puesto administrador
- 1 empleado activo asignado a la sucursal
- 1 usuario SUPER_ADMIN asociado al empleado

POS:
- 1 CatalogItem activo de tipo SERVICE

Payroll:
- Ningún dato
```

> Si la base de datos está literalmente vacía, primero se debe provisionar un usuario `SUPER_ADMIN` mediante backend o seed. La pantalla de Accesos de Envelope requiere que ya exista un administrador autenticado.

## 1. Información capturada en Envelope

Los datos deben capturarse en el siguiente orden.

| Pantalla | Campos que se deben llenar | Información que usa Scheduler |
| --- | --- | --- |
| Bancos | `Nombre` | Ninguna. Es necesario porque el formulario de empleado obliga a seleccionar un banco. |
| Sucursales | `Nombre`, `Meta mensual = 0` | `id`, `nombre` y que la sucursal esté activa. |
| Puestos | `Nombre` | Nombre como referencia y configuración de permisos del usuario. |
| Empleados | `Nombres`, `Apellido paterno`, `Apellido materno`, `Banco`, `Puesto`, `Sucursal`, `Meta individual = 0` | `nombreCompleto`, `activo`, `sucursalId`, `todasSucursales` y puesto. |
| Accesos | Empleado, `Email`, `Contraseña` | Crea el `Usuario` que puede entrar a Scheduler. |

### 1.1. Banco

Crear un banco con:

- **Nombre:** por ejemplo, `SIN DEFINIR`.

Scheduler no utiliza el banco. Es una dependencia administrativa del formulario de empleados de Envelope.

### 1.2. Sucursal

Crear una sucursal con:

- **Nombre:** por ejemplo, `Sucursal Demo`.
- **Meta mensual:** `0`.
- **Estado:** activa.

Scheduler utiliza la identidad, el nombre y el estado activo de la sucursal. No utiliza la meta mensual.

### 1.3. Puesto

Crear un puesto con:

- **Nombre:** por ejemplo, `Administrador` o `Especialista`.

Para el primer usuario administrador, en **Accesos** se debe seleccionar el puesto y habilitar **Administrar accesos**. Al crear una cuenta para un empleado con un puesto que puede administrar accesos, el backend le asigna el rol `SUPER_ADMIN` automáticamente.

Para el conjunto mínimo, un mismo empleado puede funcionar como administrador y profesional de Scheduler.

### 1.4. Empleado

Crear un empleado con:

- **Nombres**.
- **Apellido paterno**.
- **Apellido materno**.
- **Banco:** el creado anteriormente.
- **Puesto**.
- **Sucursal:** seleccionar una sucursal concreta.
- **Meta individual:** `0`.
- **Estado:** activo.

No son necesarios para el happy path de Scheduler:

- Número de cuenta.
- Sueldo.
- Fecha de nacimiento.
- Teléfono.

Aunque el teléfono puede ser útil operativamente, no participa en la disponibilidad ni en la creación de citas.

Para evitar problemas de alcance, no se recomienda seleccionar **Sin sucursal**. Para la primera prueba debe asignarse una sucursal concreta. La opción de todas las sucursales es válida, pero añade complejidad innecesaria al escenario mínimo.

### 1.5. Cuenta de acceso

En **Accesos**, seleccionar el empleado y capturar:

- **Email**.
- **Contraseña**.

La contraseña es obligatoria al crear la cuenta por primera vez.

Para el happy path inicial se recomienda utilizar un usuario `SUPER_ADMIN`. Un usuario que no sea superadministrador requiere permisos y asignaciones de sucursales específicos de Scheduler; actualmente estos permisos existen en el backend, pero no están completamente administrados desde la interfaz de Envelope.

### 1.6. Datos de Envelope que no alimentan Scheduler

No se debe usar **Envelope → Servicios** para crear el servicio de una cita de Scheduler. Ese catálogo pertenece al flujo legado de `RegistroCita`.

Scheduler obtiene sus servicios del catálogo canónico `CatalogItem` administrado desde POS.

## 2. Información capturada en POS

En POS se debe crear el servicio desde **Catálogo**.

### 2.1. Campos obligatorios del servicio

- **Nombre**.
- **SKU:** puede generarse automáticamente.
- **Tipo:** `Servicio` / `SERVICE`.
- **Familia**.
- **Categoría**.
- **Grupo**.
- **Precio mínimo:** mayor a `0`.
- **Precio máximo o de lista:** igual o mayor al precio mínimo.
- **Sucursal:** seleccionar al menos una; para la prueba debe ser la misma creada en Envelope.
- **Activo:** sí. Al crear un artículo nuevo queda activo automáticamente.

Ejemplo:

```text
Nombre: Limpieza facial
SKU: SERV-LIMPIEZA-001
Tipo: Servicio
Familia: Faciales
Categoría: Limpiezas
Grupo: Cabina
Precio mínimo: 800
Precio máximo: 800
Sucursal: Sucursal Demo
Activo: Sí
```

Si se deja habilitada la opción **Mostrar en catálogo digital**, POS también exige:

- **Descripción**.
- Al menos un **beneficio**.

Para el happy path mínimo se puede desactivar esta opción. Scheduler no exige que el servicio esté publicado; exige que exista, sea de tipo `SERVICE` y esté activo.

### 2.2. Campos de POS que Scheduler utiliza

Scheduler utiliza principalmente:

- `CatalogItem.id`.
- `sku`.
- `name`.
- `kind = SERVICE`.
- `active = true`.

Los siguientes campos no intervienen directamente en el cálculo o registro de la primera cita:

- Precio.
- IVA.
- Costos.
- Proveedor.
- Inventario.
- Existencias.
- Descripción.
- Beneficios.
- Familia.
- Categoría.
- Grupo.

POS obliga a capturar algunos de estos valores para guardar el artículo, aunque Scheduler no los consuma.

### 2.3. Clientes de POS

No es obligatorio crear previamente al cliente en POS. Scheduler permite crear su propio cliente durante el flujo de agenda.

Para la primera prueba bastan:

- **Nombre del cliente**.
- **Sucursal**.

El teléfono y el email pueden ser opcionales para la primera cita, aunque son recomendables para comunicaciones y seguimiento.

## 3. Información capturada en Payroll

No se necesita llenar ningún campo en Payroll para:

- Crear sucursales o profesionales.
- Configurar disponibilidad.
- Consultar horarios.
- Crear clientes.
- Registrar una cita.
- Cambiar el estado de una cita.

No son prerrequisitos del happy path:

- Sueldos.
- Esquemas de comisión.
- Asignaciones de comisión.
- Bonos o deducciones.
- Movimientos.
- Préstamos.
- Gastos.
- Corridas de nómina.

Payroll entra después, cuando se necesite liquidar o reportar remuneraciones. No debe bloquear el flujo operativo de Scheduler.

## 4. Configuración posterior dentro de Scheduler

Una vez disponibles los datos de Envelope y POS, se debe completar la configuración propia de Scheduler.

### 4.1. Comercio

Crear un comercio y dejarlo activo.

Campo mínimo:

- **Nombre del comercio**.

### 4.2. Perfil de sucursal

Asociar la sucursal creada en Envelope y configurar:

- Comercio.
- Zona horaria.
- Estado activo.
- Días laborales.
- Hora de inicio y fin por día.
- Descanso, si aplica.

Se recomienda mantener desactivada temporalmente la opción de aceptar reservaciones hasta terminar la configuración restante.

### 4.3. Perfil profesional

Convertir al empleado de Envelope en profesional de Scheduler:

- Empleado.
- Sucursal.
- Estado activo.

La especialidad, biografía y configuración de citas en línea pueden dejarse para una segunda etapa si el formulario no las exige.

### 4.4. Perfil del servicio

Seleccionar el servicio creado en POS y configurar:

- Duración en minutos.
- Tiempo de preparación, normalmente `0`.
- Tiempo de limpieza, normalmente `0`.
- Modalidad individual.
- Capacidad `1`.
- Sucursal.
- Estado activo.

### 4.5. Compatibilidad profesional-servicio

Crear la relación obligatoria:

```text
Profesional ↔ Servicio ↔ Sucursal
```

Sin esta relación, Scheduler no podrá ofrecer horarios aunque la sucursal, el profesional y el servicio estén activos individualmente.

Los recursos, cabinas o equipos pueden omitirse si el servicio no los requiere.

### 4.6. Habilitar reservaciones

Una vez configurados horarios, profesional, servicio y compatibilidad, activar **Aceptar reservaciones** en el perfil de la sucursal.

### 4.7. Cliente y primera cita

Crear o seleccionar un cliente y capturar:

- Nombre.
- Sucursal.
- Teléfono o email, opcionales para la primera prueba.

Después crear la cita seleccionando:

- Sucursal.
- Cliente.
- Servicio.
- Profesional.
- Fecha.
- Horario disponible proporcionado por el servidor.

## 5. Orden completo recomendado

```text
1. Provisionar el primer SUPER_ADMIN si la base está totalmente vacía
2. Envelope: banco
3. Envelope: sucursal activa
4. Envelope: puesto
5. Envelope: empleado activo y asignado a la sucursal
6. Envelope: cuenta de acceso
7. POS: servicio activo de tipo SERVICE
8. Scheduler: comercio
9. Scheduler: perfil y horario de sucursal
10. Scheduler: perfil profesional
11. Scheduler: perfil operativo del servicio
12. Scheduler: relación profesional-servicio-sucursal
13. Scheduler: habilitar reservaciones
14. Scheduler: cliente
15. Scheduler: primera cita
```

## 6. Condiciones mínimas que deben cumplirse simultáneamente

Para que Scheduler muestre un horario disponible y permita crear la cita:

- La sucursal canónica debe estar activa.
- El comercio de Scheduler debe estar activo y vigente.
- El perfil Scheduler de la sucursal debe estar activo, vigente y con reservaciones habilitadas.
- Debe existir horario laboral para el día solicitado.
- El empleado debe estar activo.
- El perfil profesional debe estar activo y asignado a la sucursal.
- El `CatalogItem` debe estar activo y ser de tipo `SERVICE`.
- El perfil Scheduler del servicio debe estar activo y asignado a la sucursal.
- Debe existir la compatibilidad entre profesional, servicio y sucursal.
- La duración del servicio debe caber en el horario disponible.
- No debe existir otra cita o bloqueo que ocupe el intervalo.

## Prueba de ejecución
1. Inicia sesión con admin@root.com y su contraseña existente.
2. Abre la agenda de Scheduler.
3. Selecciona:
    - Sucursal: GALERIAS INSURGENTES
    - Cliente: Cliente Scheduler Demo
    - Servicio: Limpieza facial Scheduler Demo
    - Profesional: ABEL AMBROSINI -
4. Elige una fecha.
5. Selecciona un horario entre 09:00 y 18:00.
6. Guarda la cita