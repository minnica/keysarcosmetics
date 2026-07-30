'use client'

import { useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SectionCard } from '@/components/payroll/section-card'
import { formatDate, formatPercent } from '@/lib/format'
import {
  employees,
  schemeAssignments as initialAssignments,
  schemes as initialSchemes,
  type CommissionRange,
  type CommissionScheme,
  type SchemeAssignment,
} from '@/lib/mock-data'

type RangeFormState = {
  from: string
  to: string
  rate: string
}

type SchemeFormState = {
  name: string
  ranges: RangeFormState[]
}

type AssignmentFormState = {
  employeeId: string
  schemeId: string
}

const EMPTY_RANGE: RangeFormState = {
  from: '',
  to: '',
  rate: '',
}

const EMPTY_SCHEME_FORM: SchemeFormState = {
  name: '',
  ranges: [{ ...EMPTY_RANGE }],
}

const EMPTY_ASSIGNMENT_FORM: AssignmentFormState = {
  employeeId: '',
  schemeId: '',
}

function formatRangeNumber(value: number) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function toFormRange(range: CommissionRange): RangeFormState {
  return {
    from: String(range.from),
    to: String(range.to),
    rate: range.rate.toFixed(2),
  }
}

function toSchemeFormState(scheme: CommissionScheme): SchemeFormState {
  return {
    name: scheme.name,
    ranges: scheme.ranges.length ? scheme.ranges.map(toFormRange) : [{ ...EMPTY_RANGE }],
  }
}

function toAssignmentFormState(assignment: SchemeAssignment): AssignmentFormState {
  return {
    employeeId: assignment.employeeId,
    schemeId: assignment.schemeId,
  }
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getSchemeRateSummary(scheme: CommissionScheme) {
  const rates = scheme.ranges.map((range) => range.rate)
  const minRate = rates.length ? Math.min(...rates) : null
  const maxRate = rates.length ? Math.max(...rates) : null

  return {
    rangeCount: scheme.ranges.length,
    minRate,
    maxRate,
  }
}

export default function EsquemasPage() {
  const [schemes, setSchemes] = useState(initialSchemes)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [schemeDialogOpen, setSchemeDialogOpen] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [deleteSchemeTarget, setDeleteSchemeTarget] = useState<CommissionScheme | null>(null)
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<SchemeAssignment | null>(null)
  const [schemeForm, setSchemeForm] = useState<SchemeFormState>(EMPTY_SCHEME_FORM)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(EMPTY_ASSIGNMENT_FORM)

  const openCreateSchemeDialog = () => {
    setEditingSchemeId(null)
    setSchemeForm(EMPTY_SCHEME_FORM)
    setSchemeDialogOpen(true)
  }

  const openEditSchemeDialog = (scheme: CommissionScheme) => {
    setEditingSchemeId(scheme.id)
    setSchemeForm(toSchemeFormState(scheme))
    setSchemeDialogOpen(true)
  }

  const openCreateAssignmentDialog = () => {
    setEditingAssignmentId(null)
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM)
    setAssignmentDialogOpen(true)
  }

  const openEditAssignmentDialog = (assignment: SchemeAssignment) => {
    setEditingAssignmentId(assignment.id)
    setAssignmentForm(toAssignmentFormState(assignment))
    setAssignmentDialogOpen(true)
  }

  const updateRange = (index: number, field: keyof RangeFormState, value: string) => {
    setSchemeForm((current) => {
      const ranges = current.ranges.map((range, rangeIndex) => (rangeIndex === index ? { ...range, [field]: value } : range))
      return { ...current, ranges }
    })
  }

  const addRange = () => {
    setSchemeForm((current) => ({ ...current, ranges: [...current.ranges, { ...EMPTY_RANGE }] }))
  }

  const removeRange = (index: number) => {
    setSchemeForm((current) => {
      if (current.ranges.length === 1) {
        return current
      }

      return {
        ...current,
        ranges: current.ranges.filter((_, rangeIndex) => rangeIndex !== index),
      }
    })
  }

  const saveScheme = () => {
    const ranges = schemeForm.ranges
      .map((range) => ({
        from: toNumber(range.from),
        to: toNumber(range.to),
        rate: toNumber(range.rate),
      }))
      .filter((range): range is CommissionRange => range.from !== null && range.to !== null && range.rate !== null)

    const hasInvalidRange = schemeForm.ranges.some((range) => !range.from.trim() || !range.to.trim() || !range.rate.trim())

    if (!schemeForm.name.trim() || !ranges.length || hasInvalidRange) {
      toast.error('Completa el nombre del esquema y al menos un rango valido.')
      return
    }

    const nextScheme: CommissionScheme = {
      id: editingSchemeId ?? `scheme-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      name: schemeForm.name.trim(),
      ranges,
    }

    setSchemes((current) => {
      if (editingSchemeId) {
        return current.map((scheme) => (scheme.id === editingSchemeId ? nextScheme : scheme))
      }

      return [nextScheme, ...current]
    })

    setSchemeDialogOpen(false)
    setEditingSchemeId(null)
    setSchemeForm(EMPTY_SCHEME_FORM)
    toast.success(editingSchemeId ? 'Esquema mock actualizado.' : 'Esquema mock creado.')
  }

  const saveAssignment = () => {
    if (!assignmentForm.employeeId || !assignmentForm.schemeId) {
      toast.error('Selecciona empleado y esquema.')
      return
    }

    const employee = employees.find((item) => item.id === assignmentForm.employeeId)
    const scheme = schemes.find((item) => item.id === assignmentForm.schemeId)

    if (!employee || !scheme) {
      toast.error('Revisa empleado y esquema.')
      return
    }

    const nextAssignment: SchemeAssignment = {
      id: editingAssignmentId ?? `assignment-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      employeeId: employee.id,
      schemeId: scheme.id,
      assignedAt: editingAssignmentId
        ? assignments.find((item) => item.id === editingAssignmentId)?.assignedAt ?? '2025-06-01'
        : '2025-06-06',
    }

    setAssignments((current) => {
      if (editingAssignmentId) {
        return current.map((assignment) => (assignment.id === editingAssignmentId ? nextAssignment : assignment))
      }

      return [nextAssignment, ...current]
    })

    setAssignmentDialogOpen(false)
    setEditingAssignmentId(null)
    setAssignmentForm(EMPTY_ASSIGNMENT_FORM)
    toast.success(editingAssignmentId ? 'Asignación mock actualizada.' : 'Asignación mock creada.')
  }

  const confirmDeleteScheme = () => {
    if (!deleteSchemeTarget) return

    setSchemes((current) => current.filter((scheme) => scheme.id !== deleteSchemeTarget.id))
    setAssignments((current) => current.filter((assignment) => assignment.schemeId !== deleteSchemeTarget.id))
    toast.success(`Esquema mock eliminado: ${deleteSchemeTarget.name}`)
    setDeleteSchemeTarget(null)
  }

  const confirmDeleteAssignment = () => {
    if (!deleteAssignmentTarget) return

    setAssignments((current) => current.filter((assignment) => assignment.id !== deleteAssignmentTarget.id))
    toast.success('Asignación mock eliminada.')
    setDeleteAssignmentTarget(null)
  }

  const totalRanges = schemes.reduce((total, scheme) => total + scheme.ranges.length, 0)
  const maxRate = schemes.length ? Math.max(...schemes.flatMap((scheme) => scheme.ranges.map((range) => range.rate))) : 0
  const schemeAssignmentCount = assignments.length

  const getSchemeName = (schemeId: string) => schemes.find((scheme) => scheme.id === schemeId)?.name ?? 'Esquema no encontrado'
  const selectedAssignmentScheme = schemes.find((scheme) => scheme.id === assignmentForm.schemeId) ?? null

  const schemeColumns: ColumnDef<CommissionScheme>[] = [
    {
      accessorKey: 'name',
      header: 'Esquema',
      cell: ({ row }) => <p className="font-semibold text-[color:var(--text-strong)]">{row.original.name}</p>,
    },
    {
      id: 'ranges',
      header: 'DE / HASTA / TASA',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <span>De</span>
            <span>Hasta</span>
            <span className="text-right">Tasa</span>
          </div>
          {row.original.ranges.map((range, index) => (
            <div
              key={`${row.original.id}-${index}`}
              className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2"
            >
              <span className="tabular-nums text-[color:var(--text-strong)]">{formatRangeNumber(range.from)}</span>
              <span className="tabular-nums text-[color:var(--text-strong)]">{formatRangeNumber(range.to)}</span>
              <span className="text-right tabular-nums text-[color:var(--text-strong)]">{formatPercent(range.rate)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'assigned',
      header: 'Asignados',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {assignments.filter((assignment) => assignment.schemeId === row.original.id).length}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="payroll-button-secondary h-8 cursor-pointer rounded-full px-3"
            onClick={() => openEditSchemeDialog(row.original)}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            className="h-8 cursor-pointer rounded-full border-red-300 bg-red-50 px-3 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            onClick={() => setDeleteSchemeTarget(row.original)}
          >
            Borrar
          </Button>
        </div>
      ),
    },
  ]

  const assignmentColumns: ColumnDef<SchemeAssignment>[] = [
    {
      accessorKey: 'employeeId',
      header: 'Empleado',
      cell: ({ row }) => {
        const employee = employees.find((item) => item.id === row.original.employeeId)

        return (
          <div>
            <p className="font-semibold text-[color:var(--text-strong)]">{employee?.name ?? 'Empleado no encontrado'}</p>
            <p className="text-[0.92rem] text-[color:var(--text-muted)]">
              {employee?.position ?? 'N/D'} · {employee?.branch ?? 'N/D'}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'schemeId',
      header: 'Esquema asignado',
      cell: ({ row }) => <p className="font-semibold uppercase tracking-[0.08em] text-[color:var(--text-strong)]">{getSchemeName(row.original.schemeId)}</p>,
    },
    {
      accessorKey: 'assignedAt',
      header: 'Fecha',
      cell: ({ row }) => <div className="tabular-nums text-[color:var(--text-muted)]">{formatDate(row.original.assignedAt)}</div>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="payroll-button-secondary h-8 cursor-pointer rounded-full px-3"
            onClick={() => openEditAssignmentDialog(row.original)}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            className="h-8 cursor-pointer rounded-full border-red-300 bg-red-50 px-3 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            onClick={() => setDeleteAssignmentTarget(row.original)}
          >
            Borrar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">ESQUEMAS DE COMISION</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="page-title">Catálogo de esquemas y asignación por empleado.</h1>
            <p className="mt-3 max-w-xl text-[0.94rem] text-[color:var(--text-muted)]">
              Primero defines el esquema por rangos. Después lo asignas a cualquier empleado, incluso si comparte puesto con otros.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={openCreateSchemeDialog}>
              Nuevo esquema
            </Button>
            <Button variant="outline" className="payroll-button-secondary cursor-pointer rounded-full px-5" onClick={openCreateAssignmentDialog}>
              Asignar esquema
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Esquemas registrados" value={`${schemes.length}`} tone="gold" />
        <MetricCard label="Rangos totales" value={`${totalRanges}`} tone="sage" />
        <MetricCard label="Asignaciones activas" value={`${schemeAssignmentCount}`} tone="blue" />
      </div>

      <SectionCard
        eyebrow="Catalogo"
        title="REGISTRO DE ESQUEMAS"
        action={(
          <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={openCreateSchemeDialog}>
            Nuevo esquema
          </Button>
        )}
      >
        <DataTable columns={schemeColumns} data={schemes} searchPlaceholder="Buscar esquema" emptyMessage="Sin esquemas" pageSize={10} />
      </SectionCard>

      <SectionCard
        eyebrow="Asignaciones"
        title="ESQUEMAS ASIGNADOS A EMPLEADOS"
        action={(
          <Button variant="outline" className="payroll-button-secondary cursor-pointer rounded-full px-5" onClick={openCreateAssignmentDialog}>
            Asignar esquema
          </Button>
        )}
      >
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          searchPlaceholder="Buscar empleado o esquema"
          emptyMessage="Sin asignaciones"
          pageSize={10}
        />
      </SectionCard>

      <Dialog open={schemeDialogOpen} onOpenChange={setSchemeDialogOpen}>
        <DialogContent className="max-w-4xl rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingSchemeId ? 'Editar esquema demo' : 'Nuevo esquema demo'}</DialogTitle>
            <DialogDescription>Alta mock de esquema con filas independientes de De, Hasta y Tasa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre del esquema</Label>
              <Input
                value={schemeForm.name}
                onChange={(event) => setSchemeForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="1"
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Rangos de comision</Label>
                <Button type="button" variant="outline" className="payroll-button-secondary h-8 rounded-full px-3" onClick={addRange}>
                  Agregar rango
                </Button>
              </div>
              <div className="space-y-3">
                {schemeForm.ranges.map((range, index) => (
                  <div key={`range-form-${index}`} className="grid gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <div className="space-y-2">
                      <Label>De</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={range.from}
                        onChange={(event) => updateRange(index, 'from', event.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hasta</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={range.to}
                        onChange={(event) => updateRange(index, 'to', event.target.value)}
                        placeholder="999999.99"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tasa</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={range.rate}
                        onChange={(event) => updateRange(index, 'rate', event.target.value)}
                        placeholder="0.30"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-full border-red-300 bg-red-50 px-4 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                        onClick={() => removeRange(index)}
                        disabled={schemeForm.ranges.length === 1}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={saveScheme}>
              {editingSchemeId ? 'Guardar cambios mock' : 'Crear esquema mock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingAssignmentId ? 'Editar asignación demo' : 'Nueva asignación demo'}</DialogTitle>
            <DialogDescription>Relaciona un empleado con cualquier esquema disponible. No depende del puesto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Empleado</Label>
              <Select
                value={assignmentForm.employeeId}
                onValueChange={(value) => setAssignmentForm((current) => ({ ...current, employeeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} · {employee.position} · {employee.branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Esquema</Label>
              <Select
                value={assignmentForm.schemeId}
                onValueChange={(value) => setAssignmentForm((current) => ({ ...current, schemeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un esquema" />
                </SelectTrigger>
                <SelectContent>
                  {schemes.map((scheme) => {
                    const summary = getSchemeRateSummary(scheme)

                    return (
                      <SelectItem key={scheme.id} value={scheme.id}>
                        <div className="flex w-full items-center justify-between gap-3 py-0.5">
                          <span className="font-semibold text-[color:var(--text-strong)]">{scheme.name}</span>
                          <span className="whitespace-nowrap text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                            {summary.rangeCount} rango{summary.rangeCount === 1 ? '' : 's'} ·{' '}
                            {summary.minRate !== null ? formatPercent(summary.minRate) : '—'} a{' '}
                            {summary.maxRate !== null ? formatPercent(summary.maxRate) : '—'}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              {selectedAssignmentScheme ? (
                <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="label-caps">Detalle del esquema</p>
                    <p className="mt-1 text-[1.05rem] font-semibold text-[color:var(--text-strong)]">{selectedAssignmentScheme.name}</p>
                  </div>
                  <p className="text-[0.84rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {selectedAssignmentScheme.ranges.length} rango{selectedAssignmentScheme.ranges.length === 1 ? '' : 's'}
                  </p>
                </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      <span>De</span>
                      <span>Hasta</span>
                      <span className="text-right">Tasa</span>
                    </div>
                    {selectedAssignmentScheme.ranges.map((range, index) => (
                      <div
                        key={`${selectedAssignmentScheme.id}-${index}`}
                        className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--input-disabled-bg)] px-3 py-2"
                      >
                        <span className="tabular-nums text-[color:var(--text-strong)]">{formatRangeNumber(range.from)}</span>
                        <span className="tabular-nums text-[color:var(--text-strong)]">{formatRangeNumber(range.to)}</span>
                        <span className="text-right tabular-nums text-[color:var(--text-strong)]">{formatPercent(range.rate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[0.9rem] text-[color:var(--text-muted)]">Selecciona un esquema para ver sus rangos y porcentajes antes de asignarlo.</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={saveAssignment}>
              {editingAssignmentId ? 'Guardar cambios mock' : 'Crear asignación mock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteSchemeTarget)} onOpenChange={(open) => !open && setDeleteSchemeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar esquema</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina el esquema mock de <span className="font-semibold text-[color:var(--text-strong)]">{deleteSchemeTarget?.name}</span> y sus asignaciones
              relacionadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteScheme}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteAssignmentTarget)} onOpenChange={(open) => !open && setDeleteAssignmentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar asignación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina la asignación mock de <span className="font-semibold text-[color:var(--text-strong)]">{deleteAssignmentTarget?.id}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAssignment}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
