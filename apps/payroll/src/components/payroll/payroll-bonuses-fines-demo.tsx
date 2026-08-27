"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  CheckCheck,
  Edit3,
  Gavel,
  Plus,
  ShieldCheck,
  Sparkles,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@cosmetics/ui";
import {
  type DemoMovement,
  type MovementMode,
  type MovementStatus,
  type MovementType,
  usePayrollDemo,
} from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const statusLabels: Record<MovementStatus, string> = {
  DRAFT: "BORRADOR",
  PENDING: "POR APROBAR",
  APPROVED: "APROBADO",
  REJECTED: "RECHAZADO",
  CANCELLED: "CANCELADO",
};

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function BonusFineDialog({
  movement,
  defaultType,
  open,
  onOpenChange,
}: {
  movement: DemoMovement | null;
  defaultType: MovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, currentPeriod, addMovement, updateMovement } = usePayrollDemo();
  const [employeeId, setEmployeeId] = useState(movement?.employeeId ?? state.employees[0]?.id ?? "");
  const [type, setType] = useState<MovementType>(movement?.type ?? defaultType);
  const [concept, setConcept] = useState(movement?.concept ?? "");
  const [amount, setAmount] = useState(String(movement?.amount ?? ""));
  const [mode, setMode] = useState<MovementMode>(movement?.mode ?? "FIXED");
  const [threshold, setThreshold] = useState(String(movement?.threshold ?? ""));
  const [periodStart, setPeriodStart] = useState(movement?.periodStart ?? currentPeriod.start);
  const periodChoices = Array.from(new Map(state.periodConfigs.map((config) => [config.periodStart, config])).values());

  function submit() {
    const parsedAmount = Number(amount);
    const parsedThreshold = Number(threshold);
    if (!employeeId || !concept.trim() || parsedAmount <= 0 || (mode === "SCALE" && parsedThreshold <= 0)) {
      toast.error("Completa empleado, concepto, monto y regla del movimiento.");
      return;
    }
    const input = {
      employeeId,
      type,
      mode,
      concept: concept.trim().toLocaleUpperCase("es-MX"),
      amount: parsedAmount,
      threshold: mode === "SCALE" ? parsedThreshold : null,
      periodStart,
    };
    if (movement) {
      updateMovement(movement.id, input);
      toast.success("Movimiento modificado; regresó a borrador.");
    } else {
      addMovement({ ...input, status: "DRAFT" });
      toast.success("Movimiento creado como borrador.");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{movement ? "Modificar bono o multa" : "Nuevo bono o multa"}</DialogTitle>
          <DialogDescription>El usuario master debe aceptar y aprobar el registro antes de afectar la nómina.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Tipo</Label><Select value={type} onValueChange={(value) => setType(value as MovementType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BONUS">BONO</SelectItem><SelectItem value="FINE">MULTA</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Periodo de nómina</Label><Select value={periodStart} onValueChange={setPeriodStart}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{periodChoices.map((config) => <SelectItem key={config.periodStart} value={config.periodStart}>{config.periodStart} — {config.periodEnd}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Tipo de cálculo</Label><Select value={mode} onValueChange={(value) => setMode(value as MovementMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FIXED">MONTO FIJO</SelectItem><SelectItem value="SCALE">POR ESCALA DE VENTAS</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="bonus-fine-concept">Concepto</Label><Textarea id="bonus-fine-concept" value={concept} onChange={(event) => setConcept(event.target.value)} placeholder={type === "BONUS" ? "BONO DE PRODUCTIVIDAD" : "MULTA POR INCIDENCIA"} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="bonus-fine-amount">Monto</Label><Input id="bonus-fine-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            {mode === "SCALE" && <div className="space-y-2"><Label htmlFor="bonus-fine-threshold">Venta mínima para activarse</Label><Input id="bonus-fine-threshold" type="number" min="0" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></div>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>{movement ? "Guardar modificación" : "Crear borrador"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionIcon({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label={label} {...props}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export function PayrollBonusesFinesDemo() {
  const { state, setMovementStatus } = usePayrollDemo();
  const activeEmployee = state.employees.find((employee) => employee.id === state.activeEmployeeId);
  const activeRole = state.roles.find((role) => role.id === activeEmployee?.roleId);
  const isMaster = activeRole?.id === "role-admin" && activeRole.permissions.includes("movements.master");
  const today = localToday();
  const [dailyOnly, setDailyOnly] = useState(true);
  const [dateFilter, setDateFilter] = useState(today);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "ALL">("ALL");
  const [dialog, setDialog] = useState<{ movement: DemoMovement | null; type: MovementType } | null>(null);

  const rows = useMemo(() => state.movements
    .filter((movement) => !dailyOnly || movement.createdAt === dateFilter)
    .filter((movement) => typeFilter === "ALL" || movement.type === typeFilter)
    .filter((movement) => {
      const employee = state.employees.find((item) => item.id === movement.employeeId);
      const query = search.trim().toLocaleLowerCase("es-MX");
      return !query || employee?.name.toLocaleLowerCase("es-MX").includes(query) || movement.concept.toLocaleLowerCase("es-MX").includes(query);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [dailyOnly, dateFilter, search, state.employees, state.movements, typeFilter]);

  const approved = state.movements.filter((movement) => movement.status === "APPROVED");
  const approvedBonuses = approved.filter((movement) => movement.type === "BONUS").reduce((sum, movement) => sum + movement.amount, 0);
  const approvedFines = approved.filter((movement) => movement.type === "FINE").reduce((sum, movement) => sum + movement.amount, 0);
  const pending = state.movements.filter((movement) => movement.status === "DRAFT" || movement.status === "PENDING").length;
  const branchTotals = state.branches.map((branch) => ({
    branch,
    total: approved.filter((movement) => state.employees.find((employee) => employee.id === movement.employeeId)?.branchId === branch.id).reduce((sum, movement) => sum + movement.amount, 0),
  }));
  const maxBranchTotal = Math.max(...branchTotals.map((item) => item.total), 1);

  function changeStatus(movement: DemoMovement, status: MovementStatus) {
    if (!isMaster) {
      toast.error("Solo el usuario master puede modificar el flujo.");
      return;
    }
    setMovementStatus(movement.id, status);
    if (status === "PENDING") toast.info("Movimiento aceptado y enviado a aprobación.");
    if (status === "APPROVED") toast.success("Movimiento aprobado y aplicado a la nómina.");
    if (status === "CANCELLED") toast.info("Movimiento cancelado.");
  }

  return (
    <TooltipProvider>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">SUBMENÚ INDEPENDIENTE</Badge><span className="text-xs text-[color:var(--text-muted)]">Configuración e historial</span></div><h1 className="page-title">Bonos y multas</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Dashboard, movimientos del día e historial completo de conceptos fijos o por escala.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!isMaster} onClick={() => setDialog({ movement: null, type: "FINE" })}><Gavel className="mr-2 h-4 w-4" />Nueva multa</Button><Button disabled={!isMaster} onClick={() => setDialog({ movement: null, type: "BONUS" })}><Plus className="mr-2 h-4 w-4" />Nuevo bono</Button></div>
        </header>

        <div className={`rounded-xl border p-4 text-sm ${isMaster ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/25 dark:text-amber-100"}`}><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><strong>{isMaster ? "SESIÓN MASTER: MODIFICACIONES HABILITADAS" : "MODO CONSULTA"}</strong></div><p className="mt-1 text-xs">{isMaster ? `Acceso activo: ${activeEmployee?.name}.` : "Solo el usuario con rol USUARIO MASTER puede aceptar, cancelar, modificar o aprobar."}</p></div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><CalendarDays className="h-5 w-5 text-sky-600" /><p className="label-caps mt-4">MOVIMIENTOS DEL DÍA</p><p className="number-display mt-2 text-2xl">{state.movements.filter((item) => item.createdAt === today).length}</p></CardContent></Card>
          <Card><CardContent className="p-5"><Sparkles className="h-5 w-5 text-emerald-600" /><p className="label-caps mt-4">BONOS APROBADOS</p><p className="number-display mt-2 text-2xl">{money.format(approvedBonuses)}</p></CardContent></Card>
          <Card><CardContent className="p-5"><Gavel className="h-5 w-5 text-rose-600" /><p className="label-caps mt-4">MULTAS APROBADAS</p><p className="number-display mt-2 text-2xl">{money.format(approvedFines)}</p></CardContent></Card>
          <Card><CardContent className="p-5"><CheckCheck className="h-5 w-5 text-amber-600" /><p className="label-caps mt-4">EN FLUJO</p><p className="number-display mt-2 text-2xl">{pending}</p></CardContent></Card>
        </div>

        <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Dashboard por sucursal</CardTitle><CardDescription>Importe aprobado de bonos y multas distribuido por sucursal del empleado.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-3">{branchTotals.map(({ branch, total }) => <div key={branch.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><div className="flex items-center justify-between gap-3"><strong>{branch.name}</strong><span className="number-display text-sm">{money.format(total)}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${(total / maxBranchTotal) * 100}%` }} /></div></div>)}</CardContent></Card>

        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><CardTitle>Historial de movimientos</CardTitle><CardDescription>{dailyOnly ? `Mostrando únicamente ${dateFilter}.` : "Mostrando el historial completo."}</CardDescription></div><div className="grid gap-2 sm:grid-cols-4"><Button variant={dailyOnly ? "default" : "outline"} onClick={() => setDailyOnly((current) => !current)}>{dailyOnly ? "SOLO EL DÍA" : "TODO EL HISTORIAL"}</Button><Input type="date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setDailyOnly(true); }} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="BUSCAR" /><Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as MovementType | "ALL")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">BONOS Y MULTAS</SelectItem><SelectItem value="BONUS">SOLO BONOS</SelectItem><SelectItem value="FINE">SOLO MULTAS</SelectItem></SelectContent></Select></div></div></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>FECHA</TableHead><TableHead>TIPO / CONCEPTO</TableHead><TableHead>EMPLEADO</TableHead><TableHead>REGLA</TableHead><TableHead className="text-right">MONTO</TableHead><TableHead>ESTATUS</TableHead><TableHead className="text-right">ACCIONES MASTER</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-[color:var(--text-muted)]">No hay movimientos para esta vista.</TableCell></TableRow> : rows.map((movement) => { const employee = state.employees.find((item) => item.id === movement.employeeId); return <TableRow key={movement.id}><TableCell>{movement.createdAt}</TableCell><TableCell><p className="font-semibold">{movement.type === "BONUS" ? "BONO" : "MULTA"}</p><p className="text-xs text-[color:var(--text-muted)]">{movement.concept}</p></TableCell><TableCell>{employee?.name}</TableCell><TableCell>{movement.mode === "FIXED" ? "MONTO FIJO" : `VENTA ≥ ${money.format(movement.threshold ?? 0)}`}</TableCell><TableCell className={`number-display text-right ${movement.type === "BONUS" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{movement.type === "BONUS" ? "+" : "−"}{money.format(movement.amount)}</TableCell><TableCell><Badge variant="outline">{statusLabels[movement.status]}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><ActionIcon label="Aceptar y enviar a aprobación" disabled={!isMaster || movement.status !== "DRAFT"} onClick={() => changeStatus(movement, "PENDING")}><Check className="h-4 w-4 text-emerald-600" /></ActionIcon><ActionIcon label="Cancelar" disabled={!isMaster || movement.status === "CANCELLED"} onClick={() => changeStatus(movement, "CANCELLED")}><XCircle className="h-4 w-4 text-rose-600" /></ActionIcon><ActionIcon label="Modificar" disabled={!isMaster || movement.status === "CANCELLED"} onClick={() => setDialog({ movement, type: movement.type })}><Edit3 className="h-4 w-4" /></ActionIcon><ActionIcon label="Aprobar" disabled={!isMaster || movement.status !== "PENDING"} onClick={() => changeStatus(movement, "APPROVED")}><CheckCheck className="h-4 w-4" /></ActionIcon></div></TableCell></TableRow>; })}</TableBody></Table></div></CardContent>
        </Card>

        {dialog && <BonusFineDialog key={dialog.movement?.id ?? `new-${dialog.type}`} movement={dialog.movement} defaultType={dialog.type} open onOpenChange={(open) => { if (!open) setDialog(null); }} />}
      </div>
    </TooltipProvider>
  );
}
