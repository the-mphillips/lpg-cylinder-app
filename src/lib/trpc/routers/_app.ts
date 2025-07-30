import { createTRPCRouter } from '@/lib/trpc/server'
import { authRouter } from './auth'
import { reportsRouter } from './reports'
import { usersRouter } from './users'
import { dashboardRouter } from './dashboard'
import { settingsRouter } from './settings'
import { adminRouter } from './admin'
import { equipmentRouter } from './equipment'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  reports: reportsRouter,
  users: usersRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
    admin: adminRouter,
  equipment: equipmentRouter,
})

export type AppRouter = typeof appRouter 