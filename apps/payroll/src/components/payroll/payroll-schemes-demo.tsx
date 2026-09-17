"use client";

import { useMemo, useState } from "react";
import { BarChart3, Building2, CalendarDays, ChevronLeft, ChevronRight, History, Layers3, Pencil, Percent, Plus, RefreshCw, Search, Trash2, UserPlus, UserRoundCheck, UsersRound } from "lucide-react";
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
import {
  type DemoScheme,
  type DemoSchemeAssignment,
  employeeAppliesToPeriod,
  schemeAppliesToPeriod,
  usePayrollDemo,
} from "./payroll-demo-context";
import { CommissionScaleEditor, scaleLevelsFromTiers, scaleLevelsToTiers } from "./commission-scale-editor";
import { ReportExportButtons } from "./report-export-buttons";
import type { ReportExportConfig } from "@/lib/report-export";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const displayDate = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function formatDate(value?: string) {
  return value ? displayDate.format(new Date(`${value}T00:00:00Z`)).toLocaleUpperCase("es-MX") : "SIN FECHA";
}

function schemeTiersLabel(scheme: DemoScheme) {
  return scheme.tiers
    .map(
      (tier) =>
        `${money.format(tier.from)} — ${tier.to === null ? "SIN LÍMITE" : money.format(tier.to)} · ${(tier.rate * 100).toFixed(1)}%`,
    )
    .join(" | ");
}

type ActiveAssignmentExportRow = {
  employeeName: string;
  position: string;
  category: string;
  branch: string;
  scheme: string;
  effectiveFrom: string;
};

type SchemeExportRow = {
  name: string;
  status: string;
  registeredAt: string;
  effectiveFrom: string;
  tiers: string;
  activePeople: number;
};

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
  const sellers = useMemo(
    () =>
      state.employees
        .filter(
          (employee) =>
            (employee.category === "SELLER" ||
              employee.category === "CONTRACTOR") &&
            employeeAppliesToPeriod(
              employee,
              currentPeriod.start,
              currentPeriod.end,
            ),
        )
        .sort((left, right) => left.name.localeCompare(right.name, "es-MX")),
    [currentPeriod.end, currentPeriod.start, state.employees],
  );
  const assignableSchemes = useMemo(
    () =>
      state.schemes
        .filter((scheme) => scheme.active)
        .sort((left, right) => left.name.localeCompare(right.name, "es-MX")),
    [state.schemes],
  );
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? sellers[0]?.id ?? "");
  const employee = sellers.find((item) => item.id === employeeId);
  const currentAssignment = state.schemeAssignments.filter((item) => item.employeeId === employeeId && item.effectiveFrom <= currentPeriod.end).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const [schemeId, setSchemeId] = useState(currentAssignment?.schemeId ?? employee?.schemeId ?? assignableSchemes[0]?.id ?? "");
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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{currentAssignment ? "Cambiar esquema" : "Asignar esquema a vendedor"}</DialogTitle><DialogDescription>El cambio solo afectará la nómina que incluya la fecha seleccionada y los periodos posteriores.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Vendedor</Label><Select value={employeeId} onValueChange={(id) => { const nextEmployee = sellers.find((item) => item.id === id); const nextAssignment = state.schemeAssignments.filter((item) => item.employeeId === id && item.effectiveFrom <= currentPeriod.end).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]; setEmployeeId(id); setSchemeId(nextAssignment?.schemeId ?? nextEmployee?.schemeId ?? assignableSchemes[0]?.id ?? ""); setViaticsEnabled(nextEmployee?.viaticsEnabled ?? false); setConceptIds(nextEmployee?.allowedViaticsConceptIds ?? []); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sellers.map((seller) => <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Tipo de esquema</Label><Select value={schemeId} onValueChange={setSchemeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{assignableSchemes.map((scheme) => <SelectItem key={scheme.id} value={scheme.id}>{scheme.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="scheme-effective-from"><CalendarDays className="mr-1 inline h-4 w-4" />Vigente desde</Label><Input id="scheme-effective-from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></div></div><div className="rounded-lg border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 p-3 text-xs"><strong>Protección de historial:</strong> las nóminas cuyo periodo termine antes de {effectiveFrom} conservarán su esquema anterior.</div><button type="button" role="switch" aria-checked={viaticsEnabled} onClick={() => { const next = !viaticsEnabled; setViaticsEnabled(next); if (!next) setConceptIds([]); }} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${viaticsEnabled ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)]"}`}><span><strong className="block">¿Puede registrar viáticos?</strong><span className="text-xs text-[color:var(--text-muted)]">Si está desactivado, el botón no aparecerá en su portal.</span></span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${viaticsEnabled ? "bg-emerald-600 text-white" : "bg-[color:var(--accent-hover)]"}`}>{viaticsEnabled ? "SÍ" : "NO"}</span></button>{viaticsEnabled && <div className="space-y-2"><Label>Conceptos permitidos</Label><div className="grid gap-2 sm:grid-cols-2">{state.viaticsConcepts.filter((concept) => concept.active).map((concept) => { const selected = conceptIds.includes(concept.id); return <button key={concept.id} type="button" onClick={() => setConceptIds((current) => selected ? current.filter((id) => id !== concept.id) : [...current, concept.id])} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${selected ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25" : "border-[color:var(--border-color)]"}`}>{concept.name}<span className="block font-normal text-[color:var(--text-muted)]">HASTA {money.format(concept.maxAmount)}</span></button>; })}</div></div>}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>{currentAssignment ? "Registrar cambio" : "Aplicar asignación"}</Button></DialogFooter></DialogContent></Dialog>;
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
  const [historyEmployeeSearch, setHistoryEmployeeSearch] = useState("");
  const [historySchemeFilter, setHistorySchemeFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState<"20" | "40" | "60" | "ALL">(
    "20",
  );
  const [page, setPage] = useState(1);
  const sellers = useMemo(
    () =>
      state.employees
        .filter(
          (employee) =>
            (employee.category === "SELLER" ||
              employee.category === "CONTRACTOR") &&
            employeeAppliesToPeriod(
              employee,
              currentPeriod.start,
              currentPeriod.end,
            ),
        )
        .sort((left, right) => left.name.localeCompare(right.name, "es-MX")),
    [currentPeriod.end, currentPeriod.start, state.employees],
  );
  const sortedSchemes = useMemo(
    () =>
      [...state.schemes].sort((left, right) =>
        left.name.localeCompare(right.name, "es-MX"),
      ),
    [state.schemes],
  );
  const activeSchemes = useMemo(
    () => sortedSchemes.filter((scheme) => scheme.active),
    [sortedSchemes],
  );
  const periodSchemes = useMemo(
    () =>
      sortedSchemes.filter((scheme) =>
        schemeAppliesToPeriod(
          scheme,
          currentPeriod.start,
          currentPeriod.end,
        ),
      ),
    [currentPeriod.end, currentPeriod.start, sortedSchemes],
  );
  const schemeById = useMemo(
    () => new Map(state.schemes.map((scheme) => [scheme.id, scheme])),
    [state.schemes],
  );
  const branchById = useMemo(
    () => new Map(state.branches.map((branch) => [branch.id, branch])),
    [state.branches],
  );
  const employeeById = useMemo(
    () => new Map(state.employees.map((employee) => [employee.id, employee])),
    [state.employees],
  );
  const assignmentByEmployee = useMemo(() => {
    const assignments = new Map<string, DemoSchemeAssignment>();
    state.schemeAssignments.forEach((assignment) => {
      if (assignment.effectiveFrom > currentPeriod.end) return;
      const current = assignments.get(assignment.employeeId);
      if (!current || assignment.effectiveFrom > current.effectiveFrom) {
        assignments.set(assignment.employeeId, assignment);
      }
    });
    return assignments;
  }, [currentPeriod.end, state.schemeAssignments]);
  const currentAssignments = useMemo(
    () =>
      sellers.flatMap((seller) => {
        const assignment = assignmentByEmployee.get(seller.id);
        const scheme = assignment ? schemeById.get(assignment.schemeId) : null;
        return assignment &&
          scheme &&
          schemeAppliesToPeriod(
            scheme,
            currentPeriod.start,
            currentPeriod.end,
          )
          ? [{ seller, assignment, scheme }]
          : [];
      }),
    [
      assignmentByEmployee,
      currentPeriod.end,
      currentPeriod.start,
      schemeById,
      sellers,
    ],
  );
  const activeAssignmentRows = useMemo<ActiveAssignmentExportRow[]>(
    () =>
      currentAssignments
        .map(({ seller, assignment, scheme }) => ({
          employeeName: seller.name,
          position: seller.position,
          category:
            seller.category === "CONTRACTOR" ? "HONORARIOS" : "VENDEDOR",
          branch: branchById.get(seller.branchId)?.name ?? "SIN SUCURSAL",
          scheme: scheme.name,
          effectiveFrom: assignment.effectiveFrom,
        }))
        .sort(
          (left, right) =>
            left.scheme.localeCompare(right.scheme, "es-MX") ||
            left.employeeName.localeCompare(right.employeeName, "es-MX"),
        ),
    [branchById, currentAssignments],
  );
  const groupedAssignments = useMemo(
    () =>
      periodSchemes.map((scheme) => ({
        scheme,
        members: currentAssignments
          .filter((item) => item.scheme.id === scheme.id)
          .sort((left, right) =>
            left.seller.name.localeCompare(right.seller.name, "es-MX"),
          ),
      })),
    [currentAssignments, periodSchemes],
  );
  const assignedEmployeeIds = useMemo(
    () => new Set(currentAssignments.map((item) => item.seller.id)),
    [currentAssignments],
  );
  const unassignedSellers = useMemo(
    () => sellers.filter((seller) => !assignedEmployeeIds.has(seller.id)),
    [assignedEmployeeIds, sellers],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredSchemes = useMemo(
    () =>
      sortedSchemes.filter((scheme) =>
        scheme.name.toLocaleLowerCase("es-MX").includes(normalizedSearch),
      ),
    [normalizedSearch, sortedSchemes],
  );
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(filteredSchemes.length, 1) : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSchemes.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const displayedSchemes = filteredSchemes.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const maximumRate = Math.max(
    ...periodSchemes.flatMap((scheme) =>
      scheme.tiers.map((tier) => tier.rate),
    ),
    0,
  );
  const distribution = groupedAssignments.map(({ scheme, members }) => ({
    scheme,
    count: members.length,
  }));
  const maxDistribution = Math.max(
    ...distribution.map((item) => item.count),
    1,
  );
  const normalizedHistoryEmployeeSearch = historyEmployeeSearch
    .trim()
    .toLocaleLowerCase("es-MX");
  const history = useMemo(
    () =>
      [...state.schemeAssignments]
        .filter((assignment) => {
          const employee = employeeById.get(assignment.employeeId);
          const matchesEmployee =
            !normalizedHistoryEmployeeSearch ||
            Boolean(
              employee?.name
                .toLocaleLowerCase("es-MX")
                .includes(normalizedHistoryEmployeeSearch),
            );
          const matchesScheme =
            historySchemeFilter === "ALL" ||
            assignment.schemeId === historySchemeFilter;
          return matchesEmployee && matchesScheme;
        })
        .sort(
          (left, right) =>
            right.effectiveFrom.localeCompare(left.effectiveFrom) ||
            (employeeById.get(left.employeeId)?.name ?? "").localeCompare(
              employeeById.get(right.employeeId)?.name ?? "",
              "es-MX",
            ),
        ),
    [
      employeeById,
      historySchemeFilter,
      normalizedHistoryEmployeeSearch,
      state.schemeAssignments,
    ],
  );
  const schemeExportRows = useMemo<SchemeExportRow[]>(
    () =>
      filteredSchemes.map((scheme) => {
        const earliestAssignment = state.schemeAssignments
          .filter((assignment) => assignment.schemeId === scheme.id)
          .map((assignment) => assignment.createdAt)
          .sort()[0];
        return {
          name: scheme.name,
          status: scheme.active
            ? "ACTIVO"
            : schemeAppliesToPeriod(
                  scheme,
                  currentPeriod.start,
                  currentPeriod.end,
                )
              ? "BAJA AL CIERRE"
              : "INACTIVO",
          registeredAt:
            scheme.createdAt ??
            earliestAssignment ??
            scheme.effectiveFrom ??
            "SIN FECHA",
          effectiveFrom: scheme.effectiveFrom ?? "SIN FECHA",
          tiers: schemeTiersLabel(scheme),
          activePeople: currentAssignments.filter(
            (item) => item.scheme.id === scheme.id,
          ).length,
        };
      }),
    [
      currentAssignments,
      currentPeriod.end,
      currentPeriod.start,
      filteredSchemes,
      state.schemeAssignments,
    ],
  );

  const assignmentReportConfig: ReportExportConfig<ActiveAssignmentExportRow> = {
    title: "Personal activo con esquemas de comisión vigentes",
    subtitle: `Periodo ${currentPeriod.start} — ${currentPeriod.end} · Listado general`,
    filename: `personal-esquemas-vigentes-${currentPeriod.start}-${currentPeriod.end}`,
    sheetName: "Personal vigente",
    orientation: "landscape",
    rows: activeAssignmentRows,
    metadata: [
      { label: "Periodo", value: `${currentPeriod.start} — ${currentPeriod.end}` },
      { label: "Alcance", value: "Personal activo con esquema vigente" },
      { label: "Origen", value: "Asignaciones efectivas del módulo de esquemas" },
    ],
    metrics: [
      { label: "Personas", value: String(activeAssignmentRows.length), detail: "Personal activo con asignación vigente" },
      { label: "Grupos", value: String(groupedAssignments.filter((group) => group.members.length).length), detail: "Tipos de esquema con personal" },
      { label: "Sin esquema", value: String(unassignedSellers.length), detail: "Personal elegible pendiente de asignación" },
    ],
    analysis: [
      `El listado agrupa ${activeAssignmentRows.length} personas activas por el esquema aplicable al cierre del periodo.`,
      unassignedSellers.length
        ? `${unassignedSellers.length} personas elegibles requieren una asignación vigente.`
        : "Todo el personal elegible tiene un esquema vigente.",
    ],
    columns: [
      { header: "Esquema", accessor: (row) => row.scheme, width: 20 },
      { header: "Empleado", accessor: (row) => row.employeeName, width: 24 },
      { header: "Puesto", accessor: (row) => row.position, width: 22 },
      { header: "Tipo", accessor: (row) => row.category, width: 13 },
      { header: "Sucursal", accessor: (row) => row.branch, width: 16 },
      { header: "Vigente desde", accessor: (row) => row.effectiveFrom, width: 14 },
    ],
  };

  const schemeReportConfig: ReportExportConfig<SchemeExportRow> = {
    title: "Catálogo de esquemas de comisión",
    subtitle: normalizedSearch
      ? `Filtro: ${search.trim()} · ${schemeExportRows.length} resultados`
      : "Catálogo general de esquemas registrados",
    filename: normalizedSearch
      ? `esquemas-comision-${search.trim()}`
      : "catalogo-esquemas-comision",
    sheetName: "Esquemas",
    orientation: "landscape",
    rows: schemeExportRows,
    metadata: [
      { label: "Periodo de consulta", value: `${currentPeriod.start} — ${currentPeriod.end}` },
      { label: "Alcance", value: normalizedSearch ? `Búsqueda: ${search.trim()}` : "Todos los esquemas registrados" },
      { label: "Registros", value: String(schemeExportRows.length) },
    ],
    metrics: [
      { label: "Activos", value: String(schemeExportRows.filter((row) => row.status === "ACTIVO").length), detail: "Disponibles para nuevas asignaciones" },
      { label: "Inactivos", value: String(schemeExportRows.filter((row) => row.status !== "ACTIVO").length), detail: "Conservados para historial" },
      { label: "Personal vigente", value: String(activeAssignmentRows.length), detail: "Asignaciones activas en el periodo" },
    ],
    analysis: [
      "Cada esquema conserva sus rangos, porcentajes, fecha de registro y vigencia para auditoría.",
      "La exportación utiliza únicamente la búsqueda aplicada al catálogo, ordenada por tipo de esquema y sin incluir controles de pantalla.",
    ],
    columns: [
      { header: "Esquema", accessor: (row) => row.name, width: 23 },
      { header: "Estatus", accessor: (row) => row.status, width: 10 },
      { header: "Registro", accessor: (row) => row.registeredAt, width: 14 },
      { header: "Vigente desde", accessor: (row) => row.effectiveFrom, width: 14 },
      { header: "Escalas y porcentajes", accessor: (row) => row.tiers, width: 40 },
      { header: "Personal activo", accessor: (row) => row.activePeople, width: 12, format: "number" },
    ],
  };

  function openAssignment(employeeId?: string) {
    setAssignmentEmployeeId(employeeId);
    setAssignmentOpen(true);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">SUBMENÚ INDEPENDIENTE</Badge><span className="text-xs text-[color:var(--text-muted)]">Vigencias protegidas por periodo</span></div><h1 className="page-title">Esquemas de comisión</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Cada cambio conserva el esquema utilizado por las nóminas y periodos anteriores.</p></div><div className="flex flex-wrap gap-2 self-start xl:self-auto"><Button size="sm" className="rounded-lg px-3 shadow-sm" variant="outline" onClick={() => openAssignment()}><UserPlus className="mr-1.5 h-3.5 w-3.5" />Asignar esquema</Button><Button size="sm" className="rounded-lg px-3 shadow-sm" onClick={() => setEditing("new")}><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo esquema</Button></div></header>

      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><Layers3 className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ESQUEMAS ACTIVOS</p><p className="number-display mt-2 text-2xl">{activeSchemes.length}</p></CardContent></Card><Card><CardContent className="p-5"><UsersRound className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">ASIGNACIONES VIGENTES</p><p className="number-display mt-2 text-2xl">{currentAssignments.length}</p></CardContent></Card><Card><CardContent className="p-5"><Percent className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">COMISIÓN MÁXIMA</p><p className="number-display mt-2 text-2xl">{(maximumRate * 100).toFixed(1)}%</p></CardContent></Card></div>

      <Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Dashboard de distribución vigente</CardTitle><CardDescription>Vendedores distribuidos por el esquema aplicable al periodo {currentPeriod.start} — {currentPeriod.end}.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{distribution.map(({ scheme, count }) => <div key={scheme.id} className="rounded-xl border border-[color:var(--border-color)] p-4"><div className="flex items-center justify-between gap-3"><strong>{scheme.name}</strong><span className="number-display">{count} VENDEDORES</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]" style={{ width: `${Math.max(count / maxDistribution * 100, count ? 5 : 0)}%` }} /></div><p className="mt-2 text-xs text-[color:var(--text-muted)]">{currentAssignments.length ? (count / currentAssignments.length * 100).toFixed(1) : "0.0"}% de las asignaciones vigentes</p></div>)}</CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="section-heading uppercase">
                Esquemas registrados
              </CardTitle>
              <CardDescription>
                Tipos, fecha de registro y rangos disponibles para futuras vigencias.
              </CardDescription>
            </div>
            <ReportExportButtons config={schemeReportConfig} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[color:var(--text-muted)]" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="BUSCAR ESQUEMA"
              />
            </div>
            <Select
              value={pageSize}
              onValueChange={(value) => {
                setPageSize(value as "20" | "40" | "60" | "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 REGISTROS</SelectItem>
                <SelectItem value="40">40 REGISTROS</SelectItem>
                <SelectItem value="60">60 REGISTROS</SelectItem>
                <SelectItem value="ALL">TODOS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ESQUEMA / ESTATUS</TableHead>
                  <TableHead>RANGOS</TableHead>
                  <TableHead>REGISTRO / VIGENCIA</TableHead>
                  <TableHead>PERSONAL VIGENTE</TableHead>
                  <TableHead className="text-right">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSchemes.map((scheme) => {
                  const schemeSellers = currentAssignments
                    .filter((item) => item.scheme.id === scheme.id)
                    .map((item) => item.seller);
                  const earliestAssignment = state.schemeAssignments
                    .filter((assignment) => assignment.schemeId === scheme.id)
                    .map((assignment) => assignment.createdAt)
                    .sort()[0];
                  const registrationDate =
                    scheme.createdAt ?? earliestAssignment ?? scheme.effectiveFrom;
                  const protectedForPeriod = schemeAppliesToPeriod(
                    scheme,
                    currentPeriod.start,
                    currentPeriod.end,
                  );
                  return (
                    <TableRow key={scheme.id}>
                      <TableCell>
                        <p className="font-semibold">{scheme.name}</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${scheme.active ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-stone-300 text-stone-500"}`}
                        >
                          {scheme.active
                            ? "ACTIVO"
                            : protectedForPeriod
                              ? "BAJA AL CIERRE"
                              : "INACTIVO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[420px] flex-wrap gap-1.5">
                          {scheme.tiers.map((tier) => (
                            <Badge
                              key={tier.id}
                              variant="outline"
                              className="bg-[color:var(--accent-hover)]/45"
                            >
                              {money.format(tier.from)} — {tier.to === null ? "SIN LÍMITE" : money.format(tier.to)} · {(tier.rate * 100).toFixed(1)}%
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-36 space-y-1">
                          <p className="flex items-center gap-1.5 text-xs font-semibold">
                            <CalendarDays className="h-3.5 w-3.5 text-[color:var(--text-secondary)]" />
                            {formatDate(registrationDate)}
                          </p>
                          <p className="text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                            REGISTRADO
                          </p>
                          <p className="text-[10px] text-[color:var(--text-muted)]">
                            Vigente: {formatDate(scheme.effectiveFrom)}
                          </p>
                          {scheme.deactivatedAt ? (
                            <p className="text-[10px] text-rose-600">
                              Baja: {formatDate(scheme.deactivatedAt)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{schemeSellers.length}</p>
                        <p className="max-w-xs text-xs text-[color:var(--text-muted)]">
                          {schemeSellers.length
                            ? schemeSellers.map((seller) => seller.name).join(", ")
                            : "SIN ASIGNACIONES"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Editar ${scheme.name}`}
                            onClick={() => setEditing(scheme)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Dar de baja ${scheme.name}`}
                            disabled={!scheme.active}
                            onClick={() => setDeleting(scheme)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[color:var(--text-muted)]">
              {filteredSchemes.length} esquemas · página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="section-heading uppercase">
                Personal agrupado por esquema vigente
              </CardTitle>
              <CardDescription>
                Listado ordenado del personal activo según el esquema aplicable al periodo. Cambiar una asignación crea una nueva vigencia y conserva el historial.
              </CardDescription>
            </div>
            <ReportExportButtons config={assignmentReportConfig} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedAssignments.map(({ scheme, members }) => (
            <section
              key={scheme.id}
              className="overflow-hidden rounded-2xl border border-[color:var(--border-color)]"
              aria-labelledby={`scheme-group-${scheme.id}`}
            >
              <div className="flex flex-col gap-2 bg-[linear-gradient(110deg,#30271f,#735136)] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3
                    id={`scheme-group-${scheme.id}`}
                    className="text-sm font-semibold"
                  >
                    {scheme.name}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-white/60">
                    {scheme.tiers.length} niveles · vigente desde {formatDate(scheme.effectiveFrom)}
                  </p>
                </div>
                <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
                  {members.length} {members.length === 1 ? "PERSONA" : "PERSONAS"}
                </Badge>
              </div>
              {members.length ? (
                <div className="grid gap-px bg-[color:var(--border-color)] xl:grid-cols-2">
                  {members.map(({ seller, assignment }) => {
                    const branch = branchById.get(seller.branchId);
                    const initials = seller.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("");
                    return (
                      <article
                        key={seller.id}
                        className="grid gap-3 bg-[color:var(--bg-card)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-hover)] text-[10px] font-bold text-[color:var(--text-secondary)]">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">
                              {seller.name}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.04em] text-[color:var(--text-muted)]">
                              {seller.position}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-medium text-[color:var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {branch?.name ?? "SIN SUCURSAL"}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                DESDE {formatDate(assignment.effectiveFrom)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="justify-self-start sm:justify-self-end"
                          onClick={() => openAssignment(seller.id)}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Cambiar
                        </Button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[color:var(--bg-card)] px-4 py-5 text-xs text-[color:var(--text-muted)]">
                  No hay personal activo asignado a este esquema en el periodo.
                </div>
              )}
            </section>
          ))}

          {unassignedSellers.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-amber-300/70 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/15">
              <div className="flex items-center justify-between gap-3 border-b border-amber-300/60 px-4 py-3 dark:border-amber-800">
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Personal pendiente de esquema
                  </h3>
                  <p className="mt-0.5 text-[10px] text-amber-800/70 dark:text-amber-300/70">
                    Debe asignarse antes del siguiente cálculo de comisiones.
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">
                  {unassignedSellers.length} PENDIENTES
                </Badge>
              </div>
              <div className="grid gap-px bg-amber-200/70 xl:grid-cols-2 dark:bg-amber-900/60">
                {unassignedSellers.map((seller) => (
                  <article
                    key={seller.id}
                    className="flex items-center justify-between gap-3 bg-[color:var(--bg-card)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{seller.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[color:var(--text-muted)]">
                        {seller.position} · {branchById.get(seller.branchId)?.name ?? "SIN SUCURSAL"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openAssignment(seller.id)}
                    >
                      <UserRoundCheck className="mr-1.5 h-3.5 w-3.5" /> Asignar
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de asignaciones por esquema
            </CardTitle>
            <CardDescription>
              Las vigencias anteriores al periodo activo quedan bloqueadas para proteger la nómina histórica.
            </CardDescription>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[color:var(--text-muted)]" />
              <Input
                className="pl-9"
                value={historyEmployeeSearch}
                onChange={(event) => setHistoryEmployeeSearch(event.target.value)}
                placeholder="BUSCAR POR NOMBRE"
                aria-label="Buscar asignaciones por nombre del empleado"
              />
            </div>
            <Select value={historySchemeFilter} onValueChange={setHistorySchemeFilter}>
              <SelectTrigger aria-label="Filtrar historial por esquema">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODOS LOS ESQUEMAS</SelectItem>
                {sortedSchemes.map((scheme) => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    {scheme.name}{scheme.active ? "" : " · INACTIVO"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">
            {history.length} asignaciones encontradas
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VIGENTE DESDE</TableHead>
                  <TableHead>VENDEDOR</TableHead>
                  <TableHead>ESQUEMA</TableHead>
                  <TableHead>REGISTRADO</TableHead>
                  <TableHead>ESTADO</TableHead>
                  <TableHead className="text-right">EDITAR VIGENCIA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((assignment) => {
                  const employee = employeeById.get(assignment.employeeId);
                  const scheme = schemeById.get(assignment.schemeId);
                  const isCurrent =
                    assignmentByEmployee.get(assignment.employeeId)?.id ===
                    assignment.id;
                  const editable = assignment.effectiveFrom >= currentPeriod.start;
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-semibold">
                        {assignment.effectiveFrom}
                      </TableCell>
                      <TableCell>{employee?.name ?? "EMPLEADO NO DISPONIBLE"}</TableCell>
                      <TableCell>{scheme?.name ?? "ESQUEMA HISTÓRICO"}</TableCell>
                      <TableCell>{assignment.createdAt}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {isCurrent ? "VIGENTE" : "HISTÓRICO"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar vigencia de ${employee?.name ?? "empleado"}`}
                          disabled={!editable}
                          onClick={() => setEditingAssignment(assignment)}
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!history.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-[color:var(--text-muted)]">
                      No hay asignaciones que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SchemeEditorDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} scheme={editing === "new" ? null : editing} open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} />
      <SchemeAssignmentDialog key={assignmentEmployeeId ?? "generic"} initialEmployeeId={assignmentEmployeeId} open={assignmentOpen} onOpenChange={(open) => { setAssignmentOpen(open); if (!open) setAssignmentEmployeeId(undefined); }} />
      {editingAssignment && <AssignmentHistoryDialog key={editingAssignment.id} assignment={editingAssignment} open onOpenChange={(open) => { if (!open) setEditingAssignment(null); }} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Dar de baja este esquema?</AlertDialogTitle><AlertDialogDescription>Dejará de estar disponible para nuevas asignaciones. Permanecerá aplicado hasta el cierre del periodo {currentPeriod.start} — {currentPeriod.end}, y se conservarán sus {deleting ? state.schemeAssignments.filter((assignment) => assignment.schemeId === deleting.id).length : 0} asignaciones para nóminas y reportes históricos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-amber-700 text-white hover:bg-amber-800" onClick={() => { if (deleting) { deleteScheme(deleting.id); toast.success("Esquema dado de baja; el periodo vigente y el historial permanecen protegidos."); setDeleting(null); } }}>Dar de baja</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
