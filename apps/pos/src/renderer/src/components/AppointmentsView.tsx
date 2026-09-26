import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CalendarHeart,
  Gift,
  MapPin,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import type { Appointment, AppointmentKind, Seller } from "../types";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";

interface AppointmentsViewProps {
  appointments: Appointment[];
  sellers: Seller[];
  branches: string[];
  activeBranch: string;
  canViewAllBranches: boolean;
  onViewTicket: (ticketId: string) => void;
}

type AppointmentFilter = "ALL" | AppointmentKind;
type AppointmentPeriod = "WEEK" | "MONTH" | "ALL";

const kindLabels: Record<AppointmentKind, string> = {
  COURTESY: "CORTESÍA",
  NEXT_SESSION: "PRÓXIMA SESIÓN",
  NO_APPOINTMENT: "SIN CITA",
};

const appointmentDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

export function AppointmentsView({
  appointments,
  sellers,
  branches,
  activeBranch,
  canViewAllBranches,
  onViewTicket,
}: AppointmentsViewProps) {
  const [filter, setFilter] = useState<AppointmentFilter>("ALL");
  const [periodFilter, setPeriodFilter] = useState<AppointmentPeriod>("MONTH");
  const [sellerFilter, setSellerFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState(
    canViewAllBranches ? "ALL" : activeBranch,
  );
  useEffect(() => {
    if (!canViewAllBranches) {
      setBranchFilter(activeBranch);
      return;
    }
    if (branchFilter !== "ALL" && !branches.includes(branchFilter))
      setBranchFilter("ALL");
  }, [activeBranch, branchFilter, branches, canViewAllBranches]);
  const periodStart = useMemo(() => {
    if (periodFilter === "ALL") return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (periodFilter === "MONTH") {
      start.setDate(1);
    } else {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
    }
    return start.getTime();
  }, [periodFilter]);
  const scopedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          branches.includes(appointment.branch) &&
          (branchFilter === "ALL" || appointment.branch === branchFilter) &&
          (sellerFilter === "ALL" ||
            appointment.sellerIds.includes(sellerFilter)) &&
          (periodStart === null ||
            new Date(appointment.recordedAtIso).getTime() >= periodStart),
      ),
    [appointments, branchFilter, branches, periodStart, sellerFilter],
  );
  const sortedAppointments = useMemo(
    () =>
      [...scopedAppointments].sort(
        (first, second) =>
          new Date(second.recordedAtIso).getTime() -
          new Date(first.recordedAtIso).getTime(),
      ),
    [scopedAppointments],
  );
  const visibleAppointments = sortedAppointments.filter(
    (appointment) => filter === "ALL" || appointment.kind === filter,
  );
  const appointmentPagination = useHistoryPagination(
    visibleAppointments,
    filter,
  );
  const scheduledAppointments = scopedAppointments.filter(
    (appointment) => appointment.status === "SCHEDULED",
  );
  const missingAppointments = scopedAppointments.filter(
    (appointment) => appointment.kind === "NO_APPOINTMENT",
  );
  const agendaIncidents = scopedAppointments.filter(
    (appointment) =>
      appointment.status === "CANCELLED" || appointment.status === "NO_SHOW",
  );
  const followUpAppointments = [...missingAppointments, ...agendaIncidents];
  const uniqueClients = new Set(
    scopedAppointments.map((appointment) => appointment.clientId),
  ).size;
  const purchaseCourtesies = scopedAppointments.filter(
    (appointment) =>
      appointment.kind === "COURTESY" &&
      appointment.courtesyReason === "PURCHASE",
  );
  const purchaseCourtesyBySeller = sellers
    .map((seller) => ({
      label: seller.name,
      total: purchaseCourtesies.filter((appointment) =>
        appointment.sellerIds.includes(seller.id),
      ).length,
    }))
    .filter((item) => item.total > 0)
    .sort((first, second) => second.total - first.total);
  const purchaseCourtesyByBranch = Array.from(
    purchaseCourtesies
      .reduce<Map<string, number>>((summary, appointment) => {
        summary.set(
          appointment.branch,
          (summary.get(appointment.branch) ?? 0) + 1,
        );
        return summary;
      }, new Map())
      .entries(),
  ).sort((first, second) => second[1] - first[1]);
  const branchTotals = Array.from(
    scheduledAppointments
      .reduce<Map<string, number>>((summary, appointment) => {
        summary.set(
          appointment.branch,
          (summary.get(appointment.branch) ?? 0) + 1,
        );
        return summary;
      }, new Map())
      .entries(),
  ).sort((first, second) => second[1] - first[1]);
  const maxBranchTotal = Math.max(1, ...branchTotals.map(([, total]) => total));
  const sellerAlerts = sellers
    .filter((seller) => seller.active)
    .map((seller) => ({
      seller,
      appointments: followUpAppointments.filter((appointment) =>
        appointment.sellerIds.includes(seller.id),
      ),
    }))
    .filter((item) => item.appointments.length > 0);

  return (
    <div className="appointments-view">
      <div className="module-branch-scope">
        <span><Building2 size={15} /> ALCANCE DE CITAS</span>
        {canViewAllBranches ? (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger aria-label="Filtrar citas por sucursal"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las sucursales</SelectItem>
              {branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <strong>{activeBranch}</strong>}
        <Select
          value={periodFilter}
          onValueChange={(value) => setPeriodFilter(value as AppointmentPeriod)}
        >
          <SelectTrigger aria-label="Filtrar citas por periodo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="WEEK">Semana actual</SelectItem>
            <SelectItem value="MONTH">Mes actual</SelectItem>
            <SelectItem value="ALL">Todo el historial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger aria-label="Filtrar citas por vendedor"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los vendedores</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="appointment-metric-grid">
        <Card>
          <CardContent>
            <CalendarHeart size={21} />
            <span>TODOS LOS REGISTROS</span>
            <strong>{scopedAppointments.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CalendarCheck2 size={21} />
            <span>CON CITA</span>
            <strong>{scheduledAppointments.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <AlertTriangle size={21} />
            <span>REQUIEREN SEGUIMIENTO</span>
            <strong>{followUpAppointments.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <UsersRound size={21} />
            <span>CLIENTAS REGISTRADAS</span>
            <strong>{uniqueClients}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Gift size={21} />
            <span>FACIALES POR COMPRA</span>
            <strong>{purchaseCourtesies.length}</strong>
          </CardContent>
        </Card>
      </div>

      <div className="appointments-dashboard-grid">
        <Card className="appointments-dashboard-card">
          <CardContent>
            <div className="dashboard-card-heading">
              <div>
                <span>AGENDA POR SUCURSAL</span>
                <h2>Distribución de citas</h2>
              </div>
              <Building2 size={20} />
            </div>
            <div className="appointment-branch-bars">
              {branchTotals.map(([branch, total]) => (
                <div key={branch}>
                  <span>
                    <strong>{branch}</strong>
                    <small>{total} citas</small>
                  </span>
                  <i>
                    <b
                      style={{ width: `${(total / maxBranchTotal) * 100}%` }}
                    />
                  </i>
                </div>
              ))}
              {branchTotals.length === 0 && <p>Sin citas agendadas.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="appointments-dashboard-card appointment-alert-dashboard">
          <CardContent>
            <div className="dashboard-card-heading">
              <div>
                <span>SEGUIMIENTO POR VENDEDOR</span>
                <h2>Clientas sin próxima facial</h2>
              </div>
              <AlertTriangle size={20} />
            </div>
            <div className="appointment-seller-alerts">
              {sellerAlerts.map(({ seller, appointments: records }) => (
                <div key={seller.id}>
                  <span className="seller-avatar">{seller.initials}</span>
                  <span>
                    <strong>{seller.name}</strong>
                    <small>
                      {records.map((record) => record.clientName).join(", ")}
                    </small>
                  </span>
                  <Badge variant="outline">{records.length} ALERTA</Badge>
                </div>
              ))}
              {sellerAlerts.length === 0 && (
                <p>Todas las clientas cuentan con seguimiento agendado.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="appointments-dashboard-card purchase-courtesy-dashboard">
          <CardContent>
            <div className="dashboard-card-heading">
              <div>
                <span>AUTORIZACIONES COMERCIALES</span>
                <h2>Faciales asignados por compra</h2>
              </div>
              <Gift size={20} />
            </div>
            <div className="purchase-courtesy-breakdown">
              <div>
                <strong>Por vendedor</strong>
                {purchaseCourtesyBySeller.map((item) => (
                  <span key={item.label}><small>{item.label}</small><b>{item.total}</b></span>
                ))}
              </div>
              <div>
                <strong>Por sucursal</strong>
                {purchaseCourtesyByBranch.map(([branch, total]) => (
                  <span key={branch}><small>{branch}</small><b>{total}</b></span>
                ))}
              </div>
              {purchaseCourtesies.length === 0 && (
                <p>Sin faciales por compra en el periodo seleccionado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="segmented-control appointment-filter-tabs">
        {(
          [
            ["ALL", "Todos"],
            ["COURTESY", "Cortesías"],
            ["NEXT_SESSION", "Próximas sesiones"],
            ["NO_APPOINTMENT", "Sin cita"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "is-active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="data-card appointment-record-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>BITÁCORA COMPLETA</span>
              <h2>Historial de citas y seguimientos</h2>
            </div>
            <Badge variant="outline">
              {visibleAppointments.length} registros
            </Badge>
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TIPO</TableHead>
                  <TableHead>CLIENTE</TableHead>
                  <TableHead>SERVICIO</TableHead>
                  <TableHead>FECHA Y HORA</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>VENDEDOR</TableHead>
                  <TableHead>RESERVÓ / ORIGEN</TableHead>
                  <TableHead>TICKET / REGISTRO</TableHead>
                  <TableHead>ESTATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointmentPagination.paginatedItems.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <Badge
                        variant={
                          appointment.kind === "NO_APPOINTMENT"
                            ? "outline"
                            : appointment.kind === "COURTESY"
                              ? "default"
                              : "outline"
                        }
                      >
                        {kindLabels[appointment.kind]}
                      </Badge>
                      {appointment.courtesyReason === "PURCHASE" && (
                        <small className="appointment-courtesy-reason">POR COMPRA</small>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="appointment-client-cell">
                        <strong>{appointment.clientName}</strong>
                        <small>{appointment.clientPhone}</small>
                      </div>
                    </TableCell>
                    <TableCell>{appointment.service}</TableCell>
                    <TableCell>
                      <div className="appointment-date-cell">
                        <strong>
                          {appointment.kind === "NO_APPOINTMENT"
                            ? "No agendada"
                            : appointmentDate(appointment.date)}
                        </strong>
                        <small>
                          {appointment.time}
                          {appointment.agendaResourceName
                            ? ` · ${appointment.agendaResourceName}`
                            : ""}
                        </small>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="appointment-branch-cell">
                        <MapPin size={14} /> {appointment.branch}
                      </span>
                    </TableCell>
                    <TableCell>
                      {appointment.sellerIds
                        .map(
                          (sellerId) =>
                            sellers.find((seller) => seller.id === sellerId)
                              ?.name,
                        )
                        .filter(Boolean)
                        .join(" / ") || "Empresa"}
                    </TableCell>
                    <TableCell>
                      <div className="appointment-date-cell">
                        <strong>
                          {appointment.bookedByName ?? "Sin identificar"}
                        </strong>
                        <small>
                          {appointment.bookingSource === "EXTERNAL_AGENDA"
                            ? "Agenda externa"
                            : appointment.bookingSource === "POS_MEMBERSHIP"
                              ? "POS · Membresías"
                              : appointment.bookingSource === "POS_CHECKOUT"
                                ? "POS · Checkout"
                                : "Registro anterior"}
                        </small>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="appointment-date-cell">
                        <button
                          type="button"
                          className="appointment-ticket-link"
                          onClick={() => onViewTicket(appointment.ticketId)}
                          aria-label={`Consultar ticket ${appointment.ticketId}`}
                        >
                          {appointment.ticketId}
                        </button>
                        <small>{appointment.recordedAt}</small>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="appointment-date-cell">
                        <Badge variant="outline">
                          {appointment.status === "ATTENDED"
                            ? "ASISTIÓ · SESIÓN APLICADA"
                            : appointment.status === "CANCELLED"
                              ? "CANCELADA"
                              : appointment.status === "NO_SHOW"
                                ? "NO LLEGÓ"
                            : appointment.status === "SCHEDULED"
                              ? "AGENDADA"
                              : "REQUIERE SEGUIMIENTO"}
                        </Badge>
                        {appointment.agendaSyncStatus && (
                          <small>
                            {appointment.agendaSyncStatus === "RESERVED"
                              ? "Agenda · reservada"
                              : appointment.agendaSyncStatus === "ATTENDED"
                                ? "Agenda · asistencia confirmada"
                                : appointment.agendaSyncStatus === "NO_SHOW"
                                  ? "Agenda · no llegó"
                                : appointment.agendaSyncStatus === "PENDING_SYNC"
                                  ? "Agenda · pendiente de sincronizar"
                                  : `Agenda · ${appointment.agendaSyncStatus.toLocaleLowerCase("es-MX")}`}
                          </small>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleAppointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      No hay registros que coincidan con el filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <HistoryPagination
            total={visibleAppointments.length}
            page={appointmentPagination.page}
            pageSize={appointmentPagination.pageSize}
            pageCount={appointmentPagination.pageCount}
            onPageChange={appointmentPagination.setPage}
            onPageSizeChange={appointmentPagination.setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
