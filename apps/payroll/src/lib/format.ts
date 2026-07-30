export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function uppercaseInput(value: string): string {
  return value.toLocaleUpperCase("es-MX");
}

export function normalizeUppercase(value: string): string {
  return uppercaseInput(value).trim();
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "BORRADOR",
  CALCULATED: "CALCULADO",
  APPROVED: "APROBADO",
  PAID: "PAGADO",
  CANCELED: "CANCELADO",
  PENDING: "PENDIENTE",
  REJECTED: "RECHAZADO",
  LOST: "PERDIDO",
  GENERATED: "GENERADO",
  SENT: "ENVIADO",
  CONFIRMED: "CONFIRMADO",
};

export function formatStatus(value: string): string {
  return STATUS_LABELS[value] ?? value;
}

export function sumBy<T>(rows: T[], selector: (row: T) => number): number {
  return rows.reduce((total, row) => total + selector(row), 0);
}
