import { Prisma } from '../../generated/prisma/client'
import { AppError } from './http'

export async function lockBookingForUpdate(
  tx: Prisma.TransactionClient,
  bookingId: number,
) {
  const rows = await tx.$queryRaw<Array<{ booking_id: number }>>`
    SELECT booking_id FROM booking WHERE booking_id = ${bookingId} FOR UPDATE
  `
  if (rows.length === 0) {
    throw new AppError(404, 'ไม่พบการจอง')
  }
}

export async function lockInvoiceForUpdate(
  tx: Prisma.TransactionClient,
  invoiceId: number,
) {
  const rows = await tx.$queryRaw<Array<{ invoice_id: number }>>`
    SELECT invoice_id FROM invoice WHERE invoice_id = ${invoiceId} FOR UPDATE
  `
  if (rows.length === 0) {
    throw new AppError(404, 'ไม่พบใบแจ้งหนี้')
  }
}

export async function lockPaymentForUpdate(
  tx: Prisma.TransactionClient,
  paymentId: number,
) {
  const rows = await tx.$queryRaw<Array<{ payment_id: number }>>`
    SELECT payment_id FROM payment WHERE payment_id = ${paymentId} FOR UPDATE
  `
  if (rows.length === 0) {
    throw new AppError(404, 'ไม่พบรายการชำระเงิน')
  }
}
