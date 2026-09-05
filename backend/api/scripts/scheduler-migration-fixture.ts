import { prisma } from "../src/prisma/client";

const FIXTURE_PREFIX = "scheduler-phase10-upgrade";
const ids = {
  branch: `${FIXTURE_PREFIX}-branch`,
  commerce: `${FIXTURE_PREFIX}-commerce`,
  employee: `${FIXTURE_PREFIX}-employee`,
  professional: `${FIXTURE_PREFIX}-professional`,
  branchProfile: `${FIXTURE_PREFIX}-branch-profile`,
  serviceItem: `${FIXTURE_PREFIX}-service-item`,
  service: `${FIXTURE_PREFIX}-service`,
  resource: `${FIXTURE_PREFIX}-resource`,
  customer: `${FIXTURE_PREFIX}-customer`,
  customerProfile: `${FIXTURE_PREFIX}-customer-profile`,
} as const;

function assertEphemeralDatabase(): void {
  if (
    process.env["SCHEDULER_MIGRATION_FIXTURE_CONFIRMATION"] !== "EPHEMERAL_ONLY"
  ) {
    throw new Error(
      "SCHEDULER_MIGRATION_FIXTURE_CONFIRMATION debe ser EPHEMERAL_ONLY.",
    );
  }
  const rawUrl = process.env["DATABASE_URL"];
  if (!rawUrl) throw new Error("DATABASE_URL es obligatoria.");
  const url = new URL(rawUrl);
  const localHost = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  const database = url.pathname.replace(/^\//, "");
  const schema = url.searchParams.get("schema") ?? "";
  if (
    !localHost ||
    (!database.includes("scheduler_upgrade") &&
      !schema.includes("scheduler_upgrade"))
  ) {
    throw new Error(
      "El fixture sólo puede ejecutarse contra una PostgreSQL local efímera cuya base o schema incluya scheduler_upgrade.",
    );
  }
}

async function seed(): Promise<void> {
  await prisma.sucursal.upsert({
    where: { id: ids.branch },
    update: {},
    create: { id: ids.branch, nombre: "Sucursal snapshot Fase 10" },
  });
  await prisma.schedulerCommerce.upsert({
    where: { id: ids.commerce },
    update: {},
    create: {
      id: ids.commerce,
      name: "Comercio snapshot Fase 10",
      normalizedName: FIXTURE_PREFIX,
    },
  });
  await prisma.schedulerBranchProfile.upsert({
    where: { id: ids.branchProfile },
    update: {},
    create: {
      id: ids.branchProfile,
      branchId: ids.branch,
      commerceId: ids.commerce,
      bookingEnabled: true,
      timezone: "America/Mexico_City",
    },
  });
  await prisma.empleado.upsert({
    where: { id: ids.employee },
    update: {},
    create: {
      id: ids.employee,
      nombres: "Profesional",
      apellidoPaterno: "Snapshot",
      apellidoMaterno: "Scheduler",
      nombreCompleto: "Profesional Snapshot Scheduler",
      banco: "PRUEBA",
      numeroCuenta: FIXTURE_PREFIX,
      puesto: "PRUEBA",
      metaIndividual: 0,
      sucursalId: ids.branch,
    },
  });
  await prisma.schedulerProfessionalProfile.upsert({
    where: { id: ids.professional },
    update: {},
    create: { id: ids.professional, employeeId: ids.employee, active: true },
  });
  await prisma.schedulerProfessionalBranchAssignment.upsert({
    where: {
      professionalProfileId_branchProfileId: {
        professionalProfileId: ids.professional,
        branchProfileId: ids.branchProfile,
      },
    },
    update: {},
    create: {
      professionalProfileId: ids.professional,
      branchProfileId: ids.branchProfile,
    },
  });
  await prisma.catalogItem.upsert({
    where: { id: ids.serviceItem },
    update: {},
    create: {
      id: ids.serviceItem,
      sku: "SCHEDULER-PHASE10-SNAPSHOT",
      name: "Servicio snapshot Fase 10",
      normalizedName: "servicio snapshot fase 10",
      kind: "SERVICE",
      published: true,
    },
  });
  await prisma.schedulerServiceProfile.upsert({
    where: { id: ids.service },
    update: {},
    create: {
      id: ids.service,
      catalogItemId: ids.serviceItem,
      durationMinutes: 60,
    },
  });
  await prisma.schedulerServiceBranchAssignment.upsert({
    where: {
      serviceProfileId_branchProfileId: {
        serviceProfileId: ids.service,
        branchProfileId: ids.branchProfile,
      },
    },
    update: {},
    create: {
      serviceProfileId: ids.service,
      branchProfileId: ids.branchProfile,
    },
  });
  await prisma.schedulerProfessionalServiceAssignment.upsert({
    where: {
      professionalProfileId_serviceProfileId_branchProfileId: {
        professionalProfileId: ids.professional,
        serviceProfileId: ids.service,
        branchProfileId: ids.branchProfile,
      },
    },
    update: {},
    create: {
      professionalProfileId: ids.professional,
      serviceProfileId: ids.service,
      branchProfileId: ids.branchProfile,
    },
  });
  await prisma.schedulerResource.upsert({
    where: { id: ids.resource },
    update: {},
    create: {
      id: ids.resource,
      branchProfileId: ids.branchProfile,
      name: "Cabina snapshot",
      normalizedName: "cabina snapshot",
      kind: "ROOM",
    },
  });
  await prisma.customer.upsert({
    where: { id: ids.customer },
    update: {},
    create: {
      id: ids.customer,
      displayName: "Cliente Snapshot",
      normalizedName: "cliente snapshot",
      phone: "+525500001010",
      phoneNormalized: "+525500001010",
    },
  });
  await prisma.schedulerCustomerProfile.upsert({
    where: { id: ids.customerProfile },
    update: {},
    create: { id: ids.customerProfile, customerId: ids.customer },
  });
}

async function verify(): Promise<void> {
  const [branch, commerce, professional, service, resource, customer] =
    await Promise.all([
      prisma.sucursal.count({ where: { id: ids.branch } }),
      prisma.schedulerCommerce.count({ where: { id: ids.commerce } }),
      prisma.schedulerProfessionalProfile.count({
        where: { id: ids.professional },
      }),
      prisma.schedulerServiceProfile.count({ where: { id: ids.service } }),
      prisma.schedulerResource.count({ where: { id: ids.resource } }),
      prisma.customer.count({ where: { id: ids.customer } }),
    ]);
  const relations = await prisma.schedulerProfessionalServiceAssignment.count({
    where: {
      professionalProfileId: ids.professional,
      serviceProfileId: ids.service,
      branchProfileId: ids.branchProfile,
    },
  });
  const newTables = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM pg_catalog.pg_class
    WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
      AND relname IN (
        'SchedulerAppointment',
        'SchedulerCommissionPolicy',
        'SchedulerMessageOutbox',
        'SchedulerSurveyResponse'
      )
      AND relkind = 'r'
  `;
  const reportingIndexes = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM pg_catalog.pg_class
    WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
      AND relname IN (
        'SchedulerAppointmentStateHistory_toStatus_creadoEn_idx',
        'SchedulerCommissionPolicy_commerceId_targetType_active_idx',
        'SchedulerMessageOutbox_branchProfileId_channel_status_scheduledAt_idx',
        'SchedulerSurveyResponse_submittedAt_idx'
      )
      AND relkind = 'i'
  `;
  const preserved = {
    branch,
    commerce,
    professional,
    service,
    resource,
    customer,
    relations,
  };
  if (Object.values(preserved).some((count) => count !== 1)) {
    throw new Error(
      `El upgrade no preservó el fixture: ${JSON.stringify(preserved)}`,
    );
  }
  if (Number(newTables[0]?.count ?? 0) !== 4) {
    throw new Error(
      "El upgrade no materializó todas las tablas representativas de Fases 4, 6, 7 y 8.",
    );
  }
  if (Number(reportingIndexes[0]?.count ?? 0) !== 4) {
    throw new Error(
      "El upgrade no materializó los cuatro índices de reportes de Fase 8.",
    );
  }
  process.stdout.write(
    `${JSON.stringify({ status: "PASS", baselineMigrationCount: 39, preserved, newTables: 4, reportingIndexes: 4 })}\n`,
  );
}

async function main(): Promise<void> {
  assertEphemeralDatabase();
  const command = process.argv[2];
  if (command === "seed") await seed();
  else if (command === "verify") await verify();
  else throw new Error("Uso: scheduler-migration-fixture.ts <seed|verify>");
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Falló el fixture de migración",
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
