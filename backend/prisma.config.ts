import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // `prisma generate` (รันอัตโนมัติตอน npm install) ไม่ต้องต่อฐานข้อมูล จึงไม่บังคับให้มี DATABASE_URL
  // ส่วนคำสั่งที่ต้องใช้ฐานข้อมูล (migrate, seed, studio) Prisma จะแจ้งเองถ้ายังไม่ได้ตั้งค่า
  ...(process.env.DATABASE_URL ? { datasource: { url: env('DATABASE_URL') } } : {}),
})
