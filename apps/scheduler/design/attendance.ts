import type { SchedulerAppointmentStatus } from "@cosmetics/types";
import type { DesignVisitAttendanceStatus } from "./contracts";

export const designVisitAttendanceStatuses = [
  "PENDING",
  "ARRIVED",
  "ATTENDED",
  "NO_SHOW",
] as const satisfies readonly DesignVisitAttendanceStatus[];

export function resolveDesignVisitAttendanceStatus(
  value: unknown,
  appointmentStatus: SchedulerAppointmentStatus,
): DesignVisitAttendanceStatus {
  if (
    designVisitAttendanceStatuses.includes(
      value as DesignVisitAttendanceStatus,
    )
  ) {
    return value as DesignVisitAttendanceStatus;
  }
  if (
    appointmentStatus === "ARRIVED" ||
    appointmentStatus === "ATTENDED" ||
    appointmentStatus === "NO_SHOW"
  ) {
    return appointmentStatus;
  }
  return "PENDING";
}

export function deriveDesignAppointmentAttendanceStatus(
  statuses: readonly DesignVisitAttendanceStatus[],
): "ARRIVED" | "ATTENDED" | "NO_SHOW" | "PENDING" {
  if (statuses.some((status) => status === "ATTENDED")) return "ATTENDED";
  if (statuses.some((status) => status === "ARRIVED")) return "ARRIVED";
  if (statuses.length && statuses.every((status) => status === "NO_SHOW")) {
    return "NO_SHOW";
  }
  return "PENDING";
}

export function reportStatusForDesignVisitor(
  attendanceStatus: DesignVisitAttendanceStatus,
  appointmentStatus: SchedulerAppointmentStatus,
): SchedulerAppointmentStatus {
  if (appointmentStatus === "CANCELED") return "CANCELED";
  return attendanceStatus === "PENDING"
    ? appointmentStatus
    : attendanceStatus;
}
