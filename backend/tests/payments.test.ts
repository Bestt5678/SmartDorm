import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { INVOICE_STATUS, PAYMENT_STATUS } from '../src/constants'
import { bearer, loginAs } from './helpers/auth'
import {
  addInvoice,
  addPayment,
  seedBase,
  seedContractWithInvoice,
} from './helpers/fixtures'

const pngBuffer = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
])

function uploadSlip(
  invoiceId: number,
  token: string,
  amount: number,
  buffer = pngBuffer,
) {
  return request(app)
    .post(`/api/invoices/${invoiceId}/payments`)
    .set(bearer(token))
    .field('amount', String(amount))
    .field('paymentType', 'โอนเงิน')
    .attach('slip', buffer, {
      filename: 'slip.png',
      contentType: 'image/png',
    })
}

describe('การชำระเงินและการตรวจสอบสลิป', () => {
  let tenantToken: string
  let otherTenantToken: string
  let staffToken: string
  let invoiceId: number
  let contractId: number

  beforeEach(async () => {
    const base = await seedBase()
    const contractData = await seedContractWithInvoice(base, { total: 1000 })
    invoiceId = contractData.invoice.invoiceId
    contractId = contractData.contract.contractId
    tenantToken = await loginAs('tenant@test.local')
    otherTenantToken = await loginAs('tenant2@test.local')
    staffToken = await loginAs('staff@test.local')
  })

  it('ผู้เช่าอัปโหลดสลิปแล้วใบแจ้งหนี้รอตรวจสอบ และกันสลิปซ้ำ', async () => {
    const response = await uploadSlip(invoiceId, tenantToken, 400)

    expect(response.status).toBe(201)
    expect(response.body.status).toBe(INVOICE_STATUS.PENDING_REVIEW)
    expect(response.body.paid_amount).toBe(0)
    expect(response.body.balance).toBe(1000)
    expect(response.body.payments[0].status).toBe(PAYMENT_STATUS.PENDING)
    expect(response.body.payments[0].slip_url).toMatch(/^slip-/)

    const duplicate = await uploadSlip(invoiceId, tenantToken, 400)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.message).toContain('รอตรวจสอบ')
  })

  it('พนักงานอนุมัติแล้วยอดชำระและสถานะใบแจ้งหนี้ถูกคำนวณใหม่', async () => {
    const upload = await uploadSlip(invoiceId, tenantToken, 400)
    const paymentId = upload.body.payments[0].payment_id as number

    const list = await request(app)
      .get('/api/payments')
      .query({ status: PAYMENT_STATUS.PENDING })
      .set(bearer(staffToken))
    expect(list.status).toBe(200)
    expect(list.body.length).toBe(1)

    const approved = await request(app)
      .post(`/api/payments/${paymentId}/approve`)
      .set(bearer(staffToken))

    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe(INVOICE_STATUS.PARTIAL)
    expect(approved.body.paid_amount).toBe(400)
    expect(approved.body.balance).toBe(600)
    expect(approved.body.payments[0].status).toBe(PAYMENT_STATUS.APPROVED)
    expect(approved.body.payments[0].verified_by_account_id).toEqual(expect.any(Number))

    const again = await request(app)
      .post(`/api/payments/${paymentId}/approve`)
      .set(bearer(staffToken))
    expect(again.status).toBe(409)
  })

  it('ปฏิเสธรายการชำระเงินแล้วยอดไม่ถูกนับ', async () => {
    const invoice = await addInvoice(contractId, { total: 500 })
    const upload = await uploadSlip(invoice.invoiceId, tenantToken, 500)
    const paymentId = upload.body.payments[0].payment_id as number

    const rejected = await request(app)
      .post(`/api/payments/${paymentId}/reject`)
      .set(bearer(staffToken))
      .send({ note: 'สลิปไม่ชัดเจน' })

    expect(rejected.status).toBe(200)
    expect(rejected.body.status).toBe(INVOICE_STATUS.UNPAID)
    expect(rejected.body.paid_amount).toBe(0)
    expect(rejected.body.balance).toBe(500)
    expect(rejected.body.payments[0].status).toBe(PAYMENT_STATUS.REJECTED)
    expect(rejected.body.payments[0].note).toBe('สลิปไม่ชัดเจน')
  })

  it('ปฏิเสธยอดชำระที่เกินยอดคงเหลือ และไม่บันทึกรายการ', async () => {
    const response = await uploadSlip(invoiceId, tenantToken, 1200)

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('เกินยอดคงเหลือ')

    const invoice = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set(bearer(tenantToken))
    expect(invoice.body.payments).toHaveLength(0)
    expect(invoice.body.status).toBe(INVOICE_STATUS.UNPAID)
  })

  it('ดูสลิปได้เฉพาะเจ้าของและพนักงาน', async () => {
    const upload = await uploadSlip(invoiceId, tenantToken, 200)
    const paymentId = upload.body.payments[0].payment_id as number

    const own = await request(app)
      .get(`/api/payments/${paymentId}/slip`)
      .set(bearer(tenantToken))
    expect(own.status).toBe(200)
    expect(own.headers['content-type']).toContain('image/png')

    const other = await request(app)
      .get(`/api/payments/${paymentId}/slip`)
      .set(bearer(otherTenantToken))
    expect(other.status).toBe(403)

    const staff = await request(app)
      .get(`/api/payments/${paymentId}/slip`)
      .set(bearer(staffToken))
    expect(staff.status).toBe(200)
  })

  it('พนักงานบันทึกการชำระเงินตรงได้โดยไม่ต้องมีสลิป', async () => {
    const response = await request(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set(bearer(staffToken))
      .send({ amount: 300, paymentType: 'เงินสด' })

    expect(response.status).toBe(201)
    expect(response.body.status).toBe(INVOICE_STATUS.PARTIAL)
    expect(response.body.paid_amount).toBe(300)
    expect(response.body.payments[0].status).toBe(PAYMENT_STATUS.APPROVED)
    expect(response.body.payments[0].verified_by_account_id).toEqual(expect.any(Number))
  })

  it('อนุมัติพร้อมกันต้องไม่ทำให้ยอดเกินคงเหลือ', async () => {
    const first = await addPayment(invoiceId, {
      amount: 600,
      status: PAYMENT_STATUS.PENDING,
    })
    const second = await addPayment(invoiceId, {
      amount: 600,
      status: PAYMENT_STATUS.PENDING,
    })

    const responses = await Promise.all([
      request(app)
        .post(`/api/payments/${first.paymentId}/approve`)
        .set(bearer(staffToken)),
      request(app)
        .post(`/api/payments/${second.paymentId}/approve`)
        .set(bearer(staffToken)),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400])

    const invoice = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set(bearer(tenantToken))
    expect(invoice.body.paid_amount).toBe(600)
    expect(invoice.body.balance).toBe(400)
    expect(invoice.body.status).toBe(INVOICE_STATUS.PENDING_REVIEW)
  })
})
