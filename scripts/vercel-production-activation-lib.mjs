import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;

export class ProductionActivationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProductionActivationError";
    this.code = code;
  }
}

export function resolveEnabledProductionApplications(environment) {
  if (!environment || typeof environment !== "object") {
    throw new ProductionActivationError(
      "INVALID_ACTIVATION_FLAGS",
      "Se requiere un mapa de variables de activación",
    );
  }
  return Object.entries(ACTIVE_VERCEL_PROJECTS)
    .filter(([, config]) => {
      const variable = config.deployment.productionEnabledVariable;
      const value = environment[variable];
      if (
        value !== "true" &&
        value !== "false" &&
        value !== "" &&
        value !== undefined
      ) {
        throw new ProductionActivationError(
          "INVALID_ACTIVATION_FLAG",
          `${variable} debe valer true o false`,
        );
      }
      return value === "true";
    })
    .map(([application]) => application);
}

function requireShadowReport(report) {
  if (
    report?.kind !== "vercel-production-shadow" ||
    report?.mode !== "read-only" ||
    report?.mutationsPerformed !== false ||
    report?.environment !== "production" ||
    report?.branch !== "master" ||
    !FULL_SHA_PATTERN.test(report?.targetSha ?? "")
  ) {
    throw new ProductionActivationError(
      "INVALID_SHADOW_REPORT",
      "La activación requiere un reporte de sombra production/master válido",
    );
  }
}

function rollbackReleaseByApplication(report) {
  return Object.fromEntries(
    report.rollbackDrills.map((entry) => {
      if (
        !ACTIVE_VERCEL_PROJECTS[entry.application] ||
        !FULL_SHA_PATTERN.test(entry.releaseSha ?? "") ||
        !DEPLOYMENT_ID_PATTERN.test(entry.deploymentId ?? "")
      ) {
        throw new ProductionActivationError(
          "INVALID_ROLLBACK_DRILL",
          `El rollback de ${entry.application ?? "una app"} es inválido`,
        );
      }
      return [entry.application, entry.releaseSha.toLowerCase()];
    }),
  );
}

export function createProductionActivationPlan({
  enabledApplications,
  report,
}) {
  requireShadowReport(report);
  if (!Array.isArray(enabledApplications)) {
    throw new ProductionActivationError(
      "INVALID_ACTIVATION_FLAGS",
      "Las aplicaciones habilitadas deben ser una lista",
    );
  }
  const enabled = new Set(enabledApplications);
  for (const application of enabled) {
    if (!ACTIVE_VERCEL_PROJECTS[application]) {
      throw new ProductionActivationError(
        "UNKNOWN_APPLICATION",
        `La aplicación ${application} no está provisionada`,
      );
    }
  }

  const affected = [...report.selection.affectedApplications];
  const activatedApplications = affected.filter((application) =>
    enabled.has(application),
  );
  const deferredApplications = affected.filter(
    (application) => !enabled.has(application),
  );
  const rollbacks = rollbackReleaseByApplication(report);
  const expectedReleases = { ...report.releaseManifest.releases };
  for (const application of deferredApplications) {
    const releaseSha = rollbacks[application];
    if (!releaseSha) {
      throw new ProductionActivationError(
        "MISSING_DEFERRED_RELEASE",
        `No se conoce el release conservado por ${application}`,
      );
    }
    expectedReleases[application] = releaseSha;
  }

  const compatibilityByApplication = Object.fromEntries(
    report.compatibility.map((entry) => [entry.application, entry]),
  );
  const comparisonByApplication = Object.fromEntries(
    report.broadComparison.applications.map((entry) => [
      entry.application,
      entry,
    ]),
  );
  const matrix = activatedApplications.map((application) => {
    const config = ACTIVE_VERCEL_PROJECTS[application];
    const compatibility = compatibilityByApplication[application];
    if (!compatibility) {
      throw new ProductionActivationError(
        "MISSING_COMPATIBILITY_GATE",
        `Falta el gate de compatibilidad de ${application}`,
      );
    }
    const observation = comparisonByApplication[application];
    const reusableDeploymentId =
      observation?.broadStatus === "READY" &&
      DEPLOYMENT_ID_PATTERN.test(observation?.broadDeploymentId ?? "")
        ? observation.broadDeploymentId
        : null;
    return {
      application,
      compatibilityMode: compatibility.mode,
      compatibilityRequired: compatibility.required,
      bypassSecret: config.deployment.bypassSecret,
      productionAliasVariable: config.deployment.productionAliasVariable,
      productionCompatibilityVariable:
        config.deployment.productionCompatibilityVariable,
      projectIdSecret: config.deployment.projectIdSecret,
      reusableDeploymentId,
      tokenSecret: config.deployment.tokenSecret,
    };
  });

  return {
    schemaVersion: 1,
    kind: "vercel-production-activation-plan",
    environment: "production",
    targetSha: report.targetSha.toLowerCase(),
    api: {
      deploymentRequired: report.api.apiDeploymentRequired,
      databaseGateRequired: report.api.databaseGateRequired,
      expectedReleaseSha: report.api.expectedReleaseSha,
    },
    activatedApplications,
    deferredApplications,
    matrix: { include: matrix },
    releaseManifest: {
      schemaVersion: 1,
      environment: "production",
      releases: expectedReleases,
    },
  };
}

export function formatProductionActivationSummary(plan) {
  if (plan?.kind !== "vercel-production-activation-plan") {
    throw new ProductionActivationError(
      "INVALID_ACTIVATION_PLAN",
      "El plan de activación productiva es inválido",
    );
  }
  const list = (values) =>
    values.length > 0
      ? values.map((value) => `\`${value}\``).join(", ")
      : "ninguna";
  return [
    "## Vercel production selective activation",
    "",
    `- Apps habilitadas y afectadas: ${list(plan.activatedApplications)}.`,
    `- Apps afectadas todavía diferidas: ${list(plan.deferredApplications)}.`,
    `- Deploy API requerido antes de publicar: ${plan.api.deploymentRequired ? "SI" : "NO"}.`,
    `- Gate de migraciones requerido: ${plan.api.databaseGateRequired ? "SI" : "NO"}.`,
    "- Las apps diferidas conservan su SHA productivo anterior en el manifiesto esperado.",
    "",
  ].join("\n");
}
