'use client'
// Reporte: Avance de vendedores vs meta mensual con barra de progreso coloreada
import { useState } from 'react'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { Progress } from '@/components/ui/progress'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useStore } from '@/lib/store'
import { formatCurrency, todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

function firstDayOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

export default function VentasPorVendedorPage() {
  const { state: { registros, empleados, sucursales } } = useStore()
  const [range, setRange] = useState<DateRange>({ from: firstDayOfMonth(), to: todayISO() })

  const filtered = registros.filter(r => r.fecha >= range.from && r.fecha <= range.to)

  const sucursalNombre = (id: string) => sucursales.find(s => s.id === id)?.nombre ?? id

  // Agrupar por (vendedorId, sucursalId) — un vendedor puede aparecer varias veces
  // si trabajó en distintas sucursales en el período
  interface Fila {
    emp: typeof empleados[number]
    sucursalId: string
    totalVendido: number
    porLlegar: number
    porcentaje: number
  }

  const filasMap = new Map<string, Fila>()

  for (const reg of filtered) {
    const emp = empleados.find(e => e.id === reg.vendedorId)
    if (!emp) continue
    const key = `${emp.id}__${reg.sucursalId}`
    const totalItems = reg.items.reduce((s, i) => s + i.cantidad, 0)
    const existing = filasMap.get(key)
    if (existing) {
      existing.totalVendido += totalItems
      existing.porLlegar = Math.max(0, emp.metaIndividual - existing.totalVendido)
      existing.porcentaje = emp.metaIndividual > 0 ? (existing.totalVendido / emp.metaIndividual) * 100 : 0
    } else {
      filasMap.set(key, {
        emp,
        sucursalId: reg.sucursalId,
        totalVendido: totalItems,
        porLlegar: Math.max(0, emp.metaIndividual - totalItems),
        porcentaje: emp.metaIndividual > 0 ? (totalItems / emp.metaIndividual) * 100 : 0,
      })
    }
  }

  const filas = [...filasMap.values()].sort((a, b) => b.totalVendido - a.totalVendido)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ventas por vendedor</h1>
        <p className="text-sm text-gray-500 mt-1">Avance de cada vendedor respecto a su meta en el período</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Período:</span>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead className="text-right">Total vendido</TableHead>
            <TableHead className="text-right">Meta mensual</TableHead>
            <TableHead className="text-right">Por llegar</TableHead>
            <TableHead>% Avance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ emp, sucursalId, totalVendido, porLlegar, porcentaje }) => {
            const colorText = porcentaje < 50 ? 'text-red-600' : porcentaje < 80 ? 'text-yellow-600' : 'text-green-600'
            return (
              <TableRow key={`${emp.id}__${sucursalId}`}>
                <TableCell className="font-medium">{emp.nombreCompleto}</TableCell>
                <TableCell className="text-gray-500 text-xs">{sucursalNombre(sucursalId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalVendido)}</TableCell>
                <TableCell className="text-right text-gray-500">{formatCurrency(emp.metaIndividual)}</TableCell>
                <TableCell className="text-right text-gray-500">{formatCurrency(porLlegar)}</TableCell>
                <TableCell className="min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <Progress value={porcentaje} className="flex-1" />
                    <span className={cn('text-xs font-semibold w-10 text-right', colorText)}>
                      {porcentaje.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
