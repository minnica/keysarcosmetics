import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma/client";
import { executePosIdempotent } from "./services/pos-inventory";
import {
  activateMembershipsForTicket,
  consumeMembershipAttendance,
  createMembershipsForTicket,
  type PosMembershipContext,
} from "./services/pos-memberships";

const enabled = process.env["RUN_DATABASE_TESTS"] === "true";
const integrationDescribe = enabled ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;

integrationDescribe("membresías POS con PostgreSQL", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("conserva folios por unidad, reintentos, liquidación y consumo concurrente", async () => {
    // Esta suite corre exclusivamente contra el PostgreSQL efímero del gate.
    // Los triggers append-only impiden limpiar el historial de forma deliberada.
    const branch = await prisma.sucursal.create({
      data: { nombre: `Membership Branch ${suffix}` },
    });
    await prisma.posBranchProfile.create({
      data: {
        branchId: branch.id,
        code: `M${process.pid}${Date.now()}`.slice(-20),
      },
    });
    const employee = await prisma.empleado.create({
      data: {
        nombres: "Membership",
        apellidoPaterno: "Integration",
        apellidoMaterno: "Seller",
        nombreCompleto: `Membership Seller ${suffix}`,
        banco: "TEST",
        numeroCuenta: suffix,
        puesto: "TEST",
        metaIndividual: 0,
        sucursalId: branch.id,
      },
    });
    const credential = await prisma.posCredential.create({
      data: {
        employeeId: employee.id,
        alias: `membership.${suffix}`,
        aliasNormalized: `membership.${suffix}`,
        pinHash: "integration-only",
        pinFingerprint: randomUUID().replaceAll("-", ""),
      },
    });
    const terminal = await prisma.posTerminal.create({
      data: {
        code: `MEMBERSHIP-${suffix}`,
        name: "Membership integration",
        branchId: branch.id,
        secretHash: "integration-only",
        secretFingerprint: randomUUID().replaceAll("-", ""),
      },
    });
    const customer = await prisma.customer.create({
      data: {
        displayName: `Membership Customer ${suffix}`,
        normalizedName: `membership customer ${suffix}`,
      },
    });
    const item = await prisma.catalogItem.create({
      data: {
        sku: `MEM-INTEGRATION-${suffix}`,
        name: "Membresía integración",
        normalizedName: "membresia integracion",
        kind: "MEMBERSHIP",
        published: true,
        listPrice: "500.01",
        minimumPrice: "500.01",
        unitCost: "0.00",
        taxRate: "16.00",
      },
    });
    await prisma.posMembershipTerms.create({
      data: {
        itemId: item.id,
        version: 1,
        totalSessions: 2,
        renewalThreshold: 1,
        createdByCredentialId: credential.id,
      },
    });

    const createTicket = async (
      status: "COMPLETED" | "LAYAWAY",
      quantity: number,
      total: string,
      sequence: bigint,
    ) =>
      prisma.posTicket.create({
        data: {
          folio: `MEM-TICKET-${sequence}-${suffix}`,
          terminalSequence: sequence,
          status,
          settlementStatus: status === "COMPLETED" ? "PAID" : "LAYAWAY",
          businessDate: new Date("2026-09-04T00:00:00.000Z"),
          branchId: branch.id,
          terminalId: terminal.id,
          createdByCredentialId: credential.id,
          customerId: customer.id,
          customerNameSnapshot: customer.displayName,
          subtotal: total,
          minimumTotal: total,
          spareTotal: "0.00",
          discountTotal: "0.00",
          taxTotal: "0.00",
          total,
          amountPaid: status === "COMPLETED" ? total : "1.00",
          pendingAmount: status === "COMPLETED" ? "0.00" : "499.01",
          lines: {
            create: {
              itemId: item.id,
              itemNameSnapshot: item.name,
              skuSnapshot: item.sku,
              quantity,
              unitListPrice: "500.01",
              unitMinimumPrice: "500.01",
              unitPrice: "500.01",
              unitCostSnapshot: "0.00",
              taxRateSnapshot: "16.00",
              subtotal: total,
              minimumTotal: total,
              discountTotal: "0.00",
              taxTotal: "0.00",
              total,
            },
          },
          sellers: {
            create: {
              employeeId: employee.id,
              sellerNameSnapshot: employee.nombreCompleto,
              shareAmount: total,
              sharePercent: "100.0000",
            },
          },
        },
        include: { lines: true },
      });

    const completedTicket = await createTicket(
      "COMPLETED",
      2,
      "1000.01",
      BigInt(Date.now()),
    );
    const idempotencyKey = randomUUID();
    const createCompletedMemberships = () =>
      executePosIdempotent({
        key: idempotencyKey,
        actorCredentialId: credential.id,
        operation: "TEST_POS_MEMBERSHIP_TICKET",
        payload: { ticketId: completedTicket.id },
        execute: async (tx) => ({
          status: 201,
          message: "created",
          data: await createMembershipsForTicket(tx, {
            ticketId: completedTicket.id,
            credentialId: credential.id,
            activate: true,
          }),
        }),
      });
    expect((await createCompletedMemberships()).replayed).toBe(false);
    expect((await createCompletedMemberships()).replayed).toBe(true);

    const completedMemberships = await prisma.posClientMembership.findMany({
      where: { ticketId: completedTicket.id },
      orderBy: { unitOrdinal: "asc" },
    });
    expect(completedMemberships).toHaveLength(2);
    expect(new Set(completedMemberships.map((entry) => entry.folio)).size).toBe(
      2,
    );
    expect(
      completedMemberships.reduce(
        (totalAmount, entry) => totalAmount + Number(entry.purchaseAmount),
        0,
      ),
    ).toBe(1000.01);

    const layawayTicket = await createTicket(
      "LAYAWAY",
      1,
      "500.01",
      BigInt(Date.now() + 1),
    );
    await prisma.$transaction((tx) =>
      createMembershipsForTicket(tx, {
        ticketId: layawayTicket.id,
        credentialId: credential.id,
        activate: false,
      }),
    );
    const layawayMembership = await prisma.posClientMembership.findFirstOrThrow(
      {
        where: { ticketId: layawayTicket.id },
      },
    );
    expect(layawayMembership.status).toBe("PENDING");
    await prisma.$transaction((tx) =>
      activateMembershipsForTicket(
        tx,
        layawayTicket.id,
        credential.id,
        "liquidation-1",
      ),
    );
    await prisma.$transaction((tx) =>
      activateMembershipsForTicket(
        tx,
        layawayTicket.id,
        credential.id,
        "liquidation-replay",
      ),
    );
    expect(
      await prisma.posMembershipStatusChange.count({
        where: {
          membershipId: layawayMembership.id,
          fromStatus: "PENDING",
          toStatus: "ACTIVE",
        },
      }),
    ).toBe(1);

    const appointment = await prisma.posAppointment.create({
      data: {
        ticketId: completedTicket.id,
        customerId: customer.id,
        kind: "NEXT_SESSION",
        status: "SCHEDULED",
        serviceNameSnapshot: "Sesión de membresía",
        branchId: branch.id,
        sellerId: employee.id,
        createdByCredentialId: credential.id,
      },
    });
    const context: PosMembershipContext = {
      credentialId: credential.id,
      terminalId: terminal.id,
      sessionId: randomUUID(),
      employeeId: employee.id,
      isMaster: false,
      authorizedBranchIds: [branch.id],
    };
    await Promise.all([
      prisma.$transaction((tx) =>
        consumeMembershipAttendance(
          tx,
          {
            membershipId: completedMemberships[0]!.id,
            appointmentId: appointment.id,
            event: "ATTENDED",
            branchId: branch.id,
            signatureStatus: "PENDING",
          },
          context,
        ),
      ),
      prisma.$transaction((tx) =>
        consumeMembershipAttendance(
          tx,
          {
            membershipId: completedMemberships[0]!.id,
            appointmentId: appointment.id,
            event: "ATTENDED",
            branchId: branch.id,
            signatureStatus: "PENDING",
          },
          context,
        ),
      ),
    ]);
    const consumed = await prisma.posClientMembership.findUniqueOrThrow({
      where: { id: completedMemberships[0]!.id },
    });
    expect(consumed.usedSessions).toBe(1);
    expect(
      await prisma.posMembershipAttendance.count({
        where: { appointmentId: appointment.id },
      }),
    ).toBe(1);
  });
});
