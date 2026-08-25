"use client";

import { useState } from "react";
import { KeyRound, Plus, ShieldCheck, UserCog, UsersRound } from "lucide-react";
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
import { permissionCatalog, usePayrollDemo } from "./payroll-demo-context";

const permissionLabels: Record<string, string> = {
  "dashboard.view": "VER CONSOLIDADO",
  "payroll.create": "CREAR NÓMINA",
  "payroll.approve": "AUTORIZAR / PAGAR NÓMINA",
  "loans.manage": "EDITAR PRÉSTAMOS",
  "loans.approve": "AUTORIZAR PRÉSTAMOS",
  "settings.manage": "CONFIGURAR ESQUEMAS Y BONOS",
  "reports.view": "VER REPORTES POR SUCURSAL",
  "receipts.view": "VER RECIBOS",
};

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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Crear nuevo rol</DialogTitle><DialogDescription>El rol inicia únicamente con permiso para consultar recibos.</DialogDescription></DialogHeader><div className="space-y-2 py-3"><Label htmlFor="role-name">Nombre del rol</Label><Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. SUPERVISOR DE NÓMINA" /></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Crear rol</Button></DialogFooter></DialogContent></Dialog>;
}

export function PayrollAccessDemo() {
  const { state, togglePermission, assignRole } = usePayrollDemo();
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(state.roles[0]?.id ?? "");
  const selectedRole = state.roles.find((role) => role.id === selectedRoleId) ?? state.roles[0];
  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">CONTROL LOCAL</Badge><span className="text-xs text-[color:var(--text-muted)]">Roles y usuarios mock</span></div><h1 className="page-title">Roles y accesos</h1><p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">Define qué puede visualizar o autorizar cada rol y asígnalo a cada empleado.</p></div><Button onClick={() => setRoleOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo rol</Button></header>
      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ROLES CONFIGURADOS</p><p className="number-display mt-2 text-2xl">{state.roles.length}</p></CardContent></Card><Card><CardContent className="p-5"><UsersRound className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">USUARIOS ACTIVOS</p><p className="number-display mt-2 text-2xl">{state.employees.filter((employee) => employee.active).length}</p></CardContent></Card><Card><CardContent className="p-5"><KeyRound className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">PERMISOS DISPONIBLES</p><p className="number-display mt-2 text-2xl">{permissionCatalog.length}</p></CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Roles</CardTitle><CardDescription>Selecciona uno para editar.</CardDescription></CardHeader><CardContent className="space-y-2">{state.roles.map((role) => <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${role.id === selectedRole?.id ? "border-[color:var(--accent)] bg-[color:var(--accent-hover)]" : "border-[color:var(--border-color)] hover:bg-[color:var(--accent-hover)]/40"}`}><span><span className="block text-sm font-semibold">{role.name}</span><span className="text-xs text-[color:var(--text-muted)]">{role.permissions.length} permisos</span></span><UserCog className="h-4 w-4 text-[color:var(--text-secondary)]" /></button>)}</CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Permisos de {selectedRole?.name}</CardTitle><CardDescription>Los cambios se aplican inmediatamente a los usuarios con este rol.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{permissionCatalog.map((permission) => { const checked = selectedRole?.permissions.includes(permission) ?? false; return <button key={permission} type="button" role="switch" aria-checked={checked} onClick={() => selectedRole && togglePermission(selectedRole.id, permission)} className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${checked ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}><span><span className="block text-sm font-semibold">{permissionLabels[permission]}</span><span className="text-xs text-[color:var(--text-muted)]">{permission}</span></span><span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} /></span></button>; })}</CardContent></Card>
      </div>
      <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Acceso por empleado</CardTitle><CardDescription>En el portal personal cada usuario solo ve su información.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{state.employees.map((employee) => <div key={employee.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><p className="font-semibold">{employee.name}</p><p className="mb-3 text-xs text-[color:var(--text-muted)]">{employee.position}</p><Label className="sr-only" htmlFor={`role-${employee.id}`}>Rol</Label><Select value={employee.roleId} onValueChange={(roleId) => { assignRole(employee.id, roleId); toast.success("Rol actualizado."); }}><SelectTrigger id={`role-${employee.id}`}><SelectValue /></SelectTrigger><SelectContent>{state.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></div>)}</CardContent></Card>
      <RoleDialog open={roleOpen} onOpenChange={setRoleOpen} />
    </div>
  );
}
