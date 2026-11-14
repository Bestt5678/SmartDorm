import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

function checkTenant(body: any, isNew: boolean) {
  if (isNew || body.full_name !== undefined) {
    if (String(body.full_name || '').trim().length < 2) return 'กรุณากรอกชื่อ-นามสกุล'
  }
  if (isNew || body.id_card_no !== undefined) {
    if (!/^\d{13}$/.test(String(body.id_card_no || '')))
      return 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'
  }
  if (body.phone && !/^\d{9,10}$/.test(String(body.phone).trim())) {
    return 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
  }
  if (body.email && !String(body.email).includes('@')) {
    return 'อีเมลไม่ถูกต้อง'
  }
  return null
}

router.get('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { account: { select: { email: true } } },
    orderBy: { tenant_id: 'desc' },
  })
  res.json(tenants)
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const error = checkTenant(req.body, true)
  if (error) {
    return res.status(400).json({ message: error })
  }
  const tenant = await prisma.tenant.create({
    data: {
      full_name: String(req.body.full_name).trim(),
      id_card_no: String(req.body.id_card_no),
      phone: req.body.phone ? String(req.body.phone).trim() : null,
      email: req.body.email ? String(req.body.email).trim().toLowerCase() : null,
    },
  })
  res.status(201).json(tenant)
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const tenant_id = Number(req.params.id) || 0
  const tenant = await prisma.tenant.findUnique({ where: { tenant_id: tenant_id } })
  if (!tenant) {
    return res.status(404).json({ message: 'ไม่พบผู้เช่า' })
  }
  const error = checkTenant(req.body, false)
  if (error) {
    return res.status(400).json({ message: error })
  }

  const data: any = {}
  if (req.body.full_name !== undefined) data.full_name = String(req.body.full_name).trim()
  if (req.body.id_card_no !== undefined) data.id_card_no = String(req.body.id_card_no)
  if (req.body.phone !== undefined)
    data.phone = req.body.phone ? String(req.body.phone).trim() : null
  if (req.body.email !== undefined)
    data.email = req.body.email ? String(req.body.email).trim().toLowerCase() : null

  const updated = await prisma.tenant.update({ where: { tenant_id: tenant_id }, data: data })
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const tenant_id = Number(req.params.id) || 0
  const tenant = await prisma.tenant.findUnique({
    where: { tenant_id: tenant_id },
    include: { _count: { select: { bookings: true } } },
  })
  if (!tenant) {
    return res.status(404).json({ message: 'ไม่พบผู้เช่า' })
  }
  if (tenant._count.bookings > 0) {
    return res.status(409).json({ message: 'ไม่สามารถลบผู้เช่าที่มีประวัติการจองได้' })
  }
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { tenant_id: tenant_id } }),
    prisma.tenant.delete({ where: { tenant_id: tenant_id } }),
  ])
  res.status(204).send()
})

export default router
