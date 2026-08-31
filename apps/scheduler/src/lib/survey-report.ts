import {
  initialSurveyQuestions,
  initialSurveys,
  type SurveyQuestion,
  type SurveyRecord,
} from "./mock-administration-data";

// This report is a local prototype, like the rest of Scheduler's mock data.
// Its reference date is explicit so relative periods remain reproducible.
export const surveyReportReferenceDate = "2026-06-30";
export const reportSurveys: SurveyRecord[] = [
  {
    id: "survey-quality",
    name: "Encuesta de calidad",
    serviceIds: [],
    questionIds: [
      "question-quality",
      "question-punctuality",
      "question-cleanliness",
      "question-recommend",
      "question-comment",
      "question-booking-appointment",
    ],
    updatedAt: surveyReportReferenceDate,
  },
  ...initialSurveys,
];

export interface SurveyDelivery {
  id: string;
  surveyId: string;
  professionalId: string;
  serviceId: string;
  sentAt: string;
  respondedAt?: string;
  ratings: Record<string, number>;
}

export const demoSurveyDeliveries: SurveyDelivery[] = [
  {
    id: "survey-delivery-demo-1",
    surveyId: "survey-quality",
    professionalId: "opatra-cabina-1",
    serviceId: "svc-1",
    sentAt: surveyReportReferenceDate,
    ratings: {},
  },
];

export type SurveyPeriod = "7" | "30" | "90" | "all" | "custom";
export interface SurveyReportFilters {
  surveyId: string;
  period: SurveyPeriod;
  professionalIds: string[];
  serviceIds: string[];
  from: string;
  to: string;
}

export function getSurveyDateRange(
  period: SurveyPeriod,
  from = "",
  to = "",
  reference = surveyReportReferenceDate,
) {
  if (period === "custom")
    return { from, to, valid: Boolean(from && to && from <= to) };
  if (period === "all") return { from: "", to: reference, valid: true };
  const start = new Date(`${reference}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - Number(period) + 1);
  return { from: start.toISOString().slice(0, 10), to: reference, valid: true };
}

export function filterSurveyDeliveries(
  deliveries: SurveyDelivery[],
  filters: SurveyReportFilters,
) {
  const range = getSurveyDateRange(filters.period, filters.from, filters.to);
  if (!range.valid) return [];
  return deliveries.filter(
    (delivery) =>
      delivery.surveyId === filters.surveyId &&
      filters.professionalIds.includes(delivery.professionalId) &&
      filters.serviceIds.includes(delivery.serviceId) &&
      (!range.from || delivery.sentAt.slice(0, 10) >= range.from) &&
      delivery.sentAt.slice(0, 10) <= range.to,
  );
}

export function summarizeRatings(values: number[]) {
  const valid = values.filter(
    (value) => Number.isInteger(value) && value >= 1 && value <= 5,
  );
  return {
    count: valid.length,
    average: valid.length
      ? valid.reduce((sum, value) => sum + value, 0) / valid.length
      : 0,
    distribution: [5, 4, 3, 2, 1].map((rating) => {
      const count = valid.filter((value) => value === rating).length;
      return {
        rating,
        count,
        percentage: valid.length ? (count / valid.length) * 100 : 0,
      };
    }),
  };
}
export type RatingSummary = ReturnType<typeof summarizeRatings>;

export function buildSurveyReport(
  survey: SurveyRecord,
  deliveries: SurveyDelivery[],
  questions: SurveyQuestion[] = initialSurveyQuestions,
) {
  const responses = deliveries.filter((delivery) =>
    Boolean(delivery.respondedAt),
  );
  const selectedQuestions = survey.questionIds.flatMap((id) => {
    const question = questions.find((candidate) => candidate.id === id);
    return question?.type === "rating" ? [question] : [];
  });
  const categories = Array.from(
    new Set(selectedQuestions.map((question) => question.category)),
  ).map((category, index) => {
    const categoryQuestions = selectedQuestions.filter(
      (question) => question.category === category,
    );
    return {
      id: `category-${index}`,
      name: category,
      ...summarizeRatings(
        responses.flatMap((response) =>
          categoryQuestions.map(
            (question) => response.ratings[question.id] ?? NaN,
          ),
        ),
      ),
      questions: categoryQuestions.map((question) => ({
        ...question,
        ...summarizeRatings(
          responses.map((response) => response.ratings[question.id] ?? NaN),
        ),
      })),
    };
  });
  return {
    sent: deliveries.length,
    responded: responses.length,
    responseRate: deliveries.length
      ? (responses.length / deliveries.length) * 100
      : 0,
    ...summarizeRatings(
      responses.flatMap((response) =>
        selectedQuestions.map(
          (question) => response.ratings[question.id] ?? NaN,
        ),
      ),
    ),
    categories,
  };
}
export type SurveyReport = ReturnType<typeof buildSurveyReport>;

function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function surveyReportCsv(
  survey: SurveyRecord,
  report: SurveyReport,
  filters: SurveyReportFilters,
) {
  const range = getSurveyDateRange(filters.period, filters.from, filters.to);
  const rows: (string | number)[][] = [
    ["Reporte de encuestas", survey.name],
    ["Origen", "Datos de demostración"],
    ["Desde", range.from || "Todo el historial"],
    ["Hasta", range.to],
    ["Especialistas (ID)", filters.professionalIds.join(", ")],
    ["Servicios (ID)", filters.serviceIds.join(", ")],
    ["Encuestas enviadas", report.sent],
    ["Encuestas respondidas", report.responded],
    ["Porcentaje de respuesta", `${report.responseRate.toFixed(1)}%`],
    ["Valoración promedio", report.average.toFixed(1)],
    [],
    [
      "Categoría",
      "Pregunta",
      "Promedio",
      "Valoraciones",
      "5 estrellas",
      "4 estrellas",
      "3 estrellas",
      "2 estrellas",
      "1 estrella",
    ],
    ...report.categories.flatMap((category) =>
      category.questions.map((question) => [
        category.name,
        question.text,
        question.average.toFixed(1),
        question.count,
        ...question.distribution.map((item) => item.count),
      ]),
    ),
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
