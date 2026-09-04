# Autorización, sesiones y alcance del POS

Esta guía describe la operación incorporada en la Fase 9 de `PLAN_BACKEND_POS.md`. La fuente de verdad del esquema es `backend/api/prisma/schema.prisma`; su duplicado histórico bajo `backend/api/src/prisma/` debe permanecer idéntico.

## Principios

- El JWT identifica una sesión, pero no congela permisos ni sucursales. Cada request online revalida `PosSession`, credencial, terminal, sucursal, permisos y asignaciones vigentes.
- Master recibe todas las sucursales activas. Un puesto o credencial con asignaciones recibe sólo la unión explícita y no puede iniciar sesión en una terminal cuya sucursal quede fuera de ella. Sin asignaciones, el operador permanece en la sucursal de sesión.
- Un filtro vacío significa “todas las autorizadas” y se convierte en la lista exacta de IDs antes de consultar. Un ID fuera del conjunto devuelve `403`.
- Las migraciones sólo crean catálogo técnico. Nunca asignan permisos, puestos, credenciales o sucursales a personas existentes.

## Provisión de permisos y sucursales

El bootstrap administrativo `GET /api/pos/access/bootstrap` devuelve el árbol versionado y las asignaciones actuales. Los cambios usan una autorización master de un solo uso emitida dentro de la misma sesión:

1. Para permisos de puesto, crear una autorización con propósito `POSITION_PERMISSIONS_UPDATE`, `entityType=Position` y el ID del puesto; consumirla en `PUT /api/pos/access/positions/:id/permissions`.
2. Para sucursales de puesto, usar `POSITION_BRANCH_SCOPE_UPDATE` y consumirla en `PUT /api/pos/access/positions/:id/branches`.
3. Para una excepción por credencial, usar `CREDENTIAL_BRANCH_SCOPE_UPDATE`, `entityType=PosCredential`, y consumirla en `PUT /api/pos/access/credentials/:id/branches`.

Los cuerpos de alcance contienen `branchIds` explícitos. Una sucursal inactiva o inexistente se rechaza y no se conservan asignaciones implícitas derivadas de ventas.

## Autorización personal

`POST /api/pos/personal-authorizations` recibe únicamente `pin`, `purpose` y un `scope` opcional. El backend compara el PIN con la credencial autenticada; no permite seleccionar otra identidad mediante `sellerId`, alias o campos adicionales. El token opaco dura dos minutos, se guarda sólo como hash y queda ligado a credencial, terminal y sesión. Verificar o consumir desde otra sesión devuelve `403`.

## Salir sin Close day

`POST /api/pos/session/exit` requiere `SESSION_EXIT` —master lo incluye— y revoca `PosSession`, autorizaciones personales pendientes y autorizaciones master pendientes de esa sesión. La auditoría usa `POS_SESSION_EXIT_WITHOUT_CLOSE_DAY`.

Esta acción no cierra ni actualiza `PosBusinessDay`, `PosAttendance`, conteos, gastos, caja o tickets. La asistencia personal puede seguir abierta hasta un Clock Out manual o el cierre real de jornada.

## Clock In/Out y vendedores de venta

- Clock In recibe PIN y un `branchId` autorizado, verifica pertenencia laboral y reutiliza la única asistencia abierta del empleado cuando ya existe.
- Clock Out exige el PIN del mismo empleado. Repetir la salida manual sobre ese registro devuelve el mismo DTO; un registro cerrado por `CLOSE_DAY` no se presenta como salida manual.
- `GET /api/pos/sale/sellers` lista asistencias abiertas de la sucursal. `query` permite buscar activos ausentes y `customerId` incorpora al propietario vigente de cartera aunque esté ausente.
- Al crear el ticket, el servidor vuelve a validar vendedores, sucursal y propietario. `PosTicketSeller` conserva si cada vendedor estaba presente, la sucursal y el ID de asistencia como snapshot histórico.

## Invalidación y despliegue

El renderer consulta `/auth/me` cada 15 segundos cuando está online. Al retirar permisos actualiza destinos y cierra la vista protegida; al revocar sesión, terminal, credencial o sucursal vuelve al login. Ninguno de estos cambios borra históricos.

Antes de desplegar:

```bash
pnpm --filter @cosmetics/api prisma:schemas
DATABASE_URL=postgresql://local:local@127.0.0.1:5432/local \
DIRECT_URL=postgresql://local:local@127.0.0.1:5432/local \
pnpm --filter @cosmetics/api prisma:validate
pnpm migrations:review -- origin/develop
pnpm --filter @cosmetics/api test:unit
pnpm --filter @cosmetics/api type-check
pnpm --filter @cosmetics/api lint
pnpm --filter @cosmetics/api build
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos exec vite build
```

La reconstrucción de migraciones y `RUN_DATABASE_TESTS=true pnpm test:integration` deben ejecutarse contra PostgreSQL 16 desechable. No usar `prisma db push`, no revertir la migración aplicada y no probar con production.
