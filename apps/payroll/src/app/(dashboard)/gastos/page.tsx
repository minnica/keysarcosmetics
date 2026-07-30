"use client";

import { useState } from "react";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
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
} from "@cosmetics/ui";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { MetricCard } from "@/components/payroll/metric-card";
import { SectionCard } from "@/components/payroll/section-card";
import { apiErrorMessage } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  sumBy,
  uppercaseInput,
} from "@/lib/format";
import type {
  ExpenseFrequency,
  ExpenseKind,
  PayrollExpense,
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
const EMPTY: Form = {
  date: new Date().toISOString().slice(0, 10),
  kind: "VARIABLE",
  concept: "",
  category: "",
  branchId: "CORPORATIVO",
  amount: "0",
  frequency: "ONE_TIME",
  notes: "",
};
const FREQUENCY: Record<ExpenseFrequency, string> = {
  ONE_TIME: "Una vez",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export default function GastosPage() {
  const data = usePayrollData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollExpense | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  function create() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function edit(expense: PayrollExpense) {
    setEditingId(expense.id);
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
  async function save() {
    const amount = Number(form.amount);
    if (
      !form.date ||
      !form.concept.trim() ||
      !form.category.trim() ||
      !form.branchId ||
      amount <= 0
    ) {
      toast.error(
        "Completa fecha, concepto, categoría, centro de costo y monto.",
      );
      return;
    }
    const branch = data.branches.find((item) => item.id === form.branchId);
    setSaving(true);
    try {
      await data.saveExpense(
        {
          date: form.date,
          kind: form.kind,
          concept: form.concept,
          category: form.category,
          branchId: branch?.id ?? null,
          costCenter: branch?.nombre ?? "CORPORATIVO",
          amount,
          frequency: form.frequency,
          notes: form.notes,
        },
        editingId ?? undefined,
      );
      setOpen(false);
      toast.success(editingId ? "Gasto actualizado." : "Gasto guardado.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setSaving(false);
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

  const columns: ColumnDef<PayrollExpense>[] = [
    {
      accessorKey: "date",
      header: "FECHA",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "kind",
      header: "TIPO",
      cell: ({ row }) => (row.original.kind === "FIXED" ? "FIJO" : "VARIABLE"),
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
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={Boolean(row.original.payrollRunId)}
            onClick={() => edit(row.original)}
            aria-label="Editar gasto"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={Boolean(row.original.payrollRunId)}
            onClick={() => setDeleteTarget(row.original)}
            aria-label="Borrar gasto"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];
  const fixed = sumBy(
    data.expenses.filter((item) => item.kind === "FIXED"),
    (item) => item.amount,
  );
  const variable = sumBy(
    data.expenses.filter((item) => item.kind === "VARIABLE"),
    (item) => item.amount,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Control de gastos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ocurrencias que afectan el balance de su quincena.
          </p>
        </div>
        <Button onClick={create}>
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Agregar gasto
        </Button>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Gastos fijos"
          value={formatCurrency(fixed)}
          tone="gold"
        />
        <MetricCard
          label="Gastos variables"
          value={formatCurrency(variable)}
          tone="rose"
        />
        <MetricCard
          label="Total registrado"
          value={formatCurrency(fixed + variable)}
          tone="blue"
        />
      </div>
      <SectionCard title="GASTOS REGISTRADOS">
        <DataTable
          columns={columns}
          data={data.expenses}
          searchPlaceholder="Buscar concepto, categoría o sucursal"
          emptyMessage="Sin gastos registrados."
          pageSize={10}
        />
      </SectionCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar gasto" : "Agregar gasto"}
            </DialogTitle>
            <DialogDescription>
              Cada gasto afecta únicamente la quincena que contiene su fecha.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
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
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    kind: value as ExpenseKind,
                    frequency: value === "FIXED" ? "MONTHLY" : "ONE_TIME",
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
              <Label>Frecuencia informativa</Label>
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
                  {Object.entries(FREQUENCY).map(([value, label]) => (
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
              <Input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: uppercaseInput(event.target.value),
                  }))
                }
              />
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
    </div>
  );
}
