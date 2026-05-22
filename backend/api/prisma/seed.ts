// Seed inicial: usuarios base y sucursales de ejemplo
import { PrismaClient, Rol } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── Sucursales ────────────────────────────────────────────────────────────
  const sucursalCentro = await prisma.sucursal.upsert({
    where: { id: 'sucursal-centro' },
    update: {},
    create: {
      id: 'sucursal-centro',
      nombre: 'Sucursal Centro',
      activa: true,
    },
  })

  const sucursalNorte = await prisma.sucursal.upsert({
    where: { id: 'sucursal-norte' },
    update: {},
    create: {
      id: 'sucursal-norte',
      nombre: 'Sucursal Norte',
      activa: true,
    },
  })

  console.log(`  ✅ Sucursal: ${sucursalCentro.nombre}`)
  console.log(`  ✅ Sucursal: ${sucursalNorte.nombre}`)

  // ─── Usuarios ─────────────────────────────────────────────────────────────
  const saltRounds = 12

  // SUPER_ADMIN — sin sucursal asignada
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

  // GERENTE — asignado a Sucursal Centro
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
