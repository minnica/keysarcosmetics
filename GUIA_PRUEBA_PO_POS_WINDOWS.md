# Guía de revisión del MVP POS para el PO en Windows

> Estado documentado: 17 de septiembre de 2026.
> Referencia visual inmutable: `12fb8045cc264b565cb6e764d95ad7b2447fbfa1`.
> Candidato ejecutable vigente: `06f9f6f7741b733bda7770e3b67b714daa59a40b`.
> MVP histórico: `db58fda0aca502f6a543bde03e9fd477b3723caa`, ancestro del candidato.

Hay dos revisiones distintas. La **visual** usa fixtures aislados y se puede
preparar sin API; sirve para revisar presentación, navegación y formularios. La
**funcional** usa Electron, API, PostgreSQL, una terminal activa y credenciales
privadas; sirve para comprobar persistencia, permisos e importes. Una no
sustituye a la otra.

## Estado real antes de empezar

| Revisión   | Lo disponible                                                                 | Lo todavía no comprobado                                                                                   |
| ---------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Visual     | Baseline versionado de 208 capturas y modo fixture explícito                  | Inicio/recorrido de esta guía en el equipo Windows objetivo; el fixture no acredita backend o persistencia |
| Funcional  | Preparación local Linux, dataset sintético y guía/verificador de Windows      | API accesible desde Windows, terminal real, canal privado, login del PO e inicio/reinicio en Windows       |
| Aceptación | Referencia aprobada `12fb804`; evidencia técnica histórica del candidato base | Recorrido y aceptación del PO de RV10-P5/P6/P8                                                             |

Por lo anterior, esta guía **no afirma que la revisión funcional ya esté
disponible para el PO**. No intentar el bloque funcional hasta que Desarrollo
entregue por un canal autorizado el SHA exacto, la URL de la API, la terminal y
las credenciales personales. No abrir puertos, desplegar servicios ni copiar
secretos para sortear ese bloqueo.

## 1. Preparación común

Usar una carpeta nueva. Requisitos: Git, PowerShell, Node.js `22.23.2`, pnpm
`10.0.0` e Internet para instalar dependencias.

```powershell
git clone --branch feature/pos-frontend-clean --single-branch https://github.com/minnica/keysarcosmetics.git keysar-pos-mvp
cd keysar-pos-mvp

git status --short --branch
git rev-parse HEAD
git merge-base --is-ancestor db58fda0aca502f6a543bde03e9fd477b3723caa HEAD
git merge-base --is-ancestor 06f9f6f7741b733bda7770e3b67b714daa59a40b HEAD
git diff --quiet 06f9f6f7741b733bda7770e3b67b714daa59a40b HEAD -- apps/pos backend/api packages/types packages/api-client package.json pnpm-lock.yaml
```

Los tres últimos comandos deben terminar con código `0`. El primer
`merge-base` confirma que el MVP histórico forma parte del candidato; no afirma
que ambos árboles sean idénticos. El segundo y `git diff --quiet` permiten que
`HEAD` incluya el checkpoint documental RV10-P7, pero rechazan cambios
ejecutables posteriores no documentados. Si algún comando falla, detenerse y
pedir a Desarrollo un nuevo SHA; no cambiar de rama ni elegir otro commit por
cuenta propia.

```powershell
node --version
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm --version
pnpm install --frozen-lockfile
```

No editar código, lockfile, baseline o manifiestos para lograr el arranque.

## 2. Revisión visual con fixtures

El código `2468` siguiente pertenece únicamente al fixture visual versionado;
no es una credencial de API, terminal o persona y no debe reutilizarse fuera de
este modo.

```powershell
@'
VITE_POS_DATA_MODE=mock
VITE_POS_VISUAL_FIXTURE=1
VITE_POS_VISUAL_FIXTURE_MASTER_CODE=2468
VITE_POS_VISUAL_FIXTURE_CUSTOMER_ACCESS_COPY=Usa el alias y codigo personal autorizado.
VITE_POS_VISUAL_FIXTURE_CASH_ACCESS_COPY=Usa una credencial personal autorizada.
'@ | Set-Content -Encoding utf8 apps\pos\.env.local

git check-ignore apps/pos/.env.local
git status --short
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos dev
```

Electron debería abrirse. Si no abre, registrar el error sin corregir código.
Acceso del fixture:

- Empresa: `Keysar Cosmetics`.
- Alias: `master`.
- Código visual: `2468`.
- Sucursal: cualquiera que ofrezca el fixture.

Revisar contra `12fb804`, no contra recuerdos de otra maqueta:

1. Login, apertura y navegación/sidebar.
2. Ventas, carrito, descuentos, Checkout y presentación del ticket.
3. Receipts, Customers, Catálogo, inventario y Bodega.
4. Membresías, Citas, Dashboard, caja, X-Report y reportes.
5. Settings, diseño de ticket, estados vacíos/errores y permisos visibles.
6. Escritorio, tablet y móvil mediante redimensionado.

En este modo se pueden inspeccionar controles y transiciones demostrativas. No
registrar como prueba funcional una venta, pago, cancelación, entrega,
autorización, cita o exportación ejecutada contra fixtures.

Al terminar, cerrar Electron y detener Vite con `Ctrl+C`. Confirmar que el
puerto `3005` quedó libre y ejecutar `git status --short`. El `.env.local` debe
seguir ignorado; no borrarlo ni limpiar otros archivos sin autorización.

## 3. Revisión funcional online — bloqueada hasta recibir el entorno

Sólo iniciar cuando Desarrollo confirme todos estos puntos:

- el API y la BD pertenecen a un entorno sintético aislado y exponen el mismo
  SHA candidato;
- Windows puede alcanzar la URL autorizada y el preflight CORS permite el
  origin indicado;
- la terminal está activa y su código/secreto se entregan por canal privado;
- existen credenciales personales master y operador, también por canal privado;
- no se usarán una BD compartida/productiva ni la terminal local `PO-PREP` de
  los ensayos anteriores.

Seguir íntegramente `docs/POS_WINDOWS_API_DEMO.md`. Esa guía captura secretos
con `Read-Host`, ejecuta:

```powershell
node scripts/verify-pos-windows-demo.mjs check
node scripts/verify-pos-windows-demo.mjs probe
pnpm --filter @cosmetics/pos type-check
pnpm --filter @cosmetics/pos build:web
pnpm --filter @cosmetics/pos dev
```

`check`/`probe` deben aprobar antes de abrir Electron. La URL puede registrarse
sólo como host/puerto redactados; no incluir terminal, códigos personales,
tokens, PIN ni logs crudos en el reporte.

Con el entorno autorizado, recorrer uno por uno:

1. Login master/operador, sucursal, permisos, apertura y Clock In.
2. Catálogo/clienta, venta, pago mixto y recuperación del ticket tras recarga.
3. Apartado, abono, liquidación, entrega, consulta y cancelación.
4. Inventario, Bodega, Settings, membresía, reserva y asistencia.
5. Caja, X-Report, reportes/exportaciones, salida sin cierre y Close Day al
   final.
6. Cerrar/reiniciar Electron, volver a ingresar y confirmar persistencia.

Las operaciones que el servidor rechace por las limitaciones documentadas de
RV5-P1 no deben forzarse ni presentarse como éxitos. My Account SaaS y Websites
siguen fuera del backend acordado (B02/B03); el texto B01 de Close Day continúa
pendiente. Offline, instalador, impresoras y hardware pertenecen a RV8.

## 4. Registro de observaciones

Usar un registro por observación:

```text
Modo: visual fixture | funcional API
SHA de HEAD:
SHA reportado por /health (sólo API):
Runtime: Windows / Node / pnpm / Electron
Escenario o pantalla de referencia:
Pasos:
Resultado esperado:
Resultado observado:
Categoría: visual | interacción | fixture | API | solicitud nueva
Severidad:
¿Bloquea el recorrido?:
Captura sin secretos:
```

No atribuir aprobación al PO por ausencia de observaciones ni mezclar resultados
de fixture y API en un mismo `PASS`.

## 5. Evidencia durable y límites

- Referencia visual versionada: `docs/artifacts/pos-visual-baseline/` (208 PNG,
  índice y hashes de `12fb804`).
- Procedimiento del baseline: `docs/POS_VISUAL_BASELINE.md`.
- Comparación histórica del MVP `db58fda`: `docs/POS_MVP_ONLINE_DELIVERY.md` y
  `docs/POS_RV2_PRESENTATION_RESTORATION.md`.
- Evidencia y auditoría de esta guía:
  `docs/pos-automation/runs/2026-09-17T20-13-12-758Z-RV10-P7.md`.

La comparación completa 208/208 del 9 de septiembre se conserva como resumen
versionado; sus directorios candidatos/diff estaban en `/tmp` y no son un
artefacto recuperable desde otra computadora. Desde `db58fda` hubo cambios
funcionales en el renderer, aunque no se alteró el baseline. Esta sesión no
ejecutó una nueva comparación completa del candidato `06f9f6f`, ni Windows ni
el recorrido API del PO. Esas limitaciones deben permanecer visibles hasta que
se produzca la evidencia correspondiente.
