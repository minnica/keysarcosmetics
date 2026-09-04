import "dotenv/config";
import { prisma } from "../src/prisma/client";
import { processSchedulerMessageOutbox } from "../src/services/scheduler-messaging";

async function main(): Promise<void> {
  console.log(JSON.stringify(await processSchedulerMessageOutbox()));
}

main()
  .catch((error: unknown) => {
    console.error(
      "No fue posible procesar el outbox de Scheduler:",
      error instanceof Error ? error.message : "error desconocido",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
