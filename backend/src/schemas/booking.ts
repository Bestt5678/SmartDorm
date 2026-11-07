import { z } from 'zod'
import { dateOnlySchema, idSchema, listQuerySchema, moneySchema } from './common'

const bookingStatusSchema = z.enum(['รอดำเนินการ', 'ยืนยันแล้ว', 'ยกเลิก', 'เสร็จสิ้น'])

// TENANT จองให้ตัวเอง (ไม่ต้องส่ง tenantId) ส่วน STAFF/ADMIN ต้องระบุ tenantId
export const bookingCreateSchema = z.object({
  roomId: idSchema,
  tenantId: idSchema.optional(),
  moveInDate: dateOnlySchema,
})

export const bookingListQuerySchema = listQuerySchema.extend({
  status: bookingStatusSchema.optional(),
  roomId: idSchema.optional(),
  tenantId: idSchema.optional(),
})

export const bookingConfirmSchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    deposit: moneySchema,
    dueDate: dateOnlySchema.optional(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: 'วันสิ้นสุดสัญญาต้องมากกว่าวันเริ่มสัญญา',
    path: ['endDate'],
  })

export const bookingStatusSchemaBody = z.object({
  status: bookingStatusSchema,
})

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>
export type BookingConfirmInput = z.infer<typeof bookingConfirmSchema>
