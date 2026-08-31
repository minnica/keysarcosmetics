import path from "node:path";
import { test } from "playwright/test";
import { authenticateAndSaveState } from "../../development/helpers/auth";
import { requiredProductionEnvironment } from "../helpers/environment";

test("crea la sesión productiva de monitoreo de Payroll", async ({ page }) => {
  await authenticateAndSaveState({
    page,
    email: requiredProductionEnvironment("PRODUCTION_MONITOR_PAYROLL_EMAIL"),
    password: requiredProductionEnvironment(
      "PRODUCTION_MONITOR_PAYROLL_PASSWORD",
    ),
    stateFile: path.join(__dirname, "../../.auth/production-payroll.json"),
  });
});
