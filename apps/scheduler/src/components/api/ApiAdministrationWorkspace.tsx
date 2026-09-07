"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Plus, RefreshCw, Upload } from "lucide-react";
import type { SchedulerMessageChannel } from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { schedulerApi } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import { OperationalCatalogWorkspace } from "@/components/administration/OperationalCatalogWorkspace";
import {
  RestoredCommissionsSection,
  RestoredGiftCardsSection,
  RestoredServiceExtensions,
  RestoredStatusColorsSection,
} from "@/components/administration/RestoredAdministrationSections";
import {
  QueryBoundary,
  WorkspaceHeader,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

const operationalSections = [
  "locals",
  "professionals",
  "services",
  "resources",
] as const;
type OperationalSection = (typeof operationalSections)[number];

function isOperationalSection(value: string): value is OperationalSection {
  return operationalSections.some((section) => section === value);
}

const deferredTitles: Record<string, string> = {
  surveys: "Encuestas",
  consents: "Consentimientos",
  whatsapp: "Comunicaciones",
};

function DeferredAdministrationShell({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess(
    `administration.${section}` as Parameters<typeof canAccess>[0],
    "WRITE",
  );
  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader
        eyebrow="Administración persistente"
        title={deferredTitles[section] ?? "Administración"}
        description="Esta sección conserva por ahora la integración segura; su presentación se restaura en RV6."
        actions={
          !canWrite ? (
            <Badge variant="outline">
              <LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura
            </Badge>
          ) : undefined
        }
      />
      <div className="space-y-5 px-5 py-6 sm:px-7 lg:px-10">{children}</div>
    </div>
  );
}

function SurveysSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.surveys", "ADMIN");
  const operations = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "operational-catalog" },
  );
  const surveys = useSchedulerQuery(() => schedulerApi.surveys(), [], {
    queryKey: "surveys",
  });
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("¿Cómo calificarías tu visita?");
  const commerceId = operations.data?.commerces[0]?.id ?? "";

  async function create() {
    await runSchedulerMutation(
      () =>
        schedulerApi.createSurvey({
          commerceId,
          name: name.trim(),
          status: "DRAFT",
          title: name.trim(),
          questions: [
            { type: "RATING", prompt: prompt.trim(), required: true },
          ],
          serviceProfileIds: [],
        }),
      {
        onSuccess: async () => {
          setName("");
          toast.success("Encuesta creada como borrador.");
          await surveys.reload();
        },
        onError: toast.error,
        onConflict: toast.error,
      },
    );
  }

  return (
    <DeferredAdministrationShell section="surveys">
      {canWrite ? (
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <div>
              <Label htmlFor="survey-name">Nombre</Label>
              <Input
                id="survey-name"
                className="mt-1.5"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="survey-prompt">Pregunta inicial</Label>
              <Input
                id="survey-prompt"
                className="mt-1.5"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
            <Button
              className="md:col-span-2 md:w-fit"
              disabled={!commerceId || name.trim().length < 2}
              onClick={() => void create()}
            >
              <Plus className="mr-2 h-4 w-4" /> Crear encuesta
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <QueryBoundary
        loading={surveys.loading || operations.loading}
        error={surveys.error ?? operations.error}
        empty={!surveys.data?.length}
        emptyTitle="Sin encuestas"
        emptyDescription="No hay encuestas persistentes."
        onRetry={() => {
          void surveys.reload();
          void operations.reload();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {surveys.data?.map((survey) => (
            <Card key={survey.id}>
              <CardContent className="pt-5">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{survey.name}</p>
                  <Badge variant="outline">{survey.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {survey.questions.length} preguntas · v{survey.currentVersion}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryBoundary>
    </DeferredAdministrationShell>
  );
}

function ConsentsSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.consents", "ADMIN");
  const templates = useSchedulerQuery(
    () => schedulerApi.consentTemplates(),
    [],
    { queryKey: "consents" },
  );
  const operations = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "operational-catalog" },
  );
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const commerceId = operations.data?.commerces[0]?.id ?? "";

  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.set("commerceId", commerceId);
    form.set("name", name.trim());
    form.set("file", file);
    await runSchedulerMutation(() => schedulerApi.uploadConsentTemplate(form), {
      onSuccess: async () => {
        setName("");
        setFile(null);
        toast.success("Consentimiento cargado.");
        await templates.reload();
      },
      onError: toast.error,
      onConflict: toast.error,
    });
  }

  return (
    <DeferredAdministrationShell section="consents">
      {canWrite ? (
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <Label htmlFor="consent-name">Nombre</Label>
              <Input
                id="consent-name"
                className="mt-1.5"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="consent-file">PDF privado (máx. 5 MB)</Label>
              <Input
                id="consent-file"
                className="mt-1.5"
                accept="application/pdf"
                type="file"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFile(event.target.files?.[0] ?? null)
                }
              />
            </div>
            <Button
              disabled={!commerceId || !file || name.trim().length < 2}
              onClick={() => void upload()}
            >
              <Upload className="mr-2 h-4 w-4" /> Cargar
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <QueryBoundary
        loading={templates.loading || operations.loading}
        error={templates.error ?? operations.error}
        empty={!templates.data?.length}
        emptyTitle="Sin consentimientos"
        emptyDescription="No hay plantillas privadas registradas."
        onRetry={() => {
          void templates.reload();
          void operations.reload();
        }}
      >
        <div className="grid gap-3">
          {templates.data?.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <p className="font-semibold">{template.name}</p>
                  <p className="text-sm text-slate-500">
                    {template.document?.fileName ?? "Sin documento"}
                  </p>
                </div>
                <Badge variant="outline">v{template.currentVersion}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryBoundary>
    </DeferredAdministrationShell>
  );
}

function CommunicationsSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.whatsapp", "ADMIN");
  const operations = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "operational-catalog" },
  );
  const content = useSchedulerQuery(
    async () => {
      const [templates, outbox] = await Promise.all([
        schedulerApi.messageTemplates(),
        schedulerApi.messageOutbox(),
      ]);
      return { templates, outbox };
    },
    [],
    { queryKey: "communications" },
  );
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<SchedulerMessageChannel>("WHATSAPP");
  const commerceId = operations.data?.commerces[0]?.id ?? "";

  async function create() {
    await runSchedulerMutation(
      () =>
        schedulerApi.createMessageTemplate({
          commerceId,
          name: name.trim(),
          channel,
          body: body.trim(),
          variables: [],
          active: true,
        }),
      {
        onSuccess: async () => {
          setName("");
          setBody("");
          toast.success("Plantilla creada.");
          await content.reload();
        },
        onError: toast.error,
        onConflict: toast.error,
      },
    );
  }

  return (
    <DeferredAdministrationShell section="whatsapp">
      {canWrite ? (
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <div>
              <Label htmlFor="message-name">Nombre</Label>
              <Input
                id="message-name"
                className="mt-1.5"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <Label>Canal</Label>
              <Select
                value={channel}
                onValueChange={(value) =>
                  setChannel(value as SchedulerMessageChannel)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">Correo</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="message-body">Mensaje</Label>
              <Textarea
                id="message-body"
                className="mt-1.5"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <Button
              className="md:col-span-2 md:w-fit"
              disabled={!commerceId || name.trim().length < 2 || !body.trim()}
              onClick={() => void create()}
            >
              <Plus className="mr-2 h-4 w-4" /> Crear plantilla
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <QueryBoundary
        loading={content.loading || operations.loading}
        error={content.error ?? operations.error}
        onRetry={() => {
          void content.reload();
          void operations.reload();
        }}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <h2 className="font-semibold">Plantillas</h2>
              <div className="mt-4 space-y-3">
                {content.data?.templates.length ? (
                  content.data.templates.map((template) => (
                    <div key={template.id} className="rounded-xl border p-3">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="outline">{template.channel}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {template.body}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin plantillas.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <h2 className="font-semibold">Outbox</h2>
              <div className="mt-4 space-y-3">
                {content.data?.outbox.length ? (
                  content.data.outbox.map((message) => (
                    <div key={message.id} className="rounded-xl border p-3">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{message.channel}</span>
                        <Badge variant="outline">{message.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(message.scheduledAt).toLocaleString("es-MX")}{" "}
                        · {message.attempts} intentos
                      </p>
                      {canWrite &&
                      ["FAILED", "RETRY"].includes(message.status) ? (
                        <Button
                          className="mt-2"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void runSchedulerMutation(
                              () => schedulerApi.retryMessage(message.id),
                              {
                                onSuccess: content.reload,
                                onError: toast.error,
                                onConflict: toast.error,
                              },
                            )
                          }
                        >
                          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reintentar
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin mensajes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </QueryBoundary>
    </DeferredAdministrationShell>
  );
}

export function ApiAdministrationWorkspace() {
  const section = useSearchParams().get("section") ?? "locals";
  if (isOperationalSection(section)) {
    return (
      <>
        <OperationalCatalogWorkspace section={section} />
        {section === "services" ? <RestoredServiceExtensions /> : null}
      </>
    );
  }
  if (section === "commissions") return <RestoredCommissionsSection />;
  if (section === "surveys") return <SurveysSection />;
  if (section === "consents") return <ConsentsSection />;
  if (section === "whatsapp") return <CommunicationsSection />;
  if (section === "gift-cards") return <RestoredGiftCardsSection />;
  if (section === "status-colors") return <RestoredStatusColorsSection />;
  return (
    <DeferredAdministrationShell section={section}>
      <p className="text-sm text-slate-500">Sección no disponible.</p>
    </DeferredAdministrationShell>
  );
}
