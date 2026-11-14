import { Router } from 'express'
import { httpError } from '../lib/httpError'
import { prisma } from '../lib/prisma'
import { isDateText, toDate, todayThai } from '../lib/thaiDate'
import { getUser, requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

const bookingInclude = {
  room: true,
  tenant: true,
  contract: { include: { invoices: true } },
}

const ACTIVE_STATUS = ['รอดำเนินการ', 'ยืนยันแล้ว']

async function freeRoomIfNoOtherBooking(tx: any, room: any, booking_id: number) {
  const otherBooking = await tx.booking.findFirst({
    where: {
      room_id: room.room_id,
      booking_id: { not: booking_id },
      status: { in: ACTIVE_STATUS },
    },
  })
  if (!otherBooking && room.status === 'ไม่ว่าง') {
    await tx.room.update({ where: { room_id: room.room_id }, data: { status: 'ว่าง' } })
  }
}

// ใช้ทั้งใน /bookings/:id/confirm และ POST /contracts
export async function confirmBooking(booking_id: number, body: any) {
  if (!isDateText(body.start_date) || !isDateText(body.end_date)) {
    throw httpError(400, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')
  }
  if (body.end_date <= body.start_date) {
    throw httpError(400, 'วันสิ้นสุดสัญญาต้องมากกว่าวันเริ่มสัญญา')
  }
  const deposit = Number(body.deposit)
  if (body.deposit === undefined || body.deposit === '' || isNaN(deposit) || deposit < 0) {
    throw httpError(400, 'เงินมัดจำไม่ถูกต้อง')
  }
  if (body.due_date && !isDateText(body.due_date)) {
    throw httpError(400, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { booking_id: booking_id },
      include: { contract: true },
    })
    if (!booking) {
      throw httpError(404, 'ไม่พบการจอง')
    }
    if (booking.contract) {
      throw httpError(409, 'การจองนี้มีสัญญาเช่าแล้ว')
    }
    if (booking.status !== 'รอดำเนินการ') {
      throw httpError(409, 'ยืนยันได้เฉพาะการจองที่รอดำเนินการเท่านั้น')
    }

    const contract = await tx.contract.create({
      data: {
        booking_id: booking_id,
        start_date: toDate(body.start_date),
        end_date: toDate(body.end_date),
        deposit: deposit,
      },
    })
    await tx.invoice.create({
      data: {
        contract_id: contract.contract_id,
        invoice_date: todayThai(),
        due_date: toDate(body.due_date || body.start_date),
        deposit_amount: deposit,
        invoice_type: 'DEPOSIT',
        status: 'ค้างชำระ',
      },
    })
    await tx.booking.update({ where: { booking_id: booking_id }, data: { status: 'ยืนยันแล้ว' } })
    await tx.room.update({ where: { room_id: booking.room_id }, data: { status: 'ไม่ว่าง' } })

    return tx.booking.findUnique({ where: { booking_id: booking_id }, include: bookingInclude })
  })
}

router.get('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const where: any = {}
  if (req.query.status) where.status = String(req.query.status)

  if (user.role === 'TENANT') {
    where.tenant_id = user.tenant_id || -1
  }

  const bookings = await prisma.booking.findMany({
    where: where,
    include: bookingInclude,
    orderBy: { booking_id: 'desc' },
  })
  res.json(bookings)
})

router.post('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const room_id = Number(req.body.room_id)
  const move_in_date = req.body.move_in_date

  const tenant_id = user.role === 'TENANT' ? user.tenant_id : Number(req.body.tenant_id)
  if (!tenant_id) {
    return res.status(400).json({ message: 'กรุณาเลือกผู้เช่า' })
  }
  if (!room_id) {
    return res.status(400).json({ message: 'กรุณาเลือกห้อง' })
  }
  if (!isDateText(move_in_date)) {
    return res.status(400).json({ message: 'กรุณาเลือกวันที่เข้าพัก' })
  }

  const tenant = await prisma.tenant.findUnique({ where: { tenant_id: tenant_id } })
  if (!tenant) {
    return res.status(404).json({ message: 'ไม่พบผู้เช่า' })
  }
  const room = await prisma.room.findUnique({ where: { room_id: room_id } })
  if (!room) {
    return res.status(404).json({ message: 'ไม่พบห้องพัก' })
  }
  if (room.status !== 'ว่าง') {
    return res.status(409).json({ message: 'ห้องนี้ไม่พร้อมให้จองในขณะนี้' })
  }

  const booking = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({
      data: {
        room_id: room_id,
        tenant_id: tenant_id,
        booking_date: todayThai(),
        move_in_date: toDate(move_in_date),
        status: 'รอดำเนินการ',
      },
      include: bookingInclude,
    })
    await tx.room.update({ where: { room_id: room_id }, data: { status: 'ไม่ว่าง' } })
    return newBooking
  })
  res.status(201).json(booking)
})

router.post('/:id/confirm', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const booking = await confirmBooking(Number(req.params.id) || 0, req.body)
  res.json(booking)
})

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const user = getUser(req)
  const booking_id = Number(req.params.id) || 0

  const booking = await prisma.booking.findUnique({
    where: { booking_id: booking_id },
    include: { contract: true, room: true },
  })
  if (!booking) {
    return res.status(404).json({ message: 'ไม่พบการจอง' })
  }
  if (user.role === 'TENANT' && booking.tenant_id !== user.tenant_id) {
    return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้' })
  }
  if (!ACTIVE_STATUS.includes(booking.status)) {
    return res.status(409).json({ message: 'ไม่สามารถยกเลิกการจองนี้ได้' })
  }

  const contract_id = booking.contract ? booking.contract.contract_id : null
  if (contract_id) {
    const approvedCount = await prisma.payment.count({
      where: { invoice: { contract_id: contract_id }, status: 'อนุมัติแล้ว' },
    })
    if (approvedCount > 0) {
      return res.status(409).json({ message: 'ไม่สามารถยกเลิกการจองที่มีการชำระเงินแล้วได้' })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (contract_id) {
      await tx.payment.updateMany({
        where: { invoice: { contract_id: contract_id }, status: 'รอตรวจสอบ' },
        data: { status: 'ปฏิเสธ', note: 'ยกเลิกการจอง' },
      })
      await tx.invoice.updateMany({
        where: { contract_id: contract_id, status: { not: 'ยกเลิก' } },
        data: { status: 'ยกเลิก' },
      })
    }
    const result = await tx.booking.update({
      where: { booking_id: booking_id },
      data: { status: 'ยกเลิก' },
      include: bookingInclude,
    })
    await freeRoomIfNoOtherBooking(tx, booking.room, booking_id)
    return result
  })

  res.json(updated)
})

router.post('/:id/complete', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const booking_id = Number(req.params.id) || 0

  const booking = await prisma.booking.findUnique({
    where: { booking_id: booking_id },
    include: { contract: true },
  })
  if (!booking) {
    return res.status(404).json({ message: 'ไม่พบการจอง' })
  }
  if (booking.status !== 'ยืนยันแล้ว') {
    return res.status(409).json({ message: 'ปิดสัญญาได้เฉพาะการจองที่ยืนยันแล้วเท่านั้น' })
  }
  if (booking.contract) {
    const unpaidCount = await prisma.invoice.count({
      where: {
        contract_id: booking.contract.contract_id,
        status: { notIn: ['ชำระแล้ว', 'ยกเลิก'] },
      },
    })
    if (unpaidCount > 0) {
      return res
        .status(409)
        .json({ message: 'ไม่สามารถปิดสัญญาได้ เนื่องจากยังมีใบแจ้งหนี้ที่ค้างชำระ' })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { booking_id: booking_id },
      data: { status: 'เสร็จสิ้น' },
      include: bookingInclude,
    })
    await tx.room.update({ where: { room_id: booking.room_id }, data: { status: 'ว่าง' } })
    return result
  })

  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const booking_id = Number(req.params.id) || 0

  const booking = await prisma.booking.findUnique({
    where: { booking_id: booking_id },
    include: { contract: true, room: true },
  })
  if (!booking) {
    return res.status(404).json({ message: 'ไม่พบการจอง' })
  }
  if (booking.contract) {
    return res
      .status(409)
      .json({ message: 'ไม่สามารถลบการจองที่มีสัญญาเช่าแล้ว กรุณาใช้การยกเลิกแทน' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.delete({ where: { booking_id: booking_id } })
    if (ACTIVE_STATUS.includes(booking.status)) {
      await freeRoomIfNoOtherBooking(tx, booking.room, booking_id)
    }
  })

  res.status(204).send()
})

export default router
