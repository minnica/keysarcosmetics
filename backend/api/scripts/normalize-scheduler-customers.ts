/**
 * Materializa Customer.phoneNormalized sin modificar el teléfono original.
 *
 * El modo predeterminado es DRY_RUN y sólo emite agregados. APPLY requiere una
 * bandera explícita; production exige además confirmación y evidencia de PITR.
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/prisma/client";
import {
  parseSchedulerDiagnosisEnvironment,
  safeSchedulerDiagnosisError,
  validateBackupPitrConfirmation,
  validateSchedulerDiagnosisAccess,
} from "../src/services/scheduler-data-diagnosis";
import { normalizeSchedulerCustomerPhone } from "../src/services/scheduler-customers";

type NormalizationMode = "DRY_RUN" | "APPLY";

function normalizationMode(value: string | undefined): NormalizationMode {
  if (!value || value === "DRY_RUN") return "DRY_RUN";
  if (value === "APPLY") return "APPLY";
  throw new Error(
    "SCHEDULER_CUSTOMER_NORMALIZATION_MODE debe ser DRY_RUN o APPLY",
  );
}

async function main(): Promise<void> {
  const environment = parseSchedulerDiagnosisEnvironment(
    process.env["SCHEDULER_DIAGNOSE_ENVIRONMENT"],
  );
  const mode = normalizationMode(
    process.env["SCHEDULER_CUSTOMER_NORMALIZATION_MODE"],
  );
  const backupPitrConfirmedAt = validateBackupPitrConfirmation(
    process.env["SCHEDULER_BACKUP_PITR_CONFIRMED_AT"],
  );
  if (environment === "production") {
    if (mode === "DRY_RUN") {
      validateSchedulerDiagnosisAccess({
        environment,
        productionConfirmation:
          process.env["SCHEDULER_DIAGNOSE_PRODUCTION_CONFIRMATION"],
      });
    } else if (
      process.env["SCHEDULER_CUSTOMER_NORMALIZATION_CONFIRMATION"] !==
        "PRODUCCION_NORMALIZAR_CLIENTES" ||
      !backupPitrConfirmedAt
    ) {
      throw new Error(
        "Production APPLY requiere PRODUCCION_NORMALIZAR_CLIENTES y confirmación de backup/PITR",
      );
    }
  }

  const report = await prisma.$transaction(
    async (tx) => {
      if (mode === "DRY_RUN")
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const customers = await tx.customer.findMany({
        select: { id: true, phone: true, phoneNormalized: true },
        orderBy: { id: "asc" },
      });
      const normalizedByCustomer = customers.map((customer) => ({
        ...customer,
        derived: normalizeSchedulerCustomerPhone(customer.phone),
      }));
      const groups = new Map<string, number>();
      for (const customer of normalizedByCustomer) {
        if (!customer.derived) continue;
        groups.set(customer.derived, (groups.get(customer.derived) ?? 0) + 1);
      }
      const changed = normalizedByCustomer.filter(
        (customer) => customer.phoneNormalized !== customer.derived,
      );
      if (mode === "APPLY") {
        for (const customer of changed) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { phoneNormalized: customer.derived },
          });
        }
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_CUSTOMER_PHONE_NORMALIZATION",
            outcome: "SUCCESS",
            targetType: "Customer",
            metadata: {
              environment,
              updated: changed.length,
              duplicateGroups: [...groups.values()].filter((count) => count > 1)
                .length,
            },
          },
        });
      }
      return {
        generatedAt: new Date().toISOString(),
        environment,
        mode,
        total: customers.length,
        withDerivedPhone: normalizedByCustomer.filter(
          (customer) => customer.derived,
        ).length,
        withoutDerivedPhone: normalizedByCustomer.filter(
          (customer) => !customer.derived,
        ).length,
        rowsNeedingUpdate: changed.length,
        rowsUpdated: mode === "APPLY" ? changed.length : 0,
        duplicateGroups: [...groups.values()].filter((count) => count > 1)
          .length,
        recordsInDuplicateGroups: [...groups.values()]
          .filter((count) => count > 1)
          .reduce((sum, count) => sum + count, 0),
        uniquePartialIndexReady:
          changed.length === 0 &&
          [...groups.values()].every((count) => count === 1),
        privacy: {
          containsCustomerIds: false,
          containsPhones: false,
          aggregationOnly: true,
        },
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 120_000,
    },
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `No se pudo normalizar clientes de Scheduler: ${safeSchedulerDiagnosisError(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
