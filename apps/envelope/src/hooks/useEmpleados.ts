'use client'
// Hook para gestión de empleados — CRUD contra el backend real
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Empleado } from '@/lib/mock-data'

interface UseEmpleadosReturn {
  empleados: Empleado[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (e: Omit<Empleado, 'id'>) => Promise<void>
  update: (e: Empleado) => Promise<void>
  remove: (id: string) => Promise<void>
}

// Convierte la respuesta del backend al tipo local (Decimal → number, incluye relaciones FK)
function toEmpleado(raw: Record<string, unknown>): Empleado {
  return {
    id: raw['id'] as string,
    nombres: raw['nombres'] as string,
    apellidoPaterno: raw['apellidoPaterno'] as string,
    apellidoMaterno: raw['apellidoMaterno'] as string,
    nombreCompleto: raw['nombreCompleto'] as string,
    banco: raw['banco'] as string,
    numeroCuenta: raw['numeroCuenta'] as string,
    puesto: raw['puesto'] as string,
    metaIndividual: Number(raw['metaIndividual']),
    bankId: (raw['bankId'] as string | null) ?? null,
    bank: (raw['bank'] as Empleado['bank']) ?? null,
    positionId: (raw['positionId'] as string | null) ?? null,
    position: (raw['position'] as Empleado['position']) ?? null,
  }
}

export function useEmpleados(): UseEmpleadosReturn {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: Record<string, unknown>[] }>('/api/envelope/empleados')
      setEmpleados(data.data.map(toEmpleado))
    } catch {
      setError('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const add = useCallback(async (e: Omit<Empleado, 'id'>) => {
    await api.post('/api/envelope/empleados', e)
    await refetch()
  }, [refetch])

  const update = useCallback(async (e: Empleado) => {
    await api.put(`/api/envelope/empleados/${e.id}`, e)
    await refetch()
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/empleados/${id}`)
    await refetch()
  }, [refetch])

  return { empleados, loading, error, refetch, add, update, remove }
}
