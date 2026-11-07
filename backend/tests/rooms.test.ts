import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { ROOM_STATUS } from '../src/constants'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/auth'
import { seedBase, seedContractWithInvoice } from './helpers/fixtures'

describe('ห้องพักและประเภทห้อง', () => {
  let base: Awaited<ReturnType<typeof seedBase>>
  let adminToken: string
  let staffToken: string

  beforeEach(async () => {
    base = await seedBase()
    await prisma.room.createMany({
      data: [
        {
          roomNumber: 'T-201',
          floor: 2,
          roomTypeId: base.roomType.roomTypeId,
          monthlyRate: 2500,
          status: ROOM_STATUS.AVAILABLE,
        },
        {
          roomNumber: 'T-202',
          floor: 2,
          roomTypeId: base.roomType.roomTypeId,
          monthlyRate: 4000,
          status: ROOM_STATUS.MAINTENANCE,
        },
      ],
    })
    adminToken = await loginAs('admin@test.local')
    staffToken = await loginAs('staff@test.local')
  })

  it('ดูรายการห้องได้โดยไม่ต้องเข้าสู่ระบบ เป็น array และจำกัดจำนวนด้วย limit ได้', async () => {
    const all = await request(app).get('/api/rooms')
    expect(all.status).toBe(200)
    expect(all.body).toHaveLength(3)
    expect(all.body[0]).toMatchObject({ room_number: 'T-101', floor: 1, status: ROOM_STATUS.AVAILABLE })
    expect(all.body[0]).toHaveProperty('room_type_id')
    expect(all.body[0]).toHaveProperty('monthly_rate')

    const limited = await request(app).get('/api/rooms').query({ limit: 2 })
    expect(limited.body).toHaveLength(2)
  })

  it('กรองห้องตามชั้น สถานะ ราคา และคำค้นได้', async () => {
    const byFloor = await request(app).get('/api/rooms').query({ floor: 2 })
    expect(byFloor.body.map((room: { room_number: string }) => room.room_number)).toEqual([
      'T-201',
      'T-202',
    ])

    const byStatus = await request(app)
      .get('/api/rooms')
      .query({ status: ROOM_STATUS.MAINTENANCE })
    expect(byStatus.body.length).toBe(1)
    expect(byStatus.body[0].room_number).toBe('T-202')

    const byPrice = await request(app)
      .get('/api/rooms')
      .query({ minPrice: 2000, maxPrice: 3000 })
    expect(byPrice.body.length).toBe(1)
    expect(byPrice.body[0].room_number).toBe('T-201')

    const byQuery = await request(app).get('/api/rooms').query({ q: 't-10' })
    expect(byQuery.body.length).toBe(1)
    expect(byQuery.body[0].room_number).toBe('T-101')
  })

  it('ดูรายละเอียดห้องพร้อมการจองที่ยัง active และคืน 404 เมื่อไม่พบห้อง', async () => {
    await seedContractWithInvoice(base)

    const response = await request(app).get(`/api/rooms/${base.room.roomId}`)
    expect(response.status).toBe(200)
    expect(response.body.room_type.type_name).toBe('ห้องทดสอบ')
    expect(response.body.bookings).toHaveLength(1)
    expect(response.body.bookings[0].tenant.full_name).toBe('ผู้เช่าทดสอบ')

    const missing = await request(app).get('/api/rooms/999999')
    expect(missing.status).toBe(404)
  })

  it('ADMIN สร้าง แก้ไข และลบห้องได้', async () => {
    const created = await request(app)
      .post('/api/rooms')
      .set(bearer(adminToken))
      .send({
        roomNumber: 'T-301',
        floor: 3,
        roomTypeId: base.roomType.roomTypeId,
        monthlyRate: 3200,
      })
    expect(created.status).toBe(201)
    expect(created.body.status).toBe(ROOM_STATUS.AVAILABLE)
    const roomId = created.body.room_id as number

    const updated = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .set(bearer(adminToken))
      .send({ monthlyRate: 3500, status: ROOM_STATUS.MAINTENANCE })
    expect(updated.status).toBe(200)
    expect(Number(updated.body.monthly_rate)).toBe(3500)
    expect(updated.body.status).toBe(ROOM_STATUS.MAINTENANCE)

    const deleted = await request(app).delete(`/api/rooms/${roomId}`).set(bearer(adminToken))
    expect(deleted.status).toBe(204)
    expect(await prisma.room.findUnique({ where: { roomId } })).toBeNull()
  })

  it('แก้ราคาห้องที่มีผู้เช่าโดยไม่ส่ง status แล้วสถานะต้องไม่ถูกรีเซ็ต', async () => {
    await seedContractWithInvoice(base)

    const response = await request(app)
      .patch(`/api/rooms/${base.room.roomId}`)
      .set(bearer(adminToken))
      .send({ monthlyRate: 1200 })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe(ROOM_STATUS.OCCUPIED)
  })

  it('ไม่ให้สร้างห้องที่เลขห้องซ้ำ หรือข้อมูลไม่ถูกต้อง', async () => {
    const duplicate = await request(app)
      .post('/api/rooms')
      .set(bearer(adminToken))
      .send({
        roomNumber: 'T-101',
        floor: 1,
        roomTypeId: base.roomType.roomTypeId,
        monthlyRate: 1000,
      })
    expect(duplicate.status).toBe(409)

    const invalid = await request(app)
      .post('/api/rooms')
      .set(bearer(adminToken))
      .send({ roomNumber: '', floor: 0, roomTypeId: base.roomType.roomTypeId, monthlyRate: -1 })
    expect(invalid.status).toBe(400)

    const missingType = await request(app)
      .post('/api/rooms')
      .set(bearer(adminToken))
      .send({ roomNumber: 'T-999', floor: 9, roomTypeId: 999999, monthlyRate: 1000 })
    expect(missingType.status).toBe(404)
  })

  it('ไม่ให้ลบห้องที่มีการจองอ้างอิงอยู่', async () => {
    await seedContractWithInvoice(base)

    const response = await request(app)
      .delete(`/api/rooms/${base.room.roomId}`)
      .set(bearer(adminToken))
    expect(response.status).toBe(409)
  })

  it('STAFF/ADMIN จัดการห้องได้ ส่วนผู้เช่าและผู้ไม่ได้เข้าสู่ระบบทำไม่ได้', async () => {
    const anonymous = await request(app).post('/api/rooms').send({})
    expect(anonymous.status).toBe(401)

    const tenantToken = await loginAs('tenant@test.local')
    const tenant = await request(app)
      .patch(`/api/rooms/${base.room.roomId}`)
      .set(bearer(tenantToken))
      .send({ monthly_rate: 1 })
    expect(tenant.status).toBe(403)

    // frontend ส่ง snake_case และค่าจากฟอร์มเป็น string
    const staff = await request(app)
      .post('/api/rooms')
      .set(bearer(staffToken))
      .send({
        room_number: 'S-1',
        floor: '1',
        room_type_id: String(base.roomType.roomTypeId),
        monthly_rate: '1500',
      })
    expect(staff.status).toBe(201)
    expect(staff.body.room_number).toBe('S-1')
  })

  it('จัดการประเภทห้องได้ และไม่ให้ลบประเภทที่มีห้องอยู่', async () => {
    const list = await request(app).get('/api/room-types')
    expect(list.status).toBe(200)
    expect(list.body[0]._count.rooms).toBe(3)

    const blocked = await request(app)
      .delete(`/api/room-types/${base.roomType.roomTypeId}`)
      .set(bearer(adminToken))
    expect(blocked.status).toBe(409)

    const created = await request(app)
      .post('/api/room-types')
      .set(bearer(adminToken))
      .send({ typeName: 'ห้องใหม่', basePrice: 5000, amenities: ['แอร์'] })
    expect(created.status).toBe(201)
    expect(created.body.amenities).toEqual(['แอร์'])

    const updated = await request(app)
      .patch(`/api/room-types/${created.body.room_type_id}`)
      .set(bearer(adminToken))
      .send({ basePrice: 5500 })
    expect(updated.status).toBe(200)
    expect(Number(updated.body.base_price)).toBe(5500)

    const deleted = await request(app)
      .delete(`/api/room-types/${created.body.room_type_id}`)
      .set(bearer(adminToken))
    expect(deleted.status).toBe(204)
  })
})
