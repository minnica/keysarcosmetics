'use client'
// Hook para gestión de métodos de pago — CRUD contra el backend real
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { MetodoPago } from '@/lib/mock-data'

interface UseMetodosPagoReturn {
  metodosPago: MetodoPago[]
  loading: boolean
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

export function useMetodosPago(): UseMetodosPagoReturn {
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: MetodoPago[] }>('/api/envelope/metodos-pago')
      setMetodosPago(data.data)
    } catch {
      setError('Error al cargar métodos de pago')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

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

  return { metodosPago, loading, error, refetch, add, update, remove }
}