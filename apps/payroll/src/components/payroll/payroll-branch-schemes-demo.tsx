"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Combine,
  History,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import {
  type BranchCommissionScope,
  type DemoBranchCommissionScheme,
  usePayrollDemo,
} from "./payroll-demo-context";
import { CommissionScaleEditor, scaleLevelsFromTiers, scaleLevelsToTiers } from "./commission-scale-editor";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function SchemeDialog({
  scheme,
  open,
  onOpenChange,
}: {
  scheme: DemoBranchCommissionScheme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, addBranchCommissionScheme, updateBranchCommissionScheme } = usePayrollDemo();
  const managers = state.employees.filter((employee) => employee.category === "MANAGEMENT" && employee.active);
  const [name, setName] = useState(scheme?.name ?? "");
  const [scope, setScope] = useState<BranchCommissionScope>(scheme?.scope ?? "ALL_COMBINED");
  const [branchIds, setBranchIds] = useState(scheme?.branchIds ?? state.branches.map((branch) => branch.id));
  const [branchSearch, setBranchSearch] = useState("");
  const [managerId, setManagerId] = useState(scheme?.managerId ?? "UNASSIGNED");
  const [effectiveFrom, setEffectiveFrom] = useState(scheme?.effectiveFrom ?? new Date().toISOString().slice(0, 10));
  const [active, setActive] = useState(scheme?.active ?? true);
  const [attempted, setAttempted] = useState(false);
  const [levels, setLevels] = useState(() => scaleLevelsFromTiers(scheme?.tiers, [
    { upperLimit: "499999.99", rate: "0.4" },
    { upperLimit: "849999.99", rate: "0.8" },
    { upperLimit: "", rate: "1.2" },
  ]));

  function toggleBranch(branchId: string) {
    if (scope === "SINGLE_BRANCH") {
      setBranchIds([branchId]);
      return;
    }
    setBranchIds((current) => current.includes(branchId) ? current.filter((id) => id !== branchId) : [...current, branchId]);
  }

  const normalizedBranchSearch = branchSearch.trim().toLocaleLowerCase("es-MX");
  const visibleBranches = state.branches.filter((branch) =>
    !normalizedBranchSearch || `${branch.name} ${branch.city}`.toLocaleLowerCase("es-MX").includes(normalizedBranchSearch),
  );
  const selectedBranchLabel = branchIds.length === state.branches.length
    ? "Todas las sucursales"
    : branchIds.length === 1
      ? state.branches.find((branch) => branch.id === branchIds[0])?.name ?? "1 sucursal"
      : `${branchIds.length} sucursales seleccionadas`;

  function submit() {
    setAttempted(true);
    const tiers = scaleLevelsToTiers(levels, 20);
    const selectedBranches = scope === "ALL_COMBINED" ? state.branches.map((branch) => branch.id) : branchIds;
    if (!name.trim() || !effectiveFrom || !selectedBranches.length || (scope === "SINGLE_BRANCH" && selectedBranches.length !== 1) || !tiers) {
      toast.error("Revisa el nombre, sucursales, vigencia, cortes y porcentajes del esquema.");
      return;
    }
    const input = {
      name: name.trim(),
      scope,
      branchIds: selectedBranches,
      managerId: managerId === "UNASSIGNED" ? null : managerId,
      effectiveFrom,
      active,
      tiers,
    };
    if (scheme) updateBranchCommissionScheme(scheme.id, input);
    else addBranchCommissionScheme(input);
    toast.success(scheme ? "Esquema por sucursal actualizado." : "Esquema por sucursal registrado.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{scheme ? "Editar esquema" : "Nuevo esquema"}</DialogTitle>
          <DialogDescription>Define la comisión que corresponde según las ventas de una sucursal o una combinación de puntos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="branch-scheme-name">Nombre del esquema</Label><Input id="branch-scheme-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. RED NORTE COMBINADA" aria-invalid={attempted && !name.trim()} />{attempted && !name.trim() && <p className="text-xs text-rose-600">Escribe un nombre para identificar el esquema.</p>}</div>
            <div className="space-y-2"><Label htmlFor="branch-scheme-effective"><CalendarDays className="mr-1 inline h-4 w-4" />Vigente desde</Label><Input id="branch-scheme-effective" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} aria-invalid={attempted && !effectiveFrom} /><p className="text-xs text-[color:var(--text-muted)]">El cálculo solo afectará este periodo y los posteriores.</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Tipo de cálculo</Label><Select value={scope} onValueChange={(value) => { const next = value as BranchCommissionScope; setScope(next); if (next === "ALL_COMBINED") setBranchIds(state.branches.map((branch) => branch.id)); if (next === "SINGLE_BRANCH") setBranchIds((current) => [current[0] ?? state.branches[0]?.id ?? ""].filter(Boolean)); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SINGLE_BRANCH">UNA SOLA SUCURSAL</SelectItem><SelectItem value="SELECTED_BRANCHES">VARIAS SUCURSALES COMBINADAS</SelectItem><SelectItem value="ALL_COMBINED">TODAS LAS SUCURSALES COMBINADAS</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Gerente asociado</Label><Select value={managerId} onValueChange={setManagerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UNASSIGNED">SIN GERENTE</SelectItem>{managers.map((manager) => <SelectItem key={manager.id} value={manager.id}>{manager.name} · {manager.position}</SelectItem>)}</SelectContent></Select><p className="text-[10px] text-[color:var(--text-muted)]">Cada cambio crea una nueva entrada sin reemplazar al gerente anterior.</p></div>
          </div>
          <div className="space-y-2">
            <Label>Puntos de venta incluidos</Label>
            <Popover onOpenChange={(isOpen) => { if (!isOpen) setBranchSearch(""); }}>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] px-3 text-left shadow-sm transition-colors hover:border-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex min-w-0 items-center gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-hover)]/50 text-[color:var(--text-secondary)]"><Building2 className="h-3.5 w-3.5" /></span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{selectedBranchLabel}</span><span className="block text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">{branchIds.length} de {state.branches.length} puntos seleccionados</span></span></span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(420px,calc(100vw-48px))] rounded-2xl border-[color:var(--border-color)] p-0 shadow-xl">
                <div className="border-b border-[color:var(--border-color)] p-3">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Seleccionar sucursales</p><p className="text-[10px] text-[color:var(--text-muted)]">{scope === "SINGLE_BRANCH" ? "Elige un solo punto de venta." : scope === "ALL_COMBINED" ? "Este esquema incluye automáticamente todos los puntos." : "Marca los puntos que compartirán la escala."}</p></div><Badge variant="outline" className="shrink-0 text-[9px]">{branchIds.length} / {state.branches.length}</Badge></div>
                  <div className="relative mt-2.5"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} className="h-8 pl-8 text-[10px]" placeholder="BUSCAR SUCURSAL O CIUDAD" aria-label="Buscar sucursal" /></div>
                  {scope === "SELECTED_BRANCHES" && <div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[9px]" onClick={() => setBranchIds(state.branches.map((branch) => branch.id))}>Seleccionar todas</Button><Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[9px]" onClick={() => setBranchIds([])}>Limpiar</Button></div>}
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5">
                  {visibleBranches.map((branch) => {
                    const selected = branchIds.includes(branch.id);
                    const locked = scope === "ALL_COMBINED";
                    return <button key={branch.id} type="button" disabled={locked} onClick={() => toggleBranch(branch.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${selected ? "bg-[color:var(--accent-hover)]/55" : "hover:bg-[color:var(--accent-hover)]/25"} disabled:cursor-default`}><span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#9a744c] bg-[#9a744c] text-white" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}>{selected && <Check className="h-3 w-3" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{branch.name}</span><span className="block truncate text-[9px] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">{branch.city}</span></span><span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">{selected ? "Incluida" : "Disponible"}</span></button>;
                  })}
                  {visibleBranches.length === 0 && <div className="px-3 py-8 text-center"><Search className="mx-auto h-4 w-4 text-[color:var(--text-muted)]" /><p className="mt-2 text-xs font-semibold">Sin coincidencias</p></div>}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-[color:var(--text-muted)]">{scope === "SINGLE_BRANCH" ? "Selecciona un solo punto: su venta mensual será la base completa del esquema." : scope === "ALL_COMBINED" ? "La venta de todos los puntos se suma antes de buscar el rango de comisión." : "La venta de las sucursales elegidas se combina como una sola base de cálculo."}</p>
          </div>
          <CommissionScaleEditor levels={levels} onChange={setLevels} maxRate={20} description="La venta individual o combinada determina el nivel; la tasa resultante se aplica a los puntos incluidos." />
          <button type="button" role="switch" aria-checked={active} onClick={() => setActive((current) => !current)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${active ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)]"}`}><span><strong className="block">Esquema disponible</strong><span className="text-xs text-[color:var(--text-muted)]">La vigencia se conserva aunque posteriormente se desactive.</span></span><Badge variant="outline">{active ? "ACTIVO" : "INACTIVO"}</Badge></button>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>{scheme ? "Guardar cambios" : "Registrar esquema"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollBranchSchemesDemo() {
  const { state, deleteBranchCommissionScheme } = usePayrollDemo();
  const [editing, setEditing] = useState<DemoBranchCommissionScheme | "new" | null>(null);
  const [deleting, setDeleting] = useState<DemoBranchCommissionScheme | null>(null);
  const schemes = useMemo(() => [...state.branchCommissionSchemes].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)), [state.branchCommissionSchemes]);
  const activeSchemes = schemes.filter((scheme) => scheme.active);
  const assignedBranches = new Set(activeSchemes.flatMap((scheme) => scheme.branchIds));
  const maxRate = Math.max(0, ...activeSchemes.flatMap((scheme) => scheme.tiers.map((tier) => tier.rate)));
  const combinedSchemes = activeSchemes.filter((scheme) => scheme.scope === "ALL_COMBINED" || scheme.branchIds.length > 1).length;

  return (
    <div className="space-y-7">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">CONFIGURACIÓN MASTER</Badge><span className="text-xs text-[color:var(--text-muted)]">Comisión por punto de venta</span></div><h1 className="page-title">Esquemas por sucursal</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Registra escalas para una selección de puntos de venta o combina todas las sucursales en una sola base, con gerente y vigencia protegida.</p></div><Button size="sm" className="self-start rounded-lg px-3 shadow-sm xl:self-auto" onClick={() => setEditing("new")}><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo esquema</Button></header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><Network className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ESQUEMAS ACTIVOS</p><p className="number-display mt-2 text-2xl">{activeSchemes.length}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{schemes.length} versiones registradas</p></CardContent></Card>
        <Card><CardContent className="p-5"><Building2 className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">PUNTOS CUBIERTOS</p><p className="number-display mt-2 text-2xl">{assignedBranches.size} / {state.branches.length}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Sucursales dentro de una vigencia</p></CardContent></Card>
        <Card><CardContent className="p-5"><Combine className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">ESQUEMAS COMBINADOS</p><p className="number-display mt-2 text-2xl">{combinedSchemes}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Calculan la venta como una sola red</p></CardContent></Card>
        <Card><CardContent className="p-5"><BarChart3 className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">COMISIÓN MÁXIMA</p><p className="number-display mt-2 text-2xl">{(maxRate * 100).toFixed(1)}%</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Mayor escala vigente</p></CardContent></Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle className="section-heading uppercase">Modelos registrados</CardTitle><CardDescription>La configuración más reciente aplicable al mes se refleja automáticamente en Comisión de kiosco.</CardDescription></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ESQUEMA / TIPO</TableHead><TableHead>SUCURSALES</TableHead><TableHead>GERENTE</TableHead><TableHead>ESCALAS</TableHead><TableHead>VIGENCIA</TableHead><TableHead className="text-right">ACCIONES</TableHead></TableRow></TableHeader><TableBody>{schemes.map((scheme) => {
          const manager = state.employees.find((employee) => employee.id === scheme.managerId);
          const branches = state.branches.filter((branch) => scheme.branchIds.includes(branch.id));
          const scopeLabel = scheme.scope === "SINGLE_BRANCH" ? "SUCURSAL INDIVIDUAL" : scheme.scope === "ALL_COMBINED" ? "TODAS COMBINADAS" : "SELECCIÓN COMBINADA";
          return <TableRow key={scheme.id}><TableCell><p className="font-semibold">{scheme.name}</p><div className="mt-1 flex gap-1"><Badge variant="outline">{scopeLabel}</Badge><Badge variant="outline">{scheme.active ? "ACTIVO" : "INACTIVO"}</Badge></div></TableCell><TableCell><div className="flex max-w-xs items-center gap-1"><Badge variant="outline" className="shrink-0">{branches.length} {branches.length === 1 ? "PUNTO" : "PUNTOS"}</Badge>{branches.slice(0, 2).map((branch) => <span key={branch.id} className="max-w-24 truncate text-[10px] text-[color:var(--text-muted)]">{branch.name}</span>)}{branches.length > 2 && <span className="text-[10px] font-semibold text-[color:var(--text-secondary)]">+{branches.length - 2}</span>}</div></TableCell><TableCell><span className="inline-flex items-center gap-2 text-sm"><UserRoundCheck className="h-4 w-4" />{manager?.name ?? "SIN GERENTE"}</span><p className="mt-1 text-[9px] text-[color:var(--text-muted)]">{scheme.managerHistory.length} {scheme.managerHistory.length === 1 ? "REGISTRO" : "CAMBIOS"}</p></TableCell><TableCell><div className="flex min-w-[360px] flex-wrap gap-1">{scheme.tiers.map((tier) => <Badge key={tier.id} variant="outline" className="bg-[color:var(--accent-hover)]/40">{money.format(tier.from)} — {tier.to === null ? "SIN LÍMITE" : money.format(tier.to)} · {(tier.rate * 100).toFixed(1)}%</Badge>)}</div></TableCell><TableCell><p className="font-semibold">{scheme.effectiveFrom}</p><p className="text-xs text-[color:var(--text-muted)]">HISTORIAL PROTEGIDO</p></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${scheme.name}`} onClick={() => setEditing(scheme)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Eliminar ${scheme.name}`} onClick={() => setDeleting(scheme)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></TableCell></TableRow>;
        })}</TableBody></Table></div></CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Historial de gerentes y vigencias</CardTitle><CardDescription>Los nombres quedan guardados como fotografía histórica; cambiar, renombrar o retirar una gerencia agrega un registro nuevo.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{schemes.map((scheme) => <article key={`history-${scheme.id}`} className="overflow-hidden rounded-xl border border-[color:var(--border-color)]"><div className="flex items-start justify-between gap-3 border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-4 py-3"><div><p className="text-xs font-semibold">{scheme.name}</p><p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">{scheme.branchIds.length} puntos incluidos</p></div><Badge variant="outline">{scheme.managerHistory.length} {scheme.managerHistory.length === 1 ? "VIGENCIA" : "VIGENCIAS"}</Badge></div><div className="divide-y divide-[color:var(--border-color)]">{[...scheme.managerHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.changedAt.localeCompare(a.changedAt)).map((entry, index) => <div key={entry.id} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${entry.managerId ? "border-[#c3a583]/45 bg-[#c3a583]/10 text-[#987049]" : "border-stone-300 bg-stone-100 text-stone-500 dark:border-stone-700 dark:bg-stone-900"}`}><UserRoundCheck className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{entry.managerName}</p><p className="text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">VIGENTE DESDE {entry.effectiveFrom}</p></div>{index === 0 && <Badge className="border border-emerald-300 bg-emerald-50 text-[8px] text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200">ACTUAL</Badge>}</div>)}</div></article>)}</CardContent></Card>

      {editing && <SchemeDialog key={editing === "new" ? "new" : editing.id} scheme={editing === "new" ? null : editing} open onOpenChange={(open) => { if (!open) setEditing(null); }} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar el esquema por sucursal?</AlertDialogTitle><AlertDialogDescription>Se retirará del mock activo. Los reportes anteriores conservan sus importes simulados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { if (deleting) { deleteBranchCommissionScheme(deleting.id); toast.success("Esquema eliminado del registro mock."); setDeleting(null); } }}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
