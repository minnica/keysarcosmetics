import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  CalendarHeart,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Gift,
  Landmark,
  LockKeyhole,
  Percent,
  PlusCircle,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type {
  AppointmentDraft,
  CartItem,
  CourtesyPackage,
  CourtesySettings,
  Client,
  ClientField,
  ClientSourceOption,
  NewClientDraft,
  PaymentMethod,
  PaymentEntry,
  PaymentMethodOption,
  PaymentStatus,
  RequiredClientFields,
  Seller,
  SellerSplit,
  TicketSellerSale,
} from "../types";

type ClientMode = "search" | "new";
type SplitMode = "amount" | "percent";
type CheckoutStep = 1 | 2 | 3 | 4;
type AppointmentAnswer = "" | "YES" | "NO";
const cardAndBankOptions = [
  "Visa",
  "Mastercard",
  "American Express",
  "BBVA",
  "Banamex",
  "Santander",
  "Banorte",
  "HSBC",
  "Mercado Pago",
  "Otro banco",
];

export interface CheckoutResult {
  client: Client;
  createdClient: boolean;
  splits: SellerSplit[];
  sellerSummary: string;
  paymentMethod: PaymentMethod;
  payments: PaymentEntry[];
  sellerSales: TicketSellerSale[];
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  appointments: AppointmentDraft[];
  deliveredCartItemIds: string[];
}

interface CheckoutDialogProps {
  open: boolean;
  total: number;
  discountAmount: number;
  cart: CartItem[];
  clients: Client[];
  sellers: Seller[];
  paymentMethods: PaymentMethodOption[];
  branches: string[];
  sourceOptions: ClientSourceOption[];
  requiredFields: RequiredClientFields;
  courtesySettings: CourtesySettings;
  isMasterCode: (code: string) => boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: CheckoutResult) => void;
}

const emptyClient: NewClientDraft = {
  firstName: "",
  lastName: "",
  birthday: "",
  gender: "",
  phone: "",
  whatsapp: "",
  source: "",
  companyName: "",
};

const clientFieldLabels: Record<ClientField, string> = {
  firstName: "Nombre",
  lastName: "Apellido",
  birthday: "Cumpleaños",
  gender: "Género",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  source: "Procedencia",
  companyName: "Empresa asignada",
};

const appointmentTimeSets = [
  ["10:00", "11:30", "13:00", "16:00", "18:30"],
  ["09:30", "12:00", "14:30", "17:00", "19:00"],
  ["10:30", "12:30", "15:00", "17:30", "19:30"],
] as const;

const nextSessionServices = [
  "Facial de seguimiento",
  "Masaje",
  "Valoración de piel",
  "Seguimiento de tratamiento",
];

const courtesyPackages: Record<
  CourtesyPackage,
  { label: string; services: string[] }
> = {
  FACIAL: { label: "Facial · 1 cortesía", services: ["Facial de cortesía"] },
  BODY: {
    label: "Corporal · 1 cortesía",
    services: ["Corporal de cortesía"],
  },
  DOUBLE_FACIAL: {
    label: "Doble facial · 2 cortesías",
    services: ["Facial de cortesía", "Facial de cortesía"],
  },
  DOUBLE_BODY: {
    label: "Doble corporal · 2 cortesías",
    services: ["Corporal de cortesía", "Corporal de cortesía"],
  },
  MIXED: {
    label: "Mixto · facial + corporal",
    services: ["Facial de cortesía", "Corporal de cortesía"],
  },
};

function createEvenSplit(ids: string[], mode: SplitMode, total: number) {
  if (ids.length === 0) return {};
  const target = mode === "amount" ? total : 100;
  const base = Math.floor((target / ids.length) * 100) / 100;
  return ids.reduce<Record<string, number>>((accumulator, id, index) => {
    accumulator[id] =
      index === ids.length - 1 ? target - base * (ids.length - 1) : base;
    return accumulator;
  }, {});
}

export function CheckoutDialog({
  open,
  total,
  discountAmount,
  cart,
  clients,
  sellers,
  paymentMethods,
  branches,
  sourceOptions,
  requiredFields,
  courtesySettings,
  isMasterCode,
  onOpenChange,
  onComplete,
}: CheckoutDialogProps) {
  const activeSellers = useMemo(
    () => sellers.filter((seller) => seller.active),
    [sellers],
  );
  const appointmentBranches = useMemo(
    () =>
      branches.map((name, index) => ({
        name,
        times:
          appointmentTimeSets[index % appointmentTimeSets.length] ??
          appointmentTimeSets[0],
      })),
    [branches],
  );
  const [clientMode, setClientMode] = useState<ClientMode>("search");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClient, setNewClient] = useState<NewClientDraft>(emptyClient);
  const [splitMode, setSplitMode] = useState<SplitMode>("amount");
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);
  const [splitValues, setSplitValues] = useState<Record<string, number>>({});
  const [clientOwnerId, setClientOwnerId] = useState("");
  const [ownershipMasterOpen, setOwnershipMasterOpen] = useState(false);
  const [ownershipMasterCode, setOwnershipMasterCode] = useState("");
  const [ownershipAuthorized, setOwnershipAuthorized] = useState(false);
  const [showAdditionalSellers, setShowAdditionalSellers] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [deliveredCartItemIds, setDeliveredCartItemIds] = useState<string[]>(
    [],
  );
  const [courtesyPackage, setCourtesyPackage] =
    useState<CourtesyPackage>(courtesySettings.defaultPackage);
  const [courtesyDate, setCourtesyDate] = useState("");
  const [courtesyBranch, setCourtesyBranch] = useState("");
  const [courtesyTime, setCourtesyTime] = useState("");
  const [nextSessionAnswer, setNextSessionAnswer] =
    useState<AppointmentAnswer>("");
  const [nextSessionService, setNextSessionService] = useState<string>(
    "Facial de seguimiento",
  );
  const [nextSessionDate, setNextSessionDate] = useState("");
  const [nextSessionBranch, setNextSessionBranch] = useState("");
  const [nextSessionTime, setNextSessionTime] = useState("");

  useEffect(() => {
    if (!open) return;
    const firstSellerId = activeSellers[0]?.id ?? "";
    const firstPaymentMethod = paymentMethods.find((method) => method.active);
    setClientMode("search");
    setCheckoutStep(1);
    setClientSearch("");
    setSelectedClientId("");
    setNewClient(emptyClient);
    setSplitMode("amount");
    setSelectedSellerIds(firstSellerId ? [firstSellerId] : []);
    setSplitValues(firstSellerId ? { [firstSellerId]: total } : {});
    setClientOwnerId(firstSellerId);
    setOwnershipMasterOpen(false);
    setOwnershipMasterCode("");
    setOwnershipAuthorized(false);
    setShowAdditionalSellers(false);
    setSellerSearch("");
    setDeliveredCartItemIds([]);
    setCourtesyPackage(courtesySettings.defaultPackage);
    setCourtesyDate("");
    setCourtesyBranch("");
    setCourtesyTime("");
    setNextSessionAnswer("");
    setNextSessionService("Facial de seguimiento");
    setNextSessionDate("");
    setNextSessionBranch("");
    setNextSessionTime("");
    setPayments(
      firstPaymentMethod
        ? [
            {
              id: `payment-${Date.now()}`,
              methodId: firstPaymentMethod.id,
              amount: total,
            },
          ]
        : [],
    );
  }, [activeSellers, courtesySettings.defaultPackage, open, paymentMethods, total]);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLocaleLowerCase("es-MX");
    if (!query) return [];
    return clients.filter((client) => {
      const fullName =
        `${client.firstName} ${client.lastName}`.toLocaleLowerCase("es-MX");
      return (
        fullName.includes(query) ||
        client.phone.replaceAll(" ", "").includes(query.replaceAll(" ", ""))
      );
    });
  }, [clientSearch, clients]);
  const hasClientSearch = clientSearch.trim().length > 0;

  const selectedClient = clients.find(
    (client) => client.id === selectedClientId,
  );
  const splitTarget = splitMode === "amount" ? total : 100;
  const splitTotal = selectedSellerIds.reduce(
    (sum, sellerId) => sum + (splitValues[sellerId] ?? 0),
    0,
  );
  const splitIsValid = Math.abs(splitTotal - splitTarget) < 0.01;
  const isShared = selectedSellerIds.length > 1;
  const activeOwner = activeSellers.find(
    (seller) => seller.id === selectedClient?.ownerId,
  );
  const newClientOwner = activeSellers.find(
    (seller) => seller.id === clientOwnerId,
  );
  const selectedSourceOption = sourceOptions.find(
    (source) => source.id === newClient.source,
  );
  const clientHadInactiveOwner = Boolean(
    selectedClient?.ownerId && !activeOwner,
  );
  const clientIsCompanyLocked =
    clientMode === "search"
      ? Boolean(
          selectedClient &&
          (selectedClient.companyLocked || clientHadInactiveOwner),
        )
      : Boolean(selectedSourceOption?.locksCompany);
  const defaultSellerId =
    activeOwner?.id ?? (clientMode === "new" ? (newClientOwner?.id ?? "") : "");
  const normalizedSellerSearch = sellerSearch
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
  const sellerMatchesSearch = (seller: Seller) => {
    if (!normalizedSellerSearch) return true;
    const searchableSeller = `${seller.name} ${seller.alias}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-MX");
    return searchableSeller.includes(normalizedSellerSearch);
  };
  const matchingAdditionalSellers = activeSellers.filter(
    (seller) =>
      !selectedSellerIds.includes(seller.id) && sellerMatchesSearch(seller),
  );
  const visibleSellers = showAdditionalSellers
    ? activeSellers.filter(
        (seller) =>
          selectedSellerIds.includes(seller.id) || sellerMatchesSearch(seller),
      )
    : activeSellers.filter((seller) => selectedSellerIds.includes(seller.id));

  const missingNewClientFields = (
    Object.keys(requiredFields) as ClientField[]
  ).filter((field) => requiredFields[field] && !newClient[field].trim());
  const courtesyAppointmentIsValid =
    clientMode !== "new" || !courtesySettings.required ||
    Boolean(courtesyPackage && courtesyDate && courtesyBranch && courtesyTime);
  const clientIsValid =
    clientMode === "search"
      ? Boolean(selectedClient)
      : missingNewClientFields.length === 0 &&
        Boolean(newClient.source) &&
        Boolean(clientOwnerId) &&
        courtesyAppointmentIsValid &&
        (!clientIsCompanyLocked || Boolean(newClient.companyName.trim()));
  const ownershipIsValid =
    clientIsCompanyLocked ||
    (Boolean(clientOwnerId) && selectedSellerIds.includes(clientOwnerId));
  const normalizedPayments = payments.map((payment) => ({
    ...payment,
    amount: Math.max(0, payment.amount || 0),
  }));
  const totalReceived = normalizedPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  let remainingPayment = total;
  const appliedPayments = normalizedPayments
    .map((payment) => {
      const amount = Math.min(payment.amount, Math.max(0, remainingPayment));
      remainingPayment -= amount;
      return { ...payment, amount };
    })
    .filter((payment) => payment.amount > 0);
  const amountPaid = appliedPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const balanceDue = Math.max(0, total - amountPaid);
  const paymentStatus: PaymentStatus =
    balanceDue < 0.01 ? "PAID" : amountPaid > 0 ? "LAYAWAY" : "PENDING";
  const changeDue = Math.max(0, totalReceived - total);
  const paymentNeedsAuthorization = (methodId: string) => {
    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    const identity = `${methodId} ${method?.label ?? ""}`.toLocaleLowerCase("es-MX");
    return !identity.includes("cash") && !identity.includes("efectivo");
  };
  const paymentReferencesAreValid = appliedPayments.every(
    (payment) =>
      !paymentNeedsAuthorization(payment.methodId) ||
      (/^\d{4}$/.test(payment.authorizationCode ?? "") &&
        Boolean(payment.cardOrBank?.trim())),
  );
  const sellerStepIsValid =
    selectedSellerIds.length > 0 && splitIsValid && ownershipIsValid;
  const nextSessionIsValid =
    clientMode === "new"
      ? courtesyAppointmentIsValid
      : nextSessionAnswer === "NO" ||
        (nextSessionAnswer === "YES" &&
          Boolean(
            nextSessionService &&
            nextSessionDate &&
            nextSessionBranch &&
            nextSessionTime,
          ));
  const canComplete =
    clientIsValid &&
    sellerStepIsValid &&
    nextSessionIsValid &&
    payments.length > 0 &&
    paymentReferencesAreValid;
  const courtesyTimes =
    appointmentBranches.find((branch) => branch.name === courtesyBranch)
      ?.times ?? [];
  const nextSessionTimes =
    appointmentBranches.find((branch) => branch.name === nextSessionBranch)
      ?.times ?? [];

  const selectClient = (client: Client) => {
    setSelectedClientId(client.id);
    const owner = activeSellers.find((seller) => seller.id === client.ownerId);
    const preferredSellerId = owner?.id ?? activeSellers[0]?.id ?? "";
    const ids = preferredSellerId ? [preferredSellerId] : [];
    setSelectedSellerIds(ids);
    setSplitValues(createEvenSplit(ids, splitMode, total));
    setClientOwnerId(owner && !client.companyLocked ? preferredSellerId : "");
    setOwnershipMasterOpen(false);
    setOwnershipMasterCode("");
    setOwnershipAuthorized(false);
    setShowAdditionalSellers(false);
    setSellerSearch("");
  };

  const selectClientOwner = (sellerId: string) => {
    setClientOwnerId(sellerId);
    if (selectedSellerIds.includes(sellerId)) return;
    const nextIds = [...selectedSellerIds, sellerId];
    setSelectedSellerIds(nextIds);
    setSplitValues(createEvenSplit(nextIds, splitMode, total));
  };

  const authorizeOwnershipChange = () => {
    if (!isMasterCode(ownershipMasterCode)) {
      toast.error("Código master incorrecto.");
      return;
    }
    setOwnershipAuthorized(true);
    setOwnershipMasterOpen(false);
    setOwnershipMasterCode("");
    toast.success("Cambio de propietaria autorizado.");
  };

  const handleSellerToggle = (sellerId: string) => {
    const isSelected = selectedSellerIds.includes(sellerId);
    if (isSelected && sellerId === defaultSellerId && !ownershipAuthorized)
      return;
    const nextIds = isSelected
      ? selectedSellerIds.filter((id) => id !== sellerId)
      : [...selectedSellerIds, sellerId];
    if (nextIds.length === 0) return;
    setSelectedSellerIds(nextIds);
    setSplitValues(createEvenSplit(nextIds, splitMode, total));
    if (!clientIsCompanyLocked && !nextIds.includes(clientOwnerId)) {
      setClientOwnerId(nextIds[0] ?? "");
    }
  };

  const addPayment = () => {
    const activeMethods = paymentMethods.filter((method) => method.active);
    const method =
      activeMethods.find(
        (candidate) =>
          !payments.some((payment) => payment.methodId === candidate.id),
      ) ?? activeMethods[0];
    if (!method) return;
    setPayments((current) => [
      ...current,
      {
        id: `payment-${Date.now()}-${current.length}`,
        methodId: method.id,
        amount: balanceDue,
        authorizationCode: "",
        cardOrBank: "",
      },
    ]);
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    setSplitValues(createEvenSplit(selectedSellerIds, mode, total));
  };

  const handleComplete = () => {
    if (!canComplete) return;
    const ownerId = clientIsCompanyLocked
      ? null
      : isShared
        ? clientOwnerId
        : (selectedSellerIds[0] ?? null);
    const existingSellerIds = selectedClient?.saleSellerIds ?? [];
    const saleSellerIds = Array.from(
      new Set([...existingSellerIds, ...selectedSellerIds]),
    );
    const client: Client =
      clientMode === "search" && selectedClient
        ? { ...selectedClient, ownerId, saleSellerIds }
        : {
            id: `client-${Date.now()}`,
            registrationFolio: `CLI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
            registeredAtIso: new Date().toISOString(),
            ...newClient,
            ownerId,
            companyLocked: clientIsCompanyLocked,
            companyName: clientIsCompanyLocked
              ? newClient.companyName.trim()
              : "",
            source: newClient.source || "APPROACH",
            sourceLabel: selectedSourceOption?.label ?? "Abordaje",
            saleSellerIds,
          };
    const selectedSellers = selectedSellerIds
      .map((sellerId) => sellers.find((seller) => seller.id === sellerId))
      .filter((seller): seller is Seller => Boolean(seller));
    const appointments: AppointmentDraft[] = [
      ...(clientMode === "new" && courtesySettings.required
        ? courtesyPackages[courtesyPackage].services.map((service) => ({
            kind: "COURTESY" as const,
            service,
            date: courtesyDate,
            branch: courtesyBranch,
            time: courtesyTime,
          }))
        : []),
      ...(clientMode === "search" && nextSessionAnswer === "YES"
        ? [
            {
              kind: "NEXT_SESSION" as const,
              service: nextSessionService,
              date: nextSessionDate,
              branch: nextSessionBranch,
              time: nextSessionTime,
            },
          ]
        : clientMode === "search" && nextSessionAnswer === "NO"
          ? [
              {
                kind: "NO_APPOINTMENT" as const,
                service: "Sin próxima cita facial",
                date: new Intl.DateTimeFormat("en-CA", {
                  timeZone: "America/Mexico_City",
                }).format(new Date()),
                branch: branches[0] ?? "Sin sucursal",
                time: "Sin horario",
              },
            ]
          : []),
    ];

    onComplete({
      client,
      createdClient: clientMode === "new",
      splits: selectedSellerIds.map((sellerId) => ({
        sellerId,
        value: splitValues[sellerId] ?? 0,
      })),
      sellerSummary: selectedSellers.map((seller) => seller.name).join(" / "),
      paymentMethod:
        appliedPayments[0]?.methodId ?? paymentMethods[0]?.id ?? "",
      payments: appliedPayments,
      sellerSales: selectedSellerIds.map((sellerId) => {
        const seller = sellers.find((candidate) => candidate.id === sellerId);
        const splitValue = splitValues[sellerId] ?? 0;
        return {
          sellerId,
          sellerName: seller?.name ?? "Vendedor",
          amount:
            splitMode === "amount" ? splitValue : total * (splitValue / 100),
        };
      }),
      amountPaid,
      balanceDue,
      paymentStatus,
      appointments,
      deliveredCartItemIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="checkout-dialog sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>Finalizar ticket</DialogTitle>
          <DialogDescription>
            Asigna cliente, vendedores y citas antes de registrar el cobro.
          </DialogDescription>
        </DialogHeader>

        <div className="checkout-total-banner">
          <span>
            TOTAL DEL TICKET
            {discountAmount > 0 && (
              <small>
                Descuento promocional -{formatCurrency(discountAmount)}
              </small>
            )}
          </span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <nav
          className="checkout-stepper"
          aria-label="Pasos para finalizar ticket"
        >
          <button
            type="button"
            className={checkoutStep === 1 ? "is-active" : "is-complete"}
            onClick={() => setCheckoutStep(1)}
            aria-current={checkoutStep === 1 ? "step" : undefined}
          >
            <span>1</span>
            <strong>Cliente</strong>
          </button>
          <button
            type="button"
            className={
              checkoutStep === 2
                ? "is-active"
                : checkoutStep > 2
                  ? "is-complete"
                  : ""
            }
            onClick={() => setCheckoutStep(2)}
            disabled={!clientIsValid}
            aria-current={checkoutStep === 2 ? "step" : undefined}
          >
            <span>2</span>
            <strong>Vendedores</strong>
          </button>
          <button
            type="button"
            className={
              checkoutStep === 3
                ? "is-active"
                : checkoutStep > 3
                  ? "is-complete"
                  : ""
            }
            onClick={() => setCheckoutStep(3)}
            disabled={!clientIsValid || !sellerStepIsValid}
            aria-current={checkoutStep === 3 ? "step" : undefined}
          >
            <span>3</span>
            <strong>Citas</strong>
          </button>
          <button
            type="button"
            className={checkoutStep === 4 ? "is-active" : ""}
            onClick={() => setCheckoutStep(4)}
            disabled={
              !clientIsValid || !sellerStepIsValid || !nextSessionIsValid
            }
            aria-current={checkoutStep === 4 ? "step" : undefined}
          >
            <span>4</span>
            <strong>Cobro</strong>
          </button>
        </nav>

        <div className="checkout-columns">
          {checkoutStep === 1 && (
            <section className="checkout-section checkout-step-section">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">01 · CLIENTE</span>
                  <h3>Datos de la clienta</h3>
                </div>
                <UsersRound size={22} />
              </div>

              <div className="segmented-control">
                <button
                  type="button"
                  className={clientMode === "search" ? "is-active" : ""}
                  onClick={() => setClientMode("search")}
                >
                  <Search size={16} /> Buscar cliente
                </button>
                <button
                  type="button"
                  className={clientMode === "new" ? "is-active" : ""}
                  onClick={() => setClientMode("new")}
                >
                  <UserPlus size={16} /> Nuevo cliente
                </button>
              </div>

              {clientMode === "search" ? (
                <div className="client-search-panel">
                  <div className="search-input-wrap">
                    <Search size={17} />
                    <Input
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Nombre o teléfono"
                      aria-label="Buscar cliente por nombre o teléfono"
                    />
                  </div>
                  {hasClientSearch && (
                    <div className="client-results">
                      {filteredClients.map((client) => {
                        const isSelected = selectedClientId === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            className={`client-result ${isSelected ? "is-selected" : ""}`}
                            onClick={() => selectClient(client)}
                          >
                            <span className="client-avatar">
                              {client.firstName.charAt(0)}
                              {client.lastName.charAt(0)}
                            </span>
                            <span>
                              <strong>
                                {client.firstName} {client.lastName}
                              </strong>
                              <small>
                                {client.phone} · {client.sourceLabel}
                              </small>
                              <small>
                                {client.companyLocked
                                  ? `Cartera: ${client.companyName}`
                                  : (sellers.find(
                                      (seller) => seller.id === client.ownerId,
                                    )?.name ?? "Cartera de la empresa")}
                              </small>
                            </span>
                            {isSelected && <CheckCircle2 size={19} />}
                          </button>
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <p className="empty-inline">
                          No encontramos coincidencias.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="new-client-grid">
                  <div className="field-stack">
                    <Label htmlFor="client-first-name">
                      Nombre {requiredFields.firstName && <em>*</em>}
                    </Label>
                    <Input
                      id="client-first-name"
                      value={newClient.firstName}
                      onChange={(event) =>
                        setNewClient((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-last-name">
                      Apellido {requiredFields.lastName && <em>*</em>}
                    </Label>
                    <Input
                      id="client-last-name"
                      value={newClient.lastName}
                      onChange={(event) =>
                        setNewClient((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-birthday">
                      Cumpleaños {requiredFields.birthday && <em>*</em>}
                    </Label>
                    <DatePicker
                      id="client-birthday"
                      value={newClient.birthday}
                      onChange={(birthday) =>
                        setNewClient((current) => ({ ...current, birthday }))
                      }
                      placeholder="Selecciona cumpleaños"
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-gender">
                      Género {requiredFields.gender && <em>*</em>}
                    </Label>
                    <Select
                      value={newClient.gender}
                      onValueChange={(gender) =>
                        setNewClient((current) => ({ ...current, gender }))
                      }
                    >
                      <SelectTrigger id="client-gender">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mujer">Mujer</SelectItem>
                        <SelectItem value="Hombre">Hombre</SelectItem>
                        <SelectItem value="No binario">No binario</SelectItem>
                        <SelectItem value="Prefiero no decir">
                          Prefiero no decir
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-phone">
                      Teléfono {requiredFields.phone && <em>*</em>}
                    </Label>
                    <Input
                      id="client-phone"
                      type="tel"
                      value={newClient.phone}
                      onChange={(event) =>
                        setNewClient((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-whatsapp">
                      WhatsApp {requiredFields.whatsapp && <em>*</em>}
                    </Label>
                    <Input
                      id="client-whatsapp"
                      type="tel"
                      value={newClient.whatsapp}
                      onChange={(event) =>
                        setNewClient((current) => ({
                          ...current,
                          whatsapp: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-source">
                      Procedencia <em>*</em>
                    </Label>
                    <Select
                      value={newClient.source}
                      onValueChange={(source) =>
                        setNewClient((current) => ({
                          ...current,
                          source,
                          companyName:
                            sourceOptions.find((item) => item.id === source)
                              ?.locksCompany
                              ? current.companyName || "Keysar Cosmetics"
                              : "",
                        }))
                      }
                    >
                      <SelectTrigger id="client-source">
                        <SelectValue placeholder="Selecciona procedencia" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceOptions
                          .filter((source) => source.active)
                          .map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.label}
                          </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {clientIsCompanyLocked && (
                    <div className="field-stack company-link-field">
                      <Label htmlFor="client-company">
                        Empresa asignada <em>*</em>
                      </Label>
                      <div className="company-input-wrap">
                        <Building2 size={16} />
                        <Input
                          id="client-company"
                          value={newClient.companyName}
                          onChange={(event) =>
                            setNewClient((current) => ({
                              ...current,
                              companyName: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <small>
                        Leads y redes sociales permanecen ligados a esta
                        empresa.
                      </small>
                    </div>
                  )}
                  <div className="field-stack new-client-grid-span">
                    <Label htmlFor="new-client-fixed-seller">
                      Vendedor fijo <em>*</em>
                    </Label>
                    <Select
                      value={clientOwnerId}
                      onValueChange={selectClientOwner}
                    >
                      <SelectTrigger id="new-client-fixed-seller">
                        <SelectValue placeholder="Selecciona vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <small className="fixed-seller-note">
                      Se guardará como vendedor asignado y aparecerá por default
                      en sus próximas ventas.
                    </small>
                  </div>
                  {courtesySettings.required && <div className="courtesy-appointment-panel new-client-grid-span">
                    <div className="courtesy-appointment-heading">
                      <span>
                        <Gift size={18} />
                      </span>
                      <div>
                        <strong>Cita de bienvenida incluida</strong>
                        <small>
                          Elige una o dos cortesías. Nunca se permiten más de
                          dos servicios de regalo.
                        </small>
                      </div>
                    </div>
                    <div className="appointment-fields-grid">
                      <div className="field-stack">
                        <Label htmlFor="courtesy-service">
                          Paquete de cortesía <em>*</em>
                        </Label>
                        <Select
                          value={courtesyPackage}
                          onValueChange={(value) =>
                            setCourtesyPackage(value as CourtesyPackage)
                          }
                        >
                          <SelectTrigger id="courtesy-service">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(courtesyPackages).filter(([value]) => courtesySettings.enabledPackages.includes(value as CourtesyPackage)).map(
                              ([value, option]) => (
                                <SelectItem key={value} value={value}>
                                  {option.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="courtesy-date">
                          Día de la cita <em>*</em>
                        </Label>
                        <DatePicker
                          id="courtesy-date"
                          value={courtesyDate}
                          onChange={setCourtesyDate}
                          placeholder="Selecciona fecha"
                        />
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="courtesy-branch">
                          Sucursal <em>*</em>
                        </Label>
                        <Select
                          value={courtesyBranch}
                          onValueChange={(branch) => {
                            setCourtesyBranch(branch);
                            setCourtesyTime("");
                          }}
                        >
                          <SelectTrigger id="courtesy-branch">
                            <SelectValue placeholder="Selecciona sucursal" />
                          </SelectTrigger>
                          <SelectContent>
                            {appointmentBranches.map((branch) => (
                              <SelectItem key={branch.name} value={branch.name}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="courtesy-time">
                          Horario disponible <em>*</em>
                        </Label>
                        <Select
                          value={courtesyTime}
                          onValueChange={setCourtesyTime}
                          disabled={!courtesyBranch}
                        >
                          <SelectTrigger id="courtesy-time">
                            <SelectValue placeholder="Selecciona horario" />
                          </SelectTrigger>
                          <SelectContent>
                            {courtesyTimes.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time} h
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!courtesyAppointmentIsValid && (
                      <p>
                        Selecciona fecha, sucursal y un horario disponible para
                        registrar la cortesía.
                      </p>
                    )}
                  </div>}
                  {missingNewClientFields.length > 0 && (
                    <p className="form-hint new-client-grid-span">
                      Obligatorios pendientes:{" "}
                      {missingNewClientFields
                        .map((field) => clientFieldLabels[field])
                        .join(", ")}
                      .
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {checkoutStep === 2 && (
            <section className="checkout-section checkout-step-section">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">02 · VENDEDORES</span>
                  <h3>División de venta</h3>
                </div>
                <div className="split-mode-switch">
                  <button
                    type="button"
                    className={splitMode === "amount" ? "is-active" : ""}
                    onClick={() => handleSplitModeChange("amount")}
                    aria-label="Dividir por importe"
                  >
                    <DollarSign size={16} />
                  </button>
                  <button
                    type="button"
                    className={splitMode === "percent" ? "is-active" : ""}
                    onClick={() => handleSplitModeChange("percent")}
                    aria-label="Dividir por porcentaje"
                  >
                    <Percent size={16} />
                  </button>
                </div>
              </div>

              {showAdditionalSellers && (
                <div className="seller-search-filter">
                  <Search size={16} aria-hidden="true" />
                  <Input
                    value={sellerSearch}
                    onChange={(event) => setSellerSearch(event.target.value)}
                    placeholder="Buscar vendedor por nombre o alias…"
                    aria-label="Buscar vendedor por nombre o alias"
                    autoFocus
                  />
                  <small>
                    {matchingAdditionalSellers.length}{" "}
                    {matchingAdditionalSellers.length === 1
                      ? "vendedor disponible"
                      : "vendedores disponibles"}
                  </small>
                </div>
              )}

              <div className="seller-list">
                {visibleSellers.map((seller) => {
                  const isSelected = selectedSellerIds.includes(seller.id);
                  return (
                    <div
                      key={seller.id}
                      className={`seller-split-row ${isSelected ? "is-selected" : ""}`}
                    >
                      <button
                        type="button"
                        className="seller-selector"
                        onClick={() => handleSellerToggle(seller.id)}
                        aria-pressed={isSelected}
                      >
                        <span className="seller-avatar">{seller.initials}</span>
                        <span>
                          <strong>{seller.name}</strong>
                          <small>
                            {seller.id === defaultSellerId
                              ? "Vendedor asignado a la clienta"
                              : isSelected
                                ? "Participa en la venta"
                                : "Disponible para añadir"}
                          </small>
                          {seller.alias && (
                            <small className="seller-search-alias">
                              Alias: {seller.alias}
                            </small>
                          )}
                        </span>
                      </button>
                      {isSelected && (
                        <div className="split-value-input">
                          <span>{splitMode === "amount" ? "$" : "%"}</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={splitValues[seller.id] ?? 0}
                            onChange={(event) =>
                              setSplitValues((current) => ({
                                ...current,
                                [seller.id]: Number(event.target.value),
                              }))
                            }
                            aria-label={`Participación de ${seller.name}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {showAdditionalSellers &&
                  normalizedSellerSearch &&
                  matchingAdditionalSellers.length === 0 && (
                    <p className="seller-search-empty">
                      No se encontraron vendedores con ese nombre o alias.
                    </p>
                  )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="add-sellers-button"
                onClick={() => {
                  setShowAdditionalSellers((current) => !current);
                  if (showAdditionalSellers) setSellerSearch("");
                }}
              >
                <PlusCircle size={15} />
                {showAdditionalSellers
                  ? "Ocultar vendedores disponibles"
                  : "Añadir más vendedores a la venta"}
              </Button>

              <div
                className={`split-balance ${splitIsValid ? "is-valid" : "is-invalid"}`}
              >
                <span>
                  Asignado:{" "}
                  {splitMode === "amount"
                    ? formatCurrency(splitTotal)
                    : `${splitTotal.toFixed(2)}%`}
                </span>
                <strong>
                  {splitIsValid
                    ? "División completa"
                    : `Faltan ${splitMode === "amount" ? formatCurrency(splitTarget - splitTotal) : `${(splitTarget - splitTotal).toFixed(2)}%`}`}
                </strong>
              </div>

              {clientIsCompanyLocked &&
                (selectedClient || newClient.source) && (
                  <div className="ownership-panel company-owned-panel">
                    <Label>Cartera asignada a empresa</Label>
                    <div>
                      <Building2 size={16} />
                      <strong>
                        {selectedClient?.companyName || newClient.companyName}
                        {!selectedClient?.companyName &&
                          !newClient.companyName &&
                          "Keysar Cosmetics"}
                      </strong>
                    </div>
                    <p>
                      La procedencia de lead o redes sociales mantiene esta
                      clienta ligada a la empresa, aunque participen varios
                      vendedores.
                    </p>
                  </div>
                )}

              {!clientIsCompanyLocked &&
                (activeOwner || (clientMode === "new" && newClientOwner)) &&
                !ownershipAuthorized && (
                  <div className="ownership-panel ownership-locked-panel">
                    <Label>Propietaria asignada</Label>
                    <div className="locked-owner-row">
                      <span className="seller-avatar">
                        {(activeOwner ?? newClientOwner)?.initials}
                      </span>
                      <div>
                        <strong>{(activeOwner ?? newClientOwner)?.name}</strong>
                        <small>
                          {clientMode === "new"
                            ? "Vendedor fijo seleccionado durante el alta."
                            : "No se puede modificar sin usuario master."}
                        </small>
                      </div>
                      <LockKeyhole size={16} />
                    </div>
                    {clientMode === "search" &&
                      (!ownershipMasterOpen ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOwnershipMasterOpen(true)}
                        >
                          <ShieldCheck size={15} /> Cambiar con usuario master
                        </Button>
                      ) : (
                        <div className="ownership-master-gate">
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={ownershipMasterCode}
                            onChange={(event) =>
                              setOwnershipMasterCode(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter")
                                authorizeOwnershipChange();
                            }}
                            placeholder="Código master"
                            aria-label="Código master para cambiar propietaria"
                          />
                          <Button
                            type="button"
                            onClick={authorizeOwnershipChange}
                            disabled={ownershipMasterCode.length !== 4}
                          >
                            Autorizar
                          </Button>
                          <small>Mock: 2468</small>
                        </div>
                      ))}
                  </div>
                )}

              {!clientIsCompanyLocked &&
                clientMode === "search" &&
                (!activeOwner || ownershipAuthorized) && (
                  <div className="ownership-panel">
                    <Label htmlFor="client-owner">
                      {ownershipAuthorized
                        ? "Selecciona la nueva propietaria"
                        : selectedClient
                          ? "Esta clienta no tiene propietaria. Asígnala a:"
                          : "Asignar la nueva clienta a:"}
                    </Label>
                    <Select
                      value={clientOwnerId}
                      onValueChange={selectClientOwner}
                    >
                      <SelectTrigger id="client-owner">
                        <SelectValue placeholder="Selecciona vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p>
                      El vendedor seleccionado se agrega automáticamente a la
                      división de la venta.
                    </p>
                  </div>
                )}
            </section>
          )}

          {checkoutStep === 3 && (
            <section className="checkout-section checkout-step-section appointment-step-section">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">03 · CITAS</span>
                  <h3>Próxima sesión de la clienta</h3>
                </div>
                <CalendarHeart size={22} />
              </div>

              {clientMode === "new" && courtesySettings.required && (
                <div className="courtesy-confirmation-card">
                  <Gift size={19} />
                  <span>
                    <small>CORTESÍA DE BIENVENIDA</small>
                    <strong>{courtesyPackages[courtesyPackage].label}</strong>
                    <p>
                      {courtesyDate} · {courtesyBranch} · {courtesyTime} h
                    </p>
                  </span>
                  <Badge variant="outline">
                    {courtesyPackages[courtesyPackage].services.length} REGALO
                    {courtesyPackages[courtesyPackage].services.length === 1
                      ? ""
                      : "S"}{" "}
                    $0
                  </Badge>
                </div>
              )}

              {clientMode === "search" ? (
                <div className="next-session-question">
                  <div>
                    <strong>
                      ¿La clienta ya cuenta con cita para su próxima sesión?
                    </strong>
                    <small>
                      La respuesta es obligatoria antes de continuar al cobro.
                    </small>
                  </div>
                  <div className="appointment-answer-buttons">
                    <button
                      type="button"
                      className={
                        nextSessionAnswer === "YES" ? "is-active" : ""
                      }
                      onClick={() => setNextSessionAnswer("YES")}
                    >
                      Sí, agendar ahora
                    </button>
                    <button
                      type="button"
                      className={
                        nextSessionAnswer === "NO" ? "is-active" : ""
                      }
                      onClick={() => setNextSessionAnswer("NO")}
                    >
                      No por ahora
                    </button>
                  </div>
                </div>
              ) : courtesySettings.required ? (
                <div className="appointment-declined-note">
                  <CheckCircle2 size={18} />
                  <span>
                    <strong>Cita registrada durante el alta</strong>
                    <small>
                      No es necesario responder de nuevo. La cortesía se
                      conservará en el ticket y en el historial de la clienta.
                    </small>
                  </span>
                </div>
              ) : null}

              {clientMode === "search" && nextSessionAnswer === "YES" && (
                <div className="next-session-scheduler">
                  <div className="appointment-scheduler-heading">
                    <MapPin size={18} />
                    <div>
                      <strong>Agregar próxima cita</strong>
                      <small>
                        Selecciona servicio, fecha, sucursal y horario
                        disponible.
                      </small>
                    </div>
                  </div>
                  <div className="appointment-fields-grid">
                    <div className="field-stack">
                      <Label htmlFor="next-session-service">Servicio</Label>
                      <Select
                        value={nextSessionService}
                        onValueChange={setNextSessionService}
                      >
                        <SelectTrigger id="next-session-service">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {nextSessionServices.map((service) => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="next-session-date">Día</Label>
                      <DatePicker
                        id="next-session-date"
                        value={nextSessionDate}
                        onChange={setNextSessionDate}
                        placeholder="Selecciona fecha"
                      />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="next-session-branch">Sucursal</Label>
                      <Select
                        value={nextSessionBranch}
                        onValueChange={(branch) => {
                          setNextSessionBranch(branch);
                          setNextSessionTime("");
                        }}
                      >
                        <SelectTrigger id="next-session-branch">
                          <SelectValue placeholder="Selecciona sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                          {appointmentBranches.map((branch) => (
                            <SelectItem key={branch.name} value={branch.name}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="next-session-time">
                        Horario disponible
                      </Label>
                      <Select
                        value={nextSessionTime}
                        onValueChange={setNextSessionTime}
                        disabled={!nextSessionBranch}
                      >
                        <SelectTrigger id="next-session-time">
                          <SelectValue placeholder="Selecciona horario" />
                        </SelectTrigger>
                        <SelectContent>
                          {nextSessionTimes.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time} h
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {clientMode === "search" && nextSessionAnswer === "NO" && (
                <div className="appointment-declined-note">
                  <CheckCircle2 size={18} />
                  <span>
                    <strong>Respuesta registrada</strong>
                    <small>
                      El ticket finalizará sin una próxima sesión adicional.
                    </small>
                  </span>
                </div>
              )}
            </section>
          )}

          {checkoutStep === 4 && (
            <section className="checkout-section payment-section checkout-step-section">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">04 · COBRO</span>
                  <h3>Método y monto recibido</h3>
                </div>
                <WalletCards size={22} />
              </div>

              <div className="multi-payment-list">
                {payments.map((payment, index) => {
                  const method = paymentMethods.find(
                    (candidate) => candidate.id === payment.methodId,
                  );
                  const MethodIcon =
                    payment.methodId === "CASH"
                      ? Banknote
                      : payment.methodId === "CARD"
                        ? CreditCard
                        : payment.methodId === "TRANSFER"
                          ? Landmark
                          : WalletCards;
                  const requiresAuthorization = paymentNeedsAuthorization(
                    payment.methodId,
                  );
                  return (
                    <div className="multi-payment-row" key={payment.id}>
                      <span className="payment-row-number">{index + 1}</span>
                      <div className="payment-method-select">
                        <MethodIcon size={17} />
                        <Select
                          value={payment.methodId}
                          onValueChange={(methodId) =>
                            setPayments((current) =>
                              current.map((item) =>
                                item.id === payment.id
                                  ? {
                                      ...item,
                                      methodId,
                                      authorizationCode: "",
                                      cardOrBank: "",
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label={`Método de pago ${index + 1}`}
                          >
                            <SelectValue>{method?.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods
                              .filter((option) => option.active)
                              .map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="payment-amount-input">
                        <span>$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={payment.amount}
                          onChange={(event) =>
                            setPayments((current) =>
                              current.map((item) =>
                                item.id === payment.id
                                  ? {
                                      ...item,
                                      amount: Number(event.target.value),
                                    }
                                  : item,
                              ),
                            )
                          }
                          aria-label={`Monto del pago ${index + 1}`}
                        />
                      </div>
                      {payments.length > 1 && (
                        <button
                          type="button"
                          className="remove-payment-button"
                          onClick={() =>
                            setPayments((current) =>
                              current.filter((item) => item.id !== payment.id),
                            )
                          }
                          aria-label={`Quitar pago ${index + 1}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      {requiresAuthorization && (
                        <div className="payment-reference-fields">
                          <div className="field-stack">
                            <Label>Tipo de tarjeta o banco</Label>
                            <Select
                              value={payment.cardOrBank ?? ""}
                              onValueChange={(cardOrBank) =>
                                setPayments((current) =>
                                  current.map((item) =>
                                    item.id === payment.id
                                      ? { ...item, cardOrBank }
                                      : item,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger
                                aria-label={`Tipo de tarjeta o banco ${index + 1}`}
                              >
                                <SelectValue placeholder="Selecciona tarjeta o banco" />
                              </SelectTrigger>
                              <SelectContent>
                                {cardAndBankOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="field-stack">
                            <Label htmlFor={`payment-authorization-${payment.id}`}>
                              4 dígitos de autorización
                            </Label>
                            <Input
                              id={`payment-authorization-${payment.id}`}
                              value={payment.authorizationCode ?? ""}
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="0000"
                              aria-label={`Autorización de pago ${index + 1}`}
                              onChange={(event) => {
                                const authorizationCode = event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4);
                                setPayments((current) =>
                                  current.map((item) =>
                                    item.id === payment.id
                                      ? { ...item, authorizationCode }
                                      : item,
                                  ),
                                );
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!paymentReferencesAreValid && (
                <p className="payment-authorization-note">
                  Selecciona la tarjeta o banco y captura exactamente cuatro
                  dígitos de autorización en cada cobro no efectivo.
                </p>
              )}

              {balanceDue > 0.01 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="add-payment-button"
                  onClick={addPayment}
                >
                  <PlusCircle size={15} /> Añadir otro método para cubrir saldo
                </Button>
              )}

              <div
                className={`payment-balance-summary ${paymentStatus === "PAID" ? "is-paid" : "is-pending"}`}
              >
                <div>
                  {paymentStatus === "PAID" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Clock3 size={20} />
                  )}
                  <span>
                    <small>
                      {paymentStatus === "PAID"
                        ? "PAGO COMPLETO"
                        : paymentStatus === "LAYAWAY"
                          ? "APARTADO"
                          : "PENDIENTE DE COBRO"}
                    </small>
                    <strong>
                      {paymentStatus === "PAID"
                        ? payments.length > 1
                          ? `${payments.length} métodos de pago`
                          : (paymentMethods.find(
                              (method) =>
                                method.id === appliedPayments[0]?.methodId,
                            )?.label ?? "Pago registrado")
                        : `Saldo pendiente ${formatCurrency(balanceDue)}`}
                    </strong>
                  </span>
                </div>
                <div className="payment-amounts">
                  <span>
                    Abono <strong>{formatCurrency(amountPaid)}</strong>
                  </span>
                  {changeDue > 0 && (
                    <span>
                      Cambio <strong>{formatCurrency(changeDue)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {paymentStatus !== "PAID" && (
                <p className="payment-pending-note">
                  El ticket se registrará con saldo pendiente y aparecerá como
                  {paymentStatus === "LAYAWAY"
                    ? " apartado."
                    : " pendiente de cobro."}
                </p>
              )}

              {paymentStatus === "LAYAWAY" && (
                <div className="layaway-delivery-panel">
                  <div className="section-title-row">
                    <div>
                      <span className="section-kicker">
                        ENTREGA DEL APARTADO
                      </span>
                      <h3>¿Qué productos ya se entregaron?</h3>
                    </div>
                    <Gift size={20} />
                  </div>
                  <p>
                    Sólo los artículos marcados se descuentan ahora de la
                    sucursal del ticket. Al liquidar el saldo se volverá a
                    preguntar cuáles productos pendientes recibe la clienta.
                  </p>
                  <div className="layaway-delivery-list">
                    {cart
                      .filter((item) => item.product.kind === "PRODUCT")
                      .map((item) => {
                        const selected = deliveredCartItemIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={selected ? "is-selected" : ""}
                            onClick={() =>
                              setDeliveredCartItemIds((current) =>
                                selected
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
                            aria-pressed={selected}
                          >
                            <span>
                              <strong>{item.product.name}</strong>
                              <small>
                                {item.quantity} pza · stock actual{" "}
                                {item.product.stock ?? 0}
                              </small>
                            </span>
                            <Badge variant={selected ? "default" : "outline"}>
                              {selected ? "ENTREGADO" : "POR ENTREGAR"}
                            </Badge>
                          </button>
                        );
                      })}
                    {cart.every((item) => item.product.kind !== "PRODUCT") && (
                      <small>Este ticket no contiene productos físicos.</small>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="checkout-dialog-footer">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              checkoutStep === 1
                ? onOpenChange(false)
                : setCheckoutStep((checkoutStep - 1) as CheckoutStep)
            }
          >
            {checkoutStep === 1 ? "Volver al carrito" : "Paso anterior"}
          </Button>
          {checkoutStep === 1 && (
            <Button
              type="button"
              onClick={() => setCheckoutStep(2)}
              disabled={!clientIsValid}
            >
              Continuar a vendedores
            </Button>
          )}
          {checkoutStep === 2 && (
            <Button
              type="button"
              onClick={() => setCheckoutStep(3)}
              disabled={!sellerStepIsValid}
            >
              Continuar a citas
            </Button>
          )}
          {checkoutStep === 3 && (
            <Button
              type="button"
              onClick={() => setCheckoutStep(4)}
              disabled={!nextSessionIsValid}
            >
              Continuar al cobro
            </Button>
          )}
          {checkoutStep === 4 && (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={!canComplete}
            >
              {paymentStatus === "PAID" ? (
                <CheckCircle2 size={17} />
              ) : (
                <Clock3 size={17} />
              )}
              {paymentStatus === "PAID"
                ? "Cobrar y finalizar"
                : paymentStatus === "LAYAWAY"
                  ? "Crear apartado"
                  : "Registrar pendiente de cobro"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
