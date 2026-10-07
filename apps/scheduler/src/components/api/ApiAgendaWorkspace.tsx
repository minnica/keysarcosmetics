"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, eachDayOfInterval, startOfMonth } from "date-fns";
import type {
  SchedulerAppointmentDto,
  SchedulerAvailabilitySlotDto,
  SchedulerCustomerFieldDefinitionDto,
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
  Input,
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
  buildSchedulerCalendarTimeSlots,
  buildSchedulerCanonicalOperatingHours,
  buildSchedulerVisualBlocks,
  buildSchedulerVisualBookings,
  buildSchedulerVisualColumns,
  buildSchedulerVisualServices,
  projectSchedulerActualAttendanceColumns,
  scopeSchedulerAgendaPresentationColumns,
  schedulerCanonicalToBookingStatus,
  schedulerBookingToCanonicalStatus,
  type SchedulerAgendaPresentation,
  type SchedulerOperatingHours,
} from "@/lib/scheduler-agenda-presentation";
import {
  buildSchedulerAppointmentMoveServices,
  buildSchedulerAgendaRange,
  loadAllSchedulerAppointments,
  schedulerLocalDateKey,
  schedulerLocalDateTimeToInstant,
} from "@/lib/scheduler-agenda-data";
import { canMoveSchedulerBooking } from "@/lib/scheduler-appointment-move";
import {
  defaultBookingStatusColors,
  type Booking,
  type BookingStatus,
  type BookingStatusColors,
  type BookingStatusLabels,
  type BranchOption,
  type CommerceOption,
} from "@/lib/scheduler-presentation";
import { buildSchedulerStatusLabels } from "@/lib/scheduler-status-presentation";
import type { SchedulerClient } from "@/lib/scheduler-client-presentation";
import {
  adaptSchedulerCustomerSummary,
  findSchedulerCustomerRegistrationMatches,
  normalizeSchedulerCustomerIdentityName,
  customerFieldWriteValue,
} from "@/lib/scheduler-customer-data";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type {
  DesignAppointmentAnswer,
  DesignAppointmentContext,
  DesignAppointmentJournalEntry,
  DesignAppointmentJournalKind,
  DesignAuthorizationScopeKey,
  DesignCustomerVisitHistoryDto,
  DesignOperationAgent,
  DesignOperationGrant,
  DesignOperationPurpose,
} from "../../../design/contracts";
import type { SchedulerFinancialProfile } from "@/lib/scheduler-access";
import {
  getSchedulerAgendaSlotMinutes,
  type SchedulerAgendaSlotMinutes,
} from "@/lib/scheduler-agenda-settings";
import {
  filterSchedulerAgendaColumns,
  isSchedulerCabinColumn,
  shouldFitSchedulerAgendaColumns,
  type SchedulerAgendaColumnMode,
} from "@/lib/scheduler-agenda-layout";
import { SchedulerHeader } from "@/components/scheduler/SchedulerHeader";
import {
  SchedulerSidebar,
  type SchedulerDisplayMode,
} from "@/components/scheduler/SchedulerSidebar";
import {
  SchedulerAgendaGrid,
  type SchedulerBookingMoveTarget,
} from "@/components/scheduler/SchedulerAgendaGrid";
import { SchedulerAgendaList } from "@/components/scheduler/SchedulerAgendaList";
import { SchedulerBookingDialog } from "@/components/scheduler/SchedulerBookingDialog";
import { SchedulerBlockDialog } from "@/components/scheduler/SchedulerBlockDialog";
import { SchedulerFinancialAccessDialog } from "@/components/scheduler/SchedulerFinancialAccessDialog";
import { SchedulerClientHistoryDialog } from "@/components/scheduler/SchedulerClientHistoryDialog";
import { SchedulerCustomerRecordDialog } from "@/components/scheduler/SchedulerCustomerRecordDialog";
import { SchedulerOperationAuthorizationDialog } from "@/components/scheduler/SchedulerOperationAuthorizationDialog";
import {
  SchedulerAppointmentJournalDialog,
  type AppointmentJournalCategoryOption,
} from "@/components/scheduler/SchedulerAppointmentJournalDialog";
import {
  getSchedulerSettingValue,
  resolveSchedulerSettingDocumentForScope,
  schedulerSettingDefinitions,
} from "@/lib/scheduler-settings-presentation";
import {
  createBlockDraft,
  createBlockDraftFromBlock,
  createDraft,
  formatMoney,
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

interface CustomerRegistrationReview {
  kind: "phone" | "name";
  customers: SchedulerClient[];
  selectedCustomerId: string;
}

interface CreateCustomerOptions {
  allowNameDuplicate?: boolean;
  customer?: SchedulerClient;
}

interface OperationPrompt {
  title: string;
  description: string;
  purpose: DesignOperationPurpose;
  scopeKey?: DesignAuthorizationScopeKey;
  targetType: string;
  targetId?: string;
}

interface AppointmentJournalRequest {
  booking: Booking;
  kind: Exclude<DesignAppointmentJournalKind, "CANCELLATION_REASON">;
}

const createStatuses: BookingStatus[] = ["pending", "reserved", "confirmed"];

function bookingSourceId(booking: Booking): string {
  return booking.sourceId ?? booking.id;
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

function journalCategoryOptions(
  value: unknown,
): AppointmentJournalCategoryOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, unknown>;
    const label = String(source["name"] ?? "").trim();
    if (!label) return [];
    return [
      {
        id: String(source["id"] ?? `post-sale-category-${index + 1}`),
        label,
        version: Number(source["version"] ?? 1) || 1,
      },
    ];
  });
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

function mergeOperatingHours(
  commerceId: string,
  schedules: SchedulerOperatingHours[],
): SchedulerOperatingHours {
  const dayNames = schedules[0]?.schedule.map((day) => day.day) ?? [];
  const toMinutes = (value: string) => {
    const [hours = "0", minutes = "0"] = value.split(":");
    return Number(hours) * 60 + Number(minutes);
  };
  const toTime = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return {
    commerceId,
    is24Hours: schedules.some((schedule) => schedule.is24Hours),
    schedule: dayNames.map((dayName, index) => {
      const windows = schedules
        .map((schedule) => schedule.schedule[index])
        .filter((day) => day?.enabled);
      return windows.length
        ? {
            day: dayName,
            enabled: true,
            open: toTime(
              Math.min(...windows.map((day) => toMinutes(day!.open))),
            ),
            close: toTime(
              Math.max(...windows.map((day) => toMinutes(day!.close))),
            ),
          }
        : { day: dayName, enabled: false, open: "00:00", close: "00:00" };
    }),
  };
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
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    () => bootstrap?.authorizedBranchIds ?? [],
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
  const [columnMode, setColumnMode] =
    useState<SchedulerAgendaColumnMode>("ALL");
  const [columnFitOverride, setColumnFitOverride] = useState<boolean | null>(
    null,
  );
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [agendaSlotMinutes] = useState<SchedulerAgendaSlotMinutes>(() =>
    getSchedulerAgendaSlotMinutes(),
  );
  const [emptySlotAction, setEmptySlotAction] =
    useState<EmptySlotAction | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [attendanceStatusAppointmentId, setAttendanceStatusAppointmentId] =
    useState<string | null>(null);
  const [attendanceTargetStatus, setAttendanceTargetStatus] = useState<
    "arrived" | "attended" | null
  >(null);
  const [finalizedPurchaseAppointmentIds, setFinalizedPurchaseAppointmentIds] =
    useState<Set<string>>(() => new Set());
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingIntentKey, setBookingIntentKey] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTentativeDate, setCancelTentativeDate] = useState("");
  const [cancelWithoutNextAppointment, setCancelWithoutNextAppointment] =
    useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [customerRegistrationReview, setCustomerRegistrationReview] =
    useState<CustomerRegistrationReview | null>(null);
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
  const [operationPrompt, setOperationPrompt] =
    useState<OperationPrompt | null>(null);
  const [operationAuthorizing, setOperationAuthorizing] = useState(false);
  const [operationAuthorizationError, setOperationAuthorizationError] =
    useState<string | null>(null);
  const [journalRequest, setJournalRequest] =
    useState<AppointmentJournalRequest | null>(null);
  const [journalEntries, setJournalEntries] = useState<
    DesignAppointmentJournalEntry[]
  >([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const pendingOperationRef = useRef<
    ((grant: DesignOperationGrant | null) => Promise<void>) | null
  >(null);
  const sidebarBookingTimerRef = useRef<number | null>(null);
  const createdCustomerByIntentRef = useRef<Record<string, string>>({});
  const preferredSpecialistLoadedForRef = useRef<string | null>(null);
  const sensitiveTimersRef = useRef<Record<string, number>>({});

  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    { queryKey: "operational-catalog" },
  );
  const customFieldDefinitions = useSchedulerQuery(
    () => schedulerApi.customerFieldDefinitions({ branchId: selectedBranch }),
    [selectedBranch],
    {
      queryKey: "agenda:customer-field-definitions",
      branchId: selectedBranch,
      enabled: Boolean(selectedBranch),
    },
  );
  const activeFieldDefinitions = useMemo(
    () =>
      (customFieldDefinitions.data ?? []).filter(
        (definition) => definition.active,
      ),
    [customFieldDefinitions.data],
  );
  const administrationCatalog = useSchedulerQuery(
    () => schedulerApi.administrationCatalog(),
    [],
    {
      queryKey: "administration-catalog:agenda-colors",
      enabled: canReadStatusColors,
    },
  );
  const authorizationAgents = useSchedulerQuery(
    () => schedulerDesignProposals.listAuthorizationAgents(),
    [],
    {
      queryKey: "agenda:representatives",
      enabled: schedulerDesignProposals.available,
    },
  );
  const branchCommercialModels = useSchedulerQuery(
    () => schedulerDesignProposals.listBranchCommercialModels(),
    [],
    {
      queryKey: "agenda:branch-commercial-models",
      enabled: schedulerDesignProposals.available,
    },
  );
  const selectedRepresentativeSource =
    branchCommercialModels.data?.find(
      (model) => model.branchId === selectedBranch,
    )?.mode === "SCHEDULER_STANDALONE"
      ? "SCHEDULER"
      : "POS_CRM";
  const representativeOptions = useMemo(
    () =>
      (authorizationAgents.data ?? [])
        .filter(
          (agent) =>
            agent.active &&
            agent.source === selectedRepresentativeSource &&
            (agent.source === "POS_CRM" ||
              /(vendedor|representante|asesor|ventas)/i.test(agent.role)),
        )
        .map((agent: DesignOperationAgent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          source: agent.source,
        })),
    [authorizationAgents.data, selectedRepresentativeSource],
  );
  const statusDefinitions = useSchedulerQuery(
    () => schedulerDesignProposals.statusDefinitions(selectedCommerce),
    [selectedCommerce],
    {
      queryKey: "agenda:status-visibility",
      enabled: Boolean(selectedCommerce) && schedulerDesignProposals.available,
    },
  );
  const visibleBookingStatuses = useMemo(
    () =>
      new Set<BookingStatus>(
        (statusDefinitions.data?.items ?? [])
          .filter(
            (definition) =>
              definition.canonicalStatus &&
              definition.active &&
              definition.visibleInAgenda,
          )
          .map(
            (definition) =>
              schedulerCanonicalToBookingStatus[definition.canonicalStatus!],
          ),
      ),
    [statusDefinitions.data?.items],
  );
  const statusLabels = useMemo(() => {
    const overrides: Partial<BookingStatusLabels> = {};
    for (const definition of statusDefinitions.data?.items ?? []) {
      if (
        !definition.canonicalStatus ||
        !definition.active ||
        !definition.visibleInAgenda
      )
        continue;
      overrides[schedulerCanonicalToBookingStatus[definition.canonicalStatus]] =
        definition.label;
    }
    return buildSchedulerStatusLabels(overrides);
  }, [statusDefinitions.data?.items]);
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
  const cabinOptions = useMemo(
    () =>
      (catalog.data?.resources ?? [])
        .filter(
          (resource) =>
            resource.active &&
            resource.kind === "ROOM" &&
            resource.branchProfileId === branchProfile?.id,
        )
        .map((resource) => ({
          id: resource.id,
          name: resource.name,
          capacity: resource.capacity,
        })),
    [branchProfile?.id, catalog.data?.resources],
  );
  const specialistOptions = useMemo(
    () =>
      (catalog.data?.professionals ?? [])
        .filter(
          (professional) =>
            professional.active &&
            Boolean(
              branchProfile?.id &&
              professional.branchProfileIds.includes(branchProfile.id),
            ),
        )
        .map((professional) => ({
          id: professional.id,
          name: professional.name,
        })),
    [branchProfile?.id, catalog.data?.professionals],
  );
  const agendaSettings = useSchedulerQuery(
    () =>
      schedulerApi.resolvedSetting("agenda", {
        commerceId: selectedCommerce,
        ...(branchProfile?.id ? { branchProfileId: branchProfile.id } : {}),
      }),
    [selectedCommerce, branchProfile?.id],
    {
      queryKey: "agenda:follow-up-settings",
      branchId: selectedBranch,
      enabled: Boolean(selectedCommerce),
    },
  );
  const effectiveAgendaSettings = useMemo(
    () =>
      agendaSettings.data
        ? resolveSchedulerSettingDocumentForScope(
            agendaSettings.data,
            "USER",
            schedulerSettingDefinitions.agenda.defaults,
          )
        : schedulerSettingDefinitions.agenda.defaults,
    [agendaSettings.data],
  );
  const showSellerComments = Boolean(
    getSchedulerSettingValue(effectiveAgendaSettings, "showSellerComments"),
  );
  const showPostSaleComments = Boolean(
    getSchedulerSettingValue(effectiveAgendaSettings, "showPostSaleComments"),
  );
  const postSaleCategories = useMemo(
    () =>
      journalCategoryOptions(
        getSchedulerSettingValue(effectiveAgendaSettings, "postSaleCategories"),
      ),
    [effectiveAgendaSettings],
  );
  const cancellationReasonOptions = useMemo(
    () =>
      journalCategoryOptions(
        getSchedulerSettingValue(
          effectiveAgendaSettings,
          "cancellationReasons",
        ),
      ),
    [effectiveAgendaSettings],
  );
  const rescheduleReasonOptions = useMemo(
    () =>
      journalCategoryOptions(
        getSchedulerSettingValue(effectiveAgendaSettings, "rescheduleReasons"),
      ),
    [effectiveAgendaSettings],
  );
  useEffect(() => {
    const customerId = bookingDraft?.clientId;
    if (
      !customerId ||
      bookingDraft.bookingId ||
      preferredSpecialistLoadedForRef.current === customerId ||
      !schedulerDesignProposals.available
    ) {
      return;
    }
    preferredSpecialistLoadedForRef.current = customerId;
    void schedulerDesignProposals
      .customerSpecialistPreference(customerId)
      .then((preference) => {
        if (
          !preference ||
          !specialistOptions.some(
            (specialist) => specialist.id === preference.specialistProfileId,
          )
        ) {
          return;
        }
        setBookingDraft((current) =>
          current && current.clientId === customerId
            ? {
                ...current,
                rememberSpecialist: true,
                visitors: current.visitors.map((visitor, index) =>
                  index === 0
                    ? {
                        ...visitor,
                        specialistProfileId: preference.specialistProfileId,
                      }
                    : visitor,
                ),
              }
            : current,
        );
      })
      .catch(() => {
        preferredSpecialistLoadedForRef.current = null;
      });
  }, [bookingDraft?.bookingId, bookingDraft?.clientId, specialistOptions]);
  const viewBranchIds = useMemo(
    () =>
      branches
        .map((branch) => branch.id)
        .filter((branchId) => selectedBranchIds.includes(branchId)),
    [branches, selectedBranchIds],
  );
  const branchScopeKey = viewBranchIds.join(",");
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: range.firstDate, end: range.lastDate }),
    [range.firstDate, range.lastDate],
  );
  const availableBranchIds = useMemo(
    () =>
      catalog.data
        ? branches
            .filter((branch) =>
              buildSchedulerCanonicalOperatingHours(catalog.data!, branch.id, [
                selectedDate,
              ]).schedule.some((day) => day.enabled),
            )
            .map((branch) => branch.id)
        : [],
    [branches, catalog.data, selectedDate],
  );

  const agenda = useSchedulerQuery(
    async () => {
      const entries = await Promise.all(
        viewBranchIds.map(async (branchId) => {
          const request = {
            branchId,
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
              branchId,
              from: range.from,
              to: range.to,
            }),
          ]);
          return [branchId, { appointments, blocks }] as const;
        }),
      );
      return { byBranch: Object.fromEntries(entries) };
    },
    [branchScopeKey, range.from, range.to, statusFilter],
    {
      queryKey: `agenda:${branchScopeKey}`,
      branchId: branchScopeKey,
      enabled: viewBranchIds.length > 0,
    },
  );

  const branchPresentations = useMemo(() => {
    const catalogData = catalog.data;
    const agendaData = agenda.data;
    if (!catalogData || !agendaData) return [];
    const visibleDates = new Set(range.visibleDateKeys);
    return viewBranchIds.flatMap((branchId) => {
      const profile = catalogBranches.find(
        (branch) => branch.branchId === branchId,
      );
      const branchAgenda = agendaData.byBranch[branchId];
      if (!profile || !branchAgenda) return [];
      const scoped = scopeSchedulerAgendaPresentationColumns(
        buildSchedulerAgendaPresentation({
          catalog: catalogData,
          branchId,
          appointments: branchAgenda.appointments,
          blocks: branchAgenda.blocks,
        }),
        branchId,
      );
      const visiblePresentation: SchedulerAgendaPresentation = {
        ...scoped,
        appointments: scoped.appointments.filter((appointment) =>
          visibleDates.has(appointment.localDate),
        ),
        blocks: scoped.blocks.filter((block) =>
          visibleDates.has(block.localDate),
        ),
      };
      return [
        {
          branchId,
          branchName: profile.branchName,
          profile,
          presentation: visiblePresentation,
        },
      ];
    });
  }, [
    agenda.data,
    catalog.data,
    catalogBranches,
    range.visibleDateKeys,
    viewBranchIds,
  ]);
  const presentation = useMemo<SchedulerAgendaPresentation | null>(
    () =>
      branchPresentations.length
        ? {
            columns: branchPresentations.flatMap(
              (entry) => entry.presentation.columns,
            ),
            appointments: branchPresentations.flatMap(
              (entry) => entry.presentation.appointments,
            ),
            blocks: branchPresentations.flatMap(
              (entry) => entry.presentation.blocks,
            ),
          }
        : null,
    [branchPresentations],
  );
  const appointmentContextIds = useMemo(
    () => presentation?.appointments.map((appointment) => appointment.id) ?? [],
    [presentation?.appointments],
  );
  const appointmentContextKey = appointmentContextIds.join(",");
  const appointmentContexts = useSchedulerQuery(
    () => schedulerDesignProposals.appointmentContexts(appointmentContextIds),
    [appointmentContextKey],
    {
      queryKey: `agenda:appointment-contexts:${appointmentContextKey}`,
      enabled:
        schedulerDesignProposals.available && appointmentContextIds.length > 0,
    },
  );
  const displayPresentation = useMemo(() => {
    if (!presentation || !schedulerDesignProposals.available)
      return presentation;
    const contexts = appointmentContexts.data ?? {};
    return projectSchedulerActualAttendanceColumns(
      presentation,
      Object.fromEntries(
        Object.entries(contexts).map(([appointmentId, context]) => [
          appointmentId,
          context.attendingSpecialistProfileIds,
        ]),
      ),
    );
  }, [appointmentContexts.data, presentation]);
  const appointmentContextByBookingId = useMemo(() => {
    const contexts = appointmentContexts.data ?? {};
    return Object.fromEntries(
      (displayPresentation
        ? buildSchedulerVisualBookings(displayPresentation)
        : []
      ).map((booking) => [
        booking.id,
        contexts[bookingSourceId(booking)] ??
          ({
            appointmentId: bookingSourceId(booking),
            attendeeNames: [booking.customerName],
            attendingSpecialistProfileIds: [],
            representativeId: null,
            representativeName: null,
            representativeRole: null,
            representativeSource: null,
            portfolioSellerName: null,
            hasPurchase: false,
            purchaseKind: null,
            saleAmount: 0,
            depositAmount: 0,
            nextAppointmentId: null,
            nextAppointmentAt: null,
          } satisfies DesignAppointmentContext),
      ]),
    );
  }, [appointmentContexts.data, displayPresentation]);
  const visualColumns = useMemo(
    () =>
      branchPresentations.flatMap((entry) =>
        buildSchedulerVisualColumns(
          entry.presentation,
          entry.profile.commerceId,
          entry.branchId,
        ).map((column) => ({ ...column, branchName: entry.branchName })),
      ),
    [branchPresentations],
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
    for (const definition of statusDefinitions.data?.items ?? []) {
      if (!definition.canonicalStatus || !definition.active) continue;
      next[schedulerCanonicalToBookingStatus[definition.canonicalStatus]] =
        definition.color;
    }
    return next;
  }, [
    administrationCatalog.data?.statusColors,
    selectedCommerce,
    statusDefinitions.data?.items,
  ]);
  const allBookings = useMemo(() => {
    const contexts = appointmentContexts.data ?? {};
    return (
      displayPresentation
        ? buildSchedulerVisualBookings(displayPresentation)
        : []
    ).map((booking) => {
      const context = contexts[bookingSourceId(booking)];
      if (!context?.hasPurchase) return booking;
      return {
        ...booking,
        purchased: true,
        purchaseType:
          context.purchaseKind === "LAYAWAY"
            ? ("layaway" as const)
            : ("cash" as const),
        purchaseAmount: context.saleAmount,
        paymentLabel:
          context.purchaseKind === "LAYAWAY"
            ? `Apartado · ${formatMoney(context.depositAmount)} de ${formatMoney(context.saleAmount)}`
            : `Compra · ${formatMoney(context.saleAmount)}`,
      };
    });
  }, [appointmentContexts.data, displayPresentation]);
  const allBlocks = useMemo(
    () =>
      catalog.data
        ? branchPresentations.flatMap((entry) =>
            buildSchedulerVisualBlocks(entry.presentation, catalog.data!),
          )
        : [],
    [branchPresentations, catalog.data],
  );
  const operatingHours = useMemo(
    () =>
      catalog.data
        ? mergeOperatingHours(
            selectedCommerce,
            viewBranchIds.map((branchId) =>
              buildSchedulerCanonicalOperatingHours(
                catalog.data!,
                branchId,
                weekDays,
              ),
            ),
          )
        : { commerceId: "", is24Hours: false, schedule: [] },
    [catalog.data, selectedCommerce, viewBranchIds, weekDays],
  );

  const modeColumns = useMemo(
    () => filterSchedulerAgendaColumns(visualColumns, columnMode),
    [columnMode, visualColumns],
  );
  const sidebarColumns = useMemo(() => {
    const query = professionalQuery.trim().toLocaleLowerCase("es-MX");
    return query
      ? modeColumns.filter((column) =>
          column.name.toLocaleLowerCase("es-MX").includes(query),
        )
      : modeColumns;
  }, [modeColumns, professionalQuery]);
  const visibleColumns = useMemo(() => {
    const selected = new Set(selectedColumnIds);
    const filtered = sidebarColumns.filter((column) => selected.has(column.id));
    return filtered.length ? filtered : sidebarColumns.slice(0, 1);
  }, [selectedColumnIds, sidebarColumns]);
  const visibleColumnIds = useMemo(
    () => new Set(visibleColumns.map((column) => column.id)),
    [visibleColumns],
  );
  const automaticColumnFit = shouldFitSchedulerAgendaColumns(
    viewportWidth,
    visibleColumns.length,
    resourcePanelOpen && viewportWidth >= 1280,
  );
  const columnsFitted = columnFitOverride ?? automaticColumnFit;
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
          (!statusDefinitions.data ||
            visibleBookingStatuses.has(booking.status)) &&
          matchesStatus &&
          (quickTimeFilter === "all" || booking.start === quickTimeFilter)
        );
      }),
    [
      allBookings,
      quickTimeFilter,
      selectedDate,
      statusFilter,
      statusDefinitions.data,
      visibleBookingStatuses,
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
          (!statusDefinitions.data ||
            visibleBookingStatuses.has(booking.status)) &&
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
  }, [
    allBookings,
    range.visibleDateKeys,
    statusDefinitions.data,
    statusFilter,
    visibleBookingStatuses,
    visibleColumns,
  ]);
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
              (!statusDefinitions.data ||
                visibleBookingStatuses.has(booking.status)) &&
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
      statusDefinitions.data,
      visibleBookings,
      visibleBookingStatuses,
      visibleColumnIds,
    ],
  );
  const calendarTimeSlots = useMemo(() => {
    return buildSchedulerCalendarTimeSlots(operatingHours, agendaSlotMinutes);
  }, [agendaSlotMinutes, operatingHours]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);
  useEffect(() => {
    if (!commerces.some((commerce) => commerce.id === selectedCommerce))
      setSelectedCommerce(commerces[0]?.id ?? "");
  }, [commerces, selectedCommerce]);
  useEffect(() => {
    const branchIds = branches.map((branch) => branch.id);
    setSelectedBranchIds((current) => {
      const preserved = branchIds.filter((id) => current.includes(id));
      const next = preserved.length ? preserved : branchIds;
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [branches]);
  useEffect(() => {
    if (!viewBranchIds.includes(selectedBranch)) {
      setSelectedBranch(viewBranchIds[0] ?? "");
    }
  }, [selectedBranch, viewBranchIds]);
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
    setAttendanceStatusAppointmentId(null);
    setAttendanceTargetStatus(null);
    setBlockDialogOpen(false);
    setSensitiveRequest(null);
    setFinancialRecords({});
    setHistoryBooking(null);
    setHistoryEntries([]);
    setRecordBooking(null);
    setCustomerDetail(null);
    setCustomerRegistrationReview(null);
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

  function changeColumnMode(mode: SchedulerAgendaColumnMode) {
    setColumnMode(mode);
    setColumnFitOverride(null);
  }

  function updateVisibleBranches(branchIds: string[]) {
    const ordered = branches
      .map((branch) => branch.id)
      .filter((branchId) => branchIds.includes(branchId));
    if (!ordered.length) return;
    setSelectedBranchIds(ordered);
    if (!ordered.includes(selectedBranch)) setSelectedBranch(ordered[0]!);
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
    preferredSpecialistLoadedForRef.current = null;
    const requestedColumn = visualColumns.find(
      (column) => column.id === columnId,
    );
    if (requestedColumn && !isSchedulerCabinColumn(requestedColumn)) {
      toast.error(
        "Las reservas se crean desde una cabina. La columna de especialista se completa al registrar quién atendió.",
      );
      return;
    }
    const selectedColumn =
      requestedColumn ??
      visualColumns.find(
        (column) =>
          column.branchIds.includes(selectedBranch) &&
          isSchedulerCabinColumn(column),
      ) ??
      visualColumns.find(isSchedulerCabinColumn);
    if (!selectedColumn) {
      toast.error(
        "Configura al menos una cabina en la sucursal antes de crear una reserva.",
      );
      return;
    }
    const targetBranchId = selectedColumn.branchIds[0] ?? selectedBranch;
    const sourceColumns = visualColumns.filter(
      (column) =>
        column.branchIds.includes(targetBranchId) &&
        isSchedulerCabinColumn(column),
    );
    const targetBranchProfile = catalogBranches.find(
      (branch) => branch.branchId === targetBranchId,
    );
    const targetServices =
      catalog.data && targetBranchProfile
        ? buildSchedulerVisualServices(catalog.data, targetBranchProfile.id)
        : services;
    if (targetBranchId && targetBranchId !== selectedBranch) {
      setSelectedBranch(targetBranchId);
    }
    const nextDraft = createDraft(
      date,
      sourceColumns,
      selectedColumn.id,
      startTime,
      targetServices,
    );
    const targetCabins = (catalog.data?.resources ?? []).filter(
      (resource) =>
        resource.active &&
        resource.kind === "ROOM" &&
        resource.branchProfileId === targetBranchProfile?.id,
    );
    const defaultCabin =
      targetCabins.find((cabin) => cabin.id === selectedColumn.entityId) ??
      targetCabins[0];
    const targetSpecialists = (catalog.data?.professionals ?? []).filter(
      (professional) =>
        professional.active &&
        Boolean(
          targetBranchProfile?.id &&
          professional.branchProfileIds.includes(targetBranchProfile.id),
        ),
    );
    setBookingDraft({
      ...nextDraft,
      cabinResourceId: defaultCabin?.id ?? "",
      cabinCapacity: defaultCabin?.capacity ?? 1,
      representativeId: representativeOptions[0]?.id ?? "",
      rememberSpecialist: false,
      visitors: Array.from(
        { length: defaultCabin?.capacity ?? 1 },
        (_value, index) => ({
          id: `visitor-${index + 1}`,
          customerId: null,
          name: "",
          specialistProfileId: targetSpecialists[index]?.id ?? "",
          purchased: null,
          purchaseAmount: "",
          purchaseKind: null,
          saleAmount: "",
          depositAmount: "",
        }),
      ),
    });
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
    if (!appointment || ["CANCELED", "NO_SHOW"].includes(appointment.status)) {
      toast.error("Esta cita ya no admite captura de atención o compra.");
      return;
    }
    if (appointment.branchId !== selectedBranch) {
      setSelectedBranch(appointment.branchId);
    }
    const [hour = "00", minute = "00"] = booking.start.split(":");
    const appointmentBranchProfile = catalogBranches.find(
      (branch) => branch.branchId === appointment.branchId,
    );
    const appointmentCabin = (catalog.data?.resources ?? []).find(
      (resource) =>
        resource.active &&
        resource.kind === "ROOM" &&
        resource.branchProfileId === appointmentBranchProfile?.id,
    );
    const appointmentSpecialists = (catalog.data?.professionals ?? []).filter(
      (professional) =>
        professional.active &&
        Boolean(
          appointmentBranchProfile?.id &&
          professional.branchProfileIds.includes(appointmentBranchProfile.id),
        ),
    );
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
      additionalAnswers: {},
      cabinResourceId: appointmentCabin?.id ?? "",
      cabinCapacity: appointmentCabin?.capacity ?? 1,
      representativeId: representativeOptions[0]?.id ?? "",
      rememberSpecialist: false,
      visitors: Array.from(
        { length: appointmentCabin?.capacity ?? 1 },
        (_value, index) => ({
          id: `visitor-${index + 1}`,
          customerId: index === 0 ? appointment.customerId : null,
          name: index === 0 ? appointment.customerName : "",
          specialistProfileId:
            appointmentSpecialists[index]?.id ??
            appointmentSpecialists[0]?.id ??
            "",
          purchased: null,
          purchaseAmount: "",
          purchaseKind: null,
          saleAmount: "",
          depositAmount: "",
        }),
      ),
    });
    setClientSearchInput(appointment.customerName);
    setConflict(null);
    setBookingDialogOpen(true);
    if (schedulerDesignProposals.available) {
      void Promise.all([
        schedulerDesignProposals.appointmentAnswers(appointment.id),
        schedulerDesignProposals.appointmentCabinVisit(appointment.id),
      ])
        .then(([answers, cabinVisit]) => {
          setFinalizedPurchaseAppointmentIds((current) => {
            const next = new Set(current);
            if (
              cabinVisit?.visitors.length &&
              cabinVisit.visitors.every(
                (visitor) =>
                  visitor.purchaseKind !== null || visitor.purchased !== null,
              )
            ) {
              next.add(appointment.id);
            } else {
              next.delete(appointment.id);
            }
            return next;
          });
          setBookingDraft((current) =>
            current?.bookingId === appointment.id
              ? {
                  ...current,
                  additionalAnswers: Object.fromEntries(
                    answers.map((answer) => [
                      answer.definitionId,
                      typeof answer.value === "number"
                        ? String(answer.value)
                        : answer.value,
                    ]),
                  ),
                  ...(cabinVisit
                    ? {
                        cabinResourceId: cabinVisit.cabinResourceId,
                        cabinCapacity: cabinVisit.cabinCapacity,
                        representativeId: cabinVisit.representativeId,
                        visitors: cabinVisit.visitors.map((visitor) => ({
                          ...visitor,
                          purchaseAmount:
                            visitor.purchaseAmount === null
                              ? ""
                              : String(visitor.purchaseAmount),
                          purchaseKind:
                            visitor.purchaseKind ??
                            (visitor.purchased === true
                              ? "FULL"
                              : visitor.purchased === false
                                ? "NONE"
                                : null),
                          saleAmount:
                            visitor.saleAmount === null
                              ? visitor.purchaseAmount === null
                                ? ""
                                : String(visitor.purchaseAmount)
                              : String(visitor.saleAmount),
                          depositAmount:
                            visitor.depositAmount === null
                              ? ""
                              : String(visitor.depositAmount),
                        })),
                      }
                    : {}),
                }
              : current,
          );
        })
        .catch(() => {
          toast.warning(
            "No fue posible cargar el detalle adicional de la cita.",
          );
        });
    }
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

  async function loadCustomerRegistrationMatches(
    displayName: string,
    phone: string,
  ) {
    const normalizedName = normalizeSchedulerCustomerIdentityName(displayName);
    const hasFullName = normalizedName.split(" ").filter(Boolean).length >= 2;
    const normalizedPhone = phone.replace(/\D/g, "");
    const queries = [
      ...(hasFullName ? [displayName.trim()] : []),
      ...(normalizedPhone ? [normalizedPhone] : []),
    ];
    const pages = await Promise.all(
      [...new Set(queries)].map((query) =>
        schedulerApi.searchCustomers({
          query,
          branchId: selectedBranch,
          page: 1,
          pageSize: 100,
        }),
      ),
    );
    const customersById = new Map<string, SchedulerClient>();
    for (const page of pages) {
      for (const customer of page.items) {
        const adapted = adaptSchedulerCustomerSummary(customer);
        customersById.set(adapted.id, adapted);
      }
    }
    return findSchedulerCustomerRegistrationMatches(
      [...customersById.values()],
      displayName,
      phone,
    );
  }

  function additionalAnswersForDraft(
    draft: BookingDraft,
    definitions: SchedulerCustomerFieldDefinitionDto[],
    requireCustomerFields: boolean,
  ): DesignAppointmentAnswer[] {
    return definitions.flatMap((definition) => {
      const rawValue = draft.additionalAnswers[definition.id];
      const empty =
        definition.type !== "BOOLEAN" &&
        (rawValue === undefined || String(rawValue).trim() === "");
      if (
        empty &&
        definition.required &&
        (definition.id !== "design-field-sales-owner" || requireCustomerFields)
      ) {
        throw new Error(`Completa la pregunta ${definition.label}.`);
      }
      if (empty) return [];
      const value = customerFieldWriteValue(definition, rawValue);
      if (
        definition.type === "NUMBER" &&
        (typeof value !== "number" || !Number.isFinite(value))
      ) {
        throw new Error(`${definition.label} debe ser un número válido.`);
      }
      if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
      ) {
        return [];
      }
      return [{ definitionId: definition.id, value }];
    });
  }

  async function saveNewCustomer(options: CreateCustomerOptions = {}) {
    if (!bookingDraft) return;
    const selectedCustomer = options.customer;
    if (selectedCustomer) {
      createdCustomerByIntentRef.current[bookingIntentKey] =
        selectedCustomer.id;
      setClientSearchInput(selectedCustomer.fullName);
      setBookingDraft((current) =>
        current
          ? {
              ...current,
              clientId: selectedCustomer.id,
              customerName: selectedCustomer.fullName,
              customerEmail: selectedCustomer.email,
              phone: selectedCustomer.phone,
            }
          : current,
      );
      toast.success("Cliente seleccionado. Continúa con la reserva.");
      return;
    }
    if (!canCreateClient) {
      toast.error("No tienes permiso para crear clientes.");
      return;
    }
    if (
      normalizeSchedulerCustomerIdentityName(bookingDraft.customerName)
        .split(" ")
        .filter(Boolean).length < 2
    ) {
      toast.error("Captura nombre y apellido del cliente.");
      return;
    }
    if (bookingDraft.phone.replace(/\D/g, "").length < 10) {
      toast.error("Captura un teléfono válido del cliente.");
      return;
    }

    setBookingSaving(true);
    try {
      const customerFields = additionalAnswersForDraft(
        bookingDraft,
        activeFieldDefinitions,
        true,
      );
      const matches = await loadCustomerRegistrationMatches(
        bookingDraft.customerName,
        bookingDraft.phone,
      );
      if (matches.phoneMatch) {
        setCustomerRegistrationReview({
          kind: "phone",
          customers: [matches.phoneMatch],
          selectedCustomerId: matches.phoneMatch.id,
        });
        return;
      }
      if (matches.nameMatches.length && !options.allowNameDuplicate) {
        setCustomerRegistrationReview({
          kind: "name",
          customers: matches.nameMatches,
          selectedCustomerId: matches.nameMatches[0]!.id,
        });
        return;
      }
      const customer = await schedulerApi.createCustomer({
        displayName: bookingDraft.customerName.trim(),
        phone: bookingDraft.phone.trim(),
        email: bookingDraft.customerEmail.trim() || null,
        branchId: selectedBranch,
        customFields: customerFields,
      });
      createdCustomerByIntentRef.current[bookingIntentKey] = customer.id;
      setClientSearchInput(bookingDraft.customerName.trim());
      setBookingDraft((current) =>
        current ? { ...current, clientId: customer.id } : current,
      );
      setCustomerRegistrationReview(null);
      toast.success("Cliente guardado. Continúa con los datos de la reserva.");
    } catch (cause) {
      toast.error(schedulerApiErrorMessage(cause));
    } finally {
      setBookingSaving(false);
    }
  }

  function requestOperationAuthorization(
    prompt: OperationPrompt,
    operation: (grant: DesignOperationGrant | null) => Promise<void>,
  ) {
    if (!bootstrap?.mockModeEnabled || !schedulerDesignProposals.available) {
      void operation(null);
      return;
    }
    pendingOperationRef.current = operation;
    setOperationAuthorizationError(null);
    setOperationPrompt(prompt);
  }

  async function authorizePendingOperation(code: string) {
    if (!operationPrompt || !pendingOperationRef.current) return;
    setOperationAuthorizing(true);
    setOperationAuthorizationError(null);
    try {
      const grant = await schedulerDesignProposals.authorizeOperation({
        code,
        purpose: operationPrompt.purpose,
        ...(operationPrompt.scopeKey
          ? { scopeKey: operationPrompt.scopeKey }
          : {}),
        targetType: operationPrompt.targetType,
        ...(operationPrompt.targetId
          ? { targetId: operationPrompt.targetId }
          : {}),
      });
      const operation = pendingOperationRef.current;
      pendingOperationRef.current = null;
      setOperationPrompt(null);
      await operation(grant);
    } catch (cause) {
      setOperationAuthorizationError(
        cause instanceof Error
          ? cause.message
          : "No fue posible autorizar el movimiento.",
      );
    } finally {
      setOperationAuthorizing(false);
    }
  }

  async function commitAuthorizedOperation(
    grant: DesignOperationGrant | null,
    input: {
      action: string;
      targetType: string;
      targetId: string;
      metadata?: Record<string, string>;
    },
  ) {
    if (!grant || !schedulerDesignProposals.available) return;
    await schedulerDesignProposals.commitOperation({
      token: grant.token,
      ...input,
    });
  }

  async function openAppointmentJournal(
    booking: Booking,
    kind: AppointmentJournalRequest["kind"],
  ) {
    const appointmentId = bookingSourceId(booking);
    setJournalRequest({ booking, kind });
    setJournalEntries([]);
    setJournalLoading(true);
    try {
      setJournalEntries(
        await schedulerDesignProposals.appointmentJournal(appointmentId),
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar el historial de la cita.",
      );
    } finally {
      setJournalLoading(false);
    }
  }

  function saveAppointmentJournal(input: {
    comment: string;
    category?: AppointmentJournalCategoryOption;
    tentativeDate?: string;
  }) {
    if (!journalRequest) return;
    const appointmentId = bookingSourceId(journalRequest.booking);
    const journalKind = journalRequest.kind;
    const purpose: DesignOperationPurpose =
      journalKind === "SELLER_COMMENT"
        ? "APPOINTMENT_COMMENT_CREATE"
        : journalKind === "POST_SALE_COMMENT"
          ? "POST_SALE_COMMENT_CREATE"
          : "APPOINTMENT_MOVE";
    requestOperationAuthorization(
      {
        title:
          journalKind === "RESCHEDULE_REASON"
            ? "Autorizar solicitud de reagenda"
            : "Autorizar comentario de cita",
        description:
          "El código identifica a la persona que realiza el registro y se consume en este movimiento.",
        purpose,
        targetType: "APPOINTMENT_JOURNAL",
        targetId: appointmentId,
      },
      async (grant) => {
        if (!grant) return;
        setJournalSaving(true);
        try {
          await schedulerDesignProposals.addAppointmentJournalEntry(
            appointmentId,
            {
              kind: journalKind,
              comment: input.comment,
              ...(input.category
                ? {
                    categoryId: input.category.id,
                    categoryLabel: input.category.label,
                    categoryVersion: input.category.version,
                  }
                : {}),
              ...(input.tentativeDate
                ? { tentativeDate: input.tentativeDate }
                : {}),
              authorizationToken: grant.token,
            },
          );
          await commitAuthorizedOperation(grant, {
            action:
              journalKind === "SELLER_COMMENT"
                ? "Comentario de vendedor"
                : journalKind === "POST_SALE_COMMENT"
                  ? "Comentario postventa"
                  : "Solicitud de reagenda",
            targetType: "APPOINTMENT_JOURNAL",
            targetId: appointmentId,
            metadata: {
              kind: journalKind,
              ...(input.category
                ? { categoryLabel: input.category.label }
                : {}),
              ...(input.tentativeDate
                ? { tentativeDate: input.tentativeDate }
                : {}),
            },
          });
          if (journalKind === "POST_SALE_COMMENT") {
            setJournalRequest(null);
            setJournalEntries([]);
          } else {
            setJournalEntries(
              await schedulerDesignProposals.appointmentJournal(appointmentId),
            );
          }
          toast.success("Seguimiento guardado en el historial de la cita.");
        } catch (cause) {
          toast.error(
            cause instanceof Error
              ? cause.message
              : "No fue posible guardar el seguimiento.",
          );
        } finally {
          setJournalSaving(false);
        }
      },
    );
  }

  function requestSaveBooking() {
    if (!bookingDraft) return;
    if (
      !bookingDraft.clientId &&
      !createdCustomerByIntentRef.current[bookingIntentKey]
    ) {
      toast.error(
        "Selecciona un cliente existente o guarda primero el nuevo cliente.",
      );
      return;
    }
    const editingId = bookingDraft.bookingId;
    const existingAppointment = editingId
      ? presentation?.appointments.find(
          (appointment) => appointment.id === editingId,
        )
      : null;
    const requiresAttendanceOutcome = Boolean(
      existingAppointment &&
      (attendanceStatusAppointmentId === existingAppointment.id ||
        !["PENDING", "RESERVED", "CONFIRMED"].includes(
          existingAppointment.status,
        )),
    );
    const selectedCabin = cabinOptions.find(
      (cabin) => cabin.id === bookingDraft.cabinResourceId,
    );
    if (schedulerDesignProposals.available) {
      if (!selectedCabin) {
        toast.error("Selecciona una cabina activa para la reserva.");
        return;
      }
      if (!bookingDraft.representativeId) {
        toast.error("Selecciona al vendedor o representante de esta cita.");
        return;
      }
      if (bookingDraft.visitors.length !== selectedCabin.capacity) {
        toast.error(
          `La ${selectedCabin.name} requiere ${selectedCabin.capacity} visitantes.`,
        );
        return;
      }
      const visitorNames = bookingDraft.visitors.map((visitor, index) =>
        index === 0 ? bookingDraft.customerName.trim() : visitor.name.trim(),
      );
      if (
        visitorNames.some((name) => name.length < 2) ||
        bookingDraft.visitors.some((visitor) => !visitor.specialistProfileId)
      ) {
        toast.error("Completa el nombre y especialista de cada visitante.");
        return;
      }
      if (
        new Set(
          bookingDraft.visitors.map((visitor) => visitor.specialistProfileId),
        ).size !== bookingDraft.visitors.length
      ) {
        toast.error("Asigna un especialista diferente a cada visitante.");
        return;
      }
      if (
        bookingDraft.visitors.some(
          (visitor) =>
            (requiresAttendanceOutcome && visitor.purchaseKind === null) ||
            ((visitor.purchaseKind === "FULL" ||
              visitor.purchaseKind === "LAYAWAY") &&
              (!Number.isFinite(Number(visitor.saleAmount)) ||
                Number(visitor.saleAmount) <= 0)) ||
            (visitor.purchaseKind === "LAYAWAY" &&
              (!Number.isFinite(Number(visitor.depositAmount)) ||
                Number(visitor.depositAmount) <= 0 ||
                Number(visitor.depositAmount) > Number(visitor.saleAmount))),
        )
      ) {
        toast.error(
          "No puedes marcar la asistencia: indica si cada visitante compró o no; las compras y apartados requieren montos válidos.",
        );
        return;
      }
    }
    const capturesOnlyAttendance = Boolean(
      existingAppointment &&
      (attendanceStatusAppointmentId === existingAppointment.id ||
        !["PENDING", "RESERVED", "CONFIRMED"].includes(
          existingAppointment.status,
        )),
    );
    const completesAttendanceCapture = Boolean(
      editingId && attendanceStatusAppointmentId === editingId,
    );
    const correctsFinalizedPurchase = Boolean(
      editingId && finalizedPurchaseAppointmentIds.has(editingId),
    );
    const continueWithPurchaseAuthorization = (
      appointmentGrant: DesignOperationGrant | null,
    ) => {
      const requiresPurchaseAuthorization =
        correctsFinalizedPurchase ||
        bookingDraft.visitors.some(
          (visitor) =>
            visitor.purchaseKind === "FULL" ||
            visitor.purchaseKind === "LAYAWAY",
        );
      if (
        bootstrap?.mockModeEnabled &&
        schedulerDesignProposals.available &&
        requiresPurchaseAuthorization
      ) {
        requestOperationAuthorization(
          {
            title: correctsFinalizedPurchase
              ? "Autorizar corrección de compra"
              : "Autorizar registro de compras",
            description: correctsFinalizedPurchase
              ? "La venta, compra o apartado ya fue registrado. Ingresa un código con permiso de corrección o el código master."
              : "Ingresa el código de un especialista o agente con permiso para registrar montos. No se acepta un vendedor sin este permiso.",
            purpose: correctsFinalizedPurchase
              ? "PURCHASE_CORRECTION"
              : "PURCHASE_CAPTURE",
            targetType: "APPOINTMENT_PURCHASE",
            ...(editingId ? { targetId: editingId } : {}),
          },
          (purchaseGrant) =>
            saveBooking(appointmentGrant, purchaseGrant),
        );
        return;
      }
      void saveBooking(appointmentGrant);
    };
    if (capturesOnlyAttendance && !completesAttendanceCapture) {
      continueWithPurchaseAuthorization(null);
      return;
    }
    requestOperationAuthorization(
      {
        title: completesAttendanceCapture
          ? attendanceTargetStatus === "arrived"
            ? "Autorizar llegada y atención"
            : "Autorizar asistencia"
          : editingId
            ? "Autorizar cambio de cita"
            : "Autorizar nueva reserva",
        description: completesAttendanceCapture
          ? "Confirma quién registra la llegada o asistencia. El estado sólo cambiará después de guardar atención, representante y compra."
          : editingId
            ? "Confirma quién realiza el cambio. El código autoriza sólo este movimiento."
            : "Confirma quién registra la reserva. El código autoriza sólo este movimiento.",
        purpose: completesAttendanceCapture
          ? "APPOINTMENT_STATUS_CHANGE"
          : editingId
            ? "APPOINTMENT_UPDATE"
            : "APPOINTMENT_CREATE",
        ...(completesAttendanceCapture
          ? {
              scopeKey:
                `STATUS:${attendanceTargetStatus === "arrived" ? "ARRIVED" : "ATTENDED"}` as DesignAuthorizationScopeKey,
            }
          : {}),
        targetType: "APPOINTMENT",
        ...(editingId ? { targetId: editingId } : {}),
      },
      async (grant) => continueWithPurchaseAuthorization(grant),
    );
  }

  async function saveBooking(
    grant: DesignOperationGrant | null = null,
    purchaseGrant: DesignOperationGrant | null = null,
  ) {
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
    const appointmentDetailsLocked = Boolean(
      existing &&
      (attendanceStatusAppointmentId === existing.id ||
        !["PENDING", "RESERVED", "CONFIRMED"].includes(existing.status)),
    );
    const completesAttendanceCapture = Boolean(
      existing && attendanceStatusAppointmentId === existing.id,
    );
    const currentTimeUnchanged = Boolean(
      existing &&
      existing.localDate === draftDateKey &&
      existing.localStart === `${bookingDraft.hour}:${bookingDraft.minute}` &&
      existing.columnIds.includes(bookingDraft.professionalId),
    );
    const slot = selectedSlot();
    if (!slot && !currentTimeUnchanged && !appointmentDetailsLocked) {
      toast.error(
        "Selecciona un horario disponible confirmado por el servidor.",
      );
      return;
    }
    let additionalAnswers: DesignAppointmentAnswer[] = [];
    if (!appointmentDetailsLocked) {
      try {
        additionalAnswers = additionalAnswersForDraft(
          bookingDraft,
          activeFieldDefinitions,
          false,
        );
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Revisa las preguntas configurables.",
        );
        return;
      }
    }
    setBookingSaving(true);
    setConflict(null);
    try {
      const customerId =
        bookingDraft.clientId ??
        createdCustomerByIntentRef.current[bookingIntentKey] ??
        null;
      if (!customerId) {
        throw new Error(
          "Selecciona un cliente existente o guarda primero el nuevo cliente.",
        );
      }
      const startsAt = slot?.startsAt ?? existing?.startsAt;
      if (!startsAt || !customerId)
        throw new Error("No fue posible resolver la cita.");
      let savedAppointment: SchedulerAppointmentDto;
      if (existing && appointmentDetailsLocked) {
        savedAppointment = existing.canonical;
      } else if (existing) {
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
            ? buildSchedulerAppointmentMoveServices(
                existing.canonical,
                startsAt,
              )
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
          savedAppointment = await schedulerApi.moveAppointment(existing.id, {
            startsAt,
            services: servicesInput,
            expectedVersion: existing.version,
          });
        } else {
          savedAppointment = await schedulerApi.updateAppointment(existing.id, {
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
        savedAppointment = await schedulerApi.createAppointment(
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
      if (schedulerDesignProposals.available) {
        if (!appointmentDetailsLocked) {
          await schedulerDesignProposals.saveAppointmentAnswers(
            savedAppointment.id,
            additionalAnswers,
          );
        }
        await schedulerDesignProposals.saveAppointmentCabinVisit(
          savedAppointment.id,
          {
            cabinResourceId: bookingDraft.cabinResourceId,
            cabinCapacity: bookingDraft.cabinCapacity,
            representativeId: bookingDraft.representativeId,
            visitors: bookingDraft.visitors.map((visitor, index) => ({
              id: visitor.id,
              customerId: index === 0 ? customerId : visitor.customerId,
              name:
                index === 0
                  ? bookingDraft.customerName.trim()
                  : visitor.name.trim(),
              specialistProfileId: visitor.specialistProfileId,
              purchased: visitor.purchased,
              purchaseAmount:
                visitor.purchaseKind === "FULL" ||
                visitor.purchaseKind === "LAYAWAY"
                  ? Number(visitor.saleAmount)
                  : null,
              purchaseKind: visitor.purchaseKind,
              saleAmount:
                visitor.purchaseKind === "FULL" ||
                visitor.purchaseKind === "LAYAWAY"
                  ? Number(visitor.saleAmount)
                  : null,
              depositAmount:
                visitor.purchaseKind === "FULL"
                  ? Number(visitor.saleAmount)
                  : visitor.purchaseKind === "LAYAWAY"
                    ? Number(visitor.depositAmount)
                    : null,
            })),
          },
          purchaseGrant?.token,
        );
        if (!existing) {
          await schedulerDesignProposals.saveCustomerSpecialistPreference(
            customerId,
            bookingDraft.rememberSpecialist
              ? (bookingDraft.visitors[0]?.specialistProfileId ?? null)
              : null,
          );
        }
      }
      if (completesAttendanceCapture) {
        savedAppointment = await schedulerApi.changeAppointmentStatus(
          savedAppointment.id,
          {
            status:
              attendanceTargetStatus === "arrived" ? "ARRIVED" : "ATTENDED",
            expectedVersion: savedAppointment.version,
            ...(grant && schedulerDesignProposals.available
              ? { authorizationToken: grant.token }
              : {}),
          },
        );
      }
      await commitAuthorizedOperation(grant, {
        action: completesAttendanceCapture
          ? `Cambio de estado a ${attendanceTargetStatus ?? "attended"}`
          : existing
            ? "Cambio de cita"
            : "Alta de cita",
        targetType: "APPOINTMENT",
        targetId: savedAppointment.id,
        metadata: {
          branchId: selectedBranch,
          customerId,
          serviceId: bookingDraft.serviceId,
        },
      });
      if (purchaseGrant) {
        const purchasedVisitors = bookingDraft.visitors.filter(
          (visitor) =>
            visitor.purchaseKind === "FULL" ||
            visitor.purchaseKind === "LAYAWAY",
        );
        await commitAuthorizedOperation(purchaseGrant, {
          action:
            purchaseGrant.purpose === "PURCHASE_CORRECTION"
              ? "Corrección de compra por visitante"
              : "Registro de compra por visitante",
          targetType: "APPOINTMENT_PURCHASE",
          targetId: savedAppointment.id,
          metadata: {
            cabinResourceId: bookingDraft.cabinResourceId,
            visitorCount: String(bookingDraft.visitors.length),
            purchaseCount: String(purchasedVisitors.length),
            purchaseTotal: String(
              purchasedVisitors.reduce(
                (total, visitor) => total + Number(visitor.saleAmount),
                0,
              ),
            ),
            depositTotal: String(
              purchasedVisitors.reduce(
                (total, visitor) =>
                  total +
                  (visitor.purchaseKind === "FULL"
                    ? Number(visitor.saleAmount)
                    : Number(visitor.depositAmount)),
                0,
              ),
            ),
            layawayCount: String(
              purchasedVisitors.filter(
                (visitor) => visitor.purchaseKind === "LAYAWAY",
              ).length,
            ),
          },
        });
        setFinalizedPurchaseAppointmentIds((current) =>
          new Set(current).add(savedAppointment.id),
        );
      }
      toast.success(
        appointmentDetailsLocked
          ? "Atención y compras registradas."
          : existing
            ? "Reserva actualizada."
            : "Reserva creada.",
      );
      setBookingDialogOpen(false);
      setBookingDraft(null);
      setAttendanceStatusAppointmentId(null);
      setAttendanceTargetStatus(null);
      setCustomerRegistrationReview(null);
      setClientSearchInput("");
      delete createdCustomerByIntentRef.current[bookingIntentKey];
      await agenda.reload();
      await appointmentContexts.reload();
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
    const targetBranchId = visualColumns.find(
      (column) => column.id === columnId,
    )?.branchIds[0];
    if (targetBranchId && targetBranchId !== selectedBranch) {
      setSelectedBranch(targetBranchId);
    }
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
    branchId?: string;
  }) {
    if (!canWrite || block.variant === "unavailable") {
      toast.error(
        "Las excepciones de horario se administran desde Administración.",
      );
      return;
    }
    if (block.branchId && block.branchId !== selectedBranch) {
      setSelectedBranch(block.branchId);
    }
    setBlockDraft(createBlockDraftFromBlock(block, selectedDate));
    setBlockDialogOpen(true);
  }

  function requestSaveBlock() {
    const targetId = blockDraft?.blockId?.split(":")[0];
    requestOperationAuthorization(
      {
        title: targetId
          ? "Autorizar cambio de bloqueo"
          : "Autorizar nuevo bloqueo",
        description:
          "El bloqueo modifica la disponibilidad y quedará asociado al responsable.",
        purpose: targetId ? "SCHEDULE_BLOCK_UPDATE" : "SCHEDULE_BLOCK_CREATE",
        targetType: "SCHEDULE_BLOCK",
        ...(targetId ? { targetId } : {}),
      },
      (grant) => saveBlock(grant),
    );
  }

  async function saveBlock(grant: DesignOperationGrant | null = null) {
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
    let savedBlockId = existing?.id ?? "";
    setBlockSaving(true);
    await runSchedulerMutation(
      async () => {
        const saved = existing
          ? await schedulerApi.updateScheduleBlock(existing.id, {
              branchId: selectedBranch,
              startsAt,
              endsAt,
              reason,
              professionalProfileId:
                column.kind === "PROFESSIONAL" ? column.entityId! : null,
              resourceId: column.kind === "RESOURCE" ? column.entityId! : null,
              expectedVersion: existing.version,
            })
          : await schedulerApi.createScheduleBlock({
              branchId: selectedBranch,
              startsAt,
              endsAt,
              reason,
              professionalProfileId:
                column.kind === "PROFESSIONAL" ? column.entityId! : null,
              resourceId: column.kind === "RESOURCE" ? column.entityId! : null,
            });
        savedBlockId = saved.id;
        return saved;
      },
      {
        onSuccess: async () => {
          await commitAuthorizedOperation(grant, {
            action: existing ? "Cambio de bloqueo" : "Alta de bloqueo",
            targetType: "SCHEDULE_BLOCK",
            targetId: savedBlockId,
            metadata: { branchId: selectedBranch, reason },
          });
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

  async function cancelBlock(
    reason: string,
    grant: DesignOperationGrant | null = null,
  ) {
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
          await commitAuthorizedOperation(grant, {
            action: "Cancelación de bloqueo",
            targetType: "SCHEDULE_BLOCK",
            targetId: existing.id,
            metadata: { branchId: selectedBranch, reason },
          });
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

  function moveBookingByDrag(
    booking: Booking,
    target: SchedulerBookingMoveTarget,
  ) {
    const appointment = presentation?.appointments.find(
      (item) => item.id === bookingSourceId(booking),
    );
    if (!appointment || !canWrite) return;
    if (!canMoveSchedulerBooking(booking.status, booking.purchased === true)) {
      toast.error(
        booking.purchased
          ? "La cita ya tiene una compra o apartado y no puede moverse."
          : booking.status === "arrived" || booking.status === "attended"
            ? "Una cita que ya llegó o fue atendida no puede moverse."
            : "Este estado final no permite mover la cita.",
      );
      return;
    }
    if (target.branchId !== appointment.branchId) {
      toast.error(
        "Para cambiar de sucursal utiliza Editar; el arrastre sólo mueve dentro de la misma sucursal.",
      );
      return;
    }
    const targetColumn = visualColumns.find(
      (column) => column.id === target.columnId,
    );
    if (!targetColumn?.entityId) {
      toast.error("No se encontró la cabina o especialista de destino.");
      return;
    }
    if (
      targetColumn.kind === "RESOURCE" &&
      targetColumn.resourceKind !== "ROOM"
    ) {
      toast.error("Sólo puedes reasignar la cita a una cabina o especialista.");
      return;
    }
    const targetDate = schedulerLocalDateKey(target.date);
    const startsAt = schedulerLocalDateTimeToInstant(
      targetDate,
      target.startTime,
      appointment.timezone,
    );
    if (!startsAt) {
      toast.error(
        "La hora elegida no existe en la zona horaria de la sucursal.",
      );
      return;
    }
    const roomResourceIds =
      catalog.data?.resources
        .filter((resource) => resource.kind === "ROOM")
        .map((resource) => resource.id) ?? [];
    const services = buildSchedulerAppointmentMoveServices(
      appointment.canonical,
      startsAt,
      targetColumn.kind === "RESOURCE"
        ? {
            roomResourceId: targetColumn.entityId,
            roomResourceIds,
            ...(targetColumn.capacity
              ? { roomCapacity: targetColumn.capacity }
              : {}),
          }
        : { professionalProfileId: targetColumn.entityId },
    );
    const assignmentChanged = services.some((service, index) => {
      const currentService = appointment.canonical.services[index];
      if (!currentService) return true;
      const currentProfessionalIds = currentService.professionals.map(
        (professional) => professional.professionalProfileId,
      );
      const currentResourceIds = currentService.resources.map(
        (resource) => resource.resourceId,
      );
      return (
        service.professionalProfileIds.join("|") !==
          currentProfessionalIds.join("|") ||
        (service.resourceIds ?? []).join("|") !== currentResourceIds.join("|")
      );
    });
    if (startsAt === appointment.startsAt && !assignmentChanged) {
      toast.info("La cita ya se encuentra en ese horario.");
      return;
    }

    requestOperationAuthorization(
      {
        title: "Autorizar cambio de cita",
        description: `Mover ${appointment.customerName} de ${booking.start} a ${target.startTime} en ${targetColumn.name}. El servidor validará horario, cabina y especialistas antes de guardar.`,
        purpose: "APPOINTMENT_MOVE",
        targetType: "APPOINTMENT",
        targetId: appointment.id,
      },
      async (grant) => {
        await runSchedulerMutation(
          () =>
            schedulerApi.moveAppointment(appointment.id, {
              startsAt,
              services,
              expectedVersion: appointment.version,
            }),
          {
            onSuccess: async () => {
              await commitAuthorizedOperation(grant, {
                action: assignmentChanged
                  ? "Cambio de horario y asignación por arrastre"
                  : "Cambio de horario por arrastre",
                targetType: "APPOINTMENT",
                targetId: appointment.id,
                metadata: {
                  branchId: appointment.branchId,
                  previousStartsAt: appointment.startsAt,
                  startsAt,
                  previousColumnId: booking.professionalId,
                  targetColumnId: target.columnId,
                  targetColumnKind: target.columnKind,
                  targetColumnLabel: targetColumn.name,
                  assignmentChanged: String(assignmentChanged),
                  source: "DRAG_DROP",
                },
              });
              await appointmentContexts.reload();
              toast.success(
                `Cita movida al ${targetDate} a las ${target.startTime} en ${targetColumn.name}.`,
              );
            },
            onError: toast.error,
            onConflict: setConflict,
            invalidate: ["agenda", "reports"],
          },
        );
      },
    );
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
      setCancelTentativeDate("");
      setCancelWithoutNextAppointment(false);
      return;
    }
    if (
      status === "attended" &&
      Date.now() < new Date(appointment.endsAt).getTime()
    ) {
      toast.error(
        `Podrás marcar asistencia al terminar la sesión: ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.endsAt))}.`,
      );
      return;
    }
    const requiresAttentionCapture =
      schedulerDesignProposals.available &&
      (status === "arrived" ||
        (status === "attended" &&
          !["ARRIVED", "WAITING"].includes(appointment.status)));
    if (requiresAttentionCapture) {
      setAttendanceStatusAppointmentId(appointment.id);
      setAttendanceTargetStatus(status === "arrived" ? "arrived" : "attended");
      openEditBooking(booking);
      toast.info(
        "El color no cambiará hasta guardar representante, especialistas y compra o no compra de cada visitante.",
      );
      return;
    }
    requestOperationAuthorization(
      {
        title: "Autorizar cambio de estado",
        description:
          "El código personal quedará asociado al cambio de estado, no a la cita.",
        purpose: "APPOINTMENT_STATUS_CHANGE",
        scopeKey:
          `STATUS:${schedulerBookingToCanonicalStatus[status]}` as DesignAuthorizationScopeKey,
        targetType: "APPOINTMENT",
        targetId: appointment.id,
      },
      async (grant) => {
        await runSchedulerMutation(
          () =>
            schedulerApi.changeAppointmentStatus(appointment.id, {
              status: schedulerBookingToCanonicalStatus[status],
              expectedVersion: appointment.version,
              ...(grant && schedulerDesignProposals.available
                ? { authorizationToken: grant.token }
                : {}),
            }),
          {
            onSuccess: async () => {
              await commitAuthorizedOperation(grant, {
                action: `Cambio de estado a ${status}`,
                targetType: "APPOINTMENT",
                targetId: appointment.id,
                metadata: { branchId: selectedBranch, status },
              });
              await appointmentContexts.reload();
              toast.success("Estado actualizado.");
            },
            onError: toast.error,
            onConflict: setConflict,
            invalidate: ["agenda"],
          },
        );
      },
    );
  }

  function requestCancel(bookingId: string) {
    const booking = allBookings.find((item) => item.id === bookingId);
    if (booking) {
      setCancelRequest(booking);
      setCancelReason("");
      setCancelTentativeDate("");
      setCancelWithoutNextAppointment(false);
    }
  }

  async function confirmCancel() {
    if (
      !cancelRequest ||
      !cancelReason.trim() ||
      (!cancelTentativeDate && !cancelWithoutNextAppointment)
    )
      return;
    const appointment = presentation?.appointments.find(
      (item) => item.id === bookingSourceId(cancelRequest),
    );
    if (!appointment) return;
    requestOperationAuthorization(
      {
        title: "Autorizar cancelación",
        description:
          "Confirma al responsable de cancelar la cita. La autorización se consume una sola vez.",
        purpose: "APPOINTMENT_CANCEL",
        scopeKey: "STATUS:CANCELED",
        targetType: "APPOINTMENT",
        targetId: appointment.id,
      },
      async (grant) => {
        await runSchedulerMutation(
          () =>
            schedulerApi.cancelAppointment(appointment.id, {
              expectedVersion: appointment.version,
              reason: cancelReason.trim(),
            }),
          {
            onSuccess: async () => {
              if (grant && schedulerDesignProposals.available) {
                await schedulerDesignProposals.addAppointmentJournalEntry(
                  appointment.id,
                  {
                    kind: "CANCELLATION_REASON",
                    comment: cancelWithoutNextAppointment
                      ? `${cancelReason.trim()}\nNo cuenta con una próxima cita.`
                      : cancelReason.trim(),
                    ...(cancelTentativeDate
                      ? { tentativeDate: cancelTentativeDate }
                      : {}),
                    authorizationToken: grant.token,
                  },
                );
              }
              await commitAuthorizedOperation(grant, {
                action: "Cancelación de cita",
                targetType: "APPOINTMENT",
                targetId: appointment.id,
                metadata: {
                  branchId: selectedBranch,
                  reason: cancelReason.trim(),
                  nextAppointment: cancelTentativeDate || "SIN_PROXIMA_CITA",
                },
              });
              await appointmentContexts.reload();
              toast.success("Cita cancelada.");
              setCancelRequest(null);
              setCancelReason("");
              setCancelTentativeDate("");
              setCancelWithoutNextAppointment(false);
            },
            onError: toast.error,
            onConflict: setConflict,
            invalidate: ["agenda"],
          },
        );
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
        const history: DesignCustomerVisitHistoryDto =
          await schedulerApi.customerVisits(
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
              purchase: visit.purchase ?? null,
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
  const visibleBranchNames = branches
    .filter((branch) => viewBranchIds.includes(branch.id))
    .map((branch) => branch.name);
  const selectedBranchName = visibleBranchNames.length
    ? `${visibleBranchNames.length} ${visibleBranchNames.length === 1 ? "sucursal" : "sucursales"} · ${visibleBranchNames.join(", ")}`
    : "Sin sucursal";
  const agendaAppointmentCount = Object.values(
    agenda.data?.byBranch ?? {},
  ).reduce((total, entry) => total + entry.appointments.length, 0);
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
  const registrationReviewCustomer =
    customerRegistrationReview?.customers.find(
      (customer) =>
        customer.id === customerRegistrationReview.selectedCustomerId,
    ) ?? null;
  const noop = () => undefined;

  return (
    <div className="scheduler-agenda-shell flex h-[calc(100dvh-4rem)] min-h-[560px] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(195,165,131,0.14),transparent_16%),linear-gradient(180deg,#f3f0e9_0%,#f7f3ed_100%)]">
      <SchedulerHeader
        canWrite={canWrite}
        columnsFitted={columnsFitted}
        currentView={currentView}
        onDateStep={handleDateStep}
        onGoToday={() => setSelectedDate(new Date())}
        onOpenFilters={() =>
          window.matchMedia("(min-width: 1280px)").matches
            ? setResourcePanelOpen(true)
            : setFiltersOpen(true)
        }
        onOpenNewBooking={() => openNewBooking()}
        onPrintDay={() => {
          setCurrentView("day");
          setColumnFitOverride(true);
          window.setTimeout(() => window.print(), 180);
        }}
        onRefresh={() => {
          void catalog.reload();
          void agenda.reload();
          if (canReadStatusColors) void administrationCatalog.reload();
        }}
        onViewChange={setCurrentView}
        onToggleColumnFit={() => setColumnFitOverride(!columnsFitted)}
        refreshing={
          catalog.loading ||
          agenda.loading ||
          (canReadStatusColors && administrationCatalog.loading)
        }
        selectedBranchName={selectedBranchName}
        selectedCommerceName={selectedCommerceName}
        selectedDate={selectedDate}
        updatedLabel={`${agendaAppointmentCount} citas · ${viewBranchIds.length} sucursales`}
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
            availableBranchIds={availableBranchIds}
            branches={branches}
            columnMode={columnMode}
            commerces={commerces}
            displayMode={displayMode}
            monthCursor={monthCursor}
            onBranchSelectionChange={updateVisibleBranches}
            onCommerceChange={setSelectedCommerce}
            onColumnModeChange={changeColumnMode}
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
            selectedBranchIds={viewBranchIds}
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
          <aside className="scheduler-agenda-sidebar hidden h-full min-h-0 w-[304px] shrink-0 overflow-y-auto overscroll-contain border-r border-[rgba(236,209,200,0.82)] xl:block">
            <SchedulerSidebar
              availableBranchIds={availableBranchIds}
              branches={branches}
              columnMode={columnMode}
              commerces={commerces}
              displayMode={displayMode}
              monthCursor={monthCursor}
              onBranchSelectionChange={updateVisibleBranches}
              onCollapse={() => setResourcePanelOpen(false)}
              onColumnModeChange={changeColumnMode}
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
              selectedBranchIds={viewBranchIds}
              selectedCommerce={selectedCommerce}
              selectedDate={selectedDate}
              selectedProfessionalIds={selectedColumnIds}
              statusFilter={statusFilter}
              timeSlots={calendarTimeSlots}
              visibleProfessionalCount={visibleColumns.length}
            />
          </aside>
        ) : null}

        <section className="scheduler-agenda-content flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5 xl:px-4">
          {!resourcePanelOpen ? (
            <button
              className="scheduler-agenda-resource-toggle mb-4 hidden h-11 w-fit items-center gap-2 rounded-2xl border border-[rgba(236,209,200,0.82)] bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[var(--scheduler-accent)] hover:bg-[var(--scheduler-accent-soft)] xl:flex"
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
                  appointmentContexts={appointmentContextByBookingId}
                  canWrite={canWrite}
                  columnsFitted={columnsFitted}
                  commerceName={selectedCommerceName}
                  clientAccountsByClient={clientAccountsByClient}
                  commerceOperatingHours={operatingHours}
                  currentView={currentView}
                  emptySlotAction={emptySlotAction}
                  enableCabinVisitFlow={schedulerDesignProposals.available}
                  financialAccessByClient={financialProfiles}
                  financialAuditEvents={[]}
                  financialHistoryReadOnly
                  onCloseSlotAction={() => setEmptySlotAction(null)}
                  onCreateBlock={openBlock}
                  onDeleteBooking={requestCancel}
                  onDeletePaymentHistory={noop}
                  onEditBlock={editBlock}
                  onEditBooking={openEditBooking}
                  onMoveBooking={moveBookingByDrag}
                  onOpenBookingDetail={(booking) =>
                    openSensitive(booking, "record")
                  }
                  onOpenClientHistory={(booking) =>
                    openSensitive(booking, "history")
                  }
                  onOpenSellerComment={(booking) =>
                    void openAppointmentJournal(booking, "SELLER_COMMENT")
                  }
                  onOpenPostSaleComment={(booking) =>
                    void openAppointmentJournal(booking, "POST_SALE_COMMENT")
                  }
                  onOpenReschedule={(booking) =>
                    void openAppointmentJournal(booking, "RESCHEDULE_REASON")
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
                  statusLabels={statusLabels}
                  showSellerComments={showSellerComments}
                  showPostSaleComments={showPostSaleComments}
                  visibleBlocks={visibleBlocks}
                  visibleBookings={visibleBookings}
                  visibleProfessionals={visibleColumns}
                  visibleStatuses={
                    statusDefinitions.data ? visibleBookingStatuses : undefined
                  }
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
                  statusLabels={statusLabels}
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
          additionalFieldDefinitions={activeFieldDefinitions}
          hideAdditionalFields={
            attendanceStatusAppointmentId === bookingDraft.bookingId
          }
          appointmentDetailsLocked={Boolean(
            bookingDraft.bookingId &&
            (attendanceStatusAppointmentId === bookingDraft.bookingId ||
              !["PENDING", "RESERVED", "CONFIRMED"].includes(
                presentation?.appointments.find(
                  (appointment) => appointment.id === bookingDraft.bookingId,
                )?.status ?? "",
              )),
          )}
          availableStartTimes={availableStartTimes}
          cabinOptions={cabinOptions}
          bookings={allBookings}
          branches={branches}
          clients={customerOptions}
          columns={
            (presentation?.appointments.find(
              (appointment) => appointment.id === bookingDraft.bookingId,
            )?.services.length ?? 0) > 1
              ? []
              : visualColumns.filter(
                  (column) =>
                    column.branchIds.includes(selectedBranch) &&
                    (Boolean(bookingDraft.bookingId) ||
                      isSchedulerCabinColumn(column)),
                )
          }
          draft={bookingDraft}
          enableCabinVisitFlow={schedulerDesignProposals.available}
          canCreateClient={canCreateClient}
          onBranchChange={(branchId) => {
            setSelectedBranch(branchId);
            setSelectedBranchIds((current) =>
              current.includes(branchId) ? current : [...current, branchId],
            );
            setBookingDialogOpen(false);
            setBookingDraft(null);
            setAttendanceStatusAppointmentId(null);
            setAttendanceTargetStatus(null);
            setCustomerRegistrationReview(null);
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
              preferredSpecialistLoadedForRef.current = null;
              setAttendanceStatusAppointmentId(null);
              setAttendanceTargetStatus(null);
              setClientSearchInput("");
              setCustomerRegistrationReview(null);
            }
          }}
          onSave={() => {
            requestSaveBooking();
          }}
          onSaveNewClient={() => {
            void saveNewCustomer();
          }}
          open={bookingDialogOpen}
          saving={bookingSaving}
          selectedBranch={selectedBranch}
          representativeOptions={representativeOptions}
          specialistOptions={specialistOptions}
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
          const targetId = blockDraft?.blockId?.split(":")[0];
          if (!targetId) return;
          requestOperationAuthorization(
            {
              title: "Autorizar cancelación de bloqueo",
              description:
                "Confirma al responsable de liberar este espacio de agenda.",
              purpose: "SCHEDULE_BLOCK_DELETE",
              targetType: "SCHEDULE_BLOCK",
              targetId,
            },
            (grant) => cancelBlock(reason, grant),
          );
        }}
        onDraftChange={setBlockDraft}
        onOpenChange={(open) => {
          setBlockDialogOpen(open);
          if (!open) setBlockDraft(null);
        }}
        onSave={() => {
          requestSaveBlock();
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
        open={Boolean(customerRegistrationReview)}
        onOpenChange={(open) => {
          if (!open) setCustomerRegistrationReview(null);
        }}
      >
        <AlertDialogContent className="scheduler-modal-shell max-w-xl rounded-2xl border-0 bg-white">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <AlertDialogTitle>
                  {customerRegistrationReview?.kind === "phone"
                    ? "Teléfono ya registrado"
                    : "Posible cliente duplicado"}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {customerRegistrationReview?.kind === "phone"
                    ? "Este número pertenece a un cliente existente. El teléfono debe ser único y no se puede crear otro perfil con el mismo número."
                    : "Encontramos uno o más perfiles con el mismo nombre y apellidos. Selecciona el cliente que deseas usar o confirma que se trata de otra persona."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div
            className="space-y-2"
            role="radiogroup"
            aria-label="Clientes coincidentes"
          >
            {customerRegistrationReview?.customers.map((customer) => {
              const selected =
                customer.id === customerRegistrationReview.selectedCustomerId;
              return (
                <button
                  aria-checked={selected}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-[var(--scheduler-accent)] bg-[var(--scheduler-accent-soft)]"
                      : "border-[rgba(236,209,200,0.95)] bg-white hover:bg-[rgba(245,237,228,0.55)]"
                  }`}
                  key={customer.id}
                  onClick={() =>
                    setCustomerRegistrationReview((current) =>
                      current
                        ? { ...current, selectedCustomerId: customer.id }
                        : current,
                    )
                  }
                  role="radio"
                  type="button"
                >
                  <span className="block font-semibold text-[var(--scheduler-ink-strong)]">
                    {customer.fullName}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {customer.phone || "Sin teléfono"}
                    {customer.email ? ` · ${customer.email}` : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <AlertDialogFooter className="sm:flex-wrap">
            <AlertDialogCancel>Revisar datos</AlertDialogCancel>
            {customerRegistrationReview?.kind === "name" ? (
              <AlertDialogAction
                className="border border-[rgba(236,209,200,0.95)] bg-white text-[var(--scheduler-ink-strong)] hover:bg-[rgba(245,237,228,0.75)]"
                onClick={() => {
                  setCustomerRegistrationReview(null);
                  void saveNewCustomer({ allowNameDuplicate: true });
                }}
              >
                Crear perfil independiente
              </AlertDialogAction>
            ) : null}
            <AlertDialogAction
              disabled={!registrationReviewCustomer}
              onClick={() => {
                if (!registrationReviewCustomer) return;
                const customer = registrationReviewCustomer;
                setCustomerRegistrationReview(null);
                void saveNewCustomer({ customer });
              }}
            >
              Usar cliente seleccionado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(cancelRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelRequest(null);
            setCancelReason("");
            setCancelTentativeDate("");
            setCancelWithoutNextAppointment(false);
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
            {cancellationReasonOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {cancellationReasonOptions.map((reason) => (
                  <button
                    className="rounded-full border border-[#e6d8ca] bg-[#fbf7f2] px-3 py-1.5 text-xs text-[#72583f] transition hover:bg-[#f3e8dc]"
                    key={reason.id}
                    onClick={() => setCancelReason(reason.label)}
                    type="button"
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            ) : null}
            <Textarea
              id="cancel-appointment-reason"
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Describe por qué se cancela"
              value={cancelReason}
            />
          </div>
          <div className="space-y-3 rounded-2xl border border-[#eadfd4] bg-[#fbf7f2] p-4">
            <div>
              <label
                className="scheduler-modal-label"
                htmlFor="cancel-next-appointment"
              >
                Próxima cita tentativa
              </label>
              <Input
                className="mt-1.5"
                disabled={cancelWithoutNextAppointment}
                id="cancel-next-appointment"
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => {
                  setCancelTentativeDate(event.target.value);
                  if (event.target.value)
                    setCancelWithoutNextAppointment(false);
                }}
                type="date"
                value={cancelTentativeDate}
              />
            </div>
            <button
              aria-checked={cancelWithoutNextAppointment}
              className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#e6d8ca] bg-white px-3 py-2.5 text-left"
              onClick={() => {
                setCancelWithoutNextAppointment((current) => !current);
                setCancelTentativeDate("");
              }}
              role="switch"
              type="button"
            >
              <span className="text-sm font-medium text-slate-700">
                No cuenta con una próxima cita
              </span>
              <span
                aria-hidden="true"
                className={`relative h-6 w-11 rounded-full transition ${
                  cancelWithoutNextAppointment ? "bg-[#263649]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                    cancelWithoutNextAppointment ? "left-6" : "left-1"
                  }`}
                />
              </span>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar cita</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={
                !cancelReason.trim() ||
                (!cancelTentativeDate && !cancelWithoutNextAppointment)
              }
              onClick={() => {
                void confirmCancel();
              }}
            >
              Cancelar cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {journalRequest ? (
        <SchedulerAppointmentJournalDialog
          categories={
            journalRequest.kind === "RESCHEDULE_REASON"
              ? rescheduleReasonOptions
              : postSaleCategories
          }
          customerName={journalRequest.booking.customerName}
          entries={journalEntries}
          kind={journalRequest.kind}
          loading={journalLoading}
          onOpenChange={(open) => {
            if (!open) {
              setJournalRequest(null);
              setJournalEntries([]);
            }
          }}
          onSubmit={saveAppointmentJournal}
          open
          saving={journalSaving}
        />
      ) : null}
      <SchedulerOperationAuthorizationDialog
        description={
          operationPrompt?.description ??
          "Confirma el responsable del movimiento."
        }
        error={operationAuthorizationError}
        onAuthorize={(code) => void authorizePendingOperation(code)}
        onOpenChange={(open) => {
          if (open) return;
          pendingOperationRef.current = null;
          setOperationPrompt(null);
          setOperationAuthorizationError(null);
        }}
        open={Boolean(operationPrompt)}
        saving={operationAuthorizing}
        title={operationPrompt?.title ?? "Autorizar movimiento"}
      />
    </div>
  );
}
