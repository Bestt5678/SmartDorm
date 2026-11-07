import { z } from 'zod'
import { PAYMENT_TYPES } from '../constants'
import { dateOnlySchema, idSchema, listQuerySchema, moneySchema } from './common'

const paymentStatusSchema = z.enum(['รอตรวจสอบ', 'อนุมัติแล้ว', 'ปฏิเสธ'])

const amountSchema = moneySchema.refine((value) => value > 0, 'ยอดชำระต้องมากกว่า 0')

// ผู้เช่าแนบสลิปผ่าน POST /invoices/:id/payments
export const paymentCreateSchema = z.object({
  amount: amountSchema,
  paymentType: z.enum(PAYMENT_TYPES),
  paymentDate: dateOnlySchema.optional(),
})

// STAFF/ADMIN บันทึกการรับเงินผ่าน POST /payments (อนุมัติทันที)
export const paymentRecordSchema = paymentCreateSchema.extend({
  invoiceId: idSchema,
})

export const paymentRejectSchema = z.object({
  note: z.string().trim().max(500).optional(),
})

export const paymentListQuerySchema = listQuerySchema.extend({
  invoiceId: idSchema.optional(),
  status: paymentStatusSchema.optional(),
})

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>
export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>
export type PaymentRejectInput = z.infer<typeof paymentRejectSchema>
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>
