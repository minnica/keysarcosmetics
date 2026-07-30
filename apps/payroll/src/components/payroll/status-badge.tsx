import { Badge, type BadgeProps } from "@cosmetics/ui";
import { formatStatus } from "@/lib/format";

type Status =
  | "DRAFT"
  | "CALCULATED"
  | "APPROVED"
  | "PAID"
  | "CANCELED"
  | "PENDING"
  | "REJECTED"
  | "LOST"
  | "GENERATED"
  | "SENT"
  | "CONFIRMED";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANTS: Record<Status, BadgeVariant> = {
  DRAFT: "secondary",
  CALCULATED: "outline",
  APPROVED: "default",
  PAID: "default",
  CANCELED: "secondary",
  PENDING: "outline",
  REJECTED: "destructive",
  LOST: "destructive",
  GENERATED: "secondary",
  SENT: "outline",
  CONFIRMED: "default",
};

export function StatusBadge({ status }: { status: Status }) {
  const isSuccess =
    status === "APPROVED" || status === "PAID" || status === "CONFIRMED";

  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={
        isSuccess
          ? "bg-[#648672] text-white uppercase dark:bg-[#8bb09b] dark:text-[#1a1a1a]"
          : "uppercase"
      }
    >
      {formatStatus(status)}
    </Badge>
  );
}
