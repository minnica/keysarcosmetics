import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";
import { createExpectedFrontendReleases } from "./vercel-impact-summary-lib.mjs";

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;
const API_GLOBAL_FILES = new Set([
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "turbo.json",
]);

export class ProductionShadowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProductionShadowError";
    this.code = code;
  }
}

function requireFullSha(value, label) {
  if (!FULL_SHA_PATTERN.test(value ?? "")) {
    throw new ProductionShadowError(
      "INVALID_RELEASE_SHA",
      `${label} debe ser un SHA Git completo`,
    );
  }
  return value.toLowerCase();
}

function assertProductionDiagnostic(impact, evidence) {
  if (
    impact?.status !== "ok" ||
    impact?.mode !== "diagnostic" ||
    impact?.environment !== "production" ||
    impact?.branch !== "master"
  ) {
    throw new ProductionShadowError(
      "INVALID_PRODUCTION_DIAGNOSTIC",
      "La sombra productiva requiere un diagnóstico válido de production/master",
    );
  }
  for (const key of ["environment", "branch", "targetSha"]) {
    if (impact[key] !== evidence?.[key]) {
      throw new ProductionShadowError(
        "EVIDENCE_MISMATCH",
        `La evidencia productiva no coincide en ${key}`,
      );
    }
  }
}

export function classifyApiCoordination(changedFiles) {
  if (!Array.isArray(changedFiles)) {
    throw new ProductionShadowError(
      "INVALID_API_DIFF",
      "Los cambios del API deben ser una lista",
    );
  }
  const normalized = [...new Set(changedFiles)].sort();
  const migrationFiles = normalized.filter(
    (file) =>
      file.startsWith("backend/api/prisma/migrations/") ||
      file === "backend/api/prisma/schema.prisma",
  );
  const directApiFiles = normalized.filter((file) =>
    file.startsWith("backend/api/"),
  );
  const sharedContractFiles = normalized.filter((file) =>
    file.startsWith("packages/types/"),
  );
  const globalFiles = normalized.filter((file) => API_GLOBAL_FILES.has(file));
  const reasons = [];
  if (directApiFiles.length > 0) reasons.push("backend-api");
  if (sharedContractFiles.length > 0) reasons.push("shared-types");
  if (globalFiles.length > 0) reasons.push("global-build-input");
  if (migrationFiles.length > 0) reasons.push("database-migration");

  return {
    apiDeploymentRequired: reasons.length > 0,
    databaseGateRequired: migrationFiles.length > 0,
    reasons,
    files: {
      api: directApiFiles,
      global: globalFiles,
      migrations: migrationFiles,
      sharedContracts: sharedContractFiles,
    },
  };
}

function rollbackTarget(result, evidence) {
  const entries = evidence?.environments?.production?.[result.application];
  if (!Array.isArray(entries)) {
    throw new ProductionShadowError(
      "MISSING_ROLLBACK_HISTORY",
      `Falta historial productivo para ${result.application}`,
    );
  }
  const target = entries.find(
    (entry) =>
      entry?.status === "READY" &&
      entry?.sha?.toLowerCase() === result.baseSha?.toLowerCase(),
  );
  if (!target || !DEPLOYMENT_ID_PATTERN.test(target.deploymentId ?? "")) {
    throw new ProductionShadowError(
      "MISSING_ROLLBACK_TARGET",
      `No existe un deployment READY identificable para regresar ${result.application} a ${result.baseSha}`,
    );
  }
  return {
    application: result.application,
    deploymentId: target.deploymentId,
    releaseSha: requireFullSha(target.sha, "El SHA de rollback"),
  };
}

function compatibilityGate(application, frontendAffected, apiRequired) {
  const policy = ACTIVE_VERCEL_PROJECTS[application]?.productionCompatibility;
  if (!policy) {
    throw new ProductionShadowError(
      "MISSING_COMPATIBILITY_POLICY",
      `Falta la política de compatibilidad productiva de ${application}`,
    );
  }
  return {
    application,
    mode: policy.apiMode,
    required:
      policy.apiMode === "approved-pair"
        ? frontendAffected || apiRequired
        : policy.apiMode === "backward-compatible"
          ? frontendAffected || apiRequired
          : false,
    description: policy.description,
  };
}

export function createProductionShadowReport({
  apiChangedFiles,
  currentApiSha,
  evidence,
  impact,
  generatedAt = new Date().toISOString(),
}) {
  assertProductionDiagnostic(impact, evidence);
  const targetSha = requireFullSha(impact.targetSha, "El SHA objetivo");
  const normalizedCurrentApiSha = requireFullSha(
    currentApiSha,
    "El SHA actual del API",
  );
  if (new Date(generatedAt).toISOString() !== generatedAt) {
    throw new ProductionShadowError(
      "INVALID_GENERATED_AT",
      "generatedAt debe ser una fecha ISO UTC exacta",
    );
  }

  const api = classifyApiCoordination(apiChangedFiles);
  const expectedFrontends = createExpectedFrontendReleases(impact, evidence);
  const expectedApiSha = api.apiDeploymentRequired
    ? targetSha
    : normalizedCurrentApiSha;
  const expectedReleases = {
    ...expectedFrontends,
    api: expectedApiSha,
  };
  const applications = Object.keys(ACTIVE_VERCEL_PROJECTS);
  for (const application of applications) {
    requireFullSha(
      expectedReleases[application],
      `El SHA teórico de ${application}`,
    );
  }

  const comparisons = impact.results.map((result) => {
    const observation = evidence.observations?.[result.application] ?? null;
    const observedForTarget =
      observation?.sha?.toLowerCase() === targetSha ? observation : null;
    return {
      application: result.application,
      selectiveDecision: result.affected ? "deploy" : "skip",
      broadDeploymentObserved: observedForTarget !== null,
      broadDeploymentId: observedForTarget?.deploymentId ?? null,
      broadStatus: observedForTarget?.status ?? null,
      avoidableBroadDeployment: !result.affected && observedForTarget !== null,
    };
  });

  const rollbackDrills = impact.results
    .filter((result) => result.affected)
    .map((result) => {
      const target = rollbackTarget(result, evidence);
      return {
        ...target,
        manifestAfterRollback: {
          ...expectedReleases,
          [result.application]: target.releaseSha,
        },
      };
    });

  const compatibility = impact.results.map((result) =>
    compatibilityGate(
      result.application,
      result.affected,
      api.apiDeploymentRequired,
    ),
  );
  const publicationOrder = api.apiDeploymentRequired
    ? [
        ...(api.databaseGateRequired
          ? ["backup-pitr", "deploy-api-migrations"]
          : ["deploy-api"]),
        "verify-api-health-ready",
        "publish-selected-frontends",
        "verify-production-manifest",
        "run-production-smokes",
        "observe-and-tag",
      ]
    : [
        "publish-selected-frontends",
        "verify-production-manifest",
        "run-production-smokes",
        "observe-and-tag",
      ];

  return {
    schemaVersion: 1,
    kind: "vercel-production-shadow",
    mode: "read-only",
    environment: "production",
    branch: "master",
    generatedAt,
    targetSha,
    mutationsPerformed: false,
    approvalToActivateSelectiveProduction: false,
    selection: {
      affectedApplications: [...impact.affectedApplications],
      skippedApplications: [...impact.skippedApplications],
      expectedSelectiveDeployments: impact.affectedApplications.length,
    },
    broadComparison: {
      observedDeployments: comparisons.filter(
        (entry) => entry.broadDeploymentObserved,
      ).length,
      avoidableDeployments: comparisons.filter(
        (entry) => entry.avoidableBroadDeployment,
      ).length,
      applications: comparisons,
    },
    api: {
      currentReleaseSha: normalizedCurrentApiSha,
      expectedReleaseSha: expectedApiSha,
      ...api,
    },
    compatibility,
    exactApiShaApplications: [],
    publicationOrder,
    releaseManifest: {
      schemaVersion: 1,
      environment: "production",
      releases: expectedReleases,
    },
    rollbackDrills,
  };
}

function shortSha(sha) {
  return `\`${sha.slice(0, 8)}\``;
}

export function formatProductionShadowSummary(report) {
  if (
    report?.kind !== "vercel-production-shadow" ||
    report?.mode !== "read-only" ||
    report?.mutationsPerformed !== false
  ) {
    throw new ProductionShadowError(
      "INVALID_SHADOW_REPORT",
      "El reporte no cumple el contrato de sombra productiva",
    );
  }
  const lines = [
    "## Vercel production selective shadow",
    "",
    "> Simulación de sólo lectura: no construyó, desplegó, promovió ni modificó aliases o dominios productivos.",
    "",
    "| Metrica | Valor |",
    "| --- | --- |",
    `| SHA objetivo | \`${report.targetSha}\` |`,
    `| Deployments selectivos teóricos | ${report.selection.expectedSelectiveDeployments} |`,
    `| Deployments amplios observados al corte | ${report.broadComparison.observedDeployments} |`,
    `| Deployments amplios evitables | ${report.broadComparison.avoidableDeployments} |`,
    `| Deploy API requerido | ${report.api.apiDeploymentRequired ? "SI" : "NO"} |`,
    `| Gate de migraciones requerido | ${report.api.databaseGateRequired ? "SI" : "NO"} |`,
    "",
    "### Comparación con el deployment amplio vigente",
    "",
    "| App | Seleccion | Deployment amplio | Evitable |",
    "| --- | --- | --- | --- |",
  ];
  for (const comparison of report.broadComparison.applications) {
    lines.push(
      `| ${comparison.application} | ${comparison.selectiveDecision.toUpperCase()} | ${comparison.broadStatus ?? "no observado"}${comparison.broadDeploymentId ? ` · \`${comparison.broadDeploymentId}\`` : ""} | ${comparison.avoidableBroadDeployment ? "SI" : "NO"} |`,
    );
  }
  lines.push(
    "",
    "### Coordinación API, BD y publicación",
    "",
    `Orden obligatorio: ${report.publicationOrder.map((step) => `\`${step}\``).join(" -> ")}.`,
    "",
    "| App | Política API | Gate en esta promoción |",
    "| --- | --- | --- |",
  );
  for (const gate of report.compatibility) {
    lines.push(
      `| ${gate.application} | ${gate.mode} | ${gate.required ? "REQUERIDO" : "NO APLICA"} |`,
    );
  }
  lines.push(
    "",
    "Ninguna app exige igualdad de SHA con el API. Scheduler exige una pareja explícita y verificada; Envelope y Payroll exigen compatibilidad hacia atrás; Finance y HR son independientes del API en su implementación actual.",
    "",
    "### Manifiesto multiversión teórico",
    "",
    "| Componente | SHA esperado |",
    "| --- | --- |",
  );
  for (const [component, sha] of Object.entries(
    report.releaseManifest.releases,
  )) {
    lines.push(`| ${component} | ${shortSha(sha)} |`);
  }
  lines.push("", "### Simulación de rollback individual", "");
  if (report.rollbackDrills.length === 0) {
    lines.push("No hay apps afectadas; no se requiere objetivo de rollback.");
  } else {
    lines.push(
      "| App | Deployment READY anterior | SHA restaurado |",
      "| --- | --- | --- |",
    );
    for (const rollback of report.rollbackDrills) {
      lines.push(
        `| ${rollback.application} | \`${rollback.deploymentId}\` | ${shortSha(rollback.releaseSha)} |`,
      );
    }
  }
  lines.push(
    "",
    "> Este resultado no autoriza la Fase 8. La activación requiere varias promociones representativas sin falsos negativos y aprobación explícita.",
    "",
  );
  return `${lines.join("\n")}\n`;
}
