import { randomUUID } from "node:crypto";
import type {
  Prisma,
  SchedulerMessageChannel,
  SchedulerMessageOutboxStatus,
} from "@prisma/client";
import { prisma } from "../prisma/client";
import {
  decryptSchedulerValue,
  renderSchedulerMessageTemplate,
  schedulerMessageRetryAt,
} from "./scheduler-engagement";

export interface SchedulerMessageProvider {
  send(input: {
    channel: SchedulerMessageChannel;
    destination: string;
    subject: string | null;
    body: string;
    idempotencyKey: string;
  }): Promise<{ providerMessageId: string }>;
}

class DisabledSchedulerMessageProvider implements SchedulerMessageProvider {
  async send(): Promise<never> {
    throw new Error("SCHEDULER_MESSAGING_PROVIDER_DISABLED");
  }
}

class HttpSchedulerMessageProvider implements SchedulerMessageProvider {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async send(
    input: Parameters<SchedulerMessageProvider["send"]>[0],
  ): Promise<{ providerMessageId: string }> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    const payload = (await response.json()) as { messageId?: unknown };
    if (typeof payload.messageId !== "string" || !payload.messageId.trim()) {
      throw new Error("PROVIDER_RESPONSE_INVALID");
    }
    return { providerMessageId: payload.messageId };
  }
}

export function schedulerMessageProviderFromEnvironment(): SchedulerMessageProvider {
  const provider = process.env["SCHEDULER_MESSAGING_PROVIDER"] ?? "disabled";
  if (provider === "disabled") return new DisabledSchedulerMessageProvider();
  if (provider !== "http") throw new Error("SCHEDULER_MESSAGING_PROVIDER_INVALID");
  if (
    process.env["NODE_ENV"] === "production" &&
    process.env["SCHEDULER_MESSAGING_SANDBOX_VERIFIED"] !== "true"
  ) {
    throw new Error("SCHEDULER_MESSAGING_SANDBOX_NOT_VERIFIED");
  }
  const url = process.env["SCHEDULER_MESSAGING_PROVIDER_URL"];
  const token = process.env["SCHEDULER_MESSAGING_PROVIDER_TOKEN"];
  if (!url || !token) throw new Error("SCHEDULER_MESSAGING_PROVIDER_NOT_CONFIGURED");
  return new HttpSchedulerMessageProvider(url, token);
}

function variablesRecord(value: Prisma.JsonValue): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("MESSAGE_VARIABLES_INVALID");
  }
  const entries = Object.entries(value);
  if (entries.some(([, child]) => typeof child !== "string")) {
    throw new Error("MESSAGE_VARIABLES_INVALID");
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

function safeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  return /^[A-Z0-9_]+$/.test(message) ? message.slice(0, 120) : "PROVIDER_ERROR";
}

export async function processSchedulerMessageOutbox(input?: {
  provider?: SchedulerMessageProvider;
  batchSize?: number;
  workerId?: string;
  now?: Date;
}): Promise<{ claimed: number; sent: number; retried: number; failed: number }> {
  const provider = input?.provider ?? schedulerMessageProviderFromEnvironment();
  const batchSize = Math.max(1, Math.min(input?.batchSize ?? 25, 100));
  const workerId = input?.workerId ?? `scheduler-message-${randomUUID()}`;
  const now = input?.now ?? new Date();
  const staleLock = new Date(now.getTime() - 5 * 60_000);

  const claimedIds = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "SchedulerMessageOutbox"
      WHERE "status" IN ('PENDING', 'RETRY', 'PROCESSING')
        AND "nextAttemptAt" <= ${now}
        AND ("status" <> 'PROCESSING' OR "lockedAt" < ${staleLock})
      ORDER BY "nextAttemptAt", "creadoEn"
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    `;
    if (rows.length === 0) return [];
    await tx.schedulerMessageOutbox.updateMany({
      where: { id: { in: rows.map(({ id }) => id) } },
      data: { status: "PROCESSING", lockedAt: now, lockOwner: workerId },
    });
    return rows.map(({ id }) => id);
  });

  let sent = 0;
  let retried = 0;
  let failed = 0;
  for (const id of claimedIds) {
    const row = await prisma.schedulerMessageOutbox.findUnique({
      where: { id },
      include: { templateVersion: true },
    });
    if (!row || row.status !== "PROCESSING" || row.lockOwner !== workerId) continue;
    try {
      const destination = decryptSchedulerValue({
        ciphertext: row.destinationCiphertext,
        iv: row.destinationIv,
        authTag: row.destinationAuthTag,
        keyVersion: row.encryptionKeyVersion,
      });
      const variables = variablesRecord(row.variablesSnapshot);
      const result = await provider.send({
        channel: row.channel,
        destination,
        subject: row.templateVersion.subject
          ? renderSchedulerMessageTemplate(row.templateVersion.subject, variables)
          : null,
        body: renderSchedulerMessageTemplate(row.templateVersion.body, variables),
        idempotencyKey: row.idempotencyKey,
      });
      await prisma.schedulerMessageOutbox.update({
        where: { id: row.id },
        data: {
          status: "SENT",
          attempts: { increment: 1 },
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          lockedAt: null,
          lockOwner: null,
          lastErrorCode: null,
        },
      });
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const terminal = attempts >= 8;
      await prisma.schedulerMessageOutbox.update({
        where: { id: row.id },
        data: {
          status: terminal ? "FAILED" : "RETRY",
          attempts,
          nextAttemptAt: schedulerMessageRetryAt(attempts, now),
          failedAt: terminal ? new Date() : null,
          lockedAt: null,
          lockOwner: null,
          lastErrorCode: safeProviderError(error),
        },
      });
      if (terminal) failed += 1;
      else retried += 1;
    }
  }
  return { claimed: claimedIds.length, sent, retried, failed };
}

const deliveryRank: Record<string, number> = {
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

export function nextSchedulerDeliveryStatus(
  current: SchedulerMessageOutboxStatus,
  incoming: string,
): SchedulerMessageOutboxStatus | null {
  if (!(incoming in deliveryRank)) return null;
  if (["CANCELED", "FAILED"].includes(current)) return null;
  if (incoming === "FAILED" && ["DELIVERED", "READ"].includes(current)) {
    return null;
  }
  if ((deliveryRank[incoming] ?? 0) < (deliveryRank[current] ?? 0)) return null;
  return incoming as SchedulerMessageOutboxStatus;
}
