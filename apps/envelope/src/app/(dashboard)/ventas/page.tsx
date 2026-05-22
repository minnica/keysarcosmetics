'use client'
// Pantalla de captura de ventas — flujo de sobre físico digitalizado
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Trash2, Pencil, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useStore, useSucursales, useEmpleados, useMetodosPago, useRegistros } from '@/lib/store'
import { formatCurrency, formatDate, todayISO, generateId } from '@/lib/utils'
import type { VentaItem, RegistroVenta } from '@/lib/mock-data'

// ── Esquemas Zod ──────────────────────────────────────────────────────────────

const selectorSchema = z.object({
  sucursalId: z.string().min(1, 'Selecciona una sucursal'),
  fecha: z.string().min(1, 'Selecciona una fecha'),
  vendedorId: z.string().min(1, 'Selecciona un vendedor'),
})

const ventaItemSchema = z.object({
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  metodoPagoId: z.string().min(1, 'Selecciona un método de pago'),
  notas: z.string().optional(),
})

type SelectorForm = z.infer<typeof selectorSchema>
type VentaItemForm = z.infer<typeof ventaItemSchema>

// ── Componente principal ──────────────────────────────────────────────────────

export default function VentasPage() {
  const { sucursales } = useSucursales()
  const { empleados } = useEmpleados()
  const { metodosPago } = useMetodosPago()
  const { registros, add: addRegistro, update: updateRegistro, remove: deleteRegistro } = useRegistros()

  // Estado del selector (paso 1)
  const selectorForm = useForm<SelectorForm>({
    resolver: zodResolver(selectorSchema),
    defaultValues: { sucursalId: '', fecha: todayISO(), vendedorId: '' },
  })
  const watchedSucursal = selectorForm.watch('sucursalId')
  const watchedVendedor = selectorForm.watch('vendedorId')
  const watchedFecha = selectorForm.watch('fecha')

  // Lista temporal de items antes de guardar
  const [tempItems, setTempItems] = useState<VentaItem[]>([])
  const [selectorLocked, setSelectorLocked] = useState(false)

  // Modal de agregar venta
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VentaItem | null>(null)

  // Modal de editar registro guardado
  const [editRegistroId, setEditRegistroId] = useState<string | null>(null)

  const itemForm = useForm<VentaItemForm>({
    resolver: zodResolver(ventaItemSchema),
    defaultValues: { cantidad: 0, metodoPagoId: '', notas: '' },
  })

  // Paso 1 válido cuando todos los selectores tienen valor
  const selectorValido = watchedSucursal && watchedFecha && watchedVendedor

  function openAddModal() {
    setEditingItem(null)
    itemForm.reset({ cantidad: 0, metodoPagoId: '', notas: '' })
    setModalOpen(true)
  }

  function openEditItemModal(item: VentaItem) {
    setEditingItem(item)
    itemForm.reset({ cantidad: item.cantidad, metodoPagoId: item.metodoPagoId, notas: item.notas ?? '' })
    setModalOpen(true)
  }

  function handleSaveItem(data: VentaItemForm) {
    if (editingItem) {
      setTempItems(prev => prev.map(i => i.id === editingItem.id ? { ...editingItem, ...data } : i))
    } else {
      setTempItems(prev => [...prev, { id: generateId(), ...data }])
    }
    setModalOpen(false)
  }

  function handleDeleteItem(id: string) {
    setTempItems(prev => prev.filter(i => i.id !== id))
  }

  function handleGuardarRegistro() {
    if (tempItems.length === 0) return
    const registro: RegistroVenta = {
      id: generateId(),
      sucursalId: watchedSucursal,
      vendedorId: watchedVendedor,
      fecha: watchedFecha,
      items: tempItems,
    }
    addRegistro(registro)
    setTempItems([])
    setSelectorLocked(false)
    selectorForm.reset({ sucursalId: '', fecha: todayISO(), vendedorId: '' })
  }

  function handleNuevoRegistro() {
    setTempItems([])
    setSelectorLocked(false)
    selectorForm.reset({ sucursalId: '', fecha: todayISO(), vendedorId: '' })
  }

  // Nombre helpers
  const sucursalNombre = (id: string) => sucursales.find(s => s.id === id)?.nombre ?? id
  const vendedorNombre = (id: string) => empleados.find(e => e.id === id)?.nombreCompleto ?? id
  const metodoPagoNombre = (id: string) => metodosPago.find(m => m.id === id)?.nombre ?? id

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registro de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">Captura las ventas del día por vendedor y sucursal</p>
      </div>

      {/* ── Paso 1: Selector ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">1. Selección</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sucursal">Sucursal</Label>
            <Select
              id="sucursal"
              placeholder="Seleccionar..."
              disabled={selectorLocked}
              {...selectorForm.register('sucursalId')}
            >
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
            {selectorForm.formState.errors.sucursalId && (
              <p className="text-xs text-red-500">{selectorForm.formState.errors.sucursalId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" disabled={selectorLocked} {...selectorForm.register('fecha')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendedor">Vendedor</Label>
            <Select
              id="vendedor"
              placeholder="Seleccionar..."
              disabled={selectorLocked}
              {...selectorForm.register('vendedorId')}
            >
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombreCompleto}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {/* ── Paso 2: Items temporales ── */}
      {selectorValido && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">2. Ventas del vendedor</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {vendedorNombre(watchedVendedor)} · {sucursalNombre(watchedSucursal)} · {formatDate(watchedFecha)}
              </p>
            </div>
            <Button onClick={openAddModal} size="sm">
              <PlusCircle className="h-4 w-4 mr-1.5" /> Agregar venta
            </Button>
          </div>

          {tempItems.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Método de pago</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tempItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{formatCurrency(item.cantidad)}</TableCell>
                      <TableCell><Badge variant="secondary">{metodoPagoNombre(item.metodoPagoId)}</Badge></TableCell>
                      <TableCell className="text-gray-400 text-xs">{item.notas ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditItemModal(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-semibold text-gray-900">
                  Total: {formatCurrency(tempItems.reduce((s, i) => s + i.cantidad, 0))}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleNuevoRegistro}>Cancelar</Button>
                  <Button size="sm" onClick={handleGuardarRegistro}>
                    <Save className="h-4 w-4 mr-1.5" /> Guardar registro
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <ShoppingCartEmpty />
              <p className="mt-2 text-sm">Sin ventas agregadas aún</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tabla de registros guardados ── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Registros guardados</h2>
        {registros.length === 0 ? (
          <p className="text-sm text-gray-400">No hay registros guardados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sucursal</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Total ventas</TableHead>
                <TableHead>Métodos usados</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...registros].reverse().map(reg => {
                const total = reg.items.reduce((s, i) => s + i.cantidad, 0)
                const metodos = [...new Set(reg.items.map(i => metodoPagoNombre(i.metodoPagoId)))]
                const notas = reg.items.flatMap(i => i.notas ? [i.notas] : []).join(', ')
                return (
                  <TableRow key={reg.id}>
                    <TableCell>{sucursalNombre(reg.sucursalId)}</TableCell>
                    <TableCell>{formatDate(reg.fecha)}</TableCell>
                    <TableCell>{vendedorNombre(reg.vendedorId)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {metodos.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 max-w-xs truncate">{notas || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => deleteRegistro(reg.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Modal de agregar/editar item ── */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar venta' : 'Agregar venta'}
        description="Ingresa los datos de la venta"
      >
        <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cantidad">Cantidad (MXN)</Label>
            <Input
              id="cantidad"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...itemForm.register('cantidad')}
            />
            {itemForm.formState.errors.cantidad && (
              <p className="text-xs text-red-500">{itemForm.formState.errors.cantidad.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metodoPago">Método de pago</Label>
            <Select id="metodoPago" placeholder="Seleccionar..." {...itemForm.register('metodoPagoId')}>
              {metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </Select>
            {itemForm.formState.errors.metodoPagoId && (
              <p className="text-xs text-red-500">{itemForm.formState.errors.metodoPagoId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea id="notas" rows={3} placeholder="Observaciones..." {...itemForm.register('notas')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}

function ShoppingCartEmpty() {
  return (
    <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
