export const permissionModules = [
  {
    key: "employees",
    label: "Directorio",
    description: "Lista general y estados del personal",
  },
  {
    key: "personal",
    label: "Altas y edición",
    description: "Crear cuentas y modificar perfiles",
  },
  {
    key: "calendar",
    label: "Calendarios",
    description: "Programación semanal, quincenal y mensual",
  },
  {
    key: "requests",
    label: "Solicitudes",
    description: "Permisos, documentos y autorizaciones",
  },
  {
    key: "vacations",
    label: "Vacaciones",
    description: "Historial general de vacaciones",
  },
  {
    key: "branches",
    label: "Sucursales",
    description: "Tiendas, encargados y asignaciones",
  },
  {
    key: "positions",
    label: "Puestos",
    description: "Catálogo de puestos y actualización general",
  },
  {
    key: "facialists",
    label: "Horarios de facialistas",
    description: "Programación y cobertura de facialistas por sucursal",
  },
  {
    key: "birthdays",
    label: "Cumpleaños",
    description: "Recordatorios y felicitaciones del equipo",
  },
  {
    key: "policies",
    label: "Políticas y reglamentos",
    description: "Documentos internos autorizados",
  },
] as const;

export type PermissionKey = (typeof permissionModules)[number]["key"];
export type PermissionLevel = { view: boolean; edit: boolean };
export type PermissionSet = Record<PermissionKey, PermissionLevel>;

export function emptyPermissions(): PermissionSet {
  return Object.fromEntries(
    permissionModules.map((permissionModule) => [
      permissionModule.key,
      { view: false, edit: false },
    ]),
  ) as PermissionSet;
}

export function fullPermissions(): PermissionSet {
  return Object.fromEntries(
    permissionModules.map((permissionModule) => [
      permissionModule.key,
      { view: true, edit: true },
    ]),
  ) as PermissionSet;
}

export function parsePermissions(
  value: string | null | undefined,
  master = false,
): PermissionSet {
  if (master) return fullPermissions();
  const base = emptyPermissions();
  try {
    const saved = value
      ? (JSON.parse(value) as Partial<
          Record<PermissionKey, Partial<PermissionLevel>>
        >)
      : {};
    for (const permissionModule of permissionModules) {
      const level = saved[permissionModule.key];
      base[permissionModule.key] = {
        view: Boolean(level?.view || level?.edit),
        edit: Boolean(level?.edit),
      };
    }
  } catch {
    return base;
  }
  return base;
}

export function serializePermissions(value: PermissionSet) {
  return JSON.stringify(value);
}
