# Handoff de UI hacia backend

Este documento registra únicamente las necesidades descubiertas durante el prototipo. No autoriza
cambios en API, Prisma, base de datos, autenticación ni infraestructura.

Agrega una sección por flujo siguiendo la plantilla de `PROTOTYPE_BRIEF.md`. Deja explícitas las
dudas: el prototipo puede representar una hipótesis visual sin convertirla todavía en una regla de
negocio definitiva.

## Decisiones transversales

- El prototipo recupera la experiencia funcional aprobada y mantiene toda la información únicamente
  en estado React durante la sesión.
- La persistencia futura necesitará contratos para empleados, periodos, corridas, ventas, esquemas,
  movimientos, préstamos, viáticos, recibos, autorizaciones y costos por sucursal.
- La autenticación y los permisos actuales son sólo representaciones visuales; cualquier integración
  futura deberá preservar el aislamiento de la información personal y los permisos master.
- Ninguna de estas necesidades autoriza cambios en backend o base de datos durante el prototipo.

## Alta y directorio de empleados

- Información que necesita mostrar: nombre, puesto, tipo de nómina, sucursal, salario mensual, banco, cuenta enmascarada, rol inicial, fecha de alta, fecha de baja y estado.
- Información que captura o modifica: los mismos campos del directorio; el prototipo asigna las tasas fiscales mock según el tipo de nómina y permite corregir la vigencia laboral sin borrar históricos.
- Reglas y validaciones observadas: nombre, puesto, sucursal, rol, banco, últimos cuatro dígitos de cuenta y fecha de alta son obligatorios; el salario no puede ser negativo; la baja es inclusiva y no puede ser anterior al alta; un empleado solo aparece cuando su vigencia se cruza con el periodo consultado; el sueldo mensual se paga en dos mitades (1–15 y 16–fin de mes) y se prorratea por días cuando el alta o la baja cae dentro de la quincena.
- Estados posibles: alta programada, activo, baja programada y baja.
- Acciones y permisos esperados: el alta futura debe restringirse al personal autorizado y sincronizarse con Roles y accesos.
- Dudas por resolver: fuente maestra real del empleado, identificadores laborales/fiscales requeridos, flujo de autorización, congelamiento de corridas aprobadas y si el prorrateo productivo usará días naturales o asistencia efectiva.

## Acceso al portal de nómina

- Información que necesita mostrar: identidad corporativa, usuario, clave principal, estado de segunda clave y contexto del portal.
- Información que captura o modifica: credenciales de acceso y una segunda clave numérica de cuatro dígitos administrada desde Roles y accesos.
- Reglas y validaciones observadas: usuario y clave principal son obligatorios; la segunda clave se captura con teclado visual en un campo de solo lectura, separado del autollenado del navegador; no se vuelve a mostrar después de guardarse; sólo el usuario master o un rol con `security.second_key.manage` puede asignarla o cambiarla.
- Caducidad observada en el prototipo: la sesión en memoria vence después de 3 minutos sin actividad de teclado, puntero, toque o desplazamiento; cualquier diálogo abierto se cierra al volver a `/login` y la navegación privada exige iniciar nuevamente los dos pasos.
- Estados posibles: credenciales, verificación secundaria, segunda clave pendiente, clave incorrecta y acceso autorizado.
- Acciones y permisos esperados: el backend futuro deberá almacenar un hash independiente, aplicar límite de intentos, auditoría, expiración y recuperación segura; el permiso del master no puede retirarse desde la interfaz.
- Dudas por resolver: política de rotación, bloqueo por intentos, canal de recuperación, sincronización del tiempo de espera entre pestañas y si la segunda clave será PIN, OTP o factor criptográfico en producción.

## Historial gerencial por esquema de sucursal

- Información que necesita mostrar: esquema, sucursales incluidas, gerente vigente y secuencia histórica por fecha, incluyendo periodos identificados como `SIN GERENTE`.
- Información que captura o modifica: gerente nuevo o retiro de gerente, fecha efectiva, nombre, puesto, área de nómina y rol de acceso del empleado.
- Reglas y validaciones observadas: cada nombre se conserva como fotografía histórica; quitar, renombrar o sustituir a un gerente agrega una vigencia y no reemplaza registros anteriores; el recibo mensual recupera al gerente asignado en la fecha consultada; moverlo a Ventas cierra su asignación gerencial vigente, conserva su historial y actualiza inmediatamente los menús y permisos de su portal.
- Estados posibles: gerente asignado, sin gerente, gerente sustituido y perfil reasignado.
- Acciones y permisos esperados: la configuración de esquemas y la edición del perfil requieren acceso master; el gerente solo consulta su propio recibo de sucursal cuando coincide con la vigencia histórica.
- Dudas por resolver: autorización formal de sustituciones y congelamiento definitivo de recibos aprobados.

## Destino de movimientos, préstamos y adelantos

- Información que necesita mostrar: empleado, sucursal, tipo de nómina, corrida/periodo de primera aplicación, monto, parcialidades, saldo, estatus e historial.
- Información que captura o modifica: cada movimiento, préstamo o adelanto exige seleccionar explícitamente la nómina afectada y la corrida donde se pagará o comenzará el descuento.
- Reglas y validaciones observadas: un préstamo autorizado descuenta únicamente en el módulo elegido desde el periodo seleccionado; el arrastre conserva ese tipo de nómina hasta liquidarse; cambiar el destino en edición no reescribe periodos anteriores en el mock.
- Estados posibles: borrador, pendiente, autorizado, rechazado y liquidado.
- Acciones y permisos esperados: el destino debe conservarse en la autorización, recibos, consolidado y bitácora; una integración futura deberá impedir que una corrida cerrada sea modificada sin reapertura formal.
- Dudas por resolver: tratamiento productivo de empleados con dos nóminas simultáneas y reglas para trasladar un saldo activo a otro módulo.
