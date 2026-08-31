"use client";

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
  GripVertical,
  Globe2,
  Instagram,
  ImagePlus,
  Link2,
  List,
  Mail,
  MapPinned,
  MessageCircle,
  MessageSquareText,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  Smartphone,
  Star,
  Settings2,
  Share2,
  SlidersHorizontal,
  Trash2,
  MoreHorizontal,
  Eye,
  ChevronRight,
  Upload,
  UsersRound,
  WalletCards,
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
  AlertDialogTrigger,
  Button,
  type ColumnDef,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  schedulerAgendaSettingsChangeEvent,
  schedulerAgendaSettingsStorageKey,
  schedulerAgendaSlotOptions,
} from "@/lib/scheduler-agenda-settings";

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

const SETTINGS_SECTION_CHANGE_EVENT = "scheduler-settings-section-change";

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

type AgendaSettings = {
  slotMinutes: string;
  allowOverlapping: boolean;
  allowClientSimultaneous: boolean;
  allowResourceOverload: boolean;
  requireContact: boolean;
  requireMedicalRecord: boolean;
  limitClientBookings: boolean;
  limitScope: string;
  limitQuantity: string;
  limitPeriod: string;
  limitUnit: "weeks" | "months";
  allowBlockedTimeBookings: boolean;
  allowExtendedHours: boolean;
  extendedFromHour: string;
  extendedFromMinute: string;
  extendedToHour: string;
  extendedToMinute: string;
  additionalFields: Record<
    AgendaAdditionalFieldId,
    { enabled: boolean; required: boolean }
  >;
};

type AgendaAdditionalFieldId =
  | "email"
  | "phone"
  | "additionalPhone"
  | "taxId"
  | "address"
  | "municipality"
  | "city"
  | "birthDate"
  | "age"
  | "gender"
  | "clientNumber";

type PaymentSettings = {
  bankName: string;
  bankInstitution: string;
  bankClabe: string;
  onlinePayments: boolean;
  paymentLink: string;
  allowOnlineStatusEdit: boolean;
  publicKey: string;
  accessToken: string;
};

type RegisterSettings = {
  enableSalesBox: boolean;
  trackCash: boolean;
  requireClientPayment: boolean;
  allowPriceEditing: boolean;
  requireServiceInfo: boolean;
  requireCashierCode: boolean;
  showDecimals: boolean;
  legalName: string;
  taxId: string;
  taxRegime: string;
  fiscalAddress: string;
  additionalInfo: string;
  showClientInfo: boolean;
  showProfessionalName: boolean;
  separateBranchBilling: boolean;
  differentiateVat: boolean;
  receiptSize: string;
  paymentMethods: Array<{
    id: string;
    name: string;
    active: boolean;
    requireCode: boolean;
  }>;
  commissions: {
    attended: boolean;
    noReservation: boolean;
    completePayment: boolean;
  };
};

type ReminderSettings = {
  emailBookingChanges: boolean;
  emailReminder: boolean;
  whatsappBookingCreated: boolean;
  whatsappReminder: boolean;
};

type SurveySettings = {
  enabled: boolean;
  sendDelayHours: string;
};

type AuthorizationCode = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  reservations: boolean;
  cashRegister: boolean;
  downloads: boolean;
};

type AuthorizationSettings = {
  requireForReservations: boolean;
  requireForCashRegister: boolean;
  requireForDownloads: boolean;
  codes: AuthorizationCode[];
};

type AuthorizationCodeDraft = Omit<AuthorizationCode, "id"> & {
  id: string | null;
};

type EmailSettings = {
  senders: Array<{ id: string; email: string; confirmed: boolean }>;
  signature: string;
  birthdayEnabled: boolean;
  birthdaySubject: string;
  birthdayBody: string;
  birthdayLink: string;
};

type ClientSettings = {
  version: number;
  automaticClientNumber: boolean;
  validateDuplicateEmail: boolean;
  validateDuplicatePhone: boolean;
  categories: Array<{
    id: string;
    name: string;
    expanded: boolean;
    fields: Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      requiredForClient: boolean;
      askInCalendar: boolean;
      requiredInCalendar: boolean;
      askOnline: boolean;
      requiredOnline: boolean;
      options: string[];
    }>;
  }>;
  filters: Array<{ id: string; name: string }>;
};

type ClientFieldDraft = {
  id: string | null;
  categoryId: string;
  name: string;
  description: string;
  type: string;
  requiredForClient: boolean;
  askInCalendar: boolean;
  requiredInCalendar: boolean;
  askOnline: boolean;
  requiredOnline: boolean;
  options: string[];
};

type ClientFieldOptionsDraft = {
  categoryId: string;
  fieldId: string;
  fieldName: string;
  options: string[];
};

type MedicalField = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
};

type MedicalCategory = {
  id: string;
  name: string;
  accent: "pink" | "blue" | "orange";
  expanded: boolean;
  fields: MedicalField[];
};

type MedicalSettings = { categories: MedicalCategory[] };

function comparableMedicalSettings(settings: MedicalSettings) {
  return {
    categories: settings.categories.map(
      ({ expanded: _expanded, ...category }) => category,
    ),
  };
}

const storageKey = "keysar-scheduler-company-settings";
const paymentsStorageKey = "keysar-scheduler-payments-settings";
const registerStorageKey = "keysar-scheduler-register-settings";
const remindersStorageKey = "keysar-scheduler-reminders-settings";
const surveysStorageKey = "keysar-scheduler-surveys-settings";
const authorizationsStorageKey = "keysar-scheduler-authorizations-settings";
const emailsStorageKey = "keysar-scheduler-emails-settings";
const clientsStorageKey = "keysar-scheduler-clients-settings";
const medicalStorageKey = "keysar-scheduler-medical-settings";
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

const initialPaymentSettings: PaymentSettings = {
  bankName: "LIRON KEYSAR",
  bankInstitution: "BBVA BANCOMER",
  bankClabe: "012180014412523215",
  onlinePayments: true,
  paymentLink: "https://pay.agendapro.com/mx/keysarcosmetics/",
  allowOnlineStatusEdit: true,
  publicKey: "",
  accessToken: "",
};

const initialRegisterSettings: RegisterSettings = {
  enableSalesBox: true,
  trackCash: true,
  requireClientPayment: true,
  allowPriceEditing: true,
  requireServiceInfo: false,
  requireCashierCode: false,
  showDecimals: true,
  legalName: "KEYSAR COSMETICS",
  taxId: "KALI850128U28",
  taxRegime: "",
  fiscalAddress: "MARIANO ESCOBEDO ANAHUAC 1 SECCION CDMX",
  additionalInfo: "",
  showClientInfo: false,
  showProfessionalName: false,
  separateBranchBilling: false,
  differentiateVat: false,
  receiptSize: "fiscal",
  paymentMethods: [
    { id: "cash", name: "Efectivo", active: true, requireCode: false },
    {
      id: "credit-card",
      name: "Tarjeta de Crédito",
      active: true,
      requireCode: false,
    },
    {
      id: "debit-card",
      name: "Tarjeta de Débito",
      active: true,
      requireCode: false,
    },
    { id: "giftcard", name: "Giftcard", active: false, requireCode: false },
    {
      id: "bank-transfer",
      name: "Transferencia Bancaria",
      active: true,
      requireCode: false,
    },
  ],
  commissions: { attended: true, noReservation: false, completePayment: false },
};

const initialReminderSettings: ReminderSettings = {
  emailBookingChanges: false,
  emailReminder: false,
  whatsappBookingCreated: false,
  whatsappReminder: false,
};

const initialSurveySettings: SurveySettings = {
  enabled: true,
  sendDelayHours: "0",
};

const initialAuthorizationSettings: AuthorizationSettings = {
  requireForReservations: true,
  requireForCashRegister: false,
  requireForDownloads: true,
  codes: [
    {
      id: "axel-blancas",
      name: "Axel blancas",
      code: "19001",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "luis-velazco",
      name: "LUIS VELAZCO",
      code: "2428",
      active: false,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "michelle-perez",
      name: "MICHELLE PEREZ",
      code: "8899",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "rafael-ceglia",
      name: "Rafael Ceglia",
      code: "3278",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "emiliano-luna",
      name: "Emiliano Luna",
      code: "0512",
      active: false,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "abel-ambrosini",
      name: "ABEL AMBROSINI",
      code: "1515",
      active: false,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "edy",
      name: "edy",
      code: "1615",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "paulo-avalos",
      name: "Paulo Avalos",
      code: "3536",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "omri-nissim",
      name: "OMRI NISSIM",
      code: "1818",
      active: false,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "kevin",
      name: "Kevin",
      code: "4321",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "rosa",
      name: "rosa",
      code: "1516",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
    {
      id: "daniel-rojas",
      name: "Daniel rojas",
      code: "1111",
      active: true,
      reservations: true,
      cashRegister: false,
      downloads: true,
    },
  ],
};

const initialEmailSettings: EmailSettings = {
  senders: [{ id: "sender-1", email: "correo", confirmed: false }],
  signature: "",
  birthdayEnabled: true,
  birthdaySubject: "OPATRA MEXICO\nTe desea un feliz cumpleaños",
  birthdayBody: "Pregunta por tu promo cumpleañero",
  birthdayLink: "https://keysarcosmetics.site.agendapro.com/mx",
};

const initialClientSettings: ClientSettings = {
  version: 5,
  automaticClientNumber: true,
  validateDuplicateEmail: true,
  validateDuplicatePhone: false,
  categories: [
    {
      id: "other",
      name: "Otros",
      expanded: true,
      fields: [
        {
          id: "representative",
          name: "REPRESENTANTE",
          description: "",
          type: "Categórico",
          requiredForClient: false,
          askInCalendar: false,
          requiredInCalendar: false,
          askOnline: false,
          requiredOnline: false,
          options: [
            "Natasha",
            "MOSHE",
            "NANCY",
            "AXEL BLANCAS",
            "MARIANA RIVAS",
            "Gerson",
            "Lucas Quille",
            "Denisson Bolivar",
            "Abigail Cornelio",
            "Bayan Becerra",
            "ANDREA STEPHANI RADA CASTILLO",
            "ANDRÉS VARGAS",
            "CARLOS FRANCISCO MARTINEZ AYALA",
            "CLIENTES OPATRA",
            "Dolores Rodriguez",
            "DANIEL MOLINA",
            "EDUARDO STANBINSKI MILLER",
            "ELLUZ KASSANDRA HERNANDEZ SANCHEZ",
            "Eduardo Bravo",
            "ISMAEL CRUZ",
          ],
        },
        {
          id: "shared-with",
          name: "COMPARTIDA CON",
          description: "",
          type: "Categórico",
          requiredForClient: false,
          askInCalendar: false,
          requiredInCalendar: false,
          askOnline: false,
          requiredOnline: false,
          options: [
            "Natasha",
            "MOSHE",
            "NANCY",
            "AXEL BLANCAS",
            "MARIANA RIVAS",
            "Gerson Barrada",
            "Manuel Martinez",
            "Eduardo Bravo",
            "Abel Ambrosini",
            "Abigail Cornelio",
            "Opatra london",
            "Keysar Cosmetics",
            "No aplica",
            "Andrea Rada",
            "Andres Vargas",
            "BRAYAN BECERRA",
            "BOAS NIELSEN",
            "Carlos Francisco",
            "Denisson Bolivar",
            "Dolores Rodriguez",
          ],
        },
        {
          id: "phone-advisor",
          name: "ASESOR TELEFÓNICO",
          description: "",
          type: "Categórico",
          requiredForClient: false,
          askInCalendar: false,
          requiredInCalendar: false,
          askOnline: false,
          requiredOnline: false,
          options: [
            "FERNANDO ROSAS",
            "SARA GUTIÉRREZ",
            "NALELLI SALOMÉ",
            "ROSA GONZÁLEZ",
            "MANUEL ORTEGA",
          ],
        },
        {
          id: "origin-branch",
          name: "SUCURSAL ORIGEN",
          description: "",
          type: "Categórico",
          requiredForClient: false,
          askInCalendar: false,
          requiredInCalendar: false,
          askOnline: false,
          requiredOnline: false,
          options: [
            "KEYSAR LEADS",
            "DELTA",
            "MASARYK",
            "MITIKAH CELES",
            "MITIKAH VIP",
            "OPATRA",
            "GALERIAS INSURGENTES",
            "Otra",
          ],
        },
        {
          id: "facialist",
          name: "FACIALISTA",
          description: "",
          type: "Categórico",
          requiredForClient: false,
          askInCalendar: false,
          requiredInCalendar: false,
          askOnline: false,
          requiredOnline: false,
          options: [
            "Karla Guzmán",
            "Sandra",
            "Araceli",
            "Monserrath Guzmán",
            "Nahomi",
            "Citlali",
            "Fabiola Gonzalez",
            "Brenda Chavez",
            "Joana Nicole",
            "Andrea Gamorra",
            "Elizabeth García",
            "Otra",
          ],
        },
      ],
    },
  ],
  filters: [{ id: "representative", name: "REPRESENTANTE" }],
};

const initialMedicalSettings: MedicalSettings = {
  categories: [
    {
      id: "follow-up",
      name: "Comentarios de seguimiento",
      accent: "blue",
      expanded: true,
      fields: [
        {
          id: "session-comments",
          name: "ingresa los comentarios de la sesión",
          type: "Área de texto",
          required: true,
        },
      ],
    },
    {
      id: "clinical",
      name: "FICHA CLÍNICA",
      accent: "blue",
      expanded: true,
      fields: [
        {
          id: "pathologies",
          name: "PATOLOGÍAS Y CONTRAINDICACIONES",
          type: "Selección Múltiple",
          required: true,
          options: [
            "MARCACASOS",
            "QUELOIDE",
            "VITILIGO",
            "DERMATITIS",
            "CLOASMA",
            "TIROIDES",
            "CÁNCER",
            "EMBARAZO",
            "CIRUGÍAS",
            "FOLICULITIS",
            "LUPUS",
            "ACNÉ",
            "ROSÁCEA",
            "VPH",
            "HERPES",
            "MELASMA",
            "MÁCULA",
            "SENSIVLE / REACTIVA",
            "EXPUESTA A QUÍMICOS",
            "PIEL DELGADA/FRÁGIL",
            "Otra",
          ],
        },
        {
          id: "main-goals",
          name: "OBJETIVOS PRINCIPALES",
          type: "Selección Múltiple",
          required: true,
          options: [
            "Otra",
            "HIDRATACIÓN",
            "HUMECTACIÓN",
            "SENSIBILIDAD",
            "PIEL ASFIXIADA",
            "NUTRICIÓN",
          ],
        },
        {
          id: "secondary-goals",
          name: "OBJETIVOS SECUNDARIOS",
          type: "Selección Múltiple",
          required: true,
          options: [
            "Otra",
            "Arrugas",
            "Líneas de expresión",
            "Elasticidad y textura",
            "Firmeza",
            "Pigmentación",
            "Piel desvitalizada",
          ],
        },
      ],
    },
    {
      id: "authorization",
      name: "AUTORIZACIÓN DE TRATAMIENTO",
      accent: "orange",
      expanded: true,
      fields: [
        {
          id: "photo-consent",
          name: "Accedo y autorizo a seguir con control fotográfico y pre y post tratamientos u otros",
          type: "Binario (Sí/No)",
          required: true,
        },
        {
          id: "medical-history",
          name: "He comunicado todas las enfermedades médicas conocidas y es mi responsabilidad",
          type: "Binario (Sí/No)",
          required: true,
        },
      ],
    },
  ],
};

const initialAgendaSettings: AgendaSettings = {
  slotMinutes: "60",
  allowOverlapping: true,
  allowClientSimultaneous: true,
  allowResourceOverload: true,
  requireContact: true,
  requireMedicalRecord: false,
  limitClientBookings: false,
  limitScope: "professionals",
  limitQuantity: "2",
  limitPeriod: "3",
  limitUnit: "months",
  allowBlockedTimeBookings: true,
  allowExtendedHours: true,
  extendedFromHour: "01",
  extendedFromMinute: "00",
  extendedToHour: "23",
  extendedToMinute: "55",
  additionalFields: {
    email: { enabled: true, required: false },
    phone: { enabled: true, required: true },
    additionalPhone: { enabled: false, required: false },
    taxId: { enabled: false, required: false },
    address: { enabled: false, required: false },
    municipality: { enabled: false, required: false },
    city: { enabled: false, required: false },
    birthDate: { enabled: false, required: false },
    age: { enabled: false, required: false },
    gender: { enabled: false, required: false },
    clientNumber: { enabled: false, required: false },
  },
};

const agendaAdditionalFields: Array<{
  id: AgendaAdditionalFieldId;
  label: string;
}> = [
  { id: "email", label: "E-mail" },
  { id: "phone", label: "Teléfono" },
  { id: "additionalPhone", label: "Teléfono adicional" },
  { id: "taxId", label: "RFC / DNI" },
  { id: "address", label: "Dirección" },
  { id: "municipality", label: "Alcaldía / Municipio" },
  { id: "city", label: "Ciudad" },
  { id: "birthDate", label: "Fecha de nacimiento" },
  { id: "age", label: "Edad" },
  { id: "gender", label: "Género" },
  { id: "clientNumber", label: "Número de cliente" },
];

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
      {
        id: "authorizations",
        label: "Códigos de autorización",
        icon: FileCheck2,
      },
    ],
  },
];

const sectionLabels = Object.fromEntries(
  sidebarGroups.flatMap((group) =>
    group.items.map((item) => [item.id, item.label]),
  ),
) as Record<SettingsSection, string>;

function SettingsHeader({ active }: { active: SettingsSection }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
      <div className="flex min-h-[78px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <div>
            <p className="page-title text-[1.55rem] text-white">Configuraciones</p>
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/45">
              {sectionLabels[active]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            aria-label="Buscar"
            className="scheduler-header-button hidden xl:flex"
            type="button"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 xl:block">
            Reservas online
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
            ER
          </div>
        </div>
      </div>
    </header>
  );
}

function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        link.target === "_blank" ||
        link.dataset.settingsSection ||
        link.href === window.location.href
      )
        return;
      if (
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);
}

function UnsavedChangesBar({
  isDirty,
  onSave,
  onCancel,
}: {
  isDirty: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!isDirty) return null;

  return (
    <div className="settings-unsaved-bar" role="status">
      <span className="settings-unsaved-dot" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">
          Tienes cambios sin guardar
        </p>
        <p className="text-xs text-slate-500">
          Guárdalos antes de salir de esta sección.
        </p>
      </div>
      <Button className="settings-unsaved-save" onClick={onSave} type="button">
        <Save className="mr-2 h-4 w-4" /> Guardar ahora
      </Button>
      <Button
        className="settings-unsaved-cancel"
        onClick={onCancel}
        type="button"
        variant="outline"
      >
        Cancelar cambios
      </Button>
    </div>
  );
}

type SetCompanyField = <Key extends keyof CompanySettings>(
  key: Key,
  value: CompanySettings[Key],
) => void;

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
      <Label className="settings-field-label" htmlFor={id}>
        {label}
      </Label>
      {help ? <p className="settings-field-help">{help}</p> : null}
      <label className="settings-color-field" htmlFor={id}>
        <input
          id={id}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
        <span className="font-medium text-slate-600">
          {value.toUpperCase()}
        </span>
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
      <div
        className="booking-preview-hero"
        style={{ background: `linear-gradient(115deg, ${color}, ${color}99)` }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-2 shadow-sm">
          <img alt="" className="h-full w-full object-contain" src={logo} />
        </span>
        <span className="space-y-1.5">
          <span className="block h-2 w-20 rounded-full bg-white/70" />
          <span className="block h-1.5 w-28 rounded-full bg-white/40" />
        </span>
      </div>
      <div className="booking-preview-people">
        {["MR", "CR", "MG", "CG", "CH"].map((initials) => (
          <span key={initials}>{initials}</span>
        ))}
      </div>
      <div className="booking-preview-services">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className={item === 1 ? "border-current" : ""}
            style={item === 1 ? { color } : undefined}
          >
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

function PersonalizationPanel({
  settings,
  setField,
}: {
  settings: CompanySettings;
  setField: SetCompanyField;
}) {
  return (
    <div className="settings-panel-body space-y-6">
      <div className="settings-subcard">
        <div className="flex items-center gap-3">
          <Globe2 className="h-5 w-5 text-[#ad8b67]" />
          <h3 className="font-semibold text-slate-700">Sitio web</h3>
        </div>
        <div className="settings-info-banner">
          <Star className="h-4 w-4 shrink-0" />
          Te sugerimos usar el color principal de tu comunicación y elegir un
          tono oscuro para mantener buena legibilidad.
        </div>
        <div className="max-w-xs">
          <ColorField
            id="site-color"
            label="Color principal del sitio web"
            onChange={(value) => setField("siteColor", value)}
            value={settings.siteColor}
          />
        </div>
        <div>
          <p className="settings-field-label">
            Previsualización del sitio de reservaciones
          </p>
          <p className="settings-field-help mt-1">
            La imagen es una muestra de cómo se verán tus colores en escritorio
            y móvil.
          </p>
          <BookingSitePreview color={settings.siteColor} logo={settings.logo} />
        </div>
      </div>

      <div className="settings-subcard">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-[#ad8b67]" />
          <h3 className="font-semibold text-slate-700">
            E-mails de recordatorios
          </h3>
        </div>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <ColorField
            id="modify-color"
            label="Color para modificar"
            help="Personaliza el botón para modificar."
            onChange={(value) => setField("modifyColor", value)}
            value={settings.modifyColor}
          />
          <ColorField
            id="cancel-color"
            label="Color para cancelar"
            help="Personaliza el botón para cancelar."
            onChange={(value) => setField("cancelColor", value)}
            value={settings.cancelColor}
          />
        </div>
        <div>
          <p className="settings-field-label">
            Previsualización del correo para tus clientes
          </p>
          <div className="settings-email-preview">
            <div className="settings-email-sheet">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <img
                  alt="Keysar Cosmetics"
                  className="h-8 w-8 object-contain"
                  src={settings.logo}
                />
                <span className="text-[0.42rem] uppercase tracking-widest text-slate-400">
                  Tu empresa
                </span>
              </div>
              <p className="mt-5 text-center text-[0.6rem] text-slate-600">
                Tu reserva fue recibida exitosamente
              </p>
              <button
                className="mx-auto mt-3 block rounded px-6 py-2 text-[0.5rem] text-white"
                style={{ background: settings.siteColor }}
                type="button"
              >
                Confirmar reserva
              </button>
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-[0.52rem] font-semibold text-slate-600">
                  Datos de la reserva
                </p>
                <div className="mt-3 h-2 w-2/3 rounded-full bg-slate-200" />
                <div className="mt-2 h-2 w-1/2 rounded-full bg-slate-200" />
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <span
                  className="rounded px-4 py-2 text-[0.48rem] text-white"
                  style={{ background: settings.modifyColor }}
                >
                  Modificar reserva
                </span>
                <span
                  className="rounded px-4 py-2 text-[0.48rem] text-white"
                  style={{ background: settings.cancelColor }}
                >
                  Cancelar reserva
                </span>
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
          <img
            alt="Logo"
            className="h-full w-full object-contain"
            src={settings.logo}
          />
        </span>
        <h4 className="mt-4 text-center text-xl font-semibold text-white">
          {settings.companyName}
        </h4>
        <p className="mt-1 text-center text-sm text-white/70">
          {settings.linkProGreeting}
        </p>
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
                <span>
                  <Icon className="h-5 w-5" />
                </span>
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
          <span className="flex-1 space-y-2">
            <i />
            <i />
            <i />
          </span>
        </div>
        <p className="mt-6 text-lg font-semibold text-slate-800">
          {settings.companyName}
        </p>
        <div className="mt-3 space-y-2">
          <i className="block h-3 w-36 rounded-full bg-slate-200" />
          <i className="block h-3 w-52 max-w-full rounded-full bg-slate-200" />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }, (_, index) => (
            <span className="aspect-square rounded bg-slate-200" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkProPanel({
  settings,
  setField,
}: {
  settings: CompanySettings;
  setField: SetCompanyField;
}) {
  const linkProUrl = `https://keysar.link/mx/${settings.linkProSlug || "tuempresa"}`;
  const companyLinks = [
    {
      label: "Tu página web",
      value: settings.website || "Sin información",
      active: Boolean(settings.website),
    },
    {
      label: "Sitio de reservaciones",
      value: `${settings.bookingSlug}.reservas.keysar.mx`,
      active: true,
    },
    {
      label: "WhatsApp",
      value: settings.whatsapp || "Sin información",
      active: Boolean(settings.whatsapp),
    },
    {
      label: "Ubicación",
      value: settings.address || "Sin información",
      active: Boolean(settings.address),
    },
  ];

  return (
    <div className="settings-panel-body">
      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="linkpro-slug">
              Enlace para tu biografía de Instagram o TikTok
            </Label>
            <div className="flex gap-2">
              <Input
                className="settings-input"
                id="linkpro-slug"
                onChange={(event) =>
                  setField(
                    "linkProSlug",
                    event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                value={settings.linkProSlug}
              />
              <Button
                className="h-12 rounded-[16px] border-[#e5d9cf] bg-white text-slate-600"
                onClick={() => {
                  void navigator.clipboard.writeText(linkProUrl);
                  toast.success("Enlace LinkPro copiado.");
                }}
                variant="outline"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="break-all text-xs font-medium text-[#ad8b67]">
              {linkProUrl}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="linkpro-greeting">
              Invitación o saludo para tus clientes
            </Label>
            <Textarea
              className="settings-textarea"
              id="linkpro-greeting"
              maxLength={90}
              onChange={(event) =>
                setField("linkProGreeting", event.target.value)
              }
              value={settings.linkProGreeting}
            />
            <p className="text-right text-xs text-slate-400">
              {settings.linkProGreeting.length}/90
            </p>
          </div>
          <div>
            <p className="settings-field-label mb-2">
              Revisa los enlaces de tu empresa
            </p>
            <div className="settings-links-list">
              {companyLinks.map((item) => (
                <div className="flex gap-3 py-3" key={item.label}>
                  <span
                    className={
                      item.active
                        ? "settings-link-check settings-link-check-active"
                        : "settings-link-check"
                    }
                  >
                    {item.active ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-sm text-slate-700">{item.label}</b>
                    <span className="block truncate text-xs text-slate-400">
                      {item.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          className="settings-linkpro-preview"
          style={{
            background: `radial-gradient(circle at 50% 10%, ${settings.siteColor}33, transparent 38%), #f7f5f2`,
          }}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="settings-field-label">Vista previa de LinkPro</p>
              <p className="settings-field-help mt-1">
                Así se verá en dispositivos móviles.
              </p>
            </div>
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

function SocialPanel({
  settings,
  setField,
}: {
  settings: CompanySettings;
  setField: SetCompanyField;
}) {
  const fields: Array<{
    key: keyof CompanySettings;
    label: string;
    placeholder: string;
  }> = [
    {
      key: "instagram",
      label: "Instagram",
      placeholder: "https://www.instagram.com/keysarcosmetics",
    },
    {
      key: "facebook",
      label: "Facebook",
      placeholder: "https://www.facebook.com/keysarcosmetics",
    },
    {
      key: "website",
      label: "Sitio web",
      placeholder: "https://www.keysarcosmetics.com",
    },
    {
      key: "tiktok",
      label: "TikTok",
      placeholder: "https://www.tiktok.com/@keysarcosmetics",
    },
    {
      key: "youtube",
      label: "YouTube",
      placeholder: "https://www.youtube.com/@keysarcosmetics",
    },
  ];
  return (
    <div className="settings-panel-body">
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[#f8f4ef] p-4 text-sm text-slate-500">
        <Instagram className="mt-0.5 h-5 w-5 shrink-0 text-[#ad8b67]" />
        Estos enlaces aparecerán en tu sitio público y alimentarán
        automáticamente la tarjeta LinkPro.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <div
            className={
              field.key === "website" ? "space-y-2 lg:col-span-2" : "space-y-2"
            }
            key={field.key}
          >
            <Label
              className="settings-field-label"
              htmlFor={`social-${field.key}`}
            >
              {field.label}
            </Label>
            <Input
              className="settings-input"
              id={`social-${field.key}`}
              onChange={(event) => setField(field.key, event.target.value)}
              placeholder={field.placeholder}
              type="url"
              value={settings[field.key]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(initialSettings);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(lastSavedSettings);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const nextSettings = {
        ...initialSettings,
        ...(JSON.parse(saved) as Partial<CompanySettings>),
      };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function setField<Key extends keyof CompanySettings>(
    key: Key,
    value: CompanySettings[Key],
  ) {
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
    setLastSavedSettings(settings);
    toast.success("Configuración guardada correctamente.");
  }

  function cancelChanges() {
    setSettings(lastSavedSettings);
  }

  const bookingUrl = `${settings.bookingSlug || "tu-negocio"}.reservas.keysar.mx`;

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Información básica</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Empresa</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura el nombre, la descripción y la dirección pública de tu
              sitio de reservaciones.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={saveSettings}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>

        <div className="settings-form-grid">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="company-name">
              Nombre de tu empresa
            </Label>
            <p className="settings-field-help">
              El nombre que aparecerá en la agenda y en tu sitio web.
            </p>
            <Input
              className="settings-input"
              id="company-name"
              onChange={(event) => setField("companyName", event.target.value)}
              value={settings.companyName}
            />
          </div>
          <div className="space-y-2">
            <Label
              className="settings-field-label"
              htmlFor="company-description"
            >
              Descripción
            </Label>
            <p className="settings-field-help">
              Cuéntale a tus clientes sobre tus servicios y propuesta de valor.
            </p>
            <Textarea
              className="settings-textarea"
              id="company-description"
              onChange={(event) => setField("description", event.target.value)}
              value={settings.description}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(15rem,0.72fr)]">
            <div>
              <Label className="settings-field-label">Tu logo</Label>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => loadLogo(event.target.files?.[0])}
                ref={fileInput}
                type="file"
              />
              <button
                className="settings-upload"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                type="button"
              >
                <span className="settings-upload-icon">
                  <Upload className="h-7 w-7" />
                </span>
                <span className="font-semibold text-slate-700">
                  Arrastra o selecciona una imagen
                </span>
                <span className="text-xs text-slate-400">
                  PNG, JPG o WEBP · máximo 2 MB
                </span>
              </button>
            </div>
            <div>
              <Label className="settings-field-label">Previsualización</Label>
              <div className="settings-logo-preview">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#172230] p-5 shadow-[0_18px_40px_rgba(23,34,48,0.2)]">
                  {settings.logo ? (
                    <img
                      alt="Vista previa del logo"
                      className="h-full w-full object-contain"
                      src={settings.logo}
                    />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-white/60" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="booking-slug">
              Dirección de tu sitio web de reservaciones
            </Label>
            <p className="settings-field-help">
              Personaliza tu enlace para compartir una dirección clara y fácil
              de recordar.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#e5d9cf] bg-white focus-within:ring-2 focus-within:ring-[#c3a583]/25">
                <Input
                  className="h-12 min-w-0 rounded-none border-0 shadow-none focus-visible:ring-0"
                  id="booking-slug"
                  onChange={(event) =>
                    setField(
                      "bookingSlug",
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  value={settings.bookingSlug}
                />
                <span className="flex items-center border-l border-[#e5d9cf] bg-[#faf7f3] px-4 text-sm text-slate-400">
                  .reservas.keysar.mx
                </span>
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
        {
          id: "personalization",
          title: "Personalización",
          description:
            "Configura colores, tipografías y apariencia de tu sitio.",
          icon: Palette,
        },
        {
          id: "linkpro",
          title: "Tarjeta de presentación para redes sociales · LinkPro",
          description:
            "Reúne tus enlaces y contenido de marca en una sola página.",
          icon: Link2,
        },
        {
          id: "social",
          title: "Redes sociales",
          description: "Conecta los perfiles oficiales de tu empresa.",
          icon: Share2,
        },
      ].map((panel) => {
        const Icon = panel.icon;
        const open = openPanel === panel.id;
        return (
          <section className="settings-collapsible" key={panel.id}>
            <button
              className="flex w-full items-center gap-4 p-5 text-left"
              onClick={() => setOpenPanel(open ? null : panel.id)}
              type="button"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  {panel.id === "linkpro" ? (
                    <span className="rounded-full bg-[#ad8b67] px-2 py-0.5 text-[0.58rem] uppercase tracking-wider text-white">
                      Nuevo
                    </span>
                  ) : null}
                  {panel.title}
                </span>
                <span className="mt-1 block text-sm text-slate-400">
                  {panel.description}
                </span>
              </span>
              {open ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>
            {open ? (
              <div className="border-t border-[#eee6df]">
                {panel.id === "personalization" ? (
                  <PersonalizationPanel
                    settings={settings}
                    setField={setField}
                  />
                ) : null}
                {panel.id === "linkpro" ? (
                  <LinkProPanel settings={settings} setField={setField} />
                ) : null}
                {panel.id === "social" ? (
                  <SocialPanel settings={settings} setField={setField} />
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={saveSettings}
        onCancel={cancelChanges}
      />
    </div>
  );
}

function AgendaToggleRow({
  checked,
  title,
  description,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={
        disabled ? "agenda-toggle-row opacity-50" : "agenda-toggle-row"
      }
    >
      <button
        aria-checked={checked}
        aria-label={title}
        className={
          checked ? "settings-switch settings-switch-active" : "settings-switch"
        }
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function AgendaFieldSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={
        checked
          ? "settings-switch settings-switch-compact settings-switch-active"
          : "settings-switch settings-switch-compact"
      }
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span />
    </button>
  );
}

function AgendaAccordion({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="settings-collapsible">
      <button
        className="flex w-full items-start gap-4 p-5 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-700">{title}</span>
          <span className="mt-1 block text-sm text-slate-400">
            {description}
          </span>
        </span>
        {open ? (
          <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
        )}
      </button>
      {open ? (
        <div className="border-t border-[#eee6df] p-5 sm:p-6">{children}</div>
      ) : null}
    </section>
  );
}

const hourOptions = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, "0"),
);
const minuteOptions = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

function AgendaSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialAgendaSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(
    initialAgendaSettings,
  );
  const [openPanels, setOpenPanels] = useState({
    limits: true,
    internal: true,
    fields: false,
  });
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(lastSavedSettings);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(
      schedulerAgendaSettingsStorageKey,
    );
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<AgendaSettings>;
      const savedSlotMinutes = Number(parsed.slotMinutes);
      const nextSettings: AgendaSettings = {
        ...initialAgendaSettings,
        ...parsed,
        additionalFields: Object.fromEntries(
          agendaAdditionalFields.map((field) => [
            field.id,
            {
              ...initialAgendaSettings.additionalFields[field.id],
              ...parsed.additionalFields?.[field.id],
            },
          ]),
        ) as AgendaSettings["additionalFields"],
        slotMinutes: schedulerAgendaSlotOptions.includes(
          savedSlotMinutes as (typeof schedulerAgendaSlotOptions)[number],
        )
          ? String(savedSlotMinutes)
          : "60",
      };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch {
      window.localStorage.removeItem(schedulerAgendaSettingsStorageKey);
    }
  }, []);

  function setField<Key extends keyof AgendaSettings>(
    key: Key,
    value: AgendaSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function setAdditionalField(
    fieldId: AgendaAdditionalFieldId,
    key: "enabled" | "required",
    value: boolean,
  ) {
    setSettings((current) => {
      const currentField = current.additionalFields[fieldId];
      const nextField = {
        ...currentField,
        [key]: value,
        ...(key === "enabled" && !value ? { required: false } : {}),
      };
      return {
        ...current,
        additionalFields: { ...current.additionalFields, [fieldId]: nextField },
      };
    });
  }

  function save() {
    window.localStorage.setItem(
      schedulerAgendaSettingsStorageKey,
      JSON.stringify(settings),
    );
    window.dispatchEvent(new CustomEvent(schedulerAgendaSettingsChangeEvent));
    setLastSavedSettings(settings);
    toast.success("Configuración de agenda guardada.");
  }

  function cancelChanges() {
    setSettings(lastSavedSettings);
  }

  function togglePanel(panel: keyof typeof openPanels) {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Configuraciones</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Comportamiento de reservas</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura la visualización de tu agenda y el comportamiento de las
              reservas creadas.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={save}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          <div className="max-w-md space-y-2">
            <Label className="settings-field-label" htmlFor="agenda-slot">
              Duración de cada bloque
            </Label>
            <p className="settings-field-help">
              Esta opción determina el largo visual de cada bloque en la Agenda.
            </p>
            <select
              className="agenda-select"
              id="agenda-slot"
              onChange={(event) => setField("slotMinutes", event.target.value)}
              value={settings.slotMinutes}
            >
              {schedulerAgendaSlotOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutos
                </option>
              ))}
            </select>
          </div>
          <div className="mt-6 divide-y divide-[#eee6df]">
            <AgendaToggleRow
              checked={settings.allowOverlapping}
              description="Los especialistas pueden tener dos reservas en un mismo horario. Aplica a reservas ingresadas internamente."
              onChange={(value) => setField("allowOverlapping", value)}
              title="Reservas sobrepuestas"
            />
            <AgendaToggleRow
              checked={settings.allowClientSimultaneous}
              description="Los clientes pueden tener dos o más reservas en un mismo horario, desde la agenda o el sitio web."
              onChange={(value) => setField("allowClientSimultaneous", value)}
              title="Reservas simultáneas de clientes"
            />
            <AgendaToggleRow
              checked={settings.allowResourceOverload}
              description="Permite crear reservas aunque los recursos asociados se encuentren ocupados o no disponibles."
              onChange={(value) => setField("allowResourceOverload", value)}
              title="Sobrecarga de recursos"
            />
            <AgendaToggleRow
              checked={settings.requireContact}
              description="Al crear una reserva, el cliente debe tener asociado como mínimo un correo electrónico o teléfono."
              onChange={(value) => setField("requireContact", value)}
              title="Requerir datos de contacto"
            />
            <AgendaToggleRow
              checked={settings.requireMedicalRecord}
              description="Solicita completar al menos una ficha del cliente cuando la reserva se marca como atendida."
              onChange={(value) => setField("requireMedicalRecord", value)}
              title="Ficha requerida"
            />
          </div>
        </div>
      </section>

      <AgendaAccordion
        description="Genera límites según la frecuencia con la que tus clientes pueden reservar."
        onToggle={() => togglePanel("limits")}
        open={openPanels.limits}
        title="Limitar cantidad de citas que puede agendar un cliente"
      >
        <AgendaToggleRow
          checked={settings.limitClientBookings}
          description="Activa reglas de frecuencia para evitar múltiples reservas dentro del mismo periodo."
          onChange={(value) => setField("limitClientBookings", value)}
          title="Limita las citas de tus clientes"
        />
        <fieldset
          className="agenda-dependent-grid"
          disabled={!settings.limitClientBookings}
        >
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="limit-scope">
              Limitar agendamiento por
            </Label>
            <select
              className="agenda-select"
              id="limit-scope"
              onChange={(event) => setField("limitScope", event.target.value)}
              value={settings.limitScope}
            >
              <option value="professionals">Grupo de especialistas</option>
              <option value="services">Servicio</option>
              <option value="company">Toda la empresa</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="limit-quantity">
              Cantidad de citas permitidas
            </Label>
            <Input
              className="settings-input"
              id="limit-quantity"
              min="1"
              onChange={(event) =>
                setField("limitQuantity", event.target.value)
              }
              type="number"
              value={settings.limitQuantity}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="settings-field-label" htmlFor="limit-period">
              Durante un periodo de
            </Label>
            <div className="flex flex-wrap items-center gap-4">
              <Input
                className="settings-input w-36"
                id="limit-period"
                min="1"
                onChange={(event) =>
                  setField("limitPeriod", event.target.value)
                }
                type="number"
                value={settings.limitPeriod}
              />
              {(["weeks", "months"] as const).map((unit) => (
                <label className="agenda-radio" key={unit}>
                  <input
                    checked={settings.limitUnit === unit}
                    name="limit-unit"
                    onChange={() => setField("limitUnit", unit)}
                    type="radio"
                  />
                  {unit === "weeks" ? "Semanas" : "Meses"}
                </label>
              ))}
            </div>
          </div>
        </fieldset>
      </AgendaAccordion>

      <AgendaAccordion
        description="Habilita reservas internas fuera del horario habitual; tus clientes no podrán reservar online en esos horarios."
        onToggle={() => togglePanel("internal")}
        open={openPanels.internal}
        title="Reservas internas fuera de horario"
      >
        <div className="divide-y divide-[#eee6df]">
          <AgendaToggleRow
            checked={settings.allowBlockedTimeBookings}
            description="Permite crear reservas internas en espacios bloqueados dentro de la agenda."
            onChange={(value) => setField("allowBlockedTimeBookings", value)}
            title="Reservas en bloqueo de horario"
          />
          <AgendaToggleRow
            checked={settings.allowExtendedHours}
            description="Extiende el rango disponible para reservas internas fuera del horario de apertura de los locales."
            onChange={(value) => setField("allowExtendedHours", value)}
            title="Horario extendido para reservas internas"
          />
        </div>
        <fieldset
          className="mt-5 flex flex-wrap items-end gap-3"
          disabled={!settings.allowExtendedHours}
        >
          <div className="space-y-2">
            <Label className="settings-field-label">Desde</Label>
            <div className="flex gap-2">
              <select
                aria-label="Hora de inicio"
                className="agenda-time-select"
                onChange={(event) =>
                  setField("extendedFromHour", event.target.value)
                }
                value={settings.extendedFromHour}
              >
                {hourOptions.map((hour) => (
                  <option key={hour}>{hour}</option>
                ))}
              </select>
              <select
                aria-label="Minuto de inicio"
                className="agenda-time-select"
                onChange={(event) =>
                  setField("extendedFromMinute", event.target.value)
                }
                value={settings.extendedFromMinute}
              >
                {minuteOptions.map((minute) => (
                  <option key={minute}>{minute}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="mb-3 text-sm font-semibold text-slate-400">
            hasta
          </span>
          <div className="space-y-2">
            <Label className="settings-field-label">Hasta</Label>
            <div className="flex gap-2">
              <select
                aria-label="Hora de término"
                className="agenda-time-select"
                onChange={(event) =>
                  setField("extendedToHour", event.target.value)
                }
                value={settings.extendedToHour}
              >
                {hourOptions.map((hour) => (
                  <option key={hour}>{hour}</option>
                ))}
              </select>
              <select
                aria-label="Minuto de término"
                className="agenda-time-select"
                onChange={(event) =>
                  setField("extendedToMinute", event.target.value)
                }
                value={settings.extendedToMinute}
              >
                {minuteOptions.map((minute) => (
                  <option key={minute}>{minute}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
      </AgendaAccordion>

      <AgendaAccordion
        description="Define los datos adicionales que se solicitarán al crear una reserva desde Agenda."
        onToggle={() => togglePanel("fields")}
        open={openPanels.fields}
        title="Configuración de campos adicionales"
      >
        <div className="agenda-fields-table-wrap">
          <table className="agenda-fields-table">
            <thead>
              <tr>
                <th>Datos del cliente</th>
                <th>Usar en agenda</th>
                <th>Obligatorio en agenda</th>
              </tr>
            </thead>
            <tbody>
              {agendaAdditionalFields.map((field) => {
                const fieldSettings = settings.additionalFields[field.id];
                return (
                  <tr key={field.id}>
                    <td>{field.label}</td>
                    <td>
                      <AgendaFieldSwitch
                        checked={fieldSettings.enabled}
                        label={`${field.label}: usar en agenda`}
                        onChange={(value) =>
                          setAdditionalField(field.id, "enabled", value)
                        }
                      />
                    </td>
                    <td>
                      <AgendaFieldSwitch
                        checked={fieldSettings.required}
                        disabled={!fieldSettings.enabled}
                        label={`${field.label}: obligatorio en agenda`}
                        onChange={(value) =>
                          setAdditionalField(field.id, "required", value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AgendaAccordion>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={cancelChanges}
      />
    </div>
  );
}

function PaymentsSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialPaymentSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(
    initialPaymentSettings,
  );
  const [editingBank, setEditingBank] = useState(false);
  const [openPanels, setOpenPanels] = useState({
    online: true,
    providers: true,
  });
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(lastSavedSettings);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(paymentsStorageKey);
    if (!saved) return;
    try {
      const nextSettings = {
        ...initialPaymentSettings,
        ...(JSON.parse(saved) as Partial<PaymentSettings>),
      };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch {
      window.localStorage.removeItem(paymentsStorageKey);
    }
  }, []);

  function setField<Key extends keyof PaymentSettings>(
    key: Key,
    value: PaymentSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function save() {
    window.localStorage.setItem(paymentsStorageKey, JSON.stringify(settings));
    setLastSavedSettings(settings);
    toast.success("Configuración de pagos guardada.");
  }

  function cancelChanges() {
    setSettings(lastSavedSettings);
    setEditingBank(false);
  }

  function togglePanel(panel: keyof typeof openPanels) {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  async function copyPaymentLink() {
    await navigator.clipboard.writeText(settings.paymentLink);
    toast.success("Link de cobro copiado.");
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Pagos AgendaPro</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Datos bancarios</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Agrega la cuenta bancaria donde quieres recibir los depósitos.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={save}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          {editingBank ? (
            <div className="payments-bank-edit-grid">
              <div className="space-y-2">
                <Label className="settings-field-label" htmlFor="bank-name">
                  Nombre
                </Label>
                <Input
                  className="settings-input"
                  id="bank-name"
                  onChange={(event) => setField("bankName", event.target.value)}
                  value={settings.bankName}
                />
              </div>
              <div className="space-y-2">
                <Label
                  className="settings-field-label"
                  htmlFor="bank-institution"
                >
                  Institución bancaria
                </Label>
                <Input
                  className="settings-input"
                  id="bank-institution"
                  onChange={(event) =>
                    setField("bankInstitution", event.target.value)
                  }
                  value={settings.bankInstitution}
                />
              </div>
              <div className="space-y-2">
                <Label className="settings-field-label" htmlFor="bank-clabe">
                  CLABE interbancaria
                </Label>
                <Input
                  className="settings-input"
                  id="bank-clabe"
                  inputMode="numeric"
                  onChange={(event) =>
                    setField(
                      "bankClabe",
                      event.target.value.replace(/\D/g, "").slice(0, 18),
                    )
                  }
                  value={settings.bankClabe}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  className="scheduler-modal-cta h-12 rounded-[16px]"
                  onClick={() => setEditingBank(false)}
                  type="button"
                >
                  Listo
                </Button>
                <Button
                  className="h-12 rounded-[16px]"
                  onClick={() => {
                    setSettings(lastSavedSettings);
                    setEditingBank(false);
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="payments-bank-summary">
              <div>
                <p className="settings-field-help">Nombre</p>
                <p className="font-medium text-slate-700">
                  {settings.bankName}
                </p>
                <p className="mt-5 settings-field-help">Institución bancaria</p>
                <p className="font-medium text-slate-700">
                  {settings.bankInstitution}
                </p>
              </div>
              <div>
                <p className="settings-field-help">CLABE interbancaria</p>
                <p className="font-medium text-slate-700">
                  {settings.bankClabe}
                </p>
              </div>
              <Button
                className="h-11 w-fit rounded-[14px] bg-[#6d43c7] px-4 text-white hover:bg-[#5e36b1]"
                onClick={() => setEditingBank(true)}
                type="button"
              >
                <Pencil className="mr-2 h-4 w-4" /> Editar datos
              </Button>
            </div>
          )}
        </div>
      </section>

      <AgendaAccordion
        description="Permite que tus clientes paguen en línea."
        onToggle={() => togglePanel("online")}
        open={openPanels.online}
        title="Pagos en línea"
      >
        <div className="space-y-1 divide-y divide-[#eee6df]">
          <AgendaToggleRow
            checked={settings.onlinePayments}
            description="Habilita el pago online al momento de reservar."
            onChange={(value) => setField("onlinePayments", value)}
            title="Pagos en línea"
          />
          <div className="payments-link-row">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                Link de cobro
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Comparte este enlace para recibir pagos directamente.
              </p>
            </div>
            <div className="flex min-w-0 gap-2">
              <Input
                className="settings-input payments-link-input"
                readOnly
                value={settings.paymentLink}
              />
              <Button
                className="h-12 shrink-0 rounded-[14px] border-[#e5d9cf] bg-white text-[#6d43c7]"
                onClick={() => void copyPaymentLink()}
                type="button"
                variant="outline"
              >
                <Copy className="mr-2 h-4 w-4" /> Copia tu link
              </Button>
            </div>
          </div>
          <AgendaToggleRow
            checked={settings.allowOnlineStatusEdit}
            description="Permite que el cliente modifique una reserva ya pagada, sin cancelarla."
            onChange={(value) => setField("allowOnlineStatusEdit", value)}
            title="Editar estado de las reservas"
          />
        </div>
      </AgendaAccordion>

      <AgendaAccordion
        description="Ofrece Mercado Pago para que tus clientes paguen en línea. AgendaPro cobrará una comisión adicional."
        onToggle={() => togglePanel("providers")}
        open={openPanels.providers}
        title="Proveedores de pago externos"
      >
        <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="public-key">
              Public Key
            </Label>
            <Input
              className="settings-input"
              id="public-key"
              onChange={(event) => setField("publicKey", event.target.value)}
              value={settings.publicKey}
            />
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="access-token">
              Access Token
            </Label>
            <Input
              className="settings-input"
              id="access-token"
              onChange={(event) => setField("accessToken", event.target.value)}
              type="password"
              value={settings.accessToken}
            />
          </div>
        </div>
      </AgendaAccordion>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={cancelChanges}
      />
    </div>
  );
}

function RegisterSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialRegisterSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(
    initialRegisterSettings,
  );
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(true);
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(lastSavedSettings);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(registerStorageKey);
    if (!saved) return;
    try {
      const nextSettings = {
        ...initialRegisterSettings,
        ...(JSON.parse(saved) as Partial<RegisterSettings>),
      };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch {
      window.localStorage.removeItem(registerStorageKey);
    }
  }, []);

  function setField<Key extends keyof RegisterSettings>(
    key: Key,
    value: RegisterSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updatePaymentMethod(
    id: string,
    key: "active" | "requireCode",
    value: boolean,
  ) {
    setSettings((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.map((method) =>
        method.id === id ? { ...method, [key]: value } : method,
      ),
    }));
  }

  function updateCommission(
    key: keyof RegisterSettings["commissions"],
    value: boolean,
  ) {
    setSettings((current) => ({
      ...current,
      commissions: { ...current.commissions, [key]: value },
    }));
  }

  function addPaymentMethod() {
    const name = newPaymentMethod.trim();
    if (!name) return;
    setSettings((current) => ({
      ...current,
      paymentMethods: [
        ...current.paymentMethods,
        { id: `custom-${Date.now()}`, name, active: true, requireCode: false },
      ],
    }));
    setNewPaymentMethod("");
    setAddingPaymentMethod(false);
  }

  function save() {
    window.localStorage.setItem(registerStorageKey, JSON.stringify(settings));
    setLastSavedSettings(settings);
    toast.success("Configuración de caja guardada.");
  }

  function cancelChanges() {
    setSettings(lastSavedSettings);
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Configuraciones</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Sistema de Caja</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura el sistema de caja y medios de pago que acepta tu
              empresa.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={save}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          <div className="divide-y divide-[#eee6df]">
            <AgendaToggleRow
              checked={settings.enableSalesBox}
              description="Habilita esta opción para que puedas llevar un balance completo de tus flujos, incluyendo ingresos y egresos por pagos de servicios y productos."
              onChange={(value) => setField("enableSalesBox", value)}
              title="Habilitar caja de ventas"
            />
            <AgendaToggleRow
              checked={settings.trackCash}
              description="Lleva un recuento de los flujos en efectivo y permite registrar traspasos entre la caja general y el efectivo en caja."
              onChange={(value) => setField("trackCash", value)}
              title="Hacer seguimiento del efectivo en caja"
            />
            <AgendaToggleRow
              checked={settings.requireClientPayment}
              description="Al registrar un pago se debe ingresar un cliente existente o crear uno nuevo."
              onChange={(value) => setField("requireClientPayment", value)}
              title="Requerir cliente en pago"
            />
            <AgendaToggleRow
              checked={settings.allowPriceEditing}
              description="Permite editar los precios de productos y servicios al registrar una reserva o pago."
              onChange={(value) => setField("allowPriceEditing", value)}
              title="Permitir edición de precios en reservas y pagos"
            />
            <AgendaToggleRow
              checked={settings.requireServiceInfo}
              description="Al registrar un pago será obligatorio seleccionar el especialista asociado al servicio."
              onChange={(value) => setField("requireServiceInfo", value)}
              title="Requerir información de servicios en pagos"
            />
            <AgendaToggleRow
              checked={settings.requireCashierCode}
              description="Exige un código de cajero válido para ingresar un pago o manipular las cajas."
              onChange={(value) => setField("requireCashierCode", value)}
              title="Requerir código de cajero para acciones de cajas"
            />
            <AgendaToggleRow
              checked={settings.showDecimals}
              description="Visualiza los precios totales en comprobantes, PDF y sitio web con dos decimales."
              onChange={(value) => setField("showDecimals", value)}
              title="Visualizar montos totales con decimales"
            />
          </div>
        </div>
      </section>

      <AgendaAccordion
        description="Configura los campos a mostrar en el comprobante. Los campos vacíos no aparecerán en el mismo."
        onToggle={() => setReceiptOpen((current) => !current)}
        open={receiptOpen}
        title="Configuración de comprobante de pago"
      >
        <div className="register-receipt-fields">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="legal-name">
              Razón social
            </Label>
            <Input
              className="settings-input"
              id="legal-name"
              onChange={(event) => setField("legalName", event.target.value)}
              value={settings.legalName}
            />
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="tax-id">
              RFC
            </Label>
            <Input
              className="settings-input"
              id="tax-id"
              onChange={(event) => setField("taxId", event.target.value)}
              value={settings.taxId}
            />
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="tax-regime">
              Régimen fiscal
            </Label>
            <Input
              className="settings-input"
              id="tax-regime"
              onChange={(event) => setField("taxRegime", event.target.value)}
              placeholder="Régimen fiscal"
              value={settings.taxRegime}
            />
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="fiscal-address">
              Dirección fiscal
            </Label>
            <Input
              className="settings-input"
              id="fiscal-address"
              onChange={(event) =>
                setField("fiscalAddress", event.target.value)
              }
              value={settings.fiscalAddress}
            />
          </div>
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor="additional-info">
              Información adicional
            </Label>
            <Input
              className="settings-input"
              id="additional-info"
              onChange={(event) =>
                setField("additionalInfo", event.target.value)
              }
              placeholder="Información adicional"
              value={settings.additionalInfo}
            />
          </div>
          <div className="register-receipt-toggles">
            <AgendaToggleRow
              checked={settings.showClientInfo}
              description="Muestra el nombre e identificación del cliente en el comprobante."
              onChange={(value) => setField("showClientInfo", value)}
              title="Mostrar información del cliente (nombre e identificación)"
            />
            <AgendaToggleRow
              checked={settings.showProfessionalName}
              description="Muestra el nombre de los especialistas que prestaron los servicios vendidos."
              onChange={(value) => setField("showProfessionalName", value)}
              title="Mostrar nombre de los especialistas"
            />
            <AgendaToggleRow
              checked={settings.separateBranchBilling}
              description="Usa información de facturación distinta para cada sucursal."
              onChange={(value) => setField("separateBranchBilling", value)}
              title="Usar información de facturación distinta por sucursal"
            />
            <AgendaToggleRow
              checked={settings.differentiateVat}
              description="Separa el IVA y el neto de los impuestos en el comprobante de caja."
              onChange={(value) => setField("differentiateVat", value)}
              title="Diferenciar IVA de productos en comprobante de caja"
            />
          </div>
          <div className="max-w-md space-y-2">
            <Label className="settings-field-label" htmlFor="receipt-size">
              Tamaño del comprobante
            </Label>
            <p className="settings-field-help">
              Configura el tamaño de hoja correcto para tu impresora fiscal.
            </p>
            <select
              className="agenda-select"
              id="receipt-size"
              onChange={(event) => setField("receiptSize", event.target.value)}
              value={settings.receiptSize}
            >
              <option value="fiscal">Impresora Fiscal</option>
              <option value="ticket-80">Ticket 80 mm</option>
              <option value="ticket-58">Ticket 58 mm</option>
            </select>
          </div>
        </div>
      </AgendaAccordion>

      <AgendaAccordion
        description="Agrega métodos de pago personalizados a tu caja de ventas. Configura su visibilidad y permisos."
        onToggle={() => undefined}
        open
        title="Métodos de pago"
      >
        <div className="register-section-action">
          {addingPaymentMethod ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                className="settings-input register-new-method-input"
                onChange={(event) => setNewPaymentMethod(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addPaymentMethod();
                }}
                placeholder="Nombre del método"
                value={newPaymentMethod}
              />
              <Button
                className="scheduler-modal-cta h-12 rounded-[14px]"
                onClick={addPaymentMethod}
                type="button"
              >
                Agregar
              </Button>
              <Button
                className="h-12 rounded-[14px]"
                onClick={() => setAddingPaymentMethod(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              className="h-11 rounded-[14px] bg-[#6d43c7] px-4 text-white hover:bg-[#5e36b1]"
              onClick={() => setAddingPaymentMethod(true)}
              type="button"
            >
              ＋ Agregar método
            </Button>
          )}
        </div>
        <div className="register-methods-table-wrap">
          <table className="register-methods-table">
            <thead>
              <tr>
                <th>Medios de Pago</th>
                <th>Activo</th>
                <th>Requerir Código</th>
              </tr>
            </thead>
            <tbody>
              {settings.paymentMethods.map((method) => (
                <tr key={method.id}>
                  <td>{method.name}</td>
                  <td>
                    <AgendaFieldSwitch
                      checked={method.active}
                      label={`${method.name}: activo`}
                      onChange={(value) =>
                        updatePaymentMethod(method.id, "active", value)
                      }
                    />
                  </td>
                  <td>
                    <AgendaFieldSwitch
                      checked={method.requireCode}
                      label={`${method.name}: requerir código`}
                      onChange={(value) =>
                        updatePaymentMethod(method.id, "requireCode", value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AgendaAccordion>

      <AgendaAccordion
        description="Define en qué casos se paga comisión a tus especialistas. Puedes combinar más de una condición."
        onToggle={() => undefined}
        open
        title="Configuración de comisiones"
      >
        <div className="register-commissions-table-wrap">
          <table className="register-commissions-table">
            <thead>
              <tr>
                <th>Comisiones por:</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Reservas asistidas</td>
                <td>
                  <AgendaFieldSwitch
                    checked={settings.commissions.attended}
                    label="Comisiones por reservas asistidas"
                    onChange={(value) => updateCommission("attended", value)}
                  />
                </td>
              </tr>
              <tr>
                <td>Servicios sin reserva</td>
                <td>
                  <AgendaFieldSwitch
                    checked={settings.commissions.noReservation}
                    label="Comisiones por servicios sin reserva"
                    onChange={(value) =>
                      updateCommission("noReservation", value)
                    }
                  />
                </td>
              </tr>
              <tr>
                <td>Pagos completos</td>
                <td>
                  <AgendaFieldSwitch
                    checked={settings.commissions.completePayment}
                    label="Comisiones por pagos completos"
                    onChange={(value) =>
                      updateCommission("completePayment", value)
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AgendaAccordion>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={cancelChanges}
      />
    </div>
  );
}

function ReminderSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialReminderSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(
    initialReminderSettings,
  );
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(lastSavedSettings);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(remindersStorageKey);
    if (!saved) return;
    try {
      const nextSettings = {
        ...initialReminderSettings,
        ...(JSON.parse(saved) as Partial<ReminderSettings>),
      };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch {
      window.localStorage.removeItem(remindersStorageKey);
    }
  }, []);

  function setField<Key extends keyof ReminderSettings>(
    key: Key,
    value: ReminderSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function save() {
    window.localStorage.setItem(remindersStorageKey, JSON.stringify(settings));
    setLastSavedSettings(settings);
    toast.success("Configuración de recordatorios guardada.");
  }

  function cancelChanges() {
    setSettings(lastSavedSettings);
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Configuraciones</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Recordatorios</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura los avisos que recibirán tus clientes después de crear o
              modificar una reserva.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={save}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-section-heading">
          <div>
            <h2 className="font-semibold text-slate-700">
              Notificaciones automáticas de reserva por Email
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura los mensajes que serán enviados automáticamente por
              correo.
            </p>
          </div>
          <Mail className="h-5 w-5 text-[#ad8b67]" />
        </div>
        <div className="settings-panel-body py-3">
          <div className="divide-y divide-[#eee6df]">
            <AgendaToggleRow
              checked={settings.emailBookingChanges}
              description="Permite que tus clientes reciban un email de creación, modificación o eliminación de cita justo después de realizar la acción."
              onChange={(value) => setField("emailBookingChanges", value)}
              title="Notificación de creación, edición o cancelación de cita"
            />
            <AgendaToggleRow
              checked={settings.emailReminder}
              description="Permite que tus clientes reciban un recordatorio por email. Puedes programar el día y horario de envío."
              onChange={(value) => setField("emailReminder", value)}
              title="Recordatorio"
            />
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-section-heading">
          <div>
            <h2 className="font-semibold text-slate-700">
              Notificaciones automáticas de reserva por WhatsApp
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura los mensajes que serán enviados automáticamente por
              WhatsApp.
            </p>
          </div>
          <MessageCircle className="h-5 w-5 text-[#ad8b67]" />
        </div>
        <div className="settings-panel-body py-3">
          <div className="divide-y divide-[#eee6df]">
            <AgendaToggleRow
              checked={settings.whatsappBookingCreated}
              description="Permite que tus clientes reciban un mensaje de creación exitosa de reserva justo después de agendarla."
              onChange={(value) => setField("whatsappBookingCreated", value)}
              title="Notificación de creación de cita"
            />
            <AgendaToggleRow
              checked={settings.whatsappReminder}
              description="Permite que tus clientes reciban un recordatorio por WhatsApp. Puedes programar el día y horario de envío."
              onChange={(value) => setField("whatsappReminder", value)}
              title="Recordatorio"
            />
          </div>
        </div>
      </section>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={cancelChanges}
      />
    </div>
  );
}

function MedicalRecordsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialMedicalSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(
    initialMedicalSettings,
  );
  const [previewCategory, setPreviewCategory] =
    useState<MedicalCategory | null>(null);
  const [optionsField, setOptionsField] = useState<{
    categoryId: string;
    fieldId: string;
  } | null>(null);
  const [newCategoryDraft, setNewCategoryDraft] = useState<string | null>(null);
  const [newFieldDraft, setNewFieldDraft] = useState<{
    categoryId: string;
    name: string;
    type: string;
  } | null>(null);
  const isDirty =
    JSON.stringify(comparableMedicalSettings(settings)) !==
    JSON.stringify(comparableMedicalSettings(lastSavedSettings));

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(medicalStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<MedicalSettings>;
      const nextSettings = {
        ...initialMedicalSettings,
        ...parsed,
        categories: (
          parsed.categories ?? initialMedicalSettings.categories
        ).map((category) => {
          const defaults = initialMedicalSettings.categories.find(
            (item) => item.id === category.id,
          );
          return {
            ...category,
            fields: category.fields.map((field) => {
              const defaultField = defaults?.fields.find(
                (item) => item.id === field.id,
              );
              return defaultField?.options?.length && !field.options?.length
                ? { ...field, options: defaultField.options }
                : field;
            }),
          };
        }),
      };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch {
      window.localStorage.removeItem(medicalStorageKey);
    }
  }, []);

  function save() {
    window.localStorage.setItem(medicalStorageKey, JSON.stringify(settings));
    setLastSavedSettings(settings);
    toast.success("Fichas médicas guardadas.");
  }

  function cancelChanges() {
    setSettings(lastSavedSettings);
  }

  function updateCategory(
    categoryId: string,
    updater: (category: MedicalCategory) => MedicalCategory,
  ) {
    setSettings((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? updater(category) : category,
      ),
    }));
  }

  function toggleCategory(categoryId: string) {
    updateCategory(categoryId, (category) => ({
      ...category,
      expanded: !category.expanded,
    }));
  }

  function addCategory() {
    setNewCategoryDraft("");
  }

  function addField(categoryId: string) {
    setNewFieldDraft({ categoryId, name: "", type: "Área de texto" });
  }

  function confirmCategoryDraft() {
    const name = newCategoryDraft?.trim();
    if (!name) return;
    setSettings((current) => ({
      ...current,
      categories: [
        {
          id: `category-${Date.now()}`,
          name,
          accent: "pink",
          expanded: true,
          fields: [],
        },
        ...current.categories,
      ],
    }));
    setNewCategoryDraft(null);
  }

  function confirmFieldDraft() {
    if (!newFieldDraft?.name.trim()) return;
    updateCategory(newFieldDraft.categoryId, (category) => ({
      ...category,
      expanded: true,
      fields: [
        ...category.fields,
        {
          id: `field-${Date.now()}`,
          name: newFieldDraft.name.trim(),
          type: newFieldDraft.type,
          required: false,
        },
      ],
    }));
    setNewFieldDraft(null);
  }

  function removeCategory(categoryId: string) {
    if (!window.confirm("¿Eliminar esta categoría y todos sus campos?")) return;
    setSettings((current) => ({
      ...current,
      categories: current.categories.filter(
        (category) => category.id !== categoryId,
      ),
    }));
  }

  function removeField(categoryId: string, fieldId: string) {
    updateCategory(categoryId, (category) => ({
      ...category,
      fields: category.fields.filter((field) => field.id !== fieldId),
    }));
  }

  function updateField(
    categoryId: string,
    fieldId: string,
    patch: Partial<MedicalField>,
  ) {
    updateCategory(categoryId, (category) => ({
      ...category,
      fields: category.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="medical-info-banner">
        <span className="medical-info-icon">i</span>
        <span>
          En esta sección podrás crear las fichas de tu compañía para llevar el
          registro de las evoluciones de tus clientes o pacientes. Para más
          información visita <u>Academia AgendaPro</u>, o nuestra{" "}
          <u>sección de Ayuda</u>.
        </span>
        <button aria-label="Cerrar información" type="button">
          ×
        </button>
      </div>
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Configuraciones</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Fichas Médicas</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Crea y organiza las categorías y campos que utilizarás para
              registrar la información de tus clientes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="medical-status-legend">
              <i className="medical-status-dot medical-status-dot-incomplete" />{" "}
              Incompleta{" "}
              <i className="medical-status-dot medical-status-dot-complete" />{" "}
              Completa
            </span>
            <Button
              className={
                isDirty
                  ? "settings-primary-save settings-primary-save-dirty"
                  : "settings-primary-save"
              }
              disabled={!isDirty}
              onClick={save}
              type="button"
            >
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </div>
        </div>
      </section>

      <div className="medical-created-heading">
        <h2>Fichas creadas</h2>
        <Button
          className="medical-action-button medical-new-record-button"
          onClick={() => addCategory()}
          type="button"
        >
          <Plus className="mr-1 h-4 w-4" /> Nueva Ficha/Registro
        </Button>
      </div>
      <div className="medical-categories-list">
        {newCategoryDraft !== null ? (
          <div className="medical-draft-row medical-draft-category">
            <GripVertical className="h-4 w-4 text-pink-300" />
            <ChevronRight className="h-4 w-4 text-pink-400" />
            <Input
              autoFocus
              className="settings-input medical-draft-name"
              onChange={(event) => setNewCategoryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") confirmCategoryDraft();
              }}
              placeholder="Ingresa el nombre de la ficha"
              value={newCategoryDraft}
            />
            <button
              aria-label="Confirmar nueva ficha"
              className="medical-draft-confirm"
              onClick={confirmCategoryDraft}
              type="button"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              aria-label="Cancelar nueva ficha"
              className="medical-draft-cancel"
              onClick={() => setNewCategoryDraft(null)}
              type="button"
            >
              ×
            </button>
          </div>
        ) : null}
        {settings.categories.map((category) => (
          <section
            className={`medical-category medical-category-${category.accent}`}
            key={category.id}
          >
            <div className="medical-category-header">
              <GripVertical className="h-4 w-4 text-slate-300" />
              <button
                className="medical-category-toggle"
                onClick={() => toggleCategory(category.id)}
                type="button"
              >
                {category.expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>{category.name}</span>
                <Pencil className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <div className="medical-category-actions">
                <Button
                  className="medical-action-button"
                  onClick={() => addField(category.id)}
                  type="button"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Agregar campo
                </Button>
                <button
                  aria-label="Ver categoría"
                  className="medical-icon-button"
                  onClick={() => setPreviewCategory(category)}
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  aria-label="Más opciones"
                  className="medical-icon-button"
                  onClick={() => removeCategory(category.id)}
                  type="button"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            {category.expanded ? (
              <div className="medical-category-body">
                {newFieldDraft?.categoryId === category.id ? (
                  <div className="medical-field medical-draft-field">
                    <GripVertical className="h-4 w-4 text-pink-300" />
                    <div className="medical-field-controls">
                      <div>
                        <Label className="medical-field-label">
                          Nombre del campo
                        </Label>
                        <Input
                          autoFocus
                          className="settings-input medical-field-name"
                          onChange={(event) =>
                            setNewFieldDraft((current) =>
                              current
                                ? { ...current, name: event.target.value }
                                : current,
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") confirmFieldDraft();
                          }}
                          placeholder="Ingresa el nombre del campo"
                          value={newFieldDraft.name}
                        />
                      </div>
                      <div>
                        <Label className="medical-field-label">
                          Tipo de campo
                        </Label>
                        <select
                          className="agenda-select medical-field-type"
                          onChange={(event) =>
                            setNewFieldDraft((current) =>
                              current
                                ? { ...current, type: event.target.value }
                                : current,
                            )
                          }
                          value={newFieldDraft.type}
                        >
                          <option>Numérico</option>
                          <option>Decimal</option>
                          <option>Texto</option>
                          <option>Área de texto</option>
                          <option>Categórico</option>
                          <option>Selección Múltiple</option>
                          <option>Selección única</option>
                          <option>Binario (Sí/No)</option>
                          <option>Fecha</option>
                          <option>Fecha y hora</option>
                          <option>Archivo</option>
                        </select>
                      </div>
                      <button
                        aria-label="Confirmar nuevo campo"
                        className="medical-draft-confirm"
                        onClick={confirmFieldDraft}
                        type="button"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Cancelar nuevo campo"
                        className="medical-draft-cancel"
                        onClick={() => setNewFieldDraft(null)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : null}
                {category.fields.map((field) => (
                  <div className="medical-field" key={field.id}>
                    <GripVertical className="h-4 w-4 text-slate-300" />
                    <div className="medical-field-controls">
                      <div>
                        <Label className="medical-field-label">
                          Nombre del campo
                        </Label>
                        <Input
                          className="settings-input medical-field-name"
                          onChange={(event) =>
                            updateField(category.id, field.id, {
                              name: event.target.value,
                            })
                          }
                          value={field.name}
                        />
                      </div>
                      <div>
                        <Label className="medical-field-label">
                          Tipo de campo
                        </Label>
                        <select
                          className="agenda-select medical-field-type"
                          onChange={(event) =>
                            updateField(category.id, field.id, {
                              type: event.target.value,
                            })
                          }
                          value={field.type}
                        >
                          <option>Numérico</option>
                          <option>Decimal</option>
                          <option>Texto</option>
                          <option>Área de texto</option>
                          <option>Categórico</option>
                          <option>Selección Múltiple</option>
                          <option>Selección única</option>
                          <option>Binario (Sí/No)</option>
                          <option>Fecha</option>
                          <option>Fecha y hora</option>
                          <option>Archivo</option>
                        </select>
                        {[
                          "Categórico",
                          "Selección Múltiple",
                          "Selección única",
                        ].includes(field.type) ? (
                          <button
                            className="medical-options-button"
                            onClick={() =>
                              setOptionsField({
                                categoryId: category.id,
                                fieldId: field.id,
                              })
                            }
                            type="button"
                          >
                            <Settings2 className="h-4 w-4" /> Configurar
                            opciones
                          </button>
                        ) : null}
                      </div>
                      <div className="medical-field-required">
                        <span>Obligatorio</span>
                        <AgendaFieldSwitch
                          checked={field.required}
                          label={`${field.name}: obligatorio`}
                          onChange={(value) =>
                            updateField(category.id, field.id, {
                              required: value,
                            })
                          }
                        />
                      </div>
                      <button
                        aria-label={`Eliminar ${field.name}`}
                        className="medical-delete-button"
                        onClick={() => removeField(category.id, field.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {category.fields.length === 0 ? (
                  <p className="medical-empty-fields">
                    Esta categoría todavía no tiene campos.
                  </p>
                ) : null}
                <div className="medical-add-category-row">
                  <Button
                    className="medical-action-button"
                    onClick={() => addField(category.id)}
                    type="button"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Agregar campo
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>
      <div className="medical-add-category-footer">
        <Button
          className="medical-action-button"
          onClick={addCategory}
          type="button"
        >
          <Plus className="mr-1 h-4 w-4" /> Agregar categoría
        </Button>
      </div>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={cancelChanges}
      />
      {previewCategory ? (
        <MedicalPreview
          category={previewCategory}
          onClose={() => setPreviewCategory(null)}
        />
      ) : null}
      {optionsField ? (
        <MedicalOptionsModal
          field={settings.categories
            .find((category) => category.id === optionsField.categoryId)
            ?.fields.find((field) => field.id === optionsField.fieldId)}
          onClose={() => setOptionsField(null)}
          onSave={(options) => {
            updateField(optionsField.categoryId, optionsField.fieldId, {
              options,
            });
            setOptionsField(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MedicalPreview({
  category,
  onClose,
}: {
  category: MedicalCategory;
  onClose: () => void;
}) {
  return (
    <div
      className="medical-preview-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-label="Previsualización de ficha"
        className="medical-preview-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="medical-preview-header">
          <h2>Previsualización de ficha</h2>
          <button
            aria-label="Cerrar previsualización"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="medical-preview-content">
          <div className="medical-preview-title">
            {category.name.toUpperCase()}
          </div>
          <div className="medical-preview-fields">
            {category.fields.map((field) => (
              <div className="medical-preview-field" key={field.id}>
                <div className="medical-preview-field-title">
                  <ChevronRight className="h-4 w-4" />
                  {field.name}
                </div>
                <Label>{field.name}</Label>
                {field.type === "Área de texto" ? (
                  <Textarea placeholder="Escribe aquí" />
                ) : field.type === "Binario (Sí/No)" ? (
                  <select>
                    <option>Selecciona una opción</option>
                    <option>Sí</option>
                    <option>No</option>
                  </select>
                ) : field.type === "Fecha" ? (
                  <Input type="date" />
                ) : field.type === "Fecha y hora" ? (
                  <Input type="datetime-local" />
                ) : field.type === "Archivo" ? (
                  <Input type="file" />
                ) : field.type === "Numérico" ? (
                  <Input type="number" />
                ) : field.type === "Decimal" ? (
                  <Input step="0.01" type="number" />
                ) : [
                    "Categórico",
                    "Selección Múltiple",
                    "Selección única",
                  ].includes(field.type) ? (
                  <select multiple={field.type === "Selección Múltiple"}>
                    <option value="">Selecciona una opción</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <Input placeholder="Escribe aquí" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MedicalOptionsModal({
  field,
  onClose,
  onSave,
}: {
  field?: MedicalField | undefined;
  onClose: () => void;
  onSave: (options: string[]) => void;
}) {
  const [options, setOptions] = useState(field?.options ?? []);
  const [newOption, setNewOption] = useState("");

  function addOption() {
    const value = newOption.trim();
    if (!value) return;
    setOptions((current) => [...current, value]);
    setNewOption("");
  }

  return (
    <div
      className="medical-preview-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="medical-options-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="medical-preview-header">
          <div>
            <h2>Agregar opciones</h2>
            <p className="medical-options-context">
              Campo: <b>{field?.name ?? "Campo"}</b>
            </p>
          </div>
          <button aria-label="Cerrar opciones" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="medical-options-content">
          <div className="medical-options-add">
            <div className="flex-1">
              <Label className="medical-field-label">
                Agregar nueva opción
              </Label>
              <Input
                autoFocus
                onChange={(event) => setNewOption(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addOption();
                }}
                placeholder="Coloca el nombre de la opción"
                value={newOption}
              />
            </div>
            <Button
              className="scheduler-modal-cta h-11 rounded-[12px]"
              disabled={!newOption.trim()}
              onClick={addOption}
              type="button"
            >
              ✓ Agregar
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Las opciones estarán disponibles para que el cliente o especialista
            pueda seleccionar una o varias.
          </p>
          <div className="medical-options-list">
            {options.map((option, index) => (
              <div className="medical-option-row" key={`${option}-${index}`}>
                <GripVertical className="h-4 w-4 text-slate-300" />
                <span>{option}</span>
                <button
                  aria-label={`Eliminar opción ${option}`}
                  className="medical-delete-button ml-auto"
                  onClick={() =>
                    setOptions((current) =>
                      current.filter((_, optionIndex) => optionIndex !== index),
                    )
                  }
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="medical-options-footer">
          <Button
            className="h-11 rounded-[12px]"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            className="scheduler-modal-cta h-11 rounded-[12px]"
            onClick={() => onSave(options)}
            type="button"
          >
            Guardar opciones
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmailSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialEmailSettings);
  const [lastSaved, setLastSaved] = useState(initialEmailSettings);
  const [newSender, setNewSender] = useState("");
  const [addingSender, setAddingSender] = useState(false);
  const [editingSender, setEditingSender] = useState<string | null>(null);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(lastSaved);
  useUnsavedChanges(isDirty);
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    const saved = window.localStorage.getItem(emailsStorageKey);
    if (!saved) return;
    try {
      const next = {
        ...initialEmailSettings,
        ...(JSON.parse(saved) as Partial<EmailSettings>),
      };
      setSettings(next);
      setLastSaved(next);
    } catch {
      window.localStorage.removeItem(emailsStorageKey);
    }
  }, []);
  function save() {
    window.localStorage.setItem(emailsStorageKey, JSON.stringify(settings));
    setLastSaved(settings);
    toast.success("Configuración de e-mails guardada.");
  }
  function saveSender() {
    const email = newSender.trim();
    if (!email) return;
    setSettings((current) =>
      editingSender
        ? {
            ...current,
            senders: current.senders.map((sender) =>
              sender.id === editingSender
                ? { ...sender, email, confirmed: false }
                : sender,
            ),
          }
        : {
            ...current,
            senders: [
              ...current.senders,
              { id: `sender-${Date.now()}`, email, confirmed: false },
            ],
          },
    );
    setNewSender("");
    setAddingSender(false);
    setEditingSender(null);
  }
  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Opciones avanzadas</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Configuraciones de emails</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura la dirección desde donde se envían los correos masivos
              (remitentes).
            </p>
          </div>
          <Button
            className="settings-primary-save"
            onClick={() => setAddingSender(true)}
            type="button"
          >
            ＋ Agregar Correo
          </Button>
        </div>
        <div className="email-senders-table">
          <div className="email-table-head">
            <span>Remitente</span>
            <span>Confirmado</span>
            <span>Opciones</span>
          </div>
          {settings.senders.map((sender) => (
            <div className="email-table-row" key={sender.id}>
              <span>{sender.email}</span>
              <span>
                {sender.confirmed ? "confirmado" : "falta confirmación"}
              </span>
              <span>
                <button
                  className="email-edit-button"
                  onClick={() => {
                    setEditingSender(sender.id);
                    setNewSender(sender.email);
                    setAddingSender(true);
                  }}
                  type="button"
                >
                  ✎ Editar
                </button>
                <button
                  className="email-remove-button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      senders: current.senders.filter(
                        (item) => item.id !== sender.id,
                      ),
                    }))
                  }
                  type="button"
                >
                  ▣ Eliminar
                </button>
              </span>
            </div>
          ))}
          {addingSender ? (
            <div className="email-add-row">
              <Input
                autoFocus
                onChange={(event) => setNewSender(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveSender();
                }}
                placeholder="correo@empresa.com"
                value={newSender}
              />
              <Button onClick={saveSender} type="button">
                {editingSender ? "Guardar" : "Agregar"}
              </Button>
              <Button
                onClick={() => {
                  setAddingSender(false);
                  setEditingSender(null);
                  setNewSender("");
                }}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          ) : null}
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-section-heading">
          <div>
            <h2 className="font-semibold text-slate-700">Firma emails</h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura aquí la firma que se enviará en los emails a todos tus
              clientes.
            </p>
          </div>
        </div>
        <Textarea
          className="email-signature-editor"
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              signature: event.target.value,
            }))
          }
          placeholder="Escribe tu firma"
          value={settings.signature}
        />
      </section>
      <section className="settings-card">
        <div className="settings-section-heading">
          <div>
            <h2 className="font-semibold text-slate-700">
              Email de cumpleaños
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Este email se enviará a todos los clientes cuando sea su fecha de
              cumpleaños.
            </p>
          </div>
        </div>
        <div className="settings-panel-body">
          <AgendaToggleRow
            checked={settings.birthdayEnabled}
            description="Activa el envío automático del correo de cumpleaños."
            onChange={(value) =>
              setSettings((current) => ({ ...current, birthdayEnabled: value }))
            }
            title="Activar cumpleaños"
          />
          <div className="email-birthday-editor">
            <div className="email-birthday-preview">
              <div className="email-preview-topline">KEYSAR COSMETICS</div>
              <div className="email-preview-logo">K</div>
              <div className="email-preview-cake">🎂</div>
              <h3>{settings.birthdaySubject.split("\n")[0] || "Tu empresa"}</h3>
              <strong>
                {settings.birthdaySubject.split("\n")[1] ||
                  "Te desea un feliz cumpleaños"}
              </strong>
              <p>{settings.birthdayBody}</p>
              {settings.birthdayLink.trim() ? (
                <a
                  className="email-preview-button"
                  href={settings.birthdayLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  Ir a {settings.senders[0]?.email || "tu empresa"}
                </a>
              ) : null}
            </div>
            <div className="email-birthday-fields">
              <Label>Asunto</Label>
              <Input
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    birthdaySubject: event.target.value,
                  }))
                }
                value={settings.birthdaySubject}
              />
              <Label>Mensaje</Label>
              <Textarea
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    birthdayBody: event.target.value,
                  }))
                }
                value={settings.birthdayBody}
              />
              <Label>Enlace web del botón</Label>
              <Input
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    birthdayLink: event.target.value,
                  }))
                }
                placeholder="Si lo dejas vacío, no se mostrará el botón"
                value={settings.birthdayLink}
              />
              <p className="email-link-help">
                Si no agregas un enlace, el botón no aparecerá en el correo.
              </p>
            </div>
          </div>
        </div>
      </section>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={() => setSettings(lastSaved)}
      />
    </div>
  );
}

function comparableClientSettings(settings: ClientSettings) {
  return {
    ...settings,
    categories: settings.categories.map(
      ({ expanded: _expanded, ...category }) => category,
    ),
  };
}

function newClientFieldDraft(categoryId: string): ClientFieldDraft {
  return {
    id: null,
    categoryId,
    name: "",
    description: "",
    type: "Numérico",
    requiredForClient: false,
    askInCalendar: false,
    requiredInCalendar: false,
    askOnline: false,
    requiredOnline: false,
    options: [],
  };
}

function ClientSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialClientSettings);
  const [lastSaved, setLastSaved] = useState(initialClientSettings);
  const [categoryDraft, setCategoryDraft] = useState<{
    id: string | null;
    name: string;
  } | null>(null);
  const [fieldDraft, setFieldDraft] = useState<ClientFieldDraft | null>(null);
  const [optionsDraft, setOptionsDraft] =
    useState<ClientFieldOptionsDraft | null>(null);
  const [filterDraft, setFilterDraft] = useState<{
    id: string | null;
    name: string;
  } | null>(null);
  const isDirty =
    JSON.stringify(comparableClientSettings(settings)) !==
    JSON.stringify(comparableClientSettings(lastSaved));

  useUnsavedChanges(isDirty);
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    const saved = window.localStorage.getItem(clientsStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<ClientSettings>;
      const next: ClientSettings =
        parsed.version === initialClientSettings.version
          ? { ...initialClientSettings, ...parsed }
          : {
              ...initialClientSettings,
              ...parsed,
              version: initialClientSettings.version,
              categories: (parsed.categories ?? []).length
                ? (parsed.categories ?? []).map((category) =>
                    category.id === "other"
                      ? {
                          ...category,
                          expanded: true,
                          fields:
                            initialClientSettings.categories[0]!.fields.map(
                              (defaultField) => {
                                const savedField = category.fields.find(
                                  (field) => field.id === defaultField.id,
                                );
                                return savedField
                                  ? {
                                      ...defaultField,
                                      ...savedField,
                                      options: savedField.options?.length
                                        ? savedField.options
                                        : defaultField.options,
                                    }
                                  : defaultField;
                              },
                            ).concat(
                              category.fields.filter(
                                (field) =>
                                  !initialClientSettings.categories[0]!.fields.some(
                                    (defaultField) =>
                                      defaultField.id === field.id,
                                  ),
                              ),
                            ),
                        }
                      : category,
                  )
                : initialClientSettings.categories,
            };
      const normalized = {
        ...next,
        categories: next.categories.map((category) => ({
          ...category,
          fields: category.fields.map((field) => ({
            ...field,
            options: Array.isArray(field.options) ? field.options : [],
          })),
        })),
      };
      setSettings(normalized);
      setLastSaved(normalized);
    } catch {
      window.localStorage.removeItem(clientsStorageKey);
    }
  }, []);

  function save() {
    window.localStorage.setItem(clientsStorageKey, JSON.stringify(settings));
    setLastSaved(settings);
    toast.success("Configuración de clientes guardada.");
  }
  function saveCategory() {
    const name = categoryDraft?.name.trim();
    if (!name || !categoryDraft) return;
    setSettings((current) => ({
      ...current,
      categories: categoryDraft.id
        ? current.categories.map((category) =>
            category.id === categoryDraft.id ? { ...category, name } : category,
          )
        : [
            ...current.categories,
            {
              id: `client-category-${Date.now()}`,
              name,
              expanded: true,
              fields: [],
            },
          ],
    }));
    setCategoryDraft(null);
  }
  function saveField() {
    if (!fieldDraft?.name.trim()) return;
    const fieldId = fieldDraft.id ?? `client-field-${Date.now()}`;
    const nextField = {
      ...fieldDraft,
      id: fieldId,
      name: fieldDraft.name.trim(),
    };
    setSettings((current) => ({
      ...current,
      categories: current.categories.map((category) => ({
        ...category,
        expanded:
          category.id === fieldDraft.categoryId ? true : category.expanded,
        fields:
          category.id === fieldDraft.categoryId
            ? [
                ...category.fields.filter((field) => field.id !== fieldId),
                nextField,
              ]
            : category.fields.filter((field) => field.id !== fieldId),
      })),
    }));
    setFieldDraft(null);
  }
  function saveFilter() {
    const name = filterDraft?.name.trim();
    if (!name || !filterDraft) return;
    setSettings((current) => ({
      ...current,
      filters: filterDraft.id
        ? current.filters.map((filter) =>
            filter.id === filterDraft.id ? { ...filter, name } : filter,
          )
        : [...current.filters, { id: `client-filter-${Date.now()}`, name }],
    }));
    setFilterDraft(null);
  }

  function saveFieldOptions() {
    if (!optionsDraft) return;
    const options = optionsDraft.options
      .map((option) => option.trim())
      .filter(
        (option, index, list) => option && list.indexOf(option) === index,
      );
    setSettings((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === optionsDraft.categoryId
          ? {
              ...category,
              fields: category.fields.map((field) =>
                field.id === optionsDraft.fieldId
                  ? { ...field, options }
                  : field,
              ),
            }
          : category,
      ),
    }));
    setOptionsDraft(null);
  }

  function moveCategory(categoryId: string, offset: -1 | 1) {
    setSettings((current) => {
      const index = current.categories.findIndex(
        (category) => category.id === categoryId,
      );
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.categories.length)
        return current;
      const categories = [...current.categories];
      [categories[index], categories[nextIndex]] = [
        categories[nextIndex]!,
        categories[index]!,
      ];
      return { ...current, categories };
    });
  }

  function moveField(categoryId: string, fieldId: string, offset: -1 | 1) {
    setSettings((current) => ({
      ...current,
      categories: current.categories.map((category) => {
        if (category.id !== categoryId) return category;
        const index = category.fields.findIndex(
          (field) => field.id === fieldId,
        );
        const nextIndex = index + offset;
        if (index < 0 || nextIndex < 0 || nextIndex >= category.fields.length)
          return category;
        const fields = [...category.fields];
        [fields[index], fields[nextIndex]] = [
          fields[nextIndex]!,
          fields[index]!,
        ];
        return { ...category, fields };
      }),
    }));
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading client-page-heading">
          <div>
            <p className="settings-kicker">Opciones avanzadas</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Clientes</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura los campos y filtros personalizados de tu base de
              clientes.
            </p>
          </div>
          <div className="client-page-actions">
            <Button
              className="client-category-button"
              onClick={() => setCategoryDraft({ id: null, name: "" })}
              type="button"
            >
              <Plus className="h-4 w-4" /> Agregar categoría
            </Button>
            <Button
              className="client-field-button"
              disabled={settings.categories.length === 0}
              onClick={() =>
                setFieldDraft(
                  newClientFieldDraft(settings.categories[0]?.id ?? ""),
                )
              }
              type="button"
            >
              <Plus className="h-4 w-4" /> Agregar campo
            </Button>
            <Button
              className={
                isDirty
                  ? "settings-primary-save settings-primary-save-dirty"
                  : "settings-primary-save"
              }
              disabled={!isDirty}
              onClick={save}
              type="button"
            >
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>

        <div className="client-categories">
          {settings.categories.length ? (
            settings.categories.map((category, categoryIndex) => (
              <article className="client-category" key={category.id}>
                <div className="client-category-header">
                  <button
                    aria-expanded={category.expanded}
                    className="client-category-toggle"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        categories: current.categories.map((item) =>
                          item.id === category.id
                            ? { ...item, expanded: !item.expanded }
                            : item,
                        ),
                      }))
                    }
                    type="button"
                  >
                    <span>{category.name}</span>
                    <span className="client-category-count">
                      {category.fields.length}{" "}
                      {category.fields.length === 1 ? "campo" : "campos"}
                    </span>
                    {category.expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="client-category-controls">
                    <button
                      aria-label={`Subir categoría ${category.name}`}
                      disabled={categoryIndex === 0}
                      onClick={() => moveCategory(category.id, -1)}
                      title="Subir categoría"
                      type="button"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Bajar categoría ${category.name}`}
                      disabled={
                        categoryIndex === settings.categories.length - 1
                      }
                      onClick={() => moveCategory(category.id, 1)}
                      title="Bajar categoría"
                      type="button"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Editar categoría ${category.name}`}
                      onClick={() =>
                        setCategoryDraft({
                          id: category.id,
                          name: category.name,
                        })
                      }
                      title="Editar categoría"
                      type="button"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <ClientDeleteButton
                      description={`Se eliminará la categoría “${category.name}” y sus ${category.fields.length} campos. Esta acción se aplicará al guardar los cambios.`}
                      label={`Eliminar categoría ${category.name}`}
                      onDelete={() =>
                        setSettings((current) => ({
                          ...current,
                          categories: current.categories.filter(
                            (item) => item.id !== category.id,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
                {category.expanded ? (
                  <div className="client-category-fields">
                    {category.fields.length ? (
                      category.fields.map((field, fieldIndex) => (
                        <div className="client-custom-field" key={field.id}>
                          <span
                            className="client-field-drag"
                            aria-hidden="true"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <div className="client-field-name">
                            <strong>{field.name}</strong>
                            {field.description ? (
                              <small>{field.description}</small>
                            ) : field.options.length ? (
                              <small>
                                {field.options.length}{" "}
                                {field.options.length === 1
                                  ? "opción configurada"
                                  : "opciones configuradas"}
                              </small>
                            ) : null}
                          </div>
                          <span className="client-field-meta">
                            <small>Tipo</small>
                            {field.type}
                          </span>
                          <span className="client-field-meta">
                            <small>Requerido</small>
                            {field.requiredForClient ? "Sí" : "No"}
                          </span>
                          <div className="client-field-actions">
                            <button
                              aria-label={`Subir campo ${field.name}`}
                              disabled={fieldIndex === 0}
                              onClick={() =>
                                moveField(category.id, field.id, -1)
                              }
                              title="Subir campo"
                              type="button"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            {[
                              "Categórico",
                              "Selección única",
                              "Selección Múltiple",
                            ].includes(field.type) ? (
                              <button
                                aria-label={`Administrar contenido de ${field.name}`}
                                className="client-action-options"
                                onClick={() =>
                                  setOptionsDraft({
                                    categoryId: category.id,
                                    fieldId: field.id,
                                    fieldName: field.name,
                                    options: [...field.options],
                                  })
                                }
                                title={`${field.options.length} ${field.options.length === 1 ? "opción" : "opciones"}`}
                                type="button"
                              >
                                <List className="h-4 w-4" />
                              </button>
                            ) : null}
                            <button
                              aria-label={`Bajar campo ${field.name}`}
                              disabled={
                                fieldIndex === category.fields.length - 1
                              }
                              onClick={() =>
                                moveField(category.id, field.id, 1)
                              }
                              title="Bajar campo"
                              type="button"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              aria-label={`Editar campo ${field.name}`}
                              className="client-action-edit"
                              onClick={() =>
                                setFieldDraft({
                                  ...field,
                                  categoryId: category.id,
                                })
                              }
                              title="Editar campo"
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <ClientDeleteButton
                              compact
                              description={`Se eliminará el campo “${field.name}”. Esta acción se aplicará al guardar los cambios.`}
                              label={`Eliminar campo ${field.name}`}
                              onDelete={() =>
                                setSettings((current) => ({
                                  ...current,
                                  categories: current.categories.map((item) =>
                                    item.id === category.id
                                      ? {
                                          ...item,
                                          fields: item.fields.filter(
                                            (entry) => entry.id !== field.id,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="client-empty-state">
                        <UsersRound className="h-5 w-5" />
                        <span>Esta categoría todavía no tiene campos.</span>
                        <button
                          onClick={() =>
                            setFieldDraft(newClientFieldDraft(category.id))
                          }
                          type="button"
                        >
                          Agregar el primero
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="client-empty-state client-empty-state-page">
              <UsersRound className="h-6 w-6" />
              <span>No hay categorías configuradas.</span>
              <button
                onClick={() => setCategoryDraft({ id: null, name: "" })}
                type="button"
              >
                Crear categoría
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-section-heading client-section-actions">
          <div>
            <h2 className="font-semibold text-slate-700">Filtros</h2>
            <p className="mt-1 text-xs text-slate-400">
              Crea accesos rápidos para segmentar tu base de clientes.
            </p>
          </div>
          <Button
            className="client-field-button"
            onClick={() => setFilterDraft({ id: null, name: "" })}
            type="button"
          >
            <Plus className="h-4 w-4" /> Agregar filtro
          </Button>
        </div>
        <div
          className="client-filters-table"
          role="table"
          aria-label="Filtros de clientes"
        >
          <div className="client-table-head" role="row">
            <span role="columnheader">Nombre</span>
            <span role="columnheader">Opciones</span>
          </div>
          {settings.filters.length ? (
            settings.filters.map((filter) => (
              <div className="client-table-row" key={filter.id} role="row">
                <span role="cell">{filter.name}</span>
                <span role="cell">
                  <button
                    className="client-filter-edit"
                    onClick={() =>
                      setFilterDraft({ id: filter.id, name: filter.name })
                    }
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <ClientDeleteButton
                    description={`Se eliminará el filtro “${filter.name}”. Esta acción se aplicará al guardar los cambios.`}
                    label={`Eliminar filtro ${filter.name}`}
                    onDelete={() =>
                      setSettings((current) => ({
                        ...current,
                        filters: current.filters.filter(
                          (item) => item.id !== filter.id,
                        ),
                      }))
                    }
                    text
                  />
                </span>
              </div>
            ))
          ) : (
            <div className="client-filter-empty">
              No hay filtros configurados.
            </div>
          )}
        </div>
      </section>
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={save}
        onCancel={() => {
          setSettings(lastSaved);
          setCategoryDraft(null);
          setFieldDraft(null);
          setOptionsDraft(null);
          setFilterDraft(null);
        }}
      />
      {categoryDraft ? (
        <ClientNameDialog
          description="Usa un nombre corto que agrupe campos relacionados."
          draft={categoryDraft}
          noun="categoría"
          onChange={setCategoryDraft}
          onClose={() => setCategoryDraft(null)}
          onSave={saveCategory}
        />
      ) : null}
      {fieldDraft ? (
        <ClientFieldModal
          categories={settings.categories}
          draft={fieldDraft}
          onChange={setFieldDraft}
          onClose={() => setFieldDraft(null)}
          onSave={saveField}
        />
      ) : null}
      {optionsDraft ? (
        <ClientFieldOptionsModal
          draft={optionsDraft}
          onChange={setOptionsDraft}
          onClose={() => setOptionsDraft(null)}
          onSave={saveFieldOptions}
        />
      ) : null}
      {filterDraft ? (
        <ClientFilterModal
          draft={filterDraft}
          onChange={setFilterDraft}
          onClose={() => setFilterDraft(null)}
          onSave={saveFilter}
        />
      ) : null}
    </div>
  );
}

function ClientDeleteButton({
  compact = false,
  description,
  label,
  onDelete,
  text: showText = false,
}: {
  compact?: boolean;
  description: string;
  label: string;
  onDelete: () => void;
  text?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          aria-label={label}
          className={showText ? "client-filter-delete" : "client-action-delete"}
          title={label}
          type="button"
        >
          <Trash2 className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {showText ? "Eliminar" : null}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-[#eadfd5] bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onDelete}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ClientNameDialog({
  description,
  draft,
  noun,
  onChange,
  onClose,
  onSave,
}: {
  description: string;
  draft: { id: string | null; name: string };
  noun: string;
  onChange: (draft: { id: string | null; name: string }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="client-name-dialog max-w-[31rem]">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? `Editar ${noun}` : `Agregar ${noun}`}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="client-dialog-field">
          <Label htmlFor={`client-${noun}-name`}>Nombre</Label>
          <Input
            autoFocus
            id={`client-${noun}-name`}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && draft.name.trim()) onSave();
            }}
            placeholder={
              noun === "categoría"
                ? "Nombre de la categoría"
                : `Nombre del ${noun}`
            }
            value={draft.name}
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            className="client-field-button"
            disabled={!draft.name.trim()}
            onClick={onSave}
            type="button"
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientFieldOptionsModal({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: ClientFieldOptionsDraft;
  onChange: (draft: ClientFieldOptionsDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [newOption, setNewOption] = useState("");

  function addOption() {
    const option = newOption.trim();
    if (!option) return;
    if (
      draft.options.some(
        (current) => current.toLocaleLowerCase() === option.toLocaleLowerCase(),
      )
    ) {
      toast.warning("Esa opción ya existe en el campo.");
      return;
    }
    onChange({ ...draft, options: [...draft.options, option] });
    setNewOption("");
  }

  function moveOption(index: number, offset: -1 | 1) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= draft.options.length) return;
    const options = [...draft.options];
    [options[index], options[nextIndex]] = [
      options[nextIndex]!,
      options[index]!,
    ];
    onChange({ ...draft, options });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="client-options-modal max-w-[42rem]">
        <DialogHeader>
          <DialogTitle>Contenido de {draft.fieldName}</DialogTitle>
          <DialogDescription>
            Agrega y ordena las opciones que estarán disponibles al capturar
            este campo.
          </DialogDescription>
        </DialogHeader>

        <div className="client-option-add">
          <div>
            <Label htmlFor="client-new-option">Nueva opción</Label>
            <Input
              autoFocus
              id="client-new-option"
              onChange={(event) => setNewOption(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addOption();
              }}
              placeholder="Escribe el contenido de la opción"
              value={newOption}
            />
          </div>
          <Button
            className="client-field-button"
            disabled={!newOption.trim()}
            onClick={addOption}
            type="button"
          >
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>

        <div className="client-options-list">
          {draft.options.length ? (
            draft.options.map((option, index) => (
              <div className="client-option-row" key={`${index}-${option}`}>
                <GripVertical aria-hidden="true" className="h-4 w-4" />
                <Input
                  aria-label={`Contenido de la opción ${index + 1}`}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      options: draft.options.map((current, optionIndex) =>
                        optionIndex === index ? event.target.value : current,
                      ),
                    })
                  }
                  value={option}
                />
                <button
                  aria-label={`Subir opción ${option}`}
                  disabled={index === 0}
                  onClick={() => moveOption(index, -1)}
                  title="Subir opción"
                  type="button"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  aria-label={`Bajar opción ${option}`}
                  disabled={index === draft.options.length - 1}
                  onClick={() => moveOption(index, 1)}
                  title="Bajar opción"
                  type="button"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <ClientDeleteButton
                  compact
                  description={`Se quitará la opción “${option || `Opción ${index + 1}`}” de este campo.`}
                  label={`Eliminar opción ${option || index + 1}`}
                  onDelete={() =>
                    onChange({
                      ...draft,
                      options: draft.options.filter(
                        (_, optionIndex) => optionIndex !== index,
                      ),
                    })
                  }
                />
              </div>
            ))
          ) : (
            <div className="client-options-empty">
              <List className="h-5 w-5" />
              <span>Este campo todavía no tiene contenido.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            className="client-field-button"
            onClick={onSave}
            type="button"
          >
            Guardar contenido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientFieldModal({
  categories,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  categories: ClientSettings["categories"];
  draft: ClientFieldDraft;
  onChange: (draft: ClientFieldDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  function setField<Key extends keyof ClientFieldDraft>(
    key: Key,
    value: ClientFieldDraft[Key],
  ) {
    if (key === "askInCalendar" && value === false) {
      onChange({ ...draft, askInCalendar: false, requiredInCalendar: false });
      return;
    }
    if (key === "requiredInCalendar" && value === true) {
      onChange({ ...draft, askInCalendar: true, requiredInCalendar: true });
      return;
    }
    if (key === "askOnline" && value === false) {
      onChange({ ...draft, askOnline: false, requiredOnline: false });
      return;
    }
    if (key === "requiredOnline" && value === true) {
      onChange({ ...draft, askOnline: true, requiredOnline: true });
      return;
    }
    onChange({ ...draft, [key]: value });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="client-field-modal max-w-[42rem]">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Editar campo" : "Agregar campo"}
          </DialogTitle>
          <DialogDescription>
            Define cómo se captura este dato en el perfil y durante una reserva.
          </DialogDescription>
        </DialogHeader>
        <div className="client-modal-content">
          <div className="client-modal-form">
            <div>
              <Label>Categoría</Label>
              <select
                className="agenda-select"
                onChange={(event) => setField("categoryId", event.target.value)}
                value={draft.categoryId}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nombre</Label>
              <Input
                autoFocus
                onChange={(event) => setField("name", event.target.value)}
                value={draft.name}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                value={draft.description}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="agenda-select"
                onChange={(event) => setField("type", event.target.value)}
                value={draft.type}
              >
                <option>Numérico</option>
                <option>Decimal</option>
                <option>Texto</option>
                <option>Área de texto</option>
                <option>Fecha</option>
                <option>Fecha y hora</option>
                <option>Categórico</option>
                <option>Selección única</option>
                <option>Selección Múltiple</option>
                <option>Binario (Sí/No)</option>
                <option>Archivo</option>
              </select>
            </div>
            <div className="client-modal-toggles">
              <AgendaFieldSwitch
                checked={draft.requiredForClient}
                label="Obligatorio al ingresar o editar cliente"
                onChange={(value) => setField("requiredForClient", value)}
              />
              <span>Obligatorio al ingresar/editar cliente</span>
              <AgendaFieldSwitch
                checked={draft.askInCalendar}
                label="Pedir en reserva por calendario"
                onChange={(value) => setField("askInCalendar", value)}
              />
              <span>Pedir en reserva por calendario</span>
              <AgendaFieldSwitch
                checked={draft.requiredInCalendar}
                label="Obligatorio en reserva por calendario"
                onChange={(value) => setField("requiredInCalendar", value)}
              />
              <span>Obligatorio en reserva por calendario</span>
              <AgendaFieldSwitch
                checked={draft.askOnline}
                label="Pedir en reserva en línea"
                onChange={(value) => setField("askOnline", value)}
              />
              <span>Pedir en reserva en línea</span>
              <AgendaFieldSwitch
                checked={draft.requiredOnline}
                label="Obligatorio en reserva en línea"
                onChange={(value) => setField("requiredOnline", value)}
              />
              <span>Obligatorio en reserva en línea</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            className="client-field-button"
            disabled={!draft.name.trim()}
            onClick={onSave}
            type="button"
          >
            Guardar campo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientFilterModal({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: { id: string | null; name: string };
  onChange: (draft: { id: string | null; name: string }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ClientNameDialog
      description="El filtro quedará disponible como acceso rápido en la base de clientes."
      draft={draft}
      noun="filtro"
      onChange={onChange}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function SurveySettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialSurveySettings);
  const [lastSaved, setLastSaved] = useState(initialSurveySettings);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(lastSaved);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(surveysStorageKey);
    if (!saved) return;
    try {
      const next = {
        ...initialSurveySettings,
        ...(JSON.parse(saved) as Partial<SurveySettings>),
      };
      setSettings(next);
      setLastSaved(next);
    } catch {
      window.localStorage.removeItem(surveysStorageKey);
    }
  }, []);

  function save() {
    window.localStorage.setItem(surveysStorageKey, JSON.stringify(settings));
    setLastSaved(settings);
    toast.success("Configuración de encuestas guardada.");
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading survey-page-heading">
          <div>
            <p className="settings-kicker">Opciones avanzadas</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Encuestas</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configuración básica para las encuestas de satisfacción.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={save}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>

        <div className="settings-panel-body survey-settings-body">
          <AgendaToggleRow
            checked={settings.enabled}
            description="Habilita esta opción para que tus clientes reciban encuestas de satisfacción de tu negocio."
            onChange={(enabled) =>
              setSettings((current) => ({ ...current, enabled }))
            }
            title="Activar encuestas"
          />

          <div className="survey-delay-field">
            <Label className="settings-field-label" htmlFor="survey-send-delay">
              Tiempo para envío de encuesta
            </Label>
            <p className="settings-field-help">
              Indica cuántas horas después de terminar un servicio se debe
              enviar la encuesta al cliente.
            </p>
            <select
              className="agenda-select"
              disabled={!settings.enabled}
              id="survey-send-delay"
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sendDelayHours: event.target.value,
                }))
              }
              value={settings.sendDelayHours}
            >
              <option value="0">Inmediatamente</option>
              <option value="1">1 hora después</option>
              <option value="2">2 horas después</option>
              <option value="3">3 horas después</option>
              <option value="6">6 horas después</option>
              <option value="12">12 horas después</option>
              <option value="24">24 horas después</option>
              <option value="48">48 horas después</option>
              <option value="72">72 horas después</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings-card survey-rules-card">
        <div className="survey-rules-intro">
          <span className="survey-info-icon">i</span>
          <p>
            Para configurar cuánto tiempo después de finalizado el servicio
            deseas enviar la encuesta, selecciona una opción en el campo{" "}
            <strong>Tiempo para envío de encuesta</strong>.
          </p>
        </div>
        <div className="survey-rules-content">
          <h2>Para que la encuesta sea enviada:</h2>
          <ol>
            <li>
              La reserva debe estar marcada con estado <strong>Asistida</strong>
              .
            </li>
            <li>
              El plazo máximo para marcar la asistencia de una reserva es de 72
              horas después de terminar el servicio.
            </li>
          </ol>
          <p className="survey-rule-note">
            <strong>Nota:</strong> Si una reserva permanece en otro estado
            después de 72 horas, la encuesta correspondiente no será enviada.
          </p>
        </div>
      </section>

      <UnsavedChangesBar
        isDirty={isDirty}
        onCancel={() => setSettings(lastSaved)}
        onSave={save}
      />
    </div>
  );
}

function AuthorizationSettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(initialAuthorizationSettings);
  const [lastSaved, setLastSaved] = useState(initialAuthorizationSettings);
  const [draft, setDraft] = useState<AuthorizationCodeDraft | null>(null);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(lastSaved);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const saved = window.localStorage.getItem(authorizationsStorageKey);
    if (!saved) return;
    try {
      const next = {
        ...initialAuthorizationSettings,
        ...(JSON.parse(saved) as Partial<AuthorizationSettings>),
      };
      setSettings(next);
      setLastSaved(next);
    } catch {
      window.localStorage.removeItem(authorizationsStorageKey);
    }
  }, []);

  const columns = useMemo<ColumnDef<AuthorizationCode>[]>(
    () => [
      { accessorKey: "name", header: "NOMBRE" },
      {
        accessorKey: "active",
        header: "ACTIVO",
        cell: ({ row }) => (
          <div className="authorization-table-toggle">
            <AgendaFieldSwitch
              checked={row.original.active}
              label={`${row.original.active ? "Desactivar" : "Activar"} código de ${row.original.name}`}
              onChange={(active) =>
                setSettings((current) => ({
                  ...current,
                  codes: current.codes.map((code) =>
                    code.id === row.original.id ? { ...code, active } : code,
                  ),
                }))
              }
            />
          </div>
        ),
      },
      { accessorKey: "code", header: "CÓDIGO" },
      {
        accessorKey: "reservations",
        header: "RESERVAS",
        cell: ({ row }) =>
          row.original.reservations ? "Permitido" : "Denegado",
      },
      {
        accessorKey: "cashRegister",
        header: "CAJA",
        cell: ({ row }) =>
          row.original.cashRegister ? "Permitido" : "Denegado",
      },
      {
        accessorKey: "downloads",
        header: "DESCARGA DE ARCHIVOS",
        cell: ({ row }) => (row.original.downloads ? "Permitido" : "Denegado"),
      },
      {
        id: "actions",
        header: "OPCIONES",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="authorization-row-actions">
            <button
              className="client-filter-edit"
              onClick={() => openEdit(row.original)}
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <ClientDeleteButton
              description={`Se eliminará el código de autorización de “${row.original.name}”.`}
              label={`Eliminar código de ${row.original.name}`}
              onDelete={() =>
                setSettings((current) => ({
                  ...current,
                  codes: current.codes.filter(
                    (code) => code.id !== row.original.id,
                  ),
                }))
              }
              text
            />
          </div>
        ),
      },
    ],
    [],
  );

  function openCreate() {
    setDraft({
      id: null,
      name: "",
      code: "",
      active: false,
      reservations: false,
      cashRegister: false,
      downloads: false,
    });
  }

  function openEdit(code: AuthorizationCode) {
    setDraft({ ...code });
  }

  function saveCode() {
    if (!draft?.name.trim() || !draft.code.trim()) {
      toast.warning("Captura el nombre y el código de autorización.");
      return;
    }
    const duplicate = settings.codes.some(
      (code) => code.id !== draft.id && code.code === draft.code.trim(),
    );
    if (duplicate) {
      toast.warning("Ese código ya está asignado a otra persona.");
      return;
    }
    const id = draft.id ?? `authorization-${Date.now()}`;
    const nextCode: AuthorizationCode = {
      ...draft,
      id,
      name: draft.name.trim(),
      code: draft.code.trim(),
    };
    setSettings((current) => ({
      ...current,
      codes: draft.id
        ? current.codes.map((code) => (code.id === draft.id ? nextCode : code))
        : [...current.codes, nextCode],
    }));
    setDraft(null);
  }

  function save() {
    window.localStorage.setItem(
      authorizationsStorageKey,
      JSON.stringify(settings),
    );
    setLastSaved(settings);
    toast.success("Códigos de autorización guardados.");
  }

  return (
    <div className="space-y-4">
      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="settings-kicker">Opciones avanzadas</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="settings-title">Códigos de autorización</h1>
              {isDirty ? (
                <span className="settings-unsaved-badge">
                  <span /> Cambios sin guardar
                </span>
              ) : null}
            </div>
            <p className="settings-description">
              Configura códigos y permisos para tu equipo.
            </p>
          </div>
          <Button
            className={
              isDirty
                ? "settings-primary-save settings-primary-save-dirty"
                : "settings-primary-save"
            }
            disabled={!isDirty}
            onClick={save}
            type="button"
          >
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
        <div className="settings-panel-body authorization-global-settings">
          <p className="authorization-intro">
            Define cuándo debe solicitarse el código de un integrante del equipo
            para realizar acciones sensibles.
          </p>
          <AgendaToggleRow
            checked={settings.requireForReservations}
            description="Solicita autorización al ingresar o modificar reservas."
            onChange={(requireForReservations) =>
              setSettings((current) => ({ ...current, requireForReservations }))
            }
            title="Requerir código de cajero para acciones de reservas"
          />
          <AgendaToggleRow
            checked={settings.requireForCashRegister}
            description="Solicita autorización al ingresar o modificar movimientos de caja."
            onChange={(requireForCashRegister) =>
              setSettings((current) => ({ ...current, requireForCashRegister }))
            }
            title="Requerir código de cajero para acciones de caja"
          />
          <AgendaToggleRow
            checked={settings.requireForDownloads}
            description="Solicita autorización para descargar archivos y reportes."
            onChange={(requireForDownloads) =>
              setSettings((current) => ({ ...current, requireForDownloads }))
            }
            title="Requerir código de cajero para descargar archivos y reportes"
          />
        </div>
      </section>

      <section className="settings-card authorization-list-card">
        <div className="settings-section-heading client-section-actions">
          <div>
            <h2 className="font-semibold text-slate-700">Listado de códigos</h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura códigos y permisos para tu equipo.
            </p>
          </div>
          <Button
            className="client-field-button"
            onClick={openCreate}
            type="button"
          >
            <Plus className="h-4 w-4" /> Agregar código
          </Button>
        </div>
        <div className="authorization-table-wrap">
          <DataTable
            columns={columns}
            data={settings.codes}
            emptyMessage="No hay códigos de autorización."
            labels={{
              records: "códigos",
              all: "Todos",
              results: (count) => `${count} códigos`,
            }}
            pageSize={20}
            searchPlaceholder="Buscar por nombre o código..."
          />
        </div>
      </section>

      <UnsavedChangesBar
        isDirty={isDirty}
        onCancel={() => {
          setSettings(lastSaved);
          setDraft(null);
        }}
        onSave={save}
      />
      {draft ? (
        <AuthorizationCodeDialog
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={saveCode}
        />
      ) : null}
    </div>
  );
}

function AuthorizationCodeDialog({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: AuthorizationCodeDraft;
  onChange: (draft: AuthorizationCodeDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="authorization-code-dialog max-w-[44rem]">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Editar código" : "Nuevo código"}
          </DialogTitle>
          <DialogDescription>
            Asigna un código personal y define las acciones que puede autorizar.
          </DialogDescription>
        </DialogHeader>
        <div className="authorization-code-form">
          <div>
            <Label htmlFor="authorization-name">Nombre</Label>
            <Input
              autoFocus
              id="authorization-name"
              onChange={(event) =>
                onChange({ ...draft, name: event.target.value })
              }
              value={draft.name}
            />
          </div>
          <div>
            <Label htmlFor="authorization-code">Código</Label>
            <Input
              id="authorization-code"
              inputMode="numeric"
              maxLength={12}
              onChange={(event) =>
                onChange({
                  ...draft,
                  code: event.target.value.replace(/\D/g, ""),
                })
              }
              value={draft.code}
            />
          </div>
          <div className="authorization-code-permissions">
            <AgendaToggleRow
              checked={draft.active}
              description="Permite utilizar este código inmediatamente."
              onChange={(active) => onChange({ ...draft, active })}
              title="Activar código"
            />
            <AgendaToggleRow
              checked={draft.reservations}
              description="Autoriza acciones relacionadas con reservas."
              onChange={(reservations) => onChange({ ...draft, reservations })}
              title="Dar permisos de reservas"
            />
            <AgendaToggleRow
              checked={draft.cashRegister}
              description="Autoriza acciones relacionadas con el sistema de caja."
              onChange={(cashRegister) => onChange({ ...draft, cashRegister })}
              title="Dar permisos de caja"
            />
            <AgendaToggleRow
              checked={draft.downloads}
              description="Autoriza la descarga de archivos y reportes."
              onChange={(downloads) => onChange({ ...draft, downloads })}
              title="Dar permisos de descarga de archivos"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            className="client-field-button"
            disabled={!draft.name.trim() || !draft.code.trim()}
            onClick={onSave}
            type="button"
          >
            Guardar código
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingSettingsPanel({ section }: { section: SettingsSection }) {
  return (
    <section className="settings-card flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f5ede4] text-[#ad8b67]">
          <Settings2 className="h-7 w-7" />
        </span>
        <p className="settings-kicker mt-6">Configuraciones</p>
        <h1 className="settings-title mt-2">{sectionLabels[section]}</h1>
        <p className="mt-3 text-slate-500">
          El acceso ya forma parte del menú. El contenido de esta sección se
          incorporará en la siguiente etapa.
        </p>
      </div>
    </section>
  );
}

export function SettingsWorkspace() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("company");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  function handleSectionSelect(section: SettingsSection): boolean {
    if (section === activeSection) return true;
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Tienes cambios sin guardar. ¿Quieres cambiar de sección y descartarlos?",
      )
    )
      return false;
    setHasUnsavedChanges(false);
    setActiveSection(section);
    return true;
  }

  useEffect(() => {
    const syncSectionFromUrl = () => {
      const section = new URLSearchParams(window.location.search).get(
        "section",
      ) as SettingsSection | null;
      if (section && sectionLabels[section]) setActiveSection(section);
    };

    syncSectionFromUrl();
    window.addEventListener("popstate", syncSectionFromUrl);
    return () => window.removeEventListener("popstate", syncSectionFromUrl);
  }, []);

  useEffect(() => {
    const handleExternalSectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<SettingsSection>;
      const section = customEvent.detail;
      if (!section || !sectionLabels[section]) return;
      if (!handleSectionSelect(section)) customEvent.preventDefault();
    };

    window.addEventListener(
      SETTINGS_SECTION_CHANGE_EVENT,
      handleExternalSectionChange,
    );
    return () =>
      window.removeEventListener(
        SETTINGS_SECTION_CHANGE_EVENT,
        handleExternalSectionChange,
      );
  }, [activeSection, hasUnsavedChanges]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <SettingsHeader active={activeSection} />
      <div>
        <main className="mx-auto min-w-0 max-w-[1440px] p-4 sm:p-6 xl:p-8">
          {activeSection === "company" ? (
            <CompanyPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "agenda" ? (
            <AgendaSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "payments" ? (
            <PaymentsSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "register" ? (
            <RegisterSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "reminders" ? (
            <ReminderSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "records" ? (
            <MedicalRecordsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "emails" ? (
            <EmailSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "clients" ? (
            <ClientSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "surveys" ? (
            <SurveySettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : activeSection === "authorizations" ? (
            <AuthorizationSettingsPanel onDirtyChange={setHasUnsavedChanges} />
          ) : (
            <PendingSettingsPanel section={activeSection} />
          )}
        </main>
      </div>
    </div>
  );
}
