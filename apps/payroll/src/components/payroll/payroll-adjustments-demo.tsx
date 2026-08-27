"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  CircleMinus,
  CirclePlus,
  Edit3,
  Gavel,
  HandCoins,
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
  payrollModuleForCategory,
  payrollModuleLabels,
  usePayrollDemo,
} from "./payroll-demo-context";

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
const payrollModules: Exclude<PayrollModule, "CONSOLIDATED">[] = [
  "FIXED",
  "SPECIALIST",
  "COMMISSION",
  "CONTRACTOR",
];
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
  const { state, addPayrollAdjustment, updatePayrollAdjustment } =
    usePayrollDemo();
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
  const [branchId, setBranchId] = useState(
    adjustment?.branchId ??
      initialEmployee?.branchId ??
      state.branches[0]?.id ??
      "",
  );
  const [payrollModule, setPayrollModule] =
    useState<Exclude<PayrollModule, "CONSOLIDATED">>(initialModule);
  const [payrollRunId, setPayrollRunId] = useState(
    adjustment?.payrollRunId ?? initialRun?.id ?? "",
  );
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
  const availableRuns = state.runs.filter(
    (run) => run.module === payrollModule,
  );
  const selectedRun =
    state.runs.find((run) => run.id === payrollRunId) ?? availableRuns[0];

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
    if (employee) setBranchId(employee.branchId);
    setPayrollModule(
      normalizedModule as Exclude<PayrollModule, "CONSOLIDATED">,
    );
    if (nextRun) {
      setPayrollRunId(nextRun.id);
      setPayrollDate(nextRun.periodEnd);
    }
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
      !branchId ||
      !selectedRun ||
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
      payrollDate < selectedRun.periodStart ||
      payrollDate > selectedRun.periodEnd
    ) {
      toast.error(
        `La fecha debe quedar dentro de ${selectedRun.periodStart} — ${selectedRun.periodEnd}.`,
      );
      return;
    }
    const input = {
      type,
      employeeId,
      participantIds:
        type === "FINE" && sharedFine ? participantIds : [employeeId],
      branchId,
      payrollModule,
      payrollRunId: selectedRun.id,
      payrollDate,
      periodStart: selectedRun.periodStart,
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
                min={selectedRun?.periodStart}
                max={selectedRun?.periodEnd}
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
              <p className="font-semibold">Nómina que recibirá el movimiento</p>
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
                      setPayrollRunId(nextRun.id);
                      setPayrollDate(nextRun.periodEnd);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payrollModules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {payrollModuleLabels[module]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Corrida / periodo destino</Label>
                <Select
                  value={selectedRun?.id ?? ""}
                  onValueChange={(id) => {
                    const run = state.runs.find((item) => item.id === id);
                    setPayrollRunId(id);
                    if (run) setPayrollDate(run.periodEnd);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SELECCIONA UNA NÓMINA" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRuns.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.periodStart} — {run.periodEnd} · {run.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedRun && (
              <div className="mt-4 rounded-lg bg-[color:var(--accent-hover)]/40 px-4 py-3 text-sm">
                <strong>{payrollModuleLabels[selectedRun.module]}</strong>
                <span className="ml-2 text-[color:var(--text-muted)]">
                  Se sumará a la corrida {selectedRun.periodStart} —{" "}
                  {selectedRun.periodEnd}
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
                  Sucursal que asume el costo
                </Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="BUSCAR EMPLEADO"
              />
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as PayrollAdjustmentType | "ALL")
                }
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
                onValueChange={(value) =>
                  setStatusFilter(value as PayrollAdjustmentStatus | "ALL")
                }
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                {rows.map((adjustment) => {
                  const employee = state.employees.find(
                    (item) => item.id === adjustment.employeeId,
                  );
                  const branch = state.branches.find(
                    (item) => item.id === adjustment.branchId,
                  );
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
                      <TableCell>
                        <p className="font-semibold">
                          {adjustment.payrollDate}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                          REGISTRADO: {adjustment.createdAt}
                        </p>
                      </TableCell>
                      <TableCell>
                        <AdjustmentTypeLabel type={adjustment.type} className="text-xs" />
                        <p className="mt-1 font-semibold">{employee?.name}</p>
                        {participantNames.length > 1 && (
                          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                            COMPARTIDA: {participantNames.join(", ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p>{payrollModuleLabels[adjustment.payrollModule]}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {branch?.name}
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
