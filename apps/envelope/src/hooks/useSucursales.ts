'use client'
// Hook para gestión de sucursales — CRUD contra el backend real
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Sucursal } from '@/lib/mock-data'

interface UseSucursalesReturn {
  sucursales: Sucursal[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (nombre: string) => Promise<void>
  update: (s: Sucursal) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useSucursales(): UseSucursalesReturn {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: Sucursal[] }>('/api/envelope/sucursales')
      setSucursales(data.data)
    } catch {
      setError('Error al cargar sucursales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

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
