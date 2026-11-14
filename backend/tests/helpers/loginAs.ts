import request from 'supertest'
import { app } from '../../src/app'
import { TEST_PASSWORD } from './seedTestData'

export async function loginAs(email: string) {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: TEST_PASSWORD,
  })

  if (response.status !== 200) {
    throw new Error(`เข้าสู่ระบบไม่สำเร็จสำหรับ ${email}: ${response.text}`)
  }

  return response.body.token as string
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` }
}
