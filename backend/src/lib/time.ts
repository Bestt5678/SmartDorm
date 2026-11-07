import { env } from '../config/env'

function datePart(
  parts: Intl.DateTimeFormatPart[],
  type: 'year' | 'month' | 'day',
) {
  const match = parts.find((part) => part.type === type)
  if (!match) {
    throw new Error(`ไม่สามารถอ่านค่า ${type} จาก timezone ได้`)
  }
  return Number(match.value)
}

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: datePart(parts, 'year'),
    month: datePart(parts, 'month'),
    day: datePart(parts, 'day'),
  }
}

export function monthStartInTimeZone(date: Date, timeZone: string) {
  const { year, month } = zonedDateParts(date, timeZone)
  return new Date(Date.UTC(year, month - 1, 1))
}

export function todayInTimeZone(date: Date, timeZone: string) {
  const { year, month, day } = zonedDateParts(date, timeZone)
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * วันนี้ตาม APP_TIMEZONE สำหรับคอลัมน์ @db.Date (booking_date, invoice_date, payment_date, request_date)
 * ไม่ใช้ @default(now()) ของ Prisma เพราะได้วันที่ตาม UTC ซึ่งช่วง 00:00–07:00 เวลาไทยจะเป็นวันของเมื่อวาน
 */
export function appToday() {
  return todayInTimeZone(new Date(), env.APP_TIMEZONE)
}
