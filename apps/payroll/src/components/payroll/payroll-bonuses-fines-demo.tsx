"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCheck,
  Edit3,
  Gavel,
  Search,
  Sparkles,
  Target,
  Trash2,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@cosmetics/ui";
import {
  bonusFineConceptAllowsEmployee,
  type DemoMovement,
  type MovementStatus,
  type MovementType,
  employeeSalesForRange,
  payrollModuleLabel,
  resolveBonusConceptAward,
  usePayrollDemo,
} from "./payroll-demo-context";
import {
  CostBranchSelector,
  employeeCostBranchIds,
} from "./payroll-cost-branch-selector";
import { ReportExportButtons } from "./report-export-buttons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const statusLabels: Record<MovementStatus, string> = {
  DRAFT: "BORRADOR",
  PENDING: "POR APROBAR",
  APPROVED: "APROBADO",
  REJECTED: "RECHAZADO",
  CANCELLED: "CANCELADO",
};

function monthLabel(month: string) {
  const label = monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

function BonusFineMovementDialog({
  movement,
  defaultType,
  open,
  onOpenChange,
}: {
  movement: DemoMovement | null;
  defaultType: MovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, periodOptions, currentPeriod, addMovement, updateMovement } =
    usePayrollDemo();
  const initialEmployeeId =
    movement?.employeeId ?? state.employees[0]?.id ?? "";
  const initialEmployee = state.employees.find(
    (employee) => employee.id === initialEmployeeId,
  );
  const [type, setType] = useState<MovementType>(movement?.type ?? defaultType);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [catalogId, setCatalogId] = useState(movement?.catalogId ?? "");
  const [periodStart, setPeriodStart] = useState(
    movement?.periodStart ?? currentPeriod.start,
  );
  const [appliedAt, setAppliedAt] = useState(
    movement?.appliedAt ?? currentPeriod.end,
  );
  const [amount, setAmount] = useState(String(movement?.amount ?? ""));
  const [comments, setComments] = useState(movement?.comments ?? "");
  const [costBranchIds, setCostBranchIds] = useState<string[]>(
    movement?.costBranchIds ??
      (initialEmployee
        ? employeeCostBranchIds(initialEmployee, state.branches)
        : []),
  );
  const selectedPeriod = periodOptions.find(
    (period) => period.start === periodStart,
  );
  const selectedCatalog = state.bonusFineConcepts.find(
    (concept) => concept.id === catalogId,
  );
  const selectedSales = selectedPeriod
    ? employeeSalesForRange(
        state,
        employeeId,
        selectedPeriod.start,
        selectedPeriod.end,
      )
    : 0;
  const selectedAward = selectedCatalog
    ? resolveBonusConceptAward(selectedCatalog, selectedSales)
    : null;
  const availableConcepts = state.bonusFineConcepts.filter(
    (concept) =>
      concept.type === type &&
      bonusFineConceptAllowsEmployee(concept, employeeId) &&
      (concept.active || concept.id === movement?.catalogId) &&
      concept.validFrom <= (selectedPeriod?.end ?? currentPeriod.end) &&
      (!concept.validUntil ||
        concept.validUntil >= (selectedPeriod?.start ?? currentPeriod.start)),
  );

  function submit() {
    const parsedAmount = Number(amount);
    if (
      !employeeId ||
      !selectedCatalog ||
      !selectedPeriod ||
      !appliedAt ||
      !comments.trim() ||
      costBranchIds.length === 0 ||
      parsedAmount <= 0
    ) {
      toast.error(
        "Selecciona empleado, concepto, periodo, fecha, sucursal, monto y explica el motivo.",
      );
      return;
    }
    if (appliedAt < selectedPeriod.start || appliedAt > selectedPeriod.end) {
      toast.error(
        `La fecha debe estar dentro de ${selectedPeriod.start} — ${selectedPeriod.end}.`,
      );
      return;
    }
    const input = {
      catalogId: selectedCatalog.id,
      employeeId,
      costBranchIds,
      type: selectedCatalog.type,
      mode: selectedCatalog.mode,
      concept: selectedCatalog.name,
      comments: comments.trim().toLocaleUpperCase("es-MX"),
      amount: parsedAmount,
      threshold: selectedAward?.tier?.from ?? selectedCatalog.threshold,
      payrollModule: selectedCatalog.payrollModule,
      periodStart: selectedPeriod.start,
      appliedAt,
    };
    if (movement) {
      updateMovement(movement.id, input);
      toast.success("Registro corregido y devuelto a borrador.");
    } else {
      addMovement({ ...input, status: "PENDING" });
      toast.success(
        "Registro creado; al aprobarse actualizará la nómina y todos sus reportes.",
      );
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {movement ? "Corregir bono o multa" : "Registrar bono o multa"}
          </DialogTitle>
          <DialogDescription>
            El concepto proviene del catálogo de Configuración y conserva la
            nómina destino definida en su alta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as MovementType);
                  setCatalogId("");
                  setAmount("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BONUS">BONO</SelectItem>
                  <SelectItem value="FINE">MULTA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={employeeId}
                onValueChange={(value) => {
                  setEmployeeId(value);
                  setCatalogId("");
                  setAmount("");
                  const employee = state.employees.find(
                    (item) => item.id === value,
                  );
                  setCostBranchIds(
                    employee
                      ? employeeCostBranchIds(employee, state.branches)
                      : [],
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.employees
                    .filter((employee) => employee.active)
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Concepto registrado</Label>
              <Select
                value={catalogId}
                onValueChange={(value) => {
                  const catalog = state.bonusFineConcepts.find(
                    (concept) => concept.id === value,
                  );
                  setCatalogId(value);
                  if (catalog && selectedPeriod) {
                    const sales = employeeSalesForRange(
                      state,
                      employeeId,
                      selectedPeriod.start,
                      selectedPeriod.end,
                    );
                    const award = resolveBonusConceptAward(catalog, sales);
                    setAmount(
                      String(
                        catalog.mode === "SCALE"
                          ? award.amount
                          : catalog.defaultAmount,
                      ),
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ELIGE UN CONCEPTO" />
                </SelectTrigger>
                <SelectContent>
                  {availableConcepts.map((concept) => (
                    <SelectItem key={concept.id} value={concept.id}>
                      {concept.name} ·{" "}
                      {payrollModuleLabel(state, concept.payrollModule)}
                      {concept.temporary ? " · TEMPORAL" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableConcepts.length === 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No hay conceptos vigentes de este tipo para el periodo.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Periodo de nómina</Label>
              <Select
                value={periodStart}
                onValueChange={(value) => {
                  setPeriodStart(value);
                  const period = periodOptions.find(
                    (item) => item.start === value,
                  );
                  if (period) setAppliedAt(period.end);
                  setCatalogId("");
                  setAmount("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <div className="space-y-2">
              <Label htmlFor="bonus-fine-date">Fecha de aplicación</Label>
              <Input
                id="bonus-fine-date"
                type="date"
                min={selectedPeriod?.start}
                max={selectedPeriod?.end}
                value={appliedAt}
                onChange={(event) => setAppliedAt(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bonus-fine-amount">Monto aplicado</Label>
              <Input
                id="bonus-fine-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bonus-fine-comments">
                Motivo visible para el empleado
              </Label>
              <Textarea
                id="bonus-fine-comments"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                placeholder="EXPLICA POR QUÉ SE APLICA ESTE BONO O DESCUENTO"
                rows={3}
              />
              <p className="text-xs text-[color:var(--text-muted)]">
                Este comentario aparecerá en el recibo y en el portal del
                empleado.
              </p>
            </div>
          </div>
          {selectedCatalog && (
            <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-4 text-sm">
              <p className="font-semibold">{selectedCatalog.name}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Afecta{" "}
                {payrollModuleLabel(state, selectedCatalog.payrollModule)}
                {selectedCatalog.mode === "SCALE"
                  ? selectedCatalog.salesScale
                    ? selectedAward?.tier
                      ? ` · nivel ${money.format(selectedAward.tier.from)} a ${selectedAward.tier.to === null ? "sin tope" : money.format(selectedAward.tier.to)} · bono ${money.format(selectedAward.amount)}`
                      : ` · aún no alcanza el primer nivel (${money.format(selectedAward?.threshold ?? 0)})`
                    : ` · venta mínima ${money.format(selectedCatalog.threshold ?? 0)}`
                  : " · monto fijo"}
                .
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Sucursales que reciben el costo</Label>
            <CostBranchSelector
              branches={state.branches}
              selectedIds={costBranchIds}
              onChange={setCostBranchIds}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>
            {movement ? "Guardar corrección" : "Registrar movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionIcon({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function PayrollBonusesFinesDemo() {
  const { state, currentPeriod, setMovementStatus, deleteMovement } =
    usePayrollDemo();
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const isMaster = activeEmployee?.roleId === "role-admin";
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([
          currentPeriod.start.slice(0, 7),
          ...state.movements.map((movement) =>
            movement.periodStart.slice(0, 7),
          ),
        ]),
      ).sort((a, b) => b.localeCompare(a)),
    [currentPeriod.start, state.movements],
  );
  const [selectedMonth, setSelectedMonth] = useState(
    currentPeriod.start.slice(0, 7),
  );
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{
    movement: DemoMovement | null;
    type: MovementType;
  } | null>(null);

  const periodRows = useMemo(
    () =>
      state.movements.filter((movement) =>
        movement.periodStart.startsWith(selectedMonth),
      ),
    [selectedMonth, state.movements],
  );
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return periodRows
      .filter(
        (movement) =>
          employeeFilter === "ALL" || movement.employeeId === employeeFilter,
      )
      .filter((movement) => !dateFilter || movement.appliedAt === dateFilter)
      .filter(
        (movement) => typeFilter === "ALL" || movement.type === typeFilter,
      )
      .filter((movement) => {
        const employee = state.employees.find(
          (item) => item.id === movement.employeeId,
        );
        return (
          !query ||
          movement.concept.toLocaleLowerCase("es-MX").includes(query) ||
          movement.comments.toLocaleLowerCase("es-MX").includes(query) ||
          employee?.name.toLocaleLowerCase("es-MX").includes(query)
        );
      })
      .sort(
        (left, right) =>
          right.appliedAt.localeCompare(left.appliedAt) ||
          right.createdAt.localeCompare(left.createdAt),
      );
  }, [
    dateFilter,
    employeeFilter,
    periodRows,
    search,
    state.employees,
    typeFilter,
  ]);

  const approvedRows = periodRows.filter(
    (movement) => movement.status === "APPROVED",
  );
  const approvedBonuses = approvedRows
    .filter((movement) => movement.type === "BONUS")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const approvedFines = approvedRows
    .filter((movement) => movement.type === "FINE")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const pending = periodRows.filter(
    (movement) => movement.status === "DRAFT" || movement.status === "PENDING",
  ).length;
  const bonusAnalysis = state.bonusFineConcepts
    .filter((concept) => concept.type === "BONUS")
    .map((concept) => ({
      concept,
      count: periodRows.filter(
        (movement) =>
          movement.catalogId === concept.id &&
          movement.status !== "CANCELLED" &&
          movement.status !== "REJECTED",
      ).length,
      amount: periodRows
        .filter(
          (movement) =>
            movement.catalogId === concept.id && movement.status === "APPROVED",
        )
        .reduce((sum, movement) => sum + movement.amount, 0),
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.concept.name.localeCompare(right.concept.name, "es-MX"),
    );
  const mostApplied = bonusAnalysis[0];
  const leastApplied = [...bonusAnalysis].sort(
    (left, right) => left.count - right.count,
  )[0];
  const maxBonusCount = Math.max(...bonusAnalysis.map((item) => item.count), 1);
  const exportConfig = {
    title: "Historial de bonos y multas",
    subtitle: `${monthLabel(selectedMonth)} · ${rows.length} registros del periodo seleccionado`,
    metadata: [
      { label: "Periodo", value: monthLabel(selectedMonth) },
      {
        label: "Empleado",
        value:
          employeeFilter === "ALL"
            ? "TODOS"
            : (state.employees.find(
                (employee) => employee.id === employeeFilter,
              )?.name ?? "EMPLEADO"),
      },
      {
        label: "Tipo",
        value:
          typeFilter === "ALL"
            ? "BONOS Y MULTAS"
            : typeFilter === "BONUS"
              ? "BONOS"
              : "MULTAS",
      },
      { label: "Fecha", value: dateFilter || "TODAS LAS FECHAS DEL MES" },
    ],
    metrics: [
      {
        label: "Registros",
        value: String(rows.length),
        detail: "Selección actual",
      },
      {
        label: "Bonos aprobados",
        value: money.format(approvedBonuses),
        detail: "Importe del mes",
      },
      {
        label: "Multas aprobadas",
        value: money.format(approvedFines),
        detail: "Importe del mes",
      },
      { label: "Pendientes", value: String(pending), detail: "Por autorizar" },
    ],
    analysis: [
      mostApplied
        ? `${mostApplied.concept.name} es el bono más aplicado con ${mostApplied.count} registros.`
        : "No existen bonos aplicados en el periodo.",
      leastApplied
        ? `${leastApplied.concept.name} es el bono con menor frecuencia (${leastApplied.count} registros).`
        : "No existe una base suficiente para identificar el bono menos aplicado.",
      `El reporte exporta únicamente los ${rows.length} registros que cumplen los filtros seleccionados.`,
    ],
    filename: `bonos-multas-${selectedMonth}`,
    sheetName: "Bonos y multas",
    orientation: "landscape" as const,
    columns: [
      {
        header: "Fecha",
        accessor: (row: DemoMovement) => row.appliedAt,
        width: 13,
      },
      {
        header: "Tipo",
        accessor: (row: DemoMovement) =>
          row.type === "BONUS" ? "Bono" : "Multa",
        width: 10,
      },
      {
        header: "Concepto",
        accessor: (row: DemoMovement) => row.concept,
        width: 28,
      },
      {
        header: "Motivo",
        accessor: (row: DemoMovement) => row.comments,
        width: 36,
      },
      {
        header: "Empleado",
        accessor: (row: DemoMovement) =>
          state.employees.find((employee) => employee.id === row.employeeId)
            ?.name ?? "Sin empleado",
        width: 24,
      },
      {
        header: "Nómina",
        accessor: (row: DemoMovement) =>
          payrollModuleLabel(state, row.payrollModule),
        width: 18,
      },
      {
        header: "Monto",
        accessor: (row: DemoMovement) => row.amount,
        width: 15,
        format: "currency" as const,
      },
      {
        header: "Estatus",
        accessor: (row: DemoMovement) => statusLabels[row.status],
        width: 16,
      },
    ],
    rows,
  };

  function changeStatus(movement: DemoMovement, status: MovementStatus) {
    if (!isMaster) return toast.error("Solo el usuario master puede aprobar.");
    setMovementStatus(movement.id, status);
    if (status === "APPROVED")
      toast.success(
        "Registro aprobado: nómina, recibos, consolidado y reportes actualizados.",
      );
  }

  return (
    <TooltipProvider>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">OPERACIÓN</Badge>
              <span className="text-xs text-[color:var(--text-muted)]">
                Historial mensual auditable
              </span>
            </div>
            <h1 className="page-title">Registro de bonos y multas</h1>
            <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
              Aplica conceptos registrados, corrige incidencias y analiza cuáles
              bonos se logran con mayor o menor frecuencia.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReportExportButtons
              config={exportConfig}
              disabled={!rows.length}
            />
            <Button
              variant="outline"
              disabled={!isMaster}
              onClick={() => setDialog({ movement: null, type: "FINE" })}
            >
              <Gavel className="mr-2 h-4 w-4" /> Nueva multa
            </Button>
            <Button
              disabled={!isMaster}
              onClick={() => setDialog({ movement: null, type: "BONUS" })}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Nuevo bono
            </Button>
          </div>
        </header>

        <Card className="border-[color:var(--border-color)]">
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label>Periodo mensual</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month} value={month}>
                      {monthLabel(month).toLocaleUpperCase("es-MX")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">TODOS</SelectItem>
                  {state.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus-fine-date-filter">Fecha</Label>
              <Input
                id="bonus-fine-date-filter"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as MovementType | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">BONOS Y MULTAS</SelectItem>
                  <SelectItem value="BONUS">SOLO BONOS</SelectItem>
                  <SelectItem value="FINE">SOLO MULTAS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus-fine-search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--text-muted)]" />
                <Input
                  id="bonus-fine-search"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="CONCEPTO O NOMBRE"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <CalendarDays className="h-5 w-5 text-sky-600" />
              <p className="label-caps mt-4">REGISTROS DEL MES</p>
              <p className="number-display mt-2 text-2xl">
                {periodRows.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <p className="label-caps mt-4">BONOS APROBADOS</p>
              <p className="number-display mt-2 text-2xl">
                {money.format(approvedBonuses)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Gavel className="h-5 w-5 text-rose-600" />
              <p className="label-caps mt-4">MULTAS APROBADAS</p>
              <p className="number-display mt-2 text-2xl">
                {money.format(approvedFines)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <CheckCheck className="h-5 w-5 text-amber-600" />
              <p className="label-caps mt-4">PENDIENTES</p>
              <p className="number-display mt-2 text-2xl">{pending}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-[color:var(--border-color)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Aplicación de bonos
              </CardTitle>
              <CardDescription>
                Número de veces que se aplicó cada concepto durante el periodo
                seleccionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bonusAnalysis.map((item) => (
                <div key={item.concept.id}>
                  <div className="mb-1.5 flex items-end justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold">{item.concept.name}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {money.format(item.amount)} aprobado
                      </p>
                    </div>
                    <span className="number-display">{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]"
                      style={{
                        width: `${Math.max((item.count / maxBonusCount) * 100, item.count ? 5 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-[color:var(--border-color)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Análisis del periodo
              </CardTitle>
              <CardDescription>
                Comparativo del bono más aplicado y el menos logrado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:bg-emerald-950/25">
                <p className="label-caps text-emerald-800 dark:text-emerald-200">
                  MÁS APLICADO
                </p>
                <p className="mt-2 font-semibold">
                  {mostApplied?.concept.name ?? "SIN DATOS"}
                </p>
                <p className="number-display mt-1 text-xl">
                  {mostApplied?.count ?? 0} veces
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:bg-amber-950/25">
                <p className="label-caps text-amber-800 dark:text-amber-200">
                  MENOS LOGRADO
                </p>
                <p className="mt-2 font-semibold">
                  {leastApplied?.concept.name ?? "SIN DATOS"}
                </p>
                <p className="number-display mt-1 text-xl">
                  {leastApplied?.count ?? 0} veces
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader>
            <CardTitle>Historial independiente</CardTitle>
            <CardDescription>
              Los registros permanecen visibles durante todo el mes y pueden
              consultarse después seleccionando su periodo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FECHA</TableHead>
                    <TableHead>TIPO / CONCEPTO</TableHead>
                    <TableHead>EMPLEADO</TableHead>
                    <TableHead>NÓMINA</TableHead>
                    <TableHead className="text-right">MONTO</TableHead>
                    <TableHead>ESTATUS</TableHead>
                    <TableHead className="text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-28 text-center text-[color:var(--text-muted)]"
                      >
                        No hay registros para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((movement) => {
                      const employee = state.employees.find(
                        (item) => item.id === movement.employeeId,
                      );
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>{movement.appliedAt}</TableCell>
                          <TableCell>
                            <p className="font-semibold">{movement.concept}</p>
                            <p className="text-xs text-[color:var(--text-muted)]">
                              {movement.type === "BONUS" ? "BONO" : "MULTA"}
                            </p>
                            <p className="mt-1 max-w-sm text-[10px] leading-4 text-[color:var(--text-muted)]">
                              {movement.comments}
                            </p>
                          </TableCell>
                          <TableCell>
                            {employee?.name ?? "SIN EMPLEADO"}
                          </TableCell>
                          <TableCell>
                            {payrollModuleLabel(state, movement.payrollModule)}
                          </TableCell>
                          <TableCell
                            className={`number-display text-right ${movement.type === "BONUS" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                          >
                            {movement.type === "BONUS" ? "+" : "−"}
                            {money.format(movement.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {statusLabels[movement.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <ActionIcon
                                label={`Aprobar ${movement.concept}`}
                                disabled={
                                  !isMaster || movement.status === "APPROVED"
                                }
                                onClick={() =>
                                  changeStatus(movement, "APPROVED")
                                }
                              >
                                <CheckCheck className="h-4 w-4 text-emerald-600" />
                              </ActionIcon>
                              <ActionIcon
                                label={`Editar ${movement.concept}`}
                                disabled={!isMaster}
                                onClick={() =>
                                  setDialog({
                                    movement,
                                    type: movement.type,
                                  })
                                }
                              >
                                <Edit3 className="h-4 w-4" />
                              </ActionIcon>
                              <ActionIcon
                                label={`Eliminar ${movement.concept}`}
                                disabled={!isMaster}
                                onClick={() => {
                                  deleteMovement(movement.id);
                                  toast.success(
                                    "Registro eliminado del periodo.",
                                  );
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </ActionIcon>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {dialog && (
          <BonusFineMovementDialog
            key={dialog.movement?.id ?? `new-${dialog.type}`}
            movement={dialog.movement}
            defaultType={dialog.type}
            open
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
