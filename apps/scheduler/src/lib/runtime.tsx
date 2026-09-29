"use client";

import { SchedulerSessionProvider } from "./session";

// Entrada normal. El build de diseño selecciona su runtime por alias.
export function SchedulerRuntime({ children }: { children: React.ReactNode }) {
  return <SchedulerSessionProvider>{children}</SchedulerSessionProvider>;
}
