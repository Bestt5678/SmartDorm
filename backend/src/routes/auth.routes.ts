import { Router } from 'express'
import { asyncHandler } from '../lib/http'
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

export default router
