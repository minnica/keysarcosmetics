# Contexto local: prototipo de Payroll

Lee primero `PROTOTYPE_BRIEF.md` y sigue también `AGENTS.md`.

La UI operativa anterior fue retirada intencionalmente en esta rama para permitir un rediseño desde
cero dirigido por la persona que conoce el proceso de nómina. Las descripciones de la implementación
actual en el `CLAUDE.md` raíz son referencia histórica y técnica; no son una especificación visual ni
obligan al prototipo a conservar sus contratos.

Trabaja solo dentro de `apps/payroll`. No toques backend, Prisma, BD, autenticación, paquetes
compartidos, infraestructura ni despliegues. Usa datos ficticios únicamente en memoria y documenta
en `HANDOFF.md` cualquier necesidad futura de integración.
