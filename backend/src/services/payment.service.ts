import path from 'node:path'
import { Prisma } from '../../generated/prisma/client'
import { removeUploadedFile, uploadDir } from '../lib/upload'
import { limitArgs } from '../schemas/common'
import { INVOICE_STATUS, PAYMENT_STATUS } from '../constants'
import { AppError } from '../lib/http'
import type { AuthPayload } from '../lib/jwt'
import { lockInvoiceForUpdate, lockPaymentForUpdate } from '../lib/locks'
import { prisma } from '../lib/prisma'
import { appToday } from '../lib/time'
import {
  invoiceInclude,
  invoiceTotal,
  serializeInvoice,
} from '../lib/serializers'
import type {
  PaymentCreateInput,
  PaymentListQuery,
  PaymentRejectInput,
} from '../schemas/payment'

type Tx = Prisma.TransactionClient

async function recalculateInvoice(tx: Tx, invoiceId: number) {
  const invoice = await tx.invoice.findUnique({
    where: { invoiceId },
    include: { payments: true },
  })
  if (!invoice) {
    throw new AppError(404, 'ไม่พบใบแจ้งหนี้')
  }

  if (invoice.status !== INVOICE_STATUS.CANCELLED) {
    const total = invoiceTotal(invoice)
    const approved = invoice.payments
      .filter((payment) => payment.status === PAYMENT_STATUS.APPROVED)
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
    const pendingCount = invoice.payments.filter(
      (payment) => payment.status === PAYMENT_STATUS.PENDING,
    ).length

    const status =
      total > 0 && approved + 0.005 >= total
        ? INVOICE_STATUS.PAID
        : pendingCount > 0
          ? INVOICE_STATUS.PENDING_REVIEW
          : approved > 0
            ? INVOICE_STATUS.PARTIAL
            : INVOICE_STATUS.UNPAID

    await tx.invoice.update({ where: { invoiceId }, data: { status } })
  }

  return tx.invoice.findUniqueOrThrow({ where: { invoiceId }, include: invoiceInclude })
}

export async function createPayment(
  invoiceId: number,
  auth: AuthPayload,
  input: PaymentCreateInput,
  slipFileName?: string,
) {
  const updated = await prisma.$transaction(async (tx) => {
    await lockInvoiceForUpdate(tx, invoiceId)

    const invoice = await tx.invoice.findUnique({
      where: { invoiceId },
      include: invoiceInclude,
    })
    if (!invoice) {
      throw new AppError(404, 'ไม่พบใบแจ้งหนี้')
    }
    if (auth.role === 'TENANT' && invoice.contract.booking.tenantId !== auth.tenantId) {
      throw new AppError(403, 'คุณไม่มีสิทธิ์ชำระใบแจ้งหนี้ใบนี้')
    }
    if (invoice.status === INVOICE_STATUS.PAID) {
      throw new AppError(409, 'ใบแจ้งหนี้นี้ชำระครบแล้ว')
    }
    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new AppError(409, 'ใบแจ้งหนี้นี้ถูกยกเลิกแล้ว')
    }
    if (
      auth.role === 'TENANT' &&
      invoice.payments.some((payment) => payment.status === PAYMENT_STATUS.PENDING)
    ) {
      throw new AppError(409, 'มีรายการชำระเงินรอตรวจสอบอยู่แล้ว')
    }
    if (auth.role === 'TENANT' && !slipFileName) {
      throw new AppError(400, 'กรุณาแนบสลิปการโอนเงิน')
    }

    const total = invoiceTotal(invoice)
    const approved = invoice.payments
      .filter((payment) => payment.status === PAYMENT_STATUS.APPROVED)
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
    const balance = total - approved

    if (input.amount > balance + 0.005) {
      throw new AppError(400, `ยอดชำระเกินยอดคงเหลือ (คงเหลือ ${balance.toFixed(2)} บาท)`)
    }

    const isTenant = auth.role === 'TENANT'
    await tx.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        paymentType: input.paymentType,
        status: isTenant ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.APPROVED,
        slipUrl: slipFileName ?? null,
        ...(isTenant
          ? {}
          : { verifiedByAccountId: auth.accountId, verifiedAt: new Date() }),
        paymentDate: input.paymentDate ?? appToday(),
      },
    })

    return recalculateInvoice(tx, invoiceId)
  })

  return serializeInvoice(updated)
}

export async function approvePayment(paymentId: number, auth: AuthPayload) {
  const updated = await prisma.$transaction(async (tx) => {
    const lookup = await tx.payment.findUnique({
      where: { paymentId },
      select: { invoiceId: true },
    })
    if (!lookup) {
      throw new AppError(404, 'ไม่พบรายการชำระเงิน')
    }

    await lockInvoiceForUpdate(tx, lookup.invoiceId)
    await lockPaymentForUpdate(tx, paymentId)

    const payment = await tx.payment.findUnique({
      where: { paymentId },
      include: { invoice: { include: invoiceInclude } },
    })
    if (!payment) {
      throw new AppError(404, 'ไม่พบรายการชำระเงิน')
    }
    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new AppError(409, 'รายการนี้ได้รับการตรวจสอบแล้ว')
    }
    if (payment.invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new AppError(409, 'ใบแจ้งหนี้ถูกยกเลิกแล้ว')
    }

    const total = invoiceTotal(payment.invoice)
    const approved = payment.invoice.payments
      .filter(
        (item) =>
          item.paymentId !== paymentId && item.status === PAYMENT_STATUS.APPROVED,
      )
      .reduce((sum, item) => sum + Number(item.amount), 0)
    const balance = total - approved

    if (Number(payment.amount) > balance + 0.005) {
      throw new AppError(
        400,
        `ยอดชำระเกินยอดคงเหลือ (คงเหลือ ${balance.toFixed(2)} บาท)`,
      )
    }

    await tx.payment.update({
      where: { paymentId },
      data: {
        status: PAYMENT_STATUS.APPROVED,
        verifiedByAccountId: auth.accountId,
        verifiedAt: new Date(),
      },
    })

    return recalculateInvoice(tx, payment.invoiceId)
  })

  return serializeInvoice(updated)
}

export async function rejectPayment(
  paymentId: number,
  auth: AuthPayload,
  input: PaymentRejectInput,
) {
  const updated = await prisma.$transaction(async (tx) => {
    const lookup = await tx.payment.findUnique({
      where: { paymentId },
      select: { invoiceId: true },
    })
    if (!lookup) {
      throw new AppError(404, 'ไม่พบรายการชำระเงิน')
    }

    await lockInvoiceForUpdate(tx, lookup.invoiceId)
    await lockPaymentForUpdate(tx, paymentId)

    const payment = await tx.payment.findUnique({ where: { paymentId } })
    if (!payment) {
      throw new AppError(404, 'ไม่พบรายการชำระเงิน')
    }
    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new AppError(409, 'รายการนี้ได้รับการตรวจสอบแล้ว')
    }

    await tx.payment.update({
      where: { paymentId },
      data: {
        status: PAYMENT_STATUS.REJECTED,
        note: input.note ?? null,
        verifiedByAccountId: auth.accountId,
        verifiedAt: new Date(),
      },
    })

    return recalculateInvoice(tx, payment.invoiceId)
  })

  return serializeInvoice(updated)
}

export async function getPaymentForSlip(paymentId: number, auth: AuthPayload) {
  const payment = await prisma.payment.findUnique({
    where: { paymentId },
    include: {
      invoice: { include: { contract: { include: { booking: true } } } },
    },
  })
  if (!payment) {
    throw new AppError(404, 'ไม่พบรายการชำระเงิน')
  }
  if (
    auth.role === 'TENANT' &&
    payment.invoice.contract.booking.tenantId !== auth.tenantId
  ) {
    throw new AppError(403, 'คุณไม่มีสิทธิ์ดูสลิปนี้')
  }
  if (!payment.slipUrl) {
    throw new AppError(404, 'ไม่พบไฟล์สลิป')
  }
  return payment
}

const paymentListInclude = {
  invoice: {
    include: {
      contract: {
        include: {
          booking: { include: { room: { include: { roomType: true } }, tenant: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude

/** ผู้เช่าเห็นเฉพาะการชำระเงินของตัวเอง ส่วน STAFF/ADMIN เห็นทั้งหมด */
export async function listPayments(query: PaymentListQuery, auth: AuthPayload) {
  const where: Prisma.PaymentWhereInput = {}
  if (query.invoiceId) where.invoiceId = query.invoiceId
  if (query.status) where.status = query.status
  if (auth.role === 'TENANT') {
    where.invoice = { contract: { booking: { tenantId: auth.tenantId ?? -1 } } }
  }

  return prisma.payment.findMany({
    where,
    include: paymentListInclude,
    orderBy: [{ paymentDate: 'desc' }, { paymentId: 'desc' }],
    ...limitArgs(query.limit),
  })
}

/** ลบรายการชำระเงิน (เช่น บันทึกผิด) แล้วคำนวณสถานะใบแจ้งหนี้ใหม่ */
export async function deletePayment(paymentId: number) {
  const updated = await prisma.$transaction(async (tx) => {
    const lookup = await tx.payment.findUnique({
      where: { paymentId },
      select: { invoiceId: true },
    })
    if (!lookup) {
      throw new AppError(404, 'ไม่พบรายการชำระเงิน')
    }
    await lockInvoiceForUpdate(tx, lookup.invoiceId)
    await lockPaymentForUpdate(tx, paymentId)

    const invoice = await tx.invoice.findUniqueOrThrow({ where: { invoiceId: lookup.invoiceId } })
    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new AppError(409, 'ใบแจ้งหนี้ถูกยกเลิกแล้ว ไม่สามารถลบรายการชำระเงินได้')
    }

    const deleted = await tx.payment.delete({ where: { paymentId } })
    return {
      invoice: await recalculateInvoice(tx, lookup.invoiceId),
      slipUrl: deleted.slipUrl,
    }
  })

  if (updated.slipUrl) {
    await removeUploadedFile(path.join(uploadDir, path.basename(updated.slipUrl)))
  }
  return serializeInvoice(updated.invoice)
}
