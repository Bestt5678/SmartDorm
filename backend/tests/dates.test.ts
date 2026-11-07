import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app'
import { bearer, loginAs } from './helpers/auth'
import { seedBase, seedContractWithInvoice } from './helpers/fixtures'

// 18:30 UTC วันที่ 8 = 01:30 วันที่ 9 ตามเวลาไทย (APP_TIMEZONE=Asia/Bangkok)
const AFTER_MIDNIGHT_IN_BANGKOK = new Date('2026-11-08T18:30:00.000Z')

describe('วันที่บันทึกใช้วันตาม APP_TIMEZONE ไม่ใช่ UTC', () => {
  let base: Awaited<ReturnType<typeof seedBase>>

  beforeEach(async () => {
    base = await seedBase()
    // ปลอมเฉพาะ Date (ไม่ปลอม timer เพื่อให้ Prisma/supertest ทำงานปกติ)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AFTER_MIDNIGHT_IN_BANGKOK)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('booking_date, invoice_date, payment_date และ request_date เป็นวันที่ 9', async () => {
    const tenantToken = await loginAs('tenant@test.local')
    const staffToken = await loginAs('staff@test.local')

    const booking = await request(app)
      .post('/api/bookings')
      .set(bearer(tenantToken))
      .send({ room_id: base.room.roomId, move_in_date: '2099-01-01' })
    expect(booking.status).toBe(201)
    expect(booking.body.booking_date).toContain('2026-11-09')

    const confirmed = await request(app)
      .post(`/api/bookings/${booking.body.booking_id}/confirm`)
      .set(bearer(staffToken))
      .send({ start_date: '2099-01-01', end_date: '2099-12-31', deposit: 1000 })
    expect(confirmed.status).toBe(200)
    const invoice = confirmed.body.contract.invoices[0]
    expect(invoice.invoice_date).toContain('2026-11-09')

    const paid = await request(app)
      .post('/api/payments')
      .set(bearer(staffToken))
      .send({ invoice_id: invoice.invoice_id, amount: 1000, payment_type: 'เงินสด' })
    expect(paid.status).toBe(201)
    expect(paid.body.payments[0].payment_date).toContain('2026-11-09')

    const repair = await request(app)
      .post('/api/repair-requests')
      .set(bearer(staffToken))
      .send({ room_id: base.room.roomId, description: 'ทดสอบวันที่แจ้งซ่อม' })
    expect(repair.status).toBe(201)
    expect(repair.body.request_date).toContain('2026-11-09')
  })

  it('ใบแจ้งหนี้ที่สร้างเองก็ใช้วันตาม APP_TIMEZONE', async () => {
    const { contract } = await seedContractWithInvoice(base)
    const staffToken = await loginAs('staff@test.local')

    const created = await request(app)
      .post('/api/invoices')
      .set(bearer(staffToken))
      .send({ contract_id: contract.contractId, due_date: '2099-01-31', rent_amount: 100 })
    expect(created.status).toBe(201)
    expect(created.body.invoice_date).toContain('2026-11-09')
  })
})
