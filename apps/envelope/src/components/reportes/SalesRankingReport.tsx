"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  RefreshCw,
  Search,
  SearchX,
  Store,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateRangePicker,
  Input,
  Label,
  type DateRange,
} from "@cosmetics/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn, formatCurrency, formatDate, todayISO } from "@/lib/utils";
import { ReportExportButtons } from "@/components/reportes/ReportExportButtons";
import { RefreshingDataIndicator } from "@/components/RefreshingDataIndicator";
import { RankingLoadingSkeleton } from "@/components/layout/DataLoadingSkeleton";
import {
  exportReportToExcel,
  exportReportToPdf,
  type ExportColumn,
} from "@/lib/report-export";

gsap.registerPlugin(useGSAP);

export type SalesRankingKind = "seller" | "branch";

type RankingApiRow = {
  id: string;
  nombre: string;
  totalVendido: number;
  operaciones: number;
  relacionados: number;
};

type RankingRow = RankingApiRow & {
  posicion: number;
  participacion: number;
  promedio: number;
  diferenciaLider: number;
};

type SalesRankingReportProps = {
  kind: SalesRankingKind;
};

function currentMonthToDate(): DateRange {
  const today = todayISO();
  return { from: `${today.slice(0, 8)}01`, to: today };
}

function normalizeSearchValue(value: string, locale: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(locale)
    .trim();
}

function podiumCardClass(position: number): string {
  if (position === 1) {
    return "border-[#c3a583] border-t-4 bg-[#fbf7ef] dark:bg-[#302b24] lg:min-h-72";
  }
  if (position === 2) {
    return "border-[#b9c5c8] border-t-[3px] bg-[#f3f6f6] dark:border-[#596568] dark:bg-[#272d2e] lg:mt-8 lg:min-h-64";
  }
  return "border-[#d3aa98] border-t-[3px] bg-[#fbf3ef] dark:border-[#76594c] dark:bg-[#302925] lg:mt-16 lg:min-h-56";
}

function positionBadgeClass(position: number): string {
  if (position === 1)
    return "border-[#c3a583] bg-[#c3a583] text-[#332b24] dark:text-[#1a1a1a]";
  if (position === 2)
    return "border-[#9eaaad] bg-[#9eaaad] text-[#202526] dark:bg-[#728083] dark:text-[#111617]";
  if (position === 3)
    return "border-[#b9836d] bg-[#b9836d] text-[#2e211b] dark:bg-[#986c59] dark:text-[#160f0c]";
  return "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]";
}

export function SalesRankingReport({ kind }: SalesRankingReportProps) {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasRenderedDataRef = useRef(false);
  const hasLoadedRequestRef = useRef(false);
  const rowCountRef = useRef(0);
  const [range, setRange] = useState<DateRange>(currentMonthToDate);
  const [rows, setRows] = useState<RankingApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryRevision, setRetryRevision] = useState(0);
  const [animationRevision, setAnimationRevision] = useState(0);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const copy =
    kind === "seller"
      ? {
          title: t.reports.sellerRankingTitle,
          description: t.reports.sellerRankingDescription,
          empty: t.reports.rankingNoSellerSales,
          entity: t.common.employee,
          related: t.reports.rankingBranches,
          searchPlaceholder: t.reports.rankingSearchSeller,
          endpoint: "/api/envelope/reportes/ranking-vendedores",
          filename: "ranking-vendedores",
        }
      : {
          title: t.reports.branchRankingTitle,
          description: t.reports.branchRankingDescription,
          empty: t.reports.rankingNoBranchSales,
          entity: t.common.branch,
          related: t.reports.rankingSellers,
          searchPlaceholder: t.reports.rankingSearchBranch,
          endpoint: "/api/envelope/reportes/ranking-sucursales",
          filename: "ranking-sucursales",
        };

  useEffect(() => {
    let cancelled = false;

    async function loadRanking() {
      if (!hasLoadedRequestRef.current || rowCountRef.current === 0)
        setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const { data } = await api.get<{
          success: boolean;
          data: RankingApiRow[];
        }>(copy.endpoint, {
          params: { fechaInicio: range.from, fechaFin: range.to },
        });
        if (cancelled) return;
        rowCountRef.current = data.data.length;
        setRows(data.data);
        setAnimationRevision((current) => current + 1);
      } catch {
        if (!cancelled) setError(t.reports.rankingLoadError);
      } finally {
        if (!cancelled) {
          hasLoadedRequestRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadRanking();
    return () => {
      cancelled = true;
    };
  }, [
    copy.endpoint,
    range.from,
    range.to,
    retryRevision,
    t.reports.rankingLoadError,
  ]);

  const rankingRows = useMemo<RankingRow[]>(() => {
    const sorted = [...rows].sort(
      (a, b) =>
        b.totalVendido - a.totalVendido ||
        a.nombre.localeCompare(b.nombre, locale),
    );
    const total = sorted.reduce((sum, row) => sum + row.totalVendido, 0);
    const leaderTotal = sorted[0]?.totalVendido ?? 0;

    return sorted.map((row, index) => ({
      ...row,
      posicion: index + 1,
      participacion: total > 0 ? (row.totalVendido / total) * 100 : 0,
      promedio: row.operaciones > 0 ? row.totalVendido / row.operaciones : 0,
      diferenciaLider: Math.max(0, leaderTotal - row.totalVendido),
    }));
  }, [locale, rows]);

  const totals = useMemo(
    () => ({
      totalVendido: rankingRows.reduce((sum, row) => sum + row.totalVendido, 0),
      operaciones: rankingRows.reduce((sum, row) => sum + row.operaciones, 0),
    }),
    [rankingRows],
  );

  const filteredRankingRows = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery, locale);
    if (!normalizedQuery) return rankingRows;

    return rankingRows.filter((row) =>
      normalizeSearchValue(row.nombre, locale).includes(normalizedQuery),
    );
  }, [locale, rankingRows, searchQuery]);

  const filteredTotals = useMemo(
    () => ({
      totalVendido: filteredRankingRows.reduce(
        (sum, row) => sum + row.totalVendido,
        0,
      ),
      operaciones: filteredRankingRows.reduce(
        (sum, row) => sum + row.operaciones,
        0,
      ),
      participacion: filteredRankingRows.reduce(
        (sum, row) => sum + row.participacion,
        0,
      ),
    }),
    [filteredRankingRows],
  );

  useGSAP(
    () => {
      if (animationRevision === 0 || rankingRows.length === 0) return;
      if (!hasRenderedDataRef.current) {
        hasRenderedDataRef.current = true;
        return;
      }

      const media = gsap.matchMedia();
      media.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          if (context.conditions?.reduceMotion) return;

          const podiumCards = gsap.utils.toArray<HTMLElement>(
            "[data-ranking-podium]",
          );
          const rankingItems = gsap.utils
            .toArray<HTMLElement>("[data-ranking-row]")
            .slice(0, 12);
          const bars = gsap.utils.toArray<HTMLElement>("[data-ranking-bar]");
          const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

          timeline.fromTo(
            podiumCards,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.42,
              stagger: 0.055,
              clearProps: "transform,opacity,visibility",
            },
            0,
          );
          timeline.fromTo(
            rankingItems,
            { autoAlpha: 0, y: 10 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.32,
              stagger: 0.025,
              clearProps: "transform,opacity,visibility",
            },
            0.08,
          );
          timeline.fromTo(
            bars,
            { scaleX: 0, transformOrigin: "left center" },
            {
              scaleX: 1,
              duration: 0.46,
              stagger: 0.018,
              clearProps: "transform",
            },
            0.12,
          );
        },
      );

      return () => media.revert();
    },
    {
      dependencies: [animationRevision],
      scope: containerRef,
      revertOnUpdate: true,
    },
  );

  const exportRows = filteredRankingRows;
  const exportColumns = useMemo<ExportColumn<RankingRow>[]>(
    () => [
      {
        header: t.reports.rankingPosition,
        accessor: (row) => (row.posicion > 0 ? row.posicion : ""),
        width: 10,
      },
      { header: copy.entity, accessor: (row) => row.nombre, width: 28 },
      {
        header: t.reports.totalSold,
        accessor: (row) => row.totalVendido,
        format: "currency",
        width: 18,
      },
      {
        header: t.reports.rankingShare,
        accessor: (row) => row.participacion,
        format: "percent",
        width: 14,
      },
      {
        header: t.reports.rankingOperations,
        accessor: (row) => row.operaciones,
        format: "number",
        width: 14,
      },
      {
        header: copy.related,
        accessor: (row) => (row.posicion > 0 ? row.relacionados : null),
        format: "number",
        width: 18,
      },
      {
        header: t.reports.rankingAverage,
        accessor: (row) => (row.posicion > 0 ? row.promedio : null),
        format: "currency",
        width: 20,
      },
    ],
    [copy.entity, copy.related, t],
  );

  const exportFooter = useMemo<RankingRow>(
    () => ({
      id: "total",
      nombre: t.common.grandTotal.toUpperCase(),
      totalVendido: filteredTotals.totalVendido,
      operaciones: filteredTotals.operaciones,
      relacionados: 0,
      posicion: 0,
      participacion: filteredTotals.participacion,
      promedio:
        filteredTotals.operaciones > 0
          ? filteredTotals.totalVendido / filteredTotals.operaciones
          : 0,
      diferenciaLider: 0,
    }),
    [filteredTotals, t.common.grandTotal],
  );

  async function handleExport(kindToExport: "pdf" | "excel") {
    setExporting(kindToExport);
    const config = {
      title: copy.title,
      subtitle: `${t.common.period} ${formatDate(range.from, "dd/MM/yyyy", locale)} - ${formatDate(range.to, "dd/MM/yyyy", locale)}${searchQuery.trim() ? ` · ${t.reports.rankingSearchLabel}: ${searchQuery.trim()}` : ""}`,
      filename: `${copy.filename}-${range.from}-${range.to}`,
      sheetName: copy.title,
      orientation: "landscape" as const,
      columns: exportColumns,
      rows: exportRows,
      footerRow: exportFooter,
    };

    try {
      if (kindToExport === "pdf") await exportReportToPdf(config);
      else await exportReportToExcel(config);
    } finally {
      setExporting(null);
    }
  }

  const podiumRows = rankingRows.slice(0, 3);
  const Icon = kind === "seller" ? UserRound : Store;

  return (
    <div ref={containerRef} className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="page-title">{copy.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {copy.description}
          </p>
        </div>
        <ReportExportButtons
          disabled={
            loading || Boolean(error) || filteredRankingRows.length === 0
          }
          exporting={exporting}
          onExportPdf={() => void handleExport("pdf")}
          onExportExcel={() => void handleExport("excel")}
          pdfLabel={t.common.exportPdf}
          excelLabel={t.common.exportExcel}
        />
      </header>

      <Card className="border-[var(--border-color)] bg-[var(--bg-card)] shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">
              {t.common.period}
            </p>
            <DateRangePicker
              value={range}
              onChange={setRange}
              fromLabel={t.common.from}
              toLabel={t.common.to}
            />
          </div>
          <div className="flex min-h-9 items-center justify-end">
            {refreshing ? (
              <RefreshingDataIndicator label={t.common.refreshingData} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRetryRevision((current) => current + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            {t.reports.rankingRetry}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <RankingLoadingSkeleton label={t.common.loadingData} />
      ) : error && rankingRows.length === 0 ? null : rankingRows.length === 0 ? (
        <Card className="border-[var(--border-color)] bg-[var(--bg-card)] shadow-none">
          <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-hover)] text-[#6b5138] dark:text-[#d8c0a3]">
              <TrendingUp className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold">{copy.empty}</h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
              {formatDate(range.from, "dd MMM yyyy", locale)} —{" "}
              {formatDate(range.to, "dd MMM yyyy", locale)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section
            className="space-y-4"
            aria-labelledby={`${kind}-podium-title`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id={`${kind}-podium-title`}
                  className="section-heading uppercase"
                >
                  {t.reports.rankingPodium}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {rankingRows.length} {copy.entity.toLocaleLowerCase(locale)}
                  {rankingRows.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {t.reports.rankingPeriodTotal}
                </p>
                <p className="number-display mt-1 text-2xl">
                  {formatCurrency(totals.totalVendido)}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "grid gap-4",
                podiumRows.length === 2 &&
                  "lg:grid-cols-[minmax(0,1.125fr)_minmax(0,1fr)] lg:items-stretch",
                podiumRows.length === 3 &&
                  "lg:grid-cols-[minmax(0,1.125fr)_minmax(0,1fr)_minmax(0,0.875fr)] lg:items-stretch",
              )}
            >
              {podiumRows.map((row) => {
                const isLeader = row.posicion === 1;
                return (
                  <Card
                    key={row.id}
                    data-ranking-podium
                    className={cn(
                      "relative flex flex-col overflow-hidden shadow-none",
                      podiumCardClass(row.posicion),
                    )}
                  >
                    <CardHeader className="space-y-4 p-5 pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg border",
                            positionBadgeClass(row.posicion),
                          )}
                        >
                          <span className="number-display">
                            {row.posicion}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-current bg-transparent uppercase"
                        >
                          {row.participacion.toFixed(1)}%{" "}
                          {t.reports.rankingShare}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-balance text-xl leading-tight">
                          {row.nombre}
                        </CardTitle>
                        <p className="number-display mt-3 text-2xl sm:text-3xl">
                          {formatCurrency(row.totalVendido)}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-4 px-5 pb-5">
                      <div
                        className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                        role="progressbar"
                        aria-label={`${row.nombre}: ${row.participacion.toFixed(1)}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(row.participacion)}
                      >
                        <div
                          data-ranking-bar
                          className="h-full rounded-full bg-[#648672] dark:bg-[#8bb09b]"
                          style={{
                            width: `${Math.max(2, row.participacion)}%`,
                          }}
                        />
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <dt className="text-xs text-[var(--text-muted)]">
                            {t.reports.rankingOperations}
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">
                            {row.operaciones}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--text-muted)]">
                            {copy.related}
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">
                            {row.relacionados}
                          </dd>
                        </div>
                        {!isLeader ? (
                          <div className="col-span-2 border-t border-black/10 pt-3 dark:border-white/10">
                            <dt className="text-xs text-[var(--text-muted)]">
                              {t.reports.rankingLeaderGap}
                            </dt>
                            <dd className="mt-0.5 font-semibold tabular-nums">
                              {formatCurrency(row.diferenciaLider)}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section
            className="space-y-4"
            aria-labelledby={`${kind}-ranking-title`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h2
                  id={`${kind}-ranking-title`}
                  className="section-heading uppercase"
                >
                  {t.reports.rankingComplete}
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(range.from, "dd/MM/yyyy", locale)} —{" "}
                  {formatDate(range.to, "dd/MM/yyyy", locale)}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full space-y-1.5 sm:max-w-sm">
                  <Label
                    htmlFor={`${kind}-ranking-search`}
                    className="text-xs font-medium text-[var(--text-secondary)]"
                  >
                    {t.reports.rankingSearchLabel}
                  </Label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                      aria-hidden="true"
                    />
                    <Input
                      id={`${kind}-ranking-search`}
                      type="text"
                      role="searchbox"
                      inputMode="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      aria-describedby={`${kind}-ranking-results`}
                      className="h-10 border-[var(--border-color)] bg-[var(--bg-card)] pl-10 pr-10"
                    />
                    {searchQuery ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchQuery("")}
                        aria-label={t.reports.rankingClearSearch}
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p
                  id={`${kind}-ranking-results`}
                  role="status"
                  aria-live="polite"
                  className="text-xs tabular-nums text-[var(--text-muted)]"
                >
                  {t.reports.rankingSearchResults(
                    filteredRankingRows.length,
                    rankingRows.length,
                  )}
                </p>
              </div>
            </div>

            <Card className="overflow-hidden border-[var(--border-color)] bg-[var(--bg-card)] shadow-none">
              <CardContent className="p-0">
                {filteredRankingRows.length > 0 ? (
                  <ol className="divide-y divide-[var(--border-color)]">
                    {filteredRankingRows.map((row) => (
                      <li
                        key={row.id}
                        data-ranking-row
                        className="grid gap-3 px-4 py-4 transition-colors duration-200 hover:bg-[var(--table-row-hover)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 lg:px-5"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums",
                            positionBadgeClass(row.posicion),
                          )}
                        >
                          {row.posicion}
                        </div>

                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {row.nombre}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {row.operaciones}{" "}
                                {t.reports.rankingOperations.toLocaleLowerCase(
                                  locale,
                                )}{" "}
                                · {row.relacionados}{" "}
                                {copy.related.toLocaleLowerCase(locale)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <div
                              className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-primary)]"
                              role="progressbar"
                              aria-label={`${row.nombre}: ${row.participacion.toFixed(1)}%`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(row.participacion)}
                            >
                              <div
                                data-ranking-bar
                                className="h-full rounded-full bg-[#648672] dark:bg-[#8bb09b]"
                                style={{
                                  width: `${Math.max(1.5, row.participacion)}%`,
                                }}
                              />
                            </div>
                            <span className="w-14 text-right text-xs font-semibold tabular-nums text-[var(--text-muted)]">
                              {row.participacion.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="col-start-2 flex items-end justify-between gap-5 sm:col-start-auto sm:block sm:min-w-40 sm:text-right">
                          <div>
                            <p className="number-display text-lg">
                              {formatCurrency(row.totalVendido)}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {t.reports.rankingAverage}:{" "}
                              {formatCurrency(row.promedio)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
                    <SearchX
                      className="h-8 w-8 text-[var(--text-muted)]"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-medium">
                      {t.reports.rankingNoSearchResults}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-4"
                    >
                      {t.reports.rankingClearSearch}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {animationRevision > 1 && !refreshing ? t.reports.rankingUpdated : ""}
      </span>
    </div>
  );
}
