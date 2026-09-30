import type { ReactNode } from "react";
import { SchedulerTopNavigation } from "./SchedulerTopNavigation";

export function SchedulerLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-hidden bg-[var(--bg-primary)]">
      <SchedulerTopNavigation />
      <main id="scheduler-main-content" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
