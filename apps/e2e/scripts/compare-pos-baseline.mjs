import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const referenceRoot = process.env.POS_BASELINE_REFERENCE;
const candidateRoot = process.env.POS_BASELINE_CANDIDATE;
const outputRoot = process.env.POS_VISUAL_DIFF_OUTPUT;
const maxDiffRatio = Number(process.env.POS_VISUAL_MAX_DIFF_RATIO ?? "0");

if (!referenceRoot || !candidateRoot || !outputRoot) {
  throw new Error(
    "Define POS_BASELINE_REFERENCE, POS_BASELINE_CANDIDATE y POS_VISUAL_DIFF_OUTPUT.",
  );
}
if (!Number.isFinite(maxDiffRatio) || maxDiffRatio < 0 || maxDiffRatio > 1) {
  throw new Error("POS_VISUAL_MAX_DIFF_RATIO debe estar entre 0 y 1.");
}
if (fs.existsSync(outputRoot) && fs.readdirSync(outputRoot).length > 0) {
  throw new Error(
    `La salida ${outputRoot} ya contiene archivos; no se sobrescriben diffs.`,
  );
}

const referenceIndex = JSON.parse(
  fs.readFileSync(path.join(referenceRoot, "capture-index.json"), "utf8"),
);
const candidateIndex = JSON.parse(
  fs.readFileSync(path.join(candidateRoot, "capture-index.json"), "utf8"),
);
if (referenceIndex.mode !== "reference") {
  throw new Error(
    "El directorio de referencia no fue generado en modo reference.",
  );
}
if (
  referenceIndex.referenceSha !== "12fb8045cc264b565cb6e764d95ad7b2447fbfa1"
) {
  throw new Error("El baseline no pertenece al SHA visual aprobado.");
}
if (referenceIndex.sourceSha !== referenceIndex.referenceSha) {
  throw new Error(
    "El índice de referencia no fue capturado desde su propio SHA.",
  );
}
if (candidateIndex.mode !== "candidate") {
  throw new Error("El directorio candidato no fue generado en modo candidate.");
}
for (const property of [
  "referenceSha",
  "fixedInstant",
  "locale",
  "timezone",
  "browser",
  "browserVersion",
  "playwright",
  "nodeVersion",
  "packageManager",
  "deviceScaleFactor",
  "colorScheme",
  "reducedMotion",
  "fixtureSha256",
  "scenarioManifestSha256",
  "referenceSourceSnapshotSha256",
  "sensitiveContentRedacted",
]) {
  if (
    referenceIndex[property] === undefined ||
    candidateIndex[property] === undefined ||
    referenceIndex[property] !== candidateIndex[property]
  ) {
    throw new Error(
      `Referencia y candidato no comparten ${property}; la comparación no es válida.`,
    );
  }
}

fs.mkdirSync(outputRoot, { recursive: true });
const candidateFiles = new Set(
  candidateIndex.captures.map((capture) => capture.file),
);
const results = [];

function identify(filename) {
  const result = spawnSync(
    "magick",
    ["identify", "-format", "%w %h", filename],
    {
      encoding: "utf8",
    },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || `No se pudo leer ${filename}.`);
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number);
  return { width, height };
}

for (const capture of referenceIndex.captures) {
  const referenceFile = path.join(referenceRoot, capture.file);
  const candidateFile = path.join(candidateRoot, capture.file);
  const diffFile = path.join(outputRoot, capture.file);
  if (!candidateFiles.has(capture.file) || !fs.existsSync(candidateFile)) {
    results.push({
      id: capture.id,
      file: capture.file,
      status: "MISSING_CANDIDATE",
    });
    continue;
  }
  const referenceSize = identify(referenceFile);
  const candidateSize = identify(candidateFile);
  if (
    referenceSize.width !== candidateSize.width ||
    referenceSize.height !== candidateSize.height
  ) {
    results.push({
      id: capture.id,
      file: capture.file,
      status: "DIMENSION_MISMATCH",
      referenceSize,
      candidateSize,
    });
    continue;
  }
  const comparison = spawnSync(
    "magick",
    ["compare", "-metric", "AE", referenceFile, candidateFile, diffFile],
    { encoding: "utf8" },
  );
  if (comparison.status !== 0 && comparison.status !== 1) {
    throw new Error(
      comparison.stderr || `ImageMagick falló para ${capture.file}.`,
    );
  }
  const pixelCount = spawnSync(
    "magick",
    [
      referenceFile,
      candidateFile,
      "-compose",
      "difference",
      "-composite",
      "-colorspace",
      "gray",
      "-threshold",
      "0",
      "-format",
      "%[fx:mean*w*h]",
      "info:",
    ],
    { encoding: "utf8" },
  );
  if (pixelCount.status !== 0) {
    throw new Error(
      pixelCount.stderr || `No se pudo contar el diff de ${capture.file}.`,
    );
  }
  const differentPixels = Number.parseFloat(pixelCount.stdout.trim());
  if (!Number.isFinite(differentPixels)) {
    throw new Error(`No se pudo interpretar la métrica de ${capture.file}.`);
  }
  const totalPixels = referenceSize.width * referenceSize.height;
  const diffRatio = differentPixels / totalPixels;
  results.push({
    id: capture.id,
    file: capture.file,
    status: diffRatio <= maxDiffRatio ? "PASS" : "VISUAL_DIFF",
    differentPixels,
    totalPixels,
    diffRatio,
  });
  if (diffRatio === 0 && fs.existsSync(diffFile)) fs.rmSync(diffFile);
}

for (const capture of candidateIndex.captures) {
  if (
    !referenceIndex.captures.some(
      (reference) => reference.file === capture.file,
    )
  ) {
    results.push({
      id: capture.id,
      file: capture.file,
      status: "UNEXPECTED_CANDIDATE",
    });
  }
}

const failed = results.filter((result) => result.status !== "PASS");
const report = {
  schemaVersion: 1,
  referenceSha: referenceIndex.referenceSha,
  candidateSha: candidateIndex.sourceSha,
  maxDiffRatio,
  totals: {
    compared: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  results,
};
fs.writeFileSync(
  path.join(outputRoot, "comparison.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(report.totals)}\n`);
if (failed.length > 0) process.exitCode = 1;
