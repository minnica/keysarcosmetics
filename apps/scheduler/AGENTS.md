# Entorno de Producto para Scheduler

Lee `CLAUDE.md` y `SCHEDULER_PO_GUIDE.md` en la raíz antes de modificar código.
Esta rama permite prototipar cambios visuales y funcionales con datos ficticios.

- Ejecuta `pnpm --filter @cosmetics/scheduler dev:design` y abre localhost:3008.
- Trabaja en `apps/scheduler`. Los mocks y contratos propuestos viven en `design/`.
- Reutiliza las pantallas actuales, `@cosmetics/ui` y sus componentes. No crees un
  segundo conjunto de pantallas ni componentes UI duplicados.
- Puedes cambiar formularios, navegación, reglas simuladas y agregar rutas.
  Documenta el comportamiento nuevo y los contratos necesarios para integrarlo.
- Mantén los datos relacionados por IDs. Agenda, Clientes y empleados deben
  compartir el mismo estado ficticio; no agregues otra lista independiente.
- Usa TypeScript estricto, sin `any` ni `@ts-ignore`.
- Conserva los contratos productivos de `packages/types` y `packages/api-client`.
  Si necesitas ampliarlos, crea primero tipos y endpoints propuestos en `design/`.
- Conserva el runtime normal y las pruebas existentes. La configuración de
  diseño debe seguir separada por alias, destino HTTP y directorio de build.
- No arranques `backend/api`, ejecutes Prisma, conectes una BD, copies datos
  personales reales o uses credenciales de la empresa.
- Los códigos 0000/1111/2222 son ficticios. No almacenes códigos personales en
  movimientos ni los presentes como autorización de producción.
- Mensajes, documentos y alertas automáticas deben simularse. No envíes WhatsApp,
  correo o notificaciones a personas reales desde esta rama.
- Los cambios en `packages/ui` afectan a otras apps; personaliza Scheduler con
  sus estilos y propiedades de componentes.
- Por cada comportamiento entrega un commit pequeño y una descripción con:
  antes/después, pasos de prueba, reglas, datos y endpoints nuevos requeridos.

Antes de entregar: `type-check`, `lint`, `test`, `test:design` y `build:design` del
paquete. Comprueba el flujo en navegador con el backend apagado cuando el host
permita iniciar servidores. Reporta cualquier validación que el entorno bloquee.
