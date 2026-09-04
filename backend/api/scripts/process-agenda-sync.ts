import "dotenv/config";
import { prisma } from "../src/prisma/client";
import { processAgendaSyncEvents } from "../src/services/pos-agenda";

async function main() {
  const result = await processAgendaSyncEvents({ limit: 100 });
  console.log(
    JSON.stringify({
      agendaSync: "completed",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    }),
  );
  if (result.failed > 0) process.exitCode = 1;
}

void main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        agendaSync: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
