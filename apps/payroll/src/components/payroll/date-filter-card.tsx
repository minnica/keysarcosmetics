"use client";

import { RotateCcw } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  DateRangePicker,
  type DateRange,
} from "@cosmetics/ui";

type DateFilterCardProps = {
  value: DateRange;
  onChange: (value: DateRange) => void;
  resultCount: number;
};

export function DateFilterCard({
  value,
  onChange,
  resultCount,
}: DateFilterCardProps) {
  const hasFilter = Boolean(value.from || value.to);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">
            Periodo de registros
          </p>
          <DateRangePicker
            value={value}
            onChange={onChange}
            fromLabel="Desde"
            toLabel="Hasta"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
            {resultCount} {resultCount === 1 ? "registro" : "registros"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasFilter}
            onClick={() => onChange({ from: "", to: "" })}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Limpiar fechas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
