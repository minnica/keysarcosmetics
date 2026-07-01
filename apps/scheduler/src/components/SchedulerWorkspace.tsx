'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from '@cosmetics/ui'
import {
  schedulerBranches,
  schedulerDayBookings,
  schedulerDayBlocks,
  schedulerProfessionals,
  schedulerReferenceDate,
  schedulerReferenceDateKey,
  schedulerServices,
  type AvailabilityBlock,
  type Booking,
  type BookingStatus,
  type SchedulerView,
  type ServiceOption,
} from '@/lib/mock-scheduler-data'
import {
  addMinutesToTime,
  createBlockDraft,
  createBlockDraftFromBlock,
  createDraft,
  createDraftFromBooking,
  getMinutesFromTime,
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
import { SchedulerSidebar } from './scheduler/SchedulerSidebar'
import { SchedulerHeader } from './scheduler/SchedulerHeader'
import { SchedulerAgendaGrid } from './scheduler/SchedulerAgendaGrid'

export function SchedulerWorkspace() {
  const [selectedDate, setSelectedDate] = useState(schedulerReferenceDate)
  const [monthCursor, setMonthCursor] = useState(startOfMonth(schedulerReferenceDate))
  const [currentView, setCurrentView] = useState<SchedulerView>('day')
  const [selectedBranch, setSelectedBranch] = useState(schedulerBranches[0]?.id ?? 'opatra')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'active'>('active')
  const [professionalQuery, setProfessionalQuery] = useState('')
  const [quickTimeFilter, setQuickTimeFilter] = useState('all')
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>(
    schedulerProfessionals.map((professional) => professional.id),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [emptySlotAction, setEmptySlotAction] = useState<EmptySlotAction | null>(null)
  const [bookings, setBookings] = useState<Booking[]>(schedulerDayBookings)
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>(schedulerDayBlocks)
  const [draft, setDraft] = useState<BookingDraft>(() => createDraft(schedulerReferenceDate, schedulerProfessionals))
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [detailView, setDetailView] = useState<'payment' | 'record'>('record')
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)
  const [agendaMotionKey, setAgendaMotionKey] = useState(0)
  const sidebarBookingTimerRef = useRef<number | null>(null)
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')

  const branchProfessionals = useMemo(() => {
    return schedulerProfessionals.filter(
      (professional) =>
        professional.branchId === selectedBranch || professional.id.startsWith('pending-'),
    )
  }, [selectedBranch])

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
      const matchesDate = bookingDateKey === selectedDateKey
      const matchesStatus =
        statusFilter === 'active' ? booking.status !== 'no-show' : booking.status === statusFilter
      const matchesTime = quickTimeFilter === 'all' ? true : booking.start === quickTimeFilter

      return matchesProfessional && matchesDate && matchesStatus && matchesTime
    })
  }, [bookings, quickTimeFilter, selectedDateKey, statusFilter, visibleProfessionals])

  const visibleBlocks = useMemo(() => {
    return availabilityBlocks.filter((block) => {
      const blockDateKey = block.date ?? schedulerReferenceDateKey
      return (
        blockDateKey === selectedDateKey &&
        visibleProfessionals.some((professional) => professional.id === block.professionalId)
      )
    })
  }, [availabilityBlocks, selectedDateKey, visibleProfessionals])

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 })
    const end = endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [selectedDate])

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
  }, [currentView, selectedDateKey])

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
    toast.success('Agenda actualizada', {
      description: 'La vista se sincronizo y la agenda quedo actualizada.',
    })
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
    setDraft(createDraftFromBooking(booking, selectedDate))
    setEmptySlotAction(null)
    setIsDialogOpen(true)
  }

  function handleDeleteBooking(bookingId: string) {
    setBookings((current) => current.filter((booking) => booking.id !== bookingId))
    toast.success('Reserva eliminada', {
      description: 'La cita se retiro de la agenda actual.',
    })
  }

  function handleUpdateBookingStatus(bookingId: string, status: BookingStatus) {
    setBookings((current) =>
      current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
    )
    toast.success('Estado actualizado', {
      description: `La reserva cambio correctamente de estatus.`,
    })
  }

  function handleToggleBookingPaid(bookingId: string) {
    let nextPaymentLabel = 'No pagado'

    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId) return booking
        nextPaymentLabel = booking.paymentLabel === 'No pagado' ? 'Reserva pagada' : 'No pagado'
        return { ...booking, paymentLabel: nextPaymentLabel }
      }),
    )

    toast.success('Pago actualizado', {
      description:
        nextPaymentLabel === 'No pagado'
          ? 'La reserva quedo marcada como no pagada.'
          : 'La reserva quedo marcada como pagada.',
    })
  }

  function handleOpenBookingDetail(booking: Booking, view: 'payment' | 'record') {
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
      schedulerProfessionals.find((professional) => professional.id === blockDraft.professionalId)?.name ?? 'Profesional'

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

    const nextBlock: AvailabilityBlock = {
      id: blockDraft.blockId ?? `block-mock-${Date.now()}`,
      date: blockDateKey,
      professionalId: blockDraft.professionalId,
      start,
      end,
      label: 'Hora bloqueada',
      variant: 'blocked',
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

  function handleSaveBooking() {
    if (!draft.customerName.trim()) {
      toast.error('Falta el nombre del cliente')
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
      schedulerProfessionals.find((professional) => professional.id === draft.professionalId)?.name ?? 'Profesional'

    if (startMinutes < schedulerBaseMinutes || endMinutes > schedulerClosingMinutes) {
      toast.error('La reserva se sale del horario permitido', {
        description: 'La agenda solo permite citas entre 09:00 y 21:00.',
      })
      return
    }

    const conflictingBooking = bookings.find((booking) => {
      const currentBookingDateKey = booking.date ?? schedulerReferenceDateKey
      return (
        booking.id !== draft.bookingId &&
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

    const conflictingBlock = availabilityBlocks.find((block) => {
      const blockDateKey = block.date ?? schedulerReferenceDateKey
      return (
        blockDateKey === bookingDateKey &&
        block.professionalId === draft.professionalId &&
        timesOverlap(block.start, block.end, start, end)
      )
    })

    if (conflictingBlock) {
      toast.error('Ese horario no esta disponible', {
        description: `${professionalName} tiene un bloqueo de ${conflictingBlock.start} a ${conflictingBlock.end}.`,
      })
      return
    }

    const nextBooking: Booking = {
      id: draft.bookingId ?? `booking-${Date.now()}`,
      date: bookingDateKey,
      customerName: draft.customerName.trim(),
      serviceName: selectedService?.name ?? 'Servicio',
      professionalId: draft.professionalId,
      start,
      end,
      status: draft.status,
      phone: draft.phone.trim(),
      paymentLabel: draft.paymentLabel,
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
    toast.success(draft.bookingId ? 'Reserva actualizada' : 'Reserva creada', {
      description: draft.bookingId
        ? 'La cita se actualizo dentro de la agenda actual.'
        : 'La cita ya aparece en la agenda para validar flujo e interaccion.',
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(195,165,131,0.14),transparent_16%),linear-gradient(180deg,#f3f0e9_0%,#f7f3ed_100%)]">
      <SchedulerHeader
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedDate={selectedDate}
        weekDays={weekDays}
        selectedBranch={selectedBranch}
        onDateStep={handleDateStep}
        onGoToday={() => setSelectedDate(schedulerReferenceDate)}
        onRefresh={handleRefresh}
        onOpenNewBooking={() => openNewBooking()}
      />

      <main className="grid min-h-[calc(100vh-84px)] grid-cols-1 items-start xl:grid-cols-[300px_minmax(0,1fr)]">
        <SchedulerSidebar
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
          onQuickTimeFilterChange={setQuickTimeFilter}
          monthCursor={monthCursor}
          onMonthCursorChange={setMonthCursor}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          onDateQuickCreate={handleSidebarDateQuickCreate}
        />

        <section className="flex min-w-0 flex-col px-4 py-5 sm:px-6 xl:px-8">
          <div key={agendaMotionKey} className="scheduler-content-entrance">
            <SchedulerAgendaGrid
              currentView={currentView}
              visibleProfessionals={visibleProfessionals}
              visibleBookings={visibleBookings}
              visibleBlocks={visibleBlocks}
              selectedDate={selectedDate}
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
              onToggleBookingPaid={handleToggleBookingPaid}
              onUpdateBookingStatus={handleUpdateBookingStatus}
            />
          </div>
        </section>
      </main>

      <SchedulerBookingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        professionals={schedulerProfessionals}
        draft={draft}
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
        booking={activeBooking}
        open={Boolean(activeBooking)}
        onOpenChange={(open) => {
          if (!open) setActiveBooking(null)
        }}
        selectedDate={selectedDate}
        view={detailView}
      />
    </div>
  )
}
