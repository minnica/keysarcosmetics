import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { InternalAgendaAdapter } from "./internal-agenda-adapter";

export class AgendaAdapterError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
    readonly retryable = true,
  ) {
    super(message);
  }
}

export interface AgendaExternalSlot {
  externalSlotId: string;
  externalCalendarId: string | null;
  externalResourceId: string;
  resourceName: string;
  resourceType: "INDIVIDUAL" | "DOUBLE";
  startsAt: string;
  endsAt: string;
  capacity: number;
  reservedCount: number;
  status: "AVAILABLE" | "CANCELED" | "BOOKED" | "BLOCKED";
  version: number;
}

export interface AgendaExternalClientInput {
  localClientKey: string;
  externalClientId: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
}

export interface AgendaReservationLegInput {
  idempotencyKey: string;
  externalClientId: string;
  branchCode: string;
  slots: Array<{
    externalSlotId: string;
    expectedVersion: number;
    seats: number;
  }>;
  services: Array<{ name: string; localServiceId: string | null }>;
  source: "COURTESY" | "NEXT_SESSION" | "MEMBERSHIP";
}

export interface AgendaReservationLegResult {
  externalReservationId: string;
  externalAppointmentIds: string[];
  version: number;
}

export interface AgendaAdapter {
  readonly provider?: AgendaProvider;
  listAvailability(input: {
    branchCode: string;
    from: string;
    to: string;
    serviceItemId?: string;
    seats: number;
  }): Promise<AgendaExternalSlot[]>;
  upsertClient(
    input: AgendaExternalClientInput,
    idempotencyKey: string,
  ): Promise<{ externalClientId: string }>;
  updateClient(
    input: AgendaExternalClientInput,
    idempotencyKey: string,
  ): Promise<void>;
  reserveLeg(
    input: AgendaReservationLegInput,
  ): Promise<AgendaReservationLegResult>;
  cancelReservation(
    externalReservationId: string,
    reason: string,
    idempotencyKey: string,
  ): Promise<void>;
}

export type AgendaProvider = "internal" | "http";

const slotSchema = z
  .object({
    externalSlotId: z.string().min(1).max(160),
    externalCalendarId: z.string().max(160).nullable().optional().default(null),
    externalResourceId: z.string().min(1).max(160),
    resourceName: z.string().min(1).max(240),
    resourceType: z.enum(["INDIVIDUAL", "DOUBLE"]),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    capacity: z.number().int().positive(),
    reservedCount: z.number().int().nonnegative(),
    status: z.enum(["AVAILABLE", "CANCELED", "CANCELLED", "BOOKED", "BLOCKED"]),
    version: z.number().int().positive(),
  })
  .refine((slot) => slot.reservedCount <= slot.capacity, {
    message: "La ocupación de Agenda supera la capacidad",
  })
  .refine((slot) => new Date(slot.endsAt) > new Date(slot.startsAt), {
    message: "El slot de Agenda tiene un rango inválido",
  });
const availabilitySchema = z.object({ items: z.array(slotSchema).max(10_000) });
const clientSchema = z.object({ externalClientId: z.string().min(1).max(160) });
const reservationSchema = z.object({
  externalReservationId: z.string().min(1).max(160),
  externalAppointmentIds: z.array(z.string().min(1).max(160)).min(1).max(2),
  version: z.number().int().positive(),
});

export class HttpAgendaAdapter implements AgendaAdapter {
  readonly provider = "http" as const;
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly timeoutMs = 10_000,
  ) {
    if (!baseUrl || !token)
      throw new AgendaAdapterError(
        "Agenda CRM no está configurada",
        "AGENDA_NOT_CONFIGURED",
        503,
        false,
      );
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      throw new AgendaAdapterError(
        "La URL de Agenda CRM es inválida",
        "AGENDA_INVALID_CONFIGURATION",
        503,
        false,
      );
    }
    if (parsedUrl.protocol !== "https:")
      throw new AgendaAdapterError(
        "Agenda CRM requiere HTTPS",
        "AGENDA_INVALID_CONFIGURATION",
        503,
        false,
      );
    if (!Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000)
      throw new AgendaAdapterError(
        "El timeout de Agenda CRM es inválido",
        "AGENDA_INVALID_CONFIGURATION",
        503,
        false,
      );
  }

  private async request(
    path: string,
    init: RequestInit,
    idempotencyKey?: string,
  ) {
    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...init.headers,
      },
    }).catch(() => {
      throw new AgendaAdapterError(
        "Agenda CRM no respondió",
        "AGENDA_UNAVAILABLE",
      );
    });
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new AgendaAdapterError(
        "Agenda CRM rechazó la operación",
        response.status === 409
          ? "AGENDA_CAPACITY_CONFLICT"
          : `AGENDA_HTTP_${response.status}`,
        response.status === 409 ? 409 : 502,
        response.status >= 500 || response.status === 429,
      );
    }
    return body;
  }

  async listAvailability(input: {
    branchCode: string;
    from: string;
    to: string;
    serviceItemId?: string;
    seats: number;
  }) {
    const query = new URLSearchParams({
      branch: input.branchCode,
      from: input.from,
      to: input.to,
      seats: String(input.seats),
      ...(input.serviceItemId ? { serviceItemId: input.serviceItemId } : {}),
    });
    const parsed = availabilitySchema.safeParse(
      await this.request(`/v1/availability?${query.toString()}`, {
        method: "GET",
      }),
    );
    if (!parsed.success)
      throw new AgendaAdapterError(
        "Agenda CRM devolvió disponibilidad inválida",
        "AGENDA_INVALID_RESPONSE",
        502,
        false,
      );
    return parsed.data.items.map((slot) => ({
      ...slot,
      status: slot.status === "CANCELLED" ? ("CANCELED" as const) : slot.status,
    }));
  }

  async upsertClient(input: AgendaExternalClientInput, idempotencyKey: string) {
    const parsed = clientSchema.safeParse(
      await this.request(
        "/v1/clients/upsert",
        { method: "POST", body: JSON.stringify(input) },
        idempotencyKey,
      ),
    );
    if (!parsed.success)
      throw new AgendaAdapterError(
        "Agenda CRM devolvió una identidad de cliente inválida",
        "AGENDA_INVALID_RESPONSE",
        502,
        false,
      );
    return parsed.data;
  }

  async updateClient(input: AgendaExternalClientInput, idempotencyKey: string) {
    if (!input.externalClientId) return;
    await this.request(
      `/v1/clients/${encodeURIComponent(input.externalClientId)}`,
      { method: "PUT", body: JSON.stringify(input) },
      idempotencyKey,
    );
  }

  async reserveLeg(input: AgendaReservationLegInput) {
    const parsed = reservationSchema.safeParse(
      await this.request(
        "/v1/reservations",
        { method: "POST", body: JSON.stringify(input) },
        input.idempotencyKey,
      ),
    );
    if (
      !parsed.success ||
      parsed.data.externalAppointmentIds.length !== input.services.length
    )
      throw new AgendaAdapterError(
        "Agenda CRM devolvió una reservación incompleta",
        "AGENDA_PARTIAL_RESERVATION",
        502,
        false,
      );
    return parsed.data;
  }

  async cancelReservation(
    externalReservationId: string,
    reason: string,
    idempotencyKey: string,
  ) {
    await this.request(
      `/v1/reservations/${encodeURIComponent(externalReservationId)}/cancel`,
      { method: "POST", body: JSON.stringify({ reason }) },
      idempotencyKey,
    );
  }
}

let testAdapter: AgendaAdapter | null = null;

export function setAgendaAdapterForTests(adapter: AgendaAdapter | null) {
  testAdapter = adapter;
}

export function agendaAdapterFromEnvironment(): AgendaAdapter {
  if (testAdapter) return testAdapter;
  const provider = agendaProviderFromEnvironment();
  if (provider === "internal") {
    return new InternalAgendaAdapter();
  }
  const timeout = Number(process.env["AGENDA_TIMEOUT_MS"] ?? "10000");
  return new HttpAgendaAdapter(
    process.env["AGENDA_API_URL"] ?? "",
    process.env["AGENDA_API_TOKEN"] ?? "",
    Number.isFinite(timeout) ? timeout : 10_000,
  );
}

export function agendaProviderFromEnvironment(
  value = process.env["AGENDA_PROVIDER"],
): AgendaProvider {
  const normalized = (value ?? "internal").trim().toLowerCase();
  if (normalized === "internal" || normalized === "http") return normalized;
  throw new AgendaAdapterError(
    "El proveedor de Agenda es inválido",
    "AGENDA_INVALID_PROVIDER",
    503,
    false,
  );
}

export const agendaPayloadHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function verifyAgendaWebhookSignature(input: {
  rawBody: Buffer;
  timestamp: string | undefined;
  signature: string | undefined;
  secret: string | undefined;
  now?: number;
}) {
  if (!input.timestamp || !input.signature || !input.secret) return false;
  const timestampMs = Number(input.timestamp) * 1_000;
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs((input.now ?? Date.now()) - timestampMs) > 5 * 60 * 1_000
  )
    return false;
  const supplied = input.signature.replace(/^sha256=/, "");
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.`)
    .update(input.rawBody)
    .digest();
  return timingSafeEqual(expected, Buffer.from(supplied, "hex"));
}
