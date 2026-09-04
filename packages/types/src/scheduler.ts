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

export const SCHEDULER_WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type SchedulerWeekday = (typeof SCHEDULER_WEEKDAYS)[number];

export const SCHEDULER_RESOURCE_KINDS = [
  "ROOM",
  "EQUIPMENT",
  "STATION",
  "OTHER",
] as const;
export type SchedulerResourceKind = (typeof SCHEDULER_RESOURCE_KINDS)[number];
export type SchedulerServiceMode = "INDIVIDUAL" | "CLASS";
export type SchedulerAvailabilityOwnerType =
  | "BRANCH"
  | "PROFESSIONAL"
  | "RESOURCE";

export interface SchedulerOperationalCandidatesDto {
  branches: Array<{
    id: string;
    name: string;
    active: boolean;
    profileId: string | null;
    profileActive: boolean | null;
  }>;
  employees: Array<{
    id: string;
    name: string;
    active: boolean;
    positionName: string | null;
    branchId: string | null;
    allBranches: boolean;
    profileId: string | null;
    profileActive: boolean | null;
  }>;
  services: Array<{
    id: string;
    sku: string;
    name: string;
    active: boolean;
    published: boolean;
    profileId: string | null;
    profileActive: boolean | null;
    durationMinutes: number | null;
  }>;
}

export interface SchedulerCommerceDto {
  id: string;
  name: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerBranchProfileDto {
  id: string;
  branchId: string;
  branchName: string;
  branchActive: boolean;
  commerceId: string;
  timezone: string;
  bookingEnabled: boolean;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
}

export interface SchedulerProfessionalProfileDto {
  id: string;
  employeeId: string;
  name: string;
  employeeActive: boolean;
  biography: string | null;
  acceptsOnline: boolean;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  branchProfileIds: string[];
  specialtyIds: string[];
}

export interface SchedulerServiceProfileDto {
  id: string;
  catalogItemId: string;
  sku: string;
  name: string;
  catalogActive: boolean;
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  capacity: number;
  mode: SchedulerServiceMode;
  acceptsOnline: boolean;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  branchProfileIds: string[];
}

export interface SchedulerResourceDto {
  id: string;
  branchProfileId: string;
  name: string;
  kind: SchedulerResourceKind;
  capacity: number;
  exclusive: boolean;
  acceptsOnline: boolean;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
}

export interface SchedulerSpecialtyDto {
  id: string;
  commerceId: string;
  name: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerProfessionalGroupDto {
  id: string;
  commerceId: string;
  branchProfileId: string;
  name: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  professionalProfileIds: string[];
}

export interface SchedulerProfessionalServiceDto {
  professionalProfileId: string;
  serviceProfileId: string;
  branchProfileId: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerServiceResourceRequirementDto {
  serviceProfileId: string;
  resourceId: string;
  requiredUnits: number;
  exclusive: boolean;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerAvailabilityRuleDto {
  id: string;
  branchProfileId: string;
  ownerType: SchedulerAvailabilityOwnerType;
  ownerId: string;
  kind: "WORKING" | "BREAK";
  weekday: SchedulerWeekday;
  startMinute: number;
  endMinute: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerAvailabilityExceptionDto {
  id: string;
  branchProfileId: string;
  ownerType: SchedulerAvailabilityOwnerType;
  ownerId: string;
  kind: "AVAILABLE" | "UNAVAILABLE";
  date: string;
  startMinute: number | null;
  endMinute: number | null;
  reason: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerOperationalCatalogDto {
  commerces: SchedulerCommerceDto[];
  branches: SchedulerBranchProfileDto[];
  professionals: SchedulerProfessionalProfileDto[];
  services: SchedulerServiceProfileDto[];
  resources: SchedulerResourceDto[];
  specialties: SchedulerSpecialtyDto[];
  groups: SchedulerProfessionalGroupDto[];
  professionalServices: SchedulerProfessionalServiceDto[];
  resourceRequirements: SchedulerServiceResourceRequirementDto[];
  availabilityRules: SchedulerAvailabilityRuleDto[];
  availabilityExceptions: SchedulerAvailabilityExceptionDto[];
}

export interface SchedulerMutationResultDto {
  id: string;
}

export interface SchedulerCommerceWriteDto {
  name: string;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface SchedulerBranchProfileWriteDto {
  commerceId: string;
  timezone: string;
  bookingEnabled: boolean;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
}

export interface SchedulerProfessionalProfileWriteDto {
  biography?: string | null;
  acceptsOnline: boolean;
  active: boolean;
  branchProfileIds: string[];
  specialtyIds: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
}

export interface SchedulerServiceProfileWriteDto {
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  capacity: number;
  mode: SchedulerServiceMode;
  acceptsOnline: boolean;
  active: boolean;
  branchProfileIds: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
}

export interface SchedulerResourceWriteDto {
  branchProfileId: string;
  name: string;
  kind: SchedulerResourceKind;
  capacity: number;
  exclusive: boolean;
  acceptsOnline: boolean;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
}

export interface SchedulerSpecialtyWriteDto {
  commerceId: string;
  name: string;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface SchedulerProfessionalGroupWriteDto {
  commerceId: string;
  branchProfileId: string;
  name: string;
  active: boolean;
  professionalProfileIds: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface SchedulerProfessionalServiceWriteDto {
  professionalProfileId: string;
  serviceProfileId: string;
  branchProfileId: string;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface SchedulerServiceResourceRequirementWriteDto {
  serviceProfileId: string;
  resourceId: string;
  requiredUnits: number;
  exclusive: boolean;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface SchedulerAvailabilityRulesWriteDto {
  branchProfileId: string;
  ownerType: SchedulerAvailabilityOwnerType;
  ownerId: string;
  effectiveFrom?: string;
  rules: Array<{
    kind: "WORKING" | "BREAK";
    weekday: SchedulerWeekday;
    startMinute: number;
    endMinute: number;
  }>;
}

export interface SchedulerAvailabilityExceptionsWriteDto {
  branchProfileId: string;
  ownerType: SchedulerAvailabilityOwnerType;
  ownerId: string;
  effectiveFrom?: string;
  exceptions: Array<{
    kind: "AVAILABLE" | "UNAVAILABLE";
    date: string;
    startMinute?: number | null;
    endMinute?: number | null;
    reason?: string | null;
  }>;
}
