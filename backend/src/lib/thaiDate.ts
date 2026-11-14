// ใช้วันที่ตามเวลาไทย ไม่ใช้ new Date() ตรงๆ เพราะเป็นเวลา UTC
// ช่วง 00:00–07:00 ของไทยจะได้วันที่ของเมื่อวาน
function thaiDateParts(date: Date) {
  const text = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // ได้รูปแบบ 2026-11-13
  const year = Number(text.slice(0, 4))
  const month = Number(text.slice(5, 7))
  const day = Number(text.slice(8, 10))
  return { year, month, day }
}

export function todayThai() {
  const { year, month, day } = thaiDateParts(new Date())
  return new Date(Date.UTC(year, month - 1, day))
}

export function monthStartThai() {
  const { year, month } = thaiDateParts(new Date())
  return new Date(Date.UTC(year, month - 1, 1))
}

export function toDate(text: string) {
  return new Date(text + 'T00:00:00.000Z')
}

export function isDateText(text: any) {
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text)
}
