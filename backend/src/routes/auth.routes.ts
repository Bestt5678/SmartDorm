import { Router } from 'express'
import { AppError, asyncHandler } from '../lib/http'
import { currentAuth, requireAuth } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  type LoginInput,
  type ProfileUpdateInput,
  type RegisterInput,
} from '../schemas/auth'
import { login, me, register, updateProfile } from '../services/auth.service'
import {
  buildAuthorizeUrl,
  completeOAuth,
  enabledProviders,
  frontendCallbackUrl,
  isOAuthProvider,
} from '../services/oauth.service'

const router = Router()

router.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<RegisterInput>(req, 'body')
    res.status(201).json(await register(body))
  }),
)

router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<LoginInput>(req, 'body')
    res.json(await login(body))
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await me(currentAuth(req).accountId))
  }),
)

router.patch(
  '/me',
  requireAuth,
  validate({ body: profileUpdateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<ProfileUpdateInput>(req, 'body')
    res.json(await updateProfile(currentAuth(req).accountId, body))
  }),
)

// รายชื่อ provider ที่ตั้งค่าไว้ (frontend ใช้ตัดสินใจว่าจะแสดงปุ่มไหน)
router.get('/providers', (_req, res) => {
  res.json(enabledProviders())
})

router.get('/:provider', (req, res, next) => {
  const { provider } = req.params
  if (!isOAuthProvider(provider)) {
    next()
    return
  }
  try {
    res.redirect(buildAuthorizeUrl(provider))
  } catch (error) {
    const message = error instanceof AppError ? error.message : 'เข้าสู่ระบบไม่สำเร็จ'
    res.redirect(frontendCallbackUrl({ error: message }))
  }
})

router.get('/:provider/callback', (req, res, next) => {
  const { provider } = req.params
  if (!isOAuthProvider(provider)) {
    next()
    return
  }
  const query = req.query as Record<string, string | undefined>
  completeOAuth(provider, { code: query.code, state: query.state, error: query.error })
    .then(({ token }) => res.redirect(frontendCallbackUrl({ token })))
    .catch((error: unknown) => {
      if (!(error instanceof AppError)) {
        console.error('[oauth]', error)
      }
      const message = error instanceof AppError ? error.message : 'เข้าสู่ระบบไม่สำเร็จ'
      res.redirect(frontendCallbackUrl({ error: message }))
    })
})

export default router
