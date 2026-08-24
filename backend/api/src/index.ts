import "dotenv/config";
import { app } from "./app";
import { prisma } from "./prisma/client";

const port = Number(process.env["PORT"] ?? 4000);
const host = "0.0.0.0";
const server = app.listen(port, host, () => {
  console.log(`API corriendo en http://${host}:${port}`);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`Cerrando API por ${signal}`);

  server.close(async (error) => {
    await prisma.$disconnect();

    if (error) {
      console.error("[shutdown]", error);
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
