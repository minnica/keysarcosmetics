#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import process from "node:process";
import { inspectVercelProject } from "./vercel-development-config-lib.mjs";

function argumentValue(name, required = true) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (required && !value) throw new Error(`Falta ${name}`);
  return value;
}

try {
  const application = argumentValue("--application");
  const result = await inspectVercelProject({
    application,
    environment: "production",
    projectId: argumentValue("--project-id"),
    token: process.env.VERCEL_TOKEN_DEPLOY,
  });
  const output = argumentValue("--output", false);
  if (output) {
    writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
  process.stderr.write(
    `Configuración de ${application} validada para production.\n`,
  );
} catch (error) {
  process.stderr.write(
    `ERROR ${error?.code ?? "UNEXPECTED_ERROR"}: ${error.message}\n`,
  );
  process.exitCode = 2;
}
