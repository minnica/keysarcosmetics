"use client";

import { Info, Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { Badge, Button, Input, Label } from "@cosmetics/ui";
import type { CommissionTier } from "./payroll-demo-context";

export interface ScaleLevelDraft {
  id: string;
  upperLimit: string;
  rate: string;
}

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function draftId(index: number) {
  return `scale-level-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

export function scaleLevelsFromTiers(
  tiers: Array<Pick<CommissionTier, "to" | "rate">> | undefined,
  defaults: Array<{ upperLimit: string; rate: string }>,
): ScaleLevelDraft[] {
  const source = tiers?.length
    ? tiers.map((tier) => ({
        upperLimit: tier.to === null ? "" : String(tier.to),
        rate: String(tier.rate * 100),
      }))
    : defaults;
  return source.map((level, index) => ({ ...level, id: draftId(index) }));
}

export function scaleLevelsToTiers(
  levels: ScaleLevelDraft[],
  maxRate = 100,
): Omit<CommissionTier, "id">[] | null {
  if (levels.length < 2) return null;
  let from = 0;
  const tiers: Omit<CommissionTier, "id">[] = [];
  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index]!;
    const isLast = index === levels.length - 1;
    const rate = Number(level.rate);
    const to = isLast ? null : Number(level.upperLimit);
    if (
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > maxRate ||
      (!isLast && (!Number.isFinite(to) || Number(to) < from))
    )
      return null;
    tiers.push({ from, to, rate: rate / 100 });
    if (to !== null) from = Number((to + 0.01).toFixed(2));
  }
  return tiers;
}

export function CommissionScaleEditor({
  levels,
  onChange,
  maxRate = 100,
  title = "Escala de comisión",
  description = "Define rangos continuos; el primer nivel inicia en $0 y el último permanece sin límite.",
}: {
  levels: ScaleLevelDraft[];
  onChange: (levels: ScaleLevelDraft[]) => void;
  maxRate?: number;
  title?: string;
  description?: string;
}) {
  const parsed = scaleLevelsToTiers(levels, maxRate);

  function updateLevel(index: number, patch: Partial<ScaleLevelDraft>) {
    onChange(
      levels.map((level, levelIndex) =>
        levelIndex === index ? { ...level, ...patch } : level,
      ),
    );
  }

  function addLevel() {
    const last = levels.at(-1);
    const previousLimit = Number(levels.at(-2)?.upperLimit ?? 0);
    const increment = Math.max(
      10000,
      Math.round((Math.max(previousLimit, 20000) * 0.4) / 1000) * 1000,
    );
    const nextLimit = previousLimit + increment;
    const currentLastRate = Number(last?.rate ?? 0);
    onChange([
      ...levels.slice(0, -1),
      {
        ...(last ?? { id: draftId(levels.length), rate: "0" }),
        upperLimit: String(nextLimit),
      },
      {
        id: draftId(levels.length + 1),
        upperLimit: "",
        rate: String(Math.min(maxRate, currentLastRate + 2)),
      },
    ]);
  }

  function removeLevel(index: number) {
    if (levels.length <= 2) return;
    const next = levels.filter((_, levelIndex) => levelIndex !== index);
    onChange(
      next.map((level, levelIndex) =>
        levelIndex === next.length - 1 ? { ...level, upperLimit: "" } : level,
      ),
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-[0_12px_36px_rgba(70,53,38,0.05)]">
      <div className="border-b border-[color:var(--border-color)] bg-[linear-gradient(135deg,var(--accent-hover),transparent)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--text-secondary)]" />
              <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[color:var(--text-muted)]">
              {description}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              parsed
                ? "border-emerald-400 text-emerald-700 dark:text-emerald-300"
                : "border-rose-400 text-rose-700 dark:text-rose-300"
            }
          >
            {parsed ? `${levels.length} NIVELES VÁLIDOS` : "REVISAR ESCALA"}
          </Badge>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]/70 p-3 text-xs text-[color:var(--text-muted)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-secondary)]" />
          <span>
            Modifica únicamente el límite superior de cada nivel. El inicio del
            siguiente se calcula automáticamente para evitar espacios o montos
            duplicados.
          </span>
        </div>
      </div>

      <div className="divide-y divide-[color:var(--border-color)]">
        {levels.map((level, index) => {
          const isLast = index === levels.length - 1;
          const previousLimit =
            index === 0 ? -0.01 : Number(levels[index - 1]?.upperLimit);
          const from =
            index === 0
              ? 0
              : Number.isFinite(previousLimit)
                ? Number((previousLimit + 0.01).toFixed(2))
                : 0;
          const upper = Number(level.upperLimit);
          const invalidLimit =
            !isLast && (!Number.isFinite(upper) || upper < from);
          const rate = Number(level.rate);
          const invalidRate =
            !Number.isFinite(rate) || rate < 0 || rate > maxRate;
          return (
            <article
              key={level.id}
              className="relative p-4 transition-colors hover:bg-[color:var(--accent-hover)]/15 sm:p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isLast ? "bg-[color:var(--text-primary)] text-[color:var(--bg-card)]" : "bg-[color:var(--accent-hover)] text-[color:var(--text-primary)]"}`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">Nivel {index + 1}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {isLast
                        ? "Nivel superior sin límite"
                        : `Continúa automáticamente desde ${money.format(from)}`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={levels.length <= 2}
                  onClick={() => removeLevel(index)}
                  aria-label={`Eliminar nivel ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.85fr]">
                <div className="space-y-2">
                  <Label>Ventas desde</Label>
                  <div className="flex h-10 items-center rounded-xl border border-[color:var(--control-border)] bg-[color:var(--input-disabled-bg)] px-3 text-sm font-semibold text-[color:var(--text-muted)]">
                    {money.format(from)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`scale-limit-${level.id}`}>
                    Ventas hasta
                  </Label>
                  {isLast ? (
                    <div className="flex h-10 items-center rounded-xl border border-[color:var(--control-border)] bg-[color:var(--input-disabled-bg)] px-3 text-sm font-semibold">
                      SIN LÍMITE
                    </div>
                  ) : (
                    <>
                      <Input
                        id={`scale-limit-${level.id}`}
                        type="number"
                        min={from}
                        step="0.01"
                        value={level.upperLimit}
                        onChange={(event) =>
                          updateLevel(index, { upperLimit: event.target.value })
                        }
                        aria-invalid={invalidLimit}
                      />
                      {invalidLimit && (
                        <p className="text-xs text-rose-600">
                          Debe ser igual o mayor que {money.format(from)}.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`scale-rate-${level.id}`}>Comisión</Label>
                  <div className="relative">
                    <Input
                      id={`scale-rate-${level.id}`}
                      className="pr-9"
                      type="number"
                      min="0"
                      max={maxRate}
                      step="0.1"
                      value={level.rate}
                      onChange={(event) =>
                        updateLevel(index, { rate: event.target.value })
                      }
                      aria-invalid={invalidRate}
                    />
                    <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-semibold text-[color:var(--text-muted)]">
                      %
                    </span>
                  </div>
                  {invalidRate && (
                    <p className="text-xs text-rose-600">
                      Captura un porcentaje entre 0 y {maxRate}.
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addLevel}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar otro nivel
        </Button>
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
          <TrendingUp className="h-4 w-4" />
          <span>
            {parsed
              ? `Escala continua de ${money.format(0)} a sin límite`
              : "Corrige los campos marcados antes de guardar"}
          </span>
        </div>
      </div>
    </section>
  );
}
