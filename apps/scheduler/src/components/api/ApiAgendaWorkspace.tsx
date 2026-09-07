"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, eachDayOfInterval, startOfMonth } from "date-fns";
import type {
  SchedulerAppointmentDto,
  SchedulerAvailabilitySlotDto,
  SchedulerCustomerDetailDto,
  SchedulerCustomerFinancialHistoryDto,
} from "@cosmetics/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { AlertTriangle, PanelLeftOpen } from "lucide-react";
import {
  schedulerApi,
  schedulerApiErrorMessage,
  schedulerApiErrorStatus,
} from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import {
  buildSchedulerAgendaPresentation,
  buildSchedulerCanonicalOperatingHours,
  buildSchedulerVisualBlocks,
  buildSchedulerVisualBookings,
  buildSchedulerVisualColumns,
  buildSchedulerVisualServices,
  schedulerCanonicalToBookingStatus,
  schedulerBookingToCanonicalStatus,
} from "@/lib/scheduler-agenda-presentation";
import {
  buildSchedulerAgendaRange,
  loadAllSchedulerAppointments,
  schedulerLocalDateKey,
  schedulerLocalDateTimeToInstant,
} from "@/lib/scheduler-agenda-data";
import {
  defaultBookingStatusColors,
  type Booking,
  type BookingStatus,
  type BookingStatusColors,
  type BranchOption,
  type CommerceOption,
} from "@/lib/scheduler-presentation";
import type { SchedulerClient } from "@/lib/scheduler-client-presentation";
import { adaptSchedulerCustomerSummary } from "@/lib/scheduler-customer-data";
import type { SchedulerFinancialProfile } from "@/lib/scheduler-access";
import {
  getSchedulerAgendaSlotMinutes,
  type SchedulerAgendaSlotMinutes,
} from "@/lib/scheduler-agenda-settings";
import { SchedulerHeader } from "@/components/scheduler/SchedulerHeader";
import {
  SchedulerSidebar,
  type SchedulerDisplayMode,
} from "@/components/scheduler/SchedulerSidebar";
import { SchedulerAgendaGrid } from "@/components/scheduler/SchedulerAgendaGrid";
import { SchedulerAgendaList } from "@/components/scheduler/SchedulerAgendaList";
import { SchedulerBookingDialog } from "@/components/scheduler/SchedulerBookingDialog";
import { SchedulerBlockDialog } from "@/components/scheduler/SchedulerBlockDialog";
import { SchedulerFinancialAccessDialog } from "@/components/scheduler/SchedulerFinancialAccessDialog";
import { SchedulerClientHistoryDialog } from "@/components/scheduler/SchedulerClientHistoryDialog";
import { SchedulerCustomerRecordDialog } from "@/components/scheduler/SchedulerCustomerRecordDialog";
import {
  createBlockDraft,
  createBlockDraftFromBlock,
  createDraft,
  type BlockDraft,
  type BookingDraft,
  type ClientPaymentHistoryEntry,
  type ClientPurchaseAccount,
  type ClientVisitHistoryEntry,
  type EmptySlotAction,
} from "@/components/scheduler/scheduler-utils";
import {
  ConflictNotice,
  QueryBoundary,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

type SensitivePurpose = "financial" | "record" | "history";

interface SensitiveRequest {
  booking: Booking;
  purpose: SensitivePurpose;
}

interface FinancialRecord {
  profile: SchedulerFinancialProfile;
  data: SchedulerCustomerFinancialHistoryDto;
}

const createStatuses: BookingStatus[] = ["pending", "reserved", "confirmed"];

function bookingSourceId(booking: Booking): string {
  return booking.sourceId ?? booking.id;
}

function appointmentWriteServices(
  appointment: SchedulerAppointmentDto,
  startsAt: string,
) {
  const offset =
    new Date(startsAt).getTime() - new Date(appointment.startsAt).getTime();
  return appointment.services.map((service) => ({
    serviceProfileId: service.serviceProfileId,
    professionalProfileIds: service.professionals.map(
      (professional) => professional.professionalProfileId,
    ),
    resourceIds: service.resources.map((resource) => resource.resourceId),
    startsAt: new Date(
      new Date(service.startsAt).getTime() + offset,
    ).toISOString(),
    capacityUnits: service.capacityUnits,
    membershipId: service.membership?.membershipId ?? null,
  }));
}

function slotLocalTime(
  slot: SchedulerAvailabilitySlotDto,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(slot.startsAt));
  return `${parts.find((part) => part.type === "hour")?.value ?? "00"}:${parts.find((part) => part.type === "minute")?.value ?? "00"}`;
}

function instantLocalParts(
  value: string,
  timezone: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function historyStatus(value: string): BookingStatus {
  const mapping: Record<string, BookingStatus> = {
    PENDING: "pending",
    RESERVED: "reserved",
    CONFIRMED: "confirmed",
    ARRIVED: "arrived",
    WAITING: "waiting",
    ATTENDED: "attended",
    NO_SHOW: "no-show",
    CANCELED: "canceled",
  };
  return mapping[value.toUpperCase()] ?? "reserved";
}

function financialSummary(
  data: SchedulerCustomerFinancialHistoryDto | null,
): ClientPurchaseAccount {
  if (!data)
    return {
      previousVisits: 0,
      settledPurchases: 0,
      settledAmount: 0,
      outstandingBalance: 0,
    };
  return data.items.reduce<ClientPurchaseAccount>(
    (summary, ticket) => ({
      previousVisits: summary.previousVisits,
      settledPurchases:
        summary.settledPurchases + (Number(ticket.pendingAmount) === 0 ? 1 : 0),
      settledAmount: summary.settledAmount + Number(ticket.amountPaid || 0),
      outstandingBalance:
        summary.outstandingBalance + Number(ticket.pendingAmount || 0),
    }),
    {
      previousVisits: 0,
      settledPurchases: 0,
      settledAmount: 0,
      outstandingBalance: 0,
    },
  );
}

function financialPayments(
  data: SchedulerCustomerFinancialHistoryDto | null,
): ClientPaymentHistoryEntry[] {
  if (!data) return [];
  return data.items.flatMap((ticket) =>
    ticket.payments.map((payment) => ({
      bookingId: payment.operationId,
      date: payment.createdAt.slice(0, 10),
      purchaseType: "cash" as const,
      amount: Number(payment.amount || 0),
      label: `${ticket.folio} · ${payment.method}`,
    })),
  );
}

export function ApiAgendaWorkspace() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canWrite = canAccess("agenda", "WRITE");
  const canCreateClient = canAccess("clients", "WRITE");
  const canReadStatusColors = canAccess("administration.status-colors", "READ");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [currentView, setCurrentView] = useState<"day" | "week">("day");
  const [selectedCommerce, setSelectedCommerce] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(
    bootstrap?.authorizedBranchIds[0] ?? "",
  );
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "active">(
    "active",
  );
  const [professionalQuery, setProfessionalQuery] = useState("");
  const [quickTimeFilter, setQuickTimeFilter] = useState("all");
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resourcePanelOpen, setResourcePanelOpen] = useState(true);
  const [displayMode, setDisplayMode] =
    useState<SchedulerDisplayMode>("calendar");
  const [agendaSlotMinutes] = useState<SchedulerAgendaSlotMinutes>(() =>
    getSchedulerAgendaSlotMinutes(),
  );
  const [emptySlotAction, setEmptySlotAction] =
    useState<EmptySlotAction | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingIntentKey, setBookingIntentKey] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [sensitiveRequest, setSensitiveRequest] =
    useState<SensitiveRequest | null>(null);
  const [financialRecords, setFinancialRecords] = useState<
    Record<string, FinancialRecord>
  >({});
  const [historyBooking, setHistoryBooking] = useState<Booking | null>(null);
  const [historyEntries, setHistoryEntries] = useState<
    ClientVisitHistoryEntry[]
  >([]);
  const [recordBooking, setRecordBooking] = useState<Booking | null>(null);
  const [customerDetail, setCustomerDetail] =
    useState<SchedulerCustomerDetailDto | null>(null);
  const sidebarBookingTimerRef = useRef<number | null>(null);
  const createdCustomerByIntentRef = useRef<Record<string, string>>({});
  const sensitiveTimersRef = useRef<Record<string, number>>({});

  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "operational-catalog" },
  );
  const administrationCatalog = useSchedulerQuery(
    () => schedulerApi.administrationCatalog(),
    [],
    {
      queryKey: "administration-catalog:agenda-colors",
      enabled: canReadStatusColors,
    },
  );
  const range = useMemo(
    () => buildSchedulerAgendaRange(selectedDate, currentView),
    [currentView, selectedDate],
  );
  const catalogBranches = useMemo(
    () =>
      (catalog.data?.branches ?? []).filter(
        (branch) =>
          branch.active &&
          bootstrap?.authorizedBranchIds.includes(branch.branchId),
      ),
    [bootstrap?.authorizedBranchIds, catalog.data?.branches],
  );
  const commerceIds = useMemo(
    () => new Set(catalogBranches.map((branch) => branch.commerceId)),
    [catalogBranches],
  );
  const commerces = useMemo<CommerceOption[]>(
    () =>
      (catalog.data?.commerces ?? [])
        .filter((commerce) => commerce.active && commerceIds.has(commerce.id))
        .map((commerce) => ({ id: commerce.id, name: commerce.name })),
    [catalog.data?.commerces, commerceIds],
  );
  const branches = useMemo<BranchOption[]>(
    () =>
      catalogBranches
        .filter((branch) => branch.commerceId === selectedCommerce)
        .map((branch) => ({
          id: branch.branchId,
          commerceId: branch.commerceId,
          name: branch.branchName,
        })),
    [catalogBranches, selectedCommerce],
  );
  const branchProfile = catalogBranches.find(
    (branch) => branch.branchId === selectedBranch,
  );

  const agenda = useSchedulerQuery(
    async () => {
      const request = {
        branchId: selectedBranch,
        from: range.from,
        to: range.to,
        ...(statusFilter === "active"
          ? {}
          : { status: schedulerBookingToCanonicalStatus[statusFilter] }),
      };
      const [appointments, blocks] = await Promise.all([
        loadAllSchedulerAppointments(
          (page) => schedulerApi.appointments(page),
          request,
        ),
        schedulerApi.scheduleBlocks({
          branchId: selectedBranch,
          from: range.from,
          to: range.to,
        }),
      ]);
      return { appointments, blocks };
    },
    [selectedBranch, range.from, range.to, statusFilter],
    {
      queryKey: "agenda",
      branchId: selectedBranch,
      enabled: Boolean(selectedBranch),
    },
  );

  const fullPresentation = useMemo(() => {
    if (!catalog.data || !agenda.data) return null;
    return buildSchedulerAgendaPresentation({
      catalog: catalog.data,
      branchId: selectedBranch,
      appointments: agenda.data.appointments,
      blocks: agenda.data.blocks,
    });
  }, [agenda.data, catalog.data, selectedBranch]);
  const presentation = useMemo(() => {
    if (!fullPresentation) return null;
    const visibleDates = new Set(range.visibleDateKeys);
    return {
      ...fullPresentation,
      appointments: fullPresentation.appointments.filter((appointment) =>
        visibleDates.has(appointment.localDate),
      ),
      blocks: fullPresentation.blocks.filter((block) =>
        visibleDates.has(block.localDate),
      ),
    };
  }, [fullPresentation, range.visibleDateKeys]);
  const visualColumns = useMemo(
    () =>
      presentation
        ? buildSchedulerVisualColumns(
            presentation,
            branchProfile?.commerceId ?? selectedCommerce,
            selectedBranch,
          )
        : [],
    [branchProfile?.commerceId, presentation, selectedBranch, selectedCommerce],
  );
  const services = useMemo(
    () =>
      catalog.data && branchProfile
        ? buildSchedulerVisualServices(catalog.data, branchProfile.id)
        : [],
    [branchProfile, catalog.data],
  );
  const statusColors = useMemo<BookingStatusColors>(() => {
    const next = { ...defaultBookingStatusColors };
    const configured = administrationCatalog.data?.statusColors.find(
      (entry) => entry.commerceId === selectedCommerce,
    );
    for (const color of configured?.colors ?? []) {
      next[schedulerCanonicalToBookingStatus[color.status]] = color.color;
    }
    return next;
  }, [administrationCatalog.data?.statusColors, selectedCommerce]);
  const allBookings = useMemo(
    () => (presentation ? buildSchedulerVisualBookings(presentation) : []),
    [presentation],
  );
  const allBlocks = useMemo(
    () =>
      presentation && catalog.data
        ? buildSchedulerVisualBlocks(presentation, catalog.data)
        : [],
    [catalog.data, presentation],
  );
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: range.firstDate, end: range.lastDate }),
    [range.firstDate, range.lastDate],
  );
  const operatingHours = useMemo(
    () =>
      catalog.data
        ? buildSchedulerCanonicalOperatingHours(
            catalog.data,
            selectedBranch,
            weekDays,
          )
        : { commerceId: "", is24Hours: false, schedule: [] },
    [catalog.data, selectedBranch, weekDays],
  );

  const sidebarColumns = useMemo(() => {
    const query = professionalQuery.trim().toLocaleLowerCase("es-MX");
    return query
      ? visualColumns.filter((column) =>
          column.name.toLocaleLowerCase("es-MX").includes(query),
        )
      : visualColumns;
  }, [professionalQuery, visualColumns]);
  const visibleColumns = useMemo(() => {
    const selected = new Set(selectedColumnIds);
    const filtered = sidebarColumns.filter((column) => selected.has(column.id));
    return filtered.length ? filtered : sidebarColumns.slice(0, 1);
  }, [selectedColumnIds, sidebarColumns]);
  const visibleColumnIds = useMemo(
    () => new Set(visibleColumns.map((column) => column.id)),
    [visibleColumns],
  );
  const visibleBookings = useMemo(
    () =>
      allBookings.filter((booking) => {
        const matchesStatus =
          statusFilter === "active"
            ? booking.status !== "canceled"
            : booking.status === statusFilter;
        return (
          visibleColumnIds.has(booking.professionalId) &&
          booking.date === schedulerLocalDateKey(selectedDate) &&
          matchesStatus &&
          (quickTimeFilter === "all" || booking.start === quickTimeFilter)
        );
      }),
    [
      allBookings,
      quickTimeFilter,
      selectedDate,
      statusFilter,
      visibleColumnIds,
    ],
  );
  const visibleBlocks = useMemo(
    () =>
      allBlocks.filter(
        (block) =>
          block.date === schedulerLocalDateKey(selectedDate) &&
          visibleColumnIds.has(block.professionalId),
      ),
    [allBlocks, selectedDate, visibleColumnIds],
  );
  const weekBookings = useMemo(() => {
    const primaryColumnId = visibleColumns[0]?.id;
    return allBookings
      .filter(
        (booking) =>
          booking.professionalId === primaryColumnId &&
          range.visibleDateKeys.includes(booking.date ?? "") &&
          (statusFilter === "active"
            ? booking.status !== "canceled"
            : booking.status === statusFilter),
      )
      .map((booking) => ({
        ...booking,
        dayOffset: Math.max(
          0,
          range.visibleDateKeys.indexOf(booking.date ?? ""),
        ),
      }));
  }, [allBookings, range.visibleDateKeys, statusFilter, visibleColumns]);
  const weekBlocks = useMemo(() => {
    const primaryColumnId = visibleColumns[0]?.id;
    return allBlocks
      .filter(
        (block) =>
          block.professionalId === primaryColumnId &&
          range.visibleDateKeys.includes(block.date ?? ""),
      )
      .map((block) => ({
        ...block,
        dayOffset: Math.max(0, range.visibleDateKeys.indexOf(block.date ?? "")),
      }));
  }, [allBlocks, range.visibleDateKeys, visibleColumns]);
  const listBookings = useMemo(
    () =>
      currentView === "day"
        ? visibleBookings
        : allBookings.filter((booking) => {
            const matchesStatus =
              statusFilter === "active"
                ? booking.status !== "canceled"
                : booking.status === statusFilter;
            return (
              visibleColumnIds.has(booking.professionalId) &&
              range.visibleDateKeys.includes(booking.date ?? "") &&
              matchesStatus &&
              (quickTimeFilter === "all" || booking.start === quickTimeFilter)
            );
          }),
    [
      allBookings,
      currentView,
      quickTimeFilter,
      range.visibleDateKeys,
      statusFilter,
      visibleBookings,
      visibleColumnIds,
    ],
  );
  const calendarTimeSlots = useMemo(() => {
    const windows = operatingHours.schedule.filter((day) => day.enabled);
    if (!windows.length) return [];
    const toMinutes = (value: string) => {
      const [hour = "0", minute = "0"] = value.split(":");
      return Number(hour) * 60 + Number(minute);
    };
    const start = Math.min(...windows.map((day) => toMinutes(day.open)));
    const end = Math.max(...windows.map((day) => toMinutes(day.close)));
    return Array.from(
      { length: Math.max(0, Math.ceil((end - start) / agendaSlotMinutes)) },
      (_, index) => {
        const value = start + index * agendaSlotMinutes;
        return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
      },
    );
  }, [agendaSlotMinutes, operatingHours.schedule]);

  useEffect(() => {
    if (!commerces.some((commerce) => commerce.id === selectedCommerce))
      setSelectedCommerce(commerces[0]?.id ?? "");
  }, [commerces, selectedCommerce]);
  useEffect(() => {
    if (!branches.some((branch) => branch.id === selectedBranch))
      setSelectedBranch(branches[0]?.id ?? "");
  }, [branches, selectedBranch]);
  useEffect(() => {
    setSelectedColumnIds((current) => {
      const available = new Set(visualColumns.map((column) => column.id));
      const preserved = current.filter((id) => available.has(id));
      return preserved.length
        ? preserved
        : visualColumns.map((column) => column.id);
    });
  }, [visualColumns]);
  useEffect(() => setMonthCursor(startOfMonth(selectedDate)), [selectedDate]);
  useEffect(() => {
    if (
      quickTimeFilter !== "all" &&
      !calendarTimeSlots.includes(quickTimeFilter)
    )
      setQuickTimeFilter("all");
  }, [calendarTimeSlots, quickTimeFilter]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setClientSearch(clientSearchInput.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [clientSearchInput]);
  useEffect(() => {
    if (administrationCatalog.error) {
      toast.error(
        "No se pudieron cargar los colores configurados; se muestra la paleta predeterminada.",
      );
    }
  }, [administrationCatalog.error]);
  useEffect(() => {
    setBookingDialogOpen(false);
    setBlockDialogOpen(false);
    setSensitiveRequest(null);
    setFinancialRecords({});
    setHistoryBooking(null);
    setHistoryEntries([]);
    setRecordBooking(null);
    setCustomerDetail(null);
    Object.values(sensitiveTimersRef.current).forEach((timer) =>
      window.clearTimeout(timer),
    );
    sensitiveTimersRef.current = {};
    createdCustomerByIntentRef.current = {};
  }, [bootstrap?.user.id]);
  useEffect(
    () => () => {
      if (sidebarBookingTimerRef.current != null)
        window.clearTimeout(sidebarBookingTimerRef.current);
      Object.values(sensitiveTimersRef.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
    },
    [],
  );

  const customers = useSchedulerQuery(
    () =>
      schedulerApi.searchCustomers({
        query: clientSearch,
        branchId: selectedBranch,
        page: 1,
        pageSize: 25,
      }),
    [clientSearch, selectedBranch],
    {
      queryKey: "customers:agenda-search",
      branchId: selectedBranch,
      enabled: clientSearch.length >= 2 && Boolean(selectedBranch),
    },
  );
  const customerOptions = useMemo(
    () => customers.data?.items.map(adaptSchedulerCustomerSummary) ?? [],
    [customers.data?.items],
  );
  const draftDateKey = bookingDraft
    ? schedulerLocalDateKey(bookingDraft.date)
    : "";
  const draftColumn = visualColumns.find(
    (column) => column.id === bookingDraft?.professionalId,
  );
  const availability = useSchedulerQuery(
    () =>
      schedulerApi.availability({
        branchId: selectedBranch,
        serviceProfileId: bookingDraft?.serviceId ?? "",
        date: draftDateKey,
        ...(draftColumn?.kind === "RESOURCE" && draftColumn.entityId
          ? { resourceId: draftColumn.entityId }
          : draftColumn?.entityId
            ? { professionalProfileId: draftColumn.entityId }
            : {}),
      }),
    [selectedBranch, bookingDraft?.serviceId, draftDateKey, draftColumn?.id],
    {
      queryKey: "agenda:availability",
      branchId: selectedBranch,
      enabled: Boolean(
        selectedBranch &&
        bookingDraft?.serviceId &&
        draftDateKey &&
        draftColumn?.entityId,
      ),
    },
  );
  const availableStartTimes = useMemo(() => {
    const timezone = availability.data?.timezone ?? branchProfile?.timezone;
    const times = timezone
      ? (availability.data?.slots.map((slot) =>
          slotLocalTime(slot, timezone),
        ) ?? [])
      : [];
    if (bookingDraft?.bookingId) {
      const existing = presentation?.appointments.find(
        (appointment) => appointment.id === bookingDraft.bookingId,
      );
      if (existing && existing.localDate === draftDateKey)
        times.push(existing.localStart);
    }
    return [...new Set(times)].sort();
  }, [
    availability.data,
    bookingDraft?.bookingId,
    branchProfile?.timezone,
    draftDateKey,
    presentation?.appointments,
  ]);

  function toggleColumn(columnId: string) {
    setSelectedColumnIds((current) =>
      current.includes(columnId)
        ? current.length === 1
          ? current
          : current.filter((id) => id !== columnId)
        : [...current, columnId],
    );
  }

  function handleDateStep(direction: "prev" | "next") {
    setSelectedDate((current) =>
      addDays(
        current,
        (direction === "prev" ? -1 : 1) * (currentView === "week" ? 7 : 1),
      ),
    );
  }

  function openNewBooking(
    columnId?: string,
    startTime?: string,
    date = selectedDate,
  ) {
    if (!canWrite) return;
    const sourceColumns = visibleColumns.length
      ? visibleColumns
      : visualColumns;
    setBookingDraft(
      createDraft(date, sourceColumns, columnId, startTime, services),
    );
    setBookingIntentKey(crypto.randomUUID());
    setClientSearchInput("");
    setConflict(null);
    setEmptySlotAction(null);
    setBookingDialogOpen(true);
  }

  function openEditBooking(booking: Booking) {
    if (!canWrite) return;
    const appointment = presentation?.appointments.find(
      (item) => item.id === bookingSourceId(booking),
    );
    if (
      !appointment ||
      !["PENDING", "RESERVED", "CONFIRMED"].includes(appointment.status)
    ) {
      toast.error("Esta cita ya no admite edición operativa.");
      return;
    }
    const [hour = "00", minute = "00"] = booking.start.split(":");
    setBookingDraft({
      bookingId: appointment.id,
      clientId: appointment.customerId,
      customerName: appointment.customerName,
      customerEmail: appointment.contact.email ?? "",
      serviceId: appointment.services[0]?.serviceProfileId ?? "",
      professionalId: booking.professionalId,
      date: new Date(`${appointment.localDate}T12:00:00`),
      hour,
      minute,
      status: booking.status,
      phone: appointment.contact.phone ?? "",
      paymentLabel: "Precio administrado por POS",
      notes: appointment.canonical.notes ?? "",
      internalNote: "",
    });
    setClientSearchInput(appointment.customerName);
    setConflict(null);
    setBookingDialogOpen(true);
  }

  function selectedSlot(): SchedulerAvailabilitySlotDto | null {
    if (!bookingDraft || !availability.data) return null;
    const time = `${bookingDraft.hour}:${bookingDraft.minute}`;
    return (
      availability.data.slots.find(
        (slot) =>
          slotLocalTime(slot, availability.data!.timezone) === time &&
          (draftColumn?.kind !== "RESOURCE" ||
            slot.resourceIds.includes(draftColumn.entityId ?? "")),
      ) ?? null
    );
  }

  async function saveBooking() {
    if (!bookingDraft || !branchProfile) return;
    if (bookingDraft.customerName.trim().length < 2) {
      toast.error("Selecciona un cliente o captura un nombre válido.");
      return;
    }
    const existing = bookingDraft.bookingId
      ? presentation?.appointments.find(
          (appointment) => appointment.id === bookingDraft.bookingId,
        )
      : null;
    const currentTimeUnchanged = Boolean(
      existing &&
      existing.localDate === draftDateKey &&
      existing.localStart === `${bookingDraft.hour}:${bookingDraft.minute}` &&
      existing.columnIds.includes(bookingDraft.professionalId),
    );
    const slot = selectedSlot();
    if (!slot && !currentTimeUnchanged) {
      toast.error(
        "Selecciona un horario disponible confirmado por el servidor.",
      );
      return;
    }
    setBookingSaving(true);
    setConflict(null);
    try {
      let customerId =
        bookingDraft.clientId ??
        createdCustomerByIntentRef.current[bookingIntentKey] ??
        null;
      if (!customerId) {
        if (!canCreateClient)
          throw new Error(
            "No tienes permiso para crear clientes. Selecciona un registro existente.",
          );
        const customer = await schedulerApi.createCustomer({
          displayName: bookingDraft.customerName.trim(),
          phone: bookingDraft.phone.trim() || null,
          email: bookingDraft.customerEmail.trim() || null,
          branchId: selectedBranch,
        });
        customerId = customer.id;
        createdCustomerByIntentRef.current[bookingIntentKey] = customer.id;
      }
      const startsAt = slot?.startsAt ?? existing?.startsAt;
      if (!startsAt || !customerId)
        throw new Error("No fue posible resolver la cita.");
      if (existing) {
        const nextStatus =
          schedulerBookingToCanonicalStatus[bookingDraft.status];
        if (!["PENDING", "RESERVED", "CONFIRMED"].includes(nextStatus))
          throw new Error(
            "Usa los controles de estado de la tarjeta para esta transición.",
          );
        const notes =
          [bookingDraft.notes.trim(), bookingDraft.internalNote.trim()]
            .filter(Boolean)
            .join("\n") || null;
        const servicesInput =
          existing.services.length > 1
            ? appointmentWriteServices(existing.canonical, startsAt)
            : [
                {
                  serviceProfileId: bookingDraft.serviceId,
                  professionalProfileIds: [
                    slot?.professionalProfileId ??
                      existing.services[0]?.participants.find(
                        (participant) => participant.role !== "RESOURCE",
                      )?.id ??
                      "",
                  ].filter(Boolean),
                  resourceIds:
                    slot?.resourceIds ??
                    existing.services[0]?.participants
                      .filter((participant) => participant.role === "RESOURCE")
                      .map((participant) => participant.id) ??
                    [],
                },
              ];
        const onlyMoves =
          startsAt !== existing.startsAt &&
          customerId === existing.customerId &&
          nextStatus === existing.status &&
          notes === existing.canonical.notes &&
          (existing.services.length > 1 ||
            bookingDraft.serviceId === existing.services[0]?.serviceProfileId);
        if (onlyMoves) {
          await schedulerApi.moveAppointment(existing.id, {
            startsAt,
            services: servicesInput,
            expectedVersion: existing.version,
          });
        } else {
          await schedulerApi.updateAppointment(existing.id, {
            branchId: selectedBranch,
            customerId,
            startsAt,
            status: nextStatus as "PENDING" | "RESERVED" | "CONFIRMED",
            notes,
            services: servicesInput,
            expectedVersion: existing.version,
          });
        }
      } else {
        if (!slot) throw new Error("Selecciona un horario disponible.");
        await schedulerApi.createAppointment(
          {
            branchId: selectedBranch,
            customerId,
            startsAt: slot.startsAt,
            status: schedulerBookingToCanonicalStatus[bookingDraft.status] as
              | "PENDING"
              | "RESERVED"
              | "CONFIRMED",
            notes:
              [bookingDraft.notes.trim(), bookingDraft.internalNote.trim()]
                .filter(Boolean)
                .join("\n") || null,
            services: [
              {
                serviceProfileId: bookingDraft.serviceId,
                professionalProfileIds: [slot.professionalProfileId],
                resourceIds: slot.resourceIds,
              },
            ],
          },
          bookingIntentKey,
        );
      }
      toast.success(existing ? "Reserva actualizada." : "Reserva creada.");
      setBookingDialogOpen(false);
      setBookingDraft(null);
      setClientSearchInput("");
      delete createdCustomerByIntentRef.current[bookingIntentKey];
      await agenda.reload();
    } catch (cause) {
      const message = schedulerApiErrorMessage(cause);
      if (schedulerApiErrorStatus(cause) === 409) setConflict(message);
      else toast.error(message);
    } finally {
      setBookingSaving(false);
    }
  }

  function openBlock(columnId: string, startTime: string) {
    if (!canWrite) return;
    setBlockDraft(
      createBlockDraft(selectedDate, visualColumns, columnId, startTime),
    );
    setBlockDialogOpen(true);
    setEmptySlotAction(null);
  }

  function editBlock(block: {
    id: string;
    sourceId?: string;
    professionalId: string;
    date?: string;
    start: string;
    end: string;
    label: string;
    variant: "unavailable" | "blocked";
  }) {
    if (!canWrite || block.variant === "unavailable") {
      toast.error(
        "Las excepciones de horario se administran desde Administración.",
      );
      return;
    }
    setBlockDraft(createBlockDraftFromBlock(block, selectedDate));
    setBlockDialogOpen(true);
  }

  async function saveBlock() {
    if (!blockDraft || !branchProfile) return;
    const reason = blockDraft.label?.trim();
    if (!reason) {
      toast.error("Captura el motivo del bloqueo.");
      return;
    }
    const column = visualColumns.find(
      (item) => item.id === blockDraft.professionalId,
    );
    if (!column?.entityId) return;
    const dateKey = schedulerLocalDateKey(blockDraft.date);
    const startsAt = schedulerLocalDateTimeToInstant(
      dateKey,
      `${blockDraft.startHour}:${blockDraft.startMinute}`,
      branchProfile.timezone,
    );
    const endsAt = schedulerLocalDateTimeToInstant(
      dateKey,
      `${blockDraft.endHour}:${blockDraft.endMinute}`,
      branchProfile.timezone,
    );
    if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
      toast.error(
        "El rango del bloqueo no es válido para la zona horaria de la sucursal.",
      );
      return;
    }
    const visual = blockDraft.blockId
      ? allBlocks.find((block) => block.id === blockDraft.blockId)
      : null;
    const existingId = visual?.sourceId ?? blockDraft.blockId?.split(":")[0];
    const existing = existingId
      ? presentation?.blocks.find((block) => block.id === existingId)
      : null;
    setBlockSaving(true);
    await runSchedulerMutation(
      () =>
        existing
          ? schedulerApi.updateScheduleBlock(existing.id, {
              branchId: selectedBranch,
              startsAt,
              endsAt,
              reason,
              professionalProfileId:
                column.kind === "PROFESSIONAL" ? column.entityId! : null,
              resourceId: column.kind === "RESOURCE" ? column.entityId! : null,
              expectedVersion: existing.version,
            })
          : schedulerApi.createScheduleBlock({
              branchId: selectedBranch,
              startsAt,
              endsAt,
              reason,
              professionalProfileId:
                column.kind === "PROFESSIONAL" ? column.entityId! : null,
              resourceId: column.kind === "RESOURCE" ? column.entityId! : null,
            }),
      {
        onSuccess: async () => {
          toast.success(existing ? "Bloqueo actualizado." : "Bloqueo creado.");
          setBlockDialogOpen(false);
          setBlockDraft(null);
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["agenda"],
      },
    );
    setBlockSaving(false);
  }

  async function cancelBlock(reason: string) {
    if (!blockDraft?.blockId) return;
    const visual = allBlocks.find((block) => block.id === blockDraft.blockId);
    const sourceId = visual?.sourceId ?? blockDraft.blockId.split(":")[0];
    const existing = presentation?.blocks.find(
      (block) => block.id === sourceId,
    );
    if (!existing) return;
    setBlockSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.cancelScheduleBlock(existing.id, {
          expectedVersion: existing.version,
          reason,
        }),
      {
        onSuccess: async () => {
          toast.success("Bloqueo cancelado.");
          setBlockDialogOpen(false);
          setBlockDraft(null);
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["agenda"],
      },
    );
    setBlockSaving(false);
  }

  function changeStatus(bookingId: string, status: BookingStatus) {
    const booking = allBookings.find((item) => item.id === bookingId);
    const appointment =
      booking &&
      presentation?.appointments.find(
        (item) => item.id === bookingSourceId(booking),
      );
    if (!appointment || !canWrite) return;
    if (status === "canceled") {
      setCancelRequest(booking);
      setCancelReason("");
      return;
    }
    void runSchedulerMutation(
      () =>
        schedulerApi.changeAppointmentStatus(appointment.id, {
          status: schedulerBookingToCanonicalStatus[status],
          expectedVersion: appointment.version,
        }),
      {
        onSuccess: async () => {
          toast.success("Estado actualizado.");
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["agenda"],
      },
    );
  }

  function requestCancel(bookingId: string) {
    const booking = allBookings.find((item) => item.id === bookingId);
    if (booking) {
      setCancelRequest(booking);
      setCancelReason("");
    }
  }

  async function confirmCancel() {
    if (!cancelRequest || !cancelReason.trim()) return;
    const appointment = presentation?.appointments.find(
      (item) => item.id === bookingSourceId(cancelRequest),
    );
    if (!appointment) return;
    await runSchedulerMutation(
      () =>
        schedulerApi.cancelAppointment(appointment.id, {
          expectedVersion: appointment.version,
          reason: cancelReason.trim(),
        }),
      {
        onSuccess: async () => {
          toast.success("Cita cancelada.");
          setCancelRequest(null);
          setCancelReason("");
        },
        onError: toast.error,
        onConflict: setConflict,
        invalidate: ["agenda"],
      },
    );
  }

  async function authorizeSensitive(
    booking: Booking,
    secret: string,
  ): Promise<string | null> {
    const purpose = sensitiveRequest?.purpose ?? "financial";
    const customerId = booking.clientId;
    if (!customerId || !selectedBranch)
      return "La cita no tiene un cliente canónico.";
    try {
      const purposeKey =
        purpose === "record"
          ? "CLIENT_RECORD_VIEW"
          : purpose === "history"
            ? "CLIENT_VISIT_HISTORY_VIEW"
            : "CLIENT_FINANCIAL_HISTORY_VIEW";
      const authorization = await schedulerApi.createAuthorization({
        secret,
        purpose: purposeKey,
        screenKey: "scheduler/clients",
        targetType: "Customer",
        targetId: customerId,
      });
      const timerKey = `${purpose}:${customerId}`;
      if (sensitiveTimersRef.current[timerKey])
        window.clearTimeout(sensitiveTimersRef.current[timerKey]);
      sensitiveTimersRef.current[timerKey] = window.setTimeout(
        () => {
          if (purpose === "financial") {
            setFinancialRecords((current) => {
              const next = { ...current };
              delete next[customerId];
              return next;
            });
          } else if (purpose === "history") {
            setHistoryBooking((current) =>
              current?.clientId === customerId ? null : current,
            );
            setHistoryEntries([]);
          } else {
            setRecordBooking((current) =>
              current?.clientId === customerId ? null : current,
            );
            setCustomerDetail(null);
          }
          delete sensitiveTimersRef.current[timerKey];
        },
        Math.max(0, new Date(authorization.expiresAt).getTime() - Date.now()),
      );
      if (purpose === "record") {
        setCustomerDetail(
          await schedulerApi.customerDetail(customerId, authorization.token),
        );
        setRecordBooking(booking);
      } else if (purpose === "history") {
        const history = await schedulerApi.customerVisits(
          customerId,
          authorization.token,
          { branchId: selectedBranch, page: 1, pageSize: 100 },
        );
        setHistoryEntries(
          history.items.map<ClientVisitHistoryEntry>((visit) => {
            const instant = visit.scheduledAt ?? visit.createdAt;
            const timezone =
              catalog.data?.branches.find(
                (branch) => branch.branchId === visit.branchId,
              )?.timezone ??
              branchProfile?.timezone ??
              "America/Mexico_City";
            const local = instantLocalParts(instant, timezone);
            const status = historyStatus(visit.status);
            return {
              bookingId: visit.id,
              date: local.date,
              start: visit.scheduledAt ? local.time : "--:--",
              end: visit.scheduledAt ? local.time : "--:--",
              serviceName: visit.serviceName,
              professionalName: visit.branchName,
              status,
              category:
                status === "attended"
                  ? "attended"
                  : status === "no-show"
                    ? "no-show"
                    : "scheduled",
            };
          }),
        );
        setHistoryBooking(booking);
      } else {
        const data = await schedulerApi.customerFinancialHistory(
          customerId,
          authorization.token,
          { branchId: selectedBranch, page: 1, pageSize: 100 },
        );
        setFinancialRecords((current) => ({
          ...current,
          [customerId]: {
            data,
            profile: {
              id: authorization.actor.userId,
              name: authorization.actor.name,
              role:
                bootstrap?.user.role === "SUPER_ADMIN"
                  ? "master"
                  : canAccess("clients", "ADMIN")
                    ? "admin"
                    : "seller",
              expiresAt: authorization.expiresAt,
            },
          },
        }));
      }
      setSensitiveRequest(null);
      return null;
    } catch (cause) {
      return schedulerApiErrorMessage(
        cause,
        "No fue posible autorizar la consulta.",
      );
    }
  }

  function openSensitive(booking: Booking, purpose: SensitivePurpose) {
    setSensitiveRequest({ booking, purpose });
  }

  function sidebarDateQuickCreate(date: Date) {
    setCurrentView("day");
    setSelectedDate(date);
    if (!canWrite) return;
    if (sidebarBookingTimerRef.current != null)
      window.clearTimeout(sidebarBookingTimerRef.current);
    sidebarBookingTimerRef.current = window.setTimeout(() => {
      openNewBooking(undefined, undefined, date);
      sidebarBookingTimerRef.current = null;
    }, 140);
  }

  const selectedCommerceName =
    commerces.find((commerce) => commerce.id === selectedCommerce)?.name ??
    "Sin comercio";
  const selectedBranchName =
    branches.find((branch) => branch.id === selectedBranch)?.name ??
    "Sin sucursal";
  const sensitiveBooking = sensitiveRequest?.booking ?? null;
  const financialProfiles = Object.fromEntries(
    Object.entries(financialRecords).map(([id, record]) => [
      id,
      record.profile,
    ]),
  );
  const clientAccountsByClient = Object.fromEntries(
    Object.entries(financialRecords).map(([id, record]) => [
      id,
      financialSummary(record.data),
    ]),
  );
  const paymentHistoryByClient = Object.fromEntries(
    Object.entries(financialRecords).map(([id, record]) => [
      id,
      financialPayments(record.data),
    ]),
  );
  const noop = () => undefined;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-[620px] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(195,165,131,0.14),transparent_16%),linear-gradient(180deg,#f3f0e9_0%,#f7f3ed_100%)] md:h-[100dvh]">
      <SchedulerHeader
        canWrite={canWrite}
        currentView={currentView}
        onDateStep={handleDateStep}
        onGoToday={() => setSelectedDate(new Date())}
        onOpenFilters={() =>
          window.matchMedia("(min-width: 1280px)").matches
            ? setResourcePanelOpen(true)
            : setFiltersOpen(true)
        }
        onOpenNewBooking={() => openNewBooking()}
        onRefresh={() => {
          void catalog.reload();
          void agenda.reload();
          if (canReadStatusColors) void administrationCatalog.reload();
        }}
        onViewChange={setCurrentView}
        refreshing={
          catalog.loading ||
          agenda.loading ||
          (canReadStatusColors && administrationCatalog.loading)
        }
        selectedBranchName={selectedBranchName}
        selectedCommerceName={selectedCommerceName}
        selectedDate={selectedDate}
        updatedLabel={`${agenda.data?.appointments.length ?? 0} citas cargadas`}
        weekDays={weekDays}
      />

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          className="w-[min(92vw,390px)] max-w-none overflow-y-auto border-[rgba(236,209,200,0.75)] bg-[#f8f3ed] p-0 sm:max-w-[390px]"
          side="right"
        >
          <SheetHeader className="border-b border-[rgba(236,209,200,0.75)] bg-white/80 px-5 py-5 pr-14 text-left">
            <SheetTitle className="page-title text-2xl text-[var(--scheduler-ink-strong)]">
              Filtros de agenda
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500">
              Ajusta comercio, sucursal, recursos, estado, hora y fecha.
            </SheetDescription>
          </SheetHeader>
          <SchedulerSidebar
            branches={branches}
            commerces={commerces}
            displayMode={displayMode}
            monthCursor={monthCursor}
            onBranchChange={setSelectedBranch}
            onCommerceChange={setSelectedCommerce}
            onDateQuickCreate={(date) => {
              setFiltersOpen(false);
              sidebarDateQuickCreate(date);
            }}
            onDisplayModeChange={setDisplayMode}
            onMonthCursorChange={setMonthCursor}
            onProfessionalQueryChange={setProfessionalQuery}
            onQuickTimeFilterChange={setQuickTimeFilter}
            onSelectedDateChange={setSelectedDate}
            onStatusFilterChange={setStatusFilter}
            onToggleProfessional={toggleColumn}
            professionalQuery={professionalQuery}
            professionals={sidebarColumns}
            quickTimeFilter={quickTimeFilter}
            selectedBranch={selectedBranch}
            selectedCommerce={selectedCommerce}
            selectedDate={selectedDate}
            selectedProfessionalIds={selectedColumnIds}
            statusFilter={statusFilter}
            timeSlots={calendarTimeSlots}
            visibleProfessionalCount={visibleColumns.length}
          />
        </SheetContent>
      </Sheet>

      <main className="flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden">
        {resourcePanelOpen ? (
          <aside className="hidden h-full min-h-0 w-[304px] shrink-0 overflow-y-auto overscroll-contain border-r border-[rgba(236,209,200,0.82)] xl:block">
            <SchedulerSidebar
              branches={branches}
              commerces={commerces}
              displayMode={displayMode}
              monthCursor={monthCursor}
              onBranchChange={setSelectedBranch}
              onCollapse={() => setResourcePanelOpen(false)}
              onCommerceChange={setSelectedCommerce}
              onDateQuickCreate={sidebarDateQuickCreate}
              onDisplayModeChange={setDisplayMode}
              onMonthCursorChange={setMonthCursor}
              onProfessionalQueryChange={setProfessionalQuery}
              onQuickTimeFilterChange={setQuickTimeFilter}
              onSelectedDateChange={setSelectedDate}
              onStatusFilterChange={setStatusFilter}
              onToggleProfessional={toggleColumn}
              professionalQuery={professionalQuery}
              professionals={sidebarColumns}
              quickTimeFilter={quickTimeFilter}
              selectedBranch={selectedBranch}
              selectedCommerce={selectedCommerce}
              selectedDate={selectedDate}
              selectedProfessionalIds={selectedColumnIds}
              statusFilter={statusFilter}
              timeSlots={calendarTimeSlots}
              visibleProfessionalCount={visibleColumns.length}
            />
          </aside>
        ) : null}

        <section className="scheduler-agenda-content flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6 xl:px-8">
          {!resourcePanelOpen ? (
            <button
              className="mb-4 hidden h-11 w-fit items-center gap-2 rounded-2xl border border-[rgba(236,209,200,0.82)] bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[var(--scheduler-accent)] hover:bg-[var(--scheduler-accent-soft)] xl:flex"
              onClick={() => setResourcePanelOpen(true)}
              type="button"
            >
              <PanelLeftOpen className="h-4 w-4" /> Mostrar recursos
            </button>
          ) : null}
          <ConflictNotice
            message={conflict}
            onReload={() => {
              setConflict(null);
              void agenda.reload();
            }}
          />
          <div className={conflict ? "mt-4 min-h-0 flex-1" : "min-h-0 flex-1"}>
            <QueryBoundary
              loading={catalog.loading || agenda.loading}
              error={catalog.error ?? agenda.error}
              onRetry={() => {
                void catalog.reload();
                void agenda.reload();
              }}
            >
              {displayMode === "calendar" ? (
                <SchedulerAgendaGrid
                  allBookings={allBookings}
                  canWrite={canWrite}
                  commerceName={selectedCommerceName}
                  clientAccountsByClient={clientAccountsByClient}
                  commerceOperatingHours={operatingHours}
                  currentView={currentView}
                  emptySlotAction={emptySlotAction}
                  financialAccessByClient={financialProfiles}
                  financialAuditEvents={[]}
                  financialHistoryReadOnly
                  onCloseSlotAction={() => setEmptySlotAction(null)}
                  onCreateBlock={openBlock}
                  onDeleteBooking={requestCancel}
                  onDeletePaymentHistory={noop}
                  onEditBlock={editBlock}
                  onEditBooking={openEditBooking}
                  onOpenBookingDetail={(booking) =>
                    openSensitive(booking, "record")
                  }
                  onOpenClientHistory={(booking) =>
                    openSensitive(booking, "history")
                  }
                  onOpenNewBooking={openNewBooking}
                  onOpenSlotAction={(professionalId, startTime) =>
                    setEmptySlotAction({ professionalId, startTime })
                  }
                  onPurchaseDecision={noop}
                  onRequestFinancialAccess={(booking) =>
                    openSensitive(booking, "financial")
                  }
                  onRevokeFinancialAccess={(booking) => {
                    if (!booking.clientId) return;
                    setFinancialRecords((current) => {
                      const next = { ...current };
                      delete next[booking.clientId!];
                      return next;
                    });
                  }}
                  onUpdateBookingStatus={changeStatus}
                  onUpdatePaymentHistory={noop}
                  selectedDate={selectedDate}
                  paymentHistoryByClient={paymentHistoryByClient}
                  slotMinutes={agendaSlotMinutes}
                  statusColors={statusColors}
                  visibleBlocks={visibleBlocks}
                  visibleBookings={visibleBookings}
                  visibleProfessionals={visibleColumns}
                  weekBookings={weekBookings}
                  weekBlocks={weekBlocks}
                  weekDays={weekDays}
                />
              ) : (
                <SchedulerAgendaList
                  bookings={listBookings}
                  canWrite={canWrite}
                  onOpenBooking={(booking) => openSensitive(booking, "record")}
                  onOpenNewBooking={() => openNewBooking()}
                  professionals={visibleColumns}
                  selectedDate={selectedDate}
                  statusColors={statusColors}
                />
              )}
            </QueryBoundary>
          </div>
        </section>
      </main>

      {bookingDraft ? (
        <SchedulerBookingDialog
          allowedStatuses={
            bookingDraft.bookingId
              ? [...createStatuses, bookingDraft.status]
              : createStatuses
          }
          availabilityBlocks={visibleBlocks}
          availabilityError={availability.error}
          availabilityLoading={availability.loading}
          availableStartTimes={availableStartTimes}
          bookings={allBookings}
          branches={branches}
          clients={customerOptions}
          columns={
            (presentation?.appointments.find(
              (appointment) => appointment.id === bookingDraft.bookingId,
            )?.services.length ?? 0) > 1
              ? []
              : visualColumns
          }
          draft={bookingDraft}
          canCreateClient={canCreateClient}
          onBranchChange={(branchId) => {
            setSelectedBranch(branchId);
            setBookingDialogOpen(false);
            setBookingDraft(null);
            toast.info(
              "Sucursal actualizada. Abre de nuevo la reserva para consultar su disponibilidad.",
            );
          }}
          onClientSearchQueryChange={setClientSearchInput}
          onDraftChange={setBookingDraft}
          onOpenChange={(open) => {
            setBookingDialogOpen(open);
            if (!open) {
              setBookingDraft(null);
              setClientSearchInput("");
            }
          }}
          onSave={() => {
            void saveBooking();
          }}
          open={bookingDialogOpen}
          saving={bookingSaving}
          selectedBranch={selectedBranch}
          serviceLocked={Boolean(
            bookingDraft.bookingId &&
            (presentation?.appointments.find(
              (appointment) => appointment.id === bookingDraft.bookingId,
            )?.services.length ?? 0) > 1,
          )}
          services={services}
          showCommercialFields={false}
          showInternalNote={false}
          statusColors={statusColors}
        />
      ) : null}

      <SchedulerBlockDialog
        draft={blockDraft}
        onDelete={(reason) => {
          void cancelBlock(reason);
        }}
        onDraftChange={setBlockDraft}
        onOpenChange={(open) => {
          setBlockDialogOpen(open);
          if (!open) setBlockDraft(null);
        }}
        onSave={() => {
          void saveBlock();
        }}
        open={blockDialogOpen}
        professionals={visualColumns}
        saving={blockSaving}
      />
      <SchedulerFinancialAccessDialog
        booking={sensitiveBooking}
        onAuthorize={authorizeSensitive}
        onOpenChange={(open) => {
          if (!open) setSensitiveRequest(null);
        }}
        open={Boolean(sensitiveRequest)}
        purpose={sensitiveRequest?.purpose ?? "financial"}
      />
      <SchedulerClientHistoryDialog
        booking={historyBooking}
        history={historyEntries}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryBooking(null);
            setHistoryEntries([]);
          }
        }}
        open={Boolean(historyBooking)}
      />
      <SchedulerCustomerRecordDialog
        booking={recordBooking}
        detail={customerDetail}
        onOpenChange={(open) => {
          if (!open) {
            setRecordBooking(null);
            setCustomerDetail(null);
          }
        }}
        open={Boolean(recordBooking && customerDetail)}
      />

      <AlertDialog
        open={Boolean(cancelRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelRequest(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent className="scheduler-modal-shell rounded-2xl border-0 bg-white">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  La cita se conservará en el historial y liberará su
                  disponibilidad.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label
              className="scheduler-modal-label"
              htmlFor="cancel-appointment-reason"
            >
              Motivo
            </label>
            <Textarea
              id="cancel-appointment-reason"
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Describe por qué se cancela"
              value={cancelReason}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar cita</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={!cancelReason.trim()}
              onClick={() => {
                void confirmCancel();
              }}
            >
              Cancelar cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
