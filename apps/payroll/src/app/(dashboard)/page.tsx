"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  PlusCircle,
  RefreshCw,
  XCircle,
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
  Button,
  Card,
  CardContent,
  ColumnDef,
  DataTable,
  DatePicker,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { StatusBadge } from "@/components/payroll/status-badge";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatPercent, sumBy } from "@/lib/format";
import type { PayrollCalculationMode, PayrollRunLine } from "@/lib/types";

function currentFortnight() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDay = now.getDate() <= 15 ? 1 : 16;
  const endDay = startDay === 1 ? 15 : new Date(year, month + 1, 0).getDate();
  const date = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const pay = new Date(year, month, endDay + 7);
  return {
    from: date(startDay),
    to: date(endDay),
    payDate: `${pay.getFullYear()}-${String(pay.getMonth() + 1).padStart(2, "0")}-${String(pay.getDate()).padStart(2, "0")}`,
  };
}

export default function DashboardPage() {
  const data = usePayrollData();
  const defaults = useMemo(currentFortnight, []);
  const [range, setRange] = useState({ from: defaults.from, to: defaults.to });
  const [payDate, setPayDate] = useState(defaults.payDate);
  const [mode, setMode] = useState<PayrollCalculationMode>("WITH_VAT");
  const [working, setWorking] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "pay" | "cancel" | null
  >(null);
  const run = data.selectedRun;

  useEffect(() => {
    if (!run) return;
    setMode(run.mode);
    setPayDate(run.payDate);
  }, [run?.id, run?.mode, run?.payDate]);

  async function createRun() {
    setWorking(true);
    try {
      await data.createRun({
        periodStart: range.from,
        periodEnd: range.to,
        payDate,
        mode,
      });
      toast.success("Corrida creada y calculada con datos reales.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function updateRun() {
    setWorking(true);
    try {
      await data.updateRun({ payDate, mode });
      toast.success("Corrida actualizada y recalculada.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function executeAction() {
    if (!confirmAction) return;
    setWorking(true);
    try {
      await data.runAction(confirmAction);
      toast.success(
        confirmAction === "approve"
          ? "Corrida aprobada y congelada."
          : confirmAction === "pay"
            ? "Corrida pagada y recibos generados."
            : "Corrida cancelada.",
      );
      setConfirmAction(null);
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  const columns: ColumnDef<PayrollRunLine>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            {row.original.position} / {row.original.branch}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "salesWithVat",
      header: "VENTAS CON IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.salesWithVat)}
        </div>
      ),
    },
    {
      accessorKey: "salesWithoutVat",
      header: "VENTAS SIN IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.salesWithoutVat)}
        </div>
      ),
    },
    {
      accessorKey: "scheme",
      header: "ESQUEMA",
      cell: ({ row }) => (
        <span>
          {row.original.scheme}
          {row.original.schemeVersion ? ` V${row.original.schemeVersion}` : ""}
        </span>
      ),
    },
    {
      accessorKey: "individualRate",
      header: "PORCENTAJE",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatPercent(row.original.individualRate)}
        </div>
      ),
    },
    {
      accessorKey: "commission",
      header: "COMISIÓN",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.commission)}
        </div>
      ),
    },
    {
      accessorKey: "salaryBase",
      header: "SUELDO BASE",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.salaryBase)}
        </div>
      ),
    },
    {
      accessorKey: "bonus",
      header: "BONO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.bonus)}</div>
      ),
    },
    {
      accessorKey: "fine",
      header: "MULTA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.fine)}</div>
      ),
    },
    {
      accessorKey: "loanPayment",
      header: "PAGO PRÉSTAMO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.loanPayment)}
        </div>
      ),
    },
    {
      accessorKey: "payrollAdjustmentPositive",
      header: "AJUSTE +",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.payrollAdjustmentPositive)}
        </div>
      ),
    },
    {
      accessorKey: "payrollAdjustmentNegative",
      header: "AJUSTE -",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.payrollAdjustmentNegative)}
        </div>
      ),
    },
    {
      accessorKey: "perDiem",
      header: "VIÁTICOS",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.perDiem)}</div>
      ),
    },
    {
      accessorKey: "totalPayment",
      header: "TOTAL PAGO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right text-base">
          {formatCurrency(row.original.totalPayment)}
        </div>
      ),
    },
  ];

  if (data.loading)
    return (
      <Card>
        <CardContent className="p-8 text-sm text-[var(--text-muted)]">
          Preparando datos de nómina…
        </CardContent>
      </Card>
    );
  if (data.error)
    return (
      <Card>
        <CardContent className="space-y-4 p-8">
          <p className="text-sm text-red-600">{data.error}</p>
          <Button onClick={() => void data.refreshAll()}>Reintentar</Button>
        </CardContent>
      </Card>
    );

  const lines = run?.lines ?? [];
  const deductions = sumBy(
    lines,
    (line) => line.fine + line.loanPayment + line.payrollAdjustmentNegative,
  );
  const adjustments = sumBy(
    lines,
    (line) =>
      line.bonus +
      line.payrollAdjustmentPositive +
      line.perDiem +
      line.supplies -
      line.fine -
      line.payrollAdjustmentNegative,
  );
  const warningLines = lines.filter((line) => line.warnings.length > 0);
  const exportConfig = {
    title: "Resumen de nómina",
    subtitle: run
      ? `${formatDate(run.from)} - ${formatDate(run.to)} · ${run.mode === "WITH_VAT" ? "Con IVA" : "Sin IVA"}`
      : "",
    filename: `resumen-nomina-${run?.from ?? "sin-corrida"}`,
    sheetName: "Nómina",
    orientation: "landscape" as const,
    rows: lines,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: PayrollRunLine) => row.employeeName,
        width: 30,
      },
      {
        header: "SUCURSAL",
        accessor: (row: PayrollRunLine) => row.branch,
        width: 24,
      },
      {
        header: "VENTAS CON IVA",
        accessor: (row: PayrollRunLine) => row.salesWithVat,
        format: "currency" as const,
      },
      {
        header: "VENTAS SIN IVA",
        accessor: (row: PayrollRunLine) => row.salesWithoutVat,
        format: "currency" as const,
      },
      { header: "ESQUEMA", accessor: (row: PayrollRunLine) => row.scheme },
      {
        header: "PORCENTAJE",
        accessor: (row: PayrollRunLine) => row.individualRate * 100,
        format: "percent" as const,
      },
      {
        header: "COMISIÓN",
        accessor: (row: PayrollRunLine) => row.commission,
        format: "currency" as const,
      },
      {
        header: "SUELDO BASE",
        accessor: (row: PayrollRunLine) => row.salaryBase,
        format: "currency" as const,
      },
      {
        header: "BONO",
        accessor: (row: PayrollRunLine) => row.bonus,
        format: "currency" as const,
      },
      {
        header: "DEDUCCIONES",
        accessor: (row: PayrollRunLine) =>
          row.fine + row.loanPayment + row.payrollAdjustmentNegative,
        format: "currency" as const,
      },
      {
        header: "TOTAL PAGO",
        accessor: (row: PayrollRunLine) => row.totalPayment,
        format: "currency" as const,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Corridas de nómina</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Cálculo quincenal auditable desde ventas y movimientos reales.
          </p>
        </div>
        {data.runs.length > 0 && (
          <Select
            value={run?.id ?? ""}
            onValueChange={(value) => void data.selectRun(value)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Selecciona una corrida" />
            </SelectTrigger>
            <SelectContent>
              {data.runs.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {formatDate(item.from)} – {formatDate(item.to)} ·{" "}
                  {item.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      {run ? (
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-muted)]">
                  Periodo seleccionado
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <p className="number-display text-xl">
                    {formatDate(run.from)} - {formatDate(run.to)}
                  </p>
                  <StatusBadge status={run.status} />
                </div>
              </div>
              <ReportExportButtons
                config={exportConfig}
                disabled={!lines.length}
              />
            </div>
            <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-[color:var(--border-color)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Ventas con IVA", run.salesWithVat],
                ["Nómina total", run.payrollTotal],
                ["Gastos", run.expenseTotal],
                ["Balance general", run.generalBalance],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
                    {label}
                  </p>
                  <p className="number-display mt-1.5 text-xl">
                    {formatCurrency(Number(value))}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium">Aún no hay corridas</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Configura la primera quincena para comenzar.
            </p>
          </CardContent>
        </Card>
      )}

      <SectionCard
        title={
          run?.status === "DRAFT" ? "CONFIGURAR BORRADOR" : "NUEVA CORRIDA"
        }
      >
        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_13rem_13rem_auto] lg:items-end">
            {run?.status === "DRAFT" ? (
              <div>
                <p className="mb-2 text-sm font-medium">Periodo bloqueado</p>
                <div className="rounded-md border border-[var(--border-color)] px-3 py-2 text-sm">
                  {formatDate(run.from)} – {formatDate(run.to)}
                </div>
              </div>
            ) : (
              <DateRangePicker
                value={range}
                onChange={setRange}
                fromLabel="Desde"
                toLabel="Hasta"
              />
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Día de pago</p>
              <DatePicker value={payDate} onChange={setPayDate} />
            </div>
            <Select
              value={mode}
              onValueChange={(value) =>
                setMode(value as PayrollCalculationMode)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WITH_VAT">Calcular con IVA</SelectItem>
                <SelectItem value="WITHOUT_VAT">Calcular sin IVA</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={working}
              onClick={() =>
                void (run?.status === "DRAFT" ? updateRun() : createRun())
              }
            >
              {run?.status === "DRAFT" ? (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              ) : (
                <PlusCircle className="mr-1.5 h-4 w-4" />
              )}
              {working
                ? "Procesando…"
                : run?.status === "DRAFT"
                  ? "Guardar y recalcular"
                  : "Crear corrida"}
            </Button>
          </CardContent>
        </Card>
      </SectionCard>

      {run && (
        <>
          {warningLines.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="font-semibold">Datos que requieren atención</p>
                <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                  {warningLines.map((line) => (
                    <div key={line.id}>
                      <span className="font-medium text-[var(--text-primary)]">
                        {line.employeeName}:
                      </span>{" "}
                      {line.warnings.map((item) => item.message).join(" · ")}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <SectionCard
            title="DETALLE POR EMPLEADO"
            action={
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <p>
                  <span className="text-[var(--text-muted)]">
                    Ventas sin IVA{" "}
                  </span>
                  <span className="number-display">
                    {formatCurrency(run.salesWithoutVat)}
                  </span>
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">Deducciones </span>
                  <span className="number-display">
                    {formatCurrency(deductions)}
                  </span>
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">
                    Ajustes netos{" "}
                  </span>
                  <span className="number-display">
                    {formatCurrency(adjustments)}
                  </span>
                </p>
              </div>
            }
          >
            <DataTable
              columns={columns}
              data={lines}
              searchPlaceholder="Buscar empleado, sucursal o esquema"
              emptyMessage="Sin empleados en esta corrida"
              pageSize={10}
            />
          </SectionCard>
          <div className="flex flex-wrap justify-end gap-2">
            {run.status === "DRAFT" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => void data.runAction("recalculate")}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Recalcular
                </Button>
                <Button onClick={() => setConfirmAction("approve")}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Aprobar corrida
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction("cancel")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Cancelar corrida
                </Button>
              </>
            )}
            {run.status === "APPROVED" && (
              <>
                <Button onClick={() => setConfirmAction("pay")}>
                  <CircleDollarSign className="mr-1.5 h-4 w-4" />
                  Marcar pagada
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction("cancel")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Cancelar corrida
                </Button>
              </>
            )}
          </div>
        </>
      )}

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve"
                ? "Aprobar corrida"
                : confirmAction === "pay"
                  ? "Marcar corrida como pagada"
                  : "Cancelar corrida"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "Se congelarán los cálculos y se reservarán movimientos, gastos y cuotas."
                : confirmAction === "pay"
                  ? "Se aplicarán las cuotas y se generarán los recibos. Esta acción no se puede revertir."
                  : "Se liberarán las reservas y se conservará el registro cancelado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction === "cancel"
                  ? "bg-red-600 hover:bg-red-700"
                  : undefined
              }
              disabled={working}
              onClick={() => void executeAction()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
