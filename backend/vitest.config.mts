import { defineConfig } from 'vitest/config'

// ต้องมีไฟล์ .env.test ที่ DATABASE_URL ชี้ไปฐานข้อมูลที่ลงท้ายด้วย _test และ migrate แล้ว
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    env: { NODE_ENV: 'test' },
  },
})
