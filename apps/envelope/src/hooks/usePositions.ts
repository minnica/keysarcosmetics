'use client'
// Hook para gestión de puestos — CRUD contra el backend real
import { useCallback } from 'react'
import { api } from '@/lib/api'
import type { Position } from '@cosmetics/types'
import { createCatalogStore } from './catalog-cache'

interface UsePositionsReturn {
  positions: Position[]
  loading: boolean
  loaded: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string) => Promise<void>
  update: (p: Position) => Promise<void>
  remove: (id: string) => Promise<void>
}

const positionsStore = createCatalogStore<Position>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: Position[] }>('/api/envelope/positions')
    return data.data
  },
  'Error al cargar puestos',
)

export function usePositions(): UsePositionsReturn {
  const { items: positions, loading, loaded, error, refetch } = positionsStore.useStore()

  const add = useCallback(async (nombre: string) => {
    await api.post('/api/envelope/positions', { nombre })
    await refetch()
  }, [refetch])

  const update = useCallback(async (p: Position) => {
    await api.put(`/api/envelope/positions/${p.id}`, { nombre: p.nombre })
    await refetch()
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/positions/${id}`)
    await refetch()
  }, [refetch])

  return { positions, loading, loaded, error, refetch, add, update, remove }
}
