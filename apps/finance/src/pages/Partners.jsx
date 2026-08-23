import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { money, uid } from '../utils.js'

export default function Partners({ data, setPartners }) {
  const [open, setOpen] = React.useState(false)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const unitId = form.get('unitId'); setPartners([...data.partners, { id: uid(), name: form.get('name').toUpperCase(), shares: { [unitId]: Number(form.get('share')) } }]); setOpen(false) }
  const assigned = (unitId) => data.partners.reduce((sum, partner) => sum + Number(partner.shares[unitId] || 0), 0)
  return <>
    <PageHeader title="Socios y participación por sucursal" description="Asigna un porcentaje diferente al socio en cada sucursal y aplícalo a su utilidad neta." actions={<button onClick={() => setOpen(true)}>＋ Agregar socio</button>} />
    <Card title="Distribución por sucursal" subtitle="El total recomendado es 100%"><div className="share-grid">{data.units.map((unit) => <article key={unit.id}><strong>{unit.code}</strong><b>{assigned(unit.id).toFixed(2)}%</b><span>{assigned(unit.id) === 100 ? 'Distribución completa' : `Falta ${(100 - assigned(unit.id)).toFixed(2)}%`}</span><i style={{ width: `${Math.min(100, assigned(unit.id))}%` }} /></article>)}</div></Card>
    <div className="partner-grid">{data.partners.map((partner) => <Card key={partner.id} title={partner.name} subtitle={Object.entries(partner.shares).map(([id, value]) => `${data.units.find((u) => u.id === id)?.code || id} ${value}%`).join(' · ')}><div className="partner-profit"><span>Utilidad asignada</span><strong>{money(0)}</strong></div><button className="danger-link no-print" onClick={() => setPartners(data.partners.filter((row) => row.id !== partner.id))}>× Desactivar</button></Card>)}</div>
    {!data.partners.length && <Empty>No hay socios activos.</Empty>}
    {open && <Modal title="Agregar socio" onClose={() => setOpen(false)}><form onSubmit={save}><label>Nombre<input name="name" required /></label><label>Sucursal<select name="unitId">{data.units.map((row) => <option value={row.id} key={row.id}>{row.code} · {row.name}</option>)}</select></label><label>Participación inicial (%)<input name="share" type="number" min="0" max="100" required /></label><FormActions onCancel={() => setOpen(false)} submitLabel="Agregar socio" /></form></Modal>}
  </>
}
