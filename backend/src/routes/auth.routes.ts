import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { createToken } from '../lib/token'
import { prisma } from '../lib/prisma'
import { getUser, requireAuth } from '../middleware/requireAuth'

const router = Router()

const ROLE_NAMES: any = {
  TENANT: 'ผู้เช่า',
  STAFF: 'พนักงาน',
  ADMIN: 'ผู้ดูแล',
}

function userInfo(account: any) {
  let name = account.email
  if (account.tenant) name = account.tenant.full_name
  else if (account.staff) name = account.staff.full_name
  else if (account.role === 'ADMIN') name = 'ผู้ดูแลระบบ'

  return {
    id: account.account_id,
    name: name,
    role: account.role,
    email: account.email,
    tenant_id: account.tenant_id,
    staff_id: account.staff_id,
    phone: account.tenant ? account.tenant.phone : null,
  }
}

function loginResult(account: any) {
  const token = createToken({
    account_id: account.account_id,
    email: account.email,
    role: account.role,
    tenant_id: account.tenant_id,
    staff_id: account.staff_id,
  })
  return { token: token, user: userInfo(account) }
}

router.post('/register', async (req, res) => {
  const full_name = String(req.body.full_name || '').trim()
  const id_card_no = String(req.body.id_card_no || '').trim()
  const phone = String(req.body.phone || '').trim()
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password || '')

  if (full_name.length < 2) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อ-นามสกุล' })
  }
  if (!/^\d{13}$/.test(id_card_no)) {
    return res.status(400).json({ message: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' })
  }
  if (phone !== '' && !/^\d{9,10}$/.test(phone)) {
    return res.status(400).json({ message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก' })
  }
  if (!email.includes('@')) {
    return res.status(400).json({ message: 'อีเมลไม่ถูกต้อง' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  }

  const oldAccount = await prisma.account.findUnique({ where: { email: email } })
  if (oldAccount) {
    return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' })
  }
  const oldTenant = await prisma.tenant.findUnique({ where: { id_card_no: id_card_no } })
  if (oldTenant) {
    return res.status(409).json({ message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว' })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const account = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { full_name, id_card_no, phone: phone || null, email },
    })
    return tx.account.create({
      data: { email, password_hash, role: 'TENANT', tenant_id: tenant.tenant_id },
      include: { tenant: true, staff: true },
    })
  })

  res.status(201).json(loginResult(account))
})

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password || '')
  const role = req.body.role

  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' })
  }

  const account = await prisma.account.findUnique({
    where: { email: email },
    include: { tenant: true, staff: true },
  })
  if (!account) {
    return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }

  const correct = await bcrypt.compare(password, account.password_hash)
  if (!correct) {
    return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }

  if (role && role !== account.role) {
    const roleName = ROLE_NAMES[account.role]
    return res
      .status(403)
      .json({ message: `บัญชีนี้เป็นบัญชี${roleName} กรุณาเลือกแท็บ "${roleName}"` })
  }

  res.json(loginResult(account))
})

router.get('/me', requireAuth, async (req, res) => {
  const user = getUser(req)
  const account = await prisma.account.findUnique({
    where: { account_id: user.account_id },
    include: { tenant: true, staff: true },
  })
  if (!account) {
    return res.status(404).json({ message: 'ไม่พบข้อมูลบัญชี' })
  }
  res.json(userInfo(account))
})

router.patch('/me', requireAuth, async (req, res) => {
  const user = getUser(req)
  if (!user.tenant_id) {
    return res.status(403).json({ message: 'แก้ไขข้อมูลส่วนตัวได้เฉพาะบัญชีผู้เช่า' })
  }

  const data: any = {}

  if (req.body.full_name !== undefined) {
    const full_name = String(req.body.full_name).trim()
    if (full_name.length < 2) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ-นามสกุล' })
    }
    data.full_name = full_name
  }

  if (req.body.id_card_no !== undefined) {
    const id_card_no = String(req.body.id_card_no).trim()
    if (!/^\d{13}$/.test(id_card_no)) {
      return res.status(400).json({ message: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' })
    }
    const owner = await prisma.tenant.findUnique({ where: { id_card_no: id_card_no } })
    if (owner && owner.tenant_id !== user.tenant_id) {
      return res.status(409).json({ message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว' })
    }
    data.id_card_no = id_card_no
  }

  if (req.body.phone !== undefined) {
    const phone = String(req.body.phone).trim()
    if (phone !== '' && !/^\d{9,10}$/.test(phone)) {
      return res.status(400).json({ message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก' })
    }
    data.phone = phone || null
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' })
  }

  await prisma.tenant.update({ where: { tenant_id: user.tenant_id }, data: data })

  const account = await prisma.account.findUnique({
    where: { account_id: user.account_id },
    include: { tenant: true, staff: true },
  })
  res.json(userInfo(account))
})

export default router
