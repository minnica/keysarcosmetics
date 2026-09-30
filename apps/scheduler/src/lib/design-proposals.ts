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
  listAuthorizationAgents: unavailable,
  saveAuthorizationAgent: unavailable,
  authorizeOperation: unavailable,
  commitOperation: unavailable,
  listMovements: unavailable,
  searchCustomersAdvanced: unavailable,
  appointmentAnswers: unavailable,
  saveAppointmentAnswers: unavailable,
  appointmentCabinVisit: unavailable,
  saveAppointmentCabinVisit: unavailable,
};
