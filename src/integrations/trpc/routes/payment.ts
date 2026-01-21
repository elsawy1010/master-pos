import { protectedProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  tables, orders, payments, users, discounts
} from '@/db/schema'

// =====================================================
// PAYMENTS ROUTER
// =====================================================
const paymentsRouter = {
  list: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const conditions = []

      if (input?.startDate) {
        conditions.push(gte(payments.createdAt, new Date(input.startDate)))
      }
      if (input?.endDate) {
        const end = new Date(input.endDate)
        end.setHours(23, 59, 59, 999)
        conditions.push(lte(payments.createdAt, end))
      }

      return db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          orderId: payments.orderId,
          orderNumber: orders.orderNumber,
          amount: payments.amount,
          method: payments.method,
          status: payments.status,
          transactionId: payments.transactionId,
          processedBy: payments.processedBy,
          processedByName: users.fullName,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .leftJoin(orders, eq(payments.orderId, orders.id))
        .leftJoin(users, eq(payments.processedBy, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(payments.createdAt))
    }),

  getByOrderId: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(payments)
        .where(eq(payments.orderId, input.orderId))
        .orderBy(desc(payments.createdAt))
    }),

  create: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        amount: z.string(),
        method: z.enum(['cash', 'card', 'digital_wallet']),
        processedBy: z.string(),
        transactionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Generate payment number
      const lastPayment = await db
        .select({ paymentNumber: payments.paymentNumber })
        .from(payments)
        .orderBy(desc(payments.id))
        .limit(1)

      let nextNum = 1
      if (lastPayment[0]) {
        const match = lastPayment[0].paymentNumber.match(/PAY-(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      const paymentNumber = `PAY-${String(nextNum).padStart(3, '0')}`

      const result = await db
        .insert(payments)
        .values({ ...input, paymentNumber, status: 'paid' })
        .returning()

      // Get the order to find its tableId
      const order = await db.select().from(orders).where(eq(orders.id, input.orderId))

      // Update order status to completed
      await db
        .update(orders)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(orders.id, input.orderId))

      // Update table status if order has a table
      if (order[0]?.tableId) {
        await db
          .update(tables)
          .set({ status: 'available', currentOrderId: null })
          .where(eq(tables.id, order[0].tableId))
      }

      // Increment discount usage count if used
      if (order[0]?.discountId) {
        await db
          .update(discounts)
          .set({ usageCount: sql`${discounts.usageCount} + 1` })
          .where(eq(discounts.id, order[0].discountId))
      }

      return result[0]
    }),

  refund: protectedProcedure
    .input(z.object({ id: z.number(), processedBy: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db
        .update(payments)
        .set({ status: 'refunded', processedBy: input.processedBy })
        .where(eq(payments.id, input.id))
        .returning()
      return result[0]
    }),
} satisfies TRPCRouterRecord

export default paymentsRouter
