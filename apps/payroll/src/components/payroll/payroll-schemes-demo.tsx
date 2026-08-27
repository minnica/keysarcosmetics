"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, History, Layers3, Pencil, Percent, Plus, RefreshCw, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
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
  toast,
} from "@cosmetics/ui";
import { type DemoScheme, type DemoSchemeAssignment, usePayrollDemo } from "./payroll-demo-context";
import { CommissionScaleEditor, scaleLevelsFromTiers, scaleLevelsToTiers } from "./commission-scale-editor";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const displayDate = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function formatDate(value?: string) {
  return value ? displayDate.format(new Date(`${value}T00:00:00Z`)).toLocaleUpperCase("es-MX") : "SIN FECHA";
}

function SchemeEditorDialog({ scheme, open, onOpenChange }: { scheme: DemoScheme | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addScheme, updateScheme } = usePayrollDemo();
  const [name, setName] = useState(scheme?.name ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(scheme?.effectiveFrom ?? new Date().toISOString().slice(0, 10));
  const [attempted, setAttempted] = useState(false);
  const [levels, setLevels] = useState(() => scaleLevelsFromTiers(scheme?.tiers, [
    { upperLimit: "29999.99", rate: "4" },
    { upperLimit: "49999.99", rate: "6" },
    { upperLimit: "", rate: "8" },
  ]));

  function submit() {
    setAttempted(true);
    const tiers = scaleLevelsToTiers(levels, 100);
    if (!name.trim() || !effectiveFrom || !tiers) {
      toast.error("Revisa el nombre, los cortes y los porcentajes.");
      return;
    }
    if (scheme) {
      updateScheme(scheme.id, name.trim(), tiers, effectiveFrom);
      toast.success("Esquema actualizado en vendedores y nómina.");
    } else {
      addScheme(name.trim(), tiers, effectiveFrom);
      toast.success("Nuevo tipo de esquema registrado.");
    }
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{scheme ? "Editar esquema" : "Nuevo esquema"}</DialogTitle><DialogDescription>Define la comisión que corresponde según las ventas del periodo.</DialogDescription></DialogHeader><div className="space-y-5 py-2"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="standalone-scheme-name">Nombre del esquema</Label><Input id="standalone-scheme-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. COMISIÓN ESTÁNDAR" aria-invalid={attempted && !name.trim()} />{attempted && !name.trim() && <p className="text-xs text-rose-600">Escribe un nombre para identificar el esquema.</p>}</div><div className="space-y-2"><Label htmlFor="standalone-scheme-effective"><CalendarDays className="mr-1 inline h-4 w-4" />Vigente desde</Label><Input id="standalone-scheme-effective" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} aria-invalid={attempted && !effectiveFrom} /><p className="text-xs text-[color:var(--text-muted)]">El esquema solo afectará periodos que incluyan esta fecha o sean posteriores.</p></div></div><CommissionScaleEditor levels={levels} onChange={setLevels} maxRate={100} description="Define los rangos de venta y el porcentaje que recibirá el vendedor en cada nivel." /></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>{scheme ? "Guardar nueva versión" : "Crear esquema"}</Button></DialogFooter></DialogContent></Dialog>;
}

function SchemeAssignmentDialog({ open, onOpenChange, initialEmployeeId }: { open: boolean; onOpenChange: (open: boolean) => void; initialEmployeeId?: string | undefined }) {
  const { state, currentPeriod, assignScheme, setEmployeeViatics } = usePayrollDemo();
  const sellers = state.employees.filter((employee) => employee.category === "SELLER" || employee.category === "CONTRACTOR");
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? sellers[0]?.id ?? "");
  const employee = sellers.find((item) => item.id === employeeId);
  const currentAssignment = state.schemeAssignments.filter((item) => item.employeeId === employeeId && item.effectiveFrom <= currentPeriod.end).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const [schemeId, setSchemeId] = useState(currentAssignment?.schemeId ?? employee?.schemeId ?? state.schemes[0]?.id ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(currentPeriod.start);
  const [viaticsEnabled, setViaticsEnabled] = useState(employee?.viaticsEnabled ?? false);
  const [conceptIds, setConceptIds] = useState<string[]>(employee?.allowedViaticsConceptIds ?? []);
  function submit() {
    if (!employeeId || !schemeId) return;
    assignScheme(employeeId, schemeId, effectiveFrom);
    setEmployeeViatics(employeeId, viaticsEnabled, conceptIds);
    toast.success(`Cambio de esquema programado desde ${effectiveFrom}; los periodos anteriores se conservan.`);
    onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{currentAssignment ? "Cambiar esquema" : "Asignar esquema a vendedor"}</DialogTitle><DialogDescription>El cambio solo afectará la nómina que incluya la fecha seleccionada y los periodos posteriores.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Vendedor</Label><Select value={employeeId} onValueChange={(id) => { const nextEmployee = sellers.find((item) => item.id === id); const nextAssignment = state.schemeAssignments.filter((item) => item.employeeId === id && item.effectiveFrom <= currentPeriod.end).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]; setEmployeeId(id); setSchemeId(nextAssignment?.schemeId ?? nextEmployee?.schemeId ?? state.schemes[0]?.id ?? ""); setViaticsEnabled(nextEmployee?.viaticsEnabled ?? false); setConceptIds(nextEmployee?.allowedViaticsConceptIds ?? []); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sellers.map((seller) => <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Tipo de esquema</Label><Select value={schemeId} onValueChange={setSchemeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.schemes.filter((scheme) => scheme.active).map((scheme) => <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="scheme-effective-from"><CalendarDays className="mr-1 inline h-4 w-4" />Vigente desde</Label><Input id="scheme-effective-from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></div></div><div className="rounded-lg border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 p-3 text-xs"><strong>Protección de historial:</strong> las nóminas cuyo periodo termine antes de {effectiveFrom} conservarán su esquema anterior.</div><button type="button" role="switch" aria-checked={viaticsEnabled} onClick={() => { const next = !viaticsEnabled; setViaticsEnabled(next); if (!next) setConceptIds([]); }} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${viaticsEnabled ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)]"}`}><span><strong className="block">¿Puede registrar viáticos?</strong><span className="text-xs text-[color:var(--text-muted)]">Si está desactivado, el botón no aparecerá en su portal.</span></span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${viaticsEnabled ? "bg-emerald-600 text-white" : "bg-[color:var(--accent-hover)]"}`}>{viaticsEnabled ? "SÍ" : "NO"}</span></button>{viaticsEnabled && <div className="space-y-2"><Label>Conceptos permitidos</Label><div className="grid gap-2 sm:grid-cols-2">{state.viaticsConcepts.filter((concept) => concept.active).map((concept) => { const selected = conceptIds.includes(concept.id); return <button key={concept.id} type="button" onClick={() => setConceptIds((current) => selected ? current.filter((id) => id !== concept.id) : [...current, concept.id])} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${selected ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)]"}`}>{concept.name}<span className="block font-normal text-[color:var(--text-muted)]">HASTA {money.format(concept.maxAmount)}</span></button>; })}</div></div>}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>{currentAssignment ? "Registrar cambio" : "Aplicar asignación"}</Button></DialogFooter></DialogContent></Dialog>;
}

function AssignmentHistoryDialog({ assignment, open, onOpenChange }: { assignment: DemoSchemeAssignment; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, updateSchemeAssignment } = usePayrollDemo();
  const [schemeId, setSchemeId] = useState(assignment.schemeId);
  const [effectiveFrom, setEffectiveFrom] = useState(assignment.effectiveFrom);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Editar vigencia de asignación</DialogTitle><DialogDescription>Ajusta la fecha o esquema de esta vigencia. Las asignaciones anteriores permanecen registradas.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><div className="space-y-2"><Label>Esquema</Label><Select value={schemeId} onValueChange={setSchemeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.schemes.map((scheme) => <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="history-effective-from">Vigente desde</Label><Input id="history-effective-from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => { updateSchemeAssignment(assignment.id, schemeId, effectiveFrom); toast.success("Vigencia actualizada sin eliminar el historial."); onOpenChange(false); }}>Guardar vigencia</Button></DialogFooter></DialogContent></Dialog>;
}

export function PayrollSchemesDemo() {
  const { state, currentPeriod, deleteScheme } = usePayrollDemo();
  const [editing, setEditing] = useState<DemoScheme | null | "new">(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState<string | undefined>(undefined);
  const [editingAssignment, setEditingAssignment] = useState<DemoSchemeAssignment | null>(null);
  const [deleting, setDeleting] = useState<DemoScheme | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const sellers = state.employees.filter((employee) => employee.category === "SELLER" || employee.category === "CONTRACTOR");
  const activeSchemes = state.schemes.filter((scheme) => scheme.active);
  const assignmentFor = (employeeId: string, date = currentPeriod.end) => state.schemeAssignments.filter((assignment) => assignment.employeeId === employeeId && assignment.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const currentAssignments = sellers.map((seller) => ({ seller, assignment: assignmentFor(seller.id) })).filter((item) => item.assignment);
  const filteredSchemes = useMemo(() => activeSchemes.filter((scheme) => scheme.name.toLocaleLowerCase("es-MX").includes(search.trim().toLocaleLowerCase("es-MX"))), [activeSchemes, search]);
  const displayedSchemes = pageSize === "ALL" ? filteredSchemes : filteredSchemes.slice(0, Number(pageSize));
  const maximumRate = Math.max(...activeSchemes.flatMap((scheme) => scheme.tiers.map((tier) => tier.rate)), 0);
  const distribution = activeSchemes.map((scheme) => ({ scheme, count: currentAssignments.filter((item) => item.assignment?.schemeId === scheme.id).length }));
  const maxDistribution = Math.max(...distribution.map((item) => item.count), 1);
  const history = [...state.schemeAssignments].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  function openAssignment(employeeId?: string) {
    setAssignmentEmployeeId(employeeId);
    setAssignmentOpen(true);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">SUBMENÚ INDEPENDIENTE</Badge><span className="text-xs text-[color:var(--text-muted)]">Vigencias protegidas por periodo</span></div><h1 className="page-title">Esquemas de comisión</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Cada cambio conserva el esquema utilizado por las nóminas y periodos anteriores.</p></div><div className="flex flex-wrap gap-2 self-start xl:self-auto"><Button size="sm" className="rounded-lg px-3 shadow-sm" variant="outline" onClick={() => openAssignment()}><UserPlus className="mr-1.5 h-3.5 w-3.5" />Asignar esquema</Button><Button size="sm" className="rounded-lg px-3 shadow-sm" onClick={() => setEditing("new")}><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo esquema</Button></div></header>

      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><Layers3 className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ESQUEMAS ACTIVOS</p><p className="number-display mt-2 text-2xl">{activeSchemes.length}</p></CardContent></Card><Card><CardContent className="p-5"><UsersRound className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ASIGNACIONES VIGENTES</p><p className="number-display mt-2 text-2xl">{currentAssignments.length}</p></CardContent></Card><Card><CardContent className="p-5"><Percent className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">COMISIÓN MÁXIMA</p><p className="number-display mt-2 text-2xl">{(maximumRate * 100).toFixed(1)}%</p></CardContent></Card></div>

      <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Dashboard de distribución vigente</CardTitle><CardDescription>Vendedores distribuidos por el esquema aplicable al periodo {currentPeriod.start} — {currentPeriod.end}.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{distribution.map(({ scheme, count }) => <div key={scheme.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><div className="flex items-center justify-between gap-3"><strong>{scheme.name}</strong><span className="number-display">{count} VENDEDORES</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]" style={{ width: `${Math.max(count / maxDistribution * 100, count ? 5 : 0)}%` }} /></div><p className="mt-2 text-xs text-[color:var(--text-muted)]">{currentAssignments.length ? (count / currentAssignments.length * 100).toFixed(1) : "0.0"}% de las asignaciones vigentes</p></div>)}</CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle className="section-heading uppercase">Esquemas registrados</CardTitle><CardDescription>Tipos, fecha de registro y rangos disponibles para futuras vigencias.</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[color:var(--text-muted)]" /><Input className="pl-9 sm:w-80" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="BUSCAR ESQUEMA" /></div><Select value={pageSize} onValueChange={setPageSize}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10 REGISTROS</SelectItem><SelectItem value="25">25 REGISTROS</SelectItem><SelectItem value="ALL">TODOS</SelectItem></SelectContent></Select></div></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ESQUEMA / TIPO</TableHead><TableHead>RANGOS</TableHead><TableHead>REGISTRO / VIGENCIA</TableHead><TableHead>VIGENTES</TableHead><TableHead className="text-right">ACCIONES</TableHead></TableRow></TableHeader><TableBody>{displayedSchemes.map((scheme) => { const schemeSellers = currentAssignments.filter((item) => item.assignment?.schemeId === scheme.id).map((item) => item.seller); const earliestAssignment = state.schemeAssignments.filter((assignment) => assignment.schemeId === scheme.id).map((assignment) => assignment.createdAt).sort()[0]; const registrationDate = scheme.createdAt ?? earliestAssignment ?? scheme.effectiveFrom; return <TableRow key={scheme.id}><TableCell><p className="font-semibold">{scheme.name}</p><p className="text-xs text-[color:var(--text-muted)]">TIPO ACTIVO</p></TableCell><TableCell><div className="flex min-w-[420px] flex-wrap gap-1.5">{scheme.tiers.map((tier) => <Badge key={tier.id} variant="outline" className="bg-[color:var(--accent-hover)]/45">{money.format(tier.from)} — {tier.to === null ? "SIN LÍMITE" : money.format(tier.to)} · {(tier.rate * 100).toFixed(1)}%</Badge>)}</div></TableCell><TableCell><div className="min-w-36 space-y-1"><p className="flex items-center gap-1.5 text-xs font-semibold"><CalendarDays className="h-3.5 w-3.5 text-[color:var(--text-secondary)]" />{formatDate(registrationDate)}</p><p className="text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">REGISTRADO</p><p className="text-[10px] text-[color:var(--text-muted)]">Vigente: {formatDate(scheme.effectiveFrom)}</p></div></TableCell><TableCell><p className="font-semibold">{schemeSellers.length}</p><p className="max-w-xs text-xs text-[color:var(--text-muted)]">{schemeSellers.length ? schemeSellers.map((seller) => seller.name).join(", ") : "SIN ASIGNACIONES"}</p></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${scheme.name}`} onClick={() => setEditing(scheme)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Eliminar ${scheme.name}`} onClick={() => setDeleting(scheme)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Asignaciones vigentes por vendedor</CardTitle><CardDescription>El icono de cambio crea una nueva vigencia y conserva los periodos anteriores.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>VENDEDOR</TableHead><TableHead>SUCURSAL</TableHead><TableHead>TIPO</TableHead><TableHead>ESQUEMA VIGENTE</TableHead><TableHead>VIGENTE DESDE</TableHead><TableHead className="text-right">CAMBIAR</TableHead></TableRow></TableHeader><TableBody>{sellers.map((seller) => { const assignment = assignmentFor(seller.id); const scheme = state.schemes.find((item) => item.id === assignment?.schemeId); const branch = state.branches.find((item) => item.id === seller.branchId); return <TableRow key={seller.id}><TableCell className="font-semibold">{seller.name}</TableCell><TableCell>{branch?.name}</TableCell><TableCell>{seller.category === "CONTRACTOR" ? "HONORARIOS" : "VENDEDOR"}</TableCell><TableCell>{scheme?.name ?? <Badge variant="outline">SIN ESQUEMA</Badge>}</TableCell><TableCell>{assignment?.effectiveFrom ?? "SIN VIGENCIA"}</TableCell><TableCell className="text-right"><Button size="icon" variant="outline" aria-label={`Cambiar esquema de ${seller.name}`} onClick={() => openAssignment(seller.id)}><RefreshCw className="h-4 w-4" /></Button></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Historial de asignaciones por esquema</CardTitle><CardDescription>Las vigencias anteriores al periodo activo quedan bloqueadas para proteger la nómina histórica.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>VIGENTE DESDE</TableHead><TableHead>VENDEDOR</TableHead><TableHead>ESQUEMA</TableHead><TableHead>REGISTRADO</TableHead><TableHead>ESTADO</TableHead><TableHead className="text-right">EDITAR VIGENCIA</TableHead></TableRow></TableHeader><TableBody>{history.map((assignment) => { const employee = state.employees.find((item) => item.id === assignment.employeeId); const scheme = state.schemes.find((item) => item.id === assignment.schemeId); const isCurrent = assignmentFor(assignment.employeeId)?.id === assignment.id; const editable = assignment.effectiveFrom >= currentPeriod.start; return <TableRow key={assignment.id}><TableCell className="font-semibold">{assignment.effectiveFrom}</TableCell><TableCell>{employee?.name}</TableCell><TableCell>{scheme?.name}</TableCell><TableCell>{assignment.createdAt}</TableCell><TableCell><Badge variant="outline">{isCurrent ? "VIGENTE" : "HISTÓRICO"}</Badge></TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" aria-label={`Editar vigencia de ${employee?.name}`} disabled={!editable} onClick={() => setEditingAssignment(assignment)}><CalendarDays className="h-4 w-4" /></Button></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>

      <SchemeEditorDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} scheme={editing === "new" ? null : editing} open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} />
      <SchemeAssignmentDialog key={assignmentEmployeeId ?? "generic"} initialEmployeeId={assignmentEmployeeId} open={assignmentOpen} onOpenChange={(open) => { setAssignmentOpen(open); if (!open) setAssignmentEmployeeId(undefined); }} />
      {editingAssignment && <AssignmentHistoryDialog key={editingAssignment.id} assignment={editingAssignment} open onOpenChange={(open) => { if (!open) setEditingAssignment(null); }} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar este esquema?</AlertDialogTitle><AlertDialogDescription>Se eliminará del mock y sus asignaciones dejarán de estar disponibles.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { if (deleting) { deleteScheme(deleting.id); toast.success("Esquema eliminado del registro mock."); setDeleting(null); } }}>Eliminar esquema</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
