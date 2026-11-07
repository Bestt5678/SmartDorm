import { z } from 'zod'
import { idSchema, moneySchema, listQuerySchema } from './common'

const roomStatusSchema = z.enum(['ว่าง', 'ไม่ว่าง', 'ปิดปรับปรุง'])

export const roomListQuerySchema = listQuerySchema.extend({
  typeId: idSchema.optional(),
  floor: z.coerce.number().int().min(1).optional(),
  status: roomStatusSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  q: z.string().trim().max(50).optional(),
})

const roomFieldsSchema = z.object({
  roomNumber: z.string().trim().min(1, 'กรุณากรอกเลขห้อง').max(10),
  floor: z.coerce.number().int().min(1, 'ชั้นต้องมากกว่า 0'),
  roomTypeId: idSchema,
  monthlyRate: moneySchema,
  status: roomStatusSchema,
})

export const roomCreateSchema = roomFieldsSchema.extend({
  status: roomStatusSchema.default('ว่าง'),
})

// ไม่ derive จาก roomCreateSchema เพราะ Zod 4 ยังใส่ค่า .default() ให้ใน .partial()
// ซึ่งจะทำให้ PATCH ที่ไม่ได้ส่ง status รีเซ็ตห้องเป็น 'ว่าง'
export const roomUpdateSchema = roomFieldsSchema.partial()

export const roomTypeCreateSchema = z.object({
  typeName: z.string().trim().min(1, 'กรุณากรอกชื่อประเภทห้อง').max(50),
  basePrice: moneySchema,
  description: z.string().trim().max(2000).optional(),
  imageUrls: z.array(z.string().url('URL รูปภาพไม่ถูกต้อง')).max(8).optional(),
  amenities: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
})

export const roomTypeUpdateSchema = roomTypeCreateSchema.partial()

export type RoomListQuery = z.infer<typeof roomListQuerySchema>
export type RoomCreateInput = z.infer<typeof roomCreateSchema>
export type RoomUpdateInput = z.infer<typeof roomUpdateSchema>
export type RoomTypeCreateInput = z.infer<typeof roomTypeCreateSchema>
