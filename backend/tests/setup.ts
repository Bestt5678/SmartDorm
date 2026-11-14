import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../src/lib/prisma'
import { uploadDir } from '../src/lib/slipUpload'
import { assertTestDatabase, truncateAll } from './helpers/testDatabase'

assertTestDatabase()

beforeEach(async () => {
  await truncateAll()
  for (const entry of fs.readdirSync(uploadDir)) {
    fs.rmSync(path.join(uploadDir, entry), { force: true, recursive: true })
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})
