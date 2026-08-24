import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarHeart,
  CircleDollarSign,
  PackageCheck,
  Phone,
  ReceiptText,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type {
  Appointment,
  Client,
  PaymentMethodOption,
  Ticket,
} from "../types";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";

interface ReportsCustomerDialogProps {
  open: boolean;
  client: Client | null;
  tickets: Ticket[];
  appointments: Appointment[];
  paymentMethods: PaymentMethodOption[];
  onOpenChange: (open: boolean) => void;
}

const appointmentKindLabel: Record<Appointment["kind"], string> = {
  COURTESY: "Cortesía",
  NEXT_SESSION: "Próxima sesión",
  NO_APPOINTMENT: "Sin cita",
};

export function ReportsCustomerDialog({
  open,
  client,
  tickets,
  appointments,
  paymentMethods,
  onOpenChange,
}: ReportsCustomerDialogProps) {
  const customerName = client
    ? `${client.firstName} ${client.lastName}`.trim()
    : "";
  const customerTickets = useMemo(
    () =>
      client
        ? tickets
            .filter(
              (ticket) =>
                (client.phone && ticket.clientPhone === client.phone) ||
                ticket.clientName === customerName,
            )
            .sort((left, right) =>
              right.createdAtIso.localeCompare(left.createdAtIso),
            )
        : [],
    [client, customerName, tickets],
  );
  const customerAppointments = useMemo(
    () =>
      client
        ? appointments
            .filter((appointment) => appointment.clientId === client.id)
            .sort((left, right) => right.date.localeCompare(left.date))
        : [],
    [appointments, client],
  );
  const ticketPagination = useHistoryPagination(
    customerTickets,
    client?.id ?? "",
  );
  const appointmentPagination = useHistoryPagination(
    customerAppointments,
    client?.id ?? "",
  );
  const activeSales = customerTickets.filter(
    (ticket) =>
      ticket.status === "COMPLETED" && ticket.ticketType !== "LAYAWAY_PAYMENT",
  );
  const totalPurchased = activeSales.reduce(
    (sum, ticket) => sum + ticket.total,
    0,
  );
  const totalPaid = customerTickets
    .filter((ticket) => ticket.status === "COMPLETED")
    .reduce(
      (sum, ticket) =>
        sum +
        ticket.payments.reduce(
          (paymentSum, payment) => paymentSum + payment.amount,
          0,
        ),
      0,
    );
  const pendingTickets = activeSales.filter((ticket) => ticket.balanceDue > 0);
  const pendingBalance = pendingTickets.reduce(
    (sum, ticket) => sum + ticket.balanceDue,
    0,
  );
  const products = Array.from(
    activeSales
      .flatMap((ticket) => ticket.products)
      .reduce<Map<string, { name: string; quantity: number; total: number }>>(
        (summary, line) => {
          const current = summary.get(line.productId);
          summary.set(line.productId, {
            name: line.name,
            quantity: (current?.quantity ?? 0) + line.quantity,
            total: (current?.total ?? 0) + line.total,
          });
          return summary;
        },
        new Map(),
      )
      .values(),
  ).sort((left, right) => right.quantity - left.quantity);
  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reports-customer-dialog sm:max-w-[1040px]">
        <DialogHeader>
          <DialogTitle>Historial integral de la clienta</DialogTitle>
          <DialogDescription>
            Compras, cobros, saldos, productos y citas registrados en el POS.
          </DialogDescription>
        </DialogHeader>

        <div className="reports-customer-profile">
          <span className="reports-customer-avatar">
            <UserRound size={24} />
          </span>
          <span>
            <small>{client.registrationFolio}</small>
            <strong>{customerName}</strong>
            <em><Phone size={12} /> {client.phone || "Sin teléfono"}</em>
          </span>
          <span>
            <small>PROCEDENCIA</small>
            <strong>{client.sourceLabel}</strong>
          </span>
          <span>
            <small>SUCURSAL DE REGISTRO</small>
            <strong>{client.registrationBranch ?? "Sin sucursal"}</strong>
          </span>
        </div>

        {pendingTickets.length > 0 && (
          <div className="reports-customer-pending-alert">
            <AlertTriangle size={19} />
            <span>
              <strong>{pendingTickets.length} ticket{pendingTickets.length === 1 ? "" : "s"} sin liquidar</strong>
              <small>Saldo pendiente acumulado: {formatCurrency(pendingBalance)}. Requiere seguimiento de cobranza.</small>
            </span>
          </div>
        )}

        <div className="reports-customer-metrics">
          <Card><CardContent><ShoppingBag size={18} /><span>COMPRA TOTAL</span><strong>{formatCurrency(totalPurchased)}</strong></CardContent></Card>
          <Card><CardContent><WalletCards size={18} /><span>TOTAL PAGADO</span><strong>{formatCurrency(totalPaid)}</strong></CardContent></Card>
          <Card><CardContent><ReceiptText size={18} /><span>TICKETS DE COMPRA</span><strong>{activeSales.length}</strong></CardContent></Card>
          <Card><CardContent><CircleDollarSign size={18} /><span>SALDO PENDIENTE</span><strong className={pendingBalance > 0 ? "is-negative" : ""}>{formatCurrency(pendingBalance)}</strong></CardContent></Card>
          <Card><CardContent><PackageCheck size={18} /><span>PRODUCTOS / SERVICIOS</span><strong>{products.reduce((sum, product) => sum + product.quantity, 0)}</strong></CardContent></Card>
          <Card><CardContent><CalendarHeart size={18} /><span>CITAS Y CORTESÍAS</span><strong>{customerAppointments.length}</strong></CardContent></Card>
        </div>

        <div className="reports-customer-detail-grid">
          <section>
            <div className="reports-customer-section-heading"><span>HISTORIAL DE COMPRA</span><Badge variant="outline">{customerTickets.length} REGISTROS</Badge></div>
            <div className="table-scroll">
              <Table>
                <TableHeader><TableRow><TableHead>FECHA / FOLIO</TableHead><TableHead>SUCURSAL</TableHead><TableHead>PRODUCTOS</TableHead><TableHead>TOTAL</TableHead><TableHead>PAGADO</TableHead><TableHead>SALDO</TableHead><TableHead>ESTATUS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ticketPagination.paginatedItems.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell><strong>{ticket.createdAt}</strong><small>{ticket.id}</small></TableCell>
                      <TableCell>{ticket.branchName ?? "—"}</TableCell>
                      <TableCell>{ticket.products.map((product) => `${product.quantity} × ${product.name}`).join(" · ")}</TableCell>
                      <TableCell>{formatCurrency(ticket.total)}</TableCell>
                      <TableCell>{formatCurrency(ticket.amountPaid)}</TableCell>
                      <TableCell><strong className={ticket.balanceDue > 0 ? "is-negative" : ""}>{formatCurrency(ticket.balanceDue)}</strong></TableCell>
                      <TableCell><Badge variant={ticket.status === "COMPLETED" ? "default" : "outline"}>{ticket.status === "REFUNDED" ? "CANCELADO" : ticket.balanceDue > 0 ? "SIN LIQUIDAR" : ticket.ticketType === "LAYAWAY_PAYMENT" ? "ABONO" : "LIQUIDADO"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination
              total={customerTickets.length}
              page={ticketPagination.page}
              pageSize={ticketPagination.pageSize}
              pageCount={ticketPagination.pageCount}
              onPageChange={ticketPagination.setPage}
              onPageSizeChange={ticketPagination.setPageSize}
            />
          </section>

          <aside>
            <div className="reports-customer-section-heading"><span>PRODUCTOS COMPRADOS</span><Badge variant="outline">{products.length}</Badge></div>
            <div className="reports-customer-product-list">
              {products.map((product) => (
                <div key={product.name}><span><strong>{product.name}</strong><small>{formatCurrency(product.total)}</small></span><b>{product.quantity} u.</b></div>
              ))}
              {products.length === 0 && <p>Sin productos registrados.</p>}
            </div>
            <div className="reports-customer-section-heading"><span>FORMAS DE PAGO</span></div>
            <div className="reports-customer-payment-list">
              {customerTickets.flatMap((ticket) => ticket.payments.map((payment) => (
                <div key={`${ticket.id}-${payment.id}`}><span>{ticket.createdAt} · {paymentLabel(payment.methodId)}</span><strong>{formatCurrency(payment.amount)}</strong></div>
              )))}
            </div>
          </aside>
        </div>

        <section className="reports-customer-appointments">
          <div className="reports-customer-section-heading"><span>CITAS, CORTESÍAS Y SEGUIMIENTO</span><Badge variant="outline">{customerAppointments.length}</Badge></div>
          <div className="reports-customer-appointment-list">
            {appointmentPagination.paginatedItems.map((appointment) => (
              <article key={appointment.id}>
                <CalendarHeart size={16} />
                <span><strong>{appointment.service}</strong><small>{appointmentKindLabel[appointment.kind]} · {appointment.date} · {appointment.time}</small></span>
                <span><strong>{appointment.branch}</strong><small>{appointment.status}</small></span>
              </article>
            ))}
            {customerAppointments.length === 0 && <p>Sin citas registradas.</p>}
          </div>
          <HistoryPagination
            total={customerAppointments.length}
            page={appointmentPagination.page}
            pageSize={appointmentPagination.pageSize}
            pageCount={appointmentPagination.pageCount}
            onPageChange={appointmentPagination.setPage}
            onPageSizeChange={appointmentPagination.setPageSize}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}
