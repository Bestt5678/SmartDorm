import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { Role } from '../constants'
import { AppError } from '../lib/http'
import { verifyToken, type AuthPayload } from '../lib/jwt'

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
      validated?: {
        body: unknown
        query: unknown
        params: unknown
      }
    }
  }
}

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'กรุณาเข้าสู่ระบบ'))
    return
  }

  try {
    req.auth = verifyToken(header.slice(7))
    next()
  } catch {
    next(new AppError(401, 'Token ไม่ถูกต้องหรือหมดอายุ'))
  }
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError(401, 'กรุณาเข้าสู่ระบบ'))
      return
    }
    if (!roles.includes(req.auth.role)) {
      next(new AppError(403, 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้'))
      return
    }
    next()
  }
}

export function currentAuth(req: Request): AuthPayload {
  if (!req.auth) {
    throw new AppError(401, 'กรุณาเข้าสู่ระบบ')
  }
  return req.auth
}
