import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import { roomTypeCreateSchema, roomTypeUpdateSchema, type RoomTypeCreateInput } from '../schemas/room'
import {
  createRoomType,
  deleteRoomType,
  listRoomTypes,
  updateRoomType,
} from '../services/room.service'

const router = Router()

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listRoomTypes())
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: roomTypeCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<RoomTypeCreateInput>(req, 'body')
    res.status(201).json(await createRoomType(body))
  }),
)

router.patch(
  '/:roomTypeId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: roomTypeUpdateSchema }),
  asyncHandler(async (req, res) => {
    const roomTypeId = parseId(req.params.roomTypeId, 'roomTypeId')
    const body = validated<Partial<RoomTypeCreateInput>>(req, 'body')
    res.json(await updateRoomType(roomTypeId, body))
  }),
)

router.delete(
  '/:roomTypeId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const roomTypeId = parseId(req.params.roomTypeId, 'roomTypeId')
    await deleteRoomType(roomTypeId)
    res.status(204).send()
  }),
)

export default router
