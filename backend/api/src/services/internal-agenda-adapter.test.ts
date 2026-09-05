import { describe, expect, it } from "vitest";
import {
  InternalAgendaAdapter,
  internalAgendaResourceId,
  internalAgendaSlotId,
  parseInternalAgendaResourceId,
  parseInternalAgendaSlotId,
} from "./internal-agenda-adapter";
import { AgendaAdapterError } from "./agenda-adapter";

describe("internal Agenda identifiers", () => {
  it("round-trips the canonical service, professional and instant", () => {
    const startsAt = new Date("2026-09-05T16:00:00.000Z");
    const resourceId = internalAgendaResourceId(
      "branch-profile-1",
      "service-1",
      "professional-1",
    );
    const slotId = internalAgendaSlotId({
      branchProfileId: "branch-profile-1",
      serviceProfileId: "service-1",
      professionalProfileId: "professional-1",
      startsAt,
    });
    expect(parseInternalAgendaResourceId(resourceId)).toEqual({
      branchProfileId: "branch-profile-1",
      serviceProfileId: "service-1",
      professionalProfileId: "professional-1",
    });
    expect(parseInternalAgendaSlotId(slotId)).toEqual({
      branchProfileId: "branch-profile-1",
      serviceProfileId: "service-1",
      professionalProfileId: "professional-1",
      startsAt,
    });
  });

  it("rejects legacy and malformed identifiers", () => {
    expect(parseInternalAgendaResourceId("agenda-resource-1")).toBeNull();
    expect(parseInternalAgendaSlotId("scheduler-slot:missing")).toBeNull();
  });

  it("fails before touching persistence when the requested range is invalid", async () => {
    await expect(
      new InternalAgendaAdapter().listAvailability({
        branchCode: "POL",
        from: "invalid",
        to: "2026-09-05T17:00:00.000Z",
        seats: 1,
      }),
    ).rejects.toBeInstanceOf(AgendaAdapterError);
  });
});
