"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Globe2,
  ImagePlus,
  ListFilter,
  Mail,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  toast,
} from "@cosmetics/ui";

import {
  createEmptyLocal,
  createSchedule,
  initialCommissions,
  initialConsents,
  initialGiftCards,
  initialGroups,
  initialLocals,
  initialProfessionals,
  initialResources,
  initialScheduledResources,
  initialServices,
  initialSurveyQuestions,
  initialSurveys,
  initialWhatsAppMessages,
  scheduleDays,
  surveyCategories,
  type CommissionRecord,
  type ConsentRecord,
  type EntityStatus,
  type GiftCardRecord,
  type LocalRecord,
  type ProfessionalGroup,
  type ProfessionalRecord,
  type ResourceRecord,
  type ScheduleDay,
  type ScheduledResourceRecord,
  type ServiceRecord,
  type SpecialDay,
  type SurveyQuestion,
  type SurveyRecord,
  type WhatsAppMessageRecord,
} from "@/lib/mock-administration-data";

type AdminSection =
  | "locals"
  | "professionals"
  | "services"
  | "commissions"
  | "resources"
  | "surveys"
  | "consents"
  | "whatsapp"
  | "gift-cards";
type StatusFilter = "all" | "active" | "inactive";
type FormTab = "basic" | "website" | "advanced" | "schedule" | "profile";

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2)
    .toString()
    .padStart(2, "0");
  return `${hour}:${index % 2 === 0 ? "00" : "30"}`;
});

const sectionGroups: {
  label: string;
  items: { id: AdminSection; label: string; icon: ReactNode }[];
}[] = [
  {
    label: "Información básica",
    items: [
      { id: "locals", label: "Locales", icon: <Globe2 className="h-4 w-4" /> },
      {
        id: "professionals",
        label: "Profesionales",
        icon: <UsersRound className="h-4 w-4" />,
      },
      {
        id: "services",
        label: "Servicios",
        icon: <Sparkles className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Opciones avanzadas",
    items: [
      {
        id: "commissions",
        label: "Comisiones",
        icon: <WalletCards className="h-4 w-4" />,
      },
      {
        id: "resources",
        label: "Recursos",
        icon: <SlidersHorizontal className="h-4 w-4" />,
      },
      {
        id: "surveys",
        label: "Encuestas",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: "consents",
        label: "Consentimientos",
        icon: <Check className="h-4 w-4" />,
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        icon: <MessageCircle className="h-4 w-4" />,
      },
      {
        id: "gift-cards",
        label: "Gift cards",
        icon: <WalletCards className="h-4 w-4" />,
      },
    ],
  },
];

const sectionTitles: Record<
  AdminSection,
  { eyebrow: string; title: string; description: string }
> = {
  locals: {
    eyebrow: "Administración",
    title: "Locales",
    description:
      "Configura las sedes, horarios y datos que utilizarán la agenda y tu sitio de reservas.",
  },
  professionals: {
    eyebrow: "Administración",
    title: "Profesionales",
    description:
      "Organiza tu equipo, sus servicios, horarios y disponibilidad por local.",
  },
  services: {
    eyebrow: "Administración",
    title: "Servicios",
    description:
      "Construye tu catálogo de experiencias, clases, paquetes y servicios adicionales.",
  },
  commissions: {
    eyebrow: "Administración",
    title: "Comisiones",
    description:
      "Define reglas claras para repartir las comisiones de servicios y productos.",
  },
  resources: {
    eyebrow: "Administración",
    title: "Recursos",
    description:
      "Controla cabinas, equipos y recursos necesarios para que la agenda funcione.",
  },
  surveys: {
    eyebrow: "Administración",
    title: "Encuestas",
    description:
      "Crea encuestas sencillas para conocer la experiencia de tus clientes.",
  },
  consents: {
    eyebrow: "Administración",
    title: "Consentimientos",
    description:
      "Administra documentos que tus clientes deben conocer antes de un servicio.",
  },
  whatsapp: {
    eyebrow: "Administración",
    title: "WhatsApp",
    description:
      "Prepara mensajes personalizados y reutilizables para acompañar cada reserva.",
  },
  "gift-cards": {
    eyebrow: "Administración",
    title: "Gift cards",
    description:
      "Crea un catálogo de regalos que tus clientes puedan compartir y comprar.",
  },
};

const cloneSchedule = (schedule: ScheduleDay[]) =>
  schedule.map((day) => ({ ...day }));
const cloneLocal = (local: LocalRecord): LocalRecord => ({
  ...local,
  schedule: cloneSchedule(local.schedule),
  specialDays: local.specialDays.map((day) => ({ ...day })),
});
const cloneProfessional = (
  professional: ProfessionalRecord,
): ProfessionalRecord => ({
  ...professional,
  services: [...professional.services],
  schedule: cloneSchedule(professional.schedule),
  specialDays: professional.specialDays.map((day) => ({ ...day })),
});
const cloneScheduledResource = (
  resource: ScheduledResourceRecord,
): ScheduledResourceRecord => ({
  ...resource,
  serviceIds: [...resource.serviceIds],
  schedule: cloneSchedule(resource.schedule),
  specialDays: resource.specialDays.map((day) => ({ ...day })),
});
const currency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="admin-input"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-select"
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#7460a4]" : "bg-slate-200"}`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm transition hover:border-[#e7dfef] hover:bg-[#fbf9fd]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[#7460a4]"
      />{" "}
      <span>{children}</span>
    </label>
  );
}

function Tabs({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="admin-tabs">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            active === item.id ? "admin-tab admin-tab-active" : "admin-tab"
          }
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: EntityStatus | "active" | "inactive";
}) {
  const label =
    status === "active"
      ? "Activo"
      : status === "inactive"
        ? "Inactivo"
        : "Borrador";
  return (
    <Badge
      className={
        status === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "draft"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-100 text-slate-600"
      }
    >
      {label}
    </Badge>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="admin-card">
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ebf6] text-[#7460a4]">
          {icon}
        </div>
        <h3 className="font-semibold text-[#263649]">{title}</h3>
        <p className="max-w-md text-sm text-slate-500">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}

function InfoBanner({
  children,
  icon = <AlertCircle className="h-5 w-5" />,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-900">
      <span className="mt-0.5 shrink-0 text-sky-600">{icon}</span>
      <p className="leading-6">{children}</p>
    </div>
  );
}

const scheduleHours = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, "0"),
);
const scheduleMinutes = ["00", "15", "30", "45"];

function ScheduleTime({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const [hour = "10", minute = "00"] = value.split(":");
  return (
    <div className="schedule-time" aria-label={label}>
      <select
        className="schedule-time-select"
        value={hour}
        disabled={disabled}
        aria-label={`${label}, hora`}
        onChange={(event) => onChange(`${event.target.value}:${minute}`)}
      >
        {scheduleHours.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <select
        className="schedule-time-select"
        value={minute}
        disabled={disabled}
        aria-label={`${label}, minutos`}
        onChange={(event) => onChange(`${hour}:${event.target.value}`)}
      >
        {scheduleMinutes.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScheduleRows({
  schedule,
  onChange,
  withBreak = false,
}: {
  schedule: ScheduleDay[];
  onChange: (schedule: ScheduleDay[]) => void;
  withBreak?: boolean;
}) {
  const update = (day: string, patch: Partial<ScheduleDay>) =>
    onChange(
      schedule.map((item) => (item.day === day ? { ...item, ...patch } : item)),
    );
  const copyFirst = () => {
    const first = schedule.find((item) => item.enabled) ?? schedule[0];
    if (!first) return;
    onChange(
      schedule.map((item) => ({
        ...item,
        enabled: first.enabled,
        open: first.open,
        close: first.close,
        breakStart: first.breakStart,
        breakEnd: first.breakEnd,
      })),
    );
    toast.success("Horario copiado en todos los días.");
  };
  return (
    <div className="schedule-table">
      <div className="schedule-table-header" aria-hidden="true">
        <span>Día</span>
        <span>Estado</span>
        <span>Inicio de la jornada</span>
        <span>Fin de la jornada</span>
        <span />
      </div>
      {schedule.map((item, index) => (
        <div key={item.day} className="schedule-table-row">
          <span className="schedule-day">{item.day}</span>
          <Toggle
            checked={item.enabled}
            label={`${item.enabled ? "Desactivar" : "Activar"} ${item.day}`}
            onChange={(checked) => update(item.day, { enabled: checked })}
          />
          <ScheduleTime
            label={`Inicio de la jornada de ${item.day}`}
            value={item.open}
            disabled={!item.enabled}
            onChange={(open) => update(item.day, { open })}
          />
          <ScheduleTime
            label={`Fin de la jornada de ${item.day}`}
            value={item.close}
            disabled={!item.enabled}
            onChange={(close) => update(item.day, { close })}
          />
          {index === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="schedule-copy-button"
              onClick={copyFirst}
            >
              Copiar en todos
            </Button>
          ) : (
            <span />
          )}
          {withBreak && item.enabled ? (
            <div className="schedule-break mt-3 flex flex-wrap items-center gap-3 border-t border-dashed border-slate-100 pt-3 text-xs text-slate-500">
              <Clock3 className="h-4 w-4" />
              {item.breakStart ? (
                <>
                  <span>Descanso</span>
                  <ScheduleTime
                    label={`Inicio del descanso de ${item.day}`}
                    value={item.breakStart}
                    onChange={(breakStart) => update(item.day, { breakStart })}
                  />
                  <span>a</span>
                  <ScheduleTime
                    label={`Fin del descanso de ${item.day}`}
                    value={item.breakEnd ?? "15:00"}
                    onChange={(breakEnd) => update(item.day, { breakEnd })}
                  />
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                    onClick={() =>
                      update(item.day, {
                        breakStart: undefined,
                        breakEnd: undefined,
                      })
                    }
                  >
                    Quitar descanso
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-[#7460a4] hover:underline"
                  onClick={() =>
                    update(item.day, { breakStart: "14:00", breakEnd: "15:00" })
                  }
                >
                  + Agregar descanso
                </button>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ModalShell({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  saveLabel = "Guardar cambios",
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onSave?: (() => void) | undefined;
  saveLabel?: string;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`admin-dialog ${wide ? "admin-dialog-wide sm:max-w-4xl" : "sm:max-w-2xl"}`}
      >
        <DialogHeader className="border-b border-[#eee7e2] pb-4">
          <DialogTitle className="text-xl text-[#263649]">{title}</DialogTitle>
        </DialogHeader>
        <div className="admin-dialog-body">{children}</div>
        {onSave ? (
          <DialogFooter className="border-t border-[#eee7e2] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" className="admin-primary" onClick={onSave}>
              {saveLabel}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="admin-alert-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LocalDialog({
  open,
  local,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  local: LocalRecord | null;
  onOpenChange: (open: boolean) => void;
  onSave: (local: LocalRecord) => void;
}) {
  const [tab, setTab] = useState<"basic" | "website">("basic");
  const [draft, setDraft] = useState<LocalRecord>(
    local ? cloneLocal(local) : createEmptyLocal(),
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setDraft(local ? cloneLocal(local) : createEmptyLocal());
      setTab("basic");
      setCoverPreview(null);
    }
  }, [local, open]);
  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview],
  );
  const update = (patch: Partial<LocalRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const save = () => {
    if (
      !draft.name.trim() ||
      !draft.address.trim() ||
      !draft.phone.trim() ||
      !draft.email.trim() ||
      !draft.description.trim()
    ) {
      toast.error("Completa los campos obligatorios del local.");
      return;
    }
    if (!draft.email.includes("@")) {
      toast.error("Ingresa un correo válido.");
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
    onOpenChange(false);
  };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={local ? `Editar ${local.name}` : "Nuevo local"}
      onSave={save}
      wide
    >
      <Tabs
        items={[
          { id: "basic", label: "Datos básicos" },
          { id: "website", label: "Sitio web" },
        ]}
        active={tab}
        onChange={(value) => setTab(value as "basic" | "website")}
      />
      {tab === "basic" ? (
        <div className="space-y-5">
          <div className="admin-form-grid">
            <div className="sm:col-span-2">
              <Field
                id="local-name"
                label="Nombre del local"
                required
                value={draft.name}
                onChange={(value) => update({ name: value })}
                placeholder="Ej. Keysar Centro"
              />
            </div>
            <Field
              id="local-address"
              label="Dirección"
              required
              value={draft.address}
              onChange={(value) => update({ address: value })}
            />
            <Field
              id="local-reference"
              label="Información adicional"
              value={draft.additionalInfo}
              onChange={(value) => update({ additionalInfo: value })}
              placeholder="Piso, número o referencia"
            />
            <SelectField
              id="local-timezone"
              label="Zona horaria"
              value={draft.timezone}
              onChange={(value) => update({ timezone: value })}
              options={[
                {
                  value: "America/Mexico_City",
                  label: "Ciudad de México (GMT-06:00)",
                },
                { value: "America/Monterrey", label: "Monterrey (GMT-06:00)" },
              ]}
            />
            <div className="space-y-2">
              <Field
                id="local-phone"
                label="Teléfono"
                required
                value={draft.phone}
                onChange={(value) => update({ phone: value })}
                type="tel"
              />
              <CheckRow
                checked={draft.whatsappEnabled}
                onChange={(checked) => update({ whatsappEnabled: checked })}
              >
                Permitir que mis clientes me contacten por WhatsApp
              </CheckRow>
            </div>
            <Field
              id="local-email"
              label="Email"
              required
              value={draft.email}
              onChange={(value) => update({ email: value })}
              type="email"
            />
          </div>
          <div>
            <h3 className="admin-schedule-title">
              Horario de inicio y fin de la jornada
            </h3>
            <p className="admin-help">
              Activa los días en que atiendes y configura tus horas laborales.
            </p>
            <div className="mt-3">
              <ScheduleRows
                schedule={draft.schedule}
                onChange={(schedule) => update({ schedule })}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="admin-form-grid">
            <div className="sm:col-span-2">
              <div className="admin-setting-row">
                <div>
                  <p className="font-medium">Aceptar citas en línea</p>
                  <p className="admin-help">
                    Permite que tus clientes reserven desde el sitio web.
                  </p>
                </div>
                <Toggle
                  checked={draft.onlineBooking}
                  onChange={(checked) => update({ onlineBooking: checked })}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="admin-setting-row">
                <div>
                  <p className="font-medium">Solo servicios a domicilio</p>
                  <p className="admin-help">
                    Oculta la dirección y trabaja únicamente con visitas a
                    domicilio.
                  </p>
                </div>
                <Toggle
                  checked={draft.homeServiceOnly}
                  onChange={(checked) => update({ homeServiceOnly: checked })}
                />
              </div>
            </div>
            <Field
              id="local-secondary-phone"
              label="Teléfono secundario"
              value={draft.secondaryPhone}
              onChange={(value) => update({ secondaryPhone: value })}
            />
            <div className="sm:col-span-2">
              <label htmlFor="local-description" className="admin-label">
                Descripción del local
                <span className="ml-1 text-rose-500">*</span>
              </label>
              <Textarea
                id="local-description"
                rows={5}
                value={draft.description}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
                className="admin-textarea"
                placeholder="Describe la experiencia que ofreces."
              />
            </div>
          </div>
          <FilePicker
            label="Portada para tu sitio web"
            recommendation="Recomendado: 820 × 360 px, máximo 3 MB."
            value={draft.coverImage}
            onChange={(fileName) => update({ coverImage: fileName })}
            previewUrl={coverPreview}
            onFileChange={(file) => {
              const nextPreview = URL.createObjectURL(file);
              setCoverPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return nextPreview;
              });
            }}
          />
        </div>
      )}
    </ModalShell>
  );
}

function FilePicker({
  label,
  recommendation,
  value,
  onChange,
  previewUrl,
  onFileChange,
  accept = "image/png,image/jpeg",
  maxSizeMb = 3,
}: {
  label: string;
  recommendation: string;
  value: string | null;
  onChange: (value: string | null) => void;
  previewUrl?: string | null;
  onFileChange?: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
}) {
  const inputId = `file-${label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-2">
      <p className="admin-label">{label}</p>
      <p className="admin-help">{recommendation}</p>
      {previewUrl !== undefined ? (
        <div className="cover-preview-frame">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa de la portada del local"
              className="cover-preview-image"
            />
          ) : (
            <div className="cover-preview-placeholder">
              <ImagePlus className="h-8 w-8" />
              <span>Vista previa de portada 820 × 360 px</span>
            </div>
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#d8cde2] bg-[#fbf9fd] p-4">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#7460a4]">
            <ImagePlus className="h-5 w-5" />
          </div>
          <span>{value ?? "Todavía no hay un archivo cargado"}</span>
        </div>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > maxSizeMb * 1024 * 1024) {
              toast.error(`El archivo no puede superar ${maxSizeMb} MB.`);
              return;
            }
            onChange(file.name);
            onFileChange?.(file);
          }}
        />
        <Button asChild type="button" variant="outline">
          <label htmlFor={inputId}>
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar archivo
          </label>
        </Button>
      </div>
    </div>
  );
}

function SpecialDayDialog({
  open,
  title,
  days,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  title: string;
  days: SpecialDay[];
  onOpenChange: (open: boolean) => void;
  onSave: (days: SpecialDay[]) => void;
}) {
  const [draft, setDraft] = useState<SpecialDay[]>([]);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("18:00");
  useEffect(() => {
    if (open) {
      setDraft(days.map((day) => ({ ...day })));
      setDate("");
    }
  }, [days, open]);
  const add = () => {
    if (!date || end <= start) {
      toast.error("Selecciona una fecha y un horario válido.");
      return;
    }
    if (draft.some((day) => day.date === date)) {
      toast.error("Esa fecha ya está agregada.");
      return;
    }
    setDraft((current) => [
      ...current,
      { id: makeId("special"), date, open: start, close: end },
    ]);
    setDate("");
  };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onSave={() => {
        onSave(draft);
        onOpenChange(false);
      }}
    >
      <div className="space-y-5">
        <div className="admin-form-grid sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
          <Field
            id="special-date"
            label="Fecha"
            value={date}
            onChange={setDate}
            type="date"
          />
          <SelectField
            id="special-start"
            label="Apertura"
            value={start}
            onChange={setStart}
            options={timeOptions.map((time) => ({ value: time, label: time }))}
          />
          <SelectField
            id="special-end"
            label="Cierre"
            value={end}
            onChange={setEnd}
            options={timeOptions.map((time) => ({ value: time, label: time }))}
          />
          <Button type="button" className="admin-primary" onClick={add}>
            Agregar
          </Button>
        </div>
        <div>
          <h3 className="admin-section-title">Días abiertos</h3>
          <div className="mt-3 space-y-2">
            {draft.length === 0 ? (
              <p className="admin-empty-small">
                Todavía no hay jornadas especiales.
              </p>
            ) : (
              draft.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between rounded-2xl border border-[#eee7e2] p-3 text-sm"
                >
                  <span>{day.date}</span>
                  <span className="text-slate-500">
                    {day.open} – {day.close}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((current) =>
                        current.filter((item) => item.id !== day.id),
                      )
                    }
                  >
                    Quitar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function LocalSection({
  locals,
  setLocals,
}: {
  locals: LocalRecord[];
  setLocals: (
    value: LocalRecord[] | ((current: LocalRecord[]) => LocalRecord[]),
  ) => void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LocalRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [specialLocal, setSpecialLocal] = useState<LocalRecord | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<LocalRecord | null>(null);
  const visible = useMemo(
    () =>
      locals.filter(
        (local) =>
          (filter === "all" || local.status === filter) &&
          `${local.name} ${local.address}`
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase().trim()),
      ),
    [filter, locals, search],
  );
  const save = (local: LocalRecord) => {
    setLocals((current) =>
      current.some((item) => item.id === local.id)
        ? current.map((item) => (item.id === local.id ? local : item))
        : [...current, local],
    );
    toast.success(editing ? "Local actualizado." : "Local creado.");
  };
  const toggle = () => {
    if (!confirming) return;
    const next = confirming.status === "active" ? "inactive" : "active";
    setLocals((current) =>
      current.map((item) =>
        item.id === confirming.id ? { ...item, status: next } : item,
      ),
    );
    setConfirming(null);
    toast.success(next === "active" ? "Local activado." : "Local desactivado.");
  };
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Locales"
        description="Configura las sedes, horarios y datos que utilizarán la agenda y tu sitio de reservas."
        action={
          <Button
            className="admin-primary"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo local
          </Button>
        }
      />
      <InfoBanner icon={<CalendarDays className="h-5 w-5" />}>
        <strong>Configura el horario y la dirección del local.</strong> Esta
        información será la base para agendar citas manuales y reservas en
        línea.
      </InfoBanner>
      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar local"
        count={`${visible.length} ${visible.length === 1 ? "local" : "locales"}`}
      />
      <div className="space-y-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Globe2 className="h-6 w-6" />}
            title="No hay locales para mostrar"
            description="Prueba otro filtro o crea el primer local de tu operación."
            action={
              <Button
                className="admin-primary"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo local
              </Button>
            }
          />
        ) : (
          visible.map((local) => (
            <Card key={local.id} className="admin-card">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0ebf6] text-[#7460a4]">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-[#263649]">
                        {local.name}
                      </h3>
                      <StatusBadge status={local.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {local.address}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {local.phone} · {local.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Popover
                    open={previewId === local.id}
                    onOpenChange={(open) =>
                      setPreviewId(open ? local.id : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver horario
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="admin-popover w-80">
                      <div className="mb-3 flex items-center gap-2 font-semibold text-[#263649]">
                        <Clock3 className="h-4 w-4 text-[#7460a4]" />
                        Horario semanal
                      </div>
                      <div className="space-y-2 text-sm">
                        {local.schedule.map((day) => (
                          <div key={day.day} className="flex justify-between">
                            <span>{day.day.slice(0, 3)}</span>
                            <span className="text-slate-500">
                              {day.enabled
                                ? `${day.open} – ${day.close}`
                                : "Cerrado"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="link"
                        className="mt-3 h-auto p-0 text-[#7460a4]"
                        onClick={() => {
                          setPreviewId(null);
                          setSpecialLocal(local);
                        }}
                      >
                        Editar jornadas especiales
                      </Button>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(cloneLocal(local));
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Opciones de ${local.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="admin-popover w-56 p-1"
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setSpecialLocal(local)}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Habilitar jornada especial
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setConfirming(local)}
                      >
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        {local.status === "active"
                          ? "Desactivar local"
                          : "Volver a activar"}
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <LocalDialog
        open={dialogOpen}
        local={editing}
        onOpenChange={setDialogOpen}
        onSave={save}
      />
      <SpecialDayDialog
        open={Boolean(specialLocal)}
        title={
          specialLocal
            ? `Abrir día para ${specialLocal.name}`
            : "Jornada especial"
        }
        days={specialLocal?.specialDays ?? []}
        onOpenChange={(open) => {
          if (!open) setSpecialLocal(null);
        }}
        onSave={(days) => {
          if (!specialLocal) return;
          setLocals((current) =>
            current.map((local) =>
              local.id === specialLocal.id
                ? { ...local, specialDays: days }
                : local,
            ),
          );
          toast.success("Jornada especial guardada.");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={
          confirming?.status === "active"
            ? "¿Desactivar local?"
            : "¿Activar local?"
        }
        description="El cambio se refleja inmediatamente en esta agenda local y puedes revertirlo desde Opciones."
        confirmLabel={
          confirming?.status === "active" ? "Desactivar" : "Activar"
        }
        onConfirm={toggle}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="admin-eyebrow">Administración</p>
        <h1 className="admin-page-title">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Toolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  placeholder,
  count,
  extra,
}: {
  filter?: StatusFilter;
  onFilterChange?: (filter: StatusFilter) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  count?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {onFilterChange ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar por
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="admin-popover w-56 p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Estado
              </p>
              {[
                ["active", "Activos"],
                ["inactive", "Inactivos"],
                ["all", "Todos"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`flex w-full rounded-xl px-3 py-2 text-left text-sm ${filter === value ? "bg-[#f0ebf6] text-[#7460a4]" : "hover:bg-slate-50"}`}
                  onClick={() => onFilterChange(value as StatusFilter)}
                >
                  {label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : null}
        {onSearchChange ? (
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="admin-input pl-9"
              placeholder={placeholder ?? "Buscar"}
              value={search ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        ) : null}
        {extra}
      </div>
      {count ? <span className="text-sm text-slate-400">{count}</span> : null}
    </div>
  );
}

function ProfessionalDialog({
  open,
  professional,
  locals,
  services,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  professional: ProfessionalRecord | null;
  locals: LocalRecord[];
  services: ServiceRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (professional: ProfessionalRecord) => void;
}) {
  const [tab, setTab] = useState<FormTab>("basic");
  const [draft, setDraft] = useState<ProfessionalRecord>(
    professional
      ? cloneProfessional(professional)
      : {
          id: makeId("professional"),
          localId: locals[0]?.id ?? "",
          name: "",
          role: "",
          email: "",
          acceptsOnline: true,
          createsUser: false,
          services: [],
          biography: "",
          avatar: null,
          status: "active",
          schedule: createSchedule(),
          specialDays: [],
        },
  );
  useEffect(() => {
    if (open) {
      setDraft(
        professional
          ? cloneProfessional(professional)
          : {
              id: makeId("professional"),
              localId: locals[0]?.id ?? "",
              name: "",
              role: "",
              email: "",
              acceptsOnline: true,
              createsUser: false,
              services: [],
              biography: "",
              avatar: null,
              status: "active",
              schedule: createSchedule(),
              specialDays: [],
            },
      );
      setTab("basic");
    }
  }, [locals, open, professional]);
  const update = (patch: Partial<ProfessionalRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const toggleService = (id: string, checked: boolean) =>
    update({
      services: checked
        ? [...draft.services, id]
        : draft.services.filter((serviceId) => serviceId !== id),
    });
  const save = () => {
    if (
      !draft.name.trim() ||
      !draft.role.trim() ||
      !draft.email.includes("@") ||
      !draft.localId
    ) {
      toast.error("Completa nombre, cargo, local y un email válido.");
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
    onOpenChange(false);
  };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={professional ? `Editar ${professional.name}` : "Nuevo profesional"}
      onSave={save}
      wide
    >
      <Tabs
        items={[
          { id: "basic", label: "Datos básicos" },
          { id: "schedule", label: "Horario" },
          { id: "profile", label: "Perfil" },
        ]}
        active={tab}
        onChange={(value) => setTab(value as FormTab)}
      />
      {tab === "basic" ? (
        <div className="space-y-5">
          <div className="admin-form-grid">
            <Field
              id="professional-name"
              label="Nombre público"
              required
              value={draft.name}
              onChange={(value) => update({ name: value })}
              placeholder="Ej. Ana López"
            />
            <Field
              id="professional-role"
              label="Especialidad o cargo"
              required
              value={draft.role}
              onChange={(value) => update({ role: value })}
              placeholder="Ej. Cosmetóloga"
            />
            <SelectField
              id="professional-local"
              label="Local"
              value={draft.localId}
              onChange={(value) => update({ localId: value })}
              options={locals.map((local) => ({
                value: local.id,
                label: local.name,
              }))}
            />
            <Field
              id="professional-email"
              label="Email"
              required
              value={draft.email}
              onChange={(value) => update({ email: value })}
              type="email"
            />
          </div>
          <div className="space-y-2">
            <div className="admin-setting-row">
              <div>
                <p className="font-medium">Acepta reservas en línea</p>
                <p className="admin-help">
                  El profesional aparecerá como opción en el sitio web.
                </p>
              </div>
              <Toggle
                checked={draft.acceptsOnline}
                onChange={(checked) => update({ acceptsOnline: checked })}
              />
            </div>
            <div className="admin-setting-row">
              <div>
                <p className="font-medium">
                  Crear usuario para este profesional
                </p>
                <p className="admin-help">
                  Podrá acceder con el email configurado.
                </p>
              </div>
              <Toggle
                checked={draft.createsUser}
                onChange={(checked) => update({ createsUser: checked })}
              />
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h3 className="admin-section-title">Servicios que realiza</h3>
                <p className="admin-help">
                  {draft.services.length} seleccionados de {services.length}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({
                    services:
                      draft.services.length === services.length
                        ? []
                        : services.map((service) => service.id),
                  })
                }
              >
                {draft.services.length === services.length
                  ? "Quitar todos"
                  : "Seleccionar todo"}
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {services
                .filter((service) => service.type !== "add-on")
                .map((service) => (
                  <CheckRow
                    key={service.id}
                    checked={draft.services.includes(service.id)}
                    onChange={(checked) => toggleService(service.id, checked)}
                  >
                    {service.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {service.category}
                    </span>
                  </CheckRow>
                ))}
            </div>
          </div>
        </div>
      ) : tab === "schedule" ? (
        <div>
          <h3 className="admin-section-title">Disponibilidad semanal</h3>
          <p className="admin-help">
            Configura la jornada y los descansos del profesional.
          </p>
          <div className="mt-4">
            <ScheduleRows
              schedule={draft.schedule}
              withBreak
              onChange={(schedule) => update({ schedule })}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <FilePicker
            label="Foto del profesional"
            recommendation="Recomendado: 100 × 100 px, máximo 3 MB."
            value={draft.avatar}
            onChange={(avatar) => update({ avatar })}
          />
          <div>
            <label htmlFor="professional-bio" className="admin-label">
              Biografía
            </label>
            <Textarea
              id="professional-bio"
              rows={6}
              className="admin-textarea"
              value={draft.biography}
              onChange={(event) => update({ biography: event.target.value })}
              placeholder="Cuéntale a tus clientes quién te atenderá."
            />
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function GroupDialog({
  open,
  group,
  locals,
  professionals,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  group: ProfessionalGroup | null;
  locals: LocalRecord[];
  professionals: ProfessionalRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (group: ProfessionalGroup) => void;
}) {
  const [draft, setDraft] = useState<ProfessionalGroup>(
    group
      ? { ...group, professionalIds: [...group.professionalIds] }
      : {
          id: makeId("group"),
          name: "",
          localId: locals[0]?.id ?? "",
          professionalIds: [],
        },
  );
  useEffect(() => {
    if (open)
      setDraft(
        group
          ? { ...group, professionalIds: [...group.professionalIds] }
          : {
              id: makeId("group"),
              name: "",
              localId: locals[0]?.id ?? "",
              professionalIds: [],
            },
      );
  }, [group, locals, open]);
  const localPros = professionals.filter(
    (professional) => professional.localId === draft.localId,
  );
  const update = (patch: Partial<ProfessionalGroup>) =>
    setDraft((current) => ({ ...current, ...patch }));
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={group ? "Editar grupo" : "Nuevo grupo"}
      onSave={() => {
        if (!draft.name.trim() || !draft.localId) {
          toast.error("Completa nombre y local.");
          return;
        }
        onSave(draft);
        onOpenChange(false);
      }}
    >
      <div className="space-y-5">
        <Field
          id="group-name"
          label="Nombre del grupo"
          required
          value={draft.name}
          onChange={(value) => update({ name: value })}
          placeholder="Ej. Cabinas principales"
        />
        <SelectField
          id="group-local"
          label="Local"
          value={draft.localId}
          onChange={(value) => update({ localId: value, professionalIds: [] })}
          options={locals.map((local) => ({
            value: local.id,
            label: local.name,
          }))}
        />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="admin-section-title">Profesionales</h3>
              <p className="admin-help">
                {draft.professionalIds.length} seleccionados
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                update({
                  professionalIds:
                    draft.professionalIds.length === localPros.length
                      ? []
                      : localPros.map((professional) => professional.id),
                })
              }
            >
              Seleccionar todo
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {localPros.map((professional) => (
              <CheckRow
                key={professional.id}
                checked={draft.professionalIds.includes(professional.id)}
                onChange={(checked) =>
                  update({
                    professionalIds: checked
                      ? [...draft.professionalIds, professional.id]
                      : draft.professionalIds.filter(
                          (id) => id !== professional.id,
                        ),
                  })
                }
              >
                {professional.name}
              </CheckRow>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ProfessionalsSection({
  locals,
  services,
  professionals,
  setProfessionals,
}: {
  locals: LocalRecord[];
  services: ServiceRecord[];
  professionals: ProfessionalRecord[];
  setProfessionals: (
    value:
      | ProfessionalRecord[]
      | ((current: ProfessionalRecord[]) => ProfessionalRecord[]),
  ) => void;
}) {
  const [tab, setTab] = useState<"professionals" | "groups">("professionals");
  const [groups, setGroups] = useState<ProfessionalGroup[]>(initialGroups);
  const [editing, setEditing] = useState<ProfessionalRecord | null>(null);
  const [proDialog, setProDialog] = useState(false);
  const [groupEditing, setGroupEditing] = useState<ProfessionalGroup | null>(
    null,
  );
  const [groupDialog, setGroupDialog] = useState(false);
  const [confirming, setConfirming] = useState<ProfessionalRecord | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<ProfessionalGroup | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const activeCount = professionals.filter(
    (professional) => professional.status === "active",
  ).length;
  const filtered = professionals.filter((professional) =>
    professional.name
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase().trim()),
  );
  const saveProfessional = (professional: ProfessionalRecord) => {
    setProfessionals((current) =>
      current.some((item) => item.id === professional.id)
        ? current.map((item) =>
            item.id === professional.id ? professional : item,
          )
        : [...current, professional],
    );
    toast.success(editing ? "Profesional actualizado." : "Profesional creado.");
  };
  const saveGroup = (group: ProfessionalGroup) => {
    setGroups((current) =>
      current.some((item) => item.id === group.id)
        ? current.map((item) => (item.id === group.id ? group : item))
        : [...current, group],
    );
    toast.success("Grupo guardado.");
  };
  const toggle = () => {
    if (!confirming) return;
    const next = confirming.status === "active" ? "inactive" : "active";
    setProfessionals((current) =>
      current.map((item) =>
        item.id === confirming.id ? { ...item, status: next } : item,
      ),
    );
    setConfirming(null);
    toast.success(
      next === "active" ? "Profesional activado." : "Profesional desactivado.",
    );
  };
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Profesionales"
        description="Organiza tu equipo, sus servicios, horarios y disponibilidad por local."
        action={
          <Button
            className="admin-primary"
            onClick={() => {
              setEditing(null);
              setProDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo profesional
          </Button>
        }
      />
      <Tabs
        items={[
          { id: "professionals", label: "Profesionales" },
          { id: "groups", label: "Grupos personalizados" },
        ]}
        active={tab}
        onChange={(value) => setTab(value as "professionals" | "groups")}
      />
      {tab === "professionals" ? (
        <>
          <InfoBanner icon={<UsersRound className="h-5 w-5" />}>
            Edita a tu primer profesional y después agrega más personas a tu
            equipo. Aquí puedes administrar horarios, servicios y acceso.
          </InfoBanner>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Buscar profesional"
            count={`${activeCount} profesionales activos de ${professionals.length}`}
          />
          <div className="space-y-5">
            {locals.map((local) => {
              const localPros = filtered.filter(
                (professional) => professional.localId === local.id,
              );
              if (localPros.length === 0) return null;
              return (
                <div key={local.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="admin-section-title">{local.name}</h2>
                    <Badge variant="outline">{localPros.length}</Badge>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {localPros.map((professional) => (
                      <Card key={professional.id} className="admin-card">
                        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7e0f0] text-lg font-semibold text-[#7460a4]">
                              {professional.name
                                .split(" ")
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-[#263649]">
                                  {professional.name}
                                </h3>
                                <StatusBadge status={professional.status} />
                              </div>
                              <p className="text-sm text-slate-500">
                                {professional.role}
                              </p>
                              <p className="text-xs text-slate-400">
                                {professional.services.length} servicios ·{" "}
                                {professional.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Clock3 className="mr-2 h-4 w-4" />
                                  Horario
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="admin-popover w-72"
                              >
                                <p className="mb-3 font-semibold">
                                  Horario de {professional.name}
                                </p>
                                {professional.schedule.map((day) => (
                                  <div
                                    className="flex justify-between py-1 text-sm"
                                    key={day.day}
                                  >
                                    <span>{day.day.slice(0, 3)}</span>
                                    <span className="text-slate-500">
                                      {day.enabled
                                        ? `${day.open} – ${day.close}`
                                        : "Cerrado"}
                                    </span>
                                  </div>
                                ))}
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditing(cloneProfessional(professional));
                                setProDialog(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  aria-label={`Opciones de ${professional.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="admin-popover w-56 p-1"
                              >
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    setEditing(cloneProfessional(professional));
                                    setProDialog(true);
                                  }}
                                >
                                  <CalendarDays className="mr-2 h-4 w-4" />
                                  Editar jornada
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => setConfirming(professional)}
                                >
                                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                                  {professional.status === "active"
                                    ? "Desactivar"
                                    : "Volver a activar"}
                                </Button>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="admin-section-title">Grupos personalizados</h2>
              <p className="admin-help">
                Agrupa profesionales para encontrarlos rápidamente en la agenda.
              </p>
            </div>
            <Button
              className="admin-primary"
              onClick={() => {
                setGroupEditing(null);
                setGroupDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo grupo
            </Button>
          </div>
          {groups.length === 0 ? (
            <EmptyState
              icon={<UsersRound className="h-6 w-6" />}
              title="Todavía no hay grupos"
              description="Crea grupos para organizar cabinas o equipos dentro de un local."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {groups.map((group) => (
                <Card key={group.id} className="admin-card">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <h3 className="font-semibold text-[#263649]">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          locals.find((local) => local.id === group.localId)
                            ?.name
                        }{" "}
                        · {group.professionalIds.length} profesionales
                      </p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-[#7460a4]"
                        onClick={() => {
                          setGroupEditing(group);
                          setGroupDialog(true);
                        }}
                      >
                        Ver grupo
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGroupEditing(group);
                          setGroupDialog(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setConfirmGroup(group)}
                        aria-label={`Eliminar ${group.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      <ProfessionalDialog
        open={proDialog}
        professional={editing}
        locals={locals}
        services={services}
        onOpenChange={setProDialog}
        onSave={saveProfessional}
      />
      <GroupDialog
        open={groupDialog}
        group={groupEditing}
        locals={locals}
        professionals={professionals}
        onOpenChange={setGroupDialog}
        onSave={saveGroup}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Cambiar estado del profesional"
        description="Puedes volver a activarlo en cualquier momento desde las opciones."
        confirmLabel={
          confirming?.status === "active" ? "Desactivar" : "Activar"
        }
        onConfirm={toggle}
      />
      <ConfirmDialog
        open={Boolean(confirmGroup)}
        onOpenChange={(open) => {
          if (!open) setConfirmGroup(null);
        }}
        title="¿Eliminar grupo?"
        description="Los profesionales no se eliminan; solo se quitará este agrupamiento."
        confirmLabel="Eliminar grupo"
        onConfirm={() => {
          if (confirmGroup)
            setGroups((current) =>
              current.filter((group) => group.id !== confirmGroup.id),
            );
          setConfirmGroup(null);
          toast.success("Grupo eliminado.");
        }}
      />
    </div>
  );
}

function ServiceDialog({
  open,
  service,
  serviceType,
  professionals,
  categories,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  service: ServiceRecord | null;
  serviceType: ServiceRecord["type"];
  professionals: ProfessionalRecord[];
  categories: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (service: ServiceRecord) => void;
}) {
  const base = service ?? {
    id: makeId("service"),
    name: "",
    category: categories[0] ?? "General",
    type: serviceType,
    price: 0,
    duration: 60,
    status: "active" as const,
    featured: false,
    professionalIds: [],
    description: "",
    sessions: 1,
    capacity: 8,
  };
  const [tab, setTab] = useState<"basic" | "website" | "advanced">("basic");
  const [draft, setDraft] = useState<ServiceRecord>(base);
  useEffect(() => {
    if (open) {
      setDraft(
        service
          ? { ...service, professionalIds: [...service.professionalIds] }
          : {
              id: makeId("service"),
              name: "",
              category: categories[0] ?? "General",
              type: serviceType,
              price: 0,
              duration: 60,
              status: "active",
              featured: false,
              professionalIds: [],
              description: "",
              sessions: 1,
              capacity: 8,
            },
      );
      setTab("basic");
    }
  }, [categories, open, service, serviceType]);
  const update = (patch: Partial<ServiceRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const save = () => {
    if (!draft.name.trim() || draft.price < 0 || draft.duration < 1) {
      toast.error("Completa nombre, precio y duración.");
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
    onOpenChange(false);
  };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        service
          ? `Editar ${service.name}`
          : `Nuevo ${serviceType === "add-on" ? "adicional" : serviceType === "class" ? "clase" : serviceType === "package" ? "paquete" : "servicio"}`
      }
      onSave={save}
      wide
    >
      <Tabs
        items={[
          { id: "basic", label: "Datos básicos" },
          { id: "website", label: "Sitio web" },
          { id: "advanced", label: "Opciones avanzadas" },
        ]}
        active={tab}
        onChange={(value) => setTab(value as "basic" | "website" | "advanced")}
      />
      {tab === "basic" ? (
        <div className="space-y-5">
          <div className="admin-form-grid">
            <div className="sm:col-span-2">
              <Field
                id="service-name"
                label="Nombre"
                required
                value={draft.name}
                onChange={(value) => update({ name: value })}
                placeholder="Ej. Facial hidratante"
              />
            </div>
            <Field
              id="service-price"
              label="Precio"
              value={String(draft.price)}
              onChange={(value) => update({ price: Number(value) || 0 })}
              type="number"
            />
            <Field
              id="service-duration"
              label="Duración en minutos"
              value={String(draft.duration)}
              onChange={(value) => update({ duration: Number(value) || 0 })}
              type="number"
            />
            <SelectField
              id="service-category"
              label="Categoría"
              value={draft.category}
              onChange={(value) => update({ category: value })}
              options={categories.map((category) => ({
                value: category,
                label: category,
              }))}
            />
            {draft.type === "class" ? (
              <Field
                id="service-capacity"
                label="Capacidad"
                value={String(draft.capacity ?? 8)}
                onChange={(value) => update({ capacity: Number(value) || 1 })}
                type="number"
              />
            ) : null}
            {draft.type === "service" && draft.sessions !== undefined ? (
              <Field
                id="service-sessions"
                label="Sesiones requeridas"
                value={String(draft.sessions)}
                onChange={(value) => update({ sessions: Number(value) || 1 })}
                type="number"
              />
            ) : null}
          </div>
          <CheckRow
            checked={draft.featured}
            onChange={(checked) => update({ featured: checked })}
          >
            Servicio destacado
          </CheckRow>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="admin-section-title">Profesionales</h3>
                <p className="admin-help">
                  {draft.professionalIds.length} seleccionados
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({
                    professionalIds:
                      draft.professionalIds.length === professionals.length
                        ? []
                        : professionals.map((professional) => professional.id),
                  })
                }
              >
                Seleccionar todo
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {professionals
                .filter((professional) => professional.status === "active")
                .map((professional) => (
                  <CheckRow
                    key={professional.id}
                    checked={draft.professionalIds.includes(professional.id)}
                    onChange={(checked) =>
                      update({
                        professionalIds: checked
                          ? [...draft.professionalIds, professional.id]
                          : draft.professionalIds.filter(
                              (id) => id !== professional.id,
                            ),
                      })
                    }
                  >
                    {professional.name}
                  </CheckRow>
                ))}
            </div>
          </div>
        </div>
      ) : tab === "website" ? (
        <div className="space-y-5">
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Permitir agendar en línea</p>
              <p className="admin-help">
                Muestra esta experiencia en el sitio de reservas.
              </p>
            </div>
            <Toggle
              checked={draft.status === "active"}
              onChange={(checked) =>
                update({ status: checked ? "active" : "inactive" })
              }
            />
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Mostrar duración</p>
              <p className="admin-help">
                El cliente verá la duración antes de reservar.
              </p>
            </div>
            <Toggle checked onChange={() => undefined} />
          </div>
          <div>
            <label htmlFor="service-description" className="admin-label">
              Descripción
            </label>
            <Textarea
              id="service-description"
              rows={5}
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
              className="admin-textarea"
            />
          </div>
          <Field
            id="service-alternatives"
            label="Nombres alternativos"
            value=""
            onChange={() => undefined}
            placeholder="Opcional"
          />
          <FilePicker
            label="Imágenes del servicio"
            recommendation="Hasta 3 imágenes, 200 × 200 px recomendado, máximo 3 MB."
            value={null}
            onChange={() => toast.success("Imagen agregada al mock local.")}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Videoconferencia</p>
              <p className="admin-help">
                Permite realizar este servicio de manera remota.
              </p>
            </div>
            <Toggle
              checked={false}
              onChange={() =>
                toast.info(
                  "La modalidad se guardará en la siguiente versión del catálogo.",
                )
              }
            />
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Precio incluye IVA</p>
              <p className="admin-help">
                Indica cómo presentar el precio al cliente.
              </p>
            </div>
            <Toggle checked onChange={() => undefined} />
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Permitir dos o más clientes</p>
              <p className="admin-help">
                Útil para experiencias compartidas y clases.
              </p>
            </div>
            <Toggle
              checked={draft.type === "class"}
              onChange={() => undefined}
            />
          </div>
          <InfoBanner icon={<Sparkles className="h-5 w-5" />}>
            Los recursos necesarios se podrán vincular desde Administración &gt;
            Recursos.
          </InfoBanner>
        </div>
      )}
    </ModalShell>
  );
}

function CategoryDialog({
  open,
  category,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  category: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (category: string) => void;
}) {
  const [value, setValue] = useState(category ?? "");
  useEffect(() => {
    if (open) setValue(category ?? "");
  }, [category, open]);
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Editar categoría" : "Nueva categoría"}
      onSave={() => {
        if (!value.trim()) {
          toast.error("Escribe un nombre para la categoría.");
          return;
        }
        onSave(value.trim());
        onOpenChange(false);
      }}
    >
      <Field
        id="category-name"
        label="Nombre de la categoría"
        required
        value={value}
        onChange={setValue}
      />
    </ModalShell>
  );
}

function BulkPriceDialog({
  open,
  services,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  services: ServiceRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (prices: Record<string, number>) => void;
}) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open)
      setPrices(
        Object.fromEntries(
          services.map((service) => [service.id, String(service.price)]),
        ),
      );
  }, [open, services]);
  const changed = services.some(
    (service) => Number(prices[service.id]) !== service.price,
  );
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Carga masiva de precios"
      onSave={
        changed
          ? () => {
              onSave(
                Object.fromEntries(
                  Object.entries(prices).map(([id, price]) => [
                    id,
                    Number(price),
                  ]),
                ),
              );
              onOpenChange(false);
            }
          : undefined
      }
      saveLabel="Guardar cambios"
      wide
    >
      <Tabs
        items={[
          { id: "edit", label: "Editar precios" },
          { id: "upload", label: "Subir plantilla" },
        ]}
        active="edit"
        onChange={(value) => {
          if (value === "upload")
            toast.info(
              "La plantilla .xlsx se puede preparar desde esta vista local.",
            );
        }}
      />
      <div className="max-h-[48vh] overflow-auto rounded-2xl border border-[#eee7e2]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 bg-[#fbf9fd] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Servicio</span>
          <span>Categoría</span>
          <span>Nuevo precio</span>
        </div>
        {services
          .filter((service) => service.type === "service")
          .map((service) => (
            <div
              key={service.id}
              className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3 border-t border-[#eee7e2] px-4 py-3 text-sm"
            >
              <span className="font-medium">{service.name}</span>
              <span className="text-slate-500">{service.category}</span>
              <Input
                className="admin-input h-10"
                type="number"
                value={prices[service.id] ?? ""}
                onChange={(event) =>
                  setPrices((current) => ({
                    ...current,
                    [service.id]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Upload className="h-4 w-4" />
        También puedes subir una plantilla .xlsx desde la pestaña
        correspondiente.
      </div>
    </ModalShell>
  );
}

function ServicesSection({
  services,
  setServices,
  professionals,
}: {
  services: ServiceRecord[];
  setServices: (
    value: ServiceRecord[] | ((current: ServiceRecord[]) => ServiceRecord[]),
  ) => void;
  professionals: ProfessionalRecord[];
}) {
  const newServiceOptions: { value: ServiceRecord["type"]; label: string }[] = [
    { value: "service", label: "Servicio" },
    { value: "class", label: "Clase" },
    { value: "package", label: "Paquete" },
    { value: "add-on", label: "Adicional" },
  ];
  const [tab, setTab] = useState<ServiceRecord["type"]>("service");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([
    "Faciales",
    "Bienestar",
    "Mirada",
    "Clases",
    "Experiencias",
    "Adicionales",
  ]);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [serviceDialog, setServiceDialog] = useState(false);
  const [newType, setNewType] = useState<ServiceRecord["type"]>("service");
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirming, setConfirming] = useState<ServiceRecord | null>(null);
  const [confirmCategory, setConfirmCategory] = useState<string | null>(null);
  const tabLabel: Record<ServiceRecord["type"], string> = {
    service: "Servicios",
    class: "Clases",
    package: "Paquetes",
    "add-on": "Adicionales",
  };
  const visible = services.filter(
    (service) =>
      service.type === tab &&
      service.name
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase().trim()),
  );
  const grouped = categories
    .map((category) => ({
      category,
      items: visible.filter((service) => service.category === category),
    }))
    .filter((group) => group.items.length > 0 || tab !== "service");
  const save = (service: ServiceRecord) => {
    setServices((current) =>
      current.some((item) => item.id === service.id)
        ? current.map((item) => (item.id === service.id ? service : item))
        : [...current, service],
    );
    toast.success(editing ? "Elemento actualizado." : "Elemento creado.");
  };
  const deactivate = () => {
    if (!confirming) return;
    const next = confirming.status === "active" ? "inactive" : "active";
    setServices((current) =>
      current.map((item) =>
        item.id === confirming.id ? { ...item, status: next } : item,
      ),
    );
    setConfirming(null);
    toast.success(
      next === "active" ? "Elemento activado." : "Elemento desactivado.",
    );
  };
  const remove = () => {
    if (!confirming) return;
    const serviceId = confirming.id.replace("::delete", "");
    setServices((current) => current.filter((item) => item.id !== serviceId));
    setConfirming(null);
    toast.success("Elemento eliminado.");
  };
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Servicios"
        description="Construye tu catálogo de experiencias, clases, paquetes y servicios adicionales."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <ListFilter className="mr-2 h-4 w-4" />
              Precios
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="admin-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="admin-popover w-60 p-2">
                {(
                  [
                    ["service", "Servicio"],
                    ["class", "Clase"],
                    ["package", "Paquete"],
                    ["add-on", "Adicional"],
                  ] as unknown as {
                    value: ServiceRecord["type"];
                    label: string;
                  }[]
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#f0ebf6]"
                    onClick={() => {
                      setNewType(item.value);
                      setEditing(null);
                      setServiceDialog(true);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        }
      />
      <Tabs
        items={Object.entries(tabLabel).map(([id, label]) => ({ id, label }))}
        active={tab}
        onChange={(value) => setTab(value as ServiceRecord["type"])}
      />
      {tab === "service" ? (
        <InfoBanner icon={<Sparkles className="h-5 w-5" />}>
          <strong>Configura tu primer servicio.</strong> Agrega precio,
          duración, descripción e imágenes y organiza tu catálogo por
          categorías.
        </InfoBanner>
      ) : null}
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        placeholder={`Buscar ${tabLabel[tab].toLocaleLowerCase()}`}
        extra={
          <>
            <Button
              variant="link"
              className="h-10 text-[#7460a4]"
              onClick={() =>
                toast.info(
                  "La descarga del catálogo se preparará con los datos actuales.",
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setCategoryDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoría
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={`Sin ${tabLabel[tab].toLocaleLowerCase()}`}
            description={`Crea tu primer elemento para empezar a organizar ${tabLabel[tab].toLocaleLowerCase()}.`}
            action={
              <Button
                className="admin-primary"
                onClick={() => {
                  setNewType(tab);
                  setEditing(null);
                  setServiceDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo
              </Button>
            }
          />
        ) : (
          grouped.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="cursor-grab text-slate-300">⋮⋮</span>
                  <h2 className="admin-section-title">{group.category}</h2>
                  <Badge variant="outline">{group.items.length}</Badge>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Opciones de ${group.category}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="admin-popover w-48 p-1"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setEditingCategory(group.category);
                        setCategoryDialog(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar nombre
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-rose-600"
                      onClick={() => setConfirmCategory(group.category)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar categoría
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
              {group.items.length === 0 ? (
                <p className="admin-empty-small">
                  Sin {tabLabel[tab].toLocaleLowerCase()} en esta categoría.
                </p>
              ) : (
                <div className="space-y-2">
                  {group.items.map((service) => (
                    <Card key={service.id} className="admin-card">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="cursor-grab text-slate-300">⠿</span>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ebf6] text-[#7460a4]">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-[#263649]">
                                {service.name}
                              </h3>
                              {service.featured ? (
                                <Badge className="border-[#dfd2ee] bg-[#f3eef8] text-[#7460a4]">
                                  Destacado
                                </Badge>
                              ) : null}
                              <StatusBadge status={service.status} />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {service.duration} min · {currency(service.price)}
                              {service.type === "class"
                                ? ` · Capacidad ${service.capacity}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(service);
                              setNewType(service.type);
                              setServiceDialog(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label={`Opciones de ${service.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="admin-popover w-48 p-1"
                            >
                              <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => setConfirming(service)}
                              >
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                {service.status === "active"
                                  ? "Desactivar"
                                  : "Activar"}
                              </Button>
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-rose-600"
                                onClick={() =>
                                  setConfirming({
                                    ...service,
                                    id: `${service.id}::delete`,
                                  })
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <ServiceDialog
        open={serviceDialog}
        service={editing}
        serviceType={newType}
        professionals={professionals}
        categories={categories}
        onOpenChange={setServiceDialog}
        onSave={save}
      />
      <CategoryDialog
        open={categoryDialog}
        category={editingCategory}
        onOpenChange={setCategoryDialog}
        onSave={(category) => {
          if (editingCategory)
            setCategories((current) =>
              current.map((item) =>
                item === editingCategory ? category : item,
              ),
            );
          else setCategories((current) => [...current, category]);
          toast.success("Categoría guardada.");
        }}
      />
      <BulkPriceDialog
        open={bulkOpen}
        services={services}
        onOpenChange={setBulkOpen}
        onSave={(prices) => {
          setServices((current) =>
            current.map((service) =>
              prices[service.id] === undefined
                ? service
                : { ...service, price: prices[service.id] ?? service.price },
            ),
          );
          toast.success("Precios actualizados.");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmCategory)}
        onOpenChange={(open) => {
          if (!open) setConfirmCategory(null);
        }}
        title="¿Eliminar categoría?"
        description="Al eliminarla, sus elementos pasarán a la categoría General."
        confirmLabel="Eliminar categoría"
        onConfirm={() => {
          if (confirmCategory) {
            setCategories((current) =>
              current.filter((category) => category !== confirmCategory),
            );
            setServices((current) =>
              current.map((service) =>
                service.category === confirmCategory
                  ? { ...service, category: "General" }
                  : service,
              ),
            );
          }
          setConfirmCategory(null);
          toast.success("Categoría eliminada.");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={
          confirming?.id.includes("::delete")
            ? "¿Eliminar elemento?"
            : "Cambiar estado"
        }
        description={
          confirming?.id.includes("::delete")
            ? "Esta acción no se puede deshacer en el mock local."
            : "Puedes volver a activar este elemento desde las opciones."
        }
        confirmLabel={
          confirming?.id.includes("::delete")
            ? "Eliminar"
            : confirming?.status === "active"
              ? "Desactivar"
              : "Activar"
        }
        onConfirm={confirming?.id.includes("::delete") ? remove : deactivate}
      />
    </div>
  );
}

function CommissionDialog({
  open,
  record,
  onOpenChange,
  onSave,
  services,
}: {
  open: boolean;
  record: CommissionRecord | null;
  onOpenChange: (open: boolean) => void;
  onSave: (record: CommissionRecord) => void;
  services: ServiceRecord[];
}) {
  const [value, setValue] = useState("0");
  const [unit, setUnit] = useState<"$" | "%">("%");
  useEffect(() => {
    if (open) {
      setValue(String(record?.value ?? 10));
      setUnit(record?.unit ?? "%");
    }
  }, [open, record]);
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        record?.professionalId
          ? `Comisiones de ${record.name}`
          : "Comisión por defecto"
      }
      onSave={() => {
        onSave({
          ...(record ?? { id: makeId("commission"), name: "Por defecto" }),
          value: Number(value) || 0,
          unit,
        });
        onOpenChange(false);
      }}
      wide
    >
      <div className="space-y-5">
        {record?.professionalId ? (
          <InfoBanner icon={<WalletCards className="h-5 w-5" />}>
            Puedes definir una comisión específica para cada servicio de este
            profesional.
          </InfoBanner>
        ) : (
          <p className="text-sm text-slate-500">
            Al guardar, esta regla se aplicará como valor general para nuevos
            servicios.
          </p>
        )}
        <div className="admin-form-grid sm:grid-cols-[1fr_120px]">
          <Field
            id="commission-value"
            label="Comisión"
            value={value}
            onChange={setValue}
            type="number"
          />
          <SelectField
            id="commission-unit"
            label="Unidad"
            value={unit}
            onChange={(next) => setUnit(next as "$" | "%")}
            options={[
              { value: "%", label: "Porcentaje (%)" },
              { value: "$", label: "Monto ($)" },
            ]}
          />
        </div>
        {record?.professionalId ? (
          <div className="grid gap-2 md:grid-cols-2">
            {services
              .filter((service) => service.type === "service")
              .map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-2xl border border-[#eee7e2] p-3 text-sm"
                >
                  <span>{service.name}</span>
                  <span className="text-slate-400">
                    {value}
                    {unit}
                  </span>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function CommissionsSection({
  professionals,
  services,
}: {
  professionals: ProfessionalRecord[];
  services: ServiceRecord[];
}) {
  const [tab, setTab] = useState<"services" | "products">("services");
  const [records, setRecords] =
    useState<CommissionRecord[]>(initialCommissions);
  const [editing, setEditing] = useState<CommissionRecord | null>(null);
  const [search, setSearch] = useState("");
  const products = services.filter((service) => service.type === "add-on");
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Comisiones"
        description="Define reglas claras para repartir las comisiones de servicios y productos."
        action={
          <Button
            className="admin-primary"
            onClick={() =>
              setEditing({
                id: "default",
                name: "Por defecto",
                value: 10,
                unit: "%",
              })
            }
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar por defecto
          </Button>
        }
      />
      <Tabs
        items={[
          { id: "services", label: "Servicios" },
          { id: "products", label: "Productos" },
        ]}
        active={tab}
        onChange={(value) => setTab(value as "services" | "products")}
      />
      {tab === "services" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="admin-section-title">
                Comisiones por profesional
              </h2>
              <p className="admin-help">
                Personaliza el porcentaje o monto por cada miembro del equipo.
              </p>
            </div>
            <SelectField
              id="commission-view"
              label="Ver comisiones por"
              value="professional"
              onChange={() => undefined}
              options={[
                { value: "professional", label: "Profesional" },
                { value: "service", label: "Servicio" },
              ]}
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {records.map((record) => (
              <Card key={record.id} className="admin-card">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <h3 className="font-semibold text-[#263649]">
                      {record.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.serviceCount ?? 0} servicios configurados ·{" "}
                      {record.value}
                      {record.unit}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setEditing(record)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Buscar producto"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {products
              .filter((product) =>
                product.name
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((product) => (
                <Card key={product.id} className="admin-card">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <h3 className="font-semibold text-[#263649]">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Comisión por defecto · 10%
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setEditing({
                          id: product.id,
                          name: product.name,
                          value: 10,
                          unit: "%",
                        })
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </>
      )}
      <CommissionDialog
        open={Boolean(editing)}
        record={editing}
        services={services}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={(record) => {
          setRecords((current) =>
            current.some((item) => item.id === record.id)
              ? current.map((item) => (item.id === record.id ? record : item))
              : [...current, record],
          );
          toast.success("Comisión guardada.");
        }}
      />
    </div>
  );
}

function ScheduledResourceDialog({
  open,
  resource,
  locals,
  services,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  resource: ScheduledResourceRecord | null;
  locals: LocalRecord[];
  services: ServiceRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (resource: ScheduledResourceRecord) => void;
}) {
  const fresh = resource ?? {
    id: makeId("scheduled"),
    name: "",
    localId: locals[0]?.id ?? "",
    interval: 15,
    acceptsOnline: true,
    serviceIds: [],
    status: "active" as const,
    schedule: createSchedule(),
    specialDays: [],
  };
  const [draft, setDraft] = useState<ScheduledResourceRecord>(fresh);
  useEffect(() => {
    if (open)
      setDraft(
        resource
          ? cloneScheduledResource(resource)
          : {
              id: makeId("scheduled"),
              name: "",
              localId: locals[0]?.id ?? "",
              interval: 15,
              acceptsOnline: true,
              serviceIds: [],
              status: "active",
              schedule: createSchedule(),
              specialDays: [],
            },
      );
  }, [locals, open, resource]);
  const update = (patch: Partial<ScheduledResourceRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={resource ? `Editar ${resource.name}` : "Nuevo recurso con horario"}
      onSave={() => {
        if (!draft.name.trim() || !draft.localId) {
          toast.error("Completa el nombre y el local.");
          return;
        }
        onSave(draft);
        onOpenChange(false);
      }}
      wide
    >
      <div className="space-y-5">
        <div className="admin-form-grid">
          <Field
            id="scheduled-name"
            label="Nombre del recurso"
            required
            value={draft.name}
            onChange={(value) => update({ name: value })}
            placeholder="Ej. Cabina facial 3"
          />
          <SelectField
            id="scheduled-local"
            label="Local"
            value={draft.localId}
            onChange={(value) => update({ localId: value })}
            options={locals.map((local) => ({
              value: local.id,
              label: local.name,
            }))}
          />
          <SelectField
            id="scheduled-interval"
            label="Bloque de agenda"
            value={String(draft.interval)}
            onChange={(value) => update({ interval: Number(value) })}
            options={[15, 20, 30, 45, 60].map((value) => ({
              value: String(value),
              label: `${value} minutos`,
            }))}
          />
        </div>
        <div className="admin-setting-row">
          <div>
            <p className="font-medium">Acepta reservas en línea</p>
            <p className="admin-help">
              El recurso podrá asignarse desde el sitio de reservas.
            </p>
          </div>
          <Toggle
            checked={draft.acceptsOnline}
            onChange={(checked) => update({ acceptsOnline: checked })}
          />
        </div>
        <div>
          <h3 className="admin-section-title">Servicios vinculados</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {services
              .filter(
                (service) =>
                  service.type === "service" || service.type === "class",
              )
              .map((service) => (
                <CheckRow
                  key={service.id}
                  checked={draft.serviceIds.includes(service.id)}
                  onChange={(checked) =>
                    update({
                      serviceIds: checked
                        ? [...draft.serviceIds, service.id]
                        : draft.serviceIds.filter((id) => id !== service.id),
                    })
                  }
                >
                  {service.name}
                </CheckRow>
              ))}
          </div>
        </div>
        <div>
          <h3 className="admin-section-title">Horario semanal</h3>
          <div className="mt-3">
            <ScheduleRows
              schedule={draft.schedule}
              onChange={(schedule) => update({ schedule })}
            />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ResourceDialog({
  open,
  resource,
  locals,
  services,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  resource: ResourceRecord | null;
  locals: LocalRecord[];
  services: ServiceRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (resource: ResourceRecord) => void;
}) {
  const [draft, setDraft] = useState<ResourceRecord>(
    resource
      ? {
          ...resource,
          serviceIds: [...resource.serviceIds],
          localQuantities: { ...resource.localQuantities },
        }
      : {
          id: makeId("resource"),
          name: "",
          category: "Tecnología",
          serviceIds: [],
          localQuantities: {},
        },
  );
  useEffect(() => {
    if (open)
      setDraft(
        resource
          ? {
              ...resource,
              serviceIds: [...resource.serviceIds],
              localQuantities: { ...resource.localQuantities },
            }
          : {
              id: makeId("resource"),
              name: "",
              category: "Tecnología",
              serviceIds: [],
              localQuantities: {},
            },
      );
  }, [open, resource]);
  const update = (patch: Partial<ResourceRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={resource ? `Editar ${resource.name}` : "Nuevo recurso"}
      onSave={() => {
        if (!draft.name.trim()) {
          toast.error("Escribe un nombre para el recurso.");
          return;
        }
        onSave(draft);
        onOpenChange(false);
      }}
      wide
    >
      <div className="space-y-5">
        <div className="admin-form-grid">
          <Field
            id="resource-name"
            label="Nombre del recurso"
            required
            value={draft.name}
            onChange={(value) => update({ name: value })}
          />
          <Field
            id="resource-category"
            label="Categoría"
            value={draft.category}
            onChange={(value) => update({ category: value })}
          />
        </div>
        <div>
          <h3 className="admin-section-title">
            Servicios que utilizan este recurso
          </h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {services
              .filter((service) => service.type !== "add-on")
              .map((service) => (
                <CheckRow
                  key={service.id}
                  checked={draft.serviceIds.includes(service.id)}
                  onChange={(checked) =>
                    update({
                      serviceIds: checked
                        ? [...draft.serviceIds, service.id]
                        : draft.serviceIds.filter((id) => id !== service.id),
                    })
                  }
                >
                  {service.name}
                </CheckRow>
              ))}
          </div>
        </div>
        <div>
          <h3 className="admin-section-title">Disponibilidad por local</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {locals.map((local) => (
              <div
                key={local.id}
                className="flex items-center justify-between rounded-2xl border border-[#eee7e2] p-3"
              >
                <span className="text-sm">{local.name}</span>
                <Input
                  className="admin-input h-10 w-24"
                  type="number"
                  min="0"
                  value={draft.localQuantities[local.id] ?? 0}
                  onChange={(event) =>
                    update({
                      localQuantities: {
                        ...draft.localQuantities,
                        [local.id]: Number(event.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ResourcesSection({
  locals,
  services,
}: {
  locals: LocalRecord[];
  services: ServiceRecord[];
}) {
  const [tab, setTab] = useState<"scheduled" | "resources">("scheduled");
  const [scheduled, setScheduled] = useState<ScheduledResourceRecord[]>(
    initialScheduledResources,
  );
  const [resources, setResources] =
    useState<ResourceRecord[]>(initialResources);
  const [scheduledEditing, setScheduledEditing] =
    useState<ScheduledResourceRecord | null>(null);
  const [resourceEditing, setResourceEditing] = useState<ResourceRecord | null>(
    null,
  );
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<
    ScheduledResourceRecord | ResourceRecord | null
  >(null);
  const filteredScheduled = scheduled.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  );
  const filteredResources = resources.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  );
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Recursos"
        description="Controla cabinas, equipos y recursos necesarios para que la agenda funcione."
        action={
          <Button
            className="admin-primary"
            onClick={() => {
              if (tab === "scheduled") {
                setScheduledEditing(null);
                setScheduledOpen(true);
              } else {
                setResourceEditing(null);
                setResourceOpen(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {tab === "scheduled"
              ? "Nuevo recurso con horario"
              : "Nuevo recurso"}
          </Button>
        }
      />
      <Tabs
        items={[
          { id: "scheduled", label: "Recursos con horario" },
          { id: "resources", label: "Recursos" },
        ]}
        active={tab}
        onChange={(value) => setTab(value as "scheduled" | "resources")}
      />
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar recurso"
      />
      {tab === "scheduled" ? (
        filteredScheduled.length === 0 ? (
          <EmptyState
            icon={<SlidersHorizontal className="h-6 w-6" />}
            title="Sin recursos con horario"
            description="Crea cabinas o espacios para asignarlos a la agenda."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredScheduled.map((resource) => (
              <Card className="admin-card" key={resource.id}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0ebf6] text-[#7460a4]">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#263649]">
                          {resource.name}
                        </h3>
                        <StatusBadge status={resource.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          locals.find((local) => local.id === resource.localId)
                            ?.name
                        }{" "}
                        · bloques de {resource.interval} min
                      </p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-[#7460a4]"
                        onClick={() =>
                          toast.info(
                            `${resource.name}: horario semanal listo para editar.`,
                          )
                        }
                      >
                        Horario
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScheduledEditing(resource);
                        setScheduledOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setConfirming(resource)}
                      aria-label={`Cambiar estado de ${resource.name}`}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : filteredResources.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="h-6 w-6" />}
          title="Todavía no hay recursos"
          description="Crea equipos o materiales para vincularlos a tus servicios."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredResources.map((resource) => (
            <Card className="admin-card" key={resource.id}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0ebf6] text-[#7460a4]">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#263649]">
                      {resource.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {resource.category} · {resource.serviceIds.length}{" "}
                      servicios vinculados
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResourceEditing(resource);
                      setResourceOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConfirming(resource)}
                    aria-label={`Eliminar ${resource.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ScheduledResourceDialog
        open={scheduledOpen}
        resource={scheduledEditing}
        locals={locals}
        services={services}
        onOpenChange={setScheduledOpen}
        onSave={(resource) => {
          setScheduled((current) =>
            current.some((item) => item.id === resource.id)
              ? current.map((item) =>
                  item.id === resource.id ? resource : item,
                )
              : [...current, resource],
          );
          toast.success("Recurso con horario guardado.");
        }}
      />
      <ResourceDialog
        open={resourceOpen}
        resource={resourceEditing}
        locals={locals}
        services={services}
        onOpenChange={setResourceOpen}
        onSave={(resource) => {
          setResources((current) =>
            current.some((item) => item.id === resource.id)
              ? current.map((item) =>
                  item.id === resource.id ? resource : item,
                )
              : [...current, resource],
          );
          toast.success("Recurso guardado.");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Confirmar acción"
        description="El cambio se aplicará a este recurso y puede revertirse desde la misma vista."
        confirmLabel="Confirmar"
        onConfirm={() => {
          if (!confirming) return;
          if ("status" in confirming) {
            setScheduled((current) =>
              current.map((item) =>
                item.id === confirming.id
                  ? {
                      ...item,
                      status: item.status === "active" ? "inactive" : "active",
                    }
                  : item,
              ),
            );
            toast.success("Estado actualizado.");
          } else {
            setResources((current) =>
              current.filter((item) => item.id !== confirming.id),
            );
            toast.success("Recurso eliminado.");
          }
          setConfirming(null);
        }}
      />
    </div>
  );
}

function SurveyQuestionDialog({
  open,
  question,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  question: SurveyQuestion | null;
  onOpenChange: (open: boolean) => void;
  onSave: (question: SurveyQuestion) => void;
}) {
  const [draft, setDraft] = useState<SurveyQuestion>(
    question
      ? { ...question }
      : {
          id: makeId("question"),
          category: surveyCategories[0] ?? "Precio",
          type: "rating",
          text: "",
          description: "",
        },
  );
  useEffect(() => {
    if (open)
      setDraft(
        question
          ? { ...question }
          : {
              id: makeId("question"),
              category: surveyCategories[0] ?? "Precio",
              type: "rating",
              text: "",
              description: "",
            },
      );
  }, [open, question]);
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={question ? "Editar pregunta" : "Nueva pregunta"}
      onSave={() => {
        if (!draft.text.trim()) {
          toast.error("Escribe la pregunta.");
          return;
        }
        onSave(draft);
        onOpenChange(false);
      }}
    >
      <div className="space-y-4">
        <SelectField
          id="question-type"
          label="Tipo de pregunta"
          value={draft.type}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              type: value as SurveyQuestion["type"],
            }))
          }
          options={[
            { value: "rating", label: "Apreciación con estrellas" },
            { value: "comment", label: "Comentario abierto" },
          ]}
        />
        <SelectField
          id="question-category"
          label="Categoría"
          value={draft.category}
          onChange={(category) =>
            setDraft((current) => ({ ...current, category }))
          }
          options={surveyCategories.map((category) => ({
            value: category,
            label: category,
          }))}
        />
        <div>
          <label htmlFor="question-text" className="admin-label">
            Pregunta
          </label>
          <Textarea
            id="question-text"
            rows={3}
            value={draft.text}
            onChange={(event) =>
              setDraft((current) => ({ ...current, text: event.target.value }))
            }
            className="admin-textarea"
          />
        </div>
        <div>
          <label htmlFor="question-description" className="admin-label">
            Descripción
          </label>
          <Input
            id="question-description"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="admin-input"
          />
        </div>
      </div>
    </ModalShell>
  );
}

function SurveyDialog({
  open,
  survey,
  services,
  questions,
  onOpenChange,
  onSave,
  onNewQuestion,
}: {
  open: boolean;
  survey: SurveyRecord | null;
  services: ServiceRecord[];
  questions: SurveyQuestion[];
  onOpenChange: (open: boolean) => void;
  onSave: (survey: SurveyRecord) => void;
  onNewQuestion: () => void;
}) {
  const [draft, setDraft] = useState<SurveyRecord>(
    survey
      ? {
          ...survey,
          serviceIds: [...survey.serviceIds],
          questionIds: [...survey.questionIds],
        }
      : {
          id: makeId("survey"),
          name: "",
          serviceIds: [],
          questionIds: [],
          updatedAt: "Ahora",
        },
  );
  useEffect(() => {
    if (open)
      setDraft(
        survey
          ? {
              ...survey,
              serviceIds: [...survey.serviceIds],
              questionIds: [...survey.questionIds],
            }
          : {
              id: makeId("survey"),
              name: "",
              serviceIds: [],
              questionIds: [],
              updatedAt: "Ahora",
            },
      );
  }, [open, survey]);
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={survey ? `Editar ${survey.name}` : "Nueva encuesta"}
      onSave={() => {
        if (!draft.name.trim()) {
          toast.error("Escribe un nombre para la encuesta.");
          return;
        }
        onSave(draft);
        onOpenChange(false);
      }}
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Field
            id="survey-name"
            label="Nombre de la encuesta"
            required
            value={draft.name}
            onChange={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Ej. Experiencia después de tu visita"
          />
          <div>
            <h3 className="admin-section-title">Seleccione los servicios</h3>
            <div className="mt-2 grid gap-1">
              {services
                .filter((service) => service.type === "service")
                .map((service) => (
                  <CheckRow
                    key={service.id}
                    checked={draft.serviceIds.includes(service.id)}
                    onChange={(checked) =>
                      setDraft((current) => ({
                        ...current,
                        serviceIds: checked
                          ? [...current.serviceIds, service.id]
                          : current.serviceIds.filter(
                              (id) => id !== service.id,
                            ),
                      }))
                    }
                  >
                    {service.name}
                  </CheckRow>
                ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="admin-section-title">Seleccione las preguntas</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNewQuestion}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva pregunta
              </Button>
            </div>
            <div className="space-y-2">
              {surveyCategories.map((category) => {
                const categoryQuestions = questions.filter(
                  (question) => question.category === category,
                );
                return (
                  <details
                    key={category}
                    open={categoryQuestions.some((question) =>
                      draft.questionIds.includes(question.id),
                    )}
                    className="rounded-2xl border border-[#eee7e2] px-3"
                  >
                    <summary className="cursor-pointer list-none py-3 text-sm font-medium text-[#263649]">
                      <ChevronRight className="mr-2 inline h-4 w-4" />
                      {category}{" "}
                      <span className="ml-1 text-xs text-slate-400">
                        ({categoryQuestions.length})
                      </span>
                    </summary>
                    <div className="pb-2">
                      {categoryQuestions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400">
                          Sin preguntas todavía.
                        </p>
                      ) : (
                        categoryQuestions.map((question) => (
                          <CheckRow
                            key={question.id}
                            checked={draft.questionIds.includes(question.id)}
                            onChange={(checked) =>
                              setDraft((current) => ({
                                ...current,
                                questionIds: checked
                                  ? [...current.questionIds, question.id]
                                  : current.questionIds.filter(
                                      (id) => id !== question.id,
                                    ),
                              }))
                            }
                          >
                            {question.text}
                          </CheckRow>
                        ))
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-[#e8dfd5] bg-[#fffdfb] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7460a4]">
            Vista previa
          </p>
          <h3 className="mt-4 text-xl font-semibold text-[#263649]">
            Keysar Cosmetics
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {services.find((service) => service.id === draft.serviceIds[0])
              ?.name ?? "Tu servicio"}
          </p>
          <div className="mt-5 space-y-4">
            {questions
              .filter((question) => draft.questionIds.includes(question.id))
              .map((question, index) => (
                <div key={question.id} className="rounded-2xl bg-[#f8f4fb] p-3">
                  <p className="text-sm font-medium text-[#263649]">
                    {index + 1}. {question.text}
                  </p>
                  <p className="mt-2 text-lg tracking-[0.2em] text-[#c3a583]">
                    {question.type === "rating" ? "☆ ☆ ☆ ☆ ☆" : "··········"}
                  </p>
                </div>
              ))}
            {draft.questionIds.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-slate-400">
                Selecciona preguntas para ver el preview.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function SurveysSection({ services }: { services: ServiceRecord[] }) {
  const [surveys, setSurveys] = useState<SurveyRecord[]>(initialSurveys);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initialSurveyQuestions,
  );
  const [editing, setEditing] = useState<SurveyRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionEditing, setQuestionEditing] = useState<SurveyQuestion | null>(
    null,
  );
  const [confirming, setConfirming] = useState<SurveyRecord | null>(null);
  const [search, setSearch] = useState("");
  const visible = surveys.filter((survey) =>
    survey.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  );
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Encuestas"
        description="Crea encuestas sencillas para conocer la experiencia de tus clientes."
        action={
          <Button
            className="admin-primary"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva encuesta
          </Button>
        }
      />
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar encuesta"
        count={`${visible.length} encuestas`}
      />
      {visible.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Todavía no hay encuestas"
          description="Crea una encuesta post-servicio y selecciona las preguntas que quieres hacer."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((survey) => (
            <Card className="admin-card" key={survey.id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <h3 className="font-semibold text-[#263649]">
                    {survey.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {survey.questionIds.length} preguntas · {survey.updatedAt}
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[#7460a4]"
                    onClick={() => {
                      setEditing(survey);
                      setDialogOpen(true);
                    }}
                  >
                    Ver encuesta
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(survey);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConfirming(survey)}
                    aria-label={`Eliminar ${survey.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <SurveyDialog
        open={dialogOpen}
        survey={editing}
        services={services}
        questions={questions}
        onOpenChange={setDialogOpen}
        onNewQuestion={() => {
          setQuestionEditing(null);
          setQuestionOpen(true);
        }}
        onSave={(survey) => {
          setSurveys((current) =>
            current.some((item) => item.id === survey.id)
              ? current.map((item) =>
                  item.id === survey.id
                    ? { ...survey, updatedAt: "Ahora" }
                    : item,
                )
              : [...current, { ...survey, updatedAt: "Ahora" }],
          );
          toast.success("Encuesta guardada.");
        }}
      />
      <SurveyQuestionDialog
        open={questionOpen}
        question={questionEditing}
        onOpenChange={setQuestionOpen}
        onSave={(question) => {
          setQuestions((current) =>
            current.some((item) => item.id === question.id)
              ? current.map((item) =>
                  item.id === question.id ? question : item,
                )
              : [...current, question],
          );
          toast.success("Pregunta guardada.");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="¿Eliminar encuesta?"
        description="Se eliminará esta configuración del mock local."
        confirmLabel="Eliminar encuesta"
        onConfirm={() => {
          if (confirming)
            setSurveys((current) =>
              current.filter((survey) => survey.id !== confirming.id),
            );
          setConfirming(null);
          toast.success("Encuesta eliminada.");
        }}
      />
    </div>
  );
}

function ConsentDialog({
  open,
  consent,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  consent: ConsentRecord | null;
  onOpenChange: (open: boolean) => void;
  onSave: (consent: ConsentRecord) => void;
}) {
  const [draft, setDraft] = useState<ConsentRecord>(
    consent
      ? { ...consent }
      : {
          id: makeId("consent"),
          name: "",
          description: "",
          fileName: null,
          updatedAt: "Ahora",
          status: "draft",
        },
  );
  useEffect(() => {
    if (open)
      setDraft(
        consent
          ? { ...consent }
          : {
              id: makeId("consent"),
              name: "",
              description: "",
              fileName: null,
              updatedAt: "Ahora",
              status: "draft",
            },
      );
  }, [consent, open]);
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={consent ? `Editar ${consent.name}` : "Nuevo consentimiento"}
      onSave={() => {
        if (!draft.name.trim() || !draft.description.trim()) {
          toast.error("Completa el nombre y la descripción.");
          return;
        }
        onSave({ ...draft, name: draft.name.trim(), updatedAt: "Ahora" });
        onOpenChange(false);
      }}
    >
      <div className="space-y-5">
        <Field
          id="consent-name"
          label="Nombre"
          required
          value={draft.name}
          onChange={(name) => setDraft((current) => ({ ...current, name }))}
          placeholder="Ej. Consentimiento facial"
        />
        <div>
          <label htmlFor="consent-description" className="admin-label">
            Descripción
          </label>
          <Textarea
            id="consent-description"
            rows={5}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="admin-textarea"
          />
        </div>
        <FilePicker
          label="Documento del consentimiento"
          recommendation="PDF o documento, máximo 5 MB."
          maxSizeMb={5}
          value={draft.fileName}
          accept="application/pdf,.doc,.docx"
          onChange={(fileName) =>
            setDraft((current) => ({ ...current, fileName }))
          }
        />
      </div>
    </ModalShell>
  );
}

function ConsentsSection() {
  const [consents, setConsents] = useState<ConsentRecord[]>(initialConsents);
  const [editing, setEditing] = useState<ConsentRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<ConsentRecord | null>(null);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Consentimientos"
        description="Administra documentos que tus clientes deben conocer antes de un servicio."
        action={
          <Button
            className="admin-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo consentimiento
          </Button>
        }
      />
      <InfoBanner icon={<FileText className="h-5 w-5" />}>
        Esta primera versión administra documentos y contenido. El flujo de
        firma y resultados se podrá conectar cuando definamos el proceso
        operativo.
      </InfoBanner>
      {consents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Sin consentimientos"
          description="Crea tu primer documento para tenerlo listo antes de una cita."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {consents.map((consent) => (
            <Card className="admin-card" key={consent.id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0ebf6] text-[#7460a4]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#263649]">
                        {consent.name}
                      </h3>
                      <StatusBadge status={consent.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {consent.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {consent.fileName ?? "Sin archivo adjunto"} ·{" "}
                      {consent.updatedAt}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(consent);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConfirming(consent)}
                    aria-label={`Eliminar ${consent.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ConsentDialog
        open={open}
        consent={editing}
        onOpenChange={setOpen}
        onSave={(consent) => {
          setConsents((current) =>
            current.some((item) => item.id === consent.id)
              ? current.map((item) => (item.id === consent.id ? consent : item))
              : [...current, consent],
          );
          toast.success("Consentimiento guardado.");
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(value) => {
          if (!value) setConfirming(null);
        }}
        title="¿Eliminar consentimiento?"
        description="El documento se quitará del catálogo local."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (confirming)
            setConsents((current) =>
              current.filter((item) => item.id !== confirming.id),
            );
          setConfirming(null);
          toast.success("Consentimiento eliminado.");
        }}
      />
    </div>
  );
}

const messageTokens = [
  "{{nombre_cliente}}",
  "{{apellido_cliente}}",
  "{{profesional}}",
  "{{nombre_servicio}}",
  "{{precio_reserva}}",
  "{{fecha_hora_reserva}}",
  "{{nombre_local}}",
  "{{ubicacion_local}}",
  "{{telefono_local}}",
  "{{link_pago}}",
];
const messageTemplates = [
  {
    name: "Confirmación de reserva",
    message:
      "Hola {{nombre_cliente}}, confirmamos tu cita de {{nombre_servicio}} el {{fecha_hora_reserva}}.",
  },
  {
    name: "Recordatorio amable",
    message:
      "Hola {{nombre_cliente}}, te esperamos mañana en {{nombre_local}}. Si necesitas ayuda, responde este mensaje.",
  },
  {
    name: "Bienvenida",
    message: "Hola {{nombre_cliente}}, bienvenida a Keysar Cosmetics.",
  },
];

function WhatsAppDialog({
  open,
  message,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  message: WhatsAppMessageRecord | null;
  onOpenChange: (open: boolean) => void;
  onSave: (message: WhatsAppMessageRecord) => void;
}) {
  const [draft, setDraft] = useState<WhatsAppMessageRecord>(
    message
      ? { ...message }
      : {
          id: makeId("whatsapp"),
          name: "",
          message: "",
          status: "active",
          updatedAt: "Ahora",
        },
  );
  useEffect(() => {
    if (open)
      setDraft(
        message
          ? { ...message }
          : {
              id: makeId("whatsapp"),
              name: "",
              message: "",
              status: "active",
              updatedAt: "Ahora",
            },
      );
  }, [message, open]);
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={message ? `Editar ${message.name}` : "Nuevo mensaje personalizado"}
      onSave={() => {
        if (!draft.name.trim() || !draft.message.trim()) {
          toast.error("Completa el nombre y el mensaje.");
          return;
        }
        onSave({ ...draft, name: draft.name.trim(), updatedAt: "Ahora" });
        onOpenChange(false);
      }}
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Field
            id="whatsapp-name"
            label="Nombre del mensaje"
            required
            value={draft.name}
            onChange={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Ej. Recordatorio de cita"
          />
          <div>
            <label htmlFor="whatsapp-message" className="admin-label">
              Personaliza el mensaje
            </label>
            <Textarea
              id="whatsapp-message"
              rows={10}
              value={draft.message}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              className="admin-textarea"
              placeholder="Escribe el mensaje que recibirá tu cliente."
            />
          </div>
          <div>
            <p className="admin-label">Insertar datos</p>
            <div className="flex flex-wrap gap-2">
              {messageTokens.map((token) => (
                <button
                  type="button"
                  key={token}
                  className="rounded-full border border-[#e5dcef] bg-[#fbf9fd] px-3 py-1.5 text-xs text-[#7460a4] hover:bg-[#f0ebf6]"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      message: `${current.message}${current.message ? " " : ""}${token}`,
                    }))
                  }
                >
                  {token.replace(/[{}]/g, "")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[28px] bg-[#e8ded7] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Vista previa
          </p>
          <div className="mx-auto max-w-sm rounded-[28px] bg-[#f5f1eb] p-3 shadow-inner">
            <div className="rounded-t-2xl bg-[#6b8e7b] px-4 py-3 text-sm font-semibold text-white">
              Keysar Cosmetics
            </div>
            <div className="min-h-56 rounded-b-2xl bg-[#efe7dc] p-3">
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm">
                {draft.message || "Tu mensaje aparecerá aquí."}
              </div>
            </div>
          </div>
          <Button
            variant="link"
            className="mt-3 text-[#7460a4]"
            onClick={() =>
              toast.info(
                "El envío de prueba quedará listo al conectar WhatsApp.",
              )
            }
          >
            <Mail className="mr-2 h-4 w-4" />
            Enviar mensaje de prueba
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: { name: string; message: string }) => void;
}) {
  const [selected, setSelected] = useState(0);
  const template = messageTemplates[selected] ??
    messageTemplates[0] ?? { name: "Plantilla", message: "" };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Plantillas prediseñadas"
    >
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-2">
          {messageTemplates.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={`w-full rounded-2xl border p-3 text-left text-sm ${selected === index ? "border-[#b7a1ce] bg-[#f4eff8]" : "border-[#eee7e2]"}`}
              onClick={() => setSelected(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="rounded-[28px] bg-[#e8ded7] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Vista previa
          </p>
          <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
            {template.message}
          </div>
          <Button
            className="admin-primary mt-4"
            onClick={() => {
              onSelect(template);
              onOpenChange(false);
            }}
          >
            Seleccionar y editar
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function WhatsAppSection() {
  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>(
    initialWhatsAppMessages,
  );
  const [editing, setEditing] = useState<WhatsAppMessageRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [confirming, setConfirming] = useState<WhatsAppMessageRecord | null>(
    null,
  );
  return (
    <div className="space-y-6">
      <SectionHeader
        title="WhatsApp"
        description="Prepara mensajes personalizados y reutilizables para acompañar cada reserva."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Probar plantillas
            </Button>
            <Button
              className="admin-primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo mensaje
            </Button>
          </div>
        }
      />
      <InfoBanner icon={<MessageCircle className="h-5 w-5" />}>
        Ahora podrás enviar mensajes personalizados por WhatsApp. Configúralos
        aquí y envíalos desde la Agenda cuando el canal esté conectado.
      </InfoBanner>
      <div className="grid gap-3 lg:grid-cols-2">
        {messages.map((message) => (
          <Card className="admin-card" key={message.id}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[#263649]">
                    {message.name}
                  </h3>
                  <StatusBadge status={message.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {message.message}
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-[#7460a4]"
                  onClick={() => {
                    setEditing(message);
                    setOpen(true);
                  }}
                >
                  Ver mensaje
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(message);
                    setOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setConfirming(message)}
                  aria-label={`Eliminar ${message.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <WhatsAppDialog
        open={open}
        message={editing}
        onOpenChange={setOpen}
        onSave={(message) => {
          setMessages((current) =>
            current.some((item) => item.id === message.id)
              ? current.map((item) => (item.id === message.id ? message : item))
              : [...current, message],
          );
          toast.success("Mensaje guardado.");
        }}
      />
      <TemplateDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelect={(template) => {
          setEditing({
            id: makeId("whatsapp"),
            name: template.name,
            message: template.message,
            status: "active",
            updatedAt: "Ahora",
          });
          setOpen(true);
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(value) => {
          if (!value) setConfirming(null);
        }}
        title="¿Eliminar mensaje?"
        description="La plantilla se quitará del catálogo local."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (confirming)
            setMessages((current) =>
              current.filter((item) => item.id !== confirming.id),
            );
          setConfirming(null);
          toast.success("Mensaje eliminado.");
        }}
      />
    </div>
  );
}

function GiftCardDialog({
  open,
  giftCard,
  services,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  giftCard: GiftCardRecord | null;
  services: ServiceRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (giftCard: GiftCardRecord) => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<GiftCardRecord>(
    giftCard
      ? { ...giftCard, serviceIds: [...giftCard.serviceIds] }
      : {
          id: makeId("gift"),
          name: "",
          type: "service",
          serviceIds: [],
          amount: 0,
          salePrice: 0,
          expiration: 90,
          description: "",
          design: "arena",
          status: "draft",
        },
  );
  useEffect(() => {
    if (open) {
      setDraft(
        giftCard
          ? { ...giftCard, serviceIds: [...giftCard.serviceIds] }
          : {
              id: makeId("gift"),
              name: "",
              type: "service",
              serviceIds: [],
              amount: 0,
              salePrice: 0,
              expiration: 90,
              description: "",
              design: "arena",
              status: "draft",
            },
      );
      setStep(1);
    }
  }, [giftCard, open]);
  const update = (patch: Partial<GiftCardRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const save = (status: GiftCardRecord["status"]) => {
    if (
      !draft.name.trim() ||
      draft.salePrice <= 0 ||
      (draft.type === "service" && draft.serviceIds.length === 0)
    ) {
      toast.error(
        "Completa nombre, precio y al menos un servicio si corresponde.",
      );
      return;
    }
    onSave({ ...draft, status });
    onOpenChange(false);
  };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        giftCard
          ? `Editar ${giftCard.name}`
          : `Nueva gift card de ${draft.type === "service" ? "servicio" : "monto"}`
      }
      onSave={step === 2 ? () => save("active") : undefined}
      saveLabel="Activar"
      wide
    >
      <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span className={step === 1 ? "text-[#7460a4]" : ""}>
          1. Información
        </span>
        <span>→</span>
        <span className={step === 2 ? "text-[#7460a4]" : ""}>
          2. Diseño y publicación
        </span>
      </div>
      {step === 1 ? (
        <div className="space-y-5">
          <div className="admin-form-grid">
            <Field
              id="gift-name"
              label="Nombre de la gift card"
              required
              value={draft.name}
              onChange={(name) => update({ name })}
              placeholder="Ej. Ritual de bienestar"
            />
            <SelectField
              id="gift-type"
              label="Tipo"
              value={draft.type}
              onChange={(type) =>
                update({ type: type as GiftCardRecord["type"], serviceIds: [] })
              }
              options={[
                { value: "service", label: "Gift card de servicio" },
                { value: "amount", label: "Gift card de monto" },
              ]}
            />
            <Field
              id="gift-sale-price"
              label="Precio de venta"
              required
              value={String(draft.salePrice)}
              onChange={(value) =>
                update({
                  salePrice: Number(value) || 0,
                  amount:
                    draft.type === "amount" ? Number(value) || 0 : draft.amount,
                })
              }
              type="number"
            />
            <Field
              id="gift-expiration"
              label="Vigencia en días"
              value={String(draft.expiration)}
              onChange={(value) => update({ expiration: Number(value) || 1 })}
              type="number"
            />
          </div>
          {draft.type === "service" ? (
            <div>
              <h3 className="admin-section-title">Servicios incluidos</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {services
                  .filter((service) => service.type === "service")
                  .map((service) => (
                    <CheckRow
                      key={service.id}
                      checked={draft.serviceIds.includes(service.id)}
                      onChange={(checked) =>
                        update({
                          serviceIds: checked
                            ? [...draft.serviceIds, service.id]
                            : draft.serviceIds.filter(
                                (id) => id !== service.id,
                              ),
                          amount: checked ? service.price : draft.amount,
                        })
                      }
                    >
                      {service.name}{" "}
                      <span className="ml-2 text-xs text-slate-400">
                        {currency(service.price)}
                      </span>
                    </CheckRow>
                  ))}
              </div>
            </div>
          ) : null}
          <div>
            <label htmlFor="gift-description" className="admin-label">
              Descripción
            </label>
            <Textarea
              id="gift-description"
              rows={4}
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
              className="admin-textarea"
            />
          </div>
          <Button
            type="button"
            className="admin-primary"
            onClick={() => setStep(2)}
          >
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-[#e8dfd5] bg-[#fffaf5] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7460a4]">
              Diseño de la gift card
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {["arena", "lavanda", "salvia"].map((design) => (
                <button
                  type="button"
                  key={design}
                  className={`h-28 rounded-2xl border-2 ${draft.design === design ? "border-[#7460a4]" : "border-transparent"} ${design === "arena" ? "bg-[#d7b28c]" : design === "lavanda" ? "bg-[#c9bedb]" : "bg-[#a9c1af]"}`}
                  onClick={() => update({ design })}
                >
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs capitalize text-slate-700">
                    {design}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <FilePicker
            label="Cargar diseño propio"
            recommendation="JPG o PNG, recomendado 800 × 500 px, máximo 3 MB."
            value={null}
            onChange={() => toast.success("Diseño cargado en el mock local.")}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => save("draft")}
            >
              Guardar como borrador
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function GiftCardsSection({ services }: { services: ServiceRecord[] }) {
  const [cards, setCards] = useState<GiftCardRecord[]>(initialGiftCards);
  const [filter, setFilter] = useState<GiftCardRecord["status"] | "all">("all");
  const [type, setType] = useState<GiftCardRecord["type"] | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<GiftCardRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<GiftCardRecord | null>(null);
  const visible = cards.filter(
    (card) =>
      (filter === "all" || card.status === filter) &&
      (type === "all" || card.type === type) &&
      card.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  );
  const copyCatalog = () => {
    void navigator.clipboard?.writeText(
      "https://reservas.keysarcosmetics.com/gift-cards",
    );
    toast.success("Link del catálogo copiado.");
  };
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gift cards"
        description="Crea un catálogo de regalos que tus clientes puedan compartir y comprar."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyCatalog}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="admin-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva gift card
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="admin-popover w-60 p-2">
                <button
                  type="button"
                  className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#f0ebf6]"
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  Gift card de servicio
                </button>
                <button
                  type="button"
                  className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#f0ebf6]"
                  onClick={() => {
                    setEditing({
                      id: makeId("gift"),
                      name: "",
                      type: "amount",
                      serviceIds: [],
                      amount: 0,
                      salePrice: 0,
                      expiration: 90,
                      description: "",
                      design: "arena",
                      status: "draft",
                    });
                    setOpen(true);
                  }}
                >
                  Gift card de monto
                </button>
              </PopoverContent>
            </Popover>
          </div>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <SelectField
            id="gift-status-filter"
            label="Estado"
            value={filter}
            onChange={(value) =>
              setFilter(value as GiftCardRecord["status"] | "all")
            }
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activas" },
              { value: "draft", label: "Borradores" },
              { value: "inactive", label: "Inactivas" },
            ]}
          />
          <SelectField
            id="gift-type-filter"
            label="Tipo"
            value={type}
            onChange={(value) =>
              setType(value as GiftCardRecord["type"] | "all")
            }
            options={[
              { value: "all", label: "Todos" },
              { value: "service", label: "Servicio" },
              { value: "amount", label: "Monto" },
            ]}
          />
          <div className="relative sm:w-64">
            <label htmlFor="gift-search" className="admin-label">
              Buscar
            </label>
            <Search className="pointer-events-none absolute left-3 top-10 h-4 w-4 text-slate-400" />
            <Input
              id="gift-search"
              className="admin-input pl-9"
              placeholder="Buscar gift card"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <span className="text-sm text-slate-400">
          {visible.length} resultados
        </span>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          icon={<WalletCards className="h-6 w-6" />}
          title="Sin gift cards"
          description="Crea una gift card de servicio o de monto para empezar."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((card) => (
            <Card key={card.id} className="admin-card overflow-hidden">
              <div
                className={`h-28 ${card.design === "arena" ? "bg-[#d7b28c]" : card.design === "lavanda" ? "bg-[#c9bedb]" : "bg-[#a9c1af]"} p-5`}
              >
                <div className="flex h-full items-end justify-between">
                  <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Keysar gift
                  </span>
                  <StatusBadge status={card.status} />
                </div>
              </div>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <h3 className="font-semibold text-[#263649]">{card.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {card.type === "service"
                      ? `${card.serviceIds.length} servicio(s)`
                      : `Monto de ${currency(card.amount)}`}{" "}
                    · venta {currency(card.salePrice)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Vigencia: {card.expiration} días
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Opciones de ${card.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="admin-popover w-48 p-1"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setEditing(card);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        void navigator.clipboard?.writeText(
                          `https://reservas.keysarcosmetics.com/gift-cards/${card.id}`,
                        );
                        toast.success("Enlace copiado.");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar enlace
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setConfirming(card)}
                    >
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      {card.status === "active" ? "Desactivar" : "Activar"}
                    </Button>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <GiftCardDialog
        open={open}
        giftCard={editing}
        services={services}
        onOpenChange={setOpen}
        onSave={(card) => {
          setCards((current) =>
            current.some((item) => item.id === card.id)
              ? current.map((item) => (item.id === card.id ? card : item))
              : [...current, card],
          );
          toast.success(
            card.status === "active"
              ? "Gift card activada."
              : "Gift card guardada como borrador.",
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(value) => {
          if (!value) setConfirming(null);
        }}
        title="Cambiar estado de gift card"
        description="Puedes volver a activarla desde el mismo menú."
        confirmLabel={
          confirming?.status === "active" ? "Desactivar" : "Activar"
        }
        onConfirm={() => {
          if (!confirming) return;
          setCards((current) =>
            current.map((card) =>
              card.id === confirming.id
                ? {
                    ...card,
                    status: card.status === "active" ? "inactive" : "active",
                  }
                : card,
            ),
          );
          setConfirming(null);
          toast.success("Estado actualizado.");
        }}
      />
    </div>
  );
}

function AdministrationNav({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
}) {
  return (
    <nav className="space-y-6">
      {sectionGroups.map((group) => (
        <div key={group.label}>
          <p className="admin-nav-label">{group.label}</p>
          <div className="mt-2 space-y-1">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${active === item.id ? "admin-nav-item-active" : ""}`}
                onClick={() => onSelect(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
                {active === item.id ? (
                  <ChevronRight className="ml-auto h-4 w-4" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdministrationHeader({
  active,
  onOpenMenu,
}: {
  active: AdminSection;
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
      <div className="flex min-h-[78px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 lg:hidden"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-3 py-2 sm:px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(195,165,131,0.28),rgba(236,209,200,0.12))] ring-1 ring-white/10">
              <img
                alt="Keysar Cosmetics"
                className="h-7 w-7 object-contain"
                src="/logo.svg"
              />
            </div>
            <div>
              <p className="admin-brand-title">Keysar Scheduler</p>
              <p className="text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
                Agenda interna
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 xl:flex">
            <Link
              className="rounded-full px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
              href="/"
            >
              Agenda
            </Link>
            <button
              type="button"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
            >
              Clientes
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
            >
              Servicios
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
            >
              Reportes
            </button>
            <Link
              className="rounded-full border border-[#c3a583]/45 bg-[#c3a583]/20 px-4 py-2.5 text-sm font-medium text-white"
              href={`/administracion?section=${active}`}
            >
              Administración
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="scheduler-header-button hidden sm:flex"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 sm:block">
            Reservas online
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
            ER
          </div>
        </div>
      </div>
    </header>
  );
}

export function AdministrationWorkspace() {
  const [active, setActive] = useState<AdminSection>("locals");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locals, setLocals] = useState<LocalRecord[]>(() =>
    initialLocals.map(cloneLocal),
  );
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>(() =>
    initialProfessionals.map(cloneProfessional),
  );
  const [services, setServices] = useState<ServiceRecord[]>(() =>
    initialServices.map((service) => ({
      ...service,
      professionalIds: [...service.professionalIds],
    })),
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") as AdminSection | null;
    if (section && sectionTitles[section]) setActive(section);
  }, []);
  const selectSection = (section: AdminSection) => {
    setActive(section);
    setMobileOpen(false);
    window.history.replaceState(null, "", `/administracion?section=${section}`);
  };
  const renderSection = () => {
    switch (active) {
      case "locals":
        return <LocalSection locals={locals} setLocals={setLocals} />;
      case "professionals":
        return (
          <ProfessionalsSection
            locals={locals}
            services={services}
            professionals={professionals}
            setProfessionals={setProfessionals}
          />
        );
      case "services":
        return (
          <ServicesSection
            services={services}
            setServices={setServices}
            professionals={professionals}
          />
        );
      case "commissions":
        return (
          <CommissionsSection
            professionals={professionals}
            services={services}
          />
        );
      case "resources":
        return <ResourcesSection locals={locals} services={services} />;
      case "surveys":
        return <SurveysSection services={services} />;
      case "consents":
        return <ConsentsSection />;
      case "whatsapp":
        return <WhatsAppSection />;
      case "gift-cards":
        return <GiftCardsSection services={services} />;
    }
  };
  return (
    <div className="admin-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <AdministrationHeader
        active={active}
        onOpenMenu={() => setMobileOpen(true)}
      />
      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-[#e9e1da] bg-[#f8f5f1] p-5 lg:block">
          <AdministrationNav active={active} onSelect={selectSection} />
        </aside>
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="left-0 top-0 h-full w-[min(88vw,340px)] translate-x-0 translate-y-0 rounded-none border-0 bg-[#f8f5f1] p-0">
            <DialogHeader className="border-b border-[#e9e1da] p-5 text-left">
              <DialogTitle className="text-[#263649]">
                Administración
              </DialogTitle>
            </DialogHeader>
            <div className="p-5">
              <AdministrationNav active={active} onSelect={selectSection} />
            </div>
          </DialogContent>
        </Dialog>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
