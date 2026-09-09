const requiredNames = [
  "API_BASE_URL",
  "ENVELOPE_BASE_URL",
  "PAYROLL_BASE_URL",
  "SCHEDULER_BASE_URL",
  "E2E_ENVELOPE_EMAIL",
  "E2E_ENVELOPE_PASSWORD",
  "E2E_PAYROLL_EMAIL",
  "E2E_PAYROLL_PASSWORD",
  "E2E_SCHEDULER_EMAIL",
  "E2E_SCHEDULER_PASSWORD",
] as const;

export function requiredEnvironment(
  name: (typeof requiredNames)[number],
): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta ${name}. Configura el environment development sin imprimir su valor.`,
    );
  }
  return value;
}
