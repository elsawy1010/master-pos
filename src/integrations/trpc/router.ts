import { createTRPCRouter } from './init'
import usersRouter from './routes/user'
import productRouter from './routes/product'
import tablesRouter from './routes/table'
import ordersRouter from './routes/order'
import paymentsRouter from './routes/payment'
import reportsRouter from './routes/report'
import settingsRouter from './routes/setting'
import { discountsRouter } from './routes/discounts'

// =====================================================
// MAIN ROUTER
// =====================================================
export const trpcRouter = createTRPCRouter({
  users: usersRouter,
  categories: productRouter.categories,
  products: productRouter.products,
  tables: tablesRouter,
  orders: ordersRouter,
  payments: paymentsRouter,
  settings: settingsRouter,
  reports: reportsRouter,
  discounts: discountsRouter,
})

export type TRPCRouter = typeof trpcRouter
