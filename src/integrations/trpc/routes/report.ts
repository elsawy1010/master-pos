import { protectedProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { eq, and, gte, lte, ne, sql} from 'drizzle-orm'
import { db } from '@/db'
import {
    tables, orders, payments, orderItems, products, categories
} from '@/db/schema'

// =====================================================
// REPORTS ROUTER
// =====================================================
const reportsRouter = {
  getDashboardStats: protectedProcedure.query(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Today's completed orders
    const todaysOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.status, 'completed'), gte(orders.createdAt, today)))

    const todaysRevenue = todaysOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
    const todaysOrderCount = todaysOrders.length
    const avgOrderValue = todaysOrderCount > 0 ? todaysRevenue / todaysOrderCount : 0

    // Active orders
    const activeOrders = await db
      .select()
      .from(orders)
      .where(and(ne(orders.status, 'completed'), ne(orders.status, 'cancelled')))

    // Table stats
    const allTables = await db.select().from(tables)
    const occupiedTables = allTables.filter(t => t.status === 'occupied').length
    const availableTables = allTables.filter(t => t.status === 'available').length

    return {
      todaysRevenue,
      todaysOrderCount,
      avgOrderValue,
      activeOrderCount: activeOrders.length,
      occupiedTables,
      availableTables,
      totalTables: allTables.length,
    }
  }),

  getSalesByDateRange: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const start = new Date(input.startDate)
      const end = new Date(input.endDate)
      end.setHours(23, 59, 59, 999)

      return db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          orderType: orders.orderType,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, 'completed'),
            gte(orders.createdAt, start),
            lte(orders.createdAt, end)
          )
        )
        .orderBy(orders.createdAt)
    }),

  getTopProducts: protectedProcedure
    .input(z.object({ 
      limit: z.number().default(10),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(orders.status, 'completed')]
      
      if (input.startDate) {
        conditions.push(gte(orders.createdAt, new Date(input.startDate)))
      }
      if (input.endDate) {
        const end = new Date(input.endDate)
        end.setHours(23, 59, 59, 999)
        conditions.push(lte(orders.createdAt, end))
      }

      const result = await db
        .select({
          productId: orderItems.productId,
          productName: products.name,
          categoryName: categories.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})::int`,
          totalRevenue: sql<number>`SUM(${orderItems.subtotal})::decimal`,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(...conditions))
        .groupBy(orderItems.productId, products.name, categories.name)
        .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
        .limit(input.limit)

      return result
    }),

  getSalesByCategory: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const conditions = [eq(orders.status, 'completed')]
      
      if (input?.startDate) {
        conditions.push(gte(orders.createdAt, new Date(input.startDate)))
      }
      if (input?.endDate) {
        const end = new Date(input.endDate)
        end.setHours(23, 59, 59, 999)
        conditions.push(lte(orders.createdAt, end))
      }

      const result = await db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})::int`,
          totalRevenue: sql<number>`SUM(${orderItems.subtotal})::decimal`,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(...conditions))
        .groupBy(categories.id, categories.name)
        .orderBy(sql`SUM(${orderItems.subtotal}) DESC`)

      return result
    }),

  getPaymentSummary: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions = [eq(payments.status, 'paid')]
      
      if (input.startDate) {
        conditions.push(gte(payments.createdAt, new Date(input.startDate)))
      }
      if (input.endDate) {
        const end = new Date(input.endDate)
        end.setHours(23, 59, 59, 999)
        conditions.push(lte(payments.createdAt, end))
      }

      return db
        .select({
          method: payments.method,
          totalCount: sql<number>`COUNT(*)::int`,
          totalAmount: sql<number>`SUM(${payments.amount})::decimal`,
        })
        .from(payments)
        .where(and(...conditions))
        .groupBy(payments.method)
    }),

  // Get stats for a specific date range with comparison to previous period
  getStatsWithComparison: protectedProcedure
    .input(z.object({ 
      startDate: z.string(), 
      endDate: z.string() 
    }))
    .query(async ({ input }) => {
      const start = new Date(input.startDate)
      const end = new Date(input.endDate)
      end.setHours(23, 59, 59, 999)
      
      // Calculate previous period (same duration, immediately before)
      const duration = end.getTime() - start.getTime()
      const prevEnd = new Date(start.getTime() - 1) // 1ms before current start
      const prevStart = new Date(prevEnd.getTime() - duration)

      // Current period stats
      const currentOrders = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.status, 'completed'),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        ))

      const currentRevenue = currentOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
      const currentOrderCount = currentOrders.length
      const currentAvgOrder = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0

      // Previous period stats
      const prevOrders = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.status, 'completed'),
          gte(orders.createdAt, prevStart),
          lte(orders.createdAt, prevEnd)
        ))

      const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
      const prevOrderCount = prevOrders.length
      const prevAvgOrder = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

      // Calculate percentage changes
      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }

      return {
        revenue: currentRevenue,
        revenueChange: calcChange(currentRevenue, prevRevenue),
        orders: currentOrderCount,
        ordersChange: calcChange(currentOrderCount, prevOrderCount),
        avgOrder: currentAvgOrder,
        avgOrderChange: calcChange(currentAvgOrder, prevAvgOrder),
        // Estimate customers as ~80% of orders (unique transactions)
        customers: Math.round(currentOrderCount * 0.8),
        customersChange: calcChange(currentOrderCount * 0.8, prevOrderCount * 0.8),
      }
    }),

  // Get hourly sales breakdown for a specific date
  getHourlySales: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const targetDate = new Date(input.date)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const result = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})::int`,
          totalSales: sql<number>`SUM(${orders.total}::decimal)`,
          orderCount: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .where(and(
          eq(orders.status, 'completed'),
          gte(orders.createdAt, startOfDay),
          lte(orders.createdAt, endOfDay)
        ))
        .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)

      // Fill in missing hours with zero values (operating hours 9AM - 11PM)
      const hourlyData = []
      for (let h = 9; h <= 23; h++) {
        const found = result.find(r => r.hour === h)
        hourlyData.push({
          hour: h,
          label: h <= 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`,
          sales: found ? parseFloat(found.totalSales as unknown as string) || 0 : 0,
          orders: found?.orderCount || 0,
        })
      }

      return hourlyData
    }),

  // Get daily sales for a date range (for week/month/year views)
  getDailySales: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const start = new Date(input.startDate)
      const end = new Date(input.endDate)
      end.setHours(23, 59, 59, 999)

      const result = await db
        .select({
          date: sql<string>`DATE(${orders.createdAt})::text`,
          totalSales: sql<number>`SUM(${orders.total}::decimal)`,
          orderCount: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .where(and(
          eq(orders.status, 'completed'),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        ))
        .groupBy(sql`DATE(${orders.createdAt})`)
        .orderBy(sql`DATE(${orders.createdAt})`)

      return result.map(r => ({
        date: r.date,
        sales: parseFloat(r.totalSales as unknown as string) || 0,
        orders: r.orderCount || 0,
      }))
    }),
} satisfies TRPCRouterRecord

export default reportsRouter
