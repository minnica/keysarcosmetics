import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader, MetricCard } from '../components/UI.jsx'
import { money, uid } from '../utils.js'

export default function Financings({ data, setFinancings }) {
  const [open, setOpen] = React.useState(false)
  const requested = data.financings.reduce((s, r) => s + r.amount, 0)
  const paid = data.financings.reduce((s, r) => s + (r.paid || 0), 0)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const unit = data.units.find((row) => row.id === form.get('unitId')); setFinancings([...data.financings, { id: uid(), unitId: unit.id, code: unit.code, unitName: unit.name, concept: form.get('concept'), amount: Number(form.get('amount')), paid: 0 }]); setOpen(false) }
  const applyPayment = (id) => { const value = Number(window.prompt('Monto del pago')); if (value > 0) setFinancings(data.financings.map((row) => row.id === id ? { ...row, paid: Math.min(row.amount, (row.paid || 0) + value) } : row)) }
  return <>
    <PageHeader eyebrow="CONTROL DE DEUDA" title="Financiamientos" description="Solicitudes, pagos aplicados y saldo pendiente por sucursal." actions={<button onClick={() => setOpen(true)}>＋ Nuevo financiamiento</button>} />
    <div className="metric-grid three"><MetricCard icon="＋" label="Capital solicitado" value={money(requested)} detail={`${data.financings.length} registros`} /><MetricCard icon="✓" label="Pagos aplicados" value={money(paid)} detail="Capital amortizado" tone="green" /><MetricCard icon="◈" label="Balance de deuda" value={money(requested - paid)} detail="Saldo pendiente" tone="red" /></div>
    <Card title="Detalle de financiamientos">{data.financings.length ? <div className="data-list">{data.financings.map((row) => <article key={row.id}><div><small>{row.code}</small><strong>{row.concept}</strong><span>{row.unitName}</span></div><div><small>Saldo</small><b>{money(row.amount - row.paid)}</b></div><button className="secondary no-print" onClick={() => applyPayment(row.id)}>Aplicar pago</button></article>)}</div> : <Empty>Todavía no hay financiamientos registrados.</Empty>}</Card>
    {open && <Modal title="Nuevo financiamiento" onClose={() => setOpen(false)}><form onSubmit={save}><label>Sucursal<select name="unitId">{data.units.map((row) => <option value={row.id} key={row.id}>{row.code} · {row.name}</option>)}</select></label><label>Concepto<input name="concept" required /></label><label>Capital solicitado<input name="amount" type="number" min="1" required /></label><FormActions onCancel={() => setOpen(false)} submitLabel="Registrar financiamiento" /></form></Modal>}
  </>
}
