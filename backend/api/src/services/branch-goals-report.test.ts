import { describe, expect, it } from "vitest";
import {
  buildBranchGoalsReport,
  mexicoCityDateISO,
} from "./branch-goals-report";

describe("buildBranchGoalsReport", () => {
  it("builds elapsed days and Monday-to-Sunday weeks for the current month", () => {
    const report = buildBranchGoalsReport(
      "2026-08-13",
      [
        { id: "centro", nombre: "Centro", metaMensual: 1000 },
        { id: "norte", nombre: "Norte", metaMensual: 2000 },
      ],
      [
        {
          fecha: "2026-08-01",
          sucursalId: "centro",
          sucursalNombre: "Centro",
          metaMensual: 1000,
          total: 25,
        },
        {
          fecha: "2026-08-03",
          sucursalId: "centro",
          sucursalNombre: "Centro",
          metaMensual: 1000,
          total: 100,
        },
        {
          fecha: "2026-08-10",
          sucursalId: "centro",
          sucursalNombre: "Centro",
          metaMensual: 1000,
          total: 150,
        },
        {
          fecha: "2026-08-12",
          sucursalId: "norte",
          sucursalNombre: "Norte",
          metaMensual: 2000,
          total: 50,
        },
      ],
    );

    expect(report.monthlyRows).toHaveLength(13);
    expect(report.monthlyRows[0]?.total).toBe(25);
    expect(report.monthlyRows[1]?.total).toBe(0);
    expect(report.weeksInMonth).toBe(5);
    expect(report.weeklyRows).toHaveLength(2);
    expect(report.weeklyRows[0]).toMatchObject({
      startDate: "2026-08-03",
      endDate: "2026-08-09",
      weekNumber: 1,
      total: 100,
    });
    expect(report.weeklyRows[1]).toMatchObject({
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      weekNumber: 2,
      total: 200,
    });
    expect(report.currentWeekNumber).toBe(2);
    expect(report.daysRemainingInMonth).toBe(18);
    expect(report.daysRemainingInCurrentWeek).toBe(3);
  });

  it("keeps historical branches that have sales in the report", () => {
    const report = buildBranchGoalsReport("2026-08-05", [], [
      {
        fecha: "2026-08-04",
        sucursalId: "historica",
        sucursalNombre: "Histórica",
        metaMensual: 800,
        total: 120,
      },
    ]);

    expect(report.branches).toEqual([
      { id: "historica", nombre: "Histórica", metaMensual: 800 },
    ]);
    expect(report.monthlyRows[3]?.porSucursal[0]?.total).toBe(120);
  });
});

describe("mexicoCityDateISO", () => {
  it("uses the Mexico City business date", () => {
    expect(mexicoCityDateISO(new Date("2026-08-14T04:30:00.000Z"))).toBe(
      "2026-08-13",
    );
  });
});
