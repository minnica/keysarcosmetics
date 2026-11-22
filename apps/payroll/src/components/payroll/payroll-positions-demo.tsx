"use client";

import { type FormEvent, useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, CircleDollarSign, PencilLine, Plus, Power, Search, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
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
import { type DemoPosition, type EmployeeCategory, type PayrollModule, payrollModuleLabel, usePayrollDemo } from "./payroll-demo-context";

const categoryLabels: Record<EmployeeCategory, string> = {
  SELLER: "VENTAS / COMISIÓN",
  SPECIALIST: "ESPECIALISTAS",
  MANAGEMENT: "GERENCIA / SALARIO FIJO",
  CALL_CENTER: "CALL CENTER / SALARIO FIJO",
  CONTRACTOR: "HONORARIOS",
};

function PositionDialog({ position, onOpenChange }: { position: DemoPosition | "new" | null; onOpenChange: (open: boolean) => void }) {
  const { state, addPosition, updatePosition } = usePayrollDemo();
  const current = position === "new" ? null : position;
  const [name, setName] = useState(current?.name ?? "");
  const [category, setCategory] = useState<EmployeeCategory>(current?.category ?? "SELLER");
  const [salaryEnabled, setSalaryEnabled] = useState(current ? current.salaryPayrollModuleId !== null : false);
  const [salaryPayrollModuleId, setSalaryPayrollModuleId] = useState<Exclude<PayrollModule, "CONSOLIDATED">>(current?.salaryPayrollModuleId ?? "FIXED");
  const [commissionEnabled, setCommissionEnabled] = useState(current ? current.commissionPayrollModuleId !== null : true);
  const [commissionPayrollModuleId, setCommissionPayrollModuleId] = useState<Exclude<PayrollModule, "CONSOLIDATED">>(current?.commissionPayrollModuleId ?? "COMMISSION");
  const [defaultRoleId, setDefaultRoleId] = useState(current?.defaultRoleId ?? "role-employee");
  const [attempted, setAttempted] = useState(false);

  if (!position) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const normalizedName = name.trim().toLocaleUpperCase("es-MX");
    if (!normalizedName || !defaultRoleId || (!salaryEnabled && !commissionEnabled)) {
      toast.error("Captura el nombre, el rol y habilita al menos un tipo de nómina.");
      return;
    }
    const duplicate = state.positions.some((item) => item.id !== current?.id && item.name === normalizedName);
    if (duplicate) {
      toast.error("Ese puesto ya existe en el catálogo.");
      return;
    }
    const payrollDefaults = {
      salaryPayrollModuleId: salaryEnabled ? salaryPayrollModuleId : null,
      commissionPayrollModuleId: commissionEnabled ? commissionPayrollModuleId : null,
    };
    if (current) {
      updatePosition(current.id, { name: normalizedName, category, defaultRoleId, ...payrollDefaults });
      toast.success("Puesto actualizado. Los nuevos valores serán sugeridos en altas futuras.");
    } else {
      addPosition({ name: normalizedName, category, defaultRoleId, ...payrollDefaults });
      toast.success("Puesto agregado al catálogo institucional.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{current ? "Editar puesto" : "Nuevo puesto"}</DialogTitle>
            <DialogDescription>Define una denominación única para todas las altas, nóminas, filtros y reportes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <div className="space-y-2"><Label htmlFor="position-name">Nombre oficial</Label><Input id="position-name" value={name} onChange={(event) => setName(event.target.value.toLocaleUpperCase("es-MX"))} placeholder="EJ. COORDINADOR REGIONAL" aria-invalid={attempted && !name.trim()} /></div>
            <div className="space-y-2"><Label htmlFor="position-category">Área laboral / contrato</Label><Select value={category} onValueChange={(value) => setCategory(value as EmployeeCategory)}><SelectTrigger id="position-category"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="text-[10px] leading-4 text-[color:var(--text-muted)]">Clasifica impuestos y contrato; no limita las nóminas en las que puede participar.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-xl border p-3 transition-colors ${salaryEnabled ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-[color:var(--border-color)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2"><WalletCards className="mt-0.5 h-4 w-4 text-[#987049]" /><div><p className="text-xs font-semibold">Puede recibir sueldo</p><p className="mt-0.5 text-[9px] leading-4 text-[color:var(--text-muted)]">Habilita una nómina fija para este puesto.</p></div></div>
                  <button type="button" role="switch" aria-checked={salaryEnabled} aria-label="El puesto puede recibir sueldo" onClick={() => setSalaryEnabled((value) => !value)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${salaryEnabled ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${salaryEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`} /></button>
                </div>
                {salaryEnabled && <Select value={salaryPayrollModuleId} onValueChange={(value) => setSalaryPayrollModuleId(value as Exclude<PayrollModule, "CONSOLIDATED">)}><SelectTrigger className="mt-3 h-9 text-[10px]" aria-label="Nómina predeterminada para sueldo"><SelectValue /></SelectTrigger><SelectContent>{state.payrollModules.filter((module) => module.active && module.id !== "CONSOLIDATED" && module.concepts.includes("SALARY")).map((module) => <SelectItem key={module.id} value={module.id}>{payrollModuleLabel(state, module.id)}</SelectItem>)}</SelectContent></Select>}
              </div>
              <div className={`rounded-xl border p-3 transition-colors ${commissionEnabled ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20" : "border-[color:var(--border-color)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2"><CircleDollarSign className="mt-0.5 h-4 w-4 text-[#987049]" /><div><p className="text-xs font-semibold">Puede generar comisión</p><p className="mt-0.5 text-[9px] leading-4 text-[color:var(--text-muted)]">Permite ventas, esquema y bonos variables.</p></div></div>
                  <button type="button" role="switch" aria-checked={commissionEnabled} aria-label="El puesto puede generar comisión" onClick={() => setCommissionEnabled((value) => !value)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${commissionEnabled ? "bg-amber-600" : "bg-stone-300 dark:bg-stone-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${commissionEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`} /></button>
                </div>
                {commissionEnabled && <Select value={commissionPayrollModuleId} onValueChange={(value) => setCommissionPayrollModuleId(value as Exclude<PayrollModule, "CONSOLIDATED">)}><SelectTrigger className="mt-3 h-9 text-[10px]" aria-label="Nómina predeterminada para comisiones"><SelectValue /></SelectTrigger><SelectContent>{state.payrollModules.filter((module) => module.active && module.id !== "CONSOLIDATED" && module.concepts.includes("COMMISSION")).map((module) => <SelectItem key={module.id} value={module.id}>{payrollModuleLabel(state, module.id)}</SelectItem>)}</SelectContent></Select>}
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="position-role">Rol predeterminado</Label><Select value={defaultRoleId} onValueChange={setDefaultRoleId}><SelectTrigger id="position-role"><SelectValue /></SelectTrigger><SelectContent>{state.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select><p className="text-[10px] leading-4 text-[color:var(--text-muted)]">Se asignará automáticamente al elegir este puesto. El usuario máster podrá ajustar el acceso después.</p></div>
            <div className="flex gap-3 rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" /><div><p className="text-xs font-semibold">Predeterminados para nuevas altas</p><p className="mt-1 text-[10px] leading-4 text-[color:var(--text-muted)]">El puesto sugiere sueldo y comisión al registrar personal. Editar estos valores no reescribe nóminas ni asignaciones históricas de empleados existentes.</p></div></div>
          </div>
          <DialogFooter><Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" size="sm"><BadgeCheck className="mr-1.5 h-3.5 w-3.5" />{current ? "Guardar cambios" : "Crear puesto"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollPositionsDemo() {
  const { state, togglePosition } = usePayrollDemo();
  const [editing, setEditing] = useState<DemoPosition | "new" | null>(null);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const rows = useMemo(() => state.positions.filter((position) => {
    const role = state.roles.find((item) => item.id === position.defaultRoleId);
    const payrolls = [position.salaryPayrollModuleId, position.commissionPayrollModuleId].filter(Boolean).map((module) => payrollModuleLabel(state, module!)).join(" ");
    return !normalizedSearch || `${position.name} ${categoryLabels[position.category]} ${payrolls} ${role?.name ?? ""}`.toLocaleLowerCase("es-MX").includes(normalizedSearch);
  }).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "es-MX")), [normalizedSearch, state]);
  const activeCount = state.positions.filter((item) => item.active).length;
  const assignedCount = state.employees.filter((employee) => state.positions.some((position) => position.name === employee.position)).length;
  const payrollTypeCount = new Set(state.positions.filter((item) => item.active).flatMap((item) => [item.salaryPayrollModuleId, item.commissionPayrollModuleId].filter(Boolean))).size;

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">CONFIGURACIÓN MÁSTER</Badge><span className="text-xs text-[color:var(--text-muted)]">Fuente única para clasificación laboral</span></div><h1 className="page-title">Catálogo de puestos</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Unifica los nombres que aparecen en empleados, nóminas, recibos, filtros y reportes ejecutivos.</p></div><Button size="sm" className="self-start rounded-lg px-3 xl:self-auto" onClick={() => setEditing("new")}><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo puesto</Button></header>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardContent className="grid divide-y divide-[color:var(--border-color)] p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[
        { icon: BriefcaseBusiness, label: "Puestos activos", value: activeCount },
        { icon: UsersRound, label: "Empleados unificados", value: assignedCount },
        { icon: ShieldCheck, label: "Tipos de nómina", value: payrollTypeCount },
      ].map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-3 px-4 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><Icon className="h-4 w-4" /></span><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p><p className="number-display text-xl">{value}</p></div></div>)}</CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 px-4 py-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="section-heading uppercase">Puestos autorizados</CardTitle><CardDescription>Las altas de personal solo pueden elegir conceptos activos de esta lista.</CardDescription></div><div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 pl-8 text-[10px]" placeholder="BUSCAR PUESTO, NÓMINA O ROL" aria-label="Buscar puestos" /></div></div></CardHeader>
        <CardContent className="p-0"><div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(190px,1fr)_minmax(150px,.8fr)_110px_95px] gap-3 border-b border-[color:var(--border-color)] px-4 py-2 text-[8px] font-semibold uppercase tracking-[0.11em] text-[color:var(--text-muted)] md:grid"><span>Puesto oficial</span><span>Tipo de nómina</span><span>Rol predeterminado</span><span>Empleados</span><span className="text-right">Acciones</span></div><div className="divide-y divide-[color:var(--border-color)]">{rows.map((position) => {
          const role = state.roles.find((item) => item.id === position.defaultRoleId);
          const employeeCount = state.employees.filter((employee) => employee.position === position.name).length;
          const payrolls = [position.salaryPayrollModuleId, position.commissionPayrollModuleId].filter((module): module is Exclude<PayrollModule, "CONSOLIDATED"> => module !== null);
          return <div key={position.id} className="grid gap-2 px-4 py-3 transition-colors hover:bg-[color:var(--accent-hover)]/20 md:grid-cols-[minmax(220px,1.5fr)_minmax(190px,1fr)_minmax(150px,.8fr)_110px_95px] md:items-center md:gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c3a583]/40 bg-[#342b23] text-[#f0d9b8]"><BriefcaseBusiness className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{position.name}</p><Badge variant="outline" className={`mt-1 px-1.5 py-0 text-[8px] ${position.active ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-stone-300 text-stone-500"}`}>{position.active ? "ACTIVO" : "INACTIVO"}</Badge></div></div><div><p className="text-[8px] uppercase tracking-[0.09em] text-[color:var(--text-muted)] md:hidden">Tipos de nómina</p><div className="flex flex-wrap gap-1">{payrolls.map((module) => <Badge key={module} variant="outline" className="px-1.5 py-0 text-[8px]">{payrollModuleLabel(state, module)}</Badge>)}</div><p className="mt-1 text-[8px] text-[color:var(--text-muted)]">{categoryLabels[position.category]}</p></div><div><p className="text-[8px] uppercase tracking-[0.09em] text-[color:var(--text-muted)] md:hidden">Rol</p><p className="text-[10px]">{role?.name ?? "SIN ROL"}</p></div><div><p className="text-[8px] uppercase tracking-[0.09em] text-[color:var(--text-muted)] md:hidden">Empleados</p><p className="number-display text-sm">{employeeCount}</p></div><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(position)} aria-label={`Editar ${position.name}`}><PencilLine className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className={`h-7 w-7 ${position.active ? "text-amber-700" : "text-emerald-700"}`} onClick={() => { togglePosition(position.id); toast.success(position.active ? "Puesto cerrado para nuevas asignaciones; el historial se conserva." : "Puesto disponible nuevamente."); }} aria-label={position.active ? `Desactivar ${position.name}` : `Activar ${position.name}`}><Power className="h-3.5 w-3.5" /></Button></div></div>;
        })}{rows.length === 0 && <div className="px-4 py-12 text-center"><Search className="mx-auto h-5 w-5 text-[color:var(--text-muted)]" /><p className="mt-2 text-sm font-semibold">Sin coincidencias</p></div>}</div></CardContent>
      </Card>

      <PositionDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} position={editing} onOpenChange={(open) => { if (!open) setEditing(null); }} />
    </div>
  );
}
