import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../src/prisma/client";
import {
  membershipDto,
  membershipInclude,
} from "../src/services/pos-memberships";
import { ticketDto, ticketInclude } from "../src/services/pos-tickets";

const FIXTURE_PREFIX = "pos-rv9-p3-upgrade";
const BASELINE_MIGRATION = "20260909010000_pos_rv4_catalog_inventory_settings";
const CURRENT_MIGRATION =
  "20260916010000_add_pos_membership_revision_projections";

const ids = {
  branch: `${FIXTURE_PREFIX}-branch`,
  employee: `${FIXTURE_PREFIX}-employee`,
  credential: `${FIXTURE_PREFIX}-credential`,
  terminal: `${FIXTURE_PREFIX}-terminal`,
  customer: `${FIXTURE_PREFIX}-customer`,
  item: `${FIXTURE_PREFIX}-membership-item`,
  terms: `${FIXTURE_PREFIX}-terms`,
  paymentMethod: `${FIXTURE_PREFIX}-payment-method`,
  ticket: "10000000-0000-4000-8000-000000000003",
  ticketLine: `${FIXTURE_PREFIX}-ticket-line`,
  paymentOperation: "20000000-0000-4000-8000-000000000003",
  payment: `${FIXTURE_PREFIX}-payment`,
  membership: "30000000-0000-4000-8000-000000000003",
  syncOperation: `${FIXTURE_PREFIX}-sync-operation`,
  syncClientOperation: "40000000-0000-4000-8000-000000000003",
  syncIdempotency: "50000000-0000-4000-8000-000000000003",
  audit: `${FIXTURE_PREFIX}-audit`,
} as const;

function assertEphemeralDatabase(): void {
  if (process.env["POS_MIGRATION_FIXTURE_CONFIRMATION"] !== "EPHEMERAL_ONLY") {
    throw new Error(
      "POS_MIGRATION_FIXTURE_CONFIRMATION debe ser EPHEMERAL_ONLY.",
    );
  }
  const rawUrl = process.env["DATABASE_URL"];
  if (!rawUrl) throw new Error("DATABASE_URL es obligatoria.");
  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, "");
  const schema = url.searchParams.get("schema") ?? "public";
  if (
    !["127.0.0.1", "localhost", "::1"].includes(url.hostname) ||
    !database.includes("pos_upgrade") ||
    schema !== "public"
  ) {
    throw new Error(
      "El fixture sólo admite una PostgreSQL loopback desechable, una base con pos_upgrade y schema public.",
    );
  }
}

const generatedDigest = () =>
  createHash("sha256").update(randomBytes(48)).digest("hex");

async function appliedMigrations(): Promise<string[]> {
  const rows = await prisma.$queryRaw<
    Array<{ migration_name: string }>
  >`SELECT "migration_name"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
    ORDER BY "migration_name"`;
  return rows.map((row) => row.migration_name);
}

async function seed(): Promise<void> {
  const credentialHash = generatedDigest();
  const terminalHash = generatedDigest();
  const payloadHash = createHash("sha256")
    .update(`${FIXTURE_PREFIX}:pending-operation`)
    .digest("hex");

  await prisma.$transaction(async (tx) => {
    await tx.sucursal.create({
      data: { id: ids.branch, nombre: "Sucursal sintética RV9-P3" },
    });
    await tx.empleado.create({
      data: {
        id: ids.employee,
        nombres: "Operadora",
        apellidoPaterno: "Sintética",
        apellidoMaterno: "RV9",
        nombreCompleto: "Operadora Sintética RV9",
        banco: "PRUEBA_LOCAL",
        numeroCuenta: generatedDigest(),
        puesto: "PRUEBA_LOCAL",
        metaIndividual: 0,
        sucursalId: ids.branch,
      },
    });
    await tx.posCredential.create({
      data: {
        id: ids.credential,
        employeeId: ids.employee,
        alias: "Operadora sintética RV9",
        aliasNormalized: FIXTURE_PREFIX,
        pinHash: credentialHash,
        pinFingerprint: generatedDigest(),
      },
    });
    await tx.posTerminal.create({
      data: {
        id: ids.terminal,
        code: "RV9-P3-LOCAL",
        name: "Terminal sintética RV9-P3",
        status: "ACTIVE",
        branchId: ids.branch,
        secretHash: terminalHash,
        secretFingerprint: generatedDigest(),
      },
    });
    await tx.customer.create({
      data: {
        id: ids.customer,
        displayName: "Clienta Sintética RV9",
        normalizedName: "clienta sintetica rv9",
        phone: "+525500009003",
        phoneNormalized: "+525500009003",
      },
    });
    await tx.catalogItem.create({
      data: {
        id: ids.item,
        sku: "RV9-P3-MEMBERSHIP",
        name: "Membresía sintética RV9",
        normalizedName: "membresia sintetica rv9",
        kind: "MEMBERSHIP",
        published: true,
        listPrice: 450,
        minimumPrice: 400,
      },
    });
    await tx.posMembershipTerms.create({
      data: {
        id: ids.terms,
        itemId: ids.item,
        version: 1,
        totalSessions: 4,
        renewalThreshold: 1,
        conditions: { fixture: FIXTURE_PREFIX },
        createdByCredentialId: ids.credential,
      },
    });
    await tx.metodoPago.create({
      data: {
        id: ids.paymentMethod,
        nombre: "Efectivo sintético RV9",
        tipo: "EFECTIVO",
      },
    });
    await tx.posTicket.create({
      data: {
        id: ids.ticket,
        folio: "RV9-P3-TICKET-0001",
        terminalSequence: 1,
        status: "COMPLETED",
        settlementStatus: "PAID",
        businessDate: new Date("2026-09-15T00:00:00.000Z"),
        branchId: ids.branch,
        terminalId: ids.terminal,
        createdByCredentialId: ids.credential,
        customerId: ids.customer,
        customerNameSnapshot: "Clienta Sintética RV9",
        customerPhoneSnapshot: "+525500009003",
        subtotal: 450,
        minimumTotal: 400,
        spareTotal: 50,
        discountTotal: 0,
        taxTotal: 0,
        total: 450,
        amountPaid: 450,
        pendingAmount: 0,
      },
    });
    await tx.posTicketLine.create({
      data: {
        id: ids.ticketLine,
        ticketId: ids.ticket,
        itemId: ids.item,
        itemNameSnapshot: "Membresía sintética RV9",
        skuSnapshot: "RV9-P3-MEMBERSHIP",
        quantity: 1,
        unitListPrice: 450,
        unitMinimumPrice: 400,
        unitPrice: 450,
        unitCostSnapshot: 100,
        taxRateSnapshot: 0,
        subtotal: 450,
        minimumTotal: 400,
        discountTotal: 0,
        taxTotal: 0,
        total: 450,
      },
    });
    await tx.posTicketSeller.create({
      data: {
        ticketId: ids.ticket,
        employeeId: ids.employee,
        sellerNameSnapshot: "Operadora Sintética RV9",
        shareAmount: 450,
        sharePercent: 100,
        clockedInSnapshot: true,
        presenceBranchIdSnapshot: ids.branch,
      },
    });
    await tx.posPaymentOperation.create({
      data: {
        id: ids.paymentOperation,
        ticketId: ids.ticket,
        folio: "RV9-P3-PAYMENT-0001",
        kind: "SALE",
        amount: 450,
        businessDate: new Date("2026-09-15T00:00:00.000Z"),
        actorCredentialId: ids.credential,
        terminalId: ids.terminal,
      },
    });
    await tx.posPayment.create({
      data: {
        id: ids.payment,
        operationId: ids.paymentOperation,
        paymentMethodId: ids.paymentMethod,
        methodNameSnapshot: "Efectivo sintético RV9",
        methodTypeSnapshot: "EFECTIVO",
        amount: 450,
      },
    });
    await tx.posClientMembership.create({
      data: {
        id: ids.membership,
        folio: "RV9-P3-MEMBERSHIP-0001",
        ticketId: ids.ticket,
        ticketLineId: ids.ticketLine,
        unitOrdinal: 1,
        customerId: ids.customer,
        customerNameSnapshot: "Clienta Sintética RV9",
        customerPhoneSnapshot: "+525500009003",
        membershipItemId: ids.item,
        membershipNameSnapshot: "Membresía sintética RV9",
        membershipSkuSnapshot: "RV9-P3-MEMBERSHIP",
        termsId: ids.terms,
        termsVersionSnapshot: 1,
        totalSessions: 4,
        usedSessions: 1,
        renewalThreshold: 1,
        purchaseAmount: 450,
        purchaseBranchId: ids.branch,
        purchaseBranchNameSnapshot: "Sucursal sintética RV9-P3",
        originalSellerId: ids.employee,
        originalSellerNameSnapshot: "Operadora Sintética RV9",
        currentSellerId: ids.employee,
        currentSellerNameSnapshot: "Operadora Sintética RV9",
        profile: "LOYAL",
        status: "ACTIVE",
        activatedAt: new Date("2026-09-15T12:00:00.000Z"),
        purchasedAt: new Date("2026-09-15T12:00:00.000Z"),
      },
    });
    await tx.posSyncOperation.create({
      data: {
        id: ids.syncOperation,
        clientOperationId: ids.syncClientOperation,
        terminalId: ids.terminal,
        terminalSequence: 2,
        credentialId: ids.credential,
        kind: "TICKET_CREATE",
        idempotencyKey: ids.syncIdempotency,
        dependencyIds: [],
        payloadHash,
        status: "PENDING",
        clientCreatedAt: new Date("2026-09-15T12:05:00.000Z"),
      },
    });
    await tx.auditLog.create({
      data: {
        id: ids.audit,
        action: "POS_RV9_P3_SYNTHETIC_SNAPSHOT",
        outcome: "SUCCESS",
        actorCredentialId: ids.credential,
        terminalId: ids.terminal,
        branchId: ids.branch,
        targetType: "PosTicket",
        targetId: ids.ticket,
        metadata: { fixture: FIXTURE_PREFIX, synthetic: true },
      },
    });
  });
}

async function verifyBaseline(): Promise<Record<string, unknown>> {
  const migrations = await appliedMigrations();
  if (migrations.length !== 45 || migrations.at(-1) !== BASELINE_MIGRATION) {
    throw new Error(
      `Snapshot inesperado: ${migrations.length} migraciones; última ${migrations.at(-1) ?? "ninguna"}.`,
    );
  }
  const [ticket, membership, syncOperation, audit] = await Promise.all([
    prisma.posTicket.findUnique({ where: { id: ids.ticket } }),
    prisma.posClientMembership.findUnique({ where: { id: ids.membership } }),
    prisma.posSyncOperation.findUnique({ where: { id: ids.syncOperation } }),
    prisma.auditLog.findUnique({ where: { id: ids.audit } }),
  ]);
  if (
    !ticket ||
    ticket.total.toFixed(2) !== "450.00" ||
    !membership ||
    membership.purchaseAmount.toFixed(2) !== "450.00" ||
    membership.usedSessions !== 1 ||
    syncOperation?.status !== "PENDING" ||
    !Array.isArray(syncOperation.dependencyIds) ||
    audit?.action !== "POS_RV9_P3_SYNTHETIC_SNAPSHOT"
  ) {
    throw new Error("El snapshot base no conservó sus invariantes sintéticas.");
  }
  return {
    migrationCount: migrations.length,
    lastMigration: migrations.at(-1),
    ticketTotal: ticket.total.toFixed(2),
    membershipPurchaseAmount: membership.purchaseAmount.toFixed(2),
    membershipUsedSessions: membership.usedSessions,
    pendingOutboxOperations: 1,
    auditRows: 1,
  };
}

async function verifyCurrent(): Promise<Record<string, unknown>> {
  const migrations = await appliedMigrations();
  if (migrations.length !== 46 || migrations.at(-1) !== CURRENT_MIGRATION) {
    throw new Error(
      `Upgrade inesperado: ${migrations.length} migraciones; última ${migrations.at(-1) ?? "ninguna"}.`,
    );
  }
  const [ticket, membership, syncOperation, audit, projectionMetadata] =
    await Promise.all([
      prisma.posTicket.findUnique({
        where: { id: ids.ticket },
        include: ticketInclude,
      }),
      prisma.posClientMembership.findUnique({
        where: { id: ids.membership },
        include: membershipInclude,
      }),
      prisma.posSyncOperation.findUnique({ where: { id: ids.syncOperation } }),
      prisma.auditLog.findUnique({ where: { id: ids.audit } }),
      prisma.$queryRaw<Array<{ tables: bigint; triggers: bigint }>>`
        SELECT
          COUNT(DISTINCT c.oid)::bigint AS tables,
          COUNT(DISTINCT t.oid)::bigint AS triggers
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_trigger t
          ON t.tgrelid = c.oid
          AND t.tgname = 'PosMembershipRevisionProjection_append_only'
          AND NOT t.tgisinternal
        WHERE n.nspname = current_schema()
          AND c.relname = 'PosMembershipRevisionProjection'
          AND c.relkind = 'r'`,
    ]);
  if (!ticket || !membership) {
    throw new Error("El upgrade perdió el ticket o la membresía sintéticos.");
  }
  const ticketProjection = ticketDto(ticket);
  const membershipProjection = membershipDto(membership);
  const metadata = projectionMetadata[0];
  if (
    ticketProjection.total !== "450.00" ||
    ticketProjection.paymentOperations.length !== 1 ||
    ticketProjection.memberships.length !== 1 ||
    membershipProjection.purchaseAmount !== "450.00" ||
    membershipProjection.remainingSessions !== 3 ||
    syncOperation?.status !== "PENDING" ||
    !Array.isArray(syncOperation.dependencyIds) ||
    audit?.action !== "POS_RV9_P3_SYNTHETIC_SNAPSHOT" ||
    Number(metadata?.tables ?? 0) !== 1 ||
    Number(metadata?.triggers ?? 0) !== 1
  ) {
    throw new Error(
      "El upgrade no preservó integridad, outbox, auditoría o proyecciones consumidoras.",
    );
  }
  return {
    migrationCount: migrations.length,
    lastMigration: migrations.at(-1),
    ticketConsumer: {
      total: ticketProjection.total,
      payments: ticketProjection.paymentOperations.length,
      memberships: ticketProjection.memberships.length,
    },
    membershipConsumer: {
      purchaseAmount: membershipProjection.purchaseAmount,
      remainingSessions: membershipProjection.remainingSessions,
    },
    pendingOutboxOperations: 1,
    auditRows: 1,
    projectionTable: 1,
    appendOnlyTrigger: 1,
  };
}

async function main(): Promise<void> {
  assertEphemeralDatabase();
  const command = process.argv[2];
  let result: Record<string, unknown> | undefined;
  if (command === "seed") await seed();
  else if (command === "verify-baseline") result = await verifyBaseline();
  else if (command === "verify-current") result = await verifyCurrent();
  else {
    throw new Error(
      "Uso: pos-migration-recovery-fixture.ts <seed|verify-baseline|verify-current>",
    );
  }
  process.stdout.write(
    `${JSON.stringify({ status: "PASS", command, ...result })}\n`,
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Falló el fixture de migración POS",
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
