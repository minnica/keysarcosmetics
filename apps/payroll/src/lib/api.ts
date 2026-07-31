import { createApiClient } from "@cosmetics/api-client";

const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export const api = createApiClient(apiUrl);

export function apiErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la operación.",
): string {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
  ) {
    return "La operación tardó demasiado. Intenta nuevamente y espera a que termine.";
  }
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}
