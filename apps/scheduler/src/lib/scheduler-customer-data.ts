import type {
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerFieldValueDto,
  SchedulerCustomerSummaryDto,
} from "@cosmetics/types";
import type { SchedulerClient } from "./scheduler-client-presentation";

export const schedulerCustomerQueryPrefix = "customers";

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
