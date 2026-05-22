// Seed inicial: usuarios, sucursales, métodos de pago, empleados y ventas de prueba
import { PrismaClient, Rol } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── Sucursales ────────────────────────────────────────────────────────────
  const sucursalCentro = await prisma.sucursal.upsert({
    where: { id: 'sucursal-centro' },
    update: {},
    create: { id: 'sucursal-centro', nombre: 'Sucursal Centro', activa: true },
  })

  const sucursalNorte = await prisma.sucursal.upsert({
    where: { id: 'sucursal-norte' },
    update: {},
    create: { id: 'sucursal-norte', nombre: 'Sucursal Norte', activa: true },
  })

  console.log(`  ✅ Sucursal: ${sucursalCentro.nombre}`)
  console.log(`  ✅ Sucursal: ${sucursalNorte.nombre}`)

  // ─── Usuarios ─────────────────────────────────────────────────────────────
  const saltRounds = 12
  const adminHash = await bcrypt.hash('Admin1234!', saltRounds)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@cosmetics.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@cosmetics.com',
      passwordHash: adminHash,
      rol: Rol.SUPER_ADMIN,
      activo: true,
    },
  })
  console.log(`  ✅ Usuario SUPER_ADMIN: ${admin.email}`)

  const gerenteHash = await bcrypt.hash('Gerente1234!', saltRounds)
  const gerente = await prisma.usuario.upsert({
    where: { email: 'gerente@cosmetics.com' },
    update: {},
    create: {
      nombre: 'Gerente Centro',
      email: 'gerente@cosmetics.com',
      passwordHash: gerenteHash,
      rol: Rol.GERENTE,
      activo: true,
      sucursalId: sucursalCentro.id,
    },
  })
  console.log(`  ✅ Usuario GERENTE:     ${gerente.email} → ${sucursalCentro.nombre}`)

  // ─── Métodos de pago ───────────────────────────────────────────────────────
  const mpEfectivo = await prisma.metodoPago.upsert({
    where: { id: 'mp-efectivo' },
    update: {},
    create: { id: 'mp-efectivo', nombre: 'Efectivo', tipo: 'EFECTIVO', activo: true },
  })
  const mpTarjeta = await prisma.metodoPago.upsert({
    where: { id: 'mp-tarjeta' },
    update: {},
    create: { id: 'mp-tarjeta', nombre: 'Tarjeta', tipo: 'TARJETA', activo: true },
  })
  const mpTransferencia = await prisma.metodoPago.upsert({
    where: { id: 'mp-transferencia' },
    update: {},
    create: { id: 'mp-transferencia', nombre: 'Transferencia', tipo: 'TRANSFERENCIA', activo: true },
  })
  console.log(`  ✅ Métodos de pago: ${mpEfectivo.nombre}, ${mpTarjeta.nombre}, ${mpTransferencia.nombre}`)

  // ─── Empleados de prueba ───────────────────────────────────────────────────
  const empleadosData = [
    {
      id: 'emp-maria',
      nombres: 'María',
      apellidoPaterno: 'García',
      apellidoMaterno: 'López',
      nombreCompleto: 'María García López',
      banco: 'BBVA',
      numeroCuenta: '1234567890',
      puesto: 'Vendedor',
      metaIndividual: 50000,
    },
    {
      id: 'emp-juan',
      nombres: 'Juan Carlos',
      apellidoPaterno: 'Martínez',
      apellidoMaterno: 'Sánchez',
      nombreCompleto: 'Juan Carlos Martínez Sánchez',
      banco: 'Santander',
      numeroCuenta: '0987654321',
      puesto: 'Vendedor',
      metaIndividual: 45000,
    },
    {
      id: 'emp-ana',
      nombres: 'Ana',
      apellidoPaterno: 'Rodríguez',
      apellidoMaterno: 'Torres',
      nombreCompleto: 'Ana Rodríguez Torres',
      banco: 'Banorte',
      numeroCuenta: '1122334455',
      puesto: 'Vendedor',
      metaIndividual: 55000,
    },
    {
      id: 'emp-luis',
      nombres: 'Luis',
      apellidoPaterno: 'Hernández',
      apellidoMaterno: 'Cruz',
      nombreCompleto: 'Luis Hernández Cruz',
      banco: 'HSBC',
      numeroCuenta: '5544332211',
      puesto: 'Gerente',
      metaIndividual: 80000,
    },
  ]

  for (const emp of empleadosData) {
    await prisma.empleado.upsert({
      where: { id: emp.id },
      update: {},
      create: { ...emp, activo: true },
    })
    console.log(`  ✅ Empleado: ${emp.nombreCompleto}`)
  }

  // ─── Ventas de prueba (últimos 30 días) ────────────────────────────────────
  // Borramos las ventas de prueba existentes para evitar duplicados al re-seedear
  await prisma.venta.deleteMany({
    where: { notas: { contains: '[seed]' } },
  })

  const metodos = [mpEfectivo, mpTarjeta, mpTransferencia]
  const sucursales = [sucursalCentro, sucursalNorte]
  const empleados = await prisma.empleado.findMany({ where: { activo: true } })

  // 10 ventas distribuidas en los últimos 30 días
  const ventasDePrueba = [
    { diasAtras: 1,  empIdx: 0, sucIdx: 0, items: [{ cantidad: 2500, mpIdx: 0 }, { cantidad: 1800, mpIdx: 1 }] },
    { diasAtras: 2,  empIdx: 1, sucIdx: 0, items: [{ cantidad: 3200, mpIdx: 1 }] },
    { diasAtras: 3,  empIdx: 2, sucIdx: 1, items: [{ cantidad: 4100, mpIdx: 2 }, { cantidad: 900, mpIdx: 0 }] },
    { diasAtras: 5,  empIdx: 3, sucIdx: 0, items: [{ cantidad: 6500, mpIdx: 1 }] },
    { diasAtras: 7,  empIdx: 0, sucIdx: 1, items: [{ cantidad: 1500, mpIdx: 0 }, { cantidad: 2200, mpIdx: 2 }] },
    { diasAtras: 10, empIdx: 1, sucIdx: 1, items: [{ cantidad: 3800, mpIdx: 0 }] },
    { diasAtras: 12, empIdx: 2, sucIdx: 0, items: [{ cantidad: 5200, mpIdx: 1 }, { cantidad: 800, mpIdx: 0 }] },
    { diasAtras: 15, empIdx: 3, sucIdx: 1, items: [{ cantidad: 7000, mpIdx: 2 }] },
    { diasAtras: 20, empIdx: 0, sucIdx: 0, items: [{ cantidad: 2900, mpIdx: 1 }, { cantidad: 1100, mpIdx: 0 }] },
    { diasAtras: 28, empIdx: 1, sucIdx: 0, items: [{ cantidad: 4400, mpIdx: 2 }] },
  ]

  for (const venta of ventasDePrueba) {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - venta.diasAtras)
    fecha.setHours(10, 0, 0, 0)

    const emp = empleados[venta.empIdx % empleados.length]
    const suc = sucursales[venta.sucIdx % sucursales.length]

    if (!emp || !suc) continue

    await prisma.venta.create({
      data: {
        fecha,
        notas: '[seed] venta de prueba',
        sucursalId: suc.id,
        vendedorId: emp.id,
        detalles: {
          create: venta.items.map(item => ({
            cantidad: item.cantidad,
            metodoPagoId: metodos[item.mpIdx % metodos.length]!.id,
          })),
        },
      },
    })
  }
  console.log(`  ✅ 10 ventas de prueba creadas (últimos 30 días)`)

  console.log('\n🎉 Seed completado exitosamente')
}

main()
  .catch((err) => {
    console.error('❌ Error en seed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
