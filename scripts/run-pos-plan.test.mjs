// Pruebas del ejecutor con sesiones simuladas y remoto Git local; sin uso de modelos ni red.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  execute,
  parseArgs,
  nextTask,
  validateQueue,
  validateResult,
  allowedPath,
  verificationCommands,
  publish,
  retryTimedOut,
  reconcileCompletedFollowUps,
  PLAN,
  HANDOFF,
  CONFIG,
  STATE,
} from "./run-pos-plan.mjs";

const reference = "12fb8045cc264b565cb6e764d95ad7b2447fbfa1";
const task = {
  id: "RV7-P1",
  mode: "automatic",
  dependsOn: [],
  scope: "Caso sintético.",
};
const task2 = {
  id: "RV5-P1",
  mode: "automatic",
  dependsOn: [],
  scope: "Segundo caso.",
};
const queue = (tasks) => ({
  branch: "feature/pos-frontend-clean",
  remote: "origin",
  reference,
  tasks,
});
const plan = (tasks) =>
  tasks.map((t) => `- [ ] **${t.id} · Desarrollo:** pendiente`).join("\n") +
  "\n";
const state = () => ({ version: 1, tasks: {}, history: [] });
const result = (id = task.id, outcome = "completed") => ({
  taskId: id,
  outcome,
  summary: "Caso simulado validado.",
  checks: [
    {
      command: "revisión sintética",
      result: "passed",
      evidence: "Fixture del test.",
    },
  ],
  remaining: outcome === "completed" ? [] : ["Continuación documentada."],
  nextStep: "Leer siguiente check.",
});
const runGit = (root, ...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
function write(root, file, content) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), content);
}
function fixture(t, tasks = [task]) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "pos-runner-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "checkout"),
    remote = path.join(directory, "remote.git");
  mkdirSync(root);
  runGit(root, "init", "-b", "feature/pos-frontend-clean");
  runGit(root, "config", "user.name", "POS Test");
  runGit(root, "config", "user.email", "pos-test@example.invalid");
  runGit(root, "config", "commit.gpgsign", "false");
  runGit(root, "init", "--bare", remote);
  runGit(root, "remote", "add", "origin", remote);
  write(root, CONFIG, JSON.stringify(queue(tasks)));
  write(root, STATE, JSON.stringify(state()));
  write(root, PLAN, plan(tasks));
  write(root, HANDOFF, "Relevo inicial.\n");
  write(root, "docs/pos-automation/session-prompt.md", "Sesión sintética.");
  write(root, "docs/pos-automation/result.schema.json", "{}");
  write(root, ".gitignore", ".pos-runner/\n");
  runGit(root, "add", ".");
  runGit(root, "commit", "-m", "fixture");
  runGit(root, "push", "-u", "origin", "HEAD");
  return { root, remote, options: { ...parseArgs([]), root } };
}
function finish(context, outcome = "completed") {
  const { root, task: selected, report, runId } = context;
  let content = readFileSync(path.join(root, PLAN), "utf8");
  if (outcome === "completed")
    content = content.replace(
      `- [ ] **${selected.id}`,
      `- [x] **${selected.id}`,
    );
  write(root, PLAN, `${content}\nCheckpoint ${selected.id}: ${runId}\n`);
  write(root, HANDOFF, `${selected.id}: ${outcome}; ${runId}\n`);
  write(root, report, `${selected.id}: evidencia de prueba; ${runId}\n`);
  return result(selected.id, outcome);
}
const dependencies = (sessionRunner) => ({
  verifyReference: () => {},
  sessionRunner,
});

test("la cola real representa los 34 pendientes sin ciclos", () => {
  const root = path.resolve(import.meta.dirname, "..");
  validateQueue(
    JSON.parse(readFileSync(path.join(root, CONFIG))),
    readFileSync(path.join(root, PLAN), "utf8"),
    JSON.parse(readFileSync(path.join(root, STATE))),
  );
});
test("argumentos acotados y sin flags de bypass", () => {
  assert.equal(parseArgs([]).steps, 1);
  assert.equal(parseArgs(["--steps", "8", "--effort", "high"]).steps, 8);
  for (const args of [
    ["--steps", "0"],
    ["--minutes"],
    ["--whatever"],
    ["--retry", task.id, "--steps", "2"],
    ["--sandbox", "none"],
  ])
    assert.throws(() => parseArgs(args));
});
test("selección respeta PO diferido, bloqueos, dependencias y límite de intentos", () => {
  const deferred = { ...task, id: "RV3-B01", mode: "deferred" };
  const dependent = { ...task2, dependsOn: [task.id] };
  const q = queue([deferred, task, dependent]);
  const s = state();
  assert.equal(nextTask(q, s, plan(q.tasks)).id, task.id);
  s.tasks[task.id] = { status: "blocked", attempts: 1 };
  assert.equal(nextTask(q, s, plan(q.tasks)), null);
  assert.equal(nextTask(q, s, plan(q.tasks), 3, task.id).id, task.id);
  s.tasks[task.id] = { status: "partial", attempts: 3 };
  assert.equal(nextTask(q, s, plan(q.tasks)), null);
  assert.throws(() => nextTask(q, s, plan(q.tasks), 3, deferred.id));
});
test("cola rechaza ciclos y estado/check divergente", () => {
  assert.throws(() =>
    validateQueue(
      queue([
        { ...task, dependsOn: [task2.id] },
        { ...task2, dependsOn: [task.id] },
      ]),
      plan([task, task2]),
      state(),
    ),
  );
  const s = state();
  s.tasks[task.id] = { status: "completed" };
  assert.throws(() => validateQueue(queue([task]), plan([task]), s));
});
test("protege baseline, secretos, ejecutor y manifests", () => {
  for (const file of [
    ".env",
    "backend/api/.env.example",
    "docs/pos-automation/state.json",
    "scripts/run-pos-plan.mjs",
    "docs/artifacts/pos-visual-baseline/x.png",
    "apps/e2e/pos-visual/reference-fixture.json",
    "apps/pos/package.json",
    "AGENTS.md",
  ])
    assert.equal(allowedPath(file, "report.md"), false, file);
  assert.equal(
    allowedPath("apps/pos/src/renderer/src/App.tsx", "report.md"),
    true,
  );
  assert.equal(
    allowedPath("scripts/verify-pos-migration-recovery.sh", "report.md"),
    true,
  );
  assert.equal(allowedPath("apps/pos/.env.example", "report.md"), true);
  assert.equal(
    allowedPath("scripts/verify-pos-windows-demo.test.mjs", "report.md"),
    true,
  );
  assert.equal(allowedPath("scripts/verify-scheduler.sh", "report.md"), false);
});
test("rechaza documentación incompleta, pruebas fallidas y cierre de otro check", () => {
  const report = "docs/pos-automation/runs/test.md";
  const files = [PLAN, HANDOFF, report],
    before = plan([task, task2]);
  const after = before.replace("[ ]", "[x]");
  validateResult(result(), task, before, after, files, report);
  assert.throws(() =>
    validateResult(result(), task, before, after, [PLAN], report),
  );
  validateResult(
    {
      ...result(),
      checks: [
        ...result().checks,
        {
          command: "suite amplia",
          result: "failed_unrelated",
          evidence:
            "Falló únicamente una prueba fechada de otro módulo; la prueba dirigida del bloque aprobó.",
        },
      ],
    },
    task,
    before,
    after,
    files,
    report,
  );
  assert.throws(() =>
    validateResult(
      {
        ...result(),
        checks: [
          {
            command: "suite amplia",
            result: "failed_unrelated",
            evidence: "ajena",
          },
        ],
      },
      task,
      before,
      after,
      files,
      report,
    ),
  );
  assert.throws(() =>
    validateResult(
      {
        ...result(),
        checks: [{ command: "test", result: "failed", evidence: "falló" }],
      },
      task,
      before,
      after,
      files,
      report,
    ),
  );
  assert.throws(() =>
    validateResult(
      result(),
      task,
      before,
      after.replace("[ ]", "[x]"),
      files,
      report,
    ),
  );
  assert.throws(() =>
    validateResult(result(), task, before, before, files, report),
  );
});
test("conserva seguimientos externos sin detener un criterio ya cerrado", () => {
  const before = plan([task, task2]);
  const after = before.replace("[ ]", "[x]");
  const reconciled = reconcileCompletedFollowUps(
    {
      ...result(),
      remaining: ["RV8 y la aceptación humana continúan diferidas."],
    },
    task,
    before,
    after,
  );
  assert.deepEqual(reconciled.remaining, []);
  assert.deepEqual(reconciled.followUps, [
    "RV8 y la aceptación humana continúan diferidas.",
  ]);
  validateResult(
    reconciled,
    task,
    before,
    after,
    [PLAN, HANDOFF, "docs/pos-automation/runs/test.md"],
    "docs/pos-automation/runs/test.md",
  );

  const stillOpen = reconcileCompletedFollowUps(
    { ...result(), remaining: ["Falta trabajo del criterio."] },
    task,
    before,
    before,
  );
  assert.equal(stillOpen.remaining.length, 1);
});
test("selecciona verificaciones según consumidores", () => {
  assert.equal(verificationCommands([PLAN]).length, 0);
  assert.equal(verificationCommands(["apps/pos/src/a.ts"]).length, 2);
  assert.equal(verificationCommands(["backend/api/src/a.ts"]).length, 4);
  assert.equal(verificationCommands(["packages/types/src/a.ts"]).length, 6);
});
test("reintenta únicamente operaciones que agotan su tiempo", () => {
  let attempts = 0;
  assert.equal(
    retryTimedOut(() => {
      attempts++;
      if (attempts < 3) {
        const error = new Error("spawnSync git ETIMEDOUT");
        error.code = "ETIMEDOUT";
        throw error;
      }
      return "confirmado";
    }, "Git sintético"),
    "confirmado",
  );
  assert.equal(attempts, 3);
  attempts = 0;
  assert.throws(() =>
    retryTimedOut(() => {
      attempts++;
      throw new Error("rechazo real");
    }, "Git sintético"),
  );
  assert.equal(attempts, 1);
});
test("un push con timeout continúa sólo al confirmar el SHA remoto", () => {
  const base = "base",
    sha = "publicado";
  let remoteReads = 0,
    pushes = 0;
  publish("/fixture", queue([task]), sha, base, {
    remoteHead: () => (++remoteReads === 1 ? base : sha),
    push: () => {
      pushes++;
      const error = new Error("spawnSync git ETIMEDOUT");
      error.code = "ETIMEDOUT";
      throw error;
    },
  });
  assert.equal(pushes, 1);
  assert.equal(remoteReads, 2);

  pushes = 0;
  assert.throws(
    () =>
      publish("/fixture", queue([task]), sha, base, {
        remoteHead: () => base,
        push: () => {
          pushes++;
          const error = new Error("spawnSync git ETIMEDOUT");
          error.code = "ETIMEDOUT";
          throw error;
        },
      }),
    /ETIMEDOUT/,
  );
  assert.equal(pushes, 3);
});
test("dry-run no crea runtime ni cambia Git", async (t) => {
  const { root, options } = fixture(t);
  await execute({ ...options, dryRun: true });
  assert.equal(existsSync(path.join(root, ".pos-runner")), false);
  assert.equal(runGit(root, "status", "--porcelain"), "");
});
test("dos sesiones nuevas publican documentación y estado antes de continuar", async (t) => {
  const { root, remote, options } = fixture(t, [task, task2]);
  const bases = [];
  await execute(
    { ...options, steps: 2 },
    dependencies(async (c) => {
      bases.push(c.base);
      assert.equal(
        runGit(root, "rev-parse", "HEAD"),
        runGit(remote, "rev-parse", "refs/heads/feature/pos-frontend-clean"),
      );
      return finish(c);
    }),
  );
  assert.equal(bases.length, 2);
  assert.notEqual(bases[0], bases[1]);
  assert.equal(
    JSON.parse(readFileSync(path.join(root, STATE))).history.length,
    2,
  );
  assert.equal(runGit(root, "status", "--porcelain"), "");
  assert.equal(existsSync(path.join(root, ".pos-runner/journal.json")), false);
});
test("publica un checkpoint con pruebas dirigidas verdes y una falla amplia ajena", async (t) => {
  const { root, remote, options } = fixture(t);
  await execute(
    options,
    dependencies(async (context) => {
      const completed = finish(context);
      completed.checks.push({
        command: "suite amplia",
        result: "failed_unrelated",
        evidence:
          "Falló únicamente una prueba fechada de otro módulo; la prueba dirigida del bloque aprobó.",
      });
      return completed;
    }),
  );
  assert.equal(
    runGit(root, "rev-parse", "HEAD"),
    runGit(remote, "rev-parse", "refs/heads/feature/pos-frontend-clean"),
  );
  assert.equal(
    JSON.parse(readFileSync(path.join(root, STATE))).history.length,
    1,
  );
});
test("parcial conserva check abierto y la siguiente sesión recibe su contexto", async (t) => {
  const { root, options } = fixture(t);
  let count = 0;
  await execute(
    { ...options, steps: 2 },
    dependencies(async (c) => {
      count++;
      if (count === 2) assert.match(c.prompt, /Continuación documentada/);
      return finish(c, count === 1 ? "partial" : "completed");
    }),
  );
  const saved = JSON.parse(readFileSync(path.join(root, STATE)));
  assert.deepEqual(
    saved.history.map((x) => x.status),
    ["partial", "completed"],
  );
  assert.equal(saved.tasks[task.id].attempts, 2);
});
test("bloqueo documentado se publica y continúa la tarea independiente", async (t) => {
  const { root, options } = fixture(t, [task, task2]);
  await execute(
    { ...options, steps: 2 },
    dependencies(async (c) =>
      finish(c, c.task.id === task.id ? "blocked" : "completed"),
    ),
  );
  assert.equal(
    JSON.parse(readFileSync(path.join(root, STATE))).tasks[task.id].status,
    "blocked",
  );
  assert.match(readFileSync(path.join(root, PLAN), "utf8"), /\[ \] \*\*RV7-P1/);
});
test("dirty tree se conserva sin iniciar sesiones", async (t) => {
  const { root, options } = fixture(t);
  write(root, "usuario.txt", "trabajo del usuario");
  await assert.rejects(
    execute(
      options,
      dependencies(() => assert.fail("no debe iniciar")),
    ),
    /cambios locales/,
  );
  assert.equal(
    readFileSync(path.join(root, "usuario.txt"), "utf8"),
    "trabajo del usuario",
  );
});
test("lock y STOP evitan sesiones concurrentes o no deseadas", async (t) => {
  const { root, options } = fixture(t);
  write(root, ".git/pos-plan-runner.lock", "otra ejecución");
  await assert.rejects(
    execute(
      options,
      dependencies(() => assert.fail("no debe iniciar")),
    ),
    /Existe/,
  );
  rmSync(path.join(root, ".git/pos-plan-runner.lock"));
  write(root, ".pos-runner/STOP", "detener");
  await execute(
    options,
    dependencies(() => assert.fail("no debe iniciar")),
  );
});
test("fallo del agente conserva cambios y journal sin commit", async (t) => {
  const { root, options } = fixture(t);
  const base = runGit(root, "rev-parse", "HEAD");
  await assert.rejects(
    execute(
      options,
      dependencies(async (c) => {
        finish(c, "partial");
        throw new Error("cuota");
      }),
    ),
    /cuota/,
  );
  assert.equal(runGit(root, "rev-parse", "HEAD"), base);
  assert.ok(existsSync(path.join(root, ".pos-runner/journal.json")));
  assert.ok(runGit(root, "status", "--porcelain"));
});
test("fallo de verificación independiente impide commit aunque el agente declare PASS", async (t) => {
  const { root, options } = fixture(t);
  const base = runGit(root, "rev-parse", "HEAD");
  await assert.rejects(
    execute(options, {
      ...dependencies(async (c) => {
        write(root, "apps/pos/src/check.ts", "export const value = 1;\n");
        return finish(c);
      }),
      verifier: async () => {
        throw new Error("type-check falló");
      },
    }),
    /type-check falló/,
  );
  assert.equal(runGit(root, "rev-parse", "HEAD"), base);
});
test("verificación que cambia contenido impide publicar un checkpoint distinto del revisado", async (t) => {
  const { root, options } = fixture(t);
  await assert.rejects(
    execute(options, {
      ...dependencies(async (c) => {
        write(root, "apps/pos/src/check.ts", "export const value = 1;\n");
        return finish(c);
      }),
      verifier: async () =>
        write(root, "apps/pos/src/check.ts", "export const value = 2;\n"),
    }),
    /modificaron archivos/,
  );
});
test("fallo de push conserva commit y permite recuperarlo sin repetir sesión", async (t) => {
  const { root, remote, options } = fixture(t);
  writeFileSync(path.join(remote, "hooks/pre-receive"), "#!/bin/sh\nexit 1\n", {
    mode: 0o755,
  });
  await assert.rejects(
    execute(
      options,
      dependencies(async (c) => finish(c)),
    ),
  );
  const local = runGit(root, "rev-parse", "HEAD");
  assert.notEqual(
    local,
    runGit(remote, "rev-parse", "refs/heads/feature/pos-frontend-clean"),
  );
  assert.equal(runGit(root, "status", "--porcelain"), "");
  rmSync(path.join(remote, "hooks/pre-receive"));
  await execute(
    { ...options, recoverPush: true },
    dependencies(() => assert.fail("no debe repetir")),
  );
  assert.equal(
    runGit(remote, "rev-parse", "refs/heads/feature/pos-frontend-clean"),
    local,
  );
});
test("avance remoto durante sesión impide sobrescribirlo", async (t) => {
  const { root, remote, options } = fixture(t);
  let other;
  await assert.rejects(
    execute(
      options,
      dependencies(async (c) => {
        const tree = runGit(root, "rev-parse", "HEAD^{tree}");
        other = runGit(
          root,
          "commit-tree",
          tree,
          "-p",
          c.base,
          "-m",
          "avance ajeno",
        );
        runGit(
          root,
          "push",
          "origin",
          `${other}:refs/heads/feature/pos-frontend-clean`,
        );
        return finish(c);
      }),
    ),
    /remoto avanzó/,
  );
  assert.equal(
    runGit(remote, "rev-parse", "refs/heads/feature/pos-frontend-clean"),
    other,
  );
});
