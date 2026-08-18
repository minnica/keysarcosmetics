"use client";

import { useState } from "react";
import { Pencil, PlusCircle, ShieldAlert, Trash2 } from "lucide-react";
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import { DateFilterCard } from "@/components/payroll/date-filter-card";
import { MetricCard } from "@/components/payroll/metric-card";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { StatusBadge } from "@/components/payroll/status-badge";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
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
  formatStatus,
  sumBy,
  uppercaseInput,
} from "@/lib/format";
import type { LoanAdvance, LoanKind } from "@/lib/types";

type Form = {
  requestedAt: string;
  employeeId: string;
  kind: LoanKind;
  requestedAmount: string;
  installmentCount: string;
  firstPeriodStart: string;
  notes: string;
};
const today = () => new Date().toISOString().slice(0, 10);
function nextFortnightStart() {
  const now = new Date();
  const next =
    now.getDate() < 16
      ? new Date(now.getFullYear(), now.getMonth(), 16)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}
function fortnightStartForDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${year}-${String(month).padStart(2, "0")}-${day <= 15 ? "01" : "16"}`;
}
const EMPTY: Form = {
  requestedAt: today(),
  employeeId: "",
  kind: "LOAN",
  requestedAmount: "0",
  installmentCount: "1",
  firstPeriodStart: nextFortnightStart(),
  notes: "",
};

export default function PrestamosPage() {
  const data = usePayrollData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [confirm, setConfirm] = useState<{
    loan: LoanAdvance;
    action: "cancel" | "lost";
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const activeEmployees = data.employees.filter((employee) => employee.active);
  const filteredLoans = data.loans.filter((loan) =>
    isDateInRange(loan.requestedAt, dateRange),
  );
  const suggestedInstallment =
    Number(form.installmentCount) > 0
      ? Number(form.requestedAmount) / Number(form.installmentCount)
      : 0;

  function create() {
    setEditingId(null);
    setForm({
      ...EMPTY,
      requestedAt: today(),
      firstPeriodStart: nextFortnightStart(),
    });
    setOpen(true);
  }
  function edit(loan: LoanAdvance) {
    setEditingId(loan.id);
    setForm({
      requestedAt: loan.requestedAt,
      employeeId: loan.employeeId,
      kind: loan.kind,
      requestedAmount: String(loan.requestedAmount),
      installmentCount: String(loan.installmentCount),
      firstPeriodStart:
        loan.installments[0]?.periodStart ?? nextFortnightStart(),
      notes: loan.notes,
    });
    setOpen(true);
  }
  async function save() {
    const amount = Number(form.requestedAmount),
      count = Number(form.installmentCount);
    const firstPeriodStart = fortnightStartForDate(form.firstPeriodStart);
    if (
      !form.requestedAt ||
      !form.employeeId ||
      !form.firstPeriodStart ||
      amount <= 0 ||
      !Number.isInteger(count) ||
      count < 1
    ) {
      toast.warning("Completa empleado, monto, pagos y primera quincena.");
      return;
    }
    setSaving(true);
    try {
      await data.saveLoan(
        {
          ...form,
          firstPeriodStart,
          requestedAmount: amount,
          installmentCount: count,
        },
        editingId ?? undefined,
      );
      setOpen(false);
      toast.success(
        editingId
          ? "Solicitud actualizada."
          : "Solicitud creada con cuotas quincenales.",
      );
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  async function execute() {
    if (!confirm) return;
    try {
      if (confirm.action === "cancel") await data.removeLoan(confirm.loan.id);
      else await data.markLoanLost(confirm.loan.id);
      toast.success(
        confirm.action === "cancel"
          ? "Solicitud cancelada."
          : "Préstamo marcado como perdido.",
      );
      setConfirm(null);
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const columns: ColumnDef<LoanAdvance>[] = [
    {
      accessorKey: "requestedAt",
      header: "SOLICITUD",
      cell: ({ row }) => formatDate(row.original.requestedAt),
    },
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
    { accessorKey: "nature", header: "CONCEPTO" },
    {
      accessorKey: "requestedAmount",
      header: "MONTO SOLICITADO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.requestedAmount)}
        </div>
      ),
    },
    {
      accessorKey: "installmentCount",
      header: "PAGOS",
      meta: { align: "right" },
    },
    {
      accessorKey: "installmentAmount",
      header: "CUOTA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.installmentAmount)}
        </div>
      ),
    },
    {
      accessorKey: "paidAmount",
      header: "COBRADO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.paidAmount)}
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "PENDIENTE",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right">
          {formatCurrency(row.original.balance)}
        </div>
      ),
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
      cell: ({ row }) => {
        const editable =
          row.original.status === "PENDING" &&
          row.original.installments.every(
            (item) => item.status === "SCHEDULED",
          );
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={!editable}
              aria-label="Editar"
              onClick={() => edit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!editable}
              aria-label="Marcar perdido"
              onClick={() => setConfirm({ loan: row.original, action: "lost" })}
            >
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!editable}
              aria-label="Cancelar"
              onClick={() =>
                setConfirm({ loan: row.original, action: "cancel" })
              }
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];
  const exportConfig = {
    title: "Préstamos y adelantos",
    subtitle: describeDateRange(dateRange),
    filename: `prestamos-adelantos-${dateRangeFilename(dateRange)}`,
    sheetName: "Préstamos",
    orientation: "landscape" as const,
    rows: filteredLoans,
    columns: [
      {
        header: "SOLICITUD",
        accessor: (row: LoanAdvance) => formatDate(row.requestedAt),
      },
      {
        header: "EMPLEADO",
        accessor: (row: LoanAdvance) => row.employeeName,
        width: 32,
      },
      { header: "CONCEPTO", accessor: (row: LoanAdvance) => row.nature },
      {
        header: "MONTO SOLICITADO",
        accessor: (row: LoanAdvance) => row.requestedAmount,
        format: "currency" as const,
      },
      { header: "PAGOS", accessor: (row: LoanAdvance) => row.installmentCount },
      {
        header: "CUOTA",
        accessor: (row: LoanAdvance) => row.installmentAmount,
        format: "currency" as const,
      },
      {
        header: "COBRADO",
        accessor: (row: LoanAdvance) => row.paidAmount,
        format: "currency" as const,
      },
      {
        header: "PENDIENTE",
        accessor: (row: LoanAdvance) => row.balance,
        format: "currency" as const,
      },
      {
        header: "ESTATUS",
        accessor: (row: LoanAdvance) => formatStatus(row.status),
      },
      {
        header: "PRÓXIMO PERIODO",
        accessor: (row: LoanAdvance) => row.nextPeriod,
        width: 24,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Préstamos y adelantos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cuotas quincenales ligadas a corridas pagadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportExportButtons
            config={exportConfig}
            disabled={!filteredLoans.length}
          />
          <Button onClick={create}>
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Nueva solicitud
          </Button>
        </div>
      </header>
      <DateFilterCard
        value={dateRange}
        onChange={setDateRange}
        resultCount={filteredLoans.length}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Prestado"
          value={formatCurrency(
            sumBy(filteredLoans, (loan) => loan.requestedAmount),
          )}
          tone="gold"
        />
        <MetricCard
          label="Cobrado"
          value={formatCurrency(
            sumBy(filteredLoans, (loan) => loan.paidAmount),
          )}
          tone="sage"
        />
        <MetricCard
          label="Pendiente"
          value={formatCurrency(sumBy(filteredLoans, (loan) => loan.balance))}
          tone="rose"
        />
      </div>
      <SectionCard title="AMORTIZACIÓN">
        <DataTable
          columns={columns}
          data={filteredLoans}
          searchPlaceholder="Buscar empleado o concepto"
          emptyMessage={
            data.loans.length
              ? "No hay préstamos ni adelantos dentro del periodo seleccionado."
              : "Sin préstamos ni adelantos."
          }
          pageSize={10}
        />
      </SectionCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar solicitud" : "Nueva solicitud"}
            </DialogTitle>
            <DialogDescription>
              Las cuotas se generan automáticamente en quincenas consecutivas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha de solicitud</Label>
              <DatePicker
                value={form.requestedAt}
                onChange={(value) =>
                  setForm((current) => ({ ...current, requestedAt: value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={form.employeeId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, employeeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} · {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    kind: value as LoanKind,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOAN">PRÉSTAMO</SelectItem>
                  <SelectItem value="PAYROLL_ADVANCE">
                    ADELANTO DE NÓMINA
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto solicitado</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.requestedAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    requestedAmount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Número de pagos</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.installmentCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    installmentCount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cuota aproximada</Label>
              <Input value={formatCurrency(suggestedInstallment)} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Primera quincena de cobro</Label>
              <DatePicker
                value={form.firstPeriodStart}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    firstPeriodStart: fortnightStartForDate(value),
                  }))
                }
                placeholder="Selecciona cualquier día de la quincena"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Puedes elegir cualquier día; se usará el inicio de esa quincena:
                día 1 o 16.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
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
              {saving ? "Guardando…" : "Guardar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(value) => !value && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "lost"
                ? "Marcar préstamo como perdido"
                : "Cancelar solicitud"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se conservará el histórico y las cuotas pendientes dejarán de
              entrar a corridas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void execute()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
