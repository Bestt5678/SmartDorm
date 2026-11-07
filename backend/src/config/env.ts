import dotenv from 'dotenv'
import { z } from 'zod'

const nodeEnv = process.env.NODE_ENV ?? 'development'
dotenv.config({ path: `.env.${nodeEnv}` })
dotenv.config()

const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // ตรงกับ proxy ใน frontend/vite.config.ts
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WATER_RATE: z.coerce.number().nonnegative().default(18),
  ELECTRIC_RATE: z.coerce.number().nonnegative().default(8),
  UPLOAD_DIR: z.string().default('uploads'),
  APP_TIMEZONE: z
    .string()
    .default('Asia/Bangkok')
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value })
        return true
      } catch {
        return false
      }
    }, 'APP_TIMEZONE ไม่ถูกต้อง'),

  // OAuth (Google / LINE / Facebook): ใส่ทั้ง CLIENT_ID และ CLIENT_SECRET เพื่อเปิดใช้ provider นั้น
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  // URL ของ /api ที่ provider จะ redirect กลับมา ต้องลงทะเบียนไว้ที่ console ของ provider ด้วย
  OAUTH_CALLBACK_BASE_URL: z.string().url().default('http://localhost:5173/api'),
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  LINE_CHANNEL_ID: optionalSecret,
  LINE_CHANNEL_SECRET: optionalSecret,
  FACEBOOK_APP_ID: optionalSecret,
  FACEBOOK_APP_SECRET: optionalSecret,
})

export const env = envSchema.parse(process.env)
