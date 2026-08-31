import path from "node:path";
import { test } from "playwright/test";
import { authenticateAndSaveState } from "../helpers/auth";
import { requiredEnvironment } from "../helpers/environment";

test("crea una sesión reutilizable de Envelope", async ({ page }) => {
  await authenticateAndSaveState({
    page,
    email: requiredEnvironment("E2E_ENVELOPE_EMAIL"),
    password: requiredEnvironment("E2E_ENVELOPE_PASSWORD"),
    stateFile: path.join(__dirname, "../../.auth/envelope.json"),
  });
});
