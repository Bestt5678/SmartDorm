import { Router } from 'express'
import { BOOKING_STATUS } from '../constants'
import { AppError, asyncHandler, parseId } from '../lib/http'
import { currentAuth, requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  bookingConfirmSchema,
  bookingCreateSchema,
  bookingListQuerySchema,
  bookingStatusSchemaBody,
  type BookingConfirmInput,
  type BookingCreateInput,
  type BookingListQuery,
} from '../schemas/booking'
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  deleteBooking,
  getBooking,
  listBookings,
} from '../services/booking.service'

const router = Router()

router.post(
  '/',
  requireAuth,
  validate({ body: bookingCreateSchema }),
  asyncHandler(async (req, res) => {
    const auth = currentAuth(req)
    const body = validated<BookingCreateInput>(req, 'body')

    // ผู้เช่าจองให้ตัวเองเท่านั้น ส่วน STAFF/ADMIN จองแทนผู้เช่าที่ระบุได้
    const tenantId = auth.role === 'TENANT' ? auth.tenantId : body.tenantId
    if (!tenantId) {
      throw new AppError(
        auth.role === 'TENANT' ? 403 : 400,
        auth.role === 'TENANT' ? 'ไม่พบข้อมูลผู้เช่าสำหรับบัญชีนี้' : 'กรุณาเลือกผู้เช่า',
      )
    }
    res.status(201).json(await createBooking(tenantId, body))
  }),
)

router.get(
  '/',
  requireAuth,
  validate({ query: bookingListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<BookingListQuery>(req, 'query')
    res.json(await listBookings(query, currentAuth(req)))
  }),
)

router.get(
  '/:bookingId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'bookingId')
    const booking = await getBooking(bookingId)
    const auth = currentAuth(req)
    if (auth.role === 'TENANT' && booking.tenantId !== auth.tenantId) {
      throw new AppError(403, 'คุณไม่มีสิทธิ์ดูการจองนี้')
    }
    res.json(booking)
  }),
)

router.delete(
  '/:bookingId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'bookingId')
    await deleteBooking(bookingId)
    res.status(204).send()
  }),
)

router.post(
  '/:bookingId/confirm',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: bookingConfirmSchema }),
  asyncHandler(async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'bookingId')
    const body = validated<BookingConfirmInput>(req, 'body')
    res.json(await confirmBooking(bookingId, body))
  }),
)

router.post(
  '/:bookingId/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'bookingId')
    res.json(await cancelBooking(bookingId, currentAuth(req)))
  }),
)

router.post(
  '/:bookingId/complete',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'bookingId')
    res.json(await completeBooking(bookingId))
  }),
)

router.patch(
  '/:bookingId/status',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: bookingStatusSchemaBody }),
  asyncHandler(async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'bookingId')
    const body = validated<{ status: string }>(req, 'body')
    if (body.status === BOOKING_STATUS.CANCELLED) {
      res.json(await cancelBooking(bookingId, currentAuth(req)))
      return
    }
    if (body.status === BOOKING_STATUS.COMPLETED) {
      res.json(await completeBooking(bookingId))
      return
    }
    throw new AppError(400, 'ไม่สามารถเปลี่ยนสถานะนี้ได้จาก endpoint นี้')
  }),
)

export default router
