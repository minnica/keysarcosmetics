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
  hasPurchase?: boolean;
  purchaseAmount?: number | undefined;
  label?: string;
}

const purchaseAmountFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

export function SchedulerStatusBadge({
  status,
  color,
  className,
  compact = false,
  hasPurchase = false,
  purchaseAmount,
  label,
}: SchedulerStatusBadgeProps) {
  const tokens = getSchedulerStatusColorTokens(color);
  const visiblePurchaseAmount =
    hasPurchase &&
    typeof purchaseAmount === "number" &&
    Number.isFinite(purchaseAmount) &&
    purchaseAmount > 0
      ? purchaseAmountFormatter.format(purchaseAmount)
      : null;
  const purchaseLabel = visiblePurchaseAmount
    ? `Venta o apartado registrado por $${visiblePurchaseAmount}`
    : "Venta o apartado registrado";

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
      <span className="truncate">{label ?? bookingStatuses[status].label}</span>
      {hasPurchase ? (
        <span
          aria-label={purchaseLabel}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-[#263649] font-bold leading-none text-white",
            compact
              ? "h-3.5 gap-0.5 px-1 text-[0.5rem]"
              : "h-5 gap-1 px-1.5 text-[0.68rem]",
          )}
          title={purchaseLabel}
        >
          <span aria-hidden="true">$</span>
          {visiblePurchaseAmount ? (
            <span className="tabular-nums">{visiblePurchaseAmount}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
