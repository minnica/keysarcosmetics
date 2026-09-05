import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";
import { inspectVercelProject } from "./vercel-development-config-lib.mjs";
import { inspectVercelPilotDeployment } from "./vercel-pilot-deployment-lib.mjs";

const sha = "a".repeat(40);

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe("contrato del deployment selectivo productivo", () => {
  test("define controles productivos independientes por aplicación", () => {
    for (const config of Object.values(ACTIVE_VERCEL_PROJECTS)) {
      assert.match(
        config.deployment.productionEnabledVariable,
        /_PRODUCTION_SELECTIVE_ENABLED$/,
      );
      assert.match(
        config.deployment.productionAliasVariable,
        /_PRODUCTION_DOMAIN$/,
      );
      assert.match(
        config.deployment.productionCompatibilityVariable,
        /_PRODUCTION_COMPATIBILITY$/,
      );
      assert.ok(
        Array.isArray(config.projectSettings.requiredProductionVariables),
      );
    }
  });

  test("consulta variables Production sin descifrar valores", async () => {
    const config = ACTIVE_VERCEL_PROJECTS.scheduler;
    const seen = [];
    const result = await inspectVercelProject({
      application: "scheduler",
      environment: "production",
      projectId: "prj_scheduler",
      token: "test-token",
      fetchImpl: async (url) => {
        seen.push(url.toString());
        if (url.pathname.endsWith("/env")) {
          return jsonResponse({
            envs: [{ key: "NEXT_PUBLIC_API_URL", value: "no-debe-salir" }],
          });
        }
        return jsonResponse({
          id: "prj_scheduler",
          name: config.project,
          rootDirectory: config.root,
          framework: config.projectSettings.framework,
          nodeVersion: config.projectSettings.nodeVersion,
          installCommand: config.projectSettings.installCommand,
          buildCommand: config.projectSettings.buildCommand,
          outputDirectory: config.projectSettings.outputDirectory,
        });
      },
    });
    assert.deepEqual(result.requiredProductionVariables, [
      "NEXT_PUBLIC_API_URL",
    ]);
    assert.equal(JSON.stringify(result).includes("no-debe-salir"), false);
    assert.equal(
      seen.some((url) => url.includes("target=production")),
      true,
    );
    assert.equal(
      seen.some((url) => url.includes("decrypt=false")),
      true,
    );
    assert.equal(
      seen.some((url) => url.includes("gitBranch=")),
      false,
    );
  });

  test("acepta únicamente un deployment Production READY de master", async () => {
    const payload = {
      uid: "dpl_Production123",
      url: "keysarcosmetics-hr-production.vercel.app",
      readyState: "READY",
      target: "production",
      projectId: "prj_hr",
      name: "keysarcosmetics-hr",
      meta: {
        githubCommitSha: sha,
        githubCommitRef: "master",
        githubCommitOrg: "minnica",
        githubCommitRepo: "keysarcosmetics",
      },
    };
    const result = await inspectVercelPilotDeployment({
      application: "hr",
      branch: "master",
      environment: "production",
      projectId: "prj_hr",
      projectName: "keysarcosmetics-hr",
      reference: payload.uid,
      sha,
      token: "test-token",
      fetchImpl: async () => jsonResponse(payload),
    });
    assert.equal(result.deploymentId, payload.uid);
    await assert.rejects(
      inspectVercelPilotDeployment({
        application: "hr",
        branch: "master",
        environment: "production",
        projectId: "prj_hr",
        projectName: "keysarcosmetics-hr",
        reference: payload.uid,
        sha,
        token: "test-token",
        fetchImpl: async () => jsonResponse({ ...payload, target: null }),
      }),
      /requiere un deployment production/,
    );
  });

  test("el workflow automático exige gates, build Production y dominio posterior", () => {
    const workflow = readFileSync(
      ".github/workflows/vercel-impact-diagnostic.yml",
      "utf8",
    );
    for (const expected of [
      "deploy-selected-production:",
      "environment: production",
      "VERCEL_PRODUCTION_API_GATE_SHA",
      "VERCEL_PRODUCTION_DATABASE_GATE_SHA",
      "vercel build --prod",
      "vercel deploy --prebuilt --prod --skip-domain",
      "Ensure this SHA is still the head of master",
      "Promote the verified Production deployment",
      "vercel promote",
      "Run authenticated read-only production smoke",
      "Observe HTTP errors, release identity and latency for 15 minutes",
      "Record a fail-closed production smoke or observation error",
      "cancel-in-progress: false",
    ]) {
      assert.match(workflow, new RegExp(expected.replaceAll("-", "\\-")));
    }
  });

  test("el workflow manual separa ensayo, publicación y rollback", () => {
    const workflow = readFileSync(
      ".github/workflows/vercel-production-manual.yml",
      "utf8",
    );
    for (const expected of [
      "deploy_without_domain",
      "publish_existing",
      "rollback",
      "PUBLICAR_PRODUCCION",
      "ROLLBACK_PRODUCCION",
      "VERCEL_PRODUCTION_MANUAL_GATE",
      "Verify API readiness and manual compatibility approval",
      "--skip-domain",
      "vercel promote",
      "vercel rollback",
      'test "$(git ls-remote origin refs/heads/master | cut -f1)" = "$TARGET_SHA"',
    ]) {
      assert.ok(workflow.includes(expected));
    }
  });

  test("Production builds ejecuta el contrato productivo", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    assert.ok(workflow.includes("pnpm deploy:production:test"));
  });
});
