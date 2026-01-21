import { protectedProcedure, adminProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
    products, categories
} from '@/db/schema'

// =====================================================
// CATEGORIES ROUTER
// =====================================================
const categoriesRouter = {
  list: protectedProcedure.query(async () => {
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await db.select().from(categories).where(eq(categories.id, input.id))
      return result[0] || null
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(categories).values(input).returning()
      return result[0]
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(categories).set(data).where(eq(categories.id, id)).returning()
      return result[0]
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(categories).set({ isActive: false }).where(eq(categories.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

// =====================================================
// PRODUCTS ROUTER
// =====================================================
const productsRouter = {
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        categoryId: products.categoryId,
        categoryName: categories.name,
        emoji: products.emoji,
        imageUrl: products.imageUrl,
        isAvailable: products.isAvailable,
        preparationTime: products.preparationTime,
        stock: products.stock,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(categories.sortOrder, products.name)
  }),

  listAvailable: protectedProcedure.query(async () => {
    return db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        categoryId: products.categoryId,
        categoryName: categories.name,
        emoji: products.emoji,
        imageUrl: products.imageUrl,
        isAvailable: products.isAvailable,
        preparationTime: products.preparationTime,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isAvailable, true))
      .orderBy(categories.sortOrder, products.name)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, input.id))
      return result[0] || null
    }),

  getByCategory: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(products)
        .where(and(eq(products.categoryId, input.categoryId), eq(products.isAvailable, true)))
        .orderBy(products.name)
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.string(),
        categoryId: z.number(),
        emoji: z.string().optional(),
        imageUrl: z.string().optional(),
        preparationTime: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(products).values(input).returning()
      return result[0]
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        categoryId: z.number().optional(),
        emoji: z.string().optional(),
        imageUrl: z.string().optional(),
        isAvailable: z.boolean().optional(),
        preparationTime: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(products).set(data).where(eq(products.id, id)).returning()
      return result[0]
    }),

  toggleAvailability: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const product = await db.select().from(products).where(eq(products.id, input.id))
      if (product[0]) {
        const result = await db
          .update(products)
          .set({ isAvailable: !product[0].isAvailable })
          .where(eq(products.id, input.id))
          .returning()
        return result[0]
      }
      return null
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(products).set({ isAvailable: false }).where(eq(products.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

const productRouter = {
    categories: categoriesRouter,
    products: productsRouter,
}
export default productRouter
