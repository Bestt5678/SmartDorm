import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { bearer, loginAs } from './helpers/loginAs'
import { seedBase, TEST_PASSWORD } from './helpers/seedTestData'

describe('สมัครสมาชิกและเข้าสู่ระบบ', () => {
  beforeEach(async () => {
    await seedBase()
  })

  it('สมัครสมาชิกแล้วได้ token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      full_name: 'ผู้เช่าใหม่',
      id_card_no: '1112223334445',
      phone: '0801112222',
      email: 'new@test.local',
      password: TEST_PASSWORD,
    })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.name).toBe('ผู้เช่าใหม่')
    expect(res.body.user.role).toBe('TENANT')
  })

  it('สมัครด้วยอีเมลซ้ำไม่ได้', async () => {
    const res = await request(app).post('/api/auth/register').send({
      full_name: 'ผู้เช่าซ้ำ',
      id_card_no: '1112223334446',
      email: 'tenant@test.local',
      password: TEST_PASSWORD,
    })

    expect(res.status).toBe(409)
  })

  it('ใส่รหัสผ่านผิดเข้าระบบไม่ได้', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'tenant@test.local',
      password: 'wrong-password',
    })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  })

  it('เลือกแท็บผิดบทบาทจะเข้าไม่ได้', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'tenant@test.local',
      password: TEST_PASSWORD,
      role: 'STAFF',
    })

    expect(res.status).toBe(403)
  })

  it('ดูข้อมูลตัวเองได้เมื่อมี token', async () => {
    const noToken = await request(app).get('/api/auth/me')
    expect(noToken.status).toBe(401)

    const token = await loginAs('tenant@test.local')
    const res = await request(app).get('/api/auth/me').set(bearer(token))
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('tenant@test.local')
  })
})
