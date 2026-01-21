import { protectedProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { or, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
    tables, orders, orderItems, products
} from '@/db/schema'

// =====================================================
// TABLES ROUTER
// =====================================================
const tablesRouter = {
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        status: tables.status,
        location: tables.location,
        currentOrderId: tables.currentOrderId,
        reservedFor: tables.reservedFor,
        currentOrderNumber: orders.orderNumber,
      })
      .from(tables)
      .leftJoin(orders, eq(tables.currentOrderId, orders.id))
      .orderBy(tables.location, tables.tableNumber)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await db.select().from(tables).where(eq(tables.id, input.id))
      return result[0] || null
    }),

  getAvailable: protectedProcedure.query(async () => {
    return db.select().from(tables).where(eq(tables.status, 'available')).orderBy(tables.tableNumber)
  }),

  // Get all tables for POS (available and occupied with their current orders)
  getAllForPOS: protectedProcedure.query(async () => {
    return db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        status: tables.status,
        location: tables.location,
        currentOrderId: tables.currentOrderId,
      })
      .from(tables)
      .where(
        or(
          eq(tables.status, 'available'),
          eq(tables.status, 'occupied')
        )
      )
      .orderBy(tables.tableNumber)
  }),

  // Get active order for a specific table
  getActiveOrder: protectedProcedure
    .input(z.object({ tableId: z.number() }))
    .query(async ({ input }) => {
      const table = await db.select().from(tables).where(eq(tables.id, input.tableId))
      if (!table[0] || !table[0].currentOrderId) return null

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, table[0].currentOrderId))

      if (!order[0]) return null

      // Get order items
      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          productName: products.name,
          productEmoji: products.emoji,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          subtotal: orderItems.subtotal,
          notes: orderItems.notes,
          status: orderItems.status,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order[0].id))
        .orderBy(orderItems.createdAt)

      return { ...order[0], items }
    }),

  getByLocation: protectedProcedure
    .input(z.object({ location: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(tables).where(eq(tables.location, input.location)).orderBy(tables.tableNumber)
    }),

  create: protectedProcedure
    .input(
      z.object({
        tableNumber: z.string(),
        capacity: z.number(),
        location: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(tables).values(input).returning()
      return result[0]
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        tableNumber: z.string().optional(),
        capacity: z.number().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(tables).set(data).where(eq(tables.id, id)).returning()
      return result[0]
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
        reservedFor: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, status, reservedFor } = input
      const updateData: Record<string, unknown> = { status }
      if (status === 'reserved') {
        updateData.reservedFor = reservedFor
      } else if (status === 'available' || status === 'cleaning') {
        updateData.currentOrderId = null
        updateData.reservedFor = null
      }
      const result = await db.update(tables).set(updateData).where(eq(tables.id, id)).returning()
      return result[0]
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(tables).where(eq(tables.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

export default tablesRouter