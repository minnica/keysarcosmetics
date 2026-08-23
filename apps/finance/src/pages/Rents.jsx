import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { money, monthLabel, uid } from '../utils.js'

export default function Rents({ data, period, setRents }) {
  const [open, setOpen] = React.useState(false)
  const rows = data.rents.filter((rent) => rent.period === period)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const unit = data.units.find((row) => row.id === form.get('unitId')); setRents([...data.rents, { id: uid(), unitId: unit.id, unitName: unit.name, code: unit.code, period, type: form.get('type'), amount: Number(form.get('amount')), dueDate: form.get('dueDate'), status: 'Pendiente' }]); setOpen(false) }
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  return <>
    <PageHeader eyebrow="CONTROL MENSUAL DE RENTAS" title={`Rentas · ${monthLabel(period)}`} description="Rentas fijas, variables, fechas de factura, pagos aplicados y saldos en un solo lugar." actions={<button onClick={() => setOpen(true)}>＋ Registrar renta</button>} />
    <div className="summary-strip"><div><small>Total del mes</small><b>{money(total)}</b></div><div><small>Pagado</small><b>{money(data.payments.filter((row) => row.period === period).reduce((s, r) => s + r.amount, 0))}</b></div><div><small>Pendiente de pago</small><b>{money(total)}</b></div><div><small>Rentas variables</small><b>{rows.filter((row) => row.type === 'Variable').length}</b></div></div>
    <Card title="Rentas del periodo" subtitle="Los pagos se acumulan por mes de renta.">{rows.length ? <table><thead><tr><th>Sucursal</th><th>Tipo</th><th>Vencimiento</th><th>Importe</th><th>Estado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.code}<small>{row.unitName}</small></td><td>{row.type}</td><td>{row.dueDate}</td><td>{money(row.amount)}</td><td><span className="status warning">{row.status}</span></td></tr>)}</tbody></table> : <Empty>No hay rentas dadas de alta para este periodo.</Empty>}</Card>
    {open && <Modal title="Registrar renta" onClose={() => setOpen(false)}><form onSubmit={save}><label>Sucursal<select name="unitId" required>{data.units.filter((u) => u.status === 'Activa').map((u) => <option value={u.id} key={u.id}>{u.code} · {u.name}</option>)}</select></label><div className="form-row"><label>Tipo<select name="type"><option>Fija</option><option>Variable</option></select></label><label>Importe<input name="amount" type="number" min="0" required /></label></div><label>Fecha de vencimiento<input name="dueDate" type="date" required /></label><FormActions onCancel={() => setOpen(false)} submitLabel="Registrar renta" /></form></Modal>}
  </>
}
