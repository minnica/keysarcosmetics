import { createHash } from "node:crypto";
import { Prisma, type PosOfflineOperationKind } from "@prisma/client";
import type {
  PosCatalogItemDto,
  PosOfflineBootstrapDto,
  PosOfflineOperationDto,
  PosOfflineOperationResultDto,
  PosPermissionKey,
} from "@cosmetics/types";
import {
  posBusinessDayCountInputSchema,
  posAgendaMembershipReservationSchema,
  posInventoryCountRequestSchema,
  posLayawayPaymentRequestSchema,
  posMembershipAttendanceRequestSchema,
  posTicketCreateRequestSchema,
  posVoucherIssueRequestSchema,
} from "../contracts/pos.contracts";
import { prisma } from "../prisma/client";
import type { PosOfflineGrantPayload } from "../types/pos-jwt";
import {
  credentialIdentity,
  findCredentialForSession,
  resolvePosPermissions,
  signPosOfflineGrant,
  verifyPosOfflineGrant,
} from "./pos-auth";
import {
  executePosIdempotent,
  findPosIdempotentReplay,
} from "./pos-inventory";
import { enqueuePosNotification } from "./pos-notifications";
import {
  compensatePreparedAgendaTicket,
  prepareAgendaTicketSaga,
  reserveMembershipNextSession,
} from "./pos-agenda";
import {
  consumeMembershipAttendance,
  membershipDto,
  membershipInclude,
  type PosMembershipContext,
} from "./pos-memberships";
import {
  businessDayDto,
  businessDayInclude,
  createBusinessDayCount,
  registerAttendanceIfMissing,
} from "./pos-operations";
import {
  addLayawayPayment,
  createTicket,
  issueVoucher,
  printVoucher,
  ticketDto,
  voucherDto,
} from "./pos-tickets";

const money = (value: Prisma.Decimal | string | number) =>
  new Prisma.Decimal(value).toFixed(2);

const posOfflineMembershipAttendanceSchema =
  posMembershipAttendanceRequestSchema.omit({
    personalAuthorizationToken: true,
  });

const jsonStringArray = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export class PosSyncError extends Error {
  constructor(
    message: string,
    readonly status = 409,
    readonly code = "SYNC_CONFLICT",
  ) {
    super(message);
  }
}

export interface PosOfflineActor {
  grant: PosOfflineGrantPayload;
  permissions: PosPermissionKey[];
  isMaster: boolean;
}

const operationPermission: Record<PosOfflineOperationKind, PosPermissionKey> = {
  BUSINESS_DAY_OPEN: "BUSINESS_DAY_OPEN",
  INVENTORY_COUNT: "INVENTORY_VIEW",
  TICKET_CREATE: "SALE_CREATE",
  LAYAWAY_PAYMENT: "SALE_CREATE",
  AGENDA_MEMBERSHIP_RESERVATION: "MEMBERSHIPS_MANAGE",
  MEMBERSHIP_ATTENDANCE: "MEMBERSHIPS_MANAGE",
  VOUCHER_ISSUE: "VOUCHERS_MANAGE",
  VOUCHER_PRINT: "VOUCHERS_MANAGE",
  BUSINESS_DAY_CLOSING_COUNT: "BUSINESS_DAY_CLOSE",
  BUSINESS_DAY_CLOSE: "BUSINESS_DAY_CLOSE",
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function payloadHash(operation: PosOfflineOperationDto): string {
  return createHash("sha256")
    .update(
      stableJson({
        kind: operation.kind,
        entityId: operation.entityId,
        dependsOn: operation.dependsOn,
        payload: operation.payload,
      }),
    )
    .digest("hex");
}

function businessDateAt(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function assertPermission(
  actor: PosOfflineActor,
  kind: PosOfflineOperationKind,
) {
  const required = operationPermission[kind];
  if (!actor.isMaster && !actor.permissions.includes(required)) {
    throw new PosSyncError(
      `El permiso ${required} ya no está vigente`,
      403,
      "PERMISSION_REVOKED",
    );
  }
}

export async function resolveOfflineActor(
  token: string,
): Promise<PosOfflineActor> {
  let grant: PosOfflineGrantPayload;
  try {
    grant = verifyPosOfflineGrant(token);
  } catch {
    throw new PosSyncError(
      "El grant offline es inválido o ya caducó",
      401,
      "OFFLINE_GRANT_INVALID",
    );
  }
  const [credential, terminal] = await Promise.all([
    findCredentialForSession(grant.credentialId),
    prisma.posTerminal.findUnique({
      where: { id: grant.terminalId },
      select: {
        status: true,
        branchId: true,
        branch: { select: { activa: true } },
      },
    }),
  ]);
  if (
    !credential?.active ||
    !credential.offlineEnabled ||
    credential.version !== grant.credentialVersion ||
    terminal?.status !== "ACTIVE" ||
    !terminal.branch.activa ||
    terminal.branchId !== grant.branchId
  ) {
    throw new PosSyncError(
      "El acceso offline fue revocado o cambió desde su emisión",
      401,
      "OFFLINE_GRANT_REVOKED",
    );
  }
  const identity = credentialIdentity(credential);
  if (!identity.identityActive) {
    throw new PosSyncError(
      "La identidad POS ya no está activa",
      401,
      "IDENTITY_REVOKED",
    );
  }
  const currentPermissions = await resolvePosPermissions(
    identity.positionId,
    identity.isMaster,
  );
  const currentPermissionSet = new Set(currentPermissions);
  const isMaster = grant.isMaster && identity.isMaster;
  return {
    grant: { ...grant, ...identity, isMaster },
    permissions: grant.permissions.filter((permission) =>
      currentPermissionSet.has(permission),
    ),
    isMaster,
  };
}

function catalogDto(item: {
  id: string;
  sku: string;
  name: string;
  kind: "PRODUCT" | "SERVICE" | "SUPPLY" | "MACHINE" | "MEMBERSHIP";
  description: string | null;
  published: boolean;
  active: boolean;
  listPrice: Prisma.Decimal;
  minimumPrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  family: {
    id: string;
    name: string;
    active: boolean;
    parentId: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    active: boolean;
    parentId: string | null;
  } | null;
  benefits: Array<{ text: string }>;
  assets: Array<{ publicUrl: string; isPrimary: boolean; status: string }>;
  inventoryBalances: Array<{ availableQuantity: Prisma.Decimal }>;
  membershipTerms: Array<{
    id: string;
    version: number;
    totalSessions: number;
    renewalThreshold: number;
    conditions: Prisma.JsonValue;
    effectiveAt: Date;
  }>;
}): PosCatalogItemDto {
  const image =
    item.assets.find((asset) => asset.isPrimary && asset.status === "READY") ??
    item.assets.find((asset) => asset.status === "READY");
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    kind: item.kind,
    family: item.family,
    category: item.category,
    description: item.description,
    benefits: item.benefits.map((benefit) => benefit.text),
    imageUrl: image?.publicUrl ?? null,
    published: item.published,
    active: item.active,
    listPrice: money(item.listPrice),
    minimumPrice: money(item.minimumPrice),
    taxRate: money(item.taxRate),
    availableQuantity: item.inventoryBalances[0]
      ? money(item.inventoryBalances[0].availableQuantity)
      : null,
    membershipTerms: item.membershipTerms[0]
      ? {
          id: item.membershipTerms[0].id,
          version: item.membershipTerms[0].version,
          totalSessions: item.membershipTerms[0].totalSessions,
          renewalThreshold: item.membershipTerms[0].renewalThreshold,
          conditions: item.membershipTerms[0].conditions as Record<
            string,
            unknown
          > | null,
          effectiveAt: item.membershipTerms[0].effectiveAt.toISOString(),
        }
      : null,
  };
}

export async function createOfflineBootstrap(
  actor: PosOfflineActor,
): Promise<PosOfflineBootstrapDto> {
  const now = new Date();
  const agendaWindowEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1_000);
  const businessDate = businessDateAt(now.toISOString());
  const canUseMemberships =
    actor.isMaster ||
    actor.permissions.some((permission) =>
      ["MEMBERSHIPS_VIEW", "MEMBERSHIPS_MANAGE", "SALE_CREATE"].includes(
        permission,
      ),
    );
  const [
    terminal,
    credential,
    cursor,
    catalog,
    packages,
    paymentMethods,
    banks,
    cardNetworks,
    installmentOptions,
    courtesyProducts,
    courtesyPackages,
    courtesyConfiguration,
    commercialCompany,
    vouchers,
    customerSources,
    ticketConfiguration,
    sellers,
    locations,
    balances,
    day,
    tickets,
    memberships,
    agendaSlots,
  ] = await Promise.all([
    prisma.posTerminal.findUniqueOrThrow({
      where: { id: actor.grant.terminalId },
      include: {
        branch: { include: { posProfile: { select: { code: true } } } },
      },
    }),
    findCredentialForSession(actor.grant.credentialId),
    prisma.posSyncCursor.upsert({
      where: { terminalId: actor.grant.terminalId },
      create: { terminalId: actor.grant.terminalId },
      update: {},
    }),
    prisma.catalogItem.findMany({
      where: {
        deletedAt: null,
        active: true,
        published: true,
        OR: [
          { branchVisibility: { none: {} } },
          {
            branchVisibility: {
              some: { branchId: actor.grant.branchId, visible: true },
            },
          },
        ],
      },
      orderBy: { name: "asc" },
      include: {
        family: true,
        category: true,
        benefits: { orderBy: { sortOrder: "asc" } },
        assets: {
          where: { status: "READY" },
          orderBy: [{ isPrimary: "desc" }, { creadoEn: "asc" }],
        },
        inventoryBalances: {
          where: { location: { branchId: actor.grant.branchId } },
          select: { availableQuantity: true },
          take: 1,
        },
        membershipTerms: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    }),
    prisma.posPackage.findMany({
      where: {
        deletedAt: null,
        status: "PUBLISHED",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { lines: true },
      orderBy: { name: "asc" },
    }),
    prisma.metodoPago.findMany({
      where: { activo: true, posPolicy: { activeForPos: true } },
      include: { posPolicy: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.posBank.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.posCardNetwork.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.posInstallmentOption.findMany({
      where: { active: true },
      orderBy: { months: "asc" },
    }),
    prisma.posCourtesyProduct.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.posCourtesyPackage.findMany({
      where: { active: true },
      include: {
        lines: {
          include: { product: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.posCourtesyCheckoutConfiguration.findFirst({
      where: { OR: [{ branchId: actor.grant.branchId }, { branchId: null }] },
      orderBy: { branchId: "desc" },
    }),
    prisma.posCommercialCompany.findFirst({
      where: { active: true },
      orderBy: { actualizadoEn: "desc" },
    }),
    prisma.posVoucherTemplate.findMany({
      where: { deletedAt: null, active: true, visibleToSellers: true },
      orderBy: { name: "asc" },
    }),
    prisma.customerSource.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.posTicketConfiguration.findFirst({
      where: { OR: [{ branchId: actor.grant.branchId }, { branchId: null }] },
      orderBy: { branchId: "desc" },
    }),
    prisma.empleado.findMany({
      where: { activo: true },
      select: { id: true, nombreCompleto: true, positionId: true },
      orderBy: { nombreCompleto: "asc" },
    }),
    prisma.inventoryLocation.findMany({
      where: { active: true, branchId: actor.grant.branchId },
      include: { branch: { select: { nombre: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryBalance.findMany({
      where: { location: { branchId: actor.grant.branchId } },
      orderBy: { itemId: "asc" },
    }),
    prisma.posBusinessDay.findUnique({
      where: {
        branchId_businessDate: {
          branchId: actor.grant.branchId,
          businessDate: new Date(`${businessDate}T00:00:00.000Z`),
        },
      },
      include: businessDayInclude,
    }),
    prisma.posTicket.findMany({
      where: {
        branchId: actor.grant.branchId,
        status: { in: ["COMPLETED", "LAYAWAY"] },
      },
      include: {
        branch: { select: { nombre: true } },
        customer: { select: { id: true } },
        lines: {
          include: { item: { select: { kind: true } } },
          orderBy: { creadoEn: "asc" },
        },
        sellers: { orderBy: { creadoEn: "asc" } },
        participants: { orderBy: { creadoEn: "asc" } },
        paymentOperations: {
          include: { payments: true },
          orderBy: { creadoEn: "asc" },
        },
        layaway: true,
        owedProducts: {
          include: { item: { select: { name: true } } },
          orderBy: { creadoEn: "asc" },
        },
        appointments: {
          include: {
            branch: { select: { nombre: true } },
            agendaResource: { select: { nameSnapshot: true } },
          },
          orderBy: { creadoEn: "asc" },
        },
        clientMemberships: {
          select: {
            id: true,
            folio: true,
            customerId: true,
            ticketId: true,
            membershipItemId: true,
            membershipNameSnapshot: true,
            unitOrdinal: true,
            status: true,
          },
          orderBy: { unitOrdinal: "asc" },
        },
      },
      orderBy: { creadoEn: "desc" },
      take: 200,
    }),
    canUseMemberships
      ? prisma.posClientMembership.findMany({
          where: {
            purchaseBranchId: actor.grant.branchId,
            ...(!actor.isMaster
              ? actor.grant.employeeId
                ? { currentSellerId: actor.grant.employeeId }
                : { id: "__NO_OFFLINE_MEMBERSHIP_PORTFOLIO__" }
              : {}),
          },
          include: membershipInclude,
          orderBy: { purchasedAt: "desc" },
          take: 500,
        })
      : Promise.resolve([]),
    prisma.agendaSlot.findMany({
      where: {
        resource: { branchId: actor.grant.branchId, active: true },
        startsAt: { gte: now, lte: agendaWindowEnd },
        status: "AVAILABLE",
      },
      include: { resource: true },
      orderBy: { startsAt: "asc" },
      take: 1_000,
    }),
  ]);
  if (!credential) throw new PosSyncError("Credencial POS no encontrada", 401);
  if (!credential.offlineEnabled) {
    throw new PosSyncError(
      "La credencial no tiene habilitada la operación offline",
      403,
      "OFFLINE_DISABLED",
    );
  }
  const identity = credentialIdentity(credential);
  const signed = signPosOfflineGrant({
    credentialId: credential.id,
    actorId: identity.actorId,
    employeeId: identity.employeeId,
    userId: identity.userId,
    positionId: identity.positionId,
    displayName: identity.displayName,
    alias: credential.aliasNormalized,
    sessionId: actor.grant.sessionId,
    terminalId: terminal.id,
    branchId: terminal.branchId,
    credentialVersion: credential.version,
    isMaster: identity.isMaster,
    permissions: actor.permissions,
  });
  return {
    schemaVersion: 2,
    grantToken: signed.token,
    grantExpiresAt: signed.expiresAt,
    issuedAt: now.toISOString(),
    nextSequence: Number(cursor.lastSequence) + 1,
    session: {
      expiresAt: signed.expiresAt,
      actor: {
        id: identity.actorId,
        employeeId: identity.employeeId,
        userId: identity.userId,
        positionId: identity.positionId,
        displayName: identity.displayName,
        alias: credential.aliasNormalized,
        isMaster: identity.isMaster,
      },
      terminal: {
        id: terminal.id,
        code: terminal.code,
        branch: {
          id: terminal.branch.id,
          name: terminal.branch.nombre,
          code: terminal.branch.posProfile?.code ?? null,
          active: terminal.branch.activa,
        },
      },
      permissions: actor.permissions,
      authorizedBranches: [
        {
          id: terminal.branch.id,
          name: terminal.branch.nombre,
          code: terminal.branch.posProfile?.code ?? null,
          active: terminal.branch.activa,
        },
      ],
      branchScope: "SESSION_BRANCH",
    },
    catalog: catalog.map(catalogDto),
    packages: packages.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description,
      price: money(item.price),
      status: item.status,
      startsAt: item.startsAt?.toISOString() ?? null,
      endsAt: item.endsAt?.toISOString() ?? null,
      lines: item.lines.map((line) => ({
        itemId: line.itemId,
        quantity: money(line.quantity),
      })),
    })),
    paymentMethods: paymentMethods.map((item) => ({
      id: item.id,
      name: item.nombre,
      type: item.tipo,
      active: item.activo,
      activeForPos: item.posPolicy?.activeForPos ?? false,
      requiresReference: item.posPolicy?.requiresReference ?? false,
      referenceLabel: item.posPolicy?.referenceLabel ?? null,
    })),
    paymentCatalogs: {
      banks: banks.map((item) => ({
        id: item.id,
        name: item.name,
        active: item.active,
        version: item.version,
        sourceName: item.sourceName,
        sourceReviewedAt: item.sourceReviewedAt.toISOString().slice(0, 10),
      })),
      cardNetworks: cardNetworks.map((item) => ({
        id: item.id,
        name: item.name,
        active: item.active,
        version: item.version,
        sourceName: item.sourceName,
        sourceReviewedAt: item.sourceReviewedAt.toISOString().slice(0, 10),
      })),
      installmentOptions: installmentOptions.map((item) => ({
        id: item.id,
        months: item.months,
        label: item.label,
        active: item.active,
        version: item.version,
        sourceName: item.sourceName,
        sourceReviewedAt: item.sourceReviewedAt.toISOString().slice(0, 10),
      })),
    },
    courtesyConfiguration: (() => {
      const validPackages = courtesyPackages.filter(
        (item) =>
          item.lines.length >= 1 &&
          item.lines.length <= 2 &&
          item.lines.every((line) => line.product.active),
      );
      const defaultPackage = validPackages.find(
        (item) => item.id === courtesyConfiguration?.defaultPackageId,
      );
      return {
        required: Boolean(courtesyConfiguration?.required && defaultPackage),
        defaultPackageId: defaultPackage?.id ?? null,
        products: courtesyProducts.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          active: true,
          version: item.version,
        })),
        packages: validPackages.map((item) => ({
          id: item.id,
          name: item.name,
          active: true,
          version: item.version,
          productIds: item.lines.map((line) => line.productId),
          products: item.lines.map((line) => ({
            id: line.product.id,
            name: line.product.name,
            type: line.product.type,
            active: line.product.active,
          })),
        })),
      };
    })(),
    commercialCompany: commercialCompany
      ? {
          id: commercialCompany.id,
          name: commercialCompany.name,
          salesNumber: commercialCompany.salesNumber,
          active: commercialCompany.active,
          version: commercialCompany.version,
        }
      : null,
    voucherTemplates: vouchers.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      value: money(item.value),
      message: item.message,
      active: item.active,
      visibleToSellers: item.visibleToSellers,
    })),
    customerSources: customerSources.map((source) => ({
      id: source.id,
      name: source.name,
      active: source.active,
      companyOwnedByDefault: source.companyOwnedByDefault,
    })),
    ticketConfiguration: ticketConfiguration
      ? {
          branchId: ticketConfiguration.branchId,
          logoUrl: null,
          companyName: ticketConfiguration.companyName,
          address: ticketConfiguration.address,
          footerMessage: ticketConfiguration.footerMessage,
          policies: ticketConfiguration.policies,
          showClientName: ticketConfiguration.showClientName,
          showClientPhone: ticketConfiguration.showClientPhone,
          showSellerName: ticketConfiguration.showSellerName,
          showVatBreakdown: ticketConfiguration.showVatBreakdown,
          showSpareCoverageMessage:
            ticketConfiguration.showSpareCoverageMessage,
        }
      : null,
    sellers: sellers.map((seller) => ({
      id: seller.id,
      displayName: seller.nombreCompleto,
      positionId: seller.positionId,
    })),
    inventoryLocations: locations.map((location) => ({
      id: location.id,
      code: location.code,
      name: location.name,
      type: location.type,
      branchId: location.branchId,
      branchName: location.branch?.nombre ?? null,
      active: location.active,
    })),
    inventoryBalances: balances.map((balance) => ({
      itemId: balance.itemId,
      locationId: balance.locationId,
      availableQuantity: money(balance.availableQuantity),
      reservedQuantity: money(balance.reservedQuantity),
      version: balance.version,
      updatedAt: balance.actualizadoEn.toISOString(),
    })),
    businessDay: day ? businessDayDto(day) : null,
    tickets: tickets.map(ticketDto),
    memberships: memberships.map(membershipDto),
    agendaSlots: agendaSlots.map((slot) => ({
      id: slot.id,
      externalSystem: "AGENDA_CRM" as const,
      externalCalendarId: slot.resource.externalCalendarId,
      externalSlotId: slot.externalSlotId,
      branchId: slot.resource.branchId,
      branchName: terminal.branch.nombre,
      date: businessDateAt(slot.startsAt.toISOString()),
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      startTime: new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Mexico_City",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(slot.startsAt),
      endTime: new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Mexico_City",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(slot.endsAt),
      resourceId: slot.resourceId,
      resourceName: slot.resource.nameSnapshot,
      resourceType: slot.resource.type,
      capacity: slot.capacity,
      reservedCount: slot.reservedCount,
      availableSeats: slot.capacity - slot.reservedCount,
      status: slot.status,
      version: slot.sourceVersion,
      updatedAt: slot.actualizadoEn.toISOString(),
    })),
  };
}

async function executeOperation(
  operation: PosOfflineOperationDto,
  actor: PosOfflineActor,
): Promise<{ data: unknown; message: string; status: number }> {
  assertPermission(actor, operation.kind as PosOfflineOperationKind);
  const dependencies = operation.dependsOn.length
    ? await prisma.posSyncOperation.findMany({
        where: { clientOperationId: { in: operation.dependsOn } },
        select: {
          clientOperationId: true,
          terminalId: true,
          kind: true,
          status: true,
          serverEntityId: true,
          response: true,
        },
      })
    : [];
  if (dependencies.length !== operation.dependsOn.length) {
    throw new PosSyncError(
      "La operación declara una dependencia local inexistente",
      409,
      "OFFLINE_DEPENDENCY_MISSING",
    );
  }
  if (
    dependencies.some(
      (dependency) => dependency.terminalId !== actor.grant.terminalId,
    )
  ) {
    throw new PosSyncError(
      "La operación depende de otra terminal",
      409,
      "OFFLINE_DEPENDENCY_TERMINAL_MISMATCH",
    );
  }
  if (
    dependencies.some(
      (dependency) =>
        dependency.status !== "SYNCED" || !dependency.serverEntityId,
    )
  ) {
    throw new PosSyncError(
      "La operación depende de un efecto que todavía no fue conciliado",
      409,
      "OFFLINE_DEPENDENCY_UNRESOLVED",
    );
  }
  const localReference = operation.entityId
    ? await prisma.posSyncOperation.findUnique({
        where: { clientOperationId: operation.entityId },
        select: { terminalId: true, serverEntityId: true, status: true },
      })
    : null;
  if (localReference && localReference.terminalId !== actor.grant.terminalId) {
    throw new PosSyncError("La referencia local pertenece a otra terminal");
  }
  if (
    localReference &&
    (localReference.status !== "SYNCED" || !localReference.serverEntityId)
  ) {
    throw new PosSyncError(
      "La operación depende de una referencia local todavía no conciliada",
    );
  }
  const resolvedOperation = localReference
    ? { ...operation, entityId: localReference.serverEntityId }
    : operation;
  const context = {
    credentialId: actor.grant.credentialId,
    terminalId: actor.grant.terminalId,
    branchId: actor.grant.branchId,
    businessDate: businessDateAt(operation.createdAt),
    isMaster: actor.isMaster,
    sessionId: actor.grant.sessionId,
  };
  const membershipContext: PosMembershipContext = {
    ...context,
    employeeId: actor.grant.employeeId,
    authorizedBranchIds: [actor.grant.branchId],
  };
  if (resolvedOperation.kind === "TICKET_CREATE") {
    const input = posTicketCreateRequestSchema.parse(resolvedOperation.payload);
    const replay = await findPosIdempotentReplay({
      key: operation.idempotencyKey,
      actorCredentialId: context.credentialId,
      operation: "POS_TICKET_CREATE",
      payload: input,
    });
    if (replay) return replay;
    const agenda = await prepareAgendaTicketSaga({
      operationKey: operation.idempotencyKey,
      ticket: input,
      authorizedBranchIds: membershipContext.authorizedBranchIds,
    });
    try {
      return await executePosIdempotent({
        key: operation.idempotencyKey,
        actorCredentialId: context.credentialId,
        operation: "POS_TICKET_CREATE",
        payload: input,
        execute: async (tx) => ({
          status: 201,
          message: "Ticket offline conciliado",
          data: ticketDto(await createTicket(tx, input, context, agenda)),
        }),
      });
    } catch (error) {
      if (agenda)
        await compensatePreparedAgendaTicket(
          operation.idempotencyKey,
          "Falló la conciliación local del ticket offline",
        );
      throw error;
    }
  }
  if (resolvedOperation.kind === "LAYAWAY_PAYMENT") {
    if (!resolvedOperation.entityId)
      throw new PosSyncError("El abono no indica apartado");
    const input = posLayawayPaymentRequestSchema.parse(
      resolvedOperation.payload,
    );
    const result = await executePosIdempotent({
      key: operation.idempotencyKey,
      actorCredentialId: context.credentialId,
      operation: `POS_LAYAWAY_PAYMENT:${resolvedOperation.entityId}`,
      payload: input,
      execute: async (tx) => ({
        status: 201,
        message: "Abono offline conciliado",
        data: ticketDto(
          await addLayawayPayment(
            tx,
            {
              ticketId: resolvedOperation.entityId!,
              payments: input.payments,
              deliveredTicketLineIds: input.deliveredTicketLineIds,
            },
            context,
          ),
        ),
      }),
    });
    return result;
  }
  if (resolvedOperation.kind === "AGENDA_MEMBERSHIP_RESERVATION") {
    if (!resolvedOperation.entityId)
      throw new PosSyncError("La reservación no indica membresía");
    const input = posAgendaMembershipReservationSchema.parse(
      resolvedOperation.payload,
    );
    if (input.membershipId !== operation.entityId) {
      throw new PosSyncError(
        "La membresía de la reservación no coincide con su entidad",
      );
    }
    let membershipId = resolvedOperation.entityId;
    if (input.membershipItemId && input.unitOrdinal) {
      const ticketDependency = dependencies.find(
        (dependency) => dependency.kind === "TICKET_CREATE",
      );
      const ticketResponse =
        ticketDependency?.response &&
        !Array.isArray(ticketDependency.response) &&
        typeof ticketDependency.response === "object"
          ? (ticketDependency.response as Record<string, unknown>)
          : null;
      const memberships = Array.isArray(ticketResponse?.["memberships"])
        ? ticketResponse["memberships"]
        : [];
      const createdMembership = memberships.find((candidate) => {
        if (
          !candidate ||
          Array.isArray(candidate) ||
          typeof candidate !== "object"
        )
          return false;
        const record = candidate as Record<string, unknown>;
        return (
          record["membershipItemId"] === input.membershipItemId &&
          record["unitOrdinal"] === input.unitOrdinal
        );
      }) as Record<string, unknown> | undefined;
      if (typeof createdMembership?.["id"] !== "string") {
        throw new PosSyncError(
          "La membresía local no pudo resolverse desde su ticket conciliado",
          409,
          "OFFLINE_MEMBERSHIP_REFERENCE_UNRESOLVED",
        );
      }
      membershipId = createdMembership["id"];
    }
    const scopedMembership = await prisma.$transaction((tx) =>
      tx.posClientMembership.findFirst({
        where: {
          id: membershipId,
          purchaseBranchId: actor.grant.branchId,
          ...(!actor.isMaster
            ? actor.grant.employeeId
              ? { currentSellerId: actor.grant.employeeId }
              : { id: "__NO_OFFLINE_MEMBERSHIP_PORTFOLIO__" }
            : {}),
        },
        select: { id: true },
      }),
    );
    if (!scopedMembership)
      throw new PosSyncError("Membresía no encontrada o fuera de alcance", 404);
    const appointment = await reserveMembershipNextSession({
      operationKey: operation.idempotencyKey,
      membershipId,
      agendaSlotId: input.agendaSlotId,
      sellerId: input.sellerId,
      credentialId: context.credentialId,
      authorizedBranchIds: membershipContext.authorizedBranchIds,
    });
    return {
      status: 201,
      message: "Reservación offline confirmada por Agenda",
      data: {
        id: appointment.id,
        kind: appointment.kind,
        status: appointment.status,
        serviceItemId: appointment.serviceItemId,
        serviceName: appointment.serviceNameSnapshot,
        branchId: appointment.branchId,
        branchName: appointment.branch.nombre,
        sellerId: appointment.sellerId,
        scheduledAt: appointment.scheduledAt?.toISOString() ?? null,
        agendaSlotId: appointment.agendaSlotId,
        agendaReservationId: appointment.agendaReservationId,
        externalReservationId: appointment.externalReservationId,
        externalAppointmentId: appointment.externalAppointmentId,
        agendaResourceName: appointment.agendaResource?.nameSnapshot ?? null,
        agendaVersion: appointment.agendaVersion,
        membershipId: appointment.membershipId,
        courtesyReason: null,
      },
    };
  }
  if (resolvedOperation.kind === "MEMBERSHIP_ATTENDANCE") {
    if (!resolvedOperation.entityId)
      throw new PosSyncError("La asistencia no indica membresía");
    const input = posOfflineMembershipAttendanceSchema.parse(
      resolvedOperation.payload,
    );
    const appointmentDependency = dependencies.find(
      (dependency) => dependency.clientOperationId === input.appointmentId,
    );
    const appointmentId =
      appointmentDependency?.serverEntityId ?? input.appointmentId;
    const appointmentResponse =
      appointmentDependency?.response &&
      !Array.isArray(appointmentDependency.response) &&
      typeof appointmentDependency.response === "object"
        ? (appointmentDependency.response as Record<string, unknown>)
        : null;
    const membershipId =
      typeof appointmentResponse?.["membershipId"] === "string"
        ? appointmentResponse["membershipId"]
        : resolvedOperation.entityId;
    const result = await executePosIdempotent({
      key: operation.idempotencyKey,
      actorCredentialId: context.credentialId,
      operation: `POS_MEMBERSHIP_ATTENDANCE:${membershipId}:${appointmentId}`,
      payload: { ...input, appointmentId },
      execute: async (tx) => {
        const membership = membershipDto(
          await consumeMembershipAttendance(
            tx,
            {
              membershipId,
              appointmentId,
              event: input.event,
              branchId: input.branchId,
              signatureStatus: input.signatureStatus,
            },
            membershipContext,
          ),
        );
        return {
          status: 200,
          message:
            input.event === "ATTENDED"
              ? "Asistencia offline conciliada"
              : "El evento offline no consume sesiones",
          data: { id: membership.id, appointmentId, membership },
        };
      },
    });
    return result;
  }
  if (resolvedOperation.kind === "VOUCHER_ISSUE") {
    if (!resolvedOperation.entityId)
      throw new PosSyncError("El voucher no indica ticket");
    const input = posVoucherIssueRequestSchema.parse(resolvedOperation.payload);
    const result = await executePosIdempotent({
      key: operation.idempotencyKey,
      actorCredentialId: context.credentialId,
      operation: `POS_VOUCHER_ISSUE:${resolvedOperation.entityId}`,
      payload: input,
      execute: async (tx) => ({
        status: 201,
        message: "Voucher offline conciliado",
        data: voucherDto(
          await issueVoucher(
            tx,
            {
              ticketId: resolvedOperation.entityId!,
              templateId: input.templateId,
            },
            context,
          ),
        ),
      }),
    });
    return result;
  }
  if (resolvedOperation.kind === "VOUCHER_PRINT") {
    if (!resolvedOperation.entityId)
      throw new PosSyncError("La impresión no indica voucher");
    const result = await executePosIdempotent({
      key: operation.idempotencyKey,
      actorCredentialId: context.credentialId,
      operation: `POS_VOUCHER_PRINT:${resolvedOperation.entityId}`,
      payload: { issueId: resolvedOperation.entityId },
      execute: async (tx) => ({
        status: 201,
        message: "Impresión offline conciliada",
        data: await printVoucher(tx, resolvedOperation.entityId!, context),
      }),
    });
    return result;
  }
  return executeBusinessDayOperation(resolvedOperation, actor, context);
}

async function executeBusinessDayOperation(
  operation: PosOfflineOperationDto,
  actor: PosOfflineActor,
  context: {
    credentialId: string;
    terminalId: string;
    branchId: string;
    businessDate: string;
    isMaster: boolean;
  },
) {
  const result = await executePosIdempotent({
    key: operation.idempotencyKey,
    actorCredentialId: context.credentialId,
    operation: `POS_OFFLINE_${operation.kind}:${operation.entityId ?? context.branchId}:${context.businessDate}`,
    payload: operation.payload,
    execute: async (tx) => {
      if (operation.kind === "INVENTORY_COUNT") {
        const input = posInventoryCountRequestSchema.parse(operation.payload);
        const count = await createBusinessDayCount(tx, {
          ...input,
          branchId: context.branchId,
          credentialId: context.credentialId,
          terminalId: context.terminalId,
        });
        return {
          status: 201,
          message: "Conteo offline conciliado",
          data: { id: count.id },
        };
      }
      if (operation.kind === "BUSINESS_DAY_OPEN") {
        const input = posBusinessDayCountInputSchema.parse(operation.payload);
        if (input.skipped)
          throw new PosSyncError(
            "La omisión de apertura requiere autorización online",
          );
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pos-day:${context.branchId}:${context.businessDate}`}))`;
        const existing = await tx.posBusinessDay.findUnique({
          where: {
            branchId_businessDate: {
              branchId: context.branchId,
              businessDate: new Date(`${context.businessDate}T00:00:00.000Z`),
            },
          },
        });
        if (existing)
          throw new PosSyncError("La jornada ya fue abierta por otra terminal");
        const count = await createBusinessDayCount(tx, {
          kind: "OPENING",
          businessDate: context.businessDate,
          branchId: context.branchId,
          locationId: input.locationId!,
          notes: input.notes,
          lines: input.lines!,
          credentialId: context.credentialId,
          terminalId: context.terminalId,
        });
        const day = await tx.posBusinessDay.create({
          data: {
            branchId: context.branchId,
            businessDate: new Date(`${context.businessDate}T00:00:00.000Z`),
            openingCountId: count.id,
            openedByCredentialId: context.credentialId,
            openedTerminalId: context.terminalId,
          },
          include: businessDayInclude,
        });
        const attendance = await registerAttendanceIfMissing(tx, {
          businessDayId: day.id,
          businessDate: context.businessDate,
          branchId: context.branchId,
          employeeId: actor.grant.employeeId,
          credentialId: context.credentialId,
          terminalId: context.terminalId,
        });
        if (attendance) {
          await enqueuePosNotification(tx, {
            kind: "CLOCK_IN",
            title: `Clock In · ${actor.grant.displayName}`,
            message: `Entrada conciliada en ${context.businessDate}`,
            branchId: context.branchId,
            audiencePermission: "BUSINESS_DAY_OPEN",
            createdByCredentialId: context.credentialId,
            sourceType: "PosAttendance",
            sourceId: attendance.id,
          });
        }
        return {
          status: 201,
          message: "Jornada offline conciliada",
          data: businessDayDto(day),
        };
      }
      if (!operation.entityId)
        throw new PosSyncError("La operación no indica jornada");
      const day = await tx.posBusinessDay.findUnique({
        where: { id: operation.entityId },
      });
      if (!day || day.branchId !== context.branchId)
        throw new PosSyncError("Jornada no encontrada", 404);
      if (operation.kind === "BUSINESS_DAY_CLOSING_COUNT") {
        const input = posBusinessDayCountInputSchema.parse(operation.payload);
        if (input.skipped)
          throw new PosSyncError(
            "La omisión del conteo final requiere autorización online",
          );
        if (day.status !== "OPEN" || day.closingCountId || day.closingSkipped) {
          throw new PosSyncError(
            "La jornada ya tiene conteo final o está cerrada",
          );
        }
        const count = await createBusinessDayCount(tx, {
          kind: "CLOSING",
          businessDate: day.businessDate.toISOString().slice(0, 10),
          branchId: day.branchId,
          locationId: input.locationId!,
          notes: input.notes,
          lines: input.lines!,
          credentialId: context.credentialId,
          terminalId: context.terminalId,
        });
        const updated = await tx.posBusinessDay.update({
          where: { id: day.id },
          data: { closingCountId: count.id },
          include: businessDayInclude,
        });
        return {
          status: 201,
          message: "Conteo final offline conciliado",
          data: businessDayDto(updated),
        };
      }
      if (operation.kind !== "BUSINESS_DAY_CLOSE") {
        throw new PosSyncError("Tipo de operación offline no soportado", 422);
      }
      if (!actor.isMaster) {
        throw new PosSyncError(
          "El cierre offline requiere una credencial master vigente",
          403,
        );
      }
      if (day.status !== "OPEN")
        throw new PosSyncError("La jornada ya fue cerrada");
      if (!day.closingCountId && !day.closingSkipped) {
        throw new PosSyncError(
          "El conteo final es obligatorio antes del cierre",
        );
      }
      const [tickets, cashMovements] = await Promise.all([
        tx.posTicket.findMany({
          where: {
            branchId: day.branchId,
            businessDate: day.businessDate,
            status: { in: ["COMPLETED", "LAYAWAY"] },
          },
          select: { total: true, amountPaid: true, discountTotal: true },
        }),
        tx.posCashMovement.findMany({
          where: {
            businessDate: day.businessDate,
            expense: { branchId: day.branchId },
          },
          select: { amount: true },
        }),
      ]);
      const total = (values: Prisma.Decimal[]) =>
        values.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));
      const salesTotal = total(tickets.map((ticket) => ticket.total));
      const collectedTotal = total(tickets.map((ticket) => ticket.amountPaid));
      const discountTotal = total(
        tickets.map((ticket) => ticket.discountTotal),
      );
      const expenseTotal = total(
        cashMovements.map((movement) => movement.amount),
      );
      const closedAt = new Date();
      const closeSummary = {
        ticketCount: tickets.length,
        salesTotal: money(salesTotal),
        collectedTotal: money(collectedTotal),
        discountTotal: money(discountTotal),
        expenseTotal: money(expenseTotal),
        netCashFlow: money(collectedTotal.minus(expenseTotal)),
        closedAt: closedAt.toISOString(),
        authorizationMode: "OFFLINE_SIGNED_GRANT",
      };
      await tx.posAttendance.updateMany({
        where: { businessDayId: day.id, status: "OPEN" },
        data: {
          status: "CLOSED",
          clockOutAt: closedAt,
          closeReason: "CLOSE_DAY",
          closedByCredentialId: context.credentialId,
        },
      });
      const updated = await tx.posBusinessDay.update({
        where: { id: day.id },
        data: {
          status: "CLOSED",
          closedByCredentialId: context.credentialId,
          closedTerminalId: context.terminalId,
          closedAt,
          closeSummary,
        },
        include: businessDayInclude,
      });
      await tx.auditLog.create({
        data: {
          action: "POS_BUSINESS_DAY_CLOSE_OFFLINE",
          outcome: "SUCCESS",
          actorCredentialId: context.credentialId,
          terminalId: context.terminalId,
          branchId: context.branchId,
          targetType: "PosBusinessDay",
          targetId: day.id,
          metadata: closeSummary,
        },
      });
      await enqueuePosNotification(tx, {
        kind: "CLOSE_DAY",
        title: `Cierre de día · ${day.businessDate.toISOString().slice(0, 10)}`,
        message: `${closeSummary.ticketCount} tickets · cobrado ${closeSummary.collectedTotal} MXN · gastos ${closeSummary.expenseTotal} MXN`,
        branchId: day.branchId,
        audiencePermission: "BUSINESS_DAY_CLOSE",
        createdByCredentialId: context.credentialId,
        sourceType: "PosBusinessDay",
        sourceId: day.id,
      });
      return {
        status: 200,
        message: "Jornada offline conciliada y cerrada",
        data: businessDayDto(updated),
      };
    },
  });
  return result;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function errorResult(
  operation: PosOfflineOperationDto,
  status: "ERROR" | "CONFLICT",
  message: string,
): PosOfflineOperationResultDto {
  return {
    id: operation.id,
    sequence: operation.sequence,
    status,
    message,
    serverEntityId: null,
    data: null,
  };
}

export async function pushOfflineOperations(
  actor: PosOfflineActor,
  operations: PosOfflineOperationDto[],
): Promise<{ results: PosOfflineOperationResultDto[]; nextSequence: number }> {
  const ordered = [...operations].sort(
    (left, right) => left.sequence - right.sequence,
  );
  const results: PosOfflineOperationResultDto[] = [];
  for (const operation of ordered) {
    const hash = payloadHash(operation);
    const existing = await prisma.posSyncOperation.findUnique({
      where: { clientOperationId: operation.id },
    });
    if (existing) {
      if (
        existing.terminalId !== actor.grant.terminalId ||
        existing.credentialId !== actor.grant.credentialId ||
        existing.payloadHash !== hash ||
        existing.terminalSequence !== BigInt(operation.sequence) ||
        existing.idempotencyKey !== operation.idempotencyKey ||
        existing.kind !== operation.kind ||
        existing.entityId !== operation.entityId ||
        JSON.stringify(jsonStringArray(existing.dependencyIds)) !==
          JSON.stringify(operation.dependsOn) ||
        existing.clientCreatedAt.getTime() !==
          new Date(operation.createdAt).getTime()
      ) {
        throw new PosSyncError(
          "La operación local fue reutilizada con otro contenido",
          409,
          "OPERATION_REUSED",
        );
      }
      if (existing.status === "SYNCED" || existing.status === "CONFLICT") {
        results.push({
          id: operation.id,
          sequence: operation.sequence,
          status: existing.status,
          message:
            existing.errorMessage ??
            (existing.status === "SYNCED"
              ? "Operación ya conciliada"
              : "Operación en conflicto"),
          serverEntityId: existing.serverEntityId,
          data: existing.response,
        });
        if (existing.status === "CONFLICT") break;
        continue;
      }
      await prisma.posSyncOperation.update({
        where: { clientOperationId: operation.id },
        data: { status: "SYNCING", errorCode: null, errorMessage: null },
      });
    } else {
      const cursor = await prisma.posSyncCursor.upsert({
        where: { terminalId: actor.grant.terminalId },
        create: { terminalId: actor.grant.terminalId },
        update: {},
      });
      if (BigInt(operation.sequence) !== cursor.lastSequence + 1n) {
        throw new PosSyncError(
          `Secuencia fuera de orden; se esperaba ${cursor.lastSequence + 1n}`,
          409,
          "OUT_OF_ORDER",
        );
      }
      await prisma.posSyncOperation.create({
        data: {
          clientOperationId: operation.id,
          terminalId: actor.grant.terminalId,
          terminalSequence: operation.sequence,
          credentialId: actor.grant.credentialId,
          kind: operation.kind,
          idempotencyKey: operation.idempotencyKey,
          entityId: operation.entityId,
          dependencyIds: operation.dependsOn,
          payloadHash: hash,
          status: "SYNCING",
          clientCreatedAt: new Date(operation.createdAt),
        },
      });
    }
    try {
      const executed = await executeOperation(operation, actor);
      const serverEntityId =
        executed.data &&
        typeof executed.data === "object" &&
        "id" in executed.data
          ? String((executed.data as { id: unknown }).id)
          : null;
      await prisma.$transaction(async (tx) => {
        await tx.posSyncOperation.update({
          where: { clientOperationId: operation.id },
          data: {
            status: "SYNCED",
            response: jsonValue(executed.data),
            serverEntityId,
            syncedAt: new Date(),
            errorCode: null,
            errorMessage: null,
          },
        });
        await tx.posSyncCursor.update({
          where: { terminalId: actor.grant.terminalId },
          data: { lastSequence: operation.sequence },
        });
      });
      results.push({
        id: operation.id,
        sequence: operation.sequence,
        status: "SYNCED",
        message: executed.message,
        serverEntityId,
        data: executed.data,
      });
    } catch (error) {
      const conflict =
        error instanceof PosSyncError ||
        (error instanceof Error &&
          "status" in error &&
          Number((error as { status?: number }).status) < 500) ||
        error instanceof Prisma.PrismaClientKnownRequestError;
      const status = conflict ? "CONFLICT" : "ERROR";
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo conciliar la operación";
      await prisma.$transaction(async (tx) => {
        await tx.posSyncOperation.update({
          where: { clientOperationId: operation.id },
          data: {
            status,
            errorCode: conflict ? "REVALIDATION_CONFLICT" : "SYNC_ERROR",
            errorMessage: message,
          },
        });
        if (conflict) {
          await tx.posSyncCursor.update({
            where: { terminalId: actor.grant.terminalId },
            data: { lastSequence: operation.sequence },
          });
        }
      });
      results.push(errorResult(operation, status, message));
      break;
    }
  }
  const cursor = await prisma.posSyncCursor.findUniqueOrThrow({
    where: { terminalId: actor.grant.terminalId },
  });
  return { results, nextSequence: Number(cursor.lastSequence) + 1 };
}
