import type { PayrollScreenKey } from "@cosmetics/types";

export type PayrollAccessSection =
  | "payroll"
  | "operations"
  | "settings"
  | "reports";

export interface PayrollScreenConfig {
  key: PayrollScreenKey;
  path: string;
  section: PayrollAccessSection;
  label: string;
  description: string;
}

export const PAYROLL_SCREEN_CONFIG: PayrollScreenConfig[] = [
  {
    key: "payroll/resumen",
    path: "/",
    section: "operations",
    label: "Resumen",
    description: "Corridas quincenales y consolidado mensual.",
  },
  {
    key: "payroll/nomina-salario-fijo",
    path: "/nomina-salario-fijo",
    section: "payroll",
    label: "Salario fijo",
    description: "Consulta de nómina para puestos con sueldo fijo.",
  },
  {
    key: "payroll/nomina-especialistas",
    path: "/nomina-especialistas",
    section: "payroll",
    label: "Especialistas",
    description: "Consulta de nómina del personal especialista.",
  },
  {
    key: "payroll/nomina-comisiones",
    path: "/nomina-comisiones",
    section: "payroll",
    label: "Comisiones",
    description: "Consulta de nómina y comisiones por ventas.",
  },
  {
    key: "payroll/nomina-comisiones-gerencia",
    path: "/nomina-comisiones-gerencia",
    section: "payroll",
    label: "Comisiones gerencia",
    description: "Consulta de comisiones para puestos de gerencia.",
  },
  {
    key: "payroll/movimientos",
    path: "/movimientos",
    section: "operations",
    label: "Movimientos",
    description: "Bonos, multas, ajustes, viáticos e insumos.",
  },
  {
    key: "payroll/gastos",
    path: "/gastos",
    section: "operations",
    label: "Gastos",
    description: "Gastos individuales, recurrentes y categorías.",
  },
  {
    key: "payroll/prestamos-adelantos",
    path: "/prestamos-adelantos",
    section: "operations",
    label: "Préstamos",
    description: "Préstamos, adelantos y calendario de cuotas.",
  },
  {
    key: "payroll/esquemas",
    path: "/esquemas",
    section: "settings",
    label: "Esquemas",
    description: "Esquemas y asignaciones de comisión.",
  },
  {
    key: "payroll/bonos",
    path: "/bonos",
    section: "settings",
    label: "Bonos",
    description: "Catálogo de conceptos de bono.",
  },
  {
    key: "payroll/multas",
    path: "/multas",
    section: "settings",
    label: "Multas",
    description: "Catálogo de conceptos de multa.",
  },
  {
    key: "payroll/viaticos",
    path: "/viaticos",
    section: "settings",
    label: "Viáticos",
    description: "Catálogo de conceptos de viáticos.",
  },
  {
    key: "payroll/reportes/desglose-sucursal",
    path: "/reportes/desglose-sucursal",
    section: "reports",
    label: "Desglose por sucursal",
    description: "Costo de nómina y bonos por punto de venta.",
  },
  {
    key: "payroll/recibos",
    path: "/recibos",
    section: "reports",
    label: "Recibos",
    description: "Vista actual, recibos emitidos y seguimiento.",
  },
];

export const PAYROLL_ACCESS_SCREEN: PayrollScreenConfig = {
  key: "payroll/accesos",
  path: "/accesos",
  section: "settings",
  label: "Control de accesos",
  description: "Permisos de lectura y edición por puesto.",
};

export const PAYROLL_SECTION_ORDER: PayrollAccessSection[] = [
  "payroll",
  "operations",
  "settings",
  "reports",
];

export const PAYROLL_SECTION_LABELS: Record<PayrollAccessSection, string> = {
  payroll: "Nómina",
  operations: "Operación",
  settings: "Configuración",
  reports: "Reportes",
};

export function getPayrollScreenByPath(
  pathname: string,
): PayrollScreenConfig | null {
  if (pathname === PAYROLL_ACCESS_SCREEN.path) return PAYROLL_ACCESS_SCREEN;
  return (
    PAYROLL_SCREEN_CONFIG.find((screen) => screen.path === pathname) ?? null
  );
}

export function getFirstPayrollPath(
  permissions: readonly PayrollScreenKey[],
  canManageAccess: boolean,
): string | null {
  if (canManageAccess) return PAYROLL_SCREEN_CONFIG[0]?.path ?? "/accesos";
  const permissionSet = new Set(permissions);
  return (
    PAYROLL_SCREEN_CONFIG.find((screen) => permissionSet.has(screen.key))
      ?.path ?? null
  );
}
