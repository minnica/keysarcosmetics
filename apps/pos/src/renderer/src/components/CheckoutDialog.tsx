import { useEffect, useMemo, useState } from "react";
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
import { paymentReferenceIsValid } from "../bank-catalog";
import {
  availableAgendaSeats,
  isSellerSelectableAgendaSlot,
} from "../agenda-gateway";
import type {
  AgendaReservationMode,
  AgendaSlot,
  AppointmentDraft,
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
  agendaSlots: AgendaSlot[];
  sourceOptions: ClientSourceOption[];
  requiredFields: RequiredClientFields;
  courtesySettings: CourtesySettings;
  companyName: string;
  companySalesNumber: string;
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
  agendaSlots,
  sourceOptions,
  requiredFields,
  courtesySettings,
  companyName,
  companySalesNumber,
  isMasterCode,
  onOpenChange,
  onComplete,
}: CheckoutDialogProps) {
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
  const [nextSessionMembershipId, setNextSessionMembershipId] = useState("");
  const [complaintCourtesy, setComplaintCourtesy] = useState(false);
  const [nextSessionDate, setNextSessionDate] = useState("");
  const [nextSessionBranch, setNextSessionBranch] = useState("");
  const [nextSessionTime, setNextSessionTime] = useState("");

  useEffect(() => {
    if (!open) return;
    const firstSellerId = presentSellers[0]?.id ?? "";
    const initialCourtesyPackage =
      availableCourtesyPackages.find(
        (option) => option.id === courtesySettings.defaultPackage,
      )?.id ?? availableCourtesyPackages[0]?.id ?? "";
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
    setCourtesyPackage(initialCourtesyPackage);
    setCourtesyDate("");
    setCourtesyBranch("");
    setCourtesyTime("");
    setCourtesyReservationMode("SIMULTANEOUS_DOUBLE");
    setNextSessionAnswer("");
    setNextSessionService("Facial de seguimiento");
    setNextSessionMembershipId("");
    setComplaintCourtesy(false);
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
  }, [availableCourtesyPackages, courtesySettings.defaultPackage, open, paymentMethods, presentSellers, total]);

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
  const selectedClientMembershipHistory = useMemo(
    () =>
      clientMemberships.filter(
        (membership) => membership.clientId === selectedClientId,
      ),
    [clientMemberships, selectedClientId],
  );
  const selectedClientMemberships = useMemo(
    () =>
      clientMemberships.filter(
        (membership) =>
          membership.clientId === selectedClientId &&
          membership.status === "ACTIVE" &&
          membership.usedSessions < membership.totalSessions,
      ),
    [clientMemberships, selectedClientId],
  );
  const selectedNextSessionMembership = selectedClientMemberships.find(
    (membership) => membership.id === nextSessionMembershipId,
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
      isSellerSelectableAgendaSlot(slot),
  );
  const selectedNextSessionAgendaSlot = nextSessionAgendaSlots.find(
    (slot) => slot.id === nextSessionTime,
  );

  const missingNewClientFields = (
    Object.keys(requiredFields) as ClientField[]
  ).filter((field) => requiredFields[field] && !newClient[field].trim());
  const courtesyAppointmentIsValid =
    clientMode !== "new" || !courtesySettings.required ||
    Boolean(
      selectedCourtesyPackage &&
        courtesyDate &&
        courtesyBranch &&
        selectedCourtesyAgendaOption,
    );
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
  const nextSessionIsValid =
    clientMode === "new"
      ? courtesyAppointmentIsValid
      : nextSessionAnswer === "NO" ||
        (nextSessionAnswer === "YES" &&
          Boolean(
            nextSessionService &&
            (!clientHasMembershipHistory ||
              complaintCourtesy ||
              selectedNextSessionMembership) &&
            nextSessionDate &&
            nextSessionBranch &&
            selectedNextSessionAgendaSlot,
          ));
  const canComplete =
    clientIsValid &&
    sellerStepIsValid &&
    nextSessionIsValid &&
    payments.length > 0 &&
    paymentReferencesAreValid;

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
    setNextSessionMembershipId("");
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
    setSelectedSellerIds(firstSellerId ? [firstSellerId] : []);
    setSplitValues(firstSellerId ? { [firstSellerId]: splitTarget } : {});
    setClientOwnerId(firstSellerId);
    setOwnershipAuthorized(false);
    setShowAdditionalSellers(false);
    setSellerSearch("");
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
    const appointments: AppointmentDraft[] = [
      ...(clientMode === "new" && courtesySettings.required
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
                  }
                : {}),
            };
          })
        : []),
      ...(clientMode === "search" && nextSessionAnswer === "YES"
        ? [
            {
              kind: complaintCourtesy
                ? ("COURTESY" as const)
                : ("NEXT_SESSION" as const),
              service: nextSessionService,
              ...(complaintCourtesy
                ? { courtesyReason: "COMPLAINT" as const }
                : selectedNextSessionMembership
                  ? { membershipId: selectedNextSessionMembership.id }
                  : {}),
              date: nextSessionDate,
              branch: nextSessionBranch,
              time: selectedNextSessionAgendaSlot?.startTime ?? "",
              ...(selectedNextSessionAgendaSlot
                ? {
                    agendaSlotId: selectedNextSessionAgendaSlot.id,
                    externalSlotId:
                      selectedNextSessionAgendaSlot.externalSlotId,
                    agendaResourceName:
                      selectedNextSessionAgendaSlot.resourceName,
                    agendaReservationMode: "SINGLE" as const,
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
      createdClient: clientMode === "new",
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
                              setCourtesyReservationMode(
                                mode as AgendaReservationMode,
                              );
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

              {clientMode === "new" && courtesySettings.required && (
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

              {clientMode === "search" ? (
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
                        setNextSessionMembershipId("");
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
              ) : null}

              {clientMode === "search" && clientHasMembershipHistory && (
                  <div className="membership-scheduling-card">
                    <div
                      className={`membership-scheduling-heading ${clientHasSchedulableMemberships ? "" : "is-exhausted"}`}
                    >
                      <Crown size={18} aria-hidden="true" />
                      <span>
                        <strong>
                          {clientHasSchedulableMemberships
                            ? "Servicios disponibles en membresías"
                            : "Membresía sin sesiones disponibles"}
                        </strong>
                        <small>
                          {clientHasSchedulableMemberships
                            ? "Elige el tarjetón que se vinculará con la cita. La sesión sólo se descontará cuando Agenda confirme la asistencia."
                            : "La opción de reservar con membresía fue desactivada. Sólo puedes elegir una cortesía por atención de queja."}
                        </small>
                      </span>
                    </div>
                    {clientHasSchedulableMemberships && (
                      <div className="membership-service-options">
                        {selectedClientMemberships.map((membership) => {
                          const remaining =
                            membership.totalSessions - membership.usedSessions;
                          const isSelected =
                            nextSessionMembershipId === membership.id &&
                            !complaintCourtesy;
                          return (
                            <button
                              key={membership.id}
                              type="button"
                              className={isSelected ? "is-selected" : ""}
                              onClick={() => {
                                setNextSessionAnswer("YES");
                                setComplaintCourtesy(false);
                                setNextSessionMembershipId(membership.id);
                                setNextSessionService(membership.membershipName);
                                setNextSessionTime("");
                              }}
                              aria-pressed={isSelected}
                            >
                              <span>
                                <strong>{membership.membershipName}</strong>
                                <small>{membership.folio}</small>
                              </span>
                              <b>
                                {remaining}{" "}
                                {remaining === 1 ? "sesión" : "sesiones"}
                              </b>
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                              setNextSessionMembershipId("");
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
                  </div>
                )}

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
                        {clientHasMembershipHistory ? (
                          complaintCourtesy ? (
                            <div
                              id="next-session-service"
                              className="complaint-courtesy-service"
                            >
                              <Gift size={15} /> {nextSessionService}
                            </div>
                          ) : clientHasSchedulableMemberships ? (
                            <Select
                              value={nextSessionMembershipId}
                              onValueChange={(membershipId) => {
                                const membership =
                                  selectedClientMemberships.find(
                                    (candidate) => candidate.id === membershipId,
                                  );
                                setNextSessionMembershipId(membershipId);
                                setNextSessionService(
                                  membership?.membershipName ?? "",
                                );
                                setNextSessionTime("");
                              }}
                            >
                              <SelectTrigger id="next-session-service">
                                <SelectValue placeholder="Selecciona membresía" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedClientMemberships.map((membership) => {
                                  const remaining =
                                    membership.totalSessions -
                                    membership.usedSessions;
                                  return (
                                    <SelectItem
                                      key={membership.id}
                                      value={membership.id}
                                    >
                                      {membership.membershipName} · {remaining}{" "}
                                      {remaining === 1 ? "sesión" : "sesiones"}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div
                              id="next-session-service"
                              className="complaint-courtesy-service is-empty"
                            >
                              Selecciona una cortesía facial o corporal
                            </div>
                          )
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
                                {
                                  if (item.id !== payment.id) return item;
                                  const {
                                    cardType: _cardType,
                                    cardNetwork: _cardNetwork,
                                    bankId: _bankId,
                                    bankName: _bankName,
                                    installmentMonths: _installmentMonths,
                                    ...paymentWithoutCardTerms
                                  } = item;
                                  return {
                                    ...paymentWithoutCardTerms,
                                    methodId,
                                    authorizationCode: "",
                                    cardOrBank: "",
                                  };
                                }
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
