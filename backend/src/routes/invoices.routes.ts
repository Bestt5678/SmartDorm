import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import {
  cleanupSlipOnError,
  slipUpload,
  verifySlipSignature,
} from '../lib/upload'
import { currentAuth, requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  invoiceCreateSchema,
  invoiceListQuerySchema,
  invoiceUpdateSchema,
  type InvoiceCreateInput,
  type InvoiceListQuery,
  type InvoiceUpdateInput,
} from '../schemas/invoice'
import { paymentCreateSchema, type PaymentCreateInput } from '../schemas/payment'
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  deleteInvoice,
  listInvoices,
  updateInvoice,
} from '../services/invoice.service'
import { createPayment } from '../services/payment.service'

const router = Router()

router.get(
  '/',
  requireAuth,
  validate({ query: invoiceListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<InvoiceListQuery>(req, 'query')
    res.json(await listInvoices(query, currentAuth(req)))
  }),
)

router.get(
  '/:invoiceId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoiceId = parseId(req.params.invoiceId, 'invoiceId')
    res.json(await getInvoice(invoiceId, currentAuth(req)))
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: invoiceCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<InvoiceCreateInput>(req, 'body')
    res.status(201).json(await createInvoice(body))
  }),
)

router.patch(
  '/:invoiceId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: invoiceUpdateSchema }),
  asyncHandler(async (req, res) => {
    const invoiceId = parseId(req.params.invoiceId, 'invoiceId')
    const body = validated<InvoiceUpdateInput>(req, 'body')
    res.json(await updateInvoice(invoiceId, body))
  }),
)

router.delete(
  '/:invoiceId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const invoiceId = parseId(req.params.invoiceId, 'invoiceId')
    await deleteInvoice(invoiceId)
    res.status(204).send()
  }),
)

router.post(
  '/:invoiceId/cancel',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const invoiceId = parseId(req.params.invoiceId, 'invoiceId')
    res.json(await cancelInvoice(invoiceId))
  }),
)

router.post(
  '/:invoiceId/payments',
  requireAuth,
  slipUpload.single('slip'),
  cleanupSlipOnError,
  verifySlipSignature,
  validate({ body: paymentCreateSchema }),
  asyncHandler(async (req, res) => {
    const invoiceId = parseId(req.params.invoiceId, 'invoiceId')
    const body = validated<PaymentCreateInput>(req, 'body')
    res
      .status(201)
      .json(await createPayment(invoiceId, currentAuth(req), body, req.file?.filename))
  }),
)

export default router
