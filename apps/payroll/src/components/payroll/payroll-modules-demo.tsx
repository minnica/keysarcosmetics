"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Layers3,
  Pencil,
  Plus,
  Power,
  Printer,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@cosmetics/ui";
import {
  type DemoPayrollModuleDefinition,
  type PayrollModuleConcept,
  employeeCommissionPayrollModule,
  employeeSalaryPayrollModule,
  usePayrollDemo,
} from "./payroll-demo-context";

const conceptOptions: Array<{
  id: PayrollModuleConcept;
  label: string;
  detail: string;
}> = [
  {
    id: "SALARY",
    label: "Sueldo base",
    detail: "Único concepto permitido en una nómina salarial pura.",
  },
  {
    id: "COMMISSION",
    label: "Comisiones",
    detail: "Ventas y escala asignada; nunca incorpora sueldo automáticamente.",
  },
  { id: "BONUS", label: "Bonos", detail: "Bonos aprobados del periodo." },
  { id: "FINE", label: "Multas", detail: "Descuentos autorizados." },
  {
    id: "ADJUSTMENT_PLUS",
    label: "Ajustes de más",
    detail: "Percepciones adicionales aprobadas.",
  },
  {
    id: "ADJUSTMENT_MINUS",
    label: "Ajustes de menos",
    detail: "Deducciones adicionales aprobadas.",
  },
  {
    id: "LOAN",
    label: "Préstamos",
    detail: "Cuotas y movimientos de préstamo.",
  },
  {
    id: "ADVANCE",
    label: "Adelantos",
    detail: "Descuentos de adelantos autorizados.",
  },
  {
    id: "VIATICS",
    label: "Viáticos",
    detail: "Percepciones o deducciones de viáticos.",
  },
];

function ChoiceButton({
  selected,
  label,
  detail,
  onClick,
}: {
  selected: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-14 items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-[#a9794f] bg-[#a9794f]/10" : "border-[color:var(--border-color)] hover:bg-[color:var(--accent-hover)]/35"}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-[#8a5e39] bg-[#765034] text-white" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}
      >
        {selected && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        {detail && (
          <span className="mt-0.5 block text-[10px] leading-4 text-[color:var(--text-muted)]">
            {detail}
          </span>
        )}
      </span>
    </button>
  );
}

function ModuleEditor({
  module,
  open,
  onOpenChange,
}: {
  module: DemoPayrollModuleDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, addPayrollModule, updatePayrollModule } = usePayrollDemo();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [concepts, setConcepts] = useState<PayrollModuleConcept[]>([
    "COMMISSION",
    "BONUS",
    "FINE",
    "ADJUSTMENT_PLUS",
    "ADJUSTMENT_MINUS",
    "LOAN",
    "ADVANCE",
    "VIATICS",
  ]);
  const [positionIds, setPositionIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(module?.name ?? "");
    setDescription(module?.description ?? "");
    setConcepts(
      module?.concepts ?? [
        "COMMISSION",
        "BONUS",
        "FINE",
        "ADJUSTMENT_PLUS",
        "ADJUSTMENT_MINUS",
        "LOAN",
        "ADVANCE",
        "VIATICS",
      ],
    );
    setPositionIds(module?.positionIds ?? []);
  }, [module, open]);

  function toggleConcept(concept: PayrollModuleConcept) {
    setConcepts((current) =>
      current.includes(concept)
        ? current.filter((item) => item !== concept)
        : [...current, concept],
    );
  }

  function togglePosition(positionId: string) {
    setPositionIds((current) =>
      current.includes(positionId)
        ? current.filter((item) => item !== positionId)
        : [...current, positionId],
    );
  }

  function submit() {
    if (!name.trim() || !concepts.length || !positionIds.length) {
      toast.error(
        "Escribe un nombre y selecciona al menos un concepto y un puesto.",
      );
      return;
    }
    const input = { name, description, concepts, positionIds };
    if (module) updatePayrollModule(module.id, input);
    else addPayrollModule(input);
    toast.success(
      module
        ? "Módulo de nómina actualizado."
        : "Módulo de nómina creado y conectado a reportes.",
    );
    onOpenChange(false);
  }

  const isSalaryOnly = concepts.length === 1 && concepts[0] === "SALARY";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {module ? "Editar módulo de nómina" : "Nuevo módulo de nómina"}
          </DialogTitle>
          <DialogDescription>
            Define qué conceptos se calculan y qué puestos alimentan este
            módulo. La asignación de sueldo y comisión siempre permanece
            separada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="module-name">Nombre del módulo</Label>
              <Input
                id="module-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="EJ. NÓMINA CORPORATIVA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-description">Descripción ejecutiva</Label>
              <Input
                id="module-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Personal y conceptos incluidos"
              />
            </div>
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Conceptos de cálculo</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Solo los conceptos seleccionados forman el total de esta
                  nómina.
                </p>
              </div>
              <Badge variant="outline">{concepts.length} SELECCIONADOS</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {conceptOptions.map((concept) => (
                <ChoiceButton
                  key={concept.id}
                  selected={concepts.includes(concept.id)}
                  label={concept.label}
                  detail={concept.detail}
                  onClick={() => toggleConcept(concept.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Puestos participantes</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Al guardar, los empleados actuales de esos puestos reciben el
                  destino correspondiente.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPositionIds(
                    positionIds.length ===
                      state.positions.filter((position) => position.active)
                        .length
                      ? []
                      : state.positions
                          .filter((position) => position.active)
                          .map((position) => position.id),
                  )
                }
              >
                {positionIds.length ? "Limpiar" : "Seleccionar todos"}
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {state.positions
                .filter((position) => position.active)
                .map((position) => (
                  <ChoiceButton
                    key={position.id}
                    selected={positionIds.includes(position.id)}
                    label={position.name}
                    detail={position.category.replaceAll("_", " ")}
                    onClick={() => togglePosition(position.id)}
                  />
                ))}
            </div>
          </section>

          <div
            className={`rounded-xl border p-3 text-xs ${isSalaryOnly ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-[#c3a583]/45 bg-[#c3a583]/10"}`}
          >
            <p className="font-semibold">
              {isSalaryOnly
                ? "Nómina salarial pura"
                : "Regla de separación activa"}
            </p>
            <p className="mt-1 opacity-80">
              {isSalaryOnly
                ? "El recibo sumará únicamente el sueldo fijo asignado; no incorporará comisión ni movimientos."
                : "Aunque un puesto tenga sueldo y comisión, el sueldo solo entra si seleccionas Sueldo base y el empleado queda asignado a este módulo."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>
            {module ? "Guardar cambios" : "Crear módulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollModulesDemo() {
  const { state, togglePayrollModule } = usePayrollDemo();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DemoPayrollModuleDefinition | null>(
    null,
  );
  const modules = state.payrollModules.filter(
    (module) => module.id !== "CONSOLIDATED",
  );
  const assignmentCounts = useMemo(
    () =>
      Object.fromEntries(
        modules.map((module) => [
          module.id,
          state.employees.filter(
            (employee) =>
              employeeSalaryPayrollModule(employee) === module.id ||
              employeeCommissionPayrollModule(employee) === module.id,
          ).length,
        ]),
      ),
    [modules, state.employees],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">CONFIGURACIÓN CENTRAL</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Arquitectura de nómina
            </span>
          </div>
          <h1 className="page-title">Módulos de nómina</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Crea nóminas independientes por puesto y concepto. Cada módulo
            conserva periodos, filtros, recibos y salida a reportes generales.
          </p>
        </div>
        <Button
          size="sm"
          className="self-start rounded-lg px-3"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo módulo
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <Layers3 className="h-5 w-5 text-[#9a6d46]" />
            <p className="label-caps mt-3">MÓDULOS ACTIVOS</p>
            <p className="number-display mt-1 text-2xl">
              {modules.filter((module) => module.active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <UsersRound className="h-5 w-5 text-[#9a6d46]" />
            <p className="label-caps mt-3">PUESTOS CONFIGURADOS</p>
            <p className="number-display mt-1 text-2xl">
              {new Set(modules.flatMap((module) => module.positionIds)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <p className="label-caps mt-3">REGLA CRÍTICA</p>
            <p className="mt-1 text-sm font-semibold">
              Sueldo y comisión sin duplicados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {modules.map((module) => (
          <Card
            key={module.id}
            className={`${module.active ? "" : "opacity-60"} border-[color:var(--border-color)]`}
          >
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(240px,1.1fr)_minmax(300px,1.5fr)_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{module.name}</h2>
                  <Badge variant="outline">
                    {module.custom ? "PERSONALIZADO" : "BASE"}
                  </Badge>
                  {!module.active && <Badge variant="outline">INACTIVO</Badge>}
                </div>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {module.description}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">
                  {assignmentCounts[module.id] ?? 0} empleados asignados ·{" "}
                  {module.positionIds.length || "Todos"} puestos
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {module.concepts.map((concept) => (
                  <Badge
                    key={concept}
                    variant="outline"
                    className={
                      concept === "SALARY"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : concept === "COMMISSION"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : ""
                    }
                  >
                    {conceptOptions.find((item) => item.id === concept)
                      ?.label ?? concept}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {module.custom && (
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Editar ${module.name}`}
                    onClick={() => setEditing(module)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {module.custom && (
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={
                      module.active
                        ? `Desactivar ${module.name}`
                        : `Activar ${module.name}`
                    }
                    onClick={() => {
                      togglePayrollModule(module.id);
                      toast.success(
                        module.active
                          ? "Módulo desactivado; el historial se conserva."
                          : "Módulo activado.",
                      );
                    }}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={
                      module.custom
                        ? `/nomina-personalizada/${encodeURIComponent(module.id)}`
                        : module.id === "FIXED"
                          ? "/nomina-salario-fijo"
                          : module.id === "SPECIALIST"
                            ? "/nomina-especialistas"
                            : module.id === "COMMISSION"
                              ? "/nomina-comisiones"
                              : "/nomina-honorarios"
                    }
                  >
                    Abrir módulo <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#c3a583]/40 bg-[#c3a583]/5">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-[#8a6744]">
            <Printer className="h-4 w-4" />
            <FileText className="h-4 w-4" />
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Cobertura completa del módulo
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
              Cada módulo nuevo utiliza la misma corrida, periodos, filtros,
              impresión, PDF, Excel, costo social e ISR; sus importes se
              integran al consolidado, dashboard y costos por sucursal.
            </p>
          </div>
        </CardContent>
      </Card>

      <ModuleEditor
        module={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <ModuleEditor
        key={editing?.id ?? "none"}
        module={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </div>
  );
}
