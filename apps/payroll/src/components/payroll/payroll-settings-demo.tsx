"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarRange,
  Check,
  Gavel,
  HandCoins,
  Layers3,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  UserPlus,
  Users,
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
  toast,
} from "@cosmetics/ui";
import {
  type MovementMode,
  type MovementType,
  type PayrollModule,
  type PayrollPeriodFrequency,
  employeeCommissionPayrollModule,
  employeeSalaryPayrollModule,
  payrollModuleLabel,
  periodTaxInclusionForRange,
  periodFromFrequency,
  usePayrollDemo,
} from "./payroll-demo-context";

function SchemeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addScheme } = usePayrollDemo();
  const [name, setName] = useState("");
  const [firstCut, setFirstCut] = useState("30000");
  const [secondCut, setSecondCut] = useState("50000");
  const [rates, setRates] = useState(["4", "6", "8"]);

  function submit() {
    const cut1 = Number(firstCut);
    const cut2 = Number(secondCut);
    const parsedRates = rates.map(Number);
    if (
      !name.trim() ||
      cut1 <= 0 ||
      cut2 <= cut1 ||
      parsedRates.some((rate) => rate < 0 || rate > 100)
    ) {
      toast.error("Revisa el nombre, los cortes y porcentajes del esquema.");
      return;
    }
    const [rateOne = 0, rateTwo = 0, rateThree = 0] = parsedRates;
    addScheme(name.trim(), [
      { from: 0, to: cut1 - 0.01, rate: rateOne / 100 },
      { from: cut1, to: cut2 - 0.01, rate: rateTwo / 100 },
      { from: cut2, to: null, rate: rateThree / 100 },
    ]);
    toast.success("Esquema de comisión creado.");
    setName("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo esquema por escala</DialogTitle>
          <DialogDescription>
            Configura cortes de venta y el porcentaje que se aplicará en cada
            nivel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="scheme-name">Nombre del esquema</Label>
            <Input
              id="scheme-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="EJ. ESCALA VENDEDORES PREMIUM"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cut-one">Segundo nivel desde</Label>
              <Input
                id="cut-one"
                type="number"
                min="0"
                step="0.01"
                value={firstCut}
                onChange={(event) => setFirstCut(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cut-two">Tercer nivel desde</Label>
              <Input
                id="cut-two"
                type="number"
                min="0"
                step="0.01"
                value={secondCut}
                onChange={(event) => setSecondCut(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["NIVEL INICIAL", "NIVEL MEDIO", "SIN LÍMITE"].map(
              (label, index) => (
                <div
                  key={label}
                  className="space-y-2 rounded-xl border border-[color:var(--border-color)] p-4"
                >
                  <Label htmlFor={`rate-${index}`}>{label} · COMISIÓN %</Label>
                  <Input
                    id={`rate-${index}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={rates[index]}
                    onChange={(event) =>
                      setRates((current) =>
                        current.map((rate, rateIndex) =>
                          rateIndex === index ? event.target.value : rate,
                        ),
                      )
                    }
                  />
                </div>
              ),
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Guardar esquema</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, assignScheme } = usePayrollDemo();
  const sellers = state.employees.filter(
    (employee) => employee.category === "SELLER",
  );
  const [employeeId, setEmployeeId] = useState(sellers[0]?.id ?? "");
  const [schemeId, setSchemeId] = useState(state.schemes[0]?.id ?? "");
  function submit() {
    if (!employeeId || !schemeId) return;
    assignScheme(employeeId, schemeId);
    toast.success("Esquema asignado al empleado.");
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar esquema</DialogTitle>
          <DialogDescription>
            La asignación se refleja de inmediato en la vista de vendedores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Esquema</Label>
            <Select value={schemeId} onValueChange={setSchemeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.schemes
                  .filter((scheme) => scheme.active)
                  .map((scheme) => (
                    <SelectItem key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({
  type,
  open,
  onOpenChange,
}: {
  type: MovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, currentPeriod, addMovement } = usePayrollDemo();
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<MovementMode>("FIXED");
  const [threshold, setThreshold] = useState("");

  function submit() {
    const parsedAmount = Number(amount);
    const employee = state.employees.find((item) => item.id === employeeId);
    if (
      !employeeId ||
      !concept.trim() ||
      parsedAmount <= 0 ||
      (mode === "SCALE" && Number(threshold) <= 0)
    ) {
      toast.error("Completa los datos del movimiento.");
      return;
    }
    addMovement({
      employeeId,
      costBranchIds: employee?.costBranchIds.length
        ? employee.costBranchIds
        : employee?.branchId
          ? [employee.branchId]
          : [],
      type,
      mode,
      concept: concept.toLocaleUpperCase("es-MX"),
      amount: parsedAmount,
      threshold: mode === "SCALE" ? Number(threshold) : null,
      periodStart: currentPeriod.start,
      status: "PENDING",
    });
    toast.success(
      `${type === "BONUS" ? "Bono" : "Multa"} creado y enviado a autorización.`,
    );
    setConcept("");
    setAmount("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "BONUS" ? "Crear bono" : "Crear multa"}
          </DialogTitle>
          <DialogDescription>
            El movimiento queda pendiente hasta que un usuario autorizado lo
            apruebe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
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
            <Label htmlFor={`${type}-concept`}>Concepto</Label>
            <Input
              id={`${type}-concept`}
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              placeholder={
                type === "BONUS"
                  ? "BONO DE PRODUCTIVIDAD"
                  : "DESCUENTO AUTORIZADO"
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de cálculo</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as MovementMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">MONTO FIJO</SelectItem>
                  <SelectItem value="SCALE">POR ESCALA DE VENTA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${type}-amount`}>Monto</Label>
              <Input
                id={`${type}-amount`}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          {mode === "SCALE" && (
            <div className="space-y-2">
              <Label htmlFor={`${type}-threshold`}>
                Se activa al vender desde
              </Label>
              <Input
                id={`${type}-threshold`}
                type="number"
                min="0"
                step="0.01"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Guardar y solicitar autorización</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodConfigDialog({
  module,
  open,
  onOpenChange,
}: {
  module: PayrollModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, updatePeriodConfig } = usePayrollDemo();
  const moduleName = payrollModuleLabel(state, module).toLocaleLowerCase(
    "es-MX",
  );
  const config = state.periodConfigs.find((item) => item.module === module);
  const [frequency, setFrequency] = useState<PayrollPeriodFrequency>(
    config?.frequency ?? "BIWEEKLY",
  );
  const [referenceDate, setReferenceDate] = useState(
    config?.periodStart ?? new Date().toISOString().slice(0, 10),
  );
  const [specialStart, setSpecialStart] = useState(config?.periodStart ?? "");
  const [specialEnd, setSpecialEnd] = useState(config?.periodEnd ?? "");
  const calculated = periodFromFrequency(
    frequency,
    referenceDate,
    specialStart,
    specialEnd,
  );
  const [cutoffDate, setCutoffDate] = useState(
    config?.cutoffDate ?? calculated.end,
  );
  const [active, setActive] = useState(config?.active ?? true);

  function submit() {
    if (
      calculated.end < calculated.start ||
      cutoffDate < calculated.start ||
      cutoffDate > calculated.end
    ) {
      toast.error("El corte debe quedar dentro del periodo seleccionado.");
      return;
    }
    updatePeriodConfig(module, {
      frequency,
      periodStart: calculated.start,
      periodEnd: calculated.end,
      cutoffDate,
      active,
      label: calculated.label,
    });
    toast.success(
      `Periodo de ${moduleName} actualizado sin alterar otras nóminas.`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Periodo de {moduleName}</DialogTitle>
          <DialogDescription>
            Esta es la única pantalla que puede modificar el periodo activo de
            este módulo. Las corridas anteriores conservan su corte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo de periodo</Label>
            <Select
              value={frequency}
              onValueChange={(value) => {
                const next = value as PayrollPeriodFrequency;
                setFrequency(next);
                const period = periodFromFrequency(
                  next,
                  referenceDate,
                  specialStart,
                  specialEnd,
                );
                setCutoffDate(period.end);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">
                  SEMANAL · LUNES A DOMINGO
                </SelectItem>
                <SelectItem value="BIWEEKLY">
                  QUINCENAL · 1–15 / 16–FIN
                </SelectItem>
                <SelectItem value="SPECIAL">NÓMINA ESPECIAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency !== "SPECIAL" ? (
            <div className="space-y-2">
              <Label htmlFor={`reference-${module}`}>
                Fecha dentro del periodo
              </Label>
              <Input
                id={`reference-${module}`}
                type="date"
                value={referenceDate}
                onChange={(event) => {
                  setReferenceDate(event.target.value);
                  const period = periodFromFrequency(
                    frequency,
                    event.target.value,
                  );
                  setCutoffDate(period.end);
                }}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`special-start-${module}`}>
                  Inicio especial
                </Label>
                <Input
                  id={`special-start-${module}`}
                  type="date"
                  value={specialStart}
                  onChange={(event) => setSpecialStart(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`special-end-${module}`}>Fin especial</Label>
                <Input
                  id={`special-end-${module}`}
                  type="date"
                  min={specialStart}
                  value={specialEnd}
                  onChange={(event) => {
                    setSpecialEnd(event.target.value);
                    setCutoffDate(event.target.value);
                  }}
                />
              </div>
            </div>
          )}
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 p-4">
            <p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
              Periodo calculado
            </p>
            <p className="mt-1 font-semibold">{calculated.label}</p>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {calculated.start} — {calculated.end}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`cutoff-${module}`}>Fecha de corte</Label>
              <Input
                id={`cutoff-${module}`}
                type="date"
                min={calculated.start}
                max={calculated.end}
                value={cutoffDate}
                onChange={(event) => setCutoffDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Visibilidad</Label>
              <Select
                value={active ? "ACTIVE" : "INACTIVE"}
                onValueChange={(value) => setActive(value === "ACTIVE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">PERIODO ACTIVO</SelectItem>
                  <SelectItem value="INACTIVE">OCULTAR EN PORTAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Aplicar solo a este módulo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TaxCalculationMode = "PERCENTAGE" | "FIXED";
type TaxRowState = {
  socialEnabled: boolean;
  socialMode: TaxCalculationMode;
  socialValue: string;
  isrEnabled: boolean;
  isrMode: TaxCalculationMode;
  isrValue: string;
};
type TaxPayrollModule = Exclude<PayrollModule, "CONSOLIDATED">;

const emptyTaxRow: TaxRowState = {
  socialEnabled: false,
  socialMode: "PERCENTAGE",
  socialValue: "0",
  isrEnabled: false,
  isrMode: "PERCENTAGE",
  isrValue: "0",
};

function CostConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    state,
    currentPeriod,
    updateEmployeeCosts,
    setPayrollTaxAssignments,
    setPeriodTaxInclusion,
  } = usePayrollDemo();
  const [module, setModule] = useState<TaxPayrollModule>("FIXED");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Record<string, TaxRowState>>({});
  const [copyToAll, setCopyToAll] = useState(false);
  const [bulkRow, setBulkRow] = useState<TaxRowState>({
    socialEnabled: true,
    socialMode: "PERCENTAGE",
    socialValue: "20",
    isrEnabled: true,
    isrMode: "PERCENTAGE",
    isrValue: "10",
  });
  const modules = state.payrollModules.filter(
    (item): item is typeof item & { id: TaxPayrollModule } =>
      item.active && item.id !== "CONSOLIDATED",
  );
  const periodTaxInclusion = periodTaxInclusionForRange(
    state.periodTaxInclusions,
    currentPeriod.start,
    currentPeriod.end,
  );
  const includeSocialCost = periodTaxInclusion?.includeSocialCost ?? true;
  const includeIsr = periodTaxInclusion?.includeIsr ?? true;
  const periodLocked = state.runs.some(
    (run) =>
      run.periodStart === currentPeriod.start &&
      run.periodEnd === currentPeriod.end &&
      run.status !== "DRAFT",
  );
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const isMaster = activeEmployee?.roleId === "role-admin";
  const lastUpdatedBy = state.employees.find(
    (employee) => employee.id === periodTaxInclusion?.updatedByEmployeeId,
  );

  useEffect(() => {
    if (!open) return;
    setRows(
      Object.fromEntries(
        state.employees.map((employee) => {
          const assignment = state.taxAssignments.find(
            (item) =>
              item.payrollModule === module && item.employeeId === employee.id,
          );
          return [
            employee.id,
            {
              socialEnabled:
                assignment?.socialCostEnabled ?? employee.socialCostRate > 0,
              socialMode: assignment?.socialCostMode ?? "PERCENTAGE",
              socialValue: String(
                assignment?.socialCostMode === "FIXED"
                  ? assignment.socialCostValue
                  : (assignment?.socialCostValue ?? employee.socialCostRate) *
                      100,
              ),
              isrEnabled:
                assignment?.isrCostEnabled ?? employee.isrCostRate > 0,
              isrMode: assignment?.isrCostMode ?? "PERCENTAGE",
              isrValue: String(
                assignment?.isrCostMode === "FIXED"
                  ? assignment.isrCostValue
                  : (assignment?.isrCostValue ?? employee.isrCostRate) * 100,
              ),
            },
          ];
        }),
      ),
    );
    setCopyToAll(false);
  }, [module, open, state.employees, state.taxAssignments]);

  const employees = state.employees.filter(
    (employee) =>
      employee.active &&
      (employeeSalaryPayrollModule(employee) === module ||
        employeeCommissionPayrollModule(employee) === module),
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleEmployees = employees.filter(
    (employee) =>
      !normalizedSearch ||
      `${employee.name} ${employee.position}`
        .toLocaleLowerCase("es-MX")
        .includes(normalizedSearch),
  );
  const allSocial =
    employees.length > 0 &&
    employees.every((employee) => rows[employee.id]?.socialEnabled);
  const allIsr =
    employees.length > 0 &&
    employees.every((employee) => rows[employee.id]?.isrEnabled);
  const selectedSocial = employees.filter(
    (employee) => rows[employee.id]?.socialEnabled,
  ).length;
  const selectedIsr = employees.filter(
    (employee) => rows[employee.id]?.isrEnabled,
  ).length;
  const isMixed =
    (selectedSocial > 0 && selectedSocial < employees.length) ||
    (selectedIsr > 0 && selectedIsr < employees.length);

  function patchRow(employeeId: string, patch: Partial<TaxRowState>) {
    setRows((current) => ({
      ...current,
      [employeeId]: { ...(current[employeeId] ?? emptyTaxRow), ...patch },
    }));
  }

  function copyConfigurationToAll(configuration: TaxRowState) {
    setRows((current) => {
      const next = { ...current };
      employees.forEach((employee) => {
        next[employee.id] = { ...configuration };
      });
      return next;
    });
  }

  function toggleCopyToAll(checked: boolean) {
    setCopyToAll(checked);
    if (checked) copyConfigurationToAll(bulkRow);
  }

  function patchBulkRow(patch: Partial<TaxRowState>) {
    const next = { ...bulkRow, ...patch };
    setBulkRow(next);
    if (copyToAll) copyConfigurationToAll(next);
  }

  function submit() {
    const invalid = employees.some((employee) => {
      const row = rows[employee.id];
      const social = Number(row?.socialValue ?? 0);
      const isr = Number(row?.isrValue ?? 0);
      const socialInvalid =
        !Number.isFinite(social) ||
        social < 0 ||
        (row?.socialMode === "PERCENTAGE" && social > 100);
      const isrInvalid =
        !Number.isFinite(isr) ||
        isr < 0 ||
        (row?.isrMode === "PERCENTAGE" && isr > 100);
      return socialInvalid || isrInvalid;
    });
    if (invalid)
      return toast.error(
        "Los porcentajes deben estar entre 0% y 100%; los montos fijos no pueden ser negativos.",
      );
    employees.forEach((employee) => {
      const row = rows[employee.id] ?? emptyTaxRow;
      updateEmployeeCosts(
        employee.id,
        row.socialMode === "PERCENTAGE"
          ? Number(row.socialValue) / 100
          : employee.socialCostRate,
        row.isrMode === "PERCENTAGE"
          ? Number(row.isrValue) / 100
          : employee.isrCostRate,
      );
    });
    setPayrollTaxAssignments(
      module,
      employees.map((employee) => {
        const row = rows[employee.id] ?? emptyTaxRow;
        return {
          employeeId: employee.id,
          socialCostEnabled: row.socialEnabled,
          socialCostMode: row.socialMode,
          socialCostValue:
            row.socialMode === "PERCENTAGE"
              ? Number(row.socialValue) / 100
              : Number(row.socialValue),
          isrCostEnabled: row.isrEnabled,
          isrCostMode: row.isrMode,
          isrCostValue:
            row.isrMode === "PERCENTAGE"
              ? Number(row.isrValue) / 100
              : Number(row.isrValue),
        };
      }),
    );
    toast.success(
      `Configuración fiscal de ${payrollModuleLabel(state, module).toLocaleLowerCase("es-MX")} aplicada en nóminas, recibos y reportes.`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicación de costo social e ISR</DialogTitle>
          <DialogDescription>
            Elige porcentaje o monto fijo y configura una regla general o una
            nómina mixta por empleado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              <Label>Tipo de nómina</Label>
              <Select
                value={module}
                onValueChange={(value) => {
                  setModule(value as TaxPayrollModule);
                  setSearch("");
                  setCopyToAll(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_230px] sm:items-end">
              <div className="flex h-[52px] items-center justify-between rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 px-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                    Configuración seleccionada
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {copyToAll
                      ? "REGLA GENERAL"
                      : isMixed
                        ? "NÓMINA MIXTA"
                        : allSocial && allIsr
                          ? "IMPUESTOS PARA TODO EL PERSONAL"
                          : "SELECCIÓN PERSONALIZADA"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isMixed
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                  }
                >
                  {employees.length} EMPLEADOS
                </Badge>
              </div>
              <TaxMasterSwitch
                label="Copiar a todos"
                detail={
                  copyToAll
                    ? "Sincronización general activa"
                    : "Conservar valores individuales"
                }
                checked={copyToAll}
                onChange={toggleCopyToAll}
              />
            </div>
          </div>

          <section className="rounded-xl border border-[#b99568]/55 bg-[#c3a583]/10 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                  Aplicación global del periodo
                </p>
                <p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
                  {currentPeriod.start} — {currentPeriod.end} · controla
                  nóminas, consolidado, recibos y reportes.
                </p>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto">
                CONTROL MÁSTER · SOLO ESTE PERIODO
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TaxMasterSwitch
                label="Costo social del periodo"
                detail={
                  includeSocialCost
                    ? "Activo en todos los módulos"
                    : "Excluido de toda la nómina"
                }
                checked={includeSocialCost}
                disabled={periodLocked || !isMaster}
                onChange={(checked) => {
                  setPeriodTaxInclusion(
                    currentPeriod.start,
                    currentPeriod.end,
                    { includeSocialCost: checked },
                  );
                  toast.success(
                    "Costo social " +
                      (checked ? "activado" : "apagado") +
                      " únicamente para el periodo seleccionado.",
                  );
                }}
              />
              <TaxMasterSwitch
                label="ISR del periodo"
                detail={
                  includeIsr
                    ? "Activo en todos los módulos"
                    : "Excluido de toda la nómina"
                }
                checked={includeIsr}
                disabled={periodLocked || !isMaster}
                onChange={(checked) => {
                  setPeriodTaxInclusion(
                    currentPeriod.start,
                    currentPeriod.end,
                    { includeIsr: checked },
                  );
                  toast.success(
                    "ISR " +
                      (checked ? "activado" : "apagado") +
                      " únicamente para el periodo seleccionado.",
                  );
                }}
              />
            </div>
            {lastUpdatedBy && (
              <p className="mt-2 text-[10px] text-[color:var(--text-muted)]">
                Última autorización del periodo: {lastUpdatedBy.name}.
              </p>
            )}
            {periodLocked && (
              <p className="mt-2 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                El periodo está cerrado. Reábrelo con código master para
                modificar estas cargas.
              </p>
            )}
          </section>

          <div
            className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-2 ${copyToAll ? "border-[#b99568] bg-[#c3a583]/10" : "border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15"}`}
          >
            <TaxGroupEditor
              label="Costo social"
              detail={`${selectedSocial} de ${employees.length} empleados seleccionados`}
              enabled={bulkRow.socialEnabled}
              mode={bulkRow.socialMode}
              value={bulkRow.socialValue}
              onEnabledChange={(checked) =>
                patchBulkRow({ socialEnabled: checked })
              }
              onModeChange={(mode) => patchBulkRow({ socialMode: mode })}
              onValueChange={(value) => patchBulkRow({ socialValue: value })}
            />
            <TaxGroupEditor
              label="ISR"
              detail={`${selectedIsr} de ${employees.length} empleados seleccionados`}
              enabled={bulkRow.isrEnabled}
              mode={bulkRow.isrMode}
              value={bulkRow.isrValue}
              onEnabledChange={(checked) =>
                patchBulkRow({ isrEnabled: checked })
              }
              onModeChange={(mode) => patchBulkRow({ isrMode: mode })}
              onValueChange={(value) => patchBulkRow({ isrValue: value })}
            />
            {!copyToAll && (
              <p className="text-[10px] text-[color:var(--text-muted)] sm:col-span-2">
                Activa “Copiar a todos” para aplicar y mantener sincronizados
                estos valores en toda la nómina.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[color:var(--border-color)]">
            <div className="flex flex-col gap-3 border-b border-[color:var(--border-color)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                  Selección individual
                </p>
                <p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
                  Desactiva “Copiar a todos” para combinar personal con
                  porcentaje, monto fijo o sin impuesto.
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <Input
                  className="h-9 pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="BUSCAR EMPLEADO O PUESTO"
                />
              </div>
            </div>
            <div className="hidden grid-cols-[minmax(220px,1fr)_minmax(250px,1fr)_minmax(250px,1fr)] gap-3 bg-[color:var(--accent-hover)]/25 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)] md:grid">
              <span>Empleado</span>
              <span>Costo social</span>
              <span>ISR</span>
            </div>
            <div className="divide-y divide-[color:var(--border-color)]">
              {visibleEmployees.map((employee) => {
                const row = rows[employee.id] ?? emptyTaxRow;
                const branch = state.branches.find(
                  (item) => item.id === employee.branchId,
                );
                return (
                  <div
                    key={employee.id}
                    className="grid gap-3 p-3 md:grid-cols-[minmax(220px,1fr)_minmax(250px,1fr)_minmax(250px,1fr)] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c3a583]/40 bg-[#342b23] text-[10px] font-bold text-[#f0d9b8]">
                        {employee.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {employee.name}
                        </p>
                        <p className="truncate text-[9px] text-[color:var(--text-muted)]">
                          {employee.position} · {branch?.name}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_82px] gap-2">
                      <TaxValueEditor
                        label="Costo social"
                        mode={row.socialMode}
                        value={row.socialValue}
                        disabled={copyToAll}
                        onModeChange={(mode) =>
                          patchRow(employee.id, { socialMode: mode })
                        }
                        onValueChange={(value) =>
                          patchRow(employee.id, { socialValue: value })
                        }
                      />
                      <TaxCheckbox
                        label="Costo social"
                        checked={row.socialEnabled}
                        disabled={copyToAll}
                        onChange={(checked) =>
                          patchRow(employee.id, { socialEnabled: checked })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_82px] gap-2">
                      <TaxValueEditor
                        label="ISR"
                        mode={row.isrMode}
                        value={row.isrValue}
                        disabled={copyToAll}
                        onModeChange={(mode) =>
                          patchRow(employee.id, { isrMode: mode })
                        }
                        onValueChange={(value) =>
                          patchRow(employee.id, { isrValue: value })
                        }
                      />
                      <TaxCheckbox
                        label="ISR"
                        checked={row.isrEnabled}
                        disabled={copyToAll}
                        onChange={(checked) =>
                          patchRow(employee.id, { isrEnabled: checked })
                        }
                      />
                    </div>
                  </div>
                );
              })}
              {!visibleEmployees.length && (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <Users className="h-7 w-7 text-[color:var(--text-muted)]" />
                  <p className="mt-2 text-sm font-semibold">
                    Sin empleados para mostrar
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    Cambia la nómina o la búsqueda.
                  </p>
                </div>
              )}
            </div>
          </div>
          {module === "CONTRACTOR" && (
            <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Las retenciones propias de honorarios (IVA e ISR retenido)
                siguen independientes. Esta configuración controla
                exclusivamente la carga patronal mostrada en la nómina.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={submit}>
            Guardar configuración fiscal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaxGroupEditor({
  label,
  detail,
  enabled,
  mode,
  value,
  onEnabledChange,
  onModeChange,
  onValueChange,
}: {
  label: string;
  detail: string;
  enabled: boolean;
  mode: TaxCalculationMode;
  value: string;
  onEnabledChange: (checked: boolean) => void;
  onModeChange: (mode: TaxCalculationMode) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">{label}</p>
          <p className="text-[9px] text-[color:var(--text-muted)]">{detail}</p>
        </div>
        <TaxCheckbox
          label={label}
          checked={enabled}
          onChange={onEnabledChange}
        />
      </div>
      <TaxValueEditor
        label={label}
        mode={mode}
        value={value}
        onModeChange={onModeChange}
        onValueChange={onValueChange}
      />
    </div>
  );
}

function TaxValueEditor({
  label,
  mode,
  value,
  disabled = false,
  onModeChange,
  onValueChange,
}: {
  label: string;
  mode: TaxCalculationMode;
  value: string;
  disabled?: boolean;
  onModeChange: (mode: TaxCalculationMode) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(112px,1fr)_minmax(82px,.7fr)] gap-2">
      <Select
        value={mode}
        disabled={disabled}
        onValueChange={(next) => onModeChange(next as TaxCalculationMode)}
      >
        <SelectTrigger
          className="h-8 px-2 text-[9px]"
          aria-label={`Tipo de cálculo de ${label}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PERCENTAGE">PORCENTAJE %</SelectItem>
          <SelectItem value="FIXED">MONTO FIJO $</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative">
        <Input
          className="h-8 pr-7 text-xs"
          aria-label={`Valor de ${label}`}
          type="number"
          min="0"
          max={mode === "PERCENTAGE" ? "100" : undefined}
          step="0.01"
          disabled={disabled}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[color:var(--text-muted)]">
          {mode === "PERCENTAGE" ? "%" : "$"}
        </span>
      </div>
    </div>
  );
}

function TaxMasterSwitch({
  label,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${checked ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}
    >
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full ${checked ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
        />
      </span>
      <span>
        <strong className="block text-xs">{label}</strong>
        <span className="mt-0.5 block text-[9px] text-[color:var(--text-muted)]">
          {detail}
        </span>
      </span>
    </button>
  );
}

function TaxCheckbox({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${label}: ${checked ? "aplicado" : "no aplicado"}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-[9px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${checked ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200" : "border-[color:var(--border-color)] text-[color:var(--text-muted)]"}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-400"}`}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className="md:hidden">{label}</span>
    </button>
  );
}

function FinancialRequestPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, updateFinancialRequestPolicy } = usePayrollDemo();
  const policy = state.financialRequestPolicy;
  const [advanceRate, setAdvanceRate] = useState(
    String(policy.advanceCommissionLimitRate * 100),
  );
  const [monthlyAdvances, setMonthlyAdvances] = useState(
    String(policy.maxMonthlyAdvances),
  );
  const [loanInstallments, setLoanInstallments] = useState(
    String(policy.maxLoanInstallments),
  );
  const [quarterlyLoans, setQuarterlyLoans] = useState(
    String(policy.maxQuarterlyLoans),
  );

  function submit() {
    const rate = Number(advanceRate);
    const advances = Number(monthlyAdvances);
    const installments = Number(loanInstallments);
    const loans = Number(quarterlyLoans);
    if (
      !Number.isFinite(rate) ||
      rate <= 0 ||
      rate > 100 ||
      !Number.isInteger(advances) ||
      advances < 1 ||
      advances > 12 ||
      !Number.isInteger(installments) ||
      installments < 1 ||
      installments > 24 ||
      !Number.isInteger(loans) ||
      loans < 1 ||
      loans > 12
    ) {
      toast.error(
        "Revisa los límites: el porcentaje debe estar entre 1 y 100 y las cantidades deben ser números enteros válidos.",
      );
      return;
    }
    updateFinancialRequestPolicy({
      advanceCommissionLimitRate: rate / 100,
      maxMonthlyAdvances: advances,
      maxLoanInstallments: installments,
      maxQuarterlyLoans: loans,
    });
    toast.success("Política de préstamos y adelantos actualizada.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Política de préstamos y adelantos</DialogTitle>
          <DialogDescription>
            Estos límites se validan en el portal personal, al crear la
            solicitud y nuevamente antes de autorizarla.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-[#c3a583]/45 bg-[#c3a583]/10 p-4">
            <div className="flex gap-3">
              <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6744]" />
              <div>
                <p className="text-sm font-semibold">
                  Control central de solicitudes
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Los adelantos toman como base la comisión acumulada del
                  empleado. Los préstamos se controlan por trimestre calendario.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="advance-commission-limit">
                Máximo del adelanto sobre comisión
              </Label>
              <div className="relative">
                <Input
                  id="advance-commission-limit"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={advanceRate}
                  onChange={(event) => setAdvanceRate(event.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[color:var(--text-muted)]">
                  %
                </span>
              </div>
              <p className="text-[10px] text-[color:var(--text-muted)]">
                Ejemplo: 50% permite adelantar hasta la mitad de lo comisionado.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-advance-limit">
                Adelantos permitidos por mes
              </Label>
              <Input
                id="monthly-advance-limit"
                type="number"
                min="1"
                max="12"
                step="1"
                value={monthlyAdvances}
                onChange={(event) => setMonthlyAdvances(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-installment-limit">
                Máximo de cuotas por préstamo
              </Label>
              <Input
                id="loan-installment-limit"
                type="number"
                min="1"
                max="24"
                step="1"
                value={loanInstallments}
                onChange={(event) => setLoanInstallments(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quarterly-loan-limit">
                Préstamos permitidos por trimestre
              </Label>
              <Input
                id="quarterly-loan-limit"
                type="number"
                min="1"
                max="12"
                step="1"
                value={quarterlyLoans}
                onChange={(event) => setQuarterlyLoans(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/30 p-3 text-xs sm:grid-cols-2">
            <p>
              <strong>Adelantos:</strong> {monthlyAdvances || "0"} al mes ·
              hasta {advanceRate || "0"}%
            </p>
            <p>
              <strong>Préstamos:</strong> {quarterlyLoans || "0"} por trimestre
              · {loanInstallments || "0"} cuotas
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={submit}>
            Guardar política
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollSettingsDemo() {
  const { state, resetDemo } = usePayrollDemo();
  const [periodModule, setPeriodModule] = useState<PayrollModule | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const [financialPolicyOpen, setFinancialPolicyOpen] = useState(false);

  return (
    <div className="space-y-7">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">DEMO FRONTEND</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Configuración local
            </span>
          </div>
          <h1 className="page-title">Periodos y conceptos</h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">
            Punto de control para periodos, fechas de corte, impuestos y
            políticas de préstamos.
          </p>
        </div>
        <Button
          size="sm"
          className="self-start rounded-lg px-3 xl:self-auto"
          variant="outline"
          onClick={() => {
            resetDemo();
            toast.success("Datos demo restaurados.");
          }}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restaurar demo
        </Button>
      </header>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]">
              <CalendarRange className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Periodos y cortes</h2>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                Semanal, quincenal o especial por módulo.
              </p>
            </div>
            <Button
              size="sm"
              className="self-start rounded-lg px-3 sm:self-auto"
              variant="outline"
              onClick={() => setPeriodModule("CONSOLIDATED")}
            >
              Configurar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]">
              <Layers3 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Módulos de nómina</h2>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                Crea módulos y define puestos, sueldo, comisión y movimientos.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="self-start rounded-lg px-3 sm:self-auto"
              variant="outline"
            >
              <Link href="/modulos-nomina">
                Configurar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]">
              <ShieldPlus className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Costo social e ISR</h2>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                Aplicación general o mixta por nómina y empleado.
              </p>
            </div>
            <Button
              size="sm"
              className="self-start rounded-lg px-3 sm:self-auto"
              variant="outline"
              onClick={() => setCostOpen(true)}
            >
              Configurar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]">
              <HandCoins className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Préstamos y adelantos</h2>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                {state.financialRequestPolicy.maxMonthlyAdvances} adelantos/mes
                · {state.financialRequestPolicy.maxQuarterlyLoans}{" "}
                préstamos/trimestre.
              </p>
            </div>
            <Button
              size="sm"
              className="self-start rounded-lg px-3 sm:self-auto"
              variant="outline"
              onClick={() => setFinancialPolicyOpen(true)}
            >
              Configurar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[color:var(--border-color)]">
        <CardHeader className="pb-3">
          <CardTitle className="section-heading uppercase">
            Visualización y corte por módulo
          </CardTitle>
          <CardDescription>
            Modificar una opción solo cambia el periodo de ese módulo; nunca
            reescribe los demás.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {state.periodConfigs.map((config) => (
            <button
              key={config.module}
              type="button"
              onClick={() => setPeriodModule(config.module)}
              className="group rounded-xl border border-[color:var(--border-color)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-hover)]/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {payrollModuleLabel(state, config.module)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-secondary)]">
                    {config.frequency === "WEEKLY"
                      ? "SEMANAL"
                      : config.frequency === "BIWEEKLY"
                        ? "QUINCENAL"
                        : "ESPECIAL"}
                  </p>
                </div>
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${config.active ? "bg-emerald-500" : "bg-stone-300"}`}
                  title={config.active ? "Activo" : "Oculto"}
                />
              </div>
              <p className="mt-2 text-[10px] text-[color:var(--text-muted)]">
                {config.periodStart} — {config.periodEnd}
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-[color:var(--border-color)] pt-2 text-[10px]">
                <span>
                  Corte <strong>{config.cutoffDate}</strong>
                </span>
                <Settings2 className="h-3.5 w-3.5 text-[color:var(--text-secondary)] transition-transform group-hover:rotate-45" />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {periodModule && (
        <PeriodConfigDialog
          key={periodModule}
          module={periodModule}
          open
          onOpenChange={(open) => {
            if (!open) setPeriodModule(null);
          }}
        />
      )}
      <CostConfigDialog open={costOpen} onOpenChange={setCostOpen} />
      <FinancialRequestPolicyDialog
        open={financialPolicyOpen}
        onOpenChange={setFinancialPolicyOpen}
      />
    </div>
  );
}
