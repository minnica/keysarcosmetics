export const schedulerAgendaSettingsStorageKey = "keysar-scheduler-agenda-settings";
export const schedulerAgendaSettingsChangeEvent = "scheduler-agenda-settings-change";
export const schedulerAgendaSlotOptions = [15, 20, 30, 45, 60] as const;

export type SchedulerAgendaSlotMinutes = (typeof schedulerAgendaSlotOptions)[number];

export function getSchedulerAgendaSlotMinutes(): SchedulerAgendaSlotMinutes {
  if (typeof window === "undefined") return 60;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(schedulerAgendaSettingsStorageKey) ?? "{}",
    ) as { slotMinutes?: string | number };
    const value = Number(saved.slotMinutes);
    return schedulerAgendaSlotOptions.includes(value as SchedulerAgendaSlotMinutes)
      ? (value as SchedulerAgendaSlotMinutes)
      : 60;
  } catch {
    return 60;
  }
}
