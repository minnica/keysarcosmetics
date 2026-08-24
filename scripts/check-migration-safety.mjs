import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const baseRef =
  process.argv.slice(2).find((argument) => argument !== "--") ??
  process.env["MIGRATION_BASE_REF"];

if (!baseRef) {
  console.error(
    "Indica la referencia base: pnpm migrations:review -- origin/develop",
  );
  process.exit(1);
}

const { stdout } = await execFileAsync("git", [
  "diff",
  "--name-only",
  "--diff-filter=ACMR",
  `${baseRef}...HEAD`,
  "--",
  "backend/api/prisma/migrations/**/migration.sql",
]);

const changedFiles = stdout
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const riskySql = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+COLUMN\b[^;]*\bSET\s+NOT\s+NULL\b/i,
  /\bRENAME\s+(?:COLUMN|TABLE)\b/i,
];
const approvalMarker = "-- migration-safety: reviewed";
const blocked = [];

for (const file of changedFiles) {
  const sql = await readFile(file, "utf8");
  if (
    riskySql.some((pattern) => pattern.test(sql)) &&
    !sql.includes(approvalMarker)
  ) {
    blocked.push(file);
  }
}

if (blocked.length > 0) {
  console.error("Se detectó SQL potencialmente destructivo:");
  for (const file of blocked) console.error(`- ${file}`);
  console.error(
    `Revisa respaldo, compatibilidad y rollback. Después documenta la revisión dentro de la migración con: ${approvalMarker}`,
  );
  process.exit(1);
}

console.log(
  changedFiles.length === 0
    ? "No hay migraciones modificadas."
    : `Migraciones revisadas: ${changedFiles.length}.`,
);
