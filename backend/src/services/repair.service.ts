import { Prisma } from '../../generated/prisma/client'
import { env } from '../config/env'
import { BOOKING_STATUS, REPAIR_STATUS } from '../constants'
import { AppError } from '../lib/http'
import type { AuthPayload } from '../lib/jwt'
import { prisma } from '../lib/prisma'
import { appToday, todayInTimeZone } from '../lib/time'
import type { RepairCreateInput, RepairListQuery, RepairUpdateInput } from '../schemas/repair'
import { limitArgs } from '../schemas/common'

const repairInclude = {
  room: { include: { roomType: true } },
  staff: true,
} satisfies Prisma.RepairRequestInclude

async function assertStaffExists(staffId: number) {
  const staff = await prisma.staff.findUnique({ where: { staffId } })
  if (!staff) {
    throw new AppError(404, 'ไม่พบพนักงาน')
  }
}

export async function createRepair(auth: AuthPayload, input: RepairCreateInput) {
  if (auth.role === 'TENANT') {
    if (!auth.tenantId) {
      throw new AppError(403, 'ไม่พบข้อมูลผู้เช่าสำหรับบัญชีนี้')
    }
    if (input.staffId !== undefined || input.status !== undefined) {
      throw new AppError(403, 'ผู้เช่าไม่สามารถกำหนดผู้รับผิดชอบหรือสถานะงานซ่อมได้')
    }

    const contract = await prisma.contract.findFirst({
      where: {
        booking: {
          tenantId: auth.tenantId,
          roomId: input.roomId,
          status: BOOKING_STATUS.CONFIRMED,
        },
        endDate: { gte: todayInTimeZone(new Date(), env.APP_TIMEZONE) },
      },
    })
    if (!contract) {
      throw new AppError(403, 'คุณไม่มีสัญญาเช่าที่ใช้งานอยู่สำหรับห้องนี้')
    }
  } else {
    const room = await prisma.room.findUnique({ where: { roomId: input.roomId } })
    if (!room) {
      throw new AppError(404, 'ไม่พบห้องพัก')
    }
    if (input.staffId !== undefined) {
      if (auth.role === 'STAFF' && input.staffId !== auth.staffId) {
        throw new AppError(403, 'พนักงานสามารถมอบหมายงานให้ตนเองได้เท่านั้น')
      }
      await assertStaffExists(input.staffId)
    }
  }

  return prisma.repairRequest.create({
    data: {
      roomId: input.roomId,
      requestDate: appToday(),
      description: input.description,
      status: input.status ?? REPAIR_STATUS.PENDING,
      staffId: input.staffId ?? null,
    },
    include: repairInclude,
  })
}

/** ผู้เช่าเห็นงานซ่อมของห้องที่ตนเคยมีสัญญา ส่วน STAFF/ADMIN เห็นทั้งหมด */
export async function listRepairs(query: RepairListQuery, auth: AuthPayload) {
  const where: Prisma.RepairRequestWhereInput = {}
  if (query.status) where.status = query.status
  if (query.staffId) where.staffId = query.staffId

  if (auth.role === 'TENANT') {
    const contracts = await prisma.contract.findMany({
      where: { booking: { tenantId: auth.tenantId ?? -1 } },
      select: { booking: { select: { roomId: true } } },
    })
    const roomIds = [...new Set(contracts.map((contract) => contract.booking.roomId))]
    const allowed = query.roomId ? roomIds.filter((id) => id === query.roomId) : roomIds
    where.roomId = { in: allowed }
  } else if (query.roomId) {
    where.roomId = query.roomId
  }

  return prisma.repairRequest.findMany({
    where,
    include: repairInclude,
    orderBy: { repairId: 'desc' },
    ...limitArgs(query.limit),
  })
}

export async function updateRepair(
  repairId: number,
  auth: AuthPayload,
  input: RepairUpdateInput,
) {
  const repair = await prisma.repairRequest.findUnique({ where: { repairId } })
  if (!repair) {
    throw new AppError(404, 'ไม่พบรายการแจ้งซ่อม')
  }

  if (auth.role === 'STAFF') {
    if (repair.staffId && repair.staffId !== auth.staffId) {
      throw new AppError(403, 'งานนี้ถูกมอบหมายให้พนักงานคนอื่นแล้ว')
    }
    if (input.staffId !== undefined && input.staffId !== auth.staffId) {
      throw new AppError(403, 'พนักงานสามารถมอบหมายงานให้ตนเองได้เท่านั้น')
    }
  }

  if (input.staffId !== undefined && input.staffId !== null) {
    await assertStaffExists(input.staffId)
  }

  const data: Prisma.RepairRequestUpdateInput = {}
  if (input.status !== undefined) data.status = input.status
  if (input.staffId !== undefined) {
    data.staff = input.staffId === null ? { disconnect: true } : { connect: { staffId: input.staffId } }
  }

  return prisma.repairRequest.update({
    where: { repairId },
    data,
    include: repairInclude,
  })
}

export async function deleteRepair(repairId: number) {
  const repair = await prisma.repairRequest.findUnique({ where: { repairId } })
  if (!repair) {
    throw new AppError(404, 'ไม่พบรายการแจ้งซ่อม')
  }
  await prisma.repairRequest.delete({ where: { repairId } })
}
