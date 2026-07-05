'use client'
// Hook para gestión de métodos de pago — CRUD contra el backend real
import { useCallback } from 'react'
import { api } from '@/lib/api'
import type { MetodoPago } from '@/lib/mock-data'
import { createCatalogStore } from './catalog-cache'

interface UseMetodosPagoReturn {
  metodosPago: MetodoPago[]
  loading: boolean
  loaded: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string, tipo?: string) => Promise<void>
  update: (m: MetodoPago) => Promise<void>
  remove: (id: string) => Promise<void>
}

function inferTipo(nombre: string): string {
  const normalized = nombre.trim().toUpperCase()

  if (normalized.includes('EFECTIVO')) return 'EFECTIVO'
  if (normalized.includes('TARJETA')) return 'TARJETA'
  if (normalized.includes('TRANSFERENCIA')) return 'TRANSFERENCIA'

  return 'OTRO'
}

const metodosPagoStore = createCatalogStore<MetodoPago>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: MetodoPago[] }>('/api/envelope/metodos-pago')
    return data.data
  },
  'Error al cargar métodos de pago',
)

export function useMetodosPago(): UseMetodosPagoReturn {
  const { items: metodosPago, loading, loaded, error, refetch } = metodosPagoStore.useStore()

  const add = useCallback(async (nombre: string, tipo?: string) => {
    await api.post('/api/envelope/metodos-pago', {
      nombre,
      tipo: tipo ?? inferTipo(nombre),
    })
    await refetch()
  }, [refetch])

  const update = useCallback(async (m: MetodoPago) => {
    await api.put(`/api/envelope/metodos-pago/${m.id}`, { nombre: m.nombre })
    await refetch()
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/metodos-pago/${id}`)
    await refetch()
  }, [refetch])

  return { metodosPago, loading, loaded, error, refetch, add, update, remove }
}
