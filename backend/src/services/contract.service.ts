import { Prisma } from '../../generated/prisma/client'
import { BOOKING_STATUS } from '../constants'
import { AppError } from '../lib/http'
import type { AuthPayload } from '../lib/jwt'
import { lockBookingForUpdate } from '../lib/locks'
import { prisma } from '../lib/prisma'
import { invoiceAmounts, invoiceDisplayStatus } from '../lib/serializers'
import type { ContractCreateInput, ContractUpdateInput } from '../schemas/contract'
import { limitArgs } from '../schemas/common'
import { confirmBooking } from './booking.service'

const contractInclude = {
  booking: {
    include: {
      tenant: true,
      room: { include: { roomType: true } },
    },
  },
  invoices: {
    include: { payments: { orderBy: { paymentDate: 'asc' as const } } },
    orderBy: { invoiceDate: 'desc' as const },
  },
} satisfies Prisma.ContractInclude

type ContractWithRelations = Prisma.ContractGetPayload<{ include: typeof contractInclude }>

function serializeContract(contract: ContractWithRelations) {
  return {
    ...contract,
    invoices: contract.invoices.map((invoice) => ({
      ...invoice,
      ...invoiceAmounts(invoice),
      status: invoiceDisplayStatus(invoice),
    })),
  }
}

/** ผู้เช่าเห็นเฉพาะสัญญาของตัวเอง ส่วน STAFF/ADMIN เห็นทั้งหมด */
export async function listContracts(auth: AuthPayload, limit?: number) {
  const where: Prisma.ContractWhereInput =
    auth.role === 'TENANT' ? { booking: { tenantId: auth.tenantId ?? -1 } } : {}
  const contracts = await prisma.contract.findMany({
    where,
    include: contractInclude,
    orderBy: { contractId: 'desc' },
    ...limitArgs(limit),
  })
  return contracts.map(serializeContract)
}

export async function getContract(contractId: number, auth: AuthPayload) {
  const contract = await prisma.contract.findUnique({
    where: { contractId },
    include: contractInclude,
  })

  if (!contract) {
    throw new AppError(404, 'ไม่พบสัญญาเช่า')
  }
  if (auth.role === 'TENANT' && contract.booking.tenantId !== auth.tenantId) {
    throw new AppError(403, 'คุณไม่มีสิทธิ์ดูสัญญานี้')
  }

  return serializeContract(contract)
}

/** สร้างสัญญาจากการจองที่รอดำเนินการ = ยืนยันการจอง (สร้างใบแจ้งหนี้เงินมัดจำให้อัตโนมัติ) */
export async function createContract(input: ContractCreateInput) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId: input.bookingId },
    include: { contract: true },
  })
  if (!booking) {
    throw new AppError(404, 'ไม่พบการจอง')
  }
  if (booking.contract) {
    throw new AppError(409, 'การจองนี้มีสัญญาเช่าแล้ว')
  }

  await confirmBooking(input.bookingId, input)

  const contract = await prisma.contract.findUniqueOrThrow({
    where: { bookingId: input.bookingId },
    include: contractInclude,
  })
  return serializeContract(contract)
}

export async function updateContract(contractId: number, input: ContractUpdateInput) {
  const contract = await prisma.contract.findUnique({ where: { contractId } })
  if (!contract) {
    throw new AppError(404, 'ไม่พบสัญญาเช่า')
  }

  const startDate = input.startDate ?? contract.startDate
  const endDate = input.endDate ?? contract.endDate
  if (endDate <= startDate) {
    throw new AppError(400, 'วันสิ้นสุดสัญญาต้องมากกว่าวันเริ่มสัญญา')
  }

  const data: Prisma.ContractUpdateInput = {}
  if (input.startDate !== undefined) data.startDate = input.startDate
  if (input.endDate !== undefined) data.endDate = input.endDate
  if (input.deposit !== undefined) data.deposit = input.deposit

  const updated = await prisma.contract.update({
    where: { contractId },
    data,
    include: contractInclude,
  })
  return serializeContract(updated)
}

/**
 * ลบสัญญาที่ยังไม่มีการชำระเงินใดๆ (ย้อนการยืนยัน): ลบใบแจ้งหนี้ของสัญญา
 * แล้วคืนการจองเป็น "รอดำเนินการ" ถ้ามีการชำระเงินแล้วต้องใช้การยกเลิกการจองแทน
 */
export async function deleteContract(contractId: number) {
  await prisma.$transaction(async (tx) => {
    const lookup = await tx.contract.findUnique({ where: { contractId } })
    if (!lookup) {
      throw new AppError(404, 'ไม่พบสัญญาเช่า')
    }
    await lockBookingForUpdate(tx, lookup.bookingId)

    const contract = await tx.contract.findUniqueOrThrow({
      where: { contractId },
      include: { invoices: { include: { payments: { select: { paymentId: true } } } } },
    })
    if (contract.invoices.some((invoice) => invoice.payments.length > 0)) {
      throw new AppError(
        409,
        'ไม่สามารถลบสัญญาที่มีรายการชำระเงินแล้ว กรุณาใช้การยกเลิกการจองแทน',
      )
    }

    await tx.invoice.deleteMany({ where: { contractId } })
    await tx.contract.delete({ where: { contractId } })
    await tx.booking.update({
      where: { bookingId: contract.bookingId },
      data: { status: BOOKING_STATUS.PENDING },
    })
  })
}
