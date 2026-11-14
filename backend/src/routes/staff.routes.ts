import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

router.get('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const staff = await prisma.staff.findMany({
    include: { account: { select: { email: true } } },
    orderBy: { full_name: 'asc' },
  })
  res.json(staff)
})

router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const full_name = String(req.body.full_name || '').trim()
  const position = String(req.body.position || '').trim()
  const phone = String(req.body.phone || '').trim()
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password || '')

  if (full_name.length < 2) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อ-นามสกุล' })
  }
  if (position === '') {
    return res.status(400).json({ message: 'กรุณากรอกตำแหน่ง' })
  }
  if (phone !== '' && !/^\d{9,10}$/.test(phone)) {
    return res.status(400).json({ message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก' })
  }
  if ((email === '') !== (password === '')) {
    return res.status(400).json({ message: 'ต้องกรอกทั้งอีเมลและรหัสผ่าน หรือเว้นว่างทั้งคู่' })
  }
  if (email !== '' && !email.includes('@')) {
    return res.status(400).json({ message: 'อีเมลไม่ถูกต้อง' })
  }
  if (password !== '' && password.length < 8) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  }

  const data: any = { full_name, position, phone: phone || null }

  if (email !== '') {
    const oldAccount = await prisma.account.findUnique({ where: { email: email } })
    if (oldAccount) {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' })
    }
    const password_hash = await bcrypt.hash(password, 10)
    data.account = { create: { email, password_hash, role: 'STAFF' } }
  }

  const staff = await prisma.staff.create({
    data: data,
    include: { account: { select: { email: true } } },
  })
  res.status(201).json(staff)
})

router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const staff_id = Number(req.params.id) || 0
  const staff = await prisma.staff.findUnique({ where: { staff_id: staff_id } })
  if (!staff) {
    return res.status(404).json({ message: 'ไม่พบพนักงาน' })
  }

  const data: any = {}
  if (req.body.full_name !== undefined) {
    data.full_name = String(req.body.full_name).trim()
    if (data.full_name.length < 2) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ-นามสกุล' })
    }
  }
  if (req.body.position !== undefined) {
    data.position = String(req.body.position).trim()
    if (data.position === '') {
      return res.status(400).json({ message: 'กรุณากรอกตำแหน่ง' })
    }
  }
  if (req.body.phone !== undefined) {
    const phone = String(req.body.phone).trim()
    if (phone !== '' && !/^\d{9,10}$/.test(phone)) {
      return res.status(400).json({ message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก' })
    }
    data.phone = phone || null
  }

  const updated = await prisma.staff.update({
    where: { staff_id: staff_id },
    data: data,
    include: { account: { select: { email: true } } },
  })
  res.json(updated)
})

// ลบพนักงานพร้อมบัญชี งานซ่อมที่เคยรับไว้จะกลับเป็น "ยังไม่มีผู้รับผิดชอบ"
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const staff_id = Number(req.params.id) || 0
  const staff = await prisma.staff.findUnique({ where: { staff_id: staff_id } })
  if (!staff) {
    return res.status(404).json({ message: 'ไม่พบพนักงาน' })
  }
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { staff_id: staff_id } }),
    prisma.staff.delete({ where: { staff_id: staff_id } }),
  ])
  res.status(204).send()
})

export default router
