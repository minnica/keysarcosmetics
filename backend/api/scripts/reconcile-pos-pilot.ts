/**
 * Puerta de conciliación del piloto POS.
 *
 * Abre una transacción PostgreSQL de sólo lectura y falla si detecta diferencias
 * financieras, de inventario, cierre, notificaciones o sincronización offline.
 */
import "dotenv/config";
import { prisma } from "../src/prisma/client";
import {
  reconcilePosPilot,
  type PosPilotReconciliationOptions,
  validatePosPilotOptions,
} from "../src/services/pos-pilot-reconciliation";

function booleanEnvironment(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} debe ser true o false`);
}

function optionsFromEnvironment(): PosPilotReconciliationOptions {
  return {
    branchId: process.env["POS_PILOT_BRANCH_ID"] ?? "",
    businessDate: process.env["POS_PILOT_BUSINESS_DATE"] ?? "",
    minimumTicketCount: Number(process.env["POS_PILOT_MIN_TICKETS"] ?? "1"),
    requireClosedDay: booleanEnvironment("POS_PILOT_REQUIRE_CLOSED_DAY", true),
    requireCoverage: booleanEnvironment("POS_PILOT_REQUIRE_COVERAGE", true),
    requireOfflineSync: booleanEnvironment(
      "POS_PILOT_REQUIRE_OFFLINE_SYNC",
      true,
    ),
  };
}

async function main(): Promise<void> {
  const options = optionsFromEnvironment();
  validatePosPilotOptions(options);
  const report = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return reconcilePosPilot(tx, options);
    },
    { timeout: 30_000 },
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "PASS") process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    process.stderr.write(`No se pudo conciliar el piloto POS: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
