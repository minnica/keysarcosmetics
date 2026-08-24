import { Router, type Router as ExpressRouter } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { PAYROLL_SCREEN_KEYS, type PayrollScreenKey } from '@cosmetics/types'
import { requirePayrollAccessManager } from '../lib/access'
import { authMiddleware } from '../middlewares/auth.middleware'
import { prisma } from '../prisma/client'

const router: ExpressRouter = Router()
const db = prisma as any

router.use(authMiddleware)
router.use(requirePayrollAccessManager)

const permissionSchema = z.object({
  canManagePayrollAccess: z.boolean(),
  permissions: z.array(
    z.object({
      screenKey: z.custom<PayrollScreenKey>(
        (value): value is PayrollScreenKey =>
          typeof value === 'string' &&
          PAYROLL_SCREEN_KEYS.includes(value as PayrollScreenKey),
        { message: 'Pantalla de Payroll inválida' },
      ),
      allowed: z.boolean(),
      canWrite: z.boolean().default(true),
    }),
  ),
})

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).optional(),
})

router.get('/bootstrap', async (_req, res) => {
  try {
    const [positions, employees, users] = await Promise.all([
      db.position.findMany({
        orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
        include: {
          payrollScreenPermissions: { orderBy: { screenKey: 'asc' } },
          _count: { select: { empleados: true } },
        },
      }),
      db.empleado.findMany({
        orderBy: [{ activo: 'desc' }, { nombreCompleto: 'asc' }],
        select: {
          id: true,
          nombreCompleto: true,
          activo: true,
          positionId: true,
          position: {
            select: {
              id: true,
              nombre: true,
              canManagePayrollAccess: true,
            },
          },
        },
      }),
      db.usuario.findMany({
        orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          empleadoId: true,
          empleado: {
            select: {
              id: true,
              nombreCompleto: true,
              position: {
                select: {
                  id: true,
                  nombre: true,
                  canManagePayrollAccess: true,
                },
              },
            },
          },
        },
      }),
    ])

    res.json({
      success: true,
      data: { screens: PAYROLL_SCREEN_KEYS, positions, employees, users },
      message: 'OK',
    })
  } catch (error) {
    console.error('[payroll.access.bootstrap]', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener los accesos de Payroll',
    })
  }
})

router.put('/positions/:id/permissions', async (req, res) => {
  try {
    const parsed = permissionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        data: parsed.error.flatten().fieldErrors,
        message: 'Revisa los permisos enviados',
      })
      return
    }

    const positionId = req.params['id']
    const position = await db.position.findUnique({
      where: { id: positionId },
      select: { id: true },
    })
    if (!position) {
      res.status(404).json({
        success: false,
        data: null,
        message: 'Puesto no encontrado',
      })
      return
    }

    const uniquePermissions = new Map(
      parsed.data.permissions.map((permission) => [
        permission.screenKey,
        permission,
      ]),
    )

    await db.$transaction(async (tx: any) => {
      await tx.position.update({
        where: { id: positionId },
        data: {
          canManagePayrollAccess: parsed.data.canManagePayrollAccess,
        },
      })
      await tx.positionPayrollScreenPermission.deleteMany({
        where: { positionId },
      })
      await tx.positionPayrollScreenPermission.createMany({
        data: PAYROLL_SCREEN_KEYS.map((screenKey) => ({
          positionId,
          screenKey,
          allowed: parsed.data.canManagePayrollAccess
            ? true
            : Boolean(uniquePermissions.get(screenKey)?.allowed),
          canWrite: parsed.data.canManagePayrollAccess
            ? true
            : Boolean(
                uniquePermissions.get(screenKey)?.allowed &&
                  uniquePermissions.get(screenKey)?.canWrite,
              ),
        })),
      })
    })

    const data = await db.position.findUnique({
      where: { id: positionId },
      include: {
        payrollScreenPermissions: { orderBy: { screenKey: 'asc' } },
        _count: { select: { empleados: true } },
      },
    })

    res.json({ success: true, data, message: 'Permisos de Payroll actualizados' })
  } catch (error) {
    console.error('[payroll.access.permissions]', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar los permisos de Payroll',
    })
  }
})

router.put('/users/:employeeId/credentials', async (req, res) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        data: parsed.error.flatten().fieldErrors,
        message: 'Revisa el correo y la contraseña',
      })
      return
    }

    const employee = await db.empleado.findUnique({
      where: { id: req.params['employeeId'] },
      include: { position: true },
    })
    if (!employee) {
      res.status(404).json({
        success: false,
        data: null,
        message: 'Empleado no encontrado',
      })
      return
    }

    const existing = await db.usuario.findUnique({
      where: { empleadoId: employee.id },
    })
    if (!existing && !parsed.data.password) {
      res.status(400).json({
        success: false,
        data: null,
        message: 'La contraseña es obligatoria para crear la cuenta',
      })
      return
    }

    const passwordHash = parsed.data.password
      ? await bcrypt.hash(parsed.data.password, 12)
      : null
    const email = parsed.data.email.toLowerCase()
    const data = await db.usuario.upsert({
      where: { empleadoId: employee.id },
      update: {
        nombre: employee.nombreCompleto,
        email,
        ...(passwordHash
          ? { passwordHash, passwordChangedAt: new Date() }
          : {}),
        passwordSetupTokenHash: null,
        passwordSetupTokenExpiresAt: null,
      },
      create: {
        nombre: employee.nombreCompleto,
        email,
        passwordHash: passwordHash ?? '',
        rol: 'CAPTURISTA',
        activo: true,
        sucursalId: null,
        empleadoId: employee.id,
        passwordChangedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        empleadoId: true,
        empleado: {
          select: {
            id: true,
            nombreCompleto: true,
            position: {
              select: {
                id: true,
                nombre: true,
                canManagePayrollAccess: true,
              },
            },
          },
        },
      },
    })

    res.status(existing ? 200 : 201).json({
      success: true,
      data,
      message: existing ? 'Credenciales actualizadas' : 'Credenciales creadas',
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        success: false,
        data: null,
        message: 'Ya existe una cuenta para ese empleado o correo',
      })
      return
    }

    console.error('[payroll.access.credentials]', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al guardar las credenciales',
    })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await db.usuario.findUnique({
      where: { id: req.params['id'] },
    })
    if (!user) {
      res.status(404).json({
        success: false,
        data: null,
        message: 'Cuenta no encontrada',
      })
      return
    }
    if (user.rol === 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        data: null,
        message: 'La cuenta principal no se puede eliminar',
      })
      return
    }

    await db.usuario.delete({ where: { id: user.id } })
    res.json({ success: true, data: null, message: 'Cuenta eliminada' })
  } catch (error) {
    console.error('[payroll.access.delete-user]', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar la cuenta',
    })
  }
})

export default router
