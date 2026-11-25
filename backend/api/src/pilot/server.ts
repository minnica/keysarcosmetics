import express, { type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { PilotSnapshot } from "@cosmetics/types";
import { assertIdentity, pilotDatabase } from "./store";
import {
  registerPortalLogin,
  pilotSession,
  type verifyPortalAccount,
} from "./portal-login";
import { referenceForCut } from "./reference";

const arrayKeys = new Set(
  "branches positions payrollModules kioskTargets kioskMonthlySales branchCommissionSchemes employees schemes schemeAssignments salaryAssignments commissionAssignments bonusFineConcepts movements adjustments loans notificationTemplates roles runs periodConfigs taxAssignments periodTaxInclusions doublePayDays negativeBalances terminationSettlements christmasBonuses christmasBonusPaymentPeriods decisions disbursementPayments kioskReceiptDecisions viaticsConcepts viaticsEntries".split(
    " ",
  ),
);
const objectKeys = new Set([
  "financialRequestPolicy",
  "receiptConfiguration",
  "commissionModeOverrides",
  "payrollCostAllocationModes",
]);
function safeChanges(value: Record<string, unknown>) {
  return (
    Object.entries(value).every(([key, v]) => {
      if (key === "calculationMode")
        return v === "WITH_VAT" || v === "WITHOUT_VAT";
      if (key === "lastUpdatedAt")
        return typeof v === "string" && !Number.isNaN(Date.parse(v));
      if (arrayKeys.has(key))
        return (
          Array.isArray(v) &&
          v.every(
            (item) => item && typeof item === "object" && !Array.isArray(item),
          )
        );
      return (
        objectKeys.has(key) &&
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v)
      );
    }) &&
    !/"(?:accessPassword|secondaryAccessKey|passwordHash|token|clabe|account)"\s*:\s*"(?!PRUEBA"|")[^"]+/i.test(
      JSON.stringify(value),
    )
  );
}
interface Settings {
  ref: string;
  user: string;
  hash: string;
  portalEmail?: string;
  verifyPortal?: typeof verifyPortalAccount;
  secret: string;
}
export function createPilotApi(
  db: PrismaClient | undefined,
  settings: Settings,
): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  });
  app.get("/health", (_req, res) =>
    res.json({
      service: "keysar-payroll-pilot",
      release: process.env.RELEASE_SHA ?? "local",
    }),
  );
  app.use(express.json({ limit: "3mb" }));
  const wrap =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  app.get(
    "/ready",
    wrap(async (_req, res) => {
      if (!db) {
        res.sendStatus(503);
        return;
      }
      await assertIdentity(db, settings.ref);
      const [row] = await db.$queryRaw<
        { loaded: boolean }[]
      >`SELECT EXISTS(SELECT 1 FROM payroll_pilot.cuts) AS loaded`;
      res.status(row?.loaded ? 200 : 503).json({ ready: Boolean(row?.loaded) });
    }),
  );
  if (settings.portalEmail)
    registerPortalLogin(app, db, {
      ref: settings.ref,
      user: settings.user,
      email: settings.portalEmail,
      secret: settings.secret,
      ...(settings.verifyPortal ? { verify: settings.verifyPortal } : {}),
    });
  const attempts = new Map<string, { start: number; count: number }>();
  app.post(
    "/session",
    wrap(async (req, res) => {
      if (settings.portalEmail || process.env.FLY_APP_NAME) {
        res.sendStatus(404);
        return;
      }
      if (!db || !settings.hash || settings.secret.length < 32) {
        res
          .status(503)
          .json({ message: "El piloto todavía no está habilitado." });
        return;
      }
      const key = req.socket.remoteAddress ?? "local",
        now = Date.now();
      let entry = attempts.get(key);
      if (!entry || now - entry.start > 60000) {
        entry = { start: now, count: 0 };
        attempts.set(key, entry);
      }
      if (++entry.count > 15) {
        res.sendStatus(429);
        return;
      }
      const data = z
        .object({
          user: z.string().max(90),
          password: z.string().min(1).max(160),
        })
        .safeParse(req.body);
      if (
        !data.success ||
        !(await bcrypt.compare(data.data.password, settings.hash)) ||
        data.data.user !== settings.user
      ) {
        res.sendStatus(401);
        return;
      }
      await assertIdentity(db, settings.ref);
      res.json({
        token: pilotSession(settings.user, settings.secret),
      });
    }),
  );
  app.use("/cut", (req, res, next) => {
    try {
      if (
        !db ||
        (!settings.portalEmail && !settings.hash) ||
        !settings.user ||
        settings.secret.length < 32
      ) {
        res
          .status(503)
          .json({ message: "Pendiente de conectar la base piloto." });
        return;
      }
      const token = req.get("Authorization")?.replace(/^Bearer /, "") ?? "";
      jwt.verify(token, settings.secret, {
        algorithms: ["HS256"],
        issuer: "keysar-payroll-pilot",
        audience: "pilot-workspace",
        subject: settings.user,
      });
      next();
    } catch {
      res.sendStatus(401);
    }
  });
  app.get(
    "/cut",
    wrap(async (_req, res) => {
      await assertIdentity(db!, settings.ref);
      const [row] = await db!.$queryRaw<
        {
          id: string;
          revision: number;
          original: PilotSnapshot;
          changes: Record<string, unknown>;
        }[]
      >`SELECT id::text, revision, original, changes FROM payroll_pilot.cuts ORDER BY seq DESC LIMIT 1`;
      if (!row) {
        res
          .status(503)
          .json({ message: "Pendiente de cargar el primer corte." });
        return;
      }
      res.json({ ...row, references: referenceForCut(row.original) });
    }),
  );
  app.put(
    "/cut",
    wrap(async (req, res) => {
      const input = z
        .object({
          id: z.string().uuid(),
          revision: z.number().int().nonnegative(),
          changes: z.record(z.unknown()),
        })
        .strict()
        .safeParse(req.body);
      if (!input.success || !safeChanges(input.data.changes)) {
        res.sendStatus(400);
        return;
      }
      const { id, revision, changes } = input.data;
      const rows = await db!.$transaction(async (tx) => {
        await assertIdentity(tx, settings.ref);
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(363205, 1)");
        return tx.$queryRaw<
          { revision: number }[]
        >`UPDATE payroll_pilot.cuts SET changes=changes || ${JSON.stringify(changes)}::jsonb,
        revision=revision+1,updated_at=now(),updated_by=${settings.user}
        WHERE id=${id}::uuid AND revision=${revision} AND seq=(SELECT max(seq) FROM payroll_pilot.cuts) RETURNING revision`;
      });
      if (!rows[0]) {
        res.status(409).json({
          message:
            "Hay un corte o cambios más recientes. Recarga para revisarlos.",
        });
        return;
      }
      res.json(rows[0]);
    }),
  );
  const onError: express.ErrorRequestHandler = (err, _req, res, _next) => {
    const status =
      err?.type === "entity.too.large"
        ? 413
        : err?.type === "entity.parse.failed"
          ? 400
          : 503;
    res.status(status).json({
      message:
        status === 503
          ? "La base del piloto no está disponible."
          : "Solicitud inválida.",
    });
  };
  app.use(onError);
  return app;
}
if (require.main === module) {
  let db: PrismaClient | undefined;
  if (process.env.PILOT_DATABASE_URL) db = pilotDatabase();
  const live =
    Boolean(process.env.FLY_APP_NAME) || process.env.NODE_ENV === "production";
  const app = createPilotApi(db, {
    ref: process.env.PILOT_PROJECT_REF ?? "",
    user: live
      ? (process.env.PILOT_ACCOUNT_ID ?? "")
      : (process.env.PILOT_OPERATOR_USER ?? "nomina"),
    hash: live ? "" : (process.env.PILOT_OPERATOR_HASH ?? ""),
    ...(live && process.env.PILOT_ACCOUNT_EMAIL
      ? { portalEmail: process.env.PILOT_ACCOUNT_EMAIL }
      : {}),
    secret: process.env.PILOT_SESSION_SECRET ?? "",
  });
  const server = app.listen(Number(process.env.PORT ?? 4000), "0.0.0.0");
  process.on("SIGTERM", () =>
    server.close(() => {
      void db?.$disconnect();
    }),
  );
}
