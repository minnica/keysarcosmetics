import { PrismaClient, type Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { PilotSnapshot } from "@cosmetics/types";

export function connection(
  raw: string | undefined,
  expected: string | undefined,
  local = false,
) {
  if (!raw || !expected)
    throw Error("Falta la conexión o identidad de proyecto.");
  const url = new URL(raw);
  if (!["postgresql:", "postgres:"].includes(url.protocol))
    throw Error("Conexión PostgreSQL requerida.");
  if (local && ["127.0.0.1", "localhost"].includes(url.hostname)) {
    if (url.pathname.slice(1) !== expected)
      throw Error("Base local incorrecta.");
    return url.toString();
  }
  if (!/^[a-z]{20}$/.test(expected))
    throw Error("Referencia Supabase inválida.");
  const direct = url.hostname === `db.${expected}.supabase.co`;
  const pool =
    /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
    decodeURIComponent(url.username).endsWith("." + expected);
  if (!direct && !pool)
    throw Error("La conexión no corresponde al proyecto indicado.");
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

export function pilotDatabase() {
  const local =
    process.env.PILOT_LOCAL_TEST === "1" &&
    !process.env.FLY_APP_NAME &&
    process.env.NODE_ENV !== "production";
  const ref = process.env.PILOT_PROJECT_REF;
  if (
    ref === "kgzuamipstbsiqrlaphh" ||
    (process.env.FLY_APP_NAME &&
      process.env.FLY_APP_NAME !== "cosmetics-payroll-pilot")
  ) {
    throw Error("El destino no está permitido para el piloto.");
  }
  return new PrismaClient({
    datasourceUrl: connection(process.env.PILOT_DATABASE_URL, ref, local),
  });
}

export async function assertEmptyOfProduction(db: Prisma.TransactionClient) {
  const [row] = await db.$queryRaw<{ safe: boolean }[]>`SELECT NOT EXISTS (
    SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND c.relname IN ('Empleado','PayrollRun','Venta')
  ) AS safe`;
  if (!row?.safe) throw Error("El destino contiene tablas operativas.");
}
export async function assertIdentity(
  db: Prisma.TransactionClient,
  ref: string,
) {
  const [row] = await db.$queryRaw<
    { project_ref: string }[]
  >`SELECT project_ref FROM payroll_pilot.identity WHERE singleton`;
  if (!ref || row?.project_ref !== ref)
    throw Error("La identidad de la base piloto no coincide.");
}
export async function insertCut(db: PrismaClient, original: PilotSnapshot) {
  if (
    original.format !== 1 ||
    original.periods.length !== 2 ||
    !original.employees.length
  )
    throw Error("Corte incompleto.");
  return db.$transaction(async (tx) => {
    await assertIdentity(tx, process.env.PILOT_PROJECT_REF ?? "");
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(363205, 1)");
    const id = randomUUID();
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`INSERT INTO payroll_pilot.cuts (id,captured_at,original)
      VALUES (${id}::uuid,${original.capturedAt}::timestamptz,${JSON.stringify(original)}::jsonb)
      ON CONFLICT(captured_at) DO NOTHING RETURNING id::text`;
    return rows[0]?.id ?? "existente";
  });
}
