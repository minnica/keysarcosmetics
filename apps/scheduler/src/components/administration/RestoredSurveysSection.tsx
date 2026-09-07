"use client";

import { useMemo, useState } from "react";
import type {
  SchedulerOperationalCatalogDto,
  SchedulerSurveyDto,
  SchedulerSurveyQuestionWriteDto,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { Check, Pencil, Plus, Search, Star, X } from "lucide-react";
import { schedulerApi } from "@/lib/api";
import {
  schedulerSurveyStatusLabels,
  schedulerSurveyWriteInput,
} from "@/lib/scheduler-engagement-presentation";
import { useSchedulerSession } from "@/lib/session";
import {
  ConflictNotice,
  QueryBoundary,
  invalidateSchedulerQueries,
  runSchedulerMutation,
  useSchedulerQuery,
} from "@/components/api/ApiState";
import {
  AdministrationCoverageNotice,
  AdministrationRefreshButton,
  RestoredAdministrationFrame,
} from "./RestoredAdministrationFrame";

const controlClass =
  "admin-input h-11 rounded-xl border-[#ded5cc] bg-white focus-visible:ring-[#c3a583]";

interface SurveyDraft {
  id: string;
  commerceId: string;
  name: string;
  title: string;
  introduction: string;
  status: SchedulerSurveyDto["status"];
  questions: SchedulerSurveyQuestionWriteDto[];
  serviceProfileIds: string[];
  expectedVersion?: number;
}

function commerceOptions(catalog: SchedulerOperationalCatalogDto | null) {
  if (!catalog) return [];
  const available = new Set(
    catalog.branches.map((branch) => branch.commerceId),
  );
  return catalog.commerces.filter((commerce) => available.has(commerce.id));
}

function emptyDraft(
  catalog: SchedulerOperationalCatalogDto | null,
): SurveyDraft {
  return {
    id: "",
    commerceId: commerceOptions(catalog)[0]?.id ?? "",
    name: "",
    title: "",
    introduction: "",
    status: "DRAFT",
    questions: [
      {
        type: "RATING",
        prompt: "¿Cómo calificarías tu visita?",
        required: true,
      },
    ],
    serviceProfileIds: [],
  };
}

function editDraft(survey: SchedulerSurveyDto): SurveyDraft {
  const input = schedulerSurveyWriteInput(survey);
  return {
    id: survey.id,
    commerceId: input.commerceId,
    name: input.name,
    title: input.title,
    introduction: input.introduction ?? "",
    status: input.status,
    questions: input.questions,
    serviceProfileIds: input.serviceProfileIds,
    ...(input.expectedVersion
      ? { expectedVersion: input.expectedVersion }
      : {}),
  };
}

function SurveyEditor({
  catalog,
  draft,
  setDraft,
}: {
  catalog: SchedulerOperationalCatalogDto;
  draft: SurveyDraft;
  setDraft: React.Dispatch<React.SetStateAction<SurveyDraft>>;
}) {
  const services = catalog.services.filter(
    (service) =>
      service.active &&
      service.branchProfileIds.some(
        (branchId) =>
          catalog.branches.find((branch) => branch.id === branchId)
            ?.commerceId === draft.commerceId,
      ),
  );
  const patchQuestion = (
    index: number,
    patch: Partial<SchedulerSurveyQuestionWriteDto>,
  ) =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, position) =>
        position === index ? { ...question, ...patch } : question,
      ),
    }));

  return (
    <div className="survey-dialog-layout">
      <div className="survey-editor-form">
        <section className="survey-editor-section space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="survey-commerce">Comercio</Label>
              <Select
                disabled={Boolean(draft.id)}
                onValueChange={(commerceId) =>
                  setDraft((current) => ({
                    ...current,
                    commerceId,
                    serviceProfileIds: [],
                  }))
                }
                value={draft.commerceId}
              >
                <SelectTrigger
                  className={`${controlClass} mt-1.5`}
                  id="survey-commerce"
                >
                  <SelectValue placeholder="Selecciona comercio" />
                </SelectTrigger>
                <SelectContent>
                  {commerceOptions(catalog).map((commerce) => (
                    <SelectItem key={commerce.id} value={commerce.id}>
                      {commerce.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="survey-status">Estado</Label>
              <Select
                onValueChange={(status) =>
                  setDraft((current) => ({
                    ...current,
                    status: status as SurveyDraft["status"],
                  }))
                }
                value={draft.status}
              >
                <SelectTrigger
                  className={`${controlClass} mt-1.5`}
                  id="survey-status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(schedulerSurveyStatusLabels).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="survey-name">Nombre interno</Label>
            <Input
              className={`${controlClass} mt-1.5`}
              id="survey-name"
              maxLength={160}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ej. Experiencia después de tu visita"
              value={draft.name}
            />
          </div>
          <div>
            <Label htmlFor="survey-title">Título para la clienta</Label>
            <Input
              className={`${controlClass} mt-1.5`}
              id="survey-title"
              maxLength={240}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              value={draft.title}
            />
          </div>
          <div>
            <Label htmlFor="survey-introduction">Introducción</Label>
            <Textarea
              className="admin-textarea mt-1.5"
              id="survey-introduction"
              maxLength={2000}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  introduction: event.target.value,
                }))
              }
              rows={3}
              value={draft.introduction}
            />
          </div>
        </section>

        <section className="survey-editor-section">
          <div className="survey-service-panel-heading">
            <div>
              <p className="survey-service-panel-title">Servicios incluidos</p>
              <p className="survey-service-panel-help">
                Sólo perfiles canónicos del comercio seleccionado.
              </p>
            </div>
            <span className="survey-service-count">
              {draft.serviceProfileIds.length} seleccionados
            </span>
          </div>
          <div className="survey-service-visual-list mt-4">
            {services.map((service) => {
              const checked = draft.serviceProfileIds.includes(service.id);
              return (
                <button
                  aria-pressed={checked}
                  className={`survey-service-visual-card${checked ? " is-selected" : ""}`}
                  key={service.id}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      serviceProfileIds: checked
                        ? current.serviceProfileIds.filter(
                            (id) => id !== service.id,
                          )
                        : [...current.serviceProfileIds, service.id],
                    }))
                  }
                  type="button"
                >
                  <span className="survey-service-visual-check">
                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="survey-service-visual-copy">
                    <span className="survey-service-visual-name">
                      {service.name}
                    </span>
                    <span className="survey-service-visual-meta">
                      {service.durationMinutes} min · capacidad{" "}
                      {service.capacity}
                    </span>
                  </span>
                  <span className="survey-service-visual-action">
                    {checked ? "Incluido" : "Agregar"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="survey-editor-section">
          <div className="flex items-center justify-between gap-3">
            <h3 className="admin-section-title">Preguntas</h3>
            <Button
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  questions: [
                    ...current.questions,
                    { type: "RATING", prompt: "", required: true },
                  ],
                }))
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva pregunta
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {draft.questions.map((question, index) => (
              <div className="survey-question-category p-4" key={index}>
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
                  <div>
                    <Label htmlFor={`survey-question-type-${index}`}>
                      Tipo
                    </Label>
                    <Select
                      onValueChange={(type) =>
                        patchQuestion(index, {
                          type: type as SchedulerSurveyQuestionWriteDto["type"],
                        })
                      }
                      value={question.type}
                    >
                      <SelectTrigger
                        className={`${controlClass} mt-1.5`}
                        id={`survey-question-type-${index}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RATING">Apreciación</SelectItem>
                        <SelectItem value="COMMENT">Comentario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`survey-question-${index}`}>Pregunta</Label>
                    <Input
                      className={`${controlClass} mt-1.5`}
                      id={`survey-question-${index}`}
                      maxLength={500}
                      onChange={(event) =>
                        patchQuestion(index, { prompt: event.target.value })
                      }
                      value={question.prompt}
                    />
                  </div>
                  <Button
                    aria-label={`Quitar pregunta ${index + 1}`}
                    disabled={draft.questions.length === 1}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        questions: current.questions.filter(
                          (_item, position) => position !== index,
                        ),
                      }))
                    }
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    checked={question.required}
                    onChange={(event) =>
                      patchQuestion(index, { required: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Respuesta obligatoria
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section
        aria-label="Vista previa de la encuesta"
        className="survey-live-preview"
      >
        <div className="survey-preview-heading">
          <div>
            <span className="survey-preview-eyebrow">Vista previa</span>
            <h3>Así verá la encuesta tu clienta</h3>
          </div>
          <span className="survey-preview-count">
            {draft.questions.length} preguntas
          </span>
        </div>
        <div className="survey-preview-paper">
          <div className="survey-preview-brand">Keysar Cosmetics</div>
          <h4>
            {draft.title.trim() || draft.name.trim() || "Nombre de la encuesta"}
          </h4>
          {draft.introduction.trim() ? <p>{draft.introduction}</p> : null}
          <div className="survey-preview-questions">
            {draft.questions.map((question, index) => (
              <article className="survey-preview-question" key={index}>
                <span className="survey-preview-question-number">
                  {index + 1}
                </span>
                <div className="survey-preview-question-content">
                  <p>{question.prompt.trim() || "Escribe la pregunta"}</p>
                  {question.type === "RATING" ? (
                    <div
                      aria-label="Cinco estrellas"
                      className="survey-preview-stars"
                    >
                      {Array.from({ length: 5 }, (_, star) => (
                        <Star className="h-5 w-5" key={star} />
                      ))}
                    </div>
                  ) : (
                    <div className="survey-preview-comment-lines">
                      <span />
                      <span />
                    </div>
                  )}
                  <small>
                    {question.required ? "Obligatoria" : "Opcional"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function RestoredSurveysSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.surveys", "ADMIN");
  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    {
      queryKey: "operational-catalog:engagement",
    },
  );
  const surveys = useSchedulerQuery(() => schedulerApi.surveys(), [], {
    queryKey: "surveys:restored",
  });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [draft, setDraft] = useState<SurveyDraft>(emptyDraft(null));
  const visible = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("es-MX");
    return (surveys.data ?? []).filter((survey) =>
      `${survey.name} ${survey.title}`
        .toLocaleLowerCase("es-MX")
        .includes(normalized),
    );
  }, [search, surveys.data]);

  async function save() {
    if (
      !draft.commerceId ||
      draft.name.trim().length < 2 ||
      draft.title.trim().length < 2 ||
      draft.questions.some((question) => question.prompt.trim().length < 2)
    ) {
      toast.error(
        "Completa el comercio, nombre, título y todas las preguntas.",
      );
      return;
    }
    setSaving(true);
    setConflict(null);
    const input = {
      commerceId: draft.commerceId,
      name: draft.name.trim(),
      status: draft.status,
      title: draft.title.trim(),
      introduction: draft.introduction.trim() || null,
      questions: draft.questions.map((question) => ({
        ...question,
        prompt: question.prompt.trim(),
      })),
      serviceProfileIds: draft.serviceProfileIds,
      ...(draft.expectedVersion
        ? { expectedVersion: draft.expectedVersion }
        : {}),
    };
    await runSchedulerMutation(
      () =>
        draft.id
          ? schedulerApi.updateSurvey(draft.id, input)
          : schedulerApi.createSurvey(input),
      {
        onSuccess: async () => {
          toast.success(
            draft.id
              ? "Nueva versión de encuesta guardada."
              : "Encuesta creada.",
          );
          invalidateSchedulerQueries("surveys", "reports:SURVEYS");
          await surveys.reload();
          setOpen(false);
        },
        onError: toast.error,
        onConflict: setConflict,
      },
    );
    setSaving(false);
  }

  return (
    <RestoredAdministrationFrame
      actions={
        <>
          <AdministrationRefreshButton
            loading={surveys.loading || catalog.loading}
            onClick={() => {
              void surveys.reload();
              void catalog.reload();
            }}
          />
          {canAdmin ? (
            <Button
              className="admin-primary"
              onClick={() => {
                setDraft(emptyDraft(catalog.data));
                setConflict(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva encuesta
            </Button>
          ) : null}
        </>
      }
      readOnly={!canAdmin}
      section="surveys"
    >
      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Buscar encuesta"
            className="h-10 rounded-xl border-[#e2d8cf] pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar encuesta"
            value={search}
          />
        </div>
        <span className="text-sm text-slate-500">
          {visible.length} encuestas
        </span>
      </div>
      <QueryBoundary
        empty={!visible.length}
        emptyDescription="Crea una encuesta post-servicio y agrega las preguntas que quieras medir."
        emptyTitle="Todavía no hay encuestas"
        error={surveys.error ?? catalog.error}
        loading={surveys.loading || catalog.loading}
        onRetry={() => {
          void surveys.reload();
          void catalog.reload();
        }}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((survey) => (
            <Card className="admin-card" key={survey.id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[#263649]">
                      {survey.name}
                    </h2>
                    <Badge variant="outline">
                      {schedulerSurveyStatusLabels[survey.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {survey.title}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    {survey.questions.length} preguntas ·{" "}
                    {survey.serviceProfileIds.length} servicios · v
                    {survey.currentVersion}
                  </p>
                </div>
                {canAdmin ? (
                  <Button
                    onClick={() => {
                      setDraft(editDraft(survey));
                      setConflict(null);
                      setOpen(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryBoundary>
      <AdministrationCoverageNotice title="Resultados inmutables">
        Las respuestas y los tokens no se muestran aquí ni pueden editarse. Sus
        métricas agregadas se restauran en RV7.
      </AdministrationCoverageNotice>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? `Editar ${draft.name}` : "Nueva encuesta"}
            </DialogTitle>
            <DialogDescription>
              Guardar una edición crea una versión y no reescribe respuestas.
            </DialogDescription>
          </DialogHeader>
          <ConflictNotice
            message={conflict}
            onReload={() => {
              setOpen(false);
              void surveys.reload();
            }}
          />
          {catalog.data ? (
            <SurveyEditor
              catalog={catalog.data}
              draft={draft}
              setDraft={setDraft}
            />
          ) : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="admin-primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Guardando…" : "Guardar versión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestoredAdministrationFrame>
  );
}
