import { z } from 'zod'
import { optionalPhone } from './common'

const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง').max(100).optional(),
)

export const tenantCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล').max(100),
  idCardNo: z.string().regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'),
  phone: optionalPhone,
  email: optionalEmail,
})

export const tenantUpdateSchema = tenantCreateSchema.partial()

// email + password เป็น optional: ถ้าใส่ จะสร้างบัญชีให้พนักงานเข้าสู่ระบบได้
export const staffCreateSchema = z
  .object({
    fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล').max(100),
    position: z.string().trim().min(1, 'กรุณากรอกตำแหน่ง').max(50),
    phone: optionalPhone,
    email: optionalEmail,
    password: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').max(72).optional(),
    ),
  })
  .refine((value) => Boolean(value.email) === Boolean(value.password), {
    message: 'ต้องกรอกทั้งอีเมลและรหัสผ่าน หรือเว้นว่างทั้งคู่',
    path: ['password'],
  })

export const staffUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  position: z.string().trim().min(1).max(50).optional(),
  phone: optionalPhone,
})

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>
export type StaffCreateInput = z.infer<typeof staffCreateSchema>
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>
