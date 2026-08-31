import { expect, type APIRequestContext, type Page } from "playwright/test";

type SessionAccess = {
  canManageAccess: boolean;
  canManagePayrollAccess: boolean;
  payrollScreenPermissions: string[];
  payrollWritePermissions: string[];
  rol: string;
  screenPermissions: string[];
  selfDataOnly: boolean;
};

type SessionResponse = {
  data: SessionAccess;
  success: boolean;
};

export async function readSessionAccess(
  page: Page,
  request: APIRequestContext,
): Promise<SessionAccess> {
  const token = await page.evaluate(() =>
    window.localStorage.getItem("auth_token"),
  );
  expect(token).toBeTruthy();

  const apiBaseUrl = process.env["API_BASE_URL"]?.replace(/\/$/, "");
  if (!apiBaseUrl)
    throw new Error("Falta API_BASE_URL en el smoke productivo.");

  const response = await request.get(`${apiBaseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as SessionResponse;
  expect(payload.success).toBe(true);
  return payload.data;
}
