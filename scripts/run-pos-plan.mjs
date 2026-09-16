// Ejecutor secuencial: sesiones nuevas, relevo persistente y push verificado.
import { execFileSync, spawn } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  openSync,
  closeSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";

export const PLAN = "PLAN_RESTAURACION_VISUAL_POS.md";
export const HANDOFF = "docs/POS_MVP_HANDOFF.md";
export const CONFIG = "docs/pos-automation/queue.json";
export const STATE = "docs/pos-automation/state.json";
const PROMPT = "docs/pos-automation/session-prompt.md";
const SCHEMA = "docs/pos-automation/result.schema.json";
const BRANCH = "feature/pos-frontend-clean";
const REFERENCE = "12fb8045cc264b565cb6e764d95ad7b2447fbfa1";
const rootDefault = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function assert(value, message) {
  if (!value) throw new Error(message);
}
function command(root, executable, args, options = {}) {
  return execFileSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}
function git(root, ...args) {
  return command(root, "git", args).trim();
}
function read(root, file) {
  return readFileSync(path.join(root, file), "utf8");
}
function json(root, file) {
  return JSON.parse(read(root, file));
}
function atomic(file, value) {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporary, file);
}

export function planChecks(text) {
  const result = new Map();
  for (const match of text.matchAll(
    /^- \[([ x])\] \*\*((?:RV\d+-(?:P\d+|B\d+)|OP\d+))(?=[ :·])/gm,
  )) {
    assert(!result.has(match[2]), `ID duplicado: ${match[2]}`);
    result.set(match[2], match[1] === "x");
  }
  return result;
}

export function validateQueue(queue, plan, state) {
  assert(
    queue.branch === BRANCH &&
      queue.remote === "origin" &&
      queue.reference === REFERENCE,
    "Rama/remoto/referencia inesperados en la cola.",
  );
  const ids = queue.tasks.map((t) => t.id);
  const checks = planChecks(plan);
  assert(
    ids.length === new Set(ids).size && checks.size === ids.length,
    "Cola y checks del plan no coinciden.",
  );
  assert(
    state.version === 1 && state.tasks && Array.isArray(state.history),
    "Estado inválido.",
  );
  for (const t of queue.tasks) {
    assert(
      checks.has(t.id) && ["automatic", "deferred"].includes(t.mode),
      `Tarea inválida: ${t.id}`,
    );
    assert(
      typeof t.scope === "string" &&
        t.scope.length > 0 &&
        Array.isArray(t.dependsOn),
      `Alcance inválido: ${t.id}`,
    );
    for (const dep of t.dependsOn)
      assert(ids.includes(dep) && dep !== t.id, `Dependencia inválida: ${dep}`);
    const saved = state.tasks[t.id];
    if (saved) {
      assert(
        ["completed", "partial", "blocked"].includes(saved.status),
        `Estado desconocido: ${t.id}`,
      );
      assert(
        (saved.status === "completed") === checks.get(t.id),
        `Estado/check divergen: ${t.id}`,
      );
    }
  }
  for (const id of Object.keys(state.tasks))
    assert(ids.includes(id), `Estado sin tarea: ${id}`);
  const visit = (id, trail) => {
    assert(!trail.includes(id), `Dependencia circular: ${id}`);
    for (const dep of queue.tasks.find((t) => t.id === id).dependsOn)
      visit(dep, [...trail, id]);
  };
  for (const id of ids) visit(id, []);
}

export function nextTask(queue, state, plan, maxAttempts = 3, retry = null) {
  const checks = planChecks(plan);
  const eligible = (t) =>
    t.mode === "automatic" &&
    !checks.get(t.id) &&
    t.dependsOn.every((id) => checks.get(id));
  if (retry) {
    const t = queue.tasks.find((t) => t.id === retry);
    assert(
      t && eligible(t),
      `No se puede reintentar ${retry}: diferida, completa o dependencias pendientes.`,
    );
    return t;
  }
  return (
    queue.tasks.find(
      (t) =>
        eligible(t) &&
        state.tasks[t.id]?.status !== "blocked" &&
        (state.tasks[t.id]?.attempts ?? 0) < maxAttempts,
    ) ?? null
  );
}

export function allowedPath(file, report) {
  const parts = file.split("/");
  if (
    parts.some(
      (p) =>
        p.startsWith(".") ||
        ["node_modules", "dist", "dist-electron"].includes(p),
    )
  )
    return false;
  if (/\.(?:pem|key|p12|pfx|sqlite|db|log)$/i.test(file)) return false;
  if (/(^|\/)(?:package\.json|pnpm-lock\.yaml|AGENTS\.md)$/.test(file))
    return false;
  if (
    file.startsWith("docs/artifacts/") ||
    file.startsWith("apps/e2e/pos-visual/")
  )
    return false;
  if (file.startsWith("docs/pos-automation/")) return file === report;
  return (
    [
      PLAN,
      HANDOFF,
      "CLAUDE.md",
      "GUIA_PRUEBA_PO_POS_WINDOWS.md",
      "PROMPT_CODEX_PRUEBA_PO_POS_WINDOWS.md",
    ].includes(file) ||
    [
      "apps/pos/",
      "backend/api/src/",
      "backend/api/prisma/",
      "backend/api/scripts/",
      "packages/types/src/",
      "packages/api-client/src/",
      "packages/ui/src/",
    ].some((p) => file.startsWith(p)) ||
    /^docs\/(?:POS_|SCHEDULER_PHASE_5_POS_INTEGRATION\.md)/.test(file) ||
    /^apps\/e2e\/[^/]*pos[^/]*\//.test(file)
  );
}

export function validateResult(result, task, before, after, files, report) {
  assert(
    result.taskId === task.id &&
      ["completed", "partial", "blocked"].includes(result.outcome),
    "Resultado con ID/estado inválido.",
  );
  assert(
    typeof result.summary === "string" &&
      result.summary.trim() &&
      typeof result.nextStep === "string" &&
      result.nextStep.trim() &&
      Array.isArray(result.remaining) &&
      result.remaining.every((x) => typeof x === "string"),
    "Falta resumen/relevo válido.",
  );
  assert(
    Array.isArray(result.checks) &&
      result.checks.every(
        (c) =>
          c &&
          typeof c.command === "string" &&
          typeof c.evidence === "string" &&
          ["passed", "failed", "not_run"].includes(c.result),
      ),
    "Verificaciones inválidas.",
  );
  assert(
    !result.checks.some((c) => c.result === "failed"),
    "Hay pruebas fallidas; se conserva el trabajo sin publicarlo.",
  );
  if (result.outcome === "completed") {
    assert(
      result.remaining.length === 0,
      "Completada con pendientes declarados.",
    );
    assert(
      result.checks.length > 0 &&
        result.checks.every((c) => c.result === "passed"),
      "Cierre sin todas las verificaciones aprobadas.",
    );
  } else
    assert(
      result.remaining.length > 0,
      "Un checkpoint parcial/bloqueado debe explicar pendientes.",
    );
  const oldChecks = planChecks(before),
    newChecks = planChecks(after);
  assert(
    oldChecks.size === newChecks.size &&
      [...oldChecks.keys()].every((id) => newChecks.has(id)),
    "Se alteró el inventario de checks.",
  );
  for (const [id, done] of oldChecks) {
    assert(
      newChecks.get(id) ===
        (id === task.id ? result.outcome === "completed" : done),
      `Check alterado sin autorización: ${id}`,
    );
  }
  for (const required of [PLAN, HANDOFF, report])
    assert(files.includes(required), `Falta actualizar ${required}`);
  for (const file of files)
    assert(allowedPath(file, report), `Archivo fuera de alcance: ${file}`);
  const sources = files.filter((f) => !f.endsWith(".md"));
  if (sources.length)
    assert(
      result.checks.some((c) => c.result === "passed"),
      "Cambio de código sin pruebas registradas.",
    );
  if (result.outcome === "blocked")
    assert(
      sources.length === 0,
      "Para publicar un bloqueo deja sólo documentación. Si hay código útil probado, usa partial y documenta su límite.",
    );
}

function changedFiles(root) {
  const tracked = command(root, "git", [
    "diff",
    "--name-only",
    "-z",
    "HEAD",
  ]).split("\0");
  const untracked = command(root, "git", [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ]).split("\0");
  return [...new Set([...tracked, ...untracked].filter(Boolean))];
}
function snapshot(root, files) {
  return JSON.stringify(
    [...files].sort().map((file) => {
      const absolute = path.join(root, file);
      // No seguir enlaces al leer ni publicar el checkpoint.
      for (
        let current = absolute;
        current !== root;
        current = path.dirname(current)
      ) {
        if (existsSync(current))
          assert(
            !lstatSync(current).isSymbolicLink(),
            `Enlace no permitido: ${file}`,
          );
      }
      return [
        file,
        existsSync(absolute)
          ? createHash("sha256").update(readFileSync(absolute)).digest("hex")
          : null,
      ];
    }),
  );
}
function ensureClean(root) {
  assert(
    !git(root, "status", "--porcelain"),
    "Hay cambios locales. Guarda/revisa el checkpoint antes de iniciar.",
  );
}
function ensureBranch(root, queue) {
  assert(
    git(root, "branch", "--show-current") === queue.branch,
    "Rama incorrecta o HEAD detached.",
  );
}
function remoteHead(root, queue) {
  const lines = git(
    root,
    "ls-remote",
    "--heads",
    queue.remote,
    `refs/heads/${queue.branch}`,
  );
  assert(lines, "La rama remota no existe.");
  return lines.split(/\s+/)[0];
}
function publish(root, queue, sha, base) {
  const current = remoteHead(root, queue);
  assert(
    current === base || current === sha,
    "El remoto avanzó o divergió; no se hará force-push ni merge automático.",
  );
  if (current !== sha)
    git(root, "push", queue.remote, `HEAD:refs/heads/${queue.branch}`);
  assert(
    remoteHead(root, queue) === sha,
    "No se pudo confirmar el SHA remoto.",
  );
}

export function verificationCommands(files) {
  const commands = [];
  if (
    files.some((f) => f.startsWith("apps/pos/") || f.startsWith("packages/"))
  ) {
    commands.push(["pnpm", ["--filter", "@cosmetics/pos", "type-check"]]);
    commands.push(["pnpm", ["--filter", "@cosmetics/pos", "build:web"]]);
  }
  if (
    files.some(
      (f) =>
        f.startsWith("backend/api/") ||
        f.startsWith("packages/types/") ||
        f.startsWith("packages/api-client/"),
    )
  ) {
    for (const script of ["prisma:schemas", "type-check", "lint", "test:unit"])
      commands.push(["pnpm", ["--filter", "@cosmetics/api", script]]);
  }
  if (files.some((f) => f.startsWith("packages/ui/")))
    commands.push(["pnpm", ["test:ui"]]);
  return commands;
}

export function runProcess(
  executable,
  args,
  { root, logFile, minutes = 60, input = "" },
) {
  return new Promise((resolve, reject) => {
    const log = createWriteStream(logFile, { flags: "a", mode: 0o600 });
    const child = spawn(executable, args, {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    let failure = null,
      killTimer;
    const stop = (reason) => {
      if (failure) return;
      failure = new Error(reason);
      const kill = (signal) => {
        try {
          if (process.platform === "win32") child.kill(signal);
          else process.kill(-child.pid, signal);
        } catch {
          /* Ya terminó. */
        }
      };
      kill("SIGTERM");
      killTimer = setTimeout(() => kill("SIGKILL"), 10_000);
    };
    const interrupt = () =>
      stop(
        "Ejecución interrumpida; revisar journal y archivos antes de continuar.",
      );
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    const timer = setTimeout(
      () => stop("Tiempo máximo alcanzado; checkpoint conservado localmente."),
      minutes * 60_000,
    );
    const heartbeat = setInterval(
      () =>
        console.log(`[POS] ${executable} sigue activo; log local: ${logFile}`),
      30_000,
    );
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.once("error", (error) => {
      failure = error;
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      clearInterval(heartbeat);
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
      log.end(() =>
        failure || code !== 0
          ? reject(
              failure ??
                new Error(
                  `${executable} terminó con código ${code}; consultar log local.`,
                ),
            )
          : resolve(),
      );
    });
  });
}

export async function runSession(context, options) {
  const args = [
    "--ask-for-approval",
    "never",
    "exec",
    "--sandbox",
    options.sandbox,
    "--cd",
    context.root,
    "--json",
    "--output-schema",
    path.join(context.root, SCHEMA),
    "--output-last-message",
    context.resultFile,
  ];
  if (options.model) args.push("--model", options.model);
  if (options.effort)
    args.push("-c", `model_reasoning_effort="${options.effort}"`);
  args.push("-");
  await runProcess("codex", args, {
    root: context.root,
    logFile: context.logFile,
    minutes: options.minutes,
    input: context.prompt,
  });
  return JSON.parse(readFileSync(context.resultFile, "utf8"));
}

function acquireLock(root) {
  const directory = path.resolve(
    root,
    git(root, "rev-parse", "--git-common-dir"),
  );
  const file = path.join(directory, "pos-plan-runner.lock");
  let fd;
  try {
    fd = openSync(file, "wx", 0o600);
  } catch {
    throw new Error(
      `Existe ${file}. Comprueba PID/host y que no haya otro ejecutor antes de retirar un lock huérfano.`,
    );
  }
  writeFileSync(
    fd,
    JSON.stringify({
      pid: process.pid,
      host: hostname(),
      startedAt: new Date().toISOString(),
    }),
  );
  closeSync(fd);
  return () => unlinkSync(file);
}

export async function execute(options, dependencies = {}) {
  const root = options.root ?? rootDefault;
  const queue = json(root, CONFIG);
  let state = json(root, STATE);
  validateQueue(queue, read(root, PLAN), state);
  ensureBranch(root, queue);
  if (options.dryRun) {
    const next = nextTask(
      queue,
      state,
      read(root, PLAN),
      options.maxAttempts,
      options.retry,
    );
    console.log(
      `Rama: ${queue.branch}\nReferencia: ${queue.reference}\nSiguiente: ${next?.id ?? "ninguna habilitada"}`,
    );
    for (const t of queue.tasks)
      console.log(
        `${t.id}: ${state.tasks[t.id]?.status ?? (planChecks(read(root, PLAN)).get(t.id) ? "completed" : t.mode)} — ${t.scope}`,
      );
    return;
  }
  assert(
    git(root, "rev-parse", "--show-toplevel") === path.resolve(root),
    "Ejecutar desde un checkout normal del repositorio.",
  );
  (
    dependencies.verifyReference ??
    (() => git(root, "cat-file", "-e", `${queue.reference}^{commit}`))
  )();
  ensureClean(root);
  assert(
    git(root, "check-ignore", ".pos-runner/probe") === ".pos-runner/probe",
    "Falta ignorar .pos-runner/.",
  );
  const release = acquireLock(root);
  const runtime = path.join(root, ".pos-runner");
  const journalFile = path.join(runtime, "journal.json");
  try {
    mkdirSync(runtime, { recursive: true, mode: 0o700 });
    if (options.recoverPush) {
      assert(existsSync(journalFile), "No hay push pendiente.");
      const journal = JSON.parse(readFileSync(journalFile, "utf8"));
      assert(
        ["ready_commit", "committed"].includes(journal.stage),
        "No hay commit validado para recuperar; revisar el trabajo manualmente.",
      );
      const sha = git(root, "rev-parse", "HEAD");
      assert(
        sha !== journal.base &&
          git(root, "rev-parse", "HEAD^") === journal.base &&
          git(root, "log", "-1", "--format=%B").includes(
            `POS-Run: ${journal.runId}`,
          ),
        "HEAD no corresponde al checkpoint esperado.",
      );
      if (journal.sha)
        assert(sha === journal.sha, "HEAD cambió después del checkpoint.");
      publish(root, queue, sha, journal.base);
      unlinkSync(journalFile);
      console.log(
        `Push recuperado y confirmado: ${sha}. Vuelve a ejecutar para continuar.`,
      );
      return;
    }
    assert(
      !existsSync(journalFile),
      "Existe una ejecución interrumpida. Consulta .pos-runner/journal.json y la guía de recuperación.",
    );
    assert(
      remoteHead(root, queue) === git(root, "rev-parse", "HEAD"),
      "HEAD y remoto difieren. Sincronízalos antes de ejecutar.",
    );
    for (let step = 0; step < options.steps; step++) {
      if (existsSync(path.join(runtime, "STOP"))) {
        console.log("STOP solicitado; no se inicia otra sesión.");
        break;
      }
      ensureClean(root);
      ensureBranch(root, queue);
      state = json(root, STATE);
      const before = read(root, PLAN);
      validateQueue(queue, before, state);
      const task = nextTask(
        queue,
        state,
        before,
        options.maxAttempts,
        step === 0 ? options.retry : null,
      );
      if (!task) {
        console.log(
          "Sin tareas técnicas habilitadas. Revisar bloqueos, dependencias y decisiones aplazadas.",
        );
        break;
      }
      const base = git(root, "rev-parse", "HEAD");
      assert(
        remoteHead(root, queue) === base,
        "El remoto cambió; detener para revisar.",
      );
      const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${task.id}`;
      const report = `docs/pos-automation/runs/${runId}.md`;
      const context = {
        root,
        task,
        base,
        report,
        runId,
        resultFile: path.join(runtime, `${runId}.json`),
        logFile: path.join(runtime, `${runId}.log`),
        prompt: `${read(root, PROMPT)}\n\n## Bloque asignado\n${JSON.stringify(task, null, 2)}\nSHA inicial: ${base}\nInforme obligatorio: ${report}\nLímite duro: ${options.minutes} minutos; reserva los últimos 10 para verificar y documentar.\nEstado previo: ${JSON.stringify(state.tasks[task.id] ?? null)}\n`,
      };
      const journal = {
        stage: "session",
        taskId: task.id,
        runId,
        base,
        report,
      };
      atomic(journalFile, journal);
      console.log(
        `[POS] Iniciando sesión nueva: ${task.id} (${step + 1}/${options.steps})`,
      );
      const result = await (dependencies.sessionRunner ?? runSession)(
        context,
        options,
      );
      ensureBranch(root, queue);
      assert(
        git(root, "rev-parse", "HEAD") === base,
        "La sesión modificó el historial Git; detener.",
      );
      const files = changedFiles(root);
      validateResult(result, task, before, read(root, PLAN), files, report);
      assert(
        read(root, HANDOFF).includes(task.id) &&
          read(root, report).includes(task.id),
        "Documentos sin ID de tarea.",
      );
      git(root, "diff", "--check");
      const verifiedSnapshot = snapshot(root, files);
      const independentChecks = [];
      for (const [executable, args] of verificationCommands(files)) {
        console.log(
          `[POS] Verificación independiente: ${executable} ${args.join(" ")}`,
        );
        await (dependencies.verifier ?? runProcess)(executable, args, {
          root,
          logFile: path.join(runtime, `${runId}-checks.log`),
          minutes: options.minutes,
        });
        independentChecks.push({
          command: [executable, ...args].join(" "),
          result: "passed",
        });
      }
      // Los tests/builds no pueden introducir archivos nuevos sin revisar.
      assert(
        JSON.stringify(changedFiles(root).sort()) ===
          JSON.stringify([...files].sort()),
        "Las verificaciones alteraron el conjunto de archivos.",
      );
      assert(
        snapshot(root, files) === verifiedSnapshot,
        "Las verificaciones modificaron archivos del checkpoint.",
      );
      validateResult(result, task, before, read(root, PLAN), files, report);
      const attempts = (state.tasks[task.id]?.attempts ?? 0) + 1;
      const record = {
        id: task.id,
        runId,
        base,
        status: result.outcome,
        attempts,
        summary: result.summary,
        checks: result.checks,
        independentChecks,
        remaining: result.remaining,
        nextStep: result.nextStep,
        report,
        updatedAt: new Date().toISOString(),
      };
      state.tasks[task.id] = record;
      state.history.push(record);
      atomic(path.join(root, STATE), state);
      journal.stage = "ready_commit";
      atomic(journalFile, journal);
      git(root, "add", "--", ...files, STATE);
      git(root, "diff", "--cached", "--check");
      git(
        root,
        "commit",
        "-m",
        `chore(pos): ${task.id} ${result.outcome}`,
        "-m",
        `POS-Run: ${runId}`,
      );
      journal.sha = git(root, "rev-parse", "HEAD");
      journal.stage = "committed";
      atomic(journalFile, journal);
      ensureClean(root);
      publish(root, queue, journal.sha, base);
      unlinkSync(journalFile);
      console.log(
        `[POS] ${task.id}: ${result.outcome}; commit y push confirmados: ${journal.sha}`,
      );
      if (existsSync(path.join(runtime, "STOP"))) {
        console.log("STOP solicitado; checkpoint publicado.");
        break;
      }
    }
  } finally {
    release();
  }
}

export function parseArgs(args) {
  const options = {
    steps: 1,
    minutes: 60,
    maxAttempts: 3,
    sandbox: "workspace-write",
  };
  const flags = {
    "--steps": "steps",
    "--minutes": "minutes",
    "--max-attempts": "maxAttempts",
    "--sandbox": "sandbox",
    "--model": "model",
    "--effort": "effort",
    "--retry": "retry",
  };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "--recover-push") options.recoverPush = true;
    else if (flag === "--help") options.help = true;
    else {
      assert(
        flags[flag] && args[i + 1] && !args[i + 1].startsWith("--"),
        `Opción inválida/incompleta: ${flag}`,
      );
      options[flags[flag]] = args[++i];
    }
  }
  for (const key of ["steps", "minutes", "maxAttempts"]) {
    options[key] = Number(options[key]);
    assert(
      Number.isInteger(options[key]) &&
        options[key] >= 1 &&
        options[key] <= 240,
      `Límite inválido: ${key}`,
    );
  }
  assert(
    ["workspace-write", "danger-full-access"].includes(options.sandbox),
    "Sandbox inválido.",
  );
  if (options.effort)
    assert(
      ["low", "medium", "high", "xhigh"].includes(options.effort),
      "Esfuerzo inválido.",
    );
  if (options.retry) assert(options.steps === 1, "--retry requiere --steps 1.");
  return options;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help)
      console.log(
        "Uso: node scripts/run-pos-plan.mjs [--dry-run] [--steps 1] [--minutes 60] [--max-attempts 3] [--model ID] [--effort high] [--sandbox workspace-write|danger-full-access] [--retry ID] [--recover-push]\nGuía: EJECUTOR_PLAN_POS.md. No se ejecutan tareas al usar --dry-run.",
      );
    else await execute(options);
  } catch (error) {
    console.error(
      `[POS] Pausado: ${error.message}\nNo se descartan cambios. Consulta EJECUTOR_PLAN_POS.md y .pos-runner/journal.json.`,
    );
    process.exitCode = 1;
  }
}
