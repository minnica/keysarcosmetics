import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { Prisma } from "@prisma/client";
import {
  posMutationHeadersSchema,
  posOfflinePushSchema,
} from "../contracts/pos.contracts";
import { posAuthMiddleware } from "../middlewares/pos-auth.middleware";
import {
  PosSyncError,
  createOfflineBootstrap,
  pushOfflineOperations,
  resolveOfflineActor,
  type PosOfflineActor,
} from "../services/pos-sync";

const router: ExpressRouter = Router();

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

function actorFromOnlineRequest(req: Request): PosOfflineActor {
  const user = req.posUser!;
  return {
    grant: { ...user, tokenType: "pos-offline" },
    permissions: user.permissions,
    isMaster: user.isMaster,
  };
}

router.get(
  "/sync/bootstrap",
  posAuthMiddleware,
  asyncRoute(async (req, res) => {
    const actor = actorFromOnlineRequest(req);
    const bootstrap = await createOfflineBootstrap(actor);
    res.json({
      success: true,
      message: "Caché offline firmada y vigente",
      data: bootstrap,
    });
  }),
);

router.post(
  "/sync/push",
  asyncRoute(async (req, res) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Grant offline requerido",
        data: null,
      });
      return;
    }
    const idempotency = posMutationHeadersSchema.safeParse({
      "idempotency-key": req.headers["idempotency-key"],
    });
    if (!idempotency.success) {
      res.status(400).json({
        success: false,
        message: "Idempotency-Key UUID es obligatorio",
        data: null,
      });
      return;
    }
    const parsed = posOfflinePushSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Lote offline inválido",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const actor = await resolveOfflineActor(authorization.slice(7));
    const result = await pushOfflineOperations(actor, parsed.data.operations);
    res.json({
      success: true,
      message: "Lote offline procesado en orden de terminal",
      data: result,
    });
  }),
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof PosSyncError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        data: { code: error.code },
      });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(error.code === "P2002" ? 409 : 400).json({
        success: false,
        message: "Conflicto al registrar la secuencia offline",
        data: { code: error.code },
      });
      return;
    }
    next(error);
  },
);

export default router;
