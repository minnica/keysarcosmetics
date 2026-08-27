"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  History,
  ReceiptText,
  Settings2,
  Store,
  Target,
  Trophy,
  UserRoundCheck,
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
import {
  type DemoKioskTarget,
  usePayrollDemo,
} from "./payroll-demo-context";
import { resolveBranchCommission } from "./branch-commission-calculator";
import { ReportExportButtons } from "./report-export-buttons";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const percent = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 });

const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function kioskCommission(sales: number, target: number, rate: number) {
  return target > 0 && sales >= target ? sales * rate : 0;
}

function monthLabel(month: string) {
  const label = monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

function TargetDialog({
  target,
  open,
  onOpenChange,
}: {
  target: DemoKioskTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, updateKioskTarget } = usePayrollDemo();
  const [monthlyTarget, setMonthlyTarget] = useState(String(target.monthlyTarget));
  const [rate, setRate] = useState(String(target.commissionRate * 100));
  const [managerId, setManagerId] = useState(target.managerId ?? "UNASSIGNED");
  const branch = state.branches.find((item) => item.id === target.branchId);
  const managers = state.employees.filter((employee) => employee.category === "MANAGEMENT" && employee.active);

  function submit() {
    const parsedTarget = Number(monthlyTarget);
    const parsedRate = Number(rate);
    if (parsedTarget <= 0 || parsedRate < 0 || parsedRate > 20) {
      toast.error("Captura una meta válida y una comisión entre 0% y 20%.");
      return;
    }
    updateKioskTarget(target.branchId, parsedTarget, parsedRate / 100, managerId === "UNASSIGNED" ? null : managerId);
    toast.success(`Meta de ${branch?.name ?? "la sucursal"} actualizada.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar meta de {branch?.name}</DialogTitle>
          <DialogDescription>La comisión se genera únicamente cuando las ventas mensuales alcanzan la meta del punto de venta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`kiosk-target-${target.branchId}`}>Meta mensual</Label>
            <Input id={`kiosk-target-${target.branchId}`} type="number" min="1" step="1000" value={monthlyTarget} onChange={(event) => setMonthlyTarget(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`kiosk-rate-${target.branchId}`}>Comisión sobre venta mensual (%)</Label>
            <Input id={`kiosk-rate-${target.branchId}`} type="number" min="0" max="20" step="0.1" value={rate} onChange={(event) => setRate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gerente responsable</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">GERENCIA VACANTE</SelectItem>
                {managers.map((manager) => <SelectItem key={manager.id} value={manager.id}>{manager.name} · {manager.position}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 p-4 text-sm">
            <p className="font-semibold">Regla de cálculo</p>
            <p className="mt-1 text-[color:var(--text-muted)]">Al alcanzar {money.format(Number(monthlyTarget || 0))}, se aplica {Number(rate || 0).toFixed(1)}% sobre la venta mensual registrada de la sucursal.</p>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar configuración</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollKioskCommissionDemo() {
  const { state } = usePayrollDemo();
  const monthOptions = useMemo(() => Array.from(new Set(state.kioskMonthlySales.map((sale) => sale.month))).sort().reverse(), [state.kioskMonthlySales]);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0] ?? new Date().toISOString().slice(0, 7));
  const yearOptions = useMemo(() => Array.from(new Set(monthOptions.map((month) => month.slice(0, 4)))), [monthOptions]);
  const [selectedYear, setSelectedYear] = useState(yearOptions[0] ?? String(new Date().getFullYear()));
  const [editingTarget, setEditingTarget] = useState<DemoKioskTarget | null>(null);

  const rows = state.kioskTargets.map((target) => {
    const branch = state.branches.find((item) => item.id === target.branchId);
    const sale = state.kioskMonthlySales.find((item) => item.branchId === target.branchId && item.month === selectedMonth);
    const sales = sale?.sales ?? 0;
    const achievement = target.monthlyTarget > 0 ? sales / target.monthlyTarget : 0;
    const resolution = resolveBranchCommission({ branchId: target.branchId, month: selectedMonth, schemes: state.branchCommissionSchemes, sales: state.kioskMonthlySales, fallbackTarget: target });
    const manager = state.employees.find((item) => item.id === resolution.managerId);
    return {
      target,
      branch,
      manager,
      sales,
      transactions: sale?.transactions ?? 0,
      achievement,
      commission: resolution.commission,
      appliedRate: resolution.rate,
      commissionBase: resolution.salesBase,
      branchScheme: resolution.scheme,
      combined: resolution.combined,
    };
  });
  const yearSales = state.kioskMonthlySales.filter((sale) => sale.month.startsWith(selectedYear));
  const annualRows = yearSales.map((sale) => {
    const target = state.kioskTargets.find((item) => item.branchId === sale.branchId)!;
    const branch = state.branches.find((item) => item.id === sale.branchId);
    const resolution = resolveBranchCommission({ branchId: sale.branchId, month: sale.month, schemes: state.branchCommissionSchemes, sales: state.kioskMonthlySales, fallbackTarget: target });
    const manager = state.employees.find((item) => item.id === resolution.managerId);
    return {
      ...sale,
      branch: branch?.name ?? "SIN SUCURSAL",
      manager: manager?.name ?? "GERENCIA VACANTE",
      target: target.monthlyTarget,
      achievement: target.monthlyTarget > 0 ? sale.sales / target.monthlyTarget : 0,
      commission: resolution.commission,
      rate: resolution.rate,
      schemeName: resolution.scheme?.name ?? "META INDIVIDUAL",
    };
  }).sort((a, b) => b.month.localeCompare(a.month) || a.branch.localeCompare(b.branch));

  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalTarget = rows.reduce((sum, row) => sum + row.target.monthlyTarget, 0);
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  const achievedBranches = rows.filter((row) => row.achievement >= 1).length;
  const podiumRanking = [...rows]
    .sort((a, b) => b.achievement - a.achievement || b.sales - a.sales)
    .slice(0, 3);
  const branchRecords = state.branches.map((branch) => {
    const history = state.kioskMonthlySales
      .filter((sale) => sale.branchId === branch.id)
      .sort((a, b) => b.sales - a.sales || b.month.localeCompare(a.month));
    const record = history[0];
    const previousBest = history[1];
    const target = state.kioskTargets.find((item) => item.branchId === branch.id);
    const resolution = record && target
      ? resolveBranchCommission({ branchId: branch.id, month: record.month, schemes: state.branchCommissionSchemes, sales: state.kioskMonthlySales, fallbackTarget: target })
      : null;
    const manager = state.employees.find((employee) => employee.id === resolution?.managerId);
    return {
      branch,
      record,
      previousBest,
      manager,
      target,
      achievement: record && target?.monthlyTarget ? record.sales / target.monthlyTarget : 0,
      growthOverPrevious: record && previousBest ? record.sales - previousBest.sales : null,
    };
  });
  const maxHistoricalRecord = Math.max(1, ...branchRecords.map((item) => item.record?.sales ?? 0));
  const overallRecord = [...branchRecords].sort((a, b) => (b.record?.sales ?? 0) - (a.record?.sales ?? 0))[0];
  const maxAnnualBranch = Math.max(1, ...state.branches.map((branch) => yearSales.filter((sale) => sale.branchId === branch.id).reduce((sum, sale) => sum + sale.sales, 0)));
  const exportRows = rows.map((row) => ({
    branch: row.branch?.name ?? "SIN SUCURSAL",
    manager: row.manager?.name ?? "GERENCIA VACANTE",
    bank: row.manager?.bank ?? "SIN BANCO",
    account: row.manager?.account ?? "SIN CUENTA",
    target: row.target.monthlyTarget,
    sales: row.sales,
    transactions: row.transactions,
    achievement: row.achievement,
    rate: row.appliedRate,
    commission: row.commission,
  }));
  const exportConfig = {
    title: "Comisión de kiosco",
    subtitle: `${monthLabel(selectedMonth)} · Meta y venta mensual por punto de venta`,
    filename: `comision-kiosco-${selectedMonth}`,
    sheetName: "Comision kiosco",
    rows: exportRows,
    columns: [
      { header: "SUCURSAL", accessor: (row: typeof exportRows[number]) => row.branch, width: 20 },
      { header: "GERENTE", accessor: (row: typeof exportRows[number]) => row.manager, width: 28 },
      { header: "BANCO", accessor: (row: typeof exportRows[number]) => row.bank, width: 16 },
      { header: "CUENTA / CLABE", accessor: (row: typeof exportRows[number]) => row.account, width: 22 },
      { header: "META", accessor: (row: typeof exportRows[number]) => row.target, format: "currency" as const, width: 18 },
      { header: "VENTA MENSUAL", accessor: (row: typeof exportRows[number]) => row.sales, format: "currency" as const, width: 18 },
      { header: "TRANSACCIONES", accessor: (row: typeof exportRows[number]) => row.transactions, width: 14 },
      { header: "CUMPLIMIENTO", accessor: (row: typeof exportRows[number]) => row.achievement, format: "percent" as const, width: 16 },
      { header: "TASA", accessor: (row: typeof exportRows[number]) => row.rate, format: "percent" as const, width: 12 },
      { header: "COMISIÓN", accessor: (row: typeof exportRows[number]) => row.commission, format: "currency" as const, width: 18 },
    ],
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">CÁLCULO MENSUAL</Badge><span className="text-xs text-[color:var(--text-muted)]">Meta por punto de venta</span></div><h1 className="page-title">Comisión de kiosco</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Compara la venta mensual de cada sucursal contra su meta, calcula la comisión del punto y conserva el historial por gerente.</p></div>
        <div className="flex flex-wrap gap-2"><ReportExportButtons config={exportConfig} disabled={!rows.length} /></div>
      </header>

      <Card className="overflow-hidden border-[color:var(--border-color)] bg-[linear-gradient(135deg,#24211e_0%,#382d24_62%,#76563a_155%)] text-white shadow-xl">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div><p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Mes de cálculo</p><p className="mt-2 font-brand text-3xl tracking-wide">{monthLabel(selectedMonth)}</p><p className="mt-2 max-w-xl text-sm text-white/65">Solo se consideran ventas registradas dentro del mes completo para cada punto de venta.</p></div>
          <div className="space-y-2"><Label className="text-white/75">Seleccionar mes</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="border-white/25 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((month) => <SelectItem key={month} value={month}>{monthLabel(month)}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><WalletCards className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">VENTA DE KIOSCOS</p><p className="number-display mt-2 text-2xl">{money.format(totalSales)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Venta mensual consolidada</p></CardContent></Card>
        <Card><CardContent className="p-5"><Target className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">META CONSOLIDADA</p><p className="number-display mt-2 text-2xl">{money.format(totalTarget)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{percent.format(totalTarget ? totalSales / totalTarget : 0)} de cumplimiento</p></CardContent></Card>
        <Card><CardContent className="p-5"><Trophy className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">METAS ALCANZADAS</p><p className="number-display mt-2 text-2xl">{achievedBranches} / {rows.length}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Puntos con comisión generada</p></CardContent></Card>
        <Card><CardContent className="p-5"><ReceiptText className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">COMISIÓN GENERADA</p><p className="number-display mt-2 text-2xl">{money.format(totalCommission)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Recibos gerenciales separados</p></CardContent></Card>
      </div>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader><CardTitle className="section-heading uppercase">Resultado por punto de venta</CardTitle><CardDescription>La meta mide el desempeño; el esquema vigente define la base combinada, el rango y la tasa real de comisión.</CardDescription></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>SUCURSAL / GERENTE</TableHead><TableHead>CUENTA PARA TRANSFERENCIA</TableHead><TableHead>ESQUEMA APLICADO</TableHead><TableHead className="text-right">META</TableHead><TableHead className="text-right">VENTA DEL MES</TableHead><TableHead>CUMPLIMIENTO</TableHead><TableHead className="text-right">TASA</TableHead><TableHead className="text-right">COMISIÓN</TableHead><TableHead className="text-right">CONFIGURAR</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.target.branchId}><TableCell><p className="font-semibold">{row.branch?.name}</p><p className="text-xs text-[color:var(--text-muted)]">{row.manager?.name ?? "GERENCIA VACANTE"}</p></TableCell><TableCell><p className="text-xs font-semibold">{row.manager?.bank ?? "SIN BANCO"}</p><p className="number-display mt-1 text-xs">{row.manager?.account ?? "SIN CUENTA"}</p></TableCell><TableCell><p className="font-semibold">{row.branchScheme?.name ?? "META INDIVIDUAL"}</p><p className="text-xs text-[color:var(--text-muted)]">{row.combined ? `BASE COMBINADA ${money.format(row.commissionBase)}` : "BASE DEL PUNTO"}</p></TableCell><TableCell className="number-display text-right">{money.format(row.target.monthlyTarget)}</TableCell><TableCell className="number-display text-right">{money.format(row.sales)}</TableCell><TableCell className="min-w-44"><div className="mb-1 flex items-center justify-between text-xs"><span>{percent.format(row.achievement)}</span><Badge variant="outline" className={row.achievement >= 1 ? "border-emerald-400 text-emerald-700 dark:text-emerald-300" : ""}>{row.achievement >= 1 ? "META LOGRADA" : "EN PROGRESO"}</Badge></div><div className="h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className={`h-full rounded-full ${row.achievement >= 1 ? "bg-emerald-600" : "bg-[#c3a583]"}`} style={{ width: `${Math.min(row.achievement * 100, 100)}%` }} /></div></TableCell><TableCell className="number-display text-right">{percent.format(row.appliedRate)}</TableCell><TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">{money.format(row.commission)}</TableCell><TableCell><div className="flex justify-end"><Button size="icon" variant="outline" aria-label={`Configurar meta de ${row.branch?.name}`} onClick={() => setEditingTarget(row.target)}><Settings2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell>TOTAL</TableCell><TableCell /><TableCell /><TableCell className="number-display text-right">{money.format(totalTarget)}</TableCell><TableCell className="number-display text-right">{money.format(totalSales)}</TableCell><TableCell>{percent.format(totalTarget ? totalSales / totalTarget : 0)}</TableCell><TableCell /><TableCell className="number-display text-right">{money.format(totalCommission)}</TableCell><TableCell /></TableRow></TableFooter></Table></div></CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><History className="h-5 w-5 text-[color:var(--text-secondary)]" /><h2 className="section-heading uppercase">Historial anual por sucursal y gerente</h2></div><p className="mt-1 text-sm text-[color:var(--text-muted)]">Comportamiento mensual de ventas, metas y comisiones conservado por punto de venta.</p></div><div className="w-full space-y-2 sm:w-44"><Label>Año</Label><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><CalendarDays className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.5fr]">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Venta anual por punto</CardTitle><CardDescription>Acumulado disponible de {selectedYear}.</CardDescription></CardHeader><CardContent className="space-y-5">{state.branches.map((branch) => { const annual = yearSales.filter((sale) => sale.branchId === branch.id).reduce((sum, sale) => sum + sale.sales, 0); const managerId = state.kioskTargets.find((target) => target.branchId === branch.id)?.managerId; const manager = state.employees.find((employee) => employee.id === managerId); return <div key={branch.id}><div className="mb-2 flex items-end justify-between gap-4"><div><p className="font-semibold">{branch.name}</p><p className="text-xs text-[color:var(--text-muted)]">{manager?.name ?? "GERENCIA VACANTE"}</p></div><span className="number-display text-sm">{money.format(annual)}</span></div><div className="h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]" style={{ width: `${annual / maxAnnualBranch * 100}%` }} /></div></div>; })}</CardContent></Card>
          <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Detalle mensual</CardTitle><CardDescription>{annualRows.length} registros con esquema y comisión auditables.</CardDescription></CardHeader><CardContent className="p-0"><div className="max-h-[430px] overflow-auto"><Table><TableHeader><TableRow><TableHead>MES</TableHead><TableHead>SUCURSAL</TableHead><TableHead>ESQUEMA / GERENTE</TableHead><TableHead className="text-right">VENTA</TableHead><TableHead className="text-right">TASA</TableHead><TableHead className="text-right">COMISIÓN</TableHead></TableRow></TableHeader><TableBody>{annualRows.map((row) => <TableRow key={row.id}><TableCell>{monthLabel(row.month)}</TableCell><TableCell className="font-semibold">{row.branch}</TableCell><TableCell><p className="text-xs font-semibold">{row.schemeName}</p><span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]"><UserRoundCheck className="h-3.5 w-3.5" />{row.manager}</span></TableCell><TableCell className="number-display text-right">{money.format(row.sales)}</TableCell><TableCell className="number-display text-right">{percent.format(row.rate)}</TableCell><TableCell className="number-display text-right">{money.format(row.commission)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
        </div>
      </section>

      <section className="space-y-5">
        <div className="text-center"><div className="mb-2 flex items-center justify-center gap-2"><Trophy className="h-5 w-5 text-amber-600" /><h2 className="section-heading uppercase">Ranking mensual de sucursales</h2></div><p className="text-sm text-[color:var(--text-muted)]">Podio ordenado por cumplimiento de meta en {monthLabel(selectedMonth)}.</p></div>
        <Card className="overflow-hidden border-[color:var(--border-color)] bg-[linear-gradient(145deg,var(--bg-card),var(--card-sheen))]">
          <CardContent className="px-4 pb-0 pt-8 sm:px-8">
            <div className="mx-auto grid max-w-5xl grid-cols-3 items-end gap-2 sm:gap-4">
              {[podiumRanking[1], podiumRanking[0], podiumRanking[2]].map((row, displayIndex) => {
                if (!row) return <div key={`empty-${displayIndex}`} />;
                const position = displayIndex === 1 ? 1 : displayIndex === 0 ? 2 : 3;
                const heightClass = position === 1 ? "h-48 sm:h-56" : position === 2 ? "h-36 sm:h-44" : "h-28 sm:h-36";
                const surfaceClass = position === 1 ? "from-[#b78a4f] to-[#d1b17f] text-white" : position === 2 ? "from-[#b8b2aa] to-[#ddd8d1] text-[#342f2a]" : "from-[#9a6848] to-[#bd8b68] text-white";
                return <div key={row.target.branchId} className="flex min-w-0 flex-col items-center text-center"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm ${position === 1 ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)] text-[color:var(--text-primary)]"}`}><Trophy className="h-4 w-4" /></div><p className="max-w-full truncate text-xs font-semibold sm:text-sm">{row.branch?.name}</p><p className="mt-1 max-w-full truncate text-[9px] uppercase tracking-wide text-[color:var(--text-muted)] sm:text-[10px]">{row.manager?.name ?? "GERENCIA VACANTE"}</p><p className="number-display mt-2 text-sm">{percent.format(row.achievement)}</p><div className={`mt-3 flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b pt-4 shadow-[0_-8px_30px_rgba(70,53,38,0.08)] ${heightClass} ${surfaceClass}`}><span className="font-brand text-4xl sm:text-5xl">{position}</span><span className="mt-1 text-[9px] uppercase tracking-[0.14em] opacity-75 sm:text-[10px]">{money.format(row.sales)}</span></div></div>;
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <h2 className="section-heading uppercase">Récord histórico por sucursal</h2>
            </div>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">Mayor venta mensual registrada en todo el historial. Los récords se recalculan automáticamente al agregar o actualizar registros.</p>
          </div>
          {overallRecord?.record && (
            <Badge className="w-fit border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
              RÉCORD GENERAL · {overallRecord.branch.name} · {money.format(overallRecord.record.sales)}
            </Badge>
          )}
        </div>

        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardContent className="p-0">
            <div className="divide-y divide-[color:var(--border-color)]">
              {branchRecords.map(({ branch, record, previousBest, manager, achievement, growthOverPrevious }, index) => (
                <div key={branch.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-[color:var(--accent-hover)]/20 lg:grid-cols-[54px_1.2fr_1fr_1.1fr] lg:items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/70 bg-[linear-gradient(145deg,#fff7e8,#ead2ac)] text-[#76502f] shadow-sm dark:bg-[linear-gradient(145deg,#4b3828,#2b241f)] dark:text-[#f0d1a4]">
                    <span className="number-display text-lg">{String(index + 1).padStart(2, "0")}</span>
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-[color:var(--text-primary)]">{branch.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]"><UserRoundCheck className="h-3.5 w-3.5" />{manager?.name ?? "GERENCIA VACANTE"}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--accent-hover)]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#9a6d43] to-[#d0ad77]" style={{ width: `${((record?.sales ?? 0) / maxHistoricalRecord) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <p className="label-caps">MAYOR VENTA MENSUAL</p>
                    <p className="number-display mt-1 text-xl">{money.format(record?.sales ?? 0)}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">{record ? monthLabel(record.month) : "SIN HISTORIAL"} · {record?.transactions ?? 0} transacciones</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 p-3 text-xs">
                    <div><p className="label-caps">CUMPLIMIENTO</p><p className="number-display mt-1 text-sm">{percent.format(achievement)}</p></div>
                    <div><p className="label-caps">VS. ANTERIOR</p><p className={`number-display mt-1 text-sm ${growthOverPrevious !== null && growthOverPrevious > 0 ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{growthOverPrevious === null ? "PRIMER RÉCORD" : `+${money.format(growthOverPrevious)}`}</p></div>
                    {previousBest && <p className="col-span-2 border-t border-[color:var(--border-color)] pt-2 text-[10px] text-[color:var(--text-muted)]">Anterior: {money.format(previousBest.sales)} · {monthLabel(previousBest.month)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {editingTarget && <TargetDialog key={editingTarget.branchId} target={editingTarget} open onOpenChange={(open) => { if (!open) setEditingTarget(null); }} />}
    </div>
  );
}
