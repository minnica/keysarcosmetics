import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PosReportCell } from "@cosmetics/types";
import { POS_BUSINESS_TIME_ZONE } from "./pos-scope";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const validCalendarDate = (value: string) => {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export interface PosReportPeriod {
  dateFrom: string;
  dateTo: string;
  businessDateFrom: Date;
  businessDateTo: Date;
  instantFrom: Date;
  instantToExclusive: Date;
}

const dateParts = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: POS_BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

export function posLocalDateStart(value: string): Date {
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;
  // Dos iteraciones cubren cambios históricos de offset y horario de verano.
  for (let index = 0; index < 2; index += 1) {
    const parts = Object.fromEntries(
      dateParts(new Date(candidate)).map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(
      Number(parts["year"]),
      Number(parts["month"]) - 1,
      Number(parts["day"]),
      Number(parts["hour"]),
      Number(parts["minute"]),
      Number(parts["second"]),
    );
    candidate -= represented - target;
  }
  return new Date(candidate);
}

export function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function resolvePosReportPeriod(input: {
  dateFrom?: string;
  dateTo?: string;
  month?: string;
}): PosReportPeriod {
  let dateFrom = input.dateFrom;
  let dateTo = input.dateTo;
  if (input.month) {
    if (!monthPattern.test(input.month) || dateFrom || dateTo)
      throw new Error("Indica un mes o un periodo, no ambos");
    const [year, month] = input.month.split("-").map(Number) as [number, number];
    dateFrom = `${input.month}-01`;
    dateTo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  }
  if (
    !dateFrom ||
    !dateTo ||
    !validCalendarDate(dateFrom) ||
    !validCalendarDate(dateTo)
  )
    throw new Error("El periodo del reporte es obligatorio");
  if (dateFrom > dateTo) throw new Error("El periodo del reporte es inválido");
  const exclusiveLabel = addCalendarDays(dateTo, 1);
  const span =
    (Date.parse(`${exclusiveLabel}T00:00:00.000Z`) -
      Date.parse(`${dateFrom}T00:00:00.000Z`)) /
    86_400_000;
  if (span > 366) throw new Error("El periodo máximo es de 366 días");
  return {
    dateFrom,
    dateTo,
    businessDateFrom: new Date(`${dateFrom}T00:00:00.000Z`),
    businessDateTo: new Date(`${dateTo}T00:00:00.000Z`),
    instantFrom: posLocalDateStart(dateFrom),
    instantToExclusive: posLocalDateStart(exclusiveLabel),
  };
}

export const signedPaymentAmount = (
  amount: Prisma.Decimal,
  operationKind: string,
) => (operationKind === "REFUND" ? amount.negated() : amount);

export function exportFilterMetadata(input: {
  sellerId?: string;
  paymentMethodId?: string;
  bankId?: string;
  cardType?: string;
  installmentMonths?: number;
  operationKind?: string;
  search?: string;
}): Record<string, PosReportCell> {
  return {
    sellerId: input.sellerId ?? null,
    paymentMethodId: input.paymentMethodId ?? null,
    bankId: input.bankId ?? null,
    cardType: input.cardType ?? null,
    installmentMonths: input.installmentMonths ?? null,
    operationKind: input.operationKind ?? null,
    searchApplied: Boolean(input.search),
    searchHash: input.search
      ? createHash("sha256").update(input.search).digest("hex")
      : null,
  };
}

export function paginateReportRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
  forExport: boolean,
): T[] {
  if (forExport) return rows;
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
