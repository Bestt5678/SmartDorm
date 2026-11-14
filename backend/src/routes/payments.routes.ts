import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { httpError } from '../lib/httpError'
import { calcInvoice } from '../lib/calcInvoice'
import { prisma } from '../lib/prisma'
import { isDateText, toDate, todayThai } from '../lib/thaiDate'
import { uploadDir } from '../lib/slipUpload'
import { getUser, requireAuth, requireRole } from '../middleware/requireAuth'
import { TokenData } from '../lib/token'

const router = Router()

const PAYMENT_TYPES = ['เงินสด', 'โอนเงิน', 'บัตรเครดิต', 'พร้อมเพย์']

export const invoiceInclude = {
  payments: { orderBy: { payment_date: 'asc' as const } },
  meter: true,
  contract: { include: { booking: { include: { tenant: true, room: true } } } },
}

function invoiceTotal(invoice: any) {
  return (
    Number(invoice.rent_amount) +
    Number(invoice.water_amount) +
    Number(invoice.electric_amount) +
    Number(invoice.deposit_amount)
  )
}

function approvedSum(payments: any[]) {
  let sum = 0
  for (const payment of payments) {
    if (payment.status === 'อนุมัติแล้ว') sum += Number(payment.amount)
  }
  return sum
}

async function updateInvoiceStatus(tx: any, invoice_id: number) {
  const invoice = await tx.invoice.findUnique({
    where: { invoice_id: invoice_id },
    include: { payments: true },
  })

  if (invoice.status !== 'ยกเลิก') {
    const total = invoiceTotal(invoice)
    const approved = approvedSum(invoice.payments)
    const pending = invoice.payments.filter((payment: any) => payment.status === 'รอตรวจสอบ').length

    let status = 'ค้างชำระ'
    if (total > 0 && approved + 0.005 >= total) status = 'ชำระแล้ว'
    else if (pending > 0) status = 'รอตรวจสอบ'
    else if (approved > 0) status = 'ชำระบางส่วน'

    await tx.invoice.update({ where: { invoice_id: invoice_id }, data: { status: status } })
  }

  return tx.invoice.findUnique({ where: { invoice_id: invoice_id }, include: invoiceInclude })
}

// ผู้เช่าส่งสลิป (รอตรวจสอบ) หรือพนักงานบันทึกรับเงิน (อนุมัติทันที)
export async function createPayment(
  invoice_id: number,
  user: TokenData,
  body: any,
  slipFile?: string,
) {
  const amount = Number(body.amount)
  if (body.amount === undefined || body.amount === '' || isNaN(amount) || amount <= 0) {
    throw httpError(400, 'ยอดชำระต้องมากกว่า 0')
  }
  if (!PAYMENT_TYPES.includes(body.payment_type)) {
    throw httpError(400, 'กรุณาเลือกช่องทางชำระ')
  }
  if (body.payment_date && !isDateText(body.payment_date)) {
    throw httpError(400, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')
  }

  const isTenant = user.role === 'TENANT'

  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoice_id },
    include: invoiceInclude,
  })
  if (!invoice) {
    throw httpError(404, 'ไม่พบใบแจ้งหนี้')
  }
  if (isTenant && invoice.contract.booking.tenant_id !== user.tenant_id) {
    throw httpError(403, 'คุณไม่มีสิทธิ์ชำระใบแจ้งหนี้ใบนี้')
  }
  if (invoice.status === 'ชำระแล้ว') {
    throw httpError(409, 'ใบแจ้งหนี้นี้ชำระครบแล้ว')
  }
  if (invoice.status === 'ยกเลิก') {
    throw httpError(409, 'ใบแจ้งหนี้นี้ถูกยกเลิกแล้ว')
  }
  if (isTenant && invoice.payments.some((payment) => payment.status === 'รอตรวจสอบ')) {
    throw httpError(409, 'มีรายการชำระเงินรอตรวจสอบอยู่แล้ว')
  }
  if (isTenant && !slipFile) {
    throw httpError(400, 'กรุณาแนบสลิปการโอนเงิน')
  }
  const balance = invoiceTotal(invoice) - approvedSum(invoice.payments)
  if (amount > balance + 0.005) {
    throw httpError(400, `ยอดชำระเกินยอดคงเหลือ (คงเหลือ ${balance.toFixed(2)} บาท)`)
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoice_id: invoice_id,
        amount: amount,
        payment_type: body.payment_type,
        status: isTenant ? 'รอตรวจสอบ' : 'อนุมัติแล้ว',
        slip_url: slipFile || null,
        verified_by_account_id: isTenant ? null : user.account_id,
        verified_at: isTenant ? null : new Date(),
        payment_date: body.payment_date ? toDate(body.payment_date) : todayThai(),
      },
    })

    return updateInvoiceStatus(tx, invoice_id)
  })

  return calcInvoice(updated)
}

router.get('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const where: any = {}
  if (user.role === 'TENANT') {
    where.invoice = { contract: { booking: { tenant_id: user.tenant_id || -1 } } }
  }

  const payments = await prisma.payment.findMany({
    where: where,
    include: {
      invoice: {
        include: { contract: { include: { booking: { include: { room: true, tenant: true } } } } },
      },
    },
    orderBy: [{ payment_date: 'desc' }, { payment_id: 'desc' }],
  })
  res.json(payments)
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const invoice_id = Number(req.body.invoice_id)
  if (!invoice_id) {
    return res.status(400).json({ message: 'กรุณาเลือกใบแจ้งหนี้' })
  }
  const invoice = await createPayment(invoice_id, getUser(req), req.body)
  res.status(201).json(invoice)
})

router.post('/:id/approve', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const user = getUser(req)
  const payment_id = Number(req.params.id) || 0

  const payment = await prisma.payment.findUnique({
    where: { payment_id: payment_id },
    include: { invoice: { include: { payments: true } } },
  })
  if (!payment) {
    return res.status(404).json({ message: 'ไม่พบรายการชำระเงิน' })
  }
  if (payment.status !== 'รอตรวจสอบ') {
    return res.status(409).json({ message: 'รายการนี้ได้รับการตรวจสอบแล้ว' })
  }
  if (payment.invoice.status === 'ยกเลิก') {
    return res.status(409).json({ message: 'ใบแจ้งหนี้ถูกยกเลิกแล้ว' })
  }
  const otherPayments = payment.invoice.payments.filter((item) => item.payment_id !== payment_id)
  const balance = invoiceTotal(payment.invoice) - approvedSum(otherPayments)
  if (Number(payment.amount) > balance + 0.005) {
    return res
      .status(400)
      .json({ message: `ยอดชำระเกินยอดคงเหลือ (คงเหลือ ${balance.toFixed(2)} บาท)` })
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { payment_id: payment_id },
      data: {
        status: 'อนุมัติแล้ว',
        verified_by_account_id: user.account_id,
        verified_at: new Date(),
      },
    })
    return updateInvoiceStatus(tx, payment.invoice_id)
  })

  res.json(calcInvoice(invoice))
})

router.post('/:id/reject', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const user = getUser(req)
  const payment_id = Number(req.params.id) || 0
  const note = String(req.body.note || '').trim()
  if (note.length > 500) {
    return res.status(400).json({ message: 'เหตุผลยาวเกิน 500 ตัวอักษร' })
  }

  const payment = await prisma.payment.findUnique({ where: { payment_id: payment_id } })
  if (!payment) {
    return res.status(404).json({ message: 'ไม่พบรายการชำระเงิน' })
  }
  if (payment.status !== 'รอตรวจสอบ') {
    return res.status(409).json({ message: 'รายการนี้ได้รับการตรวจสอบแล้ว' })
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { payment_id: payment_id },
      data: {
        status: 'ปฏิเสธ',
        note: note || null,
        verified_by_account_id: user.account_id,
        verified_at: new Date(),
      },
    })
    return updateInvoiceStatus(tx, payment.invoice_id)
  })

  res.json(calcInvoice(invoice))
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const payment_id = Number(req.params.id) || 0

  const payment = await prisma.payment.findUnique({
    where: { payment_id: payment_id },
    include: { invoice: true },
  })
  if (!payment) {
    return res.status(404).json({ message: 'ไม่พบรายการชำระเงิน' })
  }
  if (payment.invoice.status === 'ยกเลิก') {
    return res.status(409).json({ message: 'ใบแจ้งหนี้ถูกยกเลิกแล้ว ไม่สามารถลบรายการชำระเงินได้' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { payment_id: payment_id } })
    await updateInvoiceStatus(tx, payment.invoice_id)
  })

  if (payment.slip_url) {
    fs.rmSync(path.join(uploadDir, path.basename(payment.slip_url)), { force: true })
  }
  res.status(204).send()
})

router.get('/:id/slip', requireAuth, async (req, res) => {
  const user = getUser(req)
  const payment = await prisma.payment.findUnique({
    where: { payment_id: Number(req.params.id) || 0 },
    include: { invoice: { include: { contract: { include: { booking: true } } } } },
  })
  if (!payment) {
    return res.status(404).json({ message: 'ไม่พบรายการชำระเงิน' })
  }
  if (user.role === 'TENANT' && payment.invoice.contract.booking.tenant_id !== user.tenant_id) {
    return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ดูสลิปนี้' })
  }
  if (!payment.slip_url) {
    return res.status(404).json({ message: 'ไม่พบไฟล์สลิป' })
  }

  res.sendFile(path.join(uploadDir, path.basename(payment.slip_url)), (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ message: 'ไม่พบไฟล์สลิป' })
    }
  })
})

export default router
