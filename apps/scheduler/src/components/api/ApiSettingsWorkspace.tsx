"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  SCHEDULER_SETTING_SECTIONS,
  type SchedulerSettingScope,
  type SchedulerSettingSection,
} from "@cosmetics/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
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
  CircleHelp,
  KeyRound,
  LockKeyhole,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { schedulerApi } from "@/lib/api";
import {
  schedulerAgendaSettingsChangeEvent,
  schedulerAgendaSettingsStorageKey,
  schedulerAgendaSlotOptions,
} from "@/lib/scheduler-agenda-settings";
import {
  buildSchedulerSettingLayerDocument,
  getSchedulerSettingValue,
  resolveSchedulerSettingDocumentForScope,
  schedulerSettingDefinitions,
  type SchedulerSettingFieldDefinition,
  validateSchedulerSettingDocument,
} from "@/lib/scheduler-settings-presentation";
import { useSchedulerSession } from "@/lib/session";
import {
  ConflictNotice,
  QueryBoundary,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

const SETTINGS_SECTION_CHANGE_EVENT = "scheduler-settings-section-change";

function isSettingSection(
  value: string | null,
): value is SchedulerSettingSection {
  return SCHEDULER_SETTING_SECTIONS.some((section) => section === value);
}

function SettingsHeader({ section }: { section: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
      <div className="flex min-h-[78px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
        <div>
          <p className="page-title text-[1.55rem] text-white">
            Configuraciones
          </p>
          <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/45">
            {section}
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-50 sm:flex">
          <Check className="h-4 w-4" aria-hidden="true" /> Configuración
          versionada
        </div>
      </div>
    </header>
  );
}

function PersonalSecretSettings() {
  const { bootstrap, refresh } = useSchedulerSession();
  const [saving, setSaving] = useState(false);
  const secretSchema = z
    .object({
      currentPassword: z.string().min(1, "Captura tu contraseña actual."),
      secret: z
        .string()
        .regex(/^\d{4,12}$/, "El código debe tener de 4 a 12 dígitos."),
      confirmation: z.string(),
    })
    .refine((value) => value.secret === value.confirmation, {
      message: "La confirmación no coincide con el código.",
      path: ["confirmation"],
    });
  type SecretForm = z.infer<typeof secretSchema>;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty: dirty },
  } = useForm<SecretForm>({
    defaultValues: { currentPassword: "", secret: "", confirmation: "" },
  });
  const secret = watch("secret");
  const confirmation = watch("confirmation");

  useEffect(() => {
    window.localStorage.removeItem("keysar-scheduler-authorizations-settings");
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  async function save(values: SecretForm) {
    const parsed = secretSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "currentPassword" ||
          field === "secret" ||
          field === "confirmation"
        ) {
          setError(field, { message: issue.message });
        }
      }
      return;
    }
    setSaving(true);
    try {
      await schedulerApi.updateSecondarySecret({
        currentPassword: parsed.data.currentPassword,
        secret: parsed.data.secret,
      });
      reset();
      await refresh();
      toast.success("Código personal actualizado.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el código.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <SettingsHeader section="Código personal" />
      <main className="mx-auto max-w-4xl p-4 sm:p-6 xl:p-8">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <p className="settings-kicker">Seguridad de cuenta</p>
              <h1 className="settings-title">
                Código de autorización secundario
              </h1>
              <p className="settings-description">
                Confirma tu contraseña y registra un código personal. Nunca se
                muestran códigos de otras personas.
              </p>
            </div>
            <Badge variant="outline">
              <KeyRound className="mr-1 h-3.5 w-3.5" />
              {bootstrap?.secondaryAuthorizationConfigured
                ? "Configurado"
                : "Pendiente"}
            </Badge>
          </div>
          <div className="settings-form-grid md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                {...register("currentPassword")}
              />
              {errors.currentPassword ? (
                <p className="text-xs text-rose-600" role="alert">
                  {errors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-secret">Nuevo código</Label>
              <Input
                id="new-secret"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={12}
                aria-invalid={Boolean(errors.secret)}
                value={secret}
                onChange={(event) =>
                  setValue("secret", event.target.value.replace(/\D/g, ""), {
                    shouldDirty: true,
                  })
                }
              />
              {errors.secret ? (
                <p className="text-xs text-rose-600" role="alert">
                  {errors.secret.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-secret">Confirmar código</Label>
              <Input
                id="confirm-secret"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={12}
                aria-invalid={Boolean(errors.confirmation)}
                value={confirmation}
                onChange={(event) =>
                  setValue(
                    "confirmation",
                    event.target.value.replace(/\D/g, ""),
                    { shouldDirty: true },
                  )
                }
              />
              {errors.confirmation ? (
                <p className="text-xs text-rose-600" role="alert">
                  {errors.confirmation.message}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end md:col-span-3">
              <Button
                disabled={saving || !dirty}
                onClick={() => void handleSubmit(save)()}
              >
                <Save className="mr-2 h-4 w-4" />{" "}
                {saving ? "Guardando…" : "Guardar código"}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ToggleField({
  checked,
  disabled,
  field,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  field: SchedulerSettingFieldDefinition;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5 rounded-[18px] border border-[#eee6df] bg-white p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{field.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {field.description}
        </p>
      </div>
      <button
        aria-checked={checked}
        aria-label={field.label}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#ad8b67]" : "bg-slate-200"}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function ObjectListField({
  disabled,
  field,
  value,
  onChange,
}: {
  disabled: boolean;
  field: SchedulerSettingFieldDefinition;
  value: unknown;
  onChange: (value: unknown[]) => void;
}) {
  const items = Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  const valueKey = field.itemValueKey ?? "name";
  const [draft, setDraft] = useState("");

  function add() {
    const clean = draft.trim();
    if (!clean) return;
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        [valueKey]: clean,
        ...(field.path === "senders" ? { confirmed: false } : {}),
        ...(field.path === "categories" ? { fields: [] } : {}),
      },
    ]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>{field.label}</Label>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {field.description}
        </p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            className="flex items-center gap-2"
            key={String(item.id ?? `${field.path}-${index}`)}
          >
            <Input
              aria-label={`${field.itemLabel ?? "Elemento"} ${index + 1}`}
              disabled={disabled}
              type={field.kind === "email-list" ? "email" : "text"}
              value={String(item[valueKey] ?? "")}
              onChange={(event) =>
                onChange(
                  items.map((current, itemIndex) =>
                    itemIndex === index
                      ? { ...current, [valueKey]: event.target.value }
                      : current,
                  ),
                )
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  aria-label={`Eliminar ${field.itemLabel ?? "elemento"} ${index + 1}`}
                  disabled={disabled}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Eliminar {field.itemLabel?.toLowerCase() ?? "elemento"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Se retirará de esta capa al guardar los cambios.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Conservar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-600 hover:bg-rose-700"
                    onClick={() =>
                      onChange(
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          disabled={disabled}
          placeholder={`Nueva ${field.itemLabel?.toLowerCase() ?? "opción"}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button
          disabled={disabled || !draft.trim()}
          onClick={add}
          type="button"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar
        </Button>
      </div>
    </div>
  );
}

function SettingField({
  document,
  disabled,
  field,
  onChange,
}: {
  document: Record<string, unknown>;
  disabled: boolean;
  field: SchedulerSettingFieldDefinition;
  onChange: (path: string, value: unknown) => void;
}) {
  const value = getSchedulerSettingValue(document, field.path);
  if (field.kind === "boolean") {
    return (
      <ToggleField
        checked={Boolean(value)}
        disabled={disabled}
        field={field}
        onChange={(next) => onChange(field.path, next)}
      />
    );
  }
  if (field.kind === "object-list" || field.kind === "email-list") {
    return (
      <ObjectListField
        disabled={disabled}
        field={field}
        value={value}
        onChange={(next) => onChange(field.path, next)}
      />
    );
  }
  if (field.kind === "select") {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <p className="settings-field-help">{field.description}</p>
        <Select
          disabled={disabled}
          value={String(value ?? "")}
          onValueChange={(next) => onChange(field.path, next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  const inputType =
    field.kind === "integer"
      ? "number"
      : field.kind === "url"
        ? "url"
        : field.kind === "color"
          ? "color"
          : "text";
  return (
    <div className="space-y-2">
      <Label htmlFor={`setting-${field.path}`}>{field.label}</Label>
      <p className="settings-field-help">{field.description}</p>
      {field.kind === "textarea" ? (
        <Textarea
          id={`setting-${field.path}`}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(event) => onChange(field.path, event.target.value)}
        />
      ) : (
        <div
          className={
            field.kind === "color" ? "flex items-center gap-3" : undefined
          }
        >
          <Input
            className={
              field.kind === "color"
                ? "h-11 w-16 cursor-pointer p-1"
                : undefined
            }
            id={`setting-${field.path}`}
            disabled={disabled}
            max={field.max}
            min={field.min}
            placeholder={field.placeholder}
            type={inputType}
            value={
              field.kind === "integer"
                ? Number(value ?? 0)
                : String(value ?? "")
            }
            onChange={(event) =>
              onChange(
                field.path,
                field.kind === "integer"
                  ? Number(event.target.value)
                  : event.target.value,
              )
            }
          />
          {field.kind === "color" ? (
            <span className="font-mono text-xs text-slate-500">
              {String(value ?? "")}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function LocalAgendaDensity() {
  const [value, setValue] = useState("60");
  useEffect(() => {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(schedulerAgendaSettingsStorageKey) ?? "{}",
      ) as { slotMinutes?: number | string };
      const slot = Number(parsed.slotMinutes);
      if (
        schedulerAgendaSlotOptions.includes(
          slot as (typeof schedulerAgendaSlotOptions)[number],
        )
      )
        setValue(String(slot));
    } catch {
      window.localStorage.removeItem(schedulerAgendaSettingsStorageKey);
    }
  }, []);

  function save(next: string) {
    let current: Record<string, unknown> = {};
    try {
      current = JSON.parse(
        window.localStorage.getItem(schedulerAgendaSettingsStorageKey) ?? "{}",
      ) as Record<string, unknown>;
    } catch {
      current = {};
    }
    window.localStorage.setItem(
      schedulerAgendaSettingsStorageKey,
      JSON.stringify({ ...current, slotMinutes: Number(next) }),
    );
    window.dispatchEvent(new CustomEvent(schedulerAgendaSettingsChangeEvent));
    setValue(next);
    toast.success("Densidad visual actualizada.");
  }

  return (
    <section className="settings-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="settings-kicker">Preferencia de este dispositivo</p>
          <h2 className="font-semibold text-slate-700">
            Duración visual de las filas
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
            Sólo cambia la densidad del calendario. No autoriza horarios ni
            disponibilidad y no se envía al servidor.
          </p>
        </div>
        <Select value={value} onValueChange={save}>
          <SelectTrigger className="w-full md:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {schedulerAgendaSlotOptions.map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {minutes} minutos
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

function ContextSelect({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ApiSettingsWorkspace() {
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const { bootstrap } = useSchedulerSession();
  const section: SchedulerSettingSection = isSettingSection(requestedSection)
    ? requestedSection
    : "company";
  const definition = schedulerSettingDefinitions[section];
  const [scope, setScope] = useState<SchedulerSettingScope>("COMMERCE");
  const [commerceId, setCommerceId] = useState("");
  const [branchProfileId, setBranchProfileId] = useState("");
  const [initialDocument, setInitialDocument] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty: dirty },
  } = useForm<Record<string, unknown>>({ defaultValues: {} });
  const draftDocument = watch();

  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "operational-catalog" },
  );
  useEffect(() => {
    if (!commerceId && catalog.data?.commerces[0])
      setCommerceId(catalog.data.commerces[0].id);
  }, [catalog.data, commerceId]);
  const authorizedProfiles = useMemo(
    () =>
      catalog.data?.branches.filter(
        (branch) =>
          branch.commerceId === commerceId &&
          bootstrap?.authorizedBranchIds.includes(branch.branchId),
      ) ?? [],
    [bootstrap?.authorizedBranchIds, catalog.data?.branches, commerceId],
  );
  useEffect(() => {
    if (!authorizedProfiles.some((branch) => branch.id === branchProfileId))
      setBranchProfileId(authorizedProfiles[0]?.id ?? "");
  }, [authorizedProfiles, branchProfileId]);

  const resolved = useSchedulerQuery(
    () =>
      schedulerApi.resolvedSetting(section, {
        commerceId,
        ...(branchProfileId ? { branchProfileId } : {}),
      }),
    [section, commerceId, branchProfileId],
    {
      queryKey: `settings:${section}`,
      branchId: branchProfileId,
      enabled: Boolean(commerceId),
    },
  );
  const contextKey = `${section}:${commerceId}:${branchProfileId}:${scope}`;
  useEffect(() => {
    if (!resolved.data) return;
    const next = resolveSchedulerSettingDocumentForScope(
      resolved.data,
      scope,
      definition.defaults,
    );
    setInitialDocument(next);
    reset(structuredClone(next));
    setConflict(null);
  }, [contextKey, definition.defaults, reset, resolved.data, scope]);
  const permission = bootstrap?.permissions.find(
    (item) => item.screenKey === `scheduler/settings/${section}`,
  );
  const canWrite =
    scope === "USER"
      ? (permission?.capabilities.includes("WRITE") ?? false)
      : (permission?.capabilities.includes("ADMIN") ?? false);
  const currentLayer = resolved.data?.layers.find(
    (layer) => layer.scope === scope,
  );

  const confirmDiscard = useCallback(
    () =>
      !dirty ||
      window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?"),
    [dirty],
  );
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const sectionChange = (event: Event) => {
      if (
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?",
        )
      )
        event.preventDefault();
    };
    const documentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        link.target === "_blank" ||
        link.dataset.settingsSection ||
        link.href === window.location.href
      )
        return;
      if (
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(SETTINGS_SECTION_CHANGE_EVENT, sectionChange);
    document.addEventListener("click", documentClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener(SETTINGS_SECTION_CHANGE_EVENT, sectionChange);
      document.removeEventListener("click", documentClick, true);
    };
  }, [dirty]);

  if (requestedSection === "authorizations") return <PersonalSecretSettings />;

  function updateContext(action: () => void) {
    if (confirmDiscard()) action();
  }

  async function save(values: Record<string, unknown>) {
    if (!initialDocument || !canWrite) return;
    if (scope === "BRANCH" && !branchProfileId) {
      toast.warning("Selecciona una sucursal para editar esta capa.");
      return;
    }
    const parsed = z.record(z.unknown()).safeParse(values);
    if (!parsed.success) {
      toast.warning("La configuración contiene un valor inválido.");
      return;
    }
    const validationError = validateSchedulerSettingDocument(
      definition,
      parsed.data,
    );
    if (validationError) {
      toast.warning(validationError);
      return;
    }
    const document = buildSchedulerSettingLayerDocument({
      currentLayer: currentLayer?.document ?? {},
      initialEffective: initialDocument,
      editedEffective: parsed.data,
      fieldPaths: definition.fields.map((field) => field.path),
    });
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.updateSetting(section, {
          scope,
          commerceId,
          ...(scope === "BRANCH" ? { branchProfileId } : {}),
          document,
          ...(currentLayer ? { expectedVersion: currentLayer.version } : {}),
        }),
      {
        onSuccess: async () => {
          toast.success("Configuración guardada.");
          await resolved.reload();
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: [`settings:${section}`],
      },
    );
    setSaving(false);
  }

  const groups = [...new Set(definition.fields.map((field) => field.group))];
  const knownTopLevelKeys = new Set(
    definition.fields.map((field) => field.path.split(".")[0]),
  );
  const unknownKeys = Object.keys(currentLayer?.document ?? {}).filter(
    (key) => !knownTopLevelKeys.has(key),
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <SettingsHeader section={definition.title} />
      <main className="mx-auto min-w-0 max-w-[1440px] space-y-4 p-4 sm:p-6 xl:p-8">
        <section className="settings-card p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ContextSelect label="Comercio">
              <Select
                value={commerceId}
                onValueChange={(value) =>
                  updateContext(() => setCommerceId(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.data?.commerces
                    .filter((item) => item.active)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </ContextSelect>
            <ContextSelect label="Sucursal de contexto">
              <Select
                value={branchProfileId}
                onValueChange={(value) =>
                  updateContext(() => setBranchProfileId(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {authorizedProfiles.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ContextSelect>
            <ContextSelect label="Capa a editar">
              <Select
                value={scope}
                onValueChange={(value) =>
                  updateContext(() => setScope(value as SchedulerSettingScope))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMERCE">Comercio</SelectItem>
                  <SelectItem value="BRANCH" disabled={!branchProfileId}>
                    Sucursal
                  </SelectItem>
                  <SelectItem value="USER">Mi usuario</SelectItem>
                </SelectContent>
              </Select>
            </ContextSelect>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">
              Precedencia: COMMERCE → BRANCH → USER
            </Badge>
            {resolved.data?.layers.map((layer) => (
              <Badge
                key={`${layer.scope}-${layer.scopeReferenceId}`}
                variant={layer.scope === scope ? "default" : "outline"}
              >
                {layer.scope} v{layer.version}
              </Badge>
            ))}
            {!canWrite ? (
              <Badge variant="outline">
                <LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura en
                esta capa
              </Badge>
            ) : null}
          </div>
        </section>

        <ConflictNotice
          message={conflict}
          onReload={() => {
            if (!confirmDiscard()) return;
            setConflict(null);
            void resolved.reload();
          }}
        />
        <QueryBoundary
          loading={catalog.loading || resolved.loading || !initialDocument}
          error={catalog.error ?? resolved.error}
          onRetry={() => {
            void catalog.reload();
            void resolved.reload();
          }}
        >
          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <p className="settings-kicker">{definition.eyebrow}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="settings-title">{definition.title}</h1>
                  {dirty ? (
                    <span className="settings-unsaved-badge">
                      <span /> Cambios sin guardar
                    </span>
                  ) : null}
                </div>
                <p className="settings-description">{definition.description}</p>
              </div>
              {definition.fields.length && canWrite ? (
                <Button
                  className={
                    dirty
                      ? "settings-primary-save settings-primary-save-dirty"
                      : "settings-primary-save"
                  }
                  disabled={!dirty || saving}
                  onClick={() => void handleSubmit(save)()}
                >
                  <Save className="mr-2 h-4 w-4" />{" "}
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              ) : null}
            </div>
            <div className="settings-info-banner m-5 sm:m-6">
              <CircleHelp className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Efecto real</p>
                <p className="mt-1 text-xs leading-5">{definition.consumer}</p>
              </div>
            </div>
            {unknownKeys.length ? (
              <div className="mx-5 mb-5 flex gap-3 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 sm:mx-6 sm:mb-6">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Esta capa contiene {unknownKeys.length}{" "}
                  {unknownKeys.length === 1
                    ? "clave adicional"
                    : "claves adicionales"}
                  . Se conservarán sin mostrarlas ni sobrescribirlas.
                </p>
              </div>
            ) : null}
          </section>

          {section === "agenda" ? <LocalAgendaDensity /> : null}

          {definition.fields.length === 0 ? (
            <section className="settings-card flex min-h-[300px] items-center justify-center p-8 text-center">
              <div className="max-w-lg">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f5ede4] text-[#ad8b67]">
                  <Settings2 className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-lg font-semibold text-slate-700">
                  Sin campos documentales
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Las credenciales y el proveedor de integración no se exponen
                  ni se guardan en este formulario.
                </p>
              </div>
            </section>
          ) : null}

          {groups.map((group) => (
            <section className="settings-card" key={group}>
              <div className="settings-section-heading">
                <h2 className="font-semibold text-slate-700">{group}</h2>
              </div>
              <div className="settings-form-grid md:grid-cols-2">
                {definition.fields
                  .filter((field) => field.group === group)
                  .map((field) => (
                    <SettingField
                      key={field.path}
                      document={draftDocument}
                      disabled={!canWrite || saving}
                      field={field}
                      onChange={(path, value) =>
                        setValue(path, value, { shouldDirty: true })
                      }
                    />
                  ))}
              </div>
            </section>
          ))}

          {dirty ? (
            <div className="settings-unsaved-bar" role="status">
              <span className="settings-unsaved-dot" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">
                  Tienes cambios sin guardar
                </p>
                <p className="text-xs text-slate-500">
                  Se guardarán únicamente en la capa seleccionada.
                </p>
              </div>
              <Button
                className="settings-unsaved-save"
                disabled={saving || !canWrite}
                onClick={() => void handleSubmit(save)()}
              >
                <Save className="mr-2 h-4 w-4" /> Guardar ahora
              </Button>
              <Button
                className="settings-unsaved-cancel"
                disabled={saving}
                onClick={() => reset(initialDocument ?? {})}
                variant="outline"
              >
                Cancelar cambios
              </Button>
            </div>
          ) : null}
        </QueryBoundary>
      </main>
    </div>
  );
}
