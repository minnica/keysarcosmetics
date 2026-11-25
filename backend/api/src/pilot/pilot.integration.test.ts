import type { PilotCut } from "@cosmetics/types";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { AddressInfo } from "node:net";
import { createPilotApi } from "./server";
import { initialize, readCut } from "./import";
import { connection, insertCut, pilotDatabase } from "./store";

const enabled = process.env.PILOT_LOCAL_TEST === "1";
describe.skipIf(!enabled)(
  "aislamiento del piloto con dos PostgreSQL desechables",
  () => {
    let source: PrismaClient,
      destination: PrismaClient,
      runtime: PrismaClient,
      loader: PrismaClient;
    let server: ReturnType<ReturnType<typeof createPilotApi>["listen"]>;
    afterAll(async () => {
      await new Promise<void>((resolve) =>
        server ? server.close(() => resolve()) : resolve(),
      );
      await Promise.all([
        source?.$disconnect(),
        destination?.$disconnect(),
        runtime?.$disconnect(),
        loader?.$disconnect(),
      ]);
    });
    it("guarda el ensayo, rechaza revisiones obsoletas y conserva recibo, cuota y saldo en origen", async () => {
      const sourceUrl = new URL(process.env.PAYROLL_SOURCE_READ_URL!);
      const dstUrl = new URL(process.env.PILOT_DATABASE_URL!);
      for (const [url, name] of [
        [sourceUrl, "source_test"],
        [dstUrl, "pilot_test"],
      ] as const) {
        if (url.hostname !== "127.0.0.1" || url.pathname !== "/" + name)
          throw Error("Sólo dos bases locales desechables.");
      }
      if (process.env.PILOT_PROJECT_REF !== "pilot_test")
        throw Error("Identidad local incorrecta.");
      source = new PrismaClient({ datasourceUrl: sourceUrl.href });
      destination = pilotDatabase();
      const branch = await source.sucursal.upsert({
        where: { id: "pilot-b" },
        update: {},
        create: { id: "pilot-b", nombre: "SUCURSAL SINTÉTICA QA" },
      });
      const e = await source.empleado.upsert({
        where: { id: "pilot-e" },
        update: { sucursalId: branch.id },
        create: {
          id: "pilot-e",
          sucursalId: branch.id,
          nombres: "PERSONA",
          apellidoPaterno: "SINTÉTICA",
          apellidoMaterno: "QA",
          nombreCompleto: "PERSONA SINTÉTICA QA",
          sueldo: 10000,
          banco: "SENSITIVE_BANK_QA",
          numeroCuenta: "SENSITIVE_ACCOUNT_QA",
          puesto: "VENTAS",
          numeroTelefono: "SENSITIVE_PHONE_QA",
          metaIndividual: 0,
        },
      });
      const user = await source.usuario.upsert({
        where: { id: "pilot-u" },
        update: {},
        create: {
          id: "pilot-u",
          nombre: "OPERADOR QA",
          email: "qa@example.invalid",
          rol: "SUPER_ADMIN",
          passwordHash: "SENSITIVE_HASH_QA",
        },
      });
      const day = (s: string) => new Date(s + "T00:00:00Z");
      const run = await source.payrollRun.upsert({
        where: { id: "pilot-r" },
        update: {},
        create: {
          id: "pilot-r",
          periodStart: day("2026-11-01"),
          periodEnd: day("2026-11-15"),
          payDate: day("2026-11-16"),
          mode: "WITH_VAT",
          status: "PAID",
          createdById: user.id,
        },
      });
      const line = await source.payrollRunLine.upsert({
        where: { id: "pilot-l" },
        update: {},
        create: {
          id: "pilot-l",
          payrollRunId: run.id,
          employeeId: e.id,
          employeeName: e.nombreCompleto,
          accountNumber: "SENSITIVE_ACCOUNT_QA",
          salaryPayment: 5000,
          totalPayment: 4900,
          loanPayment: 100,
        },
      });
      await source.payrollReceipt.upsert({
        where: { payrollRunLineId: line.id },
        update: {},
        create: { payrollRunLineId: line.id, status: "CONFIRMED" },
      });
      const loan = await source.loanAdvance.upsert({
        where: { id: "pilot-loan" },
        update: {},
        create: {
          id: "pilot-loan",
          requestedAt: day("2026-11-01"),
          employeeId: e.id,
          kind: "LOAN",
          requestedAmount: 200,
          installmentCount: 2,
          installmentAmount: 100,
          balance: 100,
          paidAmount: 100,
          createdById: user.id,
        },
      });
      for (const [sequence, start, end, status] of [
        [1, "2026-11-01", "2026-11-15", "PAID"],
        [2, "2026-11-16", "2026-11-30", "SCHEDULED"],
      ] as const)
        await source.loanAdvanceInstallment.upsert({
          where: {
            loanAdvanceId_sequence: { loanAdvanceId: loan.id, sequence },
          },
          update: {},
          create: {
            loanAdvanceId: loan.id,
            sequence,
            amount: 100,
            periodStart: day(start),
            periodEnd: day(end),
            status,
          },
        });
      const catalog = await source.payrollCatalogItem.upsert({
        where: { id: "pilot-c" },
        update: {},
        create: {
          id: "pilot-c",
          kind: "BONUS",
          name: "BONO AISLAMIENTO QA",
          defaultAmount: 300,
          createdById: user.id,
        },
      });
      await source.payrollMovement.upsert({
        where: { id: "pilot-bonus" },
        update: {},
        create: {
          id: "pilot-bonus",
          catalogItemId: catalog.id,
          date: day("2026-11-17"),
          kind: "BONUS",
          concept: "BONO AISLAMIENTO QA",
          totalAmount: 300,
          status: "PENDING",
          createdById: user.id,
          allocations: {
            create: { employeeId: e.id, branchId: branch.id, amount: 300 },
          },
        },
      });
      const snapshot = await readCut(source, "2026-11-24");
      expect(JSON.stringify(snapshot)).not.toContain("SENSITIVE_");
      expect(snapshot.lines[0]?.receiptStatus).toBe("CONFIRMED");
      await expect(initialize(source, "source_test")).rejects.toThrow(
        "tablas operativas",
      );
      expect(() =>
        connection(
          "postgresql://user@db.kgzuamipstbsiqrlaphh.supabase.co/postgres",
          "aaaaaaaaaaaaaaaaaaaa",
        ),
      ).toThrow();
      const localRolePassword = "only-local-synthetic-pilot-runtime-password";
      const loaderPassword = "synthetic-only-local-bootstrap-loader-password";
      await initialize(
        destination,
        "pilot_test",
        localRolePassword,
        loaderPassword,
      );
      dstUrl.username = "keysar_pilot_loader";
      dstUrl.password = loaderPassword;
      loader = new PrismaClient({ datasourceUrl: dstUrl.href });
      const id = await insertCut(loader, snapshot);
      await expect(
        loader.$executeRaw`UPDATE payroll_pilot.cuts SET changes=changes WHERE false`,
      ).rejects.toThrow(/denied|42501/);
      dstUrl.username = "keysar_pilot_runtime";
      dstUrl.password = localRolePassword;
      runtime = new PrismaClient({ datasourceUrl: dstUrl.href });
      await expect(
        runtime.$executeRaw`UPDATE payroll_pilot.cuts SET original=original WHERE false`,
      ).rejects.toThrow(/denied|42501/);
      await expect(
        runtime.$executeRaw`DELETE FROM payroll_pilot.cuts WHERE false`,
      ).rejects.toThrow(/denied|42501/);
      const secret = "a".repeat(40),
        pw = "clave-exclusiva-de-la-fixture";
      server = createPilotApi(runtime, {
        ref: "pilot_test",
        user: "nomina",
        hash: await bcrypt.hash(pw, 4),
        secret,
      }).listen(0, "127.0.0.1");
      await new Promise<void>((ready) => server.once("listening", ready));
      const origin =
        "http://127.0.0.1:" + (server.address() as AddressInfo).port;
      expect((await fetch(origin + "/cut")).status).toBe(401);
      const login = await fetch(origin + "/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "nomina", password: pw }),
      });
      const token = ((await login.json()) as { token: string }).token;
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      };
      const before = (await (
        await fetch(origin + "/cut", { headers })
      ).json()) as PilotCut;
      expect(
        before.references.find(
          (r: { period: string }) => r.period === "2026-11-01",
        )?.source,
      ).toBe("PAID");
      const command = {
        id,
        revision: 0,
        changes: { movements: [{ id: "bonus-qa", amount: 300 }] },
      };
      const save = (body: unknown) =>
        fetch(origin + "/cut", {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });
      expect((await save(command)).status).toBe(200);
      expect((await save(command)).status).toBe(409);
      expect(
        (await save({ ...command, revision: 1, changes: { sales: [] } }))
          .status,
      ).toBe(400);
      const after = (await (
        await fetch(origin + "/cut", { headers })
      ).json()) as PilotCut;
      expect(after.original).toEqual(before.original);
      expect(after.changes).toMatchObject({ movements: [{ amount: 300 }] });
      const reread = await readCut(source, "2026-11-24");
      expect(reread.lines).toEqual(snapshot.lines);
      expect(reread.loans).toEqual(snapshot.loans);
      expect(reread.movements).toEqual(snapshot.movements);
      await insertCut(destination, reread);
      expect((await save({ ...command, revision: 1 })).status).toBe(409);
    }, 60000);
  },
);
