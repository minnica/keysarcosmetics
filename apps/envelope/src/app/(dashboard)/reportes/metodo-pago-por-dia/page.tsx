'use client'
// Reporte: Ventas por método de pago desglosadas por día, columna por sucursal
import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@cosmetics/ui"

import { api } from '@/lib/api'
import { useMetodosPago, useSucursales } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

export default function MetodoPagoPorDiaPage() {
  const { sucursales: catalogoSucursales, loading: loadingSucursales, error: sucursalesError } = useSucursales()
  const { metodosPago, loading: loadingMetodos, error: metodosError } = useMetodosPago()
  const { locale, t } = useI18n()

  const now = new Date()
  const [metodoPagoId, setMetodoPagoId] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  type ReportRow = { fecha: string; sucursalId: string; sucursalNombre: string; total: number }
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState<string | null>(null)

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = t.reports.months

  // Usa el primer método disponible si no se ha seleccionado
  const efectivoId = metodoPagoId || (metodosPago[0]?.id ?? '')

  useEffect(() => {
    if (!efectivoId) {
      setRows([])
      setLoadingReport(false)
      return
    }

    let cancelled = false

    async function loadReport() {
      setLoadingReport(true)
      setReportError(null)
      try {
        const { data } = await api.get<{ success: boolean; data: ReportRow[] }>('/api/envelope/reportes/metodo-pago-por-dia', {
          params: { metodoPagoId: efectivoId, mes: month, anio: year },
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
  }, [efectivoId, month, year])

  const loading = loadingSucursales || loadingMetodos || loadingReport
  const error = sucursalesError ?? metodosError ?? reportError
  const dias = [...new Set(rows.map(r => r.fecha))].sort()
  const sucursales = useMemo(() => {
    const branchById = new Map(catalogoSucursales.map(({ id, nombre }) => [id, nombre]))
    rows.forEach(({ sucursalId, sucursalNombre }) => {
      if (!branchById.has(sucursalId)) branchById.set(sucursalId, sucursalNombre)
    })
    return Array.from(branchById, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [catalogoSucursales, rows])

  function totalDiaSucursal(fecha: string, sucursalId: string): number {
    return rows.find(r => r.fecha === fecha && r.sucursalId === sucursalId)?.total ?? 0
  }

  function totalDia(fecha: string): number {
    return sucursales.reduce((s, suc) => s + totalDiaSucursal(fecha, suc.id), 0)
  }

  function totalSucursal(sucursalId: string): number {
    return dias.reduce((s, d) => s + totalDiaSucursal(d, sucursalId), 0)
  }

  const grandTotal = dias.reduce((s, d) => s + totalDia(d), 0)
  const selectedMethodName = metodosPago.find((m) => m.id === efectivoId)?.nombre ?? efectivoId
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
    fecha: t.common.grandTotal,
    bySucursal: Object.fromEntries(
      sucursales.map((s) => [s.id, totalSucursal(s.id)]),
    ),
    total: grandTotal,
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
      title: t.reports.paymentMethodByDayTitle,
      subtitle: `${selectedMethodName} - ${t.common.monthlyPeriod} ${month}/${year}`,
      filename: `metodo-pago-por-dia-${year}-${String(month).padStart(2, '0')}-${selectedMethodName}`,
      sheetName: 'Metodo Pago Por Dia',
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
        <h1 className="page-title font-semibold uppercase">{t.reports.paymentMethodByDayTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t.reports.paymentMethodByDayDescription}</p>
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

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>{t.common.paymentMethod}</Label>
          <Select value={efectivoId} onValueChange={setMetodoPagoId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metodosPago.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.reports.month}</Label>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.reports.year}</Label>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <TableLoadingSkeleton columns={Math.max(3, sucursales.length + 2)} rows={6} label={t.common.loadingData} />
      ) : dias.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.reports.noSalesPaymentMethodPeriod}</p>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">MÉTODO SELECCIONADO</div>
              <CardTitle className="mt-1 text-base">{selectedMethodName}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL DEL PERÍODO</div>
              <div className="mt-1 number-display text-xl">{formatCurrency(grandTotal)}</div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {dias.map((dia) => {
              const branchSales = sucursales
                .map((sucursal) => ({ ...sucursal, total: totalDiaSucursal(dia, sucursal.id) }))
                .filter((sucursal) => sucursal.total > 0)

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
                    {branchSales.map((sucursal) => (
                      <div key={sucursal.id} className="flex items-center justify-between gap-4 rounded-xl bg-[color:var(--bg-primary)] px-3 py-2.5">
                        <span className="min-w-0 truncate text-sm font-medium">{sucursal.nombre}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(sucursal.total)}</span>
                      </div>
                    ))}
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
                <TableCell>{formatDate(dia, 'EEEE dd', locale)}</TableCell>
                {sucursales.map(s => (
                  <TableCell key={s.id} className="text-right">
                    {totalDiaSucursal(dia, s.id) > 0 ? formatCurrency(totalDiaSucursal(dia, s.id)) : <span style={{ color: 'var(--border-color)' }}>—</span>}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium">{formatCurrency(totalDia(dia))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold uppercase">{t.common.grandTotal}</TableCell>
              {sucursales.map(s => (
                <TableCell key={s.id} className="text-right font-semibold">{formatCurrency(totalSucursal(s.id))}</TableCell>
              ))}
              <TableCell className="text-right font-bold text-base">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
        </>
      )}
    </div>
  )
}
