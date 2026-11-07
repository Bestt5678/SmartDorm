import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/auth'
import { dateOnly, seedBase, seedContractWithInvoice } from './helpers/fixtures'

describe('มิเตอร์น้ำไฟ', () => {
  let base: Awaited<ReturnType<typeof seedBase>>
  let adminToken: string
  let staffToken: string
  let tenantToken: string

  beforeEach(async () => {
    base = await seedBase()
    adminToken = await loginAs('admin@test.local')
    staffToken = await loginAs('staff@test.local')
    tenantToken = await loginAs('tenant@test.local')
  })

  it('ADMIN บันทึก แก้ไข และลบค่ามิเตอร์ได้', async () => {
    const created = await request(app)
      .post('/api/utility-meters')
      .set(bearer(adminToken))
      .send({ roomId: base.room.roomId, meterMonth: '2026-03-01', waterUnit: 12, electricUnit: 150 })
    expect(created.status).toBe(201)
    expect(created.body.room.room_number).toBe('T-101')
    const meterId = created.body.meter_id as number

    const updated = await request(app)
      .patch(`/api/utility-meters/${meterId}`)
      .set(bearer(adminToken))
      .send({ electricUnit: 175 })
    expect(updated.status).toBe(200)
    expect(Number(updated.body.electric_unit)).toBe(175)
    expect(Number(updated.body.water_unit)).toBe(12)

    const deleted = await request(app).delete(`/api/utility-meters/${meterId}`).set(bearer(adminToken))
    expect(deleted.status).toBe(204)
    expect(await prisma.utilityMeter.count()).toBe(0)
  })

  it('ไม่ให้ลบมิเตอร์ที่ออกใบแจ้งหนี้แล้ว', async () => {
    const { contract } = await seedContractWithInvoice(base)
    const meter = await prisma.utilityMeter.create({
      data: { roomId: base.room.roomId, meterMonth: dateOnly('2026-06-01'), waterUnit: 1, electricUnit: 1 },
    })
    await prisma.invoice.create({
      data: { contractId: contract.contractId, meterId: meter.meterId, dueDate: dateOnly('2099-06-30') },
    })

    const response = await request(app)
      .delete(`/api/utility-meters/${meter.meterId}`)
      .set(bearer(adminToken))
    expect(response.status).toBe(409)
  })

  it('ไม่ให้บันทึกมิเตอร์ซ้ำในห้องและเดือนเดียวกัน', async () => {
    const payload = { roomId: base.room.roomId, meterMonth: '2026-03-01', waterUnit: 1 }
    const first = await request(app).post('/api/utility-meters').set(bearer(adminToken)).send(payload)
    expect(first.status).toBe(201)

    const duplicate = await request(app).post('/api/utility-meters').set(bearer(adminToken)).send(payload)
    expect(duplicate.status).toBe(409)
  })

  it('คืน 404 เมื่อห้องหรือมิเตอร์ไม่มีอยู่', async () => {
    const missingRoom = await request(app)
      .post('/api/utility-meters')
      .set(bearer(adminToken))
      .send({ roomId: 999999, meterMonth: '2026-03-01' })
    expect(missingRoom.status).toBe(404)

    const missingMeter = await request(app)
      .patch('/api/utility-meters/999999')
      .set(bearer(adminToken))
      .send({ waterUnit: 1 })
    expect(missingMeter.status).toBe(404)
  })

  it('STAFF ดู กรองตามเดือน และบันทึกได้ ส่วนผู้เช่าดูไม่ได้', async () => {
    await prisma.utilityMeter.createMany({
      data: [
        { roomId: base.room.roomId, meterMonth: dateOnly('2026-03-01'), waterUnit: 1, electricUnit: 1 },
        { roomId: base.room.roomId, meterMonth: dateOnly('2026-04-01'), waterUnit: 2, electricUnit: 2 },
      ],
    })

    const all = await request(app).get('/api/utility-meters').set(bearer(staffToken))
    expect(all.status).toBe(200)
    expect(all.body.length).toBe(2)
    expect(all.body[0].meter_month).toContain('2026-04-01')

    const april = await request(app)
      .get('/api/utility-meters')
      .query({ month: '2026-04' })
      .set(bearer(staffToken))
    expect(april.body.length).toBe(1)

    const badMonth = await request(app)
      .get('/api/utility-meters')
      .query({ month: '2026-13' })
      .set(bearer(staffToken))
    expect(badMonth.status).toBe(400)

    const staffCreate = await request(app)
      .post('/api/utility-meters')
      .set(bearer(staffToken))
      .send({ room_id: base.room.roomId, meter_month: '2026-05-01', water_unit: '3', electric_unit: '40' })
    expect(staffCreate.status).toBe(201)

    const tenant = await request(app).get('/api/utility-meters').set(bearer(tenantToken))
    expect(tenant.status).toBe(403)
  })
})
