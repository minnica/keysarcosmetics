#!/usr/bin/env node

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  createProductionActivationPlan,
  formatProductionActivationSummary,
  resolveEnabledProductionApplications,
} from "./vercel-production-activation-lib.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || process.argv[index + 1] === undefined) {
    throw new Error(`Falta ${name}`);
  }
  return process.argv[index + 1];
}

try {
  const enabledApplications = resolveEnabledProductionApplications(process.env);
  const report = JSON.parse(readFileSync(argumentValue("--shadow"), "utf8"));
  const plan = createProductionActivationPlan({ enabledApplications, report });
  writeFileSync(
    argumentValue("--output"),
    `${JSON.stringify(plan, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  if (!process.env.GITHUB_OUTPUT || !process.env.GITHUB_STEP_SUMMARY) {
    throw new Error("GITHUB_OUTPUT y GITHUB_STEP_SUMMARY son obligatorios");
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `activated_count=${plan.activatedApplications.length}`,
      `matrix=${JSON.stringify(plan.matrix)}`,
      `release_manifest=${JSON.stringify(plan.releaseManifest.releases)}`,
      `expected_api_sha=${plan.api.expectedReleaseSha}`,
      `api_deployment_required=${plan.api.deploymentRequired}`,
      `database_gate_required=${plan.api.databaseGateRequired}`,
      "",
    ].join("\n"),
    "utf8",
  );
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    formatProductionActivationSummary(plan),
    "utf8",
  );
} catch (error) {
  process.stderr.write(
    `ERROR PRODUCTION ACTIVATION ${error?.code ?? "UNEXPECTED_ERROR"}: ${error.message}\n`,
  );
  process.exitCode = 2;
}
