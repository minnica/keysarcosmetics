import { describe, expect, it } from "vitest";
import type { PosTicketAppointmentInputDto } from "@cosmetics/types";
import {
  agendaAttendanceCorrectionDelta,
  decideAgendaWebhookTransition,
  groupAgendaAppointments,
  isAgendaSlotEligible,
  PosAgendaError,
} from "./pos-agenda";

const appointment = (
  mode: PosTicketAppointmentInputDto["agendaReservationMode"],
  slot: string,
): PosTicketAppointmentInputDto => ({
  kind: "COURTESY",
  serviceName: "Facial",
  branchId: "branch-1",
  scheduledAt: "2026-09-05T16:00:00.000Z",
  agendaSlotId: slot,
  agendaReservationMode: mode,
  courtesyReason: "WELCOME",
});

describe("Agenda webhook ordering", () => {
  it("ignores duplicate and out-of-order versions", () => {
    expect(
      decideAgendaWebhookTransition({
        currentStatus: "SCHEDULED",
        currentVersion: 4,
        incomingType: "CANCELED",
        incomingVersion: 4,
      }),
    ).toBe("IGNORE");
    expect(
      decideAgendaWebhookTransition({
        currentStatus: "SCHEDULED",
        currentVersion: 4,
        incomingType: "ATTENDED",
        incomingVersion: 3,
      }),
    ).toBe("IGNORE");
  });

  it("holds a contradictory attendance outcome for authorization", () => {
    expect(
      decideAgendaWebhookTransition({
        currentStatus: "COMPLETED",
        currentVersion: 4,
        incomingType: "NO_SHOW",
        incomingVersion: 5,
      }),
    ).toBe("REQUIRE_CORRECTION");
    expect(
      decideAgendaWebhookTransition({
        currentStatus: "CANCELED",
        currentVersion: 4,
        incomingType: "ATTENDED",
        incomingVersion: 5,
      }),
    ).toBe("REQUIRE_CORRECTION");
  });

  it("supports successive append-only attendance corrections", () => {
    expect(agendaAttendanceCorrectionDelta([], "CANCELED")).toBe(-1);
    expect(agendaAttendanceCorrectionDelta([-1], "ATTENDED")).toBe(1);
    expect(agendaAttendanceCorrectionDelta([-1, 1], "NO_SHOW")).toBe(-1);
  });
});

describe("Agenda reservation grouping", () => {
  it("groups two simultaneous services as one reservable unit", () => {
    const groups = groupAgendaAppointments([
      appointment("SIMULTANEOUS_DOUBLE", "slot-1"),
      appointment("SIMULTANEOUS_DOUBLE", "slot-1"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.entries.map((entry) => entry.index)).toEqual([0, 1]);
  });

  it("does not include the negative no-appointment history in Agenda", () => {
    const groups = groupAgendaAppointments([
      {
        kind: "NO_APPOINTMENT",
        serviceName: "Sin próxima sesión",
        branchId: "branch-1",
      },
    ]);
    expect(groups).toEqual([]);
  });

  it("rejects one half of a double courtesy", () => {
    expect(() =>
      groupAgendaAppointments([appointment("CONSECUTIVE", "slot-1")]),
    ).toThrowError(PosAgendaError);
  });

  it("rejects double reservations outside a courtesy", () => {
    const nextSession = {
      ...appointment("SIMULTANEOUS_DOUBLE", "slot-1"),
      kind: "NEXT_SESSION" as const,
      courtesyReason: undefined,
    };
    expect(() =>
      groupAgendaAppointments([nextSession, nextSession]),
    ).toThrowError(PosAgendaError);
  });
});

describe("Agenda slot eligibility", () => {
  it("never reuses canceled or blocked slots", () => {
    expect(
      isAgendaSlotEligible({
        status: "CANCELED",
        capacity: 2,
        reservedCount: 0,
      }),
    ).toBe(false);
    expect(
      isAgendaSlotEligible({
        status: "BLOCKED",
        capacity: 2,
        reservedCount: 0,
      }),
    ).toBe(false);
  });

  it("requires enough capacity in an available slot", () => {
    expect(
      isAgendaSlotEligible(
        { status: "AVAILABLE", capacity: 2, reservedCount: 1 },
        2,
      ),
    ).toBe(false);
    expect(
      isAgendaSlotEligible(
        { status: "AVAILABLE", capacity: 2, reservedCount: 0 },
        2,
      ),
    ).toBe(true);
  });
});
