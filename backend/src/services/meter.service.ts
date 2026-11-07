import { Prisma } from '../../generated/prisma/client'
import { AppError } from '../lib/http'
import { prisma } from '../lib/prisma'
import type { MeterCreateInput, MeterListQuery } from '../schemas/meter'
import { limitArgs } from '../schemas/common'

const meterInclude = {
  room: { include: { roomType: true } },
} satisfies Prisma.UtilityMeterInclude

export async function listMeters(query: MeterListQuery) {
  const where: Prisma.UtilityMeterWhereInput = {}
  if (query.roomId) where.roomId = query.roomId

  if (query.month) {
    const [yearText, monthText] = query.month.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    if (!year || !month || month < 1 || month > 12) {
      throw new AppError(400, 'รูปแบบเดือนไม่ถูกต้อง')
    }
    where.meterMonth = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    }
  }

  return prisma.utilityMeter.findMany({
    where,
    include: meterInclude,
    orderBy: [{ meterMonth: 'desc' }, { meterId: 'desc' }],
    ...limitArgs(query.limit),
  })
}

export async function createMeter(input: MeterCreateInput) {
  const room = await prisma.room.findUnique({ where: { roomId: input.roomId } })
  if (!room) {
    throw new AppError(404, 'ไม่พบห้องพัก')
  }

  return prisma.utilityMeter.create({
    data: {
      roomId: input.roomId,
      meterMonth: input.meterMonth,
      waterUnit: input.waterUnit,
      electricUnit: input.electricUnit,
    },
    include: meterInclude,
  })
}

export async function updateMeter(meterId: number, input: Partial<MeterCreateInput>) {
  const meter = await prisma.utilityMeter.findUnique({ where: { meterId } })
  if (!meter) {
    throw new AppError(404, 'ไม่พบมิเตอร์')
  }
  if (input.roomId) {
    const room = await prisma.room.findUnique({ where: { roomId: input.roomId } })
    if (!room) {
      throw new AppError(404, 'ไม่พบห้องพัก')
    }
  }

  const data: Prisma.UtilityMeterUpdateInput = {}
  if (input.roomId !== undefined) data.room = { connect: { roomId: input.roomId } }
  if (input.meterMonth !== undefined) data.meterMonth = input.meterMonth
  if (input.waterUnit !== undefined) data.waterUnit = input.waterUnit
  if (input.electricUnit !== undefined) data.electricUnit = input.electricUnit

  return prisma.utilityMeter.update({ where: { meterId }, data, include: meterInclude })
}

export async function deleteMeter(meterId: number) {
  const meter = await prisma.utilityMeter.findUnique({
    where: { meterId },
    include: { invoices: { select: { invoiceId: true } } },
  })
  if (!meter) {
    throw new AppError(404, 'ไม่พบมิเตอร์')
  }
  // FK เป็น SET NULL จึงต้องกันเองไม่ให้ใบแจ้งหนี้เสียข้อมูลอ้างอิงไป
  if (meter.invoices.length > 0) {
    throw new AppError(409, 'ไม่สามารถลบมิเตอร์ที่ออกใบแจ้งหนี้แล้วได้')
  }
  await prisma.utilityMeter.delete({ where: { meterId } })
}
