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
  | "CUSTOMER_UPDATE";

export type DesignOperationAgentSource = "SCHEDULER" | "POS_CRM";

export interface DesignOperationAgent {
  id: string;
  externalId: string;
  name: string;
  role: string;
  source: DesignOperationAgentSource;
  active: boolean;
  codeConfigured: boolean;
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

export interface DesignCustomerAdvancedResult
  extends SchedulerCustomerSummaryDto {
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
}
