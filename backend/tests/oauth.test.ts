import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app'
import { env } from '../src/config/env'
import { prisma } from '../src/lib/prisma'
import { bearer } from './helpers/auth'
import { seedBase } from './helpers/fixtures'

type GoogleProfile = { sub: string; name: string; email?: string; email_verified?: boolean }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** จำลอง Google: แลก code ได้ access token แล้วคืน profile ที่กำหนด */
function mockGoogle(profile: GoogleProfile) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      return jsonResponse({ access_token: 'google-access-token' })
    }
    if (url.startsWith('https://openidconnect.googleapis.com/v1/userinfo')) {
      return jsonResponse(profile)
    }
    return jsonResponse({ error: 'unexpected' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function startLogin() {
  const response = await request(app).get('/api/auth/google')
  expect(response.status).toBe(302)
  const location = new URL(response.headers.location!)
  expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
  expect(location.searchParams.get('redirect_uri')).toBe(
    `${env.OAUTH_CALLBACK_BASE_URL}/auth/google/callback`,
  )
  return location.searchParams.get('state')!
}

async function finishLogin(state: string) {
  const response = await request(app)
    .get('/api/auth/google/callback')
    .query({ code: 'auth-code', state })
  expect(response.status).toBe(302)
  const location = new URL(response.headers.location!)
  expect(location.origin).toBe(new URL(env.FRONTEND_URL).origin)
  expect(location.pathname).toBe('/auth/callback')
  return location.searchParams
}

describe('OAuth (Google)', () => {
  const original = { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET }

  beforeEach(async () => {
    await seedBase()
    env.GOOGLE_CLIENT_ID = 'test-google-client'
    env.GOOGLE_CLIENT_SECRET = 'test-google-secret'
  })

  afterEach(() => {
    env.GOOGLE_CLIENT_ID = original.id
    env.GOOGLE_CLIENT_SECRET = original.secret
    vi.unstubAllGlobals()
  })

  it('แสดงเฉพาะ provider ที่ตั้งค่าไว้', async () => {
    const response = await request(app).get('/api/auth/providers')
    expect(response.body).toEqual(['google'])
  })

  it('ผู้ใช้ใหม่ได้บัญชีผู้เช่า และต้องกรอกเลขบัตรก่อนจอง', async () => {
    const fetchMock = mockGoogle({
      sub: 'google-123',
      name: 'สมใจ กูเกิล',
      email: 'NewUser@Gmail.com',
      email_verified: true,
    })

    const params = await finishLogin(await startLogin())
    const token = params.get('token')
    expect(token).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const me = await request(app).get('/api/auth/me').set(bearer(token!))
    expect(me.body).toMatchObject({
      name: 'สมใจ กูเกิล',
      role: 'TENANT',
      email: 'newuser@gmail.com',
      profile_complete: false,
    })

    // ล็อกอินครั้งที่สองต้องได้บัญชีเดิม ไม่สร้างใหม่
    const again = await finishLogin(await startLogin())
    const meAgain = await request(app).get('/api/auth/me').set(bearer(again.get('token')!))
    expect(meAgain.body.id).toBe(me.body.id)
    expect(await prisma.oAuthIdentity.count()).toBe(1)
  })

  it('อีเมลที่ยืนยันแล้วตรงกับผู้เช่าเดิมจะ link เข้าบัญชีเดิม', async () => {
    mockGoogle({ sub: 'google-456', name: 'ชื่อจาก Google', email: 'tenant@test.local', email_verified: true })

    const params = await finishLogin(await startLogin())
    const me = await request(app).get('/api/auth/me').set(bearer(params.get('token')!))
    expect(me.body).toMatchObject({ name: 'ผู้เช่าทดสอบ', email: 'tenant@test.local', profile_complete: true })
  })

  it('อีเมลที่ยังไม่ยืนยันจะไม่ถูก link (สร้างบัญชีใหม่ที่ไม่มีอีเมล)', async () => {
    mockGoogle({ sub: 'google-789', name: 'ไม่ยืนยัน', email: 'tenant@test.local', email_verified: false })

    const params = await finishLogin(await startLogin())
    const me = await request(app).get('/api/auth/me').set(bearer(params.get('token')!))
    expect(me.body).toMatchObject({ name: 'ไม่ยืนยัน', email: null })
  })

  it('ไม่ให้ใช้ social login กับบัญชีพนักงาน', async () => {
    mockGoogle({ sub: 'google-staff', name: 'Staff', email: 'staff@test.local', email_verified: true })

    const params = await finishLogin(await startLogin())
    expect(params.get('token')).toBeNull()
    expect(params.get('error')).toContain('พนักงาน')
  })

  it('ปฏิเสธ state ที่ไม่ถูกต้องโดยไม่เรียก provider', async () => {
    const fetchMock = mockGoogle({ sub: 'x', name: 'x' })

    const params = await finishLogin('forged-state')
    expect(params.get('error')).toContain('ไม่ถูกต้อง')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('provider ที่ยังไม่ได้ตั้งค่าจะ redirect กลับพร้อมข้อความ', async () => {
    const response = await request(app).get('/api/auth/line')
    expect(response.status).toBe(302)
    const location = new URL(response.headers.location!)
    expect(location.searchParams.get('error')).toContain('LINE')
  })
})
