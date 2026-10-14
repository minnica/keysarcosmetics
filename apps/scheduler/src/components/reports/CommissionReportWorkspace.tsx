"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import {
  CalendarCheck2,
  Download,
  FileSpreadsheet,
  Layers3,
  Printer,
  Settings2,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import { QueryBoundary, useSchedulerQuery } from "@/components/api/ApiState";
import { SchedulerPagination } from "@/components/shared/SchedulerPagination";
import {
  paginateSchedulerReportRows,
  type SchedulerReportPageSize,
} from "@/lib/scheduler-report-presentation";
import { useSchedulerSession } from "@/lib/session";
import {
  exportCommissionReport,
  printCommissionReport,
  type CommissionReportExportFormat,
} from "./commission-report-export";
import { ReportsHeader } from "./ReportsHeader";

const commissionMoney = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function commissionDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CommissionReportWorkspace() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canExport = canAccess("reports.sales", "EXPORT");
  const canConfigure = canAccess("administration.commissions");
  const [dateFrom, setDateFrom] = useState(() => commissionDate(-30));
  const [dateTo, setDateTo] = useState(() => commissionDate());
  const [branchId, setBranchId] = useState("ALL");
  const [employeeId, setEmployeeId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const branches = useMemo(
    () => bootstrap?.authorizedBranches ?? [],
    [bootstrap?.authorizedBranches],
  );
  const branchIds = useMemo(
    () =>
      branchId === "ALL" ? branches.map((branch) => branch.id) : [branchId],
    [branchId, branches],
  );
  const reportQuery = useSchedulerQuery(
    () =>
      schedulerDesignProposals.commissionReport({
        dateFrom,
        dateTo,
        branchIds,
        ...(employeeId === "ALL" ? {} : { employeeIds: [employeeId] }),
      }),
    [dateFrom, dateTo, branchIds.join("|"), employeeId],
    {
      queryKey: "commission-report",
      branchId,
      enabled:
        Boolean(dateFrom && dateTo && dateFrom <= dateTo) &&
        branchIds.length > 0,
    },
  );
  const pagination = useMemo(
    () =>
      paginateSchedulerReportRows(reportQuery.data?.rows ?? [], page, pageSize),
    [page, pageSize, reportQuery.data?.rows],
  );
  const selectedRows = useMemo(
    () =>
      reportQuery.data?.rows.filter((row) => selectedRowIds.includes(row.id)) ??
      [],
    [reportQuery.data?.rows, selectedRowIds],
  );

  useEffect(() => {
    setSelectedRowIds(reportQuery.data?.rows.map((row) => row.id) ?? []);
    setPage(1);
  }, [reportQuery.data]);

  async function exportSelected(
    format: CommissionReportExportFormat | "print",
  ) {
    if (!reportQuery.data || selectedRows.length === 0) return;
    setExporting(true);
    try {
      if (format === "print") {
        printCommissionReport(reportQuery.data, selectedRows);
      } else {
        await exportCommissionReport(reportQuery.data, selectedRows, format);
      }
      toast.success(
        format === "print"
          ? "Vista de impresión preparada."
          : `Reporte ${format === "pdf" ? "PDF" : "Excel"} descargado.`,
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "No fue posible exportar.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader
        active="commissions"
        userName={bootstrap?.user.name ?? "Keysar"}
      />
      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Cálculo auditable</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.2rem)]">
              Reporte de comisiones
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consulta únicamente los esquemas autorizados para tu perfil y
              exporta las filas seleccionadas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canConfigure ? (
              <Button asChild variant="outline">
                <Link href="/administracion?section=commissions">
                  <Settings2 className="mr-2 h-4 w-4" /> Configurar esquemas
                </Link>
              </Button>
            ) : null}
            {canExport ? (
              <>
                <Button
                  variant="outline"
                  disabled={exporting || selectedRows.length === 0}
                  onClick={() => void exportSelected("pdf")}
                >
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={exporting || selectedRows.length === 0}
                  onClick={() => void exportSelected("xlsx")}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
                <Button
                  variant="outline"
                  disabled={exporting || selectedRows.length === 0}
                  onClick={() => void exportSelected("print")}
                >
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-[#eadfd5] bg-white shadow-sm">
          <div className="grid gap-3 border-b border-[#eee6df] p-5 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="commission-date-from">Desde</Label>
              <Input
                id="commission-date-from"
                className="mt-1.5"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="commission-date-to">Hasta</Label>
              <Input
                id="commission-date-to"
                className="mt-1.5"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empleado</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {reportQuery.data?.filterOptions.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => void reportQuery.reload()}
                disabled={reportQuery.loading}
              >
                <CalendarCheck2 className="mr-2 h-4 w-4" />
                {reportQuery.loading ? "Calculando…" : "Calcular"}
              </Button>
            </div>
          </div>

          <QueryBoundary
            loading={reportQuery.loading}
            error={reportQuery.error}
            empty={!reportQuery.data?.rows.length}
            emptyTitle="Sin movimientos de comisión"
            emptyDescription="No hay citas atendidas o ventas atribuibles en el periodo seleccionado."
            onRetry={() => void reportQuery.reload()}
          >
            {reportQuery.data ? (
              <>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    {
                      label: "Sucursales",
                      value: reportQuery.data.summary.branches,
                      Icon: Layers3,
                    },
                    {
                      label: "Empleados",
                      value: reportQuery.data.summary.employees,
                      Icon: UsersRound,
                    },
                    {
                      label: "Citas atendidas",
                      value: reportQuery.data.summary.attendedAppointments,
                      Icon: CalendarCheck2,
                    },
                    {
                      label: "Venta atribuible",
                      value: commissionMoney.format(
                        reportQuery.data.summary.salesAmount,
                      ),
                      Icon: WalletCards,
                    },
                    {
                      label: "Comisión estimada",
                      value: commissionMoney.format(
                        reportQuery.data.summary.totalCommission,
                      ),
                      Icon: ShieldCheck,
                    },
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="rounded-2xl bg-[#f8f5f1] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Icon className="h-4 w-4" /> {label}
                      </div>
                      <p className="mt-2 text-xl font-semibold text-slate-800">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto border-t border-[#eee6df]">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-[#fbf9f6] text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">
                          <input
                            aria-label="Seleccionar todos los resultados"
                            type="checkbox"
                            checked={
                              selectedRowIds.length ===
                                reportQuery.data.rows.length &&
                              reportQuery.data.rows.length > 0
                            }
                            onChange={(event) =>
                              setSelectedRowIds(
                                event.target.checked
                                  ? reportQuery.data!.rows.map((row) => row.id)
                                  : [],
                              )
                            }
                          />
                        </th>
                        {[
                          "Esquema",
                          "Sucursal",
                          "Empleado",
                          "Citas asistidas",
                          "Venta",
                          "Por cita",
                          "Por venta",
                          "Total",
                        ].map((heading) => (
                          <th key={heading} className="px-4 py-3">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.rows.map((row) => (
                        <tr key={row.id} className="border-t border-[#f0e9e3]">
                          <td className="px-5 py-3">
                            <input
                              aria-label={`Seleccionar ${row.employeeName}`}
                              type="checkbox"
                              checked={selectedRowIds.includes(row.id)}
                              onChange={(event) =>
                                setSelectedRowIds((current) =>
                                  event.target.checked
                                    ? [...current, row.id]
                                    : current.filter((id) => id !== row.id),
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {row.schemeName}
                          </td>
                          <td className="px-4 py-3">{row.branchName}</td>
                          <td className="px-4 py-3">{row.employeeName}</td>
                          <td className="px-4 py-3">
                            {row.attendedAppointments}
                          </td>
                          <td className="px-4 py-3">
                            {commissionMoney.format(row.salesAmount)}
                          </td>
                          <td className="px-4 py-3">
                            {commissionMoney.format(row.appointmentCommission)}
                          </td>
                          <td className="px-4 py-3">
                            {commissionMoney.format(row.salesCommission)}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {commissionMoney.format(row.totalCommission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 pt-3 text-xs text-slate-500">
                  {selectedRows.length} de {reportQuery.data.rows.length} filas
                  seleccionadas para PDF, Excel o impresión.
                </div>
                <SchedulerPagination
                  {...pagination}
                  label="resultados"
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSize={pageSize}
                />
              </>
            ) : null}
          </QueryBoundary>
        </section>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Este reporte calcula estimaciones auditables. Nómina conserva la
          liquidación final, pagos, recibos y movimientos.
        </div>
      </main>
    </div>
  );
}
