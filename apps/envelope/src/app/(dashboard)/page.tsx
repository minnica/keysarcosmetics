'use client'
// Dashboard principal — Cards de resumen + gráficas Recharts
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate, todayISO, monthName } from '@/lib/utils'
import { cn } from '@/lib/utils'

const SUCURSAL_COLORS = ['#e11d48', '#f59e0b', '#10b981', '#3b82f6']

export default function DashboardPage() {
  const { state: { registros, sucursales, empleados } } = useStore()
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const selYear = selectedDateObj.getFullYear()
  const selMonth = selectedDateObj.getMonth() + 1
  const selMonthPrefix = `${selYear}-${String(selMonth).padStart(2, '0')}`
  const selYearPrefix = String(selYear)

  // ── Helpers de suma ─────────────────────────────────────────────────────────
  function sumForSucursal(sucursalId: string, dateFilter: (fecha: string) => boolean): number {
    return registros
      .filter(r => r.sucursalId === sucursalId && dateFilter(r.fecha))
      .flatMap(r => r.items)
      .reduce((s, i) => s + i.cantidad, 0)
  }

  function totalForPeriod(dateFilter: (fecha: string) => boolean): number {
    return registros.filter(r => dateFilter(r.fecha)).flatMap(r => r.items).reduce((s, i) => s + i.cantidad, 0)
  }

  const periodos = [
    { label: 'Ventas del día', filter: (f: string) => f === selectedDate },
    { label: `Ventas del mes`, filter: (f: string) => f.startsWith(selMonthPrefix) },
    { label: `Ventas del año`, filter: (f: string) => f.startsWith(selYearPrefix) },
  ]

  // ── Gráfica 1: Total mensual por sucursal (últimos 6 meses) ─────────────────
  const monthsData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(selYear, selMonth - 1 - (5 - i), 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = monthName(d.getFullYear(), d.getMonth() + 1).slice(0, 3).toUpperCase()
    const entry: Record<string, string | number> = { mes: label }
    sucursales.forEach(s => {
      entry[s.nombre] = registros
        .filter(r => r.sucursalId === s.id && r.fecha.startsWith(prefix))
        .flatMap(r => r.items).reduce((acc, item) => acc + item.cantidad, 0)
    })
    return entry
  })

  // ── Gráfica 2: Ventas vs Meta por vendedor (mes seleccionado) ───────────────
  const vendedoresData = empleados.map(emp => {
    const totalVendido = registros
      .filter(r => r.vendedorId === emp.id && r.fecha.startsWith(selMonthPrefix))
      .flatMap(r => r.items).reduce((s, i) => s + i.cantidad, 0)
    return {
      nombre: emp.nombreCompleto.split(' ')[0] ?? emp.nombreCompleto,
      vendido: totalVendido,
      meta: emp.metaIndividual,
    }
  }).sort((a, b) => b.vendido - a.vendido)

  const formatK = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de ventas — {formatDate(selectedDate, "EEEE d 'de' MMMM yyyy")}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha-dashboard">Fecha de referencia</Label>
          <Input id="fecha-dashboard" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
        </div>
      </div>

      {/* ── Cards de resumen ── */}
      {periodos.map(({ label, filter }) => (
        <section key={label}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sucursales.map(s => {
              const total = sumForSucursal(s.id, filter)
              return (
                <Card key={s.id}>
                  <CardHeader>
                    <CardDescription>{s.nombre}</CardDescription>
                    <CardTitle className="text-2xl">{formatCurrency(total)}</CardTitle>
                  </CardHeader>
                </Card>
              )
            })}
            <Card className="border-rose-200 bg-rose-50">
              <CardHeader>
                <CardDescription className="text-rose-700">Total general</CardDescription>
                <CardTitle className="text-2xl text-rose-700">{formatCurrency(totalForPeriod(filter))}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>
      ))}

      {/* ── Gráfica 1: Total mensual por sucursal ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Total mensual por sucursal</h2>
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {sucursales.map((s, i) => (
                  <Bar key={s.id} dataKey={s.nombre} fill={SUCURSAL_COLORS[i % SUCURSAL_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── Gráfica 2: Vendedor vs Meta ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Avance vendedores del mes</h2>
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={Math.max(200, vendedoresData.length * 48)}>
              <BarChart data={vendedoresData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={formatK} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="meta" fill="#e5e7eb" name="Meta" radius={[0, 3, 3, 0]}>
                  {vendedoresData.map((entry, i) => (
                    <Cell key={i} fill="#e5e7eb" />
                  ))}
                </Bar>
                <Bar dataKey="vendido" name="Vendido" radius={[0, 3, 3, 0]}>
                  {vendedoresData.map((entry, i) => {
                    const pct = entry.meta > 0 ? entry.vendido / entry.meta : 0
                    const color = pct < 0.5 ? '#ef4444' : pct < 0.8 ? '#f59e0b' : '#10b981'
                    return <Cell key={i} fill={color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
