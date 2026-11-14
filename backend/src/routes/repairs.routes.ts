import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { todayThai } from '../lib/thaiDate'
import { getUser, requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

const REPAIR_STATUS = ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ยกเลิก']
const repairInclude = { room: true, staff: true }

function emptyToUndefined(value: any) {
  if (value === '' || value === null || value === undefined) return undefined
  return value
}

router.get('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const where: any = {}

  if (user.role === 'TENANT') {
    const contracts = await prisma.contract.findMany({
      where: { booking: { tenant_id: user.tenant_id || -1 } },
      include: { booking: true },
    })
    where.room_id = { in: contracts.map((contract) => contract.booking.room_id) }
  }

  const repairs = await prisma.repairRequest.findMany({
    where: where,
    include: repairInclude,
    orderBy: { repair_id: 'desc' },
  })
  res.json(repairs)
})

router.post('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const room_id = Number(req.body.room_id)
  const description = String(req.body.description || '').trim()
  const staffValue = emptyToUndefined(req.body.staff_id)
  const status = emptyToUndefined(req.body.status)

  if (!room_id) {
    return res.status(400).json({ message: 'กรุณาเลือกห้อง' })
  }
  if (description.length < 5) {
    return res.status(400).json({ message: 'กรุณาอธิบายอาการอย่างน้อย 5 ตัวอักษร' })
  }
  if (status !== undefined && !REPAIR_STATUS.includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' })
  }

  if (user.role === 'TENANT') {
    if (!user.tenant_id) {
      return res.status(403).json({ message: 'ไม่พบข้อมูลผู้เช่าสำหรับบัญชีนี้' })
    }
    if (staffValue !== undefined || status !== undefined) {
      return res
        .status(403)
        .json({ message: 'ผู้เช่าไม่สามารถกำหนดผู้รับผิดชอบหรือสถานะงานซ่อมได้' })
    }
    const contract = await prisma.contract.findFirst({
      where: {
        booking: { tenant_id: user.tenant_id, room_id: room_id, status: 'ยืนยันแล้ว' },
        end_date: { gte: todayThai() },
      },
    })
    if (!contract) {
      return res.status(403).json({ message: 'คุณไม่มีสัญญาเช่าที่ใช้งานอยู่สำหรับห้องนี้' })
    }
  } else {
    const room = await prisma.room.findUnique({ where: { room_id: room_id } })
    if (!room) {
      return res.status(404).json({ message: 'ไม่พบห้องพัก' })
    }
    if (staffValue !== undefined) {
      if (user.role === 'STAFF' && Number(staffValue) !== user.staff_id) {
        return res.status(403).json({ message: 'พนักงานสามารถมอบหมายงานให้ตนเองได้เท่านั้น' })
      }
      const staff = await prisma.staff.findUnique({ where: { staff_id: Number(staffValue) || 0 } })
      if (!staff) {
        return res.status(404).json({ message: 'ไม่พบพนักงาน' })
      }
    }
  }

  const repair = await prisma.repairRequest.create({
    data: {
      room_id: room_id,
      request_date: todayThai(),
      description: description,
      status: status || 'รอดำเนินการ',
      staff_id: staffValue !== undefined ? Number(staffValue) : null,
    },
    include: repairInclude,
  })
  res.status(201).json(repair)
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const user = getUser(req)
  const repair_id = Number(req.params.id) || 0
  const repair = await prisma.repairRequest.findUnique({ where: { repair_id: repair_id } })
  if (!repair) {
    return res.status(404).json({ message: 'ไม่พบรายการแจ้งซ่อม' })
  }

  const data: any = {}

  if (req.body.status !== undefined && req.body.status !== '') {
    if (!REPAIR_STATUS.includes(req.body.status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' })
    }
    data.status = req.body.status
  }

  // staff_id: ส่ง "" หรือ null มา = เอาผู้รับผิดชอบออก
  if (req.body.staff_id !== undefined) {
    data.staff_id =
      req.body.staff_id === '' || req.body.staff_id === null ? null : Number(req.body.staff_id)
  }

  if (user.role === 'STAFF') {
    if (repair.staff_id && repair.staff_id !== user.staff_id) {
      return res.status(403).json({ message: 'งานนี้ถูกมอบหมายให้พนักงานคนอื่นแล้ว' })
    }
    if (data.staff_id !== undefined && data.staff_id !== null && data.staff_id !== user.staff_id) {
      return res.status(403).json({ message: 'พนักงานสามารถมอบหมายงานให้ตนเองได้เท่านั้น' })
    }
  }

  if (data.staff_id) {
    const staff = await prisma.staff.findUnique({ where: { staff_id: data.staff_id } })
    if (!staff) {
      return res.status(404).json({ message: 'ไม่พบพนักงาน' })
    }
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' })
  }

  const updated = await prisma.repairRequest.update({
    where: { repair_id: repair_id },
    data: data,
    include: repairInclude,
  })
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const repair_id = Number(req.params.id) || 0
  const repair = await prisma.repairRequest.findUnique({ where: { repair_id: repair_id } })
  if (!repair) {
    return res.status(404).json({ message: 'ไม่พบรายการแจ้งซ่อม' })
  }
  await prisma.repairRequest.delete({ where: { repair_id: repair_id } })
  res.status(204).send()
})

export default router
