'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProgressKeysar,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@cosmetics/ui'
import { ChevronDown } from 'lucide-react'

import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { api } from '@/lib/api'
import { useI18n, type Locale } from '@/lib/i18n'
import {
  exportReportToExcel,
  exportReportToPdf,
  type ExportCellFormat,
  type ExportColumn,
} from '@/lib/report-export'
import { formatCurrency, formatDate } from '@/lib/utils'

type ViewMode = 'weekly' | 'monthly'

interface BranchGoalBranch {
  id: string
  nombre: string
  metaMensual: number
}

interface BranchGoalPeriodAmount {
  sucursalId: string
  sucursalNombre: string
  total: number
}

interface BranchGoalPeriodRow {
  id: string
  startDate: string
  endDate: string
  weekNumber: number | null
  porSucursal: BranchGoalPeriodAmount[]
  total: number
}

interface BranchGoalsReport {
  referenceDate: string
  monthStart: string
  monthEnd: string
  weeksInMonth: number
  daysRemainingInMonth: number
  daysRemainingInCurrentWeek: number
  currentWeekNumber: number | null
  branches: BranchGoalBranch[]
  monthlyRows: BranchGoalPeriodRow[]
  weeklyRows: BranchGoalPeriodRow[]
}

interface GoalSummaryRow extends BranchGoalBranch {
  goal: number
  sold: number
  remaining: number
  daysRemaining: number
  dailyAmount: number | null
  sellerCount: number
  perSellerDaily: number | null
}

interface ExportRow {
  label: string
  byBranch: Record<string, number | null>
  total: number | null
  format: ExportCellFormat
}

const ZERO_BADGE_CLASS_NAME =
  'rounded-full bg-[#b85f5a] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#b85f5a] tabular-nums'

function amountForBranch(
  row: BranchGoalPeriodRow | undefined,
  branchId: string,
): number {
  return (
    row?.porSucursal.find((amount) => amount.sucursalId === branchId)?.total ??
    0
  )
}

function weekRangeLabel(
  row: BranchGoalPeriodRow,
  locale: Locale,
): string {
  if (locale === 'en') {
    return `${formatDate(row.startDate, 'MMM d', locale)} to ${formatDate(
      row.endDate,
      'MMM d',
      locale,
    )}`
  }

  const sameMonth = row.startDate.slice(0, 7) === row.endDate.slice(0, 7)
  return sameMonth
    ? `${formatDate(row.startDate, 'd', locale)} al ${formatDate(
        row.endDate,
        'd MMMM',
        locale,
      )}`
    : `${formatDate(row.startDate, 'd MMMM', locale)} al ${formatDate(
        row.endDate,
        'd MMMM',
        locale,
      )}`
}

function renderAmount(value: number) {
  if (value === 0) {
    return (
      <Badge variant="destructive" className={ZERO_BADGE_CLASS_NAME}>
        {formatCurrency(value)}
      </Badge>
    )
  }

  return formatCurrency(value)
}

function renderOptionalAmount(value: number | null) {
  return value === null ? '—' : formatCurrency(value)
}

function sumOptionalAmounts(values: Array<number | null>): number | null {
  return values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
}

function goalProgress(row: GoalSummaryRow): number {
  if (row.goal <= 0) return row.sold > 0 ? 100 : 0
  return (row.sold / row.goal) * 100
}

function GoalFooterRow({
  label,
  rows,
  renderBranchValue,
  totalValue,
  emphasized = false,
}: {
  label: string
  rows: GoalSummaryRow[]
  renderBranchValue: (row: GoalSummaryRow) => React.ReactNode
  totalValue: React.ReactNode
  emphasized?: boolean
}) {
  const surfaceClass = emphasized
    ? 'bg-[color:var(--accent-hover)]'
    : 'bg-[color:var(--table-row-alt)]'
  const rowClass = emphasized
    ? 'bg-[color:var(--accent-hover)] hover:bg-[color:var(--accent-hover)]'
    : 'bg-[color:var(--table-row-alt)] hover:bg-[color:var(--table-row-alt)]'

  return (
    <TableRow className={`${rowClass} border-[color:var(--border-color)]`}>
      <TableHead
        scope="row"
        className={`sticky left-0 z-10 min-w-44 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-[0.04em] text-[color:var(--text-primary)] ${surfaceClass}`}
      >
        {label}
      </TableHead>
      {rows.map((row) => (
        <TableCell
          key={row.id}
          className="min-w-32 px-3 text-right font-medium tabular-nums"
        >
          {renderBranchValue(row)}
        </TableCell>
      ))}
      <TableCell
        className={`sticky right-0 z-10 min-w-32 px-3 text-right font-bold tabular-nums ${surfaceClass}`}
      >
        {totalValue}
      </TableCell>
    </TableRow>
  )
}

export default function BranchGoalsPage() {
  const { locale, t } = useI18n()
  const [view, setView] = useState<ViewMode>('weekly')
  const [report, setReport] = useState<BranchGoalsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [sellerInputs, setSellerInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<{
          success: boolean
          data: BranchGoalsReport
        }>('/api/envelope/reportes/metas-sucursal')
        if (!cancelled) setReport(data.data)
      } catch {
        if (!cancelled) setError(t.reports.branchGoalsLoadError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [t.reports.branchGoalsLoadError])

  const branches = useMemo(() => report?.branches ?? [], [report?.branches])
  const activeRows = useMemo(
    () =>
      view === 'monthly'
        ? report?.monthlyRows ?? []
        : report?.weeklyRows ?? [],
    [report?.monthlyRows, report?.weeklyRows, view],
  )
  const currentWeek = useMemo(
    () =>
      report?.weeklyRows.find(
        (row) => row.weekNumber === report.currentWeekNumber,
      ),
    [report?.currentWeekNumber, report?.weeklyRows],
  )

  const totalsByBranch = useMemo(
    () =>
      Object.fromEntries(
        branches.map((branch) => [
          branch.id,
          activeRows.reduce(
            (sum, row) => sum + amountForBranch(row, branch.id),
            0,
          ),
        ]),
      ) as Record<string, number>,
    [activeRows, branches],
  )
  const periodTotal = activeRows.reduce((sum, row) => sum + row.total, 0)

  const goalRows = useMemo<GoalSummaryRow[]>(() => {
    if (!report) return []

    const daysRemaining =
      view === 'monthly'
        ? report.daysRemainingInMonth
        : report.daysRemainingInCurrentWeek

    return branches.map((branch) => {
      const goal =
        view === 'monthly'
          ? branch.metaMensual
          : report.weeksInMonth > 0
            ? branch.metaMensual / report.weeksInMonth
            : 0
      const sold =
        view === 'monthly'
          ? totalsByBranch[branch.id] ?? 0
          : amountForBranch(currentWeek, branch.id)
      const remaining = Math.max(goal - sold, 0)
      const dailyAmount =
        remaining === 0 ? 0 : daysRemaining > 0 ? remaining / daysRemaining : null
      const sellerCount = Number(sellerInputs[branch.id] ?? '1')
      const perSellerDaily =
        dailyAmount !== null && sellerCount >= 1
          ? dailyAmount / sellerCount
          : null

      return {
        ...branch,
        goal,
        sold,
        remaining,
        daysRemaining,
        dailyAmount,
        sellerCount,
        perSellerDaily,
      }
    })
  }, [branches, currentWeek, report, sellerInputs, totalsByBranch, view])

  const goalTotals = useMemo(
    () => ({
      goal: goalRows.reduce((sum, row) => sum + row.goal, 0),
      sold: goalRows.reduce((sum, row) => sum + row.sold, 0),
      remaining: goalRows.reduce((sum, row) => sum + row.remaining, 0),
      daysRemaining: goalRows[0]?.daysRemaining ?? 0,
      dailyAmount: sumOptionalAmounts(
        goalRows.map((row) => row.dailyAmount),
      ),
      sellerCount: goalRows.reduce((sum, row) => sum + row.sellerCount, 0),
      perSellerDaily: sumOptionalAmounts(
        goalRows.map((row) => row.perSellerDaily),
      ),
    }),
    [goalRows],
  )

  const periodLabel = report
    ? formatDate(report.referenceDate, 'MMMM yyyy', locale)
    : ''

  function rowLabel(row: BranchGoalPeriodRow): string {
    if (view === 'monthly') {
      return formatDate(row.startDate, 'dd/MM/yyyy', locale)
    }

    return t.reports.weekLabel(
      row.weekNumber ?? 0,
      weekRangeLabel(row, locale),
    )
  }

  function setSellerCount(branchId: string, value: string) {
    if (value === '' || /^\d{1,3}$/.test(value)) {
      setSellerInputs((current) => ({ ...current, [branchId]: value }))
    }
  }

  const exportRows: ExportRow[] = activeRows.map((row) => ({
    label: rowLabel(row),
    byBranch: Object.fromEntries(
      branches.map((branch) => [
        branch.id,
        amountForBranch(row, branch.id),
      ]),
    ),
    total: row.total,
    format: 'currency',
  }))
  const exportFooter: ExportRow = {
    label: t.reports.branchTotal,
    byBranch: totalsByBranch,
    total: periodTotal,
    format: 'currency',
  }
  const footerValues = (
    accessor: (row: GoalSummaryRow) => number | null,
  ): Record<string, number | null> =>
    Object.fromEntries(goalRows.map((row) => [row.id, accessor(row)]))
  const exportFooterRows: ExportRow[] = [
    exportFooter,
    {
      label: t.reports.minimumGoal,
      byBranch: footerValues((row) => row.goal),
      total: goalTotals.goal,
      format: 'currency',
    },
    {
      label: t.reports.toGoal,
      byBranch: footerValues((row) => row.remaining),
      total: goalTotals.remaining,
      format: 'currency',
    },
    {
      label: t.reports.remainingDays,
      byBranch: footerValues((row) => row.daysRemaining),
      total: goalTotals.daysRemaining,
      format: 'number',
    },
    {
      label: t.reports.dailyAmount,
      byBranch: footerValues((row) => row.dailyAmount),
      total: goalTotals.dailyAmount,
      format: 'currency',
    },
    {
      label: t.reports.sellers,
      byBranch: footerValues((row) => row.sellerCount),
      total: goalTotals.sellerCount,
      format: 'number',
    },
    {
      label: t.reports.perSellerPerDay,
      byBranch: footerValues((row) => row.perSellerDaily),
      total: goalTotals.perSellerDaily,
      format: 'currency',
    },
  ]
  const exportColumns: ExportColumn<ExportRow>[] = [
    {
      header: view === 'monthly' ? t.common.date : t.reports.week,
      accessor: (row) => row.label,
      width: view === 'monthly' ? 18 : 30,
    },
    ...branches.map<ExportColumn<ExportRow>>((branch) => ({
      header: branch.nombre,
      accessor: (row) => row.byBranch[branch.id],
      format: (row) => row.format,
      width: 16,
    })),
    {
      header: t.common.total,
      accessor: (row) => row.total,
      format: (row) => row.format,
      width: 16,
    },
  ]

  async function handleExport(kind: 'pdf' | 'excel') {
    if (!report) return

    setExporting(kind)
    const viewLabel =
      view === 'monthly' ? t.reports.monthly : t.reports.weekly
    const config = {
      title: `${t.reports.branchGoalsTitle} — ${viewLabel}`,
      subtitle: periodLabel,
      filename: `metas-sucursal-${view}-${report.referenceDate.slice(0, 7)}`,
      sheetName: view === 'monthly' ? 'Mensual' : 'Semanal',
      orientation: 'landscape' as const,
      columns: exportColumns,
      rows: exportRows,
      footerRows: exportFooterRows,
    }

    try {
      if (kind === 'pdf') {
        await exportReportToPdf(config)
      } else {
        await exportReportToExcel(config)
      }
    } finally {
      setExporting(null)
    }
  }

  const hasBranches = branches.length > 0
  const noWeeklyRows = view === 'weekly' && activeRows.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t.reports.branchGoalsTitle}</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {t.reports.branchGoalsDescription}
          </p>
        </div>
        <ReportExportButtons
          disabled={loading || Boolean(error) || !hasBranches || noWeeklyRows}
          exporting={exporting}
          onExportPdf={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
          pdfLabel={t.common.exportPdf}
          excelLabel={t.common.exportExcel}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label={t.reports.branchGoalsTitle}
          className="inline-flex w-full rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-1 sm:w-auto"
        >
          {(['weekly', 'monthly'] as const).map((mode) => {
            const selected = view === mode
            const label =
              mode === 'weekly' ? t.reports.weekly : t.reports.monthly
            return (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'ghost'}
                role="tab"
                aria-selected={selected}
                className="flex-1 cursor-pointer transition-colors duration-200 motion-reduce:transition-none sm:min-w-28"
                onClick={() => setView(mode)}
              >
                {label}
              </Button>
            )
          })}
        </div>
        {periodLabel ? (
          <div className="text-sm font-medium capitalize text-[color:var(--text-muted)]">
            {periodLabel}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <TableLoadingSkeleton
          columns={8}
          rows={4}
          label={t.common.loadingData}
        />
      ) : !hasBranches ? (
        <p className="text-sm text-[color:var(--text-muted)]">
          {t.common.noDataSelectedPeriod}
        </p>
      ) : noWeeklyRows ? (
        <p className="text-sm text-[color:var(--text-muted)]">
          {t.reports.noWeeklyPeriod}
        </p>
      ) : (
        <>
          <div className="space-y-5 md:hidden">
            <Card className="border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-sm">
              <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {t.reports.totalSold}
                  </div>
                  <CardTitle className="mt-1 number-display text-2xl">
                    {formatCurrency(goalTotals.sold)}
                  </CardTitle>
                  <div className="mt-1 text-xs capitalize text-[color:var(--text-muted)]">
                    {periodLabel}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[color:var(--accent-hover)] px-3 py-1 text-xs font-semibold text-[color:var(--text-primary)]">
                  {view === 'monthly'
                    ? t.reports.monthly
                    : t.reports.weekly}
                </span>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 px-4 pb-4">
                <div className="min-w-0 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {t.reports.minimumGoal}
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {formatCurrency(goalTotals.goal)}
                  </div>
                </div>
                <div className="min-w-0 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {t.reports.toGoal}
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {formatCurrency(goalTotals.remaining)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <section aria-labelledby="branch-goals-period-sales">
              <h2
                id="branch-goals-period-sales"
                className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
              >
                {t.reports.salesByPeriod}
              </h2>
              <details className="group overflow-hidden rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold outline-none transition-colors duration-200 hover:bg-[color:var(--bg-primary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)] motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                  <span>
                    {view === 'monthly'
                      ? t.reports.monthly
                      : t.reports.weekly}{' '}
                    · {activeRows.length}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="space-y-1 border-t border-[color:var(--border-color)] p-2">
                  {activeRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-[color:var(--bg-primary)] px-3 py-2.5"
                    >
                      <span className="min-w-0 text-xs font-medium capitalize leading-snug">
                        {rowLabel(row)}
                      </span>
                      <span className="number-display shrink-0 text-xs">
                        {formatCurrency(row.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </section>

            <section aria-labelledby="branch-goals-branches">
              <h2
                id="branch-goals-branches"
                className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
              >
                {t.reports.branchGoalsTitle}
              </h2>
              <div className="space-y-3">
                {goalRows.map((row) => {
                  const progress = goalProgress(row)
                  const inputId = `mobile-sellers-${view}-${row.id}`
                  const inputValue = sellerInputs[row.id] ?? '1'

                  return (
                    <Card
                      key={row.id}
                      className="overflow-hidden border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-sm"
                    >
                      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base leading-snug">
                            {row.nombre}
                          </CardTitle>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                            {t.reports.totalSold}
                          </div>
                        </div>
                        <div className="number-display shrink-0 text-base">
                          {formatCurrency(row.sold)}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 px-4 pb-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                              {t.reports.progress}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <ProgressKeysar value={progress} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="min-w-0 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                              {t.reports.minimumGoal}
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums">
                              {formatCurrency(row.goal)}
                            </div>
                          </div>
                          <div className="min-w-0 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                              {t.reports.toGoal}
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums">
                              {formatCurrency(row.remaining)}
                            </div>
                          </div>
                          <div className="min-w-0 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                              {t.reports.remainingDays}
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums">
                              {row.daysRemaining}
                            </div>
                          </div>
                          <div className="min-w-0 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                              {t.reports.dailyAmount}
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums">
                              {renderOptionalAmount(row.dailyAmount)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-[color:var(--border-color)] pt-3">
                          <Label
                            htmlFor={inputId}
                            className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]"
                          >
                            {t.reports.sellers}
                          </Label>
                          <Input
                            id={inputId}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="off"
                            value={inputValue}
                            aria-invalid={
                              inputValue !== '' && Number(inputValue) < 1
                            }
                            className="h-9 w-20 bg-[color:var(--input-bg)] px-2 text-center font-semibold tabular-nums shadow-none"
                            onChange={(event) =>
                              setSellerCount(row.id, event.target.value)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--accent-hover)] px-3 py-3">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-primary)]">
                            {t.reports.perSellerPerDay}
                          </span>
                          <span className="number-display shrink-0 text-sm">
                            {renderOptionalAmount(row.perSellerDaily)}
                          </span>
                        </div>

                        <details className="group rounded-xl border border-[color:var(--border-color)]">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors duration-200 hover:bg-[color:var(--bg-primary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)] motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                            {t.reports.salesByPeriod}
                            <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                          </summary>
                          <div className="space-y-1 border-t border-[color:var(--border-color)] p-2">
                            {activeRows.map((periodRow) => (
                              <div
                                key={periodRow.id}
                                className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--bg-primary)] px-3 py-2.5"
                              >
                                <span className="min-w-0 text-xs capitalize leading-snug text-[color:var(--text-muted)]">
                                  {rowLabel(periodRow)}
                                </span>
                                <span className="shrink-0 text-xs font-semibold tabular-nums">
                                  {renderAmount(
                                    amountForBranch(periodRow, row.id),
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          </div>

          <div
            className={`branch-goals-scroll hidden overflow-hidden rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] md:block ${
              view === 'monthly' ? 'branch-goals-scroll--monthly' : ''
            }`}
          >
            <Table
            aria-label={`${t.reports.branchGoalsTitle} — ${
              view === 'monthly' ? t.reports.monthly : t.reports.weekly
            }`}
            className="min-w-max"
          >
            <TableHeader className="[&_tr]:border-[color:var(--border-color)]">
              <TableRow className="bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card)]">
                <TableHead
                  className={`sticky left-0 bg-[color:var(--bg-card)] px-3 uppercase ${
                    view === 'monthly'
                      ? 'top-0 z-40 shadow-[0_4px_8px_rgba(79,74,68,0.08)]'
                      : 'z-20'
                  } ${
                    view === 'weekly' ? 'min-w-64' : 'min-w-44'
                  }`}
                >
                  {view === 'monthly' ? t.common.date : t.reports.week}
                </TableHead>
                {branches.map((branch) => (
                  <TableHead
                    key={branch.id}
                    className={`min-w-32 bg-[color:var(--bg-card)] px-3 text-right leading-4 ${
                      view === 'monthly'
                        ? 'sticky top-0 z-30 shadow-[0_4px_8px_rgba(79,74,68,0.08)]'
                        : ''
                    }`}
                  >
                    {branch.nombre}
                  </TableHead>
                ))}
                <TableHead
                  className={`sticky right-0 min-w-32 bg-[color:var(--bg-card)] px-3 text-right uppercase ${
                    view === 'monthly'
                      ? 'top-0 z-40 shadow-[0_4px_8px_rgba(79,74,68,0.08)]'
                      : 'z-20'
                  }`}
                >
                  {t.common.total}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {activeRows.map((row, index) => {
                const surfaceClass =
                  index % 2 === 0
                    ? 'bg-[color:var(--bg-card)]'
                    : 'bg-[color:var(--table-row-alt)]'

                return (
                  <TableRow
                    key={row.id}
                    className={`${surfaceClass} border-[color:var(--border-color)] hover:bg-[color:var(--table-row-hover)]`}
                  >
                    <TableHead
                      scope="row"
                      className={`sticky left-0 z-10 whitespace-nowrap px-3 font-medium capitalize text-[color:var(--text-primary)] ${surfaceClass}`}
                    >
                      {rowLabel(row)}
                    </TableHead>
                    {branches.map((branch) => (
                      <TableCell
                        key={branch.id}
                        className="min-w-32 px-3 text-right tabular-nums"
                      >
                        {renderAmount(amountForBranch(row, branch.id))}
                      </TableCell>
                    ))}
                    <TableCell
                      className={`sticky right-0 z-10 min-w-32 px-3 text-right font-semibold tabular-nums ${surfaceClass}`}
                    >
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>

            <TableFooter className="border-t-0 bg-transparent">
              <TableRow className="border-t border-[color:var(--border-color)] bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card)]">
                <TableHead
                  scope="row"
                  className="sticky left-0 z-10 bg-[color:var(--bg-card)] px-3 text-xs font-semibold uppercase text-[color:var(--text-primary)]"
                >
                  {t.reports.branchTotal}
                </TableHead>
                {branches.map((branch) => (
                  <TableCell
                    key={branch.id}
                    className="min-w-32 px-3 text-right font-semibold tabular-nums"
                  >
                    {renderAmount(totalsByBranch[branch.id] ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="sticky right-0 z-10 min-w-32 bg-[color:var(--bg-card)] px-3 text-right text-base font-bold tabular-nums">
                  {formatCurrency(periodTotal)}
                </TableCell>
              </TableRow>

              <GoalFooterRow
                label={t.reports.minimumGoal}
                rows={goalRows}
                renderBranchValue={(row) => formatCurrency(row.goal)}
                totalValue={formatCurrency(goalTotals.goal)}
              />
              <GoalFooterRow
                label={t.reports.toGoal}
                rows={goalRows}
                renderBranchValue={(row) => formatCurrency(row.remaining)}
                totalValue={formatCurrency(goalTotals.remaining)}
              />
              <GoalFooterRow
                label={t.reports.remainingDays}
                rows={goalRows}
                renderBranchValue={(row) => row.daysRemaining}
                totalValue={goalTotals.daysRemaining}
              />
              <GoalFooterRow
                label={t.reports.dailyAmount}
                rows={goalRows}
                renderBranchValue={(row) =>
                  renderOptionalAmount(row.dailyAmount)
                }
                totalValue={renderOptionalAmount(goalTotals.dailyAmount)}
              />
              <GoalFooterRow
                label={t.reports.sellers}
                rows={goalRows}
                renderBranchValue={(row) => {
                  const inputId = `sellers-${view}-${row.id}`
                  const inputValue = sellerInputs[row.id] ?? '1'

                  return (
                    <div className="ml-auto w-16">
                      <Label htmlFor={inputId} className="sr-only">
                        {t.reports.sellers}: {row.nombre}
                      </Label>
                      <Input
                        id={inputId}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={inputValue}
                        aria-invalid={
                          inputValue !== '' && Number(inputValue) < 1
                        }
                        className="h-8 w-16 bg-[color:var(--input-bg)] px-2 text-center font-semibold tabular-nums shadow-none"
                        onChange={(event) =>
                          setSellerCount(row.id, event.target.value)
                        }
                      />
                    </div>
                  )
                }}
                totalValue={goalTotals.sellerCount}
              />
              <GoalFooterRow
                label={t.reports.perSellerPerDay}
                rows={goalRows}
                renderBranchValue={(row) =>
                  renderOptionalAmount(row.perSellerDaily)
                }
                totalValue={renderOptionalAmount(goalTotals.perSellerDaily)}
                emphasized
              />
            </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
