"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  ShieldX,
  Store,
  Target,
  TrendingUp,
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { usePayrollDemo } from "./payroll-demo-context";
import { resolveBranchCommission } from "./branch-commission-calculator";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const percent = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 });
const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const label = monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

export function PayrollKioskReceiptsDemo() {
  const { state, setKioskReceiptDecision } = usePayrollDemo();
  const employee = state.employees.find((item) => item.id === state.activeEmployeeId);
  const role = state.roles.find((item) => item.id === employee?.roleId);
  const branch = state.branches.find((item) => item.id === employee?.branchId);
  const target = state.kioskTargets.find((item) => item.branchId === employee?.branchId);
  const monthOptions = useMemo(() => state.kioskMonthlySales.filter((sale) => sale.branchId === employee?.branchId).map((sale) => sale.month).sort().reverse(), [employee?.branchId, state.kioskMonthlySales]);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0] ?? new Date().toISOString().slice(0, 7));
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarification, setClarification] = useState("");
  const today = localIsoDate();
  const currentMonth = today.slice(0, 7);
  const isClosedMonth = selectedMonth < currentMonth;
  const sale = state.kioskMonthlySales.find((item) => item.branchId === employee?.branchId && item.month === selectedMonth);
  const resolution = resolveBranchCommission({ branchId: employee?.branchId ?? "", month: selectedMonth, schemes: state.branchCommissionSchemes, sales: state.kioskMonthlySales, fallbackTarget: target });
  const isBranchManagement = Boolean(employee?.category === "MANAGEMENT" && employee.position.includes("GERENTE") && role?.permissions.includes("receipts.view"));
  const isAssociatedManager = !resolution.scheme?.managerId || resolution.managerId === employee?.id;
  const canViewReceipt = isBranchManagement && isAssociatedManager;
  const includedBranchIds = resolution.scheme?.branchIds ?? (employee?.branchId ? [employee.branchId] : []);
  const sales = resolution.combined ? resolution.salesBase : sale?.sales ?? 0;
  const monthlyTarget = resolution.combined
    ? state.kioskTargets.filter((item) => includedBranchIds.includes(item.branchId)).reduce((sum, item) => sum + item.monthlyTarget, 0)
    : target?.monthlyTarget ?? 0;
  const achievement = monthlyTarget > 0 ? sales / monthlyTarget : 0;
  const commission = resolution.combined ? resolution.salesBase * resolution.rate : resolution.commission;
  const receiptDecision = state.kioskReceiptDecisions.find((decision) => decision.managerId === employee?.id && decision.month === selectedMonth);
  const sellerAssignment = state.schemeAssignments
    .filter((assignment) => assignment.employeeId === employee?.id && assignment.effectiveFrom <= `${selectedMonth}-31`)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const sellerScheme = state.schemes.find((scheme) => scheme.id === (sellerAssignment?.schemeId ?? employee?.schemeId));
  const personalCutoff = selectedMonth === currentMonth ? today : `${selectedMonth}-${String(new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;
  const personalSales = state.sales.filter((item) => item.employeeId === employee?.id && item.date >= `${selectedMonth}-01` && item.date <= personalCutoff).reduce((sum, item) => sum + item.amount, 0);
  const sellerTier = sellerScheme?.tiers.find((tier) => personalSales >= tier.from && (tier.to === null || personalSales <= tier.to));
  const personalCommission = personalSales * (sellerTier?.rate ?? 0);
  const transactions = resolution.combined
    ? state.kioskMonthlySales.filter((item) => item.month === selectedMonth && includedBranchIds.includes(item.branchId)).reduce((sum, item) => sum + item.transactions, 0)
    : sale?.transactions ?? 0;
  const weeklySales = [0.22, 0.25, 0.27, 0.26].map((share, index) => ({
    label: `SEMANA ${index + 1}`,
    sales: Math.round(sales * share),
    transactions: Math.round(transactions * share),
  }));

  function authorizeManagerReceipt() {
    if (!employee || !isClosedMonth) return;
    setKioskReceiptDecision(employee.id, selectedMonth, "AUTHORIZED", "RECIBO GERENCIAL VALIDADO POR EL EMPLEADO");
    toast.success("Recibo extra de gerencia autorizado.");
  }

  function requestManagerClarification() {
    if (!employee || !clarification.trim()) {
      toast.error("Describe brevemente qué deseas aclarar.");
      return;
    }
    setKioskReceiptDecision(employee.id, selectedMonth, "CLARIFICATION", clarification.trim());
    setClarificationOpen(false);
    setClarification("");
    toast.info("Aclaración del recibo gerencial enviada.");
  }

  if (!canViewReceipt) {
    return (
      <div className="space-y-7">
        <header><div className="mb-2 flex items-center gap-2"><Badge variant="outline">ACCESO GERENCIAL</Badge><span className="text-xs text-[color:var(--text-muted)]">Información restringida por puesto</span></div><h1 className="page-title">Recibos de comisión de kiosco</h1></header>
        <Card className="border-dashed border-rose-300"><CardContent className="flex flex-col items-center px-6 py-16 text-center"><ShieldX className="h-11 w-11 text-rose-600" /><h2 className="mt-4 text-lg font-semibold">Recibo disponible únicamente para la gerencia asociada</h2><p className="mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">La sesión activa pertenece a {employee?.name ?? "un usuario sin identificar"}. El esquema vigente asigna esta comisión a {state.employees.find((item) => item.id === resolution.managerId)?.name ?? "una gerencia pendiente"}.</p><Badge variant="outline" className="mt-5"><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />ESQUEMA, VENTAS Y ESCALA PROTEGIDOS</Badge></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />{isClosedMonth ? "RECIBO EXTRA DE GERENCIA" : "AVANCE GERENCIAL"}</Badge><span className="text-xs text-[color:var(--text-muted)]">{resolution.combined ? `${includedBranchIds.length} sucursales combinadas` : `Solo ${branch?.name}`}</span></div><h1 className="page-title">Mi comisión de kiosco</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Durante el mes se muestra el avance; al cerrar se genera un recibo independiente para autorizar o solicitar aclaración.</p></div>
        <div className="w-full max-w-sm space-y-2"><Label>Mes del recibo</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger><CalendarDays className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((month) => <SelectItem key={month} value={month}>{monthLabel(month)}</SelectItem>)}</SelectContent></Select></div>
      </header>

      {!isClosedMonth ? <Card className="border-amber-300 bg-amber-50/70 dark:bg-amber-950/20"><CardContent className="flex gap-3 p-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Cierre mensual en proceso</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Este es un avance acumulado de {monthLabel(selectedMonth)}. El recibo extra de gerencia y sus botones de autorización se habilitarán al cerrar el mes.</p></div></CardContent></Card> : <Card className="border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/20"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="font-semibold">Recibo mensual cerrado y disponible</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{receiptDecision?.status === "AUTHORIZED" ? "Autorizado por el gerente." : receiptDecision?.status === "CLARIFICATION" ? "Aclaración solicitada; Administración deberá revisarla." : "Pendiente de revisión por el gerente."}</p></div></div><Badge variant="outline">{receiptDecision?.status === "AUTHORIZED" ? "AUTORIZADO" : receiptDecision?.status === "CLARIFICATION" ? "ACLARACIÓN ABIERTA" : "PENDIENTE"}</Badge></CardContent></Card>}

      {sellerScheme && <Card className="overflow-hidden border-[color:var(--accent)]/35"><CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20"><CardTitle className="section-heading uppercase">Doble esquema activo · ventas y gerencia</CardTitle><CardDescription>Conteo de venta personal y escala calculados hasta {personalCutoff}. La comisión gerencial permanece separada.</CardDescription></CardHeader><CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"><div><p className="label-caps">VENTA PERSONAL AL DÍA</p><p className="number-display mt-2 text-xl">{money.format(personalSales)}</p></div><div><p className="label-caps">ESQUEMA DE VENDEDOR</p><p className="mt-2 font-semibold">{sellerScheme.name}</p></div><div><p className="label-caps">ESCALA ACTUAL</p><p className="number-display mt-2 text-xl">{percent.format(sellerTier?.rate ?? 0)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Desde {money.format(sellerTier?.from ?? 0)}</p></div><div><p className="label-caps">COMISIÓN PERSONAL</p><p className="number-display mt-2 text-xl text-emerald-700 dark:text-emerald-300">{money.format(personalCommission)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Se paga en la nómina personal</p></div></CardContent></Card>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><Store className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ALCANCE</p><p className="mt-2 text-xl font-semibold">{resolution.combined ? `${includedBranchIds.length} SUCURSALES` : branch?.name}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{resolution.scheme?.name ?? "META INDIVIDUAL"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><Target className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">META MENSUAL</p><p className="number-display mt-2 text-2xl">{money.format(monthlyTarget)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><TrendingUp className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">VENTA DEL MES</p><p className="number-display mt-2 text-2xl">{money.format(sales)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{percent.format(achievement)} de la meta</p></CardContent></Card>
        <Card><CardContent className="p-5"><ReceiptText className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">COMISIÓN</p><p className="number-display mt-2 text-2xl">{money.format(commission)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Escala aplicada {percent.format(resolution.rate)}</p></CardContent></Card>
      </div>

      <Card className="mx-auto max-w-4xl overflow-hidden border-[color:var(--border-color)] shadow-xl">
        <div className="bg-[linear-gradient(135deg,#24211e_0%,#49382a_72%,#76563a_150%)] px-6 py-6 text-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-brand text-2xl tracking-[0.12em]">KEYSAR COSMETICS</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/60">Recibo mensual de comisión de kiosco</p></div><Badge className={achievement >= 1 ? "border-emerald-300 bg-emerald-500/20 text-white" : "border-white/20 bg-white/10 text-white"}>{achievement >= 1 ? "META ALCANZADA" : "META NO ALCANZADA"}</Badge></div>
        </div>
        <CardContent className="space-y-6 p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Gerente responsable</p><p className="mt-1 text-lg font-semibold">{employee?.name}</p><p className="text-sm text-[color:var(--text-muted)]">{employee?.position} · {branch?.name}</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Periodo mensual</p><p className="mt-1 font-semibold">{monthLabel(selectedMonth)}</p><p className="text-xs text-[color:var(--text-muted)]">01/{selectedMonth.slice(5, 7)}/{selectedMonth.slice(0, 4)} — FIN DE MES</p></div></div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-[color:var(--accent-hover)]/40 p-4"><p className="label-caps">META {resolution.combined ? "COMBINADA" : "DEL PUNTO"}</p><p className="number-display mt-2 text-xl">{money.format(monthlyTarget)}</p></div><div className="rounded-xl bg-[color:var(--accent-hover)]/40 p-4"><p className="label-caps">VENTAS REGISTRADAS</p><p className="number-display mt-2 text-xl">{money.format(sales)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{transactions} transacciones</p></div><div className="rounded-xl bg-[color:var(--accent-hover)]/40 p-4"><p className="label-caps">CUMPLIMIENTO</p><p className="number-display mt-2 text-xl">{percent.format(achievement)}</p></div></div>
          <div><div className="mb-2 flex justify-between text-xs"><span>Progreso mensual</span><strong>{percent.format(achievement)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className={`h-full rounded-full ${achievement >= 1 ? "bg-emerald-600" : "bg-[#c3a583]"}`} style={{ width: `${Math.min(achievement * 100, 100)}%` }} /></div></div>
          <div><div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /><h2 className="font-semibold">Ventas de la sucursal dentro del mes</h2></div><Table><TableHeader><TableRow><TableHead>CORTE</TableHead><TableHead className="text-right">TRANSACCIONES</TableHead><TableHead className="text-right">VENTA REGISTRADA</TableHead></TableRow></TableHeader><TableBody>{weeklySales.map((week) => <TableRow key={week.label}><TableCell>{week.label}</TableCell><TableCell className="number-display text-right">{week.transactions}</TableCell><TableCell className="number-display text-right">{money.format(week.sales)}</TableCell></TableRow>)}</TableBody></Table></div>
          <Separator />
          <div className="grid gap-5 sm:grid-cols-2 sm:items-end"><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Base mensual {resolution.combined ? "combinada" : `de ${branch?.name}`}</span><strong>{money.format(sales)}</strong></div><div className="flex justify-between"><span>Esquema</span><strong>{resolution.scheme?.name ?? "META INDIVIDUAL"}</strong></div><div className="flex justify-between"><span>Escala aplicada</span><strong>{percent.format(resolution.rate)}</strong></div></div><div className="rounded-2xl border border-[color:var(--accent)]/45 bg-[color:var(--accent-hover)]/35 p-5 text-right"><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Comisión total gerencial</p><p className="number-display mt-1 text-3xl">{money.format(commission)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Pago separado de la nómina personal</p></div></div>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => toast.info("Vista previa actualizada con el estado mock.")}><Eye className="mr-2 h-4 w-4" />Vista previa</Button><Button variant="outline" onClick={() => toast.success("Descarga simulada; no se utilizó backend.")}><Download className="mr-2 h-4 w-4" />Descargar recibo</Button>{isClosedMonth && <><Button variant="outline" onClick={() => setClarificationOpen(true)}><MessageSquareText className="mr-2 h-4 w-4" />Solicitar aclaración</Button><Button onClick={authorizeManagerReceipt} disabled={receiptDecision?.status === "AUTHORIZED"}><CheckCircle2 className="mr-2 h-4 w-4" />{receiptDecision?.status === "AUTHORIZED" ? "Recibo autorizado" : "Autorizar recibo"}</Button></>}</div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5" />Historial de mis recibos</CardTitle><CardDescription>Cada mes conserva el esquema, alcance y escala que correspondían a su vigencia.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{monthOptions.map((month) => { const monthResolution = resolveBranchCommission({ branchId: employee?.branchId ?? "", month, schemes: state.branchCommissionSchemes, sales: state.kioskMonthlySales, fallbackTarget: target }); const amount = monthResolution.combined ? monthResolution.salesBase * monthResolution.rate : monthResolution.commission; return <button type="button" key={month} onClick={() => setSelectedMonth(month)} className={`rounded-xl border p-4 text-left transition-colors ${month === selectedMonth ? "border-[color:var(--accent)] bg-[color:var(--accent-hover)]/45" : "border-[color:var(--border-color)] hover:bg-[color:var(--accent-hover)]/25"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{monthLabel(month)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{monthResolution.scheme?.name ?? "META INDIVIDUAL"} · {money.format(monthResolution.salesBase)}</p></div><span className="number-display text-sm">{money.format(amount)}</span></div></button>; })}</CardContent></Card>
      <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar aclaración del recibo gerencial</DialogTitle><DialogDescription>Indica la sucursal, venta, escala o comisión mensual que deseas revisar.</DialogDescription></DialogHeader><div className="space-y-2 py-2"><Label htmlFor="manager-receipt-clarification">Detalle</Label><Textarea id="manager-receipt-clarification" value={clarification} onChange={(event) => setClarification(event.target.value)} placeholder="EJ. SOLICITO VALIDAR LAS VENTAS DE SATÉLITE DEL ÚLTIMO CORTE" /></div><DialogFooter><Button variant="outline" onClick={() => setClarificationOpen(false)}>Cancelar</Button><Button onClick={requestManagerClarification}>Enviar aclaración</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
