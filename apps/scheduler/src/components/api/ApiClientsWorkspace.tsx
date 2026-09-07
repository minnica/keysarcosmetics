"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  SchedulerAuthorizationPurpose,
  SchedulerCustomerContactPreference,
  SchedulerCustomerDetailDto,
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerFinancialHistoryDto,
  SchedulerCustomerSummaryDto,
  SchedulerCustomerVisitHistoryDto,
} from "@cosmetics/types";
import {
  Badge,
  Button,
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
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitMerge,
  History,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  schedulerApi,
  schedulerApiErrorMessage,
  schedulerApiErrorStatus,
} from "@/lib/api";
import {
  authorizationRetentionMs,
  customerFieldDraftValue,
  customerFieldWriteValue,
  schedulerCustomerQueryPrefix,
  splitCustomerList,
} from "@/lib/scheduler-customer-data";
import { useSchedulerSession } from "@/lib/session";
import {
  ConflictNotice,
  QueryBoundary,
  invalidateSchedulerQueries,
  useSchedulerQuery,
} from "./ApiState";

type SensitiveSection = "profile" | "visits" | "financial";

interface CustomerDraft {
  id: string | null;
  displayName: string;
  preferredName: string;
  phone: string;
  email: string;
  alternateEmails: string;
  aliases: string;
  sourceId: string;
  notes: string;
  profileNotes: string;
  preferredLocale: string;
  contactPreference: SchedulerCustomerContactPreference;
  active: boolean;
  version: number | null;
  customFields: Record<string, string | boolean>;
}

const emptyDraft: CustomerDraft = {
  id: null,
  displayName: "",
  preferredName: "",
  phone: "",
  email: "",
  alternateEmails: "",
  aliases: "",
  sourceId: "",
  notes: "",
  profileNotes: "",
  preferredLocale: "es-MX",
  contactPreference: "WHATSAPP",
  active: true,
  version: null,
  customFields: {},
};

const contactPreferenceLabels: Record<
  SchedulerCustomerContactPreference,
  string
> = {
  PHONE: "Llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
  NONE: "Sin preferencia",
};

const fieldTypeLabels: Record<
  SchedulerCustomerFieldDefinitionDto["type"],
  string
> = {
  TEXT: "Texto",
  NUMBER: "Número",
  BOOLEAN: "Sí / no",
  DATE: "Fecha",
  SELECT: "Selección",
};

const panelClass =
  "overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_18px_50px_rgba(38,54,73,0.06)]";
const controlClass =
  "client-modal-control h-11 rounded-xl border-[#dfd5cc] bg-white text-[#364152] focus-visible:ring-[#c3a583]";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(amount)
    : value;
}

function draftFromDetail(
  detail: SchedulerCustomerDetailDto,
  definitions: SchedulerCustomerFieldDefinitionDto[],
): CustomerDraft {
  const primary = detail.emails.find((email) => email.isPrimary)?.email;
  return {
    id: detail.id,
    displayName: detail.displayName,
    preferredName: detail.preferredName ?? "",
    phone: detail.phone ?? "",
    email: primary ?? detail.email ?? "",
    alternateEmails: detail.emails
      .filter((email) => !email.isPrimary)
      .map((email) => email.email)
      .join("\n"),
    aliases: detail.aliases.join("\n"),
    sourceId: detail.source?.id ?? "",
    notes: detail.notes ?? "",
    profileNotes: detail.profile?.notes ?? "",
    preferredLocale: detail.profile?.preferredLocale ?? "es-MX",
    contactPreference: detail.profile?.contactPreference ?? "WHATSAPP",
    active: detail.active,
    version: detail.version,
    customFields: Object.fromEntries(
      detail.customFields.map((field) => {
        const currentDefinition = definitions.find(
          (definition) =>
            definition.id === field.definitionId ||
            definition.key === field.key,
        );
        return [
          currentDefinition?.id ?? field.definitionId,
          customerFieldDraftValue(field),
        ];
      }),
    ),
  };
}

function FormField({
  htmlFor,
  label,
  required,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-semibold text-[#364152]" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-[#ad8b67]">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-slate-400">{hint}</p> : null}
    </div>
  );
}

function LockedSection({
  id,
  title,
  description,
  secret,
  loading,
  error,
  configured,
  onSecretChange,
  onUnlock,
}: {
  id: string;
  title: string;
  description: string;
  secret: string;
  loading: boolean;
  error: string | null;
  configured: boolean;
  onSecretChange: (value: string) => void;
  onUnlock: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9c9bb] bg-[#fcfaf8] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
          <LockKeyhole className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-[#263649]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          aria-label={`Código personal para ${title.toLocaleLowerCase("es-MX")}`}
          autoComplete="one-time-code"
          className={`${controlClass} tracking-[0.2em]`}
          disabled={!configured || loading}
          inputMode="numeric"
          maxLength={12}
          onChange={(event) =>
            onSecretChange(event.target.value.replace(/\D/g, ""))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && secret) onUnlock();
          }}
          placeholder="Código personal"
          type="password"
          value={secret}
        />
        <Button
          className="h-11 shrink-0 rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
          disabled={!configured || !secret || loading}
          onClick={onUnlock}
          type="button"
        >
          {loading ? "Autorizando…" : "Autorizar"}
        </Button>
      </div>
      {!configured ? (
        <p className="mt-2 text-xs text-amber-700">
          Configura primero tu código personal en Configuraciones.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ApiClientsWorkspace() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canWrite = canAccess("clients", "WRITE");
  const canAdmin = canAccess("clients", "ADMIN");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState(
    bootstrap?.authorizedBranchIds[0] ?? "",
  );
  const [sourceId, setSourceId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [recordCustomer, setRecordCustomer] =
    useState<SchedulerCustomerSummaryDto | null>(null);
  const [detail, setDetail] = useState<SchedulerCustomerDetailDto | null>(null);
  const [detailExpiresAt, setDetailExpiresAt] = useState<string | null>(null);
  const [visits, setVisits] = useState<SchedulerCustomerVisitHistoryDto | null>(
    null,
  );
  const [financial, setFinancial] =
    useState<SchedulerCustomerFinancialHistoryDto | null>(null);
  const [visitPage, setVisitPage] = useState(1);
  const [financialPage, setFinancialPage] = useState(1);
  const [secrets, setSecrets] = useState<Record<SensitiveSection, string>>({
    profile: "",
    visits: "",
    financial: "",
  });
  const [sensitiveLoading, setSensitiveLoading] =
    useState<SensitiveSection | null>(null);
  const [sensitiveErrors, setSensitiveErrors] = useState<
    Record<SensitiveSection, string | null>
  >({ profile: null, visits: null, financial: null });
  const sensitiveTimers = useRef<Partial<Record<SensitiveSection, number>>>({});
  const editorSensitiveTimer = useRef<number | null>(null);
  const [mergeSelection, setMergeSelection] = useState<
    SchedulerCustomerSummaryDto[]
  >([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeReason, setMergeReason] = useState("");
  const [mergeSecret, setMergeSecret] = useState("");
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const results = useSchedulerQuery(
    () =>
      schedulerApi.searchCustomers({
        query,
        branchId,
        ...(sourceId ? { sourceId } : {}),
        page,
        pageSize,
      }),
    [query, branchId, sourceId, page, pageSize],
    {
      queryKey: `${schedulerCustomerQueryPrefix}:search`,
      branchId,
      enabled: query.length >= 2 && Boolean(branchId),
    },
  );
  const sources = useSchedulerQuery(() => schedulerApi.customerSources(), [], {
    queryKey: `${schedulerCustomerQueryPrefix}:sources`,
  });
  const definitions = useSchedulerQuery(
    () => schedulerApi.customerFieldDefinitions({ branchId }),
    [branchId],
    {
      queryKey: `${schedulerCustomerQueryPrefix}:field-definitions`,
      branchId,
      enabled: Boolean(branchId),
    },
  );

  const totalPages = Math.max(
    1,
    Math.ceil((results.data?.total ?? 0) / pageSize),
  );
  const pageStart = results.data?.total ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, results.data?.total ?? 0);
  const activeDefinitions = useMemo(
    () => definitions.data?.filter((definition) => definition.active) ?? [],
    [definitions.data],
  );

  function clearSensitive(section?: SensitiveSection) {
    const sections: SensitiveSection[] = section
      ? [section]
      : ["profile", "visits", "financial"];
    for (const item of sections) {
      const timer = sensitiveTimers.current[item];
      if (timer) window.clearTimeout(timer);
      delete sensitiveTimers.current[item];
      if (item === "profile") {
        setDetail(null);
        setDetailExpiresAt(null);
      }
      if (item === "visits") setVisits(null);
      if (item === "financial") setFinancial(null);
    }
    setSecrets((current) => ({
      ...current,
      ...Object.fromEntries(sections.map((item) => [item, ""])),
    }));
    setSensitiveErrors((current) => ({
      ...current,
      ...Object.fromEntries(sections.map((item) => [item, null])),
    }));
  }

  function closeRecord() {
    clearSensitive();
    setRecordCustomer(null);
    setVisitPage(1);
    setFinancialPage(1);
  }

  function retainSensitive(
    section: SensitiveSection,
    expiresAt: string,
    clear: () => void,
  ) {
    const current = sensitiveTimers.current[section];
    if (current) window.clearTimeout(current);
    sensitiveTimers.current[section] = window.setTimeout(() => {
      clear();
      setSecrets((values) => ({ ...values, [section]: "" }));
      delete sensitiveTimers.current[section];
    }, authorizationRetentionMs(expiresAt));
  }

  useEffect(() => {
    if (!bootstrap?.authorizedBranchIds.includes(branchId)) {
      setBranchId(bootstrap?.authorizedBranchIds[0] ?? "");
    }
  }, [bootstrap, branchId]);

  useEffect(() => {
    setSourceId("");
    setPage(1);
    Object.values(sensitiveTimers.current).forEach((timer) => {
      if (timer) window.clearTimeout(timer);
    });
    sensitiveTimers.current = {};
    setRecordCustomer(null);
    setDetail(null);
    setDetailExpiresAt(null);
    setVisits(null);
    setFinancial(null);
    setVisitPage(1);
    setFinancialPage(1);
    setSecrets({ profile: "", visits: "", financial: "" });
    setSensitiveErrors({ profile: null, visits: null, financial: null });
    setEditorOpen(false);
    setDraft(emptyDraft);
    setMergeSelection([]);
    if (editorSensitiveTimer.current) {
      window.clearTimeout(editorSensitiveTimer.current);
      editorSensitiveTimer.current = null;
    }
  }, [bootstrap?.user.id]);

  useEffect(
    () => () => {
      Object.values(sensitiveTimers.current).forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
      if (editorSensitiveTimer.current) {
        window.clearTimeout(editorSensitiveTimer.current);
      }
    },
    [],
  );

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const next = queryInput.trim();
    if (next.length < 2) {
      toast.error("Escribe al menos dos caracteres para buscar.");
      return;
    }
    setPage(1);
    setQuery(next);
  }

  function openCreate() {
    setDraft({ ...emptyDraft, customFields: {} });
    setConflict(null);
    setEditorOpen(true);
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    if (!branchId || draft.displayName.trim().length < 2) {
      toast.error("Captura un nombre y selecciona una sucursal.");
      return;
    }
    const phoneDigits = draft.phone.replace(/\D/g, "");
    if (draft.phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      toast.error("El teléfono debe contener entre 10 y 15 dígitos.");
      return;
    }
    let customFields: Array<{ definitionId: string; value: unknown }>;
    try {
      customFields = activeDefinitions.flatMap((definition) => {
        const value = draft.customFields[definition.id];
        const empty =
          definition.type !== "BOOLEAN" &&
          (value === undefined || String(value).trim() === "");
        if (empty && definition.required) {
          throw new Error(`Completa el campo ${definition.label}.`);
        }
        if (empty) return [];
        const writeValue = customerFieldWriteValue(definition, value);
        if (
          definition.type === "NUMBER" &&
          (typeof writeValue !== "number" || !Number.isFinite(writeValue))
        ) {
          throw new Error(`${definition.label} debe ser un número válido.`);
        }
        return [{ definitionId: definition.id, value: writeValue }];
      });
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Revisa los campos personalizados.",
      );
      return;
    }

    setSaving(true);
    setConflict(null);
    try {
      const input = {
        displayName: draft.displayName.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        sourceId: draft.sourceId || null,
        branchId,
        notes: draft.notes.trim() || null,
        active: draft.active,
        profile: {
          preferredName: draft.preferredName.trim() || null,
          preferredLocale: draft.preferredLocale.trim() || "es-MX",
          contactPreference: draft.contactPreference,
          notes: draft.profileNotes.trim() || null,
        },
        aliases: splitCustomerList(draft.aliases),
        alternateEmails: splitCustomerList(draft.alternateEmails),
        customFields,
        ...(draft.version ? { expectedVersion: draft.version } : {}),
      };
      await (draft.id
        ? schedulerApi.updateCustomer(draft.id, input)
        : schedulerApi.createCustomer(input));
      invalidateSchedulerQueries(schedulerCustomerQueryPrefix);
      toast.success(draft.id ? "Cliente actualizado." : "Cliente creado.");
      setEditorOpen(false);
      setDraft(emptyDraft);
      if (editorSensitiveTimer.current) {
        window.clearTimeout(editorSensitiveTimer.current);
        editorSensitiveTimer.current = null;
      }
      closeRecord();
    } catch (cause) {
      const message = schedulerApiErrorMessage(cause);
      if (schedulerApiErrorStatus(cause) === 409) setConflict(message);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function unlockSection(section: SensitiveSection) {
    if (!recordCustomer || !secrets[section]) return;
    const purpose: Record<SensitiveSection, SchedulerAuthorizationPurpose> = {
      profile: "CLIENT_RECORD_VIEW",
      visits: "CLIENT_VISIT_HISTORY_VIEW",
      financial: "CLIENT_FINANCIAL_HISTORY_VIEW",
    };
    setSensitiveLoading(section);
    setSensitiveErrors((current) => ({ ...current, [section]: null }));
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret: secrets[section],
        purpose: purpose[section],
        screenKey: "scheduler/clients",
        targetType: "Customer",
        targetId: recordCustomer.id,
      });
      if (section === "profile") {
        setDetail(
          await schedulerApi.customerDetail(
            recordCustomer.id,
            authorization.token,
          ),
        );
        setDetailExpiresAt(authorization.expiresAt);
        retainSensitive(section, authorization.expiresAt, () => {
          setDetail(null);
          setDetailExpiresAt(null);
        });
      } else if (section === "visits") {
        setVisits(
          await schedulerApi.customerVisits(
            recordCustomer.id,
            authorization.token,
            { branchId, page: visitPage, pageSize: 10 },
          ),
        );
        retainSensitive(section, authorization.expiresAt, () =>
          setVisits(null),
        );
      } else {
        setFinancial(
          await schedulerApi.customerFinancialHistory(
            recordCustomer.id,
            authorization.token,
            { branchId, page: financialPage, pageSize: 10 },
          ),
        );
        retainSensitive(section, authorization.expiresAt, () =>
          setFinancial(null),
        );
      }
      setSecrets((current) => ({ ...current, [section]: "" }));
    } catch (cause) {
      setSensitiveErrors((current) => ({
        ...current,
        [section]: schedulerApiErrorMessage(
          cause,
          "La autorización fue denegada o expiró.",
        ),
      }));
    } finally {
      setSecrets((current) => ({ ...current, [section]: "" }));
      setSensitiveLoading(null);
    }
  }

  function changeSensitivePage(section: "visits" | "financial", next: number) {
    clearSensitive(section);
    if (section === "visits") setVisitPage(next);
    else setFinancialPage(next);
  }

  function toggleMergeCustomer(customer: SchedulerCustomerSummaryDto) {
    setMergeSelection((current) => {
      if (current.some((item) => item.id === customer.id)) {
        return current.filter((item) => item.id !== customer.id);
      }
      if (current.length === 2) return [current[1]!, customer];
      return [...current, customer];
    });
  }

  function prepareMerge() {
    if (mergeSelection.length !== 2) return;
    setMergeTargetId(mergeSelection[1]!.id);
    setMergeReason("");
    setMergeSecret("");
    setMergeError(null);
    setMergeOpen(true);
  }

  async function mergeCustomers(event: FormEvent) {
    event.preventDefault();
    const source = mergeSelection.find((item) => item.id !== mergeTargetId);
    const target = mergeSelection.find((item) => item.id === mergeTargetId);
    if (!source || !target || mergeReason.trim().length < 10 || !mergeSecret) {
      setMergeError(
        "Selecciona el destino, captura un motivo de al menos 10 caracteres y autoriza.",
      );
      return;
    }
    setMerging(true);
    setMergeError(null);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret: mergeSecret,
        purpose: "CLIENT_MERGE",
        screenKey: "scheduler/clients",
        targetType: "CustomerMerge",
        targetId: `${source.id}:${target.id}`,
      });
      await schedulerApi.mergeCustomers({
        sourceCustomerId: source.id,
        targetCustomerId: target.id,
        expectedSourceVersion: source.version,
        expectedTargetVersion: target.version,
        reason: mergeReason.trim(),
        authorizationToken: authorization.token,
      });
      invalidateSchedulerQueries(schedulerCustomerQueryPrefix);
      setMergeOpen(false);
      setMergeSelection([]);
      toast.success(
        "Clientes fusionados; el historial quedó vinculado al destino.",
      );
    } catch (cause) {
      setMergeError(schedulerApiErrorMessage(cause));
    } finally {
      setMerging(false);
      setMergeSecret("");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <header className="border-b border-[#e8ddd4] bg-[linear-gradient(180deg,#fff_0%,#fbf8f4_100%)] px-5 py-7 sm:px-7 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="label-caps">Clientes</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3rem)] text-[#263649]">
              Base de clientes
            </h1>
            <p className="mt-2 max-w-[65ch] text-sm leading-6 text-slate-500">
              Encuentra y administra la identidad compartida que usan Agenda y
              POS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-11 rounded-xl border-[#e7ddd4] bg-white px-4 text-[#ad8b67] disabled:opacity-65"
              disabled
              title="La importación masiva requiere un contrato de validación y conciliación (B03)."
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" /> Importar clientes
            </Button>
            {canWrite ? (
              <Button
                className="h-11 rounded-xl bg-[#263649] px-4 text-white shadow-[0_8px_20px_rgba(38,54,73,0.14)] hover:bg-[#1d2b3a]"
                onClick={openCreate}
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
              </Button>
            ) : (
              <Badge className="h-10 rounded-xl" variant="outline">
                <LockKeyhole className="mr-1.5 h-3.5 w-3.5" /> Sólo lectura
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-5 px-5 py-6 sm:px-7 lg:px-8">
        <section
          className={panelClass}
          aria-label="Búsqueda y filtros de clientes"
        >
          <form
            className="grid gap-4 p-5 lg:grid-cols-[minmax(280px,1fr)_minmax(210px,0.35fr)_minmax(190px,0.3fr)_auto] lg:items-end"
            onSubmit={submitSearch}
          >
            <FormField
              htmlFor="customer-query"
              label="Buscar cliente"
              hint="Nombre, teléfono, correo o alias; mínimo 2 caracteres."
            >
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  autoComplete="off"
                  className={`${controlClass} pl-10`}
                  id="customer-query"
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Ej. María o 551234"
                  value={queryInput}
                />
              </span>
            </FormField>
            <FormField htmlFor="customer-branch" label="Sucursal">
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setPage(1);
                  setMergeSelection([]);
                  closeRecord();
                }}
              >
                <SelectTrigger className={controlClass} id="customer-branch">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {bootstrap?.authorizedBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField htmlFor="customer-source" label="Procedencia">
              <Select
                value={sourceId || "ALL"}
                onValueChange={(value) => {
                  setSourceId(value === "ALL" ? "" : value);
                  setPage(1);
                  setMergeSelection([]);
                }}
              >
                <SelectTrigger className={controlClass} id="customer-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {sources.data
                    ?.filter((source) => source.active)
                    .map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <Button
              className="h-11 rounded-xl bg-[#263649] px-5 text-white hover:bg-[#1d2b3a]"
              disabled={queryInput.trim().length < 2}
              type="submit"
            >
              <Search className="mr-2 h-4 w-4" /> Buscar
            </Button>
          </form>
        </section>

        {canAdmin ? (
          <section className="flex flex-col gap-3 rounded-[22px] border border-[#decfbe] bg-[#fbf6f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#263649] text-white">
                <GitMerge className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Combinar duplicados</p>
                <p className="text-xs text-slate-500">
                  Selecciona exactamente dos resultados y elige cuál identidad
                  conservar.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#8e6c4b]">
                {mergeSelection.length}/2 seleccionados
              </span>
              <Button
                className="rounded-xl"
                disabled={mergeSelection.length !== 2}
                onClick={prepareMerge}
                size="sm"
                variant="outline"
              >
                Revisar fusión <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </section>
        ) : null}

        <section className={panelClass} aria-label="Base de clientes">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee6df] bg-[linear-gradient(180deg,#fff_0%,#fdfaf7_100%)] px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ad8b67]">
                Resultados canónicos
              </p>
              <h2 className="mt-1 font-semibold text-[#263649]">
                {query
                  ? `Coincidencias para “${query}”`
                  : "Consulta la base compartida"}
              </h2>
            </div>
            {results.data ? (
              <p className="text-xs text-slate-500">
                {pageStart}–{pageEnd} de {results.data.total}
              </p>
            ) : null}
          </div>

          {query.length < 2 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
                <UsersRound className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold">
                Busca una identidad compartida
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                El backend exige una búsqueda acotada para proteger la base y
                respetar el alcance de sucursal.
              </p>
            </div>
          ) : (
            <QueryBoundary
              empty={!results.data?.items.length}
              emptyDescription="Prueba otro nombre, teléfono, correo, alias o procedencia."
              emptyTitle="No encontramos clientes"
              error={results.error}
              loading={results.loading}
              onRetry={() => void results.reload()}
            >
              <div
                className="overflow-x-auto"
                role="region"
                aria-label="Tabla de clientes"
                tabIndex={0}
              >
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-[#faf8f5] text-xs font-semibold text-[#526273]">
                    <tr>
                      {canAdmin ? (
                        <th className="w-14 px-5 py-4">Elegir</th>
                      ) : null}
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Contacto</th>
                      <th className="px-5 py-4">Procedencia</th>
                      <th className="px-5 py-4">Cartera vigente</th>
                      <th className="px-5 py-4 text-right">Opciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data?.items.map((customer) => {
                      const selected = mergeSelection.some(
                        (item) => item.id === customer.id,
                      );
                      return (
                        <tr
                          className={`${selected ? "bg-[#fbf3ea]" : "odd:bg-[#fcfaf8]"} border-t border-[#f0e8e1] transition hover:bg-[#f7f1eb]`}
                          key={customer.id}
                        >
                          {canAdmin ? (
                            <td className="px-5 py-4">
                              <input
                                aria-label={`Seleccionar a ${customer.displayName} para fusión`}
                                checked={selected}
                                className="h-4 w-4 rounded border-[#cdbfb4] accent-[#263649]"
                                onChange={() => toggleMergeCustomer(customer)}
                                type="checkbox"
                              />
                            </td>
                          ) : null}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#f4e4db,#e7eef1)] text-xs font-bold text-[#526273]">
                                {initials(customer.displayName)}
                              </span>
                              <span>
                                <button
                                  className="font-semibold text-[#263649] transition hover:text-[#ad8b67] hover:underline"
                                  onClick={() => {
                                    closeRecord();
                                    setRecordCustomer(customer);
                                  }}
                                  type="button"
                                >
                                  {customer.displayName}
                                </button>
                                <span className="mt-1 block text-xs text-slate-400">
                                  {customer.preferredName
                                    ? `Prefiere ${customer.preferredName}`
                                    : customer.aliases.length
                                      ? `${customer.aliases.length} alias`
                                      : `Versión ${customer.version}`}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            <span className="block">
                              {customer.phone || "Sin teléfono"}
                            </span>
                            <span className="mt-1 block text-xs">
                              {customer.email || "Sin correo"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {customer.source?.name ?? "Sin procedencia"}
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {customer.currentPortfolios.length
                              ? customer.currentPortfolios
                                  .slice(0, 2)
                                  .map((portfolio) => (
                                    <span className="block" key={portfolio.id}>
                                      {portfolio.branchName ?? "Todas"} ·{" "}
                                      {portfolio.ownerName ?? "Empresa"}
                                    </span>
                                  ))
                              : "Sin cartera vigente"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              className="rounded-xl border-[#dfd5cc]"
                              onClick={() => {
                                closeRecord();
                                setRecordCustomer(customer);
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <FileText className="mr-2 h-3.5 w-3.5" />
                              Expediente
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eee6df] px-5 py-5 text-xs text-slate-500">
                <label className="flex items-center gap-2">
                  Mostrar
                  <select
                    aria-label="Clientes por página"
                    className="rounded-lg border border-[#e7ddd4] bg-white px-2 py-2"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                      setMergeSelection([]);
                    }}
                    value={pageSize}
                  >
                    {[25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  por página
                </label>
                <div className="flex items-center gap-3">
                  <span>
                    {pageStart}–{pageEnd} de {results.data?.total ?? 0}
                  </span>
                  <button
                    aria-label="Página anterior"
                    className="rounded-lg border border-[#e7ddd4] p-2 transition hover:bg-[#faf8f5] disabled:opacity-40"
                    disabled={page <= 1 || results.loading}
                    onClick={() => {
                      setPage((value) => value - 1);
                      setMergeSelection([]);
                    }}
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="rounded-lg bg-[#f5ede4] px-3 py-2 font-semibold text-[#ad8b67]">
                    {page}
                  </span>
                  <button
                    aria-label="Página siguiente"
                    className="rounded-lg border border-[#e7ddd4] p-2 transition hover:bg-[#faf8f5] disabled:opacity-40"
                    disabled={page >= totalPages || results.loading}
                    onClick={() => {
                      setPage((value) => value + 1);
                      setMergeSelection([]);
                    }}
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            </QueryBoundary>
          )}
        </section>

        <aside className="rounded-2xl border border-dashed border-[#d9c9bb] bg-white/60 px-5 py-4 text-xs leading-5 text-slate-500">
          Audiencias, importación masiva y reporte de fichas permanecen visibles
          como brecha B03: no se simulan ni se generan archivos parciales hasta
          contar con contratos canónicos. Recordatorios y encuestas conservan
          sus rutas para RV6/RV7.
        </aside>
      </main>

      <CustomerEditorDialog
        activeDefinitions={activeDefinitions}
        conflict={conflict}
        definitionsError={definitions.error}
        definitionsLoading={definitions.loading}
        draft={draft}
        onDraftChange={setDraft}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setConflict(null);
            setDraft(emptyDraft);
            if (editorSensitiveTimer.current) {
              window.clearTimeout(editorSensitiveTimer.current);
              editorSensitiveTimer.current = null;
            }
          }
        }}
        onReload={() => {
          setEditorOpen(false);
          setConflict(null);
          setDraft(emptyDraft);
          if (editorSensitiveTimer.current) {
            window.clearTimeout(editorSensitiveTimer.current);
            editorSensitiveTimer.current = null;
          }
          if (query) void results.reload();
        }}
        onSubmit={(event) => void saveCustomer(event)}
        open={editorOpen}
        saving={saving}
        sources={sources.data ?? []}
      />

      <CustomerRecordDialog
        configured={Boolean(bootstrap?.secondaryAuthorizationConfigured)}
        detail={detail}
        financial={financial}
        financialPage={financialPage}
        loading={sensitiveLoading}
        errors={sensitiveErrors}
        onClose={closeRecord}
        onEdit={() => {
          if (!detail) return;
          const retention = detailExpiresAt
            ? authorizationRetentionMs(detailExpiresAt)
            : 0;
          setDraft(draftFromDetail(detail, activeDefinitions));
          setConflict(null);
          closeRecord();
          setEditorOpen(true);
          if (editorSensitiveTimer.current) {
            window.clearTimeout(editorSensitiveTimer.current);
          }
          editorSensitiveTimer.current = window.setTimeout(() => {
            setEditorOpen(false);
            setDraft(emptyDraft);
            editorSensitiveTimer.current = null;
            toast.error(
              "La autorización del expediente expiró; vuelve a abrirlo para continuar.",
            );
          }, retention);
        }}
        onPageChange={changeSensitivePage}
        onSecretChange={(section, value) =>
          setSecrets((current) => ({ ...current, [section]: value }))
        }
        onUnlock={(section) => void unlockSection(section)}
        open={Boolean(recordCustomer)}
        recordCustomer={recordCustomer}
        secrets={secrets}
        visits={visits}
        visitPage={visitPage}
        canWrite={canWrite}
      />

      <MergeDialog
        error={mergeError}
        mergeReason={mergeReason}
        mergeSecret={mergeSecret}
        mergeTargetId={mergeTargetId}
        merging={merging}
        onOpenChange={(open) => {
          setMergeOpen(open);
          if (!open) {
            setMergeSecret("");
            setMergeError(null);
          }
        }}
        onReasonChange={setMergeReason}
        onSecretChange={setMergeSecret}
        onSubmit={(event) => void mergeCustomers(event)}
        onTargetChange={setMergeTargetId}
        open={mergeOpen}
        selection={mergeSelection}
      />
    </div>
  );
}

function CustomerEditorDialog({
  activeDefinitions,
  conflict,
  definitionsError,
  definitionsLoading,
  draft,
  onDraftChange,
  onOpenChange,
  onReload,
  onSubmit,
  open,
  saving,
  sources,
}: {
  activeDefinitions: SchedulerCustomerFieldDefinitionDto[];
  conflict: string | null;
  definitionsError: string | null;
  definitionsLoading: boolean;
  draft: CustomerDraft;
  onDraftChange: React.Dispatch<React.SetStateAction<CustomerDraft>>;
  onOpenChange: (open: boolean) => void;
  onReload: () => void;
  onSubmit: (event: FormEvent) => void;
  open: boolean;
  saving: boolean;
  sources: Array<{ id: string; name: string; active: boolean }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[920px] gap-0 overflow-hidden rounded-[28px] border-[#e7ddd4] bg-white p-0 shadow-[0_28px_90px_rgba(21,31,43,0.28)]">
        <form
          className="flex max-h-[92vh] min-h-0 flex-col"
          onSubmit={onSubmit}
        >
          <DialogHeader className="border-b border-[#eee6df] px-6 py-5 pr-14 text-left sm:px-8">
            <DialogTitle className="page-title text-3xl text-[#263649]">
              {draft.id ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
            <DialogDescription>
              Los datos se guardan en la identidad compartida y respetan la
              versión vigente.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#faf8f6] p-5 sm:p-6">
            <ConflictNotice message={conflict} onReload={onReload} />
            {definitionsError ? (
              <p
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                role="alert"
              >
                No se cargaron los campos personalizados de esta sucursal:{" "}
                {definitionsError}
              </p>
            ) : null}
            <section className="client-modal-section">
              <p className="label-caps">Identidad y contacto</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField
                  htmlFor="customer-name"
                  label="Nombre completo"
                  required
                >
                  <Input
                    autoFocus
                    className={controlClass}
                    id="customer-name"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        displayName: event.target.value,
                      }))
                    }
                    required
                    value={draft.displayName}
                  />
                </FormField>
                <FormField
                  htmlFor="customer-preferred-name"
                  label="Nombre preferido"
                >
                  <Input
                    className={controlClass}
                    id="customer-preferred-name"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        preferredName: event.target.value,
                      }))
                    }
                    value={draft.preferredName}
                  />
                </FormField>
                <FormField htmlFor="customer-phone" label="Teléfono">
                  <Input
                    autoComplete="tel"
                    className={controlClass}
                    id="customer-phone"
                    inputMode="tel"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        phone: event.target.value,
                      }))
                    }
                    value={draft.phone}
                  />
                </FormField>
                <FormField htmlFor="customer-email" label="Correo principal">
                  <Input
                    autoComplete="email"
                    className={controlClass}
                    id="customer-email"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        email: event.target.value,
                      }))
                    }
                    type="email"
                    value={draft.email}
                  />
                </FormField>
                <FormField
                  htmlFor="customer-aliases"
                  label="Alias"
                  hint="Uno por línea o separados por coma."
                >
                  <Textarea
                    className="client-modal-control min-h-24"
                    id="customer-aliases"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        aliases: event.target.value,
                      }))
                    }
                    value={draft.aliases}
                  />
                </FormField>
                <FormField
                  htmlFor="customer-alternate-emails"
                  label="Correos alternos"
                  hint="Uno por línea o separados por coma."
                >
                  <Textarea
                    className="client-modal-control min-h-24"
                    id="customer-alternate-emails"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        alternateEmails: event.target.value,
                      }))
                    }
                    value={draft.alternateEmails}
                  />
                </FormField>
              </div>
            </section>

            <section className="client-modal-section">
              <p className="label-caps">Preferencias y cartera</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="customer-source-editor" label="Procedencia">
                  <Select
                    value={draft.sourceId || "NONE"}
                    onValueChange={(value) =>
                      onDraftChange((current) => ({
                        ...current,
                        sourceId: value === "NONE" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger
                      className={controlClass}
                      id="customer-source-editor"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin procedencia</SelectItem>
                      {sources
                        .filter((source) => source.active)
                        .map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  htmlFor="customer-contact-preference"
                  label="Preferencia de contacto"
                >
                  <Select
                    value={draft.contactPreference}
                    onValueChange={(value) =>
                      onDraftChange((current) => ({
                        ...current,
                        contactPreference:
                          value as SchedulerCustomerContactPreference,
                      }))
                    }
                  >
                    <SelectTrigger
                      className={controlClass}
                      id="customer-contact-preference"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(contactPreferenceLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField htmlFor="customer-locale" label="Idioma / locale">
                  <Input
                    className={controlClass}
                    id="customer-locale"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        preferredLocale: event.target.value,
                      }))
                    }
                    placeholder="es-MX"
                    value={draft.preferredLocale}
                  />
                </FormField>
                <FormField htmlFor="customer-active" label="Estado">
                  <Select
                    value={draft.active ? "ACTIVE" : "INACTIVE"}
                    onValueChange={(value) =>
                      onDraftChange((current) => ({
                        ...current,
                        active: value === "ACTIVE",
                      }))
                    }
                  >
                    <SelectTrigger
                      className={controlClass}
                      id="customer-active"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField htmlFor="customer-notes" label="Notas generales">
                  <Textarea
                    className="client-modal-control min-h-24"
                    id="customer-notes"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        notes: event.target.value,
                      }))
                    }
                    value={draft.notes}
                  />
                </FormField>
                <FormField
                  htmlFor="customer-profile-notes"
                  label="Notas del perfil"
                >
                  <Textarea
                    className="client-modal-control min-h-24"
                    id="customer-profile-notes"
                    onChange={(event) =>
                      onDraftChange((value) => ({
                        ...value,
                        profileNotes: event.target.value,
                      }))
                    }
                    value={draft.profileNotes}
                  />
                </FormField>
              </div>
            </section>

            {activeDefinitions.length ? (
              <section className="client-modal-section">
                <p className="label-caps">Campos personalizados</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {activeDefinitions.map((definition) => (
                    <FormField
                      key={definition.id}
                      htmlFor={`custom-${definition.id}`}
                      label={definition.label}
                      required={definition.required}
                      hint={fieldTypeLabels[definition.type]}
                    >
                      <CustomerCustomField
                        definition={definition}
                        onChange={(value) =>
                          onDraftChange((current) => ({
                            ...current,
                            customFields: {
                              ...current.customFields,
                              [definition.id]: value,
                            },
                          }))
                        }
                        value={draft.customFields[definition.id]}
                      />
                    </FormField>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <DialogFooter className="flex-row justify-between gap-3 border-t border-[#eee6df] px-6 py-4 sm:px-8 sm:space-x-0">
            <Button
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
              disabled={
                saving || definitionsLoading || Boolean(definitionsError)
              }
              type="submit"
            >
              {saving ? "Guardando…" : "Guardar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerCustomField({
  definition,
  value,
  onChange,
}: {
  definition: SchedulerCustomerFieldDefinitionDto;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const id = `custom-${definition.id}`;
  if (definition.type === "BOOLEAN") {
    return (
      <Select
        value={value === true ? "YES" : "NO"}
        onValueChange={(next) => onChange(next === "YES")}
      >
        <SelectTrigger className={controlClass} id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="YES">Sí</SelectItem>
          <SelectItem value="NO">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (definition.type === "SELECT") {
    return (
      <Select
        value={String(value || "NONE")}
        onValueChange={(next) => onChange(next === "NONE" ? "" : next)}
      >
        <SelectTrigger className={controlClass} id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">Sin seleccionar</SelectItem>
          {definition.options?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      className={controlClass}
      id={id}
      onChange={(event) => onChange(event.target.value)}
      type={
        definition.type === "DATE"
          ? "date"
          : definition.type === "NUMBER"
            ? "number"
            : "text"
      }
      value={String(value ?? "")}
    />
  );
}

function CustomerRecordDialog({
  canWrite,
  configured,
  detail,
  errors,
  financial,
  financialPage,
  loading,
  onClose,
  onEdit,
  onPageChange,
  onSecretChange,
  onUnlock,
  open,
  recordCustomer,
  secrets,
  visits,
  visitPage,
}: {
  canWrite: boolean;
  configured: boolean;
  detail: SchedulerCustomerDetailDto | null;
  errors: Record<SensitiveSection, string | null>;
  financial: SchedulerCustomerFinancialHistoryDto | null;
  financialPage: number;
  loading: SensitiveSection | null;
  onClose: () => void;
  onEdit: () => void;
  onPageChange: (section: "visits" | "financial", page: number) => void;
  onSecretChange: (section: SensitiveSection, value: string) => void;
  onUnlock: (section: SensitiveSection) => void;
  open: boolean;
  recordCustomer: SchedulerCustomerSummaryDto | null;
  secrets: Record<SensitiveSection, string>;
  visits: SchedulerCustomerVisitHistoryDto | null;
  visitPage: number;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-[880px] gap-0 overflow-hidden rounded-[28px] border-[#e7ddd4] bg-white p-0 shadow-[0_28px_90px_rgba(21,31,43,0.28)]">
        <DialogHeader className="border-b border-[#eee6df] px-6 py-5 pr-14 text-left sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5ede4] text-lg font-semibold text-[#ad8b67]">
              {initials(recordCustomer?.displayName ?? "")}
            </span>
            <div>
              <p className="label-caps">Expediente protegido</p>
              <DialogTitle className="mt-1 text-xl text-[#263649]">
                {recordCustomer?.displayName}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Cada sección requiere una autorización independiente y
                auditable.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[calc(92vh-105px)] space-y-5 overflow-y-auto bg-[#faf8f6] p-5 sm:p-6">
          <section className="client-modal-section">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-[#ad8b67]" />
                <h3 className="font-semibold">Perfil e identidad</h3>
              </div>
              {detail && canWrite ? (
                <Button
                  className="rounded-xl"
                  onClick={onEdit}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                </Button>
              ) : null}
            </div>
            {!detail ? (
              <LockedSection
                configured={configured}
                description="Permite ver contacto, alias, correos, campos y notas durante dos minutos."
                error={errors.profile}
                id="profile-secret"
                loading={loading === "profile"}
                onSecretChange={(value) => onSecretChange("profile", value)}
                onUnlock={() => onUnlock("profile")}
                secret={secrets.profile}
                title="Autorizar expediente"
              />
            ) : (
              <CustomerProfile detail={detail} />
            )}
          </section>

          <section className="client-modal-section">
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-[#ad8b67]" />
              <h3 className="font-semibold">Historial de visitas</h3>
            </div>
            {!visits ? (
              <LockedSection
                configured={configured}
                description={`Autoriza la página ${visitPage}; el código no se conserva para navegar.`}
                error={errors.visits}
                id="visits-secret"
                loading={loading === "visits"}
                onSecretChange={(value) => onSecretChange("visits", value)}
                onUnlock={() => onUnlock("visits")}
                secret={secrets.visits}
                title="Autorizar visitas"
              />
            ) : (
              <VisitHistory
                data={visits}
                onPageChange={(next) => onPageChange("visits", next)}
              />
            )}
          </section>

          <section className="client-modal-section">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-[#ad8b67]" />
                <h3 className="font-semibold">Historial financiero</h3>
              </div>
              <Badge variant="outline">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Sólo lectura · POS
              </Badge>
            </div>
            {!financial ? (
              <LockedSection
                configured={configured}
                description={`Autoriza la página ${financialPage}; Scheduler nunca edita ni elimina pagos.`}
                error={errors.financial}
                id="financial-secret"
                loading={loading === "financial"}
                onSecretChange={(value) => onSecretChange("financial", value)}
                onUnlock={() => onUnlock("financial")}
                secret={secrets.financial}
                title="Autorizar finanzas"
              />
            ) : (
              <FinancialHistory
                data={financial}
                onPageChange={(next) => onPageChange("financial", next)}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerProfile({ detail }: { detail: SchedulerCustomerDetailDto }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#faf8f5] p-4">
          <Mail className="h-4 w-4 text-[#ad8b67]" />
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
            Correo
          </p>
          <p className="mt-1 break-all font-medium">
            {detail.email || "Sin correo"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#faf8f5] p-4">
          <UserRound className="h-4 w-4 text-[#ad8b67]" />
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
            Teléfono
          </p>
          <p className="mt-1 font-medium">{detail.phone || "Sin teléfono"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{detail.active ? "Activo" : "Inactivo"}</Badge>
        {detail.source ? (
          <Badge variant="outline">{detail.source.name}</Badge>
        ) : null}
        {detail.profile ? (
          <Badge variant="outline">
            {contactPreferenceLabels[detail.profile.contactPreference]}
          </Badge>
        ) : null}
        {detail.aliases.map((alias) => (
          <Badge key={alias} variant="outline">
            Alias: {alias}
          </Badge>
        ))}
        {detail.emails
          .filter((email) => !email.isPrimary)
          .map((email) => (
            <Badge key={email.email} variant="outline">
              Correo alterno: {email.email}
            </Badge>
          ))}
        {detail.mergeHistory.length ? (
          <Badge variant="outline">
            {detail.mergeHistory.length} eventos de fusión
          </Badge>
        ) : null}
      </div>
      {detail.customFields.length ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {detail.customFields.map((field) => (
            <div
              className="rounded-xl border border-[#eee6df] bg-white p-3"
              key={field.definitionId}
            >
              <dt className="text-xs text-slate-400">{field.label}</dt>
              <dd className="mt-1 text-sm font-medium">
                {String(field.value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {detail.notes || detail.profile?.notes || "Sin notas registradas."}
      </p>
      <div className="rounded-xl border border-[#eee6df] bg-white p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <MapPin className="h-3.5 w-3.5" /> Cartera vigente
        </p>
        {detail.currentPortfolios.length ? (
          detail.currentPortfolios.map((portfolio) => (
            <p className="mt-2 text-sm" key={portfolio.id}>
              {portfolio.branchName ?? "Todas las sucursales"} ·{" "}
              {portfolio.ownerName ?? "Empresa"}
            </p>
          ))
        ) : (
          <p className="mt-2 text-sm text-slate-500">Sin cartera vigente.</p>
        )}
      </div>
    </div>
  );
}

function VisitHistory({
  data,
  onPageChange,
}: {
  data: SchedulerCustomerVisitHistoryDto;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-3">
      {data.items.length ? (
        data.items.map((visit) => (
          <article
            className="rounded-xl border border-[#eee6df] bg-white p-4"
            key={`${visit.origin}:${visit.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{visit.serviceName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {visit.branchName} ·{" "}
                  {formatDateTime(visit.scheduledAt ?? visit.createdAt)}
                </p>
              </div>
              <Badge variant="outline">{visit.status}</Badge>
            </div>
          </article>
        ))
      ) : (
        <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
          Sin visitas registradas.
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Página {data.page} · {data.total} visitas
        </span>
        <div className="flex gap-2">
          <Button
            disabled={data.page <= 1}
            onClick={() => onPageChange(data.page - 1)}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => onPageChange(data.page + 1)}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FinancialHistory({
  data,
  onPageChange,
}: {
  data: SchedulerCustomerFinancialHistoryDto;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-3">
      {data.items.length ? (
        data.items.map((ticket) => (
          <article
            className="rounded-xl border border-[#eee6df] bg-white p-4"
            key={ticket.ticketId}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{ticket.folio}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {ticket.branchName} · {ticket.businessDate} · {ticket.status}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {formatMoney(ticket.total)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Pagado {formatMoney(ticket.amountPaid)}</span>
              <span>·</span>
              <span>Pendiente {formatMoney(ticket.pendingAmount)}</span>
            </div>
            {ticket.payments.length ? (
              <div className="mt-3 border-t border-[#eee6df] pt-3">
                {ticket.payments.map((payment) => (
                  <p
                    className="flex justify-between gap-3 text-xs text-slate-500"
                    key={payment.operationId}
                  >
                    <span>
                      {payment.method} · {payment.operationFolio}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(payment.amount)}
                    </span>
                  </p>
                ))}
              </div>
            ) : null}
          </article>
        ))
      ) : (
        <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
          Sin movimientos financieros.
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Página {data.page} · {data.total} tickets
        </span>
        <div className="flex gap-2">
          <Button
            disabled={data.page <= 1}
            onClick={() => onPageChange(data.page - 1)}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => onPageChange(data.page + 1)}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MergeDialog({
  error,
  mergeReason,
  mergeSecret,
  mergeTargetId,
  merging,
  onOpenChange,
  onReasonChange,
  onSecretChange,
  onSubmit,
  onTargetChange,
  open,
  selection,
}: {
  error: string | null;
  mergeReason: string;
  mergeSecret: string;
  mergeTargetId: string;
  merging: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (value: string) => void;
  onSecretChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onTargetChange: (value: string) => void;
  open: boolean;
  selection: SchedulerCustomerSummaryDto[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] gap-0 overflow-hidden rounded-[26px] border-[#e7ddd4] bg-white p-0 shadow-[0_24px_70px_rgba(38,54,73,0.2)]">
        <form onSubmit={onSubmit}>
          <DialogHeader className="border-b border-[#eee6df] px-6 py-5 text-left">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
              <GitMerge className="h-5 w-5" />
            </span>
            <DialogTitle className="page-title text-3xl text-[#263649]">
              Combinar clientes
            </DialogTitle>
            <DialogDescription className="mt-1 leading-6">
              El destino conserva sus datos ante colisiones; el origen se
              desactiva y el evento queda auditado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 bg-[#faf8f6] px-6 py-5">
            <FormField
              htmlFor="merge-target"
              label="Identidad que se conservará"
              required
            >
              <Select value={mergeTargetId} onValueChange={onTargetChange}>
                <SelectTrigger className={controlClass} id="merge-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selection.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.displayName} · v{customer.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4 text-sm text-slate-500">
              Origen:{" "}
              <strong className="text-[#263649]">
                {selection.find((item) => item.id !== mergeTargetId)
                  ?.displayName ?? "Selecciona destino"}
              </strong>
              <ArrowRight className="mx-2 inline h-4 w-4" /> Destino:{" "}
              <strong className="text-[#263649]">
                {selection.find((item) => item.id === mergeTargetId)
                  ?.displayName ?? "—"}
              </strong>
            </div>
            <FormField
              htmlFor="merge-reason"
              label="Motivo"
              required
              hint="Mínimo 10 caracteres."
            >
              <Textarea
                className="client-modal-control min-h-24"
                id="merge-reason"
                onChange={(event) => onReasonChange(event.target.value)}
                value={mergeReason}
              />
            </FormField>
            <FormField htmlFor="merge-secret" label="Código personal" required>
              <Input
                autoComplete="one-time-code"
                className={`${controlClass} tracking-[0.2em]`}
                id="merge-secret"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) =>
                  onSecretChange(event.target.value.replace(/\D/g, ""))
                }
                type="password"
                value={mergeSecret}
              />
            </FormField>
            {error ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-[#eee6df] px-6 py-4 sm:space-x-0">
            <Button
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
              disabled={
                merging || !mergeSecret || mergeReason.trim().length < 10
              }
              type="submit"
            >
              {merging ? "Fusionando…" : "Confirmar fusión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
