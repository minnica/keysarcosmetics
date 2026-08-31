import path from "node:path";
import { test } from "playwright/test";
import { authenticateAndSaveState } from "../../development/helpers/auth";
import { requiredProductionEnvironment } from "../helpers/environment";

test("crea la sesión productiva de monitoreo de Envelope", async ({ page }) => {
  await authenticateAndSaveState({
    page,
    email: requiredProductionEnvironment("PRODUCTION_MONITOR_ENVELOPE_EMAIL"),
    password: requiredProductionEnvironment(
      "PRODUCTION_MONITOR_ENVELOPE_PASSWORD",
    ),
    stateFile: path.join(__dirname, "../../.auth/production-envelope.json"),
  });
});
