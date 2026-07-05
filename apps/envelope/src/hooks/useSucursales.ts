'use client'
// Hook para gestión de sucursales — CRUD contra el backend real
import { useCallback } from 'react'
import { api } from '@/lib/api'
import type { Sucursal } from '@/lib/mock-data'
import { createCatalogStore } from './catalog-cache'

interface UseSucursalesReturn {
  sucursales: Sucursal[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string) => Promise<void>
  update: (s: Sucursal) => Promise<void>
  remove: (id: string) => Promise<void>
}

const sucursalesStore = createCatalogStore<Sucursal>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: Sucursal[] }>('/api/envelope/sucursales')
    return data.data
  },
  'Error al cargar sucursales',
)

export function useSucursales(): UseSucursalesReturn {
  const { items: sucursales, loading, error, refetch } = sucursalesStore.useStore()

  const add = useCallback(async (nombre: string) => {
    await api.post('/api/envelope/sucursales', { nombre })
    await refetch()
  }, [refetch])

  const update = useCallback(async (s: Sucursal) => {
    await api.put(`/api/envelope/sucursales/${s.id}`, { nombre: s.nombre })
    await refetch()
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/sucursales/${id}`)
    await refetch()
  }, [refetch])

  return { sucursales, loading, error, refetch, add, update, remove }
}
