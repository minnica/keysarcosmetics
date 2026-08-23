import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
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
    }),
  ),
})

router.get('/bootstrap', async (_req, res) => {
  try {
    const positions = await db.position.findMany({
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
      include: {
        payrollScreenPermissions: { orderBy: { screenKey: 'asc' } },
        _count: { select: { empleados: true } },
      },
    })

    res.json({
      success: true,
      data: { screens: PAYROLL_SCREEN_KEYS, positions },
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
        permission.allowed,
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
            : Boolean(uniquePermissions.get(screenKey)),
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

export default router
