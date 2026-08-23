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

export interface SchedulerAccessProfile {
  id: string;
  name: string;
  allowedCommerceIds: string[];
  allowedBranchIds: string[];
  allowedProfessionalIds: string[] | null;
  allowedScreenIds: SchedulerScreenId[];
}

export type SchedulerFinancialRole = "master" | "admin" | "seller";

export interface SchedulerFinancialProfile {
  id: string;
  name: string;
  role: SchedulerFinancialRole;
  personalCode: string;
  assignedClientIds: string[] | null;
}

export type SchedulerFinancialAuditAction = "view" | "create" | "update" | "delete";

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

/**
 * Códigos mock para demostrar el flujo. En producción deben validarse en el
 * backend y nunca distribuirse dentro del bundle del navegador.
 */
export const schedulerFinancialProfiles: SchedulerFinancialProfile[] = [
  {
    id: "financial-master",
    name: "Master Keysar",
    role: "master",
    personalCode: "9001",
    assignedClientIds: null,
  },
  {
    id: "scheduler-admin",
    name: "Administrador de agenda",
    role: "admin",
    personalCode: "2468",
    assignedClientIds: null,
  },
  {
    id: "seller-valeria",
    name: "Valeria Hernández",
    role: "seller",
    personalCode: "1357",
    assignedClientIds: ["client-patricia-delgado", "client-yumi-hirasawa"],
  },
  {
    id: "seller-mariana",
    name: "Mariana Ortega",
    role: "seller",
    personalCode: "8642",
    assignedClientIds: ["client-maria-camila", "client-adriana-acosta"],
  },
];

export function getSchedulerClientAccessKey(clientId: string | undefined, phone: string): string {
  return clientId ?? `phone:${phone.replace(/\D/g, "").slice(-10)}`;
}

export function authorizeSchedulerFinancialProfile(
  personalCode: string,
  clientId: string | undefined,
): { profile?: SchedulerFinancialProfile; error?: string } {
  const profile = schedulerFinancialProfiles.find(
    (candidate) => candidate.personalCode === personalCode.trim(),
  );

  if (!profile) return { error: "El código de autorización no es válido." };
  if (
    profile.assignedClientIds !== null &&
    (!clientId || !profile.assignedClientIds.includes(clientId))
  ) {
    return { error: "Este cliente no está asignado al perfil autorizado." };
  }

  return { profile };
}

export function canManageSchedulerPaymentHistory(
  profile: SchedulerFinancialProfile | undefined,
): boolean {
  return profile?.role === "master" || profile?.role === "admin";
}

/**
 * Perfil mock de la sesión actual. La persistencia y los roles reales se
 * incorporarán cuando Scheduler se conecte al backend.
 */
export const currentSchedulerAccess: SchedulerAccessProfile = {
  id: "scheduler-admin",
  name: "Administrador de agenda",
  allowedCommerceIds: ["opatra-mexico", "keysar-cosmetics"],
  allowedBranchIds: [
    "galerias-insurgentes",
    "mitikah",
    "masaryk",
    "keysar-reforma",
    "keysar-polanco",
  ],
  allowedProfessionalIds: null,
  allowedScreenIds: [
    "agenda",
    "clients",
    "services",
    "reports.summary",
    "reports.reservations",
    "administration.locals",
    "administration.professionals",
    "administration.services",
    "administration.commissions",
    "administration.resources",
    "administration.surveys",
    "administration.consents",
    "administration.whatsapp",
    "administration.gift-cards",
    "administration.status-colors",
  ],
};

export function canAccessSchedulerScreen(screenId: SchedulerScreenId): boolean {
  return currentSchedulerAccess.allowedScreenIds.includes(screenId);
}

export function canAccessSchedulerCommerce(commerceId: string): boolean {
  return currentSchedulerAccess.allowedCommerceIds.includes(commerceId);
}

export function canAccessSchedulerBranch(branchId: string): boolean {
  return currentSchedulerAccess.allowedBranchIds.includes(branchId);
}

export function canAccessSchedulerProfessional(professionalId: string): boolean {
  return (
    currentSchedulerAccess.allowedProfessionalIds === null ||
    currentSchedulerAccess.allowedProfessionalIds.includes(professionalId)
  );
}
