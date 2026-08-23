import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { downloadCsv, money, monthLabel, uid } from '../utils.js'

export default function Contributions({ data, period, setContributions }) {
  const [open, setOpen] = React.useState(false)
  const rows = data.contributions.filter((row) => row.period === period)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const partner = data.partners.find((row) => row.id === form.get('partnerId')); setContributions([...data.contributions, { id: uid(), period, partnerId: partner.id, partnerName: partner.name, concept: form.get('concept'), method: form.get('method'), notes: form.get('notes'), amount: Number(form.get('amount')) }]); setOpen(false) }
  return <>
    <PageHeader eyebrow="CONTROL DE DISTRIBUCIÓN" title="Aportaciones de socios" description="Registros manuales que se descuentan de la utilidad correspondiente a cada socio." actions={<><button className="secondary" onClick={() => downloadCsv(`aportaciones-${period}.csv`, rows)}>▦ Excel/CSV</button><button onClick={() => setOpen(true)} disabled={!data.partners.length}>＋ Registrar aportación</button></>} />
    <div className="summary-strip"><div><small>Periodo</small><b>{monthLabel(period)}</b></div><div><small>Aportaciones descontadas</small><b>− {money(rows.reduce((s, r) => s + r.amount, 0))}</b></div><div><small>Movimientos</small><b>{rows.length}</b></div></div>
    <Card title="Detalle de aportaciones">{rows.length ? <table><thead><tr><th>Socio</th><th>Concepto y forma</th><th>Notas</th><th>Monto</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.partnerName}</td><td>{row.concept}<small>{row.method}</small></td><td>{row.notes || '—'}</td><td>{money(row.amount)}</td><td><button className="icon-button no-print" onClick={() => setContributions(data.contributions.filter((item) => item.id !== row.id))}>×</button></td></tr>)}</tbody></table> : <Empty>No hay aportaciones o anticipos descontados en este periodo.</Empty>}</Card>
    {open && <Modal title="Registrar aportación" onClose={() => setOpen(false)}><form onSubmit={save}><label>Socio<select name="partnerId">{data.partners.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label><label>Concepto<input name="concept" required /></label><div className="form-row"><label>Forma<select name="method"><option>Transferencia</option><option>Efectivo</option><option>Compensación</option></select></label><label>Monto<input name="amount" type="number" min="1" required /></label></div><label>Notas<textarea name="notes" rows="3" /></label><FormActions onCancel={() => setOpen(false)} submitLabel="Registrar aportación" /></form></Modal>}
  </>
}
