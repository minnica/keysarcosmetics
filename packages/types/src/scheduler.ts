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
  "CLIENT_MERGE",
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

export const SCHEDULER_APPOINTMENT_STATUSES = [
  "PENDING",
  "RESERVED",
  "CONFIRMED",
  "ARRIVED",
  "WAITING",
  "ATTENDED",
  "NO_SHOW",
  "CANCELED",
] as const;
export type SchedulerAppointmentStatus =
  (typeof SCHEDULER_APPOINTMENT_STATUSES)[number];

export type SchedulerAppointmentOrigin =
  | "SCHEDULER"
  | "POS"
  | "INTERNAL_API"
  | "IMPORT";

export type SchedulerAvailabilityConflictCode =
  | "BRANCH_CLOSED"
  | "PROFESSIONAL_UNAVAILABLE"
  | "RESOURCE_UNAVAILABLE"
  | "PROFESSIONAL_BUSY"
  | "RESOURCE_BUSY"
  | "SERVICE_CAPACITY_EXHAUSTED"
  | "SCHEDULE_BLOCKED"
  | "MEMBERSHIP_NOT_ELIGIBLE"
  | "VERSION_CONFLICT"
  | "SERVICE_NOT_AVAILABLE"
  | "CLASS_NOT_SCHEDULED"
  | "INVALID_STATUS_TRANSITION"
  | "LOCAL_TIME_GAP"
  | "INVALID_OVERRIDE_AUTHORIZATION"
  | "IDEMPOTENCY_CONFLICT"
  | "CONCURRENT_WRITE";

export interface SchedulerAppointmentServiceWriteDto {
  serviceProfileId: string;
  professionalProfileIds: string[];
  resourceIds?: string[];
  startsAt?: string;
  capacityUnits?: number;
  membershipId?: string | null;
}

export interface SchedulerAppointmentCreateDto {
  branchId: string;
  customerId: string;
  startsAt: string;
  status?: "PENDING" | "RESERVED" | "CONFIRMED";
  notes?: string | null;
  services: SchedulerAppointmentServiceWriteDto[];
  override?: {
    authorizationToken: string;
    reason: string;
  };
}

export interface SchedulerAppointmentUpdateDto extends SchedulerAppointmentCreateDto {
  expectedVersion: number;
}

export interface SchedulerAppointmentMoveDto {
  startsAt: string;
  expectedVersion: number;
  services?: SchedulerAppointmentServiceWriteDto[];
  override?: {
    authorizationToken: string;
    reason: string;
  };
}

export interface SchedulerAppointmentStatusWriteDto {
  status: SchedulerAppointmentStatus;
  expectedVersion: number;
  reason?: string | null;
}

export interface SchedulerAppointmentCancelDto {
  expectedVersion: number;
  reason: string;
}

export interface SchedulerAppointmentServiceDto {
  id: string;
  sequence: number;
  serviceProfileId: string;
  serviceName: string;
  serviceVersion: number;
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  capacityUnits: number;
  startsAt: string;
  endsAt: string;
  occupiesFrom: string;
  occupiesUntil: string;
  professionals: Array<{
    professionalProfileId: string;
    name: string;
    role: "PRIMARY" | "SUPPORT";
  }>;
  resources: Array<{
    resourceId: string;
    name: string;
    units: number;
    exclusive: boolean;
  }>;
  membership: {
    membershipId: string;
    name: string;
    status: "RESERVED" | "CONSUMED" | "RELEASED";
  } | null;
}

export interface SchedulerAppointmentDto {
  id: string;
  branchId: string;
  branchProfileId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  status: SchedulerAppointmentStatus;
  origin: SchedulerAppointmentOrigin;
  timezone: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  cancellationReason: string | null;
  version: number;
  services: SchedulerAppointmentServiceDto[];
  stateHistory: Array<{
    fromStatus: SchedulerAppointmentStatus | null;
    toStatus: SchedulerAppointmentStatus;
    reason: string | null;
    version: number;
    actorUserId: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerAppointmentPageDto {
  items: SchedulerAppointmentDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SchedulerAppointmentListRequest {
  branchId?: string;
  from: string;
  to: string;
  professionalProfileId?: string;
  customerId?: string;
  status?: SchedulerAppointmentStatus;
  page?: number;
  pageSize?: number;
}

export interface SchedulerAvailabilityRequestDto {
  branchId: string;
  serviceProfileId: string;
  date: string;
  professionalProfileId?: string;
  resourceId?: string;
}

export interface SchedulerAvailabilitySlotDto {
  startsAt: string;
  endsAt: string;
  professionalProfileId: string;
  professionalName: string;
  resourceIds: string[];
  remainingCapacity: number;
}

export interface SchedulerAvailabilityDto {
  branchId: string;
  serviceProfileId: string;
  date: string;
  timezone: string;
  intervalMinutes: 15;
  slots: SchedulerAvailabilitySlotDto[];
}

export interface SchedulerScheduleBlockWriteDto {
  branchId: string;
  professionalProfileId?: string | null;
  resourceId?: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  expectedVersion?: number;
}

export interface SchedulerScheduleBlockDto {
  id: string;
  branchId: string;
  branchProfileId: string;
  professionalProfileId: string | null;
  resourceId: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  reason: string;
  status: "ACTIVE" | "CANCELED";
  version: number;
  createdAt: string;
  canceledAt: string | null;
}

export const SCHEDULER_COMMISSION_TARGET_TYPES = [
  "DEFAULT",
  "PROFESSIONAL",
  "CATALOG_ITEM",
] as const;
export type SchedulerCommissionTargetType =
  (typeof SCHEDULER_COMMISSION_TARGET_TYPES)[number];

export const SCHEDULER_COMMISSION_MODES = [
  "APPOINTMENT",
  "ATTENDED_APPOINTMENT",
  "SALES_PERCENTAGE",
  "BRANCH_SALES_TIER",
] as const;
export type SchedulerCommissionMode =
  (typeof SCHEDULER_COMMISSION_MODES)[number];

export const SCHEDULER_COMMISSION_PERIODS = [
  "DAY",
  "WEEK",
  "FORTNIGHT",
  "MONTH",
] as const;
export type SchedulerCommissionPeriod =
  (typeof SCHEDULER_COMMISSION_PERIODS)[number];

export const SCHEDULER_GIFT_CARD_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
] as const;
export type SchedulerGiftCardStatus =
  (typeof SCHEDULER_GIFT_CARD_STATUSES)[number];
export type SchedulerGiftCardType = "SERVICE" | "AMOUNT";
export type SchedulerSettingScope = "COMMERCE" | "BRANCH" | "USER";

export const SCHEDULER_SETTING_SECTIONS = [
  "company",
  "website",
  "agenda",
  "payments",
  "reminders",
  "records",
  "emails",
  "integrations",
  "notifications",
  "clients",
  "surveys",
] as const;
export type SchedulerSettingSection =
  (typeof SCHEDULER_SETTING_SECTIONS)[number];

export interface SchedulerPackageProfileDto {
  id: string;
  posPackageId: string;
  commerceId: string;
  name: string;
  sku: string;
  price: string;
  posStatus: "DRAFT" | "PUBLISHED" | "INACTIVE";
  acceptsOnline: boolean;
  simultaneous: boolean;
  sessions: number;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  branchProfileIds: string[];
  serviceLines: Array<{
    serviceProfileId: string;
    serviceName: string;
    quantity: number;
    priceOverride: string | null;
    sortOrder: number;
  }>;
}

export interface SchedulerPackageProfileWriteDto {
  commerceId: string;
  acceptsOnline: boolean;
  simultaneous: boolean;
  sessions: number;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
  branchProfileIds: string[];
  serviceLines: Array<{
    serviceProfileId: string;
    quantity: number;
    priceOverride?: string | null;
    sortOrder: number;
  }>;
}

export interface SchedulerAddonProfileDto {
  id: string;
  catalogItemId: string;
  commerceId: string;
  name: string;
  sku: string;
  listPrice: string;
  durationMinutes: number;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  serviceProfileIds: string[];
}

export interface SchedulerAddonProfileWriteDto {
  commerceId: string;
  durationMinutes: number;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
  serviceProfileIds: string[];
}

export interface SchedulerClassScheduleDto {
  id: string;
  serviceProfileId: string;
  branchProfileId: string;
  professionalProfileId: string;
  weekday: SchedulerWeekday;
  startMinute: number;
  endMinute: number;
  capacity: number;
  active: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerClassSchedulesWriteDto {
  effectiveFrom?: string;
  schedules: Array<{
    branchProfileId: string;
    professionalProfileId: string;
    weekday: SchedulerWeekday;
    startMinute: number;
    endMinute: number;
    capacity: number;
  }>;
}

export interface SchedulerCommissionRuleWriteDto {
  mode: SchedulerCommissionMode;
  amount?: string | null;
  percentage?: string | null;
  tiers?: Array<{
    fromAmount: string;
    toAmount: string | null;
    percentage: string;
  }>;
}

export interface SchedulerCommissionPolicyWriteDto {
  commerceId: string;
  targetType: SchedulerCommissionTargetType;
  targetId?: string | null;
  period: SchedulerCommissionPeriod;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  expectedVersion?: number;
  rules: SchedulerCommissionRuleWriteDto[];
}

export interface SchedulerCommissionPolicyDto {
  id: string;
  commerceId: string;
  targetType: SchedulerCommissionTargetType;
  targetId: string | null;
  targetName: string;
  active: boolean;
  currentVersion: number;
  period: SchedulerCommissionPeriod;
  effectiveFrom: string;
  effectiveTo: string | null;
  payrollAuthority: "PAYROLL";
  rules: Array<{
    mode: SchedulerCommissionMode;
    amount: string | null;
    percentage: string | null;
    tiers: Array<{
      fromAmount: string;
      toAmount: string | null;
      percentage: string;
    }>;
  }>;
}

export interface SchedulerGiftCardTemplateWriteDto {
  commerceId: string;
  name: string;
  type: SchedulerGiftCardType;
  amount?: string | null;
  salePrice: string;
  validityDays: number;
  description?: string | null;
  designKey: string;
  status: SchedulerGiftCardStatus;
  serviceProfileIds: string[];
  expectedVersion?: number;
}

export interface SchedulerGiftCardTemplateDto extends Omit<
  SchedulerGiftCardTemplateWriteDto,
  "expectedVersion"
> {
  id: string;
  amount: string | null;
  description: string | null;
  version: number;
}

export interface SchedulerStatusColorDto {
  status: SchedulerAppointmentStatus;
  color: string;
  version: number;
}

export interface SchedulerStatusColorsWriteDto {
  authorizationToken: string;
  expectedVersions: Partial<Record<SchedulerAppointmentStatus, number>>;
  colors: Array<{ status: SchedulerAppointmentStatus; color: string }>;
}

export interface SchedulerSettingWriteDto {
  scope: SchedulerSettingScope;
  commerceId: string;
  branchProfileId?: string | null;
  document: Record<string, unknown>;
  expectedVersion?: number;
}

export interface SchedulerResolvedSettingDto {
  section: SchedulerSettingSection;
  precedence: readonly ["COMMERCE", "BRANCH", "USER"];
  document: Record<string, unknown>;
  layers: Array<{
    scope: SchedulerSettingScope;
    scopeReferenceId: string;
    version: number;
  }>;
}

export interface SchedulerPosReferencesDto {
  source: "POS";
  readOnly: true;
  paymentMethods: Array<{
    id: string;
    name: string;
    type: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO";
    requiresReference: boolean;
    referenceLabel: string | null;
    minAmount: string | null;
    maxAmount: string | null;
  }>;
  ticketConfigurations: Array<{
    id: string;
    branchId: string | null;
    companyName: string;
    policies: string | null;
    footerMessage: string | null;
    showVatBreakdown: boolean;
  }>;
  policies: Array<{
    id: string;
    name: string;
    description: string | null;
    requiresCustomer: boolean;
    requiresAuthorization: boolean;
  }>;
  packages: Array<{
    id: string;
    name: string;
    sku: string;
    price: string;
    status: "DRAFT" | "PUBLISHED" | "INACTIVE";
  }>;
}

export interface SchedulerAdministrationCatalogDto {
  packages: SchedulerPackageProfileDto[];
  addons: SchedulerAddonProfileDto[];
  classSchedules: SchedulerClassScheduleDto[];
  commissionPolicies: SchedulerCommissionPolicyDto[];
  giftCards: SchedulerGiftCardTemplateDto[];
  statusColors: Array<{
    commerceId: string;
    colors: SchedulerStatusColorDto[];
  }>;
}

export const SCHEDULER_CUSTOMER_CONTACT_PREFERENCES = [
  "PHONE",
  "WHATSAPP",
  "EMAIL",
  "NONE",
] as const;
export type SchedulerCustomerContactPreference =
  (typeof SCHEDULER_CUSTOMER_CONTACT_PREFERENCES)[number];

export const SCHEDULER_CUSTOMER_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "SELECT",
] as const;
export type SchedulerCustomerFieldType =
  (typeof SCHEDULER_CUSTOMER_FIELD_TYPES)[number];

export interface SchedulerCustomerSourceDto {
  id: string;
  name: string;
  active: boolean;
  companyOwnedByDefault: boolean;
}

export interface SchedulerCustomerPortfolioDto {
  id: string;
  branchId: string | null;
  branchName: string | null;
  employeeId: string | null;
  ownerName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerCustomerSummaryDto {
  id: string;
  displayName: string;
  preferredName: string | null;
  phone: string | null;
  email: string | null;
  source: SchedulerCustomerSourceDto | null;
  active: boolean;
  version: number;
  aliases: string[];
  currentPortfolios: SchedulerCustomerPortfolioDto[];
}

export interface SchedulerCustomerFieldDefinitionDto {
  id: string;
  commerceId: string;
  key: string;
  label: string;
  type: SchedulerCustomerFieldType;
  options: string[] | null;
  required: boolean;
  active: boolean;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface SchedulerCustomerFieldValueDto {
  definitionId: string;
  definitionVersion: number;
  key: string;
  label: string;
  type: SchedulerCustomerFieldType;
  value: unknown;
}

export interface SchedulerCustomerDetailDto extends SchedulerCustomerSummaryDto {
  notes: string | null;
  profile: {
    preferredLocale: string;
    contactPreference: SchedulerCustomerContactPreference;
    notes: string | null;
    version: number;
  } | null;
  emails: Array<{
    email: string;
    isPrimary: boolean;
    verifiedAt: string | null;
  }>;
  customFields: SchedulerCustomerFieldValueDto[];
  mergeHistory: Array<{
    id: string;
    sourceCustomerId: string;
    targetCustomerId: string;
    reason: string;
    createdAt: string;
  }>;
}

export interface SchedulerCustomerSearchRequest {
  query: string;
  page?: number;
  pageSize?: number;
  branchId?: string;
}

export interface SchedulerCustomerPageDto {
  items: SchedulerCustomerSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SchedulerCustomerWriteDto {
  displayName: string;
  phone?: string | null;
  email?: string | null;
  sourceId?: string | null;
  branchId: string;
  notes?: string | null;
  active?: boolean;
  expectedVersion?: number;
  profile?: {
    preferredName?: string | null;
    preferredLocale?: string;
    contactPreference?: SchedulerCustomerContactPreference;
    notes?: string | null;
  };
  aliases?: string[];
  alternateEmails?: string[];
  customFields?: Array<{ definitionId: string; value: unknown }>;
}

export interface SchedulerCustomerMergeRequestDto {
  sourceCustomerId: string;
  targetCustomerId: string;
  expectedSourceVersion: number;
  expectedTargetVersion: number;
  reason: string;
  authorizationToken: string;
}

export interface SchedulerCustomerMergeResultDto {
  mergeEventId: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  targetVersion: number;
  reassignedRelations: Record<string, number>;
}

export interface SchedulerCustomerVisitHistoryDto {
  items: Array<{
    id: string;
    origin: "SCHEDULER_APPOINTMENT" | "POS_APPOINTMENT";
    branchId: string;
    branchName: string;
    serviceName: string;
    status: string;
    scheduledAt: string | null;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
  legacyRegistroCitaLinked: false;
}

export interface SchedulerCustomerFinancialHistoryDto {
  items: Array<{
    ticketId: string;
    folio: string;
    branchId: string;
    branchName: string;
    businessDate: string;
    status: string;
    settlementStatus: string;
    total: string;
    amountPaid: string;
    pendingAmount: string;
    payments: Array<{
      operationId: string;
      operationKind: string;
      operationFolio: string;
      method: string;
      amount: string;
      createdAt: string;
    }>;
  }>;
  page: number;
  pageSize: number;
  total: number;
  authority: "POS_READ_ONLY";
}

export interface SchedulerCustomerFieldDefinitionWriteDto {
  commerceId: string;
  key: string;
  label: string;
  type: SchedulerCustomerFieldType;
  options?: string[] | null;
  required?: boolean;
  active?: boolean;
  expectedVersion?: number;
}
