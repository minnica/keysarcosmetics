import type { NextFunction, Request, Response } from 'express'
import type { Rol } from '@prisma/client'
import { prisma } from '../prisma/client'

export const ACCESS_SCREEN_ORDER = [
  'dashboard',
  'ventas',
  'ventas/generar-sobre',
  'citas',
  'servicios',
  'empleados',
  'empleados/sueldo',
  'reportes/ver-datos-keysar-home',
  'sucursales',
  'metodos-pago',
  'bancos',
  'puestos',
  'reportes/detalle-metodo-pago',
  'reportes/metodo-pago-por-dia',
  'reportes/ventas-por-vendedor',
  'reportes/ventas-por-vendedor-dia',
  'reportes/total-general',
  'reportes/citas',
  'accesos',
] as const

export type ScreenKey = (typeof ACCESS_SCREEN_ORDER)[number]

export interface ResolvedAccess {
  userId: string
  rol: Rol
  activo: boolean
  empleadoId: string | null
  positionId: string | null
  positionName: string | null
  canManageAccess: boolean
  selfDataOnly: boolean
  screenPermissions: ScreenKey[]
}

export interface AccessUserRecord {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  sucursalId: string | null
  empleadoId: string | null
  positionId: string | null
  positionName: string | null
  canManageAccess: boolean
  selfDataOnly: boolean
  screenPermissions: ScreenKey[]
  creadoEn: Date
}

async function fetchAccess(userId: string): Promise<ResolvedAccess | null> {
  const usuario = (await (prisma as any).usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      rol: true,
      activo: true,
      empleadoId: true,
      empleado: {
        select: {
          id: true,
          positionId: true,
          position: {
            select: {
              id: true,
              nombre: true,
              canManageAccess: true,
              selfDataOnly: true,
              screenPermissions: {
                select: { screenKey: true, allowed: true },
              },
            },
          },
        },
      },
    },
  })) as {
    id: string
    rol: Rol
    activo: boolean
    empleadoId: string | null
    empleado?: {
      id: string
      positionId: string | null
      position?: {
        id: string
        nombre: string
        canManageAccess: boolean
        selfDataOnly: boolean
        screenPermissions: Array<{ screenKey: ScreenKey; allowed: boolean }>
      } | null
    } | null
  } | null

  if (!usuario || !usuario.activo) {
    return null
  }

  const position = usuario.empleado?.position ?? null
  const isGlobalAdmin = usuario.rol === 'SUPER_ADMIN'
  const canManageAccess = Boolean(isGlobalAdmin || position?.canManageAccess)

  const screenPermissions = canManageAccess
    ? [...ACCESS_SCREEN_ORDER]
    : (position?.screenPermissions ?? [])
        .filter((permission: { screenKey: ScreenKey; allowed: boolean }) => permission.allowed)
        .map((permission: { screenKey: ScreenKey; allowed: boolean }) => permission.screenKey)

  return {
    userId: usuario.id,
    rol: usuario.rol,
    activo: usuario.activo,
    empleadoId: usuario.empleado?.id ?? usuario.empleadoId ?? null,
    positionId: position?.id ?? null,
    positionName: position?.nombre ?? null,
    canManageAccess,
    selfDataOnly: Boolean(!canManageAccess && position?.selfDataOnly),
    screenPermissions: [...new Set(screenPermissions)],
  }
}

export async function resolveAccess(userId: string): Promise<ResolvedAccess | null> {
  return fetchAccess(userId)
}

export async function resolveAccessForRequest(req: Request): Promise<ResolvedAccess | null> {
  if (!req.user) {
    return null
  }

  return fetchAccess(req.user.id)
}

export async function requireAccessManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  const access = await resolveAccessForRequest(req)

  if (!access) {
    res.status(401).json({ success: false, message: 'No autenticado', data: null })
    return
  }

  if (!access.canManageAccess) {
    res.status(403).json({ success: false, message: 'No tienes permisos para administrar accesos', data: null })
    return
  }

  next()
}

export function requireScreenAccess(screenKey: ScreenKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const access = await resolveAccessForRequest(req)

    if (!access) {
      res.status(401).json({ success: false, message: 'No autenticado', data: null })
      return
    }

    if (!access.canManageAccess && !access.screenPermissions.includes(screenKey)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta pantalla',
        data: null,
      })
      return
    }

    next()
  }
}

export function requireAnyScreenAccess(screenKeys: readonly ScreenKey[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const access = await resolveAccessForRequest(req)

    if (!access) {
      res.status(401).json({ success: false, message: 'No autenticado', data: null })
      return
    }

    if (!access.canManageAccess && !screenKeys.some((screenKey) => access.screenPermissions.includes(screenKey))) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta pantalla',
        data: null,
      })
      return
    }

    next()
  }
}

export function toSessionUser(access: ResolvedAccess, usuario: {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  sucursalId: string | null
  creadoEn: Date
}) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
    sucursalId: usuario.sucursalId,
    creadoEn: usuario.creadoEn,
    empleadoId: access.empleadoId,
    positionId: access.positionId,
    positionName: access.positionName,
    canManageAccess: access.canManageAccess,
    selfDataOnly: access.selfDataOnly,
    screenPermissions: access.screenPermissions,
  }
}
