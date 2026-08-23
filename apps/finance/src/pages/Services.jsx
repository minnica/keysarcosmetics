import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { money, uid } from '../utils.js'

export default function Services({ services, setServices }) {
  const [open, setOpen] = React.useState(false)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setServices([...services, { id: uid(), name: form.get('name'), expenseType: form.get('expenseType'), amount: Number(form.get('amount')) }]); setOpen(false) }
  return <>
    <PageHeader title="Administración de servicios" description="Controla gastos fijos, variables, distribución y recordatorios por sucursal." actions={<button onClick={() => setOpen(true)}>＋ Alta de servicio</button>} />
    <Card title="Catálogo general" subtitle={`${services.length} servicios disponibles`}><div className="catalog-grid">{services.map((service) => <article key={service.id}><span>✦</span><div><strong>{service.name}</strong><small>{service.expenseType} · recordatorio mensual</small><b>{money(service.amount)}</b></div><button className="icon-button no-print" aria-label={`Eliminar ${service.name}`} onClick={() => setServices(services.filter((row) => row.id !== service.id))}>×</button></article>)}</div></Card>
    <Card title="Servicios asignados" subtitle="Importes que alimentan resúmenes y estados financieros"><Empty>Asigna servicios a una sucursal desde la integración con tu backend.</Empty></Card>
    {open && <Modal title="Alta de servicio" onClose={() => setOpen(false)}><form onSubmit={save}><label>Nombre<input name="name" required /></label><div className="form-row"><label>Tipo<select name="expenseType"><option>Fijo</option><option>Variable</option></select></label><label>Monto sugerido<input name="amount" type="number" min="0" defaultValue="0" /></label></div><FormActions onCancel={() => setOpen(false)} submitLabel="Guardar servicio" /></form></Modal>}
  </>
}
