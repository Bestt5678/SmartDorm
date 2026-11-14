export function money(value: any) {
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function showDate(value: any) {
  if (!value) return '-'
  return String(value).slice(0, 10)
}

// ไม่ใช้ toISOString() เพราะเป็นเวลา UTC ช่วงตี 0 ถึง 7 โมงเช้าจะได้วันของเมื่อวาน
export function today() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function oneYearLater(date: string) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
