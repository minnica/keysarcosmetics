"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  SCHEDULER_APPOINTMENT_STATUSES,
  type SchedulerAppointmentStatus,
  type SchedulerMessageChannel,
  type SchedulerWeekday,
} from "@cosmetics/types";
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
import { LockKeyhole, Plus, RefreshCw, Upload } from "lucide-react";
import { schedulerApi } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import { OperationalCatalogWorkspace } from "@/components/administration/OperationalCatalogWorkspace";
import {
  ConflictNotice,
  QueryBoundary,
  WorkspaceHeader,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

const operationalSections = ["locals", "professionals", "services", "resources"] as const;
type OperationalSection = (typeof operationalSections)[number];

function isOperationalSection(value: string): value is OperationalSection {
  return operationalSections.some((section) => section === value);
}

const titles: Record<string, string> = {
  commissions: "Comisiones",
  surveys: "Encuestas",
  consents: "Consentimientos",
  whatsapp: "Comunicaciones",
  "gift-cards": "Gift cards",
  "status-colors": "Colores de estado",
};

function AdministrationShell({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  const { canAccess } = useSchedulerSession();
  const screenId = `administration.${section}` as Parameters<typeof canAccess>[0];
  const canWrite = canAccess(screenId, "WRITE");
  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader
        eyebrow="Administración persistente"
        title={titles[section] ?? "Administración"}
        description="Los cambios se validan, versionan y auditan en el backend de Scheduler."
        actions={!canWrite ? <Badge variant="outline"><LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura</Badge> : undefined}
      />
      <div className="space-y-5 px-5 py-6 sm:px-7 lg:px-10">{children}</div>
    </div>
  );
}

function CommissionSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.commissions", "ADMIN");
  const catalog = useSchedulerQuery(() => schedulerApi.administrationCatalog(), []);
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const [amount, setAmount] = useState("0");
  const [conflict, setConflict] = useState<string | null>(null);
  const commerceId = operations.data?.commerces[0]?.id ?? "";

  async function createPolicy() {
    await runSchedulerMutation(
      () => schedulerApi.updateCommissionPolicy({
        commerceId,
        targetType: "DEFAULT",
        period: "MONTH",
        active: true,
        rules: [{ mode: "ATTENDED_APPOINTMENT", amount }],
      }),
      { onSuccess: async () => { toast.success("Política guardada."); await catalog.reload(); }, onError: toast.error, onConflict: setConflict },
    );
  }

  return <AdministrationShell section="commissions">
    <ConflictNotice message={conflict} onReload={() => { setConflict(null); void catalog.reload(); }} />
    {canWrite ? <Card><CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="commission-amount">Importe por cita atendida</Label><Input id="commission-amount" className="mt-1.5" min="0" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><Button disabled={!commerceId} onClick={() => void createPolicy()}><Plus className="mr-2 h-4 w-4" /> Agregar política</Button></CardContent></Card> : null}
    <QueryBoundary loading={catalog.loading || operations.loading} error={catalog.error ?? operations.error} empty={!catalog.data?.commissionPolicies.length} emptyTitle="Sin políticas" emptyDescription="No existen reglas de comisión versionadas." onRetry={() => { void catalog.reload(); void operations.reload(); }}>
      <div className="grid gap-3">{catalog.data?.commissionPolicies.map((policy) => <Card key={policy.id}><CardContent className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{policy.targetName}</p><p className="text-sm text-slate-500">{policy.period} · {policy.rules.map((rule) => `${rule.mode}: ${rule.amount ?? rule.percentage ?? "por niveles"}`).join(", ")}</p></div><Badge variant="outline">v{policy.currentVersion} · {policy.active ? "Activa" : "Inactiva"}</Badge></CardContent></Card>)}</div>
    </QueryBoundary>
  </AdministrationShell>;
}

function GiftCardsSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.gift-cards", "ADMIN");
  const catalog = useSchedulerQuery(() => schedulerApi.administrationCatalog(), []);
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState("0");
  const [conflict, setConflict] = useState<string | null>(null);
  const commerceId = operations.data?.commerces[0]?.id ?? "";

  async function create() {
    await runSchedulerMutation(
      () => schedulerApi.createGiftCard({ commerceId, name: name.trim(), type: "AMOUNT", amount: salePrice, salePrice, validityDays: 365, designKey: "keysar-default", status: "ACTIVE", serviceProfileIds: [] }),
      { onSuccess: async () => { setName(""); toast.success("Gift card creada."); await catalog.reload(); }, onError: toast.error, onConflict: setConflict },
    );
  }
  return <AdministrationShell section="gift-cards">
    <ConflictNotice message={conflict} onReload={() => { setConflict(null); void catalog.reload(); }} />
    {canWrite ? <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-[1fr_180px_auto] sm:items-end"><div><Label htmlFor="gift-name">Nombre</Label><Input id="gift-name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label htmlFor="gift-price">Importe</Label><Input id="gift-price" className="mt-1.5" min="0" step="0.01" type="number" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></div><Button disabled={!commerceId || name.trim().length < 2} onClick={() => void create()}><Plus className="mr-2 h-4 w-4" /> Crear</Button></CardContent></Card> : null}
    <QueryBoundary loading={catalog.loading || operations.loading} error={catalog.error ?? operations.error} empty={!catalog.data?.giftCards.length} emptyTitle="Sin plantillas" emptyDescription="No hay gift cards configuradas." onRetry={() => { void catalog.reload(); void operations.reload(); }}>
      <div className="grid gap-3 md:grid-cols-2">{catalog.data?.giftCards.map((card) => <Card key={card.id}><CardContent className="pt-5"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{card.name}</p><Badge variant="outline">{card.status}</Badge></div><p className="mt-2 text-sm text-slate-500">{card.type} · ${card.salePrice} · {card.validityDays} días</p><p className="mt-1 text-xs text-slate-400">v{card.version}</p></CardContent></Card>)}</div>
    </QueryBoundary>
  </AdministrationShell>;
}

function SurveysSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.surveys", "ADMIN");
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const surveys = useSchedulerQuery(() => schedulerApi.surveys(), []);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("¿Cómo calificarías tu visita?");
  const commerceId = operations.data?.commerces[0]?.id ?? "";
  async function create() {
    await runSchedulerMutation(
      () => schedulerApi.createSurvey({ commerceId, name: name.trim(), status: "DRAFT", title: name.trim(), questions: [{ type: "RATING", prompt: prompt.trim(), required: true }], serviceProfileIds: [] }),
      { onSuccess: async () => { setName(""); toast.success("Encuesta creada como borrador."); await surveys.reload(); }, onError: toast.error, onConflict: toast.error },
    );
  }
  return <AdministrationShell section="surveys">
    {canWrite ? <Card><CardContent className="grid gap-4 pt-6 md:grid-cols-2"><div><Label htmlFor="survey-name">Nombre</Label><Input id="survey-name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label htmlFor="survey-prompt">Pregunta inicial</Label><Input id="survey-prompt" className="mt-1.5" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></div><Button className="md:col-span-2 md:w-fit" disabled={!commerceId || name.trim().length < 2} onClick={() => void create()}><Plus className="mr-2 h-4 w-4" /> Crear encuesta</Button></CardContent></Card> : null}
    <QueryBoundary loading={surveys.loading || operations.loading} error={surveys.error ?? operations.error} empty={!surveys.data?.length} emptyTitle="Sin encuestas" emptyDescription="No hay encuestas persistentes." onRetry={() => { void surveys.reload(); void operations.reload(); }}><div className="grid gap-3 md:grid-cols-2">{surveys.data?.map((survey) => <Card key={survey.id}><CardContent className="pt-5"><div className="flex justify-between gap-3"><p className="font-semibold">{survey.name}</p><Badge variant="outline">{survey.status}</Badge></div><p className="mt-2 text-sm text-slate-500">{survey.questions.length} preguntas · v{survey.currentVersion}</p></CardContent></Card>)}</div></QueryBoundary>
  </AdministrationShell>;
}

function ConsentsSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.consents", "ADMIN");
  const templates = useSchedulerQuery(() => schedulerApi.consentTemplates(), []);
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const commerceId = operations.data?.commerces[0]?.id ?? "";
  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.set("commerceId", commerceId);
    form.set("name", name.trim());
    form.set("file", file);
    await runSchedulerMutation(() => schedulerApi.uploadConsentTemplate(form), { onSuccess: async () => { setName(""); setFile(null); toast.success("Consentimiento cargado."); await templates.reload(); }, onError: toast.error, onConflict: toast.error });
  }
  return <AdministrationShell section="consents">
    {canWrite ? <Card><CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_1fr_auto] md:items-end"><div><Label htmlFor="consent-name">Nombre</Label><Input id="consent-name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label htmlFor="consent-file">PDF privado (máx. 5 MB)</Label><Input id="consent-file" className="mt-1.5" accept="application/pdf" type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} /></div><Button disabled={!commerceId || !file || name.trim().length < 2} onClick={() => void upload()}><Upload className="mr-2 h-4 w-4" /> Cargar</Button></CardContent></Card> : null}
    <QueryBoundary loading={templates.loading || operations.loading} error={templates.error ?? operations.error} empty={!templates.data?.length} emptyTitle="Sin consentimientos" emptyDescription="No hay plantillas privadas registradas." onRetry={() => { void templates.reload(); void operations.reload(); }}><div className="grid gap-3">{templates.data?.map((template) => <Card key={template.id}><CardContent className="flex items-center justify-between gap-3 pt-5"><div><p className="font-semibold">{template.name}</p><p className="text-sm text-slate-500">{template.document?.fileName ?? "Sin documento"}</p></div><Badge variant="outline">v{template.currentVersion}</Badge></CardContent></Card>)}</div></QueryBoundary>
  </AdministrationShell>;
}

function CommunicationsSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.whatsapp", "ADMIN");
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const content = useSchedulerQuery(async () => { const [templates, outbox] = await Promise.all([schedulerApi.messageTemplates(), schedulerApi.messageOutbox()]); return { templates, outbox }; }, []);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<SchedulerMessageChannel>("WHATSAPP");
  const commerceId = operations.data?.commerces[0]?.id ?? "";
  async function create() {
    await runSchedulerMutation(() => schedulerApi.createMessageTemplate({ commerceId, name: name.trim(), channel, body: body.trim(), variables: [], active: true }), { onSuccess: async () => { setName(""); setBody(""); toast.success("Plantilla creada."); await content.reload(); }, onError: toast.error, onConflict: toast.error });
  }
  return <AdministrationShell section="whatsapp">
    {canWrite ? <Card><CardContent className="grid gap-4 pt-6 md:grid-cols-2"><div><Label htmlFor="message-name">Nombre</Label><Input id="message-name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label>Canal</Label><Select value={channel} onValueChange={(value) => setChannel(value as SchedulerMessageChannel)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WHATSAPP">WhatsApp</SelectItem><SelectItem value="EMAIL">Correo</SelectItem><SelectItem value="SMS">SMS</SelectItem></SelectContent></Select></div><div className="md:col-span-2"><Label htmlFor="message-body">Mensaje</Label><Textarea id="message-body" className="mt-1.5" value={body} onChange={(event) => setBody(event.target.value)} /></div><Button className="md:col-span-2 md:w-fit" disabled={!commerceId || name.trim().length < 2 || !body.trim()} onClick={() => void create()}><Plus className="mr-2 h-4 w-4" /> Crear plantilla</Button></CardContent></Card> : null}
    <QueryBoundary loading={content.loading || operations.loading} error={content.error ?? operations.error} onRetry={() => { void content.reload(); void operations.reload(); }}><div className="grid gap-5 lg:grid-cols-2"><Card><CardContent className="pt-5"><h2 className="font-semibold">Plantillas</h2><div className="mt-4 space-y-3">{content.data?.templates.length ? content.data.templates.map((template) => <div key={template.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><span className="font-medium">{template.name}</span><Badge variant="outline">{template.channel}</Badge></div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{template.body}</p></div>) : <p className="text-sm text-slate-500">Sin plantillas.</p>}</div></CardContent></Card><Card><CardContent className="pt-5"><h2 className="font-semibold">Outbox</h2><div className="mt-4 space-y-3">{content.data?.outbox.length ? content.data.outbox.map((message) => <div key={message.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><span className="font-medium">{message.channel}</span><Badge variant="outline">{message.status}</Badge></div><p className="mt-1 text-xs text-slate-500">{new Date(message.scheduledAt).toLocaleString("es-MX")} · {message.attempts} intentos</p>{canWrite && ["FAILED", "RETRY"].includes(message.status) ? <Button className="mt-2" size="sm" variant="outline" onClick={() => void runSchedulerMutation(() => schedulerApi.retryMessage(message.id), { onSuccess: content.reload, onError: toast.error, onConflict: toast.error })}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Reintentar</Button> : null}</div>) : <p className="text-sm text-slate-500">Sin mensajes.</p>}</div></CardContent></Card></div></QueryBoundary>
  </AdministrationShell>;
}

function StatusColorsSection() {
  const { canAccess } = useSchedulerSession();
  const canWrite = canAccess("administration.status-colors", "ADMIN");
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const catalog = useSchedulerQuery(() => schedulerApi.administrationCatalog(), []);
  const [commerceId, setCommerceId] = useState("");
  const [secret, setSecret] = useState("");
  const [changes, setChanges] = useState<Partial<Record<SchedulerAppointmentStatus, string>>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const selectedCommerceId = commerceId || operations.data?.commerces[0]?.id || "";
  const existing = useMemo(() => catalog.data?.statusColors.find((item) => item.commerceId === selectedCommerceId)?.colors ?? [], [catalog.data?.statusColors, selectedCommerceId]);
  async function save() {
    try {
      const authorization = await schedulerApi.createAuthorization({ secret, purpose: "STATUS_COLORS_CHANGE", screenKey: "scheduler/administration/status-colors", targetType: "SchedulerCommerce", targetId: selectedCommerceId });
      await runSchedulerMutation(() => schedulerApi.updateStatusColors(selectedCommerceId, { authorizationToken: authorization.token, expectedVersions: Object.fromEntries(existing.map((item) => [item.status, item.version])), colors: SCHEDULER_APPOINTMENT_STATUSES.map((status) => ({ status, color: changes[status] ?? existing.find((item) => item.status === status)?.color ?? "#94a3b8" })) }), { onSuccess: async () => { setSecret(""); setChanges({}); toast.success("Colores actualizados."); await catalog.reload(); }, onError: toast.error, onConflict: setConflict });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No fue posible autorizar el cambio.");
    }
  }
  return <AdministrationShell section="status-colors">
    <ConflictNotice message={conflict} onReload={() => { setConflict(null); setChanges({}); void catalog.reload(); }} />
    <Card><CardContent className="space-y-5 pt-6"><div><Label>Comercio</Label><Select value={selectedCommerceId} onValueChange={setCommerceId}><SelectTrigger className="mt-1.5 max-w-sm"><SelectValue /></SelectTrigger><SelectContent>{operations.data?.commerces.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{SCHEDULER_APPOINTMENT_STATUSES.map((status) => <label key={status} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm"><Input className="h-9 w-12 p-1" disabled={!canWrite} type="color" value={changes[status] ?? existing.find((item) => item.status === status)?.color ?? "#94a3b8"} onChange={(event) => setChanges((value) => ({ ...value, [status]: event.target.value }))} /><span>{status}</span></label>)}</div>{canWrite ? <div className="flex flex-col gap-3 sm:flex-row"><Input className="max-w-sm" placeholder="Código personal" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /><Button disabled={!secret || !selectedCommerceId} onClick={() => void save()}>Autorizar y guardar</Button></div> : null}</CardContent></Card>
  </AdministrationShell>;
}

function ServiceExtensionsPanel() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.services", "ADMIN");
  const catalog = useSchedulerQuery(() => schedulerApi.administrationCatalog(), []);
  const operations = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  const [conflict, setConflict] = useState<string | null>(null);
  const [classDraft, setClassDraft] = useState({ serviceProfileId: "", branchProfileId: "", professionalProfileId: "", weekday: "MONDAY", startMinute: "540", endMinute: "600", capacity: "1" });

  async function togglePackage(item: NonNullable<typeof catalog.data>["packages"][number]) {
    await runSchedulerMutation(() => schedulerApi.updatePackageProfile(item.posPackageId, {
      commerceId: item.commerceId,
      acceptsOnline: item.acceptsOnline,
      simultaneous: item.simultaneous,
      sessions: item.sessions,
      active: !item.active,
      expectedVersion: item.version,
      branchProfileIds: item.branchProfileIds,
      serviceLines: item.serviceLines.map((line) => ({ serviceProfileId: line.serviceProfileId, quantity: line.quantity, priceOverride: line.priceOverride, sortOrder: line.sortOrder })),
    }), { onSuccess: async () => { toast.success("Paquete actualizado."); await catalog.reload(); }, onError: toast.error, onConflict: setConflict });
  }

  async function toggleAddon(item: NonNullable<typeof catalog.data>["addons"][number]) {
    await runSchedulerMutation(() => schedulerApi.updateAddonProfile(item.catalogItemId, {
      commerceId: item.commerceId,
      durationMinutes: item.durationMinutes,
      active: !item.active,
      expectedVersion: item.version,
      serviceProfileIds: item.serviceProfileIds,
    }), { onSuccess: async () => { toast.success("Complemento actualizado."); await catalog.reload(); }, onError: toast.error, onConflict: setConflict });
  }

  async function addClassSchedule() {
    const current = catalog.data?.classSchedules.filter((item) => item.serviceProfileId === classDraft.serviceProfileId && item.active) ?? [];
    await runSchedulerMutation(() => schedulerApi.replaceClassSchedules(classDraft.serviceProfileId, {
      schedules: [...current.map((item) => ({ branchProfileId: item.branchProfileId, professionalProfileId: item.professionalProfileId, weekday: item.weekday, startMinute: item.startMinute, endMinute: item.endMinute, capacity: item.capacity })), {
        branchProfileId: classDraft.branchProfileId,
        professionalProfileId: classDraft.professionalProfileId,
        weekday: classDraft.weekday as SchedulerWeekday,
        startMinute: Number(classDraft.startMinute),
        endMinute: Number(classDraft.endMinute),
        capacity: Number(classDraft.capacity),
      }],
    }), { onSuccess: async () => { toast.success("Horario de clase agregado."); await catalog.reload(); }, onError: toast.error, onConflict: setConflict });
  }

  const classServices = operations.data?.services.filter((item) => item.mode === "CLASS" && item.active) ?? [];
  return (
    <section className="border-t border-[#e7ddd4] bg-[#f4f1ed] px-5 py-8 sm:px-7 lg:px-10">
      <div className="mb-5"><p className="label-caps">Extensiones comerciales</p><h2 className="mt-2 text-2xl font-semibold">Paquetes, complementos y clases</h2><p className="mt-1 text-sm text-slate-500">Configuración Scheduler sobre identidades canónicas del POS y del catálogo.</p></div>
      <ConflictNotice message={conflict} onReload={() => { setConflict(null); void catalog.reload(); }} />
      <QueryBoundary loading={catalog.loading || operations.loading} error={catalog.error ?? operations.error} onRetry={() => { void catalog.reload(); void operations.reload(); }}>
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <Card><CardContent className="pt-5"><h3 className="font-semibold">Paquetes</h3><div className="mt-4 space-y-3">{catalog.data?.packages.length ? catalog.data.packages.map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.sku} · {item.sessions} sesiones · v{item.version}</p></div><Badge variant="outline">{item.active ? "Activo" : "Inactivo"}</Badge></div>{canAdmin ? <Button className="mt-3" size="sm" variant="outline" onClick={() => void togglePackage(item)}>{item.active ? "Desactivar" : "Activar"}</Button> : null}</div>) : <p className="text-sm text-slate-500">Sin perfiles de paquetes.</p>}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><h3 className="font-semibold">Complementos</h3><div className="mt-4 space-y-3">{catalog.data?.addons.length ? catalog.data.addons.map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.durationMinutes} min · v{item.version}</p></div><Badge variant="outline">{item.active ? "Activo" : "Inactivo"}</Badge></div>{canAdmin ? <Button className="mt-3" size="sm" variant="outline" onClick={() => void toggleAddon(item)}>{item.active ? "Desactivar" : "Activar"}</Button> : null}</div>) : <p className="text-sm text-slate-500">Sin complementos.</p>}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><h3 className="font-semibold">Horarios de clase</h3><div className="mt-4 space-y-2">{catalog.data?.classSchedules.length ? catalog.data.classSchedules.map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><p className="font-medium">{item.weekday} · {String(Math.floor(item.startMinute / 60)).padStart(2, "0")}:{String(item.startMinute % 60).padStart(2, "0")}</p><p className="text-xs text-slate-500">Capacidad {item.capacity}</p></div>) : <p className="text-sm text-slate-500">Sin horarios.</p>}</div></CardContent></Card>
        </div>
        {canAdmin && classServices.length ? <Card className="mt-5"><CardContent className="grid gap-3 pt-5 md:grid-cols-3"><div><Label>Clase</Label><Select value={classDraft.serviceProfileId} onValueChange={(value) => setClassDraft((current) => ({ ...current, serviceProfileId: value }))}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{classServices.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Sucursal</Label><Select value={classDraft.branchProfileId} onValueChange={(value) => setClassDraft((current) => ({ ...current, branchProfileId: value }))}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{operations.data?.branches.filter((item) => item.active).map((item) => <SelectItem key={item.id} value={item.id}>{item.branchName}</SelectItem>)}</SelectContent></Select></div><div><Label>Profesional</Label><Select value={classDraft.professionalProfileId} onValueChange={(value) => setClassDraft((current) => ({ ...current, professionalProfileId: value }))}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{operations.data?.professionals.filter((item) => item.active).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Día</Label><Select value={classDraft.weekday} onValueChange={(value) => setClassDraft((current) => ({ ...current, weekday: value }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-2"><div><Label htmlFor="class-start">Inicio (min)</Label><Input id="class-start" className="mt-1.5" type="number" value={classDraft.startMinute} onChange={(event) => setClassDraft((current) => ({ ...current, startMinute: event.target.value }))} /></div><div><Label htmlFor="class-end">Fin (min)</Label><Input id="class-end" className="mt-1.5" type="number" value={classDraft.endMinute} onChange={(event) => setClassDraft((current) => ({ ...current, endMinute: event.target.value }))} /></div></div><div><Label htmlFor="class-capacity">Capacidad</Label><Input id="class-capacity" className="mt-1.5" min="1" type="number" value={classDraft.capacity} onChange={(event) => setClassDraft((current) => ({ ...current, capacity: event.target.value }))} /></div><Button className="md:col-span-3 md:w-fit" disabled={!classDraft.serviceProfileId || !classDraft.branchProfileId || !classDraft.professionalProfileId} onClick={() => void addClassSchedule()}><Plus className="mr-2 h-4 w-4" /> Agregar horario</Button></CardContent></Card> : null}
      </QueryBoundary>
    </section>
  );
}

export function ApiAdministrationWorkspace() {
  const section = useSearchParams().get("section") ?? "locals";
  if (isOperationalSection(section)) return <><OperationalCatalogWorkspace section={section} />{section === "services" ? <ServiceExtensionsPanel /> : null}</>;
  if (section === "commissions") return <CommissionSection />;
  if (section === "surveys") return <SurveysSection />;
  if (section === "consents") return <ConsentsSection />;
  if (section === "whatsapp") return <CommunicationsSection />;
  if (section === "gift-cards") return <GiftCardsSection />;
  if (section === "status-colors") return <StatusColorsSection />;
  return <AdministrationShell section={section}><p className="text-sm text-slate-500">Sección no disponible.</p></AdministrationShell>;
}
