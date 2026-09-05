#!/usr/bin/env node

import process from "node:process";
import {
  VERCEL_APPLICATIONS,
  createGitRepository,
  detectVercelImpact,
  formatDetectorError,
  formatHumanSummary,
  loadDeploymentState,
} from "./vercel-impact-detector-lib.mjs";

function usage() {
  return `Uso:
  node scripts/detect-vercel-impact.mjs \\
    --environment development|production \\
    --branch develop|master|<rama-de-trabajo> \\
    --target-sha <sha> \\
    --app <app|all> \\
    (--base-sha <sha> | --deployment-state <archivo.json>)

La salida JSON se escribe en stdout y el resumen humano en stderr.
Este comando sólo diagnostica: nunca invoca Vercel.`;
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--"))
      throw new Error(`Argumento no reconocido: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Falta el valor de ${argument}`);
    }
    if (values.has(argument))
      throw new Error(`Argumento duplicado: ${argument}`);
    values.set(argument, value);
    index += 1;
  }

  const allowed = new Set([
    "--app",
    "--base-sha",
    "--branch",
    "--deployment-state",
    "--environment",
    "--repository",
    "--target-sha",
  ]);
  for (const key of values.keys()) {
    if (!allowed.has(key)) throw new Error(`Argumento no reconocido: ${key}`);
  }
  for (const required of [
    "--app",
    "--branch",
    "--environment",
    "--target-sha",
  ]) {
    if (!values.has(required)) throw new Error(`Falta ${required}`);
  }
  if (values.has("--base-sha") && values.has("--deployment-state")) {
    throw new Error("Use --base-sha o --deployment-state, no ambos");
  }

  const appValue = values.get("--app");
  const applications =
    appValue === "all"
      ? Object.keys(VERCEL_APPLICATIONS)
      : appValue
          .split(",")
          .map((application) => application.trim())
          .filter(Boolean);
  return {
    applications,
    baseSha: values.get("--base-sha"),
    branch: values.get("--branch"),
    deploymentStatePath: values.get("--deployment-state"),
    environment: values.get("--environment"),
    repositoryRoot: values.get("--repository") ?? process.cwd(),
    targetSha: values.get("--target-sha"),
  };
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    const expectedBranch =
      options.environment === "development" ? "develop" : "master";
    if (
      options.branch === expectedBranch &&
      !options.baseSha &&
      !options.deploymentStatePath
    ) {
      throw new Error(
        "Falta --base-sha o --deployment-state para una rama desplegable",
      );
    }

    const output = detectVercelImpact({
      applications: options.applications,
      baseSha: options.baseSha,
      branch: options.branch,
      deploymentState: options.deploymentStatePath
        ? loadDeploymentState(options.deploymentStatePath)
        : undefined,
      environment: options.environment,
      repository: createGitRepository(options.repositoryRoot),
      targetSha: options.targetSha,
    });
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.stderr.write(`${formatHumanSummary(output)}\n`);
    return 0;
  } catch (error) {
    const output = formatDetectorError(error);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.stderr.write(
      `ERROR ${output.error.code}: ${output.error.message}\n`,
    );
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
