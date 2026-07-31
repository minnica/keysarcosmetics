"use client";

import { useState } from "react";
import { CircleHelp, Pencil, PlusCircle, Trash2, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ColumnDef,
  DataTable,
  DatePicker,
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
import { MetricCard } from "@/components/payroll/metric-card";
import { SectionCard } from "@/components/payroll/section-card";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { apiErrorMessage } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  uppercaseInput,
} from "@/lib/format";
import type { CommissionScheme, SchemeAssignment } from "@/lib/types";

type RangeForm = { to: string; commissionPercent: string };
type SchemeForm = { name: string; effectiveFrom: string; ranges: RangeForm[] };
type RangeFormError = {
  from?: string | undefined;
  to?: string | undefined;
  commissionPercent?: string | undefined;
};
type SchemeFormErrors = {
  name?: string | undefined;
  effectiveFrom?: string | undefined;
  ranges: RangeFormError[];
};

function currentFortnight() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() < 16 ? 1 : 16,
  );
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}
function nextFortnight() {
  const now = new Date();
  const next =
    now.getDate() < 16
      ? new Date(now.getFullYear(), now.getMonth(), 16)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}
const EMPTY_RANGE: RangeForm = { to: "", commissionPercent: "" };
const EMPTY_SCHEME: SchemeForm = {
  name: "",
  effectiveFrom: nextFortnight(),
  ranges: [{ ...EMPTY_RANGE }],
};

function rangeStart(ranges: RangeForm[], index: number): number | null {
  if (index === 0) return 0;
  const previousLimit = Number(ranges[index - 1]?.to);
  return Number.isFinite(previousLimit) && ranges[index - 1]?.to.trim()
    ? Number((previousLimit + 0.01).toFixed(2))
    : null;
}

function formatRangeAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function validateName(name: string, duplicated: boolean): string | undefined {
  if (!name.trim()) return "Escribe un nombre para identificar el esquema.";
  if (name.trim().length > 80)
    return "El nombre puede tener máximo 80 caracteres.";
  if (duplicated) return "Ya existe un esquema con este nombre.";
  return undefined;
}

function validateEffectiveFrom(value: string): string | undefined {
  if (!value) return "Selecciona la fecha de inicio.";
  const day = Number(value.split("-")[2]);
  if (day !== 1 && day !== 16) {
    return "La vigencia debe comenzar el día 1 o 16 del mes.";
  }
  return undefined;
}

function validateRange(ranges: RangeForm[], index: number): RangeFormError {
  const range = ranges[index];
  if (!range) return {};
  const from = rangeStart(ranges, index);
  const isLast = index === ranges.length - 1;
  const error: RangeFormError = {};

  if (from == null) {
    error.from = "Completa primero el límite del nivel anterior.";
  }

  if (!isLast) {
    if (!range.to.trim()) {
      error.to = "Indica hasta qué monto aplica este nivel.";
    } else {
      const to = Number(range.to);
      if (!Number.isFinite(to) || to < 0) {
        error.to = "Escribe un monto válido, por ejemplo 9999.99.";
      } else if (from != null && to < from) {
        error.to = `Debe ser igual o mayor que ${formatRangeAmount(from)}.`;
      }
    }
  }

  if (!range.commissionPercent.trim()) {
    error.commissionPercent = "Escribe el porcentaje de comisión.";
  } else {
    const percent = Number(range.commissionPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      error.commissionPercent = "Usa un porcentaje entre 0 y 100.";
    }
  }

  return error;
}

function hasRangeError(error: RangeFormError): boolean {
  return Boolean(error.from || error.to || error.commissionPercent);
}

export default function EsquemasPage() {
  const data = usePayrollData();
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionScheme | null>(null);
  const [schemeForm, setSchemeForm] = useState<SchemeForm>(EMPTY_SCHEME);
  const [schemeErrors, setSchemeErrors] = useState<SchemeFormErrors>({
    ranges: [],
  });
  const [assignmentForm, setAssignmentForm] = useState({
    employeeId: "",
    schemeId: "",
    effectiveFrom: currentFortnight(),
  });
  const [deleteScheme, setDeleteScheme] = useState<CommissionScheme | null>(
    null,
  );
  const [deleteAssignment, setDeleteAssignment] =
    useState<SchemeAssignment | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setSchemeForm({
      ...EMPTY_SCHEME,
      effectiveFrom: currentFortnight(),
      ranges: [{ ...EMPTY_RANGE }],
    });
    setSchemeErrors({ ranges: [] });
    setSchemeOpen(true);
  }
  function openEdit(scheme: CommissionScheme) {
    setEditing(scheme);
    setSchemeForm({
      name: scheme.name,
      effectiveFrom: nextFortnight(),
      ranges: scheme.ranges.map((range) => ({
        to: range.to == null ? "" : String(range.to),
        commissionPercent: String(Number((range.rate * 100).toFixed(4))),
      })),
    });
    setSchemeErrors({ ranges: [] });
    setSchemeOpen(true);
  }
  function updateRange(index: number, field: keyof RangeForm, value: string) {
    setSchemeForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, itemIndex) =>
        itemIndex === index ? { ...range, [field]: value } : range,
      ),
    }));
    setSchemeErrors((current) => ({
      ...current,
      ranges: current.ranges.map((error, itemIndex) =>
        itemIndex === index
          ? { ...error, [field]: undefined }
          : field === "to" && itemIndex === index + 1
            ? { ...error, from: undefined }
            : error,
      ),
    }));
  }
  async function saveScheme() {
    const normalizedName = schemeForm.name.trim().toLocaleUpperCase("es-MX");
    const duplicatedName = data.schemes.some(
      (scheme) =>
        scheme.id !== editing?.id &&
        scheme.name.trim().toLocaleUpperCase("es-MX") === normalizedName,
    );
    const errors: SchemeFormErrors = {
      name: validateName(schemeForm.name, duplicatedName),
      effectiveFrom: validateEffectiveFrom(schemeForm.effectiveFrom),
      ranges: schemeForm.ranges.map((_, index) =>
        validateRange(schemeForm.ranges, index),
      ),
    };
    setSchemeErrors(errors);
    if (
      errors.name ||
      errors.effectiveFrom ||
      errors.ranges.some(hasRangeError)
    ) {
      toast.error("Revisa los campos marcados antes de guardar el esquema.");
      return;
    }
    const tiers = schemeForm.ranges.map((range, index) => ({
      fromAmount: rangeStart(schemeForm.ranges, index) ?? 0,
      toAmount:
        index === schemeForm.ranges.length - 1 ? null : Number(range.to),
      rate: Number(range.commissionPercent) / 100,
    }));
    setSaving(true);
    try {
      await data.saveScheme({
        ...(editing ? { id: editing.id } : {}),
        name: schemeForm.name,
        effectiveFrom: schemeForm.effectiveFrom,
        tiers,
      });
      setSchemeOpen(false);
      toast.success(editing ? "Nueva versión programada." : "Esquema creado.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  async function saveAssignment() {
    if (
      !assignmentForm.employeeId ||
      !assignmentForm.schemeId ||
      !assignmentForm.effectiveFrom
    ) {
      toast.error("Completa empleado, esquema y vigencia.");
      return;
    }
    setSaving(true);
    try {
      await data.saveAssignment(assignmentForm);
      setAssignmentOpen(false);
      toast.success("Asignación guardada con vigencia histórica.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  async function removeScheme() {
    if (!deleteScheme) return;
    try {
      await data.removeScheme(deleteScheme.id);
      setDeleteScheme(null);
      toast.success("Esquema desactivado.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }
  async function removeAssignment() {
    if (!deleteAssignment) return;
    try {
      await data.removeAssignment(deleteAssignment.id);
      setDeleteAssignment(null);
      toast.success("Asignación cerrada.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const schemeColumns: ColumnDef<CommissionScheme>[] = [
    {
      accessorKey: "name",
      header: "ESQUEMA",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-[var(--text-muted)]">
            VERSIÓN {row.original.versions[0]?.version ?? 0} · DESDE{" "}
            {formatDate(row.original.versions[0]?.effectiveFrom ?? "")}
          </p>
        </div>
      ),
    },
    {
      id: "ranges",
      accessorFn: (row) =>
        row.ranges
          .map((range) => `${range.from}-${range.to ?? "∞"} ${range.rate}`)
          .join(" "),
      header: "RANGOS",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.ranges.map((range, index) => (
            <span
              key={index}
              className="rounded-full bg-[var(--accent-hover)] px-2 py-1 text-xs"
            >
              {formatCurrency(range.from)} –{" "}
              {range.to == null ? "SIN LÍMITE" : formatCurrency(range.to)} ·{" "}
              {formatPercent(range.rate)}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "ACCIONES",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => openEdit(row.original)}
            aria-label="Editar esquema"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeleteScheme(row.original)}
            aria-label="Desactivar esquema"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];
  const assignmentColumns: ColumnDef<SchemeAssignment>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          {!row.original.employeeActive && (
            <p className="text-xs text-[var(--text-muted)]">INACTIVO</p>
          )}
        </div>
      ),
    },
    { accessorKey: "schemeName", header: "ESQUEMA" },
    {
      accessorKey: "effectiveFrom",
      header: "DESDE",
      cell: ({ row }) => formatDate(row.original.effectiveFrom),
    },
    {
      accessorKey: "effectiveTo",
      header: "HASTA",
      cell: ({ row }) =>
        row.original.effectiveTo
          ? formatDate(row.original.effectiveTo)
          : "VIGENTE",
    },
    {
      id: "actions",
      header: "ACCIONES",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) =>
        !row.original.effectiveTo && (
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDeleteAssignment(row.original)}
              aria-label="Cerrar asignación"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
    },
  ];
  const maxRate = Math.max(
    0,
    ...data.schemes.flatMap((scheme) =>
      scheme.ranges.map((range) => range.rate),
    ),
  );
  const selectedEmployeeHasOpenAssignment = data.assignments.some(
    (assignment) =>
      assignment.employeeId === assignmentForm.employeeId &&
      !assignment.effectiveTo,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Esquemas de comisión</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Versiones y asignaciones con vigencia quincenal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAssignmentForm({
                employeeId: "",
                schemeId: "",
                effectiveFrom: currentFortnight(),
              });
              setAssignmentOpen(true);
            }}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Asignar esquema
          </Button>
          <Button onClick={openCreate}>
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Nuevo esquema
          </Button>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Esquemas activos"
          value={`${data.schemes.filter((item) => item.active).length}`}
          tone="gold"
        />
        <MetricCard
          label="Asignaciones vigentes"
          value={`${data.assignments.filter((item) => !item.effectiveTo).length}`}
          tone="sage"
        />
        <MetricCard
          label="Comisión máxima"
          value={formatPercent(maxRate)}
          tone="blue"
        />
      </div>
      <SectionCard title="ESQUEMAS REGISTRADOS">
        <DataTable
          columns={schemeColumns}
          data={data.schemes.filter((item) => item.active)}
          searchPlaceholder="Buscar esquema"
          emptyMessage="Sin esquemas; crea el primero antes de calcular ventas."
          pageSize={10}
        />
      </SectionCard>
      <SectionCard title="HISTORIAL DE ASIGNACIONES">
        <DataTable
          columns={assignmentColumns}
          data={data.assignments}
          searchPlaceholder="Buscar empleado o esquema"
          emptyMessage="Sin asignaciones."
          pageSize={10}
        />
      </SectionCard>

      <Dialog open={schemeOpen} onOpenChange={setSchemeOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Programar nueva versión" : "Nuevo esquema"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "La versión actual seguirá intacta en corridas históricas."
                : "Define la comisión que corresponde según las ventas de la quincena."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheme-name">Nombre del esquema</Label>
              <Input
                id="scheme-name"
                value={schemeForm.name}
                onChange={(event) => {
                  setSchemeForm((current) => ({
                    ...current,
                    name: uppercaseInput(event.target.value),
                  }));
                  setSchemeErrors((current) => ({
                    ...current,
                    name: undefined,
                  }));
                }}
                onBlur={() => {
                  const normalizedName = schemeForm.name
                    .trim()
                    .toLocaleUpperCase("es-MX");
                  const duplicated = data.schemes.some(
                    (scheme) =>
                      scheme.id !== editing?.id &&
                      scheme.name.trim().toLocaleUpperCase("es-MX") ===
                        normalizedName,
                  );
                  setSchemeErrors((current) => ({
                    ...current,
                    name: validateName(schemeForm.name, duplicated),
                  }));
                }}
                placeholder="Ej. COMISIÓN ESTÁNDAR"
                maxLength={80}
                aria-invalid={Boolean(schemeErrors.name)}
                aria-describedby={
                  schemeErrors.name ? "scheme-name-error" : undefined
                }
              />
              {schemeErrors.name ? (
                <p
                  id="scheme-name-error"
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {schemeErrors.name}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Usa un nombre reconocible para poder asignarlo después.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Vigente desde</Label>
              <DatePicker
                value={schemeForm.effectiveFrom}
                onChange={(value) => {
                  setSchemeForm((current) => ({
                    ...current,
                    effectiveFrom: value,
                  }));
                  setSchemeErrors((current) => ({
                    ...current,
                    effectiveFrom: validateEffectiveFrom(value),
                  }));
                }}
              />
              {schemeErrors.effectiveFrom ? (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {schemeErrors.effectiveFrom}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Los esquemas comienzan el día 1 o 16 del mes.
                </p>
              )}
            </div>
            <div className="space-y-4 md:col-span-2">
              <div className="flex gap-3 rounded-lg bg-[var(--table-row-alt)] p-3 text-sm text-[var(--text-muted)]">
                <CircleHelp
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <p>
                  El primer nivel comienza en $0 y el último continúa sin
                  límite. Tú solo defines los cortes intermedios y el porcentaje
                  de comisión.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-[var(--border-color)]">
                {schemeForm.ranges.map((range, index) => {
                  const from = rangeStart(schemeForm.ranges, index);
                  const isLast = index === schemeForm.ranges.length - 1;
                  const error = schemeErrors.ranges[index] ?? {};
                  return (
                    <div
                      key={index}
                      className="space-y-3 border-b border-[var(--border-color)] p-4 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">Nivel {index + 1}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {isLast
                              ? "Este nivel cubre todos los montos restantes."
                              : "Define el monto máximo para este nivel."}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={schemeForm.ranges.length === 1}
                          onClick={() => {
                            setSchemeForm((current) => {
                              const ranges = current.ranges.filter(
                                (_, itemIndex) => itemIndex !== index,
                              );
                              return {
                                ...current,
                                ranges: ranges.map((item, itemIndex) =>
                                  itemIndex === ranges.length - 1
                                    ? { ...item, to: "" }
                                    : item,
                                ),
                              };
                            });
                            setSchemeErrors({ ranges: [] });
                          }}
                          aria-label={`Eliminar nivel ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`scheme-from-${index}`}>
                            Ventas desde
                          </Label>
                          <Input
                            id={`scheme-from-${index}`}
                            value={from == null ? "" : formatRangeAmount(from)}
                            placeholder="Completa el nivel anterior"
                            readOnly
                            className="bg-[var(--input-disabled-bg)]"
                            aria-invalid={Boolean(error.from)}
                            aria-describedby={
                              error.from
                                ? `scheme-from-${index}-error`
                                : undefined
                            }
                          />
                          {error.from ? (
                            <p
                              id={`scheme-from-${index}-error`}
                              className="text-xs text-red-600 dark:text-red-400"
                              role="alert"
                            >
                              {error.from}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`scheme-to-${index}`}>
                            Ventas hasta
                          </Label>
                          {isLast ? (
                            <Input
                              id={`scheme-to-${index}`}
                              value="Sin límite"
                              readOnly
                              className="bg-[var(--input-disabled-bg)] font-medium"
                              aria-label="Ventas hasta, sin límite"
                            />
                          ) : (
                            <Input
                              id={`scheme-to-${index}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={range.to}
                              onChange={(event) =>
                                updateRange(index, "to", event.target.value)
                              }
                              onBlur={() =>
                                setSchemeErrors((current) => {
                                  const ranges = [...current.ranges];
                                  ranges[index] = validateRange(
                                    schemeForm.ranges,
                                    index,
                                  );
                                  if (schemeForm.ranges[index + 1]) {
                                    ranges[index + 1] = validateRange(
                                      schemeForm.ranges,
                                      index + 1,
                                    );
                                  }
                                  return { ...current, ranges };
                                })
                              }
                              placeholder="Ej. 9999.99"
                              aria-invalid={Boolean(error.to)}
                              aria-describedby={
                                error.to
                                  ? `scheme-to-${index}-error`
                                  : undefined
                              }
                            />
                          )}
                          {error.to ? (
                            <p
                              id={`scheme-to-${index}-error`}
                              className="text-xs text-red-600 dark:text-red-400"
                              role="alert"
                            >
                              {error.to}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`scheme-percent-${index}`}>
                            Comisión
                          </Label>
                          <div className="relative">
                            <Input
                              id={`scheme-percent-${index}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="100"
                              step="0.01"
                              value={range.commissionPercent}
                              onChange={(event) =>
                                updateRange(
                                  index,
                                  "commissionPercent",
                                  event.target.value,
                                )
                              }
                              onBlur={() =>
                                setSchemeErrors((current) => {
                                  const ranges = [...current.ranges];
                                  ranges[index] = validateRange(
                                    schemeForm.ranges,
                                    index,
                                  );
                                  return { ...current, ranges };
                                })
                              }
                              placeholder="Ej. 10"
                              className="pr-9"
                              aria-invalid={Boolean(error.commissionPercent)}
                              aria-describedby={
                                error.commissionPercent
                                  ? `scheme-percent-${index}-error`
                                  : `scheme-percent-${index}-help`
                              }
                            />
                            <span
                              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--text-muted)]"
                              aria-hidden="true"
                            >
                              %
                            </span>
                          </div>
                          {error.commissionPercent ? (
                            <p
                              id={`scheme-percent-${index}-error`}
                              className="text-xs text-red-600 dark:text-red-400"
                              role="alert"
                            >
                              {error.commissionPercent}
                            </p>
                          ) : (
                            <p
                              id={`scheme-percent-${index}-help`}
                              className="text-xs text-[var(--text-muted)]"
                            >
                              Escribe 10 para aplicar 10%.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={schemeForm.ranges.length >= 12}
                onClick={() => {
                  setSchemeForm((current) => ({
                    ...current,
                    ranges: [...current.ranges, { ...EMPTY_RANGE }],
                  }));
                  setSchemeErrors((current) => ({
                    ...current,
                    ranges: [...current.ranges, {}],
                  }));
                }}
              >
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Agregar otro nivel
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchemeOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void saveScheme()}>
              {saving
                ? "Guardando…"
                : editing
                  ? "Programar versión"
                  : "Crear esquema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar esquema</DialogTitle>
            <DialogDescription>
              La primera asignación puede iniciar en la quincena actual; un
              cambio existente inicia en la siguiente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado activo</Label>
              <Select
                value={assignmentForm.employeeId}
                onValueChange={(value) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    employeeId: value,
                    effectiveFrom: data.assignments.some(
                      (assignment) =>
                        assignment.employeeId === value &&
                        !assignment.effectiveTo,
                    )
                      ? nextFortnight()
                      : currentFortnight(),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona empleado" />
                </SelectTrigger>
                <SelectContent>
                  {data.employees
                    .filter((item) => item.active)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {item.position}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Esquema</Label>
              <Select
                value={assignmentForm.schemeId}
                onValueChange={(value) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    schemeId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona esquema" />
                </SelectTrigger>
                <SelectContent>
                  {data.schemes
                    .filter((item) => item.active)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vigente desde</Label>
              <DatePicker
                value={assignmentForm.effectiveFrom}
                onChange={(value) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    effectiveFrom: value,
                  }))
                }
              />
              <p className="text-xs text-[var(--text-muted)]">
                {selectedEmployeeHasOpenAssignment
                  ? `Este empleado ya tiene una asignación vigente. El cambio puede iniciar desde ${formatDate(nextFortnight())}.`
                  : `Para la nómina actual, conserva el inicio en ${formatDate(currentFortnight())} o selecciona una quincena anterior.`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void saveAssignment()}>
              Guardar asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteScheme)}
        onOpenChange={(value) => !value && setDeleteScheme(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar esquema</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en nuevas asignaciones; las versiones
              históricas se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void removeScheme()}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(deleteAssignment)}
        onOpenChange={(value) => !value && setDeleteAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar asignación</AlertDialogTitle>
            <AlertDialogDescription>
              La asignación dejará de estar vigente sin borrar su historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void removeAssignment()}
            >
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
