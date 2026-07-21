'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Card, CardContent,
  CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast,
} from '@cosmetics/ui'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { useAttentionServices } from '@/hooks'

export default function AttentionServicesPage() {
  const { categories, loading, loaded, error, addCategory, addSubcategory, deactivateCategory, deactivateSubcategory } = useAttentionServices()
  const [dialog, setDialog] = useState<'category' | 'subcategory' | null>(null)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [pending, setPending] = useState<{ kind: 'category' | 'subcategory'; id: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const activeCategories = categories.filter((category) => category.activa)

  function open(kind: 'category' | 'subcategory') {
    setName('')
    setCategoryId(kind === 'subcategory' ? activeCategories[0]?.id ?? '' : '')
    setDialog(kind)
  }

  async function submit() {
    if (!dialog || !name.trim()) return
    setSaving(true)
    try {
      if (dialog === 'category') await addCategory(name.trim())
      else await addSubcategory(categoryId, name.trim())
      toast.success(dialog === 'category' ? 'Categoría creada correctamente' : 'Servicio creado correctamente')
      setDialog(null)
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : 'No se pudo guardar') }
    finally { setSaving(false) }
  }

  async function confirmDeactivate() {
    if (!pending) return
    setSaving(true)
    try {
      if (pending.kind === 'category') await deactivateCategory(pending.id)
      else await deactivateSubcategory(pending.id)
      toast.success(pending.kind === 'category' ? 'Categoría desactivada' : 'Servicio desactivado')
      setPending(null)
    } catch (deleteError) { toast.error(deleteError instanceof Error ? deleteError.message : 'No se pudo desactivar') }
    finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 md:mx-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="page-title">Servicios de atención</h1><p className="mt-1 text-sm text-[color:var(--text-muted)]">Configura las categorías principales y los servicios que se podrán registrar en cada cita.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => open('category')}><Plus className="mr-2 h-4 w-4" />Categoría</Button><Button onClick={() => open('subcategory')} disabled={activeCategories.length === 0}><Plus className="mr-2 h-4 w-4" />Servicio</Button></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {loading && !loaded ? <TableLoadingSkeleton columns={3} rows={5} label="Cargando servicios..." /> : activeCategories.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-medium">Aún no hay categorías de atención.</p><p className="mt-1 text-sm text-[color:var(--text-muted)]">Comienza dando de alta FACIAL y CORPORAL; después agrega sus servicios.</p><Button className="mt-4" onClick={() => open('category')}><Plus className="mr-2 h-4 w-4" />Crear primera categoría</Button></CardContent></Card>
      ) : <div className="grid gap-4 md:grid-cols-2">{activeCategories.map((category) => {
        const activeServices = category.subcategorias.filter((service) => service.activa)
        return <Card key={category.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{category.nombre}</CardTitle><CardDescription>{activeServices.length} servicio(s) activo(s)</CardDescription></div><Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setPending({ kind: 'category', id: category.id, name: category.nombre })} aria-label={`Desactivar ${category.nombre}`}><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-2">{activeServices.length === 0 ? <p className="text-sm text-[color:var(--text-muted)]">Sin servicios registrados.</p> : activeServices.map((service) => <div key={service.id} className="flex items-center justify-between gap-3 border-t border-[color:var(--border-color)] py-2"><span>{service.nombre}</span><Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setPending({ kind: 'subcategory', id: service.id, name: service.nombre })} aria-label={`Desactivar ${service.nombre}`}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>
      })}</div>}
      <Dialog open={dialog !== null} onOpenChange={(openState) => !openState && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>{dialog === 'category' ? 'Nueva categoría' : 'Nuevo servicio'}</DialogTitle><DialogDescription>{dialog === 'category' ? 'Ejemplo: FACIAL o CORPORAL.' : 'El servicio quedará disponible al seleccionar su categoría en el registro de citas.'}</DialogDescription></DialogHeader><div className="space-y-4 py-2">{dialog === 'subcategory' && <div className="space-y-1.5"><Label>Categoría</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger><SelectContent>{activeCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.nombre}</SelectItem>)}</SelectContent></Select></div>}<div className="space-y-1.5"><Label htmlFor="service-name">Nombre</Label><Input id="service-name" value={name} onChange={(event) => setName(event.target.value.toUpperCase())} placeholder={dialog === 'category' ? 'EJ. CORPORAL' : 'EJ. MASAJE REDUCTIVO'} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button><Button onClick={() => void submit()} disabled={saving || !name.trim() || (dialog === 'subcategory' && !categoryId)}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={Boolean(pending)} onOpenChange={(openState) => !openState && !saving && setPending(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Desactivar {pending?.kind === 'category' ? 'categoría' : 'servicio'}?</AlertDialogTitle><AlertDialogDescription>{pending?.kind === 'category' ? 'También se desactivarán sus servicios. No aparecerán en el formulario de citas.' : 'Dejará de aparecer en el formulario de citas.'} Esta acción no elimina registros históricos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={saving} onClick={(event) => { event.preventDefault(); void confirmDeactivate() }}>{saving ? 'Desactivando...' : 'Desactivar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
