import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";
import {
  createVercelOperationsAudit,
  formatVercelOperationsAudit,
} from "./vercel-operations-audit-lib.mjs";

const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const now = new Date("2026-09-05T12:00:00.000Z");

function projectSnapshot(application, options = {}) {
  const config = ACTIVE_VERCEL_PROJECTS[application];
  const projectId = `prj_${application}`;
  const environment = options.environment ?? "development";
  const branch = environment === "production" ? "master" : "develop";
  const target = environment === "production" ? "production" : null;
  const requiredVariables =
    environment === "production"
      ? config.projectSettings.requiredProductionVariables
      : config.projectSettings.requiredPreviewVariables;
  const deployment = {
    uid: `dpl_${application}123`,
    name: config.project,
    projectId,
    readyState: "READY",
    target,
    createdAt: now.getTime() - 60_000,
    meta: {
      githubCommitOrg: "minnica",
      githubCommitRepo: "keysarcosmetics",
      githubCommitRef: branch,
      githubCommitSha: shaA,
    },
  };
  return {
    projectId,
    route: `${config.project}-${branch}.vercel.app`,
    selectiveEnabled: options.selectiveEnabled ?? "true",
    project: {
      id: projectId,
      name: config.project,
      rootDirectory: config.root,
      framework: config.projectSettings.framework,
      nodeVersion: config.projectSettings.nodeVersion,
      installCommand: config.projectSettings.installCommand,
      buildCommand: config.projectSettings.buildCommand,
      outputDirectory: config.projectSettings.outputDirectory,
      link: {
        type: "github",
        org: "minnica",
        repo: "keysarcosmetics",
        productionBranch: "master",
      },
      gitProviderOptions: {
        createDeployments: options.gitDeployments ?? "disabled",
      },
    },
    environmentVariables: requiredVariables.map((key) => ({ key })),
    routeDeployment: deployment,
    deployments: options.deployments ?? [deployment],
  };
}

function snapshots(options = {}) {
  return Object.fromEntries(
    Object.keys(ACTIVE_VERCEL_PROJECTS).map((application) => [
      application,
      projectSnapshot(application, options),
    ]),
  );
}

function audit(overrides = {}) {
  return createVercelOperationsAudit({
    environment: "development",
    branch: "develop",
    now,
    windowDays: 30,
    projectSnapshots: snapshots(),
    ciRuns: [
      {
        event: "push",
        branch: "develop",
        sha: shaA,
        conclusion: "success",
        createdAt: now.toISOString(),
      },
      {
        event: "push",
        branch: "develop",
        sha: shaB,
        conclusion: "success",
        createdAt: now.toISOString(),
      },
    ],
    diagnosticRuns: [
      {
        branch: "develop",
        sha: shaA,
        detectorConclusion: "success",
        createdAt: now.toISOString(),
      },
      {
        branch: "develop",
        sha: shaB,
        detectorConclusion: "success",
        createdAt: now.toISOString(),
      },
    ],
    incidents: { schemaVersion: 1, entries: [] },
    ...overrides,
  });
}

describe("auditoría operativa de deployments selectivos", () => {
  test("valida manifests, rutas, ramas, roots y un iniciador por proyecto", () => {
    const result = audit();
    assert.equal(result.status, "ready");
    assert.equal(result.phase9Ready, true);
    assert.equal(result.projects.length, 5);
    assert.deepEqual(Object.keys(result.releaseManifest.releases), [
      "envelope",
      "finance",
      "hr",
      "payroll",
      "scheduler",
    ]);
    assert.equal(
      result.projects.every(
        (project) => project.automaticInitiator === "github-actions",
      ),
      true,
    );
  });

  test("admite una migración gradual sana sin declararla cerrada", () => {
    const result = audit({
      projectSnapshots: snapshots({
        selectiveEnabled: "false",
        gitDeployments: "enabled",
      }),
    });
    assert.equal(result.status, "transition");
    assert.equal(result.phase9Ready, false);
    assert.equal(result.errors.length, 0);
    assert.equal(
      result.projects.every(
        (project) => project.automaticInitiator === "vercel-git",
      ),
      true,
    );
  });

  test("bloquea dos iniciadores o una ruta de la rama equivocada", () => {
    const invalid = snapshots();
    invalid.hr.project.gitProviderOptions.createDeployments = "enabled";
    invalid.payroll.routeDeployment.meta.githubCommitRef = "feature/unsafe";
    const result = audit({ projectSnapshots: invalid });
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.errors.map((error) => error.code).sort(), [
      "INVALID_INITIATOR_COUNT",
      "STABLE_ROUTE_BRANCH_MISMATCH",
    ]);
  });

  test("sanitiza project IDs de los errores y artefactos", () => {
    const invalid = snapshots();
    invalid.hr.project.id = "prj_otroProyectoSecreto";
    const result = audit({ projectSnapshots: invalid });
    assert.equal(result.status, "blocked");
    assert.equal(
      JSON.stringify(result).includes("prj_otroProyectoSecreto"),
      false,
    );
    assert.match(result.errors[0].message, /\[project-id\]/);
  });

  test("mide fan-out evitado, fallos y falsos positivos confirmados", () => {
    const result = audit({
      diagnosticRuns: [
        {
          branch: "develop",
          sha: shaA,
          detectorConclusion: "success",
          createdAt: now.toISOString(),
        },
      ],
      incidents: {
        schemaVersion: 1,
        entries: [
          {
            id: "VFP-2026-001",
            detectedAt: now.toISOString(),
            environment: "development",
            application: "hr",
            classification: "false-positive",
            resolution:
              "Se corrigió la regla del lockfile y se agregó cobertura.",
            resolvedAt: now.toISOString(),
          },
        ],
      },
    });
    assert.equal(result.metrics.broadDeploymentBaseline, 10);
    assert.equal(result.metrics.observedUniqueApplicationReleases, 5);
    assert.equal(result.metrics.deploymentsAvoidedAgainstBroadBaseline, 5);
    assert.equal(result.metrics.detectorFailures, 1);
    assert.equal(result.metrics.confirmedFalsePositives, 1);
    assert.equal(result.phase9Ready, false);
    assert.match(formatVercelOperationsAudit(result), /Deployments evitados/);
  });

  test("el workflow es semanal, de sólo lectura y conserva evidencia", () => {
    const workflow = readFileSync(
      ".github/workflows/vercel-operations-audit.yml",
      "utf8",
    );
    for (const expected of [
      "schedule:",
      "cron:",
      "workflow_dispatch:",
      "actions: read",
      "VERCEL_TOKEN_READ_ONLY",
      "audit-vercel-operations.mjs",
      "vercel-operations-audit-",
      "retention-days: 90",
    ]) {
      assert.ok(workflow.includes(expected));
    }
    assert.equal(workflow.includes("vercel deploy"), false);
    assert.equal(workflow.includes("vercel promote"), false);
    assert.equal(workflow.includes("vercel rollback"), false);
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    assert.ok(ci.includes("pnpm deploy:operations:test"));
    for (const manualWorkflow of [
      ".github/workflows/vercel-development-manual.yml",
      ".github/workflows/vercel-production-manual.yml",
    ]) {
      assert.ok(
        readFileSync(manualWorkflow, "utf8").includes("change_reference"),
      );
    }
  });
});
