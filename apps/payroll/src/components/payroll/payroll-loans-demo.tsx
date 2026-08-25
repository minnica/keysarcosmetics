"use client";

import { useState } from "react";
import { CheckCircle2, Edit3, History, Landmark, Plus, Trash2, WalletCards } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import { type DemoLoan, usePayrollDemo } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function LoanDialog({ loan, open, onOpenChange }: { loan: DemoLoan | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, currentPeriod, addLoan, updateLoan } = usePayrollDemo();
  const [employeeId, setEmployeeId] = useState(loan?.employeeId ?? state.employees[0]?.id ?? "");
  const [amount, setAmount] = useState(String(loan?.amount ?? ""));
  const [installments, setInstallments] = useState(String(loan?.installments ?? 4));
  const [notes, setNotes] = useState(loan?.notes ?? "");

  function submit() {
    const parsedAmount = Number(amount);
    const parsedInstallments = Number(installments);
    if (!employeeId || parsedAmount <= 0 || parsedInstallments < 1 || parsedInstallments > 24) {
      toast.error("Captura un monto y entre 1 y 24 pagos.");
      return;
    }
    if (loan) {
      updateLoan(loan.id, { amount: parsedAmount, installments: parsedInstallments, notes });
      toast.success("Préstamo editado; el saldo y las cuotas fueron recalculados.");
    } else {
      addLoan({ employeeId, requestedAt: new Date().toISOString().slice(0, 10), amount: parsedAmount, installments: parsedInstallments, firstPeriod: currentPeriod.start, status: "PENDING", notes });
      toast.success("Solicitud creada y enviada a autorización.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{loan ? "Editar préstamo" : "Nueva solicitud"}</DialogTitle><DialogDescription>Las cuotas se arrastran automáticamente entre quincenas hasta liquidar el saldo.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={setEmployeeId} disabled={Boolean(loan)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="loan-amount">Monto solicitado</Label><Input id="loan-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="loan-installments">Pagos quincenales</Label><Input id="loan-installments" type="number" min="1" max="24" value={installments} onChange={(event) => setInstallments(event.target.value)} /></div></div>
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 p-4"><p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">Cuota estimada</p><p className="number-display mt-1 text-xl">{money.format(Number(amount || 0) / Math.max(Number(installments || 1), 1))}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Primera aplicación: {currentPeriod.label}</p></div>
          <div className="space-y-2"><Label htmlFor="loan-notes">Motivo / notas</Label><Textarea id="loan-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="DETALLE DE LA SOLICITUD" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>{loan ? "Guardar cambios" : "Crear solicitud"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ loan, open, onOpenChange }: { loan: DemoLoan | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!loan) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Historial del préstamo</DialogTitle><DialogDescription>Bitácora mock vinculada al empleado y visible en todos los módulos.</DialogDescription></DialogHeader><div className="space-y-3 py-2">{loan.history.slice().reverse().map((item) => <div key={item.id} className="flex gap-3 rounded-xl border border-[color:var(--border-color)] p-4"><span className="rounded-full bg-[color:var(--accent-hover)] p-2"><History className="h-4 w-4 text-[color:var(--text-secondary)]" /></span><div><p className="text-sm font-semibold">{item.action}</p><p className="text-xs text-[color:var(--text-muted)]">{item.date} · {item.by}</p></div></div>)}</div></DialogContent></Dialog>;
}

export function PayrollLoansDemo() {
  const { state, deleteLoan, setLoanStatus } = usePayrollDemo();
  const [editing, setEditing] = useState<DemoLoan | null | "new">(null);
  const [history, setHistory] = useState<DemoLoan | null>(null);
  const [deleting, setDeleting] = useState<DemoLoan | null>(null);
  const totalBalance = state.loans.filter((loan) => loan.status === "APPROVED").reduce((sum, loan) => sum + loan.amount - loan.amount / loan.installments * loan.paidInstallments, 0);
  const pending = state.loans.filter((loan) => loan.status === "PENDING").length;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">DEMO FRONTEND</Badge><span className="text-xs text-[color:var(--text-muted)]">Arrastre quincenal</span></div><h1 className="page-title">Préstamos y adelantos</h1><p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">Solicitudes, autorización, saldo, cuotas e historial por empleado.</p></div><Button onClick={() => setEditing("new")}><Plus className="mr-2 h-4 w-4" />Nueva solicitud</Button></header>
      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><Landmark className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">SALDO VIGENTE</p><p className="number-display mt-2 text-2xl">{money.format(totalBalance)}</p></CardContent></Card><Card><CardContent className="p-5"><WalletCards className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">SOLICITUDES</p><p className="number-display mt-2 text-2xl">{state.loans.length}</p></CardContent></Card><Card><CardContent className="p-5"><CheckCircle2 className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">POR AUTORIZAR</p><p className="number-display mt-2 text-2xl">{pending}</p></CardContent></Card></div>
      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Control de préstamos</CardTitle><CardDescription>Editar, borrar o autorizar impacta el consolidado y el recibo del empleado.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>EMPLEADO</TableHead><TableHead>SOLICITUD</TableHead><TableHead className="text-right">MONTO</TableHead><TableHead>PLAN</TableHead><TableHead className="text-right">SALDO</TableHead><TableHead>ESTATUS</TableHead><TableHead className="text-right">ACCIONES</TableHead></TableRow></TableHeader><TableBody>{state.loans.map((loan) => { const employee = state.employees.find((item) => item.id === loan.employeeId); const balance = loan.amount - loan.amount / loan.installments * loan.paidInstallments; return <TableRow key={loan.id}><TableCell className="font-semibold">{employee?.name}</TableCell><TableCell>{loan.requestedAt}<p className="text-xs text-[color:var(--text-muted)]">{loan.notes || "SIN NOTAS"}</p></TableCell><TableCell className="number-display text-right">{money.format(loan.amount)}</TableCell><TableCell>{loan.paidInstallments} / {loan.installments}<p className="text-xs text-[color:var(--text-muted)]">{money.format(loan.amount / loan.installments)} / QUINCENA</p></TableCell><TableCell className="number-display text-right">{money.format(balance)}</TableCell><TableCell><Badge variant="outline">{loan.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Ver historial" onClick={() => setHistory(loan)}><History className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Editar préstamo" onClick={() => setEditing(loan)}><Edit3 className="h-4 w-4" /></Button>{loan.status === "PENDING" && <Button size="sm" onClick={() => { setLoanStatus(loan.id, "APPROVED"); toast.success("Préstamo autorizado y agregado al arrastre."); }}>Autorizar</Button>}<Button size="icon" variant="ghost" aria-label="Borrar préstamo" onClick={() => setDeleting(loan)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>
      <LoanDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} loan={editing === "new" ? null : editing} open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} />
      <HistoryDialog loan={history} open={Boolean(history)} onOpenChange={(open) => { if (!open) setHistory(null); }} />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Borrar esta solicitud?</AlertDialogTitle><AlertDialogDescription>La acción elimina el préstamo del mock y deja de afectar consolidado, saldos y recibos. Solo se permite aquí para demostrar el botón solicitado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleting) { deleteLoan(deleting.id); toast.success("Solicitud eliminada de todos los módulos."); setDeleting(null); } }} className="bg-rose-600 text-white hover:bg-rose-700">Borrar solicitud</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

