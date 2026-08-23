"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import type { PayrollScreenKey } from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import {
  PAYROLL_SCREEN_CONFIG,
  PAYROLL_SECTION_LABELS,
  PAYROLL_SECTION_ORDER,
} from "@/lib/access";
import {
  type PayrollAccessPermission,
  usePayrollAccessAdmin,
} from "@/hooks/use-payroll-access-admin";
import { apiErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";

type PermissionMap = Record<PayrollScreenKey, boolean>;

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
  const { positions, loading, error, savePermissions } =
    usePayrollAccessAdmin();
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [draftManager, setDraftManager] = useState(false);
  const [draftPermissions, setDraftPermissions] =
    useState<PermissionMap>(emptyPermissionMap);
  const [saving, setSaving] = useState(false);
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

  const selectedPosition = useMemo(
    () =>
      positions.find((position) => position.id === selectedPositionId) ?? null,
    [positions, selectedPositionId],
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
    setDraftManager(selectedPosition.canManagePayrollAccess);
    setDraftPermissions(permissions);
    committedManagerRef.current = selectedPosition.canManagePayrollAccess;
    committedPermissionsRef.current = permissions;
  }, [positions, selectedPosition, selectedPositionId]);

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
        committedPermissionsRef.current[screenKey],
    );

  const enabledCount = draftManager
    ? EDITABLE_SCREEN_KEYS.length
    : EDITABLE_SCREEN_KEYS.filter(
        (screenKey) => draftPermissions[screenKey],
      ).length;

  function scheduleSave(
    nextManager: boolean,
    nextPermissions: PermissionMap,
  ) {
    if (!selectedPosition) return;
    const snapshot = {
      positionId: selectedPosition.id,
      canManagePayrollAccess: nextManager,
      permissions: EDITABLE_SCREEN_KEYS.map((screenKey) => ({
        screenKey,
        allowed: nextManager || Boolean(nextPermissions[screenKey]),
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
          toast.success("Permisos de Payroll guardados.");
        } catch (cause) {
          setDraftManager(committedManagerRef.current);
          setDraftPermissions(committedPermissionsRef.current);
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

  function togglePermission(screenKey: PayrollScreenKey) {
    if (draftManager) return;
    const next = {
      ...draftPermissions,
      [screenKey]: !draftPermissions[screenKey],
    };
    setDraftPermissions(next);
    scheduleSave(draftManager, next);
  }

  function setSectionPermissions(section: string, allowed: boolean) {
    if (draftManager) return;
    const next = { ...draftPermissions };
    PAYROLL_SCREEN_CONFIG.filter((screen) => screen.section === section).forEach(
      (screen) => {
        next[screen.key] = allowed;
      },
    );
    setDraftPermissions(next);
    scheduleSave(draftManager, next);
  }

  function toggleManager() {
    const nextManager = !draftManager;
    setDraftManager(nextManager);
    scheduleSave(nextManager, draftPermissions);
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Permisos por puesto</CardTitle>
          <CardDescription>
            Los cambios se guardan automáticamente al seleccionar cada
            pantalla.
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
                    Concede todas las pantallas y permite administrar los
                    permisos de otros puestos.
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
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={draftManager}
                            onClick={() => setSectionPermissions(section, true)}
                          >
                            Seleccionar todas
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={draftManager}
                            onClick={() => setSectionPermissions(section, false)}
                          >
                            Limpiar
                          </Button>
                        </div>
                      </div>
                      <div className="divide-y divide-[var(--border-color)]">
                        {screens.map((screen) => {
                          const enabled =
                            draftManager || draftPermissions[screen.key];
                          return (
                            <button
                              key={screen.key}
                              type="button"
                              aria-pressed={enabled}
                              disabled={draftManager}
                              onClick={() => togglePermission(screen.key)}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:opacity-75"
                            >
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
                              <Badge variant={enabled ? "default" : "secondary"}>
                                {enabled ? "PERMITIDA" : "DENEGADA"}
                              </Badge>
                            </button>
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
                      ? "Acceso total y administración"
                      : `${enabledCount} de ${EDITABLE_SCREEN_KEYS.length} pantallas permitidas`}
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
    </div>
  );
}
