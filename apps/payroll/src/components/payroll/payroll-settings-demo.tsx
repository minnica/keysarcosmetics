"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, BarChart3, CalendarRange, Gavel, Plus, RotateCcw, Settings2, ShieldPlus, SlidersHorizontal, UserPlus } from "lucide-react";
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
  payrollModuleLabels,
  periodFromFrequency,
  usePayrollDemo,
} from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function SchemeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addScheme } = usePayrollDemo();
  const [name, setName] = useState("");
  const [firstCut, setFirstCut] = useState("30000");
  const [secondCut, setSecondCut] = useState("50000");
  const [rates, setRates] = useState(["4", "6", "8"]);

  function submit() {
    const cut1 = Number(firstCut);
    const cut2 = Number(secondCut);
    const parsedRates = rates.map(Number);
    if (!name.trim() || cut1 <= 0 || cut2 <= cut1 || parsedRates.some((rate) => rate < 0 || rate > 100)) {
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
        <DialogHeader><DialogTitle>Nuevo esquema por escala</DialogTitle><DialogDescription>Configura cortes de venta y el porcentaje que se aplicará en cada nivel.</DialogDescription></DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2"><Label htmlFor="scheme-name">Nombre del esquema</Label><Input id="scheme-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. ESCALA VENDEDORES PREMIUM" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="cut-one">Segundo nivel desde</Label><Input id="cut-one" type="number" min="0" step="0.01" value={firstCut} onChange={(event) => setFirstCut(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="cut-two">Tercer nivel desde</Label><Input id="cut-two" type="number" min="0" step="0.01" value={secondCut} onChange={(event) => setSecondCut(event.target.value)} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["NIVEL INICIAL", "NIVEL MEDIO", "SIN LÍMITE"].map((label, index) => (
              <div key={label} className="space-y-2 rounded-xl border border-[color:var(--border-color)] p-4">
                <Label htmlFor={`rate-${index}`}>{label} · COMISIÓN %</Label>
                <Input id={`rate-${index}`} type="number" min="0" max="100" step="0.1" value={rates[index]} onChange={(event) => setRates((current) => current.map((rate, rateIndex) => rateIndex === index ? event.target.value : rate))} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar esquema</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, assignScheme } = usePayrollDemo();
  const sellers = state.employees.filter((employee) => employee.category === "SELLER");
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
        <DialogHeader><DialogTitle>Asignar esquema</DialogTitle><DialogDescription>La asignación se refleja de inmediato en la vista de vendedores.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sellers.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Esquema</Label><Select value={schemeId} onValueChange={setSchemeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.schemes.filter((scheme) => scheme.active).map((scheme) => <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Asignar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ type, open, onOpenChange }: { type: MovementType; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, currentPeriod, addMovement } = usePayrollDemo();
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<MovementMode>("FIXED");
  const [threshold, setThreshold] = useState("");

  function submit() {
    const parsedAmount = Number(amount);
    if (!employeeId || !concept.trim() || parsedAmount <= 0 || (mode === "SCALE" && Number(threshold) <= 0)) {
      toast.error("Completa los datos del movimiento.");
      return;
    }
    addMovement({
      employeeId,
      type,
      mode,
      concept: concept.toLocaleUpperCase("es-MX"),
      amount: parsedAmount,
      threshold: mode === "SCALE" ? Number(threshold) : null,
      periodStart: currentPeriod.start,
      status: "PENDING",
    });
    toast.success(`${type === "BONUS" ? "Bono" : "Multa"} creado y enviado a autorización.`);
    setConcept("");
    setAmount("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{type === "BONUS" ? "Crear bono" : "Crear multa"}</DialogTitle><DialogDescription>El movimiento queda pendiente hasta que un usuario autorizado lo apruebe.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor={`${type}-concept`}>Concepto</Label><Input id={`${type}-concept`} value={concept} onChange={(event) => setConcept(event.target.value)} placeholder={type === "BONUS" ? "BONO DE PRODUCTIVIDAD" : "DESCUENTO AUTORIZADO"} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Tipo de cálculo</Label><Select value={mode} onValueChange={(value) => setMode(value as MovementMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FIXED">MONTO FIJO</SelectItem><SelectItem value="SCALE">POR ESCALA DE VENTA</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor={`${type}-amount`}>Monto</Label><Input id={`${type}-amount`} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          </div>
          {mode === "SCALE" && <div className="space-y-2"><Label htmlFor={`${type}-threshold`}>Se activa al vender desde</Label><Input id={`${type}-threshold`} type="number" min="0" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar y solicitar autorización</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodConfigDialog({ module, open, onOpenChange }: { module: PayrollModule; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, updatePeriodConfig } = usePayrollDemo();
  const config = state.periodConfigs.find((item) => item.module === module);
  const [frequency, setFrequency] = useState<PayrollPeriodFrequency>(config?.frequency ?? "BIWEEKLY");
  const [referenceDate, setReferenceDate] = useState(config?.periodStart ?? new Date().toISOString().slice(0, 10));
  const [specialStart, setSpecialStart] = useState(config?.periodStart ?? "");
  const [specialEnd, setSpecialEnd] = useState(config?.periodEnd ?? "");
  const calculated = periodFromFrequency(frequency, referenceDate, specialStart, specialEnd);
  const [cutoffDate, setCutoffDate] = useState(config?.cutoffDate ?? calculated.end);
  const [active, setActive] = useState(config?.active ?? true);

  function submit() {
    if (calculated.end < calculated.start || cutoffDate < calculated.start || cutoffDate > calculated.end) {
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
    toast.success(`Periodo de ${payrollModuleLabels[module].toLocaleLowerCase("es-MX")} actualizado sin alterar otras nóminas.`);
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Periodo de {payrollModuleLabels[module].toLocaleLowerCase("es-MX")}</DialogTitle><DialogDescription>Esta es la única pantalla que puede modificar el periodo activo de este módulo. Las corridas anteriores conservan su corte.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Tipo de periodo</Label><Select value={frequency} onValueChange={(value) => { const next = value as PayrollPeriodFrequency; setFrequency(next); const period = periodFromFrequency(next, referenceDate, specialStart, specialEnd); setCutoffDate(period.end); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WEEKLY">SEMANAL · LUNES A DOMINGO</SelectItem><SelectItem value="BIWEEKLY">QUINCENAL · 1–15 / 16–FIN</SelectItem><SelectItem value="SPECIAL">NÓMINA ESPECIAL</SelectItem></SelectContent></Select></div>{frequency !== "SPECIAL" ? <div className="space-y-2"><Label htmlFor={`reference-${module}`}>Fecha dentro del periodo</Label><Input id={`reference-${module}`} type="date" value={referenceDate} onChange={(event) => { setReferenceDate(event.target.value); const period = periodFromFrequency(frequency, event.target.value); setCutoffDate(period.end); }} /></div> : <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`special-start-${module}`}>Inicio especial</Label><Input id={`special-start-${module}`} type="date" value={specialStart} onChange={(event) => setSpecialStart(event.target.value)} /></div><div className="space-y-2"><Label htmlFor={`special-end-${module}`}>Fin especial</Label><Input id={`special-end-${module}`} type="date" min={specialStart} value={specialEnd} onChange={(event) => { setSpecialEnd(event.target.value); setCutoffDate(event.target.value); }} /></div></div>}<div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 p-4"><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Periodo calculado</p><p className="mt-1 font-semibold">{calculated.label}</p><p className="mt-1 text-sm text-[color:var(--text-muted)]">{calculated.start} — {calculated.end}</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`cutoff-${module}`}>Fecha de corte</Label><Input id={`cutoff-${module}`} type="date" min={calculated.start} max={calculated.end} value={cutoffDate} onChange={(event) => setCutoffDate(event.target.value)} /></div><div className="space-y-2"><Label>Visibilidad</Label><Select value={active ? "ACTIVE" : "INACTIVE"} onValueChange={(value) => setActive(value === "ACTIVE")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">PERIODO ACTIVO</SelectItem><SelectItem value="INACTIVE">OCULTAR EN PORTAL</SelectItem></SelectContent></Select></div></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Aplicar solo a este módulo</Button></DialogFooter></DialogContent></Dialog>;
}

function CostConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, updateEmployeeCosts } = usePayrollDemo();
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const employee = state.employees.find((item) => item.id === employeeId);
  const [socialRate, setSocialRate] = useState(String((employee?.socialCostRate ?? 0) * 100));
  const [isrRate, setIsrRate] = useState(String((employee?.isrCostRate ?? 0) * 100));

  function selectEmployee(id: string) {
    setEmployeeId(id);
    const selected = state.employees.find((item) => item.id === id);
    setSocialRate(String((selected?.socialCostRate ?? 0) * 100));
    setIsrRate(String((selected?.isrCostRate ?? 0) * 100));
  }

  function submit() {
    const social = Number(socialRate);
    const isr = Number(isrRate);
    if (!employeeId || social < 0 || isr < 0 || social > 100 || isr > 100) {
      toast.error("Las tasas deben estar entre 0% y 100%.");
      return;
    }
    updateEmployeeCosts(employeeId, social / 100, isr / 100);
    toast.success("Costo social e ISR actualizados en todas las vistas de nómina.");
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Costo social e ISR</DialogTitle><DialogDescription>Estos porcentajes alimentan automáticamente Nómina + Costo social + ISR = Costo total.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={selectEmployee}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.employees.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.position}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="social-cost-rate">Costo social %</Label><Input id="social-cost-rate" type="number" min="0" max="100" step="0.1" value={socialRate} onChange={(event) => setSocialRate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="isr-cost-rate">ISR %</Label><Input id="isr-cost-rate" type="number" min="0" max="100" step="0.1" value={isrRate} onChange={(event) => setIsrRate(event.target.value)} /></div></div>{employee?.category === "CONTRACTOR" && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">Honorarios conserva además IVA 16%, retención ISR 10% y retención IVA 10.6667% para el desglose de factura mock.</div>}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar tasas</Button></DialogFooter></DialogContent></Dialog>;
}

export function PayrollSettingsDemo() {
  const { state, payrollLines, resetDemo } = usePayrollDemo();
  const [periodModule, setPeriodModule] = useState<PayrollModule | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const expenseSummary = useMemo(() => {
    const config = state.periodConfigs.find((item) => item.module === "CONSOLIDATED");
    if (!config) return { periodLabel: "SIN PERIODO", total: 0, positions: [] };
    const lines = payrollLines(config.periodStart, state.calculationMode, config.periodEnd, "CONSOLIDATED");
    const grouped = new Map<string, { position: string; employees: number; payroll: number; socialCost: number; isrCost: number; total: number }>();

    lines.forEach((line) => {
      const position = line.employee.position || "SIN PUESTO";
      const current = grouped.get(position) ?? { position, employees: 0, payroll: 0, socialCost: 0, isrCost: 0, total: 0 };
      current.employees += 1;
      current.payroll += line.total;
      current.socialCost += line.socialCost;
      current.isrCost += line.isrCost;
      current.total += line.totalCost;
      grouped.set(position, current);
    });

    const positions = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    return {
      periodLabel: `${config.periodStart} — ${config.periodEnd}`,
      total: positions.reduce((sum, item) => sum + item.total, 0),
      positions,
    };
  }, [payrollLines, state.calculationMode, state.periodConfigs]);

  return (
    <div className="space-y-7">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">DEMO FRONTEND</Badge><span className="text-xs text-[color:var(--text-muted)]">Configuración local</span></div><h1 className="page-title">Periodos y conceptos</h1><p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">Punto de control para periodos, fechas de corte, costo social e ISR por empleado.</p></div>
        <Button size="sm" className="self-start rounded-lg px-3 xl:self-auto" variant="outline" onClick={() => { resetDemo(); toast.success("Datos demo restaurados."); }}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Restaurar demo</Button>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-[color:var(--border-color)]"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><CalendarRange className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Periodos y cortes</h2><p className="mt-0.5 text-xs text-[color:var(--text-muted)]">Semanal, quincenal o especial por módulo.</p></div><Button size="sm" className="self-start rounded-lg px-3 sm:self-auto" variant="outline" onClick={() => setPeriodModule("CONSOLIDATED")}>Configurar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><ShieldPlus className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Costo social e ISR</h2><p className="mt-0.5 text-xs text-[color:var(--text-muted)]">Tasas por empleado para costo total.</p></div><Button size="sm" className="self-start rounded-lg px-3 sm:self-auto" variant="outline" onClick={() => setCostOpen(true)}>Configurar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></CardContent></Card>
      </div>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[color:var(--text-secondary)]" /><CardTitle className="section-heading uppercase">Resumen de gastos por puesto</CardTitle></div>
              <CardDescription className="mt-1">Participación de cada puesto sobre el costo total del periodo vigente.</CardDescription>
            </div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Gasto total · {expenseSummary.periodLabel}</p><p className="number-display mt-1 text-2xl">{money.format(expenseSummary.total)}</p></div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {expenseSummary.positions.map((item) => {
              const percentage = expenseSummary.total > 0 ? item.total / expenseSummary.total * 100 : 0;
              return <article key={item.position} className="rounded-xl border border-[color:var(--border-color)] p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold uppercase">{item.position}</h3><p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.employees} {item.employees === 1 ? "empleado" : "empleados"}</p></div><Badge variant="outline" className="shrink-0 border-[#c3a583] bg-[#c3a583]/10 text-[#80613f] dark:text-[#e8cfaa]">{percentage.toFixed(1)}%</Badge></div>
                <p className="number-display mt-4 text-xl">{money.format(item.total)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] via-[#a88662] to-[#648672]" style={{ width: `${percentage}%` }} /></div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-[color:var(--text-muted)]"><span>NÓMINA<br /><strong className="number-display text-[color:var(--text-primary)]">{money.format(item.payroll)}</strong></span><span>SOCIAL<br /><strong className="number-display text-[color:var(--text-primary)]">{money.format(item.socialCost)}</strong></span><span>ISR<br /><strong className="number-display text-[color:var(--text-primary)]">{money.format(item.isrCost)}</strong></span></div>
              </article>;
            })}
            {!expenseSummary.positions.length && <p className="py-6 text-sm text-[color:var(--text-muted)]">No hay gastos disponibles en el periodo vigente.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--border-color)]"><CardHeader className="pb-3"><CardTitle className="section-heading uppercase">Visualización y corte por módulo</CardTitle><CardDescription>Modificar una opción solo cambia el periodo de ese módulo; nunca reescribe los demás.</CardDescription></CardHeader><CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{state.periodConfigs.map((config) => <button key={config.module} type="button" onClick={() => setPeriodModule(config.module)} className="group rounded-xl border border-[color:var(--border-color)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-hover)]/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">{payrollModuleLabels[config.module]}</p><p className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-secondary)]">{config.frequency === "WEEKLY" ? "SEMANAL" : config.frequency === "BIWEEKLY" ? "QUINCENAL" : "ESPECIAL"}</p></div><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${config.active ? "bg-emerald-500" : "bg-stone-300"}`} title={config.active ? "Activo" : "Oculto"} /></div><p className="mt-2 text-[10px] text-[color:var(--text-muted)]">{config.periodStart} — {config.periodEnd}</p><div className="mt-2 flex items-center justify-between border-t border-[color:var(--border-color)] pt-2 text-[10px]"><span>Corte <strong>{config.cutoffDate}</strong></span><Settings2 className="h-3.5 w-3.5 text-[color:var(--text-secondary)] transition-transform group-hover:rotate-45" /></div></button>)}</CardContent></Card>

      {periodModule && <PeriodConfigDialog key={periodModule} module={periodModule} open onOpenChange={(open) => { if (!open) setPeriodModule(null); }} />}
      <CostConfigDialog open={costOpen} onOpenChange={setCostOpen} />
    </div>
  );
}
