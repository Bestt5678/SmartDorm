import dotenv from 'dotenv'
import { z } from 'zod'

const nodeEnv = process.env.NODE_ENV ?? 'development'
dotenv.config({ path: `.env.${nodeEnv}` })
dotenv.config()

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
})

export const env = envSchema.parse(process.env)
