import { Router } from 'express'
import { asyncHandler, parseId } from '../lib/http'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate, validated } from '../middleware/validate'
import {
  staffCreateSchema,
  staffUpdateSchema,
  tenantCreateSchema,
  tenantUpdateSchema,
  type StaffCreateInput,
  type StaffUpdateInput,
  type TenantCreateInput,
  type TenantUpdateInput,
} from '../schemas/people'
import {
  createStaff,
  createTenant,
  deleteStaff,
  deleteTenant,
  getTenant,
  listStaff,
  listTenants,
  updateStaff,
  updateTenant,
} from '../services/staff.service'

const router = Router()
const staffOrAdmin = [requireAuth, requireRole('STAFF', 'ADMIN')]
const adminOnly = [requireAuth, requireRole('ADMIN')]

// ---------- /staff ----------

router.get(
  '/staff',
  ...staffOrAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await listStaff())
  }),
)

router.post(
  '/staff',
  ...adminOnly,
  validate({ body: staffCreateSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createStaff(validated<StaffCreateInput>(req, 'body')))
  }),
)

router.patch(
  '/staff/:staffId',
  ...adminOnly,
  validate({ body: staffUpdateSchema }),
  asyncHandler(async (req, res) => {
    const staffId = parseId(req.params.staffId, 'staffId')
    res.json(await updateStaff(staffId, validated<StaffUpdateInput>(req, 'body')))
  }),
)

router.delete(
  '/staff/:staffId',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    await deleteStaff(parseId(req.params.staffId, 'staffId'))
    res.status(204).send()
  }),
)

// ---------- /tenants ----------

router.get(
  '/tenants',
  ...staffOrAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await listTenants())
  }),
)

router.get(
  '/tenants/:tenantId',
  ...staffOrAdmin,
  asyncHandler(async (req, res) => {
    res.json(await getTenant(parseId(req.params.tenantId, 'tenantId')))
  }),
)

router.post(
  '/tenants',
  ...staffOrAdmin,
  validate({ body: tenantCreateSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createTenant(validated<TenantCreateInput>(req, 'body')))
  }),
)

router.patch(
  '/tenants/:tenantId',
  ...staffOrAdmin,
  validate({ body: tenantUpdateSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = parseId(req.params.tenantId, 'tenantId')
    res.json(await updateTenant(tenantId, validated<TenantUpdateInput>(req, 'body')))
  }),
)

router.delete(
  '/tenants/:tenantId',
  ...staffOrAdmin,
  asyncHandler(async (req, res) => {
    await deleteTenant(parseId(req.params.tenantId, 'tenantId'))
    res.status(204).send()
  }),
)

export default router
