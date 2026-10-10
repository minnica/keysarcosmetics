"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@cosmetics/ui";
import { LogOut } from "lucide-react";
import {
  SchedulerPrimaryNav,
  type SchedulerNavArea,
  type SchedulerReportPage,
} from "@/components/SchedulerPrimaryNav";
import { useSchedulerSession } from "@/lib/session";
import { schedulerApi } from "@/lib/api";
import { getSchedulerCompanyLogoAsset } from "@/lib/scheduler-settings-presentation";
import { useSchedulerQuery } from "@/components/api/ApiState";

function activeArea(pathname: string): SchedulerNavArea {
  if (pathname.startsWith("/clientes")) return "clients";
  if (pathname.startsWith("/reportes")) return "reports";
  if (pathname.startsWith("/administracion")) return "administration";
  if (pathname.startsWith("/configuraciones")) return "settings";
  if (pathname.startsWith("/movimientos")) return "movements";
  return "agenda";
}

export function SchedulerTopNavigation() {
  const pathname = usePathname();
  const { bootstrap, logout } = useSchedulerSession();
  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "navigation:operational-catalog" },
  );
  const commerceId = catalog.data?.commerces.find((item) => item.active)?.id ?? "";
  const company = useSchedulerQuery(
    () => schedulerApi.resolvedSetting("company", { commerceId }),
    [commerceId],
    {
      enabled: Boolean(commerceId),
      queryKey: "settings:company",
    },
  );
  const logoAsset = getSchedulerCompanyLogoAsset(
    company.data?.document["logoAsset"],
  );
  const companyName = String(
    company.data?.document["companyName"] ?? "Keysar Cosmetics",
  );
  const area = activeArea(pathname);
  const reportPage: SchedulerReportPage = pathname.startsWith("/reportes/seguimiento-citas")
    ? "appointment-journal"
    : pathname.startsWith("/reportes/reservas")
      ? "reservations"
      : "summary";

  return (
    <header className="scheduler-top-navigation sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_14px_34px_rgba(8,14,24,0.2)]">
      <div className="flex h-16 items-center gap-4 px-3 sm:px-5 xl:px-7">
        <Link
          aria-label="Ir a la agenda"
          className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3a583]"
          href="/"
        >
          {logoAsset?.mimeType === "application/pdf" ? (
            <object
              aria-hidden="true"
              className="pointer-events-none h-[34px] w-[34px] overflow-hidden rounded-md bg-white object-contain"
              data={`${logoAsset.dataUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=Fit`}
              tabIndex={-1}
              type="application/pdf"
            >
              <Image alt="" aria-hidden="true" height={34} src="/logo.svg" width={34} />
            </object>
          ) : logoAsset ? (
            <span
              aria-hidden="true"
              className="h-[34px] w-[34px] rounded-md bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${JSON.stringify(logoAsset.dataUrl)})` }}
            />
          ) : (
            <Image alt="" aria-hidden="true" height={34} src="/logo.svg" width={34} />
          )}
          <span className="hidden text-sm font-semibold uppercase tracking-[0.12em] text-white lg:inline">
            {companyName}
          </span>
        </Link>
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SchedulerPrimaryNav
            activeArea={area}
            {...(area === "reports" ? { activeReport: reportPage } : {})}
          />
        </div>
        <div className="hidden min-w-0 items-center gap-3 border-l border-white/10 pl-4 md:flex">
          <div className="min-w-0 text-right">
            <p className="max-w-40 truncate text-xs font-semibold text-white">
              {bootstrap?.user.name ?? "Sesión"}
            </p>
            <p className="max-w-40 truncate text-[0.62rem] uppercase tracking-[0.15em] text-white/45">
              {bootstrap?.user.positionName ?? bootstrap?.user.role}
            </p>
          </div>
          <Button
            aria-label="Cerrar sesión"
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 p-0 text-white hover:bg-white/10"
            onClick={logout}
            variant="ghost"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
