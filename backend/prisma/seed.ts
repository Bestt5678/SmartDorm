import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import { ROOM_STATUS } from '../src/constants'

async function main() {
  console.log('Seeding SmartDorm...')

  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.repairRequest.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.utilityMeter.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.account.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.room.deleteMany()
  await prisma.roomType.deleteMany()

  const fanType = await prisma.roomType.create({
    data: {
      typeName: 'พัดลม',
      basePrice: 3200,
      description: 'ห้องพัดลมขนาดกำลังดี ระบายอากาศดี เหมาะกับผู้ที่ชอบอากาศธรรมชาติ',
      imageUrls: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      ],
      amenities: ['เตียง 5 ฟุต', 'โต๊ะอ่านหนังสือ', 'ตู้เสื้อผ้า', 'Wi-Fi', 'พัดลมติดเพดาน'],
    },
  })

  const airType = await prisma.roomType.create({
    data: {
      typeName: 'แอร์',
      basePrice: 4500,
      description: 'ห้องแอร์พร้อมเฟอร์นิเจอร์ครบ สะดวกสบายสำหรับการพักผ่อน',
      imageUrls: [
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      ],
      amenities: ['เตียง 6 ฟุต', 'แอร์', 'โต๊ะอ่านหนังสือ', 'ตู้เสื้อผ้า', 'Wi-Fi', 'ระเบียง'],
    },
  })

  const premiumType = await prisma.roomType.create({
    data: {
      typeName: 'แอร์ + น้ำร้อน',
      basePrice: 5500,
      description: 'ห้องพรีเมียม แอร์และเครื่องทำน้ำอุ่น พร้อมพื้นที่กว้างขวาง',
      imageUrls: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=80',
      ],
      amenities: [
        'เตียง 6 ฟุต',
        'แอร์',
        'เครื่องทำน้ำอุ่น',
        'โต๊ะอ่านหนังสือ',
        'ตู้เสื้อผ้า',
        'Wi-Fi',
        'ระเบียง',
        'ตู้เย็น',
      ],
    },
  })

  const floorPlans: Array<{ floor: number; rooms: number[] }> = [
    { floor: 1, rooms: [101, 102, 103, 104, 105, 106] },
    { floor: 2, rooms: [201, 202, 203, 204, 205, 206, 207, 208] },
    { floor: 3, rooms: [301, 302, 303, 304, 305, 306, 307, 308] },
    { floor: 4, rooms: [401, 402, 403, 404, 405, 406, 407, 408] },
    { floor: 5, rooms: [501, 502, 503, 504, 505, 506] },
  ]

  for (const plan of floorPlans) {
    for (const roomNumber of plan.rooms) {
      const lastDigit = roomNumber % 10
      const roomType = lastDigit <= 3 ? premiumType : lastDigit % 2 === 0 ? airType : fanType
      const rateAdjustment = (plan.floor - 1) * 100
      const monthlyRate = Number(roomType.basePrice) + rateAdjustment

      await prisma.room.create({
        data: {
          roomNumber: String(roomNumber),
          floor: plan.floor,
          roomTypeId: roomType.roomTypeId,
          monthlyRate,
          status: ROOM_STATUS.AVAILABLE,
        },
      })
    }
  }

  const staff1 = await prisma.staff.create({
    data: { fullName: 'ดูแลหอพัก หนึ่ง', position: 'ผู้ดูแลหอพัก', phone: '0891112222' },
  })
  await prisma.staff.create({
    data: { fullName: 'ช่าง หนึ่ง', position: 'ช่างซ่อมบำรุง', phone: '0893334444' },
  })
  await prisma.staff.create({
    data: { fullName: 'แม่บ้าน หนึ่ง', position: 'แม่บ้าน', phone: '0895556666' },
  })

  const tenant1 = await prisma.tenant.create({
    data: {
      fullName: 'เช่า หนึ่ง',
      idCardNo: '1234567890123',
      phone: '0812345678',
      email: 'tenant@smartdorm.local',
    },
  })
  await prisma.tenant.create({
    data: {
      fullName: 'เช่า สอง',
      idCardNo: '1234567890124',
      phone: '0823456789',
      email: 'tenant2@example.com',
    },
  })
  await prisma.tenant.create({
    data: {
      fullName: 'เช่า สาม',
      idCardNo: '1234567890125',
      phone: '0834567890',
      email: 'tenant3@example.com',
    },
  })

  await prisma.tenant.create({
    data: {
      fullName: 'เช่า สี่',
      idCardNo: '1234567890126',
      phone: '0845678901',
      email: 'tenant4@example.com',
    },
  })

  const [adminPassword, staffPassword, tenantPassword] = await Promise.all([
    bcrypt.hash('12345678', 10),
    bcrypt.hash('12345678', 10),
    bcrypt.hash('12345678', 10),
  ])

  await prisma.account.create({
    data: {
      email: 'admin@smartdorm.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })

  await prisma.account.create({
    data: {
      email: 'staff@smartdorm.local',
      passwordHash: staffPassword,
      role: 'STAFF',
      staffId: staff1.staffId,
    },
  })

  await prisma.account.create({
    data: {
      email: 'tenant@smartdorm.local',
      passwordHash: tenantPassword,
      role: 'TENANT',
      tenantId: tenant1.tenantId,
    },
  })

  console.log('Seed complete')
  console.log('Accounts:')
  console.log('  admin@smartdorm.local / 12345678')
  console.log('  staff@smartdorm.local / 12345678')
  console.log('  tenant@smartdorm.local / 12345678')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
