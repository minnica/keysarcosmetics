'use client'

import { useMemo, useState } from 'react'
import { Ban, CalendarRange, CheckCircle2, RotateCcw, ShoppingBag, UserCheck, UserX } from 'lucide-react'
import type { ColumnDef, DateRange } from '@cosmetics/ui'
import { Button, Card, CardContent, Combobox, DataTable, DateRangePicker, Label, toast } from '@cosmetics/ui'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { useAppointmentCatalogs, useAppointmentReport, useSucursales } from '@/hooks'
import type { AppointmentReportRow } from '@/hooks'
import { currentFortnightRange } from '@/lib/date-periods'
import { useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'
import { formatCurrency, formatDate } from '@/lib/utils'

const copy = {
  es: {
    title: 'Reporte de citas', description: 'Totales por facialista y sucursal para el período seleccionado.',
    fortnight: 'Quincena actual', facialist: 'Facialista', branch: 'Sucursal', allFacialists: 'Todas las facialistas', allBranches: 'Todas las sucursales',
    searchFacialist: 'Buscar facialista...', noFacialists: 'Sin facialistas', reset: 'Limpiar filtros',
    appointments: 'Citas', noPurchase: 'Sin compra', net: 'Pago neto', withDeposit: 'Compra con apartado', depositPayment: 'Pago de apartado',
    attended: 'Atendidas', noShow: 'No llegaron', cancelled: 'Canceladas',
    facial: 'Faciales', corporal: 'Corporales',
    total: 'Total', late: 'Bono salida tarde', meal: 'Bono de comida',
    totalAppointments: 'Total de citas', withPurchase: 'Citas con compra', totalSales: 'Total registrado', totalBonuses: 'Bonos registrados',
    noData: 'Sin registros para los filtros seleccionados.', search: 'Buscar en el reporte...', sheet: 'Reporte de Citas', period: 'Período',
    exportError: 'No se pudo exportar el reporte.',
  },
  en: {
    title: 'Appointment report', description: 'Totals by facialist and branch for the selected period.',
    fortnight: 'Current fortnight', facialist: 'Facialist', branch: 'Branch', allFacialists: 'All facialists', allBranches: 'All branches',
    searchFacialist: 'Search facialist...', noFacialists: 'No facialists', reset: 'Clear filters',
    appointments: 'Appointments', noPurchase: 'No purchase', net: 'Net payment', withDeposit: 'Purchase with deposit', depositPayment: 'Deposit payment',
    attended: 'Completed', noShow: 'No shows', cancelled: 'Cancelled',
    facial: 'Facials', corporal: 'Body services',
    total: 'Total', late: 'Late departure bonus', meal: 'Meal bonus',
    totalAppointments: 'Total appointments', withPurchase: 'Appointments with purchase', totalSales: 'Recorded total', totalBonuses: 'Recorded bonuses',
    noData: 'No records for the selected filters.', search: 'Search report...', sheet: 'Appointment Report', period: 'Period',
    exportError: 'The report could not be exported.',
  },
} as const

const emptyTotals = {
  totalCitas: 0,
  faciales: 0,
  corporales: 0,
  atendidas: 0,
  noLlegaron: 0,
  canceladas: 0,
  citasSinCompra: 0,
  pagoNeto: 0,
  compraConApartado: 0,
  pagoDeApartado: 0,
  total: 0,
  bonosSalidaTarde: 0,
  bonosComida: 0,
}

export default function AppointmentReportPage() {
  const { locale, t, dataTableLabels } = useI18n()
  const text = copy[locale]
  const { user } = useSession()
  const [range, setRange] = useState<DateRange>(() => currentFortnightRange())
  const [facialistId, setFacialistId] = useState('all')
  const [branchId, setBranchId] = useState('all')
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const { employees, loading: catalogsLoading, error: catalogsError } = useAppointmentCatalogs()
  const { sucursales: catalogoSucursales, loading: branchesLoading, error: branchesError } = useSucursales()

  const facialists = useMemo(() => {
    const matched = employees.filter((employee) => (employee.position?.nombre ?? employee.puesto).trim().toUpperCase().includes('FACIALISTA'))
    const available = matched.length > 0 ? matched : employees
    return user?.selfDataOnly && user.empleadoId
      ? available.filter((employee) => employee.id === user.empleadoId)
      : available
  }, [employees, user?.empleadoId, user?.selfDataOnly])
  const filters = useMemo(() => ({
    fechaInicio: range.from,
    fechaFin: range.to,
    ...(user?.selfDataOnly && user.empleadoId
      ? { facialistaId: user.empleadoId }
      : facialistId !== 'all'
        ? { facialistaId: facialistId }
        : {}),
    ...(branchId !== 'all' ? { sucursalId: branchId } : {}),
  }), [branchId, facialistId, range.from, range.to, user?.empleadoId, user?.selfDataOnly])
  const { rows, loading, error } = useAppointmentReport(filters)
  const sucursales = useMemo(() => {
    const branchById = new Map(catalogoSucursales.map(({ id, nombre }) => [id, nombre]))
    rows.forEach(({ sucursalId, sucursalNombre }) => {
      if (!branchById.has(sucursalId)) branchById.set(sucursalId, sucursalNombre)
    })
    return Array.from(branchById, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [catalogoSucursales, rows])

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    totalCitas: acc.totalCitas + row.totalCitas,
    faciales: acc.faciales + row.faciales,
    corporales: acc.corporales + row.corporales,
    atendidas: acc.atendidas + row.atendidas,
    noLlegaron: acc.noLlegaron + row.noLlegaron,
    canceladas: acc.canceladas + row.canceladas,
    citasSinCompra: acc.citasSinCompra + row.citasSinCompra,
    pagoNeto: acc.pagoNeto + row.pagoNeto,
    compraConApartado: acc.compraConApartado + row.compraConApartado,
    pagoDeApartado: acc.pagoDeApartado + row.pagoDeApartado,
    total: acc.total + row.total,
    bonosSalidaTarde: acc.bonosSalidaTarde + row.bonosSalidaTarde,
    bonosComida: acc.bonosComida + row.bonosComida,
  }), { ...emptyTotals }), [rows])

  const columns = useMemo<ColumnDef<AppointmentReportRow>[]>(() => [
    { accessorKey: 'facialistaNombre', header: text.facialist.toUpperCase() },
    { accessorKey: 'sucursalNombre', header: text.branch.toUpperCase() },
    { accessorKey: 'totalCitas', header: text.appointments.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'faciales', header: text.facial.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'corporales', header: text.corporal.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'atendidas', header: text.attended.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'noLlegaron', header: text.noShow.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'canceladas', header: text.cancelled.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'citasSinCompra', header: text.noPurchase.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'pagoNeto', header: text.net.toUpperCase(), cell: ({ row }) => <span className="number-display">{formatCurrency(row.original.pagoNeto)}</span>, meta: { align: 'right' } },
    { accessorKey: 'compraConApartado', header: text.withDeposit.toUpperCase(), cell: ({ row }) => <span className="number-display">{formatCurrency(row.original.compraConApartado)}</span>, meta: { align: 'right' } },
    { accessorKey: 'pagoDeApartado', header: text.depositPayment.toUpperCase(), cell: ({ row }) => <span className="number-display">{formatCurrency(row.original.pagoDeApartado)}</span>, meta: { align: 'right' } },
    { accessorKey: 'total', header: text.total.toUpperCase(), cell: ({ row }) => <span className="number-display">{formatCurrency(row.original.total)}</span>, meta: { align: 'right' } },
    { accessorKey: 'bonosSalidaTarde', header: text.late.toUpperCase(), meta: { align: 'right' } },
    { accessorKey: 'bonosComida', header: text.meal.toUpperCase(), meta: { align: 'right' } },
  ], [text])

  const exportColumns = useMemo<ExportColumn<AppointmentReportRow>[]>(() => [
    { header: text.facialist.toUpperCase(), accessor: (row) => row.facialistaNombre, width: 24 },
    { header: text.branch.toUpperCase(), accessor: (row) => row.sucursalNombre, width: 20 },
    { header: text.appointments.toUpperCase(), accessor: (row) => row.totalCitas, format: 'number', width: 12 },
    { header: text.facial.toUpperCase(), accessor: (row) => row.faciales, format: 'number', width: 12 },
    { header: text.corporal.toUpperCase(), accessor: (row) => row.corporales, format: 'number', width: 15 },
    { header: text.attended.toUpperCase(), accessor: (row) => row.atendidas, format: 'number', width: 12 },
    { header: text.noShow.toUpperCase(), accessor: (row) => row.noLlegaron, format: 'number', width: 12 },
    { header: text.cancelled.toUpperCase(), accessor: (row) => row.canceladas, format: 'number', width: 12 },
    { header: text.noPurchase.toUpperCase(), accessor: (row) => row.citasSinCompra, format: 'number', width: 12 },
    { header: text.net.toUpperCase(), accessor: (row) => row.pagoNeto, format: 'currency', width: 16 },
    { header: text.withDeposit.toUpperCase(), accessor: (row) => row.compraConApartado, format: 'currency', width: 19 },
    { header: text.depositPayment.toUpperCase(), accessor: (row) => row.pagoDeApartado, format: 'currency', width: 17 },
    { header: text.total.toUpperCase(), accessor: (row) => row.total, format: 'currency', width: 16 },
    { header: text.late.toUpperCase(), accessor: (row) => row.bonosSalidaTarde, format: 'number', width: 15 },
    { header: text.meal.toUpperCase(), accessor: (row) => row.bonosComida, format: 'number', width: 15 },
  ], [text])

  const footerRow = useMemo<AppointmentReportRow>(() => ({
    facialistaId: 'total', facialistaNombre: 'TOTAL', sucursalId: 'total', sucursalNombre: '—', ...totals,
  }), [totals])

  const selectedFacialist = facialists.find((employee) => employee.id === facialistId)?.nombreCompleto ?? text.allFacialists
  const selectedBranch = sucursales.find((branch) => branch.id === branchId)?.nombre ?? text.allBranches
  const reportError = error ?? catalogsError ?? branchesError
  const isLoading = loading || catalogsLoading || branchesLoading

  async function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    try {
      const subtitle = `${text.period}: ${formatDate(range.from, 'dd/MM/yyyy', locale)} - ${formatDate(range.to, 'dd/MM/yyyy', locale)} · ${selectedFacialist} · ${selectedBranch}`
      const config = {
        title: text.title,
        subtitle,
        filename: `reporte-citas-${range.from}-${range.to}`,
        sheetName: text.sheet,
        orientation: 'landscape' as const,
        columns: exportColumns,
        rows,
        footerRow,
      }
      if (kind === 'pdf') await exportReportToPdf(config)
      else await exportReportToExcel(config)
    } catch {
      toast.error(text.exportError)
    } finally {
      setExporting(null)
    }
  }

  function resetFilters() {
    setRange(currentFortnightRange())
    setFacialistId('all')
    setBranchId('all')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="page-title uppercase">{text.title}</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">{text.description}</p></div>
        <ReportExportButtons disabled={isLoading || Boolean(reportError) || rows.length === 0} exporting={exporting} onExportPdf={() => handleExport('pdf')} onExportExcel={() => handleExport('excel')} pdfLabel={t.common.exportPdf} excelLabel={t.common.exportExcel} />
      </div>

      <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[auto_minmax(13rem,1fr)_minmax(13rem,1fr)_auto] lg:items-end">
          <div className="space-y-2"><Label className="uppercase">{text.period}</Label><DateRangePicker value={range} onChange={setRange} fromLabel={t.common.from} toLabel={t.common.to} /></div>
          <div className="space-y-2"><Label className="uppercase">{text.facialist}</Label><Combobox options={[{ value: 'all', label: text.allFacialists }, ...facialists.map((employee) => ({ value: employee.id, label: employee.nombreCompleto }))]} value={facialistId} onValueChange={setFacialistId} placeholder={text.allFacialists} searchPlaceholder={text.searchFacialist} emptyMessage={text.noFacialists} disabled={catalogsLoading} /></div>
          <div className="space-y-2"><Label className="uppercase">{text.branch}</Label><Combobox options={[{ value: 'all', label: text.allBranches }, ...sucursales.map((branch) => ({ value: branch.id, label: branch.nombre }))]} value={branchId} onValueChange={setBranchId} placeholder={text.allBranches} searchPlaceholder={text.branch} emptyMessage={text.allBranches} disabled={branchesLoading} /></div>
          <div className="flex flex-wrap gap-2 lg:justify-end"><Button type="button" variant="outline" onClick={() => setRange(currentFortnightRange())} className="cursor-pointer"><CalendarRange className="mr-2 h-4 w-4" />{text.fortnight}</Button><Button type="button" variant="ghost" onClick={resetFilters} className="cursor-pointer"><RotateCcw className="mr-2 h-4 w-4" />{text.reset}</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: text.totalAppointments, value: String(totals.totalCitas), icon: CalendarRange },
          { label: text.attended, value: String(totals.atendidas), icon: UserCheck },
          { label: text.noShow, value: String(totals.noLlegaron), icon: UserX },
          { label: text.cancelled, value: String(totals.canceladas), icon: Ban },
          { label: text.withPurchase, value: String(totals.atendidas - totals.citasSinCompra), icon: CheckCircle2 },
          { label: text.totalSales, value: formatCurrency(totals.total), icon: ShoppingBag },
        ].map(({ label, value, icon: Icon }) => <Card key={label} className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm"><CardContent className="flex items-center justify-between p-4"><div><div className="label-caps">{label}</div><div className="number-display mt-1 text-xl">{value}</div></div><Icon className="h-5 w-5 text-[color:var(--color-gold)]" /></CardContent></Card>)}
      </div>

      {reportError && <p role="alert" className="text-sm text-red-500">{reportError}</p>}
      {isLoading ? <TableLoadingSkeleton columns={15} rows={6} showFilters={false} label={t.common.loadingData} /> : <DataTable columns={columns} data={rows} emptyMessage={text.noData} searchPlaceholder={text.search} pageSize={20} labels={dataTableLabels} />}

      {!isLoading && rows.length > 0 && (
        <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] px-5 py-4 text-sm">
          <span><span className="label-caps mr-2">{text.net}</span><span className="number-display">{formatCurrency(totals.pagoNeto)}</span></span>
          <span><span className="label-caps mr-2">{text.withDeposit}</span><span className="number-display">{formatCurrency(totals.compraConApartado)}</span></span>
          <span><span className="label-caps mr-2">{text.depositPayment}</span><span className="number-display">{formatCurrency(totals.pagoDeApartado)}</span></span>
          <span><span className="label-caps mr-2">{text.total}</span><span className="number-display text-base">{formatCurrency(totals.total)}</span></span>
        </div>
      )}
    </div>
  )
}
