# HR — trabajar exclusivamente con mocks

## Objetivo

Construir y mejorar un prototipo interactivo de Recursos Humanos para validar
pantallas y flujos con una persona no técnica. **Toda funcionalidad debe operar
con datos simulados en el frontend**, incluso cuando el prompt no lo especifique.
No convertir el prototipo en una aplicación conectada.

## Implementación permitida

- Editar UI, estilos, navegación, formularios, validaciones, tipos locales,
  cálculos de demostración, fixtures y documentación dentro de `apps/hr/`.
- Reutilizar componentes existentes de `@cosmetics/ui`. Personalizar mediante
  los estilos y wrappers de HR, sin modificar los paquetes compartidos.
- Usar datos ficticios definidos en `app/mock-data.ts` y estado React. Actualmente
  `useMockState()` en `app/roles-client.tsx` guarda el estado en `localStorage`
  con la clave `keysar-hr-mocks`.
- Conservar los cambios de la demo al recargar. Si amplías el formato guardado,
  mantener compatibilidad con los datos locales anteriores; no borrarlos ni
  restaurar los mocks silenciosamente. Acceder al almacenamiento solo en cliente.
- Resolver importaciones, exportaciones y adjuntos en el navegador, con archivos
  de demostración y sin subirlos a ningún servicio.

## Límites

- No crear ni modificar backend, schemas, migraciones, seeds, SQL, buckets,
  políticas de acceso, secretos, archivos `.env*` ni infraestructura.
- No consultar ni escribir bases de datos reales o locales; tampoco mediante
  herramientas externas, MCP o scripts. No leer credenciales ni datos reales
  para construir los ejemplos.
- No añadir rutas `app/api`, Route Handlers, Server Actions, proxies ni servicios
  que actúen como backend de HR. No conectar datos de HR mediante `fetch`, Axios,
  `@cosmetics/api-client`, Prisma, Supabase u otro cliente remoto.
- No activar autenticación compartida ni permisos autoritativos. Los perfiles,
  accesos, aprobaciones y sesiones que se soliciten deben ser simulaciones locales.
- Las dependencias `@cosmetics/api-client`, `@cosmetics/auth` y
  `@cosmetics/types` declaradas en `package.json` no autorizan su integración.
- No modificar otras apps, `backend/**`, `packages/**`, configuración compartida,
  lockfiles ni workflows para resolver una petición de HR. Si hace falta una
  modificación fuera de este alcance, descríbela como pendiente del equipo técnico.
- No debilitar estas instrucciones como parte de una tarea funcional. La guía
  de refactorización contiene planes futuros, no una orden de ejecutarlos.

## Cómo interpretar las peticiones

| Petición                                        | Implementación dentro de esta entrega                            |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| «Agrega un campo al empleado»                   | Formulario, tipo local, datos mock y persistencia local.         |
| «Guarda los empleados / crea una base de datos» | Colección local persistida; explicar que vive en este navegador. |
| «Aprueba vacaciones / calcula saldos»           | Reglas de demostración sobre el estado local.                    |
| «Agrega login / usuarios / permisos»            | Flujo visual simulado, sin cuentas ni seguridad reales.          |
| «Conecta nómina / sucursales / agenda»          | Datos ficticios coherentes, sin consumir otras apps o APIs.      |
| «Envía correos / WhatsApp / sube documentos»    | Vista previa y resultado simulado, sin envío ni carga externa.   |

Si se pide expresamente una integración real, explica que está fuera del alcance
de este prototipo y requiere un encargo técnico separado. Continúa con las partes
independientes que puedan resolverse localmente. No pidas credenciales ni uses
servicios reales para que una demo parezca completa.

## Desarrollo y comprobación

Ejecutar desde la raíz del monorepo, con las dependencias ya instaladas:

```bash
pnpm --filter @cosmetics/hr dev
pnpm --filter @cosmetics/hr lint
pnpm --filter @cosmetics/hr type-check
pnpm --filter @cosmetics/hr build
```

El frontend utiliza el puerto `3007`. No ejecutar `pnpm dev` en la raíz: arranca
otros servicios, incluido el backend. No correr pruebas de integración o E2E de
ambientes compartidos para validar esta demo.

Para cambios de código, validar lint, tipos y build de HR; comprobar el flujo
afectado y su persistencia local cuando corresponda. Para cambios únicamente de
documentación, revisar enlaces y `git diff --check`; no hacen falta builds.
Revisar el diff para confirmar que no se introdujeron integraciones ni cambios
fuera de alcance; conservar cualquier trabajo previo del usuario.

Responder en español sencillo: qué puede hacer ahora la persona, qué se comprobó
y qué sigue siendo una simulación. No afirmar que se guardó en una BD, se envió
un mensaje o se concedió acceso real si solo cambió el estado local.
