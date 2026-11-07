import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { REPAIR_STATUS } from '../src/constants'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/auth'
import { dateOnly, seedBase, seedContractWithInvoice } from './helpers/fixtures'

describe('การแจ้งซ่อม', () => {
  let base: Awaited<ReturnType<typeof seedBase>>
  let tenantToken: string
  let otherTenantToken: string
  let staffToken: string
  let adminToken: string

  beforeEach(async () => {
    base = await seedBase()
    const { contract } = await seedContractWithInvoice(base)
    // ให้สัญญายังใช้งานอยู่เสมอ ไม่ขึ้นกับวันที่รันเทสต์
    await prisma.contract.update({
      where: { contractId: contract.contractId },
      data: { endDate: dateOnly('2099-12-31') },
    })
    tenantToken = await loginAs('tenant@test.local')
    otherTenantToken = await loginAs('tenant2@test.local')
    staffToken = await loginAs('staff@test.local')
    adminToken = await loginAs('admin@test.local')
  })

  async function createRepair(token = tenantToken) {
    return request(app)
      .post('/api/repair-requests')
      .set(bearer(token))
      .send({ roomId: base.room.roomId, description: 'แอร์ไม่เย็น มีน้ำหยด' })
  }

  it('ผู้เช่าที่มีสัญญาแจ้งซ่อมห้องของตนเองได้ และเห็นในรายการของตนเอง', async () => {
    const created = await createRepair()
    expect(created.status).toBe(201)
    expect(created.body.status).toBe(REPAIR_STATUS.PENDING)

    const mine = await request(app).get('/api/repair-requests').set(bearer(tenantToken))
    expect(mine.status).toBe(200)
    expect(mine.body.length).toBe(1)

    const other = await request(app).get('/api/repair-requests').set(bearer(otherTenantToken))
    expect(other.body.length).toBe(0)
  })

  it('ผู้เช่าที่ไม่มีสัญญาของห้องนั้นแจ้งซ่อมไม่ได้', async () => {
    const response = await createRepair(otherTenantToken)
    expect(response.status).toBe(403)
  })

  it('ไม่รับคำอธิบายที่สั้นเกินไป และผู้เช่ากำหนดผู้รับผิดชอบเองไม่ได้', async () => {
    const short = await request(app)
      .post('/api/repair-requests')
      .set(bearer(tenantToken))
      .send({ roomId: base.room.roomId, description: 'พัง' })
    expect(short.status).toBe(400)

    const withStaff = await request(app)
      .post('/api/repair-requests')
      .set(bearer(tenantToken))
      .send({ room_id: base.room.roomId, description: 'ก๊อกน้ำรั่ว', staff_id: base.staff.staffId })
    expect(withStaff.status).toBe(403)
  })

  it('STAFF แจ้งซ่อมแทนผู้เช่าพร้อมรับงานเองได้ และลบรายการได้', async () => {
    const created = await request(app)
      .post('/api/repair-requests')
      .set(bearer(staffToken))
      .send({
        room_id: String(base.room.roomId),
        description: 'หลอดไฟทางเดินเสีย',
        staff_id: String(base.staff.staffId),
        status: REPAIR_STATUS.IN_PROGRESS,
      })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ staff_id: base.staff.staffId, status: REPAIR_STATUS.IN_PROGRESS })

    const deleted = await request(app)
      .delete(`/api/repair-requests/${created.body.repair_id}`)
      .set(bearer(staffToken))
    expect(deleted.status).toBe(204)
  })

  it('STAFF รับงานให้ตนเองและอัปเดตสถานะได้', async () => {
    const created = await createRepair()
    const repairId = created.body.repair_id as number

    const assigned = await request(app)
      .patch(`/api/repair-requests/${repairId}`)
      .set(bearer(staffToken))
      .send({ staffId: base.staff.staffId, status: REPAIR_STATUS.IN_PROGRESS })
    expect(assigned.status).toBe(200)
    expect(assigned.body.staff.full_name).toBe('พนักงานทดสอบ')
    expect(assigned.body.status).toBe(REPAIR_STATUS.IN_PROGRESS)

    const done = await request(app)
      .patch(`/api/repair-requests/${repairId}`)
      .set(bearer(staffToken))
      .send({ status: REPAIR_STATUS.COMPLETED })
    expect(done.body.status).toBe(REPAIR_STATUS.COMPLETED)

    const filtered = await request(app)
      .get('/api/repair-requests')
      .query({ status: REPAIR_STATUS.COMPLETED })
      .set(bearer(staffToken))
    expect(filtered.body.length).toBe(1)
  })

  it('STAFF มอบหมายงานให้คนอื่นหรือแก้งานของคนอื่นไม่ได้ แต่ ADMIN ทำได้', async () => {
    const otherStaff = await prisma.staff.create({
      data: { fullName: 'ช่างคนที่สอง', position: 'ช่าง', phone: '0834567890' },
    })
    const created = await createRepair()
    const repairId = created.body.repair_id as number

    const assignOther = await request(app)
      .patch(`/api/repair-requests/${repairId}`)
      .set(bearer(staffToken))
      .send({ staffId: otherStaff.staffId })
    expect(assignOther.status).toBe(403)

    const adminAssign = await request(app)
      .patch(`/api/repair-requests/${repairId}`)
      .set(bearer(adminToken))
      .send({ staffId: otherStaff.staffId })
    expect(adminAssign.status).toBe(200)

    const staffEdit = await request(app)
      .patch(`/api/repair-requests/${repairId}`)
      .set(bearer(staffToken))
      .send({ status: REPAIR_STATUS.COMPLETED })
    expect(staffEdit.status).toBe(403)

    const empty = await request(app)
      .patch(`/api/repair-requests/${repairId}`)
      .set(bearer(adminToken))
      .send({})
    expect(empty.status).toBe(400)
  })
})
