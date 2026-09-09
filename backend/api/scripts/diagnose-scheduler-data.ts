/**
 * Inventario reproducible de preparación para Scheduler.
 *
 * Todas las consultas se ejecutan dentro de una transacción PostgreSQL marcada
 * READ ONLY. El reporte agrega conteos y nunca imprime DATABASE_URL, secretos o
 * registros personales.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/prisma/client";
import {
  diagnoseSchedulerData,
  parseSchedulerDiagnosisEnvironment,
  safeSchedulerDiagnosisError,
  type RepositoryMigration,
  validateBackupPitrConfirmation,
  validateSchedulerDiagnosisAccess,
} from "../src/services/scheduler-data-diagnosis";

async function readRepositoryMigrations(): Promise<RepositoryMigration[]> {
  const migrationsDirectory = path.resolve(__dirname, "../prisma/migrations");
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const migrations = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const sql = await readFile(
          path.join(migrationsDirectory, entry.name, "migration.sql"),
        );
        return {
          name: entry.name,
          checksum: createHash("sha256").update(sql).digest("hex"),
        };
      }),
  );
  return migrations.sort((left, right) => left.name.localeCompare(right.name));
}

async function main(): Promise<void> {
  const environment = parseSchedulerDiagnosisEnvironment(
    process.env["SCHEDULER_DIAGNOSE_ENVIRONMENT"],
  );
  validateSchedulerDiagnosisAccess({
    environment,
    productionConfirmation:
      process.env["SCHEDULER_DIAGNOSE_PRODUCTION_CONFIRMATION"],
  });
  const backupPitrConfirmedAt = validateBackupPitrConfirmation(
    process.env["SCHEDULER_BACKUP_PITR_CONFIRMED_AT"],
  );
  const repositoryMigrations = await readRepositoryMigrations();

  const report = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return diagnoseSchedulerData(tx, {
        environment,
        repositoryMigrations,
        backupPitrConfirmedAt,
      });
    },
    { timeout: 120_000 },
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `No se pudo ejecutar el diagnóstico de Scheduler: ${safeSchedulerDiagnosisError(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
