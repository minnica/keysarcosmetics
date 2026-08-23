export type EntityStatus = "active" | "inactive" | "draft";

export interface ScheduleDay {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
  breaks?: ScheduleBreak[];
  /** Campos legacy para horarios creados antes de soportar múltiples descansos. */
  breakStart: string | undefined;
  breakEnd: string | undefined;
}

export interface ScheduleBreak {
  start: string;
  end: string;
}

export interface ClassScheduleSlot {
  id: string;
  professionalId: string;
  start: string;
  end: string;
}

export interface ClassScheduleDay {
  day: string;
  slots: ClassScheduleSlot[];
}

export type ServiceSpecialHoursMode = "none" | "range" | "specific";

export interface ServiceSpecialHours {
  mode: ServiceSpecialHoursMode;
  rangeStart: string;
  rangeEnd: string;
  specificTimes: string[];
}

export interface SpecialDay {
  id: string;
  date: string;
  open: string;
  close: string;
}

export interface LocalRecord {
  id: string;
  commerceId: string;
  name: string;
  address: string;
  additionalInfo: string;
  timezone: string;
  phone: string;
  whatsappEnabled: boolean;
  email: string;
  status: "active" | "inactive";
  onlineBooking: boolean;
  homeServiceOnly: boolean;
  secondaryPhone: string;
  description: string;
  coverImage: string | null;
  schedule: ScheduleDay[];
  specialDays: SpecialDay[];
}

export interface ProfessionalRecord {
  id: string;
  commerceIds: string[];
  localIds: string[];
  /** Sucursal principal legacy para flujos mock que aún requieren una sola. */
  localId: string;
  name: string;
  role: string;
  email: string;
  acceptsOnline: boolean;
  createsUser: boolean;
  services: string[];
  biography: string;
  avatar: string | null;
  status: "active" | "inactive";
  schedule: ScheduleDay[];
  specialDays: SpecialDay[];
}

export interface ProfessionalGroup {
  id: string;
  name: string;
  localId: string;
  professionalIds: string[];
}

export interface ServiceRecord {
  id: string;
  name: string;
  category: string;
  type: "service" | "class" | "package" | "add-on";
  price: number;
  duration: number;
  status: "active" | "inactive";
  featured: boolean;
  professionalIds: string[];
  description: string;
  alternativeNames?: string[];
  commissionValue?: number;
  commissionUnit?: "$" | "%";
  videoConference?: boolean;
  homeService?: boolean;
  priceIncludesTax?: boolean;
  allowMultipleClients?: boolean;
  maxClients?: number;
  resourceIds?: string[];
  specialHours?: ServiceSpecialHours;
  sessions?: number;
  capacity?: number;
  classSchedule?: ClassScheduleDay[];
  packageItems?: { serviceId: string; price: number }[];
  packageShowPrice?: boolean;
  packageSimultaneous?: boolean;
}

export interface CommissionRecord {
  id: string;
  professionalId?: string;
  name: string;
  serviceCount?: number;
  value: number;
  unit: "$" | "%";
}

export interface ScheduledResourceRecord {
  id: string;
  name: string;
  localId: string;
  interval: number;
  acceptsOnline: boolean;
  serviceIds: string[];
  status: "active" | "inactive";
  schedule: ScheduleDay[];
  specialDays: SpecialDay[];
}

export interface ResourceRecord {
  id: string;
  name: string;
  category: string;
  serviceIds: string[];
  localQuantities: Record<string, number>;
}

export interface SurveyQuestion {
  id: string;
  category: string;
  type: "rating" | "comment";
  text: string;
  description: string;
}

export interface SurveyRecord {
  id: string;
  name: string;
  serviceIds: string[];
  questionIds: string[];
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  name: string;
  description: string;
  fileName: string | null;
  updatedAt: string;
  status: "active" | "draft";
}

export interface WhatsAppMessageRecord {
  id: string;
  name: string;
  message: string;
  status: "active" | "inactive";
  updatedAt: string;
}

export interface GiftCardRecord {
  id: string;
  name: string;
  type: "service" | "amount";
  serviceIds: string[];
  amount: number;
  salePrice: number;
  expiration: number;
  description: string;
  design: string;
  status: "active" | "inactive" | "draft";
}

export const scheduleDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const createSchedule = (
  open = "10:00",
  close = "22:00",
): ScheduleDay[] =>
  scheduleDays.map((day, index) => ({
    day,
    enabled: index < 6,
    open,
    close,
    breakStart: undefined,
    breakEnd: undefined,
  }));

export const createClassSchedule = (): ClassScheduleDay[] =>
  scheduleDays.map((day) => ({ day, slots: [] }));

export const createEmptyLocal = (): LocalRecord => ({
  id: `local-${Date.now()}`,
  commerceId: "opatra-mexico",
  name: "",
  address: "",
  additionalInfo: "",
  timezone: "America/Mexico_City",
  phone: "",
  whatsappEnabled: true,
  email: "",
  status: "active",
  onlineBooking: true,
  homeServiceOnly: false,
  secondaryPhone: "",
  description: "",
  coverImage: null,
  schedule: createSchedule(),
  specialDays: [],
});

export const initialLocals: LocalRecord[] = [
  {
    ...createEmptyLocal(),
    id: "local-keysar",
    commerceId: "keysar-cosmetics",
    name: "Keysar Cosmetics",
    address: "Av. Paseo de la Reforma, Ciudad de México",
    additionalInfo: "Local principal",
    phone: "+52 55 0000 0000",
    email: "contacto@keysarcosmetics.com",
    description:
      "Espacio de cosmetología, belleza y bienestar de Keysar Cosmetics.",
  },
  {
    ...createEmptyLocal(),
    id: "local-polanco",
    commerceId: "keysar-cosmetics",
    name: "Keysar Polanco",
    address: "Av. Presidente Masaryk 212, Ciudad de México",
    additionalInfo: "Segundo piso",
    phone: "+52 55 0000 0001",
    email: "polanco@keysarcosmetics.com",
    description: "Una experiencia privada de cuidado y belleza en Polanco.",
    status: "inactive",
  },
  {
    ...createEmptyLocal(),
    id: "local-opatra-insurgentes",
    commerceId: "opatra-mexico",
    name: "Galerías Insurgentes",
    address: "Parroquia 194, Ciudad de México",
    additionalInfo: "Sucursal OPATRA",
    phone: "+52 55 0000 0010",
    email: "insurgentes@opatra.example",
    description: "Sucursal de atención OPATRA en Galerías Insurgentes.",
  },
  {
    ...createEmptyLocal(),
    id: "local-opatra-mitikah",
    commerceId: "opatra-mexico",
    name: "Mitikah",
    address: "Av. Río Churubusco 601, Ciudad de México",
    additionalInfo: "Sucursal OPATRA",
    phone: "+52 55 0000 0011",
    email: "mitikah@opatra.example",
    description: "Sucursal de atención OPATRA en Mitikah.",
  },
  {
    ...createEmptyLocal(),
    id: "local-opatra-masaryk",
    commerceId: "opatra-mexico",
    name: "Masaryk",
    address: "Av. Presidente Masaryk, Ciudad de México",
    additionalInfo: "Sucursal OPATRA",
    phone: "+52 55 0000 0012",
    email: "masaryk@opatra.example",
    description: "Sucursal de atención OPATRA en Masaryk.",
  },
];

export const initialProfessionals: ProfessionalRecord[] = [
  {
    id: "professional-patricia",
    commerceIds: ["keysar-cosmetics", "opatra-mexico"],
    localIds: ["local-keysar", "local-opatra-mitikah"],
    localId: "local-keysar",
    name: "Patricia Delgado",
    role: "Especialista en faciales",
    email: "patricia@keysarcosmetics.com",
    acceptsOnline: true,
    createsUser: true,
    services: ["service-facial", "service-masaje"],
    biography:
      "Especialista en rituales faciales y experiencias de relajación.",
    avatar: null,
    status: "active",
    schedule: createSchedule("09:00", "22:00"),
    specialDays: [],
  },
  {
    id: "professional-mariana",
    commerceIds: ["keysar-cosmetics"],
    localIds: ["local-keysar"],
    localId: "local-keysar",
    name: "Mariana Ortega",
    role: "Cosmetóloga",
    email: "mariana@keysarcosmetics.com",
    acceptsOnline: true,
    createsUser: false,
    services: ["service-facial", "service-masaje", "service-facial-2"],
    biography:
      "Acompaña cada visita con precisión, calidez y atención al detalle.",
    avatar: null,
    status: "active",
    schedule: createSchedule("10:00", "22:00"),
    specialDays: [],
  },
  {
    id: "professional-sofia",
    commerceIds: ["keysar-cosmetics"],
    localIds: ["local-polanco"],
    localId: "local-polanco",
    name: "Sofía Ramírez",
    role: "Terapeuta corporal",
    email: "sofia@keysarcosmetics.com",
    acceptsOnline: false,
    createsUser: false,
    services: ["service-masaje"],
    biography:
      "Terapias corporales personalizadas para recuperar el equilibrio.",
    avatar: null,
    status: "inactive",
    schedule: createSchedule("11:00", "22:00"),
    specialDays: [],
  },
];

const legacyServices: ServiceRecord[] = [
  {
    id: "service-facial",
    name: "Facial Keysar Signature",
    category: "Faciales",
    type: "service",
    price: 950,
    duration: 60,
    status: "active",
    featured: true,
    professionalIds: ["professional-patricia", "professional-mariana"],
    description: "Limpieza, hidratación y masaje facial personalizado.",
  },
  {
    id: "service-masaje",
    name: "Masaje relajante",
    category: "Bienestar",
    type: "service",
    price: 800,
    duration: 60,
    status: "active",
    featured: false,
    professionalIds: [
      "professional-patricia",
      "professional-mariana",
      "professional-sofia",
    ],
    description: "Sesión corporal para liberar tensión y descansar.",
  },
  {
    id: "service-cejas",
    name: "Diseño de cejas",
    category: "Mirada",
    type: "service",
    price: 420,
    duration: 30,
    status: "active",
    featured: false,
    professionalIds: ["professional-mariana"],
    description: "Diseño y definición de cejas según tu rostro.",
  },
  {
    id: "class-yoga",
    name: "Yoga facial en grupo",
    category: "Clases",
    type: "class",
    price: 380,
    duration: 45,
    status: "active",
    featured: false,
    professionalIds: ["professional-patricia"],
    description: "Clase guiada para activar y relajar los músculos del rostro.",
    capacity: 8,
  },
  {
    id: "package-reset",
    name: "Ritual Reset",
    category: "Experiencias",
    type: "package",
    price: 1450,
    duration: 120,
    status: "active",
    featured: true,
    professionalIds: ["professional-patricia", "professional-mariana"],
    description:
      "Facial Signature y masaje relajante en una experiencia completa.",
  },
  {
    id: "addon-mask",
    name: "Mascarilla premium",
    category: "Adicionales",
    type: "add-on",
    price: 180,
    duration: 15,
    status: "active",
    featured: false,
    professionalIds: [],
    description: "Complemento nutritivo para potenciar tu tratamiento.",
  },
];

const createRealService = (
  id: string,
  name: string,
  category: string,
  type: ServiceRecord["type"] = "service",
  price = 0,
  duration = 60,
  professionalIds: string[] = [],
): ServiceRecord => ({
  id,
  name,
  category,
  type,
  price,
  duration,
  status: "active",
  featured: false,
  professionalIds,
  commissionValue: 0,
  commissionUnit: "%",
  description: `Servicio de la categoría ${category}.`,
  ...(type === "package" ? { sessions: 5 } : {}),
});

const realFacialServices = [
  "Acné Neuronova Instagram",
  "FACIAL + 10 MIN OXYCURA",
  "MOMENTS 2X1 INSTAGRAM",
  "FACIAL ANTI ACNE",
  "FACIAL DOBLE INSTAGRAM",
  "FACIAL ETERNAL AGE",
  "Facial express Instagram",
  "Facial sumer scape doble",
  "Facial sumer scape individual",
  "WOW BIO-LIFTING INSTAGRAM",
  "FACIAL VIP CORTESÍA",
  "BIO LIFTING FACIAL INSTAGRAM",
  "FACIAL VIP INSTAGRAM",
  "FACIAL + REDUCTIVO INSTAGRAM",
  "OXYCURA FACIAL INSTAGRAM",
  "FACIAL DE CUMPLEAÑOS",
  "FACIAL PEEL OFF",
  "FACIAL OXYCURA",
  "FACIAL HYDRATING REGIMEN SET",
  "FACIAL RITUAL EYE VIP",
  "FACIAL CRYOSKIN",
  "FACIAL REFLEXOLOGIA",
];

const realMassageServices = [
  "CORPORAL DIA DEL PADRE DOBLE INSTAGRAM",
  "CORPORAL DEL PADRE INSTAGRAM",
  "Corporal doble Instagram",
  "CORTESIAS LEAD",
  "MASAJE DOBLE HOTSALE",
  "Masaje doble mundial",
  "MASAJE HOT SALE",
  "MASAJE CORPORAL CORTESÍA",
  "Masaje descontracturante Doble",
  "MEMBRESIA 5 SESIONES CORPORAL",
  "MASAJE CORPORAL RELAJANTE",
  "MASAJE CORPORAL REDUCTIVO",
  "DRENAJE LINFATICO",
  "TERAPIA DE REFLEXOLOGIA",
  "MASAJE DESCONTRACTURANTE",
  "MASAJE PIERNAS CANSADAS",
  "CORPORAL INSTAGRAM",
];

const realMembershipServices = [
  "MEMBRESIA OXYCURA 5 SESIONES",
  "MEMBRESIA 14 SESIONES CELESTIAL RENEWAL SYSTEM",
  "MEMBRESIA CRYOSKIN 14 SESIONES.",
  "MEMBRESIA CRYOSKIN 7 SESIONES.",
  "MEMBRESIA ETERNAL AGE 7 SESIONES",
  "MEMBRESIA EYE RITUAL",
  "MEMBRESIA NEURONOVA",
  "MEMBRESIA 7 SESIONES CELESTIAL RENEWAL SYSTEM",
  "MEMBRESIA PEEL OFF",
  "MEMBRESIA PURE GOLDEN GLOW (LAMINAS DE ORO )",
  "MEMBRESIA 16 SESIONES DIVINE NECK AND CHEST SYSTEM",
  "MEMBRESIA PURE GOLDEN GLOW 5 SESIONES",
  "MEMBRESIAS 8 SESIONES DIVINE NECK AND CHEST SYSTEM",
];

const realFollowUpServices = ["FACIAL DE CORTESIA", "RECUPERACION"];

const realProductNames = [
  "BEAUTY BAG",
  "BODY BUTTER - NAP",
  "BRIGHTENING ACEITE",
  "CAVIAR AGE DEFENSE",
  "CAVIAR EYE CREAM",
  "CAVIAR FACE LIFTING",
  "CAVIAR FACE MASK",
  "CAVIAR NECOLA",
  "CAVIAR SKIN CARE SET",
  "COLLAGEN MASK SET",
  "COMPLEMENTO DE CUIDADO",
  "DAY CREAM OPATRA",
  "DERMISONIC 2",
  "DETOXING PINK CLAY",
  "EYE CARE SET OPATRA",
  "EYE CREAM OPATRA",
  "Facial Instagram Premium",
  "Facial Reflexologia",
  "FACIAL VIP OPATRA",
  "FLAWLESS FINISH SET",
  "Foam Cleanser",
  "GLOW & GO OPATRA",
  "HIMALAYAN SALT SCRUB",
  "MEMBRESIA 5 SESIONES",
  "MEMBRESIA REFLEXOLOGIA",
  "MILK CLEANSER",
  "MILK CLEANSER OPATRA",
  "MULTIFRUIT VITAMIN",
  "NEWLINE PEEL",
  "NEWLINE SYRINGE",
  "OPATRA DERMI EYE",
  "OPATRA DERMILIGHT",
  "OPATRA DERMINE",
  "OPATRA REVITALISING",
  "OPATRA SE REVERSE",
  "OPATRA SYNERGY LIFT",
  "PEELING OPATRA LIFT",
  "PEEL OPATRA",
  "PHYTO SERUM EYE",
  "PLUMPING FACE SERUM",
  "PURE GOLDEN GLOW",
  "RENEWING NIGHT CREAM",
  "REVITALISING MASK",
  "SKIN ESSENTIALS SET",
  "SOAP DOUBLE PACK",
  "STRING LIFT SCULPT",
  "SYNERGY MARBLE MASK",
  "SYRINGE VIOPURE",
  "THERMAL SET",
  "TONER OPATRA LONDON",
  "VELA AROMATICA",
  "1 DRENAJE LINFATICO",
  "1 FACIAL BASIC",
  "1 FACIAL CLASSIC",
  "1 FACIAL PEEL OFF",
  "1 MASAJE CORPORAL",
  "3D RF ULTRASOUND FACE",
  "CELESTIAL RENEWAL",
  "HAND & BODY CREAM",
  "JELESSI EYE",
  "JELESSI NECK",
  "MARVELOUS 24K",
  "MEMBRESIA CORPORAL",
  "NECK AND CHEST SYSTEM",
  "PERFECTIO PLUS",
  "PERFECTIO SILVER",
  "PERFECTIO X",
  "PROMO INSTAGRAM",
  "RADIANT BODY EX",
  "REVITALIZING BODY",
  "TARJETA MEMBRESIA",
  "DARK CIRCLE",
  "HYDRATING MULTI",
  "LIFT + TIGHTEN NECK",
  "MORNING GLOW DROPS",
  "MOUSSE CLEANSER",
  "MULBERRY HYDRATING",
  "NIGHT REPAIR AVINICHI",
  "PEEL AVINICHI",
  "PEEL STEMTOX",
  "PHYTO SERUM",
  "PHYTO THERMAL",
  "SYRINGE AVINICHI",
  "THERMAL MASK AVINICHI",
  "ACTIV FIRM LIFT CREAM",
  "CLEANSER GENTLE",
  "EYE SERUM RENEWAL",
  "FOAMING CLEANSER",
  "LIQUID LIFT OVERNIGHT",
  "PEEL PROBIO",
  "TONER FRESH",
  "3D ULTRASOUND",
  "EMPIRE TECH DERMA",
  "GENESIS PRIME - EYE",
  "AECOR NECK",
  "RADIANCE PULSE",
  "MEMBRESIA DIVINE",
  "CORPORAL DIA DEL PADRE",
  "Facial Express Instagram",
  "FACIAL VIP HOT SALE",
  "FACIAL DOBLE HOT SALE",
  "FACIAL HOT SALE",
  "MASAJE DOBLE HOT SALE",
  "MASAJE HOT SALE",
];

const realFacialPrices = [
  999, 799, 1499, 1499, 1499, 4300, 499, 1499, 799, 799, 3800, 799,
  799, 799, 799, 0, 3800, 4900, 2800, 2500, 3500, 2500,
];
const realFacialDurations = [50, 60, 60, 60, 50, 60, 30, 60, 60, 50, 60, 50, 50, 50, 50, 60, 60, 60, 50, 60, 60, 60];
const realMassagePrices = [1499, 799, 1499, 0, 1499, 1999, 799, 3800, 1499, 10000, 2500, 2500, 2500, 3800, 3800, 3800, 799];
const realMembershipPrices = [25000, 30000, 32000, 20000, 28000, 14000, 30000, 15000, 25000, 200000, 20000, 35000, 12000];

const initialExtraServices: ServiceRecord[] = [
  {
    ...createRealService("class-yoga", "Yoga facial en grupo", "Clases", "class", 380, 45, ["professional-patricia"]),
    capacity: 8,
    description: "Clase guiada para activar y relajar los músculos del rostro.",
  },
  {
    ...createRealService("package-reset", "Ritual Reset", "Experiencias", "package", 1450, 120, ["professional-patricia", "professional-mariana"]),
    sessions: 2,
    featured: true,
    description: "Facial y masaje en una experiencia completa.",
  },
  {
    ...createRealService("addon-mask", "Mascarilla premium", "Adicionales", "add-on", 180, 15),
    description: "Complemento nutritivo para potenciar tu tratamiento.",
  },
];

export const initialServices: ServiceRecord[] = [
  ...realFacialServices.map((name, index) =>
    createRealService(
      index === 0 ? "service-facial" : `service-facial-${index}`,
      name,
      "Faciales",
      "service",
      realFacialPrices[index] ?? 0,
      realFacialDurations[index] ?? 60,
      index === 0
        ? ["professional-patricia", "professional-mariana"]
        : [],
    ),
  ),
  ...realMassageServices.map((name, index) =>
    createRealService(
      index === 0 ? "service-masaje" : `service-masaje-${index}`,
      name,
      "Masajes",
      "service",
      realMassagePrices[index] ?? 0,
      index === 0 ? 60 : index === 1 ? 50 : 60,
      index === 0
        ? [
            "professional-patricia",
            "professional-mariana",
            "professional-sofia",
          ]
        : [],
    ),
  ),
  ...realMembershipServices.map((name, index) =>
    createRealService(
      `service-membership-${index}`,
      name,
      "MEMBRESIAS",
      "service",
      realMembershipPrices[index] ?? 0,
      60,
      [],
    ),
  ),
  ...realFollowUpServices.map((name, index) =>
    createRealService(
      index === 0 ? "follow-up-courtesy" : "follow-up-recovery",
      name,
      "Seguimientos",
    ),
  ),
  ...realProductNames.map((name, index) =>
    createRealService(`product-${index}`, name, "Productos", "add-on"),
  ),
  ...initialExtraServices,
];

export const initialGroups: ProfessionalGroup[] = [
  {
    id: "group-cabinas",
    name: "Cabinas principales",
    localId: "local-keysar",
    professionalIds: ["professional-patricia", "professional-mariana"],
  },
];

export const initialCommissions: CommissionRecord[] = [
  {
    id: "commission-patricia",
    professionalId: "professional-patricia",
    name: "Patricia Delgado",
    serviceCount: 2,
    value: 15,
    unit: "%",
  },
  {
    id: "commission-mariana",
    professionalId: "professional-mariana",
    name: "Mariana Ortega",
    serviceCount: 3,
    value: 12,
    unit: "%",
  },
  {
    id: "commission-sofia",
    professionalId: "professional-sofia",
    name: "Sofía Ramírez",
    serviceCount: 1,
    value: 10,
    unit: "%",
  },
];

export const initialScheduledResources: ScheduledResourceRecord[] = [
  {
    id: "scheduled-cabina-1",
    name: "Cabina facial 1",
    localId: "local-keysar",
    interval: 15,
    acceptsOnline: true,
    serviceIds: ["service-facial"],
    status: "active",
    schedule: createSchedule("09:00", "19:00"),
    specialDays: [],
  },
  {
    id: "scheduled-cabina-2",
    name: "Cabina corporal 2",
    localId: "local-keysar",
    interval: 30,
    acceptsOnline: true,
    serviceIds: ["service-masaje"],
    status: "active",
    schedule: createSchedule("10:00", "20:00"),
    specialDays: [],
  },
];

export const initialResources: ResourceRecord[] = [
  {
    id: "resource-led",
    name: "Máscara LED",
    category: "Tecnología",
    serviceIds: ["service-facial"],
    localQuantities: { "local-keysar": 2 },
  },
  {
    id: "resource-aromatherapy",
    name: "Kit de aromaterapia",
    category: "Bienestar",
    serviceIds: ["service-masaje"],
    localQuantities: { "local-keysar": 4, "local-polanco": 2 },
  },
];

export const surveyCategories = [
  "Precio",
  "Calidad",
  "Puntualidad",
  "Limpieza y orden",
  "Recomendabilidad",
  "Retornabilidad",
  "Agendamiento",
  "Atención del personal",
];

export const initialSurveyQuestions: SurveyQuestion[] = [
  {
    id: "question-price",
    category: "Precio",
    type: "rating",
    text: "¿Te parece apropiado el precio pagado por este servicio?",
    description: "Evalúa la relación entre el precio y la experiencia.",
  },
  {
    id: "question-quality",
    category: "Calidad",
    type: "rating",
    text: "¿Cómo calificarías la calidad del servicio recibido?",
    description: "Evalúa tu experiencia general.",
  },
  {
    id: "question-punctuality",
    category: "Puntualidad",
    type: "rating",
    text: "¿Cómo calificarías la puntualidad del servicio recibido?",
    description: "Cuéntanos cómo fue el cumplimiento de tu horario.",
  },
  {
    id: "question-cleanliness",
    category: "Limpieza y orden",
    type: "rating",
    text: "¿Cómo calificarías la limpieza y el orden de nuestra sucursal?",
    description: "Evalúa el espacio donde recibiste tu servicio.",
  },
  {
    id: "question-recommend",
    category: "Recomendabilidad",
    type: "rating",
    text: "¿Qué probabilidad hay de que recomiendes este servicio a un amigo?",
    description: "Tu recomendación nos ayuda a crecer.",
  },
  {
    id: "question-return",
    category: "Retornabilidad",
    type: "rating",
    text: "¿Qué probabilidad hay de que vuelvas a tomar este servicio con nosotros?",
    description: "Queremos saber si volverías a elegirnos.",
  },
  {
    id: "question-booking-arrival",
    category: "Agendamiento",
    type: "rating",
    text: "¿Cómo te pareció el proceso de toma de hora?",
    description: "Evalúa la facilidad para elegir tu horario.",
  },
  {
    id: "question-booking-appointment",
    category: "Agendamiento",
    type: "rating",
    text: "¿Cómo te pareció el proceso para agendar tu cita?",
    description: "Evalúa la experiencia de reserva.",
  },
  {
    id: "question-booking-agent",
    category: "Agendamiento",
    type: "rating",
    text: "¿Cómo te pareció el proceso de nuestro agente al programar tu cita?",
    description: "Evalúa la atención durante la programación.",
  },
  {
    id: "question-comment",
    category: "Atención del personal",
    type: "rating",
    text: "¿Cómo calificarías la atención del profesional que te atendió?",
    description: "Evalúa la atención recibida durante tu visita.",
  },
  {
    id: "question-improvement",
    category: "Atención del personal",
    type: "comment",
    text: "¿Qué podríamos mejorar en tu próxima visita?",
    description: "Comparte cualquier comentario.",
  },
];

export const initialSurveys: SurveyRecord[] = [
  {
    id: "survey-post-service",
    name: "Experiencia después de tu visita",
    serviceIds: ["service-facial", "service-masaje"],
    questionIds: [
      "question-quality",
      "question-recommend",
      "question-comment",
    ],
    updatedAt: "Hace 2 días",
  },
];

export const initialConsents: ConsentRecord[] = [
  {
    id: "consent-treatment",
    name: "Consentimiento para tratamientos faciales",
    description: "Autorización para realizar tratamientos cosméticos faciales.",
    fileName: "consentimiento-facial.pdf",
    updatedAt: "Hace 1 semana",
    status: "active",
  },
  {
    id: "consent-photo",
    name: "Autorización de uso de imagen",
    description: "Permiso opcional para utilizar fotografías de resultados.",
    fileName: null,
    updatedAt: "Hace 3 semanas",
    status: "draft",
  },
];

export const initialWhatsAppMessages: WhatsAppMessageRecord[] = [
  {
    id: "whatsapp-dia-servicio-opatra",
    name: "DIA DEL SERVICIO OPATRA",
    message: `Hola {{nombre_cliente}}

En Opatra México estamos listos para recibirte en nuestras cabinas y pases el día de hoy un momento increíble en {{profesional}}

Disfrútalo!!`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-mensaje-bienvenida",
    name: "MENSAJE DE BIENVENIDA",
    message: `Hola {{nombre_cliente}} {{apellido_cliente}}

Estamos encantados de que nos hayas elegido.
Tu confianza significa mucho para nosotros, y estamos aquí para brindarte una experiencia excepcional y única.

Nos enorgullece ofrecer servicios de alta calidad y atención personalizada.

Gracias por formar parte de nuestro exclusivo círculo de clientes satisfechos.

Customer Service Keysar Cosmetics`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-confirmacion-opatra",
    name: "CONFIRMACION OPATRA",
    message: `✨ OPATRA LONDON MÉXICO ✨

¡Hola {{nombre_cliente}} {{apellido_cliente}}!

Tenemos reservada para ti tu próxima cita para este

* {{fecha_hora_reserva}}
* {{nombre_servicio}}
* {{profesional}}

¿Puedo confirmar tu asistencia? 😊`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-postventa",
    name: "POSTVENTA",
    message: `Estimado/a {{nombre_cliente}} {{apellido_cliente}}!

En nombre del equipo de OPATRA MÉXICO, queremos expresar nuestro agradecimiento por confiar en nosotros. Tu apoyo y preferencia son fundamentales para nuestro éxito y nos enorgullece poder servirte.

Esperamos haber cumplido con tus expectativas. Nuestro compromiso es brindarte la mejor atención y calidad.

Si alguna vez necesitas ayuda, información adicional o deseas compartir tus comentarios, no dudes en contactarnos.

ATT.
Equipo de atención a clientes`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-agradecimiento",
    name: "AGRADECIMIENTO",
    message: `¡Hola {{nombre_cliente}} {{apellido_cliente}}!

Esperamos que hayas disfrutado tu experiencia con nosotros. Si te gustó nuestro servicio, ¿podrías tomarte un momento para dejar un comentario en nuestras redes sociales?

¡Tu opinión es valiosa para nosotros y ayuda a otros clientes a conocer más sobre nosotros!

¡Gracias por tu preferencia, esperamos poder consentirte nuevamente!

Customer Service Keysar Cosmetics & Opatra London`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-confirmacion-mitikah",
    name: "CONFIRMACION MITIKAH",
    message: `¡Hola {{nombre_cliente}} {{apellido_cliente}}!
Mi nombre es ,
Tenemos reservada para ti tu próxima cita para este
* {{fecha_hora_reserva}}
* {{nombre_servicio}}
* {{profesional}}

Customer Service Keysar Cosmetics

¿Puedo confirmar tu asistencia? 😊`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-opatra-citas-pendientes",
    name: "OPATRA RESERVACION A CITAS PENDIENTES",
    message: `*OPATRA MÉXICO*

¡Hola {{nombre_cliente}}!

El motivo de mi mensaje es para poder reservar la cita que tenemos pendiente en nuestra sucursal de Plaza Galerías Insurgentes y poder continuar con el seguimiento al cuidado de tu piel.

Por favor indícame una fecha y hora que sean de tu preferencia para revisar la disponibilidad en agenda.

Quedo atenta de ti deseando tengas un bello día!
saludos cordiales 😊

Customer Service`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-recordatorio-mitikah",
    name: "RECORDATORIO MITIKAH",
    message: `Buenos días {{nombre_cliente}}

Te recordamos tu Cita del día de hoy {{fecha_hora_reserva}}
En nuestra sucursal MITIKAH

https://g.co/kgs/cGf6cqx

Te esperamos ✨

Customer Service Keysar Cosmetics.`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-mitikah-citas-pendientes",
    name: "MITIKAH RESERVA DE CITAS PENDIENTES",
    message: `¡Hola {{nombre_cliente}}!

El motivo de mi mensaje es para poder reservar la cita que tenemos pendiente en nuestra sucursal de Mitikah y poder continuar con el seguimiento al cuidado de tu piel.

Por favor indícame una fecha y hora que sean de tu preferencia para revisar la disponibilidad en agenda.

Quedamos pendiente de ti deseándote un excelente día.

Customer Service Keysar Cosmetics`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-dia-servicio-mitikah",
    name: "DIA DEL SERVICIO MITIKAH",
    message: `Hola {{nombre_cliente}}

En Keysar Cosmetics estamos listos para recibirte en nuestras cabinas y pases el día de hoy un momento increíble.

Disfrútalo!!!

{{fecha_hora_reserva}}`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-recordatorio-opatra",
    name: "RECORDATORIO OPATRA",
    message: `✨ OPATRA LONDON MÉXICO ✨

Buenos días {{nombre_cliente}}

Te recordamos tu Cita del día de hoy {{fecha_hora_reserva}}
En nuestra sucursal Galerías Insurgentes

https://g.co/kgs/Ydi1Qcb

Te esperamos ✨

Ubicación dentro de la plaza: segundo piso frente a Game Planet.

Te esperamos ✨`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-reagenda-opatra",
    name: "REAGENDA OPATRA",
    message: `OPATRA MÉXICO

¡Hola {{nombre_cliente}} {{apellido_cliente}}!

Notamos que has cancelado tu reserva programada para el {{fecha_hora_reserva}}. Entendemos que a veces surgen imprevistos, nos encantaría poder atenderte en otro momento y estamos aquí para ayudarte a encontrar un horario que se ajuste a tu agenda.

Por favor indícame una nueva fecha y hora para verificar espacios disponibles y reservar tu cita.

Saludos

Customer service Keysar Cosmetics`,
    status: "active",
    updatedAt: "Precargado",
  },
  {
    id: "whatsapp-no-asistio",
    name: "NO ASISTIO",
    message: `¡Hola {{nombre_cliente}}.

Esperamos te encuentres bien ya que no acudiste a tu cita.

Entendemos que a veces surgen imprevistos.

Nos encantaría poder atenderte en otro momento y estamos aquí para ayudarte a encontrar un horario que se ajuste a tu agenda.

Por favor indícame una nueva fecha y hora que sea de tu preferencia para revisar disponibilidad y poder reagendar esta cita.

Customer Service Keysar Cosmetics`,
    status: "active",
    updatedAt: "Precargado",
  },
];

export const initialGiftCards: GiftCardRecord[] = [
  {
    id: "gift-facial",
    name: "Ritual facial Signature",
    type: "service",
    serviceIds: ["service-facial"],
    amount: 950,
    salePrice: 950,
    expiration: 90,
    description: "Regala una experiencia de cuidado facial.",
    design: "arena",
    status: "active",
  },
  {
    id: "gift-1500",
    name: "Gift card Keysar $1,500",
    type: "amount",
    serviceIds: [],
    amount: 1500,
    salePrice: 1500,
    expiration: 180,
    description: "Un regalo abierto para elegir cualquier experiencia Keysar.",
    design: "lavanda",
    status: "draft",
  },
];
