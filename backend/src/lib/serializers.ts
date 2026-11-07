import { Prisma } from '../../generated/prisma/client'
import { env } from '../config/env'
import { INVOICE_OVERDUE_STATUS, INVOICE_STATUS, PAYMENT_STATUS } from '../constants'
import { todayInTimeZone } from './time'

export const invoiceInclude = {
  payments: { orderBy: { paymentDate: 'asc' as const } },
  meter: true,
  contract: {
    include: {
      booking: {
        include: {
          tenant: true,
          room: { include: { roomType: true } },
        },
      },
    },
  },
} satisfies Prisma.InvoiceInclude

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>

export function invoiceTotal(invoice: {
  rentAmount: Prisma.Decimal | number | string
  waterAmount: Prisma.Decimal | number | string
  electricAmount: Prisma.Decimal | number | string
  depositAmount: Prisma.Decimal | number | string
}): number {
  return (
    Number(invoice.rentAmount) +
    Number(invoice.waterAmount) +
    Number(invoice.electricAmount) +
    Number(invoice.depositAmount)
  )
}

export function invoiceAmounts(invoice: {
  rentAmount: Prisma.Decimal | number | string
  waterAmount: Prisma.Decimal | number | string
  electricAmount: Prisma.Decimal | number | string
  depositAmount: Prisma.Decimal | number | string
  payments: Array<{ amount: Prisma.Decimal | number | string; status: string }>
}) {
  const total = invoiceTotal(invoice)
  const paid = invoice.payments
    .filter((payment) => payment.status === PAYMENT_STATUS.APPROVED)
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  return {
    totalAmount: Number(total.toFixed(2)),
    paidAmount: Number(paid.toFixed(2)),
    balance: Number(Math.max(total - paid, 0).toFixed(2)),
  }
}

/**
 * สถานะที่แสดงผล: ใบที่ยัง "ค้างชำระ" และเลยวันครบกำหนดแล้วจะแสดงเป็น "เกินกำหนด"
 * (คำนวณตอนอ่าน ไม่เก็บลง DB จึงไม่ต้องมี job มาอัปเดตทุกวัน)
 */
export function invoiceDisplayStatus(invoice: { status: string; dueDate: Date }) {
  if (
    invoice.status === INVOICE_STATUS.UNPAID &&
    invoice.dueDate < todayInTimeZone(new Date(), env.APP_TIMEZONE)
  ) {
    return INVOICE_OVERDUE_STATUS
  }
  return invoice.status
}

export function serializeInvoice(invoice: InvoiceWithRelations) {
  return {
    ...invoice,
    ...invoiceAmounts(invoice),
    status: invoiceDisplayStatus(invoice),
  }
}

export const bookingInclude = {
  room: { include: { roomType: true } },
  tenant: true,
  contract: { include: { invoices: true } },
} satisfies Prisma.BookingInclude

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>
