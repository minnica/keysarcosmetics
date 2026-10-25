"use client";

import { useMemo, useState } from "react";
import type {
  SchedulerMessageChannel,
  SchedulerMessageOutboxDto,
  SchedulerMessageTemplateDto,
  SchedulerNotificationAction,
  SchedulerNotificationEvent,
  SchedulerNotificationRuleDto,
  SchedulerNotificationRuleWriteDto,
  SchedulerOperationalCatalogDto,
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
import {
  Check,
  BellRing,
  CalendarCheck2,
  Clock3,
  Gauge,
  Link2,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { schedulerApi } from "@/lib/api";
import {
  extractSchedulerMessageVariables,
  formatSchedulerMessagePreview,
  schedulerMessageChannelLabels,
  schedulerNotificationActionLabels,
  schedulerNotificationEventLabels,
  schedulerOutboxStatusMeta,
  schedulerTemplateWriteInput,
} from "@/lib/scheduler-engagement-presentation";
import { useSchedulerSession } from "@/lib/session";
import { SchedulerProtectedPhone } from "@/components/scheduler/SchedulerProtectedPhone";
import { SchedulerPagination } from "@/components/shared/SchedulerPagination";
import {
  paginateSchedulerReportRows,
  type SchedulerReportPageSize,
} from "@/lib/scheduler-report-presentation";
import {
  ConflictNotice,
  QueryBoundary,
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

const messageVariableOptions = [
  "cliente.nombre",
  "cliente.apellido",
  "cita.fecha",
  "cita.hora",
  "servicio.nombre",
  "profesional.nombre",
  "sucursal.nombre",
  "sucursal.telefono",
] as const;

const messagePreviewValues: Record<string, string> = {
  "cliente.nombre": "María",
  "cliente.apellido": "López",
  "cita.fecha": "11/09/2026",
  "cita.hora": "09:00",
  "servicio.nombre": "Facial Signature",
  "profesional.nombre": "Andrea",
  "sucursal.nombre": "Keysar Polanco",
  "sucursal.telefono": "+52 55 0000 0000",
};

interface TemplateDraft {
  id: string;
  commerceId: string;
  name: string;
  channel: SchedulerMessageChannel;
  active: boolean;
  subject: string;
  body: string;
  expectedVersion?: number;
}

type NotificationView = "rules" | "outbox" | "templates";

interface NotificationRuleDraft
  extends Omit<
    SchedulerNotificationRuleWriteDto,
    "branchId" | "professionalId" | "active"
  > {
  id: string;
  branchId: string | null;
  professionalId: string | null;
  active: boolean;
}

const notificationEvents = Object.keys(
  schedulerNotificationEventLabels,
) as SchedulerNotificationEvent[];

const notificationActions = Object.keys(
  schedulerNotificationActionLabels,
) as SchedulerNotificationAction[];

const notificationChannels: SchedulerMessageChannel[] = [
  "WHATSAPP",
  "EMAIL",
  "SMS",
  "IN_APP",
];

function emptyRuleDraft(
  catalog: SchedulerOperationalCatalogDto | null,
  templates: SchedulerMessageTemplateDto[],
): NotificationRuleDraft {
  return {
    id: "",
    commerceId: commerceOptions(catalog)[0]?.id ?? "",
    name: "",
    event: "APPOINTMENT_CREATED",
    scope: "COMPANY",
    branchId: null,
    professionalId: null,
    templateId: templates.find((template) => template.active)?.id ?? "",
    channels: ["WHATSAPP"],
    timingMinutes: -1440,
    allowedActions: ["CONFIRM", "CANCEL", "RESCHEDULE"],
    active: true,
  };
}

function editRuleDraft(
  rule: SchedulerNotificationRuleDto,
): NotificationRuleDraft {
  return {
    id: rule.id,
    commerceId: rule.commerceId,
    name: rule.name,
    event: rule.event,
    scope: rule.scope,
    branchId: rule.branchId,
    professionalId: rule.professionalId,
    templateId: rule.templateId,
    channels: [...rule.channels],
    timingMinutes: rule.timingMinutes,
    allowedActions: [...rule.allowedActions],
    active: rule.active,
    expectedVersion: rule.version,
  };
}

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function notificationScopeLabel(
  rule: SchedulerNotificationRuleDto,
  catalog: SchedulerOperationalCatalogDto | null,
): string {
  if (rule.scope === "COMPANY") return "Toda la empresa";
  if (rule.scope === "BRANCH")
    return (
      catalog?.branches.find((branch) => branch.branchId === rule.branchId)
        ?.branchName ?? "Sucursal"
    );
  return (
    catalog?.professionals.find(
      (professional) => professional.id === rule.professionalId,
    )?.name ?? "Especialista"
  );
}

function notificationTimingLabel(minutes: number): string {
  if (minutes === 0) return "Al ocurrir el evento";
  const value = Math.abs(minutes);
  const amount = value % 1440 === 0 ? value / 1440 : value / 60;
  const unit = value % 1440 === 0 ? "día" : "hora";
  return `${amount} ${unit}${amount === 1 ? "" : "s"} ${minutes < 0 ? "antes" : "después"}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function commerceOptions(catalog: SchedulerOperationalCatalogDto | null) {
  if (!catalog) return [];
  const available = new Set(
    catalog.branches.map((branch) => branch.commerceId),
  );
  return catalog.commerces.filter((commerce) => available.has(commerce.id));
}

function newKey(): string {
  return globalThis.crypto.randomUUID();
}

function emptyDraft(
  catalog: SchedulerOperationalCatalogDto | null,
): TemplateDraft {
  return {
    id: "",
    commerceId: commerceOptions(catalog)[0]?.id ?? "",
    name: "",
    channel: "WHATSAPP",
    active: true,
    subject: "",
    body: "",
  };
}

function editDraft(template: SchedulerMessageTemplateDto): TemplateDraft {
  const input = schedulerTemplateWriteInput(template);
  return {
    id: template.id,
    commerceId: input.commerceId,
    name: input.name,
    channel: input.channel,
    active: input.active,
    subject: input.subject ?? "",
    body: input.body,
    expectedVersion: input.expectedVersion,
  };
}

function TemplateEditor({
  draft,
  setDraft,
}: {
  draft: TemplateDraft;
  setDraft: React.Dispatch<React.SetStateAction<TemplateDraft>>;
}) {
  const variables = extractSchedulerMessageVariables(draft.body);
  return (
    <div className="whatsapp-dialog-form">
      <section className="whatsapp-form-section space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="template-name">Nombre</Label>
            <Input
              className={`${controlClass} mt-1.5`}
              id="template-name"
              maxLength={160}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              value={draft.name}
            />
          </div>
          <div>
            <Label htmlFor="template-channel">Canal</Label>
            <Select
              onValueChange={(channel) =>
                setDraft((current) => ({
                  ...current,
                  channel: channel as SchedulerMessageChannel,
                }))
              }
              value={draft.channel}
            >
              <SelectTrigger
                className={`${controlClass} mt-1.5`}
                id="template-channel"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(schedulerMessageChannelLabels).map(
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
        {draft.channel === "EMAIL" ? (
          <div>
            <Label htmlFor="template-subject">Asunto</Label>
            <Input
              className={`${controlClass} mt-1.5`}
              id="template-subject"
              maxLength={240}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
              value={draft.subject}
            />
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            checked={draft.active}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                active: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Plantilla activa
        </label>
      </section>
      <section className="whatsapp-form-section">
        <p className="admin-label">Variables autorizadas</p>
        <p className="mt-1 text-xs text-slate-500">
          Al encolar se exige un valor para cada marcador.
        </p>
        <div className="whatsapp-token-list mt-3">
          {messageVariableOptions.map((variable) => (
            <button
              className="whatsapp-token-button"
              key={variable}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  body: `${current.body}${current.body ? " " : ""}{{${variable}}}`,
                }))
              }
              type="button"
            >
              {variable}
            </button>
          ))}
        </div>
        <div className="whatsapp-composer-grid mt-4">
          <Textarea
            className="admin-textarea whatsapp-message-textarea"
            maxLength={20000}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                body: event.target.value,
              }))
            }
            placeholder="Escribe el mensaje"
            rows={10}
            value={draft.body}
          />
          <div className="whatsapp-preview-panel">
            <p className="whatsapp-preview-title">Previsualización</p>
            <div className="whatsapp-phone-preview">
              <div className="whatsapp-phone-notch" />
              <div className="whatsapp-phone-header">
                <MessageCircle className="h-4 w-4" />
                <span>Keysar Cosmetics</span>
                <span className="ml-auto text-[10px] opacity-75">
                  vista previa
                </span>
              </div>
              <div className="whatsapp-phone-body">
                <div className="whatsapp-message-bubble">
                  {draft.body
                    ? formatSchedulerMessagePreview(
                        draft.body,
                        messagePreviewValues,
                      )
                    : "Tu mensaje aparecerá aquí."}
                  <span className="whatsapp-message-time">09:00</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {variables.length
                ? `${variables.length} variables detectadas`
                : "Sin variables"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageStatusBadge({
  status,
}: {
  status: SchedulerMessageOutboxDto["status"];
}) {
  const meta = schedulerOutboxStatusMeta[status];
  const className =
    meta.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : meta.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : meta.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "bg-white";
  return (
    <Badge className={className} title={meta.detail} variant="outline">
      {meta.label}
    </Badge>
  );
}

function NotificationRuleEditor({
  catalog,
  draft,
  setDraft,
  templates,
}: {
  catalog: SchedulerOperationalCatalogDto;
  draft: NotificationRuleDraft;
  setDraft: React.Dispatch<React.SetStateAction<NotificationRuleDraft>>;
  templates: SchedulerMessageTemplateDto[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="notification-rule-name">Nombre de la regla</Label>
          <Input
            className={`${controlClass} mt-1.5`}
            id="notification-rule-name"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            value={draft.name}
          />
        </div>
        <div>
          <Label htmlFor="notification-rule-event">Evento</Label>
          <Select
            onValueChange={(event) =>
              setDraft((current) => ({
                ...current,
                event: event as SchedulerNotificationEvent,
              }))
            }
            value={draft.event}
          >
            <SelectTrigger
              className={`${controlClass} mt-1.5`}
              id="notification-rule-event"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {notificationEvents.map((event) => (
                <SelectItem key={event} value={event}>
                  {schedulerNotificationEventLabels[event]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="notification-rule-scope">Alcance</Label>
          <Select
            onValueChange={(scope) =>
              setDraft((current) => ({
                ...current,
                scope: scope as NotificationRuleDraft["scope"],
                branchId: null,
                professionalId: null,
              }))
            }
            value={draft.scope}
          >
            <SelectTrigger
              className={`${controlClass} mt-1.5`}
              id="notification-rule-scope"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPANY">Toda la empresa</SelectItem>
              <SelectItem value="BRANCH">Una sucursal</SelectItem>
              <SelectItem value="PROFESSIONAL">Una especialista</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {draft.scope === "BRANCH" ? (
          <div>
            <Label htmlFor="notification-rule-branch">Sucursal</Label>
            <Select
              onValueChange={(branchId) =>
                setDraft((current) => ({ ...current, branchId }))
              }
              value={draft.branchId ?? ""}
            >
              <SelectTrigger
                className={`${controlClass} mt-1.5`}
                id="notification-rule-branch"
              >
                <SelectValue placeholder="Selecciona sucursal" />
              </SelectTrigger>
              <SelectContent>
                {catalog.branches.map((branch) => (
                  <SelectItem key={branch.branchId} value={branch.branchId}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {draft.scope === "PROFESSIONAL" ? (
          <div>
            <Label htmlFor="notification-rule-professional">
              Especialista
            </Label>
            <Select
              onValueChange={(professionalId) =>
                setDraft((current) => ({ ...current, professionalId }))
              }
              value={draft.professionalId ?? ""}
            >
              <SelectTrigger
                className={`${controlClass} mt-1.5`}
                id="notification-rule-professional"
              >
                <SelectValue placeholder="Selecciona especialista" />
              </SelectTrigger>
              <SelectContent>
                {catalog.professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="notification-rule-template">Plantilla</Label>
          <Select
            onValueChange={(templateId) =>
              setDraft((current) => ({ ...current, templateId }))
            }
            value={draft.templateId}
          >
            <SelectTrigger
              className={`${controlClass} mt-1.5`}
              id="notification-rule-template"
            >
              <SelectValue placeholder="Selecciona plantilla" />
            </SelectTrigger>
            <SelectContent>
              {templates
                .filter((template) => template.active)
                .map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="notification-rule-timing">Momento</Label>
          <Select
            onValueChange={(timingMinutes) =>
              setDraft((current) => ({
                ...current,
                timingMinutes: Number(timingMinutes),
              }))
            }
            value={String(draft.timingMinutes)}
          >
            <SelectTrigger
              className={`${controlClass} mt-1.5`}
              id="notification-rule-timing"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-2880">48 horas antes</SelectItem>
              <SelectItem value="-1440">24 horas antes</SelectItem>
              <SelectItem value="-120">2 horas antes</SelectItem>
              <SelectItem value="0">Al ocurrir el evento</SelectItem>
              <SelectItem value="60">1 hora después</SelectItem>
              <SelectItem value="1440">1 día después</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Canales</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {notificationChannels.map((channel) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#ded5cc] bg-white px-3 py-2 text-sm"
              key={channel}
            >
              <input
                checked={draft.channels.includes(channel)}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    channels: toggleValue(current.channels, channel),
                  }))
                }
                type="checkbox"
              />
              {schedulerMessageChannelLabels[channel]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">
          Acciones seguras disponibles para la clienta
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {notificationActions.map((action) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#ded5cc] bg-white px-3 py-2 text-sm"
              key={action}
            >
              <input
                checked={draft.allowedActions.includes(action)}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    allowedActions: toggleValue(
                      current.allowedActions,
                      action,
                    ),
                  }))
                }
                type="checkbox"
              />
              {schedulerNotificationActionLabels[action]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          checked={draft.active}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              active: event.target.checked,
            }))
          }
          type="checkbox"
        />
        Regla activa
      </label>
    </div>
  );
}

function CustomerCommunicationDialog({
  open,
  onOpenChange,
  catalog,
  templates,
  onQueued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: SchedulerOperationalCatalogDto;
  templates: SchedulerMessageTemplateDto[];
  onQueued: () => Promise<void>;
}) {
  const { canAccess } = useSchedulerSession();
  const canViewCustomerPhone = canAccess("clients", "EXCEPTION");
  const firstBranch = catalog.branches.find((branch) => branch.active);
  const [branchId, setBranchId] = useState(firstBranch?.branchId ?? "");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [source, setSource] = useState("");
  const [sending, setSending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] =
    useState<SchedulerReportPageSize>(20);
  const customerQueryPageSize =
    customerPageSize === "ALL" ? 5000 : customerPageSize;
  const customers = useSchedulerQuery(
    () =>
      schedulerApi.searchCustomers({
        query: submittedQuery,
        branchId,
        page: customerPage,
        pageSize: customerQueryPageSize,
      }),
    [submittedQuery, branchId, customerPage, customerQueryPageSize],
    {
      queryKey: "communications:customer-search",
      branchId,
      enabled: open && submittedQuery.length >= 2 && Boolean(branchId),
    },
  );
  const channels = useSchedulerQuery(
    () => schedulerApi.contactChannels(customerId),
    [customerId],
    {
      queryKey: "communications:contact-channels",
      enabled: open && Boolean(customerId),
    },
  );
  const selectedTemplate = templates.find(
    (template) => template.id === templateId,
  );
  const selectedChannel = channels.data?.find(
    (channel) => channel.channel === selectedTemplate?.channel,
  );
  const branchCommerceId = catalog.branches.find(
    (branch) => branch.branchId === branchId,
  )?.commerceId;
  const scopedTemplates = templates.filter(
    (template) => template.active && template.commerceId === branchCommerceId,
  );
  const customerTotal = customers.data?.total ?? 0;
  const customerTotalPages =
    customerPageSize === "ALL"
      ? 1
      : Math.max(1, Math.ceil(customerTotal / customerPageSize));
  const customerFrom =
    customerTotal === 0 || customerPageSize === "ALL"
      ? customerTotal === 0
        ? 0
        : 1
      : (customerPage - 1) * customerPageSize + 1;
  const customerTo =
    customerTotal === 0
      ? 0
      : customerPageSize === "ALL"
        ? customerTotal
        : Math.min(customerPage * customerPageSize, customerTotal);

  function changeIntent(change: () => void) {
    change();
    setIdempotencyKey(newKey());
  }

  async function setConsent(status: "OPTED_IN" | "OPTED_OUT") {
    if (!customerId || !selectedTemplate) return;
    if (status === "OPTED_IN" && source.trim().length < 2) {
      toast.error("Registra la fuente del consentimiento.");
      return;
    }
    await runSchedulerMutation(
      () =>
        schedulerApi.updateContactChannel(customerId, {
          channel: selectedTemplate.channel,
          status,
          source: status === "OPTED_IN" ? source.trim() : "Interfaz Scheduler",
          ...(selectedChannel?.version
            ? { expectedVersion: selectedChannel.version }
            : {}),
        }),
      {
        onSuccess: async () => {
          toast.success(
            status === "OPTED_IN"
              ? "Consentimiento de contacto registrado."
              : "Canal marcado como no autorizado.",
          );
          await channels.reload();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: ["communications"],
      },
    );
  }

  async function enqueue() {
    if (!selectedTemplate || !customerId || !branchId || !scheduledAt) return;
    setSending(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.enqueueMessage(
          {
            templateId: selectedTemplate.id,
            customerId,
            branchId,
            scheduledAt: new Date(scheduledAt).toISOString(),
            variables,
          },
          idempotencyKey,
        ),
      {
        onSuccess: async () => {
          toast.success(
            "Mensaje registrado en el outbox; la entrega aún no está confirmada.",
          );
          await onQueued();
          setIdempotencyKey(newKey());
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: ["communications", "reports:COMMUNICATIONS"],
      },
    );
    setSending(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Preparar comunicación</DialogTitle>
          <DialogDescription>
            Busca una identidad canónica, valida su consentimiento y registra
            una intención idempotente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-[#e7ddd4] bg-[#faf8f6] p-4">
            <div>
              <Label htmlFor="message-branch">Sucursal</Label>
              <Select
                onValueChange={(value) =>
                  changeIntent(() => {
                    setBranchId(value);
                    setCustomerId("");
                    setTemplateId("");
                    setCustomerPage(1);
                  })
                }
                value={branchId}
              >
                <SelectTrigger
                  className={`${controlClass} mt-1.5`}
                  id="message-branch"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.branches
                    .filter((branch) => branch.active)
                    .map((branch) => (
                      <SelectItem key={branch.branchId} value={branch.branchId}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim().length >= 2) {
                  setCustomerPage(1);
                  setSubmittedQuery(query.trim());
                }
              }}
            >
              <Label htmlFor="message-customer">Buscar clienta</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  className={controlClass}
                  id="message-customer"
                  onChange={(event) => setQuery(event.target.value)}
                  value={query}
                />
                <Button
                  aria-label="Buscar clienta"
                  type="submit"
                  variant="outline"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
            {customers.data?.items.map((customer) => (
              <button
                className={`w-full rounded-xl border p-3 text-left ${customerId === customer.id ? "border-[#ad8b67] bg-[#f5ede4]" : "border-[#e7ddd4] bg-white"}`}
                key={customer.id}
                onClick={() => changeIntent(() => setCustomerId(customer.id))}
                type="button"
              >
                <span className="block font-medium">
                  {customer.displayName}
                </span>
                <span className="text-xs text-slate-500">
                  <SchedulerProtectedPhone
                    canView={canViewCustomerPhone}
                    fallback={customer.email ?? "Sin contacto"}
                    phone={customer.phone}
                  />
                </span>
              </button>
            ))}
            {customers.data?.items.length ? (
              <SchedulerPagination
                from={customerFrom}
                label="clientes"
                onPageChange={setCustomerPage}
                onPageSizeChange={setCustomerPageSize}
                page={Math.min(customerPage, customerTotalPages)}
                pageSize={customerPageSize}
                to={customerTo}
                total={customerTotal}
                totalPages={customerTotalPages}
              />
            ) : null}
            <div>
              <Label htmlFor="message-template">Plantilla activa</Label>
              <Select
                onValueChange={(value) =>
                  changeIntent(() => {
                    setTemplateId(value);
                    const template = scopedTemplates.find(
                      (item) => item.id === value,
                    );
                    setVariables(
                      Object.fromEntries(
                        (template?.variables ?? []).map((variable) => [
                          variable,
                          "",
                        ]),
                      ),
                    );
                  })
                }
                value={templateId}
              >
                <SelectTrigger
                  className={`${controlClass} mt-1.5`}
                  id="message-template"
                >
                  <SelectValue placeholder="Selecciona plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {scopedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ·{" "}
                      {schedulerMessageChannelLabels[template.channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
          <section className="space-y-4">
            {selectedTemplate && customerId ? (
              <>
                <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Preferencia de contacto</p>
                    <Badge variant="outline">
                      {selectedChannel?.status ?? "UNVERIFIED"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedChannel?.available
                      ? "El destino canónico está disponible."
                      : "La clienta no tiene un destino disponible para este canal."}
                  </p>
                  <div className="mt-3">
                    <Label htmlFor="contact-source">
                      Fuente del consentimiento
                    </Label>
                    <Input
                      className={`${controlClass} mt-1.5`}
                      id="contact-source"
                      onChange={(event) => setSource(event.target.value)}
                      placeholder="Ej. Confirmación presencial"
                      value={source}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      disabled={!selectedChannel?.available}
                      onClick={() => void setConsent("OPTED_IN")}
                      size="sm"
                    >
                      <Check className="mr-2 h-4 w-4" /> Autorizar canal
                    </Button>
                    <Button
                      onClick={() => void setConsent("OPTED_OUT")}
                      size="sm"
                      variant="outline"
                    >
                      Registrar rechazo
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="message-scheduled">Programar para</Label>
                  <Input
                    className={`${controlClass} mt-1.5`}
                    id="message-scheduled"
                    onChange={(event) =>
                      changeIntent(() => setScheduledAt(event.target.value))
                    }
                    type="datetime-local"
                    value={scheduledAt}
                  />
                </div>
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable}>
                    <Label htmlFor={`message-variable-${variable}`}>
                      {variable}
                    </Label>
                    <Input
                      className={`${controlClass} mt-1.5`}
                      id={`message-variable-${variable}`}
                      onChange={(event) =>
                        changeIntent(() =>
                          setVariables((current) => ({
                            ...current,
                            [variable]: event.target.value,
                          })),
                        )
                      }
                      value={variables[variable] ?? ""}
                    />
                  </div>
                ))}
                <div className="whatsapp-preview-panel">
                  <p className="whatsapp-preview-title">Vista previa</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {formatSchedulerMessagePreview(
                      selectedTemplate.body,
                      variables,
                    )}
                  </p>
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">
                Selecciona una clienta y una plantilla para validar el canal.
              </p>
            )}
          </section>
        </div>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cerrar
          </Button>
          <Button
            className="admin-primary"
            disabled={
              sending ||
              !selectedTemplate ||
              !customerId ||
              !scheduledAt ||
              !selectedChannel?.available ||
              selectedChannel.status !== "OPTED_IN" ||
              selectedTemplate.variables.some(
                (variable) => !variables[variable]?.trim(),
              )
            }
            onClick={() => void enqueue()}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Encolando…" : "Encolar mensaje"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestoredCommunicationsSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.whatsapp", "ADMIN");
  const canWrite = canAccess("administration.whatsapp", "WRITE");
  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    {
      queryKey: "operational-catalog:engagement",
    },
  );
  const content = useSchedulerQuery(
    async () => {
      const [templates, outbox, rules, summary] = await Promise.all([
        schedulerApi.messageTemplates(),
        schedulerApi.messageOutbox(),
        schedulerApi.notificationRules(),
        schedulerApi.notificationSummary(),
      ]);
      return { templates, outbox, rules, summary };
    },
    [],
    { queryKey: "communications:restored" },
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft(null));
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [view, setView] = useState<NotificationView>("rules");
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<NotificationRuleDraft>(() =>
    emptyRuleDraft(null, []),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);

  async function saveTemplate() {
    if (!draft.commerceId || draft.name.trim().length < 2 || !draft.body.trim())
      return;
    setSaving(true);
    setConflict(null);
    const input = {
      commerceId: draft.commerceId,
      name: draft.name.trim(),
      channel: draft.channel,
      active: draft.active,
      subject: draft.subject.trim() || null,
      body: draft.body.trim(),
      variables: extractSchedulerMessageVariables(draft.body),
      ...(draft.expectedVersion
        ? { expectedVersion: draft.expectedVersion }
        : {}),
    };
    await runSchedulerMutation(
      () =>
        draft.id
          ? schedulerApi.updateMessageTemplate(draft.id, input)
          : schedulerApi.createMessageTemplate(input),
      {
        onSuccess: async () => {
          toast.success(
            draft.id
              ? "Nueva versión de plantilla guardada."
              : "Plantilla creada.",
          );
          await content.reload();
          setEditorOpen(false);
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["communications", "reports:COMMUNICATIONS"],
      },
    );
    setSaving(false);
  }

  async function saveRule() {
    if (
      !ruleDraft.commerceId ||
      ruleDraft.name.trim().length < 2 ||
      !ruleDraft.templateId ||
      !ruleDraft.channels.length ||
      (ruleDraft.scope === "BRANCH" && !ruleDraft.branchId) ||
      (ruleDraft.scope === "PROFESSIONAL" && !ruleDraft.professionalId)
    )
      return;
    setSaving(true);
    setConflict(null);
    const input: SchedulerNotificationRuleWriteDto = {
      commerceId: ruleDraft.commerceId,
      name: ruleDraft.name.trim(),
      event: ruleDraft.event,
      scope: ruleDraft.scope,
      branchId: ruleDraft.scope === "BRANCH" ? ruleDraft.branchId : null,
      professionalId:
        ruleDraft.scope === "PROFESSIONAL"
          ? ruleDraft.professionalId
          : null,
      templateId: ruleDraft.templateId,
      channels: ruleDraft.channels,
      timingMinutes: ruleDraft.timingMinutes,
      allowedActions: ruleDraft.allowedActions,
      active: ruleDraft.active,
      ...(ruleDraft.expectedVersion
        ? { expectedVersion: ruleDraft.expectedVersion }
        : {}),
    };
    await runSchedulerMutation(
      () =>
        ruleDraft.id
          ? schedulerApi.updateNotificationRule(ruleDraft.id, input)
          : schedulerApi.createNotificationRule(input),
      {
        onSuccess: async () => {
          toast.success(
            ruleDraft.id
              ? "Regla de notificación actualizada."
              : "Regla de notificación creada.",
          );
          await content.reload();
          setRuleEditorOpen(false);
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["communications"],
      },
    );
    setSaving(false);
  }

  const statuses =
    content.data?.outbox.reduce<Record<string, number>>(
      (result, message) => ({
        ...result,
        [message.status]: (result[message.status] ?? 0) + 1,
      }),
      {},
    ) ?? {};
  const templatePagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        content.data?.templates ?? [],
        page,
        pageSize,
      ),
    [content.data?.templates, page, pageSize],
  );
  const outboxPagination = useMemo(
    () =>
      paginateSchedulerReportRows(content.data?.outbox ?? [], page, pageSize),
    [content.data?.outbox, page, pageSize],
  );
  const rulePagination = useMemo(
    () => paginateSchedulerReportRows(content.data?.rules ?? [], page, pageSize),
    [content.data?.rules, page, pageSize],
  );
  const activePagination =
    view === "templates"
      ? templatePagination
      : view === "outbox"
        ? outboxPagination
        : rulePagination;
  const summary = content.data?.summary;
  const quotaPercent = summary
    ? Math.min(100, Math.round((summary.monthlyUsed / summary.monthlyLimit) * 100))
    : 0;
  const deliveryPercent = summary?.sent
    ? Math.round((summary.delivered / summary.sent) * 100)
    : 0;
  const confirmationPercent = summary?.appointmentsConfirmed
    ? Math.round(
        (summary.confirmationsAttributedToNotifications /
          summary.appointmentsConfirmed) *
          100,
      )
    : 0;

  return (
    <RestoredAdministrationFrame
      actions={
        <>
          <AdministrationRefreshButton
            loading={content.loading || catalog.loading}
            onClick={() => {
              void content.reload();
              void catalog.reload();
            }}
          />
          {canWrite ? (
            <Button onClick={() => setSendOpen(true)} variant="outline">
              <Send className="mr-2 h-4 w-4" /> Preparar envío
            </Button>
          ) : null}
          {canAdmin ? (
            <>
              <Button
                onClick={() => {
                  setDraft(emptyDraft(catalog.data));
                  setConflict(null);
                  setEditorOpen(true);
                }}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" /> Nueva plantilla
              </Button>
              <Button
                className="admin-primary"
                onClick={() => {
                  setRuleDraft(
                    emptyRuleDraft(
                      catalog.data,
                      content.data?.templates ?? [],
                    ),
                  );
                  setConflict(null);
                  setRuleEditorOpen(true);
                }}
              >
                <BellRing className="mr-2 h-4 w-4" /> Nueva regla
              </Button>
            </>
          ) : null}
        </>
      }
      readOnly={!canAdmin && !canWrite}
      section="whatsapp"
    >
      <div className="whatsapp-overview-card">
        <div>
          <p className="whatsapp-overview-eyebrow">
            Centro de notificaciones
          </p>
          <h2>Automatización conectada a cada cita</h2>
          <p>
            Configura eventos, alcance y acciones seguras; cada entrega conserva
            la relación con la cita y su respuesta.
          </p>
        </div>
        <div className="whatsapp-overview-stats">
          <div>
            <strong>{quotaPercent}%</strong>
            <span>
              {summary?.monthlyUsed.toLocaleString("es-MX") ?? 0} de{" "}
              {summary?.monthlyLimit.toLocaleString("es-MX") ?? 0} mensajes
            </span>
          </div>
          <div>
            <strong>{deliveryPercent}%</strong>
            <span>Tasa de entrega</span>
          </div>
          <div>
            <strong>{confirmationPercent}%</strong>
            <span>Confirmadas por recordatorio</span>
          </div>
          <div>
            <strong>{summary?.failed ?? statuses.FAILED ?? 0}</strong>
            <span>Fallidos este mes</span>
          </div>
        </div>
      </div>
      <AdministrationCoverageNotice title="Proveedor controlado por infraestructura">
        La API no publica secretos ni un interruptor de proveedor. Los enlaces
        de confirmar, cancelar y reagendar se representan sin exponer tokens;
        esta pantalla no activa envíos reales.
      </AdministrationCoverageNotice>
      <div className="flex flex-wrap gap-2">
        <Button
          className={view === "rules" ? "admin-primary" : "bg-white"}
          onClick={() => {
            setView("rules");
            setPage(1);
          }}
          variant={view === "rules" ? "default" : "outline"}
        >
          <BellRing className="mr-2 h-4 w-4" /> Reglas
        </Button>
        <Button
          className={view === "templates" ? "admin-primary" : "bg-white"}
          onClick={() => {
            setView("templates");
            setPage(1);
          }}
          variant={view === "templates" ? "default" : "outline"}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> Plantillas
        </Button>
        <Button
          className={view === "outbox" ? "admin-primary" : "bg-white"}
          onClick={() => {
            setView("outbox");
            setPage(1);
          }}
          variant={view === "outbox" ? "default" : "outline"}
        >
          <Clock3 className="mr-2 h-4 w-4" /> Entregas
        </Button>
      </div>
      <QueryBoundary
        empty={
          view === "rules"
            ? !content.data?.rules.length
            : view === "templates"
              ? !content.data?.templates.length
              : !content.data?.outbox.length
        }
        emptyDescription={
          view === "rules"
            ? "Crea una regla para automatizar un evento de la agenda."
            : view === "templates"
              ? "Crea una plantilla versionada para comenzar."
              : "No hay entregas en el alcance autorizado."
        }
        emptyTitle={
          view === "rules"
            ? "Sin reglas"
            : view === "templates"
              ? "Sin plantillas"
              : "Sin entregas"
        }
        error={content.error ?? catalog.error}
        loading={content.loading || catalog.loading}
        onRetry={() => {
          void content.reload();
          void catalog.reload();
        }}
      >
        {view === "rules" ? (
          <div className="space-y-3">
            {rulePagination.rows.map((rule) => (
              <Card className="admin-card" key={rule.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800">
                          {rule.name}
                        </h3>
                        <Badge
                          className={
                            rule.active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "bg-white text-slate-500"
                          }
                          variant="outline"
                        >
                          {rule.active ? "Activa" : "Pausada"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                        <span>
                          <CalendarCheck2 className="mr-1.5 inline h-4 w-4" />
                          {schedulerNotificationEventLabels[rule.event]}
                        </span>
                        <span>
                          <Gauge className="mr-1.5 inline h-4 w-4" />
                          {notificationTimingLabel(rule.timingMinutes)}
                        </span>
                        <span>{notificationScopeLabel(rule, catalog.data)}</span>
                        <span>
                          {rule.channels
                            .map(
                              (channel) =>
                                schedulerMessageChannelLabels[channel],
                            )
                            .join(" · ")}
                        </span>
                      </div>
                      {rule.allowedActions.length ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Link2 className="h-4 w-4" /> Acciones seguras:
                          {rule.allowedActions.map((action) => (
                            <Badge key={action} variant="outline">
                              {schedulerNotificationActionLabels[action]}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {canAdmin ? (
                      <Button
                        onClick={() => {
                          setRuleDraft(editRuleDraft(rule));
                          setConflict(null);
                          setRuleEditorOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : view === "templates" ? (
          <div className="whatsapp-message-list">
            {templatePagination.rows.map((template) => (
              <Card className="whatsapp-message-row" key={template.id}>
                <CardContent className="whatsapp-message-row-content">
                  <div className="whatsapp-row-icon">
                    {template.channel === "EMAIL" ? (
                      <Mail className="h-5 w-5" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="whatsapp-row-main">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3>{template.name}</h3>
                      <Badge variant="outline">
                        {schedulerMessageChannelLabels[template.channel]}
                      </Badge>
                      <Badge variant="outline">
                        {template.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p>{template.body}</p>
                    <span className="mt-2 block text-xs text-slate-400">
                      v{template.currentVersion} ·{" "}
                      {formatDateTime(template.updatedAt)} ·{" "}
                      {template.variables.length} variables
                    </span>
                  </div>
                  {canAdmin ? (
                    <div className="whatsapp-row-actions">
                      <Button
                        onClick={() => {
                          setDraft(editDraft(template));
                          setConflict(null);
                          setEditorOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {outboxPagination.rows.map((message) => (
              <Card className="admin-card" key={message.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {message.customerName ?? "Clienta"}
                        </span>
                        <span className="font-semibold">
                          {schedulerMessageChannelLabels[message.channel]}
                        </span>
                        <MessageStatusBadge status={message.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {message.event
                          ? schedulerNotificationEventLabels[message.event]
                          : "Comunicación manual"}
                        {message.templateName
                          ? ` · ${message.templateName}`
                          : ""}
                      </p>
                      {message.appointmentId ? (
                        <p className="mt-1 text-xs font-medium text-[#8b6948]">
                          <Link2 className="mr-1 inline h-3.5 w-3.5" />
                          Cita vinculada
                          {message.appointmentStartsAt
                            ? ` · ${formatDateTime(message.appointmentStartsAt)}`
                            : ""}
                          {message.branchName ? ` · ${message.branchName}` : ""}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        Programado {formatDateTime(message.scheduledAt)} ·{" "}
                        {message.attempts} intentos
                      </p>
                      {message.responseAction ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-700">
                          Respuesta: {schedulerNotificationActionLabels[message.responseAction]}
                          {message.responseAt
                            ? ` · ${formatDateTime(message.responseAt)}`
                            : ""}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {schedulerOutboxStatusMeta[message.status].detail}
                      </p>
                      {message.lastErrorCode ? (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          Código: {message.lastErrorCode}
                        </p>
                      ) : null}
                    </div>
                    {canAdmin && message.status === "FAILED" ? (
                      <Button
                        onClick={() =>
                          void runSchedulerMutation(
                            () => schedulerApi.retryMessage(message.id),
                            {
                              onSuccess: async () => {
                                toast.success("Reintento programado.");
                                await content.reload();
                              },
                              onError: toast.error,
                              onConflict: toast.error,
                              invalidate: [
                                "communications",
                                "reports:COMMUNICATIONS",
                              ],
                            },
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <SchedulerPagination
          {...activePagination}
          label={
            view === "rules"
              ? "reglas"
              : view === "templates"
                ? "plantillas"
                : "entregas"
          }
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSize={pageSize}
        />
      </QueryBoundary>
      <Dialog open={ruleEditorOpen} onOpenChange={setRuleEditorOpen}>
        <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {ruleDraft.id
                ? `Editar ${ruleDraft.name}`
                : "Nueva regla de notificación"}
            </DialogTitle>
            <DialogDescription>
              Define qué evento dispara el mensaje, su alcance y las acciones
              que podrá realizar la clienta sin exponer credenciales.
            </DialogDescription>
          </DialogHeader>
          <ConflictNotice
            message={conflict}
            onReload={() => {
              setRuleEditorOpen(false);
              void content.reload();
            }}
          />
          {catalog.data ? (
            <NotificationRuleEditor
              catalog={catalog.data}
              draft={ruleDraft}
              setDraft={setRuleDraft}
              templates={content.data?.templates ?? []}
            />
          ) : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setRuleEditorOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="admin-primary"
              disabled={
                saving ||
                !ruleDraft.commerceId ||
                ruleDraft.name.trim().length < 2 ||
                !ruleDraft.templateId ||
                !ruleDraft.channels.length ||
                (ruleDraft.scope === "BRANCH" && !ruleDraft.branchId) ||
                (ruleDraft.scope === "PROFESSIONAL" &&
                  !ruleDraft.professionalId)
              }
              onClick={() => void saveRule()}
            >
              {saving ? "Guardando…" : "Guardar regla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? `Editar ${draft.name}` : "Nueva plantilla"}
            </DialogTitle>
            <DialogDescription>
              Cada edición crea una versión. Las variables se derivan de los
              marcadores del cuerpo.
            </DialogDescription>
          </DialogHeader>
          <ConflictNotice
            message={conflict}
            onReload={() => {
              setEditorOpen(false);
              void content.reload();
            }}
          />
          {catalog.data ? (
            <>
              <div className="mb-4">
                <Label htmlFor="template-commerce">Comercio</Label>
                <Select
                  disabled={Boolean(draft.id)}
                  onValueChange={(commerceId) =>
                    setDraft((current) => ({ ...current, commerceId }))
                  }
                  value={draft.commerceId}
                >
                  <SelectTrigger
                    className={`${controlClass} mt-1.5`}
                    id="template-commerce"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commerceOptions(catalog.data).map((commerce) => (
                      <SelectItem key={commerce.id} value={commerce.id}>
                        {commerce.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TemplateEditor draft={draft} setDraft={setDraft} />
            </>
          ) : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setEditorOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="admin-primary"
              disabled={
                saving ||
                !draft.commerceId ||
                draft.name.trim().length < 2 ||
                !draft.body.trim()
              }
              onClick={() => void saveTemplate()}
            >
              {saving ? "Guardando…" : "Guardar versión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {catalog.data ? (
        <CustomerCommunicationDialog
          catalog={catalog.data}
          onOpenChange={setSendOpen}
          onQueued={content.reload}
          open={sendOpen}
          templates={content.data?.templates ?? []}
        />
      ) : null}
    </RestoredAdministrationFrame>
  );
}
