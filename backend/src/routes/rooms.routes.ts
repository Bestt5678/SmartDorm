import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  roomCreateSchema,
  roomListQuerySchema,
  roomUpdateSchema,
  type RoomCreateInput,
  type RoomListQuery,
  type RoomUpdateInput,
} from '../schemas/room'
import {
  createRoom,
  deleteRoom,
  getRoom,
  listRooms,
  updateRoom,
} from '../services/room.service'

const router = Router()

router.get(
  '/',
  validate({ query: roomListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<RoomListQuery>(req, 'query')
    res.json(await listRooms(query))
  }),
)

router.get(
  '/:roomId',
  asyncHandler(async (req, res) => {
    const roomId = parseId(req.params.roomId, 'roomId')
    res.json(await getRoom(roomId))
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: roomCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<RoomCreateInput>(req, 'body')
    res.status(201).json(await createRoom(body))
  }),
)

router.patch(
  '/:roomId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: roomUpdateSchema }),
  asyncHandler(async (req, res) => {
    const roomId = parseId(req.params.roomId, 'roomId')
    const body = validated<RoomUpdateInput>(req, 'body')
    res.json(await updateRoom(roomId, body))
  }),
)

router.delete(
  '/:roomId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const roomId = parseId(req.params.roomId, 'roomId')
    await deleteRoom(roomId)
    res.status(204).send()
  }),
)

export default router
