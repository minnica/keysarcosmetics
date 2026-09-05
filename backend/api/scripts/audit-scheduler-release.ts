import type { Prisma } from "@prisma/client";
import { prisma } from "../src/prisma/client";

type CountRow = { key: string; count: number };
type OperationalRow = {
  dueMessages: number;
  exhaustedMessages: number;
  staleMessageLocks: number;
  dueAgendaEvents: number;
};

const environment = process.env["SCHEDULER_RELEASE_AUDIT_ENVIRONMENT"]?.trim();
const sinceHours = Number(
  process.env["SCHEDULER_RELEASE_AUDIT_SINCE_HOURS"] ?? "24",
);

function assertSafeInvocation(): void {
  if (
    !environment ||
    !["development", "staging", "production"].includes(environment)
  ) {
    throw new Error(
      "SCHEDULER_RELEASE_AUDIT_ENVIRONMENT debe ser development, staging o production.",
    );
  }
  if (!Number.isInteger(sinceHours) || sinceHours < 1 || sinceHours > 168) {
    throw new Error(
      "SCHEDULER_RELEASE_AUDIT_SINCE_HOURS debe estar entre 1 y 168.",
    );
  }
  if (
    environment === "production" &&
    process.env["SCHEDULER_RELEASE_AUDIT_PRODUCTION_CONFIRMATION"] !==
      "PRODUCCION_SOLO_LECTURA"
  ) {
    throw new Error(
      "Production requiere SCHEDULER_RELEASE_AUDIT_PRODUCTION_CONFIRMATION=PRODUCCION_SOLO_LECTURA.",
    );
  }
}

function counts(rows: CountRow[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.key, Number(row.count)]));
}

function providerValue(
  value: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  if (!value) return fallback;
  return allowed.includes(value) ? value : "unknown";
}

function safeError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  ) {
    return `${error.code}: no fue posible completar la auditoría de sólo lectura`;
  }
  if (
    error instanceof Error &&
    (error.message.startsWith("SCHEDULER_RELEASE_AUDIT_") ||
      error.message.startsWith("Production requiere "))
  ) {
    return error.message;
  }
  return "No fue posible completar la auditoría de sólo lectura.";
}

async function collect(tx: Prisma.TransactionClient) {
  const startedAt = performance.now();
  await tx.$queryRaw`SELECT 1`;
  const databaseRoundTripMs =
    Math.round((performance.now() - startedAt) * 100) / 100;
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const [appointments, outbox, agenda, audits, operationalRows] =
    await Promise.all([
      tx.$queryRaw<CountRow[]>`
      SELECT status::text AS key, COUNT(*)::int AS count
      FROM "SchedulerAppointment"
      WHERE "actualizadoEn" >= ${since}
      GROUP BY status
      ORDER BY status
    `,
      tx.$queryRaw<CountRow[]>`
      SELECT (channel::text || ':' || status::text) AS key, COUNT(*)::int AS count
      FROM "SchedulerMessageOutbox"
      WHERE "actualizadoEn" >= ${since}
      GROUP BY channel, status
      ORDER BY channel, status
    `,
      tx.$queryRaw<CountRow[]>`
      SELECT (direction::text || ':' || status::text) AS key, COUNT(*)::int AS count
      FROM "AgendaSyncEvent"
      WHERE "actualizadoEn" >= ${since}
      GROUP BY direction, status
      ORDER BY direction, status
    `,
      tx.$queryRaw<CountRow[]>`
      SELECT (outcome || ':' || action) AS key, COUNT(*)::int AS count
      FROM "AuditLog"
      WHERE application = 'SCHEDULER' AND "creadoEn" >= ${since}
      GROUP BY outcome, action
      ORDER BY outcome, action
    `,
      tx.$queryRaw<OperationalRow[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE status IN ('PENDING', 'RETRY') AND "nextAttemptAt" <= NOW()
        )::int AS "dueMessages",
        COUNT(*) FILTER (WHERE attempts >= 8 AND status NOT IN ('SENT', 'DELIVERED', 'READ', 'CANCELED'))::int AS "exhaustedMessages",
        COUNT(*) FILTER (WHERE status = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '10 minutes')::int AS "staleMessageLocks",
        (
          SELECT COUNT(*)::int
          FROM "AgendaSyncEvent"
          WHERE status IN ('PENDING', 'FAILED')
            AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
        ) AS "dueAgendaEvents"
      FROM "SchedulerMessageOutbox"
    `,
    ]);
  const operational = operationalRows[0] ?? {
    dueMessages: 0,
    exhaustedMessages: 0,
    staleMessageLocks: 0,
    dueAgendaEvents: 0,
  };
  const warnings = [
    operational.exhaustedMessages > 0 &&
      "Hay mensajes que agotaron sus reintentos.",
    operational.staleMessageLocks > 0 &&
      "Hay locks de outbox con más de diez minutos.",
    operational.dueAgendaEvents > 0 &&
      "Hay eventos internos de Agenda vencidos o fallidos.",
  ].filter((warning): warning is string => Boolean(warning));
  return {
    status: warnings.length === 0 ? "PASS" : "WARN",
    scope: { environment, sinceHours, readOnly: true },
    providers: {
      agenda: providerValue(
        process.env["AGENDA_PROVIDER"],
        ["internal", "http"],
        "internal (default)",
      ),
      messaging: providerValue(
        process.env["SCHEDULER_MESSAGING_PROVIDER"],
        ["disabled", "http"],
        "disabled (default)",
      ),
    },
    databaseRoundTripMs,
    appointments: counts(appointments),
    outbox: counts(outbox),
    agendaSync: counts(agenda),
    schedulerAudit: counts(audits),
    operational: Object.fromEntries(
      Object.entries(operational).map(([key, value]) => [key, Number(value)]),
    ),
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  assertSafeInvocation();
  const report = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return collect(tx);
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
