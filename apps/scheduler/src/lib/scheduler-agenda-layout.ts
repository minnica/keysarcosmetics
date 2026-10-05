import type { Professional } from "./scheduler-presentation";

export type SchedulerAgendaColumnMode = "CABINS" | "SPECIALISTS" | "ALL";

export function isSchedulerCabinColumn(
  column: Pick<Professional, "kind" | "resourceKind">,
): boolean {
  return column.kind === "RESOURCE" && column.resourceKind === "ROOM";
}

export function filterSchedulerAgendaColumns(
  columns: Professional[],
  mode: SchedulerAgendaColumnMode,
): Professional[] {
  if (mode === "ALL") return columns;
  return columns.filter((column) =>
    mode === "CABINS"
      ? isSchedulerCabinColumn(column)
      : column.kind !== "RESOURCE",
  );
}

export function shouldFitSchedulerAgendaColumns(
  viewportWidth: number,
  columnCount: number,
  sidebarVisible: boolean,
): boolean {
  if (columnCount <= 0) return true;

  const horizontalChrome = sidebarVisible ? 448 : 112;
  const availableWidth = Math.max(280, viewportWidth - horizontalChrome);
  const minimumReadableColumnWidth = viewportWidth < 768 ? 220 : 224;

  return availableWidth / columnCount >= minimumReadableColumnWidth;
}
