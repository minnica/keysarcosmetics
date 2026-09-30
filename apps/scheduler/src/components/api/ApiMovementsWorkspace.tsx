"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Input } from "@cosmetics/ui";
import { Clock3, ListChecks, RefreshCw, Search, ShieldCheck, UserRound } from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type { DesignMovementRecord } from "../../../design/contracts";

function formatMovementDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

export function ApiMovementsWorkspace() {
  const [movements, setMovements] = useState<DesignMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMovements(await schedulerDesignProposals.listMovements());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los movimientos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actors = useMemo(
    () => [...new Map(movements.map((item) => [item.actorId, item.actor])).entries()],
    [movements],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX");
    return movements.filter(
      (movement) =>
        (actor === "all" || movement.actorId === actor) &&
        (!normalized ||
          [movement.actor, movement.actorRole, movement.action, movement.targetId]
            .join(" ")
            .toLocaleLowerCase("es-MX")
            .includes(normalized)),
    );
  }, [actor, movements, query]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f6f2ed]">
      <header className="border-b border-[#e8ddd4] bg-white px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Auditoría operativa</p>
            <h1 className="page-title mt-1 text-3xl text-[#263649]">Movimientos por agente</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Altas, cambios, estados y cancelaciones autorizadas. Los códigos personales nunca se muestran ni se almacenan aquí.
            </p>
          </div>
          <Button className="rounded-xl" onClick={() => void load()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
            <ListChecks className="h-5 w-5 text-[#ad8b67]" />
            <p className="mt-3 text-2xl font-semibold text-[#263649]">{movements.length}</p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Movimientos</p>
          </div>
          <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
            <UserRound className="h-5 w-5 text-[#ad8b67]" />
            <p className="mt-3 text-2xl font-semibold text-[#263649]">{actors.length}</p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Agentes identificados</p>
          </div>
          <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
            <ShieldCheck className="h-5 w-5 text-[#ad8b67]" />
            <p className="mt-3 text-2xl font-semibold text-[#263649]">
              {movements.filter((item) => item.purpose !== "SYSTEM_WRITE").length}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Con código personal</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#e7ddd4] bg-white shadow-sm">
          <div className="grid gap-3 border-b border-[#eee6df] p-4 md:grid-cols-[1fr_260px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="h-11 rounded-xl pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar acción, agente o registro" value={query} />
            </label>
            <select className="h-11 rounded-xl border border-[#dfd5cc] bg-white px-3 text-sm" onChange={(event) => setActor(event.target.value)} value={actor}>
              <option value="all">Todos los agentes</option>
              {actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Cargando movimientos…</p> : null}
          {error ? <p className="p-8 text-center text-sm text-rose-600">{error}</p> : null}
          {!loading && !error && filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Aún no hay movimientos que coincidan.</p>
          ) : null}
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-[#faf8f5] text-xs uppercase tracking-[0.12em] text-slate-400">
                  <tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Agente</th><th className="px-5 py-3">Movimiento</th><th className="px-5 py-3">Registro</th><th className="px-5 py-3">Origen</th></tr>
                </thead>
                <tbody className="divide-y divide-[#eee6df]">
                  {filtered.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-5 py-4 text-slate-500"><span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />{formatMovementDate(movement.createdAt)}</span></td>
                      <td className="px-5 py-4"><p className="font-semibold text-[#263649]">{movement.actor}</p><p className="text-xs text-slate-400">{movement.actorRole}</p></td>
                      <td className="px-5 py-4"><p className="font-medium">{movement.action}</p><p className="text-xs text-slate-400">{movement.purpose}</p></td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{movement.targetType} · {movement.targetId || "sin ID"}</td>
                      <td className="px-5 py-4"><Badge variant="outline">{movement.actorSource}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
