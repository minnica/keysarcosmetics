"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  Layers3,
  Palette,
  Pencil,
  Plus,
  Save,
  WalletCards,
} from "lucide-react";
import {
  SCHEDULER_APPOINTMENT_STATUSES,
  type SchedulerAdministrationCatalogDto,
  type SchedulerAppointmentStatus,
  type SchedulerCommissionMode,
  type SchedulerCommissionPeriod,
  type SchedulerCommissionTargetType,
  type SchedulerGiftCardStatus,
  type SchedulerGiftCardType,
  type SchedulerOperationalCatalogDto,
  type SchedulerWeekday,
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import { schedulerApi } from "@/lib/api";
import {
  schedulerAdministrationInvalidations,
  schedulerTimeToMinutes,
  schedulerMinutesToTime,
  schedulerWeekdayOptions,
} from "@/lib/scheduler-administration-presentation";
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

const statusLabels: Record<SchedulerAppointmentStatus, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservada",
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegó",
  WAITING: "En espera",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
  CANCELED: "Cancelada",
};

const defaultStatusColors: Record<SchedulerAppointmentStatus, string> = {
  PENDING: "#d8a54a",
  RESERVED: "#6485a8",
  CONFIRMED: "#4f8b73",
  ARRIVED: "#9274a5",
  WAITING: "#c1835b",
  ATTENDED: "#3f7f6a",
  NO_SHOW: "#a86b62",
  CANCELED: "#7c858f",
};

function useAdministrationData() {
  return useSchedulerQuery(
    async () => {
      const [operations, administration] = await Promise.all([
        schedulerApi.operationalCatalog(),
        schedulerApi.administrationCatalog(),
      ]);
      return { operations, administration };
    },
    [],
    { queryKey: "administration-catalog:restored" },
  );
}

function refreshAdministration(
  reload: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    invalidateSchedulerQueries(...schedulerAdministrationInvalidations());
    await reload();
  };
}

interface CommissionRuleDraft {
  mode: SchedulerCommissionMode;
  amount: string;
  percentage: string;
  tiers: Array<{ fromAmount: string; toAmount: string; percentage: string }>;
}

interface CommissionDraft {
  id: string;
  commerceId: string;
  targetType: SchedulerCommissionTargetType;
  targetId: string;
  period: SchedulerCommissionPeriod;
  active: boolean;
  expectedVersion?: number;
  rules: CommissionRuleDraft[];
}

const emptyCommissionRule = (): CommissionRuleDraft => ({
  mode: "ATTENDED_APPOINTMENT",
  amount: "0",
  percentage: "0",
  tiers: [{ fromAmount: "0", toAmount: "", percentage: "0" }],
});

function emptyCommissionDraft(
  operations: SchedulerOperationalCatalogDto | undefined,
): CommissionDraft {
  return {
    id: "",
    commerceId: operations?.commerces[0]?.id ?? "",
    targetType: "DEFAULT",
    targetId: "",
    period: "MONTH",
    active: true,
    rules: [emptyCommissionRule()],
  };
}

function CommissionDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  operations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CommissionDraft;
  setDraft: React.Dispatch<React.SetStateAction<CommissionDraft>>;
  operations: SchedulerOperationalCatalogDto;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const targets =
    draft.targetType === "PROFESSIONAL"
      ? operations.professionals.map((item) => ({
          id: item.id,
          name: item.name,
        }))
      : draft.targetType === "CATALOG_ITEM"
        ? operations.services.map((item) => ({
            id: item.catalogItemId,
            name: item.name,
          }))
        : [];

  async function save() {
    if (!draft.commerceId || draft.rules.length === 0) return;
    if (
      new Set(draft.rules.map((rule) => rule.mode)).size !== draft.rules.length
    ) {
      toast.warning("Cada modalidad de comisión sólo puede aparecer una vez.");
      return;
    }
    if (
      draft.rules.some(
        (rule) =>
          rule.mode === "BRANCH_SALES_TIER" &&
          rule.tiers.slice(0, -1).some((tier) => !tier.toAmount),
      )
    ) {
      toast.warning(
        "Todos los niveles salvo el último necesitan un límite final.",
      );
      return;
    }
    if (draft.targetType !== "DEFAULT" && !draft.targetId) {
      toast.warning("Selecciona el objetivo de la comisión.");
      return;
    }
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.updateCommissionPolicy({
          commerceId: draft.commerceId,
          targetType: draft.targetType,
          ...(draft.targetType === "DEFAULT"
            ? {}
            : { targetId: draft.targetId }),
          period: draft.period,
          active: draft.active,
          ...(draft.expectedVersion
            ? { expectedVersion: draft.expectedVersion }
            : {}),
          rules: draft.rules.map((rule) => ({
            mode: rule.mode,
            ...(["APPOINTMENT", "ATTENDED_APPOINTMENT"].includes(rule.mode)
              ? { amount: rule.amount }
              : {}),
            ...(rule.mode === "SALES_PERCENTAGE"
              ? { percentage: rule.percentage }
              : {}),
            ...(rule.mode === "BRANCH_SALES_TIER"
              ? {
                  tiers: rule.tiers.map((tier) => ({
                    fromAmount: tier.fromAmount,
                    toAmount: tier.toAmount || null,
                    percentage: tier.percentage,
                  })),
                }
              : {}),
          })),
        }),
      {
        onSuccess: async () => {
          toast.success("Política de comisión guardada.");
          await onSaved();
          onOpenChange(false);
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Editar comisión" : "Nueva comisión"}
          </DialogTitle>
        </DialogHeader>
        <ConflictNotice
          message={conflict}
          onReload={() => {
            setConflict(null);
            void onSaved();
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Comercio</Label>
            <Select
              value={draft.commerceId}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, commerceId: value }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operations.commerces.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Periodo</Label>
            <Select
              value={draft.period}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  period: value as SchedulerCommissionPeriod,
                }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAY">Diaria</SelectItem>
                <SelectItem value="WEEK">Semanal</SelectItem>
                <SelectItem value="FORTNIGHT">Quincenal</SelectItem>
                <SelectItem value="MONTH">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Objetivo</Label>
            <Select
              value={draft.targetType}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  targetType: value as SchedulerCommissionTargetType,
                  targetId: "",
                }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Regla general</SelectItem>
                <SelectItem value="PROFESSIONAL">Especialista</SelectItem>
                <SelectItem value="CATALOG_ITEM">
                  Servicio / producto
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.targetType !== "DEFAULT" ? (
            <div>
              <Label>Registro</Label>
              <Select
                value={draft.targetId}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, targetId: value }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          {draft.rules.map((rule, index) => (
            <Card key={`${rule.mode}-${index}`} className="admin-card">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Modalidad {index + 1}</p>
                  {draft.rules.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          rules: current.rules.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={rule.mode}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        rules: current.rules.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                mode: value as SchedulerCommissionMode,
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
                      <SelectItem value="APPOINTMENT">Por cita</SelectItem>
                      <SelectItem value="ATTENDED_APPOINTMENT">
                        Por cita atendida
                      </SelectItem>
                      <SelectItem value="SALES_PERCENTAGE">
                        Porcentaje de venta
                      </SelectItem>
                      <SelectItem value="BRANCH_SALES_TIER">
                        Escala por venta de sucursal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {["APPOINTMENT", "ATTENDED_APPOINTMENT"].includes(rule.mode) ? (
                  <div>
                    <Label>Importe</Label>
                    <Input
                      className="mt-1.5"
                      min="0"
                      step="0.01"
                      type="number"
                      value={rule.amount}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          rules: current.rules.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, amount: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                ) : null}
                {rule.mode === "SALES_PERCENTAGE" ? (
                  <div>
                    <Label>Porcentaje</Label>
                    <Input
                      className="mt-1.5"
                      min="0"
                      max="100"
                      step="0.01"
                      type="number"
                      value={rule.percentage}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          rules: current.rules.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, percentage: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                ) : null}
                {rule.mode === "BRANCH_SALES_TIER" ? (
                  <div className="space-y-3">
                    {rule.tiers.map((tier, tierIndex) => (
                      <div
                        key={tierIndex}
                        className="grid gap-2 sm:grid-cols-3"
                      >
                        <Input
                          aria-label="Desde"
                          type="number"
                          value={tier.fromAmount}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rules: current.rules.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      tiers: item.tiers.map(
                                        (candidate, candidateIndex) =>
                                          candidateIndex === tierIndex
                                            ? {
                                                ...candidate,
                                                fromAmount: event.target.value,
                                              }
                                            : candidate,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <Input
                          aria-label="Hasta"
                          placeholder="Sin límite"
                          type="number"
                          value={tier.toAmount}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rules: current.rules.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      tiers: item.tiers.map(
                                        (candidate, candidateIndex) =>
                                          candidateIndex === tierIndex
                                            ? {
                                                ...candidate,
                                                toAmount: event.target.value,
                                              }
                                            : candidate,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <Input
                          aria-label="Porcentaje"
                          type="number"
                          value={tier.percentage}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rules: current.rules.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      tiers: item.tiers.map(
                                        (candidate, candidateIndex) =>
                                          candidateIndex === tierIndex
                                            ? {
                                                ...candidate,
                                                percentage: event.target.value,
                                              }
                                            : candidate,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          rules: current.rules.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  tiers: [
                                    ...item.tiers,
                                    {
                                      fromAmount:
                                        item.tiers.at(-1)?.toAmount || "0",
                                      toAmount: "",
                                      percentage: "0",
                                    },
                                  ],
                                }
                              : item,
                          ),
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" /> Agregar nivel
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                rules: [...current.rules, emptyCommissionRule()],
              }))
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar modalidad
          </Button>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant={draft.active ? "default" : "outline"}
            onClick={() =>
              setDraft((current) => ({ ...current, active: !current.active }))
            }
          >
            {draft.active ? "Política activa" : "Política inactiva"}
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || !draft.commerceId}
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {saving ? "Guardando…" : "Guardar comisión"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RestoredCommissionsSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.commissions", "ADMIN");
  const query = useAdministrationData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CommissionDraft>(() =>
    emptyCommissionDraft(undefined),
  );
  const data = query.data;
  const onSaved = refreshAdministration(query.reload);

  function edit(
    policy: SchedulerAdministrationCatalogDto["commissionPolicies"][number],
  ) {
    setDraft({
      id: policy.id,
      commerceId: policy.commerceId,
      targetType: policy.targetType,
      targetId: policy.targetId ?? "",
      period: policy.period,
      active: policy.active,
      expectedVersion: policy.currentVersion,
      rules: policy.rules.map((rule) => ({
        mode: rule.mode,
        amount: rule.amount ?? "0",
        percentage: rule.percentage ?? "0",
        tiers: rule.tiers.map((tier) => ({
          fromAmount: tier.fromAmount,
          toAmount: tier.toAmount ?? "",
          percentage: tier.percentage,
        })),
      })),
    });
    setDialogOpen(true);
  }

  return (
    <RestoredAdministrationFrame
      section="commissions"
      readOnly={!canAdmin}
      actions={
        <>
          <AdministrationRefreshButton
            onClick={() => void query.reload()}
            loading={query.loading}
          />
          {canAdmin ? (
            <Button
              onClick={() => {
                setDraft(emptyCommissionDraft(data?.operations));
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva comisión
            </Button>
          ) : null}
        </>
      }
    >
      <QueryBoundary
        loading={query.loading}
        error={query.error}
        empty={!data?.administration.commissionPolicies.length}
        emptyTitle="Sin políticas"
        emptyDescription="Crea la primera regla versionada de comisión."
        onRetry={() => void query.reload()}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.administration.commissionPolicies.map((policy) => (
            <Card key={policy.id} className="admin-card">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="admin-eyebrow">{policy.period}</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {policy.targetName}
                    </h2>
                  </div>
                  <Badge variant={policy.active ? "default" : "secondary"}>
                    v{policy.currentVersion} ·{" "}
                    {policy.active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {policy.rules.map((rule) => (
                    <div
                      key={rule.mode}
                      className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    >
                      {rule.mode} ·{" "}
                      {rule.amount ??
                        rule.percentage ??
                        `${rule.tiers.length} niveles`}
                    </div>
                  ))}
                </div>
                {canAdmin ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    variant="outline"
                    onClick={() => edit(policy)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryBoundary>
      <AdministrationCoverageNotice title="Nómina conserva la liquidación final">
        Scheduler versiona reglas y escalas, pero no crea pagos, recibos ni
        movimientos de nómina.
      </AdministrationCoverageNotice>
      {data ? (
        <CommissionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          draft={draft}
          setDraft={setDraft}
          operations={data.operations}
          onSaved={onSaved}
        />
      ) : null}
    </RestoredAdministrationFrame>
  );
}

interface GiftCardDraft {
  id: string;
  commerceId: string;
  name: string;
  type: SchedulerGiftCardType;
  amount: string;
  salePrice: string;
  validityDays: string;
  description: string;
  designKey: string;
  status: SchedulerGiftCardStatus;
  serviceProfileIds: string[];
  expectedVersion?: number;
}

function emptyGiftCard(
  operations?: SchedulerOperationalCatalogDto,
): GiftCardDraft {
  return {
    id: "",
    commerceId: operations?.commerces[0]?.id ?? "",
    name: "",
    type: "AMOUNT",
    amount: "0",
    salePrice: "0",
    validityDays: "365",
    description: "",
    designKey: "keysar-default",
    status: "DRAFT",
    serviceProfileIds: [],
  };
}

export function RestoredGiftCardsSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.gift-cards", "ADMIN");
  const query = useAdministrationData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<GiftCardDraft>(() => emptyGiftCard());
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const data = query.data;
  const onSaved = refreshAdministration(query.reload);

  function edit(card: SchedulerAdministrationCatalogDto["giftCards"][number]) {
    setDraft({
      id: card.id,
      commerceId: card.commerceId,
      name: card.name,
      type: card.type,
      amount: card.amount ?? "0",
      salePrice: card.salePrice,
      validityDays: String(card.validityDays),
      description: card.description ?? "",
      designKey: card.designKey,
      status: card.status,
      serviceProfileIds: card.serviceProfileIds,
      expectedVersion: card.version,
    });
    setDialogOpen(true);
  }
  async function save() {
    const input = {
      commerceId: draft.commerceId,
      name: draft.name.trim(),
      type: draft.type,
      amount: draft.type === "AMOUNT" ? draft.amount : null,
      salePrice: draft.salePrice,
      validityDays: Number(draft.validityDays),
      description: draft.description.trim() || null,
      designKey: draft.designKey.trim(),
      status: draft.status,
      serviceProfileIds:
        draft.type === "SERVICE" ? draft.serviceProfileIds : [],
      ...(draft.expectedVersion
        ? { expectedVersion: draft.expectedVersion }
        : {}),
    };
    setSaving(true);
    await runSchedulerMutation(
      () =>
        draft.id
          ? schedulerApi.updateGiftCard(draft.id, input)
          : schedulerApi.createGiftCard(input),
      {
        onSuccess: async () => {
          toast.success("Plantilla de gift card guardada.");
          await onSaved();
          setDialogOpen(false);
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
    setSaving(false);
  }

  return (
    <RestoredAdministrationFrame
      section="gift-cards"
      readOnly={!canAdmin}
      actions={
        <>
          <AdministrationRefreshButton
            onClick={() => void query.reload()}
            loading={query.loading}
          />
          {canAdmin ? (
            <Button
              onClick={() => {
                setDraft(emptyGiftCard(data?.operations));
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva gift card
            </Button>
          ) : null}
        </>
      }
    >
      <ConflictNotice
        message={conflict}
        onReload={() => {
          setConflict(null);
          void query.reload();
        }}
      />
      <QueryBoundary
        loading={query.loading}
        error={query.error}
        empty={!data?.administration.giftCards.length}
        emptyTitle="Sin gift cards"
        emptyDescription="Crea la primera plantilla administrativa."
        onRetry={() => void query.reload()}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.administration.giftCards.map((card) => (
            <Card key={card.id} className="admin-card overflow-hidden">
              <div className="h-24 bg-[radial-gradient(circle_at_top_left,#ead8c7,transparent_62%),linear-gradient(135deg,#263649,#172230)]" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-brand text-xl">{card.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {card.type === "AMOUNT"
                        ? `$${card.amount}`
                        : `${card.serviceProfileIds.length} servicios`}{" "}
                      · {card.validityDays} días
                    </p>
                  </div>
                  <Badge variant="outline">{card.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Venta: ${card.salePrice}
                </p>
                {canAdmin ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    variant="outline"
                    onClick={() => edit(card)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryBoundary>
      <AdministrationCoverageNotice title="Plantilla, no instrumento financiero">
        El contrato cubre diseño y condiciones. Emisión, venta, saldo y
        redención no se simulan: permanecen como trabajo coordinado con POS.
      </AdministrationCoverageNotice>
      {data ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="admin-dialog gift-card-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {draft.id ? "Editar gift card" : "Nueva gift card"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Comercio</Label>
                <Select
                  value={draft.commerceId}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      commerceId: value,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.operations.commerces.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Nombre</Label>
                <Input
                  className="mt-1.5"
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
                <Label>Tipo</Label>
                <Select
                  value={draft.type}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      type: value as SchedulerGiftCardType,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMOUNT">Monto</SelectItem>
                    <SelectItem value="SERVICE">Servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      status: value as SchedulerGiftCardStatus,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Borrador</SelectItem>
                    <SelectItem value="ACTIVE">Activa</SelectItem>
                    <SelectItem value="INACTIVE">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.type === "AMOUNT" ? (
                <div>
                  <Label>Monto</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <Label>Servicios incluidos</Label>
                  <MultiCombobox
                    className="mt-1.5"
                    options={data.operations.services
                      .filter((item) => item.active)
                      .map((item) => ({ value: item.id, label: item.name }))}
                    value={draft.serviceProfileIds}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        serviceProfileIds: value,
                      }))
                    }
                    placeholder="Selecciona servicios"
                    selectedCountLabel="servicios seleccionados"
                  />
                </div>
              )}
              <div>
                <Label>Precio de venta</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.salePrice}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      salePrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Vigencia (días)</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min="1"
                  value={draft.validityDays}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      validityDays: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Diseño</Label>
                <Input
                  className="mt-1.5"
                  value={draft.designKey}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      designKey: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  className="mt-1.5"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <Button
                onClick={() => void save()}
                disabled={
                  saving ||
                  !draft.commerceId ||
                  draft.name.trim().length < 2 ||
                  (draft.type === "SERVICE" &&
                    draft.serviceProfileIds.length === 0)
                }
              >
                <Gift className="mr-2 h-4 w-4" /> Guardar plantilla
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </RestoredAdministrationFrame>
  );
}

export function RestoredStatusColorsSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.status-colors", "ADMIN");
  const query = useAdministrationData();
  const [commerceId, setCommerceId] = useState("");
  const [colors, setColors] = useState<
    Partial<Record<SchedulerAppointmentStatus, string>>
  >({});
  const [secret, setSecret] = useState("");
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedCommerceId =
    commerceId || query.data?.operations.commerces[0]?.id || "";
  const existing = useMemo(
    () =>
      query.data?.administration.statusColors.find(
        (item) => item.commerceId === selectedCommerceId,
      )?.colors ?? [],
    [query.data?.administration.statusColors, selectedCommerceId],
  );
  useEffect(() => {
    setColors({});
    setSecret("");
  }, [selectedCommerceId]);

  async function save() {
    setSaving(true);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret,
        purpose: "STATUS_COLORS_CHANGE",
        screenKey: "scheduler/administration/status-colors",
        targetType: "SchedulerCommerce",
        targetId: selectedCommerceId,
      });
      await runSchedulerMutation(
        () =>
          schedulerApi.updateStatusColors(selectedCommerceId, {
            authorizationToken: authorization.token,
            expectedVersions: Object.fromEntries(
              existing.map((item) => [item.status, item.version]),
            ),
            colors: SCHEDULER_APPOINTMENT_STATUSES.map((status) => ({
              status,
              color:
                colors[status] ??
                existing.find((item) => item.status === status)?.color ??
                defaultStatusColors[status],
            })),
          }),
        {
          onSuccess: async () => {
            setColors({});
            setSecret("");
            setAuthorizationOpen(false);
            toast.success("Colores actualizados.");
            invalidateSchedulerQueries(
              ...schedulerAdministrationInvalidations(),
            );
            await query.reload();
          },
          onError: toast.error,
          onConflict: setConflict,
          invalidate: schedulerAdministrationInvalidations(),
        },
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No fue posible autorizar el cambio.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RestoredAdministrationFrame
      section="status-colors"
      readOnly={!canAdmin}
      actions={
        <AdministrationRefreshButton
          onClick={() => void query.reload()}
          loading={query.loading}
        />
      }
    >
      <ConflictNotice
        message={conflict}
        onReload={() => {
          setConflict(null);
          void query.reload();
        }}
      />
      <QueryBoundary
        loading={query.loading}
        error={query.error}
        onRetry={() => void query.reload()}
      >
        <Card className="admin-card">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="admin-eyebrow">Paleta por negocio</p>
                <h2 className="admin-section-title">Estados de la agenda</h2>
              </div>
              <div className="w-full sm:max-w-xs">
                <Label>Comercio</Label>
                <Select
                  value={selectedCommerceId}
                  onValueChange={setCommerceId}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {query.data?.operations.commerces.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SCHEDULER_APPOINTMENT_STATUSES.map((status) => {
                const color =
                  colors[status] ??
                  existing.find((item) => item.status === status)?.color ??
                  defaultStatusColors[status];
                return (
                  <label
                    key={status}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                  >
                    <Input
                      aria-label={`Color para ${statusLabels[status]}`}
                      className="h-11 w-11 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                      type="color"
                      value={color}
                      disabled={!canAdmin}
                      onChange={(event) =>
                        setColors((current) => ({
                          ...current,
                          [status]: event.target.value,
                        }))
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {statusLabels[status]}
                      </span>
                      <span className="font-mono text-xs uppercase text-slate-400">
                        {color}
                      </span>
                    </span>
                    <span
                      className="ml-auto h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                );
              })}
            </div>
            {canAdmin ? (
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="text-left text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800"
                  type="button"
                  onClick={() => setColors(defaultStatusColors)}
                >
                  Restablecer colores originales
                </button>
                <Button
                  onClick={() => setAuthorizationOpen(true)}
                  disabled={
                    !selectedCommerceId || Object.keys(colors).length === 0
                  }
                >
                  <Palette className="mr-2 h-4 w-4" /> Autorizar y guardar
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </QueryBoundary>
      <Dialog open={authorizationOpen} onOpenChange={setAuthorizationOpen}>
        <DialogContent className="admin-dialog max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Autorización requerida</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-slate-500">
            Confirma el cambio con tu código personal. El token queda ligado a
            este comercio y se consume una sola vez.
          </p>
          <div>
            <Label htmlFor="status-secret">Código personal</Label>
            <Input
              id="status-secret"
              className="mt-1.5"
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={!secret || saving}>
              <Save className="mr-2 h-4 w-4" /> Confirmar cambio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </RestoredAdministrationFrame>
  );
}

export function RestoredServiceExtensions() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.services", "ADMIN");
  const query = useSchedulerQuery(
    async () => {
      const [operations, administration, pos] = await Promise.all([
        schedulerApi.operationalCatalog(),
        schedulerApi.administrationCatalog(),
        schedulerApi.posReferences(),
      ]);
      return { operations, administration, pos };
    },
    [],
    { queryKey: "administration-catalog:service-extensions" },
  );
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageDraft, setPackageDraft] = useState({
    posPackageId: "",
    commerceId: "",
    branchProfileIds: [] as string[],
    serviceProfileIds: [] as string[],
    sessions: "1",
    simultaneous: false,
    acceptsOnline: false,
    active: true,
    expectedVersion: undefined as number | undefined,
  });
  const [addonId, setAddonId] = useState("");
  const [addonDraft, setAddonDraft] = useState({
    durationMinutes: "15",
    active: true,
    serviceProfileIds: [] as string[],
  });
  const [classDraft, setClassDraft] = useState({
    serviceProfileId: "",
    branchProfileId: "",
    professionalProfileId: "",
    weekday: "MONDAY" as SchedulerWeekday,
    start: "09:00",
    end: "10:00",
    capacity: "1",
  });
  const [saving, setSaving] = useState(false);
  const data = query.data;
  const onSaved = refreshAdministration(query.reload);

  async function savePackage() {
    const profile = data?.administration.packages.find(
      (item) => item.posPackageId === packageDraft.posPackageId,
    );
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.updatePackageProfile(packageDraft.posPackageId, {
          commerceId: packageDraft.commerceId,
          branchProfileIds: packageDraft.branchProfileIds,
          sessions: Number(packageDraft.sessions),
          simultaneous: packageDraft.simultaneous,
          acceptsOnline: packageDraft.acceptsOnline,
          active: packageDraft.active,
          ...(packageDraft.expectedVersion
            ? { expectedVersion: packageDraft.expectedVersion }
            : {}),
          serviceLines: packageDraft.serviceProfileIds.map(
            (serviceProfileId, index) => ({
              serviceProfileId,
              quantity:
                profile?.serviceLines.find(
                  (line) => line.serviceProfileId === serviceProfileId,
                )?.quantity ?? 1,
              priceOverride:
                profile?.serviceLines.find(
                  (line) => line.serviceProfileId === serviceProfileId,
                )?.priceOverride ?? null,
              sortOrder:
                profile?.serviceLines.find(
                  (line) => line.serviceProfileId === serviceProfileId,
                )?.sortOrder ?? index,
            }),
          ),
        }),
      {
        onSuccess: async () => {
          toast.success(
            profile ? "Paquete actualizado." : "Paquete activado en Scheduler.",
          );
          await onSaved();
          setPackageOpen(false);
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
    setSaving(false);
  }
  async function saveAddon() {
    const addon = data?.administration.addons.find(
      (item) => item.id === addonId,
    );
    if (!addon) return;
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.updateAddonProfile(addon.catalogItemId, {
          commerceId: addon.commerceId,
          durationMinutes: Number(addonDraft.durationMinutes),
          active: addonDraft.active,
          expectedVersion: addon.version,
          serviceProfileIds: addonDraft.serviceProfileIds,
        }),
      {
        onSuccess: async () => {
          toast.success("Complemento actualizado.");
          await onSaved();
          setAddonId("");
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
    setSaving(false);
  }
  async function addClassSchedule() {
    if (!data) return;
    const startMinute = schedulerTimeToMinutes(classDraft.start);
    const endMinute = schedulerTimeToMinutes(classDraft.end);
    if (
      !Number.isFinite(startMinute) ||
      !Number.isFinite(endMinute) ||
      startMinute >= endMinute
    ) {
      toast.warning("La hora de inicio debe ser anterior a la hora final.");
      return;
    }
    const current = data.administration.classSchedules.filter(
      (item) =>
        item.serviceProfileId === classDraft.serviceProfileId && item.active,
    );
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.replaceClassSchedules(classDraft.serviceProfileId, {
          schedules: [
            ...current.map((item) => ({
              branchProfileId: item.branchProfileId,
              professionalProfileId: item.professionalProfileId,
              weekday: item.weekday,
              startMinute: item.startMinute,
              endMinute: item.endMinute,
              capacity: item.capacity,
            })),
            {
              branchProfileId: classDraft.branchProfileId,
              professionalProfileId: classDraft.professionalProfileId,
              weekday: classDraft.weekday,
              startMinute,
              endMinute,
              capacity: Number(classDraft.capacity),
            },
          ],
        }),
      {
        onSuccess: async () => {
          toast.success("Horario de clase agregado.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
    setSaving(false);
  }
  async function removeClassSchedule(
    schedule: SchedulerAdministrationCatalogDto["classSchedules"][number],
  ) {
    if (!data) return;
    const remaining = data.administration.classSchedules.filter(
      (item) =>
        item.serviceProfileId === schedule.serviceProfileId &&
        item.active &&
        item.id !== schedule.id,
    );
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.replaceClassSchedules(schedule.serviceProfileId, {
          schedules: remaining.map((item) => ({
            branchProfileId: item.branchProfileId,
            professionalProfileId: item.professionalProfileId,
            weekday: item.weekday,
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            capacity: item.capacity,
          })),
        }),
      {
        onSuccess: async () => {
          toast.success("Horario de clase retirado.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
    setSaving(false);
  }

  return (
    <section className="border-t border-[#e7ddd4] bg-[#f4f1ed] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div>
          <p className="admin-eyebrow">Extensiones comerciales</p>
          <h2 className="admin-page-title text-2xl">
            Paquetes, complementos y clases
          </h2>
        </div>
        <QueryBoundary
          loading={query.loading}
          error={query.error}
          onRetry={() => void query.reload()}
        >
          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="admin-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="admin-section-title">Paquetes</h3>
                  {canAdmin ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPackageDraft({
                          posPackageId: data?.pos.packages[0]?.id ?? "",
                          commerceId: data?.operations.commerces[0]?.id ?? "",
                          branchProfileIds: [],
                          serviceProfileIds: [],
                          sessions: "1",
                          simultaneous: false,
                          acceptsOnline: false,
                          active: true,
                          expectedVersion: undefined,
                        });
                        setPackageOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Configurar
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {data?.administration.packages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded-xl border border-slate-200 p-3 text-left"
                      onClick={() => {
                        setPackageDraft({
                          posPackageId: item.posPackageId,
                          commerceId: item.commerceId,
                          branchProfileIds: item.branchProfileIds,
                          serviceProfileIds: item.serviceLines.map(
                            (line) => line.serviceProfileId,
                          ),
                          sessions: String(item.sessions),
                          simultaneous: item.simultaneous,
                          acceptsOnline: item.acceptsOnline,
                          active: item.active,
                          expectedVersion: item.version,
                        });
                        setPackageOpen(true);
                      }}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.sku} · {item.sessions} sesiones · v{item.version}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardContent className="p-5">
                <h3 className="admin-section-title">Complementos</h3>
                <div className="mt-4 space-y-3">
                  {data?.administration.addons.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded-xl border border-slate-200 p-3 text-left"
                      onClick={() => {
                        setAddonId(item.id);
                        setAddonDraft({
                          durationMinutes: String(item.durationMinutes),
                          active: item.active,
                          serviceProfileIds: item.serviceProfileIds,
                        });
                      }}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.durationMinutes} min ·{" "}
                        {item.active ? "Activo" : "Inactivo"}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardContent className="p-5">
                <h3 className="admin-section-title">Horarios de clase</h3>
                <div className="mt-4 space-y-3">
                  {data?.administration.classSchedules.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-medium">
                        {
                          schedulerWeekdayOptions.find(
                            (day) => day.value === item.weekday,
                          )?.label
                        }{" "}
                        · {schedulerMinutesToTime(item.startMinute)}–
                        {schedulerMinutesToTime(item.endMinute)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Capacidad {item.capacity}
                      </p>
                      {canAdmin ? (
                        <Button
                          className="mt-2"
                          size="sm"
                          variant="ghost"
                          onClick={() => void removeClassSchedule(item)}
                          disabled={saving}
                        >
                          Retirar
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {canAdmin && data ? (
            <Card className="admin-card">
              <CardContent className="grid gap-3 p-5 md:grid-cols-3">
                <div>
                  <Label>Clase</Label>
                  <Select
                    value={classDraft.serviceProfileId}
                    onValueChange={(value) =>
                      setClassDraft((current) => ({
                        ...current,
                        serviceProfileId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.operations.services
                        .filter((item) => item.mode === "CLASS" && item.active)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Select
                    value={classDraft.branchProfileId}
                    onValueChange={(value) =>
                      setClassDraft((current) => ({
                        ...current,
                        branchProfileId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.operations.branches
                        .filter((item) => item.active)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.branchName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Especialista</Label>
                  <Select
                    value={classDraft.professionalProfileId}
                    onValueChange={(value) =>
                      setClassDraft((current) => ({
                        ...current,
                        professionalProfileId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.operations.professionals
                        .filter((item) => item.active)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Día</Label>
                  <Select
                    value={classDraft.weekday}
                    onValueChange={(value) =>
                      setClassDraft((current) => ({
                        ...current,
                        weekday: value as SchedulerWeekday,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulerWeekdayOptions.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Inicio</Label>
                    <Input
                      className="mt-1.5"
                      type="time"
                      value={classDraft.start}
                      onChange={(event) =>
                        setClassDraft((current) => ({
                          ...current,
                          start: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Fin</Label>
                    <Input
                      className="mt-1.5"
                      type="time"
                      value={classDraft.end}
                      onChange={(event) =>
                        setClassDraft((current) => ({
                          ...current,
                          end: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Capacidad</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    min="1"
                    value={classDraft.capacity}
                    onChange={(event) =>
                      setClassDraft((current) => ({
                        ...current,
                        capacity: event.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  className="md:col-span-3 md:w-fit"
                  onClick={() => void addClassSchedule()}
                  disabled={
                    saving ||
                    !classDraft.serviceProfileId ||
                    !classDraft.branchProfileId ||
                    !classDraft.professionalProfileId
                  }
                >
                  <Layers3 className="mr-2 h-4 w-4" /> Agregar horario de clase
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </QueryBoundary>
        <AdministrationCoverageNotice title="Alta de complementos limitada por el contrato">
          RV4 permite editar perfiles existentes. El catálogo administrativo no
          publica candidatos de complemento aún no activados; no se inventan IDs
          ni productos para habilitarlos.
        </AdministrationCoverageNotice>
      </div>
      {data ? (
        <>
          <Dialog open={packageOpen} onOpenChange={setPackageOpen}>
            <DialogContent className="admin-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Configurar paquete</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Comercio</Label>
                  <Select
                    value={packageDraft.commerceId}
                    onValueChange={(value) =>
                      setPackageDraft((current) => ({
                        ...current,
                        commerceId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.operations.commerces.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Paquete POS</Label>
                  <Select
                    value={packageDraft.posPackageId}
                    disabled={Boolean(packageDraft.expectedVersion)}
                    onValueChange={(value) =>
                      setPackageDraft((current) => ({
                        ...current,
                        posPackageId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.pos.packages.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · {item.sku}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sucursales</Label>
                  <MultiCombobox
                    className="mt-1.5"
                    options={data.operations.branches
                      .filter((item) => item.active)
                      .map((item) => ({
                        value: item.id,
                        label: item.branchName,
                      }))}
                    value={packageDraft.branchProfileIds}
                    onValueChange={(value) =>
                      setPackageDraft((current) => ({
                        ...current,
                        branchProfileIds: value,
                      }))
                    }
                    placeholder="Selecciona sucursales"
                    selectedCountLabel="sucursales seleccionadas"
                  />
                </div>
                <div>
                  <Label>Servicios incluidos</Label>
                  <MultiCombobox
                    className="mt-1.5"
                    options={data.operations.services
                      .filter((item) => item.active)
                      .map((item) => ({ value: item.id, label: item.name }))}
                    value={packageDraft.serviceProfileIds}
                    onValueChange={(value) =>
                      setPackageDraft((current) => ({
                        ...current,
                        serviceProfileIds: value,
                      }))
                    }
                    placeholder="Selecciona servicios"
                    selectedCountLabel="servicios seleccionados"
                  />
                </div>
                <div>
                  <Label>Sesiones</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    min="1"
                    value={packageDraft.sessions}
                    onChange={(event) =>
                      setPackageDraft((current) => ({
                        ...current,
                        sessions: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={packageDraft.active ? "default" : "outline"}
                    onClick={() =>
                      setPackageDraft((current) => ({
                        ...current,
                        active: !current.active,
                      }))
                    }
                  >
                    {packageDraft.active ? "Activo" : "Inactivo"}
                  </Button>
                  <Button
                    variant={packageDraft.acceptsOnline ? "default" : "outline"}
                    onClick={() =>
                      setPackageDraft((current) => ({
                        ...current,
                        acceptsOnline: !current.acceptsOnline,
                      }))
                    }
                  >
                    {packageDraft.acceptsOnline
                      ? "Reserva online"
                      : "Sólo interno"}
                  </Button>
                  <Button
                    variant={packageDraft.simultaneous ? "default" : "outline"}
                    onClick={() =>
                      setPackageDraft((current) => ({
                        ...current,
                        simultaneous: !current.simultaneous,
                      }))
                    }
                  >
                    {packageDraft.simultaneous ? "Simultáneo" : "Secuencial"}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => void savePackage()}
                    disabled={
                      saving ||
                      !packageDraft.posPackageId ||
                      !packageDraft.commerceId ||
                      !packageDraft.branchProfileIds.length ||
                      !packageDraft.serviceProfileIds.length
                    }
                  >
                    <WalletCards className="mr-2 h-4 w-4" /> Guardar paquete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(addonId)}
            onOpenChange={(open) => {
              if (!open) setAddonId("");
            }}
          >
            <DialogContent className="admin-dialog max-w-lg overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Editar complemento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Duración</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    min="1"
                    value={addonDraft.durationMinutes}
                    onChange={(event) =>
                      setAddonDraft((current) => ({
                        ...current,
                        durationMinutes: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Servicios compatibles</Label>
                  <MultiCombobox
                    className="mt-1.5"
                    options={data.operations.services.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    value={addonDraft.serviceProfileIds}
                    onValueChange={(value) =>
                      setAddonDraft((current) => ({
                        ...current,
                        serviceProfileIds: value,
                      }))
                    }
                    placeholder="Selecciona servicios"
                    selectedCountLabel="servicios seleccionados"
                  />
                </div>
                <Button
                  variant={addonDraft.active ? "default" : "outline"}
                  onClick={() =>
                    setAddonDraft((current) => ({
                      ...current,
                      active: !current.active,
                    }))
                  }
                >
                  {addonDraft.active ? "Activo" : "Inactivo"}
                </Button>
                <div className="flex justify-end">
                  <Button onClick={() => void saveAddon()} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" /> Guardar complemento
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </section>
  );
}
