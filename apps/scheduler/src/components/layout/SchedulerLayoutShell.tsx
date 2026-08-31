"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@cosmetics/ui";
import { SchedulerAppSidebar } from "./SchedulerAppSidebar";

export function SchedulerLayoutShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width-icon": "4rem" } as CSSProperties}
    >
      <SchedulerAppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-[var(--bg-primary)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-color)] bg-white/90 px-4 backdrop-blur md:hidden">
          <SidebarTrigger
            aria-label="Abrir navegación principal"
            className="h-11 w-11 rounded-xl text-[var(--scheduler-ink-strong)] hover:bg-[var(--scheduler-accent-soft)]"
          />
          <img
            alt="Keysar Cosmetics"
            className="h-7 w-7 object-contain"
            height={28}
            src="/logo.svg"
            width={28}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--scheduler-ink-strong)]">
              Keysar Scheduler
            </p>
            <p className="truncate text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
              Agenda interna
            </p>
          </div>
        </header>
        <main id="scheduler-main-content" className="min-w-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
