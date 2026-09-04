import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  posMembershipAttendanceRequestSchema,
  posMembershipAuthorizationSchema,
  posMembershipClosureRequestSchema,
  posMembershipListQuerySchema,
  posMembershipProfileRequestSchema,
  posMembershipSellerChangeRequestSchema,
  posMembershipStatusChangeRequestSchema,
  posMutationHeadersSchema,
} from "../contracts/pos.contracts";
import {
  posAuthMiddleware,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import {
  executePosIdempotent,
  PosInventoryError,
} from "../services/pos-inventory";
import {
  PosMembershipError,
  changeMembershipSeller,
  changeMembershipStatus,
  consumeMembershipAttendance,
  createMembershipClosure,
  findScopedMembership,
  membershipClosureDto,
  membershipDto,
  membershipInclude,
  membershipListWhere,
  requireMembershipAuthorization,
  updateMembershipProfile,
  type PosMembershipContext,
} from "../services/pos-memberships";
import {
  PosScopeError,
  hydratePosDataScope,
  resolvePosDataScope,
  resolveRequestedBranchIds,
} from "../services/pos-scope";
import { exportFilterMetadata } from "../services/pos-reporting";

const router: ExpressRouter = Router();
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const context = (req: Request): PosMembershipContext => ({
  credentialId: req.posUser!.credentialId,
  terminalId: req.posUser!.terminalId,
  sessionId: req.posUser!.sessionId,
  employeeId: req.posUser!.employeeId,
  isMaster: req.posUser!.isMaster,
  authorizedBranchIds: req.posUser!.authorizedBranchIds,
  historicalBranchIds: req.posUser!.authorizedHistoricalBranchIds,
});

const branchIds = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function personalToken(req: Request, res: Response) {
  const header = req.headers["x-pos-personal-authorization"];
  const parsed = posMembershipAuthorizationSchema.safeParse({
    personalAuthorizationToken:
      typeof header === "string" ? header : header?.[0],
  });
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Autorización personal de membresías requerida",
      data: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data.personalAuthorizationToken;
}

function idempotencyKey(req: Request, res: Response) {
  const parsed = posMutationHeadersSchema.safeParse({
    "idempotency-key": req.headers["idempotency-key"],
  });
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Idempotency-Key UUID requerido",
      data: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data["idempotency-key"];
}

const revalidatePersonalAuthorization = (req: Request, token: string) =>
  prisma.$transaction((tx) =>
    requireMembershipAuthorization(tx, token, context(req)),
  );

async function respondIdempotent<T>(
  res: Response,
  promise: ReturnType<typeof executePosIdempotent<T>>,
) {
  const result = await promise;
  res.status(result.status).json({
    success: true,
    message: result.message,
    data: result.data,
    replayed: result.replayed,
  });
}

router.use(posAuthMiddleware);

router.get(
  "/memberships",
  requirePosPermission("MEMBERSHIPS_VIEW"),
  asyncRoute(async (req, res) => {
    const parsed = posMembershipListQuerySchema.safeParse(req.query);
    const token = personalToken(req, res);
    if (!parsed.success || !token) {
      if (!parsed.success)
        res.status(400).json({
          success: false,
          message: "Consulta de membresías inválida",
          data: parsed.error.flatten().fieldErrors,
        });
      return;
    }
    const requestedBranchIds = branchIds(parsed.data.branchIds);
    const scope = await hydratePosDataScope(
      resolvePosDataScope({
        authorizedBranchIds: req.posUser!.authorizedHistoricalBranchIds,
        requestedBranchIds,
        employeeId: req.posUser!.employeeId,
        canViewAllPortfolio: req.posUser!.isMaster,
      }),
    );
    const result = await prisma.$transaction(async (tx) => {
      await requireMembershipAuthorization(tx, token, context(req));
      const where = membershipListWhere({
        context: context(req),
        branchIds: requestedBranchIds,
        customerId: parsed.data.customerId,
        purchaseTicketId: parsed.data.purchaseTicketId,
        query: parsed.data.query,
        status: parsed.data.status,
        profile: parsed.data.profile,
        followUpOnly: parsed.data.followUpOnly === "true",
        purchasedFrom: parsed.data.purchasedFrom,
        purchasedTo: parsed.data.purchasedTo,
      });
      if (parsed.data.followUpOnly === "true") {
        const eligible = (
          await tx.posClientMembership.findMany({
            where,
            include: membershipInclude,
            orderBy: { purchasedAt: "desc" },
          })
        ).filter(
          (membership) =>
            membership.totalSessions - membership.usedSessions <=
            membership.renewalThreshold,
        );
        return {
          items: eligible
            .slice(
              (parsed.data.page - 1) * parsed.data.pageSize,
              parsed.data.page * parsed.data.pageSize,
            )
            .map(membershipDto),
          total: eligible.length,
        };
      }
      const [items, total] = await Promise.all([
        tx.posClientMembership.findMany({
          where,
          include: membershipInclude,
          orderBy: { purchasedAt: "desc" },
          skip: (parsed.data.page - 1) * parsed.data.pageSize,
          take: parsed.data.pageSize,
        }),
        tx.posClientMembership.count({ where }),
      ]);
      return { items: items.map(membershipDto), total };
    });
    res.json({
      success: true,
      message: "OK",
      data: {
        scope,
        identityResolution: {
          strategy: "CANONICAL_IDS",
          legacyFallbackMatches: 0,
        },
        items: result.items,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
      },
    });
  }),
);

router.get(
  "/memberships/:id",
  requirePosPermission("MEMBERSHIPS_VIEW"),
  asyncRoute(async (req, res) => {
    const token = personalToken(req, res);
    if (!token) return;
    const membership = await prisma.$transaction(async (tx) => {
      await requireMembershipAuthorization(tx, token, context(req));
      return findScopedMembership(tx, req.params["id"]!, context(req));
    });
    if (!membership)
      return res.status(404).json({
        success: false,
        message: "Membresía no encontrada",
        data: null,
      });
    res.json({ success: true, message: "OK", data: membershipDto(membership) });
  }),
);

router.post(
  "/memberships/:id/profile",
  requirePosPermission("MEMBERSHIPS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posMembershipProfileRequestSchema.safeParse(req.body);
    const key = idempotencyKey(req, res);
    if (!parsed.success || !key) {
      if (!parsed.success)
        res.status(400).json({
          success: false,
          message: "Perfil de membresía inválido",
          data: parsed.error.flatten().fieldErrors,
        });
      return;
    }
    await revalidatePersonalAuthorization(
      req,
      parsed.data.personalAuthorizationToken,
    );
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_MEMBERSHIP_PROFILE:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => {
          await requireMembershipAuthorization(
            tx,
            parsed.data.personalAuthorizationToken,
            context(req),
          );
          return {
            status: 200,
            message: "Perfil de membresía actualizado",
            data: membershipDto(
              await updateMembershipProfile(
                tx,
                req.params["id"]!,
                parsed.data.profile,
                context(req),
              ),
            ),
          };
        },
      }),
    );
  }),
);

router.post(
  "/memberships/:id/seller",
  requirePosPermission("MEMBERSHIPS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posMembershipSellerChangeRequestSchema.safeParse(req.body);
    const key = idempotencyKey(req, res);
    if (!parsed.success || !key) {
      if (!parsed.success)
        res.status(400).json({
          success: false,
          message: "Cambio de vendedor inválido",
          data: parsed.error.flatten().fieldErrors,
        });
      return;
    }
    await revalidatePersonalAuthorization(
      req,
      parsed.data.personalAuthorizationToken,
    );
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_MEMBERSHIP_SELLER:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => {
          await requireMembershipAuthorization(
            tx,
            parsed.data.personalAuthorizationToken,
            context(req),
          );
          return {
            status: 200,
            message: "Vendedor de membresía actualizado",
            data: membershipDto(
              await changeMembershipSeller(
                tx,
                {
                  membershipId: req.params["id"]!,
                  sellerId: parsed.data.sellerId,
                  reason: parsed.data.reason,
                },
                context(req),
              ),
            ),
          };
        },
      }),
    );
  }),
);

router.post(
  "/memberships/:id/status",
  requirePosPermission("MEMBERSHIPS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posMembershipStatusChangeRequestSchema.safeParse(req.body);
    const key = idempotencyKey(req, res);
    if (!parsed.success || !key) {
      if (!parsed.success)
        res.status(400).json({
          success: false,
          message: "Cambio de estado inválido",
          data: parsed.error.flatten().fieldErrors,
        });
      return;
    }
    await revalidatePersonalAuthorization(
      req,
      parsed.data.personalAuthorizationToken,
    );
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_MEMBERSHIP_STATUS:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => {
          await requireMembershipAuthorization(
            tx,
            parsed.data.personalAuthorizationToken,
            context(req),
          );
          return {
            status: 200,
            message: "Estado de membresía actualizado",
            data: membershipDto(
              await changeMembershipStatus(
                tx,
                {
                  membershipId: req.params["id"]!,
                  status: parsed.data.status,
                  reason: parsed.data.reason,
                },
                context(req),
              ),
            ),
          };
        },
      }),
    );
  }),
);

router.post(
  "/memberships/:id/attendance",
  requirePosPermission("MEMBERSHIPS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posMembershipAttendanceRequestSchema.safeParse(req.body);
    const key = idempotencyKey(req, res);
    if (!parsed.success || !key) {
      if (!parsed.success)
        res.status(400).json({
          success: false,
          message: "Asistencia de membresía inválida",
          data: parsed.error.flatten().fieldErrors,
        });
      return;
    }
    await revalidatePersonalAuthorization(
      req,
      parsed.data.personalAuthorizationToken,
    );
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_MEMBERSHIP_ATTENDANCE:${req.params["id"]}:${parsed.data.appointmentId}`,
        payload: parsed.data,
        execute: async (tx) => {
          await requireMembershipAuthorization(
            tx,
            parsed.data.personalAuthorizationToken,
            context(req),
          );
          return {
            status: 200,
            message:
              parsed.data.event === "ATTENDED"
                ? "Asistencia conciliada"
                : "El evento no consume sesiones",
            data: membershipDto(
              await consumeMembershipAttendance(
                tx,
                {
                  membershipId: req.params["id"]!,
                  appointmentId: parsed.data.appointmentId,
                  event: parsed.data.event,
                  branchId: parsed.data.branchId,
                  signatureStatus: parsed.data.signatureStatus,
                },
                context(req),
              ),
            ),
          };
        },
      }),
    );
  }),
);

const exportSchema = z
  .object({
    branchIds: z.array(z.string().min(1)).min(1).max(500),
    customerId: z.string().min(1).optional(),
    purchaseTicketId: z.string().uuid().optional(),
    query: z.string().trim().max(120).optional(),
    status: z.enum(["PENDING", "ACTIVE", "EXHAUSTED", "CANCELED"]).optional(),
    profile: z.enum(["POTENTIAL", "LOYAL", "VIP", "RECOVERY"]).optional(),
    purchasedFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    purchasedTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    personalAuthorizationToken: z.string().min(32).max(256),
  })
  .strict();

router.post(
  "/memberships/export",
  requirePosPermission("MEMBERSHIPS_PRINT"),
  asyncRoute(async (req, res) => {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Exportación de membresías inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const scope = await hydratePosDataScope(
      resolvePosDataScope({
        authorizedBranchIds: req.posUser!.authorizedHistoricalBranchIds,
        requestedBranchIds: parsed.data.branchIds,
        employeeId: req.posUser!.employeeId,
        canViewAllPortfolio: req.posUser!.isMaster,
      }),
    );
    const items = await prisma.$transaction(async (tx) => {
      await requireMembershipAuthorization(
        tx,
        parsed.data.personalAuthorizationToken,
        context(req),
      );
      const memberships = await tx.posClientMembership.findMany({
        where: membershipListWhere({ context: context(req), ...parsed.data }),
        include: membershipInclude,
        orderBy: { purchasedAt: "desc" },
      });
      await tx.auditLog.create({
        data: {
          action: "POS_MEMBERSHIP_EXPORT",
          outcome: "SUCCESS",
          actorCredentialId: req.posUser!.credentialId,
          terminalId: req.posUser!.terminalId,
          branchId: scope.branchIds.length === 1 ? scope.branchIds[0] : null,
          targetType: "PosClientMembership",
          targetId: "AUTHORIZED_DATASET",
          ipAddress: req.ip,
          userAgent: req.get("user-agent")?.slice(0, 512),
          metadata: {
            dateFrom: parsed.data.purchasedFrom ?? null,
            dateTo: parsed.data.purchasedTo ?? null,
            timeZone: scope.timeZone,
            branchIds: scope.branchIds,
            branchCount: scope.branchIds.length,
            rowCount: memberships.length,
            portfolio: scope.portfolio,
            filters: exportFilterMetadata({
              search: parsed.data.query,
            }),
          },
        },
      });
      return memberships;
    });
    res.json({
      success: true,
      message: "Dataset autorizado",
      data: {
        generatedAt: new Date().toISOString(),
        scope,
        identityResolution: {
          strategy: "CANONICAL_IDS",
          legacyFallbackMatches: 0,
        },
        items: items.map(membershipDto),
      },
    });
  }),
);

router.post(
  "/memberships/closures",
  requirePosPermission("MEMBERSHIPS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posMembershipClosureRequestSchema.safeParse(req.body);
    const key = idempotencyKey(req, res);
    if (!parsed.success || !key) {
      if (!parsed.success)
        res.status(400).json({
          success: false,
          message: "Cierre comercial inválido",
          data: parsed.error.flatten().fieldErrors,
        });
      return;
    }
    await revalidatePersonalAuthorization(
      req,
      parsed.data.personalAuthorizationToken,
    );
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_MEMBERSHIP_CLOSURE:${parsed.data.month}`,
        payload: parsed.data,
        execute: async (tx) => {
          await requireMembershipAuthorization(
            tx,
            parsed.data.personalAuthorizationToken,
            context(req),
          );
          return {
            status: 201,
            message: "Cierre comercial versionado",
            data: membershipClosureDto(
              await createMembershipClosure(tx, parsed.data, context(req)),
            ),
          };
        },
      }),
    );
  }),
);

router.get(
  "/memberships/closures/history",
  requirePosPermission("MEMBERSHIPS_VIEW"),
  asyncRoute(async (req, res) => {
    const query = z
      .object({
        month: z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .optional(),
        branchIds: z.string().min(1),
      })
      .strict()
      .safeParse(req.query);
    const token = personalToken(req, res);
    if (!query.success || !token) {
      if (!query.success)
        res.status(400).json({
          success: false,
          message: "Consulta de cierres inválida",
          data: query.error.flatten().fieldErrors,
        });
      return;
    }
    if (!req.posUser!.isMaster)
      return res.status(403).json({
        success: false,
        message: "Los cierres comerciales requieren una credencial master",
        data: null,
      });
    const requested = resolveRequestedBranchIds({
      authorizedBranchIds: req.posUser!.authorizedBranchIds,
      requestedBranchIds: branchIds(query.data.branchIds),
    }).sort();
    const scopeHash = createHash("sha256")
      .update(requested.join("\n"))
      .digest("hex");
    const items = await prisma.$transaction(async (tx) => {
      await requireMembershipAuthorization(tx, token, context(req));
      return tx.posMembershipSalesClosure.findMany({
        where: {
          scopeHash,
          ...(query.data.month
            ? { month: new Date(`${query.data.month}-01T00:00:00.000Z`) }
            : {}),
        },
        include: {
          createdByCredential: {
            include: {
              employee: { select: { nombreCompleto: true } },
              user: { select: { nombre: true } },
            },
          },
          rankings: { orderBy: { rank: "asc" } },
        },
        orderBy: [{ month: "desc" }, { version: "desc" }],
      });
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map(membershipClosureDto),
    });
  }),
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      error instanceof PosMembershipError ||
      error instanceof PosInventoryError ||
      error instanceof PosScopeError
    )
      return res.status(error.status).json({
        success: false,
        message: error.message,
        data: null,
      });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return res.status(409).json({
        success: false,
        message: "La operación de membresía ya fue registrada",
        data: null,
      });
    next(error);
  },
);

export default router;
