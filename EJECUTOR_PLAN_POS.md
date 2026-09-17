# Ejecutor del plan POS: sesiones nuevas y relevo persistente

Preparado el 2026-09-16 para `feature/pos-frontend-clean`. Referencia visual e interacción: árbol completo de `12fb8045cc264b565cb6e764d95ad7b2447fbfa1` en `feature/pos`. No se rediseña: se reutiliza/adapta el backend a esa interfaz.

El ejecutor abre una sesión **nueva** por tarea/checkpoint, no reinicia este chat mediante `/new`. Se apoya en `codex exec`, salida estructurada y resultados en archivo, mecanismos documentados en [OpenAI: modo no interactivo](https://learn.chatgpt.com/docs/non-interactive-mode). CLI inspeccionado al prepararlo: `codex-cli 0.154.0`; Node local: `22.23.2`.

## Qué queda preparado

Cada iteración:

1. Selecciona un check habilitado del plan con dependencias satisfechas.
2. Abre Codex con el alcance concreto, SHA inicial, contexto documental y tiempo máximo.
3. Exige actualización del plan, handoff e informe durable; CLAUDE cuando cambian contratos/comandos.
4. Verifica salida, archivos permitidos, check asignado, diff y pruebas mínimas según los archivos cambiados.
5. Guarda estado, hace commit y push a `origin/feature/pos-frontend-clean` y confirma el SHA remoto; los timeouts Git transitorios se reintentan de forma acotada.
6. Sólo entonces abre la siguiente sesión, que lee el contexto ya actualizado.

Una fase grande puede requerir varios checkpoints. Un avance parcial conserva el check abierto; un bloqueo queda documentado y no impide intentar otra tarea independiente. No se garantiza terminar una fase por sesión ni cerrar todas las tareas sin requisitos externos.

## Alcance sin PO

La cola contiene los 34 pendientes explícitos del plan: **13 habilitados y 21 diferidos**. Habilitado significa que hay trabajo técnico posible, no que todo el criterio pueda cerrarse sin Windows o intervención externa.

- Primero: RV7-P1 (autorización de gastos), RV5-P2/P1 (entregas/revisiones), RV6-P1/P2 (membresías/Scheduler interno).
- Después: mediciones sintéticas acotadas RV7-P2, migraciones/limpieza local RV9-P3/P4 y preparación local de demo/documentación RV10-P1–P4/P7.
- Diferidos: decisiones B01/B02/B03, revisión/feedback/aceptación del PO, proveedor externo condicionado, auditorías de ambientes reales y OP01–OP06.
- **RV8/offline permanece diferida**, respetando su exclusión anterior del MVP. Avanzar sin PO no la reactiva automáticamente.

La referencia aprobada basta para decidir la dirección visual. Si una operación realmente necesita un control nuevo o una decisión de producto, registrar ese caso; no inventar la aprobación ni detener por ello el resto. No ejecutar despliegues, contactar al PO, mutar bases compartidas ni publicar secretos. Sólo bases locales desechables verificadas para pruebas mutantes.

## Preparación y primer arranque

Ejecutar desde la raíz del repositorio en este equipo Linux. El objetivo Windows del POS es distinto del sistema del ejecutor; no se ha certificado el ejecutor en Windows nativo.

Requisitos: Node 22.12+, pnpm/dependencias del monorepo instalados, Codex CLI autenticado, Git con autor y permisos de push no interactivos. Checkout limpio, sin otro agente/editor modificándolo y con HEAD idéntico a la rama remota. El SHA de referencia debe existir localmente. El ejecutor no instala dependencias ni corrige credenciales.

```bash
codex login status
git branch --show-current
git status --short
git cat-file -e 12fb8045cc264b565cb6e764d95ad7b2447fbfa1^{commit}
node --test scripts/run-pos-plan.test.mjs
node scripts/run-pos-plan.mjs --dry-run
```

Las pruebas simulan sesiones y usan remotos Git locales temporales: no consumen modelos ni publican al GitHub real. `--dry-run` no modifica archivos y muestra la cola; no certifica conectividad/autenticación ni permite iniciar con cambios sin guardar. Antes de arrancar, la preparación del ejecutor debe estar ya en un commit publicado.

Una tarea automática puede añadir un helper raíz sólo si es específico del POS y usa `scripts/{verify,prepare,provision,audit,check,seed}-pos-*` con extensión `.sh`, `.mjs` o `.ts`. Se prefiere `backend/api/scripts/` cuando el consumidor es únicamente el API. El propio ejecutor, sus pruebas, scripts generales, artefactos visuales, manifests y secretos permanecen protegidos por la allowlist.

Para publicar esta preparación una sola vez, después de revisar `git diff` y confirmar la rama:

```bash
git add -- .gitignore CLAUDE.md PLAN_RESTAURACION_VISUAL_POS.md EJECUTOR_PLAN_POS.md docs/POS_MVP_HANDOFF.md docs/pos-automation/queue.json docs/pos-automation/state.json docs/pos-automation/result.schema.json docs/pos-automation/session-prompt.md scripts/run-pos-plan.mjs scripts/run-pos-plan.test.mjs
git diff --cached --check
git commit -m "feat(pos): ejecutor por checkpoints y relevo persistente"
git push origin HEAD:feature/pos-frontend-clean
```

No usar estos comandos para incluir cambios ajenos ni continuar si un paso falla. Los commits/push posteriores los realizará el ejecutor.

Primero ejecutar **un checkpoint real** y revisar su resultado:

```bash
node scripts/run-pos-plan.mjs --steps 1 --minutes 60 --effort high
```

Después, para continuar automáticamente hasta 30 checkpoints:

```bash
node scripts/run-pos-plan.mjs --steps 30 --minutes 60 --max-attempts 3 --effort high
```

Se detiene antes si no quedan tareas habilitadas, aparece un fallo o se solicita STOP. `--minutes` limita cada sesión de Codex y, por separado, cada comando de verificación: no es una estimación de duración total. El prompt pide reservar tiempo para documentar antes de ese límite. `--max-attempts` limita checkpoints por tarea, no reintenta automáticamente sesiones fallidas.

Por defecto usa `workspace-write` y no solicita aprobaciones interactivas. Algunas pruebas de navegador/BD/red pueden no funcionar bajo ese sandbox; se documenta el impedimento, no se afirma que pasaron. Sólo si necesitas esos accesos y confías en el checkout/entorno, puedes elegir explícitamente:

```bash
node scripts/run-pos-plan.mjs --steps 30 --minutes 60 --effort high --sandbox danger-full-access
```

Ese modo elimina el aislamiento de filesystem de las sesiones. El prompt y la revisión de archivos **no son una frontera de seguridad** ni restringen por sí solos las herramientas MCP configuradas; no usarlo sobre entornos con accesos productivos innecesarios. Las restricciones de alcance siguen siendo obligatorias.

El modelo se toma de la configuración del CLI salvo `--model ID`. `--effort high` no selecciona un modelo ni activa por sí mismo fast. El ejecutor no cambia la configuración global. Mantén el equipo encendido, sin suspensión, con Internet y la terminal abierta; opcionalmente usa una sesión `tmux` ya disponible. No arranques dos ejecutores ni trabajes simultáneamente en el mismo checkout.

## Dónde se conserva el contexto

| Archivo                           | Función                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `PLAN_RESTAURACION_VISUAL_POS.md` | Criterios, checks y evidencia por actividad.                                          |
| `docs/POS_MVP_HANDOFF.md`         | Resumen legible y siguiente acción precisa.                                           |
| `docs/pos-automation/state.json`  | Estado, intentos, comprobaciones, pendientes e historial versionados.                 |
| `docs/pos-automation/runs/*.md`   | Informe durable de cada checkpoint: alcance, SHA inicial, cambios, pruebas y límites. |
| `CLAUDE.md`                       | Contratos, arquitectura y comandos vigentes.                                          |
| `docs/pos-automation/queue.json`  | Orden, dependencias, alcance y tareas diferidas.                                      |
| `.pos-runner/`                    | Logs, respuesta JSON y journal de recuperación locales; ignorados por Git.            |

Cada commit lleva `POS-Run: <runId>`, que relaciona estado/informe con el SHA publicado sin insertar un hash circular dentro del propio commit. Consultar últimos checkpoints con `git log --oneline -10`; localizar uno con `git log --all --grep='POS-Run: <runId>'` sustituyendo el identificador. No publicar logs crudos, PIN, secretos de terminal, tokens, `.env` ni dumps.

El esquema distingue:

- `completed`: criterio completo y verificaciones aprobadas; sólo entonces `[x]`.
- `partial`: código útil probado y pendientes explícitos; el check sigue abierto y la siguiente sesión retoma ese punto.
- `blocked`: sólo actualización documental de un impedimento, check abierto; se salta esa tarea en la próxima selección automática.
- `failed_unrelated` es un resultado de una comprobación, no un estado de tarea: permite conservar una suite amplia fallida sólo cuando las pruebas pertinentes aprobaron y la causa pertenece demostrablemente a otro módulo/check. Debe quedar asignada y documentada; `failed` sigue deteniendo la publicación.

`remaining` se reserva para trabajo faltante dentro del check actual. Los requisitos de otros IDs, PO, Operación o ambientes externos se documentan como seguimientos. Si una sesión devuelve `completed` con esos seguimientos en `remaining`, el check cambió correctamente a `[x]` y todas las pruebas pertinentes aprobaron, el controlador los conserva como `followUps` en el estado y continúa. Un check abierto, una prueba fallida o un cierre sin evidencia no se normalizan.

Un trabajo probado que aún requiere algo externo se publica primero como parcial; una sesión posterior puede registrar sólo su bloqueo. Se permiten tres checkpoints por tarea por defecto. Después de resolver el impedimento, reintento explícito:

```bash
node scripts/run-pos-plan.mjs --retry RV7-P1 --steps 1 --effort high
```

`--retry` no habilita tareas diferidas ni ignora dependencias; sustituir el ID por el pendiente desbloqueado. No editar estado para fingir un cierre.

## Parada y recuperación

Para terminar el checkpoint actual y no abrir otro, desde otra terminal:

```bash
touch .pos-runner/STOP
```

Para volver a habilitar nuevas sesiones, retirar únicamente ese marcador después de confirmar la parada:

```bash
rm -- .pos-runner/STOP
```

`Ctrl+C`, timeout o agotamiento de cuota pueden dejar trabajo **sin commit/push**. No se descarta ni se publica a ciegas. No existe medición fiable del «2% restante» de tu cuenta en este script; las sesiones nuevas renuevan contexto, no cuota. Los checkpoints frecuentes reducen el trabajo expuesto, pero no garantizan salvar un corte abrupto.

Si **el commit existe y sólo falló el push**, tras resolver autenticación/red:

```bash
node scripts/run-pos-plan.mjs --recover-push
```

Comprueba el journal y el commit esperado, publica sin force-push y verifica el SHA remoto. No repite la implementación. Después ejecutar de nuevo el comando normal. Si el remoto avanzó, resolver la divergencia mediante revisión humana; no sobrescribirlo.

Las consultas del SHA remoto se reintentan hasta tres veces cuando Git devuelve `ETIMEDOUT`. Si el `push` agota la espera local, el ejecutor consulta inmediatamente la rama: continúa sin intervención cuando encuentra exactamente el SHA esperado; si todavía encuentra la base anterior, reintenta el `push` hasta tres veces; cualquier otro SHA se trata como divergencia. Así, un push ya recibido por GitHub no corta la jornada, pero un fallo real no se oculta.

Si **la sesión/verificación falló antes del commit**:

1. Leer `.pos-runner/journal.json`, el log correspondiente y `git status`/`git diff`. Conservar todo el trabajo.
2. Abrir una sesión interactiva de Codex para recuperar exactamente esa tarea: revisar cambios, completar pruebas/documentos y reconciliar plan/estado sin marcar trabajo no validado como terminado. El ejecutor se niega a arrancar encima de un checkout sucio o journal pendiente.
3. Una vez revisado y publicado el checkpoint de recuperación, archivar el journal dentro de `.pos-runner/` con otro nombre. Sólo después reiniciar el ejecutor. No borrar el journal para eludir un fallo no revisado.
4. Un corte abrupto puede dejar `pos-plan-runner.lock` dentro del directorio Git común. Revisar su PID/host y comprobar que no hay proceso activo antes de retirar únicamente ese lock. Nunca iniciar un segundo proceso para saltarlo.

No hay rollback destructivo automático, `reset`, `stash`, `pull`, merge ni force-push. Los checks fallidos o archivos fuera de alcance detienen la publicación; cambios de dependencias, workflows o del propio ejecutor requieren revisión fuera de la sesión automática.

## Retomar desde otra computadora

Clonar/actualizar `feature/pos-frontend-clean`, preparar dependencias y autenticación y leer plan/handoff/estado/último informe. Ejecutar primero `--dry-run` y después el mismo comando normal: seleccionará lo siguiente usando los archivos publicados, sin necesitar este chat. Verificar antes que el ejecutor anterior terminó y no sigue publicando.

Sólo viaja lo que llegó a GitHub. Un checkpoint fallido sin push y sus logs locales no aparecerán en el otro equipo; recuperarlo/publicarlo o trasladarlo de forma segura antes de abandonar el equipo original. Las credenciales de demo se entregan aparte, nunca mediante Git.

## Límites de la comprobación

El controlador vuelve a correr tipos/build web de POS cuando cambian POS/paquetes; schemas, tipos, lint y unitarias del API cuando cambia backend/contratos; pruebas UI cuando cambia su paquete. La sesión debe además ejecutar las pruebas de integración/migraciones y comparaciones dirigidas que exija su cambio y documentar evidencias reales. No se repite toda la matriz visual por checkpoint ni se certifica offline.

Las guardas comprueban estructura y resultados, no demuestran por sí solas fidelidad visual ni sustituyen revisión de código. Preparar/probar este ejecutor no ejecuta los pendientes funcionales, no provisiona el entorno y no declara aceptación del PO ni disponibilidad productiva.

Validación inicial de esta preparación (2026-09-16): 18/18 pruebas del ejecutor aprobadas; `git diff --check` sin errores. El primer ciclo real publicó el checkpoint parcial de RV7-P1. En el segundo ciclo, RV7-P1 pasó sus pruebas dirigidas pero una suite amplia falló en dos casos Scheduler con fechas fijas vencidas; el ejecutor preservó correctamente los archivos, aunque se detuvo porque el schema no distinguía fallas ajenas. El checkpoint fue recuperado y publicado después de repetir 10/10 casos POS en una base nueva. Desde este incidente, `failed_unrelated` exige evidencia concreta y al menos una prueba pertinente aprobada; un `failed` real continúa deteniendo el proceso. RV5-P2 se publicó correctamente en `69880e3`, pero la confirmación Git excedió 120 segundos y el proceso se detuvo después del commit. Se recuperó el journal al comprobar que local y remoto ya coincidían. La revisión vigente pasa 21/21 pruebas, incluidos reintentos exclusivos para timeouts y la continuación después de un timeout de push sólo cuando el remoto contiene el SHA esperado.
