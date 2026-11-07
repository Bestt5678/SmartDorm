import { Router } from 'express'
import authRoutes from './auth.routes'
import bookingRoutes from './bookings.routes'
import contractRoutes from './contracts.routes'
import dashboardRoutes from './dashboard.routes'
import directoryRoutes from './directory.routes'
import invoiceRoutes from './invoices.routes'
import meterRoutes from './meters.routes'
import paymentRoutes from './payments.routes'
import repairRoutes from './repairs.routes'
import roomTypeRoutes from './room-types.routes'
import roomRoutes from './rooms.routes'
import settingsRoutes from './settings.routes'

export const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/room-types', roomTypeRoutes)
apiRouter.use('/rooms', roomRoutes)
apiRouter.use('/bookings', bookingRoutes)
apiRouter.use('/contracts', contractRoutes)
apiRouter.use('/utility-meters', meterRoutes)
apiRouter.use('/invoices', invoiceRoutes)
apiRouter.use('/payments', paymentRoutes)
apiRouter.use('/repair-requests', repairRoutes)
apiRouter.use('/dashboard', dashboardRoutes)
apiRouter.use('/settings', settingsRoutes)
apiRouter.use('/', directoryRoutes)
