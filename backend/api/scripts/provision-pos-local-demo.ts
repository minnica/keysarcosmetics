import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "@prisma/client";
import { POS_PERMISSION_KEYS, type PosPermissionKey } from "@cosmetics/types";
import { prisma } from "../src/prisma/client";
import {
  createTerminalSecret,
  fingerprintSecret,
  hashPosSecret,
  normalizePosAlias,
  normalizeTerminalCode,
  verifyPosSecret,
} from "../src/services/pos-security";

const CONFIRMATION = "LOCAL_SYNTHETIC_ONLY";
const DATASET_MARKER_ACTION = "POS_SYNTHETIC_DATASET_PROVISIONED";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const ALLOWED_DATABASE = /^keysar_pos_demo(?:_[a-z0-9_]+)?$/;
const DATASET_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;
const operatorPermissionKeys = [
  "DASHBOARD_VIEW",
  "SALE_VIEW",
  "SALE_CREATE",
  "SALE_VIEW_OWN",
  "SELLER_SALES_VIEW",
  "SELLER_SALES_PRINT",
  "RECEIPTS_VIEW",
  "RECEIPTS_PRINT",
  "CUSTOMERS_VIEW",
  "CUSTOMERS_MANAGE",
  "CUSTOMERS_PRINT",
  "APPOINTMENTS_VIEW",
  "APPOINTMENTS_MANAGE",
  "APPOINTMENTS_PRINT",
  "MEMBERSHIPS_VIEW",
  "MEMBERSHIPS_MANAGE",
  "MEMBERSHIPS_PRINT",
  "CATALOG_VIEW",
  "INVENTORY_VIEW",
  "INVENTORY_PRINT",
  "INVENTORY_MOVEMENTS_VIEW",
  "WAREHOUSE_BRANCH_REQUEST",
  "WAREHOUSE_BRANCH_VIEW",
  "WAREHOUSE_BRANCH_PRINT",
  "BUSINESS_DAY_OPEN",
  "BUSINESS_DAY_CLOSE",
  "CASH_VIEW",
  "CASH_PRINT",
  "X_REPORT_VIEW",
  "X_REPORT_PRINT",
  "REPORTS_VIEW",
  "REPORTS_PRINT",
  "MY_ACCOUNT_VIEW",
  "CLOCK_IN_VIEW",
  "SESSION_EXIT",
] as const satisfies readonly PosPermissionKey[];

type Command = "provision" | "verify";
type DemoSecrets = {
  schemaVersion: 1;
  datasetId: string;
  generatedAt: string;
  master: {
    alias: string;
    pin: string;
    email: string;
    password: string;
  };
  operator: {
    alias: string;
    pin: string;
    email: string;
    password: string;
  };
  terminal: { code: string; secret: string };
};
type GuardedContext = {
  command: Command;
  datasetId: string;
  slug: string;
  label: string;
  credentialsFile: string;
  databaseName: string;
  databaseUser: string;
};
type DemoIds = ReturnType<typeof idsFor>;

function fail(message: string): never {
  throw new Error(message);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  return value || fail(`Falta ${name}.`);
}

function parseDatabaseUrl(name: "DATABASE_URL" | "DIRECT_URL") {
  const raw = requiredEnvironment(name);
  let value: URL;
  try {
    value = new URL(raw);
  } catch {
    return fail(`${name} no es una URL PostgreSQL válida.`);
  }
  if (!["postgresql:", "postgres:"].includes(value.protocol)) {
    fail(`${name} debe usar PostgreSQL.`);
  }
  if (!LOCAL_HOSTS.has(value.hostname)) {
    fail(`${name} debe apuntar explícitamente a loopback.`);
  }
  const databaseName = decodeURIComponent(value.pathname.replace(/^\//, ""));
  if (!ALLOWED_DATABASE.test(databaseName)) {
    fail(
      `${name} debe usar una base dedicada llamada keysar_pos_demo o keysar_pos_demo_<sufijo>.`,
    );
  }
  const databaseUser = decodeURIComponent(value.username);
  if (!databaseUser || databaseUser === "postgres") {
    fail(`${name} debe usar un usuario dedicado distinto de postgres.`);
  }
  return {
    value,
    databaseName,
    databaseUser,
    endpoint: `${value.hostname}:${value.port || "5432"}/${databaseName}`,
  };
}

function assertStatePath(path: string): string {
  const repoRoot = resolve(__dirname, "../../..");
  const stateRoot = resolve(repoRoot, ".pos-runner");
  const resolved = resolve(path);
  const relation = relative(stateRoot, resolved);
  if (!relation || relation.startsWith("..") || relation.includes("../")) {
    fail(`POS_DEMO_CREDENTIALS_FILE debe quedar dentro de ${stateRoot}.`);
  }
  return resolved;
}

function guardedContext(): GuardedContext {
  if (process.env.POS_DEMO_CONFIRMATION !== CONFIRMATION) {
    fail(
      `Define POS_DEMO_CONFIRMATION=${CONFIRMATION} para usar datos sintéticos locales.`,
    );
  }
  const command = process.argv[2] as Command | undefined;
  if (command !== "provision" && command !== "verify") {
    fail("Uso: provision-pos-local-demo.ts provision|verify");
  }
  const datasetId = requiredEnvironment("POS_DEMO_DATASET_ID");
  if (!DATASET_PATTERN.test(datasetId)) {
    fail(
      "POS_DEMO_DATASET_ID debe ser un slug minúsculo de 3 a 32 caracteres.",
    );
  }
  const database = parseDatabaseUrl("DATABASE_URL");
  const direct = parseDatabaseUrl("DIRECT_URL");
  if (
    database.endpoint !== direct.endpoint ||
    database.databaseUser !== direct.databaseUser ||
    database.value.href !== direct.value.href
  ) {
    fail(
      "DATABASE_URL y DIRECT_URL deben apuntar a la misma base local dedicada.",
    );
  }
  return {
    command,
    datasetId,
    slug: datasetId.replaceAll("-", ""),
    label: datasetId.toUpperCase(),
    credentialsFile: assertStatePath(
      requiredEnvironment("POS_DEMO_CREDENTIALS_FILE"),
    ),
    databaseName: database.databaseName,
    databaseUser: database.databaseUser,
  };
}

function randomPin(): string {
  return String(randomInt(100_000, 1_000_000));
}

function randomPassword(): string {
  return `Demo-${randomBytes(24).toString("base64url")}`;
}

function expectedAliases(datasetId: string) {
  return {
    master: `demo.master.${datasetId}`,
    operator: `demo.operador.${datasetId}`,
    terminal: normalizeTerminalCode(`DEMO-${datasetId}-01`),
  };
}

function isDemoSecrets(
  value: unknown,
  datasetId: string,
): value is DemoSecrets {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoSecrets>;
  const aliases = expectedAliases(datasetId);
  return (
    candidate.schemaVersion === 1 &&
    candidate.datasetId === datasetId &&
    candidate.master?.alias === aliases.master &&
    candidate.operator?.alias === aliases.operator &&
    candidate.terminal?.code === aliases.terminal &&
    /^\d{6}$/.test(candidate.master.pin) &&
    /^\d{6}$/.test(candidate.operator.pin) &&
    typeof candidate.master.password === "string" &&
    candidate.master.password.length >= 32 &&
    typeof candidate.operator.password === "string" &&
    candidate.operator.password.length >= 32 &&
    typeof candidate.terminal.secret === "string" &&
    candidate.terminal.secret.length >= 32
  );
}

function loadSecrets(context: GuardedContext): DemoSecrets {
  if (!existsSync(context.credentialsFile)) {
    fail(
      `No existe el archivo local de credenciales ${context.credentialsFile}.`,
    );
  }
  const parsed = JSON.parse(
    readFileSync(context.credentialsFile, "utf8"),
  ) as unknown;
  if (!isDemoSecrets(parsed, context.datasetId)) {
    fail(
      "El archivo local de credenciales no corresponde al dataset solicitado.",
    );
  }
  chmodSync(dirname(context.credentialsFile), 0o700);
  chmodSync(context.credentialsFile, 0o600);
  return parsed;
}

function loadOrCreateSecrets(context: GuardedContext): DemoSecrets {
  if (existsSync(context.credentialsFile)) return loadSecrets(context);
  const aliases = expectedAliases(context.datasetId);
  const secrets: DemoSecrets = {
    schemaVersion: 1,
    datasetId: context.datasetId,
    generatedAt: new Date().toISOString(),
    master: {
      alias: aliases.master,
      pin: randomPin(),
      email: `${context.slug}.master@demo.keysar.test`,
      password: randomPassword(),
    },
    operator: {
      alias: aliases.operator,
      pin: randomPin(),
      email: `${context.slug}.operador@demo.keysar.test`,
      password: randomPassword(),
    },
    terminal: { code: aliases.terminal, secret: createTerminalSecret() },
  };
  mkdirSync(dirname(context.credentialsFile), { recursive: true, mode: 0o700 });
  chmodSync(dirname(context.credentialsFile), 0o700);
  writeFileSync(
    context.credentialsFile,
    `${JSON.stringify(secrets, null, 2)}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    },
  );
  chmodSync(context.credentialsFile, 0o600);
  return secrets;
}

function idsFor(datasetId: string) {
  const prefix = `pos-demo-${datasetId}`;
  return {
    marker: prefix,
    branch: `${prefix}-branch`,
    branchProfile: `${prefix}-branch-profile`,
    // La migración canónica crea una sola bodega matriz con este ID.
    warehouse: "pos-loc-matrix",
    branchLocation: `${prefix}-branch-location`,
    masterPosition: `${prefix}-master-position`,
    operatorPosition: `${prefix}-operator-position`,
    masterEmployee: `${prefix}-master-employee`,
    operatorEmployee: `${prefix}-operator-employee`,
    masterUser: `${prefix}-master-user`,
    operatorUser: `${prefix}-operator-user`,
    masterCredential: `${prefix}-master-credential`,
    operatorCredential: `${prefix}-operator-credential`,
    terminal: `${prefix}-terminal`,
    customerSource: `${prefix}-customer-source`,
    customerPrimary: `${prefix}-customer-primary`,
    customerSecondary: `${prefix}-customer-secondary`,
    product: `${prefix}-product`,
    supply: `${prefix}-supply`,
    service: `${prefix}-service`,
    membership: `${prefix}-membership`,
    productPrice: `${prefix}-product-price`,
    supplyPrice: `${prefix}-supply-price`,
    servicePrice: `${prefix}-service-price`,
    membershipPrice: `${prefix}-membership-price`,
    membershipTerms: `${prefix}-membership-terms`,
    cashMethod: `${prefix}-payment-cash`,
    cardMethod: `${prefix}-payment-card`,
    transferMethod: `${prefix}-payment-transfer`,
    priceList: `${prefix}-price-list`,
    priceListLine: `${prefix}-price-list-line`,
    priceListBranch: `${prefix}-price-list-branch`,
    // Catálogos nacionales/canónicos ya creados por la migración comercial.
    bank: "MX-BANK-038",
    networkVisa: "VISA",
    networkMastercard: "MASTERCARD",
    installment3: "MONTHS-03",
    installment6: "MONTHS-06",
    courtesyFacial: `${prefix}-courtesy-facial`,
    courtesyBody: `${prefix}-courtesy-body`,
    courtesyPackage: `${prefix}-courtesy-package`,
    courtesyLineFacial: `${prefix}-courtesy-line-facial`,
    courtesyLineBody: `${prefix}-courtesy-line-body`,
    courtesyPolicy: `${prefix}-courtesy-policy`,
    courtesyConfig: `${prefix}-courtesy-config`,
    ticketConfig: `${prefix}-ticket-config`,
    expenseType: `${prefix}-expense-type`,
    schedulerCommerce: `${prefix}-scheduler-commerce`,
    schedulerBranch: `${prefix}-scheduler-branch`,
    schedulerProfessional: `${prefix}-scheduler-professional`,
    schedulerService: `${prefix}-scheduler-service`,
    schedulerProfessionalBranch: `${prefix}-scheduler-professional-branch`,
    schedulerServiceBranch: `${prefix}-scheduler-service-branch`,
    schedulerProfessionalService: `${prefix}-scheduler-professional-service`,
    schedulerSetting: `${prefix}-scheduler-setting`,
  };
}

function deterministicUuid(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

async function assertDatabaseGuard(context: GuardedContext) {
  const rows = await prisma.$queryRaw<
    Array<{
      database_name: string;
      database_user: string;
      schema_name: string;
    }>
  >`SELECT current_database() AS database_name,
           current_user AS database_user,
           current_schema() AS schema_name`;
  const row = rows[0] ?? fail("No se pudo inspeccionar la base local.");
  if (
    row.database_name !== context.databaseName ||
    row.database_user !== context.databaseUser ||
    row.schema_name !== "public"
  ) {
    fail(
      "La conexión efectiva no corresponde a la base PostgreSQL local dedicada.",
    );
  }

  const marker = await prisma.auditLog.findFirst({
    where: {
      action: DATASET_MARKER_ACTION,
      targetType: "SyntheticDataset",
      targetId: context.datasetId,
      outcome: "SUCCESS",
    },
    select: { id: true },
  });
  if (marker) return;
  const [branches, users, employees, customers, items, tickets] =
    await Promise.all([
      prisma.sucursal.count(),
      prisma.usuario.count(),
      prisma.empleado.count(),
      prisma.customer.count(),
      prisma.catalogItem.count(),
      prisma.posTicket.count(),
    ]);
  if (branches + users + employees + customers + items + tickets > 0) {
    fail(
      "La base contiene datos previos y no tiene el marcador de este dataset; usa otra base local dedicada.",
    );
  }
}

async function upsertCatalogItem(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    sku: string;
    name: string;
    kind: "PRODUCT" | "SERVICE" | "SUPPLY" | "MEMBERSHIP";
    description: string;
    listPrice: string;
    minimumPrice: string;
    unitCost: string;
    branchId: string;
    priceId: string;
    actorCredentialId: string;
  },
) {
  const normalizedName = input.name.toLocaleLowerCase("es-MX");
  await tx.catalogItem.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      sku: input.sku,
      name: input.name,
      normalizedName,
      kind: input.kind,
      description: input.description,
      published: true,
      active: true,
      listPrice: input.listPrice,
      minimumPrice: input.minimumPrice,
      unitCost: input.unitCost,
      taxRate: "16.00",
      includesVat: true,
    },
    update: {
      name: input.name,
      normalizedName,
      description: input.description,
      published: true,
      active: true,
      listPrice: input.listPrice,
      minimumPrice: input.minimumPrice,
      unitCost: input.unitCost,
      taxRate: "16.00",
      includesVat: true,
    },
  });
  await tx.catalogItemBranchVisibility.upsert({
    where: { itemId_branchId: { itemId: input.id, branchId: input.branchId } },
    create: { itemId: input.id, branchId: input.branchId, visible: true },
    update: { visible: true },
  });
  await tx.catalogItemPrice.upsert({
    where: { id: input.priceId },
    create: {
      id: input.priceId,
      itemId: input.id,
      listPrice: input.listPrice,
      minimumPrice: input.minimumPrice,
      unitCost: input.unitCost,
      taxRate: "16.00",
      createdByCredentialId: input.actorCredentialId,
    },
    update: {},
  });
}

async function provisionDataset(
  context: GuardedContext,
  secrets: DemoSecrets,
  ids: DemoIds,
) {
  const [
    masterPasswordHash,
    operatorPasswordHash,
    masterPinHash,
    operatorPinHash,
    terminalHash,
  ] = await Promise.all([
    bcrypt.hash(secrets.master.password, 12),
    bcrypt.hash(secrets.operator.password, 12),
    hashPosSecret(secrets.master.pin),
    hashPosSecret(secrets.operator.pin),
    hashPosSecret(secrets.terminal.secret),
  ]);
  const label = context.label;
  const now = new Date();
  const effectiveFrom = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));

  await prisma.$transaction(
    async (tx) => {
      await tx.sucursal.upsert({
        where: { id: ids.branch },
        create: {
          id: ids.branch,
          nombre: `Sucursal demo ${label} · DATOS SINTÉTICOS`,
          metaMensual: "100000.00",
        },
        update: { activa: true, desactivadaEn: null },
      });
      await tx.posBranchProfile.upsert({
        where: { branchId: ids.branch },
        create: {
          id: ids.branchProfile,
          branchId: ids.branch,
          code: `D-${context.slug}`.slice(0, 32).toUpperCase(),
          address: "Dirección sintética; no corresponde a una sucursal real",
          timezone: "America/Mexico_City",
        },
        update: { activo: true, timezone: "America/Mexico_City" },
      });
      await tx.position.upsert({
        where: { id: ids.masterPosition },
        create: {
          id: ids.masterPosition,
          nombre: `Demo Master ${label}`,
          posDescription: "Perfil master sintético para prueba local",
          canManageAccess: true,
        },
        update: { activo: true, canManageAccess: true },
      });
      await tx.position.upsert({
        where: { id: ids.operatorPosition },
        create: {
          id: ids.operatorPosition,
          nombre: `Demo Operador ${label}`,
          posDescription: "Operación POS sin privilegios administrativos",
        },
        update: { activo: true, canManageAccess: false },
      });
      await tx.empleado.upsert({
        where: { id: ids.masterEmployee },
        create: {
          id: ids.masterEmployee,
          nombres: "Master",
          apellidoPaterno: "Demo",
          apellidoMaterno: label,
          nombreCompleto: `Master Demo ${label}`,
          banco: "SINTÉTICO",
          numeroCuenta: `DEMO-M-${context.slug}`,
          puesto: "MASTER DEMO",
          positionId: ids.masterPosition,
          sucursalId: ids.branch,
          todasSucursales: false,
          metaIndividual: "0.00",
        },
        update: {
          activo: true,
          positionId: ids.masterPosition,
          sucursalId: ids.branch,
          todasSucursales: false,
        },
      });
      await tx.empleado.upsert({
        where: { id: ids.operatorEmployee },
        create: {
          id: ids.operatorEmployee,
          nombres: "Operadora",
          apellidoPaterno: "Demo",
          apellidoMaterno: label,
          nombreCompleto: `Operadora Demo ${label}`,
          banco: "SINTÉTICO",
          numeroCuenta: `DEMO-O-${context.slug}`,
          puesto: "OPERADOR DEMO",
          positionId: ids.operatorPosition,
          sucursalId: ids.branch,
          metaIndividual: "25000.00",
        },
        update: {
          activo: true,
          positionId: ids.operatorPosition,
          sucursalId: ids.branch,
          todasSucursales: false,
        },
      });
      await tx.usuario.upsert({
        where: { id: ids.masterUser },
        create: {
          id: ids.masterUser,
          nombre: `Administración demo ${label}`,
          email: secrets.master.email,
          passwordHash: masterPasswordHash,
          rol: "SUPER_ADMIN",
          empleadoId: ids.masterEmployee,
          sucursalId: ids.branch,
        },
        update: {
          activo: true,
          email: secrets.master.email,
          passwordHash: masterPasswordHash,
          rol: "SUPER_ADMIN",
          empleadoId: ids.masterEmployee,
          sucursalId: ids.branch,
        },
      });
      await tx.usuario.upsert({
        where: { id: ids.operatorUser },
        create: {
          id: ids.operatorUser,
          nombre: `Operadora demo ${label}`,
          email: secrets.operator.email,
          passwordHash: operatorPasswordHash,
          rol: "CAPTURISTA",
          empleadoId: ids.operatorEmployee,
          sucursalId: ids.branch,
        },
        update: {
          activo: true,
          email: secrets.operator.email,
          passwordHash: operatorPasswordHash,
          rol: "CAPTURISTA",
          empleadoId: ids.operatorEmployee,
          sucursalId: ids.branch,
        },
      });
      await tx.posCredential.upsert({
        where: { id: ids.masterCredential },
        create: {
          id: ids.masterCredential,
          userId: ids.masterUser,
          alias: secrets.master.alias,
          aliasNormalized: normalizePosAlias(secrets.master.alias),
          pinHash: masterPinHash,
          pinFingerprint: fingerprintSecret(secrets.master.pin, "pin"),
          active: true,
          offlineEnabled: false,
        },
        update: {
          alias: secrets.master.alias,
          aliasNormalized: normalizePosAlias(secrets.master.alias),
          pinHash: masterPinHash,
          pinFingerprint: fingerprintSecret(secrets.master.pin, "pin"),
          active: true,
          offlineEnabled: false,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.posMasterCredential.upsert({
        where: { credentialId: ids.masterCredential },
        create: { credentialId: ids.masterCredential, active: true },
        update: { active: true, managedByDelegation: false },
      });
      await tx.posCredential.upsert({
        where: { id: ids.operatorCredential },
        create: {
          id: ids.operatorCredential,
          employeeId: ids.operatorEmployee,
          alias: secrets.operator.alias,
          aliasNormalized: normalizePosAlias(secrets.operator.alias),
          pinHash: operatorPinHash,
          pinFingerprint: fingerprintSecret(secrets.operator.pin, "pin"),
          active: true,
          offlineEnabled: false,
        },
        update: {
          alias: secrets.operator.alias,
          aliasNormalized: normalizePosAlias(secrets.operator.alias),
          pinHash: operatorPinHash,
          pinFingerprint: fingerprintSecret(secrets.operator.pin, "pin"),
          active: true,
          offlineEnabled: false,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.posMasterCredential.deleteMany({
        where: { credentialId: ids.operatorCredential },
      });
      await tx.posPositionBranchAssignment.upsert({
        where: {
          positionId_branchId: {
            positionId: ids.operatorPosition,
            branchId: ids.branch,
          },
        },
        create: { positionId: ids.operatorPosition, branchId: ids.branch },
        update: {},
      });
      for (const credentialId of [
        ids.masterCredential,
        ids.operatorCredential,
      ]) {
        await tx.posCredentialBranchAssignment.upsert({
          where: {
            credentialId_branchId: { credentialId, branchId: ids.branch },
          },
          create: { credentialId, branchId: ids.branch },
          update: {},
        });
      }
      const permissionNodes = await tx.posPermissionNode.findMany({
        where: { key: { in: [...operatorPermissionKeys] }, active: true },
        select: { id: true, key: true },
      });
      if (permissionNodes.length !== operatorPermissionKeys.length) {
        const found = new Set(permissionNodes.map((node) => node.key));
        fail(
          `Faltan permisos migrados: ${operatorPermissionKeys.filter((key) => !found.has(key)).join(", ")}.`,
        );
      }
      for (const node of permissionNodes) {
        await tx.positionPosPermission.upsert({
          where: {
            positionId_permissionNodeId: {
              positionId: ids.operatorPosition,
              permissionNodeId: node.id,
            },
          },
          create: {
            positionId: ids.operatorPosition,
            permissionNodeId: node.id,
            allowed: true,
          },
          update: { allowed: true },
        });
      }
      await tx.posTerminal.upsert({
        where: { id: ids.terminal },
        create: {
          id: ids.terminal,
          code: secrets.terminal.code,
          name: `Terminal local sintética ${label}`,
          status: "ACTIVE",
          branchId: ids.branch,
          secretHash: terminalHash,
          secretFingerprint: fingerprintSecret(
            secrets.terminal.secret,
            "terminal",
          ),
          registeredByUserId: ids.masterUser,
        },
        update: {
          status: "ACTIVE",
          branchId: ids.branch,
          secretHash: terminalHash,
          secretFingerprint: fingerprintSecret(
            secrets.terminal.secret,
            "terminal",
          ),
        },
      });
      await tx.inventoryLocation.upsert({
        where: { id: ids.branchLocation },
        create: {
          id: ids.branchLocation,
          code: `BR-${context.slug}`.toUpperCase(),
          name: `Inventario sucursal demo ${label}`,
          type: "BRANCH",
          branchId: ids.branch,
        },
        update: { active: true },
      });
      await tx.inventoryLocation.upsert({
        where: { id: ids.warehouse },
        create: {
          id: ids.warehouse,
          code: `WH-${context.slug}`.toUpperCase(),
          name: `Bodega matriz demo ${label}`,
          type: "WAREHOUSE",
        },
        update: { active: true },
      });

      const catalog = [
        {
          id: ids.product,
          priceId: ids.productPrice,
          sku: `DEMO-${context.slug}-PROD`.toUpperCase(),
          name: `Sérum facial demo ${label}`,
          kind: "PRODUCT" as const,
          description:
            "Producto sintético publicado para venta, apartado y entrega.",
          listPrice: "450.00",
          minimumPrice: "400.00",
          unitCost: "180.00",
        },
        {
          id: ids.supply,
          priceId: ids.supplyPrice,
          sku: `DEMO-${context.slug}-SUP`.toUpperCase(),
          name: `Insumo cabina demo ${label}`,
          kind: "SUPPLY" as const,
          description: "Insumo sintético para inventario y bodega.",
          listPrice: "90.00",
          minimumPrice: "75.00",
          unitCost: "35.00",
        },
        {
          id: ids.service,
          priceId: ids.servicePrice,
          sku: `DEMO-${context.slug}-SERV`.toUpperCase(),
          name: `Facial hidratante demo ${label}`,
          kind: "SERVICE" as const,
          description: "Servicio sintético reservable en Scheduler interno.",
          listPrice: "700.00",
          minimumPrice: "650.00",
          unitCost: "120.00",
        },
        {
          id: ids.membership,
          priceId: ids.membershipPrice,
          sku: `DEMO-${context.slug}-MEM`.toUpperCase(),
          name: `Membresía facial demo ${label}`,
          kind: "MEMBERSHIP" as const,
          description: "Tarjetón sintético de cuatro sesiones.",
          listPrice: "2400.00",
          minimumPrice: "2200.00",
          unitCost: "400.00",
        },
      ];
      for (const item of catalog) {
        await upsertCatalogItem(tx, {
          ...item,
          branchId: ids.branch,
          actorCredentialId: ids.masterCredential,
        });
      }
      for (const [itemId, branchQuantity, warehouseQuantity] of [
        [ids.product, "40.00", "120.00"],
        [ids.supply, "25.00", "80.00"],
      ] as const) {
        await tx.inventoryBalance.upsert({
          where: {
            locationId_itemId: { locationId: ids.branchLocation, itemId },
          },
          create: {
            locationId: ids.branchLocation,
            itemId,
            availableQuantity: branchQuantity,
          },
          update: {
            availableQuantity: branchQuantity,
            reservedQuantity: "0.00",
          },
        });
        await tx.inventoryBalance.upsert({
          where: { locationId_itemId: { locationId: ids.warehouse, itemId } },
          create: {
            locationId: ids.warehouse,
            itemId,
            availableQuantity: warehouseQuantity,
          },
          update: {
            availableQuantity: warehouseQuantity,
            reservedQuantity: "0.00",
          },
        });
      }
      const existingMembershipTerms = await tx.posMembershipTerms.findUnique({
        where: { itemId_version: { itemId: ids.membership, version: 1 } },
      });
      if (!existingMembershipTerms) {
        await tx.posMembershipTerms.create({
          data: {
            id: ids.membershipTerms,
            itemId: ids.membership,
            version: 1,
            totalSessions: 4,
            renewalThreshold: 1,
            conditions: { synthetic: true, datasetId: context.datasetId },
            createdByCredentialId: ids.masterCredential,
          },
        });
      } else if (
        existingMembershipTerms.totalSessions !== 4 ||
        existingMembershipTerms.renewalThreshold !== 1
      ) {
        fail(
          "Los términos append-only del dataset no coinciden con la versión esperada.",
        );
      }

      await tx.customerSource.upsert({
        where: { id: ids.customerSource },
        create: {
          id: ids.customerSource,
          name: `Demostración sintética ${label}`,
        },
        update: { active: true },
      });
      for (const customer of [
        {
          id: ids.customerPrimary,
          displayName: `Clienta Demo Uno ${label}`,
          phone: `5501${createHash("sha1").update(context.datasetId).digest("hex").slice(0, 6)}`,
          folio: `DEMO-${context.slug}-C01`.toUpperCase(),
        },
        {
          id: ids.customerSecondary,
          displayName: `Clienta Demo Dos ${label}`,
          phone: `5502${createHash("sha1").update(context.datasetId).digest("hex").slice(0, 6)}`,
          folio: `DEMO-${context.slug}-C02`.toUpperCase(),
        },
      ]) {
        await tx.customer.upsert({
          where: { id: customer.id },
          create: {
            id: customer.id,
            displayName: customer.displayName,
            normalizedName: customer.displayName.toLocaleLowerCase("es-MX"),
            firstName: "Clienta",
            lastName: "Demo",
            phone: customer.phone,
            phoneNormalized: customer.phone,
            whatsapp: customer.phone,
            email: `${customer.folio.toLowerCase()}@demo.keysar.test`,
            registrationFolio: customer.folio,
            registrationBranchId: ids.branch,
            sourceId: ids.customerSource,
            notes: "DATOS SINTÉTICOS; no contactar.",
          },
          update: { active: true, deletedAt: null },
        });
        await tx.schedulerCustomerProfile.upsert({
          where: { customerId: customer.id },
          create: {
            customerId: customer.id,
            preferredName: customer.displayName,
            contactPreference: "NONE",
            notes: "Perfil sintético local; comunicaciones deshabilitadas.",
          },
          update: { active: true, contactPreference: "NONE" },
        });
      }

      for (const method of [
        {
          id: ids.cashMethod,
          name: `Efectivo demo ${label}`,
          type: "EFECTIVO" as const,
          requiresReference: false,
          referenceLabel: null,
        },
        {
          id: ids.cardMethod,
          name: `Tarjeta demo ${label}`,
          type: "TARJETA" as const,
          requiresReference: true,
          referenceLabel: "Autorización demo",
        },
        {
          id: ids.transferMethod,
          name: `Transferencia demo ${label}`,
          type: "TRANSFERENCIA" as const,
          requiresReference: true,
          referenceLabel: "Referencia demo",
        },
      ]) {
        await tx.metodoPago.upsert({
          where: { id: method.id },
          create: { id: method.id, nombre: method.name, tipo: method.type },
          update: { nombre: method.name, tipo: method.type, activo: true },
        });
        await tx.posPaymentMethodPolicy.upsert({
          where: { paymentMethodId: method.id },
          create: {
            paymentMethodId: method.id,
            requiresReference: method.requiresReference,
            referenceLabel: method.referenceLabel,
            activeForPos: true,
          },
          update: {
            requiresReference: method.requiresReference,
            referenceLabel: method.referenceLabel,
            activeForPos: true,
          },
        });
      }
      const [bank, networks, installments] = await Promise.all([
        tx.posBank.findFirst({ where: { id: ids.bank, active: true } }),
        tx.posCardNetwork.count({
          where: {
            id: { in: [ids.networkVisa, ids.networkMastercard] },
            active: true,
          },
        }),
        tx.posInstallmentOption.count({
          where: {
            id: { in: [ids.installment3, ids.installment6] },
            active: true,
          },
        }),
      ]);
      if (!bank || networks !== 2 || installments !== 2) {
        fail(
          "Faltan bancos, redes o MSI canónicos de la cadena de migraciones.",
        );
      }
      await tx.posPriceList.upsert({
        where: { id: ids.priceList },
        create: {
          id: ids.priceList,
          name: `Lista demo ${label}`,
          version: 1,
          status: "ACTIVE",
          effectiveFrom,
        },
        update: { status: "ACTIVE", deletedAt: null },
      });
      await tx.posPriceListLine.upsert({
        where: {
          priceListId_itemId: {
            priceListId: ids.priceList,
            itemId: ids.product,
          },
        },
        create: {
          id: ids.priceListLine,
          priceListId: ids.priceList,
          itemId: ids.product,
          price: "430.00",
          cost: "180.00",
        },
        update: { price: "430.00", cost: "180.00" },
      });
      await tx.priceListBranchAssignment.upsert({
        where: {
          priceListId_branchId: {
            priceListId: ids.priceList,
            branchId: ids.branch,
          },
        },
        create: {
          id: ids.priceListBranch,
          priceListId: ids.priceList,
          branchId: ids.branch,
        },
        update: {},
      });

      for (const product of [
        {
          id: ids.courtesyFacial,
          name: `Facial cortesía demo ${label}`,
          type: "FACIAL" as const,
        },
        {
          id: ids.courtesyBody,
          name: `Corporal cortesía demo ${label}`,
          type: "BODY" as const,
        },
      ]) {
        await tx.posCourtesyProduct.upsert({
          where: { id: product.id },
          create: {
            ...product,
            normalizedName: product.name.toLocaleLowerCase("es-MX"),
            createdByCredentialId: ids.masterCredential,
          },
          update: { active: true, name: product.name },
        });
        await tx.posCourtesyProductVersion.upsert({
          where: { productId_version: { productId: product.id, version: 1 } },
          create: {
            id: deterministicUuid(`${product.id}-v1`),
            productId: product.id,
            version: 1,
            nameSnapshot: product.name,
            typeSnapshot: product.type,
            activeSnapshot: true,
            actorCredentialId: ids.masterCredential,
          },
          update: {},
        });
      }
      const courtesyPackageName = `Paquete cortesía demo ${label}`;
      await tx.posCourtesyPackage.upsert({
        where: { id: ids.courtesyPackage },
        create: {
          id: ids.courtesyPackage,
          name: courtesyPackageName,
          normalizedName: courtesyPackageName.toLocaleLowerCase("es-MX"),
          createdByCredentialId: ids.masterCredential,
        },
        update: { active: true, name: courtesyPackageName },
      });
      for (const line of [
        {
          id: ids.courtesyLineFacial,
          productId: ids.courtesyFacial,
          sortOrder: 1,
        },
        { id: ids.courtesyLineBody, productId: ids.courtesyBody, sortOrder: 2 },
      ]) {
        await tx.posCourtesyPackageLine.upsert({
          where: {
            packageId_sortOrder: {
              packageId: ids.courtesyPackage,
              sortOrder: line.sortOrder,
            },
          },
          create: { ...line, packageId: ids.courtesyPackage },
          update: { productId: line.productId },
        });
      }
      await tx.posCourtesyPackageVersion.upsert({
        where: {
          packageId_version: { packageId: ids.courtesyPackage, version: 1 },
        },
        create: {
          id: deterministicUuid(`${ids.courtesyPackage}-v1`),
          packageId: ids.courtesyPackage,
          version: 1,
          nameSnapshot: courtesyPackageName,
          activeSnapshot: true,
          linesSnapshot: [
            { productId: ids.courtesyFacial, sortOrder: 1 },
            { productId: ids.courtesyBody, sortOrder: 2 },
          ],
          actorCredentialId: ids.masterCredential,
        },
        update: {},
      });
      await tx.posCourtesyCheckoutConfiguration.upsert({
        where: { branchId: ids.branch },
        create: {
          id: ids.courtesyConfig,
          branchId: ids.branch,
          required: false,
          defaultPackageId: ids.courtesyPackage,
          defaultPackageVersion: 1,
          updatedByCredentialId: ids.masterCredential,
        },
        update: {
          required: false,
          defaultPackageId: ids.courtesyPackage,
          defaultPackageVersion: 1,
          updatedByCredentialId: ids.masterCredential,
        },
      });
      await tx.posCourtesyPolicy.upsert({
        where: { id: ids.courtesyPolicy },
        create: {
          id: ids.courtesyPolicy,
          name: `Política demo ${label}`,
          description: "Sólo para pruebas locales con clienta identificada.",
          requiresCustomer: true,
          requiresAuthorization: true,
        },
        update: { active: true, deletedAt: null },
      });
      await tx.posTicketConfiguration.upsert({
        where: { branchId: ids.branch },
        create: {
          id: ids.ticketConfig,
          branchId: ids.branch,
          companyName: `KEYSAR COSMETICS · DEMO ${label}`,
          address: "Sucursal sintética local",
          footerMessage: "COMPROBANTE DE PRUEBA · SIN VALOR FISCAL",
          policies: "Datos sintéticos; no usar en operación real.",
        },
        update: {
          companyName: `KEYSAR COSMETICS · DEMO ${label}`,
          footerMessage: "COMPROBANTE DE PRUEBA · SIN VALOR FISCAL",
        },
      });
      await tx.posExpenseType.upsert({
        where: { id: ids.expenseType },
        create: {
          id: ids.expenseType,
          name: `Insumos demo ${label}`,
          createdByCredentialId: ids.masterCredential,
        },
        update: { active: true, deletedAt: null },
      });

      await tx.schedulerCommerce.upsert({
        where: { id: ids.schedulerCommerce },
        create: {
          id: ids.schedulerCommerce,
          name: `Keysar Scheduler Demo ${label}`,
          normalizedName: `keysar scheduler demo ${context.datasetId}`,
        },
        update: { active: true, effectiveTo: null, deactivatedAt: null },
      });
      await tx.schedulerBranchProfile.upsert({
        where: { branchId: ids.branch },
        create: {
          id: ids.schedulerBranch,
          branchId: ids.branch,
          commerceId: ids.schedulerCommerce,
          timezone: "America/Mexico_City",
          bookingEnabled: true,
        },
        update: {
          commerceId: ids.schedulerCommerce,
          timezone: "America/Mexico_City",
          bookingEnabled: true,
          active: true,
          effectiveTo: null,
          deactivatedAt: null,
        },
      });
      await tx.schedulerProfessionalProfile.upsert({
        where: { employeeId: ids.operatorEmployee },
        create: {
          id: ids.schedulerProfessional,
          employeeId: ids.operatorEmployee,
          biography: "Profesional sintética para citas locales.",
          acceptsOnline: true,
        },
        update: {
          active: true,
          acceptsOnline: true,
          effectiveTo: null,
          deactivatedAt: null,
        },
      });
      await tx.schedulerProfessionalBranchAssignment.upsert({
        where: {
          professionalProfileId_branchProfileId: {
            professionalProfileId: ids.schedulerProfessional,
            branchProfileId: ids.schedulerBranch,
          },
        },
        create: {
          id: ids.schedulerProfessionalBranch,
          professionalProfileId: ids.schedulerProfessional,
          branchProfileId: ids.schedulerBranch,
        },
        update: { active: true, effectiveTo: null, deactivatedAt: null },
      });
      await tx.schedulerServiceProfile.upsert({
        where: { catalogItemId: ids.service },
        create: {
          id: ids.schedulerService,
          catalogItemId: ids.service,
          durationMinutes: 60,
          preparationMinutes: 10,
          cleanupMinutes: 10,
          capacity: 1,
          acceptsOnline: true,
        },
        update: {
          durationMinutes: 60,
          preparationMinutes: 10,
          cleanupMinutes: 10,
          capacity: 1,
          acceptsOnline: true,
          active: true,
          effectiveTo: null,
          deactivatedAt: null,
        },
      });
      await tx.schedulerServiceBranchAssignment.upsert({
        where: {
          serviceProfileId_branchProfileId: {
            serviceProfileId: ids.schedulerService,
            branchProfileId: ids.schedulerBranch,
          },
        },
        create: {
          id: ids.schedulerServiceBranch,
          serviceProfileId: ids.schedulerService,
          branchProfileId: ids.schedulerBranch,
        },
        update: { active: true, effectiveTo: null, deactivatedAt: null },
      });
      await tx.schedulerProfessionalServiceAssignment.upsert({
        where: {
          professionalProfileId_serviceProfileId_branchProfileId: {
            professionalProfileId: ids.schedulerProfessional,
            serviceProfileId: ids.schedulerService,
            branchProfileId: ids.schedulerBranch,
          },
        },
        create: {
          id: ids.schedulerProfessionalService,
          professionalProfileId: ids.schedulerProfessional,
          serviceProfileId: ids.schedulerService,
          branchProfileId: ids.schedulerBranch,
        },
        update: { active: true, effectiveTo: null, deactivatedAt: null },
      });
      for (const weekday of [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ] as const) {
        for (const target of ["branch", "professional"] as const) {
          const ruleId =
            target === "professional"
              ? `${ids.schedulerBranch}-${weekday.toLowerCase()}`
              : `${ids.schedulerBranch}-branch-${weekday.toLowerCase()}`;
          await tx.schedulerAvailabilityRule.upsert({
            where: { id: ruleId },
            create: {
              id: ruleId,
              branchProfileId: ids.schedulerBranch,
              professionalProfileId:
                target === "professional" ? ids.schedulerProfessional : null,
              kind: "WORKING",
              weekday,
              startMinute: 9 * 60,
              endMinute: 18 * 60,
            },
            update: {
              active: true,
              startMinute: 9 * 60,
              endMinute: 18 * 60,
              effectiveTo: null,
            },
          });
        }
      }
      await tx.schedulerSetting.upsert({
        where: {
          scope_scopeReferenceId_section: {
            scope: "BRANCH",
            scopeReferenceId: ids.schedulerBranch,
            section: "agenda",
          },
        },
        create: {
          id: ids.schedulerSetting,
          scope: "BRANCH",
          scopeReferenceId: ids.schedulerBranch,
          branchProfileId: ids.schedulerBranch,
          section: "agenda",
          document: {
            synthetic: true,
            datasetId: context.datasetId,
            slotIntervalMinutes: 30,
            allowSameDay: true,
            communicationsEnabled: false,
          },
          updatedByUserId: ids.masterUser,
        },
        update: {
          document: {
            synthetic: true,
            datasetId: context.datasetId,
            slotIntervalMinutes: 30,
            allowSameDay: true,
            communicationsEnabled: false,
          },
          updatedByUserId: ids.masterUser,
        },
      });

      const marker = await tx.auditLog.findFirst({
        where: {
          action: DATASET_MARKER_ACTION,
          targetType: "SyntheticDataset",
          targetId: context.datasetId,
          outcome: "SUCCESS",
        },
        select: { id: true },
      });
      if (!marker) {
        await tx.auditLog.create({
          data: {
            action: DATASET_MARKER_ACTION,
            outcome: "SUCCESS",
            actorCredentialId: ids.masterCredential,
            terminalId: ids.terminal,
            branchId: ids.branch,
            targetType: "SyntheticDataset",
            targetId: context.datasetId,
            metadata: {
              datasetId: context.datasetId,
              synthetic: true,
              localOnly: true,
              communicationsEnabled: false,
            },
          },
        });
      }
    },
    { timeout: 120_000 },
  );
}

async function verifyDataset(
  context: GuardedContext,
  secrets: DemoSecrets,
  ids: DemoIds,
) {
  const [
    master,
    operator,
    terminal,
    permissionNodes,
    balances,
    customers,
    methods,
    bank,
    networks,
    installments,
    terms,
    courtesy,
    scheduler,
    marker,
  ] = await Promise.all([
    prisma.posCredential.findUnique({
      where: { id: ids.masterCredential },
      include: { masterProfile: true, user: { include: { empleado: true } } },
    }),
    prisma.posCredential.findUnique({
      where: { id: ids.operatorCredential },
      include: {
        masterProfile: true,
        employee: { include: { position: true } },
      },
    }),
    prisma.posTerminal.findUnique({ where: { id: ids.terminal } }),
    prisma.positionPosPermission.findMany({
      where: { positionId: ids.operatorPosition, allowed: true },
      select: { permissionNode: { select: { key: true } } },
    }),
    prisma.inventoryBalance.findMany({
      where: {
        locationId: { in: [ids.branchLocation, ids.warehouse] },
        itemId: { in: [ids.product, ids.supply] },
      },
    }),
    prisma.customer.findMany({
      where: {
        id: { in: [ids.customerPrimary, ids.customerSecondary] },
        active: true,
      },
    }),
    prisma.metodoPago.findMany({
      where: {
        id: { in: [ids.cashMethod, ids.cardMethod, ids.transferMethod] },
        activo: true,
      },
      include: { posPolicy: true },
    }),
    prisma.posBank.findUnique({ where: { id: ids.bank } }),
    prisma.posCardNetwork.findMany({
      where: {
        id: { in: [ids.networkVisa, ids.networkMastercard] },
        active: true,
      },
    }),
    prisma.posInstallmentOption.findMany({
      where: { id: { in: [ids.installment3, ids.installment6] }, active: true },
    }),
    prisma.posMembershipTerms.findUnique({
      where: { itemId_version: { itemId: ids.membership, version: 1 } },
      include: { item: true },
    }),
    prisma.posCourtesyCheckoutConfiguration.findUnique({
      where: { branchId: ids.branch },
      include: { defaultPackage: { include: { lines: true } } },
    }),
    prisma.schedulerBranchProfile.findUnique({
      where: { branchId: ids.branch },
      include: {
        availabilityRules: { where: { active: true } },
        professionalAssignments: { where: { active: true } },
        serviceAssignments: { where: { active: true } },
        professionalServices: { where: { active: true } },
        settings: true,
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: DATASET_MARKER_ACTION,
        targetType: "SyntheticDataset",
        targetId: context.datasetId,
        outcome: "SUCCESS",
      },
    }),
  ]);

  const granted = new Set(
    permissionNodes.map((grant) => grant.permissionNode.key),
  );
  const privileged = [
    "SETTINGS_MANAGE",
    "EMPLOYEES_MANAGE",
    "TERMINALS_MANAGE",
    "REPORTS_COSTS",
    "SALE_OVERRIDE_MINIMUM",
  ];
  const catalogCount = await prisma.catalogItem.count({
    where: {
      id: { in: [ids.product, ids.supply, ids.service, ids.membership] },
      published: true,
      active: true,
    },
  });
  const priceCount = await prisma.catalogItemPrice.count({
    where: {
      id: {
        in: [
          ids.productPrice,
          ids.supplyPrice,
          ids.servicePrice,
          ids.membershipPrice,
        ],
      },
    },
  });
  const branchProfile = await prisma.posBranchProfile.findUnique({
    where: { branchId: ids.branch },
  });

  const checks: Array<[boolean, string]> = [
    [Boolean(marker), "marcador sintético"],
    [Boolean(branchProfile?.activo), "perfil POS de sucursal"],
    [
      Boolean(master?.active && master.masterProfile?.active),
      "credencial master",
    ],
    [
      Boolean(operator?.active && !operator.masterProfile),
      "credencial operadora",
    ],
    [
      Boolean(
        master &&
        (await verifyPosSecret(secrets.master.pin, master.pinHash)) &&
        master.pinFingerprint === fingerprintSecret(secrets.master.pin, "pin"),
      ),
      "PIN master",
    ],
    [
      Boolean(
        operator &&
        (await verifyPosSecret(secrets.operator.pin, operator.pinHash)) &&
        operator.pinFingerprint ===
          fingerprintSecret(secrets.operator.pin, "pin"),
      ),
      "PIN operadora",
    ],
    [
      Boolean(
        terminal?.status === "ACTIVE" &&
        (await verifyPosSecret(secrets.terminal.secret, terminal.secretHash)) &&
        terminal.secretFingerprint ===
          fingerprintSecret(secrets.terminal.secret, "terminal"),
      ),
      "terminal sintética",
    ],
    [
      operatorPermissionKeys.every((key) => granted.has(key)) &&
        privileged.every((key) => !granted.has(key)),
      "permisos diferenciados",
    ],
    [catalogCount === 4 && priceCount === 4, "catálogo publicado y precios"],
    [balances.length === 4, "existencias de sucursal y bodega"],
    [customers.length === 2, "clientas sintéticas"],
    [
      methods.length === 3 &&
        methods.every((method) => method.posPolicy?.activeForPos),
      "métodos de pago",
    ],
    [
      Boolean(bank?.active) &&
        networks.length === 2 &&
        installments.length === 2,
      "bancos, redes y MSI",
    ],
    [
      Boolean(terms?.item.published && terms.totalSessions === 4),
      "membresía y términos",
    ],
    [
      Boolean(
        courtesy?.defaultPackage?.active &&
        courtesy.defaultPackage.lines.length === 2,
      ),
      "cortesías",
    ],
    [
      Boolean(
        scheduler?.active &&
        scheduler.bookingEnabled &&
        scheduler.availabilityRules.length === 12 &&
        scheduler.professionalAssignments.length === 1 &&
        scheduler.serviceAssignments.length === 1 &&
        scheduler.professionalServices.length === 1 &&
        scheduler.settings.some((setting) => setting.section === "agenda"),
      ),
      "Scheduler para citas",
    ],
    [
      new Set(POS_PERMISSION_KEYS).size > granted.size &&
        Boolean(master?.user?.empleado && operator?.employee?.position),
      "actores master y operador distintos",
    ],
  ];
  const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);
  if (failed.length > 0) {
    fail(`Dataset incompleto: ${failed.join(", ")}.`);
  }
  const fileMode = statSync(context.credentialsFile).mode & 0o777;
  if (fileMode !== 0o600)
    fail("El archivo de credenciales no tiene modo 0600.");

  return {
    status: "PASS",
    datasetId: context.datasetId,
    database: context.databaseName,
    localOnly: true,
    synthetic: true,
    credentialsFile: relative(
      resolve(__dirname, "../../.."),
      realpathSync(context.credentialsFile),
    ),
    credentialsMode: "0600",
    counts: {
      branches: 1,
      actors: 2,
      operatorPermissions: granted.size,
      catalogItems: catalogCount,
      inventoryBalances: balances.length,
      customers: customers.length,
      paymentMethods: methods.length,
      banks: bank ? 1 : 0,
      cardNetworks: networks.length,
      installmentOptions: installments.length,
      membershipTerms: terms ? 1 : 0,
      courtesyProducts: courtesy?.defaultPackage?.lines.length ?? 0,
      schedulerRules: scheduler?.availabilityRules.length ?? 0,
    },
  };
}

async function main() {
  const context = guardedContext();
  await assertDatabaseGuard(context);
  const secrets =
    context.command === "provision"
      ? loadOrCreateSecrets(context)
      : loadSecrets(context);
  const ids = idsFor(context.datasetId);
  if (context.command === "provision") {
    await provisionDataset(context, secrets, ids);
  }
  const result = await verifyDataset(context, secrets, ids);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`RV10-P2: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
