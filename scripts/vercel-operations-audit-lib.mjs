import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";
import { assertVercelProjectSettings } from "./vercel-development-config-lib.mjs";

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;
const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
const EXPECTED_GIT = Object.freeze({
  organization: "minnica",
  repository: "keysarcosmetics",
  productionBranch: "master",
});

export class VercelOperationsAuditError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VercelOperationsAuditError";
    this.code = code;
  }
}

function timestamp(value, label) {
  const parsed = typeof value === "number" ? value : Date.parse(value ?? "");
  if (!Number.isFinite(parsed)) {
    throw new VercelOperationsAuditError(
      "INVALID_TIMESTAMP",
      `${label} no contiene una fecha válida`,
    );
  }
  return parsed;
}

function normalizeFlag(value, name) {
  if (value !== "true" && value !== "false") {
    throw new VercelOperationsAuditError(
      "INVALID_ACTIVATION_FLAG",
      `${name} debe valer true o false`,
    );
  }
  return value === "true";
}

function normalizeCreateDeployments(value) {
  if (value === true || value === "enabled") return true;
  if (value === false || value === "disabled") return false;
  throw new VercelOperationsAuditError(
    "UNKNOWN_GIT_INITIATOR_STATE",
    "Vercel no devolvió un estado reconocido para createDeployments",
  );
}

function sanitizeAuditMessage(message) {
  return String(message).replace(/\bprj_[A-Za-z0-9]+\b/g, "[project-id]");
}

function requireGitContract(project) {
  const link = project?.link;
  const provider = link?.type ?? link?.provider;
  const organization = link?.org ?? link?.organization;
  const repository = link?.repo ?? link?.repository;
  const productionBranch =
    link?.productionBranch ?? project?.productionBranch ?? null;
  if (
    provider !== "github" ||
    organization !== EXPECTED_GIT.organization ||
    repository !== EXPECTED_GIT.repository ||
    productionBranch !== EXPECTED_GIT.productionBranch
  ) {
    throw new VercelOperationsAuditError(
      "GIT_LINK_MISMATCH",
      "El repositorio o la rama productiva conectados en Vercel no coinciden con el contrato",
    );
  }
  return {
    provider,
    organization,
    repository,
    productionBranch,
    createDeployments: normalizeCreateDeployments(
      project?.gitProviderOptions?.createDeployments,
    ),
  };
}

function deploymentState(deployment) {
  return String(
    deployment?.readyState ?? deployment?.state ?? "",
  ).toUpperCase();
}

function deploymentTarget(deployment) {
  return deployment?.target ?? "preview";
}

function deploymentId(deployment) {
  const value = deployment?.uid ?? deployment?.id;
  if (!DEPLOYMENT_ID_PATTERN.test(value ?? "")) {
    throw new VercelOperationsAuditError(
      "INVALID_ALIAS_DEPLOYMENT",
      "La ruta estable no resolvió a un deployment ID válido",
    );
  }
  return value;
}

function requireDeploymentGit(deployment) {
  const meta = deployment?.meta;
  const sha = meta?.githubCommitSha;
  if (!FULL_SHA_PATTERN.test(sha ?? "")) {
    throw new VercelOperationsAuditError(
      "INVALID_ALIAS_RELEASE",
      "La ruta estable no expone un SHA Git completo en la metadata de Vercel",
    );
  }
  if (
    meta.githubCommitOrg !== EXPECTED_GIT.organization ||
    meta.githubCommitRepo !== EXPECTED_GIT.repository
  ) {
    throw new VercelOperationsAuditError(
      "ALIAS_REPOSITORY_MISMATCH",
      "La ruta estable resuelve a un deployment de otro repositorio",
    );
  }
  return { branch: meta.githubCommitRef, sha: sha.toLowerCase() };
}

function assertRouteDeployment({
  application,
  branch,
  environment,
  projectId,
  projectName,
  route,
  routeDeployment,
}) {
  if (!HOST_PATTERN.test(route ?? "")) {
    throw new VercelOperationsAuditError(
      "INVALID_STABLE_ROUTE",
      `La ruta estable de ${application} no es un hostname válido`,
    );
  }
  if (deploymentState(routeDeployment) !== "READY") {
    throw new VercelOperationsAuditError(
      "STABLE_ROUTE_NOT_READY",
      `La ruta estable de ${application} no resuelve a un deployment READY`,
    );
  }
  const expectedTarget =
    environment === "production" ? "production" : "preview";
  if (deploymentTarget(routeDeployment) !== expectedTarget) {
    throw new VercelOperationsAuditError(
      "STABLE_ROUTE_TARGET_MISMATCH",
      `La ruta estable de ${application} no apunta a ${expectedTarget}`,
    );
  }
  if (
    routeDeployment?.projectId !== projectId ||
    routeDeployment?.name !== projectName
  ) {
    throw new VercelOperationsAuditError(
      "STABLE_ROUTE_PROJECT_MISMATCH",
      `La ruta estable de ${application} pertenece a otro proyecto`,
    );
  }
  const git = requireDeploymentGit(routeDeployment);
  if (git.branch !== branch) {
    throw new VercelOperationsAuditError(
      "STABLE_ROUTE_BRANCH_MISMATCH",
      `La ruta estable de ${application} sirve ${git.branch}, no ${branch}`,
    );
  }
  return {
    deploymentId: deploymentId(routeDeployment),
    releaseSha: git.sha,
    route,
    target: expectedTarget,
  };
}

function normalizeIncidentLedger(ledger, environment, since) {
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.entries)) {
    throw new VercelOperationsAuditError(
      "INVALID_INCIDENT_LEDGER",
      "El registro de revisiones del detector es inválido",
    );
  }
  const ids = new Set();
  return ledger.entries
    .map((entry) => {
      if (
        typeof entry?.id !== "string" ||
        ids.has(entry.id) ||
        !["false-positive", "false-negative"].includes(entry.classification) ||
        !["development", "production"].includes(entry.environment) ||
        !ACTIVE_VERCEL_PROJECTS[entry.application] ||
        typeof entry.resolution !== "string" ||
        entry.resolution.length < 8
      ) {
        throw new VercelOperationsAuditError(
          "INVALID_INCIDENT_LEDGER",
          "Una entrada del registro de revisiones es incompleta o duplicada",
        );
      }
      ids.add(entry.id);
      if (entry.resolvedAt) {
        timestamp(entry.resolvedAt, `La resolución ${entry.id}`);
      }
      return {
        ...entry,
        detectedAtMs: timestamp(entry.detectedAt, `La revisión ${entry.id}`),
        unresolved: !entry.resolvedAt,
      };
    })
    .filter(
      (entry) =>
        entry.environment === environment && entry.detectedAtMs >= since,
    );
}

function deploymentCreatedAt(deployment) {
  return timestamp(
    deployment?.createdAt ?? deployment?.created,
    "Un deployment de Vercel",
  );
}

function deploymentGit(deployment) {
  const meta = deployment?.meta;
  if (
    meta?.githubCommitOrg !== EXPECTED_GIT.organization ||
    meta?.githubCommitRepo !== EXPECTED_GIT.repository ||
    !FULL_SHA_PATTERN.test(meta?.githubCommitSha ?? "")
  ) {
    return null;
  }
  return {
    branch: meta.githubCommitRef,
    sha: meta.githubCommitSha.toLowerCase(),
  };
}

function createMetrics({
  branch,
  ciRuns,
  diagnosticRuns,
  environment,
  incidents,
  nowMs,
  projectSnapshots,
  windowDays,
}) {
  const since = nowMs - windowDays * 24 * 60 * 60 * 1_000;
  const eligibleCiShas = new Set(
    ciRuns
      .filter(
        (run) =>
          run.event === "push" &&
          run.branch === branch &&
          run.conclusion === "success" &&
          timestamp(run.createdAt, "Una corrida CI") >= since &&
          FULL_SHA_PATTERN.test(run.sha ?? ""),
      )
      .map((run) => run.sha.toLowerCase()),
  );
  const detectorBySha = new Map(
    diagnosticRuns
      .filter(
        (run) =>
          run.branch === branch &&
          timestamp(run.createdAt, "Una corrida del detector") >= since &&
          FULL_SHA_PATTERN.test(run.sha ?? ""),
      )
      .sort(
        (left, right) =>
          timestamp(left.createdAt, "Una corrida del detector") -
          timestamp(right.createdAt, "Una corrida del detector"),
      )
      .map((run) => [run.sha.toLowerCase(), run.detectorConclusion]),
  );
  const detectorFailures = [...eligibleCiShas].filter(
    (sha) => detectorBySha.get(sha) !== "success",
  ).length;
  const expectedTarget =
    environment === "production" ? "production" : "preview";
  const relevantDeployments = [];
  const workBranchDeployments = [];
  for (const [application, snapshot] of Object.entries(projectSnapshots)) {
    for (const deployment of snapshot.deployments ?? []) {
      if (deploymentCreatedAt(deployment) < since) continue;
      const git = deploymentGit(deployment);
      if (!git) continue;
      const normalized = {
        application,
        branch: git.branch,
        sha: git.sha,
        state: deploymentState(deployment),
        target: deploymentTarget(deployment),
      };
      if (!["develop", "master"].includes(git.branch)) {
        workBranchDeployments.push(normalized);
      }
      if (
        git.branch === branch &&
        normalized.target === expectedTarget &&
        eligibleCiShas.has(git.sha)
      ) {
        relevantDeployments.push(normalized);
      }
    }
  }
  const uniquePairs = new Set(
    relevantDeployments.map((entry) => `${entry.application}:${entry.sha}`),
  );
  const broadBaseline =
    eligibleCiShas.size * Object.keys(ACTIVE_VERCEL_PROJECTS).length;
  const avoided = Math.max(0, broadBaseline - uniquePairs.size);
  const statusCounts = Object.fromEntries(
    [...new Set(relevantDeployments.map((entry) => entry.state))]
      .sort()
      .map((state) => [
        state,
        relevantDeployments.filter((entry) => entry.state === state).length,
      ]),
  );
  const reviews = normalizeIncidentLedger(incidents, environment, since);
  return {
    windowDays,
    eligibleCiPushes: eligibleCiShas.size,
    broadDeploymentBaseline: broadBaseline,
    observedDeploymentRequests: relevantDeployments.length,
    observedUniqueApplicationReleases: uniquePairs.size,
    deploymentsAvoidedAgainstBroadBaseline: avoided,
    duplicateDeploymentRequests: Math.max(
      0,
      relevantDeployments.length - uniquePairs.size,
    ),
    workBranchDeployments: workBranchDeployments.length,
    detectorFailures,
    confirmedFalsePositives: reviews.filter(
      (entry) => entry.classification === "false-positive",
    ).length,
    confirmedFalseNegatives: reviews.filter(
      (entry) => entry.classification === "false-negative",
    ).length,
    unresolvedFalseNegatives: reviews.filter(
      (entry) => entry.classification === "false-negative" && entry.unresolved,
    ).length,
    deploymentStatusCounts: statusCounts,
  };
}

export function createVercelOperationsAudit({
  branch,
  ciRuns = [],
  diagnosticRuns = [],
  environment,
  incidents,
  now = new Date(),
  projectSnapshots,
  windowDays = 30,
}) {
  const expectedBranch = environment === "production" ? "master" : "develop";
  if (
    !["development", "production"].includes(environment) ||
    branch !== expectedBranch
  ) {
    throw new VercelOperationsAuditError(
      "INVALID_AUDIT_CONTEXT",
      "La auditoría requiere development/develop o production/master",
    );
  }
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) {
    throw new VercelOperationsAuditError(
      "INVALID_AUDIT_WINDOW",
      "La ventana debe contener entre 1 y 90 días",
    );
  }
  const errors = [];
  const warnings = [];
  const projects = [];
  for (const [application, config] of Object.entries(ACTIVE_VERCEL_PROJECTS)) {
    const snapshot = projectSnapshots?.[application];
    try {
      if (!snapshot) {
        throw new VercelOperationsAuditError(
          "MISSING_PROJECT_SNAPSHOT",
          `Falta la evidencia de ${application}`,
        );
      }
      const settings = assertVercelProjectSettings(
        application,
        snapshot.project,
        snapshot.environmentVariables,
        snapshot.projectId,
        environment,
      );
      const git = requireGitContract(snapshot.project);
      const selectiveEnabled = normalizeFlag(
        snapshot.selectiveEnabled,
        config.deployment[
          environment === "production"
            ? "productionEnabledVariable"
            : "enabledVariable"
        ],
      );
      const initiators =
        Number(git.createDeployments) + Number(selectiveEnabled);
      if (initiators !== 1) {
        throw new VercelOperationsAuditError(
          "INVALID_INITIATOR_COUNT",
          `${application} tiene ${initiators} iniciadores automáticos; debe tener exactamente uno`,
        );
      }
      const release = assertRouteDeployment({
        application,
        branch,
        environment,
        projectId: snapshot.projectId,
        projectName: config.project,
        route: snapshot.route,
        routeDeployment: snapshot.routeDeployment,
      });
      projects.push({
        application,
        project: config.project,
        root: settings.root,
        route: release.route,
        releaseSha: release.releaseSha,
        deploymentId: release.deploymentId,
        productionBranch: git.productionBranch,
        gitDeploymentsEnabled: git.createDeployments,
        selectiveDeploymentsEnabled: selectiveEnabled,
        automaticInitiator: selectiveEnabled ? "github-actions" : "vercel-git",
      });
    } catch (error) {
      errors.push({
        application,
        code: error?.code ?? "UNEXPECTED_AUDIT_ERROR",
        message: sanitizeAuditMessage(error.message),
      });
    }
  }
  const metrics = createMetrics({
    branch,
    ciRuns,
    diagnosticRuns,
    environment,
    incidents,
    nowMs: timestamp(now, "La fecha de auditoría"),
    projectSnapshots,
    windowDays,
  });
  const steadyState =
    projects.length === Object.keys(ACTIVE_VERCEL_PROJECTS).length &&
    projects.every(
      (project) =>
        project.selectiveDeploymentsEnabled && !project.gitDeploymentsEnabled,
    );
  if (!steadyState) {
    warnings.push(
      "La migración remota continúa en transición; no todos los proyectos usan todavía GitHub Actions como iniciador único.",
    );
  }
  if (metrics.workBranchDeployments > 0) {
    warnings.push(
      `Se observaron ${metrics.workBranchDeployments} deployments de ramas de trabajo dentro de la ventana.`,
    );
  }
  if (metrics.detectorFailures > 0) {
    warnings.push(
      `Se observaron ${metrics.detectorFailures} corridas CI verdes sin detector verde.`,
    );
  }
  if (metrics.confirmedFalsePositives > 0) {
    warnings.push(
      `El registro contiene ${metrics.confirmedFalsePositives} falsos positivos confirmados.`,
    );
  }
  if (metrics.unresolvedFalseNegatives > 0) {
    errors.push({
      application: "all",
      code: "UNRESOLVED_FALSE_NEGATIVE",
      message: "Existe al menos un falso negativo confirmado sin resolver.",
    });
  }
  const status =
    errors.length > 0 ? "blocked" : steadyState ? "ready" : "transition";
  return {
    schemaVersion: 1,
    kind: "vercel-operations-audit",
    mode: "read-only",
    environment,
    branch,
    capturedAt: new Date(now).toISOString(),
    status,
    phase9Ready:
      status === "ready" &&
      metrics.workBranchDeployments === 0 &&
      metrics.detectorFailures === 0 &&
      metrics.unresolvedFalseNegatives === 0,
    projects,
    releaseManifest: {
      schemaVersion: 1,
      environment,
      releases: Object.fromEntries(
        projects.map((project) => [project.application, project.releaseSha]),
      ),
    },
    metrics,
    warnings,
    errors,
  };
}

export function formatVercelOperationsAudit(audit) {
  const lines = [
    `## Auditoría operativa Vercel — ${audit.environment}`,
    "",
    `- Estado: **${audit.status.toUpperCase()}**.`,
    `- Fase 9 lista remotamente: **${audit.phase9Ready ? "SÍ" : "NO"}**.`,
    `- Ventana de métricas: ${audit.metrics.windowDays} días.`,
    "",
    "| App | Root Directory | Ruta estable | SHA | Iniciador automático |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const project of audit.projects) {
    lines.push(
      `| ${project.application} | \`${project.root}\` | ${project.route} | \`${project.releaseSha.slice(0, 8)}\` | ${project.automaticInitiator} |`,
    );
  }
  lines.push(
    "",
    "### Métricas",
    "",
    `- Deployments evitados contra fan-out amplio: **${audit.metrics.deploymentsAvoidedAgainstBroadBaseline}**.`,
    `- Fallos del detector: **${audit.metrics.detectorFailures}**.`,
    `- Falsos positivos confirmados: **${audit.metrics.confirmedFalsePositives}**.`,
    `- Falsos negativos confirmados: **${audit.metrics.confirmedFalseNegatives}**.`,
    `- Deployments de ramas de trabajo observados: **${audit.metrics.workBranchDeployments}**.`,
  );
  if (audit.warnings.length > 0) {
    lines.push("", "### Advertencias", "");
    lines.push(...audit.warnings.map((warning) => `- ${warning}`));
  }
  if (audit.errors.length > 0) {
    lines.push("", "### Bloqueos", "");
    lines.push(
      ...audit.errors.map(
        (error) =>
          `- \`${error.code}\` (${error.application}): ${error.message}`,
      ),
    );
  }
  return `${lines.join("\n")}\n`;
}
