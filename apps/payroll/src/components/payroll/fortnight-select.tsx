"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import { formatPayrollMonth } from "@/lib/payroll-periods";

export interface FortnightSelectOption {
  value: string;
  month: string;
  from: string;
  to: string;
  shortLabel: string;
  label?: string;
}

interface FortnightSelectProps {
  options: FortnightSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  getStatusLabel?: (option: FortnightSelectOption) => string | undefined;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}

function periodName(option: FortnightSelectOption) {
  return Number(option.from.slice(-2)) <= 15
    ? "1ª quincena"
    : "2ª quincena";
}

function dateRange(option: FortnightSelectOption) {
  return `${Number(option.from.slice(-2))}–${Number(option.to.slice(-2))}`;
}

function periodDescription(option: FortnightSelectOption) {
  return `${periodName(option)} · ${dateRange(option)}`;
}

export function FortnightSelect({
  options,
  value,
  onValueChange,
  getStatusLabel,
  className,
  ariaLabel = "Quincena",
  placeholder = "Selecciona una quincena",
}: FortnightSelectProps) {
  const selected = options.find((option) => option.value === value);
  const months = [...new Set(options.map((option) => option.month))];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={className}
        aria-label={ariaLabel}
        title={
          selected
            ? `${formatPayrollMonth(selected.month)} (${periodDescription(selected)})`
            : undefined
        }
      >
        <SelectValue placeholder={placeholder}>
          {selected ? (
            <span className="flex min-w-0 items-baseline gap-1.5 truncate normal-case">
              <span className="truncate font-semibold">
                {formatPayrollMonth(selected.month)}
              </span>
              <span className="shrink-0 text-[color:var(--text-muted)]">
                ({periodName(selected)})
              </span>
            </span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[15rem]" style={{ maxHeight: "20rem" }}>
        {months.map((month) => (
          <SelectGroup key={month}>
            <SelectLabel className="border-b border-[color:var(--border-color)] bg-[color:var(--table-row-alt)] text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-secondary)]">
              {formatPayrollMonth(month)}
            </SelectLabel>
            {options
              .filter((option) => option.month === month)
              .map((option) => {
                const status = getStatusLabel?.(option);
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="normal-case py-2.5"
                  >
                    <span className="flex w-full min-w-0 items-center justify-between gap-3 pr-1">
                      <span className="min-w-0 truncate font-medium">
                        {periodName(option)}
                        <span className="ml-1.5 font-normal text-[color:var(--text-muted)]">
                          · {dateRange(option)}
                        </span>
                      </span>
                      {status ? (
                        <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                          {status}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                );
              })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
