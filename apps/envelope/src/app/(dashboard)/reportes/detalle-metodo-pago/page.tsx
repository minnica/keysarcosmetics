'use client'
// Reporte: Detalle de ventas por método de pago, agrupado por sucursal
import { useState } from 'react'
import { DateRangePicker, type DateRange, Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from "@cosmetics/ui"
import { useReportes } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, todayISO } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function DetalleMetodoPagoPage() {
  const { registros, sucursales, metodosPago, loading, error } = useReportes()
  const { t } = useI18n()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  const filtered = registros.filter(r => r.fecha >= range.from && r.fecha <= range.to)

  type Row = { sucursalId: string; metodoPagoId: string; total: number }
  const rows: Row[] = []
  for (const reg of filtered) {
    for (const item of reg.items) {
      const existing = rows.find(r => r.sucursalId === reg.sucursalId && r.metodoPagoId === item.metodoPagoId)
      if (existing) existing.total += item.cantidad
      else rows.push({ sucursalId: reg.sucursalId, metodoPagoId: item.metodoPagoId, total: item.cantidad })
    }
  }

  const sucursalNombre = (id: string) => sucursales.find(s => s.id === id)?.nombre ?? id
  const metodoPagoNombre = (id: string) => metodosPago.find(m => m.id === id)?.nombre ?? id
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

  function handleExport(kind: 'pdf' | 'excel') {
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
        exportReportToPdf(config)
      } else {
        exportReportToExcel(config)
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
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.loadingData}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && sucursalesConDatos.length === 0 ? (
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
