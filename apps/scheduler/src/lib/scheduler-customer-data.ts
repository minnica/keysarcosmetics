import type {
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerFieldValueDto,
  SchedulerCustomerSummaryDto,
} from "@cosmetics/types";
import type { SchedulerClient } from "./scheduler-client-presentation";

export const schedulerCustomerQueryPrefix = "customers";

export interface SchedulerCustomerRegistrationMatches {
  phoneMatch: SchedulerClient | null;
  nameMatches: SchedulerClient[];
}

export function normalizeSchedulerCustomerIdentityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
}

export function findSchedulerCustomerRegistrationMatches(
  customers: SchedulerClient[],
  displayName: string,
  phone: string,
): SchedulerCustomerRegistrationMatches {
  const normalizedName = normalizeSchedulerCustomerIdentityName(displayName);
  const hasFullName = normalizedName.split(" ").filter(Boolean).length >= 2;
  const normalizedPhone = phone.replace(/\D/g, "");
  const uniqueCustomers = [
    ...new Map(customers.map((customer) => [customer.id, customer])).values(),
  ];

  return {
    phoneMatch:
      (normalizedPhone
        ? uniqueCustomers.find(
            (customer) => customer.normalizedPhone === normalizedPhone,
          )
        : undefined) ?? null,
    nameMatches: hasFullName
      ? uniqueCustomers.filter(
          (customer) =>
            normalizeSchedulerCustomerIdentityName(customer.fullName) ===
            normalizedName,
        )
      : [],
  };
}

export function adaptSchedulerCustomerSummary(
  customer: Pick<
    SchedulerCustomerSummaryDto,
    "id" | "displayName" | "aliases" | "phone" | "email"
  >,
): SchedulerClient {
  return {
    id: customer.id,
    fullName: customer.displayName,
    aliases: customer.aliases,
    phone: customer.phone ?? "",
    normalizedPhone: (customer.phone ?? "").replace(/\D/g, ""),
    email: customer.email ?? "",
    alternateEmails: [],
    history: [],
  };
}

export function customerFieldDraftValue(
  field: SchedulerCustomerFieldValueDto,
): string | boolean {
  if (field.type === "BOOLEAN") return field.value === true;
  if (field.value === null || field.value === undefined) return "";
  return String(field.value);
}

export function customerFieldWriteValue(
  definition: SchedulerCustomerFieldDefinitionDto,
  value: string | boolean | undefined,
): unknown {
  if (definition.type === "BOOLEAN") return value === true;
  const text = typeof value === "string" ? value.trim() : "";
  if (definition.type === "NUMBER") return text === "" ? null : Number(text);
  return text === "" ? null : text;
}

export function splitCustomerList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function authorizationRetentionMs(
  expiresAt: string,
  now = Date.now(),
): number {
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) return 0;
  return Math.max(0, expiry - now);
}
