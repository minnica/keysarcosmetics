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
  "E2E_EXPECTED_FRONTEND_SHA",
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

export function optionalEnvironment(
  name: "E2E_EXPECTED_API_SHA",
): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function assertFullGitSha(value: string, name: string): void {
  if (!/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error(`${name} debe contener un SHA completo de 40 caracteres.`);
  }
}
