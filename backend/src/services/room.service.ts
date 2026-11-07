import { Prisma } from '../../generated/prisma/client'
import { ACTIVE_BOOKING_STATUSES } from '../constants'
import { AppError } from '../lib/http'
import { prisma } from '../lib/prisma'
import { limitArgs } from '../schemas/common'
import type {
  RoomCreateInput,
  RoomListQuery,
  RoomTypeCreateInput,
  RoomUpdateInput,
} from '../schemas/room'

export function listRoomTypes() {
  return prisma.roomType.findMany({
    include: { _count: { select: { rooms: true } } },
    orderBy: { basePrice: 'asc' },
  })
}

export async function createRoomType(input: RoomTypeCreateInput) {
  return prisma.roomType.create({
    data: {
      typeName: input.typeName,
      basePrice: input.basePrice,
      description: input.description ?? null,
      imageUrls: input.imageUrls ?? [],
      amenities: input.amenities ?? [],
    },
  })
}

export async function updateRoomType(roomTypeId: number, input: Partial<RoomTypeCreateInput>) {
  const exists = await prisma.roomType.findUnique({ where: { roomTypeId } })
  if (!exists) {
    throw new AppError(404, 'ไม่พบประเภทห้อง')
  }

  const data: Prisma.RoomTypeUpdateInput = {}
  if (input.typeName !== undefined) data.typeName = input.typeName
  if (input.basePrice !== undefined) data.basePrice = input.basePrice
  if (input.description !== undefined) data.description = input.description
  if (input.imageUrls !== undefined) data.imageUrls = input.imageUrls
  if (input.amenities !== undefined) data.amenities = input.amenities

  return prisma.roomType.update({ where: { roomTypeId }, data })
}

export async function deleteRoomType(roomTypeId: number) {
  const roomCount = await prisma.room.count({ where: { roomTypeId } })
  if (roomCount > 0) {
    throw new AppError(409, 'ไม่สามารถลบประเภทห้องที่มีห้องพักอยู่ได้')
  }
  await prisma.roomType.delete({ where: { roomTypeId } })
}

export async function listRooms(query: RoomListQuery) {
  const where: Prisma.RoomWhereInput = {}

  if (query.typeId) where.roomTypeId = query.typeId
  if (query.floor) where.floor = query.floor
  if (query.status) where.status = query.status

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const priceFilter: Prisma.DecimalFilter = {}
    if (query.minPrice !== undefined) priceFilter.gte = query.minPrice
    if (query.maxPrice !== undefined) priceFilter.lte = query.maxPrice
    where.monthlyRate = priceFilter
  }

  if (query.q) {
    where.OR = [
      { roomNumber: { contains: query.q, mode: 'insensitive' } },
      { roomType: { is: { typeName: { contains: query.q, mode: 'insensitive' } } } },
    ]
  }

  return prisma.room.findMany({
    where,
    include: { roomType: true },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    ...limitArgs(query.limit),
  })
}

export async function getRoom(roomId: number) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: {
      roomType: true,
      bookings: {
        where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
        include: { tenant: true },
        take: 1,
        orderBy: { bookingDate: 'desc' },
      },
    },
  })

  if (!room) {
    throw new AppError(404, 'ไม่พบห้องพัก')
  }

  return room
}

export async function createRoom(input: RoomCreateInput) {
  const roomType = await prisma.roomType.findUnique({ where: { roomTypeId: input.roomTypeId } })
  if (!roomType) {
    throw new AppError(404, 'ไม่พบประเภทห้อง')
  }

  return prisma.room.create({
    data: {
      roomNumber: input.roomNumber,
      floor: input.floor,
      roomTypeId: input.roomTypeId,
      monthlyRate: input.monthlyRate,
      status: input.status,
    },
    include: { roomType: true },
  })
}

export async function updateRoom(roomId: number, input: RoomUpdateInput) {
  const room = await prisma.room.findUnique({ where: { roomId } })
  if (!room) {
    throw new AppError(404, 'ไม่พบห้องพัก')
  }

  if (input.roomTypeId) {
    const roomType = await prisma.roomType.findUnique({ where: { roomTypeId: input.roomTypeId } })
    if (!roomType) {
      throw new AppError(404, 'ไม่พบประเภทห้อง')
    }
  }

  const data: Prisma.RoomUpdateInput = {}
  if (input.roomNumber !== undefined) data.roomNumber = input.roomNumber
  if (input.floor !== undefined) data.floor = input.floor
  if (input.monthlyRate !== undefined) data.monthlyRate = input.monthlyRate
  if (input.status !== undefined) data.status = input.status
  if (input.roomTypeId !== undefined) data.roomType = { connect: { roomTypeId: input.roomTypeId } }

  return prisma.room.update({ where: { roomId }, data, include: { roomType: true } })
}

export async function deleteRoom(roomId: number) {
  const room = await prisma.room.findUnique({ where: { roomId } })
  if (!room) {
    throw new AppError(404, 'ไม่พบห้องพัก')
  }
  await prisma.room.delete({ where: { roomId } })
}
