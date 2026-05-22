// Punto de entrada del servidor Express
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.routes'
import envelopeRoutes from './routes/envelope.routes'
import payrollRoutes from './routes/payroll.routes'
import crmRoutes from './routes/crm.routes'
import schedulerRoutes from './routes/scheduler.routes'
import posRoutes from './routes/pos.routes'

const app = express()
const PORT = Number(process.env['PORT'] ?? 4000)

// ─── Middlewares globales ────────────────────────────────────────────────────
const rawOrigins = process.env['CORS_ORIGINS'] ?? ''
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (Postman, curl, apps móviles)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`))
      }
    },
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/envelope', envelopeRoutes)
app.use('/api/payroll', payrollRoutes)
app.use('/api/crm', crmRoutes)
app.use('/api/scheduler', schedulerRoutes)
app.use('/api/pos', posRoutes)

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Manejo de rutas no encontradas ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada', data: null })
})

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`)
  console.log(`   CORS habilitado para: ${allowedOrigins.join(', ') || '(todos)'}`)
})
