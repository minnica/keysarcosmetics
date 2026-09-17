"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Edit3,
  Gavel,
  History,
  Plus,
  Power,
  Search,
  Sparkles,
  TimerReset,
  Trash2,
  UsersRound,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@cosmetics/ui";
import {
  type BonusCondition,
  type BonusSalesTier,
  type DemoBonusFineConcept,
  type DemoEmployee,
  type MovementMode,
  type MovementType,
  type PayrollModule,
  employeeCommissionPayrollModule,
  payrollModuleLabel,
  temporaryBonusStandings,
  usePayrollDemo,
} from "./payroll-demo-context";
import { ReportExportButtons } from "./report-export-buttons";
import type { ReportExportConfig } from "@/lib/report-export";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type ConceptPreset = "BONUS" | "FINE" | "TEMPORARY";
type CatalogStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "SCHEDULED"
  | "FINISHED"
  | "RETIRED";

function ToggleOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${checked ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        <span className="block text-[10px] text-[color:var(--text-muted)]">
          {description}
        </span>
      </span>
    </button>
  );
}

function SellerSelector({
  employees,
  selectedIds,
  onChange,
}: {
  employees: DemoEmployee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLocaleLowerCase("es-MX");
  const visibleEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        `${employee.name} ${employee.paternalSurname} ${employee.maternalSurname}`
          .toLocaleLowerCase("es-MX")
          .includes(normalized),
      ),
    [employees, normalized],
  );

  function toggle(employeeId: string) {
    onChange(
      selectedIds.includes(employeeId)
        ? selectedIds.filter((id) => id !== employeeId)
        : [...selectedIds, employeeId],
    );
  }

  return (
    <Popover onOpenChange={(nextOpen) => !nextOpen && setSearch("")}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <UsersRound className="h-4 w-4 shrink-0 text-[#987049]" />
            <span className="truncate text-xs font-semibold">
              {selectedIds.length} VENDEDOR
              {selectedIds.length === 1 ? "" : "ES"} SELECCIONADO
              {selectedIds.length === 1 ? "" : "S"}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-[color:var(--text-muted)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(430px,calc(100vw-40px))] overflow-hidden rounded-2xl border-[color:var(--border-color)] p-0 shadow-xl"
      >
        <div className="border-b border-[color:var(--border-color)] p-3">
          <p className="text-xs font-semibold">Vendedores participantes</p>
          <p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
            Busca por nombre o apellido y marca una o varias personas.
          </p>
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 pl-8 text-[10px]"
              placeholder="BUSCAR NOMBRE O APELLIDO"
              aria-label="Buscar vendedor participante"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto p-1.5">
          {visibleEmployees.map((employee) => {
            const selected = selectedIds.includes(employee.id);
            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => toggle(employee.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${selected ? "bg-[color:var(--accent-hover)]/60" : "hover:bg-[color:var(--accent-hover)]/25"}`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#9a744c] bg-[#9a744c] text-white" : "border-[color:var(--border-color)]"}`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold">
                    {employee.name}
                  </span>
                  <span className="block truncate text-[9px] text-[color:var(--text-muted)]">
                    {employee.position}
                  </span>
                </span>
              </button>
            );
          })}
          {visibleEmployees.length === 0 && (
            <p className="px-3 py-7 text-center text-xs text-[color:var(--text-muted)]">
              Sin coincidencias
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ConceptDialog({
  concept,
  preset,
  open,
  onOpenChange,
}: {
  concept: DemoBonusFineConcept | null;
  preset: ConceptPreset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, currentPeriod, addBonusFineConcept, updateBonusFineConcept } =
    usePayrollDemo();
  const defaultModule = state.payrollModules.find(
    (module) => module.active && module.id !== "CONSOLIDATED",
  )?.id as Exclude<PayrollModule, "CONSOLIDATED"> | undefined;
  const temporary = concept?.temporary ?? preset === "TEMPORARY";
  const [type, setType] = useState<MovementType>(
    concept?.type ?? (preset === "FINE" ? "FINE" : "BONUS"),
  );
  const [name, setName] = useState(concept?.name ?? "");
  const [mode, setMode] = useState<MovementMode>(concept?.mode ?? "FIXED");
  const [condition, setCondition] = useState<BonusCondition>(
    concept?.condition ?? "SALES",
  );
  const [defaultAmount, setDefaultAmount] = useState(
    String(concept?.defaultAmount ?? ""),
  );
  const [threshold, setThreshold] = useState(String(concept?.threshold ?? ""));
  const [payrollModule, setPayrollModule] = useState<
    Exclude<PayrollModule, "CONSOLIDATED">
  >(concept?.payrollModule ?? defaultModule ?? "COMMISSION");
  const [validFrom, setValidFrom] = useState(
    concept?.validFrom ?? currentPeriod.start,
  );
  const [validUntil, setValidUntil] = useState(
    concept?.validUntil ?? (temporary ? currentPeriod.end : ""),
  );
  const [indefinite, setIndefinite] = useState(
    !temporary && concept?.validUntil == null,
  );
  const [salesScale, setSalesScale] = useState(concept?.salesScale ?? false);
  const [salesTiers, setSalesTiers] = useState<BonusSalesTier[]>(() =>
    concept?.salesTiers?.length
      ? concept.salesTiers
      : [
          {
            id: "tier-1",
            from: Number(concept?.threshold ?? 0),
            to: null,
            amount: Number(concept?.defaultAmount ?? 0),
          },
        ],
  );
  const [allEligibleEmployees, setAllEligibleEmployees] = useState(
    concept?.eligibleEmployeeIds == null,
  );
  const [eligibleEmployeeIds, setEligibleEmployeeIds] = useState<string[]>(
    concept?.eligibleEmployeeIds ?? [],
  );
  const salesBased =
    type === "BONUS" && (temporary ? condition === "SALES" : mode === "SCALE");
  const dialogKindLabel = temporary
    ? "bono temporal"
    : type === "FINE"
      ? "multa"
      : "bono";
  const sellerEmployees = useMemo(
    () =>
      state.employees.filter(
        (employee) =>
          employee.active &&
          (employee.category === "SELLER" ||
            employee.category === "CONTRACTOR" ||
            employeeCommissionPayrollModule(employee) !== null),
      ),
    [state.employees],
  );

  function updateTier(
    tierId: string,
    field: "from" | "to" | "amount",
    value: string,
  ) {
    setSalesTiers((current) =>
      current.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              [field]: field === "to" && value === "" ? null : Number(value),
            }
          : tier,
      ),
    );
  }

  function addTier() {
    setSalesTiers((current) => {
      const previous = current[current.length - 1];
      const nextFrom =
        previous?.to !== null && previous?.to !== undefined
          ? previous.to + 0.01
          : previous
            ? previous.from + 10000
            : 0;
      return [
        ...current,
        {
          id: `tier-${Date.now()}`,
          from: nextFrom,
          to: null,
          amount: previous?.amount ?? 0,
        },
      ];
    });
  }

  function submit() {
    const amount = Number(defaultAmount);
    const scaleThreshold = Number(threshold);
    const normalizedTiers = [...salesTiers].sort(
      (left, right) => left.from - right.from,
    );
    const invalidTiers = normalizedTiers.some(
      (tier, index) =>
        tier.from < 0 ||
        tier.amount <= 0 ||
        (tier.to !== null && tier.to < tier.from) ||
        (index > 0 &&
          normalizedTiers[index - 1]?.to !== null &&
          tier.from <= (normalizedTiers[index - 1]?.to ?? -1)),
    );
    const duplicate = state.bonusFineConcepts.some(
      (item) =>
        !item.deletedAt &&
        item.id !== concept?.id &&
        item.name.trim().toLocaleUpperCase("es-MX") ===
          name.trim().toLocaleUpperCase("es-MX"),
    );
    if (
      !name.trim() ||
      !validFrom ||
      (!(salesBased && salesScale) && amount <= 0) ||
      (type === "BONUS" && (temporary || mode === "SCALE") &&
        !(salesBased && salesScale) &&
        scaleThreshold <= 0) ||
      (temporary && !validUntil) ||
      (!temporary && !indefinite && !validUntil)
    ) {
      toast.error(
        "Completa nombre, vigencia, monto y condición de cumplimiento.",
      );
      return;
    }
    if (
      salesBased &&
      salesScale &&
      (normalizedTiers.length === 0 || invalidTiers)
    ) {
      toast.error(
        "Revisa los niveles: cada rango debe ser válido, no traslaparse y tener un bono mayor a cero.",
      );
      return;
    }
    if (
      salesBased &&
      !allEligibleEmployees &&
      eligibleEmployeeIds.length === 0
    ) {
      toast.error("Selecciona al menos un vendedor para este bono.");
      return;
    }
    if (validUntil && validUntil < validFrom) {
      toast.error("La fecha final no puede ser anterior al inicio.");
      return;
    }
    if (duplicate) {
      toast.error("Ya existe un concepto con ese nombre.");
      return;
    }
    const primaryTier = normalizedTiers[0];
    const input = {
      type,
      name: name.trim(),
      mode:
        type === "FINE"
          ? ("FIXED" as const)
          : temporary
            ? condition === "SALES"
              ? ("SCALE" as const)
              : ("FIXED" as const)
            : mode,
      defaultAmount:
        salesBased && salesScale ? (primaryTier?.amount ?? 0) : amount,
      threshold:
        type === "FINE"
          ? null
          : salesBased && salesScale
            ? (primaryTier?.from ?? null)
            : temporary || mode === "SCALE"
              ? scaleThreshold
              : null,
      payrollModule,
      validFrom,
      validUntil: temporary || !indefinite ? validUntil || null : null,
      temporary,
      condition: temporary ? condition : null,
      salesScale: salesBased ? salesScale : false,
      salesTiers: salesBased && salesScale ? normalizedTiers : [],
      eligibleEmployeeIds:
        salesBased && !allEligibleEmployees ? eligibleEmployeeIds : null,
      active: concept?.active ?? true,
    };
    if (concept) {
      updateBonusFineConcept(concept.id, input);
      toast.success("Concepto actualizado en todas las listas dependientes.");
    } else {
      addBonusFineConcept(input);
      toast.success(
        temporary
          ? "Bono temporal creado; su avance y cierre ya alimentan nómina y reportes."
          : "Concepto creado y disponible en las listas dependientes.",
      );
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {concept ? `Editar ${dialogKindLabel}` : `Registrar ${dialogKindLabel}`}
          </DialogTitle>
          <DialogDescription>
            {type === "FINE"
              ? "La multa es un descuento de nómina por una incidencia o política de la empresa. Nunca se registra como bono ni como percepción."
              : "El bono es una percepción que alimenta Operación, nóminas y reportes cuando se aprueba o se cumple el reto al cierre."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Clase del concepto</Label>
            <Select
              value={type}
              disabled
              onValueChange={(value) => setType(value as MovementType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BONUS">BONO</SelectItem>
                <SelectItem value="FINE">MULTA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nómina donde se aplica</Label>
            <Select
              value={payrollModule}
              onValueChange={(value) => {
                setPayrollModule(
                  value as Exclude<PayrollModule, "CONSOLIDATED">,
                );
                setEligibleEmployeeIds([]);
                setAllEligibleEmployees(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.payrollModules
                  .filter(
                    (module) => module.active && module.id !== "CONSOLIDATED",
                  )
                  .map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="catalog-concept-name">Nombre del concepto</Label>
            <Input
              id="catalog-concept-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                type === "BONUS"
                  ? "BONO DE PRODUCTIVIDAD"
                  : "MULTA POR INCIDENCIA"
              }
            />
          </div>
          {type === "FINE" && (
            <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3 text-rose-950 dark:border-rose-800 dark:bg-rose-950/25 dark:text-rose-100 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                Efecto: descuento de nómina
              </p>
              <p className="mt-1 text-[11px] leading-5">
                Se aplica únicamente por una incidencia o política autorizada y resta el importe en la nómina seleccionada, recibos, costos y reportes.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              {temporary ? "Condición del bono" : "Tipo de cálculo"}
            </Label>
            {temporary ? (
              <Select
                value={condition}
                onValueChange={(value) => setCondition(value as BonusCondition)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES">META DE VENTA</SelectItem>
                  <SelectItem value="BONUS_COUNT">REGISTROS DE BONO</SelectItem>
                </SelectContent>
              </Select>
            ) : type === "FINE" ? (
              <Select value="FIXED" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">DESCUENTO FIJO</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as MovementMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">MONTO FIJO</SelectItem>
                  <SelectItem value="SCALE">META DE VENTA</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {salesBased && (
            <div className="space-y-2">
              <Label>Regla de venta</Label>
              <ToggleOption
                checked={salesScale}
                onChange={setSalesScale}
                label={salesScale ? "CON ESCALA" : "SIN ESCALA"}
                description={
                  salesScale
                    ? "Varios rangos con un premio por nivel"
                    : "Una meta de venta y un solo premio"
                }
              />
            </div>
          )}
          {(!salesBased || !salesScale) && (
            <div className="space-y-2">
              <Label htmlFor="catalog-default-amount">
                {type === "FINE" ? "Monto del descuento" : "Monto del bono"}
              </Label>
              <Input
                id="catalog-default-amount"
                type="number"
                min="0"
                step="0.01"
                value={defaultAmount}
                onChange={(event) => setDefaultAmount(event.target.value)}
              />
            </div>
          )}
          {(temporary || mode === "SCALE") && !(salesBased && salesScale) && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="catalog-threshold">
                {temporary && condition === "BONUS_COUNT"
                  ? "Número de bonos requeridos"
                  : "Venta mínima requerida"}
              </Label>
              <Input
                id="catalog-threshold"
                type="number"
                min="1"
                step={condition === "BONUS_COUNT" ? "1" : "0.01"}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </div>
          )}
          {salesBased && salesScale && (
            <section className="space-y-3 rounded-xl border border-[color:var(--border-color)] p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">Escala de venta</p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">
                    Define el rango y el bono que corresponde a cada nivel.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addTier}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Nivel
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                <span>Desde</span>
                <span>Hasta</span>
                <span>Bono</span>
                <span />
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {salesTiers.map((tier, index) => (
                  <div
                    key={tier.id}
                    className="grid grid-cols-[1fr_1fr_1fr_32px] items-center gap-2"
                  >
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`Venta desde nivel ${index + 1}`}
                      value={tier.from}
                      onChange={(event) =>
                        updateTier(tier.id, "from", event.target.value)
                      }
                      className="h-9"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`Venta hasta nivel ${index + 1}`}
                      placeholder="SIN TOPE"
                      value={tier.to ?? ""}
                      onChange={(event) =>
                        updateTier(tier.id, "to", event.target.value)
                      }
                      className="h-9"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`Bono nivel ${index + 1}`}
                      value={tier.amount}
                      onChange={(event) =>
                        updateTier(tier.id, "amount", event.target.value)
                      }
                      className="h-9"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={salesTiers.length === 1}
                      aria-label={`Eliminar nivel ${index + 1}`}
                      onClick={() =>
                        setSalesTiers((current) =>
                          current.filter((item) => item.id !== tier.id),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {salesBased && (
            <section className="space-y-3 rounded-xl border border-[color:var(--border-color)] p-3 sm:col-span-2">
              <ToggleOption
                checked={allEligibleEmployees}
                onChange={(checked) => {
                  setAllEligibleEmployees(checked);
                  if (checked) setEligibleEmployeeIds([]);
                }}
                label="APLICAR A TODOS LOS VENDEDORES"
                description={
                  allEligibleEmployees
                    ? `${sellerEmployees.length} vendedores elegibles`
                    : "Elegir participantes mediante casillas"
                }
              />
              {!allEligibleEmployees && (
                <SellerSelector
                  employees={sellerEmployees}
                  selectedIds={eligibleEmployeeIds}
                  onChange={setEligibleEmployeeIds}
                />
              )}
            </section>
          )}
          {!temporary && (
            <div className="sm:col-span-2">
              <ToggleOption
                checked={indefinite}
                onChange={(checked) => {
                  setIndefinite(checked);
                  setValidUntil(checked ? "" : currentPeriod.end);
                }}
                label="VIGENCIA POR TIEMPO INDETERMINADO"
                description={
                  indefinite
                    ? "El concepto permanece disponible hasta que el usuario master lo apague"
                    : "El concepto termina en la fecha indicada"
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="catalog-valid-from">Inicio de vigencia</Label>
            <Input
              id="catalog-valid-from"
              type="date"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-valid-until">
              Fin de vigencia {temporary ? "· obligatorio" : indefinite ? "· sin fin" : "· obligatorio"}
            </Label>
            <Input
              id="catalog-valid-until"
              type="date"
              min={validFrom}
              value={indefinite ? "" : validUntil}
              disabled={indefinite}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>
            {concept ? "Guardar cambios" : "Registrar concepto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConceptUsage {
  id: string;
  source: string;
  employee: string;
  location: string;
  payroll: string;
  date: string;
  period: string;
  amount: number;
  status: string;
}

const statusLabel: Record<string, string> = {
  DRAFT: "BORRADOR",
  PENDING: "POR APROBAR",
  APPROVED: "APROBADO",
  REJECTED: "RECHAZADO",
  CANCELLED: "CANCELADO",
};

function employeeDisplayName(employee: DemoEmployee | undefined) {
  if (!employee) return "PERSONAL NO DISPONIBLE";
  const separatedName = [
    employee.firstName,
    employee.paternalSurname,
    employee.maternalSurname,
  ].filter(Boolean);
  return separatedName.length > 0 ? separatedName.join(" ") : employee.name;
}

function DeleteConceptDialog({
  concept,
  open,
  onOpenChange,
}: {
  concept: DemoBonusFineConcept;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, deleteBonusFineConcept } = usePayrollDemo();
  const [reviewed, setReviewed] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const usages = useMemo<ConceptUsage[]>(() => {
    const branchNames = (branchIds: string[]) =>
      branchIds
        .map(
          (branchId) =>
            state.branches.find((branch) => branch.id === branchId)?.name,
        )
        .filter(Boolean)
        .join(", ") || "SIN SUCURSAL";
    const movementUsages = state.movements
      .filter((movement) => movement.catalogId === concept.id)
      .map((movement) => ({
        id: `movement-${movement.id}`,
        source: "MOVIMIENTO OPERATIVO",
        employee: employeeDisplayName(
          state.employees.find(
            (employee) => employee.id === movement.employeeId,
          ),
        ),
        location: branchNames(movement.costBranchIds),
        payroll: payrollModuleLabel(state, movement.payrollModule),
        date: movement.appliedAt,
        period: movement.periodStart,
        amount: movement.amount,
        status: statusLabel[movement.status] ?? movement.status,
      }));
    const adjustmentUsages = state.adjustments
      .filter(
        (adjustment) =>
          adjustment.type === concept.type &&
          adjustment.concept.trim().toLocaleUpperCase("es-MX") ===
            concept.name.trim().toLocaleUpperCase("es-MX"),
      )
      .map((adjustment) => ({
        id: `adjustment-${adjustment.id}`,
        source: "AJUSTE DE NÓMINA",
        employee: adjustment.participantIds
          .map((employeeId) =>
            employeeDisplayName(
              state.employees.find((employee) => employee.id === employeeId),
            ),
          )
          .join(", "),
        location: branchNames(adjustment.costBranchIds),
        payroll: payrollModuleLabel(state, adjustment.payrollModule),
        date: adjustment.payrollDate,
        period: adjustment.periodStart,
        amount: adjustment.amount,
        status: statusLabel[adjustment.status] ?? adjustment.status,
      }));
    const automaticAwardUsages =
      concept.temporary && concept.validUntil && concept.validUntil <= today
        ? temporaryBonusStandings(state, concept)
            .filter((standing) => standing.achieved)
            .filter(
              (standing) =>
                !state.movements.some(
                  (movement) =>
                    movement.catalogId === concept.id &&
                    movement.employeeId === standing.employee.id,
                ),
            )
            .map((standing) => ({
              id: `automatic-${concept.id}-${standing.employee.id}`,
              source: "PREMIO AUTOMÁTICO",
              employee: employeeDisplayName(standing.employee),
              location: branchNames(standing.employee.costBranchIds),
              payroll: payrollModuleLabel(state, concept.payrollModule),
              date: concept.validUntil!,
              period: `${concept.validFrom} — ${concept.validUntil}`,
              amount: standing.awardAmount,
              status: "GENERADO AL CIERRE",
            }))
        : [];

    return [
      ...movementUsages,
      ...adjustmentUsages,
      ...automaticAwardUsages,
    ].sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.employee.localeCompare(right.employee, "es-MX"),
    );
  }, [concept, state, today]);
  const hasUsages = usages.length > 0;

  function confirmDelete() {
    deleteBonusFineConcept(concept.id);
    toast.success(
      hasUsages
        ? `Concepto retirado. Sus ${usages.length} registros permanecen en el historial.`
        : "Concepto eliminado; no tenía registros relacionados.",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eliminar {concept.name}</DialogTitle>
          <DialogDescription>
            Revisa primero dónde se utilizó el concepto. La nómina y el
            historial nunca se borran junto con el catálogo.
          </DialogDescription>
        </DialogHeader>

        {hasUsages ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100">
              <p className="font-semibold">
                Este concepto ya tiene {usages.length}{" "}
                {usages.length === 1 ? "registro" : "registros"}.
              </p>
              <p className="mt-1 text-sm">
                Se retirará de las listas para registros nuevos, pero los
                movimientos siguientes permanecerán visibles y conservarán su
                efecto histórico.
              </p>
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-[color:var(--border-color)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ORIGEN / UBICACIÓN</TableHead>
                    <TableHead>PERSONAL</TableHead>
                    <TableHead>FECHA / PERIODO</TableHead>
                    <TableHead className="text-right">MONTO</TableHead>
                    <TableHead>ESTATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell>
                        <p className="text-xs font-semibold">{usage.source}</p>
                        <p className="text-[10px] text-[color:var(--text-muted)]">
                          {usage.location} · {usage.payroll}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {usage.employee}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{usage.date}</p>
                        <p className="text-[10px] text-[color:var(--text-muted)]">
                          CORTE {usage.period}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">
                        {money.format(usage.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{usage.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-100">
            <p className="font-semibold">No tiene registros relacionados.</p>
            <p className="mt-1 text-sm">
              El concepto puede eliminarse definitivamente sin afectar nóminas,
              recibos ni reportes.
            </p>
          </div>
        )}

        {hasUsages && reviewed && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/25 dark:text-rose-100">
            Confirmación final: el concepto desaparecerá del catálogo y de las
            listas nuevas. Sus {usages.length} registros conservarán empleado,
            periodo, sucursal, importe y estatus.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {hasUsages && !reviewed ? (
            <Button onClick={() => setReviewed(true)}>
              Revisé los registros
            </Button>
          ) : (
            <Button
              className="bg-rose-700 text-white hover:bg-rose-800"
              onClick={confirmDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar del catálogo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const catalogLabels: Record<
  ConceptPreset,
  { title: string; singular: string; description: string }
> = {
  BONUS: {
    title: "Catálogo de bonos",
    singular: "BONO",
    description: "Percepciones que suman un importe a la nómina cuando se autorizan.",
  },
  FINE: {
    title: "Catálogo de multas",
    singular: "MULTA",
    description: "Descuentos por incidencias o políticas autorizadas de la empresa.",
  },
  TEMPORARY: {
    title: "Catálogo de bonos temporales",
    singular: "BONO TEMPORAL",
    description: "Retos con fecha de inicio, cierre, seguimiento y premio por cumplimiento.",
  },
};

function conceptCatalog(concept: DemoBonusFineConcept): ConceptPreset {
  if (concept.temporary) return "TEMPORARY";
  return concept.type;
}

function conceptStatus(
  concept: DemoBonusFineConcept,
  today: string,
): CatalogStatusFilter {
  if (concept.deletedAt) return "RETIRED";
  if (!concept.active) return "INACTIVE";
  if (concept.validFrom > today) return "SCHEDULED";
  if (concept.validUntil && concept.validUntil < today) return "FINISHED";
  return "ACTIVE";
}

function conceptStatusLabel(status: CatalogStatusFilter) {
  return {
    ALL: "TODOS",
    ACTIVE: "ACTIVO",
    INACTIVE: "INACTIVO",
    SCHEDULED: "PROGRAMADO",
    FINISHED: "FINALIZADO",
    RETIRED: "RETIRADO",
  }[status];
}

function conceptRule(concept: DemoBonusFineConcept) {
  if (concept.type === "FINE")
    return `DESCUENTO FIJO · ${money.format(concept.defaultAmount)}`;
  if (concept.salesScale && concept.salesTiers?.length)
    return `${concept.salesTiers.length} NIVELES · DESDE ${money.format(Math.min(...concept.salesTiers.map((tier) => tier.from)))}`;
  if (concept.temporary && concept.condition === "BONUS_COUNT")
    return `${concept.threshold ?? 0} BONOS REGISTRADOS · PREMIO ${money.format(concept.defaultAmount)}`;
  if (concept.mode === "SCALE")
    return `VENTA ≥ ${money.format(concept.threshold ?? 0)} · PREMIO ${money.format(concept.defaultAmount)}`;
  return `BONO FIJO · ${money.format(concept.defaultAmount)}`;
}

export function PayrollBonusFineCatalogDemo() {
  const { state, setBonusFineConceptActive } = usePayrollDemo();
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const isMaster = activeEmployee?.roleId === "role-admin";
  const [dialog, setDialog] = useState<{
    concept: DemoBonusFineConcept | null;
    preset: ConceptPreset;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemoBonusFineConcept | null>(
    null,
  );
  const [activeCatalog, setActiveCatalog] = useState<ConceptPreset>("BONUS");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CatalogStatusFilter>("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState<"20" | "40" | "60" | "ALL">(
    "20",
  );
  const [page, setPage] = useState(1);
  const today = new Date().toISOString().slice(0, 10);
  const activeConcepts = state.bonusFineConcepts.filter(
    (concept) => !concept.deletedAt && concept.active,
  );
  const bonusCount = activeConcepts.filter(
    (concept) => concept.type === "BONUS" && !concept.temporary,
  ).length;
  const fineCount = activeConcepts.filter(
    (concept) => concept.type === "FINE" && !concept.temporary,
  ).length;
  const temporaryCount = activeConcepts.filter(
    (concept) => concept.temporary,
  ).length;
  const catalogCounts = useMemo(
    () => ({
      BONUS: state.bonusFineConcepts.filter(
        (concept) => conceptCatalog(concept) === "BONUS",
      ).length,
      FINE: state.bonusFineConcepts.filter(
        (concept) => conceptCatalog(concept) === "FINE",
      ).length,
      TEMPORARY: state.bonusFineConcepts.filter(
        (concept) => conceptCatalog(concept) === "TEMPORARY",
      ).length,
    }),
    [state.bonusFineConcepts],
  );
  const filteredConcepts = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("es-MX");
    return state.bonusFineConcepts
      .filter((concept) => conceptCatalog(concept) === activeCatalog)
      .filter(
        (concept) =>
          statusFilter === "ALL" ||
          conceptStatus(concept, today) === statusFilter,
      )
      .filter(
        (concept) =>
          moduleFilter === "ALL" || concept.payrollModule === moduleFilter,
      )
      .filter((concept) =>
        `${concept.name} ${payrollModuleLabel(state, concept.payrollModule)} ${conceptRule(concept)}`
          .toLocaleLowerCase("es-MX")
          .includes(normalized),
      )
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          left.name.localeCompare(right.name, "es-MX"),
      );
  }, [activeCatalog, moduleFilter, search, state, statusFilter, today]);
  const numericPageSize = pageSize === "ALL" ? filteredConcepts.length || 1 : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredConcepts.length / numericPageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedConcepts =
    pageSize === "ALL"
      ? filteredConcepts
      : filteredConcepts.slice(
          (currentPage - 1) * numericPageSize,
          currentPage * numericPageSize,
        );
  const selectedCatalog = catalogLabels[activeCatalog];
  const exportConfig = useMemo<ReportExportConfig<DemoBonusFineConcept>>(
    () => ({
      title: selectedCatalog.title,
      subtitle: `${filteredConcepts.length} registros · información del catálogo seleccionado`,
      filename: `catalogo-${activeCatalog.toLocaleLowerCase("es-MX")}-${today}`,
      sheetName: selectedCatalog.title,
      orientation: "landscape",
      metadata: [
        { label: "Catálogo", value: selectedCatalog.title },
        { label: "Fecha del reporte", value: today },
        {
          label: "Estatus",
          value: conceptStatusLabel(statusFilter),
        },
        {
          label: "Nómina",
          value:
            moduleFilter === "ALL"
              ? "TODAS"
              : payrollModuleLabel(
                  state,
                  moduleFilter as Exclude<PayrollModule, "CONSOLIDATED">,
                ),
        },
      ],
      columns: [
        { header: "Concepto", accessor: (row) => row.name, width: 30 },
        {
          header: "Efecto",
          accessor: (row) =>
            row.type === "FINE" ? "DESCUENTO DE NÓMINA" : "PERCEPCIÓN DE NÓMINA",
          width: 22,
        },
        {
          header: "Nómina",
          accessor: (row) => payrollModuleLabel(state, row.payrollModule),
          width: 20,
        },
        { header: "Regla / detalle", accessor: conceptRule, width: 34 },
        { header: "Inicio", accessor: (row) => row.validFrom, width: 14 },
        {
          header: "Fin",
          accessor: (row) => row.validUntil ?? "TIEMPO INDETERMINADO",
          width: 22,
        },
        { header: "Registrado", accessor: (row) => row.createdAt, width: 16 },
        {
          header: "Estatus",
          accessor: (row) => conceptStatusLabel(conceptStatus(row, today)),
          width: 16,
        },
      ],
      rows: filteredConcepts,
      analysis: [
        `Este documento contiene exclusivamente ${selectedCatalog.title.toLocaleLowerCase("es-MX")} según los filtros seleccionados.`,
        activeCatalog === "FINE"
          ? "Todos los importes de este catálogo representan descuentos por incidencias o políticas autorizadas; no son bonos ni percepciones."
          : "Todos los importes de este catálogo representan percepciones sujetas a aprobación o cumplimiento.",
      ],
    }),
    [
      activeCatalog,
      filteredConcepts,
      moduleFilter,
      selectedCatalog,
      state,
      statusFilter,
      today,
    ],
  );

  return (
    <TooltipProvider>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">CATÁLOGO DE CONFIGURACIÓN</Badge>
              <span className="text-xs text-[color:var(--text-muted)]">
                Consulta y mantenimiento del catálogo
              </span>
            </div>
            <h1 className="page-title">Conceptos de bonos y multas</h1>
            <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
              Define los conceptos disponibles, su vigencia y la nómina que
              afectarán. Cada alta se refleja en las listas dependientes de
              Operación, nómina, costos, dashboard y reportes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!isMaster}
              onClick={() => setDialog({ concept: null, preset: "FINE" })}
            >
              <Gavel className="mr-2 h-4 w-4" /> Registrar multa
            </Button>
            <Button
              variant="outline"
              disabled={!isMaster}
              onClick={() => setDialog({ concept: null, preset: "BONUS" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Registrar bono
            </Button>
            <Button
              disabled={!isMaster}
              onClick={() => setDialog({ concept: null, preset: "TEMPORARY" })}
            >
              <TimerReset className="mr-2 h-4 w-4" /> Bono temporal
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="label-caps mt-4">CONCEPTOS ACTIVOS</p>
              <p className="number-display mt-2 text-2xl">
                {activeConcepts.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <p className="label-caps mt-4">BONOS DISPONIBLES</p>
              <p className="number-display mt-2 text-2xl">{bonusCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Gavel className="h-5 w-5 text-rose-600" />
              <p className="label-caps mt-4">MULTAS DISPONIBLES</p>
              <p className="number-display mt-2 text-2xl">{fineCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <TimerReset className="h-5 w-5 text-amber-600" />
              <p className="label-caps mt-4">RETOS TEMPORALES</p>
              <p className="number-display mt-2 text-2xl">{temporaryCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-3" aria-label="Seleccionar catálogo">
          {(["BONUS", "FINE", "TEMPORARY"] as ConceptPreset[]).map(
            (catalog) => {
              const active = activeCatalog === catalog;
              const Icon =
                catalog === "FINE"
                  ? Gavel
                  : catalog === "TEMPORARY"
                    ? TimerReset
                    : Sparkles;
              return (
                <button
                  key={catalog}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setActiveCatalog(catalog);
                    setSearch("");
                    setStatusFilter("ALL");
                    setModuleFilter("ALL");
                    setPage(1);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99568] ${active ? "border-[#a77d52] bg-[linear-gradient(120deg,#30251e,#654832)] text-white shadow-lg" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)] hover:bg-[color:var(--accent-hover)]/30"}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/10 text-[#f2d8b8]" : catalog === "FINE" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : "bg-[color:var(--accent-hover)] text-[#987049]"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {catalogLabels[catalog].title}
                    </span>
                    <span className={`mt-0.5 block text-[10px] ${active ? "text-white/65" : "text-[color:var(--text-muted)]"}`}>
                      {catalogCounts[catalog]} registros con historial
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-65" />
                </button>
              );
            },
          )}
        </div>

        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader className="border-b border-[color:var(--border-color)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" /> {selectedCatalog.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedCatalog.description} El historial retirado permanece navegable.
                </CardDescription>
              </div>
              <ReportExportButtons
                config={exportConfig}
                disabled={!filteredConcepts.length}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  placeholder="BUSCAR NOMBRE, REGLA O NÓMINA"
                  aria-label={`Buscar en ${selectedCatalog.title}`}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as CatalogStatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filtrar por estatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ALL", "ACTIVE", "INACTIVE", "SCHEDULED", "FINISHED", "RETIRED"] as CatalogStatusFilter[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {conceptStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={moduleFilter}
                onValueChange={(value) => {
                  setModuleFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filtrar por nómina">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">TODAS LAS NÓMINAS</SelectItem>
                  {state.payrollModules
                    .filter((module) => module.id !== "CONSOLIDATED")
                    .map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CONCEPTO</TableHead>
                    <TableHead>EFECTO</TableHead>
                    <TableHead>NÓMINA</TableHead>
                    <TableHead>REGLA</TableHead>
                    <TableHead>REGISTRO / VIGENCIA</TableHead>
                    <TableHead>ESTATUS</TableHead>
                    <TableHead className="text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedConcepts.map((concept) => {
                    const status = conceptStatus(concept, today);
                    const retired = status === "RETIRED";
                    return (
                    <TableRow key={concept.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{concept.name}</p>
                          {concept.temporary && (
                            <Badge className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
                              TEMPORAL
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {catalogLabels[conceptCatalog(concept)].singular}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={concept.type === "FINE" ? "border-rose-300 text-rose-700 dark:text-rose-300" : "border-emerald-300 text-emerald-700 dark:text-emerald-300"}
                        >
                          {concept.type === "FINE" ? "DESCUENTO" : "PERCEPCIÓN"}
                        </Badge>
                        <p className="mt-1 max-w-40 text-[9px] leading-4 text-[color:var(--text-muted)]">
                          {concept.type === "FINE"
                            ? "Incidencia o política autorizada"
                            : "Suma al pago autorizado"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {payrollModuleLabel(state, concept.payrollModule)}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-xs text-xs font-semibold">
                          {conceptRule(concept)}
                        </p>
                        {concept.mode === "SCALE" && (
                          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
                            {concept.eligibleEmployeeIds
                              ? `${concept.eligibleEmployeeIds.length} vendedores seleccionados`
                              : "Todos los vendedores"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold">REGISTRADO {concept.createdAt}</p>
                        <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                          {concept.validFrom} — {concept.validUntil ?? "TIEMPO INDETERMINADO"}
                        </p>
                        {concept.deletedAt && (
                          <p className="mt-1 text-[9px] font-semibold text-rose-700 dark:text-rose-300">
                            RETIRADO {concept.deletedAt}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {conceptStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Editar ${concept.name}`}
                                disabled={!isMaster || retired}
                                onClick={() =>
                                  setDialog({
                                    concept,
                                    preset: concept.temporary
                                      ? "TEMPORARY"
                                      : concept.type,
                                  })
                                }
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar concepto</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`${concept.active ? "Desactivar" : "Activar"} ${concept.name}`}
                                disabled={!isMaster || retired}
                                onClick={() => {
                                  setBonusFineConceptActive(
                                    concept.id,
                                    !concept.active,
                                  );
                                  toast.success(
                                    concept.active
                                      ? "Concepto retirado de las listas nuevas; el historial permanece."
                                      : "Concepto habilitado en las listas de nómina.",
                                  );
                                }}
                              >
                                <Power
                                  className={`h-4 w-4 ${concept.active ? "text-rose-600" : "text-emerald-600"}`}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {concept.active ? "Desactivar" : "Activar"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Eliminar ${concept.name}`}
                                disabled={!isMaster || retired}
                                onClick={() => setDeleteTarget(concept)}
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar concepto</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {pagedConcepts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <History className="mx-auto h-6 w-6 text-[color:var(--text-muted)]" />
                        <p className="mt-3 text-sm font-semibold">Sin registros en esta selección</p>
                        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                          Ajusta los filtros o registra un concepto nuevo en este catálogo.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                  Filas
                </span>
                <Select
                  value={pageSize}
                  onValueChange={(value) => {
                    setPageSize(value as typeof pageSize);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-24" aria-label="Registros por página">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="ALL">TODOS</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-[color:var(--text-muted)]">
                  {filteredConcepts.length} registros del catálogo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <span className="min-w-20 text-center text-xs">
                  <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {dialog && (
          <ConceptDialog
            key={dialog.concept?.id ?? `new-${dialog.preset}`}
            concept={dialog.concept}
            preset={dialog.preset}
            open
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
          />
        )}
        {deleteTarget && (
          <DeleteConceptDialog
            key={deleteTarget.id}
            concept={deleteTarget}
            open
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
