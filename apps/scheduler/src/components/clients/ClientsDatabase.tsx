"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
  type DateRange,
} from "@cosmetics/ui";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellRing,
  BriefcaseBusiness,
  CakeSlice,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileDown,
  Files,
  Gift,
  MapPin,
  Megaphone,
  Merge,
  Plus,
  Search,
  Scissors,
  SlidersHorizontal,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SchedulerClient } from "@/lib/mock-client-data";
import {
  bookingStatusOptions,
  schedulerBranches,
  schedulerDayBookings,
  schedulerProfessionals,
  schedulerServices,
} from "@/lib/mock-scheduler-data";
import { authorizeSchedulerFinancialProfile } from "@/lib/scheduler-access";
import {
  daysSinceClientActivity,
  daysUntilNextBirthday,
  emptyClientFilters,
  filterClientDatabase,
  sortClientDatabase,
  type ClientFilters,
  type ClientSortKey,
} from "@/lib/client-database";

const controlClass =
  "h-11 w-full min-w-0 rounded-2xl border border-[#e7ddd4] bg-white px-3.5 text-sm text-[#526273] shadow-[0_1px_0_rgba(255,255,255,0.8)] outline-none transition hover:border-[#d4c0ae] focus-visible:ring-2 focus-visible:ring-[#c3a583]";
const pendingTitle = "Pendiente de la siguiente etapa de detalle";
const medicalRecordOptions = [
  { value: "clinical", label: "Ficha clínica" },
  { value: "follow-up", label: "Comentarios de seguimiento" },
  {
    value: "facial-consent",
    label: "Consentimiento para tratamientos faciales",
  },
];
const columns: { key: ClientSortKey; label: string }[] = [
  { key: "fullName", label: "Nombre" },
  { key: "lastName", label: "Apellido" },
  { key: "email", label: "Correo" },
  { key: "phone", label: "Teléfono" },
  { key: "officialId", label: "Identificación oficial" },
];

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, rows: Array<Array<string | number>>) {
  const contents = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${contents}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FilterSelect({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon?: LucideIcon;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span className="flex items-center gap-2 text-[#364152]">
        {Icon ? (
          <Icon aria-hidden="true" className="h-4 w-4 text-[#ad8b67]" />
        ) : null}
        {label}
      </span>
      <span className="relative block">
        <select
          className={`${controlClass} appearance-none pr-9 font-normal`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Todos</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400"
        />
      </span>
    </label>
  );
}

function FilterDisclosure({
  label,
  description,
  icon: Icon,
  active,
  children,
  defaultOpen = false,
}: {
  label: string;
  description?: string;
  icon: LucideIcon;
  active?: boolean;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={`group/filter self-start overflow-hidden rounded-[20px] border bg-white transition ${
        active
          ? "border-[#cdb08f] shadow-[0_10px_24px_rgba(195,165,131,0.12)]"
          : "border-[#e7ddd4]"
      }`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        className={`flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 outline-none transition hover:bg-[#fcfaf8] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c3a583] [&::-webkit-details-marker]:hidden ${active ? "bg-[#fbf6f0]" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[#263649] text-white" : "bg-[#f5ede4] text-[#ad8b67]"}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-[#364152]">
              {label}
              {active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[#ad8b67]" />
              ) : null}
            </span>
            {description ? (
              <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-400">
                {description}
              </span>
            ) : null}
          </span>
        </span>
        <Plus
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/filter:rotate-45"
        />
      </summary>
      <div className="space-y-3 border-t border-[#eee6df] bg-[#fffdfb] px-4 py-4">
        {children}
      </div>
    </details>
  );
}

function FilterPills({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : option.value)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3a583] ${
              active
                ? "border-[#263649] bg-[#263649] text-white shadow-[0_8px_18px_rgba(38,54,73,0.16)]"
                : "border-[#e7ddd4] bg-white text-[#667385] hover:border-[#c3a583] hover:bg-[#fbf6f0]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function AvatarStack({ clients }: { clients: SchedulerClient[] }) {
  return (
    <span className="flex -space-x-2" aria-hidden="true">
      {clients.slice(0, 3).map((client, index) => (
        <span
          key={client.id}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold ${
            index % 2
              ? "bg-[#e8eff2] text-[#526273]"
              : "bg-[#f1dfd7] text-[#946f59]"
          }`}
        >
          {clientInitials(client.fullName)}
        </span>
      ))}
    </span>
  );
}

export function ClientsDatabase({
  clients,
  onView,
}: {
  clients: SchedulerClient[];
  onView: (client: SchedulerClient) => void;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(emptyClientFilters);
  const [sort, setSort] = useState<{
    key: ClientSortKey;
    direction: "asc" | "desc";
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [audienceName, setAudienceName] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [authorizationError, setAuthorizationError] = useState("");
  const [recordsReportOpen, setRecordsReportOpen] = useState(false);
  const [recordType, setRecordType] = useState("");
  const [recordDateRange, setRecordDateRange] = useState<DateRange>({
    from: "",
    to: "",
  });
  const referenceDate = useMemo(() => new Date(), []);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filteredClients = useMemo(
    () =>
      sortClientDatabase(
        filterClientDatabase(
          clients,
          query,
          filters,
          schedulerDayBookings,
          referenceDate,
        ),
        sort,
      ),
    [clients, query, filters, sort, referenceDate],
  );
  const upcomingBirthdayClients = useMemo(
    () =>
      filterClientDatabase(
        clients,
        "",
        { ...emptyClientFilters, upcomingBirthdayDays: "30" },
        schedulerDayBookings,
        referenceDate,
      ),
    [clients, referenceDate],
  );
  const recoveryClients = useMemo(
    () =>
      filterClientDatabase(
        clients,
        "",
        { ...emptyClientFilters, inactiveDays: "60" },
        schedulerDayBookings,
        referenceDate,
      ),
    [clients, referenceDate],
  );
  const activeClientCount = clients.filter((client) => {
    const inactiveDays = daysSinceClientActivity(client, referenceDate);
    return inactiveDays !== null && inactiveDays < 60;
  }).length;
  const activeClientPercentage = clients.length
    ? Math.round((activeClientCount / clients.length) * 100)
    : 0;
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const visibleClients = filteredClients.slice(offset, offset + pageSize);
  const allFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((client) => selectedClientIds.has(client.id));

  function toggleClientSelection(clientId: string) {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function toggleAllFilteredClients() {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredClients.forEach((client) => next.delete(client.id));
      } else {
        filteredClients.forEach((client) => next.add(client.id));
      }
      return next;
    });
  }

  function stopSelectionMode() {
    setSelectionMode(false);
    setSelectedClientIds(new Set());
  }

  function createAudience() {
    const name = audienceName.trim();
    if (!name) {
      toast.error("Escribe un nombre para la audiencia.");
      return;
    }
    setAudienceOpen(false);
    setAudienceName("");
    toast.success("Audiencia creada", {
      description: `${name} incluye ${filteredClients.length} ${filteredClients.length === 1 ? "cliente" : "clientes"}.`,
    });
  }

  function exportClientList() {
    const authorization = authorizeSchedulerFinancialProfile(
      authorizationCode,
      undefined,
    );
    if (!authorization.profile) {
      setAuthorizationError(
        authorization.error ?? "El código de autorización no es válido.",
      );
      return;
    }
    if (
      authorization.profile.role !== "master" &&
      authorization.profile.role !== "admin"
    ) {
      setAuthorizationError(
        "Este código no tiene permisos para descargar listados.",
      );
      return;
    }
    downloadCsv(`clientes-${new Date().toLocaleDateString("en-CA")}.csv`, [
      [
        "Nombre",
        "Apellido",
        "Correo",
        "Teléfono",
        "Identificación oficial",
        "Número de cliente",
      ],
      ...filteredClients.map((client) => [
        client.fullName,
        client.lastName ?? "",
        client.email,
        client.phone,
        client.officialId ?? "",
        client.clientNumber ?? "",
      ]),
    ]);
    setDownloadOpen(false);
    setAuthorizationCode("");
    setAuthorizationError("");
    toast.success("Listado descargado", {
      description: `Se exportaron ${filteredClients.length} clientes en formato CSV.`,
    });
  }

  function exportRecordsReport() {
    const selectedRecord = medicalRecordOptions.find(
      (option) => option.value === recordType,
    );
    if (!selectedRecord || !recordDateRange.from || !recordDateRange.to) {
      toast.error("Selecciona el tipo de ficha y el rango de fechas.");
      return;
    }
    downloadCsv(`reporte-fichas-${recordDateRange.from}.csv`, [
      ["Tipo de ficha", "Desde", "Hasta", "Cliente", "Correo", "Teléfono"],
      ...filteredClients.map((client) => [
        selectedRecord.label,
        recordDateRange.from,
        recordDateRange.to,
        client.fullName,
        client.email,
        client.phone,
      ]),
    ]);
    setRecordsReportOpen(false);
    setRecordType("");
    setRecordDateRange({ from: "", to: "" });
    toast.success("Reporte de fichas generado", {
      description: `${selectedRecord.label} · ${filteredClients.length} clientes.`,
    });
  }

  function updateFilter(key: keyof ClientFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function updateSmartFilter(
    key: "upcomingBirthdayDays" | "inactiveDays",
    value: string,
  ) {
    setFilters((current) => ({
      ...current,
      [key]: current[key] === value ? "" : value,
      ...(key === "upcomingBirthdayDays"
        ? { birthdayFrom: "", birthdayTo: "" }
        : {}),
    }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ ...emptyClientFilters });
    setQuery("");
    setPage(1);
  }

  function dateRangeFields(prefix: "birthday" | "created") {
    return (
      <>
        {(["From", "To"] as const).map((boundary) => {
          const key = `${prefix}${boundary}` as keyof ClientFilters;
          return (
            <label key={key} className="block space-y-1 text-xs text-slate-500">
              <span>{boundary === "From" ? "Desde" : "Hasta"}</span>
              <input
                aria-label={`${prefix === "birthday" ? "Cumpleaños" : "Cliente creado"}: ${boundary === "From" ? "desde" : "hasta"}`}
                type="date"
                className={controlClass}
                value={filters[key]}
                onChange={(event) => {
                  if (prefix === "birthday") {
                    setFilters((current) => ({
                      ...current,
                      [key]: event.target.value,
                      upcomingBirthdayDays: "",
                    }));
                    setPage(1);
                    return;
                  }
                  updateFilter(key, event.target.value);
                }}
              />
            </label>
          );
        })}
        <p className="text-xs leading-5 text-slate-400">
          Solo se incluyen clientes con esta fecha registrada.
        </p>
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <button
        type="button"
        className="order-2 flex items-center justify-between rounded-2xl border border-[#e7ddd4] bg-white px-5 py-4 text-sm font-semibold shadow-[0_10px_28px_rgba(38,54,73,0.05)] lg:hidden"
        aria-expanded={showFilters}
        aria-controls="client-advanced-filters"
        onClick={() => setShowFilters(!showFilters)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros avanzados{activeFilters ? ` (${activeFilters})` : ""}
        </span>
        <ChevronDown className={`h-4 w-4 ${showFilters ? "rotate-180" : ""}`} />
      </button>
      <section
        id="client-advanced-filters"
        aria-label="Filtros avanzados de clientes"
        className={`${showFilters ? "block" : "hidden"} order-2 overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_14px_38px_rgba(38,54,73,0.06)] lg:block`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee6df] bg-[linear-gradient(180deg,#fff_0%,#fdfaf7_100%)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#263649] text-white shadow-[0_8px_18px_rgba(38,54,73,0.16)]">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#263649]">
                Filtros avanzados
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Abre sólo el grupo que necesites para afinar los resultados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeFilters ? (
              <span className="rounded-full bg-[#f5ede4] px-3 py-1.5 text-xs font-semibold text-[#8e6c4b]">
                {activeFilters} {activeFilters === 1 ? "activo" : "activos"}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Sin filtros activos
              </span>
            )}
            {activeFilters || query ? (
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-[#e7ddd4] bg-white px-3 py-2 text-xs font-semibold text-[#8e6c4b] transition hover:border-[#c3a583] hover:bg-[#fbf6f0]"
                onClick={clearFilters}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid items-start gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          <FilterDisclosure
            label="Visita y servicio"
            description="Sede, especialista y tratamiento"
            icon={MapPin}
            active={Boolean(
              filters.branch || filters.professional || filters.service,
            )}
          >
            <FilterSelect
              label="Local / sede"
              icon={MapPin}
              value={filters.branch}
              onChange={(value) => updateFilter("branch", value)}
              options={schedulerBranches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
            />
            <FilterSelect
              label="Especialista"
              icon={BriefcaseBusiness}
              value={filters.professional}
              onChange={(value) => updateFilter("professional", value)}
              options={schedulerProfessionals.map((professional) => ({
                value: professional.id,
                label: professional.name,
              }))}
            />
            <FilterSelect
              label="Servicio"
              icon={Scissors}
              value={filters.service}
              onChange={(value) => updateFilter("service", value)}
              options={schedulerServices.map((service) => ({
                value: service.name,
                label: service.name,
              }))}
            />
          </FilterDisclosure>
          <FilterDisclosure
            label="Estado de la reserva"
            description="Confirmada, pendiente o cancelada"
            icon={UserRoundCheck}
            active={Boolean(filters.status)}
          >
            <FilterPills
              value={filters.status}
              onChange={(value) => updateFilter("status", value)}
              options={bookingStatusOptions}
            />
          </FilterDisclosure>
          <FilterDisclosure
            label="Datos del cliente"
            description="Perfil y fecha de alta"
            icon={UsersRound}
            active={Boolean(
              filters.gender || filters.createdFrom || filters.createdTo,
            )}
          >
            <p className="text-xs font-semibold text-[#526273]">Género</p>
            <FilterPills
              value={filters.gender}
              onChange={(value) => updateFilter("gender", value)}
              options={[
                { value: "female", label: "Femenino" },
                { value: "male", label: "Masculino" },
                { value: "other", label: "Otro" },
                { value: "unspecified", label: "Prefiere no decirlo" },
              ]}
            />
            <div className="my-4 h-px bg-[#eee6df]" />
            <p className="text-xs font-semibold text-[#526273]">
              Fecha de alta
            </p>
            {dateRangeFields("created")}
          </FilterDisclosure>
          <FilterDisclosure
            label="Cumpleaños"
            description="Anticípate con un detalle"
            icon={CakeSlice}
            active={Boolean(
              filters.upcomingBirthdayDays ||
              filters.birthdayFrom ||
              filters.birthdayTo,
            )}
          >
            <p className="text-xs font-semibold text-[#526273]">
              Cumplen años dentro de
            </p>
            <FilterPills
              value={filters.upcomingBirthdayDays}
              onChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  upcomingBirthdayDays: value,
                  birthdayFrom: "",
                  birthdayTo: "",
                }));
                setPage(1);
              }}
              options={[
                { value: "7", label: "7 días" },
                { value: "30", label: "30 días" },
                { value: "90", label: "3 meses" },
              ]}
            />
            <details className="group/manual rounded-2xl border border-dashed border-[#ded3ca] bg-[#fcfaf8]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-semibold text-[#667385] [&::-webkit-details-marker]:hidden">
                Elegir fechas manualmente
                <CalendarDays className="h-4 w-4 text-[#ad8b67] transition-transform group-open/manual:rotate-12" />
              </summary>
              <div className="space-y-3 border-t border-[#eee6df] p-3">
                {dateRangeFields("birthday")}
              </div>
            </details>
          </FilterDisclosure>
          <FilterDisclosure
            label="Actividad y reservas"
            description="Detecta clientes por recuperar"
            icon={Clock3}
            active={Boolean(filters.inactiveDays || filters.hasBooked)}
          >
            <p className="text-xs font-semibold text-[#526273]">
              Sin actividad desde hace
            </p>
            <FilterPills
              value={filters.inactiveDays}
              onChange={(value) => updateFilter("inactiveDays", value)}
              options={[
                { value: "30", label: "+30 días" },
                { value: "60", label: "+60 días" },
                { value: "90", label: "+90 días" },
              ]}
            />
            <div className="my-4 h-px bg-[#eee6df]" />
            <p className="text-xs font-semibold text-[#526273]">
              Historial de reservas
            </p>
            <FilterPills
              value={filters.hasBooked}
              onChange={(value) => updateFilter("hasBooked", value)}
              options={[
                { value: "yes", label: "Con reservas" },
                { value: "no", label: "Nunca reservó" },
              ]}
            />
          </FilterDisclosure>
          <FilterDisclosure
            label="Personalizados"
            description="Segmentos guardados por tu equipo"
            icon={Gift}
          >
            <p className="text-xs leading-5 text-slate-500">
              Aún no hay filtros personalizados configurados.
            </p>
          </FilterDisclosure>
        </div>
      </section>

      <section
        aria-label="Oportunidades de clientes"
        className="order-1 min-w-0 overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_18px_50px_rgba(38,54,73,0.06)]"
      >
        <div className="bg-[linear-gradient(180deg,#fff_0%,#fdfaf7_100%)] p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ad8b67]">
                Pulso de clientes
              </p>
              <h2 className="mt-1 text-base font-semibold text-[#263649]">
                Oportunidades para hoy
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Selecciona una tarjeta para filtrar el listado
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              aria-pressed={filters.upcomingBirthdayDays === "30"}
              onClick={() => updateSmartFilter("upcomingBirthdayDays", "30")}
              className={`group rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 ${
                filters.upcomingBirthdayDays === "30"
                  ? "border-[#d8ad78] bg-[#fff7ec] shadow-[0_12px_26px_rgba(184,121,56,0.12)]"
                  : "border-[#eadfd5] bg-white hover:border-[#d8ad78] hover:shadow-[0_12px_26px_rgba(38,54,73,0.06)]"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0dc] text-[#b87938]">
                  <CakeSlice className="h-5 w-5" />
                </span>
                <AvatarStack clients={upcomingBirthdayClients} />
              </span>
              <span className="mt-4 flex items-end justify-between gap-3">
                <span>
                  <strong className="block text-2xl leading-none text-[#263649]">
                    {upcomingBirthdayClients.length}
                  </strong>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Próximos cumpleaños
                  </span>
                </span>
                <span className="rounded-full bg-[#fff0dc] px-2 py-1 text-[10px] font-bold text-[#a66d35]">
                  30 días
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-pressed={filters.inactiveDays === "60"}
              onClick={() => updateSmartFilter("inactiveDays", "60")}
              className={`group rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 ${
                filters.inactiveDays === "60"
                  ? "border-[#9fb9be] bg-[#f1f7f7] shadow-[0_12px_26px_rgba(87,119,126,0.12)]"
                  : "border-[#eadfd5] bg-white hover:border-[#9fb9be] hover:shadow-[0_12px_26px_rgba(38,54,73,0.06)]"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf2f2] text-[#57777e]">
                  <BellRing className="h-5 w-5" />
                </span>
                <AvatarStack clients={recoveryClients} />
              </span>
              <span className="mt-4 flex items-end justify-between gap-3">
                <span>
                  <strong className="block text-2xl leading-none text-[#263649]">
                    {recoveryClients.length}
                  </strong>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Para volver a contactar
                  </span>
                </span>
                <span className="rounded-full bg-[#eaf2f2] px-2 py-1 text-[10px] font-bold text-[#57777e]">
                  +60 días
                </span>
              </span>
            </button>
            <div className="rounded-[20px] border border-[#eadfd5] bg-[#263649] p-4 text-white shadow-[0_12px_26px_rgba(38,54,73,0.13)]">
              <span className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[#ead8c6]">
                  <UserRoundCheck className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-white/60">
                  {activeClientPercentage}% al día
                </span>
              </span>
              <span className="mt-4 block">
                <strong className="block text-2xl leading-none">
                  {activeClientCount}
                </strong>
                <span className="mt-1.5 block text-xs text-white/65">
                  Clientes activos
                </span>
              </span>
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-[#d9b58d]"
                  style={{ width: `${activeClientPercentage}%` }}
                />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Base de clientes"
        className="order-3 min-w-0 overflow-hidden rounded-[26px] border border-[#e7ddd4] bg-white shadow-[0_18px_50px_rgba(38,54,73,0.06)]"
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eee6df] p-5 xl:flex-nowrap">
          <label className="relative block min-w-0 flex-[1_1_320px]">
            <span className="sr-only">Buscar clientes</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400"
            />
            <Input
              className="h-11 rounded-xl border-[#e7ddd4] bg-[#faf8f5] pl-10 pr-9 text-sm placeholder:text-slate-400 focus-visible:ring-[#c3a583]"
              placeholder="Nombre, apellido, identificación oficial, email y teléfono"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setAudienceOpen(true)}
              className="inline-flex items-center gap-2 text-left text-xs font-semibold text-[#364152] underline decoration-[#c3a583] underline-offset-4 transition hover:text-[#ad8b67]"
            >
              <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0" />
              Crear una audiencia con este listado
            </button>
            <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7ddd4] bg-white px-3 text-sm font-semibold text-[#ad8b67] shadow-sm transition hover:border-[#c3a583] hover:bg-[#fbf6f0]"
                >
                  Acciones
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform ${actionsOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[320px] overflow-hidden rounded-2xl border-[#e7ddd4] bg-white p-1.5 shadow-[0_18px_46px_rgba(38,54,73,0.16)]"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#364152] transition hover:bg-[#f8f3ee]"
                  onClick={() => {
                    setSelectionMode(true);
                    setSelectedClientIds(new Set());
                    setActionsOpen(false);
                  }}
                >
                  <Merge
                    aria-hidden="true"
                    className="h-4 w-4 text-[#ad8b67]"
                  />
                  <span>
                    <strong className="block font-semibold">
                      Combinar clientes
                    </strong>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      Selecciona dos o más registros
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#364152] transition hover:bg-[#f8f3ee]"
                  onClick={() => {
                    setDownloadOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <Download
                    aria-hidden="true"
                    className="h-4 w-4 text-[#ad8b67]"
                  />
                  <span>
                    <strong className="block font-semibold">
                      Descargar este listado de clientes
                    </strong>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      Exporta los resultados filtrados
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#364152] transition hover:bg-[#f8f3ee]"
                  onClick={() => {
                    setRecordsReportOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <FileDown
                    aria-hidden="true"
                    className="h-4 w-4 text-[#ad8b67]"
                  />
                  <span>
                    <strong className="block font-semibold">
                      Reporte de fichas
                    </strong>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      Elige ficha y rango de fechas
                    </span>
                  </span>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {selectionMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ddd4] bg-[#fbf6f0] px-5 py-3">
            <div className="flex items-center gap-3 text-sm text-[#526273]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#263649] text-white">
                <Merge aria-hidden="true" className="h-4 w-4" />
              </span>
              <span>
                <strong className="block text-[#263649]">
                  Combinar clientes
                </strong>
                <span className="text-xs text-slate-500">
                  {selectedClientIds.size
                    ? `${selectedClientIds.size} ${selectedClientIds.size === 1 ? "seleccionado" : "seleccionados"}`
                    : "Selecciona al menos dos clientes"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-[#dfd5cc] bg-white"
                onClick={stopSelectionMode}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={selectedClientIds.size < 2}
                className="h-9 rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
                onClick={() => {
                  toast.success("Clientes seleccionados para combinar", {
                    description: `${selectedClientIds.size} registros están listos para definir el perfil principal.`,
                  });
                  stopSelectionMode();
                }}
              >
                Combinar seleccionados
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-slate-500"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>
            {activeFilters
              ? `${activeFilters} ${activeFilters === 1 ? "filtro activo" : "filtros activos"}`
              : "Todos tus clientes en un solo lugar"}
          </span>
          <span>
            Mostrando {visibleClients.length} de {filteredClients.length}{" "}
            clientes
          </span>
        </div>
        <div
          className="max-h-[640px] overflow-auto px-5 pb-2"
          role="region"
          aria-label="Tabla de clientes, desplazamiento horizontal y vertical"
          tabIndex={0}
        >
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">Clientes y datos de contacto</caption>
            <thead>
              <tr>
                {selectionMode ? (
                  <th
                    scope="col"
                    className="sticky top-0 z-10 w-14 rounded-tl-xl border-y border-[#eee6df] bg-[#faf8f5] px-4 py-4 text-center shadow-[0_1px_0_#eee6df]"
                  >
                    <input
                      aria-label="Seleccionar todos los clientes del listado"
                      checked={allFilteredSelected}
                      className="h-4 w-4 cursor-pointer rounded border-[#cdbfb4] accent-[#263649]"
                      onChange={toggleAllFilteredClients}
                      type="checkbox"
                    />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const active = sort?.key === column.key;
                  const SortIcon = active
                    ? sort.direction === "asc"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        active
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className={`sticky top-0 z-10 border-y border-[#eee6df] bg-[#faf8f5] px-4 py-4 shadow-[0_1px_0_#eee6df] ${!selectionMode && column.key === "fullName" ? "rounded-tl-xl" : ""}`}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-[#526273]"
                        onClick={() => {
                          setSort({
                            key: column.key,
                            direction:
                              active && sort.direction === "asc"
                                ? "desc"
                                : "asc",
                          });
                          setPage(1);
                        }}
                      >
                        {column.label}
                        <SortIcon
                          aria-hidden="true"
                          className={`h-3 w-3 ${active ? "text-[#ad8b67]" : "text-slate-400"}`}
                        />
                      </button>
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="sticky top-0 z-10 rounded-tr-xl border-y border-[#eee6df] bg-[#faf8f5] px-4 py-4 text-center text-xs font-semibold text-[#526273] shadow-[0_1px_0_#eee6df]"
                >
                  Opciones
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((client) => {
                const birthdayDays = daysUntilNextBirthday(
                  client.birthDate,
                  referenceDate,
                );
                return (
                  <tr
                    key={client.id}
                    className={`transition-colors odd:bg-[#fcfaf8] hover:bg-[#f5ede4]/60 ${selectedClientIds.has(client.id) ? "bg-[#f8f0e8] odd:bg-[#f8f0e8]" : ""}`}
                  >
                    {selectionMode ? (
                      <td className="border-b border-[#f2ece6] px-4 py-3 text-center">
                        <input
                          aria-label={`Seleccionar a ${client.fullName}`}
                          checked={selectedClientIds.has(client.id)}
                          className="h-4 w-4 cursor-pointer rounded border-[#cdbfb4] accent-[#263649]"
                          onChange={() => toggleClientSelection(client.id)}
                          type="checkbox"
                        />
                      </td>
                    ) : null}
                    <td className="border-b border-[#f2ece6] px-4 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#f4e4db,#e7eef1)] text-xs font-bold text-[#526273] shadow-[inset_0_0_0_1px_rgba(195,165,131,0.18)]">
                          {clientInitials(client.fullName)}
                          {birthdayDays !== null && birthdayDays <= 30 ? (
                            <span
                              title={`Cumpleaños en ${birthdayDays} días`}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#fff0dc] text-[#b87938]"
                            >
                              <CakeSlice className="h-2.5 w-2.5" />
                            </span>
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <button
                            className="block text-left text-[#263649] hover:text-[#ad8b67] hover:underline"
                            type="button"
                            onClick={() => onView(client)}
                          >
                            {client.fullName}
                          </button>
                          {birthdayDays !== null && birthdayDays <= 30 ? (
                            <span className="mt-0.5 block text-[10px] font-semibold text-[#b87938]">
                              Cumple en{" "}
                              {birthdayDays === 0
                                ? "hoy"
                                : `${birthdayDays} días`}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-[#f2ece6] px-4 py-4 text-slate-500">
                      {client.lastName || (
                        <span aria-label="Sin apellido registrado">—</span>
                      )}
                    </td>
                    <td className="border-b border-[#f2ece6] px-4 py-4 text-slate-500">
                      {client.email || "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-[#f2ece6] px-4 py-4 text-slate-500">
                      {client.phone || "—"}
                    </td>
                    <td className="border-b border-[#f2ece6] px-4 py-4 text-slate-500">
                      {client.officialId || (
                        <span aria-label="Sin identificación registrada">
                          —
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[#f2ece6] px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          aria-label={`Ver ficha de ${client.fullName}`}
                          title="Ver ficha"
                          type="button"
                          onClick={() => onView(client)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7ddd4] bg-white text-[#ad8b67] shadow-sm hover:border-[#c3a583] hover:bg-[#f5ede4]"
                        >
                          <Eye aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`Eliminar a ${client.fullName} (pendiente)`}
                          title={pendingTitle}
                          disabled
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#eee6df] bg-white text-rose-300 shadow-sm disabled:cursor-not-allowed"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!visibleClients.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
              <UsersRound aria-hidden="true" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-semibold">No encontramos clientes</h3>
            <p className="mt-2 text-sm text-slate-500">
              Prueba otra búsqueda o ajusta los filtros.
            </p>
            <button
              className="mt-5 text-sm font-semibold text-[#ad8b67] underline underline-offset-4"
              onClick={clearFilters}
              type="button"
            >
              Limpiar búsqueda y filtros
            </button>
          </div>
        ) : null}
        <footer className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs text-slate-500">
          <label className="flex items-center gap-2">
            Mostrar
            <select
              aria-label="Clientes por página"
              className="rounded-lg border border-[#e7ddd4] bg-white px-2 py-2"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            por página
          </label>
          <div className="flex items-center gap-3">
            <span>
              {filteredClients.length ? offset + 1 : 0}–
              {Math.min(offset + pageSize, filteredClients.length)} de{" "}
              {filteredClients.length}
            </span>
            <button
              aria-label="Página anterior"
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-[#e7ddd4] p-2 hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="rounded-lg bg-[#f5ede4] px-3 py-2 font-semibold text-[#ad8b67]">
              {currentPage}
            </span>
            <button
              aria-label="Página siguiente"
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-[#e7ddd4] p-2 hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>

      <Dialog
        open={audienceOpen}
        onOpenChange={(open) => {
          setAudienceOpen(open);
          if (!open) setAudienceName("");
        }}
      >
        <DialogContent className="max-w-[540px] gap-0 overflow-hidden rounded-[26px] border-[#e7ddd4] bg-white p-0 shadow-[0_24px_70px_rgba(38,54,73,0.2)]">
          <DialogHeader className="border-b border-[#eee6df] px-6 py-5 text-left">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
              <Megaphone aria-hidden="true" className="h-5 w-5" />
            </span>
            <DialogTitle className="page-title text-3xl text-[#263649]">
              Crear audiencia
            </DialogTitle>
            <DialogDescription className="mt-1 leading-6 text-slate-500">
              Crea y segmenta grupos de clientes para enviar campañas de email
              marketing personalizadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 bg-[#faf8f6] px-6 py-5">
            <div className="space-y-2">
              <Label
                htmlFor="audience-name"
                className="font-semibold text-[#364152]"
              >
                Nombre de la audiencia
              </Label>
              <Input
                autoFocus
                id="audience-name"
                className="client-modal-control"
                placeholder="Ej. Clientes frecuentes de agosto"
                value={audienceName}
                onChange={(event) => setAudienceName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") createAudience();
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[#e7ddd4] bg-white px-4 py-4">
              <span>
                <strong className="block text-sm text-[#263649]">
                  Clientes incluidos
                </strong>
                <span className="mt-1 block text-xs text-slate-500">
                  Se respetan la búsqueda y los filtros actuales.
                </span>
              </span>
              <span className="rounded-full bg-[#f5ede4] px-3 py-1.5 text-sm font-bold text-[#8e6c4b]">
                {filteredClients.length}
              </span>
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-[#eee6df] px-6 py-4 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#dfd5cc]"
              onClick={() => setAudienceOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
              onClick={createAudience}
            >
              Crear audiencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={downloadOpen}
        onOpenChange={(open) => {
          setDownloadOpen(open);
          if (!open) {
            setAuthorizationCode("");
            setAuthorizationError("");
          }
        }}
      >
        <DialogContent className="max-w-[520px] gap-0 overflow-hidden rounded-[26px] border-[#e7ddd4] bg-white p-0 shadow-[0_24px_70px_rgba(38,54,73,0.2)]">
          <DialogHeader className="border-b border-[#eee6df] px-6 py-5 text-left">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
              <Download aria-hidden="true" className="h-5 w-5" />
            </span>
            <DialogTitle className="page-title text-3xl text-[#263649]">
              Descargar listado
            </DialogTitle>
            <DialogDescription className="mt-2 leading-6 text-slate-500">
              ¿Estás seguro de que quieres descargar este archivo? Para realizar
              esta operación debes ingresar un código de autorización válido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 bg-[#faf8f6] px-6 py-5">
            <div className="space-y-2">
              <Label
                htmlFor="download-authorization-code"
                className="font-semibold text-[#364152]"
              >
                Código de autorización
              </Label>
              <Input
                autoComplete="one-time-code"
                autoFocus
                className="client-modal-control tracking-[0.22em]"
                id="download-authorization-code"
                inputMode="numeric"
                maxLength={8}
                onChange={(event) => {
                  setAuthorizationCode(event.target.value.replace(/\D/g, ""));
                  setAuthorizationError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") exportClientList();
                }}
                placeholder="••••"
                type="password"
                value={authorizationCode}
              />
              {authorizationError ? (
                <p className="text-sm font-medium text-rose-600" role="alert">
                  {authorizationError}
                </p>
              ) : null}
              <p className="text-xs leading-5 text-slate-400">
                Ingresa un código con permiso de administrador o master.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e7ddd4] bg-white px-4 py-3 text-sm text-slate-500">
              El archivo incluirá {filteredClients.length}{" "}
              {filteredClients.length === 1 ? "cliente" : "clientes"} en formato
              CSV.
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-[#eee6df] px-6 py-4 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#dfd5cc]"
              onClick={() => setDownloadOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!authorizationCode}
              className="rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
              onClick={exportClientList}
            >
              <Download aria-hidden="true" className="mr-2 h-4 w-4" />
              Descargar archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recordsReportOpen}
        onOpenChange={(open) => {
          setRecordsReportOpen(open);
          if (!open) {
            setRecordType("");
            setRecordDateRange({ from: "", to: "" });
          }
        }}
      >
        <DialogContent className="max-w-[620px] gap-0 overflow-hidden rounded-[26px] border-[#e7ddd4] bg-white p-0 shadow-[0_24px_70px_rgba(38,54,73,0.2)]">
          <DialogHeader className="border-b border-[#eee6df] px-6 py-5 text-left">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
              <Files aria-hidden="true" className="h-5 w-5" />
            </span>
            <DialogTitle className="page-title text-3xl text-[#263649]">
              Reporte de fichas
            </DialogTitle>
            <DialogDescription className="mt-1 leading-6 text-slate-500">
              Selecciona la ficha y el periodo que quieres incluir en el
              reporte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 bg-[#faf8f6] px-6 py-5">
            <div className="space-y-2">
              <Label
                htmlFor="record-report-type"
                className="font-semibold text-[#364152]"
              >
                Tipo de ficha
              </Label>
              <span className="relative block">
                <select
                  className="client-modal-control appearance-none pr-10"
                  id="record-report-type"
                  onChange={(event) => setRecordType(event.target.value)}
                  value={recordType}
                >
                  <option value="">Selecciona una ficha</option>
                  {medicalRecordOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
              </span>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-[#364152]">
                Seleccionar fechas
              </Label>
              <div className="rounded-2xl border border-[#e7ddd4] bg-white p-4">
                <DateRangePicker
                  className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:border-[#dfd5cc] sm:[&_button]:w-[220px]"
                  fromLabel="Desde"
                  onChange={setRecordDateRange}
                  toLabel="Hasta"
                  value={recordDateRange}
                />
              </div>
            </div>
            <p className="rounded-2xl border border-[#e7ddd4] bg-white px-4 py-3 text-xs leading-5 text-slate-500">
              El reporte utilizará los {filteredClients.length} clientes del
              listado filtrado actual.
            </p>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-[#eee6df] px-6 py-4 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#dfd5cc]"
              onClick={() => setRecordsReportOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                !recordType || !recordDateRange.from || !recordDateRange.to
              }
              className="rounded-xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
              onClick={exportRecordsReport}
            >
              <FileDown aria-hidden="true" className="mr-2 h-4 w-4" />
              Generar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
