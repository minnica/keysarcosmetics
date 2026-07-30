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
import { api } from "./api";

interface SessionUser {
  id: string;
  nombre: string;
  email: string;
  rol: "SUPER_ADMIN" | "GERENTE" | "CAPTURISTA";
}
type SessionStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "forbidden";
interface SessionValue {
  user: SessionUser | null;
  status: SessionStatus;
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
      setStatus(
        response.data.data.rol === "SUPER_ADMIN"
          ? "authenticated"
          : "forbidden",
      );
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
  const value = useMemo(
    () => ({ user, status, refreshSession, logout }),
    [logout, refreshSession, status, user],
  );
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
  const { status, logout } = useSession();
  useEffect(() => {
    if (status === "unauthenticated")
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-muted)]">
        Validando sesión…
      </div>
    );
  }
  if (status === "forbidden") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center text-sm text-[var(--text-muted)]">
        <p>Esta aplicación está disponible únicamente para SUPER_ADMIN.</p>
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
  return <>{children}</>;
}
