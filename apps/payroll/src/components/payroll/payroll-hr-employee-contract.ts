export interface HrEmployeePayload {
  externalId: string;
  source: string;
  syncedAt: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname?: string | null;
  birthDate: string | null;
  positionCode: string;
  branchCode: string;
  monthlySalary: number;
  bank: string;
  account: string;
  clabe: string;
  hireDate: string;
  terminationDate?: string | null;
  active: boolean;
}

export interface NormalizedHrEmployeePayload extends HrEmployeePayload {
  fullName: string;
  clabe: string;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null | undefined) {
  return !value || isoDatePattern.test(value);
}

export function validateHrEmployeePayload(payload: HrEmployeePayload) {
  const errors: string[] = [];
  if (!payload.externalId.trim()) errors.push("externalId es obligatorio.");
  if (!payload.source.trim()) errors.push("source es obligatorio.");
  if (!payload.firstName.trim()) errors.push("firstName es obligatorio.");
  if (!payload.paternalSurname.trim()) {
    errors.push("paternalSurname es obligatorio.");
  }
  if (!payload.positionCode.trim()) {
    errors.push("positionCode es obligatorio.");
  }
  if (!payload.branchCode.trim()) errors.push("branchCode es obligatorio.");
  if (!Number.isFinite(payload.monthlySalary) || payload.monthlySalary < 0) {
    errors.push("monthlySalary debe ser un monto válido mayor o igual a cero.");
  }
  if (!/^\d{18}$/.test(payload.clabe.replace(/\D/g, ""))) {
    errors.push("clabe debe contener exactamente 18 dígitos.");
  }
  if (!isIsoDate(payload.birthDate)) {
    errors.push("birthDate debe usar el formato YYYY-MM-DD.");
  }
  if (!isIsoDate(payload.hireDate)) {
    errors.push("hireDate debe usar el formato YYYY-MM-DD.");
  }
  if (!isIsoDate(payload.terminationDate)) {
    errors.push("terminationDate debe usar el formato YYYY-MM-DD.");
  }
  if (Number.isNaN(Date.parse(payload.syncedAt))) {
    errors.push("syncedAt debe ser una fecha y hora ISO válida.");
  }
  return errors;
}

export function normalizeHrEmployeePayload(
  payload: HrEmployeePayload,
): NormalizedHrEmployeePayload {
  const errors = validateHrEmployeePayload(payload);
  if (errors.length) throw new Error(errors.join(" "));

  const firstName = payload.firstName.trim().toLocaleUpperCase("es-MX");
  const paternalSurname = payload.paternalSurname
    .trim()
    .toLocaleUpperCase("es-MX");
  const maternalSurname =
    payload.maternalSurname?.trim().toLocaleUpperCase("es-MX") || null;

  return {
    ...payload,
    externalId: payload.externalId.trim(),
    source: payload.source.trim().toLocaleUpperCase("es-MX"),
    firstName,
    paternalSurname,
    maternalSurname,
    fullName: [firstName, paternalSurname, maternalSurname]
      .filter(Boolean)
      .join(" "),
    positionCode: payload.positionCode.trim().toLocaleUpperCase("es-MX"),
    branchCode: payload.branchCode.trim().toLocaleUpperCase("es-MX"),
    bank: payload.bank.trim().toLocaleUpperCase("es-MX"),
    account: payload.account.trim(),
    clabe: payload.clabe.replace(/\D/g, ""),
  };
}
