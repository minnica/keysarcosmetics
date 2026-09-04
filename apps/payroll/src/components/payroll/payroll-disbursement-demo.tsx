"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from "@cosmetics/ui";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  LockKeyhole,
  ShieldPlus,
  UsersRound,
} from "lucide-react";
import {
  payrollModuleForCategory,
  type PayrollModule,
  usePayrollDemo,
} from "./payroll-demo-context";
import { resolveBranchCommission } from "./branch-commission-calculator";
import { ReportExportButtons } from "./report-export-buttons";
import type { ReportExportConfig } from "@/lib/report-export";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const modules = ["FIXED", "SPECIALIST", "COMMISSION", "KIOSK_COMMISSION", "CONTRACTOR"] as const;
type DisbursementModule = (typeof modules)[number];

const moduleCopy: Record<DisbursementModule, { label: string; detail: string }> = {
  FIXED: { label: "SALARIO FIJO", detail: "GERENCIA Y CALL CENTER" },
  SPECIALIST: { label: "ESPECIALISTAS", detail: "FACIALISTAS Y ESPECIALISTAS" },
  COMMISSION: { label: "COMISIONES", detail: "VENTA Y ESQUEMA APLICADO" },
  KIOSK_COMMISSION: { label: "COMISIÓN DE KIOSCO", detail: "CIERRE MENSUAL GERENCIAL" },
  CONTRACTOR: { label: "HONORARIOS", detail: "SERVICIOS FACTURADOS" },
};

interface DisbursementRun {
  id: string;
  module: DisbursementModule;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  mode: "WITH_VAT" | "WITHOUT_VAT";
  status: "APPROVED" | "PAID";
}

interface DisbursementRow {
  id: string;
  paternalSurname: string;
  maternalSurname: string;
  firstName: string;
  position: string;
  bank: string;
  clabe: string;
  payment: number;
  isr: number;
  socialCost: number;
  total: number;
  branch: string;
}

function fallbackName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? "—", paternalSurname: "—", maternalSurname: "—" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    paternalSurname: parts.at(-1) ?? "—",
    maternalSurname: "—",
  };
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year ?? 0, monthNumber ?? 1, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return <Card className="border-[color:var(--border-color)]"><CardContent className="flex items-start justify-between gap-4 p-4"><div><p className="label-caps">{label}</p><p className="number-display mt-1 text-xl">{value}</p><p className="mt-1 text-[10px] text-[color:var(--text-muted)]">{detail}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c7a17a]/30 bg-[#c7a17a]/10 text-[#946a43]"><Icon className="h-4 w-4" /></span></CardContent></Card>;
}

export function PayrollDisbursementDemo() {
  const { state, payrollLines } = usePayrollDemo();
  const [module, setModule] = useState<DisbursementModule>("COMMISSION");
  const [selectedRunId, setSelectedRunId] = useState("");

  useEffect(() => {
    document.body.classList.add("payroll-dispersion-print");
    return () => document.body.classList.remove("payroll-dispersion-print");
  }, []);

  const closedRuns = useMemo<DisbursementRun[]>(() => {
    if (module === "KIOSK_COMMISSION") {
      const currentMonth = new Date().toISOString().slice(0, 7);
      return Array.from(new Set(state.kioskMonthlySales.map((sale) => sale.month)))
        .filter((month) => month < currentMonth)
        .sort((a, b) => b.localeCompare(a))
        .map((month) => {
          const periodEnd = monthEnd(month);
          return {
            id: `run-kiosk-${month}`,
            module,
            periodStart: `${month}-01`,
            periodEnd,
            payDate: addDays(periodEnd, 3),
            mode: "WITH_VAT",
            status: "APPROVED",
          };
        });
    }
    return state.runs
      .filter((item) => item.module === module && (item.status === "APPROVED" || item.status === "PAID"))
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)) as DisbursementRun[];
  }, [module, state.kioskMonthlySales, state.runs]);
  const run = closedRuns.find((item) => item.id === selectedRunId) ?? closedRuns[0];

  const rows = useMemo<DisbursementRow[]>(() => {
    if (!run) return [];

    if (module === "KIOSK_COMMISSION") {
      const month = run.periodStart.slice(0, 7);
      const managerRows = new Map<string, DisbursementRow & { branchNames: Set<string>; employeeId: string }>();

      state.kioskTargets.forEach((target) => {
        const resolution = resolveBranchCommission({
          branchId: target.branchId,
          month,
          schemes: state.branchCommissionSchemes,
          sales: state.kioskMonthlySales,
          fallbackTarget: target,
        });
        const employee = state.employees.find((item) => item.id === resolution.managerId);
        if (!employee || resolution.commission <= 0) return;

        const branchName = state.branches.find((item) => item.id === target.branchId)?.name ?? "SIN SUCURSAL";
        const current = managerRows.get(employee.id);
        if (current) {
          current.payment += resolution.commission;
          current.branchNames.add(branchName);
          return;
        }

        const fallback = fallbackName(employee.name);
        managerRows.set(employee.id, {
          id: `kiosk-${month}-${employee.id}`,
          employeeId: employee.id,
          paternalSurname: employee.paternalSurname ?? fallback.paternalSurname,
          maternalSurname: employee.maternalSurname ?? fallback.maternalSurname,
          firstName: employee.firstName ?? fallback.firstName,
          position: employee.position,
          bank: employee.bank,
          clabe: employee.clabe ?? `CLABE DEMO ${employee.account.replace(/\D/g, "").padStart(18, "0")}`,
          payment: resolution.commission,
          isr: 0,
          socialCost: 0,
          total: 0,
          branch: branchName,
          branchNames: new Set([branchName]),
        });
      });

      return Array.from(managerRows.values())
        .map(({ branchNames, employeeId, ...row }) => {
          const employee = state.employees.find((item) => item.id === employeeId);
          const isr = row.payment * (employee?.isrCostRate ?? 0);
          const socialCost = row.payment * (employee?.socialCostRate ?? 0);
          return {
            ...row,
            branch: Array.from(branchNames).join(" · "),
            isr,
            socialCost,
            total: row.payment + isr + socialCost,
          };
        })
        .sort((a, b) => a.paternalSurname.localeCompare(b.paternalSurname, "es-MX") || a.maternalSurname.localeCompare(b.maternalSurname, "es-MX") || a.firstName.localeCompare(b.firstName, "es-MX"));
    }

    return payrollLines(run.periodStart, run.mode, run.periodEnd, module)
      .filter((line) => payrollModuleForCategory(line.employee.category) === module)
      .map((line) => {
        const fallback = fallbackName(line.employee.name);
        const branch = state.branches.find((item) => item.id === line.employee.branchId)?.name ?? "SIN SUCURSAL";
        return {
          id: line.employee.id,
          paternalSurname: line.employee.paternalSurname ?? fallback.paternalSurname,
          maternalSurname: line.employee.maternalSurname ?? fallback.maternalSurname,
          firstName: line.employee.firstName ?? fallback.firstName,
          position: line.employee.position,
          bank: line.employee.bank,
          clabe: line.employee.clabe ?? `CLABE DEMO ${line.employee.account.replace(/\D/g, "").padStart(18, "0")}`,
          payment: line.total,
          isr: line.isrCost,
          socialCost: line.socialCost,
          total: line.totalCost,
          branch,
        };
      })
      .sort((a, b) => a.paternalSurname.localeCompare(b.paternalSurname, "es-MX") || a.maternalSurname.localeCompare(b.maternalSurname, "es-MX") || a.firstName.localeCompare(b.firstName, "es-MX"));
  }, [module, payrollLines, run, state.branchCommissionSchemes, state.branches, state.employees, state.kioskMonthlySales, state.kioskTargets]);

  const totals = useMemo(() => rows.reduce((result, row) => ({
    payment: result.payment + row.payment,
    isr: result.isr + row.isr,
    socialCost: result.socialCost + row.socialCost,
    total: result.total + row.total,
  }), { payment: 0, isr: 0, socialCost: 0, total: 0 }), [rows]);

  const footerRow: DisbursementRow = {
    id: "total",
    paternalSurname: "TOTAL",
    maternalSurname: "",
    firstName: "",
    position: "",
    bank: "",
    clabe: "",
    payment: totals.payment,
    isr: totals.isr,
    socialCost: totals.socialCost,
    total: totals.total,
    branch: "",
  };

  const exportConfig: ReportExportConfig<DisbursementRow> = {
    title: `DISPERSIÓN DE NÓMINA · ${moduleCopy[module].label}`,
    subtitle: run ? `PERIODO ${run.periodStart} — ${run.periodEnd} · CORRIDA ${run.status === "PAID" ? "PAGADA" : "CERRADA PARA PAGO"} · DATOS DEMOSTRATIVOS` : "SIN CORRIDA CERRADA",
    filename: `dispersion-${module.toLocaleLowerCase()}-${run?.periodStart ?? "sin-periodo"}`,
    sheetName: `Dispersión ${moduleCopy[module].label}`,
    orientation: "landscape",
    columns: [
      { header: "Apellido paterno", accessor: (row) => row.paternalSurname, width: 18 },
      { header: "Apellido materno", accessor: (row) => row.maternalSurname, width: 18 },
      { header: "Nombre(s)", accessor: (row) => row.firstName, width: 22 },
      { header: "Puesto", accessor: (row) => row.position, width: 25 },
      { header: "Banco", accessor: (row) => row.bank, width: 14 },
      { header: "CLABE interbancaria", accessor: (row) => row.clabe, width: 23 },
      { header: "Monto de pago", accessor: (row) => row.payment, format: "currency", width: 17 },
      { header: "ISR", accessor: (row) => row.isr, format: "currency", width: 15 },
      { header: "Costo social", accessor: (row) => row.socialCost, format: "currency", width: 17 },
      { header: "Total", accessor: (row) => row.total, format: "currency", width: 17 },
    ],
    rows,
    footerRow,
  };

  return <div className="payroll-dispersion-page space-y-6">
    <header className="flex flex-col gap-4 border-b border-[color:var(--border-color)] pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline">CIERRE INFORMATIVO</Badge><span className="text-xs text-[color:var(--text-muted)]">Datos exclusivamente frontend</span></div><h1 className="page-title">Dispersión de nómina</h1><p className="mt-2 max-w-3xl text-sm text-[color:var(--text-muted)]">Concentrado final para preparar el pago. Se habilita únicamente con corridas autorizadas o pagadas y genera un formato independiente por cada tipo de nómina.</p></div>
      <div className="payroll-dispersion-controls"><ReportExportButtons config={exportConfig} disabled={!run || rows.length === 0} /></div>
    </header>

    <section className="payroll-dispersion-controls rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-3 shadow-sm" aria-label="Tipos de nómina">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{modules.map((item) => { const active = module === item; const currentMonth = new Date().toISOString().slice(0, 7); const available = item === "KIOSK_COMMISSION" ? Array.from(new Set(state.kioskMonthlySales.map((sale) => sale.month))).filter((month) => month < currentMonth).length : state.runs.filter((runItem) => runItem.module === item && runItem.status !== "DRAFT").length; return <button key={item} type="button" onClick={() => { setModule(item); setSelectedRunId(""); }} aria-pressed={active} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${active ? "border-[#9b704d] bg-[linear-gradient(120deg,#332820,#60442f)] text-white shadow-lg" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)] hover:border-[#b58a64]"}`}><span><span className={`block text-[10px] font-semibold tracking-[0.1em] ${active ? "text-[#f1cfaa]" : "text-[color:var(--text-secondary)]"}`}>{moduleCopy[item].label}</span><span className={`mt-0.5 block text-[8px] tracking-[0.08em] ${active ? "text-white/60" : "text-[color:var(--text-muted)]"}`}>{moduleCopy[item].detail}</span></span><span className={`flex h-7 min-w-7 items-center justify-center rounded-lg border px-1.5 text-[9px] font-semibold ${active ? "border-white/20 bg-white/10" : "border-[color:var(--border-color)]"}`}>{available}</span></button>; })}</div>
    </section>

    {!run ? <Card className="overflow-hidden border-amber-300/70"><CardContent className="flex flex-col items-center px-6 py-16 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30"><LockKeyhole className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold">No existe una corrida cerrada de {moduleCopy[module].label.toLocaleLowerCase("es-MX")}</h2><p className="mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">Autoriza la nómina desde su módulo correspondiente. En cuanto quede cerrada para pago, este formato se alimentará automáticamente y habilitará la impresión, el PDF y Excel.</p><Badge variant="outline" className="mt-5 border-amber-300 text-amber-800 dark:text-amber-200">EXPORTACIÓN BLOQUEADA · CORRIDA EN BORRADOR</Badge></CardContent></Card> : <>
      <section id="payroll-dispersion-report" className="space-y-5">
        <Card className="overflow-hidden border-[#a47b56]/40 bg-card text-white"><CardContent className="p-5"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-[#e8c89f]" /><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Formato de dispersión</p></div><h2 className="mt-3 font-brand text-2xl tracking-wide">{moduleCopy[module].label}</h2><p className="mt-1 text-xs text-white/65">{run.periodStart} — {run.periodEnd} · pago {run.payDate}</p></div><div className="flex flex-wrap items-center gap-2"><Badge className="border border-emerald-300/30 bg-emerald-400/10 text-emerald-100"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />{run.status === "PAID" ? "PAGADA" : "CERRADA PARA PAGO"}</Badge><Badge className="border border-white/15 bg-white/5 text-white">FOLIO {run.id.toLocaleUpperCase("es-MX")}</Badge></div></div></CardContent></Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={UsersRound} label="PERSONAL" value={String(rows.length)} detail="REGISTROS PARA DISPERSIÓN" /><Metric icon={CircleDollarSign} label="MONTO DE PAGO" value={money.format(totals.payment)} detail="NETO A TRANSFERIR" /><Metric icon={ShieldPlus} label="CARGAS" value={money.format(totals.isr + totals.socialCost)} detail="ISR + COSTO SOCIAL" /><Metric icon={Building2} label="COSTO TOTAL" value={money.format(totals.total)} detail="PAGO + CARGAS" /></div>

        {closedRuns.length > 1 && <div className="payroll-dispersion-controls ml-auto w-full max-w-sm"><Select value={run.id} onValueChange={setSelectedRunId}><SelectTrigger aria-label="Periodo cerrado"><SelectValue /></SelectTrigger><SelectContent>{closedRuns.map((item) => <SelectItem key={item.id} value={item.id}>{item.periodStart} — {item.periodEnd}</SelectItem>)}</SelectContent></Select></div>}

        <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className="border-b border-[color:var(--border-color)] pb-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-[color:var(--text-secondary)]" /><CardTitle className="section-heading uppercase">Personal ordenado para dispersión</CardTitle></div><CardDescription>Orden alfabético por apellido paterno, apellido materno y nombre. Las CLABE mostradas son ficticias.</CardDescription></div><Badge variant="outline">{rows.length} REGISTROS</Badge></div></CardHeader><CardContent className="p-0">
          <div className="hidden xl:block"><Table><TableHeader><TableRow><TableHead>APELLIDO PATERNO</TableHead><TableHead>APELLIDO MATERNO</TableHead><TableHead>NOMBRE(S)</TableHead><TableHead>PUESTO</TableHead><TableHead>BANCO / CLABE</TableHead><TableHead className="text-right">MONTO DE PAGO</TableHead><TableHead className="text-right">ISR</TableHead><TableHead className="text-right">COSTO SOCIAL</TableHead><TableHead className="text-right">TOTAL</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-semibold">{row.paternalSurname}</TableCell><TableCell>{row.maternalSurname}</TableCell><TableCell>{row.firstName}</TableCell><TableCell><p className="font-medium">{row.position}</p><p className="text-[9px] text-[color:var(--text-muted)]">{row.branch}</p></TableCell><TableCell><p className="text-[10px] font-semibold">{row.bank}</p><p className="number-display whitespace-nowrap text-[10px] tracking-[0.04em]">{row.clabe}</p></TableCell><TableCell className="number-display text-right">{money.format(row.payment)}</TableCell><TableCell className="number-display text-right">{money.format(row.isr)}</TableCell><TableCell className="number-display text-right">{money.format(row.socialCost)}</TableCell><TableCell className="number-display text-right font-semibold">{money.format(row.total)}</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell colSpan={5} className="text-right font-semibold">TOTAL {moduleCopy[module].label}</TableCell><TableCell className="number-display text-right">{money.format(totals.payment)}</TableCell><TableCell className="number-display text-right">{money.format(totals.isr)}</TableCell><TableCell className="number-display text-right">{money.format(totals.socialCost)}</TableCell><TableCell className="number-display text-right text-base">{money.format(totals.total)}</TableCell></TableRow></TableFooter></Table></div>
          <div className="divide-y divide-[color:var(--border-color)] xl:hidden">{rows.map((row, index) => <article key={row.id} className="p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-secondary)]">{String(index + 1).padStart(2, "0")} · {row.paternalSurname} {row.maternalSurname}</p><p className="mt-1 font-semibold">{row.firstName}</p><p className="text-xs text-[color:var(--text-muted)]">{row.position} · {row.branch}</p></div><p className="number-display text-right text-base">{money.format(row.total)}</p></div><div className="mt-3 grid gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-3 sm:grid-cols-2"><div><p className="label-caps">BANCO / CLABE</p><p className="mt-1 text-xs font-semibold">{row.bank} · {row.clabe}</p></div><div className="grid grid-cols-3 gap-2"><div><p className="label-caps">PAGO</p><p className="number-display mt-1 text-xs">{money.format(row.payment)}</p></div><div><p className="label-caps">ISR</p><p className="number-display mt-1 text-xs">{money.format(row.isr)}</p></div><div><p className="label-caps">SOCIAL</p><p className="number-display mt-1 text-xs">{money.format(row.socialCost)}</p></div></div></div></article>)}</div>
        </CardContent></Card>

        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" /><div><p className="text-sm font-semibold">Formato conciliado para dispersión</p><p className="mt-0.5 text-xs opacity-75">El total del archivo coincide con la nómina cerrada seleccionada. Este prototipo no realiza transferencias bancarias.</p></div></div><p className="number-display text-lg">{money.format(totals.total)}</p></div>
      </section>
    </>}
  </div>;
}
