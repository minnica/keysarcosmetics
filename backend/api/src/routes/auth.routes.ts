// Rutas del módulo de autenticación
import { Router, type Router as ExpressRouter } from 'express'
import { login, me } from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: ExpressRouter = Router()
// POST /api/auth/login — pública
router.post('/login', login)

// GET /api/auth/me — protegida (requiere JWT válido)
router.get('/me', authMiddleware, me)

export default router
