#!/usr/bin/env node

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";
import {
  createVercelOperationsAudit,
  formatVercelOperationsAudit,
} from "./vercel-operations-audit-lib.mjs";

const VERCEL_API_ORIGIN = "https://api.vercel.com";
const GITHUB_API_ORIGIN = "https://api.github.com";

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Argumentos inválidos cerca de ${key ?? "fin"}`);
    }
    values.set(key, value);
  }
  for (const required of [
    "--branch",
    "--environment",
    "--manifest",
    "--output",
  ]) {
    if (!values.has(required)) throw new Error(`Falta ${required}`);
  }
  return {
    branch: values.get("--branch"),
    environment: values.get("--environment"),
    incidentLedger:
      values.get("--incident-ledger") ?? "docs/vercel-detector-reviews.json",
    manifest: values.get("--manifest"),
    output: values.get("--output"),
    windowDays: Number(values.get("--window-days") ?? "30"),
  };
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function requestJson(url, token, provider) {
  const response = await fetch(url, {
    headers:
      provider === "github"
        ? {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          }
        : { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`${provider} respondió HTTP ${response.status}`);
  }
  return response.json();
}

async function collectDeployments(projectId, since, token) {
  const deployments = [];
  let until;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL("/v6/deployments", VERCEL_API_ORIGIN);
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("limit", "100");
    url.searchParams.set("since", String(since));
    if (until !== undefined) url.searchParams.set("until", String(until));
    const payload = await requestJson(url, token, "vercel");
    if (!Array.isArray(payload?.deployments)) {
      throw new Error("Vercel no devolvió una lista de deployments");
    }
    deployments.push(...payload.deployments);
    const next = payload.pagination?.next;
    if (next === null || next === undefined) return deployments;
    until = next;
  }
  throw new Error(
    "El historial Vercel excedió 20 páginas; la auditoría queda inconclusa",
  );
}

async function collectProjectSnapshot({
  application,
  environment,
  since,
  token,
}) {
  const suffix = application.toUpperCase();
  const projectId = requiredEnvironment(`VERCEL_PROJECT_ID_${suffix}`);
  const route = requiredEnvironment(`VERCEL_ROUTE_${suffix}`);
  const selectiveEnabled = requiredEnvironment(`VERCEL_SELECTIVE_${suffix}`);
  const projectUrl = new URL(
    `/v9/projects/${encodeURIComponent(projectId)}`,
    VERCEL_API_ORIGIN,
  );
  const envUrl = new URL(
    `/v10/projects/${encodeURIComponent(projectId)}/env`,
    VERCEL_API_ORIGIN,
  );
  envUrl.searchParams.set(
    "target",
    environment === "production" ? "production" : "preview",
  );
  if (environment === "development")
    envUrl.searchParams.set("gitBranch", "develop");
  envUrl.searchParams.set("decrypt", "false");
  const routeUrl = new URL(
    `/v13/deployments/${encodeURIComponent(route)}`,
    VERCEL_API_ORIGIN,
  );
  const [project, environmentPayload, routeDeployment, deployments] =
    await Promise.all([
      requestJson(projectUrl, token, "vercel"),
      requestJson(envUrl, token, "vercel"),
      requestJson(routeUrl, token, "vercel"),
      collectDeployments(projectId, since, token),
    ]);
  return {
    application,
    projectId,
    route,
    selectiveEnabled,
    project,
    environmentVariables: environmentPayload?.envs,
    routeDeployment,
    deployments,
  };
}

async function collectWorkflowRuns({ branch, token, workflow }) {
  const runs = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(
      `/repos/minnica/keysarcosmetics/actions/workflows/${encodeURIComponent(workflow)}/runs`,
      GITHUB_API_ORIGIN,
    );
    url.searchParams.set("branch", branch);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const payload = await requestJson(url, token, "github");
    if (!Array.isArray(payload?.workflow_runs)) {
      throw new Error("GitHub no devolvió corridas de workflow");
    }
    runs.push(...payload.workflow_runs);
    if (payload.workflow_runs.length < 100) return runs;
  }
  throw new Error(
    "El historial de Actions excedió 1,000 corridas; la auditoría queda inconclusa",
  );
}

async function collectGitHubEvidence({ branch, since, token }) {
  const [ciPayload, diagnosticPayload] = await Promise.all([
    collectWorkflowRuns({ branch, token, workflow: "ci.yml" }),
    collectWorkflowRuns({
      branch,
      token,
      workflow: "vercel-impact-diagnostic.yml",
    }),
  ]);
  const ciRuns = ciPayload.map((run) => ({
    id: run.id,
    event: run.event,
    branch: run.head_branch,
    sha: run.head_sha,
    conclusion: run.conclusion,
    createdAt: run.created_at,
  }));
  const recentDiagnostics = diagnosticPayload.filter(
    (run) => Date.parse(run.created_at) >= since,
  );
  const diagnosticRuns = await Promise.all(
    recentDiagnostics.map(async (run) => {
      const jobsUrl = new URL(
        `/repos/minnica/keysarcosmetics/actions/runs/${run.id}/jobs`,
        GITHUB_API_ORIGIN,
      );
      jobsUrl.searchParams.set("filter", "latest");
      jobsUrl.searchParams.set("per_page", "100");
      const payload = await requestJson(jobsUrl, token, "github");
      const detector = payload?.jobs?.find(
        (job) => job.name === "Select affected Vercel frontends",
      );
      return {
        id: run.id,
        branch: run.head_branch,
        sha: run.head_sha,
        createdAt: run.created_at,
        detectorConclusion: detector?.conclusion ?? "missing",
      };
    }),
  );
  return { ciRuns, diagnosticRuns };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const vercelToken = requiredEnvironment("VERCEL_TOKEN_READ_ONLY");
  const githubToken = requiredEnvironment("GITHUB_TOKEN");
  const now = new Date();
  const since = now.getTime() - options.windowDays * 24 * 60 * 60 * 1_000;
  const snapshots = await Promise.all(
    Object.keys(ACTIVE_VERCEL_PROJECTS).map((application) =>
      collectProjectSnapshot({
        application,
        environment: options.environment,
        since,
        token: vercelToken,
      }),
    ),
  );
  const projectSnapshots = Object.fromEntries(
    snapshots.map((snapshot) => [snapshot.application, snapshot]),
  );
  const github = await collectGitHubEvidence({
    branch: options.branch,
    since,
    token: githubToken,
  });
  const incidents = JSON.parse(readFileSync(options.incidentLedger, "utf8"));
  const audit = createVercelOperationsAudit({
    branch: options.branch,
    environment: options.environment,
    incidents,
    now,
    projectSnapshots,
    windowDays: options.windowDays,
    ...github,
  });
  writeFileSync(options.output, `${JSON.stringify(audit, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  writeFileSync(
    options.manifest,
    `${JSON.stringify(audit.releaseManifest, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const summary = formatVercelOperationsAudit(audit);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  } else {
    process.stderr.write(summary);
  }
  if (audit.status === "blocked") process.exitCode = 2;
}

try {
  await main();
} catch (error) {
  process.stderr.write(`ERROR OPERATIONS_AUDIT: ${error.message}\n`);
  process.exitCode = 2;
}
