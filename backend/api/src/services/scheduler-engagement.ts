import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Prisma, SchedulerMessageChannel } from "@prisma/client";

export interface SchedulerEncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}

export class SchedulerEngagementError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "SCHEDULER_ENGAGEMENT_ERROR",
  ) {
    super(message);
  }
}

export function normalizeSchedulerEngagementName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
}

export function schedulerSha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function encryptionMaterial(input?: { key?: Buffer; keyVersion?: string }) {
  const key =
    input?.key ??
    (() => {
      const encoded = process.env["SCHEDULER_DATA_ENCRYPTION_KEY"];
      if (!encoded) {
        throw new SchedulerEngagementError(
          "El cifrado de Scheduler no está configurado",
          503,
          "ENCRYPTION_NOT_CONFIGURED",
        );
      }
      return Buffer.from(encoded, "base64");
    })();
  if (key.length !== 32) {
    throw new SchedulerEngagementError(
      "La llave de cifrado de Scheduler debe contener 32 bytes",
      503,
      "INVALID_ENCRYPTION_KEY",
    );
  }
  return {
    key,
    keyVersion:
      input?.keyVersion ??
      process.env["SCHEDULER_DATA_ENCRYPTION_KEY_VERSION"] ??
      "v1",
  };
}

export function encryptSchedulerValue(
  plaintext: string,
  input?: { key?: Buffer; keyVersion?: string },
): SchedulerEncryptedValue {
  const material = encryptionMaterial(input);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", material.key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
    keyVersion: material.keyVersion,
  };
}

export function decryptSchedulerValue(
  value: SchedulerEncryptedValue,
  input?: { key?: Buffer; keyVersion?: string },
): string {
  const material = encryptionMaterial(input);
  if (value.keyVersion !== material.keyVersion) {
    throw new SchedulerEngagementError(
      "La versión de llave requerida no está disponible",
      503,
      "ENCRYPTION_KEY_VERSION_UNAVAILABLE",
    );
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    material.key,
    Buffer.from(value.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(value.authTag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

const templateVariable = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*\}\}/g;

export function extractSchedulerTemplateVariables(text: string): string[] {
  return [...text.matchAll(templateVariable)]
    .map((match) => match[1]!)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
}

export function validateSchedulerMessageTemplate(input: {
  channel: SchedulerMessageChannel;
  subject?: string | null;
  body: string;
  variables: string[];
}): void {
  if (!input.body.trim()) throw new Error("La plantilla requiere contenido");
  if (input.channel === "EMAIL" && !input.subject?.trim()) {
    throw new Error("Una plantilla de email requiere asunto");
  }
  if (input.channel !== "EMAIL" && input.subject) {
    throw new Error("Sólo una plantilla de email acepta asunto");
  }
  const declared = [...new Set(input.variables)].sort();
  if (declared.length !== input.variables.length) {
    throw new Error("Las variables declaradas no deben repetirse");
  }
  const used = extractSchedulerTemplateVariables(
    `${input.subject ?? ""}\n${input.body}`,
  );
  if (JSON.stringify(declared) !== JSON.stringify(used)) {
    throw new Error(
      "Las variables declaradas deben coincidir exactamente con la plantilla",
    );
  }
}

export function renderSchedulerMessageTemplate(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(templateVariable, (_match, key: string) => {
    const value = variables[key];
    if (value == null) throw new Error(`Falta la variable ${key}`);
    return value;
  });
}

export function schedulerMessageRetryAt(
  attempts: number,
  now = new Date(),
): Date {
  const minutes = Math.min(2 ** Math.max(0, attempts), 24 * 60);
  return new Date(now.getTime() + minutes * 60_000);
}

export function verifySchedulerWebhookSignature(input: {
  rawBody: Buffer;
  signature: string;
  timestamp: string;
  secret: string;
  now?: number;
}): boolean {
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  const now = input.now ?? Date.now();
  if (Math.abs(now - timestamp * 1000) > 5 * 60_000) return false;
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.`)
    .update(input.rawBody)
    .digest();
  if (!/^[0-9a-f]{64}$/i.test(input.signature)) return false;
  return timingSafeEqual(expected, Buffer.from(input.signature, "hex"));
}

export function validateSchedulerSurveyAnswers(
  questions: Array<{
    id: string;
    type: "RATING" | "COMMENT";
    required: boolean;
  }>,
  answers: Array<{ questionId: string; value: unknown }>,
): void {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  for (const answer of answers) {
    if (seen.has(answer.questionId)) {
      throw new Error("Cada pregunta sólo admite una respuesta");
    }
    seen.add(answer.questionId);
    const question = byId.get(answer.questionId);
    if (!question) throw new Error("La respuesta contiene una pregunta ajena");
    if (
      question.type === "RATING" &&
      (!Number.isInteger(answer.value) ||
        Number(answer.value) < 1 ||
        Number(answer.value) > 5)
    ) {
      throw new Error("La apreciación debe ser un entero entre 1 y 5");
    }
    if (
      question.type === "COMMENT" &&
      (typeof answer.value !== "string" || answer.value.trim().length > 4000)
    ) {
      throw new Error("El comentario no puede superar 4000 caracteres");
    }
  }
  if (questions.some((question) => question.required && !seen.has(question.id))) {
    throw new Error("Faltan respuestas obligatorias");
  }
}

type ReminderTx = Pick<Prisma.TransactionClient, "schedulerMessageOutbox">;

export async function refreshSchedulerAppointmentReminders(
  tx: ReminderTx,
  input: {
    appointmentId: string;
    previousStartsAt: Date;
    nextStartsAt: Date;
    nextAppointmentVersion: number;
    canceled: boolean;
  },
): Promise<{ canceled: number; regenerated: number }> {
  const pending = await tx.schedulerMessageOutbox.findMany({
    where: {
      appointmentId: input.appointmentId,
      status: { in: ["PENDING", "RETRY"] },
    },
  });
  if (pending.length === 0) return { canceled: 0, regenerated: 0 };
  const now = new Date();
  await tx.schedulerMessageOutbox.updateMany({
    where: { id: { in: pending.map(({ id }) => id) } },
    data: {
      status: "CANCELED",
      canceledAt: now,
      cancelReason: input.canceled
        ? "APPOINTMENT_CANCELED"
        : "APPOINTMENT_CHANGED",
      lockedAt: null,
      lockOwner: null,
    },
  });
  if (input.canceled) return { canceled: pending.length, regenerated: 0 };
  const shift =
    input.nextStartsAt.getTime() - input.previousStartsAt.getTime();
  const eligible = pending.filter((message) =>
    ["PENDING", "RETRY"].includes(message.status),
  );
  await Promise.all(
    eligible.map((message) =>
      tx.schedulerMessageOutbox.create({
        data: {
          idempotencyKey: `appointment-reminder:${schedulerSha256(message.idempotencyKey)}:v${input.nextAppointmentVersion}`,
          requestHash: message.requestHash,
          appointmentId: message.appointmentId,
          customerId: message.customerId,
          branchProfileId: message.branchProfileId,
          templateVersionId: message.templateVersionId,
          channel: message.channel,
          destinationCiphertext: message.destinationCiphertext,
          destinationIv: message.destinationIv,
          destinationAuthTag: message.destinationAuthTag,
          encryptionKeyVersion: message.encryptionKeyVersion,
          variablesSnapshot: message.variablesSnapshot as Prisma.InputJsonValue,
          scheduledAt: new Date(message.scheduledAt.getTime() + shift),
          nextAttemptAt: new Date(message.scheduledAt.getTime() + shift),
          createdByUserId: message.createdByUserId,
        },
      }),
    ),
  );
  return { canceled: pending.length, regenerated: eligible.length };
}
