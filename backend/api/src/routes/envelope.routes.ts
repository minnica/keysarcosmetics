// Rutas del módulo Envelope — ventas por sobre digitalizado
import { Router, type Router as ExpressRouter } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import { prisma } from '../prisma/client'

const router: ExpressRouter = Router()

// Todas las rutas de este módulo requieren autenticación
router.use(authMiddleware)

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

router.post('/sucursales', requireRole('GERENTE'), async (req, res) => {
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

router.put('/sucursales/:id', requireRole('GERENTE'), async (req, res) => {
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

router.delete('/sucursales/:id', requireRole('GERENTE'), async (req, res) => {
  try {
    await prisma.sucursal.update({ where: { id: req.params['id'] }, data: { activa: false } })
    res.json({ success: true, data: null, message: 'Sucursal desactivada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar sucursal' })
  }
})

// ─── EMPLEADOS ────────────────────────────────────────────────────────────────

router.get('/empleados', async (_req, res) => {
  try {
    const data = await prisma.empleado.findMany({
      orderBy: [{ activo: 'desc' }, { nombreCompleto: 'asc' }],
      include: { bank: true, position: true },
    })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener empleados' })
  }
})

router.post('/empleados', requireRole('GERENTE'), async (req, res) => {
  try {
    const { nombres, apellidoPaterno, apellidoMaterno, banco, numeroCuenta, puesto, metaIndividual, bankId, positionId } =
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
        ...(finalBankId !== undefined && { bankId: finalBankId }),
        ...(finalPositionId !== undefined && { positionId: finalPositionId }),
      },
      include: { bank: true, position: true },
    })
    res.status(201).json({ success: true, data, message: 'Empleado creado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al crear empleado' })
  }
})

router.put('/empleados/:id', requireRole('GERENTE'), async (req, res) => {
  try {
    const { nombres, apellidoPaterno, apellidoMaterno, banco, numeroCuenta, puesto, metaIndividual, activo, bankId, positionId } =
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
        ...(activo !== undefined && { activo }),
      },
      include: { bank: true, position: true },
    })
    res.json({ success: true, data, message: 'Empleado actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar empleado' })
  }
})

router.delete('/empleados/:id', requireRole('GERENTE'), async (req, res) => {
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

router.patch('/empleados/:id/status', requireRole('GERENTE'), async (req, res) => {
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
    res.json({ success: true, data, message: activo ? 'Empleado activado' : 'Empleado desactivado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al actualizar estatus del empleado' })
  }
})

// ─── MÉTODOS DE PAGO ──────────────────────────────────────────────────────────

router.get('/metodos-pago', async (_req, res) => {
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

router.post('/metodos-pago', requireRole('GERENTE'), async (req, res) => {
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

router.put('/metodos-pago/:id', requireRole('GERENTE'), async (req, res) => {
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

router.delete('/metodos-pago/:id', requireRole('GERENTE'), async (req, res) => {
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

router.get('/banks', async (_req, res) => {
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

router.post('/banks', requireRole('GERENTE'), async (req, res) => {
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

router.put('/banks/:id', requireRole('GERENTE'), async (req, res) => {
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

router.delete('/banks/:id', requireRole('GERENTE'), async (req, res) => {
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

router.get('/positions', async (_req, res) => {
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

router.post('/positions', requireRole('GERENTE'), async (req, res) => {
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

router.put('/positions/:id', requireRole('GERENTE'), async (req, res) => {
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

router.delete('/positions/:id', requireRole('GERENTE'), async (req, res) => {
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

router.get('/ventas', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const where: Record<string, unknown> = {}
    if (fechaInicio ?? fechaFin) {
      where['fecha'] = {
        ...(fechaInicio && { gte: new Date(fechaInicio) }),
        ...(fechaFin && { lte: new Date(`${fechaFin}T23:59:59`) }),
      }
    }
    const data = await prisma.venta.findMany({
      where,
      include: {
        detalles: { include: { metodoPago: true } },
        sucursal: true,
        vendedor: true,
      },
      orderBy: { fecha: 'desc' },
    })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al obtener ventas' })
  }
})

router.post('/ventas', async (req, res) => {
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

router.put('/ventas/:id', requireRole('GERENTE'), async (req, res) => {
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

router.delete('/ventas/:id', requireRole('GERENTE'), async (req, res) => {
  try {
    await prisma.venta.delete({ where: { id: req.params['id'] } })
    res.json({ success: true, data: null, message: 'Venta eliminada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al eliminar venta' })
  }
})

// ─── REPORTES ─────────────────────────────────────────────────────────────────

router.get('/reportes/detalle-metodo-pago', requireRole('GERENTE'), async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const ventas = await prisma.venta.findMany({
      where: {
        fecha: {
          ...(fechaInicio && { gte: new Date(fechaInicio) }),
          ...(fechaFin && { lte: new Date(`${fechaFin}T23:59:59`) }),
        },
      },
      include: { sucursal: true, detalles: { include: { metodoPago: true } } },
    })
    const mapa = new Map<string, { sucursalId: string; sucursalNombre: string; metodoPagoId: string; metodoPagoNombre: string; total: number }>()
    for (const venta of ventas) {
      for (const detalle of venta.detalles) {
        const key = `${venta.sucursalId}||${detalle.metodoPagoId}`
        const existing = mapa.get(key)
        if (existing) {
          existing.total += Number(detalle.cantidad)
        } else {
          mapa.set(key, { sucursalId: venta.sucursalId, sucursalNombre: venta.sucursal.nombre, metodoPagoId: detalle.metodoPagoId, metodoPagoNombre: detalle.metodoPago.nombre, total: Number(detalle.cantidad) })
        }
      }
    }
    res.json({ success: true, data: [...mapa.values()], message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/metodo-pago-por-dia', requireRole('GERENTE'), async (req, res) => {
  try {
    const { metodoPagoId, mes, anio } = req.query as { metodoPagoId?: string; mes?: string; anio?: string }
    const year = Number(anio ?? new Date().getFullYear())
    const month = Number(mes ?? new Date().getMonth() + 1)
    const inicio = new Date(year, month - 1, 1)
    const fin = new Date(year, month, 0, 23, 59, 59)
    const ventas = await prisma.venta.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { sucursal: true, detalles: { where: metodoPagoId ? { metodoPagoId } : undefined, include: { metodoPago: true } } },
    })
    const mapa = new Map<string, { fecha: string; sucursalId: string; sucursalNombre: string; total: number }>()
    for (const venta of ventas) {
      const fecha = venta.fecha.toISOString().slice(0, 10)
      for (const detalle of venta.detalles) {
        const key = `${fecha}||${venta.sucursalId}`
        const existing = mapa.get(key)
        if (existing) { existing.total += Number(detalle.cantidad) }
        else { mapa.set(key, { fecha, sucursalId: venta.sucursalId, sucursalNombre: venta.sucursal.nombre, total: Number(detalle.cantidad) }) }
      }
    }
    res.json({ success: true, data: [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)), message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/ventas-por-vendedor', requireRole('GERENTE'), async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const ventas = await prisma.venta.findMany({
      where: { fecha: { ...(fechaInicio && { gte: new Date(fechaInicio) }), ...(fechaFin && { lte: new Date(`${fechaFin}T23:59:59`) }) } },
      include: { sucursal: true, vendedor: true, detalles: true },
    })
    const mapa = new Map<string, { empleadoId: string; nombreCompleto: string; sucursalId: string; sucursalNombre: string; totalVendido: number; meta: number }>()
    for (const venta of ventas) {
      const key = `${venta.vendedorId}||${venta.sucursalId}`
      const totalVenta = venta.detalles.reduce((s, d) => s + Number(d.cantidad), 0)
      const existing = mapa.get(key)
      if (existing) { existing.totalVendido += totalVenta }
      else { mapa.set(key, { empleadoId: venta.vendedorId, nombreCompleto: venta.vendedor.nombreCompleto, sucursalId: venta.sucursalId, sucursalNombre: venta.sucursal.nombre, totalVendido: totalVenta, meta: Number(venta.vendedor.metaIndividual) }) }
    }
    const data = [...mapa.values()].map((row) => ({ ...row, porLlegar: Math.max(0, row.meta - row.totalVendido), porcentaje: row.meta > 0 ? (row.totalVendido / row.meta) * 100 : 0 })).sort((a, b) => b.totalVendido - a.totalVendido)
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/ventas-por-vendedor-dia', requireRole('GERENTE'), async (req, res) => {
  try {
    const { vendedorId, fechaInicio, fechaFin } = req.query as { vendedorId?: string; fechaInicio?: string; fechaFin?: string }
    const ventas = await prisma.venta.findMany({
      where: { ...(vendedorId && { vendedorId }), fecha: { ...(fechaInicio && { gte: new Date(fechaInicio) }), ...(fechaFin && { lte: new Date(`${fechaFin}T23:59:59`) }) } },
      include: { sucursal: true, detalles: { include: { metodoPago: true } } },
      orderBy: { fecha: 'asc' },
    })
    const data = ventas.flatMap((venta) => venta.detalles.map((detalle) => ({ fecha: venta.fecha.toISOString().slice(0, 10), sucursalId: venta.sucursalId, sucursalNombre: venta.sucursal.nombre, cantidad: Number(detalle.cantidad), metodoPagoId: detalle.metodoPagoId, metodoPagoNombre: detalle.metodoPago.nombre, notas: venta.notas })))
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/total-general', requireRole('GERENTE'), async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query as { fechaInicio?: string; fechaFin?: string }
    const ventas = await prisma.venta.findMany({
      where: { fecha: { ...(fechaInicio && { gte: new Date(fechaInicio) }), ...(fechaFin && { lte: new Date(`${fechaFin}T23:59:59`) }) } },
      include: { sucursal: true, detalles: true },
      orderBy: { fecha: 'asc' },
    })
    const mapaFecha = new Map<string, Map<string, { sucursalNombre: string; total: number }>>()
    for (const venta of ventas) {
      const fecha = venta.fecha.toISOString().slice(0, 10)
      const totalVenta = venta.detalles.reduce((s, d) => s + Number(d.cantidad), 0)
      if (!mapaFecha.has(fecha)) mapaFecha.set(fecha, new Map())
      const diaMap = mapaFecha.get(fecha)!
      const existing = diaMap.get(venta.sucursalId)
      if (existing) { existing.total += totalVenta }
      else { diaMap.set(venta.sucursalId, { sucursalNombre: venta.sucursal.nombre, total: totalVenta }) }
    }
    const data = [...mapaFecha.entries()].map(([fecha, sucursalesMap]) => {
      const porSucursal = [...sucursalesMap.entries()].map(([sucursalId, { sucursalNombre, total }]) => ({ sucursalId, sucursalNombre, total }))
      return { fecha, porSucursal, totalDia: porSucursal.reduce((s, r) => s + r.total, 0) }
    })
    res.json({ success: true, data, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar reporte' })
  }
})

router.get('/reportes/dashboard', requireRole('GERENTE'), async (req, res) => {
  try {
    const { fecha } = req.query as { fecha?: string }
    const ref = fecha ? new Date(fecha) : new Date()
    const refStr = ref.toISOString().slice(0, 10)
    const refYear = ref.getFullYear()
    const refMonth = ref.getMonth()
    const inicioAnio = new Date(refYear, 0, 1)
    const finAnio = new Date(refYear, 11, 31, 23, 59, 59)
    const ventasAnio = await prisma.venta.findMany({
      where: { fecha: { gte: inicioAnio, lte: finAnio } },
      include: { sucursal: true, vendedor: true, detalles: true },
    })
    const sucursales = await prisma.sucursal.findMany({ orderBy: { nombre: 'asc' } })
    const empleados = await prisma.empleado.findMany({ where: { activo: true } })
    const inicioMes = new Date(refYear, refMonth, 1).toISOString().slice(0, 10)
    const finMes = new Date(refYear, refMonth + 1, 0).toISOString().slice(0, 10)
    function totalPorSucursal(fechaFilter: (f: string) => boolean) {
      return sucursales.map((s) => {
        const total = ventasAnio.filter((v) => v.sucursalId === s.id && fechaFilter(v.fecha.toISOString().slice(0, 10))).flatMap((v) => v.detalles).reduce((acc, d) => acc + Number(d.cantidad), 0)
        return { sucursalId: s.id, sucursalNombre: s.nombre, total }
      })
    }
    const dia = totalPorSucursal((f) => f === refStr)
    const mes = totalPorSucursal((f) => f >= inicioMes && f <= finMes)
    const anio = totalPorSucursal(() => true)
    const ventasPorVendedor = empleados.map((emp) => {
      const vendido = ventasAnio.filter((v) => v.vendedorId === emp.id && v.fecha.toISOString().slice(0, 10) >= inicioMes && v.fecha.toISOString().slice(0, 10) <= finMes).flatMap((v) => v.detalles).reduce((acc, d) => acc + Number(d.cantidad), 0)
      return { empleadoId: emp.id, nombre: emp.nombreCompleto, vendido, meta: Number(emp.metaIndividual) }
    })
    res.json({ success: true, data: { dia, mes, anio, ventasPorVendedor }, message: 'OK' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, data: null, message: 'Error al generar dashboard' })
  }
})

export default router
