import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  VERCEL_APPLICATIONS,
  analyzeLockfileImpact,
  buildWorkspaceGraph,
  createGitRepository,
  detectVercelImpact,
  evaluateApplicationImpact,
  formatDetectorError,
  formatHumanSummary,
  resolveLastSuccessfulBase,
} from "./vercel-impact-detector-lib.mjs";

const applicationDependencies = {
  landing: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
  envelope: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
  payroll: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
  crm: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
  scheduler: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
  pos: ["@cosmetics/types", "@cosmetics/ui", "@cosmetics/api-client"],
  finance: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
  hr: [
    "@cosmetics/types",
    "@cosmetics/ui",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
};

function manifest(path, name, dependencies = []) {
  return {
    path: `${path}/package.json`,
    content: JSON.stringify({
      name,
      dependencies: Object.fromEntries(
        dependencies.map((dependency) => [dependency, "workspace:*"]),
      ),
    }),
  };
}

function testManifestEntries() {
  const entries = Object.entries(VERCEL_APPLICATIONS).map(
    ([application, config]) =>
      manifest(
        config.root,
        config.packageName,
        applicationDependencies[application],
      ),
  );
  entries.push(
    manifest("packages/ui", "@cosmetics/ui"),
    manifest("packages/types", "@cosmetics/types"),
    manifest("packages/auth", "@cosmetics/auth", ["@cosmetics/types"]),
    manifest("packages/api-client", "@cosmetics/api-client", [
      "@cosmetics/types",
    ]),
    manifest("backend/api", "@cosmetics/api", ["@cosmetics/types"]),
  );
  return entries;
}

const manifestEntries = testManifestEntries();
function testGraph() {
  return buildWorkspaceGraph(manifestEntries);
}

const graph = testGraph();
const noLockChanges = { changedImporters: [], rootImporterChanged: false };

function evaluateAll(
  changedFiles,
  lockfileImpact = noLockChanges,
  branch = "develop",
  environment = "development",
) {
  return Object.keys(VERCEL_APPLICATIONS).map((application) =>
    evaluateApplicationImpact({
      application,
      baseSha: "a".repeat(40),
      branch,
      changedFiles,
      environment,
      graph,
      lockfileImpact,
      targetSha: "b".repeat(40),
    }),
  );
}

function affectedApplications(results) {
  return results
    .filter((result) => result.affected)
    .map((result) => result.application);
}

function lockfile(importers) {
  const versions = new Set();
  const importerLines = [];
  for (const [importer, dependencies] of Object.entries(importers)) {
    importerLines.push(`  ${importer}:`, "    dependencies:");
    for (const [name, version] of Object.entries(dependencies)) {
      importerLines.push(
        `      ${name}:`,
        `        specifier: ^${version.split(".")[0]}`,
        `        version: ${version}`,
      );
      versions.add(`${name}@${version}`);
    }
  }
  const packageLines = [...versions].flatMap((key) => [
    `  ${key}:`,
    "    resolution: {integrity: sha512-test}",
    "",
  ]);
  const snapshotLines = [...versions].flatMap((key) => [`  ${key}: {}`, ""]);
  return [
    "lockfileVersion: '9.0'",
    "",
    "importers:",
    "",
    ...importerLines,
    "",
    "packages:",
    "",
    ...packageLines,
    "snapshots:",
    "",
    ...snapshotLines,
  ].join("\n");
}

describe("matriz de aceptación de deployments selectivos", () => {
  test("cada cambio directo afecta únicamente a su aplicación", async (context) => {
    for (const application of Object.keys(VERCEL_APPLICATIONS)) {
      await context.test(application, () => {
        const results = evaluateAll([
          `${VERCEL_APPLICATIONS[application].root}/src/change.ts`,
        ]);
        assert.deepEqual(affectedApplications(results), [application]);
        assert.equal(
          results.find((result) => result.application === application)
            .reasons[0].code,
          "direct-application-change",
        );
      });
    }
  });

  test("ui afecta a las ocho aplicaciones", () => {
    assert.deepEqual(
      affectedApplications(evaluateAll(["packages/ui/src/button.tsx"])),
      Object.keys(VERCEL_APPLICATIONS),
    );
  });

  test("types afecta a las ocho aplicaciones", () => {
    assert.deepEqual(
      affectedApplications(evaluateAll(["packages/types/src/index.ts"])),
      Object.keys(VERCEL_APPLICATIONS),
    );
  });

  test("auth afecta a todas excepto POS según el grafo", () => {
    assert.deepEqual(
      affectedApplications(evaluateAll(["packages/auth/src/index.ts"])),
      Object.keys(VERCEL_APPLICATIONS).filter(
        (application) => application !== "pos",
      ),
    );
  });

  test("api-client afecta a las ocho aplicaciones", () => {
    assert.deepEqual(
      affectedApplications(evaluateAll(["packages/api-client/src/index.ts"])),
      Object.keys(VERCEL_APPLICATIONS),
    );
  });

  test("un cambio de lockfile exclusivo afecta sólo a su importador", () => {
    const base = lockfile({
      "apps/envelope": { axios: "1.0.0" },
      "apps/payroll": { zod: "1.0.0" },
    });
    const target = lockfile({
      "apps/envelope": { axios: "2.0.0" },
      "apps/payroll": { zod: "1.0.0" },
    });
    const impact = analyzeLockfileImpact(base, target);
    assert.deepEqual(impact, {
      changedImporters: ["apps/envelope"],
      rootImporterChanged: false,
    });
    assert.deepEqual(
      affectedApplications(evaluateAll(["pnpm-lock.yaml"], impact)),
      ["envelope"],
    );
  });

  test("un cambio de lockfile compartido afecta a sus consumidores transitivos", () => {
    const base = lockfile({ "packages/ui": { "date-fns": "3.0.0" } });
    const target = lockfile({ "packages/ui": { "date-fns": "4.0.0" } });
    const impact = analyzeLockfileImpact(base, target);
    assert.deepEqual(
      affectedApplications(evaluateAll(["pnpm-lock.yaml"], impact)),
      Object.keys(VERCEL_APPLICATIONS),
    );
  });

  test("un cambio del importador raíz del lockfile es global", () => {
    const base = lockfile({ ".": { turbo: "1.0.0" } });
    const target = lockfile({ ".": { turbo: "2.0.0" } });
    const impact = analyzeLockfileImpact(base, target);
    assert.equal(impact.rootImporterChanged, true);
    assert.deepEqual(
      affectedApplications(evaluateAll(["pnpm-lock.yaml"], impact)),
      Object.keys(VERCEL_APPLICATIONS),
    );
  });

  test("sólo documentación no afecta frontends y explica la exclusión", () => {
    const results = evaluateAll([
      "CLAUDE.md",
      "docs/RELEASE_RUNBOOK.md",
      "PLAN_X.md",
    ]);
    assert.deepEqual(affectedApplications(results), []);
    assert.ok(
      results.every((result) => result.reasons[0].code === "excluded-change"),
    );
  });

  test("sólo backend o migraciones no afectan frontends", () => {
    const results = evaluateAll([
      "backend/api/src/app.ts",
      "backend/api/prisma/migrations/123/migration.sql",
    ]);
    assert.deepEqual(affectedApplications(results), []);
  });

  test("los archivos de prueba propios de una app no afectan su bundle", () => {
    assert.deepEqual(
      affectedApplications(
        evaluateAll(["apps/payroll/src/calculation.test.ts"]),
      ),
      [],
    );
  });

  test("las pruebas de UI compartida se mantienen conservadoramente en el impacto", () => {
    assert.deepEqual(
      affectedApplications(evaluateAll(["packages/ui/src/button.test.tsx"])),
      Object.keys(VERCEL_APPLICATIONS),
    );
  });

  test("la configuración global afecta a las ocho aplicaciones", () => {
    for (const file of [
      "package.json",
      "pnpm-workspace.yaml",
      "turbo.json",
      "tsconfig.json",
      ".nvmrc",
    ]) {
      assert.deepEqual(
        affectedApplications(evaluateAll([file])),
        Object.keys(VERCEL_APPLICATIONS),
      );
    }
  });

  test("una combinación frontend + backend sólo selecciona el frontend correspondiente", () => {
    const results = evaluateAll([
      "apps/scheduler/src/page.tsx",
      "backend/api/src/routes/scheduler.routes.ts",
    ]);
    assert.deepEqual(affectedApplications(results), ["scheduler"]);
    assert.ok(
      results
        .find((result) => result.application === "scheduler")
        .reasons.some((reason) => reason.code === "excluded-change"),
    );
  });

  test("las ramas de trabajo nunca seleccionan aplicaciones", () => {
    assert.deepEqual(
      affectedApplications(
        evaluateAll(
          ["packages/ui/src/button.tsx"],
          noLockChanges,
          "feature/ui",
        ),
      ),
      [],
    );
  });

  test("master reutiliza la misma selección cuando se evalúa production", () => {
    assert.deepEqual(
      affectedApplications(
        evaluateAll(
          ["apps/payroll/src/page.tsx"],
          noLockChanges,
          "master",
          "production",
        ),
      ),
      ["payroll"],
    );
  });
});

describe("fallo cerrado y estado de deployments", () => {
  test("un deployment fallido no sustituye al último READY como SHA base", () => {
    const state = {
      environments: {
        development: {
          payroll: [
            {
              sha: "b".repeat(40),
              status: "ERROR",
              createdAt: "2026-09-04T12:00:00Z",
            },
            {
              sha: "a".repeat(40),
              status: "READY",
              createdAt: "2026-09-04T11:00:00Z",
            },
          ],
        },
      },
    };
    assert.equal(
      resolveLastSuccessfulBase(state, "development", "payroll"),
      "a".repeat(40),
    );

    const output = detectVercelImpact({
      applications: ["payroll"],
      branch: "develop",
      deploymentState: state,
      environment: "development",
      repository: {
        assertAncestor(baseSha) {
          assert.equal(baseSha, "a".repeat(40));
        },
        changedFiles(baseSha) {
          assert.equal(baseSha, "a".repeat(40));
          return ["apps/payroll/src/pending-change.ts"];
        },
        manifestsAt() {
          return manifestEntries;
        },
        resolveCommit(reference) {
          return reference;
        },
      },
      targetSha: "c".repeat(40),
    });
    assert.deepEqual(output.affectedApplications, ["payroll"]);
    assert.equal(output.results[0].baseSha, "a".repeat(40));
  });

  test("historia Git insuficiente produce error explícito", () => {
    const repository = createGitRepository(process.cwd());
    assert.throws(
      () => repository.resolveCommit("0".repeat(40)),
      (error) => error.code === "GIT_HISTORY_INSUFFICIENT",
    );
  });

  test("un archivo sin política produce error, nunca una omisión silenciosa", () => {
    assert.throws(
      () => evaluateAll(["unknown-build-input.config.js"]),
      (error) =>
        error.code === "AMBIGUOUS_FILE_SCOPE" &&
        error.details.files[0] === "unknown-build-input.config.js",
    );
  });

  test("un cambio de lockfile no atribuible bloquea la selección", () => {
    const base = lockfile({ "apps/envelope": { axios: "1.0.0" } });
    const target = base
      .replace(
        "packages:\n\n",
        "packages:\n\n  orphan@1.0.0:\n    resolution: {integrity: sha512-orphan}\n\n",
      )
      .replace("snapshots:\n\n", "snapshots:\n\n  orphan@1.0.0: {}\n\n");
    assert.throws(
      () => analyzeLockfileImpact(base, target),
      (error) => error.code === "LOCKFILE_AMBIGUOUS",
    );
    assert.throws(
      () => evaluateAll(["pnpm-lock.yaml"]),
      (error) => error.code === "LOCKFILE_AMBIGUOUS",
    );
  });

  test("un grafo con una dependencia interna ausente bloquea la selección", () => {
    assert.throws(
      () =>
        buildWorkspaceGraph([
          manifest("apps/envelope", "@cosmetics/envelope", [
            "@cosmetics/missing",
          ]),
        ]),
      (error) => error.code === "INVALID_WORKSPACE_GRAPH",
    );
  });

  test("un error estructurado no contiene listas vacías de selección", () => {
    const output = formatDetectorError(new Error("boom"));
    assert.equal(output.status, "error");
    assert.equal("results" in output, false);
    assert.equal("affectedApplications" in output, false);
  });

  test("el resumen humano incluye decisión, base, motivo y archivo", () => {
    const result = evaluateAll(["apps/envelope/src/page.tsx"])[1];
    const summary = formatHumanSummary({
      environment: "development",
      branch: "develop",
      targetSha: result.targetSha,
      affectedApplications: ["envelope"],
      skippedApplications: [],
      results: [result],
    });
    assert.match(summary, /AFECTADA envelope/);
    assert.match(summary, /base a{40}/);
    assert.match(summary, /Cambió directamente envelope/);
    assert.match(summary, /apps\/envelope\/src\/page\.tsx/);
  });
});
