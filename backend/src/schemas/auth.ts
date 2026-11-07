import { z } from 'zod'
import { ROLES } from '../constants'
import { optionalPhone } from './common'

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล').max(100),
  idCardNo: z.string().regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'),
  phone: optionalPhone,
  email: z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง').max(100),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').max(72),
})

// role เป็น optional: frontend ส่งบทบาทที่เลือกในแท็บมาด้วย ถ้าไม่ตรงกับบัญชีจะถูกปฏิเสธ
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
  role: z.enum(ROLES).optional(),
})

// ผู้เช่าแก้ข้อมูลตัวเอง
export const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล').max(100).optional(),
    idCardNo: z
      .string()
      .regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก')
      .optional(),
    phone: optionalPhone,
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'ไม่มีข้อมูลที่ต้องการแก้ไข',
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
