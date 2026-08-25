"use client";

import { useState } from "react";
import { BadgeDollarSign, CalendarRange, Gavel, Plus, Settings2, ShieldPlus, SlidersHorizontal, UserPlus } from "lucide-react";
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
  toast,
} from "@cosmetics/ui";
import {
  type MovementMode,
  type MovementType,
  type PayrollModule,
  type PayrollPeriodFrequency,
  payrollModuleLabels,
  periodFromFrequency,
  usePayrollDemo,
} from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function SchemeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addScheme } = usePayrollDemo();
  const [name, setName] = useState("");
  const [firstCut, setFirstCut] = useState("30000");
  const [secondCut, setSecondCut] = useState("50000");
  const [rates, setRates] = useState(["4", "6", "8"]);

  function submit() {
    const cut1 = Number(firstCut);
    const cut2 = Number(secondCut);
    const parsedRates = rates.map(Number);
    if (!name.trim() || cut1 <= 0 || cut2 <= cut1 || parsedRates.some((rate) => rate < 0 || rate > 100)) {
      toast.error("Revisa el nombre, los cortes y porcentajes del esquema.");
      return;
    }
    const [rateOne = 0, rateTwo = 0, rateThree = 0] = parsedRates;
    addScheme(name.trim(), [
      { from: 0, to: cut1 - 0.01, rate: rateOne / 100 },
      { from: cut1, to: cut2 - 0.01, rate: rateTwo / 100 },
      { from: cut2, to: null, rate: rateThree / 100 },
    ]);
    toast.success("Esquema de comisión creado.");
    setName("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuevo esquema por escala</DialogTitle><DialogDescription>Configura cortes de venta y el porcentaje que se aplicará en cada nivel.</DialogDescription></DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2"><Label htmlFor="scheme-name">Nombre del esquema</Label><Input id="scheme-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="EJ. ESCALA VENDEDORES PREMIUM" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="cut-one">Segundo nivel desde</Label><Input id="cut-one" type="number" min="0" step="0.01" value={firstCut} onChange={(event) => setFirstCut(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="cut-two">Tercer nivel desde</Label><Input id="cut-two" type="number" min="0" step="0.01" value={secondCut} onChange={(event) => setSecondCut(event.target.value)} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["NIVEL INICIAL", "NIVEL MEDIO", "SIN LÍMITE"].map((label, index) => (
              <div key={label} className="space-y-2 rounded-xl border border-[color:var(--border-color)] p-4">
                <Label htmlFor={`rate-${index}`}>{label} · COMISIÓN %</Label>
                <Input id={`rate-${index}`} type="number" min="0" max="100" step="0.1" value={rates[index]} onChange={(event) => setRates((current) => current.map((rate, rateIndex) => rateIndex === index ? event.target.value : rate))} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar esquema</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, assignScheme } = usePayrollDemo();
  const sellers = state.employees.filter((employee) => employee.category === "SELLER");
  const [employeeId, setEmployeeId] = useState(sellers[0]?.id ?? "");
  const [schemeId, setSchemeId] = useState(state.schemes[0]?.id ?? "");
  function submit() {
    if (!employeeId || !schemeId) return;
    assignScheme(employeeId, schemeId);
    toast.success("Esquema asignado al empleado.");
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Asignar esquema</DialogTitle><DialogDescription>La asignación se refleja de inmediato en la vista de vendedores.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sellers.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Esquema</Label><Select value={schemeId} onValueChange={setSchemeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.schemes.filter((scheme) => scheme.active).map((scheme) => <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Asignar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ type, open, onOpenChange }: { type: MovementType; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, currentPeriod, addMovement } = usePayrollDemo();
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<MovementMode>("FIXED");
  const [threshold, setThreshold] = useState("");

  function submit() {
    const parsedAmount = Number(amount);
    if (!employeeId || !concept.trim() || parsedAmount <= 0 || (mode === "SCALE" && Number(threshold) <= 0)) {
      toast.error("Completa los datos del movimiento.");
      return;
    }
    addMovement({
      employeeId,
      type,
      mode,
      concept: concept.toLocaleUpperCase("es-MX"),
      amount: parsedAmount,
      threshold: mode === "SCALE" ? Number(threshold) : null,
      periodStart: currentPeriod.start,
      status: "PENDING",
    });
    toast.success(`${type === "BONUS" ? "Bono" : "Multa"} creado y enviado a autorización.`);
    setConcept("");
    setAmount("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{type === "BONUS" ? "Crear bono" : "Crear multa"}</DialogTitle><DialogDescription>El movimiento queda pendiente hasta que un usuario autorizado lo apruebe.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Empleado</Label><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{state.employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor={`${type}-concept`}>Concepto</Label><Input id={`${type}-concept`} value={concept} onChange={(event) => setConcept(event.target.value)} placeholder={type === "BONUS" ? "BONO DE PRODUCTIVIDAD" : "DESCUENTO AUTORIZADO"} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Tipo de cálculo</Label><Select value={mode} onValueChange={(value) => setMode(value as MovementMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FIXED">MONTO FIJO</SelectItem><SelectItem value="SCALE">POR ESCALA DE VENTA</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor={`${type}-amount`}>Monto</Label><Input id={`${type}-amount`} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          </div>
          {mode === "SCALE" && <div className="space-y-2"><Label htmlFor={`${type}-threshold`}>Se activa al vender desde</Label><Input id={`${type}-threshold`} type="number" min="0" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Guardar y solicitar autorización</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollSettingsDemo() {
  const { state, currentPeriod, setMovementStatus, resetDemo } = usePayrollDemo();
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const periodMovements = state.movements.filter((movement) => movement.periodStart === currentPeriod.start);

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">DEMO FRONTEND</Badge><span className="text-xs text-[color:var(--text-muted)]">Configuración local</span></div><h1 className="page-title">Configuración de nómina</h1><p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">Administra escalas, asignaciones, bonos fijos o por venta y multas.</p></div>
        <Button variant="outline" onClick={() => { resetDemo(); toast.success("Datos demo restaurados."); }}><Settings2 className="mr-2 h-4 w-4" />Restaurar demostración</Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[color:var(--border-color)]"><CardContent className="p-5"><SlidersHorizontal className="h-5 w-5 text-[color:var(--text-secondary)]" /><h2 className="mt-4 font-semibold">Esquemas de comisión</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">Crea escalas continuas por monto de ventas.</p><Button className="mt-5 w-full" onClick={() => setSchemeOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo esquema</Button></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardContent className="p-5"><UserPlus className="h-5 w-5 text-[color:var(--text-secondary)]" /><h2 className="mt-4 font-semibold">Asignar a empleado</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">Vincula una escala a cada vendedor.</p><Button className="mt-5 w-full" variant="outline" onClick={() => setAssignmentOpen(true)}>Configurar asignación</Button></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardContent className="p-5"><div className="flex gap-2"><BadgeDollarSign className="h-5 w-5 text-emerald-600" /><Gavel className="h-5 w-5 text-rose-600" /></div><h2 className="mt-4 font-semibold">Bonos y multas</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">Monto fijo o activado por escala.</p><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setMovementType("BONUS")}>Nuevo bono</Button><Button variant="outline" onClick={() => setMovementType("FINE")}>Nueva multa</Button></div></CardContent></Card>
      </div>

      <Card className="border-[color:var(--border-color)]">
        <CardHeader><CardTitle className="section-heading uppercase">Escalas configuradas</CardTitle><CardDescription>El porcentaje se selecciona según la venta total de la quincena.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {state.schemes.map((scheme) => <div key={scheme.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{scheme.name}</p><Badge variant="outline">ACTIVO</Badge></div><div className="mt-4 space-y-2">{scheme.tiers.map((tier) => <div key={tier.id} className="flex items-center justify-between rounded-lg bg-[color:var(--accent-hover)]/45 px-3 py-2 text-sm"><span>{money.format(tier.from)} — {tier.to === null ? "SIN LÍMITE" : money.format(tier.to)}</span><strong>{(tier.rate * 100).toFixed(1)}%</strong></div>)}</div></div>)}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader><CardTitle className="section-heading uppercase">Bonos y multas del periodo</CardTitle><CardDescription>Autorizar actualiza consolidado, portal personal y recibos.</CardDescription></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>EMPLEADO</TableHead><TableHead>CONCEPTO</TableHead><TableHead>REGLA</TableHead><TableHead className="text-right">MONTO</TableHead><TableHead>ESTATUS</TableHead><TableHead className="text-right">ACCIONES</TableHead></TableRow></TableHeader><TableBody>{periodMovements.map((movement) => { const employee = state.employees.find((item) => item.id === movement.employeeId); return <TableRow key={movement.id}><TableCell className="font-medium">{employee?.name}</TableCell><TableCell>{movement.concept}</TableCell><TableCell>{movement.mode === "FIXED" ? "FIJO" : `VENTA ≥ ${money.format(movement.threshold ?? 0)}`}</TableCell><TableCell className={`number-display text-right ${movement.type === "FINE" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{movement.type === "FINE" ? "−" : "+"}{money.format(movement.amount)}</TableCell><TableCell><Badge variant="outline">{movement.status}</Badge></TableCell><TableCell className="text-right">{movement.status === "PENDING" && <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setMovementStatus(movement.id, "REJECTED"); toast.info("Movimiento rechazado."); }}>Rechazar</Button><Button size="sm" onClick={() => { setMovementStatus(movement.id, "APPROVED"); toast.success("Movimiento autorizado."); }}>Autorizar</Button></div>}</TableCell></TableRow>; })}</TableBody></Table></div></CardContent>
      </Card>

      <SchemeDialog open={schemeOpen} onOpenChange={setSchemeOpen} />
      <AssignmentDialog open={assignmentOpen} onOpenChange={setAssignmentOpen} />
      {movementType && <MovementDialog type={movementType} open onOpenChange={(open) => { if (!open) setMovementType(null); }} />}
    </div>
  );
}
