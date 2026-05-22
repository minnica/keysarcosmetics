// Middleware de autenticación JWT
// Extrae y verifica el token del header Authorization: Bearer <token>
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/jwt'

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization']

  // Verificar que el header existe y tiene el formato correcto
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido',
      data: null,
    })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env['JWT_SECRET']

  if (!secret) {
    res.status(500).json({
      success: false,
      message: 'Error de configuración del servidor',
      data: null,
    })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload
    // Adjuntar el payload decodificado al request para uso en controladores
    req.user = payload
    next()
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError
        ? 'El token ha expirado'
        : 'Token inválido'

    res.status(401).json({ success: false, message, data: null })
  }
}
