import { protectedProcedure, adminProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  users
} from '@/db/schema'
// =====================================================
// USERS ROUTER (Admin only)
// =====================================================
const usersRouter = {
  list: protectedProcedure.query(async () => {
    return db.select().from(users).orderBy(users.username)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db.select().from(users).where(eq(users.id, input.id))
      return result[0] || null
    }),

  getByUsername: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
      return result[0] || null
    }),

  // Note: Authentication is now handled by better-auth at /api/auth/*
  // This legacy endpoint is kept for backward compatibility
  authenticate: protectedProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async () => {
      // This is deprecated - use better-auth signIn.username() instead
      return { success: false, error: 'Use /api/auth/sign-in/username endpoint' }
    }),

  // Note: User creation is now handled by better-auth admin API
  // Use authClient.admin.createUser() instead
  // This endpoint is deprecated
  create: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        username: z.string(),
        email: z.string(),
        fullName: z.string(),
        role: z.enum(['admin', 'manager', 'server', 'counter', 'kitchen']),
        phone: z.string().optional(),
      })
    )
    .mutation(async () => {
      // Deprecated - use better-auth admin.createUser() instead
      return { error: 'Use better-auth admin.createUser() API' }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        fullName: z.string().optional(),
        role: z.enum(['admin', 'manager', 'server', 'counter', 'kitchen']).optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(users).set(data).where(eq(users.id, id)).returning()
      return result[0]
    }),

  // Note: User deletion is now handled by better-auth admin API
  // Use authClient.admin.removeUser() instead
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      // Deprecated - use better-auth admin.removeUser() instead
      return { error: 'Use better-auth admin.removeUser() API' }
    }),
} satisfies TRPCRouterRecord

export default usersRouter