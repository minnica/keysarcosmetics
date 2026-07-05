'use client'
// Hook para gestión de empleados — CRUD contra el backend real
import { useCallback } from 'react'
import { api } from '@/lib/api'
import type { Empleado } from '@/lib/mock-data'
import { createCatalogStore } from './catalog-cache'

interface UseEmpleadosReturn {
  empleados: Empleado[]
  loading: boolean
  loaded: boolean
  error: string | null
  refetch: () => Promise<void>
  add: (e: Omit<Empleado, 'id'>) => Promise<void>
  update: (e: Partial<Empleado> & Pick<Empleado, 'id'>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleStatus: (id: string, activo: boolean) => Promise<void>
}

// Convierte la respuesta del backend al tipo local (Decimal → number, incluye relaciones FK)
function toEmpleado(raw: Record<string, unknown>): Empleado {
  const rawBirthDate = raw['fechaNacimiento']
  return {
    id: raw['id'] as string,
    nombres: raw['nombres'] as string,
    apellidoPaterno: raw['apellidoPaterno'] as string,
    apellidoMaterno: raw['apellidoMaterno'] as string,
    nombreCompleto: raw['nombreCompleto'] as string,
    banco: raw['banco'] as string,
    numeroCuenta: raw['numeroCuenta'] as string,
    puesto: raw['puesto'] as string,
    sueldo: raw['sueldo'] != null ? Number(raw['sueldo']) : null,
    fechaNacimiento:
      typeof rawBirthDate === 'string' && rawBirthDate.length >= 10
        ? rawBirthDate.slice(0, 10)
        : null,
    numeroTelefono: (raw['numeroTelefono'] as string | null) ?? null,
    metaIndividual: Number(raw['metaIndividual']),
    bankId: (raw['bankId'] as string | null) ?? null,
    bank: (raw['bank'] as Empleado['bank']) ?? null,
    positionId: (raw['positionId'] as string | null) ?? null,
    position: (raw['position'] as Empleado['position']) ?? null,
    activo: (raw['activo'] as boolean) ?? true,
  }
}

const empleadosStore = createCatalogStore<Empleado>(
  async () => {
    const { data } = await api.get<{ success: boolean; data: Record<string, unknown>[] }>('/api/envelope/empleados')
    return data.data.map(toEmpleado)
  },
  'Error al cargar empleados',
)

export function useEmpleados(): UseEmpleadosReturn {
  const { items: empleados, loading, loaded, error, refetch } = empleadosStore.useStore()

  const add = useCallback(async (e: Omit<Empleado, 'id'>) => {
    await api.post('/api/envelope/empleados', e)
    await refetch()
  }, [refetch])

  const update = useCallback(async (e: Partial<Empleado> & Pick<Empleado, 'id'>) => {
    await api.put(`/api/envelope/empleados/${e.id}`, e)
    await refetch()
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/envelope/empleados/${id}`)
    await refetch()
  }, [refetch])

  const toggleStatus = useCallback(async (id: string, activo: boolean) => {
    await api.patch(`/api/envelope/empleados/${id}/status`, { activo })
    await refetch()
  }, [refetch])

  return { empleados, loading, loaded, error, refetch, add, update, remove, toggleStatus }
}
