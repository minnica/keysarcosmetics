'use client'
// Reporte: Avance de vendedores vs meta mensual con barra de progreso coloreada
import { useState } from 'react'
import {
  DateRangePicker,
  type DateRange,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ProgressKeysar,
} from "@cosmetics/ui"
import { useReportes } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function VentasPorVendedorPage() {
  const { registros, empleados, sucursales, loading, error } = useReportes()
  const { t } = useI18n()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  const filtered = registros.filter(r => r.fecha >= range.from && r.fecha <= range.to)

  const sucursalNombre = (id: string) => sucursales.find(s => s.id === id)?.nombre ?? id

  interface Fila {
    emp: typeof empleados[number]
    sucursalId: string
    totalVendido: number
    porLlegar: number
    porcentaje: number
  }

  const filasMap = new Map<string, Fila>()

  for (const reg of filtered) {
    const emp = empleados.find(e => e.id === reg.vendedorId)
    if (!emp) continue
    const key = `${emp.id}__${reg.sucursalId}`
    const totalItems = reg.items.reduce((s, i) => s + i.cantidad, 0)
    const existing = filasMap.get(key)
    if (existing) {
      existing.totalVendido += totalItems
      existing.porLlegar = Math.max(0, emp.metaIndividual - existing.totalVendido)
      existing.porcentaje = emp.metaIndividual > 0 ? (existing.totalVendido / emp.metaIndividual) * 100 : 0
    } else {
      filasMap.set(key, {
        emp,
        sucursalId: reg.sucursalId,
        totalVendido: totalItems,
        porLlegar: Math.max(0, emp.metaIndividual - totalItems),
        porcentaje: emp.metaIndividual > 0 ? (totalItems / emp.metaIndividual) * 100 : 0,
      })
    }
  }

  const filas = [...filasMap.values()].sort((a, b) => b.totalVendido - a.totalVendido)
  type ExportRow = {
    empleado: string
    sucursal: string
    totalVendido: number
    metaMensual: number
    porLlegar: number
    porcentaje: number
  }

  const exportRows: ExportRow[] = filas.map(({ emp, sucursalId, totalVendido, porLlegar, porcentaje }) => ({
    empleado: emp.nombreCompleto,
    sucursal: sucursalNombre(sucursalId),
    totalVendido,
    metaMensual: emp.metaIndividual,
    porLlegar,
    porcentaje,
  }))

  const exportColumns: ExportColumn<ExportRow>[] = [
    { header: t.common.employee, accessor: (row) => row.empleado, width: 24 },
    { header: t.common.branch, accessor: (row) => row.sucursal, width: 22 },
    { header: t.reports.totalSold, accessor: (row) => row.totalVendido, format: 'currency', width: 14 },
    { header: t.reports.monthlyGoal, accessor: (row) => row.metaMensual, format: 'currency', width: 14 },
    { header: t.reports.remaining, accessor: (row) => row.porLlegar, format: 'currency', width: 14 },
    { header: t.reports.progress, accessor: (row) => row.porcentaje, format: 'percent', width: 12 },
  ]

  function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    const config = {
      title: t.reports.salesBySellerTitle,
      subtitle: `${t.common.period} ${range.from} - ${range.to}`,
      filename: `ventas-por-vendedor-${range.from}-${range.to}`,
      sheetName: 'Ventas Por Vendedor',
      orientation: 'landscape' as const,
      columns: exportColumns,
      rows: exportRows,
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
        <h1 className="page-title font-semibold uppercase">{t.reports.salesBySellerTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t.reports.salesBySellerDescription}</p>
        </div>
        <ReportExportButtons
          disabled={loading || !!error || filas.length === 0}
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

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="uppercase">{t.common.employee}</TableHead>
            <TableHead className="uppercase">{t.common.branch}</TableHead>
            <TableHead className="text-right uppercase">{t.reports.totalSold}</TableHead>
            <TableHead className="text-right uppercase">{t.reports.monthlyGoal}</TableHead>
            <TableHead className="text-right uppercase">{t.reports.remaining}</TableHead>
            <TableHead className="uppercase">{t.reports.progress}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ emp, sucursalId, totalVendido, porLlegar, porcentaje }) => {
            const colorText = porcentaje < 50 ? 'text-red-600' : porcentaje < 80 ? 'text-yellow-600' : 'text-green-600'
            return (
              <TableRow key={`${emp.id}__${sucursalId}`}>
                <TableCell className="font-medium">{emp.nombreCompleto}</TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--text-muted)' }}>{sucursalNombre(sucursalId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalVendido)}</TableCell>
                <TableCell className="text-right" style={{ color: 'var(--text-muted)' }}>{formatCurrency(emp.metaIndividual)}</TableCell>
                <TableCell className="text-right" style={{ color: 'var(--text-muted)' }}>{formatCurrency(porLlegar)}</TableCell>
                <TableCell className="min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <ProgressKeysar value={porcentaje} className="flex-1" />
                    <span className={cn('text-xs font-semibold w-10 text-right', colorText)}>
                      {porcentaje.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
