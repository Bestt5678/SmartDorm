import { Router } from 'express'
import { asyncHandler } from '../lib/http'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDashboardSummary } from '../services/dashboard.service'

const router = Router()

router.get(
  '/summary',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardSummary())
  }),
)

export default router
