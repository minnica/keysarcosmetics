import "dotenv/config";
import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
} from "express";
import { prisma } from "./prisma/client";
import accessRoutes from "./routes/access.routes";
import authRoutes from "./routes/auth.routes";
import crmRoutes from "./routes/crm.routes";
import envelopeRoutes from "./routes/envelope.routes";
import payrollAccessRoutes from "./routes/payroll-access.routes";
import payrollRoutes from "./routes/payroll.routes";
import posRoutes from "./routes/pos.routes";
import posCatalogRoutes from "./routes/pos-catalog.routes";
import posInventoryRoutes from "./routes/pos-inventory.routes";
import posTicketRoutes from "./routes/pos-ticket.routes";
import posOperationRoutes from "./routes/pos-operation.routes";
import posReportRoutes from "./routes/pos-report.routes";
import posSyncRoutes from "./routes/pos-sync.routes";
import posMembershipRoutes from "./routes/pos-membership.routes";
import posAgendaRoutes from "./routes/pos-agenda.routes";
import posCommercialRoutes from "./routes/pos-commercial.routes";
import schedulerRoutes from "./routes/scheduler.routes";
import schedulerPublicRoutes from "./routes/scheduler-public.routes";

function configuredOrigins(): string[] {
  const rawOrigins = process.env["CORS_ORIGINS"] ?? "";
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp(): Express {
  const app = express();
  const allowedOrigins = configuredOrigins();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        (req as Request).rawBody = Buffer.from(buffer);
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      release: process.env["RELEASE_SHA"] ?? "local",
    });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[readiness]", error);
      res.status(503).json({
        status: "unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/envelope", envelopeRoutes);
  app.use("/api/envelope/access", accessRoutes);
  app.use("/api/payroll/access", payrollAccessRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/crm", crmRoutes);
  // Webhooks firmados y respuestas por token deben montarse antes del router JWT.
  app.use("/api/scheduler", schedulerPublicRoutes);
  app.use("/api/scheduler", schedulerRoutes);
  // El webhook firmado de Agenda vive antes de los routers que exigen JWT POS.
  app.use("/api/pos", posAgendaRoutes);
  app.use("/api/pos", posRoutes);
  app.use("/api/pos", posCatalogRoutes);
  app.use("/api/pos", posInventoryRoutes);
  app.use("/api/pos", posTicketRoutes);
  app.use("/api/pos", posOperationRoutes);
  app.use("/api/pos", posReportRoutes);
  app.use("/api/pos", posSyncRoutes);
  app.use("/api/pos", posMembershipRoutes);
  app.use("/api/pos", posCommercialRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: "Ruta no encontrada",
      data: null,
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error("[http.error]", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      data: null,
    });
  };
  app.use(errorHandler);

  return app;
}

export const app = createApp();
