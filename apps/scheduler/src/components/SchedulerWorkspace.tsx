'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, PanelLeftOpen, ReceiptText, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toast,
} from '@cosmetics/ui'
import {
  schedulerDayBookings,
  schedulerDayBlocks,
  schedulerReferenceDate,
  schedulerReferenceDateKey,
  schedulerServices,
  getBookingStatusColors,
  type BookingStatusColors,
  type AvailabilityBlock,
  type AttendingSpecialist,
  type Booking,
  type BookingPurchaseType,
  type BookingServiceRecord,
  type BookingStatus,
  type SchedulerView,
  type ServiceOption,
} from '@/lib/mock-scheduler-data'
import {
  authorizeSchedulerFinancialProfile,
  canManageSchedulerPaymentHistory,
  canAccessSchedulerBranch,
  canAccessSchedulerCommerce,
  canAccessSchedulerProfessional,
  currentSchedulerAccess,
  getSchedulerClientAccessKey,
  type SchedulerFinancialAuditEvent,
  type SchedulerFinancialProfile,
} from '@/lib/scheduler-access'
import {
  initialSchedulerClients,
  normalizeClientPhone,
  normalizeClientText,
  type SchedulerClient,
  type SchedulerClientHistoryEntry,
} from '@/lib/mock-client-data'
import {
  addMinutesToTime,
  createBlockDraft,
  createBlockDraftFromBlock,
  createDraft,
  createDraftFromBooking,
  formatMoney,
  getClientPurchaseAccount,
  getClientVisitHistory,
  getMinutesFromTime,
  bookingRequiresMultipleSpecialists,
  schedulerBaseMinutes,
  schedulerClosingMinutes,
  timesOverlap,
  type BlockDraft,
  type BookingDraft,
  type EmptySlotAction,
} from './scheduler/scheduler-utils'
import { SchedulerBookingDialog } from './scheduler/SchedulerBookingDialog'
import { SchedulerBlockDialog } from './scheduler/SchedulerBlockDialog'
import { SchedulerDetailDialog } from './scheduler/SchedulerDetailDialog'
import {
  SchedulerSidebar,
  type SchedulerDisplayMode,
} from './scheduler/SchedulerSidebar'
import { SchedulerHeader } from './scheduler/SchedulerHeader'
import { SchedulerAgendaGrid } from './scheduler/SchedulerAgendaGrid'
import { SchedulerAgendaList } from './scheduler/SchedulerAgendaList'
import { SchedulerFinancialAccessDialog } from './scheduler/SchedulerFinancialAccessDialog'
import { SchedulerClientHistoryDialog } from './scheduler/SchedulerClientHistoryDialog'
import {
  commerceOperatingHoursChangeEvent,
  commerceOperatingHoursStorageKey,
  getCommerceCalendarRange,
  getCommerceDailyOperatingWindow,
  getCommerceOperatingHours,
  isOutsideCommerceOperatingHours,
  type CommerceOperatingHours,
} from '@/lib/commerce-operating-hours'
import {
  administrationSchedulerConfigChangeEvent,
  administrationSchedulerConfigStorageKey,
  createDefaultAdministrationSchedulerConfig,
  getAdministrationSchedulerConfig,
  getConfiguredAttendingSpecialists,
  getConfiguredSchedulerCommerces,
  getConfiguredSchedulerBranches,
  getConfiguredSchedulerProfessionals,
  type AdministrationSchedulerConfig,
} from '@/lib/administration-scheduler-config'
import {
  getSchedulerAgendaSlotMinutes,
  schedulerAgendaSettingsChangeEvent,
  schedulerAgendaSettingsStorageKey,
  type SchedulerAgendaSlotMinutes,
} from '@/lib/scheduler-agenda-settings'

const initialAvailabilityBlocksById = new Map(schedulerDayBlocks.map((block) => [block.id, block]))

function buildServiceRecords(
  bookingId: string,
  amount: number,
  specialistIds: string[],
  attendingSpecialists: AttendingSpecialist[],
): BookingServiceRecord[] {
  const sharePercentage = Number((100 / specialistIds.length).toFixed(2))
  const dividedAmount = Number((amount / specialistIds.length).toFixed(2))
  const recordTimestamp = Date.now()

  return specialistIds.map((specialistId, index) => {
    const specialist = attendingSpecialists.find(
      (option) => option.id === specialistId,
    )

    return {
      id: `service-record-${bookingId}-${recordTimestamp}-${index + 1}`,
      specialistId,
      specialistName: specialist?.name ?? 'Especialista sin identificar',
      sharePercentage:
        index === specialistIds.length - 1
          ? Number((100 - sharePercentage * index).toFixed(2))
          : sharePercentage,
      allocatedAmount:
        index === specialistIds.length - 1
          ? Number((amount - dividedAmount * index).toFixed(2))
          : dividedAmount,
    }
  })
}

export function SchedulerWorkspace() {
  const [selectedDate, setSelectedDate] = useState(schedulerReferenceDate)
  const [monthCursor, setMonthCursor] = useState(startOfMonth(schedulerReferenceDate))
  const [currentView, setCurrentView] = useState<SchedulerView>('day')
  const [administrationConfig, setAdministrationConfig] =
    useState<AdministrationSchedulerConfig>(() =>
      createDefaultAdministrationSchedulerConfig(),
    )
  const configuredBranches = useMemo(
    () => getConfiguredSchedulerBranches(administrationConfig),
    [administrationConfig],
  )
  const configuredCommerces = useMemo(
    () => getConfiguredSchedulerCommerces(administrationConfig),
    [administrationConfig],
  )
  const configuredProfessionals = useMemo(
    () => getConfiguredSchedulerProfessionals(administrationConfig),
    [administrationConfig],
  )
  const configuredAttendingSpecialists = useMemo(
    () => getConfiguredAttendingSpecialists(administrationConfig),
    [administrationConfig],
  )
  const allowedCommerces = useMemo(
    () => configuredCommerces.filter((commerce) => canAccessSchedulerCommerce(commerce.id)),
    [configuredCommerces],
  )
  const [selectedCommerce, setSelectedCommerce] = useState(
    allowedCommerces[0]?.id ?? '',
  )
  const [statusColors, setStatusColors] = useState<BookingStatusColors>(() =>
    getBookingStatusColors(allowedCommerces[0]?.id ?? ''),
  )
  const [commerceOperatingHours, setCommerceOperatingHours] =
    useState<CommerceOperatingHours>(() =>
      getCommerceOperatingHours(allowedCommerces[0]?.id ?? ''),
    )
  const [agendaSlotMinutes, setAgendaSlotMinutes] =
    useState<SchedulerAgendaSlotMinutes>(() => getSchedulerAgendaSlotMinutes())
  const allowedBranches = useMemo(
    () =>
      configuredBranches.filter(
        (branch) =>
          branch.commerceId === selectedCommerce && canAccessSchedulerBranch(branch.id),
      ),
    [configuredBranches, selectedCommerce],
  )
  const [selectedBranch, setSelectedBranch] = useState(
    () => allowedBranches[0]?.id ?? '',
  )
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'active'>('active')
  const [professionalQuery, setProfessionalQuery] = useState('')
  const [quickTimeFilter, setQuickTimeFilter] = useState('all')
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>(
    configuredProfessionals.map((professional) => professional.id),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [emptySlotAction, setEmptySlotAction] = useState<EmptySlotAction | null>(null)
  const [bookings, setBookings] = useState<Booking[]>(schedulerDayBookings)
  const [clients, setClients] = useState<SchedulerClient[]>(initialSchedulerClients)
  const [duplicateClient, setDuplicateClient] = useState<SchedulerClient | null>(null)
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>(schedulerDayBlocks)
  const [draft, setDraft] = useState<BookingDraft>(() =>
    createDraft(schedulerReferenceDate, configuredProfessionals),
  )
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [detailView, setDetailView] = useState<'payment' | 'attendance' | 'record'>('record')
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)
  const [clientHistoryBooking, setClientHistoryBooking] = useState<Booking | null>(null)
  const [financialAccessRequest, setFinancialAccessRequest] = useState<Booking | null>(null)
  const [financialAccessNextView, setFinancialAccessNextView] = useState<'record' | 'history' | null>(null)
  const [financialAccessByClient, setFinancialAccessByClient] = useState<
    Record<string, SchedulerFinancialProfile>
  >({})
  const [financialAuditEvents, setFinancialAuditEvents] = useState<
    SchedulerFinancialAuditEvent[]
  >([])
  const [paymentHistoryDeleteRequest, setPaymentHistoryDeleteRequest] = useState<{
    clientBooking: Booking
    paymentBookingId: string
  } | null>(null)
  const [paymentHistoryDeleteStep, setPaymentHistoryDeleteStep] = useState<'review' | 'confirm'>('review')
  const [paymentHistoryDeleteKeyword, setPaymentHistoryDeleteKeyword] = useState('')
  const [blockedBookingRequest, setBlockedBookingRequest] = useState<{
    mergeClientId?: string
    reason: string
    detail: string
  } | null>(null)
  const [blockedBookingStep, setBlockedBookingStep] = useState<'review' | 'confirm'>('review')
  const [blockedBookingKeyword, setBlockedBookingKeyword] = useState('')
  const [agendaMotionKey, setAgendaMotionKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [resourcePanelOpen, setResourcePanelOpen] = useState(true)
  const [displayMode, setDisplayMode] = useState<SchedulerDisplayMode>('calendar')
  const sidebarBookingTimerRef = useRef<number | null>(null)
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')

  useEffect(() => {
    function refreshAdministrationConfig() {
      setAdministrationConfig(getAdministrationSchedulerConfig())
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === administrationSchedulerConfigStorageKey) {
        refreshAdministrationConfig()
      }
    }

    refreshAdministrationConfig()
    window.addEventListener(
      administrationSchedulerConfigChangeEvent,
      refreshAdministrationConfig,
    )
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(
        administrationSchedulerConfigChangeEvent,
        refreshAdministrationConfig,
      )
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    function refreshStatusColors() {
      setStatusColors(getBookingStatusColors(selectedCommerce))
    }

    refreshStatusColors()
    window.addEventListener('scheduler-status-colors-change', refreshStatusColors)
    return () => window.removeEventListener('scheduler-status-colors-change', refreshStatusColors)
  }, [selectedCommerce])

  useEffect(() => {
    function refreshAgendaSlotMinutes() {
      setAgendaSlotMinutes(getSchedulerAgendaSlotMinutes())
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === schedulerAgendaSettingsStorageKey) {
        refreshAgendaSlotMinutes()
      }
    }

    refreshAgendaSlotMinutes()
    window.addEventListener(schedulerAgendaSettingsChangeEvent, refreshAgendaSlotMinutes)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(schedulerAgendaSettingsChangeEvent, refreshAgendaSlotMinutes)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    function refreshOperatingHours() {
      setCommerceOperatingHours(getCommerceOperatingHours(selectedCommerce))
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === commerceOperatingHoursStorageKey) {
        refreshOperatingHours()
      }
    }

    refreshOperatingHours()
    window.addEventListener(commerceOperatingHoursChangeEvent, refreshOperatingHours)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(commerceOperatingHoursChangeEvent, refreshOperatingHours)
      window.removeEventListener('storage', handleStorage)
    }
  }, [selectedCommerce])

  const branchProfessionals = useMemo(() => {
    return configuredProfessionals.filter(
      (professional) =>
        professional.commerceIds.includes(selectedCommerce) &&
        professional.branchIds.includes(selectedBranch) &&
        canAccessSchedulerProfessional(professional.id),
    )
  }, [configuredProfessionals, selectedBranch, selectedCommerce])

  const sidebarProfessionals = useMemo(() => {
    const normalizedQuery = professionalQuery.trim().toLowerCase()
    if (!normalizedQuery) return branchProfessionals

    return branchProfessionals.filter((professional) =>
      professional.name.toLowerCase().includes(normalizedQuery),
    )
  }, [branchProfessionals, professionalQuery])

  const visibleProfessionals = useMemo(() => {
    const selectedSet = new Set(selectedProfessionalIds)
    const filtered = sidebarProfessionals.filter((professional) => selectedSet.has(professional.id))
    if (filtered.length > 0) return filtered
    if (sidebarProfessionals.length > 0) return sidebarProfessionals.slice(0, 1)
    return branchProfessionals.slice(0, 1)
  }, [branchProfessionals, selectedProfessionalIds, sidebarProfessionals])

  const visibleBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDateKey = booking.date ?? schedulerReferenceDateKey
      const matchesProfessional = visibleProfessionals.some(
        (professional) => professional.id === booking.professionalId,
      )
      const bookingProfessional = configuredProfessionals.find(
        (professional) => professional.id === booking.professionalId,
      )
      const matchesBranch = booking.branchId
        ? booking.branchId === selectedBranch
        : bookingProfessional?.branchIds[0] === selectedBranch
      const matchesDate = bookingDateKey === selectedDateKey
      const matchesStatus =
        statusFilter === 'active'
          ? booking.status !== 'canceled'
          : booking.status === statusFilter
      const matchesTime = quickTimeFilter === 'all' ? true : booking.start === quickTimeFilter

      return matchesProfessional && matchesBranch && matchesDate && matchesStatus && matchesTime
    })
  }, [bookings, configuredProfessionals, quickTimeFilter, selectedBranch, selectedDateKey, statusFilter, visibleProfessionals])

  const visibleBlocks = useMemo(() => {
    return availabilityBlocks.filter((block) => {
      const blockDateKey = block.date ?? schedulerReferenceDateKey
      const blockProfessional = configuredProfessionals.find(
        (professional) => professional.id === block.professionalId,
      )
      const matchesBranch = block.branchId
        ? block.branchId === selectedBranch
        : blockProfessional?.branchIds[0] === selectedBranch
      return (
        blockDateKey === selectedDateKey &&
        matchesBranch &&
        visibleProfessionals.some((professional) => professional.id === block.professionalId)
      )
    })
  }, [availabilityBlocks, configuredProfessionals, selectedBranch, selectedDateKey, visibleProfessionals])

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 })
    const end = endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [selectedDate])
  const calendarTimeSlots = useMemo(
    () => getCommerceCalendarRange(commerceOperatingHours, [selectedDate], agendaSlotMinutes)?.slots ?? [],
    [agendaSlotMinutes, commerceOperatingHours, selectedDate],
  )

  useEffect(() => {
    if (quickTimeFilter === 'all' || calendarTimeSlots.includes(quickTimeFilter)) return
    setQuickTimeFilter('all')
  }, [calendarTimeSlots, quickTimeFilter])

  useEffect(() => {
    if (allowedCommerces.some((commerce) => commerce.id === selectedCommerce)) return
    setSelectedCommerce(allowedCommerces[0]?.id ?? '')
  }, [allowedCommerces, selectedCommerce])

  useEffect(() => {
    const branchIsStillAvailable = allowedBranches.some(
      (branch) => branch.id === selectedBranch,
    )
    if (!branchIsStillAvailable) {
      setSelectedBranch(allowedBranches[0]?.id ?? '')
    }
  }, [allowedBranches, selectedBranch])

  useEffect(() => {
    if (branchProfessionals.length === 0) {
      setSelectedProfessionalIds([])
      return
    }

    setSelectedProfessionalIds((current) => {
      const allIds = new Set(branchProfessionals.map((professional) => professional.id))
      const preserved = current.filter((id) => allIds.has(id))
      return preserved.length > 0 ? preserved : branchProfessionals.map((professional) => professional.id)
    })
  }, [branchProfessionals])

  useEffect(() => {
    setMonthCursor(startOfMonth(selectedDate))
  }, [selectedDate])

  useEffect(() => {
    setAgendaMotionKey((current) => current + 1)
  }, [currentView, displayMode, selectedDateKey])

  useEffect(() => {
    return () => {
      if (sidebarBookingTimerRef.current != null) {
        window.clearTimeout(sidebarBookingTimerRef.current)
      }
    }
  }, [])

  function handleDateStep(direction: 'prev' | 'next') {
    const amount = direction === 'prev' ? -1 : 1
    setSelectedDate((current) => addDays(current, currentView === 'day' ? amount : amount * 7))
  }

  function toggleProfessional(professionalId: string) {
    setSelectedProfessionalIds((current) => {
      if (current.includes(professionalId)) {
        return current.length === 1 ? current : current.filter((id) => id !== professionalId)
      }

      return [...current, professionalId]
    })
  }

  function handleRefresh() {
    setAdministrationConfig(getAdministrationSchedulerConfig())
    setCommerceOperatingHours(getCommerceOperatingHours(selectedCommerce))
    toast.success('Agenda actualizada', {
      description: 'Se cargaron nuevamente comercios, sucursales, especialistas y horarios.',
    })
  }

  function handleOpenResources() {
    if (window.matchMedia('(min-width: 1280px)').matches) {
      setResourcePanelOpen(true)
      return
    }

    setFiltersOpen(true)
  }

  function openSlotAction(professionalId: string, startTime: string) {
    setEmptySlotAction({ professionalId, startTime })
  }

  function openNewBooking(professionalId?: string, startTime?: string, dateOverride?: Date) {
    setEmptySlotAction(null)
    const bookingDate = dateOverride ?? selectedDate
    const professionalsSource =
      visibleProfessionals.length > 0 ? visibleProfessionals : branchProfessionals

    setDraft(
      createDraft(
        bookingDate,
        professionalsSource,
        professionalId,
        startTime,
      ),
    )
    setIsDialogOpen(true)
  }

  function handleBookingBranchChange(branchId: string) {
    if (!allowedBranches.some((branch) => branch.id === branchId)) return

    const nextBranchProfessionals = configuredProfessionals.filter(
      (professional) =>
        professional.commerceIds.includes(selectedCommerce) &&
        professional.branchIds.includes(branchId) &&
        canAccessSchedulerProfessional(professional.id),
    )

    setSelectedBranch(branchId)
    setDraft((current) => {
      const professionalIsAvailable = nextBranchProfessionals.some(
        (professional) => professional.id === current.professionalId,
      )

      return {
        ...current,
        professionalId: professionalIsAvailable
          ? current.professionalId
          : nextBranchProfessionals[0]?.id ?? '',
      }
    })
  }

  function handleSidebarDateQuickCreate(date: Date) {
    setCurrentView('day')
    setEmptySlotAction(null)
    setSelectedDate(date)

    if (sidebarBookingTimerRef.current != null) {
      window.clearTimeout(sidebarBookingTimerRef.current)
    }

    sidebarBookingTimerRef.current = window.setTimeout(() => {
      openNewBooking(undefined, undefined, date)
      sidebarBookingTimerRef.current = null
    }, 140)
  }

  function handleMockBlock(professionalId: string, startTime: string) {
    setEmptySlotAction(null)
    setBlockDraft(createBlockDraft(selectedDate, branchProfessionals, professionalId, startTime))
    setIsBlockDialogOpen(true)
  }

  function handleEditBlock(block: AvailabilityBlock) {
    setEmptySlotAction(null)
    setBlockDraft(createBlockDraftFromBlock(block, selectedDate))
    setIsBlockDialogOpen(true)
  }

  function handleEditBooking(booking: Booking) {
    if (booking.serviceRecords?.length) {
      toast.error('Este registro ya está finalizado')
      return
    }
    setDraft(createDraftFromBooking(booking, selectedDate))
    setEmptySlotAction(null)
    setIsDialogOpen(true)
  }

  function handleDeleteBooking(bookingId: string) {
    const booking = bookings.find((current) => current.id === bookingId)
    if (booking?.serviceRecords?.length) {
      toast.error('Este registro ya está finalizado')
      return
    }
    setBookings((current) => current.filter((booking) => booking.id !== bookingId))
    toast.success('Reserva eliminada', {
      description: 'La cita se retiro de la agenda actual.',
    })
  }

  function handleUpdateBookingStatus(bookingId: string, status: BookingStatus) {
    const booking = bookings.find((current) => current.id === bookingId)
    if (booking?.serviceRecords?.length) {
      toast.error('Este registro ya está finalizado')
      return
    }

    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId) return booking
        if (status === 'arrived') return { ...booking, status }

        const nextBooking = { ...booking, status }
        delete nextBooking.purchaseAmount
        delete nextBooking.purchaseType
        delete nextBooking.tentativePurchaseAmount
        delete nextBooking.serviceRecords
        delete nextBooking.purchased
        return nextBooking
      }),
    )
    toast.success('Estado actualizado', {
      description:
        status === 'arrived'
          ? 'Ahora indica en la card si el cliente realizó una compra.'
          : 'La reserva cambió correctamente de estatus.',
    })
  }

  function handlePurchaseDecision(booking: Booking, purchased: boolean) {
    if (booking.serviceRecords?.length) {
      toast.error('Este registro ya está finalizado')
      return
    }

    let nextBooking: Booking

    if (purchased) {
      nextBooking = {
        ...booking,
        purchased: true,
        paymentLabel: booking.purchaseAmount ? booking.paymentLabel : 'Pago pendiente',
      }
    } else {
      nextBooking = { ...booking, purchased: false, paymentLabel: 'Sin compra' }
      delete nextBooking.purchaseAmount
      delete nextBooking.purchaseType
      delete nextBooking.tentativePurchaseAmount
      delete nextBooking.serviceRecords
    }

    setBookings((current) =>
      current.map((currentBooking) => currentBooking.id === booking.id ? nextBooking : currentBooking),
    )

    if (purchased) {
      handleOpenBookingDetail(nextBooking, 'payment')
      return
    }

    handleOpenBookingDetail(nextBooking, 'attendance')
  }

  function handleAuthorizeFinancialHistory(booking: Booking, personalCode: string): string | null {
    const authorization = authorizeSchedulerFinancialProfile(personalCode, booking.clientId)
    if (!authorization.profile) return authorization.error ?? 'No fue posible autorizar la consulta.'

    const clientKey = getSchedulerClientAccessKey(booking.clientId, booking.phone)
    const consultation: SchedulerFinancialAuditEvent = {
      id: `financial-consultation-${Date.now()}`,
      userId: authorization.profile.id,
      userName: authorization.profile.name,
      userRole: authorization.profile.role,
      clientKey,
      clientName: booking.customerName,
      bookingId: booking.id,
      action: 'view',
      description:
        financialAccessNextView === 'history'
          ? 'Consultó el historial de citas y visitas del cliente.'
          : financialAccessNextView === 'record'
            ? 'Consultó la ficha del cliente.'
            : 'Consultó el historial financiero del cliente.',
      occurredAt: new Date().toISOString(),
    }

    setFinancialAccessByClient((current) => ({
      ...current,
      [clientKey]: authorization.profile as SchedulerFinancialProfile,
    }))
    setFinancialAuditEvents((current) => [consultation, ...current])
    if (financialAccessNextView === 'record') {
      if (booking.date) {
        const bookingDate = new Date(`${booking.date}T12:00:00`)
        if (!isSameDay(selectedDate, bookingDate)) setSelectedDate(bookingDate)
      }
      setActiveBooking(booking)
      setDetailView('record')
    } else if (financialAccessNextView === 'history') {
      setClientHistoryBooking(booking)
    }
    setFinancialAccessNextView(null)
    toast.success('Historial autorizado', {
      description: `Consulta registrada a nombre de ${authorization.profile.name}.`,
    })
    return null
  }

  function handleRevokeFinancialHistory(booking: Booking) {
    const clientKey = getSchedulerClientAccessKey(booking.clientId, booking.phone)
    setFinancialAccessByClient((current) => {
      const next = { ...current }
      delete next[clientKey]
      return next
    })
  }

  function getAuthorizedFinancialProfile(booking: Booking): SchedulerFinancialProfile | undefined {
    return financialAccessByClient[getSchedulerClientAccessKey(booking.clientId, booking.phone)]
  }

  function handleOpenClientHistory(booking: Booking) {
    const profile = getAuthorizedFinancialProfile(booking)
    if (!profile) {
      setFinancialAccessNextView('history')
      setFinancialAccessRequest(booking)
      return
    }

    const consultation: SchedulerFinancialAuditEvent = {
      id: `visit-history-consultation-${Date.now()}`,
      userId: profile.id,
      userName: profile.name,
      userRole: profile.role,
      clientKey: getSchedulerClientAccessKey(booking.clientId, booking.phone),
      clientName: booking.customerName,
      bookingId: booking.id,
      action: 'view',
      description: 'Consultó el historial de citas y visitas del cliente.',
      occurredAt: new Date().toISOString(),
    }

    setFinancialAuditEvents((current) => [consultation, ...current])
    setClientHistoryBooking(booking)
  }

  function handleUpdatePaymentHistory(
    clientBooking: Booking,
    paymentBookingId: string,
    amount: number,
    tentativeAmount?: number,
  ) {
    const profile = getAuthorizedFinancialProfile(clientBooking)
    if (!profile || !canManageSchedulerPaymentHistory(profile)) {
      toast.error('Solo master o admin pueden modificar pagos')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto de pago válido')
      return
    }

    const paymentBooking = bookings.find((booking) => booking.id === paymentBookingId)
    if (!paymentBooking?.purchaseType) return
    if (
      paymentBooking.purchaseType === 'layaway' &&
      (!tentativeAmount || tentativeAmount < amount)
    ) {
      toast.error('La compra tentativa debe ser igual o mayor al apartado')
      return
    }

    const paymentLabel = paymentBooking.purchaseType === 'layaway'
      ? `Apartado · ${formatMoney(amount)} de ${formatMoney(tentativeAmount ?? 0)}`
      : `${paymentBooking.purchaseType === 'settlement' ? 'Liquidación' : 'Contado'} · ${formatMoney(amount)}`
    const specialistIds = paymentBooking.serviceRecords?.map((record) => record.specialistId) ?? []

    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== paymentBookingId) return booking
        const updatedBooking = {
          ...booking,
          purchaseAmount: amount,
          paymentLabel,
          ...(specialistIds.length
            ? {
                serviceRecords: buildServiceRecords(
                  paymentBookingId,
                  amount,
                  specialistIds,
                  configuredAttendingSpecialists,
                ),
              }
            : {}),
        }
        if (booking.purchaseType === 'layaway' && tentativeAmount) {
          updatedBooking.tentativePurchaseAmount = tentativeAmount
        }
        return updatedBooking
      }),
    )
    const clientKey = getSchedulerClientAccessKey(clientBooking.clientId, clientBooking.phone)
    const tentativeChange = paymentBooking.purchaseType === 'layaway'
      ? ` Compra tentativa: ${formatMoney(paymentBooking.tentativePurchaseAmount ?? 0)} → ${formatMoney(tentativeAmount ?? 0)}.`
      : ''
    setFinancialAuditEvents((current) => [
      {
        id: `financial-audit-update-${Date.now()}`,
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        clientKey,
        clientName: clientBooking.customerName,
        bookingId: paymentBookingId,
        action: 'update',
        description: `Modificó el pago: ${formatMoney(paymentBooking.purchaseAmount ?? 0)} → ${formatMoney(amount)}.${tentativeChange}`,
        occurredAt: new Date().toISOString(),
      },
      ...current,
    ])
    toast.success('Pago modificado', {
      description: `Actualizado por ${profile?.name}.`,
    })
  }

  function handleRequestDeletePaymentHistory(
    clientBooking: Booking,
    paymentBookingId: string,
  ) {
    const profile = getAuthorizedFinancialProfile(clientBooking)
    if (!canManageSchedulerPaymentHistory(profile)) {
      toast.error('Solo master o admin pueden eliminar pagos')
      return
    }
    setPaymentHistoryDeleteRequest({ clientBooking, paymentBookingId })
    setPaymentHistoryDeleteStep('review')
    setPaymentHistoryDeleteKeyword('')
  }

  function handleConfirmDeletePaymentHistory() {
    if (!paymentHistoryDeleteRequest) return
    const profile = getAuthorizedFinancialProfile(paymentHistoryDeleteRequest.clientBooking)
    if (!profile || !canManageSchedulerPaymentHistory(profile)) {
      toast.error('La autorización ya no está disponible')
      return
    }
    const paymentBooking = bookings.find(
      (booking) => booking.id === paymentHistoryDeleteRequest.paymentBookingId,
    )
    if (!paymentBooking?.purchaseType) {
      setPaymentHistoryDeleteRequest(null)
      return
    }

    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== paymentHistoryDeleteRequest.paymentBookingId) return booking
        const updatedBooking: Booking = {
          ...booking,
          purchased: false,
          paymentLabel: 'Pago eliminado por administración',
        }
        if (booking.serviceRecords?.length) {
          updatedBooking.serviceRecords = booking.serviceRecords.map((record) => ({
            ...record,
            allocatedAmount: 0,
          }))
        }
        delete updatedBooking.purchaseType
        delete updatedBooking.purchaseAmount
        delete updatedBooking.tentativePurchaseAmount
        return updatedBooking
      }),
    )
    const clientBooking = paymentHistoryDeleteRequest.clientBooking
    const clientKey = getSchedulerClientAccessKey(clientBooking.clientId, clientBooking.phone)
    setFinancialAuditEvents((current) => [
      {
        id: `financial-audit-delete-${Date.now()}`,
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        clientKey,
        clientName: clientBooking.customerName,
        bookingId: paymentBooking.id,
        action: 'delete',
        description: `Eliminó “${paymentBooking.paymentLabel}” por ${formatMoney(paymentBooking.purchaseAmount ?? 0)}. La cita se conservó.`,
        occurredAt: new Date().toISOString(),
      },
      ...current,
    ])
    toast.success('Pago eliminado del historial', {
      description: `Acción realizada por ${profile?.name}.`,
    })
    setPaymentHistoryDeleteRequest(null)
  }

  function handleSaveAttendance(
    bookingId: string,
    attendingSpecialistIds: string[] = [],
  ) {
    const attendanceBooking = bookings.find((booking) => booking.id === bookingId)
    if (!attendanceBooking) return

    const requiredSpecialistCount = bookingRequiresMultipleSpecialists(attendanceBooking) ? 2 : 1
    const uniqueSpecialistIds = [...new Set(attendingSpecialistIds)]
    if (uniqueSpecialistIds.length < requiredSpecialistCount) {
      toast.error(
        requiredSpecialistCount === 2
          ? 'Selecciona al menos dos especialistas'
          : 'Selecciona al menos un especialista',
      )
      return
    }

    const serviceRecords = buildServiceRecords(
      bookingId,
      0,
      uniqueSpecialistIds,
      configuredAttendingSpecialists,
    )
    const completedBooking: Booking = {
      ...attendanceBooking,
      purchased: false,
      paymentLabel: 'Sin compra',
      serviceRecords,
    }

    setBookings((current) =>
      current.map((booking) => booking.id === bookingId ? completedBooking : booking),
    )
    setActiveBooking((current) => current?.id === bookingId ? completedBooking : current)
    toast.success('Atención registrada', {
      description: `Sin compra · ${serviceRecords.length} ${serviceRecords.length === 1 ? 'especialista' : 'especialistas'}.`,
    })
  }

  function handleSaveBookingPayment(
    bookingId: string,
    purchaseType: BookingPurchaseType,
    purchaseAmount: number,
    tentativePurchaseAmount?: number,
    attendingSpecialistIds: string[] = [],
  ) {
    const paymentBooking = bookings.find((booking) => booking.id === bookingId)
    if (!paymentBooking) return
    if (paymentBooking.serviceRecords?.length) {
      toast.error('Este registro ya está finalizado')
      return
    }

    if (purchaseType === 'settlement') {
      const authorizedProfile = getAuthorizedFinancialProfile(paymentBooking)
      if (!authorizedProfile) {
        toast.error('Autoriza el historial financiero antes de liquidar')
        return
      }
      const clientAccount = getClientPurchaseAccount(bookings, paymentBooking, bookingId)
      if (clientAccount.previousVisits < 1) {
        toast.error('La liquidación requiere al menos una visita previa')
        return
      }
      if (clientAccount.outstandingBalance <= 0) {
        toast.error('La clienta no tiene saldo pendiente en su historial')
        return
      }
      if (purchaseAmount > clientAccount.outstandingBalance) {
        toast.error('El monto supera el saldo pendiente del historial')
        return
      }
    }

    const requiredSpecialistCount = bookingRequiresMultipleSpecialists(paymentBooking) ? 2 : 1
    const uniqueSpecialistIds = [...new Set(attendingSpecialistIds)]
    if (uniqueSpecialistIds.length < requiredSpecialistCount) {
      toast.error(
        requiredSpecialistCount === 2
          ? 'Selecciona al menos dos especialistas'
          : 'Selecciona al menos un especialista',
      )
      return
    }

    const serviceRecords = buildServiceRecords(
      bookingId,
      purchaseAmount,
      uniqueSpecialistIds,
      configuredAttendingSpecialists,
    )
    const paymentLabel = purchaseType === 'layaway'
      ? `Apartado · ${formatMoney(purchaseAmount)} de ${formatMoney(tentativePurchaseAmount ?? 0)}`
      : `${purchaseType === 'settlement' ? 'Liquidación' : 'Contado'} · ${formatMoney(purchaseAmount)}`

    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId) return booking

        const nextBooking = {
          ...booking,
          purchased: purchaseType === 'settlement' ? booking.purchased ?? false : true,
          purchaseType,
          purchaseAmount,
          paymentLabel,
          serviceRecords,
        }
        if (purchaseType === 'layaway' && tentativePurchaseAmount) {
          nextBooking.tentativePurchaseAmount = tentativePurchaseAmount
        } else {
          delete nextBooking.tentativePurchaseAmount
        }
        return nextBooking
      }),
    )
    setActiveBooking((current) =>
      current?.id === bookingId
        ? {
            ...current,
            purchased: purchaseType === 'settlement' ? current.purchased ?? false : true,
            purchaseType,
            purchaseAmount,
            paymentLabel,
            serviceRecords,
            ...(purchaseType === 'layaway' && tentativePurchaseAmount
              ? { tentativePurchaseAmount }
              : {}),
          }
        : current,
    )
    const authorizedProfile = getAuthorizedFinancialProfile(paymentBooking)
    const clientKey = getSchedulerClientAccessKey(paymentBooking.clientId, paymentBooking.phone)
    setFinancialAuditEvents((current) => [
      {
        id: `financial-audit-create-${Date.now()}`,
        userId: authorizedProfile?.id ?? currentSchedulerAccess.id,
        userName: authorizedProfile?.name ?? currentSchedulerAccess.name,
        userRole: authorizedProfile?.role ?? 'admin',
        clientKey,
        clientName: paymentBooking.customerName,
        bookingId,
        action: 'create',
        description: `Registró ${paymentLabel} por ${formatMoney(purchaseAmount)}.`,
        occurredAt: new Date().toISOString(),
      },
      ...current,
    ])
    toast.success('Pago registrado', {
      description: `${purchaseType === 'layaway' ? 'Apartado' : purchaseType === 'settlement' ? 'Liquidación' : 'Pago de contado'} por ${formatMoney(purchaseAmount)} · ${serviceRecords.length} ${serviceRecords.length === 1 ? 'registro de servicio' : 'registros de servicio'}.`,
    })
  }

  function handleOpenBookingDetail(
    booking: Booking,
    view: 'payment' | 'attendance' | 'record',
  ) {
    if (view === 'record' && !getAuthorizedFinancialProfile(booking)) {
      setFinancialAccessNextView('record')
      setFinancialAccessRequest(booking)
      return
    }

    if (booking.date) {
      const bookingDate = new Date(`${booking.date}T12:00:00`)
      if (!isSameDay(selectedDate, bookingDate)) {
        setSelectedDate(bookingDate)
      }
    }

    setActiveBooking(booking)
    setDetailView(view)
  }

  function handleSaveBlock() {
    if (!blockDraft) return

    const start = `${blockDraft.startHour}:${blockDraft.startMinute}`
    const end = `${blockDraft.endHour}:${blockDraft.endMinute}`
    const startMinutes = getMinutesFromTime(start)
    const endMinutes = getMinutesFromTime(end)

    if (startMinutes < schedulerBaseMinutes || endMinutes > schedulerClosingMinutes) {
      toast.error('El bloqueo esta fuera del horario permitido', {
        description: 'La agenda solo admite horarios entre 09:00 y 21:00.',
      })
      return
    }

    if (endMinutes <= startMinutes) {
      toast.error('El bloqueo debe terminar despues de iniciar', {
        description: 'Ajusta la hora final para guardar el horario bloqueado.',
      })
      return
    }

    const blockDateKey = format(blockDraft.date, 'yyyy-MM-dd')
    const professionalName =
      configuredProfessionals.find((professional) => professional.id === blockDraft.professionalId)?.name ?? 'Especialista'

    const conflictingBooking = bookings.find((booking) => {
      const bookingDateKey = booking.date ?? schedulerReferenceDateKey
      return (
        bookingDateKey === blockDateKey &&
        booking.professionalId === blockDraft.professionalId &&
        timesOverlap(booking.start, booking.end, start, end)
      )
    })

    if (conflictingBooking) {
      toast.error('Ese horario ya tiene una reserva', {
        description: `${professionalName} ya tiene una cita activa entre ${conflictingBooking.start} y ${conflictingBooking.end}.`,
      })
      return
    }

    const conflictingBlock = availabilityBlocks.find((block) => {
      const currentBlockDateKey = block.date ?? schedulerReferenceDateKey
      return (
        block.id !== blockDraft.blockId &&
        currentBlockDateKey === blockDateKey &&
        block.professionalId === blockDraft.professionalId &&
        timesOverlap(block.start, block.end, start, end)
      )
    })

    if (conflictingBlock) {
      toast.info('Ese horario ya estaba bloqueado', {
        description: `${professionalName} ya tiene un bloqueo activo entre ${conflictingBlock.start} y ${conflictingBlock.end}.`,
      })
      return
    }

    const initialBlock = blockDraft.blockId ? initialAvailabilityBlocksById.get(blockDraft.blockId) : undefined
    const shouldKeepInitialUnavailableStyle = initialBlock?.variant === 'unavailable'
    const nextBlock: AvailabilityBlock = {
      id: blockDraft.blockId ?? `block-mock-${Date.now()}`,
      branchId: selectedBranch,
      date: blockDateKey,
      professionalId: blockDraft.professionalId,
      start,
      end,
      label: shouldKeepInitialUnavailableStyle ? initialBlock.label : blockDraft.label ?? 'Hora bloqueada',
      variant: shouldKeepInitialUnavailableStyle ? initialBlock.variant : blockDraft.variant ?? 'blocked',
    }

    setAvailabilityBlocks((current) => {
      if (!blockDraft.blockId) return [...current, nextBlock]
      return current.map((block) => (block.id === blockDraft.blockId ? nextBlock : block))
    })
    setIsBlockDialogOpen(false)
    setBlockDraft(null)
    toast.success(blockDraft.blockId ? 'Bloqueo actualizado' : 'Horario bloqueado', {
      description: `${professionalName} quedo bloqueado de ${start} a ${end}.`,
    })
  }

  function handleDeleteBlock() {
    if (!blockDraft?.blockId) return

    setAvailabilityBlocks((current) => current.filter((block) => block.id !== blockDraft.blockId))
    setIsBlockDialogOpen(false)
    setBlockDraft(null)
    toast.success('Bloqueo eliminado', {
      description: 'Ese espacio vuelve a quedar disponible dentro de la agenda local.',
    })
  }

  function handleSaveBooking(mergeClientId?: string, allowBlockedTime = false) {
    if (!draft.customerName.trim()) {
      toast.error('Falta el nombre del cliente')
      return
    }

    const normalizedPhone = normalizeClientPhone(draft.phone)
    if (normalizedPhone.length < 10) {
      toast.error('Ingresa un número telefónico válido', {
        description: 'El teléfono es obligatorio y debe incluir al menos 10 dígitos.',
      })
      return
    }

    const phoneOwner = clients.find(
      (client) => client.normalizedPhone === normalizedPhone,
    )
    if (
      phoneOwner &&
      phoneOwner.id !== draft.clientId &&
      phoneOwner.id !== mergeClientId
    ) {
      setDuplicateClient(phoneOwner)
      return
    }

    const selectedService: ServiceOption | undefined = schedulerServices.find(
      (service) => service.id === draft.serviceId,
    )
    const start = `${draft.hour}:${draft.minute}`
    const end = addMinutesToTime(start, selectedService?.durationMinutes ?? 60)
    const startMinutes = getMinutesFromTime(start)
    const endMinutes = getMinutesFromTime(end)
    const bookingDateKey = format(draft.date, 'yyyy-MM-dd')
    const professionalName =
      configuredProfessionals.find((professional) => professional.id === draft.professionalId)?.name ?? 'Especialista'

    if (startMinutes < schedulerBaseMinutes || endMinutes > schedulerClosingMinutes) {
      toast.error('La reserva se sale del horario permitido', {
        description: 'La hora de inicio y fin debe pertenecer al mismo día.',
      })
      return
    }

    const conflictingBooking = draft.status === 'canceled' ? undefined : bookings.find((booking) => {
      const currentBookingDateKey = booking.date ?? schedulerReferenceDateKey
      return (
        booking.id !== draft.bookingId &&
        booking.status !== 'canceled' &&
        currentBookingDateKey === bookingDateKey &&
        booking.professionalId === draft.professionalId &&
        timesOverlap(booking.start, booking.end, start, end)
      )
    })

    if (conflictingBooking) {
      toast.error('Ya existe una cita en ese horario', {
        description: `${professionalName} ya tiene reservada la franja ${conflictingBooking.start} - ${conflictingBooking.end}.`,
      })
      return
    }

    const conflictingBlock = draft.status === 'canceled' ? undefined : availabilityBlocks.find((block) => {
      const blockDateKey = block.date ?? schedulerReferenceDateKey
      return (
        blockDateKey === bookingDateKey &&
        block.professionalId === draft.professionalId &&
        timesOverlap(block.start, block.end, start, end)
      )
    })

    const outsideCommerceHours =
      draft.status !== 'canceled' &&
      isOutsideCommerceOperatingHours(commerceOperatingHours, draft.date, start, end)

    if (!allowBlockedTime && (conflictingBlock || outsideCommerceHours)) {
      const dailyWindow = getCommerceDailyOperatingWindow(commerceOperatingHours, draft.date)
      const commerceName =
        allowedCommerces.find((commerce) => commerce.id === selectedCommerce)?.name ??
        'El comercio'
      const reason = conflictingBlock
        ? 'La franja tiene un bloqueo manual'
        : dailyWindow.enabled
          ? 'La reserva está fuera del horario de servicio'
          : 'El comercio está cerrado este día'
      const detail = conflictingBlock
        ? `${professionalName} tiene un bloqueo de ${conflictingBlock.start} a ${conflictingBlock.end}.`
        : dailyWindow.enabled
          ? `${commerceName} atiende de ${dailyWindow.open} a ${dailyWindow.close}. La reserva solicitada es de ${start} a ${end}.`
          : `${commerceName} no tiene horario de servicio configurado para este día.`

      setBlockedBookingRequest({
        ...(mergeClientId ? { mergeClientId } : {}),
        reason,
        detail,
      })
      setBlockedBookingStep('review')
      setBlockedBookingKeyword('')
      return
    }

    const nextBookingId = draft.bookingId ?? `booking-${Date.now()}`
    const resolvedClientId = mergeClientId ?? draft.clientId ?? phoneOwner?.id
    const historyEntry: SchedulerClientHistoryEntry = {
      id: `history-${nextBookingId}`,
      branchId: selectedBranch,
      date: bookingDateKey,
      displayName: draft.customerName.trim(),
      bookingId: nextBookingId,
    }
    let bookingClientId = resolvedClientId

    if (resolvedClientId) {
      setClients((current) =>
        current.map((client) => {
          if (client.id !== resolvedClientId) return client

          const incomingName = draft.customerName.trim()
          const alreadyKnownName = [client.fullName, ...client.aliases].some(
            (name) => normalizeClientText(name) === normalizeClientText(incomingName),
          )
          const incomingEmail = draft.customerEmail.trim()
          const alreadyKnownEmail = [client.email, ...client.alternateEmails].some(
            (email) => email.toLocaleLowerCase() === incomingEmail.toLocaleLowerCase(),
          )
          const historyIndex = client.history.findIndex(
            (entry) => entry.bookingId === nextBookingId,
          )
          const history = [...client.history]
          if (historyIndex >= 0) history[historyIndex] = historyEntry
          else history.push(historyEntry)

          return {
            ...client,
            aliases:
              incomingName && !alreadyKnownName
                ? [...client.aliases, incomingName]
                : client.aliases,
            email: client.email || incomingEmail,
            alternateEmails:
              incomingEmail && client.email && !alreadyKnownEmail
                ? [...client.alternateEmails, incomingEmail]
                : client.alternateEmails,
            history,
          }
        }),
      )
    } else {
      bookingClientId = `client-${Date.now()}`
      const newClient: SchedulerClient = {
        id: bookingClientId,
        fullName: draft.customerName.trim(),
        aliases: [],
        phone: draft.phone.trim(),
        normalizedPhone,
        email: draft.customerEmail.trim(),
        alternateEmails: [],
        history: [historyEntry],
      }
      setClients((current) => [...current, newClient])
    }

    const existingBooking = draft.bookingId
      ? bookings.find((booking) => booking.id === draft.bookingId)
      : undefined
    const preservedPurchase = draft.status === 'arrived' && existingBooking
      ? {
          ...(existingBooking.purchased !== undefined
            ? { purchased: existingBooking.purchased }
            : {}),
          ...(existingBooking.purchaseType
            ? { purchaseType: existingBooking.purchaseType }
            : {}),
          ...(existingBooking.purchaseAmount
            ? { purchaseAmount: existingBooking.purchaseAmount }
            : {}),
          ...(existingBooking.tentativePurchaseAmount
            ? { tentativePurchaseAmount: existingBooking.tentativePurchaseAmount }
            : {}),
          ...(existingBooking.serviceRecords?.length
            ? { serviceRecords: existingBooking.serviceRecords }
            : {}),
        }
      : {}

    const nextBooking: Booking = {
      id: nextBookingId,
      ...(bookingClientId ? { clientId: bookingClientId } : {}),
      branchId: selectedBranch,
      date: bookingDateKey,
      customerName: draft.customerName.trim(),
      serviceName: selectedService?.name ?? 'Servicio',
      professionalId: draft.professionalId,
      start,
      end,
      status: draft.status,
      phone: draft.phone.trim(),
      ...(draft.customerEmail.trim()
        ? { customerEmail: draft.customerEmail.trim() }
        : {}),
      paymentLabel: draft.paymentLabel,
      ...preservedPurchase,
    }

    const noteValue = draft.internalNote || draft.notes
    if (noteValue) {
      nextBooking.notes = noteValue
    }

    setBookings((current) => {
      if (!draft.bookingId) return [...current, nextBooking]
      return current.map((booking) => (booking.id === draft.bookingId ? nextBooking : booking))
    })
    setIsDialogOpen(false)
    setDuplicateClient(null)
    setBlockedBookingRequest(null)
    toast.success(draft.bookingId ? 'Reserva actualizada' : 'Reserva creada', {
      description: draft.bookingId
        ? 'La cita se actualizo dentro de la agenda actual.'
        : 'La cita ya aparece en la agenda para validar flujo e interaccion.',
    })
  }

  const paymentHistoryDeleteBooking = paymentHistoryDeleteRequest
    ? bookings.find((booking) => booking.id === paymentHistoryDeleteRequest.paymentBookingId)
    : undefined

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(195,165,131,0.14),transparent_16%),linear-gradient(180deg,#f3f0e9_0%,#f7f3ed_100%)]">
      <SchedulerHeader
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedDate={selectedDate}
        weekDays={weekDays}
        selectedCommerceName={
          allowedCommerces.find((commerce) => commerce.id === selectedCommerce)?.name ?? 'Sin comercio'
        }
        selectedBranchName={
          allowedBranches.find((branch) => branch.id === selectedBranch)?.name ?? 'Sin sucursal'
        }
        onDateStep={handleDateStep}
        onGoToday={() => setSelectedDate(schedulerReferenceDate)}
        onRefresh={handleRefresh}
        onOpenFilters={handleOpenResources}
        onOpenNewBooking={() => openNewBooking()}
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
              Ajusta el comercio, sucursal, especialistas, estatus, hora y fecha visibles.
            </SheetDescription>
          </SheetHeader>
          <SchedulerSidebar
            commerces={allowedCommerces}
            selectedCommerce={selectedCommerce}
            onCommerceChange={setSelectedCommerce}
            branches={allowedBranches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            visibleProfessionalCount={visibleProfessionals.length}
            professionals={sidebarProfessionals}
            selectedProfessionalIds={selectedProfessionalIds}
            onToggleProfessional={toggleProfessional}
            professionalQuery={professionalQuery}
            onProfessionalQueryChange={setProfessionalQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            quickTimeFilter={quickTimeFilter}
            timeSlots={calendarTimeSlots}
            onQuickTimeFilterChange={setQuickTimeFilter}
            monthCursor={monthCursor}
            onMonthCursorChange={setMonthCursor}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            onDateQuickCreate={(date) => {
              setFiltersOpen(false)
              handleSidebarDateQuickCreate(date)
            }}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </SheetContent>
      </Sheet>

      <main className="flex min-h-[calc(100vh-84px)] min-w-0 items-start">
        {resourcePanelOpen ? (
          <aside className="sticky top-0 hidden h-screen w-[340px] shrink-0 overflow-y-auto border-r border-[rgba(236,209,200,0.82)] xl:block">
            <SchedulerSidebar
              commerces={allowedCommerces}
              selectedCommerce={selectedCommerce}
              onCommerceChange={setSelectedCommerce}
              branches={allowedBranches}
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              visibleProfessionalCount={visibleProfessionals.length}
              professionals={sidebarProfessionals}
              selectedProfessionalIds={selectedProfessionalIds}
              onToggleProfessional={toggleProfessional}
              professionalQuery={professionalQuery}
              onProfessionalQueryChange={setProfessionalQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              quickTimeFilter={quickTimeFilter}
              timeSlots={calendarTimeSlots}
              onQuickTimeFilterChange={setQuickTimeFilter}
              monthCursor={monthCursor}
              onMonthCursorChange={setMonthCursor}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onDateQuickCreate={handleSidebarDateQuickCreate}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              onCollapse={() => setResourcePanelOpen(false)}
            />
          </aside>
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 xl:px-8">
          {!resourcePanelOpen ? (
            <button
              className="mb-4 hidden h-11 w-fit items-center gap-2 rounded-2xl border border-[rgba(236,209,200,0.82)] bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[var(--scheduler-accent)] hover:bg-[var(--scheduler-accent-soft)] xl:flex"
              onClick={() => setResourcePanelOpen(true)}
              type="button"
            >
              <PanelLeftOpen className="h-4 w-4" />
              Mostrar recursos
            </button>
          ) : null}
          <div key={agendaMotionKey} className="scheduler-content-entrance">
            {displayMode === 'calendar' ? (
              <SchedulerAgendaGrid
                currentView={currentView}
                slotMinutes={agendaSlotMinutes}
                allBookings={bookings}
                visibleProfessionals={visibleProfessionals}
                visibleBookings={visibleBookings}
                statusColors={statusColors}
                visibleBlocks={visibleBlocks}
                selectedDate={selectedDate}
                commerceOperatingHours={commerceOperatingHours}
                commerceName={
                  allowedCommerces.find((commerce) => commerce.id === selectedCommerce)?.name ??
                  'Sin comercio'
                }
                weekDays={weekDays}
                emptySlotAction={emptySlotAction}
                onOpenSlotAction={openSlotAction}
                onCloseSlotAction={() => setEmptySlotAction(null)}
                onOpenNewBooking={openNewBooking}
                onMockBlock={handleMockBlock}
                onEditBlock={handleEditBlock}
                onDeleteBooking={handleDeleteBooking}
                onEditBooking={handleEditBooking}
                onOpenBookingDetail={handleOpenBookingDetail}
                onOpenClientHistory={handleOpenClientHistory}
                onPurchaseDecision={handlePurchaseDecision}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                financialAccessByClient={financialAccessByClient}
                financialAuditEvents={financialAuditEvents}
                onRequestFinancialAccess={(booking) => {
                  setFinancialAccessNextView(null)
                  setFinancialAccessRequest(booking)
                }}
                onRevokeFinancialAccess={handleRevokeFinancialHistory}
                onUpdatePaymentHistory={handleUpdatePaymentHistory}
                onDeletePaymentHistory={handleRequestDeletePaymentHistory}
              />
            ) : (
              <SchedulerAgendaList
                bookings={visibleBookings}
                professionals={visibleProfessionals}
                selectedDate={selectedDate}
                statusColors={statusColors}
                onOpenBooking={(booking) => handleOpenBookingDetail(booking, 'record')}
                onOpenNewBooking={() => openNewBooking()}
              />
            )}
          </div>
        </section>
      </main>

      <SchedulerBookingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        branches={allowedBranches}
        selectedBranch={selectedBranch}
        onBranchChange={handleBookingBranchChange}
        bookings={bookings}
        availabilityBlocks={availabilityBlocks}
        clients={clients}
        draft={draft}
        statusColors={statusColors}
        onDraftChange={setDraft}
        onSave={handleSaveBooking}
      />

      <SchedulerBlockDialog
        open={isBlockDialogOpen}
        onOpenChange={(open) => {
          setIsBlockDialogOpen(open)
          if (!open) setBlockDraft(null)
        }}
        professionals={branchProfessionals}
        draft={blockDraft}
        onDraftChange={setBlockDraft}
        onSave={handleSaveBlock}
        {...(blockDraft?.blockId ? { onDelete: handleDeleteBlock } : {})}
      />

      <SchedulerDetailDialog
        attendingSpecialists={
          configuredAttendingSpecialists.filter((specialist) =>
            specialist.branchIds.includes(activeBooking?.branchId ?? selectedBranch) ||
            Boolean(
              activeBooking?.serviceRecords?.some(
                (record) => record.specialistId === specialist.id,
              ),
            ),
          )
        }
        booking={activeBooking}
        commerceName={
          allowedCommerces.find((commerce) => commerce.id === selectedCommerce)?.name ??
          'Sin comercio'
        }
        clientAccount={
          activeBooking
            ? getClientPurchaseAccount(bookings, activeBooking, activeBooking.id)
            : { previousVisits: 0, settledPurchases: 0, settledAmount: 0, outstandingBalance: 0 }
        }
        financialHistoryAuthorized={Boolean(
          activeBooking && getAuthorizedFinancialProfile(activeBooking),
        )}
        open={Boolean(activeBooking)}
        onOpenChange={(open) => {
          if (!open) setActiveBooking(null)
        }}
        selectedDate={selectedDate}
        requiresMultipleSpecialists={
          activeBooking ? bookingRequiresMultipleSpecialists(activeBooking) : false
        }
        view={detailView}
        onSaveAttendance={handleSaveAttendance}
        onSavePayment={handleSaveBookingPayment}
      />

      <SchedulerFinancialAccessDialog
        booking={financialAccessRequest}
        open={Boolean(financialAccessRequest)}
        purpose={financialAccessNextView ?? 'financial'}
        onAuthorize={handleAuthorizeFinancialHistory}
        onOpenChange={(open) => {
          if (!open) {
            setFinancialAccessRequest(null)
            setFinancialAccessNextView(null)
          }
        }}
      />

      <SchedulerClientHistoryDialog
        booking={clientHistoryBooking}
        history={
          clientHistoryBooking
            ? getClientVisitHistory(bookings, clientHistoryBooking)
            : []
        }
        open={Boolean(clientHistoryBooking)}
        onOpenChange={(open) => {
          if (!open) setClientHistoryBooking(null)
        }}
      />

      <AlertDialog
        open={Boolean(blockedBookingRequest)}
        onOpenChange={(open) => {
          if (open) return
          setBlockedBookingRequest(null)
          setBlockedBookingStep('review')
          setBlockedBookingKeyword('')
        }}
      >
        <AlertDialogContent className="scheduler-modal-shell max-w-[480px] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
          <div className="px-5 pb-4 pt-5 sm:px-6">
            <AlertDialogHeader className="text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <AlertDialogTitle className="text-[1.25rem] leading-7 tracking-[-0.02em] text-[var(--scheduler-ink-strong)]">
                    Reservar en un horario bloqueado
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-1 text-[0.88rem] leading-5 text-slate-600">
                    {blockedBookingRequest?.reason}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            {blockedBookingStep === 'review' ? (
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                {blockedBookingRequest?.detail}
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl bg-rose-50 px-4 py-4">
                <p className="text-sm leading-5 text-rose-900">
                  Esta es la segunda validación. Escribe <strong>RESERVAR</strong> para
                  autorizar la excepción al horario del comercio.
                </p>
                <Input
                  aria-label="Escribe RESERVAR para confirmar"
                  autoFocus
                  className="bg-white uppercase tracking-[0.16em]"
                  onChange={(event) => setBlockedBookingKeyword(event.target.value.toUpperCase())}
                  placeholder="RESERVAR"
                  value={blockedBookingKeyword}
                />
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 px-3.5 py-3 text-slate-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-[0.78rem] leading-5">
                La excepción sólo aplica a esta reserva; el horario del comercio no se modificará.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="flex-row justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:space-x-0 sm:px-6">
            <AlertDialogCancel className="scheduler-modal-secondary mt-0">
              Regresar
            </AlertDialogCancel>
            {blockedBookingStep === 'review' ? (
              <Button
                className="bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500"
                onClick={() => setBlockedBookingStep('confirm')}
                type="button"
              >
                Continuar
              </Button>
            ) : (
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50"
                disabled={blockedBookingKeyword !== 'RESERVAR'}
                onClick={() => {
                  if (!blockedBookingRequest || blockedBookingKeyword !== 'RESERVAR') return
                  handleSaveBooking(blockedBookingRequest.mergeClientId, true)
                }}
              >
                Reservar de todas formas
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(paymentHistoryDeleteRequest)}
        onOpenChange={(open) => {
          if (!open) setPaymentHistoryDeleteRequest(null)
          if (!open) {
            setPaymentHistoryDeleteStep('review')
            setPaymentHistoryDeleteKeyword('')
          }
        }}
      >
        <AlertDialogContent className="scheduler-modal-shell max-w-[460px] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
          <div className="px-5 pb-4 pt-5 sm:px-6">
            <AlertDialogHeader className="text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <AlertDialogTitle className="text-[1.25rem] leading-7 tracking-[-0.02em] text-[var(--scheduler-ink-strong)]">
                    Eliminar movimiento de pago
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-1 text-[0.88rem] leading-5 text-slate-600">
                    Esta acción recalculará inmediatamente el saldo de {paymentHistoryDeleteRequest?.clientBooking.customerName ?? 'la clienta'}.
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            {paymentHistoryDeleteStep === 'review' ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-100 px-4 py-3">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <p className="truncate text-[0.86rem] font-semibold text-[var(--scheduler-ink-strong)]">
                  {paymentHistoryDeleteBooking?.paymentLabel ?? 'Movimiento seleccionado'}
                </p>
                <p className="mt-0.5 text-[0.78rem] text-slate-500">
                  {formatMoney(paymentHistoryDeleteBooking?.purchaseAmount ?? 0)} · La cita y la atención se conservarán
                </p>
              </div>
            </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl bg-rose-50 px-4 py-4">
                <p className="text-sm leading-5 text-rose-900">
                  Esta es la última validación. Escribe <strong>ELIMINAR</strong> para confirmar que deseas borrar este movimiento.
                </p>
                <Input
                  aria-label="Escribe ELIMINAR para confirmar"
                  autoFocus
                  className="bg-white uppercase tracking-[0.16em]"
                  onChange={(event) => setPaymentHistoryDeleteKeyword(event.target.value.toUpperCase())}
                  placeholder="ELIMINAR"
                  value={paymentHistoryDeleteKeyword}
                />
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-[0.78rem] leading-5">
                La eliminación quedará registrada en la bitácora con el usuario, monto, fecha y hora.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="flex-row justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:space-x-0 sm:px-6">
            <AlertDialogCancel className="scheduler-modal-secondary mt-0">
              Conservar pago
            </AlertDialogCancel>
            {paymentHistoryDeleteStep === 'review' ? (
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500"
                onClick={() => setPaymentHistoryDeleteStep('confirm')}
                type="button"
              >
                Continuar
              </Button>
            ) : (
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50"
                disabled={paymentHistoryDeleteKeyword !== 'ELIMINAR'}
                onClick={handleConfirmDeletePaymentHistory}
              >
                Eliminar definitivamente
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(duplicateClient)}
        onOpenChange={(open) => {
          if (!open) setDuplicateClient(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este teléfono ya tiene historial</AlertDialogTitle>
            <AlertDialogDescription>
              El número {duplicateClient?.phone} pertenece a {duplicateClient?.fullName} y tiene{' '}
              {duplicateClient?.history.length ?? 0}{' '}
              {(duplicateClient?.history.length ?? 0) === 1 ? 'visita registrada' : 'visitas registradas'}.
              ¿Deseas unificar esta captura con ese cliente? El nombre y correo existentes se conservarán;
              cualquier variante nueva se guardará como dato alternativo en su historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateClient(null)}>
              Revisar datos
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!duplicateClient) return
                handleSaveBooking(duplicateClient.id)
              }}
            >
              Unificar y guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
