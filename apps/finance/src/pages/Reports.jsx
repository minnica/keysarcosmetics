import { Card, PageHeader } from '../components/UI.jsx'
import { downloadCsv } from '../utils.js'

const reports = [
  ['▦', 'Resumen ejecutivo', 'Ingresos, rentas, pagos y servicios', 'summary'],
  ['▥', 'Empresa consolidada', 'Reporte general de todas las sucursales', 'company'],
  ['⌂', 'Directorio de sucursales', 'Altas, áreas y estado actual', 'units'],
  ['▧', 'Rentas del mes', 'Rentas fijas y variables, vencimientos y estado', 'rents'],
  ['＄', 'Estado financiero', 'Ventas, gastos y utilidad neta', 'financials'],
  ['％', 'Utilidad por socio', 'Participación por sucursal', 'partners'],
  ['−', 'Aportaciones de socios', 'Aportaciones manuales descontadas', 'contributions'],
  ['↗', 'Proyección de ventas', 'Promedios, tendencias y pronóstico', 'history'],
]

export default function Reports({ data, period }) {
  const rowsFor = (key) => ({
    units: data.units, rents: data.rents.filter((row) => row.period === period), financials: data.financials.filter((row) => row.period === period),
    partners: data.partners.map((row) => ({ nombre: row.name, participaciones: JSON.stringify(row.shares) })),
    contributions: data.contributions.filter((row) => row.period === period), history: data.monthlyHistory,
    company: data.units.map((row) => ({ sucursal: row.code, nombre: row.name, estado: row.status })),
    summary: [{ periodo: period, sucursales: data.units.length, rentas: data.rents.filter((r) => r.period === period).length, pagos: data.payments.filter((r) => r.period === period).length }],
  }[key])
  return <>
    <PageHeader title="Reportes descargables" description="Formatos listos para impresión y archivos CSV compatibles con Excel." actions={<button onClick={() => window.print()}>🖨 Reporte general</button>} />
    <Card title="Formato de visualización" subtitle="El estilo formal corporativo se aplica a la impresión"><div className="template-grid"><article className="selected"><span>◆</span><strong>Formal corporativo</strong><small>Logotipo, encabezado institucional e indicadores</small><b>Predeterminado</b></article><article><span>▤</span><strong>Contable</strong><small>Líneas y estructura de libro</small></article><article><span>＄</span><strong>Financiero</strong><small>Énfasis en resultados y rentabilidad</small></article></div></Card>
    <div className="reports-grid">{reports.map(([icon, title, description, key]) => <article key={key}><span>{icon}</span><div><strong>{title}</strong><p>{description}</p></div><button className="secondary no-print" onClick={() => window.print()}>◉ Imprimir</button><button className="no-print" onClick={() => downloadCsv(`${key}-${period}.csv`, rowsFor(key))}>▦ Excel/CSV</button></article>)}</div>
  </>
}
