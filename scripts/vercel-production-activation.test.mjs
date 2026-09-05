import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createProductionActivationPlan,
  formatProductionActivationSummary,
  resolveEnabledProductionApplications,
} from "./vercel-production-activation-lib.mjs";

const targetSha = "f".repeat(40);
const apiSha = "a".repeat(40);
const applications = ["envelope", "finance", "hr", "payroll", "scheduler"];

function fixture() {
  const affected = ["envelope", "hr"];
  return {
    kind: "vercel-production-shadow",
    mode: "read-only",
    mutationsPerformed: false,
    environment: "production",
    branch: "master",
    targetSha,
    selection: { affectedApplications: affected },
    api: {
      apiDeploymentRequired: true,
      databaseGateRequired: true,
      expectedReleaseSha: targetSha,
    },
    compatibility: applications.map((application) => ({
      application,
      mode: ["finance", "hr"].includes(application)
        ? "independent"
        : application === "scheduler"
          ? "approved-pair"
          : "backward-compatible",
      required: affected.includes(application),
    })),
    broadComparison: {
      applications: applications.map((application) => ({
        application,
        broadStatus: application === "hr" ? "READY" : null,
        broadDeploymentId: application === "hr" ? "dpl_ReusableHr123" : null,
      })),
    },
    releaseManifest: {
      releases: Object.fromEntries([
        ...applications.map((application) => [application, targetSha]),
        ["api", targetSha],
      ]),
    },
    rollbackDrills: affected.map((application, index) => ({
      application,
      deploymentId: `dpl_Previous${application}`,
      releaseSha: String(index + 1).repeat(40),
    })),
  };
}

describe("activación gradual de producción selectiva", () => {
  test("trata flags ausentes, vacíos o false como apagados", () => {
    assert.deepEqual(resolveEnabledProductionApplications({}), []);
    assert.deepEqual(
      resolveEnabledProductionApplications({
        VERCEL_HR_PRODUCTION_SELECTIVE_ENABLED: "",
        VERCEL_FINANCE_PRODUCTION_SELECTIVE_ENABLED: "false",
      }),
      [],
    );
  });

  test("sólo acepta true o false explícitos", () => {
    assert.deepEqual(
      resolveEnabledProductionApplications({
        VERCEL_HR_PRODUCTION_SELECTIVE_ENABLED: "true",
      }),
      ["hr"],
    );
    assert.throws(
      () =>
        resolveEnabledProductionApplications({
          VERCEL_HR_PRODUCTION_SELECTIVE_ENABLED: "yes",
        }),
      /debe valer true o false/,
    );
  });

  test("activa sólo HR y conserva Envelope en su release anterior", () => {
    const plan = createProductionActivationPlan({
      enabledApplications: ["hr"],
      report: fixture(),
    });
    assert.deepEqual(plan.activatedApplications, ["hr"]);
    assert.deepEqual(plan.deferredApplications, ["envelope"]);
    assert.equal(plan.releaseManifest.releases.envelope, "1".repeat(40));
    assert.equal(plan.releaseManifest.releases.hr, targetSha);
    assert.equal(
      plan.matrix.include[0].reusableDeploymentId,
      "dpl_ReusableHr123",
    );
  });

  test("propaga gates de API, Prisma y compatibilidad", () => {
    const plan = createProductionActivationPlan({
      enabledApplications: ["envelope"],
      report: fixture(),
    });
    assert.equal(plan.api.deploymentRequired, true);
    assert.equal(plan.api.databaseGateRequired, true);
    assert.equal(plan.matrix.include[0].compatibilityRequired, true);
    assert.equal(
      plan.matrix.include[0].compatibilityMode,
      "backward-compatible",
    );
  });

  test("no crea matriz cuando ninguna app afectada está habilitada", () => {
    const plan = createProductionActivationPlan({
      enabledApplications: ["finance"],
      report: fixture(),
    });
    assert.equal(plan.matrix.include.length, 0);
    assert.deepEqual(plan.deferredApplications, ["envelope", "hr"]);
  });

  test("falla cerrado si una app diferida carece de rollback READY", () => {
    const report = fixture();
    report.rollbackDrills = report.rollbackDrills.filter(
      (entry) => entry.application !== "envelope",
    );
    assert.throws(
      () =>
        createProductionActivationPlan({
          enabledApplications: ["hr"],
          report,
        }),
      /No se conoce el release conservado/,
    );
  });

  test("rechaza reportes que no sean la sombra productiva", () => {
    const report = fixture();
    report.mutationsPerformed = true;
    assert.throws(() =>
      createProductionActivationPlan({ enabledApplications: ["hr"], report }),
    );
  });

  test("resume apps activadas, diferidas y gates", () => {
    const plan = createProductionActivationPlan({
      enabledApplications: ["hr"],
      report: fixture(),
    });
    const summary = formatProductionActivationSummary(plan);
    assert.match(summary, /Apps habilitadas y afectadas: `hr`/);
    assert.match(summary, /Apps afectadas todavía diferidas: `envelope`/);
    assert.match(summary, /Gate de migraciones requerido: SI/);
  });
});
