'use client'
// Reporte: Ventas mensuales por vendedor
import { useState } from 'react'
import {
  Badge,
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
} from '@cosmetics/ui'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { useReportes } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate, monthName } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function monthDates(year: number, month: number): string[] {
  const totalDays = new Date(year, month, 0).getDate()
  return Array.from({ length: totalDays }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${year}-${String(month).padStart(2, '0')}-${day}`
  })
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }
  return chunks
}

type SalesRow = {
  sellerId: string
  sellerName: string
  total: number
  byDate: Record<string, number>
  daysWithoutSale: number
  approximateDayAmount: number
}

export default function VentasPorVendedorDiaPage() {
  const { registros, empleados, loading, error } = useReportes()
  const { locale, t } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = t.reports.months
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const filtered = registros.filter((r) => r.fecha.startsWith(prefix))
  const daysInMonth = new Date(year, month, 0).getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth
  const dias = monthDates(year, month).slice(0, elapsedDays)

  const rowsMap = new Map<string, SalesRow>()

  for (const reg of filtered) {
    const seller = empleados.find((e) => e.id === reg.vendedorId)
    if (!seller) continue

    const key = seller.id
    const dayTotal = reg.items.reduce((sum, item) => sum + item.cantidad, 0)
    const existing = rowsMap.get(key)

    if (existing) {
      existing.total += dayTotal
      existing.byDate[reg.fecha] = (existing.byDate[reg.fecha] ?? 0) + dayTotal
    } else {
      rowsMap.set(key, {
        sellerId: seller.id,
        sellerName: seller.nombreCompleto,
        total: dayTotal,
        byDate: { [reg.fecha]: dayTotal },
        daysWithoutSale: 0,
        approximateDayAmount: 0,
      })
    }
  }

  const rows = [...rowsMap.values()]
    .map((row) => {
      const saleDaysCount = Object.keys(row.byDate).length
      const daysWithoutSale = Math.max(0, elapsedDays - saleDaysCount)

      return {
        ...row,
        daysWithoutSale,
        // Estimación proporcional al avance del mes consultado.
        approximateDayAmount: row.total * (elapsedDays / daysInMonth),
      }
    })
    .sort((a, b) =>
      b.total - a.total || a.sellerName.localeCompare(b.sellerName),
    )

  const hasData = rows.length > 0
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

  function totalDia(fecha: string): number {
    return rows.reduce((sum, row) => sum + (row.byDate[fecha] ?? 0), 0)
  }

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const periodLabel = monthName(year, month, locale)
  type ExportRow = {
    empleado: string
    byDate: Record<string, number>
    daysWithoutSale: number
    approximateDayAmount: number
    total: number
  }

  const exportRows: ExportRow[] = rows.map((row) => ({
    empleado: row.sellerName,
    byDate: row.byDate,
    daysWithoutSale: row.daysWithoutSale,
    approximateDayAmount: row.approximateDayAmount,
    total: row.total,
  }))

  const exportColumns: ExportColumn<ExportRow>[] = [
    {
      header: t.common.employee,
      accessor: (row) => row.empleado,
      width: 24,
    },
    ...dias.map((dia) => ({
      header: formatDate(dia, 'dd/MM', locale),
      accessor: (row: ExportRow) => row.byDate[dia] ?? 0,
      format: 'currency' as const,
      width: 11,
    })),
    {
      header: 'DÍAS SIN VENTA',
      accessor: (row) => row.daysWithoutSale,
      format: 'number',
      width: 12,
    },
    {
      header: 'MONTO DÍA APROX',
      accessor: (row) => row.approximateDayAmount,
      format: 'currency',
      width: 14,
    },
    {
      header: t.common.total,
      accessor: (row) => row.total,
      format: 'currency',
      width: 14,
    },
  ]

  const exportFooterRow: ExportRow = {
    empleado: t.common.grandTotal,
    byDate: Object.fromEntries(
      dias.map((dia) => [dia, totalDia(dia)]),
    ),
    daysWithoutSale: 0,
    approximateDayAmount: rows.reduce((sum, row) => sum + row.approximateDayAmount, 0),
    total: grandTotal,
  }

  function exportPdf() {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    })

    const chunks = chunkArray(dias, 10)
    const summaryWidths = [52, 58, 50]
    const pageBottom = doc.internal.pageSize.getHeight() - 28
    let currentY = 70
    const lastAutoTable = () => (doc as any).lastAutoTable?.finalY as number | undefined

    function drawPageHeader() {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(t.reports.salesBySellerDayTitle, 40, 32)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`${t.common.monthlyPeriod} ${periodLabel}`, 40, 42)
    }

    chunks.forEach((dayChunk, index) => {
      const newPage = index % 3 === 0
      if (newPage) {
        if (index > 0) {
          doc.addPage()
        }
        currentY = 70
        drawPageHeader()
      } else {
        currentY = (lastAutoTable() ?? currentY) + 22
      }

      const firstDay = dayChunk[0]!
      const lastDay = dayChunk[dayChunk.length - 1]!
      const subtitle = `${formatDate(firstDay, 'dd/MM/yyyy', locale)} - ${formatDate(lastDay, 'dd/MM/yyyy', locale)}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(subtitle, 40, currentY - 10)
      doc.setFont('helvetica', 'normal')

      const head = [[
        t.common.employee,
        ...dayChunk.map((dia) => formatDate(dia, 'dd/MM', locale)),
        'DÍAS SIN VENTA',
        'MONTO DÍA APROX',
        t.common.total,
      ]]

      const body = rows.map((row) => [
        row.sellerName,
        ...dayChunk.map((dia) => formatCurrency(row.byDate[dia] ?? 0)),
        row.daysWithoutSale === 0 ? '0 DÍAS' : `${row.daysWithoutSale} DÍAS`,
        formatCurrency(row.approximateDayAmount),
        formatCurrency(row.total),
      ])

      const foot = [[
        t.common.grandTotal,
        ...dayChunk.map((dia) => formatCurrency(totalDia(dia))),
        '—',
        formatCurrency(rows.reduce((sum, row) => sum + row.approximateDayAmount, 0)),
        formatCurrency(grandTotal),
      ]]

      autoTable(doc, {
        startY: currentY,
        head,
        body,
        foot,
        theme: 'striped',
        styles: {
          font: 'helvetica',
          fontSize: 6.2,
          cellPadding: 2,
          overflow: 'ellipsize',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [100, 134, 114],
          textColor: 255,
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [236, 240, 238],
          textColor: 20,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 249],
        },
        margin: { top: 48, left: 26, right: 26, bottom: 24 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 140 },
          ...Object.fromEntries(dayChunk.map((_, dayIndex) => [dayIndex + 1, { cellWidth: 34 }])),
          [dayChunk.length + 1]: { cellWidth: summaryWidths[0] },
          [dayChunk.length + 2]: { cellWidth: summaryWidths[1] },
          [dayChunk.length + 3]: { cellWidth: summaryWidths[2] },
        },
      })

      currentY = (lastAutoTable() ?? currentY) + 10
      if (currentY > pageBottom) {
        doc.addPage()
        currentY = 70
        drawPageHeader()
      }
    })

    doc.save(`ventas-vendedor-dia-${year}-${String(month).padStart(2, '0')}.pdf`)
  }

  function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    try {
      if (kind === 'pdf') {
        exportPdf()
      } else {
        exportReportToExcel({
          title: t.reports.salesBySellerDayTitle,
          subtitle: `${t.common.monthlyPeriod} ${periodLabel}`,
          filename: `ventas-vendedor-dia-${year}-${String(month).padStart(2, '0')}`,
          sheetName: 'Ventas Vendedor Dia',
          orientation: 'landscape',
          columns: exportColumns,
          rows: exportRows,
          footerRow: exportFooterRow,
        })
      }
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <h1 className="page-title font-semibold uppercase">{t.reports.salesBySellerDayTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.reports.salesBySellerDayDescription}
        </p>
        </div>
        <ReportExportButtons
          disabled={loading || !!error || !hasData}
          exporting={exporting}
          onExportPdf={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
          pdfLabel={t.common.exportPdf}
          excelLabel={t.common.exportExcel}
        />
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>{t.common.monthlyPeriod}</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((name, i) => (
                <SelectItem key={name} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.reports.year}</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t.common.monthlyPeriod}: {periodLabel}
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.loadingData}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !hasData ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t.reports.noSalesSellerPeriod}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background whitespace-nowrap min-w-56 uppercase">
                  {t.common.employee}
                </TableHead>
                {dias.map((dia) => (
                  <TableHead key={dia} className="text-right whitespace-nowrap uppercase">
                    {formatDate(dia, 'EEEE dd', locale)}
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap uppercase text-center">DÍAS SIN VENTA</TableHead>
                <TableHead className="whitespace-nowrap uppercase text-right">MONTO DÍA APROX</TableHead>
                <TableHead className="text-right whitespace-nowrap uppercase">{t.common.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.sellerId}>
                  <TableCell className="sticky left-0 z-10 bg-background whitespace-nowrap font-medium">
                    {row.sellerName}
                  </TableCell>
                  {dias.map((dia) => (
                    <TableCell key={dia} className="text-right">
                      {renderAmount(row.byDate[dia] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {row.daysWithoutSale === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-[#7d9f8a] px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                        0 DÍAS
                      </span>
                    ) : (
                      <span className="tabular-nums">{row.daysWithoutSale} DÍAS</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderAmount(row.approximateDayAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {renderAmount(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="sticky left-0 z-20 bg-background font-semibold text-xs uppercase">
                  {t.common.grandTotal}
                </TableCell>
                {dias.map((dia) => (
                  <TableCell key={dia} className="text-right font-semibold">
                    {renderAmount(totalDia(dia))}
                  </TableCell>
                ))}
                <TableCell className="text-center font-semibold">
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {renderAmount(rows.reduce((sum, row) => sum + row.approximateDayAmount, 0))}
                </TableCell>
                <TableCell className="text-right font-bold text-base">
                  {renderAmount(grandTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  )
}
