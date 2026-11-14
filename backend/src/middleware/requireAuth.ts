import { NextFunction, Request, Response } from 'express'
import { readToken, TokenData } from '../lib/token'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' })
  }
  try {
    const user = readToken(header.slice(7))
    ;(req as any).user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getUser(req)
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้' })
    }
    next()
  }
}

export function getUser(req: Request): TokenData {
  return (req as any).user
}
