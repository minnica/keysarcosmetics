import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";
import {
  assertVercelProjectSettings,
  inspectVercelDevelopmentProject,
} from "./vercel-development-config-lib.mjs";

function projectPayload(application, projectId = `prj_${application}`) {
  const config = ACTIVE_VERCEL_PROJECTS[application];
  return {
    id: projectId,
    name: config.project,
    rootDirectory: config.root,
    ...config.projectSettings,
    requiredPreviewVariables: undefined,
  };
}

describe("contrato de los cinco proyectos Vercel de development", () => {
  test("define activación, credenciales, alias y settings por aplicación", () => {
    assert.deepEqual(Object.keys(ACTIVE_VERCEL_PROJECTS), [
      "envelope",
      "finance",
      "hr",
      "payroll",
      "scheduler",
    ]);
    for (const [application, config] of Object.entries(
      ACTIVE_VERCEL_PROJECTS,
    )) {
      assert.equal(config.project, `keysarcosmetics-${application}`);
      assert.equal(config.root, `apps/${application}`);
      assert.equal(config.projectSettings.nodeVersion, "22.x");
      assert.match(config.deployment.enabledVariable, /_SELECTIVE_ENABLED$/);
      assert.match(config.deployment.projectIdSecret, /^VERCEL_PROJECT_ID_/);
      assert.match(config.deployment.tokenSecret, /^VERCEL_TOKEN_/);
      assert.match(config.deployment.aliasVariable, /_DEVELOP_ALIAS$/);
    }
  });

  test("acepta settings exactos y sólo registra nombres de variables", () => {
    const result = assertVercelProjectSettings(
      "scheduler",
      projectPayload("scheduler"),
      [{ key: "NEXT_PUBLIC_API_URL", value: "no-debe-salir" }],
      "prj_scheduler",
    );
    assert.deepEqual(result.requiredPreviewVariables, ["NEXT_PUBLIC_API_URL"]);
    assert.deepEqual(result.observedPreviewVariableNames, [
      "NEXT_PUBLIC_API_URL",
    ]);
    assert.equal(JSON.stringify(result).includes("no-debe-salir"), false);
  });

  test("falla cerrado ante root, runtime, build, output o variable ausente", () => {
    for (const override of [
      { rootDirectory: "apps/other" },
      { nodeVersion: "24.x" },
      { buildCommand: null },
      { outputDirectory: null },
    ]) {
      assert.throws(() =>
        assertVercelProjectSettings(
          "scheduler",
          { ...projectPayload("scheduler"), ...override },
          [{ key: "NEXT_PUBLIC_API_URL" }],
          "prj_scheduler",
        ),
      );
    }
    assert.throws(() =>
      assertVercelProjectSettings(
        "scheduler",
        projectPayload("scheduler"),
        [],
        "prj_scheduler",
      ),
    );
    assert.throws(() =>
      assertVercelProjectSettings(
        "hr",
        projectPayload("hr"),
        [{ key: "UNEXPECTED_SECRET" }],
        "prj_hr",
      ),
    );
  });

  test("consulta proyecto y variables Preview de develop sin descifrarlas", async () => {
    const seen = [];
    const result = await inspectVercelDevelopmentProject({
      application: "hr",
      projectId: "prj_hr",
      token: "test-token",
      fetchImpl: async (url) => {
        seen.push(url.toString());
        return new Response(
          JSON.stringify(
            url.pathname.endsWith("/env") ? { envs: [] } : projectPayload("hr"),
          ),
          { status: 200 },
        );
      },
    });
    assert.equal(result.application, "hr");
    assert.equal(
      seen.some((url) => url.includes("decrypt=false")),
      true,
    );
    assert.equal(
      seen.some((url) => url.includes("gitBranch=develop")),
      true,
    );
  });
});
