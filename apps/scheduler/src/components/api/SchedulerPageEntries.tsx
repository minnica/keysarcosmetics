"use client";

import { ApiAgendaWorkspace } from "./ApiAgendaWorkspace";
import { ApiAdministrationWorkspace } from "./ApiAdministrationWorkspace";
import { ApiClientsWorkspace } from "./ApiClientsWorkspace";
import { ApiReportsWorkspace } from "./ApiReportsWorkspace";
import { ApiSettingsWorkspace } from "./ApiSettingsWorkspace";

// RV1 keeps one explicit production entry per module. Restored presentation
// replaces these entries only after its API adapter is ready; fixtures never do.
export function SchedulerAgendaEntry() {
  return <ApiAgendaWorkspace />;
}

export function SchedulerClientsEntry() {
  return <ApiClientsWorkspace />;
}

export function SchedulerAdministrationEntry() {
  return <ApiAdministrationWorkspace />;
}

export function SchedulerSettingsEntry() {
  return <ApiSettingsWorkspace />;
}

export function SchedulerReportsEntry({
  view = "summary",
}: {
  view?: "summary" | "sales";
}) {
  return <ApiReportsWorkspace view={view} />;
}

export function SchedulerReservationReportsEntry({
  view = "reservations",
  fixedBranchId,
}: {
  view?:
    | "reservations"
    | "history"
    | "performance"
    | "locations"
    | "messaging"
    | "metrics"
    | "services"
    | "services-by-location"
    | "providers-by-location";
  fixedBranchId?: string;
}) {
  return (
    <ApiReportsWorkspace
      view={view}
      {...(fixedBranchId ? { fixedBranchId } : {})}
    />
  );
}

export function SchedulerClientSectionEntry({
  section,
}: {
  section: "reporte-de-encuestas" | "recordatorios";
}) {
  return (
    <ApiReportsWorkspace
      view={section === "reporte-de-encuestas" ? "surveys" : "reminders"}
    />
  );
}
