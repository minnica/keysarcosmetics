"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  LockKeyhole,
  Plus,
  Settings2,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@cosmetics/ui";
import Link from "next/link";
import {
  type EmployeeCategory,
  type EmployeePayrollLine,
  type PayrollStatus,
  usePayrollDemo,
} from "./payroll-demo-context";

type PayrollView = "CONSOLIDATED" | "FIXED" | "SPECIALIST" | "COMMISSION";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateLabel = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function categoryLabel(category: EmployeeCategory) {
  return {
    SELLER: "VENDEDORES",
    SPECIALIST: "ESPECIALISTAS",
    MANAGEMENT: "GERENCIA",
    CALL_CENTER: "CALL CENTER",
  }[category];
}

function StatusBadge({ status }: { status: PayrollStatus }) {
  const config = {
    DRAFT: { label: "BORRADOR", className: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" },
    APPROVED: { label: "AUTORIZADA", className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" },
    PAID: { label: "PAGADA", className: "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200" },
  }[status];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return (
    <Card className="overflow-hidden border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps">{label}</p>
            <p className="number-display mt-2 text-2xl text-[color:var(--text-primary)]">{value}</p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">{detail}</p>
          </div>
          <span className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)] p-2.5 text-[color:var(--text-secondary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RunDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { currentPeriod, periodOptions, createRun } = usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const [mode, setMode] = useState<"WITH_VAT" | "WITHOUT_VAT">("WITH_VAT");
  const selected = periodOptions.find((period) => period.start === periodStart) ?? currentPeriod;
  const defaultPayDate = new Date(`${selected.end}T12:00:00`);
  defaultPayDate.setDate(defaultPayDate.getDate() + 3);
  const [payDate, setPayDate] = useState(defaultPayDate.toISOString().slice(0, 10));

  function submit() {
    createRun(periodStart, mode, payDate);
    toast.success("Nómina preparada con datos mock.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear nueva nómina</DialogTitle>
          <DialogDescription>El cálculo es quincenal y no modifica ningún dato real.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="run-period">Periodo a calcular</Label>
            <Select value={periodStart} onValueChange={(value) => {
              setPeriodStart(value);
              const period = periodOptions.find((item) => item.start === value);
              if (period) {
                const date = new Date(`${period.end}T12:00:00`);
                date.setDate(date.getDate() + 3);
                setPayDate(date.toISOString().slice(0, 10));
              }
            }}>
              <SelectTrigger id="run-period"><SelectValue /></SelectTrigger>
              <SelectContent>{periodOptions.map((period) => <SelectItem key={period.start} value={period.start}>{period.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="run-mode">Base de comisión</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "WITH_VAT" | "WITHOUT_VAT")}>
                <SelectTrigger id="run-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WITH_VAT">CON IVA</SelectItem>
                  <SelectItem value="WITHOUT_VAT">SIN IVA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Fecha de pago</Label>
              <Input id="pay-date" type="date" value={payDate} min={selected.end} onChange={(event) => setPayDate(event.target.value)} />
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 p-4 text-sm text-[color:var(--text-muted)]">
            <div className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-secondary)]" /><p>Modo demostración: se crea un borrador local y todos los módulos se actualizan en la sesión.</p></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}><Plus className="mr-2 h-4 w-4" />Crear nómina</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollTable({ lines, view }: { lines: EmployeePayrollLine[]; view: PayrollView }) {
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  return (
    <Card className="overflow-hidden border-[color:var(--border-color)]">
      <CardHeader className="border-b border-[color:var(--border-color)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="section-heading uppercase">Contenido de la nómina</CardTitle>
            <CardDescription>{lines.length} empleados incluidos en el cálculo actual.</CardDescription>
          </div>
          <Badge variant="outline">SOLO DATOS · MOCK</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EMPLEADO</TableHead>
                <TableHead>PUESTO / ESQUEMA</TableHead>
                {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableHead className="text-right">VENTAS</TableHead>}
                {(view === "CONSOLIDATED" || view === "FIXED" || view === "SPECIALIST") && <TableHead className="text-right">SUELDO</TableHead>}
                {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableHead className="text-right">COMISIÓN</TableHead>}
                {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableHead className="text-right">BONOS</TableHead>}
                {view === "CONSOLIDATED" && <TableHead className="text-right">DEDUCCIONES</TableHead>}
                <TableHead className="text-right">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.employee.id}>
                  <TableCell>
                    <p className="font-semibold text-[color:var(--text-primary)]">{line.employee.name}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{line.employee.bank} · {line.employee.account}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{line.employee.position}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{line.schemeName}{line.rate > 0 ? ` · ${(line.rate * 100).toFixed(0)}%` : ""}</p>
                  </TableCell>
                  {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableCell className="number-display text-right">{money.format(line.sales)}</TableCell>}
                  {(view === "CONSOLIDATED" || view === "FIXED" || view === "SPECIALIST") && <TableCell className="number-display text-right">{money.format(line.fixedSalary)}</TableCell>}
                  {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">{money.format(line.commission)}</TableCell>}
                  {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableCell className="number-display text-right">{money.format(line.bonuses)}</TableCell>}
                  {view === "CONSOLIDATED" && <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">{money.format(line.fines + line.loanDeduction)}</TableCell>}
                  <TableCell className="number-display text-right text-base">{money.format(line.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={view === "CONSOLIDATED" ? 7 : view === "COMMISSION" ? 5 : 3} className="text-right font-semibold">TOTAL A PAGAR</TableCell>
                <TableCell className="number-display text-right text-base">{money.format(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsolidatedDashboard({ periodStart }: { periodStart: string }) {
  const { state, payrollLines, setRunStatus } = usePayrollDemo();
  const run = state.runs.find((item) => item.periodStart === periodStart);
  const lines = payrollLines(periodStart, run?.mode ?? "WITH_VAT");
  const totalSales = lines.reduce((sum, line) => sum + line.sales, 0);
  const totalPayroll = lines.reduce((sum, line) => sum + line.total, 0);
  const totalVariable = lines.reduce((sum, line) => sum + line.commission + line.bonuses, 0);
  const authorized = state.decisions.filter((decision) => decision.periodStart === periodStart && decision.status === "AUTHORIZED").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={TrendingUp} label="VENTAS DEL PERIODO" value={money.format(totalSales)} detail="Acumulado con IVA" />
        <Metric icon={WalletCards} label="NÓMINA CONSOLIDADA" value={money.format(totalPayroll)} detail="Fijo + variable − deducciones" />
        <Metric icon={Sparkles} label="VARIABLE Y BONOS" value={money.format(totalVariable)} detail="Comisiones y bonos autorizados" />
        <Metric icon={BadgeCheck} label="VALIDACIÓN EMPLEADOS" value={`${authorized} / ${lines.length}`} detail="Conformidades registradas" />
      </div>

      {run && (
        <Card className="border-[color:var(--border-color)] bg-gradient-to-r from-[color:var(--bg-card)] to-[color:var(--accent-hover)]/35">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[color:var(--accent)] p-2.5 text-white"><FileCheck2 className="h-5 w-5" /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">Corrida {run.periodStart} / {run.periodEnd}</p><StatusBadge status={run.status} /></div>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">Pago programado {dateLabel.format(new Date(`${run.payDate}T00:00:00Z`))} · {run.mode === "WITH_VAT" ? "CON IVA" : "SIN IVA"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.status === "DRAFT" && <Button variant="outline" onClick={() => { setRunStatus(run.id, "APPROVED"); toast.success("Nómina autorizada en todos los módulos."); }}><CheckCircle2 className="mr-2 h-4 w-4" />Autorizar</Button>}
              {run.status === "APPROVED" && <Button onClick={() => { setRunStatus(run.id, "PAID"); toast.success("Pago mock registrado y recibos actualizados."); }}><CircleDollarSign className="mr-2 h-4 w-4" />Marcar pagada</Button>}
              <Button asChild variant="outline"><Link href="/reportes/desglose-sucursal">Ver costo por sucursal<ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PayrollTable lines={lines} view="CONSOLIDATED" />

      <div className="grid gap-4 lg:grid-cols-4">
        {(["SELLER", "SPECIALIST", "MANAGEMENT", "CALL_CENTER"] as EmployeeCategory[]).map((category) => {
          const categoryLines = lines.filter((line) => line.employee.category === category);
          const total = categoryLines.reduce((sum, line) => sum + line.total, 0);
          return (
            <Card key={category} className="border-[color:var(--border-color)]">
              <CardContent className="p-5">
                <p className="label-caps">{categoryLabel(category)}</p>
                <p className="number-display mt-3 text-xl">{money.format(total)}</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">{categoryLines.length} empleados</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function PayrollDemoPage({ view }: { view: PayrollView }) {
  const { currentPeriod, periodOptions, payrollLines } = usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const [mode, setMode] = useState<"WITH_VAT" | "WITHOUT_VAT">("WITH_VAT");
  const [runDialog, setRunDialog] = useState(false);
  const period = periodOptions.find((item) => item.start === periodStart) ?? currentPeriod;
  const allLines = payrollLines(periodStart, mode);
  const lines = useMemo(() => {
    if (view === "FIXED") return allLines.filter((line) => line.employee.category === "MANAGEMENT" || line.employee.category === "CALL_CENTER");
    if (view === "SPECIALIST") return allLines.filter((line) => line.employee.category === "SPECIALIST");
    if (view === "COMMISSION") return allLines.filter((line) => line.employee.category === "SELLER");
    return allLines;
  }, [allLines, view]);

  const titles = {
    CONSOLIDATED: ["Consolidado de nómina", "Visualiza, autoriza y prepara el pago de todos los esquemas en un solo lugar."],
    FIXED: ["Nómina de salario fijo", "Gerencia y call center con salario fijo quincenal configurable."],
    SPECIALIST: ["Nómina de especialistas", "Especialistas y facialistas con salario fijo por periodo."],
    COMMISSION: ["Nómina de vendedores", "Comisiones por escalas, ventas, bonos y deducciones del periodo."],
  }[view];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[color:var(--accent)] text-[color:var(--text-secondary)]">DEMO FRONTEND</Badge><span className="text-xs text-[color:var(--text-muted)]">Sin conexión a backend</span></div>
          <h1 className="page-title">{titles[0]}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">{titles[1]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/configuracion"><Settings2 className="mr-2 h-4 w-4" />Configuración</Link></Button>
          <Button onClick={() => setRunDialog(true)}><Plus className="mr-2 h-4 w-4" />Nueva nómina</Button>
        </div>
      </header>

      <Card className="border-[color:var(--border-color)]">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="period-filter">Periodo a calcular</Label>
            <Select value={periodStart} onValueChange={setPeriodStart}>
              <SelectTrigger id="period-filter"><CalendarDays className="mr-2 h-4 w-4 text-[color:var(--text-secondary)]" /><SelectValue /></SelectTrigger>
              <SelectContent>{periodOptions.map((item) => <SelectItem key={item.start} value={item.start}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {view === "COMMISSION" || view === "CONSOLIDATED" ? (
            <div className="space-y-2">
              <Label htmlFor="mode-filter">Base de comisión</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "WITH_VAT" | "WITHOUT_VAT")}>
                <SelectTrigger id="mode-filter"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="WITH_VAT">CON IVA</SelectItem><SelectItem value="WITHOUT_VAT">SIN IVA</SelectItem></SelectContent>
              </Select>
            </div>
          ) : <div />}
          <div className="rounded-xl border border-[color:var(--border-color)] px-4 py-2.5 text-sm">
            <p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Corte</p>
            <p className="font-semibold">{period.start} — {period.end}</p>
          </div>
        </CardContent>
      </Card>

      {view === "CONSOLIDATED" ? <ConsolidatedDashboard periodStart={periodStart} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={UsersRound} label="EMPLEADOS" value={String(lines.length)} detail="Incluidos en esta nómina" />
            <Metric icon={Building2} label="SUCURSALES" value={String(new Set(lines.map((line) => line.employee.branchId)).size)} detail="Centros de costo involucrados" />
            <Metric icon={Clock3} label="TOTAL DEL PERIODO" value={money.format(lines.reduce((sum, line) => sum + line.total, 0))} detail="Cálculo quincenal" />
          </div>
          <PayrollTable lines={lines} view={view} />
        </>
      )}
      <RunDialog open={runDialog} onOpenChange={setRunDialog} />
    </div>
  );
}
