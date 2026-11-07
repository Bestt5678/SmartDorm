import { z } from 'zod'
import { dateOnlySchema, idSchema, moneySchema, listQuerySchema } from './common'

const invoiceStatusSchema = z.enum([
  'ค้างชำระ',
  'รอตรวจสอบ',
  'ชำระบางส่วน',
  'ชำระแล้ว',
  'ยกเลิก',
])
const invoiceTypeSchema = z.enum(['RENT', 'DEPOSIT', 'UTILITY', 'OTHER'])

export const invoiceListQuerySchema = listQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
  type: invoiceTypeSchema.optional(),
  contractId: idSchema.optional(),
  tenantId: idSchema.optional(),
})

export const invoiceCreateSchema = z.object({
  contractId: idSchema,
  meterId: idSchema.optional(),
  dueDate: dateOnlySchema,
  rentAmount: moneySchema.default(0),
  waterAmount: moneySchema.default(0),
  electricAmount: moneySchema.default(0),
  depositAmount: moneySchema.default(0),
  invoiceType: invoiceTypeSchema.default('RENT'),
})

export const invoiceUpdateSchema = z
  .object({
    dueDate: dateOnlySchema.optional(),
    rentAmount: moneySchema.optional(),
    waterAmount: moneySchema.optional(),
    electricAmount: moneySchema.optional(),
    depositAmount: moneySchema.optional(),
    invoiceType: invoiceTypeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' })

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>
