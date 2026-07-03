import { Router, type Router as ExpressRouter } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { requireAccessManager, ACCESS_SCREEN_ORDER, type ScreenKey } from '../lib/access'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: ExpressRouter = Router()
const db = prisma as any

router.use(authMiddleware)
router.use(requireAccessManager)

const permissionSchema = z.object({
  canManageAccess: z.boolean(),
  permissions: z.array(
    z.object({
      screenKey: z.custom<ScreenKey>(
        (value): value is ScreenKey => typeof value === 'string' && ACCESS_SCREEN_ORDER.includes(value as ScreenKey),
        { message: 'Pantalla inválida' },
      ),
      allowed: z.boolean(),
    }),
  ),
})

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  rol: z.enum(['SUPER_ADMIN', 'GERENTE', 'CAPTURISTA'] as const).optional(),
  sucursalId: z.string().nullable().optional(),
  activo: z.boolean().optional(),
})

async function getBootstrapData() {
  const [positions, employees, users] = await Promise.all([
    db.position.findMany({
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
      include: {
        screenPermissions: { orderBy: { screenKey: 'asc' } },
      },
    }),
    db.empleado.findMany({
      orderBy: [{ activo: 'desc' }, { nombreCompleto: 'asc' }],
      include: {
        position: true,
        bank: true,
      },
    }),
    db.usuario.findMany({
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
      include: {
        sucursal: { select: { id: true, nombre: true } },
        empleado: {
          include: {
            position: true,
          },
        },
      },
    }),
  ])

  return {
    screens: ACCESS_SCREEN_ORDER,
    positions,
    employees,
    users,
  }
}

router.get('/bootstrap', async (_req, res) => {
  try {
    const data = await getBootstrapData()
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener accesos' })
  }
})

router.put('/positions/:id/manage-access', async (req, res) => {
  try {
    const parsed = z.object({ canManageAccess: z.boolean() }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, data: null, message: 'Datos inválidos' })
      return
    }

    const position = await db.position.update({
      where: { id: req.params['id'] },
      data: { canManageAccess: parsed.data.canManageAccess },
      include: { screenPermissions: true },
    })

    res.json({ success: true, data: position, message: 'Permiso global actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar permiso global' })
  }
})

router.put('/positions/:id/permissions', async (req, res) => {
  try {
    const parsed = permissionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, data: null, message: 'Datos inválidos' })
      return
    }

    const positionId = req.params['id']

    await db.$transaction(async (tx: any) => {
      await tx.position.update({
        where: { id: positionId },
        data: { canManageAccess: parsed.data.canManageAccess },
      })

      await tx.positionScreenPermission.deleteMany({
        where: { positionId },
      })

      if (!parsed.data.canManageAccess) {
        await tx.positionScreenPermission.createMany({
          data: parsed.data.permissions.map((permission) => ({
            positionId,
            screenKey: permission.screenKey,
            allowed: permission.allowed,
          })),
        })
      }
    })

    const data = await db.position.findUnique({
      where: { id: positionId },
      include: { screenPermissions: { orderBy: { screenKey: 'asc' } } },
    })

    res.json({ success: true, data, message: 'Permisos actualizados' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar permisos' })
  }
})

router.put('/users/:employeeId/credentials', async (req, res) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, data: null, message: 'Datos inválidos' })
      return
    }

    const employee = await db.empleado.findUnique({
      where: { id: req.params['employeeId'] },
      include: { position: true },
    })

    if (!employee) {
      res.status(404).json({ success: false, data: null, message: 'Empleado no encontrado' })
      return
    }

    const existing = await db.usuario.findFirst({
      where: { empleadoId: employee.id },
    })

    if (!existing && !parsed.data.password) {
      res.status(400).json({ success: false, data: null, message: 'La contraseña es obligatoria para crear la cuenta' })
      return
    }

    const rol = parsed.data.rol ?? existing?.rol ?? (employee.position?.canManageAccess ? 'SUPER_ADMIN' : 'CAPTURISTA')
    const activo = parsed.data.activo ?? existing?.activo ?? true
    const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null

    const data = await db.usuario.upsert({
      where: {
        empleadoId: employee.id,
      },
      update: {
        nombre: employee.nombreCompleto,
        email: parsed.data.email,
        rol,
        activo,
        sucursalId: parsed.data.sucursalId === undefined ? undefined : parsed.data.sucursalId,
        ...(passwordHash ? { passwordHash, passwordChangedAt: new Date() } : {}),
        passwordSetupTokenHash: null,
        passwordSetupTokenExpiresAt: null,
      },
      create: {
        nombre: employee.nombreCompleto,
        email: parsed.data.email,
        passwordHash: passwordHash ?? '',
        rol,
        activo,
        sucursalId: parsed.data.sucursalId ?? null,
        empleadoId: employee.id,
        passwordChangedAt: new Date(),
      },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        empleado: { include: { position: true } },
      },
    })

    res.status(existing ? 200 : 201).json({
      success: true,
      data,
      message: existing ? 'Credenciales actualizadas' : 'Credenciales creadas',
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ success: false, data: null, message: 'Ya existe una cuenta para ese empleado o correo' })
      return
    }

    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al guardar credenciales' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await db.usuario.findUnique({
      where: { id: req.params['id'] },
    })

    if (!user) {
      res.status(404).json({ success: false, data: null, message: 'Cuenta no encontrada' })
      return
    }

    if (user.rol === 'SUPER_ADMIN') {
      res.status(403).json({ success: false, data: null, message: 'La cuenta principal no se puede eliminar' })
      return
    }

    await db.usuario.delete({
      where: { id: req.params['id'] },
    })

    res.json({ success: true, data: null, message: 'Cuenta eliminada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar la cuenta' })
  }
})

router.get('/users/:employeeId', async (req, res) => {
  try {
    const user = await db.usuario.findFirst({
      where: { empleadoId: req.params['employeeId'] },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        empleado: { include: { position: true } },
      },
    })

    if (!user) {
      res.status(404).json({ success: false, data: null, message: 'Cuenta no encontrada' })
      return
    }

    res.json({ success: true, data: user, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener credenciales' })
  }
})

export default router
