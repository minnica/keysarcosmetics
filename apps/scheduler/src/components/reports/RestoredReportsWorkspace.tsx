"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  SchedulerAppointmentStatus,
  SchedulerMessageChannel,
  SchedulerReportDatasetDto,
  SchedulerReportKey,
} from "@cosmetics/types";
import {
  Badge,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { SchedulerReportExportFormat } from "@/lib/scheduler-report-export";
import {
  groupReportRows,
  reportCellNumber,
  reportCellText,
  reportMetricCards,
  reportTrend,
  schedulerReportViews,
  type SchedulerReportBundle,
  type SchedulerReportView,
} from "@/lib/scheduler-report-presentation";
import { QueryBoundary } from "@/components/api/ApiState";
import { ReportsHeader } from "./ReportsHeader";

const reportLabels: Record<SchedulerReportKey, string> = {
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

const statusLabels: Partial<Record<SchedulerAppointmentStatus, string>> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegó",
  WAITING: "En espera",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
  CANCELED: "Cancelada",
};

const technicalColumn = /(^|_)(id|ids)$/i;
const moneyColumn = /(venta|cobrado|saldo|importe|comisi[oó]n|monto|neto)/i;
const percentColumn = /(ocupaci[oó]n|porcentaje|tasa)/i;
const numberFormat = new Intl.NumberFormat("es-MX");
const moneyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function formatValue(column: string, value: unknown) {
  const cell = value as string | number | boolean | null | undefined;
  if (cell == null || cell === "") return "—";
  if (moneyColumn.test(column))
    return moneyFormat.format(reportCellNumber(cell));
  if (percentColumn.test(column))
    return `${numberFormat.format(reportCellNumber(cell))}%`;
  return reportCellText(cell);
}

function MetricGrid({
  view,
  bundle,
}: {
  view: SchedulerReportView;
  bundle: SchedulerReportBundle;
}) {
  const cards = reportMetricCards(view, bundle);
  const icons = [CalendarDays, UsersRound, WalletCards, BarChart3];
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Indicadores del reporte"
    >
      {cards.map((card, index) => {
        const Icon = icons[index] ?? BarChart3;
        const value =
          card.kind === "money"
            ? moneyFormat.format(card.value)
            : card.kind === "percent"
              ? `${numberFormat.format(card.value)}%`
              : numberFormat.format(card.value);
        return (
          <article
            className={
              index === 0
                ? "report-metric report-metric-featured"
                : "report-metric"
            }
            key={card.label}
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={
                  index === 0 ? "label-caps !text-white/60" : "label-caps"
                }
              >
                {card.label}
              </p>
              <span
                className={
                  index === 0
                    ? "report-metric-icon !bg-white/10 !text-white"
                    : "report-metric-icon"
                }
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <p className="number-display mt-5 text-[2rem] leading-none tracking-[-0.04em]">
              {value}
            </p>
            <p
              className={
                index === 0
                  ? "mt-4 text-xs text-white/55"
                  : "mt-4 text-xs text-slate-400"
              }
            >
              Periodo y alcance seleccionados
            </p>
          </article>
        );
      })}
    </section>
  );
}

function TrendPanel({
  dataset,
  valueColumn,
}: {
  dataset: SchedulerReportDatasetDto | undefined;
  valueColumn: string | undefined;
}) {
  const series = reportTrend(dataset, valueColumn);
  const max = Math.max(...series.map((point) => point.value), 1);
  return (
    <article className="report-card">
      <p className="label-caps">Serie canónica</p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em]">
        Evolución diaria
      </h2>
      {series.length ? (
        <div className="mt-6 space-y-3.5">
          {series.slice(-14).map((point) => (
            <div
              className="grid grid-cols-[88px_1fr_52px] items-center gap-3"
              key={point.label}
            >
              <span className="text-xs font-medium text-slate-400">
                {point.label}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-[#eee8e2]">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#ad8b67,#d5b795)]"
                  style={{
                    width: `${Math.max(2, (point.value / max) * 100)}%`,
                  }}
                />
              </span>
              <span className="number-display text-right text-xs text-slate-600">
                {numberFormat.format(point.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          No hay puntos para construir la serie del periodo.
        </p>
      )}
    </article>
  );
}

function RankingPanel({
  dataset,
}: {
  dataset: SchedulerReportDatasetDto | undefined;
}) {
  const labelColumn = dataset?.columns.find((column) =>
    [
      "Profesional",
      "Servicio",
      "Sucursal",
      "Cliente",
      "Estado",
      "Canal",
      "Encuesta",
    ].includes(column),
  );
  const valueColumn = dataset?.columns.includes("Citas") ? "Citas" : undefined;
  const ranking = labelColumn
    ? groupReportRows(dataset?.rows ?? [], labelColumn, valueColumn)
    : [];
  const max = Math.max(...ranking.map((row) => row.value), 1);
  return (
    <article className="report-card">
      <p className="label-caps">Distribución</p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em]">
        Principales resultados
      </h2>
      <div className="mt-6 space-y-4">
        {ranking.slice(0, 7).map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex justify-between gap-3 text-sm">
              <span className="truncate">{row.label}</span>
              <strong className="number-display">
                {numberFormat.format(row.value)}
              </strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eee8e2]">
              <div
                className="h-full rounded-full bg-[#8aa393]"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {!ranking.length ? (
          <p className="text-sm text-slate-500">
            El dataset no aporta una dimensión agrupable para esta vista.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DatasetTable({
  dataset,
}: {
  dataset: SchedulerReportDatasetDto | undefined;
}) {
  const columns = (dataset?.columns ?? []).filter(
    (column) => !technicalColumn.test(column),
  );
  return (
    <section className="reservation-report-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[#eee7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-caps">Detalle</p>
          <h2 className="mt-1 text-lg font-semibold">
            {dataset ? reportLabels[dataset.key] : "Datos"}
          </h2>
        </div>
        {dataset ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{dataset.total} filas</Badge>
            <Badge variant="outline">{dataset.sourceAuthority}</Badge>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataset?.rows.map((row, index) => (
              <TableRow key={`${dataset.key}-${index}`}>
                {columns.map((column) => (
                  <TableCell className="whitespace-nowrap" key={column}>
                    {formatValue(column, row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ReservationTabs({ view }: { view: SchedulerReportView }) {
  const tabs = [
    ["reservations", "/reportes/reservas", "General"],
    ["history", "/reportes/reservas/historial", "Historial"],
    ["performance", "/reportes/reservas/rendimiento", "Rendimiento"],
  ] as const;
  if (
    ![
      "reservations",
      "history",
      "performance",
      "locations",
      "messaging",
      "metrics",
      "services",
      "services-by-location",
      "providers-by-location",
    ].includes(view)
  )
    return null;
  return (
    <nav
      aria-label="Secciones del reporte"
      className="flex gap-2 border-b border-[#d8c5b5]"
    >
      {tabs.map(([value, href, label]) => (
        <Link
          className={
            view === value
              ? "reservation-tab reservation-tab-active"
              : "reservation-tab"
          }
          href={href}
          key={value}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function DeepLinks({
  bundle,
  canReadSummary,
}: {
  bundle: SchedulerReportBundle;
  canReadSummary: boolean;
}) {
  const branches = groupReportRows(bundle.APPOINTMENTS?.rows ?? [], "Sucursal");
  const branchIds = new Map(
    (bundle.APPOINTMENTS?.rows ?? []).map((row) => [
      reportCellText(row.Sucursal),
      reportCellText(row.branch_id),
    ]),
  );
  const links = [
    ["/reportes/reservas/locales", "Locales", MapPin, true],
    [
      "/reportes/reservas/mensajeria-movil",
      "Mensajería móvil",
      MessageCircle,
      canReadSummary,
    ],
    ["/reportes/reservas/metricas", "Métricas", BarChart3, true],
    ["/reportes/reservas/servicios", "Servicios", Sparkles, canReadSummary],
  ] as const;
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {links
        .filter((item) => item[3])
        .map(([href, label, Icon]) => (
          <Link className="report-insight-card group" href={href} key={href}>
            <span className="report-action-icon">
              <Icon className="h-5 w-5" />
            </span>
            <strong>{label}</strong>
            <ArrowUpRight className="ml-auto h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ))}
      {canReadSummary
        ? branches.slice(0, 3).map((branch) => {
            const branchId = branchIds.get(branch.label);
            if (!branchId || branchId === "—") return null;
            return (
              <div className="contents" key={branchId}>
                <Link
                  className="text-sm font-semibold text-[#8c6d52] underline underline-offset-4"
                  href={`/reportes/reservas/servicios-por-local/${encodeURIComponent(branchId)}`}
                >
                  Servicios · {branch.label}
                </Link>
                <Link
                  className="text-sm font-semibold text-[#8c6d52] underline underline-offset-4"
                  href={`/reportes/reservas/prestadores-por-local/${encodeURIComponent(branchId)}`}
                >
                  Prestadores · {branch.label}
                </Link>
              </div>
            );
          })
        : null}
    </section>
  );
}

function ExportDialog({
  open,
  onOpenChange,
  datasets,
  exporting,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasets: SchedulerReportDatasetDto[];
  exporting: boolean;
  onExport: (
    key: SchedulerReportKey,
    format: SchedulerReportExportFormat,
    secret?: string,
  ) => Promise<void>;
}) {
  const [key, setKey] = useState<SchedulerReportKey>(
    datasets[0]?.key ?? "APPOINTMENTS",
  );
  const [format, setFormat] = useState<SchedulerReportExportFormat>("xlsx");
  const [secret, setSecret] = useState("");
  const effectiveKey = datasets.some((dataset) => dataset.key === key)
    ? key
    : datasets[0]?.key;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar dataset completo</DialogTitle>
          <DialogDescription>
            El servidor vuelve a construir todas las filas, valida el permiso y
            registra la descarga. La exportación no usa la tabla visible.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Dataset</Label>
            {effectiveKey ? (
              <Select
                value={effectiveKey}
                onValueChange={(value) => setKey(value as SchedulerReportKey)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem value={dataset.key} key={dataset.key}>
                      {reportLabels[dataset.key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div>
            <Label>Formato</Label>
            <Select
              value={format}
              onValueChange={(value) =>
                setFormat(value as SchedulerReportExportFormat)
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {effectiveKey === "CUSTOMERS" ? (
            <div>
              <Label htmlFor="report-secret">Código personal</Label>
              <Input
                className="mt-1.5"
                id="report-secret"
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                La exportación sensible consume una autorización de un solo uso.
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={
              exporting ||
              !effectiveKey ||
              (effectiveKey === "CUSTOMERS" && !secret)
            }
            onClick={() =>
              effectiveKey && void onExport(effectiveKey, format, secret)
            }
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Generando…" : "Generar archivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface RestoredReportsWorkspaceProps {
  view: SchedulerReportView;
  bundle: SchedulerReportBundle | null;
  loading: boolean;
  error: string | null;
  dateFrom: string;
  dateTo: string;
  branchId: string;
  branches: Array<{ id: string; name: string }>;
  fixedBranch?: { id: string; name: string };
  search: string;
  status: SchedulerAppointmentStatus | "ALL";
  channel: SchedulerMessageChannel | "ALL";
  exportableKeys: SchedulerReportKey[];
  exporting: boolean;
  userName: string;
  canReadSummary: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: SchedulerAppointmentStatus | "ALL") => void;
  onChannelChange: (value: SchedulerMessageChannel | "ALL") => void;
  onRetry: () => void;
  onExport: (
    key: SchedulerReportKey,
    format: SchedulerReportExportFormat,
    secret?: string,
  ) => Promise<void>;
}

export function RestoredReportsWorkspace(props: RestoredReportsWorkspaceProps) {
  const definition = schedulerReportViews[props.view];
  const [activeKey, setActiveKey] = useState<SchedulerReportKey>(
    definition.primaryKey,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const datasets = useMemo(
    () =>
      definition.keys
        .map((key) => props.bundle?.[key])
        .filter((dataset): dataset is SchedulerReportDatasetDto =>
          Boolean(dataset),
        ),
    [definition.keys, props.bundle],
  );
  const effectiveDataset =
    datasets.find((dataset) => dataset.key === activeKey) ?? datasets[0];
  const showsStatus = props.view === "history";
  const showsChannel = ["messaging", "reminders"].includes(props.view);
  const isReservationArea = ![
    "summary",
    "sales",
    "surveys",
    "reminders",
  ].includes(props.view);
  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader
        active={
          isReservationArea
            ? "reservations"
            : props.view === "sales"
              ? "sales"
              : "summary"
        }
        userName={props.userName}
      />
      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">{definition.eyebrow}</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.2rem)]">
              {definition.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {definition.description}
            </p>
          </div>
          {props.exportableKeys.length ? (
            <Button
              className="self-start sm:self-end"
              disabled={!datasets.length}
              onClick={() => setExportOpen(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          ) : (
            <Badge className="self-start sm:self-end" variant="outline">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Sólo lectura
            </Badge>
          )}
        </div>
        <ReservationTabs view={props.view} />
        <section className="reservation-control-panel">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="report-from">Desde</Label>
              <Input
                id="report-from"
                className="mt-1.5"
                type="date"
                value={props.dateFrom}
                onChange={(event) => props.onDateFromChange(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="report-to">Hasta</Label>
              <Input
                id="report-to"
                className="mt-1.5"
                type="date"
                value={props.dateTo}
                onChange={(event) => props.onDateToChange(event.target.value)}
              />
            </div>
            {props.fixedBranch ? (
              <div>
                <Label>Local</Label>
                <div className="mt-1.5 flex h-10 items-center rounded-md border bg-[#f8f5f1] px-3 text-sm font-medium">
                  {props.fixedBranch.name}
                </div>
              </div>
            ) : (
              <div>
                <Label>Local</Label>
                <Select
                  value={props.branchId}
                  onValueChange={props.onBranchChange}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los autorizados</SelectItem>
                    {props.branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="report-search">Buscar</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="report-search"
                  className="pl-9"
                  value={props.search}
                  onChange={(event) => props.onSearchChange(event.target.value)}
                  placeholder="Cliente, servicio, folio…"
                />
              </div>
            </div>
            {showsStatus ? (
              <div>
                <Label>Estado</Label>
                <Select
                  value={props.status}
                  onValueChange={(value) =>
                    props.onStatusChange(
                      value as SchedulerAppointmentStatus | "ALL",
                    )
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem value={value} key={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : showsChannel ? (
              <div>
                <Label>Canal</Label>
                <Select
                  value={props.channel}
                  onValueChange={(value) =>
                    props.onChannelChange(
                      value as SchedulerMessageChannel | "ALL",
                    )
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-end">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={props.onRetry}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            )}
          </div>
        </section>
        <QueryBoundary
          loading={props.loading}
          error={props.error}
          empty={!datasets.some((dataset) => dataset.rows.length)}
          emptyTitle="Sin actividad en el periodo"
          emptyDescription="Los indicadores permanecen en cero porque no hay filas canónicas para los filtros seleccionados."
          onRetry={props.onRetry}
        >
          <div className="space-y-6">
            <MetricGrid view={props.view} bundle={props.bundle ?? {}} />
            <div className="grid gap-5 xl:grid-cols-2">
              <TrendPanel
                dataset={
                  props.bundle?.APPOINTMENTS ??
                  props.bundle?.SALES ??
                  props.bundle?.COMMUNICATIONS ??
                  props.bundle?.SURVEYS ??
                  effectiveDataset
                }
                valueColumn={props.bundle?.SALES ? "Venta" : undefined}
              />
              <RankingPanel dataset={effectiveDataset} />
            </div>
            {props.view === "reservations" ? (
              <DeepLinks
                bundle={props.bundle ?? {}}
                canReadSummary={props.canReadSummary}
              />
            ) : null}
            {datasets.length > 1 ? (
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Desglose visible"
              >
                {datasets.map((dataset) => (
                  <Button
                    aria-selected={effectiveDataset?.key === dataset.key}
                    key={dataset.key}
                    size="sm"
                    variant={
                      effectiveDataset?.key === dataset.key
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setActiveKey(dataset.key)}
                  >
                    {reportLabels[dataset.key]}
                  </Button>
                ))}
              </div>
            ) : null}
            <DatasetTable dataset={effectiveDataset} />
            {effectiveDataset?.notes.length ? (
              <aside className="rounded-2xl border border-[#e5d8cc] bg-[#fbf8f4] px-5 py-4 text-sm text-slate-600">
                <strong className="text-[#263649]">Cómo se calcula</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {effectiveDataset.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </QueryBoundary>
      </main>
      <ExportDialog
        datasets={datasets.filter((dataset) =>
          props.exportableKeys.includes(dataset.key),
        )}
        exporting={props.exporting}
        onExport={async (key, format, secret) => {
          await props.onExport(key, format, secret);
          setExportOpen(false);
        }}
        onOpenChange={setExportOpen}
        open={exportOpen}
      />
    </div>
  );
}
