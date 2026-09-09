import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateSchedulerCommission,
  mergeSchedulerReportIntervals,
  resolveSchedulerReportPeriod,
  schedulerReportOverlapMinutes,
  schedulerReportRating,
  schedulerReportScreen,
  subtractSchedulerReportIntervals,
} from "./scheduler-reporting";

describe("scheduler reporting", () => {
  it("usa periodos de calendario inclusivos con límite de un año", () => {
    expect(resolveSchedulerReportPeriod("2026-09-01", "2026-09-04")).toEqual({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-04",
      dateToExclusive: "2026-09-05",
      dates: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"],
    });
    expect(() =>
      resolveSchedulerReportPeriod("2026-09-04", "2026-09-01"),
    ).toThrow();
    expect(() =>
      resolveSchedulerReportPeriod("2025-01-01", "2026-01-02"),
    ).toThrow();
  });

  it("fusiona ocupación y descuenta descansos o bloqueos sin duplicar minutos", () => {
    expect(
      mergeSchedulerReportIntervals([
        { startMinute: 540, endMinute: 600 },
        { startMinute: 570, endMinute: 660 },
      ]),
    ).toEqual([{ startMinute: 540, endMinute: 660 }]);
    const available = subtractSchedulerReportIntervals(
      [{ startMinute: 540, endMinute: 1020 }],
      [{ startMinute: 780, endMinute: 840 }],
    );
    expect(available).toEqual([
      { startMinute: 540, endMinute: 780 },
      { startMinute: 840, endMinute: 1020 },
    ]);
    expect(
      schedulerReportOverlapMinutes(available, [
        { startMinute: 750, endMinute: 870 },
        { startMinute: 850, endMinute: 900 },
      ]),
    ).toBe(90);
  });

  it("calcula las modalidades sin crear movimientos de nómina", () => {
    expect(
      calculateSchedulerCommission({
        appointmentCount: 4,
        attendedCount: 3,
        salesAmount: 1_000,
        branchSalesAmount: 10_000,
        rules: [
          { mode: "APPOINTMENT", amount: 10, percentage: null, tiers: [] },
          {
            mode: "ATTENDED_APPOINTMENT",
            amount: 20,
            percentage: null,
            tiers: [],
          },
          { mode: "SALES_PERCENTAGE", amount: null, percentage: 5, tiers: [] },
          {
            mode: "BRANCH_SALES_TIER",
            amount: null,
            percentage: null,
            tiers: [
              { fromAmount: 0, toAmount: 5_000, percentage: 1 },
              { fromAmount: 5_000, toAmount: null, percentage: 2 },
            ],
          },
        ],
      }),
    ).toBe(170);
  });

  it("lee calificaciones escalares u objetos sin aceptar texto arbitrario", () => {
    expect(schedulerReportRating({ rating: "4" })).toBe(4);
    expect(schedulerReportRating(5)).toBe(5);
    expect(schedulerReportRating("bien")).toBeNull();
  });

  it("separa permisos de reservaciones, resumen y ventas", () => {
    expect(schedulerReportScreen("OCCUPANCY")).toBe(
      "scheduler/reports/reservations",
    );
    expect(schedulerReportScreen("SURVEYS")).toBe("scheduler/reports/summary");
    expect(schedulerReportScreen("PAYMENTS")).toBe("scheduler/reports/sales");
  });

  it("mantiene la migración de reportes exclusivamente aditiva", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20260904120000_add_scheduler_reporting_indexes/migration.sql",
      ),
      "utf8",
    );
    expect(sql.match(/CREATE INDEX/g)).toHaveLength(4);
    expect(sql).not.toMatch(/\b(?:DROP|DELETE|UPDATE|TRUNCATE|INSERT)\b/i);
  });
});
