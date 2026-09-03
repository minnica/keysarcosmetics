"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  History,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserRoundCheck,
  UsersRound,
  WalletCards,
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
  toast,
} from "@cosmetics/ui";
import {
  type DemoEmployee,
  type EmployeeCategory,
  usePayrollDemo,
} from "./payroll-demo-context";

const categoryLabels: Record<EmployeeCategory, string> = {
  SELLER: "Ventas / comisión",
  SPECIALIST: "Especialistas",
  MANAGEMENT: "Gerencia",
  CALL_CENTER: "Call center",
  CONTRACTOR: "Honorarios",
};

const categoryDefaults: Record<EmployeeCategory, Pick<DemoEmployee, "socialCostRate" | "isrCostRate" | "ivaRate" | "isrRetentionRate" | "ivaRetentionRate">> = {
  SELLER: { socialCostRate: 0.18, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
  SPECIALIST: { socialCostRate: 0.22, isrCostRate: 0.12, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
  MANAGEMENT: { socialCostRate: 0.25, isrCostRate: 0.16, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
  CALL_CENTER: { socialCostRate: 0.2, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
  CONTRACTOR: { socialCostRate: 0, isrCostRate: 0, ivaRate: 0.16, isrRetentionRate: 0.1, ivaRetentionRate: 0.106667 },
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function EmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, addEmployee } = usePayrollDemo();
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [category, setCategory] = useState<EmployeeCategory>("SELLER");
  const [branchId, setBranchId] = useState(state.branches[0]?.id ?? "");
  const [roleId, setRoleId] = useState("role-employee");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [hireDate, setHireDate] = useState(localDate());
  const [attempted, setAttempted] = useState(false);

  function clearForm() {
    setName("");
    setPosition("");
    setCategory("SELLER");
    setBranchId(state.branches[0]?.id ?? "");
    setRoleId("role-employee");
    setMonthlySalary("0");
    setBank("");
    setAccount("");
    setHireDate(localDate());
    setAttempted(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const salary = Number(monthlySalary);
    const lastFour = account.replace(/\D/g, "").slice(-4);
    if (!name.trim() || !position.trim() || !branchId || !roleId || !hireDate || !bank.trim() || lastFour.length !== 4 || !Number.isFinite(salary) || salary < 0) {
      toast.error("Completa los datos requeridos y captura cuatro dígitos de cuenta.");
      return;
    }

    addEmployee({
      name: name.trim(),
      position: position.trim(),
      category,
      branchId,
      monthlySalary: salary,
      schemeId: null,
      bank: bank.trim(),
      account: `•••• ${lastFour}`,
      roleId,
      active: hireDate <= localDate(),
      hireDate,
      terminationDate: null,
      ...categoryDefaults[category],
      viaticsEnabled: false,
      allowedViaticsConceptIds: [],
    });
    toast.success(`Empleado registrado con vigencia desde ${hireDate}.`);
    clearForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) clearForm(); onOpenChange(nextOpen); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Nuevo empleado</DialogTitle>
            <DialogDescription>Alta local de demostración. El registro vive únicamente durante esta sesión.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="employee-name">Nombre completo</Label>
              <Input id="employee-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="PERSONA DEMO 10" aria-invalid={attempted && !name.trim()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-position">Puesto</Label>
              <Input id="employee-position" value={position} onChange={(event) => setPosition(event.target.value)} placeholder="EJ. VENDEDOR DEMO" aria-invalid={attempted && !position.trim()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-category">Tipo de nómina</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as EmployeeCategory)}>
                <SelectTrigger id="employee-category"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-branch">Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="employee-branch"><SelectValue /></SelectTrigger>
                <SelectContent>{state.branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-role">Acceso inicial</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="employee-role"><SelectValue /></SelectTrigger>
                <SelectContent>{state.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-salary">Sueldo mensual</Label>
              <Input id="employee-salary" type="number" min="0" step="100" value={monthlySalary} onChange={(event) => setMonthlySalary(event.target.value)} />
              <p className="text-[10px] text-[color:var(--text-muted)]">Se divide exclusivamente entre las quincenas 1–15 y 16–fin de mes.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-hire-date">Vigente desde</Label>
              <Input id="employee-hire-date" type="date" value={hireDate} onChange={(event) => setHireDate(event.target.value)} required />
              <p className="text-[10px] text-[color:var(--text-muted)]">No aparecerá en nóminas anteriores a esta fecha.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-bank">Banco</Label>
              <Input id="employee-bank" value={bank} onChange={(event) => setBank(event.target.value)} placeholder="BANCO DEMO" aria-invalid={attempted && !bank.trim()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-account">Últimos 4 de cuenta</Label>
              <Input id="employee-account" inputMode="numeric" maxLength={4} value={account} onChange={(event) => setAccount(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" aria-invalid={attempted && account.length !== 4} />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 px-3 py-2.5 sm:col-span-2"><History className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" /><div><p className="text-xs font-semibold">Historial protegido por fecha</p><p className="mt-0.5 text-[10px] leading-4 text-[color:var(--text-muted)]">La fecha de alta define la primera nómina posible. Para incluir una nómina anterior debes elegir expresamente una fecha dentro de ese periodo.</p></div></div>
          </div>

          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" size="sm"><UserRoundCheck className="mr-1.5 h-3.5 w-3.5" />Registrar empleado</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmploymentDialog({ employee, onOpenChange }: { employee: DemoEmployee | null; onOpenChange: (open: boolean) => void }) {
  const { updateEmployeeEmployment } = usePayrollDemo();
  const [hireDate, setHireDate] = useState(employee?.hireDate ?? localDate());
  const [terminationDate, setTerminationDate] = useState(employee?.terminationDate ?? "");

  if (!employee) return null;
  const employeeId = employee.id;

  function save() {
    if (!hireDate || (terminationDate && terminationDate < hireDate)) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de alta.");
      return;
    }
    updateEmployeeEmployment(employeeId, hireDate, terminationDate || null);
    toast.success(terminationDate ? `Baja registrada al ${terminationDate}; la última quincena se prorrateará.` : "Vigencia laboral actualizada.");
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Vigencia laboral</DialogTitle><DialogDescription>{employee.name} · conserva intactas las nóminas fuera del rango seleccionado.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="employment-start">Fecha de alta</Label><Input id="employment-start" type="date" value={hireDate} onChange={(event) => setHireDate(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="employment-end">Fecha de baja</Label><Input id="employment-end" type="date" min={hireDate} value={terminationDate} onChange={(event) => setTerminationDate(event.target.value)} /></div>
          </div>
          <div className="rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 p-3"><div className="flex gap-3"><UserMinus className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" /><div><p className="text-xs font-semibold">La fecha de baja es inclusiva</p><p className="mt-1 text-[11px] leading-5 text-[color:var(--text-muted)]">Si cae dentro de una quincena, el empleado permanece en esa nómina y el sueldo se calcula únicamente por los días trabajados. Los recibos anteriores no se eliminan.</p></div></div></div>
        </div>
        <DialogFooter><Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button size="sm" onClick={save}><CalendarDays className="mr-1.5 h-3.5 w-3.5" />Guardar vigencia</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeProfileDialog({ employee, onOpenChange }: { employee: DemoEmployee | null; onOpenChange: (open: boolean) => void }) {
  const { state, updateEmployeeProfile } = usePayrollDemo();
  const [name, setName] = useState(employee?.name ?? "");
  const [position, setPosition] = useState(employee?.position ?? "");
  const [category, setCategory] = useState<EmployeeCategory>(employee?.category ?? "SELLER");
  const [branchId, setBranchId] = useState(employee?.branchId ?? state.branches[0]?.id ?? "");
  const [roleId, setRoleId] = useState(employee?.roleId ?? "role-employee");
  const [monthlySalary, setMonthlySalary] = useState(String(employee?.monthlySalary ?? 0));

  if (!employee) return null;
  const employeeId = employee.id;

  function changeCategory(value: EmployeeCategory) {
    setCategory(value);
    if (value !== "MANAGEMENT" && (roleId === "role-manager" || roleId === "role-admin")) setRoleId("role-employee");
  }

  function save() {
    const salary = Number(monthlySalary);
    if (!name.trim() || !position.trim() || !branchId || !roleId || !Number.isFinite(salary) || salary < 0) {
      toast.error("Completa el perfil y captura un sueldo válido.");
      return;
    }
    updateEmployeeProfile(employeeId, {
      name: name.trim(),
      position: position.trim(),
      category,
      branchId,
      roleId,
      monthlySalary: salary,
      ...categoryDefaults[category],
    });
    toast.success(category === "SELLER" ? "Perfil actualizado a Ventas; portal y permisos sincronizados." : "Perfil y accesos actualizados.");
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Editar perfil y acceso</DialogTitle><DialogDescription>Los cambios se reflejan inmediatamente en su portal, nómina y permisos de la demostración.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="profile-name">Nombre</Label><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="profile-position">Puesto</Label><Input id="profile-position" value={position} onChange={(event) => setPosition(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="profile-category">Área de nómina</Label><Select value={category} onValueChange={(value) => changeCategory(value as EmployeeCategory)}><SelectTrigger id="profile-category"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="profile-branch">Sucursal</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger id="profile-branch"><SelectValue /></SelectTrigger><SelectContent>{state.branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="profile-role">Rol de acceso</Label><Select value={roleId} onValueChange={setRoleId}><SelectTrigger id="profile-role"><SelectValue /></SelectTrigger><SelectContent>{state.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="profile-salary">Sueldo mensual</Label><Input id="profile-salary" type="number" min="0" step="100" value={monthlySalary} onChange={(event) => setMonthlySalary(event.target.value)} /></div>
          <div className="flex gap-3 rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 p-3 sm:col-span-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" /><div><p className="text-xs font-semibold">Permisos sincronizados</p><p className="mt-1 text-[10px] leading-4 text-[color:var(--text-muted)]">Si una gerencia pasa a Ventas, deja de ver recibos gerenciales y adopta el rol seleccionado. Su historial como gerente permanece en los esquemas de sucursal.</p></div></div>
        </div>
        <DialogFooter><Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button size="sm" onClick={save}><UserCog className="mr-1.5 h-3.5 w-3.5" />Guardar perfil</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollEmployeesDemo() {
  const { state } = usePayrollDemo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employmentEmployee, setEmploymentEmployee] = useState<DemoEmployee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<DemoEmployee | null>(null);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredEmployees = useMemo(() => state.employees.filter((employee) => {
    const branch = state.branches.find((item) => item.id === employee.branchId);
    const role = state.roles.find((item) => item.id === employee.roleId);
    return !normalizedSearch || `${employee.name} ${employee.position} ${categoryLabels[employee.category]} ${branch?.name ?? ""} ${role?.name ?? ""}`.toLocaleLowerCase("es-MX").includes(normalizedSearch);
  }), [normalizedSearch, state.branches, state.employees, state.roles]);
  const activeEmployees = state.employees.filter((employee) => employee.active).length;
  const branchesCovered = new Set(state.employees.filter((employee) => employee.active).map((employee) => employee.branchId)).size;
  const monthlyFixedCost = state.employees.filter((employee) => employee.active && employee.category !== "SELLER" && employee.category !== "CONTRACTOR").reduce((sum, employee) => sum + employee.monthlySalary, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><Badge variant="outline">DIRECTORIO MOCK</Badge><span className="text-xs text-[color:var(--text-muted)]">Fuente única para la demo de nómina</span></div>
          <h1 className="page-title">Empleados</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Registra personal y define su sucursal, tipo de nómina y acceso inicial. Los cambios se reflejan al instante en Roles y accesos.</p>
        </div>
        <Button size="sm" className="self-start rounded-lg px-3 xl:self-auto" onClick={() => setDialogOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo empleado</Button>
      </header>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardContent className="grid divide-y divide-[color:var(--border-color)] p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { icon: UsersRound, label: "Personal activo", value: activeEmployees, detail: "empleados" },
          { icon: Building2, label: "Cobertura", value: branchesCovered, detail: "sucursales" },
          { icon: CircleDollarSign, label: "Nómina fija mensual", value: money.format(monthlyFixedCost), detail: "mock" },
        ].map(({ icon: Icon, label, value, detail }) => <div key={label} className="flex min-w-0 items-center gap-3 px-4 py-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p><p className="number-display truncate text-lg leading-tight">{value} <span className="text-xs font-normal text-[color:var(--text-muted)]">{detail}</span></p></div></div>)}
      </CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><div className="flex items-center gap-2"><WalletCards className="h-3.5 w-3.5 text-[color:var(--text-secondary)]" /><CardTitle className="text-xs font-semibold uppercase tracking-[0.06em]">Directorio vigente</CardTitle></div><CardDescription className="mt-0.5 text-[11px]">Datos ficticios para cálculo, pagos y control de acceso.</CardDescription></div>
            <div className="relative w-full md:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 bg-[color:var(--bg-card)] pl-8 pr-10 text-[10px]" placeholder="BUSCAR NOMBRE, PUESTO, SUCURSAL O ROL" aria-label="Buscar empleados" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[color:var(--text-muted)]">{filteredEmployees.length}</span></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(130px,1fr)_minmax(135px,1fr)_minmax(145px,1fr)_72px] gap-3 border-b border-[color:var(--border-color)] bg-[color:var(--bg-card)] px-4 py-1.5 text-[8px] font-semibold uppercase tracking-[0.11em] text-[color:var(--text-muted)] md:grid"><span>Empleado / sucursal</span><span>Nómina / acceso</span><span>Pago / cuenta</span><span>Vigencia</span><span></span></div>
          <div className="divide-y divide-[color:var(--border-color)]">
            {filteredEmployees.map((employee) => {
              const branch = state.branches.find((item) => item.id === employee.branchId);
              const role = state.roles.find((item) => item.id === employee.roleId);
              const today = localDate();
              const status = employee.terminationDate && employee.terminationDate < today ? "BAJA" : employee.terminationDate ? "BAJA PROGRAMADA" : employee.hireDate > today ? "ALTA PROGRAMADA" : "ACTIVO";
              return <div key={employee.id} className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-2 transition-colors hover:bg-[color:var(--accent-hover)]/20 md:grid-cols-[minmax(180px,1.4fr)_minmax(130px,1fr)_minmax(135px,1fr)_minmax(145px,1fr)_72px] md:items-center">
                <div className="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c3a583]/45 bg-[#342b23] text-[9px] font-bold text-[#f0d9b8]">{initials(employee.name)}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-[11px] font-semibold">{employee.name}</p><Badge variant="outline" className={`shrink-0 px-1.5 py-0 text-[8px] md:hidden ${employee.active ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-stone-300 text-stone-500"}`}>{employee.active ? "ACTIVO" : "INACTIVO"}</Badge></div><p className="truncate text-[9px] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">{employee.position} · {branch?.name ?? "SIN SUCURSAL"}</p></div></div>
                <div className="min-w-0"><p className="text-[8px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:hidden">Nómina / acceso</p><p className="truncate text-[10px] font-semibold">{categoryLabels[employee.category]}</p><div className="mt-0.5 flex items-center gap-1"><ShieldCheck className="h-3 w-3 shrink-0 text-[#987049]" /><p className="truncate text-[9px] text-[color:var(--text-muted)]">{role?.name ?? "SIN ROL"}</p></div></div>
                <div className="min-w-0"><p className="text-[8px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:hidden">Pago / cuenta</p><p className="number-display truncate text-[11px]">{money.format(employee.monthlySalary)}</p><p className="mt-0.5 truncate text-[9px] text-[color:var(--text-muted)]">{employee.bank} · {employee.account}</p></div>
                <div className="min-w-0"><p className="text-[8px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:hidden">Vigencia</p><div className="flex items-center gap-1.5"><Badge variant="outline" className={`shrink-0 px-1.5 py-0 text-[8px] ${status === "ACTIVO" ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-amber-300 text-amber-700 dark:text-amber-300"}`}>{status === "ACTIVO" ? <BadgeCheck className="mr-1 h-2.5 w-2.5" /> : null}{status}</Badge></div><p className="mt-0.5 truncate text-[9px] text-[color:var(--text-muted)]">{employee.hireDate} → {employee.terminationDate ?? "VIGENTE"}</p></div>
                <div className="flex justify-end gap-0.5"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setProfileEmployee(employee)} aria-label={`Editar perfil de ${employee.name}`} title="Editar perfil y acceso"><UserCog className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEmploymentEmployee(employee)} aria-label={`Editar vigencia de ${employee.name}`} title="Editar alta o baja"><PencilLine className="h-3.5 w-3.5" /></Button></div>
              </div>;
            })}
            {filteredEmployees.length === 0 && <div className="px-4 py-12 text-center"><Search className="mx-auto h-5 w-5 text-[color:var(--text-muted)]" /><p className="mt-2 text-sm font-semibold">Sin coincidencias</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Prueba con otro nombre, puesto, sucursal o rol.</p></div>}
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EmployeeProfileDialog key={profileEmployee?.id ?? "profile-closed"} employee={profileEmployee} onOpenChange={(open) => { if (!open) setProfileEmployee(null); }} />
      <EmploymentDialog key={employmentEmployee?.id ?? "closed"} employee={employmentEmployee} onOpenChange={(open) => { if (!open) setEmploymentEmployee(null); }} />
    </div>
  );
}
