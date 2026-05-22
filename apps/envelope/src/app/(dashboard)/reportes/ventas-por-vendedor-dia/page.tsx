'use client'
// Reporte: Ventas de un vendedor específico desglosadas por día
import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useReportes } from '@/hooks'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function VentasPorVendedorDiaPage() {
  const { registros, empleados, sucursales, metodosPago, loading, error } = useReportes()
  const [vendedorId, setVendedorId] = useState('')
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })

  const vendedorEfectivo = vendedorId || (empleados[0]?.id ?? '')

  const sucursalNombre = (id: string) => sucursales.find(s => s.id === id)?.nombre ?? id
  const metodoPagoNombre = (id: string) => metodosPago.find(m => m.id === id)?.nombre ?? id

  const filtered = registros.filter(r =>
    r.vendedorId === vendedorEfectivo && r.fecha >= range.from && r.fecha <= range.to
  )

  interface FilaTabla { fecha: string; sucursalId: string; cantidad: number; metodoPagoId: string; notas?: string }
  const filas: FilaTabla[] = filtered.flatMap(r =>
    r.items.map(item => ({
      fecha: r.fecha,
      sucursalId: r.sucursalId,
      cantidad: item.cantidad,
      metodoPagoId: item.metodoPagoId,
      notas: item.notas,
    }))
  ).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const grandTotal = filas.reduce((s, f) => s + f.cantidad, 0)
  const vendedor = empleados.find(e => e.id === vendedorEfectivo)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ventas por vendedor por día</h1>
        <p className="text-sm text-gray-500 mt-1">Detalle de cada venta registrada en el período</p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>Vendedor</Label>
          <Select value={vendedorEfectivo} onChange={e => setVendedorId(e.target.value)} className="w-56">
            {empleados.map(e => <option key={e.id} value={e.id}>{e.nombreCompleto}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Período</Label>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Cargando datos...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {vendedor && (
        <div className="text-xs text-gray-400">
          Meta mensual: {formatCurrency(vendedor.metaIndividual)}
        </div>
      )}

      {!loading && filas.length === 0 ? (
        <p className="text-sm text-gray-400">Sin ventas para el vendedor en el período.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Método de pago</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila, idx) => (
              <TableRow key={idx}>
                <TableCell>{formatDate(fila.fecha)}</TableCell>
                <TableCell>{sucursalNombre(fila.sucursalId)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(fila.cantidad)}</TableCell>
                <TableCell><Badge variant="secondary">{metodoPagoNombre(fila.metodoPagoId)}</Badge></TableCell>
                <TableCell className="text-xs text-gray-400">{fila.notas ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-right uppercase text-xs">Total general</TableCell>
              <TableCell className="text-right font-bold text-base">{formatCurrency(grandTotal)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  )
}
