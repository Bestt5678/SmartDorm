import { z } from 'zod'
import { dateOnlySchema, idSchema, listQuerySchema, moneySchema } from './common'

export const contractListQuerySchema = listQuerySchema

export type ContractListQuery = z.infer<typeof contractListQuerySchema>

// STAFF/ADMIN สร้างสัญญาจากการจองโดยตรง (เทียบเท่ากับการยืนยันการจอง)
export const contractCreateSchema = z
  .object({
    bookingId: idSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    deposit: moneySchema,
    dueDate: dateOnlySchema.optional(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: 'วันสิ้นสุดสัญญาต้องมากกว่าวันเริ่มสัญญา',
    path: ['endDate'],
  })

export type ContractCreateInput = z.infer<typeof contractCreateSchema>

export const contractUpdateSchema = z
  .object({
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    deposit: moneySchema.optional(),
  })
  .refine(
    (value) => {
      if (!value.startDate || !value.endDate) return true
      return value.endDate > value.startDate
    },
    { message: 'วันสิ้นสุดสัญญาต้องมากกว่าวันเริ่มสัญญา', path: ['endDate'] },
  )

export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>
