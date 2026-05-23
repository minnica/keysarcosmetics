'use client'
// Hook para gestión de bancos — CRUD contra el backend real
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Bank } from '@cosmetics/types'

interface UseBanksReturn {
  banks: Bank[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string) => Promise<void>
  update: (b: Bank) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useBanks(): UseBanksReturn {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: Bank[] }>('/api/envelope/banks')
      setBanks(data.data)
    } catch {
      setError('Error al cargar bancos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

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
