import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

function toList(value: any): string[] {
  let list: any[] = []
  if (Array.isArray(value)) list = value
  else if (typeof value === 'string') list = value.split(/[,\n]+/)
  return list.map((item) => String(item).trim()).filter((item) => item !== '')
}

function checkRoomType(body: any) {
  if (body.type_name !== undefined && String(body.type_name).trim() === '') {
    return 'กรุณากรอกชื่อประเภทห้อง'
  }
  if (body.base_price !== undefined) {
    const price = Number(body.base_price)
    if (body.base_price === '' || isNaN(price) || price < 0) return 'ราคาไม่ถูกต้อง'
  }
  if (body.image_urls !== undefined) {
    const urls = toList(body.image_urls)
    if (urls.length > 8) return 'ใส่รูปได้ไม่เกิน 8 รูป'
    for (const url of urls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) return 'URL รูปภาพไม่ถูกต้อง'
    }
  }
  if (body.amenities !== undefined && toList(body.amenities).length > 20) {
    return 'ใส่สิ่งอำนวยความสะดวกได้ไม่เกิน 20 รายการ'
  }
  return null
}

router.get('/', async (req, res) => {
  const roomTypes = await prisma.roomType.findMany({ orderBy: { base_price: 'asc' } })
  res.json(roomTypes)
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  if (!req.body.type_name || req.body.base_price === undefined) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อประเภทและราคา' })
  }
  const error = checkRoomType(req.body)
  if (error) {
    return res.status(400).json({ message: error })
  }

  const roomType = await prisma.roomType.create({
    data: {
      type_name: String(req.body.type_name).trim(),
      base_price: Number(req.body.base_price),
      description: req.body.description || null,
      image_urls: toList(req.body.image_urls),
      amenities: toList(req.body.amenities),
    },
  })
  res.status(201).json(roomType)
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const room_type_id = Number(req.params.id) || 0
  const roomType = await prisma.roomType.findUnique({ where: { room_type_id: room_type_id } })
  if (!roomType) {
    return res.status(404).json({ message: 'ไม่พบประเภทห้อง' })
  }
  const error = checkRoomType(req.body)
  if (error) {
    return res.status(400).json({ message: error })
  }

  const data: any = {}
  if (req.body.type_name !== undefined) data.type_name = String(req.body.type_name).trim()
  if (req.body.base_price !== undefined) data.base_price = Number(req.body.base_price)
  if (req.body.description !== undefined) data.description = req.body.description || null
  if (req.body.image_urls !== undefined) data.image_urls = toList(req.body.image_urls)
  if (req.body.amenities !== undefined) data.amenities = toList(req.body.amenities)

  const updated = await prisma.roomType.update({
    where: { room_type_id: room_type_id },
    data: data,
  })
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const room_type_id = Number(req.params.id) || 0
  const count = await prisma.room.count({ where: { room_type_id: room_type_id } })
  if (count > 0) {
    return res.status(409).json({ message: 'ไม่สามารถลบประเภทห้องที่มีห้องพักอยู่ได้' })
  }
  await prisma.roomType.delete({ where: { room_type_id: room_type_id } })
  res.status(204).send()
})

export default router
