'use client'
// Reporte: Total general de ventas por día con columna por sucursal
import { useState } from 'react'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function TotalGeneralPage() {
  const { state: { registros, sucursales } } = useStore()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })

  const filtered = registros.filter(r => r.fecha >= range.from && r.fecha <= range.to)
  const dias = [...new Set(filtered.map(r => r.fecha))].sort()

  function totalDiaSucursal(fecha: string, sucursalId: string): number {
    return filtered
      .filter(r => r.fecha === fecha && r.sucursalId === sucursalId)
      .flatMap(r => r.items)
      .reduce((s, i) => s + i.cantidad, 0)
  }

  function totalDia(fecha: string): number {
    return sucursales.reduce((s, suc) => s + totalDiaSucursal(fecha, suc.id), 0)
  }

  function totalSucursalGeneral(sucursalId: string): number {
    return dias.reduce((s, d) => s + totalDiaSucursal(d, sucursalId), 0)
  }

  const granTotal = dias.reduce((s, d) => s + totalDia(d), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Total general de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen diario por sucursal en el período</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Período:</span>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {dias.length === 0 ? (
        <p className="text-sm text-gray-400">Sin ventas en el período seleccionado.</p>
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
                <TableCell>{formatDate(dia)}</TableCell>
                {sucursales.map(s => {
                  const val = totalDiaSucursal(dia, s.id)
                  return (
                    <TableCell key={s.id} className="text-right">
                      {val > 0 ? formatCurrency(val) : <span className="text-gray-300">—</span>}
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-medium">{formatCurrency(totalDia(dia))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold text-xs uppercase">Total por sucursal</TableCell>
              {sucursales.map(s => (
                <TableCell key={s.id} className="text-right font-semibold">
                  {formatCurrency(totalSucursalGeneral(s.id))}
                </TableCell>
              ))}
              <TableCell className="text-right font-bold text-base">{formatCurrency(granTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  )
}
