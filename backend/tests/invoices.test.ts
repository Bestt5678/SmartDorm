import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { INVOICE_STATUS, PAYMENT_STATUS } from '../src/constants'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/auth'
import {
  addPayment,
  dateOnly,
  seedBase,
  seedContractWithInvoice,
} from './helpers/fixtures'

describe('ใบแจ้งหนี้ การยกเลิก และมิเตอร์', () => {
  let adminToken: string
  let tenantToken: string
  let base: Awaited<ReturnType<typeof seedBase>>
  let contractId: number
  let invoiceId: number

  beforeEach(async () => {
    base = await seedBase()
    const contractData = await seedContractWithInvoice(base, { total: 1000 })
    contractId = contractData.contract.contractId
    invoiceId = contractData.invoice.invoiceId
    adminToken = await loginAs('admin@test.local')
    tenantToken = await loginAs('tenant@test.local')
  })

  it('ยกเลิกใบแจ้งหนี้ที่มีแต่รายการถูกปฏิเสธได้', async () => {
    await addPayment(invoiceId, {
      amount: 1000,
      status: PAYMENT_STATUS.REJECTED,
    })

    const response = await request(app)
      .post(`/api/invoices/${invoiceId}/cancel`)
      .set(bearer(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(INVOICE_STATUS.CANCELLED)
    expect(response.body.paid_amount).toBe(0)
  })

  it('ไม่ให้ยกเลิกใบแจ้งหนี้ที่มีรายการรอตรวจสอบหรืออนุมัติแล้ว', async () => {
    const pending = await addPayment(invoiceId, {
      amount: 500,
      status: PAYMENT_STATUS.PENDING,
    })
    const pendingResponse = await request(app)
      .post(`/api/invoices/${invoiceId}/cancel`)
      .set(bearer(adminToken))
    expect(pendingResponse.status).toBe(409)

    await prisma.payment.update({
      where: { paymentId: pending.paymentId },
      data: { status: PAYMENT_STATUS.APPROVED },
    })
    const approvedResponse = await request(app)
      .post(`/api/invoices/${invoiceId}/cancel`)
      .set(bearer(adminToken))
    expect(approvedResponse.status).toBe(409)
  })

  it('ห้ามแก้ไขสถานะใบแจ้งหนี้โดยตรงผ่าน PATCH', async () => {
    const response = await request(app)
      .patch(`/api/invoices/${invoiceId}`)
      .set(bearer(adminToken))
      .send({ status: INVOICE_STATUS.PAID })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('ข้อมูลไม่ถูกต้อง')
  })

  it('ห้ามแก้ไขยอดเงินของใบแจ้งหนี้ที่ชำระครบแล้ว', async () => {
    await addPayment(invoiceId, {
      amount: 1000,
      status: PAYMENT_STATUS.APPROVED,
    })
    await prisma.invoice.update({
      where: { invoiceId },
      data: { status: INVOICE_STATUS.PAID },
    })

    const response = await request(app)
      .patch(`/api/invoices/${invoiceId}`)
      .set(bearer(adminToken))
      .send({ rentAmount: 1200 })

    expect(response.status).toBe(409)
  })

  it('ออกใบแจ้งหนี้จากมิเตอร์เดียวกันได้เพียงใบเดียว', async () => {
    const meter = await prisma.utilityMeter.create({
      data: {
        roomId: base.room.roomId,
        meterMonth: dateOnly('2026-03-01'),
        waterUnit: 10,
        electricUnit: 20,
      },
    })
    const payload = {
      contractId,
      meterId: meter.meterId,
      dueDate: '2026-03-31',
      invoiceType: 'UTILITY',
    }

    const first = await request(app)
      .post('/api/invoices')
      .set(bearer(adminToken))
      .send(payload)
    expect(first.status).toBe(201)
    expect(Number(first.body.water_amount)).toBe(180)
    expect(Number(first.body.electric_amount)).toBe(160)

    const second = await request(app)
      .post('/api/invoices')
      .set(bearer(adminToken))
      .send(payload)
    expect(second.status).toBe(409)
    expect(second.body.message).toContain('มิเตอร์นี้ถูกออกใบแจ้งหนี้แล้ว')
  })

  it('ผู้เช่าดูใบแจ้งหนี้ของตัวเองได้แต่ดูของคนอื่นไม่ได้', async () => {
    const own = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set(bearer(tenantToken))
    expect(own.status).toBe(200)

    const otherInvoice = await prisma.invoice.create({
      data: {
        contractId,
        dueDate: dateOnly('2026-04-30'),
        rentAmount: 100,
        invoiceType: 'OTHER',
        status: INVOICE_STATUS.UNPAID,
      },
    })
    const otherTenantToken = await loginAs('tenant2@test.local')
    const forbidden = await request(app)
      .get(`/api/invoices/${otherInvoice.invoiceId}`)
      .set(bearer(otherTenantToken))
    expect(forbidden.status).toBe(403)
  })
})
