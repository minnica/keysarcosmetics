# Brief del prototipo de Payroll

## Propósito

Esta rama es un espacio de descubrimiento funcional y diseño para una persona que conoce la
operación de nómina. La meta es definir desde cero cómo debe sentirse y funcionar la aplicación,
sin heredar la interfaz anterior ni quedar limitada por el backend o el modelo de datos actuales.

El frontend operativo anterior fue retirado solo de esta rama. Continúa disponible en el historial
de Git y en las ramas de integración.

## Autoridad sobre el diseño

La persona responsable del proceso define la navegación, agrupación de tareas, contenido, orden,
jerarquía visual y flujos. El agente ayuda a convertir esas decisiones en una interfaz funcional;
no debe imponer el diseño histórico ni reconstruirlo por su cuenta.

## Alcance permitido

- Modificar únicamente `apps/payroll`.
- Crear rutas y componentes frontend con Next.js App Router, React y TypeScript strict.
- Usar Tailwind CSS, `@cosmetics/ui`, Lucide, React Hook Form, Zod y Recharts cuando aporten al flujo.
- Crear datos completamente ficticios y mantenerlos solo en memoria durante la sesión.
- Crear tipos locales de UI aunque sean distintos de los contratos actuales del backend.
- Documentar necesidades futuras de datos en `apps/payroll/HANDOFF.md`.
- Leer otros módulos solamente como referencia técnica o de marca, sin modificarlos.

## Fuera de alcance

No modificar ni crear nada en:

- `backend/api`
- `backend/api/prisma` o cualquier migración
- `packages/*`
- `.github/*`
- configuración de Vercel, Fly.io o Supabase
- archivos raíz del monorepo, incluido `CLAUDE.md`, salvo autorización explícita del propietario

También está prohibido:

- Consumir APIs reales con `fetch`, Axios o `@cosmetics/api-client`.
- Implementar autenticación o importar `@cosmetics/auth`.
- Crear API routes de Next.js, Server Actions que persistan datos o conexiones a BD.
- Usar variables de entorno, secretos o credenciales.
- Persistir información operativa en `localStorage`, IndexedDB, cookies o archivos.
- Restaurar la UI eliminada desde otra rama salvo petición explícita del propietario.
- Eliminar o adaptar el backend/BD existente. Esa decisión se tomará después de aprobar el prototipo.

## Libertad respecto al backend actual

El prototipo no tiene que mantener compatibilidad con endpoints, tablas, modelos Prisma ni contratos
existentes. Si un flujo necesita conceptos diferentes, debe representarlos con tipos y datos locales.

Cada necesidad que eventualmente requiera backend se registra en `HANDOFF.md` con esta estructura:

```md
## Nombre del flujo
- Información que necesita mostrar:
- Información que captura o modifica:
- Reglas y validaciones observadas:
- Estados posibles:
- Acciones y permisos esperados:
- Dudas por resolver:
```

Después de aprobar el diseño, el propietario decidirá por separado qué backend se conserva, adapta,
migra o retira. Cualquier eliminación de modelos o datos requerirá una tarea explícita, revisión de
impacto, respaldo y una migración controlada; nunca se deriva automáticamente del prototipo.

## Inventario funcional inicial

Este inventario sirve como punto de conversación, no como estructura de navegación obligatoria:

- Resumen y preparación de nómina.
- Nómina de salario fijo, especialistas y comisiones.
- Comisiones de gerencia.
- Bonos, multas, viáticos y otros movimientos.
- Gastos relacionados con la nómina.
- Esquemas de comisión.
- Préstamos y adelantos.
- Recibos.
- Reportes y desglose por sucursal.
- Accesos y permisos.

La persona responsable puede reagrupar, renombrar, combinar o descartar elementos conforme explique
el proceso real.

## Datos mock

- Usar nombres inequívocos como `PERSONA DEMO 01` y `SUCURSAL DEMO NORTE`.
- No copiar nombres, teléfonos, cuentas, salarios o importes reales.
- Centralizar los fixtures en `src/prototype/data/` cuando exista más de una pantalla.
- Mantener una sola fuente de estado React para que los flujos sean navegables durante la sesión.
- Simular esperas y errores únicamente cuando ayuden a diseñar estados de interfaz.

## Calidad mínima

- La interfaz debe funcionar en móvil y escritorio sin scroll horizontal accidental.
- Todos los controles deben ser accesibles por teclado y tener foco visible.
- Botones y mensajes deben describir claramente la acción o el siguiente paso.
- Incluir estados vacíos, carga, validación, error y confirmación cuando el flujo los requiera.
- Usar componentes de `@cosmetics/ui` cuando exista un equivalente; no modificar el paquete compartido.
- No usar SVG manual para iconos si existe un icono adecuado en Lucide.
- Mantener los datos capturados mientras se navega dentro de la sesión del prototipo.

## Forma de trabajar

1. Explicar un proceso y sus decisiones antes de construir su pantalla.
2. Implementar un flujo vertical completo y navegable.
3. Revisarlo con la persona responsable del proceso.
4. Corregirlo antes de abrir otro flujo grande.
5. Mantener commits pequeños por pantalla, flujo o corrección.
6. Actualizar `HANDOFF.md` cuando una decisión implique datos, permisos o reglas futuras.

## Validación antes de entregar

```bash
pnpm --filter @cosmetics/payroll check:prototype
pnpm --filter @cosmetics/payroll lint
pnpm --filter @cosmetics/payroll type-check
pnpm --filter @cosmetics/payroll build
```

También puede ejecutarse todo en orden con:

```bash
pnpm --filter @cosmetics/payroll validate
```
