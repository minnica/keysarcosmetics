# Empieza aquí

No necesitas conocer el código existente. Tu responsabilidad es explicar cómo debe funcionar la
nómina y decidir cómo quieres recorrerla; el agente convierte esas decisiones en el prototipo.

## Primer mensaje para el agente

Copia y pega este mensaje al iniciar una sesión nueva:

```text
Estamos trabajando en el prototipo de Payroll. Lee completos:
- apps/payroll/PROTOTYPE_BRIEF.md
- apps/payroll/AGENTS.md
- apps/payroll/HANDOFF.md

Quiero diseñar la aplicación desde cero y yo te explicaré el proceso de nómina. Trabaja solamente
dentro de apps/payroll. No uses ni modifiques backend, API, autenticación, Prisma, base de datos,
paquetes compartidos, variables de entorno o deploy.

Antes de escribir código, pregúntame por el primer proceso que quiero resolver. Ayúdame a definir
qué necesita ver la persona, qué decisiones toma, qué captura y qué resultado espera. Muéstrame
un esquema breve del flujo para aprobarlo y después impleméntalo con datos ficticios en memoria.
Documenta en HANDOFF.md cualquier dato o regla que después necesite backend.
```

## Durante el trabajo

- Trabajen un proceso importante a la vez.
- Si algo no refleja la operación real, corrígelo antes de avanzar aunque visualmente se vea bien.
- Usa nombres como `PERSONA DEMO 01`; nunca compartas información real de empleados.
- Pide al agente que haga un commit cuando una pantalla o flujo quede aprobado.
- No aceptes que el agente cambie backend «para que funcione»: en este prototipo todo se simula.

## Cómo ver el prototipo

Pide al agente que ejecute:

```bash
pnpm --filter @cosmetics/payroll dev
```

Después abre `http://localhost:3002`.

## Antes de terminar una sesión

Pide al agente que ejecute:

```bash
pnpm --filter @cosmetics/payroll validate
```

Esa validación comprueba que el trabajo permanezca dentro de Payroll, que no existan integraciones
reales y que lint, TypeScript y el build sigan funcionando.
