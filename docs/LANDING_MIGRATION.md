# Migración de `keysar-landing` a `apps/landing`

## Objetivo

Migrar la experiencia pública del repositorio hermano `../keysar-landing` a
`apps/landing` sin incorporar el stack desechable de Astro. La implementación
destino debe respetar el monorepo: Next.js 14 App Router, React 18, TypeScript,
Tailwind CSS 3, pnpm workspaces y Turborepo.

## Reglas de trabajo

- Rama destino: `feature/landing`.
- El repo fuente es sólo una referencia; no debe modificarse.
- La fuente de verdad queda dentro de `apps/landing`.
- No copiar `package.json`, lockfile, configuración de Astro ni Tailwind 4.
- Configurar `NEXT_PUBLIC_SITE_URL` con el origen público de cada ambiente para
  generar metadata social absoluta; el fallback local es `http://localhost:3000`.
- Conservar contenido, diseño, comportamiento, accesibilidad y SEO de la landing.
- Incluir también los cambios locales vigentes del repo fuente: cupón `KEYSAR15`,
  sucursal Opatra Galería Insurgentes e imagen de Piernas Cansadas.
- No hacer commits ni push desde los chats de migración; la persona responsable
  del repositorio hará cada commit.

## Estado

| Fase | Alcance                                              | Estado     |
| ---- | ---------------------------------------------------- | ---------- |
| 0    | Inventario, estrategia y contexto transferible       | Completada |
| 1    | Base Next.js, metadata, estilos de marca y assets    | Completada |
| 2    | Secciones estáticas y navegación responsive          | Completada |
| 3    | Tratamientos, testimonios y reels interactivos       | Completada |
| 4    | Formulario de cita, WhatsApp y cupón `KEYSAR15`      | Completada |
| 5    | Validación integral, QA visual y documentación final | Completada |

## Fases transferibles

### Fase 0 — Inventario y contrato de migración

Entregables:

- Comparativa de stacks y decisión explícita de conservar Next.js.
- Inventario de componentes, contenido y assets del repo fuente.
- Registro de cambios locales no confirmados que deben incluirse.
- Este documento y la referencia de estado en `CLAUDE.md`.

Criterio de salida: otro chat puede iniciar la Fase 1 leyendo sólo
`CLAUDE.md` y este archivo.

### Fase 1 — Base Next.js y sistema visual

Entregables:

- Ruta pública `/` en App Router sin shells de autenticación o dashboard.
- Metadata, viewport, idioma y fuentes mediante APIs de Next.js.
- Tokens de marca y fondos equivalentes adaptados a Tailwind 3.
- Assets copiados bajo `apps/landing/public` y referenciados desde `/`.

Validación: `pnpm --filter @cosmetics/landing type-check` y build sin errores
de estructura, imports o configuración.

### Fase 2 — Contenido estático

Entregables:

- Navbar, hero, esencia, ubicaciones, CTA, footer y acceso flotante a WhatsApp.
- Navegación por anclas y menú responsive accesible.
- Cuarta ubicación Opatra incluida.

Validación: navegación por teclado, enlaces externos seguros y layout responsive.

### Fase 3 — Experiencias interactivas

Entregables:

- Carruseles y detalle modal de tratamientos faciales/corporales.
- Carrusel de testimonios con pausa y controles.
- Carrusel de reels y reproductor modal con carga diferida de video.

Validación: Escape, restauración de foco, bloqueo de scroll, controles y estados
ARIA; sin descargar videos hasta que la persona usuaria los abra.

### Fase 4 — Conversión de cita

Entregables:

- Formulario de cita en React con URL dinámica de WhatsApp.
- Validación básica de teléfono y selección de tratamiento/sucursal.
- Modal de cross-sell `KEYSAR15`, confirmación visible y código incluido en el
  mensaje de WhatsApp.

Validación: flujo con y sin cupón, nueva sucursal y mensaje final codificado.

### Fase 5 — Cierre y QA

Entregables:

- `type-check`, lint y build de `@cosmetics/landing`.
- Revisión visual desktop/mobile y corrección de regresiones.
- Revisión de rutas de assets, metadata, accesibilidad y peso de medios.
- Estado final y decisiones registradas en este documento y `CLAUDE.md`.

Criterio de salida: implementación lista para que la persona responsable revise,
haga commits por fase y publique la rama.

## Instrucción para retomar en otro chat

Usar este prompt:

> Continúa la migración de la landing en la rama `feature/landing`. Lee primero
> `CLAUDE.md` y `docs/LANDING_MIGRATION.md`, revisa `git status`, ejecuta sólo la
> primera fase pendiente, valida sus criterios de salida y actualiza ambos
> documentos. No hagas commit ni push y no modifiques `../keysar-landing`.

## Bitácora

- 2026-09-25: se confirmó `feature/landing` limpia en el destino. El repo fuente
  está en `master` con cambios locales en `AppointmentSection.astro`,
  `LocationsSection.astro` y `TreatmentsSection.astro`; esos cambios son parte
  del estado a migrar.
- 2026-09-25: se migraron 82 assets (210,665,220 bytes) sin alterar el repo
  fuente. La landing quedó implementada como página pública estática de Next.js
  en `apps/landing`, sin dependencias de Astro ni cambios al lockfile.
- 2026-09-25: se validaron TypeScript, ESLint sin advertencias y `next build`.
  La ruta `/` se prerenderiza como contenido estático con 16 kB de JavaScript de
  página y 103 kB de carga inicial reportados por Next.js.
- 2026-09-25: QA visual completado con Chrome en viewports de 1440 × 900 y
  390 × 844. El smoke interactivo cubrió tabs y modal de tratamientos, modal y
  carga diferida de reels, Escape/restauración de foco, menú móvil y formulario
  de cita con Opatra + `KEYSAR15`. No se detectaron errores propios de la app.
