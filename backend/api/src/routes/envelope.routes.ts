// Rutas del módulo Envelope — ventas por sobre digitalizado
import { Router, type Router as ExpressRouter } from 'express'
import { Prisma } from '@prisma/client'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireAnyScreenAccess, requireScreenAccess, resolveAccessForRequest } from '../lib/access'
import { prisma } from '../prisma/client'

const router: ExpressRouter = Router()
const DEFAULT_VENTAS_LOOKBACK_DAYS = 31
const MAX_VENTAS_RANGE_DAYS = 366
const MAX_VENTAS_LIMIT = 5000

// Todas las rutas de este módulo requieren autenticación
router.use(authMiddleware)

const access = {
  dashboard: requireScreenAccess('dashboard'),
  ventas: requireScreenAccess('ventas'),
  empleados: requireScreenAccess('empleados'),
  sucursales: requireScreenAccess('sucursales'),
  metodosPago: requireScreenAccess('metodos-pago'),
  lecturaMetodosPago: requireAnyScreenAccess(['metodos-pago', 'reportes/metodo-pago-por-dia']),
  banks: requireScreenAccess('bancos'),
  positions: requireScreenAccess('puestos'),
  detalleMetodoPago: requireScreenAccess('reportes/detalle-metodo-pago'),
  metodoPagoPorDia: requireScreenAccess('reportes/metodo-pago-por-dia'),
  ventasPorVendedor: requireScreenAccess('reportes/ventas-por-vendedor'),
  ventasPorVendedorDia: requireScreenAccess('reportes/ventas-por-vendedor-dia'),
  totalGeneral: requireScreenAccess('reportes/total-general'),
}

function normalizeDateInput(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseQueryDate(value?: string): Date | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return normalizeDateInput(trimmed)
}

function dateRangeSql(fechaInicio?: string, fechaFin?: string, extraConditions: Prisma.Sql[] = []): Prisma.Sql {
  const conditions: Prisma.Sql[] = [...extraConditions]
  if (fechaInicio) {
    conditions.push(Prisma.sql`v."fecha" >= ${new Date(fechaInicio)}`)
  }
  if (fechaFin) {
    conditions.push(Prisma.sql`v."fecha" <= ${new Date(`${fechaFin}T23:59:59`)}`)
  }

  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty
}

function monthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59),
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

async function canViewSalary(req: Parameters<typeof resolveAccessForRequest>[0]): Promise<boolean> {
  const access = await resolveAccessForRequest(req)
  return Boolean(access?.canManageAccess || access?.screenPermissions.includes('empleados/sueldo'))
}

async function canViewKeysarHomeData(req: Parameters<typeof resolveAccessForRequest>[0]): Promise<boolean> {
  const access = await resolveAccessForRequest(req)
  return Boolean(access?.canManageAccess || access?.screenPermissions.includes('reportes/ver-datos-keysar-home'))
}

function redactSalary<T extends { sueldo?: unknown }>(record: T, visible: boolean): T & { sueldo: unknown } {
  return {
    ...record,
    sueldo: visible ? record.sueldo ?? null : null,
  }
}

// ─── SUCURSALES ───────────────────────────────────────────────────────────────

router.get('/sucursales', async (_req, res) => {
  try {
    const data = await prisma.sucursal.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener sucursales' })
  }
})

router.post('/sucursales', access.sucursales, async (req, res) => {
  try {
    const { nombre } = req.body as { nombre: string }
    if (!nombre?.trim()) {
      res.status(400).json({ success: false, data: null, message: 'El nombre es requerido' })
      return
    }
    const data = await prisma.sucursal.create({ data: { nombre: nombre.trim() } })
    res.status(201).json({ success: true, data, message: 'Sucursal creada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al crear sucursal' })
  }
})

router.put('/sucursales/:id', access.sucursales, async (req, res) => {
  try {
    const { nombre, activa } = req.body as { nombre?: string; activa?: boolean }
    const data = await prisma.sucursal.update({
      where: { id: req.params['id'] },
      data: { ...(nombre !== undefined && { nombre }), ...(activa !== undefined && { activa }) },
    })
    res.json({ success: true, data, message: 'Sucursal actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar sucursal' })
  }
})

router.delete('/sucursales/:id', access.sucursales, async (req, res) => {
  try {
    await prisma.sucursal.update({ where: { id: req.params['id'] }, data: { activa: false } })
    res.json({ success: true, data: null, message: 'Sucursal desactivada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar sucursal' })
  }
})

// ─── EMPLEADOS ────────────────────────────────────────────────────────────────

router.get('/empleados', access.empleados, async (req, res) => {
  try {
    const data = await prisma.empleado.findMany({
      orderBy: [{ activo: 'desc' }, { nombreCompleto: 'asc' }],
      include: { bank: true, position: true },
    })
    const salaryVisible = await canViewSalary(req)
    const response = data.map((empleado) => redactSalary(empleado as typeof empleado & { sueldo?: unknown }, salaryVisible))
    res.json({ success: true, data: response, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener empleados' })
  }
})

router.post('/empleados', access.empleados, async (req, res) => {
  try {
    const { nombres, apellidoPaterno, apellidoMaterno, banco, numeroCuenta, puesto, metaIndividual, bankId, positionId, sueldo, fechaNacimiento, numeroTelefono } =
      req.body as {
        nombres: string
        apellidoPaterno: string
        apellidoMaterno: string
        banco?: string
        numeroCuenta: string
        puesto?: string
        metaIndividual: number
        bankId?: string
        positionId?: string
        sueldo?: number | null
        fechaNacimiento?: string | null
        numeroTelefono?: string | null
      }

    // Resolver banco: si viene bankId, valida FK y deriva nombre legacy
    let finalBanco = banco ?? ''
    let finalBankId: string | undefined = undefined

    if (bankId) {
      const bank = await prisma.bank.findFirst({ where: { id: bankId, activo: true } })
      if (!bank) {
        res.status(400).json({ success: false, data: null, message: 'Banco no encontrado o inactivo' })
        return
      }
      finalBanco = bank.nombre
      finalBankId = bank.id
    }

    // Resolver puesto: si viene positionId, valida FK y deriva nombre legacy
    let finalPuesto = puesto ?? ''
    let finalPositionId: string | undefined = undefined

    if (positionId) {
      const position = await prisma.position.findFirst({ where: { id: positionId, activo: true } })
      if (!position) {
        res.status(400).json({ success: false, data: null, message: 'Puesto no encontrado o inactivo' })
        return
      }
      finalPuesto = position.nombre
      finalPositionId = position.id
    }

    const nombreCompleto = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ')
    const normalizedFechaNacimiento = normalizeDateInput(fechaNacimiento)
    const data = await prisma.empleado.create({
      data: {
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        nombreCompleto,
        banco: finalBanco,
        numeroCuenta,
        puesto: finalPuesto,
        metaIndividual,
        ...(normalizedFechaNacimiento !== undefined && { fechaNacimiento: normalizedFechaNacimiento }),
        ...(sueldo !== undefined && { sueldo }),
        ...(numeroTelefono !== undefined && { numeroTelefono }),
        ...(finalBankId !== undefined && { bankId: finalBankId }),
        ...(finalPositionId !== undefined && { positionId: finalPositionId }),
      },
      include: { bank: true, position: true },
    })
    const salaryVisible = await canViewSalary(req)
    res.status(201).json({
      success: true,
      data: redactSalary(data as typeof data & { sueldo?: unknown }, salaryVisible),
      message: 'Empleado creado',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al crear empleado' })
  }
})

router.put('/empleados/:id', access.empleados, async (req, res) => {
  try {
    const { nombres, apellidoPaterno, apellidoMaterno, banco, numeroCuenta, puesto, metaIndividual, activo, bankId, positionId, sueldo, fechaNacimiento, numeroTelefono } =
      req.body as Partial<{
        nombres: string
        apellidoPaterno: string
        apellidoMaterno: string
        banco: string
        numeroCuenta: string
        puesto: string
        metaIndividual: number
        activo: boolean
        bankId: string
        positionId: string
        sueldo: number | null
        fechaNacimiento: string | null
        numeroTelefono: string | null
      }>
    const existing = await prisma.empleado.findUnique({ where: { id: req.params['id'] } })
    if (!existing) {
      res.status(404).json({ success: false, data: null, message: 'Empleado no encontrado' })
      return
    }

    // Resolver banco: si viene bankId, valida FK y deriva nombre legacy
    let bankUpdate: { banco?: string; bankId?: string } = {}
    if (bankId !== undefined) {
      const bank = await prisma.bank.findFirst({ where: { id: bankId, activo: true } })
      if (!bank) {
        res.status(400).json({ success: false, data: null, message: 'Banco no encontrado o inactivo' })
        return
      }
      bankUpdate = { banco: bank.nombre, bankId: bank.id }
    } else if (banco !== undefined) {
      bankUpdate = { banco }
    }

    // Resolver puesto: si viene positionId, valida FK y deriva nombre legacy
    let positionUpdate: { puesto?: string; positionId?: string } = {}
    if (positionId !== undefined) {
      const position = await prisma.position.findFirst({ where: { id: positionId, activo: true } })
      if (!position) {
        res.status(400).json({ success: false, data: null, message: 'Puesto no encontrado o inactivo' })
        return
      }
      positionUpdate = { puesto: position.nombre, positionId: position.id }
    } else if (puesto !== undefined) {
      positionUpdate = { puesto }
    }

    const n = nombres ?? existing.nombres
    const ap = apellidoPaterno ?? existing.apellidoPaterno
    const am = apellidoMaterno ?? existing.apellidoMaterno
    const nombreCompleto = [n, ap, am].filter(Boolean).join(' ')
    const normalizedFechaNacimiento = normalizeDateInput(fechaNacimiento)
    const data = await prisma.empleado.update({
      where: { id: req.params['id'] },
      data: {
        ...(nombres !== undefined && { nombres }),
        ...(apellidoPaterno !== undefined && { apellidoPaterno }),
        ...(apellidoMaterno !== undefined && { apellidoMaterno }),
        nombreCompleto,
        ...bankUpdate,
        ...(numeroCuenta !== undefined && { numeroCuenta }),
        ...positionUpdate,
        ...(metaIndividual !== undefined && { metaIndividual }),
        ...(normalizedFechaNacimiento !== undefined && { fechaNacimiento: normalizedFechaNacimiento }),
        ...(sueldo !== undefined && { sueldo }),
        ...(numeroTelefono !== undefined && { numeroTelefono }),
        ...(activo !== undefined && { activo }),
      },
      include: { bank: true, position: true },
    })
    const salaryVisible = await canViewSalary(req)
    res.json({
      success: true,
      data: redactSalary(data as typeof data & { sueldo?: unknown }, salaryVisible),
      message: 'Empleado actualizado',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar empleado' })
  }
})

router.delete('/empleados/:id', access.empleados, async (req, res) => {
  try {
    const ventaCount = await prisma.venta.count({ where: { vendedorId: req.params['id'] } })
    if (ventaCount > 0) {
      res.status(409).json({ success: false, data: null, message: 'No se puede eliminar: el empleado tiene ventas registradas. Usa "Desactivar" en su lugar.' })
      return
    }
    await prisma.empleado.delete({ where: { id: req.params['id'] } })
    res.json({ success: true, data: null, message: 'Empleado eliminado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar empleado' })
  }
})

router.patch('/empleados/:id/status', access.empleados, async (req, res) => {
  try {
    const { activo } = req.body as { activo: boolean }
    if (typeof activo !== 'boolean') {
      res.status(400).json({ success: false, data: null, message: 'El campo activo debe ser boolean' })
      return
    }
    const existing = await prisma.empleado.findUnique({ where: { id: req.params['id'] } })
    if (!existing) {
      res.status(404).json({ success: false, data: null, message: 'Empleado no encontrado' })
      return
    }
    const data = await prisma.empleado.update({
      where: { id: req.params['id'] },
      data: { activo },
      include: { bank: true, position: true },
    })
    const salaryVisible = await canViewSalary(req)
    res.json({
      success: true,
      data: redactSalary(data as typeof data & { sueldo?: unknown }, salaryVisible),
      message: activo ? 'Empleado activado' : 'Empleado desactivado',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar estatus del empleado' })
  }
})

// ─── MÉTODOS DE PAGO ──────────────────────────────────────────────────────────

router.get('/metodos-pago', access.lecturaMetodosPago, async (_req, res) => {
  try {
    const data = await prisma.metodoPago.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener métodos de pago' })
  }
})

router.post('/metodos-pago', access.metodosPago, async (req, res) => {
  try {
    const { nombre, tipo } = req.body as { nombre: string; tipo: string }
    const data = await prisma.metodoPago.create({
      data: { nombre, tipo: tipo as 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO' },
    })
    res.status(201).json({ success: true, data, message: 'Método de pago creado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al crear método de pago' })
  }
})

router.put('/metodos-pago/:id', access.metodosPago, async (req, res) => {
  try {
    const { nombre, tipo, activo } = req.body as Partial<{ nombre: string; tipo: string; activo: boolean }>
    const data = await prisma.metodoPago.update({
      where: { id: req.params['id'] },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(tipo !== undefined && { tipo: tipo as 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO' }),
        ...(activo !== undefined && { activo }),
      },
    })
    res.json({ success: true, data, message: 'Método de pago actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar método de pago' })
  }
})

router.delete('/metodos-pago/:id', access.metodosPago, async (req, res) => {
  try {
    const data = await prisma.metodoPago.update({
      where: { id: req.params['id'] },
      data: { activo: false },
    })
    res.json({ success: true, data, message: 'Método de pago desactivado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar método de pago' })
  }
})

// ─── BANCOS ───────────────────────────────────────────────────────────────────

router.get('/banks', access.banks, async (_req, res) => {
  try {
    const data = await prisma.bank.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener bancos' })
  }
})

router.post('/banks', access.banks, async (req, res) => {
  try {
    const { nombre } = req.body as { nombre: string }
    const trimmed = nombre?.trim()
    if (!trimmed) {
      res.status(400).json({ success: false, data: null, message: 'El nombre es requerido' })
      return
    }
    const duplicate = await prisma.bank.findFirst({
      where: { nombre: { equals: trimmed, mode: 'insensitive' } },
    })
    if (duplicate) {
      if (!duplicate.activo) {
        const data = await prisma.bank.update({ where: { id: duplicate.id }, data: { activo: true } })
        res.status(201).json({ success: true, data, message: 'Banco reactivado' })
        return
      }
      res.status(409).json({ success: false, data: null, message: 'Ya existe un banco con ese nombre' })
      return
    }
    const data = await prisma.bank.create({ data: { nombre: trimmed } })
    res.status(201).json({ success: true, data, message: 'Banco creado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al crear banco' })
  }
})

router.put('/banks/:id', access.banks, async (req, res) => {
  try {
    const { nombre } = req.body as { nombre?: string }
    const trimmed = nombre?.trim()
    if (!trimmed) {
      res.status(400).json({ success: false, data: null, message: 'El nombre es requerido' })
      return
    }
    const existing = await prisma.bank.findUnique({ where: { id: req.params['id'] } })
    if (!existing) {
      res.status(404).json({ success: false, data: null, message: 'Banco no encontrado' })
      return
    }
    const duplicate = await prisma.bank.findFirst({
      where: { nombre: { equals: trimmed, mode: 'insensitive' }, id: { not: req.params['id'] }, activo: true },
    })
    if (duplicate) {
      res.status(409).json({ success: false, data: null, message: 'Ya existe un banco con ese nombre' })
      return
    }
    const data = await prisma.bank.update({ where: { id: req.params['id'] }, data: { nombre: trimmed } })
    res.json({ success: true, data, message: 'Banco actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar banco' })
  }
})

router.delete('/banks/:id', access.banks, async (req, res) => {
  try {
    const data = await prisma.bank.update({
      where: { id: req.params['id'] },
      data: { activo: false },
    })
    res.json({ success: true, data, message: 'Banco desactivado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar banco' })
  }
})

// ─── PUESTOS ──────────────────────────────────────────────────────────────────

router.get('/positions', access.positions, async (_req, res) => {
  try {
    const data = await prisma.position.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener puestos' })
  }
})

router.post('/positions', access.positions, async (req, res) => {
  try {
    const { nombre } = req.body as { nombre: string }
    const trimmed = nombre?.trim()
    if (!trimmed) {
      res.status(400).json({ success: false, data: null, message: 'El nombre es requerido' })
      return
    }
    const duplicate = await prisma.position.findFirst({
      where: { nombre: { equals: trimmed, mode: 'insensitive' } },
    })
    if (duplicate) {
      if (!duplicate.activo) {
        const data = await prisma.position.update({ where: { id: duplicate.id }, data: { activo: true } })
        res.status(201).json({ success: true, data, message: 'Puesto reactivado' })
        return
      }
      res.status(409).json({ success: false, data: null, message: 'Ya existe un puesto con ese nombre' })
      return
    }
    const data = await prisma.position.create({ data: { nombre: trimmed } })
    res.status(201).json({ success: true, data, message: 'Puesto creado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al crear puesto' })
  }
})

router.put('/positions/:id', access.positions, async (req, res) => {
  try {
    const { nombre } = req.body as { nombre?: string }
    const trimmed = nombre?.trim()
    if (!trimmed) {
      res.status(400).json({ success: false, data: null, message: 'El nombre es requerido' })
      return
    }
    const existing = await prisma.position.findUnique({ where: { id: req.params['id'] } })
    if (!existing) {
      res.status(404).json({ success: false, data: null, message: 'Puesto no encontrado' })
      return
    }
    const duplicate = await prisma.position.findFirst({
      where: { nombre: { equals: trimmed, mode: 'insensitive' }, id: { not: req.params['id'] }, activo: true },
    })
    if (duplicate) {
      res.status(409).json({ success: false, data: null, message: 'Ya existe un puesto con ese nombre' })
      return
    }
    const data = await prisma.position.update({ where: { id: req.params['id'] }, data: { nombre: trimmed } })
    res.json({ success: true, data, message: 'Puesto actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar puesto' })
  }
})

router.delete('/positions/:id', access.positions, async (req, res) => {
  try {
    const data = await prisma.position.update({
      where: { id: req.params['id'] },
      data: { activo: false },
    })
    res.json({ success: true, data, message: 'Puesto desactivado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar puesto' })
  }
})

// ─── VENTAS ───────────────────────────────────────────────────────────────────

router.get('/ventas', access.ventas, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, limit, page } = req.query as {
      fechaInicio?: string
      fechaFin?: string
      limit?: string
      page?: string
    }
    const parsedStart = parseQueryDate(fechaInicio)
    const parsedEnd = parseQueryDate(fechaFin)

    if (parsedStart === null || parsedEnd === null) {
      res.status(400).json({ success: false, data: null, message: 'Rango de fechas inválido' })
      return
    }

    const rangeEnd = endOfDay(parsedEnd ?? parsedStart ?? new Date())
    const rangeStart = startOfDay(parsedStart ?? addDays(rangeEnd, -(DEFAULT_VENTAS_LOOKBACK_DAYS - 1)))

    if (rangeStart > rangeEnd) {
      res.status(400).json({ success: false, data: null, message: 'La fecha inicial no puede ser mayor a la fecha final' })
      return
    }

    if (daysBetween(rangeStart, rangeEnd) > MAX_VENTAS_RANGE_DAYS) {
      res.status(400).json({ success: false, data: null, message: `El rango máximo de consulta es de ${MAX_VENTAS_RANGE_DAYS} días` })
      return
    }

    const requestedLimit = parsePositiveInt(limit)
    const take = requestedLimit ? Math.min(requestedLimit, MAX_VENTAS_LIMIT) : undefined
    const requestedPage = parsePositiveInt(page) ?? 1

    const data = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        detalles: { include: { metodoPago: true } },
        sucursal: true,
        vendedor: true,
      },
      orderBy: { fecha: 'desc' },
      ...(take ? { take, skip: (requestedPage - 1) * take } : {}),
    })
    if (take) {
      res.setHeader('X-Result-Limit', String(take))
      res.setHeader('X-Result-Page', String(requestedPage))
    }
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener ventas' })
  }
})

router.post('/ventas', access.ventas, async (req, res) => {
  try {
    const { sucursalId, vendedorId, fecha, notas, sesionId, detalles } = req.body as {
      sucursalId: string
      vendedorId: string
      fecha: string
      notas?: string
      sesionId?: string
      detalles: { cantidad: number; metodoPagoId: string }[]
    }
    if (!sucursalId || !vendedorId || !fecha || !detalles?.length) {
      res.status(400).json({ success: false, data: null, message: 'Datos incompletos' })
      return
    }
    const data = await prisma.venta.create({
      data: {
        fecha: new Date(fecha),
        notas,
        ...(sesionId ? { sesionId } : {}),
        sucursalId,
        vendedorId,
        detalles: {
          create: detalles.map((d) => ({
            cantidad: d.cantidad,
            metodoPagoId: d.metodoPagoId,
          })),
        },
      },
      include: { detalles: { include: { metodoPago: true } } },
    })
    res.status(201).json({ success: true, data, message: 'Venta registrada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al registrar venta' })
  }
})

// Guarda en una sola transacción las ventas que integran un voucher multiempleado.
router.post('/ventas/lote', access.ventas, async (req, res) => {
  try {
    type VentaInput = {
      sucursalId: string
      vendedorId: string
      fecha: string
      notas?: string
      sesionId?: string
      detalles: { cantidad: number; metodoPagoId: string }[]
    }
    const { ventas } = req.body as { ventas?: VentaInput[] }

    const invalidSale = !ventas?.length || ventas.some((venta) =>
      !venta.sucursalId ||
      !venta.vendedorId ||
      !venta.fecha ||
      !venta.detalles?.length ||
      venta.detalles.some((detalle) => detalle.cantidad <= 0 || !detalle.metodoPagoId),
    )
    if (invalidSale) {
      res.status(400).json({ success: false, data: null, message: 'Datos incompletos' })
      return
    }

    const data = await prisma.$transaction(
      ventas.map((venta) => prisma.venta.create({
        data: {
          fecha: new Date(venta.fecha),
          ...(venta.notas ? { notas: venta.notas } : {}),
          ...(venta.sesionId ? { sesionId: venta.sesionId } : {}),
          sucursalId: venta.sucursalId,
          vendedorId: venta.vendedorId,
          detalles: {
            create: venta.detalles.map((detalle) => ({
              cantidad: detalle.cantidad,
              metodoPagoId: detalle.metodoPagoId,
            })),
          },
        },
        include: { detalles: { include: { metodoPago: true } } },
      })),
    )

    res.status(201).json({ success: true, data, message: 'Venta registrada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al registrar venta' })
  }
})

router.put('/ventas/:id', access.ventas, async (req, res) => {
  try {
    const { notas, detalles } = req.body as {
      notas?: string
      detalles?: { cantidad: number; metodoPagoId: string }[]
    }
    if (detalles) {
      await prisma.ventaDetalle.deleteMany({ where: { ventaId: req.params['id'] } })
    }
    const data = await prisma.venta.update({
      where: { id: req.params['id'] },
      data: {
        ...(notas !== undefined && { notas }),
        ...(detalles && {
          detalles: {
            create: detalles.map((d) => ({
              cantidad: d.cantidad,
              metodoPagoId: d.metodoPagoId,
            })),
          },
        }),
      },
      include: { detalles: { include: { metodoPago: true } } },
    })
    res.json({ success: true, data, message: 'Venta actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar venta' })
  }
})

router.delete('/ventas/:id', access.ventas, async (req, res) => {
  try {
    await prisma.venta.delete({ where: { id: req.params['id'] } })
    res.json({ success: true, data: null, message: 'Venta eliminada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar venta' })
  }
})

// ─── REPORTES ─────────────────────────────────────────────────────────────────

router.get('/reportes/detalle-metodo-pago', access.detalleMetodoPago, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const data = await prisma.$queryRaw<Array<{ sucursalId: string; sucursalNombre: string; metodoPagoId: string; metodoPagoNombre: string; total: number }>>`
      SELECT
        v."sucursalId",
        s."nombre" AS "sucursalNombre",
        vd."metodoPagoId",
        mp."nombre" AS "metodoPagoNombre",
        SUM(vd."cantidad")::float AS "total"
      FROM "VentaDetalle" vd
      JOIN "Venta" v ON v."id" = vd."ventaId"
      JOIN "Sucursal" s ON s."id" = v."sucursalId"
      JOIN "MetodoPago" mp ON mp."id" = vd."metodoPagoId"
      ${dateRangeSql(fechaInicio, fechaFin)}
      GROUP BY v."sucursalId", s."nombre", vd."metodoPagoId", mp."nombre"
      ORDER BY s."nombre" ASC, mp."nombre" ASC
    `
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/metodo-pago-por-dia', access.metodoPagoPorDia, async (req, res) => {
  try {
    const { metodoPagoId, mes, anio } = req.query as { metodoPagoId?: string; mes?: string; anio?: string }
    const year = Number(anio ?? new Date().getFullYear())
    const month = Number(mes ?? new Date().getMonth() + 1)
    const { start, end } = monthRange(year, month)
    const methodFilter = metodoPagoId ? Prisma.sql`AND vd."metodoPagoId" = ${metodoPagoId}` : Prisma.empty
    const data = await prisma.$queryRaw<Array<{ fecha: string; sucursalId: string; sucursalNombre: string; total: number }>>`
      SELECT
        TO_CHAR(v."fecha", 'YYYY-MM-DD') AS "fecha",
        v."sucursalId",
        s."nombre" AS "sucursalNombre",
        SUM(vd."cantidad")::float AS "total"
      FROM "VentaDetalle" vd
      JOIN "Venta" v ON v."id" = vd."ventaId"
      JOIN "Sucursal" s ON s."id" = v."sucursalId"
      WHERE v."fecha" >= ${start}
        AND v."fecha" <= ${end}
        ${methodFilter}
      GROUP BY TO_CHAR(v."fecha", 'YYYY-MM-DD'), v."sucursalId", s."nombre"
      ORDER BY "fecha" ASC, s."nombre" ASC
    `
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/ventas-por-vendedor', access.ventasPorVendedor, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const includeKeysarHome = await canViewKeysarHomeData(req)
    const rows = await prisma.$queryRaw<Array<{ empleadoId: string; nombreCompleto: string; sucursalId: string; sucursalNombre: string; totalVendido: number; meta: number }>>`
      SELECT
        v."vendedorId" AS "empleadoId",
        e."nombreCompleto",
        v."sucursalId",
        s."nombre" AS "sucursalNombre",
        SUM(vd."cantidad")::float AS "totalVendido",
        e."metaIndividual"::float AS "meta"
      FROM "VentaDetalle" vd
      JOIN "Venta" v ON v."id" = vd."ventaId"
      JOIN "Empleado" e ON e."id" = v."vendedorId"
      JOIN "Sucursal" s ON s."id" = v."sucursalId"
      ${dateRangeSql(
        fechaInicio,
        fechaFin,
        includeKeysarHome ? [] : [Prisma.sql`e."nombreCompleto" <> ${'KEYSAR HOME'}`],
      )}
      GROUP BY v."vendedorId", e."nombreCompleto", v."sucursalId", s."nombre", e."metaIndividual"
      ORDER BY "totalVendido" DESC
    `
    const data = rows.map((row) => ({ ...row, porLlegar: Math.max(0, row.meta - row.totalVendido), porcentaje: row.meta > 0 ? (row.totalVendido / row.meta) * 100 : 0 }))
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/ventas-por-vendedor-dia', access.ventasPorVendedorDia, async (req, res) => {
  try {
    const { vendedorId, fechaInicio, fechaFin } = req.query as { vendedorId?: string; fechaInicio?: string; fechaFin?: string }
    const conditions: Prisma.Sql[] = []
    const includeKeysarHome = await canViewKeysarHomeData(req)
    if (fechaInicio) conditions.push(Prisma.sql`v."fecha" >= ${new Date(fechaInicio)}`)
    if (fechaFin) conditions.push(Prisma.sql`v."fecha" <= ${new Date(`${fechaFin}T23:59:59`)}`)
    if (vendedorId) conditions.push(Prisma.sql`v."vendedorId" = ${vendedorId}`)
    if (!includeKeysarHome) conditions.push(Prisma.sql`e."nombreCompleto" <> ${'KEYSAR HOME'}`)
    const where = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty
    const data = await prisma.$queryRaw<Array<{ fecha: string; vendedorId: string; vendedorNombre: string; total: number }>>`
      SELECT
        TO_CHAR(v."fecha", 'YYYY-MM-DD') AS "fecha",
        v."vendedorId",
        e."nombreCompleto" AS "vendedorNombre",
        SUM(vd."cantidad")::float AS "total"
      FROM "VentaDetalle" vd
      JOIN "Venta" v ON v."id" = vd."ventaId"
      JOIN "Empleado" e ON e."id" = v."vendedorId"
      ${where}
      GROUP BY TO_CHAR(v."fecha", 'YYYY-MM-DD'), v."vendedorId", e."nombreCompleto"
      ORDER BY "fecha" ASC, e."nombreCompleto" ASC
    `
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/total-general', access.totalGeneral, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const rows = await prisma.$queryRaw<Array<{ fecha: string; sucursalId: string; sucursalNombre: string; total: number }>>`
      SELECT
        TO_CHAR(v."fecha", 'YYYY-MM-DD') AS "fecha",
        v."sucursalId",
        s."nombre" AS "sucursalNombre",
        SUM(vd."cantidad")::float AS "total"
      FROM "VentaDetalle" vd
      JOIN "Venta" v ON v."id" = vd."ventaId"
      JOIN "Sucursal" s ON s."id" = v."sucursalId"
      ${dateRangeSql(fechaInicio, fechaFin)}
      GROUP BY TO_CHAR(v."fecha", 'YYYY-MM-DD'), v."sucursalId", s."nombre"
      ORDER BY "fecha" ASC, s."nombre" ASC
    `
    const grouped = new Map<string, Array<{ sucursalId: string; sucursalNombre: string; total: number }>>()
    for (const row of rows) {
      const current = grouped.get(row.fecha) ?? []
      current.push({ sucursalId: row.sucursalId, sucursalNombre: row.sucursalNombre, total: row.total })
      grouped.set(row.fecha, current)
    }
    const data = [...grouped.entries()].map(([fecha, porSucursal]) => ({
      fecha,
      porSucursal,
      totalDia: porSucursal.reduce((sum, row) => sum + row.total, 0),
    }))
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/dashboard', access.dashboard, async (req, res) => {
  try {
    const { fecha } = req.query as { fecha?: string }
    const ref = fecha ? new Date(fecha) : new Date()
    const refYear = ref.getFullYear()
    const refMonth = ref.getMonth()
    const inicioDia = new Date(refYear, refMonth, ref.getDate())
    const finDia = new Date(refYear, refMonth, ref.getDate(), 23, 59, 59)
    const inicioMesDate = new Date(refYear, refMonth, 1)
    const finMesDate = new Date(refYear, refMonth + 1, 0, 23, 59, 59)
    const inicioAnio = new Date(refYear, 0, 1)
    const finAnio = new Date(refYear, 11, 31, 23, 59, 59)

    const monthRanges = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(refYear, refMonth - (5 - index), 1)
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
      }
    })

    const periods = [
      { key: 'dia', start: inicioDia, end: finDia },
      { key: 'mes', start: inicioMesDate, end: finMesDate },
      { key: 'anio', start: inicioAnio, end: finAnio },
      ...monthRanges.map((range, index) => ({
        key: `month_${index}`,
        start: range.start,
        end: range.end,
      })),
    ]
    const periodValues = Prisma.join(periods.map((period) => Prisma.sql`(
      ${period.key},
      ${period.start},
      ${period.end}
    )`))

    const [branchTotals, ventasPorVendedor] = await Promise.all([
      prisma.$queryRaw<Array<{ period: string; sucursalId: string; sucursalNombre: string; total: number }>>`
        WITH periods("period", "startDate", "endDate") AS (
          VALUES ${periodValues}
        )
        SELECT
          p."period",
          s."id" AS "sucursalId",
          s."nombre" AS "sucursalNombre",
          COALESCE(SUM(vd."cantidad"), 0)::float AS "total"
        FROM periods p
        CROSS JOIN "Sucursal" s
        LEFT JOIN "Venta" v
          ON v."sucursalId" = s."id"
          AND v."fecha" >= p."startDate"
          AND v."fecha" <= p."endDate"
        LEFT JOIN "VentaDetalle" vd ON vd."ventaId" = v."id"
        GROUP BY p."period", s."id", s."nombre"
        ORDER BY p."period" ASC, s."nombre" ASC
      `,
      prisma.$queryRaw<Array<{ empleadoId: string; nombre: string; vendido: number; meta: number }>>`
        SELECT
          e."id" AS "empleadoId",
          e."nombreCompleto" AS "nombre",
          COALESCE(SUM(vd."cantidad"), 0)::float AS "vendido",
          e."metaIndividual"::float AS "meta"
        FROM "Empleado" e
        LEFT JOIN "Venta" v
          ON v."vendedorId" = e."id"
          AND v."fecha" >= ${inicioMesDate}
          AND v."fecha" <= ${finMesDate}
        LEFT JOIN "VentaDetalle" vd ON vd."ventaId" = v."id"
        WHERE e."activo" = true
        GROUP BY e."id", e."nombreCompleto", e."metaIndividual"
        ORDER BY "vendido" DESC, e."nombreCompleto" ASC
      `,
    ])

    const totalsByPeriod = new Map<string, Array<{ sucursalId: string; sucursalNombre: string; total: number }>>()
    for (const total of branchTotals) {
      const rows = totalsByPeriod.get(total.period) ?? []
      rows.push({
        sucursalId: total.sucursalId,
        sucursalNombre: total.sucursalNombre,
        total: total.total,
      })
      totalsByPeriod.set(total.period, rows)
    }

    const dia = totalsByPeriod.get('dia') ?? []
    const mes = totalsByPeriod.get('mes') ?? []
    const anio = totalsByPeriod.get('anio') ?? []
    const monthsData = monthRanges.map((range, index) => ({
      year: range.year,
      month: range.month,
      totals: totalsByPeriod.get(`month_${index}`) ?? [],
    }))

    res.json({ success: true, data: { dia, mes, anio, monthsData, ventasPorVendedor }, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar dashboard' })
  }
})

export default router
