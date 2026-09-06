#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  createProductionShadowReport,
  formatProductionShadowSummary,
  ProductionShadowError,
} from "./vercel-production-shadow-lib.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || process.argv[index + 1] === undefined) {
    throw new ProductionShadowError("MISSING_ARGUMENT", `Falta ${name}`);
  }
  return process.argv[index + 1];
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeFullSha(value, label) {
  if (!/^[0-9a-f]{40}$/i.test(value ?? "")) {
    throw new ProductionShadowError(
      "INVALID_RELEASE_SHA",
      `${label} debe ser un SHA Git completo`,
    );
  }
  return value.toLowerCase();
}

async function readCurrentApiRelease(apiBaseUrl) {
  let url;
  try {
    url = new URL("/health", `${apiBaseUrl.replace(/\/$/, "")}/`);
  } catch {
    throw new ProductionShadowError(
      "INVALID_API_URL",
      "API_BASE_URL no es una URL válida",
    );
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ProductionShadowError(
      "INVALID_API_URL",
      "La sombra productiva exige un API_BASE_URL HTTPS sin credenciales",
    );
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new ProductionShadowError(
      "API_HEALTH_UNAVAILABLE",
      `El health productivo respondio HTTP ${response.status}`,
    );
  }
  const payload = await response.json();
  if (payload?.status !== "ok" || typeof payload?.release !== "string") {
    throw new ProductionShadowError(
      "INVALID_API_HEALTH",
      "El health productivo no contiene status ok y release",
    );
  }
  return normalizeFullSha(payload.release, "El release actual del API");
}

function changedFiles(baseSha, targetSha) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", baseSha, targetSha], {
      stdio: "ignore",
    });
    const output = execFileSync(
      "git",
      ["diff", "--name-only", "-z", baseSha, targetSha, "--"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    return output.split("\0").filter(Boolean);
  } catch {
    throw new ProductionShadowError(
      "API_HISTORY_UNAVAILABLE",
      "El SHA actual del API no es un ancestro disponible del objetivo; no se puede coordinar la promoción",
    );
  }
}

try {
  const evidence = loadJson(argumentValue("--evidence"));
  const impact = loadJson(argumentValue("--impact"));
  const outputPath = argumentValue("--output");
  const targetSha = normalizeFullSha(impact.targetSha, "El SHA objetivo");
  const apiSha = await readCurrentApiRelease(argumentValue("--api-base-url"));
  const report = createProductionShadowReport({
    apiChangedFiles: changedFiles(apiSha, targetSha),
    currentApiSha: apiSha,
    evidence,
    impact,
  });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  if (!process.env.GITHUB_STEP_SUMMARY) {
    throw new ProductionShadowError(
      "MISSING_GITHUB_SUMMARY",
      "GITHUB_STEP_SUMMARY es obligatorio",
    );
  }
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    formatProductionShadowSummary(report),
    "utf8",
  );
} catch (error) {
  const code = error?.code ?? "UNEXPECTED_ERROR";
  process.stderr.write(`ERROR PRODUCTION SHADOW ${code}: ${error.message}\n`);
  process.exitCode = 2;
}
