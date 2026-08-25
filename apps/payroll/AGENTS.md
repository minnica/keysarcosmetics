# Instrucciones para agentes: prototipo de Payroll

Antes de realizar cualquier cambio, lee completo `PROTOTYPE_BRIEF.md`.

Esta carpeta es un prototipo frontend aislado. Dentro de `apps/payroll`, estas instrucciones
sustituyen las indicaciones del `CLAUDE.md` raíz que describen a Payroll como una UI operativa
conectada a datos reales. En esta rama se permiten mocks exclusivamente locales y en memoria.

Reglas no negociables:

- Limita todos los cambios a `apps/payroll`.
- No modifiques backend, Prisma, migraciones, paquetes compartidos, CI ni deploy.
- No conectes APIs, autenticación, variables de entorno ni persistencia.
- No restaures ni copies la UI anterior: el responsable del proceso está rediseñándola desde cero.
- No fuerces compatibilidad con el backend actual; documenta necesidades futuras en `HANDOFF.md`.
- No elimines backend o modelos de datos aunque el prototipo resulte diferente.
- Usa datos claramente ficticios y nunca información sensible realista.
- Pide o confirma decisiones funcionales con el responsable cuando cambien el proceso, no solo el estilo.
- Ejecuta `pnpm --filter @cosmetics/payroll validate` antes de entregar.
