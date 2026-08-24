// Controlador de autenticación
// Maneja login y consulta del usuario autenticado
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import type { JwtPayload } from '../types/jwt'
import { resolveAccess, toSessionUser } from '../lib/access'

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
    const usuario = (await prisma.usuario.findFirst({
      where: { email, activo: true },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        empleado: { select: { id: true, nombreCompleto: true } },
      },
    })) as {
      id: string
      nombre: string
      email: string
      passwordHash: string
      rol: JwtPayload['rol']
      activo: boolean
      sucursalId: string | null
      empleadoId: string | null
      empleado: { id: string; nombreCompleto: string } | null
      sucursal: { id: string; nombre: string } | null
      creadoEn: Date
    } | null

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
      empleadoId: usuario.empleadoId ?? null,
    }

    const secret = process.env['JWT_SECRET']

    if (!secret) {
      throw new Error('JWT_SECRET no está definido')
    }

    const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '7d') as SignOptions['expiresIn']

    const signOptions: SignOptions = {
      expiresIn,
    }

    const token = jwt.sign(payload, secret, signOptions)
    const access = await resolveAccess(usuario.id)

    if (!access) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        data: null,
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        token,
        usuario: toSessionUser(access, {
          id: usuario.id,
          nombre: usuario.empleado?.nombreCompleto ?? usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          activo: usuario.activo,
          sucursalId: usuario.sucursalId,
          creadoEn: usuario.creadoEn,
        }),
        empleado: usuario.empleado,
        sucursal: usuario.sucursal,
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
    const usuario = (await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        sucursalId: true,
        empleadoId: true,
        empleado: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
        sucursal: { select: { id: true, nombre: true } },
        creadoEn: true,
      },
    })) as {
      id: string
      nombre: string
      email: string
      rol: JwtPayload['rol']
      activo: boolean
      sucursalId: string | null
      empleadoId: string | null
      empleado: { id: string; nombreCompleto: string } | null
      sucursal: { id: string; nombre: string } | null
      creadoEn: Date
    } | null

    if (!usuario || !usuario.activo) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        data: null,
      })
      return
    }

    const access = await resolveAccess(usuario.id)

    if (!access) {
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
      data: {
        ...toSessionUser(access, {
          id: usuario.id,
          nombre: usuario.empleado?.nombreCompleto ?? usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          activo: usuario.activo,
          sucursalId: usuario.sucursalId,
          creadoEn: usuario.creadoEn,
        }),
        empleado: usuario.empleado,
        sucursal: usuario.sucursal,
      },
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
