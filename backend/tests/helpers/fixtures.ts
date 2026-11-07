import bcrypt from 'bcryptjs'
import {
  BOOKING_STATUS,
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_STATUS,
  ROOM_STATUS,
} from '../../src/constants'
import { prisma } from '../../src/lib/prisma'

export const TEST_PASSWORD = 'Password@1234'

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

export async function seedBase() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4)

  const roomType = await prisma.roomType.create({
    data: {
      typeName: 'ห้องทดสอบ',
      basePrice: 1000,
      amenities: ['Wi-Fi'],
    },
  })

  const room = await prisma.room.create({
    data: {
      roomNumber: 'T-101',
      floor: 1,
      roomTypeId: roomType.roomTypeId,
      monthlyRate: 1000,
      status: ROOM_STATUS.AVAILABLE,
    },
  })

  const tenant = await prisma.tenant.create({
    data: {
      fullName: 'ผู้เช่าทดสอบ',
      idCardNo: '1234567890123',
      phone: '0812345678',
      email: 'tenant@test.local',
    },
  })

  const otherTenant = await prisma.tenant.create({
    data: {
      fullName: 'ผู้เช่าคนที่สอง',
      idCardNo: '9876543210987',
      phone: '0898765432',
      email: 'tenant2@test.local',
    },
  })

  const tenantAccount = await prisma.account.create({
    data: {
      email: 'tenant@test.local',
      passwordHash,
      role: 'TENANT',
      tenantId: tenant.tenantId,
    },
  })

  const otherTenantAccount = await prisma.account.create({
    data: {
      email: 'tenant2@test.local',
      passwordHash,
      role: 'TENANT',
      tenantId: otherTenant.tenantId,
    },
  })

  const staff = await prisma.staff.create({
    data: {
      fullName: 'พนักงานทดสอบ',
      position: 'ผู้ดูแล',
      phone: '0823456789',
    },
  })

  const staffAccount = await prisma.account.create({
    data: {
      email: 'staff@test.local',
      passwordHash,
      role: 'STAFF',
      staffId: staff.staffId,
    },
  })

  const adminAccount = await prisma.account.create({
    data: {
      email: 'admin@test.local',
      passwordHash,
      role: 'ADMIN',
    },
  })

  return {
    passwordHash,
    roomType,
    room,
    tenant,
    otherTenant,
    tenantAccount,
    otherTenantAccount,
    staff,
    staffAccount,
    adminAccount,
  }
}

type Base = Awaited<ReturnType<typeof seedBase>>

export async function seedContractWithInvoice(
  base: Base,
  options: { total?: number; status?: string } = {},
) {
  const booking = await prisma.booking.create({
    data: {
      roomId: base.room.roomId,
      tenantId: base.tenant.tenantId,
      moveInDate: dateOnly('2026-01-01'),
      status: BOOKING_STATUS.CONFIRMED,
    },
  })

  const contract = await prisma.contract.create({
    data: {
      bookingId: booking.bookingId,
      startDate: dateOnly('2026-01-01'),
      endDate: dateOnly('2026-12-31'),
      deposit: 0,
    },
  })

  const invoice = await prisma.invoice.create({
    data: {
      contractId: contract.contractId,
      dueDate: dateOnly('2099-01-31'),
      rentAmount: options.total ?? 1000,
      invoiceType: INVOICE_TYPE.RENT,
      status: options.status ?? INVOICE_STATUS.UNPAID,
    },
  })

  await prisma.room.update({
    where: { roomId: base.room.roomId },
    data: { status: ROOM_STATUS.OCCUPIED },
  })

  return { booking, contract, invoice }
}

export async function addPayment(
  invoiceId: number,
  options: { amount?: number; status?: string } = {},
) {
  return prisma.payment.create({
    data: {
      invoiceId,
      amount: options.amount ?? 1000,
      paymentType: 'โอนเงิน',
      status: options.status ?? PAYMENT_STATUS.APPROVED,
    },
  })
}

export async function addInvoice(
  contractId: number,
  options: { total?: number; status?: string } = {},
) {
  return prisma.invoice.create({
    data: {
      contractId,
      dueDate: dateOnly('2099-02-28'),
      rentAmount: options.total ?? 1000,
      invoiceType: INVOICE_TYPE.OTHER,
      status: options.status ?? INVOICE_STATUS.UNPAID,
    },
  })
}

export { dateOnly }
