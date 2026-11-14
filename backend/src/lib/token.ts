import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export type TokenData = {
  account_id: number
  email: string
  role: string
  tenant_id: number | null
  staff_id: number | null
}

export function createToken(data: TokenData) {
  return jwt.sign(data, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any })
}

export function readToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as TokenData
}
