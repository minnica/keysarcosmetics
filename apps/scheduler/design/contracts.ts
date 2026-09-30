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
  | "PURCHASE_CAPTURE";

export type DesignOperationAgentSource = "SCHEDULER" | "POS_CRM";

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
  expiresAt: string;
  actor: Pick<DesignOperationAgent, "id" | "name" | "role" | "source">;
}

export interface DesignAppointmentAnswer {
  definitionId: string;
  value: string | number | boolean;
}

export type DesignPurchaseKind = "NONE" | "FULL" | "LAYAWAY" | null;

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
}

export interface DesignAppointmentCabinVisit {
  appointmentId: string;
  cabinResourceId: string;
  cabinName: string;
  cabinCapacity: number;
  visitors: DesignCabinVisitPerson[];
  updatedAt: string;
}

export interface DesignCabinSalesReportFilters {
  dateFrom: string;
  dateTo: string;
  branchIds: string[];
  cabinResourceId?: string;
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
  serviceNames: string[];
  sellerName: string;
  specialistProfileId: string;
  specialistName: string;
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

export interface DesignCabinSalesReport {
  generatedAt: string;
  filters: DesignCabinSalesReportFilters;
  summary: {
    appointments: number;
    visitors: number;
    buyers: number;
    fullSales: number;
    layaways: number;
    saleAmount: number;
    depositAmount: number;
    balanceAmount: number;
    conversionRate: number;
  };
  byCabin: DesignCabinSalesReportBreakdown[];
  byDay: DesignCabinSalesReportBreakdown[];
  rows: DesignCabinSalesReportRow[];
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
  authorizeOperation(input: {
    code: string;
    purpose: DesignOperationPurpose;
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
  saveAppointmentCabinVisit(
    appointmentId: string,
    input: Omit<
      DesignAppointmentCabinVisit,
      "appointmentId" | "cabinName" | "updatedAt"
    >,
    authorizationToken?: string,
  ): Promise<DesignAppointmentCabinVisit>;
  cabinSalesReport(
    input: DesignCabinSalesReportFilters,
  ): Promise<DesignCabinSalesReport>;
}
