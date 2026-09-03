import type {
  BankCatalogEntry,
  CardNetwork,
  CardType,
  PaymentEntry,
} from "./types";

export const cardNetworkLabels: Record<CardNetwork, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
};

const currentAbmBankNames = [
  "Banca Afirme",
  "Banca Mifel",
  "Banco Actinver",
  "Banco Azteca",
  "Banco Bancrea",
  "Banco Base",
  "Banco Bineo",
  "Banco Citi México",
  "Banco Compartamos",
  "Banco Covalto",
  "Banco Credit Suisse (México)",
  "Banco de Inversión Afirme",
  "Banco del Bajío",
  "Banco BanFeliz",
  "Banco Inbursa",
  "Banco Inmobiliario Mexicano",
  "Banco Invex",
  "Banco JP Morgan",
  "Banco KEB Hana México",
  "Banco Monex",
  "Banco Multiva",
  "Banco Nacional de México",
  "Banco PagaTodo",
  "Banco Plata",
  "Banco Regional de Monterrey",
  "Banco S3 Caceis México",
  "Banco Sabadell",
  "Banco Santander",
  "Banco Shinhan de México",
  "Banco Ve por Más",
  "BanCoppel",
  "Bank of America Mexico",
  "Bank of China Mexico",
  "Bankaool",
  "Banorte",
  "Bansí",
  "Barclays Bank México",
  "BBVA México",
  "BNP Paribas",
  "Consubanco",
  "Fundación Dondé Banco",
  "Hey Banco",
  "HSBC México",
  "Industrial and Commercial Bank of China",
  "Intercam Banco",
  "Kapital Bank",
  "Mizuho Bank",
  "MUFG Bank Mexico",
  "Nu México",
  "Openbank",
  "Revolut",
  "Scotiabank",
  "UALÁ",
  "Volkswagen Bank",
] as const;

const bankId = (name: string, index: number) =>
  `MX-BANK-${String(index + 1).padStart(3, "0")}-${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()}`;

export const initialBankCatalog: BankCatalogEntry[] = currentAbmBankNames.map(
  (name, index) => ({
    id: bankId(name, index),
    name,
    active: true,
    cardTypes: ["CREDIT", "DEBIT"],
    cardNetworks: ["VISA", "MASTERCARD"],
    source: "ABM",
  }),
);

export const availableBanks = (
  catalog: BankCatalogEntry[],
  cardType?: CardType,
  cardNetwork?: CardNetwork,
) =>
  catalog
    .filter(
      (bank) =>
        bank.active &&
        (!cardType || bank.cardTypes.includes(cardType)) &&
        (!cardNetwork || bank.cardNetworks.includes(cardNetwork)),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "es-MX"));

export const paymentBankName = (payment: PaymentEntry) =>
  payment.bankName?.trim() || payment.cardOrBank?.trim() || "";

export const paymentReferenceIsValid = (
  payment: PaymentEntry,
  isCard: boolean,
  installmentOptions: number[],
) => {
  if (!/^\d{4}$/.test(payment.authorizationCode ?? "")) return false;
  if (!paymentBankName(payment)) return false;
  if (!isCard) return true;
  if (!payment.cardType || !payment.cardNetwork) return false;
  return (
    payment.cardType !== "CREDIT" ||
    installmentOptions.includes(payment.installmentMonths ?? 0)
  );
};
