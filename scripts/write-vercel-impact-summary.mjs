#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import process from "node:process";
import {
  createDiagnosticMatrix,
  formatGitHubDiagnosticSummary,
} from "./vercel-impact-summary-lib.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || process.argv[index + 1] === undefined) {
    throw new Error(`Falta ${name}`);
  }
  return process.argv[index + 1];
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

try {
  const evidence = loadJson(argumentValue("--evidence"));
  const impact = loadJson(argumentValue("--impact"));
  const outputPath = process.env.GITHUB_OUTPUT;
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!outputPath || !summaryPath) {
    throw new Error("GITHUB_OUTPUT y GITHUB_STEP_SUMMARY son obligatorios");
  }

  const matrix = createDiagnosticMatrix(impact, evidence);
  appendFileSync(outputPath, `matrix=${JSON.stringify(matrix)}\n`, "utf8");
  appendFileSync(
    outputPath,
    `affected_count=${impact.affectedApplications.length}\n`,
    "utf8",
  );
  appendFileSync(
    summaryPath,
    formatGitHubDiagnosticSummary(impact, evidence),
    "utf8",
  );
} catch (error) {
  process.stderr.write(`ERROR SUMMARY: ${error.message}\n`);
  process.exitCode = 2;
}
