'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { ScreenKey, UsuarioSession } from '@cosmetics/types'
import { api } from '@/lib/api'
import { getFirstAccessiblePath, getScreenConfigByPath } from './access'

export interface SessionUser extends UsuarioSession {
  sucursal?: { id: string; nombre: string } | null
}

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionContextValue {
  user: SessionUser | null
  status: SessionStatus
  isAuthenticated: boolean
  canAccess: (screenKey: ScreenKey) => boolean
  isAccessManager: boolean
  firstAccessiblePath: string | null
  refreshSession: () => Promise<void>
  logout: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

async function fetchSession(): Promise<SessionUser | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (!token) return null

  const response = await api.get<{ success: boolean; data: SessionUser }>('/api/auth/me')
  return response.data.data
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')

  const refreshSession = useCallback(async () => {
    try {
      const nextUser = await fetchSession()
      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'unauthenticated')
    } catch {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [])

  const value = useMemo<SessionContextValue>(() => {
    const permissions = user?.screenPermissions ?? []
    const permissionSet = new Set(permissions)
    const isAccessManager = Boolean(user?.canManageAccess)

    return {
      user,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      canAccess: (screenKey: ScreenKey) => isAccessManager || permissionSet.has(screenKey),
      isAccessManager,
      firstAccessiblePath: user ? getFirstAccessiblePath(permissions, isAccessManager) : null,
      refreshSession,
      logout,
    }
  }, [logout, refreshSession, user, status])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession debe usarse dentro de SessionProvider')
  }
  return ctx
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status, user, firstAccessiblePath, isAccessManager } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!user) {
      router.replace('/login')
      return
    }

    const screen = getScreenConfigByPath(pathname)
    const hasAccess = screen
      ? (screen.key === 'accesos'
        ? isAccessManager
        : (isAccessManager || user.screenPermissions.includes(screen.key)))
      : true

    if (hasAccess) {
      return
    }

    const fallback = firstAccessiblePath ?? '/login'
    if (pathname !== fallback) {
      router.replace(fallback)
    }
  }, [firstAccessiblePath, isAccessManager, pathname, router, status, user])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Cargando sesión...
      </div>
    )
  }

  if (!user) {
    return null
  }

  const screen = getScreenConfigByPath(pathname)
  if (screen && !(screen.key === 'accesos' ? isAccessManager : (isAccessManager || user.screenPermissions.includes(screen.key)))) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Redirigiendo...
      </div>
    )
  }

  return <>{children}</>
}
