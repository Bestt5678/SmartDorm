import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  meterCreateSchema,
  meterListQuerySchema,
  meterUpdateSchema,
  type MeterCreateInput,
  type MeterListQuery,
} from '../schemas/meter'
import {
  createMeter,
  deleteMeter,
  listMeters,
  updateMeter,
} from '../services/meter.service'

const router = Router()

router.get(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ query: meterListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<MeterListQuery>(req, 'query')
    res.json(await listMeters(query))
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: meterCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<MeterCreateInput>(req, 'body')
    res.status(201).json(await createMeter(body))
  }),
)

router.patch(
  '/:meterId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: meterUpdateSchema }),
  asyncHandler(async (req, res) => {
    const meterId = parseId(req.params.meterId, 'meterId')
    const body = validated<Partial<MeterCreateInput>>(req, 'body')
    res.json(await updateMeter(meterId, body))
  }),
)

router.delete(
  '/:meterId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const meterId = parseId(req.params.meterId, 'meterId')
    await deleteMeter(meterId)
    res.status(204).send()
  }),
)

export default router
