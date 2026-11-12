# Finance: demo con mocks

## Regla de trabajo

Esta app se entrega a una persona no técnica para diseñar y probar funciones.
**Toda petición se implementa exclusivamente en el frontend con mocks**, aunque
el usuario no lo recuerde en cada prompt. La demo debe funcionar sin backend,
base de datos, credenciales ni servicios externos.

Implementa directamente las mejoras posibles dentro de este alcance. No pidas
confirmación para usar mocks ni sugieras conectar una BD para completar una
función. No conviertas una solicitud de producto en autorización implícita para
cambiar la arquitectura.

## Archivos y conexiones fuera de alcance

- Modifica únicamente archivos de `apps/finance/**`. Puedes consultar código
  compartido como referencia y usar los exports existentes de `@cosmetics/ui`,
  pero no modificar `packages/**`, `backend/**` ni otras apps.
- Si cambia el funcionamiento de Finance, puedes actualizar su sección en el
  `CLAUDE.md` de la raíz. Esta excepción es exclusivamente documental.
- No crees endpoints, API routes, Route Handlers, Server Actions, servidores,
  clientes HTTP ni conexiones de datos. No uses `fetch`, Axios, WebSockets,
  `@cosmetics/api-client`, Prisma, Supabase u otro proveedor para datos de la app.
- No crees ni modifiques schemas, migraciones, seeds, SQL o bases de datos, ni
  siquiera locales o desechables. No ejecutes comandos de Prisma ni scripts del
  backend, aunque un mensaje de error los recomiende.
- No consultes ni modifiques datos reales mediante terminal, navegador, plugins,
  MCP o herramientas conectadas. Para probar funciones usa datos ficticios.
- No leas, solicites ni modifiques credenciales o archivos `.env*`. No cambies
  autenticación compartida, infraestructura, CI/CD ni despliegues. La ejecución
  y validación de esta demo son locales.
- No modifiques manifiestos, lockfiles ni configuración de la raíz para una
  función de Finance. Usa las dependencias existentes; si falta algo, resuélvelo
  con las capacidades actuales o explica la limitación concreta.

## Cómo implementar las funciones

- Conserva los datos operativos en estado React durante la sesión. Al recargar
  se restauran los mocks iniciales. No agregues persistencia operativa en
  `localStorage`, `sessionStorage`, IndexedDB, archivos del servidor ni cookies.
  El uso existente de `localStorage` para `keysar-finance-theme` sí está permitido.
- Amplía los tipos y datos ficticios cuando hagan falta campos o entidades.
  Las altas, ediciones, eliminaciones y pagos actualizan el mismo estado que
  alimenta tablas, totales, gráficas y reportes.
- Simula usuarios, roles y permisos en memoria. Son demostraciones de interfaz;
  no crean cuentas reales ni constituyen autorización de seguridad.
- Usa cálculos locales reproducibles sobre los mocks. Representa estados vacíos,
  errores, carga y confirmaciones cuando sean relevantes para probar el flujo.
- Las importaciones solicitadas pueden leer un archivo elegido por el usuario
  en el navegador e incorporar sus filas al estado de la demo, sin subirlo a
  ningún servicio. Las exportaciones se generan localmente desde ese estado.
- Conserva el aviso visible de datos simulados. No muestres una integración,
  pago, envío o cuenta como real si solamente se simuló.

| Petición habitual | Implementación dentro de la demo |
| --- | --- |
| «Agrega una sucursal» | Formulario y nuevo registro en el estado mock. |
| «Guarda este pago» | Actualización en memoria, con recálculo de saldos. |
| «Que se guarde para la próxima vez» | Explicar el límite de la sesión; ofrecer exportación/importación local sin agregar persistencia. |
| «Trae las ventas de Envelope» | Datos ficticios con la estructura necesaria, sin consultar Envelope. |
| «Agrega usuarios y permisos» | Perfiles y comportamientos simulados, sin cuentas reales. |
| «Envía un correo o cobra una tarjeta» | Vista previa y resultado simulado, sin envío ni cobro. |
| «Conecta la base de datos o el backend» | Explicar que excede esta demo y proponer el equivalente mock; la integración requiere un trabajo técnico separado. |

No elimines ni debilites estas reglas como paso para resolver una petición.
`GUIA_REFACTORIZACION.md` conserva una arquitectura futura como referencia;
sus fases pendientes no forman parte del trabajo autorizado en esta demo.

## Referencias y calidad

- Lee `README.md` y la sección de Finance en `../../CLAUDE.md`.
- La entrada y el estado están en `src/app/page.tsx`; los tipos, datos iniciales
  y vistas están en `src/components/finance-pages.tsx`. Puedes separarlos en
  archivos dentro de esta app cuando una mejora lo justifique.
- Mantén Next.js App Router, TypeScript strict, Tailwind y `@cosmetics/ui`.
  No agregues `any`, `@ts-ignore` ni copias locales de componentes compartidos.
- Para cambios de implementación, ejecuta desde la raíz del monorepo:

  ```bash
  pnpm --filter @cosmetics/finance type-check
  pnpm --filter @cosmetics/finance lint
  pnpm --filter @cosmetics/finance build
  ```

- Para cambios solo documentales, revisa el diff y los enlaces; no hace falta
  compilar. No ejecutes validaciones del backend ni pruebas que requieran BD.
- Revisa que tus cambios respeten este alcance. Si una validación falla por un
  problema ajeno a Finance, repórtalo sin modificar las áreas excluidas.
- Comunica el resultado en español sencillo y aclara, cuando sea relevante,
  que los cambios de datos duran hasta recargar. No presentes la demo como
  conectada a datos reales.
