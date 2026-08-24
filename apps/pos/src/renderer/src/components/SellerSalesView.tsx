import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  Eye,
  KeyRound,
  LogOut,
  MessageCircle,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Input,
  Label,
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
import { formatCurrency } from "../mock-data";
import type {
  Appointment,
  Client,
  LayawayRecord,
  OwedProductRecord,
  PaymentMethodOption,
  Seller,
  Ticket,
} from "../types";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";

interface SellerSalesViewProps {
  sellers: Seller[];
  tickets: Ticket[];
  clients: Client[];
  paymentMethods: PaymentMethodOption[];
  layaways: LayawayRecord[];
  appointments: Appointment[];
  owedProducts: OwedProductRecord[];
  onPreviewTicket: (ticket: Ticket) => void;
  onRegisterLayawayPayment: (
    layawayId: string,
    amount: number,
    methodId: string,
    sellerId: string,
    deliveredCartItemIds: string[],
  ) => void;
}

type SellerViewMode = "SALES" | "CLIENTS";

const paymentStatusLabels: Record<Ticket["paymentStatus"], string> = {
  PAID: "Pagado",
  LAYAWAY: "Apartado",
  PENDING: "Pendiente",
};

const sourceLabels: Record<string, string> = {
  APPROACH: "Abordaje",
  LEAD: "Lead",
  REFERRAL: "Recomendado",
  SOCIAL: "Redes sociales",
};

const ticketDate = (ticket: Ticket) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date(ticket.createdAtIso));

const sameClient = (client: Client, ticket: Ticket) => {
  if (client.phone && ticket.clientPhone) {
    return (
      client.phone.replace(/\D/g, "") === ticket.clientPhone.replace(/\D/g, "")
    );
  }
  return (
    `${client.firstName} ${client.lastName}`.toLocaleLowerCase("es-MX") ===
    ticket.clientName.toLocaleLowerCase("es-MX")
  );
};

export function SellerSalesView({
  sellers,
  tickets,
  clients,
  paymentMethods,
  layaways,
  appointments,
  owedProducts,
  onPreviewTicket,
  onRegisterLayawayPayment,
}: SellerSalesViewProps) {
  const [accessCode, setAccessCode] = useState("");
  const [authorizedSellerId, setAuthorizedSellerId] = useState("");
  const [accessError, setAccessError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<SellerViewMode>("SALES");
  const [showAllClients, setShowAllClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [layawayAmounts, setLayawayAmounts] = useState<Record<string, number>>(
    {},
  );
  const [layawayMethods, setLayawayMethods] = useState<Record<string, string>>(
    {},
  );
  const [layawayDeliveryIds, setLayawayDeliveryIds] = useState<
    Record<string, string[]>
  >({});

  const activeSellers = useMemo(
    () => sellers.filter((seller) => seller.active),
    [sellers],
  );
  const authorizedSeller = activeSellers.find(
    (seller) => seller.id === authorizedSellerId,
  );

  const sellerTickets = useMemo(() => {
    if (!authorizedSellerId) return [];
    return tickets.filter((ticket) => {
      const date = ticketDate(ticket);
      const participates = ticket.sellerSales.some(
        (sale) => sale.sellerId === authorizedSellerId,
      );
      return (
        participates &&
        (!dateFrom || date >= dateFrom) &&
        (!dateTo || date <= dateTo)
      );
    });
  }, [authorizedSellerId, dateFrom, dateTo, tickets]);

  const ownedClients = useMemo(() => {
    if (!authorizedSellerId) return [];
    return clients.filter((client) => client.ownerId === authorizedSellerId);
  }, [authorizedSellerId, clients]);

  const visibleClients = showAllClients
    ? ownedClients
    : ownedClients.filter((client) =>
        sellerTickets.some((ticket) => sameClient(client, ticket)),
      );
  const selectedClient = visibleClients.find(
    (client) => client.id === selectedClientId,
  );
  const selectedClientTickets = selectedClient
    ? tickets.filter((ticket) => sameClient(selectedClient, ticket))
    : [];
  const sellerTicketPagination = useHistoryPagination(
    sellerTickets,
    `${authorizedSellerId}|${dateFrom}|${dateTo}`,
  );
  const sellerClientPagination = useHistoryPagination(
    visibleClients,
    `${authorizedSellerId}|${dateFrom}|${dateTo}|${showAllClients}`,
  );
  const clientTicketPagination = useHistoryPagination(
    selectedClientTickets,
    selectedClientId,
  );
  const selectedClientSaleTickets = selectedClientTickets.filter(
    (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
  );
  const sellerSaleTickets = sellerTickets.filter(
    (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
  );
  const overdueThreshold = new Date();
  overdueThreshold.setMonth(overdueThreshold.getMonth() - 4);
  const sellerLayaways = layaways.filter((layaway) =>
    layaway.sellerIds.includes(authorizedSellerId),
  );
  const overdueLayaways = sellerLayaways.filter(
    (layaway) =>
      layaway.status === "ACTIVE" &&
      new Date(layaway.createdAtIso) < overdueThreshold,
  );
  const missingFacialAppointments = appointments.filter(
    (appointment) =>
      appointment.kind === "NO_APPOINTMENT" &&
      appointment.status === "PENDING" &&
      appointment.sellerIds.includes(authorizedSellerId),
  );
  const sellerOwedProducts = owedProducts.filter(
    (record) =>
      record.status === "PENDING" &&
      record.sellerIds.includes(authorizedSellerId),
  );
  const selectedClientLayaways = selectedClient
    ? sellerLayaways.filter((layaway) => layaway.clientId === selectedClient.id)
    : [];
  const unlinkedClientLayaways = selectedClientLayaways.filter(
    (layaway) =>
      !selectedClientSaleTickets.some(
        (ticket) => ticket.id === layaway.originalTicketId,
      ),
  );

  const sellerTotal = sellerTickets.reduce(
    (sum, ticket) =>
      sum +
      (ticket.sellerSales.find((sale) => sale.sellerId === authorizedSellerId)
        ?.amount ?? 0),
    0,
  );
  const collected = sellerTickets.reduce(
    (sum, ticket) =>
      sum +
      ticket.payments.reduce((total, payment) => total + payment.amount, 0),
    0,
  );
  const pending = sellerSaleTickets.reduce(
    (sum, ticket) => sum + ticket.balanceDue,
    0,
  );

  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;

  const authorizeSeller = () => {
    const seller = activeSellers.find(
      (candidate) => candidate.accessCode === accessCode.trim(),
    );
    if (!seller) {
      setAccessError("Clave inválida o vendedor inactivo.");
      setAuthorizedSellerId("");
      return;
    }
    setAuthorizedSellerId(seller.id);
    setAccessCode("");
    setAccessError("");
    setViewMode("SALES");
  };

  const closeAccess = () => {
    setAuthorizedSellerId("");
    setSelectedClientId("");
    setDateFrom("");
    setDateTo("");
  };

  if (!authorizedSeller) {
    return (
      <Card className="seller-sales-gate">
        <CardContent>
          <div className="seller-sales-gate-icon">
            <ShieldCheck size={30} />
          </div>
          <span className="section-kicker">ACCESO PERSONAL</span>
          <h2>Consulta tus ventas y clientes</h2>
          <p>
            Ingresa tu clave de vendedor. Sólo se mostrarán tus ventas y los
            clientes asignados a tu cartera.
          </p>
          <div className="seller-sales-code-row">
            <div>
              <KeyRound size={17} />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") authorizeSeller();
                }}
                placeholder="Clave de 4 dígitos"
                aria-label="Clave para consultar ventas del vendedor"
              />
            </div>
            <Button
              type="button"
              onClick={authorizeSeller}
              disabled={accessCode.trim().length !== 4}
            >
              Consultar
            </Button>
          </div>
          {accessError ? (
            <span className="seller-sales-error" role="alert">
              {accessError}
            </span>
          ) : (
            <small>Claves mock: Ana 1101 · Sofía 2202 · Daniela 3303.</small>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="seller-sales-view">
      <Card className="seller-sales-session-card">
        <CardContent>
          <div className="seller-session-identity">
            <span>{authorizedSeller.initials}</span>
            <div>
              <small>SESIÓN DE VENDEDOR</small>
              <strong>{authorizedSeller.name}</strong>
            </div>
          </div>
          <div className="seller-period-filter">
            <CalendarRange size={18} />
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Desde"
            />
            <span>—</span>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="Hasta"
            />
            {(dateFrom || dateTo) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Todo el periodo
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={closeAccess}>
            <LogOut size={15} /> Cerrar acceso
          </Button>
        </CardContent>
      </Card>

      {overdueLayaways.length > 0 && (
        <Card className="seller-overdue-alert">
          <CardContent>
            <AlertTriangle size={22} />
            <div>
              <strong>
                {overdueLayaways.length} clienta
                {overdueLayaways.length === 1 ? "" : "s"} con apartado mayor a 4
                meses
              </strong>
              <p>
                Revisa su perfil para consultar el saldo y registrar el
                seguimiento de cobro.
              </p>
            </div>
            <Badge variant="outline">PAGO PENDIENTE</Badge>
          </CardContent>
        </Card>
      )}

      {missingFacialAppointments.length > 0 && (
        <Card className="seller-overdue-alert seller-appointment-alert">
          <CardContent>
            <CalendarRange size={22} />
            <div>
              <strong>
                {missingFacialAppointments.length} clienta
                {missingFacialAppointments.length === 1 ? "" : "s"} sin próxima
                facial
              </strong>
              <p>
                {Array.from(
                  new Set(
                    missingFacialAppointments.map(
                      (appointment) => appointment.clientName,
                    ),
                  ),
                ).join(", ")}
              </p>
            </div>
            <Badge variant="outline">AGENDAR HOY</Badge>
          </CardContent>
        </Card>
      )}

      {sellerOwedProducts.length > 0 && (
        <Card className="seller-overdue-alert seller-product-debt-alert">
          <CardContent>
            <AlertTriangle size={22} />
            <div>
              <strong>
                {sellerOwedProducts.length} entrega
                {sellerOwedProducts.length === 1 ? "" : "s"} de producto pendiente
                {sellerOwedProducts.length === 1 ? "" : "s"}
              </strong>
              <p>
                {sellerOwedProducts
                  .map(
                    (record) =>
                      `${record.clientName} · ${record.clientPhone} · ${record.productName} (${record.quantity - record.deliveredQuantity}) · ${record.branch}`,
                  )
                  .join(" | ")}
              </p>
            </div>
            <Badge variant="outline">PENDIENTE ENTREGAR</Badge>
          </CardContent>
        </Card>
      )}

      <div className="seller-sales-metrics">
        <Card>
          <CardContent>
            <ReceiptText size={19} />
            <span>Mis tickets</span>
            <strong>{sellerTickets.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CircleDollarSign size={19} />
            <span>Mi venta asignada</span>
            <strong>{formatCurrency(sellerTotal)}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Clock3 size={19} />
            <span>Saldo de tickets</span>
            <strong>{formatCurrency(pending)}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <UsersRound size={19} />
            <span>Clientes en cartera</span>
            <strong>{ownedClients.length}</strong>
          </CardContent>
        </Card>
      </div>

      <div className="segmented-control seller-sales-tabs">
        <button
          type="button"
          className={viewMode === "SALES" ? "is-active" : ""}
          onClick={() => setViewMode("SALES")}
        >
          <ReceiptText size={16} /> Ventas del periodo
        </button>
        <button
          type="button"
          className={viewMode === "CLIENTS" ? "is-active" : ""}
          onClick={() => setViewMode("CLIENTS")}
        >
          <UsersRound size={16} /> Mis clientes e historial
        </button>
      </div>

      {viewMode === "SALES" ? (
        <Card className="data-card seller-ticket-table">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>VENTAS AUTORIZADAS</span>
                <h2>Tickets donde participa {authorizedSeller.name}</h2>
              </div>
              <Badge variant="outline">
                Cobrado {formatCurrency(collected)}
              </Badge>
            </div>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FOLIO</TableHead>
                    <TableHead>FECHA</TableHead>
                    <TableHead>CLIENTE</TableHead>
                    <TableHead>PRODUCTOS</TableHead>
                    <TableHead>MI VENTA</TableHead>
                    <TableHead>PAGO</TableHead>
                    <TableHead>SALDO</TableHead>
                    <TableHead>TICKET</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerTicketPagination.paginatedItems.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <strong>{ticket.id}</strong>
                      </TableCell>
                      <TableCell>{ticket.createdAt}</TableCell>
                      <TableCell>
                        <div className="seller-ticket-client">
                          <strong>{ticket.clientName}</strong>
                          <small>{ticket.clientPhone || "Sin teléfono"}</small>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ticket.products
                          .map((product) => product.name)
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        <strong>
                          {formatCurrency(
                            ticket.sellerSales.find(
                              (sale) => sale.sellerId === authorizedSellerId,
                            )?.amount ?? 0,
                          )}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentStatusLabels[ticket.paymentStatus]}
                        </Badge>
                        <small className="seller-payment-methods">
                          {ticket.payments.length > 0
                            ? ticket.payments
                                .map((payment) =>
                                  paymentLabel(payment.methodId),
                                )
                                .join(" + ")
                            : "Sin pago"}
                        </small>
                      </TableCell>
                      <TableCell>{formatCurrency(ticket.balanceDue)}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="seller-view-ticket"
                          onClick={() => onPreviewTicket(ticket)}
                          aria-label={`Visualizar ticket ${ticket.id}`}
                        >
                          <Eye size={15} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sellerTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        No existen ventas del vendedor en este periodo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination
              total={sellerTickets.length}
              page={sellerTicketPagination.page}
              pageSize={sellerTicketPagination.pageSize}
              pageCount={sellerTicketPagination.pageCount}
              onPageChange={sellerTicketPagination.setPage}
              onPageSizeChange={sellerTicketPagination.setPageSize}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="seller-clients-layout">
          <Card className="seller-client-list-card data-card">
            <CardContent className="p-0">
              <div className="data-card-heading">
                <div>
                  <span>CARTERA PERSONAL</span>
                  <h2>Clientes de {authorizedSeller.name}</h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllClients((current) => !current)}
                >
                  {showAllClients
                    ? "Sólo con ventas del periodo"
                    : "Mostrar todos mis clientes"}
                </Button>
              </div>
              <div className="seller-client-list">
                {sellerClientPagination.paginatedItems.map((client) => {
                  const history = tickets.filter((ticket) =>
                    sameClient(client, ticket),
                  );
                  const saleHistory = history.filter(
                    (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
                  );
                  const balance =
                    saleHistory.reduce(
                      (sum, ticket) => sum + ticket.balanceDue,
                      0,
                    ) +
                    sellerLayaways
                      .filter(
                        (layaway) =>
                          layaway.clientId === client.id &&
                          !saleHistory.some(
                            (ticket) => ticket.id === layaway.originalTicketId,
                          ),
                      )
                      .reduce((sum, layaway) => sum + layaway.balanceDue, 0);
                  const hasOverdue = overdueLayaways.some(
                    (layaway) => layaway.clientId === client.id,
                  );
                  return (
                    <button
                      key={client.id}
                      type="button"
                      className={
                        selectedClientId === client.id ? "is-active" : ""
                      }
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <span className="seller-client-avatar">
                        {client.firstName.charAt(0)}
                        {client.lastName.charAt(0)}
                      </span>
                      <span>
                        <strong>
                          {client.firstName} {client.lastName}
                        </strong>
                        <small>
                          {history.length} tickets · Saldo{" "}
                          {formatCurrency(balance)}
                        </small>
                        {hasOverdue && (
                          <small>⚠ Apartado mayor a 4 meses</small>
                        )}
                      </span>
                    </button>
                  );
                })}
                {visibleClients.length === 0 && (
                  <p>No hay clientes propios con ventas en el periodo.</p>
                )}
              </div>
              <HistoryPagination
                total={visibleClients.length}
                page={sellerClientPagination.page}
                pageSize={sellerClientPagination.pageSize}
                pageCount={sellerClientPagination.pageCount}
                onPageChange={sellerClientPagination.setPage}
                onPageSizeChange={sellerClientPagination.setPageSize}
              />
            </CardContent>
          </Card>

          <Card className="seller-client-history-card">
            <CardContent>
              {selectedClient ? (
                <>
                  <div className="seller-client-profile">
                    <span className="seller-client-avatar is-large">
                      {selectedClient.firstName.charAt(0)}
                      {selectedClient.lastName.charAt(0)}
                    </span>
                    <div>
                      <span className="section-kicker">
                        INFORMACIÓN DE CLIENTE
                      </span>
                      <h2>
                        {selectedClient.firstName} {selectedClient.lastName}
                      </h2>
                      <p>
                        {selectedClient.sourceLabel ??
                          sourceLabels[selectedClient.source] ??
                          selectedClient.source}
                      </p>
                    </div>
                  </div>
                  <div className="seller-client-contact-grid">
                    <span>
                      <Phone size={15} />
                      <strong>{selectedClient.phone}</strong>
                    </span>
                    <span>
                      <MessageCircle size={15} />
                      <strong>{selectedClient.whatsapp}</strong>
                    </span>
                    <span>
                      <Building2 size={15} />
                      <strong>
                        {selectedClient.companyName || "Cartera personal"}
                      </strong>
                    </span>
                    <span>
                      <UserRound size={15} />
                      <strong>{selectedClient.gender}</strong>
                    </span>
                  </div>
                  <div className="seller-client-payment-summary">
                    <span>
                      Total histórico
                      <strong>
                        {formatCurrency(
                          selectedClientSaleTickets.reduce(
                            (sum, ticket) => sum + ticket.total,
                            0,
                          ) +
                            unlinkedClientLayaways.reduce(
                              (sum, layaway) => sum + layaway.total,
                              0,
                            ),
                        )}
                      </strong>
                    </span>
                    <span>
                      Cobrado
                      <strong>
                        {formatCurrency(
                          selectedClientSaleTickets.reduce(
                            (sum, ticket) => sum + ticket.amountPaid,
                            0,
                          ) +
                            unlinkedClientLayaways.reduce(
                              (sum, layaway) => sum + layaway.amountPaid,
                              0,
                            ),
                        )}
                      </strong>
                    </span>
                    <span>
                      Pendiente / apartado
                      <strong>
                        {formatCurrency(
                          selectedClientLayaways.reduce(
                            (sum, layaway) => sum + layaway.balanceDue,
                            0,
                          ) +
                            selectedClientSaleTickets
                              .filter(
                                (ticket) =>
                                  !selectedClientLayaways.some(
                                    (layaway) =>
                                      layaway.originalTicketId === ticket.id,
                                  ),
                              )
                              .reduce(
                                (sum, ticket) => sum + ticket.balanceDue,
                                0,
                              ),
                        )}
                      </strong>
                    </span>
                  </div>
                  {selectedClientLayaways.length > 0 && (
                    <div className="seller-layaway-section">
                      <div className="section-title-row">
                        <div>
                          <span className="section-kicker">APARTADOS</span>
                          <h3>Abonos y liquidación de saldo</h3>
                        </div>
                        <Badge variant="outline">
                          {
                            selectedClientLayaways.filter(
                              (layaway) => layaway.status === "ACTIVE",
                            ).length
                          }{" "}
                          activos
                        </Badge>
                      </div>
                      {selectedClientLayaways.map((layaway) => {
                        const selectedMethod =
                          layawayMethods[layaway.id] ??
                          paymentMethods.find((method) => method.active)?.id ??
                          "";
                        const enteredAmount =
                          layawayAmounts[layaway.id] ?? layaway.balanceDue;
                        const isOverdue = overdueLayaways.some(
                          (item) => item.id === layaway.id,
                        );
                        const pendingDeliveryItems = layaway.items.filter(
                          (item) =>
                            item.kind === "PRODUCT" &&
                            item.deliveredQuantity < item.quantity,
                        );
                        const willLiquidate =
                          enteredAmount >= layaway.balanceDue;
                        const selectedDeliveryIds =
                          layawayDeliveryIds[layaway.id] ?? [];
                        return (
                          <Card
                            key={layaway.id}
                            className="layaway-account-card"
                          >
                            <CardContent>
                              <div className="layaway-account-heading">
                                <span>
                                  <strong>{layaway.originalTicketId}</strong>
                                  <small>{layaway.createdAt}</small>
                                </span>
                                <span>
                                  <small>SALDO ACTUAL</small>
                                  <strong>
                                    {formatCurrency(layaway.balanceDue)}
                                  </strong>
                                </span>
                                <Badge
                                  variant={
                                    layaway.status === "PAID"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {layaway.status === "PAID"
                                    ? "LIQUIDADO"
                                    : isOverdue
                                      ? "+4 MESES"
                                      : "ACTIVO"}
                                </Badge>
                              </div>
                              <div className="layaway-products-summary">
                                {layaway.items.map((item) => (
                                  <span key={item.cartItemId}>
                                    {item.productName}: {item.deliveredQuantity}
                                    /{item.quantity} entregados
                                  </span>
                                ))}
                              </div>
                              {layaway.status === "ACTIVE" &&
                                willLiquidate &&
                                pendingDeliveryItems.length > 0 && (
                                  <div className="layaway-liquidation-delivery">
                                    <div>
                                      <span className="section-kicker">
                                        ENTREGA AL LIQUIDAR
                                      </span>
                                      <strong>
                                        Pregunta a la clienta qué productos recibe hoy
                                      </strong>
                                    </div>
                                    <div className="layaway-delivery-list">
                                      {pendingDeliveryItems.map((item) => {
                                        const selected =
                                          selectedDeliveryIds.includes(
                                            item.cartItemId,
                                          );
                                        return (
                                          <button
                                            key={item.cartItemId}
                                            type="button"
                                            className={selected ? "is-selected" : ""}
                                            aria-pressed={selected}
                                            onClick={() =>
                                              setLayawayDeliveryIds((current) => ({
                                                ...current,
                                                [layaway.id]: selected
                                                  ? selectedDeliveryIds.filter(
                                                      (id) => id !== item.cartItemId,
                                                    )
                                                  : [
                                                      ...selectedDeliveryIds,
                                                      item.cartItemId,
                                                    ],
                                              }))
                                            }
                                          >
                                            <span>
                                              <strong>{item.productName}</strong>
                                              <small>
                                                {item.quantity - item.deliveredQuantity} pendiente(s) · {layaway.branch}
                                              </small>
                                            </span>
                                            <Badge variant={selected ? "default" : "outline"}>
                                              {selected ? "ENTREGAR HOY" : "MANTENER PENDIENTE"}
                                            </Badge>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              <div className="layaway-payment-history">
                                {layaway.payments.map((payment) => (
                                  <div key={payment.id}>
                                    <span>
                                      <strong>{payment.folio}</strong>
                                      <small>{payment.createdAt}</small>
                                    </span>
                                    <span>
                                      {paymentLabel(payment.methodId)} ·{" "}
                                      <strong>
                                        {formatCurrency(payment.amount)}
                                      </strong>
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {layaway.status === "ACTIVE" && (
                                <div className="layaway-payment-form">
                                  <div className="field-stack">
                                    <Label>Método de pago</Label>
                                    <Select
                                      value={selectedMethod}
                                      onValueChange={(methodId) =>
                                        setLayawayMethods((current) => ({
                                          ...current,
                                          [layaway.id]: methodId,
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {paymentMethods
                                          .filter((method) => method.active)
                                          .map((method) => (
                                            <SelectItem
                                              key={method.id}
                                              value={method.id}
                                            >
                                              {method.label}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="field-stack">
                                    <Label>Monto del abono</Label>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      max={layaway.balanceDue}
                                      step="0.01"
                                      value={enteredAmount}
                                      onChange={(event) =>
                                        setLayawayAmounts((current) => ({
                                          ...current,
                                          [layaway.id]: Number(
                                            event.target.value,
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!selectedMethod}
                                    onClick={() =>
                                      onRegisterLayawayPayment(
                                        layaway.id,
                                        enteredAmount,
                                        selectedMethod,
                                        authorizedSeller.id,
                                        willLiquidate
                                          ? selectedDeliveryIds
                                          : [],
                                      )
                                    }
                                  >
                                    Registrar abono
                                  </Button>
                                  <Button
                                    type="button"
                                    disabled={!selectedMethod}
                                    onClick={() =>
                                      onRegisterLayawayPayment(
                                        layaway.id,
                                        layaway.balanceDue,
                                        selectedMethod,
                                        authorizedSeller.id,
                                        selectedDeliveryIds,
                                      )
                                    }
                                  >
                                    Liquidar saldo
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  <div className="seller-client-ticket-history">
                    {clientTicketPagination.paginatedItems.map((ticket) => (
                      <div key={ticket.id}>
                        <span>
                          <strong>{ticket.id}</strong>
                          <small>{ticket.createdAt}</small>
                        </span>
                        <Badge variant="outline">
                          {paymentStatusLabels[ticket.paymentStatus]}
                        </Badge>
                        <span>
                          <strong>{formatCurrency(ticket.total)}</strong>
                          <small>
                            Saldo {formatCurrency(ticket.balanceDue)}
                          </small>
                        </span>
                        <button
                          type="button"
                          onClick={() => onPreviewTicket(ticket)}
                          aria-label={`Visualizar ticket ${ticket.id}`}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    ))}
                    {selectedClientTickets.length === 0 && (
                      <p>Esta clienta todavía no tiene historial de tickets.</p>
                    )}
                  </div>
                  <HistoryPagination
                    total={selectedClientTickets.length}
                    page={clientTicketPagination.page}
                    pageSize={clientTicketPagination.pageSize}
                    pageCount={clientTicketPagination.pageCount}
                    onPageChange={clientTicketPagination.setPage}
                    onPageSizeChange={clientTicketPagination.setPageSize}
                  />
                </>
              ) : (
                <div className="seller-client-empty">
                  <UsersRound size={30} />
                  <h2>Selecciona un cliente</h2>
                  <p>
                    Podrás consultar información, pagos, apartados y tickets de
                    su historial.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
