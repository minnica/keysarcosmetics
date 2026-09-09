import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  extractReleaseSha,
  inspectVercelPilotDeployment,
  normalizeDeploymentReference,
  resolveDeploymentSelection,
  verifyServedPilotRelease,
} from "./vercel-pilot-deployment-lib.mjs";

const sha = "a".repeat(40);
const projectId = "prj_hr_test";
const deployment = {
  uid: "dpl_HrPilot123",
  url: "keysarcosmetics-hr-pilot.vercel.app",
  readyState: "READY",
  target: null,
  projectId,
  name: "keysarcosmetics-hr",
  meta: {
    githubCommitSha: sha,
    githubCommitRef: "develop",
    githubCommitOrg: "minnica",
    githubCommitRepo: "keysarcosmetics",
  },
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("contrato del deployment piloto HR", () => {
  test("normaliza únicamente IDs y hostnames HTTPS seguros", () => {
    assert.equal(normalizeDeploymentReference(deployment.uid), deployment.uid);
    assert.equal(
      normalizeDeploymentReference(`https://${deployment.url}`),
      deployment.url,
    );
    assert.throws(() => normalizeDeploymentReference("--token=secret"));
    assert.throws(() => normalizeDeploymentReference("https://host.test/path"));
  });

  test("inspecciona un Preview READY del proyecto y SHA esperados", async () => {
    const result = await inspectVercelPilotDeployment({
      projectId,
      reference: deployment.uid,
      sha,
      token: "test-token",
      fetchImpl: async () => jsonResponse(deployment),
    });
    assert.deepEqual(result, {
      deploymentId: deployment.uid,
      deploymentUrl: `https://${deployment.url}`,
      releaseSha: sha,
    });
  });

  test("el mismo contrato verifica cualquiera de los cinco proyectos", async () => {
    const financeDeployment = {
      ...deployment,
      uid: "dpl_Finance123",
      name: "keysarcosmetics-finance",
      projectId: "prj_finance_test",
      url: "keysarcosmetics-finance-preview.vercel.app",
    };
    const result = await inspectVercelPilotDeployment({
      application: "finance",
      projectId: financeDeployment.projectId,
      projectName: financeDeployment.name,
      reference: financeDeployment.uid,
      sha,
      token: "test-token",
      fetchImpl: async () => jsonResponse(financeDeployment),
    });
    assert.equal(result.deploymentId, financeDeployment.uid);
  });

  test("falla cerrado ante proyecto, target, estado o SHA incorrectos", async (context) => {
    for (const [name, override] of [
      ["project", { projectId: "prj_other" }],
      ["target", { target: "production" }],
      ["state", { readyState: "ERROR" }],
      [
        "sha",
        { meta: { ...deployment.meta, githubCommitSha: "b".repeat(40) } },
      ],
      [
        "metadata",
        { meta: { ...deployment.meta, githubCommitRef: "feature/example" } },
      ],
    ]) {
      await context.test(name, async () => {
        await assert.rejects(
          inspectVercelPilotDeployment({
            projectId,
            reference: deployment.uid,
            sha,
            token: "test-token",
            fetchImpl: async () => jsonResponse({ ...deployment, ...override }),
          }),
        );
      });
    }
  });

  test("extrae el release aunque cambie el orden de atributos", () => {
    assert.equal(
      extractReleaseSha(
        `<html><head><meta content="${sha}" data-x="1" name="keysar-release"></head></html>`,
      ),
      sha,
    );
  });

  test("verifica por HTTP la identidad y envía el bypass", async () => {
    let headers;
    const result = await verifyServedPilotRelease({
      attempts: 1,
      bypassSecret: "bypass",
      host: deployment.url,
      sha,
      fetchImpl: async (_url, options) => {
        headers = options.headers;
        return new Response(`<meta name="keysar-release" content="${sha}">`, {
          status: 200,
        });
      },
    });
    assert.equal(result.releaseSha, sha);
    assert.equal(headers["x-vercel-protection-bypass"], "bypass");
  });

  test("rechaza una página protegida o un release servido distinto", async () => {
    await assert.rejects(
      verifyServedPilotRelease({
        attempts: 1,
        bypassSecret: "bypass",
        host: deployment.url,
        sha,
        fetchImpl: async () =>
          new Response(
            `<meta name="keysar-release" content="${"b".repeat(40)}">`,
            { status: 200 },
          ),
      }),
      /no sirvió el SHA esperado/,
    );
  });

  test("sólo reutiliza una observación READY con deployment ID válido", () => {
    const impact = {
      targetSha: sha,
      results: [{ application: "hr", affected: true }],
    };
    assert.deepEqual(
      resolveDeploymentSelection(
        impact,
        {
          observations: {
            hr: { status: "READY", deploymentId: deployment.uid, sha },
          },
        },
        "hr",
      ),
      {
        affected: true,
        reusableDeploymentId: deployment.uid,
        observedStatus: "READY",
      },
    );
    assert.equal(
      resolveDeploymentSelection(
        impact,
        {
          observations: {
            hr: { status: "ERROR", deploymentId: deployment.uid, sha },
          },
        },
        "hr",
      ).reusableDeploymentId,
      null,
    );
  });
});
