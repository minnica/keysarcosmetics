import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PosTicketCreateRequestDto } from "@cosmetics/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./prisma/client";
import {
  prepareAgendaTicketSaga,
  refreshAgendaAvailability,
  reserveMembershipNextSession,
} from "./services/pos-agenda";
import { hashOpaqueToken } from "./services/pos-security";
import { appendTicketRevision, createTicket } from "./services/pos-tickets";

const enabled = process.env["RUN_DATABASE_TESTS"] === "true";
const integrationDescribe = enabled ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;
const password = `Pos-Scheduler-${randomUUID()}`;
const jwtSecret = `pos-scheduler-${randomUUID()}-${randomUUID()}`;
const timezone = "UTC";

const futureFriday = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);
  date.setUTCDate(date.getUTCDate() + ((5 - date.getUTCDay() + 7) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const atUtcHour = (date: Date, hour: number) => {
  const value = new Date(date);
  value.setUTCHours(hour, 0, 0, 0);
  return value;
};

integrationDescribe("POS con proveedor Scheduler interno", () => {
  let server: Server;
  let baseUrl = "";
  let schedulerToken = "";
  let branchId = "";
  let branchProfileId = "";
  let employeeId = "";
  let credentialId = "";
  let terminalId = "";
  let serviceItemId = "";
  let serviceProfileId = "";
  let firstProfessionalId = "";
  let customerId = "";
  let paymentMethodId = "";
  const date = futureFriday();
  const businessDate = new Date().toISOString().slice(0, 10);

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${baseUrl}${path}`, init);
    return { response, body: await response.json() };
  };

  const schedulerMutation = (body: unknown): RequestInit => ({
    method: "POST",
    headers: {
      authorization: `Bearer ${schedulerToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const slotsFor = async (seats = 1) =>
    refreshAgendaAvailability({
      branchId,
      serviceItemId,
      seats,
      from: atUtcHour(date, 9).toISOString(),
      to: atUtcHour(date, 17).toISOString(),
    });

  const slotAt = async (hour: number, seats = 1) => {
    const startsAt = atUtcHour(date, hour).toISOString();
    const slots = await slotsFor(seats);
    const slot = slots.find(
      (candidate) =>
        candidate.startsAt === startsAt &&
        candidate.externalSlotId.includes(firstProfessionalId),
    );
    if (!slot) throw new Error(`No existe slot sintético para ${startsAt}`);
    return slot;
  };

  const ticketInput = (
    customer: PosTicketCreateRequestDto["customer"],
    appointments: NonNullable<PosTicketCreateRequestDto["appointments"]>,
  ): PosTicketCreateRequestDto => ({
    branchId,
    customer,
    lines: [
      {
        itemId: serviceItemId,
        quantity: "1.00",
        unitPrice: "100.00",
        delivered: true,
      },
    ],
    sellers: [{ employeeId, share: "100.00" }],
    payments: [{ methodId: paymentMethodId, amount: "100.00" }],
    appointments,
    courtesies: appointments.map((appointment, appointmentIndex) => ({
      serviceItemId,
      serviceName: appointment.serviceName,
      appointmentIndex,
      policyName: "Cortesía sintética RV6-P2",
    })),
  });

  const createCourtesyTicket = async (input: PosTicketCreateRequestDto) => {
    const operationKey = randomUUID();
    const agenda = await prepareAgendaTicketSaga({
      operationKey,
      ticket: input,
      authorizedBranchIds: [branchId],
    });
    return prisma.$transaction((tx) =>
      createTicket(
        tx,
        input,
        {
          credentialId,
          terminalId,
          branchId,
          businessDate,
          isMaster: true,
        },
        agenda,
      ),
    );
  };

  beforeAll(async () => {
    process.env["JWT_SECRET"] = jwtSecret;
    process.env["AGENDA_PROVIDER"] = "internal";

    const branch = await prisma.sucursal.create({
      data: { nombre: `POS Scheduler Branch ${suffix}` },
    });
    branchId = branch.id;
    await prisma.posBranchProfile.create({
      data: {
        branchId,
        code: `R6${Date.now()}`.slice(-20),
        timezone,
      },
    });
    const commerce = await prisma.schedulerCommerce.create({
      data: {
        name: `POS Scheduler Commerce ${suffix}`,
        normalizedName: `pos scheduler commerce ${suffix}`,
      },
    });
    const branchProfile = await prisma.schedulerBranchProfile.create({
      data: {
        branchId,
        commerceId: commerce.id,
        bookingEnabled: true,
        timezone,
      },
    });
    branchProfileId = branchProfile.id;

    const actor = await prisma.empleado.create({
      data: {
        nombres: "POS",
        apellidoPaterno: "Scheduler",
        apellidoMaterno: "Actor",
        nombreCompleto: `POS Scheduler Actor ${suffix}`,
        banco: "TEST",
        numeroCuenta: `ACTOR-${suffix}`,
        puesto: "TEST",
        metaIndividual: 0,
        sucursalId: branchId,
      },
    });
    employeeId = actor.id;
    const secondProfessional = await prisma.empleado.create({
      data: {
        nombres: "POS",
        apellidoPaterno: "Scheduler",
        apellidoMaterno: "Second",
        nombreCompleto: `POS Scheduler Second ${suffix}`,
        banco: "TEST",
        numeroCuenta: `SECOND-${suffix}`,
        puesto: "TEST",
        metaIndividual: 0,
        sucursalId: branchId,
      },
    });
    const user = await prisma.usuario.create({
      data: {
        nombre: `POS Scheduler Admin ${suffix}`,
        email: `pos-scheduler-${suffix}@keysar.test`,
        passwordHash: await bcrypt.hash(password, 4),
        rol: "SUPER_ADMIN",
        empleadoId: actor.id,
        sucursalId: branchId,
      },
    });
    const credential = await prisma.posCredential.create({
      data: {
        employeeId: actor.id,
        alias: `pos.scheduler.${suffix}`,
        aliasNormalized: `pos.scheduler.${suffix}`,
        pinHash: await bcrypt.hash(randomUUID(), 4),
        pinFingerprint: randomUUID().replaceAll("-", ""),
      },
    });
    credentialId = credential.id;
    const terminal = await prisma.posTerminal.create({
      data: {
        code: `RV6-P2-${suffix}`,
        name: "RV6-P2 integration",
        branchId,
        secretHash: await bcrypt.hash(randomUUID(), 4),
        secretFingerprint: randomUUID().replaceAll("-", ""),
      },
    });
    terminalId = terminal.id;
    const openingAuthorization = await prisma.masterAuthorization.create({
      data: {
        tokenHash: randomUUID().replaceAll("-", ""),
        purpose: "BUSINESS_DAY_OPEN_SKIP",
        entityType: "Sucursal",
        entityId: branchId,
        actorCredentialId: credentialId,
        terminalId,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      },
    });
    await prisma.posBusinessDay.create({
      data: {
        branchId,
        businessDate: new Date(`${businessDate}T00:00:00.000Z`),
        openingSkipped: true,
        openingAuthorizationId: openingAuthorization.id,
        openedByCredentialId: credentialId,
        openedTerminalId: terminalId,
      },
    });

    const firstProfessional = await prisma.schedulerProfessionalProfile.create({
      data: {
        employeeId: actor.id,
        branchAssignments: { create: { branchProfileId } },
      },
    });
    firstProfessionalId = firstProfessional.id;
    const secondProfile = await prisma.schedulerProfessionalProfile.create({
      data: {
        employeeId: secondProfessional.id,
        branchAssignments: { create: { branchProfileId } },
      },
    });

    const serviceItem = await prisma.catalogItem.create({
      data: {
        sku: `RV6-SERVICE-${suffix}`.toUpperCase(),
        name: `Servicio Scheduler RV6-P2 ${suffix}`,
        normalizedName: `servicio scheduler rv6 p2 ${suffix}`,
        kind: "SERVICE",
        published: true,
        listPrice: "100.00",
        minimumPrice: "100.00",
        unitCost: "0.00",
        taxRate: "0.00",
        branchVisibility: { create: { branchId } },
        priceHistory: {
          create: {
            listPrice: "100.00",
            minimumPrice: "100.00",
            unitCost: "0.00",
            taxRate: "0.00",
            createdByCredentialId: credentialId,
          },
        },
      },
    });
    serviceItemId = serviceItem.id;
    const service = await prisma.schedulerServiceProfile.create({
      data: {
        catalogItemId: serviceItemId,
        durationMinutes: 30,
        capacity: 2,
        branchAssignments: { create: { branchProfileId } },
        professionalAssignments: {
          create: [
            { branchProfileId, professionalProfileId: firstProfessional.id },
            { branchProfileId, professionalProfileId: secondProfile.id },
          ],
        },
      },
    });
    serviceProfileId = service.id;
    await prisma.schedulerAvailabilityRule.createMany({
      data: [
        {
          branchProfileId,
          kind: "WORKING",
          weekday: "FRIDAY",
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        },
        {
          branchProfileId,
          professionalProfileId: firstProfessional.id,
          kind: "WORKING",
          weekday: "FRIDAY",
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        },
        {
          branchProfileId,
          professionalProfileId: secondProfile.id,
          kind: "WORKING",
          weekday: "FRIDAY",
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        },
      ],
    });
    const customerPhone = `55${Date.now().toString().slice(-8)}`;
    const customer = await prisma.customer.create({
      data: {
        displayName: `Clienta existente RV6-P2 ${suffix}`,
        normalizedName: `clienta existente rv6 p2 ${suffix}`,
        phone: customerPhone,
        phoneNormalized: customerPhone,
      },
    });
    customerId = customer.id;
    const paymentMethod = await prisma.metodoPago.create({
      data: {
        nombre: `Efectivo RV6-P2 ${suffix}`,
        tipo: "EFECTIVO",
        posPolicy: { create: { activeForPos: true } },
      },
    });
    paymentMethodId = paymentMethod.id;

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Puerto de integración no disponible");
    baseUrl = `http://127.0.0.1:${address.port}`;
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });
    schedulerToken = (login.body as { data: { token: string } }).data.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await prisma.$disconnect();
  });

  it("confirma clienta nueva/existente y cortesía simple/doble sin capacidad parcial", async () => {
    const singleSlot = await slotAt(10);
    const doubleSlot = await slotAt(11, 2);
    expect(singleSlot.externalSystem).toBe("SCHEDULER_INTERNAL");
    expect(doubleSlot.availableSeats).toBe(2);

    const newCustomerInput = ticketInput(
      {
        create: {
          displayName: `Clienta nueva RV6-P2 ${suffix}`,
          firstName: "Clienta",
          lastName: "Nueva",
          phone: `56${Date.now().toString().slice(-8)}`,
          registrationBranchId: branchId,
          ownerEmployeeId: employeeId,
        },
      },
      [
        {
          kind: "COURTESY",
          serviceItemId,
          serviceName: "Cortesía simple",
          branchId,
          sellerId: employeeId,
          scheduledAt: singleSlot.startsAt,
          agendaSlotId: singleSlot.id,
          agendaReservationMode: "SINGLE",
          courtesyReason: "WELCOME",
        },
      ],
    );
    const newCustomerTicket = await createCourtesyTicket(newCustomerInput);
    const newCustomer = await prisma.customer.findUniqueOrThrow({
      where: { id: newCustomerTicket.customerId! },
    });
    expect(newCustomer.externalClientId).toMatch(/^scheduler-client:pending:/);

    const doubleAppointment = {
      kind: "COURTESY" as const,
      serviceItemId,
      serviceName: "Cortesía doble",
      branchId,
      sellerId: employeeId,
      scheduledAt: doubleSlot.startsAt,
      agendaSlotId: doubleSlot.id,
      agendaReservationMode: "SIMULTANEOUS_DOUBLE" as const,
      courtesyReason: "COMPLAINT" as const,
    };
    const existingCustomerTicket = await createCourtesyTicket(
      ticketInput({ id: customerId }, [doubleAppointment, doubleAppointment]),
    );
    const [appointments, schedulerAppointments, reservation] =
      await Promise.all([
        prisma.posAppointment.findMany({
          where: { ticketId: existingCustomerTicket.id },
          orderBy: { id: "asc" },
        }),
        prisma.schedulerAppointment.findMany({
          where: { origin: "POS", customerId },
          include: {
            services: { include: { participants: true } },
          },
        }),
        prisma.agendaReservation.findFirstOrThrow({
          where: { ticketId: existingCustomerTicket.id },
        }),
      ]);
    expect(appointments).toHaveLength(2);
    expect(
      new Set(appointments.map((item) => item.schedulerAppointmentId)).size,
    ).toBe(2);
    expect(schedulerAppointments).toHaveLength(2);
    expect(
      new Set(
        schedulerAppointments.flatMap((item) =>
          item.services.flatMap((service) =>
            service.participants.map(
              (participant) => participant.professionalProfileId,
            ),
          ),
        ),
      ).size,
    ).toBe(2);
    expect(reservation).toMatchObject({
      status: "CONFIRMED",
      mode: "SIMULTANEOUS_DOUBLE",
      seats: 2,
    });

    const saturatedCounts = await Promise.all([
      prisma.posTicket.count({ where: { customerId } }),
      prisma.posAppointment.count({
        where: { branchId, scheduledAt: new Date(doubleSlot.startsAt) },
      }),
      prisma.schedulerAppointment.count({
        where: {
          branchProfileId,
          startsAt: new Date(doubleSlot.startsAt),
          origin: "POS",
        },
      }),
    ]);
    await expect(
      createCourtesyTicket(
        ticketInput({ id: customerId }, [doubleAppointment, doubleAppointment]),
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      Promise.all([
        prisma.posTicket.count({ where: { customerId } }),
        prisma.posAppointment.count({
          where: { branchId, scheduledAt: new Date(doubleSlot.startsAt) },
        }),
        prisma.schedulerAppointment.count({
          where: {
            branchProfileId,
            startsAt: new Date(doubleSlot.startsAt),
            origin: "POS",
          },
        }),
      ]),
    ).resolves.toEqual(saturatedCounts);

    const singleAppointment = await prisma.posAppointment.findFirstOrThrow({
      where: { ticketId: newCustomerTicket.id },
    });
    const canceled = await request(
      `/api/scheduler/appointments/${singleAppointment.schedulerAppointmentId}/cancel`,
      schedulerMutation({ expectedVersion: 1, reason: "Cancelación RV6-P2" }),
    );
    expect(canceled.response.status).toBe(200);
    await expect(
      prisma.posAppointment.findUniqueOrThrow({
        where: { id: singleAppointment.id },
      }),
    ).resolves.toMatchObject({ status: "CANCELED", agendaVersion: 2 });
    await expect(
      prisma.agendaReservation.findUniqueOrThrow({
        where: { id: singleAppointment.agendaReservationId! },
      }),
    ).resolves.toMatchObject({ status: "CANCELED" });
  });

  it("revisa el ticket sin reprogramar ni duplicar la capacidad interna", async () => {
    const slot = await slotAt(12);
    const input = ticketInput({ id: customerId }, [
      {
        kind: "NEXT_SESSION",
        serviceItemId,
        serviceName: `Servicio Scheduler RV6-P2 ${suffix}`,
        branchId,
        sellerId: employeeId,
        scheduledAt: slot.startsAt,
        agendaSlotId: slot.id,
        agendaReservationMode: "SINGLE",
      },
    ]);
    const ticket = await createCourtesyTicket(input);
    const courtesyBefore = await prisma.posCourtesy.findFirstOrThrow({
      where: { ticketId: ticket.id },
    });
    const appointment = await prisma.posAppointment.findFirstOrThrow({
      where: { ticketId: ticket.id },
    });
    const schedulerAppointmentId = appointment.schedulerAppointmentId!;
    const appointmentBefore = await prisma.posAppointment.findUniqueOrThrow({
      where: { id: appointment.id },
    });
    const schedulerBefore = await prisma.schedulerAppointment.findUniqueOrThrow(
      {
        where: { id: schedulerAppointmentId },
        include: {
          services: {
            include: {
              participants: true,
              resources: true,
              membershipBenefit: true,
            },
          },
        },
      },
    );
    const reservationBefore = await prisma.agendaReservation.findUniqueOrThrow({
      where: { id: appointment.agendaReservationId! },
    });
    const syncEventCountBefore = await prisma.agendaSyncEvent.count({
      where: { appointmentId: appointment.id },
    });
    const authorizationToken = randomUUID();
    const authorization = await prisma.masterAuthorization.create({
      data: {
        tokenHash: hashOpaqueToken(authorizationToken),
        purpose: "RECEIPT_HISTORY_ADMIN",
        actorCredentialId: credentialId,
        terminalId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });

    await expect(
      prisma.$transaction((tx) =>
        appendTicketRevision(
          tx,
          {
            ticketId: ticket.id,
            reason: "No retirar la cortesía sin una identidad aprobada",
            authorizationToken,
            revision: {
              clientName: `${customer.displayName} corregida`,
              clientPhone: customer.phone ?? "",
              sellerIds: [employeeId],
              products: [
                {
                  itemId: serviceItemId,
                  quantity: "1.00",
                  unitPrice: "110.00",
                },
              ],
              discountAmount: "0.00",
              paymentStatus: "PAID",
              amountPaid: "110.00",
              payments: [{ methodId: paymentMethodId, amount: "110.00" }],
            },
          },
          {
            credentialId,
            terminalId,
            branchId,
            businessDate,
            isMaster: true,
          },
        ),
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      prisma.masterAuthorization.findUniqueOrThrow({
        where: { id: authorization.id },
      }),
    ).resolves.toMatchObject({ usedAt: null });

    const revision = await prisma.$transaction((tx) =>
      appendTicketRevision(
        tx,
        {
          ticketId: ticket.id,
          reason: "Corregir importe sin alterar la cita interna",
          authorizationToken,
          revision: {
            clientName: `${customer.displayName} corregida`,
            clientPhone: customer.phone ?? "",
            sellerIds: [employeeId],
            products: [
              {
                itemId: serviceItemId,
                quantity: "1.00",
                unitPrice: "110.00",
              },
              {
                itemId: serviceItemId,
                quantity: "1.00",
                unitPrice: "0.00",
              },
            ],
            discountAmount: "0.00",
            paymentStatus: "PAID",
            amountPaid: "110.00",
            payments: [{ methodId: paymentMethodId, amount: "110.00" }],
          },
        },
        {
          credentialId,
          terminalId,
          branchId,
          businessDate,
          isMaster: true,
        },
      ),
    );
    expect(revision.version).toBe(2);

    const [
      appointmentAfter,
      schedulerAfter,
      reservationAfter,
      storedAuthorization,
      revisionEvent,
      reloadedTicket,
      courtesyAfter,
      revisionOperations,
      projectionSum,
    ] = await Promise.all([
      prisma.posAppointment.findUniqueOrThrow({
        where: { id: appointment.id },
      }),
      prisma.schedulerAppointment.findUniqueOrThrow({
        where: { id: schedulerAppointmentId },
        include: {
          services: {
            include: {
              participants: true,
              resources: true,
              membershipBenefit: true,
            },
          },
        },
      }),
      prisma.agendaReservation.findUniqueOrThrow({
        where: { id: appointment.agendaReservationId! },
      }),
      prisma.masterAuthorization.findUniqueOrThrow({
        where: { id: authorization.id },
      }),
      prisma.posTicketEvent.findUniqueOrThrow({
        where: { id: revision.id },
      }),
      prisma.posTicket.findUniqueOrThrow({ where: { id: ticket.id } }),
      prisma.posCourtesy.findFirstOrThrow({ where: { ticketId: ticket.id } }),
      prisma.posPaymentOperation.findMany({
        where: { ticketId: ticket.id },
        orderBy: { creadoEn: "asc" },
      }),
      prisma.posLegacySaleProjection.aggregate({
        where: { operation: { ticketId: ticket.id } },
        _sum: { amount: true },
      }),
    ]);
    expect(appointmentAfter).toEqual(appointmentBefore);
    expect(schedulerAfter).toEqual(schedulerBefore);
    expect(reservationAfter).toEqual(reservationBefore);
    expect(storedAuthorization.usedAt).not.toBeNull();
    expect(reloadedTicket.version).toBe(2);
    expect(reloadedTicket.total.toFixed(2)).toBe("110.00");
    expect(courtesyAfter).toEqual(courtesyBefore);
    expect(revisionOperations.map((operation) => operation.kind)).toEqual([
      "SALE",
      "REFUND",
      "REVISION",
    ]);
    expect(
      revisionOperations.map((operation) => operation.amount.toFixed(2)),
    ).toEqual(["100.00", "100.00", "110.00"]);
    expect(projectionSum._sum.amount?.toFixed(2)).toBe("110.00");
    expect(revisionEvent.snapshot).toEqual(
      expect.objectContaining({
        before: expect.objectContaining({
          appointments: [expect.objectContaining({ id: appointment.id })],
          courtesies: [
            expect.objectContaining({
              id: courtesyBefore.id,
              ticketLineId: courtesyBefore.ticketLineId,
              appointmentId: appointment.id,
            }),
          ],
        }),
        after: expect.objectContaining({
          appointments: [expect.objectContaining({ id: appointment.id })],
          courtesies: [expect.objectContaining({ id: courtesyBefore.id })],
        }),
        effects: expect.objectContaining({
          appointmentPreservations: [
            expect.objectContaining({
              id: appointment.id,
              agendaSlotId: slot.id,
              schedulerAppointment: expect.objectContaining({
                id: schedulerAppointmentId,
                serviceItemId,
                capacityUnits: 1,
                professionalAssignments: [
                  expect.objectContaining({ id: firstProfessionalId }),
                ],
              }),
            }),
          ],
          courtesyPreservations: [
            expect.objectContaining({
              id: courtesyBefore.id,
              ticketLineId: courtesyBefore.ticketLineId,
            }),
          ],
        }),
      }),
    );
    await expect(
      prisma.agendaSyncEvent.count({
        where: { appointmentId: appointment.id },
      }),
    ).resolves.toBe(syncEventCountBefore);
    await expect(
      prisma.posAppointment.count({ where: { ticketId: ticket.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.schedulerAppointment.count({
        where: { id: schedulerAppointmentId },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.posCourtesy.count({ where: { ticketId: ticket.id } }),
    ).resolves.toBe(1);

    const externalTicketInput = ticketInput({ id: customerId }, []);
    externalTicketInput.courtesies = [];
    const externalTicket = await createCourtesyTicket(externalTicketInput);
    await prisma.posAppointment.create({
      data: {
        ticketId: externalTicket.id,
        customerId,
        kind: "NEXT_SESSION",
        status: "SCHEDULED",
        serviceItemId,
        serviceNameSnapshot: `Servicio externo ${suffix}`,
        branchId,
        sellerId: employeeId,
        scheduledAt: atUtcHour(date, 16),
        createdByCredentialId: credentialId,
      },
    });
    const externalAuthorizationToken = randomUUID();
    const externalAuthorization = await prisma.masterAuthorization.create({
      data: {
        tokenHash: hashOpaqueToken(externalAuthorizationToken),
        purpose: "RECEIPT_HISTORY_ADMIN",
        actorCredentialId: credentialId,
        terminalId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await expect(
      prisma.$transaction((tx) =>
        appendTicketRevision(
          tx,
          {
            ticketId: externalTicket.id,
            reason: "No revisar sin recuperación durable externa",
            authorizationToken: externalAuthorizationToken,
            revision: {
              clientName: customer.displayName,
              clientPhone: customer.phone ?? "",
              sellerIds: [employeeId],
              products: [
                {
                  itemId: serviceItemId,
                  quantity: "1.00",
                  unitPrice: "110.00",
                },
              ],
              discountAmount: "0.00",
              paymentStatus: "PAID",
              amountPaid: "110.00",
              payments: [{ methodId: paymentMethodId, amount: "110.00" }],
            },
          },
          {
            credentialId,
            terminalId,
            branchId,
            businessDate,
            isMaster: true,
          },
        ),
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      prisma.masterAuthorization.findUniqueOrThrow({
        where: { id: externalAuthorization.id },
      }),
    ).resolves.toMatchObject({ usedAt: null });
  });

  it("reintenta próxima sesión y concilia ATTENDED/NO_SHOW/cancelación una sola vez", async () => {
    const membershipItem = await prisma.catalogItem.create({
      data: {
        sku: `RV6-MEMBERSHIP-${suffix}`.toUpperCase(),
        name: `Membresía RV6-P2 ${suffix}`,
        normalizedName: `membresia rv6 p2 ${suffix}`,
        kind: "MEMBERSHIP",
        published: true,
        listPrice: "500.00",
        minimumPrice: "500.00",
        unitCost: "0.00",
        taxRate: "0.00",
      },
    });
    const terms = await prisma.posMembershipTerms.create({
      data: {
        itemId: membershipItem.id,
        version: 1,
        totalSessions: 1,
        renewalThreshold: 1,
        conditions: { serviceItemIds: [serviceItemId] },
        createdByCredentialId: credentialId,
      },
    });
    const ticket = await prisma.posTicket.create({
      data: {
        folio: `KSR-RV6-P2-MEM-${suffix}`.toUpperCase(),
        terminalSequence: BigInt(Date.now() + 200_000),
        status: "COMPLETED",
        settlementStatus: "PAID",
        businessDate: new Date(`${businessDate}T00:00:00.000Z`),
        branchId,
        terminalId,
        createdByCredentialId: credentialId,
        customerId,
        customerNameSnapshot: `Clienta existente RV6-P2 ${suffix}`,
        subtotal: "1500.00",
        minimumTotal: "1500.00",
        spareTotal: "0.00",
        discountTotal: "0.00",
        taxTotal: "0.00",
        total: "1500.00",
        amountPaid: "1500.00",
        pendingAmount: "0.00",
        lines: {
          create: {
            itemId: membershipItem.id,
            itemNameSnapshot: membershipItem.name,
            skuSnapshot: membershipItem.sku,
            quantity: "3.00",
            unitListPrice: "500.00",
            unitMinimumPrice: "500.00",
            unitPrice: "500.00",
            unitCostSnapshot: "0.00",
            taxRateSnapshot: "0.00",
            subtotal: "1500.00",
            minimumTotal: "1500.00",
            discountTotal: "0.00",
            taxTotal: "0.00",
            total: "1500.00",
          },
        },
      },
      include: { lines: true },
    });
    const memberships = await Promise.all(
      [1, 2, 3].map((unitOrdinal) =>
        prisma.posClientMembership.create({
          data: {
            folio: `RV6-P2-MEM-${unitOrdinal}-${suffix}`.toUpperCase(),
            ticketId: ticket.id,
            ticketLineId: ticket.lines[0]!.id,
            unitOrdinal,
            customerId,
            customerNameSnapshot: `Clienta existente RV6-P2 ${suffix}`,
            membershipItemId: membershipItem.id,
            membershipNameSnapshot: membershipItem.name,
            membershipSkuSnapshot: membershipItem.sku,
            termsId: terms.id,
            termsVersionSnapshot: terms.version,
            totalSessions: 1,
            renewalThreshold: 1,
            purchaseAmount: "500.00",
            purchaseBranchId: branchId,
            purchaseBranchNameSnapshot: `POS Scheduler Branch ${suffix}`,
            originalSellerId: employeeId,
            originalSellerNameSnapshot: `POS Scheduler Actor ${suffix}`,
            currentSellerId: employeeId,
            currentSellerNameSnapshot: `POS Scheduler Actor ${suffix}`,
            status: "ACTIVE",
            activatedAt: new Date(),
          },
        }),
      ),
    );
    const [attendedSlot, noShowSlot, canceledSlot] = await Promise.all([
      slotAt(13),
      slotAt(14),
      slotAt(15),
    ]);
    const attendedKey = randomUUID();
    const attended = await reserveMembershipNextSession({
      operationKey: attendedKey,
      membershipId: memberships[0]!.id,
      agendaSlotId: attendedSlot.id,
      sellerId: employeeId,
      credentialId,
      authorizedBranchIds: [branchId],
    });
    const replay = await reserveMembershipNextSession({
      operationKey: attendedKey,
      membershipId: memberships[0]!.id,
      agendaSlotId: attendedSlot.id,
      sellerId: employeeId,
      credentialId,
      authorizedBranchIds: [branchId],
    });
    expect(replay.id).toBe(attended.id);
    expect(attended.serviceItemId).toBe(serviceItemId);
    expect(attended.serviceItemId).not.toBe(membershipItem.id);

    const noShow = await reserveMembershipNextSession({
      operationKey: randomUUID(),
      membershipId: memberships[1]!.id,
      agendaSlotId: noShowSlot.id,
      sellerId: employeeId,
      credentialId,
      authorizedBranchIds: [branchId],
    });
    const canceled = await reserveMembershipNextSession({
      operationKey: randomUUID(),
      membershipId: memberships[2]!.id,
      agendaSlotId: canceledSlot.id,
      sellerId: employeeId,
      credentialId,
      authorizedBranchIds: [branchId],
    });

    const arrived = await request(
      `/api/scheduler/appointments/${attended.schedulerAppointmentId}/status`,
      schedulerMutation({ status: "ARRIVED", expectedVersion: 1 }),
    );
    expect(arrived.response.status).toBe(200);
    const attendedResponse = await request(
      `/api/scheduler/appointments/${attended.schedulerAppointmentId}/status`,
      schedulerMutation({ status: "ATTENDED", expectedVersion: 2 }),
    );
    expect(attendedResponse.response.status).toBe(200);
    const attendedReplay = await request(
      `/api/scheduler/appointments/${attended.schedulerAppointmentId}/status`,
      schedulerMutation({ status: "ATTENDED", expectedVersion: 2 }),
    );
    expect(attendedReplay.response.status).toBe(409);

    const noShowResponse = await request(
      `/api/scheduler/appointments/${noShow.schedulerAppointmentId}/status`,
      schedulerMutation({ status: "NO_SHOW", expectedVersion: 1 }),
    );
    expect(noShowResponse.response.status).toBe(200);
    const canceledResponse = await request(
      `/api/scheduler/appointments/${canceled.schedulerAppointmentId}/cancel`,
      schedulerMutation({
        expectedVersion: 1,
        reason: "Cancelación de próxima sesión RV6-P2",
      }),
    );
    expect(canceledResponse.response.status).toBe(200);

    const [
      storedMemberships,
      storedAppointments,
      benefits,
      events,
      attendance,
    ] = await Promise.all([
      prisma.posClientMembership.findMany({
        where: { id: { in: memberships.map((item) => item.id) } },
        orderBy: { unitOrdinal: "asc" },
      }),
      prisma.posAppointment.findMany({
        where: { id: { in: [attended.id, noShow.id, canceled.id] } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.schedulerAppointmentMembershipBenefit.findMany({
        where: { membershipId: { in: memberships.map((item) => item.id) } },
        orderBy: { membershipId: "asc" },
      }),
      prisma.agendaSyncEvent.findMany({
        where: { appointmentId: { in: [attended.id, noShow.id, canceled.id] } },
        orderBy: { creadoEn: "asc" },
      }),
      prisma.posMembershipAttendance.findMany({
        where: { membershipId: { in: memberships.map((item) => item.id) } },
      }),
    ]);
    expect(
      storedMemberships.map((item) => ({
        used: item.usedSessions,
        status: item.status,
      })),
    ).toEqual([
      { used: 1, status: "EXHAUSTED" },
      { used: 0, status: "ACTIVE" },
      { used: 0, status: "ACTIVE" },
    ]);
    expect(storedAppointments.map((item) => item.status)).toEqual([
      "COMPLETED",
      "NO_SHOW",
      "CANCELED",
    ]);
    expect(benefits.map((item) => item.status).sort()).toEqual([
      "CONSUMED",
      "RELEASED",
      "RELEASED",
    ]);
    expect(events.map((item) => item.type).sort()).toEqual([
      "ATTENDED",
      "CANCELED",
      "NO_SHOW",
    ]);
    expect(attendance).toHaveLength(1);
    expect(attendance[0]).toMatchObject({
      membershipId: memberships[0]!.id,
      appointmentId: attended.id,
      sessionNumber: 1,
    });
    expect(
      await prisma.agendaSyncEvent.count({
        where: { appointmentId: attended.id, type: "ATTENDED" },
      }),
    ).toBe(1);
    expect(
      await prisma.schedulerAppointment.count({
        where: {
          id: {
            in: [
              attended.schedulerAppointmentId!,
              noShow.schedulerAppointmentId!,
              canceled.schedulerAppointmentId!,
            ],
          },
          branchProfileId,
          origin: "POS",
        },
      }),
    ).toBe(3);
    expect(serviceProfileId).toBeTruthy();
  });
});
