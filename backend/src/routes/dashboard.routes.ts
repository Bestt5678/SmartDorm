import { Router } from 'express'
import { calcInvoice } from '../lib/calcInvoice'
import { prisma } from '../lib/prisma'
import { monthStartThai } from '../lib/thaiDate'
import { requireAuth, requireRole } from '../middleware/requireAuth'

const router = Router()

function countByStatus(list: any[]) {
  const result: any = {}
  for (const item of list) {
    result[item.status] = (result[item.status] || 0) + 1
  }
  return result
}

router.get('/summary', requireAuth, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const rooms = await prisma.room.findMany({ select: { status: true } })
  const bookings = await prisma.booking.findMany({ select: { status: true } })
  const repairs = await prisma.repairRequest.findMany({ select: { status: true } })
  const tenantCount = await prisma.tenant.count()

  const roomCount = countByStatus(rooms)
  const bookingCount = countByStatus(bookings)
  const repairCount = countByStatus(repairs)

  const openInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['ค้างชำระ', 'รอตรวจสอบ', 'ชำระบางส่วน'] } },
    include: { payments: true },
  })
  let outstanding = 0
  for (const invoice of openInvoices) {
    outstanding += calcInvoice(invoice).balance
  }

  const thisMonth = await prisma.payment.aggregate({
    where: { payment_date: { gte: monthStartThai() }, status: 'อนุมัติแล้ว' },
    _sum: { amount: true },
  })

  const revenueRows: any[] = await prisma.$queryRaw`
    SELECT date_trunc('month', payment_date)::date AS month, SUM(amount)::text AS total
    FROM payment
    WHERE payment_date >= (date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'))::date - interval '5 months')
      AND status = 'อนุมัติแล้ว'
    GROUP BY 1
    ORDER BY 1
  `

  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { booking_id: 'desc' },
    include: { tenant: true, room: true },
  })
  const recentInvoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { invoice_id: 'desc' },
    include: { payments: true },
  })
  const recentRepairs = await prisma.repairRequest.findMany({
    take: 5,
    orderBy: { repair_id: 'desc' },
    include: { room: true, staff: true },
  })

  res.json({
    rooms: {
      total: rooms.length,
      available: roomCount['ว่าง'] || 0,
      occupied: roomCount['ไม่ว่าง'] || 0,
      maintenance: roomCount['ปิดปรับปรุง'] || 0,
    },
    tenants: tenantCount,
    bookings: {
      total: bookings.length,
      pending: bookingCount['รอดำเนินการ'] || 0,
      confirmed: bookingCount['ยืนยันแล้ว'] || 0,
      cancelled: bookingCount['ยกเลิก'] || 0,
      completed: bookingCount['เสร็จสิ้น'] || 0,
    },
    repairs: {
      total: repairs.length,
      pending: repairCount['รอดำเนินการ'] || 0,
      in_progress: repairCount['กำลังดำเนินการ'] || 0,
      completed: repairCount['เสร็จสิ้น'] || 0,
    },
    finance: {
      outstanding_amount: Number(outstanding.toFixed(2)),
      paid_this_month: Number(thisMonth._sum.amount || 0),
      revenue_by_month: revenueRows.map((row) => ({ month: row.month, total: Number(row.total) })),
    },
    recent_bookings: recentBookings,
    recent_invoices: recentInvoices.map(calcInvoice),
    recent_repairs: recentRepairs,
  })
})

export default router
