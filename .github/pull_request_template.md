## Alcance

- [ ] El cambio es pequeño y tiene una responsabilidad clara.
- [ ] Actualicé `CLAUDE.md` si cambié arquitectura, ambientes, rutas, Prisma o despliegue.

## Validación

- [ ] Lint, type-check, tests y build aplicables terminaron correctamente.
- [ ] Si cambié `@cosmetics/ui`, agregué o actualicé su contrato, el inventario del barrel cuando aplica y ejecuté `pnpm test:ui:coverage`.
- [ ] Si cambié UI compartida, dependencias UI, tokens, Tailwind o fuentes, ejecuté `pnpm test:ui:visual` y revisé conscientemente los cambios de snapshots.
- [ ] Probé permisos de lectura y escritura cuando corresponde.
- [ ] Revisé el Preview Deployment y los estados responsive relevantes.

## Backend y base de datos

- [ ] No aplica.
- [ ] La API conserva compatibilidad con los frontends ya desplegados.
- [ ] La migración es aditiva o contiene `-- migration-safety: reviewed` con su justificación.
- [ ] No incluí seeds demo, secretos ni datos productivos.

## Release

- [ ] Documenté smoke test y rollback para cualquier cambio productivo.
