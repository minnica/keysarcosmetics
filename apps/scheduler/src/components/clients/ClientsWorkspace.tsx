"use client";

import { FormEvent, useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@cosmetics/ui";
import {
  CalendarDays,
  ChevronDown,
  Hash,
  MapPin,
  Plus,
  UserRound,
  Upload,
} from "lucide-react";
import {
  initialSchedulerClients,
  normalizeClientPhone,
  normalizeClientText,
  type SchedulerClient,
} from "@/lib/mock-client-data";
import {
  schedulerBranches,
  schedulerProfessionals,
} from "@/lib/mock-scheduler-data";

import { ClientsDatabase } from "./ClientsDatabase";

const branchNames: Record<string, string> = {
  "galerias-insurgentes": "Galerías Insurgentes",
  mitikah: "Mítikah",
  masaryk: "Masaryk",
  "keysar-reforma": "Keysar Reforma",
  "keysar-polanco": "Keysar Polanco",
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string | undefined) {
  if (!value) return "Sin visitas";
  return dateFormatter.format(new Date(`${value}T12:00:00Z`));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

interface NewClientDraft {
  firstName: string;
  lastName: string;
  birthDate: string;
  officialId: string;
  gender: "" | NonNullable<SchedulerClient["gender"]>;
  clientNumber: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  representativeId: string;
  sharedWithId: string;
  phoneAdvisorId: string;
  originBranchId: string;
  facialistId: string;
}

function createEmptyClientDraft(clientCount: number): NewClientDraft {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    officialId: "",
    gender: "",
    clientNumber: String(990000 + clientCount + 1),
    email: "",
    phone: "",
    address: "",
    district: "",
    city: "",
    representativeId: "",
    sharedWithId: "",
    phoneAdvisorId: "",
    originBranchId: "",
    facialistId: "",
  };
}

function calculateAge(birthDate: string) {
  if (!birthDate) return "";
  const today = new Date();
  const birth = new Date(`${birthDate}T12:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function FormField({
  htmlFor,
  label,
  required = false,
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-[#364152]" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-[#ad8b67]">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function SelectField({
  id,
  label,
  required = false,
  value,
  options,
  placeholder = "Seleccionar",
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField htmlFor={id} label={label} required={required}>
      <span className="relative block">
        <select
          className="client-modal-control appearance-none pr-10"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          value={value}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
      </span>
    </FormField>
  );
}

export function ClientsWorkspace() {
  const [clients, setClients] = useState(initialSchedulerClients);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SchedulerClient | null>(
    null,
  );
  const [draft, setDraft] = useState<NewClientDraft>(() =>
    createEmptyClientDraft(initialSchedulerClients.length),
  );
  const specialistOptions = useMemo(
    () =>
      schedulerProfessionals.map((specialist) => ({
        value: specialist.id,
        label: specialist.name,
      })),
    [],
  );
  const branchOptions = useMemo(
    () =>
      schedulerBranches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
    [],
  );
  const age = calculateAge(draft.birthDate);

  function resetDraft() {
    setDraft(createEmptyClientDraft(clients.length));
  }

  function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const rawPhone = draft.phone.trim();
    const phone = rawPhone
      ? rawPhone.startsWith("+")
        ? rawPhone
        : `+52 ${rawPhone}`
      : "";
    const email = draft.email.trim().toLocaleLowerCase("es-MX");

    if (
      !firstName ||
      !lastName ||
      !draft.representativeId ||
      !draft.sharedWithId ||
      !draft.phoneAdvisorId ||
      !draft.originBranchId ||
      !draft.facialistId
    ) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }

    if (
      (phone && normalizeClientPhone(phone).length < 10) ||
      (email && !email.includes("@"))
    ) {
      toast.error("Revisa que el teléfono y el correo sean válidos.");
      return;
    }

    const duplicate = clients.some(
      (client) =>
        (phone && client.normalizedPhone === normalizeClientPhone(phone)) ||
        (email &&
          normalizeClientText(client.email) === normalizeClientText(email)),
    );
    if (duplicate) {
      toast.error("Ya existe un cliente con ese teléfono o correo.");
      return;
    }

    const client: SchedulerClient = {
      id: `client-${Date.now()}`,
      fullName,
      aliases: [],
      phone,
      normalizedPhone: normalizeClientPhone(phone),
      email,
      alternateEmails: [],
      lastName,
      clientNumber: draft.clientNumber,
      ...(draft.officialId.trim()
        ? { officialId: draft.officialId.trim() }
        : {}),
      ...(draft.gender ? { gender: draft.gender } : {}),
      ...(draft.birthDate ? { birthDate: draft.birthDate } : {}),
      ...(draft.address.trim() ? { address: draft.address.trim() } : {}),
      ...(draft.district.trim() ? { district: draft.district.trim() } : {}),
      ...(draft.city.trim() ? { city: draft.city.trim() } : {}),
      representativeId: draft.representativeId,
      sharedWithId: draft.sharedWithId,
      phoneAdvisorId: draft.phoneAdvisorId,
      originBranchId: draft.originBranchId,
      facialistId: draft.facialistId,
      createdAt: new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Mexico_City",
      }),
      history: [],
    };

    setClients((current) => [client, ...current]);
    setNewClientOpen(false);
    setDraft(createEmptyClientDraft(clients.length + 1));
    toast.success("Cliente agregado", {
      description: `${fullName} ya aparece en la base de clientes.`,
    });
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <header className="border-b border-[#e8ddd4] bg-[linear-gradient(180deg,#fff_0%,#fbf8f4_100%)] px-5 py-7 sm:px-7 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="label-caps">Clientes</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3rem)] text-[#263649]">
              Base de clientes
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Encuentra, filtra y consulta la información de tus clientes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled
              title="Importación pendiente de la siguiente etapa de detalle"
              className="h-11 rounded-xl border-[#e7ddd4] bg-white px-4 text-[#ad8b67] disabled:opacity-70"
            >
              <Upload aria-hidden="true" className="mr-2 h-4 w-4" />
              Importar clientes
            </Button>
            <Button
              className="h-11 rounded-xl bg-[#263649] px-4 text-white shadow-[0_8px_20px_rgba(38,54,73,0.14)] hover:bg-[#1d2b3a]"
              onClick={() => setNewClientOpen(true)}
            >
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 sm:px-7 lg:px-8">
        <ClientsDatabase clients={clients} onView={setSelectedClient} />
      </div>

      <Dialog
        open={newClientOpen}
        onOpenChange={(open) => {
          setNewClientOpen(open);
          if (!open) resetDraft();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-[1180px] gap-0 overflow-hidden rounded-[28px] border-[#e7ddd4] bg-white p-0 shadow-[0_28px_90px_rgba(21,31,43,0.28)]">
          <form
            className="flex min-h-0 max-h-[92vh] flex-col"
            onSubmit={handleCreateClient}
          >
            <DialogHeader className="shrink-0 border-b border-[#eee6df] bg-white px-6 py-5 pr-14 text-left sm:px-8">
              <DialogTitle className="page-title text-3xl text-[#263649] sm:text-4xl">
                Nuevo cliente
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Completa la información para crear su perfil e iniciar el
                historial de atención.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#faf8f6] p-4 sm:p-6">
              <section className="client-modal-section">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="label-caps">Datos principales</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#263649]">
                      Información personal
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    <span className="font-semibold text-[#ad8b67]">*</span>{" "}
                    Campos obligatorios
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    htmlFor="client-first-name"
                    label="Nombre"
                    required
                  >
                    <Input
                      autoFocus
                      className="client-modal-control"
                      id="client-first-name"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                      placeholder="Ej. Fernanda"
                      required
                      value={draft.firstName}
                    />
                  </FormField>
                  <FormField
                    htmlFor="client-last-name"
                    label="Apellido"
                    required
                  >
                    <Input
                      className="client-modal-control"
                      id="client-last-name"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                      placeholder="Ej. López"
                      required
                      value={draft.lastName}
                    />
                  </FormField>
                  <FormField
                    htmlFor="client-birth-date"
                    label="Fecha de nacimiento"
                  >
                    <Input
                      className="client-modal-control"
                      id="client-birth-date"
                      max={new Date().toLocaleDateString("en-CA")}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          birthDate: event.target.value,
                        }))
                      }
                      type="date"
                      value={draft.birthDate}
                    />
                  </FormField>
                  <FormField htmlFor="client-age" label="Edad">
                    <Input
                      className="client-modal-control bg-[#f7f4f1] text-slate-500"
                      id="client-age"
                      placeholder="Se calcula automáticamente"
                      readOnly
                      value={age}
                    />
                  </FormField>
                  <FormField
                    htmlFor="client-official-id"
                    label="Identificación oficial"
                  >
                    <Input
                      className="client-modal-control"
                      id="client-official-id"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          officialId: event.target.value,
                        }))
                      }
                      placeholder="INE, pasaporte u otro documento"
                      value={draft.officialId}
                    />
                  </FormField>
                  <SelectField
                    id="client-gender"
                    label="Género"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        gender: value as NewClientDraft["gender"],
                      }))
                    }
                    options={[
                      { value: "female", label: "Femenino" },
                      { value: "male", label: "Masculino" },
                      { value: "other", label: "Otro" },
                      { value: "unspecified", label: "Prefiere no decirlo" },
                    ]}
                    placeholder="Seleccionar género"
                    value={draft.gender}
                  />
                  <FormField htmlFor="client-number" label="Número de cliente">
                    <span className="relative block">
                      <Hash
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ad8b67]"
                      />
                      <Input
                        className="client-modal-control bg-[#f7f4f1] pl-10 text-slate-500"
                        id="client-number"
                        readOnly
                        value={draft.clientNumber}
                      />
                    </span>
                  </FormField>
                </div>
              </section>

              <section className="client-modal-section">
                <div className="mb-5">
                  <p className="label-caps">Contacto y ubicación</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#263649]">
                    Información de contacto
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField htmlFor="client-email" label="Correo electrónico">
                    <Input
                      autoComplete="email"
                      className="client-modal-control"
                      id="client-email"
                      inputMode="email"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="cliente@correo.com"
                      type="email"
                      value={draft.email}
                    />
                  </FormField>
                  <FormField htmlFor="client-phone" label="Teléfono">
                    <div className="flex overflow-hidden rounded-xl border border-[#dfd5cc] bg-white transition focus-within:border-[#c3a583] focus-within:ring-2 focus-within:ring-[#c3a583]/20">
                      <span className="flex h-12 shrink-0 items-center gap-2 border-r border-[#e7ddd4] bg-[#faf8f5] px-3 text-sm font-medium text-[#526273]">
                        🇲🇽 <span>+52</span>
                      </span>
                      <Input
                        autoComplete="tel"
                        className="h-12 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                        id="client-phone"
                        inputMode="tel"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="55 0000 0000"
                        value={draft.phone}
                      />
                    </div>
                  </FormField>
                  <FormField htmlFor="client-address" label="Dirección">
                    <Input
                      className="client-modal-control"
                      id="client-address"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="Calle y número"
                      value={draft.address}
                    />
                  </FormField>
                  <FormField
                    htmlFor="client-district"
                    label="Colonia / Municipio"
                  >
                    <Input
                      className="client-modal-control"
                      id="client-district"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          district: event.target.value,
                        }))
                      }
                      placeholder="Colonia o municipio"
                      value={draft.district}
                    />
                  </FormField>
                  <FormField htmlFor="client-city" label="Estado / Ciudad">
                    <span className="relative block">
                      <MapPin
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ad8b67]"
                      />
                      <Input
                        className="client-modal-control pl-10"
                        id="client-city"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        placeholder="Ej. Ciudad de México"
                        value={draft.city}
                      />
                    </span>
                  </FormField>
                </div>
              </section>

              <section className="client-modal-section">
                <div className="mb-5">
                  <p className="label-caps">Asignación interna</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#263649]">
                    Otros
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="client-representative"
                    label="Representante"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        representativeId: value,
                      }))
                    }
                    options={specialistOptions}
                    required
                    value={draft.representativeId}
                  />
                  <SelectField
                    id="client-shared-with"
                    label="Compartida con"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        sharedWithId: value,
                      }))
                    }
                    options={specialistOptions}
                    required
                    value={draft.sharedWithId}
                  />
                  <SelectField
                    id="client-phone-advisor"
                    label="Asesor telefónico"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        phoneAdvisorId: value,
                      }))
                    }
                    options={specialistOptions}
                    required
                    value={draft.phoneAdvisorId}
                  />
                  <SelectField
                    id="client-origin-branch"
                    label="Sucursal origen"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        originBranchId: value,
                      }))
                    }
                    options={branchOptions}
                    required
                    value={draft.originBranchId}
                  />
                  <SelectField
                    id="client-facialist"
                    label="Facialista"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        facialistId: value,
                      }))
                    }
                    options={specialistOptions}
                    required
                    value={draft.facialistId}
                  />
                </div>
              </section>
            </div>

            <DialogFooter className="shrink-0 flex-row justify-between gap-3 border-t border-[#eee6df] bg-white px-5 py-4 sm:px-8 sm:space-x-0">
              <Button
                className="h-11 rounded-xl border-[#dfd5cc] bg-[#faf8f5] px-5 text-[#526273] hover:bg-[#f4efe9]"
                onClick={() => setNewClientOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                className="h-11 rounded-xl bg-[#263649] px-6 text-white shadow-[0_8px_20px_rgba(38,54,73,0.18)] hover:bg-[#1d2b3a]"
                type="submit"
              >
                Guardar cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedClient)}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      >
        <DialogContent className="max-w-[560px] rounded-[26px] border-[#e7ddd4] bg-white p-0 shadow-[0_24px_70px_rgba(38,54,73,0.2)]">
          {selectedClient ? (
            <>
              <DialogHeader className="border-b border-[#eee6df] px-6 py-5 text-left">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5ede4] text-lg font-semibold text-[#ad8b67]">
                    {initials(selectedClient.fullName)}
                  </span>
                  <div>
                    <DialogTitle className="text-xl text-[#263649]">
                      {selectedClient.fullName}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Ficha de contacto e historial
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#faf8f5] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Teléfono
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#263649]">
                      {selectedClient.phone}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#faf8f5] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Correo
                    </p>
                    <p className="mt-2 truncate text-sm font-medium text-[#263649]">
                      {selectedClient.email}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#263649]">
                      Historial de visitas
                    </h3>
                    <span className="rounded-full bg-[#f5ede4] px-3 py-1 text-xs font-semibold text-[#ad8b67]">
                      {selectedClient.history.length}
                    </span>
                  </div>
                  {selectedClient.history.length ? (
                    <div className="mt-3 divide-y divide-[#eee6df] rounded-2xl border border-[#e7ddd4]">
                      {[...selectedClient.history]
                        .sort((left, right) =>
                          right.date.localeCompare(left.date),
                        )
                        .map((entry) => (
                          <div
                            className="flex items-center justify-between gap-4 px-4 py-3"
                            key={entry.id}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4f1] text-[#648672]">
                                <CalendarDays className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-[#263649]">
                                  {formatDate(entry.date)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {branchNames[entry.branchId] ??
                                    entry.branchId}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-slate-400">
                              Visita registrada
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-[#ded3ca] px-4 py-5 text-sm text-slate-400">
                      <UserRound className="h-5 w-5 text-[#c3a583]" />
                      Este cliente aún no tiene visitas registradas.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
