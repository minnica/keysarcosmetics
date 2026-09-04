import { createPosApiClient } from "@cosmetics/api-client";
import type {
  PosAccessBootstrapDto,
  PosPermissionKey,
  PosOfflineBootstrapDto,
  PosSessionDto,
} from "@cosmetics/types";
import type {
  EmployeeConfigurationPermission,
  EmployeeRole,
  PosSessionUser,
  ScreenId,
  Seller,
} from "../types";
import { authenticateBrowserOffline } from "./pos-offline";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const posApi = createPosApiClient(apiUrl);
export const posApiEnabled = import.meta.env.VITE_POS_DATA_MODE !== "mock";

export interface PosLoginResult {
  session: PosSessionDto;
  offline: boolean;
  bootstrap: PosOfflineBootstrapDto | null;
}

export async function loginPos(alias: string, pin: string): Promise<PosLoginResult> {
  if (!window.electronAPI?.posLogin) {
    const bootstrap = await authenticateBrowserOffline(alias, pin);
    if (!bootstrap) {
      throw new Error("No existe una credencial offline vigente en este navegador.");
    }
    window.sessionStorage.removeItem("pos_access_token");
    return {
      session: { ...bootstrap.session, accessToken: "" },
      offline: true,
      bootstrap,
    };
  }
  const result = await window.electronAPI.posLogin({ alias, pin });
  if (result.status < 200 || result.status >= 300 || !result.body.success) {
    throw new Error(result.body.message);
  }
  if (result.body.data.accessToken) {
    window.sessionStorage.setItem("pos_access_token", result.body.data.accessToken);
  } else {
    window.sessionStorage.removeItem("pos_access_token");
  }
  return {
    session: result.body.data,
    offline: result.offline,
    bootstrap: result.bootstrap,
  };
}

const screenPermissionMap: Partial<Record<ScreenId, PosPermissionKey[]>> = {
  dashboard: ["DASHBOARD_VIEW"],
  sale: ["SALE_CREATE"],
  "seller-sales": ["SALE_VIEW_OWN", "SALE_VIEW_ALL"],
  receipts: ["SALE_VIEW_OWN", "SALE_VIEW_ALL"],
  customers: ["CUSTOMERS_VIEW"],
  appointments: ["CUSTOMERS_VIEW"],
  inventory: ["INVENTORY_VIEW"],
  warehouse: ["WAREHOUSE_MANAGE"],
  "branch-inventory": ["WAREHOUSE_BRANCH_REQUEST"],
  suppliers: ["WAREHOUSE_MANAGE"],
  "inventory-movements": ["INVENTORY_VIEW", "INVENTORY_ADJUST"],
  deals: ["CATALOG_MANAGE"],
  catalog: ["CATALOG_VIEW"],
  settings: ["SETTINGS_MANAGE"],
  "x-report": ["REPORTS_VIEW"],
  reports: ["REPORTS_VIEW"],
  "cash-manager": ["CASH_MANAGE"],
  "clock-in": ["BUSINESS_DAY_OPEN"],
  "close-day": ["BUSINESS_DAY_CLOSE"],
  employees: ["EMPLOYEES_VIEW"],
  competition: ["REPORTS_VIEW"],
  "data-update": ["CATALOG_VIEW"],
};

const editPermissionMap: Partial<Record<ScreenId, PosPermissionKey[]>> = {
  sale: ["SALE_CREATE"],
  customers: ["CUSTOMERS_MANAGE"],
  appointments: ["CUSTOMERS_MANAGE"],
  inventory: ["INVENTORY_ADJUST"],
  warehouse: ["WAREHOUSE_MANAGE"],
  "branch-inventory": ["WAREHOUSE_BRANCH_REQUEST"],
  suppliers: ["WAREHOUSE_MANAGE"],
  "inventory-movements": ["INVENTORY_ADJUST"],
  deals: ["CATALOG_MANAGE"],
  settings: ["SETTINGS_MANAGE"],
  "cash-manager": ["CASH_MANAGE"],
  employees: ["EMPLOYEES_MANAGE"],
};

const configurationPermissionMap: Partial<
  Record<EmployeeConfigurationPermission, PosPermissionKey[]>
> = {
  TICKET: ["SETTINGS_MANAGE"],
  INVENTORY_CATALOG: ["CATALOG_MANAGE"],
  INVENTORY_AUDIT: ["INVENTORY_AUDIT"],
  INVENTORY_MOVEMENTS: ["INVENTORY_ADJUST"],
  WAREHOUSE_MOVEMENTS: ["WAREHOUSE_MANAGE"],
  PAYMENT_METHODS: ["PAYMENTS_MANAGE"],
  CUSTOMER_FIELDS: ["CUSTOMERS_MANAGE"],
  DEALS: ["CATALOG_MANAGE"],
  COMPETITIONS: ["REPORTS_VIEW"],
  REPORTS_COSTS: ["REPORTS_COSTS"],
  BRANCHES: ["TERMINALS_MANAGE"],
  USERS_ROLES: ["EMPLOYEES_MANAGE"],
};

const hasAny = (permissions: readonly PosPermissionKey[], required: readonly PosPermissionKey[]) =>
  required.some((permission) => permissions.includes(permission));

export function permissionsToScreens(permissions: readonly PosPermissionKey[]): ScreenId[] {
  return (Object.entries(screenPermissionMap) as Array<[ScreenId, PosPermissionKey[]]>)
    .filter(([, required]) => hasAny(permissions, required))
    .map(([screen]) => screen);
}

export function sessionUserFromDto(session: PosSessionDto): PosSessionUser {
  const initials = session.actor.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "")
    .join("");
  return {
    id: session.actor.employeeId ?? session.actor.id,
    name: session.actor.displayName,
    initials,
    roleId: session.actor.positionId ?? "",
    isMaster: session.actor.isMaster,
    branch: session.terminal.branch.name,
    loggedInAtIso: new Date().toISOString(),
  };
}

export function accessFromDto(data: PosAccessBootstrapDto): {
  roles: EmployeeRole[];
  sellers: Seller[];
} {
  const roles = data.roles.map<EmployeeRole>((role) => ({
    id: role.id,
    name: role.name,
    description: "Permisos POS administrados por puesto.",
    active: role.active,
    system: false,
    moduleAccess: permissionsToScreens(role.permissions),
    moduleEditAccess: (Object.entries(editPermissionMap) as Array<[ScreenId, PosPermissionKey[]]>)
      .filter(([, required]) => hasAny(role.permissions, required))
      .map(([screen]) => screen),
    modulePrintAccess: role.permissions.includes("REPORTS_VIEW")
      ? ["seller-sales", "receipts", "x-report", "close-day"]
      : [],
    configurationAccess: (
      Object.entries(configurationPermissionMap) as Array<
        [EmployeeConfigurationPermission, PosPermissionKey[]]
      >
    )
      .filter(([, required]) => hasAny(role.permissions, required))
      .map(([permission]) => permission),
  }));
  const sellers = data.employees.map<Seller>((employee) => ({
    id: employee.id,
    name: employee.displayName,
    alias: employee.credential?.alias ?? "",
    initials: employee.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "")
      .join(""),
    active: employee.active && Boolean(employee.credential?.active),
    accessCode: "",
    masterAccessCode: employee.credential?.isMaster ? "PROTECTED" : null,
    canViewCosts: Boolean(
      roles
        .find((role) => role.id === employee.positionId)
        ?.configurationAccess.includes("REPORTS_COSTS"),
    ),
    roleId: employee.positionId ?? "",
  }));
  return { roles, sellers };
}

export function roleToPermissions(role: EmployeeRole): PosPermissionKey[] {
  const permissions = new Set<PosPermissionKey>();
  for (const screen of role.moduleAccess) {
    screenPermissionMap[screen]?.forEach((permission) => permissions.add(permission));
  }
  for (const screen of role.moduleEditAccess) {
    editPermissionMap[screen]?.forEach((permission) => permissions.add(permission));
  }
  for (const configuration of role.configurationAccess) {
    configurationPermissionMap[configuration]?.forEach((permission) => permissions.add(permission));
  }
  return [...permissions];
}
