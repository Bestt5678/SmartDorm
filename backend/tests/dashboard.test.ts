import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { env } from '../src/config/env'
import { PAYMENT_STATUS } from '../src/constants'
import { bearer, loginAs } from './helpers/auth'
import { addPayment, seedBase, seedContractWithInvoice } from './helpers/fixtures'

describe('Dashboard, directory และ settings', () => {
  let base: Awaited<ReturnType<typeof seedBase>>
  let tenantToken: string
  let staffToken: string

  beforeEach(async () => {
    base = await seedBase()
    const { invoice } = await seedContractWithInvoice(base, { total: 1000 })
    await addPayment(invoice.invoiceId, { amount: 300, status: PAYMENT_STATUS.APPROVED })
    await addPayment(invoice.invoiceId, { amount: 200, status: PAYMENT_STATUS.PENDING })
    tenantToken = await loginAs('tenant@test.local')
    staffToken = await loginAs('staff@test.local')
  })

  it('สรุปภาพรวมนับเฉพาะยอดที่อนุมัติแล้ว', async () => {
    const response = await request(app).get('/api/dashboard/summary').set(bearer(staffToken))

    expect(response.status).toBe(200)
    expect(response.body.rooms).toEqual({ total: 1, available: 0, occupied: 1, maintenance: 0 })
    expect(response.body.tenants).toBe(2)
    expect(response.body.bookings.confirmed).toBe(1)
    expect(response.body.finance.outstanding_amount).toBe(700)
    expect(response.body.finance.paid_this_month).toBe(300)
    expect(response.body.recent_invoices[0]).toMatchObject({ paid_amount: 300, balance: 700 })
    expect(response.body.room_types[0].room_count).toBe(1)
  })

  it('ผู้เช่าเข้าถึง dashboard, directory และ settings ไม่ได้', async () => {
    for (const path of ['/api/dashboard/summary', '/api/staff', '/api/tenants', '/api/settings']) {
      const response = await request(app).get(path).set(bearer(tenantToken))
      expect(response.status, path).toBe(403)
    }
  })

  it('STAFF ดูรายชื่อพนักงานและผู้เช่าได้ โดยไม่มีรหัสผ่านหลุดออกไป', async () => {
    const staff = await request(app).get('/api/staff').set(bearer(staffToken))
    expect(staff.status).toBe(200)
    expect(staff.body[0].account.email).toBe('staff@test.local')

    const tenants = await request(app).get('/api/tenants').set(bearer(staffToken))
    expect(tenants.status).toBe(200)
    expect(tenants.body).toHaveLength(2)
    expect(JSON.stringify(tenants.body)).not.toContain('passwordHash')

    const tenant = await request(app)
      .get(`/api/tenants/${base.tenant.tenantId}`)
      .set(bearer(staffToken))
    expect(tenant.status).toBe(200)
    expect(tenant.body.bookings[0].contract.invoices).toHaveLength(1)

    const missing = await request(app).get('/api/tenants/999999').set(bearer(staffToken))
    expect(missing.status).toBe(404)
  })

  it('settings คืนอัตราค่าน้ำค่าไฟจาก env', async () => {
    const response = await request(app).get('/api/settings').set(bearer(staffToken))
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ water_rate: env.WATER_RATE, electric_rate: env.ELECTRIC_RATE })
  })
})
