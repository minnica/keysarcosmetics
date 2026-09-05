"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@cosmetics/ui";
import type { SchedulerScreenKey } from "@cosmetics/types";
import { useSchedulerSession } from "@/lib/session";
import {
  schedulerScreenKeyById,
  type SchedulerScreenId,
} from "@/lib/scheduler-access";

const administrationSections: Record<string, SchedulerScreenId> = {
  locals: "administration.locals",
  professionals: "administration.professionals",
  services: "administration.services",
  commissions: "administration.commissions",
  resources: "administration.resources",
  surveys: "administration.surveys",
  consents: "administration.consents",
  whatsapp: "administration.whatsapp",
  "gift-cards": "administration.gift-cards",
  "status-colors": "administration.status-colors",
};

const settingsSections: Record<string, SchedulerScreenKey> = {
  company: "scheduler/settings/company",
  website: "scheduler/settings/website",
  agenda: "scheduler/settings/agenda",
  payments: "scheduler/settings/payments",
  reminders: "scheduler/settings/reminders",
  records: "scheduler/settings/records",
  emails: "scheduler/settings/emails",
  integrations: "scheduler/settings/integrations",
  notifications: "scheduler/settings/notifications",
  clients: "scheduler/settings/clients",
  surveys: "scheduler/settings/surveys",
  authorizations: "scheduler/settings/authorizations",
};

function getRequiredScreen(
  pathname: string,
  section: string | null,
): SchedulerScreenKey | null {
  if (pathname === "/clientes") {
    return schedulerScreenKeyById.clients;
  }
  if (pathname.startsWith("/clientes/")) {
    return schedulerScreenKeyById["reports.summary"];
  }
  if (pathname.startsWith("/administracion")) {
    return schedulerScreenKeyById[
      administrationSections[section ?? "locals"] ?? "administration.locals"
    ];
  }
  if (pathname.startsWith("/configuraciones")) {
    if (section === "authorizations") return null;
    return (
      settingsSections[section ?? "company"] ?? "scheduler/settings/company"
    );
  }
  if (pathname.startsWith("/reportes/ventas")) {
    return schedulerScreenKeyById["reports.sales"];
  }
  if (pathname.startsWith("/reportes/reservas")) {
    return schedulerScreenKeyById["reports.reservations"];
  }
  if (pathname.startsWith("/reportes"))
    return schedulerScreenKeyById["reports.summary"];
  if (pathname === "/") return schedulerScreenKeyById.agenda;
  return null;
}

function firstAccessiblePath(permissions: SchedulerScreenKey[]): string | null {
  const paths: Array<[SchedulerScreenKey, string]> = [
    ["scheduler/agenda", "/"],
    ["scheduler/clients", "/clientes"],
    ["scheduler/reports/summary", "/reportes"],
    ["scheduler/reports/reservations", "/reportes/reservas"],
    ["scheduler/reports/sales", "/reportes/ventas"],
    ["scheduler/administration/locals", "/administracion?section=locals"],
    ["scheduler/settings/company", "/configuraciones?section=company"],
  ];
  return paths.find(([key]) => permissions.includes(key))?.[1] ?? null;
}

export function SchedulerAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bootstrap, status, logout } = useSchedulerSession();
  const requiredScreen = getRequiredScreen(
    pathname,
    searchParams.get("section"),
  );
  const readableScreens =
    bootstrap?.permissions
      .filter((permission) => permission.capabilities.includes("READ"))
      .map((permission) => permission.screenKey) ?? [];
  const allowed =
    requiredScreen === null || readableScreens.includes(requiredScreen);
  const fallback = firstAccessiblePath(readableScreens);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status === "authenticated" && !allowed && fallback)
      router.replace(fallback);
  }, [allowed, fallback, pathname, router, status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-sm text-slate-600">
        Validando sesión…
      </main>
    );
  }
  if (!bootstrap) return null;

  if (!fallback) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center">
        <p className="section-heading">Acceso pendiente</p>
        <p className="max-w-md text-sm text-slate-600">
          Tu puesto todavía no tiene pantallas de Scheduler asignadas.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          Volver al login
        </Button>
      </main>
    );
  }
  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Redirigiendo…
      </main>
    );
  }
  return children;
}
