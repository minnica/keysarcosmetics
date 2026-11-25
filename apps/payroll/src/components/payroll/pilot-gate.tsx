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
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PilotCut } from "@cosmetics/types";
import { Button } from "@cosmetics/ui";
import { PayrollDemoProvider, type DemoState } from "./payroll-demo-context";
import { buildPilotState } from "@/lib/pilot-state";

const CutContext = createContext<PilotCut | null>(null);
export function usePilotCut() {
  const cut = useContext(CutContext);
  if (!cut) throw Error("Corte no disponible");
  return cut;
}
export function PilotGate({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const login = path === "/login";
  const [cut, setCut] = useState<PilotCut | null>(null),
    [error, setError] = useState(""),
    [attempt, retry] = useState(0);
  useEffect(() => {
    if (login) {
      setCut(null);
      setError("");
      return;
    }
    const abort = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/piloto/cut", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (res.status === 401) {
          setCut(null);
          router.replace("/login");
          return;
        }
        if (!res.ok)
          throw Error(
            (await res.json()).message ?? "El corte aún no está disponible.",
          );
        const next: PilotCut = await res.json();
        if (!abort.signal.aborted) {
          setCut(next);
          setError("");
        }
      } catch (err) {
        if (!abort.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Error al cargar el corte.",
          );
      }
    })();
    return () => abort.abort();
  }, [login, router, attempt]);
  if (login) return <>{children}</>;
  if (!cut || error)
    return (
      <main className="mx-auto grid max-w-xl gap-4 p-10">
        <h1 className="text-2xl font-semibold">Piloto de nómina</h1>
        <p role="status">{error || "Cargando el corte del piloto…"}</p>
        {error && (
          <Button
            onClick={() => {
              setError("");
              retry((n) => n + 1);
            }}
          >
            Reintentar
          </Button>
        )}
      </main>
    );
  return (
    <CutContext.Provider value={cut}>
      <Workspace key={cut.id} cut={cut}>
        {children}
      </Workspace>
    </CutContext.Provider>
  );
}

function persistable(key: string, value: unknown) {
  if (key !== "employees") return value;
  return (value as DemoState["employees"])
    .filter((e) => e.id !== "pilot-operator")
    .map((e) => {
      const copy = { ...e, account: "", clabe: "", bank: "PRUEBA" };
      delete copy.accessPassword;
      delete copy.secondaryAccessKey;
      return copy;
    });
}
function Workspace({
  cut,
  children,
}: {
  cut: PilotCut;
  children: React.ReactNode;
}) {
  const original = useMemo(() => buildPilotState(cut.original), [cut]);
  const [state, setState] = useState<DemoState>(() => {
    const saved = { ...original, ...cut.changes } as DemoState;
    if (cut.changes.employees)
      saved.employees = [
        ...saved.employees.filter((e) => e.id !== "pilot-operator"),
        ...original.employees.filter((e) => e.id === "pilot-operator"),
      ];
    return saved;
  });
  const latest = useRef(state),
    saved = useRef(state),
    revision = useRef(cut.revision),
    busy = useRef(false),
    alive = useRef(true);
  const [status, setStatus] = useState("Guardado"),
    [failed, setFailed] = useState(false),
    [conflict, setConflict] = useState(false);
  const periods = useMemo(
    () =>
      cut.original.periods
        .map((p) => ({
          value: p.start,
          start: p.start,
          end: p.finish,
          label: p.start + " — " + p.finish,
        }))
        .reverse(),
    [cut],
  );
  const current = periods.find((p) => p.start === cut.original.openStart)!;
  const save = useCallback(async () => {
    if (busy.current || conflict) return;
    busy.current = true;
    setFailed(false);
    try {
      while (alive.current && latest.current !== saved.current) {
        const snapshot = latest.current;
        const changes: Record<string, unknown> = {};
        for (const name of Object.keys(snapshot) as (keyof DemoState)[]) {
          if (
            name === "activeEmployeeId" ||
            name === "sales" ||
            snapshot[name] === saved.current[name]
          )
            continue;
          changes[name] = persistable(name, snapshot[name]);
        }
        if (Object.keys(changes).length) {
          setStatus("Guardando…");
          const res = await fetch("/api/piloto/cut", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: cut.id,
              revision: revision.current,
              changes,
            }),
          });
          if (res.status === 409) {
            if (alive.current) {
              setConflict(true);
              setStatus(
                "Otro operador guardó cambios o se cargó un corte nuevo. Tus cambios están sólo en esta pestaña.",
              );
            }
            return;
          }
          if (!res.ok)
            throw Error(
              res.status === 401
                ? "La sesión venció. Vuelve a ingresar."
                : "No se guardaron los últimos cambios.",
            );
          revision.current = (await res.json()).revision;
        }
        saved.current = snapshot;
      }
      if (alive.current) setStatus("Guardado");
    } catch (e) {
      if (alive.current) {
        setFailed(true);
        setStatus(e instanceof Error ? e.message : "Error al guardar.");
      }
    } finally {
      busy.current = false;
    }
  }, [conflict, cut.id]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    latest.current = state;
    if (!conflict && state !== saved.current) void save();
  }, [state, save, conflict]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (latest.current !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  const logout = useCallback(() => {
    if (
      latest.current !== saved.current &&
      !window.confirm("Hay cambios pendientes de guardar. ¿Cerrar la sesión?")
    )
      return;
    void fetch("/api/piloto/logout", { method: "POST" }).then(() =>
      window.location.replace("/login"),
    );
  }, []);
  const stamp = new Date(cut.original.capturedAt).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
  });
  return (
    <PayrollDemoProvider
      state={state}
      original={original}
      setState={setState}
      periodOptions={periods}
      currentPeriod={current}
      onLogout={logout}
    >
      <aside
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-amber-300 bg-amber-100 px-3 py-2 text-sm text-stone-900"
        aria-label="Estado del piloto"
      >
        <strong>PRUEBA · Nómina</strong>
        <span>Corte del {stamp} CDMX</span>
        <Link className="underline" href="/conciliacion">
          Conciliar importes
        </Link>
        <span role="status">{status}</span>
        {failed && (
          <button className="underline" onClick={() => void save()}>
            Reintentar guardado
          </button>
        )}
        {conflict && (
          <button
            className="underline"
            onClick={() => window.location.reload()}
          >
            Cargar versión guardada
          </button>
        )}
      </aside>
      {children}
    </PayrollDemoProvider>
  );
}
