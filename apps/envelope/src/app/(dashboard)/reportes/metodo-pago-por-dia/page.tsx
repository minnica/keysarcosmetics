'use client'
// Reporte: Ventas por método de pago desglosadas por día, columna por sucursal
import { useState } from 'react'
import {
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
} from "@cosmetics/ui"

import { useReportes } from '@/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MetodoPagoPorDiaPage() {
  const { registros, sucursales, metodosPago, loading, error } = useReportes()

  const now = new Date()
  const [metodoPagoId, setMetodoPagoId] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ]

  // Usa el primer método disponible si no se ha seleccionado
  const efectivoId = metodoPagoId || (metodosPago[0]?.id ?? '')

  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const filtered = registros.filter(r => r.fecha.startsWith(prefix))

  const dias = [...new Set(filtered.map(r => r.fecha))].sort()

  function totalDiaSucursal(fecha: string, sucursalId: string): number {
    return filtered
      .filter(r => r.fecha === fecha && r.sucursalId === sucursalId)
      .flatMap(r => r.items)
      .filter(i => i.metodoPagoId === efectivoId)
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
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Método de pago por día</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Desglose diario por sucursal para un método y mes específico</p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>Método de pago</Label>
          <Select value={efectivoId} onValueChange={setMetodoPagoId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metodosPago.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Mes</Label>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Año</Label>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando datos...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && dias.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin ventas con ese método en el período seleccionado.</p>
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
                    {totalDiaSucursal(dia, s.id) > 0 ? formatCurrency(totalDiaSucursal(dia, s.id)) : <span style={{ color: 'var(--border-color)' }}>—</span>}
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
