"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  AlertTriangle,
  BadgeCheck,
  CalendarX2,
  FileDown,
  FileSpreadsheet,
  HeartHandshake,
  Loader2,
  Printer,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  TrendingDown,
  UserCheck,
  UsersRound,
  UserRoundX,
} from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import { useSchedulerSession } from "@/lib/session";
import type {
  DesignCustomerRecoveryCase,
  DesignCustomerRecoveryActivityStatus,
  DesignCustomerRecoveryPurchaseReport,
  DesignCustomerRecoveryReason,
  DesignCustomerRecoverySettings,
  DesignCustomerRecoveryStatus,
  DesignCustomerRecoveryTeam,
  DesignOperationAgent,
} from "../../../design/contracts";
import {
  exportCustomerRecoverySelection,
  exportRecoveryPerformanceReport,
  exportRecoveryPurchaseReport,
  printCustomerRecoverySelection,
} from "./customer-recovery-export";

const reasonLabels: Record<DesignCustomerRecoveryReason, string> = {
  NEVER_ATTENDED: "Nunca asistió",
  MEMBERSHIP_ENDED: "Membresía terminada",
  TREATMENT_ENDED: "Tratamiento terminado",
};

const statusLabels: Record<DesignCustomerRecoveryStatus, string> = {
  PENDING: "Por recuperar",
  RECOVERED: "Recuperado",
  LOST: "Cliente perdido",
};

const activityLabels: Record<DesignCustomerRecoveryActivityStatus, string> = {
  AWAITING_APPOINTMENT: "Sin próxima cita",
  SCHEDULED: "Cita programada",
  RESCHEDULED: "Reagendó",
  CANCELED: "Canceló",
  NO_SHOW: "No asistió",
  ATTENDED: "Asistió",
  PURCHASED: "Compró",
  LAYAWAY: "Realizó apartado",
};

const emptySettings: DesignCustomerRecoverySettings = {
  branchId: "",
  neverAttendedDays: 15,
  membershipEndedDays: 7,
  treatmentEndedDays: 7,
  updatedAt: "",
};

function formatDate(value: string | null) {
  if (!value) return "Sin visita previa";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function RecoveryStatusBadge({
  status,
}: {
  status: DesignCustomerRecoveryStatus;
}) {
  const className = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    RECOVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    LOST: "border-rose-200 bg-rose-50 text-rose-700",
  }[status];
  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {statusLabels[status]}
    </Badge>
  );
}

function RecoveryActivityBadge({
  status,
}: {
  status: DesignCustomerRecoveryActivityStatus;
}) {
  const className = {
    AWAITING_APPOINTMENT: "border-slate-200 bg-slate-50 text-slate-600",
    SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700",
    RESCHEDULED: "border-violet-200 bg-violet-50 text-violet-700",
    CANCELED: "border-rose-200 bg-rose-50 text-rose-700",
    NO_SHOW: "border-orange-200 bg-orange-50 text-orange-700",
    ATTENDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PURCHASED: "border-emerald-200 bg-emerald-50 text-emerald-800",
    LAYAWAY: "border-amber-200 bg-amber-50 text-amber-800",
  }[status];
  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {activityLabels[status]}
    </Badge>
  );
}

export function CustomerRecoveryWorkspace() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canWrite = canAccess("clients", "WRITE");
  const canExport = canAccess("clients", "EXPORT");
  const [branchId, setBranchId] = useState(
    bootstrap?.authorizedBranchIds[0] ?? "",
  );
  const [cases, setCases] = useState<DesignCustomerRecoveryCase[]>([]);
  const [agents, setAgents] = useState<DesignOperationAgent[]>([]);
  const [teams, setTeams] = useState<DesignCustomerRecoveryTeam[]>([]);
  const [purchaseReport, setPurchaseReport] =
    useState<DesignCustomerRecoveryPurchaseReport | null>(null);
  const [settings, setSettings] =
    useState<DesignCustomerRecoverySettings>(emptySettings);
  const [settingsDraft, setSettingsDraft] =
    useState<DesignCustomerRecoverySettings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportingDashboard, setExportingDashboard] = useState<
    "pdf" | "xlsx" | null
  >(null);
  const [exportingPurchases, setExportingPurchases] = useState<
    "pdf" | "xlsx" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState<DesignCustomerRecoveryReason | "ALL">(
    "ALL",
  );
  const [status, setStatus] = useState<DesignCustomerRecoveryStatus | "ALL">(
    "ALL",
  );
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [performanceDimension, setPerformanceDimension] = useState<
    "GROUP" | "SELLER" | "AGENT"
  >("GROUP");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<DesignCustomerRecoveryCase | null>(
    null,
  );
  const [nextStatus, setNextStatus] =
    useState<DesignCustomerRecoveryStatus>("RECOVERED");
  const [notes, setNotes] = useState("");
  const [recoveryAgentId, setRecoveryAgentId] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignmentCase, setAssignmentCase] =
    useState<DesignCustomerRecoveryCase | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<"TEAM" | "AGENT">(
    "TEAM",
  );
  const [assignmentTargetId, setAssignmentTargetId] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  useEffect(() => {
    if (!bootstrap?.authorizedBranchIds.includes(branchId)) {
      setBranchId(bootstrap?.authorizedBranchIds[0] ?? "");
    }
  }, [bootstrap, branchId]);

  const loadRecovery = useCallback(async () => {
    if (!branchId || !schedulerDesignProposals.available) return;
    setLoading(true);
    setError(null);
    try {
      const [items, currentSettings, operationAgents, recoveryTeams, purchases] =
        await Promise.all([
        schedulerDesignProposals.customerRecoveryCases({
          branchIds: [branchId],
        }),
        schedulerDesignProposals.customerRecoverySettings(branchId),
        schedulerDesignProposals.listAuthorizationAgents(),
        schedulerDesignProposals.customerRecoveryTeams({
          branchIds: [branchId],
        }),
        schedulerDesignProposals.customerRecoveryPurchaseReport({
          branchIds: [branchId],
        }),
      ]);
      setCases(items);
      setAgents(
        operationAgents.filter(
          (agent) =>
            agent.active &&
            agent.allowedPurposes.includes("CUSTOMER_RECOVERY_STATUS_CHANGE"),
        ),
      );
      setTeams(recoveryTeams.filter((team) => team.active));
      setPurchaseReport(purchases);
      setSettings(currentSettings);
      setSettingsDraft(currentSettings);
      setSelectedIds((current) => {
        const available = new Set(items.map((item) => item.id));
        return new Set([...current].filter((id) => available.has(id)));
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar la recuperación de clientes.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void loadRecovery();
  }, [loadRecovery]);

  const filteredCases = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
    return cases.filter(
      (item) =>
        (reason === "ALL" || item.reason === reason) &&
        (status === "ALL" || item.status === status) &&
        (teamFilter === "ALL" || item.assignedTeamId === teamFilter) &&
        (agentFilter === "ALL" || item.assignedAgentId === agentFilter) &&
        (!normalizedQuery ||
          [item.customerName, item.phone, item.portfolioOwnerName].some(
            (value) =>
              value?.toLocaleLowerCase("es-MX").includes(normalizedQuery),
          )),
    );
  }, [agentFilter, cases, query, reason, status, teamFilter]);

  const selectedRows = useMemo(
    () => cases.filter((item) => selectedIds.has(item.id)),
    [cases, selectedIds],
  );

  const summary = useMemo(() => {
    const lostBySeller = cases
      .filter((item) => item.status === "LOST")
      .reduce<Record<string, number>>((result, item) => {
        result[item.portfolioOwnerName] =
          (result[item.portfolioOwnerName] ?? 0) + 1;
        return result;
      }, {});
    const topLostSeller = Object.entries(lostBySeller).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0];
    return {
      pending: cases.filter((item) => item.status === "PENDING").length,
      recovered: cases.filter((item) => item.status === "RECOVERED").length,
      lost: cases.filter((item) => item.status === "LOST").length,
      topLostSellerName: topLostSeller?.[0] ?? "Sin datos",
      topLostSellerCount: topLostSeller?.[1] ?? 0,
    };
  }, [cases]);

  const performanceRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        id: string;
        name: string;
        role: string;
        actions: number;
        recovered: number;
        lost: number;
        pending: number;
        lastActionAt: string;
        saleAmount: number;
      }
    >();
    if (performanceDimension === "AGENT") {
      for (const item of cases) {
        for (const movement of item.history) {
          const current = rows.get(movement.recoveryAgentId) ?? {
            id: movement.recoveryAgentId,
            name: movement.recoveryAgentName,
            role: movement.recoveryAgentRole,
            actions: 0,
            recovered: 0,
            lost: 0,
            pending: 0,
            lastActionAt: movement.createdAt,
            saleAmount: 0,
          };
          current.actions += 1;
          if (movement.toStatus === "RECOVERED") current.recovered += 1;
          if (movement.toStatus === "LOST") current.lost += 1;
          if (movement.toStatus === "PENDING") current.pending += 1;
          if (movement.createdAt > current.lastActionAt) {
            current.lastActionAt = movement.createdAt;
          }
          current.saleAmount +=
            purchaseReport?.rows
              .filter(
                (purchase) =>
                  purchase.recoveryCaseId === item.id &&
                  purchase.assignedAgentName === movement.recoveryAgentName,
              )
              .reduce((sum, purchase) => sum + purchase.saleAmount, 0) ?? 0;
          rows.set(movement.recoveryAgentId, current);
        }
      }
    } else {
      for (const item of cases) {
        const id =
          performanceDimension === "GROUP"
            ? (item.assignedTeamId ?? "UNASSIGNED")
            : item.portfolioOwnerName;
        const name =
          performanceDimension === "GROUP"
            ? (item.assignedTeamName ?? "Sin grupo asignado")
            : item.portfolioOwnerName;
        const current = rows.get(id) ?? {
          id,
          name,
          role:
            performanceDimension === "GROUP"
              ? "Grupo de trabajo"
              : "Vendedor de cartera",
          actions: 0,
          recovered: 0,
          lost: 0,
          pending: 0,
          lastActionAt: item.updatedAt,
          saleAmount: 0,
        };
        current.actions += 1;
        if (item.status === "RECOVERED") current.recovered += 1;
        if (item.status === "LOST") current.lost += 1;
        if (item.status === "PENDING") current.pending += 1;
        if (item.updatedAt > current.lastActionAt) {
          current.lastActionAt = item.updatedAt;
        }
        current.saleAmount +=
          purchaseReport?.rows
            .filter((purchase) => purchase.recoveryCaseId === item.id)
            .reduce((sum, purchase) => sum + purchase.saleAmount, 0) ?? 0;
        rows.set(id, current);
      }
    }
    return [...rows.values()]
      .map((row) => ({
        ...row,
        recoveryRate: row.actions
          ? Math.round((row.recovered / row.actions) * 100)
          : 0,
      }))
      .sort(
        (left, right) =>
          right.recovered - left.recovered ||
          right.actions - left.actions ||
          left.name.localeCompare(right.name, "es-MX"),
      );
  }, [cases, performanceDimension, purchaseReport]);

  const allFilteredSelected =
    filteredCases.length > 0 &&
    filteredCases.every((item) => selectedIds.has(item.id));

  function toggleAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredCases.forEach((item) => next.delete(item.id));
      } else {
        filteredCases.forEach((item) => next.add(item.id));
      }
      return next;
    });
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAssignment(item: DesignCustomerRecoveryCase) {
    const mode = item.assignedAgentId ? "AGENT" : "TEAM";
    setAssignmentCase(item);
    setAssignmentMode(mode);
    setAssignmentTargetId(
      mode === "AGENT"
        ? (item.assignedAgentId ?? "")
        : (item.assignedTeamId ?? ""),
    );
  }

  async function saveAssignment() {
    if (!assignmentCase || !assignmentTargetId) return;
    setSavingAssignment(true);
    setError(null);
    try {
      const updated =
        await schedulerDesignProposals.saveCustomerRecoveryAssignment(
          assignmentCase.id,
          { mode: assignmentMode, targetId: assignmentTargetId },
        );
      setCases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setAssignmentCase(null);
      toast.success(
        assignmentMode === "TEAM"
          ? "Cliente asignado al grupo de recuperación."
          : "Cliente asignado a la persona responsable.",
      );
      await loadRecovery();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar la asignación.",
      );
    } finally {
      setSavingAssignment(false);
    }
  }

  function openUpdate(item: DesignCustomerRecoveryCase) {
    setSelected(item);
    setNextStatus(item.status === "RECOVERED" ? "LOST" : "RECOVERED");
    setNotes("");
    setRecoveryAgentId("");
    setCode("");
    setError(null);
  }

  async function saveStatus() {
    if (!selected || notes.trim().length < 5 || !recoveryAgentId || !code)
      return;
    setSaving(true);
    setError(null);
    try {
      const grant = await schedulerDesignProposals.authorizeOperation({
        code,
        purpose: "CUSTOMER_RECOVERY_STATUS_CHANGE",
        targetType: "CUSTOMER_RECOVERY",
        targetId: selected.id,
      });
      const updated =
        await schedulerDesignProposals.updateCustomerRecoveryStatus(
          selected.id,
          {
            status: nextStatus,
            notes: notes.trim(),
            recoveryAgentId,
            authorizationToken: grant.token,
          },
        );
      await schedulerDesignProposals.commitOperation({
        token: grant.token,
        action: `Recuperación: ${statusLabels[nextStatus]}`,
        targetType: "CUSTOMER_RECOVERY",
        targetId: selected.id,
        metadata: {
          customerId: selected.customerId,
          reason: selected.reason,
          fromStatus: selected.status,
          toStatus: nextStatus,
          recoveryAgentId,
        },
      });
      setCases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelected(null);
      setNotes("");
      setRecoveryAgentId("");
      setCode("");
      toast.success(`Cliente marcado como ${statusLabels[nextStatus]}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el caso de recuperación.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setError(null);
    try {
      const updated =
        await schedulerDesignProposals.saveCustomerRecoverySettings({
          ...settingsDraft,
          branchId,
        });
      setSettings(updated);
      setSettingsDraft(updated);
      toast.success("Reglas automáticas de recuperación actualizadas.");
      await loadRecovery();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar la configuración.",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function download(format: "pdf" | "xlsx") {
    if (!selectedRows.length) return;
    setExporting(format);
    try {
      await exportCustomerRecoverySelection(selectedRows, format);
      toast.success(
        `${selectedRows.length} registros seleccionados exportados en ${format === "pdf" ? "PDF" : "Excel"}.`,
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "No fue posible exportar.",
      );
    } finally {
      setExporting(null);
    }
  }

  function printSelection() {
    if (!selectedRows.length) return;
    try {
      printCustomerRecoverySelection(selectedRows);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "No fue posible imprimir.",
      );
    }
  }

  async function downloadPerformance(format: "pdf" | "xlsx") {
    if (!performanceRows.length) return;
    setExportingDashboard(format);
    try {
      const label = {
        GROUP: "Grupo de trabajo",
        SELLER: "Vendedor",
        AGENT: "Agente",
      }[performanceDimension];
      await exportRecoveryPerformanceReport(performanceRows, label, format);
      toast.success(`Reporte de rendimiento generado en ${format.toUpperCase()}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No fue posible exportar.");
    } finally {
      setExportingDashboard(null);
    }
  }

  async function downloadPurchases(format: "pdf" | "xlsx") {
    if (!purchaseReport?.rows.length) return;
    setExportingPurchases(format);
    try {
      await exportRecoveryPurchaseReport(purchaseReport, format);
      toast.success(`Reporte de compras generado en ${format.toUpperCase()}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No fue posible exportar.");
    } finally {
      setExportingPurchases(null);
    }
  }

  if (!schedulerDesignProposals.available) {
    return (
      <main className="min-h-screen bg-[#f4f1ed] p-8 text-[#263649]">
        Recuperación de clientes estará disponible al conectar este submódulo.
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <header className="border-b border-[#e8ddd4] bg-[linear-gradient(180deg,#fff_0%,#fbf8f4_100%)] px-5 py-7 sm:px-7 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#263649] text-white">
              <HeartHandshake className="h-6 w-6" />
            </span>
            <div>
              <p className="label-caps">Clientes</p>
              <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3rem)]">
                Recuperación de clientes
              </h1>
              <p className="mt-2 max-w-[70ch] text-sm leading-6 text-slate-500">
                Identifica, gestiona y mide clientes sin recuperar, recuperados
                o perdidos sin modificar su historial.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] space-y-1.5">
              <Label htmlFor="recovery-branch">Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="recovery-branch" className="h-11 rounded-xl bg-white">
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
            </div>
            <Button
              disabled={!canExport || !selectedRows.length || Boolean(exporting)}
              onClick={() => void download("pdf")}
              variant="outline"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {exporting === "pdf" ? "Generando…" : "PDF"}
            </Button>
            <Button
              disabled={!canExport || !selectedRows.length || Boolean(exporting)}
              onClick={() => void download("xlsx")}
              variant="outline"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exporting === "xlsx" ? "Generando…" : "Excel"}
            </Button>
            <Button
              disabled={!canExport || !selectedRows.length}
              onClick={printSelection}
              variant="outline"
            >
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-5 px-5 py-6 sm:px-7 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Sin recuperar",
              value: summary.pending,
              Icon: CalendarX2,
              className: "text-amber-700",
            },
            {
              label: "Recuperados",
              value: summary.recovered,
              Icon: BadgeCheck,
              className: "text-emerald-700",
            },
            {
              label: "Clientes perdidos",
              value: summary.lost,
              Icon: UserRoundX,
              className: "text-rose-700",
            },
            {
              label: "Seleccionados",
              value: selectedRows.length,
              Icon: FileDown,
              className: "text-[#526273]",
            },
          ].map(({ label, value, Icon, className }) => (
            <article
              className="rounded-[22px] border border-[#e8ded5] bg-white p-5 shadow-[0_12px_32px_rgba(38,54,73,0.05)]"
              key={label}
            >
              <div className={`flex items-center gap-2 ${className}`}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  {label}
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">
                  {summary.pending
                    ? `${summary.pending} clientes requieren seguimiento`
                    : "No hay clientes pendientes de recuperación"}
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  La alerta se recalcula con los plazos configurados para esta
                  sucursal.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-start gap-3">
              <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700">
                  Vendedor con más clientes perdidos
                </p>
                <p className="mt-2 font-semibold text-rose-950">
                  {summary.topLostSellerName}
                </p>
                <p className="mt-1 text-sm text-rose-800">
                  {summary.topLostSellerCount} clientes perdidos
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-[#e7ddd4] bg-white p-5 shadow-[0_18px_50px_rgba(38,54,73,0.06)]">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#ad8b67]" />
            <div>
              <h2 className="font-semibold">Reglas automáticas por tiempo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Define cuántos días deben pasar antes de mostrar al cliente en
                recuperación. Los casos ya gestionados conservan su historial.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
            {[
              {
                key: "neverAttendedDays" as const,
                label: "Nunca asistió después de",
              },
              {
                key: "membershipEndedDays" as const,
                label: "Membresía terminada después de",
              },
              {
                key: "treatmentEndedDays" as const,
                label: "Tratamiento terminado después de",
              },
            ].map(({ key, label }) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`recovery-${key}`}>{label}</Label>
                <div className="relative">
                  <Input
                    className="h-11 rounded-xl pr-14"
                    disabled={!canWrite}
                    id={`recovery-${key}`}
                    max={3650}
                    min={1}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={settingsDraft[key]}
                  />
                  <span className="pointer-events-none absolute right-3 top-3 text-sm text-slate-400">
                    días
                  </span>
                </div>
              </div>
            ))}
            <Button
              className="h-11 bg-[#263649] text-white hover:bg-[#1d2b3a]"
              disabled={
                !canWrite ||
                savingSettings ||
                [
                  settingsDraft.neverAttendedDays,
                  settingsDraft.membershipEndedDays,
                  settingsDraft.treatmentEndedDays,
                ].some((value) => !Number.isInteger(value) || value < 1) ||
                JSON.stringify(settingsDraft) === JSON.stringify(settings)
              }
              onClick={() => void saveSettings()}
            >
              <Save className="mr-2 h-4 w-4" />
              {savingSettings ? "Guardando…" : "Guardar reglas"}
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_18px_50px_rgba(38,54,73,0.06)]">
          <div className="flex flex-col gap-4 border-b border-[#eee6df] bg-[#fcfaf8] px-5 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-caps">Rendimiento</p>
              <h2 className="mt-1 text-xl font-semibold">
                Dashboard de rendimiento de recuperación
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Compara resultados, conversión y venta atribuida por grupo,
                vendedor o agente que realizó la gestión.
              </p>
            </div>
            <div className="min-w-[220px] space-y-1.5">
              <Label htmlFor="performance-dimension">Ver reporte por</Label>
              <Select
                value={performanceDimension}
                onValueChange={(value) =>
                  setPerformanceDimension(
                    value as "GROUP" | "SELLER" | "AGENT",
                  )
                }
              >
                <SelectTrigger id="performance-dimension" className="h-11 rounded-xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP">Grupo de trabajo</SelectItem>
                  <SelectItem value="SELLER">Vendedor de cartera</SelectItem>
                  <SelectItem value="AGENT">Agente de recuperación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!canExport || !performanceRows.length || Boolean(exportingDashboard)}
                onClick={() => void downloadPerformance("pdf")}
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button
                disabled={!canExport || !performanceRows.length || Boolean(exportingDashboard)}
                onClick={() => void downloadPerformance("xlsx")}
                variant="outline"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
            </div>
          </div>
          {performanceRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#faf8f5] text-xs font-semibold text-[#526273]">
                  <tr>
                    <th className="px-5 py-3">Responsable</th>
                    <th className="px-5 py-3 text-center">Cartera</th>
                    <th className="px-5 py-3 text-center">Recuperados</th>
                    <th className="px-5 py-3 text-center">Pendientes</th>
                    <th className="px-5 py-3 text-center">Perdidos</th>
                    <th className="px-5 py-3 text-center">Conversión</th>
                    <th className="px-5 py-3 text-right">Venta recuperada</th>
                    <th className="px-5 py-3">Última actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceRows.map((row, index) => (
                    <tr className="border-t border-[#f0e8e1]" key={row.id}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#263649] text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-semibold">{row.name}</p>
                            <p className="text-xs text-slate-500">{row.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-semibold">{row.actions}</td>
                      <td className="px-5 py-4 text-center text-emerald-700">{row.recovered}</td>
                      <td className="px-5 py-4 text-center text-amber-700">{row.pending}</td>
                      <td className="px-5 py-4 text-center text-rose-700">{row.lost}</td>
                      <td className="px-5 py-4 text-center">
                        <Badge className="rounded-full" variant="outline">
                          {row.recoveryRate}%
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {money.format(row.saleAmount)}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(row.lastActionAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">
              Aún no existen gestiones para esta vista de rendimiento.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_18px_50px_rgba(38,54,73,0.06)]">
          <div className="flex flex-col gap-4 border-b border-[#eee6df] bg-[#fcfaf8] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#ad8b67]" />
              <div>
                <p className="label-caps">Conversión comercial</p>
                <h2 className="mt-1 text-xl font-semibold">
                  Compras en la primera cita de recuperación
                </h2>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!canExport || !purchaseReport?.rows.length || Boolean(exportingPurchases)}
                onClick={() => void downloadPurchases("pdf")}
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button
                disabled={!canExport || !purchaseReport?.rows.length || Boolean(exportingPurchases)}
                onClick={() => void downloadPurchases("xlsx")}
                variant="outline"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-b border-[#eee6df] p-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Clientes compradores", purchaseReport?.summary.customers ?? 0],
              ["Venta", money.format(purchaseReport?.summary.saleAmount ?? 0)],
              ["Recibido", money.format(purchaseReport?.summary.depositAmount ?? 0)],
              ["Saldo", money.format(purchaseReport?.summary.balanceAmount ?? 0)],
              ["Ticket promedio", money.format(purchaseReport?.summary.averageTicket ?? 0)],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-[#f8f5f1] p-4" key={String(label)}>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {purchaseReport?.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#faf8f5] text-xs font-semibold text-[#526273]">
                  <tr>
                    <th className="px-5 py-3">Cliente / primera cita</th>
                    <th className="px-5 py-3">Asignación</th>
                    <th className="px-5 py-3">Vendedor</th>
                    <th className="px-5 py-3">Especialista</th>
                    <th className="px-5 py-3">Resultado</th>
                    <th className="px-5 py-3 text-right">Venta</th>
                    <th className="px-5 py-3 text-right">Recibido</th>
                    <th className="px-5 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseReport.rows.map((row) => (
                    <tr className="border-t border-[#f0e8e1]" key={row.recoveryCaseId}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{row.customerName}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(row.appointmentStartsAt)}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.assignedTeamName !== "Sin grupo"
                          ? row.assignedTeamName
                          : row.assignedAgentName}
                      </td>
                      <td className="px-5 py-4">{row.portfolioOwnerName}</td>
                      <td className="px-5 py-4">{row.specialistName}</td>
                      <td className="px-5 py-4">
                        <Badge variant="outline">
                          {row.purchaseKind === "LAYAWAY" ? "Apartado" : "Compra"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">{money.format(row.saleAmount)}</td>
                      <td className="px-5 py-4 text-right">{money.format(row.depositAmount)}</td>
                      <td className="px-5 py-4 text-right">{money.format(row.balanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">
              Aún no hay compras en primeras citas posteriores a la recuperación.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_18px_50px_rgba(38,54,73,0.06)]">
          <div className="grid gap-3 border-b border-[#eee6df] bg-[#fcfaf8] p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_200px_180px_220px_220px]">
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Buscar cliente en recuperación"
                className="h-11 rounded-xl border-[#dfd5cc] bg-white pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, teléfono o vendedor"
                value={query}
              />
            </span>
            <Select
              value={reason}
              onValueChange={(value) =>
                setReason(value as DesignCustomerRecoveryReason | "ALL")
              }
            >
              <SelectTrigger aria-label="Motivo de recuperación" className="h-11 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los motivos</SelectItem>
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as DesignCustomerRecoveryStatus | "ALL")
              }
            >
              <SelectTrigger aria-label="Status de recuperación" className="h-11 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger aria-label="Grupo de recuperación" className="h-11 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los grupos</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger aria-label="Persona asignada" className="h-11 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las personas</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando cartera de
              recuperación…
            </div>
          ) : filteredCases.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-[#faf8f5] text-xs font-semibold text-[#526273]">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        aria-label="Seleccionar todos los registros filtrados"
                        checked={allFilteredSelected}
                        className="h-4 w-4 accent-[#263649]"
                        onChange={toggleAllFiltered}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Asignación</th>
                    <th className="px-4 py-3">Actividad de Agenda</th>
                    <th className="px-4 py-3">Vendedor de cartera</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((item) => (
                    <tr className="border-t border-[#f0e8e1] odd:bg-[#fcfaf8]" key={item.id}>
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Seleccionar ${item.customerName}`}
                          checked={selectedIds.has(item.id)}
                          className="h-4 w-4 accent-[#263649]"
                          onChange={() => toggleSelection(item.id)}
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{item.customerName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.phone ?? "Sin teléfono"} · {item.branchName}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#526273]">
                          {reasonLabels[item.reason]}
                        </p>
                        <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500">
                          {item.reasonDetail}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          {item.assignedTeamId ? (
                            <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ad8b67]" />
                          ) : (
                            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#ad8b67]" />
                          )}
                          <div>
                            <p className="font-medium text-[#526273]">
                              {item.assignedTeamName ??
                                item.assignedAgentName ??
                                "Sin asignación"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.assignedTeamId ? "Grupo" : "Persona"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                        <RecoveryActivityBadge status={item.activityStatus} />
                        <span className="block">Detectado: {formatDate(item.eligibilityAt)}</span>
                        <span className="block">Última cita: {formatDate(item.lastAppointmentAt)}</span>
                        <span className="block">{item.attendedCount} asistencias</span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.portfolioOwnerName}
                      </td>
                      <td className="px-4 py-4">
                        <RecoveryStatusBadge status={item.status} />
                        {item.history[0] ? (
                          <div className="mt-2 max-w-[220px] text-xs text-slate-500">
                            <p>{item.history[0].notes}</p>
                            <p className="mt-1 font-medium text-[#526273]">
                              Agente: {item.history[0].recoveryAgentName}
                            </p>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            className="rounded-xl"
                            disabled={!canWrite}
                            onClick={() => openAssignment(item)}
                            size="sm"
                            variant="outline"
                          >
                            Asignar
                          </Button>
                          <Button
                            className="rounded-xl"
                            disabled={!canWrite}
                            onClick={() => openUpdate(item)}
                            size="sm"
                            variant="outline"
                          >
                            Actualizar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <BadgeCheck className="h-7 w-7 text-[#ad8b67]" />
              <p className="mt-3 font-semibold">Sin casos en este filtro</p>
              <p className="mt-1 text-sm text-slate-500">
                Cambia el motivo, status o término de búsqueda.
              </p>
            </div>
          )}
        </section>

        {error && !selected ? (
          <p className="text-sm font-medium text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </main>

      <Dialog
        open={Boolean(assignmentCase)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setAssignmentCase(null);
            setAssignmentTargetId("");
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-xl overflow-x-hidden rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Asignar recuperación</DialogTitle>
            <DialogDescription>
              {assignmentCase?.customerName}. Asigna este cliente a un grupo de
              trabajo o directamente a una persona.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment-mode">Tipo de asignación</Label>
              <Select
                value={assignmentMode}
                onValueChange={(value) => {
                  setAssignmentMode(value as "TEAM" | "AGENT");
                  setAssignmentTargetId("");
                }}
              >
                <SelectTrigger id="assignment-mode" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEAM">Grupo de trabajo</SelectItem>
                  <SelectItem value="AGENT">Persona responsable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-target">
                {assignmentMode === "TEAM" ? "Grupo" : "Persona"}
              </Label>
              <Select value={assignmentTargetId} onValueChange={setAssignmentTargetId}>
                <SelectTrigger id="assignment-target" className="h-11 rounded-xl">
                  <SelectValue
                    placeholder={
                      assignmentMode === "TEAM"
                        ? "Selecciona un grupo"
                        : "Selecciona una persona"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(assignmentMode === "TEAM" ? teams : agents).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-2xl border border-[#e8ded5] bg-[#fcfaf8] p-4 text-sm text-slate-600">
              La asignación alimentará el dashboard de rendimiento y el reporte
              de compras recuperadas. No cambia el vendedor de cartera.
            </div>
            {error ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setAssignmentCase(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-[#263649] text-white hover:bg-[#1d2b3a]"
              disabled={savingAssignment || !assignmentTargetId}
              onClick={() => void saveAssignment()}
            >
              {savingAssignment ? "Guardando…" : "Guardar asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelected(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-xl overflow-x-hidden rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Resultado de recuperación</DialogTitle>
            <DialogDescription>
              {selected?.customerName}. El cambio conserva quién lo autorizó y
              no altera citas anteriores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-status">Nuevo status</Label>
              <Select
                value={nextStatus}
                onValueChange={(value) =>
                  setNextStatus(value as DesignCustomerRecoveryStatus)
                }
              >
                <SelectTrigger id="recovery-status" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Por recuperar</SelectItem>
                  <SelectItem value="RECOVERED">Recuperado</SelectItem>
                  <SelectItem value="LOST">Cliente perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-notes">Resultado de la gestión</Label>
              <Textarea
                id="recovery-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej. Aceptó una nueva cita para continuar el tratamiento."
                rows={4}
                value={notes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-agent">
                Agente que realizó la recuperación
              </Label>
              <Select value={recoveryAgentId} onValueChange={setRecoveryAgentId}>
                <SelectTrigger id="recovery-agent" className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecciona al responsable" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} · {agent.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Puede ser distinto de la persona que autoriza el cambio.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Código de autorización</Label>
              <Input
                autoComplete="one-time-code"
                id="recovery-code"
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="Código personal"
                type="password"
                value={code}
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setSelected(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-[#263649] text-white hover:bg-[#1d2b3a]"
              disabled={
                saving ||
                !code ||
                !recoveryAgentId ||
                notes.trim().length < 5 ||
                nextStatus === selected?.status
              }
              onClick={() => void saveStatus()}
            >
              {saving ? "Guardando…" : "Autorizar y guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
