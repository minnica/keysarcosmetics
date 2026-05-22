// Middleware de autorización por rol
// Verifica que el usuario autenticado tenga el nivel de rol mínimo requerido
import type { Request, Response, NextFunction } from 'express'
import type { Rol } from '@prisma/client'

// Jerarquía de roles: mayor número = más permisos
const ROLE_HIERARCHY: Record<Rol, number> = {
  SUPER_ADMIN: 3,
  GERENTE: 2,
  CAPTURISTA: 1,
}

/**
 * Fábrica de middleware que protege rutas según el rol mínimo requerido.
 * Debe usarse siempre DESPUÉS de authMiddleware.
 *
 * Ejemplo:
 *   router.get('/admin', authMiddleware, requireRole('SUPER_ADMIN'), handler)
 */
export function requireRole(requiredRole: Rol) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user

    // authMiddleware debería haber puesto esto, pero nos protegemos
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
        data: null,
      })
      return
    }

    const userLevel = ROLE_HIERARCHY[user.rol]
    const requiredLevel = ROLE_HIERARCHY[requiredRole]

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        message: `Se requiere rol ${requiredRole} o superior`,
        data: null,
      })
      return
    }

    next()
  }
}
