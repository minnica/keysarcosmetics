import { Card, MetricCard, PageHeader } from '../components/UI.jsx'
import { downloadCsv, money } from '../utils.js'

export default function Projections({ data }) {
  const values = data.monthlyHistory.map((row) => row.value)
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
  const recent = values.slice(-3)
  const recentAverage = recent.reduce((sum, value) => sum + value, 0) / Math.max(recent.length, 1)
  const last = values.at(-1) || 0; const previous = values.at(-2) || last
  const trend = previous ? (last - previous) / previous : 0
  const next = recentAverage * (1 + trend)
  const max = Math.max(...values, next, 1)
  return <>
    <PageHeader eyebrow="ANÁLISIS PREDICTIVO" title="Proyección de ventas" description="Pronóstico automático actualizado con los datos históricos." actions={<button className="secondary" onClick={() => downloadCsv('proyeccion-ventas.csv', data.monthlyHistory)}>▦ Excel/CSV</button>} />
    <div className="metric-grid three"><MetricCard icon="∑" label="Promedio mensual consolidado" value={money(average)} detail={`${values.length} meses analizados`} /><MetricCard icon="↗" label="Tendencia del último mes" value={`${(trend * 100).toFixed(1)}%`} detail="Crecimiento o estabilidad" tone={trend >= 0 ? 'green' : 'red'} /><MetricCard icon="◇" label="Proyección próximo mes" value={money(next)} detail="Promedio y tendencia reciente" /></div>
    <Card title="Ventas consolidadas · últimos 12 meses" subtitle="La barra punteada representa la proyección"><div className="bar-chart tall">{data.monthlyHistory.slice(-12).map((row) => <div key={row.period}><i style={{ height: `${row.value / max * 100}%` }} /><span>{row.period.slice(5)}</span></div>)}<div className="projected"><i style={{ height: `${next / max * 100}%` }} /><span>PROY.</span></div></div></Card>
    <Card title="Proyección por sucursal" subtitle="Pronóstico distribuido uniformemente como base editable"><div className="projection-grid">{data.units.map((unit) => <article key={unit.id}><strong>{unit.code}</strong><span>{unit.name}</span><div><small>Próximo mes</small><b>{money(next / Math.max(data.units.length, 1))}</b></div><div><small>Proyección 3 meses</small><b>{money(next * 3 / Math.max(data.units.length, 1))}</b></div></article>)}</div></Card>
  </>
}
