import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

const ROOM_STATUS = ['ว่าง', 'ไม่ว่าง', 'ปิดปรับปรุง']

router.get('/', async (req, res) => {
  const q: any = req.query
  const where: any = {}

  if (q.type_id) where.room_type_id = Number(q.type_id)
  if (q.floor) where.floor = Number(q.floor)
  if (q.status) where.status = q.status

  if (q.max_price) where.monthly_rate = { lte: Number(q.max_price) }

  if (q.q) {
    where.OR = [
      { room_number: { contains: q.q, mode: 'insensitive' } },
      { room_type: { type_name: { contains: q.q, mode: 'insensitive' } } },
    ]
  }

  const rooms = await prisma.room.findMany({
    where: where,
    include: { room_type: true },
    orderBy: [{ floor: 'asc' }, { room_number: 'asc' }],
  })
  res.json(rooms)
})

router.get('/:id', async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { room_id: Number(req.params.id) || 0 },
    include: { room_type: true },
  })
  if (!room) {
    return res.status(404).json({ message: 'ไม่พบห้องพัก' })
  }
  res.json(room)
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const room_number = String(req.body.room_number || '').trim()
  const floor = Number(req.body.floor)
  const room_type_id = Number(req.body.room_type_id)
  const monthly_rate = Number(req.body.monthly_rate)
  const status = req.body.status || 'ว่าง'

  if (room_number === '') {
    return res.status(400).json({ message: 'กรุณากรอกเลขห้อง' })
  }
  if (!Number.isInteger(floor) || floor < 1) {
    return res.status(400).json({ message: 'ชั้นต้องมากกว่า 0' })
  }
  if (req.body.monthly_rate === undefined || isNaN(monthly_rate) || monthly_rate < 0) {
    return res.status(400).json({ message: 'ค่าเช่าไม่ถูกต้อง' })
  }
  if (!ROOM_STATUS.includes(status)) {
    return res.status(400).json({ message: 'สถานะห้องไม่ถูกต้อง' })
  }

  const roomType = await prisma.roomType.findUnique({ where: { room_type_id: room_type_id || 0 } })
  if (!roomType) {
    return res.status(404).json({ message: 'ไม่พบประเภทห้อง' })
  }

  const room = await prisma.room.create({
    data: { room_number, floor, room_type_id, monthly_rate, status },
    include: { room_type: true },
  })
  res.status(201).json(room)
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const room_id = Number(req.params.id) || 0
  const room = await prisma.room.findUnique({ where: { room_id: room_id } })
  if (!room) {
    return res.status(404).json({ message: 'ไม่พบห้องพัก' })
  }

  const data: any = {}

  if (req.body.room_number !== undefined) {
    data.room_number = String(req.body.room_number).trim()
    if (data.room_number === '') {
      return res.status(400).json({ message: 'กรุณากรอกเลขห้อง' })
    }
  }
  if (req.body.floor !== undefined) {
    data.floor = Number(req.body.floor)
    if (!Number.isInteger(data.floor) || data.floor < 1) {
      return res.status(400).json({ message: 'ชั้นต้องมากกว่า 0' })
    }
  }
  if (req.body.monthly_rate !== undefined) {
    data.monthly_rate = Number(req.body.monthly_rate)
    if (isNaN(data.monthly_rate) || data.monthly_rate < 0) {
      return res.status(400).json({ message: 'ค่าเช่าไม่ถูกต้อง' })
    }
  }
  if (req.body.status !== undefined) {
    if (!ROOM_STATUS.includes(req.body.status)) {
      return res.status(400).json({ message: 'สถานะห้องไม่ถูกต้อง' })
    }
    data.status = req.body.status
  }
  if (req.body.room_type_id !== undefined) {
    data.room_type_id = Number(req.body.room_type_id)
    const roomType = await prisma.roomType.findUnique({
      where: { room_type_id: data.room_type_id || 0 },
    })
    if (!roomType) {
      return res.status(404).json({ message: 'ไม่พบประเภทห้อง' })
    }
  }

  const updated = await prisma.room.update({
    where: { room_id: room_id },
    data: data,
    include: { room_type: true },
  })
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const room_id = Number(req.params.id) || 0
  const room = await prisma.room.findUnique({ where: { room_id: room_id } })
  if (!room) {
    return res.status(404).json({ message: 'ไม่พบห้องพัก' })
  }
  await prisma.room.delete({ where: { room_id: room_id } })
  res.status(204).send()
})

export default router
