"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Globe2,
  ImagePlus,
  Info,
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
  Star,
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
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MultiCombobox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
  type ColumnDef,
} from "@cosmetics/ui";

import {
  createEmptyLocal,
  createClassSchedule,
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
  type ClassScheduleDay,
  type ConsentRecord,
  type EntityStatus,
  type GiftCardRecord,
  type LocalRecord,
  type ProfessionalGroup,
  type ProfessionalRecord,
  type ResourceRecord,
  type ScheduleBreak,
  type ScheduleDay,
  type ServiceSpecialHours,
  type ServiceSpecialHoursMode,
  type ScheduledResourceRecord,
  type ServiceRecord,
  type SpecialDay,
  type SurveyQuestion,
  type SurveyRecord,
  type WhatsAppMessageRecord,
} from "@/lib/mock-administration-data";
import {
  AdministrationNavMenu,
  ReportsNavMenu,
  SchedulerPrimaryNav,
} from "@/components/SchedulerPrimaryNav";

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

const createServiceSpecialHours = (): ServiceSpecialHours => ({
  mode: "none",
  rangeStart: "09:00",
  rangeEnd: "13:00",
  specificTimes: ["10:00"],
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
  schedule.map((day) => ({
    ...day,
    ...(day.breaks
      ? { breaks: day.breaks.map((breakItem) => ({ ...breakItem })) }
      : {}),
  }));
const cloneClassSchedule = (schedule: ClassScheduleDay[]) =>
  schedule.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => ({ ...slot })),
  }));
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
const createResourceSchedule = (): ScheduleDay[] =>
  createSchedule().map((day, index) => ({
    ...day,
    enabled: index === 0,
  }));
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
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </Label>
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
  activeClassName = "bg-[#7460a4]",
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  activeClassName?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? activeClassName : "bg-slate-200"} ${className}`.trim()}
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

function FeaturedCheck({
  checked,
  onChange,
  label = "Servicio destacado",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="service-featured-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(event.target.checked)}
              className="sr-only"
            />
            <Star
              className={`h-6 w-6 ${checked ? "fill-[#7460a4] text-[#7460a4]" : "text-slate-500"}`}
            />
            <span>{label}</span>
          </label>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="featured-tooltip"
        >
          <strong>Marca como {label.toLocaleLowerCase()}</strong>
          <span>
            Esto permitirá que Julia priorice la oferta de este servicio por
            sobre otros de tu lista creada en AgendaPro.
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PackageBasicFields({
  draft,
  catalogServices,
  availableCategories,
  categoryPopoverOpen,
  newCategoryName,
  onCategoryPopoverChange,
  onNewCategoryNameChange,
  onCreateCategory,
  onUpdate,
}: {
  draft: ServiceRecord;
  catalogServices: ServiceRecord[];
  availableCategories: string[];
  categoryPopoverOpen: boolean;
  newCategoryName: string;
  onCategoryPopoverChange: (open: boolean) => void;
  onNewCategoryNameChange: (value: string) => void;
  onCreateCategory: () => void;
  onUpdate: (patch: Partial<ServiceRecord>) => void;
}) {
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServicePrice, setSelectedServicePrice] = useState("");
  const packageItems = draft.packageItems ?? [];
  const packageCandidates = catalogServices.filter(
    (service) =>
      service.type === "service" && (service.sessions ?? 1) <= 1,
  );
  const updateItems = (items: { serviceId: string; price: number }[]) =>
    onUpdate({
      packageItems: items,
      price: items.reduce((total, item) => total + item.price, 0),
    });
  const availablePackageServices = packageCandidates.filter(
    (service) =>
      !packageItems.some((item) => item.serviceId === service.id),
  );
  const selectService = (service: ServiceRecord) => {
    setSelectedServiceId(service.id);
    setSelectedServicePrice("");
  };
  const addSelectedService = () => {
    const price = Number(selectedServicePrice);
    if (!selectedServiceId || !selectedServicePrice.trim() || price < 0) {
      toast.error("Selecciona un servicio e ingresa su precio.");
      return;
    }
    updateItems([
      ...packageItems,
      { serviceId: selectedServiceId, price },
    ]);
    setSelectedServiceId("");
    setSelectedServicePrice("");
    setServicePickerOpen(false);
  };
  const getService = (serviceId: string) =>
    packageCandidates.find((service) => service.id === serviceId);
  return (
    <div className="package-dialog-content space-y-4">
      <div className="package-basic-card">
        <Field
          id="package-name"
          label="Nombre del paquete del servicio"
          required
          value={draft.name}
          onChange={(value) => onUpdate({ name: value })}
          placeholder="Paquete de servicios completo"
        />
        <div className="mt-4">
          <SelectField
            id="package-category"
            label="Categoría"
            required
            value={draft.category}
            onChange={(value) => onUpdate({ category: value })}
            options={availableCategories.map((category) => ({
              value: category,
              label: category,
            }))}
          />
          <Popover
            open={categoryPopoverOpen}
            onOpenChange={onCategoryPopoverChange}
          >
            <PopoverTrigger asChild>
              <button type="button" className="service-new-category-link">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nueva categoría
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="admin-popover service-category-popover p-2"
            >
              <Label htmlFor="new-package-category">Nueva categoría *</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="new-package-category"
                  value={newCategoryName}
                  autoFocus
                  placeholder="Nombre de la categoría"
                  className="admin-input"
                  onChange={(event) =>
                    onNewCategoryNameChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onCreateCategory();
                  }}
                />
                <Button
                  type="button"
                  className="admin-primary"
                  onClick={onCreateCategory}
                >
                  Agregar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="package-services-card">
        <h3 className="admin-section-title">
          Selecciona los servicios que tendrá el paquete
        </h3>
        <p className="admin-help mt-1">
          Podrás crear paquetes con los servicios creados en la empresa. No
          puedes crearlos con Clases o Servicios con sesiones.
        </p>
        <InfoBanner icon={<Info className="h-5 w-5" />}>
          Ingresa el precio de cada servicios del paquete y la suma de estos
          será el precio final. Así, puedes asignar un precio distinto al
          precio original. Las comisiones por la realización de los servicios
          serán calculadas de acuerdo a estos precios.
        </InfoBanner>
        <div className="package-items-list">
          {packageItems.map((item) => {
            const service = getService(item.serviceId);
            if (!service) return null;
            return (
              <div key={item.serviceId} className="package-item-row">
                <span>{service.name}</span>
                <div className="package-item-price">
                  <span>$</span>
                  <Input
                    aria-label={`Precio de ${service.name}`}
                    type="number"
                    value={String(item.price)}
                    className="admin-input"
                    onChange={(event) =>
                      updateItems(
                        packageItems.map((current) =>
                          current.serviceId === item.serviceId
                            ? {
                                ...current,
                                price: Number(event.target.value) || 0,
                              }
                            : current,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-rose-500"
                  aria-label={`Quitar ${service.name} del paquete`}
                  onClick={() =>
                    updateItems(
                      packageItems.filter(
                        (current) => current.serviceId !== item.serviceId,
                      ),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {packageItems.length > 0 ? (
            <div className="package-total-row">
              <span>Precio final</span>
              <strong>{currency(draft.price)}</strong>
            </div>
          ) : null}
        </div>
        <Popover
          open={servicePickerOpen}
          onOpenChange={setServicePickerOpen}
        >
          <PopoverTrigger asChild>
            <button type="button" className="package-add-service">
              <Plus className="mr-2 h-4 w-4" />
              Agregar servicio
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="admin-popover w-80 p-2">
            <Label htmlFor="package-service-select">Servicios</Label>
            <select
              id="package-service-select"
              className="package-service-select"
              value={selectedServiceId}
              onChange={(event) => {
                const service = packageCandidates.find(
                  (item) => item.id === event.target.value,
                );
                if (service) selectService(service);
              }}
            >
              <option value="">Selecciona un servicio</option>
              {availablePackageServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <Label htmlFor="package-service-price">Precio</Label>
            <div className="package-picker-price">
              <span>$</span>
              <Input
                id="package-service-price"
                type="number"
                value={selectedServicePrice}
                placeholder="Precio del servicio"
                className="admin-input"
                disabled={!selectedServiceId}
                onChange={(event) => setSelectedServicePrice(event.target.value)}
              />
            </div>
            <Button
              type="button"
              className="admin-primary w-full"
              onClick={addSelectedService}
              disabled={!selectedServiceId}
            >
              Agregar
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function PackageWebsiteFields({
  draft,
  onUpdate,
}: {
  draft: ServiceRecord;
  onUpdate: (patch: Partial<ServiceRecord>) => void;
}) {
  return (
    <div className="package-website space-y-5">
      <div className="package-website-card">
        <div className="package-website-setting">
          <Toggle
            checked={draft.packageShowPrice ?? true}
            onChange={(checked) => onUpdate({ packageShowPrice: checked })}
          />
          <span>
            Mostrar el precio del servicio en mi sitio personalizado (no aplica
            para el Marketplace).
          </span>
        </div>
        <div className="package-website-setting">
          <Toggle
            checked={draft.packageSimultaneous ?? false}
            onChange={(checked) => onUpdate({ packageSimultaneous: checked })}
          />
          <span>Los servicios del paquete se realizarán de forma simultánea</span>
        </div>
        <div className="package-website-description">
          <label htmlFor="package-description" className="admin-label">
            Descripción del servicio
          </label>
          <Textarea
            id="package-description"
            rows={5}
            value={draft.description}
            placeholder="Acá puedes describir que incluye el servicio, notas importantes, requerimientos, entre otros."
            onChange={(event) => onUpdate({ description: event.target.value })}
            className="admin-textarea"
          />
        </div>
      </div>
    </div>
  );
}

function AddOnBasicFields({
  draft,
  availableCategories,
  categoryPopoverOpen,
  newCategoryName,
  onCategoryPopoverChange,
  onNewCategoryNameChange,
  onCreateCategory,
  onUpdate,
}: {
  draft: ServiceRecord;
  availableCategories: string[];
  categoryPopoverOpen: boolean;
  newCategoryName: string;
  onCategoryPopoverChange: (open: boolean) => void;
  onNewCategoryNameChange: (value: string) => void;
  onCreateCategory: () => void;
  onUpdate: (patch: Partial<ServiceRecord>) => void;
}) {
  return (
    <div className="add-on-dialog-content space-y-4">
      <InfoBanner icon={<Star className="h-5 w-5" />}>
        Agrega pequeños servicios que complementen el servicio base. Estos
        adicionales los podrás agregar a una cita desde la sección de agenda
        o agregarlos en el momento del pago pero no aparecerán en el sitio web.
      </InfoBanner>
      <div className="add-on-basic-card">
        <Field
          id="add-on-name"
          label="Nombre"
          required
          value={draft.name}
          onChange={(value) => onUpdate({ name: value })}
          placeholder="Nombre del servicio adicional"
        />
        <div className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="add-on-price">
              Precio <span className="ml-1 text-rose-500">*</span>
            </Label>
            <div className="service-price-field">
              <span>$</span>
              <Input
                id="add-on-price"
                type="number"
                value={String(draft.price)}
                onChange={(event) =>
                  onUpdate({ price: Number(event.target.value) || 0 })
                }
                className="admin-input"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <SelectField
            id="add-on-category"
            label="Categoría"
            required
            value={draft.category}
            onChange={(value) => onUpdate({ category: value })}
            options={availableCategories.map((category) => ({
              value: category,
              label: category,
            }))}
          />
          <Popover
            open={categoryPopoverOpen}
            onOpenChange={onCategoryPopoverChange}
          >
            <PopoverTrigger asChild>
              <button type="button" className="service-new-category-link">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nueva categoría
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="admin-popover service-category-popover p-2"
            >
              <Label htmlFor="new-add-on-category">Nueva categoría *</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="new-add-on-category"
                  value={newCategoryName}
                  autoFocus
                  placeholder="Nombre de la categoría"
                  className="admin-input"
                  onChange={(event) =>
                    onNewCategoryNameChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onCreateCategory();
                  }}
                />
                <Button
                  type="button"
                  className="admin-primary"
                  onClick={onCreateCategory}
                >
                  Agregar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function Tabs({
  items,
  active,
  onChange,
  className = "",
}: {
  items: { id: string; label: ReactNode }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`admin-tabs ${className}`.trim()}>
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
  const getBreaks = (item: ScheduleDay): ScheduleBreak[] =>
    item.breaks ??
    (item.breakStart
      ? [{ start: item.breakStart, end: item.breakEnd ?? "14:00" }]
      : []);
  const copyFirst = () => {
    const first = schedule.find((item) => item.enabled) ?? schedule[0];
    if (!first) return;
    onChange(
      schedule.map((item) => ({
        ...item,
        enabled: first.enabled,
        open: first.open,
        close: first.close,
        breaks: getBreaks(first).map((breakItem) => ({ ...breakItem })),
      })),
    );
    toast.success("Horario copiado en todos los días.");
  };
  if (withBreak) {
    return (
      <div className="schedule-break-table">
        <div className="schedule-break-table-header" aria-hidden="true">
          <span>Día</span>
          <span>Estado</span>
          <span>Inicio de la jornada</span>
          <span>Fin de la jornada</span>
          <span>Descanso</span>
          <span />
        </div>
        {schedule.map((item, index) => (
          <div key={item.day}>
            <div className="schedule-break-table-row">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="schedule-break-button"
                disabled={!item.enabled}
                aria-label={`${item.enabled ? "Agregar descanso" : "Activar"} el ${item.day}`}
                onClick={() =>
                  update(item.day, {
                    breaks: [
                      ...getBreaks(item),
                      { start: "13:00", end: "14:00" },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                <span className="schedule-break-button-label">Descanso</span>
              </Button>
              {index === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="schedule-copy-button gap-1.5 whitespace-nowrap"
                  onClick={copyFirst}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar en todos
                </Button>
              ) : (
                <span />
              )}
            </div>
            {item.enabled
              ? getBreaks(item).map((breakItem, breakIndex) => (
                  <div
                    key={`${item.day}-break-${breakIndex}`}
                    className="schedule-break-row"
                  >
                    <span>Descanso {breakIndex + 1}</span>
                    <span />
                    <ScheduleTime
                      label={`Inicio del descanso ${breakIndex + 1} de ${item.day}`}
                      value={breakItem.start}
                      onChange={(start) =>
                        update(item.day, {
                          breaks: getBreaks(item).map((current, index) =>
                            index === breakIndex ? { ...current, start } : current,
                          ),
                        })
                      }
                    />
                    <ScheduleTime
                      label={`Fin del descanso ${breakIndex + 1} de ${item.day}`}
                      value={breakItem.end}
                      onChange={(end) =>
                        update(item.day, {
                          breaks: getBreaks(item).map((current, index) =>
                            index === breakIndex ? { ...current, end } : current,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="schedule-break-remove"
                      aria-label={`Quitar descanso ${breakIndex + 1} de ${item.day}`}
                      onClick={() =>
                        update(item.day, {
                          breaks: getBreaks(item).filter(
                            (_, index) => index !== breakIndex,
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <span />
                  </div>
                ))
              : null}
          </div>
        ))}
      </div>
    );
  }
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
              variant="outline"
              size="sm"
              className="schedule-copy-button gap-1.5 whitespace-nowrap"
              onClick={copyFirst}
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar en todos
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function ClassScheduleRows({
  schedule,
  professionals,
  onChange,
}: {
  schedule: ClassScheduleDay[];
  professionals: ProfessionalRecord[];
  onChange: (schedule: ClassScheduleDay[]) => void;
}) {
  const updateDay = (dayName: string, slots: ClassScheduleDay["slots"]) =>
    onChange(
      schedule.map((day) => (day.day === dayName ? { ...day, slots } : day)),
    );
  const addClass = (dayName: string) => {
    const day = schedule.find((item) => item.day === dayName);
    if (!day) return;
    updateDay(dayName, [
      ...day.slots,
      {
        id: makeId("class-slot"),
        professionalId: "",
        start: "09:00",
        end: "10:00",
      },
    ]);
  };
  const activeProfessionals = professionals.filter(
    (professional) => professional.status === "active",
  );
  return (
    <div className="class-schedule-table">
      <div className="class-schedule-header" aria-hidden="true">
        <span>Día</span>
        <span>Clases</span>
        <span>Apertura</span>
        <span>Cierre</span>
        <span>Opciones</span>
      </div>
      {schedule.map((day) => (
        <div key={day.day} className="class-schedule-day">
          <div className="class-schedule-day-row">
            <span className="class-schedule-day-name">
              {day.slots.length > 0 ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4" />
              )}
              {day.day}
            </span>
            <span className="class-schedule-count">{day.slots.length}</span>
            <span />
            <span />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="class-schedule-add"
              aria-label={`Agregar clase el ${day.day}`}
              onClick={() => addClass(day.day)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          {day.slots.map((slot) => (
            <div key={slot.id} className="class-schedule-slot-row">
              <select
                className="class-schedule-professional"
                value={slot.professionalId}
                aria-label={`Profesional de la clase del ${day.day}`}
                onChange={(event) =>
                  updateDay(
                    day.day,
                    day.slots.map((current) =>
                      current.id === slot.id
                        ? { ...current, professionalId: event.target.value }
                        : current,
                    ),
                  )
                }
              >
                <option value="">Profesional</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
              <ScheduleTime
                label={`Apertura de la clase del ${day.day}`}
                value={slot.start}
                onChange={(start) =>
                  updateDay(
                    day.day,
                    day.slots.map((current) =>
                      current.id === slot.id ? { ...current, start } : current,
                    ),
                  )
                }
              />
              <ScheduleTime
                label={`Cierre de la clase del ${day.day}`}
                value={slot.end}
                onChange={(end) =>
                  updateDay(
                    day.day,
                    day.slots.map((current) =>
                      current.id === slot.id ? { ...current, end } : current,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="class-schedule-remove"
                aria-label={`Eliminar clase del ${day.day}`}
                onClick={() =>
                  updateDay(
                    day.day,
                    day.slots.filter((current) => current.id !== slot.id),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  saveDisabled = false,
  saveLabel = "Guardar cambios",
  cancelLabel = "Cancelar",
  wide = false,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: (() => void) | undefined;
  saveDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  wide?: boolean;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`admin-dialog ${wide ? "admin-dialog-wide sm:max-w-4xl" : "sm:max-w-2xl"} ${className}`.trim()}
      >
        <DialogHeader className="border-b border-[#eee7e2] pb-4">
          <DialogTitle className="text-xl text-[#263649]">{title}</DialogTitle>
          {description ? <p className="admin-dialog-subtitle">{description}</p> : null}
        </DialogHeader>
        <div className="admin-dialog-body">{children}</div>
        {onSave ? (
          <DialogFooter className="border-t border-[#eee7e2] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              className="admin-primary"
              disabled={saveDisabled}
              onClick={onSave}
            >
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
  variant = "default",
}: {
  label: string;
  recommendation: string;
  value: string | null;
  onChange: (value: string | null) => void;
  previewUrl?: string | null;
  onFileChange?: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  variant?: "default" | "avatar" | "service";
}) {
  const inputId = `file-${label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`El archivo no puede superar ${maxSizeMb} MB.`);
      return;
    }
    onChange(file.name);
    onFileChange?.(file);
  };
  if (variant === "avatar") {
    return (
      <div className="space-y-2">
        <p className="admin-label">{label}</p>
        <p className="admin-help">{recommendation}</p>
        <div className="professional-avatar-picker">
          <div className="professional-avatar-placeholder">
            <ImagePlus className="h-8 w-8" />
            <span>Arrastra o selecciona la imagen</span>
            {value ? <small>{value}</small> : null}
          </div>
          <input
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            asChild
            type="button"
            variant="outline"
            className="professional-avatar-upload"
          >
            <label htmlFor={inputId}>
              <Upload className="mr-2 h-4 w-4" />
              Subir imagen
            </label>
          </Button>
        </div>
      </div>
    );
  }
  if (variant === "service") {
    return (
      <div className="service-images-field">
        <p className="admin-label">{label}</p>
        <p className="admin-help">{recommendation}</p>
        <div className="service-images-grid">
          {[0, 1, 2].map((index) => {
            const slotId = `${inputId}-${index}`;
            return (
              <div key={slotId} className="service-image-slot">
                <ImagePlus className="h-8 w-8" />
                <span>{value && index === 0 ? value : "Arrastra o selecciona la imagen"}</span>
                <input
                  id={slotId}
                  type="file"
                  accept={accept}
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <Button asChild type="button" variant="outline" className="professional-avatar-upload">
                  <label htmlFor={slotId}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir imagen
                  </label>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
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
          onChange={handleFileChange}
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
      {action ? <div className="section-header-action shrink-0">{action}</div> : null}
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
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
          createsUser: true,
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
              createsUser: true,
              services: [],
              biography: "",
              avatar: null,
              status: "active",
              schedule: createSchedule(),
              specialDays: [],
            },
      );
      setTab("basic");
      const firstCategory = services.find((service) => service.type !== "add-on")?.category;
      setExpandedCategories(firstCategory ? [firstCategory] : []);
    }
  }, [locals, open, professional, services]);
  const update = (patch: Partial<ProfessionalRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const toggleService = (id: string, checked: boolean) =>
    update({
      services: checked
        ? [...draft.services, id]
        : draft.services.filter((serviceId) => serviceId !== id),
    });
  const serviceGroups = useMemo(() => {
    const groups = new Map<string, ServiceRecord[]>();
    services
      .filter((service) => service.type !== "add-on")
      .forEach((service) => {
        const group = groups.get(service.category) ?? [];
        group.push(service);
        groups.set(service.category, group);
      });
    return [...groups.entries()].map(([category, items]) => ({
      category,
      items,
    }));
  }, [services]);
  const allServicesSelected = serviceGroups.every((group) =>
    group.items.every((service) => draft.services.includes(service.id)),
  );
  const toggleCategory = (category: string) =>
    setExpandedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  const toggleCategoryServices = (items: ServiceRecord[], checked: boolean) =>
    update({
      services: checked
        ? [...new Set([...draft.services, ...items.map((item) => item.id)])]
        : draft.services.filter(
            (serviceId) => !items.some((item) => item.id === serviceId),
          ),
    });
  const save = () => {
    if (
      !draft.name.trim() ||
      !draft.localId
    ) {
      toast.error("Completa el nombre y el local del profesional.");
      return;
    }
    if (draft.createsUser && !draft.email.includes("@")) {
      toast.error("Ingresa un email válido para crear el usuario.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      role: draft.role.trim() || "Profesional",
    });
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
        className="professional-tabs"
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
          <div className="professional-basic-card">
            <Field
              id="professional-name"
              label="Nombre Público"
              value={draft.name}
              onChange={(value) => update({ name: value })}
              placeholder="Nombre Público"
            />
            <div className="admin-form-grid mt-4">
              <Field
                id="professional-role"
                label="Especialidad o cargo"
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
            </div>
            <div className="professional-toggle-list">
              <div className="professional-toggle-row">
                <Toggle
                  checked={draft.acceptsOnline}
                  label="Acepta reservas en línea"
                  onChange={(checked) => update({ acceptsOnline: checked })}
                />
                <div>
                  <p className="font-medium">
                    Este profesional acepta reservas en línea
                  </p>
                </div>
              </div>
              <div className="professional-toggle-row">
                <Toggle
                  checked={draft.createsUser}
                  label="Crear un usuario para este profesional"
                  onChange={(checked) => update({ createsUser: checked })}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    Crear un usuario a este profesional
                  </p>
                  <p className="admin-help">
                    Ingresa el email para que el profesional pueda ver su propia agenda
                  </p>
                  {draft.createsUser ? (
                    <div className="mt-3">
                      <Input
                        id="professional-email"
                        type="email"
                        value={draft.email}
                        placeholder="Ingresa el email del profesional"
                        onChange={(event) =>
                          update({ email: event.target.value })
                        }
                        className="admin-input"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="professional-services-section">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="professional-section-title">
                  Selecciona los servicios que realiza el profesional
                </h3>
              </div>
              <label
                className="professional-select-all"
              >
                <input
                  type="checkbox"
                  checked={allServicesSelected}
                  onChange={() =>
                    update({
                      services: allServicesSelected
                        ? []
                        : serviceGroups.flatMap((group) =>
                            group.items.map((service) => service.id),
                          ),
                    })
                  }
                  className="h-4 w-4 accent-[#9860df]"
                />
                Seleccionar Todo
              </label>
            </div>
            <div className="professional-category-list">
              {serviceGroups.map((group) => {
                const expanded = expandedCategories.includes(group.category);
                const selected = group.items.filter((item) =>
                  draft.services.includes(item.id),
                ).length;
                const allSelected = selected === group.items.length;
                return (
                  <div key={group.category} className="professional-category">
                    <div className="professional-category-header">
                      <label className="professional-category-label">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(event) =>
                            toggleCategoryServices(group.items, event.target.checked)
                          }
                          className="h-4 w-4 accent-[#9860df]"
                        />
                        <span>{group.category}</span>
                      </label>
                      <span className="professional-category-count">
                        ({group.items.length})
                      </span>
                      <button
                        type="button"
                        className="professional-category-expand"
                        aria-label={`${expanded ? "Ocultar" : "Mostrar"} servicios de ${group.category}`}
                        onClick={() => toggleCategory(group.category)}
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {expanded ? (
                      <div className="professional-service-grid">
                        {group.items.map((service) => (
                          <label
                            key={service.id}
                            className="professional-service-option"
                          >
                            <input
                              type="checkbox"
                              checked={draft.services.includes(service.id)}
                              onChange={(event) =>
                                toggleService(service.id, event.target.checked)
                              }
                              className="h-4 w-4 accent-[#9860df]"
                            />
                            <span>{service.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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
        <div className="professional-profile-card">
          <div>
            <label htmlFor="professional-bio" className="admin-label">
              Biografía
            </label>
            <p className="admin-help">
              Será visible en el sitio y marketplace. Máximo 600 caracteres
            </p>
            <Textarea
              id="professional-bio"
              rows={5}
              className="admin-textarea"
              value={draft.biography}
              onChange={(event) => update({ biography: event.target.value })}
              placeholder="Incluye una breve biografía del profesional"
            />
          </div>
          <div className="service-payment-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="admin-section-title">Pago en línea</h3>
                <p className="admin-help">
                  Permite que tus clientes paguen en línea y disminuye las inasistencias.
                </p>
              </div>
              <Toggle checked onChange={() => undefined} />
            </div>
            <label className="service-payment-option">
              <input type="radio" name="service-payment" defaultChecked />
              <span>
                <strong>Se debe pagar en línea</strong>
                <small>El cliente debe realizar el pago completo al reservar.</small>
              </span>
            </label>
            <label className="service-payment-option service-payment-option-muted">
              <input type="radio" name="service-payment" />
              <span>
                <strong>No se puede pagar en línea</strong>
                <small>El cliente podrá agendar, pero pagará en el local.</small>
              </span>
            </label>
          </div>
          <FilePicker
            label="Foto del profesional"
            recommendation="Te recomendamos tenga un tamaño mínimo de 100x100px y un peso máximo de 3MB."
            value={draft.avatar}
            onChange={(avatar) => update({ avatar })}
            variant="avatar"
          />
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
    if (open) {
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
    }
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
  const [specialProfessional, setSpecialProfessional] =
    useState<ProfessionalRecord | null>(null);
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
                                    setSpecialProfessional(professional);
                                  }}
                                >
                                  <CalendarDays className="mr-2 h-4 w-4" />
                                  Habilitar jornada especial
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
      <SpecialDayDialog
        open={Boolean(specialProfessional)}
        title={
          specialProfessional
            ? `Abrir día para ${specialProfessional.name}`
            : "Jornada especial"
        }
        days={specialProfessional?.specialDays ?? []}
        onOpenChange={(open) => {
          if (!open) setSpecialProfessional(null);
        }}
        onSave={(days) => {
          if (!specialProfessional) return;
          setProfessionals((current) =>
            current.map((professional) =>
              professional.id === specialProfessional.id
                ? { ...professional, specialDays: days }
                : professional,
            ),
          );
          setSpecialProfessional(null);
        }}
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
  initialSessions,
  professionals,
  catalogServices,
  resources,
  categories,
  onCreateCategory,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  service: ServiceRecord | null;
  serviceType: ServiceRecord["type"];
  initialSessions?: number | undefined;
  professionals: ProfessionalRecord[];
  catalogServices: ServiceRecord[];
  resources: ResourceRecord[];
  categories: string[];
  onCreateCategory: (category: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (service: ServiceRecord) => void;
}) {
  const base = service ?? {
    id: makeId("service"),
    name: "",
    category:
      serviceType === "add-on"
        ? categories.find((category) => category === "Adicionales") ?? categories[0] ?? "General"
        : categories[0] ?? "General",
    type: serviceType,
    price: 0,
    duration: 60,
    status: "active" as const,
    featured: false,
    professionalIds: [],
    description: "",
    alternativeNames: [],
    commissionValue: 0,
    commissionUnit: "%",
    videoConference: false,
    homeService: false,
    priceIncludesTax: true,
    allowMultipleClients: serviceType === "class",
    maxClients: serviceType === "class" ? 8 : 2,
    resourceIds: [],
    specialHours: createServiceSpecialHours(),
    sessions: initialSessions ?? 1,
    capacity: 8,
    ...(serviceType === "package" ? { packageItems: [] } : {}),
    ...(serviceType === "package"
      ? { packageShowPrice: true, packageSimultaneous: false }
      : {}),
    ...(serviceType === "class"
      ? { classSchedule: createClassSchedule() }
      : {}),
  };
  const [tab, setTab] = useState<
    "basic" | "schedule" | "website" | "advanced"
  >("basic");
  const [draft, setDraft] = useState<ServiceRecord>(base);
  const [classSchedule, setClassSchedule] = useState<ClassScheduleDay[]>(
    createClassSchedule(),
  );
  const [resourceOpen, setResourceOpen] = useState(false);
  const [specialHoursOpen, setSpecialHoursOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [alternativeNameInput, setAlternativeNameInput] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(
        service
          ? {
              ...service,
              professionalIds: [...service.professionalIds],
              commissionValue: service.commissionValue ?? 0,
              commissionUnit: service.commissionUnit ?? "%",
              videoConference: service.videoConference ?? false,
              homeService: service.homeService ?? false,
              priceIncludesTax: service.priceIncludesTax ?? true,
              allowMultipleClients:
                service.allowMultipleClients ?? service.type === "class",
              maxClients: service.maxClients ?? service.capacity ?? 2,
              resourceIds: [...(service.resourceIds ?? [])],
              specialHours: service.specialHours
                ? {
                    ...service.specialHours,
                    specificTimes: [...service.specialHours.specificTimes],
                  }
                : createServiceSpecialHours(),
            }
          : {
              id: makeId("service"),
              name: "",
              category:
                serviceType === "add-on"
                  ? categories.find((category) => category === "Adicionales") ?? categories[0] ?? "General"
                  : categories[0] ?? "General",
              type: serviceType,
              price: 0,
              duration: 60,
              status: "active",
              featured: false,
              professionalIds: [],
              description: "",
              alternativeNames: [],
              commissionValue: 0,
              commissionUnit: "%",
              videoConference: false,
              homeService: false,
              priceIncludesTax: true,
              allowMultipleClients: serviceType === "class",
              maxClients: serviceType === "class" ? 8 : 2,
              resourceIds: [],
              specialHours: createServiceSpecialHours(),
              sessions: initialSessions ?? 1,
              capacity: 8,
              ...(serviceType === "package" ? { packageItems: [] } : {}),
              ...(serviceType === "package"
                ? { packageShowPrice: true, packageSimultaneous: false }
                : {}),
              ...(serviceType === "class"
                ? { classSchedule: createClassSchedule() }
                : {}),
            },
      );
      setClassSchedule(
        service?.classSchedule
          ? cloneClassSchedule(service.classSchedule)
          : createClassSchedule(),
      );
      setTab("basic");
      setResourceOpen(false);
      setSpecialHoursOpen(false);
      setCategoryPopoverOpen(false);
      setNewCategoryName("");
      setAlternativeNameInput("");
    }
  }, [initialSessions, open, service, serviceType]);
  useEffect(() => {
    setAvailableCategories(categories);
  }, [categories]);
  const update = (patch: Partial<ServiceRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const specialHours = draft.specialHours ?? createServiceSpecialHours();
  const updateSpecialHours = (patch: Partial<ServiceSpecialHours>) =>
    update({ specialHours: { ...specialHours, ...patch } });
  const createCategory = () => {
    const category = newCategoryName.trim();
    if (!category) {
      toast.error("Escribe el nombre de la categoría.");
      return;
    }
    setAvailableCategories((current) =>
      current.includes(category) ? current : [...current, category],
    );
    onCreateCategory(category);
    update({ category });
    setNewCategoryName("");
    setCategoryPopoverOpen(false);
    toast.success("Categoría agregada.");
  };
  const addAlternativeName = () => {
    const alternativeName = alternativeNameInput.trim();
    if (!alternativeName) return;
    const alternatives = draft.alternativeNames ?? [];
    if (!alternatives.includes(alternativeName)) {
      update({ alternativeNames: [...alternatives, alternativeName] });
    }
    setAlternativeNameInput("");
  };
  const serviceMode =
    draft.type === "service" && (draft.sessions ?? 1) > 1
      ? "service-sessions"
      : draft.type;
  const selectMode = (mode: string) => {
    if (mode === "service-sessions") {
      update({ type: "service", sessions: Math.max(draft.sessions ?? 1, 5) });
      return;
    }
    if (mode === "package" || mode === "service") {
      update({
        type: mode,
        sessions: mode === "package" ? draft.sessions ?? 5 : 1,
      });
      return;
    }
    update({ type: mode as ServiceRecord["type"] });
  };
  const isSessionService =
    draft.type === "service" && (draft.sessions ?? 1) > 1;
  const save = () => {
    if (!draft.name.trim() || draft.price < 0 || draft.duration < 1) {
      toast.error("Completa nombre, precio y duración.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      ...(draft.type === "class"
        ? { classSchedule: cloneClassSchedule(classSchedule) }
        : {}),
    });
    onOpenChange(false);
  };
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        service
          ? `Editar ${service.name}`
          : isSessionService
            ? "Nuevo Servicio con sesiones"
          : serviceType === "class"
            ? "Nueva Clase"
            : serviceType === "package"
              ? "Nuevo Paquete"
              : serviceType === "add-on"
                ? "Nuevo Adicional"
                : "Nuevo Servicio"
      }
      onSave={save}
      saveLabel="Guardar"
      cancelLabel="Cerrar"
      className="service-dialog-modal"
    >
      <Tabs
        items={[
          { id: "basic", label: "Datos básicos" },
          ...(draft.type === "class"
            ? [{ id: "schedule", label: "Horario de la clase" }]
            : []),
          ...(draft.type !== "add-on"
            ? [
                {
                  id: "website",
                  label: (
                    <span className="inline-flex items-center gap-2">
                      <Globe2 className="h-4 w-4" />
                      Sitio Web
                    </span>
                  ),
                },
              ]
            : []),
          { id: "advanced", label: "Opciones avanzadas" },
        ]}
        active={tab}
        onChange={(value) =>
          setTab(value as "basic" | "schedule" | "website" | "advanced")
        }
      />
      <div className="service-dialog-intro">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f0ebf6] text-[#7460a4]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-[#263649]">
            Configura tu {draft.type === "class" ? "clase" : draft.type === "package" ? "paquete" : draft.type === "add-on" ? "adicional" : "servicio"}
          </p>
          <p className="admin-help">
            Agrega la información que verá tu equipo y, si lo deseas, tus clientes al reservar en línea.
          </p>
        </div>
      </div>
      <div className="service-type-picker">
        <div>
          <p className="admin-section-title">Tipo de elemento</p>
          <p className="admin-help">Elige cómo se agenda dentro de tu catálogo.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["service", "Servicio", "Una cita individual."],
              ["service-sessions", "Servicio con sesiones", "Requiere varias sesiones."],
              ["class", "Clase", "Admite varias personas."],
              ["package", "Paquete", "Agrupa experiencias."],
              ["add-on", "Adicional", "Complementa un servicio."],
            ] as [string, string, string][]
          ).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              className={`service-type-option ${serviceMode === value ? "service-type-option-active" : ""}`}
              onClick={() => selectMode(value)}
            >
              <span>{label}</span>
              <small>{description}</small>
            </button>
          ))}
        </div>
      </div>
      {tab === "basic" ? (
        <div className={`service-dialog-basic space-y-5 ${isSessionService ? "service-session-form" : ""} ${draft.type === "class" ? "service-class-form" : ""}`}>
          {draft.type !== "add-on" ? (
            <FeaturedCheck
              checked={draft.featured}
              onChange={(checked) => update({ featured: checked })}
              label={draft.type === "package" ? "Paquete destacado" : "Servicio destacado"}
            />
          ) : null}
          {draft.type === "package" ? (
            <PackageBasicFields
              draft={draft}
              catalogServices={catalogServices}
              availableCategories={availableCategories}
              categoryPopoverOpen={categoryPopoverOpen}
              newCategoryName={newCategoryName}
              onCategoryPopoverChange={setCategoryPopoverOpen}
              onNewCategoryNameChange={setNewCategoryName}
              onCreateCategory={createCategory}
              onUpdate={update}
            />
          ) : draft.type === "add-on" ? (
            <AddOnBasicFields
              draft={draft}
              availableCategories={availableCategories}
              categoryPopoverOpen={categoryPopoverOpen}
              newCategoryName={newCategoryName}
              onCategoryPopoverChange={setCategoryPopoverOpen}
              onNewCategoryNameChange={setNewCategoryName}
              onCreateCategory={createCategory}
              onUpdate={update}
            />
          ) : (
            <>
          <div className="admin-form-grid">
            <div className="sm:col-span-2">
              <Field
                id="service-name"
                label="Nombre del servicio"
                required
                value={draft.name}
                onChange={(value) => update({ name: value })}
                placeholder="El nombre aparecerá en el Sitio Web"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">
                Precio <span className="ml-1 text-rose-500">*</span>
              </Label>
              <div className="service-price-field">
                <span>$</span>
                <Input
                  id="service-price"
                  type="number"
                  value={String(draft.price)}
                  onChange={(event) => update({ price: Number(event.target.value) || 0 })}
                  className="admin-input"
                />
              </div>
            </div>
            <Field
              id="service-duration"
              label={
                isSessionService || draft.type === "class"
                  ? "Duración (min)"
                  : "Duración en minutos"
              }
              required
              value={String(draft.duration)}
              onChange={(value) => update({ duration: Number(value) || 0 })}
              type="number"
            />
            {draft.type === "class" ? (
              <Field
                id="service-capacity"
                label="Capacidad"
                required
                value={String(draft.capacity ?? 8)}
                onChange={(value) => update({ capacity: Number(value) || 1 })}
                type="number"
              />
            ) : null}
            {isSessionService ? (
              <Field
                id="service-sessions"
                label="Cantidad de sesiones"
                required
                value={String(draft.sessions)}
                onChange={(value) => update({ sessions: Number(value) || 1 })}
                type="number"
              />
            ) : null}
            <SelectField
              id="service-category"
              label="Categoría"
              required
              value={draft.category}
              onChange={(value) => update({ category: value })}
              options={availableCategories.map((category) => ({
                value: category,
                label: category,
              }))}
            />
            <Popover
              open={categoryPopoverOpen}
              onOpenChange={setCategoryPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button type="button" className="service-new-category-link">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nueva categoría
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="admin-popover service-category-popover p-2"
              >
                <Label htmlFor="new-service-category">Nueva categoría *</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="new-service-category"
                    value={newCategoryName}
                    autoFocus
                    placeholder="Nombre de la categoría"
                    className="admin-input"
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") createCategory();
                    }}
                  />
                  <Button type="button" className="admin-primary" onClick={createCategory}>
                    Agregar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="service-professionals-section">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="admin-section-title">
                  Selecciona qué profesionales realizarán el servicio
                </h3>
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
            <div className="service-professionals-panel">
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
            </>
          )}
        </div>
      ) : tab === "schedule" && draft.type === "class" ? (
        <div className="class-schedule-panel space-y-5">
          <div>
            <h3 className="admin-schedule-title">Horario de la clase</h3>
            <p className="admin-help">
              Define los días y horarios en los que tus clientes podrán reservar esta clase.
            </p>
          </div>
          <ClassScheduleRows
            schedule={classSchedule}
            professionals={professionals}
            onChange={setClassSchedule}
          />
        </div>
      ) : tab === "website" && draft.type === "package" ? (
        <PackageWebsiteFields draft={draft} onUpdate={update} />
      ) : tab === "website" ? (
        <div className="service-dialog-website space-y-5">
          <div className="service-website-heading">
            <p>¡No pierdas citas y deja que tus clientes agenden desde tu Sitio Web!</p>
          </div>
          <div className="service-website-card">
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
          </div>
          <div>
            <label htmlFor="service-description" className="admin-label">
              Descripción del servicio
            </label>
            <p className="admin-help">
              Esta descripción aparecerá en tu Sitio Web.
            </p>
            <Textarea
              id="service-description"
              rows={5}
              value={draft.description}
              placeholder="Acá puedes describir que incluye el servicio, notas importantes, requerimientos, entre otros."
              onChange={(event) => update({ description: event.target.value })}
              className="admin-textarea"
            />
          </div>
          <div className="service-alternatives-field">
            <label htmlFor="service-alternatives" className="admin-label">
              Nombres alternativos
            </label>
            <p className="admin-help">
              Agrega otras opciones de nombres para que se puedan brindar como opción.
            </p>
            <div className="service-alternatives-editor">
              {(draft.alternativeNames ?? []).map((alternativeName) => (
                <span key={alternativeName} className="service-alternative-chip">
                  {alternativeName}
                  <button
                    type="button"
                    aria-label={`Eliminar nombre alternativo ${alternativeName}`}
                    onClick={() =>
                      update({
                        alternativeNames: (draft.alternativeNames ?? []).filter(
                          (current) => current !== alternativeName,
                        ),
                      })
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Input
                id="service-alternatives"
                value={alternativeNameInput}
                placeholder="Agrega un nombre alternativo"
                onChange={(event) => setAlternativeNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAlternativeName();
                  }
                }}
                className="service-alternatives-input"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="service-alternatives-add"
                aria-label="Agregar nombre alternativo"
                onClick={addAlternativeName}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="service-payment-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="admin-section-title">Pago en línea</h3>
                <p className="admin-help">
                  ¡Permite que tus clientes paguen en línea y disminuye las inasistencias!
                </p>
              </div>
            </div>
            <div className="service-payment-toggle-row">
              <Toggle checked onChange={() => undefined} />
              <span>Mostrar el precio del servicio en mi sitio personalizado (no aplica para el Marketplace).</span>
            </div>
            <label className="service-payment-option service-payment-option-disabled">
              <input type="radio" name="service-payment" disabled />
              <span>
                <strong>Abono en línea</strong>
                <small>Tus clientes deberán pagar una parte del servicio al agendar.</small>
              </span>
            </label>
            <label className="service-payment-option">
              <input type="radio" name="service-payment" defaultChecked />
              <span>
                <strong>Se debe pagar en línea</strong>
                <small>Tus clientes deberán realizar el pago completo de este servicio en línea.</small>
              </span>
            </label>
            <div className="service-payment-discount">
              <Label htmlFor="service-online-discount">Descuento sólo para pago en línea</Label>
              <div className="service-discount-field">
                <span>%</span>
                <Input id="service-online-discount" className="admin-input" placeholder="Incentiva el pago en línea" />
              </div>
            </div>
            <label className="service-payment-option service-payment-option-muted">
              <input type="radio" name="service-payment" />
              <span>
                <strong>No se puede pagar en línea</strong>
                <small>Tus clientes no podrán pagar este servicio en línea pero sí agendarlo.</small>
              </span>
            </label>
          </div>
          <FilePicker
            label="Imágenes del servicio"
            recommendation="Hasta 3 imágenes, 200 × 200 px recomendado, máximo 3 MB."
            value={null}
            variant="service"
            onChange={() => toast.success("Imagen agregada al mock local.")}
          />
        </div>
      ) : (
        <div className="service-dialog-advanced space-y-4">
          <div className="service-advanced-heading">
            <h3>Modalidad del servicio</h3>
            <p>Define cómo se puede realizar y reservar este servicio.</p>
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Videoconferencia</p>
              <p className="admin-help">
                Permite realizar este servicio de manera remota.
              </p>
            </div>
            <Toggle
              checked={draft.videoConference ?? false}
              label="Videoconferencia"
              onChange={(checked) => update({ videoConference: checked })}
            />
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Este servicio se realiza a domicilio</p>
              <p className="admin-help">Permite ofrecerlo fuera del local.</p>
            </div>
            <Toggle
              checked={draft.homeService ?? false}
              label="Servicio a domicilio"
              onChange={(checked) => update({ homeService: checked })}
            />
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="font-medium">Precio incluye IVA</p>
              <p className="admin-help">
                Indica cómo presentar el precio al cliente.
              </p>
            </div>
            <Toggle
              checked={draft.priceIncludesTax ?? true}
              label="Precio incluye IVA"
              onChange={(checked) => update({ priceIncludesTax: checked })}
            />
          </div>
          <div className="admin-setting-row service-multiple-client-row">
            <div>
              <p className="font-medium">Permitir dos o más clientes</p>
              <p className="admin-help">
                Útil para experiencias compartidas y clases.
              </p>
            </div>
            <div className="service-client-count-wrap">
              <Input
                className="service-client-count admin-input"
                type="number"
                min={2}
                aria-label="Cantidad máxima de clientes"
                placeholder="Ingresa la cantidad de clientes"
                value={String(draft.maxClients ?? 2)}
                disabled={!draft.allowMultipleClients}
                onChange={(event) => {
                  const maxClients = Math.max(2, Number(event.target.value) || 2);
                  update({
                    maxClients,
                    ...(draft.type === "class" ? { capacity: maxClients } : {}),
                  });
                }}
              />
            </div>
            <Toggle
              checked={draft.allowMultipleClients ?? false}
              label="Permitir dos o más clientes"
              onChange={(checked) =>
                checked
                  ? update({
                      allowMultipleClients: true,
                      maxClients: Math.max(2, draft.maxClients ?? 2),
                    })
                  : update({ allowMultipleClients: false })
              }
            />
          </div>
          <div className="service-advanced-heading">
            <h3>Otros</h3>
            <p>Configura la forma en que se presenta y comisiona este servicio.</p>
          </div>
          <div className="service-commission-row">
            <Label htmlFor="service-commission">Comisión para el profesional</Label>
            <div className="service-commission-field">
              <Input
                id="service-commission"
                type="number"
                className="admin-input"
                placeholder="Ingresa una comisión"
                value={draft.commissionValue ? String(draft.commissionValue) : ""}
                onChange={(event) =>
                  update({ commissionValue: Number(event.target.value) || 0 })
                }
              />
              <select
                className="service-commission-select"
                value={draft.commissionUnit ?? "%"}
                aria-label="Unidad de comisión"
                onChange={(event) =>
                  update({ commissionUnit: event.target.value as "$" | "%" })
                }
              >
                <option value="%">%</option>
                <option value="$">$</option>
              </select>
            </div>
          </div>
          <div className="service-accordion service-resource-accordion">
            <button
              type="button"
              className="service-accordion-trigger"
              aria-expanded={resourceOpen}
              onClick={() => setResourceOpen((current) => !current)}
            >
              <span>
                <strong>Se necesita un Recurso para realizar el servicio</strong>
                <small>Si el servicio necesita un recurso para ser realizado, puedes seleccionarlo en la lista de abajo.</small>
              </span>
              {resourceOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {resourceOpen ? (
              <div className="service-accordion-content">
                <div className="service-accordion-info">
                  <Info className="h-5 w-5 shrink-0" />
                  <span>
                    Selecciona los instrumentos o herramientas necesarios para realizar este servicio.
                  </span>
                </div>
                {resources.length > 0 ? (
                  <div className="service-resource-list">
                    {resources.map((resource) => (
                      <CheckRow
                        key={resource.id}
                        checked={(draft.resourceIds ?? []).includes(resource.id)}
                        onChange={(checked) =>
                          update({
                            resourceIds: checked
                              ? [...(draft.resourceIds ?? []), resource.id]
                              : (draft.resourceIds ?? []).filter((id) => id !== resource.id),
                          })
                        }
                      >
                        <span className="service-resource-option">
                          <strong>{resource.name}</strong>
                          <small>{resource.category}</small>
                        </span>
                      </CheckRow>
                    ))}
                  </div>
                ) : (
                  <div className="service-empty-state">
                    <Search className="h-12 w-12" />
                    <strong>No hay recursos creados.</strong>
                    <span>Créalo desde Administración &gt; Recursos para vincularlo aquí.</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className="service-accordion service-hours-accordion">
            <button
              type="button"
              className="service-accordion-trigger"
              aria-expanded={specialHoursOpen}
              onClick={() => setSpecialHoursOpen((current) => !current)}
            >
              <span>
                <strong>El servicio se realiza en un horario especial</strong>
                <small>Puedes definir un horario especial para realizar este servicio.</small>
              </span>
              {specialHoursOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {specialHoursOpen ? (
              <div className="service-accordion-content">
                <div className="service-accordion-info">
                  <Info className="h-5 w-5 shrink-0" />
                  <span>
                    Ej: Sólo se realizan masajes en la mañana y no quieres que agenden otro horario. Estas restricciones son independientes del horario de los profesionales que proveen el servicio. <a href="#service-hours-info">Más info aquí.</a>
                  </span>
                </div>
                <div className="service-hours-options">
                  <strong>Selecciona el tipo de configuración</strong>
                  {[
                    ["none", "Sin restricción de tiempo"],
                    ["range", "Rango de tiempo (ej. mañana o tarde)"],
                    ["specific", "Horas específicas (ej. solo a las 14:30 y 18:30 hrs.)"],
                  ].map(([value, label]) => (
                    <label key={value} className="service-radio-option">
                      <input
                        type="radio"
                        name="special-hour-mode"
                        value={value}
                        checked={specialHours.mode === value}
                        onChange={() =>
                          updateSpecialHours({
                            mode: value as ServiceSpecialHoursMode,
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {specialHours.mode === "range" ? (
                  <div className="service-hours-range-grid">
                    <div className="space-y-2">
                      <Label htmlFor="special-hours-start">Desde</Label>
                      <select
                        id="special-hours-start"
                        className="admin-select"
                        value={specialHours.rangeStart}
                        onChange={(event) =>
                          updateSpecialHours({ rangeStart: event.target.value })
                        }
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="special-hours-end">Hasta</Label>
                      <select
                        id="special-hours-end"
                        className="admin-select"
                        value={specialHours.rangeEnd}
                        onChange={(event) =>
                          updateSpecialHours({ rangeEnd: event.target.value })
                        }
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}
                {specialHours.mode === "specific" ? (
                  <div className="service-hours-specific">
                    <p className="admin-help">
                      Selecciona las horas exactas en las que se puede reservar.
                    </p>
                    <div className="service-hours-time-grid">
                      {timeOptions.map((time) => (
                        <label key={time} className="service-time-option">
                          <input
                            type="checkbox"
                            checked={specialHours.specificTimes.includes(time)}
                            onChange={(event) =>
                              updateSpecialHours({
                                specificTimes: event.target.checked
                                  ? [...specialHours.specificTimes, time]
                                  : specialHours.specificTimes.filter(
                                      (current) => current !== time,
                                    ),
                              })
                            }
                          />
                          <span>{time}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
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
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [bulkTab, setBulkTab] = useState<"edit" | "upload">("edit");
  const [uploadFileName, setUploadFileName] = useState("");
  const editableServices = services.filter(
    (service) =>
      service.type === "service" &&
      (category === "all" || service.category === category) &&
      service.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const categories = [
    ...new Set(
      services
        .filter((service) => service.type === "service")
        .map((service) => service.category),
    ),
  ];
  useEffect(() => {
    if (open) {
      setPrices(
        Object.fromEntries(
          services.map((service) => [service.id, String(service.price)]),
        ),
      );
      setCategory("all");
      setSearch("");
      setBulkTab("edit");
      setUploadFileName("");
    }
  }, [open, services]);
  const changed = services.some(
    (service) => Number(prices[service.id]) !== service.price,
  );
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Carga masiva de precios"
      description="Edita los precios de tus servicios o sube una planilla Excel"
      onSave={() => {
        if (!changed || bulkTab === "upload") return;
        onSave(
          Object.fromEntries(
            Object.entries(prices).map(([id, price]) => [id, Number(price)]),
          ),
        );
        onOpenChange(false);
      }}
      saveDisabled={!changed || bulkTab === "upload"}
      saveLabel="Guardar cambios"
      cancelLabel="Cancelar"
      className="bulk-price-dialog"
      wide
    >
      <Tabs
        items={[
          { id: "edit", label: "Editar precios" },
          { id: "upload", label: "Subir plantilla" },
        ]}
        active={bulkTab}
        onChange={(value) => setBulkTab(value as "edit" | "upload")}
      />
      {bulkTab === "edit" ? (
      <>
      <div className="bulk-price-filters">
        <select
          className="bulk-price-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Input
          className="admin-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="🔍  Buscar servicio..."
        />
      </div>
      <div className="bulk-price-table">
        <div className="bulk-price-table-header">
          <span>Servicio</span>
          <span>Categoría</span>
          <span>Precio actual</span>
          <span>Nuevo precio</span>
        </div>
        {editableServices.map((service) => (
            <div
              key={service.id}
              className="bulk-price-table-row"
            >
              <span className="font-medium">{service.name}</span>
              <span className="text-slate-500">{service.category}</span>
              <span className="bulk-price-current">{currency(service.price)}</span>
              <div className="bulk-price-input">
                <Input
                  className="admin-input"
                  type="number"
                  value={prices[service.id] ?? ""}
                  onChange={(event) =>
                    setPrices((current) => ({
                      ...current,
                      [service.id]: event.target.value,
                    }))
                  }
                />
                <span>$</span>
              </div>
            </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Upload className="h-4 w-4" />
        También puedes subir una plantilla .xlsx desde la pestaña
        correspondiente.
      </div>
      </>
      ) : (
        <div className="bulk-upload-panel">
          <label htmlFor="bulk-price-upload" className="bulk-upload-dropzone">
            <FileText className="h-8 w-8 text-[#bca5d1]" />
            <span>
              Arrastra tu archivo .xlsx aquí o <strong>haz click para seleccionar</strong>
            </span>
            <small>Usa la misma plantilla que descargas desde la página de servicios</small>
            <input
              id="bulk-price-upload"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setUploadFileName(file.name);
                  toast.success("Plantilla seleccionada en mock.");
                }
              }}
            />
          </label>
          {uploadFileName ? (
            <p className="bulk-upload-file">Archivo seleccionado: {uploadFileName}</p>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
}

function ServicesSection({
  services,
  setServices,
  professionals,
  resources,
}: {
  services: ServiceRecord[];
  setServices: (
    value: ServiceRecord[] | ((current: ServiceRecord[]) => ServiceRecord[]),
  ) => void;
  professionals: ProfessionalRecord[];
  resources: ResourceRecord[];
}) {
  const [tab, setTab] = useState<ServiceRecord["type"]>("service");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([
    "Faciales",
    "Masajes",
    "MEMBRESIAS",
    "Seguimientos",
    "Otros",
    "Clases",
    "Experiencias",
    "Adicionales",
  ]);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [serviceDialog, setServiceDialog] = useState(false);
  const [newType, setNewType] = useState<ServiceRecord["type"]>("service");
  const [newServiceSessions, setNewServiceSessions] = useState<number | undefined>(undefined);
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
  const newMenuOptions: {
    value: ServiceRecord["type"];
    label: string;
    description: string;
    sessions?: number;
  }[] = [
    { value: "service", label: "Servicio", description: "Agrega los servicios que realiza la empresa." },
    { value: "service", label: "Servicio con sesiones", description: "Crea servicios con una cantidad de sesiones determinada.", sessions: 5 },
    { value: "class", label: "Clase", description: "Tipo de servicio al que puedes agregar múltiples personas." },
    { value: "package", label: "Paquete", description: "Crea un nuevo paquete (grupo de servicios). Pueden ser reservados en paralelo o secuencial." },
    { value: "add-on", label: "Adicional", description: "Crea adicionales que luego se añadirán a los servicios." },
  ];
  const visible = services.filter(
    (service) =>
      service.type === tab &&
      service.name
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase().trim()),
  );
  const tabCategories: Record<ServiceRecord["type"], string[]> = {
    service: ["Faciales", "Masajes", "MEMBRESIAS", "Seguimientos", "Otros"],
    class: ["Clases"],
    package: ["Membresias", "Experiencias"],
    "add-on": ["Adicionales"],
  };
  const visibleCategories = [
    ...new Set([
      ...tabCategories[tab],
      ...visible.map((service) => service.category),
    ]),
  ];
  const grouped = visibleCategories
    .map((category) => ({
      category,
      items: visible.filter((service) => service.category === category),
    }))
    .filter((group) => group.items.length > 0 || tab === "service");
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
            <Popover>
              <PopoverTrigger asChild>
                <Button className="admin-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="admin-popover new-service-menu p-2">
                {newMenuOptions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="new-service-menu-item"
                    onClick={() => {
                      setNewType(item.value);
                      setNewServiceSessions(item.sessions);
                      setEditing(null);
                      setServiceDialog(true);
                    }}
                  >
                    <span className="new-service-menu-title">{item.label}</span>
                    <span className="new-service-menu-description">{item.description}</span>
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
        <div className="service-catalog-actions">
          <Button
            variant="link"
            className="service-catalog-action"
            onClick={() => setBulkOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Carga masiva de precios
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="link" className="service-catalog-action">
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="admin-popover service-download-menu p-0"
            >
              <Button
                variant="ghost"
                className="service-download-option"
                onClick={() =>
                  toast.success("Lista completa de servicios descargada en mock.")
                }
              >
                <Download className="mr-3 h-5 w-5" />
                Descargar lista completa de servicios
              </Button>
              <Button
                variant="ghost"
                className="service-download-option"
                onClick={() =>
                  toast.success("Plantilla de precios descargada en mock.")
                }
              >
                <Download className="mr-3 h-5 w-5" />
                Descargar plantilla para actualización masiva de precios
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
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
                  setNewServiceSessions(undefined);
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
        initialSessions={newServiceSessions}
        professionals={professionals}
        catalogServices={services}
        resources={resources}
        categories={categories}
        onCreateCategory={(category) =>
          setCategories((current) =>
            current.includes(category) ? current : [...current, category],
          )
        }
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
  const commissionableServices = services.filter(
    (service) => service.type !== "add-on",
  );
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
          : record?.id === "default"
            ? "Comisión por defecto"
            : `Comisión de ${record?.name ?? "servicio"}`
      }
      className="commission-dialog"
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
      <div className="commission-dialog-content">
        {record && (record.professionalId || record.id !== "default") ? (
          <InfoBanner icon={<WalletCards className="h-5 w-5" />}>
            {record?.professionalId
              ? "Puedes definir una comisión específica para cada servicio de este profesional."
              : "Puedes definir una comisión específica para este servicio."}
          </InfoBanner>
        ) : (
          <p className="text-sm text-slate-500">
            Al guardar, esta regla se aplicará como valor general para nuevos
            servicios.
          </p>
        )}
        <div className="commission-settings-grid">
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
          <div className="commission-service-grid" role="list">
            {commissionableServices.map((service) => (
              <div
                key={service.id}
                className="commission-service-card"
                role="listitem"
              >
                <span className="commission-service-name">{service.name}</span>
                <span className="commission-service-value">
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
  const [tab, setTab] = useState<"services" | "plans" | "products">(
    "services",
  );
  const [records, setRecords] =
    useState<CommissionRecord[]>(initialCommissions);
  const [serviceRecords, setServiceRecords] = useState<CommissionRecord[]>(
    () =>
      services
        .filter((service) => service.type !== "add-on")
        .map((service) => ({
          id: service.id,
          name: service.name,
          value: service.commissionValue ?? 0,
          unit: service.commissionUnit ?? "%",
        })),
  );
  const [editing, setEditing] = useState<CommissionRecord | null>(null);
  const [search, setSearch] = useState("");
  const [commissionView, setCommissionView] = useState<
    "professional" | "service"
  >("professional");
  const products = services.filter((service) => service.type === "add-on");
  const openDefaultCommission = () =>
    setEditing({
      id: "default",
      name: "Por defecto",
      value: 10,
      unit: "%",
    });
  return (
    <div className="commissions-section space-y-6">
      <SectionHeader
        title="Comisiones"
        description="Define reglas claras para repartir las comisiones de servicios y productos."
      />
      <Tabs
        className="commissions-tabs"
        items={[
          { id: "services", label: "Servicios" },
          { id: "plans", label: "Planes" },
          { id: "products", label: "Productos" },
        ]}
        active={tab}
        onChange={(value) =>
          setTab(value as "services" | "plans" | "products")
        }
      />
      {tab === "services" ? (
        <>
          <div className="commissions-toolbar">
            <div>
              <h2 className="admin-section-title commissions-subtitle">
                {commissionView === "professional"
                  ? "Comisiones por profesional"
                  : "Comisiones por servicio"}
              </h2>
              <p className="admin-help commissions-help">
                {commissionView === "professional"
                  ? "Personaliza el porcentaje o monto por cada miembro del equipo."
                  : "Personaliza el porcentaje o monto para cada servicio."}
              </p>
            </div>
            <div className="commissions-view-field">
              <SelectField
                id="commission-view"
                label="Ver comisiones por"
                value={commissionView}
                onChange={(value) =>
                  setCommissionView(value as "professional" | "service")
                }
                options={[
                  {
                    value: "professional",
                    label: "Ver las comisiones por profesional",
                  },
                  {
                    value: "service",
                    label: "Ver las comisiones por servicio",
                  },
                ]}
              />
            </div>
          </div>
          {commissionView === "professional" ? (
            <>
          <div className="commissions-professional-list">
            {records.map((record) => (
              <Card
                key={record.id}
                className="admin-card commission-professional-card"
              >
                <CardContent className="commission-professional-card-content">
                  <div className="commission-professional-copy">
                    <h3 className="commission-professional-name">
                      {record.name}
                    </h3>
                    <p className="commission-professional-meta">
                      {record.serviceCount ?? 0} servicios configurados ·{" "}
                      {record.value}
                      {record.unit}
                    </p>
                  </div>
                  <div className="commission-professional-actions">
                    <Button
                      variant="outline"
                      className="commission-edit-button"
                      onClick={() => setEditing(record)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      className="commission-default-record-button"
                      onClick={openDefaultCommission}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar por defecto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </>
          ) : (
            <div className="commissions-service-list">
              {serviceRecords.map((record) => (
                <Card
                  key={record.id}
                  className="admin-card commission-service-record-card"
                >
                  <CardContent className="commission-service-record-content">
                    <div className="commission-professional-copy">
                      <h3 className="commission-professional-name">
                        {record.name}
                      </h3>
                      <p className="commission-professional-meta">
                        Comisión por defecto: {record.value}
                        {record.unit}
                      </p>
                    </div>
                    <div className="commission-professional-actions">
                      <Button
                        variant="outline"
                        className="commission-edit-button"
                        onClick={() => setEditing(record)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        className="commission-default-record-button"
                        onClick={openDefaultCommission}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar por defecto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : tab === "plans" ? (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Búsqueda rápida"
          />
          <div className="commissions-plans-empty">
            <Search className="commissions-plans-empty-icon" />
            <p>No hay comisiones de membresías para mostrar.</p>
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
                    <div className="commission-professional-actions">
                      <Button
                        variant="outline"
                        className="commission-edit-button"
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
                      <Button
                        type="button"
                        className="commission-default-record-button"
                        onClick={openDefaultCommission}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar por defecto
                      </Button>
                    </div>
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
          if (record.professionalId || record.id === "default") {
            setRecords((current) =>
              current.some((item) => item.id === record.id)
                ? current.map((item) =>
                    item.id === record.id ? record : item,
                  )
                : [...current, record],
            );
          } else {
            setServiceRecords((current) =>
              current.some((item) => item.id === record.id)
                ? current.map((item) =>
                    item.id === record.id ? record : item,
                  )
                : [...current, record],
            );
          }
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
    schedule: createResourceSchedule(),
    specialDays: [],
  };
  const [draft, setDraft] = useState<ScheduledResourceRecord>(fresh);
  const [validationOpen, setValidationOpen] = useState(false);
  useEffect(() => {
    if (open) {
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
              schedule: createResourceSchedule(),
              specialDays: [],
            },
      );
      setValidationOpen(false);
    }
  }, [locals, open, resource]);
  const update = (patch: Partial<ScheduledResourceRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  return (
    <>
      <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={resource ? `Editar ${resource.name}` : "Nuevo recurso con horario"}
      onSave={() => {
        if (!draft.name.trim() || !draft.localId) {
          toast.error("Completa el nombre y el local.");
          return;
        }
        if (draft.serviceIds.length === 0) {
          setValidationOpen(true);
          return;
        }
        onSave(draft);
        onOpenChange(false);
      }}
      wide
      className="scheduled-resource-dialog"
    >
      <div className="scheduled-resource-form">
        <section className="scheduled-resource-dialog-card">
          <h3 className="admin-section-title">Datos del recurso</h3>
          <div className="mt-4 admin-form-grid">
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
            label="Bloque itinerario"
            value={String(draft.interval)}
            onChange={(value) => update({ interval: Number(value) })}
            options={[15, 20, 30, 45, 60].map((value) => ({
              value: String(value),
              label: `${value} minutos`,
            }))}
          />
          <div className="scheduled-resource-online">
            <Toggle
              checked={draft.acceptsOnline}
              label="Acepta reservas en línea"
              onChange={(checked) => update({ acceptsOnline: checked })}
            />
            <div>
              <p className="font-medium">Este recurso acepta reservas en línea</p>
              <p className="admin-help">
                El recurso podrá asignarse desde el sitio de reservas.
              </p>
            </div>
          </div>
          </div>
          <div className="scheduled-resource-service">
            <label htmlFor="scheduled-service" className="admin-label">
              Asigna un servicio
            </label>
            <select
              id="scheduled-service"
              className="admin-select"
              value=""
              onChange={(event) => {
                const serviceId = event.target.value;
                if (!serviceId || draft.serviceIds.includes(serviceId)) return;
                update({ serviceIds: [...draft.serviceIds, serviceId] });
              }}
            >
              <option value="">Selecciona una opción</option>
              {services
                .filter(
                  (service) =>
                    (service.type === "service" || service.type === "class") &&
                    !draft.serviceIds.includes(service.id),
                )
                .map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
            </select>
            {draft.serviceIds.length > 0 ? (
              <div
                className="scheduled-resource-service-tags"
                aria-label="Servicios asignados"
              >
                {draft.serviceIds.map((serviceId) => {
                  const service = services.find((item) => item.id === serviceId);
                  if (!service) return null;
                  return (
                    <span key={service.id} className="scheduled-resource-service-tag">
                      {service.name}
                      <button
                        type="button"
                        aria-label={`Quitar ${service.name}`}
                        onClick={() =>
                          update({
                            serviceIds: draft.serviceIds.filter(
                              (id) => id !== service.id,
                            ),
                          })
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
        <section className="scheduled-resource-dialog-card scheduled-resource-schedule-card">
          <div className="scheduled-resource-schedule-heading">
            <div>
              <h3 className="admin-section-title">Horario del recurso</h3>
              <p className="admin-help">
                Define cuándo puede reservarse este recurso en cada día de la semana.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ScheduleRows
              schedule={draft.schedule}
              withBreak
              onChange={(schedule) => update({ schedule })}
            />
          </div>
        </section>
      </div>
      </ModalShell>
      <ResourceValidationDialog
        open={validationOpen}
        onOpenChange={setValidationOpen}
      />
    </>
  );
}

function ResourceValidationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="resource-validation-dialog"
      >
        <div className="resource-validation-content">
          <div className="resource-validation-icon" aria-hidden="true">
            <X className="h-14 w-14" />
          </div>
          <DialogTitle className="resource-validation-title">Error</DialogTitle>
          <p className="resource-validation-message">
            Debes seleccionar al menos un servicio
          </p>
          <Button
            type="button"
            className="resource-validation-button"
            onClick={() => onOpenChange(false)}
          >
            Aceptar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  const [serviceCategory, setServiceCategory] = useState("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
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
  useEffect(() => {
    if (open) {
      setServiceCategory("all");
      setServiceSearch("");
      setCategoryPopoverOpen(false);
      setNewCategoryName("");
    }
  }, [open]);
  const update = (patch: Partial<ResourceRecord>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const eligibleServices = services.filter((service) => service.type !== "add-on");
  const serviceCategories = [
    "all",
    ...Array.from(new Set(eligibleServices.map((service) => service.category))),
  ];
  const visibleServices = eligibleServices.filter(
    (service) =>
      (serviceCategory === "all" || service.category === serviceCategory) &&
      service.name.toLocaleLowerCase().includes(serviceSearch.toLocaleLowerCase().trim()),
  );
  const resourceCategories = Array.from(
    new Set(["Tecnología", "Bienestar", "Consumibles", "Equipo", draft.category]),
  );
  const updateVisibleServices = (selected: boolean) =>
    update({
      serviceIds: selected
        ? Array.from(new Set([...draft.serviceIds, ...visibleServices.map((service) => service.id)]))
        : draft.serviceIds.filter(
            (id) => !visibleServices.some((service) => service.id === id),
          ),
    });
  const isLocalAvailable = (localId: string) =>
    Object.prototype.hasOwnProperty.call(draft.localQuantities, localId);
  const updateLocalAvailability = (localId: string, available: boolean) => {
    const localQuantities = { ...draft.localQuantities };
    if (available) localQuantities[localId] = localQuantities[localId] ?? 1;
    else delete localQuantities[localId];
    update({ localQuantities });
  };
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
      className="resource-dialog"
    >
      <div className="resource-dialog-form">
        <section className="resource-dialog-card resource-basic-card">
          <div className="resource-basic-fields">
            <Field
              id="resource-name"
              label="Nombre"
              required
              value={draft.name}
              onChange={(value) => update({ name: value })}
              placeholder="Nombre"
            />
            <div className="resource-category-field">
              <SelectField
                id="resource-category"
                label="Categoría"
                value={draft.category}
                onChange={(value) => update({ category: value })}
                options={resourceCategories.map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
              <Popover
                open={categoryPopoverOpen}
                onOpenChange={setCategoryPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <button type="button" className="resource-new-category-link">
                    Nueva categoría
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="admin-popover resource-category-popover p-3"
                >
                  <Label htmlFor="resource-new-category">Nueva categoría</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="resource-new-category"
                      value={newCategoryName}
                      placeholder="Ej. Equipamiento"
                      className="admin-input"
                      onChange={(event) => setNewCategoryName(event.target.value)}
                    />
                    <Button
                      type="button"
                      className="admin-primary"
                      onClick={() => {
                        const category = newCategoryName.trim();
                        if (!category) return;
                        update({ category });
                        setNewCategoryName("");
                        setCategoryPopoverOpen(false);
                      }}
                    >
                      Agregar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </section>
        <section className="resource-dialog-card resource-services-card">
          <div className="resource-dialog-card-heading">
            <h3 className="admin-section-title">Servicios</h3>
            <span className="resource-selected-count">
              {draft.serviceIds.length} Seleccionado(s)
            </span>
          </div>
          <div className="resource-services-picker">
            <div className="resource-service-categories">
              {serviceCategories.map((category) => {
                const categoryServices =
                  category === "all"
                    ? eligibleServices
                    : eligibleServices.filter((service) => service.category === category);
                const selectedCount = categoryServices.filter((service) =>
                  draft.serviceIds.includes(service.id),
                ).length;
                return (
                  <button
                    type="button"
                    key={category}
                    className={`resource-service-category ${serviceCategory === category ? "resource-service-category-active" : ""}`}
                    onClick={() => setServiceCategory(category)}
                  >
                    <span>{category === "all" ? "Todos" : category}</span>
                    <span>({selectedCount})</span>
                  </button>
                );
              })}
            </div>
            <div className="resource-service-results">
              <div className="resource-service-toolbar">
                <div className="resource-service-search">
                  <Search className="h-4 w-4" />
                  <Input
                    id="resource-service-search"
                    aria-label="Buscar servicios"
                    value={serviceSearch}
                    placeholder="Buscar servicio"
                    onChange={(event) => setServiceSearch(event.target.value)}
                  />
                </div>
                <div className="resource-service-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Seleccionar servicios visibles"
                    onClick={() => updateVisibleServices(true)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Quitar servicios visibles"
                    onClick={() => updateVisibleServices(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="resource-service-list">
                {visibleServices.length > 0 ? (
                  visibleServices.map((service) => (
                    <label key={service.id} className="resource-service-option">
                      <input
                        type="checkbox"
                        checked={draft.serviceIds.includes(service.id)}
                        onChange={(event) =>
                          update({
                            serviceIds: event.target.checked
                              ? [...draft.serviceIds, service.id]
                              : draft.serviceIds.filter((id) => id !== service.id),
                          })
                        }
                      />
                      <span>{service.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="resource-service-empty">No hay servicios que coincidan.</p>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="resource-dialog-card resource-locals-card">
          <h3 className="admin-section-title">Recurso disponible en:</h3>
          <div className="resource-local-table">
            <div className="resource-local-header">
              <span>Local</span>
              <span>Cantidad</span>
            </div>
            {locals.map((local) => {
              const available = isLocalAvailable(local.id);
              return (
                <div key={local.id} className="resource-local-row">
                  <label className="resource-local-name">
                    <input
                      type="checkbox"
                      checked={available}
                      onChange={(event) =>
                        updateLocalAvailability(local.id, event.target.checked)
                      }
                    />
                    <span>{local.name}</span>
                  </label>
                  <Input
                    className="admin-input resource-local-quantity"
                    type="number"
                    min="0"
                    disabled={!available}
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
              );
            })}
          </div>
        </section>
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
  const [specialScheduled, setSpecialScheduled] =
    useState<ScheduledResourceRecord | null>(null);
  const [resourceEditing, setResourceEditing] = useState<ResourceRecord | null>(
    null,
  );
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [localFilter, setLocalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirming, setConfirming] = useState<
    ScheduledResourceRecord | ResourceRecord | null
  >(null);
  const filteredScheduled = scheduled.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()) &&
    (localFilter === "all" || item.localId === localFilter) &&
    (statusFilter === "all" || item.status === statusFilter),
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
      <div className="resources-filter-bar">
        <div className="resources-filter-search">
          <Search className="h-4 w-4" />
          <Input
            aria-label="Búsqueda rápida de recursos"
            placeholder="Búsqueda rápida"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {tab === "scheduled" ? (
          <>
            <select
              aria-label="Filtrar por local"
              className="resources-filter-select"
              value={localFilter}
              onChange={(event) => setLocalFilter(event.target.value)}
            >
              <option value="all">Ver todos los resultados</option>
              {locals.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado"
              className="resources-filter-select"
              value={statusFilter === "all" ? "" : statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  (event.target.value || "all") as StatusFilter,
                )
              }
            >
              <option value="">Ver por</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="all">Todos</option>
            </select>
          </>
        ) : null}
      </div>
      {tab === "scheduled" ? (
        filteredScheduled.length === 0 ? (
          <EmptyState
            icon={<SlidersHorizontal className="h-6 w-6" />}
            title="Sin recursos con horario"
            description="Crea cabinas o espacios para asignarlos a la agenda."
          />
        ) : (
          <div className="grid gap-3">
            {filteredScheduled.map((resource) => (
              <Card
                className={`admin-card scheduled-resource-card ${resource.status === "inactive" ? "scheduled-resource-card-inactive" : ""}`.trim()}
                key={resource.id}
              >
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="flex gap-3">
                    <div className="scheduled-resource-icon">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#263649]">
                          {resource.name}
                        </h3>
                        <span className="scheduled-resource-status">
                          {resource.status === "active" ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          locals.find((local) => local.id === resource.localId)
                            ?.name
                        }{" "}
                        · bloques de {resource.interval} min
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-[#7460a4]"
                          onClick={() => setSpecialScheduled(resource)}
                        >
                          Abrir día
                        </Button>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-[#7460a4]"
                          onClick={() => {
                            setScheduledEditing(resource);
                            setScheduledOpen(true);
                          }}
                        >
                          Horario
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
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
                    <Toggle
                      checked={resource.status === "active"}
                      label={`${resource.status === "active" ? "Desactivar" : "Activar"} ${resource.name}`}
                      activeClassName="bg-[#0abf91]"
                      onChange={(checked) => {
                        setScheduled((current) =>
                          current.map((item) =>
                            item.id === resource.id
                              ? {
                                  ...item,
                                  status: checked ? "active" : "inactive",
                                }
                              : item,
                          ),
                        );
                        toast.success(
                          checked ? "Recurso activado." : "Recurso desactivado.",
                        );
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setConfirming(resource)}
                      aria-label={`Cambiar estado de ${resource.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
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
      <SpecialDayDialog
        open={Boolean(specialScheduled)}
        title={
          specialScheduled
            ? `Abrir día para ${specialScheduled.name}`
            : "Jornada especial"
        }
        days={specialScheduled?.specialDays ?? []}
        onOpenChange={(open) => {
          if (!open) setSpecialScheduled(null);
        }}
        onSave={(days) => {
          if (!specialScheduled) return;
          setScheduled((current) =>
            current.map((resource) =>
              resource.id === specialScheduled.id
                ? { ...resource, specialDays: days }
                : resource,
            ),
          );
          toast.success("Jornada especial guardada.");
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
  initialCategory,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  question: SurveyQuestion | null;
  initialCategory?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (question: SurveyQuestion) => void;
}) {
  const [draft, setDraft] = useState<SurveyQuestion>(
    question
      ? { ...question }
      : {
          id: makeId("question"),
          category: initialCategory ?? surveyCategories[0] ?? "Precio",
          type: "rating",
          text: "",
          description: "",
        },
  );
  useEffect(() => {
    if (open) {
      setDraft(
        question
          ? { ...question }
          : {
              id: makeId("question"),
              category: initialCategory ?? surveyCategories[0] ?? "Precio",
              type: "rating",
              text: "",
              description: "",
            },
      );
    }
  }, [initialCategory, open, question]);
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
      className="survey-question-dialog"
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
  onNewQuestion: (category: string) => void;
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(surveyCategories),
  );
  const [serviceSearch, setServiceSearch] = useState("");
  const surveyServices = services.filter((service) => service.type === "service");
  const selectedServices = surveyServices.filter((service) =>
    draft.serviceIds.includes(service.id),
  );
  const selectedQuestions = questions.filter((question) =>
    draft.questionIds.includes(question.id),
  );
  const visibleSurveyServices = surveyServices.filter((service) =>
    `${service.name} ${service.category}`
      .toLocaleLowerCase()
      .includes(serviceSearch.toLocaleLowerCase().trim()),
  );
  const toggleService = (serviceId: string) => {
    setDraft((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId],
    }));
  };
  useEffect(() => {
    if (open) {
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
      setExpandedCategories(new Set(surveyCategories));
      setServiceSearch("");
    }
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
      className="survey-dialog"
    >
      <div className="survey-dialog-layout">
        <div className="survey-editor-form">
          <section className="survey-editor-section">
          <Field
            id="survey-name"
            label="Nombre de la encuesta"
            required
            value={draft.name}
            onChange={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Ej. Experiencia después de tu visita"
          />
          <div className="survey-editor-block">
            <h3 className="admin-section-title">Seleccione los servicios</h3>
            <div className="survey-services-layout">
              <div className="survey-service-select-panel">
                <div className="survey-service-panel-heading">
                  <div>
                    <p className="survey-service-panel-title">Servicios incluidos</p>
                    <p className="survey-service-panel-help">
                      Agrega los servicios que quieres evaluar.
                    </p>
                  </div>
                  <span className="survey-service-count">
                    {selectedServices.length} seleccionados
                  </span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="survey-service-select-trigger"
                      aria-label="Abrir selector de servicios"
                    >
                      <span className="survey-service-select-placeholder">
                        {selectedServices.length > 0
                          ? "Agregar o quitar servicios"
                          : "Selecciona uno o más servicios"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="admin-popover survey-service-popover p-2"
                  >
                    <Label htmlFor="survey-service-search">Buscar servicio</Label>
                    <Input
                      id="survey-service-search"
                      value={serviceSearch}
                      onChange={(event) => setServiceSearch(event.target.value)}
                      placeholder="Ej. facial, masaje..."
                      className="admin-input mt-2"
                    />
                    <div className="survey-service-popover-list">
                      {visibleSurveyServices.length > 0 ? (
                        visibleSurveyServices.map((service) => {
                          const checked = draft.serviceIds.includes(service.id);
                          return (
                            <label
                              key={service.id}
                              className="survey-service-popover-option"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleService(service.id)}
                              />
                              <span className="survey-service-popover-copy">
                                <span>{service.name}</span>
                                <small>{service.category}</small>
                              </span>
                              {checked ? <Check className="h-4 w-4 text-[#0abf91]" /> : null}
                            </label>
                          );
                        })
                      ) : (
                        <p className="survey-service-empty">No hay servicios que coincidan.</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="survey-selected-service-chips">
                  {selectedServices.length > 0 ? (
                    selectedServices.map((service) => (
                      <span key={service.id} className="survey-selected-service-chip">
                        <span>{service.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleService(service.id)}
                          aria-label={`Quitar ${service.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="survey-selected-service-empty">
                      Los servicios seleccionados aparecerán aquí.
                    </p>
                  )}
                </div>
              </div>
              <div className="survey-service-visual-panel">
                <div className="survey-service-panel-heading">
                  <div>
                    <p className="survey-service-panel-title">Catálogo de servicios</p>
                    <p className="survey-service-panel-help">
                      Haz clic en una tarjeta para incluirla en la encuesta.
                    </p>
                  </div>
                  <span className="survey-service-count">
                    {surveyServices.length} disponibles
                  </span>
                </div>
                <div className="survey-service-visual-list">
                  {surveyServices.map((service) => {
                    const checked = draft.serviceIds.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        className={`survey-service-visual-card${checked ? " is-selected" : ""}`}
                        aria-pressed={checked}
                        onClick={() => toggleService(service.id)}
                      >
                        <span className="survey-service-visual-check">
                          {checked ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className="survey-service-visual-copy">
                          <span className="survey-service-visual-name">{service.name}</span>
                          <span className="survey-service-visual-meta">
                            {service.category} · {service.duration} min · {currency(service.price)}
                          </span>
                        </span>
                        <span className="survey-service-visual-action">
                          {checked ? "Incluido" : "Agregar"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </section>
          <section className="survey-editor-section">
            <h3 className="admin-section-title">Seleccione las preguntas</h3>
            <div className="survey-question-categories">
            {surveyCategories.map((category) => {
              const categoryQuestions = questions.filter(
                (question) => question.category === category,
              );
              const selectedCount = categoryQuestions.filter((question) =>
                draft.questionIds.includes(question.id),
              ).length;
              return (
                <details
                  key={category}
                  open={expandedCategories.has(category)}
                  className="survey-question-category"
                >
                  <summary
                    className="survey-question-category-heading"
                    onClick={(event) => {
                      event.preventDefault();
                      setExpandedCategories((current) => {
                        const next = new Set(current);
                        if (next.has(category)) next.delete(category);
                        else next.add(category);
                        return next;
                      });
                    }}
                  >
                    <span>{category}</span>
                    <span className="survey-question-category-meta">
                      {selectedCount > 0
                        ? `${selectedCount} seleccionada(s)`
                        : "Sin seleccionar"}
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </summary>
                  <div className="survey-question-category-body">
                    {categoryQuestions.length > 0 ? (
                      categoryQuestions.map((question) => (
                        <label
                          key={question.id}
                          className={`survey-question-option${draft.questionIds.includes(question.id) ? " is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={draft.questionIds.includes(question.id)}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                questionIds: event.target.checked
                                  ? [...current.questionIds, question.id]
                                  : current.questionIds.filter(
                                      (id) => id !== question.id,
                                    ),
                              }))
                            }
                          />
                          <span>{question.text}</span>
                        </label>
                      ))
                    ) : (
                      <p className="survey-question-empty">Sin preguntas todavía.</p>
                    )}
                    <div className="survey-question-category-action">
                      <p>¿No encuentras la pregunta que necesitas?</p>
                      <Button
                        type="button"
                        className="survey-new-question-button"
                        onClick={() => onNewQuestion(category)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva pregunta
                      </Button>
                    </div>
                  </div>
                </details>
              );
            })}
            </div>
          </section>
        </div>
        <section className="survey-live-preview" aria-label="Vista previa de la encuesta">
          <div className="survey-preview-heading">
            <div>
              <span className="survey-preview-eyebrow">Vista previa</span>
              <h3>Así verá tu cliente la encuesta</h3>
            </div>
            <span className="survey-preview-count">
              {selectedQuestions.length} preguntas
            </span>
          </div>
          <div className="survey-preview-paper">
            <div className="survey-preview-brand">Keysar Cosmetics</div>
            <h4>{draft.name.trim() || "Nombre de la encuesta"}</h4>
            <div className="survey-preview-services">
              <span>Servicio evaluado</span>
              <strong>
                {selectedServices.length > 0
                  ? selectedServices.map((service) => service.name).join(" · ")
                  : "Selecciona un servicio"}
              </strong>
            </div>
            {selectedQuestions.length > 0 ? (
              <div className="survey-preview-questions">
                {selectedQuestions.map((question, index) => (
                  <article className="survey-preview-question" key={question.id}>
                    <span className="survey-preview-question-number">{index + 1}</span>
                    <div className="survey-preview-question-content">
                      <p>{question.text}</p>
                      {question.type === "rating" ? (
                        <div className="survey-preview-stars" aria-label="Pregunta de cinco estrellas">
                          {Array.from({ length: 5 }, (_, starIndex) => (
                            <Star key={starIndex} className="h-5 w-5" />
                          ))}
                        </div>
                      ) : (
                        <div className="survey-preview-comment-lines">
                          <span />
                          <span />
                        </div>
                      )}
                      {question.description ? (
                        <small>{question.description}</small>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="survey-preview-empty">
                <Star className="h-6 w-6" />
                <p>Marca una pregunta para verla aquí.</p>
              </div>
            )}
          </div>
        </section>
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
  const [newQuestionCategory, setNewQuestionCategory] = useState(
    surveyCategories[0] ?? "Precio",
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
        onNewQuestion={(category) => {
          setQuestionEditing(null);
          setNewQuestionCategory(category);
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
        initialCategory={newQuestionCategory}
        onOpenChange={setQuestionOpen}
        onSave={(question) => {
          setQuestions((current) =>
            current.some((item) => item.id === question.id)
              ? current.map((item) =>
                  item.id === question.id ? question : item,
                )
              : [...current, question],
          );
          toast.success(`Pregunta guardada en ${question.category}.`);
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

function ConsentFileDropzone({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const inputId = "consent-file";
  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no puede superar 5 MB.");
      return;
    }
    onChange(file.name);
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    handleFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0]);
  };
  return (
    <div className="consent-file-field">
      <div className="consent-file-label-row">
        <div>
          <p className="admin-label">Archivo del consentimiento</p>
          <p className="admin-help">PDF, DOC o DOCX · máximo 5 MB</p>
        </div>
        {value ? <Badge className="consent-file-ready">Archivo listo</Badge> : null}
      </div>
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.doc,.docx"
        className="sr-only"
        onChange={handleChange}
      />
      <label
        htmlFor={inputId}
        className={`consent-file-dropzone${value ? " has-file" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="consent-file-dropzone-icon">
          <Upload className="h-5 w-5" />
        </span>
        <span className="consent-file-dropzone-copy">
          <strong>{value ?? "Arrastra tu documento aquí"}</strong>
          <small>{value ? "Haz clic para reemplazarlo" : "o haz clic para seleccionar un archivo"}</small>
        </span>
        <span className="consent-file-dropzone-action">Seleccionar</span>
      </label>
      <div className="consent-file-note">
        <Info className="h-4 w-4" />
        <span>El documento quedará disponible para asociarlo a una cita.</span>
      </div>
      {value ? (
        <button
          type="button"
          className="consent-file-remove"
          onClick={() => onChange(null)}
        >
          <X className="h-3.5 w-3.5" />
          Quitar archivo
        </button>
      ) : null}
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
      wide
      className="consent-dialog"
      onSave={() => {
        if (!draft.name.trim()) {
          toast.error("Escribe un nombre para el consentimiento.");
          return;
        }
        if (!draft.fileName) {
          toast.error("Adjunta el archivo del consentimiento.");
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
        <ConsentFileDropzone
          value={draft.fileName}
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
  const consentColumns = useMemo<ColumnDef<ConsentRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Consentimiento",
        cell: ({ row }) => (
          <div className="consent-table-name">
            <span className="consent-table-icon">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p>{row.original.name}</p>
              <span>{row.original.status === "active" ? "Publicado" : "Borrador"}</span>
            </div>
          </div>
        ),
      },
      {
        accessorFn: (row) => row.fileName ?? "Sin archivo adjunto",
        id: "fileName",
        header: "Archivo",
        cell: ({ row }) => (
          <div className="consent-table-file">
            <FileText className="h-4 w-4" />
            <span>{row.original.fileName ?? "Sin archivo adjunto"}</span>
          </div>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Última actualización",
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="consent-table-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row.original);
                setOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConfirming(row.original)}
              aria-label={`Eliminar ${row.original.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );
  const attachedCount = consents.filter((consent) => consent.fileName).length;
  const activeCount = consents.filter((consent) => consent.status === "active").length;
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
      <div className="consents-overview">
        <div className="consents-overview-copy">
          <span className="consents-overview-icon">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <span className="consents-overview-eyebrow">Biblioteca de documentos</span>
            <h2>Consentimientos listos para tu agenda</h2>
            <p>Sube y organiza los documentos que tus clientes deben conocer antes de una cita.</p>
          </div>
        </div>
        <div className="consents-overview-stats">
          <div>
            <strong>{consents.length}</strong>
            <span>Documentos</span>
          </div>
          <div>
            <strong>{attachedCount}</strong>
            <span>Con archivo</span>
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>Activos</span>
          </div>
        </div>
      </div>
      <Card className="admin-card consents-table-card">
        <CardContent className="p-4 sm:p-5">
          <div className="consents-table-heading">
            <div>
              <h2>Documentos guardados</h2>
              <p>Administra el nombre, archivo y disponibilidad de cada consentimiento.</p>
            </div>
            <span>{consents.length} registros</span>
          </div>
          <DataTable
            columns={consentColumns}
            data={consents}
            emptyMessage="Todavía no hay consentimientos."
            searchPlaceholder="Buscar consentimiento o archivo"
          />
        </CardContent>
      </Card>
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
  "{{nombre_empresa}}",
  "{{instagram}}",
  "{{facebook}}",
  "{{sitio_web}}",
];
const messageTokenGroups = [
  {
    label: "Datos de la reserva",
    tokens: [
      "{{nombre_cliente}}",
      "{{apellido_cliente}}",
      "{{profesional}}",
      "{{nombre_servicio}}",
      "{{precio_reserva}}",
      "{{fecha_hora_reserva}}",
      "{{link_pago}}",
    ],
  },
  {
    label: "Datos del local",
    tokens: [
      "{{nombre_local}}",
      "{{ubicacion_local}}",
      "{{telefono_local}}",
    ],
  },
  {
    label: "Datos de la compañía",
    tokens: [
      "{{nombre_empresa}}",
      "{{instagram}}",
      "{{facebook}}",
      "{{sitio_web}}",
    ],
  },
];
const messagePreviewValues: Record<string, string> = {
  "{{nombre_cliente}}": "Juan",
  "{{apellido_cliente}}": "Pérez",
  "{{profesional}}": "María",
  "{{nombre_servicio}}": "Facial Signature",
  "{{precio_reserva}}": "$950",
  "{{fecha_hora_reserva}}": "11/03/2026 a las 9:00",
  "{{nombre_local}}": "Keysar Polanco",
  "{{ubicacion_local}}": "Av. Presidente Masaryk 123",
  "{{telefono_local}}": "+52 55 1234 5678",
  "{{link_pago}}": "keysarcosmetics.com/pagar",
  "{{nombre_empresa}}": "Keysar Cosmetics",
  "{{instagram}}": "@keysarcosmetics",
  "{{facebook}}": "Keysar Cosmetics",
  "{{sitio_web}}": "keysarcosmetics.com",
};
const messageTokenLabels: Record<string, string> = {
  "{{nombre_cliente}}": "Nombre cliente",
  "{{apellido_cliente}}": "Apellido cliente",
  "{{profesional}}": "Profesional",
  "{{nombre_servicio}}": "Nombre servicio",
  "{{precio_reserva}}": "Precio reserva",
  "{{fecha_hora_reserva}}": "Fecha y hora reserva",
  "{{link_pago}}": "Link de pago",
  "{{nombre_local}}": "Nombre local",
  "{{ubicacion_local}}": "Ubicación local",
  "{{telefono_local}}": "Teléfono local",
  "{{nombre_empresa}}": "Compañía",
  "{{instagram}}": "Instagram",
  "{{facebook}}": "Facebook",
  "{{sitio_web}}": "Tu página web",
};

const formatMessagePreview = (message: string) =>
  messageTokens.reduce(
    (formatted, token) =>
      formatted.split(token).join(messagePreviewValues[token] ?? token),
    message,
  );

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
    name: "Descuento por cumpleaños",
    message: `¡Feliz cumpleaños, {{nombre_cliente}} {{apellido_cliente}}!

En este día especial,
queremos desearte un día lleno de alegría, amor y momentos inolvidables.
Esperamos que este nuevo año te traiga todo lo que deseas y más.

¡Como muestra de nuestro aprecio, te ofrecemos un descuento especial en tu próximo servicio en {{nombre_local}}!`,
  },
  {
    name: "Bienvenida",
    message: "Hola {{nombre_cliente}}, bienvenida a Keysar Cosmetics.",
  },
  {
    name: "Mensaje para redes sociales",
    message:
      "Hola {{nombre_cliente}}, conoce más de {{nombre_empresa}} en {{instagram}}.",
  },
  {
    name: "Recordatorio de pago",
    message:
      "Hola {{nombre_cliente}}, puedes completar tu reserva aquí: {{link_pago}}.",
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
      description="Crea mensajes reutilizables y agrega datos de la reserva con un clic."
      onSave={() => {
        if (!draft.name.trim() || !draft.message.trim()) {
          toast.error("Completa el nombre y el mensaje.");
          return;
        }
        onSave({ ...draft, name: draft.name.trim(), updatedAt: "Ahora" });
        onOpenChange(false);
      }}
      wide
      className="whatsapp-message-dialog"
    >
      <div className="whatsapp-dialog-form">
        <section className="whatsapp-form-section">
          <Field
            id="whatsapp-name"
            label="Nombre del mensaje"
            required
            value={draft.name}
            onChange={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Ej. Recordatorio de cita"
          />
        </section>
        <section className="whatsapp-form-section">
          <div className="mb-4">
            <p className="admin-label mb-1">Personaliza el mensaje <span className="text-rose-500">*</span></p>
            <p className="text-xs text-slate-500">
              Escribe el texto y usa las tarjetas para insertar datos de la cita automáticamente.
            </p>
          </div>
          <div className="whatsapp-token-groups">
            {messageTokenGroups.map((group) => (
              <div className="whatsapp-token-group" key={group.label}>
                <p>{group.label}</p>
                <div className="whatsapp-token-list">
                  {group.tokens.map((token) => (
                    <button
                      type="button"
                      key={token}
                      className="whatsapp-token-button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          message: `${current.message}${current.message ? " " : ""}${token}`,
                        }))
                      }
                    >
                      {messageTokenLabels[token] ?? token}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="whatsapp-composer-grid">
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
              className="admin-textarea whatsapp-message-textarea"
              placeholder="Escribe el mensaje que recibirá tu cliente."
            />
            <div className="whatsapp-preview-panel">
              <p className="whatsapp-preview-title">Previsualización del mensaje</p>
              <div className="whatsapp-phone-preview">
                <div className="whatsapp-phone-notch" />
                <div className="whatsapp-phone-header">
                  <MessageCircle className="h-4 w-4" />
                  <span>Keysar Cosmetics</span>
                  <span className="ml-auto text-[10px] opacity-75">en línea</span>
                </div>
                <div className="whatsapp-phone-body">
                  <div className="whatsapp-message-bubble">
                    {draft.message
                      ? formatMessagePreview(draft.message)
                      : "Tu mensaje aparecerá aquí."}
                    <span className="whatsapp-message-time">9:00 ✓✓</span>
                  </div>
                </div>
              </div>
              <Button
                variant="link"
                className="mt-3 h-auto px-0 text-[#7460a4]"
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
        </section>
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
      description="Elige una plantilla como punto de partida, edítala y adáptala a tu negocio."
      wide
      className="whatsapp-template-dialog"
    >
      <div className="whatsapp-template-layout">
        <div className="whatsapp-template-selector">
          <p className="whatsapp-template-intro">
            Selecciona un mensaje prediseñado para usarlo como base. Podrás editar el texto y agregar variables en el siguiente paso.
          </p>
          <div className="whatsapp-template-list">
          {messageTemplates.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={`whatsapp-template-option ${selected === index ? "is-selected" : ""}`}
              onClick={() => setSelected(index)}
            >
              <span>{item.name}</span>
              <small>{item.message}</small>
            </button>
          ))}
          </div>
        </div>
        <div className="whatsapp-template-preview">
          <p className="whatsapp-preview-title">Previsualización del mensaje</p>
          <div className="whatsapp-phone-preview whatsapp-phone-preview-large">
            <div className="whatsapp-phone-notch" />
            <div className="whatsapp-phone-header">
              <MessageCircle className="h-4 w-4" />
              <span>Keysar Cosmetics</span>
              <span className="ml-auto text-[10px] opacity-75">en línea</span>
            </div>
            <div className="whatsapp-phone-body">
              <div className="whatsapp-message-bubble">
                {formatMessagePreview(template.message)}
                <span className="whatsapp-message-time">9:00 ✓✓</span>
              </div>
            </div>
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
  const [optionsOpenFor, setOptionsOpenFor] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<WhatsAppMessageRecord | null>(
    null,
  );
  const activeMessages = messages.filter((message) => message.status === "active").length;
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
      <div className="whatsapp-overview-card">
        <div>
          <p className="whatsapp-overview-eyebrow">Catálogo de mensajes</p>
          <h2>Mensajes listos para cada momento de la reserva</h2>
          <p>
            Mantén una comunicación consistente y personalizada con tus clientes.
          </p>
        </div>
        <div className="whatsapp-overview-stats">
          <div>
            <strong>{activeMessages}</strong>
            <span>Activos</span>
          </div>
          <div>
            <strong>{messages.length}</strong>
            <span>Mensajes</span>
          </div>
        </div>
      </div>
      <div className="whatsapp-message-list">
        {messages.map((message) => (
          <Card className="whatsapp-message-row" key={message.id}>
            <CardContent className="whatsapp-message-row-content">
              <div className="whatsapp-row-icon">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="whatsapp-row-main">
                <div className="flex flex-wrap items-center gap-2">
                  <h3>{message.name}</h3>
                  <StatusBadge status={message.status} />
                </div>
                <p>{message.message}</p>
                <Button
                  variant="link"
                  className="whatsapp-view-message"
                  onClick={() => {
                    setEditing(message);
                    setOpen(true);
                  }}
                >
                  <Eye className="mr-1.5 h-4 w-4" />
                  Ver mensaje
                </Button>
              </div>
              <div className="whatsapp-row-actions">
                <span className="whatsapp-row-updated">Actualizado {message.updatedAt}</span>
                <Popover
                  open={optionsOpenFor === message.id}
                  onOpenChange={(value) =>
                    setOptionsOpenFor(value ? message.id : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Opciones
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="admin-popover whatsapp-options-menu"
                  >
                    <button
                      type="button"
                      className="whatsapp-options-item whatsapp-options-item-danger"
                      onClick={() => {
                        setOptionsOpenFor(null);
                        setConfirming(message);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOptionsOpenFor(null);
                    setEditing(message);
                    setOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
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
  initialType = "service",
  services,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  giftCard: GiftCardRecord | null;
  initialType?: GiftCardRecord["type"];
  services: ServiceRecord[];
  onOpenChange: (open: boolean) => void;
  onSave: (giftCard: GiftCardRecord) => void;
}) {
  const createDraft = (type: GiftCardRecord["type"]): GiftCardRecord => ({
    id: makeId("gift"),
    name: "",
    type,
    serviceIds: [],
    amount: 0,
    salePrice: 0,
    expiration: 90,
    description: "",
    design: "arena",
    status: "draft",
  });
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<GiftCardRecord>(
    giftCard
      ? { ...giftCard, serviceIds: [...giftCard.serviceIds] }
      : createDraft(initialType),
  );
  useEffect(() => {
    if (open) {
      setDraft(
        giftCard
          ? { ...giftCard, serviceIds: [...giftCard.serviceIds] }
          : createDraft(initialType),
      );
      setStep(1);
    }
  }, [giftCard, initialType, open]);
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
          ? "Editar"
          : `Nueva gift card de ${draft.type === "service" ? "servicio" : "monto"}`
      }
      onSave={step === 2 ? () => save("active") : undefined}
      saveLabel="Activar"
      wide
      className="gift-card-dialog"
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
              onChange={(type) => {
                const nextType = type as GiftCardRecord["type"];
                update({
                  type: nextType,
                  serviceIds: [],
                  amount: nextType === "amount" ? draft.salePrice : 0,
                });
              }}
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
              <div className="mt-3">
                <MultiCombobox
                  id="gift-services"
                  value={draft.serviceIds}
                  onValueChange={(serviceIds) => {
                    const addedServiceId = serviceIds.find(
                      (serviceId) => !draft.serviceIds.includes(serviceId),
                    );
                    const addedService = services.find(
                      (service) => service.id === addedServiceId,
                    );
                    update({
                      serviceIds,
                      ...(addedService ? { amount: addedService.price } : {}),
                    });
                  }}
                  placeholder="Selecciona uno o más servicios"
                  searchPlaceholder="Buscar servicio"
                  emptyMessage="No hay servicios que coincidan"
                  className="gift-services-trigger"
                  options={services
                    .filter((service) => service.type === "service")
                    .map((service) => ({
                      value: service.id,
                      label: `${service.name} · ${currency(service.price)}`,
                    }))}
                />
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
  const [newType, setNewType] = useState<GiftCardRecord["type"]>("service");
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
                    setNewType("service");
                    setOpen(true);
                  }}
                >
                  Gift card de servicio
                </button>
                <button
                  type="button"
                  className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#f0ebf6]"
                  onClick={() => {
                    setEditing(null);
                    setNewType("amount");
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
        initialType={newType}
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
  onSelectSection,
}: {
  active: AdminSection;
  onOpenMenu: () => void;
  onSelectSection: (section: AdminSection) => void;
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
          <SchedulerPrimaryNav
            activeAdmin={active}
            activeArea="administration"
            onAdministrationSelect={onSelectSection}
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 xl:hidden">
            <ReportsNavMenu compact />
            <AdministrationNavMenu
              active={active}
              compact
              onSelect={onSelectSection}
            />
          </div>
          <button
            type="button"
            className="scheduler-header-button hidden xl:flex"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 xl:block">
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
            resources={initialResources}
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
        onSelectSection={selectSection}
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
