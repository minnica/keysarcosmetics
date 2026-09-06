#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import process from "node:process";
import {
  collectVercelDeploymentEvidence,
  createGitAncestorChecker,
} from "./vercel-deployment-state-lib.mjs";

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
    "--output",
    "--target-sha",
  ]) {
    if (!values.has(required)) throw new Error(`Falta ${required}`);
  }
  return {
    branch: values.get("--branch"),
    environment: values.get("--environment"),
    output: values.get("--output"),
    repositoryRoot: values.get("--repository") ?? process.cwd(),
    targetSha: values.get("--target-sha"),
  };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const evidence = await collectVercelDeploymentEvidence({
      branch: options.branch,
      environment: options.environment,
      isAncestor: createGitAncestorChecker(options.repositoryRoot),
      targetSha: options.targetSha,
      token: process.env.VERCEL_TOKEN_READ_ONLY,
    });
    writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    process.stderr.write(
      `Evidencia Vercel de sólo lectura guardada para ${evidence.environment}/${evidence.branch}.\n`,
    );
  } catch (error) {
    const code = error?.code ?? "UNEXPECTED_ERROR";
    process.stderr.write(`ERROR ${code}: ${error.message}\n`);
    process.exitCode = 2;
  }
}

await main();
