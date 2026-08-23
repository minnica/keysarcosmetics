"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@cosmetics/ui";
import type { PayrollScreenKey, UsuarioSession } from "@cosmetics/types";
import { api } from "./api";
import {
  getFirstPayrollPath,
  getPayrollScreenByPath,
} from "./access";

type SessionUser = UsuarioSession;
type SessionStatus = "loading" | "authenticated" | "unauthenticated";
interface SessionValue {
  user: SessionUser | null;
  status: SessionStatus;
  canAccess: (screenKey: PayrollScreenKey) => boolean;
  canWrite: (screenKey: PayrollScreenKey) => boolean;
  isAccessManager: boolean;
  firstAccessiblePath: string | null;
  refreshSession: () => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshSession = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const response = await api.get<{ success: boolean; data: SessionUser }>(
        "/api/auth/me",
      );
      setUser(response.data.data);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);
  const value = useMemo<SessionValue>(() => {
    const permissions = user?.payrollScreenPermissions ?? [];
    const permissionSet = new Set(permissions);
    const writePermissionSet = new Set(user?.payrollWritePermissions ?? []);
    const isAccessManager = Boolean(user?.canManagePayrollAccess);
    return {
      user,
      status,
      canAccess: (screenKey) =>
        isAccessManager || permissionSet.has(screenKey),
      canWrite: (screenKey) =>
        isAccessManager || writePermissionSet.has(screenKey),
      isAccessManager,
      firstAccessiblePath: user
        ? getFirstPayrollPath(permissions, isAccessManager)
        : null,
      refreshSession,
      logout,
    };
  }, [logout, refreshSession, status, user]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value)
    throw new Error("useSession debe usarse dentro de SessionProvider.");
  return value;
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, logout, firstAccessiblePath, isAccessManager } =
    useSession();
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status === "loading" || !user) return;

    const screen = getPayrollScreenByPath(pathname);
    const hasAccess = screen
      ? screen.key === "payroll/accesos"
        ? isAccessManager
        : isAccessManager || user.payrollScreenPermissions.includes(screen.key)
      : true;
    if (!hasAccess && firstAccessiblePath && pathname !== firstAccessiblePath) {
      router.replace(firstAccessiblePath);
    }
  }, [firstAccessiblePath, isAccessManager, pathname, router, status, user]);
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-muted)]">
        Validando sesión…
      </div>
    );
  }
  if (!user) return null;

  const screen = getPayrollScreenByPath(pathname);
  const hasAccess = screen
    ? screen.key === "payroll/accesos"
      ? isAccessManager
      : isAccessManager || user.payrollScreenPermissions.includes(screen.key)
    : true;

  if (!firstAccessiblePath) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center text-sm text-[var(--text-muted)]">
        <p>Tu puesto todavía no tiene pantallas de Payroll asignadas.</p>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          Volver al login
        </Button>
      </div>
    );
  }
  if (!hasAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]">
        Redirigiendo…
      </div>
    );
  }
  return <>{children}</>;
}
