"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  SchedulerAuthorizationDto,
  SchedulerAuthorizationRequestDto,
  SchedulerBootstrapDto,
  SchedulerCapability,
} from "@cosmetics/types";
import { schedulerApi } from "./api";
import {
  canAccessSchedulerScreen,
  type SchedulerScreenId,
} from "./scheduler-access";
import {
  schedulerSessionRefreshIntervalMs,
  shouldAcceptSchedulerSessionResponse,
} from "./scheduler-session-state";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SchedulerSessionValue {
  bootstrap: SchedulerBootstrapDto | null;
  status: SessionStatus;
  canAccess: (
    screenId: SchedulerScreenId,
    capability?: SchedulerCapability,
  ) => boolean;
  refresh: () => Promise<void>;
  authorize: (
    input: SchedulerAuthorizationRequestDto,
  ) => Promise<SchedulerAuthorizationDto>;
  logout: () => void;
}

const SchedulerSessionContext = createContext<SchedulerSessionValue | null>(
  null,
);

export function SchedulerSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bootstrap, setBootstrap] = useState<SchedulerBootstrapDto | null>(
    null,
  );
  const [status, setStatus] = useState<SessionStatus>("loading");
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const token =
      typeof window === "undefined" ? null : localStorage.getItem("auth_token");
    const request = ++requestRef.current;
    if (!token) {
      setBootstrap(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const nextBootstrap = await schedulerApi.bootstrap();
      const currentToken =
        typeof window === "undefined"
          ? null
          : localStorage.getItem("auth_token");
      if (
        !shouldAcceptSchedulerSessionResponse({
          request,
          currentRequest: requestRef.current,
          token,
          currentToken,
        })
      ) {
        return;
      }
      setBootstrap(nextBootstrap);
      setStatus("authenticated");
    } catch {
      if (request !== requestRef.current) return;
      setBootstrap(null);
      setStatus("unauthenticated");
    }
  }, []);

  const logout = useCallback(() => {
    requestRef.current += 1;
    schedulerApi.logout();
    setBootstrap(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const revalidate = () => void refresh();
    const revalidateVisible = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    const revalidateToken = (event: StorageEvent) => {
      if (event.key === "auth_token") revalidate();
    };
    const interval = window.setInterval(
      revalidate,
      schedulerSessionRefreshIntervalMs,
    );
    window.addEventListener("focus", revalidate);
    window.addEventListener("storage", revalidateToken);
    document.addEventListener("visibilitychange", revalidateVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("storage", revalidateToken);
      document.removeEventListener("visibilitychange", revalidateVisible);
    };
  }, [refresh, status]);

  const value = useMemo<SchedulerSessionValue>(
    () => ({
      bootstrap,
      status,
      canAccess: (screenId, capability = "READ") =>
        canAccessSchedulerScreen(bootstrap, screenId, capability),
      refresh,
      authorize: async (input) => {
        const authorization = await schedulerApi.createAuthorization(input);
        await schedulerApi.consumeAuthorization({
          token: authorization.token,
          purpose: input.purpose,
          screenKey: input.screenKey,
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.targetType ? { targetType: input.targetType } : {}),
          ...(input.targetId ? { targetId: input.targetId } : {}),
        });
        return authorization;
      },
      logout,
    }),
    [bootstrap, logout, refresh, status],
  );

  return (
    <SchedulerSessionContext.Provider value={value}>
      {children}
    </SchedulerSessionContext.Provider>
  );
}

export function useSchedulerSession(): SchedulerSessionValue {
  const value = useContext(SchedulerSessionContext);
  if (!value) {
    throw new Error(
      "useSchedulerSession debe usarse dentro de SchedulerSessionProvider",
    );
  }
  return value;
}
