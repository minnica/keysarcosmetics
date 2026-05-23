'use client'
// Hook para gestión de puestos — CRUD contra el backend real
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Position } from '@cosmetics/types'

interface UsePositionsReturn {
  positions: Position[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string) => Promise<void>
  update: (p: Position) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function usePositions(): UsePositionsReturn {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: Position[] }>('/api/envelope/positions')
      setPositions(data.data)
    } catch {
      setError('Error al cargar puestos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

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

  return { positions, loading, error, refetch, add, update, remove }
}
