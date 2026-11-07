import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import {
  BOOKING_STATUS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  ROOM_STATUS,
} from '../src/constants'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/auth'
import {
  addPayment,
  seedBase,
  seedContractWithInvoice,
} from './helpers/fixtures'

describe('การยกเลิกและปิดสัญญาการจอง', () => {
  let tenantToken: string
  let adminToken: string
  let base: Awaited<ReturnType<typeof seedBase>>
  let bookingId: number
  let invoiceId: number

  beforeEach(async () => {
    base = await seedBase()
    const contractData = await seedContractWithInvoice(base, { total: 1000 })
    bookingId = contractData.booking.bookingId
    invoiceId = contractData.invoice.invoiceId
    tenantToken = await loginAs('tenant@test.local')
    adminToken = await loginAs('admin@test.local')
  })

  it('ยกเลิกการจองที่มีแต่รายการถูกปฏิเสธได้', async () => {
    await addPayment(invoiceId, {
      amount: 1000,
      status: PAYMENT_STATUS.REJECTED,
    })

    const response = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(bearer(tenantToken))

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(BOOKING_STATUS.CANCELLED)

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { invoiceId },
    })
    expect(invoice.status).toBe(INVOICE_STATUS.CANCELLED)

    const room = await prisma.room.findUniqueOrThrow({
      where: { roomId: base.room.roomId },
    })
    expect(room.status).toBe(ROOM_STATUS.AVAILABLE)
  })

  it('ยกเลิกการจองที่มีรายการรอตรวจสอบแล้วปฏิเสธรายการให้อัตโนมัติ', async () => {
    const payment = await addPayment(invoiceId, {
      amount: 500,
      status: PAYMENT_STATUS.PENDING,
    })

    const response = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(bearer(tenantToken))

    expect(response.status).toBe(200)

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { paymentId: payment.paymentId },
    })
    expect(updatedPayment.status).toBe(PAYMENT_STATUS.REJECTED)
    expect(updatedPayment.note).toBe('ยกเลิกการจอง')
  })

  it('ไม่ให้ยกเลิกการจองที่มีการชำระเงินอนุมัติแล้ว', async () => {
    await addPayment(invoiceId, {
      amount: 500,
      status: PAYMENT_STATUS.APPROVED,
    })

    const response = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(bearer(tenantToken))

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('ชำระเงินแล้ว')

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { bookingId },
    })
    expect(booking.status).toBe(BOOKING_STATUS.CONFIRMED)
  })

  it('ไม่ให้ปิดสัญญาเมื่อยังมีใบแจ้งหนี้ค้างชำระ', async () => {
    const response = await request(app)
      .post(`/api/bookings/${bookingId}/complete`)
      .set(bearer(adminToken))

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('ค้างชำระ')

    const room = await prisma.room.findUniqueOrThrow({
      where: { roomId: base.room.roomId },
    })
    expect(room.status).toBe(ROOM_STATUS.OCCUPIED)
  })

  it('ปิดสัญญาได้เมื่อใบแจ้งหนี้ชำระครบและคืนห้องเป็นว่าง', async () => {
    await addPayment(invoiceId, {
      amount: 1000,
      status: PAYMENT_STATUS.APPROVED,
    })
    await prisma.invoice.update({
      where: { invoiceId },
      data: { status: INVOICE_STATUS.PAID },
    })

    const response = await request(app)
      .post(`/api/bookings/${bookingId}/complete`)
      .set(bearer(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(BOOKING_STATUS.COMPLETED)

    const room = await prisma.room.findUniqueOrThrow({
      where: { roomId: base.room.roomId },
    })
    expect(room.status).toBe(ROOM_STATUS.AVAILABLE)
  })
})
