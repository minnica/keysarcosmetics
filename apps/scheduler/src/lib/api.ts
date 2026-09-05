import { createSchedulerApiClient } from "@cosmetics/api-client";

const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export const schedulerApi = createSchedulerApiClient(apiUrl);

export function schedulerApiErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación.",
): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function schedulerApiErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || !error || !("response" in error)) {
    return null;
  }
  const response = (error as { response?: { status?: number } }).response;
  return response?.status ?? null;
}
