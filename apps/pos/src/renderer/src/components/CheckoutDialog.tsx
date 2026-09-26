import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarHeart,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  DollarSign,
  Gift,
  History,
  Eye,
  Landmark,
  LockKeyhole,
  Percent,
  Pencil,
  PlusCircle,
  Save,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  WalletCards,
  XCircle,
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
import { paymentBankName, paymentReferenceIsValid } from "../bank-catalog";
import {
  availableAgendaSeats,
  isSellerSelectableAgendaSlot,
} from "../agenda-gateway";
import type {
  AgendaReservationMode,
  AgendaSlot,
  Appointment,
  AppointmentDraft,
  AppointmentReservationActor,
  CartItem,
  CourtesyPackage,
  CourtesySettings,
  Client,
  ClientMembership,
  ClientField,
  ClientSourceOption,
  NewClientDraft,
  PaymentMethod,
  PaymentEntry,
  PaymentMethodOption,
  PaymentStatus,
  BankCatalogEntry,
  RequiredClientFields,
  Seller,
  SellerSplit,
  TicketSellerSale,
} from "../types";
import { PaymentReferenceFields } from "./PaymentReferenceFields";

type ClientMode = "search" | "new";
type SplitMode = "amount" | "percent";
type CheckoutStep = 1 | 2 | 3 | 4;
type AppointmentAnswer = "" | "YES" | "NO";
const installmentOptions = [1, 3, 6, 9, 12, 18, 24];
const COMPANY_SALES_PARTICIPANT_ID = "company-sales";

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
  clientMemberships: ClientMembership[];
  sellers: Seller[];
  clockedInSellerIds: string[];
  paymentMethods: PaymentMethodOption[];
  bankCatalog: BankCatalogEntry[];
  branches: string[];
  activeBranch: string;
  agendaSlots: AgendaSlot[];
  appointments: Appointment[];
  sourceOptions: ClientSourceOption[];
  requiredFields: RequiredClientFields;
  courtesySettings: CourtesySettings;
  clientIdsWithPurchaseHistory: string[];
  companyName: string;
  companySalesNumber: string;
  lockedClientId?: string;
  isMasterCode: (code: string) => boolean;
  isCommercialAuthorizationCode: (code: string) => boolean;
  canEditSavedClient: boolean;
  authorizeAppointmentCode: (
    code: string,
  ) => AppointmentReservationActor | null;
  onOpenChange: (open: boolean) => void;
  onSaveClient: (client: Client) => void;
  onViewTicket: (ticketId: string) => void;
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

const membershipHasAvailableSessions = (membership: ClientMembership) =>
  membership.status === "ACTIVE" &&
  membership.usedSessions < membership.totalSessions;

const nextSessionServices = [
  "Facial de seguimiento",
  "Masaje",
  "Valoración de piel",
  "Seguimiento de tratamiento",
];

interface AgendaSelectionOption {
  key: string;
  slotIds: string[];
  mode: AgendaReservationMode;
  label: string;
}

interface MembershipAppointmentSelection {
  id: string;
  membershipId: string;
  date: string;
  branch: string;
  slotId: string;
}

interface SaleParticipant {
  id: string;
  name: string;
  participantKind: "SELLER" | "COMPANY";
  participantCode: string;
}

const cancelledAvailabilityLabel = (slots: AgendaSlot[]) =>
  slots.some((slot) => slot.status === "CANCELLED")
    ? " · liberado por cancelación"
    : "";

const buildCourtesyAgendaOptions = (
  slots: AgendaSlot[],
  serviceCount: number,
  mode: AgendaReservationMode,
): AgendaSelectionOption[] => {
  const selectable = slots.filter(isSellerSelectableAgendaSlot);
  if (serviceCount <= 1) {
    return selectable.map((slot) => ({
      key: slot.id,
      slotIds: [slot.id],
      mode: "SINGLE",
      label: `${slot.startTime}–${slot.endTime} · ${slot.resourceName}${cancelledAvailabilityLabel([slot])}`,
    }));
  }
  if (mode === "SIMULTANEOUS_DOUBLE") {
    return selectable
      .filter(
        (slot) =>
          slot.resourceType === "DOUBLE" &&
          availableAgendaSeats(slot) >= serviceCount,
      )
      .map((slot) => ({
        key: `simultaneous-${slot.id}`,
        slotIds: Array.from({ length: serviceCount }, () => slot.id),
        mode,
        label: `${slot.startTime}–${slot.endTime} · ${slot.resourceName} · ${serviceCount} lugares simultáneos${cancelledAvailabilityLabel([slot])}`,
      }));
  }

  return selectable
    .flatMap((first) => {
      const second = selectable.find(
        (candidate) =>
          candidate.resourceId === first.resourceId &&
          candidate.date === first.date &&
          candidate.startTime === first.endTime,
      );
      return second
        ? [
            {
              key: `consecutive-${first.id}-${second.id}`,
              slotIds: [first.id, second.id],
              mode: "CONSECUTIVE" as const,
              label: `${first.startTime}–${second.endTime} · ${first.resourceName} · 2 horarios consecutivos${cancelledAvailabilityLabel([first, second])}`,
            },
          ]
        : [];
    })
    .filter(
      (option, index, all) =>
        all.findIndex((candidate) => candidate.key === option.key) === index,
    );
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
  clientMemberships,
  sellers,
  clockedInSellerIds,
  paymentMethods,
  bankCatalog,
  branches,
  activeBranch,
  agendaSlots,
  appointments,
  sourceOptions,
  requiredFields,
  courtesySettings,
  clientIdsWithPurchaseHistory,
  companyName,
  companySalesNumber,
  lockedClientId,
  isMasterCode,
  isCommercialAuthorizationCode,
  canEditSavedClient,
  authorizeAppointmentCode,
  onOpenChange,
  onSaveClient,
  onViewTicket,
  onComplete,
}: CheckoutDialogProps) {
  const checkoutInitializedRef = useRef(false);
  const activeSellers = useMemo(
    () => sellers.filter((seller) => seller.active),
    [sellers],
  );
  const clockedInSellerIdSet = useMemo(
    () => new Set(clockedInSellerIds),
    [clockedInSellerIds],
  );
  const presentSellers = useMemo(
    () => activeSellers.filter((seller) => clockedInSellerIdSet.has(seller.id)),
    [activeSellers, clockedInSellerIdSet],
  );
  const availableCourtesyPackages = useMemo(() => {
    const activeProducts = new Map(
      courtesySettings.products
        .filter((product) => product.active)
        .map((product) => [product.id, product]),
    );
    return courtesySettings.packages
      .filter(
        (option) =>
          option.active &&
          courtesySettings.enabledPackages.includes(option.id) &&
          option.serviceIds.length > 0 &&
          option.serviceIds.length <= 2 &&
          option.serviceIds.every((serviceId) => activeProducts.has(serviceId)),
      )
      .map((option) => ({
        id: option.id,
        name: option.name,
        label: `${option.name} · ${option.serviceIds.length} ${option.serviceIds.length === 1 ? "cortesía" : "cortesías"}`,
        services: option.serviceIds.map(
          (serviceId) => activeProducts.get(serviceId)!.name,
        ),
      }));
  }, [courtesySettings]);
  const [clientMode, setClientMode] = useState<ClientMode>("search");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClient, setNewClient] = useState<NewClientDraft>(emptyClient);
  const [savedNewClient, setSavedNewClient] = useState<Client | null>(null);
  const [savedClientCollapsed, setSavedClientCollapsed] = useState(false);
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
  const [courtesyReservationMode, setCourtesyReservationMode] =
    useState<AgendaReservationMode>("SIMULTANEOUS_DOUBLE");
  const [nextSessionAnswer, setNextSessionAnswer] =
    useState<AppointmentAnswer>("");
  const [nextSessionService, setNextSessionService] = useState<string>(
    "Facial de seguimiento",
  );
  const [membershipAppointments, setMembershipAppointments] = useState<
    MembershipAppointmentSelection[]
  >([]);
  const [finishedMembershipsOpen, setFinishedMembershipsOpen] = useState(false);
  const [firstAppointmentMembershipProductId, setFirstAppointmentMembershipProductId] =
    useState("");
  const [complaintCourtesy, setComplaintCourtesy] = useState(false);
  const [nextSessionDate, setNextSessionDate] = useState("");
  const [nextSessionBranch, setNextSessionBranch] = useState("");
  const [nextSessionTime, setNextSessionTime] = useState("");
  const [appointmentAuthorizationCode, setAppointmentAuthorizationCode] =
    useState("");
  const [purchaseCourtesyAnswer, setPurchaseCourtesyAnswer] =
    useState<AppointmentAnswer>("");
  const [purchaseCourtesyProductId, setPurchaseCourtesyProductId] =
    useState("");
  const [purchaseCourtesyAuthorizationCode, setPurchaseCourtesyAuthorizationCode] =
    useState("");

  useEffect(() => {
    if (!open) {
      checkoutInitializedRef.current = false;
      return;
    }
    if (checkoutInitializedRef.current) return;
    checkoutInitializedRef.current = true;
    const lockedClient = clients.find((client) => client.id === lockedClientId);
    const lockedOwner = activeSellers.find(
      (seller) => seller.id === lockedClient?.ownerId,
    );
    const lockedIsCompanyPortfolio = Boolean(
      lockedClient &&
        (lockedClient.companyLocked ||
          (lockedClient.ownerId && !lockedOwner)),
    );
    const firstSellerId =
      lockedOwner?.id ?? presentSellers[0]?.id ?? "";
    const initialSellerIds = [
      ...(lockedIsCompanyPortfolio ? [COMPANY_SALES_PARTICIPANT_ID] : []),
      ...(firstSellerId ? [firstSellerId] : []),
    ];
    const initialCourtesyPackage =
      availableCourtesyPackages.find(
        (option) => option.id === courtesySettings.defaultPackage,
      )?.id ?? availableCourtesyPackages[0]?.id ?? "";
    const firstPaymentMethod = paymentMethods.find((method) => method.active);
    setClientMode("search");
    setCheckoutStep(1);
    setClientSearch(
      lockedClient
        ? `${lockedClient.firstName} ${lockedClient.lastName}`
        : "",
    );
    setSelectedClientId(lockedClient?.id ?? "");
    setNewClient(emptyClient);
    setSavedNewClient(null);
    setSavedClientCollapsed(false);
    setSplitMode("amount");
    setSelectedSellerIds(initialSellerIds);
    setSplitValues(createEvenSplit(initialSellerIds, "amount", total));
    setClientOwnerId(lockedOwner?.id ?? "");
    setOwnershipMasterOpen(false);
    setOwnershipMasterCode("");
    setOwnershipAuthorized(false);
    setShowAdditionalSellers(false);
    setSellerSearch("");
    setDeliveredCartItemIds([]);
    setCourtesyPackage(initialCourtesyPackage);
    setCourtesyDate("");
    setCourtesyBranch("");
    setCourtesyTime("");
    setCourtesyReservationMode("SIMULTANEOUS_DOUBLE");
    setNextSessionAnswer("");
    setNextSessionService("Facial de seguimiento");
    setMembershipAppointments([]);
    setFinishedMembershipsOpen(false);
    setFirstAppointmentMembershipProductId("");
    setComplaintCourtesy(false);
    setNextSessionDate("");
    setNextSessionBranch("");
    setNextSessionTime("");
    setAppointmentAuthorizationCode("");
    setPurchaseCourtesyAnswer("");
    setPurchaseCourtesyProductId("");
    setPurchaseCourtesyAuthorizationCode("");
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
  }, [activeSellers, availableCourtesyPackages, clients, courtesySettings.defaultPackage, lockedClientId, open, paymentMethods, presentSellers, total]);

  useEffect(() => {
    if (courtesyBranch && !branches.includes(courtesyBranch)) {
      setCourtesyBranch("");
      setCourtesyTime("");
    }
    if (nextSessionBranch && !branches.includes(nextSessionBranch)) {
      setNextSessionBranch("");
      setNextSessionTime("");
    }
  }, [branches, courtesyBranch, nextSessionBranch]);

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
  const selectedClientHasPurchaseHistory = Boolean(
    selectedClientId && clientIdsWithPurchaseHistory.includes(selectedClientId),
  );
  const authorizedPurchaseFacials = useMemo(
    () =>
      courtesySettings.products.filter(
        (product) => product.active && product.category === "FACIAL",
      ),
    [courtesySettings.products],
  );
  const selectedPurchaseCourtesyProduct = authorizedPurchaseFacials.find(
    (product) => product.id === purchaseCourtesyProductId,
  );
  const purchaseCourtesyAuthorizationValid =
    purchaseCourtesyAnswer === "YES" &&
    isCommercialAuthorizationCode(purchaseCourtesyAuthorizationCode);
  const selectedClientMembershipHistory = useMemo(
    () =>
      clientMemberships.filter(
        (membership) => membership.clientId === selectedClientId,
      ),
    [clientMemberships, selectedClientId],
  );
  const selectedClientMemberships = useMemo(
    () => selectedClientMembershipHistory.filter(membershipHasAvailableSessions),
    [selectedClientMembershipHistory],
  );
  const selectedClientFinishedMemberships = useMemo(
    () =>
      selectedClientMembershipHistory.filter(
        (membership) => !membershipHasAvailableSessions(membership),
      ),
    [selectedClientMembershipHistory],
  );
  const selectedClientCourtesyFacials = useMemo(() => {
    if (!selectedClientId) return [];
    return appointments.filter(
      (appointment) =>
        appointment.clientId === selectedClientId &&
        appointment.kind === "COURTESY" &&
        appointment.service.toLocaleLowerCase("es-MX").includes("facial"),
    );
  }, [appointments, selectedClientId]);
  const courtesyFacialsTaken = selectedClientCourtesyFacials.filter(
    (appointment) => appointment.status === "ATTENDED",
  ).length;
  const newlyPurchasedMembershipProducts = useMemo(() => {
    const previouslyOwnedProductIds = new Set(
      selectedClientMembershipHistory.map((membership) => membership.productId),
    );
    const uniqueProducts = new Map<string, CartItem["product"]>();
    cart.forEach((item) => {
      if (
        item.product.kind === "MEMBERSHIP" &&
        !previouslyOwnedProductIds.has(item.product.id)
      ) {
        uniqueProducts.set(item.product.id, item.product);
      }
    });
    return Array.from(uniqueProducts.values());
  }, [cart, selectedClientMembershipHistory]);
  const requiresFirstMembershipAppointment =
    Boolean(clientMode === "new" || selectedClient) &&
    newlyPurchasedMembershipProducts.length > 0;
  const requiresMembershipCourtesyDecision =
    clientMode === "new" && requiresFirstMembershipAppointment;
  const requiresStandardWelcomeCourtesy =
    clientMode === "new" &&
    courtesySettings.required &&
    !requiresFirstMembershipAppointment;
  const firstAppointmentMembershipProduct =
    newlyPurchasedMembershipProducts.find(
      (product) => product.id === firstAppointmentMembershipProductId,
    ) ?? newlyPurchasedMembershipProducts[0];
  const appointmentReservationActor = authorizeAppointmentCode(
    appointmentAuthorizationCode,
  );
  const clientHasSchedulableMemberships =
    selectedClientMemberships.length > 0;
  const clientHasMembershipHistory =
    selectedClientMembershipHistory.length > 0;
  const complaintCourtesyServices = clientHasSchedulableMemberships
    ? ["Facial de cortesía por queja"]
    : [
        "Facial de cortesía por queja",
        "Corporal de cortesía por queja",
      ];
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
  const companyParticipantName =
    selectedClient?.companyName.trim() ||
    newClient.companyName.trim() ||
    companyName.trim() ||
    "Keysar Cosmetics";
  const companyParticipantCode =
    companySalesNumber.trim() || "EMPRESA-001";
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
      normalizedSellerSearch &&
      !selectedSellerIds.includes(seller.id) &&
      sellerMatchesSearch(seller),
  );
  const visibleSellers = activeSellers.filter(
    (seller) =>
      selectedSellerIds.includes(seller.id) ||
      clockedInSellerIdSet.has(seller.id) ||
      (showAdditionalSellers &&
        Boolean(normalizedSellerSearch) &&
        sellerMatchesSearch(seller)),
  );

  const selectedCourtesyPackage = availableCourtesyPackages.find(
    (option) => option.id === courtesyPackage,
  );
  const courtesyServices = selectedCourtesyPackage?.services ?? [];
  const courtesyServiceCount = courtesyServices.length;
  const courtesyAgendaOptions = buildCourtesyAgendaOptions(
    agendaSlots.filter(
      (slot) => slot.branch === courtesyBranch && slot.date === courtesyDate,
    ),
    courtesyServiceCount,
    courtesyServiceCount === 1 ? "SINGLE" : courtesyReservationMode,
  );
  const selectedCourtesyAgendaOption = courtesyAgendaOptions.find(
    (option) => option.key === courtesyTime,
  );
  const nextSessionAgendaSlots = agendaSlots.filter(
    (slot) =>
      slot.branch === nextSessionBranch &&
      slot.date === nextSessionDate &&
      isSellerSelectableAgendaSlot(slot) &&
      availableAgendaSeats(slot) >
        membershipAppointments.filter(
          (appointment) => appointment.slotId === slot.id,
        ).length,
  );
  const selectedNextSessionAgendaSlot = nextSessionAgendaSlots.find(
    (slot) => slot.id === nextSessionTime,
  );
  const membershipAppointmentSlots = (
    selection: MembershipAppointmentSelection,
  ) =>
    agendaSlots.filter((slot) => {
      if (
        slot.branch !== selection.branch ||
        slot.date !== selection.date ||
        !isSellerSelectableAgendaSlot(slot)
      )
        return false;
      const seatsAlreadySelected = membershipAppointments.filter(
        (appointment) =>
          appointment.id !== selection.id && appointment.slotId === slot.id,
      ).length +
        (requiresFirstMembershipAppointment && nextSessionTime === slot.id
          ? 1
          : 0);
      return availableAgendaSeats(slot) > seatsAlreadySelected;
    });
  const membershipAppointmentsAreValid =
    membershipAppointments.length > 0 &&
    membershipAppointments.every((selection) => {
      const membership = selectedClientMemberships.find(
        (candidate) => candidate.id === selection.membershipId,
      );
      const slot = membershipAppointmentSlots(selection).find(
        (candidate) => candidate.id === selection.slotId,
      );
      return Boolean(membership && selection.date && selection.branch && slot);
    });

  const missingNewClientFields = (
    Object.keys(requiredFields) as ClientField[]
  ).filter((field) => requiredFields[field] && !newClient[field].trim());
  const newClientDataIsValid =
    missingNewClientFields.length === 0 &&
    Boolean(newClient.source) &&
    Boolean(clientOwnerId) &&
    (!clientIsCompanyLocked || Boolean(newClient.companyName.trim()));
  const courtesyAppointmentIsValid = Boolean(
    selectedCourtesyPackage &&
      courtesyDate &&
      courtesyBranch &&
      selectedCourtesyAgendaOption,
  );
  const clientIsValid =
    clientMode === "search"
      ? Boolean(selectedClient)
      : newClientDataIsValid &&
        (!requiresStandardWelcomeCourtesy || courtesyAppointmentIsValid);
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
  const paymentIsCard = (methodId: string) => {
    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    const identity = `${methodId} ${method?.label ?? ""}`.toLocaleLowerCase("es-MX");
    return identity.includes("card") || identity.includes("tarjeta");
  };
  const paymentReferencesAreValid = appliedPayments.every(
    (payment) =>
      !paymentNeedsAuthorization(payment.methodId) ||
      paymentReferenceIsValid(
        payment,
        paymentIsCard(payment.methodId),
        installmentOptions,
      ),
  );
  const sellerStepIsValid =
    selectedSellerIds.length > 0 &&
    splitIsValid &&
    ownershipIsValid &&
    (!clientIsCompanyLocked ||
      selectedSellerIds.includes(COMPANY_SALES_PARTICIPANT_ID));
  const purchaseCourtesyIsValid =
    (!selectedClientHasPurchaseHistory ||
      purchaseCourtesyAnswer === "NO" ||
      (purchaseCourtesyAnswer === "YES" &&
        Boolean(selectedPurchaseCourtesyProduct) &&
        purchaseCourtesyAuthorizationValid)) &&
    (!requiresMembershipCourtesyDecision ||
      purchaseCourtesyAnswer === "NO" ||
      (purchaseCourtesyAnswer === "YES" && courtesyAppointmentIsValid));
  const baseNextSessionIsValid =
    requiresFirstMembershipAppointment
      ? Boolean(
          firstAppointmentMembershipProduct &&
            nextSessionDate &&
            nextSessionBranch &&
            selectedNextSessionAgendaSlot,
        ) &&
        (membershipAppointments.length === 0 || membershipAppointmentsAreValid)
      : clientMode === "new"
      ? !requiresStandardWelcomeCourtesy || courtesyAppointmentIsValid
      : nextSessionAnswer === "NO" ||
        (nextSessionAnswer === "YES" &&
          (clientHasMembershipHistory && !complaintCourtesy
            ? membershipAppointmentsAreValid
            : Boolean(
                nextSessionService &&
                  nextSessionDate &&
                  nextSessionBranch &&
                  selectedNextSessionAgendaSlot,
              )));
  const nextSessionIsValid = baseNextSessionIsValid && purchaseCourtesyIsValid;
  const reservationNeedsAuthorization =
    requiresFirstMembershipAppointment ||
    requiresStandardWelcomeCourtesy ||
    (clientMode === "search" && nextSessionAnswer === "YES");
  const reservationIsAuthorized =
    !reservationNeedsAuthorization || Boolean(appointmentReservationActor);
  const canAttemptComplete =
    clientIsValid &&
    sellerStepIsValid &&
    nextSessionIsValid &&
    reservationIsAuthorized &&
    payments.length > 0;
  const canComplete = canAttemptComplete && paymentReferencesAreValid;

  const clientRecordMissingRequirements: string[] = [];
  if (clientMode === "new") {
    clientRecordMissingRequirements.push(
      ...missingNewClientFields.map(
        (field) => clientFieldLabels[field].toLocaleLowerCase("es-MX"),
      ),
    );
    if (!newClient.source && !missingNewClientFields.includes("source"))
      clientRecordMissingRequirements.push("procedencia");
    if (!clientOwnerId)
      clientRecordMissingRequirements.push("vendedor fijo");
    if (clientIsCompanyLocked && !newClient.companyName.trim())
      clientRecordMissingRequirements.push("empresa asignada");
  }

  const clientMissingRequirements: string[] = [];
  if (clientMode === "search") {
    if (!selectedClient) clientMissingRequirements.push("seleccionar la clienta");
  } else {
    clientMissingRequirements.push(...clientRecordMissingRequirements);
    if (requiresStandardWelcomeCourtesy) {
      if (!selectedCourtesyPackage)
        clientMissingRequirements.push("paquete de cortesía de bienvenida");
      if (!courtesyDate)
        clientMissingRequirements.push("fecha de la cita de bienvenida");
      if (!courtesyBranch)
        clientMissingRequirements.push("sucursal de la cita de bienvenida");
      if (!selectedCourtesyAgendaOption)
        clientMissingRequirements.push("horario y cabina de la cita de bienvenida");
    }
  }

  const sellerMissingRequirements: string[] = [];
  if (selectedSellerIds.length === 0)
    sellerMissingRequirements.push("seleccionar al menos un vendedor");
  if (!splitIsValid)
    sellerMissingRequirements.push("completar la división de la venta");
  if (!ownershipIsValid)
    sellerMissingRequirements.push("asignar al vendedor propietario de la clienta");
  if (
    clientIsCompanyLocked &&
    !selectedSellerIds.includes(COMPANY_SALES_PARTICIPANT_ID)
  )
    sellerMissingRequirements.push("incluir la participación de la empresa");

  const appointmentMissingRequirements: string[] = [];
  if (selectedClientHasPurchaseHistory) {
    if (!purchaseCourtesyAnswer)
      appointmentMissingRequirements.push(
        "responder si se asignará un facial de regalo",
      );
    if (purchaseCourtesyAnswer === "YES") {
      if (!selectedPurchaseCourtesyProduct)
        appointmentMissingRequirements.push("seleccionar el facial de regalo");
      if (!purchaseCourtesyAuthorizationValid)
        appointmentMissingRequirements.push(
          "token de autorización del facial de regalo",
        );
    }
  }
  if (requiresFirstMembershipAppointment) {
    if (!firstAppointmentMembershipProduct)
      appointmentMissingRequirements.push("seleccionar la membresía nueva");
    if (!nextSessionDate)
      appointmentMissingRequirements.push("fecha de la primera cita de membresía");
    if (!nextSessionBranch)
      appointmentMissingRequirements.push("sucursal de la primera cita de membresía");
    if (!selectedNextSessionAgendaSlot)
      appointmentMissingRequirements.push(
        "horario y cabina de la primera cita de membresía",
      );
    if (requiresMembershipCourtesyDecision) {
      if (!purchaseCourtesyAnswer)
        appointmentMissingRequirements.push(
          "responder si regalará un facial de cortesía",
        );
      if (purchaseCourtesyAnswer === "YES") {
        if (!selectedCourtesyPackage)
          appointmentMissingRequirements.push(
            "paquete de facial de cortesía",
          );
        if (!courtesyDate)
          appointmentMissingRequirements.push(
            "fecha de la cita de cortesía",
          );
        if (!courtesyBranch)
          appointmentMissingRequirements.push(
            "sucursal de la cita de cortesía",
          );
        if (!selectedCourtesyAgendaOption)
          appointmentMissingRequirements.push(
            "horario y cabina de la cita de cortesía",
          );
      }
    }
  } else if (clientMode === "search") {
    if (!nextSessionAnswer)
      appointmentMissingRequirements.push(
        "responder si desea agendar la próxima sesión",
      );
    if (nextSessionAnswer === "YES") {
      if (clientHasMembershipHistory && !complaintCourtesy) {
        if (membershipAppointments.length === 0)
          appointmentMissingRequirements.push(
            "seleccionar una membresía activa o una cortesía",
          );
      } else {
        if (!nextSessionService)
          appointmentMissingRequirements.push("servicio de la próxima cita");
        if (!nextSessionDate)
          appointmentMissingRequirements.push("fecha de la próxima cita");
        if (!nextSessionBranch)
          appointmentMissingRequirements.push("sucursal de la próxima cita");
        if (!selectedNextSessionAgendaSlot)
          appointmentMissingRequirements.push(
            "horario y cabina de la próxima cita",
          );
      }
    }
  }
  membershipAppointments.forEach((selection, index) => {
    const membership = selectedClientMemberships.find(
      (candidate) => candidate.id === selection.membershipId,
    );
    const prefix = `cita ${index + 1}${membership ? ` de ${membership.membershipName}` : " de membresía"}`;
    if (!membership)
      appointmentMissingRequirements.push(`${prefix}: membresía activa`);
    if (!selection.date)
      appointmentMissingRequirements.push(`${prefix}: fecha`);
    if (!selection.branch)
      appointmentMissingRequirements.push(`${prefix}: sucursal`);
    if (
      !membershipAppointmentSlots(selection).some(
        (slot) => slot.id === selection.slotId,
      )
    )
      appointmentMissingRequirements.push(`${prefix}: horario y cabina`);
  });
  if (reservationNeedsAuthorization && !appointmentReservationActor)
    appointmentMissingRequirements.push(
      "código personal de quien realiza la reserva",
    );

  const paymentMissingRequirements: string[] = [];
  if (payments.length === 0)
    paymentMissingRequirements.push("agregar un método de pago");
  appliedPayments.forEach((payment, index) => {
    if (!paymentNeedsAuthorization(payment.methodId)) return;
    const methodLabel =
      paymentMethods.find((method) => method.id === payment.methodId)?.label ??
      `pago ${index + 1}`;
    if (!paymentBankName(payment))
      paymentMissingRequirements.push(`banco de ${methodLabel}`);
    if (!/^\d{4}$/.test(payment.authorizationCode ?? ""))
      paymentMissingRequirements.push(
        `cuatro dígitos de autorización de ${methodLabel}`,
      );
    if (paymentIsCard(payment.methodId)) {
      if (!payment.cardType)
        paymentMissingRequirements.push(`crédito o débito de ${methodLabel}`);
      if (!payment.cardNetwork)
        paymentMissingRequirements.push(`Visa o Mastercard de ${methodLabel}`);
      if (
        payment.cardType === "CREDIT" &&
        !installmentOptions.includes(payment.installmentMonths ?? 0)
      )
        paymentMissingRequirements.push(
          `meses o una exhibición de ${methodLabel}`,
        );
    }
  });

  const checkoutMissingRequirements = [
    ...clientMissingRequirements,
    ...sellerMissingRequirements,
    ...appointmentMissingRequirements,
    ...paymentMissingRequirements,
  ];

  const showMissingRequirements = (requirements: string[]) => {
    const uniqueRequirements = Array.from(new Set(requirements));
    if (uniqueRequirements.length === 0) return false;
    toast.error(
      `Completa todos los datos. Falta: ${uniqueRequirements.join(", ")}.`,
    );
    return true;
  };

  const requestCheckoutStep = (step: CheckoutStep) => {
    if (step <= checkoutStep) {
      setCheckoutStep(step);
      return;
    }
    if (step >= 2 && showMissingRequirements(clientMissingRequirements)) {
      setCheckoutStep(1);
      return;
    }
    if (step >= 3 && showMissingRequirements(sellerMissingRequirements)) {
      setCheckoutStep(2);
      return;
    }
    if (step >= 4 && showMissingRequirements(appointmentMissingRequirements)) {
      setCheckoutStep(3);
      return;
    }
    setCheckoutStep(step);
  };

  const selectClient = (client: Client) => {
    setSelectedClientId(client.id);
    const owner = activeSellers.find((seller) => seller.id === client.ownerId);
    const isCompanyPortfolio = Boolean(client.companyLocked || (client.ownerId && !owner));
    const preferredSellerId =
      owner?.id ?? presentSellers[0]?.id ?? "";
    const ids = [
      ...(isCompanyPortfolio ? [COMPANY_SALES_PARTICIPANT_ID] : []),
      ...(preferredSellerId ? [preferredSellerId] : []),
    ];
    setSelectedSellerIds(ids);
    setSplitValues(createEvenSplit(ids, splitMode, total));
    setClientOwnerId(owner && !client.companyLocked ? owner.id : "");
    setOwnershipMasterOpen(false);
    setOwnershipMasterCode("");
    setOwnershipAuthorized(false);
    setShowAdditionalSellers(false);
    setSellerSearch("");
    const membershipHistory = clientMemberships.filter(
      (membership) => membership.clientId === client.id,
    );
    const availableMemberships = membershipHistory.filter(
      (membership) =>
        membership.status === "ACTIVE" &&
        membership.usedSessions < membership.totalSessions,
    );
    setNextSessionAnswer("");
    setPurchaseCourtesyAnswer("");
    setPurchaseCourtesyProductId("");
    setPurchaseCourtesyAuthorizationCode("");
    setMembershipAppointments([]);
    setFinishedMembershipsOpen(false);
    setFirstAppointmentMembershipProductId("");
    setComplaintCourtesy(false);
    setNextSessionService(
      membershipHistory.length > 0 ? "" : "Facial de seguimiento",
    );
    setNextSessionDate("");
    setNextSessionBranch("");
    setNextSessionTime("");
  };

  const changeClientMode = (mode: ClientMode) => {
    const firstSellerId = presentSellers[0]?.id ?? "";
    setClientMode(mode);
    setSelectedClientId("");
    setNewClient(emptyClient);
    setSavedNewClient(null);
    setSavedClientCollapsed(false);
    setSelectedSellerIds(firstSellerId ? [firstSellerId] : []);
    setSplitValues(firstSellerId ? { [firstSellerId]: splitTarget } : {});
    setClientOwnerId(firstSellerId);
    setOwnershipAuthorized(false);
    setShowAdditionalSellers(false);
    setSellerSearch("");
    setNextSessionAnswer("");
    setMembershipAppointments([]);
    setFinishedMembershipsOpen(false);
    setFirstAppointmentMembershipProductId("");
    setComplaintCourtesy(false);
    setNextSessionService("Facial de seguimiento");
    setNextSessionDate("");
    setNextSessionBranch("");
    setNextSessionTime("");
    setAppointmentAuthorizationCode("");
    setPurchaseCourtesyAnswer("");
    setPurchaseCourtesyProductId("");
    setPurchaseCourtesyAuthorizationCode("");
  };

  const addMembershipAppointment = (membershipId: string) => {
    const membership = selectedClientMemberships.find(
      (candidate) => candidate.id === membershipId,
    );
    if (!membership) return;
    const remaining = membership.totalSessions - membership.usedSessions;
    const selectedCount = membershipAppointments.filter(
      (appointment) => appointment.membershipId === membershipId,
    ).length;
    if (selectedCount >= remaining) {
      toast.error("No hay más sesiones disponibles en este tarjetón.");
      return;
    }
    setNextSessionAnswer("YES");
    setComplaintCourtesy(false);
    setMembershipAppointments((current) => [
      ...current,
      {
        id: `membership-appointment-${crypto.randomUUID()}`,
        membershipId,
        date: "",
        branch: activeBranch,
        slotId: "",
      },
    ]);
  };

  const updateMembershipAppointment = (
    id: string,
    changes: Partial<MembershipAppointmentSelection>,
  ) => {
    setMembershipAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, ...changes } : appointment,
      ),
    );
  };

  const removeMembershipAppointment = (id: string) => {
    setMembershipAppointments((current) =>
      current.filter((appointment) => appointment.id !== id),
    );
  };

  const clearMembershipAppointmentSelection = (membershipId: string) => {
    setMembershipAppointments((current) =>
      current.filter(
        (appointment) => appointment.membershipId !== membershipId,
      ),
    );
  };

  const selectClientSource = (source: string) => {
    const locksCompany = Boolean(
      sourceOptions.find((item) => item.id === source)?.locksCompany,
    );
    const humanSellerIds = selectedSellerIds.filter(
      (sellerId) => sellerId !== COMPANY_SALES_PARTICIPANT_ID,
    );
    const nextSellerIds = locksCompany
      ? [COMPANY_SALES_PARTICIPANT_ID, ...humanSellerIds]
      : humanSellerIds;
    setNewClient((current) => ({
      ...current,
      source,
      companyName: locksCompany
        ? current.companyName || companyName || "Keysar Cosmetics"
        : "",
    }));
    setSelectedSellerIds(nextSellerIds);
    setSplitValues(createEvenSplit(nextSellerIds, splitMode, total));
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
    if (sellerId === COMPANY_SALES_PARTICIPANT_ID) return;
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

  const changePaymentMethod = (paymentId: string, methodId: string) => {
    setPayments((current) =>
      current.map((payment) => {
        if (payment.id !== paymentId || payment.methodId === methodId)
          return payment;
        const nextPayment: PaymentEntry = {
          id: payment.id,
          methodId,
          amount: payment.amount,
        };
        if (!paymentNeedsAuthorization(methodId)) return nextPayment;
        return {
          ...nextPayment,
          ...(payment.authorizationCode !== undefined
            ? { authorizationCode: payment.authorizationCode }
            : {}),
          ...(payment.cardOrBank !== undefined
            ? { cardOrBank: payment.cardOrBank }
            : {}),
          ...(payment.bankId !== undefined ? { bankId: payment.bankId } : {}),
          ...(payment.bankName !== undefined
            ? { bankName: payment.bankName }
            : {}),
          ...(paymentIsCard(methodId) && paymentIsCard(payment.methodId)
            ? {
                ...(payment.cardType !== undefined
                  ? { cardType: payment.cardType }
                  : {}),
                ...(payment.cardNetwork !== undefined
                  ? { cardNetwork: payment.cardNetwork }
                  : {}),
                ...(payment.installmentMonths !== undefined
                  ? { installmentMonths: payment.installmentMonths }
                  : {}),
              }
            : {}),
        };
      }),
    );
  };

  const buildNewClientRecord = (
    ownerId: string | null,
    saleSellerIds: string[],
  ): Client => {
    const now = new Date();
    return {
      id: savedNewClient?.id ?? `client-${Date.now()}`,
      registrationFolio:
        savedNewClient?.registrationFolio ??
        `CLI-${now.getFullYear()}-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      registeredAtIso: savedNewClient?.registeredAtIso ?? now.toISOString(),
      ...newClient,
      ownerId,
      companyLocked: clientIsCompanyLocked,
      companyName: clientIsCompanyLocked ? newClient.companyName.trim() : "",
      source: newClient.source || "APPROACH",
      sourceLabel: selectedSourceOption?.label ?? "Abordaje",
      saleSellerIds,
    };
  };

  const saveNewClient = () => {
    if (showMissingRequirements(clientRecordMissingRequirements)) return;
    if (!newClientDataIsValid) return;
    const ownerId = clientIsCompanyLocked
      ? null
      : isShared
        ? clientOwnerId
        : (selectedSellerIds[0] ?? clientOwnerId ?? null);
    const saleSellerIds = Array.from(
      new Set([
        ...(savedNewClient?.saleSellerIds ?? []),
        ...selectedSellerIds.filter(
          (sellerId) => sellerId !== COMPANY_SALES_PARTICIPANT_ID,
        ),
      ]),
    );
    const client = buildNewClientRecord(ownerId, saleSellerIds);
    onSaveClient(client);
    setSavedNewClient(client);
    setSavedClientCollapsed(true);
    toast.success(
      savedNewClient
        ? "Datos de la clienta actualizados."
        : "Clienta guardada y disponible en Customers.",
    );
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    setSplitValues(createEvenSplit(selectedSellerIds, mode, total));
  };

  const handleComplete = () => {
    if (showMissingRequirements(checkoutMissingRequirements)) {
      if (clientMissingRequirements.length > 0) setCheckoutStep(1);
      else if (sellerMissingRequirements.length > 0) setCheckoutStep(2);
      else if (appointmentMissingRequirements.length > 0) setCheckoutStep(3);
      else setCheckoutStep(4);
      return;
    }
    if (!canComplete) return;
    const ownerId = clientIsCompanyLocked
      ? null
      : isShared
        ? clientOwnerId
        : (selectedSellerIds[0] ?? null);
    const existingSellerIds = selectedClient?.saleSellerIds ?? [];
    const saleSellerIds = Array.from(
      new Set([
        ...existingSellerIds,
        ...selectedSellerIds.filter(
          (sellerId) => sellerId !== COMPANY_SALES_PARTICIPANT_ID,
        ),
      ]),
    );
    const client: Client =
      clientMode === "search" && selectedClient
        ? { ...selectedClient, ownerId, saleSellerIds }
        : buildNewClientRecord(ownerId, saleSellerIds);
    const selectedParticipants = selectedSellerIds.reduce<SaleParticipant[]>(
      (participants, sellerId) => {
        if (sellerId === COMPANY_SALES_PARTICIPANT_ID) {
          participants.push({
            id: COMPANY_SALES_PARTICIPANT_ID,
            name: companyParticipantName,
            participantKind: "COMPANY",
            participantCode: companyParticipantCode,
          });
          return participants;
        }
        const seller = sellers.find((candidate) => candidate.id === sellerId);
        if (seller) {
          participants.push({
            id: seller.id,
            name: seller.name,
            participantKind: "SELLER",
            participantCode: seller.id,
          });
        }
        return participants;
      },
      [],
    );
    const purchaseCourtesySeller = selectedParticipants.find(
      (participant) => participant.participantKind === "SELLER",
    );
    const scheduledMembershipAppointments: AppointmentDraft[] =
      membershipAppointments.flatMap((selection) => {
        const membership = selectedClientMemberships.find(
          (candidate) => candidate.id === selection.membershipId,
        );
        const slot = agendaSlots.find(
          (candidate) => candidate.id === selection.slotId,
        );
        if (!membership || !slot) return [];
        return [
          {
            kind: "NEXT_SESSION" as const,
            service: membership.membershipName,
            membershipId: membership.id,
            date: selection.date,
            branch: selection.branch,
            time: slot.startTime,
            agendaSlotId: slot.id,
            externalSlotId: slot.externalSlotId,
            agendaResourceName: slot.resourceName,
            agendaReservationMode: "SINGLE" as const,
            ...(appointmentReservationActor
              ? {
                  bookingSource: "POS_CHECKOUT" as const,
                  bookedById: appointmentReservationActor.id,
                  bookedByName: appointmentReservationActor.name,
                  bookedByRole: appointmentReservationActor.role,
                }
              : {}),
          },
        ];
      });
    const appointments: AppointmentDraft[] = [
      ...(clientMode === "new" &&
      (requiresStandardWelcomeCourtesy ||
        (requiresMembershipCourtesyDecision &&
          purchaseCourtesyAnswer === "YES"))
        ? courtesyServices.map((service, index) => {
            const slotId = selectedCourtesyAgendaOption?.slotIds[index];
            const slot = agendaSlots.find((candidate) => candidate.id === slotId);
            return {
              kind: "COURTESY" as const,
              service,
              courtesyReason: "WELCOME" as const,
              ...(selectedCourtesyPackage
                ? {
                    courtesyPackageId: selectedCourtesyPackage.id,
                    courtesyPackageName: selectedCourtesyPackage.name,
                  }
                : {}),
              date: slot?.date ?? courtesyDate,
              branch: slot?.branch ?? courtesyBranch,
              time: slot?.startTime ?? "",
              ...(slot
                ? {
                    agendaSlotId: slot.id,
                    externalSlotId: slot.externalSlotId,
                    agendaResourceName: slot.resourceName,
                    agendaReservationMode:
                      selectedCourtesyAgendaOption?.mode ?? "SINGLE",
                    ...(appointmentReservationActor
                      ? {
                          bookingSource: "POS_CHECKOUT" as const,
                          bookedById: appointmentReservationActor.id,
                          bookedByName: appointmentReservationActor.name,
                          bookedByRole: appointmentReservationActor.role,
                        }
                      : {}),
                  }
                : {}),
            };
          })
        : []),
      ...(clientMode === "search" &&
      selectedClientHasPurchaseHistory &&
      purchaseCourtesyAnswer === "YES" &&
      selectedPurchaseCourtesyProduct &&
      purchaseCourtesyAuthorizationValid
        ? [
            {
              kind: "COURTESY" as const,
              service: selectedPurchaseCourtesyProduct.name,
              courtesyReason: "PURCHASE" as const,
              commercialAuthorizationUsed: true,
              date: new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Mexico_City",
              }).format(new Date()),
              branch: activeBranch || branches[0] || "Sin sucursal",
              time: "Pendiente de agendar",
              bookingSource: "POS_CHECKOUT" as const,
              ...(purchaseCourtesySeller
                ? {
                    bookedById: purchaseCourtesySeller.id,
                    bookedByName: purchaseCourtesySeller.name,
                    bookedByRole: "SELLER" as const,
                  }
                : {}),
            },
          ]
        : []),
      ...(requiresFirstMembershipAppointment && firstAppointmentMembershipProduct
        ? [
            {
              kind: "NEXT_SESSION" as const,
              service: firstAppointmentMembershipProduct.name,
              membershipProductId: firstAppointmentMembershipProduct.id,
              firstMembershipAppointment: true,
              date: nextSessionDate,
              branch: nextSessionBranch,
              time: selectedNextSessionAgendaSlot?.startTime ?? "",
              ...(selectedNextSessionAgendaSlot
                ? {
                    agendaSlotId: selectedNextSessionAgendaSlot.id,
                    externalSlotId: selectedNextSessionAgendaSlot.externalSlotId,
                    agendaResourceName: selectedNextSessionAgendaSlot.resourceName,
                    agendaReservationMode: "SINGLE" as const,
                    ...(appointmentReservationActor
                      ? {
                          bookingSource: "POS_CHECKOUT" as const,
                          bookedById: appointmentReservationActor.id,
                          bookedByName: appointmentReservationActor.name,
                          bookedByRole: appointmentReservationActor.role,
                        }
                      : {}),
                  }
                : {}),
            },
          ]
        : []),
      ...scheduledMembershipAppointments,
      ...(requiresFirstMembershipAppointment
        ? []
        : clientMode === "search" && nextSessionAnswer === "YES"
        ? complaintCourtesy
          ? [
              {
                kind: "COURTESY" as const,
                service: nextSessionService,
                courtesyReason: "COMPLAINT" as const,
                date: nextSessionDate,
                branch: nextSessionBranch,
                time: selectedNextSessionAgendaSlot?.startTime ?? "",
                ...(selectedNextSessionAgendaSlot
                  ? {
                      agendaSlotId: selectedNextSessionAgendaSlot.id,
                      externalSlotId: selectedNextSessionAgendaSlot.externalSlotId,
                      agendaResourceName: selectedNextSessionAgendaSlot.resourceName,
                      agendaReservationMode: "SINGLE" as const,
                      ...(appointmentReservationActor
                        ? {
                            bookingSource: "POS_CHECKOUT" as const,
                            bookedById: appointmentReservationActor.id,
                            bookedByName: appointmentReservationActor.name,
                            bookedByRole: appointmentReservationActor.role,
                          }
                        : {}),
                    }
                  : {}),
              },
            ]
          : clientHasMembershipHistory
            ? []
            : [
                {
                  kind: "NEXT_SESSION" as const,
                  service: nextSessionService,
                  date: nextSessionDate,
                  branch: nextSessionBranch,
                  time: selectedNextSessionAgendaSlot?.startTime ?? "",
                  ...(selectedNextSessionAgendaSlot
                    ? {
                        agendaSlotId: selectedNextSessionAgendaSlot.id,
                        externalSlotId: selectedNextSessionAgendaSlot.externalSlotId,
                        agendaResourceName: selectedNextSessionAgendaSlot.resourceName,
                        agendaReservationMode: "SINGLE" as const,
                        ...(appointmentReservationActor
                          ? {
                              bookingSource: "POS_CHECKOUT" as const,
                              bookedById: appointmentReservationActor.id,
                              bookedByName: appointmentReservationActor.name,
                              bookedByRole: appointmentReservationActor.role,
                            }
                          : {}),
                      }
                    : {}),
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
      createdClient: clientMode === "new" && !savedNewClient,
      splits: selectedSellerIds.map((sellerId) => ({
        sellerId,
        value: splitValues[sellerId] ?? 0,
        participantKind:
          sellerId === COMPANY_SALES_PARTICIPANT_ID ? "COMPANY" : "SELLER",
        participantCode:
          sellerId === COMPANY_SALES_PARTICIPANT_ID
            ? companyParticipantCode
            : sellerId,
      })),
      sellerSummary: selectedParticipants
        .map((participant) => participant.name)
        .join(" / "),
      paymentMethod:
        appliedPayments[0]?.methodId ?? paymentMethods[0]?.id ?? "",
      payments: appliedPayments,
      sellerSales: selectedSellerIds.map((sellerId) => {
        const participant = selectedParticipants.find(
          (candidate) => candidate.id === sellerId,
        );
        const splitValue = splitValues[sellerId] ?? 0;
        return {
          sellerId,
          sellerName: participant?.name ?? "Vendedor",
          amount:
            splitMode === "amount" ? splitValue : total * (splitValue / 100),
          participantKind: participant?.participantKind ?? "SELLER",
          participantCode: participant?.participantCode ?? sellerId,
        };
      }),
      amountPaid,
      balanceDue,
      paymentStatus,
      appointments,
      deliveredCartItemIds,
    });
  };

  const courtesyAppointmentEditor = (
    <div className="courtesy-appointment-panel new-client-grid-span">
      <div className="courtesy-appointment-heading">
        <span>
          <Gift size={18} />
        </span>
        <div>
          <strong>Cita de cortesía</strong>
          <small>
            Elige una o dos cortesías. Nunca se permiten más de dos servicios
            de regalo.
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
            onValueChange={(value) => {
              setCourtesyPackage(value as CourtesyPackage);
              setCourtesyReservationMode("SIMULTANEOUS_DOUBLE");
              setCourtesyTime("");
            }}
          >
            <SelectTrigger id="courtesy-service">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCourtesyPackages.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
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
            onChange={(date) => {
              setCourtesyDate(date);
              setCourtesyTime("");
            }}
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
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {courtesyServiceCount > 1 && (
          <div className="field-stack appointment-reservation-mode-field">
            <Label htmlFor="courtesy-reservation-mode">
              Distribución de los dos servicios <em>*</em>
            </Label>
            <Select
              value={courtesyReservationMode}
              onValueChange={(mode) => {
                setCourtesyReservationMode(mode as AgendaReservationMode);
                setCourtesyTime("");
              }}
            >
              <SelectTrigger id="courtesy-reservation-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMULTANEOUS_DOUBLE">
                  Misma hora · cabina doble
                </SelectItem>
                <SelectItem value="CONSECUTIVE">
                  Dos horarios consecutivos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="field-stack appointment-availability-field">
          <Label htmlFor="courtesy-time">
            Espacio disponible <em>*</em>
          </Label>
          <Select
            value={courtesyTime}
            onValueChange={setCourtesyTime}
            disabled={!courtesyBranch || !courtesyDate}
          >
            <SelectTrigger id="courtesy-time">
              <SelectValue placeholder="Horario y cabina" />
            </SelectTrigger>
            <SelectContent>
              {courtesyAgendaOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {courtesyDate &&
            courtesyBranch &&
            courtesyAgendaOptions.length === 0 && (
              <small className="agenda-no-availability">
                No hay cabinas libres para esta configuración.
              </small>
            )}
        </div>
      </div>
      {!courtesyAppointmentIsValid && (
        <p>
          Selecciona fecha, sucursal y un horario disponible para registrar la
          cortesía.
        </p>
      )}
    </div>
  );

  return (
    <>
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
            onClick={() => requestCheckoutStep(2)}
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
            onClick={() => requestCheckoutStep(3)}
            aria-current={checkoutStep === 3 ? "step" : undefined}
          >
            <span>3</span>
            <strong>Citas</strong>
          </button>
          <button
            type="button"
            className={checkoutStep === 4 ? "is-active" : ""}
            onClick={() => requestCheckoutStep(4)}
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

              {!lockedClientId ? <div className="segmented-control">
                <button
                  type="button"
                  className={clientMode === "search" ? "is-active" : ""}
                  onClick={() => changeClientMode("search")}
                >
                  <Search size={16} /> Buscar cliente
                </button>
                <button
                  type="button"
                  className={clientMode === "new" ? "is-active" : ""}
                  onClick={() => changeClientMode("new")}
                >
                  <UserPlus size={16} /> Nuevo cliente
                </button>
              </div> : selectedClient ? (
                <div className="checkout-locked-client" role="status">
                  <LockKeyhole size={18} />
                  <span>
                    <small>CLIENTA DEL APARTADO · DATOS ORIGINALES PROTEGIDOS</small>
                    <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                    <small>{selectedClient.phone} · {selectedClient.sourceLabel}</small>
                  </span>
                </div>
              ) : null}

              {clientMode === "search" && !lockedClientId ? (
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
              ) : clientMode === "new" ? (
                <>
                {savedNewClient && savedClientCollapsed && (
                  <div className="saved-client-summary" role="status">
                    <span className="client-avatar">
                      {savedNewClient.firstName.charAt(0)}
                      {savedNewClient.lastName.charAt(0)}
                    </span>
                    <span>
                      <small>CLIENTA GUARDADA</small>
                      <strong>
                        {savedNewClient.firstName} {savedNewClient.lastName}
                      </strong>
                    </span>
                    {canEditSavedClient ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSavedClientCollapsed(false)}
                      >
                        <Pencil size={15} /> Editar datos
                      </Button>
                    ) : (
                      <span className="saved-client-locked">
                        <LockKeyhole size={15} /> Datos protegidos
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`new-client-grid ${savedNewClient && savedClientCollapsed ? "is-saved-client-collapsed" : ""}`}
                >
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
                      quickMonthYearNavigation
                      fromYear={1920}
                      toYear={new Date().getFullYear()}
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
                  <div className="new-client-contact-copy-row">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={`copy-phone-to-whatsapp ${newClient.phone.trim() !== "" && newClient.phone === newClient.whatsapp ? "is-copied" : ""}`}
                      disabled={!newClient.phone.trim()}
                      aria-label="Copiar teléfono a WhatsApp"
                      title={
                        newClient.phone.trim() !== "" &&
                        newClient.phone === newClient.whatsapp
                          ? "WhatsApp usa el mismo número"
                          : "Usar el mismo número en WhatsApp"
                      }
                      onClick={() =>
                        setNewClient((current) => ({
                          ...current,
                          whatsapp: current.phone,
                        }))
                      }
                    >
                      {newClient.phone.trim() !== "" &&
                      newClient.phone === newClient.whatsapp ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <ArrowRight size={17} />
                      )}
                    </Button>
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
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="client-source">
                      Procedencia <em>*</em>
                    </Label>
                    <Select
                      value={newClient.source}
                      onValueChange={selectClientSource}
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
                  <div className="new-client-save-row new-client-grid-span">
                    <span>
                      <strong>
                        {savedNewClient
                          ? "La ficha ya está guardada"
                          : "Guardar antes de continuar"}
                      </strong>
                      <small>
                        La clienta quedará disponible en Customers aunque se
                        cierre este ticket.
                      </small>
                    </span>
                    <Button
                      type="button"
                      onClick={saveNewClient}
                    >
                      <Save size={16} />
                      {savedNewClient ? "Actualizar cliente" : "Guardar cliente"}
                    </Button>
                  </div>
                  {requiresStandardWelcomeCourtesy && courtesyAppointmentEditor}
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
                </>
              ) : null}
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

              <div
                className={`seller-attendance-summary ${presentSellers.length === 0 ? "is-empty" : ""}`}
              >
                <Clock3 size={17} aria-hidden="true" />
                <span>
                  <strong>
                    {presentSellers.length === 0
                      ? "Sin vendedores con Clock In"
                      : `${presentSellers.length} ${presentSellers.length === 1 ? "vendedor presente" : "vendedores presentes"}`}
                  </strong>
                  <small>
                    Se muestran primero los Clock In de esta sucursal. Busca por
                    nombre o alias para agregar a alguien que no esté presente.
                  </small>
                </span>
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
                    {normalizedSellerSearch
                      ? `${matchingAdditionalSellers.length} ${
                          matchingAdditionalSellers.length === 1
                            ? "coincidencia disponible"
                            : "coincidencias disponibles"
                        }`
                      : "Escribe un nombre o alias para buscar fuera del Clock In"}
                  </small>
                </div>
              )}

              <div className="seller-list">
                {clientIsCompanyLocked && (
                  <div className="seller-split-row company-sale-participant is-selected">
                    <div className="seller-selector company-sale-selector">
                      <span className="seller-avatar company-sale-avatar">
                        <Building2 size={17} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{companyParticipantName}</strong>
                        <small>
                          Empresa de venta · participación obligatoria
                        </small>
                        <small className="seller-search-alias">
                          Número de venta: {companyParticipantCode}
                        </small>
                      </span>
                      <LockKeyhole size={15} aria-label="Participación obligatoria" />
                    </div>
                    <div className="split-value-input">
                      <span>{splitMode === "amount" ? "$" : "%"}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          splitValues[COMPANY_SALES_PARTICIPANT_ID] ?? 0
                        }
                        onChange={(event) =>
                          setSplitValues((current) => ({
                            ...current,
                            [COMPANY_SALES_PARTICIPANT_ID]: Number(
                              event.target.value,
                            ),
                          }))
                        }
                        aria-label={`Participación de ${companyParticipantName}`}
                      />
                    </div>
                  </div>
                )}
                {visibleSellers.map((seller) => {
                  const isSelected = selectedSellerIds.includes(seller.id);
                  const hasClockIn = clockedInSellerIdSet.has(seller.id);
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
                              ? `Vendedor asignado · ${hasClockIn ? "Clock In activo" : "Sin Clock In"}`
                              : isSelected
                                ? `Participa en la venta · ${hasClockIn ? "Clock In activo" : "Sin Clock In"}`
                                : hasClockIn
                                  ? "Clock In activo · disponible"
                                  : "Sin Clock In · disponible para añadir"}
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
                      La empresa participa con el número de venta{" "}
                      <strong>{companyParticipantCode}</strong>. Su importe se
                      guarda por separado del de los vendedores humanos.
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

              {requiresStandardWelcomeCourtesy && (
                <div className="courtesy-confirmation-card">
                  <Gift size={19} />
                  <span>
                    <small>CORTESÍA DE BIENVENIDA</small>
                    <strong>{selectedCourtesyPackage?.label ?? "Sin paquete disponible"}</strong>
                    <p>
                      {courtesyDate} · {courtesyBranch} ·{
                        selectedCourtesyAgendaOption?.label ?? "Sin espacio"
                      }
                    </p>
                  </span>
                  <Badge variant="outline">
                    {courtesyServices.length} REGALO
                    {courtesyServices.length === 1
                      ? ""
                      : "S"}{" "}
                    $0
                  </Badge>
                </div>
              )}

              {clientMode === "search" && selectedClientHasPurchaseHistory && (
                <div className="purchase-courtesy-card">
                  <div className="purchase-courtesy-question">
                    <span>
                      <Gift size={18} aria-hidden="true" />
                      <span>
                        <strong>¿Asignar facial de regalo por esta compra?</strong>
                        <small>
                          Esta clienta ya tiene historial; no es una cortesía de
                          bienvenida.
                        </small>
                      </span>
                    </span>
                    <div className="appointment-answer-buttons">
                      <button
                        type="button"
                        className={purchaseCourtesyAnswer === "YES" ? "is-active" : ""}
                        onClick={() => setPurchaseCourtesyAnswer("YES")}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className={purchaseCourtesyAnswer === "NO" ? "is-active" : ""}
                        onClick={() => {
                          setPurchaseCourtesyAnswer("NO");
                          setPurchaseCourtesyProductId("");
                          setPurchaseCourtesyAuthorizationCode("");
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                  {purchaseCourtesyAnswer === "YES" && (
                    <div className="purchase-courtesy-fields">
                      <div className="field-stack">
                        <Label htmlFor="purchase-courtesy-product">
                          Facial autorizado <em>*</em>
                        </Label>
                        <Select
                          value={purchaseCourtesyProductId}
                          onValueChange={setPurchaseCourtesyProductId}
                        >
                          <SelectTrigger id="purchase-courtesy-product">
                            <SelectValue placeholder="Selecciona facial de regalo" />
                          </SelectTrigger>
                          <SelectContent>
                            {authorizedPurchaseFacials.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="purchase-courtesy-token">
                          Token de autorización <em>*</em>
                        </Label>
                        <Input
                          id="purchase-courtesy-token"
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={6}
                          value={purchaseCourtesyAuthorizationCode}
                          onChange={(event) =>
                            setPurchaseCourtesyAuthorizationCode(
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="4 a 6 dígitos"
                        />
                        <small className={purchaseCourtesyAuthorizationValid ? "is-valid" : "is-pending"}>
                          {purchaseCourtesyAuthorizationValid
                            ? "Autorización comercial validada"
                            : "Solicita el token vigente a Master o personal autorizado"}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {requiresFirstMembershipAppointment && (
                <div className="next-session-question first-membership-appointment-notice">
                  <Crown size={20} aria-hidden="true" />
                  <div>
                    <strong>Primera cita obligatoria de membresía</strong>
                    <small>
                      La clienta está comprando una membresía que no tenía.
                      Esta primera cita se ligará a la membresía seleccionada;
                      elige fecha, sucursal y espacio para continuar al cobro.
                    </small>
                  </div>
                </div>
              )}

              {requiresMembershipCourtesyDecision && (
                <div className="purchase-courtesy-card membership-purchase-courtesy-card">
                  <div className="purchase-courtesy-question">
                    <span>
                      <Gift size={18} aria-hidden="true" />
                      <span>
                        <strong>¿Deseas regalar un facial de cortesía?</strong>
                        <small>
                          Es adicional a la primera cita de membresía y no
                          descuenta ninguna de sus sesiones.
                        </small>
                      </span>
                    </span>
                    <div className="appointment-answer-buttons">
                      <button
                        type="button"
                        className={
                          purchaseCourtesyAnswer === "YES" ? "is-active" : ""
                        }
                        onClick={() => setPurchaseCourtesyAnswer("YES")}
                      >
                        Sí, registrar cita
                      </button>
                      <button
                        type="button"
                        className={
                          purchaseCourtesyAnswer === "NO" ? "is-active" : ""
                        }
                        onClick={() => {
                          setPurchaseCourtesyAnswer("NO");
                          setCourtesyDate("");
                          setCourtesyBranch("");
                          setCourtesyTime("");
                        }}
                      >
                        No, continuar
                      </button>
                    </div>
                  </div>
                  {purchaseCourtesyAnswer === "YES" &&
                    courtesyAppointmentEditor}
                </div>
              )}

              {!requiresFirstMembershipAppointment && (clientMode === "search" ? (
                <div className="next-session-question">
                  <div>
                    <strong>
                      ¿Deseas dejar agendada la próxima sesión de la clienta?
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
                      Sí, buscar espacio
                    </button>
                    <button
                      type="button"
                      className={
                        nextSessionAnswer === "NO" ? "is-active" : ""
                      }
                      onClick={() => {
                        setNextSessionAnswer("NO");
                        setMembershipAppointments([]);
                        setComplaintCourtesy(false);
                        setNextSessionService(
                          clientHasMembershipHistory
                            ? ""
                            : "Facial de seguimiento",
                        );
                        setNextSessionDate("");
                        setNextSessionBranch("");
                        setNextSessionTime("");
                      }}
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
              ) : null)}

              {clientMode === "search" &&
                selectedClientCourtesyFacials.length > 0 && (
                  <div className="client-service-session-summary">
                    <Gift size={17} aria-hidden="true" />
                    <span>
                      <strong>Faciales de cortesía</strong>
                      <small>Servicios asignados a la clienta</small>
                    </span>
                    <b>
                      {courtesyFacialsTaken} tomadas ·{" "}
                      {selectedClientCourtesyFacials.length} asignadas
                    </b>
                  </div>
                )}

              {clientMode === "search" &&
                clientHasMembershipHistory && (
                  <div className="membership-scheduling-card">
                    <div className="membership-scheduling-header-row">
                      <button
                        type="button"
                        className={`membership-scheduling-heading ${clientHasSchedulableMemberships ? "" : "is-exhausted"}`}
                        onClick={() => {
                          if (clientHasSchedulableMemberships)
                            setNextSessionAnswer("YES");
                        }}
                      >
                        <Crown size={18} aria-hidden="true" />
                        <span>
                          <strong>
                            {clientHasSchedulableMemberships
                              ? "La clienta cuenta con membresía"
                              : "Membresía sin sesiones disponibles"}
                          </strong>
                          <small>
                            {clientHasSchedulableMemberships
                              ? "Puedes agregar una o varias citas y elegir un horario para cada una."
                              : "La reserva con membresía está desactivada; sólo quedan las cortesías autorizadas."}
                          </small>
                        </span>
                      </button>
                      {selectedClientFinishedMemberships.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFinishedMembershipsOpen(true)}
                        >
                          <History size={14} /> Finalizadas ({selectedClientFinishedMemberships.length})
                        </Button>
                      )}
                    </div>
                    {clientHasSchedulableMemberships && (
                      <div className="membership-service-options">
                        {selectedClientMemberships.map((membership) => {
                          const remaining =
                            membership.totalSessions - membership.usedSessions;
                          const selectedCount = membershipAppointments.filter(
                            (appointment) =>
                              appointment.membershipId === membership.id,
                          ).length;
                          return (
                            <div
                              key={membership.id}
                              className={selectedCount > 0 ? "is-selected" : ""}
                            >
                              <span>
                                <strong>{membership.membershipName}</strong>
                                <small>{membership.folio}</small>
                              </span>
                              <small className="membership-usage-inline">
                                {membership.usedSessions} tomadas · {remaining} disponibles
                              </small>
                              <div className="membership-service-actions">
                                {selectedCount > 0 ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="membership-clear-selection"
                                      aria-label={`Quitar ${selectedCount} ${selectedCount === 1 ? "cita" : "citas"} de ${membership.membershipName}`}
                                      onClick={() =>
                                        clearMembershipAppointmentSelection(
                                          membership.id,
                                        )
                                      }
                                    >
                                      <XCircle size={14} /> Quitar ({selectedCount})
                                    </Button>
                                    {selectedCount < remaining && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="membership-add-another"
                                        aria-label={`Agregar otra cita de ${membership.membershipName}`}
                                        title="Agregar otra cita"
                                        onClick={() =>
                                          addMembershipAppointment(membership.id)
                                        }
                                      >
                                        <PlusCircle size={14} />
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      addMembershipAppointment(membership.id)
                                    }
                                  >
                                    <PlusCircle size={14} /> Agregar cita
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!requiresFirstMembershipAppointment && (
                    <div className="complaint-courtesy-options">
                      {complaintCourtesyServices.map((service) => {
                        const isSelected =
                          complaintCourtesy && nextSessionService === service;
                        const serviceKind = service.startsWith("Facial")
                          ? "facial"
                          : "corporal";
                        return (
                          <button
                            key={service}
                            type="button"
                            className={`complaint-courtesy-button ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                              const nextValue = !isSelected;
                              setComplaintCourtesy(nextValue);
                              setNextSessionAnswer("YES");
                              setMembershipAppointments([]);
                              setNextSessionService(nextValue ? service : "");
                              setNextSessionTime("");
                            }}
                            aria-pressed={isSelected}
                          >
                            <Gift size={17} aria-hidden="true" />
                            <span>
                              <strong>
                                ¿Regalar {serviceKind} de cortesía?
                              </strong>
                              <small>
                                Atención de una queja. No consume sesiones de
                                membresía.
                              </small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    )}
                  </div>
                )}

              {clientMode === "search" &&
                nextSessionAnswer === "YES" &&
                !complaintCourtesy &&
                membershipAppointments.length > 0 && (
                  <div className="membership-multi-scheduler">
                    <div className="appointment-scheduler-heading">
                      <MapPin size={18} />
                      <div>
                        <strong>Horarios de las citas de membresía</strong>
                        <small>
                          Cada cita conserva su tarjetón, fecha, sucursal y espacio.
                        </small>
                      </div>
                    </div>
                    {membershipAppointments.map((selection, index) => {
                      const membership = selectedClientMemberships.find(
                        (candidate) => candidate.id === selection.membershipId,
                      );
                      const slots = membershipAppointmentSlots(selection);
                      return (
                        <div className="membership-appointment-row" key={selection.id}>
                          <div className="membership-appointment-label">
                            <Badge variant="outline">CITA {index + 1}</Badge>
                            <span>
                              <strong>{membership?.membershipName ?? "Membresía"}</strong>
                              <small>{membership?.folio}</small>
                            </span>
                          </div>
                          <DatePicker
                            id={`membership-appointment-date-${selection.id}`}
                            value={selection.date}
                            onChange={(date) =>
                              updateMembershipAppointment(selection.id, {
                                date,
                                slotId: "",
                              })
                            }
                            placeholder="Selecciona fecha"
                          />
                          <Select
                            value={selection.branch}
                            onValueChange={(branch) =>
                              updateMembershipAppointment(selection.id, {
                                branch,
                                slotId: "",
                              })
                            }
                          >
                            <SelectTrigger aria-label={`Sucursal de la cita ${index + 1}`}>
                              <SelectValue placeholder="Sucursal" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={selection.slotId}
                            onValueChange={(slotId) =>
                              updateMembershipAppointment(selection.id, { slotId })
                            }
                            disabled={!selection.branch || !selection.date}
                          >
                            <SelectTrigger aria-label={`Horario de la cita ${index + 1}`}>
                              <SelectValue placeholder="Horario y cabina" />
                            </SelectTrigger>
                            <SelectContent>
                              {slots.map((slot) => (
                                <SelectItem key={slot.id} value={slot.id}>
                                  {slot.startTime}–{slot.endTime} · {slot.resourceName}
                                  {slot.resourceType === "DOUBLE"
                                    ? ` · ${availableAgendaSeats(slot)} lugares`
                                    : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Quitar cita ${index + 1}`}
                            onClick={() => removeMembershipAppointment(selection.id)}
                          >
                            <Trash2 size={15} />
                          </Button>
                          {selection.date && selection.branch && slots.length === 0 && (
                            <small className="agenda-no-availability membership-appointment-error">
                              Sin espacios disponibles para esta cita.
                            </small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              {reservationNeedsAuthorization && (
                <div className="appointment-authorization-card">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <span>
                    <strong>Autoriza quién realizó la reserva</strong>
                    <small>
                      Ingresa el código personal del vendedor, administrativo o
                      Master. El código no se guarda; sólo se conserva la
                      identidad autorizada.
                    </small>
                  </span>
                  <div className="field-stack">
                    <Label htmlFor="appointment-authorization-code">
                      Código personal
                    </Label>
                    <Input
                      id="appointment-authorization-code"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      value={appointmentAuthorizationCode}
                      onChange={(event) =>
                        setAppointmentAuthorizationCode(event.target.value)
                      }
                      placeholder="••••"
                    />
                    <small
                      className={
                        appointmentReservationActor ? "is-valid" : "is-pending"
                      }
                    >
                      {appointmentReservationActor
                        ? `Reserva atribuida a ${appointmentReservationActor.name}`
                        : "Código requerido para reservar"}
                    </small>
                  </div>
                </div>
              )}

              {(requiresFirstMembershipAppointment ||
                (clientMode === "search" &&
                  nextSessionAnswer === "YES" &&
                  (complaintCourtesy || !clientHasMembershipHistory))) && (
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
                        {requiresFirstMembershipAppointment ? (
                          <Select
                            value={firstAppointmentMembershipProduct?.id ?? ""}
                            onValueChange={(productId) => {
                              setFirstAppointmentMembershipProductId(productId);
                              setNextSessionTime("");
                            }}
                          >
                            <SelectTrigger id="next-session-service">
                              <SelectValue placeholder="Selecciona membresía nueva" />
                            </SelectTrigger>
                            <SelectContent>
                              {newlyPurchasedMembershipProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} · {product.membershipSessions ?? 1}{" "}
                                  {(product.membershipSessions ?? 1) === 1
                                    ? "sesión"
                                    : "sesiones"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : clientHasMembershipHistory ? (
                          <div
                            id="next-session-service"
                            className="complaint-courtesy-service"
                          >
                            <Gift size={15} /> {nextSessionService}
                          </div>
                        ) : (
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
                        )}
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="next-session-date">Día</Label>
                      <DatePicker
                        id="next-session-date"
                        value={nextSessionDate}
                        onChange={(date) => {
                          setNextSessionDate(date);
                          setNextSessionTime("");
                        }}
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
                          {branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="next-session-time">
                        Espacio disponible
                      </Label>
                      <Select
                        value={nextSessionTime}
                        onValueChange={setNextSessionTime}
                        disabled={!nextSessionBranch || !nextSessionDate}
                      >
                        <SelectTrigger id="next-session-time">
                          <SelectValue placeholder="Horario y cabina" />
                        </SelectTrigger>
                        <SelectContent>
                          {nextSessionAgendaSlots.map((slot) => (
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
                      {nextSessionDate &&
                        nextSessionBranch &&
                        nextSessionAgendaSlots.length === 0 && (
                          <small className="agenda-no-availability">
                            Sin espacios vacíos o cancelados disponibles.
                          </small>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {!requiresFirstMembershipAppointment &&
                clientMode === "search" &&
                nextSessionAnswer === "NO" && (
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
                            changePaymentMethod(payment.id, methodId)
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
                          <PaymentReferenceFields
                            payment={payment}
                            isCard={paymentIsCard(payment.methodId)}
                            bankCatalog={bankCatalog}
                            installmentOptions={installmentOptions}
                            ariaContext={`del pago ${index + 1}`}
                            onChange={(nextPayment) =>
                              setPayments((current) =>
                                current.map((item) =>
                                  item.id === payment.id ? nextPayment : item,
                                ),
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!paymentReferencesAreValid && (
                <p className="payment-authorization-note">
                  Completa el banco y los cuatro dígitos de autorización. Para
                  tarjeta indica crédito o débito, selecciona Visa o Mastercard y,
                  en crédito, el plazo o una sola exhibición.
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
              onClick={() => requestCheckoutStep(2)}
            >
              Continuar a vendedores
            </Button>
          )}
          {checkoutStep === 2 && (
            <Button
              type="button"
              onClick={() => requestCheckoutStep(3)}
            >
              Continuar a citas
            </Button>
          )}
          {checkoutStep === 3 && (
            <Button
              type="button"
              onClick={() => requestCheckoutStep(4)}
            >
              Continuar al cobro
            </Button>
          )}
          {checkoutStep === 4 && (
            <Button
              type="button"
              onClick={handleComplete}
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
    <Dialog open={finishedMembershipsOpen} onOpenChange={setFinishedMembershipsOpen}>
      <DialogContent className="finished-memberships-dialog sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Membresías finalizadas</DialogTitle>
          <DialogDescription>
            Historial de tarjetones agotados o cancelados de {selectedClient?.firstName}{" "}
            {selectedClient?.lastName}.
          </DialogDescription>
        </DialogHeader>
        <div className="finished-memberships-list">
          {selectedClientFinishedMemberships.map((membership) => (
            <article key={membership.id}>
              <span>
                <Crown size={17} aria-hidden="true" />
                <span>
                  <strong>{membership.membershipName}</strong>
                  <small>{membership.folio} · {membership.branch}</small>
                </span>
              </span>
              <span className="finished-membership-sessions">
                <strong>{membership.usedSessions} tomadas</strong>
                <small>de {membership.totalSessions} sesiones</small>
              </span>
              <Badge variant="outline">
                {membership.status === "CANCELLED" ? "CANCELADA" : "FINALIZADA"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFinishedMembershipsOpen(false);
                  onViewTicket(membership.purchaseTicketId);
                }}
              >
                <Eye size={14} /> {membership.purchaseTicketId}
              </Button>
            </article>
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFinishedMembershipsOpen(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
