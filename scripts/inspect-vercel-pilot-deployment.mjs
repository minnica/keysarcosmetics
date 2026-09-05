#!/usr/bin/env node

import { appendFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  inspectVercelPilotDeployment,
  verifyServedPilotRelease,
} from "./vercel-pilot-deployment-lib.mjs";

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
  for (const required of ["--branch", "--project-id", "--reference", "--sha"]) {
    if (!values.has(required)) throw new Error(`Falta ${required}`);
  }
  return {
    branch: values.get("--branch"),
    httpHost: values.get("--http-host"),
    output: values.get("--output"),
    projectId: values.get("--project-id"),
    projectName: values.get("--project-name") ?? "keysarcosmetics-hr",
    reference: values.get("--reference"),
    sha: values.get("--sha"),
  };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const deployment = await inspectVercelPilotDeployment({
      branch: options.branch,
      projectId: options.projectId,
      projectName: options.projectName,
      reference: options.reference,
      sha: options.sha,
      token: process.env.VERCEL_TOKEN_HR_DEPLOY,
    });
    const served = await verifyServedPilotRelease({
      bypassSecret: process.env.HR_VERCEL_BYPASS_SECRET,
      host: options.httpHost ?? deployment.deploymentUrl,
      sha: options.sha,
    });
    const result = {
      schemaVersion: 1,
      application: "hr",
      environment: "development",
      deploymentId: deployment.deploymentId,
      deploymentUrl: deployment.deploymentUrl,
      verifiedHost: served.host,
      releaseSha: deployment.releaseSha,
      verifiedAt: new Date().toISOString(),
    };
    if (options.output) {
      writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
    }
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        [
          `deployment_id=${result.deploymentId}`,
          `deployment_url=${result.deploymentUrl}`,
          `verified_host=${result.verifiedHost}`,
          `release_sha=${result.releaseSha}`,
          "",
        ].join("\n"),
        "utf8",
      );
    }
    process.stderr.write(
      `Deployment HR ${result.deploymentId} verificado con release ${result.releaseSha}.\n`,
    );
  } catch (error) {
    const code = error?.code ?? "UNEXPECTED_ERROR";
    process.stderr.write(`ERROR ${code}: ${error.message}\n`);
    process.exitCode = 2;
  }
}

await main();
