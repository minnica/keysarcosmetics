import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { uid } from '../utils.js'

export default function Units({ units, setUnits }) {
  const [open, setOpen] = React.useState(false)
  const save = (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const next = units.length ? Math.max(...units.map((unit) => Number(unit.code.replace(/\D/g, '')) || 0)) + 1 : 1
    setUnits([...units, { id: uid(), code: `U-${String(next).padStart(3, '0')}`, name: form.get('name'), area: form.get('area'), status: 'Activa', createdAt: new Date().toISOString().slice(0, 10) }]); setOpen(false)
  }
  const toggle = (id) => setUnits(units.map((unit) => unit.id === id ? { ...unit, status: unit.status === 'Activa' ? 'Inactiva' : 'Activa' } : unit))
  return <>
    <PageHeader title="Administración de sucursales" description="El número se asigna automáticamente; registra altas o conserva el historial de las bajas." actions={<button onClick={() => setOpen(true)}>＋ Nueva sucursal</button>} />
    <Card title="Sucursales registradas" subtitle={`${units.filter((unit) => unit.status === 'Activa').length} activas · ${units.filter((unit) => unit.status !== 'Activa').length} inactivas`}>
      {units.length ? <div className="data-list">{units.map((unit) => <article key={unit.id}><div><small>{unit.code}</small><strong>{unit.name}</strong><span>{unit.area}</span></div><b className={`status ${unit.status === 'Activa' ? 'ok' : 'muted'}`}>{unit.status}</b><button className="secondary no-print" onClick={() => toggle(unit.id)}>{unit.status === 'Activa' ? 'Ⅱ Desactivar' : '✓ Reactivar'}</button></article>)}</div> : <Empty>No hay sucursales registradas.</Empty>}
    </Card>
    <Card title="Tiendas activas e inactivas" subtitle="Directorio histórico consolidado de solo consulta.">
      <table><thead><tr><th>Número</th><th>Sucursal</th><th>Área</th><th>Fecha de alta</th><th>Estado</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.id}><td>{unit.code}</td><td>{unit.name}</td><td>{unit.area}</td><td>{unit.createdAt}</td><td>{unit.status}</td></tr>)}</tbody></table>
    </Card>
    {open && <Modal title="Nueva sucursal" description="Datos generales de la unidad." onClose={() => setOpen(false)}><form onSubmit={save}><label>Nombre de la sucursal<input name="name" required placeholder="Ej. Polanco" /></label><label>Área responsable<input name="area" defaultValue="ADMINISTRACIÓN" required /></label><FormActions onCancel={() => setOpen(false)} submitLabel="Crear sucursal" /></form></Modal>}
  </>
}
