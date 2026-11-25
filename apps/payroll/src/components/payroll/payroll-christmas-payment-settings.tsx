"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Save, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
} from "@cosmetics/ui";
import {
  type DemoChristmasBonusPaymentPeriod,
  usePayrollDemo,
} from "./payroll-demo-context";

function newPeriod(year: number, index: number): DemoChristmasBonusPaymentPeriod {
  return {
    id: `christmas-payment-${year}-${Date.now()}-${index}`,
    year,
    name: `PAGO ${index}`,
    paymentDate: `${year}-12-15`,
    percentage: 0,
    active: true,
  };
}

export function PayrollChristmasPaymentSettings() {
  const { state, replaceChristmasBonusPaymentPeriods } = usePayrollDemo();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const savedPeriods = useMemo(
    () =>
      state.christmasBonusPaymentPeriods
        .filter((period) => period.year === year)
        .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)),
    [state.christmasBonusPaymentPeriods, year],
  );
  const [periods, setPeriods] = useState<DemoChristmasBonusPaymentPeriod[]>(
    savedPeriods,
  );

  useEffect(() => setPeriods(savedPeriods), [savedPeriods]);

  const activeTotal = periods
    .filter((period) => period.active)
    .reduce((sum, period) => sum + period.percentage, 0);

  function patchPeriod(
    periodId: string,
    patch: Partial<DemoChristmasBonusPaymentPeriod>,
  ) {
    setPeriods((current) =>
      current.map((period) =>
        period.id === periodId ? { ...period, ...patch } : period,
      ),
    );
  }

  function save() {
    const activePeriods = periods.filter((period) => period.active);
    const invalid = periods.some(
      (period) =>
        !period.name.trim() ||
        !period.paymentDate ||
        !period.paymentDate.startsWith(`${year}-`) ||
        period.percentage < 0 ||
        period.percentage > 1,
    );
    if (!activePeriods.length || invalid || Math.abs(activeTotal - 1) > 0.001) {
      toast.error(
        "Activa al menos un pago, usa fechas del ejercicio y distribuye exactamente 100%.",
      );
      return;
    }
    replaceChristmasBonusPaymentPeriods(
      year,
      periods.map((period) => ({
        ...period,
        name: period.name.trim().toLocaleUpperCase("es-MX"),
      })),
    );
    toast.success(
      "Calendario de aguinaldo actualizado para nómina, consolidado y reportes.",
    );
  }

  return (
    <Card className="border-[color:var(--border-color)]">
      <CardHeader className="border-b border-[color:var(--border-color)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-[#8a6744]" />
              Periodos de pago de aguinaldo
            </CardTitle>
            <CardDescription>
              Define una fecha única o divide el 100% en varios pagos. La
              columna de aguinaldo solo aparece en los periodos configurados.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="christmas-payment-year" className="sr-only">
              Ejercicio de aguinaldo
            </Label>
            <Input
              id="christmas-payment-year"
              className="h-9 w-28"
              type="number"
              min="2020"
              max="2100"
              value={year}
              onChange={(event) =>
                setYear(Math.max(2020, Number(event.target.value) || currentYear))
              }
            />
            <Badge
              variant="outline"
              className={
                Math.abs(activeTotal - 1) <= 0.001
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }
            >
              {(activeTotal * 100).toFixed(0)}% DISTRIBUIDO
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-2">
          {periods.map((period, index) => (
            <div
              key={period.id}
              className="grid gap-2 rounded-xl border border-[color:var(--border-color)] p-3 md:grid-cols-[minmax(180px,1fr)_170px_120px_108px_40px] md:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`${period.id}-name`}>Nombre del pago</Label>
                <Input
                  id={`${period.id}-name`}
                  className="h-9"
                  value={period.name}
                  onChange={(event) =>
                    patchPeriod(period.id, { name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${period.id}-date`}>Fecha de pago</Label>
                <Input
                  id={`${period.id}-date`}
                  className="h-9"
                  type="date"
                  value={period.paymentDate}
                  onChange={(event) =>
                    patchPeriod(period.id, {
                      paymentDate: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${period.id}-percentage`}>Porcentaje</Label>
                <Input
                  id={`${period.id}-percentage`}
                  className="h-9"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={
                    period.percentage === 0 ? "" : period.percentage * 100
                  }
                  onChange={(event) =>
                    patchPeriod(period.id, {
                      percentage: Math.max(
                        0,
                        Math.min(100, Number(event.target.value) || 0),
                      ) / 100,
                    })
                  }
                />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={period.active}
                onClick={() =>
                  patchPeriod(period.id, { active: !period.active })
                }
                className={`flex h-9 items-center justify-center rounded-lg border px-3 text-[10px] font-semibold ${period.active ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-[color:var(--border-color)] text-[color:var(--text-muted)]"}`}
              >
                {period.active ? "ACTIVO" : "APAGADO"}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-rose-600"
                aria-label={`Eliminar pago ${index + 1}`}
                onClick={() =>
                  setPeriods((current) =>
                    current.filter((item) => item.id !== period.id),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPeriods((current) => [
                ...current,
                newPeriod(year, current.length + 1),
              ])
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Añadir parcialidad
          </Button>
          <Button type="button" size="sm" onClick={save}>
            <Save className="mr-1.5 h-4 w-4" /> Guardar calendario
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
