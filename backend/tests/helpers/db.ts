import { env } from '../../src/config/env'
import { prisma } from '../../src/lib/prisma'

export function assertTestDatabase() {
  const databaseName = decodeURIComponent(
    new URL(env.DATABASE_URL).pathname.replace(/^\//, ''),
  )
  if (env.NODE_ENV !== 'test' || !databaseName.endsWith('_test')) {
    throw new Error(
      `ปฏิเสธการรันเทสต์บนฐานข้อมูลที่ไม่ใช่ test (NODE_ENV=${env.NODE_ENV}, database=${databaseName})`,
    )
  }
}

export async function truncateAll() {
  assertTestDatabase()
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "account", "payment", "invoice", "repair_request", "contract", "utility_meter", "booking", "staff", "tenant", "room", "room_type" RESTART IDENTITY CASCADE',
  )
}
