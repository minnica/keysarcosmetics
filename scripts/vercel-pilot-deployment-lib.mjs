const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;
const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
const VERCEL_API_ORIGIN = "https://api.vercel.com";

export class VercelPilotDeploymentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VercelPilotDeploymentError";
    this.code = code;
  }
}

function requireFullSha(value, label) {
  if (!FULL_SHA_PATTERN.test(value ?? "")) {
    throw new VercelPilotDeploymentError(
      "INVALID_RELEASE_SHA",
      `${label} debe ser un SHA Git completo`,
    );
  }
  return value.toLowerCase();
}

export function normalizeDeploymentReference(value) {
  if (DEPLOYMENT_ID_PATTERN.test(value ?? "")) return value;

  let parsed;
  try {
    parsed = new URL(value?.includes("://") ? value : `https://${value}`);
  } catch {
    throw new VercelPilotDeploymentError(
      "INVALID_DEPLOYMENT_REFERENCE",
      "La referencia debe ser un deployment ID o un hostname HTTPS válido",
    );
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !HOST_PATTERN.test(parsed.hostname)
  ) {
    throw new VercelPilotDeploymentError(
      "INVALID_DEPLOYMENT_REFERENCE",
      "La referencia debe ser un deployment ID o un hostname HTTPS válido",
    );
  }
  return parsed.hostname;
}

function deploymentId(payload) {
  const value = payload?.uid ?? payload?.id;
  if (!DEPLOYMENT_ID_PATTERN.test(value ?? "")) {
    throw new VercelPilotDeploymentError(
      "INVALID_DEPLOYMENT_RESPONSE",
      "Vercel no devolvió un deployment ID válido",
    );
  }
  return value;
}

function deploymentHost(payload) {
  const value = payload?.url;
  if (typeof value !== "string" || !HOST_PATTERN.test(value)) {
    throw new VercelPilotDeploymentError(
      "INVALID_DEPLOYMENT_RESPONSE",
      "Vercel no devolvió un hostname de deployment válido",
    );
  }
  return value;
}

function assertDeploymentContract(payload, expected) {
  const state = String(
    payload?.readyState ?? payload?.state ?? "",
  ).toUpperCase();
  if (state !== "READY") {
    throw new VercelPilotDeploymentError(
      "DEPLOYMENT_NOT_READY",
      `El deployment está en estado ${state || "desconocido"}, no READY`,
    );
  }

  const target = payload?.target ?? "preview";
  if (target !== "preview") {
    throw new VercelPilotDeploymentError(
      "INVALID_DEPLOYMENT_TARGET",
      `${expected.application} sólo admite deployments Preview en development`,
    );
  }

  if (
    payload?.projectId !== expected.projectId ||
    payload?.name !== expected.projectName
  ) {
    throw new VercelPilotDeploymentError(
      "PROJECT_MISMATCH",
      `El deployment no pertenece al proyecto esperado de ${expected.application}`,
    );
  }

  const meta = payload?.meta;
  const actualSha = requireFullSha(
    meta?.githubCommitSha,
    "El SHA del deployment",
  );
  if (actualSha !== expected.sha) {
    throw new VercelPilotDeploymentError(
      "RELEASE_MISMATCH",
      `El deployment sirve ${actualSha}, no ${expected.sha}`,
    );
  }
  if (
    meta?.githubCommitRef !== expected.branch ||
    meta?.githubCommitOrg !== expected.organization ||
    meta?.githubCommitRepo !== expected.repository
  ) {
    throw new VercelPilotDeploymentError(
      "GIT_METADATA_MISMATCH",
      "La procedencia Git del deployment no coincide con el piloto",
    );
  }
}

export function extractReleaseSha(html) {
  if (typeof html !== "string") return null;
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(
      [...tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [
        match[1].toLowerCase(),
        match[2],
      ]),
    );
    if (attributes.name?.toLowerCase() === "keysar-release") {
      return attributes.content ?? null;
    }
  }
  return null;
}

export async function inspectVercelPilotDeployment({
  application = "hr",
  branch = "develop",
  fetchImpl = fetch,
  organization = "minnica",
  projectId,
  projectName = "keysarcosmetics-hr",
  reference,
  repository = "keysarcosmetics",
  sha,
  token,
}) {
  if (!token) {
    throw new VercelPilotDeploymentError(
      "MISSING_VERCEL_TOKEN",
      `Falta la credencial de deployment de ${application}`,
    );
  }
  if (!projectId) {
    throw new VercelPilotDeploymentError(
      "MISSING_PROJECT_ID",
      `Falta el project ID de ${application}`,
    );
  }
  const normalizedSha = requireFullSha(sha, "El SHA esperado");
  const normalizedReference = normalizeDeploymentReference(reference);
  const url = new URL(
    `/v13/deployments/${encodeURIComponent(normalizedReference)}`,
    VERCEL_API_ORIGIN,
  );

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new VercelPilotDeploymentError(
      "VERCEL_API_UNAVAILABLE",
      `No se pudo inspeccionar el deployment: ${error.message}`,
    );
  }
  if (!response.ok) {
    throw new VercelPilotDeploymentError(
      "VERCEL_API_ERROR",
      `Vercel respondió HTTP ${response.status} al inspeccionar el deployment`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new VercelPilotDeploymentError(
      "VERCEL_API_ERROR",
      "Vercel devolvió JSON inválido al inspeccionar el deployment",
    );
  }
  assertDeploymentContract(payload, {
    application,
    branch,
    organization,
    projectId,
    projectName,
    repository,
    sha: normalizedSha,
  });

  return {
    deploymentId: deploymentId(payload),
    deploymentUrl: `https://${deploymentHost(payload)}`,
    releaseSha: normalizedSha,
  };
}

export async function verifyServedPilotRelease({
  application = "hr",
  attempts = 10,
  bypassSecret,
  delay = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  fetchImpl = fetch,
  host,
  retryDelayMs = 5_000,
  sha,
}) {
  const expectedSha = requireFullSha(sha, "El SHA servido esperado");
  const normalizedHost = normalizeDeploymentReference(host);
  if (DEPLOYMENT_ID_PATTERN.test(normalizedHost)) {
    throw new VercelPilotDeploymentError(
      "INVALID_HTTP_HOST",
      "La verificación HTTP requiere un hostname, no un deployment ID",
    );
  }
  if (!bypassSecret) {
    throw new VercelPilotDeploymentError(
      "MISSING_BYPASS_SECRET",
      `Falta el bypass de Deployment Protection para verificar ${application}`,
    );
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(`https://${normalizedHost}/`, {
        headers: {
          "x-vercel-protection-bypass": bypassSecret,
          "x-vercel-set-bypass-cookie": "true",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const actualSha = requireFullSha(
        extractReleaseSha(await response.text()),
        "El SHA servido por HR",
      );
      if (actualSha !== expectedSha) {
        throw new Error(`se recibió ${actualSha}, se esperaba ${expectedSha}`);
      }
      return { host: normalizedHost, releaseSha: actualSha };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(retryDelayMs);
    }
  }
  throw new VercelPilotDeploymentError(
    "SERVED_RELEASE_MISMATCH",
    `${application} no sirvió el SHA esperado después de ${attempts} intentos: ${lastError?.message ?? "error desconocido"}`,
  );
}

export function resolvePilotSelection(impact, evidence, application = "hr") {
  const result = impact?.results?.find(
    (entry) => entry.application === application,
  );
  if (!result) {
    throw new VercelPilotDeploymentError(
      "MISSING_PILOT_RESULT",
      `El detector no incluyó ${application}`,
    );
  }
  const observation = evidence?.observations?.[application] ?? null;
  const observedSha = observation?.sha?.toLowerCase();
  const targetSha = impact?.targetSha?.toLowerCase();
  return {
    affected: result.affected === true,
    reusableDeploymentId:
      observation?.status === "READY" &&
      FULL_SHA_PATTERN.test(observedSha ?? "") &&
      observedSha === targetSha &&
      DEPLOYMENT_ID_PATTERN.test(observation?.deploymentId ?? "")
        ? observation.deploymentId
        : null,
    observedStatus: observation?.status ?? null,
  };
}
