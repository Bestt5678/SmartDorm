import { z } from 'zod'
import { idSchema, listQuerySchema } from './common'

const repairStatusSchema = z.enum(['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ยกเลิก'])

// staffId และ status ใช้ได้เฉพาะ STAFF/ADMIN (ผู้เช่าส่งมาจะถูกปฏิเสธใน service)
export const repairCreateSchema = z.object({
  roomId: idSchema,
  description: z.string().trim().min(5, 'กรุณาอธิบายอาการอย่างน้อย 5 ตัวอักษร').max(2000),
  staffId: idSchema.optional(),
  status: repairStatusSchema.optional(),
})

export const repairUpdateSchema = z
  .object({
    status: repairStatusSchema.optional(),
    staffId: idSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' })

export const repairListQuerySchema = listQuerySchema.extend({
  status: repairStatusSchema.optional(),
  roomId: idSchema.optional(),
  staffId: idSchema.optional(),
})

export type RepairCreateInput = z.infer<typeof repairCreateSchema>
export type RepairListQuery = z.infer<typeof repairListQuerySchema>
export type RepairUpdateInput = z.infer<typeof repairUpdateSchema>
