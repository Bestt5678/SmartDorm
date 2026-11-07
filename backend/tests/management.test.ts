import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import {
  BOOKING_STATUS,
  INVOICE_OVERDUE_STATUS,
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_STATUS,
  ROOM_STATUS,
} from '../src/constants'
import { prisma } from '../src/lib/prisma'
import { bearer, loginAs } from './helpers/auth'
import { addPayment, dateOnly, seedBase, seedContractWithInvoice } from './helpers/fixtures'

// ทดสอบ flow ที่หน้า CRUD ของ frontend ใช้: POST/DELETE ตรงๆ ด้วย body แบบ snake_case
describe('การจัดการข้อมูลโดย STAFF/ADMIN', () => {
  let base: Awaited<ReturnType<typeof seedBase>>
  let staffToken: string
  let adminToken: string
  let tenantToken: string

  beforeEach(async () => {
    base = await seedBase()
    staffToken = await loginAs('staff@test.local')
    adminToken = await loginAs('admin@test.local')
    tenantToken = await loginAs('tenant@test.local')
  })

  it('STAFF จองแทนผู้เช่า → สร้างสัญญา → ได้ใบแจ้งหนี้เงินมัดจำอัตโนมัติ', async () => {
    const booking = await request(app)
      .post('/api/bookings')
      .set(bearer(staffToken))
      .send({ room_id: String(base.room.roomId), tenant_id: String(base.tenant.tenantId), move_in_date: '2099-01-01' })
    expect(booking.status).toBe(201)
    expect(booking.body.status).toBe(BOOKING_STATUS.PENDING)

    const room = await prisma.room.findUniqueOrThrow({ where: { roomId: base.room.roomId } })
    expect(room.status).toBe(ROOM_STATUS.OCCUPIED)

    const contract = await request(app)
      .post('/api/contracts')
      .set(bearer(staffToken))
      .send({
        booking_id: String(booking.body.booking_id),
        start_date: '2099-01-01',
        end_date: '2099-12-31',
        deposit: '2000',
      })
    expect(contract.status).toBe(201)
    expect(contract.body.booking.status).toBe(BOOKING_STATUS.CONFIRMED)
    expect(contract.body.invoices).toHaveLength(1)
    expect(contract.body.invoices[0]).toMatchObject({
      invoice_type: INVOICE_TYPE.DEPOSIT,
      total_amount: 2000,
      status: INVOICE_STATUS.UNPAID,
    })

    const duplicate = await request(app)
      .post('/api/contracts')
      .set(bearer(staffToken))
      .send({ booking_id: booking.body.booking_id, start_date: '2099-01-01', end_date: '2099-12-31', deposit: 0 })
    expect(duplicate.status).toBe(409)
  })

  it('STAFF ต้องระบุผู้เช่าเมื่อจองแทน ส่วนผู้เช่าจองให้ตัวเองเสมอ', async () => {
    const missingTenant = await request(app)
      .post('/api/bookings')
      .set(bearer(staffToken))
      .send({ room_id: base.room.roomId, move_in_date: '2099-01-01' })
    expect(missingTenant.status).toBe(400)

    // ผู้เช่าส่ง tenant_id ของคนอื่นมาก็ถูกเพิกเฉย
    const own = await request(app)
      .post('/api/bookings')
      .set(bearer(tenantToken))
      .send({ room_id: base.room.roomId, tenant_id: base.otherTenant.tenantId, move_in_date: '2099-01-01' })
    expect(own.status).toBe(201)
    expect(own.body.tenant_id).toBe(base.tenant.tenantId)
  })

  it('ลบสัญญาที่ยังไม่มีการชำระ จะลบใบแจ้งหนี้และคืนการจองเป็นรอดำเนินการ', async () => {
    const { contract, booking } = await seedContractWithInvoice(base)

    const deleted = await request(app)
      .delete(`/api/contracts/${contract.contractId}`)
      .set(bearer(staffToken))
    expect(deleted.status).toBe(204)
    expect(await prisma.invoice.count({ where: { contractId: contract.contractId } })).toBe(0)
    const updated = await prisma.booking.findUniqueOrThrow({ where: { bookingId: booking.bookingId } })
    expect(updated.status).toBe(BOOKING_STATUS.PENDING)

    // ตอนนี้ไม่มีสัญญาแล้ว ลบการจองได้และห้องกลับมาว่าง
    const bookingDeleted = await request(app)
      .delete(`/api/bookings/${booking.bookingId}`)
      .set(bearer(staffToken))
    expect(bookingDeleted.status).toBe(204)
    const room = await prisma.room.findUniqueOrThrow({ where: { roomId: base.room.roomId } })
    expect(room.status).toBe(ROOM_STATUS.AVAILABLE)
  })

  it('ไม่ให้ลบสัญญาหรือการจองที่มีการชำระเงินแล้ว', async () => {
    const { contract, booking, invoice } = await seedContractWithInvoice(base)
    await addPayment(invoice.invoiceId, { amount: 100, status: PAYMENT_STATUS.APPROVED })

    const contractResponse = await request(app)
      .delete(`/api/contracts/${contract.contractId}`)
      .set(bearer(staffToken))
    expect(contractResponse.status).toBe(409)

    const bookingResponse = await request(app)
      .delete(`/api/bookings/${booking.bookingId}`)
      .set(bearer(staffToken))
    expect(bookingResponse.status).toBe(409)
  })

  it('STAFF บันทึกรับเงินผ่าน /payments แล้วลบได้ สถานะใบแจ้งหนี้คำนวณใหม่ทุกครั้ง', async () => {
    const { invoice } = await seedContractWithInvoice(base, { total: 1000 })

    const recorded = await request(app)
      .post('/api/payments')
      .set(bearer(staffToken))
      .send({ invoice_id: String(invoice.invoiceId), amount: '1000', payment_type: 'เงินสด' })
    expect(recorded.status).toBe(201)
    expect(recorded.body.status).toBe(INVOICE_STATUS.PAID)

    const list = await request(app).get('/api/payments').set(bearer(staffToken))
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toMatchObject({ payment_type: 'เงินสด', status: PAYMENT_STATUS.APPROVED })

    const deleted = await request(app)
      .delete(`/api/payments/${list.body[0].payment_id}`)
      .set(bearer(staffToken))
    expect(deleted.status).toBe(204)
    const after = await prisma.invoice.findUniqueOrThrow({ where: { invoiceId: invoice.invoiceId } })
    expect(after.status).toBe(INVOICE_STATUS.UNPAID)

    const tenantRecord = await request(app)
      .post('/api/payments')
      .set(bearer(tenantToken))
      .send({ invoice_id: invoice.invoiceId, amount: 1, payment_type: 'เงินสด' })
    expect(tenantRecord.status).toBe(403)
  })

  it('ผู้เช่าเห็นเฉพาะใบแจ้งหนี้และการชำระเงินของตัวเองใน list', async () => {
    const { invoice } = await seedContractWithInvoice(base)
    await addPayment(invoice.invoiceId, { amount: 100 })
    const otherToken = await loginAs('tenant2@test.local')

    const own = await request(app).get('/api/invoices').set(bearer(tenantToken))
    expect(own.body).toHaveLength(1)
    const ownPayments = await request(app).get('/api/payments').set(bearer(tenantToken))
    expect(ownPayments.body).toHaveLength(1)

    const other = await request(app).get('/api/invoices').set(bearer(otherToken))
    expect(other.body).toEqual([])
    const otherPayments = await request(app).get('/api/payments').set(bearer(otherToken))
    expect(otherPayments.body).toEqual([])
  })

  it('ใบแจ้งหนี้ที่ค้างชำระและเลยกำหนดแสดงสถานะเกินกำหนด', async () => {
    const { contract } = await seedContractWithInvoice(base)
    const overdue = await prisma.invoice.create({
      data: {
        contractId: contract.contractId,
        dueDate: dateOnly('2020-01-31'),
        rentAmount: 500,
        status: INVOICE_STATUS.UNPAID,
      },
    })

    const response = await request(app).get(`/api/invoices/${overdue.invoiceId}`).set(bearer(staffToken))
    expect(response.body.status).toBe(INVOICE_OVERDUE_STATUS)

    // ค่าใน DB ยังเป็นค้างชำระ (คำนวณตอนแสดงผลเท่านั้น)
    const stored = await prisma.invoice.findUniqueOrThrow({ where: { invoiceId: overdue.invoiceId } })
    expect(stored.status).toBe(INVOICE_STATUS.UNPAID)
  })

  it('ลบใบแจ้งหนี้ได้เฉพาะใบที่ยังไม่มีการชำระ', async () => {
    const { invoice, contract } = await seedContractWithInvoice(base)
    const created = await request(app)
      .post('/api/invoices')
      .set(bearer(staffToken))
      .send({ contract_id: String(contract.contractId), due_date: '2099-03-31', rent_amount: '1000', water_amount: '0', electric_amount: '0' })
    expect(created.status).toBe(201)

    const deleted = await request(app)
      .delete(`/api/invoices/${created.body.invoice_id}`)
      .set(bearer(staffToken))
    expect(deleted.status).toBe(204)

    await addPayment(invoice.invoiceId, { amount: 100, status: PAYMENT_STATUS.REJECTED })
    const blocked = await request(app)
      .delete(`/api/invoices/${invoice.invoiceId}`)
      .set(bearer(staffToken))
    expect(blocked.status).toBe(409)
  })

  it('STAFF เพิ่ม/ลบผู้เช่า walk-in ได้ แต่ลบผู้เช่าที่มีการจองไม่ได้', async () => {
    const created = await request(app)
      .post('/api/tenants')
      .set(bearer(staffToken))
      .send({ full_name: 'ผู้เช่า walk-in', id_card_no: '5555555555555', phone: '', email: '' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ full_name: 'ผู้เช่า walk-in', phone: null, email: null })

    const deleted = await request(app)
      .delete(`/api/tenants/${created.body.tenant_id}`)
      .set(bearer(staffToken))
    expect(deleted.status).toBe(204)

    await seedContractWithInvoice(base)
    const blocked = await request(app)
      .delete(`/api/tenants/${base.tenant.tenantId}`)
      .set(bearer(staffToken))
    expect(blocked.status).toBe(409)
  })

  it('ADMIN เพิ่มพนักงานพร้อมบัญชีเข้าสู่ระบบได้ ส่วน STAFF ทำไม่ได้', async () => {
    const forbidden = await request(app)
      .post('/api/staff')
      .set(bearer(staffToken))
      .send({ full_name: 'พนักงานใหม่', position: 'ช่าง' })
    expect(forbidden.status).toBe(403)

    const created = await request(app)
      .post('/api/staff')
      .set(bearer(adminToken))
      .send({ full_name: 'ช่างใหม่', position: 'ช่าง', phone: '0811111111', email: 'new-staff@test.local', password: 'Password@1234' })
    expect(created.status).toBe(201)
    expect(created.body.account.email).toBe('new-staff@test.local')

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'new-staff@test.local', password: 'Password@1234', role: 'STAFF' })
    expect(login.status).toBe(200)
    expect(login.body.user).toMatchObject({ name: 'ช่างใหม่', role: 'STAFF' })

    const deleted = await request(app)
      .delete(`/api/staff/${created.body.staff_id}`)
      .set(bearer(adminToken))
    expect(deleted.status).toBe(204)
    expect(await prisma.account.findUnique({ where: { email: 'new-staff@test.local' } })).toBeNull()
  })
})

describe('login ตามบทบาทและข้อมูลส่วนตัว', () => {
  beforeEach(async () => {
    await seedBase()
  })

  it('คืน { token, user } และปฏิเสธเมื่อเลือกบทบาทไม่ตรงกับบัญชี', async () => {
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'Password@1234', role: 'ADMIN' })
    expect(ok.status).toBe(200)
    expect(ok.body.user).toMatchObject({ name: 'ผู้ดูแลระบบ', role: 'ADMIN' })

    const mismatch = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant@test.local', password: 'Password@1234', role: 'STAFF' })
    expect(mismatch.status).toBe(403)
    expect(mismatch.body.message).toContain('ผู้เช่า')
  })

  it('ผู้เช่าแก้ข้อมูลส่วนตัวได้ และห้ามใช้เลขบัตรซ้ำกับคนอื่น', async () => {
    const token = await loginAs('tenant@test.local')

    const duplicateId = await request(app)
      .patch('/api/auth/me')
      .set(bearer(token))
      .send({ id_card_no: '9876543210987' })
    expect(duplicateId.status).toBe(409)

    const updated = await request(app)
      .patch('/api/auth/me')
      .set(bearer(token))
      .send({ id_card_no: '1231231231231', phone: '0899999999' })
    expect(updated.status).toBe(200)
    expect(updated.body).toMatchObject({ phone: '0899999999' })
  })

  it('validation error คืน path เป็น snake_case', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ full_name: 'ก', id_card_no: '123', email: 'bad', password: 'short' })
    expect(response.status).toBe(400)
    expect(response.body.errors.map((error: { path: string }) => error.path)).toEqual(
      expect.arrayContaining(['full_name', 'id_card_no', 'email', 'password']),
    )
  })
})
