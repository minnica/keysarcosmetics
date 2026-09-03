"use client";

import { useState } from "react";
import { Check, Crown, Delete, KeyRound, LockKeyhole, LogIn, Plus, Search, ShieldCheck, UserCog, UserRoundCheck, UsersRound } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@cosmetics/ui";
import { type DemoEmployee, permissionCatalog, usePayrollDemo } from "./payroll-demo-context";

const permissionLabels: Record<string, string> = {
  "dashboard.view": "Ver consolidado",
  "payroll.create": "Crear nómina",
  "payroll.approve": "Autorizar y pagar nómina",
  "loans.manage": "Editar préstamos",
  "loans.approve": "Autorizar préstamos",
  "settings.manage": "Configurar esquemas y bonos",
  "reports.view": "Ver reportes por sucursal",
  "receipts.view": "Ver recibos",
  "portal.view": "Entrar al portal personal",
  "movements.master": "Modificar bonos y multas",
  "viatics.master": "Configurar y autorizar viáticos",
  "security.second_key.manage": "Administrar segundas claves",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

function RoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addRole } = usePayrollDemo();
  const [name, setName] = useState("");

  function submit() {
    if (!name.trim()) return;
    addRole(name);
    setName("");
    toast.success("Rol creado. Ya puedes configurar sus permisos.");
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Crear nuevo rol</DialogTitle><DialogDescription>El rol inicia únicamente con permiso para consultar recibos.</DialogDescription></DialogHeader><div className="space-y-2 py-3"><Label htmlFor="role-name">Nombre del rol</Label><Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. SUPERVISOR DE NÓMINA" /></div><DialogFooter><Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button size="sm" onClick={submit}>Crear rol</Button></DialogFooter></DialogContent></Dialog>;
}

function SecondaryKeyDialog({ employee, actorName, onOpenChange }: { employee: DemoEmployee | null; actorName: string; onOpenChange: (open: boolean) => void }) {
  const { setEmployeeSecondaryAccessKey } = usePayrollDemo();
  const [phase, setPhase] = useState<"NEW" | "CONFIRM">("NEW");
  const [code, setCode] = useState("");
  const [firstCode, setFirstCode] = useState("");

  if (!employee) return null;
  const employeeId = employee.id;
  const employeeName = employee.name;

  function addDigit(digit: string) {
    setCode((current) => current.length < 4 ? `${current}${digit}` : current);
  }

  function continueOrSave() {
    if (code.length !== 4) {
      toast.error("La segunda clave debe tener cuatro dígitos.");
      return;
    }
    if (phase === "NEW") {
      setFirstCode(code);
      setCode("");
      setPhase("CONFIRM");
      return;
    }
    if (code !== firstCode) {
      toast.error("Las claves no coinciden. Captúrala nuevamente.");
      setCode("");
      return;
    }
    setEmployeeSecondaryAccessKey(employeeId, code, actorName);
    toast.success(`Segunda clave actualizada para ${employeeName}.`);
    onOpenChange(false);
  }

  return <Dialog open onOpenChange={onOpenChange}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{employee.secondaryAccessKey ? "Cambiar segunda clave" : "Asignar segunda clave"}</DialogTitle><DialogDescription>{phase === "NEW" ? `Crea una clave privada de cuatro dígitos para ${employee.name}.` : "Vuelve a capturar la clave para confirmarla."}</DialogDescription></DialogHeader><div className="py-2"><div className="rounded-2xl border border-[#c9aa88]/40 bg-[color:var(--accent-hover)]/25 p-4"><div className="flex items-center justify-between gap-3"><Label htmlFor="employee-secondary-key" className="text-[10px] font-semibold uppercase tracking-[0.12em]">{phase === "NEW" ? "Nueva clave" : "Confirmación"}</Label><Badge variant="outline" className="text-[8px]">TECLADO PRIVADO</Badge></div><Input id="employee-secondary-key" name="employee-secondary-key-private" type="password" value={code} readOnly autoComplete="off" data-1p-ignore="true" data-lpignore="true" className="mt-3 h-11 text-center text-lg tracking-[0.5em]" aria-label="Segunda clave capturada con teclado privado" /><div className="mt-3 grid grid-cols-3 gap-2">{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => <button key={digit} type="button" onClick={() => addDigit(digit)} className="h-9 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-card)] text-xs font-semibold shadow-sm hover:border-[#9b744f]">{digit}</button>)}<button type="button" onClick={() => setCode("")} className="h-9 rounded-lg border border-[color:var(--border-color)] text-[9px] font-semibold uppercase text-[color:var(--text-muted)]">Limpiar</button><button type="button" onClick={() => addDigit("0")} className="h-9 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-card)] text-xs font-semibold shadow-sm hover:border-[#9b744f]">0</button><button type="button" onClick={() => setCode((current) => current.slice(0, -1))} className="flex h-9 items-center justify-center rounded-lg border border-[color:var(--border-color)] text-[color:var(--text-muted)]" aria-label="Borrar último dígito"><Delete className="h-3.5 w-3.5" /></button></div></div><div className="mt-3 flex gap-2 rounded-xl border border-emerald-300/50 bg-emerald-50/60 p-3 dark:bg-emerald-950/20"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p className="text-[10px] leading-4 text-[color:var(--text-muted)]">La clave no se muestra después de guardarse y no utiliza el campo de contraseñas del navegador.</p></div></div><DialogFooter><Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button size="sm" onClick={continueOrSave}>{phase === "NEW" ? "Continuar" : "Guardar clave"}</Button></DialogFooter></DialogContent></Dialog>;
}

export function PayrollAccessDemo() {
  const { state, togglePermission, assignRole, setActiveEmployee } = usePayrollDemo();
  const [roleOpen, setRoleOpen] = useState(false);
  const [secondaryKeyEmployee, setSecondaryKeyEmployee] = useState<DemoEmployee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(state.roles[0]?.id ?? "");
  const selectedRole = state.roles.find((role) => role.id === selectedRoleId) ?? state.roles[0];
  const selectedIsMaster = selectedRole?.id === "role-admin";
  const activeEmployee = state.employees.find((employee) => employee.id === state.activeEmployeeId);
  const activeRole = state.roles.find((role) => role.id === activeEmployee?.roleId);
  const canManageSecondKeys = activeRole?.id === "role-admin" || activeRole?.permissions.includes("security.second_key.manage") === true;
  const activeUsers = state.employees.filter((employee) => employee.active).length;
  const normalizedEmployeeSearch = employeeSearch.trim().toLocaleLowerCase("es-MX");
  const filteredEmployees = state.employees.filter((employee) => {
    const role = state.roles.find((item) => item.id === employee.roleId);
    return !normalizedEmployeeSearch || `${employee.name} ${employee.position} ${role?.name ?? ""}`.toLocaleLowerCase("es-MX").includes(normalizedEmployeeSearch);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">CONTROL DE IDENTIDAD</Badge><span className="text-xs text-[color:var(--text-muted)]">Accesos locales con mocks</span></div><h1 className="page-title">Roles y accesos</h1><p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">Administra privilegios y el acceso personal de cada empleado desde una sola vista.</p></div>
        <Button size="sm" className="self-start rounded-lg px-3 xl:self-auto" onClick={() => setRoleOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo rol</Button>
      </header>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardContent className="grid divide-y divide-[color:var(--border-color)] p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { icon: ShieldCheck, label: "Roles", value: state.roles.length, detail: "configurados" },
          { icon: UsersRound, label: "Usuarios", value: activeUsers, detail: "activos" },
          { icon: KeyRound, label: "Permisos", value: permissionCatalog.length, detail: "disponibles" },
        ].map(({ icon: Icon, label, value, detail }) => <div key={label} className="flex items-center gap-3 px-4 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p><p className="number-display text-lg leading-tight">{value} <span className="text-xs font-normal text-[color:var(--text-muted)]">{detail}</span></p></div></div>)}
      </CardContent></Card>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="border-[color:var(--border-color)]"><CardHeader className="pb-3"><CardTitle className="section-heading uppercase">Roles</CardTitle><CardDescription>Selecciona un perfil.</CardDescription></CardHeader><CardContent className="space-y-1.5">
          {state.roles.map((role) => { const active = role.id === selectedRole?.id; const isMaster = role.id === "role-admin"; return <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${active ? "border-[#b99568] bg-[#b99568]/12 shadow-sm" : "border-transparent hover:border-[color:var(--border-color)] hover:bg-[color:var(--accent-hover)]/35"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isMaster ? "bg-[linear-gradient(135deg,#342b23,#8a6744)] text-[#f3dfbd]" : "bg-[color:var(--accent-hover)] text-[color:var(--text-secondary)]"}`}>{isMaster ? <Crown className="h-3.5 w-3.5" /> : <UserCog className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{role.name}</span><span className="block text-[10px] text-[color:var(--text-muted)]">{role.permissions.length} permisos</span></span>{active && <Check className="h-3.5 w-3.5 text-[#9a744c]" />}</button>; })}
        </CardContent></Card>

        <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className={`border-b border-[color:var(--border-color)] pb-3 ${selectedIsMaster ? "bg-[linear-gradient(120deg,rgba(52,43,35,0.98),rgba(111,82,55,0.94))] text-white" : "bg-[color:var(--accent-hover)]/20"}`}><div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><CardTitle className={`section-heading uppercase ${selectedIsMaster ? "text-[#f4e6d1]" : ""}`}>Permisos · {selectedRole?.name}</CardTitle>{selectedIsMaster && <Badge className="border border-[#d8b98e]/40 bg-[#d8b98e]/15 text-[#f4dfc0]">MÁSTER</Badge>}</div><CardDescription className={selectedIsMaster ? "text-[#d7c7b5]" : ""}>Los cambios se aplican inmediatamente a los empleados asignados.</CardDescription></div><LockKeyhole className={`hidden h-5 w-5 sm:block ${selectedIsMaster ? "text-[#e6c99f]" : "text-[color:var(--text-secondary)]"}`} /></div></CardHeader><CardContent className="grid gap-2 p-4 md:grid-cols-2 2xl:grid-cols-3">
          {permissionCatalog.map((permission) => { const checked = selectedRole?.permissions.includes(permission) ?? false; const protectedMasterPermission = selectedIsMaster && permission === "security.second_key.manage"; return <button key={permission} type="button" role="switch" aria-checked={checked} disabled={protectedMasterPermission} onClick={() => selectedRole && togglePermission(selectedRole.id, permission)} className={`flex min-h-[54px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-px hover:shadow-sm disabled:cursor-not-allowed disabled:hover:translate-y-0 ${checked ? "border-emerald-300/80 bg-emerald-50/70 dark:bg-emerald-950/20" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${checked ? "bg-emerald-600 text-white" : "bg-[color:var(--accent-hover)] text-[color:var(--text-muted)]"}`}>{checked ? <Check className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold leading-tight">{permissionLabels[permission] ?? permission}</span><span className="mt-0.5 block truncate text-[9px] text-[color:var(--text-muted)]">{protectedMasterPermission ? "PROTEGIDO PARA EL MÁSTER" : permission}</span></span><span aria-hidden="true" className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[17px]" : "translate-x-0.5"}`} /></span></button>; })}
        </CardContent></Card>
      </div>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className="border-b border-[color:var(--border-color)] bg-[linear-gradient(110deg,rgba(52,43,35,0.98),rgba(111,82,55,0.94))] pb-3 text-white"><div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#e7c69d]" /><CardTitle className="section-heading uppercase text-[#f5e9da]">Segunda clave de acceso</CardTitle></div><CardDescription className="text-[#d8c9b8]">Verificación separada del autollenado del navegador. La clave guardada nunca se muestra.</CardDescription></div><Badge className="border border-[#d8b98e]/40 bg-[#d8b98e]/15 text-[#f4dfc0]">{canManageSecondKeys ? "CONTROL AUTORIZADO" : "SOLO LECTURA"}</Badge></div></CardHeader><CardContent className="p-0"><div className="hidden grid-cols-[minmax(240px,1fr)_150px_minmax(180px,1fr)_44px] gap-4 border-b border-[color:var(--border-color)] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] lg:grid"><span>Empleado</span><span>Estado</span><span>Última actualización</span><span></span></div><div className="divide-y divide-[color:var(--border-color)]">{filteredEmployees.map((employee) => <div key={`second-key-${employee.id}`} className="grid gap-2 px-4 py-2.5 lg:grid-cols-[minmax(240px,1fr)_150px_minmax(180px,1fr)_44px] lg:items-center lg:gap-4"><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{employee.name}</p><p className="truncate text-[9px] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">{state.roles.find((role) => role.id === employee.roleId)?.name ?? "SIN ROL"}</p></div><div><Badge variant="outline" className={`text-[8px] ${employee.secondaryAccessKey ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-amber-300 text-amber-700 dark:text-amber-300"}`}>{employee.secondaryAccessKey ? "CONFIGURADA" : "PENDIENTE"}</Badge></div><p className="text-[9px] text-[color:var(--text-muted)]">{employee.secondaryAccessKeyUpdatedAt ? `${new Date(employee.secondaryAccessKeyUpdatedAt).toLocaleDateString("es-MX")} · ${employee.secondaryAccessKeyUpdatedBy ?? "USUARIO MASTER"}` : "SIN ASIGNACIÓN"}</p><div className="flex justify-end"><Button size="icon" variant="ghost" className="h-8 w-8" disabled={!canManageSecondKeys} onClick={() => setSecondaryKeyEmployee(employee)} aria-label={`${employee.secondaryAccessKey ? "Cambiar" : "Asignar"} segunda clave de ${employee.name}`} title={canManageSecondKeys ? employee.secondaryAccessKey ? "Cambiar segunda clave" : "Asignar segunda clave" : "Requiere permiso para administrar segundas claves"}><KeyRound className="h-3.5 w-3.5" /></Button></div></div>)}</div></CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 pb-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-[color:var(--text-secondary)]" /><CardTitle className="section-heading uppercase">Acceso por empleado</CardTitle></div><CardDescription>Asigna el rol y activa la sesión personal. Cada usuario verá únicamente su propia información.</CardDescription></div><div className="relative w-full lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} className="h-9 bg-[color:var(--bg-card)] pl-9 pr-12 text-xs" placeholder="BUSCAR EMPLEADO, PUESTO O ROL" aria-label="Buscar acceso por empleado" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[color:var(--text-muted)]">{filteredEmployees.length}</span></div></div></CardHeader><CardContent className="p-0">
        <div className="hidden grid-cols-[minmax(260px,1fr)_220px_130px_44px] gap-4 border-b border-[color:var(--border-color)] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] lg:grid"><span>Empleado</span><span>Rol asignado</span><span>Portal</span><span className="text-right">Acción</span></div>
        <div className="divide-y divide-[color:var(--border-color)]">{filteredEmployees.map((employee) => { const role = state.roles.find((item) => item.id === employee.roleId); const canEnter = role?.permissions.includes("portal.view") ?? false; const isActive = state.activeEmployeeId === employee.id; return <div key={employee.id} className={`grid gap-3 px-4 py-3 transition-colors lg:grid-cols-[minmax(260px,1fr)_220px_130px_44px] lg:items-center lg:gap-4 ${isActive ? "bg-[linear-gradient(90deg,rgba(195,165,131,0.16),rgba(100,134,114,0.08))]" : "hover:bg-[color:var(--accent-hover)]/20"}`}><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold ${isActive ? "border-[#b99568] bg-[#342b23] text-[#f0d9b8] shadow-sm" : "border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 text-[color:var(--text-secondary)]"}`}>{initials(employee.name)}</span><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-xs font-semibold">{employee.name}</p>{isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.7)]" title="Sesión activa" />}</div><p className="truncate text-[10px] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">{employee.position}</p></div></div><div><Label className="sr-only" htmlFor={`role-${employee.id}`}>Rol</Label><Select value={employee.roleId} onValueChange={(roleId) => { assignRole(employee.id, roleId); toast.success("Rol actualizado."); }}><SelectTrigger id={`role-${employee.id}`} className="h-8 rounded-lg text-[11px]"><SelectValue /></SelectTrigger><SelectContent>{state.roles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Badge variant="outline" className={`text-[9px] ${canEnter ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-stone-300 text-stone-500"}`}>{canEnter ? "PORTAL HABILITADO" : "SIN PORTAL"}</Badge></div><div className="flex justify-end"><Button size="icon" className="h-8 w-8 rounded-lg" variant={isActive ? "outline" : "default"} disabled={!canEnter || isActive} aria-label={isActive ? `${employee.name} es el usuario activo` : `Entrar como ${employee.name}`} title={!canEnter ? "El rol no tiene acceso al portal" : isActive ? "Usuario activo" : "Entrar como usuario"} onClick={() => { setActiveEmployee(employee.id); toast.success(`Sesión personal iniciada como ${employee.name}.`); }}>{isActive ? <Check className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}</Button></div></div>; })}{filteredEmployees.length === 0 && <div className="px-4 py-10 text-center"><Search className="mx-auto h-5 w-5 text-[color:var(--text-muted)]" /><p className="mt-2 text-sm font-semibold">Sin coincidencias</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Prueba con otro nombre, puesto o rol.</p></div>}</div>
      </CardContent></Card>

      <RoleDialog open={roleOpen} onOpenChange={setRoleOpen} />
      <SecondaryKeyDialog key={secondaryKeyEmployee?.id ?? "closed"} employee={secondaryKeyEmployee} actorName={activeEmployee?.name ?? "USUARIO MASTER"} onOpenChange={(open) => { if (!open) setSecondaryKeyEmployee(null); }} />
    </div>
  );
}
