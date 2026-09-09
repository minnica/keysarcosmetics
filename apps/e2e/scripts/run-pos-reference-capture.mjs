import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const referenceSha = "12fb8045cc264b565cb6e764d95ad7b2447fbfa1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../../..");
const outputRoot = path.join(
  repositoryRoot,
  "docs/artifacts/pos-visual-baseline",
  referenceSha,
  "reference",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  process.versions.node === "22.23.2",
  `Usa Node 22.23.2 para la evidencia canónica; versión actual: ${process.version}.`,
);
assert(
  !fs.existsSync(outputRoot) || fs.readdirSync(outputRoot).length === 0,
  `La salida canónica ${outputRoot} ya contiene archivos.`,
);

function isCompiledReference(candidate) {
  return fs.existsSync(path.join(candidate, "apps/pos/dist/index.html"));
}

const explicitRoot = process.env.POS_VISUAL_ROOT
  ? path.resolve(process.env.POS_VISUAL_ROOT)
  : "";
const discoveredRoots = fs
  .readdirSync(os.tmpdir(), { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && entry.name.startsWith("keysar-pos-12fb804-"),
  )
  .map((entry) => path.join(os.tmpdir(), entry.name))
  .filter(isCompiledReference)
  .sort(
    (left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
  );
const referenceRoot = explicitRoot || discoveredRoots[0];

assert(
  referenceRoot && isCompiledReference(referenceRoot),
  "No se encontró una extracción compilada de 12fb804 bajo /tmp. Sigue el procedimiento de preparación de docs/POS_VISUAL_BASELINE.md.",
);

process.stdout.write(`Referencia detectada: ${referenceRoot}\n`);
process.stdout.write(`Salida canónica: ${outputRoot}\n`);

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const buildResult = spawnSync(
  pnpmCommand,
  [
    "--dir",
    referenceRoot,
    "--filter",
    "@cosmetics/pos",
    "exec",
    "vite",
    "build",
  ],
  { cwd: repositoryRoot, stdio: "inherit", env: process.env },
);
if (buildResult.status !== 0) process.exit(buildResult.status ?? 1);

const result = spawnSync(pnpmCommand, ["pos:visual:capture"], {
  cwd: repositoryRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    POS_VISUAL_MODE: "reference",
    POS_VISUAL_ROOT: referenceRoot,
    POS_VISUAL_OUTPUT: outputRoot,
  },
});

if (result.status !== 0) process.exit(result.status ?? 1);
