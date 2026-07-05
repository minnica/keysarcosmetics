'use client'
// Reporte: Detalle de ventas por método de pago, agrupado por sucursal
import { useState } from 'react'
import { useEffect } from 'react'
import { DateRangePicker, type DateRange, Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from "@cosmetics/ui"
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, todayISO } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function DetalleMetodoPagoPage() {
  const { t } = useI18n()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  type Row = { sucursalId: string; sucursalNombre: string; metodoPagoId: string; metodoPagoNombre: string; total: number }
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<{ success: boolean; data: Row[] }>('/api/envelope/reportes/detalle-metodo-pago', {
          params: { fechaInicio: range.from, fechaFin: range.to },
        })
        if (!cancelled) setRows(data.data)
      } catch {
        if (!cancelled) setError('Error al cargar reporte')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [range.from, range.to])

  const sucursalNombre = (id: string) => rows.find(s => s.sucursalId === id)?.sucursalNombre ?? id
  const metodoPagoNombre = (id: string) => rows.find(m => m.metodoPagoId === id)?.metodoPagoNombre ?? id
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const sucursalesConDatos = [...new Set(rows.map(r => r.sucursalId))]
  type ExportRow = {
    sucursal: string
    metodo: string
    total: number
  }

  const exportRows: ExportRow[] = []

  for (const sId of sucursalesConDatos) {
    const sucursalRows = rows.filter((r) => r.sucursalId === sId)
    const subtotal = sucursalRows.reduce((s, r) => s + r.total, 0)

    for (const row of sucursalRows) {
      exportRows.push({
        sucursal: sucursalNombre(sId),
        metodo: metodoPagoNombre(row.metodoPagoId),
        total: row.total,
      })
    }

    exportRows.push({
      sucursal: sucursalNombre(sId),
      metodo: `Subtotal ${sucursalNombre(sId)}`,
      total: subtotal,
    })
  }

  const exportColumns: ExportColumn<ExportRow>[] = [
    { header: t.common.branch, accessor: (row) => row.sucursal, width: 22 },
    { header: t.common.paymentMethod, accessor: (row) => row.metodo, width: 24 },
    { header: t.common.total, accessor: (row) => row.total, format: 'currency', width: 14 },
  ]

  async function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    const config = {
      title: t.reports.paymentMethodDetailTitle,
      subtitle: `${t.common.period} ${range.from} - ${range.to}`,
      filename: `detalle-metodo-pago-${range.from}-${range.to}`,
      sheetName: 'Detalle Metodo Pago',
      orientation: 'landscape' as const,
      columns: exportColumns,
      rows: exportRows,
      footerRow: {
        sucursal: t.common.grandTotal,
        metodo: '',
        total: grandTotal,
      },
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
        <h1 className="page-title font-semibold uppercase">{t.reports.paymentMethodDetailTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t.reports.paymentMethodDetailDescription}</p>
        </div>
        <ReportExportButtons
          disabled={loading || !!error || sucursalesConDatos.length === 0}
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
        <TableLoadingSkeleton columns={3} rows={6} label={t.common.loadingData} />
      ) : sucursalesConDatos.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.noDataSelectedPeriod}</p>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="uppercase">{t.common.branch}</TableHead>
              <TableHead className="uppercase">{t.common.paymentMethod}</TableHead>
              <TableHead className="text-right uppercase">{t.common.total}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sucursalesConDatos.map(sId => {
              const sucursalRows = rows.filter(r => r.sucursalId === sId)
              const subtotal = sucursalRows.reduce((s, r) => s + r.total, 0)
              return (
                <>
                  {sucursalRows.map((row, idx) => (
                    <TableRow key={`${row.sucursalId}-${row.metodoPagoId}`}>
                      <TableCell>{idx === 0 ? sucursalNombre(sId) : ''}</TableCell>
                      <TableCell>{metodoPagoNombre(row.metodoPagoId)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow key={`subtotal-${sId}`} className="font-medium" style={{ backgroundColor: 'var(--table-row-alt)' }}>
                    <TableCell>{sucursalNombre(sId)}</TableCell>
                    <TableCell colSpan={1} className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="uppercase">Subtotal</span> {sucursalNombre(sId)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                  </TableRow>
                </>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-right uppercase text-xs">{t.common.grandTotal}</TableCell>
              <TableCell className="text-right text-base font-bold">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      )}
    </div>
  )
}
