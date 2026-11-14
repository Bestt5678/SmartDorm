import dotenv from 'dotenv'

const nodeEnv = process.env.NODE_ENV || 'development'
dotenv.config({ path: `.env.${nodeEnv}` })
dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('กรุณาตั้งค่า DATABASE_URL ในไฟล์ .env')
}
if (!process.env.JWT_SECRET) {
  throw new Error('กรุณาตั้งค่า JWT_SECRET ในไฟล์ .env')
}

export const env = {
  NODE_ENV: nodeEnv,
  // ตรงกับ proxy ใน frontend/vite.config.ts
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  WATER_RATE: Number(process.env.WATER_RATE) || 18,
  ELECTRIC_RATE: Number(process.env.ELECTRIC_RATE) || 8,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
}
