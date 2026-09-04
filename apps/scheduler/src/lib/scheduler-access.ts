import type {
  SchedulerBootstrapDto,
  SchedulerCapability,
  SchedulerScreenKey,
} from "@cosmetics/types";

export type SchedulerScreenId =
  | "agenda"
  | "clients"
  | "services"
  | "reports.summary"
  | "reports.reservations"
  | "reports.sales"
  | "administration.locals"
  | "administration.professionals"
  | "administration.services"
  | "administration.commissions"
  | "administration.resources"
  | "administration.surveys"
  | "administration.consents"
  | "administration.whatsapp"
  | "administration.gift-cards"
  | "administration.status-colors";

export const schedulerScreenKeyById: Record<
  SchedulerScreenId,
  SchedulerScreenKey
> = {
  agenda: "scheduler/agenda",
  clients: "scheduler/clients",
  services: "scheduler/services",
  "reports.summary": "scheduler/reports/summary",
  "reports.reservations": "scheduler/reports/reservations",
  "reports.sales": "scheduler/reports/sales",
  "administration.locals": "scheduler/administration/locals",
  "administration.professionals": "scheduler/administration/professionals",
  "administration.services": "scheduler/administration/services",
  "administration.commissions": "scheduler/administration/commissions",
  "administration.resources": "scheduler/administration/resources",
  "administration.surveys": "scheduler/administration/surveys",
  "administration.consents": "scheduler/administration/consents",
  "administration.whatsapp": "scheduler/administration/whatsapp",
  "administration.gift-cards": "scheduler/administration/gift-cards",
  "administration.status-colors": "scheduler/administration/status-colors",
};

export type SchedulerFinancialRole = "master" | "admin" | "seller";

export interface SchedulerFinancialProfile {
  id: string;
  name: string;
  role: SchedulerFinancialRole;
  expiresAt: string;
}

export type SchedulerFinancialAuditAction =
  | "view"
  | "create"
  | "update"
  | "delete";

export interface SchedulerFinancialAuditEvent {
  id: string;
  userId: string;
  userName: string;
  userRole: SchedulerFinancialRole;
  clientKey: string;
  clientName: string;
  bookingId: string;
  action: SchedulerFinancialAuditAction;
  description: string;
  occurredAt: string;
}

export function getSchedulerClientAccessKey(
  clientId: string | undefined,
  phone: string,
): string {
  return clientId ?? `phone:${phone.replace(/\D/g, "").slice(-10)}`;
}

export function canManageSchedulerPaymentHistory(
  profile: SchedulerFinancialProfile | undefined,
): boolean {
  return profile?.role === "master" || profile?.role === "admin";
}

export function canAccessSchedulerScreen(
  bootstrap: SchedulerBootstrapDto | null,
  screenId: SchedulerScreenId,
  capability: SchedulerCapability = "READ",
): boolean {
  const screenKey = schedulerScreenKeyById[screenId];
  return Boolean(
    bootstrap?.permissions.some(
      (permission) =>
        permission.screenKey === screenKey &&
        permission.capabilities.includes(capability),
    ),
  );
}

export function canAccessSchedulerBranch(
  bootstrap: SchedulerBootstrapDto | null,
  branchId: string,
): boolean {
  if (bootstrap?.mockModeEnabled) return true;
  return Boolean(bootstrap?.authorizedBranchIds.includes(branchId));
}

export function canAccessSchedulerCommerce(
  bootstrap: SchedulerBootstrapDto | null,
  _commerceId: string,
): boolean {
  return Boolean(
    bootstrap?.mockModeEnabled || bootstrap?.authorizedBranchIds.length,
  );
}

export function canAccessSchedulerProfessional(
  bootstrap: SchedulerBootstrapDto | null,
  professionalId: string,
): boolean {
  if (!bootstrap) return false;
  if (!bootstrap.selfProfessionalOnly) return true;
  return bootstrap.professionalEmployeeId === professionalId;
}
