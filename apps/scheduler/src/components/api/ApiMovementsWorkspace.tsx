"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Input } from "@cosmetics/ui";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type { DesignMovementRecord } from "../../../design/contracts";
import {
  exportDesignMovementsXlsx,
  formatMovementTime,
  groupDesignMovements,
} from "./scheduler-movement-export";
import { SchedulerPagination } from "@/components/shared/SchedulerPagination";
import {
  paginateSchedulerReportRows,
  type SchedulerReportPageSize,
} from "@/lib/scheduler-report-presentation";

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
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<SchedulerReportPageSize>(20);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMovements(await schedulerDesignProposals.listMovements());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar los movimientos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actors = useMemo(
    () => [
      ...new Map(movements.map((item) => [item.actorId, item.actor])).entries(),
    ],
    [movements],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX");
    return movements.filter(
      (movement) =>
        (actor === "all" || movement.actorId === actor) &&
        (!normalized ||
          [
            movement.actor,
            movement.actorRole,
            movement.action,
            movement.purpose,
            movement.targetType,
            movement.targetId,
            ...Object.values(movement.metadata),
          ]
            .join(" ")
            .toLocaleLowerCase("es-MX")
            .includes(normalized)),
    );
  }, [actor, movements, query]);
  const groups = useMemo(() => groupDesignMovements(filtered), [filtered]);
  const pagination = useMemo(
    () => paginateSchedulerReportRows(groups, page, pageSize),
    [groups, page, pageSize],
  );

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function downloadExcel() {
    setExporting(true);
    setError(null);
    try {
      await exportDesignMovementsXlsx(filtered);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible generar el archivo de Excel.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f6f2ed]">
      <header className="border-b border-[#e8ddd4] bg-white px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Auditoría operativa</p>
            <h1 className="page-title mt-1 text-3xl text-[#263649]">
              Movimientos por agente
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Los movimientos del mismo agente y día se muestran agrupados. Los
              códigos personales nunca se muestran ni se almacenan aquí.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-xl"
              disabled={exporting || filtered.length === 0}
              onClick={() => void downloadExcel()}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Generando…" : "Descargar Excel"}
            </Button>
            <Button
              className="rounded-xl"
              onClick={() => void load()}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
            <ListChecks className="h-5 w-5 text-[#ad8b67]" />
            <p className="mt-3 text-2xl font-semibold text-[#263649]">
              {movements.length}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Movimientos
            </p>
          </div>
          <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
            <UserRound className="h-5 w-5 text-[#ad8b67]" />
            <p className="mt-3 text-2xl font-semibold text-[#263649]">
              {actors.length}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Agentes identificados
            </p>
          </div>
          <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
            <ShieldCheck className="h-5 w-5 text-[#ad8b67]" />
            <p className="mt-3 text-2xl font-semibold text-[#263649]">
              {
                movements.filter((item) => item.purpose !== "SYSTEM_WRITE")
                  .length
              }
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Con código personal
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#e7ddd4] bg-white shadow-sm">
          <div className="grid gap-3 border-b border-[#eee6df] p-4 md:grid-cols-[1fr_260px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 rounded-xl pl-9"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar acción, agente o registro"
                value={query}
              />
            </label>
            <select
              className="h-11 rounded-xl border border-[#dfd5cc] bg-white px-3 text-sm"
              onChange={(event) => {
                setActor(event.target.value);
                setPage(1);
              }}
              value={actor}
            >
              <option value="all">Todos los agentes</option>
              {actors.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Cargando movimientos…
            </p>
          ) : null}
          {error ? (
            <p className="p-8 text-center text-sm text-rose-600">{error}</p>
          ) : null}
          {!loading && !error && filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Aún no hay movimientos que coincidan.
            </p>
          ) : null}
          {groups.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-[#faf8f5] text-xs uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Agente</th>
                    <th className="px-5 py-3">Actividad</th>
                    <th className="px-5 py-3">Movimientos</th>
                    <th className="px-5 py-3">Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee6df]">
                  {pagination.rows.map((group) => {
                    const expanded = expandedGroups.has(group.id);
                    return (
                      <Fragment key={group.id}>
                        <tr className="bg-white transition hover:bg-[#fcfaf8]">
                          <td className="px-5 py-4 text-slate-500">
                            <button
                              aria-expanded={expanded}
                              className="flex items-center gap-2 text-left font-medium text-[#263649]"
                              onClick={() => toggleGroup(group.id)}
                              type="button"
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="capitalize">
                                {group.dayLabel}
                              </span>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#263649]">
                              {group.actor}
                            </p>
                            <p className="text-xs text-slate-400">
                              {group.actorRole}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            <span className="flex items-center gap-2">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatMovementTime(group.firstActivityAt)}–
                              {formatMovementTime(group.lastActivityAt)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="outline">
                              {group.movements.length}{" "}
                              {group.movements.length === 1
                                ? "movimiento"
                                : "movimientos"}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="outline">{group.actorSource}</Badge>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr>
                            <td className="bg-[#faf8f5] px-5 py-4" colSpan={5}>
                              <div className="space-y-2 pl-6">
                                {group.movements.map((movement) => (
                                  <article
                                    className="grid gap-3 rounded-xl border border-[#e8ddd4] bg-white p-3 md:grid-cols-[150px_1fr_240px]"
                                    key={movement.id}
                                  >
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                                        Hora
                                      </p>
                                      <p className="mt-1 text-sm text-slate-600">
                                        {formatMovementDate(movement.createdAt)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-[#263649]">
                                        {movement.action}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-400">
                                        {movement.purpose}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-mono text-xs text-slate-500">
                                        {movement.targetType} ·{" "}
                                        {movement.targetId || "sin ID"}
                                      </p>
                                      {Object.keys(movement.metadata).length ? (
                                        <p className="mt-1 break-words text-xs text-slate-400">
                                          {Object.entries(movement.metadata)
                                            .map(
                                              ([key, value]) =>
                                                `${key}: ${value}`,
                                            )
                                            .join(" · ")}
                                        </p>
                                      ) : null}
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {groups.length ? (
            <SchedulerPagination
              {...pagination}
              label="grupos"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSize={pageSize}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
