import type {
  Appointment,
  BranchInventory,
  Client,
  InventoryMovementReason,
  PaymentMethodOption,
  Product,
  ReceiptSettings,
  RequiredClientFields,
  Seller,
  LayawayRecord,
  Ticket,
} from "./types";

export const products: Product[] = [
  {
    id: "prod-serum-renewal",
    name: "Renewal Peptide Serum",
    sku: "KSR-SER-001",
    family: "Keysar Skin",
    category: "Sérums",
    group: "Cuidado facial",
    kind: "PRODUCT",
    image: "/products/renewal-serum.png",
    minPrice: 690,
    maxPrice: 890,
    stock: 18,
    stockMin: 5,
    stockMax: 30,
    branches: ["Polanco", "Satélite", "Roma Norte"],
    active: true,
  },
  {
    id: "prod-hydra-cloud",
    name: "Hydra Cloud Cream",
    sku: "KSR-HID-014",
    family: "Keysar Skin",
    category: "Hidratación",
    group: "Cuidado facial",
    kind: "PRODUCT",
    image: "/products/hydra-cloud-cream.png",
    minPrice: 580,
    maxPrice: 760,
    stock: 12,
    stockMin: 4,
    stockMax: 24,
    branches: ["Polanco", "Satélite"],
    active: true,
  },
  {
    id: "prod-vitamin-c",
    name: "Vitamin C Glow",
    sku: "KSR-SER-008",
    family: "Keysar Skin",
    category: "Sérums",
    group: "Cuidado facial",
    kind: "PRODUCT",
    image: "/products/vitamin-c-glow.png",
    minPrice: 620,
    maxPrice: 820,
    stock: 9,
    stockMin: 3,
    stockMax: 20,
    branches: ["Polanco", "Roma Norte"],
    active: true,
  },
  {
    id: "prod-spf-50",
    name: "Mineral Shield SPF 50",
    sku: "KSR-SOL-020",
    family: "Protección Solar",
    category: "Protección",
    group: "Cuidado facial",
    kind: "PRODUCT",
    image: "/products/mineral-spf-50.png",
    minPrice: 420,
    maxPrice: 590,
    stock: 24,
    stockMin: 8,
    stockMax: 40,
    branches: ["Polanco", "Satélite", "Roma Norte"],
    active: true,
  },
  {
    id: "service-brow-sculpt",
    name: "Brow Sculpt",
    sku: "SRV-BRW-003",
    family: "Servicios",
    category: "Cejas",
    group: "Servicios de belleza",
    kind: "SERVICE",
    image: "/products/brow-sculpt.png",
    minPrice: 350,
    maxPrice: 520,
    stock: null,
    stockMin: null,
    stockMax: null,
    branches: ["Polanco", "Satélite"],
    active: true,
  },
  {
    id: "service-signature-facial",
    name: "Signature Facial",
    sku: "SRV-FAC-001",
    family: "Servicios",
    category: "Faciales",
    group: "Servicios de belleza",
    kind: "SERVICE",
    image: "/products/signature-facial.png",
    minPrice: 780,
    maxPrice: 1100,
    stock: null,
    stockMin: null,
    stockMax: null,
    branches: ["Polanco", "Roma Norte"],
    active: true,
  },
];

export const sellers: Seller[] = [
  {
    id: "seller-ana",
    name: "Ana Torres",
    initials: "AT",
    active: true,
    accessCode: "1101",
  },
  {
    id: "seller-sofia",
    name: "Sofía Méndez",
    initials: "SM",
    active: true,
    accessCode: "2202",
  },
  {
    id: "seller-daniela",
    name: "Daniela Ruiz",
    initials: "DR",
    active: true,
    accessCode: "3303",
  },
  {
    id: "seller-paola",
    name: "Paola Castro",
    initials: "PC",
    active: false,
    accessCode: "4404",
  },
];

export const initialPaymentMethods: PaymentMethodOption[] = [
  { id: "CASH", label: "Efectivo", active: true },
  { id: "CARD", label: "Tarjeta", active: true },
  { id: "TRANSFER", label: "Transferencia", active: true },
];

export const initialReceiptSettings: ReceiptSettings = {
  logoUrl: "/logo.svg",
  companyName: "KEYSAR COSMETICS",
  branchName: "Sucursal Polanco",
  address: "Av. Presidente Masaryk 123, Polanco, CDMX",
  footerMessage: "Gracias por confiar en tu belleza.",
  policies:
    "Cambios dentro de 7 días con ticket y producto cerrado. Servicios no reembolsables.",
  showClientName: true,
  showClientPhone: false,
  showSellerName: true,
};

export const initialInventoryMovementReasons: InventoryMovementReason[] = [
  { id: "reason-tester", name: "Tester", active: true },
  { id: "reason-damage", name: "Damage", active: true },
  { id: "reason-lost", name: "Lost", active: true },
  { id: "reason-gift", name: "Gift", active: true },
];

export const initialClients: Client[] = [
  {
    id: "client-1",
    firstName: "Valeria",
    lastName: "Campos",
    birthday: "1992-04-18",
    gender: "Mujer",
    phone: "55 1087 2254",
    whatsapp: "55 1087 2254",
    source: "APPROACH",
    companyName: "",
    companyLocked: false,
    ownerId: "seller-ana",
    saleSellerIds: ["seller-ana"],
  },
  {
    id: "client-2",
    firstName: "Mariana",
    lastName: "López",
    birthday: "1988-10-03",
    gender: "Mujer",
    phone: "55 6712 9041",
    whatsapp: "55 6712 9041",
    source: "LEAD",
    companyName: "Keysar Cosmetics",
    companyLocked: true,
    ownerId: "seller-sofia",
    saleSellerIds: ["seller-sofia", "seller-daniela"],
  },
  {
    id: "client-3",
    firstName: "Renata",
    lastName: "Silva",
    birthday: "1996-01-27",
    gender: "Mujer",
    phone: "55 9920 4418",
    whatsapp: "55 9920 4418",
    source: "REFERRAL",
    companyName: "",
    companyLocked: false,
    ownerId: null,
    saleSellerIds: ["seller-daniela"],
  },
];

export const initialAppointments: Appointment[] = [
  {
    id: "appointment-demo-1",
    kind: "COURTESY",
    service: "Facial de cortesía",
    date: "2026-08-24",
    branch: "Polanco",
    time: "11:30",
    clientId: "client-1",
    clientName: "Valeria Campos",
    clientPhone: "55 1087 2254",
    ticketId: "KSR-1048",
    sellerIds: ["seller-ana"],
    recordedAt: "22 ago 2026 · 12:24",
    recordedAtIso: "2026-08-22T12:24:00-06:00",
    status: "SCHEDULED",
  },
  {
    id: "appointment-demo-2",
    kind: "NEXT_SESSION",
    service: "Facial de seguimiento",
    date: "2026-08-27",
    branch: "Satélite",
    time: "17:00",
    clientId: "client-2",
    clientName: "Mariana López",
    clientPhone: "55 6712 9041",
    ticketId: "KSR-1047",
    sellerIds: ["seller-sofia", "seller-daniela"],
    recordedAt: "22 ago 2026 · 11:52",
    recordedAtIso: "2026-08-22T11:52:00-06:00",
    status: "SCHEDULED",
  },
  {
    id: "appointment-demo-3",
    kind: "NO_APPOINTMENT",
    service: "Sin próxima cita facial",
    date: "2026-08-22",
    branch: "Polanco",
    time: "Sin horario",
    clientId: "client-3",
    clientName: "Renata Silva",
    clientPhone: "55 9920 4418",
    ticketId: "KSR-1045",
    sellerIds: ["seller-daniela"],
    recordedAt: "21 ago 2026 · 18:40",
    recordedAtIso: "2026-08-21T18:40:00-06:00",
    status: "PENDING",
  },
];

export const posBranches = ["Polanco", "Satélite", "Roma Norte"];

export const initialBranchInventory: BranchInventory = posBranches.reduce(
  (branches, branch, branchIndex) => {
    branches[branch] = Object.fromEntries(
      products
        .filter((product) => product.kind === "PRODUCT")
        .map((product) => [
          product.id,
          product.branches.includes(branch)
            ? branchIndex === 0
              ? (product.stock ?? 0)
              : Math.floor(
                  (product.stock ?? 0) * (branchIndex === 1 ? 0.65 : 0.45),
                )
            : 0,
        ]),
    );
    return branches;
  },
  {} as BranchInventory,
);

export const initialLayaways: LayawayRecord[] = [
  {
    id: "layaway-demo-valeria",
    originalTicketId: "KSR-0901",
    createdAt: "10 mar 2026 · 16:20",
    createdAtIso: "2026-03-10T16:20:00-06:00",
    clientId: "client-1",
    clientName: "Valeria Campos",
    clientPhone: "55 1087 2254",
    sellerIds: ["seller-ana"],
    total: 1780,
    amountPaid: 880,
    balanceDue: 900,
    items: [
      {
        cartItemId: "demo-renewal",
        productId: "prod-serum-renewal",
        productName: "Renewal Peptide Serum",
        kind: "PRODUCT",
        quantity: 2,
        deliveredQuantity: 1,
      },
    ],
    payments: [
      {
        id: "layaway-demo-payment",
        folio: "APT-DEMO-001",
        createdAt: "10 mar 2026 · 16:20",
        createdAtIso: "2026-03-10T16:20:00-06:00",
        amount: 880,
        methodId: "CARD",
      },
    ],
    status: "ACTIVE",
  },
];

export const initialTickets: Ticket[] = [
  {
    id: "KSR-1048",
    createdAt: "22 ago 2026 · 12:24",
    createdAtIso: "2026-08-22T12:24:00-06:00",
    clientName: "Valeria Campos",
    clientPhone: "55 1087 2254",
    sellerSummary: "Ana Torres",
    items: 2,
    discountAmount: 0,
    subtotal: 1430,
    total: 1430,
    deviation: 160,
    paymentMethod: "CASH",
    payments: [{ id: "pay-1048-1", methodId: "CASH", amount: 1430 }],
    amountPaid: 1430,
    balanceDue: 0,
    paymentStatus: "PAID",
    products: [
      {
        productId: "prod-serum-renewal",
        name: "Renewal Peptide Serum",
        quantity: 1,
        total: 890,
      },
      {
        productId: "service-brow-sculpt",
        name: "Brow Sculpt",
        quantity: 1,
        total: 540,
      },
    ],
    sellerSales: [
      { sellerId: "seller-ana", sellerName: "Ana Torres", amount: 1430 },
    ],
    status: "COMPLETED",
  },
  {
    id: "KSR-1047",
    createdAt: "22 ago 2026 · 11:52",
    createdAtIso: "2026-08-22T11:52:00-06:00",
    clientName: "Mariana López",
    clientPhone: "55 6712 9041",
    sellerSummary: "Sofía Méndez / Daniela Ruiz",
    items: 3,
    discountAmount: 120,
    subtotal: 1880,
    total: 1760,
    deviation: 230,
    paymentMethod: "CARD",
    payments: [{ id: "pay-1047-1", methodId: "CARD", amount: 1760 }],
    amountPaid: 1760,
    balanceDue: 0,
    paymentStatus: "PAID",
    products: [
      {
        productId: "prod-hydra-cloud",
        name: "Hydra Cloud Cream",
        quantity: 2,
        total: 1220,
      },
      {
        productId: "service-brow-sculpt",
        name: "Brow Sculpt",
        quantity: 1,
        total: 540,
      },
    ],
    sellerSales: [
      {
        sellerId: "seller-sofia",
        sellerName: "Sofía Méndez",
        amount: 880,
      },
      {
        sellerId: "seller-daniela",
        sellerName: "Daniela Ruiz",
        amount: 880,
      },
    ],
    status: "COMPLETED",
  },
  {
    id: "KSR-1046",
    createdAt: "22 ago 2026 · 10:18",
    createdAtIso: "2026-08-22T10:18:00-06:00",
    clientName: "Venta mostrador",
    clientPhone: "",
    sellerSummary: "Ana Torres",
    items: 1,
    discountAmount: 0,
    subtotal: 540,
    total: 540,
    deviation: -40,
    paymentMethod: "TRANSFER",
    payments: [{ id: "pay-1046-1", methodId: "TRANSFER", amount: 300 }],
    amountPaid: 300,
    balanceDue: 240,
    paymentStatus: "LAYAWAY",
    products: [
      {
        productId: "service-brow-sculpt",
        name: "Brow Sculpt",
        quantity: 1,
        total: 540,
      },
    ],
    sellerSales: [
      { sellerId: "seller-ana", sellerName: "Ana Torres", amount: 540 },
    ],
    status: "COMPLETED",
  },
  {
    id: "KSR-1045",
    createdAt: "21 ago 2026 · 18:40",
    createdAtIso: "2026-08-21T18:40:00-06:00",
    clientName: "Renata Silva",
    clientPhone: "55 9920 4418",
    sellerSummary: "Daniela Ruiz",
    items: 2,
    discountAmount: 0,
    subtotal: 1090,
    total: 1090,
    deviation: 90,
    paymentMethod: "CASH",
    payments: [],
    amountPaid: 0,
    balanceDue: 1090,
    paymentStatus: "PENDING",
    products: [
      {
        productId: "prod-spf-50",
        name: "Mineral Shield SPF 50",
        quantity: 1,
        total: 590,
      },
      {
        productId: "service-brow-sculpt",
        name: "Brow Sculpt",
        quantity: 1,
        total: 500,
      },
    ],
    sellerSales: [
      {
        sellerId: "seller-daniela",
        sellerName: "Daniela Ruiz",
        amount: 1090,
      },
    ],
    status: "COMPLETED",
  },
];

export const initialRequiredClientFields: RequiredClientFields = {
  firstName: true,
  lastName: true,
  birthday: false,
  gender: false,
  phone: true,
  whatsapp: false,
  source: true,
  companyName: false,
};

export const administratorCode = "2468";

export const encodeMinimumPrice = (value: number) =>
  Math.round(value).toString();

export const getSellerSkuBase = (product: Product) =>
  product.sku.replace(/-[^-]+$/, "");

export const getSellerSku = (product: Product) =>
  `${getSellerSkuBase(product)}-${encodeMinimumPrice(product.minPrice)}`;

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
