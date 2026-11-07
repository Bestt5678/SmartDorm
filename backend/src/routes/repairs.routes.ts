import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { currentAuth, requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  repairCreateSchema,
  repairListQuerySchema,
  repairUpdateSchema,
  type RepairCreateInput,
  type RepairListQuery,
  type RepairUpdateInput,
} from '../schemas/repair'
import {
  createRepair,
  deleteRepair,
  listRepairs,
  updateRepair,
} from '../services/repair.service'

const router = Router()

router.post(
  '/',
  requireAuth,
  validate({ body: repairCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<RepairCreateInput>(req, 'body')
    res.status(201).json(await createRepair(currentAuth(req), body))
  }),
)

router.get(
  '/',
  requireAuth,
  validate({ query: repairListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<RepairListQuery>(req, 'query')
    res.json(await listRepairs(query, currentAuth(req)))
  }),
)

router.patch(
  '/:repairId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: repairUpdateSchema }),
  asyncHandler(async (req, res) => {
    const repairId = parseId(req.params.repairId, 'repairId')
    const body = validated<RepairUpdateInput>(req, 'body')
    res.json(await updateRepair(repairId, currentAuth(req), body))
  }),
)

router.delete(
  '/:repairId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const repairId = parseId(req.params.repairId, 'repairId')
    await deleteRepair(repairId)
    res.status(204).send()
  }),
)

export default router
