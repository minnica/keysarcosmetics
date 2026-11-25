import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pilotRoleStatements } from "./access";
import type { PilotSnapshot } from "@cosmetics/types";
import {
  assertEmptyOfProduction,
  assertIdentity,
  connection,
  insertCut,
  pilotDatabase,
} from "./store";

export async function initialize(
  db: PrismaClient,
  ref: string,
  password = process.env.PILOT_RUNTIME_PASSWORD,
  loaderPassword = process.env.PILOT_LOADER_PASSWORD,
) {
  const ddl = await readFile(
    resolve(__dirname, "../../pilot/schema.sql"),
    "utf8",
  );
  await db.$transaction(
    async (tx) => {
      await assertEmptyOfProduction(tx);
      for (const statement of ddl
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO payroll_pilot.identity(singleton,project_ref) VALUES(true,${ref}) ON CONFLICT DO NOTHING`;
      await assertIdentity(tx, ref);
      for (const command of pilotRoleStatements(password, loaderPassword))
        await tx.$executeRawUnsafe(command);
    },
    { maxWait: 10000, timeout: 90000 },
  );
}
export async function readCut(db: PrismaClient, asOf?: string) {
  const sql = await readFile(
    resolve(__dirname, "../../pilot/read-cut.sql"),
    "utf8",
  );
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf))
    throw Error("Fecha de corte inválida.");
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      if (asOf)
        await tx.$queryRaw`SELECT set_config('payroll_pilot.as_of',${asOf},true)`;
      const [result] =
        await tx.$queryRawUnsafe<{ snapshot: PilotSnapshot }[]>(sql);
      if (!result) throw Error("Sin corte.");
      return result.snapshot;
    },
    { isolationLevel: "RepeatableRead", timeout: 90000 },
  );
}
async function main() {
  const dst = pilotDatabase(),
    ref = process.env.PILOT_PROJECT_REF!;
  try {
    if (process.argv[2] === "init") {
      await initialize(dst, ref);
      console.log("Base piloto identificada.");
      return;
    }
    if (process.argv[2] !== "import") throw Error("Usa init o import.");
    const sourceRef = process.env.PAYROLL_SOURCE_REF;
    if (!sourceRef || ref === sourceRef)
      throw Error("El origen y destino deben ser independientes.");
    const source = new PrismaClient({
      datasourceUrl: connection(
        process.env.PAYROLL_SOURCE_READ_URL,
        sourceRef,
        process.env.PILOT_LOCAL_TEST === "1" &&
          process.env.NODE_ENV !== "production" &&
          !process.env.FLY_APP_NAME,
      ),
    });
    try {
      const original = await readCut(source, process.env.PILOT_AS_OF);
      console.log(
        "Corte cargado",
        await insertCut(dst, original),
        original.closedStart,
        original.openStart,
      );
    } finally {
      await source.$disconnect();
    }
  } finally {
    await dst.$disconnect();
  }
}
if (require.main === module)
  main().catch(() => {
    console.error(
      "Falló la preparación del piloto. Revise identidades, conectividad y permisos.",
    );
    process.exitCode = 1;
  });
