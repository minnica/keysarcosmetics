'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  ColumnDef,
  DataTable,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@cosmetics/ui'
import { ReportExportButtons } from '@/components/payroll/report-export-buttons'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { usePayrollMockData } from '@/components/payroll/bonus-catalog-context'
import { currentRun, payrollTotals, type PayrollRunLine } from '@/lib/mock-data'
import { formatCurrency, formatDate, formatPercent, sumBy } from '@/lib/format'

export default function DashboardPage() {
  const { expenses } = usePayrollMockData()
  const [mode, setMode] = useState(currentRun.mode)
  const [range, setRange] = useState({ from: currentRun.from, to: currentRun.to })
  const netAdjustments = sumBy(currentRun.lines, (line) => line.bonus + line.payrollAdjustmentPositive + line.perDiem - line.fine - line.payrollAdjustmentNegative)
  const deductions = sumBy(currentRun.lines, (line) => line.fine + line.loanPayment + line.payrollAdjustmentNegative)
  const expenseTotal = sumBy(expenses, (expense) => expense.amount)
  const generalBalance = payrollTotals.salesWithVat - payrollTotals.totalPayment - expenseTotal
  const summaryMetrics = [
    { label: 'Ventas con IVA', value: formatCurrency(payrollTotals.salesWithVat) },
    { label: 'Nómina total', value: formatCurrency(payrollTotals.totalPayment) },
    { label: 'Gastos', value: formatCurrency(expenseTotal) },
    { label: 'Balance general', value: formatCurrency(generalBalance) },
  ]

  const columns: ColumnDef<PayrollRunLine>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          <p className="text-sm text-[color:var(--text-muted)]">{row.original.position} / {row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: 'salesWithVat',
      header: 'Ventas con IVA',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.salesWithVat)}</div>,
    },
    {
      accessorKey: 'salesWithoutVat',
      header: 'Ventas sin IVA',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.salesWithoutVat)}</div>,
    },
    {
      accessorKey: 'scheme',
      header: 'Esquema',
      cell: ({ row }) => <span className="font-medium">{row.original.scheme}</span>,
    },
    {
      accessorKey: 'individualRate',
      header: 'Porcentaje',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.individualRate)}</div>,
    },
    {
      accessorKey: 'commission',
      header: 'Comision',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.commission)}</div>,
    },
    {
      accessorKey: 'bonus',
      header: 'Bono',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.bonus)}</div>,
    },
    {
      accessorKey: 'fine',
      header: 'Multa',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.fine)}</div>,
    },
    {
      accessorKey: 'loanPayment',
      header: 'Pago prestamo',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.loanPayment)}</div>,
    },
    {
      accessorKey: 'payrollAdjustmentPositive',
      header: 'Ajuste nomina +',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.payrollAdjustmentPositive)}</div>,
    },
    {
      accessorKey: 'payrollAdjustmentNegative',
      header: 'Ajuste nomina -',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.payrollAdjustmentNegative)}</div>,
    },
    {
      accessorKey: 'perDiem',
      header: 'Viaticos',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.perDiem)}</div>,
    },
    {
      accessorKey: 'totalPayment',
      header: 'Total pago',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="number-display text-right text-base">{formatCurrency(row.original.totalPayment)}</div>,
    },
  ]

  const exportConfig = {
    title: 'Resumen de nómina',
    subtitle: `${formatDate(currentRun.from)} - ${formatDate(currentRun.to)} · ${mode === 'WITH_VAT' ? 'Con IVA' : 'Sin IVA'}`,
    filename: 'resumen-nomina',
    sheetName: 'Nómina',
    orientation: 'landscape' as const,
    rows: currentRun.lines,
    columns: [
      { header: 'EMPLEADO', accessor: (row: PayrollRunLine) => row.employeeName, width: 30 },
      { header: 'SUCURSAL', accessor: (row: PayrollRunLine) => row.branch, width: 22 },
      { header: 'VENTAS CON IVA', accessor: (row: PayrollRunLine) => row.salesWithVat, format: 'currency' as const },
      { header: 'VENTAS SIN IVA', accessor: (row: PayrollRunLine) => row.salesWithoutVat, format: 'currency' as const },
      { header: 'ESQUEMA', accessor: (row: PayrollRunLine) => row.scheme },
      { header: 'PORCENTAJE', accessor: (row: PayrollRunLine) => row.individualRate * 100, format: 'percent' as const },
      { header: 'COMISIÓN', accessor: (row: PayrollRunLine) => row.commission, format: 'currency' as const },
      { header: 'BONO', accessor: (row: PayrollRunLine) => row.bonus, format: 'currency' as const },
      { header: 'MULTA', accessor: (row: PayrollRunLine) => row.fine, format: 'currency' as const },
      { header: 'PRÉSTAMO', accessor: (row: PayrollRunLine) => row.loanPayment, format: 'currency' as const },
      { header: 'AJUSTE +', accessor: (row: PayrollRunLine) => row.payrollAdjustmentPositive, format: 'currency' as const },
      { header: 'AJUSTE -', accessor: (row: PayrollRunLine) => row.payrollAdjustmentNegative, format: 'currency' as const },
      { header: 'VIÁTICOS', accessor: (row: PayrollRunLine) => row.perDiem, format: 'currency' as const },
      { header: 'TOTAL PAGO', accessor: (row: PayrollRunLine) => row.totalPayment, format: 'currency' as const },
    ],
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Corrida de nómina</h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">Nómina clara antes de aprobar el pago.</p>
      </header>

      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[color:var(--text-muted)]">Periodo activo</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <p className="number-display text-xl text-[color:var(--text-primary)]">{formatDate(currentRun.from)} - {formatDate(currentRun.to)}</p>
                <StatusBadge status={currentRun.status} />
              </div>
            </div>
            <ReportExportButtons config={exportConfig} />
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-[color:var(--border-color)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map((metric) => (
              <div key={metric.label}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">{metric.label}</p>
                <p className="number-display mt-1.5 text-xl text-[color:var(--text-primary)]">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SectionCard title="CONFIGURAR CORRIDA">
        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:items-end">
            <DateRangePicker value={range} onChange={setRange} fromLabel="Desde" toLabel="Hasta" />
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WITH_VAT">Calcular con IVA</SelectItem>
                <SelectItem value="WITHOUT_VAT">Calcular sin IVA</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full lg:w-auto"
              onClick={() => toast.success('Corrida mock recalculada. En backend se guardaría un snapshot.')}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Recalcular
            </Button>
          </CardContent>
        </Card>
      </SectionCard>

      <SectionCard
        title="DETALLE POR EMPLEADO"
        action={(
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p><span className="text-[color:var(--text-muted)]">Ventas sin IVA </span><span className="number-display">{formatCurrency(payrollTotals.salesWithoutVat)}</span></p>
            <p><span className="text-[color:var(--text-muted)]">Deducciones </span><span className="number-display">{formatCurrency(deductions)}</span></p>
            <p><span className="text-[color:var(--text-muted)]">Ajustes netos </span><span className="number-display">{formatCurrency(netAdjustments)}</span></p>
          </div>
        )}
      >
        <DataTable
          columns={columns}
          data={currentRun.lines}
          searchPlaceholder="Buscar empleado, sucursal o esquema"
          emptyMessage="Sin empleados en esta corrida"
          pageSize={10}
        />
      </SectionCard>
    </div>
  )
}
