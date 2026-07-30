'use client'

import { useState } from 'react'
import { Pencil, PlusCircle, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ColumnDef,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { ReportExportButtons } from '@/components/payroll/report-export-buttons'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { employees, loans as initialLoans, type LoanAdvance, type LoanStatus } from '@/lib/mock-data'
import { formatCurrency, formatDate, formatStatus, normalizeUppercase, sumBy } from '@/lib/format'

type LoanFormState = {
  employeeId: string
  employeeName: string
  requestedAt: string
  nature: 'PRESTAMO' | 'ADELANTO DE NOMINA'
  requestedAmount: string
  payments: string
  paymentAmount: string
  paidAmount: string
  balance: string
  status: LoanStatus
  nextPeriodFrom: string
  nextPeriodTo: string
}

const EMPTY_FORM: LoanFormState = {
  employeeId: '',
  employeeName: '',
  requestedAt: '',
  nature: 'PRESTAMO',
  requestedAmount: '0',
  payments: '1',
  paymentAmount: '0',
  paidAmount: '0',
  balance: '0',
  status: 'PENDING',
  nextPeriodFrom: '',
  nextPeriodTo: '',
}

const LOAN_STATUS_OPTIONS: Array<{ value: LoanStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'LOST', label: 'Perdido' },
]

export default function PrestamosAdelantosPage() {
  const [loans, setLoans] = useState(initialLoans)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LoanAdvance | null>(null)
  const [form, setForm] = useState<LoanFormState>(EMPTY_FORM)

  const activeEmployeeOptions = employees.filter((employee) => employee.active)
  const requestedAmountValue = Number(form.requestedAmount)
  const paymentsValue = Number(form.payments)
  const paidAmountValue = Number(form.paidAmount)
  const calculatedPaymentAmount = Number.isFinite(requestedAmountValue) && Number.isFinite(paymentsValue) && paymentsValue > 0 ? requestedAmountValue / paymentsValue : 0
  const calculatedBalance = Number.isFinite(requestedAmountValue) && Number.isFinite(paidAmountValue) ? Math.max(requestedAmountValue - paidAmountValue, 0) : 0

  function toFormState(loan: LoanAdvance): LoanFormState {
    const nextPeriodParts = loan.nextPeriod.match(/\s+a\s+/i) ? loan.nextPeriod.split(/\s+a\s+/i) : ['', '']

    return {
      employeeId: activeEmployeeOptions.find((employee) => normalizeUppercase(employee.name) === normalizeUppercase(loan.employeeName))?.id ?? '',
      employeeName: loan.employeeName,
      requestedAt: loan.requestedAt,
      nature: loan.nature,
      requestedAmount: String(loan.requestedAmount),
      payments: String(loan.payments),
      paymentAmount: String(loan.paymentAmount),
      paidAmount: String(loan.paidAmount),
      balance: String(loan.balance),
      status: loan.status,
      nextPeriodFrom: nextPeriodParts[0] ?? '',
      nextPeriodTo: nextPeriodParts[1] ?? '',
    }
  }

  const openCreateDialog = () => {
    setEditingLoanId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (loan: LoanAdvance) => {
    setEditingLoanId(loan.id)
    setForm(toFormState(loan))
    setDialogOpen(true)
  }

  const saveLoan = () => {
    const requestedAmount = Number(form.requestedAmount)
    const payments = Number(form.payments)
    const paidAmount = Number(form.paidAmount)
    const paymentAmount = calculatedPaymentAmount
    const balance = calculatedBalance

    if (!form.employeeName.trim() || !form.nature || !form.requestedAt.trim() || !form.nextPeriodFrom.trim() || !form.nextPeriodTo.trim()) {
      toast.error('Completa empleado, naturaleza, fecha de solicitud y próximo periodo.')
      return
    }

    if (!Number.isFinite(requestedAmount) || !Number.isFinite(payments)) {
      toast.error('Completa monto solicitado y pagos.')
      return
    }

    const nextLoan: LoanAdvance = {
      id: editingLoanId ?? `loan-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      requestedAt: form.requestedAt || (editingLoanId ? loans.find((loan) => loan.id === editingLoanId)?.requestedAt ?? new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      employeeName: normalizeUppercase(form.employeeName),
      nature: form.nature,
      requestedAmount,
      payments,
      paymentAmount,
      paidAmount,
      balance,
      status: form.status,
      nextPeriod: [form.nextPeriodFrom.trim(), form.nextPeriodTo.trim()].filter(Boolean).join(' A '),
    }

    setLoans((current) => {
      if (editingLoanId) {
        return current.map((loan) => (loan.id === editingLoanId ? nextLoan : loan))
      }

      return [nextLoan, ...current]
    })

    setDialogOpen(false)
    setEditingLoanId(null)
    setForm(EMPTY_FORM)
    toast.success(editingLoanId ? 'Solicitud mock actualizada.' : 'Solicitud mock creada.')
  }

  const confirmDeleteLoan = () => {
    if (!deleteTarget) return

    setLoans((current) => current.filter((loan) => loan.id !== deleteTarget.id))
    toast.success(`Solicitud mock eliminada: ${deleteTarget.employeeName}`)
    setDeleteTarget(null)
  }

  const columns: ColumnDef<LoanAdvance>[] = [
    { accessorKey: 'requestedAt', header: 'Solicitud', cell: ({ row }) => formatDate(row.original.requestedAt) },
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
    },
    { accessorKey: 'nature', header: 'Concepto' },
    { accessorKey: 'requestedAmount', header: 'Monto solicitado', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.requestedAmount)}</div> },
    { accessorKey: 'payments', header: 'Pagos', cell: ({ row }) => <div className="text-right">{row.original.payments}</div> },
    { accessorKey: 'paymentAmount', header: 'Monto a descontar', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.paymentAmount)}</div> },
    { accessorKey: 'paidAmount', header: 'Pagado', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.paidAmount)}</div> },
    { accessorKey: 'balance', header: 'Pendiente', cell: ({ row }) => <div className="number-display text-right">{formatCurrency(row.original.balance)}</div> },
    { accessorKey: 'status', header: 'ESTATUS', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="icon" variant="ghost" aria-label={`Editar solicitud de ${row.original.employeeName}`} onClick={() => openEditDialog(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Borrar solicitud de ${row.original.employeeName}`}
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const exportConfig = {
    title: 'Préstamos y adelantos',
    subtitle: 'Amortización mock de nómina',
    filename: 'prestamos-adelantos',
    sheetName: 'Préstamos',
    orientation: 'landscape' as const,
    rows: loans,
    columns: [
      { header: 'SOLICITUD', accessor: (row: LoanAdvance) => formatDate(row.requestedAt), width: 12 },
      { header: 'EMPLEADO', accessor: (row: LoanAdvance) => row.employeeName, width: 32 },
      { header: 'CONCEPTO', accessor: (row: LoanAdvance) => row.nature, width: 22 },
      { header: 'MONTO SOLICITADO', accessor: (row: LoanAdvance) => row.requestedAmount, format: 'currency' as const },
      { header: 'PAGOS', accessor: (row: LoanAdvance) => row.payments, format: 'number' as const },
      { header: 'MONTO A DESCONTAR', accessor: (row: LoanAdvance) => row.paymentAmount, format: 'currency' as const },
      { header: 'PAGADO', accessor: (row: LoanAdvance) => row.paidAmount, format: 'currency' as const },
      { header: 'PENDIENTE', accessor: (row: LoanAdvance) => row.balance, format: 'currency' as const },
      { header: 'ESTATUS', accessor: (row: LoanAdvance) => formatStatus(row.status), width: 12 },
      { header: 'PRÓXIMO PERIODO', accessor: (row: LoanAdvance) => row.nextPeriod, width: 24 },
    ],
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Préstamos y adelantos</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Amortización sin perder histórico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportExportButtons config={exportConfig} disabled={loans.length === 0} />
          <Button onClick={openCreateDialog}><PlusCircle className="mr-1.5 h-4 w-4" />Nueva solicitud</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Prestado" value={formatCurrency(sumBy(loans, (loan) => loan.requestedAmount))} tone="gold" />
        <MetricCard label="Cobrado" value={formatCurrency(sumBy(loans, (loan) => loan.paidAmount))} tone="sage" />
        <MetricCard label="Pendiente" value={formatCurrency(sumBy(loans, (loan) => loan.balance))} tone="rose" />
      </div>

      <SectionCard eyebrow="Control" title="AMORTIZACION">
        <DataTable columns={columns} data={loans} searchPlaceholder="Buscar empleado o naturaleza" emptyMessage="Sin prestamos" pageSize={10} />
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLoanId ? 'Editar solicitud demo' : 'Nueva solicitud demo'}</DialogTitle>
            <DialogDescription>Formulario mock para capturar préstamos y adelantos sin persistencia.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Fecha de solicitud</Label>
              <DatePicker
                value={form.requestedAt}
                onChange={(value) => setForm((current) => ({ ...current, requestedAt: value }))}
                placeholder="Selecciona la fecha de solicitud"
              />
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={form.employeeId}
                onValueChange={(value) => {
                  const employee = activeEmployeeOptions.find((item) => item.id === value)
                  if (employee) {
                    setForm((current) => ({ ...current, employeeId: employee.id, employeeName: employee.name }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployeeOptions.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} · {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Select value={form.nature} onValueChange={(value) => setForm((current) => ({ ...current, nature: value as LoanFormState['nature'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESTAMO">PRESTAMO</SelectItem>
                  <SelectItem value="ADELANTO DE NOMINA">ADELANTO DE NOMINA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto solicitado</Label>
              <Input type="number" min="0" value={form.requestedAmount} onChange={(event) => setForm((current) => ({ ...current, requestedAmount: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Número de pagos</Label>
              <Input type="number" min="1" value={form.payments} onChange={(event) => setForm((current) => ({ ...current, payments: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Monto a descontar</Label>
              <Input type="text" value={formatCurrency(calculatedPaymentAmount)} disabled />
            </div>
            <div className="space-y-2">
              <Label>Monto pagado</Label>
              <Input type="number" min="0" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Monto pendiente</Label>
              <Input type="text" value={formatCurrency(calculatedBalance)} disabled />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as LoanStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Próximo periodo</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <DatePicker
                  value={form.nextPeriodFrom}
                  onChange={(value) => setForm((current) => ({ ...current, nextPeriodFrom: value }))}
                  placeholder="Inicio"
                />
                <DatePicker
                  value={form.nextPeriodTo}
                  onChange={(value) => setForm((current) => ({ ...current, nextPeriodTo: value }))}
                  placeholder="Fin"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveLoan}>
              {editingLoanId ? 'Guardar cambios mock' : 'Crear solicitud mock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina la solicitud mock de <span className="font-semibold text-[color:var(--text-strong)]">{deleteTarget?.employeeName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDeleteLoan}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
