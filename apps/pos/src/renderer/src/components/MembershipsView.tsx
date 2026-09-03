import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Check,
  CreditCard,
  Crown,
  FileDown,
  FileSpreadsheet,
  History,
  KeyRound,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TicketCheck,
  Trophy,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import {
  availableAgendaSeats,
  isSellerSelectableAgendaSlot,
} from "../agenda-gateway";
import type {
  AgendaSlot,
  Appointment,
  ClientMembership,
  MembershipClientProfile,
  PosSessionUser,
  Seller,
} from "../types";

interface MembershipsViewProps {
  memberships: ClientMembership[];
  appointments: Appointment[];
  agendaSlots: AgendaSlot[];
  branches: string[];
  viewer: PosSessionUser;
  sellers: Seller[];
  canEdit: boolean;
  onUpdateProfile: (
    membershipId: string,
    profile: MembershipClientProfile,
  ) => void;
  onConsumeSession: (
    membershipId: string,
    appointmentId: string,
  ) => Promise<boolean>;
  onScheduleNextAppointment: (
    membershipId: string,
    agendaSlotId: string,
  ) => Promise<boolean>;
  onOpenTicket: (ticketId: string) => void;
}

const profileLabels: Record<MembershipClientProfile, string> = {
  POTENTIAL: "Potencial",
  LOYAL: "Leal",
  VIP: "VIP",
  RECOVERY: "Recuperación",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const remainingSessions = (membership: ClientMembership) =>
  Math.max(0, membership.totalSessions - membership.usedSessions);

const membershipBusinessDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
};

type MembershipAnalysisMode = "MONTHLY" | "ANNUAL";

interface MembershipSalesSummary {
  name: string;
  sales: number;
  revenue: number;
}

const monthKeyFromDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const lastClosedMonth = (() => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 1, 1);
})();

const lastClosedMonthKey = monthKeyFromDate(lastClosedMonth);

const formatMonthKey = (monthKey: string) => {
  const [year = "", month = "01"] = monthKey.split("-");
  const value = new Date(Number(year), Number(month) - 1, 1);
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const rankMembershipSales = (
  source: ClientMembership[],
  getName: (membership: ClientMembership) => string,
) =>
  Array.from(
    source.reduce<Map<string, MembershipSalesSummary>>((summary, membership) => {
      const name = getName(membership);
      const current = summary.get(name) ?? { name, sales: 0, revenue: 0 };
      current.sales += 1;
      current.revenue += membership.purchaseAmount;
      summary.set(name, current);
      return summary;
    }, new Map()),
  )
    .map(([, value]) => value)
    .sort(
      (left, right) =>
        right.sales - left.sales || right.revenue - left.revenue,
    );

export function MembershipsView({
  memberships,
  appointments,
  agendaSlots,
  branches,
  viewer,
  sellers,
  canEdit,
  onUpdateProfile,
  onConsumeSession,
  onScheduleNextAppointment,
  onOpenTicket,
}: MembershipsViewProps) {
  const [accessCode, setAccessCode] = useState("");
  const [personalAccessGranted, setPersonalAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [exporting, setExporting] = useState<"EXCEL" | "PDF" | null>(null);
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [scheduleNextOpen, setScheduleNextOpen] = useState(false);
  const [nextAppointmentBranch, setNextAppointmentBranch] = useState("");
  const [nextAppointmentDate, setNextAppointmentDate] = useState("");
  const [nextAgendaSlotId, setNextAgendaSlotId] = useState("");
  const [analysisMode, setAnalysisMode] =
    useState<MembershipAnalysisMode>("MONTHLY");
  const [analysisMonth, setAnalysisMonth] = useState(lastClosedMonthKey);
  const [analysisYear, setAnalysisYear] = useState(
    String(lastClosedMonth.getFullYear()),
  );

  const viewerSeller = sellers.find(
    (seller) => seller.id === viewer.id && seller.active,
  );
  const todayBusinessDate = membershipBusinessDate(new Date().toISOString());
  const hasMembershipAccess = viewer.isMaster || personalAccessGranted;
  const scopedMemberships = useMemo(
    () =>
      hasMembershipAccess
        ? viewer.isMaster
          ? memberships
          : memberships.filter(
              (membership) =>
                membership.sellerId === viewer.id ||
                membership.originalSellerId === viewer.id ||
                (!membership.originalSellerId &&
                  membership.originalSellerName === viewer.name) ||
                membership.sellerChanges.some(
                  (change) =>
                    change.fromSellerId === viewer.id ||
                    change.toSellerId === viewer.id ||
                    (!change.fromSellerId &&
                      change.fromSellerName === viewer.name) ||
                    (!change.toSellerId &&
                      change.toSellerName === viewer.name),
                ),
            )
        : [],
    [hasMembershipAccess, memberships, viewer.id, viewer.isMaster, viewer.name],
  );

  useEffect(() => {
    if (!viewer.isMaster) {
      if (branchFilter !== viewer.branch) setBranchFilter(viewer.branch);
    } else if (branchFilter !== "ALL" && !branches.includes(branchFilter)) {
      setBranchFilter("ALL");
    }
    if (nextAppointmentBranch && !branches.includes(nextAppointmentBranch)) {
      setNextAppointmentBranch(branches[0] ?? "");
      setNextAgendaSlotId("");
    }
  }, [branchFilter, branches, nextAppointmentBranch, viewer.branch, viewer.isMaster]);

  const branchScopedMemberships = useMemo(
    () =>
      scopedMemberships.filter(
        (membership) =>
          branches.includes(membership.branch) &&
          (viewer.isMaster
            ? branchFilter === "ALL" || membership.branch === branchFilter
            : membership.branch === viewer.branch &&
              membershipBusinessDate(membership.purchaseDateIso) ===
                todayBusinessDate),
      ),
    [
      branchFilter,
      branches,
      scopedMemberships,
      todayBusinessDate,
      viewer.branch,
      viewer.isMaster,
    ],
  );
  const sellerHistoryMemberships = useMemo(
    () =>
      viewer.isMaster
        ? branchScopedMemberships
        : scopedMemberships.filter(
            (membership) => membership.branch === viewer.branch,
          ),
    [branchScopedMemberships, scopedMemberships, viewer.branch, viewer.isMaster],
  );
  const historicalClientSearch =
    !viewer.isMaster && search.trim().length >= 2;
  const membershipSearchSource =
    followUpOnly && !viewer.isMaster
      ? sellerHistoryMemberships
      : historicalClientSearch
        ? sellerHistoryMemberships
        : branchScopedMemberships;

  useEffect(() => {
    setPersonalAccessGranted(false);
    setAccessCode("");
    setAccessError("");
    setSelectedId(null);
    setSearch("");
    setMembershipFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setFollowUpOnly(false);
  }, [viewer.id]);

  const authorizePersonalAccess = () => {
    if (!viewerSeller || viewerSeller.accessCode !== accessCode.trim()) {
      setPersonalAccessGranted(false);
      setAccessError("Código personal incorrecto.");
      return;
    }
    setPersonalAccessGranted(true);
    setAccessCode("");
    setAccessError("");
  };

  const closePersonalAccess = () => {
    setPersonalAccessGranted(false);
    setAccessCode("");
    setAccessError("");
    setSelectedId(null);
  };

  const membershipNames = useMemo(
    () =>
      Array.from(
        new Set(
          (viewer.isMaster
            ? branchScopedMemberships
            : sellerHistoryMemberships
          ).map((item) => item.membershipName),
        ),
      ),
    [branchScopedMemberships, sellerHistoryMemberships, viewer.isMaster],
  );

  const filteredMemberships = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return membershipSearchSource.filter((membership) => {
      const purchaseDate = membership.purchaseDateIso.slice(0, 10);
      return (
        (!followUpOnly ||
          (membership.status === "ACTIVE" &&
            remainingSessions(membership) <= 2)) &&
        (!query ||
          [
            membership.clientName,
            membership.clientPhone,
            membership.folio,
            membership.purchaseTicketId,
            membership.membershipName,
            membership.sellerName,
            membership.originalSellerName,
          ].some((value) =>
            value.toLocaleLowerCase("es-MX").includes(query),
          )) &&
        (membershipFilter === "ALL" ||
          membership.membershipName === membershipFilter) &&
        (!dateFrom || purchaseDate >= dateFrom) &&
        (!dateTo || purchaseDate <= dateTo)
      );
    });
  }, [dateFrom, dateTo, followUpOnly, membershipFilter, membershipSearchSource, search]);

  const selectedMembership =
    (viewer.isMaster ? branchScopedMemberships : sellerHistoryMemberships).find(
      (membership) => membership.id === selectedId,
    ) ?? null;
  const agendaIncidentsByMembership = useMemo(
    () =>
      appointments.reduce<Record<string, Appointment[]>>(
        (summary, appointment) => {
          if (
            !appointment.membershipId ||
            (appointment.status !== "CANCELLED" &&
              appointment.status !== "NO_SHOW")
          )
            return summary;
          (summary[appointment.membershipId] ??= []).push(appointment);
          return summary;
        },
        {},
      ),
    [appointments],
  );
  const selectedAgendaIncidents = selectedMembership
    ? (agendaIncidentsByMembership[selectedMembership.id] ?? [])
    : [];
  const selectedCancelledCount = selectedAgendaIncidents.filter(
    (appointment) => appointment.status === "CANCELLED",
  ).length;
  const selectedNoShowCount = selectedAgendaIncidents.filter(
    (appointment) => appointment.status === "NO_SHOW",
  ).length;
  const eligibleAppointments = selectedMembership
    ? appointments.filter(
        (appointment) =>
          appointment.clientId === selectedMembership.clientId &&
          appointment.membershipId === selectedMembership.id &&
          appointment.status === "SCHEDULED" &&
          !appointment.membershipSessionConsumedAtIso,
      )
    : [];
  const nextAgendaSlots = agendaSlots.filter(
    (slot) =>
      isSellerSelectableAgendaSlot(slot) &&
      slot.branch === nextAppointmentBranch &&
      slot.date === nextAppointmentDate,
  );

  const activeMemberships = branchScopedMemberships.filter(
    (membership) => membership.status === "ACTIVE",
  );
  const reportableMemberships = branchScopedMemberships.filter(
    (membership) => membership.status !== "CANCELLED",
  );
  const alertMembershipsSource = viewer.isMaster
    ? branchScopedMemberships
    : sellerHistoryMemberships;
  const lowMemberships = alertMembershipsSource.filter(
    (membership) =>
      membership.status === "ACTIVE" && remainingSessions(membership) <= 2,
  );
  const openLowMembershipFollowUp = () => {
    setSearch("");
    setMembershipFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setFollowUpOnly(true);
    setSelectedId(null);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        document
          .getElementById("membership-follow-up-list")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      ),
    );
  };
  const totalSessions = branchScopedMemberships.reduce(
    (total, membership) => total + membership.totalSessions,
    0,
  );
  const usedSessions = branchScopedMemberships.reduce(
    (total, membership) => total + membership.usedSessions,
    0,
  );
  const totalRevenue = reportableMemberships.reduce(
    (total, membership) => total + membership.purchaseAmount,
    0,
  );

  const clientRanking = Array.from(
    reportableMemberships.reduce<
      Map<string, { name: string; purchases: number; sessions: number; revenue: number }>
    >((summary, membership) => {
      const current = summary.get(membership.clientId) ?? {
        name: membership.clientName,
        purchases: 0,
        sessions: 0,
        revenue: 0,
      };
      current.purchases += 1;
      current.sessions += membership.usedSessions;
      current.revenue += membership.purchaseAmount;
      summary.set(membership.clientId, current);
      return summary;
    }, new Map()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.revenue - left.revenue);

  const membershipSales = Array.from(
    reportableMemberships.reduce<Map<string, number>>((summary, membership) => {
      summary.set(
        membership.membershipName,
        (summary.get(membership.membershipName) ?? 0) + 1,
      );
      return summary;
    }, new Map()),
  ).sort((left, right) => right[1] - left[1]);
  const leastSoldMembership = membershipSales.at(-1);

  const availableMonthKeys = Array.from(
    new Set([
      lastClosedMonthKey,
      ...reportableMemberships.map((membership) =>
        membership.purchaseDateIso.slice(0, 7),
      ),
    ]),
  ).sort((left, right) => right.localeCompare(left));
  const availableYears = Array.from(
    new Set([
      String(lastClosedMonth.getFullYear()),
      ...reportableMemberships.map((membership) =>
        membership.purchaseDateIso.slice(0, 4),
      ),
    ]),
  ).sort((left, right) => Number(right) - Number(left));
  const periodMemberships = reportableMemberships.filter((membership) =>
    analysisMode === "MONTHLY"
      ? membership.purchaseDateIso.startsWith(analysisMonth)
      : membership.purchaseDateIso.startsWith(analysisYear),
  );
  const branchRanking = rankMembershipSales(
    periodMemberships,
    (membership) => membership.branch,
  );
  const sellerRanking = rankMembershipSales(
    periodMemberships,
    (membership) => membership.originalSellerName,
  );
  const leadingBranch = branchRanking[0];
  const leadingSeller = sellerRanking[0];
  const analysisPeriodLabel =
    analysisMode === "MONTHLY" ? formatMonthKey(analysisMonth) : analysisYear;

  const monthlyHistory = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthKey = `${analysisYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const records = reportableMemberships.filter((membership) =>
      membership.purchaseDateIso.startsWith(monthKey),
    );
    const topSeller = rankMembershipSales(
      records,
      (membership) => membership.originalSellerName,
    )[0];
    return {
      key: monthKey,
      label: formatMonthKey(monthKey),
      sales: records.length,
      revenue: records.reduce(
        (total, membership) => total + membership.purchaseAmount,
        0,
      ),
      leader: topSeller?.name ?? "Sin ventas",
    };
  }).filter((row) => row.sales > 0);
  const annualHistory = availableYears.map((year) => {
    const records = reportableMemberships.filter((membership) =>
      membership.purchaseDateIso.startsWith(year),
    );
    const topSeller = rankMembershipSales(
      records,
      (membership) => membership.originalSellerName,
    )[0];
    return {
      key: year,
      label: year,
      sales: records.length,
      revenue: records.reduce(
        (total, membership) => total + membership.purchaseAmount,
        0,
      ),
      leader: topSeller?.name ?? "Sin ventas",
    };
  });
  const historyRows =
    analysisMode === "MONTHLY" ? monthlyHistory : annualHistory;
  const historyMaxRevenue = Math.max(
    1,
    ...historyRows.map((row) => row.revenue),
  );
  const closedMonthMemberships = reportableMemberships.filter((membership) =>
    membership.purchaseDateIso.startsWith(lastClosedMonthKey),
  );
  const closedMonthSellerSales = rankMembershipSales(
    closedMonthMemberships,
    (membership) => membership.originalSellerName,
  );
  const knownSellerNames = Array.from(
    new Set(reportableMemberships.map((membership) => membership.originalSellerName)),
  );
  const closedMonthPodium = knownSellerNames
    .map(
      (name) =>
        closedMonthSellerSales.find((seller) => seller.name === name) ?? {
          name,
          sales: 0,
          revenue: 0,
        },
    )
    .sort(
      (left, right) =>
        right.sales - left.sales || right.revenue - left.revenue,
    )
    .slice(0, 3);

  const openMembership = (membership: ClientMembership) => {
    setSelectedId(membership.id);
    const firstAppointment = appointments.find(
      (appointment) =>
        appointment.clientId === membership.clientId &&
        appointment.status === "SCHEDULED" &&
        !appointment.membershipSessionConsumedAtIso,
    );
    setSelectedAppointmentId(firstAppointment?.id ?? "");
    setScheduleNextOpen(false);
    setNextAppointmentBranch(membership.branch);
    setNextAppointmentDate("");
    setNextAgendaSlotId("");
  };

  const exportScopeLabel = viewer.isMaster
    ? `Membresías · ${branchFilter === "ALL" ? "todas las sucursales" : branchFilter}`
    : `Cartera de ${viewer.name} · ${viewer.branch} · sólo ${todayBusinessDate}`;
  const exportFileScope = viewer.isMaster
    ? branchFilter === "ALL"
      ? "todas-las-sucursales"
      : branchFilter
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .toLocaleLowerCase("es-MX")
    : viewer.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLocaleLowerCase("es-MX");
  const membershipExportRows = filteredMemberships.map((membership) => {
    const incidents = agendaIncidentsByMembership[membership.id] ?? [];
    return {
      Folio: membership.folio,
      Cliente: membership.clientName,
      Teléfono: membership.clientPhone,
      Membresía: membership.membershipName,
      Ticket: membership.purchaseTicketId,
      Compra: membership.purchaseDateIso.slice(0, 10),
      Sucursal: membership.branch,
      Vendedor: membership.sellerName,
      "Vendedor original": membership.originalSellerName,
      "Sesiones totales": membership.totalSessions,
      "Sesiones usadas": membership.usedSessions,
      "Sesiones disponibles": remainingSessions(membership),
      Cancelaciones: incidents.filter((item) => item.status === "CANCELLED").length,
      "No llegó": incidents.filter((item) => item.status === "NO_SHOW").length,
      Perfil: profileLabels[membership.profile],
      Estatus: membership.status,
      "Importe de compra": membership.purchaseAmount,
    };
  });

  const exportMembershipsExcel = async () => {
    if (filteredMemberships.length === 0) return;
    setExporting("EXCEL");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(membershipExportRows),
        "Membresías",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          filteredMemberships.flatMap((membership) =>
            membership.attendance.map((attendance, index) => ({
              "Folio membresía": membership.folio,
              Cliente: membership.clientName,
              Membresía: membership.membershipName,
              Sesión: index + 1,
              Asistencia: attendance.attendedAtIso,
              Sucursal: attendance.branch,
              Vendedor: attendance.sellerName,
              Firma: attendance.signatureStatus === "SIGNED" ? "Firmada" : "Sin firma",
            })),
          ),
        ),
        "Asistencias",
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          filteredMemberships.flatMap((membership) => [
            ...membership.sellerChanges.map((change) => ({
              "Folio membresía": membership.folio,
              Cliente: membership.clientName,
              Tipo: "Cambio de vendedor",
              Fecha: change.changedAtIso,
              Detalle: `${change.fromSellerName} → ${change.toSellerName}`,
              Motivo: change.reason,
            })),
            ...membership.statusChanges.map((change) => ({
              "Folio membresía": membership.folio,
              Cliente: membership.clientName,
              Tipo: "Cambio de estatus",
              Fecha: change.changedAtIso,
              Detalle: `${change.fromStatus} → ${change.toStatus}`,
              Motivo: change.reason,
            })),
          ]),
        ),
        "Trazabilidad",
      );
      XLSX.writeFile(
        workbook,
        `membresias-${exportFileScope}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success("Reporte de membresías descargado en Excel.");
    } catch {
      toast.error("No fue posible generar el reporte de Excel.");
    } finally {
      setExporting(null);
    }
  };

  const exportMembershipsPdf = async () => {
    if (filteredMemberships.length === 0) return;
    setExporting("PDF");
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      doc.setFontSize(17);
      doc.text("KEYSAR · REPORTE DE MEMBRESÍAS", 36, 38);
      doc.setFontSize(9);
      doc.text(
        `${exportScopeLabel} · ${filteredMemberships.length} registro${filteredMemberships.length === 1 ? "" : "s"} · generado por ${viewer.name}`,
        36,
        55,
      );
      autoTable(doc, {
        startY: 70,
        head: [["Folio", "Cliente", "Membresía", "Compra", "Sucursal", "Vendedor", "Saldo", "Incidencias", "Perfil", "Estatus", "Importe"]],
        body: filteredMemberships.map((membership) => {
          const incidents = agendaIncidentsByMembership[membership.id] ?? [];
          return [
            membership.folio,
            membership.clientName,
            membership.membershipName,
            membership.purchaseDateIso.slice(0, 10),
            membership.branch,
            membership.sellerName,
            `${remainingSessions(membership)}/${membership.totalSessions}`,
            incidents.length,
            profileLabels[membership.profile],
            membership.status,
            formatCurrency(membership.purchaseAmount),
          ];
        }),
        styles: { fontSize: 7, cellPadding: 4 },
        headStyles: { fillColor: [109, 74, 50] },
      });
      doc.save(
        `membresias-${exportFileScope}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success("Reporte de membresías descargado en PDF.");
    } catch {
      toast.error("No fue posible generar el reporte PDF.");
    } finally {
      setExporting(null);
    }
  };

  if (!hasMembershipAccess) {
    return (
      <Card className="seller-sales-gate memberships-access-gate">
        <CardContent>
          <div className="seller-sales-gate-icon"><ShieldCheck size={30} /></div>
          <span className="section-kicker">MEMBRESÍAS · ACCESO PERSONAL</span>
          <h2>Consulta tus clientas y tarjetones</h2>
          <p>
            Ingresa tu código personal. Verás la operación de hoy en {viewer.branch}{" "}
            y podrás buscar el historial de clientas cuyas membresías te fueron
            asignadas o en las que participaste como vendedor.
          </p>
          <div className="seller-sales-code-row">
            <div>
              <KeyRound size={17} />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={accessCode}
                onChange={(event) =>
                  setAccessCode(event.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") authorizePersonalAccess();
                }}
                placeholder="Código de 4 dígitos"
                aria-label="Código personal para consultar membresías"
              />
            </div>
            <Button
              type="button"
              onClick={authorizePersonalAccess}
              disabled={accessCode.length !== 4}
            >
              Consultar
            </Button>
          </div>
          {accessError && <span className="seller-sales-error" role="alert">{accessError}</span>}
          <small>El código no cambia la propiedad de una membresía ni permite consultar historiales ajenos.</small>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="memberships-view">
      <section className="membership-hero">
        <div>
          <span className="section-kicker">MEMBERSHIP INTELLIGENCE</span>
          <h2>Tarjetones, asistencia y recompra</h2>
          <p>
            Cada compra conserva su propio saldo, ticket, vendedor e historial.
            Una cita sólo descuenta sesión cuando se confirma la asistencia.
          </p>
        </div>
        <div className="membership-hero-seal">
          <Crown size={24} />
          <span><strong>{activeMemberships.length}</strong> activas</span>
        </div>
      </section>

      <section className="membership-access-toolbar">
        <div className="membership-access-identity">
          <span>{viewer.initials}</span>
          <div>
            <small>{viewer.isMaster ? "ACCESO MASTER · VISTA GLOBAL" : "ACCESO PERSONAL · SUCURSAL Y DÍA ACTUAL"}</small>
            <strong>{viewer.name}</strong>
            <em>{viewer.isMaster ? "Todas las clientas, sucursales e historiales" : `${viewer.branch} · hoy y tu historial autorizado`}</em>
          </div>
        </div>
        <div className="membership-export-actions">
          {viewer.isMaster && (
            <>
          <Button
            type="button"
            variant="outline"
            disabled={filteredMemberships.length === 0 || exporting !== null}
            onClick={() => void exportMembershipsExcel()}
          >
            <FileSpreadsheet size={16} /> {exporting === "EXCEL" ? "Generando…" : "Excel"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={filteredMemberships.length === 0 || exporting !== null}
            onClick={() => void exportMembershipsPdf()}
          >
            <FileDown size={16} /> {exporting === "PDF" ? "Generando…" : "PDF"}
          </Button>
            </>
          )}
          {!viewer.isMaster && (
            <Button type="button" variant="ghost" onClick={closePersonalAccess}>
              <LogOut size={15} /> Bloquear
            </Button>
          )}
        </div>
      </section>

      {lowMemberships.length > 0 && (
        <button
          type="button"
          className="membership-alert-strip"
          onClick={openLowMembershipFollowUp}
          aria-controls="membership-follow-up-list"
          aria-label={`Ver seguimiento de ${lowMemberships.length} membresías por terminar`}
        >
          <AlertTriangle size={20} />
          <div>
            <strong>{lowMemberships.length} membresías están por terminar</strong>
            <span>
              {lowMemberships
                .slice(0, 3)
                .map(
                  (membership) =>
                    `${membership.clientName} · ${remainingSessions(membership)} ${remainingSessions(membership) === 1 ? "sesión" : "sesiones"}`,
                )
                .join(" · ")}
            </span>
          </div>
          <span className="membership-alert-action">
            Ver seguimiento <ArrowRight size={14} />
          </span>
        </button>
      )}

      <section className="membership-metric-grid">
        <Card><CardContent><CreditCard size={19} /><span>MEMBRESÍAS ACTIVAS</span><strong>{activeMemberships.length}</strong><small>{branchScopedMemberships.length} {viewer.isMaster ? "compras históricas" : "compras de hoy"}</small></CardContent></Card>
        <Card><CardContent><CalendarCheck2 size={19} /><span>SESIONES DISPONIBLES</span><strong>{totalSessions - usedSessions}</strong><small>{usedSessions} asistencias registradas</small></CardContent></Card>
        <Card><CardContent><BarChart3 size={19} /><span>USO DE SESIONES</span><strong>{totalSessions ? Math.round((usedSessions / totalSessions) * 100) : 0}%</strong><small>{usedSessions} de {totalSessions} consumidas</small></CardContent></Card>
        <Card><CardContent><Award size={19} /><span>VENTA EN MEMBRESÍAS</span><strong>{formatCurrency(totalRevenue)}</strong><small>{viewer.isMaster ? "Acumulado de compras" : `Hoy · ${viewer.branch}`}</small></CardContent></Card>
      </section>

      {viewer.isMaster && (
        <>
      <section className="membership-commercial-analysis">
        <div className="membership-analysis-header">
          <div>
            <span className="membership-analysis-title">
              <TrendingUp size={18} /> ANÁLISIS COMERCIAL DE MEMBRESÍAS
            </span>
            <small>
              Ventas por sucursal y vendedor original del ticket.
            </small>
          </div>
          <div className="membership-analysis-controls">
            <div className="membership-analysis-mode" role="group" aria-label="Periodo del análisis">
              <button
                type="button"
                className={analysisMode === "MONTHLY" ? "is-active" : ""}
                onClick={() => setAnalysisMode("MONTHLY")}
              >
                Mensual
              </button>
              <button
                type="button"
                className={analysisMode === "ANNUAL" ? "is-active" : ""}
                onClick={() => setAnalysisMode("ANNUAL")}
              >
                Anual
              </button>
            </div>
            {analysisMode === "MONTHLY" ? (
              <Select value={analysisMonth} onValueChange={(month) => {
                setAnalysisMonth(month);
                setAnalysisYear(month.slice(0, 4));
              }}>
                <SelectTrigger aria-label="Mes para analizar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonthKeys.map((month) => (
                    <SelectItem key={month} value={month}>
                      {formatMonthKey(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={analysisYear} onValueChange={setAnalysisYear}>
                <SelectTrigger aria-label="Año para analizar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="membership-leader-grid">
          <Card className="membership-leader-card">
            <CardContent>
              <span className="membership-leader-icon"><Store size={20} /></span>
              <div>
                <small>SUCURSAL CON MÁS VENTAS · {analysisPeriodLabel}</small>
                <strong>{leadingBranch?.name ?? "Sin ventas"}</strong>
                <span>{leadingBranch ? `${leadingBranch.sales} membresía${leadingBranch.sales === 1 ? "" : "s"} · ${formatCurrency(leadingBranch.revenue)}` : "Sin operaciones en el periodo"}</span>
              </div>
              <Badge variant="outline">LÍDER</Badge>
            </CardContent>
          </Card>
          <Card className="membership-leader-card is-seller">
            <CardContent>
              <span className="membership-leader-icon"><Trophy size={20} /></span>
              <div>
                <small>VENDEDOR CON MÁS MEMBRESÍAS · {analysisPeriodLabel}</small>
                <strong>{leadingSeller?.name ?? "Sin ventas"}</strong>
                <span>{leadingSeller ? `${leadingSeller.sales} venta${leadingSeller.sales === 1 ? "" : "s"} · ${formatCurrency(leadingSeller.revenue)}` : "Sin operaciones en el periodo"}</span>
              </div>
              <Badge variant="outline">TOP</Badge>
            </CardContent>
          </Card>
        </div>

        <div className="membership-performance-grid">
          <Card className="membership-history-card">
            <CardContent>
              <div className="membership-section-heading">
                <span><CalendarRange size={18} /> HISTORIAL {analysisMode === "MONTHLY" ? "MENSUAL" : "ANUAL"}</span>
                <Badge variant="outline">{analysisMode === "MONTHLY" ? analysisYear : "HISTÓRICO"}</Badge>
              </div>
              <div className="membership-performance-history">
                {historyRows.map((row) => (
                  <div key={row.key}>
                    <span><strong>{row.label}</strong><small>{row.sales} venta{row.sales === 1 ? "" : "s"} · líder: {row.leader}</small></span>
                    <i><b style={{ width: `${(row.revenue / historyMaxRevenue) * 100}%` }} /></i>
                    <strong>{formatCurrency(row.revenue)}</strong>
                  </div>
                ))}
                {historyRows.length === 0 && <p>Sin ventas de membresías en el periodo.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="membership-podium-card">
            <CardContent>
              <div className="membership-section-heading">
                <span><Award size={18} /> CIERRE MENSUAL · TOP 3 VENDEDORES</span>
                <Badge>{formatMonthKey(lastClosedMonthKey)}</Badge>
              </div>
              <p>El podio se actualiza automáticamente al cerrar cada mes.</p>
              <div className="membership-seller-podium">
                {closedMonthPodium.map((seller, index) => (
                  <div key={seller.name} className={`rank-${index + 1}`}>
                    <i>{index + 1}</i>
                    <span><strong>{seller.name}</strong><small>{seller.sales} membresía{seller.sales === 1 ? "" : "s"}</small></span>
                    <b>{formatCurrency(seller.revenue)}</b>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="membership-insight-grid">
        <Card className="membership-insight-card">
          <CardContent>
            <div className="membership-section-heading"><span><Crown size={18} /> MEJORES CLIENTAS</span><Badge variant="outline">TOP 3</Badge></div>
            <div className="membership-ranking-list">
              {clientRanking.slice(0, 3).map((client, index) => (
                <div key={client.name}>
                  <i>{index + 1}</i>
                  <span><strong>{client.name}</strong><small>{client.purchases} membresía{client.purchases === 1 ? "" : "s"} · {client.sessions} asistencia{client.sessions === 1 ? "" : "s"}</small></span>
                  <b>{formatCurrency(client.revenue)}</b>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="membership-insight-card">
          <CardContent>
            <div className="membership-section-heading"><span><TrendingDown size={18} /> OPORTUNIDAD COMERCIAL</span><Badge variant="outline">ANÁLISIS</Badge></div>
            <div className="membership-opportunity">
              <span>Menor membresía con venta</span>
              <strong>{leastSoldMembership?.[0] ?? "Sin ventas"}</strong>
              <small>{leastSoldMembership?.[1] ?? 0} compras · revisar argumento, precio y seguimiento</small>
            </div>
            <div className="membership-sales-bars">
              {membershipSales.map(([name, count]) => (
                <div key={name}><span>{name}</span><i><b style={{ width: `${(count / Math.max(1, membershipSales[0]?.[1] ?? 1)) * 100}%` }} /></i><strong>{count}</strong></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
        </>
      )}

      <section className="membership-filter-panel">
        <div className="membership-filter-title"><Search size={18} /><span><strong>{viewer.isMaster ? "Buscar membresías" : "Buscar clienta e historial autorizado"}</strong><small>{viewer.isMaster ? "Cliente, vendedor, teléfono, folio o ticket" : "Escribe al menos 2 caracteres del nombre, teléfono, folio o ticket"}</small></span></div>
        <div className="membership-filter-grid">
          <div className="membership-search-field"><Search size={16} /><Input value={search} onChange={(event) => { setSearch(event.target.value); setFollowUpOnly(false); }} placeholder="Cliente, vendedor, teléfono, folio o ticket…" aria-label="Buscar cliente, vendedor o membresía" /></div>
          <Select value={membershipFilter} onValueChange={(value) => { setMembershipFilter(value); setFollowUpOnly(false); }}><SelectTrigger aria-label="Filtrar membresía"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas las membresías</SelectItem>{membershipNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select>
          {viewer.isMaster ? (
            <>
              <Select value={branchFilter} onValueChange={(value) => { setBranchFilter(value); setFollowUpOnly(false); }}><SelectTrigger aria-label="Filtrar sucursal"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas las sucursales</SelectItem>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select>
              <label><span>Desde</span><Input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setFollowUpOnly(false); }} /></label>
              <label><span>Hasta</span><Input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setFollowUpOnly(false); }} /></label>
            </>
          ) : (
            <div className="membership-fixed-day-scope" role="status">
              <Store size={16} />
              <span><small>RESUMEN DIARIO · HISTORIAL AL BUSCAR</small><strong>{viewer.branch} · {todayBusinessDate}</strong></span>
            </div>
          )}
        </div>
      </section>

      <section id="membership-follow-up-list" className="membership-list-section">
        <div className="membership-section-heading"><span><CreditCard size={18} /> {followUpOnly ? "SEGUIMIENTO · MEMBRESÍAS POR TERMINAR" : historicalClientSearch ? "HISTORIAL EN EL QUE PARTICIPASTE" : "TARJETONES INDIVIDUALES"}</span><Badge variant={followUpOnly ? "destructive" : "outline"}>{filteredMemberships.length} registros</Badge></div>
        <div className="membership-record-list">
          {filteredMemberships.map((membership) => {
            const remaining = remainingSessions(membership);
            const isLow = membership.status === "ACTIVE" && remaining <= 2;
            const agendaIncidents =
              agendaIncidentsByMembership[membership.id] ?? [];
            const hasRepeatedAgendaIncidents = agendaIncidents.length >= 2;
            return (
              <article key={membership.id} className={`${isLow ? "is-low" : ""} ${agendaIncidents.length > 0 ? "has-agenda-incidents" : ""} ${hasRepeatedAgendaIncidents ? "is-stalled" : ""}`}>
                <button type="button" onClick={() => openMembership(membership)}>
                  <span className="membership-record-monogram">{membership.clientName.split(" ").map((word) => word[0]).slice(0, 2).join("")}{agendaIncidents.length > 0 && <i className="membership-incident-pill" title={`${agendaIncidents.length} incidencias de agenda`}>{agendaIncidents.length}</i>}</span>
                  <span className="membership-record-client"><strong>{membership.clientName}</strong><small>{membership.clientPhone} · {profileLabels[membership.profile]}{hasRepeatedAgendaIncidents ? " · Poco avance por incidencias" : ""}</small></span>
                  <span><small>MEMBRESÍA</small><strong>{membership.membershipName}</strong><em>{membership.folio}</em></span>
                  <span><small>COMPRA</small><strong>{formatDate(membership.purchaseDateIso)}</strong><em>{membership.branch} · {membership.sellerName}</em></span>
                  <span className="membership-session-balance"><small>SALDO</small><strong>{remaining}<i>/{membership.totalSessions}</i></strong><em>sesiones</em></span>
                  <span className="membership-record-status"><Badge variant={isLow ? "destructive" : "outline"}>{membership.status === "EXHAUSTED" ? "AGOTADA" : isLow ? "POR TERMINAR" : "ACTIVA"}</Badge><small>Ver tarjetón <ArrowRight size={13} /></small></span>
                </button>
              </article>
            );
          })}
          {filteredMemberships.length === 0 && <div className="membership-empty"><Search size={24} /><strong>Sin coincidencias</strong><span>Ajusta los filtros para localizar otra compra.</span></div>}
        </div>
      </section>

      <Dialog open={Boolean(selectedMembership)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="membership-detail-dialog sm:max-w-[980px]">
          {selectedMembership && (
            <div className="membership-detail-layout">
              <aside className={`membership-pass ${selectedAgendaIncidents.length >= 2 ? "has-repeated-incidents" : selectedAgendaIncidents.length > 0 ? "has-incidents" : ""}`}>
                <div className="membership-pass-brand"><Sparkles size={18} /><span>KEYSAR PRIVATE MEMBERSHIP</span></div>
                {selectedAgendaIncidents.length > 0 && <div className="membership-pass-incident"><AlertTriangle size={13} /><strong>{selectedAgendaIncidents.length}</strong><span>incidencia{selectedAgendaIncidents.length === 1 ? "" : "s"} de agenda</span></div>}
                <span className="membership-pass-caption">TARJETÓN PERSONAL</span>
                <h2>{selectedMembership.clientName}</h2>
                <p>{selectedMembership.membershipName}</p>
                <div className="membership-pass-sessions">
                  {Array.from({ length: selectedMembership.totalSessions }, (_, index) => (
                    <span key={index} className={index < selectedMembership.usedSessions ? "is-used" : ""}>{index < selectedMembership.usedSessions ? <Check size={15} /> : index + 1}</span>
                  ))}
                </div>
                <div className="membership-pass-balance"><span>SESIONES DISPONIBLES</span><strong>{remainingSessions(selectedMembership)}</strong></div>
                <footer><span>{selectedMembership.folio}</span><span>{selectedMembership.branch}</span></footer>
              </aside>

              <div className="membership-detail-content">
                <DialogHeader><span className="section-kicker">EXPEDIENTE DE MEMBRESÍA</span><DialogTitle>{selectedMembership.membershipName}</DialogTitle><DialogDescription>Compra individual del {formatDate(selectedMembership.purchaseDateIso)}. No se mezcla con otras membresías de la clienta.</DialogDescription></DialogHeader>

                <div className="membership-detail-meta">
                  <span><TicketCheck size={16} /><small>TICKET DE COMPRA</small><strong>{selectedMembership.purchaseTicketId}</strong></span>
                  <span><MapPin size={16} /><small>SUCURSAL</small><strong>{selectedMembership.branch}</strong></span>
                  <span><UserRound size={16} /><small>VENDEDOR ACTUAL</small><strong>{selectedMembership.sellerName}</strong></span>
                  <span><CalendarCheck2 size={16} /><small>VÍNCULO CON AGENDA</small><strong>{selectedMembership.agendaSyncStatus === "SYNCED" ? "SINCRONIZADO" : selectedMembership.agendaSyncStatus === "PENDING_SYNC" ? "PENDIENTE" : "SIN VINCULAR"}</strong></span>
                </div>

                {selectedAgendaIncidents.length > 0 && (
                  <div className={`membership-agenda-incidents ${selectedAgendaIncidents.length >= 2 ? "is-repeated" : ""}`}>
                    <AlertTriangle size={18} />
                    <span><strong>Seguimiento por inasistencias</strong><small>{selectedCancelledCount} cancelada{selectedCancelledCount === 1 ? "" : "s"} · {selectedNoShowCount} no llegó{selectedNoShowCount === 1 ? "" : "aron"}. Estas incidencias no consumieron sesiones ni marcaron casillas del tarjetón.</small></span>
                    <Badge variant="outline">{selectedAgendaIncidents.length} INCIDENCIA{selectedAgendaIncidents.length === 1 ? "" : "S"}</Badge>
                  </div>
                )}

                <div className="membership-detail-actions">
                  <div className="field-stack"><Label>Perfilamiento comercial</Label><Select value={selectedMembership.profile} disabled={!canEdit} onValueChange={(value) => onUpdateProfile(selectedMembership.id, value as MembershipClientProfile)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(profileLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                  <Button type="button" variant="outline" onClick={() => onOpenTicket(selectedMembership.purchaseTicketId)}><TicketCheck size={16} /> Ir al ticket</Button>
                </div>

                <div className="membership-agenda-link">
                  <div><CalendarDays size={19} /><span><strong>Vincular asistencia desde Agenda</strong><small>La cita no consume saldo hasta confirmar que la clienta asistió.</small></span></div>
                  {eligibleAppointments.length > 0 ? (
                    <div className="membership-agenda-controls">
                      <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}><SelectTrigger aria-label="Elegir cita para asistencia"><SelectValue placeholder="Selecciona una cita" /></SelectTrigger><SelectContent>{eligibleAppointments.map((appointment) => <SelectItem key={appointment.id} value={appointment.id}>{appointment.date} · {appointment.time} · {appointment.branch}</SelectItem>)}</SelectContent></Select>
                      <Button type="button" disabled={!canEdit || !selectedAppointmentId || remainingSessions(selectedMembership) === 0} onClick={async () => { const consumed = await onConsumeSession(selectedMembership.id, selectedAppointmentId); if (!consumed) return; setSelectedAppointmentId(""); setScheduleNextOpen(true); setNextAppointmentBranch(selectedMembership.branch); setNextAppointmentDate(""); setNextAgendaSlotId(""); }}><Check size={16} /> Confirmar asistencia</Button>
                    </div>
                  ) : <p>No hay citas pendientes compatibles para esta clienta.</p>}
                </div>

                {scheduleNextOpen && (
                  <div className="membership-next-appointment">
                    <div className="membership-next-appointment-heading">
                      <CalendarCheck2 size={19} />
                      <span>
                        <strong>Agendar ahora su próxima sesión</strong>
                        <small>
                          Puede elegir cualquier día y horario disponible. Sólo
                          aparecen espacios vacíos o liberados por cancelación.
                        </small>
                      </span>
                      <Badge>DESPUÉS DE ASISTENCIA</Badge>
                    </div>
                    <div className="membership-next-appointment-fields">
                      <div className="field-stack">
                        <Label>Sucursal</Label>
                        <Select
                          value={nextAppointmentBranch}
                          onValueChange={(branch) => {
                            setNextAppointmentBranch(branch);
                            setNextAgendaSlotId("");
                          }}
                        >
                          <SelectTrigger aria-label="Sucursal para próxima cita">
                            <SelectValue placeholder="Selecciona sucursal" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch} value={branch}>
                                {branch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="field-stack">
                        <Label>Fecha</Label>
                        <DatePicker
                          value={nextAppointmentDate}
                          onChange={(date) => {
                            setNextAppointmentDate(date);
                            setNextAgendaSlotId("");
                          }}
                          placeholder="Cualquier fecha"
                        />
                      </div>
                      <div className="field-stack membership-next-slot-field">
                        <Label>Espacio disponible</Label>
                        <Select
                          value={nextAgendaSlotId}
                          onValueChange={setNextAgendaSlotId}
                          disabled={!nextAppointmentDate}
                        >
                          <SelectTrigger aria-label="Horario disponible para próxima cita">
                            <SelectValue placeholder="Elige horario y cabina" />
                          </SelectTrigger>
                          <SelectContent>
                            {nextAgendaSlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.id}>
                                {slot.startTime}–{slot.endTime} · {slot.resourceName}
                                {slot.resourceType === "DOUBLE"
                                  ? ` · ${availableAgendaSeats(slot)} lugares`
                                  : ""}
                                {slot.status === "CANCELLED"
                                  ? " · liberado por cancelación"
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {nextAppointmentDate && nextAgendaSlots.length === 0 && (
                          <small className="is-empty">
                            Sin espacios libres en esa fecha y sucursal.
                          </small>
                        )}
                      </div>
                      <Button
                        type="button"
                        disabled={!nextAgendaSlotId}
                        onClick={async () => {
                          if (
                            await onScheduleNextAppointment(
                              selectedMembership.id,
                              nextAgendaSlotId,
                            )
                          ) {
                            setScheduleNextOpen(false);
                            setNextAgendaSlotId("");
                          }
                        }}
                      >
                        <CalendarCheck2 size={16} /> Reservar próxima cita
                      </Button>
                    </div>
                  </div>
                )}

                <div className="membership-history-grid">
                  <section><h3><History size={16} /> Historial de asistencias</h3>{selectedMembership.attendance.map((attendance, index) => <div key={attendance.id}><span><i>{index + 1}</i><b>{formatDate(attendance.attendedAtIso)}</b><small>{attendance.branch} · {attendance.sellerName}</small></span><Badge variant="outline">{attendance.signatureStatus === "SIGNED" ? "FIRMADA" : "SIN FIRMA"}</Badge></div>)}{selectedMembership.attendance.length === 0 && <p>Sin sesiones consumidas.</p>}</section>
                  <section><h3><ShieldCheck size={16} /> Cambios y trazabilidad</h3><div><span><i><UserRound size={13} /></i><b>Vendedor original</b><small>{selectedMembership.originalSellerName}</small></span></div>{selectedMembership.sellerChanges.map((change) => <div key={change.id}><span><i><ArrowRight size={13} /></i><b>{change.fromSellerName} → {change.toSellerName}</b><small>{formatDate(change.changedAtIso)} · {change.reason}</small></span></div>)}{selectedMembership.statusChanges.map((change) => <div key={change.id}><span><i><History size={13} /></i><b>{change.fromStatus} → {change.toStatus}</b><small>{formatDate(change.changedAtIso)} · {change.reason}</small></span></div>)}</section>
                </div>

                <div className="membership-touch-roadmap"><ShieldCheck size={18} /><span><strong>Preparado para firma touch</strong><small>Cada asistencia ya reserva estado de firma, fecha, terminal y evidencia para una implementación posterior.</small></span><Badge variant="outline">SIGUIENTE ETAPA</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
