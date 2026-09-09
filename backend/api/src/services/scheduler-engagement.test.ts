import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptSchedulerValue,
  encryptSchedulerValue,
  extractSchedulerTemplateVariables,
  renderSchedulerMessageTemplate,
  schedulerMessageRetryAt,
  validateSchedulerMessageTemplate,
  validateSchedulerSurveyAnswers,
  verifySchedulerWebhookSignature,
} from "./scheduler-engagement";
import { nextSchedulerDeliveryStatus } from "./scheduler-messaging";

describe("Scheduler engagement security and idempotency rules", () => {
  it("encrypts sensitive values with authenticated encryption", () => {
    const key = Buffer.alloc(32, 7);
    const encrypted = encryptSchedulerValue("sensitive", {
      key,
      keyVersion: "test-v1",
    });
    expect(encrypted.ciphertext).not.toContain("sensitive");
    expect(
      decryptSchedulerValue(encrypted, { key, keyVersion: "test-v1" }),
    ).toBe("sensitive");
    expect(() =>
      decryptSchedulerValue(
        { ...encrypted, authTag: "0".repeat(32) },
        { key, keyVersion: "test-v1" },
      ),
    ).toThrow();
  });

  it("requires exact template variable declarations", () => {
    expect(
      extractSchedulerTemplateVariables(
        "Hola {{ client.name }}, tu cita es {{appointment.date}}.",
      ),
    ).toEqual(["appointment.date", "client.name"]);
    expect(() =>
      validateSchedulerMessageTemplate({
        channel: "WHATSAPP",
        body: "Hola {{client.name}}",
        variables: ["client.name"],
      }),
    ).not.toThrow();
    expect(() =>
      validateSchedulerMessageTemplate({
        channel: "EMAIL",
        body: "Hola {{client.name}}",
        variables: ["client.name", "unused"],
      }),
    ).toThrow();
    expect(
      renderSchedulerMessageTemplate("Hola {{name}}", { name: "Ana" }),
    ).toBe("Hola Ana");
  });

  it("uses bounded exponential retries", () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    expect(schedulerMessageRetryAt(0, now).toISOString()).toBe(
      "2026-09-04T12:01:00.000Z",
    );
    expect(schedulerMessageRetryAt(20, now).toISOString()).toBe(
      "2026-09-05T12:00:00.000Z",
    );
  });

  it("verifies fresh HMAC webhooks and rejects stale timestamps", () => {
    const rawBody = Buffer.from('{"eventId":"evt-1"}');
    const timestamp = "1788523200";
    const secret = "test-secret";
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest("hex");
    expect(
      verifySchedulerWebhookSignature({
        rawBody,
        signature,
        timestamp,
        secret,
        now: Number(timestamp) * 1000,
      }),
    ).toBe(true);
    expect(
      verifySchedulerWebhookSignature({
        rawBody,
        signature,
        timestamp,
        secret,
        now: Number(timestamp) * 1000 + 300_001,
      }),
    ).toBe(false);
  });

  it("never regresses delivery status", () => {
    expect(nextSchedulerDeliveryStatus("SENT", "DELIVERED")).toBe(
      "DELIVERED",
    );
    expect(nextSchedulerDeliveryStatus("READ", "DELIVERED")).toBeNull();
    expect(nextSchedulerDeliveryStatus("CANCELED", "DELIVERED")).toBeNull();
  });

  it("validates required, typed and unique survey answers", () => {
    const questions = [
      { id: "rating", type: "RATING" as const, required: true },
      { id: "comment", type: "COMMENT" as const, required: false },
    ];
    expect(() =>
      validateSchedulerSurveyAnswers(questions, [
        { questionId: "rating", value: 5 },
        { questionId: "comment", value: "Excelente" },
      ]),
    ).not.toThrow();
    expect(() =>
      validateSchedulerSurveyAnswers(questions, [
        { questionId: "rating", value: 6 },
      ]),
    ).toThrow("entre 1 y 5");
    expect(() => validateSchedulerSurveyAnswers(questions, [])).toThrow(
      "obligatorias",
    );
  });
});
