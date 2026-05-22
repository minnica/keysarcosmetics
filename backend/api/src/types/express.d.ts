// Extensión de tipos de Express para agregar req.user tipado
import type { JwtPayload } from './jwt'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}
