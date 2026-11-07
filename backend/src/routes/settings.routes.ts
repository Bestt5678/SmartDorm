import { Router } from 'express'
import { env } from '../config/env'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, requireRole('STAFF', 'ADMIN'), (_req, res) => {
  res.json({
    waterRate: env.WATER_RATE,
    electricRate: env.ELECTRIC_RATE,
  })
})

export default router
