// Tipos del payload JWT que circula entre middleware y controladores
import type { Rol } from '@prisma/client'

export interface JwtPayload {
  id: string
  nombre: string
  email: string
  rol: Rol
  sucursalId: string | null
  iat?: number
  exp?: number
}
