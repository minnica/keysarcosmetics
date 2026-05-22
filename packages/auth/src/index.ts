// Lógica de autenticación y autorización compartida
import type { Usuario, Rol } from '@cosmetics/types'
import jwt from 'jsonwebtoken'

// Jerarquía de roles: mayor número = más permisos
export const ROLE_HIERARCHY: Record<Rol, number> = {
  SUPER_ADMIN: 3,
  GERENTE: 2,
  CAPTURISTA: 1,
}

/**
 * Verifica la validez de un JWT y lanza error si no es válido.
 */
export function verifyToken(token: string): jwt.JwtPayload {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET no está definido en el entorno')
  return jwt.verify(token, secret) as jwt.JwtPayload
}

/**
 * Decodifica un JWT sin verificar la firma.
 * Útil para leer el payload en el cliente.
 */
export function decodeToken(token: string): jwt.JwtPayload | null {
  const decoded = jwt.decode(token)
  if (!decoded || typeof decoded === 'string') return null
  return decoded
}

/**
 * Determina si un usuario tiene al menos el rol requerido.
 */
export function hasPermission(user: Usuario, requiredRole: Rol): boolean {
  return ROLE_HIERARCHY[user.rol] >= ROLE_HIERARCHY[requiredRole]
}
