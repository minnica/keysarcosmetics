"use client";

import { useMemo, useState } from "react";
import { Check, FileText, Pencil, PlusCircle, Upload, X } from "lucide-react";
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
  Textarea,
  toast,
  type DateRange,
} from "@cosmetics/ui";
import { DateFilterCard } from "@/components/payroll/date-filter-card";
import { MetricCard } from "@/components/payroll/metric-card";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { StatusBadge } from "@/components/payroll/status-badge";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { apiErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import {
  dateRangeFilename,
  describeDateRange,
  EMPTY_DATE_RANGE,
  isDateInRange,
} from "@/lib/date-range";
import {
  formatCurrency,
  formatDate,
  formatStatus,
  sumBy,
  uppercaseInput,
} from "@/lib/format";
import type {
  MovementKind,
  MovementStatus,
  PayrollMovement,
} from "@/lib/types";

const KIND_OPTIONS: Array<{ value: MovementKind; label: string }> = [
  { value: "ADJUSTMENT_POSITIVE", label: "Ajuste +" },
  { value: "ADJUSTMENT_NEGATIVE", label: "Ajuste -" },
  { value: "FINE", label: "Multa" },
  { value: "BONUS", label: "Bono" },
  { value: "PER_DIEM", label: "Viáticos" },
  { value: "SUPPLIES", label: "Insumos" },
];
type AllocationForm = {
  employeeId: string;
  branchId: string;
  amount: string;
  commissionable: boolean;
};
type FormState = {
  date: string;
  kind: MovementKind | "";
  catalogItemId: string;
  concept: string;
  totalAmount: string;
  notes: string;
  allocations: AllocationForm[];
};
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM: FormState = {
  date: today(),
  kind: "",
  catalogItemId: "",
  concept: "",
  totalAmount: "0",
  notes: "",
  allocations: [
    {
      employeeId: "",
      branchId: "CORPORATIVO",
      amount: "0",
      commissionable: true,
    },
  ],
};

export default function MovimientosPage() {
  const data = usePayrollData();
  const { canWrite } = useSession();
  const hasWriteAccess = canWrite("payroll/movimientos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [statusTarget, setStatusTarget] = useState<{
    movement: PayrollMovement;
    status: MovementStatus;
  } | null>(null);
  const employees = data.employees.filter((employee) => employee.active);
  const catalog =
    form.kind === "BONUS"
      ? data.bonuses
      : form.kind === "FINE"
        ? data.fines
        : form.kind === "PER_DIEM"
          ? data.perDiems
          : [];
  const needsEvidence = form.kind === "PER_DIEM" || form.kind === "SUPPLIES";

  const filteredMovements = useMemo(
    () =>
      data.movements.filter((movement) =>
        isDateInRange(movement.date, dateRange),
      ),
    [data.movements, dateRange],
  );
  const approvedTotal = sumBy(
    filteredMovements.filter((item) => item.status === "APPROVED"),
    (item) => item.amount,
  );
  const pendingTotal = sumBy(
    filteredMovements.filter((item) => item.status === "PENDING"),
    (item) => Math.abs(item.amount),
  );

  function setKind(kind: MovementKind) {
    setForm((current) => ({
      ...current,
      kind,
      catalogItemId: "",
      concept: "",
      totalAmount: "0",
      notes: "",
      allocations: current.allocations.map((item) => ({
        ...item,
        amount: "0",
        commissionable: true,
      })),
    }));
    setFile(null);
  }

  function editMovement(movement: PayrollMovement) {
    setEditingId(movement.id);
    setForm({
      date: movement.date,
      kind: movement.kind,
      catalogItemId: movement.catalogItemId ?? "",
      concept: movement.concept,
      totalAmount: String(movement.totalAmount),
      notes: movement.notes,
      allocations: movement.allocations.map((allocation) => ({
        employeeId: allocation.employeeId,
        branchId: allocation.branchId ?? "CORPORATIVO",
        amount: String(allocation.amount),
        commissionable: allocation.commissionable,
      })),
    });
    setFile(null);
    setDialogOpen(true);
  }

  function selectCatalog(id: string) {
    const item = catalog.find((candidate) => candidate.id === id);
    if (!item) return;
    setForm((current) => {
      const total = item.amount;
      const base = Math.floor((total / current.allocations.length) * 100) / 100;
      return {
        ...current,
        catalogItemId: id,
        concept: item.name,
        totalAmount: String(total),
        notes: item.notes,
        allocations: current.allocations.map((allocation, index) => ({
          ...allocation,
          amount: String(
            index === current.allocations.length - 1
              ? total - base * (current.allocations.length - 1)
              : base,
          ),
        })),
      };
    });
  }

  function setParticipantCount(count: number) {
    setForm((current) => {
      const total = Number(current.totalAmount) || 0;
      const base = Math.floor((total / count) * 100) / 100;
      const allocations = Array.from({ length: count }, (_, index) => ({
        employeeId: current.allocations[index]?.employeeId ?? "",
        branchId: current.allocations[index]?.branchId ?? "CORPORATIVO",
        amount: String(index === count - 1 ? total - base * (count - 1) : base),
        commissionable: current.allocations[index]?.commissionable ?? true,
      }));
      return { ...current, allocations };
    });
  }

  async function save() {
    const total = Number(form.totalAmount);
    if (
      !form.date ||
      !form.kind ||
      !form.concept.trim() ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      toast.warning("Completa fecha, tipo, concepto y monto.");
      return;
    }
    if (
      form.allocations.some(
        (item) => !item.employeeId || Number(item.amount) <= 0,
      )
    ) {
      toast.warning("Completa empleado y monto de cada participante.");
      return;
    }
    if (
      new Set(form.allocations.map((item) => item.employeeId)).size !==
      form.allocations.length
    ) {
      toast.warning("No repitas participantes.");
      return;
    }
    const allocated = form.allocations.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    if (Math.round(allocated * 100) !== Math.round(total * 100)) {
      toast.warning("La distribución debe coincidir con el monto total.");
      return;
    }
    setSaving(true);
    let persistedMovement: PayrollMovement | null = null;
    try {
      persistedMovement = await data.saveMovement(
        {
          date: form.date,
          kind: form.kind,
          catalogItemId: form.catalogItemId || null,
          concept: form.concept,
          totalAmount: total,
          notes: form.notes,
          allocations: form.allocations.map((item) => ({
            employeeId: item.employeeId,
            branchId: item.branchId === "CORPORATIVO" ? null : item.branchId,
            amount: Number(item.amount),
            commissionable: item.commissionable,
          })),
        },
        editingId ?? undefined,
      );
      if (file) await data.uploadAttachment(persistedMovement.id, file);
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM, date: today() });
      setFile(null);
      toast.success(
        editingId
          ? "Movimiento actualizado."
          : "Movimiento guardado y pendiente de aprobación.",
      );
    } catch (cause) {
      if (persistedMovement) {
        setDialogOpen(false);
        setEditingId(null);
        setForm({ ...EMPTY_FORM, date: today() });
        setFile(null);
        toast.warning(
          `El movimiento quedó guardado, pero falló el comprobante: ${apiErrorMessage(cause)}`,
        );
      } else {
        toast.error(apiErrorMessage(cause));
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus() {
    if (!statusTarget) return;
    try {
      await data.setMovementStatus(
        statusTarget.movement.id,
        statusTarget.status,
      );
      toast.success(
        statusTarget.status === "APPROVED"
          ? "Movimiento aprobado."
          : "Movimiento rechazado.",
      );
      setStatusTarget(null);
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const columns = useMemo<ColumnDef<PayrollMovement>[]>(
    () => [
      {
        accessorKey: "date",
        header: "FECHA",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "employeeName",
        header: "EMPLEADOS",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.employeeName}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {row.original.branch}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "kind",
        header: "TIPO",
        cell: ({ row }) =>
          KIND_OPTIONS.find((item) => item.value === row.original.kind)?.label,
      },
      { accessorKey: "concept", header: "CONCEPTO" },
      {
        accessorKey: "amount",
        header: "MONTO",
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="number-display text-right">
            {formatCurrency(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "sharedWith",
        header: "REPARTO",
        cell: ({ row }) =>
          `${row.original.sharedWith} PERSONA${row.original.sharedWith === 1 ? "" : "S"}`,
      },
      {
        accessorKey: "status",
        header: "ESTATUS",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "ACCIONES",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {row.original.attachments[0] && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Abrir comprobante"
                onClick={() =>
                  void data.openAttachment(row.original.attachments[0]!.id)
                }
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {row.original.status === "PENDING" &&
              !row.original.payrollRunId &&
              data.storageConfigured &&
              hasWriteAccess && (
                <label
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-[var(--accent-hover)]"
                  aria-label="Subir comprobante"
                >
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="sr-only"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      if (!selected) return;
                      void data
                        .uploadAttachment(row.original.id, selected)
                        .then(() => toast.success("Comprobante guardado."))
                        .catch((cause) => toast.error(apiErrorMessage(cause)));
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            {row.original.status === "PENDING" && hasWriteAccess && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Editar"
                  onClick={() => editMovement(row.original)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Aprobar"
                  onClick={() =>
                    setStatusTarget({
                      movement: row.original,
                      status: "APPROVED",
                    })
                  }
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Rechazar"
                  onClick={() =>
                    setStatusTarget({
                      movement: row.original,
                      status: "REJECTED",
                    })
                  }
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [data, hasWriteAccess],
  );

  const exportConfig = {
    title: "Movimientos de nómina",
    subtitle: describeDateRange(dateRange),
    filename: `movimientos-nomina-${dateRangeFilename(dateRange)}`,
    sheetName: "Movimientos",
    orientation: "landscape" as const,
    rows: filteredMovements,
    columns: [
      {
        header: "FECHA",
        accessor: (row: PayrollMovement) => formatDate(row.date),
      },
      {
        header: "EMPLEADOS",
        accessor: (row: PayrollMovement) => row.employeeName,
        width: 35,
      },
      {
        header: "SUCURSAL",
        accessor: (row: PayrollMovement) => row.branch,
        width: 24,
      },
      {
        header: "TIPO",
        accessor: (row: PayrollMovement) =>
          KIND_OPTIONS.find((item) => item.value === row.kind)?.label ??
          row.kind,
      },
      { header: "CONCEPTO", accessor: (row: PayrollMovement) => row.concept },
      {
        header: "MONTO",
        accessor: (row: PayrollMovement) => row.amount,
        format: "currency" as const,
      },
      {
        header: "ESTATUS",
        accessor: (row: PayrollMovement) => formatStatus(row.status),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Movimientos de nómina</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Bonos, ajustes, descuentos y evidencias auditables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportExportButtons
            config={exportConfig}
            disabled={!filteredMovements.length}
          />
          {hasWriteAccess ? (
            <Button
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY_FORM, date: today() });
                setFile(null);
                setDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Nuevo movimiento
            </Button>
          ) : null}
        </div>
      </header>
      <DateFilterCard
        value={dateRange}
        onChange={setDateRange}
        resultCount={filteredMovements.length}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Aprobado neto"
          value={formatCurrency(approvedTotal)}
          tone="sage"
        />
        <MetricCard
          label="Pendiente"
          value={formatCurrency(pendingTotal)}
          tone="gold"
        />
        <MetricCard
          label="Catálogos activos"
          value={`${data.bonuses.length + data.fines.length + data.perDiems.length}`}
          tone="blue"
        />
      </div>
      <SectionCard title="MOVIMIENTOS CAPTURADOS">
        <DataTable
          columns={columns}
          data={filteredMovements}
          searchPlaceholder="Buscar movimiento"
          emptyMessage={
            data.movements.length
              ? "No hay movimientos dentro del periodo seleccionado."
              : "Sin movimientos; registra el primero para incluirlo en una corrida."
          }
          pageSize={10}
        />
      </SectionCard>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar movimiento" : "Nuevo movimiento"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Solo los movimientos pendientes y aún no asignados pueden editarse."
                : "El movimiento se crea pendiente y debe aprobarse antes de entrar a una corrida."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <DatePicker
                value={form.date}
                onChange={(value) =>
                  setForm((current) => ({ ...current, date: value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => setKind(value as MovementKind)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {catalog.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Concepto predefinido</Label>
                <Select
                  value={form.catalogItemId}
                  onValueChange={selectCatalog}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona del catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {formatCurrency(item.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                readOnly={catalog.length > 0}
                value={form.concept}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    concept: uppercaseInput(event.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Monto total</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.totalAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    totalAmount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Participantes</Label>
              <Select
                value={String(form.allocations.length)}
                onValueChange={(value) => setParticipantCount(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 sm:col-span-2">
              {form.allocations.map((allocation, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-[var(--border-color)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto] md:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`allocation-employee-${index}`}>
                      Empleado {index + 1}
                    </Label>
                    <Select
                      value={allocation.employeeId}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          allocations: current.allocations.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, employeeId: value }
                                : item,
                          ),
                        }))
                      }
                    >
                      <SelectTrigger id={`allocation-employee-${index}`}>
                        <SelectValue placeholder="Empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`allocation-branch-${index}`}>
                      Sucursal
                    </Label>
                    <Select
                      value={allocation.branchId}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          allocations: current.allocations.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, branchId: value }
                                : item,
                          ),
                        }))
                      }
                    >
                      <SelectTrigger id={`allocation-branch-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CORPORATIVO">CORPORATIVO</SelectItem>
                        {data.branches
                          .filter((branch) => branch.activa)
                          .map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`allocation-amount-${index}`}>Parte</Label>
                    <Input
                      id={`allocation-amount-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={allocation.amount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allocations: current.allocations.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, amount: event.target.value }
                                : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <label className="flex min-h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allocation.commissionable}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allocations: current.allocations.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    commissionable: event.target.checked,
                                  }
                                : item,
                          ),
                        }))
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    Pagable
                  </label>
                </div>
              ))}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: uppercaseInput(event.target.value),
                  }))
                }
              />
            </div>
            {needsEvidence && (
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Comprobante{" "}
                  {data.storageConfigured
                    ? "(JPG, PNG o PDF; máximo 10 MB)"
                    : "(Storage pendiente de configurar)"}
                </Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={!data.storageConfigured}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="normal-case"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving
                ? "Guardando…"
                : editingId
                  ? "Actualizar movimiento"
                  : "Guardar movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.status === "APPROVED"
                ? "Aprobar movimiento"
                : "Rechazar movimiento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              El movimiento {statusTarget?.movement.concept} quedará{" "}
              {statusTarget?.status === "APPROVED"
                ? "disponible para la corrida de su periodo"
                : "fuera de los cálculos"}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                statusTarget?.status === "REJECTED"
                  ? "bg-red-600 hover:bg-red-700"
                  : undefined
              }
              onClick={() => void changeStatus()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
