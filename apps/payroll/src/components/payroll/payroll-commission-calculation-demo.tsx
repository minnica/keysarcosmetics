"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { ReportExportButtons } from "./report-export-buttons";
import { type DemoPayrollRun, usePayrollDemo } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function shortPeriodLabel(start: string) {
  const date = new Date(`${start}T00:00:00Z`);
  const month = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  const capitalized = month.charAt(0).toLocaleUpperCase("es-MX") + month.slice(1);
  return `${capitalized} (${date.getUTCDate() === 1 ? "1.ª" : "2.ª"} quincena)`;
}

export function PayrollCommissionCalculationDemo() {
  const {
    state,
    currentPeriod,
    periodOptions,
    payrollLines,
    createRun,
    setCalculationMode,
    setCommissionModeOverride,
  } = usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const period = periodOptions.find((item) => item.start === periodStart) ?? currentPeriod;
  const activeRun = state.runs.find((item) => item.module === "COMMISSION" && item.periodStart === period.start && item.periodEnd === period.end);
  const [payDate, setPayDate] = useState(activeRun?.payDate ?? period.end);
  const [draftMode, setDraftMode] = useState<DemoPayrollRun["mode"]>(state.calculationMode);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [showMissing, setShowMissing] = useState(false);
  const lines = payrollLines(period.start, state.calculationMode, period.end, "COMMISSION").filter((line) => line.employee.category === "SELLER");
  const detailRows = useMemo(() => lines.map((line) => {
    const grossSales = state.sales.filter((sale) => sale.employeeId === line.employee.id && sale.date >= period.start && sale.date <= period.end).reduce((sum, sale) => sum + sale.amount, 0);
    const branch = state.branches.find((item) => item.id === line.employee.branchId);
    return { line, branch: branch?.name ?? "SIN SUCURSAL", grossSales, netSales: grossSales / 1.16 };
  }), [lines, period.end, period.start, state.branches, state.sales]);
  const missingScheme = detailRows.filter((row) => row.line.schemeName === "SIN ESQUEMA");
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredRows = detailRows.filter((row) => !normalizedSearch || `${row.line.employee.name} ${row.branch} ${row.line.schemeName}`.toLocaleLowerCase("es-MX").includes(normalizedSearch));
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / Number(pageSize)));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize));
  const selectedSales = detailRows.reduce((sum, row) => sum + row.line.sales, 0);
  const payrollTotal = detailRows.reduce((sum, row) => sum + row.line.total, 0);
  const deductions = detailRows.reduce((sum, row) => sum + row.line.fines + row.line.loanDeduction + row.line.externalDeductions + row.line.viaticsDeductions, 0);
  const adjustments = detailRows.reduce((sum, row) => sum + row.line.externalAdditions - row.line.externalDeductions + row.line.viaticsAdditions - row.line.viaticsDeductions, 0);
  const exportRows = detailRows.map((row) => ({
    employee: row.line.employee.name,
    branch: row.branch,
    grossSales: row.grossSales,
    netSales: row.netSales,
    mode: row.line.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA",
    scheme: row.line.schemeName,
    rate: row.line.rate,
    commission: row.line.commission,
    bonus: row.line.bonuses,
    fine: row.line.fines,
    loan: row.line.loanDeduction,
    total: row.line.total,
  }));
  const exportConfig = {
    title: "Cálculo de comisiones",
    subtitle: `${period.start} — ${period.end} · Base global ${state.calculationMode === "WITH_VAT" ? "con IVA" : "sin IVA"}`,
    filename: `calculo-comisiones-${period.start}`,
    sheetName: "Comisiones",
    orientation: "landscape" as const,
    rows: exportRows,
    columns: [
      { header: "EMPLEADO", accessor: (row: typeof exportRows[number]) => row.employee, width: 30 },
      { header: "SUCURSAL", accessor: (row: typeof exportRows[number]) => row.branch, width: 18 },
      { header: "VENTAS CON IVA", accessor: (row: typeof exportRows[number]) => row.grossSales, format: "currency" as const, width: 18 },
      { header: "VENTAS SIN IVA", accessor: (row: typeof exportRows[number]) => row.netSales, format: "currency" as const, width: 18 },
      { header: "BASE", accessor: (row: typeof exportRows[number]) => row.mode, width: 14 },
      { header: "ESQUEMA", accessor: (row: typeof exportRows[number]) => row.scheme, width: 24 },
      { header: "PORCENTAJE", accessor: (row: typeof exportRows[number]) => row.rate, format: "percent" as const, width: 14 },
      { header: "COMISIÓN", accessor: (row: typeof exportRows[number]) => row.commission, format: "currency" as const, width: 16 },
      { header: "BONO", accessor: (row: typeof exportRows[number]) => row.bonus, format: "currency" as const, width: 14 },
      { header: "MULTA", accessor: (row: typeof exportRows[number]) => row.fine, format: "currency" as const, width: 14 },
      { header: "PRÉSTAMO", accessor: (row: typeof exportRows[number]) => row.loan, format: "currency" as const, width: 14 },
      { header: "TOTAL PAGO", accessor: (row: typeof exportRows[number]) => row.total, format: "currency" as const, width: 18 },
    ],
  };

  useEffect(() => setPage(1), [pageSize, periodStart, search]);

  function saveAndRecalculate() {
    setCalculationMode(draftMode);
    createRun("COMMISSION", period.start, period.end, draftMode, payDate);
    toast.success("Borrador guardado y todos los reportes fueron recalculados.");
  }

  return <div className="space-y-7">
    <header><div className="mb-2 flex items-center gap-2"><Badge variant="outline">SUBMENÚ INDEPENDIENTE</Badge><span className="text-xs text-[color:var(--text-muted)]">Cálculo auditable por vendedor</span></div><h1 className="page-title">Cálculo de comisiones</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Configura la corrida, aplica excepciones de IVA por vendedor y revisa cada concepto antes del pago.</p></header>

    <Card className="overflow-hidden border-[color:var(--border-color)] bg-[linear-gradient(135deg,#24211e_0%,#332a23_58%,#5d4631_150%)] text-white shadow-xl">
      <CardContent className="p-5"><div className="flex flex-col gap-4 border-b border-white/15 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Periodo seleccionado</p><div className="mt-1 flex flex-wrap items-center gap-2"><p className="number-display text-lg">{period.start} — {period.end}</p><Badge className="border-white/15 bg-white/10 text-white">{activeRun?.status === "APPROVED" ? "AUTORIZADA" : activeRun?.status === "PAID" ? "PAGADA" : "BORRADOR"}</Badge></div></div><div className="flex items-center gap-3"><span className="hidden text-right text-[10px] uppercase leading-4 tracking-[0.14em] text-white/55 sm:block">Descargar<br />reporte</span><ReportExportButtons config={exportConfig} disabled={!detailRows.length} iconOnly appearance="on-dark" /></div></div><div className="grid gap-5 pt-5 sm:grid-cols-2 xl:grid-cols-4"><div><p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Ventas calculadas</p><p className="number-display mt-1 text-xl">{money.format(selectedSales)}</p><p className="mt-1 text-[10px] text-white/50">Base global y excepciones individuales</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Nómina total</p><p className="number-display mt-1 text-xl">{money.format(payrollTotal)}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Deducciones</p><p className="number-display mt-1 text-xl">{money.format(deductions)}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Balance general</p><p className="number-display mt-1 text-xl">{money.format(selectedSales - payrollTotal)}</p></div></div></CardContent>
    </Card>

    <section className="space-y-2"><p className="label-caps">CONFIGURAR BORRADOR</p><Card className="border-[color:var(--border-color)]"><CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_180px_200px_auto] lg:items-end"><div className="space-y-2"><Label>Quincena</Label><Select value={periodStart} onValueChange={(value) => { setPeriodStart(value); const selected = periodOptions.find((item) => item.start === value); if (selected) setPayDate(selected.end); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{periodOptions.map((item) => <SelectItem key={item.start} value={item.start}>{shortPeriodLabel(item.start)}</SelectItem>)}</SelectContent></Select><p className="text-[10px] text-[color:var(--text-muted)]">Consulta o crea una corrida de los últimos 12 meses.</p></div><div className="space-y-2"><Label htmlFor="commission-pay-date">Día de pago</Label><Input id="commission-pay-date" type="date" min={period.end} value={payDate} onChange={(event) => setPayDate(event.target.value)} /></div><div className="space-y-2"><Label>Base global de ventas</Label><Select value={draftMode} onValueChange={(value) => setDraftMode(value as DemoPayrollRun["mode"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WITH_VAT">CALCULAR CON IVA</SelectItem><SelectItem value="WITHOUT_VAT">CALCULAR SIN IVA</SelectItem></SelectContent></Select></div><Button onClick={saveAndRecalculate}><RefreshCw className="mr-2 h-4 w-4" />Guardar y recalcular</Button></CardContent></Card></section>

    {missingScheme.length > 0 && <Card className="border-amber-500 bg-amber-50/80 dark:bg-amber-950/25"><CardContent className="p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" /><div><p className="font-semibold text-amber-950 dark:text-amber-100">Revisa la configuración de vendedores</p><p className="mt-1 text-sm text-amber-900/75 dark:text-amber-200/75">{missingScheme.length} {missingScheme.length === 1 ? "vendedor no tiene" : "vendedores no tienen"} esquema vigente para este periodo.</p></div></div><Button variant="outline" className="border-amber-600" onClick={() => setShowMissing((current) => !current)}><ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showMissing ? "rotate-180" : ""}`} />{showMissing ? "Ocultar detalle" : "Ver detalle por empleado"}</Button></div>{showMissing && <div className="mt-4 border-t border-amber-400/50 pt-3">{missingScheme.map((row) => <div key={row.line.employee.id} className="flex items-center justify-between gap-4 py-1 text-sm"><span className="font-medium">{row.line.employee.name}</span><Badge variant="outline" className="border-amber-600 text-amber-800 dark:text-amber-200">SIN ESQUEMA</Badge></div>)}</div>}</CardContent></Card>}

    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="label-caps">DETALLE POR EMPLEADO</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Expediente compacto sin desplazamiento horizontal. Las excepciones individuales se reflejan en todos los reportes.</p></div><div className="flex flex-wrap gap-4 text-xs"><span>Ventas calculadas <strong className="number-display">{money.format(selectedSales)}</strong></span><span>Deducciones <strong className="number-display">{money.format(deductions)}</strong></span><span>Ajustes netos <strong className="number-display">{money.format(adjustments)}</strong></span></div></div>
      <Card className="border-[color:var(--border-color)]"><CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="BUSCAR EMPLEADO, SUCURSAL O ESQUEMA" /></div><div className="flex items-center gap-2"><Label className="whitespace-nowrap text-xs">Visualizar</Label><Select value={pageSize} onValueChange={setPageSize}><SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="20">20</SelectItem><SelectItem value="40">40</SelectItem><SelectItem value="80">80</SelectItem></SelectContent></Select></div></CardContent></Card>
      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardContent className="divide-y divide-[color:var(--border-color)] p-0">
        {pagedRows.length === 0 ? <div className="p-8 text-center text-sm text-[color:var(--text-muted)]">No hay empleados que coincidan con la búsqueda.</div> : pagedRows.map((row) => { const override = state.commissionModeOverrides[row.line.employee.id]; const adjustment = row.line.externalAdditions - row.line.externalDeductions; return <article key={row.line.employee.id} className="p-4 transition-colors hover:bg-[color:var(--accent-hover)]/25"><div className="grid gap-3 lg:grid-cols-[minmax(230px,1.25fr)_minmax(185px,.7fr)_minmax(150px,.55fr)] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-[color:var(--text-primary)]">{row.line.employee.name}</p>{row.line.schemeName === "SIN ESQUEMA" && <Badge variant="outline" className="border-amber-500 text-amber-800">SIN ESQUEMA</Badge>}</div><p className="mt-0.5 text-xs text-[color:var(--text-muted)]">{row.line.employee.position} · {row.branch}</p><p className="mt-1 text-xs"><span className="text-[color:var(--text-muted)]">Esquema </span><span className="font-medium">{row.line.schemeName}</span><span className="number-display ml-2">{(row.line.rate * 100).toFixed(1)}%</span></p></div><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">Base de cálculo</p><Select value={override ?? "GLOBAL"} onValueChange={(value) => { setCommissionModeOverride(row.line.employee.id, value === "GLOBAL" ? null : value as DemoPayrollRun["mode"]); toast.success(`Base individual actualizada para ${row.line.employee.name}.`); }}><SelectTrigger className={`h-9 text-xs ${override ? "border-[#c3a583] bg-[#c3a583]/10" : ""}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GLOBAL">HEREDAR · {state.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA"}</SelectItem><SelectItem value="WITH_VAT">CON IVA{state.calculationMode === "WITHOUT_VAT" ? " · EXCEPCIÓN" : ""}</SelectItem><SelectItem value="WITHOUT_VAT">SIN IVA{state.calculationMode === "WITH_VAT" ? " · EXCEPCIÓN" : ""}</SelectItem></SelectContent></Select></div><div className="rounded-xl border border-[color:var(--accent)]/35 bg-[color:var(--accent-hover)]/40 px-3 py-2 lg:text-right"><p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Total a pagar</p><p className="number-display mt-0.5 text-lg font-semibold">{money.format(row.line.total)}</p></div></div><div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[color:var(--border-color)] bg-[color:var(--border-color)] sm:grid-cols-4 xl:grid-cols-8">{[
          ["Venta con IVA", money.format(row.grossSales), ""], ["Venta sin IVA", money.format(row.netSales), ""], ["Comisión", money.format(row.line.commission), "text-emerald-700 dark:text-emerald-300"], ["Bono", money.format(row.line.bonuses), ""], ["Multa / préstamo", money.format(row.line.fines + row.line.loanDeduction), "text-rose-700 dark:text-rose-300"], ["Ajuste neto", money.format(adjustment), adjustment < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"], ["Viáticos", money.format(row.line.viaticsAdditions - row.line.viaticsDeductions), ""], ["Cuenta", row.line.employee.account, ""]
        ].map(([label, value, tone]) => <div key={label} className="min-w-0 bg-[color:var(--bg-card)] px-3 py-2"><p className="truncate text-[9px] uppercase tracking-wider text-[color:var(--text-muted)]">{label}</p><p className={`number-display mt-1 truncate text-xs ${tone}`}>{value}</p></div>)}</div></article>; })}
      </CardContent><div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><p><strong>{filteredRows.length}</strong> registros · página <strong>{currentPage}</strong> de <strong>{totalPages}</strong></p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button type="button" size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div></Card>
    </section>
  </div>;
}
