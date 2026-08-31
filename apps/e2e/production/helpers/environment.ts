const requiredNames = [
  "PRODUCTION_MONITOR_ENVELOPE_EMAIL",
  "PRODUCTION_MONITOR_ENVELOPE_PASSWORD",
  "PRODUCTION_MONITOR_PAYROLL_EMAIL",
  "PRODUCTION_MONITOR_PAYROLL_PASSWORD",
] as const;

export function requiredProductionEnvironment(
  name: (typeof requiredNames)[number],
): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta ${name}. Configura el environment production sin imprimir su valor.`,
    );
  }
  return value;
}
