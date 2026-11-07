import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { toSnake } from './lib/case'
import { prisma } from './lib/prisma'
import { errorHandler, notFound } from './middleware/error'
import { apiRouter } from './routes'

export const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง' },
})

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', service: 'smartdorm-api', database: 'ok' })
  } catch {
    res.status(503).json({ status: 'error', service: 'smartdorm-api', database: 'unreachable' })
  }
})

// ทุก response ของ /api ส่ง key เป็น snake_case ให้ตรงกับ frontend
app.use('/api', (_req, res, next) => {
  const json = res.json.bind(res)
  res.json = (body: unknown) => json(toSnake(body))
  next()
})

app.use('/api/auth', authLimiter)
app.use('/api', apiRouter)

app.use(notFound)
app.use(errorHandler)
