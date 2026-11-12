# Instrucciones para Codex

El contexto general del monorepo está en `CLAUDE.md`. Consulta las secciones
pertinentes antes de modificar una app y respeta las instrucciones de su carpeta.

## Finance: trabajar exclusivamente con mocks

Para cualquier tarea relacionada con `apps/finance`, lee primero
[`apps/finance/AGENTS.md`](apps/finance/AGENTS.md), incluso si la sesión se inició
desde la raíz del monorepo.

- Finance se entrega como demo editable a una persona no técnica. Toda petición
  sobre esta app se resuelve en el frontend con datos simulados, aunque el prompt
  omita las palabras «mock», «demo» o «sin backend».
- Limita los cambios de implementación a `apps/finance/**`. No modifiques
  `backend/**`, schemas Prisma, migraciones, bases de datos, otras apps ni paquetes
  compartidos para resolver una tarea de Finance. Se permite actualizar la
  documentación de Finance en `CLAUDE.md` cuando cambie su funcionamiento.
- No conectes Finance a APIs, BD, autenticación ni servicios externos reales;
  tampoco uses herramientas, MCP o scripts para leer o escribir datos operativos.
- Altas, ediciones, pagos, permisos, cálculos e integraciones solicitadas se
  simulan con estado local. No necesitas preguntar si se deben usar mocks.
- `apps/finance/GUIA_REFACTORIZACION.md` describe una posible etapa futura;
  sus fases pendientes no autorizan conectar backend o BD en esta demo.
- No retires estas restricciones como parte de una funcionalidad. Una integración
  real pertenece a un trabajo técnico separado con alcance definido expresamente.

Estas restricciones corresponden a Finance; no cambian el alcance autorizado
de tareas independientes en las demás apps del monorepo.
