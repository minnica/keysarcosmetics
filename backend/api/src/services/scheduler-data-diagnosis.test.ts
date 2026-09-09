import { describe, expect, it } from "vitest";
import {
  classifyMigrations,
  parseSchedulerDiagnosisEnvironment,
  safeSchedulerDiagnosisError,
  validateBackupPitrConfirmation,
  validateSchedulerDiagnosisAccess,
} from "./scheduler-data-diagnosis";

describe("Scheduler data diagnosis safeguards", () => {
  it("requires an explicit supported environment", () => {
    expect(() => parseSchedulerDiagnosisEnvironment(undefined)).toThrow(
      "SCHEDULER_DIAGNOSE_ENVIRONMENT",
    );
    expect(parseSchedulerDiagnosisEnvironment("development")).toBe(
      "development",
    );
  });

  it("requires an exact production read-only confirmation", () => {
    expect(() =>
      validateSchedulerDiagnosisAccess({ environment: "production" }),
    ).toThrow("PRODUCCION_SOLO_LECTURA");
    expect(() =>
      validateSchedulerDiagnosisAccess({
        environment: "production",
        productionConfirmation: "PRODUCCION_SOLO_LECTURA",
      }),
    ).not.toThrow();
  });

  it("accepts only canonical UTC timestamps for backup/PITR evidence", () => {
    expect(validateBackupPitrConfirmation(undefined)).toBeNull();
    expect(
      validateBackupPitrConfirmation("2026-09-04T18:00:00.000Z"),
    ).toBe("2026-09-04T18:00:00.000Z");
    expect(() =>
      validateBackupPitrConfirmation("2026-09-04 18:00"),
    ).toThrow("fecha ISO UTC exacta");
  });

  it("redacts database connection details from runtime errors", () => {
    const error = Object.assign(
      new Error("Can't reach private-host.example:6543"),
      { code: "P1001" },
    );
    expect(safeSchedulerDiagnosisError(error)).toBe(
      "P1001: no fue posible completar la consulta de sólo lectura en el ambiente indicado",
    );
    expect(safeSchedulerDiagnosisError(error)).not.toContain("private-host");
    expect(
      safeSchedulerDiagnosisError(
        new Error("Can't reach database server at private-host.example:6543"),
      ),
    ).toBe(
      "P1001: no fue posible completar la consulta de sólo lectura en el ambiente indicado",
    );
  });
});

describe("Scheduler migration inventory", () => {
  it("classifies pending, database-only, incomplete and drifted migrations", () => {
    const report = classifyMigrations(
      [
        { name: "001_initial", checksum: "same" },
        { name: "002_pending", checksum: "pending" },
        { name: "003_drifted", checksum: "repository" },
      ],
      [
        {
          migration_name: "001_initial",
          checksum: "same",
          started_at: new Date("2026-09-04T00:00:00.000Z"),
          finished_at: new Date("2026-09-04T00:00:01.000Z"),
          rolled_back_at: null,
        },
        {
          migration_name: "003_drifted",
          checksum: "database",
          started_at: new Date("2026-09-04T00:00:02.000Z"),
          finished_at: new Date("2026-09-04T00:00:03.000Z"),
          rolled_back_at: null,
        },
        {
          migration_name: "004_database_only",
          checksum: "database-only",
          started_at: new Date("2026-09-04T00:00:04.000Z"),
          finished_at: new Date("2026-09-04T00:00:05.000Z"),
          rolled_back_at: null,
        },
        {
          migration_name: "005_incomplete",
          checksum: "incomplete",
          started_at: new Date("2026-09-04T00:00:06.000Z"),
          finished_at: null,
          rolled_back_at: null,
        },
      ],
      true,
    );

    expect(report.applied).toEqual([
      "001_initial",
      "003_drifted",
      "004_database_only",
    ]);
    expect(report.pending).toEqual(["002_pending"]);
    expect(report.databaseOnly).toEqual(["004_database_only"]);
    expect(report.incomplete).toEqual(["005_incomplete"]);
    expect(report.checksumMismatches).toEqual(["003_drifted"]);
  });
});
