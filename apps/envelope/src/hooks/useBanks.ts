'use client'
// Hook para gestión de bancos — CRUD contra el backend real
import { useCallback } from 'react'
import { api } from '@/lib/api'
import type { Bank } from '@cosmetics/types'
import { createCatalogStore } from './catalog-cache'

interface UseBanksReturn {
  banks: Bank[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string) => Promise<void>
  update: (b: Bank) => Promise<void>
  remove: (id: string) => Promise<void>
}

const banksStore = createCatalogStore<Bank>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: Bank[] }>('/api/envelope/banks')
    return data.data
  },
  'Error al cargar bancos',
)

export function useBanks(): UseBanksReturn {
  const { items: banks, loading, error, refetch } = banksStore.useStore()

  const add = useCallback(async (nombre: string) => {
    await api.post('/api/envelope/banks', { nombre })
    await refetch()
  }, [refetch])

  const update = useCallback(async (b: Bank) => {
    await api.put(`/api/envelope/banks/${b.id}`, { nombre: b.nombre })
    await refetch()
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/banks/${id}`)
    await refetch()
  }, [refetch])

  return { banks, loading, error, refetch, add, update, remove }
}
