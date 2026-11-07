import path from 'node:path'
import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { uploadDir } from '../lib/upload'
import { currentAuth, requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  paymentListQuerySchema,
  paymentRecordSchema,
  paymentRejectSchema,
  type PaymentListQuery,
  type PaymentRecordInput,
  type PaymentRejectInput,
} from '../schemas/payment'
import {
  approvePayment,
  createPayment,
  deletePayment,
  getPaymentForSlip,
  listPayments,
  rejectPayment,
} from '../services/payment.service'

const router = Router()

router.get(
  '/',
  requireAuth,
  validate({ query: paymentListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<PaymentListQuery>(req, 'query')
    res.json(await listPayments(query, currentAuth(req)))
  }),
)

// STAFF/ADMIN บันทึกการรับเงิน (เช่น รับเงินสด) ระบบอนุมัติให้ทันที
// ผู้เช่าชำระผ่าน POST /invoices/:invoiceId/payments พร้อมแนบสลิปแทน
router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: paymentRecordSchema }),
  asyncHandler(async (req, res) => {
    const { invoiceId, ...body } = validated<PaymentRecordInput>(req, 'body')
    res.status(201).json(await createPayment(invoiceId, currentAuth(req), body))
  }),
)

router.delete(
  '/:paymentId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const paymentId = parseId(req.params.paymentId, 'paymentId')
    await deletePayment(paymentId)
    res.status(204).send()
  }),
)

router.post(
  '/:paymentId/approve',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const paymentId = parseId(req.params.paymentId, 'paymentId')
    res.json(await approvePayment(paymentId, currentAuth(req)))
  }),
)

router.post(
  '/:paymentId/reject',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: paymentRejectSchema }),
  asyncHandler(async (req, res) => {
    const paymentId = parseId(req.params.paymentId, 'paymentId')
    const body = validated<PaymentRejectInput>(req, 'body')
    res.json(await rejectPayment(paymentId, currentAuth(req), body))
  }),
)

router.get(
  '/:paymentId/slip',
  requireAuth,
  asyncHandler(async (req, res) => {
    const paymentId = parseId(req.params.paymentId, 'paymentId')
    const payment = await getPaymentForSlip(paymentId, currentAuth(req))
    res.sendFile(path.join(uploadDir, path.basename(payment.slipUrl!)), (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: 'ไม่พบไฟล์สลิป' })
      }
    })
  }),
)

export default router
