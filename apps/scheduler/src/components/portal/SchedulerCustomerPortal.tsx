"use client";

import { useMemo, useState } from "react";
import type {
  SchedulerCustomerPortalAccessChallengeDto,
  SchedulerCustomerPortalAppointmentDto,
  SchedulerCustomerPortalAvailabilitySlotDto,
  SchedulerCustomerPortalDocumentDto,
  SchedulerCustomerPortalOverviewDto,
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
  Badge,
  Button,
  Card,
  CardContent,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@cosmetics/ui";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Download,
  FileSignature,
  Gift,
  History,
  LogOut,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";

type PortalView = "home" | "book" | "appointments" | "benefits" | "documents";

const statusLabels: Record<
  SchedulerCustomerPortalAppointmentDto["status"],
  string
> = {
  PENDING: "Pendiente",
  RESERVED: "Por confirmar",
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegaste",
  WAITING: "En espera",
  ATTENDED: "Atendida",
  NO_SHOW: "No asististe",
  CANCELED: "Cancelada",
};

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function nextDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function PortalAccessFeature({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/75">
      <Icon className="mb-3 h-5 w-5 text-[#d7b488]" />
      {label}
    </div>
  );
}

function AppointmentCard({
  appointment,
  onCancel,
  onConfirm,
  onRepeat,
  onReschedule,
}: {
  appointment: SchedulerCustomerPortalAppointmentDto;
  onCancel?: (appointment: SchedulerCustomerPortalAppointmentDto) => void;
  onConfirm?: (appointment: SchedulerCustomerPortalAppointmentDto) => void;
  onRepeat: (appointment: SchedulerCustomerPortalAppointmentDto) => void;
  onReschedule?: (appointment: SchedulerCustomerPortalAppointmentDto) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-[#e8ddd3] bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#233348]">
                {appointment.serviceName}
              </h3>
              <Badge
                className="border-[#dac6b1] bg-[#fbf6f0] text-[#876747]"
                variant="outline"
              >
                {statusLabels[appointment.status]}
              </Badge>
              {appointment.smartPricingApplied ? (
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
                  <Sparkles className="mr-1 h-3 w-3" /> Precio inteligente
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4 text-[#b08963]" />
              {dateTime(appointment.startsAt)}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4" /> {appointment.branchName}
              {appointment.professionalName
                ? ` · ${appointment.professionalName}`
                : ""}
            </p>
            <p className="mt-3 text-sm font-semibold text-[#233348]">
              {money(appointment.finalPrice)}
              {appointment.smartPricingApplied ? (
                <span className="ml-2 font-normal text-slate-400 line-through">
                  {money(appointment.originalPrice)}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:max-w-[18rem] sm:justify-end">
            {appointment.canConfirm && onConfirm ? (
              <Button onClick={() => onConfirm(appointment)} size="sm">
                <Check className="mr-1.5 h-4 w-4" /> Confirmar
              </Button>
            ) : null}
            {appointment.canReschedule && onReschedule ? (
              <Button
                onClick={() => onReschedule(appointment)}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Reagendar
              </Button>
            ) : null}
            {appointment.canCancel && onCancel ? (
              <Button
                className="text-rose-700"
                onClick={() => onCancel(appointment)}
                size="sm"
                variant="outline"
              >
                Cancelar
              </Button>
            ) : null}
            <Button
              onClick={() => onRepeat(appointment)}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Repetir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PortalAccess({
  onAuthenticated,
}: {
  onAuthenticated: (
    portalToken: string,
    overview: SchedulerCustomerPortalOverviewDto,
  ) => void;
}) {
  const [identifier, setIdentifier] = useState("cliente1@example.test");
  const [challenge, setChallenge] =
    useState<SchedulerCustomerPortalAccessChallengeDto | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setChallenge(
        await schedulerApi.requestCustomerPortalAccess({
          identifier: identifier.trim(),
        }),
      );
    } catch (cause) {
      setError(
        schedulerApiErrorMessage(cause, "No se pudo solicitar el código."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError(null);
    try {
      const session = await schedulerApi.verifyCustomerPortalAccess(
        challenge.challengeId,
        { code },
      );
      const overview = await schedulerApi.customerPortalOverview(
        session.portalToken,
      );
      onAuthenticated(session.portalToken, overview);
    } catch (cause) {
      setError(
        schedulerApiErrorMessage(cause, "No se pudo validar el código."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#172230] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(195,165,131,0.28),transparent_30%),radial-gradient(circle_at_86%_78%,rgba(109,153,147,0.2),transparent_28%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d7b488]">
            Keysar Cosmetics
          </p>
          <h1 className="mt-5 max-w-xl font-brand text-5xl uppercase leading-[1.05] tracking-[0.08em] sm:text-6xl">
            Tu cuidado, en un solo lugar
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/65">
            Reserva, confirma o cambia tus citas; consulta tus beneficios,
            saldos y documentos desde un acceso privado.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            <PortalAccessFeature icon={CalendarDays} label="Tus citas" />
            <PortalAccessFeature icon={Gift} label="Tus beneficios" />
            <PortalAccessFeature icon={ShieldCheck} label="Acceso privado" />
          </div>
        </section>
        <Card className="rounded-[2rem] border-white/10 bg-white text-[#233348] shadow-2xl">
          <CardContent className="p-6 sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ebe2] text-[#9a7654]">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold">
              {challenge ? "Ingresa tu código" : "Accede a tu portal"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {challenge
                ? `Enviamos un código a ${challenge.destinationHint}.`
                : "Usa el mismo correo o teléfono que registraste al reservar."}
            </p>
            {challenge ? (
              <form className="mt-7 space-y-5" onSubmit={verifyAccess}>
                <div>
                  <Label htmlFor="portal-code">Código de 6 dígitos</Label>
                  <Input
                    autoComplete="one-time-code"
                    className="mt-2 h-12 rounded-xl"
                    id="portal-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    value={code}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    En esta demo usa 246810.
                  </p>
                </div>
                {error ? (
                  <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button
                  className="h-12 w-full rounded-full bg-[#172230]"
                  disabled={loading || code.length !== 6}
                  type="submit"
                >
                  {loading ? "Validando…" : "Entrar a mi portal"}
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setChallenge(null);
                    setCode("");
                    setError(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Cambiar dato de acceso
                </Button>
              </form>
            ) : (
              <form className="mt-7 space-y-5" onSubmit={requestAccess}>
                <div>
                  <Label htmlFor="portal-identifier">Correo o teléfono</Label>
                  <Input
                    autoComplete="username"
                    className="mt-2 h-12 rounded-xl"
                    id="portal-identifier"
                    onChange={(event) => setIdentifier(event.target.value)}
                    value={identifier}
                  />
                </div>
                {error ? (
                  <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button
                  className="h-12 w-full rounded-full bg-[#172230]"
                  disabled={loading || identifier.trim().length < 5}
                  type="submit"
                >
                  {loading ? "Enviando…" : "Recibir código"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export function SchedulerCustomerPortal() {
  const [portalToken, setPortalToken] = useState("");
  const [overview, setOverview] =
    useState<SchedulerCustomerPortalOverviewDto | null>(null);
  const [view, setView] = useState<PortalView>("home");
  const [branchId, setBranchId] = useState("");
  const [serviceProfileId, setServiceProfileId] = useState("");
  const [bookingDate, setBookingDate] = useState(nextDate);
  const [slots, setSlots] = useState<
    SchedulerCustomerPortalAvailabilitySlotDto[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [repeatAppointmentId, setRepeatAppointmentId] = useState<string | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] =
    useState<SchedulerCustomerPortalAppointmentDto | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<SchedulerCustomerPortalAppointmentDto | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(nextDate);
  const [rescheduleSlots, setRescheduleSlots] = useState<
    SchedulerCustomerPortalAvailabilitySlotDto[]
  >([]);
  const [signTarget, setSignTarget] =
    useState<SchedulerCustomerPortalDocumentDto | null>(null);
  const [signatureName, setSignatureName] = useState("");

  const openBalance = useMemo(
    () =>
      overview?.balances.reduce(
        (total, balance) => total + balance.balanceAmount,
        0,
      ) ?? 0,
    [overview?.balances],
  );

  async function reloadOverview() {
    if (!portalToken) return;
    setOverview(await schedulerApi.customerPortalOverview(portalToken));
  }

  async function searchAvailability() {
    if (!portalToken || !branchId || !serviceProfileId || !bookingDate) return;
    setLoading(true);
    try {
      const nextSlots = await schedulerApi.customerPortalAvailability(
        portalToken,
        { branchId, serviceProfileId, date: bookingDate },
      );
      setSlots(nextSlots);
      if (!nextSlots.length) toast.info("No hay horarios disponibles ese día.");
    } catch (cause) {
      toast.error(
        schedulerApiErrorMessage(cause, "No se pudo consultar disponibilidad."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function createAppointment(
    slot: SchedulerCustomerPortalAvailabilitySlotDto,
  ) {
    if (!portalToken || !branchId || !serviceProfileId) return;
    setLoading(true);
    try {
      await schedulerApi.createCustomerPortalAppointment(portalToken, {
        branchId,
        serviceProfileId,
        professionalProfileId: slot.professionalProfileId,
        startsAt: slot.startsAt,
        repeatAppointmentId,
      });
      await reloadOverview();
      setSlots([]);
      setRepeatAppointmentId(null);
      setView("appointments");
      toast.success("Reserva creada. Puedes confirmarla desde tus citas.");
    } catch (cause) {
      toast.error(schedulerApiErrorMessage(cause, "No se pudo reservar."));
    } finally {
      setLoading(false);
    }
  }

  function repeatAppointment(appointment: SchedulerCustomerPortalAppointmentDto) {
    setBranchId(appointment.branchId);
    setServiceProfileId(appointment.serviceProfileId);
    setRepeatAppointmentId(appointment.id);
    setSlots([]);
    setView("book");
  }

  async function mutateAppointment(
    appointment: SchedulerCustomerPortalAppointmentDto,
    action: "CONFIRM" | "CANCEL",
  ) {
    if (!portalToken) return;
    setLoading(true);
    try {
      await schedulerApi.updateCustomerPortalAppointment(
        portalToken,
        appointment.id,
        { action },
      );
      await reloadOverview();
      setCancelTarget(null);
      toast.success(action === "CONFIRM" ? "Cita confirmada." : "Cita cancelada.");
    } catch (cause) {
      toast.error(
        schedulerApiErrorMessage(cause, "No se pudo actualizar la cita."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchRescheduleAvailability() {
    if (!portalToken || !rescheduleTarget) return;
    setLoading(true);
    try {
      setRescheduleSlots(
        await schedulerApi.customerPortalAvailability(portalToken, {
          branchId: rescheduleTarget.branchId,
          serviceProfileId: rescheduleTarget.serviceProfileId,
          date: rescheduleDate,
        }),
      );
    } catch (cause) {
      toast.error(
        schedulerApiErrorMessage(cause, "No se pudo consultar disponibilidad."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function reschedule(
    slot: SchedulerCustomerPortalAvailabilitySlotDto,
  ) {
    if (!portalToken || !rescheduleTarget) return;
    setLoading(true);
    try {
      await schedulerApi.updateCustomerPortalAppointment(
        portalToken,
        rescheduleTarget.id,
        {
          action: "RESCHEDULE",
          startsAt: slot.startsAt,
          professionalProfileId: slot.professionalProfileId,
        },
      );
      await reloadOverview();
      setRescheduleTarget(null);
      setRescheduleSlots([]);
      toast.success("Cita reprogramada.");
    } catch (cause) {
      toast.error(
        schedulerApiErrorMessage(cause, "No se pudo reprogramar la cita."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function signDocument() {
    if (!portalToken || !signTarget || !overview) return;
    if (
      signatureName.trim().toLocaleLowerCase("es-MX") !==
      overview.customer.displayName.trim().toLocaleLowerCase("es-MX")
    ) {
      toast.error("Escribe tu nombre completo tal como aparece en el portal.");
      return;
    }
    setLoading(true);
    try {
      await schedulerApi.signCustomerPortalDocument(
        portalToken,
        signTarget.id,
        { signatureName: signatureName.trim() },
      );
      await reloadOverview();
      setSignTarget(null);
      setSignatureName("");
      toast.success("Firma de demostración registrada.");
    } catch (cause) {
      toast.error(
        schedulerApiErrorMessage(cause, "No se pudo registrar la firma."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadDocument(
    document: SchedulerCustomerPortalDocumentDto,
  ) {
    if (!overview) return;
    try {
      const { downloadCustomerPortalDocument } = await import(
        "@/lib/scheduler-customer-portal-document"
      );
      await downloadCustomerPortalDocument({
        customerName: overview.customer.displayName,
        document,
      });
    } catch {
      toast.error("No se pudo generar el PDF. Intenta nuevamente.");
    }
  }

  if (!portalToken || !overview)
    return (
      <PortalAccess
        onAuthenticated={(token, nextOverview) => {
          setPortalToken(token);
          setOverview(nextOverview);
          setBranchId(nextOverview.branches[0]?.id ?? "");
          setServiceProfileId(nextOverview.services[0]?.id ?? "");
        }}
      />
    );

  return (
    <main className="min-h-screen bg-[#f5f1ed] text-[#233348]">
      <header className="border-b border-white/10 bg-[#172230] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#d7b488]">
              Keysar Cosmetics
            </p>
            <p className="mt-1 text-lg font-semibold">Mi portal</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{overview.customer.displayName}</p>
              <p className="text-xs text-white/50">{overview.customer.contactHint}</p>
            </div>
            <Button
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => {
                setPortalToken("");
                setOverview(null);
              }}
              variant="outline"
            >
              <LogOut className="mr-2 h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs onValueChange={(value) => setView(value as PortalView)} value={view}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-white p-1.5 shadow-sm sm:grid-cols-5">
            <TabsTrigger className="rounded-xl py-2.5" value="home">Inicio</TabsTrigger>
            <TabsTrigger className="rounded-xl py-2.5" value="book">Reservar</TabsTrigger>
            <TabsTrigger className="rounded-xl py-2.5" value="appointments">Mis citas</TabsTrigger>
            <TabsTrigger className="rounded-xl py-2.5" value="benefits">Beneficios</TabsTrigger>
            <TabsTrigger className="rounded-xl py-2.5" value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6 space-y-6" value="home">
            <section className="rounded-[2rem] bg-[linear-gradient(120deg,#233348,#384c5f)] p-6 text-white shadow-lg sm:p-8">
              <p className="text-sm text-white/55">Hola,</p>
              <h1 className="mt-1 text-3xl font-semibold">
                {overview.customer.displayName}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
                Administra tus citas y revisa tus beneficios sin llamar a la sucursal.
              </p>
              <Button
                className="mt-6 rounded-full bg-[#d7b488] text-[#172230] hover:bg-[#e2c39b]"
                onClick={() => setView("book")}
              >
                <CalendarDays className="mr-2 h-4 w-4" /> Reservar una cita
              </Button>
            </section>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border-[#e8ddd3]">
                <CardContent className="p-5">
                  <CalendarDays className="h-5 w-5 text-[#a77d57]" />
                  <p className="mt-4 text-3xl font-semibold">
                    {overview.upcomingAppointments.length}
                  </p>
                  <p className="text-sm text-slate-500">Próximas citas</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-[#e8ddd3]">
                <CardContent className="p-5">
                  <Gift className="h-5 w-5 text-[#a77d57]" />
                  <p className="mt-4 text-3xl font-semibold">
                    {overview.memberships[0]
                      ? overview.memberships[0].totalSessions -
                        overview.memberships[0].usedSessions
                      : 0}
                  </p>
                  <p className="text-sm text-slate-500">Sesiones disponibles</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-[#e8ddd3]">
                <CardContent className="p-5">
                  <WalletCards className="h-5 w-5 text-[#a77d57]" />
                  <p className="mt-4 text-3xl font-semibold">{money(openBalance)}</p>
                  <p className="text-sm text-slate-500">Saldo pendiente</p>
                </CardContent>
              </Card>
            </div>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tu próxima cita</h2>
                <Button onClick={() => setView("appointments")} variant="ghost">
                  Ver todas
                </Button>
              </div>
              {overview.upcomingAppointments[0] ? (
                <AppointmentCard
                  appointment={overview.upcomingAppointments[0]}
                  onCancel={setCancelTarget}
                  onConfirm={(appointment) =>
                    void mutateAppointment(appointment, "CONFIRM")
                  }
                  onRepeat={repeatAppointment}
                  onReschedule={(appointment) => {
                    setRescheduleTarget(appointment);
                    setRescheduleSlots([]);
                  }}
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-[#d8c9bb] bg-white p-8 text-center text-sm text-slate-500">
                  No tienes próximas citas.
                </p>
              )}
            </section>
          </TabsContent>

          <TabsContent className="mt-6" value="book">
            <Card className="rounded-[2rem] border-[#e8ddd3] bg-white shadow-sm">
              <CardContent className="p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a77d57]">
                      Reserva en línea
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold">
                      {repeatAppointmentId ? "Repetir tu visita" : "Elige tu próxima cita"}
                    </h1>
                  </div>
                  {repeatAppointmentId ? (
                    <Badge className="border-[#d7b488] bg-[#fbf6f0] text-[#876747]" variant="outline">
                      Datos de la visita anterior aplicados
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="portal-branch">Sucursal</Label>
                    <Select
                      onValueChange={(value) => {
                        setBranchId(value);
                        setSlots([]);
                      }}
                      value={branchId}
                    >
                      <SelectTrigger className="mt-2 h-11 rounded-xl" id="portal-branch">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {overview.branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="portal-service">Servicio</Label>
                    <Select
                      onValueChange={(value) => {
                        setServiceProfileId(value);
                        setSlots([]);
                      }}
                      value={serviceProfileId}
                    >
                      <SelectTrigger className="mt-2 h-11 rounded-xl" id="portal-service">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {overview.services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} · {money(service.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="portal-date">Fecha</Label>
                    <Input
                      className="mt-2 h-11 rounded-xl"
                      id="portal-date"
                      min={nextDate()}
                      onChange={(event) => {
                        setBookingDate(event.target.value);
                        setSlots([]);
                      }}
                      type="date"
                      value={bookingDate}
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8f5f2] p-4 text-sm text-slate-600">
                  <span>
                    Reserva con al menos {overview.policy.minimumBookingLeadMinutes / 60} horas de anticipación.
                  </span>
                  <Button disabled={loading} onClick={() => void searchAvailability()}>
                    <Clock3 className="mr-2 h-4 w-4" />
                    {loading ? "Buscando…" : "Ver horarios"}
                  </Button>
                </div>
                {slots.length ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => (
                      <button
                        className="rounded-2xl border border-[#e3d6c9] p-4 text-left transition hover:border-[#af8762] hover:bg-[#fbf6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#af8762]"
                        key={`${slot.startsAt}-${slot.professionalProfileId}`}
                        onClick={() => void createAppointment(slot)}
                        type="button"
                      >
                        <span className="block font-semibold">
                          {new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date(slot.startsAt))}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {slot.professionalName}
                        </span>
                        <span className="mt-3 block text-sm font-semibold text-[#876747]">
                          {money(slot.finalPrice)}
                          {slot.smartPricingApplied ? " · precio inteligente" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="mt-6 space-y-8" value="appointments">
            <section>
              <h1 className="text-2xl font-semibold">Próximas citas</h1>
              <div className="mt-4 space-y-3">
                {overview.upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    appointment={appointment}
                    key={appointment.id}
                    onCancel={setCancelTarget}
                    onConfirm={(item) => void mutateAppointment(item, "CONFIRM")}
                    onRepeat={repeatAppointment}
                    onReschedule={(item) => {
                      setRescheduleTarget(item);
                      setRescheduleSlots([]);
                    }}
                  />
                ))}
              </div>
            </section>
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <History className="h-5 w-5" /> Historial
              </h2>
              <div className="mt-4 space-y-3">
                {overview.appointmentHistory.map((appointment) => (
                  <AppointmentCard
                    appointment={appointment}
                    key={appointment.id}
                    onRepeat={repeatAppointment}
                  />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent className="mt-6 space-y-6" value="benefits">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="rounded-[2rem] border-[#e8ddd3]">
                <CardContent className="p-6">
                  <Gift className="h-6 w-6 text-[#a77d57]" />
                  <h2 className="mt-4 text-xl font-semibold">Membresías</h2>
                  {overview.memberships.map((membership) => {
                    const progress = Math.round(
                      (membership.usedSessions / membership.totalSessions) * 100,
                    );
                    return (
                      <div className="mt-5" key={membership.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{membership.name}</p>
                          <Badge variant="outline">Activa</Badge>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee6de]">
                          <div
                            className="h-full rounded-full bg-[#a77d57]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {membership.totalSessions - membership.usedSessions} de {membership.totalSessions} sesiones disponibles
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card className="rounded-[2rem] border-[#e8ddd3]">
                <CardContent className="p-6">
                  <CreditCard className="h-6 w-6 text-[#a77d57]" />
                  <h2 className="mt-4 text-xl font-semibold">Apartados y saldos</h2>
                  <div className="mt-5 space-y-4">
                    {overview.balances.map((balance) => (
                      <div className="rounded-2xl bg-[#f8f5f2] p-4" key={balance.id}>
                        <p className="font-medium">{balance.description}</p>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          <div><span className="block text-xs text-slate-400">Total</span>{money(balance.saleAmount)}</div>
                          <div><span className="block text-xs text-slate-400">Recibido</span>{money(balance.receivedAmount)}</div>
                          <div><span className="block text-xs text-slate-400">Saldo</span><strong>{money(balance.balanceAmount)}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent className="mt-6" value="documents">
            <Card className="rounded-[2rem] border-[#e8ddd3]">
              <CardContent className="p-6 sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a77d57]">Privacidad</p>
                  <h1 className="mt-2 text-2xl font-semibold">Mis documentos</h1>
                  <p className="mt-2 text-sm text-slate-500">Consulta versiones de sólo lectura y firma únicamente documentos pendientes.</p>
                </div>
                <div className="mt-6 divide-y divide-[#eee5dc]">
                  {overview.documents.map((document) => (
                    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between" key={document.id}>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{document.name}</p>
                          <Badge variant="outline">
                            {document.status === "SIGNED"
                              ? "Firmado"
                              : document.status === "PENDING_SIGNATURE"
                                ? "Firma pendiente"
                                : "Disponible"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">Versión {document.version} · {dateTime(document.updatedAt)}</p>
                        {document.status === "SIGNED" && document.signerDisplayName ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            Firmado por {document.signerDisplayName}
                            {document.signedAt ? ` · ${dateTime(document.signedAt)}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void downloadDocument(document)} size="sm" variant="outline">
                          <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                        {document.status === "PENDING_SIGNATURE" ? (
                          <Button onClick={() => setSignTarget(document)} size="sm">
                            <FileSignature className="mr-2 h-4 w-4" /> Firmar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará tu reserva. Podrás crear una nueva cita después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar cita</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-700 hover:bg-rose-800"
              disabled={loading}
              onClick={() => cancelTarget && void mutateAppointment(cancelTarget, "CANCEL")}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(rescheduleTarget)} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reagendar cita</DialogTitle>
            <DialogDescription>
              Puedes reprogramar hasta {overview.policy.maximumReschedules} veces. Esta cita lleva {rescheduleTarget?.rescheduleCount ?? 0}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reschedule-date">Nueva fecha</Label>
              <Input
                className="mt-2"
                id="reschedule-date"
                min={nextDate()}
                onChange={(event) => {
                  setRescheduleDate(event.target.value);
                  setRescheduleSlots([]);
                }}
                type="date"
                value={rescheduleDate}
              />
            </div>
            <Button disabled={loading} onClick={() => void searchRescheduleAvailability()}>
              Ver horarios disponibles
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
              {rescheduleSlots.map((slot) => (
                <button
                  className="rounded-xl border p-3 text-left hover:border-[#a77d57]"
                  key={`${slot.startsAt}-${slot.professionalProfileId}`}
                  onClick={() => void reschedule(slot)}
                  type="button"
                >
                  <span className="font-medium">{dateTime(slot.startsAt)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{slot.professionalName}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(signTarget)} onOpenChange={(open) => !open && setSignTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Firma de conformidad</DialogTitle>
            <DialogDescription>
              Escribe tu nombre completo. En producción se registrarán identidad, versión, fecha y evidencia de firma.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="signature-name">Nombre completo</Label>
            <Input
              className="mt-2"
              id="signature-name"
              onChange={(event) => setSignatureName(event.target.value)}
              value={signatureName}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setSignTarget(null)} variant="outline">Cancelar</Button>
            <Button disabled={loading || !signatureName.trim()} onClick={() => void signDocument()}>
              <BadgeCheck className="mr-2 h-4 w-4" /> Firmar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
