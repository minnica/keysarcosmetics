export const SCHEDULER_SCREEN_KEYS = [
  "scheduler/agenda",
  "scheduler/clients",
  "scheduler/services",
  "scheduler/reports/summary",
  "scheduler/reports/reservations",
  "scheduler/reports/sales",
  "scheduler/administration/locals",
  "scheduler/administration/professionals",
  "scheduler/administration/services",
  "scheduler/administration/commissions",
  "scheduler/administration/resources",
  "scheduler/administration/surveys",
  "scheduler/administration/consents",
  "scheduler/administration/whatsapp",
  "scheduler/administration/gift-cards",
  "scheduler/administration/status-colors",
  "scheduler/settings/company",
  "scheduler/settings/website",
  "scheduler/settings/agenda",
  "scheduler/settings/payments",
  "scheduler/settings/reminders",
  "scheduler/settings/records",
  "scheduler/settings/emails",
  "scheduler/settings/integrations",
  "scheduler/settings/notifications",
  "scheduler/settings/clients",
  "scheduler/settings/surveys",
  "scheduler/settings/authorizations",
] as const;

export type SchedulerScreenKey = (typeof SCHEDULER_SCREEN_KEYS)[number];

export const SCHEDULER_CAPABILITIES = [
  "READ",
  "WRITE",
  "ADMIN",
  "EXPORT",
  "EXCEPTION",
] as const;

export type SchedulerCapability = (typeof SCHEDULER_CAPABILITIES)[number];

export const SCHEDULER_AUTHORIZATION_PURPOSES = [
  "CLIENT_RECORD_VIEW",
  "CLIENT_VISIT_HISTORY_VIEW",
  "CLIENT_FINANCIAL_HISTORY_VIEW",
  "STATUS_COLORS_CHANGE",
  "AVAILABILITY_OVERRIDE",
  "SENSITIVE_EXPORT",
] as const;

export type SchedulerAuthorizationPurpose =
  (typeof SCHEDULER_AUTHORIZATION_PURPOSES)[number];

export interface SchedulerPermissionDto {
  screenKey: SchedulerScreenKey;
  capabilities: SchedulerCapability[];
}

export interface SchedulerAuthorizedBranchDto {
  id: string;
  name: string;
  active: boolean;
}

export type SchedulerBranchScope =
  | "ALL_ACTIVE"
  | "ASSIGNED"
  | "OWN_BRANCH"
  | "NONE";

export interface SchedulerBootstrapDto {
  user: {
    id: string;
    name: string;
    email: string;
    role: "SUPER_ADMIN" | "GERENTE" | "CAPTURISTA";
    employeeId: string | null;
    positionId: string | null;
    positionName: string | null;
  };
  canManageAccess: boolean;
  selfProfessionalOnly: boolean;
  professionalEmployeeId: string | null;
  permissions: SchedulerPermissionDto[];
  authorizedBranches: SchedulerAuthorizedBranchDto[];
  authorizedBranchIds: string[];
  branchScope: SchedulerBranchScope;
  secondaryAuthorizationConfigured: boolean;
  mockModeEnabled: boolean;
}

export interface SchedulerSecondarySecretRequestDto {
  currentPassword: string;
  secret: string;
}

export interface SchedulerAuthorizationRequestDto {
  secret: string;
  purpose: SchedulerAuthorizationPurpose;
  screenKey: SchedulerScreenKey;
  branchId?: string;
  targetType?: string;
  targetId?: string;
}

export interface SchedulerAuthorizationDto {
  token: string;
  purpose: SchedulerAuthorizationPurpose;
  expiresAt: string;
  actor: {
    userId: string;
    name: string;
  };
}

export interface SchedulerAuthorizationConsumeRequestDto {
  token: string;
  purpose: SchedulerAuthorizationPurpose;
  screenKey: SchedulerScreenKey;
  branchId?: string;
  targetType?: string;
  targetId?: string;
}

export interface SchedulerManagedPositionDto {
  id: string;
  name: string;
  active: boolean;
  canManageSchedulerAccess: boolean;
  selfProfessionalOnly: boolean;
  branchIds: string[];
  permissions: SchedulerPermissionDto[];
}

export interface SchedulerAccessManagementDto {
  screens: readonly SchedulerScreenKey[];
  capabilities: readonly SchedulerCapability[];
  branches: SchedulerAuthorizedBranchDto[];
  positions: SchedulerManagedPositionDto[];
}
