import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { isDateText, toDate } from '../lib/thaiDate'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

const meterInclude = { room: true }

function checkUnit(value: any) {
  const unit = Number(value)
  return value !== '' && !isNaN(unit) && unit >= 0
}

router.get('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const meters = await prisma.utilityMeter.findMany({
    include: meterInclude,
    orderBy: [{ meter_month: 'desc' }, { meter_id: 'desc' }],
  })
  res.json(meters)
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const room_id = Number(req.body.room_id)
  const water_unit = req.body.water_unit ?? 0
  const electric_unit = req.body.electric_unit ?? 0

  if (!room_id) {
    return res.status(400).json({ message: 'กรุณาเลือกห้อง' })
  }
  if (!isDateText(req.body.meter_month)) {
    return res.status(400).json({ message: 'กรุณาเลือกเดือนที่จด' })
  }
  if (!checkUnit(water_unit) || !checkUnit(electric_unit)) {
    return res.status(400).json({ message: 'หน่วยน้ำ/ไฟต้องเป็นตัวเลขที่ไม่ติดลบ' })
  }

  const room = await prisma.room.findUnique({ where: { room_id: room_id } })
  if (!room) {
    return res.status(404).json({ message: 'ไม่พบห้องพัก' })
  }

  const meter = await prisma.utilityMeter.create({
    data: {
      room_id: room_id,
      meter_month: toDate(req.body.meter_month),
      water_unit: Number(water_unit),
      electric_unit: Number(electric_unit),
    },
    include: meterInclude,
  })
  res.status(201).json(meter)
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const meter_id = Number(req.params.id) || 0
  const meter = await prisma.utilityMeter.findUnique({ where: { meter_id: meter_id } })
  if (!meter) {
    return res.status(404).json({ message: 'ไม่พบมิเตอร์' })
  }

  const data: any = {}
  if (req.body.room_id !== undefined) {
    data.room_id = Number(req.body.room_id)
    const room = await prisma.room.findUnique({ where: { room_id: data.room_id || 0 } })
    if (!room) {
      return res.status(404).json({ message: 'ไม่พบห้องพัก' })
    }
  }
  if (req.body.meter_month !== undefined) {
    if (!isDateText(req.body.meter_month)) {
      return res.status(400).json({ message: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' })
    }
    data.meter_month = toDate(req.body.meter_month)
  }
  if (req.body.water_unit !== undefined) {
    if (!checkUnit(req.body.water_unit)) {
      return res.status(400).json({ message: 'หน่วยน้ำต้องเป็นตัวเลขที่ไม่ติดลบ' })
    }
    data.water_unit = Number(req.body.water_unit)
  }
  if (req.body.electric_unit !== undefined) {
    if (!checkUnit(req.body.electric_unit)) {
      return res.status(400).json({ message: 'หน่วยไฟต้องเป็นตัวเลขที่ไม่ติดลบ' })
    }
    data.electric_unit = Number(req.body.electric_unit)
  }

  const updated = await prisma.utilityMeter.update({
    where: { meter_id: meter_id },
    data: data,
    include: meterInclude,
  })
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const meter_id = Number(req.params.id) || 0
  const meter = await prisma.utilityMeter.findUnique({
    where: { meter_id: meter_id },
    include: { invoices: true },
  })
  if (!meter) {
    return res.status(404).json({ message: 'ไม่พบมิเตอร์' })
  }
  // FK เป็น SET NULL ถ้าลบไปใบแจ้งหนี้จะเสียข้อมูลอ้างอิง เลยต้องกันไว้เอง
  if (meter.invoices.length > 0) {
    return res.status(409).json({ message: 'ไม่สามารถลบมิเตอร์ที่ออกใบแจ้งหนี้แล้วได้' })
  }
  await prisma.utilityMeter.delete({ where: { meter_id: meter_id } })
  res.status(204).send()
})

export default router
