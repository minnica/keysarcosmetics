"use client";

import {
  CheckCheck,
  CircleHelp,
  Clock3,
  Download,
  MessageCircle,
  Send,
  Smartphone,
} from "lucide-react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@cosmetics/ui";
import {
  reservationMobileMessages,
  reservationMobileMessagingTotals,
  reservationReportTotals,
  type ReservationMobileMessageStatus,
} from "@/lib/mock-reservation-report-data";

interface ReservationMobileMessagingProps {
  selectedBookings: number;
}

const numberFormatter = new Intl.NumberFormat("es-MX");

const messageStatusLabels: Record<ReservationMobileMessageStatus, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Fallido",
};

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function PercentageDonut({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  const safeValue = Math.min(Math.max(value, 0), 100);

  return (
    <div
      aria-label={`${label}: ${safeValue.toFixed(1)}%`}
      className="reservation-message-donut"
      role="img"
      style={{
        background: `conic-gradient(${color} 0 ${safeValue}%, #e8e5e1 ${safeValue}% 100%)`,
      }}
    >
      <div className="reservation-message-donut-center">
        <span className="number-display text-2xl text-[#263649]">{safeValue.toFixed(0)}%</span>
        <span className="mt-1 text-[0.58rem] uppercase tracking-[0.12em] text-slate-400">{label}</span>
      </div>
    </div>
  );
}

export function ReservationMobileMessaging({
  selectedBookings,
}: ReservationMobileMessagingProps) {
  const filterRatio = selectedBookings / reservationReportTotals.bookings;
  const periodReservations = Math.round(
    reservationMobileMessagingTotals.periodReservations * filterRatio,
  );
  const messagesSent =
    selectedBookings > 0
      ? Math.max(1, Math.round(reservationMobileMessagingTotals.messagesSent * filterRatio))
      : 0;
  const confirmedByWhatsApp =
    messagesSent > 0
      ? Math.min(
          messagesSent,
          Math.max(
            1,
            Math.round(
              reservationMobileMessagingTotals.confirmedByWhatsApp * filterRatio,
            ),
          ),
        )
      : 0;
  const sentRate =
    periodReservations > 0 ? (messagesSent / periodReservations) * 100 : 0;
  const confirmationRate =
    messagesSent > 0 ? (confirmedByWhatsApp / messagesSent) * 100 : 0;
  const conversationsUsed =
    messagesSent > 0 ? reservationMobileMessagingTotals.conversationsUsed : 0;
  const quotaRate =
    (conversationsUsed / reservationMobileMessagingTotals.conversationsLimit) * 100;
  const visibleMessages = reservationMobileMessages.slice(0, messagesSent);

  return (
    <div className="space-y-5">
      <section className="report-card reservation-messaging-intro">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps">Reservas / Mensajería móvil</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
              Seguimiento de confirmaciones
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Supervisa recordatorios, respuestas y consumo del canal desde un solo lugar.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#ecf8f3] px-4 py-2 text-xs font-semibold text-[#3f7a61] sm:self-auto">
            <MessageCircle className="h-4 w-4" />
            WhatsApp conectado
          </span>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <article className="report-card reservation-message-metric-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-caps">Por confirmar</p>
              <p className="number-display mt-4 text-[2.8rem] leading-none tracking-[-0.05em] text-[#d18a45]">
                {numberFormatter.format(periodReservations)}
              </p>
              <p className="mt-3 text-sm font-semibold text-[#263649]">Reservas sin confirmación</p>
              <p className="mt-1 text-xs text-slate-400">del periodo seleccionado</p>
            </div>
            <span className="reservation-message-icon reservation-message-icon-warning">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-auto pt-5">
            <div className="h-2 overflow-hidden rounded-full bg-[#f2ebe4]">
              <div className="h-full rounded-full bg-[#d9a36c]" style={{ width: "100%" }} />
            </div>
            <p className="mt-2 text-[0.68rem] text-slate-400">
              {periodReservations} reservas requieren seguimiento
            </p>
          </div>
        </article>

        <article className="report-card reservation-message-metric-card items-center text-center">
          <div className="w-full text-left">
            <p className="label-caps">WhatsApp enviados</p>
          </div>
          <PercentageDonut color="#3b8f6c" label="enviados" value={sentRate} />
          <p className="mt-auto text-sm font-semibold text-[#263649]">
            {messagesSent} de {periodReservations} reservas
          </p>
          <p className="mt-1 text-xs text-slate-400">recordatorios enviados</p>
        </article>

        <article className="report-card reservation-message-metric-card items-center text-center">
          <div className="w-full text-left">
            <p className="label-caps">Confirmaciones WhatsApp</p>
          </div>
          <PercentageDonut color="#24c38b" label="confirmadas" value={confirmationRate} />
          <p className="mt-auto text-sm font-semibold text-[#263649]">
            {confirmedByWhatsApp} de {messagesSent} mensajes
          </p>
          <p className="mt-1 text-xs text-slate-400">terminaron en confirmación</p>
        </article>

        <article className="report-card reservation-message-metric-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-caps">Conversaciones</p>
              <p className="number-display mt-4 text-3xl text-[#263649]">
                {conversationsUsed}
                <span className="ml-1 text-base text-slate-300">
                  / {reservationMobileMessagingTotals.conversationsLimit}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-400">cuota utilizada del canal</p>
            </div>
            <span className="reservation-message-icon reservation-message-icon-success">
              <Smartphone className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-5">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e8f0eb]">
              <div
                className="h-full rounded-full bg-[#648672]"
                style={{ width: `${Math.max(quotaRate, conversationsUsed > 0 ? 2 : 0)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[0.68rem] text-slate-400">
              <CircleHelp className="h-3.5 w-3.5" />
              Se reinicia al comenzar el siguiente ciclo.
            </div>
          </div>
          <Button
            className="mt-auto h-10 rounded-xl border-[#dfd6ce] bg-white text-[#526f5e] hover:bg-[#f7f3ef]"
            onClick={() =>
              toast.info("Descarga preparada en modo visual", {
                description: "El archivo se habilitará al conectar la API de mensajería.",
              })
            }
            type="button"
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar detalle
          </Button>
        </article>
      </section>

      <section className="report-card">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Actividad reciente</p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
              Mensajería móvil
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Se muestran los últimos 25 mensajes del periodo seleccionado.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#f2f7f4] px-3 py-2 text-xs font-semibold text-[#526f5e] sm:self-auto">
            <Send className="h-4 w-4" />
            {visibleMessages.length} mensajes visibles
          </span>
        </div>

        <div className="reservation-messages-table overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Fecha de reserva</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha de mensaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Confirmación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMessages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-semibold text-[#263649]">{message.client}</TableCell>
                  <TableCell>{message.branch}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatMessageDate(message.reservationAt)}</TableCell>
                  <TableCell>
                    <span className="reservation-message-channel">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {message.channel}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatMessageDate(message.messageAt)}</TableCell>
                  <TableCell>
                    <span className={`reservation-message-status reservation-message-status-${message.status}`}>
                      {messageStatusLabels[message.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {message.confirmed ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#3f7a61]">
                        <CheckCheck className="h-4 w-4" /> Sí
                      </span>
                    ) : (
                      <span className="text-slate-400">Pendiente</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
