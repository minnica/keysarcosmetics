"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  canAccessSchedulerScreen,
  currentSchedulerAccess,
  type SchedulerScreenId,
} from "@/lib/scheduler-access";

function getRequiredScreen(pathname: string): SchedulerScreenId | null {
  if (pathname === "/clientes" || pathname.startsWith("/clientes/")) return "clients";
  if (pathname.startsWith("/administracion")) return null;
  if (pathname.startsWith("/reportes/reservas")) {
    return "reports.reservations";
  }
  if (pathname.startsWith("/reportes")) return "reports.summary";
  if (pathname === "/") return "agenda";
  return null;
}

function canAccessAdministration(): boolean {
  return currentSchedulerAccess.allowedScreenIds.some((screenId) =>
    screenId.startsWith("administration."),
  );
}

function getFallbackRoute(): string {
  if (canAccessSchedulerScreen("agenda")) return "/";
  if (canAccessSchedulerScreen("clients")) return "/clientes";
  if (canAccessSchedulerScreen("reports.summary")) return "/reportes";
  if (canAccessSchedulerScreen("reports.reservations")) {
    return "/reportes/reservas";
  }
  if (canAccessAdministration()) return "/administracion";
  return "/login";
}

export function SchedulerAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const requiredScreen = getRequiredScreen(pathname);
  const allowed = pathname.startsWith("/administracion")
    ? canAccessAdministration()
    : requiredScreen === null || canAccessSchedulerScreen(requiredScreen);

  useEffect(() => {
    if (!allowed) router.replace(getFallbackRoute());
  }, [allowed, router]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="max-w-md text-center" role="status">
          <p className="section-heading">Acceso restringido</p>
          <p className="mt-2 text-sm text-slate-600">
            Tu perfil no tiene permiso para abrir esta pantalla. Te estamos
            llevando a una sección disponible.
          </p>
        </div>
      </main>
    );
  }

  return children;
}
