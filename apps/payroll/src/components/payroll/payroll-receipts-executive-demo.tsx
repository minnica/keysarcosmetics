"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  ReceiptText,
  Search,
  Send,
  UserRound,
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
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { usePayrollDemo } from "./payroll-demo-context";
import { Receipt } from "./payroll-receipts-demo";
import type { EmployeePayrollLine } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part.charAt(0)).join("");
}

export function PayrollReceiptsExecutiveDemo() {
  const { state, currentPeriod, periodOptions, payrollLines } = usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const [preview, setPreview] = useState<EmployeePayrollLine | null>(null);
  const [search, setSearch] = useState("");
  const period = periodOptions.find((item) => item.start === periodStart) ?? currentPeriod;
  const run = state.runs.find((item) => item.periodStart === periodStart);
  const lines = payrollLines(periodStart, state.calculationMode);
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleLines = useMemo(() => lines.filter((line) => {
    const branch = state.branches.find((item) => item.id === line.employee.branchId)?.name ?? "";
    return !normalizedSearch || `${line.employee.name} ${line.employee.position} ${line.employee.bank} ${branch}`.toLocaleLowerCase("es-MX").includes(normalizedSearch);
  }), [lines, normalizedSearch, state.branches]);
  const totalNet = lines.reduce((sum, line) => sum + line.total, 0);
  const validated = lines.filter((line) => state.decisions.some((decision) => decision.employeeId === line.employee.id && decision.periodStart === periodStart && decision.status === "AUTHORIZED")).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">RECIBOS DE NÓMINA</Badge><span className="text-xs text-[color:var(--text-muted)]">Consulta ejecutiva por empleado</span></div><h1 className="page-title">Recibos del periodo</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Revisa, descarga o simula el envío desde un listado compacto y centralizado.</p></div>
        <div className="w-full max-w-md space-y-2"><Label>Periodo</Label><Select value={periodStart} onValueChange={setPeriodStart}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{periodOptions.map((item) => <SelectItem key={item.start} value={item.start}>{item.label}</SelectItem>)}</SelectContent></Select></div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-hover)]"><ReceiptText className="h-5 w-5 text-[color:var(--text-secondary)]" /></span><div><p className="label-caps">RECIBOS</p><p className="number-display mt-1 text-xl">{lines.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30"><Banknote className="h-5 w-5 text-emerald-600" /></span><div><p className="label-caps">TOTAL NETO</p><p className="number-display mt-1 text-xl">{money.format(totalNet)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/30"><CheckCircle2 className="h-5 w-5 text-sky-600" /></span><div><p className="label-caps">VALIDADOS</p><p className="mt-1 text-xl font-semibold">{validated} / {lines.length}</p><p className="text-[10px] text-[color:var(--text-muted)]">Corrida {run?.status ?? "SIN CORRIDA"}</p></div></CardContent></Card>
      </div>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><CardTitle className="section-heading uppercase">Empleados del periodo</CardTitle><CardDescription>Importe neto, validación y acciones disponibles en una sola vista.</CardDescription></div>
            <div className="relative w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input className="h-9 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="BUSCAR EMPLEADO, PUESTO O SUCURSAL" /></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(220px,1.35fr)_minmax(190px,1fr)_140px_120px_132px] gap-4 border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] md:grid">
            <span>Empleado</span><span>Puesto / cuenta</span><span className="text-right">Neto a pagar</span><span>Estatus</span><span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-[color:var(--border-color)]">
            {visibleLines.map((line) => {
              const decision = state.decisions.find((item) => item.employeeId === line.employee.id && item.periodStart === periodStart);
              const branch = state.branches.find((item) => item.id === line.employee.branchId);
              const authorized = decision?.status === "AUTHORIZED";
              return (
                <div key={line.employee.id} className="grid gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--accent-hover)]/20 md:grid-cols-[minmax(220px,1.35fr)_minmax(190px,1fr)_140px_120px_132px] md:items-center md:gap-4 md:px-5">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 text-xs font-semibold text-[color:var(--text-secondary)]">{initials(line.employee.name)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{line.employee.name}</p><p className="truncate text-[11px] text-[color:var(--text-muted)]">{branch?.name} · {line.employee.category}</p></div></div>
                  <div><p className="truncate text-xs font-medium">{line.employee.position}</p><p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">{line.employee.bank} · {line.employee.account}</p></div>
                  <div className="md:text-right"><p className="number-display text-base">{money.format(line.total)}</p><p className="text-[10px] text-[color:var(--text-muted)]">NETO DEL PERIODO</p></div>
                  <div><Badge variant="outline" className={authorized ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : ""}>{authorized ? "VALIDADO" : decision?.status === "CLARIFICATION" ? "ACLARACIÓN" : "POR REVISAR"}</Badge></div>
                  <div className="flex justify-start gap-1 md:justify-end"><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Previsualizar recibo de ${line.employee.name}`} title="Previsualizar" onClick={() => setPreview(line)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Descargar recibo de ${line.employee.name}`} title="Descargar" onClick={() => toast.success("Descarga simulada: el backend no fue utilizado.")}><Download className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Enviar recibo a ${line.employee.name}`} title="Enviar" onClick={() => toast.info("Envío simulado; no se contactó al empleado.")}><Send className="h-4 w-4" /></Button></div>
                </div>
              );
            })}
            {!visibleLines.length && <div className="flex flex-col items-center px-6 py-12 text-center"><UserRound className="h-8 w-8 text-[color:var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">No encontramos empleados</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Modifica la búsqueda para mostrar otros recibos.</p></div>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Vista previa del recibo</DialogTitle><DialogDescription>Documento informativo generado desde el estado mock actual.</DialogDescription></DialogHeader>{preview && <Receipt line={preview} periodStart={period.start} periodEnd={period.end} />}</DialogContent></Dialog>
    </div>
  );
}
