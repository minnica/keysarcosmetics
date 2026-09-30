"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@cosmetics/ui";
import { Download, FileSpreadsheet, Printer, RefreshCw, TrendingUp } from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type { DesignSalesProjectionReport } from "../../../design/contracts";
import { ReportsHeader } from "./ReportsHeader";
import {
  exportSalesProjection,
  printSalesProjection,
  type SalesProjectionExportFormat,
} from "./sales-projection-export";

interface BranchItem {
  id: string;
  name: string;
}

interface SalesProjectionsWorkspaceProps {
  branches: BranchItem[];
  userName: string;
  canExport: boolean;
}

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function SalesProjectionsWorkspace({
  branches,
  userName,
  canExport,
}: SalesProjectionsWorkspaceProps) {
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [lookbackMonths, setLookbackMonths] = useState("6");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() =>
    branches.map((branch) => branch.id),
  );
  const [applied, setApplied] = useState(() => ({
    targetMonth: currentMonth(),
    lookbackMonths: 6,
    branchIds: branches.map((branch) => branch.id),
  }));
  const [report, setReport] = useState<DesignSalesProjectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<SalesProjectionExportFormat | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void schedulerDesignProposals
      .salesProjectionReport(applied)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "No fue posible calcular la proyección.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied]);

  const maxHistorical = Math.max(1, ...(report?.historical.map((item) => item.saleAmount) ?? [1]), report?.summary.projectedAmount ?? 1);
  const maxBranch = Math.max(1, ...(report?.byBranch.map((item) => item.projectedAmount) ?? [1]));
  const comparison = useMemo(
    () => [
      { label: "Promedio histórico", value: report?.summary.historicalAverage ?? 0 },
      { label: "Mes anterior", value: report?.summary.previousMonth ?? 0 },
      { label: "Proyección", value: report?.summary.projectedAmount ?? 0 },
    ],
    [report],
  );

  function toggleBranch(branchId: string) {
    setSelectedBranchIds((current) => {
      if (current.includes(branchId)) {
        return current.length === 1 ? current : current.filter((id) => id !== branchId);
      }
      return [...current, branchId];
    });
  }

  async function download(format: SalesProjectionExportFormat) {
    if (!report) return;
    setExporting(format);
    try {
      await exportSalesProjection(report, format);
      toast.success(`Proyección ${format === "xlsx" ? "Excel" : "PDF"} generada.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No fue posible exportar.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader active="projections" userName={userName} />
      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps">Planeación comercial</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.2rem)]">Proyecciones mensuales</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Compara el histórico de compras de agenda y estima el siguiente cierre mensual. La proyección está claramente separada de la venta real.</p>
          </div>
          {canExport && report ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => printSalesProjection(report)}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
              <Button variant="outline" disabled={Boolean(exporting)} onClick={() => void download("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
              <Button disabled={Boolean(exporting)} onClick={() => void download("pdf")}><Download className="mr-2 h-4 w-4" />PDF</Button>
            </div>
          ) : null}
        </div>

        <section className="reservation-control-panel">
          <div className="grid gap-4 lg:grid-cols-[220px_220px_1fr_auto] lg:items-end">
            <div><Label htmlFor="projection-month">Mes a proyectar</Label><Input id="projection-month" className="mt-1.5" type="month" value={targetMonth} onChange={(event) => setTargetMonth(event.target.value)} /></div>
            <div><Label>Histórico de referencia</Label><Select value={lookbackMonths} onValueChange={setLookbackMonths}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 meses</SelectItem><SelectItem value="6">6 meses</SelectItem><SelectItem value="12">12 meses</SelectItem></SelectContent></Select></div>
            <div><Label>Sucursales combinadas</Label><div className="mt-1.5 flex min-h-10 flex-wrap items-center gap-2">{branches.map((branch) => <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm" key={branch.id}><input checked={selectedBranchIds.includes(branch.id)} className="accent-[#9a7658]" onChange={() => toggleBranch(branch.id)} type="checkbox" />{branch.name}</label>)}</div></div>
            <Button onClick={() => setApplied({ targetMonth, lookbackMonths: Number(lookbackMonths), branchIds: selectedBranchIds })}><RefreshCw className="mr-2 h-4 w-4" />Calcular</Button>
          </div>
        </section>

        {error ? <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</section> : null}
        {loading ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Calculando tendencia y comparativa…</section> : null}

        {report && !loading ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Proyección", money.format(report.summary.projectedAmount), `${report.summary.changePercent}% vs. mes anterior`],
                ["Promedio histórico", money.format(report.summary.historicalAverage), `${report.filters.lookbackMonths} meses incluidos`],
                ["Mes anterior", money.format(report.summary.previousMonth), "Último mes cerrado"],
                ["Real a la fecha", money.format(report.summary.actualToDate), `Mes ${report.filters.targetMonth}`],
                ["Confianza", report.summary.confidenceLabel, `${report.summary.monthsWithData} meses con datos`],
              ].map(([label, value, detail], index) => <article className={index === 0 ? "report-metric report-metric-featured" : "report-metric"} key={label}><div className="flex justify-between gap-3"><p className={index === 0 ? "label-caps !text-white/60" : "label-caps"}>{label}</p><TrendingUp className="h-4 w-4" /></div><p className="number-display mt-5 text-[1.65rem] leading-none">{value}</p><p className={index === 0 ? "mt-4 text-xs text-white/55" : "mt-4 text-xs text-slate-400"}>{detail}</p></article>)}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><p className="label-caps">Serie mensual</p><h2 className="mt-1 text-xl font-semibold">Histórico y proyección</h2><div className="mt-6 flex h-64 items-end gap-3 border-b border-slate-200 px-2">{report.historical.map((item) => <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2" key={item.month}><span className="text-[10px] text-slate-500">{money.format(item.saleAmount)}</span><div className="w-full rounded-t-lg bg-[#d2ad8b]" style={{ height: `${Math.max(2, (item.saleAmount / maxHistorical) * 190)}px` }} title={`${item.month}: ${money.format(item.saleAmount)}`} /><span className="text-[10px] text-slate-400">{item.month.slice(5)}</span></div>)}<div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-[#263649]">{money.format(report.summary.projectedAmount)}</span><div className="w-full rounded-t-lg border-2 border-dashed border-[#263649] bg-[#263649]/10" style={{ height: `${Math.max(2, (report.summary.projectedAmount / maxHistorical) * 190)}px` }} /><span className="text-[10px] font-semibold">Proy.</span></div></div></article>
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><p className="label-caps">Comparativa</p><h2 className="mt-1 text-xl font-semibold">Referencia contra estimación</h2><div className="mt-6 space-y-5">{comparison.map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><strong>{money.format(item.value)}</strong></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-[linear-gradient(90deg,#9a7658,#d2ad8b)]" style={{ width: `${Math.max(3, (item.value / Math.max(1, ...comparison.map((entry) => entry.value))) * 100)}%` }} /></div></div>)}</div><p className="mt-6 rounded-2xl bg-[#f8f5f1] p-4 text-xs leading-5 text-slate-500">{report.methodology}</p></article>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><p className="label-caps">Distribución</p><h2 className="mt-1 text-xl font-semibold">Proyección por sucursal</h2><div className="mt-5 space-y-4">{report.byBranch.map((item) => <div className="grid gap-2 sm:grid-cols-[180px_1fr_140px] sm:items-center" key={item.branchId}><div><p className="font-medium">{item.branchName}</p><p className="text-xs text-slate-400">{item.changePercent}% vs. mes anterior</p></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-[#263649]" style={{ width: `${Math.max(3, (item.projectedAmount / maxBranch) * 100)}%` }} /></div><strong className="text-right">{money.format(item.projectedAmount)}</strong></div>)}</div></section>
          </>
        ) : null}
      </main>
    </div>
  );
}
