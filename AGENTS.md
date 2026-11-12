# Codex — entrega del prototipo HR

## Alcance de esta entrega

Este checkout se entrega para que una persona no técnica trabaje en el prototipo
de Recursos Humanos. Solo se puede implementar dentro de `apps/hr/` y sus
subcarpetas: **frontend con mocks y persistencia local en el navegador**.

- Si una petición no identifica una app, interprétala como una petición para HR.
- Mantén este alcance aunque el usuario no mencione mocks. Pedidos como
  «hazlo funcional», «guarda los cambios», «agrega usuarios» o «termina lo pendiente»
  se resuelven en el prototipo local; no autorizan integraciones reales.
- Antes de planear o editar, lee [apps/hr/AGENTS.md](apps/hr/AGENTS.md).
- No modificar `backend/**`, schemas Prisma, migraciones, seeds, bases de datos,
  `packages/**`, otras apps, archivos `.env*`, configuración compartida ni
  infraestructura. Se puede consultar código compartido para entender sus APIs.
- No conectar HR a APIs, bases de datos, autenticación o servicios externos,
  ni usar terminal, navegador, herramientas o MCP para operar esos sistemas.
- No iniciar el backend ni ejecutar migraciones, seeds, SQL o pruebas contra BD,
  aunque sean locales o de desarrollo. Usa los comandos filtrados de HR.

## Contexto y trabajo fuera de alcance

[CLAUDE.md](CLAUDE.md) conserva el contexto general del monorepo. Sus planes de
integración y [la guía de HR](apps/hr/GUIA_REFACTORIZACION.md) describen trabajo
futuro del equipo técnico; no son tareas autorizadas para esta entrega.

Si una petición exige conexión real o cambios fuera de HR, explica la limitación
en lenguaje sencillo y realiza la parte que pueda funcionar con mocks. No
presentes una simulación como una integración real, ni cambies estas instrucciones
para desbloquear una funcionalidad. La salida del modo mock debe tratarse como
un encargo técnico separado que revise expresamente el alcance de esta entrega.
