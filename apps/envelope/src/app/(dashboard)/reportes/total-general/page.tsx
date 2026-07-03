'use client'
// Reporte: Total general de ventas por día con columna por sucursal
import { useState } from 'react'
import { DateRangePicker, type DateRange, Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from "@cosmetics/ui"
import { useReportes } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function TotalGeneralPage() {
  const { registros, sucursales, loading, error } = useReportes()
  const { locale, t } = useI18n()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  const filtered = registros.filter(r => r.fecha >= range.from && r.fecha <= range.to)
  const dias = [...new Set(filtered.map(r => r.fecha))].sort()

  function totalDiaSucursal(fecha: string, sucursalId: string): number {
    return filtered
      .filter(r => r.fecha === fecha && r.sucursalId === sucursalId)
      .flatMap(r => r.items)
      .reduce((s, i) => s + i.cantidad, 0)
  }

  function totalDia(fecha: string): number {
    return sucursales.reduce((s, suc) => s + totalDiaSucursal(fecha, suc.id), 0)
  }

  function totalSucursalGeneral(sucursalId: string): number {
    return dias.reduce((s, d) => s + totalDiaSucursal(d, sucursalId), 0)
  }

  const granTotal = dias.reduce((s, d) => s + totalDia(d), 0)
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

  function handleExport(kind: 'pdf' | 'excel') {
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

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.loadingData}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && dias.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.noSalesSelectedPeriod}</p>
      ) : (
        <div className="overflow-x-auto">
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
                      {val > 0 ? formatCurrency(val) : <span style={{ color: 'var(--border-color)' }}>—</span>}
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
                  {formatCurrency(totalSucursalGeneral(s.id))}
                </TableCell>
              ))}
              <TableCell className="text-right font-bold text-base">{formatCurrency(granTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      )}
    </div>
  )
}
