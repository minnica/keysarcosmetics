"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Edit3,
  FileCheck2,
  Plus,
  ReceiptText,
  Search,
  ShieldX,
  Trash2,
  Upload,
  WalletCards,
  XCircle,
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
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  type DemoViaticsConcept,
  type DemoViaticsEntry,
  type ViaticsEffect,
  type ViaticsStatus,
  payrollModuleForCategory,
  payrollModuleLabels,
  usePayrollDemo,
} from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const statusLabels: Record<ViaticsStatus, string> = { PENDING: "POR APROBAR", APPROVED: "APROBADO", REJECTED: "RECHAZADO" };

function ConceptDialog({ concept, open, onOpenChange }: { concept: DemoViaticsConcept | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addViaticsConcept, updateViaticsConcept } = usePayrollDemo();
  const [name, setName] = useState(concept?.name ?? "");
  const [effect, setEffect] = useState<ViaticsEffect>(concept?.effect ?? "ADD");
  const [maxAmount, setMaxAmount] = useState(String(concept?.maxAmount ?? ""));
  function submit() {
    const amount = Number(maxAmount);
    if (!name.trim() || amount <= 0) return toast.error("Captura nombre y monto máximo.");
    const input = { name: name.trim().toLocaleUpperCase("es-MX"), effect, maxAmount: amount, active: true };
    if (concept) updateViaticsConcept(concept.id, input); else addViaticsConcept(input);
    toast.success(concept ? "Concepto actualizado." : "Concepto de viático creado.");
    onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{concept ? "Editar concepto" : "Nuevo concepto de viático"}</DialogTitle><DialogDescription>Configura cualquier concepto permitido y si suma o descuenta en nómina.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="viatics-concept-name">Concepto</Label><Input id="viatics-concept-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. HOSPEDAJE" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Efecto en nómina</Label><Select value={effect} onValueChange={(value) => setEffect(value as ViaticsEffect)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADD">SUMA / REEMBOLSO</SelectItem><SelectItem value="DEDUCT">RESTA / REINTEGRO</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="viatics-max">Monto máximo</Label><Input id="viatics-max" type="number" min="0" step="0.01" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar concepto</Button></DialogFooter></DialogContent></Dialog>;
}

function EntryDialog({ entry, employeeId, open, onOpenChange }: { entry: DemoViaticsEntry | null; employeeId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, addViaticsEntry, updateViaticsEntry } = usePayrollDemo();
  const employee = state.employees.find((item) => item.id === employeeId);
  const allowed = state.viaticsConcepts.filter((concept) => concept.active && employee?.allowedViaticsConceptIds?.includes(concept.id));
  const [conceptId, setConceptId] = useState(entry?.conceptId ?? allowed[0]?.id ?? "");
  const [branchId, setBranchId] = useState(entry?.branchId ?? employee?.branchId ?? state.branches[0]?.id ?? "");
  const [requestedAt, setRequestedAt] = useState(entry?.requestedAt ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(String(entry?.amount ?? ""));
  const [comments, setComments] = useState(entry?.comments ?? "");
  const [receiptName, setReceiptName] = useState(entry?.receiptName ?? "");
  const selectedConcept = allowed.find((concept) => concept.id === conceptId) ?? state.viaticsConcepts.find((concept) => concept.id === conceptId);
  function submit() {
    const parsedAmount = Number(amount);
    if (!conceptId || !branchId || parsedAmount <= 0 || !comments.trim() || !receiptName) return toast.error("Completa concepto, sucursal, monto, detalle y comprobante.");
    if (selectedConcept && parsedAmount > selectedConcept.maxAmount) return toast.error(`El máximo permitido es ${money.format(selectedConcept.maxAmount)}.`);
    const input = { conceptId, branchId, requestedAt, amount: parsedAmount, comments: comments.trim().toLocaleUpperCase("es-MX"), receiptName };
    if (entry) updateViaticsEntry(entry.id, input); else addViaticsEntry({ ...input, employeeId });
    toast.success(entry ? "Viático actualizado y enviado nuevamente a revisión." : "Viático enviado a revisión.");
    onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{entry ? "Editar viático" : "Registrar viático"}</DialogTitle><DialogDescription>Captura manualmente el gasto y adjunta el nombre del comprobante en esta demo frontend.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Concepto permitido</Label><Select value={conceptId} onValueChange={setConceptId}><SelectTrigger><SelectValue placeholder="SELECCIONA CONCEPTO" /></SelectTrigger><SelectContent>{allowed.map((concept) => <SelectItem key={concept.id} value={concept.id}>{concept.name} · MÁX. {money.format(concept.maxAmount)}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Sucursal que asume el costo</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="viatics-date">Fecha del movimiento</Label><Input id="viatics-date" type="date" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="viatics-amount">Monto</Label><Input id="viatics-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="viatics-comments">Detalle</Label><Textarea id="viatics-comments" value={comments} onChange={(event) => setComments(event.target.value)} placeholder="MOTIVO DEL GASTO" /></div><div className="space-y-2"><Label htmlFor="viatics-receipt"><Upload className="mr-1 inline h-4 w-4" />Comprobante</Label><Input id="viatics-receipt" type="file" accept="image/*,.pdf" onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? "")} />{receiptName && <p className="text-xs text-emerald-700 dark:text-emerald-300"><FileCheck2 className="mr-1 inline h-4 w-4" />{receiptName}</p>}</div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Enviar viático</Button></DialogFooter></DialogContent></Dialog>;
}

function ApproveDialog({ entry, open, onOpenChange }: { entry: DemoViaticsEntry; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, setViaticsEntryStatus } = usePayrollDemo();
  const employee = state.employees.find((item) => item.id === entry.employeeId);
  const module = employee ? payrollModuleForCategory(employee.category) : "FIXED";
  const runs = state.runs.filter((run) => run.module === module);
  const [runId, setRunId] = useState(runs[0]?.id ?? "");
  function approve() {
    if (!runId) return toast.error("Selecciona la nómina que recibirá el movimiento.");
    setViaticsEntryStatus(entry.id, "APPROVED", runId);
    toast.success("Viático aprobado: nómina, recibo y costo por sucursal actualizados.");
    onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Aceptar y cargar a nómina</DialogTitle><DialogDescription>Elige la corrida vigente donde este viático sumará o restará.</DialogDescription></DialogHeader><div className="space-y-2 py-3"><Label>Nómina destino</Label><Select value={runId} onValueChange={setRunId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{runs.map((run) => <SelectItem key={run.id} value={run.id}>{payrollModuleLabels[run.module]} · {run.periodStart} — {run.periodEnd}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={approve}><CheckCircle2 className="mr-2 h-4 w-4" />Aceptar y aplicar</Button></DialogFooter></DialogContent></Dialog>;
}

export function EmployeeViaticsPanel({ employeeId, activePeriodStart }: { employeeId: string; activePeriodStart: string }) {
  const { state } = usePayrollDemo();
  const employee = state.employees.find((item) => item.id === employeeId);
  const [open, setOpen] = useState(false);
  if (!employee?.viaticsEnabled) return null;
  const allowed = state.viaticsConcepts.filter((concept) => employee.allowedViaticsConceptIds?.includes(concept.id));
  const history = state.viaticsEntries.filter((entry) => entry.employeeId === employeeId && (entry.periodStart === activePeriodStart || entry.status === "PENDING"));
  return <Card className="border-[color:var(--border-color)]"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="section-heading uppercase">Mis viáticos</CardTitle><CardDescription>Solo conceptos permitidos y movimientos de la nómina vigente.</CardDescription></div><Button onClick={() => setOpen(true)} disabled={!allowed.length}><Plus className="mr-2 h-4 w-4" />Agregar viático</Button></div></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{allowed.map((concept) => <Badge key={concept.id} variant="outline">{concept.name} · {concept.effect === "ADD" ? "+" : "−"}{money.format(concept.maxAmount)} MÁX.</Badge>)}</div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>FECHA</TableHead><TableHead>CONCEPTO</TableHead><TableHead>SUCURSAL</TableHead><TableHead>COMPROBANTE</TableHead><TableHead className="text-right">MONTO</TableHead><TableHead>ESTATUS</TableHead></TableRow></TableHeader><TableBody>{history.length ? history.map((entry) => { const concept = state.viaticsConcepts.find((item) => item.id === entry.conceptId); return <TableRow key={entry.id}><TableCell>{entry.requestedAt}</TableCell><TableCell>{concept?.name}</TableCell><TableCell>{state.branches.find((branch) => branch.id === entry.branchId)?.name}</TableCell><TableCell>{entry.receiptName}</TableCell><TableCell className="number-display text-right">{concept?.effect === "DEDUCT" ? "−" : "+"}{money.format(entry.amount)}</TableCell><TableCell><Badge variant="outline">{statusLabels[entry.status]}</Badge></TableCell></TableRow>; }) : <TableRow><TableCell colSpan={6} className="h-24 text-center text-[color:var(--text-muted)]">Sin viáticos en la nómina vigente.</TableCell></TableRow>}</TableBody></Table></div></CardContent><EntryDialog entry={null} employeeId={employeeId} open={open} onOpenChange={setOpen} /></Card>;
}

export function PayrollViaticsDemo() {
  const { state, deleteViaticsConcept, deleteViaticsEntry, setViaticsEntryStatus } = usePayrollDemo();
  const activeEmployee = state.employees.find((employee) => employee.id === state.activeEmployeeId);
  const activeRole = state.roles.find((role) => role.id === activeEmployee?.roleId);
  const isMaster = activeRole?.id === "role-admin" && activeRole.permissions.includes("viatics.master");
  const [conceptEditor, setConceptEditor] = useState<DemoViaticsConcept | "new" | null>(null);
  const [entryEditor, setEntryEditor] = useState<DemoViaticsEntry | null>(null);
  const [approving, setApproving] = useState<DemoViaticsEntry | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<ViaticsStatus | "ALL">("ALL");
  const rows = useMemo(() => state.viaticsEntries.filter((entry) => { const employee = state.employees.find((item) => item.id === entry.employeeId); const query = search.trim().toLocaleLowerCase("es-MX"); return (!query || employee?.name.toLocaleLowerCase("es-MX").includes(query)) && (!date || entry.requestedAt === date) && (status === "ALL" || entry.status === status); }).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)), [date, search, state.employees, state.viaticsEntries, status]);
  if (!isMaster) return <div className="space-y-7"><header><h1 className="page-title">Viáticos</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Configuración administrativa.</p></header><Card className="border-dashed border-amber-300"><CardContent className="flex flex-col items-center px-6 py-16 text-center"><ShieldX className="h-10 w-10 text-amber-600" /><h2 className="mt-4 text-lg font-semibold">Acceso exclusivo para usuario master</h2><p className="mt-2 text-sm text-[color:var(--text-muted)]">Los empleados habilitados capturan sus viáticos únicamente desde el Portal personal.</p></CardContent></Card></div>;
  const approved = state.viaticsEntries.filter((entry) => entry.status === "APPROVED");
  const approvedAmount = approved.reduce((sum, entry) => sum + entry.amount, 0);
  const pendingAmount = state.viaticsEntries.filter((entry) => entry.status === "PENDING").reduce((sum, entry) => sum + entry.amount, 0);
  const branchTotals = state.branches.map((branch) => ({ branch, total: approved.filter((entry) => entry.branchId === branch.id).reduce((sum, entry) => sum + entry.amount, 0) }));
  const maxBranch = Math.max(...branchTotals.map((item) => item.total), 1);
  return <div className="space-y-7"><header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">USUARIO MASTER</Badge><span className="text-xs text-[color:var(--text-muted)]">Configuración y autorización</span></div><h1 className="page-title">Viáticos</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Conceptos permitidos, comprobantes, historial y distribución automática del costo por sucursal.</p></div><Button onClick={() => setConceptEditor("new")}><Plus className="mr-2 h-4 w-4" />Nuevo concepto</Button></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><CardContent className="p-5"><ReceiptText className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">MOVIMIENTOS</p><p className="number-display mt-2 text-2xl">{state.viaticsEntries.length}</p></CardContent></Card><Card><CardContent className="p-5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">APROBADOS</p><p className="number-display mt-2 text-2xl">{money.format(approvedAmount)}</p></CardContent></Card><Card><CardContent className="p-5"><WalletCards className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">POR APROBAR</p><p className="number-display mt-2 text-2xl">{money.format(pendingAmount)}</p></CardContent></Card><Card><CardContent className="p-5"><FileCheck2 className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">CON COMPROBANTE</p><p className="number-display mt-2 text-2xl">{state.viaticsEntries.filter((entry) => entry.receiptName).length}</p></CardContent></Card></div><div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]"><Card><CardHeader><CardTitle>Conceptos configurados</CardTitle><CardDescription>Disponibles para asignar al activar viáticos en un esquema.</CardDescription></CardHeader><CardContent className="space-y-2">{state.viaticsConcepts.map((concept) => <div key={concept.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border-color)] p-3"><div><strong>{concept.name}</strong><p className="text-xs text-[color:var(--text-muted)]">{concept.effect === "ADD" ? "SUMA" : "RESTA"} · MÁXIMO {money.format(concept.maxAmount)}</p></div><div className="flex"><Button size="icon" variant="ghost" aria-label={`Editar ${concept.name}`} onClick={() => setConceptEditor(concept)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Borrar ${concept.name}`} onClick={() => { deleteViaticsConcept(concept.id); toast.info("Concepto eliminado del mock."); }}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Costo por sucursal</CardTitle><CardDescription>La sucursal elegida recibe el movimiento aprobado.</CardDescription></CardHeader><CardContent className="space-y-5">{branchTotals.map(({ branch, total }) => <div key={branch.id}><div className="mb-2 flex justify-between text-sm"><strong>{branch.name}</strong><span className="number-display">{money.format(total)}</span></div><div className="h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]" style={{ width: `${Math.max(total / maxBranch * 100, total ? 4 : 0)}%` }} /></div></div>)}</CardContent></Card></div><Card className="overflow-hidden"><CardHeader><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><CardTitle>Historial general</CardTitle><CardDescription>Busca por fecha o nombre del vendedor y administra cada comprobante.</CardDescription></div><div className="grid gap-2 sm:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[color:var(--text-muted)]" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="VENDEDOR" /></div><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><Select value={status} onValueChange={(value) => setStatus(value as ViaticsStatus | "ALL")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">TODOS</SelectItem><SelectItem value="PENDING">POR APROBAR</SelectItem><SelectItem value="APPROVED">APROBADOS</SelectItem><SelectItem value="REJECTED">RECHAZADOS</SelectItem></SelectContent></Select></div></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>FECHA / VENDEDOR</TableHead><TableHead>CONCEPTO</TableHead><TableHead>SUCURSAL</TableHead><TableHead>COMPROBANTE</TableHead><TableHead>NÓMINA</TableHead><TableHead className="text-right">MONTO</TableHead><TableHead>ESTATUS</TableHead><TableHead className="text-right">ACCIONES</TableHead></TableRow></TableHeader><TableBody>{rows.map((entry) => { const employee = state.employees.find((item) => item.id === entry.employeeId); const concept = state.viaticsConcepts.find((item) => item.id === entry.conceptId); return <TableRow key={entry.id}><TableCell><strong>{entry.requestedAt}</strong><p className="text-xs text-[color:var(--text-muted)]">{employee?.name}</p></TableCell><TableCell>{concept?.name}</TableCell><TableCell>{state.branches.find((branch) => branch.id === entry.branchId)?.name}</TableCell><TableCell className="text-xs">{entry.receiptName}</TableCell><TableCell>{entry.payrollModule ? payrollModuleLabels[entry.payrollModule] : "SIN ASIGNAR"}</TableCell><TableCell className={`number-display text-right ${concept?.effect === "DEDUCT" ? "text-rose-700" : "text-emerald-700"}`}>{concept?.effect === "DEDUCT" ? "−" : "+"}{money.format(entry.amount)}</TableCell><TableCell><Badge variant="outline">{statusLabels[entry.status]}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Editar viático" onClick={() => setEntryEditor(entry)}><Edit3 className="h-4 w-4" /></Button>{entry.status === "PENDING" && <Button size="icon" variant="outline" aria-label="Aceptar viático" onClick={() => setApproving(entry)}><Check className="h-4 w-4 text-emerald-600" /></Button>}<Button size="icon" variant="ghost" aria-label="Rechazar viático" onClick={() => setViaticsEntryStatus(entry.id, "REJECTED")}><XCircle className="h-4 w-4 text-amber-600" /></Button><Button size="icon" variant="ghost" aria-label="Borrar viático" onClick={() => { deleteViaticsEntry(entry.id); toast.info("Registro eliminado del mock."); }}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>{conceptEditor && <ConceptDialog key={conceptEditor === "new" ? "new" : conceptEditor.id} concept={conceptEditor === "new" ? null : conceptEditor} open onOpenChange={(next) => { if (!next) setConceptEditor(null); }} />}{entryEditor && <EntryDialog key={entryEditor.id} entry={entryEditor} employeeId={entryEditor.employeeId} open onOpenChange={(next) => { if (!next) setEntryEditor(null); }} />}{approving && <ApproveDialog key={approving.id} entry={approving} open onOpenChange={(next) => { if (!next) setApproving(null); }} />}</div>;
}
