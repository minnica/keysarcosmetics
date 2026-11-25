"use client";

import { type FormEvent, useMemo, useState } from "react";
import { BadgeCheck, Building2, History, PencilLine, PlugZap, Power, Search, Store, UsersRound } from "lucide-react";
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
  toast,
} from "@cosmetics/ui";
import { type DemoBranch, usePayrollDemo } from "./payroll-demo-context";

type BranchFilter = "ALL" | "ACTIVE" | "INACTIVE";

const POS_DEMO_BRANCH = {
  externalPosId: "pos-demo-santa-fe",
  name: "SUCURSAL DEMO SANTA FE",
  city: "CIUDAD DE MÉXICO",
  active: true,
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function BranchDialog({ branch, onOpenChange }: { branch: DemoBranch | "new" | null; onOpenChange: (open: boolean) => void }) {
  const { state, addBranch, updateBranch } = usePayrollDemo();
  const current = branch === "new" ? null : branch;
  const [name, setName] = useState(current?.name ?? "");
  const [city, setCity] = useState(current?.city ?? "");
  const [attempted, setAttempted] = useState(false);

  if (!branch) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const normalizedName = name.trim().toLocaleUpperCase("es-MX");
    const normalizedCity = city.trim().toLocaleUpperCase("es-MX");
    if (!normalizedName || !normalizedCity) {
      toast.error("Captura el nombre oficial y la ubicación de la sucursal.");
      return;
    }
    if (state.branches.some((item) => item.id !== current?.id && item.name === normalizedName)) {
      toast.error("Esa sucursal ya existe en el catálogo.");
      return;
    }
    if (current) {
      updateBranch(current.id, { name: normalizedName, city: normalizedCity });
      toast.success("Sucursal actualizada sin modificar sus movimientos históricos.");
    } else {
      addBranch({ name: normalizedName, city: normalizedCity });
      toast.success("Sucursal disponible en nóminas, costos y reportes.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{current ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
            <DialogDescription>El nombre será la referencia única para nóminas, centros de costo y reportes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="branch-name">Nombre oficial</Label><Input id="branch-name" value={name} onChange={(event) => setName(event.target.value.toLocaleUpperCase("es-MX"))} placeholder="EJ. SUCURSAL DEMO NORTE" aria-invalid={attempted && !name.trim()} /></div>
            <div className="space-y-2"><Label htmlFor="branch-city">Ciudad o estado</Label><Input id="branch-city" value={city} onChange={(event) => setCity(event.target.value.toLocaleUpperCase("es-MX"))} placeholder="EJ. CIUDAD DE MÉXICO" aria-invalid={attempted && !city.trim()} /></div>
          </div>
          <DialogFooter><Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" size="sm"><BadgeCheck className="mr-1.5 h-3.5 w-3.5" />{current ? "Guardar" : "Registrar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollBranchesDemo() {
  const { state, syncPosBranch, toggleBranch } = usePayrollDemo();
  const [editing, setEditing] = useState<DemoBranch | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BranchFilter>("ALL");
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");

  const rows = useMemo(() => state.branches.filter((branch) => {
    const matchesStatus = status === "ALL" || (status === "ACTIVE" ? branch.active : !branch.active);
    const matchesSearch = !normalizedSearch || `${branch.name} ${branch.city} ${branch.externalPosId ?? ""}`.toLocaleLowerCase("es-MX").includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  }).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "es-MX")), [normalizedSearch, state.branches, status]);

  const activeCount = state.branches.filter((branch) => branch.active).length;
  const posCount = state.branches.filter((branch) => branch.source === "POS").length;
  const historicalCount = state.branches.filter((branch) => !branch.active).length;
  const demoBranchExists = state.branches.some((branch) => branch.externalPosId === POS_DEMO_BRANCH.externalPosId);

  function simulatePosEvent() {
    syncPosBranch(POS_DEMO_BRANCH);
    toast.success(demoBranchExists ? "Evento POS procesado: sucursal sincronizada sin duplicados." : "Alta POS recibida: la sucursal ya aparece en todo el portal.");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">CONFIGURACIÓN MÁSTER</Badge><span className="text-xs text-[color:var(--text-muted)]">Catálogo corporativo de puntos de venta</span></div><h1 className="page-title">Sucursales</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Una sola fuente para empleados, nóminas, comisiones, centros de costo y reportes.</p></div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="rounded-lg px-3" onClick={simulatePosEvent}><PlugZap className="mr-1.5 h-3.5 w-3.5" />{demoBranchExists ? "Sincronizar POS" : "Simular alta POS"}</Button><Button size="sm" className="rounded-lg px-3" onClick={() => setEditing("new")}><Building2 className="mr-1.5 h-3.5 w-3.5" />Nueva sucursal</Button></div>
      </header>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardContent className="grid divide-y divide-[color:var(--border-color)] p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[
        { icon: Store, label: "Sucursales activas", value: activeCount },
        { icon: PlugZap, label: "Registradas desde POS", value: posCount },
        { icon: History, label: "Historial conservado", value: historicalCount },
      ].map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-3 px-4 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><Icon className="h-4 w-4" /></span><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p><p className="number-display text-xl">{value}</p></div></div>)}</CardContent></Card>

      <Card className="border-[#b8956f]/40 bg-gradient-to-r from-[#2a241f] to-[#4b3828] text-[#fffaf3]">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d4b58e]/35 bg-white/5 text-[#e0bd91]"><PlugZap className="h-4 w-4" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em]">Alta automática desde POS</p><p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#e8ddd0]">El prototipo procesa un evento POS en memoria. La conexión automática real queda preparada como contrato de integración y conservará bajas mediante estatus, nunca eliminando el registro.</p></div></div><Badge variant="outline" className="w-fit border-amber-200/40 bg-amber-100/10 text-amber-100">DEMOSTRACIÓN</Badge></CardContent>
      </Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] px-4 py-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="section-heading uppercase">Directorio de sucursales</CardTitle><CardDescription>Las bajas bloquean nuevas asignaciones y conservan ventas, nóminas y reportes anteriores.</CardDescription></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><div className="relative min-w-0 sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 pl-8 text-[10px]" placeholder="BUSCAR SUCURSAL, CIUDAD O CLAVE POS" aria-label="Buscar sucursal" /></div><Select value={status} onValueChange={(value) => setStatus(value as BranchFilter)}><SelectTrigger className="h-8 min-w-36 text-[10px]" aria-label="Filtrar por estatus"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">TODAS</SelectItem><SelectItem value="ACTIVE">ACTIVAS</SelectItem><SelectItem value="INACTIVE">BAJAS</SelectItem></SelectContent></Select></div></div></CardHeader>
        <CardContent className="p-0"><div className="hidden grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_130px_150px_110px_80px] gap-3 border-b border-[color:var(--border-color)] px-4 py-2 text-[8px] font-semibold uppercase tracking-[0.11em] text-[color:var(--text-muted)] lg:grid"><span>Sucursal</span><span>Origen / clave</span><span>Registro</span><span>Actividad relacionada</span><span>Estatus</span><span className="text-right">Acciones</span></div><div className="divide-y divide-[color:var(--border-color)]">{rows.map((branch) => {
          const employees = state.employees.filter((employee) => employee.branchId === branch.id || employee.costBranchIds.includes(branch.id)).length;
          const historicalRecords = state.sales.filter((sale) => sale.branchId === branch.id).length + state.adjustments.filter((movement) => movement.branchId === branch.id || movement.costBranchIds.includes(branch.id)).length + state.kioskMonthlySales.filter((sale) => sale.branchId === branch.id).length;
          return <div key={branch.id} className="grid gap-2 px-4 py-3 transition-colors hover:bg-[color:var(--accent-hover)]/20 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_130px_150px_110px_80px] lg:items-center lg:gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c3a583]/40 bg-[#342b23] text-[#f0d9b8]"><Store className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{branch.name}</p><p className="mt-0.5 truncate text-[9px] text-[color:var(--text-muted)]">{branch.city}</p></div></div><div><p className="text-[8px] uppercase tracking-[0.09em] text-[color:var(--text-muted)] lg:hidden">Origen</p><p className="text-[10px] font-semibold">{branch.source === "POS" ? "PUNTO DE VENTA" : "PORTAL DE NÓMINA"}</p><p className="mt-0.5 text-[9px] text-[color:var(--text-muted)]">{branch.externalPosId ?? "SIN CLAVE POS"}</p></div><div><p className="text-[8px] uppercase tracking-[0.09em] text-[color:var(--text-muted)] lg:hidden">Registro</p><p className="text-[10px]">{formatDate(branch.registeredAt)}</p><p className="mt-0.5 text-[9px] text-[color:var(--text-muted)]">{branch.lastSyncedAt ? `SYNC ${formatDate(branch.lastSyncedAt)}` : "ALTA MANUAL"}</p></div><div className="flex gap-3"><span className="text-[10px]"><UsersRound className="mr-1 inline h-3.5 w-3.5 text-[#987049]" />{employees} personal</span><span className="text-[10px]"><History className="mr-1 inline h-3.5 w-3.5 text-[#987049]" />{historicalRecords} movimientos</span></div><div><Badge variant="outline" className={`px-1.5 py-0 text-[8px] ${branch.active ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>{branch.active ? "ACTIVA" : `BAJA ${formatDate(branch.deactivatedAt)}`}</Badge></div><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(branch)} aria-label={`Editar ${branch.name}`}><PencilLine className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className={`h-7 w-7 ${branch.active ? "text-amber-700" : "text-emerald-700"}`} onClick={() => { toggleBranch(branch.id); toast.success(branch.active ? "Sucursal dada de baja. Todo el historial permanece disponible." : "Sucursal reactivada para nuevas operaciones."); }} aria-label={branch.active ? `Dar de baja ${branch.name}` : `Reactivar ${branch.name}`}><Power className="h-3.5 w-3.5" /></Button></div></div>;
        })}{rows.length === 0 ? <div className="px-4 py-12 text-center"><Search className="mx-auto h-5 w-5 text-[color:var(--text-muted)]" /><p className="mt-2 text-sm font-semibold">Sin sucursales para este filtro</p></div> : null}</div></CardContent>
      </Card>

      <BranchDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} branch={editing} onOpenChange={(open) => { if (!open) setEditing(null); }} />
    </div>
  );
}
