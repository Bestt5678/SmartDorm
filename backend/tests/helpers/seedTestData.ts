import bcrypt from 'bcryptjs'
import { prisma } from '../../src/lib/prisma'

export const TEST_PASSWORD = 'Password@1234'

export async function seedBase() {
  const password_hash = await bcrypt.hash(TEST_PASSWORD, 4)

  const roomType = await prisma.roomType.create({
    data: { type_name: 'ห้องทดสอบ', base_price: 1000, amenities: ['Wi-Fi'] },
  })

  const room = await prisma.room.create({
    data: {
      room_number: 'T-101',
      floor: 1,
      room_type_id: roomType.room_type_id,
      monthly_rate: 1000,
      status: 'ว่าง',
    },
  })

  const tenant = await prisma.tenant.create({
    data: {
      full_name: 'ผู้เช่าทดสอบ',
      id_card_no: '1234567890123',
      phone: '0812345678',
      email: 'tenant@test.local',
    },
  })
  await prisma.account.create({
    data: {
      email: 'tenant@test.local',
      password_hash,
      role: 'TENANT',
      tenant_id: tenant.tenant_id,
    },
  })

  const staff = await prisma.staff.create({
    data: { full_name: 'พนักงานทดสอบ', position: 'ผู้ดูแล', phone: '0823456789' },
  })
  await prisma.account.create({
    data: { email: 'staff@test.local', password_hash, role: 'STAFF', staff_id: staff.staff_id },
  })

  await prisma.account.create({
    data: { email: 'admin@test.local', password_hash, role: 'ADMIN' },
  })

  return { roomType, room, tenant, staff }
}
