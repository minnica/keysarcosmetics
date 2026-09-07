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
  initialKey = "APPOINTMENTS",
}: {
  initialKey?: "APPOINTMENTS" | "SALES";
}) {
  return <ApiReportsWorkspace initialKey={initialKey} />;
}

export function SchedulerReservationReportsEntry({
  view,
}: {
  view?: "history" | "performance";
}) {
  return (
    <ApiReportsWorkspace
      compactTitle={
        view === "performance"
          ? "Rendimiento de reservas"
          : "Reporte de reservas"
      }
      initialKey={view === "performance" ? "PROFESSIONALS" : "APPOINTMENTS"}
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
      compactTitle={
        section === "reporte-de-encuestas"
          ? "Reporte de encuestas"
          : "Recordatorios"
      }
      initialKey={
        section === "reporte-de-encuestas" ? "SURVEYS" : "COMMUNICATIONS"
      }
    />
  );
}
