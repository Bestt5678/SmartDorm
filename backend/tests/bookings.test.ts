import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/loginAs'
import { seedBase } from './helpers/seedTestData'

describe('การจองห้อง', () => {
  let base: Awaited<ReturnType<typeof seedBase>>
  let tenantToken: string
  let staffToken: string

  beforeEach(async () => {
    base = await seedBase()
    tenantToken = await loginAs('tenant@test.local')
    staffToken = await loginAs('staff@test.local')
  })

  async function bookRoom() {
    return request(app).post('/api/bookings').set(bearer(tenantToken)).send({
      room_id: base.room.room_id,
      move_in_date: '2026-12-01',
    })
  }

  it('ผู้เช่าจองห้องแล้วห้องเปลี่ยนเป็นไม่ว่าง', async () => {
    const res = await bookRoom()

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('รอดำเนินการ')
    const room = await prisma.room.findUnique({ where: { room_id: base.room.room_id } })
    expect(room!.status).toBe('ไม่ว่าง')
  })

  it('จองห้องเดียวกันซ้ำไม่ได้', async () => {
    await bookRoom()
    const res = await bookRoom()

    expect(res.status).toBe(409)
  })

  it('พนักงานยืนยันการจองแล้วได้สัญญาและใบแจ้งหนี้เงินมัดจำ', async () => {
    const booking = await bookRoom()

    const res = await request(app)
      .post(`/api/bookings/${booking.body.booking_id}/confirm`)
      .set(bearer(staffToken))
      .send({ start_date: '2026-12-01', end_date: '2027-11-30', deposit: 5000 })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ยืนยันแล้ว')
    expect(res.body.contract).toBeTruthy()
    expect(res.body.contract.invoices.length).toBe(1)
    expect(Number(res.body.contract.invoices[0].deposit_amount)).toBe(5000)
  })

  it('วันสิ้นสุดสัญญาต้องหลังวันเริ่ม', async () => {
    const booking = await bookRoom()

    const res = await request(app)
      .post(`/api/bookings/${booking.body.booking_id}/confirm`)
      .set(bearer(staffToken))
      .send({ start_date: '2026-12-01', end_date: '2026-11-01', deposit: 5000 })

    expect(res.status).toBe(400)
  })

  it('ยกเลิกการจองแล้วห้องกลับมาว่าง', async () => {
    const booking = await bookRoom()

    const res = await request(app)
      .post(`/api/bookings/${booking.body.booking_id}/cancel`)
      .set(bearer(tenantToken))

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ยกเลิก')
    const room = await prisma.room.findUnique({ where: { room_id: base.room.room_id } })
    expect(room!.status).toBe('ว่าง')
  })
})
