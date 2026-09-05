"use client";

import { useMemo, useState } from "react";
import {
  SCHEDULER_REPORT_KEYS,
  type SchedulerReportCell,
  type SchedulerReportDatasetDto,
  type SchedulerReportKey,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { Download, LockKeyhole } from "lucide-react";
import { schedulerApi } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import { QueryBoundary, WorkspaceHeader, useSchedulerQuery } from "./ApiState";

const labels: Record<SchedulerReportKey, string> = {
  APPOINTMENTS: "Citas",
  OCCUPANCY: "Ocupación",
  CANCELLATIONS: "Cancelaciones",
  NO_SHOW: "No asistencias",
  CUSTOMERS: "Clientes",
  SERVICES: "Servicios",
  PROFESSIONALS: "Profesionales",
  COMMISSIONS: "Comisiones",
  SURVEYS: "Encuestas",
  COMMUNICATIONS: "Comunicaciones",
  SALES: "Ventas",
  PAYMENTS: "Pagos",
};

function dateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stringifyCell(value: SchedulerReportCell) {
  if (value === null) return "";
  return typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
}

function downloadCsv(dataset: SchedulerReportDatasetDto) {
  const quote = (value: SchedulerReportCell) =>
    `"${stringifyCell(value).replaceAll('"', '""')}"`;
  const contents = [
    dataset.columns.map(quote).join(","),
    ...dataset.rows.map((row) =>
      dataset.columns.map((column) => quote(row[column] ?? null)).join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([`\ufeff${contents}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `scheduler-${dataset.key.toLowerCase()}-${dataset.dateFrom}-${dataset.dateTo}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ApiReportsWorkspace({
  initialKey = "APPOINTMENTS",
  compactTitle,
}: {
  initialKey?: SchedulerReportKey;
  compactTitle?: string;
}) {
  const { bootstrap, canAccess } = useSchedulerSession();
  const availableKeys = useMemo(() => {
    const keys: SchedulerReportKey[] = [];
    if (canAccess("reports.reservations"))
      keys.push("APPOINTMENTS", "OCCUPANCY", "CANCELLATIONS", "NO_SHOW");
    if (canAccess("reports.summary"))
      keys.push("CUSTOMERS", "SERVICES", "PROFESSIONALS", "SURVEYS", "COMMUNICATIONS");
    if (canAccess("reports.sales")) keys.push("COMMISSIONS", "SALES", "PAYMENTS");
    return SCHEDULER_REPORT_KEYS.filter((candidate) => keys.includes(candidate));
  }, [canAccess]);
  const [key, setKey] = useState<SchedulerReportKey>(initialKey);
  const effectiveKey = availableKeys.includes(key) ? key : availableKeys[0] ?? initialKey;
  const effectiveScreen = ["APPOINTMENTS", "OCCUPANCY", "CANCELLATIONS", "NO_SHOW"].includes(effectiveKey)
    ? "reports.reservations"
    : ["COMMISSIONS", "SALES", "PAYMENTS"].includes(effectiveKey)
      ? "reports.sales"
      : "reports.summary";
  const canExport =
    canAccess(effectiveScreen, "EXPORT") &&
    (effectiveKey !== "CUSTOMERS" || canAccess("clients", "EXPORT"));
  const [dateFrom, setDateFrom] = useState(() => dateInput(-30));
  const [dateTo, setDateTo] = useState(() => dateInput());
  const [branchId, setBranchId] = useState("ALL");
  const branchIds = useMemo(
    () =>
      branchId === "ALL"
        ? bootstrap?.authorizedBranchIds ?? []
        : [branchId],
    [bootstrap?.authorizedBranchIds, branchId],
  );
  const report = useSchedulerQuery(
    () =>
      schedulerApi.report(effectiveKey, {
        dateFrom,
        dateTo,
        branchIds,
        page: 1,
        pageSize: 100,
      }),
    [effectiveKey, dateFrom, dateTo, branchIds.join(",")],
    Boolean(dateFrom && dateTo && branchIds.length && availableKeys.length),
  );
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      let authorizationToken: string | undefined;
      if (effectiveKey === "CUSTOMERS") {
        const secret = window.prompt("Código personal para exportar clientes");
        if (!secret) return;
        const authorization = await schedulerApi.createAuthorization({
          secret,
          purpose: "SENSITIVE_EXPORT",
          screenKey: "scheduler/clients",
          targetType: "SchedulerReport",
          targetId: "CUSTOMERS",
        });
        authorizationToken = authorization.token;
      }
      const dataset = await schedulerApi.exportReport(effectiveKey, {
        dateFrom,
        dateTo,
        branchIds,
      }, authorizationToken);
      downloadCsv(dataset);
      toast.success("Exportación generada desde el mismo dataset del reporte.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No fue posible exportar.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader
        eyebrow="Datos reproducibles"
        title={compactTitle ?? "Reportes"}
        description="Pantalla y exportación comparten filtros, autoridad y conjunto de datos. Los periodos respetan la zona configurada por sucursal."
        actions={
          canExport ? (
            <Button disabled={exporting || !report.data} onClick={() => void exportData()}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : (
            <Badge variant="outline"><LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sin permiso de exportación</Badge>
          )
        }
      />
      <div className="space-y-5 px-5 py-6 sm:px-7 lg:px-10">
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label>Reporte</Label>
              <Select value={effectiveKey} onValueChange={(value) => setKey(value as SchedulerReportKey)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableKeys.map((item) => (
                    <SelectItem key={item} value={item}>{labels[item]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="report-from">Desde</Label>
              <Input id="report-from" className="mt-1.5" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="report-to">Hasta</Label>
              <Input id="report-to" className="mt-1.5" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las autorizadas</SelectItem>
                  {bootstrap?.authorizedBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {report.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(report.data.summary).map(([label, value]) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{stringifyCell(value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <QueryBoundary
          loading={report.loading}
          error={report.error}
          empty={!report.data?.rows.length}
          emptyTitle="Reporte sin filas"
          emptyDescription="No se encontraron datos canónicos para el periodo y alcance elegidos."
          onRetry={() => void report.reload()}
        >
          <div className="overflow-x-auto rounded-2xl border border-[#e7ddd4] bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.data?.columns.map((column) => <TableHead key={column}>{column}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data?.rows.map((row, index) => (
                  <TableRow key={`${effectiveKey}-${index}`}>
                    {report.data?.columns.map((column) => (
                      <TableCell key={column}>{stringifyCell(row[column] ?? null)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </QueryBoundary>
        {report.data ? (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <Badge variant="outline">Fuente: {report.data.sourceAuthority}</Badge>
            <Badge variant="outline">{report.data.total} filas</Badge>
            <Badge variant="outline">Generado {new Date(report.data.generatedAt).toLocaleString("es-MX")}</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
