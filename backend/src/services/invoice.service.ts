import { Prisma } from '../../generated/prisma/client'
import { env } from '../config/env'
import { INVOICE_STATUS, PAYMENT_STATUS } from '../constants'
import { AppError } from '../lib/http'
import type { AuthPayload } from '../lib/jwt'
import { lockInvoiceForUpdate } from '../lib/locks'
import { prisma } from '../lib/prisma'
import { appToday } from '../lib/time'
import {
  invoiceInclude,
  invoiceTotal,
  serializeInvoice,
  type InvoiceWithRelations,
} from '../lib/serializers'
import type { InvoiceCreateInput, InvoiceListQuery, InvoiceUpdateInput } from '../schemas/invoice'
import { limitArgs } from '../schemas/common'

function assertInvoiceAccess(invoice: InvoiceWithRelations, auth: AuthPayload) {
  if (auth.role === 'TENANT' && invoice.contract.booking.tenantId !== auth.tenantId) {
    throw new AppError(403, 'คุณไม่มีสิทธิ์ดูใบแจ้งหนี้ใบนี้')
  }
}

function paidAmountOf(invoice: { payments: Array<{ amount: Prisma.Decimal; status: string }> }) {
  return invoice.payments
    .filter((payment) => payment.status === PAYMENT_STATUS.APPROVED)
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
}

/** ผู้เช่าเห็นเฉพาะใบแจ้งหนี้ของตัวเอง ส่วน STAFF/ADMIN เห็นทั้งหมด */
export async function listInvoices(query: InvoiceListQuery, auth: AuthPayload) {
  const where: Prisma.InvoiceWhereInput = {}
  if (query.status) where.status = query.status
  if (query.type) where.invoiceType = query.type
  if (query.contractId) where.contractId = query.contractId

  const tenantId = auth.role === 'TENANT' ? (auth.tenantId ?? -1) : query.tenantId
  if (tenantId) where.contract = { booking: { tenantId } }

  const items = await prisma.invoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: [{ invoiceDate: 'desc' }, { invoiceId: 'desc' }],
    ...limitArgs(query.limit),
  })
  return items.map(serializeInvoice)
}

/** ลบใบแจ้งหนี้ที่ออกผิด ได้เฉพาะใบที่ยังไม่มีรายการชำระเงิน (ถ้ามีแล้วให้ใช้การยกเลิก) */
export async function deleteInvoice(invoiceId: number) {
  await prisma.$transaction(async (tx) => {
    await lockInvoiceForUpdate(tx, invoiceId)
    const paymentCount = await tx.payment.count({ where: { invoiceId } })
    if (paymentCount > 0) {
      throw new AppError(
        409,
        'ไม่สามารถลบใบแจ้งหนี้ที่มีรายการชำระเงินแล้ว กรุณาใช้การยกเลิกแทน',
      )
    }
    await tx.invoice.delete({ where: { invoiceId } })
  })
}

export async function getInvoice(invoiceId: number, auth: AuthPayload) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
    include: invoiceInclude,
  })
  if (!invoice) {
    throw new AppError(404, 'ไม่พบใบแจ้งหนี้')
  }
  assertInvoiceAccess(invoice, auth)
  return serializeInvoice(invoice)
}

export async function createInvoice(input: InvoiceCreateInput) {
  const contract = await prisma.contract.findUnique({
    where: { contractId: input.contractId },
    include: { booking: true },
  })
  if (!contract) {
    throw new AppError(404, 'ไม่พบสัญญาเช่า')
  }

  let waterAmount = input.waterAmount
  let electricAmount = input.electricAmount

  if (input.meterId) {
    const meter = await prisma.utilityMeter.findUnique({ where: { meterId: input.meterId } })
    if (!meter) {
      throw new AppError(404, 'ไม่พบมิเตอร์')
    }
    if (meter.roomId !== contract.booking.roomId) {
      throw new AppError(400, 'มิเตอร์นี้ไม่ตรงกับห้องในสัญญาเช่า')
    }
    const existingInvoice = await prisma.invoice.findUnique({
      where: { meterId: input.meterId },
      select: { invoiceId: true },
    })
    if (existingInvoice) {
      throw new AppError(409, 'มิเตอร์นี้ถูกออกใบแจ้งหนี้แล้ว')
    }
    waterAmount = Number((Number(meter.waterUnit) * env.WATER_RATE).toFixed(2))
    electricAmount = Number((Number(meter.electricUnit) * env.ELECTRIC_RATE).toFixed(2))
  }

  try {
    const invoice = await prisma.invoice.create({
      data: {
        contractId: input.contractId,
        invoiceDate: appToday(),
        meterId: input.meterId ?? null,
        dueDate: input.dueDate,
        rentAmount: input.rentAmount,
        waterAmount,
        electricAmount,
        depositAmount: input.depositAmount,
        invoiceType: input.invoiceType,
        status: INVOICE_STATUS.UNPAID,
      },
      include: invoiceInclude,
    })

    return serializeInvoice(invoice)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(409, 'มิเตอร์นี้ถูกออกใบแจ้งหนี้แล้ว')
    }
    throw error
  }
}

export async function updateInvoice(invoiceId: number, input: InvoiceUpdateInput) {
  const existing = await prisma.invoice.findUnique({
    where: { invoiceId },
    include: { payments: true },
  })
  if (!existing) {
    throw new AppError(404, 'ไม่พบใบแจ้งหนี้')
  }
  if (
    existing.status === INVOICE_STATUS.PAID ||
    existing.status === INVOICE_STATUS.CANCELLED
  ) {
    throw new AppError(
      409,
      'ไม่สามารถแก้ไขใบแจ้งหนี้ที่ชำระครบแล้วหรือถูกยกเลิกได้',
    )
  }

  const changesAmounts =
    input.rentAmount !== undefined ||
    input.waterAmount !== undefined ||
    input.electricAmount !== undefined ||
    input.depositAmount !== undefined
  if (
    changesAmounts &&
    existing.payments.some((payment) => payment.status === PAYMENT_STATUS.PENDING)
  ) {
    throw new AppError(
      409,
      'ไม่สามารถแก้ไขยอดเงินได้ เนื่องจากมีรายการชำระเงินรอตรวจสอบอยู่',
    )
  }

  const paid = paidAmountOf(existing)
  const nextTotal = invoiceTotal({
    rentAmount: input.rentAmount ?? existing.rentAmount,
    waterAmount: input.waterAmount ?? existing.waterAmount,
    electricAmount: input.electricAmount ?? existing.electricAmount,
    depositAmount: input.depositAmount ?? existing.depositAmount,
  })

  if (nextTotal + 0.005 < paid) {
    throw new AppError(400, 'ยอดรวมใหม่ต้องไม่น้อยกว่ายอดที่ชำระแล้ว')
  }

  const data: Prisma.InvoiceUpdateInput = {}
  if (input.dueDate !== undefined) data.dueDate = input.dueDate
  if (input.rentAmount !== undefined) data.rentAmount = input.rentAmount
  if (input.waterAmount !== undefined) data.waterAmount = input.waterAmount
  if (input.electricAmount !== undefined) data.electricAmount = input.electricAmount
  if (input.depositAmount !== undefined) data.depositAmount = input.depositAmount
  if (input.invoiceType !== undefined) data.invoiceType = input.invoiceType

  const invoice = await prisma.invoice.update({
    where: { invoiceId },
    data,
    include: invoiceInclude,
  })

  return serializeInvoice(invoice)
}

export async function cancelInvoice(invoiceId: number) {
  const invoice = await prisma.$transaction(async (tx) => {
    await lockInvoiceForUpdate(tx, invoiceId)

    const existing = await tx.invoice.findUnique({
      where: { invoiceId },
      include: { payments: true },
    })
    if (!existing) {
      throw new AppError(404, 'ไม่พบใบแจ้งหนี้')
    }

    const hasActivePayments = existing.payments.some(
      (payment) => payment.status !== PAYMENT_STATUS.REJECTED,
    )
    if (hasActivePayments) {
      throw new AppError(
        409,
        'ไม่สามารถยกเลิกใบแจ้งหนี้ที่มีรายการชำระเงินรอตรวจสอบหรืออนุมัติแล้วได้',
      )
    }

    return tx.invoice.update({
      where: { invoiceId },
      data: { status: INVOICE_STATUS.CANCELLED },
      include: invoiceInclude,
    })
  })

  return serializeInvoice(invoice)
}
