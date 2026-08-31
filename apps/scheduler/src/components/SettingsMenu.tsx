"use client";

import Link from "next/link";
import { CreditCard, Settings, UsersRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@cosmetics/ui";

export function SettingsMenu({ active = false }: { active?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Abrir menú de configuración"
          className={active ? "scheduler-header-button bg-white/10 text-white" : "scheduler-header-button"}
          type="button"
        >
          <Settings className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[18rem] overflow-hidden rounded-[22px] border-white/10 bg-[#1c2835] p-2 text-white shadow-[0_24px_70px_rgba(7,12,20,0.36)]"
      >
        <Link className={active ? "scheduler-nav-menu-item-active" : "scheduler-nav-menu-item"} href="/configuraciones">
          <span className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-[#c3a583]" />
            Configuraciones
          </span>
          {active ? <span className="h-2 w-2 rounded-full bg-[#c3a583]" /> : null}
        </Link>
        <button className="scheduler-nav-menu-item-disabled" disabled type="button">
          <span className="flex items-center gap-3">
            <UsersRound className="h-4 w-4 text-white/30" />
            Usuarios
          </span>
          <span className="text-[0.56rem] uppercase tracking-[0.14em] text-white/25">Próximo</span>
        </button>
        <button className="scheduler-nav-menu-item-disabled" disabled type="button">
          <span className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-white/30" />
            Cuenta y facturación
          </span>
          <span className="text-[0.56rem] uppercase tracking-[0.14em] text-white/25">Próximo</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
