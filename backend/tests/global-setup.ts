import { execSync } from 'node:child_process'
import path from 'node:path'
import dotenv from 'dotenv'
import { Client } from 'pg'

function parseDatabaseUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!databaseName.endsWith('_test')) {
    throw new Error(`ฐานข้อมูลทดสอบต้องลงท้ายด้วย _test (พบ ${databaseName})`)
  }
  return { url, databaseName }
}

async function ensureDatabase(databaseUrl: string, databaseName: string) {
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'

  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    )
    if (existing.rowCount === 0) {
      const escapedName = databaseName.replace(/"/g, '""')
      await client.query(`CREATE DATABASE "${escapedName}"`)
    }
  } finally {
    await client.end()
  }
}

export default async function setup() {
  dotenv.config({ path: path.join(process.cwd(), '.env.test') })

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('ไม่พบ DATABASE_URL สำหรับฐานข้อมูลทดสอบ')
  }

  const { databaseName } = parseDatabaseUrl(databaseUrl)
  await ensureDatabase(databaseUrl, databaseName)

  const env = { ...process.env, DATABASE_URL: databaseUrl }
  execSync('npx prisma generate', { cwd: process.cwd(), env, stdio: 'inherit' })
  execSync('npx prisma migrate deploy', { cwd: process.cwd(), env, stdio: 'inherit' })
}
