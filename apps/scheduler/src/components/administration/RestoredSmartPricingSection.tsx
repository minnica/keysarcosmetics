"use client";

import { useMemo, useState } from "react";
import {
  CalendarRange,
  Clock3,
  DollarSign,
  Pause,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type {
  SchedulerOperationalCatalogDto,
  SchedulerWeekday,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MultiCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import type {
  DesignSmartPricingRecommendation,
  DesignSmartPricingStrategy,
  DesignSmartPricingStrategyInput,
  DesignSmartPricingWindow,
} from "../../../design/contracts";
import { schedulerApi } from "@/lib/api";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
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

const weekdayLabels: Record<SchedulerWeekday, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

const weekdayOptions = Object.entries(weekdayLabels) as Array<
  [SchedulerWeekday, string]
>;

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function discountLabel(window: DesignSmartPricingWindow) {
  return window.discountType === "PERCENTAGE"
    ? `${window.maximumDiscount}%`
    : money.format(window.maximumDiscount);
}

function emptyWindow(): DesignSmartPricingWindow {
  return {
    id: `draft-window-${Date.now()}`,
    weekday: "TUESDAY",
    startMinute: 9 * 60,
    endMinute: 12 * 60,
    discountType: "PERCENTAGE",
    maximumDiscount: 20,
  };
}

function emptyDraft(
  catalog?: SchedulerOperationalCatalogDto,
): DesignSmartPricingStrategyInput {
  return {
    commerceId: catalog?.commerces[0]?.id ?? "",
    branchProfileId: catalog?.branches[0]?.id ?? "",
    name: "",
    active: true,
    serviceProfileIds: [],
    professionalProfileIds: [],
    windows: [emptyWindow()],
    validFrom: null,
    validTo: null,
  };
}

function draftFromStrategy(
  strategy: DesignSmartPricingStrategy,
): DesignSmartPricingStrategyInput {
  return {
    id: strategy.id,
    commerceId: strategy.commerceId,
    branchProfileId: strategy.branchProfileId,
    name: strategy.name,
    active: strategy.active,
    serviceProfileIds: [...strategy.serviceProfileIds],
    professionalProfileIds: [...strategy.professionalProfileIds],
    windows: strategy.windows.map((window) => ({ ...window })),
    validFrom: strategy.validFrom,
    validTo: strategy.validTo,
    expectedVersion: strategy.currentVersion,
  };
}

function draftFromRecommendation(
  recommendation: DesignSmartPricingRecommendation,
  catalog: SchedulerOperationalCatalogDto,
  existing?: DesignSmartPricingStrategy,
): DesignSmartPricingStrategyInput {
  return {
    ...(existing ? { id: existing.id } : {}),
    commerceId: existing?.commerceId ?? catalog.commerces[0]?.id ?? "",
    branchProfileId: recommendation.branchProfileId,
    name:
      existing?.name ?? `Horas de baja demanda · ${recommendation.branchName}`,
    active: true,
    serviceProfileIds: existing?.serviceProfileIds ?? [],
    professionalProfileIds: existing?.professionalProfileIds ?? [],
    windows: recommendation.windows.map((window) => ({ ...window })),
    validFrom: existing?.validFrom ?? null,
    validTo: existing?.validTo ?? null,
    ...(existing ? { expectedVersion: existing.currentVersion } : {}),
  };
}

function SmartPricingDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  catalog,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: DesignSmartPricingStrategyInput;
  setDraft: React.Dispatch<
    React.SetStateAction<DesignSmartPricingStrategyInput>
  >;
  catalog: SchedulerOperationalCatalogDto;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const branch = catalog.branches.find(
    (item) => item.id === draft.branchProfileId,
  );
  const serviceOptions = catalog.services
    .filter(
      (item) =>
        item.active &&
        item.acceptsOnline &&
        item.branchProfileIds.includes(draft.branchProfileId),
    )
    .map((item) => ({ value: item.id, label: item.name }));
  const professionalOptions = catalog.professionals
    .filter(
      (item) =>
        item.active &&
        item.acceptsOnline &&
        item.branchProfileIds.includes(draft.branchProfileId),
    )
    .map((item) => ({ value: item.id, label: item.name }));
  const previewWindow = draft.windows[0];
  const previewService =
    catalog.services.find((item) =>
      draft.serviceProfileIds.includes(item.id),
    ) ?? catalog.services[0];
  const examplePrice = 1850;
  const exampleDiscount = previewWindow
    ? previewWindow.discountType === "PERCENTAGE"
      ? examplePrice * (previewWindow.maximumDiscount / 100)
      : previewWindow.maximumDiscount
    : 0;
  const canSave =
    draft.name.trim().length >= 3 &&
    Boolean(draft.branchProfileId) &&
    draft.windows.length > 0 &&
    draft.windows.every(
      (window) =>
        window.startMinute < window.endMinute && window.maximumDiscount > 0,
    );

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setConflict(null);
    await runSchedulerMutation(
      () => schedulerDesignProposals.saveSmartPricingStrategy(draft),
      {
        onSuccess: async () => {
          toast.success("Estrategia de precios inteligentes guardada.");
          onOpenChange(false);
          await onSaved();
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["smart-pricing"],
      },
    );
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Editar estrategia" : "Nueva estrategia de precios"}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
          <ConflictNotice
            message={conflict}
            onReload={() => {
              setConflict(null);
              void onSaved();
            }}
          />
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Sólo reservas del Marketplace</p>
                <p className="mt-1 leading-6 text-sky-900/75">
                  La agenda directa mantiene su precio normal. Los cupones no se
                  acumulan y la comisión se calcula sobre el precio final.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nombre de la estrategia</Label>
              <Input
                className="mt-1.5"
                placeholder="Ej. Martes por la mañana"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select
                value={draft.branchProfileId}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    branchProfileId: value,
                    serviceProfileIds: [],
                    professionalProfileIds: [],
                  }))
                }
                disabled={Boolean(draft.id)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.branches
                    .filter((item) => item.active && item.bookingEnabled)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.branchName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={draft.active ? "ACTIVE" : "PAUSED"}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    active: value === "ACTIVE",
                  }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activa</SelectItem>
                  <SelectItem value="PAUSED">Pausada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Servicios participantes</Label>
              <MultiCombobox
                className="mt-1.5"
                options={serviceOptions}
                value={draft.serviceProfileIds}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    serviceProfileIds: value,
                  }))
                }
                placeholder="Todos los servicios en línea"
                selectedCountLabel="servicios seleccionados"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Sin selección, aplica a todos los servicios en línea de la
                sucursal.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label>Especialistas participantes</Label>
              <MultiCombobox
                className="mt-1.5"
                options={professionalOptions}
                value={draft.professionalProfileIds}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    professionalProfileIds: value,
                  }))
                }
                placeholder="Todos los especialistas disponibles"
                selectedCountLabel="especialistas seleccionados"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Sin selección, aplica a todo el equipo que acepta reservas en
                línea.
              </p>
            </div>
          </div>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Días y franjas horarias
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Si dos franjas se superponen, se aplicará el mayor descuento.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    windows: [...current.windows, emptyWindow()],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar franja
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {draft.windows.map((window, index) => (
                <Card key={window.id ?? index} className="admin-card">
                  <CardContent className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr_1.25fr_auto] md:items-end">
                    <div>
                      <Label>Día</Label>
                      <Select
                        value={window.weekday}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            windows: current.windows.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    weekday: value as SchedulerWeekday,
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekdayOptions.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Desde</Label>
                      <Input
                        className="mt-1.5"
                        type="time"
                        value={minutesToTime(window.startMinute)}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            windows: current.windows.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    startMinute: timeToMinutes(
                                      event.target.value,
                                    ),
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Hasta</Label>
                      <Input
                        className="mt-1.5"
                        type="time"
                        value={minutesToTime(window.endMinute)}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            windows: current.windows.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    endMinute: timeToMinutes(
                                      event.target.value,
                                    ),
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Descuento máximo</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Select
                          value={window.discountType}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              windows: current.windows.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      discountType: value as
                                        | "PERCENTAGE"
                                        | "FIXED_AMOUNT",
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger className="w-[6.5rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">%</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">$</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          min="1"
                          max={
                            window.discountType === "PERCENTAGE"
                              ? "90"
                              : undefined
                          }
                          type="number"
                          value={window.maximumDiscount}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              windows: current.windows.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      maximumDiscount: Number(
                                        event.target.value,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      aria-label={`Quitar franja ${index + 1}`}
                      disabled={draft.windows.length === 1}
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          windows: current.windows.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      Quitar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-[#e6d9cd] bg-[#fcfaf8] p-4 sm:grid-cols-2">
            <div>
              <Label>Vigente desde (opcional)</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={draft.validFrom ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    validFrom: event.target.value || null,
                  }))
                }
              />
            </div>
            <div>
              <Label>Vigente hasta (opcional)</Label>
              <Input
                className="mt-1.5"
                min={draft.validFrom ?? undefined}
                type="date"
                value={draft.validTo ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    validTo: event.target.value || null,
                  }))
                }
              />
            </div>
          </section>

          {preview ? (
            <section className="rounded-3xl bg-[linear-gradient(135deg,#172230,#26384b)] p-5 text-white shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Vista del Marketplace
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {previewService?.name ?? "Servicio seleccionado"}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    {branch?.branchName ?? "Sucursal"} · horario con descuento
                  </p>
                </div>
                <Badge className="bg-emerald-400 text-emerald-950">
                  Oferta inteligente
                </Badge>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-white/45 line-through">
                    {money.format(examplePrice)}
                  </p>
                  <p className="text-2xl font-semibold">
                    {money.format(Math.max(0, examplePrice - exampleDiscount))}
                  </p>
                </div>
                <p className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
                  Ahorra {money.format(exampleDiscount)}
                </p>
              </div>
            </section>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#eadfd6] bg-white pt-4">
          <Button
            variant="outline"
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? "Ocultar vista previa" : "Vista previa"}
          </Button>
          <Button disabled={!canSave || saving} onClick={() => void save()}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar estrategia"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RestoredSmartPricingSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.smart-pricing", "ADMIN");
  const catalogQuery = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "smart-pricing:catalog" },
  );
  const strategiesQuery = useSchedulerQuery(
    () => schedulerDesignProposals.smartPricingStrategies(),
    [],
    { queryKey: "smart-pricing:strategies" },
  );
  const recommendationsQuery = useSchedulerQuery(
    () => schedulerDesignProposals.smartPricingRecommendations(),
    [],
    { queryKey: "smart-pricing:recommendations" },
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DesignSmartPricingStrategyInput>(() =>
    emptyDraft(),
  );
  const catalog = catalogQuery.data;
  const strategies = useMemo(
    () => strategiesQuery.data ?? [],
    [strategiesQuery.data],
  );
  const totals = useMemo(
    () => ({
      active: strategies.filter((strategy) => strategy.active).length,
      reservations: strategies.reduce(
        (total, strategy) =>
          total + strategy.performance.marketplaceReservations,
        0,
      ),
      revenue: strategies.reduce(
        (total, strategy) => total + strategy.performance.generatedRevenue,
        0,
      ),
      hours: strategies.reduce(
        (total, strategy) => total + strategy.performance.filledHours,
        0,
      ),
    }),
    [strategies],
  );
  const metricCards: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Estrategias activas",
      value: String(totals.active),
      icon: Sparkles,
    },
    {
      label: "Reservas obtenidas",
      value: String(totals.reservations),
      icon: CalendarRange,
    },
    {
      label: "Ingresos generados",
      value: money.format(totals.revenue),
      icon: DollarSign,
    },
    {
      label: "Horas recuperadas",
      value: String(totals.hours),
      icon: Clock3,
    },
  ];

  async function reload() {
    await Promise.all([
      catalogQuery.reload(),
      strategiesQuery.reload(),
      recommendationsQuery.reload(),
    ]);
  }

  async function toggle(strategy: DesignSmartPricingStrategy) {
    await runSchedulerMutation(
      () =>
        schedulerDesignProposals.saveSmartPricingStrategy({
          ...draftFromStrategy(strategy),
          active: !strategy.active,
        }),
      {
        onSuccess: async () => {
          toast.success(
            strategy.active ? "Estrategia pausada." : "Estrategia activada.",
          );
          await strategiesQuery.reload();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: ["smart-pricing"],
      },
    );
  }

  return (
    <RestoredAdministrationFrame
      section="smart-pricing"
      readOnly={!canAdmin}
      actions={
        <>
          <AdministrationRefreshButton
            loading={
              catalogQuery.loading ||
              strategiesQuery.loading ||
              recommendationsQuery.loading
            }
            onClick={() => void reload()}
          />
          {canAdmin && catalog ? (
            <Button
              onClick={() => {
                setDraft(emptyDraft(catalog));
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva estrategia
            </Button>
          ) : null}
        </>
      }
    >
      <QueryBoundary
        loading={
          catalogQuery.loading ||
          strategiesQuery.loading ||
          recommendationsQuery.loading
        }
        error={
          catalogQuery.error ||
          strategiesQuery.error ||
          recommendationsQuery.error
        }
        onRetry={() => void reload()}
      >
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, icon: Icon }) => (
              <article className="report-metric min-w-0" key={label}>
                <div className="flex items-start justify-between gap-3">
                  <p className="label-caps">{label}</p>
                  <Icon className="h-4 w-4 text-[#ad8b67]" />
                </div>
                <p className="number-display mt-4 text-2xl">{value}</p>
              </article>
            ))}
          </section>

          {(recommendationsQuery.data ?? []).length ? (
            <section className="rounded-3xl border border-[#d7c3ad] bg-[linear-gradient(135deg,#fffaf4,#f3e7da)] p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#172230] text-[#e7c49e]">
                    <TrendingUp className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="admin-eyebrow">Sugerencia inteligente</p>
                    <h2 className="mt-1 text-xl font-semibold text-[#263649]">
                      Llena las horas de menor demanda
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Detectamos horarios con ocupación baja. Activa una
                      propuesta o personalízala antes de publicarla en el
                      Marketplace.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[34rem]">
                  {(recommendationsQuery.data ?? []).map((recommendation) => {
                    const existing = strategies.find(
                      (strategy) =>
                        strategy.branchProfileId ===
                        recommendation.branchProfileId,
                    );
                    return (
                      <div
                        className="rounded-2xl border border-white/80 bg-white/80 p-4"
                        key={recommendation.branchProfileId}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#263649]">
                              {recommendation.branchName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {recommendation.occupancyPercent}% ocupación ·
                              potencial +{recommendation.estimatedReservations}
                              reservas
                            </p>
                          </div>
                          <Badge variant="outline">
                            -{recommendation.suggestedDiscountPercent}%
                          </Badge>
                        </div>
                        {canAdmin && catalog ? (
                          <Button
                            className="mt-3 w-full"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDraft(
                                draftFromRecommendation(
                                  recommendation,
                                  catalog,
                                  existing,
                                ),
                              );
                              setDialogOpen(true);
                            }}
                          >
                            {existing
                              ? "Aplicar sugerencia"
                              : "Activar sugerencia"}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div>
              <p className="admin-eyebrow">Estrategias por sucursal</p>
              <h2 className="mt-1 text-xl font-semibold text-[#263649]">
                Configuración y resultados
              </h2>
            </div>
            {strategies.map((strategy) => (
              <Card className="admin-card" key={strategy.id}>
                <CardContent className="p-5">
                  <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr_1fr_auto] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={strategy.active ? "default" : "secondary"}
                        >
                          {strategy.active ? "Activa" : "Pausada"}
                        </Badge>
                        <Badge variant="outline">
                          v{strategy.currentVersion}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-[#263649]">
                        {strategy.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <Store className="h-4 w-4" /> {strategy.branchName}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Exclusivo Marketplace · cambios inmediatos
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cobertura
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                        <Tag className="mt-0.5 h-4 w-4 shrink-0" />
                        {strategy.serviceNames.length
                          ? strategy.serviceNames.join(", ")
                          : "Todos los servicios en línea"}
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                        <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
                        {strategy.professionalNames.length
                          ? strategy.professionalNames.join(", ")
                          : "Todos los especialistas disponibles"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Horarios con descuento
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {strategy.windows.map((window) => (
                          <span
                            className="rounded-xl bg-[#f5efe8] px-3 py-2 text-xs text-[#6f5439]"
                            key={window.id}
                          >
                            {weekdayLabels[window.weekday]} ·{" "}
                            {minutesToTime(window.startMinute)}–
                            {minutesToTime(window.endMinute)} ·{" "}
                            {discountLabel(window)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 px-2 py-2">
                          <p className="text-lg font-semibold text-[#263649]">
                            {strategy.performance.marketplaceReservations}
                          </p>
                          <p className="text-[0.65rem] text-slate-400">
                            Reservas
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-2 py-2">
                          <p className="text-lg font-semibold text-[#263649]">
                            {money.format(
                              strategy.performance.generatedRevenue,
                            )}
                          </p>
                          <p className="text-[0.65rem] text-slate-400">
                            Ingresos
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-2 py-2">
                          <p className="text-lg font-semibold text-[#263649]">
                            {strategy.performance.filledHours}
                          </p>
                          <p className="text-[0.65rem] text-slate-400">Horas</p>
                        </div>
                      </div>
                    </div>
                    {canAdmin ? (
                      <div className="flex gap-2 xl:flex-col">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDraft(draftFromStrategy(strategy));
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void toggle(strategy)}
                        >
                          {strategy.active ? (
                            <Pause className="mr-2 h-4 w-4" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          {strategy.active ? "Pausar" : "Activar"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <AdministrationCoverageNotice title="Reglas comerciales protegidas">
            El descuento reduce únicamente el precio final de reservas del
            Marketplace. El abono original no cambia, no se combina con cupones
            y las comisiones se calculan sobre el importe efectivamente pagado.
          </AdministrationCoverageNotice>
        </div>
      </QueryBoundary>
      {catalog ? (
        <SmartPricingDialog
          catalog={catalog}
          draft={draft}
          onOpenChange={setDialogOpen}
          onSaved={async () => {
            invalidateSchedulerQueries("smart-pricing");
            await strategiesQuery.reload();
          }}
          open={dialogOpen}
          setDraft={setDraft}
        />
      ) : null}
    </RestoredAdministrationFrame>
  );
}
