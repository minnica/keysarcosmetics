import type { AgendaSlot, Client } from "./types";

export interface AgendaAvailabilityQuery {
  branch: string;
  date: string;
  seats: number;
  consecutiveSlots?: number;
}

export interface AgendaReservationRequest {
  idempotencyKey: string;
  clientId: string;
  externalClientId: string;
  clientName: string;
  ticketId: string | null;
  membershipId: string | null;
  services: string[];
  slots: Array<{ externalSlotId: string; seats: number }>;
  source: "NEW_CLIENT" | "COURTESY" | "NEXT_SESSION" | "MEMBERSHIP";
}

export interface AgendaReservationResult {
  reservationId: string;
  externalAppointmentIds: string[];
  status: "CONFIRMED" | "CONFLICT";
  conflictReason?: string;
}

export interface AgendaClientResult {
  externalClientId: string;
  syncedAtIso: string;
}

export interface AgendaMembershipRequest {
  idempotencyKey: string;
  externalClientId: string;
  membershipId: string;
  membershipName: string;
  ticketId: string;
  branch: string;
  totalSessions: number;
}

export interface AgendaMembershipResult {
  externalMembershipId: string;
  syncedAtIso: string;
}

export interface AgendaAppointmentUpdate {
  externalAppointmentId: string;
  status: "ATTENDED" | "CANCELLED" | "NO_SHOW";
  updatedAtIso: string;
}

/**
 * Contract expected from the external CRM adapter. The backend implementation
 * must revalidate capacity while reserving; the frontend availability is only
 * a preview and cannot be treated as a lock.
 */
export interface ExternalAgendaGateway {
  upsertClient(client: Client): Promise<AgendaClientResult>;
  listAvailability(query: AgendaAvailabilityQuery): Promise<AgendaSlot[]>;
  reserve(request: AgendaReservationRequest): Promise<AgendaReservationResult>;
  linkMembership(request: AgendaMembershipRequest): Promise<AgendaMembershipResult>;
  markAttended(externalAppointmentId: string, membershipId: string): Promise<void>;
  listAppointmentUpdates(): Promise<AgendaAppointmentUpdate[]>;
  cancel(reservationId: string, reason: string): Promise<void>;
}

/**
 * Demo adapter with the same idempotent contract expected from the CRM API.
 * Production only needs to replace this factory with the authenticated HTTP
 * adapter; client, reservation and membership identifiers already persist in
 * the POS domain records.
 */
export const createMockExternalAgendaGateway = (): ExternalAgendaGateway => {
  const clientLinks = new Map<string, AgendaClientResult>();
  const reservations = new Map<string, AgendaReservationResult>();
  const membershipLinks = new Map<string, AgendaMembershipResult>();

  return {
    async upsertClient(client) {
      const current = clientLinks.get(client.id);
      const result = {
        externalClientId: current?.externalClientId ?? `crm-client-${client.id}`,
        syncedAtIso: new Date().toISOString(),
      };
      clientLinks.set(client.id, result);
      return result;
    },
    async listAvailability() {
      return [];
    },
    async reserve(request) {
      const current = reservations.get(request.idempotencyKey);
      if (current) return current;
      const result: AgendaReservationResult = {
        reservationId: `crm-reservation-${crypto.randomUUID()}`,
        externalAppointmentIds: request.services.map(
          () => `crm-appointment-${crypto.randomUUID()}`,
        ),
        status: "CONFIRMED",
      };
      reservations.set(request.idempotencyKey, result);
      return result;
    },
    async linkMembership(request) {
      const current = membershipLinks.get(request.idempotencyKey);
      if (current) return current;
      const result = {
        externalMembershipId: `crm-membership-${request.membershipId}`,
        syncedAtIso: new Date().toISOString(),
      };
      membershipLinks.set(request.idempotencyKey, result);
      return result;
    },
    async markAttended() {},
    async listAppointmentUpdates() {
      return [];
    },
    async cancel() {},
  };
};

export const availableAgendaSeats = (slot: AgendaSlot) =>
  Math.max(0, slot.capacity - slot.reservedCount);

export const isSellerSelectableAgendaSlot = (slot: AgendaSlot) =>
  (slot.status === "AVAILABLE" || slot.status === "CANCELLED") &&
  availableAgendaSeats(slot) > 0;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const agendaDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const createMockAgendaSlots = (branches: string[]): AgendaSlot[] => {
  const starts = ["10:00", "11:00", "12:00", "16:00", "17:00"];
  const ends = ["11:00", "12:00", "13:00", "17:00", "18:00"];
  const today = new Date();

  return branches.flatMap((branch, branchIndex) =>
    Array.from({ length: 21 }, (_, dayIndex) => {
      const date = agendaDate(addDays(today, dayIndex + 1));
      return [
        { id: "individual-1", name: "Cabina individual 1", type: "INDIVIDUAL" as const, capacity: 1 },
        { id: "individual-2", name: "Cabina individual 2", type: "INDIVIDUAL" as const, capacity: 1 },
        { id: "double-a", name: "Cabina doble A", type: "DOUBLE" as const, capacity: 2 },
      ].flatMap((resource, resourceIndex) =>
        starts.map((startTime, timeIndex) => {
          const statusSeed =
            dayIndex * 5 + timeIndex + resourceIndex + branchIndex;
          const status =
            statusSeed % 11 === 0
              ? "CANCELLED"
              : statusSeed % 7 === 0
                ? "BOOKED"
                : statusSeed % 13 === 0
                  ? "BLOCKED"
                  : "AVAILABLE";
          const reservedCount = status === "BOOKED" ? resource.capacity : 0;
          const slotId = `${branch}-${date}-${resource.id}-${startTime}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^A-Za-z0-9]+/g, "-")
            .toLowerCase();
          return {
            id: slotId,
            externalSystem: "CRM_AGENDA_DEMO",
            externalCalendarId: `calendar-${branchIndex + 1}`,
            externalSlotId: `crm-${slotId}`,
            branch,
            date,
            startTime,
            endTime: ends[timeIndex]!,
            resourceId: `${branchIndex + 1}-${resource.id}`,
            resourceName: resource.name,
            resourceType: resource.type,
            capacity: resource.capacity,
            reservedCount,
            status,
            updatedAtIso: new Date().toISOString(),
          } satisfies AgendaSlot;
        }),
      );
    }).flat(),
  );
};
