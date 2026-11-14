import { Router } from 'express'
import { env } from '../config/env'
import { httpError } from '../lib/httpError'
import { calcInvoice } from '../lib/calcInvoice'
import { prisma } from '../lib/prisma'
import { isDateText, toDate, todayThai } from '../lib/thaiDate'
import { slipUpload } from '../lib/slipUpload'
import { getUser, requireAuth, requireRole } from '../middleware/requireAuth'
import { createPayment, invoiceInclude } from './payments.routes'

const router = Router()

const INVOICE_TYPES = ['RENT', 'DEPOSIT', 'UTILITY', 'OTHER']
const AMOUNT_FIELDS = ['rent_amount', 'water_amount', 'electric_amount', 'deposit_amount']

function checkAmounts(body: any) {
  for (const field of AMOUNT_FIELDS) {
    if (body[field] !== undefined) {
      const value = Number(body[field])
      if (body[field] === '' || isNaN(value) || value < 0) {
        return 'จำนวนเงินต้องไม่ติดลบ'
      }
    }
  }
  return null
}

router.get('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const where: any = {}
  if (user.role === 'TENANT') {
    where.contract = { booking: { tenant_id: user.tenant_id || -1 } }
  }

  const invoices = await prisma.invoice.findMany({
    where: where,
    include: invoiceInclude,
    orderBy: [{ invoice_date: 'desc' }, { invoice_id: 'desc' }],
  })
  res.json(invoices.map(calcInvoice))
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const contract_id = Number(req.body.contract_id)
  const meter_id = req.body.meter_id ? Number(req.body.meter_id) : null
  const invoice_type = req.body.invoice_type || 'RENT'

  if (!contract_id) {
    return res.status(400).json({ message: 'กรุณาเลือกสัญญา' })
  }
  if (!isDateText(req.body.due_date)) {
    return res.status(400).json({ message: 'กรุณาเลือกวันครบกำหนด' })
  }
  if (!INVOICE_TYPES.includes(invoice_type)) {
    return res.status(400).json({ message: 'ประเภทใบแจ้งหนี้ไม่ถูกต้อง' })
  }
  const amountError = checkAmounts(req.body)
  if (amountError) {
    return res.status(400).json({ message: amountError })
  }

  const contract = await prisma.contract.findUnique({
    where: { contract_id: contract_id },
    include: { booking: true },
  })
  if (!contract) {
    return res.status(404).json({ message: 'ไม่พบสัญญาเช่า' })
  }

  let water_amount = Number(req.body.water_amount || 0)
  let electric_amount = Number(req.body.electric_amount || 0)

  if (meter_id) {
    const meter = await prisma.utilityMeter.findUnique({ where: { meter_id: meter_id } })
    if (!meter) {
      return res.status(404).json({ message: 'ไม่พบมิเตอร์' })
    }
    if (meter.room_id !== contract.booking.room_id) {
      return res.status(400).json({ message: 'มิเตอร์นี้ไม่ตรงกับห้องในสัญญาเช่า' })
    }
    const used = await prisma.invoice.findUnique({ where: { meter_id: meter_id } })
    if (used) {
      return res.status(409).json({ message: 'มิเตอร์นี้ถูกออกใบแจ้งหนี้แล้ว' })
    }
    water_amount = Number((Number(meter.water_unit) * env.WATER_RATE).toFixed(2))
    electric_amount = Number((Number(meter.electric_unit) * env.ELECTRIC_RATE).toFixed(2))
  }

  try {
    const invoice = await prisma.invoice.create({
      data: {
        contract_id: contract_id,
        meter_id: meter_id,
        invoice_date: todayThai(),
        due_date: toDate(req.body.due_date),
        rent_amount: Number(req.body.rent_amount || 0),
        water_amount: water_amount,
        electric_amount: electric_amount,
        deposit_amount: Number(req.body.deposit_amount || 0),
        invoice_type: invoice_type,
        status: 'ค้างชำระ',
      },
      include: invoiceInclude,
    })
    res.status(201).json(calcInvoice(invoice))
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'มิเตอร์นี้ถูกออกใบแจ้งหนี้แล้ว' })
    }
    throw err
  }
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const invoice_id = Number(req.params.id) || 0
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoice_id },
    include: { payments: true },
  })
  if (!invoice) {
    return res.status(404).json({ message: 'ไม่พบใบแจ้งหนี้' })
  }
  if (invoice.status === 'ชำระแล้ว' || invoice.status === 'ยกเลิก') {
    return res
      .status(409)
      .json({ message: 'ไม่สามารถแก้ไขใบแจ้งหนี้ที่ชำระครบแล้วหรือถูกยกเลิกได้' })
  }
  const amountError = checkAmounts(req.body)
  if (amountError) {
    return res.status(400).json({ message: amountError })
  }

  const data: any = {}
  for (const field of AMOUNT_FIELDS) {
    if (req.body[field] !== undefined) data[field] = Number(req.body[field])
  }
  const changeAmount = Object.keys(data).length > 0

  if (changeAmount && invoice.payments.some((payment) => payment.status === 'รอตรวจสอบ')) {
    return res
      .status(409)
      .json({ message: 'ไม่สามารถแก้ไขยอดเงินได้ เนื่องจากมีรายการชำระเงินรอตรวจสอบอยู่' })
  }

  if (req.body.due_date !== undefined) {
    if (!isDateText(req.body.due_date)) {
      return res.status(400).json({ message: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' })
    }
    data.due_date = toDate(req.body.due_date)
  }
  if (req.body.invoice_type !== undefined) {
    if (!INVOICE_TYPES.includes(req.body.invoice_type)) {
      return res.status(400).json({ message: 'ประเภทใบแจ้งหนี้ไม่ถูกต้อง' })
    }
    data.invoice_type = req.body.invoice_type
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' })
  }

  const newTotal = calcInvoice({ ...invoice, ...data }).total_amount
  const paid = calcInvoice(invoice).paid_amount
  if (newTotal + 0.005 < paid) {
    return res.status(400).json({ message: 'ยอดรวมใหม่ต้องไม่น้อยกว่ายอดที่ชำระแล้ว' })
  }

  const updated = await prisma.invoice.update({
    where: { invoice_id: invoice_id },
    data: data,
    include: invoiceInclude,
  })
  res.json(calcInvoice(updated))
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const invoice_id = Number(req.params.id) || 0

  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoice_id },
    include: { payments: true },
  })
  if (!invoice) {
    return res.status(404).json({ message: 'ไม่พบใบแจ้งหนี้' })
  }
  if (invoice.payments.length > 0) {
    return res
      .status(409)
      .json({ message: 'ไม่สามารถลบใบแจ้งหนี้ที่มีรายการชำระเงินแล้ว กรุณาใช้การยกเลิกแทน' })
  }
  await prisma.invoice.delete({ where: { invoice_id: invoice_id } })
  res.status(204).send()
})

router.post('/:id/cancel', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const invoice_id = Number(req.params.id) || 0
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoice_id },
    include: { payments: true },
  })
  if (!invoice) {
    return res.status(404).json({ message: 'ไม่พบใบแจ้งหนี้' })
  }
  if (invoice.payments.some((payment) => payment.status !== 'ปฏิเสธ')) {
    return res.status(409).json({
      message: 'ไม่สามารถยกเลิกใบแจ้งหนี้ที่มีรายการชำระเงินรอตรวจสอบหรืออนุมัติแล้วได้',
    })
  }
  const updated = await prisma.invoice.update({
    where: { invoice_id: invoice_id },
    data: { status: 'ยกเลิก' },
    include: invoiceInclude,
  })
  res.json(calcInvoice(updated))
})

router.post('/:id/payments', requireAuth, slipUpload.single('slip'), async (req, res) => {
  const invoice = await createPayment(
    Number(req.params.id) || 0,
    getUser(req),
    req.body,
    req.file?.filename,
  )
  res.status(201).json(invoice)
})

export default router
