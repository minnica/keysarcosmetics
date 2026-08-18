"use client";

import { RefreshCw } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import { FortnightSelect } from "./fortnight-select";
import type { PayrollPeriodOption } from "@/lib/payroll-periods";
import type { PayrollCalculationMode } from "@/lib/types";

interface LivePayrollControlsProps {
  options: PayrollPeriodOption[];
  periodValue: string;
  onPeriodChange: (value: string) => void;
  mode: PayrollCalculationMode;
  onModeChange: (value: PayrollCalculationMode) => void;
  refreshing: boolean;
  generatedAt?: string | undefined;
  onRefresh: () => void;
}

export function LivePayrollControls({
  options,
  periodValue,
  onPeriodChange,
  mode,
  onModeChange,
  refreshing,
  generatedAt,
  onRefresh,
}: LivePayrollControlsProps) {
  const updateLabel = generatedAt
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(generatedAt))
    : "Pendiente de actualización";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FortnightSelect
            options={options}
            value={periodValue}
            onValueChange={onPeriodChange}
            className="w-full sm:w-64"
          />
          <Select
            value={mode}
            onValueChange={(value) =>
              onModeChange(value as PayrollCalculationMode)
            }
          >
            <SelectTrigger
              className="w-full sm:w-48"
              aria-label="Base de comisión"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WITH_VAT">Calcular con IVA</SelectItem>
              <SelectItem value="WITHOUT_VAT">Calcular sin IVA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-[var(--text-muted)]" role="status">
            Datos vigentes · {updateLabel}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            aria-busy={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
