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

export interface SchedulerBookingOverlapInput {
  id: string;
  groupId: string;
  startMinutes: number;
  endMinutes: number;
}

export interface SchedulerBookingOverlapLane {
  laneIndex: number;
  laneCount: number;
}

export function getSchedulerBookingOverlapLayout(
  bookings: SchedulerBookingOverlapInput[],
): Record<string, SchedulerBookingOverlapLane> {
  const result: Record<string, SchedulerBookingOverlapLane> = {};
  const groups = new Map<string, SchedulerBookingOverlapInput[]>();
  for (const booking of bookings) {
    const group = groups.get(booking.groupId) ?? [];
    group.push(booking);
    groups.set(booking.groupId, group);
  }

  function assignCluster(cluster: SchedulerBookingOverlapInput[]) {
    const laneEnds: number[] = [];
    const assignments = cluster.map((booking) => {
      const reusableLane = laneEnds.findIndex(
        (laneEnd) => laneEnd <= booking.startMinutes,
      );
      const laneIndex = reusableLane < 0 ? laneEnds.length : reusableLane;
      laneEnds[laneIndex] = booking.endMinutes;
      return { booking, laneIndex };
    });
    const laneCount = Math.max(1, laneEnds.length);
    assignments.forEach(({ booking, laneIndex }) => {
      result[booking.id] = { laneIndex, laneCount };
    });
  }

  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (left, right) =>
        left.startMinutes - right.startMinutes ||
        left.endMinutes - right.endMinutes ||
        left.id.localeCompare(right.id),
    );
    let cluster: SchedulerBookingOverlapInput[] = [];
    let clusterEnd = Number.NEGATIVE_INFINITY;
    for (const booking of sorted) {
      if (cluster.length && booking.startMinutes >= clusterEnd) {
        assignCluster(cluster);
        cluster = [];
        clusterEnd = Number.NEGATIVE_INFINITY;
      }
      cluster.push(booking);
      clusterEnd = Math.max(clusterEnd, booking.endMinutes);
    }
    if (cluster.length) assignCluster(cluster);
  }

  return result;
}
