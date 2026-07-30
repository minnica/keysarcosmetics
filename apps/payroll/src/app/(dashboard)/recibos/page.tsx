'use client'

import { Eye, Send } from 'lucide-react'
import { Button, ColumnDef, DataTable, toast } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { currentRun, receipts, type PayrollReceipt, type PayrollRunLine } from '@/lib/mock-data'
import { formatCurrency, formatDate, formatPercent, sumBy } from '@/lib/format'

const RECEIPT_WIDTH = 468
const RECEIPT_HEIGHT = 642
const RECEIPT_SCALE = 2
const RECEIPT_ROWS = [
  { label: 'Ventas Con IVA', key: 'salesWithVat', type: 'money' },
  { label: 'Ventas Sin IVA', key: 'salesWithoutVat', type: 'money' },
  { label: 'Esquema de Pago', key: 'position', type: 'text' },
  { label: 'Sueldo base', key: 'salaryBase', type: 'moneyOrDash' },
  { label: '% Comisiones', key: 'individualRate', type: 'percent' },
  { label: 'Comisiones', key: 'commission', type: 'money' },
  { label: 'Prestamo', key: 'loanBalance', type: 'moneyOrDash' },
  { label: 'Pago Prestamo', key: 'loanPayment', type: 'moneyOrDash' },
  { label: 'Bonos', key: 'bonus', type: 'moneyOrDash' },
  { label: 'Multas', key: 'fine', type: 'moneyOrDash' },
  { label: 'Ajustes +', key: 'payrollAdjustmentPositive', type: 'moneyOrDash' },
  { label: 'Adelanto de nomina', key: 'payrollAdjustmentNegative', type: 'moneyOrDash' },
  { label: 'Viaticos', key: 'perDiem', type: 'moneyOrDash' },
] as const

function formatReceiptDate(value: string) {
  const [year, month, day] = value.split('-')
  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

  return `${day} ${monthName} ${year}`
}

function formatReceiptAmount(value: number, showDash = false) {
  if (showDash && value === 0) return '-'

  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function normalizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseFont: string, minSize: number) {
  const match = baseFont.match(/(\d+)px/)
  const baseSize = match ? Number(match[1]) : minSize

  for (let size = baseSize; size >= minSize; size -= 1) {
    ctx.font = baseFont.replace(/\d+px/, `${size}px`)
    if (ctx.measureText(text).width <= maxWidth) return
  }
}

function formatReceiptValue(line: PayrollRunLine, row: (typeof RECEIPT_ROWS)[number]) {
  const value = line[row.key]

  if (row.type === 'percent') return formatPercent(Number(value))
  if (row.type === 'text') return String(value).toLocaleUpperCase('es-MX')
  if (row.type === 'moneyOrDash') return formatReceiptAmount(Number(value), true)

  return formatReceiptAmount(Number(value))
}

function drawCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, font: string, color = '#000000') {
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitText(ctx, text, width, font, 12)
  ctx.fillText(text, x + width / 2, y)
}

function drawReceiptCanvas(receipt: PayrollReceipt, line: PayrollRunLine) {
  const canvas = document.createElement('canvas')
  canvas.width = RECEIPT_WIDTH * RECEIPT_SCALE
  canvas.height = RECEIPT_HEIGHT * RECEIPT_SCALE

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el recibo')

  ctx.scale(RECEIPT_SCALE, RECEIPT_SCALE)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, RECEIPT_WIDTH, RECEIPT_HEIGHT)

  const left = 12
  const top = 18
  const width = 436
  const labelWidth = 256
  const symbolWidth = 42
  const valueWidth = width - labelWidth - symbolWidth
  const titleHeight = 55
  const periodHeight = 66
  const rowHeight = 33
  const brandHeight = 33
  const totalHeight = 34
  const lineWidth = 1.6
  const borderWidth = 2
  const rowsTop = top + titleHeight + periodHeight
  const brandTop = rowsTop + RECEIPT_ROWS.length * rowHeight
  const totalTop = brandTop + brandHeight

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = borderWidth
  ctx.strokeRect(left, top, width, totalTop + totalHeight - top)

  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(left, top + titleHeight)
  ctx.lineTo(left + width, top + titleHeight)
  ctx.moveTo(left, rowsTop)
  ctx.lineTo(left + width, rowsTop)
  ctx.stroke()

  drawCenteredText(ctx, receipt.employeeName.toUpperCase(), left, top + titleHeight / 2, width, '700 22px Arial, sans-serif')
  drawCenteredText(
    ctx,
    `Desde ${formatReceiptDate(currentRun.from)} Hasta ${formatReceiptDate(currentRun.to)}`,
    left,
    top + titleHeight + periodHeight / 2,
    width,
    '700 22px Arial, sans-serif',
  )

  RECEIPT_ROWS.forEach((row, index) => {
    const y = rowsTop + index * rowHeight
    const midY = y + rowHeight / 2
    const value = formatReceiptValue(line, row)
    const isMoney = row.type === 'money' || row.type === 'moneyOrDash'

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(left + width, y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(left + labelWidth, y)
    ctx.lineTo(left + labelWidth, y + rowHeight)
    ctx.stroke()

    if (isMoney) {
      ctx.beginPath()
      ctx.moveTo(left + labelWidth + symbolWidth, y)
      ctx.lineTo(left + labelWidth + symbolWidth, y + rowHeight)
      ctx.stroke()
      drawCenteredText(ctx, '$', left + labelWidth, midY, symbolWidth, '700 22px Arial, sans-serif')
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#000000'
      ctx.font = '700 22px Arial, sans-serif'
      ctx.fillText(value, left + width - 10, midY)
    } else {
      drawCenteredText(ctx, value, left + labelWidth, midY, symbolWidth + valueWidth, '700 22px Arial, sans-serif')
    }

    drawCenteredText(ctx, row.label, left, midY, labelWidth, '700 22px Arial, sans-serif')
  })

  ctx.fillStyle = '#000000'
  ctx.fillRect(left, brandTop, width, brandHeight)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = lineWidth
  ctx.strokeRect(left, brandTop, width, brandHeight)
  drawCenteredText(ctx, 'keysar cosmetics', left, brandTop + brandHeight / 2, width, '700 22px Arial, sans-serif', '#ffffff')

  ctx.beginPath()
  ctx.moveTo(left, totalTop)
  ctx.lineTo(left + width, totalTop)
  ctx.moveTo(left + labelWidth, totalTop)
  ctx.lineTo(left + labelWidth, totalTop + totalHeight)
  ctx.moveTo(left + labelWidth + symbolWidth, totalTop)
  ctx.lineTo(left + labelWidth + symbolWidth, totalTop + totalHeight)
  ctx.stroke()

  drawCenteredText(ctx, 'Pago Total', left, totalTop + totalHeight / 2, labelWidth, '700 22px Arial, sans-serif')
  drawCenteredText(ctx, '$', left + labelWidth, totalTop + totalHeight / 2, symbolWidth, '700 22px Arial, sans-serif')
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000000'
  ctx.font = '700 22px Arial, sans-serif'
  ctx.fillText(formatReceiptAmount(line.totalPayment), left + width - 10, totalTop + totalHeight / 2)

  return canvas
}

async function downloadReceiptImage(receipt: PayrollReceipt) {
  const line = currentRun.lines.find((item) => item.employeeName === receipt.employeeName)
  if (!line) {
    toast.error('No se encontraron datos para este recibo.')
    return
  }

  try {
    const canvas = drawReceiptCanvas(receipt, line)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png')
    })

    if (!blob) throw new Error('No se pudo generar el PNG del recibo')

    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `recibo-${normalizeFileName(receipt.employeeName)}-${currentRun.from}-${currentRun.to}.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    toast.success(`Recibo generado para ${receipt.employeeName}`)
  } catch {
    toast.error('No se pudo generar el recibo.')
  }
}

export default function RecibosPage() {
  const columns: ColumnDef<PayrollReceipt>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
    },
    { accessorKey: 'period', header: 'Periodo' },
    {
      accessorKey: 'totalPayment',
      header: 'Total pago',
      cell: ({ row }) => <div className="number-display text-right">{formatCurrency(row.original.totalPayment)}</div>,
    },
    { accessorKey: 'sentTo', header: 'Envio', cell: ({ row }) => <span className="text-sm">{row.original.sentTo}</span> },
    {
      accessorKey: 'confirmedAt',
      header: 'Confirmado',
      cell: ({ row }) => row.original.confirmedAt ? formatDate(row.original.confirmedAt) : 'Pendiente',
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Ver recibo de ${row.original.employeeName}`}
          onClick={() => void downloadReceiptImage(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Recibos</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Confirmación lista para WhatsApp.</p>
        </div>
        <Button onClick={() => toast.info('Envio masivo mock preparado.')}>
          <Send className="mr-1.5 h-4 w-4" /> Enviar selección
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Generados" value={`${receipts.length}`} tone="gold" />
        <MetricCard label="Confirmados" value={`${receipts.filter((receipt) => receipt.status === 'CONFIRMED').length}`} tone="sage" />
        <MetricCard label="Total emitido" value={formatCurrency(sumBy(receipts, (receipt) => receipt.totalPayment))} tone="blue" />
      </div>

      <SectionCard eyebrow="Listado" title="RECIBOS POR EMPLEADO">
        <DataTable columns={columns} data={receipts} searchPlaceholder="Buscar recibo o empleado" emptyMessage="Sin recibos" pageSize={10} />
      </SectionCard>
    </div>
  )
}
