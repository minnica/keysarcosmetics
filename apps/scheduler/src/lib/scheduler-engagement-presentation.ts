import type {
  SchedulerMessageOutboxDto,
  SchedulerMessageTemplateDto,
  SchedulerSurveyDto,
  SchedulerSurveyWriteDto,
} from "@cosmetics/types";

export const schedulerMessageChannelLabels = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
  SMS: "SMS",
} as const;

export const schedulerSurveyStatusLabels = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
} as const;

export const schedulerOutboxStatusMeta: Record<
  SchedulerMessageOutboxDto["status"],
  {
    label: string;
    detail: string;
    tone: "neutral" | "warning" | "success" | "danger";
  }
> = {
  PENDING: {
    label: "En cola",
    detail: "La intención está registrada; el proveedor aún no la procesa.",
    tone: "neutral",
  },
  PROCESSING: {
    label: "Procesando",
    detail:
      "El worker reclamó el mensaje; todavía no hay confirmación de envío.",
    tone: "warning",
  },
  RETRY: {
    label: "Reintento pendiente",
    detail: "El sistema volverá a intentar el envío.",
    tone: "warning",
  },
  SENT: {
    label: "Enviado al proveedor",
    detail:
      "El proveedor aceptó el mensaje; la entrega aún no está confirmada.",
    tone: "success",
  },
  DELIVERED: {
    label: "Entregado",
    detail: "El proveedor confirmó la entrega.",
    tone: "success",
  },
  READ: {
    label: "Leído",
    detail: "El proveedor confirmó la lectura.",
    tone: "success",
  },
  FAILED: {
    label: "Falló",
    detail:
      "Se agotaron los intentos automáticos; puede solicitarse un reintento manual.",
    tone: "danger",
  },
  CANCELED: {
    label: "Cancelado",
    detail: "La intención quedó cancelada y no volverá a enviarse.",
    tone: "neutral",
  },
};

const schedulerVariablePattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*\}\}/g;

export function extractSchedulerMessageVariables(body: string): string[] {
  const variables: string[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(schedulerVariablePattern)) {
    const variable = match[1];
    if (!variable || seen.has(variable)) continue;
    seen.add(variable);
    variables.push(variable);
  }
  return variables;
}

export function formatSchedulerMessagePreview(
  body: string,
  values: Readonly<Record<string, string>>,
): string {
  return body.replace(schedulerVariablePattern, (_match, variable: string) =>
    values[variable] === undefined ? `{{${variable}}}` : values[variable],
  );
}

export function schedulerTemplateWriteInput(
  template: SchedulerMessageTemplateDto,
  overrides: Partial<
    Pick<
      SchedulerMessageTemplateDto,
      "name" | "channel" | "active" | "subject" | "body"
    >
  > = {},
) {
  const next = { ...template, ...overrides };
  return {
    commerceId: next.commerceId,
    name: next.name,
    channel: next.channel,
    active: next.active,
    subject: next.subject,
    body: next.body,
    variables: extractSchedulerMessageVariables(next.body),
    expectedVersion: template.currentVersion,
  };
}

export function schedulerSurveyWriteInput(
  survey: SchedulerSurveyDto,
  overrides: Partial<SchedulerSurveyWriteDto> = {},
): SchedulerSurveyWriteDto {
  return {
    commerceId: survey.commerceId,
    name: survey.name,
    status: survey.status,
    title: survey.title,
    introduction: survey.introduction,
    questions: survey.questions.map(({ type, prompt, required }) => ({
      type,
      prompt,
      required,
    })),
    serviceProfileIds: [...survey.serviceProfileIds],
    expectedVersion: survey.currentVersion,
    ...overrides,
  };
}

export function formatSchedulerFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
