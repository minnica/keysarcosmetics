import { cn } from "@cosmetics/ui";
import {
  bookingStatuses,
  type BookingStatus,
} from "@/lib/scheduler-presentation";
import { getSchedulerStatusColorTokens } from "@/lib/scheduler-status-presentation";

interface SchedulerStatusBadgeProps {
  status: BookingStatus;
  color: string;
  className?: string;
  compact?: boolean;
}

export function SchedulerStatusBadge({
  status,
  color,
  className,
  compact = false,
}: SchedulerStatusBadgeProps) {
  const tokens = getSchedulerStatusColorTokens(color);

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center rounded-full border font-semibold",
        compact
          ? "gap-1 px-1.5 py-0.5 text-[0.56rem] leading-none"
          : "gap-2 px-3 py-1.5 text-xs",
        className,
      )}
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        color: tokens.foreground,
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 rounded-full ring-1 ring-white/80",
          compact ? "h-1.5 w-1.5" : "h-2.5 w-2.5",
        )}
        style={{ backgroundColor: tokens.accent }}
      />
      <span className="truncate">{bookingStatuses[status].label}</span>
    </span>
  );
}
