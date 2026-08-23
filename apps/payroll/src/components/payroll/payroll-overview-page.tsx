"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ListChecks, RefreshCw } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  PayrollCalculationMode,
  PayrollOverviewLine,
  PayrollOverviewReport,
  PayrollOverviewType,
  PayrollOverviewView,
} from "@/lib/types";
import { ReportExportButtons } from "./report-export-buttons";
import { SectionCard } from "./section-card";
import { FortnightSelect } from "./fortnight-select";

type ApiResponse<T> = { success: boolean; data: T; message: string };

type PeriodOption = {
  value: string;
  month: string;
  from: string;
  to: string;
  shortLabel: string;
};

type PayrollOverviewPageProps = {
  payrollType: PayrollOverviewType;
  title: string;
  description: string;
};

function isCommissionPayrollType(payrollType: PayrollOverviewType) {
  return (
    payrollType === "COMMISSION" || payrollType === "MANAGEMENT_COMMISSION"
  );
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodOptions(monthCount = 12): PeriodOption[] {
  const now = new Date();
  const options: PeriodOption[] = [];
  for (let offset = 0; offset < monthCount; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthNumber = date.getMonth() + 1;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const lastDay = new Date(year, monthNumber, 0).getDate();
    options.push(
      {
        value: isoDate(year, monthNumber, 16),
        month,
        from: isoDate(year, monthNumber, 16),
        to: isoDate(year, monthNumber, lastDay),
        shortLabel: `2ª quincena · días 16–${lastDay}`,
      },
      {
        value: isoDate(year, monthNumber, 1),
        month,
        from: isoDate(year, monthNumber, 1),
        to: isoDate(year, monthNumber, 15),
        shortLabel: "1ª quincena · días 1–15",
      },
    );
  }
  return options;
}

function currentFortnightValue(options: PeriodOption[]) {
  const now = new Date();
  const startDay = now.getDate() <= 15 ? 1 : 16;
  return isoDate(now.getFullYear(), now.getMonth() + 1, startDay);
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

function normalizeReport(raw: PayrollOverviewReport): PayrollOverviewReport {
  return {
    ...raw,
    periodStart: raw.periodStart.slice(0, 10),
    periodEnd: raw.periodEnd.slice(0, 10),
    total: Number(raw.total),
    rows: raw.rows.map((row) => ({ ...row, payroll: Number(row.payroll) })),
    byPosition: raw.byPosition.map((row) => ({
      ...row,
      total: Number(row.total),
    })),
  };
}

export function PayrollOverviewPage({
  payrollType,
  title,
  description,
}: PayrollOverviewPageProps) {
  const options = useMemo(periodOptions, []);
  const monthOptions = useMemo(
    () => [...new Set(options.map((option) => option.month))],
    [options],
  );
  const [view, setView] = useState<PayrollOverviewView>("FORTNIGHT");
  const [fortnight, setFortnight] = useState(() =>
    currentFortnightValue(options),
  );
  const [month, setMonth] = useState(currentMonth);
  const [mode, setMode] = useState<PayrollCalculationMode>("WITH_VAT");
  const [report, setReport] = useState<PayrollOverviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedPeriod = useMemo(() => {
    if (view === "FORTNIGHT") {
      const selected = options.find((option) => option.value === fortnight)!;
      return { from: selected.from, to: selected.to };
    }
    const [year, monthNumber] = month.split("-").map(Number);
    return {
      from: `${month}-01`,
      to: isoDate(
        year ?? 0,
        monthNumber ?? 1,
        new Date(year ?? 0, monthNumber ?? 1, 0).getDate(),
      ),
    };
  }, [fortnight, month, options, view]);

  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<ApiResponse<PayrollOverviewReport>>(
          "/api/payroll/reports/payroll-overview",
          {
            params: {
              payrollType,
              view,
              periodStart: selectedPeriod.from,
              periodEnd: selectedPeriod.to,
              ...(isCommissionPayrollType(payrollType) ? { mode } : {}),
            },
          },
        );
        if (!cancelled) setReport(normalizeReport(response.data.data));
      } catch (cause) {
        if (!cancelled) {
          setReport(null);
          setError(apiErrorMessage(cause, "No se pudo cargar la nómina."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    payrollType,
    reloadKey,
    selectedPeriod.from,
    selectedPeriod.to,
    view,
  ]);

  const rows = report?.rows ?? [];
  const exportFooter: PayrollOverviewLine = {
    employeeId: "total",
    fullName: "",
    position: "",
    bank: "",
    account: "",
    payroll: report?.total ?? 0,
  };
  const exportConfig = {
    title,
    subtitle: `${view === "FORTNIGHT" ? "Quincena" : "Mes"}: ${formatDate(selectedPeriod.from)} - ${formatDate(selectedPeriod.to)}${isCommissionPayrollType(payrollType) ? ` · ${mode === "WITH_VAT" ? "Con IVA" : "Sin IVA"}` : ""}`,
    filename: `${payrollType.toLocaleLowerCase()}-${selectedPeriod.from}-${selectedPeriod.to}`,
    sheetName: "Nómina",
    orientation: "landscape" as const,
    rows,
    footerRow: exportFooter,
    columns: [
      {
        header: "NOMBRE COMPLETO",
        accessor: (row: PayrollOverviewLine) => row.fullName,
        width: 32,
      },
      {
        header: "PUESTO",
        accessor: (row: PayrollOverviewLine) => row.position,
        width: 24,
      },
      {
        header: "BANCO",
        accessor: (row: PayrollOverviewLine) => row.bank ?? "—",
        width: 20,
      },
      {
        header: "CUENTA",
        accessor: (row: PayrollOverviewLine) => row.account ?? "—",
        width: 22,
      },
      {
        header: "NÓMINA",
        accessor: (row: PayrollOverviewLine) => row.payroll,
        format: "currency" as const,
        width: 16,
      },
    ],
    summarySection: {
      title: "Total por puesto",
      sheetName: "Por puesto",
      labelHeader: "Puesto",
      valueHeader: "Nómina",
      rows:
        report?.byPosition.map((item) => ({
          label: item.position,
          value: item.total,
        })) ?? [],
      totalLabel: "Total general",
      total: report?.total ?? 0,
    },
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {description}
          </p>
        </div>
        <ReportExportButtons
          config={exportConfig}
          disabled={loading || !rows.length}
        />
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div
              className="flex rounded-md border border-[color:var(--border-color)] p-1"
              role="group"
              aria-label="Vista de la nómina"
            >
              <Button
                type="button"
                size="sm"
                variant={view === "FORTNIGHT" ? "default" : "ghost"}
                aria-pressed={view === "FORTNIGHT"}
                onClick={() => setView("FORTNIGHT")}
              >
                <ListChecks className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Quincenal
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "MONTHLY" ? "default" : "ghost"}
                aria-pressed={view === "MONTHLY"}
                onClick={() => setView("MONTHLY")}
              >
                <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Mensual
              </Button>
            </div>

            {view === "FORTNIGHT" ? (
              <FortnightSelect
                options={options}
                value={fortnight}
                onValueChange={setFortnight}
                className="w-full sm:w-64"
              />
            ) : (
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Mes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatMonth(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isCommissionPayrollType(payrollType) && (
              <Select
                value={mode}
                onValueChange={(value) =>
                  setMode(value as PayrollCalculationMode)
                }
              >
                <SelectTrigger
                  className="w-full sm:w-48"
                  aria-label="Base de comisión"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WITH_VAT">Calcular con IVA</SelectItem>
                  <SelectItem value="WITHOUT_VAT">Calcular sin IVA</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {report?.usesCurrentSalary && (
            <p className="max-w-md text-xs text-[color:var(--text-muted)]">
              Los periodos históricos se calculan con el sueldo capturado
              actualmente.
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent
            className="p-8 text-sm text-[color:var(--text-muted)]"
            role="status"
          >
            Calculando la consulta de nómina…
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="space-y-4 p-8">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <SectionCard title="DETALLE DE NÓMINA">
            <div className="overflow-hidden rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[color:var(--border-color)]">
                    {[
                      "NOMBRE COMPLETO",
                      "PUESTO",
                      "BANCO",
                      "CUENTA",
                      "NÓMINA",
                    ].map((header, index) => (
                      <TableHead
                        key={header}
                        className={`whitespace-nowrap text-[0.72rem] tracking-[0.14em] text-[color:var(--table-header-label)] ${index === 4 ? "text-right" : ""}`}
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className="border-[color:var(--border-color)]"
                      >
                        <TableCell className="font-medium uppercase">
                          {row.fullName}
                        </TableCell>
                        <TableCell className="uppercase">
                          {row.position}
                        </TableCell>
                        <TableCell className="uppercase">
                          {row.bank || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.account || "—"}
                        </TableCell>
                        <TableCell className="number-display text-right">
                          {formatCurrency(row.payroll)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-[color:var(--text-muted)]"
                      >
                        SIN EMPLEADOS PARA EL PERIODO SELECCIONADO
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter className="border-[color:var(--border-color)] bg-[color:var(--bg-primary)]">
                  <TableRow>
                    <TableCell colSpan={4}>
                      <span className="sr-only">Total</span>
                    </TableCell>
                    <TableCell className="number-display text-right text-base">
                      {formatCurrency(report?.total ?? 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </SectionCard>

          <Card>
            <CardHeader>
              <CardTitle className="section-heading uppercase">
                Total por puesto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[color:var(--border-color)] border-y border-[color:var(--border-color)]">
                {(report?.byPosition ?? []).map((item) => (
                  <div
                    key={item.position}
                    className="flex items-center justify-between gap-6 py-3"
                  >
                    <span className="text-sm font-medium uppercase">
                      {item.position}
                    </span>
                    <span className="number-display shrink-0">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
                {!report?.byPosition.length && (
                  <p className="py-5 text-sm text-[color:var(--text-muted)]">
                    SIN PUESTOS PARA MOSTRAR
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-6 pt-5">
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Total general
                </span>
                <span className="number-display text-xl">
                  {formatCurrency(report?.total ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
