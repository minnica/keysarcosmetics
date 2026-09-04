// Extensión de tipos de Express para agregar req.user tipado
import type { JwtPayload } from "./jwt";
import type { PosRequestUser } from "./pos-jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      posUser?: PosRequestUser;
    }
  }
}
