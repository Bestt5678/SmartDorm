import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { bearer, loginAs } from './helpers/auth'
import { seedBase, TEST_PASSWORD } from './helpers/fixtures'

describe('auth และสิทธิ์การเข้าถึง', () => {
  beforeEach(async () => {
    await seedBase()
  })

  it('สมัครสมาชิกผู้เช่าและออก token ได้', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'ผู้เช่าใหม่',
      idCardNo: '1112223334445',
      phone: '0801112222',
      email: 'new-tenant@test.local',
      password: TEST_PASSWORD,
    })

    expect(response.status).toBe(201)
    expect(response.body.token).toEqual(expect.any(String))
    expect(response.body.user).toMatchObject({ name: 'ผู้เช่าใหม่', role: 'TENANT' })
    expect(response.body.user.id).toEqual(expect.any(Number))
    expect(JSON.stringify(response.body)).not.toContain('password')
  })

  it('ปฏิเสธอีเมลที่ถูกใช้งานแล้ว', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'ผู้เช่าซ้ำ',
      idCardNo: '1112223334446',
      email: 'tenant@test.local',
      password: TEST_PASSWORD,
    })

    expect(response.status).toBe(409)
  })

  it('ปฏิเสธรหัสผ่านผิดและ token ที่ไม่มีสิทธิ์', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'tenant@test.local',
      password: 'WrongPassword@1',
    })
    expect(wrongPassword.status).toBe(401)

    const noToken = await request(app).get('/api/auth/me')
    expect(noToken.status).toBe(401)
  })

  it('คืนข้อมูลบัญชีของตัวเองเมื่อมี token', async () => {
    const token = await loginAs('tenant@test.local')
    const response = await request(app).get('/api/auth/me').set(bearer(token))

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      name: 'ผู้เช่าทดสอบ',
      role: 'TENANT',
      email: 'tenant@test.local',
      profile_complete: true,
    })
    expect(JSON.stringify(response.body)).not.toContain('password')
  })

  it('บังคับสิทธิ์ตาม role', async () => {
    const tenantToken = await loginAs('tenant@test.local')
    const staffToken = await loginAs('staff@test.local')

    const tenantResponse = await request(app)
      .get('/api/dashboard/summary')
      .set(bearer(tenantToken))
    expect(tenantResponse.status).toBe(403)

    const staffResponse = await request(app)
      .get('/api/dashboard/summary')
      .set(bearer(staffToken))
    expect(staffResponse.status).toBe(200)
  })
})
