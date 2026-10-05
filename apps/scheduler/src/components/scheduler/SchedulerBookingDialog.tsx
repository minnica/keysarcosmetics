"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "@cosmetics/ui";
import {
  CalendarDays,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  DoorOpen,
  ShoppingBag,
  Sparkles,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { SchedulerCustomerFieldDefinitionDto } from "@cosmetics/types";
import {
  bookingStatuses,
  type AvailabilityBlock,
  type Booking,
  type BookingStatus,
  type BookingStatusColors,
  type BranchOption,
  type Professional,
  type ServiceOption,
} from "@/lib/scheduler-presentation";
import {
  findSchedulerClients,
  normalizeClientPhone,
  type SchedulerClient,
} from "@/lib/scheduler-client-presentation";
import {
  formatMoney,
  getAvailableBookingStartTimes,
  type BookingDraft,
} from "./scheduler-utils";

interface SchedulerBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchOption[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  bookings: Booking[];
  availabilityBlocks: AvailabilityBlock[];
  clients: SchedulerClient[];
  services: ServiceOption[];
  columns?: Professional[];
  draft: BookingDraft;
  statusColors: BookingStatusColors;
  onDraftChange: (draft: BookingDraft) => void;
  onSave: () => void;
  onSaveNewClient: () => void;
  availableStartTimes?: string[];
  availabilityLoading?: boolean;
  availabilityError?: string | null;
  onClientSearchQueryChange?: (query: string) => void;
  allowedStatuses?: BookingStatus[];
  showCommercialFields?: boolean;
  showInternalNote?: boolean;
  serviceLocked?: boolean;
  saving?: boolean;
  canCreateClient?: boolean;
  additionalFieldDefinitions?: SchedulerCustomerFieldDefinitionDto[];
  cabinOptions?: Array<{ id: string; name: string; capacity: number }>;
  specialistOptions?: Array<{ id: string; name: string }>;
  representativeOptions?: Array<{
    id: string;
    name: string;
    role: string;
    source: "SCHEDULER" | "POS_CRM";
  }>;
  enableCabinVisitFlow?: boolean;
  appointmentDetailsLocked?: boolean;
  hideAdditionalFields?: boolean;
}

interface SchedulerConfiguredFieldsProps {
  definitions: SchedulerCustomerFieldDefinitionDto[];
  description: string;
  idPrefix: string;
  values: BookingDraft["additionalAnswers"];
  onValueChange: (definitionId: string, value: string | boolean) => void;
}

function SchedulerConfiguredFields({
  definitions,
  description,
  idPrefix,
  values,
  onValueChange,
}: SchedulerConfiguredFieldsProps) {
  if (!definitions.length) return null;

  return (
    <div className="grid gap-4 rounded-[20px] border border-[rgba(236,209,200,0.9)] bg-white/80 p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="scheduler-modal-label">Preguntas configurables</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {definitions.map((definition) => {
        const value = values[definition.id];
        return (
          <div className="space-y-2" key={definition.id}>
            <label
              className="scheduler-modal-label"
              htmlFor={`${idPrefix}-${definition.id}`}
            >
              {definition.label}
              {definition.required ? " *" : ""}
            </label>
            {definition.type === "SELECT" ? (
              <Select
                value={typeof value === "string" ? value : ""}
                onValueChange={(next) =>
                  onValueChange(definition.id, next)
                }
              >
                <SelectTrigger
                  id={`${idPrefix}-${definition.id}`}
                  className="scheduler-modal-select-trigger"
                >
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent className="scheduler-modal-select-content">
                  {(definition.options ?? []).map((option) => (
                    <SelectItem
                      key={option}
                      className="scheduler-modal-select-item"
                      value={option}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : definition.type === "BOOLEAN" ? (
              <label className="flex h-14 items-center gap-3 rounded-[22px] border border-[rgba(236,209,200,0.95)] bg-white px-4 text-sm text-slate-700">
                <input
                  checked={value === true}
                  className="h-4 w-4 accent-[var(--scheduler-accent)]"
                  id={`${idPrefix}-${definition.id}`}
                  onChange={(event) =>
                    onValueChange(definition.id, event.target.checked)
                  }
                  type="checkbox"
                />
                Sí
              </label>
            ) : (
              <Input
                className="scheduler-modal-input"
                id={`${idPrefix}-${definition.id}`}
                inputMode={
                  definition.type === "NUMBER" ? "decimal" : undefined
                }
                onChange={(event) =>
                  onValueChange(definition.id, event.target.value)
                }
                type={
                  definition.type === "DATE"
                    ? "date"
                    : definition.type === "NUMBER"
                      ? "number"
                      : "text"
                }
                value={typeof value === "string" ? value : ""}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SchedulerBookingDialog({
  open,
  onOpenChange,
  branches,
  selectedBranch,
  onBranchChange,
  bookings,
  availabilityBlocks,
  clients,
  services,
  columns = [],
  draft,
  statusColors,
  onDraftChange,
  onSave,
  onSaveNewClient,
  availableStartTimes: canonicalStartTimes,
  availabilityLoading = false,
  availabilityError = null,
  onClientSearchQueryChange,
  allowedStatuses,
  showCommercialFields = true,
  showInternalNote = true,
  serviceLocked = false,
  saving = false,
  canCreateClient = true,
  additionalFieldDefinitions = [],
  cabinOptions = [],
  specialistOptions = [],
  representativeOptions = [],
  enableCabinVisitFlow = false,
  appointmentDetailsLocked = false,
  hideAdditionalFields = false,
}: SchedulerBookingDialogProps) {
  const selectedService = services.find(
    (service) => service.id === draft.serviceId,
  );
  const isEditing = Boolean(draft.bookingId);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const selectedDateKey = format(draft.date, "yyyy-MM-dd");
  const localStartTimes = useMemo(
    () =>
      getAvailableBookingStartTimes({
        bookings,
        availabilityBlocks,
        dateKey: selectedDateKey,
        professionalId: draft.professionalId,
        durationMinutes: selectedService?.durationMinutes ?? 60,
        allowBlockedTimes: true,
        ...(draft.bookingId ? { editingBookingId: draft.bookingId } : {}),
      }),
    [
      availabilityBlocks,
      bookings,
      draft.bookingId,
      draft.professionalId,
      selectedDateKey,
      selectedService?.durationMinutes,
    ],
  );
  const availableStartTimes = canonicalStartTimes ?? localStartTimes;
  const availableHourOptions = useMemo(
    () => [
      ...new Set(availableStartTimes.map((time) => time.split(":")[0] ?? "")),
    ],
    [availableStartTimes],
  );
  const availableMinuteOptions = useMemo(
    () =>
      availableStartTimes
        .filter((time) => time.startsWith(`${draft.hour}:`))
        .map((time) => time.split(":")[1] ?? "00"),
    [availableStartTimes, draft.hour],
  );
  const selectedStartTime = `${draft.hour}:${draft.minute}`;
  const hasAvailableTimes = availableStartTimes.length > 0;
  const selectedTimeIsAvailable =
    availableStartTimes.includes(selectedStartTime);
  const canSaveAtSelectedTime =
    appointmentDetailsLocked ||
    draft.status === "canceled" ||
    selectedTimeIsAvailable;
  const clientSuggestions = useMemo(
    () => findSchedulerClients(clients, clientSearchQuery),
    [clientSearchQuery, clients],
  );
  const exactPhoneMatch = useMemo(() => {
    const normalizedPhone = normalizeClientPhone(draft.phone);
    if (!normalizedPhone) return undefined;
    return clients.find((client) => client.normalizedPhone === normalizedPhone);
  }, [clients, draft.phone]);
  const selectedCabin = cabinOptions.find(
    (cabin) => cabin.id === draft.cabinResourceId,
  );
  const portfolioOwnerDefinition = additionalFieldDefinitions.find(
    (definition) => definition.id === "design-field-sales-owner",
  );
  const appointmentFieldDefinitions = additionalFieldDefinitions.filter(
    (definition) => definition.id !== "design-field-sales-owner",
  );
  const requiredCustomerFieldsComplete = additionalFieldDefinitions.every(
    (definition) => {
      if (!definition.required) return true;
      const value = draft.additionalAnswers[definition.id];
      return definition.type === "BOOLEAN"
        ? typeof value === "boolean"
        : typeof value === "string" && value.trim().length > 0;
    },
  );
  const newClientFormValid = Boolean(
    newClientFirstName.trim().length >= 2 &&
      newClientLastName.trim().length >= 2 &&
      normalizeClientPhone(draft.phone).length >= 10 &&
      requiredCustomerFieldsComplete,
  );
  const cabinVisitValid =
    !enableCabinVisitFlow ||
    Boolean(
      selectedCabin &&
      Boolean(draft.representativeId) &&
      draft.visitors.length === selectedCabin.capacity &&
      draft.visitors.every(
        (visitor, index) =>
          (index === 0 ? draft.customerName.trim() : visitor.name.trim())
            .length >= 2 &&
          Boolean(visitor.specialistProfileId) &&
          (!appointmentDetailsLocked || visitor.purchaseKind !== null) &&
          (visitor.purchaseKind === null ||
            visitor.purchaseKind === "NONE" ||
            (Number(visitor.saleAmount) > 0 &&
              (visitor.purchaseKind === "FULL" ||
                (Number(visitor.depositAmount) > 0 &&
                  Number(visitor.depositAmount) <=
                    Number(visitor.saleAmount))))),
      ) &&
      new Set(draft.visitors.map((visitor) => visitor.specialistProfileId))
        .size === draft.visitors.length,
    );

  useEffect(() => {
    if (!open) {
      setIsNewClientOpen(false);
      setIsAdditionalInfoOpen(false);
      setNewClientFirstName("");
      setNewClientLastName("");
      setClientSearchQuery("");
      setClientSuggestionsOpen(false);
    } else {
      setClientSearchQuery(draft.customerName);
    }
  }, [draft.customerName, open]);

  useEffect(() => {
    if (!isNewClientOpen || !draft.clientId) return;
    setIsNewClientOpen(false);
    setClientSearchQuery(draft.customerName);
  }, [draft.clientId, draft.customerName, isNewClientOpen]);

  useEffect(() => {
    if (
      !open ||
      appointmentDetailsLocked ||
      draft.status === "canceled" ||
      !hasAvailableTimes ||
      selectedTimeIsAvailable
    ) {
      return;
    }

    const [hour = "09", minute = "00"] =
      availableStartTimes[0]?.split(":") ?? [];
    onDraftChange({ ...draft, hour, minute });
  }, [
    availableStartTimes,
    appointmentDetailsLocked,
    draft,
    hasAvailableTimes,
    onDraftChange,
    open,
    selectedTimeIsAvailable,
  ]);

  function patchDraft(patch: Partial<BookingDraft>) {
    onDraftChange({ ...draft, ...patch });
  }

  function updateConfiguredAnswer(
    definitionId: string,
    value: string | boolean,
  ) {
    patchDraft({
      additionalAnswers: {
        ...draft.additionalAnswers,
        [definitionId]: value,
      },
    });
  }

  function selectCabin(cabinId: string) {
    const cabin = cabinOptions.find((option) => option.id === cabinId);
    if (!cabin) return;
    const visitors = Array.from(
      { length: cabin.capacity },
      (_value, index) =>
        draft.visitors[index] ?? {
          id: `visitor-${index + 1}`,
          customerId: null,
          name: "",
          specialistProfileId: "",
          purchased: null,
          purchaseAmount: "",
          purchaseKind: null,
          saleAmount: "",
          depositAmount: "",
        },
    );
    patchDraft({
      cabinResourceId: cabin.id,
      cabinCapacity: cabin.capacity,
      visitors,
    });
  }

  function patchVisitor(
    index: number,
    patch: Partial<BookingDraft["visitors"][number]>,
  ) {
    patchDraft({
      visitors: draft.visitors.map((visitor, visitorIndex) =>
        visitorIndex === index ? { ...visitor, ...patch } : visitor,
      ),
    });
  }

  function handleNewClientNameChange(firstName: string, lastName: string) {
    setNewClientFirstName(firstName);
    setNewClientLastName(lastName);
    patchDraft({
      clientId: null,
      customerName: [firstName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(" "),
    });
  }

  function selectClient(client: SchedulerClient) {
    const [firstName = "", ...lastNameParts] = client.fullName.split(" ");
    setNewClientFirstName(firstName);
    setNewClientLastName(lastNameParts.join(" "));
    setClientSearchQuery(client.fullName);
    setClientSuggestionsOpen(false);
    setIsNewClientOpen(false);
    patchDraft({
      clientId: client.id,
      customerName: client.fullName,
      customerEmail: client.email,
      phone: client.phone,
    });
  }

  function handleClientSearchChange(value: string) {
    setClientSearchQuery(value);
    onClientSearchQueryChange?.(value);
    setClientSuggestionsOpen(findSchedulerClients(clients, value).length > 0);
    if (draft.clientId) {
      patchDraft({
        clientId: null,
        customerName: "",
        customerEmail: "",
        phone: "",
      });
    }
  }

  function handlePhoneChange(value: string) {
    const selectedClient = clients.find(
      (client) => client.id === draft.clientId,
    );
    const keepsSelectedClient =
      selectedClient &&
      selectedClient.normalizedPhone === normalizeClientPhone(value);
    patchDraft({
      clientId: keepsSelectedClient ? selectedClient.id : null,
      phone: value,
    });
  }

  function openNewClientForm() {
    const nextOpen = !isNewClientOpen;
    setIsNewClientOpen(nextOpen);
    if (!nextOpen) return;

    const queryHasLetters = /[a-záéíóúñü]/i.test(clientSearchQuery);
    const queryPhone = normalizeClientPhone(clientSearchQuery);
    const [firstName = "", ...lastNameParts] = queryHasLetters
      ? clientSearchQuery.trim().split(/\s+/)
      : [];
    const lastName = lastNameParts.join(" ");
    setNewClientFirstName(firstName);
    setNewClientLastName(lastName);
    setClientSuggestionsOpen(false);
    patchDraft({
      clientId: null,
      customerName: queryHasLetters
        ? [firstName, lastName].filter(Boolean).join(" ")
        : "",
      phone: !queryHasLetters && queryPhone ? clientSearchQuery : draft.phone,
    });
  }

  const newClientForm = (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="rounded-[24px] border border-[rgba(236,209,200,0.88)] bg-white/85 p-4 md:p-6">
        <div className="mb-5">
          <p className="label-caps">Paso 1 de 2</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--scheduler-ink-strong)]">
            Información del cliente
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Guarda primero el expediente. Después podrás continuar con fecha,
            servicio, cabina y demás datos de la reserva.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="scheduler-modal-label" htmlFor="new-client-name">
              Nombre *
            </label>
            <Input
              autoFocus
              className="scheduler-modal-input"
              id="new-client-name"
              placeholder="Nombre"
              required
              value={newClientFirstName}
              onChange={(event) =>
                handleNewClientNameChange(
                  event.target.value,
                  newClientLastName,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <label
              className="scheduler-modal-label"
              htmlFor="new-client-last-name"
            >
              Apellido *
            </label>
            <Input
              className="scheduler-modal-input"
              id="new-client-last-name"
              placeholder="Apellido"
              required
              value={newClientLastName}
              onChange={(event) =>
                handleNewClientNameChange(
                  newClientFirstName,
                  event.target.value,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <label
              className="scheduler-modal-label"
              htmlFor="new-client-phone"
            >
              Teléfono *
            </label>
            <Input
              autoComplete="tel"
              className="scheduler-modal-input"
              id="new-client-phone"
              inputMode="tel"
              placeholder="+52 55 0000 0000"
              required
              value={draft.phone}
              onChange={(event) => handlePhoneChange(event.target.value)}
            />
            {exactPhoneMatch && draft.clientId !== exactPhoneMatch.id ? (
              <p className="text-sm font-medium text-amber-800" role="status">
                Este teléfono ya pertenece a {exactPhoneMatch.fullName}. Al
                guardar podrás seleccionar ese expediente existente.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label
              className="scheduler-modal-label"
              htmlFor="new-client-email"
            >
              Email
            </label>
            <Input
              autoComplete="email"
              className="scheduler-modal-input"
              id="new-client-email"
              placeholder="correo@cliente.com"
              type="email"
              value={draft.customerEmail}
              onChange={(event) =>
                patchDraft({
                  clientId: null,
                  customerEmail: event.target.value,
                })
              }
            />
          </div>
          {portfolioOwnerDefinition ? (
            <div className="space-y-2 md:col-span-2">
              <label className="scheduler-modal-label">
                Representante de cartera *
              </label>
              <Select
                value={
                  typeof draft.additionalAnswers[
                    portfolioOwnerDefinition.id
                  ] === "string"
                    ? String(
                        draft.additionalAnswers[portfolioOwnerDefinition.id],
                      )
                    : ""
                }
                onValueChange={(value) =>
                  updateConfiguredAnswer(portfolioOwnerDefinition.id, value)
                }
              >
                <SelectTrigger className="scheduler-modal-select-trigger">
                  <SelectValue placeholder="Selecciona vendedor, representante o cartera de empresa" />
                </SelectTrigger>
                <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                  {(portfolioOwnerDefinition.options ?? []).map((option) => (
                    <SelectItem
                      className="scheduler-modal-select-item"
                      key={option}
                      value={option}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-slate-500">
                Define la cartera vigente del cliente. Si el representante del
                POS se inactiva, las nuevas citas usarán la cartera de la
                empresa sin alterar el historial.
              </p>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <SchedulerConfiguredFields
              definitions={appointmentFieldDefinitions}
              description="Estos datos configurables se guardarán en el expediente y permanecerán disponibles al continuar la reserva."
              idPrefix="new-client-question"
              onValueChange={updateConfiguredAnswer}
              values={draft.additionalAnswers}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="scheduler-dialog max-h-[92vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[1020px]"
        hideCloseButton
      >
        <div className="scheduler-modal-shell grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[30px]">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="label-caps">Agenda</p>
                <DialogTitle className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--scheduler-ink-strong)] md:text-[1.95rem]">
                  {isNewClientOpen
                    ? "Nuevo cliente"
                    : appointmentDetailsLocked
                    ? "Atención y compra"
                    : isEditing
                      ? "Editar reserva"
                      : "Nueva reserva"}
                </DialogTitle>
                <p className="mt-1 text-[0.92rem] text-slate-500">
                  {isNewClientOpen
                    ? "Primero guarda los datos del cliente para continuar con la reserva."
                    : appointmentDetailsLocked
                    ? "Registra cabina, visitantes, especialistas y compra sin modificar la cita finalizada."
                    : isEditing
                      ? "Ajusta los datos de la cita seleccionada antes de guardarla."
                      : "Captura rapida para agregar una nueva reserva a la agenda."}
                </p>
              </div>
              <div className="flex items-center gap-3 self-start">
                {!isNewClientOpen ? (
                  <Select
                    disabled={appointmentDetailsLocked}
                    value={draft.status}
                    onValueChange={(value) =>
                      patchDraft({ status: value as BookingStatus })
                    }
                  >
                    <SelectTrigger className="scheduler-modal-select-trigger h-12 w-[220px] text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="scheduler-modal-select-content">
                      {Object.entries(bookingStatuses)
                        .filter(
                          ([value]) =>
                            !allowedStatuses ||
                            allowedStatuses.includes(value as BookingStatus),
                        )
                        .map(([value, meta]) => (
                          <SelectItem
                            key={value}
                            className="scheduler-modal-select-item"
                            value={value}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3.5 w-3.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    statusColors[value as BookingStatus],
                                }}
                              />
                              <span>{meta.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 shadow-sm transition hover:bg-[rgba(245,237,228,0.85)] hover:text-slate-700"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="scheduler-modal-body bg-[linear-gradient(180deg,rgba(243,240,233,0.4)_0%,rgba(255,255,255,0.22)_100%)]">
            {isNewClientOpen ? (
              <div className="px-4 py-4 md:px-6 md:py-5">{newClientForm}</div>
            ) : null}
            <div
              className="space-y-4 px-4 py-4 md:px-6 md:py-5"
              hidden={isNewClientOpen}
            >
              <div className="scheduler-modal-section rounded-[24px] p-4 md:p-5">
                <div className="mb-4">
                  <p className="text-[0.95rem] font-medium text-slate-500">
                    Informacion requerida
                  </p>
                </div>
                <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Fecha</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="scheduler-modal-input flex w-full items-center justify-between px-4 py-3 text-left capitalize"
                          disabled={appointmentDetailsLocked}
                          type="button"
                        >
                          <span>
                            {format(draft.date, "EEEE d 'de' MMMM 'de' yyyy", {
                              locale: es,
                            })}
                          </span>
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[320px] rounded-[24px] border-[rgba(236,209,200,0.95)] bg-white p-3 shadow-[0_18px_48px_rgba(79,61,43,0.16)]"
                      >
                        <Calendar
                          className="w-full"
                          locale={es}
                          mode="single"
                          month={draft.date}
                          onMonthChange={(date) => patchDraft({ date })}
                          onSelect={(date) => {
                            if (date) patchDraft({ date });
                          }}
                          selected={draft.date}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="scheduler-booking-time-grid grid grid-cols-[1fr_auto_1fr_auto] items-end gap-3">
                    <div className="space-y-2">
                      <label className="scheduler-modal-label">Hora</label>
                      <Select
                        disabled={
                          appointmentDetailsLocked || !hasAvailableTimes
                        }
                        value={
                          availableHourOptions.includes(draft.hour)
                            ? draft.hour
                            : ""
                        }
                        onValueChange={(value) => {
                          const firstAvailableMinute =
                            availableStartTimes
                              .find((time) => time.startsWith(`${value}:`))
                              ?.split(":")[1] ?? "00";
                          patchDraft({
                            hour: value,
                            minute: firstAvailableMinute,
                          });
                        }}
                      >
                        <SelectTrigger className="scheduler-modal-select-trigger">
                          <SelectValue placeholder="Sin horarios" />
                        </SelectTrigger>
                        <SelectContent className="scheduler-modal-select-content max-h-[280px]">
                          {availableHourOptions.map((option) => (
                            <SelectItem
                              key={option}
                              className="scheduler-modal-select-item"
                              value={option}
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="pb-4 text-2xl text-[var(--color-gold)]">
                      :
                    </span>
                    <div className="space-y-2">
                      <label className="sr-only">Minuto</label>
                      <Select
                        disabled={
                          appointmentDetailsLocked || !hasAvailableTimes
                        }
                        value={
                          availableMinuteOptions.includes(draft.minute)
                            ? draft.minute
                            : ""
                        }
                        onValueChange={(value) => patchDraft({ minute: value })}
                      >
                        <SelectTrigger className="scheduler-modal-select-trigger">
                          <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent className="scheduler-modal-select-content max-h-[240px]">
                          {availableMinuteOptions.map((option) => (
                            <SelectItem
                              key={option}
                              className="scheduler-modal-select-item"
                              value={option}
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      className="mb-1 rounded-2xl text-base text-[var(--scheduler-ink-strong)] underline-offset-4 hover:bg-transparent hover:text-[var(--scheduler-accent-strong)] hover:underline"
                      disabled
                      title="Las reservas recurrentes aún no tienen contrato operativo."
                    >
                      Repetir
                    </Button>
                  </div>
                </div>
                {availabilityLoading ? (
                  <p
                    className="mt-3 text-sm font-medium text-slate-600"
                    role="status"
                  >
                    Consultando disponibilidad real…
                  </p>
                ) : availabilityError ? (
                  <p
                    className="mt-3 text-sm font-medium text-rose-700"
                    role="alert"
                  >
                    {availabilityError}
                  </p>
                ) : !hasAvailableTimes && draft.status !== "canceled" ? (
                  <p
                    className="mt-3 text-sm font-medium text-rose-700"
                    role="status"
                  >
                    No hay horarios disponibles para este especialista, fecha y
                    duración de servicio.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500" role="status">
                    Los horarios disponibles ya consideran jornada, bloqueos,
                    capacidad y recursos en el servidor.
                  </p>
                )}

                <div className="mt-6 grid gap-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <label className="scheduler-modal-label">Cliente</label>
                      <Popover
                        open={
                          clientSuggestionsOpen && clientSuggestions.length > 0
                        }
                        onOpenChange={setClientSuggestionsOpen}
                      >
                        <PopoverAnchor asChild>
                          <Input
                            autoComplete="off"
                            className="scheduler-modal-input"
                            disabled={appointmentDetailsLocked}
                            placeholder="Escribe nombre, apellido o teléfono"
                            value={clientSearchQuery}
                            onChange={(event) =>
                              handleClientSearchChange(event.target.value)
                            }
                            onFocus={() =>
                              setClientSuggestionsOpen(
                                clientSuggestions.length > 0,
                              )
                            }
                          />
                        </PopoverAnchor>
                        <PopoverContent
                          align="start"
                          className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-[rgba(236,209,200,0.95)] bg-white p-2 shadow-[0_8px_24px_rgba(79,61,43,0.14)]"
                          onOpenAutoFocus={(event) => event.preventDefault()}
                        >
                          <p className="px-3 py-2 text-xs font-semibold text-slate-500">
                            Clientes encontrados
                          </p>
                          <div className="space-y-1">
                            {clientSuggestions.map((client) => (
                              <button
                                key={client.id}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[rgba(245,237,228,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scheduler-accent)]"
                                onClick={() => selectClient(client)}
                                type="button"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-[var(--scheduler-ink-strong)]">
                                    {client.fullName}
                                  </span>
                                  <span className="block text-xs text-slate-600">
                                    {client.phone}
                                  </span>
                                </span>
                                <span className="shrink-0 text-xs text-slate-500">
                                  {client.history.length}{" "}
                                  {client.history.length === 1
                                    ? "visita"
                                    : "visitas"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {draft.clientId ? (
                        <p className="text-sm font-medium text-emerald-700">
                          Cliente existente vinculado a su historial.
                        </p>
                      ) : null}
                    </div>
                    {canCreateClient && !appointmentDetailsLocked ? (
                      <div className="flex items-end">
                        <Button
                          className="scheduler-modal-cta px-5"
                          onClick={openNewClientForm}
                          type="button"
                        >
                          <UserRoundPlus className="mr-2 h-5 w-5" />
                          Nuevo cliente
                          {isNewClientOpen ? (
                            <ChevronUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <label className="scheduler-modal-label">Sucursal</label>
                      <Select
                        disabled={appointmentDetailsLocked}
                        value={selectedBranch}
                        onValueChange={onBranchChange}
                      >
                        <SelectTrigger className="scheduler-modal-select-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                          {branches.map((branch) => (
                            <SelectItem
                              key={branch.id}
                              className="scheduler-modal-select-item"
                              value={branch.id}
                            >
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        aria-label="Duplicar reserva en otra sucursal"
                        variant="outline"
                        className="scheduler-modal-secondary px-4 text-[var(--scheduler-accent)]"
                        disabled
                        title="La duplicación entre sucursales aún no tiene contrato operativo."
                      >
                        <Copy className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Servicios</label>
                    <Select
                      disabled={appointmentDetailsLocked || serviceLocked}
                      value={draft.serviceId}
                      onValueChange={(value) =>
                        patchDraft({ serviceId: value })
                      }
                    >
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue placeholder="Busca un servicio" />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                        {services.map((service) => (
                          <SelectItem
                            key={service.id}
                            className="scheduler-modal-select-item"
                            value={service.id}
                          >
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedService ? (
                      <div className="scheduler-modal-chip">
                        <Clock3 className="h-4 w-4" />
                        Duracion estimada: {selectedService.durationMinutes} min
                      </div>
                    ) : null}
                    {serviceLocked ? (
                      <p className="text-sm text-slate-500">
                        Esta cita conserva varios servicios canónicos; edita
                        aquí fecha, cliente, estado o notas sin reemplazar sus
                        servicios.
                      </p>
                    ) : null}
                  </div>

                  {enableCabinVisitFlow ? (
                    <div className="space-y-4 rounded-[20px] border border-[rgba(236,209,200,0.9)] bg-[rgba(245,237,228,0.32)] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-[var(--scheduler-accent)]" />
                            <p className="scheduler-modal-label">
                              Cabina y capacidad
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {appointmentDetailsLocked
                              ? "Registra quién atendió a cada visitante y el resultado comercial de la atención."
                              : "La capacidad define cuántos visitantes y especialistas asignados requiere la reserva."}
                          </p>
                          {appointmentDetailsLocked ? (
                            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                              Para marcar la cita como atendida debes indicar en
                              cada persona si compró o no. Las compras y
                              apartados requieren sus montos completos.
                            </p>
                          ) : null}
                        </div>
                        {selectedCabin ? (
                          <span className="scheduler-modal-chip">
                            <UsersRound className="h-4 w-4" />
                            {selectedCabin.capacity}{" "}
                            {selectedCabin.capacity === 1
                              ? "persona"
                              : "personas"}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                          <label className="scheduler-modal-label">
                            Cabina configurada
                          </label>
                          <Select
                            disabled={isEditing || appointmentDetailsLocked}
                            value={draft.cabinResourceId}
                            onValueChange={selectCabin}
                          >
                            <SelectTrigger className="scheduler-modal-select-trigger">
                              <SelectValue placeholder="Selecciona una cabina" />
                            </SelectTrigger>
                            <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                              {cabinOptions.map((cabin) => (
                                <SelectItem
                                  key={cabin.id}
                                  className="scheduler-modal-select-item"
                                  value={cabin.id}
                                >
                                  {cabin.name} ·{" "}
                                  {cabin.capacity === 1
                                    ? "Individual"
                                    : `${cabin.capacity} personas`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isEditing ? (
                            <p className="text-xs leading-5 text-slate-500">
                              La cabina y su capacidad son de sólo lectura
                              porque ya fueron configuradas para esta cita.
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="scheduler-modal-label">
                            Vendedor o representante de esta cita
                          </label>
                          <Select
                            value={draft.representativeId}
                            onValueChange={(representativeId) =>
                              patchDraft({ representativeId })
                            }
                          >
                            <SelectTrigger className="scheduler-modal-select-trigger">
                              <SelectValue placeholder="Selecciona un representante" />
                            </SelectTrigger>
                            <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                              {representativeOptions.map((representative) => (
                                <SelectItem
                                  className="scheduler-modal-select-item"
                                  key={representative.id}
                                  value={representative.id}
                                >
                                  {representative.name} · {representative.role}{" "}
                                  ·{" "}
                                  {representative.source === "POS_CRM"
                                    ? "POS"
                                    : "Agenda"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs leading-5 text-slate-500">
                            Puede cambiar en cada cita y no modifica al vendedor
                            de cartera del cliente.
                          </p>
                        </div>
                      </div>
                      {draft.visitors.map((visitor, index) => (
                        <div
                          className={cn(
                            "grid gap-4 rounded-2xl border border-white bg-white/85 p-4 md:grid-cols-2",
                            appointmentDetailsLocked && "2xl:grid-cols-10",
                          )}
                          key={visitor.id}
                        >
                          <div
                            className={cn(
                              "space-y-2",
                              appointmentDetailsLocked && "2xl:col-span-2",
                            )}
                          >
                            <label className="scheduler-modal-label flex min-h-10 items-end">
                              {index === 0
                                ? "Cliente principal"
                                : `Visitante ${index + 1}`}
                            </label>
                            <Input
                              className="scheduler-modal-input"
                              onChange={(event) =>
                                patchVisitor(index, {
                                  name: event.target.value,
                                })
                              }
                              placeholder="Nombre completo"
                              readOnly={index === 0}
                              value={
                                index === 0 ? draft.customerName : visitor.name
                              }
                            />
                          </div>
                          <div
                            className={cn(
                              "space-y-2",
                              appointmentDetailsLocked && "2xl:col-span-2",
                            )}
                          >
                            <label className="scheduler-modal-label flex min-h-10 items-end">
                              {appointmentDetailsLocked
                                ? "Especialista que atendió"
                                : "Especialista asignada"}
                            </label>
                            <Select
                              value={visitor.specialistProfileId}
                              onValueChange={(value) =>
                                patchVisitor(index, {
                                  specialistProfileId: value,
                                })
                              }
                            >
                              <SelectTrigger className="scheduler-modal-select-trigger">
                                <SelectValue placeholder="Selecciona" />
                              </SelectTrigger>
                              <SelectContent className="scheduler-modal-select-content">
                                {specialistOptions.map((specialist) => (
                                  <SelectItem
                                    key={specialist.id}
                                    className="scheduler-modal-select-item"
                                    value={specialist.id}
                                  >
                                    {specialist.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {index === 0 &&
                            !appointmentDetailsLocked &&
                            !isEditing ? (
                              <button
                                aria-checked={draft.rememberSpecialist}
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[rgba(236,209,200,0.9)] bg-[#fbf7f2] px-3 py-2 text-left text-xs text-slate-600"
                                onClick={() =>
                                  patchDraft({
                                    rememberSpecialist:
                                      !draft.rememberSpecialist,
                                  })
                                }
                                role="switch"
                                type="button"
                              >
                                <span>Fijar para futuras citas</span>
                                <span
                                  aria-hidden="true"
                                  className={`relative h-5 w-9 rounded-full transition ${
                                    draft.rememberSpecialist
                                      ? "bg-[#263649]"
                                      : "bg-slate-300"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                                      draft.rememberSpecialist
                                        ? "left-[18px]"
                                        : "left-0.5"
                                    }`}
                                  />
                                </span>
                              </button>
                            ) : null}
                          </div>
                          {appointmentDetailsLocked ? (
                            <>
                              <div className="space-y-2 2xl:col-span-2">
                                <label className="scheduler-modal-label flex min-h-10 items-end">
                                  Resultado de venta
                                </label>
                                <Select
                                  value={visitor.purchaseKind ?? "PENDING"}
                                  onValueChange={(value) =>
                                    patchVisitor(index, {
                                      purchaseKind:
                                        value === "PENDING"
                                          ? null
                                          : (value as
                                              | "NONE"
                                              | "FULL"
                                              | "LAYAWAY"),
                                      purchased:
                                        value === "PENDING"
                                          ? null
                                          : value !== "NONE",
                                      ...(value === "NONE" ||
                                      value === "PENDING"
                                        ? {
                                            purchaseAmount: "",
                                            saleAmount: "",
                                            depositAmount: "",
                                          }
                                        : value === "FULL"
                                          ? { depositAmount: "" }
                                          : {}),
                                    })
                                  }
                                >
                                  <SelectTrigger className="scheduler-modal-select-trigger">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="scheduler-modal-select-content">
                                    <SelectItem disabled value="PENDING">
                                      Pendiente
                                    </SelectItem>
                                    <SelectItem value="NONE">
                                      No compró
                                    </SelectItem>
                                    <SelectItem value="FULL">
                                      Compra liquidada
                                    </SelectItem>
                                    <SelectItem value="LAYAWAY">
                                      Apartado
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 2xl:col-span-2">
                                <label className="scheduler-modal-label flex min-h-10 items-end">
                                  Monto de venta
                                </label>
                                <div className="relative">
                                  <ShoppingBag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--scheduler-accent)]" />
                                  <Input
                                    className="scheduler-modal-input pl-10"
                                    disabled={
                                      visitor.purchaseKind !== "FULL" &&
                                      visitor.purchaseKind !== "LAYAWAY"
                                    }
                                    inputMode="decimal"
                                    min="0"
                                    onChange={(event) =>
                                      patchVisitor(index, {
                                        saleAmount: event.target.value,
                                        purchaseAmount: event.target.value,
                                      })
                                    }
                                    placeholder="$0.00"
                                    step="0.01"
                                    type="number"
                                    value={visitor.saleAmount}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2 2xl:col-span-2">
                                <label className="scheduler-modal-label flex min-h-10 items-end">
                                  Monto apartado
                                </label>
                                <div className="relative">
                                  <ShoppingBag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--scheduler-accent)]" />
                                  <Input
                                    className="scheduler-modal-input pl-10"
                                    disabled={
                                      visitor.purchaseKind !== "LAYAWAY"
                                    }
                                    inputMode="decimal"
                                    max={visitor.saleAmount || undefined}
                                    min="0"
                                    onChange={(event) =>
                                      patchVisitor(index, {
                                        depositAmount: event.target.value,
                                      })
                                    }
                                    placeholder="$0.00"
                                    step="0.01"
                                    type="number"
                                    value={visitor.depositAmount}
                                  />
                                </div>
                              </div>
                            </>
                          ) : null}
                          {visitor.purchaseKind === "LAYAWAY" ? (
                            <p className="rounded-xl border border-[#e6d8ca] bg-[#fbf7f2] px-3 py-2 text-sm text-[#795f45] md:col-span-2 2xl:col-span-10">
                              El total de esta venta queda asignado a{" "}
                              <strong>
                                {specialistOptions.find(
                                  (specialist) =>
                                    specialist.id ===
                                    visitor.specialistProfileId,
                                )?.name ?? "la especialista seleccionada"}
                              </strong>{" "}
                              y conservará esa atribución cuando se liquide el
                              saldo.
                            </p>
                          ) : null}
                        </div>
                      ))}
                      {!cabinVisitValid ? (
                        <p
                          className="text-sm font-medium text-amber-800"
                          role="status"
                        >
                          {appointmentDetailsLocked
                            ? "Completa el representante, cada visitante y especialista, e indica obligatoriamente si compró o no. Para compra captura el total; si es apartado, el anticipo debe ser mayor a cero y no superar la venta."
                            : "Completa la cabina, el representante, los visitantes y las especialistas asignadas antes de guardar la reserva."}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {columns.length ? (
                    <div className="space-y-2">
                      <label className="scheduler-modal-label">
                        Profesional o recurso
                      </label>
                      <Select
                        disabled={appointmentDetailsLocked}
                        value={draft.professionalId}
                        onValueChange={(value) =>
                          patchDraft({ professionalId: value })
                        }
                      >
                        <SelectTrigger className="scheduler-modal-select-trigger">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                          {columns.map((column) => (
                            <SelectItem
                              key={column.id}
                              className="scheduler-modal-select-item"
                              value={column.id}
                            >
                              {column.name} ·{" "}
                              {column.kind === "RESOURCE"
                                ? "Recurso"
                                : "Profesional"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </div>

              {!hideAdditionalFields ? (
                <div className="scheduler-modal-section overflow-hidden rounded-[24px] p-4 md:p-5">
                  <button
                    className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[rgba(236,209,200,0.9)] bg-white px-4 py-3 text-left transition hover:bg-[rgba(245,237,228,0.38)]"
                    onClick={() =>
                      setIsAdditionalInfoOpen((current) => !current)
                    }
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="label-caps">Detalle</p>
                      <h3 className="mt-1 text-[1.18rem] font-semibold tracking-[-0.03em] text-[var(--scheduler-ink-strong)]">
                        Informacion adicional
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-[var(--scheduler-accent)]" />
                      {isAdditionalInfoOpen ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isAdditionalInfoOpen ? (
                    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
                      <div className="lg:col-span-2">
                        <SchedulerConfiguredFields
                          definitions={appointmentFieldDefinitions}
                          description="Estas respuestas se vinculan por ID a la cita. Si el cliente se creó en este flujo, el mismo borrador conserva los valores guardados en su expediente."
                          idPrefix="booking-question"
                          onValueChange={updateConfiguredAnswer}
                          values={draft.additionalAnswers}
                        />
                      </div>
                      {showCommercialFields ? (
                        <div className="space-y-2">
                          <label className="scheduler-modal-label">
                            Precio
                          </label>
                          <Input
                            className="scheduler-modal-input"
                            placeholder="$0"
                            value={
                              selectedService
                                ? formatMoney(selectedService.price)
                                : ""
                            }
                            readOnly
                          />
                        </div>
                      ) : null}
                      {showCommercialFields ? (
                        <div className="space-y-2">
                          <label className="scheduler-modal-label">
                            Pagado
                          </label>
                          <div className="flex h-14 items-center gap-6 rounded-[22px] border border-[rgba(236,209,200,0.95)] bg-white px-4">
                            <label className="flex items-center gap-2 text-base text-[var(--scheduler-ink-strong)]">
                              <input
                                checked={draft.paymentLabel !== "No pagado"}
                                className="h-4 w-4 accent-[var(--scheduler-accent)]"
                                name="paid"
                                type="radio"
                                onChange={() =>
                                  patchDraft({ paymentLabel: "Reserva pagada" })
                                }
                              />
                              Si
                            </label>
                            <label className="flex items-center gap-2 text-base text-[var(--scheduler-ink-strong)]">
                              <input
                                checked={draft.paymentLabel === "No pagado"}
                                className="h-4 w-4 accent-[var(--scheduler-accent)]"
                                name="paid"
                                type="radio"
                                onChange={() =>
                                  patchDraft({ paymentLabel: "No pagado" })
                                }
                              />
                              No
                            </label>
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-2 lg:col-span-2">
                        <label className="scheduler-modal-label">
                          {showInternalNote
                            ? "Notas compartidas con el cliente"
                            : "Notas de la cita"}
                        </label>
                        <Textarea
                          className="scheduler-modal-textarea min-h-32"
                          disabled={appointmentDetailsLocked}
                          value={draft.notes}
                          onChange={(event) =>
                            patchDraft({ notes: event.target.value })
                          }
                        />
                      </div>
                      {showInternalNote ? (
                        <div className="space-y-2 lg:col-span-2">
                          <label className="scheduler-modal-label">
                            Nota interna
                          </label>
                          <Textarea
                            className="scheduler-modal-textarea min-h-32"
                            value={draft.internalNote}
                            onChange={(event) =>
                              patchDraft({ internalNote: event.target.value })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="scheduler-modal-footer flex flex-col gap-3 border-t border-[rgba(236,209,200,0.95)] px-4 py-4 sm:flex-row sm:justify-between md:px-6">
              <Button
                variant="outline"
                className="scheduler-modal-secondary"
                onClick={() =>
                  isNewClientOpen
                    ? setIsNewClientOpen(false)
                    : onOpenChange(false)
                }
              >
                {isNewClientOpen ? (
                  <ChevronLeft className="mr-2 h-5 w-5" />
                ) : null}
                {isNewClientOpen ? "Volver" : "Cancelar"}
              </Button>
              <Button
                className="scheduler-modal-cta"
                disabled={
                  saving ||
                  (isNewClientOpen
                    ? !newClientFormValid
                    : !canSaveAtSelectedTime ||
                      !cabinVisitValid ||
                      availabilityLoading)
                }
                onClick={() =>
                  isNewClientOpen ? onSaveNewClient() : onSave()
                }
              >
                <UserRoundPlus className="mr-2 h-5 w-5" />
                {saving
                  ? "Guardando…"
                  : isNewClientOpen
                    ? "Guardar cliente"
                  : appointmentDetailsLocked
                    ? "Guardar atención"
                    : isEditing
                      ? "Guardar cambios"
                      : "Guardar reserva"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
