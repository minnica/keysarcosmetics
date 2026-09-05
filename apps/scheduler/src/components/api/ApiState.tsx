"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, Skeleton } from "@cosmetics/ui";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { schedulerApiErrorMessage, schedulerApiErrorStatus } from "@/lib/api";

export interface SchedulerQueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useSchedulerQuery<T>(
  loader: () => Promise<T>,
  dependencies: readonly unknown[],
  enabled = true,
): SchedulerQueryState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestRef = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (request === requestRef.current) setData(result);
    } catch (cause) {
      if (request === requestRef.current) {
        setError(schedulerApiErrorMessage(cause));
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void reload();
    else {
      requestRef.current += 1;
      setLoading(false);
      setData(null);
      setError(null);
    }
    // dependencies are intentionally controlled by each query owner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, ...dependencies]);

  return { data, error, loading, reload, setData };
}

export function QueryBoundary({
  loading,
  error,
  empty,
  emptyTitle = "Sin información",
  emptyDescription = "No hay registros para los filtros seleccionados.",
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div aria-label="Cargando" className="space-y-3 py-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
        <p className="mt-3 font-semibold text-red-900">No se pudo cargar</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dccfc3] bg-[#fcfaf8] p-8 text-center">
        <Inbox className="mx-auto h-7 w-7 text-[#ad8b67]" />
        <p className="mt-3 font-semibold text-[#263649]">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
      </div>
    );
  }
  return children;
}

export function ConflictNotice({
  message,
  onReload,
}: {
  message: string | null;
  onReload: () => void;
}) {
  if (!message) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <Button size="sm" variant="outline" onClick={onReload}>
        Recargar versión
      </Button>
    </div>
  );
}

export async function runSchedulerMutation(
  mutation: () => Promise<unknown>,
  handlers: {
    onSuccess: () => void | Promise<void>;
    onError: (message: string) => void;
    onConflict: (message: string) => void;
  },
) {
  try {
    await mutation();
    await handlers.onSuccess();
  } catch (cause) {
    const message = schedulerApiErrorMessage(cause);
    if (schedulerApiErrorStatus(cause) === 409) handlers.onConflict(message);
    else handlers.onError(message);
  }
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-[#e8ddd4] bg-[linear-gradient(180deg,#fff_0%,#fbf8f4_100%)] px-5 py-7 sm:px-7 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">{eyebrow}</p>
          <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3rem)]">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {actions}
      </div>
    </header>
  );
}

