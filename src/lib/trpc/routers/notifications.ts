import { createTRPCRouter, authedProcedure, adminProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const notificationsRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
      unreadOnly: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0, unreadOnly = false } = input || {}
      let query = ctx.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (unreadOnly) query = query.is('read_at', null)
      const { data, error } = await query
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch notifications' })
      }
      const { count: unreadCount } = await ctx.supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .is('read_at', null)
      return { items: data || [], unreadCount: unreadCount || 0 }
    }),

  markRead: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark as read' })
      }
      return { success: true }
    }),

  markAllRead: authedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', ctx.user.id)
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark all as read' })
    }
    return { success: true }
  }),

  create: adminProcedure
    .input(z.object({ userId: z.string(), type: z.enum(['info','success','warning','error','system']), title: z.string(), message: z.string(), link: z.string().optional(), meta: z.record(z.unknown()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabaseService
        .from('notifications')
        .insert({
          user_id: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link || null,
          meta: input.meta || {},
        })
        .select('id')
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create notification' })
      return { id: data?.id }
    }),
})


