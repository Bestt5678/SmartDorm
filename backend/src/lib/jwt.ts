import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
import type { Role } from '../constants'

export type AuthPayload = {
  accountId: number
  email: string | null
  role: Role
  tenantId: number | null
  staffId: number | null
}

export function signToken(payload: AuthPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
  }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload
}
