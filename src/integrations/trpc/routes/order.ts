import { createTRPCRouter, protectedProcedure } from '../init'
import { z } from 'zod'
import { eq, desc, sql, and, ne } from 'drizzle-orm'
import { db } from '@/db'
import {
  tables, orders, orderItems, products, users, settings, discounts
} from '@/db/schema'

// =====================================================
// ORDERS ROUTER
// =====================================================
const ordersRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        tableId: orders.tableId,
        tableNumber: tables.tableNumber,
        serverId: orders.serverId,
        serverName: users.fullName,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        serviceChargeAmount: orders.serviceChargeAmount,
        discountAmount: orders.discountAmount,
        total: orders.total,
        isPaid: sql<boolean>`CASE WHEN EXISTS (SELECT 1 FROM payments WHERE payments.order_id = ${orders.id} AND payments.status = 'paid') THEN TRUE ELSE FALSE END`,
        notes: orders.notes,
        createdAt: orders.createdAt,
        completedAt: orders.completedAt,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .leftJoin(users, eq(orders.serverId, users.id))
      .orderBy(desc(orders.createdAt))
  }),

  listActive: protectedProcedure.query(async () => {
    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        tableId: orders.tableId,
        tableNumber: tables.tableNumber,
        serverId: orders.serverId,
        serverName: users.fullName,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        serviceChargeAmount: orders.serviceChargeAmount,
        total: orders.total,
        notes: orders.notes,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .leftJoin(users, eq(orders.serverId, users.id))
      .where(and(ne(orders.status, 'completed'), ne(orders.status, 'cancelled')))
      .orderBy(orders.createdAt)
  }),

  listForKitchen: protectedProcedure.query(async () => {
    // Get orders that are not completed/cancelled and have pending/preparing items
    // This ensures orders with new items show up even if some items are already served
    const kitchenOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        tableNumber: tables.tableNumber,
        createdAt: orders.createdAt,
        serverName: users.fullName,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .leftJoin(users, eq(orders.serverId, users.id))
      // .where(
      //   and(
      //     ne(orders.status, 'completed'),
      //     ne(orders.status, 'cancelled')
      //   )
      // )
      .orderBy(orders.createdAt)

    // Get items for each order with the server who added them
    const ordersWithItems = await Promise.all(
      kitchenOrders.map(async (order) => {
        const items = await db
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            name: products.name,
            quantity: orderItems.quantity,
            status: orderItems.status,
            notes: orderItems.notes,
            createdAt: orderItems.createdAt,
            serverName: users.fullName,
            category: products.categoryId,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .leftJoin(users, eq(orderItems.serverId, users.id))
          .where(eq(orderItems.orderId, order.id))
          .orderBy(orderItems.createdAt)
        return { ...order, items }
      })
    )

    // Filter to only show orders that have at least one pending, preparing, or ready item
    // This ensures kitchen sees orders with new items even if some items were already served
    return ordersWithItems.filter((order) =>
      order.items.some((item) =>
        item.status === 'pending' || item.status === 'preparing' || item.status === 'ready'
      )
    )
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          orderType: orders.orderType,
          status: orders.status,
          tableId: orders.tableId,
          tableNumber: tables.tableNumber,
          serverId: orders.serverId,
          serverName: users.fullName,
          subtotal: orders.subtotal,
          taxAmount: orders.taxAmount,
          serviceChargeAmount: orders.serviceChargeAmount,
          discountAmount: orders.discountAmount,
          discountId: orders.discountId,
          total: orders.total,
          notes: orders.notes,
          createdAt: orders.createdAt,
          completedAt: orders.completedAt,
        })
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .leftJoin(users, eq(orders.serverId, users.id))
        .where(eq(orders.id, input.id))

      if (!order[0]) return null

      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          name: products.name,
          serverName: users.fullName,
          emoji: products.emoji,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          subtotal: orderItems.subtotal,
          status: orderItems.status,
          notes: orderItems.notes,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(users, eq(orderItems.serverId, users.id))
        .where(eq(orderItems.orderId, input.id))

      return { ...order[0], items }
    }),

  create: protectedProcedure
    .input(
      z.object({
        orderType: z.enum(['dine_in', 'takeaway', 'delivery']),
        tableId: z.number().optional(),
        serverId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Generate order number
      const lastOrder = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .orderBy(desc(orders.id))
        .limit(1)

      let nextNum = 1
      if (lastOrder[0]) {
        const match = lastOrder[0].orderNumber.match(/ORD-(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      const orderNumber = `ORD-${String(nextNum).padStart(3, '0')}`

      const result = await db
        .insert(orders)
        .values({ ...input, orderNumber })
        .returning()

      // Update table status if dine-in
      if (input.tableId) {
        await db
          .update(tables)
          .set({ status: 'occupied', currentOrderId: result[0].id })
          .where(eq(tables.id, input.tableId))
      }

      return result[0]
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        productId: z.number(),
        quantity: z.number().default(1),
        notes: z.string().optional(),
        serverId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get product price
      const product = await db.select().from(products).where(eq(products.id, input.productId))
      if (!product[0]) throw new Error('Product not found')

      const unitPrice = product[0].price
      const subtotal = String(parseFloat(unitPrice) * input.quantity)

      const result = await db
        .insert(orderItems)
        .values({
          orderId: input.orderId,
          productId: input.productId,
          quantity: input.quantity,
          unitPrice,
          subtotal,
          notes: input.notes,
          serverId: input.serverId,
        })
        .returning()

      // Update order totals
      await updateOrderTotals(input.orderId)

      return result[0]
    }),

  updateItemStatus: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        status: z.enum(['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled']),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(orderItems)
        .set({ status: input.status })
        .where(eq(orderItems.id, input.itemId))
        .returning()

      return result[0]
    }),

  removeItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      // Get the orderId before deleting
      const item = await db.select().from(orderItems).where(eq(orderItems.id, input.itemId))
      if (!item[0]) throw new Error('Order item not found')
      const orderId = item[0].orderId

      await db.delete(orderItems).where(eq(orderItems.id, input.itemId))

      // Update order totals
      await updateOrderTotals(orderId)

      return { success: true }
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled']),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = { status: input.status }
      if (input.status === 'completed') {
        updateData.completedAt = new Date()
      }

      const result = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, input.id))
        .returning()

      // Update table status if completed or cancelled
      if (input.status === 'completed' || input.status === 'cancelled') {
        await db
          .update(tables)
          .set({ status: 'available', currentOrderId: null })
          .where(eq(tables.currentOrderId, input.id))
      }

      return result[0]
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // First update table status
      await db
        .update(tables)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(tables.currentOrderId, input.id))

      // Delete order (cascade will delete items)
      await db.delete(orders).where(eq(orders.id, input.id))
      return { success: true }
    }),

  applyDiscount: protectedProcedure
    .input(z.object({ orderId: z.number(), discountId: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(orders)
        .set({ discountId: input.discountId })
        .where(eq(orders.id, input.orderId))

      await updateOrderTotals(input.orderId)
      return { success: true }
    }),

  removeDiscount: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(orders)
        .set({ discountId: null, discountAmount: '0' })
        .where(eq(orders.id, input.orderId))

      await updateOrderTotals(input.orderId)
      return { success: true }
    }),
})

// Helper function to update order totals
async function updateOrderTotals(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))

  const subtotal = items
    .filter(item => item.status !== 'cancelled')
    .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)

  // Get tax rate from settings (default 10%)
  const taxSetting = await db.select().from(settings).where(eq(settings.key, 'tax_rate'))
  const taxRate = taxSetting[0] ? parseFloat(taxSetting[0].value || '10') : 10

  // Get service charge from settings (default 0%)
  const serviceSetting = await db.select().from(settings).where(eq(settings.key, 'service_charge'))
  const serviceCharge = serviceSetting[0] ? parseFloat(serviceSetting[0].value || '0') : 0

  // Get applied discount if any
  const order = await db.select({ discountId: orders.discountId }).from(orders).where(eq(orders.id, orderId)).limit(1)
  let discountAmount = 0

  if (order[0]?.discountId) {
    const discount = await db.select().from(discounts).where(eq(discounts.id, order[0].discountId)).limit(1)
    if (discount[0]) {
      const value = parseFloat(discount[0].value)
      if (discount[0].type === 'percentage') {
        discountAmount = subtotal * value / 100
      } else {
        discountAmount = value
      }
    }
  }

  const taxAmount = (subtotal - discountAmount) * taxRate / 100
  const serviceChargeAmount = (subtotal - discountAmount) * serviceCharge / 100
  const total = subtotal - discountAmount + taxAmount + serviceChargeAmount

  await db
    .update(orders)
    .set({
      subtotal: String(subtotal.toFixed(2)),
      taxAmount: String(taxAmount.toFixed(2)),
      serviceChargeAmount: String(serviceChargeAmount.toFixed(2)),
      discountAmount: String(discountAmount.toFixed(2)),
      total: String(total.toFixed(2)),
    })
    .where(eq(orders.id, orderId))
}

export default ordersRouter
