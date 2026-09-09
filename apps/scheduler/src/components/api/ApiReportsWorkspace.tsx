"use client";

import { useMemo, useState } from "react";
import type {
  SchedulerAppointmentStatus,
  SchedulerMessageChannel,
  SchedulerReportDatasetDto,
  SchedulerReportKey,
  SchedulerReportRequest,
} from "@cosmetics/types";
import { toast } from "@cosmetics/ui";
import { RestoredReportsWorkspace } from "@/components/reports/RestoredReportsWorkspace";
import { schedulerApi } from "@/lib/api";
import {
  exportSchedulerReport,
  type SchedulerReportExportFormat,
} from "@/lib/scheduler-report-export";
import {
  mergeSchedulerReportPages,
  schedulerReportViews,
  type SchedulerReportBundle,
  type SchedulerReportView,
} from "@/lib/scheduler-report-presentation";
import { useSchedulerSession } from "@/lib/session";
import { useSchedulerQuery } from "./ApiState";

function dateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function screenForKey(key: SchedulerReportKey) {
  if (["APPOINTMENTS", "OCCUPANCY", "CANCELLATIONS", "NO_SHOW"].includes(key))
    return "reports.reservations" as const;
  if (["SALES", "PAYMENTS", "COMMISSIONS"].includes(key))
    return "reports.sales" as const;
  return "reports.summary" as const;
}

async function completeReport(
  key: SchedulerReportKey,
  request: SchedulerReportRequest,
): Promise<SchedulerReportDatasetDto> {
  const first = await schedulerApi.report(key, {
    ...request,
    page: 1,
    pageSize: 100,
  });
  const pageCount = Math.ceil(first.total / 100);
  if (pageCount <= 1) return first;
  const pages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      schedulerApi.report(key, { ...request, page: index + 2, pageSize: 100 }),
    ),
  );
  return mergeSchedulerReportPages(first, pages);
}

export function ApiReportsWorkspace({
  view = "summary",
  fixedBranchId,
}: {
  view?: SchedulerReportView;
  fixedBranchId?: string;
}) {
  const { bootstrap, canAccess } = useSchedulerSession();
  const definition = schedulerReportViews[view];
  const availableKeys = useMemo(
    () => definition.keys.filter((key) => canAccess(screenForKey(key))),
    [canAccess, definition.keys],
  );
  const exportableKeys = useMemo(
    () =>
      availableKeys.filter(
        (key) =>
          canAccess(screenForKey(key), "EXPORT") &&
          (key !== "CUSTOMERS" || canAccess("clients", "EXPORT")),
      ),
    [availableKeys, canAccess],
  );
  const [dateFrom, setDateFrom] = useState(() => dateInput(-30));
  const [dateTo, setDateTo] = useState(() => dateInput());
  const [branchId, setBranchId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SchedulerAppointmentStatus | "ALL">(
    "ALL",
  );
  const [channel, setChannel] = useState<SchedulerMessageChannel | "ALL">(
    "ALL",
  );
  const [exporting, setExporting] = useState(false);
  const fixedBranch = bootstrap?.authorizedBranches.find(
    (branch) => branch.id === fixedBranchId,
  );
  const invalidFixedBranch = Boolean(fixedBranchId && !fixedBranch);
  const branchIds = useMemo(() => {
    if (fixedBranch) return [fixedBranch.id];
    if (branchId === "ALL") return bootstrap?.authorizedBranchIds ?? [];
    return [branchId];
  }, [bootstrap?.authorizedBranchIds, branchId, fixedBranch]);
  const request = useMemo<SchedulerReportRequest>(
    () => ({
      dateFrom,
      dateTo,
      branchIds,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(view === "history" && status !== "ALL" ? { status } : {}),
      ...(["messaging", "reminders"].includes(view) && channel !== "ALL"
        ? { channel }
        : {}),
    }),
    [branchIds, channel, dateFrom, dateTo, search, status, view],
  );
  const reports = useSchedulerQuery(
    async () => {
      const datasets = await Promise.all(
        availableKeys.map(
          async (key) => [key, await completeReport(key, request)] as const,
        ),
      );
      return Object.fromEntries(datasets) as SchedulerReportBundle;
    },
    [
      view,
      availableKeys.join(","),
      dateFrom,
      dateTo,
      branchIds.join(","),
      search,
      status,
      channel,
    ],
    {
      queryKey: `reports:${view}`,
      branchId: fixedBranchId ?? branchId,
      enabled:
        !invalidFixedBranch &&
        Boolean(
          dateFrom &&
          dateTo &&
          dateFrom <= dateTo &&
          branchIds.length &&
          availableKeys.length,
        ),
    },
  );

  async function exportData(
    key: SchedulerReportKey,
    format: SchedulerReportExportFormat,
    secret?: string,
  ) {
    setExporting(true);
    try {
      let authorizationToken: string | undefined;
      if (key === "CUSTOMERS") {
        if (!secret) throw new Error("Ingresa tu código personal.");
        const authorization = await schedulerApi.createAuthorization({
          secret,
          purpose: "SENSITIVE_EXPORT",
          screenKey: "scheduler/clients",
          targetType: "SchedulerReport",
          targetId: "CUSTOMERS",
        });
        authorizationToken = authorization.token;
      }
      const dataset = await schedulerApi.exportReport(
        key,
        request,
        authorizationToken,
      );
      await exportSchedulerReport(dataset, format);
      toast.success(
        `Exportación ${format.toUpperCase()} generada desde el dataset completo.`,
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No fue posible exportar el reporte.",
      );
    } finally {
      setExporting(false);
    }
  }

  const noPermissionError = availableKeys.length
    ? null
    : "La sesión no tiene lectura sobre los datasets requeridos para este desglose.";
  const fixedBranchError = invalidFixedBranch
    ? "La sucursal indicada en la URL no pertenece al alcance autorizado."
    : null;
  return (
    <RestoredReportsWorkspace
      view={view}
      bundle={reports.data}
      loading={reports.loading}
      error={fixedBranchError ?? noPermissionError ?? reports.error}
      dateFrom={dateFrom}
      dateTo={dateTo}
      branchId={branchId}
      branches={bootstrap?.authorizedBranches ?? []}
      {...(fixedBranch ? { fixedBranch } : {})}
      search={search}
      status={status}
      channel={channel}
      exportableKeys={exportableKeys}
      exporting={exporting}
      userName={bootstrap?.user.name ?? "Keysar"}
      canReadSummary={canAccess("reports.summary")}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      onBranchChange={setBranchId}
      onSearchChange={setSearch}
      onStatusChange={setStatus}
      onChannelChange={setChannel}
      onRetry={() => void reports.reload()}
      onExport={exportData}
    />
  );
}
