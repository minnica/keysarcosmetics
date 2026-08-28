"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, CalendarCheck2, CheckCircle2, CircleDollarSign, Eye, HandCoins, Landmark, MessageSquareText, ReceiptText, ShieldX, Store, TrendingUp, UserRound, WalletCards } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { payrollModuleForCategory, usePayrollDemo } from "./payroll-demo-context";
import { resolveBranchCommission } from "./branch-commission-calculator";
import { EmployeeViaticsPanel } from "./payroll-viatics-demo";
import { Receipt } from "./payroll-receipts-demo";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function EmployeePayrollPortalDemo() {
  const { state, payrollLines, addLoan, setDecision, setMovementStatus } = usePayrollDemo();
  const employee = state.employees.find((item) => item.id === state.activeEmployeeId) ?? state.employees[0];
  const activeRole = state.roles.find((role) => role.id === employee?.roleId);
  const canViewPortal = activeRole?.permissions.includes("portal.view") ?? false;
  const payrollModule = employee ? payrollModuleForCategory(employee.category) : undefined;
  const activeConfig = state.periodConfigs.find((item) => item.module === payrollModule && item.active);
  const activeRun = activeConfig ? state.runs.find((item) => item.module === payrollModule && item.periodStart === activeConfig.periodStart && item.periodEnd === activeConfig.periodEnd) : undefined;
  const line = activeConfig && activeRun && payrollModule ? payrollLines(activeConfig.periodStart, state.calculationMode, activeConfig.periodEnd, payrollModule).find((item) => item.employee.id === employee?.id) : undefined;
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarification, setClarification] = useState("");
  const [requestType, setRequestType] = useState<"LOAN" | "ADVANCE" | null>(null);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestInstallments, setRequestInstallments] = useState("4");
  const [requestNotes, setRequestNotes] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<"PERSONAL" | "KIOSK" | null>(null);
  const sales = useMemo(() => activeConfig ? state.sales.filter((sale) => sale.employeeId === employee?.id && sale.date >= activeConfig.periodStart && sale.date <= activeConfig.periodEnd).sort((a, b) => b.date.localeCompare(a.date)) : [], [activeConfig, employee?.id, state.sales]);
  const movements = activeConfig ? state.movements.filter((movement) => movement.employeeId === employee?.id && movement.periodStart === activeConfig.periodStart) : [];
  const decision = activeConfig ? state.decisions.find((item) => item.employeeId === employee?.id && item.periodStart === activeConfig.periodStart) : undefined;
  const latestSale = sales[0]?.amount ?? 0;
  const loanAdjustmentBalance = state.adjustments.filter((adjustment) => adjustment.employeeId === employee?.id && adjustment.status === "APPROVED" && (adjustment.type === "LOAN" || adjustment.type === "LOAN_PAYMENT")).reduce((sum, adjustment) => sum + (adjustment.type === "LOAN" ? adjustment.amount : -adjustment.amount), 0);
  const loanBalance = Math.max(0, state.loans.filter((loan) => loan.employeeId === employee?.id && loan.status === "APPROVED").reduce((sum, loan) => sum + Math.max(loan.amount - loan.amount / loan.installments * loan.paidInstallments, 0), 0) + loanAdjustmentBalance);
  const personalRequests = state.loans.filter((loan) => loan.employeeId === employee?.id).slice().reverse();
  const today = localIsoDate();
  const currentMonth = today.slice(0, 7);
  const managerTarget = state.kioskTargets.find((target) => target.branchId === employee?.branchId);
  const managerResolution = resolveBranchCommission({ branchId: employee?.branchId ?? "", month: currentMonth, schemes: state.branchCommissionSchemes, sales: state.kioskMonthlySales, fallbackTarget: managerTarget });
  const managesKioskCommission = managerResolution.managerId === employee?.id;
  const sellerAssignment = state.schemeAssignments.filter((assignment) => assignment.employeeId === employee?.id && assignment.effectiveFrom <= today).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const sellerScheme = state.schemes.find((scheme) => scheme.id === (sellerAssignment?.schemeId ?? employee?.schemeId));
  const personalMonthSales = state.sales.filter((sale) => sale.employeeId === employee?.id && sale.date >= `${currentMonth}-01` && sale.date <= today).reduce((sum, sale) => sum + sale.amount, 0);
  const currentSellerTier = sellerScheme?.tiers.find((tier) => personalMonthSales >= tier.from && (tier.to === null || personalMonthSales <= tier.to));
  const personalCommissionToDate = personalMonthSales * (currentSellerTier?.rate ?? 0);
  const managerCommissionToDate = managerResolution.salesBase * managerResolution.rate;
  const managerBranchIds = managerResolution.scheme?.branchIds ?? (employee?.branchId ? [employee.branchId] : []);
  const managerMonthlyTarget = managerResolution.combined
    ? state.kioskTargets.filter((item) => managerBranchIds.includes(item.branchId)).reduce((sum, item) => sum + item.monthlyTarget, 0)
    : managerTarget?.monthlyTarget ?? 0;
  const managerAchievement = managerMonthlyTarget > 0 ? managerResolution.salesBase / managerMonthlyTarget : 0;
  const closedMonthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(`${currentMonth}-01T12:00:00`));
  const closedMonthTitle = closedMonthLabel.charAt(0).toLocaleUpperCase("es-MX") + closedMonthLabel.slice(1);

  if (!employee) return null;
  if (!canViewPortal) return <div className="space-y-7"><header><div className="mb-2 flex items-center gap-2"><Badge variant="outline"><UserRound className="mr-1.5 h-3.5 w-3.5" />PORTAL PERSONAL</Badge></div><h1 className="page-title">Mi nómina</h1></header><Card className="border-dashed border-rose-300"><CardContent className="flex flex-col items-center px-6 py-16 text-center"><ShieldX className="h-10 w-10 text-rose-600" /><h2 className="mt-4 text-lg font-semibold">Este usuario no tiene acceso al portal personal</h2><p className="mt-2 max-w-lg text-sm text-[color:var(--text-muted)]">Un administrador debe habilitar el permiso “Entrar al portal personal” en Roles y accesos.</p></CardContent></Card></div>;
  if (!activeConfig || !activeRun || !line) return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><UserRound className="mr-1.5 h-3.5 w-3.5" />PORTAL PERSONAL</Badge><span className="text-xs text-[color:var(--text-muted)]">Información aislada por usuario</span></div><h1 className="page-title">Mi nómina</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Solo se muestra información cuando tu módulo tiene una nómina activa.</p></div><div className="w-full max-w-sm rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4"><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Sesión personal activa</p><p className="mt-1 font-semibold">{employee.name}</p><p className="text-xs text-[color:var(--text-muted)]">{activeRole?.name}</p></div></header>
      <Card className="border-dashed border-[color:var(--border-color)]"><CardContent className="flex flex-col items-center px-6 py-16 text-center"><CalendarCheck2 className="h-10 w-10 text-[color:var(--text-muted)]" /><h2 className="mt-4 text-lg font-semibold">No hay una nómina activa para mostrar</h2><p className="mt-2 max-w-lg text-sm text-[color:var(--text-muted)]">Tu información permanece oculta hasta que Nómina active el periodo correspondiente y genere la corrida de tu módulo.</p></CardContent></Card>
    </div>
  );
  const employeeId = employee.id;
  const activePeriodStart = activeConfig.periodStart;

  function authorizePayroll() {
    setDecision(employeeId, activePeriodStart, "AUTHORIZED", "NÓMINA VALIDADA POR EL EMPLEADO");
    toast.success("Tu conformidad quedó registrada.");
  }

  function requestClarification() {
    if (!clarification.trim()) {
      toast.error("Describe brevemente qué deseas aclarar.");
      return;
    }
    setDecision(employeeId, activePeriodStart, "CLARIFICATION", clarification.trim());
    setClarificationOpen(false);
    toast.info("Solicitud de aclaración enviada a nómina.");
  }

  function openFinancialRequest(type: "LOAN" | "ADVANCE") {
    setRequestType(type);
    setRequestAmount("");
    setRequestInstallments(type === "ADVANCE" ? "1" : "4");
    setRequestNotes("");
  }

  function submitFinancialRequest() {
    if (!requestType) return;
    const amount = Number(requestAmount);
    const installments = requestType === "ADVANCE" ? 1 : Number(requestInstallments);
    if (amount <= 0 || installments < 1 || installments > 24) {
      toast.error("Captura un monto válido y hasta 24 parcialidades.");
      return;
    }
    addLoan({
      employeeId,
      requestType,
      requestedAt: new Date().toISOString().slice(0, 10),
      amount,
      installments,
      firstPeriod: activePeriodStart,
      status: "PENDING",
      notes: `SOLICITUD DESDE MI PERFIL${requestNotes.trim() ? ` · ${requestNotes.trim()}` : ""}`,
    });
    toast.success(`${requestType === "ADVANCE" ? "Adelanto" : "Préstamo"} enviado a autorización.`);
    setRequestType(null);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><UserRound className="mr-1.5 h-3.5 w-3.5" />PORTAL PERSONAL</Badge><span className="text-xs text-[color:var(--text-muted)]">Información aislada por usuario</span></div><h1 className="page-title">Mi nómina</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Consulta tus ventas, bonos, deducciones y autoriza el cierre de tu periodo.</p></div><div className="w-full max-w-sm rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4"><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Sesión personal activa</p><p className="mt-1 font-semibold">{employee.name}</p><p className="text-xs text-[color:var(--text-muted)]">{activeRole?.name}</p></div></header>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#4f4a44] via-[#665b50] to-[#a88662] text-white shadow-xl"><CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr] lg:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ecd1c8]">{activeConfig.label}</p><h2 className="mt-3 font-brand text-3xl tracking-wide">{employee.name}</h2><p className="mt-1 text-sm text-white/70">{employee.position} · {state.branches.find((branch) => branch.id === employee.branchId)?.name}</p><div className="mt-7 flex flex-wrap gap-3">{decision?.status === "AUTHORIZED" ? <Badge className="border-emerald-300 bg-emerald-500/20 text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" />NÓMINA AUTORIZADA</Badge> : decision?.status === "CLARIFICATION" ? <Badge className="border-amber-300 bg-amber-500/20 text-white"><AlertCircle className="mr-1.5 h-4 w-4" />ACLARACIÓN ABIERTA</Badge> : <Badge className="border-white/25 bg-white/10 text-white">PENDIENTE DE TU REVISIÓN</Badge>}</div></div><div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"><p className="text-xs uppercase tracking-[0.16em] text-white/65">Total neto estimado</p><p className="number-display mt-2 text-4xl">{money.format(line.total)}</p><p className="mt-2 text-xs text-white/65">Cuenta {employee.bank} · {employee.account}</p></div></CardContent></Card>
      {managesKioskCommission && <Card className="overflow-hidden border-[#b89468]/45 shadow-[0_18px_42px_rgba(57,43,31,0.09)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[linear-gradient(110deg,rgba(38,33,29,0.98),rgba(91,67,46,0.94))] text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><Badge className="border-emerald-300/55 bg-emerald-500/15 text-white"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />MES CERRADO · SIMULACIÓN</Badge><span className="text-[10px] uppercase tracking-[0.14em] text-white/60">{closedMonthTitle}</span></div><CardTitle className="mt-3 font-serif text-2xl font-medium tracking-wide text-white">Tus dos recibos del cierre</CardTitle><CardDescription className="mt-1 text-white/65">La nómina personal y la comisión gerencial permanecen separadas para revisión y autorización.</CardDescription></div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-right"><p className="text-[9px] uppercase tracking-[0.14em] text-white/55">Cierre simulado</p><p className="mt-1 text-sm font-semibold">{activeConfig.periodEnd}</p></div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 lg:grid-cols-2 lg:p-5">
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-hover)]"><ReceiptText className="h-4 w-4 text-[color:var(--text-secondary)]" /></span><Badge variant="outline">RECIBO 1</Badge></div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em]">Nómina personal</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Sueldo, venta personal, escala, movimientos y deducciones de la quincena.</p><div className="mt-4 flex items-end justify-between gap-4"><div><p className="label-caps">NETO A PAGAR</p><p className="number-display mt-1 text-2xl">{money.format(line.total)}</p></div><Button size="sm" variant="outline" onClick={() => setReceiptPreview("PERSONAL")}><Eye className="mr-2 h-4 w-4" />Ver recibo</Button></div></div>
          <div className="rounded-xl border border-[#b89468]/40 bg-[linear-gradient(145deg,rgba(195,165,131,0.14),rgba(255,255,255,0.45))] p-4 dark:bg-[linear-gradient(145deg,rgba(195,165,131,0.12),rgba(20,18,16,0.4))]"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#342b23] text-[#f0d9b8]"><Store className="h-4 w-4" /></span><Badge variant="outline" className="border-[#b89468]/55">RECIBO 2</Badge></div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em]">Comisión gerencial de kiosco</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{managerResolution.combined ? `${managerBranchIds.length} sucursales combinadas` : "Sucursal asignada"} · meta, ventas y escala mensual.</p><div className="mt-4 flex items-end justify-between gap-4"><div><p className="label-caps">COMISIÓN EXTRA</p><p className="number-display mt-1 text-2xl">{money.format(managerCommissionToDate)}</p></div><Button size="sm" onClick={() => setReceiptPreview("KIOSK")}><Eye className="mr-2 h-4 w-4" />Ver recibo</Button></div></div>
        </CardContent>
      </Card>}
      {managesKioskCommission && sellerScheme && <Card className="overflow-hidden border-[color:var(--accent)]/40"><CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="section-heading uppercase">Avance de doble comisión al día</CardTitle><CardDescription>Tu venta personal usa una escala de vendedor; la comisión de sucursal se cierra y entrega en un recibo gerencial adicional.</CardDescription></div><Badge variant="outline">CORTE {today}</Badge></div></CardHeader><CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"><div><p className="label-caps">VENTA PERSONAL</p><p className="number-display mt-2 text-2xl">{money.format(personalMonthSales)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Acumulada hasta hoy</p></div><div><p className="label-caps">ESCALA DE VENDEDOR</p><p className="number-display mt-2 text-2xl">{((currentSellerTier?.rate ?? 0) * 100).toFixed(1)}%</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{sellerScheme.name} · desde {money.format(currentSellerTier?.from ?? 0)}</p></div><div><p className="label-caps">COMISIÓN PERSONAL</p><p className="number-display mt-2 text-2xl text-emerald-700 dark:text-emerald-300">{money.format(personalCommissionToDate)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Incluida en tu nómina personal</p></div><div><p className="label-caps">AVANCE GERENCIAL</p><p className="number-display mt-2 text-2xl">{money.format(managerCommissionToDate)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{managerResolution.scheme?.name ?? "META INDIVIDUAL"} · recibo extra al cierre</p></div></CardContent></Card>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Card><CardContent className="p-5"><TrendingUp className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">VENTA TOTAL</p><p className="number-display mt-2 text-2xl">{money.format(line.sales)}</p></CardContent></Card><Card><CardContent className="p-5"><CalendarCheck2 className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">VENTA MÁS RECIENTE</p><p className="number-display mt-2 text-2xl">{money.format(latestSale)}</p></CardContent></Card><Card><CardContent className="p-5"><CircleDollarSign className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">COMISIÓN</p><p className="number-display mt-2 text-2xl">{money.format(line.commission)}</p></CardContent></Card><Card><CardContent className="p-5"><BadgeCheck className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">AJUSTES APROBADOS</p><p className="number-display mt-2 text-2xl">{money.format(line.externalAdditions - line.externalDeductions)}</p></CardContent></Card><Card><CardContent className="p-5"><Landmark className="h-5 w-5 text-rose-600" /><p className="label-caps mt-4">ADEUDO DE PRÉSTAMOS</p><p className="number-display mt-2 text-2xl">{money.format(loanBalance)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Visible solo en tu perfil</p></CardContent></Card></div>
      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="flex flex-col gap-4 border-b border-[color:var(--border-color)] lg:flex-row lg:items-center lg:justify-between">
          <div><CardTitle className="section-heading uppercase">Préstamos y adelantos</CardTitle><CardDescription>Solicita desde tu perfil; Administración deberá autorizar antes de afectar tu saldo.</CardDescription></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openFinancialRequest("ADVANCE")}><WalletCards className="mr-2 h-4 w-4" />Solicitar adelanto</Button><Button onClick={() => openFinancialRequest("LOAN")}><HandCoins className="mr-2 h-4 w-4" />Solicitar préstamo</Button></div>
        </CardHeader>
        <CardContent className="p-0">
          {personalRequests.length ? <Table><TableHeader><TableRow><TableHead>TIPO</TableHead><TableHead>FECHA</TableHead><TableHead className="text-right">MONTO</TableHead><TableHead>PLAZO</TableHead><TableHead>ESTATUS</TableHead></TableRow></TableHeader><TableBody>{personalRequests.slice(0, 5).map((request) => <TableRow key={request.id}><TableCell><Badge variant="outline">{request.requestType === "ADVANCE" ? "ADELANTO" : "PRÉSTAMO"}</Badge></TableCell><TableCell>{request.requestedAt}</TableCell><TableCell className="number-display text-right">{money.format(request.amount)}</TableCell><TableCell>{request.installments} {request.installments === 1 ? "PAGO" : "PARCIALIDADES"}</TableCell><TableCell><Badge variant="outline">{request.status}</Badge></TableCell></TableRow>)}</TableBody></Table> : <p className="p-8 text-center text-sm text-[color:var(--text-muted)]">Todavía no has enviado solicitudes.</p>}
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Mis ventas del periodo</CardTitle><CardDescription>Únicamente movimientos ligados a tu usuario.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>FECHA</TableHead><TableHead>SUCURSAL</TableHead><TableHead className="text-right">VENTA</TableHead></TableRow></TableHeader><TableBody>{sales.map((sale) => <TableRow key={sale.id}><TableCell>{sale.date}</TableCell><TableCell>{state.branches.find((branch) => branch.id === sale.branchId)?.name}</TableCell><TableCell className="number-display text-right">{money.format(sale.amount)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Mis bonos y multas</CardTitle><CardDescription>Revisa cada alta antes de aceptar el cierre.</CardDescription></CardHeader><CardContent className="space-y-3">{movements.length ? movements.map((movement) => <div key={movement.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Badge variant="outline">{movement.type === "BONUS" ? "BONO" : "MULTA"}</Badge><Badge variant="outline">{movement.status}</Badge></div><p className="mt-2 font-semibold">{movement.concept}</p><p className="text-xs text-[color:var(--text-muted)]">{movement.mode === "SCALE" ? `ACTIVO DESDE ${money.format(movement.threshold ?? 0)} EN VENTAS` : "MONTO FIJO"}</p></div><p className={`number-display ${movement.type === "FINE" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{movement.type === "FINE" ? "−" : "+"}{money.format(movement.amount)}</p></div>{movement.status === "PENDING" && <div className="mt-3 flex gap-2 border-t border-[color:var(--border-color)] pt-3"><Button size="sm" onClick={() => { setMovementStatus(movement.id, "APPROVED"); toast.success("Movimiento aceptado."); }}>Aceptar</Button><Button size="sm" variant="outline" onClick={() => setClarificationOpen(true)}>Solicitar aclaración</Button></div>}</div>) : <p className="rounded-xl border border-dashed border-[color:var(--border-color)] p-6 text-center text-sm text-[color:var(--text-muted)]">No hay bonos ni multas en esta quincena.</p>}</CardContent></Card>
      </div>
      <EmployeeViaticsPanel employeeId={employeeId} activePeriodStart={activePeriodStart} />
      <Card className="border-[color:var(--border-color)]"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">¿La información de tu nómina es correcta?</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">Tu respuesta quedará visible en el consolidado administrativo.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setClarificationOpen(true)}><MessageSquareText className="mr-2 h-4 w-4" />Solicitar aclaración</Button><Button onClick={authorizePayroll} disabled={decision?.status === "AUTHORIZED"}><CheckCircle2 className="mr-2 h-4 w-4" />{decision?.status === "AUTHORIZED" ? "Autorizada" : "Autorizar mi nómina"}</Button></div></CardContent></Card>
      <Dialog open={receiptPreview === "PERSONAL"} onOpenChange={(open) => { if (!open) setReceiptPreview(null); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Recibo 1 · Nómina personal</DialogTitle><DialogDescription>Documento quincenal independiente de la comisión gerencial.</DialogDescription></DialogHeader><Receipt line={line} periodStart={activeConfig.periodStart} periodEnd={activeConfig.periodEnd} /></DialogContent></Dialog>
      <Dialog open={receiptPreview === "KIOSK"} onOpenChange={(open) => { if (!open) setReceiptPreview(null); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Recibo 2 · Comisión gerencial de kiosco</DialogTitle><DialogDescription>Cierre mensual simulado, separado de la nómina personal.</DialogDescription></DialogHeader><div className="overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-xl"><div className="bg-[linear-gradient(135deg,#24211e,#5d4633)] px-6 py-5 text-white"><p className="font-brand text-xl tracking-[0.14em]">KEYSAR COSMETICS</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/60">Recibo mensual de comisión de kiosco</p></div><div className="space-y-5 p-6"><div className="flex items-start justify-between gap-4"><div><p className="label-caps">GERENTE RESPONSABLE</p><p className="mt-1 font-semibold">{employee.name}</p><p className="text-xs text-[color:var(--text-muted)]">{employee.position}</p></div><Badge variant="outline">{closedMonthTitle}</Badge></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[color:var(--accent-hover)]/40 p-3"><p className="label-caps">META</p><p className="number-display mt-1 text-lg">{money.format(managerMonthlyTarget)}</p></div><div className="rounded-xl bg-[color:var(--accent-hover)]/40 p-3"><p className="label-caps">VENTAS</p><p className="number-display mt-1 text-lg">{money.format(managerResolution.salesBase)}</p></div><div className="rounded-xl bg-[color:var(--accent-hover)]/40 p-3"><p className="label-caps">CUMPLIMIENTO</p><p className="number-display mt-1 text-lg">{(managerAchievement * 100).toFixed(1)}%</p></div></div><div className="space-y-2 text-sm"><div className="flex justify-between gap-4"><span>Esquema</span><strong>{managerResolution.scheme?.name ?? "META INDIVIDUAL"}</strong></div><div className="flex justify-between gap-4"><span>Escala aplicada</span><strong>{(managerResolution.rate * 100).toFixed(1)}%</strong></div><div className="flex justify-between gap-4"><span>Alcance</span><strong>{managerResolution.combined ? `${managerBranchIds.length} SUCURSALES` : "1 SUCURSAL"}</strong></div></div><div className="rounded-xl border border-[#b89468]/45 bg-[color:var(--accent-hover)]/35 p-4 text-right"><p className="label-caps">COMISIÓN EXTRA GERENCIAL</p><p className="number-display mt-1 text-3xl">{money.format(managerCommissionToDate)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Pago separado del recibo personal</p></div><div className="flex justify-end"><Button asChild><a href="/recibos-kiosco">Abrir detalle y autorización</a></Button></div></div></div></DialogContent></Dialog>
      <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar aclaración</DialogTitle><DialogDescription>Describe la venta, bono, multa o cálculo que deseas revisar.</DialogDescription></DialogHeader><div className="space-y-2 py-2"><Label htmlFor="clarification">Detalle</Label><Textarea id="clarification" value={clarification} onChange={(event) => setClarification(event.target.value)} placeholder="EJ. NO IDENTIFICO LA MULTA DEL 21 DE AGOSTO" /></div><DialogFooter><Button variant="outline" onClick={() => setClarificationOpen(false)}>Cancelar</Button><Button onClick={requestClarification}>Enviar solicitud</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(requestType)} onOpenChange={(open) => { if (!open) setRequestType(null); }}><DialogContent><DialogHeader><DialogTitle>{requestType === "ADVANCE" ? "Solicitar adelanto" : "Solicitar préstamo"}</DialogTitle><DialogDescription>La solicitud llegará pendiente al módulo de Préstamos y adelantos para su autorización.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="financial-request-amount">Monto solicitado</Label><Input id="financial-request-amount" type="number" min="0" step="0.01" value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} placeholder="0.00" /></div>{requestType === "LOAN" && <div className="space-y-2"><Label htmlFor="financial-request-installments">Parcialidades quincenales</Label><Input id="financial-request-installments" type="number" min="1" max="24" value={requestInstallments} onChange={(event) => setRequestInstallments(event.target.value)} /></div>}<div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 p-4"><p className="label-caps">CUOTA ESTIMADA</p><p className="number-display mt-1 text-xl">{money.format(Number(requestAmount || 0) / Math.max(requestType === "ADVANCE" ? 1 : Number(requestInstallments || 1), 1))}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Primera aplicación propuesta: {activeConfig.label}</p></div><div className="space-y-2"><Label htmlFor="financial-request-notes">Motivo o comentario</Label><Textarea id="financial-request-notes" value={requestNotes} onChange={(event) => setRequestNotes(event.target.value)} placeholder="DESCRIBE BREVEMENTE TU SOLICITUD" /></div></div><DialogFooter><Button variant="outline" onClick={() => setRequestType(null)}>Cancelar</Button><Button onClick={submitFinancialRequest}>Enviar a autorización</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
