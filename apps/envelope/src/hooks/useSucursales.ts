'use client'
// Hook para gestión de sucursales — CRUD contra el backend real
import { useCallback } from 'react'
import { api } from '@/lib/api'
import type { Sucursal } from '@/lib/mock-data'
import { createCatalogStore } from './catalog-cache'

interface UseSucursalesReturn {
  sucursales: Sucursal[]
  loading: boolean
  loaded: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (s: Pick<Sucursal, 'nombre' | 'metaMensual'>) => Promise<void>
  update: (s: Pick<Sucursal, 'id' | 'nombre' | 'metaMensual'>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleStatus: (id: string, activa: boolean) => Promise<void>
}

function toSucursal(raw: Record<string, unknown>): Sucursal {
  return {
    id: raw['id'] as string,
    nombre: raw['nombre'] as string,
    metaMensual: Number(raw['metaMensual'] ?? 0),
    activa: (raw['activa'] as boolean) ?? true,
    desactivadaEn: (raw['desactivadaEn'] as string | null) ?? null,
  }
}

const sucursalesStore = createCatalogStore<Sucursal>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: Record<string, unknown>[] }>('/api/envelope/sucursales')
    return data.data.map(toSucursal)
  },
  'Error al cargar sucursales',
)

const allSucursalesStore = createCatalogStore<Sucursal>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: Record<string, unknown>[] }>('/api/envelope/sucursales', {
      params: { includeInactive: true },
    })
    return data.data.map(toSucursal)
  },
  'Error al cargar sucursales',
)

async function refreshBranchStores(): Promise<void> {
  await Promise.all([sucursalesStore.refetch(), allSucursalesStore.refetch()])
}

function useBranchStore(includeInactive: boolean): UseSucursalesReturn {
  const store = includeInactive ? allSucursalesStore : sucursalesStore
  const { items: sucursales, loading, loaded, error, refetch } = store.useStore()

  const add = useCallback(async (s: Pick<Sucursal, 'nombre' | 'metaMensual'>) => {
    await api.post('/api/envelope/sucursales', s)
    await refreshBranchStores()
  }, [])

  const update = useCallback(async (s: Pick<Sucursal, 'id' | 'nombre' | 'metaMensual'>) => {
    await api.put(`/api/envelope/sucursales/${s.id}`, {
      nombre: s.nombre,
      metaMensual: s.metaMensual,
    })
    await refreshBranchStores()
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/sucursales/${id}`)
    await refreshBranchStores()
  }, [])

  const toggleStatus = useCallback(async (id: string, activa: boolean) => {
    await api.patch(`/api/envelope/sucursales/${id}/status`, { activa })
    await refreshBranchStores()
  }, [])

  return { sucursales, loading, loaded, error, refetch, add, update, remove, toggleStatus }
}

export function useSucursales(): UseSucursalesReturn {
  return useBranchStore(false)
}

export function useAllSucursales(): UseSucursalesReturn {
  return useBranchStore(true)
}
