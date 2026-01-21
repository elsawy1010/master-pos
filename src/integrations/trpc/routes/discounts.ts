import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { discounts } from '@/db/schema'
import { db } from '@/db'
import { eq, desc } from 'drizzle-orm'

export const discountsRouter = createTRPCRouter({
    list: protectedProcedure.query(async () => {
        return db.select().from(discounts).orderBy(desc(discounts.createdAt))
    }),

    validate: protectedProcedure
        .input(z.object({ code: z.string() }))
        .query(async ({ input }) => {
            const [discount] = await db
                .select()
                .from(discounts)
                .where(eq(discounts.code, input.code))

            if (!discount) {
                throw new Error('Invalid discount code')
            }

            if (!discount.isActive) {
                throw new Error('Discount code is inactive')
            }

            const now = new Date()
            if (discount.startDate && new Date(discount.startDate) > now) {
                throw new Error('Discount code is not yet active')
            }

            if (discount.endDate && new Date(discount.endDate) < now) {
                throw new Error('Discount code has expired')
            }

            if (discount.maxUsage && discount.usageCount >= discount.maxUsage) {
                throw new Error('Discount usage limit reached')
            }

            return discount
        }),

    create: protectedProcedure
        .input(
            z.object({
                code: z.string().min(3).max(50),
                description: z.string().optional(),
                type: z.enum(['percentage', 'fixed']),
                value: z.number().min(0),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                isActive: z.boolean().default(true),
                maxUsage: z.number().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const [newDiscount] = await db
                .insert(discounts)
                .values({
                    ...input,
                    value: String(input.value),
                    startDate: input.startDate ? new Date(input.startDate) : null,
                    endDate: input.endDate ? new Date(input.endDate) : null,
                })
                .returning()
            return newDiscount
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                code: z.string().min(3).max(50).optional(),
                description: z.string().optional(),
                type: z.enum(['percentage', 'fixed']).optional(),
                value: z.number().min(0).optional(),
                startDate: z.string().optional().nullable(),
                endDate: z.string().optional().nullable(),
                isActive: z.boolean().optional(),
                maxUsage: z.number().optional().nullable(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, ...data } = input

            const updateData: any = { ...data }

            if (data.value !== undefined) {
                updateData.value = String(data.value)
            }

            if (data.startDate !== undefined) {
                updateData.startDate = data.startDate ? new Date(data.startDate) : null
            }

            if (data.endDate !== undefined) {
                updateData.endDate = data.endDate ? new Date(data.endDate) : null
            }

            const [updatedDiscount] = await db
                .update(discounts)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(discounts.id, id))
                .returning()
            return updatedDiscount
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await db.delete(discounts).where(eq(discounts.id, input.id))
            return { success: true }
        }),
})
