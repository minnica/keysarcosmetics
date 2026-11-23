"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  SchedulerCapability,
  SchedulerManagedPositionDto,
  SchedulerManagedRoleWriteDto,
  SchedulerManagedUserDto,
  SchedulerManagedUserWriteDto,
  SchedulerPermissionDto,
  SchedulerScreenKey,
} from "@cosmetics/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  cn,
  toast,
} from "@cosmetics/ui";
import {
  Check,
  KeyRound,
  Lock,
  LockOpen,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import { SchedulerPagination } from "@/components/shared/SchedulerPagination";
import {
  paginateSchedulerReportRows,
  type SchedulerReportPageSize,
} from "@/lib/scheduler-report-presentation";
import { QueryBoundary, useSchedulerQuery } from "./ApiState";

type WorkspaceView = "users" | "roles";

interface UserDraft {
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string;
  branchIds: string[];
  active: boolean;
  twoFactorEnabled: boolean;
  version?: number;
}

interface RoleDraft {
  id: string | null;
  name: string;
  description: string;
  active: boolean;
  canManageSchedulerAccess: boolean;
  selfProfessionalOnly: boolean;
  branchIds: string[];
  permissions: SchedulerPermissionDto[];
  version?: number;
}

const emptyUserDraft: UserDraft = {
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "",
  branchIds: [],
  active: true,
  twoFactorEnabled: false,
};

const capabilityLabels: Record<SchedulerCapability, string> = {
  READ: "Ver",
  WRITE: "Editar",
  ADMIN: "Administrar",
  EXPORT: "Exportar",
  EXCEPTION: "Autorizar",
};

const screenLabels: Partial<Record<SchedulerScreenKey, string>> = {
  "scheduler/agenda": "Agenda principal",
  "scheduler/clients": "Directorio de clientes",
  "scheduler/services": "Catálogo de servicios",
  "scheduler/reports/summary": "Resumen",
  "scheduler/reports/reservations": "Reservas",
  "scheduler/reports/sales": "Ventas y pagos",
  "scheduler/administration/locals": "Sucursales y cabinas",
  "scheduler/administration/professionals": "Especialistas",
  "scheduler/administration/services": "Servicios",
  "scheduler/administration/commissions": "Comisiones",
  "scheduler/administration/resources": "Recursos",
  "scheduler/administration/surveys": "Encuestas",
  "scheduler/administration/consents": "Consentimientos",
  "scheduler/administration/whatsapp": "Notificaciones",
  "scheduler/administration/gift-cards": "Gift cards",
  "scheduler/administration/status-colors": "Colores de status",
  "scheduler/settings/company": "Empresa",
  "scheduler/settings/website": "Sitio web",
  "scheduler/settings/agenda": "Agenda",
  "scheduler/settings/payments": "Pagos Keysar",
  "scheduler/settings/reminders": "Recordatorios",
  "scheduler/settings/records": "Fichas médicas",
  "scheduler/settings/emails": "E-mails",
  "scheduler/settings/integrations": "Integraciones",
  "scheduler/settings/notifications": "Notificaciones",
  "scheduler/settings/clients": "Clientes y preguntas",
  "scheduler/settings/surveys": "Encuestas",
  "scheduler/settings/authorizations": "Códigos y autorizaciones",
};

interface PermissionModule {
  id: string;
  label: string;
  description: string;
  screens: SchedulerScreenKey[];
}

const permissionModuleOrder = [
  "agenda",
  "clients",
  "services",
  "reports",
  "administration",
  "settings",
] as const;

const permissionModuleLabels: Record<
  (typeof permissionModuleOrder)[number],
  { label: string; description: string }
> = {
  agenda: {
    label: "Agenda",
    description: "Calendario, citas, asistencia y operación diaria.",
  },
  clients: {
    label: "Clientes",
    description: "Directorio, historial, recuperación y datos del cliente.",
  },
  services: {
    label: "Servicios",
    description: "Consulta del catálogo disponible para agendar.",
  },
  reports: {
    label: "Reportes",
    description: "Indicadores, reservas, ventas y descargas.",
  },
  administration: {
    label: "Administración",
    description: "Sucursales, personal, catálogos y operación avanzada.",
  },
  settings: {
    label: "Configuración",
    description: "Preferencias, integraciones, seguridad y comunicaciones.",
  },
};

function permissionModuleId(screen: SchedulerScreenKey) {
  if (screen === "scheduler/agenda") return "agenda";
  if (screen === "scheduler/clients") return "clients";
  if (screen === "scheduler/services") return "services";
  if (screen.startsWith("scheduler/reports/")) return "reports";
  if (screen.startsWith("scheduler/administration/")) return "administration";
  return "settings";
}

function groupPermissionScreens(
  screens: readonly SchedulerScreenKey[],
): PermissionModule[] {
  return permissionModuleOrder.flatMap((id) => {
    const moduleScreens = screens.filter(
      (screen) => permissionModuleId(screen) === id,
    );
    if (!moduleScreens.length) return [];
    return [{ id, ...permissionModuleLabels[id], screens: moduleScreens }];
  });
}

function setPermissionCapability(
  permissions: SchedulerPermissionDto[],
  screens: readonly SchedulerScreenKey[],
  capability: SchedulerCapability,
  enabled: boolean,
) {
  const screenSet = new Set(screens);
  const untouched = permissions.filter(
    (permission) => !screenSet.has(permission.screenKey),
  );
  const currentByScreen = new Map(
    permissions
      .filter((permission) => screenSet.has(permission.screenKey))
      .map((permission) => [permission.screenKey, permission]),
  );
  const updated = screens.flatMap((screen) => {
    const current = currentByScreen.get(screen)?.capabilities ?? [];
    if (capability === "READ" && !enabled) return [];
    const next = new Set(current);
    if (enabled) {
      next.add("READ");
      next.add(capability);
    } else {
      next.delete(capability);
    }
    if (!next.has("READ")) return [];
    return [{ screenKey: screen, capabilities: [...next] }];
  });
  return [...untouched, ...updated];
}

function screenLabel(screen: SchedulerScreenKey) {
  return (
    screenLabels[screen] ??
    screen
      .replace("scheduler/", "")
      .split("/")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" · ")
  );
}

function userDraftFrom(user: SchedulerManagedUserDto): UserDraft {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
    roleId: user.roleId,
    branchIds: user.branchIds,
    active: user.active,
    twoFactorEnabled: user.twoFactorEnabled,
    version: user.version,
  };
}

function roleDraftFrom(role: SchedulerManagedPositionDto): RoleDraft {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    active: role.active,
    canManageSchedulerAccess: role.canManageSchedulerAccess,
    selfProfessionalOnly: role.selfProfessionalOnly,
    branchIds: role.branchIds,
    permissions: role.permissions,
    ...(role.version ? { version: role.version } : {}),
  };
}

function ChoiceButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-[#b99065] bg-[#f1e6da] text-[#6e5034]"
          : "border-[#e4d7cb] bg-white text-slate-600 hover:bg-[#faf7f4]",
        disabled && "cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {active ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function BranchSelector({
  branchIds,
  branches,
  onChange,
}: {
  branchIds: string[];
  branches: Array<{ id: string; name: string; active: boolean }>;
  onChange: (branchIds: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {branches
        .filter((branch) => branch.active)
        .map((branch) => (
          <ChoiceButton
            active={branchIds.includes(branch.id)}
            key={branch.id}
            onClick={() =>
              onChange(
                branchIds.includes(branch.id)
                  ? branchIds.filter((id) => id !== branch.id)
                  : [...branchIds, branch.id],
              )
            }
          >
            {branch.name}
          </ChoiceButton>
        ))}
    </div>
  );
}

export function UserAccessWorkspace({ view }: { view: WorkspaceView }) {
  const { bootstrap } = useSchedulerSession();
  const query = useSchedulerQuery(
    () => schedulerApi.userAccessManagement(),
    [],
    { enabled: Boolean(bootstrap?.canManageAccess), queryKey: "access-users" },
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const [userDraft, setUserDraft] = useState<UserDraft | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<{
    kind: WorkspaceView;
    id: string;
    label: string;
  } | null>(null);

  const filteredRows = useMemo<
    Array<SchedulerManagedUserDto | SchedulerManagedPositionDto>
  >(() => {
    const needle = search.trim().toLocaleLowerCase("es-MX");
    if (view === "users") {
      return (query.data?.users ?? []).filter((user) =>
        [user.firstName, user.lastName, user.email, user.roleName].some(
          (value) => value.toLocaleLowerCase("es-MX").includes(needle),
        ),
      );
    }
    return (query.data?.roles ?? []).filter((role) =>
      [role.name, role.description ?? ""].some((value) =>
        value.toLocaleLowerCase("es-MX").includes(needle),
      ),
    );
  }, [query.data, search, view]);
  const pagination = paginateSchedulerReportRows<
    SchedulerManagedUserDto | SchedulerManagedPositionDto
  >(filteredRows, page, pageSize);
  const permissionModules = useMemo(
    () => groupPermissionScreens(query.data?.screens ?? []),
    [query.data?.screens],
  );

  if (!bootstrap?.canManageAccess) {
    return (
      <section className="report-card p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-[#b99065]" />
        <h1 className="mt-4 text-2xl font-semibold text-[#263649]">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tu rol no puede administrar usuarios, roles ni autorizaciones.
        </p>
      </section>
    );
  }

  function openNewRole() {
    const firstScreen = query.data?.screens[0];
    setRoleDraft({
      id: null,
      name: "",
      description: "",
      active: true,
      canManageSchedulerAccess: false,
      selfProfessionalOnly: false,
      branchIds:
        query.data?.branches
          .filter((branch) => branch.active)
          .map((branch) => branch.id) ?? [],
      permissions: firstScreen
        ? [{ screenKey: firstScreen, capabilities: ["READ"] }]
        : [],
    });
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    if (!userDraft) return;
    if (!userDraft.roleId || !userDraft.branchIds.length) {
      toast.warning("Selecciona un rol y al menos una sucursal.");
      return;
    }
    const input: SchedulerManagedUserWriteDto = {
      firstName: userDraft.firstName,
      lastName: userDraft.lastName,
      email: userDraft.email,
      phone: userDraft.phone || null,
      roleId: userDraft.roleId,
      branchIds: userDraft.branchIds,
      active: userDraft.active,
      twoFactorEnabled: userDraft.twoFactorEnabled,
      ...(userDraft.version ? { expectedVersion: userDraft.version } : {}),
    };
    setSaving(true);
    try {
      if (userDraft.id)
        await schedulerApi.updateManagedUser(userDraft.id, input);
      else await schedulerApi.createManagedUser(input);
      toast.success(userDraft.id ? "Usuario actualizado." : "Usuario creado.");
      setUserDraft(null);
      await query.reload();
    } catch (error) {
      toast.error(schedulerApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function saveRole(event: FormEvent) {
    event.preventDefault();
    if (!roleDraft) return;
    if (!roleDraft.permissions.length) {
      toast.warning("Selecciona al menos una pantalla para el rol.");
      return;
    }
    const input: SchedulerManagedRoleWriteDto = {
      name: roleDraft.name,
      description: roleDraft.description || null,
      active: roleDraft.active,
      canManageSchedulerAccess: roleDraft.canManageSchedulerAccess,
      selfProfessionalOnly: roleDraft.selfProfessionalOnly,
      branchIds: roleDraft.branchIds,
      permissions: roleDraft.permissions,
      ...(roleDraft.version ? { expectedVersion: roleDraft.version } : {}),
    };
    setSaving(true);
    try {
      if (roleDraft.id)
        await schedulerApi.updateManagedRole(roleDraft.id, input);
      else await schedulerApi.createManagedRole(input);
      toast.success(roleDraft.id ? "Rol actualizado." : "Rol creado.");
      setRoleDraft(null);
      await query.reload();
    } catch (error) {
      toast.error(schedulerApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function sendPasswordReset(user: SchedulerManagedUserDto) {
    try {
      await schedulerApi.sendManagedUserPasswordReset(user.id);
      toast.success(`Enlace de cambio de contraseña enviado a ${user.email}.`);
      await query.reload();
    } catch (error) {
      toast.error(schedulerApiErrorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      if (deleting.kind === "users")
        await schedulerApi.deleteManagedUser(deleting.id);
      else await schedulerApi.deleteManagedRole(deleting.id);
      toast.success(
        deleting.kind === "users" ? "Usuario eliminado." : "Rol eliminado.",
      );
      setDeleting(null);
      await query.reload();
    } catch (error) {
      toast.error(schedulerApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const title = view === "users" ? "Usuarios" : "Roles y accesos";
  const description =
    view === "users"
      ? "Crea cuentas, asigna un rol y controla la verificación en dos pasos."
      : "Define qué puede ver, editar, exportar o autorizar cada rol.";

  return (
    <div className="space-y-5">
      <section className="report-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#eee6df] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="label-caps">Seguridad y acceso</p>
            <h1 className="page-title mt-1 text-4xl text-[#263649]">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void query.reload()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
            </Button>
            <Button
              className="bg-[#b99065] text-white hover:bg-[#9e7954]"
              onClick={() =>
                view === "users"
                  ? setUserDraft({ ...emptyUserDraft })
                  : openNewRole()
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {view === "users" ? "Nuevo usuario" : "Nuevo rol"}
            </Button>
          </div>
        </div>
        <div className="border-b border-[#eee6df] p-4 sm:p-5">
          <Input
            aria-label={`Buscar en ${title.toLocaleLowerCase("es-MX")}`}
            className="h-11 rounded-xl"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={
              view === "users"
                ? "Buscar por nombre, correo o rol"
                : "Buscar rol o descripción"
            }
            value={search}
          />
        </div>
        <QueryBoundary
          empty={filteredRows.length === 0}
          emptyDescription={
            view === "users" ? "Crea el primer usuario." : "Crea el primer rol."
          }
          emptyTitle={view === "users" ? "Sin usuarios" : "Sin roles"}
          error={query.error}
          loading={query.loading}
          onRetry={() => void query.reload()}
        >
          <div className="overflow-x-auto">
            {view === "users" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Sucursales</TableHead>
                    <TableHead>Seguridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.rows.map((row) => {
                    if (!("email" in row)) return null;
                    const user = row;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <p className="font-semibold text-[#263649]">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          {user.phone ? (
                            <p className="text-xs text-slate-400">
                              {user.phone}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>{user.roleName}</TableCell>
                        <TableCell>{user.branchIds.length} asignadas</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.twoFactorEnabled
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }
                          >
                            {user.twoFactorEnabled ? (
                              <Lock className="mr-1 h-3 w-3" />
                            ) : (
                              <LockOpen className="mr-1 h-3 w-3" />
                            )}
                            {user.twoFactorEnabled
                              ? "2 pasos activo"
                              : "2 pasos inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }
                          >
                            {user.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              aria-label={`Enviar cambio de contraseña a ${user.email}`}
                              onClick={() => void sendPasswordReset(user)}
                              size="icon"
                              title="Enviar cambio de contraseña"
                              variant="ghost"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              aria-label={`Editar ${user.firstName}`}
                              onClick={() => setUserDraft(userDraftFrom(user))}
                              size="icon"
                              title="Editar usuario"
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              aria-label={`Eliminar ${user.firstName}`}
                              className="text-rose-600"
                              onClick={() =>
                                setDeleting({
                                  kind: "users",
                                  id: user.id,
                                  label: `${user.firstName} ${user.lastName}`,
                                })
                              }
                              size="icon"
                              title="Eliminar usuario"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rol</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Accesos</TableHead>
                    <TableHead>Autorizaciones</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.rows.map((row) => {
                    if (!("name" in row)) return null;
                    const role = row;
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          <p className="font-semibold text-[#263649]">
                            {role.name}
                          </p>
                          <p className="max-w-sm text-xs text-slate-500">
                            {role.description || "Sin descripción"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {query.data?.users.filter(
                            (user) => user.roleId === role.id,
                          ).length ?? 0}
                        </TableCell>
                        <TableCell>
                          {role.permissions.length} pantallas
                        </TableCell>
                        <TableCell>
                          {role.canManageSchedulerAccess
                            ? "Administra accesos"
                            : role.selfProfessionalOnly
                              ? "Sólo actividad propia"
                              : "Operación general"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              role.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }
                          >
                            {role.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              aria-label={`Editar rol ${role.name}`}
                              onClick={() => setRoleDraft(roleDraftFrom(role))}
                              size="icon"
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              aria-label={`Eliminar rol ${role.name}`}
                              className="text-rose-600"
                              onClick={() =>
                                setDeleting({
                                  kind: "roles",
                                  id: role.id,
                                  label: role.name,
                                })
                              }
                              size="icon"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <SchedulerPagination
            {...pagination}
            label={view === "users" ? "usuarios" : "roles"}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSize={pageSize}
          />
        </QueryBoundary>
      </section>

      <Dialog
        open={Boolean(userDraft)}
        onOpenChange={(open) => !open && setUserDraft(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-[820px] gap-0 overflow-hidden rounded-[28px] border-[#e7ddd4] bg-white p-0">
          {userDraft ? (
            <form
              className="flex max-h-[92vh] min-h-0 flex-col"
              onSubmit={saveUser}
            >
              <DialogHeader className="border-b border-[#eee6df] px-7 py-5 pr-14 text-left">
                <DialogTitle className="text-2xl text-[#263649]">
                  {userDraft.id ? "Editar usuario" : "Nuevo usuario"}
                </DialogTitle>
                <DialogDescription>
                  El rol define los accesos que tendrá la cuenta.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#faf8f6] p-6">
                <section className="rounded-2xl border border-[#e8ddd4] bg-white p-5">
                  <h2 className="font-semibold text-[#263649]">
                    Información básica
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="managed-user-first-name">Nombre *</Label>
                      <Input
                        autoFocus
                        className="mt-1.5"
                        id="managed-user-first-name"
                        onChange={(event) =>
                          setUserDraft({
                            ...userDraft,
                            firstName: event.target.value,
                          })
                        }
                        required
                        value={userDraft.firstName}
                      />
                    </div>
                    <div>
                      <Label htmlFor="managed-user-last-name">Apellido *</Label>
                      <Input
                        className="mt-1.5"
                        id="managed-user-last-name"
                        onChange={(event) =>
                          setUserDraft({
                            ...userDraft,
                            lastName: event.target.value,
                          })
                        }
                        required
                        value={userDraft.lastName}
                      />
                    </div>
                    <div>
                      <Label htmlFor="managed-user-email">Correo *</Label>
                      <Input
                        autoComplete="email"
                        className="mt-1.5"
                        id="managed-user-email"
                        onChange={(event) =>
                          setUserDraft({
                            ...userDraft,
                            email: event.target.value,
                          })
                        }
                        required
                        type="email"
                        value={userDraft.email}
                      />
                    </div>
                    <div>
                      <Label htmlFor="managed-user-phone">Teléfono</Label>
                      <Input
                        autoComplete="tel"
                        className="mt-1.5"
                        id="managed-user-phone"
                        onChange={(event) =>
                          setUserDraft({
                            ...userDraft,
                            phone: event.target.value,
                          })
                        }
                        value={userDraft.phone}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Rol *</Label>
                      <Select
                        onValueChange={(roleId) =>
                          setUserDraft({ ...userDraft, roleId })
                        }
                        value={userDraft.roleId}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {query.data?.roles
                            .filter(
                              (role) =>
                                role.active || role.id === userDraft.roleId,
                            )
                            .map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
                <section className="rounded-2xl border border-[#e8ddd4] bg-white p-5">
                  <Label>Sucursales *</Label>
                  <div className="mt-3">
                    <BranchSelector
                      branchIds={userDraft.branchIds}
                      branches={query.data?.branches ?? []}
                      onChange={(branchIds) =>
                        setUserDraft({ ...userDraft, branchIds })
                      }
                    />
                  </div>
                </section>
                <section className="rounded-2xl border border-[#e8ddd4] bg-white p-5">
                  <h2 className="font-semibold text-[#263649]">Seguridad</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ChoiceButton
                      active={userDraft.active}
                      onClick={() =>
                        setUserDraft({
                          ...userDraft,
                          active: !userDraft.active,
                        })
                      }
                    >
                      {userDraft.active ? "Usuario activo" : "Usuario inactivo"}
                    </ChoiceButton>
                    <ChoiceButton
                      active={userDraft.twoFactorEnabled}
                      onClick={() =>
                        setUserDraft({
                          ...userDraft,
                          twoFactorEnabled: !userDraft.twoFactorEnabled,
                        })
                      }
                    >
                      {userDraft.twoFactorEnabled ? (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Validación en dos
                          pasos activa
                        </>
                      ) : (
                        <>
                          <LockOpen className="h-3.5 w-3.5" /> Validación en dos
                          pasos inactiva
                        </>
                      )}
                    </ChoiceButton>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Al crear la cuenta podrás enviar un enlace seguro para que
                    la persona defina o cambie su contraseña.
                  </p>
                </section>
              </div>
              <DialogFooter className="border-t border-[#eee6df] px-7 py-4">
                <Button
                  onClick={() => setUserDraft(null)}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-[#b99065] text-white hover:bg-[#9e7954]"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Guardando…" : "Guardar usuario"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(roleDraft)}
        onOpenChange={(open) => !open && setRoleDraft(null)}
      >
        <DialogContent className="h-[96vh] w-[96vw] max-w-[96vw] gap-0 overflow-hidden rounded-[28px] border-[#e7ddd4] bg-white p-0 sm:max-w-[96vw]">
          {roleDraft ? (
            <form className="flex h-full min-h-0 flex-col" onSubmit={saveRole}>
              <DialogHeader className="border-b border-[#eee6df] px-7 py-5 pr-14 text-left">
                <DialogTitle className="text-2xl text-[#263649]">
                  {roleDraft.id ? "Editar rol" : "Nuevo rol"}
                </DialogTitle>
                <DialogDescription>
                  Configura accesos y autorizaciones; el rol aparecerá al crear
                  usuarios.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#faf8f6] p-6">
                <section className="grid gap-4 rounded-2xl border border-[#e8ddd4] bg-white p-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="managed-role-name">Nombre del rol *</Label>
                    <Input
                      autoFocus
                      className="mt-1.5"
                      id="managed-role-name"
                      onChange={(event) =>
                        setRoleDraft({ ...roleDraft, name: event.target.value })
                      }
                      required
                      value={roleDraft.name}
                    />
                  </div>
                  <div>
                    <Label htmlFor="managed-role-description">
                      Descripción
                    </Label>
                    <Textarea
                      className="mt-1.5 min-h-10"
                      id="managed-role-description"
                      onChange={(event) =>
                        setRoleDraft({
                          ...roleDraft,
                          description: event.target.value,
                        })
                      }
                      value={roleDraft.description}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Sucursales</Label>
                    <div className="mt-3">
                      <BranchSelector
                        branchIds={roleDraft.branchIds}
                        branches={query.data?.branches ?? []}
                        onChange={(branchIds) =>
                          setRoleDraft({ ...roleDraft, branchIds })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <ChoiceButton
                      active={roleDraft.active}
                      onClick={() =>
                        setRoleDraft({
                          ...roleDraft,
                          active: !roleDraft.active,
                        })
                      }
                    >
                      {roleDraft.active ? "Rol activo" : "Rol inactivo"}
                    </ChoiceButton>
                    <ChoiceButton
                      active={roleDraft.canManageSchedulerAccess}
                      onClick={() =>
                        setRoleDraft({
                          ...roleDraft,
                          canManageSchedulerAccess:
                            !roleDraft.canManageSchedulerAccess,
                        })
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Administra
                      usuarios y accesos
                    </ChoiceButton>
                    <ChoiceButton
                      active={roleDraft.selfProfessionalOnly}
                      onClick={() =>
                        setRoleDraft({
                          ...roleDraft,
                          selfProfessionalOnly: !roleDraft.selfProfessionalOnly,
                        })
                      }
                    >
                      <UserRoundCog className="h-3.5 w-3.5" /> Sólo actividad
                      propia
                    </ChoiceButton>
                  </div>
                </section>
                <section className="rounded-2xl border border-[#e8ddd4] bg-white">
                  <div className="border-b border-[#eee6df] p-5">
                    <h2 className="font-semibold text-[#263649]">
                      Módulos, submódulos y permisos
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Usa la fila “Todo el módulo” para asignar una capacidad a
                      todos sus submódulos, o configura cada uno por separado.
                    </p>
                  </div>
                  <div className="space-y-4 bg-[#faf8f6] p-4 sm:p-5">
                    {permissionModules.map((module) => (
                      <section
                        className="overflow-hidden rounded-2xl border border-[#e7ddd4] bg-white"
                        key={module.id}
                      >
                        <div className="flex flex-col gap-2 border-b border-[#eee6df] bg-[#f5efe9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-[#263649]">
                              {module.label}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {module.description}
                            </p>
                          </div>
                          <Badge className="w-fit bg-white text-[#7b6044]">
                            {module.screens.length}{" "}
                            {module.screens.length === 1
                              ? "submódulo"
                              : "submódulos"}
                          </Badge>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[260px]">
                                  Submódulo
                                </TableHead>
                                {query.data?.capabilities.map((capability) => (
                                  <TableHead
                                    className="min-w-[105px] text-center"
                                    key={capability}
                                  >
                                    {capabilityLabels[capability]}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="bg-[#fcfaf8]">
                                <TableCell>
                                  <span className="font-semibold text-[#7b6044]">
                                    Todo el módulo
                                  </span>
                                  <span className="ml-2 text-xs text-slate-400">
                                    Aplicar a todos
                                  </span>
                                </TableCell>
                                {query.data?.capabilities.map((capability) => {
                                  const active = module.screens.every(
                                    (screen) =>
                                      roleDraft.permissions
                                        .find(
                                          (permission) =>
                                            permission.screenKey === screen,
                                        )
                                        ?.capabilities.includes(capability) ??
                                      false,
                                  );
                                  return (
                                    <TableCell
                                      className="text-center"
                                      key={capability}
                                    >
                                      <button
                                        aria-label={`${capabilityLabels[capability]} todo el módulo ${module.label}`}
                                        aria-pressed={active}
                                        className={cn(
                                          "mx-auto flex h-9 w-9 items-center justify-center rounded-xl border transition",
                                          active
                                            ? "border-[#b99065] bg-[#eadac9] text-[#6e5034]"
                                            : "border-[#dfd0c2] bg-white text-slate-300 hover:border-[#b99065]",
                                        )}
                                        onClick={() =>
                                          setRoleDraft({
                                            ...roleDraft,
                                            permissions:
                                              setPermissionCapability(
                                                roleDraft.permissions,
                                                module.screens,
                                                capability,
                                                !active,
                                              ),
                                          })
                                        }
                                        type="button"
                                      >
                                        {active ? (
                                          <Check className="h-4 w-4" />
                                        ) : null}
                                      </button>
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                              {module.screens.map((screen) => {
                                const permission = roleDraft.permissions.find(
                                  (item) => item.screenKey === screen,
                                );
                                return (
                                  <TableRow key={screen}>
                                    <TableCell className="font-medium text-[#263649]">
                                      {screenLabel(screen)}
                                    </TableCell>
                                    {query.data?.capabilities.map(
                                      (capability) => {
                                        const active =
                                          permission?.capabilities.includes(
                                            capability,
                                          ) ?? false;
                                        const readDisabled =
                                          capability !== "READ" &&
                                          !permission?.capabilities.includes(
                                            "READ",
                                          );
                                        return (
                                          <TableCell
                                            className="text-center"
                                            key={capability}
                                          >
                                            <button
                                              aria-label={`${capabilityLabels[capability]} ${screenLabel(screen)}`}
                                              aria-pressed={active}
                                              className={cn(
                                                "mx-auto flex h-9 w-9 items-center justify-center rounded-xl border transition",
                                                active
                                                  ? "border-[#b99065] bg-[#f1e6da] text-[#6e5034]"
                                                  : "border-[#e4d7cb] text-slate-300 hover:border-[#c9ad90]",
                                                readDisabled &&
                                                  "cursor-not-allowed opacity-40",
                                              )}
                                              disabled={readDisabled}
                                              onClick={() =>
                                                setRoleDraft({
                                                  ...roleDraft,
                                                  permissions:
                                                    setPermissionCapability(
                                                      roleDraft.permissions,
                                                      [screen],
                                                      capability,
                                                      !active,
                                                    ),
                                                })
                                              }
                                              type="button"
                                            >
                                              {active ? (
                                                <Check className="h-4 w-4" />
                                              ) : null}
                                            </button>
                                          </TableCell>
                                        );
                                      },
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              </div>
              <DialogFooter className="border-t border-[#eee6df] px-7 py-4">
                <Button
                  onClick={() => setRoleDraft(null)}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-[#b99065] text-white hover:bg-[#9e7954]"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Guardando…" : "Guardar rol"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar {deleting?.kind === "users" ? "usuario" : "rol"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará “{deleting?.label}”. Esta acción requiere
              confirmación y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={saving}
              onClick={() => void confirmDelete()}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
