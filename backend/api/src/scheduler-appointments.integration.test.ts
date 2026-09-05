import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./prisma/client";

const enabled = process.env["RUN_DATABASE_TESTS"] === "true";
const integrationDescribe = enabled ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;
const password = "Scheduler-Integration-2026";
let server: Server;
let baseUrl: string;
let token: string;
let branchId: string;
let customerId: string;
let serviceProfileId: string;
let professionalProfileId: string;

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() };
}

integrationDescribe("Scheduler appointment concurrency with PostgreSQL", () => {
  beforeAll(async () => {
    process.env["JWT_SECRET"] = "scheduler-integration-secret-with-safe-length";
    const branch = await prisma.sucursal.create({
      data: { nombre: `Scheduler branch ${suffix}` },
    });
    branchId = branch.id;
    const commerce = await prisma.schedulerCommerce.create({
      data: {
        name: `Scheduler commerce ${suffix}`,
        normalizedName: `scheduler commerce ${suffix}`,
      },
    });
    const branchProfile = await prisma.schedulerBranchProfile.create({
      data: {
        branchId,
        commerceId: commerce.id,
        bookingEnabled: true,
        timezone: "America/Mexico_City",
      },
    });
    await prisma.schedulerAvailabilityRule.create({
      data: {
        branchProfileId: branchProfile.id,
        kind: "WORKING",
        weekday: "FRIDAY",
        startMinute: 9 * 60,
        endMinute: 18 * 60,
      },
    });
    const employee = await prisma.empleado.create({
      data: {
        nombres: "Scheduler",
        apellidoPaterno: "Integration",
        apellidoMaterno: "Professional",
        nombreCompleto: `Scheduler Professional ${suffix}`,
        banco: "TEST",
        numeroCuenta: suffix,
        puesto: "TEST",
        metaIndividual: 0,
        sucursalId: branchId,
      },
    });
    const professional = await prisma.schedulerProfessionalProfile.create({
      data: {
        employeeId: employee.id,
        branchAssignments: {
          create: { branchProfileId: branchProfile.id },
        },
      },
    });
    professionalProfileId = professional.id;
    const item = await prisma.catalogItem.create({
      data: {
        sku: `SCHEDULER-SERVICE-${suffix}`,
        name: "Servicio concurrencia",
        normalizedName: `servicio concurrencia ${suffix}`,
        kind: "SERVICE",
        published: true,
      },
    });
    const service = await prisma.schedulerServiceProfile.create({
      data: {
        catalogItemId: item.id,
        durationMinutes: 60,
        branchAssignments: {
          create: { branchProfileId: branchProfile.id },
        },
        professionalAssignments: {
          create: {
            branchProfileId: branchProfile.id,
            professionalProfileId: professional.id,
          },
        },
      },
    });
    serviceProfileId = service.id;
    const customer = await prisma.customer.create({
      data: {
        displayName: `Scheduler Customer ${suffix}`,
        normalizedName: `scheduler customer ${suffix}`,
      },
    });
    customerId = customer.id;
    const email = `scheduler-integration-${suffix}@keysar.test`;
    await prisma.usuario.create({
      data: {
        nombre: "Scheduler Integration Admin",
        email,
        passwordHash: await bcrypt.hash(password, 4),
        rol: "SUPER_ADMIN",
      },
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
      body: JSON.stringify({ email, password }),
    });
    token = (login.body as { data: { token: string } }).data.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await prisma.$disconnect();
  });

  it("enforces authentication and exposes the materialized Scheduler bootstrap", async () => {
    const anonymous = await request("/api/scheduler/bootstrap");
    expect(anonymous.response.status).toBe(401);

    const authenticated = await request("/api/scheduler/bootstrap", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(authenticated.response.status).toBe(200);
    expect(authenticated.body).toMatchObject({
      success: true,
      data: { user: { role: "SUPER_ADMIN" } },
    });
  });

  it("replays an idempotent create and rejects a stale version", async () => {
    const body = {
      branchId,
      customerId,
      startsAt: "2026-09-11T18:00:00.000Z",
      services: [
        { serviceProfileId, professionalProfileIds: [professionalProfileId] },
      ],
    };
    const idempotencyKey = randomUUID();
    const create = () =>
      request("/api/scheduler/appointments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });
    const first = await create();
    const replay = await create();
    expect(first.response.status).toBe(201);
    expect(replay.response.status).toBe(200);
    const appointment = (
      first.body as { data: { id: string; version: number } }
    ).data;
    expect(replay.body).toMatchObject({
      data: { id: appointment.id, version: 1 },
    });

    const changed = await request(
      `/api/scheduler/appointments/${appointment.id}/status`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "CONFIRMED", expectedVersion: 1 }),
      },
    );
    expect(changed.response.status).toBe(200);
    const stale = await request(
      `/api/scheduler/appointments/${appointment.id}/status`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "ARRIVED", expectedVersion: 1 }),
      },
    );
    expect(stale.response.status).toBe(409);
    expect(stale.body).toMatchObject({
      success: false,
      data: { code: "VERSION_CONFLICT" },
    });
  });

  it("accepts exactly one request for the last professional slot", async () => {
    const body = {
      branchId,
      customerId,
      startsAt: "2026-09-11T16:00:00.000Z",
      services: [
        { serviceProfileId, professionalProfileIds: [professionalProfileId] },
      ],
    };
    const create = (key: string) =>
      request("/api/scheduler/appointments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": key,
        },
        body: JSON.stringify(body),
      });
    const results = await Promise.all([
      create(randomUUID()),
      create(randomUUID()),
    ]);
    expect(results.map(({ response }) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const conflict = results.find(({ response }) => response.status === 409)!;
    expect(conflict.body).toMatchObject({
      success: false,
      data: { code: "PROFESSIONAL_BUSY" },
    });
  });
});
