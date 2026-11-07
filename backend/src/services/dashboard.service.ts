import { env } from '../config/env'
import { INVOICE_STATUS, PAYMENT_STATUS, REPAIR_STATUS } from '../constants'
import { prisma } from '../lib/prisma'
import { invoiceAmounts, invoiceDisplayStatus } from '../lib/serializers'
import { monthStartInTimeZone } from '../lib/time'

type RevenueRow = {
  month: Date
  total: string
}

export async function getDashboardSummary() {
  const now = new Date()
  const monthStart = monthStartInTimeZone(now, env.APP_TIMEZONE)

  const [
    roomGroups,
    tenantCount,
    bookingGroups,
    openInvoices,
    repairGroups,
    revenueThisMonth,
    revenueRows,
    recentBookings,
    recentInvoices,
    recentRepairs,
    roomTypes,
  ] = await Promise.all([
    prisma.room.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.tenant.count(),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.invoice.findMany({
      where: {
        status: {
          in: [
            INVOICE_STATUS.UNPAID,
            INVOICE_STATUS.PENDING_REVIEW,
            INVOICE_STATUS.PARTIAL,
          ],
        },
      },
      include: { payments: true },
    }),
    prisma.repairRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: monthStart },
        status: PAYMENT_STATUS.APPROVED,
      },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<RevenueRow[]>`
      SELECT date_trunc('month', payment_date)::date AS month, SUM(amount)::text AS total
      FROM payment
      WHERE payment_date >= (
        date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE ${env.APP_TIMEZONE}))::date
        - interval '5 months'
      )
        AND status = ${PAYMENT_STATUS.APPROVED}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.booking.findMany({
      take: 5,
      orderBy: { bookingId: 'desc' },
      include: {
        tenant: true,
        room: { include: { roomType: true } },
        contract: { include: { invoices: true } },
      },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { invoiceId: 'desc' },
      include: {
        payments: true,
        contract: { include: { booking: { include: { tenant: true, room: true } } } },
      },
    }),
    prisma.repairRequest.findMany({
      take: 5,
      orderBy: { repairId: 'desc' },
      include: { room: true, staff: true },
    }),
    prisma.roomType.findMany({ include: { _count: { select: { rooms: true } } } }),
  ])

  const roomStatus = Object.fromEntries(
    roomGroups.map((group) => [group.status, group._count._all]),
  )
  const bookingStatus = Object.fromEntries(
    bookingGroups.map((group) => [group.status, group._count._all]),
  )
  const repairStatus = Object.fromEntries(
    repairGroups.map((group) => [group.status, group._count._all]),
  )

  const outstandingAmount = openInvoices.reduce(
    (sum, invoice) => sum + invoiceAmounts(invoice).balance,
    0,
  )

  return {
    rooms: {
      total: roomGroups.reduce((sum, group) => sum + group._count._all, 0),
      available: roomStatus['ว่าง'] ?? 0,
      occupied: roomStatus['ไม่ว่าง'] ?? 0,
      maintenance: roomStatus['ปิดปรับปรุง'] ?? 0,
    },
    tenants: tenantCount,
    bookings: {
      total: bookingGroups.reduce((sum, group) => sum + group._count._all, 0),
      pending: bookingStatus['รอดำเนินการ'] ?? 0,
      confirmed: bookingStatus['ยืนยันแล้ว'] ?? 0,
      cancelled: bookingStatus['ยกเลิก'] ?? 0,
      completed: bookingStatus['เสร็จสิ้น'] ?? 0,
    },
    repairs: {
      total: repairGroups.reduce((sum, group) => sum + group._count._all, 0),
      pending: repairStatus[REPAIR_STATUS.PENDING] ?? 0,
      inProgress: repairStatus[REPAIR_STATUS.IN_PROGRESS] ?? 0,
      completed: repairStatus[REPAIR_STATUS.COMPLETED] ?? 0,
    },
    finance: {
      outstandingAmount: Number(outstandingAmount.toFixed(2)),
      paidThisMonth: Number(revenueThisMonth._sum.amount ?? 0),
      revenueByMonth: revenueRows.map((row) => ({
        month: row.month,
        total: Number(row.total),
      })),
    },
    roomTypes: roomTypes.map((roomType) => ({
      roomTypeId: roomType.roomTypeId,
      typeName: roomType.typeName,
      basePrice: roomType.basePrice,
      roomCount: roomType._count.rooms,
    })),
    recentBookings,
    recentInvoices: recentInvoices.map((invoice) => ({
      ...invoice,
      ...invoiceAmounts(invoice),
      status: invoiceDisplayStatus(invoice),
    })),
    recentRepairs,
  }
}
