import bcrypt from 'bcryptjs'
import type { Role } from '../constants'
import { AppError } from '../lib/http'
import { signToken, type AuthPayload } from '../lib/jwt'
import { prisma } from '../lib/prisma'
import type { LoginInput, ProfileUpdateInput, RegisterInput } from '../schemas/auth'

const ROLE_LABEL: Record<Role, string> = {
  TENANT: 'ผู้เช่า',
  STAFF: 'พนักงาน',
  ADMIN: 'ผู้ดูแล',
}

type AccountWithPeople = {
  accountId: number
  email: string
  role: string
  tenantId: number | null
  staffId: number | null
  tenant?: { fullName: string; phone: string | null } | null
  staff?: { fullName: string } | null
}

export function payloadFor(account: AccountWithPeople): AuthPayload {
  return {
    accountId: account.accountId,
    email: account.email,
    role: account.role as Role,
    tenantId: account.tenantId,
    staffId: account.staffId,
  }
}

/** รูปแบบผู้ใช้ที่ frontend ใช้: { id, name, role } (+ ข้อมูลเสริมสำหรับหน้าโปรไฟล์) */
export function publicUser(account: AccountWithPeople) {
  const name =
    account.tenant?.fullName ??
    account.staff?.fullName ??
    (account.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : account.email)

  return {
    id: account.accountId,
    name,
    role: account.role as Role,
    email: account.email,
    tenantId: account.tenantId,
    staffId: account.staffId,
    phone: account.tenant?.phone ?? null,
  }
}

export function sessionFor(account: AccountWithPeople) {
  return { token: signToken(payloadFor(account)), user: publicUser(account) }
}

export async function register(input: RegisterInput) {
  const existingAccount = await prisma.account.findUnique({ where: { email: input.email } })
  if (existingAccount) {
    throw new AppError(409, 'อีเมลนี้ถูกใช้งานแล้ว')
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { idCardNo: input.idCardNo } })
  if (existingTenant) {
    throw new AppError(409, 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว')
  }

  const passwordHash = await bcrypt.hash(input.password, 10)

  const account = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        fullName: input.fullName,
        idCardNo: input.idCardNo,
        phone: input.phone ?? null,
        email: input.email,
      },
    })

    return tx.account.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'TENANT',
        tenantId: tenant.tenantId,
      },
      include: { tenant: true, staff: true },
    })
  })

  return sessionFor(account)
}

export async function login(input: LoginInput) {
  const account = await prisma.account.findUnique({
    where: { email: input.email },
    include: { tenant: true, staff: true },
  })

  if (!account) {
    throw new AppError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  }

  const matched = await bcrypt.compare(input.password, account.passwordHash)
  if (!matched) {
    throw new AppError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  }

  if (input.role && input.role !== account.role) {
    throw new AppError(
      403,
      `บัญชีนี้เป็นบัญชี${ROLE_LABEL[account.role as Role]} กรุณาเลือกแท็บ "${ROLE_LABEL[account.role as Role]}"`,
    )
  }

  return sessionFor(account)
}

async function findAccount(accountId: number) {
  const account = await prisma.account.findUnique({
    where: { accountId },
    include: { tenant: true, staff: true },
  })
  if (!account) {
    throw new AppError(404, 'ไม่พบข้อมูลบัญชี')
  }
  return account
}

export async function me(accountId: number) {
  return publicUser(await findAccount(accountId))
}

export async function updateProfile(accountId: number, input: ProfileUpdateInput) {
  const account = await findAccount(accountId)
  if (!account.tenantId) {
    throw new AppError(403, 'แก้ไขข้อมูลส่วนตัวได้เฉพาะบัญชีผู้เช่า')
  }

  if (input.idCardNo) {
    const owner = await prisma.tenant.findUnique({ where: { idCardNo: input.idCardNo } })
    if (owner && owner.tenantId !== account.tenantId) {
      throw new AppError(409, 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว')
    }
  }

  await prisma.tenant.update({
    where: { tenantId: account.tenantId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.idCardNo !== undefined ? { idCardNo: input.idCardNo } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
  })

  return publicUser(await findAccount(accountId))
}
