import { Card, Empty, MetricCard, PageHeader } from '../components/UI.jsx'
import { money, monthLabel, periodShift } from '../utils.js'

export default function Dashboard({ data, period, navigate }) {
  const activeUnits = data.units.filter((unit) => unit.status === 'Activa')
  const rents = data.rents.filter((rent) => rent.period === period)
  const payments = data.payments.filter((payment) => payment.period === period)
  const income = data.monthlyHistory.find((row) => row.period === period)?.value || 0
  const previous = data.monthlyHistory.find((row) => row.period === periodShift(period, -1))?.value || 0
  const paid = payments.reduce((total, row) => total + Number(row.amount || 0), 0)
  const rentTotal = rents.reduce((total, row) => total + Number(row.amount || 0), 0)
  const overdue = rents.filter((rent) => rent.status === 'Vencida')
  const max = Math.max(...data.monthlyHistory.map((row) => row.value), 1)
  const change = previous ? ((income - previous) / previous) * 100 : 0

  return <>
    <PageHeader eyebrow="CONTROL MENSUAL" title={`Resumen · ${monthLabel(period)}`} description="Consulta consolidada de rentas, servicios, pagos y resultados por sucursal." />
    <Card className="financial-selector" title="Seleccionar estado financiero" subtitle="Cada movimiento actualiza automáticamente resumen, utilidades, socios, proyecciones y reportes.">
      <div className="company-strip"><span>EMPRESA CONSOLIDADA</span><strong>KEYSAR COSMETICS</strong><small>{monthLabel(period)} · {activeUnits.length} tiendas integradas</small></div>
      <div className="mini-metrics">
        <div><small>Ventas</small><b>{money(income)}</b></div><div><small>Rentas</small><b>− {money(rentTotal)}</b></div>
        <div><small>Pagos</small><b>{money(paid)}</b></div><div><small>Utilidad estimada</small><b>{money(income - rentTotal)}</b></div>
      </div>
      <div className="report-buttons no-print"><button className="secondary" onClick={() => navigate('finanzas')}>◉ Ver detalle</button><button onClick={() => window.print()}>🖨 Imprimir empresa</button></div>
    </Card>
    <div className="metric-grid">
      <MetricCard icon="＄" label={`Ingresos de ${monthLabel(period).split(' ')[0]}`} value={money(income)} detail={`${change >= 0 ? '+' : ''}${change.toFixed(1)}% contra el mes anterior`} tone="green" />
      <MetricCard icon="▤" label="Rentas activas" value={rents.length} detail={`de ${activeUnits.length} sucursales`} />
      <MetricCard icon="!" label="Rentas vencidas" value={overdue.length} detail="Requiere atención" tone="red" />
      <MetricCard icon="✓" label="Pagos al corriente" value={rentTotal ? `${Math.min(100, Math.round(paid / rentTotal * 100))}%` : '0%'} detail={`${money(paid)} aplicado`} tone="blue" />
    </div>
    <Card title="Resumen de servicios por sucursal" subtitle={`Total mensual de los servicios activos en ${monthLabel(period)}`} actions={<button className="secondary no-print" onClick={() => navigate('servicios')}>Ver servicios</button>}>
      <div className="unit-service-grid">{activeUnits.map((unit) => <article key={unit.id}><small>{unit.code}</small><strong>{unit.name}</strong><b>{money(0)}</b><span>0 servicios asignados</span></article>)}</div>
    </Card>
    <div className="split-grid">
      <Card title="Incremento de rentas" subtitle="Evolución mensual de los últimos 12 meses">
        <div className="bar-chart" aria-label="Gráfica de incremento de rentas">{data.monthlyHistory.slice(-12).map((row) => <div key={row.period} title={`${row.period}: ${money(row.value)}`}><i style={{ height: `${Math.max(8, row.value / max * 100)}%` }} /><span>{row.period.slice(5)}</span></div>)}</div>
      </Card>
      <Card title="Comparativos" subtitle="Desempeño del periodo seleccionado">
        <dl className="comparison"><div><dt>Mes seleccionado</dt><dd>{money(income)}</dd></div><div><dt>Mes anterior</dt><dd>{money(previous)}</dd></div><div><dt>Variación</dt><dd className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</dd></div></dl>
      </Card>
    </div>
    <Card title="Rentas vencidas" subtitle="Seguimiento prioritario de cobranza">{overdue.length ? <table><thead><tr><th>Sucursal</th><th>Vencimiento</th><th>Monto</th></tr></thead><tbody>{overdue.map((rent) => <tr key={rent.id}><td>{rent.unitName}</td><td>{rent.dueDate}</td><td>{money(rent.amount)}</td></tr>)}</tbody></table> : <Empty>No hay rentas vencidas para este periodo.</Empty>}</Card>
  </>
}
