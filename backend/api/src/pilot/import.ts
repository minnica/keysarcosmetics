import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
) {
  const ddl = await readFile(
    resolve(__dirname, "../../pilot/schema.sql"),
    "utf8",
  );
  await db.$transaction(async (tx) => {
    await assertEmptyOfProduction(tx);
    for (const statement of ddl
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await tx.$executeRawUnsafe(statement);
    await tx.$executeRaw`INSERT INTO payroll_pilot.identity(singleton,project_ref) VALUES(true,${ref}) ON CONFLICT DO NOTHING`;
    await assertIdentity(tx, ref);
    if (password) {
      if (!/^[A-Za-z0-9_-]{32,100}$/.test(password))
        throw Error("Clave de servicio inválida.");
      const [role] = await tx.$queryRaw<
        { exists: boolean }[]
      >`SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='keysar_pilot_runtime') AS exists`;
      if (!role?.exists)
        await tx.$executeRawUnsafe(
          "CREATE ROLE keysar_pilot_runtime LOGIN NOBYPASSRLS NOINHERIT PASSWORD '" +
            password +
            "'",
        );
      await tx.$executeRawUnsafe(
        "GRANT USAGE ON SCHEMA payroll_pilot TO keysar_pilot_runtime",
      );
      await tx.$executeRawUnsafe(
        "GRANT SELECT ON payroll_pilot.identity, payroll_pilot.cuts TO keysar_pilot_runtime",
      );
      await tx.$executeRawUnsafe(
        "GRANT UPDATE (changes,revision,updated_at,updated_by) ON payroll_pilot.cuts TO keysar_pilot_runtime",
      );
      for (const table of ["identity", "cuts"]) {
        await tx.$executeRawUnsafe(
          "DROP POLICY IF EXISTS pilot_read ON payroll_pilot." + table,
        );
        await tx.$executeRawUnsafe(
          "CREATE POLICY pilot_read ON payroll_pilot." +
            table +
            " FOR SELECT TO keysar_pilot_runtime USING (true)",
        );
      }
      await tx.$executeRawUnsafe(
        "DROP POLICY IF EXISTS pilot_edit ON payroll_pilot.cuts",
      );
      await tx.$executeRawUnsafe(
        "CREATE POLICY pilot_edit ON payroll_pilot.cuts FOR UPDATE TO keysar_pilot_runtime USING (true) WITH CHECK (true)",
      );
    }
  });
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
