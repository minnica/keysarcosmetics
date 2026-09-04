import type { Prisma } from "@prisma/client";

export type SchedulerDiagnosisEnvironment =
  | "local"
  | "test"
  | "development"
  | "staging"
  | "production";

export type RepositoryMigration = {
  name: string;
  checksum: string;
};

type DatabaseMigrationRow = {
  migration_name: string;
  checksum: string;
  started_at: Date;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

type CountRow = { count: bigint };
type GroupedCountRow = { key: string | null; count: bigint };
type TableRow = { table_name: string };
type ColumnRow = { column_name: string };
type DatabaseMetadataRow = { schema_name: string; server_version: string };
type AggregateRow = Record<string, bigint | number | string | null>;

const EXPECTED_TABLES = [
  "_prisma_migrations",
  "Sucursal",
  "Empleado",
  "Position",
  "Usuario",
  "CustomerSource",
  "Customer",
  "CustomerPortfolioAssignment",
  "CatalogItem",
  "CatalogItemBranchVisibility",
  "PosPackage",
  "SubcategoriaAtencion",
  "RegistroCita",
  "PosTicket",
  "PosAppointment",
  "AgendaResource",
  "AgendaSlot",
  "AgendaReservation",
  "AgendaSyncEvent",
  "PosCredential",
  "PosClientMembership",
  "PosCommercialCompany",
  "SchedulerBranchProfile",
  "SchedulerProfessionalProfile",
  "SchedulerServiceProfile",
  "SchedulerResource",
  "SchedulerAvailabilityRule",
  "SchedulerAvailabilityException",
  "SchedulerCustomerProfile",
  "SchedulerCustomerAlias",
  "SchedulerCustomerEmail",
  "SchedulerCustomerFieldDefinition",
  "SchedulerCustomerFieldValue",
  "SchedulerCustomerMergeEvent",
  "SchedulerAppointment",
  "SchedulerAppointmentService",
  "SchedulerAppointmentParticipant",
  "SchedulerAppointmentResource",
  "SchedulerAppointmentMembershipBenefit",
  "SchedulerAppointmentStateHistory",
  "SchedulerScheduleBlock",
  "SchedulerIdempotencyKey",
  "SchedulerPackageProfile",
  "SchedulerPackageBranchAssignment",
  "SchedulerPackageServiceLine",
  "SchedulerAddonProfile",
  "SchedulerServiceAddonAssignment",
  "SchedulerClassSchedule",
  "SchedulerCommissionPolicy",
  "SchedulerCommissionPolicyVersion",
  "SchedulerCommissionRule",
  "SchedulerCommissionTier",
  "SchedulerGiftCardTemplate",
  "SchedulerGiftCardService",
  "SchedulerStatusColor",
  "SchedulerSetting",
  "SchedulerSettingVersion",
] as const;

type ExpectedTable = (typeof EXPECTED_TABLES)[number];

type MigrationInventory = {
  repositoryTotal: number;
  databaseAppliedTotal: number;
  trackingTablePresent: boolean;
  applied: string[];
  pending: string[];
  databaseOnly: string[];
  incomplete: string[];
  rolledBack: string[];
  checksumMismatches: string[];
};

export type SchedulerDiagnosisReport = {
  generatedAt: string;
  environment: SchedulerDiagnosisEnvironment;
  mode: "READ_ONLY_TRANSACTION";
  database: {
    schema: string;
    serverVersion: string;
  };
  migrations: MigrationInventory;
  tableAvailability: Record<ExpectedTable, boolean>;
  reusableData: {
    branches: number | null;
    employees: number | null;
    positions: number | null;
    customers: number | null;
    customerSources: number | null;
    services: number | null;
    packages: number | null;
  };
  schedulerReadiness: {
    branches: Record<string, number | boolean | string | null>;
    services: Record<string, number | boolean | string | null>;
    professionalCandidates: Record<string, number | boolean | string | null>;
    customers: Record<string, number | boolean | string | null>;
  };
  appointmentInventory: {
    schedulerAppointment: Record<string, unknown>;
    registroCita: Record<string, unknown>;
    posAppointment: Record<string, unknown>;
    agendaResource: Record<string, unknown>;
    agendaSlot: Record<string, unknown>;
    agendaReservation: Record<string, unknown>;
    agendaSyncEvent: Record<string, unknown>;
  };
  incompleteRelations: Record<string, number | null>;
  backupAndPitr: {
    requiredBeforeProductionMigrations: true;
    operatorReportedConfirmationAt: string | null;
    status: "NOT_APPLICABLE_TO_DIAGNOSIS" | "OPERATOR_CONFIRMATION_RECORDED";
  };
  privacy: {
    containsPersonalRecords: false;
    containsSecretsOrConnectionDetails: false;
    aggregationOnly: true;
  };
  notes: string[];
};

export function parseSchedulerDiagnosisEnvironment(
  value: string | undefined,
): SchedulerDiagnosisEnvironment {
  const allowed: SchedulerDiagnosisEnvironment[] = [
    "local",
    "test",
    "development",
    "staging",
    "production",
  ];
  if (!value || !allowed.includes(value as SchedulerDiagnosisEnvironment)) {
    throw new Error(
      "SCHEDULER_DIAGNOSE_ENVIRONMENT debe ser local, test, development, staging o production",
    );
  }
  return value as SchedulerDiagnosisEnvironment;
}

export function validateSchedulerDiagnosisAccess(options: {
  environment: SchedulerDiagnosisEnvironment;
  productionConfirmation?: string;
}): void {
  if (
    options.environment === "production" &&
    options.productionConfirmation !== "PRODUCCION_SOLO_LECTURA"
  ) {
    throw new Error(
      "Production requiere SCHEDULER_DIAGNOSE_PRODUCTION_CONFIRMATION=PRODUCCION_SOLO_LECTURA",
    );
  }
}

export function validateBackupPitrConfirmation(
  value: string | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error(
      "SCHEDULER_BACKUP_PITR_CONFIRMED_AT debe ser una fecha ISO UTC exacta",
    );
  }
  return value;
}

export function safeSchedulerDiagnosisError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  ) {
    return `${error.code}: no fue posible completar la consulta de sólo lectura en el ambiente indicado`;
  }
  if (error instanceof Error) {
    if (error.message.includes("Can't reach database server")) {
      return "P1001: no fue posible completar la consulta de sólo lectura en el ambiente indicado";
    }
    const safePrefixes = [
      "SCHEDULER_DIAGNOSE_",
      "SCHEDULER_BACKUP_",
      "SCHEDULER_CUSTOMER_",
      "Production requiere ",
      "Production APPLY ",
    ];
    if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) {
      return error.message;
    }
  }
  return "Error no detallado para evitar exponer datos de conexión o registros";
}

export function classifyMigrations(
  repositoryMigrations: RepositoryMigration[],
  databaseRows: DatabaseMigrationRow[],
  trackingTablePresent: boolean,
): MigrationInventory {
  const repositoryByName = new Map(
    repositoryMigrations.map((migration) => [migration.name, migration]),
  );
  const appliedRows = databaseRows.filter(
    (migration) =>
      migration.finished_at !== null && migration.rolled_back_at === null,
  );
  const appliedNames = new Set(
    appliedRows.map((migration) => migration.migration_name),
  );

  return {
    repositoryTotal: repositoryMigrations.length,
    databaseAppliedTotal: appliedRows.length,
    trackingTablePresent,
    applied: [...appliedNames].sort(),
    pending: repositoryMigrations
      .map((migration) => migration.name)
      .filter((name) => !appliedNames.has(name))
      .sort(),
    databaseOnly: appliedRows
      .map((migration) => migration.migration_name)
      .filter((name) => !repositoryByName.has(name))
      .sort(),
    incomplete: databaseRows
      .filter(
        (migration) =>
          migration.finished_at === null && migration.rolled_back_at === null,
      )
      .map((migration) => migration.migration_name)
      .sort(),
    rolledBack: databaseRows
      .filter((migration) => migration.rolled_back_at !== null)
      .map((migration) => migration.migration_name)
      .sort(),
    checksumMismatches: appliedRows
      .filter((migration) => {
        const repositoryMigration = repositoryByName.get(
          migration.migration_name,
        );
        return (
          repositoryMigration !== undefined &&
          repositoryMigration.checksum !== migration.checksum
        );
      })
      .map((migration) => migration.migration_name)
      .sort(),
  };
}

function numberValue(
  value: bigint | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function aggregateNumbers(
  row: AggregateRow | undefined,
): Record<string, number> {
  if (!row) return {};
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, numberValue(value)]),
  );
}

function groupedCounts(rows: GroupedCountRow[]): Record<string, number> {
  return Object.fromEntries(
    rows.map((row) => [row.key ?? "UNSPECIFIED", Number(row.count)]),
  );
}

async function count(
  tx: Prisma.TransactionClient,
  tableSql: string,
): Promise<number> {
  const rows = await tx.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*)::bigint AS count FROM ${tableSql}`,
  );
  return Number(rows[0]?.count ?? 0n);
}

async function aggregate(
  tx: Prisma.TransactionClient,
  query: string,
): Promise<Record<string, number>> {
  const rows = await tx.$queryRawUnsafe<AggregateRow[]>(query);
  return aggregateNumbers(rows[0]);
}

async function group(
  tx: Prisma.TransactionClient,
  query: string,
): Promise<Record<string, number>> {
  return groupedCounts(await tx.$queryRawUnsafe<GroupedCountRow[]>(query));
}

function hasTables(
  availability: Record<ExpectedTable, boolean>,
  tables: ExpectedTable[],
): boolean {
  return tables.every((table) => availability[table]);
}

async function orphanCount(
  tx: Prisma.TransactionClient,
  availability: Record<ExpectedTable, boolean>,
  tables: ExpectedTable[],
  query: string,
): Promise<number | null> {
  if (!hasTables(availability, tables)) return null;
  const rows = await tx.$queryRawUnsafe<CountRow[]>(query);
  return Number(rows[0]?.count ?? 0n);
}

async function migrationRows(
  tx: Prisma.TransactionClient,
  trackingTablePresent: boolean,
): Promise<DatabaseMigrationRow[]> {
  if (!trackingTablePresent) return [];
  return tx.$queryRaw<DatabaseMigrationRow[]>`
    SELECT migration_name, checksum, started_at, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY started_at ASC
  `;
}

export async function diagnoseSchedulerData(
  tx: Prisma.TransactionClient,
  options: {
    environment: SchedulerDiagnosisEnvironment;
    repositoryMigrations: RepositoryMigration[];
    backupPitrConfirmedAt: string | null;
  },
): Promise<SchedulerDiagnosisReport> {
  const [metadata] = await tx.$queryRaw<DatabaseMetadataRow[]>`
    SELECT current_schema() AS schema_name,
           current_setting('server_version') AS server_version
  `;
  const databaseTables = await tx.$queryRaw<TableRow[]>`
    SELECT tablename AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = current_schema()
  `;
  const existingTables = new Set(databaseTables.map((row) => row.table_name));
  const customerColumns = existingTables.has("Customer")
    ? await tx.$queryRaw<ColumnRow[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'Customer'
      `
    : [];
  const phoneNormalizedColumnAvailable = customerColumns.some(
    (column) => column.column_name === "phoneNormalized",
  );
  const tableAvailability = Object.fromEntries(
    EXPECTED_TABLES.map((table) => [table, existingTables.has(table)]),
  ) as Record<ExpectedTable, boolean>;

  const migrations = classifyMigrations(
    options.repositoryMigrations,
    await migrationRows(tx, tableAvailability._prisma_migrations),
    tableAvailability._prisma_migrations,
  );

  const tableCounts: Record<string, number | null> = {};
  const countDefinitions: Array<[string, ExpectedTable, string]> = [
    ["branches", "Sucursal", '"Sucursal"'],
    ["employees", "Empleado", '"Empleado"'],
    ["positions", "Position", '"Position"'],
    ["customers", "Customer", '"Customer"'],
    ["customerSources", "CustomerSource", '"CustomerSource"'],
    ["packages", "PosPackage", '"PosPackage"'],
  ];
  for (const [key, table, tableSql] of countDefinitions) {
    tableCounts[key] = tableAvailability[table]
      ? await count(tx, tableSql)
      : null;
  }

  const branchMetrics = tableAvailability.Sucursal
    ? await aggregate(
        tx,
        `SELECT COUNT(*)::bigint AS total,
                COUNT(*) FILTER (WHERE activa)::bigint AS active,
                COUNT(*) FILTER (WHERE NOT activa)::bigint AS inactive
         FROM "Sucursal"`,
      )
    : {};
  const branchProfileCount = tableAvailability.SchedulerBranchProfile
    ? await count(tx, '"SchedulerBranchProfile"')
    : 0;
  const professionalProfileCount =
    tableAvailability.SchedulerProfessionalProfile
      ? await count(tx, '"SchedulerProfessionalProfile"')
      : 0;

  const serviceMetrics = tableAvailability.CatalogItem
    ? await aggregate(
        tx,
        `SELECT COUNT(*) FILTER (WHERE kind = 'SERVICE')::bigint AS total,
                COUNT(*) FILTER (WHERE kind = 'SERVICE' AND active)::bigint AS active,
                COUNT(*) FILTER (WHERE kind = 'SERVICE' AND published)::bigint AS published,
                COUNT(*) FILTER (WHERE kind = 'SERVICE' AND active AND published)::bigint AS "activePublished"
         FROM "CatalogItem"`,
      )
    : {};
  tableCounts.services = tableAvailability.CatalogItem
    ? (serviceMetrics["total"] ?? 0)
    : null;

  const serviceBranchMetrics = hasTables(tableAvailability, [
    "CatalogItem",
    "CatalogItemBranchVisibility",
  ])
    ? await aggregate(
        tx,
        `SELECT COUNT(*) FILTER (
                  WHERE i.kind = 'SERVICE'
                    AND NOT EXISTS (
                      SELECT 1 FROM "CatalogItemBranchVisibility" v
                      WHERE v."itemId" = i.id AND v.visible
                    )
                )::bigint AS "withoutVisibleBranch"
         FROM "CatalogItem" i`,
      )
    : {};
  const schedulerServiceMetrics = hasTables(tableAvailability, [
    "CatalogItem",
    "SchedulerServiceProfile",
  ])
    ? await aggregate(
        tx,
        `SELECT COUNT(*) FILTER (
                  WHERE i.kind = 'SERVICE' AND p.id IS NULL
                )::bigint AS "withoutProfile",
                COUNT(*) FILTER (
                  WHERE i.kind = 'SERVICE' AND i.active AND p.active
                )::bigint AS "activeProfiles"
         FROM "CatalogItem" i
         LEFT JOIN "SchedulerServiceProfile" p ON p."catalogItemId" = i.id`,
      )
    : {};

  const employeeMetrics = tableAvailability.Empleado
    ? await aggregate(
        tx,
        `SELECT COUNT(*)::bigint AS total,
                COUNT(*) FILTER (WHERE activo)::bigint AS active,
                COUNT(*) FILTER (
                  WHERE activo AND "sucursalId" IS NULL AND NOT "todasSucursales"
                )::bigint AS "activeWithoutBranchScope"
         FROM "Empleado"`,
      )
    : {};
  const historicalProfessionalMetrics = hasTables(tableAvailability, [
    "Empleado",
    "RegistroCita",
  ])
    ? await aggregate(
        tx,
        `SELECT COUNT(DISTINCT r."facialistaId")::bigint AS "withLegacyFacialistHistory",
                COUNT(DISTINCT r."facialistaId") FILTER (WHERE e.activo)::bigint AS "activeWithLegacyFacialistHistory"
         FROM "RegistroCita" r
         JOIN "Empleado" e ON e.id = r."facialistaId"`,
      )
    : {};

  const customerMetrics = tableAvailability.Customer
    ? await aggregate(
        tx,
        `SELECT COUNT(*)::bigint AS total,
                COUNT(*) FILTER (WHERE active)::bigint AS active,
                COUNT(*) FILTER (WHERE phone IS NOT NULL AND BTRIM(phone) <> '')::bigint AS "withPhone",
                COUNT(*) FILTER (WHERE phone IS NULL OR BTRIM(phone) = '')::bigint AS "withoutPhone",
                COUNT(*) FILTER (WHERE email IS NOT NULL AND BTRIM(email) <> '')::bigint AS "withEmail"
         FROM "Customer"`,
      )
    : {};
  const customerPhoneMetrics = tableAvailability.Customer
    ? await aggregate(
        tx,
        `WITH normalized AS (
           SELECT REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') AS phone_normalized
           FROM "Customer"
         ), duplicate_groups AS (
           SELECT phone_normalized, COUNT(*)::bigint AS records
           FROM normalized
           WHERE phone_normalized <> ''
           GROUP BY phone_normalized
           HAVING COUNT(*) > 1
         )
         SELECT (SELECT COUNT(*) FROM duplicate_groups)::bigint AS "duplicateGroups",
                COALESCE((SELECT SUM(records) FROM duplicate_groups), 0)::bigint AS "recordsInDuplicateGroups",
                COUNT(*) FILTER (WHERE phone_normalized = '')::bigint AS "emptyAfterNormalization",
                COUNT(*) FILTER (
                  WHERE phone_normalized <> '' AND LENGTH(phone_normalized) NOT BETWEEN 10 AND 15
                )::bigint AS "lengthReviewCandidates"
         FROM normalized`,
      )
    : {};
  const customerPhoneMaterializationMetrics =
    tableAvailability.Customer && phoneNormalizedColumnAvailable
      ? await aggregate(
          tx,
          `SELECT COUNT(*) FILTER (
                    WHERE phone IS NOT NULL AND BTRIM(phone) <> ''
                      AND "phoneNormalized" IS NULL
                  )::bigint AS "pendingMaterialization",
                  COUNT(*) FILTER (
                    WHERE "phoneNormalized" IS NOT NULL
                      AND "phoneNormalized" <> REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g')
                  )::bigint AS "materializationMismatches",
                  COUNT(*) FILTER (
                    WHERE "phoneNormalized" IS NOT NULL
                      AND "phoneNormalized" <> ''
                      AND LENGTH("phoneNormalized") NOT BETWEEN 10 AND 15
                  )::bigint AS "materializedLengthReviewCandidates"
           FROM "Customer"`,
        )
      : {};

  const registroCita = tableAvailability.RegistroCita
    ? {
        total: await count(tx, '"RegistroCita"'),
        byStatus: await group(
          tx,
          `SELECT estatus::text AS key, COUNT(*)::bigint AS count
           FROM "RegistroCita" GROUP BY estatus ORDER BY estatus`,
        ),
        byPurchaseType: await group(
          tx,
          `SELECT "tipoCompra"::text AS key, COUNT(*)::bigint AS count
           FROM "RegistroCita" GROUP BY "tipoCompra" ORDER BY "tipoCompra"`,
        ),
        withoutCanonicalCustomerLink: await count(tx, '"RegistroCita"'),
        canonicalCustomerLinkStatus: "FIELD_NOT_AVAILABLE_IN_CURRENT_MODEL",
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const posAppointment = tableAvailability.PosAppointment
    ? {
        total: await count(tx, '"PosAppointment"'),
        byStatus: await group(
          tx,
          `SELECT status::text AS key, COUNT(*)::bigint AS count
           FROM "PosAppointment" GROUP BY status ORDER BY status`,
        ),
        byKind: await group(
          tx,
          `SELECT kind::text AS key, COUNT(*)::bigint AS count
           FROM "PosAppointment" GROUP BY kind ORDER BY kind`,
        ),
        reviewCandidates: {
          ...(await aggregate(
            tx,
            `SELECT COUNT(*) FILTER (
                      WHERE status = 'SCHEDULED' AND "scheduledAt" IS NULL
                    )::bigint AS "scheduledWithoutDatetime",
                    COUNT(*) FILTER (
                      WHERE kind <> 'NO_APPOINTMENT' AND "serviceItemId" IS NULL
                    )::bigint AS "serviceKindWithoutCatalogItem"
             FROM "PosAppointment"`,
          )),
          ...(tableAvailability.AgendaReservation
            ? await aggregate(
                tx,
                `SELECT COUNT(*) FILTER (
                          WHERE status = 'SCHEDULED' AND "agendaReservationId" IS NULL
                        )::bigint AS "scheduledWithoutAgendaReservation"
                 FROM "PosAppointment"`,
              )
            : { scheduledWithoutAgendaReservation: null }),
        },
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const schedulerAppointment = tableAvailability.SchedulerAppointment
    ? {
        total: await count(tx, '"SchedulerAppointment"'),
        byStatus: await group(
          tx,
          `SELECT status::text AS key, COUNT(*)::bigint AS count
           FROM "SchedulerAppointment" GROUP BY status ORDER BY status`,
        ),
        reviewCandidates: await aggregate(
          tx,
          `SELECT COUNT(*) FILTER (WHERE "endsAt" <= "startsAt")::bigint AS "invalidTimeWindow",
                  COUNT(*) FILTER (WHERE version <= 0)::bigint AS "invalidVersion",
                  COUNT(*) FILTER (
                    WHERE status = 'CANCELED' AND "cancellationReason" IS NULL
                  )::bigint AS "canceledWithoutReason"
           FROM "SchedulerAppointment"`,
        ),
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const agendaResource = tableAvailability.AgendaResource
    ? {
        total: await count(tx, '"AgendaResource"'),
        byType: await group(
          tx,
          `SELECT type::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaResource" GROUP BY type ORDER BY type`,
        ),
        byActive: await group(
          tx,
          `SELECT active::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaResource" GROUP BY active ORDER BY active`,
        ),
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const agendaSlot = tableAvailability.AgendaSlot
    ? {
        total: await count(tx, '"AgendaSlot"'),
        byStatus: await group(
          tx,
          `SELECT status::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaSlot" GROUP BY status ORDER BY status`,
        ),
        reviewCandidates: await aggregate(
          tx,
          `SELECT COUNT(*) FILTER (WHERE "endsAt" <= "startsAt")::bigint AS "invalidTimeWindow",
                  COUNT(*) FILTER (WHERE capacity <= 0)::bigint AS "nonPositiveCapacity",
                  COUNT(*) FILTER (
                    WHERE "reservedCount" < 0 OR "reservedCount" > capacity
                  )::bigint AS "invalidReservedCount"
           FROM "AgendaSlot"`,
        ),
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const agendaReservation = tableAvailability.AgendaReservation
    ? {
        total: await count(tx, '"AgendaReservation"'),
        byStatus: await group(
          tx,
          `SELECT status::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaReservation" GROUP BY status ORDER BY status`,
        ),
        byMode: await group(
          tx,
          `SELECT mode::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaReservation" GROUP BY mode ORDER BY mode`,
        ),
        reviewCandidates: await aggregate(
          tx,
          `SELECT COUNT(*) FILTER (WHERE "customerId" IS NULL)::bigint AS "withoutCustomer",
                  COUNT(*) FILTER (WHERE "ticketId" IS NULL)::bigint AS "withoutTicket",
                  COUNT(*) FILTER (
                    WHERE status IN ('REMOTE_RESERVED', 'CONFIRMED')
                      AND "externalReservationId" IS NULL
                  )::bigint AS "remoteStateWithoutExternalReservation"
           FROM "AgendaReservation"`,
        ),
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const agendaSyncEvent = tableAvailability.AgendaSyncEvent
    ? {
        total: await count(tx, '"AgendaSyncEvent"'),
        byType: await group(
          tx,
          `SELECT type::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaSyncEvent" GROUP BY type ORDER BY type`,
        ),
        byDirection: await group(
          tx,
          `SELECT direction::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaSyncEvent" GROUP BY direction ORDER BY direction`,
        ),
        byStatus: await group(
          tx,
          `SELECT status::text AS key, COUNT(*)::bigint AS count
           FROM "AgendaSyncEvent" GROUP BY status ORDER BY status`,
        ),
      }
    : { total: null, tableStatus: "NOT_AVAILABLE" };

  const incompleteRelations: Record<string, number | null> = {
    customerMissingSource: await orphanCount(
      tx,
      tableAvailability,
      ["Customer", "CustomerSource"],
      `SELECT COUNT(*)::bigint AS count FROM "Customer" c
       WHERE c."sourceId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "CustomerSource" s WHERE s.id = c."sourceId")`,
    ),
    portfolioMissingCustomer: await orphanCount(
      tx,
      tableAvailability,
      ["CustomerPortfolioAssignment", "Customer"],
      `SELECT COUNT(*)::bigint AS count FROM "CustomerPortfolioAssignment" p
       WHERE NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = p."customerId")`,
    ),
    portfolioMissingBranch: await orphanCount(
      tx,
      tableAvailability,
      ["CustomerPortfolioAssignment", "Sucursal"],
      `SELECT COUNT(*)::bigint AS count FROM "CustomerPortfolioAssignment" p
       WHERE p."branchId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Sucursal" b WHERE b.id = p."branchId")`,
    ),
    portfolioMissingEmployee: await orphanCount(
      tx,
      tableAvailability,
      ["CustomerPortfolioAssignment", "Empleado"],
      `SELECT COUNT(*)::bigint AS count FROM "CustomerPortfolioAssignment" p
       WHERE p."employeeId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Empleado" e WHERE e.id = p."employeeId")`,
    ),
    portfolioMissingCompany: await orphanCount(
      tx,
      tableAvailability,
      ["CustomerPortfolioAssignment", "PosCommercialCompany"],
      `SELECT COUNT(*)::bigint AS count FROM "CustomerPortfolioAssignment" p
       WHERE p."companyId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "PosCommercialCompany" c WHERE c.id = p."companyId")`,
    ),
    serviceVisibilityMissingItem: await orphanCount(
      tx,
      tableAvailability,
      ["CatalogItemBranchVisibility", "CatalogItem"],
      `SELECT COUNT(*)::bigint AS count FROM "CatalogItemBranchVisibility" v
       WHERE NOT EXISTS (SELECT 1 FROM "CatalogItem" i WHERE i.id = v."itemId")`,
    ),
    serviceVisibilityMissingBranch: await orphanCount(
      tx,
      tableAvailability,
      ["CatalogItemBranchVisibility", "Sucursal"],
      `SELECT COUNT(*)::bigint AS count FROM "CatalogItemBranchVisibility" v
       WHERE NOT EXISTS (SELECT 1 FROM "Sucursal" b WHERE b.id = v."branchId")`,
    ),
    registroCitaMissingBranch: await orphanCount(
      tx,
      tableAvailability,
      ["RegistroCita", "Sucursal"],
      `SELECT COUNT(*)::bigint AS count FROM "RegistroCita" r
       WHERE NOT EXISTS (SELECT 1 FROM "Sucursal" b WHERE b.id = r."sucursalId")`,
    ),
    registroCitaMissingService: await orphanCount(
      tx,
      tableAvailability,
      ["RegistroCita", "SubcategoriaAtencion"],
      `SELECT COUNT(*)::bigint AS count FROM "RegistroCita" r
       WHERE NOT EXISTS (SELECT 1 FROM "SubcategoriaAtencion" s WHERE s.id = r."subcategoriaId")`,
    ),
    registroCitaMissingSeller: await orphanCount(
      tx,
      tableAvailability,
      ["RegistroCita", "Empleado"],
      `SELECT COUNT(*)::bigint AS count FROM "RegistroCita" r
       WHERE NOT EXISTS (SELECT 1 FROM "Empleado" e WHERE e.id = r."vendedorId")`,
    ),
    registroCitaMissingProfessional: await orphanCount(
      tx,
      tableAvailability,
      ["RegistroCita", "Empleado"],
      `SELECT COUNT(*)::bigint AS count FROM "RegistroCita" r
       WHERE NOT EXISTS (SELECT 1 FROM "Empleado" e WHERE e.id = r."facialistaId")`,
    ),
    registroCitaMissingCreator: await orphanCount(
      tx,
      tableAvailability,
      ["RegistroCita", "Usuario"],
      `SELECT COUNT(*)::bigint AS count FROM "RegistroCita" r
       WHERE NOT EXISTS (SELECT 1 FROM "Usuario" u WHERE u.id = r."creadoPorId")`,
    ),
    posAppointmentMissingTicket: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "PosTicket"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE NOT EXISTS (SELECT 1 FROM "PosTicket" t WHERE t.id = a."ticketId")`,
    ),
    posAppointmentMissingCustomer: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "Customer"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = a."customerId")`,
    ),
    posAppointmentMissingBranch: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "Sucursal"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE NOT EXISTS (SELECT 1 FROM "Sucursal" b WHERE b.id = a."branchId")`,
    ),
    posAppointmentMissingService: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "CatalogItem"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE a."serviceItemId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "CatalogItem" i WHERE i.id = a."serviceItemId")`,
    ),
    posAppointmentMissingSeller: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "Empleado"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE a."sellerId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Empleado" e WHERE e.id = a."sellerId")`,
    ),
    posAppointmentMissingAgendaResource: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "AgendaResource"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE a."agendaResourceId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "AgendaResource" r WHERE r.id = a."agendaResourceId")`,
    ),
    posAppointmentMissingAgendaSlot: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "AgendaSlot"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE a."agendaSlotId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "AgendaSlot" s WHERE s.id = a."agendaSlotId")`,
    ),
    posAppointmentMissingAgendaReservation: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "AgendaReservation"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE a."agendaReservationId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "AgendaReservation" r WHERE r.id = a."agendaReservationId")`,
    ),
    posAppointmentMissingMembership: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "PosClientMembership"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE a."membershipId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "PosClientMembership" m WHERE m.id = a."membershipId")`,
    ),
    posAppointmentMissingCreatorCredential: await orphanCount(
      tx,
      tableAvailability,
      ["PosAppointment", "PosCredential"],
      `SELECT COUNT(*)::bigint AS count FROM "PosAppointment" a
       WHERE NOT EXISTS (SELECT 1 FROM "PosCredential" c WHERE c.id = a."createdByCredentialId")`,
    ),
    agendaResourceMissingBranch: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaResource", "Sucursal"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaResource" r
       WHERE NOT EXISTS (SELECT 1 FROM "Sucursal" b WHERE b.id = r."branchId")`,
    ),
    agendaSlotMissingResource: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaSlot", "AgendaResource"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaSlot" s
       WHERE NOT EXISTS (SELECT 1 FROM "AgendaResource" r WHERE r.id = s."resourceId")`,
    ),
    agendaReservationMissingBranch: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaReservation", "Sucursal"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaReservation" r
       WHERE NOT EXISTS (SELECT 1 FROM "Sucursal" b WHERE b.id = r."branchId")`,
    ),
    agendaReservationMissingResource: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaReservation", "AgendaResource"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaReservation" r
       WHERE NOT EXISTS (SELECT 1 FROM "AgendaResource" a WHERE a.id = r."resourceId")`,
    ),
    agendaReservationMissingPrimarySlot: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaReservation", "AgendaSlot"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaReservation" r
       WHERE NOT EXISTS (SELECT 1 FROM "AgendaSlot" s WHERE s.id = r."primarySlotId")`,
    ),
    agendaReservationMissingCustomer: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaReservation", "Customer"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaReservation" r
       WHERE r."customerId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = r."customerId")`,
    ),
    agendaReservationMissingTicket: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaReservation", "PosTicket"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaReservation" r
       WHERE r."ticketId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "PosTicket" t WHERE t.id = r."ticketId")`,
    ),
    agendaSyncEventMissingReservation: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaSyncEvent", "AgendaReservation"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaSyncEvent" e
       WHERE e."reservationId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "AgendaReservation" r WHERE r.id = e."reservationId")`,
    ),
    agendaSyncEventMissingAppointment: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaSyncEvent", "PosAppointment"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaSyncEvent" e
       WHERE e."appointmentId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "PosAppointment" a WHERE a.id = e."appointmentId")`,
    ),
    agendaSyncEventMissingCustomer: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaSyncEvent", "Customer"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaSyncEvent" e
       WHERE e."customerId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = e."customerId")`,
    ),
    agendaSyncEventMissingResolverCredential: await orphanCount(
      tx,
      tableAvailability,
      ["AgendaSyncEvent", "PosCredential"],
      `SELECT COUNT(*)::bigint AS count FROM "AgendaSyncEvent" e
       WHERE e."resolvedByCredentialId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "PosCredential" c WHERE c.id = e."resolvedByCredentialId")`,
    ),
  };

  return {
    generatedAt: new Date().toISOString(),
    environment: options.environment,
    mode: "READ_ONLY_TRANSACTION",
    database: {
      schema: metadata?.schema_name ?? "unknown",
      serverVersion: metadata?.server_version ?? "unknown",
    },
    migrations,
    tableAvailability,
    reusableData: {
      branches: tableCounts["branches"] ?? null,
      employees: tableCounts["employees"] ?? null,
      positions: tableCounts["positions"] ?? null,
      customers: tableCounts["customers"] ?? null,
      customerSources: tableCounts["customerSources"] ?? null,
      services: tableCounts["services"] ?? null,
      packages: tableCounts["packages"] ?? null,
    },
    schedulerReadiness: {
      branches: {
        ...branchMetrics,
        schedulerProfileModelAvailable:
          tableAvailability.SchedulerBranchProfile,
        schedulerProfiles: branchProfileCount,
        withoutSchedulerProfile: tableAvailability.SchedulerBranchProfile
          ? Math.max((branchMetrics["total"] ?? 0) - branchProfileCount, 0)
          : (branchMetrics["total"] ?? null),
        reservationPolicy:
          "Una sucursal sin perfil no debe aceptar nuevas reservas",
      },
      services: {
        ...serviceMetrics,
        schedulerProfileModelAvailable:
          tableAvailability.SchedulerServiceProfile,
        withoutDuration: tableAvailability.SchedulerServiceProfile
          ? (schedulerServiceMetrics["withoutProfile"] ?? 0)
          : (serviceMetrics["total"] ?? null),
        durationAssessment: tableAvailability.SchedulerServiceProfile
          ? "PROFILE_REQUIRED_AND_POSITIVE_DURATION_ENFORCED"
          : "NO_SCHEDULER_SERVICE_PROFILE_MODEL",
        activeProfiles: schedulerServiceMetrics["activeProfiles"] ?? null,
        withoutVisibleBranch:
          serviceBranchMetrics["withoutVisibleBranch"] ?? null,
      },
      professionalCandidates: {
        ...employeeMetrics,
        ...historicalProfessionalMetrics,
        schedulerProfileModelAvailable:
          tableAvailability.SchedulerProfessionalProfile,
        schedulerProfiles: professionalProfileCount,
        activationPolicy: "EXPLICIT_REVIEW_REQUIRED",
        matchingPolicy: "NO_NAME_BASED_AUTOMATIC_MATCHING",
      },
      customers: {
        ...customerMetrics,
        ...customerPhoneMetrics,
        ...customerPhoneMaterializationMetrics,
        phoneNormalizedColumnAvailable,
        phoneNormalization: phoneNormalizedColumnAvailable
          ? "DIGITS_ONLY_V1_DUAL_WRITE"
          : "DIGITS_ONLY_V1_DIAGNOSTIC",
        duplicateResolutionPolicy: "REVIEW_BEFORE_UNIQUE_CONSTRAINT",
      },
    },
    appointmentInventory: {
      schedulerAppointment,
      registroCita,
      posAppointment,
      agendaResource,
      agendaSlot,
      agendaReservation,
      agendaSyncEvent,
    },
    incompleteRelations,
    backupAndPitr: {
      requiredBeforeProductionMigrations: true,
      operatorReportedConfirmationAt: options.backupPitrConfirmedAt,
      status: options.backupPitrConfirmedAt
        ? "OPERATOR_CONFIRMATION_RECORDED"
        : "NOT_APPLICABLE_TO_DIAGNOSIS",
    },
    privacy: {
      containsPersonalRecords: false,
      containsSecretsOrConnectionDetails: false,
      aggregationOnly: true,
    },
    notes: [
      "El reporte contiene únicamente conteos, clasificaciones y nombres versionados de migraciones; no lista clientes, empleados, teléfonos, correos ni credenciales.",
      "Los candidatos profesionales se derivan de actividad y relaciones históricas; nunca se activan ni se enlazan automáticamente por nombre.",
      "DIGITS_ONLY_V1 materializa sólo una clave de búsqueda/deduplicación; no reemplaza el teléfono original ni autoriza fusiones automáticas.",
      "Las tablas Agenda* son legado de integración; sus conteos no las convierten en la agenda canónica de Scheduler.",
      "Este comando no aplica migraciones, no corrige relaciones y no sustituye la aprobación humana del inventario o de la estrategia de backfill.",
    ],
  };
}
