import { Prisma, type SchedulerCustomerFieldType } from "@prisma/client";
import type { ResolvedSchedulerAccess } from "./scheduler-access";

export class SchedulerCustomerError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "SCHEDULER_CUSTOMER_ERROR",
  ) {
    super(message);
  }
}

export function normalizeSchedulerCustomerName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
}

export function normalizeSchedulerCustomerPhone(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.replace(/\D/g, "") || null;
}

export function normalizeSchedulerCustomerEmail(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US") || null;
}

export function normalizeSchedulerCustomerFieldKey(value: string): string {
  return normalizeSchedulerCustomerName(value).replace(/[^a-z0-9]+/g, "_");
}

export function schedulerCustomerScopeWhere(
  access: ResolvedSchedulerAccess,
  requestedBranchId?: string,
): Prisma.CustomerWhereInput {
  const authorizedBranchIds = access.authorizedBranches.map(
    (branch) => branch.id,
  );
  const branchIds = requestedBranchId
    ? authorizedBranchIds.includes(requestedBranchId)
      ? [requestedBranchId]
      : []
    : authorizedBranchIds;

  if (branchIds.length === 0) return { id: "__no_authorized_customer__" };

  if (access.selfProfessionalOnly) {
    return {
      portfolios: {
        some: {
          branchId: { in: branchIds },
          employeeId: access.professionalEmployeeId ?? "__none__",
          effectiveTo: null,
        },
      },
    };
  }

  return {
    OR: [
      { portfolios: { some: { branchId: { in: branchIds } } } },
      { posTickets: { some: { branchId: { in: branchIds } } } },
      { posAppointments: { some: { branchId: { in: branchIds } } } },
      { agendaReservations: { some: { branchId: { in: branchIds } } } },
      {
        posMemberships: {
          some: { purchaseBranchId: { in: branchIds } },
        },
      },
      { warehouseRequests: { some: { branchId: { in: branchIds } } } },
    ],
  };
}

export function validateSchedulerCustomerFieldValue(
  type: SchedulerCustomerFieldType,
  value: unknown,
  options: unknown,
): boolean {
  if (type === "TEXT") return typeof value === "string" && value.length <= 4000;
  if (type === "NUMBER")
    return typeof value === "number" && Number.isFinite(value);
  if (type === "BOOLEAN") return typeof value === "boolean";
  if (type === "DATE") {
    return (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
    );
  }
  return (
    typeof value === "string" &&
    Array.isArray(options) &&
    options.every((option) => typeof option === "string") &&
    options.includes(value)
  );
}

export async function lockSchedulerCustomerPhone(
  tx: Prisma.TransactionClient,
  phoneNormalized: string | null,
): Promise<void> {
  if (!phoneNormalized) return;
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${`scheduler-customer-phone:${phoneNormalized}`}, 0)
    )
  `;
}

export async function findSchedulerCustomerPhoneDuplicate(
  tx: Prisma.TransactionClient,
  phoneNormalized: string | null,
  excludeCustomerId?: string,
): Promise<string | null> {
  if (!phoneNormalized) return null;
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT c.id
    FROM "Customer" c
    WHERE c."deletedAt" IS NULL
      AND (${excludeCustomerId ?? null}::text IS NULL OR c.id <> ${excludeCustomerId ?? null})
      AND (
        c."phoneNormalized" = ${phoneNormalized}
        OR REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '', 'g') = ${phoneNormalized}
        OR EXISTS (
          SELECT 1
          FROM "SchedulerCustomerAlias" a
          WHERE a."customerId" = c.id
            AND a.kind = 'PHONE'
            AND a.active
            AND a."normalizedValue" = ${phoneNormalized}
        )
      )
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
}

export function schedulerCustomerSnapshot(customer: {
  id: string;
  displayName: string;
  phone: string | null;
  phoneNormalized: string | null;
  email: string | null;
  externalClientId: string | null;
  sourceId: string | null;
  active: boolean;
  version: number;
}): Prisma.InputJsonObject {
  return {
    id: customer.id,
    displayName: customer.displayName,
    phone: customer.phone,
    phoneNormalized: customer.phoneNormalized,
    email: customer.email,
    externalClientId: customer.externalClientId,
    sourceId: customer.sourceId,
    active: customer.active,
    version: customer.version,
  };
}

export function assertMergeableExternalCustomerIds(
  sourceExternalClientId: string | null,
  targetExternalClientId: string | null,
): void {
  if (
    sourceExternalClientId &&
    targetExternalClientId &&
    sourceExternalClientId !== targetExternalClientId
  ) {
    throw new SchedulerCustomerError(
      "Los clientes pertenecen a identidades externas distintas; resuelve Agenda antes de fusionar",
      409,
      "EXTERNAL_IDENTITY_CONFLICT",
    );
  }
}
