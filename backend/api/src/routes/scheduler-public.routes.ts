import { Prisma } from "@prisma/client";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import {
  schedulerSha256,
  validateSchedulerSurveyAnswers,
  verifySchedulerWebhookSignature,
} from "../services/scheduler-engagement";
import { nextSchedulerDeliveryStatus } from "../services/scheduler-messaging";

const router: ExpressRouter = Router();
const tokenSchema = z.string().min(32).max(128);
const webhookSchema = z
  .object({
    eventId: z.string().trim().min(1).max(191),
    providerMessageId: z.string().trim().min(1).max(191),
    status: z.enum(["SENT", "DELIVERED", "READ", "FAILED"]),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
const responseSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionId: z.string().uuid(),
            value: z.union([z.string().max(4000), z.number()]),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();

router.post("/communications/webhooks", async (req, res) => {
  try {
    const secret = process.env["SCHEDULER_MESSAGING_WEBHOOK_SECRET"];
    const signature = req.get("x-scheduler-signature") ?? "";
    const timestamp = req.get("x-scheduler-timestamp") ?? "";
    if (
      !secret ||
      !req.rawBody ||
      !verifySchedulerWebhookSignature({
        rawBody: req.rawBody,
        signature,
        timestamp,
        secret,
      })
    ) {
      res.status(401).json({ success: false, message: "Firma inválida", data: null });
      return;
    }
    const input = webhookSchema.parse(req.body);
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`scheduler-webhook:${input.eventId}`}, 0))`;
        const duplicate = await tx.schedulerMessageDeliveryEvent.findUnique({
          where: { providerEventId: input.eventId },
        });
        if (duplicate) return { duplicate: true };
        const message = await tx.schedulerMessageOutbox.findUnique({
          where: { providerMessageId: input.providerMessageId },
        });
        if (!message) return { ignored: true };
        await tx.schedulerMessageDeliveryEvent.create({
          data: {
            outboxId: message.id,
            providerEventId: input.eventId,
            providerStatus: input.status,
            payloadHash: schedulerSha256(req.rawBody!),
            occurredAt: new Date(input.occurredAt),
          },
        });
        const status = nextSchedulerDeliveryStatus(message.status, input.status);
        if (status) {
          await tx.schedulerMessageOutbox.update({
            where: { id: message.id },
            data: {
              status,
              ...(status === "DELIVERED" ? { deliveredAt: new Date(input.occurredAt) } : {}),
              ...(status === "READ" ? { readAt: new Date(input.occurredAt) } : {}),
              ...(status === "FAILED" ? { failedAt: new Date(input.occurredAt), lastErrorCode: "PROVIDER_DELIVERY_FAILED" } : {}),
            },
          });
        }
        return { duplicate: false, applied: Boolean(status) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    res.json({ success: true, message: "Evento recibido", data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Evento inválido", data: null });
      return;
    }
    console.error("[scheduler.messaging.webhook]", error);
    res.status(500).json({ success: false, message: "No fue posible recibir el evento", data: null });
  }
});

async function surveyToken(token: string) {
  return prisma.schedulerSurveyToken.findUnique({
    where: { tokenHash: schedulerSha256(token) },
    include: {
      surveyVersion: {
        include: {
          survey: true,
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

router.get("/surveys/respond/:token", async (req, res) => {
  try {
    const token = tokenSchema.parse(req.params["token"]);
    const row = await surveyToken(token);
    if (
      !row ||
      row.revokedAt ||
      row.usedAt ||
      row.expiresAt <= new Date() ||
      row.surveyVersion.survey.status !== "ACTIVE"
    ) {
      res.status(410).json({ success: false, message: "La encuesta no está disponible", data: null });
      return;
    }
    res.json({
      success: true,
      message: "OK",
      data: {
        title: row.surveyVersion.title,
        introduction: row.surveyVersion.introduction,
        expiresAt: row.expiresAt.toISOString(),
        questions: row.surveyVersion.questions.map((question) => ({
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          required: question.required,
        })),
      },
    });
  } catch {
    res.status(400).json({ success: false, message: "Token inválido", data: null });
  }
});

router.post("/surveys/respond/:token", async (req, res) => {
  try {
    const token = tokenSchema.parse(req.params["token"]);
    const input = responseSchema.parse(req.body);
    const tokenHash = schedulerSha256(token);
    const responseId = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "SchedulerSurveyToken" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
        const row = await tx.schedulerSurveyToken.findUnique({
          where: { tokenHash },
          include: {
            surveyVersion: {
              include: { survey: true, questions: { orderBy: { sortOrder: "asc" } } },
            },
          },
        });
        if (
          !row ||
          row.revokedAt ||
          row.usedAt ||
          row.expiresAt <= new Date() ||
          row.surveyVersion.survey.status !== "ACTIVE"
        ) {
          return null;
        }
        validateSchedulerSurveyAnswers(row.surveyVersion.questions, input.answers);
        const answers = new Map(input.answers.map((answer) => [answer.questionId, answer.value]));
        const response = await tx.schedulerSurveyResponse.create({
          data: {
            tokenId: row.id,
            customerId: row.customerId,
            appointmentId: row.appointmentId,
            answers: {
              create: row.surveyVersion.questions
                .filter((question) => answers.has(question.id))
                .map((question) => ({
                  questionId: question.id,
                  promptSnapshot: question.prompt,
                  typeSnapshot: question.type,
                  value: answers.get(question.id) as Prisma.InputJsonValue,
                })),
            },
          },
        });
        await tx.schedulerSurveyToken.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        });
        return response.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!responseId) {
      res.status(410).json({ success: false, message: "La encuesta no está disponible", data: null });
      return;
    }
    res.status(201).json({ success: true, message: "Respuesta registrada", data: { id: responseId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Respuesta inválida", data: null });
      return;
    }
    if (
      error instanceof Error &&
      /(?:respuesta|pregunta|apreciación|comentario|obligatorias)/i.test(
        error.message,
      )
    ) {
      res.status(400).json({ success: false, message: "Respuestas inválidas", data: null });
      return;
    }
    console.error("[scheduler.survey.response]", error);
    res.status(500).json({ success: false, message: "No fue posible registrar la respuesta", data: null });
  }
});

export default router;
