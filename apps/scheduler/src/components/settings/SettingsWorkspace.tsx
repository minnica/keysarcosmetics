"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  FileCheck2,
  Globe2,
  Instagram,
  ImagePlus,
  Link2,
  Mail,
  MapPinned,
  MessageCircle,
  MessageSquareText,
  Palette,
  Save,
  Search,
  Smartphone,
  Star,
  Settings2,
  Share2,
  SlidersHorizontal,
  Store,
  Upload,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { SchedulerPrimaryNav } from "@/components/SchedulerPrimaryNav";
import { SettingsMenu } from "@/components/SettingsMenu";
import { useEffect, useRef, useState, type DragEvent } from "react";

type SettingsSection =
  | "company"
  | "website"
  | "agenda"
  | "payments"
  | "register"
  | "reminders"
  | "records"
  | "emails"
  | "integrations"
  | "notifications"
  | "clients"
  | "surveys"
  | "authorizations";

type CompanySettings = {
  companyName: string;
  description: string;
  bookingSlug: string;
  logo: string;
  siteColor: string;
  modifyColor: string;
  cancelColor: string;
  linkProSlug: string;
  linkProGreeting: string;
  instagram: string;
  facebook: string;
  website: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  address: string;
};

const storageKey = "keysar-scheduler-company-settings";
const initialSettings: CompanySettings = {
  companyName: "KEYSAR COSMETICS MÉXICO",
  description:
    "Queremos cuidar de ti y de tu piel con nuestros faciales y masajes corporales exclusivos.",
  bookingSlug: "keysarcosmetics",
  logo: "/logo.svg",
  siteColor: "#263941",
  modifyColor: "#F57808",
  cancelColor: "#E46B6B",
  linkProSlug: "keysarcosmetics",
  linkProGreeting: "¡Nos encanta que estés aquí!",
  instagram: "",
  facebook: "",
  website: "",
  tiktok: "",
  youtube: "",
  whatsapp: "525580561135",
  address: "Ciudad de México, México",
};

const sidebarGroups: Array<{
  label: string;
  items: Array<{ id: SettingsSection; label: string; icon: typeof Building2 }>;
}> = [
  {
    label: "Información básica",
    items: [
      { id: "company", label: "Empresa", icon: Building2 },
      { id: "website", label: "Sitio web", icon: Globe2 },
      { id: "agenda", label: "Agenda", icon: CalendarDays },
      { id: "payments", label: "Pagos Keysar", icon: WalletCards },
      { id: "register", label: "Sistema de caja", icon: Store },
      { id: "reminders", label: "Recordatorios", icon: Bell },
      { id: "records", label: "Fichas médicas", icon: ClipboardList },
    ],
  },
  {
    label: "Opciones avanzadas",
    items: [
      { id: "emails", label: "E-mails", icon: Mail },
      { id: "integrations", label: "Integraciones", icon: SlidersHorizontal },
      { id: "notifications", label: "Notificaciones", icon: Bell },
      { id: "clients", label: "Clientes", icon: UsersRound },
      { id: "surveys", label: "Encuestas", icon: MessageSquareText },
      { id: "authorizations", label: "Códigos de autorización", icon: FileCheck2 },
    ],
  },
];

const sectionLabels = Object.fromEntries(
  sidebarGroups.flatMap((group) => group.items.map((item) => [item.id, item.label])),
) as Record<SettingsSection, string>;

function SettingsHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
      <div className="flex min-h-[78px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <Link className="flex min-w-0 items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-3 py-2 sm:px-4" href="/">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(195,165,131,0.28),rgba(236,209,200,0.12))] ring-1 ring-white/10">
              <img alt="Keysar Cosmetics" className="h-7 w-7 object-contain" src="/logo.svg" />
            </span>
            <span className="hidden sm:block">
              <span className="admin-brand-title block">Keysar Scheduler</span>
              <span className="block text-[0.62rem] uppercase tracking-[0.28em] text-white/45">Agenda interna</span>
            </span>
          </Link>
          <SchedulerPrimaryNav activeArea="settings" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button aria-label="Buscar" className="scheduler-header-button hidden xl:flex" type="button">
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 xl:block">
            Reservas online
          </div>
          <SettingsMenu active />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">ER</div>
        </div>
      </div>
    </header>
  );
}

function SettingsSidebar({ active, onSelect }: { active: SettingsSection; onSelect: (section: SettingsSection) => void }) {
  return (
    <aside className="settings-sidebar">
      {sidebarGroups.map((group) => (
        <section key={group.label} className="settings-sidebar-group">
          <p className="settings-sidebar-label">{group.label}</p>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={active === item.id ? "settings-sidebar-item settings-sidebar-item-active" : "settings-sidebar-item"}
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  type="button"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </section>
      ))}
    </aside>
  );
}

type SetCompanyField = <Key extends keyof CompanySettings>(key: Key, value: CompanySettings[Key]) => void;

function ColorField({
  id,
  label,
  help,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="settings-field-label" htmlFor={id}>{label}</Label>
      {help ? <p className="settings-field-help">{help}</p> : null}
      <label className="settings-color-field" htmlFor={id}>
        <input id={id} onChange={(event) => onChange(event.target.value)} type="color" value={value} />
        <span className="font-medium text-slate-600">{value.toUpperCase()}</span>
      </label>
    </div>
  );
}

function BookingSitePreview({ color, logo }: { color: string; logo: string }) {
  const content = (
    <div className="booking-preview-page">
      <div className="booking-preview-topbar">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white p-1">
            <img alt="" className="h-full w-full object-contain" src={logo} />
          </span>
          <span className="h-1.5 w-16 rounded-full bg-slate-200" />
        </span>
        <span className="h-1.5 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="booking-preview-hero" style={{ background: `linear-gradient(115deg, ${color}, ${color}99)` }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-2 shadow-sm">
          <img alt="" className="h-full w-full object-contain" src={logo} />
        </span>
        <span className="space-y-1.5">
          <span className="block h-2 w-20 rounded-full bg-white/70" />
          <span className="block h-1.5 w-28 rounded-full bg-white/40" />
        </span>
      </div>
      <div className="booking-preview-people">
        {["MR", "CR", "MG", "CG", "CH"].map((initials) => <span key={initials}>{initials}</span>)}
      </div>
      <div className="booking-preview-services">
        {[0, 1, 2].map((item) => (
          <span key={item} className={item === 1 ? "border-current" : ""} style={item === 1 ? { color } : undefined}>
            <i className="block h-2 w-16 rounded-full bg-slate-200" />
            <i className="mt-2 block h-1.5 w-full rounded-full bg-slate-100" />
            <i className="mt-1 block h-1.5 w-2/3 rounded-full bg-slate-100" />
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="settings-devices">
      <div className="settings-browser-preview">{content}</div>
      <div className="settings-phone-preview">{content}</div>
    </div>
  );
}

function PersonalizationPanel({ settings, setField }: { settings: CompanySettings; setField: SetCompanyField }) {
  return (
    <div className="settings-panel-body space-y-6">
      <div className="settings-subcard">
        <div className="flex items-center gap-3">
          <Globe2 className="h-5 w-5 text-[#ad8b67]" />
          <h3 className="font-semibold text-slate-700">Sitio web</h3>
        </div>
        <div className="settings-info-banner">
          <Star className="h-4 w-4 shrink-0" />
          Te sugerimos usar el color principal de tu comunicación y elegir un tono oscuro para mantener buena legibilidad.
        </div>
        <div className="max-w-xs">
          <ColorField id="site-color" label="Color principal del sitio web" onChange={(value) => setField("siteColor", value)} value={settings.siteColor} />
        </div>
        <div>
          <p className="settings-field-label">Previsualización del sitio de reservaciones</p>
          <p className="settings-field-help mt-1">La imagen es una muestra de cómo se verán tus colores en escritorio y móvil.</p>
          <BookingSitePreview color={settings.siteColor} logo={settings.logo} />
        </div>
      </div>

      <div className="settings-subcard">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-[#ad8b67]" />
          <h3 className="font-semibold text-slate-700">E-mails de recordatorios</h3>
        </div>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <ColorField id="modify-color" label="Color para modificar" help="Personaliza el botón para modificar." onChange={(value) => setField("modifyColor", value)} value={settings.modifyColor} />
          <ColorField id="cancel-color" label="Color para cancelar" help="Personaliza el botón para cancelar." onChange={(value) => setField("cancelColor", value)} value={settings.cancelColor} />
        </div>
        <div>
          <p className="settings-field-label">Previsualización del correo para tus clientes</p>
          <div className="settings-email-preview">
            <div className="settings-email-sheet">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <img alt="Keysar Cosmetics" className="h-8 w-8 object-contain" src={settings.logo} />
                <span className="text-[0.42rem] uppercase tracking-widest text-slate-400">Tu empresa</span>
              </div>
              <p className="mt-5 text-center text-[0.6rem] text-slate-600">Tu reserva fue recibida exitosamente</p>
              <button className="mx-auto mt-3 block rounded px-6 py-2 text-[0.5rem] text-white" style={{ background: settings.siteColor }} type="button">Confirmar reserva</button>
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-[0.52rem] font-semibold text-slate-600">Datos de la reserva</p>
                <div className="mt-3 h-2 w-2/3 rounded-full bg-slate-200" />
                <div className="mt-2 h-2 w-1/2 rounded-full bg-slate-200" />
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <span className="rounded px-4 py-2 text-[0.48rem] text-white" style={{ background: settings.modifyColor }}>Modificar reserva</span>
                <span className="rounded px-4 py-2 text-[0.48rem] text-white" style={{ background: settings.cancelColor }}>Cancelar reserva</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkProPhone({ settings }: { settings: CompanySettings }) {
  return (
    <div className="linkpro-phone">
      <div className="linkpro-notch" />
      <div className="linkpro-screen">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white p-3 shadow-lg">
          <img alt="Logo" className="h-full w-full object-contain" src={settings.logo} />
        </span>
        <h4 className="mt-4 text-center text-xl font-semibold text-white">{settings.companyName}</h4>
        <p className="mt-1 text-center text-sm text-white/70">{settings.linkProGreeting}</p>
        <div className="mt-7 space-y-3">
          {[
            { icon: CalendarDays, label: "Agenda tu próxima cita" },
            { icon: Globe2, label: "Visita nuestra web" },
            { icon: MessageCircle, label: "Hablar por WhatsApp" },
            { icon: MapPinned, label: "Nuestra ubicación" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div className="linkpro-action" key={item.label}>
                <span><Icon className="h-5 w-5" /></span>
                <b>{item.label}</b>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InstagramSourcePhone({ settings }: { settings: CompanySettings }) {
  return (
    <div className="linkpro-phone linkpro-phone-source">
      <div className="linkpro-notch" />
      <div className="linkpro-source-screen">
        <div className="flex items-center gap-3">
          <span className="h-16 w-16 rounded-full bg-slate-200" />
          <span className="flex-1 space-y-2"><i /><i /><i /></span>
        </div>
        <p className="mt-6 text-lg font-semibold text-slate-800">{settings.companyName}</p>
        <div className="mt-3 space-y-2"><i className="block h-3 w-36 rounded-full bg-slate-200" /><i className="block h-3 w-52 max-w-full rounded-full bg-slate-200" /></div>
        <div className="mt-8 grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }, (_, index) => <span className="aspect-square rounded bg-slate-200" key={index} />)}
        </div>
      </div>
    </div>
  );
}

function LinkProPanel({ settings, setField }: { settings: CompanySettings; setField: SetCompanyField }) {
  const linkProUrl = `https://keysar.link/mx/${settings.linkProSlug || "tuempresa"}`;
  const companyLinks = [
    { label: "Tu página web", value: settings.website || "Sin información", active: Boolean(settings.website) },
    { label: "Sitio de reservaciones", value: `${settings.bookingSlug}.reservas.keysar.mx`, active: true },
    { label: "WhatsApp", value: settings.whatsapp || "Sin información", active: Boolean(settings.whatsapp) },
    { label: "Ubicación", value: settings.address || "Sin información", active: Boolean(settings.address) },
  ];

  return (
    <div className="settings-panel-body">
      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="linkpro-slug">Enlace para tu biografía de Instagram o TikTok</Label>
            <div className="flex gap-2">
              <Input className="settings-input" id="linkpro-slug" onChange={(event) => setField("linkProSlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} value={settings.linkProSlug} />
              <Button className="h-12 rounded-[16px] border-[#e5d9cf] bg-white text-slate-600" onClick={() => { void navigator.clipboard.writeText(linkProUrl); toast.success("Enlace LinkPro copiado."); }} variant="outline"><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="break-all text-xs font-medium text-[#ad8b67]">{linkProUrl}</p>
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="linkpro-greeting">Invitación o saludo para tus clientes</Label>
            <Textarea className="settings-textarea" id="linkpro-greeting" maxLength={90} onChange={(event) => setField("linkProGreeting", event.target.value)} value={settings.linkProGreeting} />
            <p className="text-right text-xs text-slate-400">{settings.linkProGreeting.length}/90</p>
          </div>
          <div>
            <p className="settings-field-label mb-2">Revisa los enlaces de tu empresa</p>
            <div className="settings-links-list">
              {companyLinks.map((item) => (
                <div className="flex gap-3 py-3" key={item.label}>
                  <span className={item.active ? "settings-link-check settings-link-check-active" : "settings-link-check"}>{item.active ? <Check className="h-3.5 w-3.5" /> : null}</span>
                  <span className="min-w-0"><b className="block text-sm text-slate-700">{item.label}</b><span className="block truncate text-xs text-slate-400">{item.value}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="settings-linkpro-preview" style={{ background: `radial-gradient(circle at 50% 10%, ${settings.siteColor}33, transparent 38%), #f7f5f2` }}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div><p className="settings-field-label">Vista previa de LinkPro</p><p className="settings-field-help mt-1">Así se verá en dispositivos móviles.</p></div>
            <Smartphone className="h-5 w-5 text-[#ad8b67]" />
          </div>
          <div className="settings-linkpro-phones">
            <InstagramSourcePhone settings={settings} />
            <LinkProPhone settings={settings} />
            <span className="settings-linkpro-url">{linkProUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialPanel({ settings, setField }: { settings: CompanySettings; setField: SetCompanyField }) {
  const fields: Array<{ key: keyof CompanySettings; label: string; placeholder: string }> = [
    { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/keysarcosmetics" },
    { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/keysarcosmetics" },
    { key: "website", label: "Sitio web", placeholder: "https://www.keysarcosmetics.com" },
    { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@keysarcosmetics" },
    { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@keysarcosmetics" },
  ];
  return (
    <div className="settings-panel-body">
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[#f8f4ef] p-4 text-sm text-slate-500">
        <Instagram className="mt-0.5 h-5 w-5 shrink-0 text-[#ad8b67]" />
        Estos enlaces aparecerán en tu sitio público y alimentarán automáticamente la tarjeta LinkPro.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <div className={field.key === "website" ? "space-y-2 lg:col-span-2" : "space-y-2"} key={field.key}>
            <Label className="settings-field-label" htmlFor={`social-${field.key}`}>{field.label}</Label>
            <Input className="settings-input" id={`social-${field.key}`} onChange={(event) => setField(field.key, event.target.value)} placeholder={field.placeholder} type="url" value={settings[field.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyPanel() {
  const [settings, setSettings] = useState(initialSettings);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      setSettings({ ...initialSettings, ...(JSON.parse(saved) as Partial<CompanySettings>) });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function setField<Key extends keyof CompanySettings>(key: Key, value: CompanySettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function loadLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setField("logo", String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    loadLogo(event.dataTransfer.files[0]);
  }

  function saveSettings() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    toast.success("Configuración guardada correctamente.");
  }

  const bookingUrl = `${settings.bookingSlug || "tu-negocio"}.reservas.keysar.mx`;

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Información básica</p>
            <h1 className="settings-title">Empresa</h1>
            <p className="settings-description">Configura el nombre, la descripción y la dirección pública de tu sitio de reservaciones.</p>
          </div>
          <Button className="scheduler-modal-cta" onClick={saveSettings} type="button">
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>

        <div className="settings-form-grid">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="company-name">Nombre de tu empresa</Label>
            <p className="settings-field-help">El nombre que aparecerá en la agenda y en tu sitio web.</p>
            <Input className="settings-input" id="company-name" onChange={(event) => setField("companyName", event.target.value)} value={settings.companyName} />
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="company-description">Descripción</Label>
            <p className="settings-field-help">Cuéntale a tus clientes sobre tus servicios y propuesta de valor.</p>
            <Textarea className="settings-textarea" id="company-description" onChange={(event) => setField("description", event.target.value)} value={settings.description} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(15rem,0.72fr)]">
            <div>
              <Label className="settings-field-label">Tu logo</Label>
              <input accept="image/*" className="hidden" onChange={(event) => loadLogo(event.target.files?.[0])} ref={fileInput} type="file" />
              <button
                className="settings-upload"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                type="button"
              >
                <span className="settings-upload-icon"><Upload className="h-7 w-7" /></span>
                <span className="font-semibold text-slate-700">Arrastra o selecciona una imagen</span>
                <span className="text-xs text-slate-400">PNG, JPG o WEBP · máximo 2 MB</span>
              </button>
            </div>
            <div>
              <Label className="settings-field-label">Previsualización</Label>
              <div className="settings-logo-preview">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#172230] p-5 shadow-[0_18px_40px_rgba(23,34,48,0.2)]">
                  {settings.logo ? <img alt="Vista previa del logo" className="h-full w-full object-contain" src={settings.logo} /> : <ImagePlus className="h-8 w-8 text-white/60" />}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="booking-slug">Dirección de tu sitio web de reservaciones</Label>
            <p className="settings-field-help">Personaliza tu enlace para compartir una dirección clara y fácil de recordar.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#e5d9cf] bg-white focus-within:ring-2 focus-within:ring-[#c3a583]/25">
                <Input
                  className="h-12 min-w-0 rounded-none border-0 shadow-none focus-visible:ring-0"
                  id="booking-slug"
                  onChange={(event) => setField("bookingSlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  value={settings.bookingSlug}
                />
                <span className="flex items-center border-l border-[#e5d9cf] bg-[#faf7f3] px-4 text-sm text-slate-400">.reservas.keysar.mx</span>
              </div>
              <Button
                className="h-12 rounded-[16px] border-[#e5d9cf] bg-white px-4 text-slate-600 hover:bg-[#faf7f3]"
                onClick={() => {
                  void navigator.clipboard.writeText(`https://${bookingUrl}`);
                  toast.success("Enlace copiado.");
                }}
                variant="outline"
                type="button"
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar enlace
              </Button>
            </div>
          </div>
        </div>
      </section>

      {[
        { id: "personalization", title: "Personalización", description: "Configura colores, tipografías y apariencia de tu sitio.", icon: Palette },
        { id: "linkpro", title: "Tarjeta de presentación para redes sociales · LinkPro", description: "Reúne tus enlaces y contenido de marca en una sola página.", icon: Link2 },
        { id: "social", title: "Redes sociales", description: "Conecta los perfiles oficiales de tu empresa.", icon: Share2 },
      ].map((panel) => {
        const Icon = panel.icon;
        const open = openPanel === panel.id;
        return (
          <section className="settings-collapsible" key={panel.id}>
            <button className="flex w-full items-center gap-4 p-5 text-left" onClick={() => setOpenPanel(open ? null : panel.id)} type="button">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  {panel.id === "linkpro" ? <span className="rounded-full bg-[#ad8b67] px-2 py-0.5 text-[0.58rem] uppercase tracking-wider text-white">Nuevo</span> : null}
                  {panel.title}
                </span>
                <span className="mt-1 block text-sm text-slate-400">{panel.description}</span>
              </span>
              {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </button>
            {open ? (
              <div className="border-t border-[#eee6df]">
                {panel.id === "personalization" ? <PersonalizationPanel settings={settings} setField={setField} /> : null}
                {panel.id === "linkpro" ? <LinkProPanel settings={settings} setField={setField} /> : null}
                {panel.id === "social" ? <SocialPanel settings={settings} setField={setField} /> : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function PendingSettingsPanel({ section }: { section: SettingsSection }) {
  return (
    <section className="settings-card flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f5ede4] text-[#ad8b67]"><Settings2 className="h-7 w-7" /></span>
        <p className="settings-kicker mt-6">Configuraciones</p>
        <h1 className="settings-title mt-2">{sectionLabels[section]}</h1>
        <p className="mt-3 text-slate-500">El acceso ya forma parte del menú. El contenido de esta sección se incorporará en la siguiente etapa.</p>
      </div>
    </section>
  );
}

export function SettingsWorkspace() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("company");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <SettingsHeader />
      <div className="settings-layout">
        <SettingsSidebar active={activeSection} onSelect={setActiveSection} />
        <main className="min-w-0 p-4 sm:p-6 xl:p-8">
          {activeSection === "company" ? <CompanyPanel /> : <PendingSettingsPanel section={activeSection} />}
        </main>
      </div>
    </div>
  );
}
