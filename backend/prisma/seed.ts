import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const date = (text: string) => new Date(text)

async function main() {
  console.log('Seeding SmartDorm...')

  await prisma.$executeRawUnsafe(
    'TRUNCATE account, payment, invoice, utility_meter, repair_request, staff, contract, booking, tenant, room, room_type RESTART IDENTITY CASCADE',
  )

  await prisma.roomType.createMany({
    data: [
      {
        room_type_id: 1,
        type_name: 'พัดลม',
        base_price: 3200,
        description: 'ห้องพัดลมขนาดกำลังดี ระบายอากาศดี เหมาะกับผู้ที่ชอบอากาศธรรมชาติ',
        image_urls: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        ],
        amenities: ['เตียง 5 ฟุต', 'โต๊ะอ่านหนังสือ', 'ตู้เสื้อผ้า', 'Wi-Fi', 'พัดลมติดเพดาน'],
      },
      {
        room_type_id: 2,
        type_name: 'แอร์',
        base_price: 4500,
        description: 'ห้องแอร์พร้อมเฟอร์นิเจอร์ครบ สะดวกสบายสำหรับการพักผ่อน',
        image_urls: [
          'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        ],
        amenities: ['เตียง 6 ฟุต', 'แอร์', 'โต๊ะอ่านหนังสือ', 'ตู้เสื้อผ้า', 'Wi-Fi', 'ระเบียง'],
      },
      {
        room_type_id: 3,
        type_name: 'แอร์ + น้ำร้อน',
        base_price: 5500,
        description: 'ห้องพรีเมียม แอร์และเครื่องทำน้ำอุ่น พร้อมพื้นที่กว้างขวาง',
        image_urls: [
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
    ],
  })

  // [room_id, room_number, floor, room_type_id, monthly_rate, status]
  const rooms: [number, string, number, number, number, string][] = [
    [1, '101', 1, 3, 5500, 'ว่าง'],
    [2, '102', 1, 3, 5500, 'ไม่ว่าง'],
    [3, '103', 1, 3, 5500, 'ว่าง'],
    [4, '104', 1, 2, 4500, 'ไม่ว่าง'],
    [5, '105', 1, 1, 3200, 'ว่าง'],
    [6, '106', 1, 2, 4500, 'ว่าง'],
    [7, '201', 2, 3, 5600, 'ว่าง'],
    [8, '202', 2, 3, 5600, 'ว่าง'],
    [9, '203', 2, 3, 5600, 'ไม่ว่าง'],
    [10, '204', 2, 2, 4600, 'ว่าง'],
    [11, '205', 2, 1, 3300, 'ว่าง'],
    [12, '206', 2, 2, 4600, 'ว่าง'],
    [13, '207', 2, 1, 3300, 'ว่าง'],
    [14, '208', 2, 2, 4600, 'ว่าง'],
    [15, '301', 3, 3, 5700, 'ไม่ว่าง'],
    [16, '302', 3, 3, 5700, 'ว่าง'],
    [17, '303', 3, 3, 5700, 'ว่าง'],
    [18, '304', 3, 2, 4700, 'ว่าง'],
    [19, '305', 3, 1, 3400, 'ปิดปรับปรุง'],
    [20, '306', 3, 2, 4700, 'ว่าง'],
    [21, '307', 3, 1, 3400, 'ไม่ว่าง'],
    [22, '308', 3, 2, 4700, 'ว่าง'],
    [23, '401', 4, 3, 5800, 'ไม่ว่าง'],
    [24, '402', 4, 3, 5800, 'ว่าง'],
    [25, '403', 4, 3, 5800, 'ว่าง'],
    [26, '404', 4, 2, 4800, 'ไม่ว่าง'],
    [27, '405', 4, 1, 3500, 'ว่าง'],
    [28, '406', 4, 2, 4800, 'ว่าง'],
    [29, '407', 4, 1, 3500, 'ไม่ว่าง'],
    [30, '408', 4, 2, 4800, 'ว่าง'],
    [31, '501', 5, 3, 5900, 'ว่าง'],
    [32, '502', 5, 3, 5900, 'ว่าง'],
    [33, '503', 5, 3, 5900, 'ว่าง'],
    [34, '504', 5, 2, 4900, 'ไม่ว่าง'],
    [35, '505', 5, 1, 3600, 'ว่าง'],
    [36, '506', 5, 2, 4900, 'ปิดปรับปรุง'],
  ]
  await prisma.room.createMany({
    data: rooms.map(([room_id, room_number, floor, room_type_id, monthly_rate, status]) => ({
      room_id,
      room_number,
      floor,
      room_type_id,
      monthly_rate,
      status,
    })),
  })

  // [tenant_id, full_name, id_card_no, phone, email, created_at]
  const tenants: [number, string, string, string, string, string][] = [
    [
      1,
      'เช่า หนึ่ง',
      '1074926520719',
      '0652542566',
      'tenant1@smartdorm.local',
      '2025-11-01T12:31:00',
    ],
    [
      2,
      'เช่า สอง',
      '1996132429727',
      '0872728351',
      'tenant2@smartdorm.local',
      '2025-11-10T13:20:00',
    ],
    [
      3,
      'เช่า สาม',
      '1293064348929',
      '0976707821',
      'tenant3@smartdorm.local',
      '2025-11-19T17:43:00',
    ],
    [
      4,
      'เช่า สี่',
      '1003110621612',
      '0876596394',
      'tenant4@smartdorm.local',
      '2025-11-28T12:00:00',
    ],
    [
      5,
      'เช่า ห้า',
      '1839472500855',
      '0835761356',
      'tenant5@smartdorm.local',
      '2025-12-07T13:18:00',
    ],
    [6, 'เช่า หก', '3370674306319', '0889266855', 'tenant6@smartdorm.local', '2025-12-16T17:22:00'],
    [
      7,
      'เช่า เจ็ด',
      '1739388333791',
      '0970958797',
      'tenant7@smartdorm.local',
      '2025-12-25T17:24:00',
    ],
    [
      8,
      'เช่า แปด',
      '3417530238974',
      '0969350406',
      'tenant8@smartdorm.local',
      '2026-01-03T15:02:00',
    ],
    [
      9,
      'เช่า เก้า',
      '1605472225712',
      '0855907820',
      'tenant9@smartdorm.local',
      '2026-01-12T17:01:00',
    ],
    [
      10,
      'เช่า สิบ',
      '1221630173220',
      '0808278467',
      'tenant10@smartdorm.local',
      '2026-01-21T17:39:00',
    ],
  ]
  await prisma.tenant.createMany({
    data: tenants.map(([tenant_id, full_name, id_card_no, phone, email, created_at]) => ({
      tenant_id,
      full_name,
      id_card_no,
      phone,
      email,
      created_at: date(created_at),
    })),
  })

  // [booking_id, room_id, tenant_id, booking_date, move_in_date, status]
  const bookings: [number, number, number, string, string, string][] = [
    [1, 1, 1, '2025-11-20', '2025-12-01', 'เสร็จสิ้น'],
    [2, 5, 2, '2025-11-25', '2025-12-01', 'เสร็จสิ้น'],
    [3, 2, 3, '2025-12-15', '2026-01-01', 'ยืนยันแล้ว'],
    [4, 4, 4, '2025-12-20', '2026-01-01', 'ยืนยันแล้ว'],
    [5, 9, 5, '2026-02-20', '2026-03-01', 'ยืนยันแล้ว'],
    [6, 15, 6, '2026-04-02', '2026-05-01', 'ยืนยันแล้ว'],
    [7, 21, 7, '2026-05-22', '2026-06-01', 'ยืนยันแล้ว'],
    [8, 23, 8, '2026-06-09', '2026-07-01', 'ยืนยันแล้ว'],
    [9, 14, 2, '2026-06-02', '2026-07-01', 'ยกเลิก'],
    [10, 26, 9, '2026-07-14', '2026-08-01', 'ยืนยันแล้ว'],
    [11, 31, 10, '2026-09-15', '2026-10-01', 'ยกเลิก'],
    [12, 34, 1, '2026-09-05', '2026-10-01', 'ยืนยันแล้ว'],
    [13, 29, 10, '2026-11-02', '2026-12-01', 'รอดำเนินการ'],
  ]
  await prisma.booking.createMany({
    data: bookings.map(([booking_id, room_id, tenant_id, booking_date, move_in_date, status]) => ({
      booking_id,
      room_id,
      tenant_id,
      booking_date: date(booking_date),
      move_in_date: date(move_in_date),
      status,
    })),
  })

  // [contract_id, booking_id, start_date, end_date, deposit] เงินมัดจำ = ค่าเช่า 2 เดือน
  const contracts: [number, number, string, string, number][] = [
    [1, 1, '2025-12-01', '2026-06-01', 11000],
    [2, 2, '2025-12-01', '2026-06-01', 6400],
    [3, 3, '2026-01-01', '2027-01-01', 11000],
    [4, 4, '2026-01-01', '2027-01-01', 9000],
    [5, 5, '2026-03-01', '2027-03-01', 11200],
    [6, 6, '2026-05-01', '2027-05-01', 11400],
    [7, 7, '2026-06-01', '2026-12-01', 6800],
    [8, 8, '2026-07-01', '2027-01-01', 11600],
    [9, 10, '2026-08-01', '2027-08-01', 9600],
    [10, 12, '2026-10-01', '2027-10-01', 9800],
  ]
  await prisma.contract.createMany({
    data: contracts.map(([contract_id, booking_id, start_date, end_date, deposit]) => ({
      contract_id,
      booking_id,
      start_date: date(start_date),
      end_date: date(end_date),
      deposit,
    })),
  })

  await prisma.staff.createMany({
    data: [
      { staff_id: 1, full_name: 'พนักงาน หนึ่ง', position: 'ผู้จัดการหอพัก', phone: '0891112222' },
      { staff_id: 2, full_name: 'พนักงาน สอง', position: 'ผู้ดูแลหอพัก', phone: '0892223333' },
      { staff_id: 3, full_name: 'พนักงาน สาม', position: 'ช่างซ่อมบำรุง', phone: '0893334444' },
      { staff_id: 4, full_name: 'พนักงาน สี่', position: 'ช่างซ่อมบำรุง', phone: '0894445555' },
      { staff_id: 5, full_name: 'พนักงาน ห้า', position: 'แม่บ้าน', phone: '0895556666' },
      { staff_id: 6, full_name: 'พนักงาน หก', position: 'เจ้าหน้าที่การเงิน', phone: '0896667777' },
    ],
  })

  // [meter_id, room_id, meter_month, water_unit, electric_unit]
  const meters: [number, number, string, number, number][] = [
    [1, 1, '2026-05-01', 6, 302],
    [2, 5, '2026-05-01', 6, 91],
    [3, 2, '2026-10-01', 9, 244],
    [4, 4, '2026-10-01', 3, 139],
    [5, 9, '2026-10-01', 4, 200],
    [6, 15, '2026-10-01', 6, 227],
    [7, 21, '2026-10-01', 8, 71],
    [8, 23, '2026-10-01', 5, 444],
    [9, 26, '2026-10-01', 4, 157],
    [10, 34, '2026-10-01', 6, 146],
  ]
  await prisma.utilityMeter.createMany({
    data: meters.map(([meter_id, room_id, meter_month, water_unit, electric_unit]) => ({
      meter_id,
      room_id,
      meter_month: date(meter_month),
      water_unit,
      electric_unit,
    })),
  })

  // [invoice_id, contract_id, meter_id, invoice_date, due_date, rent, water, electric, status]
  const invoices: [number, number, number, string, string, number, number, number, string][] = [
    [1, 1, 1, '2026-06-01', '2026-06-06', 5500, 108, 2114, 'ชำระแล้ว'],
    [2, 2, 2, '2026-06-01', '2026-06-06', 3200, 108, 637, 'ชำระแล้ว'],
    [3, 3, 3, '2026-11-01', '2026-11-06', 5500, 162, 1952, 'ค้างชำระ'],
    [4, 4, 4, '2026-11-01', '2026-11-06', 4500, 54, 1112, 'ชำระแล้ว'],
    [5, 5, 5, '2026-11-01', '2026-11-06', 5600, 72, 1600, 'ค้างชำระ'],
    [6, 6, 6, '2026-11-01', '2026-11-06', 5700, 108, 1816, 'ชำระแล้ว'],
    [7, 7, 7, '2026-11-01', '2026-11-06', 3400, 144, 568, 'ชำระบางส่วน'],
    [8, 8, 8, '2026-11-01', '2026-11-06', 5800, 90, 3552, 'ชำระแล้ว'],
    [9, 9, 9, '2026-11-01', '2026-11-06', 4800, 72, 1256, 'ชำระบางส่วน'],
    [10, 10, 10, '2026-11-01', '2026-11-06', 4900, 108, 1168, 'ชำระแล้ว'],
  ]
  await prisma.invoice.createMany({
    data: invoices.map(
      ([
        invoice_id,
        contract_id,
        meter_id,
        invoice_date,
        due_date,
        rent,
        water,
        electric,
        status,
      ]) => ({
        invoice_id,
        contract_id,
        meter_id,
        invoice_date: date(invoice_date),
        due_date: date(due_date),
        rent_amount: rent,
        water_amount: water,
        electric_amount: electric,
        status,
      }),
    ),
  })

  // [payment_id, invoice_id, payment_date, amount, payment_type] ทุกรายการเป็น "อนุมัติแล้ว"
  const payments: [number, number, string, number, string][] = [
    [1, 1, '2026-06-03', 7722, 'พร้อมเพย์'],
    [2, 2, '2026-06-02', 2000, 'เงินสด'],
    [3, 2, '2026-06-05', 1945, 'เงินสด'],
    [4, 4, '2026-11-02', 3000, 'โอนเงิน'],
    [5, 4, '2026-11-05', 2666, 'โอนเงิน'],
    [6, 6, '2026-11-03', 7624, 'พร้อมเพย์'],
    [7, 7, '2026-11-05', 3000, 'พร้อมเพย์'],
    [8, 8, '2026-11-08', 9442, 'บัตรเครดิต'],
    [9, 9, '2026-11-06', 3000, 'เงินสด'],
    [10, 10, '2026-11-02', 6176, 'โอนเงิน'],
  ]
  await prisma.payment.createMany({
    data: payments.map(([payment_id, invoice_id, payment_date, amount, payment_type]) => ({
      payment_id,
      invoice_id,
      payment_date: date(payment_date),
      amount,
      payment_type,
    })),
  })

  // [repair_id, room_id, staff_id, request_date, description, status]
  const repairs: [number, number, number | null, string, string, string][] = [
    [1, 5, 4, '2026-02-18', 'หลอดไฟห้องน้ำขาด', 'เสร็จสิ้น'],
    [2, 4, 3, '2026-03-10', 'แอร์ไม่เย็น มีน้ำหยด', 'เสร็จสิ้น'],
    [3, 1, 3, '2026-03-25', 'ชักโครกกดไม่ลง', 'เสร็จสิ้น'],
    [4, 21, 4, '2026-07-21', 'กลอนหน้าต่างระเบียงเสีย', 'เสร็จสิ้น'],
    [5, 9, 3, '2026-08-09', 'เบรกเกอร์ตัดบ่อย', 'เสร็จสิ้น'],
    [6, 15, 4, '2026-09-14', 'น้ำไหลอ่อนจากฝักบัว', 'เสร็จสิ้น'],
    [7, 26, 3, '2026-10-03', 'แอร์ไม่เย็น', 'เสร็จสิ้น'],
    [8, 34, 3, '2026-11-04', 'ไฟทางเดินหน้าห้องกระพริบ', 'กำลังดำเนินการ'],
    [9, 2, null, '2026-11-07', 'ฝักบัวรั่วซึม', 'รอดำเนินการ'],
    [10, 23, null, '2026-11-08', 'เบรกเกอร์ตัดเวลาเปิดแอร์พร้อมไมโครเวฟ', 'รอดำเนินการ'],
  ]
  await prisma.repairRequest.createMany({
    data: repairs.map(([repair_id, room_id, staff_id, request_date, description, status]) => ({
      repair_id,
      room_id,
      staff_id,
      request_date: date(request_date),
      description,
      status,
    })),
  })

  const password = await bcrypt.hash('12345678', 10)
  await prisma.account.createMany({
    data: [
      { email: 'admin@smartdorm.local', password_hash: password, role: 'ADMIN' },
      { email: 'staff@smartdorm.local', password_hash: password, role: 'STAFF', staff_id: 2 },
      { email: 'tenant@smartdorm.local', password_hash: password, role: 'TENANT', tenant_id: 3 },
    ],
  })

  // ใส่ id เองตอนสร้าง จึงต้องตั้งเลขรันให้ต่อจากค่าสูงสุด ไม่งั้นเพิ่มข้อมูลใหม่จะชน id เดิม
  const tables = [
    ['room_type', 'room_type_id'],
    ['room', 'room_id'],
    ['tenant', 'tenant_id'],
    ['booking', 'booking_id'],
    ['contract', 'contract_id'],
    ['staff', 'staff_id'],
    ['utility_meter', 'meter_id'],
    ['invoice', 'invoice_id'],
    ['payment', 'payment_id'],
    ['repair_request', 'repair_id'],
  ]
  for (const [table, column] of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), (SELECT MAX(${column}) FROM ${table}))`,
    )
  }

  console.log('Seed complete')
  console.log('Accounts:')
  console.log('  admin@smartdorm.local / 12345678')
  console.log('  staff@smartdorm.local / 12345678 (พนักงาน สอง)')
  console.log('  tenant@smartdorm.local / 12345678 (เช่า สาม ห้อง 102)')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
