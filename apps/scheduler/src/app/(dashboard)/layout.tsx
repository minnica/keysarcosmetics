import type { ReactNode } from "react";
import { SchedulerAccessGuard } from "@/components/SchedulerAccessGuard";

export default function SchedulerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SchedulerAccessGuard>{children}</SchedulerAccessGuard>;
}
