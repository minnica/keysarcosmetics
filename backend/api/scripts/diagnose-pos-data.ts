/**
 * Inventario de preparación para POS.
 *
 * Sólo usa SELECT/COUNT contra los modelos existentes. No ejecuta migraciones,
 * seeds ni operaciones de escritura. Puede correrse contra development y, con
 * autorización explícita, contra producción.
 */
import "dotenv/config";
import { prisma } from "../src/prisma/client";

type CountRow = { count: bigint };

async function rawCount(query: Promise<CountRow[]>): Promise<number> {
  const rows = await query;
  return Number(rows[0]?.count ?? 0n);
}

async function main(): Promise<void> {
  const [branches, employees, positions, users, paymentMethods, sales] =
    await Promise.all([
      prisma.sucursal.count(),
      prisma.empleado.count(),
      prisma.position.count(),
      prisma.usuario.count(),
      prisma.metodoPago.count(),
      prisma.venta.count(),
    ]);

  const [
    employeesWithoutPosition,
    employeesWithoutBranch,
    usersWithoutEmployee,
    activeNonAdminUsersWithoutBranch,
    usersWithMissingEmployee,
    employeesWithMissingPosition,
    employeesWithMissingBranch,
    salesWithMissingEmployee,
    salesWithMissingBranch,
    saleDetailsWithMissingPaymentMethod,
    salesWithoutDetails,
  ] = await Promise.all([
    prisma.empleado.count({ where: { positionId: null } }),
    prisma.empleado.count({
      where: { sucursalId: null, todasSucursales: false },
    }),
    prisma.usuario.count({ where: { empleadoId: null } }),
    prisma.usuario.count({
      where: { activo: true, rol: { not: "SUPER_ADMIN" }, sucursalId: null },
    }),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Usuario" u
      WHERE u."empleadoId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Empleado" e WHERE e.id = u."empleadoId")
    `),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Empleado" e
      WHERE e."positionId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Position" p WHERE p.id = e."positionId")
    `),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Empleado" e
      WHERE e."sucursalId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Sucursal" s WHERE s.id = e."sucursalId")
    `),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Venta" v
      WHERE NOT EXISTS (SELECT 1 FROM "Empleado" e WHERE e.id = v."vendedorId")
    `),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Venta" v
      WHERE NOT EXISTS (SELECT 1 FROM "Sucursal" s WHERE s.id = v."sucursalId")
    `),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "VentaDetalle" d
      WHERE NOT EXISTS (SELECT 1 FROM "MetodoPago" m WHERE m.id = d."metodoPagoId")
    `),
    rawCount(prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Venta" v
      WHERE NOT EXISTS (SELECT 1 FROM "VentaDetalle" d WHERE d."ventaId" = v.id)
    `),
  ]);

  const incompleteRelations = {
    employeesWithoutPosition,
    employeesWithoutBranch,
    usersWithoutEmployee,
    activeNonAdminUsersWithoutBranch,
    usersWithMissingEmployee,
    employeesWithMissingPosition,
    employeesWithMissingBranch,
    salesWithMissingEmployee,
    salesWithMissingBranch,
    saleDetailsWithMissingPaymentMethod,
    salesWithoutDetails,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY",
    counts: { branches, employees, positions, users, paymentMethods, sales },
    incompleteRelations,
    notes: [
      "Los conteos de empleados/usuarios sin asignación son preparación pendiente para POS; no implican una mutación ni un error de integridad por sí mismos.",
      "Los campos con prefijo 'Missing' detectan referencias huérfanas que deberían ser cero cuando las llaves foráneas existentes están aplicadas.",
      "salesWithoutDetails identifica ventas legacy que requieren revisión antes de cualquier proyección POS.",
    ],
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    process.stderr.write(
      `No se pudo ejecutar el diagnóstico POS: ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
