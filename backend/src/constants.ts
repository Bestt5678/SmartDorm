export const ROLES = ['TENANT', 'STAFF', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const ROOM_STATUS = {
  AVAILABLE: 'ว่าง',
  OCCUPIED: 'ไม่ว่าง',
  MAINTENANCE: 'ปิดปรับปรุง',
} as const

export const BOOKING_STATUS = {
  PENDING: 'รอดำเนินการ',
  CONFIRMED: 'ยืนยันแล้ว',
  CANCELLED: 'ยกเลิก',
  COMPLETED: 'เสร็จสิ้น',
} as const

export const INVOICE_STATUS = {
  UNPAID: 'ค้างชำระ',
  PENDING_REVIEW: 'รอตรวจสอบ',
  PARTIAL: 'ชำระบางส่วน',
  PAID: 'ชำระแล้ว',
  CANCELLED: 'ยกเลิก',
} as const

// สถานะสำหรับแสดงผลเท่านั้น (ไม่เก็บใน DB) ดู invoiceDisplayStatus
export const INVOICE_OVERDUE_STATUS = 'เกินกำหนด'

export const PAYMENT_STATUS = {
  PENDING: 'รอตรวจสอบ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
} as const

export const INVOICE_TYPE = {
  RENT: 'RENT',
  DEPOSIT: 'DEPOSIT',
  UTILITY: 'UTILITY',
  OTHER: 'OTHER',
} as const

export const REPAIR_STATUS = {
  PENDING: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
} as const

export const PAYMENT_TYPES = ['เงินสด', 'โอนเงิน', 'บัตรเครดิต', 'พร้อมเพย์'] as const

export const ACTIVE_BOOKING_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED]
