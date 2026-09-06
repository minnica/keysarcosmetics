import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  classifyApiCoordination,
  createProductionShadowReport,
  formatProductionShadowSummary,
} from "./vercel-production-shadow-lib.mjs";

const targetSha = "f".repeat(40);
const apiSha = "9".repeat(40);
const applications = ["envelope", "finance", "hr", "payroll", "scheduler"];

function fixture() {
  const results = applications.map((application, index) => {
    const baseSha = String(index + 1).repeat(40);
    return {
      affected: ["envelope", "scheduler"].includes(application),
      application,
      baseSha,
      package: `@cosmetics/${application}`,
      reasons: [],
      targetSha,
    };
  });
  return {
    impact: {
      schemaVersion: 1,
      status: "ok",
      mode: "diagnostic",
      environment: "production",
      branch: "master",
      targetSha,
      affectedApplications: ["envelope", "scheduler"],
      skippedApplications: ["finance", "hr", "payroll"],
      results,
    },
    evidence: {
      schemaVersion: 1,
      mode: "read-only-diagnostic",
      environment: "production",
      branch: "master",
      targetSha,
      capturedAt: "2026-09-05T12:00:00.000Z",
      projects: Object.fromEntries(
        applications.map((application) => [
          application,
          {
            project: `keysarcosmetics-${application}`,
            root: `apps/${application}`,
          },
        ]),
      ),
      observations: Object.fromEntries(
        applications.map((application) => [
          application,
          {
            createdAt: "2026-09-05T12:01:00.000Z",
            deploymentId: `dpl_Target${application}`,
            sha: targetSha,
            status: "READY",
          },
        ]),
      ),
      environments: {
        production: Object.fromEntries(
          results.map((result) => [
            result.application,
            [
              {
                createdAt: "2026-09-04T12:00:00.000Z",
                deploymentId: `dpl_Base${result.application}`,
                sha: result.baseSha,
                status: "READY",
              },
            ],
          ]),
        ),
      },
    },
  };
}

describe("sombra de producción selectiva", () => {
  test("coordina API y migraciones de forma conservadora", () => {
    assert.deepEqual(
      classifyApiCoordination([
        "apps/hr/app/page.tsx",
        "backend/api/src/app.ts",
        "backend/api/prisma/migrations/20260905_test/migration.sql",
        "packages/types/src/index.ts",
      ]),
      {
        apiDeploymentRequired: true,
        databaseGateRequired: true,
        reasons: ["backend-api", "shared-types", "database-migration"],
        files: {
          api: [
            "backend/api/prisma/migrations/20260905_test/migration.sql",
            "backend/api/src/app.ts",
          ],
          global: [],
          migrations: [
            "backend/api/prisma/migrations/20260905_test/migration.sql",
          ],
          sharedContracts: ["packages/types/src/index.ts"],
        },
      },
    );
  });

  test("genera selección, comparación amplia y manifiesto de seis componentes", () => {
    const { impact, evidence } = fixture();
    const report = createProductionShadowReport({
      apiChangedFiles: ["backend/api/src/app.ts"],
      currentApiSha: apiSha,
      evidence,
      impact,
      generatedAt: "2026-09-05T13:00:00.000Z",
    });
    assert.equal(report.mode, "read-only");
    assert.equal(report.mutationsPerformed, false);
    assert.equal(report.selection.expectedSelectiveDeployments, 2);
    assert.equal(report.broadComparison.observedDeployments, 5);
    assert.equal(report.broadComparison.avoidableDeployments, 3);
    assert.deepEqual(Object.keys(report.releaseManifest.releases), [
      "envelope",
      "finance",
      "hr",
      "payroll",
      "scheduler",
      "api",
    ]);
    assert.equal(report.releaseManifest.releases.envelope, targetSha);
    assert.equal(report.releaseManifest.releases.finance, "2".repeat(40));
    assert.equal(report.releaseManifest.releases.api, targetSha);
  });

  test("simula rollback individual contra el deployment READY anterior", () => {
    const { impact, evidence } = fixture();
    const report = createProductionShadowReport({
      apiChangedFiles: [],
      currentApiSha: apiSha,
      evidence,
      impact,
      generatedAt: "2026-09-05T13:00:00.000Z",
    });
    assert.equal(report.api.expectedReleaseSha, apiSha);
    assert.deepEqual(
      report.rollbackDrills.map((entry) => entry.application),
      ["envelope", "scheduler"],
    );
    assert.equal(
      report.rollbackDrills[0].manifestAfterRollback.envelope,
      "1".repeat(40),
    );
    assert.equal(
      report.rollbackDrills[0].manifestAfterRollback.scheduler,
      targetSha,
    );
  });

  test("declara compatibilidad sin forzar igualdad artificial de SHA", () => {
    const { impact, evidence } = fixture();
    const report = createProductionShadowReport({
      apiChangedFiles: ["packages/types/src/index.ts"],
      currentApiSha: apiSha,
      evidence,
      impact,
      generatedAt: "2026-09-05T13:00:00.000Z",
    });
    assert.deepEqual(report.exactApiShaApplications, []);
    assert.equal(
      report.compatibility.find((entry) => entry.application === "scheduler")
        .mode,
      "approved-pair",
    );
    assert.equal(
      report.compatibility.find((entry) => entry.application === "envelope")
        .mode,
      "backward-compatible",
    );
    assert.equal(
      report.compatibility.find((entry) => entry.application === "hr").mode,
      "independent",
    );
  });

  test("falla cerrado si no hay objetivo de rollback identificable", () => {
    const { impact, evidence } = fixture();
    evidence.environments.production.envelope[0].deploymentId = null;
    assert.throws(
      () =>
        createProductionShadowReport({
          apiChangedFiles: [],
          currentApiSha: apiSha,
          evidence,
          impact,
          generatedAt: "2026-09-05T13:00:00.000Z",
        }),
      /No existe un deployment READY identificable/,
    );
  });

  test("rechaza contextos que no sean production/master", () => {
    const { impact, evidence } = fixture();
    impact.environment = "development";
    assert.throws(() =>
      createProductionShadowReport({
        apiChangedFiles: [],
        currentApiSha: apiSha,
        evidence,
        impact,
      }),
    );
  });

  test("publica un resumen explícito de sólo lectura", () => {
    const { impact, evidence } = fixture();
    const report = createProductionShadowReport({
      apiChangedFiles: [],
      currentApiSha: apiSha,
      evidence,
      impact,
      generatedAt: "2026-09-05T13:00:00.000Z",
    });
    const summary = formatProductionShadowSummary(report);
    assert.match(summary, /Simulación de sólo lectura/);
    assert.match(summary, /Simulación de rollback individual/);
    assert.match(summary, /no autoriza la Fase 8/);
  });
});
