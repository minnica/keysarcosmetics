"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Edit3,
  Gavel,
  HandCoins,
  LockKeyhole,
  Plus,
  ReceiptText,
  FileBarChart,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  type DemoPayrollAdjustment,
  type PayrollAdjustmentStatus,
  type PayrollAdjustmentType,
  type PayrollModule,
  type PayrollReportTarget,
  payrollModuleLabel,
  payrollModuleForCategory,
  usePayrollDemo,
} from "./payroll-demo-context";
import {
  CostBranchSelector,
  employeeCostBranchIds,
} from "./payroll-cost-branch-selector";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const adjustmentLabels: Record<PayrollAdjustmentType, string> = {
  PLUS: "AJUSTE DE MÁS",
  MINUS: "AJUSTE DE MENOS",
  FINE: "MULTA",
  BONUS: "BONO",
  LOAN: "PRÉSTAMO",
  LOAN_PAYMENT: "PAGO DE PRÉSTAMO",
  BASE_SALARY: "SUELDO BASE",
};
const adjustmentIcons: Record<PayrollAdjustmentType, React.ElementType> = {
  PLUS: CirclePlus,
  MINUS: CircleMinus,
  FINE: Gavel,
  BONUS: WalletCards,
  LOAN: HandCoins,
  LOAN_PAYMENT: Banknote,
  BASE_SALARY: UsersRound,
};
const statusLabels: Record<PayrollAdjustmentStatus, string> = {
  DRAFT: "BORRADOR",
  PENDING: "POR APROBAR",
  APPROVED: "APROBADO",
  CANCELLED: "CANCELADO",
};
const reportTargetLabels: Record<PayrollReportTarget, string> = {
  PAYROLL: "NÓMINA DESTINO",
  CONSOLIDATED: "CONSOLIDADO",
  BRANCH_COST: "COSTO POR SUCURSAL",
  RECEIPT: "RECIBO",
  PERSONAL_PORTAL: "PORTAL PERSONAL",
};

function AdjustmentTypeLabel({
  type,
  className = "",
}: {
  type: PayrollAdjustmentType;
  className?: string;
}) {
  const Icon = adjustmentIcons[type];
  const iconColor =
    type === "PLUS"
      ? "text-emerald-600"
      : type === "MINUS"
        ? "text-rose-600"
        : "text-current";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <span>{adjustmentLabels[type]}</span>
    </span>
  );
}

function AdjustmentDialog({
  adjustment,
  defaultType,
  open,
  onOpenChange,
}: {
  adjustment: DemoPayrollAdjustment | null;
  defaultType: PayrollAdjustmentType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    state,
    periodOptions,
    addPayrollAdjustment,
    updatePayrollAdjustment,
  } = usePayrollDemo();
  const initialEmployeeId =
    adjustment?.employeeId ?? state.employees[0]?.id ?? "";
  const initialEmployee = state.employees.find(
    (item) => item.id === initialEmployeeId,
  );
  const inferredModule = initialEmployee
    ? payrollModuleForCategory(initialEmployee.category)
    : "FIXED";
  const initialModule = (adjustment?.payrollModule ??
    inferredModule) as Exclude<PayrollModule, "CONSOLIDATED">;
  const initialRun =
    state.runs.find((run) => run.id === adjustment?.payrollRunId) ??
    state.runs.find((run) => run.module === initialModule);
  const [type, setType] = useState<PayrollAdjustmentType>(
    adjustment?.type ?? defaultType,
  );
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [participantIds, setParticipantIds] = useState<string[]>(
    adjustment?.participantIds ?? [initialEmployeeId],
  );
  const [costBranchIds, setCostBranchIds] = useState<string[]>(
    adjustment?.costBranchIds ??
      (adjustment?.branchId
        ? [adjustment.branchId]
        : initialEmployee
          ? employeeCostBranchIds(initialEmployee, state.branches)
          : []),
  );
  const [payrollModule, setPayrollModule] =
    useState<Exclude<PayrollModule, "CONSOLIDATED">>(initialModule);
  const [selectedPeriodStart, setSelectedPeriodStart] = useState(
    adjustment?.periodStart ??
      initialRun?.periodStart ??
      periodOptions[0]?.start ??
      "",
  );
  const [masterCode, setMasterCode] = useState("");
  const [periodUnlocked, setPeriodUnlocked] = useState(false);
  const [payrollDate, setPayrollDate] = useState(
    adjustment?.payrollDate ??
      initialRun?.periodEnd ??
      new Date().toISOString().slice(0, 10),
  );
  const [concept, setConcept] = useState(adjustment?.concept ?? "");
  const [amount, setAmount] = useState(String(adjustment?.amount ?? ""));
  const [comments, setComments] = useState(adjustment?.comments ?? "");
  const [reportTargets, setReportTargets] = useState<PayrollReportTarget[]>(
    adjustment?.reportTargets ?? [
      "PAYROLL",
      "CONSOLIDATED",
      "BRANCH_COST",
      "RECEIPT",
      "PERSONAL_PORTAL",
    ],
  );
  const [sharedFine, setSharedFine] = useState(
    (adjustment?.participantIds.length ?? 1) > 1,
  );
  const selectedPeriod = periodOptions.find(
    (period) => period.start === selectedPeriodStart,
  );
  const selectedRun = state.runs.find(
    (run) =>
      run.module === payrollModule && run.periodStart === selectedPeriodStart,
  );
  const masterEmployee = state.employees.find(
    (employee) =>
      employee.roleId === "role-admin" && employee.secondaryAccessKey,
  );

  function selectEmployee(id: string) {
    const employee = state.employees.find((item) => item.id === id);
    const nextModule = employee
      ? payrollModuleForCategory(employee.category)
      : "FIXED";
    const normalizedModule =
      nextModule === "CONSOLIDATED" ? "FIXED" : nextModule;
    const nextRun = state.runs.find((item) => item.module === normalizedModule);
    setEmployeeId(id);
    setParticipantIds([id]);
    setSharedFine(false);
    if (employee)
      setCostBranchIds(employeeCostBranchIds(employee, state.branches));
    setPayrollModule(
      normalizedModule as Exclude<PayrollModule, "CONSOLIDATED">,
    );
    if (nextRun) {
      setSelectedPeriodStart(nextRun.periodStart);
      setPayrollDate(nextRun.periodEnd);
    }
    setMasterCode("");
    setPeriodUnlocked(false);
  }

  function unlockPeriods() {
    if (
      !masterEmployee?.secondaryAccessKey ||
      masterCode !== masterEmployee.secondaryAccessKey
    ) {
      toast.error("Código máster incorrecto.");
      setMasterCode("");
      return;
    }
    setPeriodUnlocked(true);
    setMasterCode("");
    toast.success("Otros periodos habilitados para este movimiento.");
  }

  function toggleParticipant(id: string) {
    if (id === employeeId) return;
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleReportTarget(target: PayrollReportTarget) {
    setReportTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  }

  function submit() {
    const parsedAmount = Number(amount);
    if (
      !employeeId ||
      costBranchIds.length === 0 ||
      !selectedPeriod ||
      !concept.trim() ||
      parsedAmount <= 0 ||
      !comments.trim() ||
      reportTargets.length === 0
    ) {
      toast.error(
        "Captura nómina, empleado, sucursal, concepto, monto, comentarios y al menos un reporte.",
      );
      return;
    }
    if (
      payrollDate < selectedPeriod.start ||
      payrollDate > selectedPeriod.end
    ) {
      toast.error(
        `La fecha debe quedar dentro de ${selectedPeriod.start} — ${selectedPeriod.end}.`,
      );
      return;
    }
    const input = {
      type,
      employeeId,
      participantIds:
        type === "FINE" && sharedFine ? participantIds : [employeeId],
      branchId: costBranchIds[0] ?? "",
      costBranchIds,
      payrollModule,
      payrollRunId:
        selectedRun?.id ?? `master-${payrollModule}-${selectedPeriod.start}`,
      payrollDate,
      periodStart: selectedPeriod.start,
      reportTargets,
      concept: concept.trim().toLocaleUpperCase("es-MX"),
      amount: parsedAmount,
      comments: comments.trim().toLocaleUpperCase("es-MX"),
    };
    if (adjustment) {
      updatePayrollAdjustment(adjustment.id, input);
      toast.success(
        "Movimiento editado y devuelto a borrador para nueva aprobación.",
      );
    } else {
      addPayrollAdjustment({ ...input, status: "DRAFT" });
      toast.success("Movimiento guardado como borrador.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {adjustment ? "Editar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
          <DialogDescription>
            El movimiento se crea pendiente y debe aprobarse antes de entrar a
            la corrida y reportes seleccionados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adjustment-date">
                <CalendarDays className="mr-1 inline h-4 w-4" />
                Fecha
              </Label>
              <Input
                id="adjustment-date"
                type="date"
                min={selectedPeriod?.start}
                max={selectedPeriod?.end}
                value={payrollDate}
                onChange={(event) => setPayrollDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  const next = value as PayrollAdjustmentType;
                  setType(next);
                  if (next !== "FINE") {
                    setSharedFine(false);
                    setParticipantIds([employeeId]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(adjustmentLabels) as PayrollAdjustmentType[]
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      <AdjustmentTypeLabel type={value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-concept">Concepto</Label>
              <Input
                id="adjustment-concept"
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                placeholder="MOTIVO DEL MOVIMIENTO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">Monto total</Label>
              <Input
                id="adjustment-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </section>
          <section className="rounded-xl border border-[color:var(--border-color)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <WalletCards className="h-4 w-4" />
              <div>
                <p className="font-semibold">Nómina afectada</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Define dónde se cargará, pagará o descontará este movimiento.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de nómina</Label>
                <Select
                  value={payrollModule}
                  onValueChange={(value) => {
                    const next = value as Exclude<
                      PayrollModule,
                      "CONSOLIDATED"
                    >;
                    const nextRun = state.runs.find(
                      (item) => item.module === next,
                    );
                    setPayrollModule(next);
                    if (nextRun) {
                      setSelectedPeriodStart(nextRun.periodStart);
                      setPayrollDate(nextRun.periodEnd);
                    }
                    setMasterCode("");
                    setPeriodUnlocked(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.payrollModules
                      .filter(
                        (module) =>
                          module.active && module.id !== "CONSOLIDATED",
                      )
                      .map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periodo donde se aplicará</Label>
                <Select
                  value={selectedPeriodStart}
                  disabled={!periodUnlocked}
                  onValueChange={(periodStart) => {
                    const period = periodOptions.find(
                      (item) => item.start === periodStart,
                    );
                    setSelectedPeriodStart(periodStart);
                    if (period) setPayrollDate(period.end);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SELECCIONA EL PERIODO" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((period) => (
                      <SelectItem key={period.value} value={period.start}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!periodUnlocked ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label
                    htmlFor="movement-master-code"
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em]"
                  >
                    <LockKeyhole className="h-3.5 w-3.5" /> Código máster para
                    mover a otro periodo
                  </Label>
                  <Input
                    id="movement-master-code"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    value={masterCode}
                    onChange={(event) =>
                      setMasterCode(
                        event.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="••••"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        unlockPeriods();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={unlockPeriods}
                  disabled={masterCode.length !== 4}
                >
                  <LockKeyhole className="mr-1.5 h-3.5 w-3.5" /> Autorizar
                  periodo
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">
                <span>
                  <Check className="mr-1.5 inline h-3.5 w-3.5" />
                  Cambio de periodo autorizado
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => {
                    const currentRun = state.runs.find(
                      (run) => run.module === payrollModule,
                    );
                    setSelectedPeriodStart(
                      currentRun?.periodStart ?? periodOptions[0]?.start ?? "",
                    );
                    if (currentRun) setPayrollDate(currentRun.periodEnd);
                    setPeriodUnlocked(false);
                  }}
                >
                  Bloquear
                </Button>
              </div>
            )}
            {selectedPeriod && (
              <div className="mt-3 rounded-lg bg-[color:var(--accent-hover)]/40 px-4 py-3 text-sm">
                <strong>{payrollModuleLabel(state, payrollModule)}</strong>
                <span className="ml-2 text-[color:var(--text-muted)]">
                  Se aplicará en {selectedPeriod.start} — {selectedPeriod.end}
                  {selectedRun
                    ? ` · ${selectedRun.status}`
                    : " · AUTORIZACIÓN MÁSTER"}
                </span>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-[color:var(--border-color)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              <p className="font-semibold">Participante y sucursal</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Empleado / vendedor</Label>
                <Select value={employeeId} onValueChange={selectEmployee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  <Building2 className="mr-1 inline h-4 w-4" />
                  Sucursales que asumen el costo
                </Label>
                <CostBranchSelector
                  branches={state.branches}
                  selectedIds={costBranchIds}
                  onChange={setCostBranchIds}
                />
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Selecciona una, varias o todas; el costo se reparte en partes
                  iguales.
                </p>
              </div>
            </div>
            {type === "FINE" && (
              <div className="mt-4">
                <Button
                  type="button"
                  variant={sharedFine ? "default" : "outline"}
                  onClick={() => {
                    const next = !sharedFine;
                    setSharedFine(next);
                    if (!next) setParticipantIds([employeeId]);
                  }}
                >
                  <UsersRound className="mr-2 h-4 w-4" />
                  {sharedFine
                    ? `${participantIds.length} PARTICIPANTES`
                    : "MULTA NO COMPARTIDA"}
                </Button>
                {sharedFine && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {state.employees
                      .filter((employee) => employee.id !== employeeId)
                      .map((employee) => {
                        const selected = participantIds.includes(employee.id);
                        return (
                          <button
                            key={employee.id}
                            type="button"
                            onClick={() => toggleParticipant(employee.id)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-[color:var(--border-color)]"}`}
                          >
                            <span>{employee.name}</span>
                            {selected && (
                              <Check className="h-4 w-4 text-emerald-600" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="rounded-xl border border-[color:var(--border-color)] p-4">
            <div className="mb-1 flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              <p className="font-semibold">Reportes que serán afectados</p>
            </div>
            <p className="mb-4 text-xs text-[color:var(--text-muted)]">
              Selecciona dónde aparecerá después de aprobarse.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(reportTargetLabels) as PayrollReportTarget[]).map(
                (target) => {
                  const selected = reportTargets.includes(target);
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => toggleReportTarget(target)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-xs font-semibold ${selected ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-[color:var(--border-color)] text-[color:var(--text-muted)]"}`}
                    >
                      <span>{reportTargetLabels[target]}</span>
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  );
                },
              )}
            </div>
          </section>
          <div className="space-y-2">
            <Label htmlFor="adjustment-comments">
              <ReceiptText className="mr-1 inline h-4 w-4" />
              Notas y soporte
            </Label>
            <Textarea
              id="adjustment-comments"
              rows={4}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="EXPLICA EL MOTIVO, SOPORTE Y CUALQUIER OBSERVACIÓN"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>
            {adjustment ? "Guardar y solicitar revisión" : "Guardar movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollAdjustmentsDemo() {
  const { state, setPayrollAdjustmentStatus } = usePayrollDemo();
  const [dialog, setDialog] = useState<{
    adjustment: DemoPayrollAdjustment | null;
    type: PayrollAdjustmentType;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PayrollAdjustmentType | "ALL">(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<
    PayrollAdjustmentStatus | "ALL"
  >("ALL");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const rows = useMemo(
    () =>
      state.adjustments
        .filter((adjustment) => {
          const employee = state.employees.find(
            (item) => item.id === adjustment.employeeId,
          );
          const matchesSearch =
            !search.trim() ||
            employee?.name
              .toLocaleLowerCase("es-MX")
              .includes(search.trim().toLocaleLowerCase("es-MX")) ||
            adjustment.comments
              .toLocaleLowerCase("es-MX")
              .includes(search.trim().toLocaleLowerCase("es-MX"));
          return (
            matchesSearch &&
            (typeFilter === "ALL" || adjustment.type === typeFilter) &&
            (statusFilter === "ALL" || adjustment.status === statusFilter)
          );
        })
        .sort((a, b) => b.payrollDate.localeCompare(a.payrollDate)),
    [search, state.adjustments, state.employees, statusFilter, typeFilter],
  );
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(rows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const firstVisibleRow =
    rows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const lastVisibleRow = Math.min(currentPage * effectivePageSize, rows.length);
  const paginatedRows = rows.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const selectableRows = rows.filter((item) => item.status === "PENDING");
  const selectedRows = selectableRows.filter((item) =>
    selectedIds.includes(item.id),
  );
  const allSelectableRowsSelected =
    selectableRows.length > 0 && selectedRows.length === selectableRows.length;
  const pending = state.adjustments.filter(
    (item) => item.status === "PENDING",
  ).length;
  const approved = state.adjustments.filter(
    (item) => item.status === "APPROVED",
  );
  const positive = approved
    .filter(
      (item) =>
        item.type === "PLUS" || item.type === "BONUS" || item.type === "LOAN",
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const negative = approved
    .filter(
      (item) =>
        item.type === "MINUS" ||
        item.type === "FINE" ||
        item.type === "LOAN_PAYMENT",
    )
    .reduce((sum, item) => sum + item.amount, 0);

  function setStatus(
    adjustment: DemoPayrollAdjustment,
    status: PayrollAdjustmentStatus,
  ) {
    setPayrollAdjustmentStatus(adjustment.id, status);
    if (status === "PENDING") toast.info("Aprobación solicitada.");
    if (status === "APPROVED")
      toast.success(
        "Movimiento aprobado: sucursal, nómina, recibo y consolidado se actualizaron.",
      );
    if (status === "CANCELLED")
      toast.info("Movimiento cancelado y retirado de todos los cálculos.");
  }

  function toggleSelected(adjustmentId: string) {
    setSelectedIds((current) =>
      current.includes(adjustmentId)
        ? current.filter((id) => id !== adjustmentId)
        : [...current, adjustmentId],
    );
  }

  function toggleAllSelectable() {
    setSelectedIds((current) => {
      const selectableIds = selectableRows.map((item) => item.id);
      if (allSelectableRowsSelected)
        return current.filter((id) => !selectableIds.includes(id));
      return Array.from(new Set([...current, ...selectableIds]));
    });
  }

  function approveSelected() {
    if (selectedRows.length === 0) {
      toast.info("Selecciona al menos un movimiento pendiente.");
      return;
    }
    selectedRows.forEach((adjustment) =>
      setPayrollAdjustmentStatus(adjustment.id, "APPROVED"),
    );
    toast.success(
      `${selectedRows.length} ${selectedRows.length === 1 ? "movimiento aprobado" : "movimientos aprobados"} en una sola acción.`,
    );
    setSelectedIds([]);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">DEMO FRONTEND</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Ajustes ajenos a comisión
            </span>
          </div>
          <h1 className="page-title">Movimientos de nómina</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Captura percepciones, deducciones, multas, bonos, préstamos, pagos y
            sueldo base indicando la nómina y reportes afectados.
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 self-start rounded-xl px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] shadow-[0_8px_20px_rgba(82,53,33,0.16)] xl:self-auto"
          onClick={() => setDialog({ adjustment: null, type: "PLUS" })}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo movimiento
        </Button>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <Check className="h-5 w-5 text-amber-600" />
            <p className="label-caps mt-4">POR APROBAR</p>
            <p className="number-display mt-2 text-2xl">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <CirclePlus className="h-5 w-5 text-emerald-600" />
            <p className="label-caps mt-4">AJUSTES DE MÁS</p>
            <p className="number-display mt-2 text-2xl">
              {money.format(positive)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <CircleMinus className="h-5 w-5 text-rose-600" />
            <p className="label-caps mt-4">AJUSTES DE MENOS</p>
            <p className="number-display mt-2 text-2xl">
              {money.format(negative)}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-[color:var(--border-color)]">
        <CardHeader>
          <CardTitle className="section-heading uppercase">
            Alta rápida por tipo
          </CardTitle>
          <CardDescription>
            Todos los registros comienzan como borrador y requieren solicitud y
            aprobación.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(Object.keys(adjustmentLabels) as PayrollAdjustmentType[]).map(
            (type) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto justify-start py-3"
                onClick={() => setDialog({ adjustment: null, type })}
              >
                <AdjustmentTypeLabel type={type} className="text-xs" />
              </Button>
            ),
          )}
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="section-heading uppercase">
                Registro de movimientos
              </CardTitle>
              <CardDescription>
                La paloma solicita revisión; la doble paloma aprueba y afecta
                únicamente los destinos elegidos.
              </CardDescription>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelectedIds([]);
                }}
                placeholder="BUSCAR EMPLEADO"
              />
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as PayrollAdjustmentType | "ALL");
                  setPage(1);
                  setSelectedIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">TODOS LOS TIPOS</SelectItem>
                  {(
                    Object.keys(adjustmentLabels) as PayrollAdjustmentType[]
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      <AdjustmentTypeLabel type={value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as PayrollAdjustmentStatus | "ALL");
                  setPage(1);
                  setSelectedIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">TODOS LOS ESTATUS</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={allSelectableRowsSelected}
                aria-label="Seleccionar todos los movimientos pendientes filtrados"
                disabled={selectableRows.length === 0}
                onClick={toggleAllSelectable}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${allSelectableRowsSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}
              >
                {allSelectableRowsSelected ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">
                  {selectedRows.length > 0
                    ? `${selectedRows.length} seleccionados`
                    : "Selección múltiple"}
                </p>
                <p className="text-[9px] text-[color:var(--text-muted)]">
                  {selectableRows.length} pendientes dentro del filtro actual
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 self-start rounded-lg px-3 text-[10px] font-semibold uppercase tracking-[0.08em] sm:self-auto"
              disabled={selectedRows.length === 0}
              onClick={approveSelected}
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Aprobar seleccionados
              {selectedRows.length > 0 ? ` · ${selectedRows.length}` : ""}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Seleccionar</span>
                  </TableHead>
                  <TableHead>FECHA NÓMINA / REGISTRO</TableHead>
                  <TableHead>TIPO / EMPLEADO</TableHead>
                  <TableHead>NÓMINA / SUCURSAL</TableHead>
                  <TableHead>CONCEPTO / DESTINOS</TableHead>
                  <TableHead className="text-right">MONTO</TableHead>
                  <TableHead>ESTATUS</TableHead>
                  <TableHead className="text-right">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((adjustment) => {
                  const employee = state.employees.find(
                    (item) => item.id === adjustment.employeeId,
                  );
                  const adjustmentBranchIds = adjustment.costBranchIds?.length
                    ? adjustment.costBranchIds
                    : [adjustment.branchId];
                  const branchNames = adjustmentBranchIds
                    .map(
                      (branchId) =>
                        state.branches.find((item) => item.id === branchId)
                          ?.name,
                    )
                    .filter(Boolean);
                  const participantNames = adjustment.participantIds
                    .map(
                      (id) =>
                        state.employees.find((item) => item.id === id)?.name,
                    )
                    .filter(Boolean);
                  const positiveType =
                    adjustment.type === "PLUS" ||
                    adjustment.type === "BONUS" ||
                    adjustment.type === "LOAN" ||
                    adjustment.type === "BASE_SALARY";
                  return (
                    <TableRow key={adjustment.id}>
                      <TableCell className="w-10 pr-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selectedIds.includes(adjustment.id)}
                          aria-label={`Seleccionar movimiento de ${employee?.name ?? "empleado"}`}
                          disabled={adjustment.status !== "PENDING"}
                          onClick={() => toggleSelected(adjustment.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-25 ${selectedIds.includes(adjustment.id) ? "border-emerald-600 bg-emerald-600 text-white" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}
                        >
                          {selectedIds.includes(adjustment.id) ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </button>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">
                          {adjustment.payrollDate}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                          REGISTRADO: {adjustment.createdAt}
                        </p>
                      </TableCell>
                      <TableCell>
                        <AdjustmentTypeLabel
                          type={adjustment.type}
                          className="text-xs"
                        />
                        <p className="mt-1 font-semibold">{employee?.name}</p>
                        {participantNames.length > 1 && (
                          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                            COMPARTIDA: {participantNames.join(", ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p>
                          {payrollModuleLabel(state, adjustment.payrollModule)}
                        </p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {branchNames.length === state.branches.length
                            ? `TODAS · ${branchNames.length}`
                            : branchNames.length > 1
                              ? `${branchNames.length} SUCURSALES`
                              : (branchNames[0] ?? "SIN SUCURSAL")}
                        </p>
                        <p className="text-[10px] text-[color:var(--text-muted)]">
                          {adjustment.periodStart}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs font-semibold">
                          {adjustment.concept}
                        </p>
                        <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                          {adjustment.reportTargets.length} REPORTES ·{" "}
                          {adjustment.comments}
                        </p>
                      </TableCell>
                      <TableCell
                        className={`number-display text-right ${positiveType ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                      >
                        {positiveType ? "+" : "−"}
                        {money.format(adjustment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {statusLabels[adjustment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {adjustment.status !== "CANCELLED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Editar movimiento"
                              onClick={() =>
                                setDialog({ adjustment, type: adjustment.type })
                              }
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {adjustment.status === "DRAFT" && (
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Solicitar aprobación"
                              onClick={() => setStatus(adjustment, "PENDING")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {adjustment.status === "PENDING" && (
                            <Button
                              size="icon"
                              aria-label="Aprobar movimiento"
                              onClick={() => setStatus(adjustment, "APPROVED")}
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {adjustment.status !== "CANCELLED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Cancelar movimiento"
                              onClick={() => setStatus(adjustment, "CANCELLED")}
                            >
                              <XCircle className="h-4 w-4 text-rose-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-[color:var(--text-muted)]">
              Mostrando{" "}
              <span className="text-[color:var(--text-primary)]">
                {firstVisibleRow}–{lastVisibleRow}
              </span>{" "}
              de{" "}
              <span className="text-[color:var(--text-primary)]">
                {rows.length}
              </span>{" "}
              movimientos · página{" "}
              <span className="text-[color:var(--text-primary)]">
                {currentPage}
              </span>{" "}
              de{" "}
              <span className="text-[color:var(--text-primary)]">
                {totalPages}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-caps">FILAS</span>
              <Select
                value={pageSize}
                onValueChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                  setSelectedIds([]);
                }}
              >
                <SelectTrigger
                  className="h-8 w-[92px] rounded-lg text-xs"
                  aria-label="Movimientos por página"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="ALL">TODAS</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[11px]"
                disabled={currentPage <= 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[11px]"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              >
                Siguiente
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {dialog && (
        <AdjustmentDialog
          key={dialog.adjustment?.id ?? `new-${dialog.type}`}
          adjustment={dialog.adjustment}
          defaultType={dialog.type}
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
        />
      )}
    </div>
  );
}
