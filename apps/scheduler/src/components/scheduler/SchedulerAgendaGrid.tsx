"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import {
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@cosmetics/ui";
import { Ban, CalendarDays, DoorOpen, Plus, UserRound } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  type AvailabilityBlock,
  type Booking,
  type BookingStatus,
  type BookingStatusColors,
  type BookingStatusLabels,
  type Professional,
  type SchedulerView,
} from "@/lib/scheduler-presentation";
import {
  getSchedulerClientAccessKey,
  type SchedulerFinancialAuditEvent,
  type SchedulerFinancialProfile,
} from "@/lib/scheduler-access";
import {
  addMinutesToTime,
  getAppointmentStyle,
  getClientPurchaseAccount,
  getClientPaymentHistory,
  getCurrentTimeLineStyle,
  getMinutesFromTime,
  getSchedulerCardTop,
  getSingleCellAppointmentStyle,
  schedulerComfortableLayout,
  schedulerCompactLayout,
  schedulerDenseLayout,
  schedulerUltraDenseLayout,
  type ClientPaymentHistoryEntry,
  type ClientPurchaseAccount,
  type SchedulerAgendaLayoutMetrics,
  type EmptySlotAction,
} from "./scheduler-utils";
import {
  getSchedulerCalendarRange,
  isOutsideSchedulerOperatingHours,
  type SchedulerOperatingHours,
} from "@/lib/scheduler-agenda-presentation";
import { SchedulerBookingCard } from "./SchedulerBookingCard";
import { SchedulerStatusBadge } from "./SchedulerStatusBadge";
import {
  getSchedulerStatusColorTokens,
  shouldShowSchedulerAgendaStatusLabel,
} from "@/lib/scheduler-status-presentation";
import { canMoveSchedulerBooking } from "@/lib/scheduler-appointment-move";
import {
  getSchedulerBookingOverlapLayout,
  isSchedulerCabinColumn,
} from "@/lib/scheduler-agenda-layout";
import type {
  DesignAppointmentAttendeeContext,
  DesignAppointmentContext,
  DesignCustomerLayawaySummary,
} from "../../../design/contracts";
import { SchedulerProtectedPhone } from "./SchedulerProtectedPhone";
import { SchedulerPosTicketPreview } from "./SchedulerPosTicketPreview";

interface SchedulerAgendaGridProps {
  currentView: SchedulerView;
  slotMinutes: number;
  visibleProfessionals: Professional[];
  visibleBookings: Booking[];
  statusColors: BookingStatusColors;
  statusLabels: BookingStatusLabels;
  allBookings: Booking[];
  visibleBlocks: AvailabilityBlock[];
  selectedDate: Date;
  commerceOperatingHours: SchedulerOperatingHours;
  commerceName: string;
  weekDays: Date[];
  weekBookings: Array<Booking & { dayOffset: number }>;
  weekBlocks?: Array<AvailabilityBlock & { dayOffset: number }>;
  emptySlotAction: EmptySlotAction | null;
  onOpenSlotAction: (professionalId: string, startTime: string) => void;
  onCloseSlotAction: () => void;
  onOpenNewBooking: (professionalId?: string, startTime?: string) => void;
  onCreateBlock: (professionalId: string, startTime: string) => void;
  onEditBlock: (block: AvailabilityBlock) => void;
  onEditBooking: (booking: Booking, visitorId?: string) => void;
  onMoveBooking: (booking: Booking, target: SchedulerBookingMoveTarget) => void;
  onDeleteBooking: (bookingId: string) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    status: BookingStatus,
    visitorId?: string,
  ) => void;
  onPurchaseDecision: (booking: Booking, purchased: boolean) => void;
  onOpenBookingDetail: (booking: Booking, view: "payment" | "record") => void;
  onOpenClientHistory: (booking: Booking) => void;
  onOpenSellerComment: (booking: Booking) => void;
  onOpenPostSaleComment: (booking: Booking) => void;
  onOpenLayawayPayment: (
    booking: Booking,
    layaway: DesignCustomerLayawaySummary,
  ) => void;
  onOpenReschedule: (booking: Booking) => void;
  financialAccessByClient: Record<string, SchedulerFinancialProfile>;
  financialAuditEvents: SchedulerFinancialAuditEvent[];
  onRequestFinancialAccess: (booking: Booking) => void;
  onRevokeFinancialAccess: (booking: Booking) => void;
  onUpdatePaymentHistory: (
    clientBooking: Booking,
    paymentBookingId: string,
    amount: number,
    tentativeAmount?: number,
  ) => void;
  onDeletePaymentHistory: (
    clientBooking: Booking,
    paymentBookingId: string,
  ) => void;
  canWrite?: boolean;
  canViewCustomerPhone?: boolean;
  enableCabinVisitFlow?: boolean;
  showSellerComments?: boolean;
  showPostSaleComments?: boolean;
  financialHistoryReadOnly?: boolean;
  clientAccountsByClient?: Record<string, ClientPurchaseAccount>;
  paymentHistoryByClient?: Record<string, ClientPaymentHistoryEntry[]>;
  columnsFitted?: boolean;
  appointmentContexts?: Record<string, DesignAppointmentContext>;
  visibleStatuses?: ReadonlySet<BookingStatus> | undefined;
}

export interface SchedulerBookingMoveTarget {
  date: Date;
  columnId: string;
  branchId: string;
  columnKind: "PROFESSIONAL" | "RESOURCE";
  resourceKind?: "ROOM" | "EQUIPMENT" | "STATION" | "OTHER";
  startTime: string;
}

interface DayOverlayBooking {
  booking: Booking;
  style: CSSProperties;
}

interface DayOverlayBlock {
  block: AvailabilityBlock;
  style: CSSProperties;
}

interface SlotActionOverlay {
  professionalId: string;
  startTime: string;
  style: CSSProperties;
}

function nextAppointmentLabel(nextAppointmentAt?: string | null) {
  if (!nextAppointmentAt) return "No cuenta con una próxima cita";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(nextAppointmentAt));
}

const appointmentCurrencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

interface SchedulerDisplayedAttendee {
  attendee: DesignAppointmentAttendeeContext | undefined;
  contextIndex: number;
  name: string;
}

function displayedAttendeesForColumn(
  booking: Booking,
  context: DesignAppointmentContext | undefined,
  column: Professional | undefined,
): SchedulerDisplayedAttendee[] {
  const attendees = context?.attendees ?? [];
  if (attendees.length) {
    const indexed = attendees.map((attendee, contextIndex) => ({
      attendee,
      contextIndex,
      name: attendee.name,
    }));
    if (column?.kind !== "PROFESSIONAL" || !column.entityId) return indexed;

    const assigned = indexed.filter(
      ({ attendee }) => attendee.specialistProfileId === column.entityId,
    );
    return assigned.length ? assigned : indexed;
  }

  const names = context?.attendeeNames.length
    ? context.attendeeNames
    : [booking.customerName];
  return names.map((name, contextIndex) => ({
    attendee: undefined,
    contextIndex,
    name,
  }));
}

function attendeePurchaseAmount(
  entry: SchedulerDisplayedAttendee,
  booking: Booking,
  displayedCount: number,
): number | undefined {
  if (entry.attendee) {
    return ["FULL", "LAYAWAY"].includes(entry.attendee.purchaseKind ?? "") &&
      entry.attendee.saleAmount > 0
      ? entry.attendee.saleAmount
      : undefined;
  }
  return displayedCount === 1 && booking.purchased === true
    ? booking.purchaseAmount
    : undefined;
}

function specialistFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? "Sin asignar";
}

function attendeeBookingStatus(
  attendee: DesignAppointmentAttendeeContext | undefined,
  fallback: BookingStatus,
): BookingStatus {
  if (!attendee) return fallback;
  return {
    PENDING: "pending",
    ARRIVED: "arrived",
    ATTENDED: "attended",
    NO_SHOW: "no-show",
  }[attendee.attendanceStatus] as BookingStatus;
}

interface SchedulerAppointmentTooltipCardProps {
  align: "start" | "center";
  attendeeIndex: number;
  booking: Booking;
  context: DesignAppointmentContext | undefined;
  fallbackSpecialistName: string;
  side: "right" | "top";
  canViewCustomerPhone: boolean;
  onOpen: () => void;
}

function SchedulerAppointmentTooltipCard({
  align,
  attendeeIndex,
  booking,
  context,
  fallbackSpecialistName,
  side,
  canViewCustomerPhone,
  onOpen,
}: SchedulerAppointmentTooltipCardProps) {
  const attendee = context?.attendees?.[attendeeIndex];
  const attendeeName =
    attendee?.name ??
    context?.attendeeNames[attendeeIndex] ??
    booking.customerName;
  const phone = attendee ? attendee.phone : booking.phone;
  const contactFallback = attendee
    ? attendee.email || "Sin contacto"
    : booking.customerEmail || "Sin contacto";

  return (
    <TooltipContent
      align={align}
      aria-label={`Información de la cita de ${attendeeName}`}
      className="w-72 rounded-2xl border border-white/10 bg-[#172230] p-4 text-white shadow-[0_18px_44px_rgba(8,14,24,0.28)]"
      side={side}
      sideOffset={10}
    >
      <p className="font-semibold">{attendeeName}</p>
      {context?.attendees && context.attendees.length > 1 ? (
        <p className="mt-0.5 text-[0.66rem] uppercase tracking-[0.14em] text-white/45">
          Persona {attendeeIndex + 1} de {context.attendees.length}
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.72rem] leading-5 text-white/75">
        <dt>Horario</dt>
        <dd>
          {booking.start}–{booking.end}
        </dd>
        <dt>Servicio</dt>
        <dd>{booking.serviceName}</dd>
        <dt>Especialista</dt>
        <dd>
          {attendee
            ? (attendee.specialistName ?? "Sin asignar")
            : fallbackSpecialistName}
        </dd>
        <dt>Origen</dt>
        <dd>
          {context?.appointmentOrigin === "POS" ? "Punto de venta" : "Agenda"}
        </dd>
        <dt>Contacto</dt>
        <dd>
          <SchedulerProtectedPhone
            canView={canViewCustomerPhone}
            className="text-white/70"
            fallback={contactFallback}
            phone={phone}
          />
        </dd>
        <dt>Representante</dt>
        <dd>{context?.representativeName ?? "Por registrar"}</dd>
        <dt>Vendedor cartera</dt>
        <dd>
          {attendee
            ? (attendee.portfolioSellerName ?? "Sin asignar")
            : (context?.portfolioSellerName ?? "Sin asignar")}
        </dd>
        <dt>Próxima cita</dt>
        <dd>
          {nextAppointmentLabel(
            attendee ? attendee.nextAppointmentAt : context?.nextAppointmentAt,
          )}
        </dd>
      </dl>
      {attendee?.posTicket ? (
        <SchedulerPosTicketPreview
          className="mt-3"
          clientName={attendeeName}
          specialistName={
            attendee.membershipSellerSpecialistName ?? attendee.specialistName
          }
          ticket={attendee.posTicket}
          tone="dark"
        />
      ) : null}
      {booking.notes ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-[0.72rem] leading-5 text-white/65">
          {booking.notes}
        </p>
      ) : null}
      <button
        className="mt-3 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
        onClick={onOpen}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        Ver detalle de {attendeeName}
      </button>
    </TooltipContent>
  );
}

function getSchedulerAttendeeDetails(
  reservation: Booking,
  context: DesignAppointmentContext | undefined,
  { attendee, name }: SchedulerDisplayedAttendee,
): { booking: Booking; context: DesignAppointmentContext | undefined } {
  const {
    clientId: _clientId,
    customerEmail: _email,
    purchaseAmount: _amount,
    purchaseType: _purchaseType,
    tentativePurchaseAmount: _tentativeAmount,
    purchased: _purchased,
    serviceRecords: _serviceRecords,
    ...shared
  } = reservation;
  const purchase = attendee?.purchaseKind;
  const hasPurchase = purchase === "FULL" || purchase === "LAYAWAY";
  return {
    booking: {
      ...shared,
      customerName: name,
      phone: attendee?.phone ?? "",
      status: attendeeBookingStatus(attendee, reservation.status),
      totalPrice: null,
      paymentLabel:
        purchase === "LAYAWAY"
          ? "Apartado"
          : purchase === "FULL"
            ? "Compra liquidada"
            : "",
      ...(attendee?.customerId ? { clientId: attendee.customerId } : {}),
      ...(attendee?.email ? { customerEmail: attendee.email } : {}),
      ...(hasPurchase
        ? { purchased: true, purchaseAmount: attendee?.saleAmount ?? 0 }
        : {}),
      ...(purchase === "NONE" ? { purchased: false } : {}),
    },
    context: context
      ? {
          ...context,
          attendeeNames: [name],
          attendees: attendee ? [attendee] : [],
          portfolioSellerName: attendee?.portfolioSellerName ?? null,
          nextAppointmentId: attendee?.nextAppointmentId ?? null,
          nextAppointmentAt: attendee?.nextAppointmentAt ?? null,
          openLayaways: context.openLayaways.filter(
            (layaway) => layaway.customerId === attendee?.customerId,
          ),
        }
      : undefined,
  };
}

function displayedAttendeeKey(entry: SchedulerDisplayedAttendee) {
  return entry.attendee?.visitorId ?? String(entry.contextIndex);
}

interface SchedulerAppointmentSummaryProps {
  booking: Booking;
  attendees: SchedulerDisplayedAttendee[];
  context: DesignAppointmentContext | undefined;
  statusColors: BookingStatusColors;
  statusLabels: BookingStatusLabels;
  canViewCustomerPhone: boolean;
  fallbackSpecialistName: string;
  weekly: boolean;
  onOpen: (
    entry: SchedulerDisplayedAttendee,
    trigger?: HTMLButtonElement,
  ) => void;
}

function SchedulerAppointmentSummary({
  booking,
  attendees: displayedAttendees,
  context,
  statusColors,
  statusLabels,
  canViewCustomerPhone,
  fallbackSpecialistName,
  weekly,
  onOpen,
}: SchedulerAppointmentSummaryProps) {
  const hasMultipleAttendees = displayedAttendees.length > 1;
  const singlePurchaseAmount =
    displayedAttendees.length === 1
      ? attendeePurchaseAmount(displayedAttendees[0]!, booking, 1)
      : undefined;
  const singleStatus = attendeeBookingStatus(
    displayedAttendees[0]?.attendee,
    booking.status,
  );

  return (
    <div className="scheduler-appointment-summary flex h-full w-full min-w-0 flex-col items-center justify-center gap-px">
      <div
        className={cn(
          "scheduler-appointment-attendees grid w-full min-w-0 flex-1 overflow-hidden rounded-md",
          hasMultipleAttendees
            ? "items-stretch gap-0 border border-[#263649]/30 bg-white/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]"
            : "items-center",
        )}
        style={{
          gridTemplateColumns: `repeat(${displayedAttendees.length}, minmax(0, 1fr))`,
        }}
      >
        {displayedAttendees.map((entry) => {
          const amount = attendeePurchaseAmount(
            entry,
            booking,
            displayedAttendees.length,
          );
          const specialistName = specialistFirstName(
            entry.attendee?.specialistName,
          );
          const attendeeStatus = attendeeBookingStatus(
            entry.attendee,
            booking.status,
          );
          return (
            <Tooltip key={displayedAttendeeKey(entry)}>
              <TooltipTrigger asChild>
                <button
                  aria-haspopup="dialog"
                  aria-label={`Ver cita de ${entry.name} a las ${booking.start}`}
                  className={cn(
                    "scheduler-appointment-attendee flex h-full min-w-0 cursor-pointer flex-col items-center justify-center overflow-hidden px-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current",
                    hasMultipleAttendees
                      ? "flex flex-col border-l-[3px] border-l-[#263649]/45 text-[0.56rem] leading-none first:border-l-0 odd:bg-white/15 even:bg-white/55"
                      : "gap-px truncate text-[clamp(0.58rem,0.72vw,0.82rem)] leading-[1.05]",
                  )}
                  onClick={(event) => onOpen(entry, event.currentTarget)}
                  type="button"
                >
                  {!hasMultipleAttendees ? (
                    <SchedulerStatusBadge
                      className="scheduler-appointment-status-badge max-w-full"
                      color={statusColors[singleStatus]}
                      compact
                      hideLabel={
                        !shouldShowSchedulerAgendaStatusLabel(singleStatus)
                      }
                      hasPurchase={(singlePurchaseAmount ?? 0) > 0}
                      label={statusLabels[singleStatus]}
                      purchaseAmount={singlePurchaseAmount}
                      status={singleStatus}
                    />
                  ) : null}
                  {hasMultipleAttendees ? (
                    <span className="mb-0.5 flex max-w-full items-center justify-center gap-1 text-[0.48rem] font-semibold">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: statusColors[attendeeStatus],
                        }}
                      />
                      {shouldShowSchedulerAgendaStatusLabel(attendeeStatus) ? (
                        <span className="truncate">
                          {statusLabels[attendeeStatus]}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  <span className="block w-full min-w-0 truncate font-semibold">
                    {entry.name}
                  </span>
                  {hasMultipleAttendees ? (
                    <span className="mt-0.5 flex w-full min-w-0 items-center justify-center gap-1 text-[0.5rem] font-medium opacity-80">
                      <span className="min-w-0 truncate">{specialistName}</span>
                      {amount ? (
                        <strong className="shrink-0 font-bold">
                          {appointmentCurrencyFormatter.format(amount)}
                        </strong>
                      ) : (
                        <span className="shrink-0">Sin venta</span>
                      )}
                    </span>
                  ) : null}
                </button>
              </TooltipTrigger>
              <SchedulerAppointmentTooltipCard
                align={weekly ? "center" : "start"}
                attendeeIndex={entry.contextIndex}
                booking={booking}
                canViewCustomerPhone={canViewCustomerPhone}
                context={context}
                fallbackSpecialistName={fallbackSpecialistName}
                onOpen={() => onOpen(entry)}
                side={weekly ? "top" : "right"}
              />
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

const compactAgendaMediaQuery = [
  "(min-width: 1024px) and (max-height: 900px)",
  "(min-width: 1024px) and (any-pointer: coarse) and (max-height: 1100px)",
].join(", ");
const denseAgendaMediaQuery = "(min-width: 1024px) and (max-height: 780px)";
const ultraDenseAgendaMediaQuery =
  "(min-width: 1024px) and (max-height: 680px)";
function bookingMoveTargetKey(target: SchedulerBookingMoveTarget) {
  return `${target.date.getFullYear()}-${target.date.getMonth()}-${target.date.getDate()}:${target.startTime}:${target.columnId}`;
}

function useAgendaLayoutMetrics(): SchedulerAgendaLayoutMetrics {
  const [layout, setLayout] = useState<SchedulerAgendaLayoutMetrics>(
    schedulerComfortableLayout,
  );

  useEffect(() => {
    const compactQuery = window.matchMedia(compactAgendaMediaQuery);
    const denseQuery = window.matchMedia(denseAgendaMediaQuery);
    const ultraDenseQuery = window.matchMedia(ultraDenseAgendaMediaQuery);
    const updateLayout = () => {
      setLayout(
        ultraDenseQuery.matches
          ? schedulerUltraDenseLayout
          : denseQuery.matches
            ? schedulerDenseLayout
            : compactQuery.matches
              ? schedulerCompactLayout
              : schedulerComfortableLayout,
      );
    };

    updateLayout();
    compactQuery.addEventListener("change", updateLayout);
    denseQuery.addEventListener("change", updateLayout);
    ultraDenseQuery.addEventListener("change", updateLayout);

    return () => {
      compactQuery.removeEventListener("change", updateLayout);
      denseQuery.removeEventListener("change", updateLayout);
      ultraDenseQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  return layout;
}

function getOverlayHorizontalStyle(
  columnIndex: number,
  columnCount: number,
  layout: SchedulerAgendaLayoutMetrics,
  horizontalInset = layout.cardHorizontalInset,
): Pick<CSSProperties, "left" | "width"> {
  const columnFraction = columnIndex / columnCount;
  const columnPercent = 100 / columnCount;
  const leftTimeOffset = layout.timeColumnWidth * (1 - columnFraction);
  const widthOffset =
    layout.timeColumnWidth / columnCount + horizontalInset * 2;

  return {
    left: `calc(${columnFraction * 100}% + ${leftTimeOffset + horizontalInset}px)`,
    width: `calc(${columnPercent}% - ${widthOffset}px)`,
  };
}

export function SchedulerAgendaGrid({
  currentView,
  slotMinutes,
  visibleProfessionals,
  visibleBookings,
  statusColors,
  statusLabels,
  allBookings,
  visibleBlocks,
  selectedDate,
  commerceOperatingHours,
  commerceName,
  weekDays,
  weekBookings,
  weekBlocks = [],
  emptySlotAction,
  onOpenSlotAction,
  onCloseSlotAction,
  onOpenNewBooking,
  onCreateBlock,
  onEditBlock,
  onEditBooking,
  onMoveBooking,
  onDeleteBooking,
  onUpdateBookingStatus,
  onPurchaseDecision,
  onOpenBookingDetail,
  onOpenClientHistory,
  onOpenSellerComment,
  onOpenPostSaleComment,
  onOpenLayawayPayment,
  onOpenReschedule,
  financialAccessByClient,
  financialAuditEvents,
  onRequestFinancialAccess,
  onRevokeFinancialAccess,
  onUpdatePaymentHistory,
  onDeletePaymentHistory,
  canWrite = true,
  canViewCustomerPhone = false,
  enableCabinVisitFlow = false,
  showSellerComments = false,
  showPostSaleComments = false,
  financialHistoryReadOnly = false,
  clientAccountsByClient = {},
  paymentHistoryByClient = {},
  columnsFitted = false,
  appointmentContexts = {},
  visibleStatuses,
}: SchedulerAgendaGridProps) {
  const baseAgendaLayout = useAgendaLayoutMetrics();
  const gridViewportRef = useRef<HTMLDivElement>(null);
  const suppressBookingClickRef = useRef(false);
  const [gridViewportHeight, setGridViewportHeight] = useState(0);
  const [draggingBooking, setDraggingBooking] = useState<Booking | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const bookingTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [openBookingCard, setOpenBookingCard] = useState<{
    bookingId: string;
    attendeeKey: string;
  } | null>(null);
  const visibleColumnById = useMemo(
    () => new Map(visibleProfessionals.map((column) => [column.id, column])),
    [visibleProfessionals],
  );
  const dayCalendarRange = useMemo(
    () =>
      getSchedulerCalendarRange(
        commerceOperatingHours,
        [selectedDate],
        slotMinutes,
      ),
    [commerceOperatingHours, selectedDate, slotMinutes],
  );
  const weekCalendarRange = useMemo(
    () =>
      getSchedulerCalendarRange(commerceOperatingHours, weekDays, slotMinutes),
    [commerceOperatingHours, slotMinutes, weekDays],
  );
  const dayBaseMinutes = dayCalendarRange?.startMinutes ?? 0;
  const dayClosingMinutes = dayCalendarRange?.endMinutes ?? 0;
  const dayTimeSlots = useMemo(
    () => dayCalendarRange?.slots ?? [],
    [dayCalendarRange],
  );
  const weekBaseMinutes = weekCalendarRange?.startMinutes ?? 0;
  const weekClosingMinutes = weekCalendarRange?.endMinutes ?? 0;
  const weekTimeSlots = useMemo(
    () => weekCalendarRange?.slots ?? [],
    [weekCalendarRange],
  );
  const activeCalendarRange =
    currentView === "day" ? dayCalendarRange : weekCalendarRange;
  const activeTimeSlotCount =
    currentView === "day" ? dayTimeSlots.length : weekTimeSlots.length;
  const agendaLayout = useMemo(() => {
    if (gridViewportHeight <= 0 || activeTimeSlotCount <= 0)
      return baseAgendaLayout;

    const availableRowsHeight =
      gridViewportHeight - baseAgendaLayout.headerOffset;
    const fittedRowHeight = Math.floor(
      availableRowsHeight / activeTimeSlotCount,
    );

    return {
      ...baseAgendaLayout,
      rowHeight: Math.min(
        baseAgendaLayout.maxRowHeight,
        Math.max(baseAgendaLayout.minRowHeight, fittedRowHeight),
      ),
    };
  }, [activeTimeSlotCount, baseAgendaLayout, gridViewportHeight]);
  const calendarNeedsVerticalScroll =
    gridViewportHeight > 0 &&
    agendaLayout.headerOffset + activeTimeSlotCount * agendaLayout.rowHeight >
      gridViewportHeight;

  useEffect(() => {
    const viewport = gridViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => {
      const nextHeight = Math.floor(viewport.getBoundingClientRect().height);
      setGridViewportHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    };
    const observer = new ResizeObserver(updateHeight);

    updateHeight();
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [activeCalendarRange, currentView]);
  const professionalCount = Math.max(visibleProfessionals.length, 1);
  const readableColumnWidth = Math.max(
    agendaLayout.minColumnWidth,
    visibleProfessionals.every(
      (professional) => professional.kind === "RESOURCE",
    )
      ? 200
      : 220,
  );
  const dayGridMinWidth =
    agendaLayout.timeColumnWidth + professionalCount * readableColumnWidth;
  const dayGridStyle: CSSProperties & Record<string, string> = {
    gridTemplateColumns: columnsFitted
      ? `${agendaLayout.timeColumnWidth}px repeat(${professionalCount}, minmax(0, 1fr))`
      : `${agendaLayout.timeColumnWidth}px repeat(${professionalCount}, minmax(${readableColumnWidth}px, 1fr))`,
    minWidth: columnsFitted ? "100%" : `${dayGridMinWidth}px`,
    width: "100%",
    "--scheduler-grid-header-height": `${agendaLayout.headerOffset}px`,
    "--scheduler-grid-row-height": `${agendaLayout.rowHeight}px`,
    "--scheduler-time-column-width": `${agendaLayout.timeColumnWidth}px`,
    "--scheduler-column-width": `${agendaLayout.minColumnWidth}px`,
  };
  const weekGridStyle: CSSProperties & Record<string, string> = {
    gridTemplateColumns: `${agendaLayout.timeColumnWidth}px repeat(7, minmax(${agendaLayout.minColumnWidth}px, 1fr))`,
    minWidth: `${agendaLayout.timeColumnWidth + 7 * agendaLayout.minColumnWidth}px`,
    width: "100%",
    "--scheduler-grid-header-height": `${agendaLayout.headerOffset}px`,
    "--scheduler-grid-row-height": `${agendaLayout.rowHeight}px`,
    "--scheduler-time-column-width": `${agendaLayout.timeColumnWidth}px`,
    "--scheduler-column-width": `${agendaLayout.minColumnWidth}px`,
  };

  const professionalIndexMap = useMemo(() => {
    return new Map(
      visibleProfessionals.map((professional, index) => [
        professional.id,
        index,
      ]),
    );
  }, [visibleProfessionals]);

  const dayAppointments = useMemo(() => {
    const overlapLayout = getSchedulerBookingOverlapLayout(
      visibleBookings.map((booking) => ({
        id: booking.id,
        groupId: booking.professionalId,
        startMinutes: getMinutesFromTime(booking.start),
        endMinutes: getMinutesFromTime(booking.end),
      })),
    );
    const overlays: Array<DayOverlayBooking | null> = visibleBookings.map(
      (booking) => {
        if (
          getMinutesFromTime(booking.end) <= dayBaseMinutes ||
          getMinutesFromTime(booking.start) >= dayClosingMinutes
        )
          return null;
        const columnIndex = professionalIndexMap.get(booking.professionalId);
        if (columnIndex == null) return null;
        const lane = overlapLayout[booking.id] ?? {
          laneIndex: 0,
          laneCount: 1,
        };
        return {
          booking,
          style: {
            ...getAppointmentStyle(
              booking.start,
              booking.end,
              dayBaseMinutes,
              dayClosingMinutes,
              slotMinutes,
              agendaLayout,
            ),
            ...getOverlayHorizontalStyle(
              columnIndex * lane.laneCount + lane.laneIndex,
              professionalCount * lane.laneCount,
              agendaLayout,
              lane.laneCount > 1 ? 2 : agendaLayout.cardHorizontalInset,
            ),
          },
        };
      },
    );

    return overlays.filter(
      (value): value is DayOverlayBooking => value !== null,
    );
  }, [
    agendaLayout,
    dayBaseMinutes,
    dayClosingMinutes,
    professionalCount,
    professionalIndexMap,
    slotMinutes,
    visibleBookings,
  ]);

  const weekBookingOverlapLayout = useMemo(
    () =>
      getSchedulerBookingOverlapLayout(
        weekBookings.map((booking) => ({
          id: booking.id,
          groupId: String(booking.dayOffset),
          startMinutes: getMinutesFromTime(booking.start),
          endMinutes: getMinutesFromTime(booking.end),
        })),
      ),
    [weekBookings],
  );

  const dayBlocks = useMemo(() => {
    const overlays: Array<DayOverlayBlock | null> = visibleBlocks.map(
      (block) => {
        if (
          getMinutesFromTime(block.end) <= dayBaseMinutes ||
          getMinutesFromTime(block.start) >= dayClosingMinutes
        )
          return null;
        const columnIndex = professionalIndexMap.get(block.professionalId);
        if (columnIndex == null) return null;
        return {
          block,
          style: {
            ...getAppointmentStyle(
              block.start,
              block.end,
              dayBaseMinutes,
              dayClosingMinutes,
              slotMinutes,
              agendaLayout,
            ),
            ...getOverlayHorizontalStyle(
              columnIndex,
              professionalCount,
              agendaLayout,
            ),
          },
        };
      },
    );

    return overlays.filter((value): value is DayOverlayBlock => value !== null);
  }, [
    agendaLayout,
    dayBaseMinutes,
    dayClosingMinutes,
    professionalCount,
    professionalIndexMap,
    slotMinutes,
    visibleBlocks,
  ]);

  const occupiedDaySlots = useMemo(() => {
    const occupied = new Set<string>();

    dayTimeSlots.forEach((slot) => {
      const slotStart = getMinutesFromTime(slot);
      const slotEnd = slotStart + slotMinutes;

      visibleProfessionals.forEach((professional) => {
        const bookingOccupiesSlot = visibleBookings.some(
          (booking) =>
            booking.professionalId === professional.id &&
            getMinutesFromTime(booking.start) < slotEnd &&
            getMinutesFromTime(booking.end) > slotStart,
        );
        const blockOccupiesSlot = visibleBlocks.some(
          (block) =>
            block.professionalId === professional.id &&
            getMinutesFromTime(block.start) < slotEnd &&
            getMinutesFromTime(block.end) > slotStart,
        );

        if (bookingOccupiesSlot || blockOccupiesSlot) {
          occupied.add(`${slot}-${professional.id}`);
        }
      });
    });

    return occupied;
  }, [
    dayTimeSlots,
    slotMinutes,
    visibleBlocks,
    visibleBookings,
    visibleProfessionals,
  ]);

  const slotActionOverlay = useMemo(() => {
    if (!emptySlotAction) return null;

    const columnIndex = professionalIndexMap.get(
      emptySlotAction.professionalId,
    );
    if (columnIndex == null) return null;

    const startMinutes = getMinutesFromTime(emptySlotAction.startTime);
    const startCellIndex = Math.max(
      0,
      Math.floor((startMinutes - dayBaseMinutes) / slotMinutes),
    );
    const top = getSchedulerCardTop(startCellIndex, agendaLayout);
    const horizontalStyle = getOverlayHorizontalStyle(
      columnIndex,
      professionalCount,
      agendaLayout,
    );

    return {
      professionalId: emptySlotAction.professionalId,
      startTime: emptySlotAction.startTime,
      style: {
        top: `${top}px`,
        left: horizontalStyle.left,
        width: `min(${horizontalStyle.width}, 260px)`,
      },
    } satisfies SlotActionOverlay;
  }, [
    agendaLayout,
    dayBaseMinutes,
    emptySlotAction,
    professionalCount,
    professionalIndexMap,
    slotMinutes,
  ]);

  const now = new Date();
  const currentTimeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  const currentTimeMinutes = getMinutesFromTime(currentTimeLabel);
  const showCurrentTimeLine =
    currentView === "day" &&
    isSameDay(selectedDate, now) &&
    currentTimeMinutes >= dayBaseMinutes &&
    currentTimeMinutes <= dayClosingMinutes;

  function startBookingDrag(
    event: DragEvent<HTMLDivElement>,
    booking: Booking,
  ) {
    if (
      !canWrite ||
      !canMoveSchedulerBooking(booking.status, booking.purchased === true)
    ) {
      event.preventDefault();
      return;
    }
    suppressBookingClickRef.current = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", booking.id);
    setDraggingBooking(booking);
    setDragTargetKey(null);
  }

  function finishBookingDrag() {
    setDraggingBooking(null);
    setDragTargetKey(null);
    window.setTimeout(() => {
      suppressBookingClickRef.current = false;
    }, 0);
  }

  function targetAcceptsBooking(target: SchedulerBookingMoveTarget) {
    return Boolean(
      canWrite &&
      draggingBooking &&
      draggingBooking.branchId === target.branchId &&
      (target.columnKind === "PROFESSIONAL" || target.resourceKind === "ROOM"),
    );
  }

  function handleBookingDragOver(
    event: DragEvent<HTMLDivElement>,
    target: SchedulerBookingMoveTarget,
  ) {
    if (!targetAcceptsBooking(target)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const nextTargetKey = bookingMoveTargetKey(target);
    setDragTargetKey((current) =>
      current === nextTargetKey ? current : nextTargetKey,
    );
  }

  function handleBookingDrop(
    event: DragEvent<HTMLDivElement>,
    target: SchedulerBookingMoveTarget,
  ) {
    if (!draggingBooking || !targetAcceptsBooking(target)) return;
    event.preventDefault();
    event.stopPropagation();
    const booking = draggingBooking;
    finishBookingDrag();
    onMoveBooking(booking, target);
  }

  function renderAppointment(
    reservation: Booking,
    style: CSSProperties,
    date: Date,
    weekly = false,
  ) {
    const context = appointmentContexts[reservation.id];
    const column = visibleColumnById.get(reservation.professionalId);
    const attendees = displayedAttendeesForColumn(reservation, context, column);
    const selected =
      openBookingCard?.bookingId === reservation.id
        ? attendees.find(
            (entry) =>
              displayedAttendeeKey(entry) === openBookingCard.attendeeKey,
          )
        : undefined;
    const group =
      Math.max(
        context?.attendees?.length ?? 0,
        context?.attendeeNames.length ?? 0,
      ) > 1;
    const selectedVisitor =
      group && selected ? (selected.attendee ?? null) : undefined;
    const { booking, context: detailContext } =
      selected && group
        ? getSchedulerAttendeeDetails(reservation, context, selected)
        : { booking: reservation, context };
    const statusTokens = getSchedulerStatusColorTokens(
      statusColors[reservation.status],
    );
    const detailTokens = getSchedulerStatusColorTokens(
      statusColors[booking.status],
    );
    const canMoveBooking =
      canWrite &&
      canMoveSchedulerBooking(
        reservation.status,
        reservation.purchased === true,
      );

    return (
      <Dialog
        key={reservation.id}
        onOpenChange={(open) => {
          if (!open) setOpenBookingCard(null);
        }}
        open={Boolean(selected)}
      >
        <div
          className={cn(
            "scheduler-appointment scheduler-appointment-contained scheduler-appointment-booking text-left transition hover:-translate-y-0.5",
            canMoveBooking && "scheduler-appointment-draggable",
            draggingBooking?.id === reservation.id &&
              "scheduler-appointment-dragging",
          )}
          draggable={canMoveBooking}
          onDragEnd={finishBookingDrag}
          onDragStart={(event) => startBookingDrag(event, reservation)}
          style={{
            ...style,
            backgroundColor: statusTokens.surface,
            borderColor: statusTokens.border,
            borderLeftColor: statusTokens.accent,
            borderLeftWidth: "5px",
            color: statusTokens.foreground,
          }}
        >
          <SchedulerAppointmentSummary
            attendees={attendees}
            booking={reservation}
            canViewCustomerPhone={canViewCustomerPhone}
            context={context}
            fallbackSpecialistName={column?.name ?? "Sin asignar"}
            onOpen={(entry, trigger) => {
              if (suppressBookingClickRef.current) return;
              bookingTriggerRef.current = trigger ?? null;
              setOpenBookingCard({
                bookingId: reservation.id,
                attendeeKey: displayedAttendeeKey(entry),
              });
            }}
            statusColors={statusColors}
            statusLabels={statusLabels}
            weekly={weekly}
          />
        </div>
        {selected ? (
          <DialogContent
            aria-describedby={undefined}
            className="w-[min(560px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-[20px] border p-3.5 shadow-[0_18px_42px_rgba(79,61,43,0.14)]"
            onCloseAutoFocus={(event) => {
              const trigger = bookingTriggerRef.current;
              if (
                trigger?.isConnected &&
                !document.querySelector('[role="dialog"][data-state="open"]')
              ) {
                event.preventDefault();
                trigger.focus();
              }
            }}
            style={{
              backgroundColor: detailTokens.surface,
              borderColor: detailTokens.border,
            }}
          >
            <DialogTitle className="sr-only">
              Cita de {booking.customerName}
            </DialogTitle>
            <SchedulerBookingCard
              appointmentContext={detailContext}
              individualAttendee={selectedVisitor}
              reservationStatus={reservation.status}
              booking={booking}
              branchName={column?.branchName}
              canViewCustomerPhone={canViewCustomerPhone}
              commerceName={commerceName}
              enableCabinVisitFlow={enableCabinVisitFlow}
              clientAccount={
                (booking.clientId
                  ? clientAccountsByClient[booking.clientId]
                  : undefined) ?? getClientPurchaseAccount(allBookings, booking)
              }
              paymentHistory={
                (booking.clientId
                  ? paymentHistoryByClient[booking.clientId]
                  : undefined) ??
                (financialAccessByClient[
                  getSchedulerClientAccessKey(booking.clientId, booking.phone)
                ]
                  ? getClientPaymentHistory(allBookings, booking)
                  : [])
              }
              {...(financialAccessByClient[
                getSchedulerClientAccessKey(booking.clientId, booking.phone)
              ]
                ? {
                    financialProfile:
                      financialAccessByClient[
                        getSchedulerClientAccessKey(
                          booking.clientId,
                          booking.phone,
                        )
                      ],
                  }
                : {})}
              financialAuditEvents={financialAuditEvents.filter(
                (event) =>
                  event.clientKey ===
                  getSchedulerClientAccessKey(booking.clientId, booking.phone),
              )}
              selectedDate={date}
              statusColors={statusColors}
              statusLabels={statusLabels}
              onDelete={onDeleteBooking}
              onEdit={() =>
                onEditBooking(reservation, selectedVisitor?.visitorId)
              }
              onOpenDetail={onOpenBookingDetail}
              onOpenClientHistory={onOpenClientHistory}
              onOpenSellerComment={() => onOpenSellerComment(reservation)}
              onOpenPostSaleComment={() => {
                setOpenBookingCard(null);
                onOpenPostSaleComment(reservation);
              }}
              onOpenLayawayPayment={(selectedBooking, layaway) => {
                setOpenBookingCard(null);
                onOpenLayawayPayment(selectedBooking, layaway);
              }}
              onOpenReschedule={() => onOpenReschedule(reservation)}
              onStatusChange={(bookingId, status) =>
                onUpdateBookingStatus(
                  bookingId,
                  status,
                  selectedVisitor?.visitorId,
                )
              }
              onPurchaseDecision={onPurchaseDecision}
              onRequestFinancialAccess={onRequestFinancialAccess}
              onRevokeFinancialAccess={onRevokeFinancialAccess}
              onUpdatePaymentHistory={(
                paymentBookingId,
                amount,
                tentativeAmount,
              ) =>
                onUpdatePaymentHistory(
                  booking,
                  paymentBookingId,
                  amount,
                  tentativeAmount,
                )
              }
              onDeletePaymentHistory={(paymentBookingId) =>
                onDeletePaymentHistory(booking, paymentBookingId)
              }
              showSellerComments={showSellerComments}
              showPostSaleComments={showPostSaleComments}
              canWrite={canWrite}
              financialHistoryReadOnly={financialHistoryReadOnly}
              visibleStatuses={visibleStatuses}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    );
  }

  return (
    <TooltipProvider delayDuration={220}>
      <Card className="scheduler-agenda-card flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.76)_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {!activeCalendarRange ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
              <CalendarDays className="h-9 w-9 text-slate-300" />
              <div>
                <p className="font-semibold text-slate-700">Comercio cerrado</p>
                <p className="mt-1 text-sm text-slate-500">
                  No hay horarios de servicio definidos para{" "}
                  {currentView === "day" ? "este día" : "esta semana"}.
                </p>
              </div>
            </div>
          ) : currentView === "day" ? (
            <div
              ref={gridViewportRef}
              className={cn(
                "scheduler-grid-wrapper scheduler-grid-wrapper-day overflow-x-auto",
                calendarNeedsVerticalScroll &&
                  "scheduler-grid-wrapper-scrollable-y",
              )}
            >
              <div
                className="scheduler-grid scheduler-grid-day"
                style={dayGridStyle}
              >
                <div className="scheduler-grid-corner" />
                {visibleProfessionals.map((professional) => (
                  <div
                    key={professional.id}
                    className={cn(
                      "scheduler-column-header",
                      professional.kind === "RESOURCE"
                        ? "scheduler-column-header-resource"
                        : "scheduler-column-header-professional",
                    )}
                  >
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "scheduler-column-kind",
                          professional.kind === "RESOURCE"
                            ? "scheduler-column-kind-resource"
                            : "scheduler-column-kind-professional",
                        )}
                      >
                        {professional.kind === "RESOURCE" ? (
                          <DoorOpen className="h-3 w-3" />
                        ) : (
                          <UserRound className="h-3 w-3" />
                        )}
                        {professional.kind === "RESOURCE"
                          ? professional.resourceKind === "ROOM"
                            ? "Cabina"
                            : "Recurso"
                          : "Especialista"}
                        {professional.capacity
                          ? ` · ${professional.capacity}p`
                          : ""}
                      </span>
                      <p
                        className="scheduler-professional-name truncate text-[0.88rem] font-semibold tracking-[-0.02em] text-slate-800"
                        title={professional.name}
                      >
                        {professional.name}
                      </p>
                      <p
                        className="scheduler-professional-status truncate text-[0.66rem] uppercase tracking-[0.16em] text-slate-400"
                        title={professional.branchName ?? "Sucursal"}
                      >
                        {professional.branchName ?? "Sucursal"}
                      </p>
                    </div>
                  </div>
                ))}

                {dayTimeSlots.map((slot) => (
                  <div key={slot} className="contents">
                    <div className="scheduler-time-cell">{slot}</div>
                    {visibleProfessionals.map((professional) => {
                      const isOccupied = occupiedDaySlots.has(
                        `${slot}-${professional.id}`,
                      );
                      const moveTarget: SchedulerBookingMoveTarget = {
                        date: selectedDate,
                        columnId: professional.id,
                        branchId: professional.branchIds[0] ?? "",
                        columnKind: professional.kind ?? "PROFESSIONAL",
                        ...(professional.resourceKind
                          ? { resourceKind: professional.resourceKind }
                          : {}),
                        startTime: slot,
                      };
                      const moveTargetKey = bookingMoveTargetKey(moveTarget);

                      return (
                        <div
                          key={`${slot}-${professional.id}`}
                          className={cn(
                            "scheduler-body-cell",
                            isOccupied
                              ? "scheduler-body-cell-occupied"
                              : "scheduler-body-cell-interactive",
                            dragTargetKey === moveTargetKey &&
                              "scheduler-body-cell-drop-target",
                          )}
                          onDragLeave={() => {
                            if (dragTargetKey === moveTargetKey)
                              setDragTargetKey(null);
                          }}
                          onDragOver={(event) =>
                            handleBookingDragOver(event, moveTarget)
                          }
                          onDrop={(event) =>
                            handleBookingDrop(event, moveTarget)
                          }
                        >
                          {isOccupied || !canWrite ? null : (
                            <button
                              aria-label={`Abrir acciones para ${professional.name} a las ${slot}`}
                              className="scheduler-cell-hitbox"
                              type="button"
                              onClick={() =>
                                onOpenSlotAction(professional.id, slot)
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {dayBlocks.map(({ block, style }) => (
                  <button
                    key={block.id}
                    aria-label={`Editar disponibilidad de ${block.start} a ${block.end}`}
                    className={cn(
                      "scheduler-appointment scheduler-appointment-contained cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.1)]",
                      block.variant === "blocked"
                        ? "scheduler-appointment-blocked"
                        : "scheduler-appointment-unavailable",
                    )}
                    style={style}
                    type="button"
                    onClick={() => onEditBlock(block)}
                    disabled={!canWrite}
                  >
                    <p className="scheduler-appointment-title truncate text-[0.9rem] font-semibold">
                      {block.label}
                    </p>
                    <p className="scheduler-appointment-detail text-[0.72rem] uppercase tracking-[0.16em]">
                      {block.start} - {block.end}
                    </p>
                  </button>
                ))}

                {dayAppointments.map(({ booking, style }) =>
                  renderAppointment(booking, style, selectedDate),
                )}

                {slotActionOverlay && canWrite ? (
                  <div
                    className="scheduler-slot-action"
                    style={slotActionOverlay.style}
                  >
                    <div className="scheduler-slot-action-header">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--scheduler-ink-strong)] transition hover:bg-[rgba(195,165,131,0.14)]"
                        type="button"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      <span className="text-[0.96rem] font-medium text-slate-500">
                        Agregar
                      </span>
                      <button
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        onClick={onCloseSlotAction}
                        type="button"
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </button>
                    </div>

                    {isSchedulerCabinColumn(
                      visibleColumnById.get(slotActionOverlay.professionalId) ??
                        {},
                    ) ? (
                      <button
                        className="scheduler-slot-action-item"
                        onClick={() =>
                          onOpenNewBooking(
                            slotActionOverlay.professionalId,
                            slotActionOverlay.startTime,
                          )
                        }
                        type="button"
                      >
                        <CalendarDays className="h-5 w-5" />
                        <span>Reserva</span>
                      </button>
                    ) : null}

                    <button
                      className="scheduler-slot-action-item"
                      onClick={() =>
                        onCreateBlock(
                          slotActionOverlay.professionalId,
                          slotActionOverlay.startTime,
                        )
                      }
                      type="button"
                    >
                      <Ban className="h-5 w-5" />
                      <span>Bloquear horario</span>
                    </button>
                  </div>
                ) : null}

                {showCurrentTimeLine ? (
                  <div
                    className="scheduler-current-time-line"
                    style={getCurrentTimeLineStyle(
                      currentTimeLabel,
                      dayBaseMinutes,
                      slotMinutes,
                      agendaLayout,
                    )}
                  >
                    <span className="scheduler-current-time-pill">
                      {currentTimeLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              ref={gridViewportRef}
              className={cn(
                "scheduler-grid-wrapper scheduler-grid-wrapper-calendar overflow-x-auto",
                calendarNeedsVerticalScroll &&
                  "scheduler-grid-wrapper-scrollable-y",
              )}
            >
              <div className="scheduler-grid" style={weekGridStyle}>
                <div className="scheduler-grid-corner flex items-center justify-center">
                  <Badge className="rounded-full bg-slate-100 px-4 py-1 text-slate-500">
                    {visibleProfessionals[0]?.name ?? "Especialista"}
                  </Badge>
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="scheduler-column-header"
                  >
                    <div>
                      <p className="text-base font-semibold capitalize text-slate-800">
                        {format(day, "EEEE dd/MM", { locale: es })}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {isSameDay(day, selectedDate)
                          ? "Fecha activa"
                          : "Disponible"}
                      </p>
                    </div>
                  </div>
                ))}

                {weekTimeSlots.map((slot) => (
                  <div key={`week-${slot}`} className="contents">
                    <div className="scheduler-time-cell">{slot}</div>
                    {weekDays.map((day) => {
                      const sourceColumn = draggingBooking
                        ? visibleColumnById.get(draggingBooking.professionalId)
                        : undefined;
                      const outsideOperatingHours =
                        isOutsideSchedulerOperatingHours(
                          commerceOperatingHours,
                          day,
                          slot,
                          addMinutesToTime(slot, slotMinutes),
                        );
                      const moveTarget: SchedulerBookingMoveTarget = {
                        date: day,
                        columnId: sourceColumn?.id ?? "",
                        branchId:
                          draggingBooking?.branchId ??
                          sourceColumn?.branchIds[0] ??
                          "",
                        columnKind: sourceColumn?.kind ?? "PROFESSIONAL",
                        ...(sourceColumn?.resourceKind
                          ? { resourceKind: sourceColumn.resourceKind }
                          : {}),
                        startTime: slot,
                      };
                      const moveTargetKey = bookingMoveTargetKey(moveTarget);
                      return (
                        <div
                          key={`${slot}-${day.toISOString()}`}
                          className={cn(
                            "scheduler-body-cell",
                            outsideOperatingHours
                              ? "scheduler-body-cell-commerce-closed"
                              : "",
                            !outsideOperatingHours &&
                              dragTargetKey === moveTargetKey &&
                              "scheduler-body-cell-drop-target",
                          )}
                          onDragLeave={() => {
                            if (dragTargetKey === moveTargetKey)
                              setDragTargetKey(null);
                          }}
                          onDragOver={(event) => {
                            if (!outsideOperatingHours)
                              handleBookingDragOver(event, moveTarget);
                          }}
                          onDrop={(event) => {
                            if (!outsideOperatingHours)
                              handleBookingDrop(event, moveTarget);
                          }}
                        />
                      );
                    })}
                  </div>
                ))}

                {weekBookings.map((booking) => {
                  const bookingStartMinutes = getMinutesFromTime(booking.start);
                  if (
                    bookingStartMinutes < weekBaseMinutes ||
                    bookingStartMinutes >= weekClosingMinutes
                  )
                    return null;
                  const style = getSingleCellAppointmentStyle(
                    booking.start,
                    weekBaseMinutes,
                    weekClosingMinutes,
                    slotMinutes,
                    agendaLayout,
                  );
                  const lane = weekBookingOverlapLayout[booking.id] ?? {
                    laneIndex: 0,
                    laneCount: 1,
                  };
                  const horizontalStyle = getOverlayHorizontalStyle(
                    booking.dayOffset * lane.laneCount + lane.laneIndex,
                    7 * lane.laneCount,
                    agendaLayout,
                    lane.laneCount > 1 ? 2 : agendaLayout.cardHorizontalInset,
                  );
                  return renderAppointment(
                    booking,
                    { ...style, ...horizontalStyle },
                    new Date(
                      `${booking.date ?? format(selectedDate, "yyyy-MM-dd")}T12:00:00`,
                    ),
                    true,
                  );
                })}

                {weekBlocks.map((block) => {
                  const blockStartMinutes = getMinutesFromTime(block.start);
                  if (
                    blockStartMinutes < weekBaseMinutes ||
                    blockStartMinutes >= weekClosingMinutes
                  )
                    return null;
                  const style = getSingleCellAppointmentStyle(
                    block.start,
                    weekBaseMinutes,
                    weekClosingMinutes,
                    slotMinutes,
                    agendaLayout,
                  );
                  const horizontalStyle = getOverlayHorizontalStyle(
                    block.dayOffset,
                    7,
                    agendaLayout,
                  );

                  return (
                    <button
                      key={block.id}
                      aria-label={`${block.label}, ${block.start} a ${block.end}`}
                      className={cn(
                        "scheduler-appointment scheduler-appointment-contained text-left",
                        block.variant === "blocked"
                          ? "scheduler-appointment-blocked"
                          : "scheduler-appointment-unavailable",
                      )}
                      disabled={!canWrite || block.variant === "unavailable"}
                      onClick={() => onEditBlock(block)}
                      style={{ ...style, ...horizontalStyle }}
                      type="button"
                    >
                      <p className="truncate text-sm font-semibold">
                        {block.label}
                      </p>
                      <p className="text-xs uppercase tracking-[0.12em]">
                        {block.start} - {block.end}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
