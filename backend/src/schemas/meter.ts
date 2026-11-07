import { z } from 'zod'
import { dateOnlySchema, idSchema, moneySchema, listQuerySchema } from './common'

export const meterListQuerySchema = listQuerySchema.extend({
  roomId: idSchema.optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

const meterFieldsSchema = z.object({
  roomId: idSchema,
  meterMonth: dateOnlySchema,
  waterUnit: moneySchema,
  electricUnit: moneySchema,
})

export const meterCreateSchema = meterFieldsSchema.extend({
  waterUnit: moneySchema.default(0),
  electricUnit: moneySchema.default(0),
})

// ไม่ derive จาก meterCreateSchema เพราะ Zod 4 ยังใส่ค่า .default() ให้ใน .partial()
export const meterUpdateSchema = meterFieldsSchema.partial()

export type MeterListQuery = z.infer<typeof meterListQuerySchema>
export type MeterCreateInput = z.infer<typeof meterCreateSchema>
