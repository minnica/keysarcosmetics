'use client'
// Reporte: Total general de ventas por día con columna por sucursal
import { useMemo, useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateRangePicker,
  type DateRange,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@cosmetics/ui"
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { useSucursales } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function TotalGeneralPage() {
  const { sucursales: catalogoSucursales, loading: loadingSucursales, error: sucursalesError } = useSucursales()
  const { locale, t } = useI18n()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [rows, setRows] = useState<Array<{ fecha: string; porSucursal: Array<{ sucursalId: string; sucursalNombre: string; total: number }>; totalDia: number }>>([])
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setLoadingReport(true)
      setReportError(null)
      try {
        const { data } = await api.get<{ success: boolean; data: typeof rows }>('/api/envelope/reportes/total-general', {
          params: { fechaInicio: range.from, fechaFin: range.to },
        })
        if (!cancelled) setRows(data.data)
      } catch {
        if (!cancelled) setReportError('Error al cargar reporte')
      } finally {
        if (!cancelled) setLoadingReport(false)
      }
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [range.from, range.to])

  const loading = loadingSucursales || loadingReport
  const error = sucursalesError ?? reportError
  const dias = rows.map((row) => row.fecha)
  const sucursales = useMemo(() => {
    const branchById = new Map(catalogoSucursales.map(({ id, nombre }) => [id, nombre]))
    rows.forEach((row) => {
      row.porSucursal.forEach(({ sucursalId, sucursalNombre }) => {
        if (!branchById.has(sucursalId)) branchById.set(sucursalId, sucursalNombre)
      })
    })
    return Array.from(branchById, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [catalogoSucursales, rows])

  function totalDiaSucursal(fecha: string, sucursalId: string): number {
    return rows.find((row) => row.fecha === fecha)?.porSucursal.find((s) => s.sucursalId === sucursalId)?.total ?? 0
  }

  function totalDia(fecha: string): number {
    return rows.find((row) => row.fecha === fecha)?.totalDia ?? 0
  }

  function totalSucursalGeneral(sucursalId: string): number {
    return dias.reduce((s, d) => s + totalDiaSucursal(d, sucursalId), 0)
  }

  const granTotal = dias.reduce((s, d) => s + totalDia(d), 0)
  const zeroBadgeClassName = 'rounded-full bg-[#b85f5a] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#b85f5a] tabular-nums'

  function renderAmount(value: number) {
    if (value === 0) {
      return (
        <Badge variant="destructive" className={zeroBadgeClassName}>
          {formatCurrency(value)}
        </Badge>
      )
    }

    return formatCurrency(value)
  }

  type ExportRow = {
    fecha: string
    bySucursal: Record<string, number>
    total: number
  }

  const exportRows: ExportRow[] = dias.map((dia) => ({
    fecha: dia,
    bySucursal: Object.fromEntries(
      sucursales.map((s) => [s.id, totalDiaSucursal(dia, s.id)]),
    ),
    total: totalDia(dia),
  }))

  const footerRow: ExportRow = {
    fecha: t.reports.branchTotal,
    bySucursal: Object.fromEntries(
      sucursales.map((s) => [s.id, totalSucursalGeneral(s.id)]),
    ),
    total: granTotal,
  }

  const exportColumns: ExportColumn<ExportRow>[] = [
    {
      header: t.common.date,
      accessor: (row) => formatDate(row.fecha, 'dd/MM/yyyy', locale),
      width: 16,
    },
    ...sucursales.map((s) => ({
      header: s.nombre,
      accessor: (row: ExportRow) => row.bySucursal[s.id] ?? 0,
      format: 'currency' as const,
      width: 14,
    })),
    {
      header: t.reports.dayTotal,
      accessor: (row) => row.total,
      format: 'currency',
      width: 14,
    },
  ]

  async function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    const config = {
      title: t.reports.totalGeneralTitle,
      subtitle: `${t.common.period} ${range.from} - ${range.to}`,
      filename: `total-general-${range.from}-${range.to}`,
      sheetName: 'Total General',
      orientation: 'landscape' as const,
      columns: exportColumns,
      rows: exportRows,
      footerRow,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <h1 className="page-title font-semibold uppercase">{t.reports.totalGeneralTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t.reports.totalGeneralDescription}</p>
        </div>
        <ReportExportButtons
          disabled={loading || !!error || dias.length === 0}
          exporting={exporting}
          onExportPdf={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
          pdfLabel={t.common.exportPdf}
          excelLabel={t.common.exportExcel}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t.common.period}</span>
        <DateRangePicker value={range} onChange={setRange} fromLabel={t.common.from} toLabel={t.common.to} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <TableLoadingSkeleton columns={Math.max(3, sucursales.length + 2)} rows={6} label={t.common.loadingData} />
      ) : dias.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.noSalesSelectedPeriod}</p>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL DEL PERÍODO</div>
              <CardTitle className="mt-1 number-display text-xl">{formatCurrency(granTotal)}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {dias.length} {dias.length === 1 ? 'DÍA CON VENTAS' : 'DÍAS CON VENTAS'}
            </CardContent>
          </Card>

          <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
            <CardHeader className="flex-row items-start justify-between gap-4 p-4 pb-3">
              <div>
                <CardTitle className="text-base">{t.reports.branchTotal}</CardTitle>
                <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL ACUMULADO DEL PERÍODO</div>
              </div>
              <div className="number-display shrink-0 text-base">{formatCurrency(granTotal)}</div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {sucursales.map((sucursal) => (
                <div key={sucursal.id} className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                  <span className="min-w-0 truncate text-sm font-medium">{sucursal.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{renderAmount(totalSucursalGeneral(sucursal.id))}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {dias.map((dia) => {
              return (
                <Card key={dia} className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                  <CardHeader className="flex-row items-start justify-between gap-4 p-4 pb-3">
                    <div>
                      <CardTitle className="text-base capitalize">{formatDate(dia, 'EEEE dd', locale)}</CardTitle>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">VENTAS DEL DÍA</div>
                    </div>
                    <div className="number-display shrink-0 text-base">{formatCurrency(totalDia(dia))}</div>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4">
                    {sucursales.map((sucursal) => {
                      const total = totalDiaSucursal(dia, sucursal.id)

                      return (
                        <div key={sucursal.id} className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                          <span className="min-w-0 truncate text-sm font-medium">{sucursal.nombre}</span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{renderAmount(total)}</span>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>

        </div>

        <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="uppercase">{t.common.date}</TableHead>
              {sucursales.map(s => <TableHead key={s.id} className="text-right">{s.nombre}</TableHead>)}
              <TableHead className="text-right uppercase">{t.reports.dayTotal}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dias.map(dia => (
              <TableRow key={dia}>
                <TableCell>{formatDate(dia, 'dd/MM/yyyy', locale)}</TableCell>
                {sucursales.map(s => {
                  const val = totalDiaSucursal(dia, s.id)
                  return (
                    <TableCell key={s.id} className="text-right">
                      {renderAmount(val)}
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-medium">{formatCurrency(totalDia(dia))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold text-xs uppercase">{t.reports.branchTotal}</TableCell>
              {sucursales.map(s => (
                <TableCell key={s.id} className="text-right font-semibold">
                  {renderAmount(totalSucursalGeneral(s.id))}
                </TableCell>
              ))}
              <TableCell className="text-right font-bold text-base">{formatCurrency(granTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
        </>
      )}
    </div>
  )
}
