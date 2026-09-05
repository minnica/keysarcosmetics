import { ACTIVE_VERCEL_PROJECTS } from "./vercel-deployment-state-lib.mjs";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

export class VercelDevelopmentConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VercelDevelopmentConfigError";
    this.code = code;
  }
}

function canonicalSetting(value) {
  return value === undefined || value === "" ? null : value;
}

function requireApplication(application) {
  const config = ACTIVE_VERCEL_PROJECTS[application];
  if (!config) {
    throw new VercelDevelopmentConfigError(
      "UNKNOWN_APPLICATION",
      `La aplicación ${application} no es un proyecto Vercel activo`,
    );
  }
  return config;
}

async function requestJson(fetchImpl, pathname, token) {
  let response;
  try {
    response = await fetchImpl(new URL(pathname, VERCEL_API_ORIGIN), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new VercelDevelopmentConfigError(
      "VERCEL_API_UNAVAILABLE",
      `No se pudo consultar la configuración Vercel: ${error.message}`,
    );
  }
  if (!response.ok) {
    throw new VercelDevelopmentConfigError(
      "VERCEL_API_ERROR",
      `Vercel respondió HTTP ${response.status} al validar el proyecto`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new VercelDevelopmentConfigError(
      "VERCEL_API_ERROR",
      "Vercel devolvió JSON inválido al validar el proyecto",
    );
  }
}

export function assertVercelProjectSettings(
  application,
  project,
  environmentVariables,
  projectId,
  environment = "development",
) {
  const expected = requireApplication(application);
  const settings = expected.projectSettings;
  const mismatches = [];

  for (const [field, expectedValue] of [
    ["id", projectId],
    ["name", expected.project],
    ["rootDirectory", expected.root],
    ["framework", settings.framework],
    ["nodeVersion", settings.nodeVersion],
    ["installCommand", settings.installCommand],
    ["buildCommand", settings.buildCommand],
    ["outputDirectory", settings.outputDirectory],
  ]) {
    const actualValue = canonicalSetting(project?.[field]);
    if (actualValue !== canonicalSetting(expectedValue)) {
      mismatches.push(
        `${field}: esperado ${JSON.stringify(canonicalSetting(expectedValue))}, recibido ${JSON.stringify(actualValue)}`,
      );
    }
  }

  if (!["development", "production"].includes(environment)) {
    throw new VercelDevelopmentConfigError(
      "INVALID_ENVIRONMENT",
      "El ambiente debe ser development o production",
    );
  }
  if (!Array.isArray(environmentVariables)) {
    throw new VercelDevelopmentConfigError(
      "INVALID_ENVIRONMENT_RESPONSE",
      `Vercel no devolvió la lista de variables de ${environment}`,
    );
  }
  const variableNames = [
    ...new Set(
      environmentVariables
        .map((entry) => entry?.key)
        .filter((key) => typeof key === "string" && key.length > 0),
    ),
  ].sort();
  const requiredVariables =
    environment === "production"
      ? settings.requiredProductionVariables
      : settings.requiredPreviewVariables;
  for (const requiredName of requiredVariables) {
    if (!variableNames.includes(requiredName)) {
      mismatches.push(`variable de ${environment} ausente: ${requiredName}`);
    }
  }
  const unexpectedVariables = variableNames.filter(
    (name) => !requiredVariables.includes(name),
  );
  if (unexpectedVariables.length > 0) {
    mismatches.push(
      `variables de ${environment} no declaradas: ${unexpectedVariables.join(", ")}`,
    );
  }

  if (mismatches.length > 0) {
    throw new VercelDevelopmentConfigError(
      "PROJECT_CONFIGURATION_MISMATCH",
      `${application} no coincide con el contrato de ${environment}: ${mismatches.join("; ")}`,
    );
  }

  return {
    application,
    project: expected.project,
    root: expected.root,
    framework: settings.framework,
    nodeVersion: settings.nodeVersion,
    installCommand: settings.installCommand,
    buildCommand: settings.buildCommand,
    outputDirectory: settings.outputDirectory,
    environment,
    requiredVariableNames: [...requiredVariables],
    observedVariableNames: variableNames,
    ...(environment === "development"
      ? {
          requiredPreviewVariables: [...requiredVariables],
          observedPreviewVariableNames: variableNames,
        }
      : {
          requiredProductionVariables: [...requiredVariables],
          observedProductionVariableNames: variableNames,
        }),
  };
}

export async function inspectVercelProject({
  application,
  environment = "development",
  fetchImpl = fetch,
  projectId,
  token,
}) {
  if (!token) {
    throw new VercelDevelopmentConfigError(
      "MISSING_VERCEL_TOKEN",
      "Falta la credencial de deployment del proyecto",
    );
  }
  if (!/^prj_[A-Za-z0-9]+$/.test(projectId ?? "")) {
    throw new VercelDevelopmentConfigError(
      "INVALID_PROJECT_ID",
      "El project ID no tiene el formato esperado",
    );
  }
  requireApplication(application);
  if (!["development", "production"].includes(environment)) {
    throw new VercelDevelopmentConfigError(
      "INVALID_ENVIRONMENT",
      "El ambiente debe ser development o production",
    );
  }

  const projectPath = `/v9/projects/${encodeURIComponent(projectId)}`;
  const environmentPath = new URL(
    `/v10/projects/${encodeURIComponent(projectId)}/env`,
    VERCEL_API_ORIGIN,
  );
  environmentPath.searchParams.set(
    "target",
    environment === "production" ? "production" : "preview",
  );
  if (environment === "development") {
    environmentPath.searchParams.set("gitBranch", "develop");
  }
  environmentPath.searchParams.set("decrypt", "false");

  const [project, environmentPayload] = await Promise.all([
    requestJson(fetchImpl, projectPath, token),
    requestJson(
      fetchImpl,
      `${environmentPath.pathname}${environmentPath.search}`,
      token,
    ),
  ]);
  return assertVercelProjectSettings(
    application,
    project,
    environmentPayload?.envs,
    projectId,
    environment,
  );
}

export function inspectVercelDevelopmentProject(options) {
  return inspectVercelProject({ ...options, environment: "development" });
}
