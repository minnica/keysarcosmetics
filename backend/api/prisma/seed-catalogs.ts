// Script de seed exclusivo para catálogos Bank y Position.
// No toca Ventas, Sucursales, Usuarios ni Métodos de pago.
// Seguro para correr en producción: solo upsert (sin delete ni truncate).
// Idempotente: puede ejecutarse varias veces sin efectos secundarios.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed catálogos: Banks y Positions\n')

  // ─── Banks ─────────────────────────────────────────────────────────────────
  // update: {} — no sobreescribe si ya existe con ese id
  const bancos = [
    { id: 'bank-bbva',      nombre: 'BBVA'      },
    { id: 'bank-santander', nombre: 'Santander' },
    { id: 'bank-banorte',   nombre: 'Banorte'   },
    { id: 'bank-hsbc',      nombre: 'HSBC'      },
    { id: 'bank-banamex',   nombre: 'Banamex'   },
  ]

  for (const b of bancos) {
    await prisma.bank.upsert({
      where:  { id: b.id },
      update: {},
      create: { id: b.id, nombre: b.nombre, activo: true },
    })
  }
  console.log(`✅ Banks: ${bancos.map((b) => b.nombre).join(', ')}`)

  // ─── Positions ─────────────────────────────────────────────────────────────
  // Valores canónicos en MAYÚSCULAS — normalización del sistema
  const puestos = [
    { id: 'pos-vendedor',      nombre: 'VENDEDOR'             },
    { id: 'pos-gerente',       nombre: 'GERENTE'              },
    { id: 'pos-facialista',    nombre: 'FACIALISTA'           },
    { id: 'pos-cerrador',      nombre: 'CERRADOR'             },
    { id: 'pos-admin-general', nombre: 'ADMINISTRADOR GENERAL'},
    { id: 'pos-call-center',   nombre: 'CALL CENTER'          },
    { id: 'pos-contador',      nombre: 'CONTADOR'             },
    { id: 'pos-mantenimiento', nombre: 'MANTENIMIENTO'        },
    { id: 'pos-externo',       nombre: 'EXTERNO'              },
    { id: 'pos-administrador', nombre: 'ADMINISTRADOR'        },
  ]

  for (const p of puestos) {
    await prisma.position.upsert({
      where:  { id: p.id },
      update: {},
      create: { id: p.id, nombre: p.nombre, activo: true },
    })
  }
  console.log(`✅ Positions: ${puestos.map((p) => p.nombre).join(', ')}`)

  // ─── Backfill de empleados ──────────────────────────────────────────────────
  // Mapea banco/puesto legacy → FK solo si el valor puede resolverse sin ambigüedad.
  // No toca banco, puesto, nombres, meta ni ningún otro campo legacy.
  console.log('\n🔄 Backfill empleados (solo asigna FKs faltantes)...')

  // Índice por nombre en uppercase para matching case-insensitive
  const bankByNombre  = new Map(bancos.map((b) => [b.nombre.toUpperCase(),  b.id]))
  const posByNombre   = new Map(puestos.map((p) => [p.nombre.toUpperCase(), p.id]))

  // Solo empleados activos que aún tienen al menos una FK sin asignar
  const empleadosSinFK = await prisma.empleado.findMany({
    where: {
      activo: true,
      OR: [{ bankId: null }, { positionId: null }],
    },
    select: {
      id:             true,
      nombreCompleto: true,
      banco:          true,
      puesto:         true,
      bankId:         true,
      positionId:     true,
    },
  })

  let updated = 0
  let skipped = 0

  for (const emp of empleadosSinFK) {
    // Resolver bankId: solo si aún es null y hay mapeo exacto
    const resolvedBankId =
      emp.bankId === null
        ? (bankByNombre.get(emp.banco.toUpperCase()) ?? null)
        : emp.bankId

    // Resolver positionId: solo si aún es null y hay mapeo exacto
    const resolvedPositionId =
      emp.positionId === null
        ? (posByNombre.get(emp.puesto.toUpperCase()) ?? null)
        : emp.positionId

    const bankResolved     = emp.bankId     === null && resolvedBankId     !== null
    const posResolved      = emp.positionId === null && resolvedPositionId !== null
    const bankUnmapped     = emp.bankId     === null && resolvedBankId     === null
    const posUnmapped      = emp.positionId === null && resolvedPositionId === null

    if (bankResolved || posResolved) {
      // Actualiza solo los campos FK que se pudieron resolver
      await prisma.empleado.update({
        where: { id: emp.id },
        data: {
          ...(bankResolved && { bankId:     resolvedBankId     }),
          ...(posResolved  && { positionId: resolvedPositionId }),
        },
      })

      const parts: string[] = []
      if (bankResolved)  parts.push(`bankId="${resolvedBankId}"`)
      if (posResolved)   parts.push(`positionId="${resolvedPositionId}"`)
      if (bankUnmapped)  parts.push(`⚠️ banco="${emp.banco}" sin mapeo`)
      if (posUnmapped)   parts.push(`⚠️ puesto="${emp.puesto}" sin mapeo`)
      console.log(`  ✅ ${emp.nombreCompleto}: ${parts.join(' | ')}`)
      updated++
    } else {
      // Ningún campo pudo resolverse — no se toca el registro
      console.log(`  ⚠️  Sin mapeo: ${emp.nombreCompleto} | banco="${emp.banco}" puesto="${emp.puesto}"`)
      skipped++
    }
  }

  const total = empleadosSinFK.length
  console.log(`\n📊 Backfill: ${updated} actualizados, ${skipped} sin mapeo, ${total} evaluados`)
  console.log('\n🎉 Seed catálogos completado')
}

main()
  .catch((err) => {
    console.error('❌ Error en seed-catalogs:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
