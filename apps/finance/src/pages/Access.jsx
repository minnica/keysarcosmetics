import React from 'react'
import { Card, Empty, FormActions, Modal, PageHeader } from '../components/UI.jsx'
import { uid } from '../utils.js'

export default function Access({ data, setAccessUsers }) {
  const [open, setOpen] = React.useState(false)
  const save = (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setAccessUsers([...data.accessUsers, { id: uid(), displayName: form.get('displayName'), email: form.get('email'), role: form.get('role'), unitId: form.get('unitId'), active: true }]); setOpen(false) }
  return <>
    <PageHeader eyebrow="CONTROL MASTER DE ACCESOS" title="Usuarios y accesos" description="Autoriza administradores o crea socios de solo lectura para una, varias o todas las sucursales." actions={<button onClick={() => setOpen(true)}>＋ Autorizar usuario</button>} />
    <div className="notice success"><b>✓ El usuario Master conserva el control general</b><p>Esta versión local simula perfiles. La autenticación real debe implementarse en el backend.</p></div>
    <Card title="Perfiles autorizados">{data.accessUsers.length ? <div className="data-list">{data.accessUsers.map((user) => <article key={user.id}><div><strong>{user.displayName}</strong><span>{user.email}</span></div><b className="status ok">{user.role}</b><button className="secondary no-print" onClick={() => setAccessUsers(data.accessUsers.filter((row) => row.id !== user.id))}>Revocar</button></article>)}</div> : <Empty>No hay perfiles adicionales autorizados.</Empty>}</Card>
    {open && <Modal title="Autorizar usuario" onClose={() => setOpen(false)}><form onSubmit={save}><label>Nombre<input name="displayName" required /></label><label>Correo<input name="email" type="email" required /></label><div className="form-row"><label>Rol<select name="role"><option>Administrador</option><option>Socio · solo lectura</option></select></label><label>Sucursal<select name="unitId"><option value="all">Todas</option>{data.units.map((row) => <option value={row.id} key={row.id}>{row.code}</option>)}</select></label></div><FormActions onCancel={() => setOpen(false)} submitLabel="Autorizar" /></form></Modal>}
  </>
}
