"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  History,
  Layers3,
  Palette,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Save,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  SCHEDULER_APPOINTMENT_STATUSES,
  type SchedulerAdministrationCatalogDto,
  type SchedulerAppointmentStatus,
  type SchedulerCommissionPeriod,
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
  schedulerDesignDemoAccounts,
  schedulerDesignProposals,
} from "@scheduler/design-proposals";
import type {
  DesignCommissionCalculationScope,
  DesignCommissionCustomerSegment,
  DesignCommissionRuleMode,
  DesignCommissionScheme,
  DesignStatusDefinition,
  DesignStatusDefinitionRevision,
} from "../../../design/contracts";
import {
  schedulerAdministrationInvalidations,
  schedulerTimeToMinutes,
  schedulerMinutesToTime,
  schedulerWeekdayOptions,
} from "@/lib/scheduler-administration-presentation";
import { useSchedulerSession } from "@/lib/session";
import { SchedulerPagination } from "@/components/shared/SchedulerPagination";
import {
  paginateSchedulerReportRows,
  type SchedulerReportPageSize,
} from "@/lib/scheduler-report-presentation";
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
  mode: DesignCommissionRuleMode;
  value: string;
}

interface CommissionDraft {
  id: string;
  commerceId: string;
  name: string;
  period: SchedulerCommissionPeriod;
  calculationScope: DesignCommissionCalculationScope;
  customerSegment: DesignCommissionCustomerSegment;
  active: boolean;
  employeeIds: string[];
  viewerProfileIds: string[];
  expectedVersion?: number;
  rules: CommissionRuleDraft[];
}

const emptyCommissionRule = (): CommissionRuleDraft => ({
  mode: "ATTENDED_APPOINTMENT",
  value: "0",
});

function emptyCommissionDraft(
  operations: SchedulerOperationalCatalogDto | undefined,
  currentProfileId: string,
): CommissionDraft {
  return {
    id: "",
    commerceId: operations?.commerces[0]?.id ?? "",
    name: "",
    period: "MONTH",
    calculationScope: "INDIVIDUAL",
    customerSegment: "ALL",
    active: true,
    employeeIds: [],
    viewerProfileIds: currentProfileId ? [currentProfileId] : [],
    rules: [emptyCommissionRule()],
  };
}

const commissionPeriodLabels: Record<SchedulerCommissionPeriod, string> = {
  DAY: "Diario",
  WEEK: "Semanal",
  FORTNIGHT: "Quincenal",
  MONTH: "Mensual",
};

const commissionScopeLabels: Record<DesignCommissionCalculationScope, string> =
  {
    INDIVIDUAL: "Resultado individual",
    BRANCH_TOTAL: "Total de sucursal",
    COMPANY_TOTAL: "Total de la empresa",
  };

const commissionSegmentLabels: Record<DesignCommissionCustomerSegment, string> =
  {
    ALL: "Todos los clientes",
    NEW: "Clientes nuevos",
    RETURNING: "Clientes recurrentes",
    RECOVERED: "Clientes recuperados",
  };

const commissionRuleLabels: Record<DesignCommissionRuleMode, string> = {
  ATTENDED_APPOINTMENT: "Importe por cita atendida",
  SALES_AMOUNT: "Porcentaje de ventas totales",
  MEMBERSHIP_SALES: "Porcentaje de membresías",
};

const commissionMoney = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function CommissionDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  operations,
  profiles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CommissionDraft;
  setDraft: React.Dispatch<React.SetStateAction<CommissionDraft>>;
  operations: SchedulerOperationalCatalogDto;
  profiles: typeof schedulerDesignDemoAccounts;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  async function save() {
    if (!draft.name.trim()) {
      toast.warning("Escribe un nombre para el esquema.");
      return;
    }
    if (!draft.commerceId || draft.rules.length === 0) return;
    if (draft.employeeIds.length === 0) {
      toast.warning("Asigna al menos un empleado.");
      return;
    }
    if (draft.viewerProfileIds.length === 0) {
      toast.warning("Asigna al menos un perfil que pueda ver el cálculo.");
      return;
    }
    if (
      new Set(draft.rules.map((rule) => rule.mode)).size !== draft.rules.length
    ) {
      toast.warning("Cada modalidad de comisión sólo puede aparecer una vez.");
      return;
    }
    if (draft.rules.some((rule) => Number(rule.value) <= 0)) {
      toast.warning(
        "Cada regla necesita un importe o porcentaje mayor a cero.",
      );
      return;
    }
    if (
      draft.rules.some(
        (rule) =>
          rule.mode !== "ATTENDED_APPOINTMENT" && Number(rule.value) > 100,
      )
    ) {
      toast.warning("El porcentaje de venta no puede superar 100%.");
      return;
    }
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerDesignProposals.saveCommissionScheme({
          ...(draft.id ? { id: draft.id } : {}),
          commerceId: draft.commerceId,
          name: draft.name.trim(),
          period: draft.period,
          calculationScope: draft.calculationScope,
          customerSegment: draft.customerSegment,
          active: draft.active,
          employeeIds: draft.employeeIds,
          viewerProfileIds: draft.viewerProfileIds,
          ...(draft.expectedVersion
            ? { expectedVersion: draft.expectedVersion }
            : {}),
          rules: draft.rules.map((rule) => ({
            mode: rule.mode,
            amount:
              rule.mode === "ATTENDED_APPOINTMENT" ? Number(rule.value) : 0,
            percentage:
              rule.mode === "ATTENDED_APPOINTMENT" ? 0 : Number(rule.value),
          })),
        }),
      {
        onSuccess: async () => {
          toast.success("Esquema de comisión guardado.");
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
      <DialogContent className="admin-dialog admin-dialog-wide grid max-h-[calc(100dvh-2rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Editar esquema" : "Nuevo esquema de comisión"}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nombre del esquema</Label>
              <Input
                className="mt-1.5"
                placeholder="Ej. Facialistas · asistencia y venta"
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
              <Label>Base de cálculo</Label>
              <Select
                value={draft.calculationScope}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    calculationScope: value as DesignCommissionCalculationScope,
                  }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">
                    Resultado individual
                  </SelectItem>
                  <SelectItem value="BRANCH_TOTAL">
                    Venta total de la sucursal
                  </SelectItem>
                  <SelectItem value="COMPANY_TOTAL">
                    Venta total de la empresa
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-slate-500">
                Los totales permiten esquemas para supervisores o socios.
              </p>
            </div>
            <div>
              <Label>Tipo de cliente</Label>
              <Select
                value={draft.customerSegment}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    customerSegment: value as DesignCommissionCustomerSegment,
                  }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los clientes</SelectItem>
                  <SelectItem value="NEW">Clientes nuevos</SelectItem>
                  <SelectItem value="RETURNING">
                    Clientes recurrentes
                  </SelectItem>
                  <SelectItem value="RECOVERED">
                    Clientes recuperados
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Empleados que reciben la comisión</Label>
              <MultiCombobox
                className="mt-1.5"
                options={operations.professionals
                  .filter((item) => item.active)
                  .map((item) => ({
                    value: item.employeeId,
                    label: item.name,
                  }))}
                value={draft.employeeIds}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, employeeIds: value }))
                }
                placeholder="Selecciona uno o varios empleados"
                selectedCountLabel="empleados asignados"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Cada empleado se calcula por separado, incluso en citas de
                cabina doble o triple.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label>Perfiles autorizados para consultar el cálculo</Label>
              <MultiCombobox
                className="mt-1.5"
                options={profiles.map((profile) => ({
                  value: profile.id,
                  label: `${profile.name} · ${profile.access}`,
                }))}
                value={draft.viewerProfileIds}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    viewerProfileIds: value,
                  }))
                }
                placeholder="Selecciona perfiles autorizados"
                selectedCountLabel="perfiles autorizados"
              />
            </div>
          </div>
          <div className="space-y-4">
            {draft.rules.map((rule, index) => (
              <Card key={`${rule.mode}-${index}`} className="admin-card">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      Modalidad {index + 1}
                    </p>
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
                                  mode: value as DesignCommissionRuleMode,
                                  value: "0",
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
                        <SelectItem value="ATTENDED_APPOINTMENT">
                          Importe por cita atendida
                        </SelectItem>
                        <SelectItem value="SALES_AMOUNT">
                          Porcentaje de ventas totales
                        </SelectItem>
                        <SelectItem value="MEMBERSHIP_SALES">
                          Porcentaje de membresías vendidas
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {rule.mode === "ATTENDED_APPOINTMENT" ? (
                    <div>
                      <Label>Importe por cita atendida</Label>
                      <Input
                        className="mt-1.5"
                        min="0"
                        step="0.01"
                        type="number"
                        value={rule.value}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {rule.mode !== "ATTENDED_APPOINTMENT" ? (
                    <div>
                      <Label>
                        {rule.mode === "MEMBERSHIP_SALES"
                          ? "Porcentaje sobre membresías"
                          : "Porcentaje sobre ventas"}
                      </Label>
                      <Input
                        className="mt-1.5"
                        min="0"
                        max="100"
                        step="0.01"
                        type="number"
                        value={rule.value}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            {draft.rules.length < 3 ? (
              <Button
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    rules: [
                      ...current.rules,
                      {
                        mode: (
                          [
                            "ATTENDED_APPOINTMENT",
                            "SALES_AMOUNT",
                            "MEMBERSHIP_SALES",
                          ] as DesignCommissionRuleMode[]
                        ).find(
                          (mode) =>
                            !current.rules.some((rule) => rule.mode === mode),
                        )!,
                        value: "0",
                      },
                    ],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar modalidad
              </Button>
            ) : null}
          </div>
        </div>
        <div className="-mx-6 -mb-6 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 pb-6 pt-4 shadow-[0_-14px_28px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant={draft.active ? "default" : "outline"}
            onClick={() =>
              setDraft((current) => ({ ...current, active: !current.active }))
            }
          >
            {draft.active ? "Esquema activo" : "Esquema inactivo"}
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || !draft.commerceId}
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {saving ? "Guardando…" : "Guardar esquema"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RestoredCommissionsSection() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.commissions", "ADMIN");
  const currentProfileId = bootstrap?.user.id.replace(/^design-/, "") ?? "";
  const catalogQuery = useAdministrationData();
  const schemesQuery = useSchedulerQuery(
    () => schedulerDesignProposals.commissionSchemes(),
    [],
    { queryKey: "commission-schemes" },
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CommissionDraft>(() =>
    emptyCommissionDraft(undefined, ""),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const operations = catalogQuery.data?.operations;
  const onSaved = async () => {
    invalidateSchedulerQueries("commission-schemes", "commission-report");
    await schemesQuery.reload();
  };
  const pagination = useMemo(
    () => paginateSchedulerReportRows(schemesQuery.data ?? [], page, pageSize),
    [schemesQuery.data, page, pageSize],
  );
  function edit(scheme: DesignCommissionScheme) {
    setDraft({
      id: scheme.id,
      commerceId: scheme.commerceId,
      name: scheme.name,
      period: scheme.period,
      calculationScope: scheme.calculationScope,
      customerSegment: scheme.customerSegment,
      active: scheme.active,
      employeeIds: scheme.employeeIds,
      viewerProfileIds: scheme.viewerProfileIds,
      expectedVersion: scheme.currentVersion,
      rules: scheme.rules.map((rule) => ({
        mode: rule.mode,
        value: String(
          rule.mode === "ATTENDED_APPOINTMENT" ? rule.amount : rule.percentage,
        ),
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
            onClick={() => {
              void catalogQuery.reload();
              void schemesQuery.reload();
            }}
            loading={catalogQuery.loading || schemesQuery.loading}
          />
          {canAdmin ? (
            <Button
              onClick={() => {
                setDraft(emptyCommissionDraft(operations, currentProfileId));
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
        loading={catalogQuery.loading || schemesQuery.loading}
        error={catalogQuery.error || schemesQuery.error}
        empty={!schemesQuery.data?.length}
        emptyTitle="Sin esquemas"
        emptyDescription="Crea el primer esquema y asigna a sus empleados."
        onRetry={() => {
          void catalogQuery.reload();
          void schemesQuery.reload();
        }}
      >
        <div className="space-y-3" aria-label="Listado de esquemas de comisión">
          {pagination.rows.map((scheme) => (
            <Card key={scheme.id} className="admin-card">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 xl:w-64">
                    <p className="admin-eyebrow">
                      {commissionPeriodLabels[scheme.period]}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {scheme.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">
                        {commissionScopeLabels[scheme.calculationScope]}
                      </Badge>
                      <Badge variant="secondary">
                        {commissionSegmentLabels[scheme.customerSegment]}
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Modalidades
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scheme.rules.map((rule) => (
                        <div
                          key={rule.mode}
                          className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        >
                          {rule.mode === "ATTENDED_APPOINTMENT"
                            ? `${commissionMoney.format(rule.amount)} por cita atendida`
                            : `${rule.percentage}% · ${commissionRuleLabels[rule.mode]}`}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-0 text-sm xl:w-56">
                    <p className="font-semibold text-slate-700">Empleados</p>
                    <p className="mt-1 text-slate-500">
                      {scheme.employeeNames.join(", ")}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm xl:w-64">
                    <p className="flex items-center gap-1 font-semibold text-slate-700">
                      <ShieldCheck className="h-4 w-4" /> Visibilidad
                    </p>
                    <p className="mt-1 text-slate-500">
                      {scheme.viewerProfileIds
                        .map(
                          (id) =>
                            schedulerDesignDemoAccounts.find(
                              (profile) => profile.id === id,
                            )?.name ?? id,
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 xl:w-40 xl:flex-col xl:items-stretch">
                    <Badge variant={scheme.active ? "default" : "secondary"}>
                      v{scheme.currentVersion} ·{" "}
                      {scheme.active ? "Activo" : "Inactivo"}
                    </Badge>
                    {canAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => edit(scheme)}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <SchedulerPagination
          {...pagination}
          label="esquemas"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSize={pageSize}
        />
      </QueryBoundary>
      <AdministrationCoverageNotice title="Nómina conserva la liquidación final">
        Scheduler configura y versiona esquemas; el cálculo auditable se
        consulta en Reportes → Comisiones. Nómina conserva la creación de pagos,
        recibos y movimientos.
      </AdministrationCoverageNotice>
      {operations ? (
        <CommissionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          draft={draft}
          setDraft={setDraft}
          operations={operations}
          profiles={schedulerDesignDemoAccounts}
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const data = query.data;
  const onSaved = refreshAdministration(query.reload);
  const pagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        data?.administration.giftCards ?? [],
        page,
        pageSize,
      ),
    [data?.administration.giftCards, page, pageSize],
  );

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
          {pagination.rows.map((card) => (
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
        <SchedulerPagination
          {...pagination}
          label="gift cards"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSize={pageSize}
        />
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

interface StatusDefinitionDraft {
  id?: string;
  label: string;
  color: string;
  active: boolean;
  visibleInAgenda: boolean;
  version?: number;
}

function statusRevisionDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DesignStatusColorsSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.status-colors", "ADMIN");
  const query = useAdministrationData();
  const [commerceId, setCommerceId] = useState("");
  const [draft, setDraft] = useState<StatusDefinitionDraft | null>(null);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const selectedCommerceId =
    commerceId || query.data?.operations.commerces[0]?.id || "";
  const statusQuery = useSchedulerQuery(
    () => schedulerDesignProposals.statusDefinitions(selectedCommerceId),
    [selectedCommerceId],
    {
      queryKey: "design-status-definitions",
      enabled: Boolean(selectedCommerceId),
    },
  );

  useEffect(() => {
    setDraft(null);
    setSecret("");
  }, [selectedCommerceId]);

  function openCreate() {
    setSecret("");
    setDraft({
      label: "",
      color: "#9a7658",
      active: true,
      visibleInAgenda: true,
    });
  }

  function openEdit(definition: DesignStatusDefinition) {
    setSecret("");
    setDraft({
      id: definition.id,
      label: definition.label,
      color: definition.color,
      active: definition.active,
      visibleInAgenda: definition.visibleInAgenda,
      version: definition.version,
    });
  }

  async function saveDefinition() {
    if (!draft || !selectedCommerceId) return;
    setSaving(true);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret,
        purpose: "STATUS_COLORS_CHANGE",
        screenKey: "scheduler/administration/status-colors",
        targetType: "SchedulerCommerce",
        targetId: selectedCommerceId,
      });
      await schedulerDesignProposals.saveStatusDefinition({
        ...(draft.id ? { id: draft.id } : {}),
        commerceId: selectedCommerceId,
        label: draft.label.trim(),
        color: draft.color,
        active: draft.active,
        visibleInAgenda: draft.visibleInAgenda,
        ...(draft.version !== undefined
          ? { expectedVersion: draft.version }
          : {}),
        authorizationToken: authorization.token,
      });
      toast.success(
        draft.id
          ? "Status actualizado sin modificar su historial."
          : "Status agregado al catálogo versionado.",
      );
      setDraft(null);
      setSecret("");
      invalidateSchedulerQueries(...schedulerAdministrationInvalidations());
      await Promise.all([statusQuery.reload(), query.reload()]);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar el status.",
      );
    } finally {
      setSaving(false);
    }
  }

  const revisionsFor = (definitionId: string) =>
    (statusQuery.data?.revisions ?? []).filter(
      (revision) => revision.id === definitionId,
    );
  const statusPagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        statusQuery.data?.items ?? [],
        page,
        pageSize,
      ),
    [page, pageSize, statusQuery.data?.items],
  );

  return (
    <RestoredAdministrationFrame
      section="status-colors"
      readOnly={!canAdmin}
      actions={
        <div className="flex flex-wrap gap-2">
          <AdministrationRefreshButton
            onClick={() => void statusQuery.reload()}
            loading={statusQuery.loading}
          />
          {canAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Agregar status
            </Button>
          ) : null}
        </div>
      }
    >
      <QueryBoundary
        loading={query.loading || statusQuery.loading}
        error={query.error ?? statusQuery.error}
        onRetry={() => {
          void query.reload();
          void statusQuery.reload();
        }}
      >
        <Card className="admin-card">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="admin-eyebrow">Catálogo versionado</p>
                <h2 className="admin-section-title">Estados de la agenda</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Alta, edición e inactivación lógica. Cada cambio crea una
                  revisión nueva; las citas y versiones históricas conservan el
                  nombre, color y vigencia que les correspondía.
                </p>
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

            <div className="grid gap-4 lg:grid-cols-2">
              {statusPagination.rows.map((definition) => {
                const revisions = revisionsFor(definition.id);
                return (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    key={definition.id}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-10 w-10 shrink-0 rounded-xl border-2 border-white shadow-sm ring-1 ring-slate-200"
                        style={{ backgroundColor: definition.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-800">
                            {definition.label}
                          </h3>
                          <Badge
                            variant={
                              definition.active ? "default" : "secondary"
                            }
                          >
                            {definition.active ? "Activo" : "Inactivo"}
                          </Badge>
                          <Badge variant="outline">
                            {definition.system ? "Canónico" : "Personalizado"}
                          </Badge>
                          <Badge
                            variant={
                              definition.visibleInAgenda
                                ? "default"
                                : "secondary"
                            }
                          >
                            {definition.visibleInAgenda
                              ? "Visible en agenda"
                              : "Oculto en agenda"}
                          </Badge>
                        </div>
                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {definition.key} · {definition.color.toUpperCase()} ·
                          v{definition.version}
                        </p>
                      </div>
                      {canAdmin ? (
                        <Button
                          aria-label={`Editar ${definition.label}`}
                          onClick={() => openEdit(definition)}
                          size="icon"
                          variant="outline"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <details className="mt-4 border-t border-slate-100 pt-3">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-600">
                        <History className="h-4 w-4" /> Historial de versiones (
                        {revisions.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {revisions.map(
                          (revision: DesignStatusDefinitionRevision) => (
                            <div
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#f8f5f1] px-3 py-2 text-xs text-slate-600"
                              key={`${revision.id}:${revision.version}`}
                            >
                              <span className="font-semibold">
                                v{revision.version}
                              </span>
                              <span>{revision.label}</span>
                              <span className="font-mono">
                                {revision.color.toUpperCase()}
                              </span>
                              <span>
                                {revision.active ? "Activo" : "Inactivo"}
                              </span>
                              <span>
                                {revision.visibleInAgenda
                                  ? "Visible en agenda"
                                  : "Oculto en agenda"}
                              </span>
                              <span className="ml-auto text-slate-400">
                                {statusRevisionDate(revision.effectiveFrom)}
                                {revision.effectiveTo
                                  ? ` — ${statusRevisionDate(revision.effectiveTo)}`
                                  : " — vigente"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
            <SchedulerPagination
              {...statusPagination}
              label="status"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSize={pageSize}
            />
            <p className="rounded-2xl bg-[#f8f5f1] p-4 text-sm leading-6 text-slate-500">
              Los estados canónicos actualizan su color vigente en Agenda. Los
              estados personalizados quedan listos como propuesta de catálogo;
              asignarlos a citas requiere ampliar el enum y las transiciones del
              contrato productivo antes de activarlos fuera de esta demo.
            </p>
          </CardContent>
        </Card>
      </QueryBoundary>

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <DialogContent className="admin-dialog max-w-lg overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "Editar status" : "Agregar status"}
            </DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="status-name">Nombre</Label>
                <Input
                  id="status-name"
                  className="mt-1.5"
                  maxLength={40}
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, label: event.target.value }
                        : current,
                    )
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div>
                  <Label htmlFor="status-color-text">Color</Label>
                  <Input
                    id="status-color-text"
                    className="mt-1.5 font-mono uppercase"
                    value={draft.color}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, color: event.target.value }
                          : current,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="status-color-picker">Selector</Label>
                  <Input
                    id="status-color-picker"
                    className="mt-1.5 h-10 cursor-pointer p-1"
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(draft.color)
                        ? draft.color
                        : "#9a7658"
                    }
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, color: event.target.value }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Disponibilidad</Label>
                <Select
                  value={draft.active ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(value) =>
                    setDraft((current) =>
                      current
                        ? { ...current, active: value === "ACTIVE" }
                        : current,
                    )
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#f8f5f1] p-4">
                <button
                  aria-checked={draft.visibleInAgenda}
                  className="flex w-full items-center justify-between gap-4 text-left"
                  onClick={() =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            visibleInAgenda: !current.visibleInAgenda,
                          }
                        : current,
                    )
                  }
                  role="switch"
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">
                      Mostrar en la agenda
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Ocultarlo no borra citas, métricas ni versiones
                      históricas.
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      draft.visibleInAgenda ? "bg-[#263649]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                        draft.visibleInAgenda ? "left-6" : "left-1"
                      }`}
                    />
                  </span>
                </button>
              </div>
              <div>
                <Label htmlFor="status-catalog-secret">Código personal</Label>
                <Input
                  id="status-catalog-secret"
                  autoComplete="off"
                  className="mt-1.5"
                  type="password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Autoriza sólo esta versión. El código no se guarda en el
                  historial.
                </p>
              </div>
              <div className="flex justify-end border-t border-slate-200 pt-4">
                <Button
                  disabled={
                    saving ||
                    !secret ||
                    draft.label.trim().length < 2 ||
                    !/^#[0-9a-fA-F]{6}$/.test(draft.color)
                  }
                  onClick={() => void saveDefinition()}
                >
                  <Save className="mr-2 h-4 w-4" /> Guardar nueva versión
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </RestoredAdministrationFrame>
  );
}

export function RestoredStatusColorsSection() {
  if (schedulerDesignProposals.available) return <DesignStatusColorsSection />;
  return <CanonicalStatusColorsSection />;
}

function CanonicalStatusColorsSection() {
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const selectedCommerceId =
    commerceId || query.data?.operations.commerces[0]?.id || "";
  const existing = useMemo(
    () =>
      query.data?.administration.statusColors.find(
        (item) => item.commerceId === selectedCommerceId,
      )?.colors ?? [],
    [query.data?.administration.statusColors, selectedCommerceId],
  );
  const statusPagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        [...SCHEDULER_APPOINTMENT_STATUSES],
        page,
        pageSize,
      ),
    [page, pageSize],
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
              {statusPagination.rows.map((status) => {
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
            <SchedulerPagination
              {...statusPagination}
              label="status"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSize={pageSize}
            />
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
    name: "",
    sku: "",
    price: "",
    kind: "PACKAGE" as "PACKAGE" | "MEMBERSHIP",
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
  const [packagePage, setPackagePage] = useState(1);
  const [packagePageSize, setPackagePageSize] =
    useState<SchedulerReportPageSize>(20);
  const [addonPage, setAddonPage] = useState(1);
  const [addonPageSize, setAddonPageSize] =
    useState<SchedulerReportPageSize>(20);
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] =
    useState<SchedulerReportPageSize>(20);
  const data = query.data;
  const onSaved = refreshAdministration(query.reload);
  const packagePagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        data?.administration.packages ?? [],
        packagePage,
        packagePageSize,
      ),
    [data?.administration.packages, packagePage, packagePageSize],
  );
  const addonPagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        data?.administration.addons ?? [],
        addonPage,
        addonPageSize,
      ),
    [addonPage, addonPageSize, data?.administration.addons],
  );
  const classPagination = useMemo(
    () =>
      paginateSchedulerReportRows(
        data?.administration.classSchedules ?? [],
        classPage,
        classPageSize,
      ),
    [classPage, classPageSize, data?.administration.classSchedules],
  );

  async function savePackage() {
    const profile = data?.administration.packages.find(
      (item) => item.posPackageId === packageDraft.posPackageId,
    );
    setSaving(true);
    const input = {
      commerceId: packageDraft.commerceId,
      name: packageDraft.name.trim(),
      price: Number(packageDraft.price || 0).toFixed(2),
      kind: packageDraft.kind,
      branchProfileIds: packageDraft.branchProfileIds,
      sessions: Number(packageDraft.sessions),
      simultaneous: packageDraft.simultaneous,
      acceptsOnline: packageDraft.acceptsOnline,
      active: packageDraft.active,
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
    };
    await runSchedulerMutation(
      () =>
        packageDraft.posPackageId
          ? schedulerApi.updatePackageProfile(packageDraft.posPackageId, {
              ...input,
              sku: packageDraft.sku,
              ...(packageDraft.expectedVersion
                ? { expectedVersion: packageDraft.expectedVersion }
                : {}),
            })
          : schedulerApi.createPackageProfile(input),
      {
        onSuccess: async () => {
          toast.success(
            profile
              ? "Membresía o paquete actualizado."
              : "Membresía o paquete creado.",
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

  async function updatePackageStatus(
    item: NonNullable<typeof data>["administration"]["packages"][number],
    active: boolean,
  ) {
    if (item.active === active) return;
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.updatePackageProfile(item.posPackageId, {
          commerceId: item.commerceId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          kind: item.kind,
          branchProfileIds: item.branchProfileIds,
          sessions: item.sessions,
          simultaneous: item.simultaneous,
          acceptsOnline: item.acceptsOnline,
          active,
          expectedVersion: item.version,
          serviceLines: item.serviceLines.map((line) => ({
            serviceProfileId: line.serviceProfileId,
            quantity: line.quantity,
            priceOverride: line.priceOverride,
            sortOrder: line.sortOrder,
          })),
        }),
      {
        onSuccess: async () => {
          toast.success(
            `${item.kind === "MEMBERSHIP" ? "Membresía" : "Paquete"} ${
              active ? "activado" : "desactivado"
            }.`,
          );
          await onSaved();
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
                  <h3 className="admin-section-title">Membresías y paquetes</h3>
                  {canAdmin ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPackageDraft({
                          posPackageId: "",
                          name: "",
                          sku: "",
                          price: "",
                          kind: "PACKAGE",
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
                      <Plus className="mr-2 h-4 w-4" /> Nueva membresía o
                      paquete
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {packagePagination.rows.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.kind === "MEMBERSHIP"
                              ? "Membresía"
                              : "Paquete"}{" "}
                            · {item.sku} · {item.sessions} sesiones
                          </p>
                        </div>
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      {canAdmin ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={item.active ? "default" : "outline"}
                            disabled={saving || item.active}
                            onClick={() => void updatePackageStatus(item, true)}
                          >
                            <Power className="mr-1.5 h-3.5 w-3.5" /> Activo
                          </Button>
                          <Button
                            size="sm"
                            variant={!item.active ? "destructive" : "outline"}
                            disabled={saving || !item.active}
                            onClick={() =>
                              void updatePackageStatus(item, false)
                            }
                          >
                            <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Inactivo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => {
                              setPackageDraft({
                                posPackageId: item.posPackageId,
                                name: item.name,
                                sku: item.sku,
                                price: item.price,
                                kind: item.kind,
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
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                <SchedulerPagination
                  {...packagePagination}
                  label="membresías y paquetes"
                  onPageChange={setPackagePage}
                  onPageSizeChange={setPackagePageSize}
                  pageSize={packagePageSize}
                />
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardContent className="p-5">
                <h3 className="admin-section-title">Complementos</h3>
                <div className="mt-4 space-y-3">
                  {addonPagination.rows.map((item) => (
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
                <SchedulerPagination
                  {...addonPagination}
                  label="complementos"
                  onPageChange={setAddonPage}
                  onPageSizeChange={setAddonPageSize}
                  pageSize={addonPageSize}
                />
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardContent className="p-5">
                <h3 className="admin-section-title">Horarios de clase</h3>
                <div className="mt-4 space-y-3">
                  {classPagination.rows.map((item) => (
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
                <SchedulerPagination
                  {...classPagination}
                  label="horarios"
                  onPageChange={setClassPage}
                  onPageSizeChange={setClassPageSize}
                  pageSize={classPageSize}
                />
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
                <DialogTitle>
                  {packageDraft.posPackageId
                    ? "Editar membresía o paquete"
                    : "Nueva membresía o paquete"}
                </DialogTitle>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={packageDraft.kind}
                      onValueChange={(value: "PACKAGE" | "MEMBERSHIP") =>
                        setPackageDraft((current) => ({
                          ...current,
                          kind: value,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBERSHIP">Membresía</SelectItem>
                        <SelectItem value="PACKAGE">Paquete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      className="mt-1.5"
                      value={packageDraft.name}
                      onChange={(event) =>
                        setPackageDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Precio</Label>
                    <Input
                      className="mt-1.5"
                      min="0"
                      step="0.01"
                      type="number"
                      value={packageDraft.price}
                      onChange={(event) =>
                        setPackageDraft((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="rounded-xl border border-[#e7ddd4] bg-[#f8f5f1] px-4 py-3 sm:col-span-2">
                    <p className="text-sm font-medium text-slate-800">
                      SKU automático y consecutivo
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {packageDraft.sku
                        ? `SKU asignado: ${packageDraft.sku}`
                        : packageDraft.kind === "MEMBERSHIP"
                          ? "Se asignará el siguiente consecutivo MEM al guardar."
                          : "Se asignará el siguiente consecutivo PAQ al guardar."}
                    </p>
                  </div>
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
                      !packageDraft.name.trim() ||
                      !packageDraft.commerceId ||
                      !packageDraft.branchProfileIds.length ||
                      !packageDraft.serviceProfileIds.length
                    }
                  >
                    <WalletCards className="mr-2 h-4 w-4" />
                    Guardar{" "}
                    {packageDraft.kind === "MEMBERSHIP"
                      ? "membresía"
                      : "paquete"}
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
