import type {
  DesignDemoAccountOption,
  DesignProposalClient,
} from "../../design/contracts";

const unavailable = async <T>(): Promise<T> => {
  throw new Error(
    "Esta propuesta sólo está disponible en el entorno funcional de diseño.",
  );
};

export const schedulerDesignDemoAccounts: readonly DesignDemoAccountOption[] =
  [];

export const schedulerDesignProposals: DesignProposalClient = {
  available: false,
  listBranchCommercialModels: unavailable,
  saveBranchCommercialModel: unavailable,
  listAuthorizationAgents: unavailable,
  saveAuthorizationAgent: unavailable,
  authorizationPolicy: unavailable,
  saveAuthorizationPolicy: unavailable,
  authorizeOperation: unavailable,
  commitOperation: unavailable,
  listMovements: unavailable,
  statusDefinitions: unavailable,
  saveStatusDefinition: unavailable,
  searchCustomersAdvanced: unavailable,
  appointmentAnswers: unavailable,
  saveAppointmentAnswers: unavailable,
  appointmentCabinVisit: unavailable,
  appointmentContexts: unavailable,
  customerOpenLayaways: unavailable,
  applyLayawayPayment: unavailable,
  saveAppointmentCabinVisit: unavailable,
  appointmentJournal: unavailable,
  addAppointmentJournalEntry: unavailable,
  appointmentJournalReport: unavailable,
  customerSpecialistPreference: unavailable,
  saveCustomerSpecialistPreference: unavailable,
  cabinSalesReport: unavailable,
  salesProjectionReport: unavailable,
};
