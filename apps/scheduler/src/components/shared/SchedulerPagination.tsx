"use client";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SchedulerReportPageSize } from "@/lib/scheduler-report-presentation";

interface SchedulerPaginationProps {
  from: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: SchedulerReportPageSize) => void;
  page: number;
  pageSize: SchedulerReportPageSize;
  to: number;
  total: number;
  totalPages: number;
  label?: string;
}

export function SchedulerPagination({
  from,
  label = "registros",
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  to,
  total,
  totalPages,
}: SchedulerPaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#eee6df] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>Mostrar</span>
        <Select
          onValueChange={(value) => {
            onPageSizeChange(
              value === "ALL"
                ? "ALL"
                : (Number(value) as Exclude<SchedulerReportPageSize, "ALL">),
            );
            onPageChange(1);
          }}
          value={String(pageSize)}
        >
          <SelectTrigger
            aria-label={`${label} por página`}
            className="h-9 w-[104px] rounded-xl bg-white"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="40">40</SelectItem>
            <SelectItem value="60">60</SelectItem>
            <SelectItem value="ALL">Todos</SelectItem>
          </SelectContent>
        </Select>
        <span>
          {from}–{to} de {total} {label}
        </span>
      </div>
      {pageSize !== "ALL" ? (
        <div className="flex items-center gap-2">
          <Button
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <span className="min-w-[86px] text-center text-xs font-medium text-slate-500">
            Página {page} de {totalPages}
          </span>
          <Button
            aria-label="Página siguiente"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            size="sm"
            variant="outline"
          >
            Siguiente <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
