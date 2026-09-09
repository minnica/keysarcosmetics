import type { ReactNode } from "react";
import { SchedulerAccessGuard } from "@/components/SchedulerAccessGuard";
import { SchedulerLayoutShell } from "@/components/layout/SchedulerLayoutShell";

export const dynamic = "force-dynamic";

export default function SchedulerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SchedulerAccessGuard>
      <SchedulerLayoutShell>{children}</SchedulerLayoutShell>
    </SchedulerAccessGuard>
  );
}
