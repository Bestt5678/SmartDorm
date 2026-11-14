import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { bearer, loginAs } from './helpers/loginAs'
import { seedBase } from './helpers/seedTestData'

describe('ห้องพัก', () => {
  let base: Awaited<ReturnType<typeof seedBase>>

  beforeEach(async () => {
    base = await seedBase()
  })

  it('ดูรายการห้องได้โดยไม่ต้องเข้าสู่ระบบ', async () => {
    const res = await request(app).get('/api/rooms')

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].room_number).toBe('T-101')
    expect(res.body[0].room_type.type_name).toBe('ห้องทดสอบ')
  })

  it('ค้นหาห้องด้วยเลขห้องได้', async () => {
    const found = await request(app).get('/api/rooms?q=T-101')
    const notFound = await request(app).get('/api/rooms?q=999')

    expect(found.body.length).toBe(1)
    expect(notFound.body.length).toBe(0)
  })

  it('พนักงานเพิ่มและแก้ไขห้องได้', async () => {
    const token = await loginAs('staff@test.local')

    const created = await request(app).post('/api/rooms').set(bearer(token)).send({
      room_number: 'T-102',
      floor: 1,
      room_type_id: base.roomType.room_type_id,
      monthly_rate: 1200,
    })
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('ว่าง')

    const updated = await request(app)
      .patch(`/api/rooms/${created.body.room_id}`)
      .set(bearer(token))
      .send({ monthly_rate: 1500 })
    expect(updated.status).toBe(200)
    expect(Number(updated.body.monthly_rate)).toBe(1500)
    expect(updated.body.status).toBe('ว่าง')
  })

  it('ผู้เช่าเพิ่มห้องไม่ได้', async () => {
    const token = await loginAs('tenant@test.local')
    const res = await request(app).post('/api/rooms').set(bearer(token)).send({
      room_number: 'T-103',
      floor: 1,
      room_type_id: base.roomType.room_type_id,
      monthly_rate: 1200,
    })

    expect(res.status).toBe(403)
  })
})
