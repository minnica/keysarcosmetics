import { execFileSync } from "node:child_process";

const VERCEL_API_ORIGIN = "https://api.vercel.com";
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export const ACTIVE_VERCEL_PROJECTS = Object.freeze({
  envelope: {
    project: "keysarcosmetics-envelope",
    root: "apps/envelope",
  },
  finance: {
    project: "keysarcosmetics-finance",
    root: "apps/finance",
  },
  hr: { project: "keysarcosmetics-hr", root: "apps/hr" },
  payroll: {
    project: "keysarcosmetics-payroll",
    root: "apps/payroll",
  },
  scheduler: {
    project: "keysarcosmetics-scheduler",
    root: "apps/scheduler",
  },
});

export const UNPROVISIONED_VERCEL_APPLICATIONS = Object.freeze([
  "landing",
  "crm",
  "pos",
]);

export class VercelDeploymentStateError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "VercelDeploymentStateError";
    this.code = code;
    this.details = details;
  }
}

function asTimestamp(deployment) {
  const raw = deployment.createdAt ?? deployment.created;
  const timestamp =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Date.parse(raw)
        : NaN;
  if (!Number.isFinite(timestamp)) {
    throw new VercelDeploymentStateError(
      "INVALID_VERCEL_DEPLOYMENT",
      "Vercel devolvió un deployment sin fecha válida",
    );
  }
  return timestamp;
}

function deploymentStatus(deployment) {
  const status = deployment.readyState ?? deployment.state;
  if (typeof status !== "string" || status.length === 0) {
    throw new VercelDeploymentStateError(
      "INVALID_VERCEL_DEPLOYMENT",
      "Vercel devolvió un deployment sin estado",
    );
  }
  return status.toUpperCase();
}

function deploymentGitMetadata(deployment) {
  const meta = deployment.meta;
  if (!meta || typeof meta !== "object") return null;
  const sha = meta.githubCommitSha;
  const branch = meta.githubCommitRef;
  const organization = meta.githubCommitOrg ?? meta.githubOrg;
  const repository = meta.githubCommitRepo;
  if (
    typeof sha !== "string" ||
    typeof branch !== "string" ||
    typeof organization !== "string" ||
    typeof repository !== "string"
  ) {
    return null;
  }
  if (!FULL_SHA_PATTERN.test(sha)) {
    throw new VercelDeploymentStateError(
      "INVALID_VERCEL_DEPLOYMENT",
      "Vercel devolvió un SHA Git inválido",
    );
  }
  return { branch, organization, repository, sha: sha.toLowerCase() };
}

function deploymentId(deployment) {
  const id = deployment.uid ?? deployment.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function targetForEnvironment(environment) {
  if (environment === "development") return "preview";
  if (environment === "production") return "production";
  throw new VercelDeploymentStateError(
    "INVALID_ENVIRONMENT",
    "El ambiente debe ser development o production",
  );
}

async function requestDeployments({
  fetchImpl,
  project,
  target,
  token,
  until,
}) {
  const url = new URL("/v6/deployments", VERCEL_API_ORIGIN);
  url.searchParams.set("projectId", project);
  // La API representa Preview con target nulo. Sólo Production admite un
  // filtro target estable; Preview se filtra localmente.
  if (target === "production") url.searchParams.set("target", target);
  url.searchParams.set("limit", "100");
  if (until !== undefined) url.searchParams.set("until", String(until));

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new VercelDeploymentStateError(
      "VERCEL_API_UNAVAILABLE",
      `No se pudo consultar el historial de ${project}: ${error.message}`,
    );
  }
  if (!response.ok) {
    throw new VercelDeploymentStateError(
      "VERCEL_API_ERROR",
      `Vercel respondió HTTP ${response.status} al consultar ${project}`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new VercelDeploymentStateError(
      "VERCEL_API_ERROR",
      `Vercel devolvió JSON inválido al consultar ${project}`,
    );
  }
  if (!payload || !Array.isArray(payload.deployments)) {
    throw new VercelDeploymentStateError(
      "VERCEL_API_ERROR",
      `Vercel devolvió una respuesta incompleta al consultar ${project}`,
    );
  }
  return payload;
}

export function createGitAncestorChecker(repositoryRoot = process.cwd()) {
  return (baseSha, targetSha) => {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", baseSha, targetSha], {
        cwd: repositoryRoot,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  };
}

export async function collectProjectDeploymentHistory({
  application,
  branch,
  fetchImpl = fetch,
  isAncestor,
  maxPages = 20,
  organization = "minnica",
  project,
  repository = "keysarcosmetics",
  target,
  targetSha,
  token,
}) {
  if (typeof isAncestor !== "function") {
    throw new VercelDeploymentStateError(
      "INVALID_GIT_CHECKER",
      "Se requiere una comprobación de ancestros Git",
    );
  }
  if (!FULL_SHA_PATTERN.test(targetSha)) {
    throw new VercelDeploymentStateError(
      "INVALID_TARGET_SHA",
      "El SHA objetivo debe contener 40 caracteres hexadecimales",
    );
  }
  const normalizedTargetSha = targetSha.toLowerCase();
  const entries = [];
  let observation = null;
  let until;
  const seenCursors = new Set();

  for (let page = 0; page < maxPages; page += 1) {
    const payload = await requestDeployments({
      fetchImpl,
      project,
      target,
      token,
      until,
    });
    const deployments = [...payload.deployments].sort(
      (left, right) => asTimestamp(right) - asTimestamp(left),
    );

    for (const deployment of deployments) {
      const deploymentTarget = deployment.target ?? "preview";
      if (deploymentTarget !== target) continue;
      const git = deploymentGitMetadata(deployment);
      if (
        !git ||
        git.branch !== branch ||
        git.organization !== organization ||
        git.repository !== repository
      )
        continue;

      const normalized = {
        createdAt: new Date(asTimestamp(deployment)).toISOString(),
        deploymentId: deploymentId(deployment),
        sha: git.sha,
        status: deploymentStatus(deployment),
      };
      if (git.sha === normalizedTargetSha) {
        if (!observation || normalized.createdAt > observation.createdAt) {
          observation = normalized;
        }
        continue;
      }
      if (!isAncestor(git.sha, normalizedTargetSha)) continue;
      entries.push(normalized);
    }

    entries.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
    if (entries.some((entry) => entry.status === "READY")) break;

    const next = payload.pagination?.next;
    if (next === null || next === undefined) break;
    const cursor = String(next);
    if (seenCursors.has(cursor)) {
      throw new VercelDeploymentStateError(
        "VERCEL_API_PAGINATION_LOOP",
        `Vercel repitió el cursor de paginación para ${project}`,
      );
    }
    seenCursors.add(cursor);
    until = next;
  }

  if (!entries.some((entry) => entry.status === "READY")) {
    throw new VercelDeploymentStateError(
      "MISSING_DEPLOYMENT_BASE",
      `No se encontró un deployment READY anterior y ancestro para ${application}`,
    );
  }

  return { entries, observation };
}

export async function collectVercelDeploymentEvidence({
  branch,
  environment,
  fetchImpl = fetch,
  isAncestor,
  organization = "minnica",
  projects = ACTIVE_VERCEL_PROJECTS,
  repository = "keysarcosmetics",
  targetSha,
  token,
}) {
  if (!token) {
    throw new VercelDeploymentStateError(
      "MISSING_VERCEL_TOKEN",
      "Falta el token de sólo lectura para consultar Vercel",
    );
  }
  if (!FULL_SHA_PATTERN.test(targetSha)) {
    throw new VercelDeploymentStateError(
      "INVALID_TARGET_SHA",
      "El SHA objetivo debe contener 40 caracteres hexadecimales",
    );
  }
  const expectedBranch = environment === "development" ? "develop" : "master";
  if (branch !== expectedBranch) {
    throw new VercelDeploymentStateError(
      "INVALID_BRANCH",
      `${environment} sólo puede evaluar la rama ${expectedBranch}`,
    );
  }

  const target = targetForEnvironment(environment);
  const state = { environments: { [environment]: {} } };
  const observations = {};

  for (const [application, config] of Object.entries(projects)) {
    const history = await collectProjectDeploymentHistory({
      application,
      branch,
      fetchImpl,
      isAncestor,
      organization,
      project: config.project,
      repository,
      target,
      targetSha: targetSha.toLowerCase(),
      token,
    });
    state.environments[environment][application] = history.entries;
    observations[application] = history.observation;
  }

  return {
    schemaVersion: 1,
    mode: "read-only-diagnostic",
    environment,
    branch,
    targetSha: targetSha.toLowerCase(),
    capturedAt: new Date().toISOString(),
    projects: Object.fromEntries(
      Object.entries(projects).map(([application, config]) => [
        application,
        { project: config.project, root: config.root },
      ]),
    ),
    unprovisionedApplications: [...UNPROVISIONED_VERCEL_APPLICATIONS],
    observations,
    environments: state.environments,
  };
}
