"use client";

import { useState } from "react";
import {
  CircleStop,
  FolderPlus,
  History,
  Pencil,
  PlusCircle,
  Repeat2,
  Trash2,
} from "lucide-react";
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
  ColumnDef,
  DataTable,
  type DateRange,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { DateFilterCard } from "@/components/payroll/date-filter-card";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { MetricCard } from "@/components/payroll/metric-card";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { apiErrorMessage } from "@/lib/api";
import {
  dateRangeFilename,
  describeDateRange,
  EMPTY_DATE_RANGE,
  isDateInRange,
} from "@/lib/date-range";
import {
  formatCurrency,
  formatDate,
  sumBy,
  uppercaseInput,
} from "@/lib/format";
import { useSession } from "@/lib/session";
import type {
  ExpenseFrequency,
  ExpenseKind,
  PayrollExpense,
  PayrollExpenseCategory,
  PayrollExpenseRecurrence,
} from "@/lib/types";

type Form = {
  date: string;
  kind: ExpenseKind;
  concept: string;
  category: string;
  branchId: string;
  amount: string;
  frequency: ExpenseFrequency;
  notes: string;
};
type ExpenseTableRow = {
  id: string;
  source: "RECURRENCE" | "APPLICATION";
  date: string;
  kind: ExpenseKind;
  concept: string;
  category: string;
  branch: string;
  amount: number;
  frequency: ExpenseFrequency;
  payrollRunId: string | null;
  generated: boolean;
  recurrence?: PayrollExpenseRecurrence;
  expense?: PayrollExpense;
};
type ExpenseView = "APPLICATIONS" | "RECURRENCES";
type ExpenseMetric = {
  label: string;
  value: string;
  tone: "gold" | "rose" | "blue";
};
type ExpenseViewPanelProps = {
  value: ExpenseView;
  metrics: ExpenseMetric[];
  title: string;
  eyebrow: string;
  columns: ColumnDef<ExpenseTableRow>[];
  rows: ExpenseTableRow[];
  searchPlaceholder: string;
  emptyMessage: string;
};

function ExpenseViewPanel({
  value,
  metrics,
  title,
  eyebrow,
  columns,
  rows,
  searchPlaceholder,
  emptyMessage,
}: ExpenseViewPanelProps) {
  return (
    <TabsContent value={value}>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </div>
      <div className="mt-6">
        <SectionCard title={title} eyebrow={eyebrow}>
          <DataTable
            columns={columns}
            data={rows}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            pageSize={10}
          />
        </SectionCard>
      </div>
    </TabsContent>
  );
}
function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function emptyForm(): Form {
  return {
    date: localDateValue(),
    kind: "VARIABLE",
    concept: "",
    category: "",
    branchId: "CORPORATIVO",
    amount: "0",
    frequency: "ONE_TIME",
    notes: "",
  };
}
const FREQUENCY: Record<ExpenseFrequency, string> = {
  ONE_TIME: "Una vez",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export default function GastosPage() {
  const data = usePayrollData();
  const { canWrite } = useSession();
  const hasWriteAccess = canWrite("payroll/gastos");
  const [expenseView, setExpenseView] = useState<ExpenseView>("APPLICATIONS");
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeleteTarget, setCategoryDeleteTarget] =
    useState<PayrollExpenseCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRecurrenceId, setEditingRecurrenceId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<PayrollExpense | null>(null);
  const [endTarget, setEndTarget] = useState<PayrollExpenseRecurrence | null>(
    null,
  );
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);

  function create() {
    setEditingId(null);
    setEditingRecurrenceId(null);
    setForm(emptyForm());
    setOpen(true);
  }
  function edit(expense: PayrollExpense) {
    setEditingId(expense.id);
    setEditingRecurrenceId(null);
    setForm({
      date: expense.date,
      kind: expense.kind,
      concept: expense.concept,
      category: expense.category,
      branchId: expense.branchId ?? "CORPORATIVO",
      amount: String(expense.amount),
      frequency: expense.frequency,
      notes: expense.notes,
    });
    setOpen(true);
  }
  function editRecurrence(expense: PayrollExpenseRecurrence) {
    setEditingId(null);
    setEditingRecurrenceId(expense.id);
    setForm({
      date: expense.nextDate,
      kind: expense.kind,
      concept: expense.concept,
      category: expense.category,
      branchId: expense.branchId ?? "CORPORATIVO",
      amount: String(expense.amount),
      frequency: expense.frequency,
      notes: expense.notes,
    });
    setOpen(true);
  }
  async function save() {
    const amount = Number(form.amount);
    if (
      !form.date ||
      !form.concept.trim() ||
      !form.category.trim() ||
      !form.branchId ||
      amount <= 0
    ) {
      toast.warning(
        "Completa fecha, concepto, categoría, centro de costo y monto.",
      );
      return;
    }
    const branch = data.branches.find((item) => item.id === form.branchId);
    setSaving(true);
    try {
      const input = {
        date: form.date,
        kind: form.kind,
        concept: form.concept,
        category: form.category,
        branchId: branch?.id ?? null,
        costCenter: branch?.nombre ?? "CORPORATIVO",
        amount,
        frequency: form.frequency,
        notes: form.notes,
      };
      const isRecurring = Boolean(
        editingRecurrenceId || (!editingId && form.frequency !== "ONE_TIME"),
      );
      if (isRecurring)
        await data.saveRecurringExpense(
          input,
          editingRecurrenceId ?? undefined,
        );
      else await data.saveExpense(input, editingId ?? undefined);
      setOpen(false);
      setExpenseView(isRecurring ? "RECURRENCES" : "APPLICATIONS");
      toast.success(
        editingRecurrenceId
          ? "Nueva vigencia del gasto recurrente guardada."
          : form.frequency !== "ONE_TIME"
            ? "Gasto recurrente guardado."
            : editingId
              ? "Gasto actualizado."
              : "Gasto guardado.",
      );
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  async function saveCategory() {
    const name = categoryName.trim();
    if (!name) {
      toast.warning("Escribe el nombre de la categoría.");
      return;
    }
    const editing = Boolean(categoryEditingId);
    setCategorySaving(true);
    try {
      const category = categoryEditingId
        ? await data.updateExpenseCategory(categoryEditingId, name)
        : await data.createExpenseCategory(name);
      setCategoryOpen(false);
      setCategoryEditingId(null);
      setCategoryName("");
      if (open) setForm((current) => ({ ...current, category: category.name }));
      toast.success(
        editing
          ? "Categoría de gasto actualizada."
          : "Categoría de gasto guardada.",
      );
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setCategorySaving(false);
    }
  }
  function editCategory(category: PayrollExpenseCategory) {
    setCategoryEditingId(category.id);
    setCategoryName(category.name);
    setCategoryOpen(true);
  }
  async function removeCategory() {
    if (!categoryDeleteTarget) return;
    try {
      await data.removeExpenseCategory(categoryDeleteTarget.id);
      setCategoryDeleteTarget(null);
      toast.success("Categoría eliminada sin alterar gastos históricos.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    try {
      await data.removeExpense(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Gasto eliminado del balance.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }
  async function endRecurrence() {
    if (!endTarget) return;
    const effectiveFrom = localDateValue();
    try {
      await data.endRecurringExpense(endTarget.id, effectiveFrom);
      setEndTarget(null);
      toast.success("Gasto recurrente finalizado.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const recurrenceRows: ExpenseTableRow[] = data.recurringExpenses.map(
    (recurrence) => ({
      id: `recurrence-${recurrence.id}`,
      source: "RECURRENCE" as const,
      date: recurrence.nextDate,
      kind: recurrence.kind,
      concept: recurrence.concept,
      category: recurrence.category,
      branch: recurrence.branch,
      amount: recurrence.amount,
      frequency: recurrence.frequency,
      payrollRunId: null,
      generated: true,
      recurrence,
    }),
  );
  const applicationRows: ExpenseTableRow[] = data.expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    source: "APPLICATION" as const,
    date: expense.date,
    kind: expense.kind,
    concept: expense.concept,
    category: expense.category,
    branch: expense.branch,
    amount: expense.amount,
    frequency: expense.frequency,
    payrollRunId: expense.payrollRunId,
    generated: expense.generated,
    expense,
  }));
  const filteredRecurrenceRows = recurrenceRows.filter((row) =>
    isDateInRange(row.date, dateRange),
  );
  const filteredApplicationRows = applicationRows.filter((row) =>
    isDateInRange(row.date, dateRange),
  );
  const visibleRows =
    expenseView === "RECURRENCES"
      ? filteredRecurrenceRows
      : filteredApplicationRows;
  function createExpenseColumns(
    view: ExpenseView,
  ): ColumnDef<ExpenseTableRow>[] {
    const recurrenceView = view === "RECURRENCES";
    return [
      {
        accessorKey: "date",
        header: recurrenceView ? "PRÓXIMA APLICACIÓN" : "FECHA DE APLICACIÓN",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "kind",
        header: "TIPO",
        cell: ({ row }) =>
          row.original.kind === "FIXED" ? "FIJO" : "VARIABLE",
      },
      {
        accessorKey: "concept",
        header: "CONCEPTO",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.concept}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {row.original.category}
            </p>
          </div>
        ),
      },
      { accessorKey: "branch", header: "CENTRO DE COSTO" },
      {
        accessorKey: "frequency",
        header: "FRECUENCIA",
        cell: ({ row }) => FREQUENCY[row.original.frequency],
      },
      {
        id: "source",
        accessorFn: (row) =>
          row.source === "RECURRENCE"
            ? "ACTIVA"
            : row.payrollRunId
              ? "CONGELADO"
              : row.generated
                ? "AUTOMÁTICO"
                : "MANUAL",
        header: recurrenceView ? "ESTADO" : "ORIGEN",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.source === "RECURRENCE" ? "secondary" : "outline"
            }
          >
            {row.original.source === "RECURRENCE" && (
              <Repeat2 className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            {row.original.source === "RECURRENCE"
              ? "ACTIVA"
              : row.original.payrollRunId
                ? "CONGELADO"
                : row.original.generated
                  ? "AUTOMÁTICO"
                  : "MANUAL"}
          </Badge>
        ),
      },
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
        id: "actions",
        header: "ACCIONES",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) =>
          hasWriteAccess ? (
          <div className="flex justify-end gap-1">
            {row.original.recurrence ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => editRecurrence(row.original.recurrence!)}
                  aria-label="Crear nueva vigencia del gasto recurrente"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEndTarget(row.original.recurrence!)}
                  aria-label="Finalizar gasto recurrente"
                >
                  <CircleStop className="h-4 w-4 text-amber-600" />
                </Button>
              </>
            ) : row.original.expense ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={
                    Boolean(row.original.payrollRunId) || row.original.generated
                  }
                  onClick={() => edit(row.original.expense!)}
                  aria-label="Editar gasto"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={
                    Boolean(row.original.payrollRunId) || row.original.generated
                  }
                  onClick={() => setDeleteTarget(row.original.expense!)}
                  aria-label="Borrar gasto"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </>
            ) : null}
          </div>
          ) : null,
      },
    ];
  }
  const recurrenceColumns = createExpenseColumns("RECURRENCES");
  const applicationColumns = createExpenseColumns("APPLICATIONS");
  const categoryColumns: ColumnDef<PayrollExpenseCategory>[] = [
    {
      accessorKey: "name",
      header: "CATEGORÍA",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "actions",
      header: "ACCIONES",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) =>
        hasWriteAccess ? (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => editCategory(row.original)}
            aria-label={`Editar categoría ${row.original.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCategoryDeleteTarget(row.original)}
            aria-label={`Eliminar categoría ${row.original.name}`}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
        ) : null,
    },
  ];
  const fixed = sumBy(
    filteredApplicationRows.filter((item) => item.kind === "FIXED"),
    (item) => item.amount,
  );
  const variable = sumBy(
    filteredApplicationRows.filter((item) => item.kind === "VARIABLE"),
    (item) => item.amount,
  );
  const monthlyRecurring = sumBy(
    filteredRecurrenceRows.filter((item) => item.frequency === "MONTHLY"),
    (item) => item.amount,
  );
  const biweeklyRecurring = sumBy(
    filteredRecurrenceRows.filter((item) => item.frequency === "BIWEEKLY"),
    (item) => item.amount,
  );
  const recurrenceMetrics: ExpenseMetric[] = [
    {
      label: "Series activas",
      value: String(filteredRecurrenceRows.length),
      tone: "blue",
    },
    {
      label: "Costo mensual programado",
      value: formatCurrency(monthlyRecurring),
      tone: "gold",
    },
    {
      label: "Costo por quincena programado",
      value: formatCurrency(biweeklyRecurring),
      tone: "rose",
    },
  ];
  const applicationMetrics: ExpenseMetric[] = [
    {
      label: "Fijos aplicados",
      value: formatCurrency(fixed),
      tone: "gold",
    },
    {
      label: "Variables aplicados",
      value: formatCurrency(variable),
      tone: "rose",
    },
    {
      label: "Total aplicado",
      value: formatCurrency(fixed + variable),
      tone: "blue",
    },
  ];
  const exportConfig = {
    title:
      expenseView === "RECURRENCES"
        ? "Gastos recurrentes"
        : "Historial de gastos",
    subtitle: describeDateRange(dateRange),
    filename: `gastos-${
      expenseView === "RECURRENCES" ? "recurrentes" : "historial"
    }-${dateRangeFilename(dateRange)}`,
    sheetName: expenseView === "RECURRENCES" ? "Recurrentes" : "Historial",
    orientation: "landscape" as const,
    rows: visibleRows,
    columns: [
      {
        header:
          expenseView === "RECURRENCES"
            ? "PRÓXIMA APLICACIÓN"
            : "FECHA DE APLICACIÓN",
        accessor: (row: ExpenseTableRow) => formatDate(row.date),
      },
      {
        header: "TIPO",
        accessor: (row: ExpenseTableRow) =>
          row.kind === "FIXED" ? "FIJO" : "VARIABLE",
      },
      { header: "CONCEPTO", accessor: (row: ExpenseTableRow) => row.concept },
      { header: "CATEGORÍA", accessor: (row: ExpenseTableRow) => row.category },
      {
        header: "CENTRO DE COSTO",
        accessor: (row: ExpenseTableRow) => row.branch,
        width: 24,
      },
      {
        header: "FRECUENCIA",
        accessor: (row: ExpenseTableRow) => FREQUENCY[row.frequency],
      },
      {
        header: expenseView === "RECURRENCES" ? "ESTADO" : "ORIGEN",
        accessor: (row: ExpenseTableRow) =>
          row.source === "RECURRENCE"
            ? "ACTIVA"
            : row.payrollRunId
              ? "CONGELADO"
              : row.generated
                ? "AUTOMÁTICO"
                : "MANUAL",
      },
      {
        header: "MONTO",
        accessor: (row: ExpenseTableRow) => row.amount,
        format: "currency" as const,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Control de gastos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Administra reglas automáticas y consulta su historial cuando lo
            necesites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportExportButtons
            config={exportConfig}
            disabled={!visibleRows.length}
          />
          {hasWriteAccess ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryEditingId(null);
                  setCategoryName("");
                  setCategoryOpen(true);
                }}
              >
                <FolderPlus className="mr-1.5 h-4 w-4" />
                Agregar categoría
              </Button>
              <Button onClick={create}>
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Agregar gasto
              </Button>
            </>
          ) : null}
        </div>
      </header>
      <DateFilterCard
        value={dateRange}
        onChange={setDateRange}
        resultCount={visibleRows.length}
      />
      <Tabs
        value={expenseView}
        onValueChange={(value) => {
          if (value === "APPLICATIONS" || value === "RECURRENCES")
            setExpenseView(value);
        }}
      >
        <TabsList aria-label="Vista de gastos">
          <TabsTrigger value="APPLICATIONS" className="sm:min-w-32">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Historial
            <span className="text-xs opacity-70">
              {filteredApplicationRows.length}
              <span className="sr-only"> registros</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="RECURRENCES" className="sm:min-w-44">
            <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
            Recurrentes activos
            <span className="text-xs opacity-70">
              {filteredRecurrenceRows.length}
              <span className="sr-only"> registros</span>
            </span>
          </TabsTrigger>
        </TabsList>
        <ExpenseViewPanel
          value="APPLICATIONS"
          metrics={applicationMetrics}
          title="HISTORIAL DE APLICACIONES"
          eyebrow="Cargos de los últimos 12 meses que ya afectaron el balance."
          columns={applicationColumns}
          rows={filteredApplicationRows}
          searchPlaceholder="Buscar en el historial"
          emptyMessage={
            applicationRows.length
              ? "No hay gastos aplicados dentro del periodo seleccionado."
              : "Todavía no hay gastos aplicados."
          }
        />
        <ExpenseViewPanel
          value="RECURRENCES"
          metrics={recurrenceMetrics}
          title="GASTOS RECURRENTES"
          eyebrow="Reglas activas; todavía no representan un segundo cargo."
          columns={recurrenceColumns}
          rows={filteredRecurrenceRows}
          searchPlaceholder="Buscar recurrencia, categoría o sucursal"
          emptyMessage={
            recurrenceRows.length
              ? "No hay gastos recurrentes dentro del periodo seleccionado."
              : hasWriteAccess
                ? "No hay gastos recurrentes activos. Agrega uno seleccionando frecuencia mensual o quincenal."
                : "No hay gastos recurrentes activos."
          }
        />
      </Tabs>
      <SectionCard title="CATEGORÍAS DE GASTO">
        <DataTable
          columns={categoryColumns}
          data={data.expenseCategories}
          searchPlaceholder="Buscar categoría"
          emptyMessage="Sin categorías registradas."
          pageSize={10}
        />
      </SectionCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecurrenceId
                ? "Nueva vigencia del gasto recurrente"
                : editingId
                  ? "Editar gasto"
                  : "Agregar gasto"}
            </DialogTitle>
            <DialogDescription>
              {editingRecurrenceId
                ? "La versión actual conservará su histórico y el cambio comenzará en la fecha indicada."
                : "Los gastos recurrentes se aplican automáticamente; los de una sola vez afectan únicamente la quincena que contiene su fecha."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                {editingRecurrenceId
                  ? "Aplicar nueva versión desde"
                  : "Fecha de inicio o aplicación"}
              </Label>
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
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    kind: value as ExpenseKind,
                    frequency: editingRecurrenceId
                      ? current.frequency
                      : value === "FIXED"
                        ? "MONTHLY"
                        : "ONE_TIME",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Gasto fijo</SelectItem>
                  <SelectItem value="VARIABLE">Gasto variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    frequency: value as ExpenseFrequency,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY)
                    .filter(
                      ([value]) => !editingRecurrenceId || value !== "ONE_TIME",
                    )
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Concepto</Label>
              <Input
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
              <Label>Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    category: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {data.expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!data.expenseCategories.length && (
                <p className="text-xs text-[var(--text-muted)]">
                  Agrega una categoría antes de guardar el gasto.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Centro de costo</Label>
              <Select
                value={form.branchId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, branchId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORPORATIVO">CORPORATIVO</SelectItem>
                  {data.branches
                    .filter((item) => item.activa)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: uppercaseInput(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Guardando…" : "Guardar gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={categoryOpen}
        onOpenChange={(value) => {
          setCategoryOpen(value);
          if (!value) {
            setCategoryEditingId(null);
            setCategoryName("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryEditingId
                ? "Editar categoría de gasto"
                : "Agregar categoría de gasto"}
            </DialogTitle>
            <DialogDescription>
              {categoryEditingId
                ? "El nuevo nombre se usará en capturas futuras; los gastos aprobados conservarán su histórico."
                : "La categoría estará disponible en gastos únicos y recurrentes."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="expense-category-name">Nombre</Label>
            <Input
              id="expense-category-name"
              autoFocus
              maxLength={120}
              value={categoryName}
              onChange={(event) =>
                setCategoryName(uppercaseInput(event.target.value))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveCategory();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={categorySaving}
              onClick={() => void saveCategory()}
            >
              {categorySaving ? "Guardando…" : "Guardar categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(categoryDeleteTarget)}
        onOpenChange={(value) => !value && setCategoryDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryDeleteTarget?.name} dejará de aparecer en el selector.
              Los gastos históricos conservarán su categoría. Si tiene una
              recurrencia activa, primero deberás cambiarla o finalizarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void removeCategory()}
            >
              Eliminar categoría
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar gasto</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.concept} dejará de afectar el balance; su auditoría
              se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void remove()}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(endTarget)}
        onOpenChange={(value) => !value && setEndTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar gasto recurrente</AlertDialogTitle>
            <AlertDialogDescription>
              {endTarget?.concept} dejará de generar aplicaciones desde hoy. Las
              ocurrencias históricas y las corridas aprobadas se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void endRecurrence()}>
              Finalizar recurrencia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
