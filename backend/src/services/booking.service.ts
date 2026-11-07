import { Prisma } from '../../generated/prisma/client'
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUS,
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_STATUS,
  ROOM_STATUS,
} from '../constants'
import { AppError } from '../lib/http'
import type { AuthPayload } from '../lib/jwt'
import { lockBookingForUpdate, lockInvoiceForUpdate } from '../lib/locks'
import { prisma } from '../lib/prisma'
import { appToday } from '../lib/time'
import { bookingInclude } from '../lib/serializers'
import type { BookingConfirmInput, BookingListQuery } from '../schemas/booking'
import { limitArgs } from '../schemas/common'

export async function createBooking(
  tenantId: number,
  input: { roomId: number; moveInDate: Date },
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.findUnique({ where: { tenantId } })
        if (!tenant) {
          throw new AppError(404, 'ไม่พบผู้เช่า')
        }

        const room = await tx.room.findUnique({ where: { roomId: input.roomId } })
        if (!room) {
          throw new AppError(404, 'ไม่พบห้องพัก')
        }
        if (room.status !== ROOM_STATUS.AVAILABLE) {
          throw new AppError(409, 'ห้องนี้ไม่พร้อมให้จองในขณะนี้')
        }

        const activeBooking = await tx.booking.findFirst({
          where: {
            roomId: input.roomId,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
          },
        })
        if (activeBooking) {
          throw new AppError(409, 'ห้องนี้มีการจองอยู่แล้ว')
        }

        const booking = await tx.booking.create({
          data: {
            roomId: input.roomId,
            tenantId,
            bookingDate: appToday(),
            moveInDate: input.moveInDate,
            status: BOOKING_STATUS.PENDING,
          },
          include: bookingInclude,
        })

        await tx.room.update({
          where: { roomId: input.roomId },
          data: { status: ROOM_STATUS.OCCUPIED },
        })

        return booking
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'ห้องนี้มีการจองอยู่แล้ว')
    }
    throw error
  }
}

/** ผู้เช่าเห็นเฉพาะการจองของตัวเอง ส่วน STAFF/ADMIN เห็นทั้งหมด */
export async function listBookings(query: BookingListQuery, auth: AuthPayload) {
  const where: Prisma.BookingWhereInput = {}
  if (query.status) where.status = query.status
  if (query.roomId) where.roomId = query.roomId
  if (auth.role === 'TENANT') {
    // บัญชีผู้เช่าที่ไม่มี tenantId จะไม่เห็นอะไรเลย
    where.tenantId = auth.tenantId ?? -1
  } else if (query.tenantId) {
    where.tenantId = query.tenantId
  }

  return prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { bookingId: 'desc' },
    ...limitArgs(query.limit),
  })
}

/** ลบการจองที่ยังไม่มีสัญญา (เช่น บันทึกผิด) แล้วคืนสถานะห้องเป็นว่าง */
export async function deleteBooking(bookingId: number) {
  return prisma.$transaction(async (tx) => {
    await lockBookingForUpdate(tx, bookingId)
    const booking = await tx.booking.findUnique({
      where: { bookingId },
      include: { contract: true, room: true },
    })
    if (!booking) {
      throw new AppError(404, 'ไม่พบการจอง')
    }
    if (booking.contract) {
      throw new AppError(409, 'ไม่สามารถลบการจองที่มีสัญญาเช่าแล้ว กรุณาใช้การยกเลิกแทน')
    }

    await tx.booking.delete({ where: { bookingId } })

    const wasActive = (ACTIVE_BOOKING_STATUSES as string[]).includes(booking.status)
    if (wasActive && booking.room.status === ROOM_STATUS.OCCUPIED) {
      const otherActive = await tx.booking.findFirst({
        where: { roomId: booking.roomId, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      })
      if (!otherActive) {
        await tx.room.update({
          where: { roomId: booking.roomId },
          data: { status: ROOM_STATUS.AVAILABLE },
        })
      }
    }
  })
}

export async function getBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { bookingId },
    include: bookingInclude,
  })
  if (!booking) {
    throw new AppError(404, 'ไม่พบการจอง')
  }
  return booking
}

export async function confirmBooking(bookingId: number, input: BookingConfirmInput) {
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { bookingId },
        include: { contract: true, room: true },
      })

      if (!booking) {
        throw new AppError(404, 'ไม่พบการจอง')
      }
      if (booking.contract) {
        throw new AppError(409, 'การจองนี้มีสัญญาเช่าแล้ว')
      }
      if (booking.status !== BOOKING_STATUS.PENDING) {
        throw new AppError(409, 'ยืนยันได้เฉพาะการจองที่รอดำเนินการเท่านั้น')
      }

      const contract = await tx.contract.create({
        data: {
          bookingId,
          startDate: input.startDate,
          endDate: input.endDate,
          deposit: input.deposit,
        },
      })

      await tx.invoice.create({
        data: {
          contractId: contract.contractId,
          invoiceDate: appToday(),
          dueDate: input.dueDate ?? input.startDate,
          depositAmount: input.deposit,
          invoiceType: INVOICE_TYPE.DEPOSIT,
          status: INVOICE_STATUS.UNPAID,
        },
      })

      await tx.booking.update({
        where: { bookingId },
        data: { status: BOOKING_STATUS.CONFIRMED },
      })

      await tx.room.update({
        where: { roomId: booking.roomId },
        data: { status: ROOM_STATUS.OCCUPIED },
      })

      return tx.booking.findUniqueOrThrow({ where: { bookingId }, include: bookingInclude })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

export async function cancelBooking(bookingId: number, auth: AuthPayload) {
  return prisma.$transaction(async (tx) => {
    await lockBookingForUpdate(tx, bookingId)

    const booking = await tx.booking.findUnique({
      where: { bookingId },
      include: {
        contract: { include: { invoices: { select: { invoiceId: true } } } },
        room: true,
      },
    })

    if (!booking) {
      throw new AppError(404, 'ไม่พบการจอง')
    }
    if (auth.role === 'TENANT' && booking.tenantId !== auth.tenantId) {
      throw new AppError(403, 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้')
    }
    const cancellableStatuses: string[] = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED]
    if (!cancellableStatuses.includes(booking.status)) {
      throw new AppError(409, 'ไม่สามารถยกเลิกการจองนี้ได้')
    }

    if (booking.contract) {
      const invoiceIds = booking.contract.invoices
        .map((invoice) => invoice.invoiceId)
        .sort((a, b) => a - b)

      for (const invoiceId of invoiceIds) {
        await lockInvoiceForUpdate(tx, invoiceId)
      }

      const payments = await tx.payment.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: { status: true },
      })
      if (payments.some((payment) => payment.status === PAYMENT_STATUS.APPROVED)) {
        throw new AppError(409, 'ไม่สามารถยกเลิกการจองที่มีการชำระเงินแล้วได้')
      }

      await tx.payment.updateMany({
        where: { invoiceId: { in: invoiceIds }, status: PAYMENT_STATUS.PENDING },
        data: { status: PAYMENT_STATUS.REJECTED, note: 'ยกเลิกการจอง' },
      })

      await tx.invoice.updateMany({
        where: {
          contractId: booking.contract.contractId,
          status: { not: INVOICE_STATUS.CANCELLED },
        },
        data: { status: INVOICE_STATUS.CANCELLED },
      })
    }

    const updated = await tx.booking.update({
      where: { bookingId },
      data: { status: BOOKING_STATUS.CANCELLED },
      include: bookingInclude,
    })

    const otherActiveBooking = await tx.booking.findFirst({
      where: {
        roomId: booking.roomId,
        bookingId: { not: bookingId },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
    })

    if (!otherActiveBooking && booking.room.status === ROOM_STATUS.OCCUPIED) {
      await tx.room.update({
        where: { roomId: booking.roomId },
        data: { status: ROOM_STATUS.AVAILABLE },
      })
    }

    return updated
  })
}

export async function completeBooking(bookingId: number) {
  return prisma.$transaction(async (tx) => {
    await lockBookingForUpdate(tx, bookingId)

    const booking = await tx.booking.findUnique({
      where: { bookingId },
      include: { contract: { include: { invoices: true } } },
    })
    if (!booking) {
      throw new AppError(404, 'ไม่พบการจอง')
    }
    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new AppError(409, 'ปิดสัญญาได้เฉพาะการจองที่ยืนยันแล้วเท่านั้น')
    }

    if (booking.contract) {
      const invoiceIds = booking.contract.invoices
        .map((invoice) => invoice.invoiceId)
        .sort((a, b) => a - b)

      for (const invoiceId of invoiceIds) {
        await lockInvoiceForUpdate(tx, invoiceId)
      }

      const invoices = await tx.invoice.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: { status: true },
      })
      const hasOutstanding = invoices.some(
        (invoice) =>
          invoice.status !== INVOICE_STATUS.PAID &&
          invoice.status !== INVOICE_STATUS.CANCELLED,
      )
      if (hasOutstanding) {
        throw new AppError(
          409,
          'ไม่สามารถปิดสัญญาได้ เนื่องจากยังมีใบแจ้งหนี้ที่ค้างชำระ',
        )
      }
    }

    const updated = await tx.booking.update({
      where: { bookingId },
      data: { status: BOOKING_STATUS.COMPLETED },
      include: bookingInclude,
    })
    await tx.room.update({
      where: { roomId: booking.roomId },
      data: { status: ROOM_STATUS.AVAILABLE },
    })
    return updated
  })
}
