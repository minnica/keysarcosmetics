"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, CalendarCheck2, CheckCircle2, CircleDollarSign, MessageSquareText, TrendingUp, UserRound } from "lucide-react";
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

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function EmployeePayrollPortalDemo() {
  const { state, currentPeriod, setActiveEmployee, payrollLines, setDecision, setMovementStatus } = usePayrollDemo();
  const employee = state.employees.find((item) => item.id === state.activeEmployeeId) ?? state.employees[0];
  const line = payrollLines(currentPeriod.start).find((item) => item.employee.id === employee?.id);
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarification, setClarification] = useState("");
  const sales = useMemo(() => state.sales.filter((sale) => sale.employeeId === employee?.id && sale.date >= currentPeriod.start && sale.date <= currentPeriod.end).sort((a, b) => b.date.localeCompare(a.date)), [currentPeriod.end, currentPeriod.start, employee?.id, state.sales]);
  const movements = state.movements.filter((movement) => movement.employeeId === employee?.id && movement.periodStart === currentPeriod.start);
  const decision = state.decisions.find((item) => item.employeeId === employee?.id && item.periodStart === currentPeriod.start);
  const latestSale = sales[0]?.amount ?? 0;

  if (!employee || !line) return null;
  const employeeId = employee.id;

  function authorizePayroll() {
    setDecision(employeeId, currentPeriod.start, "AUTHORIZED", "NÓMINA VALIDADA POR EL EMPLEADO");
    toast.success("Tu conformidad quedó registrada.");
  }

  function requestClarification() {
    if (!clarification.trim()) {
      toast.error("Describe brevemente qué deseas aclarar.");
      return;
    }
    setDecision(employeeId, currentPeriod.start, "CLARIFICATION", clarification.trim());
    setClarificationOpen(false);
    toast.info("Solicitud de aclaración enviada a nómina.");
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><UserRound className="mr-1.5 h-3.5 w-3.5" />PORTAL PERSONAL</Badge><span className="text-xs text-[color:var(--text-muted)]">Información aislada por usuario</span></div><h1 className="page-title">Mi nómina</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Consulta tus ventas, bonos, deducciones y autoriza el cierre de tu periodo.</p></div><div className="w-full max-w-sm space-y-2"><Label>Vista demo como</Label><Select value={employee.id} onValueChange={setActiveEmployee}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.employees.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><p className="text-[11px] text-[color:var(--text-muted)]">En producción este selector no existe: el acceso queda ligado al usuario.</p></div></header>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#4f4a44] via-[#665b50] to-[#a88662] text-white shadow-xl"><CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr] lg:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ecd1c8]">{currentPeriod.label}</p><h2 className="mt-3 font-brand text-3xl tracking-wide">{employee.name}</h2><p className="mt-1 text-sm text-white/70">{employee.position} · {state.branches.find((branch) => branch.id === employee.branchId)?.name}</p><div className="mt-7 flex flex-wrap gap-3">{decision?.status === "AUTHORIZED" ? <Badge className="border-emerald-300 bg-emerald-500/20 text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" />NÓMINA AUTORIZADA</Badge> : decision?.status === "CLARIFICATION" ? <Badge className="border-amber-300 bg-amber-500/20 text-white"><AlertCircle className="mr-1.5 h-4 w-4" />ACLARACIÓN ABIERTA</Badge> : <Badge className="border-white/25 bg-white/10 text-white">PENDIENTE DE TU REVISIÓN</Badge>}</div></div><div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"><p className="text-xs uppercase tracking-[0.16em] text-white/65">Total neto estimado</p><p className="number-display mt-2 text-4xl">{money.format(line.total)}</p><p className="mt-2 text-xs text-white/65">Cuenta {employee.bank} · {employee.account}</p></div></CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><CardContent className="p-5"><TrendingUp className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">VENTA TOTAL</p><p className="number-display mt-2 text-2xl">{money.format(line.sales)}</p></CardContent></Card><Card><CardContent className="p-5"><CalendarCheck2 className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">VENTA MÁS RECIENTE</p><p className="number-display mt-2 text-2xl">{money.format(latestSale)}</p></CardContent></Card><Card><CardContent className="p-5"><CircleDollarSign className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">COMISIÓN</p><p className="number-display mt-2 text-2xl">{money.format(line.commission)}</p></CardContent></Card><Card><CardContent className="p-5"><BadgeCheck className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">BONOS AUTORIZADOS</p><p className="number-display mt-2 text-2xl">{money.format(line.bonuses)}</p></CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Mis ventas del periodo</CardTitle><CardDescription>Únicamente movimientos ligados a tu usuario.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>FECHA</TableHead><TableHead>SUCURSAL</TableHead><TableHead className="text-right">VENTA</TableHead></TableRow></TableHeader><TableBody>{sales.map((sale) => <TableRow key={sale.id}><TableCell>{sale.date}</TableCell><TableCell>{state.branches.find((branch) => branch.id === sale.branchId)?.name}</TableCell><TableCell className="number-display text-right">{money.format(sale.amount)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Mis bonos y multas</CardTitle><CardDescription>Revisa cada alta antes de aceptar el cierre.</CardDescription></CardHeader><CardContent className="space-y-3">{movements.length ? movements.map((movement) => <div key={movement.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Badge variant="outline">{movement.type === "BONUS" ? "BONO" : "MULTA"}</Badge><Badge variant="outline">{movement.status}</Badge></div><p className="mt-2 font-semibold">{movement.concept}</p><p className="text-xs text-[color:var(--text-muted)]">{movement.mode === "SCALE" ? `ACTIVO DESDE ${money.format(movement.threshold ?? 0)} EN VENTAS` : "MONTO FIJO"}</p></div><p className={`number-display ${movement.type === "FINE" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{movement.type === "FINE" ? "−" : "+"}{money.format(movement.amount)}</p></div>{movement.status === "PENDING" && <div className="mt-3 flex gap-2 border-t border-[color:var(--border-color)] pt-3"><Button size="sm" onClick={() => { setMovementStatus(movement.id, "APPROVED"); toast.success("Movimiento aceptado."); }}>Aceptar</Button><Button size="sm" variant="outline" onClick={() => setClarificationOpen(true)}>Solicitar aclaración</Button></div>}</div>) : <p className="rounded-xl border border-dashed border-[color:var(--border-color)] p-6 text-center text-sm text-[color:var(--text-muted)]">No hay bonos ni multas en esta quincena.</p>}</CardContent></Card>
      </div>
      <Card className="border-[color:var(--border-color)]"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">¿La información de tu nómina es correcta?</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">Tu respuesta quedará visible en el consolidado administrativo.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setClarificationOpen(true)}><MessageSquareText className="mr-2 h-4 w-4" />Solicitar aclaración</Button><Button onClick={authorizePayroll} disabled={decision?.status === "AUTHORIZED"}><CheckCircle2 className="mr-2 h-4 w-4" />{decision?.status === "AUTHORIZED" ? "Autorizada" : "Autorizar mi nómina"}</Button></div></CardContent></Card>
      <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar aclaración</DialogTitle><DialogDescription>Describe la venta, bono, multa o cálculo que deseas revisar.</DialogDescription></DialogHeader><div className="space-y-2 py-2"><Label htmlFor="clarification">Detalle</Label><Textarea id="clarification" value={clarification} onChange={(event) => setClarification(event.target.value)} placeholder="EJ. NO IDENTIFICO LA MULTA DEL 21 DE AGOSTO" /></div><DialogFooter><Button variant="outline" onClick={() => setClarificationOpen(false)}>Cancelar</Button><Button onClick={requestClarification}>Enviar solicitud</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
