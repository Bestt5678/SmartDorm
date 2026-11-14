import { Router } from 'express'
import { httpError } from '../lib/httpError'
import { calcInvoice } from '../lib/calcInvoice'
import { prisma } from '../lib/prisma'
import { isDateText, toDate } from '../lib/thaiDate'
import { getUser, requireAuth, requireRole } from '../middleware/requireAuth'
import { confirmBooking } from './bookings.routes'

const router = Router()

const contractInclude = {
  booking: { include: { tenant: true, room: true } },
  invoices: {
    include: { payments: { orderBy: { payment_date: 'asc' as const } } },
    orderBy: { invoice_date: 'desc' as const },
  },
}

function withAmounts(contract: any) {
  return { ...contract, invoices: contract.invoices.map(calcInvoice) }
}

router.get('/', requireAuth, async (req, res) => {
  const user = getUser(req)
  const where: any = {}
  if (user.role === 'TENANT') {
    where.booking = { tenant_id: user.tenant_id || -1 }
  }
  const contracts = await prisma.contract.findMany({
    where: where,
    include: contractInclude,
    orderBy: { contract_id: 'desc' },
  })
  res.json(contracts.map(withAmounts))
})

router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const booking_id = Number(req.body.booking_id)
  if (!booking_id) {
    return res.status(400).json({ message: 'กรุณาเลือกการจอง' })
  }
  const booking = await prisma.booking.findUnique({
    where: { booking_id: booking_id },
    include: { contract: true },
  })
  if (!booking) {
    return res.status(404).json({ message: 'ไม่พบการจอง' })
  }
  if (booking.contract) {
    return res.status(409).json({ message: 'การจองนี้มีสัญญาเช่าแล้ว' })
  }

  await confirmBooking(booking_id, req.body)

  const contract = await prisma.contract.findUnique({
    where: { booking_id: booking_id },
    include: contractInclude,
  })
  res.status(201).json(withAmounts(contract))
})

router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const contract_id = Number(req.params.id) || 0
  const contract = await prisma.contract.findUnique({ where: { contract_id: contract_id } })
  if (!contract) {
    return res.status(404).json({ message: 'ไม่พบสัญญาเช่า' })
  }

  const data: any = {}
  if (req.body.start_date !== undefined) {
    if (!isDateText(req.body.start_date)) {
      return res.status(400).json({ message: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' })
    }
    data.start_date = toDate(req.body.start_date)
  }
  if (req.body.end_date !== undefined) {
    if (!isDateText(req.body.end_date)) {
      return res.status(400).json({ message: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' })
    }
    data.end_date = toDate(req.body.end_date)
  }
  if (req.body.deposit !== undefined) {
    data.deposit = Number(req.body.deposit)
    if (req.body.deposit === '' || isNaN(data.deposit) || data.deposit < 0) {
      return res.status(400).json({ message: 'เงินมัดจำไม่ถูกต้อง' })
    }
  }

  const start = data.start_date || contract.start_date
  const end = data.end_date || contract.end_date
  if (end <= start) {
    return res.status(400).json({ message: 'วันสิ้นสุดสัญญาต้องมากกว่าวันเริ่มสัญญา' })
  }

  const updated = await prisma.contract.update({
    where: { contract_id: contract_id },
    data: data,
    include: contractInclude,
  })
  res.json(withAmounts(updated))
})

router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const contract_id = Number(req.params.id) || 0

  const contract = await prisma.contract.findUnique({ where: { contract_id: contract_id } })
  if (!contract) {
    return res.status(404).json({ message: 'ไม่พบสัญญาเช่า' })
  }
  const paymentCount = await prisma.payment.count({
    where: { invoice: { contract_id: contract_id } },
  })
  if (paymentCount > 0) {
    return res
      .status(409)
      .json({ message: 'ไม่สามารถลบสัญญาที่มีรายการชำระเงินแล้ว กรุณาใช้การยกเลิกการจองแทน' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.deleteMany({ where: { contract_id: contract_id } })
    await tx.contract.delete({ where: { contract_id: contract_id } })
    await tx.booking.update({
      where: { booking_id: contract.booking_id },
      data: { status: 'รอดำเนินการ' },
    })
  })

  res.status(204).send()
})

export default router
