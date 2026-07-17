'use client'
// Reporte: Ventas mensuales por vendedor
import { useEffect, useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@cosmetics/ui'
import { BarChart3, ChevronRight, DollarSign } from 'lucide-react'

import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate, monthName } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { exportReportToExcel, type ExportColumn } from '@/lib/report-export'

function monthDates(year: number, month: number): string[] {
  const totalDays = new Date(year, month, 0).getDate()
  return Array.from({ length: totalDays }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${year}-${String(month).padStart(2, '0')}-${day}`
  })
}

function formatPdfCurrency(value: number, includeCurrencySymbol = true): string {
  const roundedValue = Math.round((value + Number.EPSILON) * 100) / 100
  const cents = Math.abs(Math.round(roundedValue * 100)) % 100

  if (!includeCurrencySymbol) {
    const fractionDigits = roundedValue === 0 ? 2 : cents === 0 ? 0 : 2

    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(roundedValue)
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: cents === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(roundedValue)
}

type SalesRow = {
  sellerId: string
  sellerName: string
  total: number
  byDate: Record<string, number>
  daysWithoutSale: number
  approximateDayAmount: number
}

type ReportRow = {
  fecha: string
  vendedorId: string
  vendedorNombre: string
  total: number
}

export default function VentasPorVendedorDiaPage() {
  const { locale, t } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [mobileSearch, setMobileSearch] = useState('')
  const [reportRows, setReportRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = t.reports.months
  const daysInMonth = new Date(year, month, 0).getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth
  const dias = monthDates(year, month).slice(0, elapsedDays)

  useEffect(() => {
    let cancelled = false
    const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01`
    const fechaFin = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    async function loadReport() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<{ success: boolean; data: ReportRow[] }>('/api/envelope/reportes/ventas-por-vendedor-dia', {
          params: { fechaInicio, fechaFin },
        })
        if (!cancelled) setReportRows(data.data)
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
  }, [daysInMonth, month, year])

  const rowsMap = new Map<string, SalesRow>()

  for (const row of reportRows) {
    const key = row.vendedorId
    const dayTotal = row.total
    const existing = rowsMap.get(key)

    if (existing) {
      existing.total += dayTotal
      existing.byDate[row.fecha] = (existing.byDate[row.fecha] ?? 0) + dayTotal
    } else {
      rowsMap.set(key, {
        sellerId: row.vendedorId,
        sellerName: row.vendedorNombre,
        total: dayTotal,
        byDate: { [row.fecha]: dayTotal },
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
        // Promedio real: total del mes dividido entre los días con venta.
        approximateDayAmount: saleDaysCount > 0 ? row.total / saleDaysCount : 0,
      }
    })
    .sort((a, b) =>
      b.total - a.total || a.sellerName.localeCompare(b.sellerName),
    )

  const hasData = rows.length > 0
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)
  const selectedRow = selectedSellerId ? rows.find((row) => row.sellerId === selectedSellerId) ?? null : null
  const mobileRows = rows.filter((row) =>
    row.sellerName.toLowerCase().includes(mobileSearch.trim().toLowerCase()),
  )

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

  async function exportPdf() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    })

    // Cada tabla corresponde a una quincena. No se apilan varios bloques en
    // una misma página porque eso puede separar una quincena entre dos hojas.
    const periods = [dias.slice(0, 15), dias.slice(15)].filter((period) => period.length > 0)
    const tableMargin = 26
    const employeeWidth = 125
    const summaryWidths = [50, 62, 54]
    const availableTableWidth = doc.internal.pageSize.getWidth() - tableMargin * 2

    function drawPageHeader() {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(t.reports.salesBySellerDayTitle, 40, 32)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`${t.common.monthlyPeriod} ${periodLabel} · IMPORTES EN MXN`, 40, 42)
    }

    periods.forEach((dayChunk, index) => {
      if (index > 0) {
        doc.addPage()
      }
      drawPageHeader()

      const firstDay = dayChunk[0]!
      const lastDay = dayChunk[dayChunk.length - 1]!
      const subtitle = `${formatDate(firstDay, 'dd/MM/yyyy', locale)} - ${formatDate(lastDay, 'dd/MM/yyyy', locale)}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(subtitle, 40, 60)
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
        ...dayChunk.map((dia) => formatPdfCurrency(row.byDate[dia] ?? 0, false)),
        row.daysWithoutSale === 0 ? '0 DÍAS' : `${row.daysWithoutSale} DÍAS`,
        formatPdfCurrency(row.approximateDayAmount),
        formatPdfCurrency(row.total),
      ])

      const foot = [[
        t.common.grandTotal,
        ...dayChunk.map((dia) => formatPdfCurrency(totalDia(dia), false)),
        '—',
        formatPdfCurrency(rows.reduce((sum, row) => sum + row.approximateDayAmount, 0)),
        formatPdfCurrency(grandTotal),
      ]]
      // Distribuye el ancho disponible entre los días de cada quincena. La
      // segunda puede tener 13 a 16 días, por lo que necesita su propio cálculo.
      const dayColumnWidth = (
        availableTableWidth
        - employeeWidth
        - summaryWidths.reduce((sum, width) => sum + width, 0)
      ) / dayChunk.length
      const dayCellPadding = 0.7
      const baseDayFontSize = 5.8
      const dailyAmounts = [
        ...body.flatMap((row) => row.slice(1, dayChunk.length + 1)),
        ...foot[0]!.slice(1, dayChunk.length + 1),
      ]

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(baseDayFontSize)
      const widestDailyAmount = Math.max(
        ...dailyAmounts.map((amount) => doc.getTextWidth(amount)),
      )
      // Reduce solo la fuente de las columnas diarias cuando el importe más
      // largo de la quincena lo requiera; así ningún monto se trunca.
      const dayFontSize = Math.min(
        baseDayFontSize,
        baseDayFontSize * ((dayColumnWidth - dayCellPadding * 2) / widestDailyAmount),
      )

      autoTable(doc, {
        startY: 70,
        head,
        body,
        foot,
        theme: 'striped',
        styles: {
          font: 'helvetica',
          fontSize: 5.8,
          cellPadding: 1.6,
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
        margin: { top: 48, left: tableMargin, right: tableMargin, bottom: 24 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: employeeWidth },
          ...Object.fromEntries(dayChunk.map((_, dayIndex) => [dayIndex + 1, {
            cellPadding: dayCellPadding,
            cellWidth: dayColumnWidth,
            fontSize: dayFontSize,
          }])),
          [dayChunk.length + 1]: { cellWidth: summaryWidths[0] },
          [dayChunk.length + 2]: { cellWidth: summaryWidths[1] },
          [dayChunk.length + 3]: { cellWidth: summaryWidths[2] },
        },
      })
    })

    doc.save(`ventas-vendedor-dia-${year}-${String(month).padStart(2, '0')}.pdf`)
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    try {
      if (kind === 'pdf') {
        await exportPdf()
      } else {
        await exportReportToExcel({
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

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <TableLoadingSkeleton columns={8} rows={6} label={t.common.loadingData} />
      ) : !hasData ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t.reports.noSalesSellerPeriod}
        </p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.12em]">Buscar empleado</Label>
              <Input
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Escribe el nombre del vendedor"
                className="h-11 border-[color:var(--border-color)] bg-[var(--bg-card)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">VENDEDORES</div>
                  <CardTitle className="text-xl number-display">{rows.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL MES</div>
                  <CardTitle className="text-xl number-display">{formatCurrency(grandTotal)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-3">
              {mobileRows.map((row) => (
                <Card
                  key={row.sellerId}
                  className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setSelectedSellerId(row.sellerId)}
                  >
                    <CardHeader className="flex-row items-start justify-between gap-3 p-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base leading-snug">{row.sellerName}</CardTitle>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 px-4 pb-4">
                      <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL</div>
                        <div className="mt-1 number-display text-sm">{formatCurrency(row.total)}</div>
                      </div>
                      <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">PROMEDIO</div>
                        <div className="mt-1 number-display text-sm">{formatCurrency(row.approximateDayAmount)}</div>
                      </div>
                      <div className="col-span-2 flex items-center justify-between rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">DÍAS SIN VENTA</div>
                          <div className="mt-1 number-display text-sm">
                            {row.daysWithoutSale === 0 ? '0' : row.daysWithoutSale}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-md border border-[color:var(--border-color)] px-3 py-1 text-xs font-medium text-[color:var(--text-primary)]">
                          Ver detalle
                        </span>
                      </div>
                    </CardContent>
                  </button>
                </Card>
              ))}
            </div>

            {mobileRows.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No hay empleados que coincidan con la búsqueda.
              </p>
            )}

            <Sheet
              open={!!selectedRow}
              onOpenChange={(open) => {
                if (!open) setSelectedSellerId(null)
              }}
            >
              <SheetContent
                side="bottom"
                className="h-[100dvh] max-h-[100dvh] rounded-none border-none bg-[var(--bg-card)] p-0"
              >
                {selectedRow ? (
                  <div className="flex h-full flex-col">
                    <SheetHeader className="border-b border-[color:var(--border-color)] px-5 pb-4 pt-6 text-left">
                      <SheetTitle className="text-left text-xl">{selectedRow.sellerName}</SheetTitle>
                      <SheetDescription className="text-left">
                        {t.common.monthlyPeriod}: {periodLabel}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="grid grid-cols-2 gap-3 px-5 py-4">
                      <div className="rounded-2xl bg-[color:var(--bg-primary)] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                          <DollarSign className="h-3.5 w-3.5" />
                          Total del mes
                        </div>
                        <div className="mt-2 number-display text-lg">{formatCurrency(selectedRow.total)}</div>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--bg-primary)] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Monto día aprox
                        </div>
                        <div className="mt-2 number-display text-lg">{formatCurrency(selectedRow.approximateDayAmount)}</div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-5">
                      <div className="space-y-2">
                        {dias.map((dia) => {
                          const value = selectedRow.byDate[dia] ?? 0

                          return (
                            <div
                              key={dia}
                              className="flex items-center justify-between rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] px-4 py-3"
                            >
                              <div>
                                <div className="text-sm font-medium">
                                  {formatDate(dia, 'EEEE dd', locale)}
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                                  {value === 0 ? 'Sin venta' : 'Con venta'}
                                </div>
                              </div>
                              {value === 0 ? (
                                <Badge variant="destructive" className={zeroBadgeClassName}>
                                  {formatCurrency(value)}
                                </Badge>
                              ) : (
                                <div className="number-display text-sm">{formatCurrency(value)}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>

          <div className="hidden max-h-[calc(100vh-22rem)] overflow-auto rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-sm md:block">
            <table className="min-w-max w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-left text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap min-w-56 shadow-[1px_0_0_var(--border-color)]">
                  {t.common.employee}
                </th>
                {dias.map((dia) => (
                  <th
                    key={dia}
                    className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap"
                  >
                    {formatDate(dia, 'EEEE dd', locale)}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-center text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap">
                  DÍAS SIN VENTA
                </th>
                <th className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap">
                  MONTO DÍA APROX
                </th>
                <th className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap">
                  {t.common.total}
                </th>
              </tr>
            </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={row.sellerId}
                    className="border-b border-[color:var(--border-color)]"
                    style={{ backgroundColor: rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'transparent' }}
                  >
                    <td
                      className="sticky left-0 z-10 px-2 py-3 whitespace-nowrap font-medium shadow-[1px_0_0_var(--border-color)]"
                      style={{ backgroundColor: rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'var(--bg-card)' }}
                    >
                      {row.sellerName}
                    </td>
                  {dias.map((dia) => (
                    <td key={dia} className="px-2 py-3 text-right whitespace-nowrap">
                      {renderAmount(row.byDate[dia] ?? 0)}
                    </td>
                  ))}
                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    {row.daysWithoutSale === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-[#7d9f8a] px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                        0 DÍAS
                      </span>
                    ) : (
                      <span className="tabular-nums">{row.daysWithoutSale} DÍAS</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap">
                    {renderAmount(row.approximateDayAmount)}
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap font-medium">
                    {renderAmount(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
              <tfoot className="border-t border-[color:var(--border-color)] bg-[color:var(--bg-card)] font-medium">
                <tr>
                <td className="sticky left-0 z-30 bg-[color:var(--bg-card)] px-2 py-3 text-xs font-semibold uppercase whitespace-nowrap shadow-[1px_0_0_var(--border-color)]">
                  {t.common.grandTotal}
                </td>
                {dias.map((dia) => (
                  <td key={dia} className="px-2 py-3 text-right font-semibold whitespace-nowrap">
                    {renderAmount(totalDia(dia))}
                  </td>
                ))}
                <td className="px-2 py-3 text-center font-semibold whitespace-nowrap">
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                </td>
                <td className="px-2 py-3 text-right font-semibold whitespace-nowrap">
                  {renderAmount(rows.reduce((sum, row) => sum + row.approximateDayAmount, 0))}
                </td>
                <td className="px-2 py-3 text-right font-bold text-base whitespace-nowrap">
                  {renderAmount(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
