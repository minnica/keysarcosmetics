#!/usr/bin/env node

import assert from "node:assert/strict";
import process from "node:process";
import {
  VERCEL_APPLICATIONS,
  createGitRepository,
  detectVercelImpact,
  formatDetectorError,
} from "./vercel-impact-detector-lib.mjs";

const allApplications = Object.keys(VERCEL_APPLICATIONS);
const cases = [
  {
    name: "documentación raíz",
    targetSha: "6097a4b9a4d5bce38042fc9a5380a008f4a22478",
    applications: allApplications,
    expected: [],
  },
  {
    name: "backend exclusivo",
    targetSha: "e9c5631a7f0a40235d612ba5547a73953bf14b33",
    applications: allApplications,
    expected: [],
  },
  {
    name: "cambio directo de Envelope",
    targetSha: "47d1214f44607794557ddd85e5a39eace6305414",
    applications: ["envelope"],
    expected: ["envelope"],
  },
  {
    name: "configuración global de Node",
    targetSha: "86f7f89f1db152d67d7ed28c1d3c19dc81ea8cc3",
    applications: allApplications,
    expected: allApplications,
  },
  {
    name: "UI compartida y Scheduler",
    targetSha: "e082d5caf8c941bf86770caed0c67152746cf0da",
    applications: allApplications,
    expected: allApplications,
  },
];

try {
  const repository = createGitRepository(process.cwd());
  const results = cases.map((diagnosticCase) => {
    const output = detectVercelImpact({
      applications: diagnosticCase.applications,
      baseSha: `${diagnosticCase.targetSha}^`,
      branch: "develop",
      environment: "development",
      repository,
      targetSha: diagnosticCase.targetSha,
    });
    assert.deepEqual(
      output.affectedApplications,
      diagnosticCase.expected,
      diagnosticCase.name,
    );
    return {
      name: diagnosticCase.name,
      baseSha: output.results[0]?.baseSha ?? null,
      targetSha: output.targetSha,
      affectedApplications: output.affectedApplications,
      skippedApplications: output.skippedApplications,
    };
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: 1,
        status: "ok",
        mode: "historical-diagnostic",
        cases: results,
      },
      null,
      2,
    )}\n`,
  );
  process.stderr.write(`Casos históricos validados: ${results.length}\n`);
} catch (error) {
  const output = formatDetectorError(error);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.stderr.write(`ERROR ${output.error.code}: ${output.error.message}\n`);
  process.exitCode = 2;
}
