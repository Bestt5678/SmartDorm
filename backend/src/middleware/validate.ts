import type { Request, RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { toCamel } from '../lib/case'
import { AppError } from '../lib/http'

type Schemas = {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      // API รับ snake_case (และยังรับ camelCase ได้) แล้วแปลงเป็น camelCase ก่อนส่งให้ schema/service
      const body = toCamel(req.body ?? {})
      const query = toCamel({ ...req.query })
      req.validated = {
        body: schemas.body ? schemas.body.parse(body) : body,
        query: schemas.query ? schemas.query.parse(query) : query,
        params: schemas.params ? schemas.params.parse(req.params) : req.params,
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function validated<T>(req: Request, key: 'body' | 'query' | 'params'): T {
  if (!req.validated) {
    throw new AppError(500, 'ไม่พบข้อมูลที่ผ่านการตรวจสอบ')
  }
  return req.validated[key] as T
}
