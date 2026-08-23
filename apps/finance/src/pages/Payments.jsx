import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { money, uid } from '../utils.js'

export default function Payments({ data, period, setPayments }) {
  const [open, setOpen] = React.useState(false)
  const rows = data.payments.filter((row) => row.period === period)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const rent = data.rents.find((row) => row.id === form.get('rentId')); setPayments([...data.payments, { id: uid(), period, rentId: rent.id, unitName: rent.unitName, code: rent.code, date: form.get('date'), responsible: form.get('responsible'), method: form.get('method'), amount: Number(form.get('amount')) }]); setOpen(false) }
  return <>
    <PageHeader eyebrow="CONTROL DE PAGOS" title="Pagos" description="Registro e historial completo de pagos de todas las sucursales autorizadas." actions={<button onClick={() => setOpen(true)} disabled={!data.rents.length}>＄ Registrar pago</button>} />
    <Card title="Historial de pagos" subtitle={`${rows.length} movimientos en el periodo`}>{rows.length ? <table><thead><tr><th>Fecha</th><th>Sucursal</th><th>Responsable</th><th>Método</th><th>Monto</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.code}<small>{row.unitName}</small></td><td>{row.responsible}</td><td>{row.method}</td><td>{money(row.amount)}</td></tr>)}</tbody></table> : <Empty>Todavía no hay pagos registrados. Primero registra una renta para aplicar pagos.</Empty>}</Card>
    {open && <Modal title="Registrar pago" description="Selecciona la renta y captura el abono." onClose={() => setOpen(false)}><form onSubmit={save}><label>Renta pendiente<select name="rentId" required>{data.rents.filter((row) => row.period === period).map((row) => <option value={row.id} key={row.id}>{row.code} · {row.unitName} · {money(row.amount)}</option>)}</select></label><div className="form-row"><label>Fecha<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Monto<input name="amount" type="number" min="1" required /></label></div><label>Responsable<input name="responsible" required placeholder="Nombre" /></label><label>Método<select name="method"><option>Transferencia</option><option>Tarjeta</option><option>Efectivo</option><option>Cheque</option></select></label><FormActions onCancel={() => setOpen(false)} submitLabel="Aplicar pago" /></form></Modal>}
  </>
}
