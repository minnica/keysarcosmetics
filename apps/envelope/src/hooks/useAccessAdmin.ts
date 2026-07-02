'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Rol, ScreenKey } from '@cosmetics/types'
import { api } from '@/lib/api'

export interface AccessPermission {
  screenKey: ScreenKey
  allowed: boolean
}

export interface AccessPosition {
  id: string
  nombre: string
  activo: boolean
  canManageAccess: boolean
  screenPermissions: AccessPermission[]
}

export interface AccessEmployee {
  id: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
  activo: boolean
  positionId: string | null
  position: {
    id: string
    nombre: string
    canManageAccess: boolean
  } | null
}

export interface AccessUser {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  sucursalId: string | null
  empleadoId: string | null
  empleado: {
    id: string
    nombreCompleto: string
    position: {
      id: string
      nombre: string
      canManageAccess: boolean
    } | null
  } | null
}

interface AccessBootstrapResponse {
  screens: ScreenKey[]
  positions: AccessPosition[]
  employees: AccessEmployee[]
  users: AccessUser[]
}

interface SaveCredentialsInput {
  email: string
  password?: string
  rol?: Rol
  sucursalId?: string | null
  activo?: boolean
}

interface UseAccessAdminReturn {
  screens: ScreenKey[]
  positions: AccessPosition[]
  employees: AccessEmployee[]
  users: AccessUser[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  savePositionPermissions: (
    positionId: string,
    payload: { canManageAccess: boolean; permissions: AccessPermission[] },
    options?: { refetch?: boolean },
  ) => Promise<void>
  saveCredentials: (employeeId: string, payload: SaveCredentialsInput) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
}

export function useAccessAdmin(): UseAccessAdminReturn {
  const [screens, setScreens] = useState<ScreenKey[]>([])
  const [positions, setPositions] = useState<AccessPosition[]>([])
  const [employees, setEmployees] = useState<AccessEmployee[]>([])
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: AccessBootstrapResponse }>('/api/envelope/access/bootstrap')
      setScreens(data.data.screens)
      setPositions(data.data.positions)
      setEmployees(data.data.employees)
      setUsers(data.data.users)
    } catch {
      setError('Error al cargar accesos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const savePositionPermissions = useCallback(
    async (positionId: string, payload: { canManageAccess: boolean; permissions: AccessPermission[] }, options?: { refetch?: boolean }) => {
      await api.put(`/api/envelope/access/positions/${positionId}/permissions`, payload)
      if (options?.refetch !== false) {
        await refetch()
      }
    },
    [refetch],
  )

  const saveCredentials = useCallback(
    async (employeeId: string, payload: SaveCredentialsInput) => {
      await api.put(`/api/envelope/access/users/${employeeId}/credentials`, payload)
      await refetch()
    },
    [refetch],
  )

  const deleteUser = useCallback(
    async (userId: string) => {
      await api.delete(`/api/envelope/access/users/${userId}`)
      await refetch()
    },
    [refetch],
  )

  return {
    screens,
    positions,
    employees,
    users,
    loading,
    error,
    refetch,
    savePositionPermissions,
    saveCredentials,
    deleteUser,
  }
}
