import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive()

/** list endpoint คืนเป็น array ตรงๆ ตามที่ frontend ใช้ ส่วน `limit` ใช้จำกัดจำนวนได้ถ้าต้องการ */
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

export const dateOnlyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')

export const moneySchema = z.coerce.number().min(0, 'จำนวนเงินต้องไม่ติดลบ')

export const optionalPhone = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().regex(/^\d{9,10}$/, 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก').optional(),
)

export const optionalText = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().max(2000).optional(),
)

/** ใส่ `take` ให้ Prisma เฉพาะเมื่อมีการระบุ limit (ไม่ระบุ = คืนทั้งหมด) */
export function limitArgs(limit: number | undefined): { take?: number } {
  return limit === undefined ? {} : { take: limit }
}
