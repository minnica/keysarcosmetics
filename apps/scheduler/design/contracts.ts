import type {
  SchedulerAppointmentStatus,
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerSummaryDto,
} from "@cosmetics/types";

export type DesignOperationPurpose =
  | "APPOINTMENT_CREATE"
  | "APPOINTMENT_UPDATE"
  | "APPOINTMENT_MOVE"
  | "APPOINTMENT_STATUS_CHANGE"
  | "APPOINTMENT_CANCEL"
  | "SCHEDULE_BLOCK_CREATE"
  | "SCHEDULE_BLOCK_UPDATE"
  | "SCHEDULE_BLOCK_DELETE"
  | "CUSTOMER_UPDATE"
  | "PURCHASE_CAPTURE"
  | "PURCHASE_CORRECTION"
  | "APPOINTMENT_COMMENT_CREATE"
  | "POST_SALE_COMMENT_CREATE";

export type DesignOperationAgentSource = "SCHEDULER" | "POS_CRM";

export type DesignAuthorizationScopeKey =
  | `STATUS:${SchedulerAppointmentStatus}`
  | "PURCHASE_CAPTURE"
  | "PURCHASE_CORRECTION";

export interface DesignAuthorizationRoleOption {
  id: string;
  label: string;
  source: DesignOperationAgentSource;
  activeAgents: number;
}

export interface DesignAuthorizationPolicyRule {
  scopeKey: DesignAuthorizationScopeKey;
  label: string;
  kind: "STATUS" | "PURCHASE";
  roleIds: string[];
}

export interface DesignAuthorizationPolicy {
  roles: DesignAuthorizationRoleOption[];
  rules: DesignAuthorizationPolicyRule[];
  version: number;
  updatedAt: string;
}

export interface DesignDemoAccountOption {
  email: string;
  name: string;
  access: string;
  code: string;
}

export interface DesignOperationAgent {
  id: string;
  externalId: string;
  name: string;
  role: string;
  source: DesignOperationAgentSource;
  active: boolean;
  codeConfigured: boolean;
  canAuthorizePurchases: boolean;
  allowedPurposes: DesignOperationPurpose[];
  updatedAt: string;
}

export interface DesignOperationGrant {
  token: string;
  purpose: DesignOperationPurpose;
  scopeKey: DesignAuthorizationScopeKey | null;
  expiresAt: string;
  actor: Pick<DesignOperationAgent, "id" | "name" | "role" | "source">;
}

export interface DesignAppointmentAnswer {
  definitionId: string;
  value: string | number | boolean;
}

export interface DesignStatusDefinition {
  id: string;
  commerceId: string;
  key: string;
  canonicalStatus: SchedulerAppointmentStatus | null;
  label: string;
  color: string;
  active: boolean;
  visibleInAgenda: boolean;
  system: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignStatusDefinitionRevision extends DesignStatusDefinition {
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface DesignStatusCatalog {
  items: DesignStatusDefinition[];
  revisions: DesignStatusDefinitionRevision[];
}

export type DesignBranchCommercialMode = "POS_LINKED" | "SCHEDULER_STANDALONE";

export interface DesignBranchCommercialModel {
  id: string;
  branchProfileId: string;
  branchId: string;
  branchName: string;
  commerceId: string;
  mode: DesignBranchCommercialMode;
  posBranchId: string | null;
  cabinCount: number;
  cabinCapacity: number;
  branchMonthlyAmount: number | null;
  cabinMonthlyAmount: number | null;
  estimatedMonthlyAmount: number | null;
  currency: "MXN";
  updatedAt: string;
}

export interface DesignBranchCommercialModelInput {
  id?: string;
  commerceId: string;
  mode: DesignBranchCommercialMode;
  posBranchId?: string;
  branchName?: string;
  timezone: string;
  cabinCount: number;
  cabinCapacity: number;
  branchMonthlyAmount?: number;
  cabinMonthlyAmount?: number;
}

export type DesignPurchaseKind = "NONE" | "FULL" | "LAYAWAY" | null;
export type DesignSaleSettlementStatus = "NOT_APPLICABLE" | "OPEN" | "PAID";

export interface DesignCabinVisitPerson {
  id: string;
  customerId: string | null;
  name: string;
  specialistProfileId: string;
  purchased: boolean | null;
  purchaseAmount: number | null;
  purchaseKind: DesignPurchaseKind;
  saleAmount: number | null;
  depositAmount: number | null;
  saleOwnerSpecialistProfileId: string | null;
  settlementStatus: DesignSaleSettlementStatus;
  settledAt: string | null;
}

export type DesignCabinVisitPersonInput = Omit<
  DesignCabinVisitPerson,
  "saleOwnerSpecialistProfileId" | "settlementStatus" | "settledAt"
>;

export interface DesignAppointmentCabinVisit {
  appointmentId: string;
  cabinResourceId: string;
  cabinName: string;
  cabinCapacity: number;
  representativeId: string;
  representativeName: string;
  representativeRole: string;
  representativeSource: DesignOperationAgentSource;
  visitors: DesignCabinVisitPerson[];
  updatedAt: string;
}

export interface DesignAppointmentContext {
  appointmentId: string;
  representativeId: string | null;
  representativeName: string | null;
  representativeRole: string | null;
  representativeSource: DesignOperationAgentSource | null;
  portfolioSellerName: string | null;
  hasPurchase: boolean;
  purchaseKind: DesignPurchaseKind | null;
  saleAmount: number;
  depositAmount: number;
  nextAppointmentId: string | null;
  nextAppointmentAt: string | null;
}

export type DesignAppointmentJournalKind =
  | "SELLER_COMMENT"
  | "POST_SALE_COMMENT"
  | "CANCELLATION_REASON"
  | "RESCHEDULE_REASON";

export interface DesignAppointmentJournalEntry {
  id: string;
  appointmentId: string;
  kind: DesignAppointmentJournalKind;
  comment: string;
  categoryId: string | null;
  categoryLabel: string | null;
  categoryVersion: number | null;
  tentativeDate: string | null;
  actorId: string;
  actorName: string;
  actorRole: string;
  customerId: string;
  customerName: string;
  branchId: string;
  branchName: string;
  serviceNames: string[];
  appointmentStartsAt: string;
  appointmentStatus: SchedulerAppointmentStatus;
  createdAt: string;
}

export interface DesignAppointmentJournalFilters {
  dateFrom: string;
  dateTo: string;
  branchIds: string[];
  kinds: DesignAppointmentJournalKind[];
  query?: string;
}

export interface DesignAppointmentJournalReport {
  generatedAt: string;
  filters: DesignAppointmentJournalFilters;
  summary: {
    appointments: number;
    entries: number;
    sellerComments: number;
    postSaleComments: number;
    cancellations: number;
    reschedules: number;
  };
  rows: DesignAppointmentJournalEntry[];
}

export interface DesignCustomerSpecialistPreference {
  customerId: string;
  specialistProfileId: string;
  specialistName: string;
  updatedAt: string;
}

export interface DesignCabinSalesReportFilters {
  dateFrom: string;
  dateTo: string;
  branchIds: string[];
  cabinResourceId?: string;
  status?: SchedulerAppointmentStatus;
  purchaseKind?: Exclude<DesignPurchaseKind, null>;
  serviceProfileId?: string;
  specialistProfileId?: string;
  sellerName?: string;
  minSaleAmount?: number;
  maxSaleAmount?: number;
  query?: string;
}

export interface DesignCabinSalesReportRow {
  appointmentId: string;
  visitorId: string;
  appointmentCreatedAt: string;
  confirmedAt: string | null;
  appointmentStartsAt: string;
  appointmentEndsAt: string;
  branchId: string;
  branchName: string;
  cabinResourceId: string;
  cabinName: string;
  cabinCapacity: number;
  customerId: string;
  customerName: string;
  visitorName: string;
  serviceProfileIds: string[];
  serviceNames: string[];
  sellerName: string;
  representativeName: string;
  representativeSource: DesignOperationAgentSource;
  nextAppointmentAt: string | null;
  specialistProfileId: string;
  specialistName: string;
  attendingSpecialistProfileId: string;
  attendingSpecialistName: string;
  saleOwnerSpecialistProfileId: string | null;
  saleOwnerSpecialistName: string;
  settlementStatus: DesignSaleSettlementStatus;
  settledAt: string | null;
  purchaseKind: Exclude<DesignPurchaseKind, null>;
  saleAmount: number;
  depositAmount: number;
  balanceAmount: number;
  notes: string;
  status: SchedulerAppointmentStatus;
  origin: string;
  cancellationReason: string;
  updatedAt: string;
}

export interface DesignCabinSalesReportBreakdown {
  key: string;
  label: string;
  appointments: number;
  visitors: number;
  buyers: number;
  saleAmount: number;
  depositAmount: number;
  balanceAmount: number;
}

export interface DesignCabinSalesSpecialistBreakdown extends DesignCabinSalesReportBreakdown {
  branchId: string;
  branchName: string;
  specialistProfileId: string;
  specialistName: string;
  conversionRate: number;
}

export interface DesignCabinServiceAnalytics {
  serviceProfileId: string;
  serviceName: string;
  appointments: number;
  attended: number;
  canceled: number;
  noShow: number;
  attendanceRate: number;
  cancellationRate: number;
}

export interface DesignCabinSalesFilterOptions {
  cabins: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  specialists: Array<{ id: string; name: string }>;
  sellers: string[];
}

export interface DesignCabinSalesReport {
  generatedAt: string;
  filters: DesignCabinSalesReportFilters;
  summary: {
    branches: number;
    cabins: number;
    appointments: number;
    visitors: number;
    buyers: number;
    fullSales: number;
    layaways: number;
    saleAmount: number;
    depositAmount: number;
    balanceAmount: number;
    conversionRate: number;
    appointmentsWithoutNextVisit: number;
  };
  byBranch: DesignCabinSalesReportBreakdown[];
  byCabin: DesignCabinSalesReportBreakdown[];
  byDay: DesignCabinSalesReportBreakdown[];
  byWeek: DesignCabinSalesReportBreakdown[];
  byMonth: DesignCabinSalesReportBreakdown[];
  bySpecialist: DesignCabinSalesSpecialistBreakdown[];
  serviceAnalytics: DesignCabinServiceAnalytics[];
  filterOptions: DesignCabinSalesFilterOptions;
  rows: DesignCabinSalesReportRow[];
}

export interface DesignSalesProjectionFilters {
  targetMonth: string;
  branchIds: string[];
  lookbackMonths: number;
}

export interface DesignMonthlyProjectionPoint {
  month: string;
  label: string;
  saleAmount: number;
  depositAmount: number;
  balanceAmount: number;
  buyers: number;
}

export interface DesignBranchProjection {
  branchId: string;
  branchName: string;
  historicalAverage: number;
  previousMonth: number;
  projectedAmount: number;
  changePercent: number;
}

export interface DesignSalesProjectionReport {
  generatedAt: string;
  filters: DesignSalesProjectionFilters;
  summary: {
    historicalAverage: number;
    previousMonth: number;
    projectedAmount: number;
    actualToDate: number;
    changePercent: number;
    monthsWithData: number;
    confidenceLabel: "BAJA" | "MEDIA" | "ALTA";
  };
  historical: DesignMonthlyProjectionPoint[];
  byBranch: DesignBranchProjection[];
  methodology: string;
}

export interface DesignMovementRecord {
  id: string;
  actorId: string;
  actor: string;
  actorRole: string;
  actorSource: DesignOperationAgentSource | "SESSION";
  action: string;
  purpose: DesignOperationPurpose | "SYSTEM_WRITE";
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface DesignQuestionConfiguration {
  definitions: SchedulerCustomerFieldDefinitionDto[];
  appliesTo: readonly ["CUSTOMER", "APPOINTMENT"];
}

export interface DesignCustomerAdvancedFilters {
  query: string;
  branchIds: string[];
  sourceId?: string;
  noAppointmentWithinDays?: number;
  appointmentStatuses: SchedulerAppointmentStatus[];
  serviceProfileIds: string[];
  birthdayMonth?: number;
  sellerNames: string[];
  customFields: Array<{ definitionId: string; value: string }>;
  page: number;
  pageSize: number;
}

export interface DesignCustomerAgendaInsights {
  appointmentCount: number;
  attendedCount: number;
  canceledCount: number;
  noShowCount: number;
  lastAppointmentAt: string | null;
}

export interface DesignCustomerAdvancedResult extends SchedulerCustomerSummaryDto {
  agenda: DesignCustomerAgendaInsights;
}

export interface DesignCustomerAdvancedPage {
  items: DesignCustomerAdvancedResult[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DesignProposalClient {
  available: boolean;
  listBranchCommercialModels(): Promise<DesignBranchCommercialModel[]>;
  saveBranchCommercialModel(
    input: DesignBranchCommercialModelInput,
  ): Promise<DesignBranchCommercialModel>;
  listAuthorizationAgents(): Promise<DesignOperationAgent[]>;
  saveAuthorizationAgent(input: {
    id?: string;
    externalId: string;
    name: string;
    role: string;
    source: DesignOperationAgentSource;
    active: boolean;
    code?: string;
    allowedPurposes: DesignOperationPurpose[];
  }): Promise<DesignOperationAgent>;
  authorizationPolicy(): Promise<DesignAuthorizationPolicy>;
  saveAuthorizationPolicy(input: {
    rules: Array<Pick<DesignAuthorizationPolicyRule, "scopeKey" | "roleIds">>;
    expectedVersion: number;
  }): Promise<DesignAuthorizationPolicy>;
  authorizeOperation(input: {
    code: string;
    purpose: DesignOperationPurpose;
    scopeKey?: DesignAuthorizationScopeKey;
    targetType: string;
    targetId?: string;
  }): Promise<DesignOperationGrant>;
  commitOperation(input: {
    token: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, string>;
  }): Promise<DesignMovementRecord>;
  listMovements(): Promise<DesignMovementRecord[]>;
  statusDefinitions(commerceId: string): Promise<DesignStatusCatalog>;
  saveStatusDefinition(input: {
    id?: string;
    commerceId: string;
    label: string;
    color: string;
    active: boolean;
    visibleInAgenda: boolean;
    expectedVersion?: number;
    authorizationToken: string;
  }): Promise<DesignStatusDefinition>;
  searchCustomersAdvanced(
    input: DesignCustomerAdvancedFilters,
  ): Promise<DesignCustomerAdvancedPage>;
  appointmentAnswers(appointmentId: string): Promise<DesignAppointmentAnswer[]>;
  saveAppointmentAnswers(
    appointmentId: string,
    answers: DesignAppointmentAnswer[],
  ): Promise<DesignAppointmentAnswer[]>;
  appointmentCabinVisit(
    appointmentId: string,
  ): Promise<DesignAppointmentCabinVisit | null>;
  appointmentContexts(
    appointmentIds: string[],
  ): Promise<Record<string, DesignAppointmentContext>>;
  saveAppointmentCabinVisit(
    appointmentId: string,
    input: {
      cabinResourceId: string;
      cabinCapacity: number;
      representativeId: string;
      visitors: DesignCabinVisitPersonInput[];
    },
    authorizationToken?: string,
  ): Promise<DesignAppointmentCabinVisit>;
  appointmentJournal(
    appointmentId: string,
  ): Promise<DesignAppointmentJournalEntry[]>;
  addAppointmentJournalEntry(
    appointmentId: string,
    input: {
      kind: DesignAppointmentJournalKind;
      comment: string;
      categoryId?: string;
      categoryLabel?: string;
      categoryVersion?: number;
      tentativeDate?: string;
      authorizationToken: string;
    },
  ): Promise<DesignAppointmentJournalEntry>;
  appointmentJournalReport(
    input: DesignAppointmentJournalFilters,
  ): Promise<DesignAppointmentJournalReport>;
  customerSpecialistPreference(
    customerId: string,
  ): Promise<DesignCustomerSpecialistPreference | null>;
  saveCustomerSpecialistPreference(
    customerId: string,
    specialistProfileId: string | null,
  ): Promise<DesignCustomerSpecialistPreference | null>;
  cabinSalesReport(
    input: DesignCabinSalesReportFilters,
  ): Promise<DesignCabinSalesReport>;
  salesProjectionReport(
    input: DesignSalesProjectionFilters,
  ): Promise<DesignSalesProjectionReport>;
}
