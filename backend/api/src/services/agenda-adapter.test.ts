import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgendaAdapterError,
  HttpAgendaAdapter,
  agendaAdapterFromEnvironment,
  agendaProviderFromEnvironment,
  verifyAgendaWebhookSignature,
} from "./agenda-adapter";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Agenda adapter security and contract", () => {
  it("uses Scheduler internally by default without HTTP and keeps HTTP as explicit rollback", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const internal = agendaAdapterFromEnvironment();
    expect(internal.provider).toBe("internal");
    await expect(
      internal.upsertClient(
        {
          localClientKey: "customer-1",
          externalClientId: null,
          displayName: "Clienta",
          phone: null,
          email: null,
        },
        "internal-client-key",
      ),
    ).resolves.toEqual({ externalClientId: "scheduler-client:customer-1" });
    await expect(
      internal.updateClient(
        {
          localClientKey: "customer-1",
          externalClientId: null,
          displayName: "Clienta",
          phone: null,
          email: null,
        },
        "internal-update-key",
      ),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv("AGENDA_PROVIDER", "http");
    vi.stubEnv("AGENDA_API_URL", "https://agenda.invalid");
    vi.stubEnv("AGENDA_API_TOKEN", "server-token");
    expect(agendaAdapterFromEnvironment()).toBeInstanceOf(HttpAgendaAdapter);
    expect(agendaProviderFromEnvironment("HTTP")).toBe("http");
  });

  it("fails closed for an unknown provider", () => {
    expect(() => agendaProviderFromEnvironment("mirror")).toThrowError(
      AgendaAdapterError,
    );
  });

  it("accepts a fresh HMAC signature and rejects replayed timestamps", () => {
    const rawBody = Buffer.from('{"eventId":"evt-1"}');
    const timestamp = "1788541200";
    const secret = "agenda-webhook-secret";
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest("hex");
    expect(
      verifyAgendaWebhookSignature({
        rawBody,
        timestamp,
        signature: `sha256=${signature}`,
        secret,
        now: Number(timestamp) * 1_000,
      }),
    ).toBe(true);
    expect(
      verifyAgendaWebhookSignature({
        rawBody,
        timestamp,
        signature,
        secret,
        now: Number(timestamp) * 1_000 + 301_000,
      }),
    ).toBe(false);
  });

  it("normalizes a canceled reusable slot without exposing credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              externalSlotId: "slot-1",
              externalCalendarId: "calendar-1",
              externalResourceId: "room-1",
              resourceName: "Cabina doble",
              resourceType: "DOUBLE",
              startsAt: "2026-09-05T16:00:00.000Z",
              endsAt: "2026-09-05T17:00:00.000Z",
              capacity: 2,
              reservedCount: 0,
              status: "CANCELLED",
              version: 7,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new HttpAgendaAdapter(
      "https://agenda.invalid",
      "server-token",
    );
    const slots = await adapter.listAvailability({
      branchCode: "POL",
      from: "2026-09-05T00:00:00.000Z",
      to: "2026-09-06T00:00:00.000Z",
      seats: 2,
    });
    expect(slots[0]?.status).toBe("CANCELED");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((request.headers as Record<string, string>).Authorization).toBe(
      "Bearer server-token",
    );
  });

  it("fails closed when Agenda returns only part of a double booking", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            externalReservationId: "reservation-1",
            externalAppointmentIds: ["appointment-1"],
            version: 3,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const adapter = new HttpAgendaAdapter(
      "https://agenda.invalid",
      "server-token",
    );
    await expect(
      adapter.reserveLeg({
        idempotencyKey: "stable-key",
        externalClientId: "client-1",
        branchCode: "POL",
        slots: [{ externalSlotId: "slot-1", expectedVersion: 3, seats: 2 }],
        services: [
          { name: "Facial A", localServiceId: null },
          { name: "Facial B", localServiceId: null },
        ],
        source: "COURTESY",
      }),
    ).rejects.toMatchObject({
      code: "AGENDA_PARTIAL_RESERVATION",
    } satisfies Partial<AgendaAdapterError>);
  });
});
