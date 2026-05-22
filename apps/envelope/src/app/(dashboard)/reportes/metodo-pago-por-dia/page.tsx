'use client'
// Reporte: Ventas por método de pago desglosadas por día, columna por sucursal
import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MetodoPagoPorDiaPage() {
  const { state: { registros, sucursales, metodosPago } } = useStore()

  const now = new Date()
  const [metodoPagoId, setMetodoPagoId] = useState(metodosPago[0]?.id ?? '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Años disponibles: de 2023 al año actual
  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ]

  // Filtrar registros del mes/año y método seleccionado
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const filtered = registros.filter(r => r.fecha.startsWith(prefix))

  // Días únicos
  const dias = [...new Set(filtered.map(r => r.fecha))].sort()

  // Total por día y sucursal para el método seleccionado
  function totalDiaSucursal(fecha: string, sucursalId: string): number {
    return filtered
      .filter(r => r.fecha === fecha && r.sucursalId === sucursalId)
      .flatMap(r => r.items)
      .filter(i => i.metodoPagoId === metodoPagoId)
      .reduce((s, i) => s + i.cantidad, 0)
  }

  function totalDia(fecha: string): number {
    return sucursales.reduce((s, suc) => s + totalDiaSucursal(fecha, suc.id), 0)
  }

  function totalSucursal(sucursalId: string): number {
    return dias.reduce((s, d) => s + totalDiaSucursal(d, sucursalId), 0)
  }

  const grandTotal = dias.reduce((s, d) => s + totalDia(d), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Método de pago por día</h1>
        <p className="text-sm text-gray-500 mt-1">Desglose diario por sucursal para un método y mes específico</p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>Método de pago</Label>
          <Select value={metodoPagoId} onChange={e => setMetodoPagoId(e.target.value)} className="w-44">
            {metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Mes</Label>
          <Select value={String(month)} onChange={e => setMonth(Number(e.target.value))} className="w-40">
            {months.map((name, i) => <option key={i} value={String(i + 1)}>{name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Año</Label>
          <Select value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-28">
            {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </Select>
        </div>
      </div>

      {dias.length === 0 ? (
        <p className="text-sm text-gray-400">Sin ventas con ese método en el período seleccionado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              {sucursales.map(s => <TableHead key={s.id} className="text-right">{s.nombre}</TableHead>)}
              <TableHead className="text-right">Total del día</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dias.map(dia => (
              <TableRow key={dia}>
                <TableCell>{formatDate(dia, 'EEEE dd')}</TableCell>
                {sucursales.map(s => (
                  <TableCell key={s.id} className="text-right">
                    {totalDiaSucursal(dia, s.id) > 0 ? formatCurrency(totalDiaSucursal(dia, s.id)) : <span className="text-gray-300">—</span>}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium">{formatCurrency(totalDia(dia))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total general</TableCell>
              {sucursales.map(s => (
                <TableCell key={s.id} className="text-right font-semibold">{formatCurrency(totalSucursal(s.id))}</TableCell>
              ))}
              <TableCell className="text-right font-bold text-base">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  )
}
