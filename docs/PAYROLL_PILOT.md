# Piloto de nómina

## Estado al 24 de noviembre de 2026

La rama de integración es `pilot/payroll-v2`. Parte de `master` en `fe71dbd8` e incorpora la interfaz que el PO terminó en `prototype/payroll-ui`, revisión `3f18f4aa`. La API productiva consultada identificó su versión como `6239a23a`. El acceso de operación diaria sigue en [Nómina productiva](https://nomina.keysarcosmetics.com/).

Supabase rechazó la creación de `keysar-payroll-pilot` después de confirmar la cotización de US$0 al mes. La cuenta ya tiene los dos proyectos activos que permite el plan gratuito. El propietario eligió mantener Supabase y habilitará un cupo. La consulta de origen permitió identificar la corrida aprobada del 16 al 31 de octubre y el borrador del 16 al 30 de noviembre, con 71 empleados y 396 ventas en el conjunto del corte. La extracción de sólo lectura se ejecutó en memoria y confirmó 64 líneas en la corrida aprobada y 55 en el borrador. La copia remota, la cuenta del PO y la prueba con importes reales siguen pendientes de habilitar un destino independiente. Las pruebas automáticas usan dos bases desechables con datos sintéticos.

## Cómo lo usará el PO

1. Abrir la vista previa de Vercel con la cuenta autorizada y luego ingresar con el usuario del piloto `nomina` y su clave exclusiva. Obtener esa clave por el canal privado habitual.
2. Revisar el aviso **PRUEBA · Nómina** y la fecha del corte en hora de Ciudad de México. Los cambios posteriores en producción se incorporan al generar otro corte.
3. Abrir **Conciliar importes**, elegir la quincena cerrada e identificar las diferencias por empleado y por sucursal. La pantalla indica si los importes oficiales provienen de una corrida pagada, aprobada, en borrador o de un cálculo del motor vigente. Las diferencias se expresan en MXN como piloto menos referencia.
4. Cambiar a la quincena abierta. Ensayar, por ejemplo, la aprobación de un bono. Esperar **Guardado**, recargar y revisar la diferencia. Un conflicto entre pestañas conserva la última revisión guardada. Revisar los cambios pendientes antes de recargar. El PIN `0000` sirve para ensayar autorizaciones sólo después del ingreso real.
5. Probar también el abono de un préstamo, el recibo y la dispersión. Los archivos de salida llevan la marca **PRUEBA**. Para efectuar el pago o emitir el recibo oficial, usar [Nómina productiva](https://nomina.keysarcosmetics.com/).
6. Si un importe difiere, anotar la fecha del corte, la quincena, el ID de empleado o sucursal, el concepto, la referencia, el importe del piloto y los pasos realizados. Mantener nombres y montos individuales dentro de los canales internos de nómina.

## Entornos y flujo de datos

| Componente | Recurso | Permisos |
| --- | --- | --- |
| Producción | `master`, dominio de nómina, proyecto Supabase `kgzuamipstbsiqrlaphh` | El importador hace una transacción de lectura consistente. |
| Copia | Proyecto PostgreSQL independiente, esquema `payroll_pilot` | El cargador crea el corte. La cuenta de ejecución sólo lee el original y guarda los cambios del ensayo. |
| API del piloto | Aplicación Fly `cosmetics-payroll-pilot` | Sesión independiente, lectura del último corte y guardado con revisión. |
| Interfaz del PO | Proyecto Vercel `keysarcosmetics-payroll`, entorno `preview` con `gitBranch=pilot/payroll-v2` | El servidor de Next dirige las solicitudes a la API del piloto. El navegador usa una cookie HttpOnly. |

```mermaid
flowchart LR
  PROD[(Nómina productiva)] -->|Lectura al tomar el corte| IMPORT[Importador puntual]
  IMPORT -->|Corte original| PILOT[(Base del piloto)]
  PO[PO en vista previa protegida] --> NEXT[Next.js]
  NEXT --> API[API exclusiva en Fly]
  API -->|Lee el corte y guarda cambios del ensayo| PILOT
```

El importador usa `REPEATABLE READ` y `READ ONLY`. La referencia cruda y los cambios se guardan en columnas diferentes. Cada guardado verifica el identificador del corte y su revisión bajo un bloqueo transaccional. Una pestaña con un corte anterior recibe HTTP 409. Cada nueva carga abre un ensayo limpio y conserva los anteriores en la base piloto. Actualizar un corte con el PO a mitad de una prueba requiere coordinarlo con él.

## Qué representa el corte

[Consulta de extracción](../backend/api/pilot/read-cut.sql) y [contrato de datos](../packages/types/src/payroll-pilot.ts).

- Se elige la quincena de la fecha de extracción en Ciudad de México y la corrida pagada o aprobada más reciente anterior a ella. Cuando aún no hay corrida cerrada se usa la quincena anterior. Para cada quincena se prefiere una corrida pagada, luego aprobada y después borrador.
- Se copian los nombres e identificadores necesarios para reconocer empleados, puestos, sucursales, sueldo, ventas por vendedor y sucursal, versiones y tramos de comisiones, asignaciones, catálogo, movimientos distribuidos, préstamos y cuotas. Las líneas de corrida, costos por sucursal y el estado del recibo dan la referencia. Quedan fuera clientes, cuentas bancarias, CLABE, teléfonos, correo, claves, archivos y notas libres del origen.
- Con corrida disponible se usan las líneas registradas, incluso si la corrida sigue en borrador. Sin corrida se usa `calculatePayroll` con el corte congelado para obtener la referencia por empleado. La conciliación de sucursal compara el costo de personal. No incluye gastos generales de la sucursal.
- El sistema de origen no proporciona las fechas laborales y tasas fiscales que solicita la propuesta. Se presupone la quincena completa para el sueldo y tasas nuevas en cero. Para empleados inactivos se habilitan las quincenas con actividad o una línea observada hasta que el PO registre fechas. La categoría inicial se infiere del puesto, y los módulos iniciales, del sueldo y las asignaciones. Las asignaciones y reglas nuevas se pueden ensayar en el piloto.
- Los calendarios de préstamos y saldos oficiales se conservan en el original. El prototipo reparte las cuotas según sus propias reglas. Los suministros entran como ajustes positivos en el prototipo. Los módulos nuevos, como finiquitos, aguinaldos y metas de kiosco, empiezan sin movimientos inventados.
- En dispersión se muestran cuentas vacías o de prueba. Las confirmaciones, autorizaciones y recibos modifican el ensayo. El proceso de la API carece de conectores bancarios, de mensajería y de escritura en las tablas operativas.

## Habilitar una base y cargar el corte

1. Verificar en la organización Supabase del proyecto `keysarcosmetics` que hay capacidad para otro proyecto. Confirmar el precio mostrado contra el autorizado. La región solicitada fue `us-west-1`. Guardar la nueva referencia y comprobar que difiere de `kgzuamipstbsiqrlaphh`. El importador comprueba el hostname o la identidad del pooler y exige TLS.
2. En una sesión privada del cargador, inyectar `PILOT_PROJECT_REF` y `PILOT_DATABASE_URL` (conexión administrativa **del destino**) y `PILOT_RUNTIME_PASSWORD` (valor aleatorio base64url de 32 a 100 caracteres). Obtener los secretos del gestor de credenciales interno. Ejecutar desde la raíz del monorepo.

```sh
pnpm install --frozen-lockfile
pnpm --filter @cosmetics/api build
node backend/api/dist/pilot/import.js init
```

El comando verifica la ausencia de tablas operativas, crea la marca de identidad, activa RLS y crea el rol `keysar_pilot_runtime` con permisos de lectura y actualización por columna. Al repetir `init` se conserva la contraseña de un rol ya existente.

3. Añadir `PAYROLL_SOURCE_REF=kgzuamipstbsiqrlaphh` y `PAYROLL_SOURCE_READ_URL` únicamente a esa sesión. Preferir una credencial de sólo lectura con permiso de consulta sobre las tablas de la extracción. `PILOT_AS_OF` admite una fecha ISO si se requiere reconstruir una selección histórica de periodos. La información observada sigue siendo la de la fecha de extracción. Ejecutar el importador.

```sh
node backend/api/dist/pilot/import.js import
```

4. Montar en Fly únicamente `PILOT_PROJECT_REF`, `PILOT_DATABASE_URL` con el rol **keysar_pilot_runtime** del destino, `PILOT_OPERATOR_USER`, `PILOT_OPERATOR_HASH` (bcrypt) y `PILOT_SESSION_SECRET` (aleatorio de al menos 32 caracteres). El acceso de origen pertenece sólo a la sesión del importador. Entregar la clave del operador directamente al PO por el canal privado. La sesión dura dos horas.
5. Configurar `PILOT_API_ORIGIN=https://cosmetics-payroll-pilot.fly.dev` en la rama de Vercel `pilot/payroll-v2` para `preview`. Desplegar la API independiente desde la raíz con `fly deploy --app cosmetics-payroll-pilot --config backend/api/fly.payroll-pilot.toml --ha=false`. La vista previa se construye a partir de la rama. El build de esta rama rechaza `VERCEL_ENV=production`.
6. Verificar `GET /health`, `GET /ready` y el ingreso del PO desde la vista previa. `/ready` debe devolver 200, la API debe rechazar la lectura sin sesión y una sesión del PO debe obtener el corte correcto. Antes de dar acceso, confirmar que la protección de la vista previa pide autorización. Conservar sólo las credenciales de servicio del piloto en Fly.

## Verificación, continuidad y regreso

- **Prueba de aislamiento**. `backend/api/src/pilot/pilot.integration.test.ts` exige dos bases locales con nombres `source_test` y `pilot_test` en loopback. Migrar sólo `source_test` con el esquema canónico. Definir `PILOT_LOCAL_TEST=1`, `PAYROLL_SOURCE_READ_URL`, `PILOT_DATABASE_URL` y `PILOT_PROJECT_REF=pilot_test`. Ejecutar `pnpm --filter @cosmetics/api exec vitest run src/pilot/pilot.integration.test.ts`. Verifica redacción, el bloqueo de tablas operativas, permisos de columna, el guardado, conflictos y la invariancia de líneas, movimientos, cuotas y recibo del origen.
- **Prueba de navegador**. La prueba de integración deja un corte sintético nuevo. Arrancar la API local compilada en el puerto 4078 con esos datos, un hash bcrypt de la clave de la fixture de Playwright y un secreto de prueba. Compilar `@cosmetics/payroll` y ejecutar `pnpm --filter @cosmetics/e2e exec playwright test --config=playwright.payroll-pilot.config.ts`. La prueba abre Chrome, autentica, aprueba un bono, recarga y concilia ambas quincenas. Repetir primero la prueba de integración para restituir los datos de ensayo.
- **Aceptación con el corte real**. Antes y después de una prueba sobre el piloto, consultar en producción la misma línea de corrida, el recibo y el saldo o cuota del préstamo elegido. Deben conservar sus importes y estados. Verificar en la vista previa que el cambio persiste y el importe de referencia sigue fijo. Registrar el resultado y la revisión del despliegue sin copiar datos personales al repositorio.
- **Regreso inmediato**. Cerrar el piloto y abrir [Nómina productiva](https://nomina.keysarcosmetics.com/). Las capturas oficiales se realizan allí. Una corrección ensayada en el piloto no se transfiere a producción. Si se desea retirar acceso al piloto, rotar su secreto de sesión y la clave del operador o retirar el acceso a la vista previa.
- **Retomar en otra sesión**. Hacer checkout de `pilot/payroll-v2`, leer este documento, consultar `fly status --app cosmetics-payroll-pilot` y `/ready`, y revisar la última vista previa de la rama en Vercel. Consultar la lista de proyectos Supabase antes de reintentar el aprovisionamiento. Un HTTP 503 en `/ready` señala un corte ausente, una identidad inválida o una conexión pendiente.
