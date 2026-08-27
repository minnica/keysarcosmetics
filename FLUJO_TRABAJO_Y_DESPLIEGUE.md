# Flujo de trabajo y despliegue seguro

## Resumen del flujo

```text
feature/*
   ↓ Pull Request + CI
develop
   ↓ Deploy y pruebas en development
Pull Request de release + respaldo
   ↓
master
   ↓ Deploy protegido
Producción + validación + tag
```

La diferencia principal es que integrar cambios en `develop` ya no significa desplegarlos inmediatamente en producción.

- `develop` representa el ambiente de desarrollo e integración.
- `master` representa el código autorizado para producción.
- Los cambios llegan mediante Pull Requests.
- El backend y las migraciones se despliegan mediante GitHub Actions.
- Producción requiere respaldo, aprobación, smoke tests y validación manual.

---

# 1. Desarrollo de una funcionalidad

## Crear la rama

Siempre partir del último estado de `develop`:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/nombre-de-la-funcionalidad
```

Ejemplo:

```bash
git switch -c feature/envelope-nueva-funcion
```

## Trabajar localmente

Durante el desarrollo se prueban localmente:

- Frontend.
- Backend.
- Migraciones Prisma.
- Integración con una BD local, de desarrollo o desechable.
- Casos funcionales relacionados con el cambio.

Nunca se utiliza producción como ambiente de pruebas.

## Validaciones locales recomendadas

```bash
pnpm lint
pnpm type-check
pnpm test:ui
pnpm test:ui:visual
pnpm test:unit
pnpm ci:build
```

Si existen cambios en Prisma o el API:

```bash
pnpm --filter @cosmetics/api prisma:schemas
pnpm --filter @cosmetics/api prisma:validate
```

## Subir la rama

```bash
git add .
git commit -m "feat(envelope): descripción del cambio"
git push -u origin feature/envelope-nueva-funcion
```

No hacer push directo a `develop` ni a `master`.

---

# 2. Pull Request hacia `develop`

Abrir un Pull Request con esta dirección:

```text
feature/envelope-nueva-funcion → develop
```

GitHub ejecutará automáticamente:

- Lint.
- TypeScript.
- Contratos y cobertura de UI compartida (`Shared UI contracts`).
- Canaries visuales de UI compartida (`UI regression canaries`).
- Pruebas unitarias.
- Builds productivos.
- Validación de Prisma.
- Aplicación de migraciones sobre PostgreSQL desechable.
- Pruebas de integración del API.

## Condiciones para hacer merge

- [ ] Los cinco checks obligatorios de CI están en verde.
- [ ] No existen conflictos.
- [ ] Se revisó el Preview de Vercel cuando esté disponible.
- [ ] Las migraciones son aditivas o están explícitamente revisadas.
- [ ] No existen secretos ni archivos `.env` en los cambios.

Los errores opcionales de Vercel por `Deployment rate limited` no significan que el código esté mal. Sin embargo, los cinco checks requeridos de CI sí deben pasar.

## Integrar la funcionalidad

Usar:

```text
Squash and merge
```

Después, eliminar la rama remota.

---

# 3. Sincronizar `develop`

Después del merge:

```bash
git switch develop
git pull --ff-only origin develop
git fetch --prune origin
git status
```

El árbol de trabajo debe quedar limpio.

---

# 4. Despliegue en development

## ¿Cuándo desplegar el backend?

Ejecutar el workflow `Deploy API` hacia `development` cuando existan cambios en:

- Backend.
- Prisma.
- Migraciones.
- Configuración del runtime.
- Variables que afecten el API.

Si el cambio es exclusivamente frontend, normalmente no es necesario desplegar el backend.

## Ejecutar el despliegue

En GitHub:

```text
Actions
→ Deploy API
→ Run workflow
→ Branch: develop
→ Environment: development
```

El workflow:

1. Fija el SHA exacto de `develop`.
2. Valida Prisma.
3. Aplica `prisma migrate deploy` en Supabase development.
4. Despliega ese SHA en `cosmetics-api-dev`.
5. Espera que `/ready` responda correctamente.

No desplegar el backend directamente desde la terminal local con Fly.io.

---

# 5. Pruebas en development

## Ejecutar smoke tests

En GitHub:

```text
Actions
→ Environment smoke tests
→ Run workflow
→ Branch: develop
→ Environment: development
```

Los smoke tests comprueban:

- `/health`.
- `/ready`.
- Contrato básico del API.
- Pantalla de login de Envelope.
- Pantalla de login de Payroll.

## Pruebas manuales

Después de los smoke tests:

- [ ] Iniciar sesión en Envelope development.
- [ ] Iniciar sesión en Payroll development.
- [ ] Navegar por las pantallas relacionadas.
- [ ] Probar altas, ediciones y eliminaciones en development.
- [ ] Comprobar permisos y vistas de solo lectura.
- [ ] Revisar los logs del API.
- [ ] Confirmar que no existen errores nuevos.

Los smoke tests son una barrera inicial de solo lectura. No reemplazan las pruebas funcionales manuales.

---

# 6. Acumular cambios en `develop`

No es necesario liberar a producción después de cada merge.

Varias funcionalidades pueden acumularse y validarse en `develop`:

```text
feature/envelope-a ─┐
feature/payroll-b ──┼─→ develop validado
feature/envelope-c ─┘
```

La promoción a producción se realiza cuando el conjunto de cambios esté listo.

---

# 7. Preparar una release de producción

## Requisitos previos

- [ ] `develop` está estable.
- [ ] El deploy de development terminó correctamente.
- [ ] `/health` y `/ready` responden.
- [ ] Los smoke tests de development pasaron.
- [ ] Las pruebas funcionales manuales pasaron.
- [ ] Existe un respaldo recuperable de Supabase producción.

## Abrir el Pull Request

```text
develop → master
```

## Condiciones para el merge

- [ ] GitHub indica que no existen conflictos.
- [ ] Los cinco checks requeridos de CI están en verde.
- [ ] El respaldo de producción está confirmado.
- [ ] Se conoce el alcance exacto de la release.
- [ ] Existe un plan de rollback.

Para releases se utiliza:

```text
Merge pull request
```

No utilizar `Squash and merge` para `develop → master`.

---

# 8. Protección especial de `master`

`master` tiene desactivada la opción:

```text
Require branches to be up to date before merging
```

Esto es intencional porque los merge commits de releases anteriores existen en `master`, pero no regresan automáticamente a `develop`.

La seguridad se conserva porque:

- Los cinco checks de CI siguen siendo obligatorios.
- GitHub debe indicar que no hay conflictos.
- `master` solo debe recibir promociones desde `develop`.
- Los pushes directos y force-push están bloqueados.
- Producción requiere aprobación.

Si excepcionalmente se aplica un hotfix directamente en `master`, debe incorporarse a `develop` antes de la siguiente release.

---

# 9. Desplegar el backend en producción

Si la release contiene backend o migraciones, ejecutar:

```text
Actions
→ Deploy API
→ Run workflow
→ Branch: master
→ Environment: production
→ Confirmación: PRODUCCION_RESPALDADA
```

Después, aprobar manualmente el environment `Production`.

El workflow:

1. Fija el SHA exacto de `master`.
2. Valida schemas y migraciones.
3. Ejecuta `prisma migrate deploy`.
4. Despliega ese mismo SHA en `cosmetics-api`.
5. Espera el health check.
6. Comprueba `/ready`.

---

# 10. Verificar el backend productivo

```bash
curl -fsS https://cosmetics-api.fly.dev/health
curl -fsS https://cosmetics-api.fly.dev/ready
```

Comprobar que:

- `/health` responde con `"status": "ok"`.
- `/ready` responde con `"status": "ready"`.
- El campo `release` coincide con el SHA actual de `master`.

Consultar el SHA:

```bash
git switch master
git pull --ff-only origin master
git rev-parse HEAD
```

---

# 11. Verificar los frontends productivos

Vercel construye los frontends desde `master`.

Comprobar:

- [ ] Envelope está en estado `Ready`.
- [ ] Payroll está en estado `Ready`.
- [ ] Ambos apuntan a `https://cosmetics-api.fly.dev`.
- [ ] El login funciona.
- [ ] La navegación funciona.
- [ ] Los flujos críticos funcionan.
- [ ] No existen errores nuevos en consola o red.

Cuando una release cambie frontend y backend simultáneamente, los cambios deben conservar compatibilidad durante el despliegue.

A futuro, se recomienda configurar promoción manual de los dominios productivos en Vercel para publicar el frontend solamente después de que el API esté listo.

---

# 12. Smoke tests de producción

En GitHub:

```text
Actions
→ Environment smoke tests
→ Run workflow
→ Branch: master
→ Environment: production
```

Después de aprobar el environment:

- [ ] Los cuatro smoke tests pasaron.
- [ ] `/health` reporta el SHA esperado.
- [ ] `/ready` está sano.
- [ ] Envelope funciona.
- [ ] Payroll funciona.

---

# 13. Observación posterior al despliegue

Observar producción durante al menos 15 minutos.

```bash
fly logs -a cosmetics-api --no-tail | tail -n 120
```

Revisar:

- Errores HTTP nuevos.
- Problemas de conexión con PostgreSQL.
- Errores Prisma.
- Fallos de readiness.
- Reinicios inesperados.
- Problemas de autenticación.
- Errores CORS.
- Advertencias relacionadas con el runtime.

Los fallos temporales del health check durante el arranque son aceptables si, segundos después, el check aparece como `passing`.

---

# 14. Crear el tag de producción

Después de completar todas las validaciones:

```bash
git fetch origin --tags

git tag -a prod-AAAA-MM-DD.N \
  SHA_DE_MASTER \
  -m "Production release AAAA-MM-DD"

git push origin refs/tags/prod-AAAA-MM-DD.N

git rev-list -n 1 prod-AAAA-MM-DD.N
```

El SHA devuelto debe ser exactamente el commit desplegado.

El tag funciona como referencia inmutable y punto de rollback.

---

# Matriz según el tipo de cambio

| Tipo de cambio          | Después del merge a `develop`          | Al liberar a producción            |
| ----------------------- | -------------------------------------- | ---------------------------------- |
| Solo frontend           | Preview automático y pruebas manuales  | Vercel desde `master` y validación |
| Solo backend            | Deploy API a development y smoke tests | Deploy API a production            |
| Migración de BD         | CI desechable y Deploy API development | Respaldo y Deploy API production   |
| Frontend + backend + BD | Flujo completo de development          | Flujo completo protegido           |
| Solo documentación      | CI, sin deploy                         | Normalmente sin deploy             |

---

# Diferencia frente al flujo anterior

## Antes

```text
feature
→ pruebas locales
→ develop
→ despliegue productivo manual
```

## Ahora

```text
feature
→ pruebas locales
→ Pull Request
→ CI automático
→ develop
→ deploy aislado en development
→ smoke tests
→ pruebas funcionales
→ respaldo
→ Pull Request de release
→ master
→ deploy productivo protegido
→ smoke tests de producción
→ observación
→ tag
```

---

# Reglas esenciales

1. No hacer push directo a `develop` ni a `master`.
2. No probar migraciones nuevas en producción.
3. No usar `prisma db push`, `migrate reset` ni seeds demo en ambientes compartidos.
4. No desplegar Fly.io directamente desde la terminal local.
5. Todo cambio entra a `develop` mediante PR y squash.
6. Toda release entra a `master` mediante PR y merge commit.
7. Confirmar el respaldo antes de desplegar producción.
8. Los smoke tests no sustituyen las pruebas funcionales.
9. Verificar que `/health` reporte el SHA desplegado.
10. Crear un tag después de validar cada release productiva.
11. Si existe un hotfix en `master`, sincronizarlo con `develop`.
12. Una feature integrada en `develop` no tiene que liberarse inmediatamente a producción.
