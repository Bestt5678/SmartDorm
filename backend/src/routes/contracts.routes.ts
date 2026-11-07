import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { currentAuth, requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  contractCreateSchema,
  contractListQuerySchema,
  contractUpdateSchema,
  type ContractCreateInput,
  type ContractListQuery,
  type ContractUpdateInput,
} from '../schemas/contract'
import {
  createContract,
  deleteContract,
  getContract,
  listContracts,
  updateContract,
} from '../services/contract.service'

const router = Router()

router.get(
  '/',
  requireAuth,
  validate({ query: contractListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = validated<ContractListQuery>(req, 'query')
    res.json(await listContracts(currentAuth(req), query.limit))
  }),
)

router.get(
  '/:contractId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const contractId = parseId(req.params.contractId, 'contractId')
    res.json(await getContract(contractId, currentAuth(req)))
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: contractCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = validated<ContractCreateInput>(req, 'body')
    res.status(201).json(await createContract(body))
  }),
)

router.patch(
  '/:contractId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate({ body: contractUpdateSchema }),
  asyncHandler(async (req, res) => {
    const contractId = parseId(req.params.contractId, 'contractId')
    const body = validated<ContractUpdateInput>(req, 'body')
    res.json(await updateContract(contractId, body))
  }),
)

router.delete(
  '/:contractId',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const contractId = parseId(req.params.contractId, 'contractId')
    await deleteContract(contractId)
    res.status(204).send()
  }),
)

export default router
