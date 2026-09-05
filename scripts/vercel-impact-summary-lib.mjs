import {
  ACTIVE_VERCEL_PROJECTS,
  UNPROVISIONED_VERCEL_APPLICATIONS,
} from "./vercel-deployment-state-lib.mjs";

function assertDiagnosticContract(impact, evidence) {
  if (impact?.status !== "ok" || impact?.mode !== "diagnostic") {
    throw new Error("El detector no produjo un resultado diagnóstico válido");
  }
  for (const key of ["environment", "branch", "targetSha"]) {
    if (impact[key] !== evidence?.[key]) {
      throw new Error(`La evidencia y el detector no coinciden en ${key}`);
    }
  }
  if (!Array.isArray(impact.results)) {
    throw new Error("El detector no incluyó resultados por aplicación");
  }
  const affectedFromResults = impact.results
    .filter((result) => result.affected)
    .map((result) => result.application);
  const skippedFromResults = impact.results
    .filter((result) => !result.affected)
    .map((result) => result.application);
  if (
    JSON.stringify(affectedFromResults) !==
      JSON.stringify(impact.affectedApplications) ||
    JSON.stringify(skippedFromResults) !==
      JSON.stringify(impact.skippedApplications)
  ) {
    throw new Error("Las listas del detector no coinciden con sus resultados");
  }
  for (const result of impact.results) {
    const expectedProject = ACTIVE_VERCEL_PROJECTS[result.application];
    const evidenceProject = evidence.projects?.[result.application];
    if (
      !expectedProject ||
      evidenceProject?.project !== expectedProject.project ||
      evidenceProject?.root !== expectedProject.root
    ) {
      throw new Error(
        `La evidencia no contiene el proyecto canónico de ${result.application}`,
      );
    }
  }
}

function markdownCell(value) {
  return String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

function shortSha(sha) {
  return typeof sha === "string" ? `\`${sha.slice(0, 8)}\`` : "—";
}

function reasonSummary(result) {
  return result.reasons
    .map((reason) => {
      const files =
        reason.files.length > 0 ? ` (${reason.files.join(", ")})` : "";
      return `${reason.message}${files}`;
    })
    .join("<br>");
}

function observedSummary(observation) {
  if (!observation) return "No observado al corte";
  const id = observation.deploymentId ? ` · ${observation.deploymentId}` : "";
  return `${observation.status}${id}`;
}

function comparisonSummary(result, observation) {
  if (result.affected && observation) return "Coincide: deployment observado";
  if (!result.affected && observation) {
    return "Fan-out evitable: la integración Git creó deployment";
  }
  if (result.affected) return "Pendiente: deployment esperado aún no observado";
  return "Coincide al corte: sin deployment observado";
}

export function createDiagnosticMatrix(impact, evidence) {
  assertDiagnosticContract(impact, evidence);
  return {
    include: impact.results
      .filter((result) => result.affected)
      .map((result) => {
        const project = evidence.projects[result.application];
        if (!project) {
          throw new Error(
            `Falta configuración Vercel para ${result.application}`,
          );
        }
        return {
          application: result.application,
          environment: impact.environment,
          project: project.project,
          root: project.root,
          targetSha: impact.targetSha,
        };
      }),
  };
}

export function formatGitHubDiagnosticSummary(impact, evidence) {
  assertDiagnosticContract(impact, evidence);
  const matrix = createDiagnosticMatrix(impact, evidence);
  const lines = [
    "## Vercel frontend impact — diagnóstico",
    "",
    "> Este workflow es de sólo lectura. No construyó ni creó deployments y no modificó aliases.",
    "",
    "| Campo | Valor |",
    "| --- | --- |",
    `| Ambiente | ${markdownCell(impact.environment)} |`,
    `| Rama | \`${markdownCell(impact.branch)}\` |`,
    `| SHA objetivo | \`${markdownCell(impact.targetSha)}\` |`,
    `| Evidencia Vercel | ${markdownCell(evidence.capturedAt)} |`,
    `| Apps afectadas | ${impact.affectedApplications.length} |`,
    `| Deployments teóricos | ${matrix.include.length} |`,
    "",
    "### Selección de los cinco proyectos activos",
    "",
    "| App | Decisión | Base | Objetivo | Razones y archivos | Integración Git observada | Comparación |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const result of impact.results) {
    const observation = evidence.observations[result.application] ?? null;
    lines.push(
      `| ${markdownCell(result.application)} | ${result.affected ? "AFECTADA" : "OMITIDA"} | ${shortSha(result.baseSha)} | ${shortSha(result.targetSha)} | ${markdownCell(reasonSummary(result))} | ${markdownCell(observedSummary(observation))} | ${markdownCell(comparisonSummary(result, observation))} |`,
    );
  }

  const affected = impact.affectedApplications;
  const skipped = impact.skippedApplications;
  const unprovisioned =
    evidence.unprovisionedApplications ?? UNPROVISIONED_VERCEL_APPLICATIONS;
  lines.push(
    "",
    "### Resumen",
    "",
    `- Afectadas: ${affected.length > 0 ? affected.map((app) => `\`${app}\``).join(", ") : "ninguna"}.`,
    `- Omitidas: ${skipped.length > 0 ? skipped.map((app) => `\`${app}\``).join(", ") : "ninguna"}.`,
    `- Sin proyecto Vercel en esta fase: ${unprovisioned.map((app) => `\`${app}\``).join(", ")}.`,
    "- Matriz dinámica conservada como output `matrix`; los jobs de deployment permanecen deshabilitados.",
    "",
  );
  return `${lines.join("\n")}\n`;
}
