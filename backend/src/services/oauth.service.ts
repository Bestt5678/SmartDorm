import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from '../lib/http'
import { prisma } from '../lib/prisma'
import { sessionFor } from './auth.service'

export const OAUTH_PROVIDERS = ['google', 'line', 'facebook'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  line: 'LINE',
  facebook: 'Facebook',
}

type ProviderConfig = {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  scope: string
}

type OAuthProfile = {
  providerUserId: string
  name: string | null
  // ใช้ link กับบัญชีเดิมได้เฉพาะอีเมลที่ provider ยืนยันแล้วเท่านั้น
  verifiedEmail: string | null
}

const FACEBOOK_GRAPH = 'https://graph.facebook.com/v19.0'

function providerConfig(provider: OAuthProvider): ProviderConfig | null {
  switch (provider) {
    case 'google':
      return env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            scope: 'openid email profile',
          }
        : null
    case 'line':
      return env.LINE_CHANNEL_ID && env.LINE_CHANNEL_SECRET
        ? {
            clientId: env.LINE_CHANNEL_ID,
            clientSecret: env.LINE_CHANNEL_SECRET,
            authorizeUrl: 'https://access.line.me/oauth2/v2.1/authorize',
            scope: 'openid profile email',
          }
        : null
    case 'facebook':
      return env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET
        ? {
            clientId: env.FACEBOOK_APP_ID,
            clientSecret: env.FACEBOOK_APP_SECRET,
            authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
            scope: 'public_profile,email',
          }
        : null
  }
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value)
}

export function enabledProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter((provider) => providerConfig(provider) !== null)
}

function requireConfig(provider: OAuthProvider): ProviderConfig {
  const config = providerConfig(provider)
  if (!config) {
    throw new AppError(503, `ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย ${PROVIDER_LABEL[provider]}`)
  }
  return config
}

function redirectUri(provider: OAuthProvider) {
  return `${env.OAUTH_CALLBACK_BASE_URL.replace(/\/$/, '')}/auth/${provider}/callback`
}

// state เป็น JWT อายุสั้น ใช้กัน CSRF โดยไม่ต้องเก็บ session ฝั่ง server
const STATE_AUDIENCE = 'smartdorm-oauth-state'

function signState(provider: OAuthProvider) {
  return jwt.sign({ provider, nonce: crypto.randomBytes(16).toString('hex') }, env.JWT_SECRET, {
    expiresIn: '10m',
    audience: STATE_AUDIENCE,
  })
}

function verifyState(provider: OAuthProvider, state: string | undefined) {
  if (!state) {
    throw new AppError(400, 'คำขอเข้าสู่ระบบไม่ถูกต้อง (ไม่มี state)')
  }
  try {
    const payload = jwt.verify(state, env.JWT_SECRET, { audience: STATE_AUDIENCE }) as {
      provider?: string
    }
    if (payload.provider !== provider) throw new Error('provider mismatch')
  } catch {
    throw new AppError(400, 'คำขอเข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่')
  }
}

export function buildAuthorizeUrl(provider: OAuthProvider) {
  const config = requireConfig(provider)
  const url = new URL(config.authorizeUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', redirectUri(provider))
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', signState(provider))
  return url.toString()
}

async function readJson(response: Response, step: string) {
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok || !body) {
    throw new AppError(502, `ติดต่อผู้ให้บริการไม่สำเร็จ (${step})`)
  }
  return body
}

async function exchangeCode(provider: OAuthProvider, config: ProviderConfig, code: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(provider),
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const tokenUrl = {
    google: 'https://oauth2.googleapis.com/token',
    line: 'https://api.line.me/oauth2/v2.1/token',
    facebook: `${FACEBOOK_GRAPH}/oauth/access_token`,
  }[provider]

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  return readJson(response, 'token')
}

async function fetchProfile(
  provider: OAuthProvider,
  config: ProviderConfig,
  tokens: Record<string, unknown>,
): Promise<OAuthProfile> {
  const accessToken = String(tokens.access_token ?? '')

  if (provider === 'google') {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const info = await readJson(response, 'profile')
    return {
      providerUserId: String(info.sub),
      name: typeof info.name === 'string' ? info.name : null,
      verifiedEmail:
        info.email_verified === true && typeof info.email === 'string' ? info.email : null,
    }
  }

  if (provider === 'line') {
    // id_token ของ LINE มีอีเมล (ถ้าผู้ใช้อนุญาต) ตรวจกับ LINE โดยตรงแทนการถอด JWT เอง
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: String(tokens.id_token ?? ''), client_id: config.clientId }),
    })
    const info = await readJson(response, 'profile')
    return {
      providerUserId: String(info.sub),
      name: typeof info.name === 'string' ? info.name : null,
      verifiedEmail: typeof info.email === 'string' ? info.email : null,
    }
  }

  const url = new URL(`${FACEBOOK_GRAPH}/me`)
  url.searchParams.set('fields', 'id,name,email')
  url.searchParams.set('access_token', accessToken)
  const info = await readJson(await fetch(url), 'profile')
  return {
    providerUserId: String(info.id),
    name: typeof info.name === 'string' ? info.name : null,
    verifiedEmail: typeof info.email === 'string' ? info.email : null,
  }
}

async function findOrCreateAccount(provider: OAuthProvider, profile: OAuthProfile) {
  const include = { tenant: true, staff: true } as const
  const email = profile.verifiedEmail?.trim().toLowerCase() ?? null

  const identity = await prisma.oAuthIdentity.findUnique({
    where: {
      provider_providerUserId: { provider, providerUserId: profile.providerUserId },
    },
    include: { account: { include } },
  })
  if (identity) {
    return identity.account
  }

  return prisma.$transaction(async (tx) => {
    const existing = email
      ? await tx.account.findUnique({ where: { email }, include })
      : null

    if (existing && existing.role !== 'TENANT') {
      throw new AppError(
        403,
        'อีเมลนี้เป็นบัญชีพนักงานหรือผู้ดูแล กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน',
      )
    }

    const account =
      existing ??
      (await tx.account.create({
        data: {
          email,
          role: 'TENANT',
          tenant: {
            create: {
              fullName: profile.name?.slice(0, 100) || `ผู้ใช้ ${PROVIDER_LABEL[provider]}`,
              email,
            },
          },
        },
        include,
      }))

    await tx.oAuthIdentity.create({
      data: { provider, providerUserId: profile.providerUserId, accountId: account.accountId },
    })

    return account
  })
}

export async function completeOAuth(
  provider: OAuthProvider,
  query: { code?: string | undefined; state?: string | undefined; error?: string | undefined },
) {
  if (query.error) {
    throw new AppError(400, 'ยกเลิกการเข้าสู่ระบบ')
  }
  verifyState(provider, query.state)
  if (!query.code) {
    throw new AppError(400, 'คำขอเข้าสู่ระบบไม่ถูกต้อง (ไม่มี code)')
  }

  const config = requireConfig(provider)
  const tokens = await exchangeCode(provider, config, query.code)
  const profile = await fetchProfile(provider, config, tokens)
  const account = await findOrCreateAccount(provider, profile)
  return sessionFor(account)
}

export function frontendCallbackUrl(params: Record<string, string>) {
  const url = new URL('/auth/callback', env.FRONTEND_URL)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}
