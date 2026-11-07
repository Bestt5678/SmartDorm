import bcrypt from 'bcryptjs'
import { Prisma } from '../../generated/prisma/client'
import { AppError } from '../lib/http'
import { prisma } from '../lib/prisma'
import type {
  StaffCreateInput,
  StaffUpdateInput,
  TenantCreateInput,
  TenantUpdateInput,
} from '../schemas/people'

// ---------- พนักงาน ----------

export function listStaff() {
  return prisma.staff.findMany({
    include: { account: { select: { email: true } } },
    orderBy: { fullName: 'asc' },
  })
}

export async function createStaff(input: StaffCreateInput) {
  if (input.email) {
    const existing = await prisma.account.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new AppError(409, 'อีเมลนี้ถูกใช้งานแล้ว')
    }
  }
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null

  return prisma.staff.create({
    data: {
      fullName: input.fullName,
      position: input.position,
      phone: input.phone ?? null,
      ...(input.email && passwordHash
        ? { account: { create: { email: input.email, passwordHash, role: 'STAFF' } } }
        : {}),
    },
    include: { account: { select: { email: true } } },
  })
}

export async function updateStaff(staffId: number, input: StaffUpdateInput) {
  const staff = await prisma.staff.findUnique({ where: { staffId } })
  if (!staff) {
    throw new AppError(404, 'ไม่พบพนักงาน')
  }
  const data: Prisma.StaffUpdateInput = {}
  if (input.fullName !== undefined) data.fullName = input.fullName
  if (input.position !== undefined) data.position = input.position
  if (input.phone !== undefined) data.phone = input.phone
  return prisma.staff.update({
    where: { staffId },
    data,
    include: { account: { select: { email: true } } },
  })
}

/** ลบพนักงานพร้อมบัญชีเข้าสู่ระบบ งานซ่อมที่เคยรับไว้จะกลับเป็น "ยังไม่มีผู้รับผิดชอบ" */
export async function deleteStaff(staffId: number) {
  const staff = await prisma.staff.findUnique({ where: { staffId } })
  if (!staff) {
    throw new AppError(404, 'ไม่พบพนักงาน')
  }
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { staffId } }),
    prisma.staff.delete({ where: { staffId } }),
  ])
}

// ---------- ผู้เช่า ----------

export function listTenants() {
  return prisma.tenant.findMany({
    include: {
      account: { select: { email: true } },
      bookings: {
        include: { room: { include: { roomType: true } }, contract: true },
        orderBy: { bookingId: 'desc' },
        take: 5,
      },
    },
    orderBy: { tenantId: 'desc' },
  })
}

export async function getTenant(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId },
    include: {
      account: { select: { email: true, role: true } },
      bookings: {
        include: {
          room: { include: { roomType: true } },
          contract: { include: { invoices: { include: { payments: true } } } },
        },
        orderBy: { bookingId: 'desc' },
      },
    },
  })
  if (!tenant) {
    throw new AppError(404, 'ไม่พบผู้เช่า')
  }
  return tenant
}

/** STAFF/ADMIN บันทึกผู้เช่า walk-in (ไม่มีบัญชีเข้าสู่ระบบ) */
export function createTenant(input: TenantCreateInput) {
  return prisma.tenant.create({
    data: {
      fullName: input.fullName,
      idCardNo: input.idCardNo,
      phone: input.phone ?? null,
      email: input.email ?? null,
    },
  })
}

export async function updateTenant(tenantId: number, input: TenantUpdateInput) {
  const tenant = await prisma.tenant.findUnique({ where: { tenantId } })
  if (!tenant) {
    throw new AppError(404, 'ไม่พบผู้เช่า')
  }
  const data: Prisma.TenantUpdateInput = {}
  if (input.fullName !== undefined) data.fullName = input.fullName
  if (input.idCardNo !== undefined) data.idCardNo = input.idCardNo
  if (input.phone !== undefined) data.phone = input.phone
  if (input.email !== undefined) data.email = input.email
  return prisma.tenant.update({ where: { tenantId }, data })
}

/** ลบได้เฉพาะผู้เช่าที่ไม่เคยมีการจอง (บัญชีเข้าสู่ระบบถูกลบไปด้วย) */
export async function deleteTenant(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId },
    include: { _count: { select: { bookings: true } } },
  })
  if (!tenant) {
    throw new AppError(404, 'ไม่พบผู้เช่า')
  }
  if (tenant._count.bookings > 0) {
    throw new AppError(409, 'ไม่สามารถลบผู้เช่าที่มีประวัติการจองได้')
  }
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { tenantId } }),
    prisma.tenant.delete({ where: { tenantId } }),
  ])
}
