import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { PAYMENT_STATUS } from '../src/constants'
import { bearer, loginAs } from './helpers/auth'
import { addPayment, seedBase, seedContractWithInvoice } from './helpers/fixtures'

describe('สัญญาเช่า', () => {
  let contractId: number
  let invoiceId: number
  let tenantToken: string
  let otherTenantToken: string
  let staffToken: string
  let adminToken: string

  beforeEach(async () => {
    const base = await seedBase()
    const data = await seedContractWithInvoice(base, { total: 1000 })
    contractId = data.contract.contractId
    invoiceId = data.invoice.invoiceId
    tenantToken = await loginAs('tenant@test.local')
    otherTenantToken = await loginAs('tenant2@test.local')
    staffToken = await loginAs('staff@test.local')
    adminToken = await loginAs('admin@test.local')
  })

  it('ผู้เช่าเห็นเฉพาะสัญญาของตนเอง พร้อมยอดคงค้างของใบแจ้งหนี้', async () => {
    await addPayment(invoiceId, { amount: 400, status: PAYMENT_STATUS.APPROVED })
    await addPayment(invoiceId, { amount: 600, status: PAYMENT_STATUS.PENDING })

    const mine = await request(app).get('/api/contracts').set(bearer(tenantToken))
    expect(mine.status).toBe(200)
    expect(mine.body).toHaveLength(1)
    expect(mine.body[0].invoices[0]).toMatchObject({
      total_amount: 1000,
      paid_amount: 400,
      balance: 600,
    })

    const other = await request(app).get('/api/contracts').set(bearer(otherTenantToken))
    expect(other.body).toEqual([])
  })

  it('ผู้เช่าคนอื่นดูสัญญาที่ไม่ใช่ของตนเองไม่ได้', async () => {
    const own = await request(app).get(`/api/contracts/${contractId}`).set(bearer(tenantToken))
    expect(own.status).toBe(200)
    expect(own.body.booking.tenant.full_name).toBe('ผู้เช่าทดสอบ')

    const forbidden = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set(bearer(otherTenantToken))
    expect(forbidden.status).toBe(403)
  })

  it('STAFF ดูรายการสัญญาทั้งหมดได้ เป็น array และ field เป็น snake_case', async () => {
    const list = await request(app).get('/api/contracts').set(bearer(staffToken))
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body)).toBe(true)
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toMatchObject({ contract_id: contractId, booking_id: expect.any(Number) })
  })

  it('ADMIN แก้ไขวันที่และเงินมัดจำได้ แต่วันสิ้นสุดต้องหลังวันเริ่ม', async () => {
    const updated = await request(app)
      .patch(`/api/contracts/${contractId}`)
      .set(bearer(adminToken))
      .send({ endDate: '2027-06-30', deposit: 2000 })
    expect(updated.status).toBe(200)
    expect(updated.body.end_date).toContain('2027-06-30')
    expect(Number(updated.body.deposit)).toBe(2000)

    const invalid = await request(app)
      .patch(`/api/contracts/${contractId}`)
      .set(bearer(adminToken))
      .send({ endDate: '2025-12-31' })
    expect(invalid.status).toBe(400)

    const tenant = await request(app)
      .patch(`/api/contracts/${contractId}`)
      .set(bearer(tenantToken))
      .send({ deposit: 1 })
    expect(tenant.status).toBe(403)
  })
})
