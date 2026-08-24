"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check, Pencil, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import type { PayrollScreenKey } from "@cosmetics/types";
import type { ColumnDef } from "@cosmetics/ui";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
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
  Separator,
  toast,
} from "@cosmetics/ui";
import {
  PAYROLL_SCREEN_CONFIG,
  PAYROLL_SECTION_LABELS,
  PAYROLL_SECTION_ORDER,
} from "@/lib/access";
import {
  type PayrollAccessPermission,
  type PayrollAccessUser,
  usePayrollAccessAdmin,
} from "@/hooks/use-payroll-access-admin";
import { apiErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";

type PermissionMap = Record<PayrollScreenKey, boolean>;

const credentialsSchema = z.object({
  email: z.string().trim().email("Captura un correo válido."),
  password: z
    .string()
    .optional()
    .refine((value) => !value || value.length >= 8, {
      message: "La contraseña debe tener al menos 8 caracteres.",
    }),
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

const EDITABLE_SCREEN_KEYS = PAYROLL_SCREEN_CONFIG.map(
  (screen) => screen.key,
);

function emptyPermissionMap(): PermissionMap {
  return Object.fromEntries(
    EDITABLE_SCREEN_KEYS.map((screenKey) => [screenKey, false]),
  ) as PermissionMap;
}

export default function PayrollAccessPage() {
  const { user, refreshSession } = useSession();
  const {
    positions,
    employees,
    users,
    loading,
    error,
    savePermissions,
    saveCredentials,
    deleteUser,
  } = usePayrollAccessAdmin();
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [draftManager, setDraftManager] = useState(false);
  const [draftPermissions, setDraftPermissions] =
    useState<PermissionMap>(emptyPermissionMap);
  const [draftWritePermissions, setDraftWritePermissions] =
    useState<PermissionMap>(emptyPermissionMap);
  const [saving, setSaving] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [credentialsConfirmOpen, setCredentialsConfirmOpen] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{
    employeeId: string;
    isUpdate: boolean;
    data: CredentialsForm;
  } | null>(null);
  const [userToDelete, setUserToDelete] =
    useState<PayrollAccessUser | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const latestRef = useRef<{
    positionId: string;
    canManagePayrollAccess: boolean;
    permissions: PayrollAccessPermission[];
    signature: string;
  } | null>(null);
  const committedManagerRef = useRef(false);
  const committedPermissionsRef = useRef<PermissionMap>(emptyPermissionMap());
  const committedWritePermissionsRef = useRef<PermissionMap>(
    emptyPermissionMap(),
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<CredentialsForm>({
    defaultValues: { email: "", password: "" },
  });

  const selectedPosition = useMemo(
    () =>
      positions.find((position) => position.id === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  );

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const selectedUser = useMemo(
    () =>
      users.find((account) => account.empleadoId === selectedEmployeeId) ??
      null,
    [selectedEmployeeId, users],
  );

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employee.nombreCompleto,
      })),
    [employees],
  );

  useEffect(() => {
    if (!selectedPositionId && positions[0]) {
      setSelectedPositionId(positions[0].id);
      return;
    }
    if (!selectedPosition) return;

    const permissions = Object.fromEntries(
      EDITABLE_SCREEN_KEYS.map((screenKey) => [
        screenKey,
        selectedPosition.payrollScreenPermissions.some(
          (permission) =>
            permission.screenKey === screenKey && permission.allowed,
        ),
      ]),
    ) as PermissionMap;
    const writePermissions = Object.fromEntries(
      EDITABLE_SCREEN_KEYS.map((screenKey) => [
        screenKey,
        selectedPosition.payrollScreenPermissions.some(
          (permission) =>
            permission.screenKey === screenKey &&
            permission.allowed &&
            permission.canWrite,
        ),
      ]),
    ) as PermissionMap;
    setDraftManager(selectedPosition.canManagePayrollAccess);
    setDraftPermissions(permissions);
    setDraftWritePermissions(writePermissions);
    committedManagerRef.current = selectedPosition.canManagePayrollAccess;
    committedPermissionsRef.current = permissions;
    committedWritePermissionsRef.current = writePermissions;
  }, [positions, selectedPosition, selectedPositionId]);

  useEffect(() => {
    clearErrors();
    if (!selectedEmployeeId) {
      reset({ email: "", password: "" });
      return;
    }
    reset({ email: selectedUser?.email ?? "", password: "" });
  }, [clearErrors, reset, selectedEmployeeId, selectedUser]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const changed =
    draftManager !== committedManagerRef.current ||
    EDITABLE_SCREEN_KEYS.some(
      (screenKey) =>
        draftPermissions[screenKey] !==
          committedPermissionsRef.current[screenKey] ||
        draftWritePermissions[screenKey] !==
          committedWritePermissionsRef.current[screenKey],
    );

  const enabledCount = draftManager
    ? EDITABLE_SCREEN_KEYS.length
    : EDITABLE_SCREEN_KEYS.filter(
        (screenKey) => draftPermissions[screenKey],
      ).length;
  const readOnlyCount = draftManager
    ? 0
    : EDITABLE_SCREEN_KEYS.filter(
        (screenKey) =>
          draftPermissions[screenKey] && !draftWritePermissions[screenKey],
      ).length;

  function scheduleSave(
    nextManager: boolean,
    nextPermissions: PermissionMap,
    nextWritePermissions: PermissionMap,
  ) {
    if (!selectedPosition) return;
    const snapshot = {
      positionId: selectedPosition.id,
      canManagePayrollAccess: nextManager,
      permissions: EDITABLE_SCREEN_KEYS.map((screenKey) => ({
        screenKey,
        allowed: nextManager || Boolean(nextPermissions[screenKey]),
        canWrite:
          nextManager ||
          (Boolean(nextPermissions[screenKey]) &&
            Boolean(nextWritePermissions[screenKey])),
      })),
    };
    latestRef.current = {
      ...snapshot,
      signature: JSON.stringify(snapshot),
    };
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const flush = async () => {
        const current = latestRef.current;
        if (!current || inFlightRef.current) return;
        inFlightRef.current = true;
        setSaving(true);
        try {
          await savePermissions(current.positionId, {
            canManagePayrollAccess: current.canManagePayrollAccess,
            permissions: current.permissions,
          });
          if (user?.positionId === current.positionId) {
            await refreshSession();
          }
          committedManagerRef.current = current.canManagePayrollAccess;
          committedPermissionsRef.current = Object.fromEntries(
            current.permissions
              .filter(
                (permission) => permission.screenKey !== "payroll/accesos",
              )
              .map((permission) => [permission.screenKey, permission.allowed]),
          ) as PermissionMap;
          committedWritePermissionsRef.current = Object.fromEntries(
            current.permissions
              .filter(
                (permission) => permission.screenKey !== "payroll/accesos",
              )
              .map((permission) => [permission.screenKey, permission.canWrite]),
          ) as PermissionMap;
          toast.success("Permisos de Payroll guardados.");
        } catch (cause) {
          setDraftManager(committedManagerRef.current);
          setDraftPermissions(committedPermissionsRef.current);
          setDraftWritePermissions(committedWritePermissionsRef.current);
          toast.error(apiErrorMessage(cause));
        } finally {
          inFlightRef.current = false;
          setSaving(false);
          const latest = latestRef.current;
          if (latest && latest.signature !== current.signature) void flush();
        }
      };
      void flush();
    }, 250);
  }

  function setPermissionLevel(
    screenKey: PayrollScreenKey,
    level: "WRITE" | "READ_ONLY" | "DENIED",
  ) {
    if (draftManager) return;
    const nextPermissions = {
      ...draftPermissions,
      [screenKey]: level !== "DENIED",
    };
    const nextWritePermissions = {
      ...draftWritePermissions,
      [screenKey]: level === "WRITE",
    };
    setDraftPermissions(nextPermissions);
    setDraftWritePermissions(nextWritePermissions);
    scheduleSave(draftManager, nextPermissions, nextWritePermissions);
  }

  function setSectionPermissions(
    section: string,
    level: "WRITE" | "READ_ONLY" | "DENIED",
  ) {
    if (draftManager) return;
    const nextPermissions = { ...draftPermissions };
    const nextWritePermissions = { ...draftWritePermissions };
    PAYROLL_SCREEN_CONFIG.filter((screen) => screen.section === section).forEach(
      (screen) => {
        nextPermissions[screen.key] = level !== "DENIED";
        nextWritePermissions[screen.key] = level === "WRITE";
      },
    );
    setDraftPermissions(nextPermissions);
    setDraftWritePermissions(nextWritePermissions);
    scheduleSave(draftManager, nextPermissions, nextWritePermissions);
  }

  function toggleManager() {
    const nextManager = !draftManager;
    setDraftManager(nextManager);
    scheduleSave(nextManager, draftPermissions, draftWritePermissions);
  }

  function openEmployeeEditor(account: PayrollAccessUser) {
    if (!account.empleadoId) return;
    setSelectedEmployeeId(account.empleadoId);
    setValue("email", account.email);
    setValue("password", "");
    clearErrors();
    setCredentialsDialogOpen(true);
  }

  function openCredentialsDialog() {
    if (!selectedEmployeeId) {
      toast.warning("Selecciona un empleado para continuar.");
      return;
    }
    setValue("email", selectedUser?.email ?? "");
    setValue("password", "");
    clearErrors();
    setCredentialsDialogOpen(true);
  }

  const requestSaveCredentials = handleSubmit((formData) => {
    clearErrors();
    const parsed = credentialsSchema.safeParse(formData);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === "email" || field === "password") {
          setError(field, { type: "validate", message: issue.message });
        }
      });
      return;
    }
    if (!selectedEmployeeId || !selectedEmployee) {
      toast.warning("Selecciona un empleado para continuar.");
      return;
    }
    if (!selectedUser && !parsed.data.password?.trim()) {
      setError("password", {
        type: "required",
        message: "La contraseña es obligatoria para crear la cuenta.",
      });
      return;
    }

    setPendingCredentials({
      employeeId: selectedEmployeeId,
      isUpdate: Boolean(selectedUser),
      data: parsed.data,
    });
    setCredentialsConfirmOpen(true);
  });

  async function confirmSaveCredentials() {
    if (!pendingCredentials) return;

    setSavingCredentials(true);
    try {
      await saveCredentials(pendingCredentials.employeeId, {
        email: pendingCredentials.data.email,
        ...(pendingCredentials.data.password?.trim()
          ? { password: pendingCredentials.data.password }
          : {}),
      });
      toast.success(
        pendingCredentials.isUpdate
          ? "Credenciales actualizadas."
          : "Credenciales creadas.",
      );
      setCredentialsConfirmOpen(false);
      setCredentialsDialogOpen(false);
      setPendingCredentials(null);
      reset({ email: pendingCredentials.data.email, password: "" });
    } catch (cause) {
      toast.error(
        apiErrorMessage(cause, "No se pudieron guardar las credenciales."),
      );
    } finally {
      setSavingCredentials(false);
    }
  }

  async function confirmDeleteUser() {
    if (!userToDelete) return;
    if (userToDelete.rol === "SUPER_ADMIN") {
      toast.warning("La cuenta principal no se puede eliminar.");
      setUserToDelete(null);
      return;
    }

    try {
      await deleteUser(userToDelete.id);
      toast.success("Cuenta de acceso eliminada.");
      if (userToDelete.empleadoId === selectedEmployeeId) {
        setSelectedEmployeeId("");
        reset({ email: "", password: "" });
      }
      setUserToDelete(null);
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "No se pudo eliminar la cuenta."));
    }
  }

  const accountColumns: ColumnDef<PayrollAccessUser>[] = [
    {
      accessorFn: (account) =>
        account.empleado?.nombreCompleto ?? account.nombre,
      id: "employee",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <span className="block min-w-[11rem] max-w-[16rem] whitespace-normal font-medium uppercase leading-5">
          {row.original.empleado?.nombreCompleto ?? row.original.nombre}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "CORREO",
      cell: ({ row }) => (
        <span className="block min-w-[12rem] max-w-[18rem] break-all">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorFn: (account) =>
        account.empleado?.position?.nombre ?? "SIN REGISTRO",
      id: "position",
      header: "PUESTO",
      cell: ({ row }) => (
        <span className="uppercase">
          {row.original.empleado?.position?.nombre ?? "SIN REGISTRO"}
        </span>
      ),
    },
    {
      accessorFn: (account) => account.activo,
      id: "status",
      header: "ESTATUS",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.activo
              ? "bg-[#648672] text-white dark:bg-[#8bb09b] dark:text-[#1a1a1a]"
              : "bg-[#606060] text-white dark:bg-[#4a4a4a]"
          }
        >
          {row.original.activo ? "ACTIVO" : "INACTIVO"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">ACCIONES</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex min-w-[8rem] justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Editar credenciales de ${account.nombre}`}
              title="Editar credenciales"
              onClick={() => openEmployeeEditor(account)}
              disabled={!account.empleadoId}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {account.rol !== "SUPER_ADMIN" ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                aria-label={`Eliminar cuenta de ${account.nombre}`}
                title="Eliminar cuenta"
                onClick={() => setUserToDelete(account)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="page-title">Control de accesos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Permite o deniega la visualización de pantallas de Payroll por
            puesto.
          </p>
        </div>
        <Badge className="bg-[#ecd1c8] text-[#1a1a1a] uppercase dark:bg-[#c3a583]">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          Administrador de Payroll
        </Badge>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

      <Card className="min-w-0">
        <CardHeader className="space-y-2">
          <CardTitle className="uppercase">Credenciales de empleados</CardTitle>
          <CardDescription>
            Crea o actualiza el acceso de un empleado con correo y contraseña
            temporal. La cuenta hereda los permisos de Payroll de su puesto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payroll-employee">Empleado</Label>
            <Combobox
              id="payroll-employee"
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              placeholder={
                loading ? "Cargando empleados…" : "Selecciona un empleado"
              }
              searchPlaceholder="Buscar empleado…"
              emptyMessage="No hay empleados disponibles."
              disabled={loading}
            />
            <p className="text-xs text-[var(--text-muted)]">
              {selectedEmployee
                ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? "SIN REGISTRO"}`
                : "Selecciona un empleado para crear o editar su cuenta."}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] px-3 py-3 sm:px-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium uppercase tracking-wide">
                  {selectedUser ? "Editar acceso" : "Crear acceso"}
                </p>
                <p className="text-sm leading-5 text-[var(--text-muted)]">
                  {selectedEmployee
                    ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? "SIN REGISTRO"}`
                    : "Elige a quién se asignarán las credenciales."}
                </p>
              </div>
              <Button
                type="button"
                className="w-full justify-center sm:w-auto"
                onClick={openCredentialsDialog}
                disabled={!selectedEmployeeId}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {selectedUser
                  ? "Actualizar credenciales"
                  : "Crear credenciales"}
              </Button>
            </div>
          </div>

          <Separator />

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="section-heading uppercase">Estatus de cuenta</h2>
              <p className="text-sm text-[var(--text-muted)]">
                El empleado seguirá existiendo; al eliminar solo se borra su
                cuenta de acceso.
              </p>
            </div>
            <DataTable
              columns={accountColumns}
              data={users}
              emptyMessage="Todavía no hay cuentas de acceso."
              searchPlaceholder="Buscar cuenta…"
              labels={{
                records: "Registros",
                all: "Todos",
                results: (count) => `${count} resultado${count === 1 ? "" : "s"}`,
              }}
            />
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permisos por puesto</CardTitle>
          <CardDescription>
            Define si cada pantalla queda disponible con edición, en solo
            lectura o completamente denegada. Los cambios se guardan
            automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-xl space-y-1.5">
            <Label htmlFor="payroll-position">Puesto</Label>
            <Select
              value={selectedPositionId}
              onValueChange={setSelectedPositionId}
              disabled={loading}
            >
              <SelectTrigger id="payroll-position">
                <SelectValue
                  placeholder={loading ? "Cargando puestos…" : "Selecciona un puesto"}
                />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.nombre} · {position._count.empleados} empleado
                    {position._count.empleados === 1 ? "" : "s"}
                    {position.activo ? "" : " · INACTIVO"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPosition ? (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={draftManager}
                onClick={toggleManager}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  draftManager
                    ? "border-[var(--accent)] bg-[var(--accent-hover)]"
                    : "border-[var(--border-color)] hover:bg-[var(--accent-hover)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    draftManager
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-color)] bg-[var(--bg-card)]"
                  }`}
                >
                  {draftManager ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Administrar accesos de Payroll
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                    Concede todas las pantallas con edición y permite
                    administrar los permisos de otros puestos.
                  </span>
                </span>
                <Badge variant={draftManager ? "default" : "secondary"}>
                  {draftManager ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </button>

              <div className="grid gap-4 xl:grid-cols-2">
                {PAYROLL_SECTION_ORDER.map((section) => {
                  const screens = PAYROLL_SCREEN_CONFIG.filter(
                    (screen) => screen.section === section,
                  );
                  const selected = screens.filter(
                    (screen) =>
                      draftManager || draftPermissions[screen.key],
                  ).length;
                  const readOnly = screens.filter(
                    (screen) =>
                      !draftManager &&
                      draftPermissions[screen.key] &&
                      !draftWritePermissions[screen.key],
                  ).length;
                  return (
                    <section
                      key={section}
                      className="overflow-hidden rounded-xl border border-[var(--border-color)]"
                    >
                      <div className="flex flex-col gap-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="section-heading">
                            {PAYROLL_SECTION_LABELS[section]}
                          </h2>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {selected} de {screens.length} pantallas
                            {readOnly > 0 ? ` · ${readOnly} solo lectura` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={draftManager}
                            onClick={() =>
                              setSectionPermissions(section, "WRITE")
                            }
                          >
                            Edición
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={draftManager}
                            onClick={() =>
                              setSectionPermissions(section, "READ_ONLY")
                            }
                          >
                            Solo lectura
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={draftManager}
                            onClick={() =>
                              setSectionPermissions(section, "DENIED")
                            }
                          >
                            Limpiar
                          </Button>
                        </div>
                      </div>
                      <div className="divide-y divide-[var(--border-color)]">
                        {screens.map((screen) => {
                          const enabled =
                            draftManager || draftPermissions[screen.key];
                          const permissionLevel =
                            draftManager || draftWritePermissions[screen.key]
                              ? "WRITE"
                              : enabled
                                ? "READ_ONLY"
                                : "DENIED";
                          return (
                            <div
                              key={screen.key}
                              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                            >
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <span
                                  aria-hidden="true"
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                    enabled
                                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                      : "border-[var(--border-color)] bg-[var(--bg-card)]"
                                  }`}
                                >
                                  {enabled ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium">
                                    {screen.label}
                                  </span>
                                  <span className="mt-0.5 block text-xs leading-5 text-[var(--text-muted)]">
                                    {screen.description}
                                  </span>
                                </span>
                              </div>
                              <Select
                                value={permissionLevel}
                                onValueChange={(value) =>
                                  setPermissionLevel(
                                    screen.key,
                                    value as "WRITE" | "READ_ONLY" | "DENIED",
                                  )
                                }
                                disabled={draftManager}
                              >
                                <SelectTrigger
                                  className="w-full sm:w-44"
                                  aria-label={`Nivel de acceso para ${screen.label}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="WRITE">
                                    Puede editar
                                  </SelectItem>
                                  <SelectItem value="READ_ONLY">
                                    Solo lectura
                                  </SelectItem>
                                  <SelectItem value="DENIED">
                                    Denegada
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedPosition.nombre}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {draftManager
                      ? "Acceso total, edición y administración"
                      : `${enabledCount} de ${EDITABLE_SCREEN_KEYS.length} pantallas permitidas${readOnlyCount ? ` · ${readOnlyCount} solo lectura` : ""}`}
                  </p>
                </div>
                <Badge variant={saving || changed ? "default" : "secondary"}>
                  {saving || changed ? "GUARDANDO" : "GUARDADO"}
                </Badge>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={credentialsDialogOpen}
        onOpenChange={(open) => {
          setCredentialsDialogOpen(open);
          if (!open) {
            setPendingCredentials(null);
            clearErrors();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Editar acceso" : "Crear acceso"}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? "SIN REGISTRO"}`
                : "Selecciona un empleado para continuar."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={requestSaveCredentials}>
            <div className="space-y-1.5">
              <Label htmlFor="payroll-access-email">Correo</Label>
              <Input
                id="payroll-access-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-red-600 dark:text-red-300" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payroll-access-password">
                Contraseña {selectedUser ? "(opcional)" : "temporal"}
              </Label>
              <Input
                id="payroll-access-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <p className="text-xs text-[var(--text-muted)]">
                {selectedUser
                  ? "Déjala vacía para conservar la contraseña actual."
                  : "Usa al menos 8 caracteres."}
              </p>
              {errors.password ? (
                <p className="text-xs text-red-600 dark:text-red-300" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCredentialsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCredentials}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {savingCredentials
                  ? "Guardando…"
                  : selectedUser
                    ? "Actualizar credenciales"
                    : "Crear credenciales"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={credentialsConfirmOpen}
        onOpenChange={(open) => {
          setCredentialsConfirmOpen(open);
          if (!open && !savingCredentials) setPendingCredentials(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar credenciales</AlertDialogTitle>
            <AlertDialogDescription>
              Se {selectedUser ? "actualizará" : "creará"} la cuenta de acceso
              de <strong>{selectedEmployee?.nombreCompleto ?? "este empleado"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingCredentials}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={savingCredentials}
              onClick={(event) => {
                event.preventDefault();
                void confirmSaveCredentials();
              }}
            >
              {savingCredentials
                ? "Guardando…"
                : selectedUser
                  ? "Actualizar credenciales"
                  : "Crear credenciales"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta de acceso</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no elimina al empleado, pero sí su cuenta y no se
              puede deshacer. Se eliminará el acceso de{" "}
              <strong>
                {userToDelete?.empleado?.nombreCompleto ??
                  userToDelete?.nombre ??
                  "este empleado"}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 dark:bg-red-500 dark:hover:bg-red-600"
              onClick={() => {
                void confirmDeleteUser();
              }}
            >
              Eliminar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
