import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./prisma/client";

const enabled = process.env["RUN_SCHEDULER_LOAD_TESTS"] === "true";
const loadDescribe = enabled ? describe : describe.skip;
const suffix = `scheduler-load-${process.pid}-${Date.now()}`;
const password = "Scheduler-Load-2026";
const branchCount = 30;
const professionalsPerBranch = 2;
const resourcesPerBranch = 2;
const appointmentsPerBranch = 48;
const expectedAppointments = branchCount * appointmentsPerBranch;
let server: Server;
let baseUrl: string;
let token: string;
let serviceProfileId: string;
const branchIds: string[] = [];

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: (await response.json()) as Record<string, unknown> };
}

loadDescribe("Scheduler scale gate on PostgreSQL", () => {
  beforeAll(async () => {
    process.env["JWT_SECRET"] = "scheduler-load-secret-with-adequate-length";
    const user = await prisma.usuario.create({
      data: {
        nombre: "Scheduler Load Admin",
        email: `${suffix}@keysar.test`,
        passwordHash: await bcrypt.hash(password, 4),
        rol: "SUPER_ADMIN",
      },
    });
    const commerce = await prisma.schedulerCommerce.create({
      data: { name: suffix, normalizedName: suffix },
    });
    const item = await prisma.catalogItem.create({
      data: {
        sku: suffix.toUpperCase(),
        name: "Servicio carga 24 horas",
        normalizedName: suffix,
        kind: "SERVICE",
        published: true,
      },
    });
    const service = await prisma.schedulerServiceProfile.create({
      data: { catalogItemId: item.id, durationMinutes: 30, capacity: 1 },
    });
    serviceProfileId = service.id;
    const customer = await prisma.customer.create({
      data: { displayName: suffix, normalizedName: suffix },
    });
    const weekday = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ] as const;
    const appointmentRows: Array<{
      id: string;
      branchProfileId: string;
      startsAt: Date;
      endsAt: Date;
      customerId: string;
      timezone: string;
      createdByUserId: string;
      updatedByUserId: string;
      status: "ATTENDED";
    }> = [];
    const serviceRows: Array<{
      id: string;
      appointmentId: string;
      serviceProfileId: string;
      sequence: number;
      serviceNameSnapshot: string;
      serviceVersionSnapshot: number;
      durationMinutesSnapshot: number;
      preparationMinutesSnapshot: number;
      cleanupMinutesSnapshot: number;
      startsAt: Date;
      endsAt: Date;
      occupiesFrom: Date;
      occupiesUntil: Date;
    }> = [];
    const participantRows: Array<{
      appointmentServiceId: string;
      professionalProfileId: string;
      professionalNameSnapshot: string;
    }> = [];
    const resourceRows: Array<{
      appointmentServiceId: string;
      resourceId: string;
      exclusiveSnapshot: boolean;
      resourceNameSnapshot: string;
    }> = [];

    for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
      const branch = await prisma.sucursal.create({
        data: { nombre: `${suffix}-branch-${branchIndex}` },
      });
      branchIds.push(branch.id);
      const branchProfile = await prisma.schedulerBranchProfile.create({
        data: {
          branchId: branch.id,
          commerceId: commerce.id,
          bookingEnabled: true,
          timezone: "America/Mexico_City",
        },
      });
      await prisma.schedulerAvailabilityRule.createMany({
        data: weekday.map((day) => ({
          branchProfileId: branchProfile.id,
          kind: "WORKING" as const,
          weekday: day,
          startMinute: 0,
          endMinute: 1440,
        })),
      });
      await prisma.schedulerServiceBranchAssignment.create({
        data: {
          serviceProfileId: service.id,
          branchProfileId: branchProfile.id,
        },
      });
      const professionals: Array<{ id: string; name: string }> = [];
      for (let index = 0; index < professionalsPerBranch; index += 1) {
        const name = `${suffix}-professional-${branchIndex}-${index}`;
        const employee = await prisma.empleado.create({
          data: {
            nombres: "Carga",
            apellidoPaterno: String(branchIndex),
            apellidoMaterno: String(index),
            nombreCompleto: name,
            banco: "PRUEBA",
            numeroCuenta: name,
            puesto: "PRUEBA",
            metaIndividual: 0,
            sucursalId: branch.id,
          },
        });
        const professional = await prisma.schedulerProfessionalProfile.create({
          data: { employeeId: employee.id },
        });
        professionals.push({ id: professional.id, name });
        await prisma.schedulerProfessionalBranchAssignment.create({
          data: {
            professionalProfileId: professional.id,
            branchProfileId: branchProfile.id,
          },
        });
        await prisma.schedulerProfessionalServiceAssignment.create({
          data: {
            professionalProfileId: professional.id,
            serviceProfileId: service.id,
            branchProfileId: branchProfile.id,
          },
        });
      }
      const resources: Array<{ id: string; name: string }> = [];
      for (let index = 0; index < resourcesPerBranch; index += 1) {
        const name = `${suffix}-resource-${branchIndex}-${index}`;
        const resource = await prisma.schedulerResource.create({
          data: {
            branchProfileId: branchProfile.id,
            name,
            normalizedName: name,
            kind: "ROOM",
          },
        });
        resources.push({ id: resource.id, name });
      }
      for (let slot = 0; slot < appointmentsPerBranch; slot += 1) {
        const startsAt = new Date(Date.UTC(2026, 9, 1, 6, slot * 30));
        const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
        const appointmentId = randomUUID();
        const appointmentServiceId = randomUUID();
        const professional = professionals[slot % professionals.length]!;
        const resource = resources[slot % resources.length]!;
        appointmentRows.push({
          id: appointmentId,
          branchProfileId: branchProfile.id,
          customerId: customer.id,
          timezone: "America/Mexico_City",
          startsAt,
          endsAt,
          createdByUserId: user.id,
          updatedByUserId: user.id,
          status: "ATTENDED",
        });
        serviceRows.push({
          id: appointmentServiceId,
          appointmentId,
          serviceProfileId: service.id,
          sequence: 1,
          serviceNameSnapshot: item.name,
          serviceVersionSnapshot: service.version,
          durationMinutesSnapshot: 30,
          preparationMinutesSnapshot: 0,
          cleanupMinutesSnapshot: 0,
          startsAt,
          endsAt,
          occupiesFrom: startsAt,
          occupiesUntil: endsAt,
        });
        participantRows.push({
          appointmentServiceId,
          professionalProfileId: professional.id,
          professionalNameSnapshot: professional.name,
        });
        resourceRows.push({
          appointmentServiceId,
          resourceId: resource.id,
          exclusiveSnapshot: true,
          resourceNameSnapshot: resource.name,
        });
      }
    }
    await prisma.schedulerAppointment.createMany({ data: appointmentRows });
    await prisma.schedulerAppointmentService.createMany({ data: serviceRows });
    await prisma.schedulerAppointmentParticipant.createMany({
      data: participantRows,
    });
    await prisma.schedulerAppointmentResource.createMany({
      data: resourceRows,
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Puerto inválido");
    baseUrl = `http://127.0.0.1:${address.port}`;
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `${suffix}@keysar.test`, password }),
    });
    token = (login.body.data as { token: string }).token;
  }, 120_000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await prisma.$disconnect();
  });

  it("exports a full day across 30 branches and calculates 24-hour availability", async () => {
    const maxDurationMs = Number(
      process.env["SCHEDULER_LOAD_MAX_MS"] ?? "30000",
    );
    const params = new URLSearchParams({
      dateFrom: "2026-10-01",
      dateTo: "2026-10-01",
      branchIds: branchIds.join(","),
    });
    const startedAt = performance.now();
    const exported = await request(
      `/api/scheduler/exports/APPOINTMENTS?${params}`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );
    const exportDurationMs = performance.now() - startedAt;
    expect(exported.response.status).toBe(200);
    const dataset = exported.body.data as {
      total: number;
      rows: unknown[];
      branchIds: string[];
    };
    expect(dataset.total).toBe(expectedAppointments);
    expect(dataset.rows).toHaveLength(expectedAppointments);
    expect(dataset.branchIds).toHaveLength(branchCount);
    expect(exportDurationMs).toBeLessThan(maxDurationMs);

    const availabilityStartedAt = performance.now();
    const availability = await request(
      `/api/scheduler/availability?branchId=${branchIds[0]}&serviceProfileId=${serviceProfileId}&date=2026-10-01`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const availabilityDurationMs = performance.now() - availabilityStartedAt;
    expect(availability.response.status).toBe(200);
    const availabilityData = availability.body.data as {
      slots: unknown[];
      intervalMinutes: number;
    };
    expect(availabilityData.intervalMinutes).toBe(15);
    expect(availabilityData.slots).toHaveLength(96 * professionalsPerBranch);
    expect(availabilityDurationMs).toBeLessThan(maxDurationMs);
  }, 60_000);
});
