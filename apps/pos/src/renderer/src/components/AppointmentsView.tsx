import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CalendarHeart,
  MapPin,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import type { Appointment, AppointmentKind, Seller } from "../types";

interface AppointmentsViewProps {
  appointments: Appointment[];
  sellers: Seller[];
}

type AppointmentFilter = "ALL" | AppointmentKind;

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
}: AppointmentsViewProps) {
  const [filter, setFilter] = useState<AppointmentFilter>("ALL");
  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (first, second) =>
          new Date(second.recordedAtIso).getTime() -
          new Date(first.recordedAtIso).getTime(),
      ),
    [appointments],
  );
  const visibleAppointments = sortedAppointments.filter(
    (appointment) => filter === "ALL" || appointment.kind === filter,
  );
  const scheduledAppointments = appointments.filter(
    (appointment) => appointment.status === "SCHEDULED",
  );
  const missingAppointments = appointments.filter(
    (appointment) => appointment.kind === "NO_APPOINTMENT",
  );
  const uniqueClients = new Set(
    appointments.map((appointment) => appointment.clientId),
  ).size;
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
      appointments: missingAppointments.filter((appointment) =>
        appointment.sellerIds.includes(seller.id),
      ),
    }))
    .filter((item) => item.appointments.length > 0);

  return (
    <div className="appointments-view">
      <div className="appointment-metric-grid">
        <Card>
          <CardContent>
            <CalendarHeart size={21} />
            <span>TODOS LOS REGISTROS</span>
            <strong>{appointments.length}</strong>
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
            <span>SIN FACIAL AGENDADO</span>
            <strong>{missingAppointments.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <UsersRound size={21} />
            <span>CLIENTAS REGISTRADAS</span>
            <strong>{uniqueClients}</strong>
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
                  <TableHead>TICKET / REGISTRO</TableHead>
                  <TableHead>ESTATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAppointments.map((appointment) => (
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
                        <small>{appointment.time}</small>
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
                        <strong>{appointment.ticketId}</strong>
                        <small>{appointment.recordedAt}</small>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {appointment.status === "SCHEDULED"
                          ? "AGENDADA"
                          : "REQUIERE SEGUIMIENTO"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleAppointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      No hay registros que coincidan con el filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
