"use client";

import type { ReactNode } from "react";
import { AlertCircle, LockKeyhole, Search } from "lucide-react";
import { Badge, Button } from "@cosmetics/ui";

export const restoredAdministrationCopy = {
  locals: {
    title: "Comercios",
    description:
      "Configura cada comercio, su horario operativo y las sucursales asociadas.",
  },
  professionals: {
    title: "Especialistas",
    description:
      "Organiza tu equipo, sus servicios, grupos, horarios y disponibilidad por local.",
  },
  services: {
    title: "Servicios",
    description:
      "Administra servicios, clases, paquetes y complementos sobre el catálogo comercial.",
  },
  commissions: {
    title: "Comisiones",
    description:
      "Define reglas versionadas sin sustituir la liquidación final de Nómina.",
  },
  resources: {
    title: "Recursos",
    description:
      "Controla cabinas, equipos y estaciones necesarios para operar la agenda.",
  },
  surveys: {
    title: "Encuestas",
    description:
      "Diseña cuestionarios versionados y asócialos a servicios sin exponer tokens ni respuestas individuales.",
  },
  consents: {
    title: "Consentimientos",
    description:
      "Administra versiones de documentos privados y su trazabilidad por cliente.",
  },
  whatsapp: {
    title: "Comunicaciones",
    description:
      "Prepara plantillas multicanal y supervisa el outbox sin confundir encolado con entrega.",
  },
  "gift-cards": {
    title: "Gift cards",
    description:
      "Configura plantillas de regalo; emisión, saldo y redención permanecen en POS.",
  },
  "status-colors": {
    title: "Colores de status",
    description:
      "Personaliza la paleta de reservas por negocio con autorización reforzada.",
  },
} as const;

export type RestoredAdministrationSection =
  keyof typeof restoredAdministrationCopy;

export function RestoredAdministrationFrame({
  section,
  readOnly,
  actions,
  children,
}: {
  section: RestoredAdministrationSection;
  readOnly: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const copy = restoredAdministrationCopy[section];
  return (
    <div className="admin-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
        <div className="flex min-h-[78px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <div>
            <p className="page-title text-[1.55rem] text-white">
              Administración
            </p>
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/45">
              {copy.title}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="scheduler-header-button hidden xl:flex"
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 xl:block">
              Catálogo conectado
            </div>
          </div>
        </div>
      </header>
      <main className="min-w-0">
        <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="admin-eyebrow">Administración</p>
              <h1 className="admin-page-title text-wrap-balance">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {copy.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {readOnly ? (
                <Badge variant="outline" className="bg-white">
                  <LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura
                </Badge>
              ) : null}
              {actions}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdministrationCoverageNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-sm leading-6 text-amber-900/80">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdministrationRefreshButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Button
      variant="outline"
      className="bg-white"
      onClick={onClick}
      disabled={loading}
    >
      Actualizar
    </Button>
  );
}
