import type {
  DesignAppointmentAnswer,
  DesignAppointmentCabinVisit,
  DesignAppointmentJournalEntry,
  DesignAppointmentJournalReport,
  DesignBranchCommercialModel,
  DesignCabinSalesReport,
  DesignSalesProjectionReport,
  DesignCustomerAdvancedPage,
  DesignCustomerSpecialistPreference,
  DesignDemoAccountOption,
  DesignMovementRecord,
  DesignOperationAgent,
  DesignOperationGrant,
  DesignProposalClient,
  DesignStatusCatalog,
  DesignStatusDefinition,
} from "./contracts";
import { designDemoAccounts } from "./store";

const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export const schedulerDesignDemoAccounts: readonly DesignDemoAccountOption[] =
  designDemoAccounts.map((account) => ({
    email: account.email,
    name: account.name,
    access: account.accessLabel,
    code: account.authorizationCode,
  }));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("auth_token");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: T;
    message?: string;
  };
  if (!response.ok || !payload.success) {
    throw new Error(
      payload.message ?? "No fue posible completar la propuesta.",
    );
  }
  return payload.data as T;
}

export const schedulerDesignProposals: DesignProposalClient = {
  available: true,
  listBranchCommercialModels: () =>
    request<DesignBranchCommercialModel[]>(
      "/api/scheduler/design-proposals/branch-commercial-models",
    ),
  saveBranchCommercialModel: (input) =>
    request<DesignBranchCommercialModel>(
      "/api/scheduler/design-proposals/branch-commercial-models",
      { method: "POST", body: JSON.stringify(input) },
    ),
  listAuthorizationAgents: () =>
    request<DesignOperationAgent[]>(
      "/api/scheduler/design-proposals/authorization-agents",
    ),
  saveAuthorizationAgent: (input) =>
    request<DesignOperationAgent>(
      `/api/scheduler/design-proposals/authorization-agents${input.id ? `/${input.id}` : ""}`,
      { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) },
    ),
  authorizeOperation: (input) =>
    request<DesignOperationGrant>(
      "/api/scheduler/design-proposals/operation-authorizations",
      { method: "POST", body: JSON.stringify(input) },
    ),
  commitOperation: (input) =>
    request<DesignMovementRecord>(
      "/api/scheduler/design-proposals/operation-authorizations/commit",
      { method: "POST", body: JSON.stringify(input) },
    ),
  listMovements: () =>
    request<DesignMovementRecord[]>(
      "/api/scheduler/design-proposals/movements",
    ),
  statusDefinitions: (commerceId) =>
    request<DesignStatusCatalog>(
      `/api/scheduler/design-proposals/status-definitions?commerceId=${encodeURIComponent(commerceId)}`,
    ),
  saveStatusDefinition: (input) =>
    request<DesignStatusDefinition>(
      `/api/scheduler/design-proposals/status-definitions${input.id ? `/${input.id}` : ""}`,
      {
        method: input.id ? "PUT" : "POST",
        body: JSON.stringify(input),
      },
    ),
  searchCustomersAdvanced: (input) =>
    request<DesignCustomerAdvancedPage>(
      "/api/scheduler/design-proposals/customers/advanced-search",
      { method: "POST", body: JSON.stringify(input) },
    ),
  appointmentAnswers: (appointmentId) =>
    request<DesignAppointmentAnswer[]>(
      `/api/scheduler/design-proposals/appointments/${appointmentId}/answers`,
    ),
  saveAppointmentAnswers: (appointmentId, answers) =>
    request<DesignAppointmentAnswer[]>(
      `/api/scheduler/design-proposals/appointments/${appointmentId}/answers`,
      { method: "PUT", body: JSON.stringify({ answers }) },
    ),
  appointmentCabinVisit: (appointmentId) =>
    request<DesignAppointmentCabinVisit | null>(
      `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
    ),
  saveAppointmentCabinVisit: (appointmentId, input, authorizationToken) =>
    request<DesignAppointmentCabinVisit>(
      `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
      {
        method: "PUT",
        body: JSON.stringify(input),
        ...(authorizationToken
          ? {
              headers: {
                "x-design-operation-authorization": authorizationToken,
              },
            }
          : {}),
      },
    ),
  appointmentJournal: (appointmentId) =>
    request<DesignAppointmentJournalEntry[]>(
      `/api/scheduler/design-proposals/appointments/${appointmentId}/journal`,
    ),
  addAppointmentJournalEntry: (appointmentId, input) =>
    request<DesignAppointmentJournalEntry>(
      `/api/scheduler/design-proposals/appointments/${appointmentId}/journal`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  appointmentJournalReport: (input) =>
    request<DesignAppointmentJournalReport>(
      "/api/scheduler/design-proposals/reports/appointment-journal",
      { method: "POST", body: JSON.stringify(input) },
    ),
  customerSpecialistPreference: (customerId) =>
    request<DesignCustomerSpecialistPreference | null>(
      `/api/scheduler/design-proposals/customers/${customerId}/specialist-preference`,
    ),
  saveCustomerSpecialistPreference: (customerId, specialistProfileId) =>
    request<DesignCustomerSpecialistPreference | null>(
      `/api/scheduler/design-proposals/customers/${customerId}/specialist-preference`,
      {
        method: "PUT",
        body: JSON.stringify({ specialistProfileId }),
      },
    ),
  cabinSalesReport: (input) =>
    request<DesignCabinSalesReport>(
      "/api/scheduler/design-proposals/reports/cabin-sales",
      { method: "POST", body: JSON.stringify(input) },
    ),
  salesProjectionReport: (input) =>
    request<DesignSalesProjectionReport>(
      "/api/scheduler/design-proposals/reports/sales-projections",
      { method: "POST", body: JSON.stringify(input) },
    ),
};
