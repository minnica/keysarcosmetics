"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const refresh = useCallback(async () => {
    const token =
      typeof window === "undefined" ? null : localStorage.getItem("auth_token");
    if (!token) {
      setBootstrap(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      setBootstrap(await schedulerApi.bootstrap());
      setStatus("authenticated");
    } catch {
      setBootstrap(null);
      setStatus("unauthenticated");
    }
  }, []);

  const logout = useCallback(() => {
    schedulerApi.logout();
    setBootstrap(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
