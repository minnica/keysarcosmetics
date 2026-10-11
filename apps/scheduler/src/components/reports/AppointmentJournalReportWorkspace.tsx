"use client";

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
  Download,
  FileSpreadsheet,
  MessageCircle,
  Printer,
  Search,
} from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type {
  DesignAppointmentJournalKind,
  DesignAppointmentJournalFilters,
  DesignAppointmentJournalReport,
} from "../../../design/contracts";
import { ReportsHeader } from "./ReportsHeader";
import { SchedulerPagination } from "@/components/shared/SchedulerPagination";
import {
  paginateSchedulerReportRows,
  type SchedulerReportPageSize,
} from "@/lib/scheduler-report-presentation";
import {
  exportAppointmentJournalPdf,
  exportAppointmentJournalXlsx,
  printAppointmentJournalReport,
} from "./appointment-journal-report-export";

interface AppointmentJournalReportWorkspaceProps {
  branches: Array<{ id: string; name: string }>;
  userName: string;
  canExport: boolean;
}

type KindFilter = "ALL" | "COMMENTS" | DesignAppointmentJournalKind;

const kindLabels: Record<DesignAppointmentJournalKind, string> = {
  SELLER_COMMENT: "Comentario vendedor",
  POST_SALE_COMMENT: "Postventa",
  CANCELLATION_REASON: "Cancelación",
  RESCHEDULE_REASON: "Reagenda",
};

function dateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function kindsForFilter(filter: KindFilter): DesignAppointmentJournalKind[] {
  if (filter === "ALL") return [];
  if (filter === "COMMENTS") return ["SELLER_COMMENT", "POST_SALE_COMMENT"];
  return [filter];
}

export function AppointmentJournalReportWorkspace({
  branches,
  userName,
  canExport,
}: AppointmentJournalReportWorkspaceProps) {
  const [dateFrom, setDateFrom] = useState(() => dateInput(-30));
  const [dateTo, setDateTo] = useState(() => dateInput());
  const [branchId, setBranchId] = useState("ALL");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState<DesignAppointmentJournalFilters>(
    () => ({
      dateFrom: dateInput(-30),
      dateTo: dateInput(),
      branchIds: branches.map((branch) => branch.id),
      kinds: [] as DesignAppointmentJournalKind[],
    }),
  );
  const [report, setReport] = useState<DesignAppointmentJournalReport | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const pagination = useMemo(
    () => paginateSchedulerReportRows(report?.rows ?? [], page, pageSize),
    [page, pageSize, report?.rows],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void schedulerDesignProposals
      .appointmentJournalReport(applied)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No fue posible cargar el seguimiento.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied]);

  function applyFilters() {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      toast.error("Selecciona un periodo válido.");
      return;
    }
    setPage(1);
    setApplied({
      dateFrom,
      dateTo,
      branchIds:
        branchId === "ALL" ? branches.map((branch) => branch.id) : [branchId],
      kinds: kindsForFilter(kind),
      ...(query.trim() ? { query: query.trim() } : {}),
    });
  }

  async function download(format: "xlsx" | "pdf") {
    if (!report || !canExport) return;
    setExporting(true);
    try {
      if (format === "xlsx") await exportAppointmentJournalXlsx(report);
      else await exportAppointmentJournalPdf(report);
      toast.success(`Reporte ${format.toUpperCase()} descargado.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "No fue posible exportar.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <ReportsHeader active="appointment-journal" userName={userName} />
      <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 xl:p-8">
        <section className="settings-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Contenido</Label>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as KindFilter)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Citas y comentarios</SelectItem>
                    <SelectItem value="COMMENTS">Sólo comentarios</SelectItem>
                    {Object.entries(kindLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Cliente, autor, comentario…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button onClick={applyFilters}>Aplicar filtros</Button>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Registros", report?.summary.entries ?? 0],
            ["Citas", report?.summary.appointments ?? 0],
            [
              "Comentarios",
              (report?.summary.sellerComments ?? 0) +
                (report?.summary.postSaleComments ?? 0),
            ],
            ["Postventa", report?.summary.postSaleComments ?? 0],
            ["Cancelaciones", report?.summary.cancellations ?? 0],
            ["Reagendas", report?.summary.reschedules ?? 0],
          ].map(([label, value]) => (
            <article className="settings-card p-4" key={label}>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--scheduler-ink-strong)]">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="settings-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee6df] p-5">
            <div>
              <h2 className="font-semibold text-slate-800">
                Historial descargable
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Incluye cliente, cita, sucursal, servicios, comentario,
                categoría, autor y fechas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canExport || exporting || !report}
                onClick={() => void download("xlsx")}
                variant="outline"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button
                disabled={!canExport || exporting || !report}
                onClick={() => void download("pdf")}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button
                disabled={!canExport || !report}
                onClick={() => report && printAppointmentJournalReport(report)}
                variant="outline"
              >
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-[#f7f2ed] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente y cita</th>
                  <th className="px-4 py-3">Sucursal / servicio</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Comentario</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee6df]">
                {pagination.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {row.customerName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(row.appointmentStartsAt).toLocaleString(
                          "es-MX",
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{row.branchName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.serviceNames.join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{kindLabels[row.kind]}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.categoryLabel ?? row.tentativeDate ?? "—"}
                      </p>
                    </td>
                    <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                      {row.comment}
                    </td>
                    <td className="px-4 py-3">
                      <p>{row.actorName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.actorRole}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(row.createdAt).toLocaleString("es-MX")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !report?.rows.length ? (
              <div className="p-10 text-center text-sm text-slate-500">
                <MessageCircle className="mx-auto mb-3 h-7 w-7" />
                No hay registros para los filtros seleccionados.
              </div>
            ) : null}
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Cargando seguimiento…
              </div>
            ) : null}
          </div>
          {!loading && report?.rows.length ? (
            <SchedulerPagination
              {...pagination}
              label="registros"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSize={pageSize}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
