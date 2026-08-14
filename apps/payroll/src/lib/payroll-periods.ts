export interface PayrollPeriodOption {
  value: string;
  month: string;
  from: string;
  to: string;
  shortLabel: string;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function payrollPeriodOptions(monthCount = 12): PayrollPeriodOption[] {
  const now = new Date();
  const options: PayrollPeriodOption[] = [];

  for (let offset = 0; offset < monthCount; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthNumber = date.getMonth() + 1;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const lastDay = new Date(year, monthNumber, 0).getDate();
    options.push(
      {
        value: isoDate(year, monthNumber, 16),
        month,
        from: isoDate(year, monthNumber, 16),
        to: isoDate(year, monthNumber, lastDay),
        shortLabel: `2.ª quincena · días 16–${lastDay}`,
      },
      {
        value: isoDate(year, monthNumber, 1),
        month,
        from: isoDate(year, monthNumber, 1),
        to: isoDate(year, monthNumber, 15),
        shortLabel: "1.ª quincena · días 1–15",
      },
    );
  }

  return options;
}

export function currentFortnightValue() {
  const now = new Date();
  return isoDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate() <= 15 ? 1 : 16,
  );
}

export function formatPayrollMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

export function suggestedPayrollDate(periodEnd: string) {
  const date = new Date(`${periodEnd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}
