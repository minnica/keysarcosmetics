'use client'
// Reporte: ventas por vendedor, distribuidas en columnas dinámicas por sucursal.
import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateRangePicker,
  Input,
  Label,
  type DateRange,
  ProgressKeysar,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@cosmetics/ui'
import { ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useSucursales } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { cn, formatCurrency, todayISO } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function firstDayOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

type SourceRow = {
  empleadoId: string
  nombreCompleto: string
  sucursalId: string
  sucursalNombre: string
  totalVendido: number
  meta: number
  porLlegar: number
  porcentaje: number
}

type ReportRow = {
  empleadoId: string
  nombreCompleto: string
  ventasPorSucursal: Record<string, number>
  totalVendido: number
  meta: number
  porLlegar: number
  porcentaje: number
}

export default function VentasPorVendedorPage() {
  const { t } = useI18n()
  const { sucursales: catalogoSucursales, loading: loadingSucursales, error: sucursalesError } = useSucursales()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [filas, setFilas] = useState<SourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileSearch, setMobileSearch] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<{ success: boolean; data: SourceRow[] }>('/api/envelope/reportes/ventas-por-vendedor', {
          params: { fechaInicio: range.from, fechaFin: range.to },
        })
        if (!cancelled) setFilas(data.data)
      } catch {
        if (!cancelled) setError('Error al cargar reporte')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReport()
    return () => { cancelled = true }
  }, [range.from, range.to])

  const sucursales = useMemo(() => {
    const branchById = new Map<string, string>()
    catalogoSucursales.forEach(({ id, nombre }) => branchById.set(id, nombre))
    filas.forEach(({ sucursalId, sucursalNombre }) => {
      if (!branchById.has(sucursalId)) branchById.set(sucursalId, sucursalNombre)
    })
    return Array.from(branchById, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [catalogoSucursales, filas])

  const reportRows = useMemo<ReportRow[]>(() => {
    const rowsByEmployee = new Map<string, ReportRow>()

    filas.forEach(({ empleadoId, nombreCompleto, sucursalId, totalVendido, meta }) => {
      const current = rowsByEmployee.get(empleadoId) ?? {
        empleadoId,
        nombreCompleto,
        ventasPorSucursal: {},
        totalVendido: 0,
        meta,
        porLlegar: 0,
        porcentaje: 0,
      }
      current.ventasPorSucursal[sucursalId] = (current.ventasPorSucursal[sucursalId] ?? 0) + totalVendido
      current.totalVendido += totalVendido
      rowsByEmployee.set(empleadoId, current)
    })

    return Array.from(rowsByEmployee.values())
      .map((row) => ({
        ...row,
        porLlegar: Math.max(0, row.meta - row.totalVendido),
        porcentaje: row.meta > 0 ? (row.totalVendido / row.meta) * 100 : 0,
      }))
      .sort((a, b) => b.totalVendido - a.totalVendido)
  }, [filas])

  const totals = useMemo(() => {
    const ventasPorSucursal: Record<string, number> = {}
    let totalVendido = 0
    let meta = 0
    let porLlegar = 0

    reportRows.forEach((row) => {
      totalVendido += row.totalVendido
      meta += row.meta
      porLlegar += row.porLlegar
      sucursales.forEach(({ id }) => {
        ventasPorSucursal[id] = (ventasPorSucursal[id] ?? 0) + (row.ventasPorSucursal[id] ?? 0)
      })
    })

    return {
      ventasPorSucursal,
      totalVendido,
      meta,
      porLlegar,
      porcentaje: meta > 0 ? (totalVendido / meta) * 100 : 0,
    }
  }, [reportRows, sucursales])

  const exportColumns = useMemo<ExportColumn<ReportRow>[]>(() => [
    { header: t.common.employee, accessor: (row) => row.nombreCompleto, width: 26 },
    ...sucursales.map(({ id, nombre }) => ({
      header: nombre,
      accessor: (row: ReportRow) => row.ventasPorSucursal[id] ?? 0,
      format: 'currency' as const,
      width: 16,
    })),
    { header: t.reports.totalSold, accessor: (row) => row.totalVendido, format: 'currency', width: 16 },
    { header: t.reports.monthlyGoal, accessor: (row) => row.meta, format: 'currency', width: 16 },
    { header: t.reports.remaining, accessor: (row) => row.porLlegar, format: 'currency', width: 16 },
    { header: t.reports.progress, accessor: (row) => row.porcentaje, format: 'percent', width: 12 },
  ], [sucursales, t])

  const exportFooterRow = useMemo<ReportRow>(() => ({
    empleadoId: 'total',
    nombreCompleto: 'TOTAL',
    ...totals,
  }), [totals])

  const isLoading = loading || loadingSucursales
  const reportError = error ?? sucursalesError
  const mobileRows = reportRows.filter((row) =>
    row.nombreCompleto.toLowerCase().includes(mobileSearch.trim().toLowerCase()),
  )
  const selectedRow = selectedEmployeeId
    ? reportRows.find((row) => row.empleadoId === selectedEmployeeId) ?? null
    : null

  async function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    const config = {
      title: t.reports.salesBySellerTitle,
      subtitle: `${t.common.period} ${range.from} - ${range.to}`,
      filename: `ventas-por-vendedor-${range.from}-${range.to}`,
      sheetName: 'Ventas Por Vendedor',
      orientation: 'landscape' as const,
      columns: exportColumns,
      rows: reportRows,
      footerRow: exportFooterRow,
    }

    try {
      if (kind === 'pdf') await exportReportToPdf(config)
      else await exportReportToExcel(config)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title uppercase">{t.reports.salesBySellerTitle}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{t.reports.salesBySellerDescription}</p>
        </div>
        <ReportExportButtons
          disabled={isLoading || !!reportError || reportRows.length === 0}
          exporting={exporting}
          onExportPdf={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
          pdfLabel={t.common.exportPdf}
          excelLabel={t.common.exportExcel}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t.common.period}</span>
        <DateRangePicker value={range} onChange={setRange} fromLabel={t.common.from} toLabel={t.common.to} />
      </div>

      {reportError && <p className="text-sm text-red-500">{reportError}</p>}

      {isLoading ? <TableLoadingSkeleton columns={6} rows={6} label={t.common.loadingData} /> : (
        <>
          <div className="space-y-3 md:hidden">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.12em]">BUSCAR EMPLEADO</Label>
              <Input
                value={mobileSearch}
                onChange={(event) => setMobileSearch(event.target.value)}
                placeholder="Escribe el nombre del vendedor"
                className="h-11 border-[color:var(--border-color)] bg-[var(--bg-card)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">VENDEDORES</div>
                  <CardTitle className="number-display text-xl">{reportRows.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL VENDIDO</div>
                  <CardTitle className="number-display text-base">{formatCurrency(totals.totalVendido)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-3">
              {mobileRows.map((row) => {
                const progressColor = row.porcentaje < 50 ? 'text-red-600' : row.porcentaje < 80 ? 'text-yellow-600' : 'text-green-600'
                return (
                  <Card key={row.empleadoId} className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeId(row.empleadoId)}
                      className="block w-full cursor-pointer text-left transition-colors duration-200 hover:bg-[color:var(--bg-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)]"
                    >
                      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-3">
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="truncate text-base leading-snug">{row.nombreCompleto}</CardTitle>
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL VENDIDO</div>
                          <div className="number-display text-lg">{formatCurrency(row.totalVendido)}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={cn('text-sm font-semibold tabular-nums', progressColor)}>{row.porcentaje.toFixed(0)}%</span>
                          <ChevronRight className="mt-0.5 h-4 w-4 text-[color:var(--text-muted)]" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        <div className="flex items-center gap-2">
                          <ProgressKeysar value={row.porcentaje} className="flex-1" />
                          <span className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">AVANCE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">META</div>
                            <div className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(row.meta)}</div>
                          </div>
                          <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">POR LLEGAR</div>
                            <div className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(row.porLlegar)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </button>
                  </Card>
                )
              })}
            </div>

            {reportRows.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {t.common.noDataSelectedPeriod}
              </p>
            ) : mobileRows.length === 0 && (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No hay empleados que coincidan con la búsqueda.
              </p>
            )}

            <Sheet open={!!selectedRow} onOpenChange={(open) => { if (!open) setSelectedEmployeeId(null) }}>
              <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] rounded-none border-none bg-[var(--bg-card)] p-0">
                {selectedRow && (
                  <div className="flex h-full flex-col">
                    <SheetHeader className="border-b border-[color:var(--border-color)] px-5 pb-4 pt-6 text-left">
                      <SheetTitle className="text-left text-xl">{selectedRow.nombreCompleto}</SheetTitle>
                      <SheetDescription className="text-left">DETALLE DE VENTAS POR SUCURSAL</SheetDescription>
                    </SheetHeader>
                    <div className="grid grid-cols-2 gap-3 px-5 py-4">
                      <div className="rounded-2xl bg-[color:var(--bg-primary)] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL VENDIDO</div>
                        <div className="mt-2 number-display text-lg">{formatCurrency(selectedRow.totalVendido)}</div>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--bg-primary)] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">META MENSUAL</div>
                        <div className="mt-2 number-display text-lg">{formatCurrency(selectedRow.meta)}</div>
                      </div>
                    </div>
                    <div className="space-y-2 px-5 pb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="uppercase tracking-[0.12em] text-[color:var(--text-muted)]">AVANCE</span>
                        <span className="font-semibold tabular-nums">{selectedRow.porcentaje.toFixed(0)}%</span>
                      </div>
                      <ProgressKeysar value={selectedRow.porcentaje} />
                      <div className="text-right text-xs text-[color:var(--text-muted)]">POR LLEGAR: {formatCurrency(selectedRow.porLlegar)}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto border-t border-[color:var(--border-color)] px-5 py-4">
                      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">VENTAS POR SUCURSAL</h2>
                      <div className="space-y-2">
                        {sucursales.map(({ id, nombre }) => {
                          const amount = selectedRow.ventasPorSucursal[id] ?? 0
                          return (
                            <div key={id} className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] px-4 py-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{nombre}</div>
                                <div className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">{amount > 0 ? 'CON VENTA' : 'SIN VENTAS'}</div>
                              </div>
                              <div className={cn('shrink-0 text-sm font-semibold tabular-nums', amount === 0 && 'text-[color:var(--text-muted)]')}>{formatCurrency(amount)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>

        <div className="hidden max-h-[calc(100vh-22rem)] overflow-auto rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-sm md:block">
          <table className="min-w-max w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-56 whitespace-nowrap border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-3 py-3 text-left text-xs font-medium uppercase text-[color:var(--table-header-text)] shadow-[1px_0_0_var(--border-color)]">
                  {t.common.employee}
                </th>
                {sucursales.map(({ id, nombre }) => (
                  <th key={id} className="sticky top-0 z-20 min-w-36 whitespace-nowrap border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-3 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)]">
                    {nombre}
                  </th>
                ))}
                <th className="sticky top-0 z-20 min-w-36 whitespace-nowrap border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-3 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)]">{t.reports.totalSold}</th>
                <th className="sticky top-0 z-20 min-w-36 whitespace-nowrap border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-3 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)]">{t.reports.monthlyGoal}</th>
                <th className="sticky top-0 z-20 min-w-36 whitespace-nowrap border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-3 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)]">{t.reports.remaining}</th>
                <th className="sticky top-0 z-20 min-w-52 whitespace-nowrap border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-3 py-3 text-left text-xs font-medium uppercase text-[color:var(--table-header-text)]">{t.reports.progress}</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row, rowIndex) => {
                const colorText = row.porcentaje < 50 ? 'text-red-600' : row.porcentaje < 80 ? 'text-yellow-600' : 'text-green-600'
                const rowBackground = rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'var(--bg-card)'
                return (
                  <tr key={row.empleadoId} className="border-b border-[color:var(--border-color)]" style={{ backgroundColor: rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'transparent' }}>
                    <td className="sticky left-0 z-10 whitespace-nowrap px-3 py-3 font-medium shadow-[1px_0_0_var(--border-color)]" style={{ backgroundColor: rowBackground }}>{row.nombreCompleto}</td>
                    {sucursales.map(({ id }) => <td key={id} className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatCurrency(row.ventasPorSucursal[id] ?? 0)}</td>)}
                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{formatCurrency(row.totalVendido)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatCurrency(row.meta)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatCurrency(row.porLlegar)}</td>
                    <td className="min-w-52 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressKeysar value={row.porcentaje} className="flex-1" />
                        <span className={cn('w-10 text-right text-xs font-semibold tabular-nums', colorText)}>{row.porcentaje.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {reportRows.length > 0 && (
              <tfoot className="border-t border-[color:var(--border-color)] bg-[color:var(--bg-card)] font-medium">
                <tr>
                  <td className="sticky bottom-0 left-0 z-30 whitespace-nowrap bg-[color:var(--bg-card)] px-3 py-3 text-xs font-semibold uppercase shadow-[1px_0_0_var(--border-color)]">TOTAL</td>
                  {sucursales.map(({ id }) => <td key={id} className="sticky bottom-0 z-20 whitespace-nowrap bg-[color:var(--bg-card)] px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(totals.ventasPorSucursal[id] ?? 0)}</td>)}
                  <td className="sticky bottom-0 z-20 whitespace-nowrap bg-[color:var(--bg-card)] px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(totals.totalVendido)}</td>
                  <td className="sticky bottom-0 z-20 whitespace-nowrap bg-[color:var(--bg-card)] px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(totals.meta)}</td>
                  <td className="sticky bottom-0 z-20 whitespace-nowrap bg-[color:var(--bg-card)] px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(totals.porLlegar)}</td>
                  <td className="sticky bottom-0 z-20 whitespace-nowrap bg-[color:var(--bg-card)] px-3 py-3 text-right font-semibold tabular-nums">{totals.porcentaje.toFixed(0)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
          {!reportError && reportRows.length === 0 && <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.noDataSelectedPeriod}</p>}
        </div>
        </>
      )}
    </div>
  )
}
