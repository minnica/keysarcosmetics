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
import { useSucursales, useEmpleados, useVentas } from '@/hooks'
import { formatCurrency, formatDate, todayISO, monthName } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Paleta de sucursales con colores complementarios de la marca
const SUCURSAL_COLORS = ['#6fc9db', '#8bb09b', '#c3a583', '#648672']

const DEFAULT_PERIODO_STYLE = {
  sectionBg: '#e8f6f9',
  totalBg: '#c8ebf2',
  totalText: '#3a8799',
  border: '#a5dae6',
}

const PERIODO_STYLES = [
  DEFAULT_PERIODO_STYLE,
  { sectionBg: '#faf3ee', totalBg: '#f0dece', totalText: '#8a5f38', border: '#dfc4a8' },
  { sectionBg: '#eef5f0', totalBg: '#d0e8d9', totalText: '#3d6b52', border: '#9fcfb1' },
]

export default function DashboardPage() {
  const { sucursales, loading: lS } = useSucursales()
  const { empleados, loading: lE } = useEmpleados()
  const { registros, loading: lV } = useVentas()
  const loading = lS || lE || lV

  const [selectedDate, setSelectedDate] = useState(todayISO())

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const selYear = selectedDateObj.getFullYear()
  const selMonth = selectedDateObj.getMonth() + 1
  const selMonthPrefix = `${selYear}-${String(selMonth).padStart(2, '0')}`
  const selYearPrefix = String(selYear)

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

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        Cargando datos...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Resumen de ventas — {formatDate(selectedDate, "EEEE d 'de' MMMM yyyy")}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha-dashboard">Fecha de referencia</Label>
          <Input
            id="fecha-dashboard"
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* ── Cards de resumen por período ── */}
      {periodos.map(({ label, filter }, periodIdx) => {
        const styles = PERIODO_STYLES[periodIdx] ?? DEFAULT_PERIODO_STYLE
        return (
          <section key={label}>
            <h2
              className="text-xs font-semibold uppercase tracking-[0.12em] mb-3"
              style={{ color: 'var(--color-gold)' }}
            >
              {label}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {sucursales.map((s, idx) => {
                const total = sumForSucursal(s.id, filter)
                return (
                  <Card
                    key={s.id}
                    style={{
                      borderColor: styles.border,
                      backgroundColor: styles.sectionBg,
                    }}
                  >
                    <CardHeader>
                      <CardDescription style={{ color: styles.totalText, opacity: 0.8 }}>
                        {s.nombre}
                      </CardDescription>
                      <CardTitle
                        className="text-2xl"
                        style={{ color: SUCURSAL_COLORS[idx % SUCURSAL_COLORS.length] }}
                      >
                        {formatCurrency(total)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )
              })}
              {/* Card total general del período */}
              <Card
                style={{
                  borderColor: styles.border,
                  backgroundColor: styles.totalBg,
                }}
              >
                <CardHeader>
                  <CardDescription style={{ color: styles.totalText }}>
                    Total general
                  </CardDescription>
                  <CardTitle className="text-2xl" style={{ color: styles.totalText }}>
                    {formatCurrency(totalForPeriod(filter))}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>
        )
      })}

      {/* ── Gráfica 1: Total mensual por sucursal ── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-[0.12em] mb-3"
          style={{ color: 'var(--color-gold)' }}
        >
          Total mensual por sucursal
        </h2>
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                {sucursales.map((s, i) => (
                  <Bar
                    key={s.id}
                    dataKey={s.nombre}
                    fill={SUCURSAL_COLORS[i % SUCURSAL_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── Gráfica 2: Vendedor vs Meta ── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-[0.12em] mb-3"
          style={{ color: 'var(--color-gold)' }}
        >
          Avance vendedores del mes
        </h2>
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={Math.max(200, vendedoresData.length * 48)}>
              <BarChart data={vendedoresData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                <XAxis type="number" tickFormatter={formatK} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} width={60} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                {/* Barra de meta — fondo neutro */}
                <Bar dataKey="meta" fill="var(--border-color)" name="Meta" radius={[0, 4, 4, 0]}>
                  {vendedoresData.map((_, i) => (
                    <Cell key={i} fill="var(--border-color)" />
                  ))}
                </Bar>
                {/* Barra de vendido — color según porcentaje de meta */}
                <Bar dataKey="vendido" name="Vendido" radius={[0, 4, 4, 0]}>
                  {vendedoresData.map((entry, i) => {
                    const pct = entry.meta > 0 ? entry.vendido / entry.meta : 0
                    const color =
                      pct < 0.5 ? '#e07070' :
                      pct < 0.8 ? '#c3a583' :
                                  '#648672'
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
