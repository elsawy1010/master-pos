import { protectedProcedure } from '../init'
import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  settings
} from '@/db/schema'

// =====================================================
// SETTINGS ROUTER
// =====================================================
const settingsRouter = {
  list: protectedProcedure.query(async () => {
    return db.select().from(settings).orderBy(settings.key)
  }),

  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const result = await db.select().from(settings).where(eq(settings.key, input.key))
      return result[0] || null
    }),

  getMultiple: protectedProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ input }) => {
      const result = await db.select().from(settings)
      return result.filter(s => input.keys.includes(s.key))
    }),

  update: protectedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.select().from(settings).where(eq(settings.key, input.key))
      if (existing[0]) {
        const result = await db
          .update(settings)
          .set({ value: input.value })
          .where(eq(settings.key, input.key))
          .returning()
        return result[0]
      } else {
        const result = await db.insert(settings).values(input).returning()
        return result[0]
      }
    }),

  updateMultiple: protectedProcedure
    .input(z.object({ settings: z.array(z.object({ key: z.string(), value: z.string() })) }))
    .mutation(async ({ input }) => {
      // Use efficient upsert for each setting
      for (const setting of input.settings) {
        await db
          .insert(settings)
          .values({
            key: setting.key,
            value: setting.value,
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: {
              value: setting.value,
              updatedAt: new Date(),
            },
          })
      }
      return { success: true }
    }),
} satisfies TRPCRouterRecord

export default settingsRouter
