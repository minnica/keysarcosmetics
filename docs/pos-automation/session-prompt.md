# Contrato de cada sesión automática POS

Ejecuta exclusivamente el bloque asignado al final de este prompt. El ejecutor es secuencial y abrirá una sesión nueva para cada bloque/checkpoint. No dependas de conversaciones anteriores.

## Contexto obligatorio

1. Lee `CLAUDE.md`, `PLAN_RESTAURACION_VISUAL_POS.md`, `docs/POS_MVP_HANDOFF.md`, `docs/pos-automation/state.json` y el último informe de esta tarea si existe. Revisa las instrucciones aplicables del repositorio.
2. La referencia de presentación e interacción es el árbol completo `12fb8045cc264b565cb6e764d95ad7b2447fbfa1` de `feature/pos`. Usa `git show` y los manifiestos/baseline existentes para resolver dudas. El PO ya definió la dirección visual; no le pidas aprobarla otra vez.
3. Usa el backend existente como primera opción; adapta/refactoriza lo necesario para los controles aprobados. No agregues pantallas/campos ni cambies estilos para acomodar contratos. Conserva auditoría, idempotencia, proyecciones compartidas y datos.
4. La intervención del PO está aplazada. No inventes decisiones B01/B02/B03 ni aprobación humana. No implementes una operación sin control aprobado; documenta esa parte como bloqueo y completa el trabajo independiente del bloque.

## Alcance y límites de ejecución

- Trabaja sólo en la rama asignada y en el bloque indicado. No hagas commit, add, push, pull, stash, merge, rebase, reset, checkout ni cambios de rama. El ejecutor administra Git después de validar tu salida.
- No inicies otras sesiones/agentes ni otro ejecutor. No modifiques scripts del ejecutor, su prompt, cola, schema o estado. No modifiques AGENTS.md, configuraciones Codex, workflows, lockfile o manifests de dependencias. Si algo de eso es necesario, reporta el bloqueo.
- No cambies el baseline, los manifiestos de referencia, el capturador ni el comparador para aprobar una diferencia. Nunca conviertas mock en validación de persistencia.
- Se permiten código POS/backend relacionado, contratos compartidos, pruebas pertinentes y documentación. Ningún despliegue, mutación en servicios externos, BD compartida/productiva, comunicación al PO ni limpieza destructiva. Para pruebas mutantes usa sólo una BD local desechable dedicada; verifica destino explícitamente y no asumas que DATABASE_URL o .env son de prueba. No cargues credenciales operativas.
- Si preparas fixtures/provisionamiento, deja herramientas opt-in con guardas de destino local, datos sintéticos y secretos generados localmente, no hardcodeados ni impresos en reportes. No ejecutar el seed general.
- Si el bloque requiere un helper nuevo en `scripts/`, debe ser exclusivamente POS, usar uno de los nombres `verify-pos-*`, `prepare-pos-*`, `provision-pos-*`, `audit-pos-*`, `check-pos-*` o `seed-pos-*` y extensión `.sh`, `.mjs` o `.ts`. Prefiere `backend/api/scripts/` cuando sólo lo consume el API. El ejecutor y sus pruebas siguen fuera de alcance.
- Conserva los datos/outboxes y cualquier trabajo previo. No incluyas secretos, archivos .env, logs crudos o volcados en documentos versionados.
- Verifica en proporción al cambio: tipos/build de POS; tipos/lint/unitarias del API y schemas/migraciones/integración en BD desechable si afectan backend/Prisma; consumidores compartidos pertinentes. Compara sólo superficies visibles afectadas. No repitas toda la matriz visual por bloque.
- Tienes un límite de tiempo comunicado al final. Reserva tiempo para guardar el checkpoint y documentación; si no cabe todo, finaliza con `partial`. Si dependes de PO, hardware, Windows ausente, permisos o infraestructura externa, termina `blocked` después de completar y documentar lo independiente.
- No declares `completed` sin cumplir el check completo del plan y sus pruebas. Una preparación parcial para Windows/PO no completa su aceptación. Usa `partial` para publicar código útil probado y detallar lo faltante; si sólo falta un requisito externo, la siguiente sesión registrará `blocked` mediante documentación. Un resultado `blocked` sólo puede cambiar documentos, para no publicar código sin verificar.
- Clasifica un comando como `failed` si afecta el bloque o deja incierto su criterio: el ejecutor se detendrá. Usa `failed_unrelated` únicamente para una suite amplia cuya falla esté fuera de los archivos/criterios del bloque, después de que las pruebas pertinentes hayan pasado; registra prueba, causa y asignación futura concretas en evidencia, informe, plan y handoff. Nunca uses esa categoría para eludir un gate exigido por el check. Usa `not_run` sólo si el comando realmente no se ejecutó.

## Documentación obligatoria antes de finalizar

1. Actualiza únicamente el check asignado en `PLAN_RESTAURACION_VISUAL_POS.md`: `[x]` sólo si `completed`; en otro caso mantener `[ ]`. Añade debajo evidencia/checkpoint y referencia al informe del bloque. No cierres otras tareas por inferencia ni reescribas criterios para hacer pasar la tarea.
2. Actualiza `docs/POS_MVP_HANDOFF.md`: ID actual, qué cambió, decisiones, verificaciones ejecutadas/no ejecutadas, estado parcial/bloqueo y siguiente acción precisa. Distingue evidencia histórica de esta ejecución.
3. Escribe el informe en la ruta exacta proporcionada: tarea, SHA inicial, referencia visual, archivos, backend reutilizado/refactor, verificaciones y resultados, pendientes, limitaciones y comandos para continuar. No uses `/tmp` como única evidencia. No atribuyas aprobación al PO.
4. Actualiza `CLAUDE.md` si cambia un contrato, módulo, comando o arquitectura; conserva el objetivo visual y las decisiones de la sesión anterior.
5. Detén servidores/procesos temporales que hayas iniciado. No elimines datos para limpiar tests; documenta los recursos locales que deba conservar la próxima sesión.
6. Responde exclusivamente el JSON del schema proporcionado, con taskId exacto, outcome, summary, checks, remaining y nextStep. Cada check debe indicar un comando real, resultado y evidencia concreta. No afirmar pruebas omitidas como aprobadas ni registrar como `failed` una falla diagnosticada y documentada como estrictamente ajena: usa `failed_unrelated` bajo la regla anterior.

El ejecutor verificará estado de Git, documentos, check del plan y pruebas mínimas según archivos cambiados. Sólo entonces guardará el estado, hará commit y push. Si falla, deja los archivos para recuperación; no intentes eludir esa comprobación.
