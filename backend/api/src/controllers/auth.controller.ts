// Controlador de autenticación
// Maneja login y consulta del usuario autenticado
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import type { JwtPayload } from '../types/jwt'

// Esquema de validación para el cuerpo del login
const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
})

/**
 * POST /api/auth/login
 * Valida credenciales y devuelve un JWT firmado.
 */
export async function login(req: Request, res: Response): Promise<void> {
  // Validar cuerpo de la solicitud
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      data: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const { email, password } = parsed.data

  try {
    // Buscar usuario activo por email
    const usuario = await prisma.usuario.findFirst({
      where: { email, activo: true },
      include: { sucursal: { select: { id: true, nombre: true } } },
    })

    // Mismo mensaje para usuario no encontrado y contraseña incorrecta
    // (evitar enumeración de usuarios)
    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas',
        data: null,
      })
      return
    }

    const passwordOk = await bcrypt.compare(password, usuario.passwordHash)
    if (!passwordOk) {
      res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas',
        data: null,
      })
      return
    }

    // Construir payload del JWT (sin datos sensibles)
    const payload: JwtPayload = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      sucursalId: usuario.sucursalId,
    }

    const secret = process.env['JWT_SECRET']!
    const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '7d') as jwt.SignOptions['expiresIn']

    const token = jwt.sign(payload, secret, { expiresIn })

    res.status(200).json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          sucursal: usuario.sucursal,
        },
      },
    })
  } catch (err) {
    console.error('[auth.login]', err)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      data: null,
    })
  }
}

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario autenticado a partir de req.user.
 * Requiere authMiddleware previo.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const payload = req.user

  if (!payload) {
    res.status(401).json({ success: false, message: 'No autenticado', data: null })
    return
  }

  try {
    // Refrescar datos desde la BD (por si cambiaron desde que se emitió el token)
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        sucursalId: true,
        sucursal: { select: { id: true, nombre: true } },
        creadoEn: true,
      },
    })

    if (!usuario || !usuario.activo) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        data: null,
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'OK',
      data: usuario,
    })
  } catch (err) {
    console.error('[auth.me]', err)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      data: null,
    })
  }
}
